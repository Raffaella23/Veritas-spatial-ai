// Le 7 tappe assegnate: che superficie hanno, e da dove escono?
//
//     node banco/tappe.mjs
//
// La domanda non e' "quante ne assegna" (7 su 7, gia' misurato) ma "sono
// tappe sensate?". Un terminal fatto di sei briciole e un blocco unico non e'
// una partizione dello spazio: e' un fallimento che si presenta come successo.

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
await p.goto("http://127.0.0.1:8899/index.html", { waitUntil: "load", timeout: 60000 });
await p.waitForTimeout(6000);
await p.fill("#v-new-name", "tappe");
await p.click("#v-create-btn");
await p.waitForTimeout(6000);
await p.click("#vs-start-btn").catch(() => {});
await p.waitForTimeout(10000);
await p.setInputFiles("#vaio-upload-input", path.join(qui, "airport_foot_traffic.glb"));
await p.waitForTimeout(46000);

const r = await p.evaluate(() => {
  const nodi = window.__veritasGetNodes ? window.__veritasGetNodes() : [];
  const zone = window.__veritasAutoZones || [];
  const M = window.__veritasPerceptionEngine;
  return {
    nodi: nodi.map((n) => ({
      nome: n.label || n.name || "?",
      tipo: n.type,
      pos: n.pos ? n.pos.map((v) => +v.toFixed(1)) : null,
      area: n.meta && n.meta.areaM2 != null ? +n.meta.areaM2.toFixed(1) : null,
    })),
    // Le zone MISURATE da cui nascono le tappe.
    areeZone: zone.map((z) => (z.areaM2 != null ? +z.areaM2.toFixed(1) : null)),
    // Gli ambienti veri riconosciuti dal motore geometrico, prima della
    // riduzione a tappe: 31, secondo la console.
    ambienti: M && M.ultimo && M.ultimo() && M.ultimo().ambienti
      ? M.ultimo().ambienti.map((a) => +(a.areaM2 || 0).toFixed(1)).sort((x, y) => y - x)
      : null,
  };
});

console.log("\nLE 7 TAPPE ASSEGNATE");
let somma = 0;
for (const n of r.nodi) {
  somma += n.area || 0;
  console.log(`   ${String(n.nome).padEnd(16)} ${String(n.tipo).padEnd(10)} ${n.area != null ? n.area + " m2" : "area ignota"}   pos ${JSON.stringify(n.pos)}`);
}
console.log("   somma delle aree:", somma.toFixed(1), "m2");
console.log("\n   aree delle zone misurate:", JSON.stringify(r.areeZone));
if (r.ambienti) {
  console.log("   ambienti del motore (i 10 piu' grandi):", JSON.stringify(r.ambienti.slice(0, 10)));
  console.log("   ambienti totali:", r.ambienti.length,
    "somma:", r.ambienti.reduce((a, c) => a + c, 0).toFixed(1), "m2");
}

console.log("\n   righe pertinenti:");
log.filter((l) => /zone|tappe|percorso|scartat|nome/i.test(l)).slice(-8)
   .forEach((l) => console.log("     " + l.slice(0, 165)));

await b.close();
