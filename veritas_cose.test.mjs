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

// ---------------------------------------------------------------------------
console.log('\nappoggiare le tappe sulle cose invece che nel vuoto');
// ---------------------------------------------------------------------------
//
// E' il difetto in cima a CLAUDE.md. Un edificio lungo con cinque arredi
// distinti lungo il suo asse: le tappe devono cadere SU quelli, non a distanza
// uguale fra loro.

const edificio = C.cose([
  ...fila(10, [0, 0.75, 0], [4.5, 1.5, 1.8], 3.0, { nVertici: 300, nTriangoli: 500 }),   // auto
  ...fila(8, [45, 0.5, 0], [1.2, 1.0, 0.7], 2.5, { nVertici: 70, nTriangoli: 110 }),     // banconi
  ...fila(4, [70, 0.6, 0], [0.8, 1.2, 0.8], 2.0, { nVertici: 80, nTriangoli: 120 }),     // varchi
  ...griglia(6, 4, [90, 0.22, 0], [0.5, 0.45, 0.5], 0.6, 0.8),                           // sedute
  ...fila(6, [120, 0.5, 0], [1.2, 1.0, 0.7], 2.5, { nVertici: 90, nTriangoli: 140 }),    // gate
]);
const pEdificio = C.posti(edificio.cose);
check('cinque arredi lungo l edificio danno cinque posti', pEdificio.length === 5,
      pEdificio.length + ' posti');

const app = C.appoggiaTappe(5, pEdificio);
check('cinque tappe si posano su cinque posti', app && app.punti.length === 5,
      app ? app.punti.length + '' : 'null');
check('e ogni tappa cade sopra un posto vero, non fra due',
      app && app.punti.every((p) => pEdificio.some((q) =>
        Math.hypot(q.centro[0] - p[0], q.centro[2] - p[2]) < 0.01)));
check('le tappe sono ordinate lungo l edificio',
      app && app.punti.every((p, i) => i === 0 || p[0] >= app.punti[i - 1][0] - 0.01),
      app ? app.punti.map((p) => p[0].toFixed(0)).join(' < ') : '-');

// ⚠️ LA PROVA CHE DISTINGUE QUESTO DALLA FILA INDIANA: i passi fra una tappa e
//    la successiva NON devono essere uguali. Se lo fossero, vorrebbe dire che
//    si stanno di nuovo distribuendo i metri invece di cercare le cose.
const passi = app.punti.slice(1).map((p, i) => p[0] - app.punti[i][0]);
const media = passi.reduce((s, v) => s + v, 0) / passi.length;
const scarto = Math.sqrt(passi.reduce((s, v) => s + (v - media) ** 2, 0) / passi.length);
check('i passi fra le tappe NON sono uguali: seguono gli arredi, non un righello',
      scarto > 3, 'scarto ' + scarto.toFixed(1) + ' m su passi ' + passi.map((v) => v.toFixed(0)).join(', '));

// ---------------------------------------------------------------------------
console.log('\nle figure umane restano fuori: sono la controprova, non un indizio');
// ---------------------------------------------------------------------------
//
// Se una tappa si posasse sulle figure, la controprova si verificherebbe da
// sola. Devono essere escluse qui, in modo esplicito.

const conGente = C.cose([
  ...fila(8, [45, 0.5, 0], [1.2, 1.0, 0.7], 2.5, { nVertici: 70, nTriangoli: 110 }),
  // una folla sparsa su un'area, come sta la gente vera: una fila di figure
  // piatte avrebbe un'impronta di mezzo metro quadro e non farebbe un posto
  ...griglia(5, 3, [200, 0.9, 0], [0.5, 1.75, 0.04], 1.2, 1.2, { nVertici: 4, nTriangoli: 2 }),
]);
const pGente = C.posti(conGente.cose);
const eFigura = (c) => c.forma === 'verticale' && c.ingombroUno[1] >= 1.35 && c.ingombroUno[1] <= 2.25;
const senzaFigure = C.posiAppoggiabili(pGente, { eFigura });
check('un posto fatto di sole figure umane non e appoggiabile',
      senzaFigure.length === pGente.length - 1,
      senzaFigure.length + ' su ' + pGente.length);
