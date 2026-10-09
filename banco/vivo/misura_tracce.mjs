// BLOCCO PRIMA DEL PASSO 5 (29/09): le tracce interne e la direzione vera degli agenti.
// Misura, senza toccare niente: (a) quante persone ha TRACCE rispetto alla traiettoria,
// (b) per chi cammina, l'angolo fra la direzione degli occhi e lo spostamento vero nel secondo dopo,
// (c) se l'animazione del corpo (cammina / fermo / seduto) coincide con lo stato della traiettoria.
// Riuscita: (a) ogni persona tracciata; (b) >= 90% dei campioni in cammino entro 20 gradi; (c) >= 90% coincidenti.
//   DAL_WORKSPACE=1 node banco/vivo/misura_tracce.mjs   (tetto: 600 s)
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

const ctx = await chromium.launchPersistentContext(path.join(qui, process.env.PROFILO || "profilo_play"), {
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
  if (/\[VERITAS\] (barra|Traiettoria|avvio)|\[VERITAS (regia] finita|corpo] [0-9])|EIDETICA carta|PAGEERROR|DIAG|bridge] traiettoria remota/.test(t)) console.log(ora() + "  " + t.slice(0, 230)); });
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
await p.fill("#v-new-name", "play").catch(() => {});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).then(() => p.click("#vs-start-btn")).catch(() => {});

// Cosa si misura, nella pagina: renderer, scena, luci, modello, agenti, fps.
const MISURA = async () => {
  const R = window.__veritasRenderer, S = window.__veritasScene, M = window.__veritasModelRoot, T = window.THREE;
  const out = { vestito: document.documentElement.getAttribute("data-veritas-vestito") };
  if (R) out.renderer = { toneMapping: R.toneMapping, esposizione: R.toneMappingExposure, colorSpace: R.outputColorSpace,
    ombre: R.shadowMap && R.shadowMap.enabled, tipoOmbre: R.shadowMap && R.shadowMap.type, pixelRatio: R.getPixelRatio(),
    clearAlpha: R.getClearAlpha(), fondoTela: getComputedStyle(R.domElement).backgroundColor,
    fondoPadre: R.domElement.parentElement && getComputedStyle(R.domElement.parentElement).backgroundImage.slice(0, 120) };
  if (S) {
    out.fondo = S.background && S.background.isColor ? "#" + S.background.getHexString() : String(S.background);
    out.foschia = S.fog ? { colore: "#" + S.fog.color.getHexString(), near: S.fog.near, far: S.fog.far, density: S.fog.density } : null;
    out.luci = []; out.griglie = []; out.figliScena = [];
    S.traverse((o) => {
      if (o.isLight) out.luci.push({ tipo: o.type, colore: "#" + o.color.getHexString(), intensita: o.intensity,
        pos: o.position ? [o.position.x, o.position.y, o.position.z].map((v) => +v.toFixed(1)) : null, ombra: !!o.castShadow,
        mappa: o.shadow && o.shadow.mapSize ? o.shadow.mapSize.x : null, visibile: o.visible });
      if (o.isGridHelper || o.type === "GridHelper") out.griglie.push({ nome: o.name, visibile: o.visible, colore: o.material && o.material.color && "#" + o.material.color.getHexString() });
    });
    for (const c of S.children) out.figliScena.push((c.type || "?") + ":" + (c.name || "") + (c.visible ? "" : "(nascosto)")
      + (c.isMesh && c.material && c.material.color ? " #" + c.material.color.getHexString() : ""));
  }
  if (M) {
    const tipi = {}; let mesh = 0, texture = 0, trasparenti = 0;
    M.traverse((o) => { if (!o.isMesh) return; mesh++;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) { if (!m) continue;
        tipi[m.type] = (tipi[m.type] || 0) + 1; if (m.map) texture++; if (m.transparent) trasparenti++; } });
    const vetri = {}; M.traverse((o) => { if (!o.isMesh) return;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) { if (!m || !(m.transparent || m.alphaTest > 0)) continue;
        const k = "mappa:" + !!m.map + " alphaTest:" + m.alphaTest + " opacita:" + (Math.round(m.opacity * 10) / 10) + " alphaMap:" + !!m.alphaMap + " lato:" + m.side;
        vetri[k] = (vetri[k] || 0) + 1; } });
    let addosso = 0; M.traverse((o) => { if (o.isMesh && [].concat(o.material).some((m) => m && /^eidetica-argilla/.test(m.name))) addosso++; });
    out.modello = { mesh, tipi, texture, trasparenti, vetri, argillaAddossoFuoriDalDisegno: addosso, ombraPortata: (() => { let c = 0; M.traverse((o) => { if (o.isMesh && o.castShadow) c++; }); return c; })() };
  }
  const G = window.__veritasPassengerGroups;
  if (G && G.forEach) { const tipi = {}, colori = {}; let n = 0;
    G.forEach((pg) => { const g = pg && (pg.group || pg); if (!g || !g.traverse) return; n++;
      g.traverse((o) => { if (!o.isMesh && !o.isSkinnedMesh) return;
        for (const m of (Array.isArray(o.material) ? o.material : [o.material])) { if (!m) continue;
          tipi[m.type] = (tipi[m.type] || 0) + 1; if (m.color) colori["#" + m.color.getHexString()] = 1; } }); });
    out.agenti = { gruppi: n, tipi, colori: Object.keys(colori).slice(0, 20) }; }
  out.fps = await new Promise((ok) => { let k = 0; const t0 = performance.now();
    const f = () => { k++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else ok(+(k * 1000 / (performance.now() - t0)).toFixed(1)); };
    requestAnimationFrame(f); });
  return out;
};

