// QUANTE TAPPE, E SU QUANTI POSTI MISURATI — §6.16.
//
// Raffaella, 22/09: «in quella zona non ho mai visto una zona». Si misura:
// quante tappe ci sono, quanti posti con arredi misurati, e quanti di quei
// posti hanno una tappa entro RAGGIO metri. Due istantanee: a meta' giro e a
// fine giro (dopo che l'occhio ha dato i nomi).
//
//   DAL_WORKSPACE=1 RADICE=<clone> MODELLO=<glb> node banco/vivo/conta_tappe.mjs
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(process.env.RADICE || path.join(qui, "..", ".."));
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const DAL_WS = process.env.DAL_WORKSPACE === "1";
const RAGGIO = Number(process.env.RAGGIO || 4);
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
const TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
               ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css",
               ".glb": "model/gltf-binary", ".png": "image/png", ".svg": "image/svg+xml" };
const conTetto = (pr, ms, cosa) => Promise.race([pr,
  new Promise((_, no) => setTimeout(() => no(new Error("tetto " + ms + " ms: " + cosa)), ms))]);
const t0 = Date.now();
const ora = () => String(Math.round((Date.now() - t0) / 1000)).padStart(4) + "s";

const ctx = await chromium.launchPersistentContext(path.join(qui, process.env.PROFILO || "profilo_play"), {
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true, viewport: { width: 1600, height: 900 },
  args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
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
const p = ctx.pages()[0] || await ctx.newPage();
p.on("console", (m) => { const t = m.text();
  if (/\[VERITAS\] (barra|Traiettoria|avvio)|\[VERITAS (regia\] finita|corpo\] [0-9])|PAGEERROR|DIAG|bridge] traiettoria remota/.test(t)) console.log(ora() + "  " + t.slice(0, 230)); });
p.on("pageerror", (e) => console.log(ora() + "  PAGEERROR " + String(e).slice(0, 200)));

await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 120000 });
for (let i = 0; i < 20; i++) {
  if (await p.evaluate(() => window.crossOriginIsolated).catch(() => null)) break;
  await new Promise((r) => setTimeout(r, 500));
}
await p.waitForLoadState("load").catch(() => {});
console.log(ora() + "  costruzione " + await p.evaluate(() => window.__EIDETICA_COSTRUZIONE) + (DAL_WS ? " (workspace)" : " (pubblicata)"));
await p.waitForSelector("#v-pick-file", { timeout: 60000 });
const [scelta] = await Promise.all([p.waitForEvent("filechooser", { timeout: 30000 }), p.click("#v-pick-file")]);
await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "play").catch(() => {});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).then(() => p.click("#vs-start-btn")).catch(() => {});


// PLAY — Raffaella 25/09: «ho schiacciato play ma la simulazione non parte, la spia e' viola».
const CARTELLA = process.env.CARTELLA || path.join(qui, "play");
fs.mkdirSync(CARTELLA, { recursive: true });
await new Promise((r) => setTimeout(r, 45000));
await p.evaluate(() => window.__veritasApertura && window.__veritasApertura.chiudi("prova")).catch(() => {});
await new Promise((r) => setTimeout(r, 4000));
const bottoni = await p.evaluate(() => ({ avvia: !!document.getElementById("veritas-avvia"), regen: !!document.getElementById("vp-regen"),
  simStarted: window.__veritasSimStarted }));
console.log(ora() + "  dopo Entra: " + JSON.stringify(bottoni));
await p.screenshot({ path: path.join(CARTELLA, "1_dopo_entra.jpg"), type: "jpeg", quality: 75 });
const premuto = await p.evaluate(() => { const b = document.getElementById("veritas-avvia"); if (b) { b.click(); return "veritas-avvia"; } return null; });
console.log(ora() + "  premo: " + premuto);
const barra = () => p.evaluate(() => { const t = [...document.querySelectorAll('div,span')].map((e) => e.textContent).find((x) => /FRAME \d+\/\d+/.test(x) && x.length < 60);
  const tr = [...document.querySelectorAll('div,span')].map((e) => e.textContent).find((x) => /FRAMES •/.test(x) && x.length < 60);
  return (t || '?') + ' | ' + (tr || '?'); }).catch(() => '?');
const fine = Date.now() + 200000;
let n = 0;
while (Date.now() < fine) {
  await new Promise((r) => setTimeout(r, 15000));
  const s = await conTetto(p.evaluate(() => {
    const t = window.__veritasGetTrajectory && window.__veritasGetTrajectory();
    const g = window.__veritasPassengerGroups; let visibili = 0, tot = 0;
    if (g && g.forEach) g.forEach((pg) => { tot++; if (pg && pg.group && pg.group.visible) visibili++; });
    const pill = document.getElementById("vaio-status"), txt = document.getElementById("vaio-status-txt");
    return { fotogrammi: t && t.frames ? t.frames.length : -1, agenti: window.__veritasAgentiNeiFrame,
      figureVisibili: visibili + "/" + tot, ripiego: window.__veritasUsingFallback, spia: pill ? pill.className + " «" + (txt && txt.textContent) + "»" : null,
      simStarted: window.__veritasSimStarted, giro: window.__veritasGiroInCorso };
  }), 20000, "stato").catch((e) => ({ errore: e.message }));
  console.log(ora() + "  " + JSON.stringify(s) + "  barra: " + await barra());
  if (n === 99) {
    const c = await p.evaluate(() => { const b = window.__veritasFindPlay ? null : null;
      const btns = [...document.querySelectorAll('button')].filter((x) => x.querySelector('svg.lucide-play'));
      if (btns[0]) { btns[0].click(); return btns.length; } return 0; });
    console.log(ora() + "  PREMO IO il play del lettore: bottoni play trovati " + c);
  }
  if (++n === 2 || n === 6) await p.screenshot({ path: path.join(CARTELLA, (n + 1) + "_play.jpg"), type: "jpeg", quality: 75 });
}
await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 15000))]).catch(() => {});
process.exit(0);
