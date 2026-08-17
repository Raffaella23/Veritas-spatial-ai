// Prova della ricostruzione dei marker:  node veritas_marker.test.mjs
//
// IL CASO VERO, fotografato il 17/08/2026: nella scena comparivano scatole con
// scritto LOUNGE / IMBARCO A / GATE A1 in mezzo al piazzale, su un modello che
// non era un aeroporto e non aveva quelle zone.
//
// La causa non era la segmentazione. Il gruppo dei marker viene costruito UNA
// volta dal bundle React, sui sei nodi cablati al suo interno (ingresso
// [-45,0,-38] ... gate_A1 [48,0,32]). moveHotspotVisual indicizza
// children[i*3], quindi i marker in eccesso non venivano mai spostati e
// restavano alle coordinate di quell'altro scalo, mentre le zone oltre la
// sesta non ricevevano alcun marker.
//
// Qui si verifica che il numero di marker segua SEMPRE il numero di zone.
import fs from 'node:fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const a = html.indexOf('  function veritasDisposeChild(obj) {');
const fine = html.indexOf('\n  function moveHotspotVisual', a);
if (a < 0 || fine < 0) { console.error('Ancore non trovate.'); process.exit(2); }

let ko = 0;
const check = (n, ok, d = '') => { console.log((ok ? '  ok  ' : ' FAIL ') + n + (d ? '   ' + d : '')); if (!ok) ko++; };

// --- stub minimo di THREE e del DOM: qui interessa la CONTABILITA' dei figli,
// non la grafica. Ogni oggetto tiene traccia di essere stato liberato, cosi'
// si verifica anche che non si perda memoria a ogni rianalisi.
let disposed = 0;
class Obj {
  constructor() { this.position = { x:0, y:0, z:0, set(x,y,z){ this.x=x; this.y=y; this.z=z; } };
                  this.rotation = { x:0, y:0, z:0 };
                  this.scale = { x:1, y:1, z:1, set(x,y,z){ this.x=x; this.y=y; this.z=z; },
                                 setScalar(v){ this.x=this.y=this.z=v; } }; }
}
function geom() { return { dispose() { disposed++; }, parameters: { height: 2 } }; }
function mat(o) { return { ...(o || {}), dispose() { disposed++; }, map: o && o.map }; }
class Mesh extends Obj { constructor(g, m) { super(); this.geometry = g; this.material = m; } }
class Sprite extends Obj { constructor(m) { super(); this.material = m; } }
class Group extends Obj {
  constructor() { super(); this.children = []; this.visible = true; }
  add(o) { this.children.push(o); }
  remove(o) { const i = this.children.indexOf(o); if (i >= 0) this.children.splice(i, 1); }
}
const THREE = {
  Mesh, Sprite, Group,
  BoxGeometry: geom, RingGeometry: geom,
  MeshStandardMaterial: mat, MeshBasicMaterial: mat,
  SpriteMaterial: mat, CanvasTexture: function () { return { dispose(){ disposed++; } }; },
  DoubleSide: 2, SRGBColorSpace: 'srgb',
};
const ctx2d = new Proxy({}, { get: () => () => {}, set: () => true });
const documentStub = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx2d }) };

let currentNodes = [];
const win = { THREE, __veritasHotspotGroup: null };
// currentNodes e' un parametro: le funzioni estratte lo chiudono sopra, e il
// setter lo rilega, esattamente come fa la chiusura del blocco 2.
const mod = new Function('window', 'document', 'console', 'currentNodes',
  html.slice(a, fine)
  + "\n  return { veritasRebuildHotspots, veritasEnsurePassengerPool, setNodes(n){ currentNodes = n; } };"
)(win, documentStub, { log() {} }, currentNodes);

// currentNodes e' una chiusura: si rilega tramite il setter esposto sopra
const rebuild = (nodi) => { mod.setNodes(nodi); return mod.veritasRebuildHotspots(); };

const nodo = (id, type, x) => ({ id, type, label: id, pos: [x, 0, 0] });

