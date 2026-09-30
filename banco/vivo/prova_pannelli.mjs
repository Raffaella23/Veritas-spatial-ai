// PANNELLI SCURI (29/09): il vestito scuro fa gli stessi lavori della carta — nome del progetto, linguetta
// MASSIMIZZA, anteprima ancorata — senza pannelli chiari; poi carta a mano e di nuovo scuro, senza ricaricare.
//   DAL_WORKSPACE=1 CARTELLA=<dove> node banco/vivo/prova_pannelli.mjs   (tetto: 10 minuti)
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
// 1-bis. ASPETTA_ANTEPRIMA=1: l'anteprima («what I see») nasce solo quando si
// accende l'occhio, dentro il giro del velo: si aspetta lei prima di entrare (tetto 8 min)
if (process.env.ASPETTA_ANTEPRIMA === "1") {
  const nata = await attendi("anteprima", () => !!document.getElementById("veritas-anteprima"), 480000);
  console.log(ora() + "  anteprima nata: " + nata);
}
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
// PANNELLI SCURI — cosa si guarda, nella pagina
const PANNELLI = () => {
  const lum = (css) => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(css || "");
    if (!m) return null; return { L: (+m[1] * 0.2126 + +m[2] * 0.7152 + +m[3] * 0.0722) / 255, a: m[4] === undefined ? 1 : +m[4] }; };
  const chiari = [];
  for (const el of document.body.querySelectorAll("*")) {
    if (el.closest("canvas")) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 30 || r.height < 14 || r.bottom < 0 || r.top > innerHeight) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) continue;
    const s = lum(cs.backgroundColor);
    if (s && s.a > 0.5 && s.L > 0.75) chiari.push((el.id ? "#" + el.id : el.tagName.toLowerCase() + "." + String(el.className).slice(0, 40)) + " " + Math.round(r.width) + "x" + Math.round(r.height));
  }
  const b = document.getElementById("va-massimo");
  const ant = document.getElementById("veritas-anteprima");
  const col = [...document.querySelectorAll("[class*='border-l'],[class*='border-r']")].find((el) => {
    const r = el.getBoundingClientRect(); return r.width >= 120 && r.width <= 520 && r.height >= 200 && Math.abs(r.right - innerWidth) < 6; });
  const S = window.__veritasScene;
  return {
    vestito: document.documentElement.getAttribute("data-veritas-vestito"),
    chiaveNuova: localStorage.getItem("eidetica:vestito"),
    targhetta: document.querySelector("#vaio-brand .vname")?.textContent.trim(),
    nomeRicordato: window.__vaNomeProgetto || localStorage.getItem("eidetica:progetto"),
    linguetta: b ? { testo: b.textContent.trim(), fondo: getComputedStyle(b).backgroundColor, visibile: getComputedStyle(b).display !== "none" } : null,
    anteprima: ant ? { ancorata: ant.classList.contains("va-ancorato"), nellaColonna: !!(col && ant.parentElement === col), ultimoNellaColonna: !!(col && col.lastElementChild === ant),
      posizione: getComputedStyle(ant).position, fondo: getComputedStyle(ant).backgroundColor,
      leggibilita: (() => { const rl = (css) => { const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(css || ""); if (!m) return null;
          const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(+m[1]) + 0.7152 * f(+m[2]) + 0.0722 * f(+m[3]); };
        const fondoDi = (el) => { for (let e = el; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; const a = /rgba\([^)]*,\s*([\d.]+)\)/.exec(b); if (b && b !== "transparent" && !(a && +a[1] < 0.3)) return b; } return "rgb(0,0,0)"; };
        const c = (el) => { if (!el) return null; const a = rl(getComputedStyle(el).color), b = rl(fondoDi(el)); return +((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)).toFixed(1); };
        return { titolo: c(ant.querySelector(":scope > div:first-child > span")), menu: c(ant.querySelector("select")), interruttori: c(ant.querySelector("label")) }; })(), visibile: getComputedStyle(ant).display !== "none",
      misure: (() => { const r = ant.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })() } : "non c'e'",
    colonnaDestra: col ? Math.round(col.getBoundingClientRect().width) + " px" : null,
    firma: !!document.getElementById("va-firma") && getComputedStyle(document.getElementById("va-firma")).display !== "none",
    plastico: { fondoScena: !!(S && S.background && S.background.isTexture), foschia: S && S.fog ? "#" + S.fog.color.getHexString() : null },
    pannelliChiari: chiari.length, esempiChiari: chiari.slice(0, 8),
  };
};
const guarda = async (nome) => { const m = await p.evaluate(PANNELLI); console.log(ora() + "  " + nome + " " + JSON.stringify(m)); return m; };

await guarda("ESPERIENZA");
await foto("p1_esperienza.jpg");
await p.click('#eidetica-modo [data-modo="analisi"]').catch((e) => console.log("analisi: " + e.message));
await new Promise((r) => setTimeout(r, 2500));
await guarda("ANALISI");
await foto("p2_analisi.jpg");
// la linguetta, con un clic vero
await p.click("#va-massimo");
await new Promise((r) => setTimeout(r, 1200));
console.log(ora() + "  MASSIMIZZATO " + JSON.stringify(await p.evaluate(() => ({
  attributo: document.documentElement.getAttribute("data-eidetica-massimo"), testo: document.getElementById("va-massimo").textContent.trim(),
  colonneVisibili: [...document.querySelectorAll("[class*='shrink-0'][class*='border-l'],[class*='shrink-0'][class*='border-r']")].filter((e) => getComputedStyle(e).display !== "none").length,
  anteprimaVisibile: document.getElementById("veritas-anteprima") ? getComputedStyle(document.getElementById("veritas-anteprima")).display !== "none" : "non c'e'",
  tela: Math.round(window.__veritasRenderer.domElement.getBoundingClientRect().width) }))));
await foto("p3_massimizzato.jpg");
await p.click("#va-massimo");
await new Promise((r) => setTimeout(r, 1200));
console.log(ora() + "  RIMESSO " + JSON.stringify(await p.evaluate(() => ({
  attributo: document.documentElement.getAttribute("data-eidetica-massimo"),
  colonneVisibili: [...document.querySelectorAll("[class*='shrink-0'][class*='border-l'],[class*='shrink-0'][class*='border-r']")].filter((e) => getComputedStyle(e).display !== "none").length,
  tela: Math.round(window.__veritasRenderer.domElement.getBoundingClientRect().width) }))));
// a mano: carta, poi di nuovo scuro (non si ricarica)
await p.evaluate(() => window.veritasCarta.accendi());
await new Promise((r) => setTimeout(r, 1500));
const c = await guarda("CARTA A MANO");
await foto("p4_carta.jpg");
await p.evaluate(() => window.veritasCarta.scuro());
await new Promise((r) => setTimeout(r, 1500));
await guarda("DI NUOVO SCURO");
await foto("p5_di_nuovo_scuro.jpg");
await p.evaluate(() => localStorage.removeItem("eidetica:vestito"));   // il profilo del banco resta pulito
await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 15000))]).catch(() => {});
process.exit(0);
