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
// Misurato su un terminal di 145 x 76 x 15 m: con 22 milioni la cella veniva
// 22 cm, e una porta da 90 cm sono quattro celle — dopo l'erosione del raggio
// di una persona puo' chiudersi. Una porta che risulta chiusa dove e' aperta e'
// esattamente il difetto silenzioso che questo lavoro serve a togliere.
// Con 70 milioni la cella scende a ~15 cm (meta' del raggio, che e' la
// raccomandazione di Recast) e la costruzione costa ~1,5 s una volta sola.
export const VOXEL_MAX = 70e6;

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
  // Non si scende sotto META' DEL RAGGIO: e' la risoluzione raccomandata da
  // Recast, e sotto quella si paga soltanto. Misurato: col fondo a un terzo
  // del raggio un edificio di 120 x 80 m si costruiva a celle da 10 cm in
  // 3,1 s invece che a 15 cm in meno di un secondo, senza vedere una porta
  // in piu'.
  let cella = Math.max(minima, raggio / 2, cNecessaria);

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
    grossolana: cella > raggio / 2 * 1.02,
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

// ---------------------------------------------------------------------------
// 7. L'aggancio al programma
// ---------------------------------------------------------------------------
//
// navcat pesa 640 KB non minificato: si carica dall'importmap, NON si inlina.
// `index.html` deve restare snello e scattante (§8.8).
//
// Il caricamento e' DINAMICO e dentro un try: se la libreria non arriva — CDN
// irraggiungibile, rete di un cliente che blocca jsdelivr — il programma torna
// al comportamento di prima invece di rompersi, e lo dice in console.

let LIB = null;
let ULTIMA = null;        // l'ultima navmesh costruita

export async function libreria() {
  if (LIB) return LIB;
  const [nav, blocks] = await Promise.all([import('navcat'), import('navcat/blocks')]);
  LIB = { nav, blocks };
  return LIB;
}

/** Costruisce la navmesh del modello caricato e la tiene da parte. */
export async function costruisciDaScena(THREE, radice, opz = {}) {
  const geo = geometriaDaModello(THREE, radice, opz);
  if (!geo) { ULTIMA = null; return { ok: false, perche: 'nessuna geometria nel modello' }; }
  let lib;
  try { lib = await libreria(); }
  catch (e) {
    ULTIMA = null;
    return { ok: false, perche: 'navcat non si e caricata (' + ((e && e.message) || e) + ')' };
  }
  const r = costruisci(lib.blocks, geo, opz);
  if (!r || !r.poligoni) {
    ULTIMA = null;
    return { ok: false, perche: (r && r.diagnosi) || 'nessuna superficie camminabile', esito: r };
  }
  ULTIMA = r;
  r.geometria = { triangoli: geo.triangoli, mesh: geo.mesh, ingombro: geo.ingombro };
  r.isole = isole(r.navMesh);
  return { ok: true, ...r };
}

/** La navmesh corrente, o `null` se non c'e'. */
export function stato() { return ULTIMA; }

/**
 * Il percorso sulla navmesh corrente. `null` se non si puo' rispondere —
 * e chi chiama DEVE distinguere "non c'e' strada" da "non lo so".
 */
export function percorsoCorrente(da, a, opz = {}) {
  if (!ULTIMA || !LIB) return null;
  return percorso(LIB.nav, ULTIMA.navMesh, da, a, opz);
}

/** Il punto sta su una superficie calpestabile? */
export function sulCamminoCorrente(punto, tolleranza) {
  if (!ULTIMA || !LIB) return { ok: false };
  return sulCammino(LIB.nav, ULTIMA.navMesh, punto, tolleranza);
}

/**
 * Divide dei punti in gruppi che si raggiungono a piedi FRA LORO.
 *
 * ⚠️ E' la risposta a un difetto misurato il 18/08 sul modello di prova: la
 *    navmesh vedeva 6 aree camminabili grandi e NON collegate (piazzale a
 *    -2 m, piano del terminal a +0,5, un livello a +3,8...), mentre le tappe
 *    venivano scelte fra tutte indistintamente. Risultato: si chiedeva un
 *    percorso fra due posti che a piedi non si raggiungono, non lo si trovava,
 *    e il codice di riserva tirava una linea retta — dentro i muri.
 *
 *    Verificato che non fosse disordine: togliendo 2.197 fra arredi, banchi e
 *    figure umane gia' modellate, le aree grandi restavano SEI. Sono
 *    separazioni vere dell'edificio, e vanno dette invece che scavalcate.
 *
 * Si risponde con i percorsi veri, non con le distanze: due sale confinanti
 * separate da un muro sono vicine e irraggiungibili.
 */
