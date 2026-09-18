// I codici fittizi non tornano:   node veritas_fittizi.test.mjs
//
// Raffaella, 17/09/2026: «rimuovi i codici fittizi quando li trovi». Il 18/09
// sono stati tolti dal bundle (index.html, blocco 3) tre pezzi scritti a mano:
//   · iB  — sei tappe da aeroporto a coordinate fisse di un altro scalo, usate
//           quando il progetto non ha nodes_config: da li' nascevano i tre
//           tragitti «in linea retta» fuori dal modello e i nomi «Ingresso /
//           Parcheggio», «Accettazione», «Gate A1» mostrati come se fossero veri;
//   · hV() — una traiettoria dimostrativa di 28 figure finte, 361 fotogrammi,
//           con una durata inventata di 180 s;
//   · hK  — inquadrature con nomi da aeroporto puntate su quelle coordinate.
// Questa prova legge il bundle VERO in index.html e fallisce se uno dei tre
// ricompare: se una cosa si sbaglia sempre allo stesso modo, va tolta di mano.
import fs from 'node:fs';

let ko = 0;
const check = (n, ok, d = '') => { console.log((ok ? '  ok  ' : ' FAIL ') + n + (d ? '   ' + d : '')); if (!ok) ko++; };

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const inizioHV = html.indexOf('function hV(){');
check('il bundle si trova (funzione hV presente)', inizioHV > 0);
const b0 = html.lastIndexOf('<script', inizioHV), b1 = html.indexOf('</script>', inizioHV);
const bundle = html.slice(b0, b1);

function blocco(testo, inizio, apre, chiude) {
  let d = 0;
  for (let k = testo.indexOf(apre, inizio); k < testo.length; k++) {
    if (testo[k] === apre) d++;
    else if (testo[k] === chiude) { d--; if (!d) return testo.slice(inizio, k + 1); }
  }
  return null;
}

console.log('1. nessuna tappa cablata');
check('senza nodes_config le tappe iniziali sono un elenco VUOTO',
  bundle.includes('iB=(window.__veritasInitialNodes&&window.__veritasInitialNodes.length?window.__veritasInitialNodes:[])'));
for (const parola of ['id:"gate_A1"', 'label:"Ingresso / Parcheggio"', 'label:"Accettazione"', 'label:"Imbarco A"', 'pos:[-45,0,-38]'])
  check('il bundle non contiene ' + parola, !bundle.includes(parola));

console.log('\n2. nessuna traiettoria dimostrativa');
const hv = blocco(bundle, bundle.indexOf('function hV(){'), '{', '}');
check('hV() non legge tappe per indice', hv && !/iB\[\d\]/.test(hv));
check('hV() non inventa figure ne\' casualita\'', hv && !/Math\.random/.test(hv) && !/I=28/.test(hv));
// La si esegue davvero, con un iB finto: deve dare una scena vuota.
const hvFn = new Function('iB', hv + '\nreturn hV();');
const r = hvFn([]);
check('una scena vuota: un solo fotogramma, nessuna figura', r.traj.frames.length === 1 && r.traj.frames[0].agents.length === 0);
check('nessuna durata inventata', r.kpi.durata_simulazione_s === 0 && r.traj.duration > 0,
  'durata della scena ' + r.traj.duration + ' s (serve a non dividere per zero), durata simulata ' + r.kpi.durata_simulazione_s);
check('le chiavi dei numeri restano (chi le legge non cade), tutte a zero',
  Object.values(r.kpi).every((v) => v === 0) && Object.keys(r.kpi).length === 8);

console.log('\n3. nessuna inquadratura da aeroporto');
const hk = bundle.slice(bundle.indexOf('hK=function(){let D=['), bundle.indexOf('];let O=window.__veritasInitialCameras'));
check('resta solo «global»', (hk.match(/\{id:"/g) || []).length === 1 && hk.includes('{id:"global"'));
for (const parola of ['Security Scan', 'Boarding', 'Gate A1 Close', 'Check-in', 'Attesa 12m', 'Dettaglio Varco'])
  check('nessuna inquadratura «' + parola + '»', !bundle.includes(parola));

console.log(ko ? '\n' + ko + ' PROVE FALLITE' : '\ntutte le prove passate');
process.exit(ko ? 1 : 0);
