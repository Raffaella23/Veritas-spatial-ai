// Il collegamento vero: i percorsi calcolati da index.html attraversano i muri?
//
//     node veritas_muri.test.mjs
//
// `veritas_navigazione.test.mjs` prova il modulo. Questa prova qualcosa di
// diverso e piu' importante: che il PROGRAMMA lo usi davvero. Su questo
// progetto i difetti gravi sono silenziosi — un modulo giusto collegato male
// non da' nessun errore, si vede solo guardando lo schermo.
//
// Le funzioni non sono ricopiate: si estraggono da `index.html` per ancore
// testuali e si eseguono su stub minimi. Se cambia una firma l'ancora non
// combacia piu' e la prova fallisce subito, invece di provare una copia
// vecchia e passare per sbaglio.
import fs from 'node:fs';
import * as NAV from './veritas_navigazione.js';
import * as PER from './veritas_perception.js';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const a = html.indexOf('  // La mappa di cammino: per ogni cella, se ci passa una persona.');
const b = html.indexOf('  let lastZoneGraph = null;', a);
if (a < 0 || b < 0) { console.error('Ancore non trovate: il collegamento e cambiato.'); process.exit(2); }
const sorgente = html.slice(a, b + '  let lastZoneGraph = null;'.length);

let ko = 0;
const check = (n, ok, d = '') => { console.log((ok ? '  ok  ' : ' FAIL ') + n + (d ? '   ' + d : '')); if (!ok) ko++; };

// --- lo spazio di prova: due sale, un muro, una porta spostata ---------------
// La porta e' in alto (z 17.4-18.6): la linea fra i due baricentri passa a
// meta' altezza, cioe' nel pieno del muro. E' la pianta che riproduce il
// difetto segnalato.
const PUNTI = [];
for (let x = 0; x <= 42; x += 0.1) {
  for (let z = 0; z <= 20; z += 0.1) {
    if (x > 20 && x < 21 && !(z > 17.4 && z < 18.6)) continue;
    PUNTI.push([x, 0, z]);
  }
}
const ZONE = [
  { pos: [10, 0, 10], areaM2: 400, widthMinor: 20, role: 'area' },
  { pos: [32, 0, 10], areaM2: 400, widthMinor: 20, role: 'area' },
];

const finestra = {
  __veritasNavigazione: {
    creaMappa: NAV.creaMappa, creaMappaDaNuvola: NAV.creaMappaDaNuvola,
    trovaPercorso: NAV.trovaPercorso, segmentoLibero: NAV.segmentoLibero,
    calpestabile: NAV.calpestabile, agganciaCella: NAV.agganciaCella,
    cellaDa: NAV.cellaDa, centroCella: NAV.centroCella, tiraLaCorda: NAV.tiraLaCorda,
    DEFAULTS: NAV.NAVIGAZIONE_DEFAULTS,
  },
  __veritasPerceptionEngine: {
    buildOccupancyGrid: PER.buildOccupancyGrid, closeHoles: PER.closeHoles,
    distanceTransform: PER.distanceTransform, estimatePointSpacing: PER.estimatePointSpacing,
    DEFAULTS: PER.PERCEPTION_DEFAULTS,
  },
  __veritasPercezione: null,
};
const detto = [];
const finta = { log: (...m) => detto.push(m.join(' ')), warn: (...m) => detto.push(m.join(' ')) };

// `EXCLUDE_KEYWORDS` sta piu' su nel blocco: si passa, non si ricopia.
const ESCLUSI = ['runway', 'taxiway', 'pista', 'piazzale', 'apron', 'tarmac', 'road',
  'strada', 'terreno', 'ground', 'asphalt', 'asfalto', 'parcheggio_auto', 'landscape', 'terrain'];
const costruisci = (win, punti, zone) => new Function(
  'window', 'console', 'lastNavigablePoints', 'lastZones', 'lastFloorLevels', 'EXCLUDE_KEYWORDS',
  sorgente + '\n  return { lineHasSupport, findRoute, veritasMappaCammino, buildZoneGraph, dijkstra, muriDalModello };'
)(win, finta, punti, zone, [0], ESCLUSI);
const F = costruisci(finestra, PUNTI, ZONE);

// ---------------------------------------------------------------------------
console.log('1. il controllo del muro, come lo chiama il programma');
check('la mappa di cammino viene costruita', !!F.veritasMappaCammino(0));
check('la linea fra i due baricentri e BLOCCATA',
  !F.lineHasSupport([10, 0, 10], [32, 0, 10], PUNTI),
  'prima di questa correzione passava anche con un muro di 6 m');
check('una linea tutta dentro la stessa sala resta libera',
  F.lineHasSupport([4, 0, 4], [16, 0, 16], PUNTI));
check('il passaggio dalla porta e libero',
  F.lineHasSupport([19, 0, 18], [22, 0, 18], PUNTI));

// ---------------------------------------------------------------------------
console.log('\n2. il percorso che il programma consegna alla simulazione');
const via = F.findRoute([10, 0, 10], [32, 0, 10]);
check('un percorso viene restituito', Array.isArray(via) && via.length > 0,
  via ? via.length + ' tappe' : 'nessuno');
