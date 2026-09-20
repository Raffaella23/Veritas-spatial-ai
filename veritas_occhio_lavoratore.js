// ===========================================================================
// veritas_occhio_lavoratore.js — L'OCCHIO IN UNA STANZA SUA
// ===========================================================================
//
// Questo file non gira nella pagina: gira in un Web Worker, cioe' in un filo
// di esecuzione separato, con la sua memoria e il suo tempo. Dentro ci sta
// TUTTO l'occhio — la libreria, il modello, la preparazione dell'immagine, la
// lettura del risultato — e verso la pagina passano solo due cose: i pixel che
// deve guardare e l'elenco di quello che ha visto.
//
// ⚠️ PERCHE' NON BASTAVA IL PROXY DI ONNX. In `veritas_riconosce.js` c'era gia'
//    `env.backends.onnx.wasm.proxy = true`, e quella riga sposta davvero
//    qualcosa: sposta il MOTORE, cioe' la moltiplicazione di matrici. Ma
//    transformers.js fa sul filo di chi chiama tutto il resto, e il resto non
//    e' poco:
//
//      - preparare l'immagine: OWLv2 vuole 960x960, quindi si ridimensiona e
//        si normalizza — quasi tre milioni di pixel, per tre canali, in JS;
//      - spezzare in simboli le parole da cercare (fino a 158);
//      - leggere il risultato: 3.600 riquadri per OGNI parola chiesta, ognuno
//        con la sua sigmoide, e poi l'ordinamento. Con 158 parole sono piu' di
//        mezzo milione di conti, tutti in una volta sola.
//
//    Sono esattamente i blocchi che si vedevano nel banco il 18/09 (§6.7 del
//    HANDOFF): la pagina si fermava a tratti, e si fermava anche il velo.
//    Il motore era gia' di la'; a bloccare era il contorno.
//
// ⚠️ QUI IL PROXY SI SPEGNE, e non e' una svista. La ragione per cui era stato
//    acceso il 04/09 — l'occhio non trovava i 255,5 MB del motore ONNX con la
//    scena 3D gia' caricata — vale identica per questo lavoratore: anche lui ha
//    la sua memoria, separata da quella della pagina. Tenere il proxy ACCESO
//    qui dentro vorrebbe dire aprire un secondo lavoratore dentro il primo, e
//    una seconda copia del motore in WebAssembly: la stanza si otterrebbe due
//    volte e si pagherebbe due volte.
//
// ⚠️ LA LIBRERIA ARRIVA PER INDIRIZZO, non per nome. Le mappe di importazione
//    (`<script type="importmap">`) NON valgono dentro un lavoratore: un
//    `import "@huggingface/transformers"` qui dentro non si risolve e il
//    lavoratore muore prima di dire perche'. L'indirizzo per esteso lo manda la
//    pagina nel messaggio «accendi», cosi' resta una sola fonte (l'importmap di
//    `index.html`) e il banco puo' cambiarlo senza toccare questo file.
//
// Protocollo — dalla pagina:
//   { tipo:"accendi", libreria, modello, tentativi, soglia, fili }
//   { tipo:"guarda",  id, dati:ArrayBuffer, larghezza, altezza, parole, soglia }
// verso la pagina:
//   { tipo:"pronto", device, dtype }      { tipo:"spento", perche }
//   { tipo:"visto",  id, esito }          { tipo:"guaio",  id, perche }
//
//   node --check veritas_occhio_lavoratore.js
// ===========================================================================

let RawImage = null;      // il costruttore d'immagini della libreria
let rileva = null;        // il rilevatore vero, una volta acceso
let sogliaDiCasa = 0.1;   // la soglia decisa dalla pagina

// ⚠️ UNA COSA ALLA VOLTA, IN FILA. I messaggi arrivano quando vogliono, e
//    `onmessage` e' asincrono: senza questa fila due sguardi potrebbero
//    entrare insieme nello stesso rilevatore. Il lavoratore ha un filo solo —
//    farne due non lo renderebbe piu' veloce, lo renderebbe imprevedibile.
let fila = Promise.resolve();
function inFila(lavoro) { fila = fila.then(lavoro, lavoro); return fila; }

