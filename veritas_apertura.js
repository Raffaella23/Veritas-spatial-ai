// veritas_apertura.js — L'APERTURA. La pagina di attesa: la scena che prende
// forma, in diretta.
// =============================================================================
//
// Raffaella, 16/09/2026: «io mi immaginavo una scena vuota in prospettiva,
// renderizzata, in cui si accendevano progressivamente i volumi e parti di
// mesh identificate dall'occhio... agganciandoci direttamente all'oggetto 3D,
// renderizzato davanti all'osservatore, in diretta.»
//
// E la regola del 17/09/2026 (HANDOFF §9, regola 2), che si esegue e non si
// ridiscute: «finché l'occhio non ha ancora parlato, la scena mostra le zone
// che si accendono progressivamente, con i report che si aprono man mano
// lateralmente: il cliente deve avere un riscontro immediato, non un'attesa
// muta.»
//
// Raffaella, 18/09/2026, con quattro immagini di riferimento: «vorrei che la
// pagina di attesa avesse questo stile con una successione di stati. Il
// modello glb oppure il Gaussian Splat...». Da qui lo stile: fondo scuro col
// fumo, il modello vero in argilla scura, un report a terminale sul lato che
// passa per QUATTRO STATI in successione, ognuno con la sua tinta:
//   attesa (teal) → zone (viola) → conformità (rosso) → orientamento (ambra)
// e poi di nuovo zone → conformità → orientamento, con i dati aggiornati,
// finché l'occhio non ha parlato.
//
// ⚠️ SI MOSTRA SOLO CIO' CHE E' VERO (direttiva 10, e «rimuovi i codici
//    fittizi»). Le immagini di riferimento hanno numeri d'esempio («Semantic
//    Accuracy 94.2%», «Sector B-3»): qui NON ce n'e' nessuno. Ogni riga del
//    report viene da una misura del motore (zone, varchi, strettoie, norme,
//    ingressi, mappa di cammino) o dall'occhio; dove la misura non c'e' si
//    scrive «--». La conformita' e' quella di veritas_normative.js, con la
//    fonte e con «da validare», come quel file pretende.
//
// ⚠️ NON RIFA' I PUNTINI (tolti il 15/09): lo splat si mostra come splat.
//
// ⚠️ NON TOCCA LA SCENA VERA. Un GLB si replica condividendo la STESSA
//    geometria (per riferimento) con una materia d'argilla tutta nostra; uno
//    splat si replica condividendo gli STESSI dati (packedSplats), con un
//    SparkRenderer nostro, sul three dell'importmap (quello di Spark). Tutto in
//    un canvas e una scena NOSTRI, sopra un velo. Se questo file si spegne,
//    l'app sotto non se ne accorge. Si LEGGE e basta.
//
// ⚠️ IL VESTITO RESTA CARTA per la piattaforma (05/09). Lo scuro vale solo per
//    questa pagina, per decisione del 18/09; aprendo il velo si torna alla carta.
//
// MANOPOLE
//   window.__veritasAperturaAuto = false   per NON farla partire da sola
//   window.__veritasAperturaDurata         ms minimi di apertura (default 30000)
//
//   node --check veritas_apertura.js   ·   node veritas_apertura.test.mjs
// =============================================================================

// I TEMPI, e ognuno ha un tetto (HANDOFF §4, regola 10: niente attese
// indefinite).
//   · una zona nuova si accende ogni PASSO_ACCENSIONE;
//   · finche' l'occhio non ha parlato il velo NON si chiude da solo — e' la
//     regola 2 — ma mai oltre TETTO_ATTESA;
//   · quando l'occhio ha parlato si lascia il RESPIRO_DOPO_OCCHIO e si chiude;
//   · «Entra» chiude sempre, in ogni momento.
export const DURATA_MINIMA = 30000;
export const PASSO_ACCENSIONE = 900;
export const RESPIRO_DOPO_OCCHIO = 8000;
export const TETTO_ATTESA = 10 * 60 * 1000;
export const ATTESA_AVVIO_OCCHIO = 60000;
const ASSENZA_PRIMA_DI_SPEGNERE = 2000;
const BATTITO = 300;

// LA SUCCESSIONE DEGLI STATI. Ogni stato resta almeno DURATA_STATO, e si passa
// al successivo solo se ha qualcosa di vero da mostrare. Un clic su uno stato
// lo ferma per PAUSA_MANUALE: chi legge non deve vederselo cambiare sotto gli occhi.
export const STATI = ['attesa', 'zone', 'conformita', 'orientamento'];
export const DURATA_STATO = 9000;
export const DURATA_ATTESA = 3000;
const PAUSA_MANUALE = 20000;

// Le tinte: il grado delle velature del marchio (292 simulazione, 349 esiti,
// 63 norme) spinto per il fondo scuro, come nelle immagini di riferimento; il
// teal e' quello dei pulsanti e dei segni dell'occhio.
const TINTE = { attesa: '#2EE6D6', zone: '#A970FF', conformita: '#FF4D6D', orientamento: '#FFB020' };
const OCCHIO = '#5CF2E6';
const OK = '#5EEAD4';
const TESTO = '#D7DEE8';
const FIOCO = '#8A94A6';
const ARGILLA = 0x6b707a;

// ⚠️ 16/09/2026: solo queste due origini contano come «l'occhio ha parlato».
export const ORIGINI_OCCHIO = new Set(['occhi', 'comprensione']);

let S = null; // stato della sessione aperta corrente

function log(m) { try { console.log('[VERITAS apertura] ' + m); } catch (e) {} }

// ---------------------------------------------------------------------------
// LE REGOLE, SENZA SCENA — pure, provate in veritas_apertura.test.mjs
// ---------------------------------------------------------------------------

/** La chiave di una zona: lo stesso nodo nello stesso posto. */
export function chiaveNodo(n) {
  if (!n || !Array.isArray(n.pos)) return null;
  return (n.id || 'nodo') + '@' + Math.round(n.pos[0]) + ',' + Math.round(n.pos[2]);
}

/** Una zona e' confermata SOLO se la sua origine e' l'occhio. */
export function confermataDallOcchio(n) {
  return !!(n && ORIGINI_OCCHIO.has(n.origine));
}

function numero(x) { return (Math.round(x * 10) / 10).toFixed(1).replace('.', ','); }

/**
 * LE ZONE MISURATE, dal motore geometrico (`__veritasPercezione.zones`).
 * ⚠️ 17/09 sera: mai da `__veritasGetNodes()`, dove stavano le tappe cablate.
 */
export function zoneMisurate(percezione) {
  const zone = (percezione && Array.isArray(percezione.zones)) ? percezione.zones : [];
  let ambienti = 0, passaggi = 0;
  const out = [];
  zone.forEach((q, i) => {
    if (!q || typeof q.centroidX !== 'number' || typeof q.centroidZ !== 'number') return;
    const corridoio = q.kind === 'corridoio';
    const numero = corridoio ? ++passaggi : ++ambienti;
    out.push({
      id: 'ambiente_' + i,
      pos: [q.centroidX, typeof q.y === 'number' ? q.y : 0, q.centroidZ],
      label: (corridoio ? 'Passaggio ' : 'Ambiente ') + numero
        + (q.areaM2 > 0 ? ' · ' + Math.round(q.areaM2) + ' m²' : ''),
      origine: 'misura',
      passaggio: corridoio,
      areaM2: q.areaM2 > 0 ? q.areaM2 : null,
      formaLungo: q.formaLungo > 0 ? q.formaLungo : null,
      formaLargo: q.formaLargo > 0 ? q.formaLargo : null,
      formaAngolo: typeof q.formaAngolo === 'number' ? q.formaAngolo : null,
    });
  });
  return out;
}

/** Il punto (x, z) sta dentro l'impronta della zona? */
function dentroImpronta(z, x, zz) {
  const dx = x - z.pos[0], dz = zz - z.pos[2];
  if (z.formaLungo > 0 && z.formaLargo > 0) {
    const a = typeof z.formaAngolo === 'number' ? z.formaAngolo : 0;
    const u = dx * Math.cos(a) + dz * Math.sin(a);
    const v = -dx * Math.sin(a) + dz * Math.cos(a);
    return Math.abs(u) <= z.formaLungo / 2 && Math.abs(v) <= z.formaLargo / 2;
  }
  const r = z.areaM2 > 0 ? Math.sqrt(z.areaM2 / Math.PI) : 3;
  return dx * dx + dz * dz <= r * r;
}

/** Dove l'occhio ha parlato: ogni suo nodo si posa sulla zona che lo contiene. */
export function conLOcchio(zone, nodi, tipi) {
  const out = zone.map((z) => ({ ...z }));
  for (const n of (nodi || [])) {
    if (!confermataDallOcchio(n) || !Array.isArray(n.pos)) continue;
    let meglio = -1;
    out.forEach((z, i) => {
      if (confermataDallOcchio(z) && z.nodoOcchio) return;
      if (!dentroImpronta(z, n.pos[0], n.pos[2])) return;
      if (meglio < 0 || (z.areaM2 || Infinity) < (out[meglio].areaM2 || Infinity)) meglio = i;
    });
    const tipo = tipi && tipi.get ? tipi.get(chiaveNodo(n)) : null;
    if (meglio >= 0) {
      Object.assign(out[meglio], { origine: n.origine, label: n.label || out[meglio].label, nodoOcchio: n.id || true, tipo: tipo || null });
    } else {
      out.push({ ...n, tipo: tipo || null, nodoOcchio: n.id || true });
    }
  }
  return out;
}

/** La riga delle misure di una zona: solo quello che e' misurato. */
export function misureDi(n) {
  const parti = [];
  if (n && n.formaLungo > 0 && n.formaLargo > 0) parti.push(numero(n.formaLungo) + ' × ' + numero(n.formaLargo) + ' m');
  if (n && n.areaM2 > 0) parti.push(Math.round(n.areaM2) + ' m²');
  return parti.join(' · ');
}

/** Quando chiudere il velo (ms epoch). Regola 2 del §9. */
export function quandoChiudere({ nascita, occhioHaParlato, occhioAssente, ultimaNotizia, durataMinima }) {
  const tetto = nascita + TETTO_ATTESA;
  const minima = nascita + (durataMinima > 0 ? durataMinima : DURATA_MINIMA);
  if (!occhioHaParlato) return occhioAssente ? Math.min(tetto, minima) : tetto;
  return Math.min(tetto, Math.max(minima, (ultimaNotizia || nascita) + RESPIRO_DOPO_OCCHIO));
}

/** Confronta le zone accese con i nodi di adesso. */
export function confronta(accese, nodi) {
  const adesso = new Map();
  for (const n of (nodi || [])) {
    const k = chiaveNodo(n);
    if (k && !adesso.has(k)) adesso.set(k, n);
  }
  const nuove = [], promosse = [], spente = [], rinominate = [];
  for (const [k, n] of adesso) {
    const z = accese.get(k);
    if (!z) { nuove.push(k); continue; }
    if (confermataDallOcchio(n) && !z.confermata) promosse.push(k);
    else if (n.label && n.label !== z.label) rinominate.push(k);
  }
  for (const k of accese.keys()) if (!adesso.has(k)) spente.push(k);
  return { adesso, nuove, promosse, spente, rinominate };
}

/** Un numero nella lingua di chi legge; «--» se non e' un numero. */
export function formatta(x, cifre, lingua) {
  if (typeof x !== 'number' || !isFinite(x)) return '--';
  return new Intl.NumberFormat(lingua === 'it' ? 'it-IT' : 'en-US',
    { minimumFractionDigits: cifre, maximumFractionDigits: cifre }).format(x);
}
const metri = (x, L) => formatta(x, 2, L) + ' m';
const mq = (x, L) => (typeof x === 'number' && isFinite(x) ? formatta(Math.round(x), 0, L) + ' m²' : '--');

/**
 * Lo stato che viene dopo. `pronti` dice quali stati hanno qualcosa di vero
 * da mostrare: uno stato senza dati si salta, non si riempie.
 */
