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
// 6-bis. I collegamenti verticali: dove una rampa unisce due livelli
// ---------------------------------------------------------------------------
//
// PERCHE' ESISTE QUESTO PEZZO
//
// Misurato il 31/08/2026 sul modello vero, con la simulazione in esecuzione: il
// sistema riconosce DUE piani (+0,77 m e +3,64 m) e li misura bene. Sei tappe
// su sette NASCONO al piano di sopra e vengono riportate a +0,79 m dal passo
// che le rende raggiungibili a piedi, perche' fra i due piani la navmesh trova
// due isole e nessun percorso. Il piano di sopra — con 164 sagome umane sopra —
// non lo attraversa nessuno, e ogni numero della simulazione esce calcolato su
// meta' edificio.
//
// Le scale mobili nel modello ci sono e sono buone: due rampe di 7,2 x 1,2 m
// che salgono da +0,65 a +3,75, pendenza 23-29°, sotto i 35° ammessi. Ma larghe
// 1,2 m fra due balaustre piene, erose del raggio di una persona, restano una
// striscia di poche celle: sotto `minRegionArea`, e la voxelizzazione la butta
// come isola troppo piccola.
//
// La riparazione NON e' abbassare quella soglia — si riempirebbe il modello di
// isole grandi come uno sgabello. E' DICHIARARE il collegamento: e' il
// meccanismo con cui Recast/Detour descrive scale, scale mobili e salti da
// vent'anni, e navcat ce l'ha gia' (`addOffMeshConnection`,
// `isOffMeshConnectionConnected`, `removeOffMeshConnection`). Non si scrive a
// mano. Provato in console sul modello vero: i gruppi raggiungibili passano da
// 2 a 1, e non serve toccare l'appiattimento delle tappe — quel ripiego parte
// solo quando i gruppi sono piu' di uno, e con un gruppo solo non parte.
//
// LA REGOLA E' GEOMETRICA e vale per una scuola, una chiesa, un ospedale, un
// negozio (Regola 0-bis: nessun nome di mesh, nessuna parola di tipologia,
// nessun numero tarato su questo modello — i limiti sono le misure di PERSONA):
//
//     dove una superficie inclinata quanto basta a una persona parte da un
//     livello misurato e arriva a un altro, li' i due livelli si collegano.
//
// ⚠️ I filtri sono stati provati anche sui casi che devono FALLIRE. Il
//    riempimento (inclinata / impronta) separa: rampa vera 87% · aereo 9% ·
//    ala 8% · piastra piatta 0%. Il rapporto lunghezza/larghezza no:
//    boccerebbe uno scalone monumentale largo 10 m e lungo 5, cioe' proprio
//    una chiesa o un museo.
//
// ⚠️ Trappola che e' costata un tentativo: il verso della salita NON si
//    presume. La rampa di questo modello sale verso −X; presumendo il verso il
//    capo alto cade dove il piano di sopra non c'e', si aggancia al pavimento
//    di sotto, e il risultato e' un falso «gia' collegati». Il verso si legge
//    dalla MEDIANA DELLE QUOTE ai due capi dell'asse lungo, sempre.

/**
 * I livelli dell'edificio, raggruppando le quote delle ISOLE.
 *
 * ⚠️ Non l'istogramma delle quote della navmesh. Provato: le bande a mezzo
 *    metro l'una dall'altra si incatenano e finiscono per mettere insieme il
 *    mezzanino e la coda di un aereo sei metri piu' su. Con le isole vengono
 *    puliti: 0,75 · 3,7 · 6,2.
 *
 * Due isole stanno sullo stesso livello se le separa meno di un gradino: sotto
 * quella distanza una persona passa dall'una all'altra camminando.
 */
