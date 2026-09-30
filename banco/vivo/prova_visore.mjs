// FASE C (30/09): il plastico in scala nel visore, sulla STESSA scena.
// Il visore e' un Quest 3 simulato (iwer, Meta) dentro Chrome senza finestra:
// si preme il pulsante vero, si misura dentro, si esce, si confronta.
//
// Criterio deciso PRIMA di lanciarla:
//   pulsante visibile in Esperienza accanto al selettore;
//   nel visore: sessione accesa, 2 occhi, fotogrammi serviti al ritmo del
//   visore, argilla anche li', agenti che si muovono, testa a
//   (1,60 - 0,75) m x scala sopra il piano del plastico (±5%);
//   all'uscita: telecamera identica (0 cm, 0°), comandi di nuovo attivi,
//   requestAnimationFrame della finestra restituito, scena che continua.
//   Tetto: 8 minuti.
//
//   DAL_WORKSPACE=1 RADICE=<clone> node banco/vivo/prova_visore.mjs
//   VERO=1 : Chrome con la finestra, SENZA simulatore (per il Quest vero via
//            Link/Air Link): prepara la scena in Esperienza e resta aperto.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(process.env.RADICE || path.join(qui, "..", ".."));
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const DAL_WS = process.env.DAL_WORKSPACE === "1";
const VERO = process.env.VERO === "1";
const CARTELLA = path.resolve(process.env.CARTELLA || path.join(qui, "misure_visore"));
fs.mkdirSync(CARTELLA, { recursive: true });
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
const TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
               ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css",
               ".glb": "model/gltf-binary", ".png": "image/png", ".svg": "image/svg+xml" };
const t0 = Date.now();
const ora = () => String(Math.round((Date.now() - t0) / 1000)).padStart(4) + "s";
const aspetta = (ms) => new Promise((r) => setTimeout(r, ms));
setTimeout(() => { if (!VERO) { console.log(ora() + "  TETTO 8 minuti: fermo"); process.exit(2); } }, 8 * 60 * 1000);

const ctx = await chromium.launchPersistentContext(path.join(qui, process.env.PROFILO || "profilo_visore"), {
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: !VERO, viewport: VERO ? null : { width: 1600, height: 900 },
  // VERO: la NVIDIA. Misurato il 30/09: con la scheda Intel il Quest riceveva ~2 fotogrammi al secondo
  args: VERO ? ["--start-maximized", "--force_high_performance_gpu"] : ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
await ctx.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js", (r) =>
  r.fulfill({ status: 200, path: path.join(WS, "banco", "finti", "supabase_finto.js"),
              headers: { "content-type": "text/javascript" } }));
if (DAL_WS) {
  await ctx.route((url) => url.href.startsWith(BASE), (r) => {
    const u = new URL(r.request().url());
    const rel = decodeURIComponent(u.pathname.slice("/Veritas-spatial-ai/".length)) || "index.html";
    const f = path.join(WS, rel);
    if (f.startsWith(WS) && fs.existsSync(f) && fs.statSync(f).isFile())
      return r.fulfill({ status: 200, path: f, headers: {
        "content-type": TIPI[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" } });
    return r.continue();
  });
}
if (!VERO) {
  // ⚠️ iwer chiede il SUO fotogramma a window.requestAnimationFrame, che il
  // modulo del visore mette in fila finche' e' dentro: il simulatore si
  // bloccherebbe da solo. Nel visore vero il fotogramma della sessione e'
  // nativo. Qui iwer prende il requestAnimationFrame originale, e basta.
  const iwer = fs.readFileSync(path.join(WS, "node_modules", "iwer", "build", "iwer.min.js"), "utf8")
    .replace("globalThis.requestAnimationFrame(this[ie].onDeviceFrame)", "window.__rafNativo(this[ie].onDeviceFrame)");
  if (!iwer.includes("__rafNativo")) throw new Error("iwer cambiato: il punto del fotogramma non c'e' piu'");
  await ctx.addInitScript("window.__rafNativo = window.requestAnimationFrame.bind(window);\n" + iwer + `
    ;(function(){ if (window.top !== window) return;
      const d = new IWER.XRDevice(IWER.metaQuest3);
      d.installRuntime({ forceInstall: true });
      d.position.set(0, 1.6, 0);
      window.__provaXR = d; })();`);
}
const p = ctx.pages()[0] || await ctx.newPage();
p.on("console", (m) => { const t = m.text();
  if (/EIDETICA visore|PAGEERROR|regia\] finita|\[VERITAS\] (avvio|Traiettoria)/.test(t)) console.log(ora() + "  " + t.slice(0, 230)); });
p.on("pageerror", (e) => console.log(ora() + "  PAGEERROR " + String(e).slice(0, 200)));

await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 120000 });
for (let i = 0; i < 20; i++) {
  if (await p.evaluate(() => window.crossOriginIsolated).catch(() => null)) break;
  await aspetta(500);
}
await p.waitForLoadState("load").catch(() => {});
console.log(ora() + "  costruzione " + await p.evaluate(() => window.__EIDETICA_COSTRUZIONE) + (DAL_WS ? " (workspace)" : " (pubblicata)")
  + "  modulo visore: " + await p.evaluate(() => !!window.eideticaVisore));

await p.waitForSelector("#v-pick-file", { timeout: 60000 });
const [scelta] = await Promise.all([p.waitForEvent("filechooser", { timeout: 30000 }), p.click("#v-pick-file")]);
await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "visore").catch(() => {});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).then(() => p.click("#vs-start-btn")).catch(() => {});

