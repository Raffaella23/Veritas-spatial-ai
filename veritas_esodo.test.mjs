// Prova delle vie di esodo:  node veritas_esodo.test.mjs
//
// Casi costruiti a mano con la risposta nota in anticipo. La distanza di
// esodo e' un numero che finisce in un documento antincendio: se sbaglia, non
// se ne accorge nessuno finche' non serve davvero.
import fs from 'node:fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const a = html.indexOf('// VERITAS — Vie di esodo');
const i0 = html.indexOf('(function () {', a), i1 = html.indexOf('</script>', i0);
if (a < 0 || i0 < 0) { console.error('Ancora non trovata.'); process.exit(2); }
globalThis.window = {};
new Function('window', 'console', html.slice(i0, i1))(globalThis.window, { log(){} });
const E = globalThis.window.__veritasEsodo;

let ko = 0; const check = (n, ok, d='') => { console.log((ok?'  ok  ':' FAIL ')+n+(d?'   '+d:'')); if(!ok) ko++; };
// griglia da disegno ASCII: '.' libero, '#' muro
function griglia(righe, cellSize = 1) {
  const h = righe.length, w = righe[0].length, free = new Uint8Array(w*h);
  righe.forEach((r, z) => [...r].forEach((c, x) => { if (c !== '#') free[z*w+x] = 1; }));
  return { w, h, cellSize, minX: 0, minZ: 0, free, levelY: 0 };
}
const mondo = (g, cx, cz) => ({ worldX: (cx+0.5)*g.cellSize, worldZ: (cz+0.5)*g.cellSize });

console.log('corridoio dritto di 10 celle da 1 m, uscita a sinistra');
let g = griglia(['..........']);
let d = E.distanzeDiEsodo(g, [mondo(g, 0, 0)]);
check('la cella all altro capo dista 9 m', Math.abs(d.percorsoMassimoM - 9) < 0.01, d.percorsoMassimoM + ' m');
check('tutte raggiunte', d.celleIrraggiungibili === 0);
check('nessuna area irraggiungibile', d.areaIrraggiungibileM2 === 0);

console.log('\nil punto: aggirare un muro costa di piu della linea d aria');
// da (0,0) a (0,4) ci sono 4 m in linea d'aria, ma il muro obbliga al giro
g = griglia([
  '.....',
  '####.',
  '.....',
]);
d = E.distanzeDiEsodo(g, [mondo(g, 0, 0)]);
const ix = (cx, cz) => cz*g.w+cx;
check('linea d aria da (0,0) a (0,2) sarebbe 2 m', true);
// 3 m + due diagonali per infilare il varco + 3 m = 3 + 2*V2 + 3 = 8.83
check('il percorso reale e 8.83 m (giro dal varco)', Math.abs(d.dist[ix(0,2)] - (6 + 2*Math.SQRT2)) < 0.01, d.dist[ix(0,2)].toFixed(2)+' m');
check('cioe 4.4 volte la linea d aria', d.dist[ix(0,2)] / 2 > 4);
check('quindi NON usa la distanza euclidea', d.dist[ix(0,2)] > 2.5);

console.log('\ndiagonali: costano radice di due, e non tagliano gli spigoli');
g = griglia(['..', '..']);
d = E.distanzeDiEsodo(g, [mondo(g, 0, 0)]);
check('la diagonale costa 1.41 m', Math.abs(d.dist[ix2(g,1,1)] - Math.SQRT2) < 0.01, d.dist[ix2(g,1,1)].toFixed(3));
function ix2(gg, cx, cz){ return cz*gg.w+cx; }
// spigolo chiuso: passare in diagonale fra due muri e' vietato
g = griglia(['.#', '#.']);
d = E.distanzeDiEsodo(g, [mondo(g, 0, 0)]);
check('spigolo chiuso: la cella opposta resta irraggiungibile', d.dist[ix2(g,1,1)] === Infinity);

console.log('\nstanza chiusa senza uscita raggiungibile');
g = griglia([
  '...#..',
  '...#..',
  '...#..',
]);
d = E.distanzeDiEsodo(g, [mondo(g, 0, 0)]);
check('la meta separata e irraggiungibile', d.celleIrraggiungibili === 6, d.celleIrraggiungibili + ' celle');
check('e diventa area dichiarata', Math.abs(d.areaIrraggiungibileM2 - 6) < 0.01, d.areaIrraggiungibileM2 + ' m2');

console.log('\npiu uscite: vince la piu vicina');
g = griglia(['...........']); // 11 celle
d = E.distanzeDiEsodo(g, [mondo(g, 0, 0), mondo(g, 10, 0)]);
check('con due uscite il massimo scende a 5 m', Math.abs(d.percorsoMassimoM - 5) < 0.01, d.percorsoMassimoM + ' m');
check('il punto peggiore e in mezzo', Math.abs(d.puntoPiuLontano.worldX - 5.5) < 0.6, JSON.stringify(d.puntoPiuLontano));

console.log('\nuscita dichiarata male: si aggancia alla cella libera vicina');
g = griglia(['#....']);
d = E.distanzeDiEsodo(g, [mondo(g, 0, 0)]); // sul muro
check('non fallisce, aggancia', d !== null && d.percorsoMassimoM > 0, d && d.percorsoMassimoM + ' m');

console.log('\ncandidati uscita');
// interni chiusi: il pavimento non esce mai dall ingombro -> nessun candidato
let liv = { grid: griglia(['#####','#...#','#####']), gateways: [{ worldX: 2.5, worldZ: 1.5, widthM: 1 }] };
check('modello di soli interni: zero candidati (giusto)', E.usciteCandidate(liv).length === 0);
// il pavimento prosegue fino al bordo: quel varco e un candidato
liv = { grid: griglia(['##.##','#...#','#####']), gateways: [{ worldX: 2.5, worldZ: 0.5, widthM: 1 }] };
check('pavimento che esce dall ingombro: candidato trovato', E.usciteCandidate(liv).length === 1);
check('ed e marcato da confermare', E.usciteCandidate(liv)[0].daConfermare === true);

console.log('\nquadro completo');
liv = { grid: griglia(['..........']), gateways: [], bottlenecks: [{ widthM: 0.85, widthConservativeM: 0.80 }] };
let r = E.analizzaEsodo(liv, [{ worldX: 0.5, worldZ: 0.5, widthM: 1.2, widthConservativeM: 1.1 }]);
check('misure pronte per il confronto', r.misure.lunghezza_percorso_esodo_m[0] === 9, JSON.stringify(r.misure));
check('usa la larghezza CONSERVATIVA, mai la ottimistica', r.misure.larghezza_uscita_m[0] === 1.1);
check('con uscite dichiarate non e soloCandidate', r.soloCandidate === false);
r = E.analizzaEsodo({ grid: griglia(['#####','#...#','#####']), gateways: [] }, []);
check('senza uscite: dice perche, non inventa', r.uscite.length === 0 && /nessuna uscita/.test(r.motivo));

console.log(ko ? `\n${ko} PROVE FALLITE` : '\ntutte le prove passano');
process.exit(ko?1:0);
