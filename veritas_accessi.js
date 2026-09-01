// =============================================================================
// VERITAS — GLI ACCESSI. Da dove si entra, e quanti modi ci sono.
// =============================================================================
//
// PERCHE' ESISTE QUESTO FILE
//
// Il 01/09/2026 la simulazione aveva UN FLUSSO SOLO, quello che arriva dal
// tunnel dell'aereo. Raffaella: *«dovrebbe assegnare anche l'ingresso dalla
// strada: occhio e cervello riconoscono l'aeroporto e assegnano TUTTI i flussi
// che si generano, non solo uno.»*
//
// `veritas_flussi.js` ha dato al motore il posto dove tenere piu' di un flusso.
// Questo file trova **da dove nascono**.
//
// COME SI TROVA UN INGRESSO: PIU' INDIZI CHE SONO D'ACCORDO
//
// La prima stesura aveva una regola sola, ed era geometrica: «dove il tetto
// finisce e si continua a camminare, li' si entra». E' una buona regola, ma da
// sola non regge, e il 02/09 e' stata MISURATA sul modello vero:
//
//     1.544 campioni calpestabili — 36 coperti (2%), 1.508 scoperti.
//
// Questo modello e' uno SPACCATO: il tetto e' stato tolto per far vedere
// dentro. La regola del tetto, qui, non e' imprecisa: e' CIECA, e dove parla
// dice il falso — troverebbe una fila di ingressi lungo il taglio.
//
// Raffaella l'aveva detto prima della misura: *«si' all'architettura, ma
// + indizi visivi + segnaletica + persone + oggetti»*. Ed e' la regola generale,
// non un rattoppo per questo file: **un accesso e' un posto dove PIU' INDIZI
// INDIPENDENTI SONO D'ACCORDO, e quanti sono d'accordo e' la sua
// affidabilita'** — il numero che va nel referto.
//
// LE VOCI. Ognuna guarda una cosa sola e propone dei posti; nessuna decide.
//
//   1. IL TETTO CHE FINISCE — dove il coperto tocca lo scoperto (`voceTetto`).
//      Si dichiara CIECA da sola quando i coperti sono pochissimi: su uno
//      spaccato tace invece di mentire.
//   2. LA SEGNALETICA DEL MODELLO — le corsie e le frecce dipinte le ha messe
//      chi ha disegnato lo spazio, e dicono da dove si passa. Una corsia e' una
//      catena di macchie della stessa tinta: i suoi DUE CAPI sono un posto da
//      cui si entra e un posto dove si arriva (`voceSegnaletica`).
//   3. LE PERSONE GIA' MODELLATE — dove le figure stanno IN FILA c'e' una
//      porta, un banco o una coda: i capi della fila (`vocePersone`).
//   4. GLI OGGETTI — le cose ripetute e messe in fila attraversano un
//      passaggio e lo segnano: tornelli, banchi, transenne (`voceOggetti`).
//
// Nessuna parola di tipologia, nessun nome di mesh (Regola 0-bis): «catena di
// macchie della stessa tinta», «figure in fila», «oggetti in fila» valgono in
// una scuola, in un ospedale, in un negozio e in un museo.
//
// ⚠️ Un capo di corsia puo' essere una meta invece di un ingresso, e una fila
//    di persone puo' essere una cassa invece di una porta. E' proprio per
//    questo che UNA VOCE SOLA NON BASTA: si tiene solo cio' su cui almeno due
//    voci diverse cadono nello stesso posto (`VOCI_MINIME`).
//
// ⚠️ Il conto si fa UNA VOLTA, al caricamento del modello, e resta. Non e' una
//    cosa da rifare a ogni fotogramma ne' a ogni corsa della simulazione.
// =============================================================================

/** Quanto si allarga la griglia dei campioni, in metri. */
export const PASSO = 2.0;

/** Oltre questo numero di campioni si allarga il passo: un aeroporto non deve
 *  costare piu' di una stanza solo perche' e' grande. */
