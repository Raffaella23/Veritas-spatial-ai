// Le tappe cadono dove sta la gente?   node banco/controprova.mjs
//
// Raffaella, 19/08/2026: *«quando il sistema funzionera' alla perfezione, dovrei
// ritrovare una corrispondenza fra la presenza delle persone, le facce e le
// zone che metti tu. Questa sara' la controprova che il sistema funziona.»*
//
// Le prove di `veritas_cose.test.mjs` e `veritas_controprova.test.mjs` dicono
// che i MODULI sono giusti. Questa dice se il PROGRAMMA li usa, e con che
// risultato — la domanda diversa che in questo progetto e' gia' costata una
// giornata: un modulo giusto collegato male non da' nessun errore in console.
//
// ⚠️ Le figure umane NON entrano nel decidere dove vanno le tappe: `appoggiaTappe`
//    le esclude. Se ci entrassero, questa misura si darebbe ragione da sola.
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const modello = process.argv[2] || path.join(qui, "airport_foot_traffic.glb");

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
await p.fill("#v-new-name", "controprova");
await p.click("#v-create-btn");
await p.waitForTimeout(6000);
await p.click("#vs-start-btn").catch(() => {});
await p.waitForTimeout(8000);
await p.setInputFiles("#vaio-upload-input", modello);
await p.waitForTimeout(60000);

const r = await p.evaluate(() => {
  const CO = window.__veritasCose, CP = window.__veritasControprova;
  const trovate = window.__veritasCoseTrovate;
  const nodi = window.__veritasGetNodes ? window.__veritasGetNodes() : [];
  const out = {
    moduloCose: !!CO,
    moduloControprova: !!CP,
    lette: !!trovate,
    navmesh: !!(window.__veritasNavmesh && window.__veritasNavmesh.stato()),
    zone: nodi.map((n) => ({
      label: n.label, pos: n.pos, origine: n.origine || null,
      posto: n.posto ? { oggetti: n.posto.oggetti, forma: n.posto.formaPrevalente } : null,
    })),
  };
  if (trovate) {
    out.cose = trovate.cose.length;
    out.pezzi = trovate.pezzi;
    out.posti = trovate.posti.length;
    out.ms = trovate.ms;
    out.perForma = trovate.cose.reduce((a, c) => {
      a[c.forma] = (a[c.forma] || 0) + c.quante; return a;
    }, {});
  }
  if (CP && trovate && nodi.length) {
    const esito = CP.controprova(nodi, trovate.cose);
    out.controprova = esito;
    out.racconto = CP.racconta(esito);
  }
  // Le file: le persone ferme sono code, non ostacoli.
  const FI = window.__veritasFila;
  if (FI && CP && trovate) {
    const cap = CP.capannelli(CP.figure(trovate.cose));
    // i servizi sono le COSE a mezza altezza — banchi, chioschi, varchi — e
    // servono a capire da che parte guarda una fila
    const servizi = trovate.posti
      .filter((p) => p.formaPrevalente === "banco")
      .map((p) => p.centro);
    const file = FI.file(cap, { servizi });
    out.file = file.map((f) => ({
      tipo: f.tipo, persone: f.persone,
      lunghezza: +f.lunghezza.toFixed(1),
      testa: f.testa.map((v) => +v.toFixed(1)),
      coda: f.coda.map((v) => +v.toFixed(1)),
      verso: f.perche,
      dietro: FI.postoInCoda(f, 1).map((v) => +v.toFixed(1)),
    }));
    out.servizi = servizi.length;
    out.raccontoFile = FI.racconta(file);
  }
  return out;
});

console.log("=== IL PROGRAMMA USA IL PIANO 2? ===");
console.log("modulo cose collegato       ", r.moduloCose ? "si" : "NO");
console.log("modulo controprova collegato", r.moduloControprova ? "si" : "NO");
console.log("navmesh pronta              ", r.navmesh ? "si" : "NO");
console.log("cose lette dal modello      ", r.lette ? "si" : "NO");
if (r.lette) {
  console.log("  " + r.cose + " gruppi di oggetti ripetuti su " + r.pezzi + " pezzi, "
    + r.posti + " posti, " + r.ms + " ms");
  console.log("  forme: " + Object.entries(r.perForma).sort((a, b) => b[1] - a[1])
    .map(([f, n]) => f + " " + n).join("  |  "));
}

console.log("\n=== DOVE SONO FINITE LE TAPPE ===");
for (const z of r.zone) {
  console.log("  " + (z.label || "?").padEnd(24),
    "(" + z.pos.map((v) => v.toFixed(1)).join(", ") + ")",
    " origine: " + (z.origine || "-"),
    z.posto ? " sopra " + z.posto.oggetti + " " + z.posto.forma : "");
}
const daCose = r.zone.filter((z) => (z.origine || "").includes("cose")).length;
console.log("\n" + daCose + " tappe su " + r.zone.length + " sono appoggiate su cose misurate.");

console.log("\n" + (r.racconto || "[nessuna controprova]"));

if (r.file) {
  console.log("\n=== LE FILE: chi arriva si mette dietro, non attraversa ===");
  console.log("(" + r.servizi + " servizi noti — i banchi misurati — per capire da che parte guardano)\n");
  console.log("tipo    | persone | lungh. | testa (x,z)      | ci si mette in (x,z)  | verso da");
  for (const f of r.file.slice(0, 12)) {
    console.log(
      f.tipo.padEnd(7), "|",
      String(f.persone).padStart(7), "|",
      (f.lunghezza + " m").padStart(6), "|",
      (f.testa[0] + ", " + f.testa[2]).padEnd(16), "|",
      (f.tipo === "fila" ? f.dietro[0] + ", " + f.dietro[2] : "-").padEnd(21), "|",
      f.verso);
  }
  console.log("\n" + r.raccontoFile);
}

const interessanti = log.filter((l) =>
  /VERITAS cose|VERITAS cammino|PAGEERROR|controprova/i.test(l));
console.log("\n=== console del browser ===");
for (const l of interessanti.slice(0, 25)) console.log("  " + l);

await b.close();
process.exit(r.lette && r.zone.length ? 0 : 1);
