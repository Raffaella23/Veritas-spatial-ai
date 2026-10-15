// EIDETICA NEL VISORE — app IWSDK leggera (HANDOFF §13).
// Il plastico d'argilla gia' unito sul PC (31 pezzi), da prendere, girare e
// ingrandire con le mani, da seduti. Niente analisi qui dentro: si apre il
// file e basta.
//
// v1 (14/10): prova di carico, 76-80 fps nel Quest 2 per 30 s — superata.
// v2 (14/10): il plastico si posa dagli OCCHI (era sotto il tavolo vero).
// v3 (15/10): LA VESTE DI EIDETICA. Regola di Raffaella: «un'applicazione da
//   studio di architetto, di ingegnere di altissimo livello», non un
//   videogioco. Via la stanza Meta (cielo azzurro, scrivania di legno). Al suo
//   posto il fondo del velo (blu notte), la luce della pagina
//   (veritas_carta.js, sistemaIlSole: cielo chiaro dall'alto e scuro da terra,
//   sole forte a ~60°, ombre proprie e portate), la lastra scura sotto il
//   plastico col filo ciano e un pannello di vetro scuro come quelli della
//   tavola UX del 29/09. I colori restano solo per i nostri segni.
import {
  World, createSystem, AssetManager, SessionMode, ReferenceSpaceType,
  IBLTexture, TwoHandsGrabbable, RayInteractable, PokeInteractable, Pressed,
} from "@iwsdk/core";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

const COSTRUZIONE = "2026-10-15-v16";
window.__EIDETICA_COSTRUZIONE_VISORE = COSTRUZIONE;
const BASE = import.meta.env.BASE_URL;
const stato = document.getElementById("stato");
const entra = document.getElementById("entra");

// I COLORI DI EIDETICA (veritas_carta.js PLASTICO, veritas_apertura.js, tavola UX)
const C = {
  fondo: ["#1a2231", "#0e131b", "#07090d"],  // il velo: centro, meta', bordo
  terra: 0x10151d,                           // la lastra: appena sopra l'aria
  ciano: "#3fd0e8",                          // zone / filo dei pannelli
  testo: "#e8eaf0", grigio: "#9aa3b2",
  verde: "#7fd18b", arancio: "#ffb020",
};
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).concat(1);

// da seduti, prima di leggere la testa: occhi a ~1,20 m, plastico 40 cm sotto e 45 cm davanti
const SOTTO_OCCHI = 0.40, DAVANTI = 0.45;
const CENTRO = new THREE.Vector3(0, 1.2 - SOTTO_OCCHI, -DAVANTI);
const LUNGO = 0.6;   // il lato lungo del plastico: un tavolino d'aereo (VR Start: da seduti, nello spazio di un sedile)

const world = await World.create(document.getElementById("scene-container"), {
  xr: {
    sessionMode: SessionMode.ImmersiveVR,
    referenceSpace: { type: ReferenceSpaceType.LocalFloor, fallbackOrder: [ReferenceSpaceType.Local] },
    features: { handTracking: true },
    offer: "none",                                         // un solo tasto: «Enter»
  },
  render: { near: 0.02, far: 60, camera: { position: [0, 1.2, 0.1], lookAt: [CENTRO.x, CENTRO.y, CENTRO.z] } },
  features: { locomotion: false, grabbing: { useHandPinchForGrab: true }, physics: false, spatialUI: false },
});

// v4 (15/10): IL PASSTHROUGH SIMULATO. Raffaella: il Quest 2 vede la stanza
// vera in bianco e nero; per dare l'impressione del passthrough a colori del
// Quest 3, attorno al plastico c'e' uno studio VERO, fotografato a 360°
// (foto n. 2 «Cayley Interior», Poly Haven, CC0 — vedi studio/FONTE.txt; «al
// massimo la cambiamo»: basta cambiare STUDIO). Da seduti la testa si muove
// poco: la foto tutto attorno regge. La stessa stanza, in HDR, fa anche la
// LUCE del plastico: i colori e le ombre morbide vengono dalle sue finestre.
// Il fondo blu notte del velo (v3) resta per la pagina sul PC e per l'attesa.
const STUDIO = { foto: "studio/brown_photostudio_03_4k.jpg", luce: "studio/brown_photostudio_03_luce.jpg", giro: 2.17, luceForza: 0.55 };   // v6: riempimento piu' tenue, le ombre si leggono
// foto n. 3 (15/10, Raffaella): davanti la parete con le quattro cornici, al centro fra le due
// finestre; la scrivania in mezzo alla stanza, lato lungo parallelo a quella parete. Il giro:
// davanti (-z) a giro 0 c'e' il punto a 1/4 della foto; ogni radiante sposta di 1/(2 pi) —
// la parete fra le finestre sta a 0,596 della foto -> (0,596 - 0,25) x 2 pi = 2,17
// ?giro=<radianti> gira la stanza attorno a chi e' seduto (per scegliere la vista senza ricostruire)
const giroURL = parseFloat(new URLSearchParams(location.search).get("giro"));
if (Number.isFinite(giroURL)) STUDIO.giro = giroURL;
const luceURL = parseFloat(new URLSearchParams(location.search).get("luce"));   // ?luce=<forza> per le prove
if (Number.isFinite(luceURL)) STUDIO.luceForza = luceURL;
// v15: la prova dei pesi (spiegata sotto, a provaDeiPesi)
const PROVA = new URLSearchParams(location.search).has("prova");
const TAPPE = [   // v16: «tutto acceso» si rimisura fra una tappa e l'altra (le misure ballano di parecchio)
  ["Everything on", {}],
  ["No live shadow", { ombre: false }],
  ["Everything on", {}],
  ["No glass walls", { lastre: false }],
  ["Everything on", {}],
  ["No 360 studio", { studio: false }],
  ["No chair, fern, body", { arredi: false }],
  ["Model only", { ombre: false, studio: false, lastre: false, arredi: false }],
];
const PP = { i: -1, da: 0, f: 0, conta: 0, ris: [] };
const livello = world.activeLevel.value;
livello.addComponent(IBLTexture, { src: BASE + STUDIO.luce, intensity: STUDIO.luceForza, rotation: [0, STUDIO.giro, 0] });
// ...e un sole a ~60° che fa ombre proprie e portate (piu' tenue della pagina: la stanza illumina gia')
const r = world.renderer;
r.shadowMap.enabled = true;
// v15 (Raffaella nel Quest 2: 26 fps, media 37,6, minimo 25): l'ombra calcolata dal vivo
// la fa SOLO il plastico, su se stesso e sul sottomano, e si ricalcola solo quando il
// plastico si muove (prima: ogni fotogramma, su 3,4 m di scena, morbida = molto cara).
// Le ombre a terra di scrivania, sedia e felce sono dipinte una volta sola (sotto).
// v16 (prova dei pesi: senza ombra viva da 38 a 59 fps): ombra NETTA a un solo campione
// (BasicShadowMap) invece di quella sfumata a piu' campioni: costa una frazione, e con 0,4 mm
// per punto d'ombra il bordo resta pulito (Raffaella: «ombre un po' piu' definite»)
r.shadowMap.type = THREE.BasicShadowMap;
r.shadowMap.autoUpdate = false;
r.shadowMap.needsUpdate = true;
const sole = new THREE.DirectionalLight(0xfffaf2, 1.9);   // v6: piu' forte, ombre proprie e portate decise
const DIR_SOLE = new THREE.Vector3(0.25, 0.95, -1.0).normalize();   // ~35° sull'orizzonte: ombre lunghe   // la luce viene dalle finestre, davanti a chi siede: le ombre vengono verso di lei
sole.castShadow = true;
sole.shadow.mapSize.set(2048, 2048);   // v15: solo sul plastico (~75 cm): 0,4 mm per punto d'ombra, ombre nette
sole.shadow.bias = -0.0003;
sole.shadow.normalBias = 0.0006;
world.scene.add(sole, sole.target);
// la luce calda della stanza ingiallisce l'argilla: un cielo neutro (quello della pagina, piu' tenue) la riporta al suo grigio
const cielo = new THREE.HemisphereLight(0xb8c4d6, 0x141820, 0.35);
cielo.name = "eidetica-cielo";
world.scene.add(cielo);