check('NON e la linea dritta', via.length > 1, via.length + ' tappe');

// La verifica che conta: ogni punto della spezzata, non solo le tappe.
const mappa = F.veritasMappaCammino(0);
function primoPuntoNelMuro(partenza, tappe) {
  let px = partenza[0], pz = partenza[2];
  for (const t of tappe) {
    const qx = t[0], qz = t[2];
    const n = Math.max(1, Math.ceil(Math.hypot(qx - px, qz - pz) / (mappa.cellSize * 0.5)));
    for (let k = 0; k <= n; k++) {
      const f = k / n, x = px + (qx - px) * f, z = pz + (qz - pz) * f;
      const [cx, cz] = NAV.cellaDa(mappa, x, z);
      if (!NAV.calpestabile(mappa, cx, cz, 0.28)) return [x, z];
    }
    px = qx; pz = qz;
  }
  return null;
}
const dentroMuro = primoPuntoNelMuro([10, 0, 10], via);
check('nessun punto del percorso sta dentro un muro', dentroMuro === null,
  dentroMuro ? 'passa da x=' + dentroMuro[0].toFixed(2) + ' z=' + dentroMuro[1].toFixed(2)
             : 'controllata tutta la spezzata, metro per metro');

// Deve passare dalla porta, che e' l'unico varco che esiste.
let zAlVarco = null, px = 10, pz = 10;
for (const t of via) {
  if ((px < 20.5) !== (t[0] < 20.5)) zAlVarco = pz + (t[2] - pz) * ((20.5 - px) / (t[0] - px));
  px = t[0]; pz = t[2];
}
check('attraversa il muro dove c e la porta', zAlVarco !== null && zAlVarco > 17.4 && zAlVarco < 18.6,
  zAlVarco === null ? 'non attraversa mai il muro' : 'a z=' + zAlVarco.toFixed(2) + ' (porta 17.4-18.6)');

// ---------------------------------------------------------------------------
console.log('\n3. il grafo delle zone non collega piu due sale separate da un muro');
const grafo = F.buildZoneGraph(ZONE, PUNTI);
check('le due sale non risultano collegate in linea retta', grafo[0].length === 0,
  grafo[0].length + ' collegamenti diretti');

// ---------------------------------------------------------------------------
console.log('\n4. senza il modulo di navigazione il programma non si blocca');
// Chi apre la pagina con un modulo non caricato deve comunque vedere qualcosa:
// la via di riserva sulla nuvola deve reggere, e deve essere severa uguale.
const senza = costruisci({ __veritasPercezione: null }, PUNTI, ZONE);
check('anche senza mappa il muro viene visto',
  !senza.lineHasSupport([10, 0, 10], [32, 0, 10], PUNTI),
  'la via di riserva usa lo stesso criterio, non il voto a maggioranza di prima');
check('e la stessa sala resta percorribile', senza.lineHasSupport([4, 0, 4], [16, 0, 16], PUNTI));
const viaSenza = senza.findRoute([10, 0, 10], [32, 0, 10]);
check('un percorso viene comunque restituito', Array.isArray(viaSenza) && viaSenza.length > 0);


// ===========================================================================
// 5. IL CASO DIFFICILE: un tramezzo che il campionamento NON puo' vedere.
// ===========================================================================
// E' il limite vero, misurato: non si puo' dedurre un muro piu' sottile della
// distanza fra un campione di pavimento e l'altro. Su un edificio grande i
// campioni si diradano a mezzo metro, e un tramezzo da 10 cm non lascia
// nessun buco nella nuvola — il pavimento risulta continuo.
//
// Ma il muro nel modello c'e'. Qui la nuvola dichiara un pavimento
// PERFETTAMENTE CONTINUO (nessun buco, nessun indizio) e il muro esiste solo
// come superficie verticale nella geometria. Se il programma lo vede, lo vede
// perche' l'ha letto, non perche' l'ha indovinato.
console.log('\n5. un tramezzo da 10 cm che la nuvola non puo vedere');

// --- il minimo di THREE che serve a leggere i triangoli ---------------------
class V3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  fromBufferAttribute(a, i) { this.x = a.array[i * 3]; this.y = a.array[i * 3 + 1]; this.z = a.array[i * 3 + 2]; return this; }
  applyMatrix4() { return this; }                       // matrice identita'
  subVectors(a, b) { this.x = a.x - b.x; this.y = a.y - b.y; this.z = a.z - b.z; return this; }
  crossVectors(a, b) {
    this.x = a.y * b.z - a.z * b.y; this.y = a.z * b.x - a.x * b.z; this.z = a.x * b.y - a.y * b.x; return this;
  }
  length() { return Math.hypot(this.x, this.y, this.z); }
}
/** Due triangoli che formano un quadrilatero verticale. */
function paretina(x0, z0, x1, z1, yBasso, yAlto) {
  return [x0, yBasso, z0,  x1, yBasso, z1,  x1, yAlto, z1,
          x0, yBasso, z0,  x1, yAlto,  z1,  x0, yAlto, z0];
}
// Tramezzo spesso 10 cm a x=20, con una porta larga 1,2 m in alto (z 17.4-18.6).
const geomMuro = [
  ...paretina(20.05, 0,    20.05, 17.4, 0, 3),
  ...paretina(20.05, 18.6, 20.05, 20,   0, 3),
  // e un pavimento, che NON deve essere scambiato per un muro
  ...[0, 0, 0,  42, 0, 0,  42, 0, 20,   0, 0, 0,  42, 0, 20,  0, 0, 20],
];
const modello = {
  updateMatrixWorld() {},
  traverse(f) {
    f({
      isMesh: true, name: 'Tramezzi', matrixWorld: {},
      geometry: { index: null, attributes: { position: { count: geomMuro.length / 3, array: geomMuro } } },
    });
  },
};

