// Prova del piano 2 del grafo di scena:  node veritas_cose.test.mjs
//
// ⚠️ NESSUNA di queste scene e' il modello di Raffaella. Sono stanze inventate,
//    una per ogni difetto da bloccare. E' la condizione perche' il modulo valga
//    su un modello QUALSIASI e non su quello che si aveva sotto mano quel
//    giorno — la lezione della Regola uno, pagata il 18/08 con una giornata.
//
// Le scene sono scritte come le costruirebbe un progettista: un banco e' alto
// un metro, un sedile quarantacinque centimetri, una persona un metro e ottanta
// e spessa niente. Se il modulo ha ragione qui, ha ragione anche altrove.
import C from './veritas_cose.js';

let ko = 0;
const check = (nome, ok, extra) => {
  if (!ok) { ko++; console.log('  KO  ' + nome + (extra ? '  -> ' + extra : '')); }
  else console.log('  ok  ' + nome);
};

// Un pezzo dell'inventario, come lo produce l'adattatore da three.js.
let seq = 0;
function pezzo(centro, ingombro, opz = {}) {
  return {
    id: 'p' + (seq++),
    nome: opz.nome || 'Cube.' + seq,      // nomi volutamente inutili: non vanno usati
    centro,
    ingombro,
    ingombroLocale: opz.locale || ingombro,
    nVertici: opz.nVertici != null ? opz.nVertici : 8,
    nTriangoli: opz.nTriangoli != null ? opz.nTriangoli : 12,
    materiale: opz.materiale != null ? opz.materiale : 0,
  };
}

/** Una fila di `n` oggetti uguali lungo x, passo `passo`. */
function fila(n, da, ingombro, passo, opz = {}) {
  return Array.from({ length: n }, (_, i) =>
    pezzo([da[0] + i * passo, da[1], da[2]], ingombro, opz));
}

/** Una griglia di `nx` per `nz` oggetti uguali. */
function griglia(nx, nz, da, ingombro, passoX, passoZ, opz = {}) {
  const out = [];
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++)
    out.push(pezzo([da[0] + i * passoX, da[1], da[2] + k * passoZ], ingombro, opz));
  return out;
}

// ---------------------------------------------------------------------------
console.log('\nla forma e una MISURA: si descrive come sta al mondo, non cosa e');
// ---------------------------------------------------------------------------

check('una figura umana e verticale (1,80 m alta, 50 cm larga, spessa nulla)',
      C.forma([0.50, 1.80, 0.02]) === 'verticale', C.forma([0.50, 1.80, 0.02]));
check('una freccia dipinta e una placca (2 m, spessa 2 cm)',
      C.forma([2.0, 0.02, 0.6]) === 'placca', C.forma([2.0, 0.02, 0.6]));
check('un sedile e una seduta (45 cm da terra)',
      C.forma([0.50, 0.45, 0.50]) === 'seduta', C.forma([0.50, 0.45, 0.50]));
check('un bancone e un banco (1 m da terra, 1,2 m di fronte)',
      C.forma([1.20, 1.00, 0.70]) === 'banco', C.forma([1.20, 1.00, 0.70]));
check('un automobile e un volume (4,5 x 1,5 x 1,8 m)',
      C.forma([4.5, 1.5, 1.8]) === 'volume', C.forma([4.5, 1.5, 1.8]));
check('un totem stretto e alto e verticale, non un banco',
      C.forma([0.40, 1.50, 0.40]) === 'verticale', C.forma([0.40, 1.50, 0.40]));

// ---------------------------------------------------------------------------
console.log('\nla ripetizione si riconosce anche quando il modello non la dichiara');
// ---------------------------------------------------------------------------
//
// E' il caso normale: misurato su un modello di esempio, 2.416 mesh e 2.416
// istanze — l'esportatore aveva appiattito ogni duplicato in una mesh a se'.
// Due copie devono avere la stessa firma pur essendo mesh diverse.

const a = pezzo([0, 0, 0], [1.2, 1.0, 0.7]);
const b = pezzo([10, 0, 0], [1.2, 1.0, 0.7]);
check('due copie identiche in punti diversi hanno la stessa firma',
      C.firma(a) === C.firma(b), C.firma(a) + ' vs ' + C.firma(b));

