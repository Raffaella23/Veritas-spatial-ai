// La tela 3D e' grande quanto la finestra? (misura, poi prova la correzione)
//
//     node banco/tela.mjs
//
// Ipotesi da verificare: la shell nasconde i pannelli nativi con display:none,
// il flex si ricompone, ma nessuno avvisa il renderer -- che ridimensiona solo
// sull'evento resize della finestra. La tela resterebbe quindi grande quanto
// era CON i pannelli: 1920-268-300 = 1352.

import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const fuori = path.join(qui, "aspetto");

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
});
const pagina = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const cdp = await pagina.context().newCDPSession(pagina);
async function scatta(nome) {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(fuori, nome + ".png"), Buffer.from(data, "base64"));
  console.log("   scattata  " + nome);
}
const misura = () => pagina.evaluate(() => {
  const c = document.querySelector("canvas");
  const r = c.getBoundingClientRect();
  const aside = [...document.querySelectorAll("aside")].map((a) => ({
    largo: Math.round(a.getBoundingClientRect().width),
    nascosto: a.classList.contains("vaio-native-hidden"),
    display: getComputedStyle(a).display,
  }));
  return {
    finestra: [innerWidth, innerHeight],
    tela: [Math.round(r.width), Math.round(r.height)],
    perso: Math.round((1 - (r.width * r.height) / (innerWidth * innerHeight)) * 100) + "% di schermo nero",
    aside,
  };
});

await pagina.goto("http://127.0.0.1:8899/index.html", { waitUntil: "load", timeout: 60000 });
await pagina.waitForTimeout(6000);
await pagina.fill("#v-new-name", "tela");
await pagina.click("#v-create-btn");
await pagina.waitForTimeout(7000);
await pagina.click("#vs-start-btn").catch(() => {});
await pagina.waitForTimeout(12000);
await pagina.setInputFiles("#vaio-upload-input", path.join(qui, "airport_foot_traffic.glb"));
await pagina.waitForTimeout(30000);

console.log("\nPRIMA");
console.log("  ", JSON.stringify(await misura()));

// LA CORREZIONE: un evento resize. Nient'altro.
console.log("\nDOPO un solo window.dispatchEvent(new Event('resize'))");
await pagina.evaluate(() => window.dispatchEvent(new Event("resize")));
await pagina.waitForTimeout(2500);
console.log("  ", JSON.stringify(await misura()));

// E con l'inquadratura, per vedere insieme le due cose.
await pagina.evaluate(() => {
  const THREE = window.THREE, s = window.__veritasScene, c = window.__veritasCamera;
  const r = window.__veritasModelRoot, ctrl = window.__veritasControls;
  const b = new THREE.Box3().setFromObject(r);
  const centro = b.getCenter(new THREE.Vector3()), m = b.getSize(new THREE.Vector3());
  const raggio = Math.max(m.x, m.z) * 0.5;
  const d = (raggio / Math.tan(THREE.MathUtils.degToRad(c.fov) * 0.5)) * 1.1;
  c.position.set(centro.x + d * 0.5, centro.y + d * 0.6, centro.z + d * 0.5);
  c.near = d / 100; c.far = d * 12; c.updateProjectionMatrix(); c.lookAt(centro);
  if (ctrl) { ctrl.target.copy(centro); ctrl.update(); }
  s.fog = new THREE.Fog(0x0b0f17, d * 1.4, d * 4.2);
});
await pagina.waitForTimeout(3000);
await scatta("10-tela-piena");

await browser.close();
