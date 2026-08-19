// Prova dell'occhio:  node veritas_riconosce.test.mjs
//
// ⚠️ QUI NON SI PROVA SE IL MODELLO E' BRAVO. Si prova la REGOLA: cosa si
//    accetta di quello che risponde, cosa si butta, e cosa non deve mai
//    succedere. La bravura del modello si vede solo su modelli veri, e non
//    dipende da questo codice.
//
// Il rilevatore e' finto e dice quello che voglio io, comprese le risposte
// sbagliate: e' l'unico modo di verificare che le risposte sbagliate vengano
// trattate come tali.
import C from './veritas_cose.js';
import R from './veritas_riconosce.js';

let ko = 0;
const check = (nome, ok, extra) => {
  if (!ok) { ko++; console.log('  KO  ' + nome + (extra ? '  -> ' + extra : '')); }
  else console.log('  ok  ' + nome);
};

let seq = 0;
const pezzo = (centro, ingombro, opz = {}) => ({
  id: 'p' + (seq++), nome: 'Cube.' + seq, centro, ingombro, ingombroLocale: ingombro,
  nVertici: opz.nVertici != null ? opz.nVertici : 8,
  nTriangoli: opz.nTriangoli != null ? opz.nTriangoli : 12,
  materiale: opz.materiale != null ? opz.materiale : 0,
});
const fila = (n, da, ing, passo, opz = {}) =>
  Array.from({ length: n }, (_, i) => pezzo([da[0] + i * passo, da[1], da[2]], ing, opz));
const griglia = (nx, nz, da, ing, px, pz, opz = {}) => {
  const o = [];
  for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++)
    o.push(pezzo([da[0] + i * px, da[1], da[2] + k * pz], ing, opz));
  return o;
};

// Una scena con tre mucchi ben separati: auto, banconi, sedute.
const scena = C.posti(C.cose([
  ...fila(10, [0, 0.75, 0], [4.5, 1.5, 1.8], 3.0, { nVertici: 300, nTriangoli: 500 }),
  ...fila(8, [60, 0.5, 0], [1.2, 1.0, 0.7], 2.5, { nVertici: 70, nTriangoli: 110 }),
  ...griglia(6, 4, [110, 0.22, 0], [0.5, 0.45, 0.5], 0.6, 0.8),
]).cose);

// La pianta finta: 1 pixel = 10 cm, origine a (-10, -10).
const inq = { larghezza: 1500, altezza: 300, metriPerPixel: 0.1, origine: [-10, -10] };
const inPixel = (x, z) => [(x - inq.origine[0]) / inq.metriPerPixel,
                           (z - inq.origine[1]) / inq.metriPerPixel];

/** Un rilevatore finto che risponde quello che gli si dice. */
function occhioFinto(risposte) {
  return async (_img, parole) => risposte.filter((r) => parole.includes(r.label));
}
/** Una scatola in pixel attorno a un rettangolo del mondo. */
function scatola(x0, z0, x1, z1) {
  const a = inPixel(x0, z0), b = inPixel(x1, z1);
  return { xmin: a[0], ymin: a[1], xmax: b[0], ymax: b[1] };
}

// ---------------------------------------------------------------------------
console.log('\ndalle scatole in pixel alle coordinate del mondo');
// ---------------------------------------------------------------------------

const m = R.scatolaInMondo(inq, scatola(5, 1, 15, 4));
check('una scatola torna dov era', m && Math.abs(m.min[0] - 5) < 0.11 && Math.abs(m.max[0] - 15) < 0.11,
      m && m.min[0].toFixed(2) + '..' + m.max[0].toFixed(2));
check('e anche in profondita', m && Math.abs(m.min[2] - 1) < 0.11 && Math.abs(m.max[2] - 4) < 0.11,
      m && m.min[2].toFixed(2) + '..' + m.max[2].toFixed(2));

// ⚠️ Alcune versioni restituiscono le coordinate fra 0 e 1 invece che in pixel.
//    Indovinare male vorrebbe dire piazzare OGNI scatola nell'angolo in alto a
//    sinistra, e nessuno se ne accorgerebbe guardando i numeri.
const norm = R.scatolaInMondo(inq, { xmin: 0.2, ymin: 0.1, xmax: 0.4, ymax: 0.5 });
check('le coordinate normalizzate 0-1 vengono riconosciute e convertite',
      norm && Math.abs(norm.min[0] - 20) < 0.5, norm && norm.min[0].toFixed(1));
check('e non finiscono tutte nell angolo', norm && norm.max[0] > 30, norm && norm.max[0].toFixed(1));

const rovescia = R.scatolaInMondo(inq, scatola(15, 4, 5, 1));
check('una scatola con gli angoli invertiti viene raddrizzata',
      rovescia && rovescia.min[0] < rovescia.max[0] && rovescia.min[2] < rovescia.max[2]);