export function gruppiCollegati(punti, opz = {}) {
  if (!ULTIMA || !LIB || !punti || !punti.length) return null;
  const gruppo = new Array(punti.length).fill(-1);
  let n = 0;
  for (let i = 0; i < punti.length; i++) {
    if (gruppo[i] >= 0) continue;
    gruppo[i] = n;
    for (let k = i + 1; k < punti.length; k++) {
      if (gruppo[k] >= 0) continue;
      const r = percorso(LIB.nav, ULTIMA.navMesh, punti[i], punti[k], opz);
      if (r && !r.parziale) gruppo[k] = n;
    }
    n++;
  }
  const gruppi = [];
  for (let g = 0; g < n; g++) gruppi.push(punti.map((_, i) => i).filter((i) => gruppo[i] === g));
  gruppi.sort((a, b) => b.length - a.length);
  return { gruppo, gruppi, quanti: n };
}

/**
 * Una catena di tappe GARANTITE raggiungibili fra loro.
 *
 * Serve quando le zone misurate cadono su aree scollegate — misurato: 7 tappe
 * distribuite su 6 aree che a piedi non si raggiungono. Filtrarle non basta,
 * perche' ne resterebbero due: bisogna sceglierle DENTRO lo spazio camminabile
 * invece di sceglierle prima e verificarle dopo.
 *
 * Come: si campiona l'area camminabile piu' estesa, si prendono i due punti
 * piu' lontani fra loro (i due capi del percorso piu' lungo, cioe' l'asse
 * dell'edificio), e si distribuiscono le tappe LUNGO IL PERCORSO che li
 * unisce. Le tappe stanno su un percorso vero per costruzione.
 *
 * ⚠️ Da' i PUNTI, non i nomi: i nomi restano quelli gia' decisi dalle misure,
 *    dai nomi del modello o dagli occhi. Qui si sposta il dove, non il cosa.
 */
