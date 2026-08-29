import "./veritas_manuale.js";
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
  // Qui invece la prudenza serve: un modello di soli testi che riceve
  // un'immagine da' 400, e il giro si fermerebbe. Se pero' l'occhio di riserva
  // ha gia' dimostrato che quel modello vede, glielo si manda comunque.
  const provato = String(window.__veritasOcchioSorgente || "").startsWith("vlm:");
  const vede = modelloVede(modello) || provato;
  // ⚠️ PIU' DI UN'IMMAGINE. Una pianta dall'alto non basta: dall'alto un banco,
  //    una fila di sedute e un muretto sono lo stesso rettangolo grigio, perche'
  //    la differenza sta nell'altezza. Gli scorci in prospettiva la mostrano, e
  //    vanno mandati INSIEME alla pianta, nello stesso messaggio: e' guardare lo
  //    stesso posto da piu' parti, non guardare posti diversi.
  const daGuardare = (Array.isArray(extra.immagini) && extra.immagini.length)
    ? extra.immagini : [extra.immagine];
  const figure = vede ? daGuardare.map(immagineBase64).filter(Boolean) : [];

  // ⚠️ Le figure vanno SOLO a chi ha gli occhi. A tutti gli altri si manda il
  //    testo e basta: giudicheranno sui nomi che l'occhio ha raccontato, che e'
  //    meno ma e' vero. Forzabile con window.__veritasCervelloVede = true/false.
  const contenuto = figure.length
    ? [{ type: "text", text: domanda },
       ...figure.map((f) => ({ type: "image_url", image_url: { url: f } }))]
    : domanda;

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modello,
      temperature: 0,   // stessa pianta, stesso verdetto: due giudizi diversi
      // Lo studio e l'assegnazione rispondono un JSON lungo (una voce per
      // volume): con 700 gettoni il JSON si tronca a meta' e diventa illeggibile.
      max_tokens: extra.passo ? 2500 : 700,
      messages: [{ role: "user", content: contenuto }],
    }),
  });
  if (!r.ok) throw new Error("il modello locale ha risposto " + r.status +
    " (LM Studio acceso su " + L.cfg.url + "?)");
  const d = await r.json();
  const scelta = d && d.choices && d.choices[0];
  const testo = (scelta && scelta.message && scelta.message.content) || "";

  // ⚠️ NON SI BUTTANO VIA `finish_reason` E `usage`.
  //
  // Il 27/08 e' servita una sonda incollata a mano in console per sapere una
  // cosa che questa funzione aveva gia' in mano: se la risposta si era fermata
  // perche' TRONCATA (`length`, manca spazio nella finestra) o perche'
  // MALFORMATA (`stop`, sbaglia la sintassi). Sono due guasti diversi con due
  // riparazioni opposte, e senza questo dato si ripara quello sbagliato: la
  // diagnosi del 26/08 diceva «alza il tetto di uscita» ed era falsa, il tetto
  // era gia' 2500 e il muro era la finestra di contesto a 8.192.
  //
  // Ora resta qui, e la sonda non serve piu'.
  try {
    const rec = {
      passo: extra.passo || "—",
      motivo_stop: scelta && scelta.finish_reason,
      gettoni_chiesti: extra.passo ? 2500 : 700,
      gettoni_entrata: d && d.usage && d.usage.prompt_tokens,
      gettoni_uscita: d && d.usage && d.usage.completion_tokens,
      caratteri: testo.length,
      quando: new Date().toISOString(),
    };
    const storia = window.__veritasChiusura || (window.__veritasChiusura = []);
    storia.push(rec);
    if (storia.length > 200) storia.splice(0, storia.length - 200);
    const allarme = rec.motivo_stop === "length";
    console[allarme ? "warn" : "log"](
      "[VERITAS cervello] " + storia.length + " " + rec.passo
      + " — " + rec.motivo_stop + (allarme ? "  ⚠️ TRONCATA: manca spazio nella finestra, non e' un JSON rotto" : "")
      + " | entrata " + rec.gettoni_entrata + " · uscita " + rec.gettoni_uscita
      + " · " + rec.caratteri + " caratteri");
  } catch (e) { /* la diagnostica non fa mai cadere il giro */ }

  return testo;
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

