// veritas_apertura.js — L'APERTURA. La scena vuota che prende forma, in diretta.
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
// QUESTO FILE FA UNA COSA SOLA: appena un modello entra, apre un velo sopra
// tutto il resto. Il modello vero (non un doppione disegnato a mano) prende
// peso; poi
//   1. le zone MISURATE si accendono a terra una alla volta, con la loro forma
//      misurata (lungo x largo x verso), in grigio: «misurata»;
//   2. per ognuna si apre di lato una scheda: nome misurato, m², dimensioni,
//      «in attesa dell'occhio»;
//   3. quando l'occhio conferma una zona, la sua impronta e la sua scheda
//      passano al colore dell'occhio, col nome che l'occhio le ha dato.
// Non e' un filmato: e' lo stato vero che gia' gira, reso visibile.
//
// ⚠️ 17/09 SERA, MISURATO SULLA PAGINA PUBBLICATA, ed e' il motivo della
//    regola 2 qui dentro: l'apertura si apriva a 10 s e si chiudeva a 40 s
//    SENZA AVER ACCESO NIENTE, perche' accendeva solo cio' che l'occhio aveva
//    confermato — e l'occhio ha parlato dopo circa 5 minuti. Il cliente vedeva
//    un modello grigio per trenta secondi, poi il buio.
//
// ⚠️ SI MOSTRA SOLO CIO' CHE E' VERO (direttiva 10). Una zona misurata si
//    presenta per quello che e': un'area misurata, col nome neutro che la
//    misura le da' («Zona 3 · 210 m²»), in grigio e con la scritta «in attesa
//    dell'occhio». Il colore e il nome dell'occhio arrivano SOLO dai nodi la
//    cui origine e' davvero l'occhio (`occhi`/`comprensione`) — la correzione
//    del 16/09 resta: un ripiego non si spaccia mai per riconoscimento.
//
// ⚠️ NON RIFA' I PUNTINI. Tolti il 15/09 su richiesta di Raffaella ("quel
//    rendering con i puntini non fa capire niente") — qui non ce n'e' uno.
//
// ⚠️ NON TOCCA LA SCENA VERA. Le mesh qui dentro sono repliche che
//    condividono la STESSA geometria (BufferGeometry per riferimento, non
//    copiata) con una materia fantasma tutta loro, in un canvas e una scena
//    TUTTI NOSTRI, sopra un velo. Se questo file si spegne, l'app sotto non
//    se ne accorge. Le zone si LEGGONO da `__veritasGetNodes()`, mai scritte.
//
// ⚠️ IL VESTITO E' CARTA (Raffaella, 05/09/2026, vive in veritas_carta.js).
//    Piattaforma chiara (#FAFBFA), scena 3D grigia (#E9EBF0), testo inchiostro
//    scuro. La tinta d'accento viene dalla formula delle quattro velature del
//    marchio (oklch, grado 266, lo stesso della finestra "modello").
//
// MANOPOLE
//   window.__veritasAperturaAuto = false   per NON farla partire da sola
//   window.__veritasAperturaDurata         ms minimi di apertura (default 30000)
//
//   node --check veritas_apertura.js   ·   node veritas_apertura.test.mjs
// =============================================================================

// I TEMPI, e ognuno ha un tetto (HANDOFF §4, regola 10: niente attese
// indefinite).
//   · una zona nuova si accende ogni PASSO_ACCENSIONE: abbastanza lento da
//     leggerla, abbastanza svelto da non far aspettare;
//   · finche' l'occhio non ha parlato il velo NON si chiude da solo — e' la
//     regola 2 — ma mai oltre TETTO_ATTESA dall'apertura: se l'occhio non
//     arriva, si chiude e lo si dice;
//   · quando l'occhio ha parlato si lascia il tempo di vedere l'ultima
//     conferma (RESPIRO_DOPO_OCCHIO) e si chiude;
//   · «Entra» chiude sempre, in ogni momento.
export const DURATA_MINIMA = 30000;
export const PASSO_ACCENSIONE = 900;
export const RESPIRO_DOPO_OCCHIO = 8000;
export const TETTO_ATTESA = 10 * 60 * 1000;
// Se il giro dell'occhio non parte nemmeno, non lo si aspetta dieci minuti: il
// velo si chiude alla durata minima e lo dice.
export const ATTESA_AVVIO_OCCHIO = 60000;
// Durante una rianalisi l'elenco dei nodi puo' svuotarsi per un istante: una
// zona si spegne solo se manca davvero, per piu' di questo tempo.
const ASSENZA_PRIMA_DI_SPEGNERE = 2000;
const BATTITO = 300;