const attendi = async (cosa, fn, ms) => { const f = Date.now() + ms;
  while (Date.now() < f) { if (await p.evaluate(fn).catch(() => false)) return true; await aspetta(1000); }
  console.log(ora() + "  NON ARRIVATO: " + cosa); return false; };
await attendi("velo aperto", () => !!(window.__veritasApertura && window.__veritasApertura.stato && window.__veritasApertura.stato()), 180000);
await aspetta(12000);
await p.evaluate(() => window.__veritasApertura && window.__veritasApertura.chiudi("prova")).catch(() => {});
await attendi("scena e modello", () => !!(window.__veritasScene && window.__veritasModelRoot), 120000);
await attendi("bottone Avvia", () => !!document.getElementById("veritas-avvia"), 60000);
await aspetta(4000);
let inquadrato = false;
p.on("console", (m) => { if (/inquadro gli agenti/.test(m.text())) inquadrato = true; });
await p.evaluate(() => { const b = document.getElementById("veritas-avvia"); if (b) b.click(); });
await p.evaluate(() => window.eideticaModo && window.eideticaModo.imposta("esperienza"));
console.log(ora() + "  Avvia premuto, Esperienza");
// il plastico si misura DOPO l'inquadratura degli agenti (Fase A): e' lei che muove la telecamera
{ const fine = Date.now() + 240000; while (Date.now() < fine && !inquadrato) await aspetta(2000); }
console.log(ora() + "  inquadrato: " + inquadrato);
await aspetta(4000);

if (VERO) {
  console.log(ora() + "  PRONTO. Metti il visore (Link/Air Link) e premi «Entra nel visore». La finestra resta aperta.");
  await new Promise(() => {});
}

// Le posizioni degli agenti, per dire se si muovono
const AGENTI = () => { const g = window.__veritasPassengerGroups, o = {};
  if (g) for (const [id, x] of g) if (x.group.visible) o[id] = [x.group.position.x, x.group.position.z];
  return o; };
const mosse = (a, b) => { let n = 0, max = 0;
  for (const id in a) if (b[id]) { const d = Math.hypot(b[id][0] - a[id][0], b[id][1] - a[id][1]); if (d > 0.3) n++; max = Math.max(max, d); }
  return { agenti: Object.keys(a).length, mossiOltre30cm: n, massimo_m: +max.toFixed(2) }; };

// 1. IL PLASTICO PRIMA
const prima = await p.evaluate(() => { const c = window.__veritasCamera, t = window.__veritasControls.target;
  return { pos: c.position.toArray(), quat: c.quaternion.toArray(), fov: c.fov, target: t.toArray(),
           comandi: window.__veritasControls.enabled }; });
const pulsante = await p.evaluate(() => { const b = document.getElementById("eidetica-visore"), m = document.getElementById("eidetica-modo");
  const rb = b && b.getBoundingClientRect(), rm = m && m.getBoundingClientRect();
  return { visibile: !!b && getComputedStyle(b).display !== "none", testo: b && b.textContent,
           stato: window.eideticaVisore.stato(),
           pulsante: rb && [rb.left, rb.top, rb.width, rb.height].map(Math.round),
           selettore: rm && [rm.left, rm.top, rm.width, rm.height].map(Math.round) }; });
console.log(ora() + "  PULSANTE " + JSON.stringify(pulsante));
await p.screenshot({ path: path.join(CARTELLA, "1_plastico_prima.png") });

