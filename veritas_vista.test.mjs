// Prove della geometria della pianta.   node veritas_vista.test.mjs
//
// Provano la parte pura: inquadratura, conversione pixel<->mondo, area.
// La resa vera richiede un renderer e si prova in browser (banco/vista.mjs).
// Qui si verifica che le coordinate non mentano: se pixel e metri non
// corrispondono, ogni misura a valle e' sbagliata di un fattore e nessuno se
// ne accorge.

import { inquadratura, pixelAMondo, mondoAPixel, areaPixel } from "./veritas_vista.js";

let fatte = 0, rotte = 0;
const ok = (c, che) => { fatte++; c ? console.log("  ok   " + che)
  : (rotte++, console.log("  ROTTO " + che)); };
const vicino = (a, b, t, che) => ok(Math.abs(a - b) <= t, `${che}  (${(+a).toFixed(4)})`);

const sala = { min: [-6, 0, -4], max: [6, 3, 4] };   // 12 x 8 m

console.log("\n=== inquadratura ===");
const i5 = inquadratura(sala, 0.05);
ok(i5.larghezza === 240, `12 m a 5 cm/px = 240 px (${i5.larghezza})`);
ok(i5.altezza === 160, `8 m a 5 cm/px = 160 px (${i5.altezza})`);
vicino(i5.metriPerPixel, 0.05, 1e-9, "passo conservato");
ok(i5.origine[0] === -6 && i5.origine[1] === -4, "origine = angolo minimo del mondo");

console.log("\n=== il tetto allarga il passo, non tronca l'edificio ===");
const enorme = { min: [0, 0, 0], max: [400, 10, 300] };
const ie = inquadratura(enorme, 0.05, 2048);
ok(ie.larghezza <= 2048 && ie.altezza <= 2048, "immagine dentro il tetto");
ok(ie.metriPerPixel > 0.05, `passo allargato (${ie.metriPerPixel.toFixed(4)} m/px)`);
vicino(ie.larghezza * ie.metriPerPixel, 400, 0.5, "copre TUTTA la larghezza, non un pezzo");
vicino(ie.altezza * ie.metriPerPixel, 300, 0.5, "copre TUTTA la profondita'");

console.log("\n=== pixel <-> mondo: andata e ritorno ===");
for (const [x, z] of [[-6, -4], [0, 0], [5.9, 3.9], [-3.3, 2.1]]) {
  const p = mondoAPixel(i5, x, z);
  ok(!!p, `(${x}, ${z}) cade dentro`);
  if (p) {
    const [rx, rz] = pixelAMondo(i5, p[0], p[1]);
    // il ritorno cade nel centro del pixel: scarto al piu' mezzo pixel
    ok(Math.abs(rx - x) <= i5.metriPerPixel && Math.abs(rz - z) <= i5.metriPerPixel,
       `  e torna indietro entro un pixel (${rx.toFixed(3)}, ${rz.toFixed(3)})`);
  }
}

console.log("\n=== fuori campo dice di no ===");
ok(mondoAPixel(i5, -100, 0) === null, "molto a sinistra: null");
ok(mondoAPixel(i5, 0, 500) === null, "molto oltre: null");
ok(mondoAPixel(i5, 6, 0) === null, "il bordo massimo e' escluso, non va in overflow");

console.log("\n=== l'angolo (0,0) e' l'angolo minimo del mondo ===");
const [ax, az] = pixelAMondo(i5, 0, 0);
vicino(ax, -6 + 0.025, 1e-9, "x del primo pixel");
vicino(az, -4 + 0.025, 1e-9, "z del primo pixel");

console.log("\n=== area: i conteggi di pixel diventano metri quadri ===");
vicino(areaPixel(i5), 0.0025, 1e-12, "un pixel da 5 cm vale 0,0025 m2");
vicino(i5.larghezza * i5.altezza * areaPixel(i5), 96, 0.01,
  "240x160 pixel = 96 m2, che e' 12 x 8");

console.log("\n=== casi degeneri ===");
ok(inquadratura({ min: [0, 0, 0], max: [0, 0, 0] }) === null, "ingombro nullo: null");
ok(inquadratura({ min: [0, 0, 0], max: [5, 1, 0] }) === null, "profondita' zero: null");

console.log(`\n${fatte - rotte}/${fatte} verifiche passate`);
process.exit(rotte ? 1 : 0);