export function livelli(gruppi, opz = {}) {
  const p = { ...PERSONA, ...(opz.persona || {}) };
  const minima = opz.livelloMinimoM2 != null ? opz.livelloMinimoM2 : ISOLA_UNIONE_M2;
  const q = (gruppi || [])
    .filter((i) => i && isFinite(i.quotaMedia) && i.area >= minima)
    .map((i) => ({ quota: i.quotaMedia, area: i.area }))
    .sort((a, b) => a.quota - b.quota);
  if (!q.length) return [];

  const banchi = [];
  let corrente = [q[0]];
  for (let i = 1; i < q.length; i++) {
    if (q[i].quota - corrente[corrente.length - 1].quota <= p.gradino) corrente.push(q[i]);
    else { banchi.push(corrente); corrente = [q[i]]; }
  }
  banchi.push(corrente);

  return banchi.map((b) => {
    const area = b.reduce((s, x) => s + x.area, 0);
    // Media pesata sull'area: un livello sta dove sta la sua superficie, non
    // dove sta il suo pianerottolo piu' piccolo.
    return { quota: b.reduce((s, x) => s + x.quota * x.area, 0) / area, area, isole: b.length };
  }).sort((a, b) => a.quota - b.quota);
}

/** Il punto (a, b) sta dentro il triangolo? Coordinate baricentriche. */
function dentroTriangolo(a, b, t) {
  const [x1, y1] = t[0], [x2, y2] = t[1], [x3, y3] = t[2];
  const d = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
  if (Math.abs(d) < 1e-12) return false;
  const l1 = ((y2 - y3) * (a - x3) + (x3 - x2) * (b - y3)) / d;
  const l2 = ((y3 - y1) * (a - x3) + (x1 - x3) * (b - y3)) / d;
  return l1 >= -1e-9 && l2 >= -1e-9 && l1 + l2 <= 1 + 1e-9;
}

