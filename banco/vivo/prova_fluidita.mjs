// Quanto si ferma la pagina mentre l'occhio guarda.
//
// Misura sul FILO PRINCIPALE, quello che disegna: se si ferma lui si ferma
// tutto — il velo di apertura, la scena, i bottoni. Tre misure insieme, perche'
// una sola in un Chrome senza finestra si puo' sbagliare:
//
//   battito   un timer ogni 20 ms: quanto tardi arriva davvero. E' la misura
//             piu' onesta in headless, dove i fotogrammi non sono garantiti.
//   lunghe    PerformanceObserver('longtask'): i lavori sopra i 50 ms, che sono
//             la definizione standard di «qui la pagina non risponde».
//   salti     distanza fra due requestAnimationFrame.
//
// Confronto previsto:
//   DAL_WORKSPACE=0 node prova_fluidita.mjs   la versione PUBBLICATA (il prima)
//   DAL_WORKSPACE=1 node prova_fluidita.mjs   il workspace          (il dopo)
//
// Manopole: MODELLO, PAROLE (quante parole chiedere), ATTESA_OCCHIO,
//           ATTESA_SGUARDO, PROFILO, FUORI (file json dove scrivere).
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.join(qui, "..", "..");
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const QUANTE = Number(process.env.PAROLE || 0);         // 0 = tutto il vocabolario
const ATTESA_OCCHIO = Number(process.env.ATTESA_OCCHIO || 420000);
const ATTESA_SGUARDO = Number(process.env.ATTESA_SGUARDO || 600000);
const DAL_WS = process.env.DAL_WORKSPACE === "1";
const FUORI = process.env.FUORI || path.join(qui, "fluidita_" + (DAL_WS ? "workspace" : "pubblicata") + ".json");

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
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
if (DAL_WS) {
  await ctx.route((url) => url.href.startsWith(BASE), (r) => {
    const u = new URL(r.request().url());
    const rel = decodeURIComponent(u.pathname.slice("/Veritas-spatial-ai/".length)) || "index.html";
    const f = path.join(WS, rel);
    if (f.startsWith(WS) && fs.existsSync(f) && fs.statSync(f).isFile())
      return r.fulfill({ status: 200, path: f,
        headers: { "content-type": TIPI[path.extname(f)] || "application/octet-stream",
                   "cache-control": "no-store" } });
    return r.continue();
  });
}

const p = ctx.pages()[0] || await ctx.newPage();
const righe = [];
p.on("console", (m) => {
  const t = m.text();
  if (/\[VERITAS occhio/.test(t) || m.type() === "error") righe.push(m.type()[0] + " " + t.slice(0, 260));
});
p.on("pageerror", (e) => righe.push("PAGEERROR " + String(e).slice(0, 260)));

await p.bringToFront();
await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 120000 });
const costruzione = await p.evaluate(() => window.__EIDETICA_COSTRUZIONE || "(non dichiarata)");
console.log("costruzione servita: " + costruzione + (DAL_WS ? "  (dal workspace)" : "  (pubblicata)"));

await p.waitForSelector("#v-pick-file", { timeout: 60000 });
const [scelta] = await Promise.all([p.waitForEvent("filechooser", { timeout: 30000 }), p.click("#v-pick-file")]);
await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "prova fluidita").catch(() => {});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).then(() => p.click("#vs-start-btn")).catch(() => {});
await p.waitForFunction(() => !!window.__veritasModelRoot, null, { timeout: 180000 });
await p.waitForTimeout(8000);   // il modello si assesta

