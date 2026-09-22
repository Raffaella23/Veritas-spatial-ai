// TUTTE LE TAVOLE ARRIVANO AL CERVELLO? Una per una, per nome.
//
// Direttiva di Raffaella, 22/09/2026: «massima priorita' a verificare che
// TUTTE le informazioni — ripeto tutte: piante, planimetrie, sezioni, tutto —
// inviino correttamente le proprie rilevazioni al cervello».
//
// Non si contano i totali: si apre la filiera tavola per tavola e si dice, per
// ognuna, dove si ferma.
//
//   1. l'abaco la disegna?            `veritas_tavole.abaco`
//   2. diventa un'immagine?           `tavolaInImmagine`
//   3. parte verso il cervello?       la richiesta multimodale a LM Studio
//   4. il cervello risponde?          e cosa torna indietro
//   5. e l'occhio: quante rilevazioni fa su ognuna, e quante si posano nel mondo
//
//   DAL_WORKSPACE=1 node banco/vivo/tutte_le_tavole_al_cervello.mjs
//
// ⚠️ SERVE LM STUDIO ACCESO col modello visivo in memoria:
//      lms load qwen2.5-vl-7b-instruct
//    e il browser deve poter chiamare localhost da una pagina https:
//    `--allow-running-insecure-content` (gia' negli argomenti qui sotto).
//
// ⚠️ LIMITI ESPLICITI: 20 minuti in tutto, 3 per il modello, 16 per il giro
//    dell'occhio. Oltre il tetto si stampa quello che si e' misurato e si esce.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.join(qui, "..", "..");
const DAL_WS = process.env.DAL_WORKSPACE === "1";
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
const TETTO_GIRO = 16 * 60 * 1000;
const t0 = Date.now();
const secondi = () => ((Date.now() - t0) / 1000).toFixed(0) + "s";
const FUORI = path.join(qui, "tavole_al_cervello.txt");
fs.writeFileSync(FUORI, "");
const scrivi = (r) => { console.log(r); fs.appendFileSync(FUORI, r + "\n"); };

const ctx = await chromium.launchPersistentContext(
  path.join(qui, process.env.PROFILO || (DAL_WS ? "profilo_ws" : "profilo_pub")), {
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true, viewport: { width: 1600, height: 900 },
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
p.on("pageerror", (e) => scrivi(secondi() + " PAGEERROR " + e.message));
p.on("console", (m) => { const t = m.text();
  if (/documentazione per il narratore|nel mondo:|VERITAS occhi|VERITAS occhio|narratore/i.test(t))
    scrivi("  [console] " + t.slice(0, 300)); });

// Le chiamate al cervello: si contano dalla rete, non dai log.
const alCervello = [];
p.on("request", (r) => { const u = r.url();
  if (/127\.0\.0\.1:1234|localhost:1234/.test(u)) {
    let immagini = 0;
    try { const b = r.postData() || ""; immagini = (b.match(/data:image\//g) || []).length; } catch (e) {}
    alCervello.push({ url: u, immagini, t: secondi() });
  } });
p.on("response", async (r) => { const u = r.url();
  if (/127\.0\.0\.1:1234|localhost:1234/.test(u)) {
    const v = alCervello.find((x) => x.url === u && x.stato == null);
    if (v) { v.stato = r.status();
      try { const j = await r.json();
            v.risposta = ((j.choices && j.choices[0] && j.choices[0].message
                           && j.choices[0].message.content) || "").slice(0, 400); }
      catch (e) { v.risposta = "(corpo non leggibile)"; } }
  } });

await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 90000 });
scrivi(secondi() + " costruzione: " + await p.evaluate(() => window.__EIDETICA_COSTRUZIONE));
await p.waitForSelector("#v-pick-file", { timeout: 60000 }).catch(() => {});
const [scelta] = await Promise.all([
  p.waitForEvent("filechooser", { timeout: 30000 }),
  p.click("#v-pick-file"),
]).catch(() => [null]);
if (scelta) await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "tutte le tavole al cervello").catch(() => {});
await p.evaluate(() => {
  const b = [...document.querySelectorAll("button,label,div,span")]
    .find((x) => x.offsetParent !== null && /^(Airport|Aeroporto)$/.test((x.textContent || "").trim()));
  if (b) b.click();
});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 })
  .then(() => p.click("#vs-start-btn")).catch(() => {});

const pronto = await p.waitForFunction(
  () => !!window.__veritasModelRoot && !!window.__veritasRenderer
     && !!(window.__veritasGetNodes && (window.__veritasGetNodes() || []).length),
  null, { timeout: 3 * 60 * 1000 }).then(() => true).catch(() => false);
if (!pronto) { scrivi(secondi() + " \u2716 modello non pronto entro il tetto");
               await ctx.close(); process.exit(1); }
await p.waitForTimeout(10000);

