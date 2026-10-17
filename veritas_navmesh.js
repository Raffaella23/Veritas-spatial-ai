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
//   altezza 1,75 m  LA STATURA DI UNA PERSONA. Direttiva di Raffaella
//                   (HANDOFF §0.2, ribadita il 22/09/2026): «l'uomo medio al
//                   massimo sta fra un 1,70 e un 1,80». 1,75 e' il mezzo.
//
//                   ⛔ QUI C'ERA 2,00 m, ed era un errore di sostanza, non un
//                   numero da ritoccare. 2,00 m e' l'ALTEZZA LIBERA MINIMA DI
//                   PASSAGGIO: quello che la NORMA chiede a un edificio da
//                   costruire. Usarla come corpo di chi cammina in un edificio
//                   ESISTENTE vuol dire cancellare dal cammino ogni spazio che
//                   la norma non rispetta — invece di dirlo.
//
//                   Misurato il 22/09 sul modello dell'aeroporto: 20 m di
//                   terminal con 1,75 m di cielo sparivano dalla mappa, e
//                   l'edificio si spezzava in nove pezzi. Le 344 figure
//                   disegnate dentro quel modello sono alte 1,63 m di mediana:
//                   ci passavano tutte. Non ci passava il fantasma da 2,00.
//
//                   L'altezza libera di norma non e' persa: sta in
//                   ALTEZZA_LIBERA_NORMA qui sotto, e appartiene al confronto
//                   normativo, che DICE «qui il passaggio e' 1,75, la norma
//                   chiede 2,00» invece di cancellare il pavimento.
//   gradino 0,40 m  due alzate a norma (DM 236/89: alzata max 17-18 cm). Serve
//                   a salire le scale del modello senza saltare fra piani.
//   pendenza 35°    una scala comune sta fra 30° e 35°; una rampa accessibile
//                   sta sotto i 5°. Sopra i 35° non e' un percorso: e' una
//                   copertura, un'ala, un terrapieno.
//
export const PERSONA = Object.freeze({
  raggio: 0.30,
  altezza: 1.75,
  gradino: 0.40,
  pendenzaMax: 35,
});

// L'altezza libera che la NORMA chiede a un passaggio. Non e' un corpo: e' un
// requisito. Serve a chi verifica la conformita', e non deve MAI tornare a fare
// da statura alla persona che cammina — vedi il blocco qui sopra.
export const ALTEZZA_LIBERA_NORMA = 2.00;

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
// «A TERRA» — §6.14, superpoteri dell'occhio (24/09/2026, direttiva 17). Una
// lastra sottile che l'occhio ha visto come segnaletica orizzontale (PASSO_DI
// = "a terra", `veritas_riconosce.js`) non e' un ostacolo: e' un disegno sul
// pavimento, e si esclude PRIMA di entrare nel buffer — la navmesh non deve
// mai sapere che esisteva.
//
// ⚠️ Due controlli insieme, non uno solo:
//    1. l'occhio ha detto "a terra" proprio li' — non basta che la mesh stia
//       in una zona qualunque, deve cadere dentro il riquadro visto (XZ, con
//       0,5 m di tolleranza) e poggiare sul suo piano: dal pavimento di
//       quel piano (`quotaPiano`) fino a 1,60 m sopra;
//    2. la mesh e' SOTTILE: sotto 1,60 m — lo stesso tetto gia' deciso in
//       `piantaDelPavimento` (veritas_vista.js) per "vicino al pavimento",
//       non un numero nuovo.
//    Senza il secondo controllo un riquadro impreciso escluderebbe una panca
//    vera: la panca resta un ostacolo se l'occhio non l'ha chiamata
//    segnaletica (non si tocca — veritas_navmesh.test.mjs lo prova).
// ⛔ MISURATO IL 24/09 SERA, e il primo giro era sbagliato: bastava che il
//    CENTRO della lastra cadesse nel riquadro. L'occhio ha posato 74 riquadri
//    «a terra», alcuni di 35 x 29 m, e se ne sono andate 419 lastre — compresi
//    i PAVIMENTI del centro e dell'est: gruppi 7 -> 1 perche' la mappa era
//    sparita. Quindi altre due condizioni, tutte e due gia' del programma:
//    3. la lastra sta TUTTA dentro il riquadro visto (0,5 m di tolleranza):
//       il pavimento non ci sta mai, la freccia si';
//    4. il riquadro e' credibile dall'alto: il lato CORTO non supera 4 m, la
//       stessa misura con cui `marcaDallOcchio` crede a un varco visto in
//       pianta. Una fila di frecce e' una corsia (misurato: 2 x 13 m davanti
//       alle aperture); un'area di mezzo terminal chiamata «freccia» no.
//    5. LASTRA vuol dire sottile rispetto a quanto e' larga: lo spessore non
//       supera un quarto del suo lato corto in pianta. La freccia (13 cm su
//       un metro) lo e'; una seduta (40 cm su 41), un bancone (1 m su 1,09) e
//       un monitor in piedi no. Misurato al terzo giro: senza questa regola
//       uscivano 40 sedute in fila al piano di sopra, dentro riquadri che
//       l'occhio chiamava «freccia» con il 12-25% di fiducia.
//    6. SI GIUDICA LA COSA INTERA, non il suo pezzo. Un modello divide una
//       cosa in pezzi per materiale (Cube059 -> Cube059_0/_1/_2): giudicando
//       il pezzo, usciva il PIANO di un tavolo alto 1 m e restavano le gambe,
//       e la mappa ci passava sotto (misurato al quinto giro). La cosa e' il
//       nodo i cui figli sono tutti pezzi; si misura intera e si toglie
//       intera, o resta intera. Nessun nome, solo la struttura del modello.
export const LATO_MASSIMO_ATERRA_M = 4;
export const SOGLIA_SOTTILE_ATERRA_M = 1.60;
export function areeATerraDalMondo(opz) {
  const viste = opz.vistoNelMondo
    || (typeof window !== "undefined" && window.__veritasVistoNelMondo) || [];
  return viste.filter((o) => o && o.passo === "a terra" && o.mondo
    && Math.min(o.mondo.max[0] - o.mondo.min[0], o.mondo.max[2] - o.mondo.min[2]) <= LATO_MASSIMO_ATERRA_M);
}
export function eSegnaleticaATerra(box, aree) {
  if (!aree.length || box.isEmpty()) return false;
  const alta = box.max.y - box.min.y;
  if (alta > SOGLIA_SOTTILE_ATERRA_M) return false;
  if (alta > Math.min(box.max.x - box.min.x, box.max.z - box.min.z) / 4) return false;   // non e' una lastra
  return aree.some((o) => {
    // la pianta non ha quota nel riquadro (y = 0): la quota e' quella del piano
    const q = typeof o.quotaPiano === "number" ? o.quotaPiano : o.mondo.min[1];
    return box.min.x >= o.mondo.min[0] - 0.5 && box.max.x <= o.mondo.max[0] + 0.5
      && box.min.z >= o.mondo.min[2] - 0.5 && box.max.z <= o.mondo.max[2] + 0.5
      && box.min.y >= q - 0.5 && box.min.y <= q + SOGLIA_SOTTILE_ATERRA_M;
  });
}

export function cosaIntera(o, radice) {
  const p = o.parent;
  return (p && p !== radice && p.children.length && p.children.every((c) => c.isMesh)) ? p : o;
}

/** Il solido e' chiuso e rovesciato (volume con segno negativo)? Una volta per geometria. */
const ROVESCI = new WeakMap();
function solidoRovesciato(geom) {
  if (!geom || !geom.attributes || !geom.attributes.position) return false;
  if (ROVESCI.has(geom)) return ROVESCI.get(geom);
  const a = geom.attributes.position, ind = geom.index;
  const nTri = Math.floor((ind ? ind.count : a.count) / 3);
  let esito = false;
  if (nTri >= 4 && nTri <= 200000) {
    // i vertici saldati per posizione (un modello duplica i vertici per le normali)
    const id = new Map(), vid = new Int32Array(a.count);
    for (let i = 0; i < a.count; i++) {
      const k = Math.round(a.getX(i) * 1e4) + ',' + Math.round(a.getY(i) * 1e4) + ',' + Math.round(a.getZ(i) * 1e4);
      let v = id.get(k); if (v === undefined) { v = id.size; id.set(k, v); } vid[i] = v;
    }
    const spigoli = new Map();
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < a.count; i++) { cx += a.getX(i); cy += a.getY(i); cz += a.getZ(i); }
    cx /= a.count; cy /= a.count; cz /= a.count;
    let vol = 0;
    for (let t = 0; t < nTri; t++) {
      const i0 = ind ? ind.getX(t * 3) : t * 3, i1 = ind ? ind.getX(t * 3 + 1) : t * 3 + 1, i2 = ind ? ind.getX(t * 3 + 2) : t * 3 + 2;
      for (const [p, q] of [[vid[i0], vid[i1]], [vid[i1], vid[i2]], [vid[i2], vid[i0]]]) {
        const k = p < q ? p + ':' + q : q + ':' + p; spigoli.set(k, (spigoli.get(k) || 0) + 1);
      }
      const ax = a.getX(i0) - cx, ay = a.getY(i0) - cy, az = a.getZ(i0) - cz;
      const bx = a.getX(i1) - cx, by = a.getY(i1) - cy, bz = a.getZ(i1) - cz;
      const qx = a.getX(i2) - cx, qy = a.getY(i2) - cy, qz = a.getZ(i2) - cz;
      vol += (ax * (by * qz - bz * qy) - ay * (bx * qz - bz * qx) + az * (bx * qy - by * qx)) / 6;
    }
    let chiuso = spigoli.size > 0;
    for (const n of spigoli.values()) if (n !== 2) { chiuso = false; break; }
    esito = chiuso && vol < 0;
  }
  ROVESCI.set(geom, esito);
  return esito;
}