// ---------------------------------------------------------------------------
// Il misuratore. Si installa PRIMA di accendere l'occhio e resta acceso.
// ---------------------------------------------------------------------------
await p.evaluate(() => {
  // ⚠️ DUE TRAPPOLE, E SONO MIE. Trovate confrontando le tre misure fra loro
  //    il 20/09: dicevano cose diverse sullo stesso istante, quindi una
  //    sbagliava. Sbagliavano due.
  //
  //    1. IL PRIMO CAMPIONE DOPO L'ACCENSIONE porta dentro tutto il tempo
  //       passato PRIMA. I fotogrammi, mentre il modello si scarica, non si
  //       disegnano affatto: il primo salto misurato valeva 13,8 s di attesa
  //       che non c'entrava niente con lo sguardo. Si butta.
  //    2. LE ATTIVITA' LUNGHE ARRIVANO IN RITARDO: l'osservatore le consegna a
  //       mazzetti, e un lavoro cominciato durante il caricamento viene
  //       consegnato dopo, finendo nel conto dello sguardo. Si guarda QUANDO
  //       e' cominciato (`startTime`), non quando e' arrivata la notizia.
  const M = { battiti: [], lunghe: [], salti: [], attivo: false, atteso: 20, da: 0,
              primoBattito: true, primoSalto: true };
  window.__misura = M;
  let ultimoBattito = performance.now();
  (function batti() {
    const ora = performance.now();
    const ritardo = (ora - ultimoBattito) - M.atteso;
    ultimoBattito = ora;
    if (M.attivo) {
      if (M.primoBattito) M.primoBattito = false;
      else if (ritardo > 0) M.battiti.push(ritardo);
    }
    setTimeout(batti, M.atteso);
  })();
  let ultimoF = performance.now();
  (function giro(t) {
    const d = t - ultimoF; ultimoF = t;
    if (M.attivo) {
      if (M.primoSalto) M.primoSalto = false;
      else M.salti.push(d);
    }
    requestAnimationFrame(giro);
  })(performance.now());
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries())
        if (M.attivo && e.startTime >= M.da) M.lunghe.push(Math.round(e.duration));
    }).observe({ entryTypes: ["longtask"] });
  } catch (e) { M.lunghe = null; }   // se il browser non le espone, si dice
});

// ---------------------------------------------------------------------------
// Accendere l'occhio, poi guardare, misurando.
// ---------------------------------------------------------------------------
// ⚠️ IL CONTROLLO. SENZA_OCCHIO=<secondi> tiene aperta la stessa finestra di
//    misura ma NON fa guardare l'occhio. Serve a separare due cose che si
//    confondono: «la pagina si ferma perche' l'occhio la blocca» e «la pagina
//    si ferma perche' sta facendo il suo lavoro». Senza questo confronto, un
//    blocco misurato durante lo sguardo verrebbe attribuito all'occhio per il
//    solo fatto di stargli accanto.
const esito = await p.evaluate(async ([quante, attesaOcchio, attesaSguardo, senzaOcchio]) => {
  const R = window.__veritasRiconosce, V = window.__veritasVista;
  const T = window.THREE, Rend = window.__veritasRenderer, radice = window.__veritasModelRoot;
  if (!R || !V || !T || !Rend || !radice)
    return { guaio: "manca " + (!R ? "riconosce" : !V ? "vista" : !T ? "three" : !Rend ? "renderer" : "modello") };

  // ⚠️ LE CONDIZIONI DELLA PROVA, prima di qualunque numero. Il 20/09 due giri
  //    identici sullo stesso codice hanno dato 91% e 9% di pagina ferma: la
  //    differenza non era il codice, era il CONTORNO. `veritas_fili.js` isola
  //    la pagina con un lavoratore di servizio, e un lavoratore di servizio
  //    prende il comando solo dalla VISITA DOPO quella che lo installa. Prima
  //    visita e visita di ritorno sono due macchine diverse, e un confronto
  //    che le mescola non misura niente.
  const contorno = {
    isolata: !!self.crossOriginIsolated,
    processori: navigator.hardwareConcurrency || null,
    lavoratoreDiServizio: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
  };

  const t0 = performance.now();
  const rileva = await R.occhioLocale({ attesaAccensione: attesaOcchio, attesaSguardo });
  const accensione = Math.round(performance.now() - t0);
  const st = R.stato();
  if (!rileva) return { guaio: "l'occhio non si e' acceso: " + st.perche, stato: st, accensione };

  const pianta = V.piantaDelPavimento(T, Rend, radice, { tutto: true });
  if (!pianta) return { guaio: "niente pianta", stato: st, accensione };
  const tela = R.piantaInTela(pianta);

  const voci = R.vocabolarioPer(window.__veritasProjectType || null, []);
  let parole = voci.map((v) => v.chiedi);
  if (quante > 0) parole = parole.slice(0, quante);

  const M = window.__misura;
  M.battiti.length = 0; M.salti.length = 0; if (M.lunghe) M.lunghe.length = 0;
  M.primoBattito = true; M.primoSalto = true;
  M.da = performance.now();
  M.attivo = true;
  const s0 = performance.now();
  let visto = null, guaio = null;
  if (senzaOcchio > 0) await new Promise((r) => setTimeout(r, senzaOcchio * 1000));
  else try { visto = await rileva(tela, parole); } catch (e) { guaio = String(e && e.message || e); }
  const durata = Math.round(performance.now() - s0);
  M.attivo = false;

  const somma = (a) => a.reduce((x, y) => x + y, 0);
  const sopra = (a, n) => a.filter((x) => x > n).length;
  return {
    stato: st, contorno, accensione, durata, guaio,
    parole: parole.length,
    larghezza: tela.width, altezza: tela.height,
    trovate: visto ? visto.length : 0,
    cosa: visto ? visto.slice(0, 12).map((x) => x.label + " " + (x.score * 100).toFixed(0) + "%") : [],
    battito: {
      quanti: M.battiti.length,
      peggiore: Math.round(Math.max(0, ...M.battiti)),
      sopra100: sopra(M.battiti, 100),
      sopra1000: sopra(M.battiti, 1000),
      occupatoTotale: Math.round(somma(M.battiti.filter((x) => x > 50))),   // vedi l'avviso sotto
    },
    lunghe: M.lunghe ? { quante: M.lunghe.length, peggiore: Math.max(0, ...M.lunghe),
                         totale: somma(M.lunghe) } : "non esposte da questo browser",
    fotogrammi: { quanti: M.salti.length, peggiore: Math.round(Math.max(0, ...M.salti)),
                  sopra100: sopra(M.salti, 100) },
  };
}, [QUANTE, ATTESA_OCCHIO, ATTESA_SGUARDO, Number(process.env.SENZA_OCCHIO || 0)]);

