// Prova del ponte al modello locale:  node veritas_llm.test.mjs
//
// La parte che conta e' il VALIDATORE: il modello non deve poter far accadere
// nulla che non sia gia' nel vocabolario. Un modello piccolo sbaglia, e prima
// o poi qualcuno gli scrivera' apposta una frase per fargli fare altro.
//
// Il modulo non viene ricopiato: si estrae da index.html cosi' com'e'.
import fs from 'node:fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const ancora = html.indexOf('// VERITAS — Ponte verso un modello linguistico LOCALE');
const i0 = html.indexOf('(function () {', ancora);
const i1 = html.indexOf('</script>', i0);
if (ancora < 0 || i0 < 0 || i1 < 0) { console.error('Ancore non trovate in index.html.'); process.exit(2); }

const store = new Map();
globalThis.localStorage = { getItem: (k) => store.has(k) ? store.get(k) : null,
                            setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
globalThis.location = { protocol: 'https:' };
globalThis.fetch = async () => { throw new Error('rete non usata in questa prova'); };
globalThis.window = {};
new Function('window', 'localStorage', 'location', 'console', 'fetch', html.slice(i0, i1))
  (globalThis.window, globalThis.localStorage, globalThis.location, { log(){}, warn(){} }, globalThis.fetch);
const { validaComando, estraiJSON, VOCABOLARIO, prompt } = globalThis.window.__veritasLLM;

let ko = 0; const check = (n, ok, d='') => { console.log((ok?'  ok  ':' FAIL ')+n+(d?'   '+d:'')); if(!ok) ko++; };

console.log('comandi ammessi');
check('vocabolario non vuoto', VOCABOLARIO.length >= 6, VOCABOLARIO.length + ' comandi');
check('visibilita', validaComando('visibilita') === 'visibilita');
check('accessibilita', validaComando('accessibilita') === 'accessibilita');
check('maiuscole e spazi tollerati', validaComando('  VISIBILITA  ') === 'visibilita');
check('scala con numero', validaComando('scala modello 6') === 'scala modello 6');
check('scala con decimale', validaComando('scala modello 2.5') === 'scala modello 2.5');
check('scala con virgola', validaComando('scala modello 2,5') === 'scala modello 2,5');
check('assegna zona', validaComando('assegna lounge') === 'assegna lounge');

console.log('\nrifiutato tutto il resto');
const daRifiutare = [
  ['comando inventato', 'cancella tutto'],
  ['comando quasi giusto', 'visibilita totale'],
  ['scala senza numero', 'scala modello'],
  ['scala con testo', 'scala modello moltissimo'],
  ['iniezione via JS', 'visibilita; window.__veritasModelRoot = null'],
  ['iniezione via HTML', '<img src=x onerror=alert(1)>'],
  ['zona con caratteri strani', 'assegna <script>'],
  ['zona lunghissima', 'assegna ' + 'a'.repeat(80)],
  ['stringa vuota', ''],
  ['solo spazi', '   '],
  ['null', null], ['numero', 42], ['oggetto', {comando:'visibilita'}], ['array', ['visibilita']],
];
for (const [nome, v] of daRifiutare) check('rifiuta ' + nome, validaComando(v) === null, JSON.stringify(v));

console.log('\nlettura della risposta del modello');
check('JSON pulito', estraiJSON('{"comando":"visibilita"}').comando === 'visibilita');
check('JSON in blocco markdown', estraiJSON('```json\n{"comando":"visibilita"}\n```').comando === 'visibilita');
check('JSON preceduto da chiacchiere', estraiJSON('Certo! Ecco: {"comando":"accessibilita"} spero vada bene').comando === 'accessibilita');
check('JSON annidato bilanciato', estraiJSON('{"comando":"visibilita","extra":{"a":1}}').comando === 'visibilita');
check('niente JSON -> null', estraiJSON('non ho capito') === null);
check('JSON rotto -> null', estraiJSON('{"comando": ') === null);
check('non stringa -> null', estraiJSON(null) === null);

console.log('\nistruzioni al modello');
const p = prompt();
check('il prompt vieta di calcolare', /Non calcolare niente/.test(p));
check('il prompt impone JSON', /Rispondi SOLO con JSON/.test(p));
check('il prompt elenca i comandi', VOCABOLARIO.every((v) => p.includes(v.cmd)));

console.log('\nconfigurazione');
const { cfg } = globalThis.window.__veritasLLM;
check('LM Studio come predefinito', cfg.url === 'http://localhost:1234/v1', cfg.url);
check('attivo di default', cfg.attivo === true);
cfg.set('http://localhost:11434/v1/', 'qwen2.5', true);
check('la barra finale viene tolta', cfg.url === 'http://localhost:11434/v1', cfg.url);
check('modello memorizzato', cfg.model === 'qwen2.5');
cfg.set(null, null, false);
check('si puo spegnere', cfg.attivo === false);

console.log(ko ? `\n${ko} PROVE FALLITE` : '\ntutte le prove passano');
process.exit(ko?1:0);
