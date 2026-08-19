// Cosa c'e' dentro un modello:  node banco/cose_nel_modello.mjs <file.glb>
//
// A COSA SERVE
// E' il primo passo da fare davanti a un modello mai visto, e va fatto PRIMA
// di scrivere qualunque riga che lo riguardi. Raffaella, 19/08/2026: *«quel
// modello e' solo un esempio — stai costruendo un sistema che si deve trovare
// di fronte a tanti modelli.»*
//
// Risponde a una domanda sola: **quali oggetti ripetuti ci sono, dove stanno,
// e che forma hanno?** Cioe' il piano 2 del grafo di scena, misurato fuori dal
// browser dove si puo' guardare con calma.
//
// PERCHE' PASSA DA `veritas_cose.js` E NON RIFA' IL CONTO
// Perche' altrimenti diverge. Questo banco e il programma devono dare la stessa
// risposta sullo stesso file, sempre: se qui ci fosse una copia della logica,
// alla prima modifica le due risposte si separerebbero e nessuno se ne
// accorgerebbe. E' il difetto che questo progetto ha gia' pagato due volte —
// due moduli con lo stesso nome, due raggruppamenti della segnaletica.
// Qui c'e' SOLO l'adattatore: da GLB a inventario. Il resto e' il modulo vero.
//
// PERCHE' LEGGE IL GLB A MANO
// Un GLB e' un contenitore documentato: dodici byte di intestazione, poi dei
// blocchi, e il primo blocco e' il JSON con tutta la struttura. Nomi, gerarchia,
// trasformazioni e ingombri stanno li' — non serve decodificare un solo
// vertice, e quindi non serve nessuna libreria. Nel browser questo passaggio non
// esiste affatto: il modello l'ha gia' aperto three.js.
import { readFileSync } from "node:fs";
import C from "../veritas_cose.js";
import P from "../veritas_controprova.js";

// ---------------------------------------------------------------------------
// Da GLB a inventario
// ---------------------------------------------------------------------------

function leggiGlb(percorso) {
  const buf = readFileSync(percorso);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error("non e' un file GLB");
  let off = 12, json = null;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32LE(off), tipo = buf.readUInt32LE(off + 4);
    if (tipo === 0x4e4f534a) json = JSON.parse(buf.slice(off + 8, off + 8 + len).toString("utf8"));
    off += 8 + len;
  }
  if (!json) throw new Error("nessun blocco JSON dentro il GLB");
  return json;
}

/** Matrice di un nodo: o e' data, o si compone da posizione/rotazione/scala. */
function matriceLocale(n) {
  if (n.matrix) return n.matrix.slice();
  const t = n.translation || [0, 0, 0], r = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1];
  const [x, y, z, w] = r;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
    (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
}

function moltiplica(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let v = 0;
    for (let k = 0; k < 4; k++) v += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = v;
  }
  return o;
}

const applica = (M, p) => [
  M[0] * p[0] + M[4] * p[1] + M[8] * p[2] + M[12],
  M[1] * p[0] + M[5] * p[1] + M[9] * p[2] + M[13],
  M[2] * p[0] + M[6] * p[1] + M[10] * p[2] + M[14],
];

/** Ingombro locale di una mesh: sta gia' negli accessor, non serve leggere i vertici. */
function ingombroLocale(g, mi) {
  const m = g.meshes[mi];
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  let nVertici = 0, nTriangoli = 0, materiale = [];
  for (const p of m.primitives || []) {
    const a = g.accessors[p.attributes && p.attributes.POSITION];
    if (!a) continue;
    nVertici += a.count;
    nTriangoli += Math.floor((p.indices !== undefined ? g.accessors[p.indices].count : a.count) / 3);
    materiale.push(p.material === undefined ? "-" : p.material);
    if (!a.min || !a.max) continue;
    for (let i = 0; i < 3; i++) { mn[i] = Math.min(mn[i], a.min[i]); mx[i] = Math.max(mx[i], a.max[i]); }
  }
  if (!isFinite(mn[0])) return null;
  return { mn, mx, nVertici, nTriangoli, materiale: materiale.sort().join(",") };
}

/**
 * L'inventario, come lo vuole `veritas_cose.js`.
 *
 * ⚠️ L'ingombro va dato due volte, e sono due cose diverse:
 *    - `ingombroLocale`  quanto e' grande l'oggetto in se', prima di ruotarlo:
 *                        serve alla firma, perche' un oggetto girato resta lo
 *                        stesso oggetto;
 *    - `ingombro`        quanto occupa nel mondo, dopo la rotazione: serve alle
 *                        misure e alla forma.
 */
