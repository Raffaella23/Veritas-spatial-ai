// veritas_posa.js — DOVE STA CIO' CHE L'OCCHIO HA VISTO.
// =============================================================================
//
// Raffaella, 17/09/2026: *«tu continui a cercare un modello intelligente, io
// voglio creare un'intelligenza artificiale che capisce guardando... immagina
// di avere davanti un Gaussian Splat, che sono solamente immagini»*. E la sera:
// il canale dell'occhio si costruisce SULLE IMMAGINI, per tutti i modelli, e
// deve servire anche a risolvere il riconoscimento delle zone.
//
// QUESTO FILE FA UNA COSA SOLA: prende un riquadro che l'occhio ha disegnato su
// una foto e dice DOVE, nello spazio del modello, sta la cosa riconosciuta.
//
// COME. Ogni foto che l'occhio guarda porta la sua telecamera (`vista.camera`,
// scattata nel momento in cui la foto e' stata fatta). Dentro il riquadro si
// fa passare un piccolo fascio di raggi da quella telecamera, e si guarda dove
// ognuno tocca il modello. I punti toccati SONO la cosa vista: la posizione
// non si stima dal riquadro, si misura sul modello.
//
// ⚠️ PERCHE' NON VIOLA LA REGOLA DEL 26/08. Quella regola dice che da una
//    prospettiva, con il solo riquadro, non si ricava un punto a terra: vero,
//    e resta vero. Qui la posizione non nasce dal riquadro — nasce dal modello
//    stesso, colpito da un raggio che parte dalla stessa telecamera della foto.
//    Il riquadro dice CHE COSA (l'occhio), il raggio dice DOVE (la misura).
//
// ⚠️ VALE PER TUTTI I MODELLI, ed e' la ragione per cui si usano i raggi e non
//    la profondita' disegnata: mesh e IFC rispondono ai raggi di three (con
//    three-mesh-bvh, gia' montato sul modello), e gli splat di Spark rispondono
//    alla stessa identica chiamata (`SplatMesh.raycast`, standard di three).
//    Nessun triangolo richiesto, nessun nome di mesh letto.
//
// ⚠️ IL PRIMO PIANO. Un riquadro contiene la cosa e un po' di sfondo: un raggio
//    ai bordi di una seduta tocca il pavimento dietro, o il muro in fondo. Si
//    tengono i colpi del gruppo piu' vicino che e' abbastanza numeroso — un
//    muro visto di sbieco, invece, e' una fila continua di distanze, senza
//    salti, e resta intero.
//
//   node veritas_posa.test.mjs
// =============================================================================

// I LIMITI, dichiarati (HANDOFF §4, regola 10).
export const RAGGI_PER_LATO = 5;          // 25 raggi per riquadro
export const MARGINE_RIQUADRO = 0.12;     // i raggi stanno dentro, non sul bordo
export const RIQUADRI_PER_VISTA = 24;     // i piu' sicuri, per foto
export const TEMPO_PER_VISTA_MS = 2500;   // oltre, la foto passa e lo si dice
const SALTO_MINIMO_M = 1.0;               // un salto di distanza separa due cose
const SALTO_RELATIVO = 0.2;
const QUOTA_MINIMA_GRUPPO = 0.25;

/**
 * I riquadri in FRAZIONI della foto mandata (0..1), qualunque occhio li abbia
 * disegnati.
 *
 * ⚠️ 17/09/2026 — DIFETTO TROVATO LEGGENDO, ed e' con ogni probabilita' il
 *    motivo di «0 cose viste in pianta» sull'aeroporto. OWLv2 (transformers.js)
 *    restituisce i riquadri in PIXEL della tela che riceve; la tela di una
 *    pianta grande viene rimpicciolita (misurato: 2048x1143 -> 1024x572), e
 *    `scatolaInMondo` leggeva quei pixel come pixel della pianta ORIGINALE:
 *    ogni cosa vista finiva a meta' strada dal suo posto e non stava sopra
 *    nessun mucchio misurato. L'occhio di riserva (il VLM) li divideva gia'
 *    per la tela: adesso lo fanno tutti, in un posto solo.
 */
