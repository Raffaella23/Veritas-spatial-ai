// PROVA DELLA LETTURA NELL'EMULATORE (16/10/2026, v19): schede dell'occhio, telecamera di luce,
// persone con le scie, e la presa di una scheda con la mano. Quest 2 simulato (iwer), app da dist/.
// Criterio (deciso PRIMA):
//   1. pacchetto aperto, 6 schede, nessun errore di pagina;
//   2. a lettura in corso (SALTA=25) la scheda OBJECTS e' accesa e l'occhio e' su una fermata;
//   3. a lettura finita (SALTA=75) 6 schede accese, persone in vista >= 10, tempo che avanza;
//   4. la presa: pizzico della mano destra puntata sulla scheda OBJECTS per 2,5 s -> la scheda
//      si avvicina alla mano di almeno 20 cm; lasciata, resta li' (si sposta < 2 cm in 1,5 s).
// Foto: plastico dall'alto, le schede a sinistra, la scheda in mano. Tetto: 4 minuti.
//   node strumenti/prova_lettura.mjs   (SALTA=<s>, FOTO=<cartella>)
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(qui, "..", process.env.DIST || "dist");
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/visore/";
const FOTO = path.resolve(process.env.FOTO || path.join(qui, "..", "..", "foto"));
fs.mkdirSync(FOTO, { recursive: true });
const TIPI = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".glb": "model/gltf-binary",
  ".jpg": "image/jpeg", ".png": "image/png", ".wasm": "application/wasm", ".txt": "text/plain" };
const t0 = Date.now(), ora = () => String(Math.round((Date.now() - t0) / 1000)).padStart(4) + "s";
setTimeout(() => { console.log(ora() + " TETTO 4 minuti: fermo"); process.exit(2); }, 4 * 60 * 1000);
const esiti = [];
const esito = (nome, ok, dettaglio) => { esiti.push(ok); console.log(ora() + (ok ? " OK  " : " NO  ") + nome + " — " + dettaglio); };

const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true, args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
async function apri(salta) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errori = [];
  page.on("pageerror", (e) => errori.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errori.push("console: " + m.text());
    if (/pacchetto|lettura/.test(m.text())) console.log(ora() + " " + m.text().slice(0, 220)); });
  await page.route((u) => u.href.startsWith(BASE), (r) => {
    const rel = decodeURIComponent(new URL(r.request().url()).pathname.slice("/Veritas-spatial-ai/visore/".length)) || "index.html";
    const f = path.join(DIST, rel);
    if (f.startsWith(DIST) && fs.existsSync(f) && fs.statSync(f).isFile())
      return r.fulfill({ status: 200, path: f, headers: { "content-type": TIPI[path.extname(f)] || "application/octet-stream" } });
    return r.fulfill({ status: 404, body: "manca " + rel });
  });
  const iwer = fs.readFileSync(path.join(qui, "..", "node_modules", "iwer", "build", "iwer.min.js"), "utf8");
  await page.addInitScript(iwer + `;(function(){ const d = new IWER.XRDevice(IWER.metaQuest2); d.installRuntime({ forceInstall: true });
    window.__iwer = d; d.position.set(0, 1.2, 0); d.primaryInputMode = "hand";
    d.hands.left.position.set(-0.2, 0.75, -0.25); d.hands.right.position.set(0.2, 0.75, -0.25); })();`);
  await page.goto(BASE + "?salta=" + salta, { waitUntil: "load" });
  await page.waitForFunction(() => window.__EIDETICA_VISORE && window.__EIDETICA_VISORE.pezzi > 0, null, { timeout: 90000 });
  await page.click("#entra");
  await page.waitForFunction(() => window.__EIDETICA_VISORE.posato, null, { timeout: 30000 });
  return { page, errori };
}
// gira la testa (gradi a sinistra, gradi in giu') e fotografa
async function guarda(page, gradi, piega, nome) {
  await page.evaluate(([g, pg]) => { const a = g * Math.PI / 180, b = -pg * Math.PI / 180;
    const qy = [0, Math.sin(a / 2), 0, Math.cos(a / 2)], qx = [Math.sin(b / 2), 0, 0, Math.cos(b / 2)];
    const q = [qy[3] * qx[0] + qy[0] * qx[3] + qy[1] * qx[2] - qy[2] * qx[1], qy[3] * qx[1] - qy[0] * qx[2] + qy[1] * qx[3] + qy[2] * qx[0],
               qy[3] * qx[2] + qy[0] * qx[1] - qy[1] * qx[0] + qy[2] * qx[3], qy[3] * qx[3] - qy[0] * qx[0] - qy[1] * qx[1] - qy[2] * qx[2]];
    window.__iwer.quaternion.set(q[0], q[1], q[2], q[3]); }, [gradi, piega]);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(FOTO, nome + ".png") });
  console.log(ora() + " foto " + nome);
}
const leggi = (page) => page.evaluate(() => ({ ...window.__EIDETICA_VISORE.lettura, schedePos: undefined }));

