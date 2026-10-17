// IL PACCHETTO DEL PROGETTO (16/10/2026, HANDOFF §13.3: «due pezzi che si parlano con un file solo»).
// Il cervello e' EIDETICA sul PC, la pagina pubblicata: si apre l'aeroporto da /quest come nel
// visore (il modello si apre e la simulazione parte da soli), l'occhio guarda (la regia), le
// persone camminano. Questo strumento NON calcola niente: REGISTRA quello che la pagina fa e lo
// scrive in un file solo, che il visore apre e basta.
//   - la scala (il righello umano, §0.6: prima la scala, poi tutto il resto)
//   - il velo: l'ultimo report di ogni stato (zone, oggetti, conformita', orientamento), in inglese
//   - la regia dell'occhio: ogni fermata (con la sua immagine, rimpicciolita) e ogni nome
//   - i percorsi delle persone: i fotogrammi della traiettoria in uso, col profilo di ognuno.
//     ⚠️ La traiettoria arriva in piu' versioni (§6.17: il filtro del corpo arriva in fondo solo
//     quando il giro si calma). Si tengono la PRIMA completa («personePiano») e l'ULTIMA
//     («persone»), con i metri camminati di ognuna: misurato il 16/10, nell'ultima le persone
//     facevano 4-25 m in 400 s, nella prima 300-480 m.
//   - la matrice del modello: dal sistema del file (quello del plastico) ai metri della pagina
// Criterio (deciso PRIMA): regia finita con almeno un tipo nominato; traiettoria con >= 20
// persone e >= 200 fotogrammi, ferma da 40 s; matrice letta. Tetto: 15 minuti.
// ⚠️ Senza scheda video uno sguardo dell'occhio costa 15-30 s invece di 11: la regia ha un tetto
// suo di 360 s («la rete sotto, non l'obiettivo») e qui si fermava a 64 fermate su 74. Il tetto si
// alza a 600 s (window.__veritasRegiaTetto, gia' previsto da veritas_regia.js): cambia solo
// QUANTO l'occhio fa in tempo a guardare, non come guarda.
//
//   node strumenti/fai_pacchetto.mjs            -> public_progetto/pacchetto.json
//   (BASE=<indirizzo> per un'altra copia della pagina, PROFILO=<cartella> per il profilo di Chrome)
import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || "https://raffaella23.github.io/Veritas-spatial-ai/";
const FINTO = path.resolve(qui, "..", "..", "banco", "finti", "supabase_finto.js");
const USCITA = process.env.USCITA ? path.resolve(process.env.USCITA) : path.resolve(qui, "..", "public_progetto", "pacchetto.json");
const WS = process.env.WS ? path.resolve(process.env.WS) : null;   // 17/10: la pagina del CLONE di lavoro, non la pubblicata
const PROFILO = process.env.PROFILO || path.join(os.tmpdir(), "eidetica_profilo_pacchetto");
const TETTO_MIN = Number(process.env.TETTO) || 15;
const t0 = Date.now(), ora = () => String(Math.round((Date.now() - t0) / 1000)).padStart(4) + "s";
const aspetta = (ms) => new Promise((r) => setTimeout(r, ms));
let ctx = null;
setTimeout(async () => { console.log(ora() + " TETTO " + TETTO_MIN + " minuti: fermo, nessun pacchetto scritto"); try { await ctx.close(); } catch (e) {} process.exit(2); }, TETTO_MIN * 60 * 1000);