export function inFrazioni(rilevazioni, larghezza, altezza) {
  if (!Array.isArray(rilevazioni)) return rilevazioni;
  if (!(larghezza > 0) || !(altezza > 0)) return rilevazioni;
  const c = (v, t) => Math.max(0, Math.min(1, Number(v) / t));
  return rilevazioni.map((r) => {
    if (!r || !r.box) return r;
    const b = r.box;
    const m = Math.max(b.xmin, b.ymin, b.xmax, b.ymax);
    if (!(m > 1.001)) return r;   // gia' in frazioni
    return { ...r, box: { xmin: c(b.xmin, larghezza), ymin: c(b.ymin, altezza),
                          xmax: c(b.xmax, larghezza), ymax: c(b.ymax, altezza) } };
  });
}

/** La telecamera di una foto, com'era nell'istante dello scatto. */
export function istantaneaCamera(cam) {
  if (!cam || !cam.projectionMatrix || !cam.matrixWorld) return null;
  return {
    ortografica: !!cam.isOrthographicCamera,
    proiezione: Array.from(cam.projectionMatrix.elements),
    mondo: Array.from(cam.matrixWorld.elements),
    vicino: cam.near, lontano: cam.far,
  };
}

/**
 * I punti da cui passano i raggi, in coordinate normalizzate della telecamera
 * (-1..1). Il riquadro e' in frazioni della foto DIRITTA: riga 0 in alto.
 */
export function puntiNelRiquadro(box, lato = RAGGI_PER_LATO, margine = MARGINE_RIQUADRO) {
  if (!box) return [];
  let { xmin, ymin, xmax, ymax } = box;
  if (![xmin, ymin, xmax, ymax].every(Number.isFinite)) return [];
  if (xmax < xmin) [xmin, xmax] = [xmax, xmin];
  if (ymax < ymin) [ymin, ymax] = [ymax, ymin];
  const w = xmax - xmin, h = ymax - ymin;
  if (w <= 0 || h <= 0) return [];
  const x0 = xmin + w * margine, x1 = xmax - w * margine;
  const y0 = ymin + h * margine, y1 = ymax - h * margine;
  const n = Math.max(1, Math.floor(lato));
  const out = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const fx = n === 1 ? 0.5 : i / (n - 1), fy = n === 1 ? 0.5 : j / (n - 1);
      const u = x0 + (x1 - x0) * fx, v = y0 + (y1 - y0) * fy;
      out.push([u * 2 - 1, 1 - v * 2]);
    }
  }
  return out;
}

/**
 * Il primo piano fra i colpi: si ordinano per distanza, si spezzano dove la
 * distanza salta, e si tiene il gruppo piu' vicino abbastanza numeroso.
 * @param {Array<{punto:number[], distanza:number}>} colpi
 */
export function primoPiano(colpi, opz = {}) {
  const c = (colpi || []).filter((k) => k && Number.isFinite(k.distanza) && Array.isArray(k.punto))
    .sort((a, b) => a.distanza - b.distanza);
  if (c.length <= 2) return c;
  const gruppi = [[c[0]]];
  for (let i = 1; i < c.length; i++) {
    const prec = c[i - 1].distanza;
    if (c[i].distanza - prec > Math.max(SALTO_MINIMO_M, prec * SALTO_RELATIVO)) gruppi.push([]);
    gruppi[gruppi.length - 1].push(c[i]);
  }
  const quota = opz.quotaMinima != null ? opz.quotaMinima : QUOTA_MINIMA_GRUPPO;
  const minimo = Math.max(2, Math.ceil(c.length * quota));
  return gruppi.find((g) => g.length >= minimo)
    || gruppi.reduce((a, b) => (b.length > a.length ? b : a));
}

