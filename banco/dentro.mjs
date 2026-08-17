// I PASSEGGERI SONO DENTRO L'EDIFICIO?
//
//     node banco/dentro.mjs
//
// E' il collaudo che decide se il loop base funziona, ed e' l'unico che un
// cliente vede: se gli agenti camminano fuori dal modello o sopra gli aerei,
// non c'e' analisi che tenga.
//
// Non si giudica a occhio da uno screenshot: si contano. Per ogni agente, in
// piu' istanti della simulazione, si guarda se sta dentro l'impronta dello
// SPAZIO PERCORRIBILE (non dell'intero modello: il piazzale e le piste sono
// dentro l'ingombro ma non sono pavimento).

import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
});
const pagina = await browser.newPage({ viewport: { width: 1600, height: 900 } });
pagina.on("pageerror", (e) => console.log("PAGEERROR " + e.message.slice(0, 120)));

await pagina.goto("http://127.0.0.1:8899/index.html", { waitUntil: "load", timeout: 60000 });
await pagina.waitForTimeout(6000);
await pagina.fill("#v-new-name", "dentro");
await pagina.click("#v-create-btn");
await pagina.waitForTimeout(6000);
await pagina.click("#vs-start-btn").catch(() => {});
await pagina.waitForTimeout(10000);
await pagina.setInputFiles("#vaio-upload-input", path.join(qui, "airport_foot_traffic.glb"));
await pagina.waitForTimeout(50000);

const misura = () => pagina.evaluate(() => {
  const THREE = window.THREE;
  const gruppi = window.__veritasPassengerGroups;
  const radice = window.__veritasModelRoot;
  if (!THREE || !radice) return { pronto: false, perche: "THREE o modello assenti" };
  if (!gruppi || !gruppi.size) return { pronto: false, perche: "nessun passeggero in scena" };

  // L'impronta del PAVIMENTO, non del modello: dalle zone misurate, che sono
  // l'unica cosa che dichiara "qui si cammina".
  const zone = window.__veritasGetNodes ? window.__veritasGetNodes() : [];
  const scatolaModello = new THREE.Box3().setFromObject(radice);

  const posizioni = [];
  gruppi.forEach((v) => {
    const g = v && v.group;
    if (!g) return;
    const p = new THREE.Vector3();
    g.getWorldPosition(p);
    posizioni.push([+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)]);
  });

  // Dentro l'ingombro del modello in pianta?
  let fuoriIngombro = 0;
  for (const [x, , z] of posizioni) {
    if (x < scatolaModello.min.x || x > scatolaModello.max.x ||
        z < scatolaModello.min.z || z > scatolaModello.max.z) fuoriIngombro++;
  }

  // Vicini a una zona percorribile? Un agente che cammina sul piazzale sta
  // dentro l'ingombro ma lontanissimo da qualunque tappa.
  let lontaniDaOgniZona = 0;
  const distanze = [];
  if (zone.length) {
    for (const [x, , z] of posizioni) {
      let d = Infinity;
      for (const n of zone) {
        if (!n.pos) continue;
        d = Math.min(d, Math.hypot(x - n.pos[0], z - n.pos[2]));
      }
      distanze.push(d);
      if (d > 30) lontaniDaOgniZona++;
    }
  }

  // In quota: un agente deve stare sul pavimento, non a mezz'aria ne' sotto.
  const quote = posizioni.map((p) => p[1]);
  const livelli = (window.__veritasPercezione && window.__veritasPercezione.levels)
    ? window.__veritasPercezione.levels.map((l) => +l.levelY.toFixed(2)) : [];
  let fuoriQuota = 0;
  if (livelli.length) {
    for (const y of quote) {
      const vicino = livelli.some((ly) => Math.abs(y - ly) < 2.0);
      if (!vicino) fuoriQuota++;
    }
  }

  distanze.sort((a, b) => a - b);
  return {
    pronto: true,
    agenti: posizioni.length,
    // Da dove viene la quota sbagliata? Si confrontano le quote degli agenti
    // con quelle delle zone che dovrebbero calpestare.
    quoteAgenti: quote.map((y) => +y.toFixed(2)).sort((a, b) => a - b),
    quoteZone: zone.map((n) => (n.pos ? +n.pos[1].toFixed(2) : null)),
    fuoriIngombro,
    lontaniDaOgniZona,
    fuoriQuota,
    livelli,
    distanzaMediana: distanze.length ? +distanze[Math.floor(distanze.length / 2)].toFixed(1) : null,
    distanzaMassima: distanze.length ? +distanze[distanze.length - 1].toFixed(1) : null,
    quotaMin: quote.length ? +Math.min(...quote).toFixed(2) : null,
    quotaMax: quote.length ? +Math.max(...quote).toFixed(2) : null,
    ingombro: [
      +(scatolaModello.max.x - scatolaModello.min.x).toFixed(1),
      +(scatolaModello.max.y - scatolaModello.min.y).toFixed(1),
      +(scatolaModello.max.z - scatolaModello.min.z).toFixed(1),
    ],
  };
});

console.log("\n" + "=".repeat(62));
console.log("  COLLAUDO: i passeggeri stanno dentro l'edificio?");
console.log("=".repeat(62));

let peggio = null;
for (const istante of [0, 12000, 24000]) {
  if (istante) await pagina.waitForTimeout(istante === 12000 ? 12000 : 12000);
  const m = await misura();
  if (!m.pronto) { console.log(`\n  t+${istante / 1000}s  non misurabile: ${m.perche}`); continue; }
  const fuori = m.fuoriIngombro + m.lontaniDaOgniZona + m.fuoriQuota;
  console.log(`\n  t+${istante / 1000}s   ${m.agenti} agenti   ingombro ${JSON.stringify(m.ingombro)} m`);
  console.log(`      fuori dall'ingombro    ${m.fuoriIngombro}`);
  console.log(`      oltre 30 m da ogni zona ${m.lontaniDaOgniZona}   (mediana ${m.distanzaMediana} m, max ${m.distanzaMassima} m)`);
  console.log(`      fuori quota            ${m.fuoriQuota}   (quote agenti ${m.quotaMin}..${m.quotaMax}, livelli ${JSON.stringify(m.livelli)})`);
  console.log(`      ─> fuori posto: ${fuori} su ${m.agenti}  (${((fuori / m.agenti) * 100).toFixed(0)}%)`);
  if (!istante) {
    console.log(`      quote ZONE   : ${JSON.stringify(m.quoteZone)}`);
    console.log(`      quote AGENTI : ${JSON.stringify(m.quoteAgenti)}`);
  }
  if (!peggio || fuori > peggio.fuori) peggio = { fuori, tot: m.agenti };
}

console.log("\n" + "=".repeat(62));
if (peggio) {
  const pct = (peggio.fuori / peggio.tot) * 100;
  console.log(pct === 0
    ? "  ESITO: tutti dentro. Il loop base regge."
    : `  ESITO: nel caso peggiore ${peggio.fuori} agenti su ${peggio.tot} (${pct.toFixed(0)}%) sono fuori posto.`);
} else {
  console.log("  ESITO: non e' stato possibile misurare (nessun passeggero in scena).");
}
console.log("=".repeat(62));

await browser.close();
