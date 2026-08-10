// ============================================================
// VERITAS -- Perception Layer
//
// FASE A -- Percezione dello spazio: cosa e' visibile da dove.
//   Costruisce un campo di altezze degli occlusori (muri, pareti, banchi,
//   arredi) e risponde a domande di visibilita': linea di vista fra due
//   punti, isovista di un punto, visibilita' fra le zone rilevate.
//
// FASE B -- Percezione degli agenti: cosa vede un singolo agente.
//   Interroga la Fase A con i parametri percettivi del suo archetipo
//   (Agent Skin): campo visivo, portata, ALTEZZA OCCHIO.
//
// Perche' un campo di altezze e non una griglia booleana: un bancone alto
// 1.10m non occlude chi sta in piedi (occhio ~1.65m) ma occlude chi e' in
// sedia a rotelle (occhio ~1.20m). Con una griglia booleana quella
// differenza non e' rappresentabile, e l'analisi di accessibilita' -- che
// per CONTEXT.md appartiene al Core -- diventerebbe finta.
//
// Riuso, non reinvenzione: le zone e la nuvola di punti navigabili
// arrivano dalla pipeline gia' provata (window.__veritasAutoZones /
// __veritasAutoPoints, prodotti da structuralAnalysisFromPoints). Qui si
// aggiunge solo cio' che quella pipeline scarta per costruzione: la
// geometria VERTICALE. extractNavigablePoints tiene i punti con normale
// verso l'alto (ny > 0.75) perche' cerca il pavimento; gli occlusori sono
// esattamente il complemento e non esistono da nessuna parte nel sistema.
// ============================================================

import * as THREE from "three";

// Stessa lista del blocco boot: superfici di scala territoriale che non
// fanno parte dell'ambiente navigabile interno.
const EXCLUDE_KEYWORDS = [
  "runway", "taxiway", "pista", "piazzale", "apron", "tarmac", "road",
  "strada", "terreno", "ground", "asphalt", "asfalto", "parcheggio_auto",
  "landscape", "terrain",
];

const CELL = 0.4;            // lato cella della griglia, metri
const MAX_GRID_CELLS = 900000;
const HORIZONTAL_NORMAL_MAX = 0.5;  // |ny| sotto questa soglia => superficie verticale
const OCCLUDER_MIN_H = 0.25; // sotto questa quota sul pavimento non occlude nessuno
const OCCLUDER_MAX_H = 2.6;  // sopra la testa: soffitti e travi non occludono la vista orizzontale
const ISOVIST_RAYS = 72;     // un raggio ogni 5 gradi
const ISOVIST_MAX_RANGE = 60;
const SPLAT_MIN_OPACITY = 0.25;

// Altezza occhio per archetipo (Agent Skin). I nomi combaciano con
// ARCHETYPES del blocco boot -- lo skin aggiunge la percezione, non
// riscrive il movimento (design_brief §3: Agent Core != Agent Skin).
const PERCEPTION_PROFILES = {
  business:   { eyeHeight: 1.65, fovDeg: 100, range: 25, label: "Business" },
  family:     { eyeHeight: 1.55, fovDeg: 120, range: 18, label: "Famiglia" },
  elderly:    { eyeHeight: 1.58, fovDeg: 100, range: 14, label: "Anziano" },
  wheelchair: { eyeHeight: 1.20, fovDeg: 120, range: 18, label: "Sedia a rotelle" },
  tourist:    { eyeHeight: 1.65, fovDeg: 140, range: 30, label: "Turista" },
  senior:     { eyeHeight: 1.58, fovDeg: 100, range: 14, label: "Senior" },
  student:    { eyeHeight: 1.70, fovDeg: 130, range: 28, label: "Studente" },
  crew:       { eyeHeight: 1.70, fovDeg: 110, range: 30, label: "Staff" },
  vip:        { eyeHeight: 1.68, fovDeg: 110, range: 25, label: "VIP" },
  child:      { eyeHeight: 1.05, fovDeg: 120, range: 15, label: "Bambino" },
};
const DEFAULT_PROFILE = "business";

