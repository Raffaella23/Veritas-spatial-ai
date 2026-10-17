// PROVA DELLA v20 (16/10/2026): corpi veri, velocita' vera + SPEED, zoom della rotellina, scegliere
// una persona, i suoi occhi in una finestra, entrare nel modello e uscire. App da dist/, Chrome senza
// finestra; la parte del visore col Quest 2 simulato (iwer), il resto come anteprima sul PC, dove i
// clic del mouse arrivano ai pannelli come il pizzico della mano.
// Criterio (deciso PRIMA):
//   1. corpi veri caricati, >= 10 persone in vista;
//   2. velocita' vera: il tempo del cammino avanza 0,8-1,2 s per secondo; con SPEED (tasto V) 1,6-2,4;
//      due volte ancora V e si torna al passo vero;
//   3. la rotellina avvicina: dopo 12 scatti la telecamera e' almeno 5 volte piu' vicina al plastico;
//   4. un clic su una riga dell'elenco PEOPLE sceglie quella persona (cartellino visibile, linea dorata);
//   5. un clic su WINDOW apre la finestra e i suoi occhi si ridisegnano (>= 5 volte in 2 s);
//   6. un clic su STEP INSIDE: dentro, grandezza vera (un metro della pagina = un metro), passo vero,
//      il modello si muove con lui; Esc: fuori, il plastico torna dov'era (< 1 mm);
//   7. zero errori di pagina.
// Tetto: 5 minuti.   node strumenti/prova_persona.mjs   (FOTO=<cartella>)
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
setTimeout(() => { console.log(ora() + " TETTO 5 minuti: fermo"); process.exit(2); }, 5 * 60 * 1000);
const esiti = [];
const esito = (nome, ok, dettaglio) => { esiti.push(ok); console.log(ora() + (ok ? " OK  " : " NO  ") + nome + " — " + dettaglio); };

const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true, args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
async function apri(query, visore) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errori = [];
  page.on("pageerror", (e) => errori.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errori.push("console: " + m.text());
    if (/corpi|persona|dentro|fuori|velocita|occhi|scelta/.test(m.text())) console.log(ora() + " " + m.text().slice(0, 200)); });
  await page.route((u) => u.href.startsWith(BASE), (r) => {
    const rel = decodeURIComponent(new URL(r.request().url()).pathname.slice("/Veritas-spatial-ai/visore/".length)) || "index.html";
    const f = path.join(DIST, rel);
    if (f.startsWith(DIST) && fs.existsSync(f) && fs.statSync(f).isFile())
      return r.fulfill({ status: 200, path: f, headers: { "content-type": TIPI[path.extname(f)] || "application/octet-stream" } });
    return r.fulfill({ status: 404, body: "manca " + rel });
  });
  if (visore) {
    const iwer = fs.readFileSync(path.join(qui, "..", "node_modules", "iwer", "build", "iwer.min.js"), "utf8");
    await page.addInitScript(iwer + `;(function(){ const d = new IWER.XRDevice(IWER.metaQuest2); d.installRuntime({ forceInstall: true });
      window.__iwer = d; d.position.set(0, 1.2, 0); d.primaryInputMode = "hand";
      d.hands.left.position.set(-0.2, 0.75, -0.25); d.hands.right.position.set(0.2, 0.75, -0.25); })();`);
  }
  await page.goto(BASE + query, { waitUntil: "load" });
  await page.waitForFunction(() => window.__EIDETICA_VISORE && window.__EIDETICA_VISORE.pezzi > 0, null, { timeout: 90000 });
  if (visore) { await page.click("#entra"); await page.waitForFunction(() => window.__EIDETICA_VISORE.posato, null, { timeout: 30000 }); }
  return { page, errori };
}
const foto = async (page, nome) => { await page.screenshot({ path: path.join(FOTO, nome + ".png") }); console.log(ora() + " foto " + nome); };
const L = (page) => page.evaluate(() => { const s = window.__EIDETICA_VISORE.lettura; return { corpi: s.corpi, inVista: s.inVista, ts: s.ts, velocita: s.velocita }; });
const P = (page) => page.evaluate(() => { const s = window.__EIDETICA_PERSONA.stato; return { scelta: s.scelta, finestra: s.finestra, dentro: s.dentro, occhi: s.occhiFatti, acceso: s.acceso }; });
// il tempo del cammino che avanza in un secondo e mezzo vero
async function passo(page) {
  const a = await L(page), t1 = Date.now(); await page.waitForTimeout(1500); const b = await L(page);
  let d = b.ts - a.ts; if (d < 0) d += 399.5;
  return d / ((Date.now() - t1) / 1000);
}
// la telecamera guarda un pannello e si clicca su un punto della sua tela (px, py)
async function cliccaPannello(page, nome, px, py) {
  const xy = await page.evaluate(([nome, px, py]) => {
    const w = window.__EIDETICA_MONDO, cam = w.camera;
    const m = w.scene.getObjectByName(nome); m.updateMatrixWorld(true);
    const t = m.material.map.image, g = m.geometry.parameters;
    const c = new w.camera.position.constructor(); m.getWorldPosition(c);
    cam.lookAt(c); cam.updateMatrixWorld(true);
    const v = new c.constructor((px / t.width - 0.5) * g.width, (0.5 - py / t.height) * g.height, 0).applyMatrix4(m.matrixWorld).project(cam);
    return [(v.x + 1) / 2 * innerWidth, (1 - v.y) / 2 * innerHeight];
  }, [nome, px, py]);
  await page.waitForTimeout(300);
  await page.mouse.move(xy[0], xy[1]); await page.waitForTimeout(150);
  await page.mouse.down(); await page.waitForTimeout(80); await page.mouse.up();
  await page.waitForTimeout(500);
}