export function prossimoStato({ stato, eta, pronti, zoneInCoda, manuale }) {
  if (manuale) return stato;
  if (stato === 'attesa') return pronti && pronti.zone && eta >= DURATA_ATTESA ? 'zone' : 'attesa';
  if (eta < DURATA_STATO) return stato;
  if (stato === 'zone' && zoneInCoda) return 'zone';
  const giro = ['zone', 'conformita', 'orientamento'];
  const i = giro.indexOf(stato);
  for (let k = 1; k <= giro.length; k++) {
    const s = giro[(i + k) % giro.length];
    if (pronti && pronti[s]) return s;
  }
  return stato;
}

function rispetta(v, op, s) {
  if (typeof v !== 'number' || typeof s !== 'number') return null;
  if (op === '>=') return v >= s;
  if (op === '<=') return v <= s;
  if (op === '>') return v > s;
  if (op === '<') return v < s;
  return null;
}

/**
 * Le verifiche di norma da mostrare, dagli esiti di __veritasNormative.valuta().
 * Prima quelle di accessibilita' della giurisdizione chiesta; se non ce ne
 * sono con dati, quelle di accessibilita' di qualunque giurisdizione.
 */
export function verificheDiConformita(esiti, giurisdizione = 'IT') {
  const tutte = (Array.isArray(esiti) ? esiti : []).filter((e) => e && e.regola);
  const conDati = tutte.filter((e) => e.stato === 'conforme' || e.stato === 'difforme');
  const forma = (e) => ({
    id: e.regola.id, titolo: e.regola.titolo, fonte: e.regola.fonte, riferimento: e.regola.riferimento,
    grandezza: e.regola.grandezza, operatore: e.regola.operatore, unita: e.regola.unita,
    soglia: typeof e.soglia === 'number' ? e.soglia : e.regola.valore,
    stato: e.stato, conformi: e.conformi || 0, difformi: e.difformi || 0,
    peggiore: typeof e.peggiore === 'number' ? e.peggiore : null, validato: !!e.regola.validato,
    ambito: e.regola.ambito, giurisdizione: e.regola.giurisdizione,
  });
  const qui = conDati.filter((e) => e.regola.giurisdizione === giurisdizione && e.regola.ambito === 'accessibilita');
  const scelte = qui.length ? qui : conDati.filter((e) => e.regola.ambito === 'accessibilita');
  return {
    principali: scelte.map(forma),
    tutte: conDati.map(forma),
    nonMisurabili: tutte.filter((e) => e.stato === 'non_misurabile').length,
    senzaDati: tutte.filter((e) => e.stato === 'dipendenza_mancante').length,
  };
}

/**
 * I segni da mettere sul modello per la conformita': ogni varco misurato
 * (conforme o no) e le strettoie FUORI soglia, le peggiori prime (al massimo
 * sei). La soglia viene dalla regola, mai scritta qui.
 */
export function segniDaVerificare(percezione, verifiche) {
  const regola = {};
  for (const v of (verifiche && verifiche.principali) || []) if (!regola[v.grandezza]) regola[v.grandezza] = v;
  const porta = regola.larghezza_varco_m, corr = regola.larghezza_strettoia_m;
  const p = percezione || {};
  const out = [];
  for (const g of p.gateways || []) {
    if (!g || !(g.widthM > 0) || typeof g.worldX !== 'number' || typeof g.worldZ !== 'number') continue;
    out.push({ tipo: 'varco', x: g.worldX, y: g.y || 0, z: g.worldZ, larghezza: g.widthM,
      incertezza: g.uncertaintyM > 0 ? g.uncertaintyM : null,
      ok: porta ? rispetta(g.widthM, porta.operatore, porta.soglia) : null, soglia: porta ? porta.soglia : null });
  }
  const strette = [];
  for (const b of p.bottlenecks || []) {
    if (!b || !(b.widthM > 0)) continue;
    const x = typeof b.worldX === 'number' ? b.worldX : b.centroidX;
    const z = typeof b.worldZ === 'number' ? b.worldZ : b.centroidZ;
    if (typeof x !== 'number' || typeof z !== 'number') continue;
    strette.push({ tipo: 'strettoia', x, y: b.y || 0, z, larghezza: b.widthM,
      incertezza: b.uncertaintyM > 0 ? b.uncertaintyM : null,
      ok: corr ? rispetta(b.widthM, corr.operatore, corr.soglia) : null, soglia: corr ? corr.soglia : null });
  }
  strette.sort((a, b) => a.larghezza - b.larghezza);
  return out.concat(strette.filter((s) => s.ok === false).slice(0, 6));
}

const v3 = (p) => (Array.isArray(p) && p.length >= 3 ? [p[0], p[1], p[2]]
  : p && typeof p.x === 'number' ? [p.x, p.y || 0, p.z] : null);

/**
 * Cio' che l'occhio ha posato nel mondo (`__veritasVistoNelMondo`), diviso
 * come lo legge la mappa di cammino: muri (passo «ferma»), porte (passo
 * «varco»), e le altre cose, con il loro ingombro.
 */
export function segniDellOcchio(visto) {
  const muri = [], porte = [], cose = [];
  for (const v of Array.isArray(visto) ? visto : []) {
    if (!v) continue;
    const seg = Array.isArray(v.segmento) && v.segmento.length === 2 ? [v3(v.segmento[0]), v3(v.segmento[1])] : null;
    const buono = seg && seg[0] && seg[1];
    const nome = v.nome || v.termine || '';
    if (v.passo === 'ferma' && buono) muri.push({ a: seg[0], b: seg[1], nome });
    else if (v.passo === 'varco') {
      porte.push({ a: buono ? seg[0] : null, b: buono ? seg[1] : null, centro: v3(v.centro),
        larghezza: buono ? Math.hypot(seg[1][0] - seg[0][0], seg[1][2] - seg[0][2]) : null, nome });
    } else if (v.mondo && v3(v.mondo.min) && v3(v.mondo.max)) cose.push({ min: v3(v.mondo.min), max: v3(v.mondo.max), nome });
  }
  return { muri, porte, cose };
}

const tt = (L, it, en) => (L === 'it' ? it : en);

// I titoli delle regole in inglese, per id: veritas_normative.js li scrive in
// italiano (e vive in due copie, file e index.html). Senza voce, l'italiano.
const TITOLI_EN = {
  it_dm236_porta: 'Door clear width', it_dm236_corridoio: 'Corridor width',
  it_dm236_rotazione: 'Turning space, 360° rotation', it_dm236_rampa: 'Ramp slope',
  us_ada_percorso: 'Clear width of the accessible route', us_ada_porta: 'Door clear width',
  us_ada_rotazione: 'Turning space', us_ada_rampa: 'Ramp slope', us_ada_altezza: 'Headroom under protruding objects',
  it_dm1998_uscita: 'Minimum exit width', it_dm2015_via_esodo: 'Minimum escape route width',
  it_dm1998_percorso: 'Maximum escape route length', it_dm1998_moduli: 'Total exit width relative to occupancy',
  us_ibc_uscita: 'Clear width of exit doors', us_ibc_corridoio_esodo: 'Minimum exit corridor width',
  fruin_los_camminamento: 'Density beyond which walking degrades', sicurezza_folla: 'Crowd risk density',
  green_guide_statico: 'Maximum density for standing audience areas', hall_distanza_sociale: 'Interpersonal distance while waiting',
};
/** Il titolo di una regola nella lingua di chi legge. */
export function titoloDi(v, L) {
  return (L !== 'it' && v && TITOLI_EN[v.id]) || (v && v.titolo) || '';
}

/** Il nome neutro di una zona misurata nella lingua di chi legge. */
export function nomeZona(label, L) {
  const t = String(label == null ? '' : label);
  if (L === 'it') return t;
  return t.replace(/^Ambiente (\d+)/, 'Room $1').replace(/^Passaggio (\d+)/, 'Passage $1');
}

/**
 * IL REPORT DI UNO STATO, da una fotografia dei dati veri (`d`). Ogni valore
 * viene da `d`; dove manca, «--». Restituisce titolo, riga di comando, righe
 * (chiave, valore, tono), barra (0..1 o null) e osservazioni.
 */
