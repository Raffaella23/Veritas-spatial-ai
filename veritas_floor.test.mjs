// Prova della quota dei piani:  node veritas_floor.test.mjs
//
// Era il difetto che faceva "non trovare la quota" alle zone: dentro una
// fascia di 1.5m ci sta un intero arredamento, e la mediana finiva in mezzo
// agli arredi invece che sul pavimento.
//
// La funzione non viene ricopiata: si estrae da index.html cosi' com'e',
// altrimenti la copia si scollerebbe dall'originale al primo ritocco.
import fs from 'node:fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const i0 = html.indexOf('  const FLOOR_BIN_M');
const i1 = html.indexOf('  let lastNavigablePoints = null;');
if (i0 < 0 || i1 < 0 || i1 <= i0) {
  console.error('Ancore non trovate in index.html: detectFloorLevels e stata spostata o rinominata.');
  process.exit(2);
}
const { detectFloorLevels } = new Function(html.slice(i0, i1) + '\nreturn { detectFloorLevels };')();
const nuvola = (spec) => { const p=[]; for (const [y,area] of spec) { const n=Math.round(area/0.05); for(let k=0;k<n;k++) p.push([0,y,0]); } return p; };
const casi = [
  ['sala spoglia',                 [[0,900]], [0]],
  ['sala arredata',                [[0,900],[0.45,90],[0.75,120],[1.10,60]], [0]],
  ['terminal fitto di arredi',     [[0,900],[0.45,300],[0.75,400],[1.10,250]], [0]],
  ['arredi piu del pavimento',     [[0,300],[0.75,400],[1.10,250]], [0.75]],
  ['due piani + mezzanino',        [[0,900],[0.45,300],[0.75,400],[4.5,500],[5.2,120]], [0,4.5]],
  ['pavimento non a quota zero',   [[3.2,900],[3.65,300],[3.95,400]], [3.2]],
  ['rampa continua (nessun piano)',Array.from({length:40},(_,k)=>[k*0.05,20]), null],
];
let ko = 0;
for (const [nome, spec, atteso] of casi) {
  const got = detectFloorLevels(nuvola(spec));
  const ok = atteso === null ? got.length >= 1
           : got.length === atteso.length && got.every((v,i)=>Math.abs(v-atteso[i])<0.06);
  if (!ok) ko++;
  console.log((ok?'  ok  ':' FAIL ') + nome.padEnd(30) + '-> ' + got.map(v=>v.toFixed(2)+'m').join(', ') +
              (atteso?'   atteso ' + atteso.map(v=>v.toFixed(2)+'m').join(', '):''));
}
console.log(ko ? `\n${ko} CASI FALLITI` : '\ntutti i casi corretti');
process.exit(ko?1:0);
