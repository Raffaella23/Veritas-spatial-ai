// L'IFC, collegato davvero:  node banco/bim_collegato.mjs [file.ifc]
//
// `veritas_bim.test.mjs` dice che il MODULO e' giusto. Questa prova dice se il
// PROGRAMMA lo usa, ed e' la domanda diversa che in questo progetto e' gia'
// costata una giornata: un modulo giusto collegato male non da' nessun errore
// in console. Si carica un IFC dal widget VERO, come lo caricherebbe una
// persona, e si guarda cosa c'e' sullo schermo dopo.
//
// Le tre cose che possono rompersi in silenzio, e che questa prova vedrebbe:
//
//   1. le zone dichiarate dal file vengono SCAVALCATE da quelle dedotte
//      dalla geometria — che e' esattamente il difetto che il 13/08 aveva
//      fatto vincere 5 nodi presi dai nomi delle mesh su 7 zone misurate,
//      solo perche' arrivavano prima;
//   2. le posizioni restano nello spazio del FILE mentre il modello, messo in
//      scena, viene appoggiato a quota zero: cartelli sospesi, nessun errore;
//   3. la deduzione automatica della scala si accende su un file che le
//      unita' le dichiara, e moltiplica per sei un edificio gia' giusto.
//
// ⚠️ Serve `sh banco/monta.sh` prima (vendorizza anche web-ifc e il suo .wasm)
//    e il server: (cd banco && python3 -m http.server 8899 &)
//
// Il file di riferimento e' AC20-FZK-Haus.ifc, export ARCHICAD 20 del modello
// pubblico del KIT. Da questa macchina:
//   curl -sL -o banco/AC20-FZK-Haus.ifc \
//     https://raw.githubusercontent.com/ThatOpen/engine_web-ifc/main/tests/ifcfiles/public/AC20-FZK-Haus.ifc

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const modello = process.argv[2] || path.join(qui, "AC20-FZK-Haus.ifc");
if (!fs.existsSync(modello)) {
  console.error("manca " + modello + " — vedi l'intestazione di questo file per il comando");
  process.exit(2);
}

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
await p.fill("#v-new-name", "bim");
await p.click("#v-create-btn");
await p.waitForTimeout(6000);
await p.click("#vs-start-btn").catch(() => {});
await p.waitForTimeout(6000);

console.log("carico " + path.basename(modello) + " dal widget vero…");
await p.setInputFiles("#vaio-upload-input", modello);
await p.waitForTimeout(45000);

const r = await p.evaluate(() => {
  const e = window.__veritasBimEsito;
  const nodi = window.__veritasGetNodes ? window.__veritasGetNodes() : [];
  const radice = window.__veritasModelRoot;
  let ingombro = null;
  if (radice && window.THREE) {
    const bb = new window.THREE.Box3().setFromObject(radice);
    ingombro = { min: bb.min.toArray().map((v) => +v.toFixed(2)),
                 max: bb.max.toArray().map((v) => +v.toFixed(2)) };
  }
  return {
    moduloPresente: !!window.__veritasBim,
    letto: !!e,
    conteggi: e ? e.conteggi : null,
    avvisi: e ? e.avvisi : [],
    affollamento: window.__veritasDatiProgetto && window.__veritasDatiProgetto.affollamento,
    affollamentoDaBim: !!(window.__veritasDatiProgetto && window.__veritasDatiProgetto.affollamentoDaBim),
    scala: radice ? +radice.scale.x.toFixed(3) : null,
    ingombro,
    zoneDichiarate: (window.__veritasZoneDichiarate || []).length,
    grafo: window.__veritasGrafoDichiarato
      ? { passaggi: window.__veritasGrafoDichiarato.quanti,
          stanze: window.__veritasGrafoDichiarato.stanze.size } : null,
    // ⚠️ LA PROVA CHE CONTA: fra due stanze separate da un muro, il percorso
    // passa dalla porta o taglia dritto? Si misura lo scarto dalla retta.
    cammino: (() => {
      const G = window.__veritasGrafoDichiarato, B = window.__veritasBim;
      if (!G || !B) return null;
      const z = window.__veritasZoneDichiarate || [];
      const fuori = [];
      for (let i = 0; i < z.length && fuori.length < 4; i++) {
        for (let j = i + 1; j < z.length && fuori.length < 4; j++) {
          const via = B.percorsoDichiarato(G, z[i].pos, z[j].pos);
          if (!via) { fuori.push({ da: z[i].label, a: z[j].label, via: null }); continue; }
          // quanto il percorso si scosta dalla retta fra i due baricentri
          let max = 0;
          const ax = z[i].pos[0], az = z[i].pos[2], bx = z[j].pos[0], bz = z[j].pos[2];
          const L = Math.hypot(bx - ax, bz - az) || 1;
          for (const p of via) {
            const d = Math.abs((bx - ax) * (az - p[2]) - (ax - p[0]) * (bz - az)) / L;
            if (d > max) max = d;
          }
          fuori.push({ da: z[i].label, a: z[j].label, tappe: via.length,
                       scarto: +max.toFixed(2),
                       dislivello: +(Math.max(...via.map((p) => p[1])) - Math.min(...via.map((p) => p[1]))).toFixed(2) });
        }
      }
      return fuori;
    })(),
    nodi: nodi.map((n) => ({ label: n.label, type: n.type, origine: n.origine,
                             confermata: n.confermata,
                             y: +(n.pos ? n.pos[1] : 0).toFixed(2) })),
  };
});