/** L'ingombro dei punti: la stessa forma di `scatolaInMondo`, con il centro. */
export function impronta(punti) {
  const p = (punti || []).filter((q) => Array.isArray(q) && q.length >= 3 && q.every(Number.isFinite));
  if (!p.length) return null;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity], s = [0, 0, 0];
  for (const q of p) {
    for (let k = 0; k < 3; k++) {
      if (q[k] < min[k]) min[k] = q[k];
      if (q[k] > max[k]) max[k] = q[k];
      s[k] += q[k];
    }
  }
  return { min, max, centro: s.map((v) => v / p.length) };
}

/** Una telecamera di three rifatta dall'istantanea, nel mondo della scena di adesso. */
export function cameraDaIstantanea(THREE, snap, matriceGenitore) {
  const cam = snap.ortografica ? new THREE.OrthographicCamera() : new THREE.PerspectiveCamera();
  cam.matrixAutoUpdate = false;
  cam.matrixWorld.fromArray(snap.mondo);
  // ⚠️ Le foto si scattano col modello staccato dal suo genitore, dentro una
  //    scena tutta loro (veritas_vista: «il modello TORNA dov'era»). I raggi
  //    invece si lanciano sul modello rimesso al suo posto: se il genitore ha
  //    una trasformazione, la telecamera la deve avere anche lei.
  if (matriceGenitore) cam.matrixWorld.premultiply(matriceGenitore);
  cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
  cam.projectionMatrix.fromArray(snap.proiezione);
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  if (Number.isFinite(snap.vicino)) cam.near = snap.vicino;
  if (Number.isFinite(snap.lontano)) cam.far = snap.lontano;
  return cam;
}

/**
 * Posa nel mondo un riquadro dell'occhio.
 * @returns {null | {raggi, colpiti, punti, mondo:{min,max,centro}, centro}}
 */
export function posaRiquadro(THREE, radice, vista, box, opz = {}) {
  if (!THREE || !radice || !vista || !vista.camera || !box) return null;
  const genitore = radice.parent || null;
  if (opz.aggiorna !== false) (genitore || radice).updateMatrixWorld(true);
  const cam = cameraDaIstantanea(THREE, vista.camera, genitore ? genitore.matrixWorld : null);
  const raycaster = new THREE.Raycaster();
  const ndc = puntiNelRiquadro(box, opz.lato || RAGGI_PER_LATO);
  const v2 = new THREE.Vector2();
  const colpi = [];
  for (const [x, y] of ndc) {
    v2.set(x, y);
    raycaster.setFromCamera(v2, cam);
    let hits = [];
    try { hits = raycaster.intersectObject(radice, true); } catch (e) { hits = []; }
    const h = hits.find((q) => q && q.point && (!q.object || q.object.visible !== false));
    if (h) colpi.push({ punto: [h.point.x, h.point.y, h.point.z], distanza: h.distance });
  }
  const scelti = primoPiano(colpi);
  const imp = impronta(scelti.map((k) => k.punto));
  if (!imp) return { raggi: ndc.length, colpiti: 0, punti: [], mondo: null, centro: null };
  return {
    raggi: ndc.length,
    colpiti: colpi.length,
    punti: scelti.map((k) => k.punto),
    mondo: { min: imp.min, max: imp.max, centro: imp.centro },
    centro: imp.centro,
  };
}

/**
 * I punti di una CORNICE attorno al riquadro, fuori dal riquadro: sopra e ai
 * due lati, mai sotto (sotto una porta c'e' il pavimento DAVANTI, piu' vicino
 * del muro, e ingannerebbe la misura).
 */