// La nuvola: pavimento CONTINUO, campionato a mezzo metro. Nessun buco: il
// tramezzo e' piu' sottile del passo di campionamento e non lascia traccia.
const NUVOLA_CIECA = [];
for (let x = 0; x <= 42; x += 0.5) for (let z = 0; z <= 20; z += 0.5) NUVOLA_CIECA.push([x, 0, z]);

const finestraConModello = { ...finestra, THREE: { Vector3: V3 }, __veritasModelRoot: modello };
finestraConModello.__veritasNavigazione = { ...finestra.__veritasNavigazione, marcaOstacoli: NAV.marcaOstacoli };

// prima: senza leggere il modello, il muro e' invisibile — e deve esserlo,
// perche' e' il limite dichiarato.
const cieco = costruisci({ ...finestra, __veritasNavigazione: {
  ...finestra.__veritasNavigazione, marcaOstacoli: undefined } }, NUVOLA_CIECA, ZONE);
check('senza leggere il modello il tramezzo NON si vede (limite dichiarato)',
  cieco.lineHasSupport([10, 0, 10], [32, 0, 10], NUVOLA_CIECA),
  'la nuvola dice pavimento continuo, e non si puo dedurre altro');

// dopo: leggendo le superfici verticali, il muro c'e'.
const conModello = costruisci(finestraConModello, NUVOLA_CIECA, ZONE);
const campioniMuro = conModello.muriDalModello(0, 0.2);
check('le superfici verticali del modello vengono lette',
  campioniMuro.length > 0, campioniMuro.length + ' campioni di muro');
check('il pavimento NON viene scambiato per un muro',
  campioniMuro.every(([x]) => x > 19.5 && x < 20.6),
  campioniMuro.length ? 'tutti fra x=19.5 e x=20.6, cioe sul tramezzo' : '');
check('adesso il tramezzo da 10 cm BLOCCA la linea dritta',
  !conModello.lineHasSupport([10, 0, 10], [32, 0, 10], NUVOLA_CIECA),
  'letto dal modello, non dedotto dai buchi');
check('e la porta resta aperta',
  conModello.lineHasSupport([19, 0, 18], [22, 0, 18], NUVOLA_CIECA));

const viaFine = conModello.findRoute([10, 0, 10], [32, 0, 10]);
let zVarco = null, qx = 10, qz = 10;
for (const t of viaFine) {
  if ((qx < 20.05) !== (t[0] < 20.05)) zVarco = qz + (t[2] - qz) * ((20.05 - qx) / (t[0] - qx));
  qx = t[0]; qz = t[2];
}
check('il percorso passa dalla porta anche qui',
  zVarco !== null && zVarco > 17.4 && zVarco < 18.6,
  zVarco === null ? 'non attraversa mai il tramezzo' : 'a z=' + zVarco.toFixed(2));

// La rete di sicurezza: una lettura che chiude mezzo edificio va scartata.
console.log('\n6. una lettura dei muri che chiude tutto viene rifiutata');
const mappaBase = NAV.creaMappaDaNuvola(finestra.__veritasPerceptionEngine, NUVOLA_CIECA, 0);
const troppi = [];
for (let x = 0; x <= 42; x += 0.2) for (let z = 0; z <= 20; z += 0.2) if (z > 4) troppi.push([x, z]);
const esito = NAV.marcaOstacoli(mappaBase, troppi, finestra.__veritasPerceptionEngine);
check('marcare l 80% dello spazio come muro viene rifiutato',
  !esito.applicata, 'avrebbe chiuso il ' + esito.fraseCalo + '% del calpestabile');
const pochi = [];
for (let z = 0; z <= 20; z += 0.2) if (!(z > 17.4 && z < 18.6)) pochi.push([20.05, z]);
const esitoOk = NAV.marcaOstacoli(mappaBase, pochi, finestra.__veritasPerceptionEngine);
check('un tramezzo normale invece viene accettato',
  esitoOk.applicata, 'chiude il ' + esitoOk.fraseCalo + '% del calpestabile');

console.log('\n' + (ko ? ko + ' PROVE FALLITE' : 'tutte le prove passate'));
process.exit(ko ? 1 : 0);