/** La mediana, che regge un vertice sbagliato dove la media no. */
function mediana(v) {
  if (!v.length) return NaN;
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Misura una superficie inclinata: quanto e' larga, quanto riempie la sua
 * impronta, dove sono i suoi due capi e quale dei due sta in alto.
 *
 * `facce` sono triangoli in coordinate del mondo, gia' scremati alla sola
 * pendenza che una persona affronta. Funzione pura: nessuna libreria, si prova
 * al banco con quattro triangoli scritti a mano.
 */
export function misuraInclinata(facce, opz = {}) {
  const p = { ...PERSONA, ...(opz.persona || {}) };
  if (!facce || facce.length < 2) return null;

  // 1. L'ASSE DELLA SALITA, letto dalla geometria: la direzione in cui la
  //    superficie sale piu' ripida, mediata su tutte le facce e pesata
  //    sull'area. Per una faccia rivolta in su e' l'opposto della proiezione
  //    in pianta della sua normale.
  //
  //    ⚠️ NON e' l'asse piu' lungo, ed e' un errore che costa lo scalone
  //       monumentale: largo 10 m e lungo 5, il lato lungo e' quello per cui
  //       NON si sale. Misurato prendendo il lato lungo: dislivello 18 cm
  //       invece di 3 m, e lo scalone sparisce dai candidati.
  let cx = 0, cz = 0, n = 0;
  for (const t of facce) for (const v of t) { cx += v[0]; cz += v[2]; n++; }
  cx /= n; cz /= n;

  let gx = 0, gz = 0, peso = 0;
  for (const t of facce) {
    const ux = t[1][0] - t[0][0], uy = t[1][1] - t[0][1], uz = t[1][2] - t[0][2];
    const wx = t[2][0] - t[0][0], wy = t[2][1] - t[0][1], wz = t[2][2] - t[0][2];
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const len = Math.hypot(nx, ny, nz);
    if (!(len > 1e-12)) continue;
    if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }   // normali sempre verso l'alto
    const oriz = Math.hypot(nx, nz);
    peso += len / 2;
    if (!(oriz > 1e-12)) continue;                  // faccia orizzontale: non indica verso
    gx += (-nx / oriz) * (len / 2);
    gz += (-nz / oriz) * (len / 2);
  }
  const forza = Math.hypot(gx, gz);
  // Coerenza: quanto le facce salgono TUTTE nello stesso verso. Su una rampa
  // vale quasi 1; su una fusoliera i due fianchi si annullano e vale quasi 0.
  const coerenza = peso > 0 ? forza / peso : 0;

  let cu, su;
  if (forza > 1e-9 && coerenza > 0.02) {
    cu = gx / forza; su = gz / forza;
  } else {
    // Superficie senza un verso di salita (piatta, o simmetrica): si ripiega
    // sull'asse di massima estensione. Non e' una rampa, e i filtri lo diranno.
    let Sxx = 0, Szz = 0, Sxz = 0;
    for (const t of facce) for (const v of t) {
      const dx = v[0] - cx, dz = v[2] - cz;
      Sxx += dx * dx; Szz += dz * dz; Sxz += dx * dz;
    }
    const th = 0.5 * Math.atan2(2 * Sxz, Sxx - Szz);
    cu = Math.cos(th); su = Math.sin(th);
  }
  // A e' la direzione della salita (positiva verso l'alto), B la traversa.
  const A = (v) => (v[0] - cx) * cu + (v[2] - cz) * su;
  const B = (v) => -(v[0] - cx) * su + (v[2] - cz) * cu;

  let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
  for (const t of facce) for (const v of t) {
    const a = A(v), b = B(v);
    if (a < amin) amin = a; if (a > amax) amax = a;
    if (b < bmin) bmin = b; if (b > bmax) bmax = b;
  }
  const lunghezza = amax - amin, larghezza = bmax - bmin;
  if (!(lunghezza > 1e-6) || !(larghezza > 1e-6)) return null;

  // 2. Il riempimento: quanta parte dell'impronta e' davvero coperta
  //    dall'inclinata. Si conta a celle, non sommando le aree proiettate: su
  //    una fusoliera le facce si sovrappongono in pianta e la somma sballa
  //    sopra il 100% promuovendo un aereo a rampa.
  const nA = Math.max(4, Math.min(48, Math.round(lunghezza / Math.max(0.1, p.raggio))));
  const nB = Math.max(3, Math.min(48, Math.round(larghezza / Math.max(0.1, p.raggio))));
  const griglia = new Uint8Array(nA * nB);
  const pa = lunghezza / nA, pb = larghezza / nB;
  for (const t of facce) {
    const tri = [[A(t[0]), B(t[0])], [A(t[1]), B(t[1])], [A(t[2]), B(t[2])]];
    const i0 = Math.max(0, Math.floor((Math.min(tri[0][0], tri[1][0], tri[2][0]) - amin) / pa));
    const i1 = Math.min(nA - 1, Math.floor((Math.max(tri[0][0], tri[1][0], tri[2][0]) - amin) / pa));
    const j0 = Math.max(0, Math.floor((Math.min(tri[0][1], tri[1][1], tri[2][1]) - bmin) / pb));
    const j1 = Math.min(nB - 1, Math.floor((Math.max(tri[0][1], tri[1][1], tri[2][1]) - bmin) / pb));
    for (let i = i0; i <= i1; i++)
      for (let j = j0; j <= j1; j++) {
        if (griglia[i * nB + j]) continue;
        if (dentroTriangolo(amin + (i + 0.5) * pa, bmin + (j + 0.5) * pb, tri))
          griglia[i * nB + j] = 1;
      }
  }
  let coperte = 0;
  for (let i = 0; i < griglia.length; i++) if (griglia[i]) coperte++;
  const riempimento = coperte / griglia.length;

  // 3. I due capi, e QUALE DEI DUE STA IN ALTO. Si legge dalla MEDIANA DELLE
  //    QUOTE delle due fasce estreme, mai presumendo il verso: la rampa di
  //    questo modello sale verso −X, e presumendo si aggancia il capo alto al
  //    pavimento di sotto ottenendo un falso «gia' collegati».
  //    La fascia e' stretta — un ottavo — perche' su una fascia larga la
  //    mediana cade a meta' salita e il capo risulta 25 cm piu' in su di dov'e'.
  const fascia = Math.max(pa, lunghezza * 0.08);
  const bassa = { y: [], x: [], z: [] }, alta = { y: [], x: [], z: [] };
  for (const t of facce) for (const v of t) {
    const a = A(v);
    const dove = a <= amin + fascia ? bassa : (a >= amax - fascia ? alta : null);
    if (!dove) continue;
    dove.y.push(v[1]); dove.x.push(v[0]); dove.z.push(v[2]);
  }
  if (!bassa.y.length || !alta.y.length) return null;
  const capoA = [mediana(bassa.x), mediana(bassa.y), mediana(bassa.z)];
  const capoB = [mediana(alta.x), mediana(alta.y), mediana(alta.z)];
  const sale = capoB[1] >= capoA[1];
  const capoBasso = sale ? capoA : capoB;
  const capoAlto = sale ? capoB : capoA;

  const inPianta = Math.hypot(capoAlto[0] - capoBasso[0], capoAlto[2] - capoBasso[2]);
  const dislivello = capoAlto[1] - capoBasso[1];
  return {
    capoBasso, capoAlto, dislivello, larghezza, lunghezza, riempimento, coerenza,
    pendenza: Math.atan2(dislivello, Math.max(1e-6, inPianta)) * 180 / Math.PI,
    facce: facce.length,
  };
}

