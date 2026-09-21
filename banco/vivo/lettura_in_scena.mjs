// LA LETTURA IN SCENA: si fotografa la pagina di attesa mentre l'occhio legge.
//
// ⚠️ PERCHE' ESISTE. La lama che passa sul modello e il cono di luce dove
//    guarda l'occhio non si provano con un numero: o si vedono o non ci sono.
//    E fino al 21/09 la lama passava SEMPRE lungo X, anche mentre si disegnava
//    una pianta: un'animazione credibile e falsa, che nessun test automatico
//    poteva smascherare. Qui si guarda.
//
//      DAL_WORKSPACE=1 node lettura_in_scena.mjs
//
//    Salva i fotogrammi in `banco/vivo/scena/` e stampa, per ognuno, QUALE
//    disegno l'occhio stava guardando in quel momento: cosi' un fotogramma si
//    puo' confrontare con la tavola che dichiara.
//
// ⚠️ LIMITI ESPLICITI: 10 minuti in tutto, 3 per il modello in scena, 18
//    fotogrammi al massimo. Scaduto il tempo si dice che e' scaduto.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.join(qui, "..", "..");
const DAL_WS = process.env.DAL_WORKSPACE === "1";
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
const FUORI = path.join(qui, "scena");
const TETTO_MS = 10 * 60 * 1000;
const QUANTI = Number(process.env.FOTOGRAMMI || 18);

const t0 = Date.now();
const secondi = () => ((Date.now() - t0) / 1000).toFixed(0) + "s";
fs.rmSync(FUORI, { recursive: true, force: true });
fs.mkdirSync(FUORI, { recursive: true });

const ctx = await chromium.launchPersistentContext(
  path.join(qui, DAL_WS ? "profilo_ws" : "profilo_pub"), {
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    viewport: { width: 1600, height: 900 },
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
p.on("pageerror", (e) => console.log(secondi() + " PAGEERROR " + e.message));

await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 90000 });
console.log(secondi() + " costruzione: " + await p.evaluate(() => window.__EIDETICA_COSTRUZIONE));

// Si registra ogni vista annunciata: e' l'elenco con cui confrontare le foto.
await p.evaluate(() => {
  window.__provaViste = [];
  addEventListener("veritas:vista", (e) => {
    const d = (e && e.detail) || {};
    window.__provaViste.push({ t: Date.now(), etichetta: d.etichetta || null,
      taglio: d.taglio ? { genere: d.taglio.genere, normale: d.taglio.normale.map((v) => +v.toFixed(2)) } : null });
  });
});

await p.waitForSelector("#v-pick-file", { timeout: 60000 }).catch(() => {});
const [scelta] = await Promise.all([
  p.waitForEvent("filechooser", { timeout: 30000 }),
  p.click("#v-pick-file"),
]).catch(() => [null]);
if (scelta) await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "lettura in scena").catch(() => {});
await p.evaluate(() => {
  const b = [...document.querySelectorAll("button,label,div,span")]
    .find((x) => x.offsetParent !== null && /^(Airport|Aeroporto)$/.test((x.textContent || "").trim()));
  if (b) b.click();
});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 })
  .then(() => p.click("#vs-start-btn")).catch(() => {});
console.log(secondi() + " progetto aperto");

// Si fotografa appena una vista viene annunciata: la lama vive 2,6 secondi.
let viste = 0, scatti = 0;
while (scatti < QUANTI && Date.now() - t0 < TETTO_MS) {
  const ora = await p.evaluate((n) => {
    const v = window.__provaViste || [];
    return v.length > n ? v[v.length - 1] : null;
  }, viste).catch(() => null);
  if (!ora) { await p.waitForTimeout(700); continue; }
  viste = await p.evaluate(() => (window.__provaViste || []).length);
  // mezzo secondo dopo l'annuncio: la lama e' partita e non ancora arrivata
  await p.waitForTimeout(500);
  const nome = String(++scatti).padStart(2, "0") + ".png";
  await p.screenshot({ path: path.join(FUORI, nome) }).catch(() => {});
  console.log(secondi() + "  " + nome + "  " + (ora.etichetta || "(vista senza nome)")
    + (ora.taglio ? "   [taglio " + ora.taglio.genere + ", guarda " + ora.taglio.normale.join(",") + "]"
                  : "   [nessun taglio dichiarato]"));
}
const aperta = await p.evaluate(() => !!(window.__veritasApertura
  && window.__veritasApertura.stato && window.__veritasApertura.stato())).catch(() => false);
console.log(secondi() + " fotogrammi: " + scatti + " · viste annunciate: " + viste
  + " · pagina di attesa ancora aperta: " + (aperta ? "si" : "no")
  + (Date.now() - t0 >= TETTO_MS ? "  (TETTO RAGGIUNTO)" : ""));
await ctx.close();
