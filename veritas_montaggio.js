// ===========================================================================
// VERITAS — IL MONTAGGIO. Occhio e cervello, accesi da soli sul modello vero.
// ===========================================================================
//
// A COSA SERVE
//
// `veritas_comprensione.js` esisteva dal 24/08 e non era mai stato acceso:
// nessun file lo chiamava. C'erano il motore e il volante, non erano montati.
// Questo file e' l'unico filo che li unisce, e non tocca niente d'altro.
//
// LA REGOLA CHE LO GOVERNA (Raffaella, 24/08/2026, in HANDOFF.md)
//
//   «Il riconoscimento non si chiede: avviene.»
//
// Quindi qui NON c'e' nessun pulsante. Appena il modello e' caricato l'anello
// parte da solo; l'utente corregge dopo. Un modello capito a meta' non e' un
// punto di partenza accettabile: la simulazione girerebbe su zone sbagliate e
// il report — che si vende — sarebbe sbagliato.
//
// COSA C'ERA GIA', E CHE NON SI RIFA'
//
//   window.__veritasGuarda        l'occhio che guarda UNA volta. Resta.
//   window.__veritasApplicaOcchi  il ponte che assegna i nomi alle tappe.
//                                 Conosce il vocabolario dei `type`, la
//                                 guardia «il nome del modello vince» e la
//                                 rete di unicita'. Si passa da li'.
//   window.__veritasCoseTrovate   i volumi MISURATI. Senza questi non si
//                                 nomina niente: la geometria viene prima.
//   window.__veritasVista         il disegnatore di piante dall'alto.
//
// COSA AGGIUNGE, e solo questo: il GIUDIZIO. L'occhio da solo non sa dire «non
// ho capito» — nomina quello che riesce e tace sul resto. L'anello lo chiede al
// cervello, che risponde in JSON verificabile e puo' far guardare ancora con
// parole nuove (max 3 giri). Se resta nel dubbio si ferma e scrive una domanda.
//
// ⚠️ NON SI INVENTA UN VERDETTO. Se il cervello non risponde — spento, non
//    raggiungibile, risposta illeggibile — l'esito e' `capito: false` con il
//    motivo scritto. Un «ho capito» di comodo sarebbe la stessa merce dei KPI
//    finti, e costerebbe uguale.
//
// ⚠️ NON BLOCCA NIENTE. `puoAgire()` scrive il suo verdetto in
//    `window.__veritasPuoSimulare` e lo annuncia, ma non impedisce la
//    simulazione: chiudere un cancello che prima era aperto e' un cambiamento
//    di comportamento, e va deciso da Raffaella, non da questo file.
//
// DOVE SI GUARDA IL RISULTATO
//   il pannello in basso a destra, che mostra la pianta VERA data in pasto
//   all'occhio. ⚠️ Se i nomi cadono tutti sul lato opposto dell'edificio, la
//   pianta e' specchiata: e' un difetto che produce nomi plausibili e nessun
//   errore, e nessun report puo' mostrarlo.
//
// MANOPOLE (facoltative, si mettono prima che il modello sia caricato)
//   window.__veritasCervelloUrl   indirizzo di /api/comprendi. Se non c'e', si
//                                 usa __veritasApiBase. In locale, con
//                                 veritas_brain_server.py acceso:
//                                 "http://localhost:8000/api/comprendi"
//   window.__veritasMontaggioAuto = false   per NON farlo partire da solo
//   window.__veritasMontaggioRitardo        millisecondi d'attesa (default 6500)
//
//   node --check veritas_montaggio.js
// ===========================================================================

import { comprendi, puoAgire, racconta } from "./veritas_comprensione.js";
import { anteprima } from "./veritas_anteprima.js";
import { occhioLocale, piantaInTela, stato } from "./veritas_riconosce.js";

