// Prova della resa sul modello:  node veritas_visuale.test.mjs
//
// Il grafico non si prova a occhio in un banco headless, ma le due cose che
// possono MENTIRE si': l'orientamento della texture (una mappa specchiata e'
// peggio di nessuna mappa) e il percorso delle particelle, che deve coincidere
// con il calcolo di esodo e non essere un'animazione decorativa.
import fs from 'node:fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

// --- finto THREE, quel tanto che basta a registrare cosa viene costruito ---
const creati = [];
class V3 { constructor(){this.x=0;this.y=0;this.z=0;} set(x,y,z){this.x=x;this.y=y;this.z=z;} }
class Obj { constructor(){ this.position=new V3(); this.rotation=new V3(); this.scale=new V3();
  this.children=[]; } add(o){ this.children.push(o); o.parent=this; } traverse(f){ f(this); this.children.forEach(c=>c.traverse&&c.traverse(f)); } remove(o){ this.children=this.children.filter(c=>c!==o); } }
const THREE = {
  Group: class extends Obj {}, Mesh: class extends Obj { constructor(g,m){ super(); this.geometry=g; this.material=m; creati.push(this); } },
  Points: class extends Obj { constructor(g,m){ super(); this.geometry=g; this.material=m; creati.push(this); } },
  PlaneGeometry: class { constructor(w,h){ this.w=w; this.h=h; this.tipo='piano'; } dispose(){} },
  RingGeometry: class { constructor(a,b){ this.ri=a; this.re=b; this.tipo='anello'; } dispose(){} },
  BufferGeometry: class { constructor(){ this.attributes={}; } setAttribute(n,a){ this.attributes[n]=a; } dispose(){} },
  BufferAttribute: class { constructor(a,n){ this.array=a; this.itemSize=n; this.needsUpdate=false; } },
  DataTexture: class { constructor(d,w,h){ this.image={data:d,width:w,height:h}; this.needsUpdate=false; } dispose(){} },
  MeshBasicMaterial: class { constructor(o){ Object.assign(this,o); } dispose(){} },
  PointsMaterial: class { constructor(o){ Object.assign(this,o); } dispose(){} },
  Color: class { constructor(r,g,b){ this.r=r; this.g=g; this.b=b; } },
  RGBAFormat: 1, LinearFilter: 1, DoubleSide: 2,
};
globalThis.window = { THREE, __veritasScene: new Obj() };
globalThis.performance = { now: () => 0 };
let tics = [];
globalThis.requestAnimationFrame = (f) => { tics.push(f); return tics.length; };
globalThis.cancelAnimationFrame = () => {};
const a = html.indexOf('// VERITAS — Verdetti sul modello');
const i0 = html.indexOf('(function () {', a), i1 = html.indexOf('</script>', i0);
if (a < 0) { console.error('Ancora non trovata.'); process.exit(2); }
new Function('window', 'console', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame',
  html.slice(i0, i1))(globalThis.window, { log(){}, warn(){} }, globalThis.performance,
  globalThis.requestAnimationFrame, globalThis.cancelAnimationFrame);
const V = globalThis.window.__veritasVisuale;

let ko = 0; const check = (n, ok, d='') => { console.log((ok?'  ok  ':' FAIL ')+n+(d?'   '+d:'')); if(!ok) ko++; };

// griglia 4x3, tutta libera, distanze note: cresce verso destra
const w = 4, h = 3, cellSize = 1;
const free = new Uint8Array(w*h).fill(1);
const dist = new Float32Array(w*h);
for (let z = 0; z < h; z++) for (let x = 0; x < w; x++) dist[z*w+x] = x; // 0,1,2,3
const grid = { w, h, cellSize, minX: 0, minZ: 0, free, levelY: 0 };

console.log('mappa di esodo: la texture non deve uscire specchiata');
V.spegni(); creati.length = 0;
const m = V.mappaEsodo(grid, dist, 2);
const tex = creati.find((c) => c.geometry.tipo === 'piano').material.map;
check('texture della misura della griglia', tex.image.width === w && tex.image.height === h);
const px = (cx, cz) => { const j = ((h-1-cz)*w+cx)*4; const d = tex.image.data; return [d[j],d[j+1],d[j+2],d[j+3]]; };
// la riga texture di una cella deve essere h-1-cz: la texture ha origine in basso
check('cella vicina all uscita: verde', px(0,0)[1] > px(0,0)[0], JSON.stringify(px(0,0)));
check('cella oltre la soglia: rossa', px(3,0)[0] > 200 && px(3,0)[1] < 80, JSON.stringify(px(3,0)));
check('il salto e NETTO alla soglia, non sfumato', px(2,0).join() !== px(3,0).join());
check('celle oltre soglia contate', m.celleOltre === 3, m.celleOltre + ' (una colonna da 3)');
// stessa distanza -> stesso colore su tutta la colonna, indipendente da z
check('nessuna deriva lungo Z', px(3,0).join() === px(3,2).join());

