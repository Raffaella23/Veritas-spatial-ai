// Sonda: quali dati veri esistono durante l'apertura, e QUANDO arrivano.
// Serve a costruire gli stati della pagina di attesa solo su cose misurate.
//   node sonda_stati.mjs            (versione pubblicata)
//   DAL_WORKSPACE=1 node sonda_stati.mjs
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.join(qui, "..", "ws");
const URL_PAGINA = "https://raffaella23.github.io/Veritas-spatial-ai/";
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const ISTANTI = (process.env.ISTANTI || "20,60,150,300,420").split(",").map(Number);
const t0 = Date.now();
const secondi = () => ((Date.now() - t0) / 1000).toFixed(0) + "s";
const USCITA = path.join(qui, process.env.USCITA || "sonda.txt");
fs.writeFileSync(USCITA, "");
const scrivi = (r) => fs.appendFileSync(USCITA, r + "\n");

const ctx = await chromium.launchPersistentContext(path.join(qui, "profilo"), {
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true, viewport: { width: 1600, height: 900 },
  args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
await ctx.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js", (r) =>
  r.fulfill({ status: 200, path: path.join(WS, "banco", "finti", "supabase_finto.js"), headers: { "content-type": "text/javascript" } }));
const TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".glb": "model/gltf-binary", ".png": "image/png", ".svg": "image/svg+xml" };
if (process.env.DAL_WORKSPACE === "1") {
  const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
  await ctx.route((url) => url.href.startsWith(BASE), (r) => {
    const u = new URL(r.request().url());
    const rel = decodeURIComponent(u.pathname.slice("/Veritas-spatial-ai/".length)) || "index.html";
    const f = path.join(WS, rel);
    if (f.startsWith(WS) && fs.existsSync(f) && fs.statSync(f).isFile())
      return r.fulfill({ status: 200, path: f, headers: { "content-type": TIPI[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" } });
    return r.continue();
  });
}
const p = ctx.pages()[0] || await ctx.newPage();
p.on("console", (m) => {
  const t = m.text();
  if (/\[VERITAS (apertura|occhio|cammino|norme|segnaletica|accessi)|\[VERITAS\] Ho riconosciuto|PAGEERROR/.test(t) || m.type() === "error")
    scrivi(secondi() + " " + m.type()[0] + " " + t.replace(/\s+/g, " ").slice(0, 300));
});
p.on("pageerror", (e) => scrivi(secondi() + " PAGEERROR " + e.message));

await p.goto(URL_PAGINA + "?cb=" + Date.now(), { waitUntil: "load", timeout: 90000 });
scrivi(secondi() + " costruzione: " + await p.evaluate(() => window.__EIDETICA_COSTRUZIONE));
await p.waitForSelector("#v-pick-file", { timeout: 60000 });
const [scelta] = await Promise.all([p.waitForEvent("filechooser", { timeout: 30000 }), p.click("#v-pick-file")]);
await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "sonda stati").catch(() => {});
await p.evaluate(() => { const b = [...document.querySelectorAll("button,label,div,span")].find((x) => x.offsetParent !== null && /^(Airport|Aeroporto)$/.test((x.textContent || "").trim())); if (b) b.click(); });
await p.click("#v-create-btn").catch((e) => scrivi("crea: " + e.message));
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).then(() => p.click("#vs-start-btn")).catch(() => {});
await p.waitForFunction(() => !!window.__veritasModelRoot, null, { timeout: 180000 });
const tModello = Date.now();
scrivi(secondi() + " modello in scena");

function sonda() {
  const forma = (o, prof = 0) => {
    if (o == null) return String(o);
    if (Array.isArray(o)) return "[" + o.length + "]" + (o.length && prof < 2 ? " es: " + forma(o[0], prof + 1) : "");
    if (typeof o === "object") {
      const k = Object.keys(o).slice(0, 24);
      if (prof >= 2) return "{" + k.join(",") + "}";
      return "{" + k.map((c) => c + ":" + (typeof o[c] === "object" && o[c] ? forma(o[c], prof + 1) : typeof o[c] === "number" ? Math.round(o[c] * 100) / 100 : typeof o[c] === "string" ? JSON.stringify(o[c].slice(0, 40)) : typeof o[c])).join(", ") + "}";
    }
    return typeof o === "number" ? String(Math.round(o * 100) / 100) : JSON.stringify(String(o).slice(0, 60));
  };
  const W = window, out = {};
  for (const g of ["__veritasPercezione", "__veritasMisure", "__veritasSegnaletica", "__veritasSegnaleticaTrovata", "__veritasVistoNelMondo",
    "__veritasAccessi", "__veritasNavmeshEsito", "__veritasComprensione", "__veritasIrraggiungibili", "__veritasTrattiForzati",
    "__veritasGiroInCorso", "__veritasVisteOcchio", "__veritasCoseTrovate", "__veritasLuoghiVisti", "__veritasVerdict", "__veritasOcchiEsito"]) {
    try { out[g.replace("__veritas", "")] = forma(W[g]); } catch (e) { out[g] = "errore " + e.message; }
  }
  try { out.apertura = JSON.stringify(W.__veritasApertura && W.__veritasApertura.stato()).slice(0, 300); } catch (e) {}
  try { if (W.__veritasNormative && W.__veritasMisure) out.norme = forma(W.__veritasNormative.valuta(W.__veritasMisure)); } catch (e) { out.norme = "errore " + e.message; }
  try { out.nodi = (W.__veritasGetNodes() || []).map((n) => n.label + "|" + n.origine).slice(0, 12).join(" ; "); } catch (e) {}
  return out;
}
for (const s of ISTANTI) {
  const attesa = tModello + s * 1000 - Date.now();
  if (attesa > 0) await p.waitForTimeout(attesa);
  const r = await p.evaluate(sonda).catch((e) => ({ errore: e.message }));
  scrivi("\n===== " + s + " s dopo il modello (" + secondi() + ")");
  for (const [k, v] of Object.entries(r)) scrivi("  " + k + ": " + String(v).slice(0, 700));
}
scrivi("fine " + secondi());
await ctx.close();
