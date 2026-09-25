// QUANTO COSTA UNO SGUARDO DELL'OCCHIO (§6.14, 24/09): una chiamata a OWLv2 su
// un'immagine, con 1 parola e con 9, misurata nella pagina vera (nessun modello
// caricato: si misura solo l'occhio). Serve a decidere in quanti pezzi si puo'
// tagliare una pianta senza fermare il giro.
//
//   DAL_WORKSPACE=1 node banco/vivo/quanto_costa_uno_sguardo.mjs
//
// LIMITI: 4 minuti per accendere l'occhio, 2 per ogni sguardo.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.join(qui, "..", "..");
const DAL_WS = process.env.DAL_WORKSPACE === "1";
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
const ctx = await chromium.launchPersistentContext(
  path.join(qui, process.env.PROFILO || (DAL_WS ? "profilo_ws" : "profilo_pub")), {
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true, viewport: { width: 1600, height: 900 },
    args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
await ctx.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js", (r) =>
  r.fulfill({ status: 200, path: path.join(WS, "banco", "finti", "supabase_finto.js"),
              headers: { "content-type": "text/javascript" } }));
const TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
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
await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 90000 });
const r = await p.evaluate(async () => {
  const m = await import("./veritas_riconosce.js?v=13");
  const t0 = performance.now();
  const rileva = await Promise.race([m.occhioLocale(), new Promise((res) => setTimeout(() => res(null), 240000))]);
  const acceso = performance.now() - t0;
  if (!rileva) return { acceso, errore: JSON.stringify(m.stato()) };
  const tela = document.createElement("canvas"); tela.width = 960; tela.height = 960;
  const g = tela.getContext("2d"); g.fillStyle = "#eceff1"; g.fillRect(0, 0, 960, 960);
  g.fillStyle = "#e0218a"; g.fillRect(400, 450, 160, 50);
  const misura = async (parole) => { const a = performance.now();
    await Promise.race([rileva(tela, parole), new Promise((res) => setTimeout(res, 120000))]);
    return Math.round(performance.now() - a); };
  const uno = await misura(["a directional floor arrow"]);
  const uno2 = await misura(["a directional floor arrow"]);
  const nove = await misura(["a directional floor arrow", "a door", "a wall", "a turnstile", "a fence",
    "a railing", "a bannister", "a windowpane", "a screen door"]);
  return { acceso: Math.round(acceso), stato: m.stato(), unaParola: uno, unaParolaDiNuovo: uno2, noveParole: nove,
           isolata: self.crossOriginIsolated, fili: navigator.hardwareConcurrency };
});
console.log(JSON.stringify(r, null, 1));
await Promise.race([ctx.close(), new Promise((res) => setTimeout(res, 15000))]).catch(() => {});
process.exit(0);