ctx = await chromium.launchPersistentContext(PROFILO, {
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true, viewport: { width: 1600, height: 900 },
  args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
// l'accesso finto del banco (la pagina chiede di entrare): nessun dato va su Supabase
await ctx.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js", (r) =>
  r.fulfill({ status: 200, path: FINTO, headers: { "content-type": "text/javascript" } }));

// dentro la pagina: si ascoltano gli eventi che la regia annuncia gia' (veritas_regia.js) e si
// legge lo stato del velo; le immagini dell'occhio si rimpiccioliscono a 224 px (il visore le
// mostra su una scheda di 20 cm: bastano, e il pacchetto resta leggero)
await ctx.addInitScript((tetto) => {
  window.__veritasRegiaTetto = tetto;
  const P = window.__pacchetto = { t0: performance.now(), fermate: [], nomi: [], stati: [], ultimo: {}, regia: null };
  const ts = () => +((performance.now() - P.t0) / 1000).toFixed(2);
  const vet = (v) => !v ? null : Array.isArray(v) ? v.slice(0, 3).map((x) => +(+x).toFixed(3))
    : (v.x != null ? [+v.x.toFixed(3), +(v.y || 0).toFixed(3), +(v.z != null ? v.z : 0).toFixed(3)] : null);
  const piccola = (url, lato) => new Promise((res) => {
    const im = new Image();
    im.onload = () => { const s = lato / Math.max(im.width, im.height), c = document.createElement("canvas");
      c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", 0.72)); };
    im.onerror = () => res(null); im.src = url;
  });
  addEventListener("veritas:fermata", async (e) => {
    const d = e.detail || {}, c = d.camera;
    const f = { t: ts(), indice: d.indice, quante: d.quante, centro: vet(d.centro), min: vet(d.min), max: vet(d.max),
      copie: d.copie, conferma: !!d.conferma,
      camera: c && c.mondo ? { mondo: c.mondo.map((x) => +(+x).toFixed(4)) } : null };   // istantaneaDellaCamera (veritas_vista.js)
    P.fermate.push(f);
    if (d.immagine) f.immagine = await piccola(d.immagine, 224);
  });
  addEventListener("veritas:nome", (e) => {
    const d = e.detail || {};
    P.nomi.push({ t: ts(), indice: d.indice, quante: d.quante, nome: d.nome, termine: d.termine, postura: d.postura,
      fiducia: d.fiducia, copie: (d.copie || []).map(vet), misura: d.misura, affordance: d.affordance,
      ragionamento: d.ragionamento, foglio: d.foglio, min: vet(d.min), max: vet(d.max) });
  });
  addEventListener("veritas:regia", (e) => { const d = e.detail || {}; if (d.fase === "fine") P.regia = { t: ts(), ok: d.ok !== false, ms: d.ms, perche: d.perche || null }; });
  setInterval(() => {
    try {
      const s = window.__veritasApertura && window.__veritasApertura.stato();
      if (!s || !s.aperta) return;
      const prima = P.stati[P.stati.length - 1];
      if (!prima || prima.stato !== s.stato) P.stati.push({ t: ts(), stato: s.stato });
      if (s.report) P.ultimo[s.stato] = { t: ts(), report: s.report };
    } catch (e) {}
  }, 500);
}, Number(process.env.REGIA_TETTO) || 600000);

const p = ctx.pages()[0] || await ctx.newPage();
let righello = null;
p.on("pageerror", (e) => console.log(ora() + " PAGEERROR " + String(e).slice(0, 160)));
p.on("console", (m) => {
  const t = m.text();
  const r = t.match(/RIGHELLO UMANO[^:]*: (\d+) persone in piedi, alte ([\d.]+) m.*?a ([\d.]+) m serve ([\d.]+)x/);
  if (r) righello = { figure: +r[1], alteNelFile: +r[2], uomo: +r[3], fattore: +r[4] };
  if (/\[VERITAS (regia|scala)\]|Traiettoria aggiornata|generatore/i.test(t)) console.log(ora() + " " + t.slice(0, 180));
});
if (WS) await ctx.route((u) => u.href.startsWith(BASE), (r) => { const u = new URL(r.request().url()); const rel = decodeURIComponent(u.pathname.slice("/Veritas-spatial-ai/".length)) || "index.html"; const f = path.resolve(WS, rel); const T = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript", ".json": "application/json", ".glb": "model/gltf-binary", ".png": "image/png", ".svg": "image/svg+xml", ".css": "text/css" }; if (f.startsWith(WS) && fs.existsSync(f) && fs.statSync(f).isFile()) return r.fulfill({ status: 200, path: f, headers: { "content-type": T[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" } }); return r.continue(); });
await p.goto(BASE + "quest/index.html?cb=" + Date.now(), { waitUntil: "load", timeout: 120000 });
await p.waitForFunction(() => window.__EIDETICA_COSTRUZIONE, null, { timeout: 120000 });
const costruzione = await p.evaluate(() => window.__EIDETICA_COSTRUZIONE);
console.log(ora() + " pagina " + costruzione);

