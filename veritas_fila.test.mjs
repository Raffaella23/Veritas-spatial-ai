// Prova delle file:  node veritas_fila.test.mjs
//
// ⚠️ Scene inventate, mai il modello di Raffaella. Una coda di venti persone
//    davanti a un banco si scrive in tre righe, e se il modulo la legge bene
//    qui la legge bene ovunque.
import C from './veritas_cose.js';
import P from './veritas_controprova.js';
import F from './veritas_fila.js';

let ko = 0;
const check = (nome, ok, extra) => {
  if (!ok) { ko++; console.log('  KO  ' + nome + (extra ? '  -> ' + extra : '')); }
  else console.log('  ok  ' + nome);
};

let seq = 0;
function figura(centro, avanti) {
  return {
    id: 'f' + (seq++), nome: 'Cube.' + seq,
    centro, ingombro: [0.5, 1.75, 0.04], ingombroLocale: [0.5, 1.75, 0.04],
    nVertici: 4, nTriangoli: 2, materiale: 0, avanti,
  };
}

/** Una coda: `n` persone una dietro l'altra lungo +x, tutte rivolte a +x. */
function coda(n, [x0, z0], passo = 0.9) {
  return Array.from({ length: n }, (_, i) => figura([x0 - i * passo, 0.9, z0], [1, 0, 0]));
}

/** Una platea: `n` persone affiancate lungo z, tutte rivolte a +x. */
function platea(n, [x0, z0], passo = 0.8) {
  return Array.from({ length: n }, (_, i) => figura([x0, 0.9, z0 - i * passo], [1, 0, 0]));
}

const capannelliDi = (pezzi) => P.capannelli(P.figure(C.cose(pezzi).cose));

// ---------------------------------------------------------------------------
console.log('\nuna coda e una coda: lunga nella direzione in cui si guarda');
// ---------------------------------------------------------------------------

const c20 = capannelliDi(coda(20, [0, 0]));
check('venti persone in coda danno un capannello solo', c20.length === 1, c20.length + '');
const f20 = F.leggiFila(c20[0]);
check('e viene letto come una fila', f20 && f20.tipo === 'fila', f20 ? f20.tipo : 'null');
check('lunga circa 17 m (venti persone a 90 cm)',
      f20 && Math.abs(f20.lunghezza - 17.1) < 0.5, f20 && f20.lunghezza.toFixed(1));
check('e larga quanto una persona', f20 && Math.abs(f20.larghezza - 0.61) < 0.1,
      f20 && f20.larghezza.toFixed(2));

// ---------------------------------------------------------------------------
console.log('\nuna platea non e una coda, e va detto invece che forzato');
// ---------------------------------------------------------------------------

const p12 = capannelliDi(platea(12, [0, 0]));
const fp = F.leggiFila(p12[0]);
check('dodici persone affiancate che guardano avanti sono una platea',
      fp && fp.tipo === 'platea', fp ? fp.tipo : 'null');
check('e il racconto lo distingue da una coda',
      /platea/.test(F.racconta([fp])) && !/ci si mette dietro/.test(F.racconta([fp])));

// ---------------------------------------------------------------------------
console.log('\ngente che passa non e una fila: senza sguardi concordi, niente');
// ---------------------------------------------------------------------------

const sparsi = [];
for (let i = 0; i < 16; i++) {
  const a = i * (Math.PI * 2 / 16);
  sparsi.push(figura([Math.cos(a) * 3, 0.9, Math.sin(a) * 3],
    [Math.cos(a * 1.7), 0, Math.sin(a * 1.7)]));
}
check('sedici persone rivolte a caso non sono una fila',
      F.leggiFila(capannelliDi(sparsi)[0]) === null);

const senzaFacce = capannelliDi(coda(12, [0, 0]).map((p) => ({ ...p, avanti: null })));
check('e senza sapere da che parte guardano, nemmeno',
      F.leggiFila(senzaFacce[0]) === null);

check('due persone non fanno una fila', F.leggiFila(capannelliDi(coda(2, [0, 0]))[0]) === null);

// ---------------------------------------------------------------------------
console.log('\nla testa sta dove si viene serviti, non dove capita');
// ---------------------------------------------------------------------------
//
// ⚠️ Di una figura piatta si conosce l'ASSE dello sguardo, non il verso: il
//    piano ha due facce. Il verso viene dalle COSE — il banco, il varco — che
//    quell'ambiguita' non ce l'hanno.

