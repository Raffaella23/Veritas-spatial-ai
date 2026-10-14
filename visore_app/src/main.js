// EIDETICA NEL VISORE — primo passo del §13 (14/10/2026).
// Un'app IWSDK nuova e leggera: una stanza a colori con una scrivania, sopra il
// plastico d'argilla gia' unito sul PC (31 pezzi), da prendere, girare e
// ingrandire con le mani, da seduti. Niente analisi qui dentro: si apre il
// file e basta.
// Questa prima versione serve a UNA misura: il Quest 2 tiene 60 fotogrammi al
// secondo? La spia sul tavolo dice ora / media / minimo degli ultimi 30 s.
import {
  World, createSystem, AssetManager, SessionMode, ReferenceSpaceType,
  DomeGradient, IBLGradient, TwoHandsGrabbable, RayInteractable,
} from "@iwsdk/core";
import * as THREE from "three";

const COSTRUZIONE = "2026-10-14-v2";
window.__EIDETICA_COSTRUZIONE_VISORE = COSTRUZIONE;
const BASE = import.meta.env.BASE_URL;
const stato = document.getElementById("stato");
const entra = document.getElementById("entra");

// la scrivania della stanza Meta: piano a 0,86 m nel suo file, stanza calata di
// 0,107 m e girata di 180°; la si avvicina di 1,10 m perche' da seduti il bordo
// sia a circa 36 cm e il plastico a portata di mano
const STANZA = { y: -0.107, z: 1.1 };
const PIANO = 0.86 + STANZA.y;          // 0,753 m da terra
const CENTRO = new THREE.Vector3(0, PIANO, -0.85);
const LUNGO = 0.6;                       // il lato lungo del plastico: un tavolino d'aereo (VR Start: da seduti, nello spazio di un sedile)

const world = await World.create(document.getElementById("scene-container"), {
  xr: {
    sessionMode: SessionMode.ImmersiveVR,
    referenceSpace: { type: ReferenceSpaceType.LocalFloor, fallbackOrder: [ReferenceSpaceType.Local] },
    features: { handTracking: true },
    offer: "always",
  },
  render: { near: 0.02, far: 60, camera: { position: [0, 1.2, 0], lookAt: [0, PIANO, -0.85] } },
  features: { locomotion: false, grabbing: { useHandPinchForGrab: true }, physics: false, spatialUI: false },
});

// la luce e il cielo: una cupola a colori (il Quest 2 vede la stanza vera in bianco e nero)
const livello = world.activeLevel.value;
livello.addComponent(DomeGradient, {
  sky: [0.2423, 0.6172, 0.8308, 1], equator: [0.6584, 0.7084, 0.7913, 1],
  ground: [0.807, 0.7758, 0.7454, 1], intensity: 1,
});
livello.addComponent(IBLGradient, {
  sky: [0.6902, 0.749, 0.7843, 1], equator: [0.6584, 0.7084, 0.7913, 1],
  ground: [0.807, 0.7758, 0.7454, 1], intensity: 1,
});

// la stanza con la scrivania (Meta, Apache 2.0: vedi stanza/LICENSE-meta-apache-2.0.txt)
const stanza = (await AssetManager.loadGLTF(BASE + "stanza/environmentDesk.gltf")).scene;
stanza.position.set(0, STANZA.y, STANZA.z);
stanza.rotation.y = Math.PI;
world.createTransformEntity(stanza);

// il plastico: messo in scala sul tavolo, appoggiato al piano
stato.textContent = "EIDETICA · loading the model…";
const modello = (await AssetManager.loadGLTF(BASE + "plastico.glb")).scene;
const box = new THREE.Box3().setFromObject(modello);
const dim = box.getSize(new THREE.Vector3());
const scala = LUNGO / Math.max(dim.x, dim.z);
const plastico = new THREE.Group();
plastico.name = "eidetica-plastico";
modello.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
modello.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = true; } });
plastico.add(modello);
plastico.scale.setScalar(scala);
plastico.position.copy(CENTRO);
const ente = world.createTransformEntity(plastico);
ente.addComponent(RayInteractable);
ente.addComponent(TwoHandsGrabbable, { rotate: true, translate: true, scale: true,
  scaleMin: [scala * 0.3, scala * 0.3, scala * 0.3], scaleMax: [scala * 4, scala * 4, scala * 4] });
let pezzi = 0, triangoli = 0;
modello.traverse((o) => {
  if (!o.isMesh) return;
  pezzi++; const g = o.geometry; triangoli += (g.index ? g.index.count : g.attributes.position.count) / 3;
});

// LA SPIA: un cartellino sul fondo del tavolo, rivolto a chi e' seduto
const tela = document.createElement("canvas");
tela.width = 1024; tela.height = 320;
const pennello = tela.getContext("2d");
const trama = new THREE.CanvasTexture(tela);
trama.colorSpace = THREE.SRGBColorSpace;
const cartello = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.175),
  new THREE.MeshBasicMaterial({ map: trama, toneMapped: false }));
cartello.position.set(0, PIANO + 0.32, -1.6);
cartello.name = "eidetica-spia-fps";
world.createTransformEntity(cartello);

const M = { ora: 0, media: 0, minimo: 0, campioni: [], fotogrammi: 0, da: 0, dentro: false,
  disegni: 0, triangoliDisegnati: 0, ritmo: null, posato: false, attesaTesta: 0, occhi: null, piano: null, pezzi, triangoli: Math.round(triangoli), scala };
