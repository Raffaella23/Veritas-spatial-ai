/**
 * VERITAS — Motore di Percezione
 * =============================================================================
 * Misura oggettiva dello spazio navigabile a partire da una nuvola di punti.
 *
 * Sostituisce il clustering KMeans nel compito per cui KMeans non è adatto:
 * KMeans cerca grumi attorno a un centroide, ma un corridoio è una striscia
 * sottile e allungata — o viene fuso con la stanza adiacente, o spezzato a caso.
 * Qui la topologia viene dedotta dalla geometria, non indovinata.
 *
 * Pipeline:
 *   1. Griglia di occupazione   punti → celle libere/occupate, per livello
 *   2. Chiusura morfologica     tappa i buchi del campionamento (falsi ostacoli)
 *   3. Feature transform        distanza esatta E identità dell'ostacolo più vicino
 *   4. Asse mediale potato      solo le creste tra ostacoli DISTINTI (vedi §3)
 *   5. Strettoie                minimi di clearance lungo l'asse, sotto soglia
 *   6. Watershed + fusione      zone separate da costrizioni reali, non da rumore
 *
 * La larghezza di un passaggio è  clearance × 2  — una misura, non una stima.
 *
 * NESSUNA dipendenza: né THREE, né il bundle minificato. Opera su array di punti
 * puri, esattamente come il resto della pipeline a valle di extractNavigablePoints
 * (CLAUDE.md §5). Questo lo rende utilizzabile identico per mesh GLB/FBX e per i
 * centri delle gaussiane di uno splat.
 *
 * Costo lineare nel numero di celle, indipendente dal numero di punti in
 * ingresso: una nuvola da 5 milioni di gaussiane costa quanto una da 50.000
 * sulla stessa area. KMeans, al contrario, cresce col numero di punti.
 */

export const PERCEPTION_DEFAULTS = {
  /** Lato della cella in metri. 0.04 = vede una porta, 0.02 = vede uno scalino. */
  cellSize: 0.05,
  /** Banda verticale attorno alla quota del piano (m). */
  floorTolerance: 1.2,
  /** Raggio in celle della chiusura morfologica che tappa i buchi di campionamento. */
  closeRadius: 2,
  /** Sotto questa clearance (m) il passaggio è segnalato. 0.45 m ⇒ varco di 90 cm. */
  minClearance: 0.45,
  /** Area minima assoluta (m²) perché una zona sia tale e non un frammento. */
  minZoneArea: 1.5,
  /**
   * Area minima RELATIVA all'area navigabile totale. Una soglia solo assoluta
   * non regge il cambio di scala: 2 m² sono un ripostiglio in un appartamento
   * e puro rumore in un terminal da 1200 m². Vale la più severa delle due.
   */
  minZoneFraction: 0.01,
  /**
   * Potatura dell'asse mediale, in celle. Una cresta è autentica solo se i suoi
   * vicini "vedono" ostacoli distanti almeno così tanto fra loro: separa i muri
   * opposti di un corridoio dal rumore di rasterizzazione di un muro solo.
   */
  axisPruning: 3,
  /**
   * Angolo minimo (gradi) che i due ostacoli devono sottendere al punto perché
   * sia asse mediale autentico. Un corridoio ha muri opposti (~180°); il
   * vertice convesso di una stanza ha due facce a ~90°. 135° separa i due casi.
   */
  minSeparationDeg: 135,
  /**
   * Due zone adiacenti con un varco più largo di questo (m) non sono separate
   * da nulla di reale: vengono fuse. Una porta o un varco resta una divisione.
   */
  mergeGatewayM: 3.0,
  /** Celle di margine aggiunte attorno ai dati: il bordo deve essere ostacolo. */
  padding: 3,
};

/* ========================================================================== *
 * 1. Griglia di occupazione
 * ========================================================================== */

/**
 * Rasterizza i punti navigabili di un livello in una griglia 2D sul piano XZ.
 * Una cella è LIBERA se contiene almeno un punto campionato.
 */