// IL PLASTICO
stato.textContent = "EIDETICA · loading the model…";
const modello = (await AssetManager.loadGLTF(BASE + "plastico.glb")).scene;
const box = new THREE.Box3().setFromObject(modello, true);   // sui vertici veri: i min/max del file possono essere larghi
const dim = box.getSize(new THREE.Vector3());
const scala = LUNGO / Math.max(dim.x, dim.z);
const plastico = new THREE.Group();
plastico.name = "eidetica-plastico";
modello.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
let pezzi = 0, triangoli = 0;
modello.traverse((o) => {
  if (!o.isMesh) return;
  pezzi++; const g = o.geometry; triangoli += (g.index ? g.index.count : g.attributes.position.count) / 3;
  const vetro = o.material && o.material.transparent;   // un vetro non fa ombra: la luce ci passa
  o.castShadow = !vetro; o.receiveShadow = true;
});
plastico.add(modello);
// v13: IL CONTRASTO (Raffaella: «deve essere molto netto per far capire il flusso»).
// Sull'argilla le facce rivolte in alto (pavimenti, piazzali) si scuriscono, quelle in
// piedi (muri, banchi, sagome) si schiariscono: la pianta si legge subito, e le scie
// colorate degli agenti risalteranno sul pavimento scuro. Si guarda la normale nel
// sistema del modello: girando il plastico con le mani il pavimento resta pavimento.
modello.traverse((o) => {
  if (!o.isMesh || !o.material || !/^eidetica-argilla(-sagoma)?$/.test(o.material.name)) return;
  const m = o.material, prima = m.onBeforeCompile;
  // ⚠️ il file ha l'«alto» su un altro asse (pezzi girati di -90°, come da Blender):
  // l'alto del plastico si riporta nel sistema del pezzo, e la normale si misura su quello
  o.updateWorldMatrix(true, false); modello.updateWorldMatrix(true, false);
  const rel = new THREE.Matrix4().copy(modello.matrixWorld).invert().multiply(o.matrixWorld);
  const su = new THREE.Vector3(0, 1, 0).applyMatrix3(new THREE.Matrix3().setFromMatrix4(rel).invert()).normalize();
  m.onBeforeCompile = (sh, r) => {
    if (prima) prima(sh, r);
    sh.uniforms.uSu = { value: su };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform vec3 uSu;\nvarying float vSu;")
      .replace("#include <beginnormal_vertex>", "#include <beginnormal_vertex>\n  vSu = dot(normalize(objectNormal), uSu);");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vSu;")
      .replace("#include <color_fragment>", "#include <color_fragment>\n  diffuseColor.rgb = mix(min(diffuseColor.rgb * 1.7, vec3(0.80)), vec3(0.035, 0.040, 0.048), smoothstep(0.55, 0.9, vSu));");
  };
  m.customProgramCacheKey = () => "eidetica-contrasto-" + m.name;
  m.needsUpdate = true;
});


plastico.scale.setScalar(scala);
plastico.position.copy(CENTRO);
const ente = world.createTransformEntity(plastico);
ente.addComponent(RayInteractable);
// v15 (Raffaella: «il modello e' il modello, non e' una fisarmonica»): con due mani si
// ingrandisce SOLO tutto insieme, mai stirato su un asse (scala uniforme, sotto in Regia);
// e si ingrandisce di piu' (fino a 10 volte) per avvicinarsi davvero.
ente.addComponent(TwoHandsGrabbable, { rotate: true, translate: true, scale: true,
  scaleMin: [scala * 0.3, scala * 0.3, scala * 0.3], scaleMax: [scala * 10, scala * 10, scala * 10] });
// IWSDK non passa l'opzione «uniforme» alla presa (@pmndrs/handle): la si aggiunge alla
// presa appena creata, leggendo le sue opzioni ogni volta
function presaUniforme() {
  if (M.presaUniforme) return;
  const c = ente.getComponents().find((k) => k.id === "Handle");
  const h = c && ente.getValue(c, "instance");
  if (!h || !h.getOptions) return;
  const prima = h.getOptions;
  h.getOptions = () => { const o = prima(); if (o && o.scale) o.scale = { ...o.scale, uniform: true }; return o; };
  M.presaUniforme = true;
  console.log("[EIDETICA visore] presa a due mani: ingrandimento uniforme");
}

// IL PANNELLO: vetro scuro col filo ciano, come i pannelli della tavola UX.
// Per ora dice i fotogrammi (la misura delle prove); poi diventera' il pannello del progetto.
const tela = document.createElement("canvas");
tela.width = 1072; tela.height = 488;   // v9: 24 punti di margine per l'alone dei fili LED
const p = tela.getContext("2d");
const trama = new THREE.CanvasTexture(tela);
trama.colorSpace = THREE.SRGBColorSpace;
trama.anisotropy = 4;
const pannello = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42 * 488 / 1072),
  new THREE.MeshBasicMaterial({ map: trama, transparent: true, toneMapped: false, depthWrite: false }));
pannello.name = "eidetica-pannello";
pannello.renderOrder = 10;
// LA POSTAZIONE (v4, 15/10). La scrivania di Raffaella come modello (foto di
// riferimento in Desktop\VERITAS, 15/10): piano di CRISTALLO su gambe d'acciaio
// sottili, SOTTOMANO chiaro su cui si appoggia il plastico (niente contatto col
// vetro), L di cristallo FUME' a tutta altezza, SCHERMO trasparente in fondo al
// piano che porta le schede. Niente oggetti col marchio. La scena resta sobria:
// il colore lo porteranno le scie degli agenti.
// L'origine della postazione e' il punto d'appoggio del plastico: il centro del
// sottomano, alla sua faccia di sopra. Le misure sono in metri veri.
const P = { largo: 1.40, fondo: 0.72, spessore: 0.012, avanti: 0.26, sottomano: 0.004, gamba: 0.025,
  lastraL: { largo: 2.4, alto: 2.7, fondo: 1.8, distanza: 0.35 } };
const zPiano = P.avanti - P.fondo / 2;                       // centro del piano: il bordo davanti sta 26 cm verso chi siede
const yPiano = -P.sottomano - P.spessore / 2;
const postazione = new THREE.Group();
postazione.name = "eidetica-postazione";
// v6: IL CRISTALLO. Di fronte quasi invisibile, di taglio riflette (come il vetro vero:
// effetto Fresnel), con la costa verde ben leggibile
// v16 (prova dei pesi nel Quest 2: senza le lastre di vetro da 38 a 51 fps). Le lastre
// coprono mezzo campo visivo e il vetro «fisico» (luce, riflessi della stanza) si calcolava
// punto per punto su tutta quella superficie. Ora il vetro e' DISEGNATO: un colore, una
// trasparenza, e di taglio si schiarisce e si fa piu' pieno (Fresnel) come il vetro vero.
// Stesso aspetto da lontano, una frazione del lavoro.
function vetroLeggero(colore, alfa, fres, riflesso = 0xdfe6ea, lati = THREE.FrontSide) {
  return new THREE.ShaderMaterial({
    uniforms: { uColore: { value: new THREE.Color(colore) }, uRiflesso: { value: new THREE.Color(riflesso) },
      uAlfa: { value: alfa }, uFres: { value: fres } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = -mv.xyz; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColore; uniform vec3 uRiflesso; uniform float uAlfa; uniform float uFres; varying vec3 vN; varying vec3 vV;
      void main() { float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.0);
        gl_FragColor = vec4(mix(uColore, uRiflesso, f), clamp(uAlfa + f * uFres, 0.0, 1.0));
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, side: lati,
  });
}
const vetroChiaro = vetroLeggero(0xe6efed, 0.10, 0.55);
const costaVetro = vetroLeggero(0x7fa89e, 0.85, 0.1, 0xa9cbc2);
const vetroFume = vetroLeggero(0x2a2e33, 0.14, 0.35, 0xc9d0d6, THREE.DoubleSide);
// v8: IL CROMO VERO. Il metallo riflette la foto della stanza A COLORI e a pieno
// contrasto (la luce generale usa una copia grigia e tenue: sul metallo sembrava
// vernice grigia). Lo stesso riflesso va al piede della poltroncina.
const riflessoStanza = await (async () => {
  const t = await AssetManager.loadTexture(BASE + STUDIO.foto);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(world.renderer);
  const rt = pm.fromEquirectangular(t);
  pm.dispose();
  return rt.texture;
})();
const giroRiflesso = new THREE.Euler(0, STUDIO.giro, 0);
const acciaio = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.035, metalness: 1,
  envMap: riflessoStanza, envMapIntensity: 1.5 });
