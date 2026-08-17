// veritas_sequenza.js — l'ordine delle operazioni all'apertura di un modello.
//
// IL PROBLEMA, DETTO SEMPLICE
// Prima si sistema l'ambiente, poi si analizza. Non il contrario.
//
// Quello che succedeva era invece questo: il modello veniva caricato, partiva
// subito un'analisi, DOPO si scopriva che non era in metri, si riscalava di 6
// volte e si rianalizzava. Nel frattempo la segnaletica era gia' stata letta su
// un modello grande un sesto del vero, e il confronto normativo aveva gia'
// dichiarato 30 porte su 31 non conformi misurandole 0,15 m - che e' la misura
// PRIMA del riscalo.
//
// Un verdetto di conformita' calcolato su un ambiente non ancora sistemato non
// e' un verdetto sbagliato per poco: e' un numero credibile e falso, che e' la
// cosa peggiore che questo strumento possa produrre.
//
// Avevo provato a rimediare con delle ATTESE - aspetta un secondo e mezzo, poi
// leggi - sperando che nel frattempo tutto si fosse assestato. Ma un'attesa non
// e' un ordine: e' una scommessa su quanto ci mette il computer, e su una
// macchina piu' lenta o un modello piu' grande si perde.
//
// LE QUATTRO FASI
//
//   1. AMBIENTE   appoggiare a terra, mettere in scala, e RIFARLO finche' non
//                 serve piu'. Nessuna misura esce da questa fase.
//   2. MISURA     l'occhio: pianta, area, quota, segnaletica, zone.
//   3. GIUDIZIO   visibilita', accessibilita', affollamento, esodo, normative.
//   4. PRONTO     si racconta cosa si e' capito, e si puo' simulare.
//
// COME SI SA CHE L'AMBIENTE E' A POSTO
// Non con un'attesa, ma con un PUNTO FISSO: l'ambiente e' sistemato quando una
// passata di analisi si conclude senza aver dovuto correggere niente. Se ha
// corretto, la passata e' sporca e si aspetta la successiva. E' la stessa
// condizione che il codice del riscalo gia' usava per non avvitarsi, resa
// esplicita e valida per tutti.

export const FASI = ["attesa", "ambiente", "misura", "giudizio", "pronto"];

// Oltre questo numero di correzioni ci si ferma. Un ambiente che continua a
// chiedere di essere corretto ha un problema che una correzione in piu' non
// risolve, e continuare significherebbe girare per sempre senza dirlo.
export const MAX_PASSATE = 4;

export function nuovaSequenza() {
  return { fase: "attesa", passate: 0, correzioni: [], iniziata: null, storia: [] };
}

function passa(seq, fase, nota) {
  seq.fase = fase;
  seq.storia.push({ fase, quando: Date.now(), nota: nota || null });
  return seq;
}

/** Il modello e' entrato: si comincia a sistemare l'ambiente. */
export function avvia(seq) {
  seq.iniziata = Date.now();
  seq.passate = 0;
  seq.correzioni = [];
  return passa(seq, "ambiente", "modello caricato");
}

/**
 * Una passata di analisi si e' conclusa.
 *
 * @param {object} seq
 * @param {{correzione?: string}} esito  se e' stata applicata una correzione,
 *        come si chiama (es. "scala 6x"); altrimenti niente.
 * @returns {{ambientePronto: boolean, motivo: string}}
 */
export function registraPassata(seq, esito = {}) {
  if (seq.fase !== "ambiente") {
    // L'instabilita' e' una proprieta' della SEQUENZA, non di una singola
    // chiamata: se l'ambiente non si e' assestato, chi lo chiede piu' tardi
    // deve continuare a saperlo, o l'avvertenza svanisce dopo un giro.
    return {
      ambientePronto: seq.fase !== "attesa",
      motivo: seq.instabile ? seq.motivoInstabile : "fase " + seq.fase,
      instabile: !!seq.instabile,
    };
  }
  seq.passate++;
  if (esito.correzione) {
    seq.correzioni.push(esito.correzione);
    if (seq.passate >= MAX_PASSATE) {
      // Ci si ferma e lo si DICE. Andare avanti in silenzio con un ambiente
      // che non si e' assestato produrrebbe misure di cui nessuno sa il valore.
      passa(seq, "misura", "fermato dopo " + seq.passate + " passate");
      seq.instabile = true;
      seq.motivoInstabile = "l'ambiente ha chiesto " + seq.correzioni.length +
        " correzioni senza assestarsi (" + seq.correzioni.join(", ") +
        "): vado avanti, ma le misure vanno guardate con sospetto";
      return { ambientePronto: true, motivo: seq.motivoInstabile, instabile: true };
    }
    return { ambientePronto: false, motivo: "applicata " + esito.correzione + ", rifaccio" };
  }
  passa(seq, "misura", "ambiente stabile dopo " + seq.passate + " passate");
  return {
    ambientePronto: true,
    motivo: seq.correzioni.length
      ? "ambiente sistemato (" + seq.correzioni.join(", ") + ")"
      : "ambiente gia' a posto, nessuna correzione",
  };
}

/** Le misure sono fatte: si puo' giudicare. */
export function misuraFatta(seq) { return passa(seq, "giudizio", "misure raccolte"); }

/** Tutto fatto. */
export function giudizioFatto(seq) { return passa(seq, "pronto", "analisi concluse"); }

/** Si puo' simulare? Solo a valle di tutto: prima i numeri sono provvisori. */
export function puoSimulare(seq) { return !!seq && seq.fase === "pronto"; }

/**
 * Una misura presa in questa fase e' affidabile?
 *
 * Serve a marcare la provenienza in modo onesto: un valore raccolto mentre
 * l'ambiente e' ancora in sistemazione non e' una misura, e' un dato
 * provvisorio che verra' rifatto.
 */
export function misuraAffidabile(seq) {
  return !!seq && (seq.fase === "misura" || seq.fase === "giudizio" || seq.fase === "pronto");
}

/** Dove siamo, in italiano. */
export function raccontaFase(seq) {
  if (!seq) return "Nessun modello in lavorazione.";
  switch (seq.fase) {
    case "attesa": return "In attesa di un modello.";
    case "ambiente": return "Sto sistemando l'ambiente: scala e appoggio a terra." +
      (seq.correzioni.length ? " Correzioni finora: " + seq.correzioni.join(", ") + "." : "");
    case "misura": return "Ambiente a posto. Sto misurando lo spazio.";
    case "giudizio": return "Misure raccolte. Sto valutando visibilita', accessibilita', affollamento ed esodo.";
    case "pronto": return "Analisi concluse: si puo' simulare.";
    default: return "Fase sconosciuta.";
  }
}

export default { FASI, MAX_PASSATE, nuovaSequenza, avvia, registraPassata,
                 misuraFatta, giudizioFatto, puoSimulare, misuraAffidabile, raccontaFase };