// 1-2. nel visore simulato: corpi veri, il passo vero, SPEED
{
  const { page, errori } = await apri("?salta=75", true);
  await page.waitForTimeout(5000);
  const a = await L(page);
  esito("corpi veri", a.corpi && a.inVista >= 10, "corpi " + a.corpi + " · persone in vista " + a.inVista);
  const v1 = await passo(page);
  await page.keyboard.press("v"); const v2 = await passo(page);
  await page.keyboard.press("v"); await page.keyboard.press("v"); const v3 = await passo(page);
  esito("velocita' vera e SPEED", v1 > 0.8 && v1 < 1.2 && v2 > 1.6 && v2 < 2.4 && v3 > 0.8 && v3 < 1.2,
    "x1: " + v1.toFixed(2) + " s/s · dopo V: " + v2.toFixed(2) + " · dopo altre due V: " + v3.toFixed(2));
  // le foto dalla sedia: il plastico coi corpi e le scie, e il pulsante SPEED sul piano
  await page.evaluate(() => { const b = -48 * Math.PI / 180; window.__iwer.quaternion.set(Math.sin(b / 2), 0, 0, Math.cos(b / 2)); });
  await page.waitForTimeout(1500); await foto(page, "v20_1_plastico_corpi_scie");
  await page.evaluate(() => { const a = -38 * Math.PI / 180, b = -45 * Math.PI / 180;
    const qy = [0, Math.sin(a / 2), 0, Math.cos(a / 2)], qx = [Math.sin(b / 2), 0, 0, Math.cos(b / 2)];
    window.__iwer.quaternion.set(qy[3] * qx[0], qy[3] * qx[1] + qy[1] * qx[3], -qy[1] * qx[0], qy[3] * qx[3]); });
  await page.waitForTimeout(1500); await foto(page, "v20_2_pulsanti_e_elenco");
  esito("errori di pagina (visore)", !errori.length, errori.slice(0, 4).join(" | ") || "nessuno");
  await page.close();
}
// 3-7. anteprima sul PC: rotellina, scelta, finestra, dentro
{
  const { page, errori } = await apri("?salta=90", false);
  await page.waitForTimeout(5000);
  // 3. la rotellina sul corpo di una persona che cammina
  const mira = await page.evaluate(() => {
    const w = window.__EIDETICA_MONDO, cam = w.camera, P = window.__EIDETICA_PERSONA;
    const corpi = w.scene.getObjectByName("eidetica-corpi"), metri = corpi.parent;
    const s = window.__EIDETICA_VISORE.lettura;
    // la persona che cammina piu' vicina al centro dell'inquadratura
    let best = null;
    for (let i = 0; i < 28; i++) {
      const m = new corpi.matrixWorld.constructor(); corpi.getMatrixAt(i, m);
      const p = new cam.position.constructor().setFromMatrixPosition(m); if (p.lengthSq() === 0) continue;
      p.y += 0.9; metri.localToWorld(p); const v = p.clone().project(cam);
      if (Math.abs(v.x) < 0.8 && Math.abs(v.y) < 0.8 && (!best || Math.hypot(v.x, v.y) < best.d)) best = { d: Math.hypot(v.x, v.y), x: v.x, y: v.y, i };
    }
    return best && [(best.x + 1) / 2 * innerWidth, (1 - best.y) / 2 * innerHeight, best.i];
  });
  const distanze = [];
  if (mira) {
    await page.mouse.move(mira[0], mira[1]);
    for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(120); distanze.push(await page.evaluate(() => window.__EIDETICA_VISORE.rotellina)); }
  }
  await page.mouse.wheel(0, -1); await page.waitForTimeout(150);
  const fine = await page.evaluate(() => window.__EIDETICA_VISORE.rotellina);
  await page.waitForTimeout(800); await foto(page, "v20_3_rotellina_vicino_ai_corpi");
  const d0 = distanze[0];
  esito("la rotellina avvicina", !!mira && d0 && fine && fine < d0 / 5, "persona " + (mira ? mira[2] + 1 : "-") + " · dal punto mirato " + (d0 || 0).toFixed(3) + " -> " + (fine || 0).toFixed(3) + " m");
  for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(60); }
  // 4. clic sulla riga della terza persona presente
  const riga = await page.evaluate(() => window.__EIDETICA_PERSONA.stato.acceso);
  const scelta = Number(process.env.SCELTA) || 0;   // la riga dell elenco (di serie la prima: «01»)
  await cliccaPannello(page, "eidetica-elenco-persone", 64 + 120, 200 - 10 + scelta * 42);
  const s1 = await P(page);
  esito("clic sull'elenco: la persona scelta", riga && s1.scelta === scelta, "elenco acceso " + riga + " · scelta " + s1.scelta);
  await foto(page, "v20_4_elenco_e_cartellino");
  // 5. WINDOW
  await cliccaPannello(page, "eidetica-scheda-persona", 64 + 200, 506 + 38);
  const f1 = await P(page); await page.waitForTimeout(2000); const f2 = await P(page);
  esito("la finestra dei suoi occhi", f2.finestra && f2.occhi - f1.occhi >= 5, "aperta " + f2.finestra + " · ridisegnata " + (f2.occhi - f1.occhi) + " volte in 2 s");
  await page.evaluate(() => { const w = window.__EIDETICA_MONDO, m = w.scene.getObjectByName("eidetica-finestra-occhi"), c = m.getWorldPosition(new w.camera.position.constructor()); w.camera.lookAt(c); });
  await page.waitForTimeout(1200); await foto(page, "v20_5_finestra_dei_suoi_occhi");
  // 6. STEP INSIDE
  const prima = await page.evaluate(() => window.__EIDETICA_PLASTICO.position.toArray().concat(window.__EIDETICA_PLASTICO.scale.x));
  await cliccaPannello(page, "eidetica-scheda-persona", 488 + 148, 506 + 38);
  const d1 = await page.evaluate(() => { const p = window.__EIDETICA_PLASTICO, w = window.__EIDETICA_MONDO;
    const m = w.scene.getObjectByName("eidetica-corpi").parent; m.updateMatrixWorld(true); const s = new p.position.constructor(); m.getWorldScale(s);
    return { dentro: window.__EIDETICA_PERSONA.stato.dentro, metro: s.x, pos: p.position.toArray(), vel: window.__EIDETICA_VISORE.lettura.velocita }; });
  await page.evaluate(() => { const w = window.__EIDETICA_MONDO; w.camera.quaternion.set(0, 0, 0, 1); w.camera.rotation.x = -0.12; });
  await page.waitForTimeout(3000);
  const d2 = await page.evaluate(() => window.__EIDETICA_PLASTICO.position.toArray());
  await foto(page, "v20_6_dentro_con_i_suoi_occhi");
  await page.waitForTimeout(2500); await foto(page, "v20_7_dentro_dopo");
  const mosso = Math.hypot(d2[0] - d1.pos[0], d2[1] - d1.pos[1], d2[2] - d1.pos[2]);
  await page.keyboard.press("Escape"); await page.waitForTimeout(600);
  const fuori = await page.evaluate(() => ({ dentro: window.__EIDETICA_PERSONA.stato.dentro, p: window.__EIDETICA_PLASTICO.position.toArray().concat(window.__EIDETICA_PLASTICO.scale.x) }));
  const torna = Math.hypot(fuori.p[0] - prima[0], fuori.p[1] - prima[1], fuori.p[2] - prima[2]) + Math.abs(fuori.p[3] - prima[3]);
  esito("dentro il modello e fuori", d1.dentro && Math.abs(d1.metro - 1) < 0.01 && d1.vel === 1 && mosso > 0.2 && !fuori.dentro && torna < 0.001,
    "dentro " + d1.dentro + " · un metro = " + d1.metro.toFixed(3) + " m · velocita' x" + d1.vel + " · il modello si e' mosso di " + mosso.toFixed(2) + " m in 3 s · fuori " + !fuori.dentro + " · ritorno " + (torna * 1000).toFixed(2) + " mm");
  esito("errori di pagina (PC)", !errori.length, errori.slice(0, 4).join(" | ") || "nessuno");
  await page.close();
}
const ok = esiti.every(Boolean);
console.log(ora() + (ok ? " RIUSCITA" : " NON RIUSCITA") + " (" + esiti.filter(Boolean).length + "/" + esiti.length + ")");
await browser.close();
process.exit(ok ? 0 : 1);
