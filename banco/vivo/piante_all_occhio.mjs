// LE PIANTE ALL'OCCHIO: su che disegno guarda, e cosa ci trova.
//
// ⚠️ PERCHE' ESISTE. Fino al 21/09 l'occhio che assegna i nomi (`__veritasGuarda`)
//    si disegnava da solo UNA pianta: il modello intero schiacciato dall'alto
//    (`piantaDelPavimento`, `tutto: true`), cioe' tutti i livelli stampati uno
//    sopra l'altro. Le piante giuste — una per livello, tagliate a 1,10 m sopra
//    lo zero di QUEL piano — `veritas_tavole.js` le disegnava gia', ma qui non
//    arrivavano (§6.9, §8).
//
//    Questa prova misura il prima e il dopo sullo STESSO modello, con la stessa
//    ricetta di `prova_occhio.mjs`: quante piante riceve l'occhio, quanti mucchi
//    per piano, e quante cose riconosce.
//
//      node piante_all_occhio.mjs                 <- la versione PUBBLICATA (il prima)
//      DAL_WORKSPACE=1 node piante_all_occhio.mjs <- il codice del workspace (il dopo)
//
// ⚠️ LIMITI ESPLICITI (regola §4.10): 14 minuti in tutto, 3 minuti per il
//    modello in scena, 8 minuti per lo sguardo. Scaduto il tempo si dice che e'
//    scaduto, non si aspetta all'infinito.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.join(qui, "..", "..");
const DAL_WS = process.env.DAL_WORKSPACE === "1";
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
const TETTO_MS = 14 * 60 * 1000;
const TETTO_MODELLO = 3 * 60 * 1000;
const TETTO_SGUARDO = 8 * 60 * 1000;

const t0 = Date.now();
const secondi = () => ((Date.now() - t0) / 1000).toFixed(0) + "s";
const nomeLog = "piante_" + (DAL_WS ? "workspace" : "pubblicata") + ".txt";
fs.writeFileSync(path.join(qui, nomeLog), "");
const righe = [];
const scrivi = (r) => {
  righe.push(r);
  console.log(r);
  fs.appendFileSync(path.join(qui, nomeLog), r + "\n");
};

const ctx = await chromium.launchPersistentContext(
  path.join(qui, process.env.PROFILO || (DAL_WS ? "profilo_ws" : "profilo_pub")), {
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    viewport: { width: 1600, height: 900 },
    args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });

// L'accesso finto del banco: non si tocca il vero Supabase.
await ctx.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js", (r) =>
  r.fulfill({ status: 200, path: path.join(WS, "banco", "finti", "supabase_finto.js"),
              headers: { "content-type": "text/javascript" } }));

// Il codice del WORKSPACE al posto di quello pubblicato, file per file.
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
p.on("console", (m) => {
  const t = m.text();
  if (/piante per livello|l'abaco|occhio\]|EIDETICA/.test(t) || m.type() === "error")
    scrivi(secondi() + " · " + t.replace(/\s+/g, " ").slice(0, 300));
});
p.on("pageerror", (e) => scrivi(secondi() + " PAGEERROR " + e.message));

await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 90000 });
const costruzione = await p.evaluate(() => window.__EIDETICA_COSTRUZIONE);
scrivi(secondi() + " costruzione servita: " + costruzione + (DAL_WS ? "  (workspace)" : "  (pubblicata)"));

// Il percorso vero di chi usa l'app: «+ Nuovo progetto — scegli il file».
await p.waitForSelector("#v-pick-file", { timeout: 60000 })
  .catch((e) => scrivi("pulsante nuovo progetto: " + e.message));
const [scelta] = await Promise.all([
  p.waitForEvent("filechooser", { timeout: 30000 }),
  p.click("#v-pick-file"),
]).catch((e) => { scrivi("scelta file: " + e.message); return [null]; });
if (scelta) await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "piante all occhio").catch(() => {});
await p.evaluate(() => {
  const b = [...document.querySelectorAll("button,label,div,span")]
    .find((x) => x.offsetParent !== null && /^(Airport|Aeroporto)$/.test((x.textContent || "").trim()));
  if (b) b.click();
});
await p.click("#v-create-btn").catch((e) => scrivi("crea: " + e.message));
await p.waitForSelector("#vs-start-btn", { timeout: 60000 })
  .then(() => p.click("#vs-start-btn")).catch(() => {});
