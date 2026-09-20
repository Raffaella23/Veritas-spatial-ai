// Prova della PAGINA DI ATTESA (veritas_apertura.js) col codice del workspace:
// carica un modello dal pulsante «Nuovo progetto», fotografa il velo a istanti
// dati, registra gli stati e ogni errore di pagina.
//   MODELLO=... SCATTI=3,10,22,34,48 LINGUA=it node prova_attesa.mjs
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.join(qui, "..", "ws");
const URL_PAGINA = "https://raffaella23.github.io/Veritas-spatial-ai/";
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const SCATTI = (process.env.SCATTI || "3,10,22,34,48").split(",").map(Number);
const CARTELLA = path.join(qui, process.env.CARTELLA || "scatti");
const LINGUA = process.env.LINGUA || "it";
fs.mkdirSync(CARTELLA, { recursive: true });
for (const f of fs.readdirSync(CARTELLA)) fs.unlinkSync(path.join(CARTELLA, f));
const t0 = Date.now();
const secondi = () => ((Date.now() - t0) / 1000).toFixed(0) + "s";
const USCITA = path.join(CARTELLA, "registro.txt");
const scrivi = (r) => fs.appendFileSync(USCITA, r + "\n");

const ctx = await chromium.launchPersistentContext(path.join(qui, process.env.PROFILO || "profilo"), {
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true, viewport: { width: Number(process.env.LARGO || 1600), height: Number(process.env.ALTO || 900) },
  args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
await ctx.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js", (r) =>
  r.fulfill({ status: 200, path: path.join(WS, "banco", "finti", "supabase_finto.js"), headers: { "content-type": "text/javascript" } }));
const TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".glb": "model/gltf-binary", ".png": "image/png", ".webp": "image/webp" };
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
await ctx.route((url) => url.href.startsWith(BASE), (r) => {
  const u = new URL(r.request().url());
  const rel = decodeURIComponent(u.pathname.slice("/Veritas-spatial-ai/".length)) || "index.html";
  const f = path.join(WS, rel);
  if (f.startsWith(WS) && fs.existsSync(f) && fs.statSync(f).isFile())
    return r.fulfill({ status: 200, path: f, headers: { "content-type": TIPI[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" } });
  return r.continue();
});
const p = ctx.pages()[0] || await ctx.newPage();
await p.addInitScript((l) => { try { localStorage.setItem("veritasLang", l); } catch (e) {} }, LINGUA);
p.on("console", (m) => {
  const t = m.text();
  if (/\[VERITAS apertura\]|\[VAIO Splat\]|\[VERITAS occhio\] nel mondo/.test(t) || m.type() === "error")
    scrivi(secondi() + " " + m.type()[0] + " " + t.replace(/\s+/g, " ").slice(0, 300));
});
p.on("pageerror", (e) => scrivi(secondi() + " PAGEERROR " + e.message + " | " + String(e.stack || "").split("\n").slice(1, 3).join(" <- ").replace(/https:\/\/raffaella23\.github\.io\/Veritas-spatial-ai\//g, "")));

await p.goto(URL_PAGINA + "?cb=" + Date.now(), { waitUntil: "load", timeout: 90000 });
scrivi(secondi() + " costruzione: " + await p.evaluate(() => window.__EIDETICA_COSTRUZIONE));
await p.waitForSelector("#v-pick-file", { timeout: 60000 });
const [scelta] = await Promise.all([p.waitForEvent("filechooser", { timeout: 30000 }), p.click("#v-pick-file")]);
await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "prova attesa").catch(() => {});
await p.click("#v-create-btn").catch((e) => scrivi("crea: " + e.message));
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).then(() => p.click("#vs-start-btn")).catch(() => {});
await p.waitForFunction(() => !!window.__veritasModelRoot, null, { timeout: 180000 });
const tModello = Date.now();
scrivi(secondi() + " modello in scena");
if (process.env.VALUTA) scrivi("VALUTA " + JSON.stringify(await p.evaluate(process.env.VALUTA).catch((e) => "errore " + e.message)).slice(0, 1500));
for (const s of SCATTI) {
  const attesa = tModello + s * 1000 - Date.now();
  if (attesa > 0) await p.waitForTimeout(attesa);
  const st = await p.evaluate(() => window.__veritasApertura && window.__veritasApertura.stato()).catch((e) => ({ errore: e.message }));
  const nome = String(s).padStart(4, "0") + "s_" + (st && st.stato ? st.stato : st && st.aperta === false ? "chiusa" : "x") + ".jpg";
  await p.screenshot({ path: path.join(CARTELLA, nome), type: "jpeg", quality: 82 });
  const breve = st && st.report ? { stato: st.stato, successione: st.successione, splat: st.splat, accese: st.accese.length, conf: st.accese.filter((z) => z.confermata).length, viste: st.viste,
    righe: st.report.righe.map((r) => r.k + ": " + r.v), note: st.report.note.map((n) => n.t) } : st;
  scrivi("\n== " + s + " s — " + nome + "\n" + JSON.stringify(breve, null, 1).slice(0, 1800));
}
if (process.env.ENTRA === "1") {
  await p.evaluate(() => window.__veritasApertura && window.__veritasApertura.chiudi("prova"));
  await p.waitForTimeout(2500);
  await p.screenshot({ path: path.join(CARTELLA, "dopo_entra.jpg"), type: "jpeg", quality: 82 });
  const info = await p.evaluate(() => ({ velo: !!document.querySelector("[data-veritas-apertura]"), zone: (window.__veritasPercezione && window.__veritasPercezione.zones || []).length, varchi: (window.__veritasPercezione && window.__veritasPercezione.gateways || []).length, verdetto: window.__veritasVerdict && window.__veritasVerdict.motivo }));
  scrivi("dopo Entra: " + JSON.stringify(info));
}
scrivi("fine " + secondi());
await ctx.close();