// ---------------------------------------------------------------------------
console.log('\nl occhio da i NOMI, la geometria tiene le MISURE');
// ---------------------------------------------------------------------------

const buone = [
  { score: 0.55, label: 'a car', box: scatola(-3, -2, 30, 2) },
  { score: 0.42, label: 'a counter', box: scatola(58, -1, 80, 1) },
  { score: 0.61, label: 'a chair', box: scatola(108, -1, 115, 3) },
];
const r = await R.riconosci(scena, {
  inquadratura: inq, pianta: 'finta', dominio: 'aeroporto', rileva: occhioFinto(buone),
});
check('tre mucchi, tre nomi', r.ok && r.nominati === 3, r.ok ? r.nominati + '' : r.perche);
const perNome = Object.fromEntries(r.posti.filter((p) => p.nome).map((p) => [p.nome, p]));
check('le auto si chiamano automobili', !!perNome['automobili']);
check('i banconi si chiamano bancone', !!perNome['bancone']);
check('i sedili si chiamano sedie', !!perNome['sedie']);

// ⚠️ LA REGOLA CHE REGGE IL REFERTO: la coordinata NON viene dalla scatola del
//    modello. Il modello ha disegnato una scatola che parte da x=-3; il
//    baricentro misurato delle auto sta altrove, ed e' quello che deve restare.
const auto = perNome['automobili'];
const autoMisurato = scena.find((p) => Math.abs(p.centro[0] - auto.centro[0]) < 1e-9);
check('il centro resta quello misurato, non quello della scatola',
      !!autoMisurato && auto.centro[0] === autoMisurato.centro[0]
      && auto.oggetti === autoMisurato.oggetti,
      'x = ' + auto.centro[0].toFixed(2));
check('e area, quota e conteggi non sono stati toccati',
      auto.area === autoMisurato.area && auto.quota === autoMisurato.quota);
check('ogni nome dichiara di venire dall occhio',
      r.posti.filter((p) => p.nome).every((p) => p.provenienza === 'occhio'));
check('e porta con se quanto ci crede', typeof auto.fiducia === 'number' && auto.fiducia > 0,
      auto.fiducia + '');

// ---------------------------------------------------------------------------
console.log('\nquello che il modello sbaglia viene buttato, non creduto');
// ---------------------------------------------------------------------------

// Una rilevazione dove la geometria non ha misurato niente.
const inventata = await R.riconosci(scena, {
  inquadratura: inq, pianta: 'finta', dominio: 'aeroporto',
  rileva: occhioFinto([{ score: 0.9, label: 'a jet bridge', box: scatola(400, 40, 420, 50) }]),
});
check('un oggetto visto dove non c e niente di misurato non crea un posto',
      inventata.ok && inventata.posti.length === scena.length,
      inventata.posti.length + ' vs ' + scena.length);
check('nessun mucchio prende quel nome', inventata.nominati === 0, inventata.nominati + '');
check('e viene contato fra le rilevazioni buttate', inventata.scartate === 1,
      inventata.scartate + '');

// Fiducia troppo bassa.
const debole = await R.riconosci(scena, {
  inquadratura: inq, pianta: 'finta', dominio: 'aeroporto',
  rileva: occhioFinto([{ score: 0.03, label: 'a car', box: scatola(-3, -2, 30, 2) }]),
});
check('una rilevazione debolissima non nomina niente', debole.nominati === 0, debole.nominati + '');

// Etichetta che non e' fra quelle chieste: il modello se l'e' inventata.
const inventaEtichetta = await R.riconosci(scena, {
  inquadratura: inq, pianta: 'finta', dominio: 'aeroporto',
  rileva: async () => [{ score: 0.99, label: 'una sala conferenze', box: scatola(-3, -2, 30, 2) }],
});
check('un etichetta che nessuno ha chiesto viene ignorata',
      inventaEtichetta.nominati === 0 && inventaEtichetta.rilevazioni === 0,
      inventaEtichetta.rilevazioni + ' rilevazioni');

// Campi numerici aggiunti di sua iniziativa.
const conNumeri = await R.riconosci(scena, {
  inquadratura: inq, pianta: 'finta', dominio: 'aeroporto',
  rileva: async () => [{
    score: 0.7, label: 'a car', box: scatola(-3, -2, 30, 2),
    area_m2: 999, capienza: 42, larghezza: 3.3,
  }],
});
const conNum = conNumeri.posti.find((p) => p.nome === 'automobili');
check('i numeri che il modello aggiunge di sua iniziativa non entrano',
      conNum && conNum.area_m2 === undefined && conNum.capienza === undefined,
      conNum ? JSON.stringify(Object.keys(conNum).filter((k) => /area_m2|capienza/.test(k))) : '-');