// le persone di una versione della traiettoria, in forma compatta (centimetri, una lettera di stato)
const estraiPersone = () => p.evaluate(() => {
  const r2 = (v) => Math.round(v * 100);
  const tr = window.__veritasGetTrajectory();
  const frames = tr.frames;
  const tempi = frames.map((f) => +(+f.t).toFixed(2));
  const perId = new Map();
  frames.forEach((f, k) => {
    for (const a of f.agents || []) {
      if (!a || !a.pos) continue;
      let g = perId.get(a.id);
      if (!g) { g = { id: a.id, profilo: a.archetype || a.archetipo || null, k0: k, xyz: [], st: "" }; perId.set(a.id, g); }
      const manca = k - (g.k0 + g.st.length);     // un buco nel mezzo: si tiene l'ultimo punto
      for (let i = 0; i < manca; i++) { g.xyz.push(...g.xyz.slice(-3)); g.st += g.st.slice(-1); }
      g.xyz.push(r2(a.pos[0]), r2(a.pos[1]), r2(a.pos[2]));
      const st = String(a.state || "").toUpperCase();
      g.st += a.seduto ? "S" : st.startsWith("MOV") ? "M" : st.startsWith("WAIT") ? "W" : st.startsWith("ARR") ? "A" : "I";
    }
  });
  for (const g of perId.values()) if (!g.profilo && window.__veritasSchedaAgente) {
    try { const sc = window.__veritasSchedaAgente(g.id); if (sc && sc.archetipo) g.profilo = sc.archetipo; } catch (e) {}
  }
  const agenti = [...perId.values()].sort((a, b) => a.id - b.id);
  const metri = agenti.map((g) => { let L = 0; for (let i = 3; i < g.xyz.length; i += 3) L += Math.hypot(g.xyz[i] - g.xyz[i - 3], g.xyz[i + 2] - g.xyz[i - 1]) / 100; return Math.round(L); }).sort((a, b) => a - b);
  return { versione: tr.__versioneFotogrammi || null, tempi, durata: tempi[tempi.length - 1], agenti,
    metriMediani: metri.length ? metri[metri.length >> 1] : 0 };
});
const versioni = [];
// si aspetta la fine della regia e una traiettoria che non cambia piu' da 40 s
let ultimaFirma = null, fermaDa = Date.now(), ultimoAvviso = 0, versioneOcchio = null;
for (;;) {
  await aspetta(3000);
  const s = await p.evaluate(() => {
    const tr = window.__veritasGetTrajectory && window.__veritasGetTrajectory();
    const f = (tr && tr.frames) || [];
    const ids = new Set(); for (const x of f) for (const a of x.agents || []) ids.add(a.id);
    return { regia: window.__pacchetto.regia, fermate: window.__pacchetto.fermate.length, nomi: window.__pacchetto.nomi.length,
      fotogrammi: f.length, persone: ids.size, versione: tr && tr.__versioneFotogrammi, ultimo: f.length ? f[f.length - 1].t : null,
      stato: (window.__pacchetto.stati[window.__pacchetto.stati.length - 1] || {}).stato,
      // 17/10: anche il giro dell occhio sulle piante deve essere finito (la mappa si rifa dopo di lui)
      occhio: !!(window.__veritasComando && window.__veritasComando.stato && window.__veritasComando.stato().giri >= 1) };
  });
  const firma = [s.fotogrammi, s.persone, s.versione, s.ultimo].join("|");
  if (firma !== ultimaFirma) { ultimaFirma = firma; fermaDa = Date.now();
    if (s.fotogrammi >= 200 && s.persone >= 20) { const v = await estraiPersone(); versioni.push(v);
      console.log(ora() + " traiettoria versione " + v.versione + ": " + v.agenti.length + " persone, " + v.tempi.length + " fotogrammi, mediana " + v.metriMediani + " m camminati a testa"); } }
  if (Date.now() - ultimoAvviso > 30000) { ultimoAvviso = Date.now();
    console.log(ora() + " velo " + s.stato + " · fermate " + s.fermate + " · nomi " + s.nomi + " · regia " + (s.regia ? "finita" : "in corso")
      + " · fotogrammi " + s.fotogrammi + " · persone " + s.persone + " · versione " + s.versione); }
  // 17/10: dopo il giro dell occhio deve arrivare una versione NUOVA della traiettoria (la mappa rifatta)
  if (s.occhio && versioneOcchio == null) { versioneOcchio = s.versione || 0; console.log(ora() + " giro dell occhio cominciato: si aspetta una traiettoria dopo la versione " + versioneOcchio); }
  const dopoOcchio = process.env.SENZA_OCCHIO || (versioneOcchio != null && (s.versione || 0) > versioneOcchio);
  if (s.regia && dopoOcchio && s.persone >= 20 && s.fotogrammi >= 200 && Date.now() - fermaDa > 40000) break;
}
// e il velo fino al suo ultimo stato (l'orientamento arriva ~9 s dopo la conformita'), al massimo 45 s
for (let i = 0; i < 15; i++) {
  if (await p.evaluate(() => !!window.__pacchetto.ultimo.orientamento || !(window.__veritasApertura && window.__veritasApertura.stato().aperta))) break;
  await aspetta(3000);
}