export const CAMPIONI_MAX = 4000;

/** Due indizi entro questa distanza in pianta parlano dello stesso posto.
 *  E' la larghezza di un atrio d'ingresso, non di una stanza. */
export const VICINO = 6.0;

/** Quante voci diverse devono cadere nello stesso posto perche' sia un
 *  accesso. Con una sola si prenderebbe ogni meta e ogni cassa. */
export const VOCI_MINIME = 2;

/** Sotto questa frazione di campioni coperti, il tetto non sa dire niente:
 *  il modello e' uno spaccato o un esterno, e la voce si dichiara cieca. */
export const COPERTURA_CIECA = 0.10;

/** Due macchie della stessa tinta piu' vicine di cosi' sono la stessa corsia. */
export const CATENA = 12.0;

/** Quanto in alto puo' stare una segnaletica sopra il piano su cui si cammina:
 *  comprende la vernice per terra e le fasce appese poco sopra la testa. */
export const SEGNALETICA_ALTA = 2.5;

/** Saturazione oltre la quale un colore e' vernice e non architettura. E' la
 *  stessa distinzione di `veritas_segnaletica.js`, e per la stessa ragione:
 *  cemento, intonaco e moquette sono neutri, la segnaletica deve farsi vedere. */
export const SATURAZIONE_MIN = 0.35;

// ---------------------------------------------------------------------------
// Attrezzi comuni
// ---------------------------------------------------------------------------

/** Distanza in pianta: il piano su cui si sta lo tiene a parte chi chiama. */
function dXZ(a, b) { return Math.hypot(a[0] - b[0], a[2] - b[2]); }

/** RGB 0..1 -> tinta in gradi e saturazione. Copia minima di
 *  `veritas_segnaletica.js`: qui serve solo separare il saturo dal neutro. */
export function tintaSat(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const lum = (max + min) / 2, d = max - min;
  if (d < 1e-9) return { tinta: 0, sat: 0, lum };
  const sat = lum > 0.5 ? d / (2 - max - min) : d / (max + min);
  let t;
  if (max === r) t = ((g - b) / d) % 6;
  else if (max === g) t = (b - r) / d + 2;
  else t = (r - g) / d + 4;
  t *= 60; if (t < 0) t += 360;
  return { tinta: t, sat, lum };
}

/**
 * I DUE CAPI di un insieme di punti: la coppia piu' lontana.
 *
 * Si prende il punto piu' lontano dal baricentro, e poi il piu' lontano da
 * quello. E' l'approssimazione classica del diametro, e su una corsia dipinta
 * o su una fila di persone da' esattamente i due estremi.
 */
export function capi(punti) {
  if (!punti || !punti.length) return [];
  if (punti.length === 1) return [punti[0]];
  let cx = 0, cz = 0;
  for (const p of punti) { cx += p[0]; cz += p[2]; }
  cx /= punti.length; cz /= punti.length;
  let a = punti[0], d = -1;
  for (const p of punti) { const k = dXZ(p, [cx, 0, cz]); if (k > d) { d = k; a = p; } }
  let b = punti[0]; d = -1;
  for (const p of punti) { const k = dXZ(p, a); if (k > d) { d = k; b = p; } }
  return dXZ(a, b) < 1e-6 ? [a] : [a, b];
}

/**
 * Raggruppa dei punti che si toccano: catena singola, in pianta, a parita' di
 * piano. Serve alle corsie, alle file e alle soglie, che sono tutte la stessa
 * operazione fatta su cose diverse.
 */
export function raggruppa(punti, entro, dislivello = 2.0) {
  const presi = new Uint8Array(punti.length);
  const gruppi = [];
  for (let i = 0; i < punti.length; i++) {
    if (presi[i]) continue;
    const coda = [i]; presi[i] = 1;
    const g = [];
    while (coda.length) {
      const k = coda.pop();
      g.push(punti[k]);
      for (let j = 0; j < punti.length; j++) {
        if (presi[j]) continue;
        if (dXZ(punti[k], punti[j]) <= entro
          && Math.abs(punti[k][1] - punti[j][1]) <= dislivello) { presi[j] = 1; coda.push(j); }
      }
    }
    gruppi.push(g);
  }
  return gruppi;
}