export function geometriaDaModello(THREE, radice, opz = {}) {
  if (!THREE || !radice) return null;
  radice.updateMatrixWorld(true);

  const pos = [];
  const idx = [];
  let mesh = 0, saltate = 0, segnaletica = 0, specchiate = 0;
  const tolte = [];
  const tettoTriangoli = opz.tettoTriangoli || 1.2e6;
  const tettoIstanze = opz.tettoIstanze || 4096;
  const M = new THREE.Matrix4();
  const v = new THREE.Vector3();
  const aree = areeATerraDalMondo(opz);
  const giudicate = new Map();   // cosa intera -> e' segnaletica a terra?
  // 17/10/2026 — NEL PASSAGGIO VISTO IL SOFFITTO NON TOGLIE IL PAVIMENTO (§0.2,
  // §0.4). Vedi `soffittiNeiPassaggi`: tetto e travi di un pontile visto
  // dall'occhio non entrano nella mappa; pavimento e pareti si'.
  const cieliTolti = soffittiNeiPassaggi(THREE, radice, opz);
  let soffitti = 0;

  function aggiungi(geom, matrice) {
    const attr = geom && geom.attributes && geom.attributes.position;
    if (!attr) { saltate++; return; }
    const base = pos.length / 3;
    for (let i = 0; i < attr.count; i++) {
      v.set(attr.getX(i), attr.getY(i), attr.getZ(i)).applyMatrix4(matrice);
      pos.push(v.x, v.y, v.z);
    }
    // ⛔ 17/10/2026 — UN OGGETTO SPECCHIATO HA I PAVIMENTI A ROVESCIO. Un modello
    //    usa spesso la stessa parte specchiata (scala -1 su un asse): il disegno
    //    a schermo la gira da solo, ma qui i triangoli passano con la matrice e
    //    basta, e uno specchio inverte il verso di ogni triangolo. La libreria
    //    giudica il pavimento dal verso: la faccia di sopra diventa «rivolta in
    //    giu'», quella di sotto «rivolta in su', e coperta». Misurato sui pontili
    //    dell'aeroporto: centinaia di lastre specchiate, pavimento a 2,99 m letto
    //    a 2,85 sotto la lastra stessa — nessuno ci camminava. E' geometria, non
    //    taratura: col determinante negativo si scambiano due vertici.
    // 17/10/2026 — E UN SOLIDO ROVESCIATO (dentro-fuori) HA I PAVIMENTI A ROVESCIO,
    //    come uno specchiato. Misurato sulla clinica (IFC convertito): 808 solidi
    //    su 4.896 col volume negativo, e la mappa vedeva 613 m² su due piani. Si
    //    gira SOLO un solido CHIUSO (ogni spigolo fra due triangoli): su una lastra
    //    aperta il volume non vuol dire niente, e non si tocca.
    const specchio = (matrice.determinant() < 0) !== solidoRovesciato(geom);
    const ind = geom.index;
    if (ind) {
      for (let i = 0; i + 2 < ind.count; i += 3)
        if (specchio) idx.push(base + ind.getX(i), base + ind.getX(i + 2), base + ind.getX(i + 1));
        else idx.push(base + ind.getX(i), base + ind.getX(i + 1), base + ind.getX(i + 2));
    } else {
      for (let i = 0; i + 2 < attr.count; i += 3)
        if (specchio) idx.push(base + i, base + i + 2, base + i + 1);
        else idx.push(base + i, base + i + 1, base + i + 2);
    }
    if (specchio) specchiate++;
    mesh++;
  }

  radice.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    if (o.visible === false) return;
    // Roba nostra: marker delle zone, agenti, aiuti visivi. Non e' architettura.
    if (o.userData && (o.userData.__veritasHelper || o.userData.__veritasAgent)) return;
    if (idx.length / 3 > tettoTriangoli) { saltate++; return; }

    if (aree.length) {
      const cosa = cosaIntera(o, radice);
      if (!giudicate.has(cosa)) giudicate.set(cosa, eSegnaleticaATerra(new THREE.Box3().setFromObject(cosa), aree));
      const box = new THREE.Box3().setFromObject(o);
      if (giudicate.get(cosa)) {
        segnaletica++;
        if (tolte.length < 150) tolte.push((o.name || "?") + " " + [box.max.x - box.min.x,   // solo per chi controlla
          box.max.z - box.min.z, box.max.y - box.min.y, box.min.y].map((v) => v.toFixed(2)).join("/"));
        return;
      }
    }

    if (cieliTolti.size && cieliTolti.has(o)) { soffitti++; return; }

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
    mesh, saltate, segnaletica, tolte, specchiate, soffitti, stanze: cieliTolti.stanze || 0, chiusi: cieliTolti.chiusi || [],
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
      const bordo = [];
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

        // Dove l'isola SI AFFACCIA: il punto di mezzo di ogni lato che non ha
        // un vicino. Serve a `collegamentiOrizzontali` per sapere da dove
        // guardare l'isola accanto. Ciclo a parte, per non toccare il
        // raggruppamento qui sopra, che e' misurato e funziona.
        const nv = poly.vertices.length;
        for (let k = 0; k < nv; k++) {
          const nei = (poly.neis || [])[k];
          if (nei && !(nei & EXT_LINK)) continue;
          const a = poly.vertices[k] * 3, b = poly.vertices[(k + 1) % nv] * 3;
          bordo.push([
            (tile.vertices[a] + tile.vertices[b]) / 2,
            (tile.vertices[a + 1] + tile.vertices[b + 1]) / 2,
            (tile.vertices[a + 2] + tile.vertices[b + 2]) / 2,
          ]);
        }
      }
      gruppi.push({ poligoni: n, area, quotaMedia: y / n, ingombro: { min, max }, tile: chiave, bordo });
    }
  }
  return gruppi.sort((a, b) => b.area - a.area);
}

// ---------------------------------------------------------------------------
// 6. Camminare
// ---------------------------------------------------------------------------

/** Tolleranza di aggancio: quanto lontano si cerca il pavimento sotto un punto. */
const TOLLERANZA = [2, 4, 2];

