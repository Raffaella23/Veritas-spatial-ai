// veritas_catena.js — IL REFERTO DELLA CATENA.
// =============================================================================
//
// Raffaella, 07/09/2026: *«perché abbiamo ancora tutti questi problemi dal
// momento che sono settimane che lavoriamo su questa parte?»* — e poi:
// *«falla subito»*.
//
// ⚠️ LA RISPOSTA MISURATA, E NON È CHE QUESTA PARTE SIA DIFFICILE. È che la
//    catena è lunga e **ogni anello si stacca in silenzio**:
//
//        modello → occhio → testimonianza → spazi → confine dentro/fuori
//              → accessi → tappe → cammino → film
//
//    Quando un anello si stacca, tutto il resto **continua a girare e a
//    produrre numeri plausibili**. Non esce un errore: esce un risultato
//    sbagliato che sembra giusto. Tre volte in una settimana sola:
//      · 04/09 — `occhioSuTutteLeViste()` scritta bene e MAI CHIAMATA: per
//        settimane l'occhio ha guardato solo la pianta, e nessuno poteva
//        saperlo perché il ripiego funzionava;
//      · 05/09 — un gancio cade dentro una rigenerazione: **83 m²** al posto di
//        3.364, per due giorni, con scritto «metri quadri» accanto;
//      · 07/09 — un modulo scritto sopra un altro: di nuovo **83 m²**.
//    Tutte e tre la stessa malattia: **usare una cosa che non esiste non è un
//    errore di sintassi.**
//
// ⚠️ E LE PROVE CHE C'ERANO NON POTEVANO PRENDERLE. Provano i PEZZI, e infatti
//    passavano tutte mentre la pagina era rotta. Nessuno provava la CATENA.
//
// Questo file non ripara niente: **dice dove si è staccata**, in cinque secondi
// invece che in due ore. E si accorge da solo quando succede di nuovo.
//
// ⚠️ NON INVENTA E NON ARROTONDA. Dove non può misurare scrive «non lo so», che
//    è diverso da «a posto». E distingue **«non ancora»** da **«rotto»**: l'occhio
//    che sta ancora guardando non è un guasto, è un'attesa. Confondere le due
//    cose è il modo più veloce per spegnere un allarme.
//
//   window.__veritasCatena()        → il referto, come oggetto
//   window.__veritasCatena.stampa() → il referto, in console
//
// ⚠️ RESTITUISCE il dato, non lo stampa e basta: le stampe ritardate arrivano
//    quando chi guardava ha già copiato (trappola del 06/09).

const OK = 'ok', ATTESA = 'attesa', ROTTO = 'rotto';
const FACCIA = { ok: 'ok    ', attesa: 'attesa', rotto: 'ROTTO ' };

const num = (x, d = 0) => (typeof x === 'number' && isFinite(x) ? x.toFixed(d) : '?');

function anello(n, nome, stato, misura, perche) {
  return { n, nome, stato, misura, perche: perche || null };
}

/** Il modello: c'è, ed è in metri? */
function anelloModello() {
  const T = typeof window !== 'undefined' ? window.THREE : null;
  const root = typeof window !== 'undefined' ? window.__veritasModelRoot : null;
  if (!T || !root) return anello(1, 'il modello', ROTTO, 'assente',
    'non c’è nessun modello nella scena: tutto il resto è senza oggetto');
  let b;
  try { b = new T.Box3().setFromObject(root); } catch (e) {
    return anello(1, 'il modello', ROTTO, 'non misurabile', (e && e.message) || String(e));
  }
  const L = b.max.x - b.min.x, H = b.max.y - b.min.y, P = b.max.z - b.min.z;
  const misura = num(L, 1) + ' × ' + num(P, 1) + ' m, alto ' + num(H, 1);
  // ⚠️ Un edificio più basso di una persona non è in metri, ed è la trappola
  //    che il 01/09 ha fatto sbagliare tutto quello che veniva dopo, in silenzio.
  if (H < 1.8) return anello(1, 'il modello', ROTTO, misura,
    'più basso di una persona: non è in metri, e ogni numero a valle è falso');
  return anello(1, 'il modello', OK, misura);
}