let grid = null;   // { minX, minZ, nx, nz, heights: Float32Array, floorY, source, occluderCount }

// ---------------------------------------------------------------
// Estrazione occlusori
// ---------------------------------------------------------------

// Dalla mesh: vertici su superfici VERTICALI (normale quasi orizzontale).
// Se la geometria non ha normali si tengono tutti i vertici -- la fascia
// di quota piu' avanti scarta comunque pavimento e soffitto, quindi il
// caso senza normali degrada in modo sicuro invece di perdere i muri.
function occludersFromMesh(root) {
  root.updateMatrixWorld(true);
  const out = [];
  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const nm = new THREE.Matrix3();
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.geometry) return;
    const name = (obj.name || "").toLowerCase();
    if (EXCLUDE_KEYWORDS.some((kw) => name.includes(kw))) return;
    const geo = obj.geometry;
    const pa = geo.attributes && geo.attributes.position;
    if (!pa || !pa.count) return;
    const na = geo.attributes && geo.attributes.normal;
    const stride = Math.max(1, Math.floor(pa.count / 1200));
    nm.getNormalMatrix(obj.matrixWorld);
    for (let i = 0; i < pa.count; i += stride) {
      if (na) {
        n.set(na.getX(i), na.getY(i), na.getZ(i)).applyMatrix3(nm).normalize();
        if (Math.abs(n.y) > HORIZONTAL_NORMAL_MAX) continue;
      }
      v.set(pa.getX(i), pa.getY(i), pa.getZ(i)).applyMatrix4(obj.matrixWorld);
      out.push([v.x, v.y, v.z, 0]);
    }
  });
  return out;
}

function findSplatMesh(root) {
  let found = null;
  root.traverse((o) => { if (!found && o.packedSplats) found = o; });
  return found;
}

// Dallo splat: ogni gaussiana e' un ellissoide, non un punto. Si tiene il
// centro E il raggio (semiasse maggiore), cosi' una gaussiana larga occlude
// un'area invece di una sola cella -- e' il passaggio da "soli centri" a
// "ellissoidi come ostacoli" previsto come Fase B dello splat.
function occludersFromSplat(root) {
  const mesh = findSplatMesh(root);
  if (!mesh) return [];
  mesh.updateMatrixWorld(true);
  const packed = mesh.packedSplats;
  const total = packed ? packed.numSplats : 0;
  if (!total) return [];
  const stride = Math.max(1, Math.floor(total / 60000));
  const out = [];
  const v = new THREE.Vector3();
  // Il raggio e' un semiasse locale: va portato in scala mondo, altrimenti
  // su uno splat non unitario le gaussiane occluderebbero l'area sbagliata.
  const worldScale = new THREE.Vector3();
  mesh.getWorldScale(worldScale);
  const scaleFactor = Math.max(worldScale.x, worldScale.y, worldScale.z) || 1;
  for (let i = 0; i < total; i += stride) {
    let s;
    try { s = packed.getSplat(i); } catch (e) { continue; }
    if (!s || s.opacity < SPLAT_MIN_OPACITY) continue;
    v.copy(s.center);
    mesh.localToWorld(v);
    let r = 0;
    const sc = s.scales;
    if (sc) {
      const sx = sc.x != null ? sc.x : (sc[0] || 0);
      const sy = sc.y != null ? sc.y : (sc[1] || 0);
      const sz = sc.z != null ? sc.z : (sc[2] || 0);
      r = Math.max(sx, sy, sz) * scaleFactor;
    }
    if (!isFinite(r) || r < 0) r = 0;
    out.push([v.x, v.y, v.z, Math.min(r, 2)]);
  }
  return out;
}

// ---------------------------------------------------------------
// Costruzione del campo di altezze
// ---------------------------------------------------------------

