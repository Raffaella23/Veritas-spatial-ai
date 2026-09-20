// Prova dal vivo della VERSIONE PUBBLICATA, nel workspace: Chrome senza finestra,
// profilo usa-e-getta, accesso finto (lo stub di Supabase del banco), modello
// preso da Pages, occhio vero. Limiti espliciti: 14 minuti al massimo.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.join(qui, "..", "ws");
const URL_PAGINA = "https://raffaella23.github.io/Veritas-spatial-ai/";
const TETTO_MS = 9 * 60 * 1000;
const t0 = Date.now();
const secondi = () => ((Date.now() - t0) / 1000).toFixed(0) + "s";
const righe = [];
const scrivi = (r) => { righe.push(r); fs.appendFileSync(path.join(qui, "log.txt"), r + "\n"); };
fs.writeFileSync(path.join(qui, "log.txt"), "");

const ctx = await chromium.launchPersistentContext(path.join(qui, "profilo"), {
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  viewport: { width: 1600, height: 900 },
  args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
await ctx.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js", (r) =>
  r.fulfill({ status: 200, path: path.join(WS, "banco", "finti", "supabase_finto.js"), headers: { "content-type": "text/javascript" } }));
// Il codice del WORKSPACE al posto di quello pubblicato, file per file: si prova
// prima di pubblicare. Cio' che nel workspace non c'e' arriva dalla rete.
const TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".glb": "model/gltf-binary" };
if (process.env.DAL_WORKSPACE === "1") {
  const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
  await ctx.route((url) => url.href.startsWith(BASE), (r) => {
    const u = new URL(r.request().url());
    let rel = decodeURIComponent(u.pathname.slice("/Veritas-spatial-ai/".length)) || "index.html";
    const f = path.join(WS, rel);
    if (f.startsWith(WS) && fs.existsSync(f) && fs.statSync(f).isFile())
      return r.fulfill({ status: 200, path: f, headers: { "content-type": TIPI[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" } });
    return r.continue();
  });
}
const p = ctx.pages()[0] || await ctx.newPage();
await p.addInitScript(() => {
  Error.stackTraceLimit = 400;
  window.__bancoPile = [];
  const orig = console.log.bind(console);
  console.log = (...x) => {
    try { const t = String(x[0] || ""); if (/posizioni riportate/.test(t) && window.__bancoPile.length < 4) window.__bancoPile.push(new Error("pila").stack); } catch (e) {}
    return orig(...x);
  };
});
p.on("console", (m) => { const t = m.text(); if (/VERITAS|EIDETICA/.test(t) || m.type() === "error") scrivi(secondi() + " " + m.type()[0] + " " + t.replace(/\s+/g, " ").slice(0, 400)); });
p.on("pageerror", (e) => {
  const r = String(e.stack || "").split(/\n/).map((x) => x.trim().replace(/\(https?:[^)]*?:(\d+):\d+\)/, "(riga $1)").replace(/https?:\S*?:(\d+):\d+/, "riga $1"));
  const nomi = r.map((x) => (x.match(/at (?:new )?([\w$.]+)/) || [])[1] || "anonima");
  const conta = {}; nomi.forEach((n) => { conta[n] = (conta[n] || 0) + 1; });
  scrivi(secondi() + " PAGEERROR " + e.message + " | FRAMES " + r.length
    + " | CONTEGGI " + JSON.stringify(Object.entries(conta).sort((a, b) => b[1] - a[1]).slice(0, 12))
    + " | IN FONDO: " + r.slice(-16).join(" <- "));
});

await p.goto(URL_PAGINA + "?cb=" + Date.now(), { waitUntil: "load", timeout: 90000 });
scrivi(secondi() + " costruzione: " + await p.evaluate(() => window.__EIDETICA_COSTRUZIONE));
// Il percorso vero di chi usa l'app: «+ Nuovo progetto — scegli il file».
await p.waitForSelector("#v-pick-file", { timeout: 60000 }).catch((e) => scrivi("pulsante nuovo progetto: " + e.message));
const [scelta] = await Promise.all([
  p.waitForEvent("filechooser", { timeout: 30000 }),
  p.click("#v-pick-file"),
]).catch((e) => { scrivi("scelta file: " + e.message); return [null]; });
if (scelta) await scelta.setFiles(path.join(WS, "airport_foot_traffic.glb"));
scrivi(secondi() + " file scelto dal pulsante: " + !!scelta);
// Poi nome, tipo (come il progetto di Raffaella: aeroporto) e «Crea e apri».
await p.fill("#v-new-name", "prova occhio").catch((e) => scrivi("nome: " + e.message));
await p.evaluate(() => { const b = [...document.querySelectorAll("button,label,div,span")].find((x) => x.offsetParent !== null && /^(Airport|Aeroporto)$/.test((x.textContent || "").trim())); if (b) b.click(); });
await p.click("#v-create-btn").catch((e) => scrivi("crea: " + e.message));
scrivi(secondi() + " progetto creato");
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).then(() => p.click("#vs-start-btn")).catch(() => scrivi(secondi() + " nessuna schermata impostazioni"));
const esito = await p.waitForFunction(() => !!window.__veritasModelRoot, null, { timeout: 180000 })
  .then(() => p.evaluate(() => { const T = window.THREE, r = window.__veritasModelRoot; const b = new T.Box3().setFromObject(r); const d = new T.Vector3(); b.getSize(d); return "modello in scena: " + d.x.toFixed(1) + " x " + d.z.toFixed(1) + " m (in pianta)"; }))
  .catch((e) => "modello non in scena: " + e.message);
scrivi(secondi() + " " + esito);

// PROVA DEL BUNDLE: la pagina non cade, la simulazione vera parte e muove le persone.
const T_BUNDLE = 200 * 1000;
let stato0 = await p.evaluate(() => ({
  inquadrature: (window.__veritasCameraPresets || []).map((c) => c.id),
  nodiIniziali: ((window.__veritasGetNodes && window.__veritasGetNodes()) || []).map((n) => n.label),
})).catch((e) => ({ errore: e.message }));
scrivi("SUBITO " + JSON.stringify(stato0));
while (Date.now() - t0 < T_BUNDLE) {
  await p.waitForTimeout(10000);
}
const fine = await p.evaluate(() => {
  const G = window.__veritasPassengerGroups;
  let visibili = 0; if (G && G.forEach) G.forEach((g) => { if (g && g.group && g.group.visible) visibili++; });
  return { figure: G ? G.size : null, visibili,
    inquadrature: (window.__veritasCameraPresets || []).map((c) => c.id),
    nodi: ((window.__veritasGetNodes && window.__veritasGetNodes()) || []).map((n) => n.label).slice(0, 10) };
}).catch((e) => ({ errore: e.message }));
scrivi("FINE BUNDLE " + JSON.stringify(fine));
const pile = await p.evaluate(() => (window.__bancoPile || []).map((x) => x.split(/\n/).slice(1, 9).map((r) => r.trim()).join(" <- "))).catch((e) => [e.message]);
scrivi("PILE " + JSON.stringify(pile).replace(/https:\/\/raffaella23\.github\.io\/Veritas-spatial-ai\//g, ""));
scrivi("linee rette: " + righe.filter((r) => /linea retta/.test(r)).length + " · errori di pagina: " + righe.filter((r) => /PAGEERROR/.test(r)).length);
scrivi("durata " + secondi());
await ctx.close();