// ---------------------------------------------------------------------------
// Il campionamento del calpestabile, e chi ha un tetto sopra la testa
// ---------------------------------------------------------------------------

/**
 * Campiona la superficie calpestabile: dove si puo' mettere un piede.
 * Usa la navmesh, che e' l'unica che sappia dove si cammina davvero.
 */
export function campiona(nm, opz = {}) {
  const stato = nm && nm.stato && nm.stato();
  if (!stato || !stato.isole || !stato.isole.length) return [];
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const i of stato.isole)
    for (let k = 0; k < 3; k++) {
      if (i.ingombro.min[k] < min[k]) min[k] = i.ingombro.min[k];
      if (i.ingombro.max[k] > max[k]) max[k] = i.ingombro.max[k];
    }
  const lx = max[0] - min[0], lz = max[2] - min[2];
  if (!(lx > 0) || !(lz > 0)) return [];

  let passo = opz.passo || PASSO;
  const tetto = opz.campioniMax || CAMPIONI_MAX;
  // Il passo si allarga da solo finche' il conto sta nel tetto: cosi' una
  // stanza si guarda fitta e un terminal grossolano, senza toccare niente.
  while ((lx / passo) * (lz / passo) > tetto) passo *= 1.25;

  const punti = [];
  for (let x = min[0] + passo / 2; x < max[0]; x += passo)
    for (let z = min[2] + passo / 2; z < max[2]; z += passo) {
      // La quota non si sa: si cerca il pavimento in tutta l'altezza del
      // modello. Su due piani sovrapposti si prende quello che c'e'.
      const q = nm.sulCamminoCorrente([x, (min[1] + max[1]) / 2, z],
        [passo * 0.6, Math.max(4, (max[1] - min[1]) / 2 + 1), passo * 0.6]);
      if (q.ok) punti.push(q.punto);
    }
  return Object.assign(punti, { passo });
}

/**
 * Chi ha un tetto sopra la testa e chi no.
 *
 * Un raggio verso l'alto da ogni campione: se incontra geometria del modello
 * si e' dentro, altrimenti si e' fuori. Si parte poco sopra il pavimento per
 * non colpire il pavimento stesso.
 */
export function copertura(THREE, radice, punti, opz = {}) {
  const coperti = [], scoperti = [];
  if (!THREE || !radice || !punti || !punti.length) return { coperti, scoperti };
  const raggio = new THREE.Raycaster();
  // three-mesh-bvh, se c'e', si ferma al primo colpo: qui basta sapere SE
  // c'e' qualcosa sopra, non che cosa.
  raggio.firstHitOnly = true;
  const su = new THREE.Vector3(0, 1, 0);
  const da = new THREE.Vector3();
  const alto = opz.altezzaTesta != null ? opz.altezzaTesta : 2.0;
  for (const p of punti) {
    da.set(p[0], p[1] + alto, p[2]);
    raggio.set(da, su);
    raggio.far = opz.quantoInSu || 200;
    let colpi = [];
    try { colpi = raggio.intersectObject(radice, true); } catch (e) { colpi = []; }
    (colpi && colpi.length ? coperti : scoperti).push(p);
  }
  return { coperti, scoperti };
}

/**
 * Le SOGLIE: i punti coperti che toccano lo scoperto, raggruppati.
 *
 * Un gruppo di soglie vicine e' un accesso solo: una porta larga tre metri
 * campionata ogni due da' due punti, non due ingressi.
 */
