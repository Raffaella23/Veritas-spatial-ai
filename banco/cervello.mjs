// Quali parti del cervello sono davvero collegate?
// Carica un modello vero e poi INTERROGA ogni modulo: non "esiste?", ma
// "produce qualcosa su questo modello?". Sono due domande diverse, e finora
// avevo risposto solo alla prima.
import { chromium } from "playwright";
import path from "path"; import { fileURLToPath } from "url";
const qui = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args:["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"] });
const p = await b.newPage();
const err=[]; p.on("pageerror",e=>err.push(e.message));
await p.goto("http://127.0.0.1:8899/index.html",{waitUntil:"load",timeout:60000});
await p.waitForTimeout(6000);
await p.fill("#v-new-name","cervello"); await p.click("#v-create-btn"); await p.waitForTimeout(6000);
await p.click("#vs-start-btn").catch(()=>{}); await p.waitForTimeout(10000);
await p.setInputFiles("#vaio-upload-input", path.join(qui,"airport_foot_traffic.glb"));
await p.waitForTimeout(22000);

const r = await p.evaluate(async () => {
  const esito = {};
  const prova = async (nome, fn) => {
    try { esito[nome] = await fn(); } catch (e) { esito[nome] = "ERRORE: " + e.message.slice(0,70); }
  };
  await prova("modello caricato", () => !!window.__veritasModelRoot);
  await prova("zone assegnate", () => (window.__veritasGetNodes?window.__veritasGetNodes():[]).length);
  await prova("zone trovate dall'analisi", () => (window.__veritasAutoZones||[]).length);
  await prova("nuvola di punti", () => (window.__veritasAutoPoints||[]).length);
  await prova("colori della nuvola", () => window.__veritasNuvolaColori ? window.__veritasNuvolaColori.length/3 : "assenti");
  await prova("motore percezione", () => {
    const m = window.__veritasPerceptionEngine; if (!m) return "assente";
    return Object.keys(m).slice(0,6);
  });
  await prova("percezione: ha misurato?", () => {
    const s = window.__veritasPerception && window.__veritasPerception.state;
    return s ? Object.keys(s).slice(0,6) : "nessuno stato";
  });
  await prova("normative", () => {
    const n = window.__veritasNormative || window.__veritasNorme; if (!n) return "assente";
    return Object.keys(n).slice(0,8);
  });
  await prova("esodo", () => {
    const e = window.__veritasEsodo; if (!e) return "assente";
    return Object.keys(e).slice(0,8);
  });
  await prova("visuale", () => {
    const v = window.__veritasVisuale; if (!v) return "assente";
    return Object.keys(v).slice(0,8);
  });
  await prova("ponte LLM", () => {
    const l = window.__veritasLLM; if (!l) return "assente";
    return Object.keys(l).slice(0,8);
  });
  await prova("traiettoria", () => typeof window.__veritasGetTrajectory);
  await prova("agenti in scena", () => window.__veritasPassengerGroups ? window.__veritasPassengerGroups.size : "assenti");
  return esito;
});
console.log("═══ STATO DEL CERVELLO DOPO IL CARICAMENTO ═══");
for (const [k,v] of Object.entries(r)) console.log(`  ${k.padEnd(28)} ${JSON.stringify(v)}`);
console.log("\n═══ errori ═══"); [...new Set(err)].slice(0,8).forEach(e=>console.log("  "+e.slice(0,150)));
await b.close();