// Il lato piu' lungo di un'immagine che parte verso il modello che vede.
//
// ⚠️ MISURATO IL 29/08/2026, nei log di LM Studio. La pianta non ha una
//    dimensione fissa: nasce dall'ingombro del modello. Dopo la correzione
//    automatica di scala (7,3x su airport_foot_traffic.glb, confermata a occhio
//    da Raffaella) usciva larga 2048 px, mentre i sette scorci erano a 768 e non
//    hanno mai dato problemi. Nel log del server si leggeva
//    «Prompt processing progress: 7,4%» seguito da «Client disconnected» e da
//    una risposta con "content": "" — il modello stava ancora LEGGENDO la
//    figura. E' la pianta, da sola, a mettere in ginocchio la telefonata.
//
// ⚠️ PERCHE' NON FALSA LE MISURE. I riquadri che tornano vengono divisi per la
//    larghezza e l'altezza DELLA TELA MANDATA (in `unGiro`: `n(b.xmin, W)` con
//    `W = tela.width`), quindi diventano frazioni fra 0 e 1, che non dipendono
//    dalla risoluzione. La conversione in metri resta a `scatolaInMondo`, che
//    legge l'inquadratura del mondo e qui non si tocca.
//
//    Per lo stesso motivo si rimpicciolisce QUI, in un posto solo: chi chiede
//    la larghezza la chiede alla tela, e la trova gia' giusta.
const LATO_MASSIMO = 1024;

function rimpicciolisci(tela) {
  try {
    if (!tela || !tela.width || !tela.height) return tela;
    const max = window.__veritasLatoMassimo || LATO_MASSIMO;
    const lato = Math.max(tela.width, tela.height);
    if (lato <= max) return tela;
    const f = max / lato;
    const w = Math.max(1, Math.round(tela.width * f));
    const h = Math.max(1, Math.round(tela.height * f));
    const piccola = document.createElement("canvas");
    piccola.width = w; piccola.height = h;
    const ctx = piccola.getContext("2d");
    if (!ctx) return tela;
    ctx.imageSmoothingEnabled = true;
    if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "high";
    ctx.drawImage(tela, 0, 0, w, h);
    log("figura rimpicciolita da " + tela.width + "x" + tela.height + " a " + w + "x" + h);
    return piccola;
  } catch (e) { return tela; }
}

function telaDa(x) {
  if (!x) return null;
  if (x.pixel) return rimpicciolisci(occhioDellaPagina().inTela(x, document));  // grezza -> tela
  return rimpicciolisci(x);                                     // gia' un'immagine
}

// ---------------------------------------------------------------------------
// 2-bis. Accendere l'occhio: piu' di due strade
// ---------------------------------------------------------------------------
//
// ⚠️ MISURATO IL 25/08, primo giro su un modello vero. L'occhio restava spento
//    con: «Can't create a session ... type of node with name '/class_head/Cast'
//    is not set». Non e' la rete e non e' la lentezza: il file compresso del
//    modello non si APRE su quella combinazione di scheda video e formato.
//
//    Le due prove previste (webgpu/q4f16, wasm/q8) fallivano tutte e due e il
//    motivo restava una riga sola, l'ultima. Da fuori sembrava "spento" senza
//    causa — la peggiore diagnosi possibile, perche' non dice dove guardare.
//
//    Ora si prova una scala di formati, dal piu' veloce al piu' compatibile, e
//    OGNI fallimento viene detto con il suo motivo. L'ultimo della lista, fp32
//    su wasm, e' il piu' lento ma e' il formato originale: se non si apre
//    nemmeno quello, il problema non e' la compressione.
//
// Sovrascrivibile con window.__veritasOcchioTentativi.

const TENTATIVI = [
  { device: "webgpu", dtype: "q4f16" },  // il piu' leggero, il piu' schizzinoso
  { device: "webgpu", dtype: "fp16" },
  { device: "webgpu", dtype: "q8" },
  { device: "wasm",   dtype: "q8" },     // niente scheda video: piu' lento, piu' docile
  { device: "wasm",   dtype: "fp32" },   // nessuna compressione: l'ultima spiaggia
];

// ---------------------------------------------------------------------------
// 2-ter. L'OCCHIO DI RISERVA: lo stesso modello che giudica, guarda
// ---------------------------------------------------------------------------
//
// Un VLM sa fare le due cose: dire dove sta una cosa e dire cos'e'. Se OWLv2
// non si apre, invece di fermarsi si chiede la stessa cosa al modello che il
// cervello sta gia' usando. Un modello invece di due, una dipendenza in meno.
//
// ⚠️ NON E' LA STESSA COSA, e non si finge che lo sia. OWLv2 e' un rilevatore:
//    dà riquadri stretti e un punteggio confrontabile. Un VLM descrive, e i
//    suoi riquadri sono piu' larghi e meno ripetibili. Chi legge il report deve
//    saperlo: `window.__veritasOcchioSorgente` dice sempre chi ha guardato.
//
// Il contratto da rispettare e' quello di `riconosci()`:
//    [{ label, score, box: {xmin, ymin, xmax, ymax} }]
// `label` deve essere ESATTAMENTE una delle parole chieste, altrimenti
// `riconosci()` la scarta come inventata — ed e' giusto cosi'.

