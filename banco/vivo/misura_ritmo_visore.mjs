// FASE C (30/09): DOVE VANNO I MILLISECONDI di un fotogramma nel visore.
// Col Quest vero (Air Link, NVIDIA, analisi finita): 11 fotogrammi/s, 67 ms
// l'uno, 4 richieste di fotogramma servite ogni volta. Il Quest ne vuole 72.
// SOLA MISURA, nessuna correzione.
//
// Cosa misura, sul Quest 3 simulato (iwer) con la NVIDIA, a regia finita,
// dentro il visore, in finestre di 5 s:
//   A. com'e': fotogrammi/s, ms di ogni richiesta servita (per nome),
//      ms e pezzi disegnati (draw call) di ogni renderer.render;
//   B. ombre ferme (shadowMap.autoUpdate = false): quanto costa ricalcolarle;
//   C. modello spento per la finestra: quanto costano i 2.416 pezzi;
//   D. di nuovo com'e' (controllo: torna come A?).
// Riuscita: le parti che fanno piu' di meta' del fotogramma hanno un nome.
// Tetto: 12 minuti (quasi tutti di attesa della regia).
//
//   DAL_WORKSPACE=1 node banco/vivo/misura_ritmo_visore.mjs
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

const ctx = await chromium.launchPersistentContext(path.join(qui, process.env.PROFILO || "profilo_ritmo"), {
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
  if (/EIDETICA visore] (scheda|dentro|fuori|ritmo|plastico unito|unione)|PAGEERROR|regia\] finita/.test(t)) console.log(ora() + "  " + t.slice(0, 200)); });
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
await p.fill("#v-new-name", "ritmo").catch(() => {});
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
await p.evaluate(() => { const b = document.getElementById("veritas-avvia"); if (b) b.click(); });
await p.evaluate(() => window.eideticaModo && window.eideticaModo.imposta("esperienza"));
{ const fine = Date.now() + 240000; while (Date.now() < fine && !inquadrato) await aspetta(2000); }
console.log(ora() + "  inquadrato: " + inquadrato + " — aspetto la fine della regia (l'occhio)");
{ const fine = Date.now() + 8 * 60 * 1000; while (Date.now() < fine && !regiaFinita) await aspetta(3000); }
console.log(ora() + "  regia finita: " + regiaFinita);
await aspetta(10000);

await p.click("#eidetica-visore");
await attendi("dentro il visore", () => window.eideticaVisore.stato().dentro && window.eideticaVisore.stato().fotogrammi > 20, 60000);

// Gli strumenti: ogni richiesta di fotogramma servita dal visore e ogni
// renderer.render, con nome, millisecondi e pezzi disegnati.
await p.evaluate(() => {
  const M = window.__misura = { richieste: {}, render: { ms: 0, n: 0, pezzi: 0, triangoli: 0, perScena: {} } };
  const nome = (cb) => (cb.name ? cb.name + " · " : "") + String(cb).replace(/\s+/g, " ").slice(0, 70);
  const rafVisore = window.requestAnimationFrame;
  window.requestAnimationFrame = function (cb) {
    const chi = nome(cb);
    return rafVisore.call(window, function (t) {
      const a = performance.now();
      try { return cb(t); }
      finally { const r = (M.richieste[chi] = M.richieste[chi] || { ms: 0, n: 0 }); r.ms += performance.now() - a; r.n++; }
    });
  };
  const R = window.__veritasRenderer, disegna = R.render.bind(R);
  R.render = function (scena, camera) {
    const a = performance.now();
    try { return disegna(scena, camera); }
    finally {
      const ms = performance.now() - a, i = R.info.render;
      M.render.ms += ms; M.render.n++; M.render.pezzi += i.calls; M.render.triangoli += i.triangles;
      const k = (scena === window.__veritasScene ? "scena della pagina" : (scena && scena.name) || "altra scena")
        + (R.xr.isPresenting && R.getRenderTarget() === R.__eideticaSchermoVisore ? " · visore" : " · fuori visore");
      const s = (M.render.perScena[k] = M.render.perScena[k] || { ms: 0, n: 0, pezzi: 0 });
      s.ms += ms; s.n++; s.pezzi += i.calls;
    }
  };
});

const finestra = async (nome, prima, dopo) => {
  await p.evaluate(prima || (() => {}));
  await aspetta(1500);                      // si assesta
  const a = await p.evaluate(() => { const M = window.__misura; M.richieste = {};
    M.render = { ms: 0, n: 0, pezzi: 0, triangoli: 0, perScena: {} };
    return { f: window.eideticaVisore.stato().fotogrammi, t: performance.now() }; });
  await aspetta(5000);
  const r = await p.evaluate((a) => {
    const M = window.__misura, st = window.eideticaVisore.stato(), dt = (performance.now() - a.t) / 1000;
    const nf = st.fotogrammi - a.f, per = (x) => +(x / Math.max(1, nf)).toFixed(1);
    const richieste = Object.entries(M.richieste).map(([k, v]) => ({ chi: k, msPerFotogramma: per(v.ms), volte: v.n }))
      .sort((x, y) => y.msPerFotogramma - x.msPerFotogramma);
    const perScena = Object.fromEntries(Object.entries(M.render.perScena).map(([k, v]) =>
      [k, { msPerFotogramma: per(v.ms), renderPerFotogramma: per(v.n), pezziPerRender: +(v.pezzi / Math.max(1, v.n)).toFixed(0) }]));
    return { fotogrammiAlSecondo: +(nf / dt).toFixed(1), msTotaliPerFotogramma: per(Object.values(M.richieste).reduce((s, v) => s + v.ms, 0)),
             render: { msPerFotogramma: per(M.render.ms), pezziPerFotogramma: per(M.render.pezzi),
                       triangoliPerFotogramma: per(M.render.triangoli) }, perScena, richieste };
  }, a);
  await p.evaluate(dopo || (() => {}));
  console.log(ora() + "  " + nome + " " + JSON.stringify(r));
  return r;
};

const A = await finestra("A com'e'");
const B = await finestra("B ombre ferme",
  () => { const R = window.__veritasRenderer; R.shadowMap.autoUpdate = false; R.shadowMap.needsUpdate = true; },
  () => { window.__veritasRenderer.shadowMap.autoUpdate = true; });
const C = await finestra("C modello spento",
  () => { window.__veritasModelRoot.visible = false; },
  () => { window.__veritasModelRoot.visible = true; });
const D = await finestra("D di nuovo com'e'");
fs.writeFileSync(path.join(CARTELLA, "ritmo.json"), JSON.stringify({ A, B, C, D }, null, 1));
await p.click("#eidetica-visore").catch(() => {});
await aspetta(2000);
await Promise.race([ctx.close(), aspetta(15000)]).catch(() => {});
process.exit(0);