await p.screenshot({ path: path.join(qui, "bim_collegato.png") });
await b.close();

const dice = [];
function verifica(cond, che, dettaglio) {
  dice.push((cond ? "  ok    " : "  ROTTO ") + che + (dettaglio ? "   " + dettaglio : ""));
  return cond;
}

console.log("\n=== IL PROGRAMMA USA IL LETTORE? ===");
verifica(r.moduloPresente, "il modulo e' legato a window.__veritasBim");
verifica(r.letto, "l'IFC e' stato letto passando dal widget di caricamento");
if (r.conteggi) {
  console.log("  " + JSON.stringify(r.conteggi));
}

console.log("\n=== LE ZONE SULLO SCHERMO VENGONO DAL FILE? ===");
const daBim = r.nodi.filter((n) => n.origine === "bim");
verifica(r.zoneDichiarate >= 2, "le zone dichiarate sono state applicate",
  r.zoneDichiarate + " zone");
verifica(daBim.length === r.nodi.length && r.nodi.length > 0,
  "TUTTE le tappe sullo schermo dichiarano origine 'bim'",
  daBim.length + " su " + r.nodi.length);
for (const n of r.nodi) {
  console.log("    " + n.label.padEnd(24) + n.type.padEnd(9) +
    String(n.origine).padEnd(8) + "quota " + n.y +
    (n.confermata ? "   confermata" : "   DA CONFERMARE"));
}

console.log("\n=== LE POSIZIONI SEGUONO IL MODELLO? ===");
// Il modello viene appoggiato a quota zero: se le zone fossero rimaste nello
// spazio del file starebbero sotto o sopra il pavimento.
if (r.ingombro) console.log("    ingombro del modello in scena: y da " + r.ingombro.min[1] + " a " + r.ingombro.max[1]);
const quote = r.nodi.map((n) => n.y);
verifica(quote.length > 0 && quote.every((y) => r.ingombro && y >= r.ingombro.min[1] - 0.6 && y <= r.ingombro.max[1] + 0.6),
  "ogni tappa sta dentro l'altezza del modello", "quote " + [...new Set(quote)].join(", "));

console.log("\n=== SI CAMMINA DALLE PORTE, NON DENTRO I MURI ===");
if (r.grafo) {
  verifica(r.grafo.passaggi >= 2, "il grafo camminabile e' stato costruito dalle porte dichiarate",
    r.grafo.passaggi + " passaggi fra " + r.grafo.stanze + " ambienti");
  for (const c of r.cammino || []) {
    console.log("    " + (c.da + " -> " + c.a).padEnd(30) +
      (c.via === null ? "nessuna strada dichiarata"
        : c.tappe + " tappe, scarto dalla retta " + c.scarto + " m, dislivello " + c.dislivello + " m"));
  }
  const conStrada = (r.cammino || []).filter((c) => c.via !== null);
  verifica(conStrada.length > 0, "esistono percorsi dichiarati fra gli ambienti",
    conStrada.length + " coppie su " + (r.cammino || []).length);
  verifica(conStrada.some((c) => c.scarto > 0.3),
    "almeno un percorso DEVIA dalla retta per passare da una porta");
} else {
  verifica(false, "il grafo camminabile non e' stato costruito");
}

console.log("\n=== LA SCALA NON VIENE INDOVINATA ===");
verifica(r.scala === 1, "il modello NON e' stato riscalato: un IFC dichiara le unita'",
  "fattore " + r.scala);
const rigaScala = log.find((l) => l.includes("[VERITAS scala]"));
console.log("    " + (rigaScala || "(nessuna riga di scala)"));

console.log("\n=== L'AFFOLLAMENTO ARRIVA ALLE NORMATIVE? ===");
if (r.conteggi && r.affollamento != null) {
  verifica(r.affollamentoDaBim, "l'affollamento dichiarato nel file e' arrivato ai dati di progetto",
    r.affollamento + " persone");
} else {
  console.log("    questo file non dichiara l'affollamento (ed e' giusto dirlo, non inventarlo)");
}

console.log("\n=== QUELLO CHE IL FILE NON DICE, DETTO ===");
for (const a of r.avvisi) console.log("    " + a);

const righeBim = log.filter((l) => l.includes("[VERITAS bim]"));
console.log("\n=== LA CONSOLE ===");
for (const l of righeBim.slice(0, 8)) console.log("    " + l);
const errori = log.filter((l) => l.startsWith("PAGEERROR"));
if (errori.length) { console.log("\n  ERRORI DI PAGINA:"); for (const e of errori.slice(0, 5)) console.log("    " + e); }

console.log("\n" + dice.join("\n"));
const rotte = dice.filter((d) => d.includes("ROTTO")).length;
console.log("\n" + (rotte ? rotte + " ROTTE" : "tutto verde") + "  — schermata in banco/bim_collegato.png");
process.exit(rotte ? 1 : 0);
