// COSA VEDE IL NARRATORE: si salva l'immagine che manda al modello linguistico.
//
// ⚠️ PERCHE' ESISTE, e perche' non serve LM Studio. Il narratore prepara
//    l'immagine PRIMA di parlare col modello: se il modello e' spento, l'esito
//    torna con `disponibile: false` ma l'IMMAGINE c'e' lo stesso. Quindi da qui
//    si puo' guardare esattamente cio' che gli viene messo davanti, senza
//    accendere niente.
//
//    Serve perche' il 21/09 Raffaella ha visto «SALA D'ATTESA 9» su un
//    passaggio e «PISTA 5» su un bancone dentro l'edificio: *«sembra avere le
//    allucinazioni»*. Non erano allucinazioni — era la fetta alta 45 cm del
//    modello intero schiacciato, l'unica cosa che gli era mai stata mostrata.
//
//      node cosa_vede_il_narratore.mjs                 <- la versione PUBBLICATA (il prima)
//      DAL_WORKSPACE=1 node cosa_vede_il_narratore.mjs <- il codice del workspace (il dopo)
//
// ⚠️ LIMITI ESPLICITI: 8 minuti in tutto, 3 per il modello e le zone.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.join(qui, "..", "..");
const DAL_WS = process.env.DAL_WORKSPACE === "1";
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
const ETICHETTA = DAL_WS ? "dopo" : "prima";
const FUORI = path.join(qui, "narratore");
const TETTO_MS = 18 * 60 * 1000;

const t0 = Date.now();
const secondi = () => ((Date.now() - t0) / 1000).toFixed(0) + "s";
fs.mkdirSync(FUORI, { recursive: true });
const scrivi = (r) => { console.log(r);
  fs.appendFileSync(path.join(FUORI, "referto_" + ETICHETTA + ".txt"), r + "\n"); };
fs.writeFileSync(path.join(FUORI, "referto_" + ETICHETTA + ".txt"), "");

const ctx = await chromium.launchPersistentContext(
  path.join(qui, DAL_WS ? "profilo_ws" : "profilo_pub"), {
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true, viewport: { width: 1600, height: 900 },
    // La pagina e' servita in https e LM Studio sta su http://localhost:1234:
    // il browser lo chiamerebbe "contenuto non sicuro" e lo blocca prima di
    // partire ("Failed to fetch"). Qui si sblocca SOLO nel banco: la versione
    // pubblicata non cambia di una riga.
    args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
           "--allow-running-insecure-content", "--disable-web-security"],
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
p.on("console", (m) => { const t = m.text();
  if (/occhi\]|piante per livello|livelli/i.test(t))
    scrivi(secondi() + " \u00b7 " + t.replace(/\s+/g, " ").slice(0, 240)); });
p.on("pageerror", (e) => scrivi(secondi() + " PAGEERROR " + e.message));

await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 90000 });
scrivi(secondi() + " costruzione: " + await p.evaluate(() => window.__EIDETICA_COSTRUZIONE)
  + "  (" + ETICHETTA + ")");

await p.waitForSelector("#v-pick-file", { timeout: 60000 }).catch(() => {});
const [scelta] = await Promise.all([
  p.waitForEvent("filechooser", { timeout: 30000 }),
  p.click("#v-pick-file"),
]).catch(() => [null]);
if (scelta) await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "cosa vede il narratore").catch(() => {});
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
     && !!(window.__veritasGetNodes && (window.__veritasGetNodes() || []).length),
  null, { timeout: 3 * 60 * 1000 }).then(() => true).catch(() => false);
if (!pronto) { scrivi(secondi() + " \u2716 zone non pronte entro il tetto"); await ctx.close(); process.exit(1); }
scrivi(secondi() + " zone pronte: " + await p.evaluate(() => window.__veritasGetNodes().length));

// Si chiede al narratore di guardare. Il modello linguistico non c'e' (il banco
// non lo accende): l'esito fallira', ma l'immagine preparata resta.
const esito = await p.evaluate(async (tetto) => {
  // ⚠️ IL PROGRAMMA GUARDA GIA' DA SOLO: `assegnaZoneMisurate` chiama il
  //    narratore appena le zone sono misurate, e una seconda chiamata viene
  //    respinta con «sto gia guardando». Quindi non si chiede: si ASPETTA il
  //    suo esito, che e' quello vero.
  const fine = Date.now() + tetto;
  let e = window.__veritasOcchiEsito || null;
  while (!e && Date.now() < fine) {
    await new Promise((r) => setTimeout(r, 1500));
    e = window.__veritasOcchiEsito || null;
  }
  if (!e) return { perche: 'il narratore non ha finito entro il tetto di tempo' };
  return {
    disponibile: !!(e && e.disponibile), perche: (e && e.perche) || null,
    piante: e && e.piante != null ? e.piante : null,
    assegnate: e && e.assegnate ? e.assegnate.length : 0,
    nomi: e && Array.isArray(e.assegnate)
      ? e.assegnate.map((x) => "zona " + ((x.indice | 0) + 1) + ": " + x.nome
          + (x.funzione ? " (" + x.funzione + ")" : "")
          + (x.sicurezza ? " [" + x.sicurezza + "]" : "")) : [],
    scartate: e && Array.isArray(e.scartate) ? e.scartate.length : 0,
    dataURL: e && e.immagine && e.immagine.dataURL ? e.immagine.dataURL : null,
    quota: e && e.immagine && e.immagine.quotaPavimento != null ? e.immagine.quotaPavimento : null,
  };
}, 14 * 60 * 1000).catch((e) => ({ errore: String((e && e.message) || e) }));

scrivi("");
scrivi("=== COSA VEDE IL NARRATORE (" + ETICHETTA + ") ===");
if (esito.errore) scrivi("  \u2716 " + esito.errore);
else {
  scrivi("  piante ricevute: " + (esito.piante == null ? "campo assente (codice di prima)" : esito.piante));
  scrivi("  lettura: " + (esito.disponibile ? esito.assegnate + " zone nominate"
                                            : "\u2716 " + (esito.perche || "non detto")));
  for (const n of (esito.nomi || [])) scrivi("    " + n);
  if (esito.scartate) scrivi("    risposte scartate dal validatore: " + esito.scartate);
  if (esito.dataURL) {
    const dati = esito.dataURL.split(",")[1] || "";
    const file = path.join(FUORI, "vede_" + ETICHETTA + ".png");
    fs.writeFileSync(file, Buffer.from(dati, "base64"));
    scrivi("  \u2714 immagine salvata: " + file + "  (" + Math.round(dati.length * 0.75 / 1024) + " KB)");
  } else scrivi("  \u2716 nessuna immagine: non si e' potuto guardare cosa gli viene mostrato");
}
scrivi("durata " + secondi() + (Date.now() - t0 >= TETTO_MS ? "  (TETTO RAGGIUNTO)" : ""));
await ctx.close();
