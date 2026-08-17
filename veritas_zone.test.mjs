// Prova dell'assegnazione delle zone:  node veritas_zone.test.mjs
//
// Il caso vero del 12/08/2026: il motore misura 7 zone, l'assegnazione ne
// produceva 5 prese dai NOMI delle mesh. Qui si verifica che ora nessuna zona
// misurata resti fuori, e che i nomi servano solo a etichettare.
import fs from 'node:fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
// Si estrae dal LESSICO in giu': la tabella dei nomi sta fuori dalla funzione
// (la usa anche il chiamante) e senza di lei il corpo non gira.
const a = html.indexOf('  const LESSICO_ZONE = {');
const fine = html.indexOf('\n  function applyAutoAssignment', a);
if (a < 0 || fine < 0) { console.error('Ancore non trovate.'); process.exit(2); }

let meshNominate = [];
const analyzeMesh = () => meshNominate;
const assegna = new Function('analyzeMesh', 'console',
  html.slice(a, fine) + '\n  return assegnaZoneMisurate;'
)(analyzeMesh, { log(){} });

let ko = 0; const check = (n, ok, d='') => { console.log((ok?'  ok  ':' FAIL ')+n+(d?'   '+d:'')); if(!ok) ko++; };
const zona = (x, z, area, role='area', dAir=null) =>
  ({ pos: [x, 0, z], areaM2: area, role, distFromAirside: dAir });

console.log('il caso vero: 7 zone misurate, 5 nomi nel modello');
const sette = [
  zona(0,  0, 300, 'area',      70),  // ingresso
  zona(10, 0, 120, 'corridoio', 60),
  zona(20, 0, 400, 'area',      50),
  zona(30, 0, 150, 'corridoio', 40),
  zona(40, 0, 500, 'area',      30),
  zona(50, 0, 200, 'area',      20),
  zona(60, 0, 350, 'area',      10),  // lato volo
];
meshNominate = [
  { type:'checkin',  label:'Banco accettazione', pos:[20.5, 0, 1] },
  { type:'security', label:'Controllo',          pos:[40.2, 0, 0] },
  { type:'gate',     label:'Gate A1',            pos:[60.1, 0, 0] },
  { type:'lounge',   label:'Lounge',             pos:[50.0, 0, 0] },
  { type:'spawn',    label:'Ingresso Ovest',     pos:[0.3,  0, 0] },
];
let nodi = assegna(sette, {});
check('NESSUNA zona misurata resta fuori', nodi.length === 7, nodi.length + ' nodi da 7 zone');
check('i 5 nomi sono stati usati', nodi.filter((n) => n.origine === 'nome+misura').length === 5);
check('le altre 2 dedotte dal flusso', nodi.filter((n) => n.origine === 'misura').length === 2);
check('il banco tiene il suo nome', nodi.some((n) => n.label === 'Banco accettazione'));
check('ogni nodo porta l area della sua zona', nodi.every((n) => n.areaM2 > 0));

console.log('\nl ordine segue il lato volo, non l asse X del file');
// stesse zone ma con X invertita rispetto al flusso: l'ordine deve seguire
// distFromAirside, non X
const invertite = sette.map((z, i) => ({ ...z, pos: [-z.pos[0], 0, 0] }));
meshNominate = [];
nodi = assegna(invertite, {});
check('la prima e l ingresso (piu lontana dal lato volo)', nodi[0].type === 'spawn', nodi[0].label);
check('l ultima e il gate', nodi[nodi.length-1].type === 'gate', nodi[nodi.length-1].label);

console.log('\nsenza riferimento lato volo: si usa l asse piu esteso');
const lungoZ = [zona(0,0,200), zona(0,25,200), zona(0,50,200), zona(1,75,200)];
nodi = assegna(lungoZ, {});
check('ordinate lungo Z, non lungo X', nodi[0].pos[2] === 0 && nodi[3].pos[2] === 75);

console.log('\nun corridoio non diventa una lounge');
const conCorridoio = [zona(0,0,300,'area',50), zona(10,0,80,'corridoio',40),
                      zona(20,0,90,'corridoio',30), zona(30,0,400,'area',10)];
meshNominate = [];
nodi = assegna(conCorridoio, {});
check('i corridoi non sono luoghi di sosta',
  nodi[1].label.startsWith('Passaggio') && nodi[2].label.startsWith('Passaggio'),
  nodi.map(n=>n.label).join(' / '));

console.log('\nnomi lontani da ogni zona: scartati, non trascinati dentro');
meshNominate = [
  { type:'gate', label:'Cartello sospeso', pos:[500, 0, 500] },  // fuori da tutto
  { type:'gate', label:'Gate vero',        pos:[60, 0, 0] },
];
nodi = assegna(sette, {});
check('il cartello lontano non entra', !nodi.some((n) => n.label === 'Cartello sospeso'));
check('il gate vicino entra', nodi.some((n) => n.label === 'Gate vero'));

console.log('\ndue nomi nella stessa zona: uno solo vince, niente doppioni');
meshNominate = [
  { type:'gate', label:'Gate A1', pos:[60.0, 0, 0] },
  { type:'gate', label:'Gate A2', pos:[60.4, 0, 0.3] },
];
nodi = assegna(sette, {});
check('sempre 7 nodi, non 8', nodi.length === 7);
check('id univoci', new Set(nodi.map((n) => n.id)).size === nodi.length);

console.log('\nun nome piccolo dentro una zona grande la etichetta comunque');
meshNominate = [{ type:'checkin', label:'Desk', pos:[23, 0, 5] }]; // 400 m2 -> raggio ~11 m
nodi = assegna(sette, {});
check('il banco a 5 m dal baricentro etichetta la sala', nodi.some((n) => n.label === 'Desk'));

