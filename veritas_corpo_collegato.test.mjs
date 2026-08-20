// Il collegamento vero: `index.html` fa DAVVERO passare gli agenti dal corpo?
//
//     node veritas_corpo_collegato.test.mjs
//
// `veritas_corpo.test.mjs` prova il modulo. Questa prova qualcosa di diverso e
// piu' importante: che il PROGRAMMA lo usi. Su questo progetto i difetti gravi
// sono silenziosi — un modulo giusto collegato male non da' nessun errore in
// console, si vede solo guardando lo schermo, e a quel punto e' Raffaella a
// doverlo scoprire.
//
// Le funzioni non sono ricopiate: si estraggono da `index.html` per ancore
// testuali e si eseguono su stub minimi. Se cambia una firma l'ancora non
// combacia piu' e la prova fallisce subito, invece di provare una copia
// vecchia e passare per sbaglio.

import fs from 'node:fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let ko = 0;
const check = (n, ok, d = '') => {
  console.log((ok ? '  ok  ' : ' FAIL ') + n + (d ? '   ' + d : ''));
  if (!ok) ko++;
};

// =============================================================================
console.log('\n— la libreria e dichiarata —');
// =============================================================================
check('rapier e nell importmap',
  /"@dimforge\/rapier3d-compat":\s*"https:\/\/[^"]+\/rapier\.mjs"/.test(html));
check('e la variante -compat, quella col wasm incorporato',
  /rapier3d-compat@[\d.]+\/dist\/rapier\.mjs/.test(html),
  'senza `dist/` il CDN restituisce 404, e il motore fisico non parte mai');
check('il banco locale sa vendorizzarla',
  /vendor\/rapier\/rapier\.mjs/.test(fs.readFileSync(new URL('./banco/monta.sh', import.meta.url), 'utf8')));

// =============================================================================
console.log('\n— il modulo e in pagina e si lega a window —');
// =============================================================================
check('veritas_corpo.js e inlinato', html.includes('window.__veritasCorpo = {'));
check('espone filtraTraiettoria', /window\.__veritasCorpo = \{[\s\S]{0,600}?filtraTraiettoria/.test(html));
check('espone ultimoEsito e racconta',
  /window\.__veritasCorpo = \{[\s\S]{0,600}?ultimoEsito/.test(html)
  && /window\.__veritasCorpo = \{[\s\S]{0,600}?racconta/.test(html));
check('si aggancia da solo al caricamento del modello',
  /window\.__veritasOnModelLoaded = function \(radice\)[\s\S]{0,3000}?preparaDaScena/.test(html));
// ⚠️ Non basta cercare il nome del flag: il modulo lo NOMINA in un commento,
//    apposta per spiegare perche' non si usa. Si guarda la chiamata vera —
//    `trimesh` deve avere due argomenti, vertici e indici, e nessun terzo.
check('il collisore dell edificio non riceve flag',
  /ColliderDesc\.trimesh\(geometria\.positions, geometria\.indices\)/.test(html),
  'misurato: con FIX_INTERNAL_EDGES i corpi cadono attraverso la mesh (-715 m)');
check('e non c e nessun altro trimesh con flag',
  !/ColliderDesc\.trimesh\([^)]*,[^)]*,[^)]*\)/.test(html));

// =============================================================================
console.log('\n— il punto di innesto: DOVE viene chiamato —');
// =============================================================================
// E' la domanda che conta. Il filtro deve stare DOPO che le due sorgenti si
// sono unite (motore Python e generatore JS) e PRIMA che i fotogrammi finiscano
// nella traiettoria in uso. Un solo punto, altrimenti si corregge meta' dei
// casi senza accorgersene.
const iBackend = html.indexOf('let fresh = await veritasTryBackendSimulate(');
const iLocale = html.indexOf('if (!fresh) fresh = generateTrajectory(currentNodes);');
const iCorpo = html.indexOf('fresh = await veritasApplicaCorpo(fresh);');
const iPush = html.indexOf('traj.frames.push(...fresh.frames);');