scrivi(secondi() + " progetto aperto");

// Si aspetta il modello in scena E i mucchi misurati: senza mucchi non c'e'
// niente da nominare, e lo sguardo direbbe soltanto «non ho misurato niente».
const pronto = await p.waitForFunction(
  () => !!window.__veritasModelRoot
     && !!(window.__veritasCoseTrovate && (window.__veritasCoseTrovate.posti || []).length),
  null, { timeout: TETTO_MODELLO }).then(() => true).catch(() => false);
if (!pronto) {
  scrivi(secondi() + " ✖ modello o mucchi non pronti entro il tetto: non si misura niente");
  await ctx.close();
  process.exit(1);
}

const prima = await p.evaluate(() => ({
  livelli: ((window.__veritasPercezione || {}).levels || [])
    .map((l) => (typeof l.levelY === "number" ? +l.levelY.toFixed(2) : null)),
  mucchi: (window.__veritasCoseTrovate.posti || []).length,
  tavole: typeof (window.__veritasTavole || {}).piantePerLivello,
}));
scrivi(secondi() + " livelli misurati: " + JSON.stringify(prima.livelli)
  + " · mucchi: " + prima.mucchi
  + " · piante chiedibili: " + (prima.tavole === "function" ? "si" : "NO (codice di prima)"));

// LO SGUARDO. Si chiama la stessa funzione del giro vero.
const sguardo = await p.evaluate(async (tetto) => {
  const t = Date.now();
  const corsa = window.__veritasGuarda({});
  const scaduto = new Promise((ris) => setTimeout(() => ris({ ok: false, perche: "tetto di tempo" }), tetto));
  const r = await Promise.race([corsa, scaduto]);
  return {
    ms: Date.now() - t, ok: !!r.ok, perche: r.perche || null,
    piante: r.piante != null ? r.piante : null,
    rilevazioni: r.rilevazioni || 0, nominati: r.nominati || 0,
    senzaNome: r.senzaNome != null ? r.senzaNome : null,
    scartate: r.scartate || 0,
    nomi: (r.posti || []).filter((q) => q.nome).map((q) => q.nome).slice(0, 30),
    viste: (r.viste || []).map((v) => v.termine),
  };
}, TETTO_SGUARDO).catch((e) => ({ ok: false, perche: e.message }));

scrivi("");
scrivi("=== SGUARDO " + (DAL_WS ? "col codice del workspace" : "sulla versione pubblicata") + " ===");
scrivi("  esito: " + (sguardo.ok ? "ok" : "✖ " + sguardo.perche) + " in " + Math.round((sguardo.ms || 0) / 1000) + "s");
scrivi("  piante ricevute dall'occhio: " + (sguardo.piante === null ? "campo assente (codice di prima)" : sguardo.piante));
scrivi("  rilevazioni: " + sguardo.rilevazioni + " · mucchi nominati: " + sguardo.nominati
  + " · senza nome: " + sguardo.senzaNome + " · rilevazioni buttate: " + sguardo.scartate);
if (sguardo.viste && sguardo.viste.length) {
  const conta = {};
  for (const t of sguardo.viste) conta[t] = (conta[t] || 0) + 1;
  scrivi("  cose viste: " + Object.entries(conta).sort((a, b) => b[1] - a[1])
    .map(([k, n]) => k + " x" + n).join(", "));
}
if (sguardo.nomi && sguardo.nomi.length) scrivi("  nomi dati: " + sguardo.nomi.join(" · "));
scrivi("durata totale " + secondi() + (Date.now() - t0 >= TETTO_MS ? "  (TETTO RAGGIUNTO)" : ""));
await ctx.close();