const VEIL_266 = 'oklch(.965 .026 266)';
const ACCENTO_266 = 'oklch(.58 .16 266)';   // per CSS (bordi, testo d'accento)
const ACCENTO_266_HEX = 0x5b63c9;           // stessa tinta, approssimata per THREE (non legge oklch)
const MISURATA_HEX = 0x7d8494;              // grigio inchiostro: misurata, non ancora vista
const MISURATA_CSS = '#9aa1b1';
const CARTA = '#FAFBFA';
const ALZATO = '#FFFFFF';
const SCENA_GRIGIA = 0xe9ebf0;
const INCHIOSTRO = '#232838';
const INCHIOSTRO_MUTO = '#6b7280';

// ⚠️ 16/09/2026, CORRETTO DOPO UNA FALSA PROVA — Raffaella aveva ragione:
//    `origine === "nome+misura"` e `"misura"` sono la lettura del nome sulla
//    mesh o la sola misura geometrica, MAI l'occhio che ha guardato questo
//    modello. Solo queste due origini contano come «l'occhio ha parlato»:
export const ORIGINI_OCCHIO = new Set(['occhi', 'comprensione']);

let S = null; // stato della sessione aperta corrente

function log(m) { try { console.log('[VERITAS apertura] ' + m); } catch (e) {} }

// ---------------------------------------------------------------------------
// LE REGOLE, SENZA SCENA — pure, provate in veritas_apertura.test.mjs
// ---------------------------------------------------------------------------

/** La chiave di una zona: lo stesso nodo nello stesso posto. Dopo una rianalisi
 *  un nodo con lo stesso id ma spostato e' un'altra zona, e va riacceso. */
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
 *
 * ⚠️ 17/09 SERA, VISTO SULLA PAGINA PUBBLICATA (costruzione -b): la prima
 *    versione leggeva le zone da `__veritasGetNodes()`, e li' dentro ci sono
 *    anche le TAPPE CABLATE NEL BUNDLE — «Ingresso / Parcheggio»,
 *    «Accettazione», «Controllo», «Lounge», «Imbarco A», «Gate A1», nate a
 *    coordinate fisse di un altro aeroporto e poi spostate sugli oggetti
 *    (origine «cose»/«cammino») senza cambiare nome. L'apertura le mostrava
 *    come «misurate»: era la Regola 0-bis violata davanti al cliente.
 *    Ora le zone vengono SOLO dal motore che le misura, col nome neutro che
 *    la misura permette. Le tappe non si mostrano mai.
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
      areaM2: q.areaM2 > 0 ? q.areaM2 : null,
      formaLungo: q.formaLungo > 0 ? q.formaLungo : null,
      formaLargo: q.formaLargo > 0 ? q.formaLargo : null,
      formaAngolo: typeof q.formaAngolo === 'number' ? q.formaAngolo : null,
    });
  });
  return out;
}

/** Il punto (x, z) sta dentro l'impronta della zona? Rettangolo orientato se
 *  la forma e' misurata, altrimenti il cerchio della sua area. */
function dentroImpronta(z, x, zz) {
  const dx = x - z.pos[0], dz = zz - z.pos[2];
  if (z.formaLungo > 0 && z.formaLargo > 0) {
    // La stessa rotazione del volume disegnato: rotation.y = -formaAngolo.
    const a = typeof z.formaAngolo === 'number' ? z.formaAngolo : 0;
    const u = dx * Math.cos(a) + dz * Math.sin(a);
    const v = -dx * Math.sin(a) + dz * Math.cos(a);
    return Math.abs(u) <= z.formaLungo / 2 && Math.abs(v) <= z.formaLargo / 2;
  }
  const r = z.areaM2 > 0 ? Math.sqrt(z.areaM2 / Math.PI) : 3;
  return dx * dx + dz * dz <= r * r;
}

/**
 * Dove l'occhio ha parlato. Ogni nodo la cui origine e' davvero l'occhio si
 * posa sulla zona misurata che lo contiene (la piu' piccola, se piu' d'una):
 * quella zona prende il nome dell'occhio. Un nodo dell'occhio che non cade in
 * nessuna zona si mostra da solo — e' comunque qualcosa che l'occhio ha visto
 * li'. I nodi che non vengono dall'occhio non entrano mai.
 */
