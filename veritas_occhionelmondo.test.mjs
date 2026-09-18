// L'occhio posa nel mondo cio' che vede:   node veritas_occhionelmondo.test.mjs
//
// HANDOFF §9 (17/09/2026): il canale dell'occhio si costruisce sulle immagini,
// per tutti i modelli, e serve a muri, varchi e riconoscimento delle zone.
// Questa prova il COLLEGAMENTO dentro il giro dell'occhio (veritas_comprensione):
// da una foto con la sua telecamera escono cose posate nel mondo, con la loro
// conseguenza sul passo; le cose posate danno il nome ai mucchi misurati; e il
// cervello riceve, volume per volume, che cosa l'occhio ci ha visto dentro.
// La geometria dei raggi e' provata a parte, su una scena vera, in
// veritas_posa.test.mjs: qui `posa` e `posaVarco` sono finte e dichiarate.
import { occhioSuTutteLeViste, cosePerVolume } from './veritas_comprensione.js';

let ko = 0;
const check = (n, ok, d = '') => { console.log((ok ? '  ok  ' : ' FAIL ') + n + (d ? '   ' + d : '')); if (!ok) ko++; };

// Due mucchi misurati: un gruppo di sedute (volume 0) e un banco (volume 1).
const posti = [
  { ingombro: { min: [0, 0, 0], max: [6, 0, 3] }, centro: [3, 0, 1.5], area: 18, oggetti: 20 },
  { ingombro: { min: [20, 0, 0], max: [24, 0, 1] }, centro: [22, 0, 0.5], area: 4, oggetti: 1 },
];
const camera = { ortografica: false, proiezione: new Array(16).fill(0), mondo: new Array(16).fill(0) };
const daDentro = { etichetta: 'da dentro 1', camera, larghezza: 1024, altezza: 576 };
const senzaCamera = { etichetta: 'veduta vecchia', larghezza: 1024, altezza: 576 };

// L'occhio finto: in ogni foto vede una sedia, una porta, un tratto di muro e una persona.
const visti = [
  { label: 'a chair', score: 0.71, box: { xmin: 0.1, ymin: 0.5, xmax: 0.2, ymax: 0.7 } },
  { label: 'a door', score: 0.64, box: { xmin: 0.4, ymin: 0.2, xmax: 0.5, ymax: 0.8 } },
  { label: 'a wall', score: 0.55, box: { xmin: 0.6, ymin: 0.1, xmax: 0.9, ymax: 0.8 } },
  { label: 'a person standing', score: 0.9, box: { xmin: 0.3, ymin: 0.4, xmax: 0.35, ymax: 0.9 } },
  { label: 'a chair', score: 0.1, box: { xmin: 0.7, ymin: 0.5, xmax: 0.75, ymax: 0.6 } },   // troppo incerta
];
const chiamate = { posa: 0, varco: 0 };
const dove = {           // dove la finta «posa» mette ogni cosa, per riquadro
  0.1: { min: [1, 0, 0.5], max: [2, 0.9, 1.5] },       // la sedia: dentro il volume 0
  0.6: { min: [10, 0.5, -3], max: [10.2, 2.5, 3] },    // il muro
  0.3: { min: [4, 0, 1], max: [4.5, 1.8, 1.4] },       // la persona: dentro il volume 0
};
const ctx = {
  posti,
  scorci: [daDentro, senzaCamera],
  rileva: async () => visti,
  posa: (vista, box) => {
    chiamate.posa++;
    const m = dove[box.xmin];
    return m ? { mondo: { ...m, centro: [(m.min[0] + m.max[0]) / 2, 0, (m.min[2] + m.max[2]) / 2] },
                 punti: [m.min, m.max], raggi: 25, colpiti: 25 } : null;
  },
  posaVarco: () => {
    chiamate.varco++;
    return { mondo: { min: [10, 0, -1], max: [10, 0, 1], centro: [10, 0, 0] }, segmento: [[10, 1, -1], [10, 1, 1]], raggi: 12, colpiti: 12 };
  },
};

const visto = await occhioSuTutteLeViste(ctx, [], [], false);
const nm = visto.nelMondo;

console.log('1. solo le foto con la telecamera posano');
check('la foto senza telecamera non chiama posa (non si inventa una posizione)', visto.posa.viste === 1);
check('la sedia troppo incerta non si posa (sotto la fiducia del testimone)', visto.posa.riquadri === 4, visto.posa.riquadri + ' riquadri');

console.log('\n2. ogni cosa col suo modo di posarsi');
check('la porta passa da posaVarco (sul piano del muro, non attraverso)', chiamate.varco === 1);
check('sedia, muro e persona passano da posa', chiamate.posa === 3);
const porta = nm.find((o) => o.termine === 'door'), muro = nm.find((o) => o.termine === 'wall');
check('la porta porta la conseguenza «varco» e il suo segmento', porta && porta.passo === 'varco' && Array.isArray(porta.segmento));
check('il muro porta la conseguenza «ferma» e i suoi punti', muro && muro.passo === 'ferma' && muro.punti.length === 2);
check('ogni cosa posata dice da quale foto viene', nm.every((o) => o.vista === 'da dentro 1' && o.da === 'prospettiva'));

console.log('\n3. le cose posate nominano i mucchi misurati');
const prosp = visto.esitiPianta.find((e) => /prospettiva/.test(e.vista));
check('c\'e\' un esito «viste in prospettiva, posate nel mondo»', !!prosp);
check('il mucchio 0 prende il nome dalla sedia vista da dentro', prosp && prosp.esito.posti[0].nome === 'sedie' && prosp.esito.posti[0].provenienza === 'occhio',
  prosp ? String(prosp.esito.posti[0].nome) : '');
check('la persona non nomina niente (e\' la controprova)', prosp && prosp.esito.posti.every((p) => p.nome !== 'persone'));

console.log('\n4. al cervello: che cosa c\'e\' dentro ogni volume');
check('volume 0: sedie, dalla foto da dentro', visto.perVolume.length === 1 && visto.perVolume[0].id === 0
  && visto.perVolume[0].cose[0].nome === 'sedie', JSON.stringify(visto.perVolume));
check('la testimonianza lo dice con le parole «DOVE» e «volume 0»', /DOVE l'occhio/.test(visto.testimonianza) && /volume 0 \(18 m2\): sedie/.test(visto.testimonianza));
check('senza cose posate, nessun volume', cosePerVolume(posti, []).length === 0);

console.log(ko ? '\n' + ko + ' PROVE FALLITE' : '\ntutte le prove passate');
process.exit(ko ? 1 : 0);
