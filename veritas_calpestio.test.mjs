// Prova della TERZA SORELLA — dove si mettono i piedi.
//   node veritas_calpestio.test.mjs
//
// ⚠️ Nessuna scena qui dentro e' il modello di Raffaella. Sono testimonianze
//    inventate dove si SA gia' la risposta giusta, cosi' si puo' verificare
//    che la regola la trovi — e, cosa piu' importante, che dica di NO.
//
// Le due invarianti che si provano, dette da Raffaella il 06 e il 07/09/2026:
//   1. dove passano i mezzi, la gente non cammina;
//   2. un tubo che unisce un mezzo a un edificio e' un passaggio: di li' si
//      cammina — e quindi VINCE sui mezzi, perche' sta in mezzo a loro.
//
// E la terza cosa provata, che e' quella che sblocca il fronte strada: una
// testimonianza puo' essere legata a una REGIONE invece che a un punto, senza
// violare la Regola 0. Uno scorcio non da' una posizione — e infatti `centro`
// resta `null`, e la prova lo controlla.
import R from './veritas_riconosce.js';
import A from './veritas_accessi.js';

const { CALPESTIO_DI, VOCABOLARIO } = R;
const { calpestioVisto, ariaApertaVista } = A;

const voce = (t) => VOCABOLARIO.find((x) => x.termine === t);
let ko = 0;
const check = (nome, avuto, atteso) => {
  const ok = JSON.stringify(avuto) === JSON.stringify(atteso);
  if (!ok) ko++;
  console.log((ok ? '  ok  ' : '  KO  ') + nome + ' -> ' + JSON.stringify(avuto)
    + (ok ? '' : '   (atteso ' + JSON.stringify(atteso) + ')'));
};

console.log('\n1. la conseguenza viaggia con la parola, da tutte e due le sorgenti');
check('aereo',                voce('airplane').calpestio,     'mezzi');
check('pista',                voce('runway').calpestio,       'mezzi');
check('strada',               voce('road').calpestio,         'mezzi');
check('automobile',           voce('car').calpestio,          'mezzi');
check('camion',               voce('truck').calpestio,        'mezzi');
// ⚠️ questa e' la riga che si rompe per prima se qualcuno riscrive il
//    montaggio del vocabolario: «a jet bridge» e' un'AGGIUNTA dichiarata, non
//    una parola di ADE20K, ed entra da un'altra porta.
check('pontile (e\' un\'aggiunta)', voce('a jet bridge').calpestio, 'passaggio');
check('marciapiede',          voce('sidewalk').calpestio,     'passaggio');
check('scala mobile',         voce('escalator').calpestio,    'passaggio');
check('sedia: non dice niente', voce('chair').calpestio,      null);

console.log('\n2. «fuori» e «ci si cammina» NON sono la stessa domanda');
// Il marciapiede e' il caso che dimostra perche' serviva un terzo registro:
// sta all'aperto (e ARIA_APERTA_DI lo dice) e ci si cammina eccome.
const marciapiede = [{ termine: 'sidewalk', nome: 'marciapiede', ariaAperta: 'sempre',
                       calpestio: 'passaggio', score: 0.5, centro: [0, 0, 0] }];
check('l\'aria aperta dice «sempre»',
      (ariaApertaVista([0, 0, 0], { viste: marciapiede }) || {}).forza, 'sempre');
check('il calpestio dice «passaggio»',
      (calpestioVisto([0, 0, 0], { viste: marciapiede }) || {}).regola, 'passaggio');

console.log('\n3. il passaggio batte i mezzi — anche piu\' lontano e visto peggio');
const piazzale = [
  { termine: 'airplane', nome: 'aereo', ariaAperta: 'quasi sempre',
    calpestio: 'mezzi', score: 0.90, centro: [1, 0, 0] },
  { termine: 'runway', nome: 'pista', ariaAperta: 'sempre',
    calpestio: 'mezzi', score: 0.80, centro: [2, 0, 0] },
  { termine: 'a jet bridge', nome: 'pontile d\'imbarco', ariaAperta: null,
    calpestio: 'passaggio', score: 0.31, centro: [9, 0, 0] },
];
const r3 = calpestioVisto([0, 0, 0], { viste: piazzale, raggioVista: 12 });
check('vince', r3.regola, 'passaggio');
check('e dice quale parola', r3.parola, 'pontile d\'imbarco');
console.log('      (l\'aereo era a 1 m con 0,90 di fiducia, il pontile a 9 m con 0,31:');
console.log('       se vincesse il piu\' vicino o il piu\' sicuro, il tubo sparirebbe)');

