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

const ctx = await chromium.launchPersistentContext(path.join(qui, process.env.PROFILO || "profilo_regia_nel_velo"), {
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
    let ok = false; try { ok = f.startsWith(WS) && fs.statSync(f).isFile() && (fs.accessSync(f, fs.constants.R_OK), true); } catch (e) {}
    if (ok)
      return r.fulfill({ status: 200, path: f, headers: {
        "content-type": TIPI[path.extname(f)] || "application/octet-stream", "cache-control": "no-store",
        "cross-origin-opener-policy": "same-origin", "cross-origin-embedder-policy": "credentialless",
        "cross-origin-resource-policy": "cross-origin" } });
    return r.continue();
  });
}
await ctx.addInitScript(() => {
  window.__prova = { fermate: [], nomi: [], giroPartito: null, regiaFine: null };
  addEventListener('veritas:fermata', (e) => window.__prova.fermate.push({ t: Date.now(), img: e.detail.immagine.length, testa: e.detail.immagine.slice(0, 120), copie: e.detail.copie }));
  addEventListener('veritas:nome', (e) => window.__prova.nomi.push({ t: Date.now(), nome: e.detail.nome, ragionamento: e.detail.ragionamento }));
  addEventListener('veritas:regia', (e) => { if (e.detail.fase === 'fine') window.__prova.regiaFine = Date.now(); });
});
const p = ctx.pages()[0] || await ctx.newPage();
p.on("console", (m) => { const t = m.text();
  if (/\[VERITAS (regia|montaggio\] comincio|apertura\] stato)/.test(t)) console.log(ora() + "  " + t.slice(0, 230)); });
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
await p.fill("#v-new-name", "regia nel velo").catch(() => {});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).then(() => p.click("#vs-start-btn")).catch(() => {});


// LA REGIA NEL VELO — §12 passo D (25/09). Tetto TETTO_MS (5 min).
const CARTELLA = process.env.CARTELLA || path.join(qui, "regia_nel_velo");
fs.mkdirSync(CARTELLA, { recursive: true });
const TETTO_MS = Number(process.env.TETTO_MS || 5 * 60000);
const scadenza = t0 + TETTO_MS;
let visti = 0;
const velo = () => p.evaluate(() => {
  const o = document.querySelector('[data-veritas-apertura]'); const r = o && o.shadowRoot;
  if (!r) return null;
  const img = r.querySelector('.vap-inq img'), inq = r.querySelector('.vap-inq');
  const ora = r.querySelector('.vap-passo.ora');
  const ultima = window.__prova.fermate[window.__prova.fermate.length - 1];
  return { stato: ora ? ora.dataset.stato : null, inqVisibile: !!(inq && inq.classList.contains('su')),
    stessaImmagine: !!(img && ultima && img.src.slice(0, 120) === ultima.testa && img.src.length === ultima.img),
    etichette: [...r.querySelectorAll('.vap-et .pill')].map((x) => x.textContent).filter((x) => x === x.toUpperCase()).slice(-6),
    fermate: window.__prova.fermate.length, nomi: window.__prova.nomi.length, fine: window.__prova.regiaFine };
}).catch(() => null);
const giudizi = [];
while (Date.now() < scadenza) {
  const v = await conTetto(velo(), 10000, "velo").catch(() => null);
  if (v && v.fermate > visti) {
    // la fermata e' annunciata: si lascia arrivare il carrello e si fotografa
    await new Promise((r) => setTimeout(r, 4000));
    const w = await velo();
    visti = v.fermate;
    await p.screenshot({ path: path.join(CARTELLA, "fermata_" + visti + ".jpg"), type: "jpeg", quality: 80 });
    giudizi.push({ fermata: visti, stato: w && w.stato, inqVisibile: w && w.inqVisibile, stessaImmagine: w && w.stessaImmagine });
    console.log(ora() + "  FERMATA " + visti + ": " + JSON.stringify(giudizi[giudizi.length - 1]));
  }
  if (v && v.fine) { await new Promise((r) => setTimeout(r, 3000)); await p.screenshot({ path: path.join(CARTELLA, "dopo_la_regia.jpg"), type: "jpeg", quality: 80 }); break; }
  await new Promise((r) => setTimeout(r, 700));
}
const fin = await p.evaluate(() => ({ nomi: window.__prova.nomi, sedute: (window.__veritasSedute || []).length,
  giroGia: window.__veritasGiroInCorso })).catch((e) => ({ errore: e.message }));
const v = await velo();
console.log(ora() + "  ESITO: " + JSON.stringify({ fermate: giudizi.length, tutteOggetti: giudizi.every((g) => g.stato === "oggetti"),
  tutteStessaImmagine: giudizi.every((g) => g.stessaImmagine), etichette: v && v.etichette, sedute: fin.sedute }));
for (const n of fin.nomi || []) console.log("      " + n.ragionamento);
await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 15000))]).catch(() => {});
process.exit(0);
