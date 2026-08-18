// Gli occhi:  node veritas_occhi.test.mjs
//
// Gira SENZA nessun modello acceso e senza browser: prova la domanda, la rete
// di verifica e la preparazione dell'immagine. La lettura vera di una pianta
// la puo' provare solo Raffaella con LM Studio acceso — e' scritto in fondo.
//
// Quello che queste prove difendono e' la REGOLA, non la bravura del modello:
// gli occhi possono dare nomi, mai numeri, e tutto cio' che non combacia con
// una zona che esiste davvero si butta. Un modello che sbaglia deve poter
// sbagliare senza rompere niente.
import {
  FUNZIONI, tipoDiFunzione, prompt, estraiJSON, validaRisposta,
  riquadriZone, immagineConZone, chiedi, racconta,
} from './veritas_occhi.js';
import { inquadratura, mondoAPixel } from './veritas_vista.js';

let ko = 0;
const check = (n, ok, d = '') => {
  console.log((ok ? '  ok  ' : ' FAIL ') + n + (d ? '   ' + d : ''));
  if (!ok) ko++;
};

// Tre zone finte, con le sole cose che gli occhi possono vedere.
const ZONE = [
  { nome: 'Zona 1', pos: [-40, 0, -30], area: 1800 },
  { nome: 'Zona 2', pos: [0, 0, 0], area: 400 },
  { nome: 'Zona 3', pos: [30, 0, 20], area: 90, allungamento: 5 },
];

// ---------------------------------------------------------------------------
console.log('1. il vocabolario non puo introdurre tipi nuovi');
{
  // ⚠️ §14.3: spawn/checkin/security/lounge/gate e' PORTANTE — ci si appoggiano
  //    generatore di traiettorie, altezze dei marker e grafo delle missioni.
  //    Se gli occhi potessero inventare un tipo, si romperebbero venti punti
  //    del programma in silenzio.
  const portanti = new Set(['spawn', 'checkin', 'security', 'lounge', 'gate', 'passaggio', 'escluso']);
  const fuori = FUNZIONI.filter((f) => !portanti.has(f.tipo));
  check('ogni funzione ricade in un tipo gia esistente', fuori.length === 0,
    fuori.length ? fuori.map((f) => f.chiave + '->' + f.tipo).join(', ') : FUNZIONI.length + ' funzioni');
  check('una funzione inventata non ha tipo', tipoDiFunzione('sala_del_trono') === null);
  check('il parcheggio e fuori, l accoglienza dentro',
    FUNZIONI.find((f) => f.chiave === 'parcheggio').fuori === true
    && FUNZIONI.find((f) => f.chiave === 'accoglienza').fuori === false);

  // Rule of Three: le stesse funzioni devono servire i tre domini.
  const chiavi = new Set(FUNZIONI.map((f) => f.chiave));
  check('regge aeroporto, museo e gaming con lo stesso vocabolario',
    chiavi.has('accoglienza') && chiavi.has('esposizione') && chiavi.has('controlli')
    && chiavi.has('destinazione') && chiavi.has('parcheggio'));
}

// ---------------------------------------------------------------------------
console.log('\n2. la domanda: numeri di zona, mai coordinate');
{
  const p = prompt(ZONE, { dominio: 'aeroporto' });
  check('cita le zone per numero', /zona 1:/.test(p) && /zona 3:/.test(p));
  check('dichiara il dominio quando lo sa', /aeroporto/.test(p));
  check('elenca tutte le funzioni ammesse',
    FUNZIONI.every((f) => p.includes(f.chiave)), FUNZIONI.length + ' funzioni');
  // Se il modello vedesse le coordinate potrebbe ragionare sui numeri invece
  // che sull'immagine, ed e' esattamente cio' che non deve fare.
  check('NON passa le coordinate delle zone', !/-40/.test(p) && !/\[.*0.*,.*0.*\]/.test(p));
  check('vieta esplicitamente di inventare misure', /NON inventare misure/.test(p));
  check('permette di non rispondere', /OMETTILA/.test(p));
  check('dice come si riconosce un parcheggio guardando', /righe bianche/.test(p));

  const senza = prompt(ZONE);
  check('senza dominio non se lo inventa', !/aeroporto|museo/.test(senza));
}

