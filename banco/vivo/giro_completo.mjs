// GIRO COMPLETO — §6.17, criterio di riuscita della correzione di `dijkstra`.
//
// Dall'apertura della pagina alla fine del giro di comprensione
// (`window.__veritasComprensione`), con: il battito della pagina (il blocco
// piu' lungo), le righe dell'occhio e del montaggio, e alla fine uno sguardo
// vero all'occhio con la scena carica. Ogni attesa ha il tetto fuori dalla
// pagina, nel processo Node.
//
//   DAL_WORKSPACE=1 RADICE=<clone> MODELLO=<glb> node banco/vivo/giro_completo.mjs
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = process.env.RADICE || path.join(qui, "..", "..");
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const DAL_WS = process.env.DAL_WORKSPACE === "1";
const TETTO_GIRO_MS = Number(process.env.TETTO_GIRO_MS || 15 * 60000);
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
const TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
               ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css",
               ".glb": "model/gltf-binary", ".png": "image/png", ".svg": "image/svg+xml" };
const conTetto = (pr, ms, cosa) => Promise.race([pr,
  new Promise((_, no) => setTimeout(() => no(new Error("tetto " + ms + " ms: " + cosa)), ms))]);
const t0 = Date.now();
const ora = () => String(Math.round((Date.now() - t0) / 1000)).padStart(4) + "s";

// Manopole: PROFILA=1 registra il profilo del processore dalla scena carica
// fino al primo esito del corpo fisico; FINALIZZATORI=1 mette una spia sulle
// pulizie automatiche della memoria (FinalizationRegistry); GC=1 le fa
// scattare spesso (--expose-gc), cosi' un rilascio sbagliato esce subito.
const PROFILA = process.env.PROFILA === "1";
const SPIA_FIN = process.env.FINALIZZATORI === "1";
const GC = process.env.GC === "1";
const ctx = await chromium.launchPersistentContext(path.join(qui, process.env.PROFILO || "profilo_giro_completo"), {
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true, viewport: { width: 1600, height: 900 },
  args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"].concat(GC ? ["--js-flags=--expose-gc"] : []),
});
if (SPIA_FIN) await ctx.addInitScript(() => {
  const FR = window.FinalizationRegistry;
  if (!FR) return;
  window.FinalizationRegistry = class extends FR {
    constructor(cb) {
      const chi = String(cb).replace(/\s+/g, " ").slice(0, 140);
      super((tenuto) => {
        try { cb(tenuto); }
        catch (e) { console.log("[FINALIZZATORE ROTTO] " + chi + " | tenuto=" + tenuto + " | " + e); throw e; }
      });
    }
  };
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
await ctx.addInitScript(() => { setInterval(() => console.log("[BATTITO]"), 1000); });
const p = ctx.pages()[0] || await ctx.newPage();
let ultimo = Date.now(), peggiore = 0, caduta = false;
p.on("console", (m) => { const t = m.text();
  if (t === "[BATTITO]") { const g = Date.now() - ultimo; if (g > peggiore) peggiore = g; ultimo = Date.now(); return; }
  if (/\[VERITAS (occhio|montaggio|corpo)\]|\[FINALIZZATORE/.test(t)) console.log(ora() + "  " + t.slice(0, 260));
  if (/^\[VERITAS corpo\] (\d+ corpi|non applicato)/.test(t)) primoCorpo = primoCorpo || Date.now(); });
let primoCorpo = 0;
p.on("pageerror", (e) => console.log(ora() + "  PAGEERROR " + String(e).slice(0, 200)
  + "\n        " + String((e && e.stack) || "").split("\n").slice(1, 14).join("\n        ")));
p.on("crash", () => { caduta = true; console.log(ora() + "  *** LA PAGINA E' CADUTA ***"); });

await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 120000 });
console.log(ora() + "  costruzione: " + await p.evaluate(() => window.__EIDETICA_COSTRUZIONE) + (DAL_WS ? " (workspace)" : " (pubblicata)"));
// Alla prima visita `veritas_fili.js` ricarica la pagina UNA volta per
// isolarla: si aspetta che sia fatto prima di toccare qualcosa.
for (let i = 0; i < 20; i++) {
  const iso = await p.evaluate(() => window.crossOriginIsolated).catch(() => null);
  if (iso === true) break;
  await new Promise((r) => setTimeout(r, 500));
}
await p.waitForLoadState("load").catch(() => {});
console.log(ora() + "  pagina isolata: " + await p.evaluate(() => window.crossOriginIsolated)
  + " · processori: " + await p.evaluate(() => navigator.hardwareConcurrency));
await p.waitForSelector("#v-pick-file", { timeout: 60000 });
const [scelta] = await Promise.all([p.waitForEvent("filechooser", { timeout: 30000 }), p.click("#v-pick-file")]);
await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "giro completo").catch(() => {});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).then(() => p.click("#vs-start-btn")).catch(() => {});
await conTetto(p.waitForFunction(() => !!window.__veritasModelRoot, null, { timeout: 180000 }), 200000, "modello");
console.log(ora() + "  scena carica.");