export function buildOccupancyGrid(points, levelY, opts = {}) {
  const o = { ...PERCEPTION_DEFAULTS, ...opts };
  const flat = points instanceof Float32Array;
  const n = flat ? points.length / 3 : points.length;

  const at = (i) => {
    if (flat) return [points[i * 3], points[i * 3 + 1], points[i * 3 + 2]];
    const p = points[i];
    return Array.isArray(p) ? p : [p.x, p.y, p.z];
  };

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, kept = 0;
  for (let i = 0; i < n; i++) {
    const [x, y, z] = at(i);
    if (Math.abs(y - levelY) > o.floorTolerance) continue;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
    kept++;
  }
  if (kept === 0) return null;

  const pad = o.padding;
  const w = Math.ceil((maxX - minX) / o.cellSize) + 1 + pad * 2;
  const h = Math.ceil((maxZ - minZ) / o.cellSize) + 1 + pad * 2;
  const originX = minX - pad * o.cellSize;
  const originZ = minZ - pad * o.cellSize;

  const free = new Uint8Array(w * h);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = at(i);
    if (Math.abs(y - levelY) > o.floorTolerance) continue;
    const cx = Math.floor((x - originX) / o.cellSize);
    const cz = Math.floor((z - originZ) / o.cellSize);
    if (cx < 0 || cx >= w || cz < 0 || cz >= h) continue;
    free[cz * w + cx] = 1;
  }

  return { w, h, cellSize: o.cellSize, minX: originX, minZ: originZ, free,
           levelY, sampled: kept };
}

/**
 * Chiusura morfologica (dilatazione seguita da erosione), separabile.
 *
 * Serve a un problema molto concreto: il campionamento è discreto, quindi in
 * mezzo a un'area perfettamente percorribile può capitare una cella dove non è
 * atterrato alcun punto. Senza questo passaggio quella cella verrebbe letta come
 * ostacolo, la distance transform ci misurerebbe attorno una clearance
 * bassissima, e il sistema segnalerebbe una strettoia inesistente.
 *
 * È la differenza tra una lettura "precisa e puntuale" e una piena di falsi
 * positivi. Implementata con due passate 1D per asse: O(celle × raggio).
 */
export function closeHoles(grid, radius = PERCEPTION_DEFAULTS.closeRadius) {
  if (radius <= 0) return grid;
  const { w, h } = grid;

  // Dilatazione/erosione separabili: max (o min) su finestra scorrevole 1D.
  const morph1D = (src, wantMax, outsideValue) => {
    const tmp = new Uint8Array(w * h);
    // orizzontale
    for (let z = 0; z < h; z++) {
      const row = z * w;
      for (let x = 0; x < w; x++) {
        let acc = wantMax ? 0 : 1;
        for (let d = -radius; d <= radius; d++) {
          const nx = x + d;
          const v = (nx < 0 || nx >= w) ? outsideValue : src[row + nx];
          acc = wantMax ? Math.max(acc, v) : Math.min(acc, v);
        }
        tmp[row + x] = acc;
      }
    }
    // verticale
    const dst = new Uint8Array(w * h);
    for (let x = 0; x < w; x++) {
      for (let z = 0; z < h; z++) {
        let acc = wantMax ? 0 : 1;
        for (let d = -radius; d <= radius; d++) {
          const nz = z + d;
          const v = (nz < 0 || nz >= h) ? outsideValue : tmp[nz * w + x];
          acc = wantMax ? Math.max(acc, v) : Math.min(acc, v);
        }
        dst[z * w + x] = acc;
      }
    }
    return dst;
  };

  const dilated = morph1D(grid.free, true, 0);  // fuori = occupato
  const closed = morph1D(dilated, false, 0);    // erosione: il bordo resta muro
  return { ...grid, free: closed };
}

/* ========================================================================== *
 * 2. Feature transform euclidea esatta (Felzenszwalb & Huttenlocher, 2012)
 * ========================================================================== */