export function accessiDaCopertura(coperti, scoperti, opz = {}) {
  const passo = opz.passo || PASSO;
  const vicino = passo * 1.6;
  if (!coperti.length || !scoperti.length) return [];

  // Chi, fra i coperti, ha dello scoperto a un passo.
  const soglie = [];
  for (const c of coperti) {
    for (const s of scoperti) {
      if (dXZ(c, s) <= vicino && Math.abs(c[1] - s[1]) <= (opz.dislivelloMax || 1.0)) {
        soglie.push(c); break;
      }
    }
  }
  if (!soglie.length) return [];

  const gruppi = raggruppa(soglie, vicino * 1.2, 1.0);

  const raggioPersona = (opz.persona && opz.persona.raggio) || 0.30;
  const out = [];
  for (const g of gruppi) {
    let sx = 0, sy = 0, sz = 0;
    const min = [Infinity, Infinity], max = [-Infinity, -Infinity];
    for (const p of g) {
      sx += p[0]; sy += p[1]; sz += p[2];
      if (p[0] < min[0]) min[0] = p[0]; if (p[0] > max[0]) max[0] = p[0];
      if (p[2] < min[1]) min[1] = p[2]; if (p[2] > max[1]) max[1] = p[2];
    }
    const centro = [sx / g.length, sy / g.length, sz / g.length];
    // La larghezza di un varco e' il suo lato lungo in pianta: una porta e'
    // larga quanto e' larga, non quanto e' profonda.
    const larghezza = Math.max(max[0] - min[0], max[1] - min[1]) + passo;
    if (larghezza < raggioPersona * 2) continue;
    out.push({ centro, larghezza, campioni: g.length });
  }
  // Il piu' largo per primo: un ingresso principale e' largo, una porta di
  // servizio no. Non e' una regola di tipologia, e' una misura.
  return out.sort((a, b) => b.larghezza - a.larghezza);
}

/**
 * Quanto edificio c'e' dietro una soglia: i campioni coperti raggiungibili a
 * piedi da li'. Serve a buttare le ombre — un'ala d'aereo che copre un pezzo
 * di piazzale fa una macchia di «coperto» che non e' un ingresso.
 */
export function profondita(nm, accesso, coperti, opz = {}) {
  const limite = opz.quantiControllare || 40;
  let dentro = 0, provati = 0;
  // Si guardano i coperti piu' lontani dalla soglia: se anche quelli si
  // raggiungono, dietro c'e' un edificio vero e non una tettoia.
  const ordinati = coperti.slice().sort((a, b) => dXZ(b, accesso.centro) - dXZ(a, accesso.centro));
  for (const c of ordinati) {
    if (provati >= limite) break;
    provati++;
    const r = nm.percorsoCorrente(accesso.centro, c);
    if (r && !r.parziale) dentro++;
  }
  return provati ? dentro / provati : 0;
}

// ---------------------------------------------------------------------------
// LE VOCI. Ognuna propone dei posti, nessuna decide.
// ---------------------------------------------------------------------------

/**
 * VOCE 1 — il tetto che finisce.
 *
 * Si dichiara CIECA quando i campioni coperti sono una frazione minima del
 * totale: e' il caso dello spaccato, dove il tetto e' stato tolto per far
 * vedere dentro, e ogni soglia trovata lungo il taglio sarebbe finta. Tacere
 * e' l'unica risposta onesta, e la dice nel log.
 */
export function voceTetto(THREE, radice, nm, punti, opz = {}) {
  const passo = (punti && punti.passo) || opz.passo || PASSO;
  const { coperti, scoperti } = copertura(THREE, radice, punti, opz);
  const quota = punti.length ? coperti.length / punti.length : 0;
  const voce = {
    nome: 'il tetto che finisce', punti: [], coperti: coperti.length,
    scoperti: scoperti.length, frazioneCoperta: quota,
  };
  if (quota < (opz.coperturaCieca != null ? opz.coperturaCieca : COPERTURA_CIECA)) {
    voce.cieca = true;
    voce.perche = 'coperti ' + coperti.length + ' campioni su ' + punti.length
      + ': il modello non ha un tetto sopra il calpestabile (spaccato o esterno), '
      + 'e ogni soglia trovata lungo il taglio sarebbe finta';
    return voce;
  }
  const grezzi = accessiDaCopertura(coperti, scoperti, { ...opz, passo });
  const minimo = opz.profonditaMinima != null ? opz.profonditaMinima : 0.25;
  for (const a of grezzi) {
    a.profondita = profondita(nm, a, coperti, opz);
    // Dietro una soglia vera c'e' dell'edificio raggiungibile a piedi. Se non
    // c'e', e' una tettoia: un'ala d'aereo, una pensilina.
    if (a.profondita < minimo) continue;
    voce.punti.push({ centro: a.centro, larghezza: a.larghezza, campioni: a.campioni });
  }
  return voce;
}

