// Banco di prova per lo scaglionamento delle partenze da traffico aereo reale
// (CLAUDE.md 11.4b). Si esegue con:  node veritas_flights.test.mjs
//
// Le funzioni NON sono ricopiate qui: vengono estratte da index.html cosi'
// come sono e valutate, con i soli appoggi che il browser fornirebbe. Una
// copia si sarebbe scollata dall'originale al primo ritocco, e questo banco
// avrebbe continuato a dichiarare "tutto a posto" su codice non piu' in uso.
//
// L'estrazione cerca due commenti-ancora, non i tag <script>: il blocco 3 di
// index.html e' un bundle minificato che contiene stringhe simili a tag, e
// leggerlo con una regex e' il modo noto per prendere fischi per fiaschi.
import fs from 'node:fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const DA = '  const VERITAS_AVG_PAX_PER_FLIGHT';
const A = '  // Sveglia il backend Render';
const i0 = html.indexOf(DA), i1 = html.indexOf(A);
if (i0 < 0 || i1 < 0 || i1 <= i0) {
  console.error('Ancore non trovate in index.html: il blocco dei voli e stato spostato o rinominato.');
  process.exit(2);
}
const sorgente = html.slice(i0, i1);

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.window = {};
const t = (key, ...a) => key + '(' + a.join(',') + ')';

const api = new Function('t', 'window', 'localStorage', 'console', sorgente + `
  return { veritasScheduleFromArrivals, veritasPeakWindow, veritasStartDelaysFromSchedule,
           veritasSaveFlightSchedule, veritasScheduleDescription, veritasStartDelays };
`)(t, globalThis.window, globalThis.localStorage, { log: () => {} });

let falliti = 0;
const check = (nome, ok, dettaglio = '') => {
  console.log((ok ? '  ok  ' : ' FAIL ') + nome + (dettaglio ? '   ' + dettaglio : ''));
  if (!ok) falliti++;
};

// ---------------------------------------------------------------------------
// Una giornata di arrivi come sono davvero in un hub: non un flusso continuo
// ma BANCHI (wave), gruppi di voli ravvicinati separati da vuoti, perche' le
// compagnie sincronizzano gli arrivi per far coincidere le coincidenze.
// Fondo di 1 volo/ora, piu' tre banchi fitti nel pomeriggio con un buco
// dichiarato di 40 minuti in mezzo.
// ---------------------------------------------------------------------------
const GIORNO = Math.floor(Date.parse('2026-08-11T00:00:00Z') / 1000);
const H = (ore, min = 0) => GIORNO + ore * 3600 + min * 60;
const arrivi = [];
// fondo fuori dalle ore di punta: dentro, un volo isolato cadrebbe nella coda
// di sbarco del banco precedente e i suoi agenti sarebbero attribuibili a
// entrambi, rendendo ambigua la verifica delle quote (l'ambiguita' e' reale,
// ma qui si sta misurando un'altra cosa)
for (let h = 0; h < 24; h++) if (h < 13 || h > 16) arrivi.push({ callsign: 'BG' + h, lastSeen: H(h, 10) });
// banco A: 6 voli in 12 minuti dalle 14:00 | vuoto 14:12 -> 14:52
// banco B: 5 voli in 10 minuti dalle 14:52 | banco C: 5 voli dalle 15:20
const banchi = [[H(14, 0), 6], [H(14, 52), 5], [H(15, 20), 5]];
for (const [t0, n] of banchi) {
  for (let k = 0; k < n; k++) arrivi.push({ callsign: 'PK' + t0 + '_' + k, lastSeen: t0 + k * 120 });
}
const BUCO = [H(14, 12), H(14, 52)]; // 40 minuti reali senza un solo atterraggio
arrivi.sort(() => Math.random() - 0.5); // l'ordine di OpenSky non e' garantito

const sched = api.veritasScheduleFromArrivals(arrivi, 'LIRF');
check('schedule costruito', !!sched, sched ? sched.flights.length + ' voli' : '');
check('voli ordinati per orario',
  sched.flights.every((f, i) => i === 0 || f.arrivo >= sched.flights[i - 1].arrivo));

const w = api.veritasPeakWindow(sched.flights);
const oraDi = (s) => new Date(s * 1000).toISOString().slice(11, 16);
const voliInPunta = w.a - w.da + 1;
check('finestra di punta trovata alle 14', oraDi(w.inizio) === '14:00', oraDi(w.inizio) + '-' + oraDi(w.fine));
check('la punta contiene i 16 voli dei tre banchi', voliInPunta === 16, voliInPunta + ' voli, ' + w.pax + ' pax');

