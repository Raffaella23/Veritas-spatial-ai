// Lo strato della lingua:   node veritas_lingua.test.mjs
//
// Raffaella, 18/09/2026: «una parte dell'interfaccia è ancora metà in italiano
// e metà in inglese». Le scritte qui sotto sono quelle trovate quel giorno
// dall'inventario nel banco (tutte le scritte visibili, piattaforma in inglese
// e poi in italiano): ognuna deve avere la sua forma nell'altra lingua.
import { traduci, traduciMessaggio, PAROLE, FORME } from './veritas_lingua.js';

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
check('una scritta sconosciuta non si tocca', traduci('banco di prova', 'en') === null && traduci('Una scritta qualunque', 'en') === null);
check('i nomi neutri si traducono, ma solo interi: «Ambiente 3 · 23 m²» sì, dentro una frase no',
  traduci('Ambiente 3 · 23 m²', 'en') === 'Room 3 · 23 m²' && traduci('Accesso 1', 'en') === 'Entrance 1' && traduci('Accesso 1, due indizi', 'en') === null);
check('le forme con i numeri sono dichiarate', FORME.length >= 2);

console.log('\n6. la conversazione, frase per frase (i messaggi visti nel banco il 18/09)');
const casi = [
  ["EIDETICA: Ho ricevuto il modello. Prima sistemo l'ambiente: scala e appoggio a terra.",
    'EIDETICA: I received the model. First I set up the environment: scale and ground placement.'],
  ["EIDETICA: Ho riconosciuto un ambiente articolato: 9 ambienti separati da 6 varchi reali, su 2 livelli. Area calpestabile 3364 m2. Passaggio piu' stretto: 0.50 m.",
    'EIDETICA: I recognized an articulated space: 9 rooms separated by 6 real openings, on 2 levels. Walkable area 3364 m². Narrowest passage: 0.50 m.'],
  ['EIDETICA: Non ho potuto guardare lo spazio (il modello che vede non risponde (Failed to fetch)). Uso solo le misure, come prima.',
    'EIDETICA: I could not look at the space (the vision model does not respond (Failed to fetch)). I use only the measures, as before.'],
  ["EIDETICA: Ho assegnato 7 zone su 7 misurate: Zona 1 · 55 m² (55 m²) → Zona 2 · 27 m² (27 m²). Nessuna aveva un nome riconoscibile nel modello, quindi i ruoli vengono dall'ordine del flusso. Se un ruolo e' sbagliato dimmelo: `assegna <zona>` lo cambia.",
    'EIDETICA: I assigned 7 zones out of 7 measured: Zone 1 · 55 m² (55 m²) → Zone 2 · 27 m² (27 m²). None had a recognizable name in the model, so the roles come from the order of the flow. If a role is wrong, tell me: `assegna <zona>` changes it.'],
  ["EIDETICA: Ho trovato 3 ingressi: Accesso 1, 2 indizi d'accordo (la segnaletica del modello + gli oggetti in fila); Accesso 2, 2 indizi d'accordo (gli oggetti in fila + la segnaletica del modello). Un ingresso e dove piu indizi diversi cadono nello stesso posto.",
    "EIDETICA: I found 3 entrances: Entrance 1, 2 agreeing clues (the model's signage + objects in a row); Entrance 2, 2 agreeing clues (objects in a row + the model's signage). An entrance is where several different clues fall in the same place."],
  ['EIDETICA: Nel modello ci sono 97 figure umane in piedi, alte 0.322 m. Le ho portate a 1.7 m: modello ingrandito 5.28 volte PRIMA di misurare qualunque cosa.',
    'EIDETICA: The model contains 97 standing human figures, 0.322 m tall. I brought them to 1.7 m: model scaled up 5.28 times BEFORE measuring anything.'],
];
for (const [it, en] of casi) {
  const r = traduciMessaggio(it);
  check('«' + it.slice(10, 58) + '...»', r.testo === en && r.restano.length === 0, r.testo === en ? '' : r.testo.slice(0, 140));
}
const aCapo = traduciMessaggio("EIDETICA: Ho guardato le cose che stanno nello spazio: 549 gruppi di oggetti ripetuti su 2416 pezzi. Si addensano in 20 posti.\n  - una riga che non conosco\n  - 2 oggetti uguali sparsi, 6.48 x 1.14 x 9.19 m l'uno (oggetti staccati da terra, appesi o montati)\nCosa siano lo dice l'occhio: qui ho solo misurato.");
check('le righe restano righe; una riga che non conosco resta com\'e\', intera',
  aCapo.testo === "EIDETICA: I looked at the things in the space: 549 groups of repeated objects out of 2416 pieces. They cluster in 20 places.\n  - una riga che non conosco\n  - 2 identical objects scattered, 6.48 x 1.14 x 9.19 m each (objects off the ground, hanging or mounted)\nWhat they are, the eye will tell: here I only measured."
  && aCapo.restano.length === 1, aCapo.testo.slice(0, 160));
const misto = traduciMessaggio('EIDETICA: Una frase che non conosco. Ho ricevuto il modello.');
check('una frase sconosciuta resta intera in italiano, le altre si traducono',
  misto.testo === 'EIDETICA: Una frase che non conosco. I received the model.' && misto.restano.length === 1);
check('un testo che non e\' un messaggio non si tocca', traduciMessaggio('Ho ricevuto il modello.').testo === 'Ho ricevuto il modello.');

console.log(ko ? '\n' + ko + ' PROVE FALLITE' : '\ntutte le prove passate');
process.exit(ko ? 1 : 0);