const CARTELLA = process.env.CARTELLA || path.join(qui, "misura_tracce");
fs.mkdirSync(CARTELLA, { recursive: true });
const foto = (nome) => p.screenshot({ path: path.join(CARTELLA, nome), type: "jpeg", quality: 80 }).catch((e) => console.log("foto " + nome + ": " + e.message));
const misura = async (nome) => { const m = await conTetto(p.evaluate(MISURA), 30000, "misura").catch((e) => ({ errore: e.message }));
  fs.writeFileSync(path.join(CARTELLA, nome + ".json"), JSON.stringify(m, null, 1)); console.log(ora() + "  MISURA " + nome + " " + JSON.stringify(m).slice(0, 900)); return m; };

// 1. il velo: si aspetta che sia aperto e che la scena vera e il modello esistano (tetto 180 s)
const attendi = async (cosa, fn, ms) => { const f = Date.now() + ms;
  while (Date.now() < f) { if (await p.evaluate(fn).catch(() => false)) return true; await new Promise((r) => setTimeout(r, 2000)); }
  console.log(ora() + "  TETTO: " + cosa); return false; };
await attendi("velo aperto", () => !!(window.__veritasApertura && window.__veritasApertura.stato && window.__veritasApertura.stato()), 180000);
console.log(ora() + "  velo aperto");
await new Promise((r) => setTimeout(r, 12000));
await foto("1_velo.jpg");
// 2. si entra prima del giro dell'occhio (25 s dopo «Avvia», non 175)
await p.evaluate(() => window.__veritasApertura && window.__veritasApertura.chiudi("prova")).catch(() => {});
await attendi("scena e modello", () => !!(window.__veritasScene && window.__veritasModelRoot), 120000);
await attendi("bottone Avvia", () => !!document.getElementById("veritas-avvia"), 60000);
await new Promise((r) => setTimeout(r, 4000));
await foto("2_dopo_entra.jpg");
await misura("2_dopo_entra");
const premuto = await p.evaluate(() => { const b = document.getElementById("veritas-avvia"); if (b) { b.click(); return true; } return false; });
console.log(ora() + "  Avvia premuto: " + premuto);
// 3. si aspetta l'inquadratura degli agenti (Fase A), tetto 300 s
const fine = Date.now() + 300000; let inquadrato = false;
p.on("console", (m) => { if (/inquadro gli agenti/.test(m.text())) inquadrato = true; });
while (Date.now() < fine && !inquadrato) await new Promise((r) => setTimeout(r, 2000));
console.log(ora() + "  inquadrato: " + inquadrato);
await new Promise((r) => setTimeout(r, 3000));
// (a) tracce
const tracce = await p.evaluate(() => { const t = window.__veritasGetTrajectory(); const ids = new Set(), punti = {};
  for (const f of t.frames) for (const a of f.agents) { ids.add(a.id); punti[a.id] = (punti[a.id] || 0) + 1; }
  const pp = Object.values(punti); return { fotogrammi: t.frames.length, personeNellaTraiettoria: ids.size,
    puntiPerPersona: [Math.min(...pp), Math.max(...pp)], agentiTracciati: window.__veritasCorpi.stato().agentiTracciati }; });
console.log(ora() + "  TRACCE " + JSON.stringify(tracce));
// (d) l'ondeggiamento della traccia, solo lettura: per ogni terna di punti in cammino a-b-c
// (mezzo secondo l'uno dall'altro), di quanto b sta fuori dalla retta a-c, e quante volte il lato cambia.
const onde = await p.evaluate(() => { const t = window.__veritasGetTrajectory(); const per = new Map();
  for (const f of t.frames) for (const a of f.agents) { if (!per.has(a.id)) per.set(a.id, []); per.get(a.id).push(a); }
  const scarti = [], perPersona = {}; let cambi = 0, terne = 0;
  per.forEach((arr, id) => { let latoPrima = 0; const mie = [];
    for (let k = 1; k + 1 < arr.length; k++) { const A = arr[k - 1], B = arr[k], C = arr[k + 1];
      if (A.state !== "MOVING" || B.state !== "MOVING" || C.state !== "MOVING") { latoPrima = 0; continue; }
      const ux = C.pos[0] - A.pos[0], uz = C.pos[2] - A.pos[2], L = Math.hypot(ux, uz); if (L < 0.2) { latoPrima = 0; continue; }
      const d = ((B.pos[0] - A.pos[0]) * uz - (B.pos[2] - A.pos[2]) * ux) / L; terne++; scarti.push(Math.abs(d)); mie.push(Math.abs(d));
      const lato = Math.abs(d) > 0.05 ? Math.sign(d) : 0; if (lato && latoPrima && lato !== latoPrima) cambi++; if (lato) latoPrima = lato; }
    mie.sort((x, y) => x - y); perPersona[id] = mie.length ? +mie[mie.length >> 1].toFixed(3) : null; });
  scarti.sort((x, y) => x - y); const q = (f) => +scarti[Math.floor(scarti.length * f)].toFixed(3);
  return { terne, mediana_m: q(0.5), p90_m: q(0.9), oltre10cm: +(scarti.filter((x) => x > 0.1).length / terne * 100).toFixed(0) + "%",
    cambiDiLato: +(cambi / terne * 100).toFixed(0) + "%", medianaPerPersona: perPersona }; });