acciaio.envMapRotation = giroRiflesso;
const carta = new THREE.MeshStandardMaterial({ color: 0xe4e7eb, roughness: 0.78, metalness: 0 });
const vetroCoste = [costaVetro, costaVetro, vetroChiaro, vetroChiaro, costaVetro, costaVetro];   // +x -x +y -y +z -z
function pezzo(geo, mat, x, y, z, ombra = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.castShadow = ombra; m.receiveShadow = true;
  postazione.add(m);
  return m;
}
// il piano di cristallo, con le coste verdi del vetro vero
pezzo(new THREE.BoxGeometry(P.largo, P.spessore, P.fondo), vetroCoste, 0, yPiano, zPiano, false);
// il sottomano, angoli arrotondati, appena piu' grande del plastico
const wS = dim.x * scala + 0.08, dS = dim.z * scala + 0.08, rS = 0.02;
const forma = new THREE.Shape();
forma.moveTo(-wS / 2 + rS, -dS / 2); forma.lineTo(wS / 2 - rS, -dS / 2); forma.quadraticCurveTo(wS / 2, -dS / 2, wS / 2, -dS / 2 + rS);
forma.lineTo(wS / 2, dS / 2 - rS); forma.quadraticCurveTo(wS / 2, dS / 2, wS / 2 - rS, dS / 2);
forma.lineTo(-wS / 2 + rS, dS / 2); forma.quadraticCurveTo(-wS / 2, dS / 2, -wS / 2, dS / 2 - rS);
forma.lineTo(-wS / 2, -dS / 2 + rS); forma.quadraticCurveTo(-wS / 2, -dS / 2, -wS / 2 + rS, -dS / 2);
const geoS = new THREE.ExtrudeGeometry(forma, { depth: P.sottomano, bevelEnabled: false, curveSegments: 6 });
geoS.rotateX(-Math.PI / 2);                                  // da in piedi a coricato: spessore verso l'alto
pezzo(geoS, carta, 0, -P.sottomano, 0, false);
// il telaio d'acciaio sotto il vetro e le quattro gambe (lunghe fino a terra: si misurano alla posa)
const yTelaio = -P.sottomano - P.spessore - P.gamba / 2;
const xG = P.largo / 2 - 0.06, zG = P.fondo / 2 - 0.06;
pezzo(new THREE.BoxGeometry(2 * xG, P.gamba, P.gamba), acciaio, 0, yTelaio, zPiano - zG);
pezzo(new THREE.BoxGeometry(2 * xG, P.gamba, P.gamba), acciaio, 0, yTelaio, zPiano + zG);
pezzo(new THREE.BoxGeometry(P.gamba, P.gamba, 2 * zG), acciaio, -xG, yTelaio, zPiano);
pezzo(new THREE.BoxGeometry(P.gamba, P.gamba, 2 * zG), acciaio, xG, yTelaio, zPiano);
const gambe = [[-xG, -zG], [xG, -zG], [-xG, zG], [xG, zG]].map(([x, z]) =>
  pezzo(new THREE.BoxGeometry(P.gamba, 1, P.gamba), acciaio, x, 0, zPiano + z));
// l'ombra sul pavimento: appoggia la scrivania nella foto (si vede solo l'ombra)
// v15: le ombre a terra sono DIPINTE una volta (sotto, dopo gli arredi): morbide e sobrie, e non costano
const pavimento = pezzo(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false }), 0, 0, zPiano, false);
pavimento.rotation.x = -Math.PI / 2;
// la L di cristallo fume' a tutta altezza: una lastra dietro, una a destra
const L = P.lastraL, zDietro = zPiano - P.fondo / 2 - L.distanza, xDestra = P.largo / 2 + 0.25;
const lastraDietro = pezzo(new THREE.BoxGeometry(L.largo, L.alto, 0.01), vetroFume, xDestra - L.largo / 2, 0, zDietro, false);
const lastraDestra = pezzo(new THREE.BoxGeometry(0.01, L.alto, L.fondo), vetroFume, xDestra, 0, zDietro + L.fondo / 2, false);
const profili = [
  pezzo(new THREE.BoxGeometry(L.largo, 0.03, 0.03), acciaio, xDestra - L.largo / 2, 0, zDietro, false),
  pezzo(new THREE.BoxGeometry(0.03, 0.03, L.fondo), acciaio, xDestra, 0, zDietro + L.fondo / 2, false)];
// lo schermo trasparente in fondo al piano, su un piedino d'acciaio: porta le schede
const S = { largo: 0.62, alto: 0.36, z: zPiano - P.fondo / 2 + 0.10, da: 0.10, piega: -0.08 };
pezzo(new THREE.BoxGeometry(0.18, 0.006, 0.12), acciaio, 0, -P.sottomano + 0.003, S.z);
// v9 (Raffaella: «il piedino non regge niente»): lo schermo di vetro non si vedeva e il
// pannello galleggiava sopra il piedino. Ora il piedino REGGE IL PANNELLO, come un leggio:
// sale dalla base fino al bordo di sotto del pannello.
const altoPannello = 0.42 * 488 / 1072, sottoPannello = S.da + 0.01;
pezzo(new THREE.BoxGeometry(0.022, sottoPannello + 0.012, 0.012), acciaio, 0, -P.sottomano + (sottoPannello + 0.012) / 2, S.z - 0.008);
pannello.position.set(0, sottoPannello + altoPannello / 2, S.z);
pannello.rotation.x = S.piega;
postazione.add(pannello);
const entePostazione = world.createTransformEntity(postazione);

// IL MARCHIO (v12, 15/10). Raffaella: «il logo e' la nostra firma, deve restare in
// vista per tutta l'esperienza». L'occhio con le ali (Desktop\VERITAS\Eidetica _logo_colorato.png,
// scontornato) e' INCISO sulla lastra fume' dietro la scrivania, sopra il pannello, e
// RETROILLUMINATO: dietro c'e' il suo alone colorato, gli stessi colori dei fili LED.
// Entrando, prima si APRE davanti agli occhi (come una palpebra: l'occhio che comincia
// a guardare), poi va al suo posto sul vetro (sotto, animaMarchio).
const caricaTrama = async (u) => {
  const t = await AssetManager.loadTexture(BASE + u);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
};
const [tLogo, tAlone] = await Promise.all([caricaTrama("marchio/logo.png"), caricaTrama("marchio/alone.png")]);
const LOGO = { largo: 0.80, y: 0.72 };                       // 72 cm sopra il piano: sopra il pannello, poco sopra gli occhi
const altoLogo = LOGO.largo * 857 / 1536;
const marchio = new THREE.Group();
marchio.name = "eidetica-marchio";
const alone = new THREE.Mesh(new THREE.PlaneGeometry(LOGO.largo * 1776 / 1536, altoLogo * 1097 / 857),
  new THREE.MeshBasicMaterial({ map: tAlone, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false }));
const segno = new THREE.Mesh(new THREE.PlaneGeometry(LOGO.largo, altoLogo),
  new THREE.MeshBasicMaterial({ map: tLogo, transparent: true, depthWrite: false, toneMapped: false }));
