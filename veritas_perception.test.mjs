/**
 * Verifica del Motore di Percezione contro una pianta sintetica di verità nota.
 *
 * Il punto della prova: se dichiaro a un progettista che un corridoio è largo
 * 84 cm, quel numero deve venire da una misura ripetibile. Qui la larghezza
 * reale è nota per costruzione, quindi l'errore è misurabile.
 *
 *   node veritas_perception.test.mjs
 */

import { perceiveLevel, PERCEPTION_DEFAULTS } from './veritas_perception.js';

/**
 * Generatore pseudocasuale con seme (mulberry32).
 * Con Math.random() l'esito cambiava a ogni esecuzione: a ~4 punti per cella la
 * variazione di Poisson lascia qualche cella vuota, e ogni tanto una cadeva
 * proprio all'imbocco del corridoio. Un test instabile vale meno di nessun test.
 */
function makeRng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rnd = makeRng(20260810);

/* ---------- generatore di piante sintetiche ---------- */

/** Campiona uniformemente lo spazio libero di un insieme di rettangoli XZ. */
function samplePlan(rects, step = 0.03, y = 0) {
  const pts = [];
  for (const r of rects) {
    for (let x = r.x0; x <= r.x1; x += step) {
      for (let z = r.z0; z <= r.z1; z += step) {
        // Jitter: il campionamento reale non è mai una griglia perfetta.
        pts.push([x + (rnd() - 0.5) * step * 0.5,
                  y + (rnd() - 0.5) * 0.05,
                  z + (rnd() - 0.5) * step * 0.5]);
      }
    }
  }
  return pts;
}

/** Due ambienti collegati da un corridoio di larghezza esatta `widthM`. */
function twoRoomsWithCorridor(widthM, step = 0.03) {
  const zc = 3.0, half = widthM / 2;
  return samplePlan([
    { x0: 0.0, x1: 6.0,  z0: 0.0,       z1: 6.0 },       // ambiente A
    { x0: 6.0, x1: 9.0,  z0: zc - half, z1: zc + half }, // corridoio
    { x0: 9.0, x1: 15.0, z0: 0.0,       z1: 6.0 },       // ambiente B
  ], step);
}

/* ---------- utilità di stampa ---------- */

