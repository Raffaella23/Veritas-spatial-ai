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

const ctx = await chromium.launchPersistentContext(path.join(qui, process.env.PROFILO || "profilo_catena_sedersi"), {
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
  if (/\[VERITAS (bridge|montaggio\] giro)/.test(t)) console.log(ora() + "  " + t.slice(0, 230)); });
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
await p.fill("#v-new-name", "catena sedersi").catch(() => {});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).then(() => p.click("#vs-start-btn")).catch(() => {});


// LA CATENA DEL SEDERSI — HANDOFF §6.19. Tre numeri, e ci si ferma.
// (1) tappe «sosta»; (2) quale motore ha prodotto i percorsi; (3) agenti con
// `seduto` nei fotogrammi. Tetto totale TETTO_MS (15 min).
const TETTO_MS = Number(process.env.TETTO_MS || 15 * 60000);
const scadenza = t0 + TETTO_MS;
while (Date.now() < scadenza - 4 * 60000) {
  const c = await conTetto(p.evaluate(() => !!window.__veritasComprensione), 15000, "giro").catch(() => false);
  if (c) break;
  await new Promise((r) => setTimeout(r, 5000));
}
console.log(ora() + "  giro finito: " + await p.evaluate(() => !!window.__veritasComprensione).catch(() => "?"));
await p.evaluate(() => window.__veritasApertura && window.__veritasApertura.chiudi("prova")).catch(() => {});
await new Promise((r) => setTimeout(r, 3000));
const primaTraj = await p.evaluate(() => { const t = window.__veritasGetTrajectory && window.__veritasGetTrajectory(); return t ? (t.frames || []).length : -1; });
const premuto = await p.evaluate(() => {
  for (const id of ["veritas-avvia", "vp-regen"]) { const b = document.getElementById(id); if (b) { b.click(); return id; } }
  return null; });
console.log(ora() + "  avvio simulazione: " + premuto + " (fotogrammi prima: " + primaTraj + ")");
let esito = null;
while (Date.now() < scadenza) {
  esito = await conTetto(p.evaluate(() => {
    const t = window.__veritasGetTrajectory && window.__veritasGetTrajectory();
    const fr = (t && t.frames) || [];
    if (fr.length < 2 || !window.__veritasSimStarted) return null;
    const nodi = (window.__veritasGetNodes ? window.__veritasGetNodes() : []) || [];
    const perTipo = {}; for (const n of nodi) perTipo[n.type] = (perTipo[n.type] || 0) + 1;
    const agenti = new Set(), seduti = new Set(), inAttesa = new Set(); let coppieSedute = 0, coppie = 0;
    for (const f of fr) for (const a of (f.agents || [])) {
      coppie++; agenti.add(a.id);
      if (a.seduto) { seduti.add(a.id); coppieSedute++; }
      if (a.state === "WAITING") inAttesa.add(a.id);
    }
    return { tappe: nodi.length, perTipo, soste: perTipo.sosta || 0,
      motore: window.__veritasUsingFallback === true ? "generatore JS locale (ripiego)"
            : window.__veritasUsingFallback === false ? "motore Python (Render)" : "sconosciuto",
      fotogrammi: fr.length, agenti: agenti.size, agentiSeduti: seduti.size,
      coppieSedute, coppie, agentiInAttesa: inAttesa.size };
  }), 20000, "misura").catch((e) => ({ errore: e.message }));
  if (esito && !esito.errore && esito.motore !== "sconosciuto") break;
  await new Promise((r) => setTimeout(r, 5000));
}
console.log(ora() + "  ESITO: " + JSON.stringify(esito));
await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 15000))]).catch(() => {});
process.exit(0);
