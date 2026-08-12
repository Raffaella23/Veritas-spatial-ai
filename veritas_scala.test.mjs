// Prova del controllo "il modello e' in metri?".
//     node veritas_scala.test.mjs
//
// Il fattore si ricava dalla larghezza dei VARCHI, non dall'ingombro: una
// porta non e' mai piu' stretta di ~80 cm, in nessun edificio e in nessuna
// norma. Se la mediana dei varchi misurati sta molto sotto, non e' l'edificio
// a essere impossibile: sono le unita' a non essere metri.
//
// Il primo caso e' quello reale del 12/08/2026: un terminal con passaggio
// misurato 0.15 m, che risulta essere un modello 6 volte piu' piccolo del vero.
//
// La funzione non viene ricopiata: si estrae da index.html cosi' com'e'.
import fs from 'node:fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const i0 = html.indexOf('  const VARCO_REALE_M = 0.90;');
const i1 = html.indexOf('\n  function structuralAnalysisFromPoints(points, airsideAnchor)');
if (i0 < 0 || i1 < 0 || i1 <= i0) {
  console.error('Ancore non trovate in index.html: veritasScaleSanity e stata spostata o rinominata.');
  process.exit(2);
}
const corpo = html.slice(i0, i1);
let lastGateways = [];
const run = (varchi) => {
  lastGateways = varchi;
  return new Function('lastGateways','console', corpo + '\nreturn veritasScaleSanity();')(varchi, {warn(){}});
};
const g = (...w) => w.map((x) => ({ widthM: x }));
let ko = 0; const check = (n, ok, d='') => { console.log((ok?'  ok  ':' FAIL ')+n+(d?'   '+d:'')); if(!ok) ko++; };

// Il caso reale di Raffaella: passaggio piu' stretto 0.15m, 31 varchi
const suo = run(g(0.15,0.16,0.15,0.18,0.14,0.15,0.17,0.16,0.15,0.19,0.15));
check("modello non in metri riconosciuto", !!suo && /non era in metri/.test(suo.diagnosi));
check('fattore stimato ~6x', suo && Math.abs(suo.fattore - 6) < 0.6, suo ? suo.fattore + 'x (mediana ' + suo.mediana.toFixed(2) + 'm)' : '-');

// Edificio vero in metri: non deve dire nulla
check('edificio in metri: nessun allarme', run(g(0.9,1.2,1.0,2.4,0.85,1.1,3.0)) === null);
check('porte tutte da 90cm: nessun allarme', run(g(0.9,0.9,0.9,0.9)) === null);

// Un solo varco molto stretto in un edificio sano: non deve allarmare
check('una fessura isolata non fa scattare nulla', run(g(0.10,0.95,1.10,1.20,2.0)) === null,
      'la mediana resta 1.10m');

// Troppe poche misure
check('meno di 3 varchi: si tace', run(g(0.15,0.16)) === null);
check('nessun varco: si tace', run([]) === null);
check('dati sporchi ignorati', run([{widthM:null},{widthM:0},{},{widthM:'x'}]) === null);

// Modello in centimetri (fattore 100): fattore grande, arrotondato a intero
const cm = run(g(0.009,0.010,0.009,0.011,0.010));
check('modello in centimetri: fattore intero', cm && cm.fattore === 90, cm ? cm.fattore + 'x' : '-');

// Caso di confine: mediana appena sotto la soglia
const bordo = run(g(0.68,0.69,0.68,0.70,0.69));
check('mediana appena sotto soglia: segnala', !!bordo, bordo ? bordo.fattore + 'x' : '-');
const sopra = run(g(0.71,0.72,0.75,0.80,0.90));
check('mediana appena sopra soglia: tace', sopra === null);

console.log(ko ? `\n${ko} PROVE FALLITE` : '\ntutte le prove passano');
process.exit(ko?1:0);