/**
 * Cerca nel modello le superfici che una persona potrebbe salire.
 *
 * Guarda mesh per mesh — una rampa e' un oggetto, e mescolando i triangoli di
 * tutto l'edificio l'impronta non vuol piu' dire niente. Tiene solo le facce
 * con pendenza fra `pendenzaMinima` e quella che una persona affronta: sotto e'
 * pavimento, sopra e' copertura.
 *
 * @param THREE   il three del modello (iniettato, come altrove qui)
 * @param radice  THREE.Object3D del modello caricato
 */
export function superficiInclinate(THREE, radice, opz = {}) {
  if (!THREE || !radice) return [];
  radice.updateMatrixWorld(true);
  const p = { ...PERSONA, ...(opz.persona || {}) };
  const pendMin = opz.pendenzaMinima != null ? opz.pendenzaMinima : 5;
  const tettoMesh = opz.tettoTriangoliMesh || 200000;
  const tettoTotale = opz.tettoTriangoliInclinate || 3e6;

  const out = [];
  let letti = 0, saltate = 0;
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nn = new THREE.Vector3();

  radice.traverse((o) => {
    if (!o.isMesh || !o.geometry || o.visible === false) return;
    if (o.userData && (o.userData.__veritasHelper || o.userData.__veritasAgent)) return;
    // Le istanze sono arredo ripetuto — sedie, tavoli, sagome. Una rampa non si
    // istanzia; guardarle costerebbe piu' di quanto renda, e si dichiara.
    if (o.isInstancedMesh) { saltate++; return; }
    const attr = o.geometry.attributes && o.geometry.attributes.position;
    if (!attr) return;
    const ind = o.geometry.index;
    const nTri = Math.floor((ind ? ind.count : attr.count) / 3);
    if (!nTri || nTri > tettoMesh || letti > tettoTotale) { if (nTri > tettoMesh) saltate++; return; }
    letti += nTri;

    const M = o.matrixWorld;
    const facce = [];
    for (let t = 0; t < nTri; t++) {
      for (let k = 0; k < 3; k++) {
        const i = ind ? ind.getX(t * 3 + k) : t * 3 + k;
        v[k].set(attr.getX(i), attr.getY(i), attr.getZ(i)).applyMatrix4(M);
      }
      e1.subVectors(v[1], v[0]); e2.subVectors(v[2], v[0]); nn.crossVectors(e1, e2);
      const len = nn.length();
      if (!(len > 1e-9)) continue;
      const gradi = Math.acos(Math.min(1, Math.abs(nn.y) / len)) * 180 / Math.PI;
      if (gradi < pendMin || gradi > p.pendenzaMax) continue;
      facce.push([[v[0].x, v[0].y, v[0].z], [v[1].x, v[1].y, v[1].z], [v[2].x, v[2].y, v[2].z]]);
    }
    if (facce.length < 2) return;
    const m = misuraInclinata(facce, opz);
    if (m) out.push({ nome: o.name || '(mesh senza nome)', ...m });
  });

  out.sort((a, b) => b.dislivello - a.dislivello);
  out.saltate = saltate;
  return out;
}

/**
 * Dichiara alla navmesh i collegamenti verticali che superano i filtri.
 *
 * Restituisce sempre anche gli SCARTATI col motivo: un passaggio che non c'e'
 * non si dichiara, e uno che c'e' e non si aggancia va detto, non nascosto.
 */
