// DOVE STANNO DAVVERO LE TAPPE: si chiede al programma, una per una.
//
// ⚠️ PERCHE' ESISTE, ed e' nato da un mio errore di lettura — 21/09/2026.
//    Nel log c'e' la riga «tappe: 0 appoggiate sul pavimento», e l'avevo
//    riportata a Raffaella come «nessuna meta sta sul pavimento». E' FALSO:
//    `spostate` conta le tappe SPOSTATE in quella passata, e vale 0 anche —
//    anzi, soprattutto — quando non c'era niente da spostare perche' il gruppo
//    raggiungibile reggeva gia' (index.html, ramo `principale.length >= 2`).
//    Un contatore di correzioni letto come un contatore di difetti.
//
//    Qui non si legge piu' un log: si chiede alla mappa di cammino, per ogni
//    tappa, se quel punto sta sul calpestabile e se si raggiunge dagli altri.
//
//      DAL_WORKSPACE=1 node dove_stanno_le_tappe.mjs
//
// ⚠️ LIMITI ESPLICITI: 8 minuti in tutto, 3 per il modello e le zone.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.join(qui, "..", "..");
const DAL_WS = process.env.DAL_WORKSPACE === "1";
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
const TETTO_MS = 8 * 60 * 1000;
const t0 = Date.now();
const secondi = () => ((Date.now() - t0) / 1000).toFixed(0) + "s";
const scrivi = (r) => { console.log(r);
  fs.appendFileSync(path.join(qui, "tappe.txt"), r + "\n"); };
fs.writeFileSync(path.join(qui, "tappe.txt"), "");

const ctx = await chromium.launchPersistentContext(
  path.join(qui, process.env.PROFILO || (DAL_WS ? "profilo_ws" : "profilo_pub")), {
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true, viewport: { width: 1600, height: 900 },
    args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
await ctx.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js", (r) =>
  r.fulfill({ status: 200, path: path.join(WS, "banco", "finti", "supabase_finto.js"),
              headers: { "content-type": "text/javascript" } }));
const TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
               ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css",
               ".glb": "model/gltf-binary", ".png": "image/png", ".svg": "image/svg+xml" };
if (DAL_WS) {
  await ctx.route((url) => url.href.startsWith(BASE), (r) => {
    const u = new URL(r.request().url());
    const rel = decodeURIComponent(u.pathname.slice("/Veritas-spatial-ai/".length)) || "index.html";
    const f = path.join(WS, rel);
    if (f.startsWith(WS) && fs.existsSync(f) && fs.statSync(f).isFile())
      return r.fulfill({ status: 200, path: f, headers: {
        "content-type": TIPI[path.extname(f)] || "application/octet-stream",
        "cache-control": "no-store" } });
    return r.continue();
  });
}

const p = ctx.pages()[0] || await ctx.newPage();
p.on("pageerror", (e) => scrivi(secondi() + " PAGEERROR " + e.message));

await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 90000 });
scrivi(secondi() + " costruzione: " + await p.evaluate(() => window.__EIDETICA_COSTRUZIONE));
await p.waitForSelector("#v-pick-file", { timeout: 60000 }).catch(() => {});
const [scelta] = await Promise.all([
  p.waitForEvent("filechooser", { timeout: 30000 }),
  p.click("#v-pick-file"),
]).catch(() => [null]);
if (scelta) await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "dove stanno le tappe").catch(() => {});
await p.evaluate(() => {
  const b = [...document.querySelectorAll("button,label,div,span")]
    .find((x) => x.offsetParent !== null && /^(Airport|Aeroporto)$/.test((x.textContent || "").trim()));
  if (b) b.click();
});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 })
  .then(() => p.click("#vs-start-btn")).catch(() => {});

const pronto = await p.waitForFunction(
  () => !!window.__veritasModelRoot
     && !!(window.__veritasGetNodes && (window.__veritasGetNodes() || []).length)
     && !!(window.__veritasNavmesh && window.__veritasNavmesh.stato && window.__veritasNavmesh.stato()),
  null, { timeout: 3 * 60 * 1000 }).then(() => true).catch(() => false);
if (!pronto) { scrivi(secondi() + " \u2716 mappa di cammino o zone non pronte entro il tetto");
               await ctx.close(); process.exit(1); }

// Si lascia assestare: le tappe vengono rimesse a posto dopo la navmesh.
await p.waitForTimeout(20000);

const esito = await p.evaluate(() => {
  const nm = window.__veritasNavmesh, nodi = window.__veritasGetNodes() || [];
  const R = window.__veritasModelRoot, T = window.THREE;
  let scatola = null;
  if (R && T) { const b = new T.Box3().setFromObject(R);
    scatola = { min: b.min.toArray(), max: b.max.toArray() }; }
  const righe = nodi.map((n, i) => {
    const p = n.pos || n.position || null;
    let sul = null;
    try { const q = p && nm.sulCamminoCorrente(p, [6, 6, 6]); sul = q && q.ok ? q : null; } catch (e) {}
    return {
      i: i + 1, nome: n.label || null, origine: n.origine || null,
      pos: p ? p.map((v) => +(+v).toFixed(1)) : null,
      sulPavimento: !!sul,
      scostamento: sul && sul.punto && p
        ? +Math.hypot(sul.punto[0] - p[0], sul.punto[2] - p[2]).toFixed(2) : null,
    };
  });
  // quante coppie si raggiungono a piedi
  let coppie = 0, collegate = 0;
  for (let a = 0; a < nodi.length; a++) for (let b = a + 1; b < nodi.length; b++) {
    const pa = nodi[a].pos, pb = nodi[b].pos;
    if (!pa || !pb) continue;
    coppie++;
    try { const r = nm.percorsoCorrente(pa, pb, { aderente: false });
      if (r && !r.parziale) collegate++; } catch (e) {}
  }
  return { righe, coppie, collegate, scatola };
}).catch((e) => ({ errore: String((e && e.message) || e) }));

scrivi("");
scrivi("=== DOVE STANNO LE TAPPE ===");
if (esito.errore) scrivi("  \u2716 " + esito.errore);
else {
  const su = esito.righe.filter((r) => r.sulPavimento).length;
  scrivi("  sul calpestabile: " + su + " su " + esito.righe.length);
  for (const r of esito.righe)
    scrivi("   " + (r.sulPavimento ? "\u2714" : "\u2716") + " tappa " + r.i + " \u00b7 "
      + (r.nome || "(senza nome)") + " \u00b7 " + JSON.stringify(r.pos)
      + " \u00b7 origine " + r.origine
      + (r.scostamento != null ? " \u00b7 scostamento " + r.scostamento + " m" : ""));
  scrivi("  coppie che si raggiungono a piedi: " + esito.collegate + " su " + esito.coppie);
  if (esito.scatola) scrivi("  ingombro del modello: x " + esito.scatola.min[0].toFixed(1)
    + " \u2192 " + esito.scatola.max[0].toFixed(1) + " \u00b7 z " + esito.scatola.min[2].toFixed(1)
    + " \u2192 " + esito.scatola.max[2].toFixed(1));
}
scrivi("durata " + secondi());
await ctx.close();