segno.position.z = 0.002;
alone.renderOrder = 5; segno.renderOrder = 6;
marchio.add(alone, segno);
const POSTO_MARCHIO = new THREE.Vector3(0, LOGO.y, zDietro + 0.008);   // sulla faccia del vetro verso chi siede
const INTRO_MARCHIO = new THREE.Vector3(0, SOTTO_OCCHI, DAVANTI - 1.0); // a un metro davanti agli occhi
marchio.position.copy(POSTO_MARCHIO);
postazione.add(marchio);
// v14 (disegno di Raffaella): il marchio e' APPESO AL SOFFITTO con un cavetto d'acciaio,
// col rosone d'attacco in alto, come un'insegna sospesa sopra il pannello. La lunghezza
// si fissa alla posa (dipende da quanto e' alto il soffitto sopra chi siede).
const SOFFITTO = 2.75;                                       // dal pavimento
const cavo = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 1, 8), acciaio);
const rosone = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.012, 32), acciaio);
const gancio = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8), acciaio);
cavo.name = "eidetica-cavo-marchio";
postazione.add(cavo, rosone, gancio);
function appendiIlMarchio(altezzaPiano) {
  const sopra = POSTO_MARCHIO.y + altoLogo / 2 - 0.02, cielo = SOFFITTO - altezzaPiano;
  const l = Math.max(0.05, cielo - sopra);
  cavo.scale.y = l; cavo.position.set(0, sopra + l / 2, POSTO_MARCHIO.z);
  rosone.position.set(0, cielo - 0.006, POSTO_MARCHIO.z);
  gancio.position.set(0, sopra, POSTO_MARCHIO.z);
}

// GLI ARREDI (v7, 15/10): una poltroncina di design bianca e una felce in un vaso
// bianco opaco, per completare lo studio (Poly Haven, CC0 — vedi arredi/FONTE.txt).
// Stanno a terra: la loro altezza si fissa alla posa, come le gambe.
const aTerra = [];
const ombreggia = (o) => o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
const poltroncina = (await AssetManager.loadGLTF(BASE + "arredi/poltroncina.glb")).scene;
poltroncina.name = "eidetica-poltroncina";
// v8: e' LA SEDIA DI CHI USA L'APP (VR Start: si lavora seduti). Sta dove sei seduta,
// girata verso il piano, con la seduta che entra appena sotto il bordo della scrivania
// (la schiena resta dietro la testa: non si vede guardando avanti)
poltroncina.position.set(0, 0, DAVANTI + 0.15);
poltroncina.rotation.y = Math.PI;
poltroncina.traverse((m) => { if (m.isMesh && m.material) {
  m.material.envMap = riflessoStanza; m.material.envMapIntensity = 1.0; m.material.envMapRotation = giroRiflesso;
  // v14 (Raffaella, da renderista): la pelle era troppo lucida. Pelle OPACA e morbida
  // (ruvidita' alta: riflesso largo e soffice); dove la texture dice metallo, cromo.
  m.material.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace("#include <metalnessmap_fragment>",
      "#include <metalnessmap_fragment>\n  roughnessFactor = mix(0.82, 0.08, step(0.5, metalnessFactor));");
  };
  m.material.customProgramCacheKey = () => "eidetica-pelle-opaca";
  m.material.needsUpdate = true; } });
ombreggia(poltroncina);
const felce = new THREE.Group();
felce.name = "eidetica-felce";
const vaso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.62, 48),
  new THREE.MeshStandardMaterial({ color: 0xf1f1ef, roughness: 0.55, metalness: 0 }));
vaso.position.y = 0.31;
const pianta = (await AssetManager.loadGLTF(BASE + "arredi/felce.glb")).scene;
pianta.scale.setScalar(1.3);
pianta.position.set(0.045, 0.62, -0.03);                      // la felce b del file e' spostata di qualche cm: si centra sul vaso
felce.add(vaso, pianta);
felce.position.set(xDestra + 0.45, 0, zDietro + 0.40);       // dietro la lastra di destra: si intravede dal vetro
ombreggia(felce);
postazione.add(poltroncina, felce);
aTerra.push(poltroncina, felce);

// v15: LA SEDUTA A MISURA DI CHI SIEDE. Raffaella nel visore era «piu' alta della sedia di
// una trentina di centimetri». La sedia non e' tracciata: si fa su misura dei suoi occhi
// (letti alla posa). Da seduti gli occhi stanno ~78 cm sopra la seduta (misura media).
// L'altezza della seduta del modello si misura una volta, con un raggio dall'alto.
const SEDUTA_OCCHI = 0.78;
const sedutaModello = (() => {
  const bb = new THREE.Box3().setFromObject(poltroncina, true), c = bb.getCenter(new THREE.Vector3());
  const ray = new THREE.Raycaster(new THREE.Vector3(c.x, bb.max.y + 1, c.z), new THREE.Vector3(0, -1, 0));
  const y = ray.intersectObject(poltroncina, true).map((h) => h.point.y - bb.min.y).find((h) => h > 0.25 && h < 0.65);
  return y || null;
})();
function sedutaSuMisura(occhi) {
  if (!sedutaModello || !(occhi > 0.9)) return;
  const k = Math.max(0.85, Math.min(1.35, (occhi - SEDUTA_OCCHI) / sedutaModello));
  poltroncina.scale.setScalar(k);
  sedutaFatta = +(sedutaModello * k).toFixed(2);
}
let sedutaFatta = null;

// v15: nessuna ombra calcolata dal vivo su scrivania, sedia e felce (era la spesa piu'
// grossa): l'ombra vera resta solo al plastico e cade sul sottomano
postazione.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = o.geometry === geoS; } });
// LE OMBRE A TERRA, DIPINTE (v15). Raffaella: «le ombre a terra sono esagerate». Ombre
// morbide di contatto, come nelle foto di prodotto: la scrivania, i piedini, la sedia,
// il vaso. La luce viene dalle finestre davanti: le ombre scivolano appena verso chi siede.
{
  const N = 512, tela = document.createElement("canvas"); tela.width = tela.height = N;
  const g = tela.getContext("2d");
  const px = (x) => (x / 4 + 0.5) * N, pz = (z) => ((z - zPiano) / 4 + 0.5) * N, m = N / 4;
  const macchia = (x, z, rx, rz, a) => {
    g.save(); g.translate(px(x), pz(z)); g.scale(rx * m, rz * m);
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    rg.addColorStop(0, "rgba(0,0,0," + a + ")"); rg.addColorStop(0.55, "rgba(0,0,0," + a * 0.45 + ")"); rg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = rg; g.beginPath(); g.arc(0, 0, 1, 0, Math.PI * 2); g.fill(); g.restore();
  };
  macchia(0, zPiano + 0.08, P.largo * 0.62, P.fondo * 0.75, 0.16);           // il piano di cristallo: appena un velo
  for (const [x, z] of [[-xG, -zG], [xG, -zG], [-xG, zG], [xG, zG]]) macchia(x, zPiano + z + 0.02, 0.05, 0.07, 0.55);   // i piedini
  macchia(0, DAVANTI + 0.15 + 0.04, 0.42, 0.40, 0.42);                        // la sedia
  macchia(xDestra + 0.45, zDietro + 0.43, 0.32, 0.32, 0.5);                   // il vaso
  const t = new THREE.CanvasTexture(tela); t.colorSpace = THREE.SRGBColorSpace;
  pavimento.material.map = t; pavimento.material.needsUpdate = true;
}

