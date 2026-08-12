// Prova del riconoscimento della segnaletica orizzontale.
//     node veritas_segnaletica.test.mjs
//
// I modelli reali hanno strisce, frecce e aree di attesa modellate come mesh
// separate appoggiate qualche centimetro sopra il pavimento. Sono orizzontali
// e rivolte verso l'alto: passavano ogni filtro e definivano una quota
// propria, e le zone si posavano sopra la segnaletica invece che a terra.
//
// Il riconoscimento e' geometrico, non per nome: un elenco di parole sarebbe
// la stessa trappola gia' pagata con i pannelli cercati per testo italiano.
// Le prove qui sotto usano infatti nomi anonimi (Object_412, Mesh_77).
//
// La regola non viene ricopiata: si estrae da index.html cosi' com'e'.
import fs from 'node:fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const i0 = html.indexOf("    // Segnaletica orizzontale: e' pavimento, non un piano a se'.");
const i1 = html.indexOf('    let points = [];\n    for (const m of filtered) points = points.concat(m.pts);');
if (i0 < 0 || i1 < 0 || i1 <= i0) {
  console.error('Ancore non trovate in index.html: la regola e stata spostata o rinominata.');
  process.exit(2);
}
const corpo = html.slice(i0, i1);
// overlapRatio e' definita a monte nella funzione vera: qui si fornisce la stessa.
const prologo = `
const overlapRatio = (box, other) => {
  if (!other) return 0;
  const w = Math.max(0, Math.min(box[1], other[1]) - Math.max(box[0], other[0]));
  const d = Math.max(0, Math.min(box[3], other[3]) - Math.max(box[2], other[2]));
  const area = (box[1]-box[0]) * (box[3]-box[2]);
  return area > 0 ? (w*d)/area : 0;
};
`;
const run = new Function('filtered', 'console', prologo + corpo + '\nreturn { decalTrovati, decalArea };');

const mesh = (nome, y0, y1, x0, x1, z0, z1) => ({
  nome, yMin: y0, yMax: y1, box: [x0, x1, z0, z1],
  footprint: (x1-x0)*(z1-z0), pts: [[ (x0+x1)/2, y1, (z0+z1)/2 ]],
});
let ko = 0;
const check = (n, ok, d='') => { console.log((ok?'  ok  ':' FAIL ')+n+(d?'   '+d:'')); if(!ok) ko++; };

// Scena: pavimento 30x30, segnaletica a +2cm, un podio a +25cm, un bancone
const pavimento = mesh('pavimento', 0, 0, 0, 30, 0, 30);
const striscia  = mesh('Object_412', 0.02, 0.02, 5, 15, 8, 10);   // segnaletica
const freccia   = mesh('Mesh_77',    0.02, 0.02, 18, 20, 12, 14); // segnaletica
const podio     = mesh('podio',      0.25, 0.25, 2, 6, 2, 6);     // vero rialzo
const bancone   = mesh('bancone',    1.10, 1.10, 22, 26, 4, 8);   // arredo
const mezzanino = mesh('mezzanino',  4.50, 4.50, 0, 20, 0, 20);   // piano sopra
const scena = [pavimento, striscia, freccia, podio, bancone, mezzanino];
const r = run(scena, { log: () => {} });

check('riconosce le due mesh di segnaletica', r.decalTrovati === 2, r.decalTrovati + ' trovate');
check('la striscia scende a quota pavimento', striscia.pts[0][1] === 0, striscia.pts[0][1] + 'm');
check('la freccia scende a quota pavimento', freccia.pts[0][1] === 0, freccia.pts[0][1] + 'm');
check('il podio a +25cm NON e segnaletica', podio.pts[0][1] === 0.25, podio.pts[0][1] + 'm');
check('il bancone a 1.10m resta dov e', bancone.pts[0][1] === 1.10, bancone.pts[0][1] + 'm');
check('il mezzanino resta un piano', mezzanino.pts[0][1] === 4.50, mezzanino.pts[0][1] + 'm');
check('il pavimento non tocca se stesso', pavimento.pts[0][1] === 0);

// La segnaletica NON deve sparire: e' area calpestabile, solo alla quota giusta
check('l area della segnaletica e conservata', striscia.pts.length === 1 && freccia.pts.length === 1);

// Caso limite: placca piatta ma NON sopra nulla (isola sospesa) -> non toccata
const sospesa = mesh('sospesa', 2.0, 2.0, 40, 42, 40, 42);
const r2 = run([pavimento, sospesa], { log: () => {} });
check('placca isolata in aria non viene abbassata', r2.decalTrovati === 0 && sospesa.pts[0][1] === 2.0, sospesa.pts[0][1]+'m');

// Caso limite: placca grande quanto il pavimento -> non e' segnaletica
const lastra = mesh('lastra', 0.02, 0.02, 0, 28, 0, 28);
const p2 = mesh('pav2', 0, 0, 0, 30, 0, 30);
const r3 = run([p2, lastra], { log: () => {} });
check('placca vasta quanto il pavimento non e segnaletica', r3.decalTrovati === 0, r3.decalTrovati+' trovate');

// Su un pavimento non a quota zero
const p3 = mesh('pav3', 3.2, 3.2, 0, 30, 0, 30);
const s3 = mesh('sign3', 3.22, 3.22, 5, 15, 8, 10);
run([p3, s3], { log: () => {} });
check('funziona anche con pavimento a +3.20m', s3.pts[0][1] === 3.2, s3.pts[0][1]+'m');

console.log(ko ? `\n${ko} PROVE FALLITE` : '\ntutte le prove passano');
process.exit(ko?1:0);
