// Prove del lettore di segnaletica.   node veritas_segnaletica.test.mjs
//
// Le scene di prova sono costruite con misure DICHIARATE: se il lettore
// risponde qualcosa di diverso, sbaglia lui e si vede subito. Non provano
// soglie tarate su un modello - quelle non ci sono - ma che il meccanismo
// separi il colorato dal neutro, trovi le direzioni giuste e non inventi
// famiglie dove non ce ne sono.

import {
  leggiSegnaletica, leggiSegnaleticaDaPianta, quotaPavimento, tintaSatLum, assePrincipale,
} from "./veritas_segnaletica.js";

let fatte = 0, rotte = 0;
const ok = (c, che) => { fatte++; c ? console.log("  ok   " + che)
  : (rotte++, console.log("  ROTTO " + che)); };
const vicino = (a, b, t, che) => ok(Math.abs(a - b) <= t, `${che}  (${(+a).toFixed(2)})`);

console.log("\n=== tinta, saturazione, luminosita' ===");
vicino(tintaSatLum(1, 0, 0).tinta, 0, 1, "rosso = 0 gradi");
vicino(tintaSatLum(0, 1, 0).tinta, 120, 1, "verde = 120 gradi");
vicino(tintaSatLum(0, 0, 1).tinta, 240, 1, "blu = 240 gradi");
ok(tintaSatLum(0.5, 0.5, 0.5).sat < 0.01, "grigio ha saturazione zero");
ok(tintaSatLum(0.8, 0.1, 0.1).sat > 0.5, "vernice rossa e' satura");

console.log("\n=== quota del pavimento: la moda, non il minimo ===");
const conIntruso = [];
for (let i = 0; i < 200; i++) conIntruso.push([i * 0.1, 0.0, 0]);
conIntruso.push([0, -3.0, 0]);   // un solo punto molto sotto
vicino(quotaPavimento(conIntruso), 0, 0.21,
  "un punto isolato sotto quota NON sposta il pavimento");

console.log("\n=== asse principale ===");
const lungoX = []; for (let i = 0; i < 50; i++) lungoX.push([i * 0.1, 0]);
vicino(assePrincipale(lungoX).angolo, 0, 3, "striscia lungo X = 0 gradi");
ok(assePrincipale(lungoX).allungamento > 5, "striscia e' molto allungata");
const lungoZ = []; for (let i = 0; i < 50; i++) lungoZ.push([0, i * 0.1]);
vicino(assePrincipale(lungoZ).angolo, 90, 3, "striscia lungo Z = 90 gradi");
const diag = []; for (let i = 0; i < 50; i++) diag.push([i * 0.1, i * 0.1]);
vicino(assePrincipale(diag).angolo, 45, 4, "diagonale = 45 gradi");
const tondo = [];
for (let i = 0; i < 40; i++) for (let k = 0; k < 40; k++) tondo.push([i * 0.1, k * 0.1]);
ok(assePrincipale(tondo).allungamento < 1.4, "una macchia quadrata non e' allungata");

// --- una scena: pavimento grigio + tre segnaletiche note ------------------
function scena() {
  const punti = [], colori = [];
  const agg = (x, y, z, r, g, b) => { punti.push([x, y, z]); colori.push(r, g, b); };
  // pavimento grigio 12 x 8, con un po' di variazione come nel reale
  for (let i = 0; i < 120; i++) for (let k = 0; k < 80; k++) {
    const v = 0.52 + ((i * 7 + k * 13) % 9) * 0.005;
    agg(i * 0.1 - 6, 0, k * 0.1 - 4, v, v, v);
  }
  // muri chiari in quota: NON devono finire fra la segnaletica
  for (let i = 0; i < 120; i++) for (let h = 1; h < 20; h++)
    agg(i * 0.1 - 6, h * 0.15, -4, 0.85, 0.82, 0.78);
  // verde lungo X, a quota zero (vernice: nessuno spessore)
  for (let t = 0; t < 60; t++) for (let w = 0; w < 3; w++)
    agg(-5 + t * 0.1, 0.0, -3 + w * 0.05, 0.05, 0.75, 0.15);
  // giallo lungo Z, appoggiato 4 cm sopra (placca modellata)
  for (let t = 0; t < 50; t++) for (let w = 0; w < 3; w++)
    agg(-2 + w * 0.05, 0.04, -3.5 + t * 0.1, 0.90, 0.75, 0.05);
  // rosa in diagonale
  for (let t = 0; t < 50; t++) for (let w = 0; w < 3; w++)
    agg(2 + t * 0.07 + w * 0.05, 0.0, -3.5 + t * 0.07, 0.85, 0.10, 0.45);
  return { punti, colori: new Float32Array(colori) };
}

console.log("\n=== scena completa: tre segnaletiche note su pavimento grigio ===");
const s = scena();
const r = leggiSegnaletica(s.punti, s.colori);
vicino(r.quotaPavimento, 0, 0.21, "pavimento trovato a quota 0");
ok(r.famiglie.length === 3, `trovate esattamente 3 famiglie (trovate ${r.famiglie.length})`);
ok(r.marcati < s.punti.length * 0.10,
   "il grigio del pavimento e il bianco dei muri NON entrano fra i marcati");