function floorReference() {
  const pts = window.__veritasAutoPoints;
  if (pts && pts.length) {
    const ys = pts.map((p) => p[1]).sort((a, b) => a - b);
    return ys[Math.floor(ys.length / 2)];
  }
  return 0;
}

function stamp(heights, nx, nz, cx, cz, h, radiusCells) {
  for (let dz = -radiusCells; dz <= radiusCells; dz++) {
    for (let dx = -radiusCells; dx <= radiusCells; dx++) {
      if (dx * dx + dz * dz > radiusCells * radiusCells) continue;
      const x = cx + dx, z = cz + dz;
      if (x < 0 || z < 0 || x >= nx || z >= nz) continue;
      const idx = z * nx + x;
      if (h > heights[idx]) heights[idx] = h;
    }
  }
}

function buildGrid(occluders, source) {
  if (!occluders.length) return null;
  const floorY = floorReference();

  // Solo cio' che sta nella fascia utile: sopra la caviglia e sotto la
  // testa. Un pavimento non occlude, un soffitto nemmeno.
  const band = [];
  for (const o of occluders) {
    const h = o[1] - floorY;
    if (h >= OCCLUDER_MIN_H && h <= OCCLUDER_MAX_H) band.push([o[0], o[2], h, o[3]]);
  }
  if (band.length < 10) return null;

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  const extend = (x, z) => {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  };
  for (const b of band) extend(b[0], b[1]);
  // La griglia deve coprire anche il calpestabile, non solo i muri:
  // altrimenti un punto navigabile appena fuori bordo non e' interrogabile.
  const nav = window.__veritasAutoPoints;
  if (nav && nav.length) for (const p of nav) extend(p[0], p[2]);

  minX -= CELL * 2; minZ -= CELL * 2; maxX += CELL * 2; maxZ += CELL * 2;
  const nx = Math.max(1, Math.ceil((maxX - minX) / CELL));
  const nz = Math.max(1, Math.ceil((maxZ - minZ) / CELL));
  if (nx * nz > MAX_GRID_CELLS) {
    console.warn("[VERITAS Perception] area troppo estesa per la griglia:", nx, "x", nz);
    return null;
  }

  const heights = new Float32Array(nx * nz);
  for (const b of band) {
    const cx = Math.floor((b[0] - minX) / CELL);
    const cz = Math.floor((b[1] - minZ) / CELL);
    const rc = b[3] > 0 ? Math.min(6, Math.round(b[3] / CELL)) : 0;
    stamp(heights, nx, nz, cx, cz, b[2], rc);
  }

  let occupied = 0;
  for (let i = 0; i < heights.length; i++) if (heights[i] > 0) occupied++;

  return { minX, minZ, nx, nz, heights, floorY, source, occluderCount: band.length, occupied };
}

function cellHeight(g, x, z) {
  if (x < 0 || z < 0 || x >= g.nx || z >= g.nz) return 0;
  return g.heights[z * g.nx + x];
}

// ---------------------------------------------------------------
// Query di visibilita'
// ---------------------------------------------------------------

// Raggio orizzontale all'altezza occhio (isovista 2.5D standard): una cella
// interrompe la vista se il suo occlusore piu' alto arriva all'occhio.
// Le celle dei due estremi sono ignorate, altrimenti un agente appoggiato a
// un muro non vedrebbe nulla.
function losOnGrid(g, ax, az, bx, bz, eyeHeight) {
  let x = Math.floor((ax - g.minX) / CELL);
  let z = Math.floor((az - g.minZ) / CELL);
  const xEnd = Math.floor((bx - g.minX) / CELL);
  const zEnd = Math.floor((bz - g.minZ) / CELL);
  if (x === xEnd && z === zEnd) return true;

  const dx = bx - ax, dz = bz - az;
  const stepX = dx > 0 ? 1 : -1;
  const stepZ = dz > 0 ? 1 : -1;
  const tDeltaX = dx !== 0 ? Math.abs(CELL / dx) : Infinity;
  const tDeltaZ = dz !== 0 ? Math.abs(CELL / dz) : Infinity;
  const nextBoundX = g.minX + (x + (stepX > 0 ? 1 : 0)) * CELL;
  const nextBoundZ = g.minZ + (z + (stepZ > 0 ? 1 : 0)) * CELL;
  let tMaxX = dx !== 0 ? (nextBoundX - ax) / dx : Infinity;
  let tMaxZ = dz !== 0 ? (nextBoundZ - az) / dz : Infinity;

  const guard = g.nx + g.nz + 4;
  for (let i = 0; i < guard; i++) {
    if (tMaxX < tMaxZ) { x += stepX; tMaxX += tDeltaX; }
    else { z += stepZ; tMaxZ += tDeltaZ; }
    if (x === xEnd && z === zEnd) return true;
    if (x < 0 || z < 0 || x >= g.nx || z >= g.nz) return false;
    if (cellHeight(g, x, z) >= eyeHeight) return false;
  }
  return true;
}

