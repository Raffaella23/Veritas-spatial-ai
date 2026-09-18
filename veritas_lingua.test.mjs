// Lo strato della lingua:   node veritas_lingua.test.mjs
//
// Raffaella, 18/09/2026: «una parte dell'interfaccia è ancora metà in italiano
// e metà in inglese». Le scritte qui sotto sono quelle trovate quel giorno
// dall'inventario nel banco (tutte le scritte visibili, piattaforma in inglese
// e poi in italiano): ognuna deve avere la sua forma nell'altra lingua.
import { traduci, PAROLE, FORME } from './veritas_lingua.js';

let ko = 0;
const check = (n, ok, d = '') => { console.log((ok ? '  ok  ' : ' FAIL ') + n + (d ? '   ' + d : '')); if (!ok) ko++; };

console.log('1. il dizionario');
check('ogni voce ha le due lingue, diverse fra loro', PAROLE.every(([it, en]) => it && en && it !== en));
const forme = new Map();
let doppie = 0;
for (const [it, en, misto] of PAROLE) for (const f of [it, en, misto]) if (f) { if (forme.has(f) && forme.get(f) !== it) doppie++; forme.set(f, it); }
check('nessuna scritta con due traduzioni diverse', doppie === 0);

console.log('\n2. le scritte italiane viste con la piattaforma in inglese (inventario del 18/09)');
const SPIA = /\b(della|delle|nella|sulla|non|progetto|simulazione|vista|pianta|clicca|mancano|dati|leggi|parla|togli|persone|scena|seduto|vie|esodo|carica|connessione|motore|massimizza|avvia|costruisce)\b/i;
for (const t of ['Parla con EIDETICA', 'Leggi lo spazio', 'Cosa si vede', 'Chi sta seduto', 'Vie di esodo e flusso',
  'Togli dal modello', 'Persone in scena', 'KPI • LIVE DA PYTHON CORE', '◻︎ 2 dati di progetto', '⤢  MASSIMIZZA',
  "Connessione al motore fisico reale (Render)... se e' inattivo da un po' puo' richiedere fino a 60s",
  'Mancano dati senza i quali alcune verifiche non hanno una soglia. Clicca per compilarli.',
  'Carica Gaussian Splat (.ply .splat .ksplat .spz .sog)', '▶ Avvia simulazione',
  'Costruisce la simulazione su questo spazio e la fa partire', 'EIDETICA · quello che vedo', "1/14  pianta dall'alto"]) {
  const en = traduci(t, 'en');
  check('«' + t.slice(0, 48) + '» in inglese', en != null && !SPIA.test(en), String(en).slice(0, 60));
}

console.log('\n3. le scritte inglesi viste con la piattaforma in italiano');
for (const t of ['GLOBAL', 'Top Down 80m', 'kpi_report.json + trajectory', 'TRAJECTORY •', 'FRAMES •', 'NODES', 'KPI • LIVE DA PYTHON CORE', '% • FRAME']) {
  const it = traduci(t, 'it');
  check('«' + t + '» in italiano', it != null && it !== t, String(it));
}

console.log('\n4. i numeri e i segni restano dove sono');
check('«◻︎ 2 dati di progetto» → «◻︎ 2 project details»', traduci('◻︎ 2 dati di progetto', 'en') === '◻︎ 2 project details');
check('uno solo al singolare, nelle due lingue', traduci('◻︎ 1 dati di progetto', 'en') === '◻︎ 1 project detail' && traduci('◻︎ 1 project detail', 'it') === '◻︎ 1 dato di progetto');
check('il segno davanti resta: «▶ Avvia simulazione» → «▶ Start simulation»', traduci('▶ Avvia simulazione', 'en') === '▶ Start simulation');
check('«⤢  MASSIMIZZA» → «⤢ MAXIMIZE»', traduci('⤢  MASSIMIZZA', 'en') === '⤢ MAXIMIZE');
check('la vista dell\'anteprima tiene il suo numero', traduci("1/14  pianta dall'alto", 'en') === '1/14  top-down plan');

console.log('\n5. andata e ritorno, e niente traduzioni indovinate');
let giri = 0, rotti = 0;
for (const [it, en, misto] of PAROLE) {
  for (const f of [it, en, misto]) {
    if (!f) continue;
    giri++;
    const a = traduci(f, 'en'), b = traduci(a, 'it'), c = traduci(b, 'en');
    if (a !== en || b !== it || c !== en) rotti++;
  }
}
check('ogni forma va e torna uguale (' + giri + ' forme)', rotti === 0, rotti ? rotti + ' rotte' : '');
check('una scritta sconosciuta non si tocca', traduci('banco di prova', 'en') === null && traduci('Ambiente 3 · 23 m²', 'en') === null);
check('le forme con i numeri sono dichiarate', FORME.length >= 2);

console.log(ko ? '\n' + ko + ' PROVE FALLITE' : '\ntutte le prove passate');
process.exit(ko ? 1 : 0);
