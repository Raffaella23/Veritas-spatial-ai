// La misura del pavimento e' cambiata? A/B fra prima e dopo veritas_aspetto.
//
//     node banco/regressione.mjs prima|dopo
//
// La console ha dichiarato "Pavimento 2085 m2", ma la §13.4 documenta 3592 m2
// letti dall'occhio e 3700,5 dal motore geometrico. Prima di dire "l'ho rotto
// io" o "non l'ho rotto io", si misura: la stessa pagina, lo stesso modello,
// una volta con il modulo nuovo e una volta senza.
//
// banco/monta.sh genera banco/index.html dal file corrente; banco/index_prima.html
// va generato dal file committato (vedi il comando nel messaggio di commit).

import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const quale = process.argv[2] === "prima" ? "index_prima.html" : "index.html";
console.log("pagina servita: " + quale);

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
});
const pagina = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const righe = [];
pagina.on("console", (m) => righe.push(m.text()));

await pagina.goto("http://127.0.0.1:8899/" + quale, { waitUntil: "load", timeout: 60000 });
await pagina.waitForTimeout(6000);
await pagina.fill("#v-new-name", "regressione");
await pagina.click("#v-create-btn");
await pagina.waitForTimeout(7000);
await pagina.click("#vs-start-btn").catch(() => {});
await pagina.waitForTimeout(12000);

const tela0 = await pagina.evaluate(() => {
  const c = document.querySelector("canvas");
  const r = c.getBoundingClientRect();
  return [Math.round(r.width), Math.round(r.height)];
});

await pagina.setInputFiles("#vaio-upload-input", path.join(qui, "airport_foot_traffic.glb"));
await pagina.waitForTimeout(38000);

const esito = await pagina.evaluate(() => {
  const c = document.querySelector("canvas");
  const r = c.getBoundingClientRect();
  const log = document.getElementById("vaio-console-log");
  const testo = log ? log.innerText : "";
  const prendi = (re) => { const m = testo.match(re); return m ? m[1] : null; };
  const R = window.__veritasReferto;
  return {
    tela: [Math.round(r.width), Math.round(r.height)],
    // Quello che la chat DICHIARA all'utente.
    pavimentoDichiarato: prendi(/Pavimento\s+([\d.,]+)\s*m/i),
    navigabileDichiarato: prendi(/([\d.,]+)\s*m2?\s*navigabil/i),
    zone: prendi(/(\d+)\s+zone/i),
    // Quello che sta nella memoria di lavoro, se c'e'.
    referto: R && R.tutte ? R.tutte().filter((v) =>
      /paviment|navigabil|area/i.test(v.nome || "")
    ).map((v) => `${v.nome}=${v.valore}${v.unita || ""}[${v.fonte || "?"}]`) : null,
  };
});

console.log("  tela prima del modello :", JSON.stringify(tela0));
console.log("  tela dopo il modello   :", JSON.stringify(esito.tela));
console.log("  pavimento dichiarato   :", esito.pavimentoDichiarato);
console.log("  navigabile dichiarato  :", esito.navigabileDichiarato);
console.log("  zone                   :", esito.zone);
console.log("  referto                :", JSON.stringify(esito.referto));

const interessanti = righe.filter((l) => /pavimento|navigabil|m2|motore geometrico|vista/i.test(l));
console.log("\n  righe di console pertinenti:");
for (const l of interessanti.slice(0, 10)) console.log("    " + l.slice(0, 160));

await browser.close();
