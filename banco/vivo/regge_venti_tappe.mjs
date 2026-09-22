// REGGE VENTI TAPPE? La pagina risponde ancora, o si e' seduta?
//
// §6.16: il numero delle zone ora nasce anche dai posti misurati, e su questo
// modello passa da 7 a 20. Venti tappe vogliono dire venti marcatori, le
// traiettorie ricalcolate fra venti punti, e il pannello riscritto. Se la
// pagina si blocca, il fix non vale: una lettura giusta su una pagina morta
// non e' una lettura.
//
// Qui non si misura la qualita': si misura se RISPONDE. Ogni 10 secondi si
// chiede alla pagina una cosa banale e si cronometra la risposta.
//
//   DAL_WORKSPACE=1 node banco/vivo/regge_venti_tappe.mjs
//
// LIMITI ESPLICITI: 5 minuti in tutto. Ogni singola domanda ha 8 secondi:
// oltre quelli la pagina e' considerata ferma, e si dice.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.join(qui, "..", "..");
const DAL_WS = process.env.DAL_WORKSPACE === "1";
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
const TETTO = 5 * 60 * 1000;
const t0 = Date.now();
const secondi = () => ((Date.now() - t0) / 1000).toFixed(0) + "s";
const FUORI = path.join(qui, "venti_tappe.txt");
fs.writeFileSync(FUORI, "");
const scrivi = (r) => { console.log(r); fs.appendFileSync(FUORI, r + "\n"); };

const ctx = await chromium.launchPersistentContext(
  path.join(qui, process.env.PROFILO || "profilo_venti"), {
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
p.on("console", (m) => { const t = m.text();
  if (/percorso\]|tappe|ambienti|Maximum call stack|out of memory/i.test(t))
    scrivi("  [console] " + t.slice(0, 200)); });

await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 90000 });
scrivi(secondi() + " costruzione: " + await p.evaluate(() => window.__EIDETICA_COSTRUZIONE));
await p.waitForSelector("#v-pick-file", { timeout: 60000 }).catch(() => {});
const [scelta] = await Promise.all([
  p.waitForEvent("filechooser", { timeout: 30000 }),
  p.click("#v-pick-file"),
]).catch(() => [null]);
if (scelta) await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "regge venti tappe").catch(() => {});
await p.evaluate(() => {
  const b = [...document.querySelectorAll("button,label,div,span")]
    .find((x) => x.offsetParent !== null && /^(Airport|Aeroporto)$/.test((x.textContent || "").trim()));
  if (b) b.click();
});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 })
  .then(() => p.click("#vs-start-btn")).catch(() => {});

scrivi("");
scrivi("=== LA PAGINA RISPONDE? una domanda banale ogni 10 secondi, 8 s di pazienza ===");
let ferma = 0, viva = 0;
while (Date.now() - t0 < TETTO) {
  const t = Date.now();
  const r = await p.evaluate(() => ({
    tappe: (window.__veritasGetNodes && (window.__veritasGetNodes() || []).length) || 0,
    zone: (window.__veritasAutoZones || []).length,
    posti: ((window.__veritasCoseTrovate || {}).posti || []).length,
    navmesh: !!(window.__veritasNavmesh && window.__veritasNavmesh.stato
                && window.__veritasNavmesh.stato()),
  })).catch((e) => ({ errore: String((e && e.message) || e).slice(0, 80) }));
  const ms = Date.now() - t;
  if (r.errore || ms > 8000) {
    ferma++;
    scrivi("  " + secondi() + "  \u2716 FERMA (" + (r.errore || ms + " ms per rispondere") + ")");
  } else {
    viva++;
    scrivi("  " + secondi() + "  \u2714 risponde in " + ms + " ms \u00b7 tappe " + r.tappe
      + " \u00b7 ambienti " + r.zone + " \u00b7 posti misurati " + r.posti
      + " \u00b7 mappa di cammino " + (r.navmesh ? "pronta" : "no"));
  }
  await p.waitForTimeout(10000);
}
scrivi("");
scrivi("  risposte buone " + viva + ", volte ferma " + ferma);
scrivi("durata " + secondi());
await ctx.close();