/** Trasformata 1D con argmin: restituisce distanza quadratica e sorgente. */
function edt1d(f, n, d, arg, v, z) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
    arg[q] = v[k];
  }
}

/**
 * Distanza euclidea ESATTA di ogni cella libera dall'ostacolo più vicino (in
 * metri) E identità di quell'ostacolo.
 *
 * Esatta e non approssimata (chamfer/city-block) di proposito: questo numero è
 * ciò che il prodotto vende. Una larghezza dichiarata a un progettista deve
 * essere ripetibile e difendibile, non "circa".
 *
 * Le coordinate dell'ostacolo più vicino (`featX`/`featZ`) sono ciò che rende
 * possibile potare l'asse mediale — vedi extractMedialAxis.
 *
 * @returns {{dist:Float32Array, featX:Int32Array, featZ:Int32Array}}
 */
export function distanceTransform(grid) {
  const { w, h, free, cellSize } = grid;
  const INF = 1e12;
  const m = Math.max(w, h);
  const f = new Float64Array(m), d = new Float64Array(m);
  const arg = new Int32Array(m), v = new Int32Array(m), z = new Float64Array(m + 1);

  const sq = new Float64Array(w * h);
  const srcZ = new Int32Array(w * h);
  for (let i = 0; i < w * h; i++) sq[i] = free[i] ? INF : 0;

  // Passata sulle colonne: sorgente = riga dell'ostacolo più vicino in colonna.
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = sq[y * w + x];
    edt1d(f, h, d, arg, v, z);
    for (let y = 0; y < h; y++) { sq[y * w + x] = d[y]; srcZ[y * w + x] = arg[y]; }
  }

  // Passata sulle righe: combina, ottenendo la sorgente 2D completa.
  const featX = new Int32Array(w * h);
  const featZ = new Int32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = sq[y * w + x];
    edt1d(f, w, d, arg, v, z);
    for (let x = 0; x < w; x++) {
      sq[y * w + x] = d[x];
      const sx = arg[x];
      featX[y * w + x] = sx;
      featZ[y * w + x] = srcZ[y * w + sx];
    }
  }

  const dist = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) dist[i] = Math.sqrt(sq[i]) * cellSize;
  return { dist, featX, featZ };
}

/* ========================================================================== *
 * 3. Asse mediale potato
 * ========================================================================== */

/**
 * I massimi locali della distance transform sono la mezzeria naturale dei
 * percorsi: dove si cammina davvero.
 *
 * Il criterio ingenuo — "è una cresta se domina i vicini" — non funziona: la
 * rasterizzazione di un muro rettilineo produce microvariazioni che generano
 * creste spurie a una-due celle dal muro, con clearance minuscola. Quelle
 * false strettoie dominano poi qualsiasi classifica per larghezza.
 *
 * Criterio corretto, in due condizioni (feature transform):
 *
 *  a) SEPARAZIONE — esiste un vicino il cui ostacolo più vicino è lontano dal
 *     proprio. Due muri opposti di un corridoio distano quanto il corridoio è
 *     largo; due celle dello stesso muro distano una cella.
 *
 *  b) ANGOLO DI SEPARAZIONE — i due ostacoli devono stare su lati OPPOSTI. In
 *     un corridoio l'angolo che sottendono al centro è ~180°; nel vertice
 *     convesso di una stanza le due facce del muro formano ~90°. Senza questa
 *     seconda condizione ogni angolo di ogni stanza genera una falsa strettoia
 *     con clearance quasi nulla, che poi domina qualunque classifica per
 *     larghezza. Verificato sul campo: quattro falsi allarmi per stanza.
 */