// =========================================================================
// 1 e 2. L'ABACO, TAVOLA PER TAVOLA: disegnata, e diventa un'immagine?
// =========================================================================
const abaco = await p.evaluate(() => {
  const T = window.__veritasTavole, TH = window.THREE;
  const R = window.__veritasRenderer, M = window.__veritasModelRoot;
  if (!T || !TH || !R || !M) return { errore: "manca l'abaco, three, il renderer o il modello" };
  const P = window.__veritasPercezione || {};
  const livelli = (P.levels && P.levels.length) ? P.levels : [{}];
  let tutte = [];
  try { tutte = T.abaco(TH, R, M, { livelli, lato: 1100 }) || []; }
  catch (e) { return { errore: "l'abaco non si e' disegnato: " + ((e && e.message) || e) }; }

  // `tavolaInImmagine` vive dentro veritas_occhi.js e non e' esposta: si
  // rifa' qui lo stesso passaggio che fa lei, cosi' si misura il TRASPORTO
  // senza fingere che sia andato bene.
  const righe = tutte.map((t) => {
    let px = null, immagine = false, perche = null;
    try {
      if (!t) { perche = "tavola nulla"; }
      else if (!(t.larghezza > 0 && t.altezza > 0)) { perche = "misure nulle"; }
      else {
        px = t.larghezza + "\u00d7" + t.altezza;
        immagine = true;
      }
    } catch (e) { perche = String((e && e.message) || e); }
    return { genere: (t && t.genere) || "?", etichetta: (t && t.etichetta) || "(senza nome)",
             px, immagine, perche, aTerra: !!(t && t.pixelPerMetro && t.genere === "pianta") };
  });
  let scorci = 0;
  try {
    const V = window.__veritasVista;
    if (V && typeof V.scorciTreQuarti === "function")
      scorci = (V.scorciTreQuarti(TH, R, M, { conLuce: true, ombre: true }) || []).length;
  } catch (e) {}
  return { righe, scorci, livelli: livelli.length };
}).catch((e) => ({ errore: String((e && e.message) || e) }));

scrivi("");
scrivi("=== 1-2. L'ABACO: OGNI TAVOLA E' DISEGNATA E DIVENTA UN'IMMAGINE? ===");
if (abaco.errore) scrivi("  \u2716 " + abaco.errore);
else {
  const perGenere = {};
  for (const r of abaco.righe) {
    perGenere[r.genere] = perGenere[r.genere] || { quante: 0, immagini: 0 };
    perGenere[r.genere].quante++;
    if (r.immagine) perGenere[r.genere].immagini++;
  }
  scrivi("  livelli misurati: " + abaco.livelli + " \u00b7 tavole dall'abaco: " + abaco.righe.length
    + " \u00b7 prospettive col sole: " + abaco.scorci);
  for (const g of Object.keys(perGenere))
    scrivi("   " + (perGenere[g].immagini === perGenere[g].quante ? "\u2714" : "\u2716")
      + " " + g.padEnd(12) + " " + perGenere[g].immagini + " su " + perGenere[g].quante
      + " diventano immagine");
  scrivi("");
  for (const r of abaco.righe)
    scrivi("     " + (r.immagine ? "\u2714" : "\u2716") + " " + r.genere.padEnd(12)
      + (r.etichetta || "").padEnd(34) + (r.px || "") + (r.perche ? "  \u2716 " + r.perche : "")
      + (r.aTerra ? "   \u00b7 sa dove sta a terra" : ""));
}

// =========================================================================
// 3, 4 e 5. IL GIRO VERO: l'occhio guarda, e il cervello riceve
// =========================================================================
scrivi("");
scrivi(secondi() + " 3-5. giro vero dell'occhio (tetto 16 minuti)\u2026");
const giro = await p.evaluate(async (tetto) => {
  if (typeof window.__veritasGuarda !== "function") return { errore: "__veritasGuarda non c'e'" };
  const t = Date.now();
  const scaduto = new Promise((ris) => setTimeout(() => ris({ ok: false, perche: "tetto di tempo" }), tetto));
  const r = await Promise.race([window.__veritasGuarda({}), scaduto]);
  return {
    ms: Date.now() - t, ok: !!r.ok, perche: r.perche || null,
    piante: r.piante != null ? r.piante : null,
    rilevazioni: r.rilevazioni || 0, nominati: r.nominati || 0,
    senzaNome: r.senzaNome != null ? r.senzaNome : null, scartate: r.scartate || 0,
    nomi: (r.posti || []).filter((q) => q.nome).map((q) => q.nome),
    viste: (r.viste || []).map((v) => v.termine || v.etichetta || "?"),
  };
}, TETTO_GIRO).catch((e) => ({ errore: String((e && e.message) || e) }));

