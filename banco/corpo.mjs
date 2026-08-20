// IL CORPO, collegato davvero:  node banco/corpo.mjs
//
// `veritas_corpo.test.mjs` dice che il MODULO e' giusto, su scene inventate.
// `veritas_corpo_collegato.test.mjs` dice che il programma lo CHIAMA, su stub.
// Questa risponde alla terza domanda, che e' quella che vale: su un modello
// vero, dentro un browser vero, **gli agenti finiscono dentro un solido?**
//
// E' il collaudo dichiarato nel piano di lavoro: «zero posizioni dentro un
// solido, su modelli diversi». Non si giudica a occhio da uno screenshot — si
// interroga il motore fisico stesso, capsula per capsula, con la stessa query
// che userebbe il gioco.
//
// Serve il banco montato e servito:
//     sh banco/monta.sh && (cd banco && python3 -m http.server 8899 &)

import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const modello = process.argv[2] || "airport_foot_traffic.glb";

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
await p.fill("#v-new-name", "corpo");
await p.click("#v-create-btn");
await p.waitForTimeout(6000);
await p.click("#vs-start-btn").catch(() => {});
await p.waitForTimeout(8000);
await p.setInputFiles("#vaio-upload-input", path.join(qui, modello));
await p.waitForTimeout(55000);
// Il PLAY: prima di questo niente si muove, ed e' voluto.
await p.click("#veritas-play-ready-btn").catch(() => {});
await p.waitForTimeout(25000);

const r = await p.evaluate(() => {
  const C = window.__veritasCorpo;
  const out = {
    modulo: !!C,
    mondo: window.__veritasCorpoEsito || null,
    esito: (C && C.ultimoEsito) ? C.ultimoEsito() : null,
    racconto: (C && C.racconta) ? C.racconta() : null,
  };
  const scena = (C && C.stato) ? C.stato() : null;
  if (!scena) return out;

  // La misura decisiva: si prende OGNI posizione di OGNI agente in OGNI
  // fotogramma della traiettoria in uso, ci si mette una capsula, e si chiede
  // al motore fisico se tocca l'edificio. Non e' una stima: e' la stessa
  // domanda che il controller si fa per muovere il corpo.
  const traj = window.__veritasGetTrajectory ? window.__veritasGetTrajectory() : null;
  const frames = (traj && traj.frames) || [];
  if (!frames.length) { out.perche = "nessun fotogramma in scena"; return out; }

  const m = scena.misure;
  let campioni = 0, dentro = 0, sottoterra = 0, errori = 0, primoErrore = null;
  const esempi = [];
  const passo = Math.max(1, Math.floor(frames.length / 60));   // ~60 istanti
  const yMin = scena.ingombro ? scena.ingombro.min[1] : -1e9;
  for (let f = 0; f < frames.length; f += passo) {
    for (const a of frames[f].agents || []) {
      const q = a && a.pos;
      if (!q || q.length < 3) continue;
      campioni++;
      const corpo = {
        pos: { x: q[0], y: q[1] + m.altezza / 2, z: q[2] },
        mezza: m.altezza / 2 - m.raggio,
      };
      try {
        if (C.dentroUnSolido(scena, corpo)) {
          dentro++;
          if (esempi.length < 5) esempi.push({ t: frames[f].t, id: a.id, pos: q.map((v) => +v.toFixed(2)) });
        }
      } catch (e) {
        // Un'interrogazione che esplode non deve far morire il collaudo: si
        // conta e si riferisce, altrimenti non si sa nemmeno da dove ripartire.
        errori++;
        if (!primoErrore) primoErrore = String((e && e.message) || e).slice(0, 200);
      }
      if (q[1] < yMin - 1) sottoterra++;
    }
  }
  out.misura = { campioni, dentro, sottoterra, esempi, errori, primoErrore, fotogrammi: frames.length };

  // Le quote: quante diverse? Un modello a piu' piani deve produrre agenti a
  // piu' quote, altrimenti nessuno ha usato le scale.
  const quote = new Set();
  for (let f = 0; f < frames.length; f += passo)
    for (const a of frames[f].agents || []) if (a && a.pos) quote.add(Math.round(a.pos[1] * 4) / 4);
  out.quote = [...quote].sort((x, y) => x - y);
  return out;
});

let ko = 0;
const ok = (n, v, d = "") => { console.log((v ? "  ok  " : " FAIL ") + n + (d ? "   " + d : "")); if (!v) ko++; };

console.log("\n==============================================================");
console.log("  IL CORPO: gli agenti finiscono dentro un solido?");
console.log("  modello: " + modello);
console.log("==============================================================\n");

ok("il modulo del corpo e in pagina", r.modulo);
if (r.mondo) {
  ok("il mondo fisico e stato costruito", r.mondo.ok, r.mondo.perche || "");
  if (r.mondo.ok) {
    console.log(`      collisore: ${r.mondo.triangoli.toLocaleString("it-IT")} triangoli in ${r.mondo.ms} ms`);
    console.log(`      capsula:   raggio ${r.mondo.misure.raggio} m, altezza ${r.mondo.misure.altezza} m, `
      + `scalino ${r.mondo.misure.gradino} m, pendenza max ${r.mondo.misure.pendenzaMax}°`);
  }
} else {
  ok("il mondo fisico e stato costruito", false, "nessun esito: il modello non e stato caricato?");
}

if (r.esito) {
  ok("il filtro fisico e stato applicato alla traiettoria", r.esito.ok, r.esito.perche || "");
  if (r.esito.ok) {
    console.log(`      ${r.esito.corpi} corpi, ${r.esito.mosse.toLocaleString("it-IT")} passi, ${r.esito.ms} ms`);
    console.log(`      scostamento dal piano: ${r.esito.scostamentoMediano} m mediano, `
      + `${r.esito.scostamentoMassimo} m massimo`);
    if (r.esito.caduti) console.log(`      ⚠️ ${r.esito.caduti} volte il piano mandava un agente dove sotto non c'e pavimento`);
    ok("costa meno del tetto dichiarato (15 s)", r.esito.ms < 15000, r.esito.ms + " ms");
  }
} else {
  ok("il filtro fisico e stato applicato alla traiettoria", false, r.perche || "nessun esito");
}

if (r.misura) {
  const { campioni, dentro, sottoterra, esempi, fotogrammi } = r.misura;
  console.log(`\n      ${campioni.toLocaleString("it-IT")} posizioni campionate su ${fotogrammi} fotogrammi`);
  ok("ZERO posizioni dentro un solido", dentro === 0,
    dentro + " su " + campioni + (campioni ? ` (${(100 * dentro / campioni).toFixed(2)}%)` : ""));
  if (esempi.length) console.log("      esempi dentro: " + JSON.stringify(esempi));
  ok("nessuna interrogazione fallita", r.misura.errori === 0,
    r.misura.errori + (r.misura.primoErrore ? " — " + r.misura.primoErrore : ""));
  ok("nessun agente sprofondato sotto il modello", sottoterra === 0, sottoterra + " su " + campioni);
}
if (r.quote) console.log(`      quote occupate dagli agenti: [${r.quote.join(", ")}]`);
if (r.racconto) console.log(`\n      in chat direbbe:\n      "${r.racconto}"`);

console.log("\n=== RIGHE DI CONSOLE PERTINENTI ===");
log.filter((l) => /corpo|rapier|PAGEERROR/i.test(l)).slice(-14).forEach((l) => console.log("      " + l.slice(0, 175)));

console.log(ko ? `\n${ko} PROVE FALLITE\n` : "\ntutte le prove passano\n");
await b.close();
process.exit(ko ? 1 : 0);
