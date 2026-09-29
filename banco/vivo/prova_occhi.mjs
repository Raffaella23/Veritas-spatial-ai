// PASSO 5 (29/09): negli occhi della persona scelta. Clic vero sulla figura, clic vero su «Con i suoi occhi»,
// discesa, 8 s negli occhi (posizione, quota, sguardo, corpo spento, cartellino in alto), Esc e ritorno al plastico.
//   DAL_WORKSPACE=1 CARTELLA=<dove> node banco/vivo/prova_occhi.mjs   (tetto: 10 minuti)
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
// PASSO 3 — si sceglie la persona piu' vicina al centro, con un clic vero
const bersaglio = await p.evaluate(() => {
  const T = window.THREE, cam = window.__veritasCamera, r = window.__veritasRenderer.domElement.getBoundingClientRect();
  let meglio = null, dmin = 1e9; const v = new T.Vector3();
  window.__veritasPassengerGroups.forEach((pg, id) => { const g = pg.group || pg; if (!g.visible) return;
    if (!window.__veritasOcchiDiAgente(id)) return;
    g.getWorldPosition(v); v.y += 1.2; v.project(cam); if (v.z > 1) return;
    const x = r.left + (v.x + 1) / 2 * r.width, y = r.top + (1 - v.y) / 2 * r.height;
    const d = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)); if (d < dmin) { dmin = d; meglio = { id, x, y }; } });
  return meglio; });
console.log(ora() + "  bersaglio " + JSON.stringify(bersaglio));
await p.mouse.move(bersaglio.x, bersaglio.y); await p.mouse.down(); await p.mouse.up();
await new Promise((r) => setTimeout(r, 1200));
console.log(ora() + "  SCELTO " + JSON.stringify(await p.evaluate(() => ({ id: window.eideticaSelezione.scelto(),
  testo: document.getElementById("eidetica-scheda")?.innerText.replace(/\s+/g, " ") }))));
await foto("5_1_selezione.jpg");

// Sonda nella pagina: il corpo della persona scelta e' disegnato? (onBeforeRender scatta solo se si disegna)
await p.evaluate(() => {
  const id = window.eideticaSelezione.scelto(), pg = window.__veritasPassengerGroups.get(id), g = pg.group || pg;
  const corpo = g.getObjectByName("__veritasCorpo") || g;
  window.__provaOcchi = { disegni: 0, dove: {}, avvisi: [], campioni: [] };
  const w = console.warn; console.warn = function (...a) { if (String(a[0]).includes("EIDETICA occhi")) window.__provaOcchi.avvisi.push(a.map(String).join(" ").slice(0, 200)); return w.apply(this, a); };
  corpo.traverse((o) => { if (o.isMesh || o.isSkinnedMesh) { const prima = o.onBeforeRender;
    o.onBeforeRender = function (r, s, c, ...a) { if (window.eideticaSelezione.negliOcchi() === "dentro") { window.__provaOcchi.disegni++;
      const k = (c === window.__veritasCamera ? "camera-cliente" : "altra-camera:" + (c && c.type)) + (r.getRenderTarget() ? "+bersaglio" : "+schermo");
      window.__provaOcchi.dove[k] = (window.__provaOcchi.dove[k] || 0) + 1; } return prima.call(this, r, s, c, ...a); }; } });
  // un campione a ogni disegno sullo schermo, DOPO che la telecamera e' stata posata
  const R = window.__veritasRenderer, dis = R.render.bind(R);
  R.render = function (s, c) { const out = dis(s, c);
    if (s === window.__veritasScene && c === window.__veritasCamera && R.getRenderTarget() === null) {
      const fase = window.eideticaSelezione.negliOcchi();
      if (fase) {
        const T = window.THREE, oc = window.__veritasOcchiDiAgente(id);
        const box = new T.Box3().setFromObject(corpo), pos = new T.Vector3(); g.getWorldPosition(pos);
        const f = new T.Vector3(); c.getWorldDirection(f);
        const ang = oc ? Math.abs(Math.atan2(f.z, f.x) - Math.atan2(oc.direzione[2], oc.direzione[0])) : null;
        window.__provaOcchi.campioni.push({ t: performance.now(), fase,
          dxz: Math.hypot(c.position.x - pos.x, c.position.z - pos.z),
          quota: c.position.y - box.min.y, occhio: oc && oc.altezzaOcchio,
          angolo: ang == null ? null : Math.min(ang, 2 * Math.PI - ang) * 180 / Math.PI,
          yawOcchi: oc ? Math.atan2(oc.direzione[2], oc.direzione[0]) * 180 / Math.PI : null, yawCamera: Math.atan2(f.z, f.x) * 180 / Math.PI,
          inclinazione: Math.asin(Math.max(-1, Math.min(1, f.y))) * 180 / Math.PI });
      }
    }
    return out; };
});
const plasticoPrima = await p.evaluate(() => { const c = window.__veritasCamera, t = window.__veritasControls.target;
  return { pos: [c.position.x, c.position.y, c.position.z], target: [t.x, t.y, t.z] }; });