// il gruppo com'e' quando lo consegna il bundle: sei nodi cablati, 18 figli
const gruppoDelBundle = () => {
  const g = new Group();
  for (let i = 0; i < 18; i++) g.add(new Mesh(geom(), mat({})));
  return g;
};

console.log('il caso fotografato: 3 zone misurate, 6 marker cablati');
win.__veritasHotspotGroup = gruppoDelBundle();
check('il gruppo del bundle parte con 18 figli (6 marker)',
      win.__veritasHotspotGroup.children.length === 18);
rebuild([nodo('z0','spawn',0), nodo('z1','security',10), nodo('z2','gate',20)]);
check('dopo la ricostruzione i marker sono 3, non 6',
      win.__veritasHotspotGroup.children.length === 9,
      win.__veritasHotspotGroup.children.length / 3 + ' marker');
check('nessun marker resta alle coordinate dell altro scalo',
      win.__veritasHotspotGroup.children.every((c) => c.position.x <= 20),
      'x massima ' + Math.max(...win.__veritasHotspotGroup.children.map((c) => c.position.x)));

console.log('\npiu di sei zone: prima la settima non aveva alcun marker');
win.__veritasHotspotGroup = gruppoDelBundle();
const nove = Array.from({ length: 9 }, (_, i) => nodo('z' + i, i === 8 ? 'gate' : 'checkin', i * 5));
rebuild(nove);
check('nove zone -> nove marker', win.__veritasHotspotGroup.children.length === 27,
      win.__veritasHotspotGroup.children.length / 3 + ' marker');
check('anche la nona ha il suo marker',
      win.__veritasHotspotGroup.children.some((c) => c.position.x === 40));

console.log('\nla memoria non cresce a ogni rianalisi');
disposed = 0;
win.__veritasHotspotGroup = gruppoDelBundle();
rebuild([nodo('a','spawn',0), nodo('b','gate',5)]);
check('i figli vecchi vengono liberati, non solo staccati', disposed > 0, disposed + ' dispose');

console.log('\nnon si ricostruisce quando non serve');
win.__veritasHotspotGroup = gruppoDelBundle();
const sei = Array.from({ length: 6 }, (_, i) => nodo('z' + i, 'checkin', i));
check('sei zone su sei marker: nessuna ricostruzione', rebuild(sei) === false);
check('tre zone su sei marker: ricostruisce', rebuild(sei.slice(0, 3)) === true);

console.log('\nordine dei figli: box, anello, etichetta -- lo assume moveHotspotVisual');
win.__veritasHotspotGroup = gruppoDelBundle();
rebuild([nodo('z0','gate',7)]);
const [box, ring, spr] = win.__veritasHotspotGroup.children;
check('il primo e la scatola, alzata di meta altezza', box.position.y === 1.75, 'y=' + box.position.y);
check('il secondo e l anello, appoggiato a terra', ring.position.y === 0.02);
check('il terzo e l etichetta, sopra la scatola', spr.position.y === 4.7, 'y=' + spr.position.y);
check('tutti e tre sulla stessa zona',
      box.position.x === 7 && ring.position.x === 7 && spr.position.x === 7);

console.log('\ncasi limite');
win.__veritasHotspotGroup = null;
check('senza gruppo non esplode', rebuild([nodo('a','spawn',0)]) === false);
win.__veritasHotspotGroup = gruppoDelBundle();
const salvaThree = win.THREE; win.THREE = null;
check('senza THREE non esplode', rebuild([nodo('a','spawn',0)]) === false);
win.THREE = salvaThree;
check('zero zone: il gruppo resta vuoto, non con i sei cablati',
      rebuild([]) === true && win.__veritasHotspotGroup.children.length === 0);

// --- il pool degli agenti: stessa radice, altra meta' della scena ---
// Il bundle costruisce 28 figure con un ciclo cablato, e il ciclo di animazione
// fa `if (!figura) return`. Chiedere 50 persone ne mostrava 28, in silenzio.
console.log('\nil pool degli agenti segue i frame, non il 28 cablato');