function ritaglia(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ⚠️ QUANTE PAROLE PER VOLTA. Misurato il 25/08: il ciclo chiedeva 158 parole
//    in un colpo solo. A OWLv2 si puo': confronta ogni parola con l'immagine e
//    non "si distrae". Un VLM invece DESCRIVE — con un elenco lunghissimo ne
//    prende quattro a caso, o peggio, ne inventa per riempire. La lettura
//    nascerebbe gia' sbagliata, e sembrerebbe un limite del modello mentre e'
//    un errore di chi gliela chiede.
//
//    Quindi si spezza in mazzetti. Piu' chiamate, piu' lente, ma ognuna e' una
//    domanda a cui si puo' davvero rispondere.
const PAROLE_PER_VOLTA = 12;

function mazzetti(lista, quante) {
  const out = [];
  for (let i = 0; i < lista.length; i += quante) out.push(lista.slice(i, i + quante));
  return out;
}

function occhioDalVLM() {
  return async function rilevaConVLM(immagine, parole) {
    const gruppi = mazzetti(parole, window.__veritasParolePerVolta || PAROLE_PER_VOLTA);
    if (gruppi.length > 1) {
      log("chiedo " + parole.length + " parole in " + gruppi.length +
          " mazzetti da " + (window.__veritasParolePerVolta || PAROLE_PER_VOLTA) +
          " — un elenco troppo lungo lo farebbe rispondere a caso");
      const tutte = [];
      for (let i = 0; i < gruppi.length; i++) {
        try {
          const parte = await unGiro(immagine, gruppi[i]);
          tutte.push(...parte);
        } catch (e) {
          // Un mazzetto che fallisce non butta via gli altri: si dice e si va
          // avanti. Meglio una lettura parziale dichiarata che nessuna lettura.
          log("mazzetto " + (i + 1) + "/" + gruppi.length + " fallito: " +
              ((e && e.message) || e));
        }
      }
      log("in tutto ha trovato " + tutte.length + " cose su " + parole.length + " chieste");
      return tutte;
    }
    return unGiro(immagine, parole);
  };

  async function unGiro(immagine, parole) {
    const L = window.__veritasLLM;
    if (!L || !L.cfg || !L.cfg.url) throw new Error("nessun modello locale acceso");
    // ⚠️ NON si rifiuta per il nome. La regola sui nomi e' un indizio, non una
    //    prova: chi confeziona i modelli li chiama come vuole, e dare per cieco
    //    un modello che vede e' un errore piu' costoso del contrario — qui si
    //    prova e, se non vede, e' lui a dirlo con un errore chiaro.
    const modello = await nomeModello();
    if (!modelloVede(modello))
      log("il nome \"" + modello + "\" non dice che vede: provo lo stesso");

    const tela = telaDa(immagine);
    if (!tela) throw new Error("non ho un'immagine da guardare");
    const W = tela.width, H = tela.height;

    // Si chiedono coordinate in PIXEL dichiarando la misura dell'immagine:
    // e' l'unico modo per non dover indovinare, dopo, se il modello ha
    // risposto in millesimi, in percentuale o in pixel.
    const domanda =
      "Questa e' la pianta di uno spazio reale vista dall'alto, larga " + W +
      " pixel e alta " + H + " pixel.\n\n" +
      "Cerca SOLO queste cose: " + parole.join(", ") + ".\n\n" +
      "Rispondi con un array JSON e nient'altro. Ogni elemento:\n" +
      '{"label": "<una delle parole sopra, copiata esatta>", ' +
      '"score": <quanto sei sicuro, da 0 a 1>, ' +
      '"box": {"xmin": <px>, "ymin": <px>, "xmax": <px>, "ymax": <px>}}\n\n' +
      "Regole: usa solo le parole dell'elenco, copiate lettera per lettera. " +
      "Se una cosa non c'e', non inventarla: e' molto meglio un array corto e " +
      "vero che uno lungo e inventato. Se non vedi niente, rispondi [].";

    const r = await fetch(String(L.cfg.url).replace(/\/+$/, "") + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modello, temperature: 0, max_tokens: 1500,
        messages: [{ role: "user", content: [
          { type: "text", text: domanda },
          { type: "image_url", image_url: { url: tela.toDataURL("image/png") } },
        ]}],
      }),
    });
    if (!r.ok) throw new Error("il modello che vede ha risposto " + r.status);
    const d = await r.json();
    const testo = (d && d.choices && d.choices[0] && d.choices[0].message &&
                   d.choices[0].message.content) || "";

    // I modelli incartano volentieri il JSON nella prosa: si prende l'array.
    let lista;
    try {
      const a = testo.indexOf("["), b = testo.lastIndexOf("]");
      if (a < 0 || b <= a) throw new Error("nessun elenco nella risposta");
      lista = JSON.parse(testo.slice(a, b + 1));
    } catch (e) {
      throw new Error("non ho saputo leggere la risposta: " + ((e && e.message) || e));
    }
    if (!Array.isArray(lista)) throw new Error("la risposta non e' un elenco");

    const ammesse = new Set(parole);
    const fuori = [];
    const buone = [];
    for (const g of lista) {
      if (!g || !g.box) continue;
      if (!ammesse.has(g.label)) { fuori.push(g.label); continue; }
      const b = g.box;
      const n = (v, tot) => ritaglia(Number(v) / tot, 0, 1);
      const box = {
        xmin: n(b.xmin, W), xmax: n(b.xmax, W),
        ymin: n(b.ymin, H), ymax: n(b.ymax, H),
      };
      if (!(box.xmax > box.xmin) || !(box.ymax > box.ymin)) continue;
      buone.push({ label: g.label, score: ritaglia(Number(g.score) || 0.5, 0, 1), box });
    }
    if (fuori.length)
      log(fuori.length + " etichette inventate, scartate: " + fuori.slice(0, 5).join(", "));
    log("ha trovato " + buone.length + " cose su " + parole.length + " chieste");
    return buone;
  }
}