// la lettura finale: scala, velo, regia, persone, matrice del modello
const dati = await p.evaluate(() => {
  const P = window.__pacchetto, r2 = (v) => Math.round(v * 100);
  const root = window.__veritasModelRoot;
  root.updateMatrixWorld(true);
  return {
    matrice: root.matrixWorld.elements.map((x) => +x.toFixed(6)),
    fattoreRadice: root.scale ? root.scale.x : null,
    lingua: (() => { try { return localStorage.getItem("veritasLang") || "en"; } catch (e) { return "en"; } })(),
    velo: { successione: P.stati, report: P.ultimo },
    regia: { fine: P.regia, fermate: P.fermate, nomi: P.nomi },
    sedute: (window.__veritasSedute || []).length,
    // 17/10 sera: le missioni e gli esiti della folla, per sapere chi non parte e perche'
    folla: (() => { const F = window.__veritasFollaUltima; if (!F) return null; const r = (v) => v.map((x) => +(+x).toFixed(2));
      return { missioni: F.missioni.map((m) => ({ nome: m.nome, tappe: m.tappe.map((t) => ({ nome: t.nome || null, pos: r(t.pos) })) })),
        accessi: { passaggi: F.accessi.passaggi.map((a) => ({ nome: a.nome, pos: r(a.pos) })), fuori: F.accessi.fuori.map((a) => ({ nome: a.nome, pos: r(a.pos) })) },
        esiti: F.esiti, persone: F.persone }; })(),
  };
});
const ultima = await estraiPersone();
if (!versioni.length || versioni[versioni.length - 1].versione !== ultima.versione) versioni.push(ultima);
dati.persone = ultima;
dati.personePiano = versioni[0].versione !== ultima.versione ? versioni[0] : null;
const pacchetto = {
  formato: "eidetica-pacchetto-1",
  fatto: new Date().toISOString(),
  pagina: { costruzione, indirizzo: BASE + "quest/", modello: "airport_foot_traffic.glb" },
  scala: righello,
  modello: { matrice: dati.matrice, fattoreRadice: dati.fattoreRadice, nota: "dal sistema del file (quello del plastico) ai metri della pagina" },
  lingua: dati.lingua,
  velo: dati.velo,
  regia: dati.regia,
  sedute: dati.sedute,
  folla: dati.folla,                 // missioni ed esiti della folla (null col generatore di prima)
  persone: dati.persone,             // l'ultima versione della traiettoria (col corpo, quando il filtro ha finito)
  personePiano: dati.personePiano,   // la prima completa (il piano), se diversa
  versioni: versioni.map((v) => ({ versione: v.versione, fotogrammi: v.tempi.length, metriMediani: v.metriMediani })),
};
fs.mkdirSync(path.dirname(USCITA), { recursive: true });
fs.writeFileSync(USCITA, JSON.stringify(pacchetto));
const kb = Math.round(fs.statSync(USCITA).size / 1024);
const nominati = dati.regia.nomi.filter((n) => n.nome).length;
const ok = !!dati.regia.fine && nominati > 0 && dati.persone.agenti.length >= 20 && dati.persone.tempi.length >= 200 && dati.matrice.length === 16;
console.log(ora() + " pacchetto: " + kb + " KB · scala " + JSON.stringify(righello) + " · velo " + dati.velo.successione.map((s) => s.stato).join(">")
  + " · fermate " + dati.regia.fermate.length + " (" + dati.regia.fermate.filter((f) => f.immagine).length + " con immagine) · tipi nominati "
  + nominati + "/" + dati.regia.nomi.length + " · sedute " + dati.sedute + " · persone " + dati.persone.agenti.length
  + " · fotogrammi " + dati.persone.tempi.length + " (" + dati.persone.durata + " s) · lingua " + dati.lingua
  + " · cammino: " + versioni.map((v) => "v" + v.versione + " " + v.metriMediani + " m").join(", "));
console.log(ora() + (ok ? " RIUSCITO" : " NON RIUSCITO") + " -> " + USCITA);
await ctx.close();
process.exit(ok ? 0 : 1);