const ruotato = pezzo([0, 0, 0], [0.7, 1.0, 1.2], { locale: [1.2, 1.0, 0.7] });
check('lo stesso oggetto ruotato di 90 gradi resta lo stesso oggetto',
      C.firma(a) === C.firma(ruotato), C.firma(ruotato));

const altroMateriale = pezzo([0, 0, 0], [1.2, 1.0, 0.7], { materiale: 7 });
check('stesso ingombro ma materiale diverso: NON e lo stesso oggetto',
      C.firma(a) !== C.firma(altroMateriale));

const altraMaglia = pezzo([0, 0, 0], [1.2, 1.0, 0.7], { nVertici: 480, nTriangoli: 900 });
check('stesso ingombro ma maglia diversa: NON e lo stesso oggetto',
      C.firma(a) !== C.firma(altraMaglia));

// ---------------------------------------------------------------------------
console.log('\nun mucchio per posto, non un baricentro per tutta la sala');
// ---------------------------------------------------------------------------
//
// Il difetto che questo blocca: 66 sedili uguali sparsi in quattro isole
// darebbero, mediati insieme, UN punto in mezzo al corridoio fra le file.
// E' lo stesso errore di KMeans sui corridoi gia' descritto in CLAUDE.md.

const sedute = [
  ...griglia(5, 4, [0, 0.22, 0], [0.5, 0.45, 0.5], 0.6, 0.8),
  ...griglia(5, 4, [40, 0.22, 0], [0.5, 0.45, 0.5], 0.6, 0.8),
];
const rSedute = C.cose(sedute);
check('due blocchi di sedute lontani danno DUE cose, non una',
      rSedute.cose.length === 2, rSedute.cose.length + ' cose');
check('e ogni blocco tiene i suoi venti oggetti',
      rSedute.cose.every((c) => c.quante === 20),
      rSedute.cose.map((c) => c.quante).join(','));
check('il centro del primo blocco cade DENTRO il blocco, non fra i due',
      Math.abs(rSedute.cose[0].centro[0] - 1.2) < 2 || Math.abs(rSedute.cose[0].centro[0] - 41.2) < 2,
      'x = ' + rSedute.cose[0].centro[0].toFixed(2));
check('le sedute sono riconosciute come sedute',
      rSedute.cose.every((c) => c.forma === 'seduta'));
check('e disposte in griglia',
      rSedute.cose.every((c) => c.disposizione === 'griglia'),
      rSedute.cose.map((c) => c.disposizione).join(','));

// ---------------------------------------------------------------------------
console.log('\nuna fila e una fila: la disposizione e un fatto di progetto');
// ---------------------------------------------------------------------------

const banconi = fila(8, [0, 0.5, 0], [1.2, 1.0, 0.7], 2.5);
const rBanconi = C.cose(banconi);
check('otto banconi allineati danno una cosa sola', rBanconi.cose.length === 1,
      rBanconi.cose.length + ' cose');
check('riconosciuta come fila', rBanconi.cose[0].disposizione === 'fila',
      rBanconi.cose[0].disposizione);
check('di oggetti a mezza altezza', rBanconi.cose[0].forma === 'banco',
      rBanconi.cose[0].forma);

// ---------------------------------------------------------------------------
console.log('\nl oggetto unico non fa un fatto: una sedia sola non e un attesa');
// ---------------------------------------------------------------------------

const unaSola = [pezzo([0, 0.22, 0], [0.5, 0.45, 0.5], { nVertici: 99, nTriangoli: 33 })];
check('un oggetto senza copie non diventa una cosa',
      C.cose(unaSola).cose.length === 0);
check('e viene contato fra gli scartati', C.cose(unaSola).scartate === 1);

// due copie bastano
const duePezzi = fila(2, [0, 0.5, 0], [1.2, 1.0, 0.7], 2.0);
check('due copie invece bastano', C.cose(duePezzi).cose.length === 1);

// ---------------------------------------------------------------------------
console.log('\nle figure umane e le frecce: le due cose che Raffaella ha indicato');
// ---------------------------------------------------------------------------

const figure = fila(12, [0, 0.9, 5], [0.5, 1.80, 0.02], 1.0);
const frecce = fila(4, [0, 0.01, 12], [2.0, 0.02, 0.6], 6.0);
const rMisto = C.cose([...figure, ...frecce]);
const cVert = rMisto.cose.find((c) => c.forma === 'verticale');
const cPlacca = rMisto.cose.find((c) => c.forma === 'placca');
check('le figure umane escono come oggetti in piedi', !!cVert && cVert.quante === 12,
      cVert ? cVert.quante + '' : 'non trovate');