// 17/10/2026 sera — LA CARROZZINA NON PRENDE SCALE NE' SCALE MOBILI. Un
// collegamento fra piani piu' ripido di una rampa a norma (DM 236/1989, art.
// 8.1.11: pendenza massima 8%) porta il segno SOLO_A_PIEDI; chi va in
// carrozzina cerca una strada senza (`veritas_folla`, stesso numero).
const SOLO_A_PIEDI = 2;
const PENDENZA_MAX_CARROZZINA = Math.atan(0.08) * 180 / Math.PI;

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
  // 14/09/2026 — un filtro di COSTO opzionale. Mai di passaggio: chi passa e
  // chi no lo decide sempre lo stesso passFilter di prima (`opz.filtro`, se
  // c'e', lo eredita da createDefaultQueryFilter — vedi dove si costruisce).
  // Senza `opz.filtro` il comportamento e' identico a ieri: nessuna regressione
  // su chi non ne ha bisogno.
  const filtro = opz.filtro || nav.DEFAULT_QUERY_FILTER;
  const r = opz.aderente
    ? nav.findSmoothPath(navMesh, da, a, tol, filtro, {
        stepSize: opz.passo || 0.5,
        slop: (opz.passo || 0.5) * 0.4,
        maxPoints: opz.maxPunti || 2048,
      })
    : nav.findPath(navMesh, da, a, tol, filtro);
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
  // ⛔ 17/10/2026 sera — IL CAPO STA A META' DELLA LARGHEZZA, non su uno spigolo.
  //    La mediana delle x e delle z dei vertici cadeva su un BORDO: una rampa
  //    modellata ha i vertici sui due fianchi e nessuno in mezzo. Misurato sulla
  //    scala mobile dell'aeroporto (netti 0,90 m fra le balaustre, asse z 8,05):
  //    capi a z 7,62 e 8,52, la corsia correva in diagonale e lungo la
  //    balaustra, e la «parete dentro il corpo» era per meta' li'. Lungo la
  //    salita resta la mediana; di traverso il centro fra i due fianchi.
  const bassa = { y: [], a: [], b: [] }, alta = { y: [], a: [], b: [] };
  for (const t of facce) for (const v of t) {
    const a = A(v);
    const dove = a <= amin + fascia ? bassa : (a >= amax - fascia ? alta : null);
    if (!dove) continue;
    dove.y.push(v[1]); dove.a.push(a); dove.b.push(B(v));
  }
  if (!bassa.y.length || !alta.y.length) return null;
  const capoDi = (f) => {
    const a = mediana(f.a), b = (Math.min(...f.b) + Math.max(...f.b)) / 2;
    return [cx + a * cu - b * su, mediana(f.y), cz + a * su + b * cu];
  };
  const capoA = capoDi(bassa);
  const capoB = capoDi(alta);
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
    // 17/10/2026 — anche DOVE sta la cosa intera: la regia dell'occhio ci va a
    // guardare (`candidati`), e il collegamento si dichiara solo se l'occhio la
    // chiama «si passa» (§0.4: vede l'occhio, valida il cervello).
    if (m) {
      const scatola = new THREE.Box3().setFromObject(cosaIntera(o, radice));
      out.push({ nome: o.name || '(mesh senza nome)', uuid: o.uuid, ...m,
                 scatola: { min: scatola.min.toArray(), max: scatola.max.toArray() } });
    }
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
// 17/10/2026 sera — DALLA RAMPA SI SCENDE DRITTI. Il capo si aggancia al pavimento
// cercando AVANTI lungo l'asse della rampa (da `altro` verso `capo`, e oltre), a
// passi di mezzo raggio di persona, con poco gioco di lato; solo se non trova
// niente si ripiega sul punto piu' vicino in ogni direzione. Misurato sulla scala
// mobile dell'aeroporto: il piu' vicino in ogni direzione stava 45 cm di lato,
// sulla balaustra, e la corsia ci correva contro.
function sulCamminoAvanti(nav, navMesh, capo, altro, tolleranza, raggio) {
  const dx = capo[0] - altro[0], dz = capo[2] - altro[2], L = Math.hypot(dx, dz);
  const tol = tolleranza || TOLLERANZA;
  if (L > 1e-6 && raggio > 0) {
    const ux = dx / L, uz = dz / L, passo = raggio / 2, gioco = [raggio / 2, tol[1], raggio / 2];
    for (let k = 0; k * passo <= tol[0]; k++) {
      const q = sulCammino(nav, navMesh, [capo[0] + ux * k * passo, capo[1], capo[2] + uz * k * passo], gioco);
      if (!q.ok) continue;
      const lato = Math.abs(-(q.punto[0] - capo[0]) * uz + (q.punto[2] - capo[2]) * ux);
      if (lato <= raggio / 2) return q;
    }
  }
  return sulCammino(nav, navMesh, capo, tol);
}

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
  const segnoDi = (c) => (opz.flagsCollegamento != null ? opz.flagsCollegamento : 1)
    | (c.pendenza > PENDENZA_MAX_CARROZZINA ? SOLO_A_PIEDI : 0);

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
    const qb = sulCamminoAvanti(nav, navMesh, c.capoBasso, c.capoAlto, tolleranza, p.raggio);
    const qa = sulCamminoAvanti(nav, navMesh, c.capoAlto, c.capoBasso, tolleranza, p.raggio);
    if (!qb.ok || !qa.ok) { scarta('un capo non tocca nessuna superficie camminabile'); continue; }

    // ⛔ 17/10/2026 — SOLO DOVE L'OCCHIO HA VISTO UN PASSAGGIO (strada approvata
    //    da Raffaella il 17/10; §0.4, §0.9). La geometria PROPONE la rampa; la
    //    DICHIARA l'occhio, se li' ha visto «si passa» (scala, scala mobile,
    //    rampa...). Finche' non l'ha vista la rampa resta CANDIDATA: la regia ci
    //    va a guardare (`esito.candidati`), e nessuno la percorre sulla parola
    //    della sola geometria. Misurato il 17/10 sull'aeroporto: l'occhio non
    //    aveva MAI guardato le scale mobili — nessun «tipo» le conteneva.
    //    Senza `opz.soloOcchio` (prove al banco) si resta come prima.
    let visto = null;
    if (opz.soloOcchio === true) {
      visto = confermatoDallOcchio(qb.punto, qa.punto, c.larghezza, opz.passaggi || []);
      if (!visto) {
        esito.candidati = esito.candidati || [];
        esito.candidati.push({ nome: c.nome, uuid: c.uuid, scatola: c.scatola, da: qb.punto, a: qa.punto,
                               dislivello: c.dislivello, larghezza: c.larghezza });
        scarta(opz.occhioHaParlato ? "l'occhio non ci ha visto un passaggio" : "in attesa dell'occhio");
        continue;
      }
    }
    let id = null;
    try {
      const r = nav.addOffMeshConnection(navMesh, {
        start: qb.punto,
        end: qa.punto,
        radius: raggioAggancio,
        direction: nav.OffMeshConnectionDirection.BIDIRECTIONAL,
        flags: segnoDi(c),
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
    // 17/10/2026 — DUE CORSIE AFFIANCATE: UNA SALE, UNA SCENDE. Una scala mobile
    // ha due nastri; dichiarati tutti e due «nei due versi» la folla li usa per
    // salire E per scendere sullo stesso nastro, e chi sale e chi scende si
    // bloccano faccia a faccia (misurato al banco: meta' delle persone ferme ai
    // due capi). Se c'e' gia' una corsia fra gli stessi piani, coi capi vicini
    // (entro dieci raggi di persona), la prima diventa in salita e questa in discesa.
    let verso = 'entrambi';
    const gemella = esito.aggiunti.find((x) => x.verso === 'entrambi' && x.quote[0] === liv[basso].quota && x.quote[1] === liv[alto].quota
      && Math.hypot(x.da[0] - qb.punto[0], x.da[2] - qb.punto[2]) < p.raggio * 10 && Math.hypot(x.a[0] - qa.punto[0], x.a[2] - qa.punto[2]) < p.raggio * 10);
    if (gemella && opz.corsie !== false && nav.OffMeshConnectionDirection.START_TO_END != null) {
      try {
        const unaVia = (start, end) => {
          const rr = nav.addOffMeshConnection(navMesh, { start, end, radius: raggioAggancio,
            direction: nav.OffMeshConnectionDirection.START_TO_END,
            flags: segnoDi(c), area: opz.areaCollegamento != null ? opz.areaCollegamento : 0 });
          return (rr && typeof rr === 'object') ? (rr.id != null ? rr.id : rr.offMeshConnectionId) : rr;
        };
        const su = unaVia(gemella.da, gemella.a), giu = unaVia(qa.punto, qb.punto);
        if (su != null && giu != null && nav.isOffMeshConnectionConnected(navMesh, su) && nav.isOffMeshConnectionConnected(navMesh, giu)) {
          nav.removeOffMeshConnection(navMesh, gemella.id);
          nav.removeOffMeshConnection(navMesh, id);
          esito.ids.splice(esito.ids.indexOf(gemella.id), 1, su);
          gemella.id = su; gemella.verso = 'sale'; id = giu; verso = 'scende';
        } else {
          for (const x of [su, giu]) if (x != null) { try { nav.removeOffMeshConnection(navMesh, x); } catch (e) {} }
        }
      } catch (e) { /* si resta nei due versi */ }
    }
    esito.ids.push(id);
    esito.aggiunti.push({
      nome: c.nome, id, verso, da: verso === 'scende' ? qa.punto : qb.punto, a: verso === 'scende' ? qb.punto : qa.punto,
      visto: visto ? (visto.nome || visto.termine) : null,
      dislivello: c.dislivello, larghezza: c.larghezza,
      riempimento: c.riempimento, pendenza: c.pendenza,
      quote: [liv[basso].quota, liv[alto].quota],
      asse: [c.capoBasso.slice(), c.capoAlto.slice()],
      soloAPiedi: c.pendenza > PENDENZA_MAX_CARROZZINA,
    });
  }
  // 17/10/2026 sera — L'ASSE DELLA RAMPA resta attaccato al collegamento, per
  // chi lo percorre (`veritas_folla`): fra le balaustre si sta in mezzo, e si
  // piega verso il pavimento libero solo una volta scesi.
  for (const x of esito.aggiunti) {
    const oc = navMesh.offMeshConnections && navMesh.offMeshConnections[x.id];
    if (oc) oc.asse = x.asse;
  }
  return esito;
}

/**
 * C'e' qualcosa fra questi due punti, all'altezza del petto?
 *
 * Non si guarda a terra: a terra c'e' sempre il pavimento. Si guarda dove
 * starebbe il petto di chi passa, perche' e' li' che un muro, un bancone o una
 * balaustra impediscono davvero. Un gradino di 20 cm non intercetta niente, ed
 * e' giusto: quello si sale.
 */
function muroInMezzo(geo, da, a, opz = {}) {
  if (!geo || !geo.positions || !geo.indices) return false;
  const h = opz.altezzaSguardo != null ? opz.altezzaSguardo : 1.0;
  const o = [da[0], da[1] + h, da[2]];
  const d = [a[0] - da[0], a[1] - da[1], a[2] - da[2]];
  if (Math.hypot(d[0], d[1], d[2]) < 1e-6) return false;

  const P = geo.positions, I = geo.indices;
  const m = 0.05;
  const minX = Math.min(o[0], o[0] + d[0]) - m, maxX = Math.max(o[0], o[0] + d[0]) + m;
  const minY = Math.min(o[1], o[1] + d[1]) - m, maxY = Math.max(o[1], o[1] + d[1]) + m;
  const minZ = Math.min(o[2], o[2] + d[2]) - m, maxZ = Math.max(o[2], o[2] + d[2]) + m;

  for (let t = 0; t + 2 < I.length; t += 3) {
    const i0 = I[t] * 3, i1 = I[t + 1] * 3, i2 = I[t + 2] * 3;
    const ax = P[i0], ay = P[i0 + 1], az = P[i0 + 2];
    const bx = P[i1], by = P[i1 + 1], bz = P[i1 + 2];
    const cx = P[i2], cy = P[i2 + 1], cz = P[i2 + 2];
    if (Math.min(ax, bx, cx) > maxX || Math.max(ax, bx, cx) < minX) continue;
    if (Math.min(ay, by, cy) > maxY || Math.max(ay, by, cy) < minY) continue;
    if (Math.min(az, bz, cz) > maxZ || Math.max(az, bz, cz) < minZ) continue;
    // 17/10/2026 — i pezzi del passaggio visto non fanno da muro a se' stessi
    // (una porta modellata chiusa, la parete di un pontile): §0.4, vince l'occhio.
    if (opz.ignora && opz.ignora(ax, ay, az, bx, by, bz, cx, cy, cz)) continue;

    const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
    const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
    const px = d[1] * e2z - d[2] * e2y;
    const py = d[2] * e2x - d[0] * e2z;
    const pz = d[0] * e2y - d[1] * e2x;
    const det = e1x * px + e1y * py + e1z * pz;
    if (Math.abs(det) < 1e-12) continue;
    const inv = 1 / det;
    const tx = o[0] - ax, ty = o[1] - ay, tz = o[2] - az;
    const u = (tx * px + ty * py + tz * pz) * inv;
    if (u < 0 || u > 1) continue;
    const qx = ty * e1z - tz * e1y;
    const qy = tz * e1x - tx * e1z;
    const qz = tx * e1y - ty * e1x;
    const v = (d[0] * qx + d[1] * qy + d[2] * qz) * inv;
    if (v < 0 || u + v > 1) continue;
    const s = (e2x * qx + e2y * qy + e2z * qz) * inv;
    if (s > 0.001 && s < 0.999) return true;
  }
  return false;
}

/** La fessura piu' stretta fra due isole: i due punti che si guardano. */
function fessuraFra(x, y, luce) {
  const tutte = fessureFra(x, y, luce, 0);
  return tutte.length ? tutte[0] : null;
}

/**
 * TUTTE le fessure fra due isole, lungo il bordo, dalla piu' stretta.
 *
 * ⚠️ UNA PARETE CON LE APERTURE — 24/09/2026. Fra la hall centrale e la zona
 *    est del terminal c'e' una parete vera con delle aperture (Raffaella: «una
 *    parete vera con delle aperture, dopo partono a destra le indicazioni in
 *    fucsia»). Si guardava UN punto solo, il piu' vicino: cadeva sulla parete,
 *    `muroInMezzo` diceva di si', e le aperture accanto non venivano provate.
 *    Misurato: tre cuciture rifiutate, mezzo edificio irraggiungibile.
 *    Qui si prendono i punti lungo tutto il bordo che si affaccia, distanti
 *    almeno `passo` metri l'uno dall'altro: la regola «un muro non si
 *    scavalca» resta identica, cambia solo che la si chiede in ogni punto.
 */
function fessureFra(x, y, luce, passo = 1) {
  const cand = [];
  for (const q of x.bordo) {
    if (q[0] < y.ingombro.min[0] - luce || q[0] > y.ingombro.max[0] + luce) continue;
    if (q[2] < y.ingombro.min[2] - luce || q[2] > y.ingombro.max[2] + luce) continue;
    let mi = Infinity, a = null;
    for (const w of y.bordo) {
      const dx = q[0] - w[0], dz = q[2] - w[2];
      const d2 = dx * dx + dz * dz;
      if (d2 < mi) { mi = d2; a = w; }
    }
    if (a && Math.sqrt(mi) <= luce) cand.push({ da: q, a, luce: Math.sqrt(mi) });
  }
  cand.sort((u, v) => u.luce - v.luce);
  const scelte = [];
  for (const c of cand) {
    if (passo > 0 && scelte.some((s) => Math.hypot(s.da[0] - c.da[0], s.da[2] - c.da[2]) < passo)) continue;
    scelte.push(c);
  }
  return scelte;
}

// Quante fessure si provano fra due isole, e quanti ponti al piu' si posano.
const FESSURE_DA_PROVARE = 40;
const APERTURE_PER_COPPIA = 6;

/**
 * IL PAVIMENTO NON E' MAI UNO SOLO, E NESSUN MODELLO LO DISEGNA CONTINUO.
 *
 * Un GLB di libreria, un IFC uscito da Revit, uno SketchUp: il pavimento e'
 * sempre fatto di piastre affiancate — stanze, corridoi, piani appoggiati uno
 * sull'altro. Che due piastre si tocchino al millimetro e' un caso fortunato,
 * e quando non si toccano la navmesh ne fa due isole e la gente non passa.
 * Non e' il difetto di un modello: e' il modo in cui si disegna.
 *
 * Qui si fa quello che §6-bis fa gia' per le scale: **si dichiara il ponte**.
 * Non si cerca perche' il pavimento e' spaccato — si fa in modo che ci si
 * cammini sopra lo stesso.
 *
 * ⛔ MA UN MURO NON SI SCAVALCA MAI. La regola del 18/08 (vedi
 *    `gruppiCollegati`) resta in vigore: due sale separate da una parete sono
 *    separate DAVVERO, e vanno dette separate invece che ricucite di nascosto.
 *    La differenza fra una fessura e un muro non si indovina dalla distanza: si
 *    guarda che cosa c'e' in mezzo, all'altezza del petto. Se c'e' geometria,
 *    niente ponte — e il motivo finisce negli scartati, non nel silenzio.
 */
export function collegamentiOrizzontali(nav, navMesh, gruppi, geo, opz = {}) {
  const esito = { aggiunti: [], scartati: [], ids: [] };
  if (!nav || !navMesh || !gruppi || gruppi.length < 2) {
    esito.perche = "meno di due isole: non c'e' niente da ricucire";
    return esito;
  }
  if (typeof nav.addOffMeshConnection !== 'function'
      || typeof nav.isOffMeshConnectionConnected !== 'function'
      || !nav.OffMeshConnectionDirection) {
    esito.perche = 'questa navcat non espone i collegamenti fuori-mesh';
    return esito;
  }

  const p = { ...PERSONA, ...(opz.persona || {}) };
  // Oltre questa luce non e' una fessura: e' uno spazio, e se e' vuoto la
  // navmesh lo avrebbe gia' calpestato.
  const luce = opz.fessuraMassimaM != null ? opz.fessuraMassimaM : 1.5;
  const areaMin = opz.isolaDaCucireM2 != null ? opz.isolaDaCucireM2 : ISOLA_UNIONE_M2;
  const raggioAggancio = opz.raggioAggancio || p.raggio * 5;
  const tolleranza = [p.raggio * 5, p.altezza, p.raggio * 5];

  const grandi = (gruppi || [])
    .filter((g) => g && g.area >= areaMin && g.bordo && g.bordo.length && g.ingombro);
  esito.isoleGuardate = grandi.length;
  if (grandi.length < 2) {
    esito.perche = 'una sola isola abbastanza grande: niente da ricucire';
    return esito;
  }

  for (let i = 0; i < grandi.length; i++) {
    for (let k = i + 1; k < grandi.length; k++) {
      const x = grandi[i], y = grandi[k];
      const scarta = (perche, luceMisurata) => esito.scartati.push({
        fra: [Math.round(x.area), Math.round(y.area)], perche,
        luce: luceMisurata != null ? Math.round(luceMisurata * 100) / 100 : null,
      });

      // Due isole a quote diverse sono due piani: le uniscono le rampe (§6-bis),
      // non un ponte in piano.
      if (Math.abs(x.quotaMedia - y.quotaMedia) > p.gradino) continue;

      const dx = Math.max(0, x.ingombro.min[0] - y.ingombro.max[0], y.ingombro.min[0] - x.ingombro.max[0]);
      const dz = Math.max(0, x.ingombro.min[2] - y.ingombro.max[2], y.ingombro.min[2] - x.ingombro.max[2]);
      if (Math.hypot(dx, dz) > luce) continue;

      // Lungo tutto il bordo, non in un punto solo: una parete ha le sue
      // aperture, e ognuna e' un passaggio (vedi `fessureFra`). Al piu'
      // APERTURE_PER_COPPIA ponti fra due isole, distanti almeno 2 m.
      const fessure = fessureFra(x, y, luce, 1).slice(0, FESSURE_DA_PROVARE);
      if (!fessure.length) continue;
      let presi = [], primoNo = null;
      for (const f of fessure) {
        if (presi.length >= APERTURE_PER_COPPIA) break;
        if (presi.some((q) => Math.hypot(q[0] - f.da[0], q[2] - f.da[2]) < 2)) continue;

        if (muroInMezzo(geo, f.da, f.a, opz)) {
          primoNo = primoNo || { perche: "c'e' un muro in mezzo: separate davvero", luce: f.luce };
          continue;
        }

        const qb = sulCammino(nav, navMesh, f.da, tolleranza);
        const qa = sulCammino(nav, navMesh, f.a, tolleranza);
        if (!qb.ok || !qa.ok) {
          primoNo = primoNo || { perche: 'un capo non tocca nessuna superficie camminabile', luce: f.luce };
          continue;
        }

        let id = null;
        try {
          const r = nav.addOffMeshConnection(navMesh, {
            start: qb.punto, end: qa.punto, radius: raggioAggancio,
            direction: nav.OffMeshConnectionDirection.BIDIRECTIONAL,
            flags: opz.flagsCollegamento != null ? opz.flagsCollegamento : 1,
            area: opz.areaCollegamento != null ? opz.areaCollegamento : 0,
          });
          id = (r && typeof r === 'object') ? (r.id != null ? r.id : r.offMeshConnectionId) : r;
        } catch (e) {
          primoNo = primoNo || { perche: 'navcat ha rifiutato il collegamento (' + ((e && e.message) || e) + ')', luce: f.luce };
          continue;
        }
        if (id == null || !nav.isOffMeshConnectionConnected(navMesh, id)) {
          if (id != null && typeof nav.removeOffMeshConnection === 'function') {
            try { nav.removeOffMeshConnection(navMesh, id); } catch (e2) {}
          }
          primoNo = primoNo || { perche: 'dichiarato ma non agganciato alla navmesh', luce: f.luce };
          continue;
        }
        esito.ids.push(id);
        esito.aggiunti.push({
          id, da: qb.punto, a: qa.punto,
          luce: Math.round(f.luce * 100) / 100,
          aree: [Math.round(x.area), Math.round(y.area)],
          quota: Math.round(((x.quotaMedia + y.quotaMedia) / 2) * 100) / 100,
        });
        presi.push(f.da);
      }
      // Nessuna apertura trovata: si dice perche', col motivo del punto piu'
      // stretto, come prima. Un muro vero resta un muro.
      if (!presi.length && primoNo) scarta(primoNo.perche, primoNo.luce);
    }
  }
  return esito;
}

// ---------------------------------------------------------------------------
// 6-ter. I PASSAGGI VISTI DALL'OCCHIO — la rete continua (17/10/2026)
// ---------------------------------------------------------------------------
//
// Raffaella, 17/10, strada approvata: «una rete continua di dove si cammina,
// collegando i pezzi SOLO dove l'occhio vede un passaggio — porta, pontile,
// scala, scala mobile — e la geometria lo conferma». E §0.9: deve valere per
// ogni modello. Qui non c'e' nessun nome di mesh, nessuna coordinata, nessuna
// soglia scelta sull'aeroporto: le parole vengono dall'occhio («passa», cioe'
// POSTURA_DI e PASSO_DI di veritas_riconosce.js), le misure dalla PERSONA.
//
// Misurato il 17/10 sull'aeroporto (prima di scrivere): 30 pezzi; i due pontili
// fuori dalla mappa perche' il loro soffitto sta a 1,65 m dal pavimento (il
// modello e' stilizzato: §0.2); le scale mobili collegate dalla sola geometria,
// e l'occhio non le aveva mai guardate.
//
//   passaggiVisti         le cose che l'occhio ha chiamato «si passa», credibili
//   soffittiNeiPassaggi   nel passaggio visto il tetto non toglie il pavimento
//   confermatoDallOcchio  la rampa proposta dalla geometria e' coperta da un passaggio visto?
//   collegamentiDallOcchio due pezzi che toccano lo stesso passaggio visto si
//                         collegano ATTRAVERSO di esso, se la geometria conferma
//   partiCollegate        quante parti restano, contando ogni collegamento

const PASSA = (o) => !!o && (o.postura === 'passa' || o.passo === 'varco');

/** L'occhio ha gia' parlato? Senza la sua testimonianza non si collega niente. */
export function occhioHaParlato(opz = {}) {
  if (opz.passaggi) return true;
  if (opz.coseNominate || opz.vistoNelMondo) return true;
  if (typeof window === 'undefined') return false;
  return Array.isArray(window.__veritasCoseNominate) || (window.__veritasVistoNelMondo || []).length > 0;
}

/**
 * Le cose che l'occhio ha chiamato «si passa», con il loro ingombro nel mondo.
 * Credibili come in `marcaDallOcchio` e in «a terra»: il lato corto in pianta
 * non supera LATO_MASSIMO_ATERRA_M (un riquadro grande come una sala chiamato
 * «pontile» non e' un passaggio, e' una zona).
 */
export function passaggiVisti(opz = {}) {
  if (opz.passaggi) return opz.passaggi;
  const W = typeof window !== 'undefined' ? window : {};
  const cose = opz.coseNominate || W.__veritasCoseNominate || [];
  const viste = opz.vistoNelMondo || W.__veritasVistoNelMondo || [];
  const p = { ...PERSONA, ...(opz.persona || {}) };
  const corto = (min, max) => Math.min(max[0] - min[0], max[2] - min[2]);
  const fuori = [];
  for (const c of cose) {
    if (!PASSA(c) || !c.min || !c.max || corto(c.min, c.max) > LATO_MASSIMO_ATERRA_M) continue;
    fuori.push({ min: c.min.slice(), max: c.max.slice(), termine: c.termine || null, nome: c.nome || null, da: 'regia' });
  }
  for (const o of viste) {
    if (!PASSA(o) || !o.mondo || !o.mondo.min || !o.mondo.max) continue;
    const min = o.mondo.min.slice(), max = o.mondo.max.slice();
    if (corto(min, max) > LATO_MASSIMO_ATERRA_M) continue;
    if (o.da !== 'prospettiva') {      // la pianta non ha quota: vale quella del suo piano
      if (typeof o.quotaPiano !== 'number') continue;
      min[1] = o.quotaPiano - p.gradino; max[1] = o.quotaPiano + p.altezza;
    }
    fuori.push({ min, max, termine: o.termine || null, nome: o.nome || null, da: o.da || 'occhio' });
  }
  return fuori;
}

/**
 * NEL PASSAGGIO VISTO IL SOFFITTO NON TOGLIE IL PAVIMENTO.
 *
 * Il pontile di questo aeroporto ha 1,65 m fra pavimento e tetto: la persona
 * (1,75) non ci sta, e la mappa lo cancellava. E' il §0.2 — il modello e'
 * stilizzato, non e' vero che non ci si passa — e il §0.4: la geometria e' un
 * parere secondario, non un veto. Dove l'occhio ha visto «si passa» E la
 * geometria trova sotto il centro del passaggio il suo pavimento piano (pezzi
 * alti al piu' un gradino, alla quota piu' bassa del passaggio), i pezzi che
 * stanno TUTTI sopra quel pavimento piu' un gradino — tetto, travi, luci — non
 * entrano nella mappa. Le pareti toccano il pavimento e restano: si cammina
 * dentro il passaggio, non fuori.
 * ⚠️ Una scala o una scala mobile non hanno un pavimento piano sotto il centro:
 *    qui non si tocca niente, i loro gradini restano.
 * @returns {Set<THREE.Object3D>} le mesh da lasciare fuori
 */
export function soffittiNeiPassaggi(THREE, radice, opz = {}) {
  const tolti = new Set();
  if (!THREE || !radice || opz.soffittiNeiPassaggi === false || !occhioHaParlato(opz)) return tolti;
  const passaggi = passaggiVisti(opz);
  if (!passaggi.length) return tolti;
  const p = { ...PERSONA, ...(opz.persona || {}) };
  const pezzi = [], b = new THREE.Box3();
  radice.traverse((o) => {
    if (!o.isMesh || !o.geometry || o.isInstancedMesh || o.visible === false) return;
    if (o.userData && (o.userData.__veritasHelper || o.userData.__veritasAgent)) return;
    b.setFromObject(o);
    if (!b.isEmpty()) pezzi.push({ o, min: b.min.toArray(), max: b.max.toArray() });
  });
  const M = 0.5;   // la tolleranza dei riquadri visti, la stessa di «a terra»
  const scatolaDi = new Map(pezzi.map((q) => [q.o, q]));
  // IL PAVIMENTO DEL PASSAGGIO: un raggio dal centro del riquadro verso il basso
  // deve incontrare una superficie rivolta in su' alla quota piu' bassa del
  // passaggio (entro un gradino). Non si giudica dall'ingombro dei pezzi:
  // misurato sul pontile, il pavimento e' fatto di lastre INCLINATE (il tubo
  // scende di 20 cm verso il terminal), piu' alte di un gradino nel loro
  // ingombro. Su una scala il raggio cade su un gradino a meta' salita: niente.
  const rc = new THREE.Raycaster(), giu = new THREE.Vector3(0, -1, 0), nn = new THREE.Vector3(), mn = new THREE.Matrix3();
  const pavimentoDi = (P) => {
    const cx = (P.min[0] + P.max[0]) / 2, cz = (P.min[2] + P.max[2]) / 2;
    const sotto = pezzi.filter((q) => q.min[0] <= cx && q.max[0] >= cx && q.min[2] <= cz && q.max[2] >= cz).map((q) => q.o);
    // 17/10/2026 sera: il raggio parte da SOPRA il riquadro, cosi' una rampa che
    // sale dentro il passaggio si incontra sempre prima del pavimento di sotto
    // (partendo a una statura dal fondo, a meta' di una scala mobile alta si
    // passava sotto il nastro e si trovava il piano terra).
    rc.set(new THREE.Vector3(cx, Math.max(P.min[1] + p.altezza, P.max[1] + p.gradino), cz), giu);
    rc.far = Math.max(p.altezza, P.max[1] - P.min[1]) + 2 * p.gradino;
    // ⚠️ E SOPRA QUEL PAVIMENTO DEVE ESSERCI SPAZIO: si sta DENTRO il passaggio.
    //    Un oggetto pieno chiamato «pontile» per sbaglio (misurato: totem e
    //    colonne dell'atrio) ha sopra il pavimento la sua faccia di sotto, a zero
    //    centimetri: non e' un passaggio in cui si cammina, e non si tocca. Lo
    //    spazio minimo e' mezza persona: sotto, non ci si sta nemmeno chinati.
    let sopra = null;
    for (const h of rc.intersectObjects(sotto, false)) {
      if (!h.face) continue;
      // la normale della faccia e' gia' quella vera (anche su un pezzo specchiato):
      // si porta nel mondo con la matrice delle normali
      nn.copy(h.face.normal).applyMatrix3(mn.getNormalMatrix(h.object.matrixWorld)).normalize();
      const verticale = Math.abs(nn.y) < Math.cos(p.pendenzaMax * Math.PI / 180);
      // il raggio scende da sopra: conta l'inclinazione della faccia, non il
      // verso in cui e' stata disegnata (i modelli veri hanno facce rovesciate)
      if (!verticale && h.point.y >= P.min[1] - p.gradino && h.point.y <= P.min[1] + p.gradino)
        return (sopra == null || sopra - h.point.y >= p.altezza / 2) ? h.point.y : null;
      // ⛔ 17/10/2026 sera — UNA RAMPA CHE SALE DAL FONDO DEL PASSAGGIO E' IL SUO
      //    PAVIMENTO, non un tetto. Misurato sulla scala mobile vista come
      //    «passerella»: il raggio cadeva sul nastro a meta' salita, tirava dritto
      //    fino al piano terra SOTTO la scala e prendeva quello per pavimento; poi
      //    toglieva dalla mappa la scala intera, balaustre comprese (e gli arredi
      //    in cima): si camminava sotto e attraverso la scala. Una superficie
      //    calpestabile a meta' altezza, di un pezzo che parte dal fondo del
      //    passaggio, e' una rampa o una scala: qui non si toglie niente (la
      //    salita la dichiara `collegamentiVerticali`).
      if (!verticale) {
        const q = scatolaDi.get(h.object);
        if (q && q.min[1] <= P.min[1] + p.gradino) return null;
      }
      sopra = h.point.y;
    }
    return null;
  };
  const conPavimento = [];
  for (const P of passaggi) { const y = pavimentoDi(P); if (y != null) conPavimento.push({ P, y }); }
  // Un pezzo e' del passaggio se il suo centro in pianta cade in un riquadro col
  // pavimento e lui sta dentro l'altezza del passaggio: cosi' anche una lastra
  // di tetto lunga, a cavallo di due riquadri, esce intera.
  const suoiDi = new Map(conPavimento.map((x) => [x, []]));
  for (const q of pezzi) {
    const cx = (q.min[0] + q.max[0]) / 2, cz = (q.min[2] + q.max[2]) / 2;
    for (const x of conPavimento) {
      const { P, y } = x;
      if (cx < P.min[0] - M || cx > P.max[0] + M || cz < P.min[2] - M || cz > P.max[2] + M) continue;
      // IL CORPO DEL PASSAGGIO SOPRA IL SUO PAVIMENTO: tetto, travi, e anche le
      // pareti. Misurato sul pontile: le pareti sono inclinate verso l'interno, e
      // all'altezza della testa fra l'una e l'altra resta meno di una spalla — il
      // modello e' stilizzato (§0.2). Restano i pezzi che non salgono oltre un
      // gradino sopra il pavimento (il pavimento stesso) e quelli che vengono da
      // sotto (le gambe che lo reggono). Il bordo del pavimento resta un bordo:
      // la mappa finisce dove finisce il pavimento, nessuno cammina nel vuoto.
      if (q.min[1] >= y - p.gradino && q.max[1] > y + p.gradino && q.max[1] <= P.max[1] + M) { suoiDi.get(x).push(q.o); break; }
    }
  }
  // ⛔ 17/10/2026 sera — UN PASSAGGIO E' APERTO AI DUE CAPI. La geometria
  //    sospende la conseguenza «ci si cammina dentro», mai il nome (28/09):
  //    se le pareti del riquadro lo chiudono da TUTTE E DUE le parti lungo il
  //    suo lato lungo, all'altezza del petto, e' una stanza, non un pontile, e
  //    le pareti restano nella mappa. Misurato sull'aeroporto: box di vetro
  //    1,5 x 4,6 m chiamati «pontile d'imbarco», attraversati da chi passava.
  const chiuso = (P, y, suoi) => {
    if (!suoi.length) return false;
    const lx = P.max[0] - P.min[0], lz = P.max[2] - P.min[2];
    // in un riquadro dove una persona non si gira (lato corto sotto quattro
    // raggi) non c'e' ne' un corridoio ne' una stanza da riconoscere
    if (Math.min(lx, lz) < 4 * p.raggio) return false;
    const lungoX = lx >= lz, mezzo = (lungoX ? lx : lz) / 2 + M;
    const o = new THREE.Vector3((P.min[0] + P.max[0]) / 2, y + p.altezza * 0.6, (P.min[2] + P.max[2]) / 2);
    let lati = 0;
    // da dentro si vedono le facce di DIETRO delle pareti: per questo raggio
    // contano tutte e due le facce, poi ogni materiale torna com'era
    const lati0 = [];
    for (const ob of suoi) for (const m of [].concat(ob.material || [])) { lati0.push([m, m.side]); m.side = THREE.DoubleSide; }
    try {
      for (const s of [1, -1]) {
        rc.set(o, new THREE.Vector3(lungoX ? s : 0, 0, lungoX ? 0 : s));
        rc.far = mezzo;
        if (rc.intersectObjects(suoi, false).length) lati++;
      }
    } finally { for (const [m, sd] of lati0) m.side = sd; }
    return lati === 2;
  };
  let stanze = 0;
  const chiusi = [];
  for (const x of conPavimento) {
    const suoi = suoiDi.get(x);
    if (chiuso(x.P, x.y, suoi)) { stanze++; chiusi.push({ min: x.P.min.slice(), max: x.P.max.slice() }); continue; }
    for (const o of suoi) tolti.add(o);
  }
  tolti.stanze = stanze;
  tolti.chiusi = chiusi;
  return tolti;
}

/**
 * La rampa proposta dalla geometria (capi `da`, `a`, larga `larghezza`) passa
 * dentro un passaggio visto? Si guarda la META' CENTRALE della salita, non i
 * capi: accanto al piede di una scala mobile puo' esserci qualunque cosa, e un
 * nome sbagliato su un oggetto vicino non deve confermarla.
 * @returns il passaggio che la conferma, o null
 */
export function confermatoDallOcchio(da, a, larghezza, passaggi, opz = {}) {
  const p = { ...PERSONA, ...(opz.persona || {}) };
  for (const P of passaggi || []) {
    for (let k = 0; k <= 8; k++) {
      const t = 0.25 + 0.5 * k / 8;
      const q = [da[0] + (a[0] - da[0]) * t, da[1] + (a[1] - da[1]) * t, da[2] + (a[2] - da[2]) * t];
      if (q[0] >= P.min[0] - p.raggio && q[0] <= P.max[0] + p.raggio
          && q[2] >= P.min[2] - p.raggio && q[2] <= P.max[2] + p.raggio
          && q[1] >= P.min[1] - p.gradino && q[1] <= P.max[1] + p.gradino) return P;
    }
  }
  return null;
}

/**
 * Fra `a` e `b` c'e' pavimento continuo? Ogni 0,3 m (mezzo corpo) una
 * superficie rivolta in su' deve stare entro un gradino dalla retta fra i due
 * capi. Serve al passaggio visto che prosegue oltre il riquadro dell'occhio
 * (il tratto finale di un pontile che l'occhio non ha inquadrato): si va avanti
 * solo finche' c'e' il pavimento, che e' geometria, non una distanza scelta.
 */
export function pavimentoContinuo(geo, a, b, opz = {}) {
  if (!geo || !geo.positions || !geo.indices) return false;
  const p = { ...PERSONA, ...(opz.persona || {}) };
  const P = geo.positions, I = geo.indices;
  const x0 = Math.min(a[0], b[0]) - 0.3, x1 = Math.max(a[0], b[0]) + 0.3;
  const z0 = Math.min(a[2], b[2]) - 0.3, z1 = Math.max(a[2], b[2]) + 0.3;
  const y0 = Math.min(a[1], b[1]) - p.gradino, y1 = Math.max(a[1], b[1]) + p.gradino;
  const cosMax = Math.cos(p.pendenzaMax * Math.PI / 180);
  const tri = [];
  for (let t = 0; t + 2 < I.length; t += 3) {
    const i0 = I[t] * 3, i1 = I[t + 1] * 3, i2 = I[t + 2] * 3;
    if (Math.max(P[i0], P[i1], P[i2]) < x0 || Math.min(P[i0], P[i1], P[i2]) > x1) continue;
    if (Math.max(P[i0 + 2], P[i1 + 2], P[i2 + 2]) < z0 || Math.min(P[i0 + 2], P[i1 + 2], P[i2 + 2]) > z1) continue;
    if (Math.max(P[i0 + 1], P[i1 + 1], P[i2 + 1]) < y0 || Math.min(P[i0 + 1], P[i1 + 1], P[i2 + 1]) > y1) continue;
    const ux = P[i1] - P[i0], uy = P[i1 + 1] - P[i0 + 1], uz = P[i1 + 2] - P[i0 + 2];
    const vx = P[i2] - P[i0], vy = P[i2 + 1] - P[i0 + 1], vz = P[i2 + 2] - P[i0 + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz);
    if (!(l > 0) || ny / l < cosMax) continue;          // non e' un pavimento rivolto in su'
    tri.push(i0, i1, i2);
  }
  const quota = (x, z) => {
    let migliore = null;
    for (let k = 0; k < tri.length; k += 3) {
      const A = tri[k], B = tri[k + 1], C = tri[k + 2];
      const d = (P[B + 2] - P[C + 2]) * (P[A] - P[C]) + (P[C] - P[B]) * (P[A + 2] - P[C + 2]);
      if (Math.abs(d) < 1e-12) continue;
      const l1 = ((P[B + 2] - P[C + 2]) * (x - P[C]) + (P[C] - P[B]) * (z - P[C + 2])) / d;
      const l2 = ((P[C + 2] - P[A + 2]) * (x - P[C]) + (P[A] - P[C]) * (z - P[C + 2])) / d;
      const l3 = 1 - l1 - l2;
      if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
      const y = l1 * P[A + 1] + l2 * P[B + 1] + l3 * P[C + 1];
      if (migliore == null || y > migliore) migliore = y;
    }
    return migliore;
  };
  const lung = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const n = Math.max(1, Math.ceil(lung / 0.3));
  for (let s = 0; s <= n; s++) {
    const t = s / n, x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t, y = a[1] + (b[1] - a[1]) * t;
    const q = quota(x, z);
    if (q == null || Math.abs(q - y) > p.gradino) return false;
  }
  return true;
}

/** I riquadri che si toccano (entro `margine`) sono un passaggio solo: i pezzi di un pontile. */
export function catenePassaggi(passaggi, margine) {
  const n = (passaggi || []).length, padre = [];
  for (let i = 0; i < n; i++) padre.push(i);
  const rad = (i) => (padre[i] === i ? i : (padre[i] = rad(padre[i])));
  const toccano = (a, b) => [0, 1, 2].every((k) => a.min[k] <= b.max[k] + margine && b.min[k] <= a.max[k] + margine);
  for (let i = 0; i < n; i++) for (let k = i + 1; k < n; k++)
    if (toccano(passaggi[i], passaggi[k])) padre[rad(i)] = rad(k);
  const m = new Map();
  for (let i = 0; i < n; i++) { const r = rad(i); if (!m.has(r)) m.set(r, []); m.get(r).push(passaggi[i]); }
  return [...m.values()];
}

/**
 * DUE PEZZI CHE TOCCANO LO STESSO PASSAGGIO VISTO SI COLLEGANO ATTRAVERSO DI ESSO.
 *
 * Vede l'occhio («si passa»), conferma la geometria:
 *   - i due capi stanno sul pavimento (bordo di due isole, dentro il passaggio);
 *   - il tratto fra i capi resta DENTRO il passaggio (si passa da li', non accanto);
 *   - la pendenza e' quella di una persona (PERSONA.pendenzaMax);
 *   - all'altezza del petto non c'e' un muro che non sia del passaggio stesso.
 * Un passaggio che tocca un pezzo solo non collega niente: e' un accesso (dove
 * si arriva da fuori della rete), e lo si restituisce in `catene` per le missioni.
 */
export function collegamentiDallOcchio(nav, navMesh, gruppi, geo, passaggi, opz = {}) {
  const esito = { aggiunti: [], scartati: [], ids: [], catene: [] };
  // 17/10/2026 sera — una stanza chiusa ai due capi che l'occhio ha chiamato
  // passaggio (`soffittiNeiPassaggi`) non collega niente: le sue pareti restano.
  const chiusi = (geo && geo.chiusi) || [];
  const uguale = (u, v) => u.every((x, k) => x === v[k]);
  if (passaggi && chiusi.length) passaggi = passaggi.filter((P) => !chiusi.some((c) => uguale(c.min, P.min) && uguale(c.max, P.max)));
  if (!passaggi || !passaggi.length) { esito.perche = "l'occhio non ha visto nessun passaggio"; return esito; }
  if (!nav || !navMesh || typeof nav.addOffMeshConnection !== 'function'
      || typeof nav.isOffMeshConnectionConnected !== 'function' || !nav.OffMeshConnectionDirection) {
    esito.perche = 'questa navcat non espone i collegamenti fuori-mesh';
    return esito;
  }
  const p = { ...PERSONA, ...(opz.persona || {}) };
  const portata = opz.raggioAggancio || p.raggio * 5;
  const tolleranza = [p.raggio * 5, p.altezza, p.raggio * 5];
  const pendenzaMax = Math.tan(p.pendenzaMax * Math.PI / 180);
  const nella = (q, cat, m) => cat.some((P) => q[0] >= P.min[0] - m && q[0] <= P.max[0] + m
    && q[2] >= P.min[2] - m && q[2] <= P.max[2] + m && q[1] >= P.min[1] - p.gradino && q[1] <= P.max[1] + p.gradino);
  const suo = (cat) => {
    const den = (x, y, z) => cat.some((P) => x >= P.min[0] - 0.05 && x <= P.max[0] + 0.05
      && y >= P.min[1] - 0.05 && y <= P.max[1] + 0.05 && z >= P.min[2] - 0.05 && z <= P.max[2] + 0.05);
    return (ax, ay, az, bx, by, bz, cx, cy, cz) => den(ax, ay, az) && den(bx, by, bz) && den(cx, cy, cz);
  };
  for (const cat of catenePassaggi(passaggi, p.raggio)) {
    const nome = cat[0].nome || cat[0].termine || 'passaggio';
    // I capi possibili: i punti di bordo delle isole dentro il passaggio, e il
    // pavimento subito fuori da ogni lato di ogni riquadro (e sotto il suo
    // centro). I punti di bordo da soli sono radi — uno per lato di poligono — e
    // davanti a una porta stretta puo' non cadercene nessuno (misurato al banco).
    const perIsola = new Map();
    const metti = (gi, q) => { if (gi < 0) return; if (!perIsola.has(gi)) perIsola.set(gi, []); perIsola.get(gi).push(q); };
    (gruppi || []).forEach((g, gi) => {
      if (!g || !g.bordo) return;
      for (const q of g.bordo) if (nella(q, cat, portata)) metti(gi, q);
    });
    // Le isole OLTRE il riquadro, ma entro la misura del passaggio stesso (la sua
    // diagonale in pianta): il passaggio visto puo' proseguire sul suo pavimento
    // fino a loro — lo si accetta solo col pavimento continuo (`pavimentoContinuo`).
    const cmin = [0, 1, 2].map((k) => Math.min(...cat.map((P) => P.min[k])));
    const cmax = [0, 1, 2].map((k) => Math.max(...cat.map((P) => P.max[k])));
    const misura = Math.hypot(cmax[0] - cmin[0], cmax[2] - cmin[2]);
    const lontane = new Map();
    (gruppi || []).forEach((g, gi) => {
      if (!g || !g.bordo || perIsola.has(gi)) return;
      const punti = g.bordo.filter((q) => q[0] >= cmin[0] - misura && q[0] <= cmax[0] + misura
        && q[2] >= cmin[2] - misura && q[2] <= cmax[2] + misura
        && q[1] >= cmin[1] - p.gradino && q[1] <= cmax[1] + p.gradino);
      if (punti.length) lontane.set(gi, punti);
    });
    const isolaDi = (q) => {
      let quale = -1, dmin = Infinity;
      (gruppi || []).forEach((g, gi) => {
        const I = g && g.ingombro;
        if (!I || q[0] < I.min[0] - 0.2 || q[0] > I.max[0] + 0.2 || q[2] < I.min[2] - 0.2 || q[2] > I.max[2] + 0.2
            || q[1] < I.min[1] - p.gradino || q[1] > I.max[1] + p.gradino) return;
        for (const b of g.bordo || []) {
          const d = Math.hypot(b[0] - q[0], b[2] - q[2]) + Math.abs(b[1] - q[1]);
          if (d < dmin) { dmin = d; quale = gi; }
        }
      });
      return quale;
    };
    const fuoriDi = p.raggio * 2;
    for (const P of cat) {
      const c = [(P.min[0] + P.max[0]) / 2, P.min[1], (P.min[2] + P.max[2]) / 2];
      for (const q of [c, [P.min[0] - fuoriDi, c[1], c[2]], [P.max[0] + fuoriDi, c[1], c[2]],
                       [c[0], c[1], P.min[2] - fuoriDi], [c[0], c[1], P.max[2] + fuoriDi]]) {
        const s = sulCammino(nav, navMesh, q, [fuoriDi, p.altezza, fuoriDi]);
        if (s.ok) metti(isolaDi(s.punto), s.punto);
      }
    }
    const tocchi = [...perIsola.entries()].map(([gi, punti]) => ({ gi, punti }));
    const ci = esito.catene.length;
    esito.catene.push({ nome, termine: cat[0].termine || null, riquadri: cat.length, isole: tocchi.map((t) => t.gi),
      punti: tocchi.flatMap((t) => t.punti.map((q) => ({ punto: q, isola: t.gi }))),
      min: [0, 1, 2].map((k) => Math.min(...cat.map((P) => P.min[k]))),
      max: [0, 1, 2].map((k) => Math.max(...cat.map((P) => P.max[k]))) });
    const lontaneL = [...lontane.entries()].map(([gi, punti]) => ({ gi, punti, lontana: true }));
    const coppieIsole = [];
    for (let i = 0; i < tocchi.length; i++) {
      for (let k = i + 1; k < tocchi.length; k++) coppieIsole.push([tocchi[i], tocchi[k]]);
      for (const L of lontaneL) coppieIsole.push([tocchi[i], L]);
    }
    for (const [A, B] of coppieIsole) {
      // Prima i tratti il cui punto di mezzo sta DENTRO il riquadro visto: e' li'
      // che l'occhio ha visto il passaggio (la porta, non il muro accanto).
      const coppie = [];
      for (const a of A.punti) for (const b of B.punti)
        coppie.push({ a, b, d: Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]),
          fuori: nella([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], cat, 0) ? 0 : 1 });
      coppie.sort((u, v) => u.fuori - v.fuori || u.d - v.d);
      let fatto = false, primoNo = null;
      const provati = [];
      for (const c of coppie) {
        if (fatto || provati.length >= 12) break;
        if (provati.some((q) => Math.hypot(q[0] - c.a[0], q[2] - c.a[2]) < p.raggio * 2)) continue;
        provati.push(c.a);
        const dxz = Math.hypot(c.b[0] - c.a[0], c.b[2] - c.a[2]), dy = Math.abs(c.b[1] - c.a[1]);
        // ⚠️ SOLO IN PIANO (misurato il 17/10: un box di vetro che l'occhio aveva
        //    chiamato «pontile» faceva da scala fra i due piani). Fra due quote la
        //    salita la deve dare la geometria — una rampa vista (`collegamentiVerticali`).
        if (dy > p.gradino) { primoNo = primoNo || "fra due quote: la salita la da' solo una rampa vista"; continue; }
        let fuori = false;
        for (let s = 1; s < 8 && !fuori; s++) {
          const t = s / 8;
          if (!nella([c.a[0] + (c.b[0] - c.a[0]) * t, c.a[1] + (c.b[1] - c.a[1]) * t, c.a[2] + (c.b[2] - c.a[2]) * t], cat, portata)) fuori = true;
        }
        if (fuori && !B.lontana) { primoNo = primoNo || 'il tratto uscirebbe dal passaggio'; continue; }
        if (B.lontana && !pavimentoContinuo(geo, c.a, c.b, opz)) { primoNo = primoNo || 'oltre il riquadro il pavimento non continua'; continue; }
        if (muroInMezzo(geo, c.a, c.b, { ...opz, ignora: suo(cat) })) { primoNo = primoNo || "c'e' un muro fuori dal passaggio"; continue; }
        const qa = sulCammino(nav, navMesh, c.a, tolleranza), qb = sulCammino(nav, navMesh, c.b, tolleranza);
        if (!qa.ok || !qb.ok) { primoNo = primoNo || 'un capo non tocca nessuna superficie camminabile'; continue; }
        let id = null;
        try {
          const r = nav.addOffMeshConnection(navMesh, {
            start: qa.punto, end: qb.punto, radius: portata,
            direction: nav.OffMeshConnectionDirection.BIDIRECTIONAL,
            flags: opz.flagsCollegamento != null ? opz.flagsCollegamento : 1,
            area: opz.areaCollegamento != null ? opz.areaCollegamento : 0,
          });
          id = (r && typeof r === 'object') ? (r.id != null ? r.id : r.offMeshConnectionId) : r;
        } catch (e) { primoNo = primoNo || 'navcat ha rifiutato il collegamento'; continue; }
        if (id == null || !nav.isOffMeshConnectionConnected(navMesh, id)) {
          if (id != null && typeof nav.removeOffMeshConnection === 'function') { try { nav.removeOffMeshConnection(navMesh, id); } catch (e) {} }
          primoNo = primoNo || 'dichiarato ma non agganciato alla navmesh';
          continue;
        }
        esito.ids.push(id);
        esito.aggiunti.push({ id, nome, catena: ci, termine: cat[0].termine || null, da: qa.punto, a: qb.punto,
          lunghezza: Math.round(dxz * 100) / 100, dislivello: Math.round(dy * 100) / 100, isole: [A.gi, B.gi] });
        fatto = true;
      }
      if (!fatto) esito.scartati.push({ nome, isole: [A.gi, B.gi], perche: primoNo || 'nessuna coppia di capi' });
    }
  }
  return esito;
}