// ⚠️ L'OCCHIO E' UNO SOLO, E NELLA PAGINA C'E' GIA'.
//
//    `index.html` porta dentro una copia di questo modulo, e quella copia ha il
//    suo occhio, il suo stato e — soprattutto — il suo scaricamento di OWLv2,
//    che pesa centinaia di MB. Importando il file si ottiene una SECONDA copia,
//    con variabili tutte sue: chiamare il suo `occhioLocale()` vuol dire far
//    scaricare il modello una seconda volta, e intanto `__veritasRiconosce.stato()`
//    continua a rispondere "spento" perche' guarda l'altra copia.
//
//    Successo il 25/08, primo giro vero: il ciclo restava appeso e lo stato
//    diceva spento senza motivo. Non era rotto, era un altro occhio.
//
//    Quindi si preferisce sempre quello gia' montato nella pagina. Le versioni
//    importate restano come rete: se un domani questo file girasse fuori da
//    `index.html` (nel banco di prova, in un'altra pagina), funziona lo stesso.

function occhioDellaPagina() {
  const R = typeof window !== "undefined" ? window.__veritasRiconosce : null;
  return {
    accendi: (R && R.occhioLocale) || occhioLocale,
    stato: (R && R.stato) || stato,
    inTela: (R && R.piantaInTela) || piantaInTela,
    condiviso: !!(R && R.occhioLocale),
  };
}

// L'occhio parte a 3 s dal caricamento (lo fa `__veritasGuarda`). L'anello
// arriva dopo: gli servono le cose misurate, la scala sistemata e la navmesh.
const RITARDO = 6500;

function log(m)  { try { console.log("[VERITAS montaggio] " + m); } catch (e) {} }
function dillo(m) {
  try { if (typeof window.__veritasAnnounce === "function") window.__veritasAnnounce(m); }
  catch (e) {}
}

// ---------------------------------------------------------------------------
// 1. Il cervello: una domanda, una risposta grezza
// ---------------------------------------------------------------------------
//
// Restituisce il TESTO cosi' com'e'. Chi lo giudica e' `leggiVerdetto()` dentro
// `veritas_comprensione.js`, ed e' giusto che stia da una parte sola.

// Due strade, e si sceglie da sola.
//
// ⚠️ LA PIATTAFORMA NON HA UN MODELLO SUO. Ogni cliente carica il proprio, e
//    niente qui dentro puo' presumere quale sia: nessun nome di file, nessuna
//    soglia tarata su un edificio in particolare. Vale anche per il cervello —
//    e' un servizio, non un pezzo del modello.
//
//   1. LM STUDIO, se c'e'. Il ponte `__veritasLLM` e' gia' configurato nella
//      pagina e la sua rotta e' quella standard di OpenAI, che LM Studio e
//      Ollama parlano entrambi. Non serve accendere nessun server nuovo. Se il
//      modello caricato vede (Qwen2-VL, LLaVA, MiniCPM-V) riceve anche la
//      pianta; se e' di soli testi, giudica sui nomi e lo dice.
//   2. `/api/comprendi`, se qualcuno lo indica in `__veritasCervelloUrl`.
//
// ⚠️ `__veritasApiBase` NON e' il cervello: e' il motore dei KPI su Render, e
//    /api/comprendi la' non esiste. Non lo si usa come ripiego, altrimenti
//    l'errore che torna e' un 404 che sembra un guasto del ciclo.

function indirizzoCervello() {
  if (window.__veritasCervelloUrl) return window.__veritasCervelloUrl;
  const L = window.__veritasLLM;
  if (L && L.cfg && L.cfg.url) return String(L.cfg.url).replace(/\/+$/, "") + "/chat/completions";
  return null;
}

function immagineBase64(x) {
  try {
    const tela = telaDa(x);
    return tela ? tela.toDataURL("image/png") : null;
  } catch (e) { return null; }
}

// I modelli che VEDONO si riconoscono dal nome. Non e' elegante, ma non c'e'
// modo di chiederlo: la rotta di OpenAI non dichiara se un modello ha gli
// occhi, e mandare un'immagine a un modello di soli testi non da' "non vedo" —
// da' un errore 400, oppure una risposta inventata, che e' peggio.
//
// Qwen2.5 7B Instruct NON vede. Qwen2-VL si'. Un carattere di differenza nel
// nome, due comportamenti opposti.
const NOMI_CHE_VEDONO = /(^|[-_.\s\/:])(vl|vision|llava|minicpm-?v|moondream|pixtral|internvl|gemma-?3|smolvlm|idefics)([-_.\s\/:]|$)/i;