// ---------------------------------------------------------------------------
console.log('\n3. la rete: tutto quello che non combacia si butta');
{
  const buona = '{"zone":[{"n":1,"funzione":"parcheggio","sicurezza":"alta"},'
              + '{"n":2,"funzione":"ingresso","sicurezza":"media"},'
              + '{"n":3,"funzione":"corridoio","sicurezza":"bassa"}]}';
  const e = validaRisposta(buona, ZONE);
  check('una risposta buona passa tutta', e.assegnate.length === 3 && e.scartate.length === 0);
  check('e porta con se il tipo portante',
    e.assegnate[0].tipo === 'spawn' && e.assegnate[2].tipo === 'passaggio',
    e.assegnate.map((a) => a.funzione + '->' + a.tipo).join(', '));
  check('e la sicurezza dichiarata', e.assegnate[2].sicurezza === 'bassa');

  // I modelli piccoli incorniciano il JSON: e' la norma, non un'eccezione.
  const incorniciata = 'Ecco la mia analisi:\n```json\n' + buona + '\n```\nSpero sia utile!';
  check('il JSON incorniciato si estrae lo stesso',
    validaRisposta(incorniciata, ZONE).assegnate.length === 3);

  const storta = '{"zone":[{"n":9,"funzione":"parcheggio"},'      // zona che non esiste
               + '{"n":1,"funzione":"sala_del_trono"},'           // funzione inventata
               + '{"n":2,"funzione":"attesa"},'
               + '{"n":2,"funzione":"controlli"},'                // doppione
               + '{"n":"due","funzione":"attesa"}]}';             // numero non numero
  const s = validaRisposta(storta, ZONE);
  check('passa solo la risposta valida', s.assegnate.length === 1 && s.assegnate[0].indice === 1,
    s.assegnate.length + ' assegnate');
  check('e le altre quattro sono scartate con la ragione', s.scartate.length === 4,
    s.scartate.map((x) => x.perche).join(' | '));

  check('una risposta illeggibile non assegna niente',
    validaRisposta('mi dispiace, non riesco a vedere l immagine', ZONE).assegnate.length === 0);
  check('e nemmeno un JSON senza zone', validaRisposta('{"ok":true}', ZONE).assegnate.length === 0);
  check('estraiJSON regge il testo prima e dopo',
    estraiJSON('bla {"a":{"b":1}} bla').a.b === 1);

  // ⚠️ La prova che conta di piu': gli occhi non devono poter spostare niente.
  const conNumeri = '{"zone":[{"n":1,"funzione":"parcheggio","area":9999,'
                  + '"pos":[100,0,100],"larghezza":3.2}]}';
  const c = validaRisposta(conNumeri, ZONE);
  const campi = Object.keys(c.assegnate[0]).sort().join(',');
  check('nessun numero del modello sopravvive alla verifica',
    campi === 'funzione,fuori,indice,sicurezza,tipo', campi);
}

// ---------------------------------------------------------------------------
console.log('\n4. i numeri finiscono dove stanno le zone');
{
  const inq = inquadratura({ min: [-60, 0, -40], max: [60, 8, 40] }, 0.1, 2048);
  const q = riquadriZone(inq, ZONE, mondoAPixel);
  check('tutte e tre le zone cadono nell immagine', q.every((x) => x !== null));
  // La zona 1 sta in basso a sinistra nel mondo: px piccolo, py piccolo.
  check('la zona 1 sta dove deve', q[0].px < inq.larghezza / 2 && q[0].py < inq.altezza / 2,
    'px ' + q[0].px + ', py ' + q[0].py + ' su ' + inq.larghezza + 'x' + inq.altezza);
  check('la zona 3 dalla parte opposta', q[2].px > q[1].px && q[2].py > q[1].py);
  check('il cerchio e piu grande dove la zona e piu grande', q[0].raggio > q[2].raggio,
    q[0].raggio.toFixed(0) + ' contro ' + q[2].raggio.toFixed(0) + ' pixel');

  const fuori = riquadriZone(inq, [{ pos: [9999, 0, 9999], area: 10 }], mondoAPixel);
  check('una zona fuori quadro non fa saltare niente', fuori[0] === null);
  const senzaPos = riquadriZone(inq, [{ area: 10 }], mondoAPixel);
  check('e nemmeno una zona senza posizione', senzaPos[0] === null);
}