/**
 * Quante parti restano, contando OGNI collegamento dichiarato (rampe viste,
 * cuciture, passaggi visti). `isole` da sola non li vede: conta solo i
 * poligoni che si toccano. Un capo appartiene all'isola che lo contiene in
 * pianta alla sua quota.
 */
export function partiCollegate(r) {
  const g = (r && r.isole) || [];
  const padre = g.map((_, i) => i);
  const rad = (i) => (padre[i] === i ? i : (padre[i] = rad(padre[i])));
  const di = (q) => {
    let meglio = -1, d = Infinity;
    g.forEach((x, i) => {
      const fuori = Math.max(0, x.ingombro.min[0] - q[0], q[0] - x.ingombro.max[0])
        + Math.max(0, x.ingombro.min[2] - q[2], q[2] - x.ingombro.max[2]);
      const dy = q[1] < x.ingombro.min[1] - 0.5 || q[1] > x.ingombro.max[1] + 0.5 ? 9 : 0;
      const dd = fuori + dy;
      if (dd < d && x.bordo && x.bordo.some((b) => Math.hypot(b[0] - q[0], b[2] - q[2]) < 1.5 && Math.abs(b[1] - q[1]) < 1)) { d = dd; meglio = i; }
    });
    if (meglio < 0) g.forEach((x, i) => {
      if (q[0] >= x.ingombro.min[0] && q[0] <= x.ingombro.max[0] && q[2] >= x.ingombro.min[2] && q[2] <= x.ingombro.max[2]
          && q[1] >= x.ingombro.min[1] - 0.5 && q[1] <= x.ingombro.max[1] + 0.5 && meglio < 0) meglio = i;
    });
    return meglio;
  };
  const tutti = [].concat(((r && r.collegamenti) || {}).aggiunti || [], ((r && r.cuciture) || {}).aggiunti || [],
    ((r && r.passaggi) || {}).aggiunti || []);
  for (const c of tutti) {
    const a = di(c.da), b = di(c.a);
    if (a >= 0 && b >= 0) padre[rad(a)] = rad(b);
  }
  const m = new Map();
  g.forEach((x, i) => { const k = rad(i); if (!m.has(k)) m.set(k, { isole: [], area: 0 }); const v = m.get(k); v.isole.push(i); v.area += x.area; });
  return [...m.values()].sort((a, b) => b.area - a.area);
}