export function collegamentiVerticali(nav, navMesh, candidati, liv, opz = {}) {
  const esito = { aggiunti: [], scartati: [], ids: [], livelli: liv || [] };
  if (!nav || !navMesh || !candidati || !candidati.length) {
    esito.perche = 'nessuna superficie inclinata nel modello';
    return esito;
  }
  if (!liv || liv.length < 2) {
    esito.perche = "un livello solo: non c'e' niente da collegare";
    return esito;
  }
  if (typeof nav.addOffMeshConnection !== 'function'
      || typeof nav.isOffMeshConnectionConnected !== 'function'
      || !nav.OffMeshConnectionDirection) {
    esito.perche = 'questa navcat non espone i collegamenti fuori-mesh';
    return esito;
  }

  const p = { ...PERSONA, ...(opz.persona || {}) };
  const riempMin = opz.riempimentoMinimo != null ? opz.riempimentoMinimo : 0.5;
  const raggioAggancio = opz.raggioAggancio || p.raggio * 5;
  // Il pavimento si cerca entro l'altezza di una persona: piu' in la' non e'
  // il pavimento di quella rampa, e' un altro piano.
  const tolleranza = [p.raggio * 5, p.altezza, p.raggio * 5];

  const livelloDi = (y) => {
    let quale = -1, dist = Infinity;
    liv.forEach((l, i) => { const d = Math.abs(l.quota - y); if (d < dist) { dist = d; quale = i; } });
    return dist <= p.gradino ? quale : -1;
  };

  for (const c of candidati) {
    const scarta = (perche) => esito.scartati.push({
      nome: c.nome, perche, larghezza: c.larghezza,
      riempimento: c.riempimento, dislivello: c.dislivello,
    });
    if (c.larghezza < p.raggio * 2) { scarta('troppo stretta: non ci passa una persona'); continue; }
    if (c.dislivello <= p.gradino) { scarta('non sale: i due capi stanno alla stessa quota'); continue; }
    if (c.riempimento < riempMin) {
      scarta("non e' una rampa: solo " + Math.round(c.riempimento * 100)
        + "% dell'impronta e' inclinato"); continue;
    }
    const basso = livelloDi(c.capoBasso[1]), alto = livelloDi(c.capoAlto[1]);
    if (basso < 0 || alto < 0) { scarta('un capo non arriva a nessun livello misurato'); continue; }
    if (basso === alto) { scarta('parte e arriva sullo stesso livello'); continue; }

    // I capi si agganciano al pavimento vero: una rampa modellata comincia
    // quasi sempre qualche centimetro sopra o sotto la superficie camminabile.
    const qb = sulCammino(nav, navMesh, c.capoBasso, tolleranza);
    const qa = sulCammino(nav, navMesh, c.capoAlto, tolleranza);
    if (!qb.ok || !qa.ok) { scarta('un capo non tocca nessuna superficie camminabile'); continue; }

    let id = null;
    try {
      const r = nav.addOffMeshConnection(navMesh, {
        start: qb.punto,
        end: qa.punto,
        radius: raggioAggancio,
        direction: nav.OffMeshConnectionDirection.BIDIRECTIONAL,
        flags: opz.flagsCollegamento != null ? opz.flagsCollegamento : 1,
        area: opz.areaCollegamento != null ? opz.areaCollegamento : 0,
      });
      id = (r && typeof r === 'object') ? (r.id != null ? r.id : r.offMeshConnectionId) : r;
    } catch (e) {
      scarta('navcat ha rifiutato il collegamento (' + ((e && e.message) || e) + ')');
      continue;
    }
    // Mai dichiarare un passaggio che non c'e'. Se non si aggancia da entrambi
    // i capi si toglie e si conta: un collegamento appeso nel vuoto farebbe
    // credere collegati due piani che restano separati.
    if (id == null || !nav.isOffMeshConnectionConnected(navMesh, id)) {
      if (id != null && typeof nav.removeOffMeshConnection === 'function') {
        try { nav.removeOffMeshConnection(navMesh, id); } catch (e) {}
      }
      scarta('dichiarato ma non agganciato alla navmesh');
      continue;
    }
    esito.ids.push(id);
    esito.aggiunti.push({
      nome: c.nome, id, da: qb.punto, a: qa.punto,
      dislivello: c.dislivello, larghezza: c.larghezza,
      riempimento: c.riempimento, pendenza: c.pendenza,
      quote: [liv[basso].quota, liv[alto].quota],
    });
  }
  return esito;
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

  // I livelli e le rampe che li uniscono (§6-bis). Senza questo passo i piani
  // restano isole, e le tappe del piano di sopra vengono riportate a terra.
  // Dentro un try: un modello senza rampe, o una navcat piu' vecchia, devono
  // dare la navmesh di prima, non un errore.
  if (opz.collegaLivelli !== false) {
    try {
      r.livelli = livelli(r.isole, opz);
      r.collegamenti = collegamentiVerticali(
        lib.nav, r.navMesh, superficiInclinate(THREE, radice, opz), r.livelli, opz);
    } catch (e) {
      r.livelli = r.livelli || [];
      r.collegamenti = { aggiunti: [], scartati: [], ids: [], livelli: r.livelli,
                         perche: 'errore nei collegamenti verticali: ' + ((e && e.message) || e) };
    }
  }
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
    + 'sono escluse: non ci si cammina.'
    + raccontaLivelli(r);
}