export function inventarioDaGlb(g) {
  const fuori = [];
  const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const scena = g.scenes[g.scene || 0];

  (function scendi(idx, padre) {
    const n = g.nodes[idx];
    const M = moltiplica(padre, matriceLocale(n));
    if (n.mesh !== undefined) {
      const b = ingombroLocale(g, n.mesh);
      if (b) {
        // gli otto vertici della scatola, portati nel mondo
        const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
        for (let a = 0; a < 8; a++) {
          const p = applica(M, [a & 1 ? b.mx[0] : b.mn[0], a & 2 ? b.mx[1] : b.mn[1], a & 4 ? b.mx[2] : b.mn[2]]);
          for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); }
        }
        // la scala del mondo, per riportare l'ingombro locale alla misura vera
        const s = [Math.hypot(M[0], M[1], M[2]), Math.hypot(M[4], M[5], M[6]), Math.hypot(M[8], M[9], M[10])];

        // DA CHE PARTE GUARDA. Una comparsa e' quasi sempre un piano sottile
        // con sopra la fotografia di una persona: la direzione dello sguardo e'
        // la normale di quel piano, cioe' l'asse locale piu' sottile portato
        // nel mondo.
        //
        // ⚠️ Si conosce l'ASSE, non il verso: il piano ha due facce e quale sia
        //    quella stampata non si sa senza leggere la texture. Chi usa questo
        //    dato deve saperlo — `veritas_controprova.js` infatti confronta
        //    solo assi.
        const dLoc = [(b.mx[0] - b.mn[0]) * s[0], (b.mx[1] - b.mn[1]) * s[1], (b.mx[2] - b.mn[2]) * s[2]];
        let asse = 0;
        if (dLoc[1] < dLoc[asse]) asse = 1;
        if (dLoc[2] < dLoc[asse]) asse = 2;
        const col = [M[asse * 4], M[asse * 4 + 1], M[asse * 4 + 2]];
        const nCol = Math.hypot(col[0], col[2]);            // solo in pianta
        const avanti = nCol > 1e-6 ? [col[0] / nCol, 0, col[2] / nCol] : null;

        fuori.push({
          avanti,
          id: "n" + idx,
          nome: n.name || "",              // ⚠️ solo per stamparlo: non entra mai nella firma
          centro: [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2],
          ingombro: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]],
          ingombroLocale: [(b.mx[0] - b.mn[0]) * s[0], (b.mx[1] - b.mn[1]) * s[1], (b.mx[2] - b.mn[2]) * s[2]],
          nVertici: b.nVertici,
          nTriangoli: b.nTriangoli,
          materiale: b.materiale,
        });
      }
    }
    for (const c of n.children || []) scendi(c, M);
  })(scena.nodes[0], I);

  return fuori;
}

// ---------------------------------------------------------------------------
// La scala: senza questa ogni misura qui sotto e' priva di senso
// ---------------------------------------------------------------------------
//
// Le fasce di `veritas_cose.js` sono in metri, perche' vengono dal corpo umano.
// Un modello esportato in centimetri o in pollici le sbaglia tutte. Nel
// programma ci pensa `veritas_scala.js` prima di ogni misura; qui si stima allo
// stesso modo, dall'ingombro complessivo, e SI DICE.

function stimaScala(inv) {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const p of inv) for (let i = 0; i < 3; i++) {
    mn[i] = Math.min(mn[i], p.centro[i] - p.ingombro[i] / 2);
    mx[i] = Math.max(mx[i], p.centro[i] + p.ingombro[i] / 2);
  }
  return { dim: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]], min: mn, max: mx };
}

// ---------------------------------------------------------------------------

const file = process.argv[2];
if (!file) {
  console.error("uso: node banco/cose_nel_modello.mjs <file.glb> [--scala N]");
  process.exit(2);
}
const iScala = process.argv.indexOf("--scala");
const scala = iScala > 0 ? Number(process.argv[iScala + 1]) : 1;

const g = leggiGlb(file);
let inv = inventarioDaGlb(g);
if (scala !== 1) {
  inv = inv.map((p) => ({
    ...p,
    centro: p.centro.map((v) => v * scala),
    ingombro: p.ingombro.map((v) => v * scala),
    ingombroLocale: p.ingombroLocale.map((v) => v * scala),
  }));
}