check('e quello degli arredi resta', senzaFigure.some((p) => p.formaPrevalente === 'banco'),
      senzaFigure.map((p) => p.formaPrevalente).join(','));

// ⚠️ IL DIFETTO VERO, misurato sul modello di esempio: un posto con dentro un
//    arredo e duecento comparse passava INTERO, e il suo baricentro era il
//    baricentro della folla. La tappa «Imbarco / Gate» si e' appoggiata su un
//    posto di 231 oggetti verticali, cioe' sulla gente. Circolarita' pura.
const misto = C.posti(C.cose([
  // due banconi in un punto preciso...
  ...fila(2, [0, 0.5, 0], [1.2, 1.0, 0.7], 2.0, { nVertici: 70, nTriangoli: 110 }),
  // ...e centoventi comparse tutt'attorno, che sposterebbero il baricentro
  ...griglia(12, 10, [-6, 0.9, -6], [0.5, 1.75, 0.04], 1.2, 1.2, { nVertici: 4, nTriangoli: 2 }),
]).cose);
const purgato = C.posiAppoggiabili(misto, { eFigura });
check('un posto misto arredi+comparse resta, ma senza le comparse',
      purgato.length === 1 && purgato[0].oggetti === 2,
      purgato.length ? purgato[0].oggetti + ' oggetti' : 'nessun posto');
check('e dichiara quante ne ha tolte', purgato.length && purgato[0].figureTolte === 120,
      purgato.length ? purgato[0].figureTolte + '' : '-');
check('il baricentro torna sui banconi, non sulla folla',
      purgato.length && Math.abs(purgato[0].centro[0] - 1.0) < 0.6,
      purgato.length ? 'x = ' + purgato[0].centro[0].toFixed(2) : '-');
check('e la forma prevalente e quella degli arredi',
      purgato.length && purgato[0].formaPrevalente === 'banco',
      purgato.length ? purgato[0].formaPrevalente : '-');

// ---------------------------------------------------------------------------
console.log('\nla percorribilita comanda: un posto irraggiungibile non regge una tappa');
// ---------------------------------------------------------------------------

// La navmesh finta: tutto quello che sta oltre x = 100 e' su un altro livello.
const raggiungibile = (pos) => (pos[0] <= 100 ? { ok: true, punto: pos } : null);
const soloSotto = C.appoggiaTappe(5, pEdificio, { raggiungibile });
check('i posti fuori dal calpestabile vengono scartati',
      soloSotto && soloSotto.punti.every((p) => p[0] <= 100),
      soloSotto ? soloSotto.punti.map((p) => p[0].toFixed(0)).join(',') : 'null');
check('e lo dichiara nel conto degli scartati',
      soloSotto && soloSotto.scartati.fuoriDalCammino === 1,
      soloSotto ? JSON.stringify(soloSotto.scartati) : '-');

// Due aree che a piedi non si raggiungono: si tiene quella con piu' OGGETTI
// dentro. Qui l'area oltre gli 80 m ha meno posti (2 contro 3) ma piu' roba
// sopra (30 oggetti contro 22), ed e' quella giusta: e' dove succedono le cose.
const collegati = (a, b) => (a[0] < 80) === (b[0] < 80);
const unSoloGruppo = C.appoggiaTappe(5, pEdificio, { collegati });
check('con due aree scollegate si tiene quella con piu oggetti, non piu posti',
      unSoloGruppo && unSoloGruppo.punti.every((p) => p[0] >= 80),
      unSoloGruppo ? unSoloGruppo.punti.map((p) => p[0].toFixed(0)).join(',') : 'null');
check('e lo dichiara', unSoloGruppo && unSoloGruppo.scartati.scollegati === 3,
      unSoloGruppo ? JSON.stringify(unSoloGruppo.scartati) : '-');