export function extractMedialAxis(grid, ft, opts = {}) {
  const o = { ...PERCEPTION_DEFAULTS, ...opts };
  const { w, h, free } = grid;
  const { dist, featX, featZ } = ft;
  const axis = new Uint8Array(w * h);
  const thr2 = o.axisPruning * o.axisPruning;
  const cosMax = Math.cos(o.minSeparationDeg * Math.PI / 180);

  for (let z = 1; z < h - 1; z++) {
    for (let x = 1; x < w - 1; x++) {
      const i = z * w + x;
      if (!free[i] || dist[i] <= 0) continue;
      const fx = featX[i], fz = featZ[i];
      // Vettore dal punto verso il proprio ostacolo più vicino.
      const ax = fx - x, az = fz - z;
      const la = Math.hypot(ax, az);
      if (la === 0) continue;

      let isAxis = false;
      for (let dz = -1; dz <= 1 && !isAxis; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const ni = (z + dz) * w + (x + dx);
          if (!free[ni]) continue;
          const ddx = featX[ni] - fx, ddz = featZ[ni] - fz;
          if (ddx * ddx + ddz * ddz < thr2) continue;        // (a) separazione
          const bx = featX[ni] - x, bz = featZ[ni] - z;
          const lb = Math.hypot(bx, bz);
          if (lb === 0) continue;
          const cos = (ax * bx + az * bz) / (la * lb);       // (b) angolo
          if (cos <= cosMax) { isAxis = true; break; }
        }
      }
      if (isAxis) axis[i] = 1;
    }
  }
  return axis;
}

/* ========================================================================== *
 * 4. Strettoie
 * ========================================================================== */

/**
 * Le strettoie sono le componenti connesse dell'asse mediale in cui la
 * clearance scende sotto soglia. Ogni componente diventa UN segnale — non
 * cinquanta celle rosse adiacenti — con la sua misura peggiore e la sua
 * posizione nel mondo, pronta da far pulsare sul modello.
 */
export function findBottlenecks(grid, ft, axis, opts = {}) {
  const o = { ...PERCEPTION_DEFAULTS, ...opts };
  const { w, h, cellSize, minX, minZ, levelY } = grid;
  const { dist } = ft;
  const halfCell = cellSize / 2;
  const seen = new Uint8Array(w * h);
  const out = [];

  for (let start = 0; start < w * h; start++) {
    // Il confronto usa la stima CONSERVATIVA: la rasterizzazione dilata lo
    // spazio libero di circa mezza cella per lato, quindi la misura grezza
    // sovrastima la larghezza. Sovrastimare, in analisi di sicurezza, è
    // l'errore che non ci si può permettere.
    if (!axis[start] || seen[start] || dist[start] - halfCell >= o.minClearance) continue;

    const stack = [start];
    seen[start] = 1;
    let sumX = 0, sumZ = 0, cells = 0, worst = Infinity, worstIdx = start;

    while (stack.length) {
      const i = stack.pop();
      const x = i % w, z = (i - x) / w;
      sumX += x; sumZ += z; cells++;
      if (dist[i] < worst) { worst = dist[i]; worstIdx = i; }

      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const nx = x + dx, nz = z + dz;
          if (nx < 0 || nx >= w || nz < 0 || nz >= h) continue;
          const ni = nz * w + nx;
          if (seen[ni] || !axis[ni] || dist[ni] - halfCell >= o.minClearance) continue;
          seen[ni] = 1;
          stack.push(ni);
        }
      }
    }

    // Il punto peggiore è più utile del baricentro: è lì che si va a guardare.
    const wx = worstIdx % w, wz = (worstIdx - wx) / w;
    const widthM = worst * 2;
    out.push({
      worldX: minX + (wx + 0.5) * cellSize,
      worldZ: minZ + (wz + 0.5) * cellSize,
      y: levelY,
      centroidX: minX + (sumX / cells + 0.5) * cellSize,
      centroidZ: minZ + (sumZ / cells + 0.5) * cellSize,
      clearanceM: +worst.toFixed(3),
      widthM: +widthM.toFixed(3),
      /** Incertezza della misura: una cella. La rasterizzazione non fa meglio. */
      uncertaintyM: +cellSize.toFixed(3),
      /** Valore da usare per il giudizio: mai sovrastimare un passaggio. */
      widthConservativeM: +Math.max(0, widthM - cellSize).toFixed(3),
      cells,
      lengthM: +(cells * cellSize).toFixed(2),
    });
  }

  out.sort((a, b) => a.widthM - b.widthM); // il peggiore per primo
  return out;
}