function modelloVede(nome) {
  if (typeof window.__veritasCervelloVede === "boolean") return window.__veritasCervelloVede;
  return NOMI_CHE_VEDONO.test(String(nome || ""));
}

// QUAL E' IL MODELLO ACCESO? Glielo si chiede.
//
// ⚠️ `cfg.model` vale spesso "local-model", che e' un segnaposto e non il nome
//    di niente. Con il caricamento a richiesta acceso, LM Studio cerca un
//    modello che si chiami cosi' e non lo trova. Peggio: il nome vero e'
//    l'unico indizio che dice se il modello ha gli occhi, quindi un segnaposto
//    fa passare per cieco un modello che vede.
//
// La rotta /models elenca quello che c'e' davvero. Se fra questi c'e' un
// modello che vede, si preferisce quello: la pianta e' il motivo per cui si
// guarda. Si chiede una volta sola e si tiene da parte.

let modelloScoperto = null;

async function nomeModello() {
  const L = window.__veritasLLM;
  const dichiarato = L && L.cfg && L.cfg.model;
  if (dichiarato && dichiarato !== "local-model") return dichiarato;
  if (modelloScoperto) return modelloScoperto;
  try {
    const base = String(L.cfg.url).replace(/\/+$/, "");
    const r = await fetch(base + "/models");
    if (!r.ok) throw new Error("HTTP " + r.status);
    const d = await r.json();
    const nomi = (d && d.data ? d.data : []).map((m) => m.id).filter(Boolean);
    if (!nomi.length) throw new Error("nessun modello caricato in LM Studio");
    modelloScoperto = nomi.find(modelloVede) || nomi[0];
    log("modello acceso: " + modelloScoperto +
        (modelloVede(modelloScoperto) ? " — vede la pianta" : " — NON vede: giudica sui soli nomi"));
    return modelloScoperto;
  } catch (e) {
    // Meglio provare col segnaposto che non provare: se sbaglia, lo dice.
    return dichiarato || "local-model";
  }
}

// Strada 1 — un modello qualunque che parli la rotta di OpenAI.
async function cervelloLocale(domanda, extra = {}) {
  const L = window.__veritasLLM;
  const url = String(L.cfg.url).replace(/\/+$/, "") + "/chat/completions";
  const modello = await nomeModello();
  const vede = modelloVede(modello);
  const figura = vede ? immagineBase64(extra.immagine) : null;

  // ⚠️ La figura va SOLO a chi ha gli occhi. A tutti gli altri si manda il
  //    testo e basta: giudicheranno sui nomi che l'occhio ha raccontato, che e'
  //    meno ma e' vero. Forzabile con window.__veritasCervelloVede = true/false.
  const contenuto = figura
    ? [{ type: "text", text: domanda },
       { type: "image_url", image_url: { url: figura } }]
    : domanda;

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modello,
      temperature: 0,   // stessa pianta, stesso verdetto: due giudizi diversi
      max_tokens: 700,  // sulla stessa scena non sono utilizzabili
      messages: [{ role: "user", content: contenuto }],
    }),
  });
  if (!r.ok) throw new Error("il modello locale ha risposto " + r.status +
    " (LM Studio acceso su " + L.cfg.url + "?)");
  const d = await r.json();
  return (d && d.choices && d.choices[0] && d.choices[0].message &&
          d.choices[0].message.content) || "";
}

// Strada 2 — veritas_brain_server.py, o qualunque cosa risponda a quel patto.
async function cervelloRemoto(domanda, extra = {}) {
  const url = window.__veritasCervelloUrl;
  const figura = immagineBase64(extra.immagine);
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      domanda,
      image_data: figura ? figura.split(",")[1] : null,
      giro: extra.giro || 1,
    }),
  });
  if (!r.ok) {
    let dettaglio = "";
    try { dettaglio = (await r.json()).detail || ""; } catch (e) {}
    throw new Error("il cervello ha risposto " + r.status + (dettaglio ? " — " + dettaglio : ""));
  }
  const d = await r.json();
  return d && d.verdetto ? d.verdetto : "";
}

