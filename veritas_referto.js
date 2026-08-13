// veritas_referto.js — la memoria di lavoro del sistema.
//
// IL PROBLEMA
// Le analisi c'erano tutte e funzionavano, ma erano FOGLIE: ognuna parlava
// all'utente e finiva li'. Verificato leggendo il codice:
//
//   runVisibility     non scrive niente
//   runAccessibility  scrive solo __veritasDatiProgetto
//   runAffollamento   non scrive niente
//   runEsodo          non scrive niente
//
// Nessuna poteva usare quello che aveva trovato un'altra. L'esodo non sapeva
// quanto pavimento c'era, l'affollamento non sapeva dove portavano le frecce,
// e il report finale doveva rifare tutto da capo. Sei strumenti affiancati, non
// un ragionamento.
//
// LA MEMORIA
// Un posto solo dove tutto quello che si sa sullo spazio caricato viene
// depositato man mano: cosa e' entrato, cosa si e' misurato, cosa ha visto
// l'occhio, cosa ha detto ogni analisi. Da qui possono attingere il report, le
// analisi successive e l'agente.
//
// OGNI VOCE PORTA LA PROPRIA PROVENIENZA. In uno strumento che deve reggere un
// confronto normativo, "3589 m2" non basta: serve sapere se e' una misura o una
// stima, da dove viene e quando. Un numero senza provenienza non e' un dato,
// e' un'opinione ben scritta.

export const SORGENTI = ["misura", "stima", "dichiarato", "riferito"];

/** Una memoria vuota. */
export function nuovoReferto(nomeSpazio) {
  return {
    spazio: nomeSpazio || null,
    aperto: Date.now(),
    voci: {},      // chiave -> { valore, sorgente, unita, quando, da }
    analisi: {},   // nome -> { quando, detto: [] }
  };
}

/**
 * Deposita un dato.
 *
 * @param {string} chiave     es. "areaPavimento"
 * @param {*} valore
 * @param {object} meta       { sorgente, unita, da }
 */
export function deposita(referto, chiave, valore, meta = {}) {
  if (!referto || !chiave) return referto;
  const sorgente = SORGENTI.includes(meta.sorgente) ? meta.sorgente : "riferito";
  referto.voci[chiave] = {
    valore,
    sorgente,
    unita: meta.unita || null,
    da: meta.da || null,
    quando: Date.now(),
  };
  return referto;
}

/** Registra cosa ha detto un'analisi. Le frasi si accumulano nell'ordine. */
export function annota(referto, analisi, frase) {
  if (!referto || !analisi) return referto;
  if (!referto.analisi[analisi]) referto.analisi[analisi] = { quando: Date.now(), detto: [] };
  if (frase) referto.analisi[analisi].detto.push(String(frase));
  return referto;
}

/** Quante analisi hanno effettivamente prodotto qualcosa. */
export function analisiConEsito(referto) {
  if (!referto) return [];
  return Object.keys(referto.analisi).filter((k) => referto.analisi[k].detto.length > 0);
}

/**
 * Cosa manca per poter refertare.
 *
 * Dichiararlo e' piu' utile che produrre un referto con dei buchi taciuti:
 * chi legge deve sapere su cosa NON ci si puo' basare.
 */
export function lacune(referto, richieste) {
  const attese = richieste || ["areaPavimento", "zone", "quotaPavimento"];
  if (!referto) return attese.slice();
  return attese.filter((k) => !(k in referto.voci));
}

/**
 * Riassunto leggibile. Non inventa: se un dato manca, lo dice.
 */
export function racconta(referto) {
  if (!referto) return "Nessuno spazio in memoria.";
  const r = [];
  // Una memoria ancora vuota va dichiarata come tale. Elencare solo cio' che
  // manca suonerebbe come un'analisi incompleta, mentre il caso e' diverso:
  // non e' ancora stato guardato niente.
  if (!Object.keys(referto.voci).length && !Object.keys(referto.analisi).length) {
    return "Memoria aperta ma ancora vuota. Manca: " + lacune(referto).join(", ") + ".";
  }
  const v = (k) => (referto.voci[k] ? referto.voci[k] : null);
  const area = v("areaPavimento");
  if (area) {
    r.push("Pavimento " + Number(area.valore).toFixed(0) + " m² (" + area.sorgente + ")");
  }
  const zone = v("zone");
  if (zone) r.push(zone.valore + " zone");
  const segn = v("segnaletica");
  if (segn && Array.isArray(segn.valore)) {
    const dir = segn.valore.filter((f) => f.tipo === "direzionale").length;
    r.push(segn.valore.length + " famiglie di segnaletica" +
      (dir ? ", " + dir + " con un verso" : ""));
  }
  const fatte = analisiConEsito(referto);
  if (fatte.length) r.push("analisi svolte: " + fatte.join(", "));
  const mancano = lacune(referto);
  if (mancano.length) r.push("manca ancora: " + mancano.join(", "));
  return r.length ? r.join(". ") + "." : "Memoria aperta ma ancora vuota.";
}