/* ========================================================================== *
 * 5. Segmentazione a watershed, con fusione per varco
 * ========================================================================== */

/**
 * Segmenta lo spazio seguendo la forma reale: i massimi della distance
 * transform sono i cuori delle aree ampie, e la crescita si arresta nei punti
 * stretti — che è dove un progettista traccerebbe il confine.
 *
 * Il numero di zone emerge dai dati: non c'è nessun `k` da indovinare.
 *
 * Due zone vengono poi FUSE se il varco che le separa è più largo di
 * `mergeGatewayM`: senza questo passaggio l'asse mediale di una stanza
 * quadrata (una X) genera quattro sotto-zone d'angolo che non corrispondono a
 * niente di reale.
 *
 * @returns {{labels:Int32Array, zones:Array, gateways:Array}}
 */
export function segmentZones(grid, ft, opts = {}) {
  const o = { ...PERCEPTION_DEFAULTS, ...opts };
  const { w, h, free, cellSize, minX, minZ, levelY } = grid;
  const { dist } = ft;
  const labels = new Int32Array(w * h).fill(-1);

  // Celle libere ordinate dalla più ampia alla più stretta: l'acqua scende.
  const order = [];
  for (let i = 0; i < w * h; i++) if (free[i] && dist[i] > 0) order.push(i);
  order.sort((a, b) => dist[b] - dist[a]);

  // Soglia di frammento: la più severa fra assoluta e proporzionale alla scena.
  const totalAreaM2 = order.length * cellSize * cellSize;
  const minArea = Math.max(o.minZoneArea, totalAreaM2 * o.minZoneFraction);

  // Assegnazione in un'unica passata: quando arrivo a una cella, tutte quelle
  // più ampie sono già etichettate, quindi il vicino "a monte" esiste già.
  let next = 0;
  for (const i of order) {
    const x = i % w, z = (i - x) / w;
    let best = -1, bestD = -1;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = x + dx, nz = z + dz;
        if (nx < 0 || nx >= w || nz < 0 || nz >= h) continue;
        const ni = nz * w + nx;
        if (labels[ni] === -1) continue;
        if (dist[ni] > bestD) { bestD = dist[ni]; best = labels[ni]; }
      }
    }
    labels[i] = best !== -1 ? best : next++;  // nessun vicino a monte ⇒ nuovo massimo
  }

  // Varchi: per ogni coppia adiacente, la clearance massima sul confine comune.
  const gw = new Map();
  const key = (a, b) => (a < b ? a * next + b : b * next + a);
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      const i = z * w + x;
      const A = labels[i];
      if (A === -1) continue;
      for (const [dx, dz] of [[1, 0], [0, 1]]) {
        const nx = x + dx, nz = z + dz;
        if (nx >= w || nz >= h) continue;
        const ni = nz * w + nx;
        const B = labels[ni];
        if (B === -1 || B === A) continue;
        const k = key(A, B);
        const c = Math.min(dist[i], dist[ni]);
        const cur = gw.get(k);
        if (!cur || c > cur.clearance) gw.set(k, { a: A, b: B, clearance: c, idx: i });
      }
    }
  }

  // Union-find: fondi le coppie il cui varco non è una vera costrizione.
  const parent = new Int32Array(next).map((_, i) => i);
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb); };

  const pairs = [...gw.values()].sort((p, q) => q.clearance - p.clearance);
  for (const p of pairs) if (p.clearance * 2 >= o.mergeGatewayM) union(p.a, p.b);

  /*
   * Assorbimento dei frammenti.
   *
   * Il watershed lascia sempre qualche scheggia di pochi metri quadri attorno
   * a pilastri e spigoli: geometricamente sono bacini distinti, ma nessun
   * progettista li chiamerebbe "ambienti". Scartarli soltanto dal report non
   * basta — restano etichette vive e continuano a generare varchi fantasma.
   * Vanno fusi nel vicino con cui comunicano più ampiamente, finché non ne
   * resta nessuno sotto la soglia di area.
   */
  const areaOf = () => {
    const a = new Map();
    const cellA = cellSize * cellSize;
    for (let i = 0; i < w * h; i++) {
      if (labels[i] === -1) continue;
      const R = find(labels[i]);
      a.set(R, (a.get(R) || 0) + cellA);
    }
    return a;
  };
  for (let pass = 0; pass < 6; pass++) {
    const area = areaOf();
    let merged = false;
    for (const p of pairs) {                 // già ordinati per varco decrescente
      const ra = find(p.a), rb = find(p.b);
      if (ra === rb) continue;
      if ((area.get(ra) || 0) < minArea || (area.get(rb) || 0) < minArea) {
        union(ra, rb);
        merged = true;
      }
    }
    if (!merged) break;
  }

  for (let i = 0; i < w * h; i++) if (labels[i] !== -1) labels[i] = find(labels[i]);

  // Statistiche per zona.
  const cellArea = cellSize * cellSize;
  const acc = new Map();
  for (let i = 0; i < w * h; i++) {
    const L = labels[i];
    if (L === -1) continue;
    let a = acc.get(L);
    if (!a) { a = { label: L, cells: 0, sumX: 0, sumZ: 0, maxClearance: 0 }; acc.set(L, a); }
    const x = i % w, z = (i - x) / w;
    a.cells++; a.sumX += x; a.sumZ += z;
    if (dist[i] > a.maxClearance) a.maxClearance = dist[i];
  }

  const zones = [];
  for (const a of acc.values()) {
    const areaM2 = a.cells * cellArea;
    if (areaM2 < minArea) continue;
    zones.push({
      label: a.label,
      areaM2: +areaM2.toFixed(2),
      centroidX: minX + (a.sumX / a.cells + 0.5) * cellSize,
      centroidZ: minZ + (a.sumZ / a.cells + 0.5) * cellSize,
      y: levelY,
      maxClearanceM: +a.maxClearance.toFixed(3),
      // Un'area ampia è un ambiente; una stretta e lunga è un corridoio.
      kind: a.maxClearance * 2 >= 3.0 ? 'ambiente' : 'corridoio',
    });
  }
  zones.sort((a, b) => b.areaM2 - a.areaM2);

  // I varchi sopravvissuti alla fusione sono le connessioni reali fra zone:
  // "il passaggio fra la sala A e la sala B è largo 84 cm".
  const live = [];
  for (const p of pairs) {
    const ra = find(p.a), rb = find(p.b);
    if (ra === rb) continue;
    const x = p.idx % w, z = (p.idx - x) / w;
    live.push({
      from: ra, to: rb,
      clearanceM: +p.clearance.toFixed(3),
      widthM: +(p.clearance * 2).toFixed(3),
      uncertaintyM: +cellSize.toFixed(3),
      widthConservativeM: +Math.max(0, p.clearance * 2 - cellSize).toFixed(3),
      worldX: minX + (x + 0.5) * cellSize,
      worldZ: minZ + (z + 0.5) * cellSize,
      y: levelY,
    });
  }
  live.sort((a, b) => a.widthM - b.widthM);

  return { labels, zones, gateways: live };
}