/**
 * Le macchie di segnaletica del modello, lette dalla scena.
 *
 * Piatte e sature, appoggiate a un piano su cui si cammina. Il colore si legge
 * dal materiale: quando sta in una texture non si legge, e allora questa voce
 * porta solo quello che trova — e' una voce, non un giudice.
 */
export function segnaleticaDallaScena(THREE, radice, opz = {}) {
  const marchi = [];
  if (!THREE || !radice) return marchi;
  const satMin = opz.saturazioneMin != null ? opz.saturazioneMin : SATURAZIONE_MIN;
  const spessoreMax = opz.spessoreMax != null ? opz.spessoreMax : 0.5;
  const bb = new THREE.Box3();
  radice.updateMatrixWorld(true);
  radice.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!m || !m.color) return;
    const { tinta, sat, lum } = tintaSat(m.color.r, m.color.g, m.color.b);
    if (sat < satMin || lum < 0.10 || lum > 0.95) return;
    try { bb.setFromObject(o); } catch (e) { return; }
    // Piatta: una freccia per terra o una fascia appesa hanno spessore, non
    // altezza. Un pannello in piedi o un oggetto colorato non sono segnaletica.
    if (bb.max.y - bb.min.y > spessoreMax) return;
    marchi.push({
      centro: [(bb.min.x + bb.max.x) / 2, bb.min.y, (bb.min.z + bb.max.z) / 2],
      tinta,
    });
  });
  return marchi;
}

/**
 * VOCE 2 — la segnaletica del modello.
 *
 * Le macchie della stessa tinta che si toccano sono una corsia sola, e una
 * corsia ha DUE CAPI: da una parte si entra, dall'altra si arriva. Quale sia
 * quale non lo decide questa voce — lo decide l'accordo con le altre.
 *
 * Un capo vale solo se sta su un piano su cui si cammina: una freccia appesa a
 * dieci metri d'altezza non e' una soglia.
 */
export function voceSegnaletica(THREE, radice, nm, opz = {}) {
  const voce = { nome: 'la segnaletica del modello', punti: [], corsie: 0, marchi: 0 };
  const marchi = opz.marchi || segnaleticaDallaScena(THREE, radice, opz);
  voce.marchi = marchi.length;
  if (!marchi.length) { voce.cieca = true; voce.perche = 'nessuna macchia satura e piatta nel modello'; return voce; }

  // Per tinta: due colori diversi sono due percorsi diversi, e chi ha
  // disegnato il modello li ha distinti apposta.
  const perTinta = new Map();
  const larghezzaTinta = opz.larghezzaTinta || 25;
  for (const m of marchi) {
    const k = Math.round(m.tinta / larghezzaTinta);
    if (!perTinta.has(k)) perTinta.set(k, []);
    perTinta.get(k).push(m.centro);
  }
  const alta = opz.segnaleticaAlta != null ? opz.segnaleticaAlta : SEGNALETICA_ALTA;
  perTinta.forEach((punti) => {
    for (const catena of raggruppa(punti, opz.catena || CATENA, 3.0)) {
      voce.corsie++;
      for (const c of capi(catena)) {
        // Il capo si appoggia sul calpestabile piu' vicino sotto di se': la
        // vernice sta sul pavimento, la fascia sta sopra di esso.
        const q = nm.sulCamminoCorrente(c, [4, alta * 2, 4]);
        if (!q || !q.ok) continue;
        if (Math.abs(q.punto[1] - c[1]) > alta) continue;
        voce.punti.push({ centro: q.punto, corsia: catena.length });
      }
    }
  });
  return voce;
}