/** L'occhio: acceso, e con che motore. */
function anelloOcchio() {
  const R = typeof window !== 'undefined' ? window.__veritasRiconosce : null;
  if (!R || typeof R.stato !== 'function')
    return anello(2, 'l’occhio', ROTTO, 'non collegato',
      'il modulo del riconoscimento non ha messo la sua maniglia');
  const s = R.stato() || {};
  if (s.fase === 'pronto')
    return anello(2, 'l’occhio', OK, 'acceso (' + (s.device || '?') + '/' + (s.dtype || '?') + ')');
  if (s.fase === 'spento' || s.fase === 'apre')
    return anello(2, 'l’occhio', ATTESA, s.fase, 'non ha ancora finito di accendersi');
  return anello(2, 'l’occhio', ROTTO, s.fase || '?', s.perche || 'non si è aperto');
}

/**
 * La testimonianza: che cosa l'occhio ha CONSEGNATO a chi deve decidere.
 *
 * ⚠️ È l'anello che si è staccato per settimane senza che nessuno lo sapesse
 *    (04/09): l'occhio guardava e quello che vedeva non usciva. Da qui in poi
 *    tutto dipende da questi due numeri.
 */
function anelloTestimonianza(occhioAcceso) {
  const W = typeof window !== 'undefined' ? window : {};
  const pianta = ((W.__veritasVisto || {}).viste) || [];
  const regioni = W.__veritasVisteRegione || [];
  const conPosto = pianta.filter((v) => v && v.centro).length;
  const misura = conPosto + ' dalla pianta (con una posizione) · '
    + regioni.length + ' dai primi piani (legate a un’area)';
  if (conPosto || regioni.length) return anello(3, 'la testimonianza', OK, misura);
  return anello(3, 'la testimonianza', occhioAcceso ? ATTESA : ROTTO, 'niente',
    occhioAcceso
      ? 'l’occhio è acceso ma non ha ancora consegnato: sta guardando'
      : 'l’occhio non è acceso, quindi non consegnerà mai niente');
}

/** Gli spazi misurati. */
function anelloSpazi() {
  const P = typeof window !== 'undefined' ? window.__veritasPercezione : null;
  if (!P) return anello(4, 'gli spazi', ATTESA, 'non ancora calcolati');
  const z = P.zones || [], g = P.gateways || [];
  const misura = z.length + ' ambienti · ' + num(P.totalNavigableM2, 0)
    + ' m² · ' + g.length + ' varchi';
  // ⚠️ 83 m² è la firma del guasto che si è ripetuto due volte: la passata
  //    buona non è partita e sono rimasti i numeri di prima della scala.
  if (P.totalNavigableM2 && P.totalNavigableM2 < 200)
    return anello(4, 'gli spazi', ROTTO, misura,
      'area troppo piccola per un edificio: la passata dopo il righello umano '
      + 'non è partita — è successo il 05/09 e di nuovo il 07/09');
  if (!z.length) return anello(4, 'gli spazi', ROTTO, misura, 'nessun ambiente misurato');
  return anello(4, 'gli spazi', OK, misura);
}

/**
 * Il confine dentro/fuori, e il piazzale.
 *
 * ⚠️ Non si deduce dai numeri delle zone: lo dichiara chi lo ha fatto
 *    (`__veritasTaglio`, scritto da `segmentZones`). Dedurlo vorrebbe dire
 *    indovinare, ed è esattamente il modo in cui questi guasti si nascondono.
 */