console.log('\ncasi limite');
check('meno di due zone: non assegna', assegna([zona(0,0,100)], {}) === null);
check('zone assenti: non esplode', assegna(null, {}) === null);
meshNominate = [];
check('nessun nome: funziona lo stesso', assegna(sette, {}).length === 7);
meshNominate = null;
check('analyzeMesh che ritorna null: funziona lo stesso', assegna(sette, {}).length === 7);

// --- lessico per dominio: le stesse tappe, i nomi del posto giusto ---
// Un museo con "Accettazione" e "Controllo" sulle sale dice a chi legge il
// referto che lo strumento non ha capito cosa sta guardando.
console.log('\nil lessico segue il tipo di progetto');
meshNominate = [];
const quattro = [zona(0,0,300,'area',50), zona(10,0,200,'area',40),
                 zona(20,0,400,'area',30), zona(30,0,250,'area',10)];

const etichette = (d) => assegna(quattro, {}, d).map((n) => n.label).join(' / ');
check('aeroporto: nomi da aeroporto', /Accettazione|Controllo/.test(etichette('aeroporto')),
      etichette('aeroporto'));
check('museo: nessun nome da aeroporto', !/Accettazione|Lounge|Gate/.test(etichette('museo')),
      etichette('museo'));
check('gaming: nessun nome da aeroporto', !/Accettazione|Lounge|Gate/.test(etichette('gaming')),
      etichette('gaming'));
check('tipo non dichiarato: nomi neutri, non da aeroporto',
      !/Accettazione|Lounge|Gate/.test(etichette(undefined)), etichette(undefined));
check('tipo sconosciuto ricade sul neutro', etichette('ospedale') === etichette(undefined));

console.log('\nil TIPO funzionale non cambia con il dominio (ci si appoggia la simulazione)');
const tipi = (d) => assegna(quattro, {}, d).map((n) => n.type).join(',');
check('museo e aeroporto hanno gli stessi type', tipi('museo') === tipi('aeroporto'), tipi('museo'));
check('c e sempre uno spawn e un gate',
      /^spawn,/.test(tipi('gaming')) && /,gate$/.test(tipi('gaming')), tipi('gaming'));

// --- i ruoli dalle misure, non dalla posizione in fila ---
console.log('\nil filtro sta dove lo spazio si stringe, non dove capita in fila');
const conLarghezze = [
  { pos:[0,0,0],  areaM2:300, role:'area', distFromAirside:50, widthMinor:12 },
  { pos:[10,0,0], areaM2:500, role:'area', distFromAirside:40, widthMinor:20 }, // la piu ampia
  { pos:[20,0,0], areaM2:180, role:'area', distFromAirside:30, widthMinor:2.2 },// la piu stretta
  { pos:[30,0,0], areaM2:260, role:'area', distFromAirside:20, widthMinor:9 },
  { pos:[40,0,0], areaM2:220, role:'area', distFromAirside:10 },
];
let m = assegna(conLarghezze, {}, 'aeroporto');
check('il controllo va sulla zona piu stretta, non sulla terza per posizione',
      m[2].type === 'security', m.map((n)=>n.type+'@'+n.pos[0]).join(' '));
check('la sosta va sulla zona piu ampia', m[1].type === 'lounge', m[1].label);
check('le altre di mezzo restano checkin', m[3].type === 'checkin', m[3].type);

console.log('\nsenza larghezze misurate si torna alla sequenza (nessuna regressione)');
const senzaLarghezze = conLarghezze.map(({widthMinor, ...z}) => z);
const senza = assegna(senzaLarghezze, {}, 'aeroporto');
check('la sequenza posizionale regge ancora',
      senza[1].type === 'checkin' && senza[2].type === 'security',
      senza.map((n)=>n.type).join(','));

console.log('\nun corridoio non diventa mai il filtro');
const conCorridoioStretto = [
  { pos:[0,0,0],  areaM2:300, role:'area',      distFromAirside:50, widthMinor:12 },
  { pos:[10,0,0], areaM2:60,  role:'corridoio', distFromAirside:40, widthMinor:1.5 }, // il piu stretto
  { pos:[20,0,0], areaM2:200, role:'area',      distFromAirside:30, widthMinor:3 },
  { pos:[30,0,0], areaM2:400, role:'area',      distFromAirside:20, widthMinor:15 },
  { pos:[40,0,0], areaM2:250, role:'area',      distFromAirside:10, widthMinor:8 },
];
const cc = assegna(conCorridoioStretto, {}, 'aeroporto');
check('il corridoio resta un passaggio anche se e il piu stretto',
      cc[1].label.startsWith('Passaggio'), cc[1].label);
check('il filtro va sulla zona stretta dove si sta', cc[2].type === 'security',
      cc.map((n)=>n.type).join(','));

console.log('\ni nomi dal modello vincono sulle misure');
meshNominate = [{ type:'lounge', label:'Sala VIP', pos:[20.2, 0, 0] }];
const conNomeSuStretta = assegna(conLarghezze, {}, 'aeroporto');
check('il nome scritto da chi ha modellato non viene sovrascritto',
      conNomeSuStretta.some((n) => n.label === 'Sala VIP'),
      conNomeSuStretta.map((n)=>n.label).join(' / '));
meshNominate = [];

console.log(ko ? `\n${ko} PROVE FALLITE` : '\ntutte le prove passano');
process.exit(ko?1:0);