/**
 * VOCE 3 — le persone gia' modellate.
 *
 * Chi ha fatto il modello ha messo delle figure, e dove le ha messe IN FILA
 * c'e' qualcosa che si attraversa uno per volta: una porta, un banco, una
 * coda. I capi della fila sono i due posti da guardare.
 *
 * ⚠️ Le figure sono anche la CONTROPROVA (`veritas_controprova.js`), e li'
 *    servono a verificare, non a decidere. Qui non decidono nemmeno: sono UNA
 *    voce su quattro, e da sola non fa nascere niente.
 */
export function vocePersone(figure, opz = {}) {
  const voce = { nome: 'le persone gia\' nel modello', punti: [], file: 0, gruppi: 0 };
  const elenco = figure || [];
  voce.gruppi = elenco.length;
  if (!elenco.length) { voce.cieca = true; voce.perche = 'nessuna figura umana nel modello'; return voce; }
  for (const g of elenco) {
    const pezzi = (g.pezzi || []).map((p) => p.centro).filter(Boolean);
    if (g.disposizione !== 'fila' || pezzi.length < (opz.filaMinima || 3)) continue;
    voce.file++;
    for (const c of capi(pezzi)) voce.punti.push({ centro: c, persone: g.quante || pezzi.length });
  }
  return voce;
}

/**
 * VOCE 4 — gli oggetti.
 *
 * Le cose ripetute e messe in fila stanno di traverso a un passaggio e lo
 * segnano: tornelli, banchi, transenne, sedute allineate lungo un fronte. Non
 * e' una parola di tipologia — e' una disposizione, e `veritas_cose.js` l'ha
 * gia' misurata.
 */
export function voceOggetti(cose, opz = {}) {
  const voce = { nome: 'gli oggetti in fila', punti: [], file: 0, gruppi: 0 };
  const elenco = cose || [];
  voce.gruppi = elenco.length;
  if (!elenco.length) { voce.cieca = true; voce.perche = 'nessun gruppo di oggetti ripetuti'; return voce; }
  const eFigura = opz.eFigura;
  for (const g of elenco) {
    if (eFigura && eFigura(g)) continue;          // le persone hanno la loro voce
    const pezzi = (g.pezzi || []).map((p) => p.centro).filter(Boolean);
    if (g.disposizione !== 'fila' || pezzi.length < (opz.filaMinima || 3)) continue;
    voce.file++;
    for (const c of capi(pezzi)) voce.punti.push({ centro: c, oggetti: g.quante || pezzi.length });
  }
  return voce;
}

// ---------------------------------------------------------------------------
// L'accordo fra le voci
// ---------------------------------------------------------------------------

/**
 * Mette insieme le voci: i posti vicini fra loro sono lo stesso posto, e le
 * VOCI DIVERSE che ci cadono sono la sua affidabilita'.
 *
 * Due indizi della stessa voce non fanno un accesso piu' sicuro — due frecce
 * della stessa corsia sono la stessa freccia detta due volte. Contano le voci
 * DIVERSE, ed e' il senso di «piu' indizi sono d'accordo».
 */
