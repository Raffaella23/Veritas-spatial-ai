// Dove sta cio' che l'occhio ha visto:   node veritas_posa.test.mjs
//
// Una scena vera di three, senza finestra: un pavimento, un muro con una porta
// larga 2 m, un muro di fondo, una seduta davanti al muro. Una telecamera a
// occhio umano guarda il muro. I riquadri li disegna la prova proiettando le
// cose vere sulla foto — gli stessi riquadri che disegnerebbe l'occhio — e poi
// si chiede a veritas_posa.js di rimetterle nello spazio.
import * as THREE from 'three';
import {
  inFrazioni, istantaneaCamera, puntiNelRiquadro, primoPiano, impronta,
  posaRiquadro, posaVarco,
} from './veritas_posa.js';

let ko = 0;
const check = (n, ok, d = '') => { console.log((ok ? '  ok  ' : ' FAIL ') + n + (d ? '   ' + d : '')); if (!ok) ko++; };
const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);

console.log('1. i riquadri in frazioni della foto mandata');
const px = [{ label: 'a door', score: 0.8, box: { xmin: 512, ymin: 100, xmax: 768, ymax: 572 } }];
const fr = inFrazioni(px, 1024, 572);
check('pixel della tela piccola -> frazioni', fr[0].box.xmin === 0.5 && fr[0].box.xmax === 0.75 && fr[0].box.ymax === 1,
  JSON.stringify(fr[0].box));
check('gia\' in frazioni: non si tocca', inFrazioni([{ box: { xmin: 0.1, ymin: 0.2, xmax: 0.3, ymax: 0.4 } }], 1024, 572)[0].box.xmin === 0.1);
check('il difetto del dimezzamento: un riquadro da 1024 px letto su una pianta da 2048 finiva a meta\'',
  fr[0].box.xmin * 2048 === 1024, 'ora 0,5 della pianta = pixel 1024 su 2048, non 512');
check('niente misure della tela: si restituisce com\'era', inFrazioni(px, 0, 0) === px);

console.log('\n2. i raggi dentro il riquadro');
const pr = puntiNelRiquadro({ xmin: 0.4, ymin: 0.4, xmax: 0.6, ymax: 0.6 }, 5);
check('25 raggi', pr.length === 25);
check('tutti dentro il riquadro, in coordinate della telecamera', pr.every(([x, y]) => x > -0.2 && x < 0.2 && y > -0.2 && y < 0.2));
check('la riga 0 della foto e\' in alto (y positivo)', puntiNelRiquadro({ xmin: 0.4, ymin: 0, xmax: 0.6, ymax: 0.1 }, 1)[0][1] > 0.8);

console.log('\n3. il primo piano');
const seduta = [4.8, 4.9, 5.0, 5.1, 5.0, 4.95, 5.05].map((d) => ({ punto: [d, 0.5, 0], distanza: d }));
const fondo = [10.1, 10.2, 10.1].map((d) => ({ punto: [d, 1, 0], distanza: d }));
const pp = primoPiano([...fondo, ...seduta]);
check('la seduta davanti al muro: si tiene la seduta', pp.length === 7 && pp.every((k) => k.distanza < 6));
const sbieco = Array.from({ length: 20 }, (_, i) => ({ punto: [0, 1, 0], distanza: 5 + i * 0.6 }));
check('un muro visto di sbieco resta intero (nessun salto)', primoPiano(sbieco).length === 20);
check('l\'impronta ha minimo, massimo e centro', (() => { const i = impronta([[0, 0, 0], [2, 1, 4]]); return i.centro[2] === 2 && i.max[1] === 1; })());

// ---------------------------------------------------------------------------
// La scena
// ---------------------------------------------------------------------------
const scena = new THREE.Scene();
const radice = new THREE.Group();
scena.add(radice);
const mat = new THREE.MeshBasicMaterial();
const aggiungi = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); radice.add(m); return m; };
aggiungi(40, 0.1, 30, 10, -0.05, 0);            // pavimento, sotto y = 0
aggiungi(0.2, 3, 9, 10, 1.5, -5.5);             // muro: z da -10 a -1
aggiungi(0.2, 3, 9, 10, 1.5, 5.5);              // muro: z da 1 a 10  -> porta fra -1 e 1
aggiungi(0.2, 0.8, 2, 10, 2.6, 0);              // architrave sopra la porta (da 2,2 a 3 m)
aggiungi(0.2, 3, 20, 25, 1.5, 0);               // muro di fondo, 15 m dietro la porta
aggiungi(0.6, 0.9, 0.6, 6, 0.45, 4);            // una seduta davanti al muro
radice.updateMatrixWorld(true);

