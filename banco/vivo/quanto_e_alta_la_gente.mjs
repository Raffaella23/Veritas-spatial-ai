// QUANTO E' ALTA LA GENTE: il metro del modello sono le sue figure umane.
//
// Direttiva di Raffaella (HANDOFF §0.2, acclarata mesi fa): l'uomo e' il metro.
// Se l'agente che cammina risulta piu' alto dei passeggeri disegnati dentro il
// modello, non sono bassi i soffitti: e' sbagliato il fattore di scala.
//
// Qui si mettono uno accanto all'altro, misurati:
//   · la statura delle figure umane presenti nel modello
//   · l'altezza della persona con cui la mappa di cammino decide (PERSONA)
//   · l'altezza degli agenti messi in scena
//   · il fattore di scala che il programma ha applicato al modello
// e si calcola il fattore che porterebbe le figure a una statura vera.
//
//   DAL_WORKSPACE=1 node banco/vivo/quanto_e_alta_la_gente.mjs
//
// LIMITI ESPLICITI: 3 minuti per modello e cose. Niente attese indefinite.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.join(qui, "..", "..");
const DAL_WS = process.env.DAL_WORKSPACE === "1";
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
const t0 = Date.now();
const secondi = () => ((Date.now() - t0) / 1000).toFixed(0) + "s";
const FUORI = path.join(qui, "statura.txt");
fs.writeFileSync(FUORI, "");
const scrivi = (r) => { console.log(r); fs.appendFileSync(FUORI, r + "\n"); };

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
p.on("console", (m) => { const t = m.text(); if (/scala|statura|figure ripetute/i.test(t)) scrivi("  [console] " + t); });

await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 90000 });
scrivi(secondi() + " costruzione: " + await p.evaluate(() => window.__EIDETICA_COSTRUZIONE));
await p.waitForSelector("#v-pick-file", { timeout: 60000 }).catch(() => {});
const [scelta] = await Promise.all([
  p.waitForEvent("filechooser", { timeout: 30000 }),
  p.click("#v-pick-file"),
]).catch(() => [null]);
if (scelta) await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "quanto e alta la gente").catch(() => {});
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
     && !!(window.__veritasCoseTrovate && window.__veritasCoseTrovate.cose),
  null, { timeout: 3 * 60 * 1000 }).then(() => true).catch(() => false);
if (!pronto) { scrivi(secondi() + " \u2716 modello o cose non pronti entro il tetto");
               await ctx.close(); process.exit(1); }
await p.waitForTimeout(8000);

const e = await p.evaluate(() => {
  const T = window.THREE, R = window.__veritasModelRoot;
  const CP = window.__veritasControprova, NM = window.__veritasNavmesh;
  const tutte = (window.__veritasCoseTrovate && window.__veritasCoseTrovate.cose) || [];

  // 1. LE FIGURE UMANE DISEGNATE NEL MODELLO — il campione.
  const fig = CP && CP.figure ? CP.figure(tutte) : [];
  const stature = [];
  for (const c of fig) {
    const h = c.ingombroUno ? c.ingombroUno[1] : (c.ingombro && c.ingombro.dim ? c.ingombro.dim[1] : null);
    if (h != null && isFinite(h)) for (let i = 0; i < c.quante; i++) stature.push(h);
  }
  stature.sort((a, b) => a - b);
  const med = stature.length ? stature[stature.length >> 1] : null;

  // ⚠️ `figure()` tiene solo cio' che cade nella finestra STATURA: se la scala
  //    e' sbagliata di molto, le persone vere ne escono e questo elenco e'
  //    vuoto o parziale. Quindi si misura ANCHE tutto il verticale snello,
  //    senza finestra, che e' il candidato "persona" per sola geometria.
  const snelli = tutte.filter((c) => c.forma === "verticale");
  const hSnelli = [];
  for (const c of snelli) {
    const h = c.ingombroUno ? c.ingombroUno[1] : null;
    if (h != null && isFinite(h)) for (let i = 0; i < c.quante; i++) hSnelli.push(h);
  }
  hSnelli.sort((a, b) => a - b);

  // 2. LA PERSONA CON CUI LA MAPPA DECIDE.
  const P = NM && NM.PERSONA ? NM.PERSONA : null;
  const finestra = CP && CP.STATURA ? CP.STATURA : null;

  // 3. GLI AGENTI IN SCENA.
  const agenti = [];
  if (T && window.__veritasScene) {
    window.__veritasScene.traverse((o) => {
      if (o.userData && o.userData.__veritasAgent && o.visible !== false) {
        const b = new T.Box3().setFromObject(o);
        const h = b.max.y - b.min.y;
        if (isFinite(h) && h > 0) agenti.push(h);
      }
    });
  }
  agenti.sort((a, b) => a - b);

  // 4. LA SCALA APPLICATA AL MODELLO.
  let scala = null;
  for (const k of ["__veritasScalaApplicata", "__veritasCorrezioneApplicata",
                   "__veritasScalaEsito", "__veritasUnitScale", "__veritasPassengerScale"])
    if (window[k] != null) scala = (scala || {}), scala[k] = window[k];
  let fattoreRadice = null;
  if (R) fattoreRadice = [+R.scale.x.toFixed(4), +R.scale.y.toFixed(4), +R.scale.z.toFixed(4)];

  const b = R && T ? new T.Box3().setFromObject(R) : null;
  return {
    figure: { gruppi: fig.length, persone: stature.length, mediana: med,
              min: stature[0] || null, max: stature[stature.length - 1] || null },
    snelli: { gruppi: snelli.length, pezzi: hSnelli.length,
              mediana: hSnelli.length ? hSnelli[hSnelli.length >> 1] : null,
              min: hSnelli[0] || null, max: hSnelli[hSnelli.length - 1] || null,
              decili: [0.1, 0.25, 0.5, 0.75, 0.9].map((q) =>
                hSnelli.length ? +hSnelli[Math.floor(q * (hSnelli.length - 1))].toFixed(2) : null) },
    persona: P ? { altezza: P.altezza, raggio: P.raggio, gradino: P.gradino } : null,
    finestraStatura: finestra,
    agenti: { quanti: agenti.length, mediana: agenti.length ? agenti[agenti.length >> 1] : null,
              min: agenti[0] || null, max: agenti[agenti.length - 1] || null },
    scala, fattoreRadice,
    modello: b ? { largo: b.max.x - b.min.x, alto: b.max.y - b.min.y, profondo: b.max.z - b.min.z } : null,
  };
}).catch((err) => ({ errore: String((err && err.message) || err) }));