console.log('\nmuro e area irraggiungibile');
const free2 = new Uint8Array(w*h).fill(1); free2[1] = 0;         // un muro
const dist2 = Float32Array.from(dist); dist2[2] = Infinity;      // una cella isolata
V.spegni(); creati.length = 0;
V.mappaEsodo({ ...grid, free: free2 }, dist2, 2);
const t2 = creati.find((c) => c.geometry.tipo === 'piano').material.map.image.data;
const at = (cx, cz) => { const j = ((h-1-cz)*w+cx)*4; return [t2[j],t2[j+1],t2[j+2],t2[j+3]]; };
check('il muro e trasparente, non colorato', at(1,0)[3] === 0, JSON.stringify(at(1,0)));
check('irraggiungibile = nero pieno, non rosso', at(2,0)[0] < 40 && at(2,0)[3] > 200, JSON.stringify(at(2,0)));

console.log('\nflusso: le particelle SCENDONO il gradiente, non vagano');
// Reso deterministico: con Math.random fisso a 0 ogni rinascita cade sulla
// PRIMA cella utile (x=1), quindi il percorso e' prevedibile e si puo'
// verificare passo per passo invece che a occhio.
const dado = Math.random; Math.random = () => 0;
V.spegni(); creati.length = 0; tics = [];
check('flusso costruito', V.flussoEsodo(grid, dist, 12) === true);
const punti = creati.find((c) => c.geometry.attributes && c.geometry.attributes.position);
// il modulo limita le particelle alle celle disponibili: su questa griglia
// solo 9 celle hanno distanza > 0, quindi 9 particelle e non 12.
const nPart = punti.geometry.attributes.position.array.length / 3;
check('particelle limitate alle celle utili', nPart === 9, nPart + ' particelle su 12 chieste');

const tic = tics[tics.length-1];
const xs = () => { const a = punti.geometry.attributes.position.array;
  return Array.from({length:nPart}, (_,k) => a[k*3]); };
const passo = (n) => { globalThis.performance.now = () => n*100; tic(n*100); };

passo(1);
// partite tutte da x=1 (dist 1), il passo di discesa le porta a dist 0
check('primo passo: tutte scendono a x=0.5 (dist 0)', xs().every((x) => Math.abs(x - 0.5) < 1e-6), xs()[0]);
passo(2);
// a dist 0 non c'e' vicino piu' basso: rinascono, e con il dado fisso vanno a x=1
check('arrivate all uscita, rinascono: il flusso non si esaurisce',
  xs().every((x) => Math.abs(x - 1.5) < 1e-6), xs()[0]);

// la prova che conta: nessuna particella risale MAI il gradiente
Math.random = dado;
V.spegni(); creati.length = 0; tics = [];
V.flussoEsodo(grid, dist, 40);
const p2 = creati.find((c) => c.geometry.attributes && c.geometry.attributes.position);
const n2 = p2.geometry.attributes.position.array.length / 3;
const tic2 = tics[tics.length-1];
const leggi = () => { const a = p2.geometry.attributes.position.array;
  return Array.from({length:n2}, (_,k) => a[k*3]); };
let risalite = 0, discese = 0;
tic2(0);
let prima = leggi();
for (let n = 1; n <= 25; n++) {
  globalThis.performance.now = () => n*100; tic2(n*100);
  const dopo = leggi();
  for (let k = 0; k < n2; k++) {
    const delta = dopo[k] - prima[k];
    if (delta < -0.1) discese++;
    // una risalita e' lecita SOLO come rinascita, cioe' partendo da dist 0
    else if (delta > 0.1 && prima[k] > 0.9) risalite++;
  }
  prima = dopo;
}
check('nessuna risalita del gradiente in 25 passi', risalite === 0, risalite + ' risalite');
check('e le discese ci sono state', discese > 50, discese + ' discese');
check('restano dentro la griglia', leggi().every((x) => x >= 0 && x <= w*cellSize));
check('stanno sopra il pavimento, non dentro', p2.geometry.attributes.position.array[1] > 0);

console.log('\nanelli di densita');
V.spegni(); creati.length = 0;
V.coloraDensita([
  { zona: { label:'A', areaM2: 100, centroidX: 1, centroidZ: 2, y: 0 }, densita: 0.2 },
  { zona: { label:'B', areaM2: 100, centroidX: 5, centroidZ: 2, y: 0 }, densita: 6.0 },
]);
const anelli = creati.filter((c) => c.geometry.tipo === 'anello');
check('un anello per zona', anelli.length === 2);
check('zona scarica verde, zona critica rossa',
  anelli[1].material.color.r > anelli[0].material.color.r && anelli[1].material.color.g < anelli[0].material.color.g);
check('posizionati sul baricentro', anelli[1].position.x === 5 && anelli[1].position.z === 2);
check('stesa a terra (ruotata di -90)', Math.abs(anelli[0].rotation.x + Math.PI/2) < 1e-9);

console.log('\nla soglia e assoluta, non relativa al massimo trovato');
V.spegni(); creati.length = 0;
V.coloraDensita([{ zona: { label:'X', areaM2: 100, centroidX: 0, centroidZ: 0, y: 0 }, densita: 0.1 }]);
const soloUna = creati.filter((c) => c.geometry.tipo === 'anello')[0];
check('edificio quasi vuoto: resta verde, non diventa rosso perche e il massimo',
  soloUna.material.color.g > soloUna.material.color.r);

console.log('\nspegnere pulisce davvero');
V.spegni();
check('niente piu gruppo in scena', V.attiva() === false);
check('scena ripulita', globalThis.window.__veritasScene.children.length === 0);

console.log(ko ? `\n${ko} PROVE FALLITE` : '\ntutte le prove passano');
process.exit(ko?1:0);
