// veritas_percorso.js — da ambienti misurati a tappe di un percorso.
//
// IL PROBLEMA
// Il motore geometrico riconosce gli AMBIENTI: sul modello di prova ne trova
// 31, separati da 24 varchi reali. E' una misura corretta e preziosa.
//
// Ma un simulatore non cammina fra 31 ambienti: cammina fra poche TAPPE -
// ingresso, accettazione, controllo, attesa, gate. Assegnare tutti e 31 gli
// ambienti come nodi non e' "piu' preciso": e' un'altra cosa, e in pratica
// rallenta la pagina al punto da renderla inservibile (misurato: la prova ha
// sforato i 220 secondi ed e' stata uccisa).
//
// Sono due domande diverse e vanno tenute separate:
//   quanti ambienti ci sono?     -> 31, ed e' la risposta giusta per il referto
//   dove passa la gente?         -> 5-7 tappe, ed e' la risposta per simulare
//
// COME SI SCEGLIE
// Non a caso e non le piu' grandi in assoluto: lungo il FLUSSO. Il primo e
// l'ultimo si tengono sempre - sono l'ingresso e la destinazione, e senza di
// loro il percorso non esiste. In mezzo si prende una tappa per tratto,
// scegliendo dentro ogni tratto l'ambiente piu' esteso, perche' un ambiente
// grande e' dove la gente si ferma e dove la densita' conta.
//
// Cosi' la sequenza spaziale e' rispettata: le tappe escono nell'ordine in cui
// si attraversano, non ordinate per dimensione. Un percorso che salta avanti e
// indietro non e' un percorso.

/** Quante tappe ha senso avere.
 *
 *  ⚠️ IL TETTO ERA 8, SEMPRE, PER QUALUNQUE EDIFICIO. Raffaella, 05/09:
 *     «se ci sono delle regole stupide le togliamo... se impediscono la
 *     lettura dell'oggetto, buttale».
 *     La ragione scritta qui prima — «sopra ~8 non e' piu' una sequenza
 *     leggibile» — e' giusta per una palazzina e falsa per un terminal. Un
 *     aeroporto ne riconosce 31: con il tetto a 8 ne cadevano 23, e fra
 *     quelle il fronte strada, i taxi e la fila ai varchi. Un numero costante
 *     che non guarda l'oggetto e' esattamente una regola che impedisce di
 *     leggerlo.
 *     Ora il tetto assoluto e' largo (24) e a decidere davvero e'
 *     `tappeConsigliate`, che scala con quanto e' grande lo spazio. 24 non e'
 *     un numero magico: e' «tanto da non stringere mai un edificio vero,
 *     poco da accorgersi se un giorno il riconoscimento impazzisse e ne
 *     tirasse fuori duecento». */
export const TAPPE_MIN = 2;
export const TAPPE_MAX = 24;

function areaDi(z) {
  if (!z) return 0;
  if (typeof z.areaM2 === "number") return z.areaM2;
  if (typeof z.area === "number") return z.area;
  if (typeof z.cells === "number") return z.cells;
  if (typeof z.punti === "number") return z.punti;
  return 1;
}

/**
 * Riduce gli ambienti misurati alle tappe di un percorso.
 *
 * @param {Array} zone        gli ambienti riconosciuti
 * @param {Array} flusso      indici (o zone) nell'ordine di attraversamento;
 *                            se manca si usa l'ordine in cui sono arrivate
 * @param {number} maxTappe
 * @returns {{tappe: Array, scartate: number, motivo: string}}
 */
export function riduciAPercorso(zone, flusso, maxTappe = 5) {
  if (!Array.isArray(zone) || zone.length === 0) {
    return { tappe: [], scartate: 0, motivo: "nessun ambiente" };
  }
  const n = Math.max(TAPPE_MIN, Math.min(TAPPE_MAX, maxTappe | 0));

  // L'ordine di attraversamento. Se il flusso arriva come elenco di zone si
  // usa quello; se sono indici si risolvono; se non c'e' si tiene l'ordine
  // naturale, dichiarandolo.
  let ordinate, daFlusso = true;
  if (Array.isArray(flusso) && flusso.length >= 2) {
    ordinate = flusso.map((f) => (typeof f === "number" ? zone[f] : f)).filter(Boolean);
    if (ordinate.length < 2) { ordinate = zone.slice(); daFlusso = false; }
  } else {
    ordinate = zone.slice();
    daFlusso = false;
  }

  if (ordinate.length <= n) {
    return {
      tappe: ordinate,
      scartate: 0,
      motivo: "gli ambienti sono gia' pochi (" + ordinate.length + "): nessuna riduzione",
      daFlusso,
    };
  }

  // Primo e ultimo sempre: sono ingresso e destinazione.
  const scelti = [0, ordinate.length - 1];

  // In mezzo, un tratto per ogni tappa mancante, e dentro ogni tratto
  // l'ambiente piu' esteso.
  const intermedie = n - 2;
  if (intermedie > 0) {
    const primo = 1, ultimo = ordinate.length - 2;
    const larghezza = (ultimo - primo + 1) / intermedie;
    for (let t = 0; t < intermedie; t++) {
      const da = primo + Math.floor(t * larghezza);
      const a = primo + Math.floor((t + 1) * larghezza) - 1;
      let miglior = -1, miglioreArea = -1;
      for (let i = da; i <= Math.max(da, a) && i <= ultimo; i++) {
        const ar = areaDi(ordinate[i]);
        if (ar > miglioreArea) { miglioreArea = ar; miglior = i; }
      }
      if (miglior >= 0 && !scelti.includes(miglior)) scelti.push(miglior);
    }
  }

  // Nell'ordine in cui si attraversano, non per dimensione: un percorso che
  // salta avanti e indietro non e' un percorso.
  scelti.sort((a, b) => a - b);
  const tappe = scelti.map((i) => ordinate[i]);
  return {
    tappe,
    scartate: ordinate.length - tappe.length,
    motivo: "da " + ordinate.length + " ambienti a " + tappe.length + " tappe" +
      (daFlusso ? " lungo il flusso" : " (nessun flusso noto: ordine naturale)"),
    daFlusso,
  };
}

/**
 * Quante tappe per questo spazio.
 *
 * Non un numero fisso: un corridoio non ha le stesse tappe di un terminal. Si
 * guarda quanti ambienti sono stati riconosciuti, e si resta prudenti - meglio
 * poche tappe leggibili che molte che nessuno controlla.
 */
export function tappeConsigliate(nAmbienti) {
  if (!nAmbienti || nAmbienti < 2) return TAPPE_MIN;
  if (nAmbienti <= 5) return nAmbienti;          // pochi: si tengono tutti
  if (nAmbienti <= 12) return 5;                 // una casa, un piano d'ufficio
  // ⚠️ QUI PRIMA C'ERA `return 7`, e valeva sia per 13 ambienti che per 300.
  //    Adesso cresce con l'edificio: circa un ambiente su due, che su un
  //    terminal da 31 fa 15 tappe invece di 7. Resta una SELEZIONE — non si
  //    cammina fra trentuno posti — ma smette di essere lo stesso numero per
  //    una villetta e per Fiumicino.
  return Math.max(7, Math.min(TAPPE_MAX, Math.round(nAmbienti * 0.48)));
}

export default { riduciAPercorso, tappeConsigliate, TAPPE_MIN, TAPPE_MAX };
