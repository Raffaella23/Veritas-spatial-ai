// Prove della geometria della pianta.   node veritas_vista.test.mjs
//
// Provano la parte pura: inquadratura, conversione pixel<->mondo, area.
// La resa vera richiede un renderer e si prova in browser (banco/vista.mjs).
// Qui si verifica che le coordinate non mentano: se pixel e metri non
// corrispondono, ogni misura a valle e' sbagliata di un fattore e nessuno se
// ne accorge.

import { inquadratura, pixelAMondo, mondoAPixel, areaPixel,
         distanzaPerInquadrare, grappoliDaInquadrare } from "./veritas_vista.js";

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

console.log("\n=== mettere a fuoco ===");
// Misurato sul banco di prova il 05/09/2026: col modello intero (147 x 15 x 82 m)
// nel riquadro la telecamera sta a 136 m e da SEI pixel al metro, e a sei pixel
// al metro una seduta larga 55 cm e' tre pixel. Queste prove tengono ferma la
// promessa che avvicinandosi il numero cambia davvero.
const pxAlMetro = (dim, lato = 768, fov = 50) =>
  lato / (2 * distanzaPerInquadrare(dim, fov) * Math.tan(fov * Math.PI / 360));

const intero = [147, 15, 82];
const grappolo = [10, 3, 10];
ok(distanzaPerInquadrare(intero) > distanzaPerInquadrare(grappolo),
   "una scatola piu' grande si guarda da piu' lontano");
ok(pxAlMetro(grappolo) > 4 * pxAlMetro(intero),
   `un grappolo di 10 m e' almeno quattro volte piu' fitto del modello intero`
   + `  (${pxAlMetro(intero).toFixed(1)} -> ${pxAlMetro(grappolo).toFixed(1)} px/m)`);
ok(0.55 * pxAlMetro(grappolo) > 20,
   `su un grappolo una seduta da 55 cm supera i 20 pixel`
   + `  (${(0.55 * pxAlMetro(grappolo)).toFixed(0)} px)`);
ok(0.55 * pxAlMetro(intero) < 6,
   `mentre sul modello intero resta sotto i 6, ed e' il difetto misurato`
   + `  (${(0.55 * pxAlMetro(intero)).toFixed(1)} px)`);
ok(distanzaPerInquadrare([0, 0, 0]) >= 0.5, "una scatola nulla non manda la telecamera dentro il modello");

console.log("\n=== i grappoli di arredo ===");
// due file di sedute vicine e una lontana: due grappoli, non tre e non uno.
const cosa = (x, z, l, q, forma) => ({
  centro: [x, 1, z], quante: q, forma,
  ingombro: { min: [x - l / 2, 0, z - l / 2], max: [x + l / 2, 2, z + l / 2] },
});
const posti = [{ cose: [
  cosa(0, 0, 3, 18, "seduta"),
  cosa(4, 0, 3, 20, "seduta"),
  cosa(60, 0, 3, 6, "seduta"),
  cosa(0, 2, 1, 2, "banco"),
] }];
const g = grappoliDaInquadrare(posti);
ok(g.length === 2, `due grappoli, non quattro: quello che sta insieme si guarda insieme  (${g.length})`);
ok(g[0].pezzi === 40, `nel primo ci sono tutti e 40 i pezzi vicini  (${g[0].pezzi})`);
ok(g[0].max[0] - g[0].min[0] < 20, "e il primo grappolo resta piccolo, se no non serviva avvicinarsi");
ok(/seduta/.test(g[0].etichetta), `l'etichetta dice cosa c'e' dentro  (${g[0].etichetta})`);

// ⚠️ un ingombro grande NON e' un arredo: e' l'ambiente che lo contiene, e
//    avvicinarsi a quello riporterebbe l'inquadratura da dove si era partiti.
const conAmbiente = [{ cose: [cosa(0, 0, 3, 18, "seduta"), cosa(0, 0, 60, 1, "volume")] }];
ok(grappoliDaInquadrare(conAmbiente).every((x) => x.max[0] - x.min[0] < 30),
   "il volume da 60 m viene scartato: non e' un arredo");
ok(grappoliDaInquadrare([]).length === 0, "senza arredi non ci si avvicina a niente");
ok(grappoliDaInquadrare([{ cose: [] }]).length === 0, "e nemmeno con un posto vuoto");

// il tetto al numero di primi piani: il costo cresce coi grappoli, non con gli arredi
const tanti = [{ cose: Array.from({ length: 40 }, (_, k) => cosa(k * 30, 0, 2, 4, "seduta")) }];
ok(grappoliDaInquadrare(tanti).length === 6, `di tanti grappoli se ne guardano sei  (${grappoliDaInquadrare(tanti).length})`);
ok(grappoliDaInquadrare(tanti, { quanti: 3 }).length === 3, "e il tetto si puo' cambiare");

console.log(`\n${fatte - rotte}/${fatte} verifiche passate`);
process.exit(rotte ? 1 : 0);