// 2. DENTRO: clic vero sul pulsante (serve il gesto dell'utente)
await p.evaluate(() => {
  // l'argilla si riconosce dal nome dei materiali del modello MENTRE si
  // disegna: onBeforeRender della scena arriva dopo che la carta li ha messi
  window.__provaArgilla = { visti: 0, argilla: 0, pezzi: 0, pezziArgilla: 0 };
  const S = window.__veritasScene, vecchio = S.onBeforeRender;
  S.onBeforeRender = function (r) {
    if (r.xr.isPresenting && window.__provaArgilla.visti < 30) {
      const A = window.__provaArgilla; A.visti++;
      let n = 0, k = 0;
      window.__veritasModelRoot.traverse((o) => { if (!o.isMesh) return; n++;
        if ([].concat(o.material).every((m) => /eidetica-argilla/.test(m && m.name || ""))) k++; });
      A.pezzi = n; A.pezziArgilla = k; if (k > 0) A.argilla++;
    }
    return vecchio && vecchio.apply(this, arguments); };
});
await p.click("#eidetica-visore");
await attendi("dentro il visore", () => window.eideticaVisore.stato().dentro && window.eideticaVisore.stato().fotogrammi > 20, 60000);
const agA = await p.evaluate(AGENTI);
const f0 = await p.evaluate(() => ({ n: window.eideticaVisore.stato().fotogrammi, t: performance.now() }));
await aspetta(4000);
const agB = await p.evaluate(AGENTI);
const dentro = await p.evaluate((f0) => {
  const R = window.__veritasRenderer, T = window.THREE, cXR = R.xr.getCamera(), st = window.eideticaVisore.stato();
  const testa = new T.Vector3().setFromMatrixPosition(window.__veritasCamera.matrixWorld);
  const box = new T.Box3().setFromObject(window.__veritasModelRoot), centro = box.getCenter(new T.Vector3());
  return { presenta: R.xr.isPresenting, occhi: cXR.cameras.length, stato: st,
           fotogrammiAlSecondo: +((st.fotogrammi - f0.n) / ((performance.now() - f0.t) / 1000)).toFixed(1),
           ritmoPreso: !String(window.requestAnimationFrame).includes("native code"),
           testaSopraPiano_m: +((testa.y - box.min.y) / st.scala).toFixed(3),
           testaDalCentro_m: +(Math.hypot(testa.x - centro.x, testa.z - centro.z) / st.scala).toFixed(3),
           argilla: window.__provaArgilla,
           schermoVisore: R.__eideticaSchermoVisore === null ? "null" : typeof R.__eideticaSchermoVisore };
}, f0);
dentro.agenti = mosse(agA, agB);
console.log(ora() + "  DENTRO " + JSON.stringify(dentro));
// la fotografia di cio' che vede il visore: si legge il foglio del visore
// alla fine di un disegno (la pagina non lo mostra: il simulatore disegna fuori)
const diagnosi = await p.evaluate(() => new Promise((ok) => {
  const S = window.__veritasScene, T = window.THREE, vecchio = S.onBeforeRender;
  S.onBeforeRender = function (r, s, cam) {
    if (vecchio) vecchio.apply(this, arguments);
    if (!r.xr.isPresenting) return;
    S.onBeforeRender = vecchio;
    const v = (x) => x.toArray().map((n) => +n.toFixed(3));
    const fr = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let n = 0, dentro = 0;
    window.__veritasModelRoot.traverse((o) => { if (!o.isMesh) return; n++; if (fr.intersectsObject(o)) dentro++; });
    const occhi = (cam.cameras || []).map((c) => ({ pos: v(new T.Vector3().setFromMatrixPosition(c.matrixWorld)),
      avanti: v(new T.Vector3(0, 0, -1).transformDirection(c.matrixWorld)), vp: c.viewport && v(c.viewport) }));
    const rs = r.xr.getSession().renderState;
    ok({ tipo: cam.type, isArray: !!cam.isArrayCamera, pos: v(new T.Vector3().setFromMatrixPosition(cam.matrixWorld)),
         avanti: v(new T.Vector3(0, 0, -1).transformDirection(cam.matrixWorld)), occhi, pezzi: n, nelCampo: dentro,
         near: rs.depthNear, far: rs.depthFar, baseLayer: !!rs.baseLayer, layers: rs.layers ? rs.layers.length : null,
         proiezione: cam.projectionMatrix.elements.map((x) => +x.toFixed(3)) });
  };
}));
console.log(ora() + "  DIAGNOSI " + JSON.stringify(diagnosi));
// si guarda il tavolo: testa inclinata di 40° in giu', come chi sta davanti a un plastico
await p.evaluate(() => window.__provaXR.quaternion.set(-Math.sin(20 * Math.PI / 180), 0, 0, Math.cos(20 * Math.PI / 180)));
await aspetta(1500);
const occhiata = await p.evaluate(() => new Promise((ok) => {
  const S = window.__veritasScene, R = window.__veritasRenderer, vecchio = S.onAfterRender;
  S.onAfterRender = function (r) {
    if (vecchio) vecchio.apply(this, arguments);
    if (!r.xr.isPresenting) return;
    S.onAfterRender = vecchio;
    const gl = r.getContext(), L = r.xr.getSession().renderState.baseLayer;
    const w = L ? L.framebufferWidth : gl.drawingBufferWidth, h = L ? L.framebufferHeight : gl.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d"), img = x.createImageData(w, h);
    for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    x.putImageData(img, 0, 0);
    let acceso = 0; for (let i = 0; i < px.length; i += 400) if (px[i] + px[i + 1] + px[i + 2] > 90) acceso++;
    ok({ w, h, accesi: +(acceso / (px.length / 400)).toFixed(3), png: c.toDataURL("image/png") });
  };
}));
fs.writeFileSync(path.join(CARTELLA, "2_negli_occhi_del_visore.png"), Buffer.from(occhiata.png.split(",")[1], "base64"));
console.log(ora() + "  FOTO DEL VISORE " + occhiata.w + " x " + occhiata.h + ", punti accesi " + occhiata.accesi);

