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
const FUORI = path.join(qui, "frecce_e_occhio.txt");
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
const fine = Date.now() + 300000;
while (Date.now() < fine) {
  if (await p.evaluate(() => !!window.__veritasComprensione).catch(() => false)) break;
  await p.waitForTimeout(5000);
}
const r = await p.evaluate(() => {
  const T = window.THREE, R = window.__veritasModelRoot;
  // dove stanno le frecce, misurate: tutte le mesh che si chiamano arrow*
  // (il nome serve SOLO a questa sonda per trovarle, non al programma)
  const frecce = [];
  R.traverse((o) => { if (o.isMesh && /^arrow/i.test(o.name || "")) {
    const b = new T.Box3().setFromObject(o); frecce.push({ n: o.name, min: b.min.toArray(), max: b.max.toArray() }); } });
  const visto = (window.__veritasVistoNelMondo || []).filter((o) => o && o.mondo);
  const conta = {}; for (const o of visto) { const k = (o.nome || o.etichetta || "?") + "/" + (o.passo || "-"); conta[k] = (conta[k] || 0) + 1; }
  // per ogni freccia: che cosa ha visto l'occhio sopra di lei
  const sopra = frecce.map((f) => {
    const c = [(f.min[0] + f.max[0]) / 2, (f.min[2] + f.max[2]) / 2];
    const qui = visto.filter((o) => c[0] >= o.mondo.min[0] - 0.5 && c[0] <= o.mondo.max[0] + 0.5
      && c[1] >= o.mondo.min[2] - 0.5 && c[1] <= o.mondo.max[2] + 0.5)
      .map((o) => (o.nome || "?") + (o.da ? "@" + o.da : ""));
    return f.n + " [" + c.map((v) => v.toFixed(1)) + "] spess " + (f.max[1] - f.min[1]).toFixed(2) + " da terra "
      + f.min[1].toFixed(2) + " -> " + (qui.length ? [...new Set(qui)].slice(0, 6).join(", ") : "niente");
  });
  return { quanteFrecce: frecce.length, conta, sopra, campione: visto.slice(0, 3) };
});
scrivi("frecce nel modello: " + r.quanteFrecce);
scrivi("cosa ha posato l'occhio (nome/passo: quante): " + JSON.stringify(r.conta));
for (const x of r.sopra) scrivi("  " + x);
scrivi("campione: " + JSON.stringify(r.campione).slice(0, 600));
await Promise.race([ctx.close(), new Promise((res) => setTimeout(res, 15000))]).catch(() => {});
process.exit(0);
