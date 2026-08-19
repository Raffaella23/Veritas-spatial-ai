// Prova della controprova:  node veritas_controprova.test.mjs
//
// ⚠️ Anche qui, nessuna scena e' il modello di Raffaella. Sono spazi inventati
//    dove si SA gia' la risposta giusta, cosi' si puo' verificare che la
//    controprova la trovi — e, cosa piu' importante, che dica di NO quando le
//    zone sono sbagliate.
//
// Una verifica che dice sempre di si' non e' una verifica. Meta' di queste
// prove servono a questo: a controllare che sappia bocciare.
import C from './veritas_cose.js';
import P from './veritas_controprova.js';

let ko = 0;
const check = (nome, ok, extra) => {
  if (!ok) { ko++; console.log('  KO  ' + nome + (extra ? '  -> ' + extra : '')); }
  else console.log('  ok  ' + nome);
};

let seq = 0;
function pezzo(centro, ingombro, opz = {}) {
  return {
    id: 'p' + (seq++), nome: 'Cube.' + seq, centro, ingombro,
    ingombroLocale: opz.locale || ingombro,
    nVertici: opz.nVertici != null ? opz.nVertici : 8,
    nTriangoli: opz.nTriangoli != null ? opz.nTriangoli : 12,
    materiale: opz.materiale != null ? opz.materiale : 0,
    avanti: opz.avanti || null,
  };
}

/** Un gruppo di persone attorno a un punto, tutte uguali fra loro. */
function gente(n, [x, z], sparpaglio, opz = {}) {
  return Array.from({ length: n }, (_, i) => {
    // disposizione deterministica a spirale: nessun caso, quindi ripetibile
    const a = i * 2.39996, r = sparpaglio * Math.sqrt(i / Math.max(1, n - 1));
    return pezzo([x + r * Math.cos(a), 0.9, z + r * Math.sin(a)], [0.5, 1.75, 0.04], opz);
  });
}

// ---------------------------------------------------------------------------
console.log('\nriconoscere una figura umana: per statura e postura, mai per nome');
// ---------------------------------------------------------------------------

const unaPersona = C.cose(gente(6, [0, 0], 1.5)).cose[0];
check('sei comparse alte 1,75 m sono figure', P.eUnaFigura(unaPersona), unaPersona && unaPersona.forma);

const paletti = C.cose(Array.from({ length: 6 }, (_, i) =>
  pezzo([i * 1.5, 0.45, 0], [0.2, 0.90, 0.2], { nVertici: 40, nTriangoli: 60 }))).cose[0];
check('paletti alti 90 cm NON sono figure (sotto la statura)', !P.eUnaFigura(paletti),
      paletti && paletti.ingombroUno[1].toFixed(2));

const colonne = C.cose(Array.from({ length: 6 }, (_, i) =>
  pezzo([i * 6, 2.0, 0], [0.5, 4.0, 0.5], { nVertici: 50, nTriangoli: 70 }))).cose[0];
check('colonne alte 4 m NON sono figure (sopra la statura)', !P.eUnaFigura(colonne),
      colonne && colonne.ingombroUno[1].toFixed(2));

const sedili = C.cose(Array.from({ length: 6 }, (_, i) =>
  pezzo([i * 0.6, 0.22, 0], [0.5, 0.45, 0.5], { nVertici: 60, nTriangoli: 90 }))).cose[0];
check('i sedili non sono figure', !P.eUnaFigura(sedili), sedili && sedili.forma);

// ---------------------------------------------------------------------------
console.log('\ni capannelli: dove la gente sta insieme');
// ---------------------------------------------------------------------------

const treGruppi = C.cose([
  ...gente(10, [0, 0], 2),
  ...gente(8, [40, 0], 2),
  ...gente(6, [0, 40], 2),
]);
const cap = P.capannelli(P.figure(treGruppi.cose));
check('tre raduni lontani danno tre capannelli', cap.length === 3, cap.length + '');
check('e il piu numeroso viene per primo', cap[0].persone === 10, cap[0].persone + '');
check('con 24 persone in tutto',
      cap.reduce((s, g) => s + g.persone, 0) === 24,
      cap.reduce((s, g) => s + g.persone, 0) + '');