scrivi("");
scrivi("=== QUANTO E' ALTA LA GENTE ===");
if (e.errore) { scrivi("  \u2716 " + e.errore); await ctx.close(); process.exit(1); }
const n2 = (v) => (v == null ? "?" : (+v).toFixed(2) + " m");
scrivi("  modello: " + (e.modello ? e.modello.largo.toFixed(0) + " \u00d7 " + e.modello.profondo.toFixed(0)
  + " m, alto " + e.modello.alto.toFixed(1) : "?") + " \u00b7 scala sulla radice " + JSON.stringify(e.fattoreRadice));
if (e.scala) scrivi("  scala dichiarata dal programma: " + JSON.stringify(e.scala));
scrivi("");
scrivi("  FIGURE UMANE riconosciute nel modello: " + e.figure.gruppi + " gruppi, "
  + e.figure.persone + " persone");
scrivi("    statura   mediana " + n2(e.figure.mediana) + "   da " + n2(e.figure.min) + " a " + n2(e.figure.max));
if (e.finestraStatura) scrivi("    (finestra con cui vengono riconosciute: "
  + n2(e.finestraStatura.min) + " \u2013 " + n2(e.finestraStatura.max) + ")");
scrivi("");
scrivi("  TUTTO IL VERTICALE SNELLO, senza finestra: " + e.snelli.gruppi + " gruppi, "
  + e.snelli.pezzi + " pezzi");
scrivi("    altezza   mediana " + n2(e.snelli.mediana) + "   da " + n2(e.snelli.min) + " a " + n2(e.snelli.max));
scrivi("    decili 10/25/50/75/90: " + e.snelli.decili.map((v) => n2(v)).join(" \u00b7 "));
scrivi("");
scrivi("  PERSONA con cui la mappa di cammino decide: alta "
  + (e.persona ? n2(e.persona.altezza) : "?") + ", raggio "
  + (e.persona ? n2(e.persona.raggio) : "?") + ", scalino "
  + (e.persona ? n2(e.persona.gradino) : "?"));
scrivi("  AGENTI in scena: " + e.agenti.quanti
  + (e.agenti.quanti ? ", alti mediana " + n2(e.agenti.mediana)
      + " (da " + n2(e.agenti.min) + " a " + n2(e.agenti.max) + ")" : ""));
scrivi("");
const rif = e.figure.mediana || e.snelli.mediana;
if (rif) {
  const f170 = 1.70 / rif;
  scrivi("  \u2500\u2500 IL CONFRONTO \u2500\u2500");
  scrivi("  la gente del modello misura " + n2(rif) + ", la persona della mappa "
    + (e.persona ? n2(e.persona.altezza) : "?"));
  if (e.persona) {
    const d = e.persona.altezza - rif;
    scrivi("  differenza: " + (d >= 0 ? "+" : "") + d.toFixed(2)
      + " m \u2014 la mappa cammina con qualcuno "
      + (d > 0.05 ? "PIU' ALTO" : d < -0.05 ? "piu' basso" : "alto uguale")
      + " dei passeggeri disegnati");
  }
  scrivi("  perche' la gente del modello sia alta 1,70 m, il modello va scalato \u00d7 "
    + f170.toFixed(3) + "  (e un interpiano di 1,75 m diventerebbe "
    + (1.75 * f170).toFixed(2) + " m)");
  scrivi("  se invece il modello e' giusto, per passare dove passa la gente la persona");
  scrivi("  della mappa dovrebbe essere alta " + n2(rif) + ", non "
    + (e.persona ? n2(e.persona.altezza) : "?"));
}
scrivi("durata " + secondi());
await ctx.close();
