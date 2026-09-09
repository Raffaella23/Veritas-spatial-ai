// =============================================================================
// veritas_lessico.js — COME SI CHIAMA UN COMPORTAMENTO, IN QUESTO EDIFICIO
// =============================================================================
//
// Raffaella, 08/09/2026: *«ti avevo gia' detto che le poche parole erano
// assolutamente insufficienti»*.
//
// IL GUASTO. I nomi che finiscono sullo schermo — «Accettazione», «Controllo»,
// «Lounge», «Gate» — escono da `LESSICO_ZONE`, una tabella dentro `index.html`
// con **tre tipi soli**: aeroporto, museo, gaming. Su una scuola, un ospedale,
// una stazione, una chiesa, un tribunale, un centro commerciale, un teatro,
// una biblioteca — cioe' su quasi tutto — casca sul generico e chiama «Filtro»
// quello che un maestro chiamerebbe «portineria» e un medico «triage».
//
// ⛔ E NON SI RIPARA ALLUNGANDO LA TABELLA. Sarebbe (a) la regola 0-bis violata
//    per iscritto — vocabolario di tipologia dentro il codice — e (b) una lista
//    che non finisce mai: i tipi di edificio sono centinaia, e il giorno che
//    arriva un archivio notarile o una risaia manca lo stesso.
//
// ⚠️ E IL MANUALE NON PUO' DARLI. Le fonti caricate sono DIMENSIONALI — Fruin
//    per il corpo, il DM 236/1989 per le prescrizioni, Blondel per le scale:
//    dicono quanto e' largo un passaggio, non come si chiama in un ospedale.
//    Le raccolte che contengono le tipologie (il Neufert e simili) sono opere
//    protette e in un prodotto che si vende non si ricopiano. Non e' un limite
//    tecnico, e' una scelta gia' scritta nell'intestazione del manuale.
//
// ✅ COME SI FA INVECE. Il nome non si sa: **si chiede**, una volta sola per
//    tipo, e si tiene. Il cervello sa gia' cos'e' un ospedale; gli si dice
//    «questo e' un X: uno spazio dove <comportamento misurato> come lo chiama
//    chi ci lavora?» e la risposta e' SUA. Nel codice non entra nessuna parola
//    di nessuna tipologia — entra solo la DESCRIZIONE del comportamento, che e'
//    la stessa in un aeroporto e in un convento.
//
// Cosi' i tipi coperti non sono tre: sono tutti.
// =============================================================================

import { MANUALE } from "./veritas_manuale.js?v=2";

const CHIAVE = "veritas_lessico_v1";

// Le otto caselle da riempire. La chiave e' un COMPORTAMENTO, la descrizione
// non nomina nessun tipo di edificio, e le tre con lo spazio in fondo vengono
// numerate a valle («Gate 1», «Gate 2»).
const CASELLE = [
  { k: "origine",      numerata: false, che: "da dove entra la gente, la prima soglia dopo il fuori" },
  { k: "arrivo",       numerata: false, che: "lo spazio all'aperto da cui si arriva prima di entrare" },
  { k: "accoglienza",  numerata: false, che: "dove si viene ricevuti o registrati da qualcuno dall'altra parte di un banco alto circa un metro" },
  { k: "filtro",       numerata: false, che: "un passaggio obbligato e stretto che seleziona o rallenta chi lo attraversa, con una coda a monte" },
  { k: "sosta",        numerata: false, che: "dove la gente si ferma e aspetta, con posti a sedere e senza flusso che la attraversa" },
  { k: "destinazione", numerata: true,  che: "il punto in cui il percorso finisce e si esce dal sistema" },
  { k: "passaggio",    numerata: true,  che: "uno spazio lungo e stretto che si attraversa soltanto" },
  { k: "esterno",      numerata: true,  che: "un'area all'aperto, senza copertura sopra" },
];

function leggiCache() {
  try { return JSON.parse(localStorage.getItem(CHIAVE) || "{}"); } catch (e) { return {}; }
}
function scriviCache(c) {
  try { localStorage.setItem(CHIAVE, JSON.stringify(c)); } catch (e) {}
}

function nota(m) {
  try { if (typeof console !== "undefined") console.log("[VERITAS lessico] " + m); } catch (e) {}
}

/**
 * Il lessico che si ha ADESSO, senza chiedere niente a nessuno.
 * Torna `null` se per quel tipo non e' ancora stato imparato: chi chiama
 * ricade sulla propria tabella, che e' quello che faceva prima.
 */
export function ora(tipo) {
  if (!tipo) return null;
  const c = leggiCache();
  return c[String(tipo).toLowerCase()] || null;
}

/** Quali tipi sono stati imparati finora. Serve alla chat e al referto. */
export function imparati() {
  return Object.keys(leggiCache());
}

/** Si dimentica tutto: serve quando il cervello cambia o ha risposto male. */
export function dimentica(tipo) {
  const c = leggiCache();
  if (tipo) delete c[String(tipo).toLowerCase()]; else return scriviCache({});
  scriviCache(c);
}