// Marcia lungo un raggio finche' non incontra un occlusore alto quanto
// l'occhio; restituisce la distanza percorsa e se si e' fermato per
// occlusione o per fine portata.
function castRay(g, ox, oz, dirX, dirZ, eyeHeight, maxRange) {
  const stepLen = CELL * 0.5;
  const steps = Math.ceil(maxRange / stepLen);
  for (let i = 1; i <= steps; i++) {
    const d = i * stepLen;
    const px = ox + dirX * d, pz = oz + dirZ * d;
    const cx = Math.floor((px - g.minX) / CELL);
    const cz = Math.floor((pz - g.minZ) / CELL);
    if (cx < 0 || cz < 0 || cx >= g.nx || cz >= g.nz) return { dist: d, blocked: false };
    if (cellHeight(g, cx, cz) >= eyeHeight) return { dist: d, blocked: true };
  }
  return { dist: maxRange, blocked: false };
}

function polygonArea(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
  }
  return Math.abs(a / 2);
}

function polygonPerimeter(poly) {
  let p = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    p += Math.hypot(poly[i][0] - poly[j][0], poly[i][1] - poly[j][1]);
  }
  return p;
}

// Isovista: l'insieme dello spazio visibile da un punto (Benedikt 1979).
// Le metriche restituite sono quelle classiche dell'analisi spaziale --
// area, compattezza, occlusivita', deriva -- non indicatori inventati.
function isovist(pos, opts) {
  const g = grid;
  if (!g) return null;
  opts = opts || {};
  const eyeHeight = opts.eyeHeight != null ? opts.eyeHeight : PERCEPTION_PROFILES[DEFAULT_PROFILE].eyeHeight;
  const maxRange = opts.range || ISOVIST_MAX_RANGE;
  const rays = opts.rays || ISOVIST_RAYS;

  const poly = [];
  let blockedRays = 0, sum = 0, min = Infinity, max = 0;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const dx = Math.cos(a), dz = Math.sin(a);
    const r = castRay(g, pos[0], pos[2], dx, dz, eyeHeight, maxRange);
    poly.push([pos[0] + dx * r.dist, pos[2] + dz * r.dist]);
    if (r.blocked) blockedRays++;
    sum += r.dist;
    if (r.dist < min) min = r.dist;
    if (r.dist > max) max = r.dist;
  }

  const area = polygonArea(poly);
  const perimeter = polygonPerimeter(poly);
  let cx = 0, cz = 0;
  for (const p of poly) { cx += p[0]; cz += p[1]; }
  cx /= poly.length; cz /= poly.length;

  return {
    polygon: poly,
    area: +area.toFixed(1),
    perimeter: +perimeter.toFixed(1),
    meanRadius: +(sum / rays).toFixed(2),
    minRadius: +min.toFixed(2),
    maxRadius: +max.toFixed(2),
    // quanto lo spazio e' chiuso: quota di direzioni che incontrano un muro
    occlusivity: +(blockedRays / rays).toFixed(3),
    // 1 = cerchio perfetto (spazio aperto e regolare), verso 0 = frastagliato
    compactness: perimeter > 0 ? +((4 * Math.PI * area) / (perimeter * perimeter)).toFixed(3) : 0,
    // quanto il baricentro del visibile e' spostato: indica una direzione
    // dominante di apertura, cioe' dove lo spazio "spinge" lo sguardo
    drift: +Math.hypot(cx - pos[0], cz - pos[2]).toFixed(2),
    eyeHeight,
  };
}