// 3. FUORI: di nuovo il pulsante
await p.click("#eidetica-visore");
await attendi("fuori dal visore", () => !window.eideticaVisore.stato().dentro && !window.__veritasRenderer.xr.isPresenting, 30000);
await aspetta(1500);
const agC = await p.evaluate(AGENTI);
await aspetta(3000);
const agD = await p.evaluate(AGENTI);
const dopo = await p.evaluate((P) => { const c = window.__veritasCamera, t = window.__veritasControls.target, T = window.THREE;
  const q0 = new T.Quaternion().fromArray(P.quat);
  return { distanza_cm: +(c.position.distanceTo(new T.Vector3().fromArray(P.pos)) * 100).toFixed(2),
           angolo_gradi: +(c.quaternion.angleTo(q0) * 180 / Math.PI).toFixed(3),
           fov: c.fov, fovPrima: P.fov, genitore: c.parent ? c.parent.name || c.parent.type : null,
           target_cm: +(t.distanceTo(new T.Vector3().fromArray(P.target)) * 100).toFixed(2),
           comandi: window.__veritasControls.enabled, comandiPrima: P.comandi,
           ritmoRestituito: String(window.requestAnimationFrame).includes("native code"),
           xrAcceso: window.__veritasRenderer.xr.enabled,
           pulsante: document.getElementById("eidetica-visore").textContent }; }, prima);
dopo.agenti = mosse(agC, agD);
console.log(ora() + "  FUORI " + JSON.stringify(dopo));
await p.screenshot({ path: path.join(CARTELLA, "3_plastico_dopo.png") });

const ok = {
  pulsante: pulsante.visibile && pulsante.stato.supportato,
  dentro: dentro.presenta && dentro.occhi === 2 && dentro.fotogrammiAlSecondo > 0 && dentro.ritmoPreso,
  argilla: dentro.argilla.visti > 0 && dentro.argilla.argilla === dentro.argilla.visti && dentro.argilla.pezziArgilla > 0,
  agentiNelVisore: dentro.agenti.mossiOltre30cm > 0,
  testa: Math.abs(dentro.testaSopraPiano_m - 0.85) <= 0.85 * 0.05,
  ritorno: dopo.distanza_cm < 0.01 && dopo.angolo_gradi < 0.01 && dopo.fov === dopo.fovPrima && dopo.genitore === null
           && dopo.comandi === dopo.comandiPrima && dopo.ritmoRestituito && !dopo.xrAcceso,
  scenaContinua: dopo.agenti.mossiOltre30cm > 0,
};
console.log(ora() + "  ESITO " + JSON.stringify(ok) + "  -> " + (Object.values(ok).every(Boolean) ? "RIUSCITA" : "NON RIUSCITA"));
fs.writeFileSync(path.join(CARTELLA, "misure.json"), JSON.stringify({ pulsante, dentro, dopo, ok }, null, 1));
await Promise.race([ctx.close(), aspetta(15000)]).catch(() => {});
process.exit(0);