// scena e Map come le consegna il bundle: 28 figure, id 0..27
const scenaStub = () => { const s = new Group(); return s; };
const poolDelBundle = () => {
  const m = new Map();
  for (let i = 0; i < 28; i++) m.set(i, { group: new Group() });
  return m;
};
// THREE.Color serve solo a veritasBuildPassenger
THREE.Color = function (c) { this.c = c; this.multiplyScalar = () => this; };
THREE.CapsuleGeometry = geom; THREE.SphereGeometry = geom; THREE.CylinderGeometry = geom;

const frameConId = (max) => [{ t: 0, agents: Array.from({ length: max + 1 }, (_, i) => ({ id: i })) }];

win.__veritasScene = scenaStub();
win.__veritasPassengerGroups = poolDelBundle();
check('il pool del bundle parte con 28 figure', win.__veritasPassengerGroups.size === 28);

let aggiunti = mod.veritasEnsurePassengerPool(frameConId(49)); // 50 agenti, id 0..49
check('50 agenti -> il pool arriva a 50', win.__veritasPassengerGroups.size === 50,
      win.__veritasPassengerGroups.size + ' figure');
check('ne ha aggiunte 22, non ricostruite 50', aggiunti === 22, aggiunti + ' aggiunte');
check('le figure nuove entrano nella scena', win.__veritasScene.children.length === 22);
check('la figura con id 49 ora esiste', win.__veritasPassengerGroups.has(49));

console.log('\nsotto i 28 non si tocca niente');
win.__veritasPassengerGroups = poolDelBundle();
win.__veritasScene = scenaStub();
check('20 agenti: nessuna figura aggiunta',
      mod.veritasEnsurePassengerPool(frameConId(19)) === 0);
check('il pool resta a 28 (le sovrannumerarie le nasconde il ciclo)',
      win.__veritasPassengerGroups.size === 28);

console.log('\nsi guardano TUTTI i frame, non solo il primo');
// con lo sfasamento delle partenze l'ultimo agente compare tardi
win.__veritasPassengerGroups = poolDelBundle();
win.__veritasScene = scenaStub();
mod.veritasEnsurePassengerPool([
  { t: 0, agents: [{ id: 0 }] },
  { t: 1, agents: [{ id: 0 }, { id: 40 }] },   // arriva solo al secondo frame
]);
check('l agente che parte tardi ha comunque la sua figura',
      win.__veritasPassengerGroups.has(40), win.__veritasPassengerGroups.size + ' figure');

console.log('\nuna figura ha i perni che il ciclo di animazione ruota');
win.__veritasPassengerGroups = new Map();
win.__veritasScene = scenaStub();
mod.veritasEnsurePassengerPool(frameConId(0));
const fig = win.__veritasPassengerGroups.get(0);
check('ha gruppo, anche, spalle e busto',
      !!(fig.group && fig.leftHip && fig.rightHip && fig.leftArm && fig.rightArm && fig.body));
check('le anche stanno all altezza dell anca', fig.leftHip.position.y === 0.9);
check('le spalle stanno all altezza della spalla', fig.leftArm.position.y === 1.4);
check('nasce invisibile: la accende il ciclo quando l agente entra',
      fig.group.visible === false);

console.log('\ncasi limite');
win.__veritasPassengerGroups = poolDelBundle();
check('frame vuoti: non aggiunge niente', mod.veritasEnsurePassengerPool([]) === 0);
check('frame senza agenti: non aggiunge niente',
      mod.veritasEnsurePassengerPool([{ t: 0, agents: [] }]) === 0);
check('frames null: non esplode', mod.veritasEnsurePassengerPool(null) === 0);
win.__veritasPassengerGroups = null;
check('senza pool non esplode', mod.veritasEnsurePassengerPool(frameConId(5)) === 0);

console.log(ko ? `\n${ko} PROVE FALLITE` : '\ntutte le prove passano');
process.exit(ko ? 1 : 0);