check('e l area resta quella misurata', conNum && conNum.area !== 999, conNum && conNum.area.toFixed(1));

// ⚠️ Una scatola che copre tutto nominava OGNI mucchio, perche' li conteneva
//    tutti per intero. Una scatola grande quanto l'edificio non indica un
//    mucchio: indica la stanza.
const enorme = await R.riconosci(scena, {
  inquadratura: inq, pianta: 'finta', dominio: 'aeroporto',
  rileva: occhioFinto([{ score: 0.8, label: 'a car', box: scatola(-20, -20, 200, 20) }]),
});
check('una scatola grande quanto la pianta non nomina niente',
      enorme.nominati === 0, enorme.nominati + ' su ' + scena.length);
check('e viene contata fra le buttate', enorme.scartate === 1, enorme.scartate + '');

// ⚠️ Ma il limite vale in una direzione sola. Chiedendo «una fila di sedie» il
//    modello puo' restituire quaranta scatoline, una per sedia: ognuna e' una
//    risposta giusta su quel mucchio, e vanno accettate.
const scatoline = await R.riconosci(scena, {
  inquadratura: inq, pianta: 'finta', dominio: 'aeroporto',
  rileva: occhioFinto([{ score: 0.6, label: 'a chair', box: scatola(111, 0.5, 111.6, 1.1) }]),
});
check('una scatolina dentro un mucchio grande lo nomina lo stesso',
      scatoline.posti.some((p) => p.nome === 'sedie'),
      scatoline.posti.map((p) => p.nome).join(','));

// ---------------------------------------------------------------------------
console.log('\nle persone non nominano niente: sono la controprova');
// ---------------------------------------------------------------------------
//
// ⚠️ Se un mucchio prendesse il nome dalle figure umane, la controprova si
//    darebbe ragione da sola. Vanno riconosciute e messe da parte.

const conPersone = await R.riconosci(scena, {
  inquadratura: inq, pianta: 'finta', dominio: 'aeroporto',
  rileva: occhioFinto([
    { score: 0.95, label: 'a person standing', box: scatola(-3, -2, 30, 2) },
    { score: 0.30, label: 'a car', box: scatola(-3, -2, 30, 2) },
  ]),
});
check('una persona vista sopra un mucchio non gli da il nome',
      conPersone.posti.every((p) => p.nome !== 'persona'),
      conPersone.posti.map((p) => p.nome).join(','));
check('e il mucchio prende il nome dell oggetto, non della persona',
      conPersone.posti.some((p) => p.nome === 'automobili'));
check('le persone vengono contate a parte', conPersone.persone === 1, conPersone.persone + '');

// ---------------------------------------------------------------------------
console.log('\nil vocabolario e aperto: si puo chiedere quello che si vuole');
// ---------------------------------------------------------------------------

const aeroporto = R.vocabolarioPer('aeroporto');
const museo = R.vocabolarioPer('museo');
// ⚠️ La lista pubblicata si chiede in OGNI dominio: un'automobile dentro un
//    museo non e' un errore, e' il suo parcheggio. Solo le aggiunte dichiarate
//    sono legate a un dominio, perche' esistono proprio in quanto quel tipo di
//    edificio ce le ha.
check('la lista pubblicata contiene le automobili in aeroporto',
      aeroporto.some((v) => v.nome === 'automobili'));
check('e anche in museo, che un parcheggio ce l ha pure lui',
      museo.some((v) => v.nome === 'automobili'));
check('i quadri stanno in tutti e due',
      museo.some((v) => v.nome === 'quadri') && aeroporto.some((v) => v.nome === 'quadri'));
check('i banchi del check-in sono un aggiunta solo per aeroporto',
      aeroporto.some((v) => v.chiedi === 'a check-in counter')
      && !museo.some((v) => v.chiedi === 'a check-in counter'));
check('e la biglietteria solo per museo',
      museo.some((v) => v.chiedi === 'a ticket desk')
      && !aeroporto.some((v) => v.chiedi === 'a ticket desk'));
check('ogni voce dichiara da dove viene',
      R.VOCABOLARIO.every((v) => !!v.fonte),
      R.VOCABOLARIO.filter((v) => !v.fonte).length + ' senza fonte');
check('le 150 classi pubblicate ci sono tutte', R.ADE20K_150.length === 150,
      R.ADE20K_150.length + '');
check('senza dominio dichiarato si chiede la lista pubblicata per intero',
      R.vocabolarioPer(null).filter((v) => v.fonte === 'ADE20K-150').length === 150,
      R.vocabolarioPer(null).length + ' voci');