esito.costruzione = costruzione;
esito.sorgente = DAL_WS ? "workspace" : "pubblicata";
esito.console = righe.slice(-14);

console.log("");
if (esito.guaio) {
  console.log("GUAIO: " + esito.guaio);
} else {
  const d = esito.stato.dove || "(non dichiarato)";
  console.log("l'occhio guarda da: " + d + "   (" + esito.stato.device + "/" + esito.stato.dtype + ")");
  console.log("contorno: pagina " + (esito.contorno.isolata ? "ISOLATA" : "NON isolata")
    + " · lavoratore di servizio " + (esito.contorno.lavoratoreDiServizio ? "al comando" : "NON al comando")
    + " · " + esito.contorno.processori + " processori");
  console.log("acceso in " + (esito.accensione / 1000).toFixed(1) + " s · sguardo "
    + (esito.durata / 1000).toFixed(1) + " s su " + esito.parole + " parole, "
    + esito.larghezza + "x" + esito.altezza + " px");
  console.log("");
  // ⚠️ NON SI MISURA «QUANTO IL FILO E' OCCUPATO»: misurarlo cosi' da' il
  //    risultato al contrario. Col lavoratore la pagina torna a DISEGNARE, e
  //    ogni fotogramma e' lavoro: il filo risulta piu' occupato proprio perche'
  //    la pagina e' viva. Quello che conta e' se si FERMA, cioe' il blocco piu'
  //    lungo e quanti fotogrammi escono davvero.
  console.log("QUANTO SI E' FERMATA LA PAGINA, mentre l'occhio guardava:");
  console.log("  blocco peggiore   " + esito.battito.peggiore + " ms"
    + "   (attese oltre 1 s: " + esito.battito.sopra1000
    + " · oltre 100 ms: " + esito.battito.sopra100 + ")");
  console.log("  attivita lunga peggiore " + (typeof esito.lunghe === "string" ? esito.lunghe
    : esito.lunghe.peggiore + " ms  (" + esito.lunghe.quante + " sopra i 50 ms)"));
  console.log("  fotogrammi        " + esito.fotogrammi.quanti + " in "
    + (esito.durata / 1000).toFixed(1) + " s = "
    + (esito.fotogrammi.quanti / Math.max(0.001, esito.durata / 1000)).toFixed(1)
    + " al secondo · salto peggiore " + esito.fotogrammi.peggiore + " ms");
  console.log("");
  console.log("l'occhio ha trovato " + esito.trovate + " cose"
    + (esito.cosa.length ? ": " + esito.cosa.join(", ") : ""));
}
fs.writeFileSync(FUORI, JSON.stringify(esito, null, 1));
console.log("\nscritto in " + FUORI);
await ctx.close();