// Quando la pagina e' ferma da piu' di 10 s, la si ferma in flagranza e si
// scrive chi tiene il filo, con il nome del file (da `scriptParsed`: il campo
// `url` dei riquadri della pila e' vuoto nei Chrome recenti).
const cdp = await ctx.newCDPSession(p);
const script = new Map();
cdp.on("Debugger.scriptParsed", (s) => script.set(s.scriptId,
  (s.url || "").split("/").pop().split("?")[0] || "index.html"));
await cdp.send("Debugger.enable");
const colpevoli = new Map();
async function chiTiene() {
  try {
    const pausa = new Promise((ok) => cdp.once("Debugger.paused", ok));
    await conTetto(cdp.send("Debugger.pause"), 15000, "pause");
    const ev = await conTetto(pausa, 20000, "paused");
    await cdp.send("Debugger.resume").catch(() => {});
    const pila = ev.callFrames.map((f) => (f.functionName || "(anonima)") + "@"
      + (script.get(f.location.scriptId) || "?") + ":" + (f.location.lineNumber + 1));
    // La prima voce che sta in un file del progetto dice di chi e' il lavoro.
    const nostra = pila.find((s) => /@(index\.html|veritas_)/.test(s)) || pila[0];
    colpevoli.set(nostra, (colpevoli.get(nostra) || 0) + 1);
    console.log(ora() + "  FILO TENUTO DA: " + nostra + "   [" + pila.slice(0, 4).join(" < ") + "]");
  } catch (e) { console.log(ora() + "  (pausa non riuscita: " + e.message + ")"); }
}

let profiloAperto = false;
if (PROFILA) {
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.setSamplingInterval", { interval: 1000 });
  await cdp.send("Profiler.start");
  profiloAperto = true;
  console.log(ora() + "  profilo del processore: acceso");
}
async function chiudiProfilo(perche) {
  if (!profiloAperto) return;
  profiloAperto = false;
  const { profile } = await conTetto(cdp.send("Profiler.stop"), 60000, "Profiler.stop");
  const nodi = new Map(profile.nodes.map((n) => [n.id, n]));
  const padre = new Map();
  for (const n of profile.nodes) for (const c of (n.children || [])) padre.set(c, n.id);
  const nome = (n) => (n.callFrame.functionName || "(anonima)") + "@"
    + ((n.callFrame.url || "").split("/").pop().split("?")[0] || "index.html") + ":" + (n.callFrame.lineNumber + 1);
  const proprio = new Map(), compreso = new Map();
  let totale = 0;
  profile.samples.forEach((id, i) => {
    const d = (profile.timeDeltas[i] || 0) / 1000;
    totale += d;
    const foglia = nodi.get(id);
    proprio.set(nome(foglia), (proprio.get(nome(foglia)) || 0) + d);
    const visti = new Set();
    for (let x = id; x != null; x = padre.get(x)) {
      const k = nome(nodi.get(x));
      if (!visti.has(k)) { visti.add(k); compreso.set(k, (compreso.get(k) || 0) + d); }
    }
  });
  console.log(ora() + "  PROFILO (" + perche + "), " + Math.round(totale / 1000) + " s registrati");
  console.log("     tempo COMPRESO delle funzioni del progetto (ms):");
  [...compreso].filter(([k]) => /@(index\.html|veritas_)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 25)
    .forEach(([k, v]) => console.log("       " + String(Math.round(v)).padStart(7) + "  " + k));
  console.log("     tempo PROPRIO, le prime 15 (ms):");
  [...proprio].sort((a, b) => b[1] - a[1]).slice(0, 15)
    .forEach(([k, v]) => console.log("       " + String(Math.round(v)).padStart(7) + "  " + k));
}