// ---------------------------------------------------------------------------
// Distribuzione delle partenze
// ---------------------------------------------------------------------------
api.veritasSaveFlightSchedule(sched);
const N = 40, DURATA = 400;
const d = api.veritasStartDelaysFromSchedule(N, DURATA);

check('un ritardo per ogni agente', d && d.length === N, d ? d.length + '/' + N : 'null');
check('ordinati', d.every((v, i) => i === 0 || v >= d[i - 1]));
check('tutti dentro la simulazione', d.every((v) => v >= 0 && v <= DURATA), 'min ' + d[0].toFixed(1) + 's max ' + d[N - 1].toFixed(1) + 's');

// Il contratto vero: il profilo delle partenze simulate deve SEGUIRE il
// profilo degli atterraggi reali. Non basta che sia irregolare: deve essere
// irregolare nello stesso modo, negli stessi momenti.
const NBIN = 20;
const istogramma = (v, nBin, max) => {
  const b = new Array(nBin).fill(0);
  for (const x of v) b[Math.max(0, Math.min(nBin - 1, Math.floor((x / max) * nBin)))]++;
  return b;
};
const compressione = DURATA / (w.fine - w.inizio);
const paxReali = sched.flights.slice(w.da, w.a + 1)
  .flatMap((f) => new Array(4).fill((f.arrivo - w.inizio) * compressione)); // 4 marcatori per volo
const hSimulato = istogramma(d, NBIN, DURATA);
const hReale = istogramma(paxReali, NBIN, DURATA);
const correlazione = (x, y) => {
  const mx = x.reduce((a, v) => a + v, 0) / x.length, my = y.reduce((a, v) => a + v, 0) / y.length;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < x.length; i++) { num += (x[i] - mx) * (y[i] - my); dx += (x[i] - mx) ** 2; dy += (y[i] - my) ** 2; }
  return num / Math.sqrt(dx * dy);
};
const barra = (h) => h.map((n) => (n === 0 ? '.' : n > 9 ? '#' : String(n))).join('');
const binS = DURATA / NBIN;
const dRegolare = Array.from({ length: N }, (_, i) => (Math.floor(i / 3) * 3.5) % 42);
console.log('\n  finestra ' + oraDi(w.inizio) + '-' + oraDi(w.fine) + ' compressa su ' + DURATA + 's, 20 intervalli da ' + binS + 's');
console.log('    atterraggi reali  ' + barra(hReale));
console.log('    partenze simulate ' + barra(hSimulato));
console.log('    formula regolare  ' + barra(istogramma(dRegolare, NBIN, DURATA)));

// I banchi non vengono dichiarati dal banco di prova: si ricavano dagli
// atterraggi stessi, spezzando dove passano piu' di 5 minuti fra un aereo e il
// successivo. Cosi' la verifica non dipende da come e' costruito il fixture.
const voliFinestra = sched.flights.slice(w.da, w.a + 1);
const banchiVisti = [];
for (const f of voliFinestra) {
  const ultimo = banchiVisti[banchiVisti.length - 1];
  if (ultimo && f.arrivo - ultimo.fine <= 300) { ultimo.fine = f.arrivo; ultimo.pax += f.pax; }
  else banchiVisti.push({ inizio: f.arrivo, fine: f.arrivo, pax: f.pax });
}
const SBARCO_SIM = 12 * 60 * compressione;
for (const b of banchiVisti) {
  b.a0 = (b.inizio - w.inizio) * compressione;
  b.a1 = (b.fine - w.inizio) * compressione + SBARCO_SIM;
}
// Le code di sbarco di banchi vicini si sovrappongono, quindi ogni agente va
// attribuito a UN solo banco: quello piu' recente gia' atterrato quando parte.
// (Contarlo in tutti i banchi che lo contengono gonfiava i totali.)
const perBanco = (partenze) => {
  const conta = banchiVisti.map(() => 0);
  let fuori = 0;
  for (const x of partenze) {
    let scelto = -1;
    for (let i = 0; i < banchiVisti.length; i++) if (banchiVisti[i].a0 - 1e-6 <= x) scelto = i;
    if (scelto < 0 || x > banchiVisti[scelto].a1 + 1e-6) fuori++;
    else conta[scelto]++;
  }
  return { conta, fuori };
};
const reale = perBanco(d), formula = perBanco(dRegolare);
console.log('\n  agenti per banco di arrivi (atteso = quota di passeggeri del banco)');
let scartoMax = 0;
banchiVisti.forEach((b, i) => {
  const atteso = (b.pax / w.pax) * N;
  scartoMax = Math.max(scartoMax, Math.abs(reale.conta[i] - atteso) / N);
  console.log('    ' + oraDi(b.inizio) + '-' + oraDi(b.fine) + '  sim ' + b.a0.toFixed(0).padStart(3) + '-' +
              b.a1.toFixed(0).padStart(3) + 's  atteso ' + atteso.toFixed(1).padStart(4) +
              '  ottenuto ' + String(reale.conta[i]).padStart(3) + '   (formula regolare: ' + formula.conta[i] + ')');
});
console.log('    fuori da ogni banco: ' + reale.fuori + '   (formula regolare: ' + formula.fuori + ')');
check('\nogni banco riceve la sua quota di agenti', scartoMax < 0.05, 'scarto massimo ' + (scartoMax * 100).toFixed(1) + '% del totale');
check('nessun agente parte fuori da un banco di arrivi', reale.fuori === 0, reale.fuori + ' fuori');
check('la formula regolare NON segue i banchi (e cio che si sta sostituendo)',
  formula.conta.filter((c) => c > 0).length === 1,
  'concentra tutto in ' + formula.conta.filter((c) => c > 0).length + ' banco su ' + banchiVisti.length);