// ---------------------------------------------------------------
// API pubblica -- Fase A
// ---------------------------------------------------------------

function currentZones() {
  const z = window.__veritasAutoZones;
  return Array.isArray(z) ? z : [];
}

function zoneLabel(i, zone) {
  const nodes = (window.__veritasGetNodes && window.__veritasGetNodes()) || [];
  let best = null, bestD = Infinity;
  for (const n of nodes) {
    if (!n.pos) continue;
    const d = Math.hypot(n.pos[0] - zone.pos[0], n.pos[2] - zone.pos[2]);
    if (d < bestD) { bestD = d; best = n; }
  }
  if (best && bestD < 8) return best.label || best.type || ("Zona " + (i + 1));
  return (zone.role === "corridoio" ? "Corridoio " : "Zona ") + (i + 1);
}

function build(opts) {
  opts = opts || {};
  const root = window.__veritasModelRoot;
  if (!root) return { ok: false, reason: "no_model" };

  const splatRoot = window.__veritasSplatRoot;
  let occluders = [];
  let source = "mesh";
  if (splatRoot && (root === splatRoot || findSplatMesh(root))) {
    occluders = occludersFromSplat(splatRoot);
    source = "splat";
  }
  if (!occluders.length) {
    occluders = occludersFromMesh(root);
    source = "mesh";
  }
  if (!occluders.length) return { ok: false, reason: "no_occluders" };

  grid = buildGrid(occluders, source);
  if (!grid) return { ok: false, reason: "grid_failed" };

  return {
    ok: true,
    source: grid.source,
    occluders: grid.occluderCount,
    cells: grid.nx * grid.nz,
    occupiedCells: grid.occupied,
    gridSize: [grid.nx, grid.nz],
    cellSize: CELL,
    floorY: +grid.floorY.toFixed(2),
  };
}

function ensureGrid() {
  if (grid) return true;
  const r = build();
  return !!(r && r.ok);
}

// Matrice di visibilita' fra zone + individuazione delle zone che non si
// vedono da nessun ingresso. E' la domanda di wayfinding che conta davvero
// nei tre domini: un gate che non si vede, una sala che nessuno trova, una
// zona di mappa fuori da ogni linea di tiro.
function analyzeZoneVisibility(opts) {
  if (!ensureGrid()) return null;
  opts = opts || {};
  const eyeHeight = opts.eyeHeight != null ? opts.eyeHeight : PERCEPTION_PROFILES[DEFAULT_PROFILE].eyeHeight;
  const zones = currentZones();
  if (zones.length < 2) return null;

  const n = zones.length;
  const matrix = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) {
      row.push(i === j ? true : losOnGrid(grid, zones[i].pos[0], zones[i].pos[2], zones[j].pos[0], zones[j].pos[2], eyeHeight));
    }
    matrix.push(row);
  }

  const entrances = [];
  zones.forEach((z, i) => { if (z.isEntranceCandidate) entrances.push(i); });

  const items = zones.map((z, i) => {
    const iso = isovist(z.pos, { eyeHeight, range: opts.range || ISOVIST_MAX_RANGE });
    const seenFrom = matrix.reduce((acc, row, j) => acc + (j !== i && row[i] ? 1 : 0), 0);
    const visibleFromEntrance = entrances.some((e) => e !== i && matrix[e][i]);
    return {
      index: i,
      label: zoneLabel(i, z),
      pos: z.pos,
      role: z.role,
      isEntranceCandidate: !!z.isEntranceCandidate,
      seenFromZones: seenFrom,
      visibleFromEntrance: entrances.length ? visibleFromEntrance : null,
      isovistArea: iso ? iso.area : null,
      occlusivity: iso ? iso.occlusivity : null,
      compactness: iso ? iso.compactness : null,
    };
  });

  const hidden = items.filter((it) => it.visibleFromEntrance === false && !it.isEntranceCandidate);
  const areas = items.map((it) => it.isovistArea).filter((a) => a != null);
  const meanArea = areas.length ? areas.reduce((s, a) => s + a, 0) / areas.length : 0;

  return {
    eyeHeight,
    zones: items,
    matrix,
    entrances: entrances.length,
    hidden: hidden.map((h) => h.label),
    meanIsovistArea: +meanArea.toFixed(1),
    // quota di coppie di zone che si vedono: misura di leggibilita'
    // complessiva dello spazio
    intervisibility: +(matrix.reduce((acc, row, i) => acc + row.filter((v, j) => v && i !== j).length, 0) / Math.max(1, n * (n - 1))).toFixed(3),
    source: grid.source,
  };
}