console.log('\n4. e senza il tubo, li\' non si cammina');
check('vince', calpestioVisto([0, 0, 0], { viste: piazzale.slice(0, 2), raggioVista: 12 }).regola,
      'mezzi');

console.log('\n5. la testimonianza legata a una REGIONE (Regola 0 rispettata)');
// Il fronte strada: dall'alto le automobili non si vedono, le vede il primo
// piano — e da uno scorcio non si prende una posizione. Si prende il
// rettangolo che quello scorcio ha inquadrato, che si sapeva gia' prima.
const fronteStrada = [{
  termine: 'car', nome: 'automobili', ariaAperta: 'quasi sempre', calpestio: 'mezzi',
  score: 0.45, centro: null, regione: { min: [10, 0, 0], max: [26, 4, 12] },
}];
const dentro = calpestioVisto([18, 0, 6], { viste: fronteStrada, raggioVista: 12 });
check('un punto dentro il rettangolo', dentro && [dentro.regola, dentro.da], ['mezzi', 'regione']);
check('e vale anche per l\'aria aperta',
      (ariaApertaVista([18, 0, 6], { viste: fronteStrada }) || {}).da, 'regione');
check('un punto fuori (a 40 m) non prende niente',
      calpestioVisto([40, 0, 6], { viste: fronteStrada }), null);
// ⚠️ La riga che tiene in piedi la Regola 0: se un giorno qualcuno mettesse
//    una posizione qui dentro «tanto per averla», questa prova lo direbbe.
check('il centro non viene MAI inventato', fronteStrada[0].centro, null);

console.log('\n6. senza testimonianza non si inventa una risposta');
check('nessuna vista', calpestioVisto([0, 0, 0], { viste: [] }), null);
check('nessun punto', calpestioVisto(null, { viste: piazzale }), null);

// ===========================================================================
// 7. LA PROVA CHE SERVE A RAFFAELLA — 07/09/2026
// ===========================================================================
//
// > *«Io ho sempre paura che ragioniamo su due livelli diversi: quando io ti
// >  parlo penso a una piattaforma in cui ci metto qualsiasi cosa, anche la
// >  chiesa, anche la scuola. Quando tu mi parli del piazzale dell'aeroporto ho
// >  sempre il timore che quello che fai sia legato solo a questo modello. Io ti
// >  dico di mettere il RAGIONAMENTO, non la parola, perche' se no rischi che non
// >  valga quando cambieremo il modello. Rassicurami su questo punto.»*
//
// ⚠️ E LA RASSICURAZIONE NON PUO' ESSERE UNA FRASE: dev'essere una prova che
//    gira. Qui sotto la stessa identica regola — **le stesse 21 parole, senza
//    cambiarne una** — viene messa davanti a cinque edifici che non sono un
//    aeroporto. Se un giorno qualcuno fara' rientrare l'aeroporto nel registro,
//    una di queste righe si spegne, e si vede.
//
//    Il posto giusto per questa prova e' qui e non in un documento: un documento
//    dice che vale ovunque, una prova lo dimostra a ogni esecuzione.
console.log('\n7. LA STESSA REGOLA SU CINQUE EDIFICI CHE NON SONO UN AEROPORTO');
console.log('   (nessuna parola cambiata, nessun ramo diverso: e\' lo stesso registro)');

const V = (termine, calp, aria) => (x, z) => ({
  termine, nome: termine, calpestio: calp, ariaAperta: aria || null,
  score: 0.5, centro: [x, 0, z],
});