let finito = null;
while (!finito && !caduta && Date.now() - t0 < TETTO_GIRO_MS) {
  await new Promise((r) => setTimeout(r, 10000));
  if (profiloAperto && primoCorpo && Date.now() - primoCorpo > 2000) await chiudiProfilo("fino al primo esito del corpo fisico");
  if (GC) await conTetto(p.evaluate(() => { if (window.gc) window.gc(); }), 15000, "gc").catch(() => {});
  const bloccoOra = Date.now() - ultimo;
  if (bloccoOra > 10000) await chiTiene();
  try {
    finito = await conTetto(p.evaluate(() => {
      const c = window.__veritasComprensione;
      return c ? { ok: c.ok !== false, capito: !!c.capito, perche: c.perche || null,
                   posti: (c.posti || []).length, senzaNome: c.senzaNome } : null;
    }), 15000, "stato del giro");
  } catch (e) { console.log(ora() + "  (stato non leggibile: " + e.message + ")"); }
  if (bloccoOra > 20000) console.log(ora() + "  pagina ferma da " + Math.round(bloccoOra / 1000) + " s");
}
await chiudiProfilo("fino alla fine del giro").catch((e) => console.log("profilo non letto: " + e.message));
console.log(ora() + "  GIRO: " + (finito ? JSON.stringify(finito) : caduta ? "pagina caduta" : "non finito entro il tetto"));
console.log(ora() + "  BLOCCO PIU' LUNGO DELLA PAGINA: " + Math.round(peggiore / 1000) + " s");
console.log(ora() + "  CHI HA TENUTO IL FILO (campioni ogni 10 s a pagina ferma):");
for (const [k, v] of [...colpevoli].sort((a, b) => b[1] - a[1])) console.log("        " + v + "x  " + k);

// Il corpo fisico si e' applicato davvero? Dopo il giro le traiettorie smettono
// di essere ricalcolate, e l'ultimo filtro deve arrivare in fondo.
if (!caduta) {
  let esitoCorpo = null;
  const c0 = Date.now();
  while (Date.now() - c0 < Number(process.env.TETTO_CORPO_MS || 180000)) {
    esitoCorpo = await conTetto(p.evaluate(() => {
      const e = window.__veritasCorpo && window.__veritasCorpo.ultimoEsito();
      return e ? { ok: e.ok, perche: e.perche || null, corpi: e.corpi, mosse: e.mosse,
                   dentroUnSolido: e.dentroUnSolido, posizioniControllate: e.posizioniControllate,
                   ms: e.ms, msTotali: e.msTotali } : null;
    }), 15000, "esito corpo").catch(() => null);
    if (esitoCorpo) break;
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.log(ora() + "  CORPO FISICO: " + (esitoCorpo ? JSON.stringify(esitoCorpo) : "nessun esito entro il tetto"));
}

if (!caduta) {
  const s0 = Date.now();
  const sguardo = await conTetto(p.evaluate(async () => {
    const R = window.__veritasRiconosce;
    const rileva = await R.occhioLocale({});
    if (!rileva) return { ok: false, perche: R.stato().perche };
    const c = document.createElement("canvas"); c.width = 64; c.height = 64;
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, 64, 64);
    const v = await rileva(c, ["a door"]);
    return { ok: true, trovate: v.length, device: R.stato().device };
  }), 120000, "sguardo").catch((e) => ({ ok: false, perche: e.message }));
  console.log(ora() + "  SGUARDO VERO CON SCENA CARICA: " + JSON.stringify(sguardo) + " in " + (Date.now() - s0) + " ms");
}
await conTetto(ctx.close(), 20000, "chiusura").catch(() => {});
process.exit(0);