// Il vuoto fra un banco e l'altro deve restare un vuoto, non venire riempito.
const buco0 = (BUCO[0] - w.inizio) * compressione, buco1 = (BUCO[1] - w.inizio) * compressione;
const dentroIlBuco = d.filter((x) => x > buco0 + 25 && x < buco1).length; // +25s: coda dello sbarco del banco precedente
const densitaBuco = dentroIlBuco / (buco1 - buco0 - 25);
const densitaMedia = N / DURATA;
check('il vuoto fra i banchi resta vuoto', densitaBuco < densitaMedia * 0.35,
  dentroIlBuco + ' partenze in ' + (buco1 - buco0 - 25).toFixed(0) + 's di vuoto (densita ' +
  densitaBuco.toFixed(3) + ' contro media ' + densitaMedia.toFixed(3) + ')');

// ---------------------------------------------------------------------------
// Casi limite
// ---------------------------------------------------------------------------
check('nessun volo -> null', api.veritasStartDelaysFromSchedule(10, 400, { flights: [] }) === null);
check('conteggio zero -> null', api.veritasStartDelaysFromSchedule(0, 400) === null);
check('durata zero -> null', api.veritasStartDelaysFromSchedule(10, 0) === null);
check('arrivi senza orario -> null', api.veritasScheduleFromArrivals([{ callsign: 'X' }]) === null);
check('risposta non valida -> null', api.veritasScheduleFromArrivals('boom') === null);

const pochi = api.veritasStartDelaysFromSchedule(3, 400);
check('meno agenti che voli: conteggio esatto', pochi && pochi.length === 3, pochi ? pochi.map((x) => x.toFixed(0)).join(',') : 'null');
const tanti = api.veritasStartDelaysFromSchedule(500, 400);
check('molti agenti: conteggio esatto', tanti && tanti.length === 500);

// Un volo solo: tutti dallo stesso aereo, sbarco spalmato ma non istantaneo
const unSolo = api.veritasStartDelaysFromSchedule(20, 400, {
  flights: [{ callsign: 'AZ1', arrivo: GIORNO + 3600, pax: 140 }],
});
check('volo unico: sbarco spalmato, non istantaneo',
  unSolo && unSolo.length === 20 && unSolo[19] > unSolo[0],
  unSolo ? unSolo[0].toFixed(1) + 's -> ' + unSolo[19].toFixed(1) + 's' : 'null');

// ---------------------------------------------------------------------------
// Nessuna regressione senza voli
// ---------------------------------------------------------------------------
globalThis.window.__veritasFlightSchedule = null;
const fallback = api.veritasStartDelays(28, 400, (i) => (Math.floor(i / 3) * 3.5) % 42);
const atteso = Array.from({ length: 28 }, (_, i) => (Math.floor(i / 3) * 3.5) % 42);
check('senza voli resta la formula di prima, identica', JSON.stringify(fallback) === JSON.stringify(atteso));

console.log('\n' + (falliti ? falliti + ' PROVE FALLITE' : 'tutte le prove passano'));
process.exit(falliti ? 1 : 0);