// PASSO 5 — clic vero su «Con i suoi occhi»
const btn = await p.$("#eidetica-scheda .es-occhi");
const bb = btn && await btn.boundingBox();
console.log(ora() + "  bottone " + JSON.stringify(bb));
const tClic = await p.evaluate(() => performance.now());
await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.mouse.up();
await new Promise((r) => setTimeout(r, 700));
await foto("5_2_discesa.jpg");
const fine5 = Date.now() + 10000;
while (Date.now() < fine5 && await p.evaluate(() => window.eideticaSelezione.negliOcchi()) !== "dentro") await new Promise((r) => setTimeout(r, 50));
const discesa = await p.evaluate((t0) => { const cs = window.__provaOcchi.campioni, g = cs.find((x) => x.fase === "giu"), d = cs.find((x) => x.fase === "dentro");
  return { dalClic: d ? +((d.t - t0) / 1000).toFixed(3) : null, dalPrimoDisegno: g && d ? +((d.t - g.t) / 1000).toFixed(3) : null,
    fotogrammaMedio: g && d ? +((d.t - g.t) / 1000 / Math.max(1, cs.indexOf(d) - cs.indexOf(g))).toFixed(3) : null }; }, tClic);
console.log(ora() + "  DISCESA " + JSON.stringify(discesa) + " (criterio 1,4-1,7 s)");
await new Promise((r) => setTimeout(r, 1500));
await foto("5_3_negli_occhi.jpg");
console.log(ora() + "  CARTELLINO IN ALTO " + JSON.stringify(await p.evaluate(() => { const el = document.getElementById("eidetica-occhi");
  return el && { testo: el.innerText.replace(/\s+/g, " "), opacita: getComputedStyle(el).opacity, schedaNascosta: document.getElementById("eidetica-scheda").style.display }; })));
await new Promise((r) => setTimeout(r, 4000));
await foto("5_4_negli_occhi_4s.jpg");
await new Promise((r) => setTimeout(r, 4000));
await foto("5_5_negli_occhi_8s.jpg");
const stat = await p.evaluate(() => {
  const cs = window.__provaOcchi.campioni.filter((c) => c.fase === "dentro");
  const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? +s[s.length >> 1].toFixed(3) : null; };
  const max = (a) => a.length ? +Math.max(...a).toFixed(3) : null;
  const ang = cs.map((c) => c.angolo).filter((x) => x != null);
  let b = 0; window.__veritasPassengerGroups.forEach((pg) => { (pg.group || pg).traverse((o) => { if (!o.isMesh && !o.isSkinnedMesh) return;
    for (const m of [].concat(o.material)) { if (m && m.visible !== false && m.opacity < 0.5) b++; } }); });
  return { campioni: cs.length, dxzMax: max(cs.map((c) => c.dxz)), dxzMediana: med(cs.map((c) => c.dxz)),
    quotaMenoOcchioMediana: med(cs.map((c) => c.quota - c.occhio)), quotaMenoOcchioMax: max(cs.map((c) => Math.abs(c.quota - c.occhio))),
    occhio: cs[0] && cs[0].occhio, angoloMediana: med(ang), entro15: ang.length ? +(ang.filter((a) => a <= 15).length / ang.length).toFixed(3) : null,
    angoloMax: max(ang), inclinazioneMax: max(cs.map((c) => Math.abs(c.inclinazione))),
    corpoDisegnatoNegliOcchi: window.__provaOcchi.disegni, doveDisegnato: window.__provaOcchi.dove, avvisi: window.__provaOcchi.avvisi.slice(0, 5),
    quotaEntro5cm: cs.length ? +(cs.filter((c) => Math.abs(c.quota - c.occhio) <= 0.05).length / cs.length).toFixed(3) : null, comandiAccesi: window.__veritasControls.enabled, attenuati: b };
});
console.log(ora() + "  NEGLI OCCHI " + JSON.stringify(stat));
fs.writeFileSync(path.join(CARTELLA, "campioni_occhi.json"), JSON.stringify(await p.evaluate(() => window.__provaOcchi.campioni)));
// Esc: ritorno al plastico
await p.keyboard.press("Escape");
await new Promise((r) => setTimeout(r, 2200));
await foto("5_6_ritorno.jpg");
const ritorno = await p.evaluate((P) => { const c = window.__veritasCamera, t = window.__veritasControls.target;
  let b = 0; window.__veritasPassengerGroups.forEach((pg) => { (pg.group || pg).traverse((o) => { if (!o.isMesh && !o.isSkinnedMesh) return;
    for (const m of [].concat(o.material)) { if (m && m.visible !== false && m.opacity < 0.5) b++; } }); });
  return { fase: window.eideticaSelezione.negliOcchi(), scelto: window.eideticaSelezione.scelto(),
    distPos: +Math.hypot(c.position.x - P.pos[0], c.position.y - P.pos[1], c.position.z - P.pos[2]).toFixed(4),
    distTarget: +Math.hypot(t.x - P.target[0], t.y - P.target[1], t.z - P.target[2]).toFixed(4),
    comandiAccesi: window.__veritasControls.enabled, attenuati: b,
    scheda: document.getElementById("eidetica-scheda").style.display, cartelloInAlto: document.getElementById("eidetica-occhi")?.style.display }; }, plasticoPrima);
console.log(ora() + "  RITORNO " + JSON.stringify(ritorno));
console.log(ora() + "  fps " + await p.evaluate(() => new Promise((ok) => { let k = 0; const t0 = performance.now();
  const f = () => { k++; if (performance.now() - t0 < 3000) requestAnimationFrame(f); else ok(+(k * 1000 / (performance.now() - t0)).toFixed(1)); }; requestAnimationFrame(f); })));
await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 15000))]).catch(() => {});
process.exit(0);
