// Prova d'aspetto sulla scena 3D: prima e dopo, sullo stesso fotogramma.
//
//     node banco/scena.mjs
//
// Non e' un mockup: inietta codice vero attraverso il ponte __veritas* gia'
// documentato, e fotografa il risultato. Se qui migliora, migliora anche in
// index.html.

import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const fuori = path.join(qui, "aspetto");
const URL_BANCO = "http://127.0.0.1:8899/index.html";

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
});
const pagina = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errori = [];
pagina.on("pageerror", (e) => errori.push(e.message));
const cdp = await pagina.context().newCDPSession(pagina);
async function scatta(nome) {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(fuori, nome + ".png"), Buffer.from(data, "base64"));
  console.log("   scattata  " + nome);
}

await pagina.goto(URL_BANCO, { waitUntil: "load", timeout: 60000 });
await pagina.waitForTimeout(6000);
await pagina.fill("#v-new-name", "prova aspetto");
await pagina.click("#v-create-btn");
await pagina.waitForTimeout(7000);
await pagina.click("#vs-start-btn").catch(() => {});
await pagina.waitForTimeout(12000);
await pagina.setInputFiles("#vaio-upload-input", path.join(qui, "airport_foot_traffic.glb"));
await pagina.waitForTimeout(30000);

// Nascondo la UI: qui si giudica la scena, non i pannelli.
await pagina.evaluate(() => {
  const s = document.createElement("style");
  s.id = "solo-scena";
  s.textContent = `#vaio-topbar,#vaio-console,#vaio-upload,.vaio-toast,#vaio-hint,
    [id^="vaio-"]:not(#vaio-root),aside,#root header,#root footer{opacity:0!important}`;
  document.head.appendChild(s);
});
await pagina.waitForTimeout(1200);

console.log("\nPRIMA");
const prima = await pagina.evaluate(() => {
  const c = window.__veritasCamera, r = window.__veritasRenderer, s = window.__veritasScene;
  let luci = 0; s.traverse((o) => { if (o.isLight) luci++; });
  return {
    luci,
    toneMapping: r.toneMapping,
    esposizione: r.toneMappingExposure,
    ombre: r.shadowMap.enabled,
    sfondo: s.background ? "si" : "no",
    camera: [+c.position.x.toFixed(1), +c.position.y.toFixed(1), +c.position.z.toFixed(1)],
  };
});
console.log("  ", JSON.stringify(prima));
await scatta("8-scena-prima");

console.log("\nDOPO: inquadratura + luce, dal ponte __veritas*");
const dopo = await pagina.evaluate(() => {
  const THREE = window.THREE;
  const scena = window.__veritasScene;
  const camera = window.__veritasCamera;
  const renderer = window.__veritasRenderer;
  const controlli = window.__veritasControls;
  const radice = window.__veritasModelRoot;

  const scatola = new THREE.Box3().setFromObject(radice);
  const centro = scatola.getCenter(new THREE.Vector3());
  const misura = scatola.getSize(new THREE.Vector3());
  const raggio = Math.max(misura.x, misura.z) * 0.5;

  // 1. INQUADRATURA — il modello non era mai stato inquadrato: la camera
  //    stava dove l'aveva lasciata il bundle, e meta' edificio usciva fuori.
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const distanza = (raggio / Math.tan(fov * 0.5)) * 1.15;
  camera.position.set(centro.x + distanza * 0.55, centro.y + distanza * 0.62, centro.z + distanza * 0.55);
  camera.near = distanza / 100;
  camera.far = distanza * 12;
  camera.updateProjectionMatrix();
  camera.lookAt(centro);
  if (controlli) { controlli.target.copy(centro); controlli.update(); }

  // 2. LUCE — c'era solo la luce che il bundle mette per se': niente
  //    direzione, niente ombre, quindi tutto grigio piatto.
  const vecchie = [];
  scena.traverse((o) => { if (o.isLight && o.userData.veritasAspetto) vecchie.push(o); });
  vecchie.forEach((o) => o.parent.remove(o));

  const chiave = new THREE.DirectionalLight(0xfff4e6, 2.4);
  chiave.position.set(centro.x + misura.x * 0.5, centro.y + misura.y * 3.5, centro.z + misura.z * 0.35);
  chiave.target.position.copy(centro);
  chiave.castShadow = true;
  chiave.shadow.mapSize.set(2048, 2048);
  const o = chiave.shadow.camera;
  o.left = -raggio * 1.3; o.right = raggio * 1.3;
  o.top = raggio * 1.3; o.bottom = -raggio * 1.3;
  o.near = 1; o.far = misura.y * 8 + raggio * 4;
  o.updateProjectionMatrix();
  chiave.userData.veritasAspetto = true;
  scena.add(chiave); scena.add(chiave.target);

  // cielo/terra: dà volume senza costare ombre
  const ambiente = new THREE.HemisphereLight(0xbcd6ff, 0x2a2f3a, 1.15);
  ambiente.userData.veritasAspetto = true;
  scena.add(ambiente);

  const stacco = new THREE.DirectionalLight(0x9dc4ff, 0.55);
  stacco.position.set(centro.x - misura.x * 0.6, centro.y + misura.y * 1.2, centro.z - misura.z * 0.6);
  stacco.userData.veritasAspetto = true;
  scena.add(stacco);

  // 3. RESA — senza tone mapping il bianco si spegne e il grigio si appiattisce.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  let ombreggia = 0;
  radice.traverse((n) => {
    if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; ombreggia++; }
  });

  // 4. FONDO — il nero assoluto non e' profondita', e' vuoto.
  scena.background = new THREE.Color(0x0b0f17);
  scena.fog = new THREE.Fog(0x0b0f17, distanza * 1.4, distanza * 4.2);

  return {
    ingombro: [+misura.x.toFixed(1), +misura.y.toFixed(1), +misura.z.toFixed(1)],
    distanza: +distanza.toFixed(1),
    meshOmbreggiate: ombreggia,
  };
});
console.log("  ", JSON.stringify(dopo));
await pagina.waitForTimeout(4000);
await scatta("9-scena-dopo");

console.log("\nerrori: " + (errori.length ? [...new Set(errori)].slice(0, 5).join(" | ") : "nessuno"));
await browser.close();
