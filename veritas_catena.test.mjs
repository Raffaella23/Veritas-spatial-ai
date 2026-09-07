// Prova del REFERTO DELLA CATENA — perché un referto che sbaglia è peggio di
// nessun referto.
//   node veritas_catena.test.mjs
//
// ⚠️ Le scene qui sotto sono INVENTATE, e ognuna riproduce un guasto vero già
//    successo. Si sa già la risposta giusta, quindi si può controllare che il
//    referto la trovi — e, cosa che conta di più, che **dica di NO quando deve**
//    e che non gridi quando invece c'è solo da aspettare.
//
// ⚠️ E si prova soprattutto la distinzione che tiene in piedi tutto: «non
//    ancora» non è «rotto». Un referto che chiama guasto l'occhio che sta
//    ancora guardando viene spento dopo due giorni, e allora tanto vale non
//    averlo scritto.
import { catena } from './veritas_catena.js';

let ko = 0;
const check = (nome, avuto, atteso) => {
  const ok = avuto === atteso;
  if (!ok) ko++;
  console.log((ok ? '  ok  ' : '  KO  ') + nome + ' -> ' + avuto
    + (ok ? '' : '   (atteso ' + atteso + ')'));
};

// Un mondo finto, con dentro solo quello che serve.
const BOX = { min: { x: 0, y: 0, z: 0 }, max: { x: 106, y: 11, z: 59 } };
const THREE_FINTO = { Box3: class { setFromObject() { return BOX; } } };
const mondoBuono = () => ({
  THREE: THREE_FINTO,
  __veritasModelRoot: {},
  __veritasRiconosce: { stato: () => ({ fase: 'pronto', device: 'wasm', dtype: 'q8' }) },
  __veritasVisto: { viste: [{ centro: [1, 0, 1] }, { centro: [2, 0, 2] }] },
  __veritasVisteRegione: [{ regione: { min: [0, 0, 0], max: [5, 3, 5] } }],
  __veritasPercezione: { zones: new Array(9).fill({}), totalNavigableM2: 3363.57,
                         gateways: new Array(6).fill({}) },
  __veritasTaglio: { '0.5': { passaggiLarghiTenutiSeparati: 2, testimoniAriaAperta: 36,
                              testimoniCalpestio: 14, ambientiToltiPerMezzi: 1,
                              m2ToltiPerMezzi: 940 } },
  __veritasAccessi: { accessi: [{ nome: 'Accesso 1 da fuori' }, { nome: 'Accesso 2' }] },
  __veritasGetNodes: () => [{ origine: 'misura' }, { origine: 'comprensione' }, { origine: 'misura' }],
  __veritasSimStarted: true,
  __veritasGetTrajectory: () => ({ frames: new Array(800).fill(0) }),
  veritasCinema: { stato: () => ({ aperto: true, zone: 9, puntiTotali: 115848, muri: 366,
                                   cammino: true, passi: 768 }) },
  addEventListener: () => {},
});
const stato = (mondo, n) => { globalThis.window = mondo; return catena().anelli[n - 1].stato; };
const primo = (mondo) => { globalThis.window = mondo; return catena().primoRotto; };

console.log('\n1. la catena intera: nessun allarme');
{
  globalThis.window = mondoBuono();
  const r = catena();
  check('tutto a posto', r.tutto, true);
  check('nessun anello rotto', r.primoRotto, null);
}