async function accendiOcchio(O, opz = {}) {
  if (O.stato().fase === "pronto") return O.accendi(opz);

  const lista = window.__veritasOcchioTentativi || TENTATIVI;
  log("accendo l'occhio" + (O.condiviso ? " gia' montato nella pagina" : " (copia del modulo)") +
      " — la prima volta scarica il modello di visione, puo' volerci qualche minuto");

  for (const tentativo of lista) {
    const come = tentativo.device + "/" + tentativo.dtype;
    try {
      const r = await O.accendi({ ...opz, tentativi: [tentativo] });
      if (r) {
        window.__veritasOcchioSorgente = "owlv2:" + come;
        log("occhio pronto con " + come);
        return r;
      }
      log("con " + come + " non si apre: " + (O.stato().perche || "motivo non detto"));
    } catch (e) {
      log("con " + come + " non si apre: " + ((e && e.message) || e));
    }
  }
  log("nessun formato di OWLv2 si apre — passo all'occhio di riserva");

  // Riserva: guarda lo stesso modello che poi giudichera'.
  try {
    const modello = await nomeModello();
    window.__veritasOcchioSorgente = "vlm:" + modello;
    log("occhio di riserva: guarda " + modello +
        (modelloVede(modello) ? "" : " (il nome non dice che vede: si prova)") +
        " — riquadri piu' larghi di OWLv2, non confrontabili con le sue misure");
    return occhioDalVLM();
  } catch (e) {
    log("nemmeno l'occhio di riserva: " + ((e && e.message) || e) +
        ". Serve un modello che vede acceso in LM Studio.");
  }
  return null;
}

// ---------------------------------------------------------------------------
// 3. L'anello
// ---------------------------------------------------------------------------

let inCorso = false;