check('le frecce escono come segni per terra', !!cPlacca && cPlacca.quante === 4,
      cPlacca ? cPlacca.quante + '' : 'non trovate');
check('e non vengono confuse fra loro', !!cVert && !!cPlacca && cVert.firma !== cPlacca.firma);

// ---------------------------------------------------------------------------
console.log('\nun posto e un ARREDO INTERO, rimesso insieme dai suoi pezzi');
// ---------------------------------------------------------------------------
//
// Un esportatore spezza una fila di sedute in sedile + braccioli + gambe, spesso
// uno per materiale. Sono gruppi di oggetti ripetuti diversi e un arredo solo:
// se ne uscissero tre, ci sarebbero tre tappe sovrapposte.
//
// ⚠️ Un posto NON e' una stanza. Il primo tentativo univa tutto cio' che era
//    VICINO, e su un modello vero dava un posto solo per tutto l'edificio —
//    perche' in uno spazio arredato ogni cosa e' vicina a qualcos'altro. Le
//    stanze nascono dallo spazio libero (il piano 3), non da qui.

const salaAttesa = [
  ...griglia(5, 4, [0, 0.22, 0], [0.5, 0.45, 0.5], 0.6, 0.8),                        // sedili
  ...griglia(5, 4, [0.3, 0.30, 0], [0.06, 0.10, 0.5], 0.6, 0.8, { nVertici: 24, nTriangoli: 44 }), // braccioli
  ...fila(4, [0, 1.9, -1.5], [0.9, 0.55, 0.06], 2.5, { nVertici: 40, nTriangoli: 60 }),            // monitor
];
const rSala = C.cose(salaAttesa);
const pSala = C.posti(rSala.cose);
check('sedili e braccioli, che stanno uno dentro l altro, danno UN posto',
      pSala.length === 1, pSala.length + ' posti');
check('e il posto sa quanti oggetti contiene', pSala[0] && pSala[0].oggetti === 40,
      pSala[0] ? pSala[0].oggetti + '' : '-');
check('e da che forme e fatto', pSala[0] && pSala[0].forme.seduta === 20,
      pSala[0] ? JSON.stringify(pSala[0].forme) : '-');
// I monitor stanno a un metro e mezzo di distanza, non SOPRA le sedute: sono
// un altro arredo, e restano fuori. La loro impronta e' sotto il metro quadro,
// quindi non fanno nemmeno un posto per conto loro.
check('i monitor appesi piu in la NON entrano nello stesso arredo',
      pSala[0] && !pSala[0].cose.some((c) => c.forma === 'appeso'),
      pSala[0] ? pSala[0].cose.map((c) => c.forma).join(',') : '-');

const dueSale = C.posti(C.cose([
  ...salaAttesa,
  ...griglia(5, 4, [60, 0.22, 0], [0.5, 0.45, 0.5], 0.6, 0.8),
]).cose);
check('due sale lontane restano due posti', dueSale.length === 2, dueSale.length + '');

// ---------------------------------------------------------------------------
console.log('\nla distanza di unione si MISURA sul gruppo, non si decide a tavolino');
// ---------------------------------------------------------------------------
//
// Ogni famiglia di oggetti ha la sua spaziatura: i sedili 60 cm, i banconi
// 2,5 m, le automobili 3 m. Con una costante unica o si spezzano le file lunghe
// o si fondono cose distinte. Con una costante di 1,2 m gli otto banconi qui
// sopra davano ZERO mucchi — ognuno restava solo e veniva scartato.

const auto = fila(10, [0, 0.75, 0], [4.5, 1.5, 1.8], 3.0, { nVertici: 300, nTriangoli: 500 });
const rAuto = C.cose(auto);
check('dieci automobili a 3 m di passo danno un parcheggio solo',
      rAuto.cose.length === 1, rAuto.cose.length + ' cose');
check('riconosciute come volumi, non come banchi',
      rAuto.cose[0].forma === 'volume', rAuto.cose[0].forma);