export function conLOcchio(zone, nodi, tipi) {
  const out = zone.map((z) => ({ ...z }));
  for (const n of (nodi || [])) {
    if (!confermataDallOcchio(n) || !Array.isArray(n.pos)) continue;
    let meglio = -1;
    out.forEach((z, i) => {
      if (confermataDallOcchio(z) && z.nodoOcchio) return;   // gia' presa da un altro nodo
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

/** La riga delle misure di una scheda: solo quello che e' misurato. */
export function misureDi(n) {
  const parti = [];
  if (n && n.formaLungo > 0 && n.formaLargo > 0) parti.push(numero(n.formaLungo) + ' × ' + numero(n.formaLargo) + ' m');
  if (n && n.areaM2 > 0) parti.push(Math.round(n.areaM2) + ' m²');
  return parti.join(' · ');
}

/**
 * Quando chiudere il velo (millisecondi epoch). Regola 2 del §9: finche'
 * l'occhio non ha parlato si resta aperti, fino al tetto. Quando ha parlato
 * si chiude dopo il respiro, mai prima della durata minima, mai dopo il tetto.
 */
export function quandoChiudere({ nascita, occhioHaParlato, occhioAssente, ultimaNotizia, durataMinima }) {
  const tetto = nascita + TETTO_ATTESA;
  const minima = nascita + (durataMinima > 0 ? durataMinima : DURATA_MINIMA);
  if (!occhioHaParlato) return occhioAssente ? Math.min(tetto, minima) : tetto;
  return Math.min(tetto, Math.max(minima, (ultimaNotizia || nascita) + RESPIRO_DOPO_OCCHIO));
}

/**
 * Confronta le zone accese con i nodi di adesso. Restituisce cosa accendere
 * (in ordine), cosa promuovere a «confermata dall'occhio», cosa spegnere
 * perche' una rianalisi l'ha sostituita, e cosa ha solo cambiato nome.
 */
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

// ---------------------------------------------------------------------------
// IL VELO, LA TESTATA, IL PANNELLO DEI REPORT
// ---------------------------------------------------------------------------

function creaVelo() {
  const velo = document.createElement('div');
  velo.style.cssText = `position:fixed;inset:0;z-index:99990;background:${CARTA};`
    + 'opacity:0;transition:opacity 900ms ease;overflow:hidden;font-family:"JetBrains Mono",monospace;';
  document.body.appendChild(velo);
  requestAnimationFrame(() => { velo.style.opacity = '1'; });

  const tela = document.createElement('canvas');
  tela.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  velo.appendChild(tela);

  const testata = document.createElement('div');
  testata.style.cssText = 'position:absolute;left:0;right:0;top:0;padding:28px 36px;pointer-events:none;';
  testata.innerHTML = `<div style="font-size:11px;letter-spacing:0.14em;color:${INCHIOSTRO_MUTO};">EIDETICA</div>`
    + `<div id="va-riga1" style="font-size:15px;margin-top:6px;min-height:20px;color:${INCHIOSTRO};font-weight:600;"></div>`
    + `<div id="va-riga2" style="font-size:11.5px;margin-top:4px;min-height:16px;color:${INCHIOSTRO_MUTO};"></div>`;
  velo.appendChild(testata);

  const salta = document.createElement('button');
  salta.textContent = 'Entra ->';
  salta.style.cssText = `position:absolute;right:28px;bottom:28px;z-index:3;`
    + `padding:10px 18px;border-radius:8px;border:1px solid ${ACCENTO_266};`
    + `background:${ALZATO};color:${INCHIOSTRO};font-family:inherit;font-size:12px;`
    + 'cursor:pointer;letter-spacing:0.04em;box-shadow:0 2px 8px rgba(30,35,60,0.10);';
  salta.onmouseenter = () => { salta.style.background = VEIL_266; };
  salta.onmouseleave = () => { salta.style.background = ALZATO; };
  salta.onclick = () => chiudi('Entra');
  velo.appendChild(salta);

  // IL PANNELLO LATERALE — Raffaella, 16/09: «pannelli informativi laterali
  // che poi confluiscano nella documentazione». Una scheda per zona, aperta
  // nell'ordine in cui la zona si accende: la stessa lista e' pensata per
  // diventare, senza altra trasformazione, la sorgente del report scaricabile.
  const pannello = document.createElement('div');
  pannello.style.cssText = `position:absolute;right:28px;top:28px;bottom:80px;width:300px;`
    + `background:${ALZATO};border:1px solid rgba(35,40,56,0.10);border-radius:12px;`
    + 'box-shadow:0 4px 20px rgba(30,35,60,0.08);overflow:hidden;display:flex;flex-direction:column;'
    + 'opacity:0;transition:opacity 600ms ease;';
  pannello.innerHTML = `<div style="padding:12px 16px;background:${VEIL_266};border-bottom:1px solid rgba(35,40,56,0.08);">`
    + `<div style="font-size:10px;letter-spacing:0.1em;color:${INCHIOSTRO_MUTO};">MODELLO</div>`
    + `<div style="font-size:12.5px;color:${INCHIOSTRO};font-weight:600;">le zone, man mano che le leggo</div>`
    + `<div id="va-conta" style="font-size:10.5px;color:${INCHIOSTRO_MUTO};margin-top:3px;"></div></div>`
    + '<div id="va-lista" style="flex:1;overflow-y:auto;padding:4px 0;"></div>';
  velo.appendChild(pannello);
  requestAnimationFrame(() => { pannello.style.opacity = '1'; });

  const strati = document.createElement('div');
  strati.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
  velo.appendChild(strati);

  return {
    velo, tela, strati, pannello,
    lista: pannello.querySelector('#va-lista'),
    conta: pannello.querySelector('#va-conta'),
    riga1: testata.querySelector('#va-riga1'),
    riga2: testata.querySelector('#va-riga2'),
  };
}

// La scheda di una zona: si apre (altezza e opacita') quando la zona si
// accende, e cresce dal basso — l'ultima cosa letta resta visibile senza
// dover scorrere, come un referto che si scrive da solo.
function apriScheda(S, z) {
  const c = document.createElement('div');
  c.style.cssText = 'padding:9px 16px;border-bottom:1px solid rgba(35,40,56,0.06);'
    + 'max-height:0;opacity:0;overflow:hidden;transition:max-height 500ms ease, opacity 450ms ease;';
  c.innerHTML = `<div style="display:flex;align-items:center;gap:8px;">`
    + `<span data-va="punto" style="flex:none;width:8px;height:8px;border-radius:50%;background:${MISURATA_CSS};transition:background 400ms ease;"></span>`
    + `<div data-va="titolo" style="font-size:12px;color:${INCHIOSTRO};font-weight:600;"></div></div>`
    + `<div data-va="misure" style="font-size:10.5px;color:${INCHIOSTRO_MUTO};margin:3px 0 0 16px;"></div>`
    + `<div data-va="stato" style="font-size:10.5px;color:${INCHIOSTRO_MUTO};margin:2px 0 0 16px;"></div>`;
  S.lista.appendChild(c);
  z.scheda = c;
  scriviScheda(z);
  requestAnimationFrame(() => { c.style.maxHeight = '90px'; c.style.opacity = '1'; });
  S.lista.scrollTop = S.lista.scrollHeight;
}

function scriviScheda(z) {
  if (!z.scheda) return;
  const q = (k) => z.scheda.querySelector('[data-va="' + k + '"]');
  q('titolo').textContent = z.label;
  q('misure').textContent = misureDi(z.nodo) || '';
  q('punto').style.background = z.confermata ? ACCENTO_266 : MISURATA_CSS;
  const stato = q('stato');
  stato.textContent = z.confermata
    ? 'confermata dall\'occhio' + (z.tipo ? ' · ' + z.tipo : '')
    : 'misurata — in attesa dell\'occhio';
  stato.style.color = z.confermata ? ACCENTO_266 : INCHIOSTRO_MUTO;
}

// ---------------------------------------------------------------------------
// LA SCENA FANTASMA
// ---------------------------------------------------------------------------

// Una replica fantasma del modello vero: STESSA geometria (per riferimento),
// stessa posizione nel mondo (matrixWorld copiata), materia neutra tutta
// nostra. Non e' un secondo modello: e' lo stesso, vestito d'argilla — grigia
// chiara, come la vista 3D di veritas_carta.js, non scura.
function replicaFantasma(THREE, radice, scena) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xaab0bd, roughness: 0.88, metalness: 0.04,
  });
  let n = 0;
  radice.updateMatrixWorld(true);
  radice.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const m = new THREE.Mesh(o.geometry, mat);
    m.matrix.copy(o.matrixWorld);
    m.matrixAutoUpdate = false;
    scena.add(m);
    n++;
  });
  log('replica fantasma: ' + n + ' mesh, stessa geometria del modello vero');
  return mat;
}