// ---------------------------------------------------------------------------
console.log('\n5. l immagine: ribaltata nel verso giusto');
// ⚠️ readRenderTargetPixels da' le righe dal basso verso l'alto, il canvas le
//    vuole dall'alto. Senza ribaltare, il modello guarda la pianta a testa in
//    giu' e risponde lo stesso, sbagliando in modo plausibile. Difetto
//    silenzioso da manuale (§11.5).
{
  const disegnato = { archi: 0, testi: [], riempimenti: 0 };
  let scritta = null;
  const contesto = () => ({
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: (img) => { scritta = img; },
    drawImage: () => {}, fillRect: () => { disegnato.riempimenti++; },
    beginPath: () => {}, arc: () => { disegnato.archi++; }, stroke: () => {}, fill: () => {},
    fillText: (t) => { disegnato.testi.push(t); },
    set fillStyle(v) {}, set strokeStyle(v) {}, set lineWidth(v) {},
    set font(v) {}, set textAlign(v) {}, set textBaseline(v) {},
  });
  const doc = { createElement: () => ({
    width: 0, height: 0, getContext: contesto, toDataURL: () => 'data:image/png;base64,FINTA',
  }) };

  // Pianta 4x3: la riga in basso (y=0) e' rossa, tutto il resto nero.
  const larg = 4, alt = 3;
  const pixel = new Uint8Array(larg * alt * 4);
  for (let x = 0; x < larg; x++) { pixel[x * 4] = 255; pixel[x * 4 + 3] = 255; }
  const pianta = { pixel, larghezza: larg, altezza: alt, metriPerPixel: 1, origine: [0, 0] };

  const img = immagineConZone(doc, pianta, [{ pos: [1.5, 0, 0.5], area: 3 }], mondoAPixel);
  check('produce un PNG', !!img && /^data:image\/png/.test(img.dataURL));
  check('e disegna il numero della zona', disegnato.testi.join() === '1', disegnato.testi.join());
  check('con il cerchio attorno', disegnato.archi >= 2);
  check('e un fondo, non la trasparenza', disegnato.riempimenti >= 1);

  // La riga rossa stava in BASSO nella pianta: dopo il ribaltamento deve
  // trovarsi nell'ULTIMA riga del canvas.
  const primaRiga = scritta.data[0], ultimaRiga = scritta.data[(alt - 1) * larg * 4];
  check('la pianta e ribaltata: il basso sta in basso', primaRiga === 0 && ultimaRiga === 255,
    'prima riga R=' + primaRiga + ', ultima riga R=' + ultimaRiga);
}

// ---------------------------------------------------------------------------
console.log('\n6. la richiesta al modello');
{
  let inviato = null;
  global.fetch = async (url, o) => {
    inviato = { url, corpo: JSON.parse(o.body) };
    return { ok: true, json: async () => ({ choices: [{ message: { content: '{"zone":[]}' } }] }) };
  };
  await chiedi('data:image/png;base64,XYZ', 'guarda questa pianta',
    { url: 'http://localhost:1234/v1', model: 'qwen-vl' });
  check('va sull endpoint compatibile OpenAI', /\/v1\/chat\/completions$/.test(inviato.url), inviato.url);
  check('a temperatura 0: due analisi uguali danno lo stesso esito', inviato.corpo.temperature === 0);
  const parti = inviato.corpo.messages[0].content;
  check('manda testo E immagine insieme',
    parti.length === 2 && parti[0].type === 'text' && parti[1].type === 'image_url');
  check('e l immagine e quella preparata', parti[1].image_url.url === 'data:image/png;base64,XYZ');
  check('usa lo stesso modello configurato per la console', inviato.corpo.model === 'qwen-vl');

  global.fetch = async () => ({ ok: false, status: 404 });
  let caduto = false;
  try { await chiedi('data:x', 'q', { url: 'http://x/v1' }); } catch (e) { caduto = true; }
  check('un modello spento fa fallire in modo pulito', caduto);
  delete global.fetch;
}

// ---------------------------------------------------------------------------
console.log('\n7. cosa si dice in chat');
{
  const e = validaRisposta('{"zone":[{"n":1,"funzione":"parcheggio","sicurezza":"alta"},'
    + '{"n":2,"funzione":"ingresso","sicurezza":"bassa"}]}', ZONE);
  e.disponibile = true; e.totale = 3;
  const t = racconta(e, ZONE);
  check('dice quante ne ha riconosciute', /2 zone su 3/.test(t), t);
  check('dichiara le incerte', /non sono sicuro/.test(t));
  check('e invita a correggere', /dimmelo e correggo/.test(t));

  const spento = racconta({ disponibile: false, perche: 'il modello che vede non risponde' }, ZONE);
  check('a modello spento lo dice, e dichiara di usare le misure',
    /non risponde/.test(spento) && /misure/.test(spento), spento);
}

console.log('\n' + (ko ? ko + ' PROVE FALLITE' : 'tutte le prove passate'));
if (!ko) console.log('\n⚠️ La lettura vera di una pianta non e provabile da qui: serve LM Studio\n'
  + '   acceso con un modello che vede (Qwen2-VL, LLaVA, MiniCPM-V).');
process.exit(ko ? 1 : 0);
