// LE APERTURE NELLA PARETE fra centro ed est (§6.14, 24/09): raggi al petto ogni 50 cm.
//
// `dove_stanno_le_tappe.mjs` misura DOVE finiscono le sette tappe. Questo
// misura PERCHE' finiscono li': apre uno per uno i quattro setacci che stanno
// fra i posti misurati nel modello e le tappe posate, e conta quanti posti
// muoiono a ogni setaccio e DOVE stavano quando sono morti.
//
//   1. `posti()`            — i mucchi di arredi trovati nel modello
//   2. `posiAppoggiabili()` — tolte le figure umane e gli oggetti appesi
//   3. sul calpestabile     — `sulCamminoCorrente(centro, [6,6,6])`
//   4. gruppi a piedi       — `percorsoCorrente`, e si tiene UN gruppo solo
//
// Serve al §6.14: sette tappe in una striscia di 24 m di un edificio di 106.
// Il setaccio che le stringe li' e' uno di questi quattro, e finche' non si sa
// quale non si tocca niente.
//
//   DAL_WORKSPACE=1 node banco/vivo/da_dove_vengono_le_tappe.mjs
//
// LIMITI ESPLICITI: 3 minuti per modello e zone, 4 per i gruppi a piedi (che
// sono O(n^2) percorsi veri). Oltre il tetto si stampa quello che si e'
// misurato fin li' e si esce: mai un'attesa indefinita.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.join(qui, "..", "..");
const DAL_WS = process.env.DAL_WORKSPACE === "1";
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
const t0 = Date.now();
const secondi = () => ((Date.now() - t0) / 1000).toFixed(0) + "s";
const FUORI = path.join(qui, "colonne_nelle_aperture.txt");
fs.writeFileSync(FUORI, "");
const scrivi = (r) => { console.log(r); fs.appendFileSync(FUORI, r + "\n"); };

const ctx = await chromium.launchPersistentContext(
  path.join(qui, process.env.PROFILO || (DAL_WS ? "profilo_ws" : "profilo_pub")), {
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true, viewport: { width: 1600, height: 900 },
    args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
await ctx.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js", (r) =>
  r.fulfill({ status: 200, path: path.join(WS, "banco", "finti", "supabase_finto.js"),
              headers: { "content-type": "text/javascript" } }));
const TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
               ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css",
               ".glb": "model/gltf-binary", ".png": "image/png", ".svg": "image/svg+xml" };
if (DAL_WS) {
  await ctx.route((url) => url.href.startsWith(BASE), (r) => {
    const u = new URL(r.request().url());
    const rel = decodeURIComponent(u.pathname.slice("/Veritas-spatial-ai/".length)) || "index.html";
    const f = path.join(WS, rel);
    if (f.startsWith(WS) && fs.existsSync(f) && fs.statSync(f).isFile())
      return r.fulfill({ status: 200, path: f, headers: {
        "content-type": TIPI[path.extname(f)] || "application/octet-stream",
        "cache-control": "no-store" } });
    return r.continue();
  });
}

const p = ctx.pages()[0] || await ctx.newPage();
p.on("pageerror", (e) => scrivi(secondi() + " PAGEERROR " + e.message));

await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 90000 });
scrivi(secondi() + " costruzione: " + await p.evaluate(() => window.__EIDETICA_COSTRUZIONE));
await p.waitForSelector("#v-pick-file", { timeout: 60000 }).catch(() => {});
const [scelta] = await Promise.all([
  p.waitForEvent("filechooser", { timeout: 30000 }),
  p.click("#v-pick-file"),
]).catch(() => [null]);
if (scelta) await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "filiera delle tappe").catch(() => {});
await p.evaluate(() => {
  const b = [...document.querySelectorAll("button,label,div,span")]
    .find((x) => x.offsetParent !== null && /^(Airport|Aeroporto)$/.test((x.textContent || "").trim()));
  if (b) b.click();
});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 })
  .then(() => p.click("#vs-start-btn")).catch(() => {});

const pronto = await p.waitForFunction(
  () => !!window.__veritasModelRoot
     && !!(window.__veritasGetNodes && (window.__veritasGetNodes() || []).length)
     && !!(window.__veritasNavmesh && window.__veritasNavmesh.stato && window.__veritasNavmesh.stato())
     && !!(window.__veritasCoseTrovate && window.__veritasCoseTrovate.posti),
  null, { timeout: 3 * 60 * 1000 }).then(() => true).catch(() => false);
if (!pronto) { scrivi(secondi() + " \u2716 mappa di cammino, zone o cose non pronte entro il tetto");
               await ctx.close(); process.exit(1); }
await p.waitForTimeout(20000);
const col = await p.evaluate(() => {
  const T = window.THREE, R = window.__veritasModelRoot, rc = new T.Raycaster(); const out = [];
  for (const z of [-12, 8, 11]) for (let x = -10; x <= -3; x += 1) {
    rc.set(new T.Vector3(x, 30, z), new T.Vector3(0, -1, 0)); rc.far = 60;
    const h = rc.intersectObject(R, true).map((i) => i.point.y.toFixed(2) + ":" + (i.object.name || "?").slice(0, 16));
    out.push("z " + z + " x " + x + "  " + h.slice(0, 7).join(" | "));
  }
  return out;
});
for (const r of col) scrivi(r);
await Promise.race([ctx.close(), new Promise((res) => setTimeout(res, 15000))]).catch(() => {});
process.exit(0);