/* ========================================================================== *
 * 6. Onestà della risoluzione
 * ========================================================================== */

/**
 * Stima la spaziatura tipica fra i punti della nuvola, in metri.
 *
 * Perché è indispensabile: nessuna griglia può essere più fine dei dati che la
 * alimentano. Se si chiede una cella da 2 cm a una nuvola campionata ogni 3 cm,
 * fra un punto e l'altro restano celle vuote che la pipeline legge come muri —
 * e il risultato non è "meno preciso", è **sbagliato**: comparirebbero decine di
 * strettoie inesistenti larghe quanto una cella.
 *
 * Un prodotto che vende misure deve accorgersene e dirlo, non produrre in
 * silenzio un numero che sembra plausibile.
 *
 * Metodo: si rasterizza a grana grossa per stimare l'area realmente coperta,
 * poi spaziatura ≈ √(area / numero di punti).
 */
export function estimatePointSpacing(points, levelY, opts = {}) {
  const o = { ...PERCEPTION_DEFAULTS, ...opts };
  const probe = Math.max(0.2, o.cellSize * 4);
  const g = buildOccupancyGrid(points, levelY, { ...o, cellSize: probe, padding: 1 });
  if (!g) return null;
  let cells = 0;
  for (let i = 0; i < g.free.length; i++) if (g.free[i]) cells++;
  const areaM2 = cells * probe * probe;
  return Math.sqrt(areaM2 / Math.max(1, g.sampled));
}

