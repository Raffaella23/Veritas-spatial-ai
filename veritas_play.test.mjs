// Il cancello del play:  node veritas_play.test.mjs
//
// Segnalato da Raffaella il 18/08/2026: «la simulazione deve partire solo
// quando premi play, ora parte immediatamente anche prima del caricamento del
// modello».
//
// La causa era un bottone che faceva due mestieri. Quello del pannello di
// creazione progetto si chiamava "Avvia simulazione" e, oltre ad aprire lo
// spazio di lavoro, dichiarava avviata la simulazione — quando l'unica cosa
// caricata erano i sei punti cablati nel bundle, di un aeroporto che non e'
// quello dell'utente.
//
// Qui si verifica la regola, non l'implementazione: NIENTE si muove finche'
// non c'e' un modello vero E qualcuno non preme play.
import fs from 'node:fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
let ko = 0;
const check = (n, ok, d = '') => { console.log((ok ? '  ok  ' : ' FAIL ') + n + (d ? '   ' + d : '')); if (!ok) ko++; };

// ---------------------------------------------------------------------------
console.log('1. il bottone del pannello iniziale APRE e basta');
// Guardia sul sorgente: e' esattamente la riga che era stata aggiunta e che
// causava il difetto. Se qualcuno la rimette, questa prova lo dice subito.
{
  const a = html.indexOf('card.querySelector("#vs-start-btn").onclick');
  const b = html.indexOf('injectReportButton();', a);
  check('il gestore del bottone iniziale esiste ancora', a > 0 && b > a);
  const corpo = html.slice(a, b);
  check('NON dichiara avviata la simulazione',
    !/__veritasSimStarted\s*=\s*true/.test(corpo),
    'e la riga che faceva partire tutto prima del modello');
  check('apre comunque lo spazio di lavoro', /overlay\.classList\.add\("hidden"\)/.test(corpo));
  check('e il bottone non promette piu di avviare',
    !/settings_start_btn:\s*"[^"]*[Aa]vvia simulazione/.test(html)
    && !/settings_start_btn:\s*"[^"]*Start simulation/.test(html),
    (html.match(/settings_start_btn:\s*"[^"]*"/g) || []).join('  '));
}

// ---------------------------------------------------------------------------
console.log('\n2. il cancello vero: modello caricato + play premuto');

// Un DOM finto, quel tanto che basta alle funzioni estratte.
function creaDom() {
  const perId = new Map();
  const nodo = (tag) => {
    const el = {
      tagName: tag, id: '', style: { cssText: '' }, children: [],
      _html: '', onclick: null,
      get innerHTML() { return this._html; },
      set innerHTML(v) {
        this._html = v;
        // Registra i figli che dichiarano un id, cosi' getElementById li trova
        // come farebbe il browser dopo l'assegnazione.
        for (const m of v.matchAll(/id="([^"]+)"/g)) {
          const figlio = { id: m[1], onclick: null, remove() { perId.delete(m[1]); } };
          this.children.push(figlio); perId.set(m[1], figlio);
        }
      },
      appendChild(c) { this.children.push(c); if (c.id) perId.set(c.id, c); },
      remove() { if (this.id) perId.delete(this.id); },
      querySelectorAll: () => [],
      closest: () => null,
    };
    return el;
  };
  return {
    body: nodo('body'),
    createElement: nodo,
    getElementById: (id) => perId.get(id) || null,
    querySelectorAll: () => [],
    _perId: perId,
  };
}

const a = html.indexOf('  function veritasShowPlayReady() {');
const b = html.indexOf('  }, 800);', a) + '  }, 800);'.length;
if (a < 0 || b < a) { console.error('Ancore non trovate: il cancello e cambiato.'); process.exit(2); }

function monta(stato) {
  const document = creaDom();
  const window = { __veritasSimStarted: false, __veritasPassengerGroups: null, ...stato.window };
  let tick = null;
  const setInterval = (f) => { tick = f; return 1; };
  const currentNodes = stato.nodi || [];
  const applyNodesToScene = () => { window.__applicato = true; };
  const veritasApplyPassengerScale = () => {};
  new Function('window', 'document', 'setInterval', 'currentNodes',
    'applyNodesToScene', 'veritasApplyPassengerScale', 'console',
    html.slice(a, b))(window, document, setInterval, currentNodes,
      applyNodesToScene, veritasApplyPassengerScale, { log() {} });
  return { window, document, tick };
}

const nodi = [{ type: 'spawn', pos: [0, 0, 0] }, { type: 'gate', pos: [10, 0, 0] }];

{ // pagina appena aperta: nessun modello
  const s = monta({ nodi: [] });
  s.tick();
  check('senza modello NON compare il play', !s.document.getElementById('veritas-play-ready'));
  check('e la simulazione resta ferma', s.window.__veritasSimStarted === false);
}

{ // modello caricato ma una zona sola: non e' un percorso
  const s = monta({ nodi: [nodi[0]], window: { __veritasModelRoot: {} } });
  s.tick();
  check('con una zona sola il play non compare', !s.document.getElementById('veritas-play-ready'));
}

{ // modello caricato e zone assegnate: adesso si puo'
  const s = monta({ nodi, window: { __veritasModelRoot: {} } });
  s.tick();
  const badge = s.document.getElementById('veritas-play-ready');
  check('con modello e zone il play COMPARE', !!badge);
  check('ma finche non lo premi la simulazione e ferma', s.window.__veritasSimStarted === false);

  const bottone = s.document.getElementById('veritas-play-ready-btn');
  check('il bottone play esiste', !!bottone && typeof bottone.onclick === 'function');
  if (bottone && bottone.onclick) {
    bottone.onclick();
    check('premuto play, la simulazione parte', s.window.__veritasSimStarted === true);
    check('e la scena viene ricalcolata', s.window.__applicato === true);
  }
}

// ---------------------------------------------------------------------------
console.log('\n3. i passeggeri non si vedono camminare prima del play');
{
  const visti = [];
  const gruppi = [{ group: { visible: true } }, { group: { visible: true } }];
  gruppi.forEach = Array.prototype.forEach.bind(gruppi);
  const s = monta({ nodi, window: { __veritasModelRoot: {}, __veritasPassengerGroups: gruppi } });
  s.tick();
  check('a simulazione ferma i passeggeri sono nascosti',
    gruppi.every((g) => g.group.visible === false),
    gruppi.map((g) => g.group.visible).join(','));

  s.window.__veritasSimStarted = true;
  s.tick();
  check('dopo il play tornano visibili', gruppi.every((g) => g.group.visible === true));
  visti.push(1);
}

// ---------------------------------------------------------------------------
console.log('\n4. il comando "avvia" scritto in chat preme il play, non l apertura');
{
  const i = html.indexOf('(avvia|avviare|parti|play|start)');
  const corpo = html.slice(i, html.indexOf('return;', i));
  check('non apre il pannello iniziale al posto di avviare',
    !/clickIfExists\("vs-start-btn"\)/.test(corpo));
  check('preme il play vero', /clickIfExists\("veritas-play-ready-btn"\)/.test(corpo));
}

console.log('\n' + (ko ? ko + ' PROVE FALLITE' : 'tutte le prove passate'));
process.exit(ko ? 1 : 0);
