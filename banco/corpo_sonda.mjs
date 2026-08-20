// Sonda: QUALE operazione del motore fisico esplode nel browser?
//     node banco/corpo_sonda.mjs
// Non e' un collaudo, e' uno strumento di diagnosi. Si tiene finche' serve.
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
const qui = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
});
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
const log = [];
p.on("console", (m) => log.push(m.text()));
p.on("pageerror", (e) => log.push("PAGEERROR " + e.message));
await p.goto("http://127.0.0.1:8899/index.html", { waitUntil: "load", timeout: 60000 });
await p.waitForTimeout(6000);
await p.fill("#v-new-name", "sonda");
await p.click("#v-create-btn");
await p.waitForTimeout(6000);
await p.click("#vs-start-btn").catch(() => {});
await p.waitForTimeout(8000);
await p.setInputFiles("#vaio-upload-input", path.join(qui, "airport_foot_traffic.glb"));
await p.waitForTimeout(55000);

const r = await p.evaluate(() => {
  const C = window.__veritasCorpo;
  const out = { tappe: [] };
  const dì = (n, v) => out.tappe.push(n + ": " + v);
  const prova = (n, f) => {
    try { const v = f(); dì(n, "ok " + (v === undefined ? "" : v)); return v; }
    catch (e) { dì(n, "ESPLODE — " + String((e && e.message) || e).slice(0, 120)); return null; }
  };
  const scena = C && C.stato && C.stato();
  if (!scena) { out.perche = "nessuna scena"; return out; }
  dì("triangoli", scena.triangoli);
  dì("quanti mondi costruiti (log)", "vedi console");

  const zone = window.__veritasGetNodes ? window.__veritasGetNodes() : [];
  const p0 = zone.length ? zone[0].pos : [0, 0, 0];
  dì("parto da", JSON.stringify(p0.map((v) => +v.toFixed(2))));

  const corpo = prova("aggiungiCorpo", () => C.aggiungiCorpo(scena, p0));
  if (!corpo) return out;
  prova("world.step iniziale", () => { scena.world.step(); });
  prova("dentroUnSolido (prima interrogazione)", () => C.dentroUnSolido(scena, corpo));
  prova("dentroUnSolido (seconda)", () => C.dentroUnSolido(scena, corpo));
  prova("passo singolo", () => { C.passo(scena, corpo, { x: 0.1, z: 0 }, 0.25); return JSON.stringify(corpo.pos); });

  // quanti passi regge?
  let n = 0;
  try {
    for (; n < 5000; n++) { C.passo(scena, corpo, { x: 0.02, z: 0.01 }, 0.05); scena.world.step(); }
    dì("5000 passi consecutivi", "ok");
  } catch (e) { dì("passi retti prima di esplodere", n + " — " + String((e && e.message) || e).slice(0, 120)); }

  // e quante interrogazioni?
  let q = 0;
  try {
    for (; q < 5000; q++) C.dentroUnSolido(scena, corpo);
    dì("5000 interrogazioni consecutive", "ok");
  } catch (e) { dì("interrogazioni rette prima di esplodere", q + " — " + String((e && e.message) || e).slice(0, 120)); }

  // e quanti corpi?
  let c = 0;
  try {
    for (; c < 200; c++) C.aggiungiCorpo(scena, [p0[0] + c * 0.5, p0[1], p0[2]]);
    dì("200 corpi", "ok");
  } catch (e) { dì("corpi retti prima di esplodere", c + " — " + String((e && e.message) || e).slice(0, 120)); }
  return out;
});

console.log("\n=== SONDA ===");
(r.tappe || []).forEach((t) => console.log("   " + t));
if (r.perche) console.log("   " + r.perche);
console.log("\n=== CONSOLE ===");
log.filter((l) => /corpo|rapier|PAGEERROR/i.test(l)).slice(-12).forEach((l) => console.log("   " + l.slice(0, 170)));
await b.close();
