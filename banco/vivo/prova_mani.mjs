// FASE C, primo incremento delle mani (30/09): la mano o il controller
// PRENDONO il plastico e lo spostano e lo girano, nel Quest 3 simulato (iwer).
//
// Criterio deciso PRIMA di lanciarla, per i controller (presa laterale) e per
// le mani (pizzico):
//   ingressi riconosciuti;
//   trascinare 20 cm in orizzontale -> il plastico si sposta di 20 cm (errore <= 1 cm);
//   trascinare 10 cm in su          -> sale di 10 cm (errore <= 1 cm): proporzionale;
//   mano ferma 1 s                  -> il plastico si muove < 1 mm: stabile;
//   girare il polso di 30°          -> il plastico gira di 30° (errore <= 2°);
//   lasciare e muovere la mano      -> il plastico resta fermo (< 1 mm);
//   grilletto del controller        -> non prende (resta per la scelta delle persone);
//   costo della presa + punti       -> < 0,5 ms per fotogramma;
//   all'uscita: telecamera e comandi come prima, niente resti nella scena.
// Tetto: 12 minuti (quasi tutti di attesa della regia dell'occhio).
//
//   DAL_WORKSPACE=1 node banco/vivo/prova_mani.mjs
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(process.env.RADICE || path.join(qui, "..", ".."));
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const DAL_WS = process.env.DAL_WORKSPACE === "1";
const CARTELLA = path.resolve(process.env.CARTELLA || path.join(qui, "misure_visore"));
fs.mkdirSync(CARTELLA, { recursive: true });
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
const TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
               ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css",
               ".glb": "model/gltf-binary", ".png": "image/png", ".svg": "image/svg+xml" };
const t0 = Date.now();
const ora = () => String(Math.round((Date.now() - t0) / 1000)).padStart(4) + "s";
const aspetta = (ms) => new Promise((r) => setTimeout(r, ms));
setTimeout(() => { console.log(ora() + "  TETTO 12 minuti: fermo"); process.exit(2); }, 12 * 60 * 1000);

const ctx = await chromium.launchPersistentContext(path.join(qui, process.env.PROFILO || "profilo_visore"), {
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true, viewport: { width: 1600, height: 900 },
  args: ["--force_high_performance_gpu", "--ignore-gpu-blocklist"],
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
// iwer chiede il suo fotogramma al requestAnimationFrame originale (vedi prova_visore.mjs)
const iwer = fs.readFileSync(path.join(WS, "node_modules", "iwer", "build", "iwer.min.js"), "utf8")
  .replace("globalThis.requestAnimationFrame(this[ie].onDeviceFrame)", "window.__rafNativo(this[ie].onDeviceFrame)");
if (!iwer.includes("__rafNativo")) throw new Error("iwer cambiato: il punto del fotogramma non c'e' piu'");
await ctx.addInitScript("window.__rafNativo = window.requestAnimationFrame.bind(window);\n" + iwer + `
  ;(function(){ if (window.top !== window) return;
    const d = new IWER.XRDevice(IWER.metaQuest3);
    d.installRuntime({ forceInstall: true });
    d.position.set(0, 1.6, 0);
    d.quaternion.set(-Math.sin(20 * Math.PI / 180), 0, 0, Math.cos(20 * Math.PI / 180));
    window.__provaXR = d; })();`);

const p = ctx.pages()[0] || await ctx.newPage();
let regiaFinita = false, inquadrato = false;
p.on("console", (m) => { const t = m.text();
  if (/regia\] finita/.test(t)) regiaFinita = true;
  if (/inquadro gli agenti/.test(t)) inquadrato = true;
  if (/EIDETICA visore\] (scheda|dentro|fuori|ingresso|plastico unito|unione|fotogramma)|PAGEERROR|regia\] finita/.test(t)) console.log(ora() + "  " + t.slice(0, 200)); });
p.on("pageerror", (e) => console.log(ora() + "  PAGEERROR " + String(e).slice(0, 200)));

await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 120000 });
for (let i = 0; i < 20; i++) {
  if (await p.evaluate(() => window.crossOriginIsolated).catch(() => null)) break;
  await aspetta(500);
}
await p.waitForLoadState("load").catch(() => {});
console.log(ora() + "  costruzione " + await p.evaluate(() => window.__EIDETICA_COSTRUZIONE) + (DAL_WS ? " (workspace)" : " (pubblicata)"));
await p.waitForSelector("#v-pick-file", { timeout: 60000 });
const [scelta] = await Promise.all([p.waitForEvent("filechooser", { timeout: 30000 }), p.click("#v-pick-file")]);
await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "mani").catch(() => {});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).then(() => p.click("#vs-start-btn")).catch(() => {});