// Confronto in piedi / seduto sulla stessa geometria: le zone che spariscono
// alla quota occhio piu' bassa sono un problema di accessibilita' reale,
// non un'ipotesi.
function accessibilityComparison(opts) {
  opts = opts || {};
  const standing = analyzeZoneVisibility({ eyeHeight: PERCEPTION_PROFILES.business.eyeHeight, range: opts.range });
  const seated = analyzeZoneVisibility({ eyeHeight: PERCEPTION_PROFILES.wheelchair.eyeHeight, range: opts.range });
  if (!standing || !seated) return null;
  const lost = [];
  standing.zones.forEach((z, i) => {
    const s = seated.zones[i];
    if (!s) return;
    if (z.visibleFromEntrance === true && s.visibleFromEntrance === false) lost.push(z.label);
  });
  const areaDrop = standing.meanIsovistArea > 0
    ? +(((standing.meanIsovistArea - seated.meanIsovistArea) / standing.meanIsovistArea) * 100).toFixed(1)
    : 0;
  return {
    standingEye: standing.eyeHeight,
    seatedEye: seated.eyeHeight,
    meanAreaStanding: standing.meanIsovistArea,
    meanAreaSeated: seated.meanIsovistArea,
    areaDropPct: areaDrop,
    zonesLostFromEntrance: lost,
    intervisibilityStanding: standing.intervisibility,
    intervisibilitySeated: seated.intervisibility,
  };
}

// ---------------------------------------------------------------
// API pubblica -- Fase B: percezione del singolo agente
// ---------------------------------------------------------------

function profileFor(skin) {
  if (!skin) return PERCEPTION_PROFILES[DEFAULT_PROFILE];
  const key = String(skin).toLowerCase();
  return PERCEPTION_PROFILES[key] || PERCEPTION_PROFILES[DEFAULT_PROFILE];
}