// LO STUDIO TUTT'ATTORNO (v13): la foto a 360° su una sfera centrata negli occhi di
// chi siede. Si entra SEMPRE in passthrough (immersive-ar) quando il visore lo sa
// fare: la sfera copre la stanza vera e simula il passthrough a colori del Quest 3.
// Il pulsante PASSTHROUGH spegne la sfera e gli arredi finti: compare la stanza vera
// (a colori sul Quest 3, in bianco e nero sul Quest 2).
const tStudio = await new THREE.TextureLoader().loadAsync(BASE + STUDIO.foto);
tStudio.colorSpace = THREE.SRGBColorSpace; tStudio.anisotropy = 8;
// v15: IL PAVIMENTO DELLA FOTO A TERRA. Raffaella nel visore: «la scrivania non poggia per
// terra, sta per aria», «la sedia non poggia». Su una sfera di 9 m il pavimento della foto
// appariva metri sotto i piedi. Ora la meta' di sotto della sfera e' SCHIACCIATA sul piano
// del pavimento vero (come GroundedSkybox di three.js): il pavimento della foto sta a quota
// zero, dove poggiano gambe, sedia e vaso, e i muri restano lontani.
function geoStudioA(altezzaOcchi) {
  const g = new THREE.SphereGeometry(9, 96, 48);
  g.scale(-1, 1, 1);                                         // vista da dentro, non specchiata
  const pos = g.attributes.position, t = new THREE.Vector3(), y1 = -altezzaOcchi * 1.5;
  for (let i = 0; i < pos.count; i++) {
    t.fromBufferAttribute(pos, i);
    if (t.y < 0) { t.multiplyScalar(t.y < y1 ? -altezzaOcchi / t.y : 1 - (t.y * t.y) / (3 * y1 * y1)); t.toArray(pos.array, 3 * i); }
  }
  return g;
}
const studio = new THREE.Mesh(geoStudioA(1.2), new THREE.MeshBasicMaterial({ map: tStudio, toneMapped: false, depthWrite: false }));
let altezzaStudio = 1.2;
studio.name = "eidetica-studio";
studio.renderOrder = -10;
// davanti (-z) deve cadere il punto della foto scelto (0,596 = la parete con le 4 cornici)
{
  const fi = 2 * Math.PI * (0.25 + STUDIO.giro / (2 * Math.PI)), x = Math.cos(fi), z = Math.sin(fi);
  studio.rotation.y = Math.atan2(x, -z);                    // porta il punto (x, z) della foto davanti, a (0, -1)
}
world.createTransformEntity(studio);
// LA SAGOMA DI CHI SIEDE (v16). Raffaella: «una sagoma come quella delle mani, un filo
// segnato, non un manichino: una sagoma delicata». Il Quest 2 non vede il corpo: senza, guardando
// in basso si vede la seduta vuota e ci si sente «per aria». Il corpo seduto e' fatto di poche
// forme morbide (busto, spalle, bacino, cosce, gambe, piedi) e se ne disegna SOLO IL CONTORNO,
// bianco e sottile come quello delle mani di Meta: dentro si vede attraverso. Niente braccia:
// le braccia sono le mani vere. Si fa su misura degli occhi, alla posa, e la sedia con lui.
const corpoDentro = new THREE.MeshBasicMaterial({ colorWrite: false });            // scrive solo la profondita': dentro il filo si vede la scena
const corpoFilo = new THREE.ShaderMaterial({
  uniforms: { uSpessore: { value: 0.0028 }, uColore: { value: new THREE.Color(0xffffff) }, uAlfa: { value: 0.62 } },
  // il filo svanisce vicino agli occhi: busto e spalle, a pochi cm, farebbero una riga grossa e spezzata
  vertexShader: `uniform float uSpessore; varying float vVicino;
    void main() { vec4 mv = modelViewMatrix * vec4(position + normal * uSpessore, 1.0); vVicino = smoothstep(0.32, 0.52, length(mv.xyz)); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 uColore; uniform float uAlfa; varying float vVicino;
    void main() { gl_FragColor = vec4(uColore, uAlfa * vVicino);
      #include <colorspace_fragment>
    }`,
  side: THREE.BackSide, transparent: true, depthWrite: false,
});
const corpoA = new THREE.Mesh(new THREE.BufferGeometry(), corpoDentro), corpoB = new THREE.Mesh(new THREE.BufferGeometry(), corpoFilo);
corpoA.name = "eidetica-corpo"; corpoB.name = "eidetica-corpo-filo";
corpoA.renderOrder = 998; corpoB.renderOrder = 999;
corpoA.frustumCulled = corpoB.frustumCulled = false;
postazione.add(corpoA, corpoB);
const SU = new THREE.Vector3(0, 1, 0);
function osso(a, b, raggio, largo = 1, fondo = 1) {   // una forma morbida da a a b (metri, sistema della postazione)
  const d = new THREE.Vector3().subVectors(b, a), l = d.length();
  const g = new THREE.CapsuleGeometry(raggio, Math.max(0.001, l), 6, 16);
  g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5),
    new THREE.Quaternion().setFromUnitVectors(SU, d.normalize()), new THREE.Vector3(largo, 1, fondo)));
  return g;
}
// ey = occhi, py = punto d'appoggio (quote dal pavimento); gli occhi stanno a DAVANTI dietro il plastico
function faiIlCorpo(ey, py) {
  const s = ey - SEDUTA_OCCHI, V = (x, y, dz) => new THREE.Vector3(x, y - py, DAVANTI + dz);
  const pezzi = [
    osso(V(0, s + 0.13, 0.11), V(0, ey - 0.25, 0.09), 0.11, 1.4, 0.8),       // il busto
    osso(V(-0.16, ey - 0.21, 0.10), V(0.16, ey - 0.21, 0.10), 0.055),       // le spalle
    osso(V(-0.11, s + 0.10, 0.08), V(0.11, s + 0.10, 0.08), 0.095),         // il bacino
  ];
  for (const x of [-1, 1]) pezzi.push(
    osso(V(0.10 * x, s + 0.09, 0.06), V(0.11 * x, s + 0.10, -0.38), 0.072),  // la coscia, sulla seduta
    osso(V(0.11 * x, s + 0.07, -0.40), V(0.12 * x, 0.08, -0.44), 0.048),     // la gamba, fino a terra
    osso(V(0.12 * x, 0.05, -0.42), V(0.13 * x, 0.04, -0.60), 0.038));        // il piede
  const g = mergeGeometries(pezzi);
  pezzi.forEach((p) => p.dispose());
  corpoA.geometry.dispose(); corpoA.geometry = g; corpoB.geometry = g;
}
const finti = [studio, pavimento, lastraDietro, lastraDestra, ...profili, poltroncina, felce, ...gambe, corpoA, corpoB];
postazione.traverse((o) => { if (o.isMesh && (o.material === vetroChiaro || (Array.isArray(o.material) && o.material.includes(vetroChiaro)) || o.material === acciaio) && !finti.includes(o)) finti.push(o); });
const piedino = [];   // il leggio del pannello resta anche in passthrough
postazione.traverse((o) => { if (o.isMesh && o.material === acciaio && o.geometry.parameters && o.geometry.parameters.width < 0.2 && o.position.z > zPiano - P.fondo / 2 && Math.abs(o.position.x) < 0.1 && o.position.y > -0.05) piedino.push(o); });
let passthrough = false;
function mettiPassthrough(acceso) {
  passthrough = acceso;
  for (const o of finti) o.visible = !acceso || piedino.includes(o);
  scriviBottone();
  console.log("[EIDETICA visore] passthrough " + (acceso ? "ACCESO: la stanza vera" : "spento: lo studio simulato"));
}

// IL PULSANTE (v13): vetro con i fili LED, sul piano a destra del plastico, a portata
// di dito. Si preme toccandolo col dito (poke) o col pizzico a distanza (raggio).
const telaB = document.createElement("canvas");
telaB.width = 640; telaB.height = 200;
const pb = telaB.getContext("2d");
const tramaB = new THREE.CanvasTexture(telaB);
tramaB.colorSpace = THREE.SRGBColorSpace;
const bottone = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.05),
  new THREE.MeshBasicMaterial({ map: tramaB, transparent: true, toneMapped: false, depthWrite: false }));
