// PROVA DELL'APP IWSDK NELL'EMULATORE (14/10/2026).
// Un Quest 2 simulato (iwer, Meta) in Chrome senza finestra; l'app servita da
// dist/ all'indirizzo vero di GitHub Pages (niente pubblicazione).
// Criterio deciso PRIMA: pagina caricata, plastico 31 pezzi, tasto Enter,
// sessione accesa, spia che conta (campioni > 0), zero errori di pagina.
// I fps qui NON contano (disegno senza scheda video): quelli si misurano nel Quest.
// Tetto: 3 minuti.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(qui, "..", process.env.DIST || "dist");
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/visore/";
const FOTO = path.resolve(qui, "..", "..", "foto");
fs.mkdirSync(FOTO, { recursive: true });
const TIPI = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json", ".jpg": "image/jpeg", ".png": "image/png", ".wasm": "application/wasm", ".txt": "text/plain" };
const t0 = Date.now(), ora = () => String(Math.round((Date.now() - t0) / 1000)).padStart(4) + "s";
setTimeout(() => { console.log(ora() + " TETTO 3 minuti: fermo"); process.exit(2); }, 3 * 60 * 1000);

const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true, args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errori = [], richieste = [];
page.on("pageerror", (e) => errori.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errori.push("console: " + m.text());
  if (m.text().includes("[EIDETICA")) console.log(ora() + " " + m.text()); });
await page.route((u) => u.href.startsWith(BASE), (r) => {
  const rel = decodeURIComponent(new URL(r.request().url()).pathname.slice("/Veritas-spatial-ai/visore/".length)) || "index.html";
  const f = path.join(DIST, rel);
  richieste.push(rel);
  if (f.startsWith(DIST) && fs.existsSync(f) && fs.statSync(f).isFile())
    return r.fulfill({ status: 200, path: f, headers: { "content-type": TIPI[path.extname(f)] || "application/octet-stream" } });
  return r.fulfill({ status: 404, body: "manca " + rel });
});
const iwer = fs.readFileSync(path.join(qui, "..", "node_modules", "iwer", "build", "iwer.min.js"), "utf8");
await page.addInitScript(iwer + `
  ;(function(){ const d = new IWER.XRDevice(IWER.metaQuest2); d.installRuntime({ forceInstall: true }); window.__iwer = d; })();`);

await page.goto(BASE + (process.env.QUERY || ""), { waitUntil: "load" });
await page.waitForFunction(() => window.__EIDETICA_VISORE && window.__EIDETICA_VISORE.pezzi > 0, null, { timeout: 90000 });
const fuori = await page.evaluate(() => ({ ...window.__EIDETICA_VISORE, campioni: undefined }));
console.log(ora() + " caricata: " + JSON.stringify({ pezzi: fuori.pezzi, triangoli: fuori.triangoli, scala: fuori.scala }));
await page.screenshot({ path: path.join(FOTO, "1_fuori.png") });
const tasto = await page.locator("#entra").isVisible();
console.log(ora() + " tasto Enter visibile: " + tasto);
if (tasto) await page.click("#entra");
if (process.env.INTRO) {   // INTRO=1: foto dell'apertura del marchio, appena dentro
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join(FOTO, "2_intro.png") });
  await page.waitForTimeout(10200);
} else await page.waitForTimeout(12000);
const dentro = await page.evaluate(() => { const M = window.__EIDETICA_VISORE;
  return { dentro: M.dentro, campioni: M.campioni.length, ora: M.ora, disegni: M.disegni, tris: M.triangoliDisegnati, ritmo: M.ritmo, posato: M.posato, occhi: M.occhi, piano: M.piano }; });
console.log(ora() + " nel visore simulato: " + JSON.stringify(dentro));
await page.screenshot({ path: path.join(FOTO, "2_dentro" + (process.env.ETICHETTA || "") + ".png") });
// GUARDA="60,-60": gira la testa (gradi, + = sinistra) e fotografa, per vedere la stanza attorno
for (const g of (process.env.GUARDA || "").split(",").filter(Boolean)) {
  await page.evaluate((gradi) => { const a = gradi * Math.PI / 180, b = -0.30;
    const qy = [0, Math.sin(a / 2), 0, Math.cos(a / 2)], qx = [Math.sin(b / 2), 0, 0, Math.cos(b / 2)];
    const q = [qy[3] * qx[0] + qy[0] * qx[3] + qy[1] * qx[2] - qy[2] * qx[1], qy[3] * qx[1] - qy[0] * qx[2] + qy[1] * qx[3] + qy[2] * qx[0],
               qy[3] * qx[2] + qy[0] * qx[1] - qy[1] * qx[0] + qy[2] * qx[3], qy[3] * qx[3] - qy[0] * qx[0] - qy[1] * qx[1] - qy[2] * qx[2]];
    window.__iwer.quaternion.set(q[0], q[1], q[2], q[3]); }, Number(g));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(FOTO, "3_guarda_" + g + ".png") });
  console.log(ora() + " testa girata di " + g + " gradi: foto");
}
if (process.env.PREMI) {   // PREMI=1: il pulsante PASSTHROUGH (dal PC: tasto P), poi foto
  console.log(ora() + " modo di entrata: " + await page.evaluate(() => window.__EIDETICA_VISORE.modo));
  await page.keyboard.press("p"); await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(FOTO, "4_passthrough.png") });
  await page.keyboard.press("p"); await page.waitForTimeout(800);
}
const pesanti = richieste.filter((r) => /assets\//.test(r));
console.log(ora() + " file scaricati: " + richieste.length + " (" + pesanti.map((r) => r.replace("assets/", "")).join(", ") + ")");
console.log(ora() + " errori: " + (errori.length ? errori.slice(0, 8).join(" | ") : "nessuno"));
const ok = fuori.pezzi === 31 && tasto && dentro.dentro && dentro.campioni > 0 && dentro.posato && !errori.length;
console.log(ora() + (ok ? " RIUSCITA" : " NON RIUSCITA"));
await browser.close();
process.exit(ok ? 0 : 1);
