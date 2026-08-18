// =============================================================================
// VERITAS — IL CAMMINO. Dove si puo' camminare davvero.
// =============================================================================
//
// PERCHE' ESISTE QUESTO FILE
//
// Fino al 18/08/2026 il programma decideva da solo dove si cammina, con codice
// scritto a mano qui dentro: griglia di occupazione, distanza dai muri, A*,
// tiro della corda, lettura dei muri dalla geometria, dentro/fuori. Tutto
// tarato su un unico modello. Il risultato, misurato: i passeggeri uscivano
// dall'aereo camminando SULL'ALA, perche' l'ala e' una superficie liscia
// rivolta verso l'alto e per quel codice "liscio e rivolto in su" = pavimento.
//
// Questo file NON contiene un algoritmo di navigazione. Contiene la traduzione
// fra il modello caricato e **navcat** (MIT, JavaScript puro), che e' la stessa
// costruzione di navigation mesh — lignaggio Recast/Detour — usata da Unity,
// Unreal e Godot per far camminare la gente negli spazi.
//
//     https://github.com/isaac-mason/navcat   ·   https://navcat.dev/docs/
//
// COSA CAMBIA, ED E' TUTTO
//
// Non si dichiara piu' cos'e' un pavimento. Si dichiarano **le misure di una
// persona** — quanto e' larga, quanto e' alta, che gradino sale, che pendenza
// affronta — e la libreria ricava il resto voxelizzando TUTTA la geometria:
//
//   - l'ala di un aereo e' curva e inclinata      -> cade da sola (pendenza)
//   - i piani dei chioschi, i monitor, le spalle
//     delle persone gia' ferme nel modello       -> isole minuscole, scartate
//   - i muri                                      -> non serve piu' leggerli,
//                                                    li vede come ostacoli
//   - il piazzale a -2 m e il terminal a +0,4 m  -> due piani distinti, uniti
//                                                    solo se una rampa c'e' davvero
//   - un aereo staccato da terra                 -> isola non collegata: non
//                                                    ci arriva nessuno, mai
//
// Sono gli stessi problemi su cui ho perso una giornata, risolti alla radice e
// in una volta sola, da un impianto provato da anni e da migliaia di progetti.
//
// ⚠️ CONFINE NETTO CON `veritas_perception.js`, CHE RESTA
//    navcat CAMMINA. `veritas_perception.js` MISURA — area navigabile,
//    larghezze libere, strettoie, varchi: i numeri del referto, quelli che
//    devono reggere un confronto normativo. La navmesh non li da' nella forma
//    che serve, e la percezione non deve decidere dove si cammina.
//
// ⚠️ NIENTE E' TARATO SU UN MODELLO
//    Le misure della persona vengono da riferimenti pubblicati (vedi PERSONA).
//    La risoluzione si RICAVA dall'ingombro con un tetto di lavoro, cosi' una
//    stanza di 20 m e un terminal di 300 m si costruiscono entrambi, l'una fine
//    e l'altro grossolano, senza toccare niente a mano.
// =============================================================================

// ---------------------------------------------------------------------------
// 1. Le misure di una persona
// ---------------------------------------------------------------------------
//
// Non sono numeri scelti a tavolino: sono misure antropometriche pubblicate.
//
//   raggio 0,30 m   ellisse corporea di Fruin, 61 x 46 cm (Pedestrian Planning
//                   and Design, 1971): e' lo standard dei modelli di deflusso.
//                   Mezza larghezza di spalle = 0,305 m.
//   altezza 2,00 m  altezza libera minima di passaggio; sotto i 2 m si china.
//                   E' anche il valore predefinito dell'agente di Unity.
//   gradino 0,40 m  due alzate a norma (DM 236/89: alzata max 17-18 cm). Serve
//                   a salire le scale del modello senza saltare fra piani.
//   pendenza 35°    una scala comune sta fra 30° e 35°; una rampa accessibile
//                   sta sotto i 5°. Sopra i 35° non e' un percorso: e' una
//                   copertura, un'ala, un terrapieno.
//
export const PERSONA = Object.freeze({
  raggio: 0.30,
  altezza: 2.00,
  gradino: 0.40,
  pendenzaMax: 35,
});

// Un'isola piu' piccola di questa non e' uno spazio in cui si cammina: e' il
// piano di un chiosco, un monitor, la spalla di una figura umana modellata.
// In m². Ricavato in celle dalla libreria, quindi indipendente dalla
// risoluzione scelta.
export const ISOLA_MINIMA_M2 = 4;
export const ISOLA_UNIONE_M2 = 20;