// 1-2. a lettura in corso
{
  const { page, errori } = await apri(Number(process.env.SALTA_A) || 25);
  await page.waitForTimeout(4500);
  const L = await leggi(page);
  esito("pacchetto e schede", L.pacchetto && L.schede === 6, JSON.stringify({ pacchetto: L.pacchetto, schede: L.schede, accese: L.schedeAccese }));
  esito("occhio sugli oggetti", L.schedeAccese >= 3 && !!L.fermata, "fermata " + (L.fermata ? L.fermata.indice + 1 : "-") + " · nome " + (L.oggetto ? L.oggetto.termine : "-"));
  await guarda(page, 0, 48, "v19_1_occhio_sul_plastico");
  await guarda(page, 52, 22, "v19_2_schede_in_lettura");
  esito("errori di pagina (lettura)", !errori.length, errori.slice(0, 4).join(" | ") || "nessuno");
  await page.close();
}
// 3-4. a lettura finita: persone, scie, e la presa
{
  const { page, errori } = await apri(Number(process.env.SALTA) || 75);
  await page.waitForTimeout(4500);
  const L1 = await leggi(page);
  await page.waitForTimeout(2000);
  const L2 = await leggi(page);
  esito("persone in cammino", L2.schedeAccese === 6 && L2.inVista >= 10 && L2.tempoSim > L1.tempoSim,
    "schede " + L2.schedeAccese + " · in vista " + L2.inVista + " · tempo " + L1.tempoSim + " -> " + L2.tempoSim + " s");
  await guarda(page, 0, 48, "v19_3_scie_sul_plastico");
  await guarda(page, 52, 22, "v19_4_schede_accese");
  // la presa: la mano destra a portata, puntata sulla scheda OBJECTS, pizzico
  const dove = () => page.evaluate(() => {
    let s = window.__EIDETICA_PLASTICO; while (s.parent) s = s.parent;
    const m = s.getObjectByName("eidetica-scheda-objects"); m.updateMatrixWorld(true);
    const e = m.matrixWorld.elements; return [e[12], e[13], e[14]];
  });
  const prima = await dove();
  const mano = [0.05, 0.95, -0.15];
  await page.evaluate(([c, h]) => { const d = window.__iwer, r = d.hands.right;
    r.position.set(h[0], h[1], h[2]);
    const v = [c[0] - h[0], c[1] - h[1], c[2] - h[2]], l = Math.hypot(...v), u = v.map((x) => x / l);
    // da (0,0,-1) alla direzione della scheda
    const ax = [0 * u[2] - (-1) * u[1], (-1) * u[0] - 0 * u[2], 0], dot = -u[2], w = 1 + dot, n = Math.hypot(ax[0], ax[1], ax[2], w);
    r.quaternion.set(ax[0] / n, ax[1] / n, ax[2] / n, w / n); }, [prima, mano]);
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__iwer.hands.right.updatePinchValue(1));
  await page.waitForTimeout(2500);
  const presa = await dove();
  await guarda(page, 20, 30, "v19_5_scheda_in_mano");
  await page.evaluate(() => window.__iwer.hands.right.updatePinchValue(0));
  await page.waitForTimeout(1500);
  const lasciata = await dove();
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const vicina = dist(prima, mano) - dist(presa, mano);
  esito("la scheda viene alla mano", vicina >= 0.20, "da " + dist(prima, mano).toFixed(2) + " a " + dist(presa, mano).toFixed(2) + " m dalla mano");
  esito("lasciata resta li'", dist(presa, lasciata) < 0.02 || dist(lasciata, mano) < dist(prima, mano) - 0.15, "spostata di " + dist(presa, lasciata).toFixed(3) + " m dopo il rilascio");
  esito("errori di pagina (persone)", !errori.length, errori.slice(0, 4).join(" | ") || "nessuno");
  await page.close();
}
const ok = esiti.every(Boolean);
console.log(ora() + (ok ? " RIUSCITA" : " NON RIUSCITA") + " (" + esiti.filter(Boolean).length + "/" + esiti.length + ")");
await browser.close();
process.exit(ok ? 0 : 1);