async function cervello(domanda, extra = {}) {
  if (window.__veritasCervelloUrl) return cervelloRemoto(domanda, extra);
  if (window.__veritasLLM && window.__veritasLLM.cfg && window.__veritasLLM.cfg.url)
    return cervelloLocale(domanda, extra);
  throw new Error("nessun cervello configurato: accendi LM Studio, oppure indica " +
                  "window.__veritasCervelloUrl");
}

// ---------------------------------------------------------------------------
// 2. Il raccordo delle due piante
// ---------------------------------------------------------------------------
//
// ⚠️ Il pannello vuole la pianta GREZZA (ha i pixel dentro, e se la disegna da
//    solo); il rilevatore vuole un'IMMAGINE. Sono due cose diverse e nessuna
//    delle due va cambiata: la conversione sta qui, in mezzo.

function telaDa(x) {
  if (!x) return null;
  if (x.pixel) return occhioDellaPagina().inTela(x, document);  // grezza -> tela
  return x;                                                     // gia' un'immagine
}

// ---------------------------------------------------------------------------
// 3. L'anello
// ---------------------------------------------------------------------------

let inCorso = false;

window.__veritasComprendi = async function (opz = {}) {
  if (inCorso) return { ok: false, perche: "sto gia' cercando di capire" };
  inCorso = true;
  try {
    const THREE  = window.THREE;
    const vista  = window.__veritasVista;
    const rend   = window.__veritasRenderer;
    const radice = window.__veritasModelRoot;
    const trovate = window.__veritasCoseTrovate;

    if (!THREE || !vista || !rend || !radice)
      return { ok: false, perche: "manca la scena o il disegnatore di piante" };
    if (!trovate || !trovate.posti || !trovate.posti.length)
      return { ok: false, perche: "non e' stato ancora misurato nessun volume" };

    const pianta = vista.piantaDelPavimento(THREE, rend, radice, opz.pianta || {});
    if (!pianta) return { ok: false, perche: "non sono riuscito a disegnare la pianta" };

    const O = occhioDellaPagina();
    if (!opz.rileva)
      log("accendo l'occhio" + (O.condiviso ? " gia' montato nella pagina" : " (copia del modulo)") +
          " — la prima volta scarica il modello di visione, puo' volerci qualche minuto");
    const rilevatore = opz.rileva || await O.accendi(opz);
    if (!rilevatore)
      return { ok: false, perche: O.stato().perche || "l'occhio non si e' acceso" };
    log("occhio pronto (" + (O.stato().device || "?") + ")");

    const pannello = anteprima(document);

    const ctx = pannello.collega({
      posti: trovate.posti,
      pianta,                    // grezza: la vuole cosi' il pannello
      inquadratura: pianta,      // stessa cosa: porta dentro la proiezione
      dominio: opz.dominio || window.__veritasProjectType || null,
      rileva: (immagine, parole) => rilevatore(telaDa(immagine), parole),
      cervello: opz.cervello || cervello,
    });

    const c = await comprendi(ctx);
    pannello.esito(c);
    window.__veritasComprensione = c;
    window.__veritasPuoSimulare = puoAgire(c);

    if (c.posti) applicaNomi(c.posti);

    log(racconta(c));
    dillo(racconta(c));
    if (c.domandaUmana) dillo(c.domandaUmana);
    return c;
  } catch (e) {
    const perche = (e && e.message) || String(e);
    log("non ho potuto capire: " + perche);
    window.__veritasComprensione = { ok: false, capito: false, perche };
    window.__veritasPuoSimulare = false;
    return window.__veritasComprensione;
  } finally {
    inCorso = false;
  }
};

// ---------------------------------------------------------------------------
// 4. I nomi arrivano alle tappe — dal ponte che esiste gia'
// ---------------------------------------------------------------------------
//
// ⚠️ Stesso identico percorso di `__veritasGuarda`. Scrivere qui un secondo
//    meccanismo di assegnazione vorrebbe dire due meccanismi che divergono alla
//    prima modifica: e' l'errore che questo progetto ha gia' pagato due volte.