check('il ponte veritasApplicaCorpo esiste', html.includes('async function veritasApplicaCorpo('));
check('viene chiamato una volta sola',
  (html.match(/= await veritasApplicaCorpo\(/g) || []).length === 1,
  (html.match(/= await veritasApplicaCorpo\(/g) || []).length + ' chiamate');
check('DOPO la traiettoria del motore Python', iCorpo > iBackend && iBackend > 0);
check('DOPO il generatore JS locale', iCorpo > iLocale && iLocale > 0);
check('PRIMA che i fotogrammi entrino nella traiettoria in uso', iCorpo < iPush && iPush > 0);

// =============================================================================
console.log('\n— il ponte si comporta bene: lo si esegue —');
// =============================================================================
// Si estrae la funzione dall'HTML e la si fa girare su stub minimi.
const a = html.indexOf('  async function veritasApplicaCorpo(traiettoria) {');
const b = html.indexOf('\n  }', a);
if (a < 0 || b < 0) {
  console.error('Ancora non trovata: il ponte e cambiato.');
  process.exit(2);
}
const sorgente = html.slice(a, b + 4);

function ponte(finestra) {
  const fabbrica = new Function('window', 'console',
    sorgente + '\n return veritasApplicaCorpo;');
  return fabbrica(finestra, { log() {}, warn() {}, error() {} });
}
const PIANO = { frames: [{ t: 0, agents: [{ id: 0, pos: [1, 0, 1] }] }] };
const CAMMINATO = { frames: [{ t: 0, agents: [{ id: 0, pos: [2, 0, 2] }] }] };

{
  // Il caso buono: il corpo ha lavorato, si usa la sua traiettoria.
  const detti = [];
  const f = ponte({
    __veritasCorpo: {
      filtraTraiettoria: async () => CAMMINATO,
      ultimoEsito: () => ({ ok: true, corpi: 1, mosse: 1, dentroUnSolido: 0, scostamentoMediano: 0.1, ms: 3 }),
      racconta: () => 'ho fatto camminare 1 corpo',
    },
    __veritasAnnounce: (m) => detti.push(m),
  });
  const out = await f(PIANO);
  check('con il corpo attivo restituisce la traiettoria CAMMINATA', out === CAMMINATO);
  check('e lo dice in chat, non solo in console', detti.length === 1, detti[0] || '(niente)');
}
{
  // Il modulo non c'e' (CDN irraggiungibile, blocco rimosso): si torna a ieri.
  const f = ponte({});
  const out = await f(PIANO);
  check('senza il modulo restituisce il piano intatto', out === PIANO);
}
{
  // Il mondo fisico non e' stato costruito: si torna a ieri, dichiarandolo.
  const detti = [];
  const f = ponte({
    __veritasCorpo: {
      filtraTraiettoria: async (t) => t,
      ultimoEsito: () => ({ ok: false, perche: 'nessun mondo fisico' }),
      racconta: (e) => 'non applicato: ' + e.perche,
    },
    __veritasAnnounce: (m) => detti.push(m),
  });
  const out = await f(PIANO);
  check('senza mondo fisico restituisce il piano intatto', out === PIANO);
  check('e dichiara perche invece di tacere', /non applicato/.test(detti[0] || ''), detti[0] || '(niente)');
}
{
  // Il motore fisico esplode: il programma NON deve restare senza passeggeri.
  const f = ponte({
    __veritasCorpo: { filtraTraiettoria: async () => { throw new Error('wasm morto'); } },
  });
  const out = await f(PIANO);
  check('se il motore fisico esplode si torna al piano, non al vuoto', out === PIANO);
}
{
  // Restituisce null/undefined: stesso discorso.
  const f = ponte({ __veritasCorpo: { filtraTraiettoria: async () => null } });
  const out = await f(PIANO);
  check('se restituisce nulla si torna al piano', out === PIANO);
}
{
  // La chat non c'e' (nessun __veritasAnnounce): non deve rompersi.
  const f = ponte({
    __veritasCorpo: {
      filtraTraiettoria: async () => CAMMINATO,
      ultimoEsito: () => ({ ok: true, corpi: 1, mosse: 1, dentroUnSolido: 0, scostamentoMediano: 0, ms: 1 }),
      racconta: () => 'x',
    },
  });
  const out = await f(PIANO);
  check('senza la chat in pagina non si rompe', out === CAMMINATO);
}

// =============================================================================
console.log('\n— il blocco 3 non e stato toccato —');
// =============================================================================
{
  // Le stesse regole raw-text del browser, come impone la regola di progetto:
  // il bundle minificato contiene stringhe che sembrano tag e mandano in tilt
  // le regex.
  const { execFileSync } = await import('node:child_process');
  const out = execFileSync('python3', ['-c', `
import hashlib
from html.parser import HTMLParser
class SE(HTMLParser):
    def __init__(self):
        super().__init__(); self.s=[]; self.i=False; self.b=[]
    def handle_starttag(self,t,a):
        if t=='script': self.i=True; self.b=[]
    def handle_endtag(self,t):
        if t=='script' and self.i: self.i=False; self.s.append(''.join(self.b)); self.b=[]
    def handle_data(self,d):
        if self.i: self.b.append(d)
p=SE(); p.feed(open('index.html',encoding='utf-8').read())
print(hashlib.sha256(p.s[3].encode()).hexdigest()[:16])
print(len(p.s))
`], { encoding: 'utf8' }).trim().split('\n');
  check('blocco 3 byte-per-byte quello di sempre', out[0] === 'eedd9935ea908fd3', out[0]);
  console.log('       ' + out[1] + ' blocchi <script> in pagina');
}

console.log(ko ? `\n${ko} PROVE FALLITE\n` : '\ntutte le prove passano\n');
process.exit(ko ? 1 : 0);