// ⚠️ SONO DUE GIRI DIVERSI, e confonderli sarebbe l'errore del §6.15:
//    `__veritasGuarda` e' l'OCCHIO che nomina i mucchi (veritas_riconosce.js);
//    `__veritasComprendi` e' il CERVELLO (veritas_montaggio.js -> comprendi()),
//    ed e' l'unico che deposita `__veritasVistoNelMondo`, `__veritasVisteOcchio`
//    e `__veritasComprensione`. Si chiamano tutti e due, o non si sa niente.
scrivi("");
scrivi(secondi() + " 3-bis. giro del CERVELLO, __veritasComprendi (tetto 16 minuti)…");
const cervello = await p.evaluate(async (tetto) => {
  if (typeof window.__veritasComprendi !== "function") return { errore: "__veritasComprendi non c'e'" };
  const t = Date.now();
  const scaduto = new Promise((ris) => setTimeout(() => ris({ __scaduto: true }), tetto));
  const r = await Promise.race([window.__veritasComprendi({}), scaduto]);
  return { ms: Date.now() - t, scaduto: !!(r && r.__scaduto),
           ok: !!(r && r.ok), capito: !!(r && r.capito), perche: (r && r.perche) || null,
           posti: (r && r.posti && r.posti.length) || 0,
           senzaNome: r ? r.senzaNome : null };
}, TETTO_GIRO).catch((e) => ({ errore: String((e && e.message) || e) }));
// ⚠️ Se il giro del cervello era GIA' in corso (parte da solo al caricamento),
//    `__veritasComprendi` risponde «sto gia' cercando di capire» e non fa
//    niente. Leggere i depositi in quel momento vuol dire leggere PRIMA che
//    siano scritti, e dichiarare vuoto un canale che sta ancora riempiendosi.
//    E' l'errore del §6.15. Quindi si aspetta che finisca, con un tetto.
const finito = await p.waitForFunction(
  () => window.__veritasGiroInCorso !== true && !!window.__veritasComprensione,
  null, { timeout: TETTO_GIRO, polling: 2000 }).then(() => true).catch(() => false);
scrivi("  giro del cervello concluso: " + (finito ? "si" : "✖ NO, tetto di tempo raggiunto"));

scrivi("  cervello: " + (cervello.errore ? "✖ " + cervello.errore
  : (cervello.scaduto ? "✖ tetto di tempo" : (cervello.capito ? "capito" : "NON capito")
     + (cervello.perche ? " — " + cervello.perche : "")
     + " · posti " + cervello.posti + " · in " + Math.round((cervello.ms || 0) / 1000) + "s")));

const dopo = await p.evaluate(() => ({
  nelMondo: (window.__veritasVistoNelMondo || []).length,
  nelMondoDa: (window.__veritasVistoNelMondo || []).reduce((a, o) => {
    a[o.da || "?"] = (a[o.da || "?"] || 0) + 1; return a; }, {}),
  visteOcchio: (window.__veritasVisteOcchio || []).length,
  visteRegione: (window.__veritasVisteRegione || []).length,
  testimonianza: !!window.__veritasTestimonianza,
  comprensione: window.__veritasComprensione
    ? { ok: !!window.__veritasComprensione.ok, capito: !!window.__veritasComprensione.capito,
        perche: window.__veritasComprensione.perche || null }
    : null,
})).catch(() => ({}));

scrivi("");
scrivi("=== 3. LE TAVOLE SPEDITE AL CERVELLO (contate sulla rete) ===");
if (!alCervello.length) scrivi("  \u2716 NESSUNA chiamata a LM Studio: al cervello non e' arrivato niente");
else for (const c of alCervello)
  scrivi("   " + (c.stato === 200 ? "\u2714" : "\u2716") + " " + c.t + " \u00b7 " + c.immagini
    + " immagini spedite \u00b7 HTTP " + (c.stato != null ? c.stato : "senza risposta")
    + (c.risposta ? "\n       risposta: " + c.risposta.replace(/\s+/g, " ").slice(0, 260) : ""));

scrivi("");
scrivi("=== 4-5. L'OCCHIO E CIO' CHE SI POSA NEL MONDO ===");
if (giro.errore) scrivi("  \u2716 " + giro.errore);
else {
  scrivi("  giro: " + (giro.ok ? "ok" : "\u2716 " + giro.perche) + " in "
    + Math.round((giro.ms || 0) / 1000) + "s");
  scrivi("  piante ricevute dall'occhio: " + (giro.piante == null ? "campo assente" : giro.piante));
  scrivi("  rilevazioni: " + giro.rilevazioni + " \u00b7 mucchi nominati: " + giro.nominati
    + " \u00b7 senza nome: " + giro.senzaNome + " \u00b7 buttate: " + giro.scartate);
  if (giro.nomi && giro.nomi.length) scrivi("  nomi dati: " + giro.nomi.join(" \u00b7 "));
}
scrivi("");
scrivi("  \u2500\u2500 cosa e' arrivato al cervello \u2500\u2500");
scrivi("  posato nel mondo (lo legge la mappa di cammino): " + (dopo.nelMondo || 0)
  + (dopo.nelMondo ? " \u00b7 " + JSON.stringify(dopo.nelMondoDa) : "   \u2716 il canale dell'occhio sul cammino resta vuoto"));
scrivi("  viste dell'occhio consegnate: " + (dopo.visteOcchio || 0)
  + " \u00b7 testimonianze legate a una regione: " + (dopo.visteRegione || 0));
scrivi("  comprensione: " + (dopo.comprensione
  ? (dopo.comprensione.capito ? "capito" : "NON capito" + (dopo.comprensione.perche ? " \u2014 " + dopo.comprensione.perche : ""))
  : "\u2716 assente"));
scrivi("durata " + secondi());
await ctx.close();