window.__EIDETICA_VISORE = M;

function scriviSpia() {
  const p = pennello;
  p.fillStyle = "#10151d"; p.fillRect(0, 0, tela.width, tela.height);
  const ok = M.campioni.length >= 30 && M.minimo >= 60;
  p.fillStyle = M.campioni.length < 30 ? "#e8eaf0" : ok ? "#7fd18b" : "#ff7a6b";
  p.font = "bold 92px system-ui, sans-serif";
  p.fillText("FPS " + M.ora, 40, 120);
  p.font = "52px system-ui, sans-serif";
  p.fillStyle = "#e8eaf0";
  p.fillText("avg " + M.media.toFixed(1) + "   min " + M.minimo + "   (" + M.campioni.length + "/30 s)", 40, 200);
  p.font = "36px system-ui, sans-serif";
  p.fillStyle = "#9aa3b2";
  p.fillText(COSTRUZIONE + " · draws " + M.disegni + " · " + Math.round(M.triangoliDisegnati / 1000) + "k tris"
    + (M.ritmo ? " · " + M.ritmo + " Hz" : ""), 40, 275);
  trama.needsUpdate = true;
}
scriviSpia();

// IL PLASTICO A PORTATA DI MANO (v2, prova di Raffaella nel Quest 2 del 14/10:
// «si trova sotto il mio tavolo, le mani non riescono a pizzicarlo»). Il piano
// misurato dal pavimento non e' il tavolo vero di chi e' seduto: si misura
// invece dagli OCCHI. Entrati nel visore, appena la testa e' letta, il plastico
// va 40 cm sotto gli occhi e 45 cm davanti; stanza, scrivania e spia lo seguono
// (la scrivania resta sotto il plastico). Una volta sola per ogni entrata.
const SOTTO_OCCHI = 0.40, DAVANTI = 0.45;
const testa = new THREE.Vector3();
function posaDavanti() {
  if (M.posato) return;
  if (++M.attesaTesta < 20) return;                   // i primi fotogrammi la testa e' ancora a zero
  world.player.head.getWorldPosition(testa);
  if (testa.y < 0.5 && M.attesaTesta < 120) return;    // testa non ancora letta: si aspetta ancora un po'
  const piano = testa.y - SOTTO_OCCHI;
  const dx = testa.x - CENTRO.x, dy = piano - CENTRO.y, dz = (testa.z - DAVANTI) - CENTRO.z;
  plastico.position.set(CENTRO.x + dx, piano, CENTRO.z + dz);
  stanza.position.set(dx, STANZA.y + dy, STANZA.z + dz);
  cartello.position.set(dx, PIANO + 0.32 + dy, -1.6 + dz);
  M.posato = true; M.attesaTesta = 0;
  M.occhi = +testa.y.toFixed(2); M.piano = +piano.toFixed(2);
  console.log("[EIDETICA visore] occhi a " + M.occhi + " m: plastico posato a " + M.piano + " m, 45 cm davanti");
}

// il conto dei fotogrammi: si azzera entrando nel visore, un campione al secondo, gli ultimi 30
class SpiaFps extends createSystem({}) {
  update() {
    const adesso = performance.now();
    const dentro = !!world.renderer.xr.isPresenting;
    if (dentro !== M.dentro) {
      M.dentro = dentro; M.campioni = []; M.fotogrammi = 0; M.da = adesso;
      const s = world.renderer.xr.getSession && world.renderer.xr.getSession();
      M.ritmo = s && s.frameRate ? Math.round(s.frameRate) : null;
    }
    if (dentro) posaDavanti(); else M.posato = false;
    M.fotogrammi++;
    if (!M.da) M.da = adesso;
    if (adesso - M.da >= 1000) {
      M.ora = Math.round((M.fotogrammi * 1000) / (adesso - M.da));
      M.campioni.push(M.ora);
      if (M.campioni.length > 30) M.campioni.shift();
      M.media = M.campioni.reduce((a, b) => a + b, 0) / M.campioni.length;
      M.minimo = Math.min(...M.campioni);
      M.disegni = world.renderer.info.render.calls;
      M.triangoliDisegnati = world.renderer.info.render.triangles;
      M.fotogrammi = 0; M.da = adesso;
      scriviSpia();
      if (M.campioni.length === 30 && dentro)
        console.log("[EIDETICA visore] 30 s: media " + M.media.toFixed(1) + ", minimo " + M.minimo + " fps");
    }
  }
}
world.registerSystem(SpiaFps);

stato.textContent = "EIDETICA · " + pezzi + " pieces · " + Math.round(triangoli / 1000) + "k triangles";
console.log("[EIDETICA visore] " + COSTRUZIONE + ": plastico " + pezzi + " pezzi, "
  + Math.round(triangoli) + " triangoli, scala " + scala.toFixed(4));

// un solo tasto per entrare
if (navigator.xr && (await navigator.xr.isSessionSupported("immersive-vr").catch(() => false))) {
  entra.style.display = "block";
  entra.onclick = () => world.launchXR();
  world.renderer.xr.addEventListener("sessionstart", () => { entra.style.display = "none"; });
  world.renderer.xr.addEventListener("sessionend", () => { entra.style.display = "block"; });
} else {
  stato.textContent += " · no headset found";
}