const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.05, 200);
cam.position.set(0, 1.6, 0);
cam.lookAt(10, 1.5, 0);
cam.updateMatrixWorld(true);
cam.updateProjectionMatrix();
const vista = { camera: istantaneaCamera(cam), larghezza: 1024, altezza: 576 };
check('\nl\'istantanea della telecamera ha proiezione e posizione', vista.camera && vista.camera.proiezione.length === 16 && vista.camera.mondo.length === 16);

/** Il riquadro che l'occhio disegnerebbe attorno a una scatola di mondo. */
function riquadroDi(min, max) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) {
    const p = new THREE.Vector3(x, y, z).project(cam);
    const u = (p.x + 1) / 2, v = (1 - p.y) / 2;
    x0 = Math.min(x0, u); x1 = Math.max(x1, u); y0 = Math.min(y0, v); y1 = Math.max(y1, v);
  }
  return { xmin: x0, ymin: y0, xmax: x1, ymax: y1 };
}

console.log('\n4. un tratto di muro, posato');
const muro = posaRiquadro(THREE, radice, vista, riquadroDi([9.9, 0.5, 2], [10.1, 2.5, 7]));
check('i raggi colpiscono', muro && muro.colpiti >= 20, muro && (muro.colpiti + ' su ' + muro.raggi));
check('tutti i punti sulla faccia del muro (x = 9,9)', muro.punti.every((p) => Math.abs(p[0] - 9.9) < 0.05),
  'x da ' + f1(muro.mondo.min[0]) + ' a ' + f1(muro.mondo.max[0]));
check('lungo il muro, dove era il riquadro (z fra 2 e 7)', muro.mondo.min[2] > 1.8 && muro.mondo.max[2] < 7.2,
  'z da ' + f1(muro.mondo.min[2]) + ' a ' + f1(muro.mondo.max[2]));

console.log('\n5. la seduta davanti al muro');
const sed = posaRiquadro(THREE, radice, vista, riquadroDi([5.7, 0, 3.7], [6.3, 0.9, 4.3]));
check('posata sulla seduta, non sul muro dietro', sed && sed.centro && Math.abs(sed.centro[0] - 5.9) < 0.6 && Math.abs(sed.centro[2] - 4) < 0.6,
  sed && sed.centro ? 'centro ' + sed.centro.map(f1).join(', ') : 'nessun colpo');

console.log('\n6. la porta aperta: si posa sul suo muro, non su quello di fondo');
const riqPorta = riquadroDi([10, 0, -1], [10, 2.2, 1]);
const dentroIlBuco = posaRiquadro(THREE, radice, vista, riqPorta);
check('(controprova) i raggi dentro il buco finiscono sul muro di fondo', dentroIlBuco.centro && dentroIlBuco.centro[0] > 20,
  dentroIlBuco.centro ? 'x = ' + f1(dentroIlBuco.centro[0]) : 'nessun colpo');
const varco = posaVarco(THREE, radice, vista, riqPorta);
check('il varco sta sul piano del muro (x ~ 9,9)', varco && varco.centro && Math.abs(varco.centro[0] - 9.9) < 0.3,
  varco && varco.centro ? 'x = ' + f1(varco.centro[0]) + ', distanza ' + f1(varco.distanza) : 'nessuna misura');
check('ed e\' largo quanto la porta (z da -1 a 1)', varco.segmento && Math.abs(varco.segmento[0][2] + 1) < 0.35 && Math.abs(varco.segmento[1][2] - 1) < 0.35,
  varco.segmento ? 'z da ' + f1(varco.segmento[0][2]) + ' a ' + f1(varco.segmento[1][2]) : '');

console.log('\n7. il modello con un genitore spostato: la telecamera lo segue');
const genitore = new THREE.Group();
genitore.position.set(100, 0, 0);
scena.remove(radice); genitore.add(radice); scena.add(genitore);
const spostato = posaRiquadro(THREE, radice, vista, riquadroDi([9.9, 0.5, 2], [10.1, 2.5, 7]));
check('stessi punti, spostati di 100 m come il modello', spostato && Math.abs(spostato.centro[0] - 109.9) < 0.1,
  spostato && spostato.centro ? 'x = ' + f1(spostato.centro[0]) : '');

console.log('\n8. niente telecamera, niente posizione (non si inventa)');
check('una vista senza telecamera non posa niente', posaRiquadro(THREE, radice, { larghezza: 10 }, { xmin: 0, ymin: 0, xmax: 1, ymax: 1 }) === null);

console.log(ko ? '\n' + ko + ' PROVE FALLITE' : '\ntutte le prove passate');
process.exit(ko ? 1 : 0);