// ---------------------------------------------------------------------------
console.log('\nquando non c e materiale, si tira indietro invece di inventare');
// ---------------------------------------------------------------------------
//
// «Meglio il comportamento di ieri che una lettura debole»: la stessa regola
// gia' scritta per il dentro/fuori e per la catena camminabile. Restituendo
// null, il chiamante tiene quello che faceva prima.

check('un solo posto: non basta per una catena, si restituisce null',
      C.appoggiaTappe(5, pEdificio.slice(0, 1)) === null);
check('nessun posto: null', C.appoggiaTappe(5, []) === null);
check('tutti irraggiungibili: null',
      C.appoggiaTappe(5, pEdificio, { raggiungibile: () => null }) === null);

// ---------------------------------------------------------------------------
console.log('\nmeno posti che tappe: le ancore restano, il resto riempie i vuoti');
// ---------------------------------------------------------------------------
//
// ⚠️ Il caso vero, misurato sul modello di esempio: 13 ancore sparse su 9 aree
//    che a piedi non si raggiungono, la piu' popolata ne ha 3. Rinunciare qui
//    vorrebbe dire tornare alla fila indiana per TUTTE e sette le tappe,
//    buttando via anche le tre che sarebbero cadute su qualcosa di reale.

const pochi = C.appoggiaTappe(7, pEdificio);
check('con cinque posti e sette tappe, se ne posano comunque sette',
      pochi && pochi.punti.length === 7, pochi ? pochi.punti.length + '' : 'null');
check('cinque sono ancore su cose vere', pochi && pochi.ancore === 5, pochi && pochi.ancore + '');
check('e si sa una per una quali', pochi && pochi.suCose.filter(Boolean).length === 5,
      pochi && pochi.suCose.map((v) => (v ? 'X' : '.')).join(''));
check('le due in piu stanno FRA le ancore, non oltre i capi',
      pochi && pochi.punti.every((p) =>
        p[0] >= pochi.punti[0][0] - 0.01 && p[0] <= pochi.punti[6][0] + 0.01),
      pochi && pochi.punti.map((p) => p[0].toFixed(0)).join(' '));
check('e restano in ordine lungo l edificio',
      pochi && pochi.punti.every((p, i) => i === 0 || p[0] >= pochi.punti[i - 1][0] - 0.01),
      pochi && pochi.punti.map((p) => p[0].toFixed(0)).join(' < '));
check('il motivo e scritto', pochi && /solo 5 posti su 7/.test(pochi.perche), pochi && pochi.perche);

// Con un percorso vero iniettato, le tappe di riempimento seguono quello — non
// la linea d'aria, che potrebbe attraversare un muro.
const percorso = (a, b) => ({ punti: [a, [(a[0] + b[0]) / 2, a[1], a[2] + 20], b] });
const conCurva = C.appoggiaTappe(7, pEdificio, { percorso });
check('con un percorso a gomito, le tappe in piu ci stanno sopra',
      conCurva && conCurva.punti.some((p) => Math.abs(p[2]) > 5),
      conCurva && conCurva.punti.map((p) => p[2].toFixed(0)).join(','));

// ---------------------------------------------------------------------------
console.log('\nil gruppo si sceglie per quanti OGGETTI ha dentro, non per quanti posti');
// ---------------------------------------------------------------------------
//
// ⚠️ Misurato: la catena camminabile sceglieva l'isola piu' estesa (1.730 m2)
//    e ci posava tutte le tappe, mentre la gente stava a cinquanta metri.
//    Un'area grande e vuota non e' dove succedono le cose: un piazzale e'
//    quasi sempre la piu' estesa, e non e' li' che si fa la fila.

