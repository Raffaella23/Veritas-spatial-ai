// Prova del confronto normativo:  node veritas_normative.test.mjs
//
// Il confronto e' la parte che finisce in un documento firmato, quindi va
// provata su casi in cui la risposta giusta si sa in anticipo. I numeri del
// primo caso sono quelli veri del terminal del 12/08/2026.
//
// Il modulo non viene ricopiato: si estrae da index.html cosi' com'e'.
import fs from 'node:fs';
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const ancora = html.indexOf('// VERITAS — Riferimenti normativi');
const i0 = html.indexOf('(function () {', ancora);
const i1 = html.indexOf('</script>', i0);
if (ancora < 0 || i0 < 0 || i1 < 0) { console.error('Ancore non trovate.'); process.exit(2); }
globalThis.window = {};
new Function('window', 'console', html.slice(i0, i1))(globalThis.window, { log(){} });
const N = globalThis.window.__veritasNormative;

let ko = 0; const check = (n, ok, d='') => { console.log((ok?'  ok  ':' FAIL ')+n+(d?'   '+d:'')); if(!ok) ko++; };

console.log('la tabella');
check('soglie caricate', N.REGOLE.length >= 9, N.REGOLE.length + ' regole');
check('due giurisdizioni', N.giurisdizioni().sort().join(',') === 'IT,US', N.giurisdizioni().join(','));
check('ogni regola cita la fonte', N.REGOLE.every((r) => r.fonte && r.riferimento));
check('ogni regola ha unita di misura', N.REGOLE.every((r) => r.unita));
check('operatori solo >= o <=', N.REGOLE.every((r) => r.operatore === '>=' || r.operatore === '<='));
check('TUTTE nascono da validare', N.REGOLE.every((r) => r.validato === false));
check('id univoci', new Set(N.REGOLE.map((r) => r.id)).size === N.REGOLE.length);

console.log('\nil terminal vero del 12/08/2026 (varchi da 0.50 m in su)');
const misureVere = {
  larghezza_varco_m: [0.50, 0.62, 0.88, 1.10, 1.35, 2.10],
  larghezza_strettoia_m: [0.50, 0.55, 0.71, 0.94, 1.20],
};
const esiti = N.valuta(misureVere, { ambito: 'accessibilita' });
const perId = Object.fromEntries(esiti.map((e) => [e.regola.id, e]));
check('porta IT (>= 0.80): 2 non conformi', perId.it_dm236_porta.difformi === 2, perId.it_dm236_porta.difformi + ' su 6');
check('il peggiore e 0.50 m', perId.it_dm236_porta.peggiore === 0.50, String(perId.it_dm236_porta.peggiore));
check('corridoio IT (>= 1.00): 4 non conformi', perId.it_dm236_corridoio.difformi === 4, perId.it_dm236_corridoio.difformi + ' su 5');
check('percorso ADA (>= 0.915): 3 non conformi', perId.us_ada_percorso.difformi === 3, perId.us_ada_percorso.difformi + ' su 5');
check('rotazione: non misurabile (non la calcoliamo ancora)', perId.it_dm236_rotazione.stato === 'non_misurabile');
check('pendenza: non misurabile', perId.it_dm236_rampa.stato === 'non_misurabile');

console.log('\nfrasi prodotte');
const frase = N.racconta(perId.it_dm236_porta);
check('la frase cita la norma', /DM 236\/1989/.test(frase), frase.slice(0, 90) + '...');
check('la frase cita l articolo', /art\. 8\.1\.1/.test(frase));
check('la frase da il peggiore', /0\.50/.test(frase));
check('la frase conforme si distingue', /^✅/.test(N.racconta(N.valuta({larghezza_varco_m:[1.2,1.5]}, {ambito:'accessibilita'})[0])));

console.log('\nedificio conforme: nessun allarme');
const ok = N.valuta({ larghezza_varco_m: [0.90, 1.20], larghezza_strettoia_m: [1.10, 1.60] }, { ambito: 'accessibilita' });
check('nessun difforme', ok.filter((e) => e.stato === 'difforme').length === 0);

console.log('\ncasi limite');
check('misure assenti -> non misurabile, non errore',
  N.valuta({}, { ambito: 'accessibilita' }).every((e) => e.stato === 'non_misurabile'));
check('misure sporche ignorate',
  N.valuta({ larghezza_varco_m: [null, NaN, 'x', Infinity] }, { ambito: 'accessibilita' })[0].stato === 'non_misurabile');
check('filtro per giurisdizione',
  N.valuta(misureVere, { ambito: 'accessibilita', giurisdizione: 'IT' }).every((e) => e.regola.giurisdizione === 'IT'));
check('esattamente sulla soglia = conforme', N.confronta(0.80, '>=', 0.80));
check('un millimetro sotto = difforme', !N.confronta(0.799, '>=', 0.80));
check('pendenza: 8.0 conforme, 8.1 no', N.confronta(8.0, '<=', 8) && !N.confronta(8.1, '<=', 8));

console.log('\navvertenza di validazione');
const avv = N.avvertenzaValidazione(esiti);
check('c e ed e esplicita', avv && /non sono ancora state validate/.test(avv));
check('non dichiara conformita', avv && /non come attestazione di conformit/.test(avv));

console.log(ko ? `\n${ko} PROVE FALLITE` : '\ntutte le prove passano');
process.exit(ko?1:0);