// ---------------------------------------------------------------------------
console.log('\nLA PROVA CHE CONTA: sa dire di NO quando le zone sono sbagliate');
// ---------------------------------------------------------------------------
//
// E' il difetto vero, riprodotto: sette tappe a distanza uguale lungo una
// diagonale, mentre la gente sta in tre punti precisi altrove. E' esattamente
// la fotografia in cima a CLAUDE.md.

const scena = C.cose([
  ...gente(20, [0, 0], 3),      // una folla al banco
  ...gente(15, [50, 10], 3),    // una in attesa
  ...gente(12, [90, 5], 3),     // una al gate
]);

const filaIndiana = Array.from({ length: 7 }, (_, i) => ({
  label: 'Tappa ' + (i + 1),
  pos: [-150 + i * 10, 0, -150 + i * 10],   // una diagonale nel vuoto
  origine: 'cammino',
}));
const male = P.controprova(filaIndiana, scena.cose);
check('la fila indiana viene bocciata: nessuna zona ha gente attorno',
      male.valida && male.zoneSole === 7, male.valida ? male.zoneSole + ' zone sole' : male.perche);
check('e nessuna persona risulta coperta', male.personeCoperte === 0, male.personeCoperte + '');
check('la distanza mediana e enorme', male.distanzaMediana > 50,
      male.distanzaMediana.toFixed(0) + ' m');
check('e il racconto lo dice a parole',
      /funzioni che il programma ha inventato/.test(P.racconta(male)));

const azzeccate = [
  { label: 'Accettazione', pos: [0, 0, 0], origine: 'misura' },
  { label: 'Attesa', pos: [50, 0, 10], origine: 'misura' },
  { label: 'Gate', pos: [90, 0, 5], origine: 'misura' },
];
const bene = P.controprova(azzeccate, scena.cose);
check('le zone messe sulla gente vengono promosse',
      bene.valida && bene.zoneSole === 0, bene.valida ? bene.zoneSole + ' zone sole' : bene.perche);
check('tutte le persone risultano coperte', bene.personeScoperte === 0,
      bene.personeScoperte + ' scoperte');
check('e la distanza mediana e piccola', bene.distanzaMediana < 2,
      bene.distanzaMediana.toFixed(2) + ' m');

// Il caso a meta': due zone su tre azzeccate. Deve dire ESATTAMENTE quale
// manca, non dare un voto complessivo che nasconde il problema.
const mezze = [
  { label: 'Accettazione', pos: [0, 0, 0], origine: 'misura' },
  { label: 'Attesa', pos: [50, 0, 10], origine: 'misura' },
  { label: 'Gate', pos: [-200, 0, -200], origine: 'misura' },
];
const meta = P.controprova(mezze, scena.cose);
check('con due zone su tre azzeccate, indica quale e sbagliata',
      meta.perZona.filter((z) => z.sola).length === 1
      && meta.perZona.find((z) => z.sola).zona === 'Gate',
      meta.perZona.filter((z) => z.sola).map((z) => z.zona).join(','));
check('e segnala le dodici persone rimaste senza zona',
      meta.perCapannello.filter((c) => c.scoperto).reduce((s, c) => s + c.persone, 0) === 12,
      meta.personeScoperte + '');

// ---------------------------------------------------------------------------
console.log('\nil guardiano: se le zone nascono dalle figure, la prova non vale');
// ---------------------------------------------------------------------------
//
// E' il punto che regge tutto: una verifica costruita sugli stessi dati che ha
// verificato dice sempre di si'. Meglio nessun punteggio che un punteggio che
// si e' dato da solo.

const circolari = [
  { label: 'Attesa', pos: [0, 0, 0], origine: 'figure umane' },
  { label: 'Gate', pos: [50, 0, 10], origine: 'misura' },
];
const rifiutata = P.controprova(circolari, scena.cose);
check('una zona nata dalle figure fa rifiutare la controprova',
      rifiutata.valida === false, JSON.stringify(rifiutata.valida));
check('e il motivo lo dice chiaramente',
      /si verificherebbe da sola/.test(rifiutata.perche), rifiutata.perche);
check('il racconto non da nessun punteggio',
      !/%/.test(P.racconta(rifiutata)), P.racconta(rifiutata));