const attendi = async (cosa, fn, ms) => { const f = Date.now() + ms;
  while (Date.now() < f) { if (await p.evaluate(fn).catch(() => false)) return true; await aspetta(500); }
  console.log(ora() + "  NON ARRIVATO: " + cosa); return false; };
await attendi("velo aperto", () => !!(window.__veritasApertura && window.__veritasApertura.stato && window.__veritasApertura.stato()), 180000);
await aspetta(12000);
await p.evaluate(() => window.__veritasApertura && window.__veritasApertura.chiudi("prova")).catch(() => {});
await attendi("scena e modello", () => !!(window.__veritasScene && window.__veritasModelRoot), 120000);
await attendi("bottone Avvia", () => !!document.getElementById("veritas-avvia"), 60000);
await aspetta(4000);
await p.evaluate(() => { const b = document.getElementById("veritas-avvia"); if (b) b.click(); });
await p.evaluate(() => window.eideticaModo && window.eideticaModo.imposta("esperienza"));
{ const fine = Date.now() + 240000; while (Date.now() < fine && !inquadrato) await aspetta(2000); }
console.log(ora() + "  inquadrato: " + inquadrato + " — aspetto la fine della regia (l'occhio)");
{ const fine = Date.now() + 8 * 60 * 1000; while (Date.now() < fine && !regiaFinita) await aspetta(3000); }
console.log(ora() + "  regia finita: " + regiaFinita);
await aspetta(5000);

// 0. il plastico sullo schermo, prima
const prima = await p.evaluate(() => { const c = window.__veritasCamera, t = window.__veritasControls.target;
  return { pos: c.position.toArray(), quat: c.quaternion.toArray(), fov: c.fov, target: t.toArray(),
           comandi: window.__veritasControls.enabled }; });
await p.click("#eidetica-visore");
await attendi("dentro il visore", () => window.eideticaVisore.stato().dentro && window.eideticaVisore.stato().fotogrammi > 20, 60000);

// Dove sta il plastico PER CHI GUARDA (metri reali): il centro del modello e
// un punto 10 m piu' in la' in x, portati nel riferimento del visore con
// l'inverso del supporto. Da qui spostamento e giro.
const PLASTICO = () => {
  const T = window.THREE, st = window.eideticaVisore.stato();
  const S = new T.Matrix4().fromArray(st.supporto).invert();
  const b = new T.Box3().setFromObject(window.__veritasModelRoot), c = b.getCenter(new T.Vector3());
  const a = c.clone().applyMatrix4(S), d = c.clone().add(new T.Vector3(10, 0, 0)).applyMatrix4(S);
  return { p: a.toArray(), giro: Math.atan2(-(d.z - a.z), d.x - a.x) * 180 / Math.PI, st };
};
const posa = (modo, pos, giro) => p.evaluate(([modo, pos, giro]) => {
  const d = window.__provaXR, x = modo === "mano" ? d.hands.right : d.controllers.right;
  x.position.set(pos[0], pos[1], pos[2]);
  x.quaternion.set(0, Math.sin(giro * Math.PI / 360), 0, Math.cos(giro * Math.PI / 360));
}, [modo, pos, giro]);
const premi = (modo, tasto, v) => p.evaluate(([modo, tasto, v]) => {
  const d = window.__provaXR;
  if (modo === "mano") d.hands.right.updatePinchValue(v); else d.controllers.right.updateButtonValue(tasto, v);
}, [modo, tasto, v]);
const diff = (a, b) => b.p.map((v, k) => v - a.p[k]);
const lung = (v) => Math.hypot(...v);
const cm = (v) => v.map((x) => +(x * 100).toFixed(2));
let giroDelta = (a, b) => { let g = b.giro - a.giro; while (g > 180) g -= 360; while (g < -180) g += 360; return g; };