let failures = 0;
const check = (label, ok, detail) => {
  console.log(`  ${ok ? '✅' : '❌'} ${label}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
};

/* ---------- 1. precisione della misura ---------- */

console.log('\n═══ 1. Precisione: corridoio di larghezza nota ═══\n');
console.log('  vero (m) | cella (m) | misurato (m) | errore (cm) | celle | ms');
console.log('  ---------|-----------|--------------|-------------|-------|-----');

const TRUTHS = [0.84, 1.10, 1.60];
const CELLS = [0.08, 0.04, 0.02];

for (const truth of TRUTHS) {
  for (const cellSize of CELLS) {
    // La nuvola deve reggere la risoluzione richiesta: campiono a metà cella.
    const points = twoRoomsWithCorridor(truth, cellSize / 2);
    const t0 = Date.now();
    const r = perceiveLevel(points, 0, {
      cellSize,
      // Soglia alzata sopra ogni verità in prova, così la strettoia viene
      // sempre isolata e se ne può leggere la misura.
      minClearance: 1.0,
    });
    const ms = Date.now() - t0;
    const b = r.bottlenecks[0];
    const measured = b ? b.widthM : NaN;
    const errCm = Math.abs(measured - truth) * 100;
    console.log(
      `  ${truth.toFixed(2).padStart(8)} | ${cellSize.toFixed(2).padStart(9)} | ` +
      `${measured.toFixed(3).padStart(12)} | ${errCm.toFixed(1).padStart(11)} | ` +
      `${String(r.grid.w * r.grid.h).padStart(5)} | ${String(ms).padStart(4)}`
    );
    // Tolleranza: due celle. La rasterizzazione non può fare meglio di così.
    check(`  ${truth} m @ cella ${cellSize} m entro 2 celle`,
          errCm <= cellSize * 200,
          `errore ${errCm.toFixed(1)} cm, limite ${(cellSize * 200).toFixed(0)} cm`);
  }
}

/* ---------- 2. la soglia discrimina davvero ---------- */

console.log('\n═══ 2. Discriminazione: passa la carrozzina? ═══\n');
console.log('  Soglia di prova: clearance 0.45 m ⇒ varco di 90 cm');
console.log('  (valore dimostrativo — la soglia normativa la dichiara il domain pack)\n');

for (const truth of [0.75, 0.84, 0.95, 1.20]) {
  const points = twoRoomsWithCorridor(truth);
  const r = perceiveLevel(points, 0, { cellSize: 0.04, minClearance: 0.45 });
  const flagged = r.bottlenecks.length > 0;
  const shouldFlag = truth < 0.90;
  check(`corridoio ${truth.toFixed(2)} m ${shouldFlag ? 'segnalato' : 'non segnalato'}`,
        flagged === shouldFlag,
        flagged ? `misurato ${r.bottlenecks[0].widthM.toFixed(3)} m` : 'nessuna strettoia');
}

/* ---------- 3. segmentazione: quante zone, senza dire k ---------- */

console.log('\n═══ 3. Segmentazione: le zone emergono dai dati ═══\n');

const seg = perceiveLevel(twoRoomsWithCorridor(0.84), 0, { cellSize: 0.04, minZoneArea: 2.0 });
console.log(`  Zone trovate: ${seg.zones.length}  (nessun k fornito in ingresso)`);
for (const z of seg.zones) {
  console.log(`    · ${z.kind.padEnd(9)} area ${String(z.areaM2).padStart(7)} m²  ` +
              `larghezza max ${(z.maxClearanceM * 2).toFixed(2)} m  ` +
              `centro (${z.centroidX.toFixed(1)}, ${z.centroidZ.toFixed(1)})`);
}
check('trova i due ambienti principali', seg.zones.filter(z => z.kind === 'ambiente').length >= 2);
check('area navigabile ≈ 74.5 m² (6×6 + 6×6 + corridoio)',
      Math.abs(seg.navigableAreaM2 - 74.5) < 4,
      `misurata ${seg.navigableAreaM2} m²`);

/* ---------- 4. robustezza ai buchi di campionamento ---------- */

console.log('\n═══ 4. Robustezza: nuvola rada e bucata ═══\n');
console.log('  Un campionamento rado lascia celle vuote in mezzo ad aree percorribili.');
console.log('  Senza chiusura morfologica diventano ostacoli fantasma → strettoie inesistenti.\n');

const sparse = twoRoomsWithCorridor(1.60).filter(() => rnd() > 0.55); // -55% dei punti

const withClose = perceiveLevel(sparse, 0, { cellSize: 0.08, minClearance: 0.45, closeRadius: 2 });
const noClose  = perceiveLevel(sparse, 0, { cellSize: 0.08, minClearance: 0.45, closeRadius: 0 });

console.log(`  senza chiusura : ${noClose.bottlenecks.length} strettoie segnalate`);
console.log(`  con chiusura   : ${withClose.bottlenecks.length} strettoie segnalate`);
check('la chiusura elimina i falsi positivi',
      withClose.bottlenecks.length < noClose.bottlenecks.length,
      `${noClose.bottlenecks.length} → ${withClose.bottlenecks.length}`);
check('nessun falso allarme su un corridoio da 1.60 m',
      withClose.bottlenecks.length === 0);

/* ---------- 5. costo indipendente dalla densità della nuvola ---------- */

console.log('\n═══ 5. Scalabilità: costo legato all\'area, non ai punti ═══\n');
console.log('  Rilevante per il Gaussian Splat: milioni di gaussiane sulla stessa area.\n');
console.log('  punti     | ms');
console.log('  ----------|-----');

for (const step of [0.06, 0.03, 0.015]) {
  const pts = samplePlan([
    { x0: 0, x1: 6, z0: 0, z1: 6 },
    { x0: 6, x1: 9, z0: 2.58, z1: 3.42 },
    { x0: 9, x1: 15, z0: 0, z1: 6 },
  ], step);
  const t0 = Date.now();
  perceiveLevel(pts, 0, { cellSize: 0.04 });
  console.log(`  ${String(pts.length).padStart(9)} | ${String(Date.now() - t0).padStart(4)}`);
}

/* ---------- 6. onestà della risoluzione ---------- */

console.log('\n═══ 6. Onestà: la cella non può essere più fine dei dati ═══\n');

const coarseCloud = twoRoomsWithCorridor(0.84, 0.06);   // nuvola rada
const tooFine = perceiveLevel(coarseCloud, 0, { cellSize: 0.02 });
const honest  = perceiveLevel(coarseCloud, 0, { cellSize: 0.10 });

console.log(`  nuvola con spaziatura stimata ~${tooFine.resolution.pointSpacingM} m`);
console.log(`  cella 0.02 m → ${tooFine.resolution.underSampled ? 'SEGNALATA' : 'accettata'}`);
console.log(`  cella 0.10 m → ${honest.resolution.underSampled ? 'SEGNALATA' : 'accettata'}`);
if (tooFine.resolution.warning) console.log(`\n  ⚠️  ${tooFine.resolution.warning}\n`);

check('rileva la risoluzione insostenibile', tooFine.resolution.underSampled === true);
check('non allarma quando la cella è adeguata', honest.resolution.underSampled === false);
check('stima la spaziatura reale (~0.06 m)',
      Math.abs(tooFine.resolution.pointSpacingM - 0.06) < 0.02,
      `stimata ${tooFine.resolution.pointSpacingM} m`);

/* ---------- esito ---------- */

console.log('\n' + '═'.repeat(60));
if (failures === 0) {
  console.log('✅ Tutte le verifiche superate.');
} else {
  console.log(`❌ ${failures} verifiche fallite.`);
  process.exitCode = 1;
}
console.log('═'.repeat(60) + '\n');