self.onmessage = function (e) {
  const m = e.data || {};
  if (m.tipo === "accendi") inFila(() => accendi(m));
  else if (m.tipo === "guarda") inFila(() => guarda(m));
};

async function accendi(m) {
  let pipeline, env;
  try {
    // Importazione dinamica: l'indirizzo e' una variabile, e un `import`
    // statico non accetta variabili.
    ({ pipeline, env, RawImage } = await import(m.libreria));
  } catch (err) {
    self.postMessage({ tipo: "spento", perche: "libreria non caricata nel lavoratore: " + messaggio(err) });
    return;
  }

  try {
    if (env && env.backends && env.backends.onnx && env.backends.onnx.wasm) {
      // Vedi l'avviso in testa: la stanza separata e' questo lavoratore.
      env.backends.onnx.wasm.proxy = false;

      // ⚠️ I FILI. Misurato il 04/09/2026: un filo solo 201,3 s su 16 parole,
      //    otto fili 63,4 s. Il motore puo' usarli solo se la pagina e'
      //    `crossOriginIsolated`, e un lavoratore eredita l'isolamento di chi
      //    lo apre — quindi qui la condizione si puo' leggere com'e'.
      //    Otto e non dodici: oltre gli otto il guadagno si appiattisce e la
      //    macchina resta senza fiato per la scena 3D e la fisica.
      if (self.crossOriginIsolated)
        env.backends.onnx.wasm.numThreads =
          Math.max(1, Math.min(8, m.fili || (self.navigator && self.navigator.hardwareConcurrency) || 2));
    }
  } catch (err) { /* se la libreria cambia forma non ci si ferma per questo */ }

  // La scala dei formati la decide la pagina e arriva gia' fatta: qui non si
  // duplica, perche' due liste — una corretta e una no — questo progetto le ha
  // gia' pagate (vedi il commento in `veritas_riconosce.js`).
  const tentativi = (m.tentativi && m.tentativi.length) ? m.tentativi
    : [{ device: "wasm", dtype: "q8" }, { device: "wasm", dtype: "fp32" }];

  let detector = null, usato = null, ultimo = null;
  for (const t of tentativi) {
    try { detector = await pipeline("zero-shot-object-detection", m.modello, t); usato = t; break; }
    catch (err) { ultimo = err; }
  }
  if (!detector) {
    self.postMessage({ tipo: "spento", perche: "modello non caricato nel lavoratore: " + messaggio(ultimo) });
    return;
  }

  if (m.soglia != null) sogliaDiCasa = m.soglia;
  rileva = detector;
  self.postMessage({ tipo: "pronto", device: usato.device, dtype: usato.dtype });
}

async function guarda(m) {
  if (!rileva) { self.postMessage({ tipo: "guaio", id: m.id, perche: "l'occhio non e' acceso" }); return; }
  try {
    // ⚠️ SI COSTRUISCE L'IMMAGINE A MANO, e viene identica a prima. Quando la
    //    pagina passava una tela, la libreria faceva `RawImage.fromCanvas`, che
    //    non fa altro che leggerne i pixel RGBA e chiamare questo stesso
    //    costruttore con quattro canali. Stessi pixel, stessa immagine: il
    //    trasloco non cambia quello che l'occhio vede, solo dove lo guarda.
    const immagine = new RawImage(new Uint8ClampedArray(m.dati), m.larghezza, m.altezza, 4);
    const fuori = await rileva(immagine, m.parole, {
      threshold: m.soglia != null ? m.soglia : sogliaDiCasa,
    });
    // Le rilevazioni sono gia' numeri e stringhe: passano per copia senza
    // bisogno di trasferire niente.
    self.postMessage({ tipo: "visto", id: m.id, esito: Array.isArray(fuori) ? fuori : [] });
  } catch (err) {
    self.postMessage({ tipo: "guaio", id: m.id, perche: messaggio(err) });
  }
}

// Un errore di ONNX sa essere un numero nudo (267935216 = 255,5 MB, il tetto
// di memoria del motore). Va detto com'e': un "[object Object]" al suo posto
// costerebbe mezza giornata di diagnosi.
function messaggio(e) {
  if (e == null) return "motivo non detto";
  if (typeof e === "string" || typeof e === "number") return String(e);
  return e.message ? e.message : String(e);
}