bottone.name = "eidetica-pulsante-passthrough";
bottone.renderOrder = 10;
function scriviBottone(sopra = false) {
  pb.clearRect(0, 0, 640, 200);
  const B = 18;
  pb.beginPath(); pb.roundRect(B, B, 640 - 2 * B, 200 - 2 * B, 82);
  pb.fillStyle = passthrough ? "rgba(63,208,232,0.30)" : sopra ? "rgba(30,36,48,0.70)" : "rgba(12,16,24,0.55)"; pb.fill();
  const led = pb.createLinearGradient(B, 0, 640 - B, 0);
  led.addColorStop(0, "#ffb020"); led.addColorStop(0.5, "#b36bff"); led.addColorStop(1, "#3fd0e8");
  pb.save(); pb.shadowColor = "rgba(179,107,255,0.95)"; pb.shadowBlur = sopra ? 22 : 12;
  pb.lineWidth = 4; pb.strokeStyle = led; pb.stroke(); pb.restore();
  pb.fillStyle = "#e8eaf0"; pb.font = "500 44px 'Segoe UI', Roboto, system-ui, sans-serif";
  if ("letterSpacing" in pb) pb.letterSpacing = "6px";
  pb.textAlign = "center"; pb.textBaseline = "middle";
  pb.fillText("PASSTHROUGH  " + (passthrough ? "ON" : "OFF"), 320, 102);
  pb.beginPath(); pb.arc(70, 100, 11, 0, Math.PI * 2); pb.fillStyle = passthrough ? "#4fe08a" : "#9aa3b2"; pb.fill();
  tramaB.needsUpdate = true;
}
bottone.position.set(LUNGO / 2 + 0.12, 0.035, 0.08);
bottone.rotation.set(-1.0, -0.25, 0);                        // quasi coricato, girato verso chi siede
postazione.add(bottone);
const enteBottone = world.createTransformEntity(bottone, entePostazione);   // resta figlio della postazione
enteBottone.addComponent(RayInteractable);
enteBottone.addComponent(PokeInteractable);

// la posa: plastico e postazione insieme; le gambe, l'ombra e la L arrivano fino al pavimento vero
function posaLaPostazione(punto, occhi = punto.y + SOTTO_OCCHI) {
  postazione.position.copy(punto);
  plastico.position.copy(punto);
  plastico.position.y += 0.0015;   // v15: 1,5 mm sopra il sottomano (le due facce combaciavano: lo sfarfallio)
  plastico.quaternion.identity();
  plastico.scale.setScalar(scala);
  const h = Math.max(0.3, punto.y - P.sottomano - P.spessore);   // dal sotto del vetro a terra
  for (const g of gambe) { g.scale.y = h; g.position.y = -P.sottomano - P.spessore - h / 2; }
  pavimento.position.y = -punto.y + 0.002;
  lastraDietro.position.y = lastraDestra.position.y = -punto.y + L.alto / 2;
  for (const p of profili) p.position.y = -punto.y + 0.015;
  for (const a of aTerra) a.position.y = -punto.y;
  studio.position.set(punto.x, occhi, punto.z + DAVANTI);   // il centro della foto = gli occhi (v15: col pavimento a quota zero)
  if (occhi > 0.3 && Math.abs(occhi - altezzaStudio) > 0.01) {
    studio.geometry.dispose(); studio.geometry = geoStudioA(occhi); altezzaStudio = occhi;
  }
  sedutaSuMisura(occhi);
  faiIlCorpo(occhi, punto.y);                                // v16: la sagoma di chi siede
  appendiIlMarchio(punto.y);
  r.shadowMap.needsUpdate = true;
}
posaLaPostazione(CENTRO);

const M = { ora: 0, media: 0, minimo: 0, campioni: [], fotogrammi: 0, da: 0, dentro: false,
  disegni: 0, triangoliDisegnati: 0, ritmo: null, posato: false, attesaTesta: 0, occhi: null, piano: null,
  pezzi, triangoli: Math.round(triangoli), scala };
window.__EIDETICA_VISORE = M;
window.__EIDETICA_PLASTICO = plastico;   // per le prove (anteprima ed emulatore)
M.introDa = performance.now();                           // v12: sul PC l'apertura parte subito

function tondo(x, y, w, h, rr) {
  p.beginPath(); p.moveTo(x + rr, y); p.arcTo(x + w, y, x + w, y + h, rr); p.arcTo(x + w, y + h, x, y + h, rr);
  p.arcTo(x, y + h, x, y, rr); p.arcTo(x, y, x + w, y, rr); p.closePath();
}
const CARATTERE = "'Segoe UI', Roboto, 'Helvetica Neue', system-ui, sans-serif";
function scriviPannello() {
  p.clearRect(0, 0, tela.width, tela.height);
  // v9: VETRO con la cornice di FILI LED nei colori della tavola UX (arancio dei
  // flussi, viola degli agenti, ciano delle zone): il tocco tech sullo studio vero
  const B = 24;
  tondo(B, B, tela.width - 2 * B, tela.height - 2 * B, 28);
  p.fillStyle = "rgba(12,16,24,0.50)"; p.fill();   // v10: piu' trasparente (Raffaella): lo stesso vetro per tutti i pannelli
  const led = p.createLinearGradient(B, B, tela.width - B, tela.height - B);
  led.addColorStop(0, "#ffb020"); led.addColorStop(0.5, "#b36bff"); led.addColorStop(1, "#3fd0e8");
  p.save();
  p.shadowColor = "rgba(179,107,255,0.95)"; p.shadowBlur = 24; p.lineWidth = 5; p.strokeStyle = led; p.stroke();
  p.shadowColor = "rgba(63,208,232,0.8)"; p.shadowBlur = 10; p.lineWidth = 2.5; p.strokeStyle = led; p.stroke();
  p.shadowBlur = 0; p.lineWidth = 1; p.strokeStyle = "rgba(255,255,255,0.55)"; p.stroke();   // il filo acceso al centro
  p.restore();
  p.save(); p.translate(B - 6, B - 6);
  // testata: il marchio spaziato, come la tavola
  p.fillStyle = C.testo; p.font = "300 46px " + CARATTERE;
  if ("letterSpacing" in p) p.letterSpacing = "14px";
  p.fillText("EIDETICA", 52, 92);
  if ("letterSpacing" in p) p.letterSpacing = "3px";
  p.fillStyle = C.ciano; p.font = "600 24px " + CARATTERE;
  p.fillText("HEADSET · PERFORMANCE", 52, 140);
  if ("letterSpacing" in p) p.letterSpacing = "0px";
  p.fillStyle = "rgba(154,163,178,0.35)"; p.fillRect(52, 168, tela.width - 104, 2);
  if (PROVA) {   // v15: la tabella della prova dei pesi
    const tinta = (v) => v >= 60 ? "#4fe08a" : v >= 45 ? C.arancio : "#ff5f57";
    p.font = "400 24px " + CARATTERE;
    TAPPE.forEach(([nome], i) => {
      const y = 204 + i * 29, ris = PP.ris[i];
      p.fillStyle = i === PP.i ? C.testo : C.grigio;
      p.fillText((i + 1) + "  " + nome, 52, y);
      p.fillStyle = ris ? tinta(ris[1]) : C.grigio;
      p.fillText(ris ? ris[1].toFixed(1) + " fps" : i === PP.i ? "measuring…" : "—", 560, y);
      if (ris) { p.fillStyle = C.grigio; p.fillText(ris[2] + " draws", 760, y); }
    });
    p.fillStyle = C.grigio; p.font = "400 22px " + CARATTERE;
    p.fillText((PP.i >= TAPPE.length ? "Test done · " : !M.fineAllinea ? "Rest a hand flat on your desk · " : "Load test · keep still, look at the model · ")
      + (M.ritmo ? M.ritmo + " Hz · " : "") + COSTRUZIONE, 52, 440);
    p.restore(); trama.needsUpdate = true;
    return;
  }
  // la misura
  const pieno = M.campioni.length >= 30, ok = pieno && M.minimo >= 60;
  // v11: I NUMERI SEGNALANO (Raffaella: «gli elementi segnaletici devono essere interattivi»):
  // verde da 60 in su, ambra fra 45 e 59, rosso sotto 45; grigio finche' non c'e' misura
  const tinta = (v) => !v ? C.testo : v >= 60 ? "#4fe08a" : v >= 45 ? C.arancio : "#ff5f57";
  p.fillStyle = tinta(M.ora); p.font = "300 120px " + CARATTERE;
  p.fillText(String(M.ora || "—"), 52, 304);
  const w = p.measureText(String(M.ora || "—")).width;
  p.fillStyle = C.grigio; p.font = "400 34px " + CARATTERE;
  p.fillText("fps", 52 + w + 14, 304);
  p.fillStyle = C.grigio; p.font = "400 30px " + CARATTERE;
  p.fillText("Average", 520, 236); p.fillText("Minimum", 760, 236);
  p.font = "400 46px " + CARATTERE;
  p.fillStyle = M.campioni.length ? tinta(M.media) : C.testo;
  p.fillText(M.campioni.length ? M.media.toFixed(1) : "—", 520, 292);
  p.fillStyle = M.campioni.length ? tinta(M.minimo) : C.testo;
  p.fillText(M.campioni.length ? String(M.minimo) : "—", 760, 292);
  // lo stato: un punto, verde se il minimo regge 60 per 30 s
  p.beginPath(); p.arc(64, 372, 9, 0, Math.PI * 2);
  p.fillStyle = !pieno ? C.grigio : ok ? "#4fe08a" : C.arancio; p.fill();
  p.fillStyle = C.grigio; p.font = "400 26px " + CARATTERE;
  p.fillText((M.dentro && M.posato && !M.fineAllinea ? "Rest a hand flat on your desk" : pieno ? (ok ? "Stable above 60 fps" : "Below 60 fps") : "Measuring " + M.campioni.length + " / 30 s")
    + "   ·   " + M.disegni + " draws · " + Math.round(M.triangoliDisegnati / 1000) + "k tris"
    + (M.ritmo ? " · " + M.ritmo + " Hz" : "") + "   ·   " + COSTRUZIONE, 88, 381);
  p.restore();
  trama.needsUpdate = true;
}
scriviPannello();

