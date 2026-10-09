// PASSO 2 (29/09): Analisi / Esperienza sulla stessa scena, stessa inquadratura. Foto e letture in CARTELLA.
//
//
//   DAL_WORKSPACE=1 RADICE=<clone> MODELLO=<glb> node banco/vivo/prova_modi.mjs   (tetto: timeout 300-600)
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
// PASSO 2 — ANALISI / ESPERIENZA sulla stessa scena, stessa inquadratura
const leggi = () => p.evaluate(() => { const tela = window.__veritasRenderer.domElement, kpi = document.querySelector("#root aside.shrink-0");
  const vis = (id) => { const e = document.getElementById(id); return !!(e && e.offsetParent !== null); };
  return { modo: window.eideticaModo && window.eideticaModo.stato(), interruttore: !!document.getElementById("eidetica-modo"),
    tela: tela.clientWidth + "x" + tela.clientHeight, buffer: tela.width + "x" + tela.height, kpi: !!(kpi && kpi.offsetParent !== null),
    strumenti: ["vaio-btn-layers", "vaio-btn-report", "vaio-cadtoggle", "vaio-dati", "va-dock-tab", "va-agenti-tab"].filter(vis),
    zoneGruppo: window.__veritasHotspotGroup ? window.__veritasHotspotGroup.visible + " (" + window.__veritasHotspotGroup.children.length + " pezzi)" : null }; });
// le zone accese come le accende l'utente (Spatial Layers → Zones), in Analisi; poi si torna in Esperienza
await p.click('#eidetica-modo [data-modo="analisi"]').catch((e) => console.log("clic analisi: " + e.message));
await new Promise((r) => setTimeout(r, 800));
await p.click("#vaio-btn-layers").catch((e) => console.log("layers: " + e.message));
await p.click("#vaio-layer-zones").catch((e) => console.log("zones: " + e.message));
await new Promise((r) => setTimeout(r, 800));
console.log(ora() + "  zone accese dall'utente: " + await p.evaluate(() => window.__veritasHotspotGroup && window.__veritasHotspotGroup.visible));
await p.mouse.click(700, 600);
await p.click('#eidetica-modo [data-modo="esperienza"]').catch((e) => console.log("clic esperienza: " + e.message));
const bianco = await p.evaluate(() => { const el = [...document.querySelectorAll("div,span,p")].find((x) => x.children.length === 0 && /raggiungibile/.test(x.textContent || ""));
  const c = []; for (let e = el; e && e !== document.body && c.length < 7; e = e.parentElement) { const r = e.getBoundingClientRect();
    c.push((e.id ? "#" + e.id : e.tagName.toLowerCase()) + "." + String(e.className || "").split(" ").slice(0, 3).join(".") + " [" + [r.left, r.top, r.width, r.height].map(Math.round) + "] " + getComputedStyle(e).position); } return c; });
console.log(ora() + "  PANNELLO BIANCO " + JSON.stringify(bianco));
await new Promise((r) => setTimeout(r, 1500));
console.log(ora() + "  ESPERIENZA " + JSON.stringify(await leggi()));
await foto("6_esperienza.jpg");
await p.click('#eidetica-modo [data-modo="analisi"]').catch((e) => console.log("clic analisi: " + e.message));
await new Promise((r) => setTimeout(r, 2000));
console.log(ora() + "  ANALISI " + JSON.stringify(await leggi()));
await foto("7_analisi.jpg");
await p.click('#eidetica-modo [data-modo="esperienza"]').catch((e) => console.log("clic esperienza: " + e.message));
await new Promise((r) => setTimeout(r, 2000));
console.log(ora() + "  DI NUOVO ESPERIENZA " + JSON.stringify(await leggi()));
await p.click('#eidetica-modo .em-originale').catch((e) => console.log("clic originale: " + e.message));
await new Promise((r) => setTimeout(r, 1500));
await foto("8_esperienza_modello_originale.jpg");
await p.click('#eidetica-modo .em-originale').catch(() => {});
const m = await p.evaluate(() => { let k = 0; const f = performance.now(); return new Promise((ok) => { const g = () => { k++; if (performance.now() - f < 3000) requestAnimationFrame(g); else ok(+(k * 1000 / (performance.now() - f)).toFixed(1)); }; requestAnimationFrame(g); }); });
console.log(ora() + "  fps in esperienza " + m);
await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 15000))]).catch(() => {});
process.exit(0);