export function reportDi(stato, d, L) {
  d = d || {};
  const z = d.zone || {}, o = d.occhio || {};
  const righe = [], note = [];
  const riga = (k, v, tono) => righe.push({ k, v: v == null || v === '' ? '--' : String(v), tono: tono || null });
  const nota = (t, tono) => note.push({ t, tono: tono || null });
  let barra = null;

  const occhioRiga = () => {
    if (o.fallito) return tt(L, 'non ha potuto guardare', 'could not look');
    if (o.parlato) return tt(L, 'ha parlato', 'has spoken') + (o.viste ? ' · ' + o.viste + ' ' + tt(L, 'viste', 'views') : '');
    if (o.assente) return tt(L, 'non è partito', 'did not start');
    if (o.viste || o.giro) return tt(L, 'sta guardando', 'looking') + (o.quante ? ' · ' + (o.quale || o.viste) + '/' + o.quante : o.viste ? ' · ' + o.viste + ' ' + tt(L, 'viste', 'views') : '');
    return tt(L, 'in attesa', 'standby');
  };

  if (stato === 'attesa') {
    riga(tt(L, 'In attesa dell\'avvio della scansione..', 'Awaiting scan initialization..'), '', null);
    righe[righe.length - 1].v = '';
    riga(tt(L, 'Zone attive rilevate', 'Active zones detected'), z.tot ? z.tot : tt(L, 'nessuna', 'none'));
    riga(tt(L, 'Modello', 'Model'), d.file && d.file.nome);
    riga(tt(L, 'Ingombro', 'Footprint'), d.ingombro ? formatta(d.ingombro[0], 1, L) + ' × ' + formatta(d.ingombro[2], 1, L) + ' × ' + formatta(d.ingombro[1], 1, L) + ' m' : null);
    riga(tt(L, 'Superficie calpestabile', 'Walkable area'), d.area ? mq(d.area, L) : null);
    riga(tt(L, 'Livelli', 'Levels'), d.livelli);
    riga(tt(L, 'Occhio', 'Eye'), occhioRiga());
    nota(tt(L, 'In attesa dei dati del modello', 'Standby — waiting for model data'));
    nota(tt(L, 'Nessuna anomalia rilevata — in attesa', 'No anomalies detected — idle'));
    return { titolo: tt(L, 'REPORT DI COMPRENSIONE', 'COMPREHENSION REPORT'), comando: tt(L, '$ IN ATTESA DELLA SCANSIONE..', '$ WAITING FOR SCAN..'), righe, barra, note };
  }

  if (stato === 'zone') {
    const completo = z.tot > 0 && z.accese >= z.tot;
    riga(tt(L, 'Rilevamento zone', 'Zone detection'),
      z.tot ? (completo ? tt(L, 'COMPLETO', 'COMPLETE') : tt(L, 'IN CORSO', 'RUNNING')) + ' [' + (z.accese || 0) + '/' + z.tot + ']' : null, completo ? 'ok' : null);
    riga(tt(L, 'Superficie calpestabile', 'Walkable area'), d.area ? mq(d.area, L) : null);
    barra = z.tot ? Math.min(1, (z.accese || 0) / z.tot) : null;
    riga(tt(L, 'Ambienti · passaggi', 'Rooms · passages'), z.tot ? (z.ambienti || 0) + ' · ' + (z.passaggi || 0) : null);
    riga(tt(L, 'Varchi reali', 'Real openings'), d.verdetto ? d.verdetto.varchi : null);
    riga(tt(L, 'Livelli', 'Levels'), d.livelli);
    riga(tt(L, 'Confermate dall\'occhio', 'Confirmed by the eye'), z.tot ? (z.confermate || 0) + '/' + Math.max(z.tot, z.accese || 0) : null, z.confermate ? 'ok' : null);
    riga(tt(L, 'Occhio', 'Eye'), occhioRiga(), o.fallito || o.assente ? 'avviso' : null);
    if (d.verdetto && d.verdetto.zone) {
      const art = d.verdetto.tipo === 'ambiente unico';
      nota(art
        ? tt(L, 'Ambiente unico: uno spazio continuo, senza divisioni reali', 'Single space: one continuous area, no real divisions')
        : tt(L, 'Ambiente articolato: ' + d.verdetto.zone + ' ambienti separati da ' + d.verdetto.varchi + ' varchi reali',
          'Articulated space: ' + d.verdetto.zone + ' rooms separated by ' + d.verdetto.varchi + ' real openings')
          + (d.livelli > 1 ? tt(L, ', su ' + d.livelli + ' livelli', ', on ' + d.livelli + ' levels') : ''));
    }
    if (z.max && z.max.area) nota(tt(L, 'Il più grande: ', 'Largest: ') + nomeZona(z.max.label, L));
    const s = d.segni;
    if (s && (s.muri || s.porte)) nota(tt(L, 'L\'occhio ha segnato ' + s.muri + ' muri e ' + s.porte + ' porte', 'The eye marked ' + s.muri + ' walls and ' + s.porte + ' doors'), 'occhio');
    if (o.fallito) nota(tt(L, 'Occhio: ', 'Eye: ') + o.fallito, 'avviso');
    return { titolo: tt(L, 'REPORT DI COMPRENSIONE', 'COMPREHENSION REPORT'), comando: tt(L, '$ LETTURA DELLE ZONE...', '$ READING THE ZONES...'), righe, barra, note };
  }

  if (stato === 'conformita') {
    const ver = d.verifiche;
    const titolo = tt(L, 'REPORT DI CONFORMITÀ', 'COMPLIANCE REPORT');
    const comando = tt(L, '$ VERIFICA DI CONFORMITÀ...', '$ RUNNING COMPLIANCE CHECK...');
    if (!ver || !ver.principali.length) {
      riga(tt(L, 'Varchi misurati', 'Openings measured'), d.varchiMisurati != null ? d.varchiMisurati : null);
      riga(tt(L, 'Verifica', 'Check'), tt(L, 'non eseguibile', 'not possible'), 'avviso');
      nota(tt(L, 'Nessuna misura confrontabile con una norma: la verifica non si fa', 'No measure comparable with a standard: the check is not run'), 'avviso');
      return { titolo, comando, righe, barra, note };
    }
    let peggio = null;
    const fonti = [...new Set(ver.principali.slice(0, 2).map((v) => v.fonte))];
    riga(tt(L, 'Norma', 'Standard'), fonti.join(' · '));
    for (const v of ver.principali.slice(0, 2)) {
      const art = String(v.riferimento).replace(/^art.s*/i, '');
      riga(tt(L, 'Art. ', 'Art. ') + art + ' · ' + titoloDi(v, L).toLowerCase(), (v.operatore === '>=' ? '≥ ' : v.operatore + ' ') + formatta(v.soglia, 2, L) + ' ' + v.unita);
      riga(tt(L, 'Misurati', 'Measured'), (v.conformi + v.difformi) + ' · ' + tt(L, 'fuori soglia ', 'below threshold ') + v.difformi, v.difformi ? 'ko' : 'ok');
      riga(tt(L, 'Verifica', 'Check'), v.difformi ? tt(L, 'NON SUPERATA ⚠', 'FAILED ⚠') : tt(L, 'SUPERATA ✓', 'PASSED ✓'), v.difformi ? 'ko' : 'ok');
      if (v.difformi && v.peggiore != null && (!peggio || v.peggiore - v.soglia < peggio.peggiore - peggio.soglia)) peggio = v;
    }
    if (peggio) {
      riga(tt(L, 'Caso peggiore', 'Worst case'), formatta(peggio.peggiore, 2, L) + ' m < ' + formatta(peggio.soglia, 2, L) + ' m', 'ko');
      if (d.dovePeggiore) riga(tt(L, 'Posizione', 'Location'), nomeZona(d.dovePeggiore, L));
      nota(tt(L, 'Requisito: ', 'Requirement: ') + titoloDi(peggio, L).toLowerCase() + ' ≥ ' + formatta(peggio.soglia, 2, L) + ' m (' + peggio.fonte + ', ' + peggio.riferimento + ')');
      nota(tt(L, 'Rilevato: ', 'Detected: ') + formatta(peggio.peggiore, 2, L) + ' m' + (d.incertezzaPeggiore ? ' ± ' + formatta(d.incertezzaPeggiore, 2, L) : '') + tt(L, ' — da verificare in sito', ' — to be verified on site'), 'ko');
    } else {
      nota(tt(L, 'Tutte le misure rispettano le soglie di accessibilità', 'Every measure meets the accessibility thresholds'), 'ok');
    }
    if (ver.principali.some((v) => !v.validato)) nota(tt(L, 'Soglie trascritte dalla norma, da validare da un professionista', 'Thresholds transcribed from the standard, pending professional validation'), 'avviso');
    return { titolo, comando, righe, barra, note };
  }

  // orientamento
  const acc = d.accessi || [];
  riga(tt(L, 'Ingressi trovati', 'Entrances found'), d.accessi ? acc.length : null, acc.length ? 'ok' : d.accessi ? 'avviso' : null);
  riga(tt(L, 'Segnaletica', 'Signage'), d.segnaletica ? d.segnaletica.testo : null);
  riga(tt(L, 'Mappa di cammino', 'Walking map'), d.navmesh == null ? null : d.navmesh ? tt(L, 'pronta', 'ready') : tt(L, 'non costruita', 'not built'), d.navmesh === false ? 'avviso' : null);
  riga(tt(L, 'Tratti in linea retta', 'Straight-line legs'), d.tratti, d.tratti ? 'ko' : d.tratti === 0 ? 'ok' : null);
  riga(tt(L, 'Mete irraggiungibili', 'Unreachable targets'), d.irraggiungibili, d.irraggiungibili ? 'ko' : d.irraggiungibili === 0 ? 'ok' : null);
  riga(tt(L, 'Posti riconosciuti', 'Places recognized'), d.posti);
  if (acc.length) {
    const indizi = acc.map((a) => a.indizi).filter((n) => n > 0);
    nota(tt(L, acc.length + (acc.length === 1 ? ' ingresso' : ' ingressi'), acc.length + (acc.length === 1 ? ' entrance' : ' entrances'))
      + (indizi.length ? tt(L, ', ognuno con almeno ' + Math.min(...indizi) + ' indizi d\'accordo', ', each backed by at least ' + Math.min(...indizi) + ' agreeing clues') : ''), 'ok');
  }
  if (d.tratti) nota(tt(L, d.tratti + ' tratti passano in linea retta: la mappa non collega tutte le mete', d.tratti + ' legs cross in a straight line: the map does not connect every target'), 'ko');
  if (d.segnaletica && d.segnaletica.nota) nota(d.segnaletica.nota);
  return { titolo: tt(L, 'REPORT DI ORIENTAMENTO', 'WAYFINDING REPORT'), comando: tt(L, '$ ANALISI DELL\'ORIENTAMENTO...', '$ RUNNING WAYFINDING ANALYSIS...'), righe, barra, note };
}

// ---------------------------------------------------------------------------
// LO STILE — un solo foglio, iniettato una volta
// ---------------------------------------------------------------------------

const CSS = `
.vap-velo{position:fixed;inset:0;z-index:99990;overflow:hidden;opacity:0;transition:opacity 900ms ease;
  background:radial-gradient(ellipse 80% 70% at 38% 52%,#1a2231 0%,#0e131b 55%,#07090d 100%);color:${TESTO};
  font-family:Inter,"Segoe UI",system-ui,sans-serif;--tinta:${TINTE.attesa}}
.vap-fumo{position:absolute;border-radius:50%;pointer-events:none;filter:blur(38px);
  background:radial-gradient(circle,rgba(150,164,188,.30) 0%,rgba(120,134,158,.13) 38%,transparent 66%);
  animation:vap-deriva 60s ease-in-out infinite alternate}
@keyframes vap-deriva{0%{transform:translate(0,0) scale(1)}50%{transform:translate(6vmax,-3vmax) scale(1.12)}100%{transform:translate(-5vmax,4vmax) scale(.94)}}
.vap-alone{position:absolute;left:12%;top:18%;width:62%;height:70%;pointer-events:none;filter:blur(30px);
  background:radial-gradient(ellipse at center,var(--tinta) 0%,transparent 62%);mix-blend-mode:screen;transition:background 1.2s ease;opacity:.20}
.vap-vignetta{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 45% 50%,transparent 55%,rgba(0,0,0,.55) 100%)}
.vap-tela{position:absolute;inset:0;width:100%;height:100%;display:block}
.vap-testata{position:absolute;left:0;right:0;top:0;height:74px;display:flex;align-items:center;padding:0 40px;
  border-bottom:1px solid rgba(255,255,255,.06);background:linear-gradient(180deg,rgba(7,9,13,.72),rgba(7,9,13,.25))}
.vap-marchio{display:flex;align-items:center;gap:12px;font-size:25px;font-weight:600;letter-spacing:.06em;color:#E8ECF3}
.vap-marchio img{height:38px;width:auto;display:block}
.vap-passi{margin-left:auto;display:flex;gap:26px;font-size:14px;letter-spacing:.02em}
.vap-passo{color:${FIOCO};cursor:pointer;background:none;border:0;font:inherit;padding:6px 0;border-bottom:2px solid transparent;transition:color .4s,border-color .4s}
.vap-passo:hover{color:${TESTO}}
.vap-passo.fatto{color:#AFB8C6}
.vap-passo.ora{color:var(--tinta);border-bottom-color:var(--tinta)}
.vap-report{position:absolute;right:40px;top:108px;bottom:112px;width:min(430px,34vw);padding:26px 30px 22px;border-radius:18px;
  background:rgba(16,20,28,.80);border:1px solid rgba(255,255,255,.08);box-shadow:0 24px 60px rgba(0,0,0,.45);
  backdrop-filter:blur(10px);display:flex;flex-direction:column;opacity:0;transform:translateX(30px);
  transition:opacity .7s ease,transform .7s ease,border-color .6s;font-family:"JetBrains Mono",ui-monospace,Consolas,monospace}
.vap-report.su{opacity:1;transform:none}
.vap-report::before{content:"";position:absolute;left:-1px;top:16%;bottom:30%;width:2px;background:var(--tinta);box-shadow:0 0 14px var(--tinta);border-radius:2px;transition:background .6s,box-shadow .6s}
.vap-punti{display:flex;gap:7px;margin-bottom:14px}
.vap-punti i{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.18);transition:background .5s,box-shadow .5s}
.vap-punti i.fatto{background:rgba(255,255,255,.45)}
.vap-punti i.ora{background:var(--tinta);box-shadow:0 0 8px var(--tinta)}
.vap-titolo{font-family:Inter,"Segoe UI",system-ui,sans-serif;font-size:19px;font-weight:600;letter-spacing:.03em;color:var(--tinta);transition:color .6s}
.vap-comando{margin:22px 0 12px;font-size:15.5px;color:var(--tinta);letter-spacing:.02em;white-space:nowrap;overflow:hidden}
.vap-cursore{display:inline-block;width:.55em;height:1.05em;background:currentColor;margin-left:6px;vertical-align:-3px;animation:vap-lampo 1s steps(1) infinite}
@keyframes vap-lampo{50%{opacity:0}}
.vap-righe{display:flex;flex-direction:column;gap:9px;font-size:13.5px}
.vap-riga{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${TESTO};opacity:0;transform:translateX(-6px);animation:vap-entra .45s ease forwards}
@keyframes vap-entra{to{opacity:1;transform:none}}
.vap-comando .t{display:inline-block;vertical-align:bottom;overflow:hidden;white-space:nowrap;animation:vap-scrivi .7s steps(30,end) both}
@keyframes vap-scrivi{from{max-width:0}to{max-width:100%}}
.vap-riga .fr{color:var(--tinta);margin-right:8px}
.vap-riga .k{color:#AEB7C4}
.vap-riga .v{color:#EEF2F7}
.vap-riga .v.ok{color:${OK}} .vap-riga .v.ko{color:${TINTE.conformita}} .vap-riga .v.avviso{color:${TINTE.orientamento}}
.vap-barra{height:9px;margin:4px 0 2px;position:relative;background:repeating-linear-gradient(90deg,rgba(255,255,255,.09) 0 9px,transparent 9px 12px)}
.vap-barra b{position:absolute;left:0;top:0;bottom:0;width:0;background:repeating-linear-gradient(90deg,var(--tinta) 0 9px,transparent 9px 12px);transition:width .8s ease}
.vap-sep{height:1px;background:rgba(255,255,255,.08);margin:18px 0 14px}
.vap-sezione{font-family:Inter,"Segoe UI",system-ui,sans-serif;font-size:14px;font-weight:600;letter-spacing:.05em;color:var(--tinta);margin-bottom:10px}
.vap-note{display:flex;flex-direction:column;gap:8px;font-family:Inter,"Segoe UI",system-ui,sans-serif;font-size:13px;color:#C9D1DC;line-height:1.35;overflow:hidden}
.vap-nota{opacity:0;transform:translateY(4px);animation:vap-appare .5s ease forwards}
.vap-nota:before{content:"›";color:var(--tinta);margin-right:8px}
.vap-nota.ok{color:${OK}} .vap-nota.ko{color:#FF8FA3} .vap-nota.avviso{color:#FFD08A} .vap-nota.occhio{color:${OCCHIO}}
@keyframes vap-appare{to{opacity:1;transform:none}}
.vap-coda{margin-top:auto;padding-top:14px;font-size:11.5px;color:${FIOCO};display:flex;align-items:center;gap:8px}
.vap-coda .occhio{color:${OCCHIO}}
.vap-bottone{margin-top:12px;width:100%;padding:13px 0;border-radius:9px;border:1px solid var(--tinta);background:rgba(255,255,255,.02);
  color:var(--tinta);font-family:Inter,"Segoe UI",system-ui,sans-serif;font-size:14px;font-weight:600;letter-spacing:.06em;cursor:pointer;transition:background .3s,color .6s,border-color .6s}
.vap-bottone:hover{background:rgba(255,255,255,.07)}
.vap-dettaglio{max-height:0;overflow:auto;transition:max-height .5s ease;font-size:12px;color:#B8C1CE}
.vap-dettaglio.aperto{max-height:34vh;margin-top:10px}
.vap-dettaglio div{padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vap-basso{position:absolute;left:44px;bottom:40px;max-width:calc(100% - min(430px,34vw) - 140px)}
.vap-titolone{font-size:clamp(28px,3.4vw,50px);font-weight:800;letter-spacing:.01em;color:#F4F6FA;line-height:1.05;text-shadow:0 2px 24px rgba(0,0,0,.5)}
.vap-sotto{margin-top:12px;font-size:clamp(14px,1.35vw,20px);color:${TINTE.attesa};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vap-azioni{display:flex;gap:18px;margin-top:26px}
.vap-primario{padding:15px 34px;border-radius:9px;border:0;background:${TINTE.attesa};color:#062624;font:600 17px Inter,"Segoe UI",system-ui,sans-serif;cursor:pointer;box-shadow:0 0 26px rgba(46,230,214,.35)}
.vap-primario:hover{filter:brightness(1.08)}
.vap-secondario{padding:15px 34px;border-radius:9px;border:1px solid rgba(255,255,255,.28);background:rgba(10,13,18,.35);color:#E8ECF3;font:500 17px Inter,"Segoe UI",system-ui,sans-serif;cursor:pointer}
.vap-secondario:hover{background:rgba(255,255,255,.06)}
.vap-scheda{position:absolute;left:0;bottom:calc(100% + 14px);min-width:320px;padding:14px 18px;border-radius:12px;background:rgba(16,20,28,.92);
  border:1px solid rgba(255,255,255,.1);font:12.5px "JetBrains Mono",ui-monospace,monospace;color:#C9D1DC;display:none}
.vap-scheda.aperta{display:block}
.vap-scheda div{padding:3px 0}
.vap-et{position:absolute;display:flex;flex-direction:column-reverse;align-items:center;transform:translate(-50%,-100%);pointer-events:none;transition:opacity .6s ease}
.vap-et .pt{width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor;margin-bottom:-3px}
.vap-et .filo{width:1px;background:currentColor;opacity:.75}
.vap-et .pill{padding:7px 13px;border-radius:8px;border:1px solid currentColor;background:rgba(14,18,26,.82);color:#EEF2F7;
  font:600 12.5px Inter,"Segoe UI",system-ui,sans-serif;letter-spacing:.05em;white-space:nowrap;box-shadow:0 0 18px rgba(0,0,0,.35)}
.vap-et .pill small{font-weight:500;opacity:.75;margin-left:6px}
@media (max-width:900px){
  .vap-report{left:16px;right:16px;width:auto;top:auto;bottom:16px;max-height:46vh;padding:18px}
  .vap-basso{left:16px;right:16px;bottom:calc(46vh + 30px);max-width:none}
  .vap-passi{display:none}.vap-testata{padding:0 16px}
  .vap-azioni{margin-top:14px}.vap-primario,.vap-secondario{padding:11px 20px;font-size:15px}
}
`;