// IL PLASTICO A PORTATA DI MANO (v2): il piano misurato dal pavimento non e' il
// tavolo vero di chi e' seduto: si misura dagli OCCHI. Entrati nel visore,
// appena la testa e' letta, il plastico va 40 cm sotto gli occhi e 45 cm
// davanti; il pannello lo segue. Una volta sola per ogni entrata.
const testa = new THREE.Vector3();
function posaDavanti() {
  if (M.posato) return;
  if (++M.attesaTesta < 20) return;                   // i primi fotogrammi la testa e' ancora a zero
  world.player.head.getWorldPosition(testa);
  if (testa.y < 0.5 && M.attesaTesta < 120) return;    // testa non ancora letta: si aspetta ancora un po'
  posaLaPostazione(new THREE.Vector3(testa.x, testa.y - SOTTO_OCCHI, testa.z - DAVANTI), testa.y);
  M.posato = true; M.attesaTesta = 0;
  M.occhiV = testa.clone(); M.allineaDa = performance.now(); M.fineAllinea = false; M.allineato = false; manoFerma.left = []; manoFerma.right = [];
  M.introDa = performance.now();                       // v12: l'apertura del marchio
  M.occhi = +testa.y.toFixed(2); M.piano = +(testa.y - SOTTO_OCCHI).toFixed(2);
  M.seduta = sedutaFatta;
  console.log("[EIDETICA visore] occhi a " + M.occhi + " m: plastico posato a " + M.piano + " m, 45 cm davanti; seduta a " + M.seduta + " m (modello " + sedutaModello + ")");
}

// IL PIANO ALL'ALTEZZA DELLE MANI (v16). Raffaella nel visore: per prendere il plastico ha
// dovuto mettere le mani SOTTO il piano della sua scrivania vera: il piano finto stava piu' in
// basso del vero (e lei si sentiva alta sulla sedia). Nei primi 15 s dopo l'entrata, se una
// mano si posa FERMA e PIATTA davanti, fra 18 e 62 cm sotto gli occhi, quella e' la scrivania
// vera: il sottomano col plastico si posa li'. Senza scrivania vera (o coi controller) resta
// la posa dagli occhi.
const GIUNTI = ["wrist", "middle-finger-metacarpal", "thumb-tip", "index-finger-tip", "middle-finger-tip", "ring-finger-tip", "pinky-finger-tip"];
const manoFerma = { left: [], right: [] }, giunto = new THREE.Vector3();
function allineaAlleMani(adesso) {
  if (adesso - M.allineaDa > 15000) { M.fineAllinea = true; console.log("[EIDETICA visore] nessuna mano posata: piano dagli occhi"); scriviPannello(); return; }
  const s = r.xr.getSession(), frame = r.xr.getFrame && r.xr.getFrame(), rs = r.xr.getReferenceSpace();
  if (!s || !frame || !rs || !frame.getJointPose) return;
  world.player.updateMatrixWorld();
  const piani = [];
  for (const src of s.inputSources) {
    if (!src.hand || !manoFerma[src.handedness]) continue;
    let basso = Infinity, alto = -Infinity, z = 0, n = 0, puntaGiu = Infinity, puntaSu = -Infinity;
    for (const nome of GIUNTI) {
      const j = src.hand.get(nome), p = j && frame.getJointPose(j, rs);
      if (!p) { n = 0; break; }
      giunto.set(p.transform.position.x, p.transform.position.y, p.transform.position.z).applyMatrix4(world.player.matrixWorld);
      const y = giunto.y - (p.radius || 0.008);
      basso = Math.min(basso, y); alto = Math.max(alto, y); z += giunto.z; n++;
      if (/^(index|middle|ring)-finger-tip$/.test(nome)) { puntaGiu = Math.min(puntaGiu, y); puntaSu = Math.max(puntaSu, y); }   // le punte posate stanno alla stessa quota
    }
    const storia = manoFerma[src.handedness];
    const sotto = M.occhiV.y - basso, davanti = M.occhiV.z - z / Math.max(1, n);
    M.mani = { [src.handedness]: { n, piatta: +(alto - basso).toFixed(3), punte: +(puntaSu - puntaGiu).toFixed(3), sotto: +sotto.toFixed(3), davanti: +davanti.toFixed(3) }, ...(M.mani || {}) };   // per le prove
    if (!n || alto - basso > 0.07 || puntaSu - puntaGiu > 0.025 || sotto < 0.18 || sotto > 0.62 || davanti < 0.12) { storia.length = 0; continue; }   // non e' una mano piatta posata davanti
    storia.push([adesso, basso]);
    while (storia.length && adesso - storia[0][0] > 800) storia.shift();
    const ys = storia.map((v) => v[1]);
    if (adesso - storia[0][0] > 700 && Math.max(...ys) - Math.min(...ys) < 0.008) piani.push(ys.sort((a, b) => a - b)[ys.length >> 1]);
  }
  if (!piani.length) return;
  const piano = piani.reduce((a, b) => a + b, 0) / piani.length;
  posaLaPostazione(new THREE.Vector3(postazione.position.x, piano, postazione.position.z), M.occhiV.y);
  M.allineato = M.fineAllinea = true; M.piano = +piano.toFixed(3); M.seduta = sedutaFatta;
  console.log("[EIDETICA visore] scrivania vera letta dalle mani: piano a " + M.piano + " m (" + Math.round((M.occhiV.y - piano) * 100) + " cm sotto gli occhi), seduta a " + M.seduta + " m");
  scriviPannello();
}

// L'APERTURA DEL MARCHIO (v12): 0-0,8 s l'occhio si apre (da una fessura a tutto
// tondo), fino a 2,4 s resta davanti agli occhi e l'alone pulsa, poi in 1,2 s va al
// suo posto sul vetro fume' e ci resta.
const liscio = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
function animaMarchio(adesso) {
  if (M.introDa == null) return;
  const t = (adesso - M.introDa) / 1000;
  const apri = liscio(t / 0.8), vai = liscio((t - 2.4) / 1.2);
  marchio.position.lerpVectors(INTRO_MARCHIO, POSTO_MARCHIO, vai);
  cavo.visible = rosone.visible = gancio.visible = t > 3.6;
  marchio.scale.set(1, 0.04 + 0.96 * apri, 1);
  segno.material.opacity = apri;
  alone.material.opacity = 0.55 * apri * (1 + 0.4 * Math.sin(t * 5) * (1 - vai));
  if (t > 3.8) {
    M.introDa = null;
    marchio.position.copy(POSTO_MARCHIO); marchio.scale.set(1, 1, 1);
    cavo.visible = rosone.visible = gancio.visible = true;
    segno.material.opacity = 1; alone.material.opacity = 0.55;
  }
}

