// CHI TIENE IL FILO — §6.17, la misura che chiude.
//
// Con la scena carica i timer della pagina non scattano (setTimeout di 30 s mai
// arrivato in 8 minuti) e i messaggi dei Worker non arrivano, mentre un
// `evaluate` dall'esterno risponde: DevTools entra per interruzione anche
// dentro un compito lungo. Quindi il ciclo degli eventi e' fermo dentro UN
// compito che non finisce. Qui lo si ferma in flagranza: `Debugger.pause`
// ogni pochi secondi, si legge la pila, si riprende.
//
//   node banco/vivo/chi_tiene_il_filo.mjs            (pubblicata)
//   DAL_WORKSPACE=1 node banco/vivo/chi_tiene_il_filo.mjs
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = process.env.RADICE || path.join(qui, "..", "..");
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const DAL_WS = process.env.DAL_WORKSPACE === "1";
const CAMPIONI = Number(process.env.CAMPIONI || 20);
const OGNI_MS = Number(process.env.OGNI_MS || 5000);
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
const TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
               ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css",
               ".glb": "model/gltf-binary", ".png": "image/png", ".svg": "image/svg+xml" };
const conTetto = (pr, ms, cosa) => Promise.race([pr,
  new Promise((_, no) => setTimeout(() => no(new Error("tetto " + ms + " ms: " + cosa)), ms))]);

const ctx = await chromium.launchPersistentContext(path.join(qui, "profilo_chi_tiene"), {
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
// Battito del ciclo degli eventi: se smette, il filo e' tenuto da un compito solo.
await ctx.addInitScript(() => {
  let n = 0;
  setInterval(() => { n++; if (n % 5 === 0) console.log("[BATTITO] " + n + " s"); }, 1000);
});
const p = ctx.pages()[0] || await ctx.newPage();
let ultimoBattito = Date.now();
p.on("console", (m) => { const t = m.text();
  if (t.startsWith("[BATTITO]")) { ultimoBattito = Date.now(); return; }
  if (/\[VERITAS occhio\]|\[VERITAS compren|\[VERITAS montagg/.test(t)) console.log("  [c] " + t.slice(0, 180)); });
p.on("pageerror", (e) => console.log("  PAGEERROR " + String(e).slice(0, 200)));
p.on("crash", () => console.log("  *** CRASH ***"));

await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 120000 });
console.log("costruzione: " + await p.evaluate(() => window.__EIDETICA_COSTRUZIONE) + (DAL_WS ? " (workspace)" : " (pubblicata)"));
console.log("GPU: " + await p.evaluate(() => { try { const g = document.createElement("canvas").getContext("webgl");
  const e = g.getExtension("WEBGL_debug_renderer_info"); return g.getParameter(e.UNMASKED_RENDERER_WEBGL); } catch (e) { return "?"; } }));

await p.waitForSelector("#v-pick-file", { timeout: 60000 });
const [scelta] = await Promise.all([p.waitForEvent("filechooser", { timeout: 30000 }), p.click("#v-pick-file")]);
await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "chi tiene il filo").catch(() => {});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).then(() => p.click("#vs-start-btn")).catch(() => {});
await conTetto(p.waitForFunction(() => !!window.__veritasModelRoot, null, { timeout: 180000 }), 200000, "modello");
console.log("scena carica. Campiono la pila del filo principale " + CAMPIONI + " volte, ogni " + OGNI_MS + " ms.");

const cdp = await ctx.newCDPSession(p);
await cdp.send("Debugger.enable");
const conteggio = new Map();
for (let i = 1; i <= CAMPIONI; i++) {
  await new Promise((r) => setTimeout(r, OGNI_MS));
  const fermo = Math.round((Date.now() - ultimoBattito) / 1000);
  try {
    const pausa = new Promise((ok) => cdp.once("Debugger.paused", ok));
    await conTetto(cdp.send("Debugger.pause"), 15000, "pause");
    const ev = await conTetto(pausa, 20000, "paused");
    const pila = ev.callFrames.slice(0, 7).map((f) =>
      (f.functionName || "(anonima)") + "@" + (f.url || "").split("/").pop().split("?")[0] + ":" + (f.location.lineNumber + 1));
    await cdp.send("Debugger.resume").catch(() => {});
    const chiave = pila.slice(0, 3).join(" < ");
    conteggio.set(chiave, (conteggio.get(chiave) || 0) + 1);
    console.log(`#${i}  battito fermo da ${fermo}s  |  ${pila.join(" < ")}`);
  } catch (e) {
    console.log(`#${i}  battito fermo da ${fermo}s  |  pausa non riuscita: ${e.message}`);
  }
}
console.log("\nRIASSUNTO (le prime tre voci della pila, quante volte):");
for (const [k, v] of [...conteggio].sort((a, b) => b[1] - a[1])) console.log("  " + v + "x  " + k);
await ctx.close().catch(() => {});
process.exit(0);