function inquadraTutto(THREE, radice, cam) {
  const box = new THREE.Box3().setFromObject(radice);
  const size = new THREE.Vector3(); box.getSize(size);
  const centro = new THREE.Vector3(); box.getCenter(centro);
  const raggio = Math.max(size.x, size.y, size.z, 1) * 0.72;
  cam.position.set(centro.x + raggio * 0.9, centro.y + raggio * 0.62, centro.z + raggio * 0.9);
  cam.lookAt(centro);
  cam.near = raggio * 0.01; cam.far = raggio * 12;
  cam.updateProjectionMatrix();
  return { box, centro, raggio };
}

// Il reticolo a terra — la stessa idea di veritas_carta.js ("vista 3D grigia
// col reticolo"), qui solo sul pavimento.
function reticoloPavimento(THREE, scena, box) {
  const size = new THREE.Vector3(); box.getSize(size);
  const passo = Math.max(2, Math.round(Math.max(size.x, size.z) / 40));
  const divisioni = Math.max(4, Math.round(Math.max(size.x, size.z) / passo));
  const lato = Math.max(size.x, size.z) * 1.15;
  const griglia = new THREE.GridHelper(lato, divisioni, 0xc3c8d4, 0xd7dae2);
  griglia.position.set(box.min.x + size.x / 2, box.min.y - 0.02, box.min.z + size.z / 2);
  scena.add(griglia);
}

