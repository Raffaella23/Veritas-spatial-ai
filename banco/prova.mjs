// Prova in browser: la piattaforma parte, e carica i formati dichiarati?
//
//     node banco/prova.mjs
//
// Non simula niente: apre Chromium vero, carica la pagina vera e usa il widget
// di upload vero. Quello che stampa e' quello che succede.

import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const URL_BANCO = "http://127.0.0.1:8899/index.html";

const log = [];
const errori = [];

function riquadro(t) { console.log("\n" + "─".repeat(66) + "\n  " + t + "\n" + "─".repeat(66)); }

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
});
const pagina = await browser.newPage();
pagina.on("console", (m) => {
  const t = m.text();
  log.push(t);
  if (m.type() === "error") errori.push(t);
});
pagina.on("pageerror", (e) => errori.push("PAGEERROR: " + e.message));

riquadro("1. la pagina parte?");
await pagina.goto(URL_BANCO, { waitUntil: "load", timeout: 60000 });
await pagina.waitForTimeout(6000);

const stato = await pagina.evaluate(() => ({
  three: !!window.THREE,
  revisione: window.THREE && window.THREE.REVISION,
  scena: !!window.__veritasScene,
  renderer: !!window.__veritasRenderer,
  ingresso: !!window.__veritasIngest,
  formati: window.__veritasIngest ? window.__veritasIngest.estensioniAccettate() : null,
  caricatoreSplat: typeof window.__veritasLoadSplatFile,
  analizza: typeof window.__veritasAnalyzePointCloud,
  percezione: !!window.__veritasPerceptionEngine,
  input: !!document.querySelector("#vaio-upload-input"),
  accept: (document.querySelector("#vaio-upload-input") || {}).accept,
}));
for (const [k, v] of Object.entries(stato)) console.log(`   ${k.padEnd(16)} ${JSON.stringify(v)}`);

const doppioThree = log.filter((l) => /Multiple instances of Three/i.test(l)).length;
console.log(`   doppio three     ${doppioThree ? "avviso presente (atteso: bundle 0.160 + importmap 0.180)" : "nessun avviso"}`);

riquadro("1-bis. creo un progetto (la scena monta solo dopo)");
await pagina.fill("#v-new-name", "banco di prova");
await pagina.selectOption("#v-new-type", { index: 0 }).catch(() => {});
await pagina.click("#v-create-btn");
await pagina.waitForTimeout(7000);
// secondo cancello: il pannello impostazioni. La scena 3D monta solo dopo
// "Avvia simulazione" (#vs-start-btn, l'ID gia' documentato in CLAUDE.md).
await pagina.click("#vs-start-btn").catch(() => console.log("   (vs-start-btn non trovato)"));
await pagina.waitForTimeout(12000);
const dopoProgetto = await pagina.evaluate(() => ({
  canvas: document.querySelectorAll("canvas").length,
  scena: !!window.__veritasScene,
  renderer: !!window.__veritasRenderer,
  input: !!document.querySelector("#vaio-upload-input"),
  accept: (document.querySelector("#vaio-upload-input") || {}).accept,
}));
for (const [k, v] of Object.entries(dopoProgetto)) console.log(`   ${k.padEnd(16)} ${JSON.stringify(v)}`);

riquadro("2. carica una mesh vera (GLB da Sketchfab, 19,5 MB)");
await pagina.setInputFiles("#vaio-upload-input", path.join(qui, "airport_foot_traffic.glb"));
await pagina.waitForTimeout(20000);
const dopoMesh = await pagina.evaluate(() => {
  const r = window.__veritasModelRoot;
  if (!r) return { caricato: false };
  const b = new window.THREE.Box3().setFromObject(r);
  let mesh = 0; r.traverse((o) => { if (o.isMesh) mesh++; });
  return {
    caricato: true, mesh,
    ingombro: [+(b.max.x - b.min.x).toFixed(2), +(b.max.y - b.min.y).toFixed(2), +(b.max.z - b.min.z).toFixed(2)],
    appoggiato: +b.min.y.toFixed(3),
    zone: (window.__veritasGetNodes ? window.__veritasGetNodes() : []).length,
  };
});
for (const [k, v] of Object.entries(dopoMesh)) console.log(`   ${k.padEnd(16)} ${JSON.stringify(v)}`);

riquadro("3. carica gaussiane (.ply) — il percorso che prima non partiva");
const primaSplat = log.length;
await pagina.setInputFiles("#vaio-upload-input", path.join(qui, "prova_gaussiane.ply"));
await pagina.waitForTimeout(25000);
const dopoSplat = await pagina.evaluate(() => ({
  radiceSplat: !!window.__veritasSplatRoot,
  colori: window.__veritasNuvolaColori ? window.__veritasNuvolaColori.length / 3 : 0,
}));
for (const [k, v] of Object.entries(dopoSplat)) console.log(`   ${k.padEnd(16)} ${JSON.stringify(v)}`);

console.log("\n   righe di console dopo il caricamento dello splat:");
for (const l of log.slice(primaSplat).filter((l) => /VERITAS|Spark|splat|gaussian/i.test(l)).slice(0, 12)) {
  console.log("     " + l.slice(0, 150));
}

riquadro("errori raccolti");
if (!errori.length) console.log("   nessuno");
else for (const e of [...new Set(errori)].slice(0, 12)) console.log("   " + e.slice(0, 190));

await pagina.screenshot({ path: path.join(qui, "schermata.png") });
await browser.close();

const ok = stato.ingresso && dopoProgetto.scena && dopoMesh.caricato && dopoSplat.radiceSplat;
riquadro(ok ? "ESITO: la piattaforma carica mesh E gaussiane" : "ESITO: qualcosa non carica — vedi sopra");
process.exit(ok ? 0 : 1);