console.log('\n2. i guasti veri, uno per uno');
{
  const m = mondoBuono(); delete m.__veritasModelRoot;
  check('modello assente', stato(m, 1), 'rotto');
}
{
  // ⚠️ la trappola del 01/09: un modello più basso di una persona non è in metri
  const m = mondoBuono();
  m.THREE = { Box3: class { setFromObject() { return { min: { x: 0, y: 0, z: 0 },
                                                      max: { x: 20, y: 1.1, z: 11 } }; } } };
  check('modello non in metri', stato(m, 1), 'rotto');
}
{
  // ⚠️ la firma del guasto del 05/09 e del 07/09: 83 m² al posto di 3.364
  const m = mondoBuono();
  m.__veritasPercezione = { zones: new Array(4).fill({}), totalNavigableM2: 83.34, gateways: [] };
  check('83 m²: la passata buona non è partita', stato(m, 4), 'rotto');
}
{
  // ⚠️ il guasto del 04/09: l'occhio guardava e quello che vedeva non usciva
  const m = mondoBuono();
  m.__veritasRiconosce = { stato: () => ({ fase: 'morto', perche: 'nessun formato si apre' }) };
  m.__veritasVisto = { viste: [] }; m.__veritasVisteRegione = [];
  check('occhio spento', stato(m, 2), 'rotto');
  check('e allora la testimonianza non arriverà MAI', stato(m, 3), 'rotto');
}
{
  // il caso che Raffaella ha trovato il 07/09: l'occhio parla, gli ambienti no
  const m = mondoBuono();
  m.__veritasTaglio = { '0.5': { passaggiLarghiTenutiSeparati: 0, testimoniAriaAperta: 0,
                                 testimoniCalpestio: 0, ambientiToltiPerMezzi: 0,
                                 m2ToltiPerMezzi: 0 } };
  check('testimonianza c\'è, taglio no', stato(m, 5), 'rotto');
}
{
  const m = mondoBuono();
  m.__veritasAccessi = { accessi: [{ nome: 'Accesso 1' }, { nome: 'Accesso 2' }] };
  check('nessun accesso «da fuori», e l\'occhio ha già parlato', stato(m, 6), 'rotto');
}
{
  // «tappe messe a caso» — parole di Raffaella, 07/09
  const m = mondoBuono();
  m.__veritasGetNodes = () => [{ origine: 'sequenza' }, { origine: 'sequenza' },
                               { origine: 'posizione' }, { origine: 'misura' }];
  check('tappe messe per posizione', stato(m, 7), 'rotto');
}

console.log('\n3. «NON ANCORA» NON È «ROTTO» — ed è la riga che tiene in piedi il referto');
{
  const m = mondoBuono();
  m.__veritasVisto = { viste: [] }; m.__veritasVisteRegione = [];
  check('occhio acceso che sta ancora guardando', stato(m, 3), 'attesa');
  m.__veritasTaglio = null;
  check('nessun taglio ancora fatto', stato(m, 5), 'attesa');
}
{
  const m = mondoBuono();
  m.__veritasSimStarted = false;
  check('simulazione non avviata', stato(m, 8), 'attesa');
}
{
  const m = mondoBuono();
  m.veritasCinema = { stato: () => ({ aperto: false }) };
  check('film chiuso', stato(m, 9), 'attesa');
}
{
  // ⚠️ Visto girare sul modello vero il 07/09: gli accessi si cercano prima che
  //    l'occhio abbia parlato, e si rifanno da soli quando avra' finito. Finche'
  //    e' cosi', «0 da fuori» e' un'attesa, non un guasto.
  const m = mondoBuono();
  m.__veritasVisto = { viste: [] }; m.__veritasVisteRegione = [];
  m.__veritasAccessi = { accessi: [{ nome: 'Accesso 1' }, { nome: 'Accesso 2' }] };
  check('0 «da fuori» mentre l\'occhio guarda ancora', stato(m, 6), 'attesa');
}

console.log('\n4. il PRIMO rotto, perché gli altri sono la sua ombra');
{
  // occhio spento: cadono testimonianza, confine e accessi. Il referto deve
  // indicare l'occhio, non l'ultimo della fila — additare l'ombra invece della
  // causa è il modo, misurato, di perdere una giornata.
  const m = mondoBuono();
  m.__veritasRiconosce = { stato: () => ({ fase: 'morto', perche: 'non si apre' }) };
  m.__veritasVisto = { viste: [] }; m.__veritasVisteRegione = [];
  m.__veritasTaglio = { '0.5': { passaggiLarghiTenutiSeparati: 0, testimoniAriaAperta: 0,
                                 testimoniCalpestio: 0, ambientiToltiPerMezzi: 0, m2ToltiPerMezzi: 0 } };
  m.__veritasAccessi = { accessi: [{ nome: 'Accesso 1' }] };
  check('indica l\'occhio, non l\'ultimo', primo(m), 'l’occhio');
}

console.log(ko ? '\n' + ko + ' PROVE FALLITE' : '\ntutte le prove passano');
process.exit(ko ? 1 : 0);