function anelloConfine(testimonianzaOk) {
  const T = typeof window !== 'undefined' ? window.__veritasTaglio : null;
  if (!T) return anello(5, 'il confine dentro/fuori', ATTESA, 'non ancora',
    'gli ambienti non sono ancora stati tagliati nemmeno una volta');
  let sep = 0, tolti = 0, m2 = 0, testAria = 0, testCalp = 0;
  for (const k of Object.keys(T)) {
    const t = T[k] || {};
    sep += t.passaggiLarghiTenutiSeparati || 0;
    tolti += t.ambientiToltiPerMezzi || 0;
    m2 += t.m2ToltiPerMezzi || 0;
    testAria += t.testimoniAriaAperta || 0;
    testCalp += t.testimoniCalpestio || 0;
  }
  const misura = sep + ' passaggi larghi non fusi · ' + tolti
    + ' ambienti tolti perché ci passano i mezzi (' + num(m2, 0) + ' m²)';
  if (!testAria && !testCalp)
    return anello(5, 'il confine dentro/fuori', testimonianzaOk ? ROTTO : ATTESA, misura,
      testimonianzaOk
        ? 'la testimonianza c’è ma agli ambienti non è arrivata: gli spazi sono '
          + 'stati calcolati PRIMA che l’occhio parlasse, e non si rifà da solo'
        : 'l’occhio non ha ancora parlato, quindi non c’è niente da tagliare');
  if (!sep && !tolti)
    return anello(5, 'il confine dentro/fuori', ROTTO, misura,
      'la testimonianza è arrivata ma non ha tagliato niente: da guardare');
  return anello(5, 'il confine dentro/fuori', OK, misura);
}

/** Gli accessi, e quanti danno sul fuori. */
function anelloAccessi() {
  const A = typeof window !== 'undefined' ? window.__veritasAccessi : null;
  if (!A) return anello(6, 'gli accessi', ATTESA, 'non ancora cercati');
  const acc = A.accessi || [];
  const fuori = acc.filter((a) => /fuori|outside/i.test(a.nome || '')).length;
  const misura = acc.length + ' accessi · ' + fuori + ' marcati «da fuori»';
  if (!acc.length) return anello(6, 'gli accessi', ROTTO, misura, 'nessun ingresso trovato');
  if (!fuori) return anello(6, 'gli accessi', ROTTO, misura,
    'nessuno dà sul fuori: il viaggio non può cominciare da chi arriva');
  return anello(6, 'gli accessi', OK, misura);
}

/**
 * Le tappe, e DA DOVE viene quello che sono.
 *
 * ⚠️ È la domanda che conta più del numero: una tappa nata da una misura o da
 *    quello che l'occhio ha visto vale; una nata dall'ordine sull'asse X è un
 *    riempimento — «tappe messe a caso», come le ha chiamate Raffaella.
 */
function anelloTappe() {
  const W = typeof window !== 'undefined' ? window : {};
  if (typeof W.__veritasGetNodes !== 'function')
    return anello(7, 'le tappe', ATTESA, 'non ancora');
  let n = [];
  try { n = W.__veritasGetNodes() || []; } catch (e) { /* niente */ }
  if (!n.length) return anello(7, 'le tappe', ROTTO, '0', 'nessuna tappa');
  const conto = {};
  for (const t of n) { const o = t.origine || 'senza origine'; conto[o] = (conto[o] || 0) + 1; }
  const dette = Object.keys(conto).map((k) => k + ' ' + conto[k]).join(' · ');
  const aCaso = (conto['sequenza'] || 0) + (conto['posizione'] || 0) + (conto['senza origine'] || 0);
  const misura = n.length + ' tappe · ' + dette;
  if (aCaso >= n.length / 2)
    return anello(7, 'le tappe', ROTTO, misura,
      'più di metà non viene da una misura né da quello che l’occhio ha visto: '
      + 'sono messe per posizione, cioè un riempimento');
  return anello(7, 'le tappe', OK, misura);
}

/**
 * Il cammino.
 *
 * ⚠️ NON SI CHIEDE A `__veritasGetTrajectory()` SE È VERO: quella restituisce
 *    la sequenza dimostrativa cablata nel bundle — 361 fotogrammi di un altro
 *    aeroporto — anche quando la simulazione non è mai partita, e senza
 *    dichiararlo. Si guarda invece se la simulazione È STATA AVVIATA.
 */