function domanda(tipo) {
  const voci = CASELLE.map((c, i) => (i + 1) + ". `" + c.k + "` — " + c.che).join("\n");
  return [
    "Questo edificio e' un " + tipo + ".",
    "",
    "Ti do OTTO descrizioni di spazi. Sono descrizioni di COMPORTAMENTO, non nomi:",
    "dicono che cosa ci succede dentro, non come si chiamano.",
    "",
    voci,
    "",
    "Per ognuna dimmi come la chiamerebbe **chi lavora in un " + tipo + "**:",
    "il termine corrente del mestiere, in italiano, una o due parole, al singolare.",
    "",
    "REGOLE FERREE:",
    "1. Rispondi SOLO con JSON, senza testo prima o dopo, senza ```:",
    '   {"origine": "...", "arrivo": "...", "accoglienza": "...", "filtro": "...",',
    '    "sosta": "...", "destinazione": "...", "passaggio": "...", "esterno": "..."}',
    "2. Se in un " + tipo + " uno di questi spazi non esiste, mettici comunque il",
    "   nome piu' onesto e generico che useresti: non lasciare vuoto e non inventare.",
    "3. Nessun nome puo' essere uguale a un altro.",
  ].join("\n");
}

function pulisci(risposta) {
  const L = (typeof window !== "undefined" && window.__veritasLLM) || {};
  let o = null;
  try { o = typeof L.estraiJSON === "function" ? L.estraiJSON(risposta) : JSON.parse(risposta); }
  catch (e) { o = null; }
  if (!o || typeof o !== "object") return null;
  const fuori = {}; const visti = new Set();
  for (const c of CASELLE) {
    let v = o[c.k];
    if (typeof v !== "string") return null;
    v = v.trim().replace(/^["'\s]+|["'\s.]+$/g, "");
    // Una parola sola ripetuta su piu' caselle e' il difetto classico dei
    // modelli piccoli: meglio ricadere sulla tabella che mostrare otto zone
    // chiamate uguale.
    if (!v || v.length > 28 || visti.has(v.toLowerCase())) return null;
    visti.add(v.toLowerCase());
    fuori[c.k] = c.numerata ? v + " " : v;
  }
  return fuori;
}

/**
 * Impara il lessico di un tipo. Una volta sola: poi sta nella cache del
 * browser e non si chiede piu'.
 */
export async function impara(tipo, opzioni = {}) {
  if (!tipo) return null;
  const chiave = String(tipo).toLowerCase();
  const cache = leggiCache();
  if (cache[chiave] && !opzioni.rifai) return cache[chiave];

  const L = (typeof window !== "undefined" && window.__veritasLLM) || null;
  const url = L && L.cfg && L.cfg.url;
  if (!url) { nota("nessun cervello collegato: resta la tabella di prima"); return null; }

  // ⚠️ IL NOME DEL MODELLO E' QUELLO ACCESO, NON IL SEGNAPOSTO — 09/09/2026.
  //    Sul log di Raffaella questa chiamata tornava sempre **400**, e il
  //    lessico ricadeva sulla tabella di tre tipi: cioe' la funzione nata
  //    l'08/09 per coprire scuola, ospedale, stazione e chiesa non ha mai
  //    parlato col cervello nemmeno una volta, e nessuno se n'era accorto
  //    perche' il ripiego funziona ed e' silenzioso.
  //    Il motivo era una parola: `L.cfg.model` vale «local-model», che e' il
  //    segnaposto scritto nella configurazione. Il modello davvero acceso si
  //    chiamava `qwen2.5-vl-7b-instruct`, e LM Studio rifiuta un nome che non
  //    ha. Il nome vero lo scopre gia' il montaggio e lo lascia su window; se
  //    non c'e' ancora, si chiede alla stessa rotta che usa lui.
  const base = url.replace(/\/+$/, "");
  let nome = (typeof window !== "undefined" && window.__veritasModelloCervello) || null;
  if (!nome) {
    try {
      const e = await fetch(base + "/models");
      const d = e.ok ? await e.json() : null;
      nome = ((d && d.data ? d.data : []).map((m) => m.id).filter(Boolean))[0] || null;
      if (nome) { try { window.__veritasModelloCervello = nome; } catch (x) {} }
    } catch (x) { /* si prova col segnaposto: se sbaglia, lo dice */ }
  }
  if (!nome) nome = (L.cfg && L.cfg.model) || "local-model";

  try {
    const r = await fetch(base + "/chat/completions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: nome,
        temperature: 0.1,
        messages: [{ role: "user", content: domanda(tipo) }],
      }),
    });
    if (!r.ok) { nota("il cervello ha risposto " + r.status + ": resta la tabella di prima"); return null; }
    const j = await r.json();
    const testo = (((j.choices || [])[0] || {}).message || {}).content || "";
    const mappa = pulisci(testo);
    if (!mappa) { nota("risposta non usabile per «" + tipo + "»: resta la tabella di prima"); return null; }
    cache[chiave] = mappa;
    scriviCache(cache);
    nota("imparato il lessico di «" + tipo + "»: "
      + CASELLE.map((c) => c.k + " = " + mappa[c.k].trim()).join(" · "));
    return mappa;
  } catch (e) {
    nota("non ho potuto chiedere: " + ((e && e.message) || e) + " — resta la tabella di prima");
    return null;
  }
}

if (typeof window !== "undefined") {
  window.__veritasLessico = { ora, impara, imparati, dimentica, CASELLE };
  // Si impara APPENA si sa che tipo di edificio e', non quando serve: la
  // domanda al cervello costa qualche secondo, e quando l'analisi chiede il
  // nome dev'essere gia' li'. Se il tipo arriva dopo, si riprova.
  const avvia = () => {
    const t = window.__veritasProjectType;
    if (t && !ora(t)) impara(t);
  };
  avvia();
  let tentativi = 0;
  const orologio = setInterval(() => {
    if (++tentativi > 40) return clearInterval(orologio);   // due minuti e basta
    const t = window.__veritasProjectType;
    if (!t) return;
    clearInterval(orologio);
    if (!ora(t)) impara(t);
  }, 3000);
  nota("pronto — tipi gia' imparati: " + (imparati().join(", ") || "nessuno"));
}