const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function lingua() {
  try { return (localStorage.getItem('veritasLang') || 'en') === 'it' ? 'it' : 'en'; } catch (e) { return 'en'; }
}

// ---------------------------------------------------------------------------
// IL VELO: fondo col fumo, testata con gli stati, report, titolo e azioni
// ---------------------------------------------------------------------------

// ⚠️ 18/09, VISTO SUL BANCO: il vestito carta (veritas_carta.js) ripittura di
//    chiaro ogni fondo scuro della pagina, e il velo usciva bianco. Il velo
//    vive quindi in un'OMBRA (Shadow DOM): i fogli della pagina non ci entrano,
//    e il suo non esce. Anche il nome del foglio collideva (va-stile e' di
//    veritas_aspetto.js): dentro l'ombra i nomi non si toccano piu'.
function creaVelo(L) {
  const ospite = document.createElement('div');
  ospite.setAttribute('data-veritas-apertura', '');
  ospite.style.cssText = 'position:fixed;inset:0;z-index:99990;';
  document.body.appendChild(ospite);
  const ombra = ospite.attachShadow({ mode: 'open' });
  const foglio = document.createElement('style');
  foglio.textContent = CSS;
  ombra.appendChild(foglio);
  const velo = document.createElement('div');
  velo.className = 'vap-velo';
  const fumi = [[-14, 50, 72, 0], [40, 62, 70, -14], [16, 6, 52, -30], [60, -8, 56, -8], [-8, -12, 48, -22], [24, 74, 64, -40], [-10, 78, 60, -18], [52, 30, 44, -26]];
  let html = fumi.map(([x, y, s, ritardo], i) => `<div class="vap-fumo" style="left:${x}vw;top:${y}vh;width:${s}vmax;height:${s * 0.7}vmax;animation-duration:${52 + i * 9}s;animation-delay:${ritardo}s"></div>`).join('');
  html += '<div class="vap-alone"></div><canvas class="vap-tela"></canvas><div class="vap-vignetta"></div><div class="vap-strati" style="position:absolute;inset:0;pointer-events:none"></div>';
  html += `<div class="vap-testata"><div class="vap-marchio"><img src="./Assets/eidetica_simbolo_trasparente.webp" alt="">EIDETICA</div>`
    + `<nav class="vap-passi">${STATI.map((s) => `<button class="vap-passo" data-stato="${s}">${esc(nomeStato(s, L))}</button>`).join('')}</nav></div>`;
  html += `<div class="vap-report"><div class="vap-punti">${STATI.map((s) => `<i data-stato="${s}"></i>`).join('')}</div>`
    + '<div class="vap-titolo"></div><div class="vap-comando"><span class="t"></span><span class="vap-cursore"></span></div>'
    + '<div class="vap-righe"></div><div class="vap-sep"></div>'
    + `<div class="vap-sezione">${tt(L, 'OSSERVAZIONI', 'INSIGHTS')}</div><div class="vap-note"></div>`
    + '<div class="vap-dettaglio"></div><div class="vap-coda"></div>'
    + `<button class="vap-bottone" data-azione="dettaglio">[ ${tt(L, 'DETTAGLIO', 'DETAILS')} ⌄ ]</button></div>`;
  html += `<div class="vap-basso"><div class="vap-titolone">${tt(L, 'COMPRENSIONE ARCHITETTONICA', 'ARCHITECTURAL COMPREHENSION')}</div>`
    + '<div class="vap-sotto"></div><div class="vap-azioni" style="position:relative"><div class="vap-scheda"></div>'
    + `<button class="vap-primario" data-azione="entra">${tt(L, 'Entra', 'Enter')} &nbsp;↗</button>`
    + `<button class="vap-secondario" data-azione="dati">${tt(L, 'Dati del modello', 'View Model Data')}</button></div></div>`;
  velo.innerHTML = html;
  ombra.appendChild(velo);
  requestAnimationFrame(() => {
    velo.style.opacity = '1';
    setTimeout(() => { const r = velo.querySelector('.vap-report'); if (r) r.classList.add('su'); }, 350);
  });
  const q = (s) => velo.querySelector(s);
  return {
    ospite, velo, tela: q('.vap-tela'), strati: q('.vap-strati'), report: q('.vap-report'), titolo: q('.vap-titolo'),
    comando: q('.vap-comando .t'), righe: q('.vap-righe'), note: q('.vap-note'), coda: q('.vap-coda'),
    dettaglio: q('.vap-dettaglio'), sotto: q('.vap-sotto'), scheda: q('.vap-scheda'), bottone: q('.vap-bottone'),
  };
}

function nomeStato(s, L) {
  return { attesa: tt(L, 'In attesa', 'Standby'), zone: tt(L, 'Zone', 'Zones'),
    conformita: tt(L, 'Conformità', 'Compliance'), orientamento: tt(L, 'Orientamento', 'Wayfinding') }[s];
}

// Il report dello stato corrente. Se lo stato cambia si riscrive tutto, riga
// per riga, come un terminale; se cambiano solo i valori si aggiornano sul posto.
function scriviReport(S, forza) {
  const d = S.dati || {};
  const rep = reportDi(S.stato, d, S.lingua);
  const firma = S.stato + '|' + rep.righe.map((r) => r.k).join('|') + '|' + rep.note.map((n) => n.t).join('|');
  const nuovo = forza || S.statoScritto !== S.stato;
  if (nuovo || firma !== S.firmaReport) {
    S.titolo.textContent = rep.titolo;
    S.comando.textContent = rep.comando;
    if (nuovo) { S.comando.style.animation = 'none'; void S.comando.offsetWidth; S.comando.style.animation = ''; }
    S.righe.innerHTML = rep.righe.map((r, i) =>
      `<div class="vap-riga" style="animation-delay:${nuovo ? 120 + i * 150 : 0}ms${nuovo ? '' : ';animation-duration:1ms'}">`
      + `<span class="fr">→</span><span class="k">${esc(r.k)}${r.v !== '' ? ':' : ''}</span> <span class="v${r.tono ? ' ' + r.tono : ''}">${esc(r.v)}</span></div>`).join('')
      + (rep.barra != null ? '<div class="vap-barra"><b></b></div>' : '');
    S.note.innerHTML = rep.note.map((n, i) => `<div class="vap-nota${n.tono ? ' ' + n.tono : ''}" style="animation-delay:${nuovo ? 400 + rep.righe.length * 150 + i * 220 : 0}ms">${esc(n.t)}</div>`).join('');
    S.firmaReport = firma;
    S.statoScritto = S.stato;
  } else {
    const v = S.righe.querySelectorAll('.vap-riga .v');
    rep.righe.forEach((r, i) => { if (v[i] && v[i].textContent !== r.v) { v[i].textContent = r.v; v[i].className = 'v' + (r.tono ? ' ' + r.tono : ''); } });
  }
  const b = S.righe.querySelector('.vap-barra b');
  if (b) b.style.width = Math.round((rep.barra || 0) * 100) + '%';
  if (S.dettaglio.classList.contains('aperto')) scriviDettaglio(S);
}

