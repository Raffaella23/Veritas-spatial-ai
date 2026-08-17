// I 31 ambienti del motore: che superficie hanno DAVVERO?
//
//     node banco/ambienti.mjs
//
// La domanda che decide tutto: il blocco da 3545 m2 lo produce il MOTORE
// (allora la partizione e' falsa alla radice) o la RIDUZIONE a 7 tappe
// (allora il motore va bene e si sbaglia a scegliere)?
//
// window.__veritasPercezione conserva il risultato completo di perceive().

import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
});
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
const t0 = Date.now();
const cronologia = [];
p.on("console", (m) => {
  const t = m.text();
  if (/nuvola|motore geometrico|ambiente articolato|ambiente unico|sottocampion|percorso\]/i.test(t)) {
    cronologia.push(`+${((Date.now() - t0) / 1000).toFixed(1)}s  ${t.slice(0, 150)}`);
  }
});
await p.goto("http://127.0.0.1:8899/index.html", { waitUntil: "load", timeout: 60000 });
await p.waitForTimeout(6000);
await p.fill("#v-new-name", "ambienti");
await p.click("#v-create-btn");
await p.waitForTimeout(6000);
await p.click("#vs-start-btn").catch(() => {});
await p.waitForTimeout(10000);
await p.setInputFiles("#vaio-upload-input", path.join(qui, "airport_foot_traffic.glb"));
await p.waitForTimeout(110000);

const r = await p.evaluate(() => {
  const P = window.__veritasPercezione;
  if (!P) return { assente: true };
  const zone = (P.zones || []).map((z) => ({
    area: +(z.areaM2 || 0).toFixed(1),
    tipo: z.kind,
    liv: z.floorIdx || 0,
    y: z.y != null ? +z.y.toFixed(1) : null,
    clearance: z.maxClearanceM != null ? +z.maxClearanceM.toFixed(2) : null,
  })).sort((a, c) => c.area - a.area);
  return {
    nZone: zone.length,
    zone,
    totale: +(P.totalNavigableM2 || 0).toFixed(1),
    livelli: (P.levels || []).map((l) => ({
      y: +l.levelY.toFixed(2),
      cella: l.cellSize,
      areaNav: l.navigableAreaM2,
      punti: l.pointsSampled,
      nZone: (l.zones || []).length,
      spaziatura: l.resolution ? l.resolution.pointSpacingM : null,
      sottoCampionato: l.resolution ? l.resolution.underSampled : null,
      avviso: l.resolution ? l.resolution.warning : null,
    })),
    varchi: (P.gateways || []).length,
    strettoie: (P.bottlenecks || []).length,
    puntiNuvola: (window.__veritasAutoPoints || []).length,
  };
});

if (r.assente) { console.log("__veritasPercezione assente"); console.log("\nCRONOLOGIA");
for (const r of cronologia) console.log("   " + r);
await b.close(); process.exit(1); }

console.log(`\nMOTORE: ${r.nZone} ambienti, ${r.totale} m2 in totale, nuvola ${r.puntiNuvola} punti`);
console.log(`        ${r.varchi} varchi, ${r.strettoie} strettoie\n`);
console.log("LIVELLI");
for (const l of r.livelli) {
  console.log(`   y=${l.y}  cella ${l.cella} m  spaziatura ${l.spaziatura}  punti ${l.punti}`);
  console.log(`   ${l.nZone} ambienti, ${l.areaNav} m2 navigabili${l.sottoCampionato ? "  ⚠ SOTTOCAMPIONATO" : ""}`);
  if (l.avviso) console.log("   avviso: " + l.avviso);
}

console.log("\nAMBIENTI, dal piu' grande");
for (const z of r.zone.slice(0, 12)) {
  console.log(`   ${String(z.area).padStart(8)} m2   ${String(z.tipo).padEnd(10)} liv ${z.liv} y=${z.y}  clearance ${z.clearance} m`);
}
if (r.zone.length > 12) console.log(`   ... e altri ${r.zone.length - 12}`);

const grande = r.zone[0].area;
const resto = r.zone.slice(1).reduce((s, z) => s + z.area, 0);
console.log(`\nIL PIU' GRANDE tiene ${grande} m2 = ${((grande / (grande + resto)) * 100).toFixed(1)}% dello spazio`);
console.log(`gli altri ${r.zone.length - 1} insieme: ${resto.toFixed(1)} m2`);
const briciole = r.zone.filter((z) => z.area < 20).length;
console.log(`ambienti sotto i 20 m2 (briciole): ${briciole} su ${r.zone.length}`);

console.log("\nCRONOLOGIA");
for (const r of cronologia) console.log("   " + r);
await b.close();