const esiti = {};
for (const modo of ["controller", "mano"]) {
  const tasto = modo === "mano" ? "pinch" : "squeeze";
  await p.evaluate((m) => { window.__provaXR.primaryInputMode = m === "mano" ? "hand" : "controller"; }, modo);
  const P0 = [0.25, 1.1, -0.45];
  await posa(modo, P0, 0);
  await aspetta(1200);
  const e = { modo };
  e.ingressi = (await p.evaluate(PLASTICO)).st.ingressi;

  // il grilletto non prende (solo controller)
  if (modo === "controller") {
    const a = await p.evaluate(PLASTICO);
    await premi(modo, "trigger", 1); await aspetta(400);
    await posa(modo, [P0[0] + 0.2, P0[1], P0[2]], 0); await aspetta(700);
    const b = await p.evaluate(PLASTICO);
    await premi(modo, "trigger", 0); await posa(modo, P0, 0); await aspetta(700);
    e.grilletto_mm = +(lung(diff(a, b)) * 1000).toFixed(2);
  }

  const r0 = await p.evaluate(PLASTICO);
  await premi(modo, tasto, 1); await aspetta(500);
  e.presa = (await p.evaluate(PLASTICO)).st.presa;
  await posa(modo, [P0[0] + 0.20, P0[1], P0[2]], 0); await aspetta(800);
  const r1 = await p.evaluate(PLASTICO);
  e.venti_cm = cm(diff(r0, r1));
  e.errore20_cm = +(lung(diff(r0, r1).map((v, k) => v - [0.20, 0, 0][k])) * 100).toFixed(2);
  await aspetta(1000);
  const r1b = await p.evaluate(PLASTICO);
  e.fermo_mm = +(lung(diff(r1, r1b)) * 1000).toFixed(3);
  await posa(modo, [P0[0] + 0.20, P0[1] + 0.10, P0[2]], 0); await aspetta(800);
  const r2 = await p.evaluate(PLASTICO);
  e.dieci_cm = cm(diff(r1b, r2));
  e.errore10_cm = +(lung(diff(r1b, r2).map((v, k) => v - [0, 0.10, 0][k])) * 100).toFixed(2);
  await posa(modo, [P0[0] + 0.20, P0[1] + 0.10, P0[2]], 30); await aspetta(800);
  const r3 = await p.evaluate(PLASTICO);
  e.giro_gradi = +giroDelta(r2, r3).toFixed(2);
  // fotografia del visore con la mano chiusa (solo per le mani)
  if (modo === "mano") {
    const foto = await p.evaluate(() => new Promise((ok) => {
      const S = window.__veritasScene, vecchio = S.onAfterRender;
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
        ok(c.toDataURL("image/png"));
      };
    }));
    fs.writeFileSync(path.join(CARTELLA, "4_mano_che_tiene_il_plastico.png"), Buffer.from(foto.split(",")[1], "base64"));
  }
  await premi(modo, tasto, 0); await aspetta(500);
  e.presaDopo = (await p.evaluate(PLASTICO)).st.presa;
  const r4 = await p.evaluate(PLASTICO);
  await posa(modo, P0, 0); await aspetta(800);
  const r5 = await p.evaluate(PLASTICO);
  e.lasciato_mm = +(lung(diff(r4, r5)) * 1000).toFixed(3);
  e.costoMani_ms = r5.st.costoMani_ms;
  console.log(ora() + "  " + modo.toUpperCase() + " " + JSON.stringify(e));
  esiti[modo] = e;
}

// USCITA
await p.click("#eidetica-visore");
await attendi("fuori dal visore", () => !window.eideticaVisore.stato().dentro && !window.__veritasRenderer.xr.isPresenting, 30000);
await aspetta(1500);
const dopo = await p.evaluate((P) => { const c = window.__veritasCamera, t = window.__veritasControls.target, T = window.THREE;
  const resti = []; window.__veritasScene.traverse((o) => { if (/^eidetica-visore-/.test(o.name)) resti.push(o.name); });
  return { distanza_cm: +(c.position.distanceTo(new T.Vector3().fromArray(P.pos)) * 100).toFixed(2),
           angolo_gradi: +(c.quaternion.angleTo(new T.Quaternion().fromArray(P.quat)) * 180 / Math.PI).toFixed(3),
           fov: c.fov === P.fov, genitore: c.parent ? c.parent.name || c.parent.type : null,
           comandi: window.__veritasControls.enabled === P.comandi,
           ritmoRestituito: String(window.requestAnimationFrame).includes("native code"), resti }; }, prima);
console.log(ora() + "  FUORI " + JSON.stringify(dopo));

const ok = {};
for (const m of ["controller", "mano"]) {
  const e = esiti[m];
  ok[m] = {
    ingressi: e.ingressi.some((x) => x.startsWith(m)),
    venti: e.errore20_cm <= 1, dieci: e.errore10_cm <= 1, fermo: e.fermo_mm < 1,
    giro: Math.abs(e.giro_gradi - 30) <= 2, lasciato: e.lasciato_mm < 1 && e.presaDopo === null,
    grilletto: m === "mano" ? true : e.grilletto_mm < 1, costo: e.costoMani_ms < 0.5,
  };
}
ok.uscita = dopo.distanza_cm < 0.01 && dopo.angolo_gradi < 0.01 && dopo.fov && dopo.genitore === null
  && dopo.comandi && dopo.ritmoRestituito && dopo.resti.length === 0;
const tutto = Object.values(ok).every((v) => (typeof v === "object" ? Object.values(v).every(Boolean) : v));
console.log(ora() + "  ESITO " + JSON.stringify(ok) + "  -> " + (tutto ? "RIUSCITA" : "NON RIUSCITA"));
fs.writeFileSync(path.join(CARTELLA, "mani.json"), JSON.stringify({ esiti, dopo, ok }, null, 1));
await Promise.race([ctx.close(), aspetta(15000)]).catch(() => {});
process.exit(0);
