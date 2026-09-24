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
const WS = process.env.RADICE || path.join(qui, "..", "..");
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

const ctx = await chromium.launchPersistentContext(path.join(qui, process.env.PROFILO || "profilo_conta_tappe"), {
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
  if (/\[VERITAS (percorso|cose|zone|montaggio\] (giro|[0-9]+ tappe|le [0-9]+ tappe))/.test(t)) console.log(ora() + "  " + t.slice(0, 230)); });
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
await p.fill("#v-new-name", "conta tappe").catch(() => {});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).then(() => p.click("#vs-start-btn")).catch(() => {});

async function istantanea(etichetta) {
  const r = await conTetto(p.evaluate((R) => {
    const nodi = (window.__veritasGetNodes ? window.__veritasGetNodes() : []) || [];
    const posti = ((window.__veritasCoseTrovate || {}).posti || []);
    const centro = (q) => q.centro || q.pos || q.baricentro || null;
    const coperti = posti.filter((q) => {
      const c = centro(q); if (!c) return false;
      return nodi.some((n) => n.pos && Math.hypot(n.pos[0] - c[0], n.pos[2] - c[2]) <= R);
    }).length;
    const xs = nodi.filter((n) => n.pos && !n.escluso).map((n) => n.pos[0]);
    return {
      tappe: nodi.length, escluse: nodi.filter((n) => n.escluso).length,
      suCose: nodi.filter((n) => n.suCosa).length,
      postiMisurati: posti.length, postiConTappa: coperti,
      striscia: xs.length ? +(Math.max(...xs) - Math.min(...xs)).toFixed(1) : 0,
      ambienti: (window.__veritasAutoZones || []).length,
    };
  }, RAGGIO), 30000, etichetta).catch((e) => ({ errore: e.message }));
  console.log(ora() + "  " + etichetta.toUpperCase() + ": " + JSON.stringify(r));
}

await new Promise((r) => setTimeout(r, Number(process.env.PRIMA_MS || 90000)));
await istantanea("a meta' giro");
const fine = Date.now() + Number(process.env.TETTO_GIRO_MS || 300000);
while (Date.now() < fine) {
  const c = await conTetto(p.evaluate(() => !!window.__veritasComprensione), 15000, "giro").catch(() => false);
  if (c) break;
  await new Promise((r) => setTimeout(r, 5000));
}
await istantanea("a fine giro");
await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 15000))]).catch(() => {});
process.exit(0);