// Tetto di lavoro: quanti voxel si accetta di costruire. E' la manopola che
// rende il modulo indipendente dalle dimensioni del modello — con un tetto,
// la risoluzione si adatta da sola invece di far esplodere i tempi su un
// aeroporto o sprecare precisione su una stanza.
export const VOXEL_MAX = 22e6;

// ---------------------------------------------------------------------------
// 2. Parametri — logica pura, provabile senza librerie
// ---------------------------------------------------------------------------

/**
 * Sceglie la risoluzione: la piu' fine che sta nel tetto di lavoro.
 *
 * Recast raccomanda una cella pari a meta'/un terzo del raggio dell'agente:
 * con raggio 0,30 m il passo ideale e' 0,10-0,15 m. Su un modello grande non
 * ci sta, e allora si allarga — dichiarandolo, mai in silenzio.
 */
export function cellaOttima(ingombro, opz = {}) {
  const budget = opz.voxelMax || VOXEL_MAX;
  const minima = opz.cellaMinima || 0.08;
  const massima = opz.cellaMassima || 0.35;
  const rapportoH = opz.rapportoAltezza || 0.7;   // cellHeight = cella * questo
  const lx = Math.max(0.1, ingombro.max[0] - ingombro.min[0]);
  const ly = Math.max(0.1, ingombro.max[1] - ingombro.min[1]);
  const lz = Math.max(0.1, ingombro.max[2] - ingombro.min[2]);

  // voxel(c) = (lx/c) * (lz/c) * (ly/(c*rapportoH)) = lx*ly*lz / (c^3 * rapportoH)
  // Invertita: la cella piu' piccola che sta nel tetto.
  const cNecessaria = Math.cbrt((lx * ly * lz) / (budget * rapportoH));
  const raggio = opz.raggio || PERSONA.raggio;
  // Non ha senso essere piu' fini di un terzo del raggio: costa e non aggiunge.
  let cella = Math.max(minima, raggio / 3, cNecessaria);

  // ⚠️ `massima` e' una PREFERENZA, non un tetto: se la si impone quando il
  //    budget chiede di piu', il budget non vale piu' niente e la costruzione
  //    esaurisce la memoria. Misurato: un modello di 20 x 14 km bloccato a
  //    cella 0.35 chiedeva 101 milioni di voxel e faceva morire node.
  //    Quando la cella supera la preferenza si allarga e LO SI DICHIARA.
  const oltreLaPreferenza = cella > massima + 1e-9;

  const cellaH = Math.max(0.05, cella * rapportoH);
  const voxel = Math.ceil(lx / cella) * Math.ceil(lz / cella) * Math.ceil(ly / cellaH);
  return {
    cella, cellaH, voxel, oltreLaPreferenza,
    // Sopra mezzo raggio di cella una porta comincia a non essere risolta.
    grossolana: cella > raggio / 2 + 1e-9,
    // Sopra questa soglia il risultato sarebbe ingannevole: porte e passaggi
    // sparirebbero e la navmesh direbbe "non si passa" dove si passa.
    inutilizzabile: cella > (opz.cellaInutile || 0.8),
    ingombroM: [lx, ly, lz],
  };
}

/**
 * Traduce le misure di una persona nei parametri che vuole navcat.
 *
 * ⚠️ MISURATO E DA NON RIFARE: `generateSoloNavMesh` usa i campi in VOXEL
 *    (`walkableRadiusVoxels`, `walkableHeightVoxels`, `walkableClimbVoxels`).
 *    Passando solo i corrispettivi in metri costruisce una navmesh VUOTA senza
 *    dire niente — zero poligoni, nessun errore. Qui si passano entrambi.
 */