window.__veritasComprendi = async function (opz = {}) {
  if (inCorso) return { ok: false, perche: "sto gia' cercando di capire" };
  inCorso = true;
  // Mentre si guarda, una frase scritta in chat e' ancora una risposta: va
  // raccolta, non buttata. Misurato il 28/08: il secondo messaggio arrivava a
  // giro gia' partito, lo stato d'attesa era spento e il traduttore rispondeva
  // «non ho capito».
  window.__veritasGiroInCorso = true;
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

    const pianta = vista.piantaDelPavimento(THREE, rend, radice,
      Object.assign({ tutto: true }, opz.pianta || {}));
    if (!pianta) return { ok: false, perche: "non sono riuscito a disegnare la pianta" };

    // ⚠️ GLI SCORCI. La pianta dice DOVE stanno le cose; gli scorci dicono
    //    COM'E' FATTO il posto, perche' mostrano l'altezza e mostrano cosa c'e'
    //    attorno all'edificio — gli aerei, le banchine, le corsie — che sono
    //    l'indizio piu' forte su cos'e'. Quanti farne lo decide la vista in base
    //    a quante mesh per m2 ha il modello: pochi se e' semplice, di piu' se e'
    //    complesso. Se la vista e' quella vecchia (senza scorci) non si rompe
    //    niente: si prosegue con la sola pianta, come prima.
    let scorci = [];
    if (typeof vista.scorciTreQuarti === "function") {
      try {
        scorci = vista.scorciTreQuarti(THREE, rend, radice, opz.scorci || {}) || [];
        if (scorci.length) log("guardo il modello da " + scorci.length + " punti di vista oltre alla pianta");
      } catch (e) {
        log("non sono riuscito a girare il modello: " + ((e && e.message) || e));
      }
    }

    const O = occhioDellaPagina();
    const rilevatore = opz.rileva || await accendiOcchio(O, opz);
    if (!rilevatore)
      return { ok: false, perche: O.stato().perche || "l'occhio non si e' acceso" };

    const pannello = anteprima(document);

    const ctx = pannello.collega({
      posti: trovate.posti,
      pianta,                    // grezza: la vuole cosi' il pannello
      inquadratura: pianta,      // stessa cosa: porta dentro la proiezione
      scorci,                    // le altre inquadrature dello stesso posto
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
    // Regola 0 punto 5, seconda meta': adesso ascolta. Se e' rimasto qualcosa
    // senza nome, la prossima frase scritta in chat che non sia un comando
    // conosciuto e' la risposta, e fa ripartire un giro con dentro quello che
    // ha detto lei.
    const restaDaCapire = !!(c.domandaUmana || (typeof c.senzaNome === "number"
      ? c.senzaNome > 0 : (c.senzaNome && c.senzaNome.length)));
    window.__veritasInAttesa = restaDaCapire;
    if (restaDaCapire) dillo("Rispondimi qui: quello che scrivi torna dentro al ragionamento e rifaccio un giro.");
    return c;
  } catch (e) {
    const perche = (e && e.message) || String(e);
    log("non ho potuto capire: " + perche);
    window.__veritasComprensione = { ok: false, capito: false, perche };
    window.__veritasPuoSimulare = false;
    return window.__veritasComprensione;
  } finally {
    inCorso = false;
    window.__veritasGiroInCorso = false;
    // Se e' arrivata una risposta mentre guardavo, il giro appena finito non
    // l'aveva dentro: se ne fa uno solo in piu', mai a catena.
    if (window.__veritasRispostaArrivataDurante) {
      window.__veritasRispostaArrivataDurante = false;
      if (!(window.__veritasComprensione && window.__veritasComprensione.capito)) {
        setTimeout(() => { try { window.__veritasComprendi({}); } catch (e) {} }, 0);
      }
    }
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
  // ⚠️ IL TRAVASO CHE NON AVVENIVA MAI. Misurato il 28/08 con Raffaella davanti
  // allo schermo: il circuito diceva «23 volumi su 23 assegnati», lei
  // confermava, e le tappe non cambiavano di una virgola.
  //
  // Il motivo era qui: si pretendeva che la tappa avesse un campo `posto` e che
  // le coordinate coincidessero alla NONA CIFRA DECIMALE. Le 7 tappe pero'
  // nascono da un'altra strada (`applyAutoAssignment`) e quel campo non ce
  // l'hanno mai: la lista restava vuota, non rinominava niente, e non lo diceva
  // a nessuno. Un difetto silenzioso, che e' il tipo peggiore.
  //
  // Ora due strade: se il campo c'e' si usa quello (esatto, non si tocca);
  // altrimenti si accoppia per VICINANZA a terra, che e' l'unica cosa che le due
  // liste hanno davvero in comune. La soglia e' dichiarata, non nascosta: oltre
  // i 5 m non e' piu' la stessa cosa e non si accoppia.
  // ⚠️ LA SOGLIA CHE NON POTEVA FUNZIONARE. Era 5 m fissi, su un edificio lungo
  //    147: come cercare la propria auto in un parcheggio accettando solo se e'
  //    a cinque passi. Il 29/08 il cervello capiva 6 volumi e il travaso diceva
  //    «nessuna tappa accoppiata», perche' i volumi capiti stavano a decine di
  //    metri dalle tappe — che nascono da un riempimento posizionale, non dalla
  //    geometria vera.
  //
  //    Ora la soglia si misura sul modello: un decimo di quanto sono sparsi i
  //    volumi, con un minimo di 5 m e un tetto di 40. Su questo aeroporto vale
  //    circa 15 m; su una stanza resta 5. Nessun numero inventato che vada
  //    bene per un caso solo.
  const sparsi = (function () {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const q of posti) {
      if (!q || !q.centro) continue;
      x0 = Math.min(x0, q.centro[0]); x1 = Math.max(x1, q.centro[0]);
      z0 = Math.min(z0, q.centro[2]); z1 = Math.max(z1, q.centro[2]);
    }
    return isFinite(x0) ? Math.hypot(x1 - x0, z1 - z0) : 0;
  })();
  const SOGLIA_ACCOPPIAMENTO_M = Math.max(5, Math.min(40, sparsi / 10));
  const distanzaXZ = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);
  const assegnate = [];
  let perCampo = 0, perVicinanza = 0, troppoLontane = 0, senzaNome = 0, fuoriElenco = 0;
  // Diagnostica che mancava: quanti volumi erano candidati e quanto era vicino
  // il piu' vicino. Senza questi due numeri «nessuna tappa accoppiata» non
  // distingue fra «li scarto tutti» e «la soglia e' troppo stretta»: due guasti
  // diversi con la stessa faccia.
  let volumiUtili = 0, minimaVista = Infinity, candidati = 0;
  const presi = new Set();
  nodi.forEach(function (n, i) {
    let p = null;
    if (n.posto && n.posto.centro) {
      p = posti.find((q) =>
        Math.abs(q.centro[0] - n.posto.centro[0]) < 1e-9 &&
        Math.abs(q.centro[2] - n.posto.centro[2]) < 1e-9);
      if (p) perCampo++;
    }
    if (!p && n.pos) {
      let migliore = null, minima = Infinity;
      for (const q of posti) {
        // IL TERZO FILTRO MUTO, trovato il 29/08 sera. Qui si pretendeva ancora
        // `q.funzione`: i volumi nominati dal cervello ma con una parola fuori
        // elenco venivano scartati PRIMA del confronto, quindi non risultavano
        // nemmeno «troppo lontani». Il log diceva «nessuna tappa accoppiata:
        // 7 tappe, 23 volumi» e non aggiungeva altro: e' stato quel silenzio a
        // smascherarlo. Basta il nome, perche' e' il nome che si travasa.
        if (!q || !q.centro || !q.nome) continue;
        candidati++;
        const d = distanzaXZ(q.centro, n.pos);
        if (d < minima) { minima = d; migliore = q; }
      }
      if (migliore && minima < minimaVista) minimaVista = minima;
      // Un volume non si assegna a due tappe: sarebbe lo stesso posto in due
      // punti diversi. La prima che lo prende se lo tiene; le altre cercano
      // altrove al giro successivo, e se non trovano restano come stanno.
      if (migliore && minima <= SOGLIA_ACCOPPIAMENTO_M && !presi.has(migliore)) {
        p = migliore; presi.add(migliore); perVicinanza++;
      } else if (migliore) troppoLontane++;
    }
    // ⚠️ CAPITO A META' VALE PIU' DI NIENTE — chiesto da Raffaella il 29/08,
    //    dopo una giornata in cui il cervello capiva e la barra non cambiava.
    //
    //    Qui c'erano due filtri muti, in fila:
    //      1. senza `funzione` si scartava, anche con un nome ottimo;
    //      2. se `tipoDiFunzione` non riconosceva la parola si scartava, e
    //         quella e' una tabella di parole decise prima di guardare: il
    //         cervello poteva rispondere «parcheggio esterno» e sparire.
    //    Bastava che UNA zona su sette non passasse per non vederla mai piu'.
    //
    //    Ora basta il nome. Il tipo, se non si riconosce, resta quello che la
    //    zona aveva: si scrive cio' che si e' capito e non si tocca il resto.
    if (!p || !p.nome) { senzaNome++; return; }
    const t = window.__veritasOcchi && window.__veritasOcchi.tipoDiFunzione
      ? window.__veritasOcchi.tipoDiFunzione(p.funzione) : null;
    if (!t) fuoriElenco++;
    assegnate.push({
      indice: i, funzione: p.funzione || null,
      tipo: t ? t.tipo : null, fuori: t ? t.fuori : undefined,
      sicurezza: p.fiducia >= 0.35 ? "alta" : (p.fiducia >= 0.2 ? "media" : "bassa"),
      nome: p.nome,
    });
  });
  if (!assegnate.length) {
    log("nessuna tappa accoppiata ai volumi capiti: " + nodi.length + " tappe, "
      + posti.length + " volumi"
      + (troppoLontane ? ", " + troppoLontane + " oltre i " + SOGLIA_ACCOPPIAMENTO_M + " m" : "")
      + (isFinite(minimaVista) ? ", il piu' vicino a " + minimaVista.toFixed(1) + " m"
                              : ", nessun volume con un nome utilizzabile")
      + ". Le tappe restano come stanno.");
    return 0;
  }
  // `fonte` dice CHI ha guardato: serve alla porta per non farsi riscrivere
  // sopra dall'occhio della sola pianta, e per far vincere il nome letto.
  const n = window.__veritasApplicaOcchi({ assegnate, fonte: "comprensione" }, nodi);
  log(n + " tappe su " + nodi.length + " rinominate dopo la comprensione"
    + " (" + perCampo + " per corrispondenza esatta, " + perVicinanza + " per vicinanza"
    + (fuoriElenco ? ", " + fuoriElenco + " con una funzione fuori elenco: tenuto il nome" : "")
    + (senzaNome ? ", " + senzaNome + " senza nome dal cervello" : "")
    + ", soglia " + SOGLIA_ACCOPPIAMENTO_M.toFixed(0) + " m)");
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


// ---------------------------------------------------------------------------
// 5. Il rientro della risposta — il ponte che mancava
// ---------------------------------------------------------------------------
//
// La domanda usciva e basta: `chiedi_all_umano` e `senza_nome` esistevano, la
// domanda arrivava in chat, ma nessuno raccoglieva la risposta. Il circuito
// sapeva chiedere e non sapeva ricevere, quindi i volumi senza nome restavano
// senza nome e la simulazione non partiva mai.
//
// Si passa dal registro di estensione che esiste gia'
// (`__veritasCommandExtensions`): le estensioni vengono provate DOPO tutti i
// comandi conosciuti, quindi una frase libera arriva qui solo se non era un
// comando — che e' esattamente il caso di una risposta.
window.__veritasRispondi = async function (testo) {
  const frase = String(testo || "").trim();
  if (!frase) return null;
  const elenco = window.__veritasRisposteUmane || (window.__veritasRisposteUmane = []);
  elenco.push(frase);
  window.__veritasInAttesa = false;
  return window.__veritasComprendi({});
};

window.__veritasCommandExtensions = window.__veritasCommandExtensions || [];
// ⚠️ unshift, non push. Misurato il 28/08: un'altra estensione (il traduttore
// che prova a rendere una frase libera in comando) e' registrata prima, prende
// la frase, risponde «non ho capito cosa vuoi che faccia» e chiude. Con push
// questa non veniva mai provata e la risposta si perdeva lo stesso. In attesa
// di una risposta, la risposta ha la precedenza su tutto.
// ⚠️ Un ORDINE non e' una risposta. Misurato a schermo il 28/08: dopo aver
// detto «la simulazione puo' partire», a «fai partire la simulazione» rispondeva
// «Ricevuto, rifaccio un giro» e ripartiva a guardare. Mentre aspetta una
// risposta questa strada si mangia tutto quello che scrivi, comandi compresi.
// Questi verbi tornano al dispatcher, che sa gia' eseguirli.
const E_UN_ORDINE = /^(fai partire|far partire|parti\b|avvia|lancia|simula|esegui|mostra|fammi vedere|apri|chiudi|spegni|pulisci|togli|nascondi|report|referto|analizza|calcola|scala |ferma|stop)/i;

window.__veritasCommandExtensions.unshift(function (raw, t, log) {
  const inAttesa = !!window.__veritasInAttesa;
  const durante = !!window.__veritasGiroInCorso;
  if (!inAttesa && !durante) return false;
  const frase = String(raw || "").trim();
  if (!frase) return false;
  if (E_UN_ORDINE.test(frase)) return false;

  // Arrivata mentre guardavo: si tiene da parte e si rilancia un giro solo
  // quando questo ha finito. Rilanciarlo adesso lo farebbe rimbalzare sulla
  // guardia `inCorso` e la frase si perderebbe in silenzio.
  if (durante) {
    const elenco = window.__veritasRisposteUmane || (window.__veritasRisposteUmane = []);
    elenco.push(frase);
    window.__veritasRispostaArrivataDurante = true;
    if (typeof log === "function") {
      log("assistant", "Ricevuto. Sto ancora guardando: appena finisco questo giro ne faccio uno con quello che mi hai detto.");
    }
    return true;
  }

  if (typeof log === "function") {
    log("assistant", "Ricevuto. Rifaccio un giro con quello che mi hai detto.");
  }
  window.__veritasRispondi(frase).catch((e) => {
    console.warn("[VERITAS risposta] il giro non e' ripartito:", (e && e.message) || e);
  });
  return true;
});

console.log("[VERITAS risposta] ponte attivo — quello che scrivi rientra nel ragionamento");


// ---------------------------------------------------------------------------
// 6. LA CHAT — rispondere alle domande, ma solo su quello che si e' misurato
// ---------------------------------------------------------------------------
//
// Perche' esiste: chi compra questo strumento lo compra per CHIEDERGLI le cose
// — «quante finestre ci sono», «i varchi sono a norma», «quanto e' larga
// l'uscita piu' stretta». Un sistema che parla solo quando non capisce non e'
// vendibile. Deciso da Raffaella il 28/08.
//
// ⚠️ IL VINCOLO CHE LO RENDE VENDIBILE INVECE CHE PERICOLOSO: risponde SOLO da
// quello che il sistema ha misurato davvero. Se il dato non c'e', dice che non
// c'e' e dice cosa servirebbe per averlo. Un numero inventato dentro una
// risposta e' la stessa merce avariata dei KPI finti, ed e' peggio, perche' qui
// il cliente lo sta chiedendo apposta.
//
// ⚠️ E distingue MISURA da GIUDIZIO. «L'uscita e' larga 0,90 m» e' un rilievo;
// «l'uscita e' a norma» e' l'esito di una soglia, con una giurisdizione dietro.
// Spacciare il secondo per il primo e' quello che fa causare i guai a chi firma.
function fotografiaDelSapere() {
  const prendi = (f) => { try { return f(); } catch (e) { return null; } };
  const zone = prendi(() => window.__veritasAutoZones) || [];
  const nodi = prendi(() => window.currentNodes) || [];
  const c = prendi(() => window.__veritasComprensione) || null;
  return {
    modello_caricato: !!(zone.length || nodi.length),
    comprensione: c ? {
      capito: c.capito, fiducia: c.fiducia,
      volumi_nominati: c.nominati, volumi_senza_nome: c.senzaNome,
    } : null,
    zone_misurate: zone.slice(0, 40).map((z, i) => ({
      i, area_m2: z.areaM2, ruolo: z.role, all_aperto: z.fuori,
    })),
    tappe: nodi.slice(0, 40).map((n) => ({ nome: n.label, ruolo: n.type })),
    cose_trovate: prendi(() => window.__veritasCoseTrovate) || null,
    referto: prendi(() => window.__veritasReferto) || null,
    passaggio_piu_stretto_m: prendi(() => window.__veritasBottleneckMax),
    dati_di_progetto: prendi(() => window.__veritasDatiProgetto) || null,
    // Il sapere tecnico: misure del corpo e della circolazione, ognuna con la
    // sua fonte. Serve a rispondere «quanto deve essere largo» senza inventare.
    misure_tecniche: prendi(() => window.__veritasManuale) || null,
    soglie_normative: prendi(() => window.__veritasNormative && window.__veritasNormative.soglie) || null,
    // Quello che NON e' stato misurato, detto esplicitamente: la risposta
    // onesta a «quante finestre ci sono» sta qui, non in una stima.
    non_misurato: prendi(() => window.__veritasNonMisurato) || null,
  };
}

const PATTO_RISPOSTA = [
  "Sei VERITAS. Rispondi a chi analizza uno spazio per lavoro: un architetto,",
  "un gestore, chi deve firmare. Italiano normale, poche righe, niente elenchi",
  "se non servono.",
  "",
  "⚠️ REGOLE, e vengono prima della cortesia:",
  "- Rispondi SOLO con quello che sta nella FOTOGRAFIA qui sotto. Non e' quello",
  "  che sai del mondo: e' quello che questo sistema ha misurato su QUESTO",
  "  modello.",
  "- Se il dato non c'e', dillo chiaramente — «non l'ho misurato» — e aggiungi",
  "  in una riga cosa servirebbe per averlo. Non stimare, non arrotondare, non",
  "  dedurre da quello che di solito c'e' in un edificio del genere.",
  "- Non inventare MAI un numero. Un numero che non e' nella fotografia non si",
  "  scrive, nemmeno come ordine di grandezza.",
  "- Distingui quello che e' MISURATO da quello che e' un GIUDIZIO su una",
  "  soglia. «Largo 0,90 m» e' una misura. «A norma» e' un giudizio: dillo, e di'",
  "  rispetto a quale regola, se la fotografia lo riporta. Se non lo riporta,",
  "  non dare il giudizio.",
  "- Se la domanda non riguarda questo modello, dillo in una riga.",
].join("\n");

window.__veritasDomanda = async function (frase) {
  const testo = String(frase || "").trim();
  if (!testo) return null;
  const foto = fotografiaDelSapere();
  if (!foto.modello_caricato) {
    return "Non ho ancora nessun modello caricato: appoggia un file 3D e poi chiedimi quello che vuoi.";
  }
  const domanda = [
    PATTO_RISPOSTA, "",
    "FOTOGRAFIA DI QUELLO CHE HO MISURATO:",
    JSON.stringify(foto),
    "",
    "DOMANDA: " + testo,
  ].join("\n");
  return (await cervello(domanda, {})) || "";
};

// Va davanti al traduttore, che altrimenti prende la frase e risponde «non ho
// capito cosa vuoi che faccia». Non tocca i comandi: si occupa solo di quello
// che e' scritto come una domanda.
const PARE_UNA_DOMANDA = /\?\s*$|^(quant|qual|quali|dove|come mai|perch|cosa |che cosa|mi sai dire|dimmi|sai dirmi|c'e' |ci sono )/i;

window.__veritasCommandExtensions = window.__veritasCommandExtensions || [];
window.__veritasCommandExtensions.unshift(function (raw, t, log) {
  // Se sta aspettando una risposta o sta guardando, quella strada ha la
  // precedenza: li' la frase e' una risposta, non una domanda.
  if (window.__veritasInAttesa || window.__veritasGiroInCorso) return false;
  const frase = String(raw || "").trim();
  if (!frase || !PARE_UNA_DOMANDA.test(frase)) return false;
  if (typeof log === "function") log("assistant", "Guardo quello che ho misurato...");
  window.__veritasDomanda(frase).then((r) => {
    if (typeof log === "function") log("assistant", r || "Non sono riuscito a rispondere.");
  }).catch((e) => {
    if (typeof log === "function") {
      log("assistant", "Non sono riuscito a rispondere: " + ((e && e.message) || e));
    }
  });
  return true;
});

console.log("[VERITAS chat] pronta — chiedi in italiano; rispondo solo su quello che ho misurato");