check('con un tetto alle domande restano le piu informative',
      R.vocabolarioPer('aeroporto', [], { limite: 20 }).every((v) => !!v.funzione),
      R.vocabolarioPer('aeroporto', [], { limite: 20 })
        .filter((v) => !v.funzione).map((v) => v.chiedi).join(','));

const conAggiunte = R.vocabolarioPer('aeroporto', ['a ski rack']);
check('l utente puo aggiungere parole sue',
      conAggiunte.some((v) => v.chiedi === 'a ski rack'));
check('e le sue vengono chieste per prime',
      conAggiunte[0].chiedi === 'a ski rack', conAggiunte[0].chiedi);

const suRichiesta = await R.riconosci(scena, {
  inquadratura: inq, pianta: 'finta', dominio: 'aeroporto', parole: ['a ski rack'],
  rileva: occhioFinto([{ score: 0.7, label: 'a ski rack', box: scatola(58, -1, 80, 1) }]),
});
check('e quello che chiede viene cercato davvero',
      suRichiesta.posti.some((p) => p.nome === 'a ski rack'),
      suRichiesta.posti.map((p) => p.nome).join(','));

// Rule of Three: i tre domini devono reggere.
for (const d of ['aeroporto', 'museo', 'gioco'])
  check('il dominio ' + d + ' riceve tutta la lista pubblicata',
        R.vocabolarioPer(d).filter((v) => v.fonte === 'ADE20K-150').length === 150, d);

// ⚠️ IL LEGAME FRA I DUE VOCABOLARI.
//    Le funzioni di questo modulo devono essere chiavi che `veritas_occhi.js`
//    conosce, perche' e' lui a tradurle in tipo di zona e in nome per dominio.
//    Se qualcuno rinomina una chiave di la', qui i nomi smetterebbero di
//    arrivare SENZA NESSUN ERRORE: le tappe resterebbero con l'etichetta
//    misurata e nessuno collegherebbe le due cose. Questa prova lo vede subito.
const O = await import('./veritas_occhi.js');
const chiaviNote = new Set(O.default.FUNZIONI.map((f) => f.chiave));
const ignote = R.VOCABOLARIO.map((v) => v.funzione)
  .filter((f) => f && !chiaviNote.has(f));
check('ogni funzione del vocabolario e nota a veritas_occhi.js',
      ignote.length === 0, ignote.join(', '));
check('e veritas_occhi sa tradurre ognuna in un tipo di zona',
      R.VOCABOLARIO.every((v) => !v.funzione || !!O.default.tipoDiFunzione(v.funzione)),
      R.VOCABOLARIO.filter((v) => v.funzione && !O.default.tipoDiFunzione(v.funzione))
        .map((v) => v.funzione).join(', '));

// ---------------------------------------------------------------------------
console.log('\nquando l occhio e spento, lo dice e non inventa');
// ---------------------------------------------------------------------------

check('senza rilevatore: non si puo fare, e si dice',
      (await R.riconosci(scena, { inquadratura: inq, pianta: 'x' })).perche
        === "l'occhio non e' disponibile");
check('senza pianta: idem',
      /manca la pianta/.test((await R.riconosci(scena, { rileva: occhioFinto([]) })).perche));
check('senza mucchi misurati: idem',
      /non ci sono mucchi/.test((await R.riconosci([], { inquadratura: inq, pianta: 'x', rileva: occhioFinto([]) })).perche));

const esplode = await R.riconosci(scena, {
  inquadratura: inq, pianta: 'x', rileva: async () => { throw new Error('niente rete'); },
});
check('se il modello va in errore, non si perde il resto del programma',
      esplode.ok === false && /niente rete/.test(esplode.perche), esplode.perche);

const rispostaStrana = await R.riconosci(scena, {
  inquadratura: inq, pianta: 'x', rileva: async () => 'non e un elenco',
});
check('se risponde qualcosa di illeggibile, lo dice', rispostaStrana.ok === false,
      rispostaStrana.perche);

check('il racconto di un occhio spento non da nessun nome',
      /Non ho potuto guardare/.test(R.racconta(esplode)));
check('e il racconto buono dice che le posizioni non sono cambiate',
      /la geometria dice dove/.test(R.racconta(r)));

// ---------------------------------------------------------------------------
console.log('\nripetibile: stessa risposta, stessi nomi');
// ---------------------------------------------------------------------------

const due = await R.riconosci(scena, {
  inquadratura: inq, pianta: 'finta', dominio: 'aeroporto', rileva: occhioFinto(buone),
});
check('due passate danno gli stessi nomi sugli stessi mucchi',
      JSON.stringify(r.posti.map((p) => [p.nome, p.centro]))
      === JSON.stringify(due.posti.map((p) => [p.nome, p.centro])));

console.log(ko ? `\n${ko} PROVE FALLITE` : '\ntutte le prove passano');
process.exit(ko ? 1 : 0);
