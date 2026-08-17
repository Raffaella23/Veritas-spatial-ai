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
check('le due giurisdizioni cogenti ci sono', ['IT','US'].every((g) => N.giurisdizioni().includes(g)), N.giurisdizioni().join(','));
// Fruin e Hall non hanno giurisdizione: sono ricerca, non legge di un paese.
// Il segnaposto '—' e' ammesso SOLO per le regole non cogenti.
check('nessuna regola cogente senza giurisdizione',
  N.REGOLE.filter((r) => r.giurisdizione === '—').every((r) => r.cogente === false));
check('e nessuna non cogente spacciata per norma',
  N.REGOLE.filter((r) => r.ambito === 'affollamento').every((r) => r.cogente === false));
check('le regole cogenti restano tali', N.REGOLE.filter((r) => r.ambito !== 'affollamento').every((r) => r.cogente !== false));
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


// ---------------------------------------------------------------------------
// Soglie condizionate ai dati di progetto (aggiunte 12/08/2026)
// ---------------------------------------------------------------------------
console.log('\nsoglie che dipendono da un dato di progetto');
const misureEsodo = { lunghezza_percorso_esodo_m: [42], larghezza_uscita_totale_m: [1.2] };
const senzaDati = N.valuta(misureEsodo, { ambito: 'antincendio', dati: {} });
const idx = Object.fromEntries(senzaDati.map((e) => [e.regola.id, e]));
check('senza rischio dichiarato NON da un verdetto', idx.it_dm1998_percorso.stato === 'dipendenza_mancante');
check('e dice QUALE dato manca', idx.it_dm1998_percorso.manca === 'rischioIncendio');
check('idem per l affollamento', idx.it_dm1998_moduli.stato === 'dipendenza_mancante');
check('le regole non condizionate restano valutate', idx.it_dm1998_uscita.stato !== 'dipendenza_mancante');

console.log('\n42 m di percorso: lo stesso edificio, tre verdetti diversi');
for (const [rischio, atteso] of [['basso','conforme'],['medio','conforme'],['elevato','difforme']]) {
  const e = N.valuta(misureEsodo, { ambito: 'antincendio', dati: { rischioIncendio: rischio } })
             .find((x) => x.regola.id === 'it_dm1998_percorso');
  check(`rischio ${rischio} -> ${atteso} (soglia ${e.soglia} m)`, e.stato === atteso, e.stato);
}

console.log('\naffollamento -> moduli da 0,60 m');
for (const [pax, soglia] of [[50, 0.6], [51, 1.2], [100, 1.2], [101, 1.8], [500, 6]]) {
  const e = N.valuta({ larghezza_uscita_totale_m: [99] }, { ambito: 'antincendio', dati: { affollamento: pax } })
             .find((x) => x.regola.id === 'it_dm1998_moduli');
  check(`${pax} persone -> ${soglia} m`, Math.abs(e.soglia - soglia) < 0.001, String(e.soglia));
}
const stretta = N.valuta({ larghezza_uscita_totale_m: [1.2] }, { ambito: 'antincendio', dati: { affollamento: 200 } })
                 .find((x) => x.regola.id === 'it_dm1998_moduli');
check('200 persone con 1.2 m di uscite: difforme', stretta.stato === 'difforme', `serve ${stretta.soglia} m`);

console.log('\nun dato sbagliato non passa per buono');
for (const v of ['', null, 'altissimo', 0, -5]) {
  const e = N.valuta(misureEsodo, { ambito: 'antincendio', dati: { rischioIncendio: v, affollamento: v } });
  const p = e.find((x) => x.regola.id === 'it_dm1998_percorso');
  check(`valore ${JSON.stringify(v)} -> resta sospesa`, p.stato === 'dipendenza_mancante');
}

console.log('\ncosa dice il pannello');
check('elenca le dipendenze mancanti', N.dipendenzeMancanti(senzaDati).length === 2);
check('ognuna spiega PERCHE serve', N.dipendenzeMancanti(senzaDati).every((d) => d.perche && d.perche.length > 40));
check('ognuna cita la fonte', N.dipendenzeMancanti(senzaDati).every((d) => /DM /.test(d.fonte)));
check('la frase distingue sospesa da non misurabile', /manca un dato di progetto/.test(N.racconta(idx.it_dm1998_percorso)));
check('la frase conforme mostra la soglia RISOLTA, non quella di base',
  /45 m/.test(N.racconta(N.valuta(misureEsodo, { ambito:'antincendio', dati:{rischioIncendio:'medio'} })
    .find((x) => x.regola.id === 'it_dm1998_percorso'))));

console.log(ko ? `\n${ko} PROVE FALLITE` : '\ntutte le prove passano');
process.exit(ko?1:0);