export function uniscoVoci(voci, nm, opz = {}) {
  const vive = (voci || []).filter((v) => v && !v.cieca && v.punti && v.punti.length);
  const tutti = [];
  for (const v of vive) for (const p of v.punti) tutti.push({ ...p, voce: v.nome });
  if (!tutti.length) return { accessi: [], scartati: [], vociVive: vive.length };

  const vicino = opz.vicino != null ? opz.vicino : VICINO;
  const posizioni = tutti.map((t) => t.centro);
  // Si raggruppa sugli indici, non sui punti: serve sapere DA CHI viene ognuno.
  const indici = posizioni.map((p, i) => [p[0], p[1], p[2], i]);
  const gruppi = raggruppa(indici, vicino, opz.dislivelloVoci != null ? opz.dislivelloVoci : 2.0);

  const minime = opz.vociMinime != null ? opz.vociMinime : VOCI_MINIME;
  const accessi = [], scartati = [];
  for (const g of gruppi) {
    const membri = g.map((p) => tutti[p[3]]);
    const nomi = [];
    for (const m of membri) if (nomi.indexOf(m.voce) < 0) nomi.push(m.voce);
    let sx = 0, sy = 0, sz = 0;
    for (const m of membri) { sx += m.centro[0]; sy += m.centro[1]; sz += m.centro[2]; }
    let centro = [sx / membri.length, sy / membri.length, sz / membri.length];
    // Un ingresso e' un posto dove si mette un piede: si appoggia sul
    // calpestabile, altrimenti la tappa che ne nasce non si raggiunge.
    const q = nm && nm.sulCamminoCorrente(centro, [vicino, 6, vicino]);
    if (q && q.ok) centro = q.punto;
    let larghezza = 0;
    for (const m of membri) if (m.larghezza > larghezza) larghezza = m.larghezza;
    const a = {
      centro, voci: nomi, affidabilita: nomi.length,
      fiducia: vive.length ? nomi.length / vive.length : 0,
      indizi: membri.length, larghezza: larghezza || undefined,
      sulCammino: !!(q && q.ok),
    };
    if (nomi.length < minime) {
      a.perche = 'un indizio solo (' + nomi.join(', ') + '): puo\' essere una meta, non un ingresso';
      scartati.push(a);
      continue;
    }
    accessi.push(a);
  }
  // Prima i piu' sicuri; a parita', quelli su cui cadono piu' indizi.
  accessi.sort((a, b) => (b.affidabilita - a.affidabilita) || (b.indizi - a.indizi));
  accessi.forEach((a, i) => { a.nome = 'Accesso ' + (i + 1); });
  return { accessi, scartati, vociVive: vive.length };
}

/**
 * Trova gli accessi del modello. Da chiamare una volta, a modello caricato.
 */
export function trova(THREE, radice, nm, opz = {}) {
  const punti = campiona(nm, opz);
  if (!punti.length) return { accessi: [], voci: [], perche: 'nessuna superficie calpestabile campionata' };

  const cose = opz.cose || (typeof window !== 'undefined' && window.__veritasCoseTrovate
    && window.__veritasCoseTrovate.cose) || [];
  const CP = opz.controprova || (typeof window !== 'undefined' && window.__veritasControprova) || null;
  const figure = CP && CP.figure ? CP.figure(cose) : [];

  const voci = [
    voceTetto(THREE, radice, nm, punti, opz),
    voceSegnaletica(THREE, radice, nm, opz),
    vocePersone(figure, opz),
    voceOggetti(cose, { ...opz, eFigura: CP && CP.eUnaFigura }),
  ];
  const r = uniscoVoci(voci, nm, opz);
  r.voci = voci.map((v) => ({
    nome: v.nome, punti: v.punti.length, cieca: !!v.cieca, perche: v.perche,
  }));
  r.campioni = punti.length;
  r.passo = punti.passo;
  const massimo = opz.massimoAccessi || 8;
  if (r.accessi.length > massimo) r.accessi = r.accessi.slice(0, massimo);
  return r;
}

/** Riassunto in italiano normale. */
export function raccontaAccessi(r) {
  const a = (r && r.accessi) || [];
  if (!a.length) {
    const mute = ((r && r.voci) || []).filter((v) => v.cieca);
    return 'Non ho trovato nessun ingresso su cui piu indizi siano d\'accordo'
      + (mute.length ? ' (' + mute.map((v) => v.nome + ': ' + v.perche).join('; ') + ')' : '') + '.';
  }
  return 'Ho trovato ' + a.length + (a.length === 1 ? ' ingresso' : ' ingressi') + ': '
    + a.map((x) => x.nome + ', ' + x.affidabilita + ' indizi d\'accordo ('
      + x.voci.join(' + ') + ')').join('; ')
    + '. Un ingresso e dove piu indizi diversi cadono nello stesso posto.';
}