export function parametri(ingombro, persona = PERSONA, opz = {}) {
  const p = { ...PERSONA, ...(persona || {}) };
  const r = cellaOttima(ingombro, { ...opz, raggio: p.raggio });
  const cella = r.cella, cellaH = r.cellaH;
  const inCelle = (m) => Math.max(1, Math.round(m / (cella * cella)));

  return {
    misure: p,
    risoluzione: r,
    opzioni: {
      cellSize: cella,
      cellHeight: cellaH,
      walkableRadiusWorld: p.raggio,
      walkableRadiusVoxels: Math.ceil(p.raggio / cella),
      walkableHeightWorld: p.altezza,
      walkableHeightVoxels: Math.ceil(p.altezza / cellaH),
      walkableClimbWorld: p.gradino,
      walkableClimbVoxels: Math.max(1, Math.floor(p.gradino / cellaH)),
      walkableSlopeAngleDegrees: p.pendenzaMax,
      minRegionArea: inCelle(opz.isolaMinimaM2 != null ? opz.isolaMinimaM2 : ISOLA_MINIMA_M2),
      mergeRegionArea: inCelle(opz.isolaUnioneM2 != null ? opz.isolaUnioneM2 : ISOLA_UNIONE_M2),
      maxSimplificationError: 1.3,
      maxEdgeLength: 12,
      maxVerticesPerPoly: 5,
      detailSampleDistance: cella * 6,
      detailSampleMaxError: cellaH,
      borderSize: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// 3. La geometria: dal modello caricato ai triangoli
// ---------------------------------------------------------------------------

/**
 * Raccoglie TUTTI i triangoli del modello in coordinate del mondo.
 *
 * Tutti, non solo quelli rivolti verso l'alto: sono i muri, i banconi e le
 * ringhiere a rendere impossibile un percorso, e la libreria ha bisogno di
 * vederli. E' la differenza con `extractNavigablePoints`, che invece cerca
 * apposta il solo pavimento perche' serve alle MISURE.
 *
 * @param THREE   il three del modello (iniettato, come in veritas_vista.js)
 * @param radice  THREE.Object3D del modello caricato
 */
export function geometriaDaModello(THREE, radice, opz = {}) {
  if (!THREE || !radice) return null;
  radice.updateMatrixWorld(true);

  const pos = [];
  const idx = [];
  let mesh = 0, saltate = 0;
  const tettoTriangoli = opz.tettoTriangoli || 1.2e6;
  const tettoIstanze = opz.tettoIstanze || 4096;
  const M = new THREE.Matrix4();
  const v = new THREE.Vector3();

  function aggiungi(geom, matrice) {
    const attr = geom && geom.attributes && geom.attributes.position;
    if (!attr) { saltate++; return; }
    const base = pos.length / 3;
    for (let i = 0; i < attr.count; i++) {
      v.set(attr.getX(i), attr.getY(i), attr.getZ(i)).applyMatrix4(matrice);
      pos.push(v.x, v.y, v.z);
    }
    const ind = geom.index;
    if (ind) {
      for (let i = 0; i + 2 < ind.count; i += 3)
        idx.push(base + ind.getX(i), base + ind.getX(i + 1), base + ind.getX(i + 2));
    } else {
      for (let i = 0; i + 2 < attr.count; i += 3) idx.push(base + i, base + i + 1, base + i + 2);
    }
    mesh++;
  }

  radice.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    if (o.visible === false) return;
    // Roba nostra: marker delle zone, agenti, aiuti visivi. Non e' architettura.
    if (o.userData && (o.userData.__veritasHelper || o.userData.__veritasAgent)) return;
    if (idx.length / 3 > tettoTriangoli) { saltate++; return; }

    if (o.isInstancedMesh && o.count > 0) {
      const n = Math.min(o.count, tettoIstanze);
      for (let i = 0; i < n; i++) {
        o.getMatrixAt(i, M);
        M.premultiply(o.matrixWorld);
        aggiungi(o.geometry, M);
      }
      if (o.count > n) saltate += o.count - n;
      return;
    }
    aggiungi(o.geometry, o.matrixWorld);
  });

  if (!idx.length) return null;

  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i += 3)
    for (let k = 0; k < 3; k++) {
      if (pos[i + k] < min[k]) min[k] = pos[i + k];
      if (pos[i + k] > max[k]) max[k] = pos[i + k];
    }

  return {
    positions: new Float32Array(pos),
    indices: new Uint32Array(idx),
    triangoli: idx.length / 3,
    mesh, saltate,
    ingombro: { min, max },
  };
}

// ---------------------------------------------------------------------------
// 4. Costruzione
// ---------------------------------------------------------------------------

/**
 * Costruisce la navmesh.
 *
 * @param blocks     il modulo 'navcat/blocks' (iniettato: cosi' si prova con stub)
 * @param geometria  uscita di geometriaDaModello
 */
export function costruisci(blocks, geometria, opz = {}) {
  if (!blocks || !geometria || !geometria.indices || !geometria.indices.length) return null;
  const par = parametri(geometria.ingombro, opz.persona, opz);

  // Ci si ferma PRIMA di costruire quando non ha senso. Una costruzione
  // avviata comunque o esaurisce la memoria, o restituisce una navmesh che
  // dichiara chiusi passaggi aperti: un risultato peggiore di nessun risultato.
  if (par.risoluzione.inutilizzabile) {
    return { navMesh: null, ms: 0, parametri: par, poligoni: 0, area: 0, quote: [],
             diagnosi: diagnosiVuota(geometria, par) };
  }

  const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const res = blocks.generateSoloNavMesh(
    { positions: geometria.positions, indices: geometria.indices }, par.opzioni);
  const ms = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
  const navMesh = res && (res.navMesh || res);
  if (!navMesh || !navMesh.tiles) return null;

  const m = misura(navMesh);
  return {
    navMesh, ms: Math.round(ms), parametri: par,
    poligoni: m.poligoni, area: m.area, quote: m.quote,
    // Perche' zero poligoni, quando succede. Un modello in centimetri o in
    // pollici da' un ingombro assurdo e nessuna superficie camminabile: e'
    // bene dirlo invece di restituire il vuoto.
    diagnosi: m.poligoni ? null : diagnosiVuota(geometria, par),
  };
}

