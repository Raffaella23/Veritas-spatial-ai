// banco/bim.mjs — che cosa dice davvero un IFC vero.
//
//     node banco/bim.mjs <file.ifc>
//
// Non e' una prova automatica (quelle stanno in veritas_bim.test.mjs, su un
// file scritto a mano): e' il banco su cui si guarda un edificio VERO e si
// legge, riga per riga, quello che il file dichiara.
//
// E' anche il primo numero onesto che questo progetto abbia mai avuto: su un
// file con N stanze dichiarate, quante ne indovinava VERITAS partendo dalla
// sola geometria. Finora non c'era modo di saperlo, perche' non c'era niente
// con cui confrontarsi.
//
// Il file di riferimento pubblico e' AC20-FZK-Haus.ifc (KIT Karlsruhe,
// esportato da ARCHICAD 20). Da questa macchina si scarica cosi':
//
//   curl -sL -o /tmp/AC20-FZK-Haus.ifc \
//     https://raw.githubusercontent.com/ThatOpen/engine_web-ifc/main/tests/ifcfiles/public/AC20-FZK-Haus.ifc

import fs from "node:fs";
import * as WebIFC from "web-ifc";
import { leggi, riassunto } from "../veritas_bim.js";

const percorso = process.argv[2];
if (!percorso) {
  console.error("uso: node banco/bim.mjs <file.ifc>");
  process.exit(2);
}
if (!fs.existsSync(percorso)) {
  console.error("non trovo " + percorso);
  process.exit(2);
}

const dati = new Uint8Array(fs.readFileSync(percorso));
console.log("file:", percorso, "-", (dati.length / (1024 * 1024)).toFixed(2), "MB\n");

const esito = await leggi(dati, { webifc: WebIFC, wasm: null, conGeometria: true });

console.log("schema     ", esito.schema);
console.log("esportato da", esito.applicazione || "(non dichiarato)");
console.log("letto in   ", esito.ms, "ms\n");

console.log("--- GLI AMBIENTI DICHIARATI ---");
const perPiano = new Map();
for (const s of esito.spazi) {
  const k = s.piano || "(senza piano)";
  if (!perPiano.has(k)) perPiano.set(k, []);
  perPiano.get(k).push(s);
}
for (const [piano, elenco] of perPiano) {
  console.log("\n  " + piano);
  for (const s of elenco) {
    console.log("    " +
      String(s.numero || "—").padStart(4) + "  " +
      String(s.nome || "(senza nome)").padEnd(26) +
      (s.areaM2 != null ? s.areaM2.toFixed(1).padStart(8) + " m2" : "        —  ") +
      (s.areaDichiarata ? " (dichiarata)" : " (misurata)  ") +
      (s.centro ? "  quota " + s.centro[1].toFixed(2) : "  senza volume"));
  }
}

console.log("\n--- I PASSAGGI DICHIARATI ---");
const nome = new Map(esito.spazi.map((s) => [s.id, s.nome || ("#" + s.id)]));
for (const c of esito.collegamenti) {
  console.log("    " + c.tipo.padEnd(7) + (c.nome ? '"' + c.nome + '" ' : "") +
    nome.get(c.da) + "  <->  " + nome.get(c.a) +
    (c.larghezzaM ? "   luce " + c.larghezzaM.toFixed(2) + " m" : ""));
}
for (const e of esito.esterni) {
  console.log("    " + e.tipo.padEnd(7) + (e.nome ? '"' + e.nome + '" ' : "") +
    nome.get(e.spazio) + "  --> ESTERNO   (qui si entra)");
}
if (!esito.collegamenti.length && !esito.esterni.length) console.log("    (nessuno dichiarato)");

console.log("\n--- LE TAPPE CHE NE ESCONO ---");
for (const z of esito.zone) {
  console.log("    " + z.label.padEnd(26) + z.type.padEnd(9) +
    (z.funzione || "—").padEnd(13) +
    (z.confermata ? "confermata" : "DA CONFERMARE") +
    (z.escluso ? "  (fuori dal percorso)" : ""));
}

console.log("\n--- I DATI PER LE NORMATIVE ---");
console.log("    affollamento dichiarato:", esito.dati.affollamento != null
  ? esito.dati.affollamento + " persone su " + esito.dati.daSpazi + " ambienti"
  : "non dichiarato nel file");
console.log("    ambienti dichiarati accessibili:", esito.dati.accessibili);
console.log("    resistenza al fuoco dichiarata su:", esito.dati.resistenzaAlFuoco.length, "ambienti");

if (esito.isole.length > 1) {
  console.log("\n--- COSA NON SI RAGGIUNGE ---");
  esito.isole.forEach((g, i) => {
    console.log("    gruppo " + (i + 1) + ": " + g.map((id) => nome.get(id)).join(", "));
  });
}

if (esito.avvisi.length) {
  console.log("\n--- QUELLO CHE IL FILE NON DICE ---");
  for (const a of esito.avvisi) console.log("    " + a);
}

if (esito.geometria) {
  const tri = esito.geometria.gruppi.reduce((n, g) => n + g.indici.length / 3, 0);
  console.log("\n--- LA GEOMETRIA DA DISEGNARE ---");
  console.log("    " + esito.geometria.elementi + " elementi -> " +
    esito.geometria.gruppi.length + " gruppi di colore, " + Math.round(tri) + " triangoli");
}

console.log("\n--- IN CHIARO, COME LO DIREBBE IN CHAT ---");
console.log(riassunto(esito) + "\n");
