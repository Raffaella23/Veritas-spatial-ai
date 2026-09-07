// veritas_comando.js — L'OCCHIO COMANDA, E VIENE ASCOLTATO PER PRIMO.
// =============================================================================
//
// Raffaella, 07/09/2026: *«e allora imponi che l'occhio venga ascoltato prima
// di qualsiasi altra cosa. Avevo già chiesto, e lo troverai scritto da qualche
// parte, che l'occhio deve avere dei superpoteri. Ma non mi sembra che abbia
// dei suoi poteri.»*
//
// ⚠️ ED È SCRITTO DAVVERO — direttiva 17, «IL SUPERPOTERE DELL'OCCHIO: la
//    parola vista TIRA LA CONSEGUENZA», e Regola 0 punto 2, «l'occhio guarda
//    per primo, il cervello valida». Il potere c'era sulla carta e non nei
//    fatti, per una ragione sola e meccanica: **una questione di tempi.**
//
//    Gli spazi si misurano appena il modello è entrato. L'occhio ci mette
//    minuti — su questo modello ne guarda ventiquattro, di viste. Quando
//    finalmente parla, **nessuno lo riascolta**: gli ingressi sì, gli ambienti
//    no. Quindi la sua testimonianza arriva sempre a cose già decise, e tutto
//    quello che ne dovrebbe discendere — il confine dentro/fuori, il piazzale
//    tolto dal calpestabile, l'accesso dalla strada — non succede mai.
//
//    Non era un difetto di logica: era che nessuno lo ascoltava. Misurato il
//    07/09 col referto della catena: anelli 3, 5 e 6 tutti in attesa dell'anello
//    che non veniva mai riletto.
//
// QUESTO FILE FA UNA COSA SOLA: quando l'occhio ha detto qualcosa di NUOVO,
// rifà l'analisi. Non decide niente, non misura niente, non nomina niente —
// **dà la parola a chi ce l'ha già.**
//
// ⚠️ E LO DICHIARA, coi numeri di prima e di dopo. Una rianalisi silenziosa che
//    cambia i metri quadri sotto i piedi di chi guarda è peggio di non farla.

// Quanto si aspetta prima di rifare: l'occhio consegna a raffica mentre gira,
// e rifare a ogni vista vorrebbe dire non finire mai.
const RESPIRO = 9000;
// E non si rifà due volte per la stessa cosa: sotto questo distanza si aspetta.
const MINIMO_FRA_DUE = 25000;

const S = { ultimo: 0, attesa: null, quante: 0, giri: 0 };

/** Quanto ha consegnato l'occhio, in tutto. */
function quantoHaDetto() {
  if (typeof window === 'undefined') return 0;
  const pianta = ((window.__veritasVisto || {}).viste) || [];
  const regioni = window.__veritasVisteRegione || [];
  return pianta.length + regioni.length;
}

function foto() {
  if (typeof window === 'undefined') return {};
  const P = window.__veritasPercezione || {};
  const A = window.__veritasAccessi || {};
  const acc = A.accessi || [];
  return {
    m2: P.totalNavigableM2 || 0,
    ambienti: (P.zones || []).length,
    accessi: acc.length,
    daFuori: acc.filter((a) => /fuori|outside/i.test(a.nome || '')).length,
  };
}

/**
 * Rifà l'analisi con la testimonianza dell'occhio in mano.
 *
 * ⚠️ `__veritasAssegnazioneAutorevole` va messo a `true` e RIMESSO a `false`
 *    sempre, anche se qualcosa esplode: e' quello che dice al programma che
 *    questa passata ha l'autorita' per riscrivere le assegnazioni. Lasciarlo
 *    acceso vorrebbe dire che ogni passata successiva si crede autorevole.
 */
export function riascolta(perche) {
  if (typeof window === 'undefined') return null;
  if (typeof window.__veritasRianalizzaModello !== 'function') {
    console.warn('[VERITAS comando] l’occhio ha parlato ma non so rifare l’analisi:'
      + ' `__veritasRianalizzaModello` non c’è. La sua testimonianza resta inascoltata.');
    return null;
  }
  const prima = foto();
  S.giri++;
  console.log('[VERITAS comando] l’occhio ha parlato (' + quantoHaDetto()
    + ' cose viste): rifaccio l’analisi — ' + perche);
  try {
    window.__veritasAssegnazioneAutorevole = true;
    window.__veritasRianalizzaModello();
  } catch (e) {
    console.warn('[VERITAS comando] la rianalisi è fallita: ' + ((e && e.message) || e));
    return null;
  } finally {
    window.__veritasAssegnazioneAutorevole = false;
  }
  const dopo = foto();
  const d = (a, b) => (a === b ? String(b) : a + ' → ' + b);
  console.log('[VERITAS comando] dopo aver ascoltato l’occhio: '
    + d(Math.round(prima.m2), Math.round(dopo.m2)) + ' m² · '
    + d(prima.ambienti, dopo.ambienti) + ' ambienti · '
    + d(prima.daFuori, dopo.daFuori) + ' accessi «da fuori»');
  // ⚠️ E se non e' cambiato NIENTE lo si dice, invece di lasciar credere che
  //    l'ascolto abbia prodotto qualcosa. Un giro che non cambia niente e' un
  //    dato, non un successo.
  if (prima.m2 === dopo.m2 && prima.ambienti === dopo.ambienti
      && prima.daFuori === dopo.daFuori) {
    console.warn('[VERITAS comando] ascoltato, e non è cambiato niente.'
      + ' O la testimonianza non arriva fin qui, o non ha niente da dire su'
      + ' questo modello. Da guardare col referto della catena.');
  }
  try { if (window.__veritasCatena) window.__veritasCatena.stampa(); } catch (e) {}
  return { prima, dopo };
}

if (typeof window !== 'undefined') {
  const forse = () => {
    const ora = Date.now();
    const quante = quantoHaDetto();
    // ⚠️ Solo se ha detto qualcosa di NUOVO. Rifare l'analisi su una
    //    testimonianza gia' ascoltata e' lavoro sprecato che sposta i numeri
    //    sotto i piedi di chi sta guardando.
    if (quante <= S.quante) return;
    if (ora - S.ultimo < MINIMO_FRA_DUE) return;
    S.quante = quante; S.ultimo = ora;
    riascolta('ha consegnato ' + quante + ' cose viste');
  };
  const fraPoco = () => {
    if (S.attesa) clearTimeout(S.attesa);
    S.attesa = setTimeout(() => { S.attesa = null; try { forse(); } catch (e) {} }, RESPIRO);
  };
  try {
    // L'occhio annuncia ogni vista appena finita (evento acceso il 05/09
    // apposta per la messa in scena): qui serve a sapere che ha parlato.
    window.addEventListener('veritas:vista', fraPoco);
    window.addEventListener('veritas:modello', fraPoco);
  } catch (e) {}
  window.__veritasComando = { riascolta, quantoHaDetto, stato: () => ({ ...S }) };
  console.log('[VERITAS comando] pronto — l’occhio comanda:'
    + ' quando parla, l’analisi si rifà. A mano: window.__veritasComando.riascolta()');
}

export default { riascolta, quantoHaDetto };