// L'IMPRONTA DI UNA ZONA, a terra. Con la forma misurata (lungo x largo x
// verso, scritti dove si contano le celle di ogni zona) e' il rettangolo vero,
// orientato come il volume della tappa in scena (rotation.y = -formaAngolo).
// Senza forma e' un cerchio della sua area: meglio una forma onesta che una
// inventata. Senza area nemmeno quello: un cerchio piccolo, dichiarato tale.
function creaImpronta(THREE, S, n) {
  const haForma = n.formaLungo > 0 && n.formaLargo > 0;
  const geo = haForma
    ? new THREE.PlaneGeometry(n.formaLungo, n.formaLargo)
    : new THREE.CircleGeometry(n.areaM2 > 0 ? Math.sqrt(n.areaM2 / Math.PI) : Math.max(1.5, S.raggioScena * 0.02), 48);
  const campo = new THREE.MeshBasicMaterial({
    color: MISURATA_HEX, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const bordo = new THREE.LineBasicMaterial({ color: MISURATA_HEX, transparent: true, opacity: 0 });
  const piano = new THREE.Mesh(geo, campo);
  piano.rotation.x = -Math.PI / 2;
  const contorno = new THREE.LineSegments(new THREE.EdgesGeometry(geo), bordo);
  contorno.rotation.x = -Math.PI / 2;
  const gruppo = new THREE.Group();
  gruppo.add(piano); gruppo.add(contorno);
  gruppo.position.set(n.pos[0], (n.pos[1] || 0) + 0.06, n.pos[2]);
  if (haForma && typeof n.formaAngolo === 'number') gruppo.rotation.y = -n.formaAngolo;
  S.scena.add(gruppo);

  const et = document.createElement('div');
  et.style.cssText = 'position:absolute;transform:translate(-50%,-140%);padding:3px 9px;border-radius:6px;'
    + `background:${ALZATO};border:1px solid ${MISURATA_CSS};color:${INCHIOSTRO};font-size:11px;`
    + 'white-space:nowrap;opacity:0;transition:opacity 500ms ease, border-color 400ms ease;pointer-events:none;'
    + 'box-shadow:0 2px 6px rgba(30,35,60,0.12);';
  S.strati.appendChild(et);
  return { gruppo, campo, bordo, geo, et };
}

function coloraImpronta(z) {
  const hex = z.confermata ? ACCENTO_266_HEX : MISURATA_HEX;
  z.imp.campo.color.setHex(hex);
  z.imp.bordo.color.setHex(hex);
  z.imp.et.style.borderColor = z.confermata ? ACCENTO_266 : MISURATA_CSS;
  z.imp.et.textContent = z.label;
}

function accendiZona(S, k, n) {
  const z = {
    chiave: k, nodo: n, label: n.label || 'Ambiente', tipo: n.tipo || null,
    confermata: confermataDallOcchio(n), nata: performance.now(), spenta: 0,
  };
  z.imp = creaImpronta(window.THREE, S, n);
  coloraImpronta(z);
  requestAnimationFrame(() => { z.imp.et.style.opacity = '1'; });
  apriScheda(S, z);
  S.accese.set(k, z);
  if (z.confermata) { S.occhioHaParlato = true; S.ultimaNotizia = Date.now(); }
}

function promuovi(S, z, n, tipo) {
  z.nodo = n || z.nodo;
  z.label = (n && n.label) || z.label;
  if (tipo) z.tipo = tipo;
  if (!z.confermata) { z.confermata = true; z.promossa = performance.now(); }
  coloraImpronta(z);
  scriviScheda(z);
  S.occhioHaParlato = true;
  S.ultimaNotizia = Date.now();
}

function spegniZona(S, z) {
  if (z.spenta) return;
  z.spenta = performance.now();
  z.imp.et.style.opacity = '0';
  if (z.scheda) { z.scheda.style.maxHeight = '0'; z.scheda.style.opacity = '0'; }
  // Si catturano scena e mappa, non S: quando il timer scatta il velo puo'
  // essere gia' chiuso e S nullo (la stessa trappola del velo, 17/09).
  const scena = S.scena, accese = S.accese;
  setTimeout(() => {
    try { scena.remove(z.imp.gruppo); z.imp.geo.dispose(); z.imp.campo.dispose(); z.imp.bordo.dispose(); } catch (e) {}
    try { z.imp.et.remove(); } catch (e) {}
    try { if (z.scheda) z.scheda.remove(); } catch (e) {}
    if (accese.get(z.chiave) === z) accese.delete(z.chiave);
  }, 700);
}

// Ogni fotogramma: le impronte salgono di opacita' quando nascono, pulsano
// piano quando l'occhio le conferma, e l'etichetta segue il suo punto.
function aggiornaZone(S) {
  const now = performance.now();
  const v3 = new (window.THREE).Vector3();
  for (const z of S.accese.values()) {
    const eta = z.spenta ? Math.max(0, 1 - (now - z.spenta) / 600) : Math.min(1, (now - z.nata) / 700);
    const pulsa = z.confermata ? 0.08 * Math.sin(now * 0.003) : 0;
    z.imp.campo.opacity = eta * ((z.confermata ? 0.30 : 0.22) + pulsa);
    z.imp.bordo.opacity = eta * (z.confermata ? 1 : 0.95);
    z.imp.gruppo.scale.setScalar(0.9 + 0.1 * eta);
    v3.copy(z.imp.gruppo.position).project(S.cam);
    if (v3.z > 1) { z.imp.et.style.display = 'none'; continue; }
    z.imp.et.style.display = 'block';
    z.imp.et.style.left = ((v3.x * 0.5 + 0.5) * S.larghezza) + 'px';
    z.imp.et.style.top = ((-v3.y * 0.5 + 0.5) * S.altezza) + 'px';
  }
}

// ---------------------------------------------------------------------------
// IL BATTITO: legge lo stato vero, accende, promuove, decide quando chiudere
// ---------------------------------------------------------------------------

function nodiDiAdesso() {
  if (typeof window.__veritasGetNodes !== 'function') return [];
  try { return window.__veritasGetNodes() || []; } catch (e) { return []; }
}

function battito() {
  if (!S || !S.aperto) return;
  // Le zone: SOLO quelle misurate dal motore, con sopra il nome dell'occhio
  // dove l'occhio ha parlato. Mai le tappe (vedi zoneMisurate).
  const nodi = conLOcchio(zoneMisurate(window.__veritasPercezione), nodiDiAdesso(), S.tipiOcchio);
  const vive = new Map([...S.accese].filter(([, z]) => !z.spenta));
  const { adesso, nuove, promosse, spente, rinominate } = confronta(vive, nodi);
  const ora = performance.now();

  for (const [k, z] of vive) if (adesso.has(k)) z.mancaDa = 0;
  // Un elenco vuoto e' una rianalisi a meta', non un modello senza zone.
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
    coloraImpronta(z); scriviScheda(z);
  }
  // In coda nell'ordine in cui arrivano, una alla volta.
  for (const k of nuove) if (!S.coda.includes(k)) S.coda.push(k);
  S.coda = S.coda.filter((k) => adesso.has(k) && !vive.has(k));
  // Se il battito e' arrivato in ritardo (la pagina era occupata dall'analisi:
  // misurato il 17/09, fino a 45 s di scheda ferma), si recupera: fino a tre
  // zone per battito, mai tutte insieme.
  const dovute = S.ultimaAccensione ? Math.floor((ora - S.ultimaAccensione) / PASSO_ACCENSIONE) : 1;
  for (let i = 0; i < Math.min(3, dovute) && S.coda.length; i++) {
    const k = S.coda.shift();
    const vecchia = S.accese.get(k);           // una zona che si stava spegnendo con la stessa chiave
    if (vecchia && vecchia.spenta) S.accese.delete(k);
    accendiZona(S, k, adesso.get(k));
    S.ultimaAccensione = ora;
    if (!S.primaZonaDetta) { S.primaZonaDetta = true; log('prima zona accesa dopo ' + Math.round((Date.now() - S.nascita) / 1000) + ' s'); }
  }

  // L'occhio ha parlato anche quando ha FINITO il suo giro senza rinominare
  // niente: il circuito consegna comunque il suo esito (riuscito o no).
  const esito = window.__veritasComprensione;
  if (esito && esito !== S.esitoAllaNascita && !window.__veritasGiroInCorso && !S.esitoLetto) {
    S.esitoLetto = true;
    S.occhioHaParlato = true;
    S.ultimaNotizia = Date.now();
    S.esitoOcchio = esito;
    log('l\'occhio ha consegnato il suo giro' + (esito.ok === false ? ' senza riuscire: ' + (esito.perche || 'motivo non detto') : ''));
  }

  if (window.__veritasGiroInCorso === true || S.viste) S.giroVisto = true;
  const occhioAssente = !S.giroVisto && !S.occhioHaParlato && Date.now() - S.nascita >= ATTESA_AVVIO_OCCHIO;
  if (occhioAssente && !S.assenzaDetta) {
    S.assenzaDetta = true;
    log('il giro dell\'occhio non e\' partito in ' + Math.round(ATTESA_AVVIO_OCCHIO / 1000) + ' s: non lo si aspetta');
  }
  S.occhioAssente = occhioAssente;

  scriviTestata(S);
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

function scriviTestata(S) {
  const vive = [...S.accese.values()].filter((z) => !z.spenta);
  const conf = vive.filter((z) => z.confermata).length;
  const tot = vive.length + S.coda.length;
  S.conta.textContent = vive.length + (vive.length === 1 ? ' zona accesa' : ' zone accese')
    + ' · ' + conf + (conf === 1 ? ' confermata' : ' confermate') + ' dall\'occhio';
  if (conf) S.riga1.textContent = conf + ' su ' + tot + (tot === 1 ? ' zona confermata' : ' zone confermate') + ' dall\'occhio';
  else if (tot) S.riga1.textContent = 'leggo lo spazio — ' + tot + (tot === 1 ? ' zona misurata' : ' zone misurate');
  else S.riga1.textContent = 'sto guardando lo spazio...';

  let r2;
  if (S.esitoOcchio && S.esitoOcchio.ok === false) r2 = 'l\'occhio non ha potuto guardare: ' + (S.esitoOcchio.perche || 'motivo non detto');
  else if (S.occhioAssente) r2 = 'l\'occhio non ha cominciato a guardare: le zone restano misurate';
  else if (S.occhioHaParlato) r2 = 'l\'occhio ha parlato' + (S.viste ? ' — ' + S.viste + (S.viste === 1 ? ' vista esaminata' : ' viste esaminate') : '');
  else r2 = 'l\'occhio sta guardando' + (S.viste ? ' — ' + S.viste + (S.viste === 1 ? ' vista esaminata' : ' viste esaminate') : '...')
    + ' · puoi entrare quando vuoi';
  S.riga2.textContent = r2;
}

// I ganci veri: ogni vista esaminata (conteggio onesto, niente stime), e ogni
// volta che il circuito occhio-cervello assegna dei nomi — la STESSA chiamata
// che gia' scrive sulle tappe vere (__veritasApplicaOcchi), non una finzione a
// parte. Si aggancia in coda a chi c'e' gia' (veritas_catena.js lo fa allo
// stesso modo): mai sostituire, sempre incatenare.
function agganciaEventiVeri(S) {
  S.viste = 0;
  S.suVista = () => { if (S) S.viste++; };
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
            // Questa chiamata e' l'occhio che parla — ma si ricontrolla lo
            // stesso: se nel frattempo qualcos'altro ha riscritto il nodo con
            // un ripiego, non si promuove un ripiego. La promozione vera la
            // fa il battito, posando il nodo sulla zona misurata che lo
            // contiene; qui si ricorda solo che cosa l'occhio ha detto.
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
  // Il ponte su __veritasApplicaOcchi NON si ripristina: e' incatenato, come
  // veritas_catena.js fa con lo stesso identico ponte. Staccarlo rischierebbe
  // di tagliar via anche chi si e' agganciato sopra di noi nel frattempo — la
  // guardia S.aperto (sopra) lo rende gia' innocuo a velo chiuso.
}

function giro(t) {
  if (!S || !S.aperto) return;
  aggiornaZone(S);
  S.ren.render(S.scena, S.cam);
  S.raf = requestAnimationFrame(giro);
}

function chiudi(perche) {
  if (!S || !S.aperto) return;
  S.aperto = false;
  cancelAnimationFrame(S.raf);
  sgancia(S);
  const velo = S.velo;
  velo.style.opacity = '0';
  // ⚠️ Il timeout cattura `velo` (la variabile locale), non `S.velo`: S viene
  // azzerato due righe sotto, e un riferimento a S.velo qui dentro troverebbe
  // S nullo quando il timer scatta — il velo restava invisibile ma vivo,
  // fisso su tutto lo schermo, a bloccare ogni clic (trovato il 17/09).
  setTimeout(() => { try { velo.remove(); } catch (e) {} }, 900);
  const vive = [...S.accese.values()].filter((z) => !z.spenta);
  const conf = vive.filter((z) => z.confermata).length;
  log('chiusa dopo ' + Math.round((Date.now() - S.nascita) / 1000) + ' s (' + (perche || 'chiamata a mano') + ') — '
    + vive.length + (vive.length === 1 ? ' zona accesa, ' : ' zone accese, ') + conf
    + (conf === 1 ? ' confermata' : ' confermate') + ' dall\'occhio; l\'analisi vera continua sotto, invariata');
  S = null;
}

function costruisciEApri() {
  const THREE = window.THREE;
  const radice = window.__veritasModelRoot;
  if (!THREE || !radice) return;
  if (window.__veritasAperturaAuto === false) return;
  if (S && S.aperto) return;

  const { velo, tela, strati, pannello, lista, conta, riga1, riga2 } = creaVelo();
  const larghezza = innerWidth, altezza = innerHeight;
  const ren = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: false });
  ren.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  ren.setSize(larghezza, altezza);
  ren.setClearColor(SCENA_GRIGIA, 1);
  ren.outputColorSpace = THREE.SRGBColorSpace;
  ren.toneMapping = THREE.ACESFilmicToneMapping;

  const scena = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(42, larghezza / altezza, 0.1, 1000);
  scena.add(new THREE.HemisphereLight(0xffffff, 0xd8dbe3, 1.25));
  const sole = new THREE.DirectionalLight(0xfff8ee, 1.1);
  sole.position.set(40, 60, 30);
  scena.add(sole);

  const { box, raggio } = inquadraTutto(THREE, radice, cam);
  replicaFantasma(THREE, radice, scena);
  reticoloPavimento(THREE, scena, box);

  S = {
    aperto: true, velo, tela, strati, pannello, lista, conta, riga1, riga2, ren, scena, cam,
    larghezza, altezza, raggioScena: raggio,
    accese: new Map(), coda: [], ultimaAccensione: 0, tipiOcchio: new Map(),
    nascita: Date.now(), durataMinima: window.__veritasAperturaDurata || DURATA_MINIMA,
    occhioHaParlato: false, ultimaNotizia: 0,
    esitoAllaNascita: window.__veritasComprensione || null, esitoLetto: false, esitoOcchio: null,
  };
  agganciaEventiVeri(S);
  scriviTestata(S);
  S.timerBattito = setInterval(() => { try { battito(); } catch (e) { log('battito: ' + ((e && e.message) || e)); } }, BATTITO);
  // Un ridimensionamento della finestra non deve lasciare l'apertura storta.
  S.onResize = () => {
    if (!S || !S.aperto) return;
    S.larghezza = innerWidth; S.altezza = innerHeight;
    S.ren.setSize(S.larghezza, S.altezza);
    S.cam.aspect = S.larghezza / S.altezza; S.cam.updateProjectionMatrix();
  };
  addEventListener('resize', S.onResize);

  log('aperta — le zone misurate si accendono una alla volta; resta aperta finche\' l\'occhio non ha parlato'
    + ' (al massimo ' + Math.round(TETTO_ATTESA / 60000) + ' minuti), o "Entra"');
  S.raf = requestAnimationFrame(giro);
}