const perTinta = (t, tol) => r.famiglie.find((f) => Math.abs(f.tinta - t) < tol);
const verde = perTinta(120, 30), giallo = perTinta(50, 25), rosa = perTinta(330, 30);
ok(!!verde, "famiglia verde riconosciuta");
ok(!!giallo, "famiglia gialla riconosciuta");
ok(!!rosa, "famiglia rosa riconosciuta");
if (verde) vicino(verde.direzione, 0, 8, "il verde corre lungo X");
if (giallo) vicino(giallo.direzione, 90, 8, "il giallo corre lungo Z");
if (rosa) vicino(rosa.direzione, 45, 12, "il rosa corre in diagonale");
if (verde) ok(verde.tipo === "direzionale", "il verde e' direzionale, non areale");
if (giallo) ok(giallo.quota === r.quotaPavimento,
  "la placca a 4 cm sopra viene comunque letta come segnaletica a terra");

console.log("\n=== casi che devono dire di no, non inventare ===");
const soloGrigio = { punti: [], colori: [] };
for (let i = 0; i < 500; i++) { soloGrigio.punti.push([i * 0.05, 0, 0]); soloGrigio.colori.push(0.5, 0.5, 0.5); }
const rg = leggiSegnaletica(soloGrigio.punti, new Float32Array(soloGrigio.colori));
ok(rg.famiglie.length === 0, "pavimento tutto grigio: nessuna famiglia inventata");
ok(!!rg.motivo, "e spiega perche'");
const senza = leggiSegnaletica(s.punti, null);
ok(senza.famiglie.length === 0 && senza.motivo === "nuvola senza colori",
   "senza colori lo dice invece di fingere");
ok(leggiSegnaletica([], new Float32Array(0)).famiglie.length === 0, "nuvola vuota");

console.log("\n=== una segnaletica in quota NON e' segnaletica a terra ===");
const alto = { punti: [...s.punti], colori: [...s.colori] };
for (let t = 0; t < 60; t++) { alto.punti.push([t * 0.1 - 3, 2.4, 0]); alto.colori.push(0.1, 0.4, 0.95); }
const ra = leggiSegnaletica(alto.punti, new Float32Array(alto.colori));
ok(!ra.famiglie.some((f) => Math.abs(f.tinta - 210) < 30),
   "un cartello blu appeso a 2,4 m non viene contato come segnaletica orizzontale");

console.log("\n=== LA STRADA GENERALE: leggere una pianta renderizzata ===");
// Una pianta finta 200x100 px a 5 cm/px = 10 x 5 m. Pavimento grigio, una
// striscia verde lungo X e una gialla lungo Z. Il punto e' che qui il colore
// NON viene da un materiale: viene da pixel, esattamente come se fosse una
// texture, un atlas o una scansione. Il lettore non puo' sapere la differenza.
function piantaFinta() {
  const L = 200, A = 100, px = new Uint8Array(L * A * 4);
  const metti = (x, y, r, g, b, a = 255) => {
    const i = (y * L + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
  };
  for (let y = 0; y < A; y++) for (let x = 0; x < L; x++) metti(x, y, 130, 130, 130);
  for (let x = 20; x < 120; x++) for (let y = 30; y < 34; y++) metti(x, y, 15, 190, 40);
  for (let y = 10; y < 90; y++) for (let x = 150; x < 154; x++) metti(x, y, 230, 190, 15);
  // un angolo senza pavimento: alpha 0, non deve entrare nel conto dell'area
  for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) metti(x, y, 0, 0, 0, 0);
  return { pixel: px, larghezza: L, altezza: A, metriPerPixel: 0.05,
           origine: [0, 0], quotaPavimento: 0 };
}
const pf = piantaFinta();
const rp = leggiSegnaleticaDaPianta(pf);
ok(rp.daPianta === true, "dichiara di venire da una pianta");
ok(rp.famiglie.length === 2, `due famiglie dai PIXEL (trovate ${rp.famiglie.length})`);
const verdeP = rp.famiglie.find((f) => Math.abs(f.tinta - 130) < 35);
const gialloP = rp.famiglie.find((f) => Math.abs(f.tinta - 47) < 25);
ok(!!verdeP, "verde letto dai pixel");
ok(!!gialloP, "giallo letto dai pixel");
if (verdeP) vicino(verdeP.direzione, 0, 5, "il verde corre lungo X");
if (gialloP) vicino(gialloP.direzione, 90, 5, "il giallo corre lungo Z");
if (verdeP) vicino(verdeP.area, 100 * 4 * 0.0025, 0.01,
  "l'area della striscia verde e' una MISURA in m2, non una stima");
vicino(rp.areaPavimento, (200 * 100 - 400) * 0.0025, 0.01,
  "l'area di pavimento esclude i pixel senza nulla");
ok(leggiSegnaleticaDaPianta(null).famiglie.length === 0, "pianta assente: nessuna invenzione");

console.log("\n=== stessa logica di raggruppamento per punti e pixel ===");
ok(typeof rp.famiglie[0].tipo === "string" && typeof r.famiglie[0].tipo === "string",
   "entrambe le strade producono la stessa forma di risultato");

console.log(`\n${fatte - rotte}/${fatte} verifiche passate`);
process.exit(rotte ? 1 : 0);