function agentPositions() {
  const groups = window.__veritasPassengerGroups;
  if (!groups || typeof groups.forEach !== "function") return [];
  const out = [];
  groups.forEach((entry) => {
    const g = entry && entry.group ? entry.group : entry;
    if (g && g.position && g.visible !== false) out.push([g.position.x, g.position.y, g.position.z]);
  });
  return out;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

// Cosa percepisce un agente in una data posa. Restituisce dati, non
// decisioni: la scelta di cosa farne appartiene al comportamento.
function perceive(pos, heading, skin, opts) {
  if (!ensureGrid()) return null;
  opts = opts || {};
  const prof = profileFor(skin);
  const eyeHeight = opts.eyeHeight != null ? opts.eyeHeight : prof.eyeHeight;
  const range = opts.range != null ? opts.range : prof.range;
  const halfFov = ((opts.fovDeg != null ? opts.fovDeg : prof.fovDeg) * Math.PI) / 180 / 2;
  const hasHeading = typeof heading === "number" && isFinite(heading);

  const inCone = (tx, tz) => {
    const d = Math.hypot(tx - pos[0], tz - pos[2]);
    if (d > range) return { ok: false, d };
    if (hasHeading && angleDiff(Math.atan2(tz - pos[2], tx - pos[0]), heading) > halfFov) return { ok: false, d };
    return { ok: losOnGrid(grid, pos[0], pos[2], tx, tz, eyeHeight), d };
  };

  const visibleZones = [];
  currentZones().forEach((z, i) => {
    const r = inCone(z.pos[0], z.pos[2]);
    if (r.ok) visibleZones.push({ index: i, label: zoneLabel(i, z), distance: +r.d.toFixed(2), pos: z.pos });
  });
  visibleZones.sort((a, b) => a.distance - b.distance);

  let visibleAgents = 0, crowdNear = 0;
  for (const a of agentPositions()) {
    const d = Math.hypot(a[0] - pos[0], a[2] - pos[2]);
    if (d < 0.05) continue;
    if (d <= 2.5) crowdNear++;
    const r = inCone(a[0], a[2]);
    if (r.ok) visibleAgents++;
  }

  const iso = isovist(pos, { eyeHeight, range, rays: 36 });

  return {
    skin: prof.label,
    eyeHeight,
    fovDeg: opts.fovDeg != null ? opts.fovDeg : prof.fovDeg,
    range,
    heading: hasHeading ? +heading.toFixed(3) : null,
    visibleZones,
    nearestVisibleZone: visibleZones.length ? visibleZones[0] : null,
    visibleAgents,
    // densita' locale in persone/m2 nel raggio di contatto (2.5m)
    localDensity: +(crowdNear / (Math.PI * 2.5 * 2.5)).toFixed(3),
    enclosure: iso ? iso.occlusivity : null,
    openness: iso ? iso.area : null,
    isolated: visibleZones.length === 0,
  };
}

// Stesso punto, tutti gli archetipi: mostra che la percezione dipende dallo
// skin e non dal core.
function perceiveAllProfiles(pos, heading) {
  if (!ensureGrid()) return null;
  const out = {};
  Object.keys(PERCEPTION_PROFILES).forEach((k) => {
    const p = perceive(pos, heading, k);
    if (p) out[k] = { label: p.skin, eyeHeight: p.eyeHeight, visibleZones: p.visibleZones.length, openness: p.openness, enclosure: p.enclosure };
  });
  return out;
}

// ---------------------------------------------------------------
// Esposizione sul bridge window.__veritas*
// ---------------------------------------------------------------

window.__veritasPerception = {
  build,
  isovist: (pos, opts) => (ensureGrid() ? isovist(pos, opts) : null),
  hasLineOfSight: (a, b, eyeHeight) =>
    ensureGrid() ? losOnGrid(grid, a[0], a[2], b[0], b[2], eyeHeight != null ? eyeHeight : PERCEPTION_PROFILES[DEFAULT_PROFILE].eyeHeight) : null,
  analyzeZoneVisibility,
  accessibilityComparison,
  perceive,
  perceiveAllProfiles,
  profiles: PERCEPTION_PROFILES,
  isReady: () => !!grid,
  reset: () => { grid = null; },
  stats: () => (grid ? { source: grid.source, cells: grid.nx * grid.nz, occupied: grid.occupied, occluders: grid.occluderCount, floorY: grid.floorY } : null),
};

window.__veritasPerceive = perceive;

// La griglia descrive la geometria caricata: quando cambia il modello va
// ricostruita, altrimenti risponderebbe sulla scena precedente.
(function hookModelReload() {
  const prev = window.__veritasOnModelLoaded;
  window.__veritasOnModelLoaded = function (root) {
    grid = null;
    if (typeof prev === "function") return prev.apply(this, arguments);
  };
})();

console.log("[VERITAS Perception] layer percettivo pronto — window.__veritasPerception");