function diagnosiVuota(geometria, par) {
  const [lx, ly, lz] = par.risoluzione.ingombroM;
  const diag = Math.hypot(lx, lz);
  if (diag < 3) return 'il modello misura ' + diag.toFixed(1) + ' m in diagonale: troppo '
    + "piccolo perche' ci cammini una persona. Probabile scala sbagliata.";
  if (par.risoluzione.inutilizzabile) return 'il modello misura ' + Math.round(diag)
    + ' m in diagonale: per costruirlo servirebbero celle da '
    + par.risoluzione.cella.toFixed(2) + ' m, in cui una porta non esiste. '
    + (diag > 3000 ? 'Probabile scala sbagliata (centimetri o millimetri letti come metri).'
                   : 'Serve una navmesh a tasselli, oppure alza voxelMax.');
  if (par.risoluzione.grossolana) return 'nessuna superficie camminabile alla risoluzione di '
    + par.risoluzione.cella.toFixed(2) + " m. Il modello e' molto grande: "
    + 'alza voxelMax oppure semplificalo.';
  return 'nessuna superficie soddisfa le misure di una persona '
    + '(altezza libera ' + par.misure.altezza + ' m, pendenza max ' + par.misure.pendenzaMax + '°).';
}

// ---------------------------------------------------------------------------
// 5. Leggere la navmesh: aree, quote, isole
// ---------------------------------------------------------------------------

const EXT_LINK = 0x8000;   // navcat: POLY_NEIS_FLAG_EXT_LINK

function* poligoni(navMesh) {
  for (const chiave in navMesh.tiles) {
    const tile = navMesh.tiles[chiave];
    if (!tile || !tile.polys) continue;
    for (let i = 0; i < tile.polys.length; i++) yield { tile, i, poly: tile.polys[i] };
  }
}

/** Area in pianta di un poligono, in m². */
export function areaPoligono(tile, poly) {
  const v = poly.vertices;
  let a = 0;
  for (let k = 1; k + 1 < v.length; k++) {
    const A = v[0] * 3, B = v[k] * 3, C = v[k + 1] * 3;
    a += Math.abs((tile.vertices[B] - tile.vertices[A]) * (tile.vertices[C + 2] - tile.vertices[A + 2])
                - (tile.vertices[C] - tile.vertices[A]) * (tile.vertices[B + 2] - tile.vertices[A + 2])) / 2;
  }
  return a;
}

/** Quota media di un poligono. */
export function quotaPoligono(tile, poly) {
  let y = 0;
  for (const vi of poly.vertices) y += tile.vertices[vi * 3 + 1];
  return y / poly.vertices.length;
}

/** Quanti poligoni, quanta area, a che quote. */
export function misura(navMesh) {
  let n = 0, area = 0;
  const perQuota = new Map();
  for (const { tile, poly } of poligoni(navMesh)) {
    n++;
    const a = areaPoligono(tile, poly);
    area += a;
    const b = Math.round(quotaPoligono(tile, poly) / 0.5) * 0.5;
    perQuota.set(b, (perQuota.get(b) || 0) + a);
  }
  const quote = [...perQuota.entries()].sort((x, y) => y[1] - x[1])
    .map(([q, a]) => ({ quota: q, area: a }));
  return { poligoni: n, area, quote };
}

/**
 * Le ISOLE: gruppi di superficie collegati fra loro a piedi.
 *
 * E' la misura che risponde alla domanda del video — *l'aereo e' raggiungibile
 * da terra?* Se e' un'isola a se', no, e non serve nessuna soglia per dirlo:
 * lo dice la connettivita' della mesh. Ordinate dalla piu' estesa.
 */