console.log(ora() + "  ONDE " + JSON.stringify(onde));
fs.writeFileSync(path.join(CARTELLA, "onde.json"), JSON.stringify(onde, null, 1));
// (b)+(c): cinque campioni a 4 s di distanza; per ciascuno, occhi ora e posizione 1 s dopo
const CAMPIONE = async () => {
  const prima = await p.evaluate(() => {
    const t = window.__veritasGetTrajectory(); const out = [];
    for (const x of window.__veritasListaAgenti()) {
      const o = window.__veritasOcchiDiAgente(x.id); if (!o) continue;
      // lo stato della traiettoria nel punto piu' vicino a dove sta la figura (come fa la pagina)
      let best = null, dmin = 1e18, bi = -1; const tr = [];
      for (const f of t.frames) { const a = f.agents.find((y) => y.id === x.id); if (!a) continue; tr.push({ t: f.t, p: [a.pos[0], a.pos[2]] });
        const d = (a.pos[0] - o.posizione[0]) ** 2 + (a.pos[2] - o.posizione[2]) ** 2; if (d < dmin) { dmin = d; best = a; bi = tr.length - 1; } }
      out.push({ id: x.id, pos: o.posizione, dir: o.direzione, clip: x.stato, statoTraj: best && best.state, seduto: !!(best && best.seduto),
        vicino: tr.slice(Math.max(0, bi - 4), bi + 12), iVicino: Math.min(bi, 4) });
    }
    return out; });
  await new Promise((r) => setTimeout(r, 1000));
  const dopo = await p.evaluate(() => Object.fromEntries(window.__veritasListaAgenti().map((x) => {
    const o = window.__veritasOcchiDiAgente(x.id); return [x.id, o && o.posizione]; })));
  return prima.map((a) => ({ ...a, pos2: dopo[a.id] }));
};
const righe = [];
for (let k = 0; k < 5; k++) { righe.push(...(await CAMPIONE()).map((r) => ({ ...r, k }))); await new Promise((r) => setTimeout(r, 3000)); }
let inMoto = 0, entro20 = 0, direzioniUniche = new Set(), statoOk = 0, statoTot = 0; const angoli = [], errati = [];
for (const r of righe) {
  direzioniUniche.add(r.dir.map((v) => v.toFixed(2)).join(","));
  if (r.pos2) { const dx = r.pos2[0] - r.pos[0], dz = r.pos2[2] - r.pos[2], s = Math.hypot(dx, dz);
    if (s > 0.3) { inMoto++; const n = Math.hypot(r.dir[0], r.dir[2]);
      const ang = Math.acos(Math.max(-1, Math.min(1, (dx * r.dir[0] + dz * r.dir[2]) / (s * n)))) * 180 / Math.PI;
      angoli.push(+ang.toFixed(0)); if (ang <= 20) entro20++; else errati.push({ id: r.id, k: r.k, ang: +ang.toFixed(0), dir: r.dir.map((v) => +v.toFixed(2)) }); } }
  if (r.statoTraj) { statoTot++;
    const atteso = r.statoTraj === "MOVING" ? "Walk_Loop" : (r.statoTraj === "WAITING" && r.seduto) ? "Sitting_Idle_Loop" : "Idle_Loop";
    if (r.clip === atteso || (r.clip === "Sitting_Idle_Loop")) statoOk++; }
}
angoli.sort((a, b) => a - b);
const esito = { tracce, campioni: righe.length, inMoto, entro20, percentuale: inMoto ? +(100 * entro20 / inMoto).toFixed(0) : null,
  angoloMediano: angoli[Math.floor(angoli.length / 2)], direzioniDiverse: direzioniUniche.size, statoCoincide: statoOk + "/" + statoTot, fuori20: errati.slice(0, 12) };
fs.writeFileSync(path.join(CARTELLA, "esito.json"), JSON.stringify({ esito, righe }, null, 1));
console.log(ora() + "  ESITO " + JSON.stringify(esito));
await ctx.close();