// ---------------------------------------------------------------------------
console.log('\nun modello senza persone: lo dice, non inventa un voto');
// ---------------------------------------------------------------------------

const senzaGente = C.cose(Array.from({ length: 8 }, (_, i) =>
  pezzo([i * 0.6, 0.22, 0], [0.5, 0.45, 0.5], { nVertici: 60, nTriangoli: 90 })));
const niente = P.controprova(azzeccate, senzaGente.cose);
check('senza figure la controprova non si puo fare', niente.valida === false);
check('e non e presentato come un difetto del modello',
      /non e' un difetto del modello/.test(niente.perche), niente.perche);

// ---------------------------------------------------------------------------
console.log('\nle facce: una coda e una platea non sono un atrio');
// ---------------------------------------------------------------------------

// Dodici persone che guardano tutte verso +x: una coda.
const coda = C.cose(gente(12, [0, 0], 2, { avanti: [1, 0, 0] })).cose;
const gCoda = P.capannelli(P.figure(coda));
check('dodici persone rivolte dalla stessa parte: concordanza alta',
      gCoda[0].sguardo > 0.95, gCoda[0].sguardo && gCoda[0].sguardo.toFixed(2));

// Dodici che guardano ognuna per conto suo: un passaggio.
const sparse = [];
for (let i = 0; i < 12; i++) {
  const a = i * (Math.PI * 2 / 12);
  sparse.push(pezzo([Math.cos(a) * 2, 0.9, Math.sin(a) * 2], [0.5, 1.75, 0.04],
    { avanti: [Math.cos(a * 1.7), 0, Math.sin(a * 1.7)] }));
}
const gSparse = P.capannelli(P.figure(C.cose(sparse).cose));
check('dodici persone rivolte a caso: concordanza bassa',
      gSparse.length && gSparse[0].sguardo < 0.5,
      gSparse.length ? gSparse[0].sguardo.toFixed(2) : 'nessun capannello');

// L'asse, non il verso: meta' girate di 180 gradi restano concordi, perche' di
// una figura piatta non si sa quale faccia sia quella stampata.
const opposte = [];
for (let i = 0; i < 10; i++)
  opposte.push(pezzo([i * 0.8, 0.9, 0], [0.5, 1.75, 0.04],
    { avanti: i % 2 ? [1, 0, 0] : [-1, 0, 0] }));
const gOpp = P.capannelli(P.figure(C.cose(opposte).cose));
check('meta girate di 180 gradi contano ancora come concordi (conta l asse)',
      gOpp[0].sguardo > 0.95, gOpp[0].sguardo.toFixed(2));

// Guardare VERSO una zona.
const versoDx = [pezzo([0, 0.9, 0], [0.5, 1.75, 0.04], { avanti: [1, 0, 0] })];
check('chi guarda lungo l asse x guarda verso una zona sull asse x',
      P.guardanoVerso(versoDx, [10, 0, 0]) > 0.99,
      P.guardanoVerso(versoDx, [10, 0, 0]).toFixed(2));
check('e non verso una zona di fianco',
      P.guardanoVerso(versoDx, [0, 0, 10]) < 0.01,
      P.guardanoVerso(versoDx, [0, 0, 10]).toFixed(2));

// Se le direzioni non ci sono, si dice «non lo so» invece di dare 0.
const senzaFacce = P.capannelli(P.figure(C.cose(gente(8, [0, 0], 2)).cose));
check('senza direzioni la concordanza e "non lo so", non zero',
      senzaFacce[0].sguardo === null, String(senzaFacce[0].sguardo));

// ---------------------------------------------------------------------------
console.log('\nripetibile: due passate danno gli stessi numeri');
// ---------------------------------------------------------------------------

const uno = P.controprova(azzeccate, scena.cose);
const due = P.controprova(azzeccate, C.cose([
  ...gente(20, [0, 0], 3), ...gente(15, [50, 10], 3), ...gente(12, [90, 5], 3),
]).cose);
check('gli stessi ingressi danno lo stesso punteggio',
      uno.personeCoperte === due.personeCoperte
      && uno.distanzaMediana.toFixed(6) === due.distanzaMediana.toFixed(6));

console.log(ko ? `\n${ko} PROVE FALLITE` : '\ntutte le prove passano');
process.exit(ko ? 1 : 0);
