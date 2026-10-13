// 13/10: APERTURA DIRETTA PER IL VISORE (quest/), testa presa da prova_visore.mjs
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
setTimeout(() => { console.log(ora() + "  TETTO 5 minuti"); process.exit(2); }, 5 * 60 * 1000);

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
// 13/10 — APERTURA DIRETTA PER IL VISORE: «quest/» porta all'app con l'aeroporto, che si apre DA SOLO
// (nessun clic); dopo un accesso che perde l'indirizzo si riapre lo STESSO progetto.
// Criterio: due aperture senza clic, 2.416 pezzi tutte e due, stesso progetto.
const p = ctx.pages()[0] || await ctx.newPage();
p.on("pageerror", (e) => console.log(ora() + "  PAGEERROR " + String(e).slice(0, 200)));
const aperto = async (nome) => {
  await p.waitForFunction(() => { const r = window.__veritasModelRoot; if (!r) return false; let n = 0; r.traverse((o) => { if (o.isMesh) n++; }); return n > 0; }, null, { timeout: 150000 });
  const m = await p.evaluate(() => { let n = 0; window.__veritasModelRoot.traverse((o) => { if (o.isMesh) n++; });
    return { pezzi: n, progetto: window.__veritasProjectId, nome: window.__veritasProjectName, indirizzo: location.pathname + location.search }; });
  console.log(ora() + "  " + nome + " " + JSON.stringify(m)); return m; };
await p.goto(BASE + "quest/index.html?cb=" + Date.now(), { waitUntil: "load", timeout: 120000 });
const a = await aperto("PRIMA (indirizzo corto)");
await p.evaluate(() => sessionStorage.setItem("eidetica:modello", "airport_foot_traffic.glb"));
await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 120000 });
const b = await aperto("SECONDA (indirizzo perso, come dopo l'accesso)");
const ok = a.pezzi === 2416 && b.pezzi === 2416 && a.progetto && a.progetto === b.progetto;
console.log(ora() + "  ESITO " + (ok ? "RIUSCITA" : "NON RIUSCITA"));
await Promise.race([ctx.close(), aspetta(10000)]).catch(() => {});
process.exit(0);