/** La rete in una riga, per la console e per il velo. */
export function raccontaRete(r) {
  if (!r || !r.isole) return 'nessuna mappa';
  const parti = r.parti || partiCollegate(r);
  const totale = r.isole.reduce((s, x) => s + x.area, 0);
  const col = (r.collegamenti || {}), pas = (r.passaggi || {}), cuc = (r.cuciture || {});
  const attesa = (col.candidati || []).length;
  return r.isole.length + ' pezzi di pavimento, ' + parti.length + ' parti collegate (la piu\' grande '
    + Math.round(parti.length ? parti[0].area : 0) + ' m² su ' + Math.round(totale) + '); collegamenti: '
    + (col.aggiunti || []).length + ' fra piani visti dall\'occhio, '
    + (pas.aggiunti || []).length + ' attraverso passaggi visti, '
    + (cuc.aggiunti || []).length + ' cuciture'
    + (r.geometria && r.geometria.stanze ? '; ' + r.geometria.stanze + ' stanze chiuse chiamate «passaggio»: pareti tenute' : '')
    + (attesa ? '; ' + attesa + ' rampe proposte dalla geometria ' + (occhioHaParlato() ? 'che l\'occhio non ha confermato' : 'in attesa dell\'occhio') : '');
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
  r.geometria = { triangoli: geo.triangoli, mesh: geo.mesh, ingombro: geo.ingombro, segnaletica: geo.segnaletica || 0, tolte: geo.tolte || [] };
  r.isole = isole(r.navMesh);

  // I livelli e le rampe che li uniscono (§6-bis). Senza questo passo i piani
  // restano isole, e le tappe del piano di sopra vengono riportate a terra.
  // Dentro un try: un modello senza rampe, o una navcat piu' vecchia, devono
  // dare la navmesh di prima, non un errore.
  // 17/10/2026 — la testimonianza dell'occhio, letta UNA volta per costruzione.
  const occhio = occhioHaParlato(opz);
  const passaggi = occhio ? passaggiVisti(opz) : [];
  r.geometria.soffitti = geo.soffitti || 0;
  r.geometria.stanze = geo.stanze || 0;
  if (opz.collegaLivelli !== false) {
    try {
      r.livelli = livelli(r.isole, opz);
      r.collegamenti = collegamentiVerticali(
        lib.nav, r.navMesh, superficiInclinate(THREE, radice, opz), r.livelli,
        { ...opz, soloOcchio: opz.soloOcchio !== false, passaggi, occhioHaParlato: occhio });
    } catch (e) {
      r.livelli = r.livelli || [];
      r.collegamenti = { aggiunti: [], scartati: [], ids: [], livelli: r.livelli,
                         perche: 'errore nei collegamenti verticali: ' + ((e && e.message) || e) };
    }
  }

  // E le fessure in piano: il pavimento arriva sempre a piastre, e dove due
  // piastre non si toccano si dichiara il ponte invece di pretenderle attaccate.
  // Mai attraverso un muro: quello resta una separazione vera.
  if (opz.cuciFessure !== false) {
    try {
      r.cuciture = collegamentiOrizzontali(lib.nav, r.navMesh, r.isole, geo, opz);
      if (r.cuciture.aggiunti.length) r.isole = isole(r.navMesh);
    } catch (e) {
      r.cuciture = { aggiunti: [], scartati: [], ids: [],
                     perche: 'errore nelle cuciture in piano: ' + ((e && e.message) || e) };
    }
  }

  // E i passaggi visti dall'occhio (17/10/2026): due pezzi che toccano lo
  // stesso passaggio si collegano attraverso di esso, se la geometria conferma.
  if (opz.passaggiVisti !== false) {
    try {
      r.passaggi = collegamentiDallOcchio(lib.nav, r.navMesh, r.isole, geo, passaggi, opz);
    } catch (e) {
      r.passaggi = { aggiunti: [], scartati: [], ids: [], catene: [],
                     perche: 'errore nei passaggi visti: ' + ((e && e.message) || e) };
    }
    r.passaggi.occhio = occhio;
  }
  try { r.parti = partiCollegate(r); } catch (e) { r.parti = null; }
  return { ok: true, ...r };
}

