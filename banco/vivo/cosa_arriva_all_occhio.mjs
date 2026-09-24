// COSA ARRIVA ALL'OCCHIO, vista per vista (§6.14, 24/09 sera). Raffaella ha
// mandato quattro schermate del pannello «what I see»: l'edificio e' una
// striscia sottile in un riquadro enorme. Qui si misura, per ogni tavola
// dell'abaco (piante, prospetti, sezioni): quanti pixel ha, e QUANTA PARTE del
// quadrato 960 x 960 che l'occhio guarda davvero e' occupata da disegno
// (pixel non trasparenti) — dopo che il rilevatore l'ha rimpicciolita e
// completata a quadrato.
//
//   DAL_WORKSPACE=1 node banco/vivo/cosa_arriva_all_occhio.mjs
//
// LIMITI: 3 minuti per il modello; poi si esce.
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
const FUORI = path.join(qui, "cosa_arriva_all_occhio.txt");
fs.writeFileSync(FUORI, "");
const scrivi = (r) => { console.log(r); fs.appendFileSync(FUORI, r + "\n"); };

const ctx = await chromium.launchPersistentContext(
  path.join(qui, process.env.PROFILO || (DAL_WS ? "profilo_ws2" : "profilo_pub2")), {
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true, viewport: { width: 1600, height: 900 },
    args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
await ctx.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js", (r) =>
  r.fulfill({ status: 200, path: path.join(WS, "banco", "finti", "supabase_finto.js"),
              headers: { "content-type": "text/javascript" } }));
const TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
               ".glb": "model/gltf-binary" };
if (DAL_WS) {
  await ctx.route((url) => url.href.startsWith(BASE), (r) => {
    const u = new URL(r.request().url());
    const rel = decodeURIComponent(u.pathname.slice("/Veritas-spatial-ai/".length)) || "index.html";
    const f = path.join(WS, rel);
    if (f.startsWith(WS) && fs.existsSync(f) && fs.statSync(f).isFile())
      return r.fulfill({ status: 200, path: f, headers: {
        "content-type": TIPI[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" } });
    return r.continue();
  });
}
const p = ctx.pages()[0] || await ctx.newPage();
p.on("pageerror", (e) => scrivi(secondi() + " PAGEERROR " + e.message));
await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 90000 });
scrivi(secondi() + " costruzione: " + await p.evaluate(() => window.__EIDETICA_COSTRUZIONE));
await p.waitForSelector("#v-pick-file", { timeout: 60000 }).catch(() => {});
const [scelta] = await Promise.all([p.waitForEvent("filechooser", { timeout: 30000 }), p.click("#v-pick-file")]).catch(() => [null]);
if (scelta) await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "cosa arriva all'occhio").catch(() => {});
await p.evaluate(() => {
  const b = [...document.querySelectorAll("button,label,div,span")]
    .find((x) => x.offsetParent !== null && /^(Airport|Aeroporto)$/.test((x.textContent || "").trim()));
  if (b) b.click();
});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).then(() => p.click("#vs-start-btn")).catch(() => {});
const pronto = await p.waitForFunction(() => !!window.__veritasModelRoot, null, { timeout: 180000 }).then(() => true).catch(() => false);
if (!pronto) { scrivi("✖ modello non caricato"); await ctx.close(); process.exit(1); }
// le tavole dell'abaco, disegnate come le disegna il giro
const tav = await p.evaluate(async () => {
  const m = await import("./veritas_tavole.js?v=6");
  const R = window.__veritasModelRoot, T = window.THREE;
  const rend = window.__veritasRenderer || window.renderer || null;
  const b = new T.Box3().setFromObject(R), s = b.getSize(new T.Vector3());
  let tav = [];
  try { if (rend) tav = m.abaco(T, rend, R, {}); } catch (e) { return { errore: e.message }; }
  return { ingombro: [s.x, s.y, s.z].map((v) => +v.toFixed(1)), rend: !!rend,
    tavole: tav.map((t) => {
      let n = 0; for (let i = 3; i < t.pixel.length; i += 4) if (t.pixel[i] > 20) n++;
      const lato = Math.max(t.larghezza, t.altezza);
      return { e: t.etichetta, w: t.larghezza, h: t.altezza, ppm: +t.pixelPerMetro.toFixed(1),
               quadrato: +(n / (lato * lato)).toFixed(3) };
    }) };
});
scrivi("ingombro del modello (m): " + JSON.stringify(tav.ingombro) + (tav.errore ? " ERRORE " + tav.errore : ""));
for (const t of tav.tavole || []) scrivi("  tavola " + t.w + "x" + t.h + " · " + t.ppm + " px/m · disegno nel quadrato dell'occhio "
  + Math.round(t.quadrato * 100) + "% · " + t.e);
await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 15000))]).catch(() => {});
process.exit(0);