// Parte da sola quando un modello nuovo entra — stessa filosofia di
// veritas_montaggio.js ("il riconoscimento non si chiede: avviene"): qui non
// c'e' bottone, l'apertura succede.
let ultimaRadiceVista = null;
function forseParti() {
  const r = window.__veritasModelRoot;
  if (!r || r === ultimaRadiceVista) return;
  ultimaRadiceVista = r;
  costruisciEApri();
}

// Fuori da un browser (le prove in Node) si caricano solo le regole pure.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  addEventListener('veritas:modello', forseParti);
  setInterval(forseParti, 1000); // vedetta, come in veritas_montaggio.js: copre chi carica senza sparare l'evento
  window.__veritasApertura = { apri: costruisciEApri, chiudi, stato: () => (S ? {
    aperta: S.aperto, secondi: Math.round((Date.now() - S.nascita) / 1000),
    accese: [...S.accese.values()].filter((z) => !z.spenta).map((z) => ({ zona: z.label, confermata: z.confermata })),
    inCoda: S.coda.length, occhioHaParlato: S.occhioHaParlato, viste: S.viste,
  } : { aperta: false }) };
  log('pronta — parte da sola al caricamento di un modello, o window.__veritasApertura.apri()');
}

export default { apri: costruisciEApri, chiudi };