/** I piani, e se ci si sale. Si dice sempre: un piano dove non sale nessuno e'
 *  meta' edificio che non viene mai attraversato. */
export function raccontaLivelli(r) {
  const liv = (r && r.livelli) || [];
  if (liv.length < 2) return '';
  const c = (r && r.collegamenti) || { aggiunti: [] };
  const quote = liv.map((l) => (l.quota >= 0 ? '+' : '') + l.quota.toFixed(2) + ' m').join(', ');
  return ' Ho visto ' + liv.length + ' livelli (' + quote + '): '
    + (c.aggiunti && c.aggiunti.length
        ? 'li collegano ' + c.aggiunti.length + (c.aggiunti.length === 1 ? ' rampa' : ' rampe')
          + ' che si salgono a piedi.'
        : 'non ho trovato nessuna rampa che li colleghi, quindi da un piano '
          + "all'altro a piedi non si passa.");
}

export default {
  PERSONA, ISOLA_MINIMA_M2, ISOLA_UNIONE_M2, VOXEL_MAX,
  cellaOttima, parametri, geometriaDaModello, costruisci,
  areaPoligono, quotaPoligono, misura, isole, sulCammino, percorso,
  livelli, misuraInclinata, superficiInclinate, collegamentiVerticali,
  libreria, costruisciDaScena, stato, percorsoCorrente, sulCamminoCorrente,
  gruppiCollegati, catenaCamminabile, raccontaCammino, raccontaLivelli,
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
        // I livelli e le rampe, sempre a schermo: un piano irraggiungibile e'
        // meta' modello mai attraversato, e va detto invece che appiattito.
        const liv = r.livelli || [], col = r.collegamenti || { aggiunti: [], scartati: [] };
        if (liv.length > 1) {
          const quote = liv.map((l) => l.quota.toFixed(2) + ' m').join(' · ');
          if (col.aggiunti.length)
            console.log('[VERITAS cammino] ' + liv.length + ' livelli (' + quote + '), '
              + col.aggiunti.length + ' collegamenti verticali dichiarati: '
              + col.aggiunti.map((a) => a.nome + ' +' + a.dislivello.toFixed(2) + ' m').join(', '));
          else
            console.warn('[VERITAS cammino] ' + liv.length + ' livelli (' + quote + ') e NESSUNA '
              + 'rampa che li colleghi' + (col.perche ? ' (' + col.perche + ')' : '')
              + ': chi sta di sopra non scende e nessuno ci sale.'
              + (col.scartati.length ? ' Scartate ' + col.scartati.length + ' superfici inclinate: '
                  + col.scartati.slice(0, 4).map((s) => s.nome + ' — ' + s.perche).join(' | ') : ''));
        }
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