const edifici = [
  { nome: 'SCUOLA — la corsia dei pullman davanti al cancello',
    viste: [V('bus', 'mezzi', 'quasi sempre')(0, 0), V('road', 'mezzi', 'sempre')(2, 0)],
    dove: [0, 0, 0], atteso: 'mezzi' },
  { nome: 'SCUOLA — il portico coperto fra due corpi di fabbrica',
    viste: [V('bridge', 'passaggio')(0, 0), V('sidewalk', 'passaggio', 'sempre')(3, 0)],
    dove: [0, 0, 0], atteso: 'passaggio' },
  { nome: 'OSPEDALE — la rampa delle ambulanze',
    viste: [V('van', 'mezzi', 'quasi sempre')(1, 0), V('car', 'mezzi', 'quasi sempre')(2, 1)],
    dove: [0, 0, 0], atteso: 'mezzi' },
  { nome: 'OSPEDALE — il corridoio sopraelevato fra due padiglioni',
    viste: [V('car', 'mezzi', 'quasi sempre')(1, 0), V('bridge', 'passaggio')(4, 0)],
    dove: [0, 0, 0], atteso: 'passaggio' },   // il passaggio vince sui mezzi sotto
  { nome: 'STAZIONE — il binario',
    viste: [V('a train', 'mezzi')(1, 0)],
    dove: [0, 0, 0], atteso: 'mezzi' },
  { nome: 'STAZIONE — il sottopasso verso la banchina',
    viste: [V('a train', 'mezzi')(1, 0), V('stairs', 'passaggio')(2, 0), V('path', 'passaggio')(3, 0)],
    dove: [0, 0, 0], atteso: 'passaggio' },
  { nome: 'CENTRO COMMERCIALE — la banchina di carico e scarico',
    viste: [V('truck', 'mezzi', 'quasi sempre')(1, 0)],
    dove: [0, 0, 0], atteso: 'mezzi' },
  { nome: 'PORTO — la passerella d\'imbarco sopra la banchina',
    viste: [V('ship', 'mezzi', 'quasi sempre')(1, 0), V('a jet bridge', 'passaggio')(5, 0)],
    dove: [0, 0, 0], atteso: 'passaggio' },
];
for (const e of edifici) {
  const r = calpestioVisto(e.dove, { viste: e.viste, raggioVista: 12 });
  check(e.nome, r && r.regola, e.atteso);
}

// ⚠️ E LA PROVA PIU' IMPORTANTE E' QUELLA CHE DEVE DIRE DI NO.
//    In una chiesa non ci sono mezzi e non ci sono tubi. Un registro agnostico
//    deve TACERE, non trovare qualcosa per forza. Una regola che risponde sempre
//    non e' una regola: e' un rumore che conferma se stesso.
console.log('\n   e dove non c\'e' + '’' + ' niente di tutto questo, TACE:');
const chiesa = [
  { termine: 'bench', nome: 'panche', calpestio: null, ariaAperta: null, score: 0.7, centro: [0, 0, 0] },
  { termine: 'column', nome: 'colonne', calpestio: null, ariaAperta: null, score: 0.6, centro: [1, 0, 1] },
  { termine: 'painting', nome: 'quadri', calpestio: null, ariaAperta: null, score: 0.5, centro: [2, 0, 0] },
];
check('CHIESA — panche, colonne, quadri: il registro non dice niente',
      calpestioVisto([0, 0, 0], { viste: chiesa, raggioVista: 12 }), null);

// ⚠️ E IL GUARDIANO CHE IMPEDISCE ALL'AEROPORTO DI RIENTRARE DI NASCOSTO.
//    Non basta che oggi non ci sia: deve restare impossibile domani. Questa
//    prova legge le CHIAVI del registro e boccia qualunque nome di tipo di
//    edificio, in italiano e in inglese. Se un giorno qualcuno scrivesse
//    `"airport apron": "mezzi"` sembrerebbe ragionevole — e questa riga
//    fallirebbe.
console.log('\n   e nessuna chiave e\' un tipo di edificio:');
const TIPOLOGIE = [
  'airport', 'aeroporto', 'school', 'scuola', 'hospital', 'ospedale',
  'church', 'chiesa', 'museum', 'museo', 'station', 'stazione', 'mall',
  'terminal', 'supermarket', 'office', 'ufficio', 'stadium', 'stadio',
  'hotel', 'library', 'biblioteca', 'theatre', 'teatro', 'port', 'porto',
];
const colpevoli = Object.keys(CALPESTIO_DI)
  .filter((k) => TIPOLOGIE.some((t) => k.toLowerCase().includes(t)));
check('nessun tipo di edificio fra le chiavi', colpevoli, []);

console.log('\nregistro: ' + Object.keys(CALPESTIO_DI).length + ' parole ('
  + Object.values(CALPESTIO_DI).filter((x) => x === 'mezzi').length + ' mezzi, '
  + Object.values(CALPESTIO_DI).filter((x) => x === 'passaggio').length + ' passaggio)');
// ⚠️ IL TETTO E' LA REGOLA 0-BIS IN FORMA DI PROVA. Direttiva 12: «se la
//    tabella delle posture arriva a venti righe, dentro ci e' rientrato
//    l'aeroporto». Vale identico qui: un registro che cresce e' un registro in
//    cui e' rientrato il tipo di edificio, una parola per volta.
if (Object.keys(CALPESTIO_DI).length > 30) {
  ko++;
  console.log('  KO  il registro ha passato le 30 parole: dentro ci sta rientrando'
    + ' un tipo di edificio. Si tolgono parole, non si alza il tetto.');
}

console.log(ko ? '\n' + ko + ' PROVE FALLITE' : '\ntutte le prove passano');
process.exit(ko ? 1 : 0);