// Due soli oggetti uguali ai due capi dell'edificio non sono ne' una fila ne'
// due file: sono due pezzi singoli, e vanno scartati come tali. Senza il tetto
// sulla dimensione dell'oggetto verrebbero uniti, perche' la loro "spaziatura
// tipica" e' la loro stessa distanza.
const dueLontani = [
  pezzo([0, 0.5, 0], [1.2, 1.0, 0.7]),
  pezzo([40, 0.5, 0], [1.2, 1.0, 0.7]),
];
check('due soli oggetti uguali a 40 m non fanno un mucchio: si scartano',
      C.cose(dueLontani).cose.length === 0, C.cose(dueLontani).cose.length + ' cose');

const filaLunga = fila(20, [0, 0.5, 0], [1.2, 1.0, 0.7], 2.5);
const spezzata = [...filaLunga, ...fila(20, [200, 0.5, 0], [1.2, 1.0, 0.7], 2.5)];
check('due banchi di sportelli a 150 m restano due cose',
      C.cose(spezzata).cose.length === 2, C.cose(spezzata).cose.length + '');

// ---------------------------------------------------------------------------
console.log('\nappoggiato o appeso: la fascia di altezza si misura DAL PAVIMENTO');
// ---------------------------------------------------------------------------
//
// Il difetto che questo blocca, trovato da una prova e non da un ragionamento:
// un monitor alto 55 cm montato a 1,90 m finiva classificato «seduta», perche'
// la fascia veniva applicata alla dimensione dell'oggetto invece che alla sua
// quota. Una seduta e' alta 45 cm DA TERRA.

const conAppesi = [
  ...griglia(5, 4, [0, 0.22, 0], [0.5, 0.45, 0.5], 0.6, 0.8),                  // sedili a terra
  ...fila(6, [0, 0.45, -2], [0.35, 0.90, 0.35], 1.5, { nVertici: 30, nTriangoli: 50 }), // colonnine a terra
  ...fila(6, [0, 2.40, -3], [0.9, 0.55, 0.06], 2.0, { nVertici: 40, nTriangoli: 60 }), // monitor appesi
];
const rApp = C.cose(conAppesi);
const appesi = rApp.cose.filter((c) => c.forma === 'appeso');
check('i monitor montati in alto escono come appesi', appesi.length === 1 && appesi[0].quante === 6,
      appesi.map((c) => c.quante).join(',') || 'nessuno');
check('e non vengono contati come sedute',
      rApp.cose.filter((c) => c.forma === 'seduta').reduce((s, c) => s + c.quante, 0) === 20,
      rApp.cose.filter((c) => c.forma === 'seduta').map((c) => c.quante).join(','));

// Un pavimento e' dove appoggiano cose di TIPI DIVERSI: sei monitor tutti alla
// stessa quota non sono un piano di calpestio.
const quote = C.quotePavimento(conAppesi);
check('sei monitor alla stessa quota non creano un pavimento a 2,40 m',
      !quote.some((q) => q > 1.0), quote.map((q) => q.toFixed(2)).join(', '));

// Ma due piani veri, con arredi diversi su ciascuno, si vedono entrambi.
const dueLivelli = [
  ...griglia(4, 4, [0, 0.22, 0], [0.5, 0.45, 0.5], 0.6, 0.8),
  ...fila(6, [0, 0.5, -3], [1.2, 1.0, 0.7], 2.5),
  ...griglia(4, 4, [0, 4.22, 0], [0.5, 0.45, 0.5], 0.6, 0.8),
  ...fila(6, [0, 4.5, -3], [1.2, 1.0, 0.7], 2.5),
];
const q2 = C.quotePavimento(dueLivelli);
check('due piani con arredi diversi danno due quote di pavimento', q2.length === 2,
      q2.map((q) => q.toFixed(2)).join(', '));
// ⚠️ Il difetto che questo blocca, e che una prova ha trovato: le distanze si
//    misurano in pianta, quindi due sedie sullo stesso punto di due piani
//    diversi risultano a distanza ZERO. Finivano nello stesso mucchio, e —
//    peggio — azzeravano la spaziatura tipica del gruppo, spezzando tutti gli
//    altri mucchi. Sei cose al posto di una, senza un errore in console.
const rLivelli = C.cose(dueLivelli);
check('i sedili del piano di sopra restano sedute, non appesi',
      rLivelli.cose.filter((c) => c.forma === 'seduta').length === 2,
      rLivelli.cose.map((c) => c.forma).join(','));