function scriviDettaglio(S) {
  const L = S.lingua, d = S.dati || {};
  let righe = [];
  if (S.stato === 'conformita' && d.verifiche) {
    righe = d.verifiche.tutte.map((v) => `${v.difformi ? '⚠' : '✓'} ${v.fonte} ${v.riferimento} · ${titoloDi(v, L)} · ${v.conformi + v.difformi} ${tt(L, 'misure', 'measures')}, ${v.difformi} ${tt(L, 'fuori soglia', 'below')}${v.validato ? '' : tt(L, ' · da validare', ' · pending validation')}`);
  } else if (S.stato === 'orientamento' && d.accessi) {
    righe = d.accessi.map((a) => `${a.nome || tt(L, 'Accesso', 'Entrance')}${a.larghezza ? ' · ' + metri(a.larghezza, L) : ''}${a.indizi ? ' · ' + a.indizi + tt(L, ' indizi', ' clues') : ''}`);
  } else {
    righe = [...S.accese.values()].filter((z) => !z.spenta)
      .map((z) => `${z.confermata ? '◉' : '○'} ${nomeZona(z.label, L)}${misureDi(z.nodo) ? ' · ' + misureDi(z.nodo) : ''}${z.confermata ? tt(L, ' · confermata dall\'occhio', ' · confirmed by the eye') : ''}`);
  }
  S.dettaglio.innerHTML = righe.length ? righe.map((r) => `<div>${esc(r)}</div>`).join('') : `<div>--</div>`;
}

function segnaStato(S) {
  const tinta = TINTE[S.stato];
  S.velo.style.setProperty('--tinta', tinta);
  const i = STATI.indexOf(S.stato);
  S.velo.querySelectorAll('.vap-passo').forEach((b) => {
    const k = STATI.indexOf(b.dataset.stato);
    b.classList.toggle('ora', k === i);
    b.classList.toggle('fatto', !!S.visti[b.dataset.stato] && k !== i);
  });
  S.velo.querySelectorAll('.vap-punti i').forEach((p) => {
    const k = STATI.indexOf(p.dataset.stato);
    p.className = k === i ? 'ora' : S.visti[p.dataset.stato] ? 'fatto' : '';
  });
}

function scriviCoda(S) {
  const L = S.lingua, o = (S.dati && S.dati.occhio) || {};
  let t;
  if (o.fallito) t = tt(L, 'l\'occhio non ha potuto guardare: ', 'the eye could not look: ') + o.fallito;
  else if (o.parlato) t = tt(L, 'l\'occhio ha parlato', 'the eye has spoken') + (S.viste ? ' — ' + S.viste + tt(L, ' viste esaminate', ' views examined') : '');
  else if (o.assente) t = tt(L, 'l\'occhio non ha cominciato a guardare: le zone restano misurate', 'the eye did not start: zones stay measured');
  else t = tt(L, 'l\'occhio sta guardando', 'the eye is looking') + (S.viste ? ' — ' + S.viste + tt(L, ' viste', ' views') : '...') + tt(L, ' · puoi entrare quando vuoi', ' · you can enter anytime');
  if (S.ultimoTestoCoda !== t) { S.coda.innerHTML = '<span class="occhio">◉</span><span>' + esc(t) + '</span>'; S.ultimoTestoCoda = t; }
}

function scriviSotto(S) {
  const L = S.lingua, d = S.dati || {};
  const parti = [tt(L, 'Analisi 3D in tempo reale', 'Real-time 3D analysis')];
  if (window.__veritasProjectName) parti.push(window.__veritasProjectName);
  if (d.file && d.file.nome) parti.push(d.file.nome);
  if (d.ingombro) parti.push(formatta(d.ingombro[0], 0, L) + ' × ' + formatta(d.ingombro[2], 0, L) + ' m');
  const t = parti.join('  •  ');
  if (S.sotto.textContent !== t) S.sotto.textContent = t;
}

function scriviScheda(S) {
  const L = S.lingua, d = S.dati || {};
  const r = [
    [tt(L, 'File', 'File'), d.file && d.file.nome],
    [tt(L, 'Peso', 'Size'), d.file && d.file.mb ? formatta(d.file.mb, 1, L) + ' MB' : null],
    [tt(L, 'Tipo', 'Kind'), d.splat ? 'Gaussian Splat' : tt(L, 'maglia (GLB/GLTF)', 'mesh (GLB/GLTF)')],
    [d.splat ? tt(L, 'Gaussiane', 'Gaussians') : 'Mesh', d.splat ? formatta(d.gaussiane, 0, L) : formatta(d.mesh, 0, L)],
    [tt(L, 'Ingombro', 'Footprint'), d.ingombro ? formatta(d.ingombro[0], 1, L) + ' × ' + formatta(d.ingombro[2], 1, L) + ' × ' + formatta(d.ingombro[1], 1, L) + ' m' : null],
    [tt(L, 'Calpestabile', 'Walkable'), d.area ? mq(d.area, L) : null],
    [tt(L, 'Livelli', 'Levels'), d.livelli],
  ];
  S.scheda.innerHTML = r.map(([k, v]) => `<div><span style="color:${FIOCO}">${esc(k)}:</span> ${esc(v == null || v === '' ? '--' : v)}</div>`).join('');
}

// ---------------------------------------------------------------------------
// LA SCENA: il modello vero replicato, le zone, i segni
// ---------------------------------------------------------------------------

function eSplat(radice) {
  if (!radice) return null;
  if (window.__veritasSplatRoot && window.__veritasSplatRoot === radice) {
    let m = null; radice.traverse((o) => { if (!m && o.packedSplats) m = o; }); return m;
  }
  let m = null; radice.traverse((o) => { if (!m && o.packedSplats && typeof o.getBoundingBox === 'function') m = o; });
  return m;
}

function ingombroDi(T, radice, splat) {
  radice.updateMatrixWorld(true);
  const box = new T.Box3();
  if (splat && typeof splat.getBoundingBox === 'function') {
    try {
      const b = splat.getBoundingBox(true);
      box.copy(new T.Box3(new T.Vector3(b.min.x, b.min.y, b.min.z), new T.Vector3(b.max.x, b.max.y, b.max.z))).applyMatrix4(splat.matrixWorld);
    } catch (e) { log('ingombro dello splat non letto: ' + e.message); }
  }
  if (box.isEmpty()) {
    // Box3 e' di un'altra copia di three per lo splat: si ricalcola a mano.
    radice.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const g = o.geometry.boundingBox;
      if (!g) return;
      const b = new T.Box3(new T.Vector3(g.min.x, g.min.y, g.min.z), new T.Vector3(g.max.x, g.max.y, g.max.z));
      const m = new T.Matrix4().fromArray(o.matrixWorld.elements);
      box.union(b.applyMatrix4(m));
    });
  }
  return box;
}

function replicaArgilla(T, radice, scena) {
  const mat = new T.MeshStandardMaterial({ color: ARGILLA, roughness: 0.9, metalness: 0.02 });
  let n = 0;
  radice.updateMatrixWorld(true);
  radice.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const m = new T.Mesh(o.geometry, mat);
    m.matrix.fromArray(o.matrixWorld.elements);
    m.matrixAutoUpdate = false;
    scena.add(m);
    n++;
  });
  log('replica d\'argilla: ' + n + ' mesh, stessa geometria del modello vero');
  return n;
}

// Lo splat: gli STESSI dati (packedSplats) in una SplatMesh nostra, sul three
// di Spark. Scurito col `recolor` di Spark: un'argilla vera su uno splat non
// esiste (i colori sono dentro le gaussiane), e i puntini non si rifanno.
async function replicaSplat(T, Spark, splat, scena, ren) {
  const spark = new Spark.SparkRenderer({ renderer: ren });
  scena.add(spark);
  const copia = new Spark.SplatMesh({ packedSplats: splat.packedSplats, splatEncoding: splat.packedSplats.splatEncoding });
  if (copia.initialized) await copia.initialized;
  copia.matrix.fromArray(splat.matrixWorld.elements);
  copia.matrixAutoUpdate = false;
  copia.recolor = new T.Color(0.62, 0.64, 0.7);
  scena.add(copia);
  log('replica dello splat: ' + (splat.packedSplats.numSplats || '?') + ' gaussiane, stessi dati del modello vero');
  return copia;
}

function inquadra(T, box, cam, larghezza, altezza) {
  const size = new T.Vector3(); box.getSize(size);
  const centro = new T.Vector3(); box.getCenter(centro);
  const raggio = Math.max(size.x, size.y, size.z, 1) * 0.74;
  cam.near = raggio * 0.01; cam.far = raggio * 14;
  // Il modello a sinistra del report, come nelle immagini di riferimento.
  const spostamento = larghezza > 900 ? Math.min(300, larghezza * 0.17) : 0;
  cam.setViewOffset(larghezza, altezza, spostamento, altezza > 700 ? 24 : 0, larghezza, altezza);
  cam.updateProjectionMatrix();
  return { centro, raggio, size };
}

function posaCamera(S, t) {
  const { centro, raggio } = S.vista;
  const az = Math.PI / 4 + 0.32 * Math.sin(t * 0.00011);
  const quota = raggio * (0.9 + 0.05 * Math.sin(t * 0.00007));
  S.cam.position.set(centro.x + raggio * 1.62 * Math.cos(az), centro.y + quota, centro.z + raggio * 1.62 * Math.sin(az));
  S.cam.lookAt(centro);
}

// Un'ombra morbida sotto il modello: lo appoggia, al posto del reticolo.
function ombraATerra(T, scena, box) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const tex = new T.CanvasTexture(c);
  const size = new T.Vector3(); box.getSize(size);
  const piano = new T.Mesh(new T.PlaneGeometry(size.x * 1.6, size.z * 1.6),
    new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  piano.rotation.x = -Math.PI / 2;
  piano.position.set((box.min.x + box.max.x) / 2, box.min.y - 0.03, (box.min.z + box.max.z) / 2);
  scena.add(piano);
}

function materialeLuce(T, colore, opacita, tipo) {
  const base = { color: new T.Color(colore), transparent: true, opacity: opacita, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false };
  return tipo === 'linea' ? new T.LineBasicMaterial(base) : new T.MeshBasicMaterial({ ...base, side: T.DoubleSide });
}

// IL VOLUME DI UNA ZONA che si accende: impronta a terra, pareti di luce e
// spigoli, con la forma misurata (lungo x largo x verso) o, senza forma, un
// cilindro della sua area — meglio una forma onesta che una inventata.
function creaVolume(T, S, n) {
  const g = new T.Group();
  const haForma = n.formaLungo > 0 && n.formaLargo > 0;
  const h = Math.min(2.6, Math.max(1.2, S.vista.size.y * 0.35));
  const r = n.areaM2 > 0 ? Math.sqrt(n.areaM2 / Math.PI) : Math.max(1.5, S.vista.raggio * 0.02);
  const pianta = haForma ? new T.PlaneGeometry(n.formaLungo, n.formaLargo) : new T.CircleGeometry(r, 48);
  const fondo = new T.Mesh(pianta, materialeLuce(T, TINTE.zone, 0, 'faccia'));
  fondo.rotation.x = -Math.PI / 2;
  const orlo = new T.LineSegments(new T.EdgesGeometry(pianta), materialeLuce(T, TINTE.zone, 0, 'linea'));
  orlo.rotation.x = -Math.PI / 2;
  const cassa = haForma ? new T.BoxGeometry(n.formaLungo, h, n.formaLargo) : new T.CylinderGeometry(r, r, h, 48, 1, true);
  const pareti = new T.Mesh(cassa, materialeLuce(T, TINTE.zone, 0, 'faccia'));
  pareti.position.y = h / 2;
  const spigoli = new T.LineSegments(new T.EdgesGeometry(cassa, 30), materialeLuce(T, TINTE.zone, 0, 'linea'));
  spigoli.position.y = h / 2;
  const alzato = new T.Group(); alzato.add(pareti); alzato.add(spigoli);
  g.add(fondo); g.add(orlo); g.add(alzato);
  g.position.set(n.pos[0], (n.pos[1] || 0) + 0.05, n.pos[2]);
  if (haForma && typeof n.formaAngolo === 'number') g.rotation.y = -n.formaAngolo;
  S.scena.add(g);
  return { g, fondo, orlo, pareti, spigoli, alzato, geos: [pianta, cassa, orlo.geometry, spigoli.geometry] };
}