function anelloCammino() {
  const W = typeof window !== 'undefined' ? window : {};
  const partita = !!W.__veritasSimStarted;
  if (!partita) return anello(8, 'il cammino', ATTESA, 'simulazione non avviata',
    'finché non si preme play il film si inventa un percorso dagli ambienti, '
    + 'e qualunque traiettoria si chieda è quella finta del bundle');
  let passi = 0;
  try {
    const t = W.__veritasGetTrajectory ? W.__veritasGetTrajectory() : null;
    passi = (t && (t.frames || t.length)) || 0;
    if (t && t.frames && t.frames.length) passi = t.frames.length;
  } catch (e) { /* niente */ }
  return anello(8, 'il cammino', OK, 'simulazione avviata · ' + passi + ' fotogrammi');
}

/** Il film. */
function anelloFilm() {
  const C = typeof window !== 'undefined' ? window.veritasCinema : null;
  if (!C || typeof C.stato !== 'function')
    return anello(9, 'il film', ROTTO, 'non collegato', 'la finestra non ha messo la sua maniglia');
  const s = C.stato() || {};
  if (!s.aperto) return anello(9, 'il film', ATTESA, 'chiuso', 'non è stato aperto');
  const misura = s.zone + ' ambienti · ' + s.puntiTotali + ' punti · ' + s.muri
    + ' muri · cammino ' + (s.cammino ? s.passi + ' passi' : 'assente');
  if (!s.puntiTotali) return anello(9, 'il film', ROTTO, misura, 'non c’è niente da mostrare');
  return anello(9, 'il film', OK, misura);
}

export function catena() {
  const a1 = anelloModello();
  const a2 = anelloOcchio();
  const a3 = anelloTestimonianza(a2.stato === OK);
  const a4 = anelloSpazi();
  const a5 = anelloConfine(a3.stato === OK);
  const a6 = anelloAccessi();
  const a7 = anelloTappe();
  const a8 = anelloCammino();
  const a9 = anelloFilm();
  const anelli = [a1, a2, a3, a4, a5, a6, a7, a8, a9];
  // ⚠️ IL PRIMO ROTTO È QUELLO CHE CONTA. Tutti quelli dopo sono la sua ombra,
  //    e ripararli uno per uno è il modo di perdere una giornata — successo,
  //    misurato, più volte.
  const primoRotto = anelli.find((x) => x.stato === ROTTO) || null;
  return {
    anelli,
    primoRotto: primoRotto ? primoRotto.nome : null,
    perche: primoRotto ? primoRotto.perche : null,
    tutto: !primoRotto && anelli.every((x) => x.stato === OK),
  };
}

export function racconta(r) {
  const R = r || catena();
  const righe = R.anelli.map((x) =>
    '  ' + FACCIA[x.stato] + '  ' + (x.n + '. ' + x.nome + '                    ').slice(0, 26)
    + x.misura + (x.perche ? '\n           ⤷ ' + x.perche : ''));
  return '[VERITAS catena] dove si è staccata, adesso:\n' + righe.join('\n')
    + (R.primoRotto
        ? '\n  → IL PRIMO ANELLO ROTTO è «' + R.primoRotto
          + '»: tutti quelli dopo sono la sua ombra, e si riparte da lì.'
        : (R.tutto ? '\n  → la catena è intera.'
                   : '\n  → niente di rotto: qualcosa sta ancora lavorando.'));
}

if (typeof window !== 'undefined') {
  const f = () => catena();
  f.stampa = () => { const r = catena(); console.log(racconta(r)); return r; };
  f.racconta = racconta;
  window.__veritasCatena = f;

  // ⚠️ E SI STAMPA DA SOLA quando qualcosa di grosso è appena successo, perché
  //    un referto che bisogna ricordarsi di chiedere non lo chiede nessuno.
  //    Con un respiro di otto secondi: durante un giro dell'occhio gli eventi
  //    arrivano a raffica, e un referto per ognuno sarebbe rumore.
  let attesa = null;
  const fraPoco = () => {
    if (attesa) clearTimeout(attesa);
    attesa = setTimeout(() => { attesa = null; try { f.stampa(); } catch (e) {} }, 8000);
  };
  try {
    window.addEventListener('veritas:vista', fraPoco);
    window.addEventListener('veritas:modello', fraPoco);
    setTimeout(fraPoco, 25000);
  } catch (e) {}
  console.log('[VERITAS catena] pronto — window.__veritasCatena.stampa()');
}

export default { catena, racconta };
