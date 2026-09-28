// veritas_regia.test.mjs — il catalogo da 4 per foglio (HANDOFF §12, passo D)
// node veritas_regia.test.mjs
import { nomiPerTassello, paroleDiCose, scegliFermate, PER_FOGLIO, NON_SONO_COSE, verificaAffordance, ragionamento, quotaVerticaleDaTriangoli } from "./veritas_regia.js";
import { VOCABOLARIO } from "./veritas_riconosce.js";

let ok = 0, ko = 0;
const prova = (nome, cond) => { if (cond) ok++; else { ko++; console.log("✖ " + nome); } };

// il foglio 2 x 2 come lo fa la regia: tasselli da 480, gronda 8 → 976 x 976
const T = [{ x: 8, y: 8, w: 480, h: 480 }, { x: 496, y: 8, w: 480, h: 480 },
           { x: 8, y: 496, w: 480, h: 480 }, { x: 496, y: 496, w: 480, h: 480 }];
const W = 976, H = 976;
const box = (x0, y0, x1, y1) => ({ xmin: x0, ymin: y0, xmax: x1, ymax: y1 });

prova("quattro per foglio, non nove", PER_FOGLIO === 4);

{ // ogni nome al tassello del suo CENTRO; vince il piu' forte
  const r = nomiPerTassello([
    { label: "a chair", score: 0.30, box: box(50, 50, 400, 400) },
    { label: "a bench", score: 0.40, box: box(60, 60, 380, 380) },
    { label: "a counter", score: 0.25, box: box(520, 40, 900, 420) },
    { label: "a railing", score: 0.33, box: box(40, 520, 460, 950) },
  ], T, W, H);
  prova("tassello 1 → il piu' forte (bench)", r[0] && r[0].label === "a bench");
  prova("tassello 2 → counter", r[1] && r[1].label === "a counter");
  prova("tassello 3 → railing", r[2] && r[2].label === "a railing");
  prova("tassello 4 → nessun nome", r[3] === null);
}
{ // scatole normalizzate 0..1: stessa risposta
  const r = nomiPerTassello([{ label: "a stool", score: 0.3, box: box(0.55, 0.55, 0.95, 0.95) }], T, W, H);
  prova("normalizzate: tassello 4", r[3] && r[3].label === "a stool" && !r[0]);
}
{ // troppo piccola (sotto il 5% del tassello): non conta
  const r = nomiPerTassello([{ label: "a bottle", score: 0.9, box: box(100, 100, 140, 140) }], T, W, H);
  prova("sotto il 5% non da' il nome", r[0] === null);
}
{ // il centro nella gronda o fuori dal foglio: non appartiene a nessuno
  const r = nomiPerTassello([{ label: "a desk", score: 0.5, box: box(300, 300, 690, 690) }], T, W, H);
  prova("a cavallo (centro nella gronda) si butta", r.every((x) => x === null));
}

{ // solo parole di COSE davanti a un oggetto; il vocabolario resta intero
  const cose = paroleDiCose(VOCABOLARIO);
  const termini = new Set(cose.map((v) => v.termine));
  for (const t of ["building", "sky", "floor", "wall", "ceiling", "earth", "house", "field", "runway"])
    prova("fuori: " + t, !termini.has(t));
  for (const t of ["swivel chair", "chair", "bench", "counter", "escalator", "airplane", "base", "person"])
    prova("dentro: " + t, termini.has(t));
  prova("i luoghi restano fuori", cose.every((v) => !v.luogo));
  prova("il vocabolario non si tocca", VOCABOLARIO.some((v) => v.termine === "sky"));
  prova("le parole tolte esistono tutte nel vocabolario",
    [...NON_SONO_COSE].every((t) => VOCABOLARIO.some((v) => v.termine === t)));
}

{ // fermate: tutte quelle che contano, non 6
  const tipo = (n, lato) => ({ copie: Array.from({ length: n }, () => ({})), misura: [lato, 1, lato], stacco: 0 });
  const tipi = Array.from({ length: 20 }, (_, i) => tipo(2 + i, 1));
  prova("tutte le fermate (20 su 20)", scegliFermate(tipi).length === 20);
  prova("ordine: superficie occupata", scegliFermate(tipi)[0].copie.length === 21);
}