// Un segno verticale: fascio di luce e anello a terra (varchi, strettoie,
// ingressi, porte viste). Senza verso: il motore non lo misura, e non si inventa.
function creaFascio(T, S, x, y, z, colore, larghezza) {
  const g = new T.Group();
  const h = Math.min(3.2, Math.max(1.8, S.vista.size.y * 0.5));
  const rr = Math.max(0.35, (larghezza || 1) / 2);
  const anello = new T.Mesh(new T.RingGeometry(rr * 0.82, rr, 40), materialeLuce(T, colore, 0, 'faccia'));
  anello.rotation.x = -Math.PI / 2;
  const fascio = new T.Mesh(new T.CylinderGeometry(rr * 0.9, rr * 0.9, h, 32, 1, true), materialeLuce(T, colore, 0, 'faccia'));
  fascio.position.y = h / 2;
  const asse = new T.Mesh(new T.BoxGeometry(0.06, h * 1.1, 0.06), materialeLuce(T, colore, 0, 'faccia'));
  asse.position.y = h * 0.55;
  g.add(anello); g.add(fascio); g.add(asse);
  g.position.set(x, (y || 0) + 0.04, z);
  S.scena.add(g);
  return { g, mats: [[anello.material, 0.9], [fascio.material, 0.14], [asse.material, 0.85]] };
}

// L'etichetta con il filo, come nelle immagini di riferimento.
function creaEtichetta(S, colore, testo, piccolo, alto) {
  const et = document.createElement('div');
  et.className = 'vap-et';
  et.style.color = colore;
  et.style.opacity = '0';
  et.innerHTML = `<div class="pt"></div><div class="filo" style="height:${alto}px"></div><div class="pill">${esc(testo)}${piccolo ? '<small>' + esc(piccolo) + '</small>' : ''}</div>`;
  S.strati.appendChild(et);
  return et;
}

function testoZona(label, L) {
  const [nome, ...resto] = nomeZona(label || '', L).split(' · ');
  return { nome: nome.toUpperCase(), resto: resto.join(' · ') };
}

function accendiZona(S, k, n) {
  const z = {
    chiave: k, nodo: n, label: n.label || 'Ambiente', tipo: n.tipo || null,
    confermata: confermataDallOcchio(n), nata: performance.now(), spenta: 0, indice: S.contaZone++,
  };
  z.vol = creaVolume(S.THREE, S, n);
  const t = testoZona(z.label, S.lingua);
  z.et = creaEtichetta(S, z.confermata ? OCCHIO : TINTE.zone, (z.confermata ? '◉ ' : '') + t.nome, t.resto, 46 + (z.indice % 3) * 30);
  S.accese.set(k, z);
  if (z.confermata) { S.occhioHaParlato = true; S.ultimaNotizia = Date.now(); }
}

function rinomina(z) {
  const t = testoZona(z.label, S && S.lingua);
  const pill = z.et.querySelector('.pill');
  pill.innerHTML = esc((z.confermata ? '◉ ' : '') + t.nome) + (t.resto ? '<small>' + esc(t.resto) + '</small>' : '');
  z.et.style.color = z.confermata ? OCCHIO : TINTE.zone;
  const c = z.confermata ? OCCHIO : TINTE.zone;
  for (const m of [z.vol.fondo.material, z.vol.orlo.material, z.vol.pareti.material, z.vol.spigoli.material]) m.color.set(c);
}

function promuovi(S, z, n, tipo) {
  z.nodo = n || z.nodo;
  z.label = (n && n.label) || z.label;
  if (tipo) z.tipo = tipo;
  if (!z.confermata) { z.confermata = true; z.promossa = performance.now(); }
  rinomina(z);
  S.occhioHaParlato = true;
  S.ultimaNotizia = Date.now();
}

function spegniZona(S, z) {
  if (z.spenta) return;
  z.spenta = performance.now();
  z.et.style.opacity = '0';
  const scena = S.scena, accese = S.accese;
  setTimeout(() => {
    try { scena.remove(z.vol.g); z.vol.geos.forEach((g) => g.dispose()); } catch (e) {}
    try { z.et.remove(); } catch (e) {}
    if (accese.get(z.chiave) === z) accese.delete(z.chiave);
  }, 700);
}

// I SEGNI DELLA CONFORMITA' E DELL'ORIENTAMENTO, rifatti quando i dati cambiano.
function aggiornaSegni(S) {
  const d = S.dati || {}, T = S.THREE, L = S.lingua;
  const firma = JSON.stringify((d.segniNorma || []).map((s) => [Math.round(s.x), Math.round(s.z), s.larghezza, s.ok]))
    + '|' + JSON.stringify((d.accessi || []).map((a) => a.centro));
  if (firma === S.firmaSegni) return;
  S.firmaSegni = firma;
  for (const s of S.segni) { try { S.scena.remove(s.f.g); } catch (e) {} try { s.et && s.et.remove(); } catch (e) {} }
  S.segni = [];
  const norma = d.segniNorma || [];
  const peggiori = norma.filter((s) => s.ok === false).sort((a, b) => a.larghezza - b.larghezza);
  norma.forEach((s) => {
    const colore = s.ok === false ? TINTE.conformita : '#C8D3E0';
    const f = creaFascio(T, S, s.x, s.y, s.z, colore, s.larghezza);
    let et = null;
    if (s === peggiori[0] || (s.tipo === 'varco' && s.ok === false && peggiori.indexOf(s) < 3)) {
      et = creaEtichetta(S, TINTE.conformita, (s.tipo === 'varco' ? tt(L, 'VARCO ', 'OPENING ') : tt(L, 'STRETTOIA ', 'NARROWING ')) + metri(s.larghezza, L) + ' ⚠',
        s.soglia != null ? '< ' + metri(s.soglia, L) : '', 70);
    }
    S.segni.push({ f, et, stato: 'conformita', x: s.x, y: s.y, z: s.z, forte: s.ok === false });
  });
  (d.accessi || []).forEach((a) => {
    if (!a.centro) return;
    const f = creaFascio(T, S, a.centro[0], a.centro[1], a.centro[2], TINTE.orientamento, a.larghezza || 1.2);
    const et = creaEtichetta(S, TINTE.orientamento, (a.nome || tt(L, 'ACCESSO', 'ENTRANCE')).toUpperCase(), a.larghezza ? metri(a.larghezza, L) : '', 64);
    S.segni.push({ f, et, stato: 'orientamento', x: a.centro[0], y: a.centro[1], z: a.centro[2], forte: true });
  });
}

// I SEGNI DELL'OCCHIO (`__veritasVistoNelMondo`): muri come lame di luce,
// porte come cornici, le altre cose come scatole sottili. Arrivano a fine giro:
// si accendono a gruppi, non tutti insieme.
function aggiornaSegniOcchio(S) {
  const visto = window.__veritasVistoNelMondo;
  if (!Array.isArray(visto) || visto === S.vistoLetto) return;
  S.vistoLetto = visto;
  const T = S.THREE;
  if (S.occhioGruppo) { S.scena.remove(S.occhioGruppo); }
  const g = new T.Group(); S.occhioGruppo = g; S.scena.add(g);
  const segni = segniDellOcchio(visto);
  S.segniOcchio = { muri: segni.muri.length, porte: segni.porte.length, cose: segni.cose.length };
  const h = Math.min(2.6, Math.max(1.2, S.vista.size.y * 0.35));
  S.codaOcchio = [];
  for (const m of segni.muri) {
    const lung = Math.hypot(m.b[0] - m.a[0], m.b[2] - m.a[2]);
    if (!(lung > 0.2)) continue;
    const geo = new T.PlaneGeometry(lung, h);
    const lama = new T.Mesh(geo, materialeLuce(T, OCCHIO, 0, 'faccia'));
    const orlo = new T.LineSegments(new T.EdgesGeometry(geo), materialeLuce(T, OCCHIO, 0, 'linea'));
    const gg = new T.Group(); gg.add(lama); gg.add(orlo);
    gg.position.set((m.a[0] + m.b[0]) / 2, Math.min(m.a[1], m.b[1]) + h / 2, (m.a[2] + m.b[2]) / 2);
    gg.rotation.y = -Math.atan2(m.b[2] - m.a[2], m.b[0] - m.a[0]);
    S.codaOcchio.push({ gg, mats: [[lama.material, 0.16], [orlo.material, 0.9]] });
  }
  for (const p of segni.porte) {
    if (!p.a || !p.b) continue;
    const pts = [p.a[0], p.a[1], p.a[2], p.a[0], p.a[1] + 2.1, p.a[2], p.a[0], p.a[1] + 2.1, p.a[2], p.b[0], p.b[1] + 2.1, p.b[2], p.b[0], p.b[1] + 2.1, p.b[2], p.b[0], p.b[1], p.b[2]];
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
    const cornice = new T.LineSegments(geo, materialeLuce(T, OCCHIO, 0, 'linea'));
    const gg = new T.Group(); gg.add(cornice);
    S.codaOcchio.push({ gg, mats: [[cornice.material, 1]] });
  }
  for (const c of segni.cose.slice(0, 400)) {
    const sx = c.max[0] - c.min[0], sy = c.max[1] - c.min[1], sz = c.max[2] - c.min[2];
    if (!(sx > 0.05 && sz > 0.05)) continue;
    const geo = new T.BoxGeometry(sx, Math.max(0.05, sy), sz);
    const sc = new T.LineSegments(new T.EdgesGeometry(geo), materialeLuce(T, OCCHIO, 0, 'linea'));
    geo.dispose();
    const gg = new T.Group(); gg.add(sc);
    gg.position.set((c.min[0] + c.max[0]) / 2, (c.min[1] + c.max[1]) / 2, (c.min[2] + c.max[2]) / 2);
    S.codaOcchio.push({ gg, mats: [[sc.material, 0.28]] });
  }
  log('segni dell\'occhio: ' + segni.muri.length + ' muri, ' + segni.porte.length + ' porte, ' + segni.cose.length + ' cose');
}

// DOVE STA GUARDANDO L'OCCHIO, vista per vista: una piramide di luce dove era
// la sua camera (prospettiva), una lama che passa sul modello (pianta).
function mostraVista(S, info) {
  if (!S || !S.aperto || !info) return;
  const T = S.THREE, cam = info.camera;
  if (cam && Array.isArray(cam.mondo) && cam.mondo.length === 16 && !cam.ortografica) {
    const m = cam.mondo;
    const p = [m[12], m[13], m[14]], av = [-m[8], -m[9], -m[10]], su = [m[4], m[5], m[6]], dx = [m[0], m[1], m[2]];
    const Lg = S.vista.raggio * 0.08, w = Lg * 0.55, h = Lg * 0.36;
    const angolo = (sx, sy) => [p[0] + av[0] * Lg + dx[0] * w * sx + su[0] * h * sy, p[1] + av[1] * Lg + dx[1] * w * sx + su[1] * h * sy, p[2] + av[2] * Lg + dx[2] * w * sx + su[2] * h * sy];
    const c = [angolo(-1, -1), angolo(1, -1), angolo(1, 1), angolo(-1, 1)];
    const pts = [];
    for (const q of c) pts.push(...p, ...q);
    for (let i = 0; i < 4; i++) pts.push(...c[i], ...c[(i + 1) % 4]);
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
    const lin = new T.LineSegments(geo, materialeLuce(T, OCCHIO, 1, 'linea'));
    S.scena.add(lin);
    S.impronteVista.push({ o: lin, nata: performance.now(), dura: 5000 });
  } else {
    const b = S.box, size = new T.Vector3(); b.getSize(size);
    const geo = new T.PlaneGeometry(size.z * 1.05, Math.max(0.5, size.y * 1.05));
    const lama = new T.Mesh(geo, materialeLuce(T, OCCHIO, 0.22, 'faccia'));
    lama.rotation.y = Math.PI / 2;
    lama.position.set(b.min.x, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2);
    S.scena.add(lama);
    S.impronteVista.push({ o: lama, nata: performance.now(), dura: 1800, passa: [b.min.x, b.max.x] });
  }
  while (S.impronteVista.length > 7) { const v = S.impronteVista.shift(); S.scena.remove(v.o); }
}

function verso(val, obiettivo, k) { return val + (obiettivo - val) * k; }