/** La navmesh corrente, o `null` se non c'e'. */
export function stato() { return ULTIMA; }

/**
 * Un filtro di navigazione DERIVATO dal default, con un costo diverso.
 *
 * Chi puo' passare e chi no resta quello di sempre (`passFilter`, ereditato
 * intatto): questo filtro non chiude e non apre nessun varco, cambia solo
 * QUANTO CONVIENE un tratto rispetto a un altro. Serve a chi, fuori da questo
 * modulo, sa leggere un indizio che la navmesh non conosce — una freccia
 * dipinta, un profilo di persona — e vuole che il cammino lo preferisca senza
 * mai vietare le alternative.
 *
 * `null` se la libreria non e' ancora caricata: chi chiama allora non passa
 * nessun filtro custom, e il comportamento resta quello di sempre.
 */
export function filtroCosto(getCost) {
  if (!LIB || !LIB.nav) return null;
  return { ...LIB.nav.DEFAULT_QUERY_FILTER, getCost };
}

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
    + raccontaCuciture(r)
    + raccontaLivelli(r);
}

/** Le fessure ricucite, e i muri che NON si sono scavalcati. Si dicono tutti e
 *  due: un ponte taciuto e' un percorso che nessuno sa spiegare, e un muro
 *  taciuto e' un edificio che sembra piu' comodo di quello che e'. */