// IL SOLE SEGUE IL PLASTICO: la sua camera d'ombra lo copre tutto anche
// quando lo prendi, lo sposti o lo ingrandisci (come sistemaIlSole della pagina)
let raggioOmbra = 0;
const ultimaPosa = new THREE.Matrix4();
function solePerIlPlastico() {
  // v15: l'ombra si ricalcola SOLO se il plastico si e' mosso (preso, girato, ingrandito)
  plastico.updateMatrixWorld();
  if (!ultimaPosa.equals(plastico.matrixWorld)) { ultimaPosa.copy(plastico.matrixWorld); r.shadowMap.needsUpdate = true; }
  const k = plastico.scale.x / scala;
  // v15: la camera d'ombra stringe sul solo plastico (anche ingrandito): ombre nette
  const raggio = (LUNGO / 2 + 0.06) * k;
  sole.target.position.copy(plastico.position);
  sole.position.copy(plastico.position).addScaledVector(DIR_SOLE, 3);
  if (Math.abs(raggio - raggioOmbra) > 0.002) {
    const c = sole.shadow.camera;
    c.left = -raggio; c.right = raggio; c.top = raggio; c.bottom = -raggio;
    c.near = 0.05; c.far = 3 + 2 * raggio + 1.5;
    c.updateProjectionMatrix();
    raggioOmbra = raggio;
  }
}

// v15: LA PROVA DEI PESI (?prova nel link). Una sola entrata nel visore misura da sola
// quanto costa ogni parte della scena: 6 tappe da 9 s (si contano gli ultimi 6), poi la
// tabella resta sul pannello. Raffaella legge i numeri, senza rifare la prova tante volte.
function pesi({ ombre = true, studio: st = true, lastre = true, arredi = true }) {
  sole.castShadow = ombre; r.shadowMap.needsUpdate = true;
  studio.visible = st;
  lastraDietro.visible = lastraDestra.visible = lastre; for (const p of profili) p.visible = lastre;
  poltroncina.visible = felce.visible = corpoA.visible = corpoB.visible = arredi;
}
function provaDeiPesi(adesso) {
  if (M.dentro && (!M.posato || !M.fineAllinea)) return;   // v16: prima si allinea il piano alle mani
  if (PP.i === -1) { if (!PP.da) PP.da = adesso + 3000; if (adesso < PP.da) return; PP.i = 0; PP.da = adesso; pesi(TAPPE[0][1]); }
  if (PP.i >= TAPPE.length) return;
  const t = adesso - PP.da;
  if (t >= 3000) { PP.f++; if (!PP.conta) PP.conta = adesso; }
  if (t >= 9000) {
    const fps = (PP.f - 1) * 1000 / (adesso - PP.conta);
    PP.ris.push([TAPPE[PP.i][0], fps, world.renderer.info.render.calls]);
    console.log("[EIDETICA visore] prova dei pesi: " + TAPPE[PP.i][0] + " = " + fps.toFixed(1) + " fps");
    PP.i++; PP.da = adesso; PP.f = 0; PP.conta = 0;
    pesi(PP.i < TAPPE.length ? TAPPE[PP.i][1] : {});
    scriviPannello();
  }
}
window.__EIDETICA_PROVA = PP;

// il conto dei fotogrammi: si azzera entrando nel visore, un campione al secondo, gli ultimi 30
class Regia extends createSystem({}) {
  update() {
    presaUniforme();
    { const s = plastico.scale;   // cintura e bretelle: il plastico non si stira mai
      if (Math.abs(s.x - s.y) > 1e-6 || Math.abs(s.x - s.z) > 1e-6) s.setScalar(Math.cbrt(s.x * s.y * s.z)); }
    solePerIlPlastico();
    const adesso = performance.now();
    animaMarchio(adesso);
    if (M.dentro && M.posato && !M.fineAllinea) allineaAlleMani(adesso);
    if (PROVA) provaDeiPesi(adesso);
    const premuto = enteBottone.hasComponent(Pressed);
    if (premuto && !M.premuto) mettiPassthrough(!passthrough);
    M.premuto = premuto;
    const dentro = !!world.renderer.xr.isPresenting;
    if (dentro !== M.dentro) {
      M.dentro = dentro; M.campioni = []; M.fotogrammi = 0; M.da = adesso;
      const s = world.renderer.xr.getSession && world.renderer.xr.getSession();
      M.ritmo = s && s.frameRate ? Math.round(s.frameRate) : null;
      // v15: il Quest 2 nel browser corre a 90 Hz (11 ms per fotogramma); a 72 Hz ne ha
      // 13,9: lo stesso disegno regge meglio, e 72 resta sopra i 60 del VR Start
      if (s && s.updateTargetFrameRate && s.supportedFrameRates && [...s.supportedFrameRates].includes(72) && Math.round(s.frameRate || 0) !== 72)
        s.updateTargetFrameRate(72).then(() => { M.ritmo = 72; console.log("[EIDETICA visore] ritmo del visore: 72 Hz"); }).catch(() => {});
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
      scriviPannello();
      if (M.campioni.length === 30 && dentro)
        console.log("[EIDETICA visore] 30 s: media " + M.media.toFixed(1) + ", minimo " + M.minimo + " fps");
    }
  }
}
world.registerSystem(Regia);

stato.textContent = "EIDETICA · " + pezzi + " pieces · " + Math.round(triangoli / 1000) + "k triangles";
console.log("[EIDETICA visore] " + COSTRUZIONE + ": plastico " + pezzi + " pezzi, "
  + Math.round(triangoli) + " triangoli, scala " + scala.toFixed(4) + ", ingombro " + dim.toArray().map((v) => v.toFixed(1)).join(" x ") + " m");

// GUARDARSI ATTORNO SUL PC (anteprima): trascinando col mouse si gira lo
// sguardo come da seduti alla scrivania, la rotellina stringe o allarga la
// vista. Nel visore non serve: guarda la testa.
{
  const cam = world.camera, sguardo = new THREE.Euler().setFromQuaternion(cam.quaternion, "YXZ");
  const tela3d = world.renderer.domElement;
  let preso = null;
  tela3d.style.cursor = "grab";
  tela3d.addEventListener("pointerdown", (e) => { preso = { x: e.clientX, y: e.clientY }; tela3d.setPointerCapture(e.pointerId); tela3d.style.cursor = "grabbing"; });
  tela3d.addEventListener("pointerup", () => { preso = null; tela3d.style.cursor = "grab"; });
  tela3d.addEventListener("pointermove", (e) => {
    if (!preso || world.renderer.xr.isPresenting) return;
    sguardo.y += (e.clientX - preso.x) * 0.004;
    sguardo.x = Math.max(-1.45, Math.min(1.45, sguardo.x + (e.clientY - preso.y) * 0.004));
    preso = { x: e.clientX, y: e.clientY };
    cam.quaternion.setFromEuler(sguardo);
  });
  tela3d.addEventListener("wheel", (e) => {
    if (world.renderer.xr.isPresenting) return;
    cam.fov = Math.max(25, Math.min(95, cam.fov + Math.sign(e.deltaY) * 4));
    cam.updateProjectionMatrix();
    e.preventDefault();
  }, { passive: false });
}

// sul PC (anteprima): il tasto P fa quello che fa il pulsante nel visore
addEventListener("keydown", (e) => { if (e.key === "p" || e.key === "P") mettiPassthrough(!passthrough); });
scriviBottone();

// un solo tasto per entrare
if (navigator.xr && (await navigator.xr.isSessionSupported("immersive-vr").catch(() => false))) {
  entra.style.display = "block";
  const conAR = await navigator.xr.isSessionSupported("immersive-ar").catch(() => false);
  M.modo = conAR ? "immersive-ar" : "immersive-vr";
  entra.onclick = () => world.launchXR({ sessionMode: conAR ? SessionMode.ImmersiveAR : SessionMode.ImmersiveVR });
  world.renderer.xr.addEventListener("sessionstart", () => { entra.style.display = "none"; });
  world.renderer.xr.addEventListener("sessionend", () => { entra.style.display = "block"; });
} else {
  stato.textContent += " · preview: drag to look around, scroll to zoom";
}