check('e i due piani danno due mucchi di sedute, non uno solo',
      rLivelli.cose.filter((c) => c.forma === 'seduta').every((c) => c.quante === 16),
      rLivelli.cose.filter((c) => c.forma === 'seduta').map((c) => c.quante).join(','));
check('la fila di banchi non si spezza per colpa del piano di sopra',
      rLivelli.cose.filter((c) => c.forma === 'banco').length === 2,
      rLivelli.cose.filter((c) => c.forma === 'banco').map((c) => c.quante).join(','));

// ---------------------------------------------------------------------------
console.log('\nla vernice non fa un posto da sola: sta SUL pavimento di un posto');
// ---------------------------------------------------------------------------

const soloFrecce = C.posti(C.cose(fila(6, [0, 0.01, 0], [2.0, 0.02, 0.6], 4.0)).cose);
check('sei frecce per terra e nessun arredo: nessun posto', soloFrecce.length === 0,
      soloFrecce.length + ' posti');

// ---------------------------------------------------------------------------
console.log('\nil modulo NON da nomi: e la regola che tiene onesto il referto');
// ---------------------------------------------------------------------------

const tutto = C.cose([...salaAttesa, ...banconi, ...figure, ...frecce]);
check('nessuna cosa esce con un nome', tutto.cose.every((c) => c.nome === null));
check('e ogni cosa dichiara di venire dalla geometria',
      tutto.cose.every((c) => c.provenienza === 'geometria'));
const testo = JSON.stringify(tutto.cose.map((c) => ({ f: c.forma, d: c.disposizione })));
check('e nel risultato non compaiono parole di dominio',
      !/sedut[ae]\s*d.attesa|check.?in|gate|parcheggio|imbarco/i.test(testo));

// I nomi delle mesh sono volutamente inutili in tutte queste scene
// («Cube.12»): se il modulo li usasse, niente qui funzionerebbe.
check('i nomi delle mesh non entrano mai nella firma',
      C.firma(pezzo([0, 0, 0], [1, 1, 1], { nome: 'kiosk' }))
      === C.firma(pezzo([5, 0, 0], [1, 1, 1], { nome: 'Cube.999' })));

// ---------------------------------------------------------------------------
console.log('\nrifacibile identico: e la condizione perche un numero si possa difendere');
// ---------------------------------------------------------------------------
//
// Raffaella, 19/08: la geometria da' le MISURE, e una misura contestata da un
// committente deve poter essere rifatta uguale. Due passate sullo stesso
// ingresso devono dare gli stessi numeri, anche se l'ordine cambia.

const uno = C.cose(salaAttesa);
const due = C.cose(salaAttesa.slice().reverse());
const soloNumeri = (r) => r.cose.map((c) => [c.quante, c.forma,
  c.centro.map((v) => v.toFixed(6)).join(',')]).sort().join('|');
check('due passate danno lo stesso risultato', soloNumeri(uno) === soloNumeri(due));
check('anche cambiando l ordine dell inventario',
      uno.cose.length === due.cose.length, uno.cose.length + ' vs ' + due.cose.length);

// ---------------------------------------------------------------------------
console.log('\nregge un modello grande senza impuntarsi');
// ---------------------------------------------------------------------------

const tanti = [];
for (let s = 0; s < 60; s++)
  tanti.push(...griglia(6, 6, [s * 7, 0.22, 0], [0.5, 0.45, 0.5], 0.6, 0.8,
    { nVertici: 8 + s, nTriangoli: 12 }));
const t0 = Date.now();
const rTanti = C.cose(tanti);
const ms = Date.now() - t0;
check('2.160 pezzi in meno di due secondi', ms < 2000, ms + ' ms');
check('e ne trova sessanta mucchi', rTanti.cose.length === 60, rTanti.cose.length + '');

// ---------------------------------------------------------------------------
console.log('\nquando non c e niente da vedere, lo dice invece di inventare');
// ---------------------------------------------------------------------------

const vuoto = C.cose([]);
check('inventario vuoto: nessuna cosa, nessun errore', vuoto.cose.length === 0);
check('e il racconto lo dichiara',
      /Non ho trovato oggetti ripetuti/.test(C.racconta(vuoto, [])));
check('il racconto di una scena vera dice le misure e non i nomi',
      /oggetti uguali/.test(C.racconta(tutto, C.posti(tutto.cose))));

console.log(ko ? `\n${ko} PROVE FALLITE` : '\ntutte le prove passano');
process.exit(ko ? 1 : 0);