/**
 * Riduce un valore a qualcosa che ha senso conservare.
 *
 * Le analisi restituiscono anche oggetti enormi - griglie di occupazione,
 * mappe di distanza, elenchi di migliaia di celle. Metterli in memoria
 * cosi' come sono la farebbe pesare decine di megabyte e renderebbe il
 * referto illeggibile, senza aggiungere niente: quello che serve a chi
 * ragiona dopo sono i NUMERI, non le matrici da cui vengono.
 *
 * Gli array diventano la loro lunghezza piu' un campione, gli oggetti
 * tengono solo i campi scalari. Quello che viene lasciato fuori e' sempre
 * dichiarato, cosi' nessuno crede di avere in mano piu' di quello che ha.
 */
export function sintetizza(valore, profondita = 0) {
  if (valore == null) return valore;
  const t = typeof valore;
  if (t === "number" || t === "boolean" || t === "string") {
    return t === "string" && valore.length > 200 ? valore.slice(0, 200) + "…" : valore;
  }
  if (t === "function") return "(funzione)";
  if (ArrayBuffer.isView(valore)) return { tipo: valore.constructor.name, elementi: valore.length };
  if (Array.isArray(valore)) {
    if (profondita >= 2) return { elementi: valore.length };
    return {
      elementi: valore.length,
      campione: valore.slice(0, 3).map((v) => sintetizza(v, profondita + 1)),
    };
  }
  if (t === "object") {
    // Un nodo del DOM non e' un dato: serializzarlo riempirebbe la memoria di
    // dettagli di presentazione che nessuna analisi puo' usare.
    if (typeof valore.nodeType === "number") return undefined;
    if (profondita >= 2) return "(oggetto)";
    const out = {};
    let esclusi = 0;
    for (const k of Object.keys(valore)) {
      const v = valore[k];
      const tv = typeof v;
      if (tv === "number" || tv === "boolean" || tv === "string") out[k] = sintetizza(v, profondita + 1);
      else if (Array.isArray(v) || ArrayBuffer.isView(v)) out[k] = sintetizza(v, profondita + 1);
      else if (v && tv === "object" && profondita < 1) {
        const dentro = sintetizza(v, profondita + 1);
        if (dentro === undefined) esclusi++; else out[k] = dentro;
      } else esclusi++;
    }
    if (esclusi) out.__esclusi = esclusi;
    return out;
  }
  return String(valore);
}

/**
 * Fa in modo che ogni chiamata ai metodi di un modulo depositi il proprio
 * risultato nella memoria.
 *
 * PERCHE' COSI' E NON RICHIAMANDO LE ANALISI
 * I numeri servono quelli VERI, cioe' quelli che l'analisi ha effettivamente
 * usato. Rieseguire l'analisi per raccoglierli significherebbe farla due
 * volte e, appena una delle due strade cambia, ottenere due risposte diverse
 * per la stessa domanda. Intercettando il confine del modulo il numero e'
 * per costruzione lo stesso che ha visto l'utente.
 *
 * @param {object} referto
 * @param {string} nome     nome del modulo, es. "esodo"
 * @param {object} modulo   l'oggetto con i metodi
 * @param {string} sorgente come vanno marcati i suoi esiti
 * @returns {number} quanti metodi sono stati intercettati
 */
export function intercetta(referto, nome, modulo, sorgente = "riferito") {
  if (!modulo || typeof modulo !== "object") return 0;
  let quanti = 0;
  for (const metodo of Object.keys(modulo)) {
    const f = modulo[metodo];
    if (typeof f !== "function" || f.__veritasIntercettato) continue;
    const avvolta = function (...args) {
      const esito = f.apply(this, args);
      try {
        const R = typeof referto === "function" ? referto() : referto;
        if (R && esito !== undefined) {
          deposita(R, nome + "." + metodo, sintetizza(esito), { sorgente, da: nome });
        }
      } catch (e) { /* un difetto qui non deve rompere l'analisi */ }
      return esito;
    };
    avvolta.__veritasIntercettato = true;
    modulo[metodo] = avvolta;
    quanti++;
  }
  return quanti;
}

export default { nuovoReferto, deposita, annota, analisiConEsito, lacune, racconta,
                 sintetizza, intercetta, SORGENTI };