function diradaEtichette(S, posate) {
  const prese = [];
  posate.sort((a, b) => b.y - a.y);
  for (const p of posate) {
    const pill = p.et.lastElementChild, filo = p.et.children[1];
    const w = (pill.offsetWidth || 160) + 8, h = (pill.offsetHeight || 30) + 6;
    let alto = p.base;
    for (let tentativo = 0; tentativo < 5; tentativo++) {
      const r = { x0: p.x - w / 2, x1: p.x + w / 2, y1: p.y - alto, y0: p.y - alto - h };
      if (!prese.some((q) => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0)) { prese.push(r); break; }
      alto += h;
      if (tentativo === 4) prese.push(r);
    }
    if (filo.__alto !== alto) { filo.style.height = alto + 'px'; filo.__alto = alto; }
  }
}

// Ogni fotogramma: la camera gira piano, le zone crescono e respirano, i segni
// seguono lo stato, le etichette seguono il loro punto.
function aggiornaScena(S, t) {
  posaCamera(S, t);
  S.cam.updateMatrixWorld();
  const stato = S.stato;
  const v = new S.THREE.Vector3();
  const posate = [];
  const proietta = (x, y, z, et, base) => {
    v.set(x, y, z).project(S.cam);
    if (v.z > 1 || v.x < -1.2 || v.x > 1.2 || v.y < -1.2 || v.y > 1.2) { et.style.display = 'none'; return; }
    et.style.display = 'flex';
    const px = (v.x * 0.5 + 0.5) * S.larghezza, py = (-v.y * 0.5 + 0.5) * S.altezza;
    et.style.left = px + 'px';
    et.style.top = py + 'px';
    if (Number(et.style.opacity) > 0.05) posate.push({ et, x: px, y: py, base: base || 46 });
  };

  const pesoZone = stato === 'zone' ? 1 : stato === 'attesa' ? 0.6 : 0.4;
  const conEtichetta = new Set([...S.accese.values()].filter((z) => !z.spenta)
    .sort((a, b) => (b.confermata - a.confermata) || ((b.nodo.areaM2 || 0) - (a.nodo.areaM2 || 0))).slice(0, 7).map((z) => z));
  for (const z of S.accese.values()) {
    const eta = z.spenta ? Math.max(0, 1 - (t - z.spenta) / 600) : Math.min(1, (t - z.nata) / 900);
    const respiro = 0.85 + 0.15 * Math.sin(t * 0.0022 + z.indice);
    const k = eta * pesoZone * (z.confermata ? 1.25 : 1);
    z.vol.fondo.material.opacity = 0.16 * k * respiro;
    z.vol.orlo.material.opacity = 0.95 * k;
    z.vol.pareti.material.opacity = 0.07 * k * respiro;
    z.vol.spigoli.material.opacity = 0.55 * k;
    z.vol.alzato.scale.y = Math.max(0.001, eta);
    const vedi = !z.spenta && conEtichetta.has(z) && (stato === 'zone' || stato === 'attesa' || z.confermata);
    z.et.style.opacity = vedi ? String(eta) : '0';
    if (vedi) proietta(z.nodo.pos[0], (z.nodo.pos[1] || 0) + 0.2, z.nodo.pos[2], z.et, 46);
  }
  for (const s of S.segni) {
    const obiettivo = s.stato === stato ? 1 : 0;
    s.peso = verso(s.peso || 0, obiettivo, 0.06);
    const pulsa = s.forte ? 0.75 + 0.25 * Math.sin(t * 0.004) : 0.6;
    for (const [m, o] of s.f.mats) m.opacity = o * s.peso * pulsa;
    s.f.g.visible = s.peso > 0.01;
    if (s.et) { s.et.style.opacity = String(s.peso); if (s.peso > 0.02) proietta(s.x, (s.y || 0) + 0.3, s.z, s.et, 64); else s.et.style.display = 'none'; }
  }
  S.fotogrammi = (S.fotogrammi || 0) + 1;
  if (S.fotogrammi % 3 === 0 || posate.length !== S.ultimePosate) { S.ultimePosate = posate.length; diradaEtichette(S, posate); }
  if (S.codaOcchio && S.codaOcchio.length) {
    for (let i = 0; i < 12 && S.codaOcchio.length; i++) { const c = S.codaOcchio.shift(); c.nata = t; S.occhioGruppo.add(c.gg); (S.occhioAccesi = S.occhioAccesi || []).push(c); }
  }
  for (const c of S.occhioAccesi || []) {
    const eta = Math.min(1, (t - c.nata) / 700);
    for (const [m, o] of c.mats) m.opacity = o * eta * (stato === 'zone' ? 1 : 0.55);
  }
  for (let i = S.impronteVista.length - 1; i >= 0; i--) {
    const iv = S.impronteVista[i], e = (t - iv.nata) / iv.dura;
    if (e >= 1) { S.scena.remove(iv.o); S.impronteVista.splice(i, 1); continue; }
    if (iv.passa) iv.o.position.x = iv.passa[0] + (iv.passa[1] - iv.passa[0]) * e;
    iv.o.material.opacity = (iv.passa ? 0.22 : 1) * (1 - e);
  }
}

// ---------------------------------------------------------------------------
// IL BATTITO: legge lo stato vero, accende, promuove, sceglie lo stato, chiude
// ---------------------------------------------------------------------------

function nodiDiAdesso() {
  if (typeof window.__veritasGetNodes !== 'function') return [];
  try { return window.__veritasGetNodes() || []; } catch (e) { return []; }
}

function leggiDati(S) {
  const W = window;
  const d = { splat: !!S.splat };
  const perc = W.__veritasPercezione || null;
  const zoneM = zoneMisurate(perc);
  const vive = [...S.accese.values()].filter((z) => !z.spenta);
  const tot = Math.max(vive.length + S.coda.length, 0);
  const max = zoneM.reduce((m, z) => (!m || (z.areaM2 || 0) > (m.areaM2 || 0) ? z : m), null);
  d.zone = { tot, accese: vive.length, confermate: vive.filter((z) => z.confermata).length,
    ambienti: zoneM.filter((z) => !z.passaggio).length, passaggi: zoneM.filter((z) => z.passaggio).length,
    max: max ? { label: max.label, area: max.areaM2 } : null };
  const mis = W.__veritasMisure || null;
  if (mis) { d.area = mis.areaNavigabileM2 || null; d.livelli = mis.livelli || null; d.varchiMisurati = (mis.larghezza_varco_m || []).length; }
  const ver = W.__veritasVerdict || null;
  if (ver && typeof ver.zone === 'number') d.verdetto = { tipo: ver.tipo, zone: ver.zone, varchi: ver.varchi, livelli: ver.livelli };
  try { if (W.__veritasNormative && mis) d.verifiche = verificheDiConformita(W.__veritasNormative.valuta(mis), 'IT'); } catch (e) { d.verifiche = null; }
  if (d.verifiche) {
    d.segniNorma = segniDaVerificare(perc, d.verifiche);
    const peggiore = d.segniNorma.filter((s) => s.ok === false).sort((a, b) => a.larghezza - b.larghezza)[0];
    if (peggiore) {
      const dove = zoneM.find((z) => dentroImpronta(z, peggiore.x, peggiore.z));
      d.dovePeggiore = dove ? dove.label : null;
      d.incertezzaPeggiore = peggiore.incertezza;
    }
  }
  const acc = W.__veritasAccessi;
  if (acc && Array.isArray(acc.accessi)) {
    d.accessi = acc.accessi.map((a) => ({ nome: a.nome || null, centro: v3(a.centro), larghezza: a.larghezza > 0 ? a.larghezza : null,
      indizi: typeof a.indizi === 'number' ? a.indizi : Array.isArray(a.indizi) ? a.indizi.length : null }));
  }
  const seg = W.__veritasSegnaleticaTrovata;
  if (seg) {
    const fam = Array.isArray(seg.famiglie) ? seg.famiglie.length : null;
    d.segnaletica = fam ? { testo: fam + tt(S.lingua, ' famiglie di colore lette', ' colour families read') }
      : { testo: tt(S.lingua, 'nessun cartello letto', 'no sign read'), nota: seg.motivo ? String(seg.motivo) : null };
  }
  if (W.__veritasNavmeshEsito) d.navmesh = !!W.__veritasNavmeshEsito.ok;
  if (typeof W.__veritasTrattiForzati === 'number') d.tratti = W.__veritasTrattiForzati;
  if (typeof W.__veritasIrraggiungibili === 'number') d.irraggiungibili = W.__veritasIrraggiungibili;
  else if (d.navmesh != null) d.irraggiungibili = 0;
  if (d.navmesh != null && d.tratti == null) d.tratti = 0;
  const cose = W.__veritasCoseTrovate;
  if (cose && Array.isArray(cose.posti)) d.posti = cose.posti.length;
  d.occhio = {
    viste: S.viste || 0, quale: S.vistaQuale || null, quante: S.vistaQuante || null,
    parlato: S.occhioHaParlato, assente: S.occhioAssente,
    giro: W.__veritasGiroInCorso === true || W.__veritasGiroInCorso === 'true',
    fallito: S.esitoOcchio && S.esitoOcchio.ok === false ? (S.esitoOcchio.perche || tt(S.lingua, 'motivo non detto', 'reason not given')) : null,
  };
  if (S.segniOcchio) d.segni = S.segniOcchio;
  const md = W.__veritasProjectModello || null;
  d.file = md && md.nome ? { nome: md.nome, mb: md.peso > 0 ? md.peso / 1048576 : md.byte > 0 ? md.byte / 1048576 : md.size > 0 ? md.size / 1048576 : null } : null;
  d.ingombro = S.ingombro;
  d.mesh = S.contaMesh;
  d.gaussiane = S.gaussiane;
  return d;
}

function battito() {
  if (!S || !S.aperto) return;
  const nodi = conLOcchio(zoneMisurate(window.__veritasPercezione), nodiDiAdesso(), S.tipiOcchio);
  const vive = new Map([...S.accese].filter(([, z]) => !z.spenta));
  const { adesso, nuove, promosse, spente, rinominate } = confronta(vive, nodi);
  const ora = performance.now();

  for (const [k, z] of vive) if (adesso.has(k)) z.mancaDa = 0;
  if (nodi.length) {
    for (const k of spente) {
      const z = vive.get(k);
      if (!z.mancaDa) z.mancaDa = ora;
      else if (ora - z.mancaDa >= ASSENZA_PRIMA_DI_SPEGNERE) spegniZona(S, z);
    }
  }
  for (const k of promosse) promuovi(S, vive.get(k), adesso.get(k), adesso.get(k).tipo);
  for (const k of rinominate) {
    const z = vive.get(k);
    z.nodo = adesso.get(k); z.label = z.nodo.label || z.label;
    rinomina(z);
  }
  for (const k of nuove) if (!S.coda.includes(k)) S.coda.push(k);
  S.coda = S.coda.filter((k) => adesso.has(k) && !vive.has(k));
  // In attesa non si accende niente: il report dice «in attesa», la scena pure.
  const dovute = S.stato === 'attesa' ? 0 : S.ultimaAccensione ? Math.floor((ora - S.ultimaAccensione) / PASSO_ACCENSIONE) : 1;
  for (let i = 0; i < Math.min(3, dovute) && S.coda.length; i++) {
    const k = S.coda.shift();
    const vecchia = S.accese.get(k);
    if (vecchia && vecchia.spenta) S.accese.delete(k);
    accendiZona(S, k, adesso.get(k));
    S.ultimaAccensione = ora;
    if (!S.primaZonaDetta) { S.primaZonaDetta = true; log('prima zona accesa dopo ' + Math.round((Date.now() - S.nascita) / 1000) + ' s'); }
  }

  const esito = window.__veritasComprensione;
  if (esito && esito !== S.esitoAllaNascita && !(window.__veritasGiroInCorso === true || window.__veritasGiroInCorso === 'true') && !S.esitoLetto) {
    S.esitoLetto = true;
    S.occhioHaParlato = true;
    S.ultimaNotizia = Date.now();
    S.esitoOcchio = esito;
    log('l\'occhio ha consegnato il suo giro' + (esito.ok === false ? ' senza riuscire: ' + (esito.perche || 'motivo non detto') : ''));
  }
  if (window.__veritasGiroInCorso === true || window.__veritasGiroInCorso === 'true' || S.viste) S.giroVisto = true;
  const occhioAssente = !S.giroVisto && !S.occhioHaParlato && Date.now() - S.nascita >= ATTESA_AVVIO_OCCHIO;
  if (occhioAssente && !S.assenzaDetta) {
    S.assenzaDetta = true;
    log('il giro dell\'occhio non e\' partito in ' + Math.round(ATTESA_AVVIO_OCCHIO / 1000) + ' s: non lo si aspetta');
  }
  S.occhioAssente = occhioAssente;

  aggiornaSegniOcchio(S);
  S.dati = leggiDati(S);
  aggiornaSegni(S);

  // La successione degli stati.
  const pronti = {
    zone: S.dati.zone.tot > 0,
    conformita: !!S.dati.verifiche,
    orientamento: !!(S.dati.accessi || S.dati.navmesh != null),
  };
  const prossimo = prossimoStato({ stato: S.stato, eta: Date.now() - S.statoDa, pronti, zoneInCoda: S.coda.length > 0, manuale: Date.now() < S.manualeFino });
  if (prossimo !== S.stato) cambiaStato(S, prossimo);
  scriviReport(S, false);
  scriviCoda(S);
  scriviSotto(S);
  if (S.scheda.classList.contains('aperta')) scriviScheda(S);

  const quando = quandoChiudere({
    nascita: S.nascita, occhioHaParlato: S.occhioHaParlato, occhioAssente,
    ultimaNotizia: S.ultimaNotizia, durataMinima: S.durataMinima,
  });
  if (Date.now() >= quando && !S.coda.length) {
    chiudi(S.occhioHaParlato ? 'l\'occhio ha parlato'
      : occhioAssente ? 'il giro dell\'occhio non e\' partito'
      : 'tetto di ' + Math.round(TETTO_ATTESA / 60000) + ' minuti');
  } else if (Date.now() >= S.nascita + TETTO_ATTESA) {
    chiudi('tetto di ' + Math.round(TETTO_ATTESA / 60000) + ' minuti');
  }
}