const conBanco = F.leggiFila(c20[0], { servizi: [[2, 0, 0]] });
check('col banco a x=+2, la testa e dalla parte del banco',
      conBanco && conBanco.testa[0] > conBanco.coda[0],
      conBanco && 'testa x=' + conBanco.testa[0].toFixed(1) + ' coda x=' + conBanco.coda[0].toFixed(1));
check('e lo dichiara: il verso viene dal servizio',
      conBanco && conBanco.perche === 'servizio', conBanco && conBanco.perche);

const bancoDallAltra = F.leggiFila(c20[0], { servizi: [[-25, 0, 0]] });
check('col banco dall altra parte, testa e coda si invertono',
      bancoDallAltra && bancoDallAltra.testa[0] < bancoDallAltra.coda[0],
      bancoDallAltra && 'testa x=' + bancoDallAltra.testa[0].toFixed(1));

check('senza servizi si ripiega sulla densita, e lo dice',
      f20 && f20.perche === 'densita', f20 && f20.perche);

// ---------------------------------------------------------------------------
console.log('\nCHI ARRIVA SI METTE IN FONDO — e la richiesta');
// ---------------------------------------------------------------------------

const primo = F.postoInCoda(conBanco, 1);
check('il primo arrivato si mette 90 cm dietro l ultimo',
      Math.abs(Math.hypot(primo[0] - conBanco.coda[0], primo[2] - conBanco.coda[2]) - 0.9) < 0.01,
      Math.hypot(primo[0] - conBanco.coda[0], primo[2] - conBanco.coda[2]).toFixed(2) + ' m');
check('e DIETRO, non davanti: piu lontano dalla testa',
      Math.hypot(primo[0] - conBanco.testa[0], primo[2] - conBanco.testa[2])
      > Math.hypot(conBanco.coda[0] - conBanco.testa[0], conBanco.coda[2] - conBanco.testa[2]));

const terzo = F.postoInCoda(conBanco, 3);
check('il terzo sta 2,70 m dietro l ultimo, non sopra il primo',
      Math.abs(Math.hypot(terzo[0] - conBanco.coda[0], terzo[2] - conBanco.coda[2]) - 2.7) < 0.01,
      Math.hypot(terzo[0] - conBanco.coda[0], terzo[2] - conBanco.coda[2]).toFixed(2) + ' m');
check('e la fila si allunga in linea retta, non a caso',
      Math.abs(terzo[2] - primo[2]) < 0.01, 'z: ' + primo[2].toFixed(2) + ' vs ' + terzo[2].toFixed(2));

// ---------------------------------------------------------------------------
console.log('\ninvece di attraversare venti persone, si punta al fondo');
// ---------------------------------------------------------------------------

const elenco = F.file(c20, { servizi: [[2, 0, 0]] });
// Arriva lungo lo stesso corridoio della fila: andando dritto al banco le
// passerebbe attraverso tutta.
const partenza = [-30, 0, 0.2];
const viaggio = F.mettitiInFila(partenza, [2, 0, 0], elenco, { nArrivo: 1 });
check('chi va al banco viene dirottato in coda', !!viaggio, viaggio ? 'ok' : 'null');
check('e la sua meta NON e piu il banco',
      viaggio && Math.hypot(viaggio.punti.at(-1)[0] - 2, viaggio.punti.at(-1)[2]) > 5,
      viaggio && viaggio.punti.at(-1).map((v) => v.toFixed(1)).join(','));
check('la meta e il fondo della fila',
      viaggio && Math.hypot(viaggio.punti.at(-1)[0] - primo[0],
                            viaggio.punti.at(-1)[2] - primo[2]) < 0.01);
check('e sa quante persone ha davanti', viaggio && viaggio.davanti === 20,
      viaggio && viaggio.davanti + '');

// ⚠️ IL CONFRONTO CHE MOSTRA A COSA SERVE TUTTO QUESTO.
//    Andare dritti al banco vuol dire passare ATTRAVERSO le venti persone in
//    attesa; andare in fondo alla fila no. Si contano i punti campionati lungo
//    i due percorsi che cadono dentro l'ingombro della fila.
const campiona = (a, b, n = 60) => Array.from({ length: n + 1 }, (_, i) => [
  a[0] + (b[0] - a[0]) * i / n, 0, a[2] + (b[2] - a[2]) * i / n]);