export function isole(navMesh) {
  const gruppi = [];
  for (const chiave in navMesh.tiles) {
    const tile = navMesh.tiles[chiave];
    if (!tile || !tile.polys) continue;
    const visto = new Uint8Array(tile.polys.length);
    for (let s = 0; s < tile.polys.length; s++) {
      if (visto[s]) continue;
      const coda = [s];
      visto[s] = 1;
      let area = 0, y = 0, n = 0;
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      while (coda.length) {
        const i = coda.pop();
        const poly = tile.polys[i];
        area += areaPoligono(tile, poly);
        y += quotaPoligono(tile, poly);
        n++;
        for (const vi of poly.vertices)
          for (let k = 0; k < 3; k++) {
            const c = tile.vertices[vi * 3 + k];
            if (c < min[k]) min[k] = c;
            if (c > max[k]) max[k] = c;
          }
        for (const nei of poly.neis || []) {
          if (!nei || (nei & EXT_LINK)) continue;   // bordo, o salto fra tasselli
          const j = nei - 1;
          if (j >= 0 && j < tile.polys.length && !visto[j]) { visto[j] = 1; coda.push(j); }
        }
      }
      gruppi.push({ poligoni: n, area, quotaMedia: y / n, ingombro: { min, max }, tile: chiave });
    }
  }
  return gruppi.sort((a, b) => b.area - a.area);
}

// ---------------------------------------------------------------------------
// 6. Camminare
// ---------------------------------------------------------------------------

/** Tolleranza di aggancio: quanto lontano si cerca il pavimento sotto un punto. */
const TOLLERANZA = [2, 4, 2];

/**
 * Il punto sta sul cammino? Se si', dove esattamente.
 * Sostituisce ogni "questa cella e' calpestabile?" scritto a mano.
 */
export function sulCammino(nav, navMesh, punto, tolleranza) {
  if (!nav || !navMesh || !punto) return { ok: false };
  const r = nav.createFindNearestPolyResult();
  nav.findNearestPoly(r, navMesh, punto, tolleranza || TOLLERANZA, nav.DEFAULT_QUERY_FILTER);
  if (!r.success || !r.nodeRef) return { ok: false };
  return {
    ok: true,
    ref: r.nodeRef,
    punto: [r.position[0], r.position[1], r.position[2]],
    dislivello: Math.abs(r.position[1] - punto[1]),
  };
}

/**
 * Il percorso da un punto all'altro, gia' pulito.
 *
 * Restituisce `null` quando non esiste — e non esiste sul serio, non "non l'ho
 * trovato": la navmesh sa se due punti sono collegati. Chi chiama deve sapere
 * che non c'e', invece di ricevere una linea dritta dentro un muro.
 *
 * `parziale: true` significa che si arriva il piu' vicino possibile ma non
 * fino in fondo (destinazione su un'altra isola).
 */
export function percorso(nav, navMesh, da, a, opz = {}) {
  if (!nav || !navMesh) return null;
  const tol = opz.tolleranza || TOLLERANZA;

  // Due modi, e servono a due cose diverse.
  //
  //   normale (findPath)     solo i vertici di svolta. E' il percorso piu'
  //                          corto, ed e' quello che serve per MISURARE una
  //                          lunghezza o una via di esodo.
  //   aderente (findSmoothPath)  segue la superficie passo passo. Serve a far
  //                          CAMMINARE un agente: fra due svolte ai due capi di
  //                          una rampa il percorso corto non dice niente delle
  //                          quote in mezzo, e la figura salirebbe di scatto.
  const r = opz.aderente
    ? nav.findSmoothPath(navMesh, da, a, tol, nav.DEFAULT_QUERY_FILTER, {
        stepSize: opz.passo || 0.5,
        slop: (opz.passo || 0.5) * 0.4,
        maxPoints: opz.maxPunti || 2048,
      })
    : nav.findPath(navMesh, da, a, tol, nav.DEFAULT_QUERY_FILTER);
  if (!r || !r.success || !r.path || !r.path.length) return null;
  const punti = r.path.map((p) => (p && p.position ? [p.position[0], p.position[1], p.position[2]]
                                                  : [p[0], p[1], p[2]]));
  let lung = 0;
  for (let k = 1; k < punti.length; k++)
    lung += Math.hypot(punti[k][0] - punti[k - 1][0], punti[k][2] - punti[k - 1][2]);
  // navcat: FindPathResultFlags.PARTIAL_PATH = 4. (SUCCESS = 1: leggere quello
  // significherebbe dichiarare parziale OGNI percorso riuscito. Gia' sbagliato
  // una volta nel banco di prova del cancello.)
  return { punti, lunghezza: lung, parziale: !!(r.flags & 4) };
}

export default {
  PERSONA, ISOLA_MINIMA_M2, ISOLA_UNIONE_M2, VOXEL_MAX,
  cellaOttima, parametri, geometriaDaModello, costruisci,
  areaPoligono, quotaPoligono, misura, isole, sulCammino, percorso,
};
