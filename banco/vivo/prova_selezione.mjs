// PASSI 3-4 (29/09): clic vero su una persona (cartellino, attenuazione, anello, cammino fino alla meta), poi clic nel vuoto e prova in Analisi.
//
//
//   DAL_WORKSPACE=1 RADICE=<clone> MODELLO=<glb> node banco/vivo/prova_selezione.mjs   (tetto: timeout 300-600)
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

const CARTELLA = process.env.CARTELLA || path.join(qui, "render_base");
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
await new Promise((r) => setTimeout(r, 5000));
await foto("3_simulazione.jpg");
await misura("3_simulazione");
// PASSO 3 — LA SELEZIONE, in Esperienza, con un clic vero del mouse sulla figura
const bersaglio = await p.evaluate(() => {
  const T = window.THREE, cam = window.__veritasCamera, r = window.__veritasRenderer.domElement.getBoundingClientRect();
  let meglio = null, dmin = 1e9; const v = new T.Vector3();
  window.__veritasPassengerGroups.forEach((pg, id) => { const g = pg.group || pg; if (!g.visible) return;
    g.getWorldPosition(v); v.y += 1.2; v.project(cam); if (v.z > 1) return;
    const x = r.left + (v.x + 1) / 2 * r.width, y = r.top + (1 - v.y) / 2 * r.height;
    const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)); if (d < dmin) { dmin = d; meglio = { id, x, y }; } });
  return meglio; });
console.log(ora() + "  bersaglio " + JSON.stringify(bersaglio));
console.log(ora() + "  CAMPIONE " + JSON.stringify(await p.evaluate(() => { const t = window.__veritasGetTrajectory(); const f = t.frames;
  const stati = {}; for (const fr of f) for (const a of fr.agents) stati[typeof a.id + ":" + a.state] = (stati[typeof a.id + ":" + a.state] || 0) + 1;
  const oc = window.__veritasOcchiDiAgente && window.__veritasOcchiDiAgente(0); return { direzioneOcchiAgente0: oc && oc.direzione, n: f.length, t0: f[0].t, t1: f[f.length - 1].t, a: f[10].agents.slice(0, 2), stati,
    baseline: (() => { let b = 0; window.__veritasPassengerGroups.forEach((pg) => { (pg.group || pg).traverse((o) => { if (!o.isMesh && !o.isSkinnedMesh) return;
      for (const m of [].concat(o.material)) { if (m && m.visible !== false && m.opacity < 0.5) b++; } }); }); return b; })() }; })));
await p.mouse.move(bersaglio.x, bersaglio.y); await p.mouse.down(); await p.mouse.up();
await new Promise((r) => setTimeout(r, 1200));
const dopo = await p.evaluate(() => { const id = window.eideticaSelezione.scelto();
  const scheda = document.getElementById("eidetica-scheda");
  let alti = 0, bassi = 0; window.__veritasPassengerGroups.forEach((pg) => { (pg.group || pg).traverse((o) => { if (!o.isMesh && !o.isSkinnedMesh) return;
    for (const m of [].concat(o.material)) { if (!m || m.visible === false) continue; if (m.opacity < 0.5) bassi++; else alti++; } }); });
  const m = window.__veritasMissioniPerAgente;
  return { scelto: id, dati: window.__veritasSchedaAgente(id), testo: scheda && scheda.innerText.replace(/\s+/g, " "),
    materialiPieni: alti, materialiAttenuati: bassi, chiaviMissioni: m ? Object.keys(m).slice(0, 4) : null, idGruppi: [...window.__veritasPassengerGroups.keys()].slice(0, 4) }; });
console.log(ora() + "  SCELTO " + JSON.stringify(dopo));
await foto("9_selezione.jpg");
const via = () => p.evaluate(() => { const g = window.__veritasScene.getObjectByName("eidetica-selezione-via"); if (!g) return null;
  const c = g.children[0].geometry.parameters.path, a = c.getPoint(0), b = c.getPoint(1);
  const pg = window.__veritasPassengerGroups.get(window.eideticaSelezione.scelto()); const q = new window.THREE.Vector3(); (pg.group || pg).getWorldPosition(q);
  return { metri: +c.getLength().toFixed(1), dallaFigura: +Math.hypot(a.x - q.x, a.z - q.z).toFixed(2), quotaLinea: +a.y.toFixed(2), quotaGruppo: +q.y.toFixed(2),
    meta: [b.x, b.y, b.z].map((v) => +v.toFixed(1)), pezzi: g.children.length, metaPos: window.__veritasSchedaAgente(window.eideticaSelezione.scelto()).metaPos }; });
console.log(ora() + "  VIA subito " + JSON.stringify(await via()));
await new Promise((r) => setTimeout(r, 3000));
await foto("9b_selezione_3s_dopo.jpg");
console.log(ora() + "  VIA 3 s dopo " + JSON.stringify(await via()));
// clic nel vuoto (in basso a sinistra, fuori dal modello): si lascia
const r0 = await p.evaluate(() => { const r = window.__veritasRenderer.domElement.getBoundingClientRect(); return { x: r.left + 120, y: r.bottom - 160 }; });
await p.mouse.move(r0.x, r0.y); await p.mouse.down(); await p.mouse.up();
await new Promise((r) => setTimeout(r, 800));
const lasciato = await p.evaluate(() => { let bassi = 0; window.__veritasPassengerGroups.forEach((pg) => { (pg.group || pg).traverse((o) => { if (!o.isMesh && !o.isSkinnedMesh) return;
    for (const m of [].concat(o.material)) { if (m && m.visible !== false && m.opacity < 0.5) bassi++; } }); });
  return { scelto: window.eideticaSelezione.scelto(), attenuatiRimasti: bassi, anello: !!window.__veritasScene.getObjectByName("eidetica-selezione-anello"), via: !!window.__veritasScene.getObjectByName("eidetica-selezione-via") }; });
console.log(ora() + "  LASCIATO " + JSON.stringify(lasciato));
await foto("10_lasciato.jpg");
// in Analisi il clic non sceglie
await p.click('#eidetica-modo [data-modo="analisi"]').catch(() => {});
await new Promise((r) => setTimeout(r, 1500));
await p.mouse.move(bersaglio.x, bersaglio.y); await p.mouse.down(); await p.mouse.up();
await new Promise((r) => setTimeout(r, 800));
console.log(ora() + "  IN ANALISI il clic sceglie: " + await p.evaluate(() => window.eideticaSelezione.scelto()));
await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 15000))]).catch(() => {});
process.exit(0);