export default {
  PASSO, CAMPIONI_MAX, VICINO, VOCI_MINIME, COPERTURA_CIECA, CATENA,
  campiona, copertura, accessiDaCopertura, profondita,
  capi, raggruppa, tintaSat, segnaleticaDallaScena,
  voceTetto, voceSegnaletica, vocePersone, voceOggetti, uniscoVoci,
  trova, raccontaAccessi,
};

// ---------------------------------------------------------------------------
// Si aggancia da solo al caricamento del modello
// ---------------------------------------------------------------------------
//
// Dopo la navmesh, che serve: senza sapere dove si cammina non si sa neanche
// dove si entra. Il risultato resta in `window.__veritasAccessi`, e da li' lo
// legge `veritas_flussi.js` per far nascere un flusso da ogni ingresso.
//
// ⚠️ I flussi vengono costruiti quando si calcola la traiettoria, che di solito
//    e' gia' successo. Trovati gli accessi si richiede il calcolo, altrimenti
//    restano scritti in una variabile che nessuno rilegge fino al prossimo giro.

if (typeof window !== 'undefined') {
  const precedente = window.__veritasOnModelLoaded;
  window.__veritasOnModelLoaded = function (radice) {
    let out;
    try { out = precedente ? precedente.apply(this, arguments) : undefined; }
    catch (e) { console.error('[VERITAS accessi] errore nel passo precedente:', e); }

    const THREE = window.THREE;
    const root = radice || window.__veritasModelRoot;
    if (!THREE || !root) return out;

    // Si aspetta la navmesh: e' costruita da un altro modulo, un giro di
    // eventi dopo. Si prova qualche volta e poi si rinuncia dicendolo.
    let tentativi = 0;
    const prova = function () {
      const nm = window.__veritasNavmesh;
      if (!nm || !nm.stato()) {
        if (++tentativi > 40) { console.warn('[VERITAS accessi] navmesh non pronta: ingressi non cercati'); return; }
        setTimeout(prova, 500);
        return;
      }
      try {
        const t0 = performance.now();
        const r = trova(THREE, root, nm);
        r.ms = Math.round(performance.now() - t0);
        window.__veritasAccessi = r;
        console.log('[VERITAS accessi] ' + raccontaAccessi(r) + ' (' + r.ms + ' ms)');
        for (const v of r.voci || [])
          console.log('[VERITAS accessi] voce «' + v.nome + '»: '
            + (v.cieca ? 'MUTA — ' + v.perche : v.punti + ' posti proposti'));
        if (r.scartati && r.scartati.length)
          console.log('[VERITAS accessi] scartati ' + r.scartati.length
            + ' posti con un indizio solo (una voce da sola non fa un ingresso)');
        if (r.accessi.length) {
          if (typeof window.__veritasAnnounce === 'function') {
            try { window.__veritasAnnounce(raccontaAccessi(r)); } catch (e) {}
          }
          // Adesso i flussi possono nascere anche dagli ingressi misurati.
          if (typeof window.__veritasRicalcolaTraiettoria === 'function') {
            try { window.__veritasRicalcolaTraiettoria(); }
            catch (e) { console.error('[VERITAS accessi] traiettoria non rifatta:', e); }
          }
        }
      } catch (e) {
        console.error('[VERITAS accessi] non riuscito:', e);
      }
    };
    setTimeout(prova, 300);
    return out;
  };
  window.__veritasAccessiModulo = {
    PASSO, VICINO, VOCI_MINIME, campiona, copertura, accessiDaCopertura, profondita,
    capi, raggruppa, segnaleticaDallaScena, voceTetto, voceSegnaletica,
    vocePersone, voceOggetti, uniscoVoci, trova, raccontaAccessi,
  };
  console.log('[VERITAS accessi] pronto — window.__veritasAccessi dopo il caricamento');
}