const dueAree = C.posti(C.cose([
  // area A: tre posti piccoli
  ...fila(3, [0, 0.5, 0], [1.2, 1.0, 0.7], 3.0, { nVertici: 11, nTriangoli: 21 }),
  ...fila(3, [0, 0.5, 8], [1.2, 1.0, 0.7], 3.0, { nVertici: 12, nTriangoli: 22 }),
  ...fila(3, [0, 0.5, 16], [1.2, 1.0, 0.7], 3.0, { nVertici: 13, nTriangoli: 23 }),
  // area B: due posti, ma pieni di roba
  ...griglia(10, 8, [500, 0.22, 0], [0.5, 0.45, 0.5], 0.6, 0.8),
  ...griglia(10, 8, [500, 0.30, 20], [0.5, 0.45, 0.5], 0.6, 0.8, { nVertici: 14, nTriangoli: 24 }),
]).cose);
const separate = (a, b) => (a[0] < 250) === (b[0] < 250);
const scelta = C.appoggiaTappe(2, dueAree, { collegati: separate });
check('si sceglie l area con 160 oggetti, non quella con tre posti',
      scelta && scelta.punti.every((p) => p[0] > 250),
      scelta ? scelta.punti.map((p) => p[0].toFixed(0)).join(',') : 'null');

// ⚠️ IL DIFETTO SILENZIOSO, trovato solo misurando sul modello vero.
//    Il gruppo con piu' oggetti era un posto SOLO, isolato sulla sua area:
//    vinceva il confronto, poi non superava il controllo «servono almeno due
//    ancore», e la funzione restituiva null — cioe' fila indiana per tutte le
//    tappe, mentre poco piu' in giu' nell'elenco c'era un gruppo da cinque
//    posti perfettamente buono. In console si leggeva «nessun posto
//    appoggiabile», che era falso.
const conIsolato = C.posti(C.cose([
  // un posto solo, ma pienissimo, su un'area a se'
  ...griglia(14, 14, [1000, 0.22, 0], [0.5, 0.45, 0.5], 0.6, 0.8),
  // e tre posti normali, collegati fra loro
  ...fila(3, [0, 0.5, 0], [1.2, 1.0, 0.7], 3.0, { nVertici: 31, nTriangoli: 41 }),
  ...fila(3, [0, 0.5, 9], [1.2, 1.0, 0.7], 3.0, { nVertici: 32, nTriangoli: 42 }),
  ...fila(3, [0, 0.5, 18], [1.2, 1.0, 0.7], 3.0, { nVertici: 33, nTriangoli: 43 }),
]).cose);
const treAree = (a, b) => (a[0] < 500) === (b[0] < 500);
const nonIsolato = C.appoggiaTappe(3, conIsolato, { collegati: treAree });
check('un posto isolato pienissimo non fa scartare tutto il resto',
      nonIsolato !== null, 'null');
check('e si usano i tre posti collegati, non il solitone',
      nonIsolato && nonIsolato.punti.every((p) => p[0] < 500),
      nonIsolato ? nonIsolato.punti.map((p) => p[0].toFixed(0)).join(',') : '-');

// Piu' posti che tappe: si sceglie il piu' importante di ogni tratto.
const tre = C.appoggiaTappe(3, pEdificio);
check('con cinque posti e tre tappe, se ne scelgono tre',
      tre && tre.punti.length === 3, tre ? tre.punti.length + '' : 'null');
check('e restano ordinate lungo l edificio',
      tre && tre.punti.every((p, i) => i === 0 || p[0] >= tre.punti[i - 1][0]),
      tre ? tre.punti.map((p) => p[0].toFixed(0)).join(' < ') : '-');

// ---------------------------------------------------------------------------
console.log('\nripetibile anche qui: due passate danno le stesse coordinate');
// ---------------------------------------------------------------------------

const a1 = C.appoggiaTappe(5, pEdificio);
const a2 = C.appoggiaTappe(5, C.posti(C.cose(edificio.inventario || []).cose).length
  ? C.posti(edificio.cose) : pEdificio);
check('le stesse coordinate, alla sesta cifra',
      JSON.stringify(a1.punti.map((p) => p.map((v) => v.toFixed(6))))
      === JSON.stringify(a2.punti.map((p) => p.map((v) => v.toFixed(6)))));

console.log(ko ? `\n${ko} PROVE FALLITE` : '\ntutte le prove passano');
process.exit(ko ? 1 : 0);