function cambiaStato(S, nuovo) {
  S.visti[S.stato] = true;
  S.stato = nuovo;
  S.statoDa = Date.now();
  S.visti[nuovo] = true;
  S.dettaglio.classList.remove('aperto');
  segnaStato(S);
  scriviReport(S, true);
  (S.successione = S.successione || []).push(nuovo);
  log('stato: ' + nuovo);
}

function agganciaEventiVeri(S) {
  S.viste = 0;
  S.suVista = (e) => {
    if (!S) return;
    S.viste++;
    const info = e && e.detail;
    if (info && info.quante) { S.vistaQuale = info.quale; S.vistaQuante = info.quante; }
    try { mostraVista(S, info); } catch (err) { /* la messa in scena non deve fermare il giro */ }
  };
  addEventListener('veritas:vista', S.suVista);

  const prec = window.__veritasApplicaOcchi;
  window.__veritasApplicaOcchi = function (esito, zone) {
    let out;
    try { out = prec ? prec.apply(this, arguments) : undefined; }
    finally {
      try {
        if (S && S.aperto && esito && esito.assegnate) {
          const nodi = (zone && zone.length) ? zone : nodiDiAdesso();
          let dette = 0;
          for (const a of esito.assegnate) {
            if (a.sicurezza === 'bassa') continue;
            const n = nodi && nodi[a.indice];
            if (!confermataDallOcchio(n)) continue;
            if (a.tipo) S.tipiOcchio.set(chiaveNodo(n), a.tipo);
            dette++;
          }
          if (dette) { S.occhioHaParlato = true; S.ultimaNotizia = Date.now(); }
        }
      } catch (e) { /* la messa in scena non deve mai far cadere il vero assegnamento */ }
    }
    return out;
  };
}

function sgancia(S) {
  try { removeEventListener('veritas:vista', S.suVista); } catch (e) {}
  try { clearInterval(S.timerBattito); } catch (e) {}
  try { removeEventListener('resize', S.onResize); } catch (e) {}
}

function giro(t) {
  if (!S || !S.aperto) return;
  try { aggiornaScena(S, t); S.ren.render(S.scena, S.cam); }
  catch (e) { if (!S.erroreDetto) { S.erroreDetto = true; log('resa: ' + ((e && e.message) || e)); } }
  S.raf = requestAnimationFrame(giro);
}

function chiudi(perche) {
  if (!S || !S.aperto) return;
  S.aperto = false;
  cancelAnimationFrame(S.raf);
  sgancia(S);
  const velo = S.velo, ospite = S.ospite, ren = S.ren;
  velo.style.opacity = '0';
  // Il timeout cattura `ospite`, non `S.ospite`: S e' nullo quando scatta (17/09).
  setTimeout(() => { try { ospite.remove(); } catch (e) {} try { ren.dispose(); } catch (e) {} }, 900);
  const vive = [...S.accese.values()].filter((z) => !z.spenta);
  const conf = vive.filter((z) => z.confermata).length;
  log('chiusa dopo ' + Math.round((Date.now() - S.nascita) / 1000) + ' s (' + (perche || 'chiamata a mano') + ') — '
    + vive.length + (vive.length === 1 ? ' zona accesa, ' : ' zone accese, ') + conf
    + (conf === 1 ? ' confermata' : ' confermate') + ' dall\'occhio; stati mostrati: ' + (S.successione || []).join(' → ')
    + '; l\'analisi vera continua sotto, invariata');
  S = null;
}

async function costruisciEApri() {
  const radice = window.__veritasModelRoot;
  if (!window.THREE || !radice) return;
  if (window.__veritasAperturaAuto === false) return;
  if (S && (S.aperto || S.inCostruzione)) return;
  S = { inCostruzione: true };

  const splat = eSplat(radice);
  let T = window.THREE, Spark = null;
  if (splat) {
    // Lo splat vive sul three dell'importmap (quello di Spark): la replica si
    // fa li', con un renderer di quella stessa copia.
    try { T = await import('three'); Spark = await import('@sparkjsdev/spark'); }
    catch (e) { log('Spark non disponibile per la replica: ' + e.message); T = window.THREE; Spark = null; }
  }
  const L = lingua();
  const parti = creaVelo(L);
  try {
    await montaScena(T, Spark, splat, radice, L, parti);
  } catch (e) {
    try { parti.ospite.remove(); } catch (x) {}
    S = null;
    throw e;
  }
}

async function montaScena(T, Spark, splat, radice, L, parti) {
  const larghezza = innerWidth, altezza = innerHeight;
  const ren = new T.WebGLRenderer({ canvas: parti.tela, antialias: true, alpha: true });
  ren.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  ren.setSize(larghezza, altezza, false);
  ren.setClearColor(0x000000, 0);
  if (T.SRGBColorSpace) ren.outputColorSpace = T.SRGBColorSpace;
  ren.toneMapping = T.ACESFilmicToneMapping;
  ren.toneMappingExposure = 1.05;

  const scena = new T.Scene();
  const cam = new T.PerspectiveCamera(40, larghezza / altezza, 0.1, 1000);
  scena.add(new T.HemisphereLight(0xb8c4d6, 0x141820, 0.95));
  const sole = new T.DirectionalLight(0xffffff, 1.7); sole.position.set(-1, 1.6, 0.8); scena.add(sole);
  const controluce = new T.DirectionalLight(0x8fa3c8, 0.45); controluce.position.set(1, 0.6, -1); scena.add(controluce);

  const box = ingombroDi(T, radice, splat);
  const vista = inquadra(T, box, cam, larghezza, altezza);
  sole.position.multiplyScalar(vista.raggio * 2).add(vista.centro);
  controluce.position.multiplyScalar(vista.raggio * 2).add(vista.centro);
  let contaMesh = null, gaussiane = null;
  if (splat && Spark) {
    try { await replicaSplat(T, Spark, splat, scena, ren); gaussiane = splat.packedSplats && splat.packedSplats.numSplats || null; }
    catch (e) { log('replica dello splat non riuscita: ' + e.message + ' — le zone si mostrano lo stesso'); }
  } else if (!splat) {
    contaMesh = replicaArgilla(T, radice, scena);
  }
  ombraATerra(T, scena, box);

  const size = new T.Vector3(); box.getSize(size);
  S = {
    aperto: true, THREE: T, splat: !!splat, lingua: L, ...parti, ren, scena, cam, box, vista,
    larghezza, altezza, accese: new Map(), coda: [], ultimaAccensione: 0, tipiOcchio: new Map(), contaZone: 0,
    segni: [], impronteVista: [], visti: { attesa: true }, stato: 'attesa', statoDa: Date.now(), manualeFino: 0,
    nascita: Date.now(), durataMinima: window.__veritasAperturaDurata || DURATA_MINIMA,
    occhioHaParlato: false, ultimaNotizia: 0,
    esitoAllaNascita: window.__veritasComprensione || null, esitoLetto: false, esitoOcchio: null,
    ingombro: box.isEmpty() ? null : [size.x, size.y, size.z], contaMesh, gaussiane,
  };
  S.velo.addEventListener('click', (e) => {
    const b = e.target.closest('[data-azione],[data-stato]');
    if (!b || !S) return;
    if (b.dataset.azione === 'entra') chiudi('Entra');
    else if (b.dataset.azione === 'dati') { S.scheda.classList.toggle('aperta'); scriviScheda(S); }
    else if (b.dataset.azione === 'dettaglio') { S.dettaglio.classList.toggle('aperto'); scriviDettaglio(S); }
    else if (b.dataset.stato && b.classList.contains('vap-passo')) {
      S.manualeFino = Date.now() + PAUSA_MANUALE;
      if (b.dataset.stato !== S.stato) cambiaStato(S, b.dataset.stato);
    }
  });
  S.velo.querySelectorAll('.vap-passo, .vap-bottone, .vap-primario, .vap-secondario').forEach((b) => { b.style.pointerEvents = 'auto'; });
  agganciaEventiVeri(S);
  S.dati = leggiDati(S);
  segnaStato(S);
  scriviReport(S, true);
  scriviCoda(S);
  scriviSotto(S);
  S.timerBattito = setInterval(() => { try { battito(); } catch (e) { log('battito: ' + ((e && e.message) || e)); } }, BATTITO);
  S.onResize = () => {
    if (!S || !S.aperto) return;
    S.larghezza = innerWidth; S.altezza = innerHeight;
    S.ren.setSize(S.larghezza, S.altezza, false);
    S.cam.aspect = S.larghezza / S.altezza;
    inquadra(S.THREE, S.box, S.cam, S.larghezza, S.altezza);
  };
  addEventListener('resize', S.onResize);

  log('aperta — ' + (splat ? 'splat' : 'mesh') + '; stati in successione (attesa → zone → conformità → orientamento); resta aperta finche\' l\'occhio non ha parlato'
    + ' (al massimo ' + Math.round(TETTO_ATTESA / 60000) + ' minuti), o "Entra"');
  S.raf = requestAnimationFrame(giro);
}

// Parte da sola quando un modello nuovo entra.
let ultimaRadiceVista = null;
function forseParti() {
  const r = window.__veritasModelRoot;
  if (!r || r === ultimaRadiceVista) return;
  ultimaRadiceVista = r;
  costruisciEApri().catch((e) => { log('apertura non riuscita: ' + ((e && e.message) || e)); if (S && !S.aperto) S = null; });
}

// Fuori da un browser (le prove in Node) si caricano solo le regole pure.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  addEventListener('veritas:modello', forseParti);
  setInterval(forseParti, 1000);
  window.__veritasApertura = { apri: costruisciEApri, chiudi, stato: () => (S && S.aperto ? {
    aperta: S.aperto, secondi: Math.round((Date.now() - S.nascita) / 1000), stato: S.stato,
    successione: (S.successione || []).slice(), splat: S.splat,
    accese: [...S.accese.values()].filter((z) => !z.spenta).map((z) => ({ zona: z.label, confermata: z.confermata })),
    inCoda: S.coda.length, occhioHaParlato: S.occhioHaParlato, viste: S.viste,
    report: S.dati ? reportDi(S.stato, S.dati, S.lingua) : null,
  } : { aperta: false }) };
  log('pronta — parte da sola al caricamento di un modello, o window.__veritasApertura.apri()');
}

export default { apri: costruisciEApri, chiudi };