const dentroDritto = campiona(partenza, [2, 0, 0]).filter((p) => F.dentroLaFila(conBanco, p)).length;
const dentroInCoda = campiona(partenza, viaggio.punti.at(-1)).filter((p) => F.dentroLaFila(conBanco, p)).length;
check('andando dritti al banco si attraversano le persone in attesa',
      dentroDritto > 20, dentroDritto + ' punti dentro la fila su 61');
check('andando in fondo alla fila, non si attraversa nessuno',
      dentroInCoda === 0, dentroInCoda + ' punti dentro la fila');
check('il punto di arrivo sta fuori dall ingombro della fila',
      viaggio && !F.dentroLaFila(conBanco, viaggio.punti.at(-1)));

// Chi va altrove non viene toccato.
check('chi non va al banco tiene il suo percorso',
      F.mettitiInFila([-30, 0, 12], [-60, 0, 40], elenco) === null);
check('e senza file non succede niente', F.mettitiInFila([0, 0, 0], [2, 0, 0], []) === null);

// Una platea non dirotta nessuno: non ci si mette in coda a una platea.
const soloPlatea = F.file(p12, { servizi: [[2, 0, 0]] });
check('a una platea non ci si accoda',
      F.mettitiInFila([-30, 0, 12], [2, 0, 0], soloPlatea) === null);

// ---------------------------------------------------------------------------
console.log('\nil tempo di attesa si chiede, non si inventa');
// ---------------------------------------------------------------------------
//
// ⚠️ Un tempo d'attesa inventato dentro un referto che si vende e' lo stesso
//    genere di bugia credibile dei KPI cablati e del verdetto normativo falso.

check('senza il ritmo del servizio, nessuna attesa', F.attesaStimata(conBanco, null) === null);
check('con 10 persone al minuto, venti in fila fanno 120 secondi',
      Math.abs(F.attesaStimata(conBanco, 10) - 120) < 0.01,
      F.attesaStimata(conBanco, 10) + '');
check('e chi arriva dopo aspetta di piu',
      F.attesaStimata(conBanco, 10, 5) > F.attesaStimata(conBanco, 10));

// ---------------------------------------------------------------------------
console.log('\nuna coda obliqua funziona come una dritta');
// ---------------------------------------------------------------------------
//
// Se il modulo funzionasse solo lungo gli assi x e z sarebbe tarato sulle mie
// scene di prova, non sulla realta'.

const obliqua = [];
const dir = [Math.cos(0.7), 0, Math.sin(0.7)];
for (let i = 0; i < 15; i++)
  obliqua.push(figura([-dir[0] * i * 0.9, 0.9, -dir[2] * i * 0.9], dir));
const fo = F.leggiFila(capannelliDi(obliqua)[0], { servizi: [[dir[0] * 3, 0, dir[2] * 3]] });
check('una coda a 40 gradi viene letta come fila', fo && fo.tipo === 'fila', fo && fo.tipo);
check('con la testa dalla parte del servizio',
      fo && fo.testa[0] > fo.coda[0] && fo.testa[2] > fo.coda[2],
      fo && 'testa ' + fo.testa.map((v) => v.toFixed(1)).join(','));
const dietroObliqua = F.postoInCoda(fo, 1);
check('e chi arriva si mette dietro lungo la stessa obliqua',
      Math.abs(Math.hypot(dietroObliqua[0] - fo.coda[0], dietroObliqua[2] - fo.coda[2]) - 0.9) < 0.01
      && Math.hypot(dietroObliqua[0] - fo.testa[0], dietroObliqua[2] - fo.testa[2])
         > Math.hypot(fo.coda[0] - fo.testa[0], fo.coda[2] - fo.testa[2]));

// ---------------------------------------------------------------------------
console.log('\nripetibile: due letture della stessa scena danno gli stessi numeri');
// ---------------------------------------------------------------------------

const a1 = F.leggiFila(capannelliDi(coda(20, [0, 0]))[0], { servizi: [[2, 0, 0]] });
const a2 = F.leggiFila(capannelliDi(coda(20, [0, 0]).reverse())[0], { servizi: [[2, 0, 0]] });
check('stessa testa, stessa coda, stessa lunghezza',
      a1.testa.map((v) => v.toFixed(6)).join() === a2.testa.map((v) => v.toFixed(6)).join()
      && a1.lunghezza.toFixed(6) === a2.lunghezza.toFixed(6));

console.log(ko ? `\n${ko} PROVE FALLITE` : '\ntutte le prove passano');
process.exit(ko ? 1 : 0);