export function catenaCamminabile(quante, opz = {}) {
  if (!ULTIMA || !LIB) return null;
  const g = (ULTIMA.isole && ULTIMA.isole.length ? ULTIMA.isole : isole(ULTIMA.navMesh));
  if (!g || !g.length) return null;
  const isola = g[0];
  const k = Math.max(2, Math.min(quante || 5, 12));

  // Campioni sull'area piu' estesa: un reticolo tarato sulla sua dimensione,
  // non un passo fisso — un'isola di 20 m e una di 300 vogliono passi diversi.
  const lx = isola.ingombro.max[0] - isola.ingombro.min[0];
  const lz = isola.ingombro.max[2] - isola.ingombro.min[2];
  const passo = Math.max(1.5, Math.sqrt(lx * lz) / 14);
  const y = isola.quotaMedia;
  const dentro = [];
  for (let x = isola.ingombro.min[0] + passo / 2; x < isola.ingombro.max[0]; x += passo)
    for (let z = isola.ingombro.min[2] + passo / 2; z < isola.ingombro.max[2]; z += passo) {
      const q = sulCammino(LIB.nav, ULTIMA.navMesh, [x, y, z], [passo * 0.6, 3, passo * 0.6]);
      if (q.ok) dentro.push(q.punto);
    }
  if (dentro.length < 3) return null;

  // I due capi: si parte dal punto piu' lontano dal centro e si cerca chi e'
  // piu' lontano da lui PER PERCORSO, non in linea d'aria. Su una pianta a
  // elle la differenza e' tutta.
  const cx = dentro.reduce((s, p) => s + p[0], 0) / dentro.length;
  const cz = dentro.reduce((s, p) => s + p[2], 0) / dentro.length;
  let a = dentro[0], d0 = -1;
  for (const p of dentro) {
    const q = Math.hypot(p[0] - cx, p[2] - cz);
    if (q > d0) { d0 = q; a = p; }
  }
  let b = null, meglio = -1, catena = null;
  for (const p of dentro) {
    const r = percorso(LIB.nav, ULTIMA.navMesh, a, p, { aderente: true, passo: 1.2 });
    if (!r || r.parziale || r.lunghezza <= meglio) continue;
    meglio = r.lunghezza; b = p; catena = r.punti;
  }
  if (!catena || catena.length < 2) return null;

  // Le tappe, distribuite a distanza uguale lungo il percorso.
  const cum = [0];
  for (let i = 1; i < catena.length; i++)
    cum.push(cum[i - 1] + Math.hypot(catena[i][0] - catena[i - 1][0], catena[i][2] - catena[i - 1][2]));
  const tot = cum[cum.length - 1];
  if (!(tot > 1)) return null;

  // ⚠️ Le due tappe estreme NON vanno sulla punta del percorso. Li' il bordo
  //    della navmesh e' a un raggio di persona dal muro, e gli agenti attorno
  //    a una tappa si aprono a ventaglio: quelli esterni finiscono fuori.
  //    Misurato: il 6,4% delle posizioni fuori dal calpestabile, tutte
  //    concentrate in due punti — i due capi. Rientrando di due metri
  //    spariscono. Non e' un ritocco estetico: una partenza mezza dentro un
  //    muro falsa il conteggio del deflusso.
  const rientro = Math.min(2.5, tot * 0.06);
  const da = rientro, a2 = tot - rientro;
  const punti = [];
  for (let t = 0; t < k; t++) {
    const bersaglio = da + (a2 - da) * t / (k - 1);
    let i = 1;
    while (i < cum.length - 1 && cum[i] < bersaglio) i++;
    const f = (bersaglio - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
    punti.push([
      catena[i - 1][0] + (catena[i][0] - catena[i - 1][0]) * f,
      catena[i - 1][1] + (catena[i][1] - catena[i - 1][1]) * f,
      catena[i - 1][2] + (catena[i][2] - catena[i - 1][2]) * f,
    ]);
  }
  return { punti, lunghezza: tot, areaIsola: isola.area, campioni: dentro.length };
}

/** Riassunto in italiano normale, da dire in chat. */
export function raccontaCammino(r) {
  if (!r || !r.ok) return 'Non ho potuto capire dove si cammina ('
    + ((r && r.perche) || 'motivo ignoto') + ').';
  const g = r.isole || [];
  const grandi = g.filter((i) => i.area > r.area * 0.05);
  return 'Ho capito dove si cammina: ' + Math.round(r.area) + ' m2 calpestabili'
    + (grandi.length > 1
        ? ', in ' + grandi.length + ' parti separate fra loro (la piu grande '
          + Math.round(grandi[0].area) + ' m2)'
        : ', tutti collegati fra loro')
    + '. Le superfici troppo ripide, troppo piccole o senza spazio sopra la testa '
    + 'sono escluse: non ci si cammina.';
}

export default {
  PERSONA, ISOLA_MINIMA_M2, ISOLA_UNIONE_M2, VOXEL_MAX,
  cellaOttima, parametri, geometriaDaModello, costruisci,
  areaPoligono, quotaPoligono, misura, isole, sulCammino, percorso,
  libreria, costruisciDaScena, stato, percorsoCorrente, sulCamminoCorrente,
  gruppiCollegati, catenaCamminabile, raccontaCammino,
};

// ---------------------------------------------------------------------------
// 8. Si aggancia da solo al caricamento del modello
// ---------------------------------------------------------------------------
//
// Avvolge `__veritasOnModelLoaded` come fanno gli altri moduli, invece di
// farsi chiamare da qualcuno: cosi' non c'e' un punto in piu' da ricordare in
// `index.html`, e togliendo questo blocco il programma resta intero.
//
// ⚠️ Si costruisce DOPO aver lasciato lavorare chi viene prima — la scala
//    automatica sta nel blocco 2 e riscala il modello a caricamento avvenuto.
//    Costruire la navmesh su un modello 6 volte piu' piccolo del vero
//    darebbe porte da 20 cm e nessun percorso. Gia' visto succedere con la
//    nuvola di punti (§13.4: 84 m2 invece di 3.700).
if (typeof window !== 'undefined') {
  const precedente = window.__veritasOnModelLoaded;
  window.__veritasOnModelLoaded = function (radice) {
    let out;
    try { out = precedente ? precedente.apply(this, arguments) : undefined; }
    catch (e) { console.error('[VERITAS cammino] errore nel passo precedente:', e); }

    const THREE = window.THREE;
    const root = radice || window.__veritasModelRoot;
    if (!THREE || !root) {
      console.warn('[VERITAS cammino] manca three o il modello: navmesh non costruita');
      return out;
    }
    // Un giro di eventi dopo la scala automatica.
    setTimeout(function () {
      costruisciDaScena(THREE, root).then(function (r) {
        window.__veritasNavmeshEsito = r;
        if (!r.ok) {
          console.warn('[VERITAS cammino] navmesh non costruita:', r.perche);
          return;
        }
        console.log('[VERITAS cammino] navmesh: ' + r.poligoni + ' poligoni, '
          + Math.round(r.area) + ' m2, ' + (r.isole || []).length + ' parti separate, '
          + r.ms + ' ms, cella ' + r.parametri.risoluzione.cella.toFixed(2) + ' m');
        if (typeof window.__veritasAnnounce === 'function') {
          try { window.__veritasAnnounce(raccontaCammino(r)); } catch (e) {}
        }
        // Solo ADESSO le tappe possono essere scelte sapendo dove si cammina,
        // e i percorsi ricalcolati. Prima di questo momento `findRoute`
        // ricadeva sul codice di riserva senza che nulla lo dicesse: la
        // navmesh e' pronta un secondo dopo il caricamento, le traiettorie
        // nascevano subito. Misurato: 3 tratti tirati dritti nei muri.
        if (typeof window.__veritasZoneSulCammino === 'function') {
          try { window.__veritasZoneSulCammino(); }
          catch (e) { console.error('[VERITAS cammino] riassegnazione fallita:', e); }
        }
      });
    }, 0);
    return out;
  };
  console.log('[VERITAS cammino] pronto (navcat) — window.__veritasNavmesh');
}