export function puntiAttorno(box, allarga = 0.2, perLato = 4) {
  if (!box) return [];
  let { xmin, ymin, xmax, ymax } = box;
  if (![xmin, ymin, xmax, ymax].every(Number.isFinite)) return [];
  if (xmax < xmin) [xmin, xmax] = [xmax, xmin];
  if (ymax < ymin) [ymin, ymax] = [ymax, ymin];
  const w = xmax - xmin, h = ymax - ymin;
  if (w <= 0 || h <= 0) return [];
  const cl = (t) => Math.max(0, Math.min(1, t));
  const sx = cl(xmin - w * allarga), dx = cl(xmax + w * allarga), su = cl(ymin - h * allarga);
  const out = [];
  for (let k = 0; k < perLato; k++) {
    const f = perLato === 1 ? 0.5 : k / (perLato - 1);
    const v = ymin + h * (0.15 + 0.7 * f);
    out.push([sx, v], [dx, v]);                       // i due fianchi
    out.push([xmin + w * f, su]);                     // sopra (l'architrave)
  }
  return out.map(([u, v]) => [u * 2 - 1, 1 - v * 2]);
}

/**
 * Posa nel mondo un VARCO (una porta, un tornello): un buco in una parete.
 *
 * ⚠️ Un raggio che passa dal centro di una porta aperta tocca quello che sta
 *    DIETRO — l'altra stanza, il fondo — e posarlo li' metterebbe la porta a
 *    dieci metri dal suo muro. Quindi: si misura la distanza del muro ATTORNO
 *    al buco (fianchi e architrave), e la porta si mette su quel piano, larga
 *    quanto il riquadro a quella distanza.
 * @returns {null | {raggi, colpiti, segmento:[a,b], centro, mondo, distanza}}
 */
export function posaVarco(THREE, radice, vista, box, opz = {}) {
  if (!THREE || !radice || !vista || !vista.camera || !box) return null;
  const genitore = radice.parent || null;
  if (opz.aggiorna !== false) (genitore || radice).updateMatrixWorld(true);
  const cam = cameraDaIstantanea(THREE, vista.camera, genitore ? genitore.matrixWorld : null);
  const raycaster = new THREE.Raycaster();
  const v2 = new THREE.Vector2();
  const lancia = (x, y) => {
    v2.set(x, y);
    raycaster.setFromCamera(v2, cam);
    let hits = [];
    try { hits = raycaster.intersectObject(radice, true); } catch (e) { hits = []; }
    return hits.find((q) => q && q.point && (!q.object || q.object.visible !== false)) || null;
  };
  const cornice = puntiAttorno(box, opz.allarga != null ? opz.allarga : 0.2);
  const colpi = [];
  for (const [x, y] of cornice) {
    const h = lancia(x, y);
    if (h) colpi.push({ punto: [h.point.x, h.point.y, h.point.z], distanza: h.distance });
  }
  const muro = primoPiano(colpi, { quotaMinima: 0.34 });
  if (!muro.length) return { raggi: cornice.length, colpiti: colpi.length, segmento: null, centro: null, mondo: null, distanza: null };
  const d = muro.map((k) => k.distanza).sort((a, b) => a - b)[Math.floor((muro.length - 1) / 2)];
  // I due stipiti: i raggi dei bordi sinistro e destro del riquadro, a meta'
  // altezza, portati alla distanza del muro.
  const ymedio = (box.ymin + box.ymax) / 2;
  const alla = (u) => {
    v2.set(u * 2 - 1, 1 - ymedio * 2);
    raycaster.setFromCamera(v2, cam);
    const p = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(d));
    return [p.x, p.y, p.z];
  };
  const a = alla(Math.min(box.xmin, box.xmax)), b = alla(Math.max(box.xmin, box.xmax));
  const imp = impronta([a, b]);
  return { raggi: cornice.length, colpiti: colpi.length, segmento: [a, b], centro: imp.centro,
           mondo: { min: imp.min, max: imp.max, centro: imp.centro }, distanza: d };
}

export default { inFrazioni, istantaneaCamera, puntiNelRiquadro, puntiAttorno, primoPiano, impronta, cameraDaIstantanea, posaRiquadro, posaVarco };