export function raccontaCuciture(r) {
  const c = (r && r.cuciture) || null;
  if (!c || (!c.aggiunti.length && !c.scartati.length)) return '';
  const muri = c.scartati.filter((s) => s.perche.indexOf('muro') >= 0).length;
  const parti = [];
  if (c.aggiunti.length) {
    const larga = Math.max(...c.aggiunti.map((a) => a.luce));
    parti.push('ho ricucito ' + c.aggiunti.length
      + (c.aggiunti.length === 1 ? ' fessura' : ' fessure')
      + ' fra pezzi di pavimento che il modello non fa toccare (la piu larga '
      + larga.toFixed(2) + ' m)');
  }
  if (muri) parti.push(muri + (muri === 1 ? ' passaggio e rimasto chiuso' : ' passaggi sono rimasti chiusi')
    + ': in mezzo c e un muro, e quella e una separazione vera');
  return parti.length ? ' ' + parti.join('; ') + '.' : '';
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
  collegamentiOrizzontali, passaggiVisti, occhioHaParlato, soffittiNeiPassaggi, confermatoDallOcchio,
  catenePassaggi, collegamentiDallOcchio, partiCollegate, raccontaRete, pavimentoContinuo,
  libreria, costruisciDaScena, stato, percorsoCorrente, sulCamminoCorrente, filtroCosto,
  gruppiCollegati, catenaCamminabile, raccontaCammino, raccontaLivelli, raccontaCuciture,
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
        console.log('[VERITAS rete] ' + raccontaRete(r));
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
  // 17/10/2026 — QUANDO LA REGIA FINISCE l'occhio ha guardato anche i
  // collegamenti che la geometria proponeva (le fermate dei collegamenti,
  // veritas_regia.js): la mappa si rifa' UNA volta con la sua testimonianza, e
  // le tappe si riappoggiano. Il giro di comprensione la rifara' ancora
  // (veritas_comando.js), con le cose posate nel mondo.
  try {
    window.addEventListener('veritas:regia', function (ev) {
      const d = ev && ev.detail;
      if (!d || d.fase !== 'fine' || !window.THREE || !window.__veritasModelRoot) return;
      costruisciDaScena(window.THREE, window.__veritasModelRoot).then(function (r) {
        window.__veritasNavmeshEsito = r;
        if (!r || !r.ok) return;
        console.log('[VERITAS rete] dopo la regia: ' + raccontaRete(r));
        if (typeof window.__veritasZoneSulCammino === 'function') {
          try { window.__veritasZoneSulCammino(); } catch (e) {}
        }
      });
    });
  } catch (e) {}
  console.log('[VERITAS cammino] pronto (navcat) — window.__veritasNavmesh');
}