{ // LA SECONDA EVIDENZA (28/09): le misure confermano o sospendono la
  // CONSEGUENZA, mai il riconoscimento
  const voce = (termine) => VOCABOLARIO.find((v) => v.termine === termine);
  const tipo = (x, y, z) => ({ misura: [x, y, z], copie: [{}, {}] });
  const e = (t, ti, geo) => verificaAffordance(voce(t), ti, geo).esito;
  // «seduto»/«sdraiato»: la quota di superficie verticale (28/09), non la scatola
  const q = (x) => ({ quotaVerticale: x });
  prova("sedie vere (51% verticale) → seduto non contraddetto", e("swivel chair", tipo(1.87, 0.67, 0.42), q(0.51)) === "non contraddetta");
  prova("due file profonde 1,48 m (scatola) → non piu' sospese", e("swivel chair", tipo(2.44, 1.03, 1.48), q(0.40)) === "non contraddetta");
  prova("sagoma piana (100% verticale) → sdraiato sospeso", e("cradle", tipo(0.6, 1.72, 0.33), q(1)) === "sospesa");
  prova("95% verticale → sospeso (soglia inclusa)", e("chair", tipo(0.6, 1, 0.6), q(0.95)) === "sospesa");
  prova("94% verticale → non contraddetto", e("chair", tipo(0.6, 1, 0.6), q(0.94)) === "non contraddetta");
  prova("senza superficie → non verificabile", e("chair", tipo(0.6, 1, 0.6), {}) === "non verificabile");
  prova("senza misure → non verificabile", verificaAffordance(voce("chair"), { copie: [] }).esito === "non verificabile");
  // la quota dai triangoli: un rettangolo verticale e uno orizzontale
  const vert = [[[0, 0, 0], [1, 0, 0], [1, 2, 0]], [[0, 0, 0], [1, 2, 0], [0, 2, 0]]];
  const oriz = [[[0, 0.4, 0], [1, 0.4, 0], [1, 0.4, 1]], [[0, 0.4, 0], [1, 0.4, 1], [0, 0.4, 1]]];
  prova("rettangolo verticale → quota 1", quotaVerticaleDaTriangoli(vert) === 1);
  prova("rettangolo orizzontale → quota 0", quotaVerticaleDaTriangoli(oriz) === 0);
  prova("meta' e meta' (2 m2 + 1 m2) → 2/3", Math.abs(quotaVerticaleDaTriangoli(vert.concat(oriz)) - 2 / 3) < 1e-9);
  prova("nessun triangolo → null", quotaVerticaleDaTriangoli([]) === null);
  prova("solo funzione (autobus: origine) → non verificabile", e("bus", tipo(10, 3, 2.5)) === "non verificabile");
  prova("nessuna conseguenza (monitor) → nessuna", e("monitor", tipo(0.6, 0.5, 0.2)) === "nessuna");
  prova("figure di persone → nessuna", e("person", tipo(0.5, 1.8, 0.4)) === "nessuna");
  prova("porta 0,9 x 2,1 x 0,1 → passa confermato", e("door", tipo(0.9, 2.1, 0.1)) === "confermata");
  prova("la verifica non tocca la voce", voce("cradle").postura === "sdraiato" && voce("cradle").nome === "culla" || voce("cradle").postura === "sdraiato");
  // il ragionamento dice che lo riconosce, e che la conseguenza non passa
  const sosp = { ...voce("cradle"), postura: null, funzione: null,
    affordance: verificaAffordance(voce("cradle"), tipo(0.6, 1.72, 0.33), q(1)) };
  const frase = ragionamento(sosp, 4);
  prova("frase: riconosciuto, nessuna conseguenza", /riconosco/.test(frase) && /nessuna conseguenza/.test(frase) && !/sdraia\./.test(frase));
}

console.log((ko ? "✖ " : "✔ ") + ok + "/" + (ok + ko) + " prove");
process.exit(ko ? 1 : 0);