function applicaNomi(posti) {
  if (typeof window.__veritasApplicaOcchi !== "function") return 0;
  const nodi = window.__veritasGetNodes ? window.__veritasGetNodes() : [];
  const assegnate = [];
  nodi.forEach(function (n, i) {
    if (!n.posto) return;
    const p = posti.find((q) =>
      Math.abs(q.centro[0] - n.posto.centro[0]) < 1e-9 &&
      Math.abs(q.centro[2] - n.posto.centro[2]) < 1e-9);
    if (!p || !p.nome || !p.funzione) return;
    const t = window.__veritasOcchi && window.__veritasOcchi.tipoDiFunzione
      ? window.__veritasOcchi.tipoDiFunzione(p.funzione) : null;
    if (!t) return;
    assegnate.push({
      indice: i, funzione: p.funzione, tipo: t.tipo, fuori: t.fuori,
      sicurezza: p.fiducia >= 0.35 ? "alta" : (p.fiducia >= 0.2 ? "media" : "bassa"),
      nome: p.nome,
    });
  });
  if (!assegnate.length) return 0;
  const n = window.__veritasApplicaOcchi({ assegnate }, nodi);
  log(n + " tappe rinominate dopo la comprensione");
  return n;
}

// ---------------------------------------------------------------------------
// 5. La partenza: da sola, come dice la regola
// ---------------------------------------------------------------------------
//
// Ci si accoda a chi c'era prima senza sostituirlo: se un giorno questo file
// sparisce, tutto il resto continua a funzionare identico.

// ⚠️ NON CI SI FIDA DI UN SOLO SEGNALE.
//
//    `__veritasOnModelLoaded` viene chiamato dal caricamento automatico, ma
//    NON da chi trascina un file nella finestra — ed e' proprio cosi' che
//    lavora un cliente. Il 25/08 il ciclo non e' partito per questo: modello
//    caricato, 23 volumi misurati, e nessuno che dicesse «ci siamo».
//
//    Quindi si guarda la cosa vera invece del messaggero: `__veritasModelRoot`.
//    Quando cambia, e' un modello nuovo, comunque sia entrato. Il segnale
//    resta agganciato lo stesso — due strade per la stessa porta, e chi arriva
//    secondo trova gia' fatto.

let ultimaRadice = null;
let attesaInCorso = null;

function modelloNuovo(radice) {
  if (!radice || radice === ultimaRadice) return;
  ultimaRadice = radice;

  if (window.__veritasMontaggioAuto === false) {
    log("partenza automatica disattivata — window.__veritasComprendi()");
    return;
  }
  // Se arrivano due segnali per lo stesso modello, il secondo non raddoppia
  // il lavoro: rimanda soltanto l'inizio.
  if (attesaInCorso) clearTimeout(attesaInCorso);
  const attesa = window.__veritasMontaggioRitardo || RITARDO;
  log("modello nuovo: comincio a capirlo fra " + Math.round(attesa / 1000) + " s");
  attesaInCorso = setTimeout(function () {
    attesaInCorso = null;
    window.__veritasComprendi().catch(function (e) {
      console.warn("[VERITAS montaggio] non ha capito:", (e && e.message) || e);
    });
  }, attesa);
}

// Strada A — il segnale, quando c'e'.
const precedente = window.__veritasOnModelLoaded;
window.__veritasOnModelLoaded = function (radice) {
  let out;
  try { out = precedente ? precedente.apply(this, arguments) : undefined; }
  catch (e) { console.error("[VERITAS montaggio] errore nel passo precedente:", e); }
  modelloNuovo(radice || window.__veritasModelRoot);
  return out;
};

// Strada B — la vedetta, per tutti gli altri modi di caricare.
//
// Un controllo al secondo non pesa niente e non dipende da come il file e'
// entrato: trascinato, scelto da un pannello, caricato da un progetto salvato.
setInterval(function () {
  try { modelloNuovo(window.__veritasModelRoot); } catch (e) {}
}, 1000);

export default { comprendi: window.__veritasComprendi };