const ing = stimaScala(inv);
console.log("file            ", file);
console.log("pezzi           ", inv.length, "  (nodi con una mesh)");
console.log("ingombro totale ", ing.dim.map((v) => v.toFixed(1)).join(" x "), scala === 1 ? "(unita del file)" : "m");
if (scala === 1) {
  console.log("\n⚠️  scala non dichiarata: le misure qui sotto sono nelle unita del file.");
  console.log("    Se il modello non e' in metri, ogni fascia (seduta, banco, portata)");
  console.log("    e' priva di senso. Rilancia con --scala N per convertire.");
}

const r = C.cose(inv);
const posti = C.posti(r.cose);
const quote = C.quotePavimento(inv);

console.log("\nquote di pavimento:", quote.map((q) => q.toFixed(2)).join(", "));
console.log("firme distinte:    ", r.firme, " | pezzi scartati (senza copie):", r.scartate);
console.log("COSE (gruppi di oggetti ripetuti):", r.cose.length);
console.log("POSTI (dove cose diverse stanno insieme):", posti.length);

const perForma = {};
for (const c of r.cose) perForma[c.forma] = (perForma[c.forma] || 0) + c.quante;
console.log("\noggetti per forma:", Object.entries(perForma)
  .sort((a, b) => b[1] - a[1]).map(([f, n]) => f + " " + n).join("  |  "));

console.log("\n--- le prime 25 cose ---");
console.log("quante | forma      | disposiz. | uno (m)              | dove (x,z)        | nome nel file");
for (const c of r.cose.slice(0, 25)) {
  console.log(
    String(c.quante).padStart(6), "|",
    (c.forma || "-").padEnd(10), "|",
    (c.disposizione || "-").padEnd(9), "|",
    c.ingombroUno.map((v) => v.toFixed(2)).join(" x ").padEnd(20), "|",
    (c.centro[0].toFixed(1) + ", " + c.centro[2].toFixed(1)).padEnd(17), "|",
    (c.pezzi[0].nome || "-").slice(0, 28));
}

console.log("\n--- i primi 12 posti ---");
console.log("oggetti | gruppi | area m2 | forma prevalente | dove (x,z)");
for (const p of posti.slice(0, 12)) {
  console.log(
    String(p.oggetti).padStart(7), "|",
    String(p.gruppi).padStart(6), "|",
    p.area.toFixed(0).padStart(7), "|",
    (p.formaPrevalente || "-").padEnd(16), "|",
    p.centro[0].toFixed(1) + ", " + p.centro[2].toFixed(1));
}

console.log("\n" + C.racconta(r, posti));

// ---------------------------------------------------------------------------
// La risposta che il modello si porta dietro
// ---------------------------------------------------------------------------
//
// Raffaella, 19/08: *«dovrei ritrovare una corrispondenza fra la presenza delle
// persone, le facce e le zone che metti tu. Questa sara' la controprova.»*
// Qui si stampa solo la RISPOSTA — dove il modello dice che sta la gente. Il
// confronto con le zone si fa nel browser, dove le zone esistono.

const f = P.figure(r.cose);
if (!f.length) {
  console.log("\n[controprova] nessuna figura umana in questo modello: "
    + "manca il termine di paragone.");
} else {
  const gruppi = P.capannelli(f);
  console.log("\n=== LA RISPOSTA DEL MODELLO: dove sta la gente ===");
  console.log(P.quantePersone(f) + " figure umane, in " + gruppi.length + " capannelli.");
  console.log("\npersone | raggio | sguardo concorde | dove (x,z)");
  for (const g of gruppi.slice(0, 15)) {
    console.log(
      String(g.persone).padStart(7), "|",
      (g.raggio.toFixed(1) + " m").padStart(6), "|",
      (g.sguardo == null ? "non noto" : g.sguardo.toFixed(2)
        + (g.sguardo > 0.8 ? "  <- coda o platea" : "")).padEnd(22), "|",
      g.centro[0].toFixed(1) + ", " + g.centro[2].toFixed(1));
  }
  console.log("\nOgni riga e' un posto dove il progettista ha messo delle persone.");
  console.log("Se le zone del programma non ci cadono sopra, non ha capito lo spazio.");
  console.log("⚠️ Queste figure NON devono servire a decidere le zone: solo a verificarle.");
}