/* ========================================================================== *
 * 7. Orchestratore
 * ========================================================================== */

/**
 * Percezione completa di un livello.
 * Restituisce SOLO misure oggettive: nessun giudizio, nessuna soglia normativa.
 * Il giudizio è responsabilità del domain pack, che dichiara le proprie soglie.
 */
export function perceiveLevel(points, levelY, opts = {}) {
  const o = { ...PERCEPTION_DEFAULTS, ...opts };

  // La risoluzione richiesta è sostenibile dai dati?
  const spacingM = estimatePointSpacing(points, levelY, o);
  const recommendedCellM = spacingM ? +(spacingM * 1.5).toFixed(3) : null;
  const underSampled = recommendedCellM !== null && o.cellSize < recommendedCellM;
  const resolution = {
    cellSizeM: o.cellSize,
    pointSpacingM: spacingM ? +spacingM.toFixed(4) : null,
    recommendedCellM,
    underSampled,
    warning: underSampled
      ? `Cella di ${o.cellSize} m più fine della nuvola (spaziatura ~${spacingM.toFixed(3)} m). ` +
        `Le misure non sono affidabili: usare almeno ${recommendedCellM} m, oppure una nuvola più densa.`
      : null,
  };

  let grid = buildOccupancyGrid(points, levelY, o);
  if (!grid) return null;
  grid = closeHoles(grid, o.closeRadius);

  const ft = distanceTransform(grid);
  const axis = extractMedialAxis(grid, ft, o);
  const bottlenecks = findBottlenecks(grid, ft, axis, o);
  const { labels, zones, gateways } = segmentZones(grid, ft, o);

  let freeCells = 0, maxClearance = 0;
  for (let i = 0; i < grid.free.length; i++) {
    if (!grid.free[i]) continue;
    freeCells++;
    if (ft.dist[i] > maxClearance) maxClearance = ft.dist[i];
  }

  return {
    levelY,
    grid, dist: ft.dist, axis, labels,
    zones, gateways, bottlenecks,
    resolution,
    navigableAreaM2: +(freeCells * grid.cellSize * grid.cellSize).toFixed(2),
    maxClearanceM: +maxClearance.toFixed(3),
    pointsSampled: grid.sampled,
    cellSize: grid.cellSize,
  };
}

/**
 * Percezione su tutti i livelli rilevati.
 * @param {Array} points         nuvola navigabile (mesh o centri di gaussiane)
 * @param {number[]} floorLevels quote dei piani (da detectFloorLevels)
 */
export function perceive(points, floorLevels = [0], opts = {}) {
  const levels = [];
  for (const y of floorLevels) {
    const r = perceiveLevel(points, y, opts);
    if (r) levels.push(r);
  }
  return {
    levels,
    bottlenecks: levels.flatMap((l, i) => l.bottlenecks.map(b => ({ ...b, floorIdx: i })))
                       .sort((a, b) => a.widthM - b.widthM),
    gateways: levels.flatMap((l, i) => l.gateways.map(g => ({ ...g, floorIdx: i })))
                    .sort((a, b) => a.widthM - b.widthM),
    zones: levels.flatMap((l, i) => l.zones.map(z => ({ ...z, floorIdx: i }))),
    totalNavigableM2: +levels.reduce((s, l) => s + l.navigableAreaM2, 0).toFixed(2),
  };
}
