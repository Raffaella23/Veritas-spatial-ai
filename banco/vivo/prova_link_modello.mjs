// FASE C (30/09): il plastico in scala nel visore, sulla STESSA scena.
// Il visore e' un Quest 3 simulato (iwer, Meta) dentro Chrome senza finestra:
// si preme il pulsante vero, si misura dentro, si esce, si confronta.
//
// Criterio deciso PRIMA di lanciarla:
//   pulsante visibile in Esperienza accanto al selettore;
//   nel visore: sessione accesa, 2 occhi, fotogrammi serviti al ritmo del
//   visore, argilla anche li', agenti che si muovono, testa a
//   (1,60 - 0,75) m x scala sopra il piano del plastico (±5%);
//   all'uscita: telecamera identica (0 cm, 0°), comandi di nuovo attivi,
//   requestAnimationFrame della finestra restituito, scena che continua.
//   Tetto: 8 minuti.
//
//   DAL_WORKSPACE=1 RADICE=<clone> node banco/vivo/prova_visore.mjs
//   VERO=1 : Chrome con la finestra, SENZA simulatore (per il Quest vero via
//            Link/Air Link): prepara la scena in Esperienza e resta aperto.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(process.env.RADICE || path.join(qui, "..", ".."));
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const DAL_WS = process.env.DAL_WORKSPACE === "1";
const VERO = process.env.VERO === "1";
const CARTELLA = path.resolve(process.env.CARTELLA || path.join(qui, "misure_visore"));
fs.mkdirSync(CARTELLA, { recursive: true });
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
const TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
               ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css",
               ".glb": "model/gltf-binary", ".png": "image/png", ".svg": "image/svg+xml" };
const t0 = Date.now();
const ora = () => String(Math.round((Date.now() - t0) / 1000)).padStart(4) + "s";
const aspetta = (ms) => new Promise((r) => setTimeout(r, ms));
setTimeout(() => { console.log(ora() + "  TETTO 4 minuti"); process.exit(2); }, 4 * 60 * 1000);

const ctx = await chromium.launchPersistentContext(path.join(qui, process.env.PROFILO || "profilo_visore"), {
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: !VERO, viewport: VERO ? null : { width: 1600, height: 900 },
  // VERO: la NVIDIA. Misurato il 30/09: con la scheda Intel il Quest riceveva ~2 fotogrammi al secondo
  args: VERO ? ["--start-maximized", "--force_high_performance_gpu"] : ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
await ctx.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js", (r) =>
  r.fulfill({ status: 200, path: path.join(WS, "banco", "finti", "supabase_finto.js"),
              headers: { "content-type": "text/javascript" } }));
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
// 09/10 — IL MODELLO DALL'INDIRIZZO: ?modello=airport_foot_traffic.glb apre il
// modulo col file gia' scelto (per il Quest Browser, dove non si sceglie un file).
// Criterio: file intero (stesso peso del file del sito), «Crea e apri», modello in scena (2.416 pezzi).
const p = ctx.pages()[0] || await ctx.newPage();
p.on("pageerror", (e) => console.log(ora() + "  PAGEERROR " + String(e).slice(0, 200)));
await p.goto(BASE + "?modello=airport_foot_traffic.glb&cb=" + Date.now(), { waitUntil: "load", timeout: 120000 });
await p.waitForSelector("#v-create-btn", { state: "visible", timeout: 90000 });
await p.waitForFunction(() => /·/.test(document.querySelector("#v-file-scelto")?.textContent || ""), null, { timeout: 90000 });
const scelto = await p.evaluate(() => ({ testo: document.querySelector("#v-file-scelto").textContent, nome: document.querySelector("#v-new-name").value }));
console.log(ora() + "  MODULO " + JSON.stringify(scelto) + " · peso sul disco " + (fs.statSync(path.join(WS, "airport_foot_traffic.glb")).size / 1048576).toFixed(1) + " MB");
await p.click("#v-create-btn");
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).then(() => p.click("#vs-start-btn")).catch(() => {});
await p.waitForFunction(() => { const r = window.__veritasModelRoot; if (!r) return false; let n = 0; r.traverse((o) => { if (o.isMesh) n++; }); return n > 0; }, null, { timeout: 150000 });
const pezzi = await p.evaluate(() => { let n = 0; window.__veritasModelRoot.traverse((o) => { if (o.isMesh) n++; }); return n; });
console.log(ora() + "  IN SCENA " + pezzi + " pezzi -> " + (pezzi === 2416 ? "RIUSCITA" : "NON RIUSCITA"));
await Promise.race([ctx.close(), aspetta(10000)]).catch(() => {});
process.exit(0);
