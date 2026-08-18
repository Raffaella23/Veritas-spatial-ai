// Il cammino, collegato davvero:  node banco/cammino.mjs
//
// Le 30 prove di veritas_navmesh.test.mjs dicono che il MODULO e' giusto.
// Questa dice se il PROGRAMMA lo usa. Sono due domande diverse, e la seconda
// e' quella che in questo progetto e' gia' costata una giornata: un modulo
// giusto collegato male non da' nessun errore in console (§15.5).
//
// La misura decisiva e' l'ultima: **che frazione delle posizioni degli agenti
// cade su una superficie calpestabile**. Prima gli agenti uscivano dall'aereo
// camminando sull'ala; se succede ancora, questa prova lo vede.
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
p.on("pageerror", (e) => log.push("PAGEERROR " + e.message));
await p.goto("http://127.0.0.1:8899/index.html", { waitUntil: "load", timeout: 60000 });
await p.waitForTimeout(6000);
await p.fill("#v-new-name", "cammino");
await p.click("#v-create-btn");
await p.waitForTimeout(6000);
await p.click("#vs-start-btn").catch(() => {});
await p.waitForTimeout(8000);
await p.setInputFiles("#vaio-upload-input", path.join(qui, "airport_foot_traffic.glb"));
await p.waitForTimeout(50000);

const r = await p.evaluate(() => {
  const nm = window.__veritasNavmesh;
  const out = { modulo: !!nm, esito: window.__veritasNavmeshEsito || null };
  if (!nm || !nm.stato()) return out;
  const s = nm.stato();
  out.navmesh = {
    poligoni: s.poligoni,
    area: +s.area.toFixed(0),
    ms: s.ms,
    cella: +s.parametri.risoluzione.cella.toFixed(2),
    grossolana: s.parametri.risoluzione.grossolana,
    triangoli: s.geometria ? s.geometria.triangoli : null,
    ingombro: s.geometria ? s.geometria.ingombro.min.map((v, i) =>
      +(s.geometria.ingombro.max[i] - v).toFixed(1)) : null,
  };
  out.isole = (s.isole || []).slice(0, 6).map((i) => ({
    area: +i.area.toFixed(0), quota: +i.quotaMedia.toFixed(1),
  }));
  out.quote = s.quote.slice(0, 6).map((q) => ({ quota: q.quota, area: +q.area.toFixed(0) }));

  // Le posizioni degli agenti, frame per frame: stanno su terreno calpestabile?
  const traj = window.__veritasTrajectory || (window.__veritasGetTrajectory
    ? window.__veritasGetTrajectory() : null);
  const frames = traj && traj.frames ? traj.frames : [];
  let dentro = 0, fuori = 0, campioni = 0;
  const fuoriEsempi = [];
  const passo = Math.max(1, Math.floor(frames.length / 40));
  for (let f = 0; f < frames.length; f += passo) {
    for (const ag of (frames[f].agents || [])) {
      if (!ag.pos) continue;
      campioni++;
      const q = nm.sulCamminoCorrente(ag.pos, [0.6, 1.2, 0.6]);
      if (q.ok) dentro++;
      else { fuori++; if (fuoriEsempi.length < 5) fuoriEsempi.push(ag.pos.map((v) => +v.toFixed(1))); }
    }
  }
  out.agenti = { campioni, dentro, fuori, fuoriEsempi, frames: frames.length };
  out.forzati = window.__veritasTrattiForzati || 0;
  out.irraggiungibili = window.__veritasIrraggiungibili || 0;

  // Un percorso fra le due tappe piu' lontane, per vedere che passi davvero.
  const nodi = window.__veritasGetNodes ? window.__veritasGetNodes() : [];
  if (nodi.length >= 2) {
    let a = 0, z = 1, d = -1;
    for (let i = 0; i < nodi.length; i++) for (let j = i + 1; j < nodi.length; j++) {
      const q = Math.hypot(nodi[i].pos[0] - nodi[j].pos[0], nodi[i].pos[2] - nodi[j].pos[2]);
      if (q > d) { d = q; a = i; z = j; }
    }
    const pr = nm.percorsoCorrente(nodi[a].pos, nodi[z].pos, { aderente: true, passo: 0.8 });
    out.percorso = pr
      ? { da: nodi[a].label, a: nodi[z].label, punti: pr.punti.length,
          lunghezza: +pr.lunghezza.toFixed(1), aria: +d.toFixed(1), parziale: pr.parziale }
      : { da: nodi[a].label, a: nodi[z].label, punti: 0, nessunPercorso: true };
  }
  out.nodi = nodi.map((n) => ({ nome: n.label, tipo: n.type, origine: n.origine }));
  return out;
});

const ok = (t, c, d = "") => console.log((c ? "  ok  " : " FAIL ") + t + (d ? "   " + d : ""));

console.log("\n=== IL PROGRAMMA USA LA NAVMESH? ===");
ok("il modulo e' caricato", r.modulo);
ok("la navmesh e' stata costruita al caricamento del modello", !!r.navmesh,
   r.navmesh ? "" : JSON.stringify(r.esito));
if (r.navmesh) {
  const n = r.navmesh;
  console.log(`      ${n.poligoni} poligoni, ${n.area} m2, ${n.ms} ms, cella ${n.cella} m`
    + (n.grossolana ? " (grossolana)" : ""));
  console.log(`      ingombro del modello ${JSON.stringify(n.ingombro)} m, ${n.triangoli} triangoli`);
  // ⚠️ Se la navmesh fosse costruita PRIMA della scala automatica, il modello
  //    sarebbe 6 volte piu' piccolo e l'ingombro lo direbbe subito.
  ok("costruita sul modello a scala vera (piu di 50 m di lato)",
     n.ingombro && Math.max(n.ingombro[0], n.ingombro[2]) > 50,
     n.ingombro ? Math.max(n.ingombro[0], n.ingombro[2]).toFixed(0) + " m" : "");
  ok("la risoluzione risolve una porta", !n.grossolana, "cella " + n.cella + " m");

  console.log("\n   le parti separate (isole):");
  for (const i of r.isole) console.log(`      ${String(i.area).padStart(6)} m2   a quota ${i.quota} m`);
  console.log("   l'area per quota:");
  for (const q of r.quote) console.log(`      ${String(q.area).padStart(6)} m2   a quota ${q.quota} m`);
}

console.log("\n=== GLI AGENTI CAMMINANO DOVE SI CAMMINA? ===");
if (r.agenti && r.agenti.campioni) {
  const a = r.agenti;
  const pct = 100 * a.dentro / a.campioni;
  console.log(`      ${a.campioni} posizioni campionate su ${a.frames} fotogrammi`);
  ok("almeno il 95% delle posizioni sta su terreno calpestabile", pct >= 95,
     pct.toFixed(1) + "% dentro, " + a.fuori + " fuori");
  if (a.fuoriEsempi.length) console.log("      esempi fuori: " + JSON.stringify(a.fuoriEsempi));
} else {
  console.log("      nessuna traiettoria da misurare (il motore non ha prodotto frame)");
}
console.log(`      tratti in linea retta forzati: ${r.forzati} | destinazioni irraggiungibili: ${r.irraggiungibili}`);

if (r.percorso) {
  const q = r.percorso;
  console.log("\n=== UN PERCORSO VERO ===");
  console.log(`      da "${q.da}" a "${q.a}"`);
  ok("il percorso esiste", !q.nessunPercorso && !q.parziale,
     q.nessunPercorso ? "NESSUNO" : q.punti + " punti, " + q.lunghezza + " m (in linea d'aria " + q.aria + " m)");
}

if (r.nodi) {
  console.log("\n=== LE TAPPE, E DA DOVE VIENE IL LORO NOME ===");
  for (const n of r.nodi)
    console.log(`      ${String(n.nome).padEnd(24)} ${String(n.tipo).padEnd(10)} ${n.origine || "?"}`);
}

console.log("\n=== RIGHE DI CONSOLE PERTINENTI ===");
log.filter((l) => /cammino|navmesh|occhi|navcat|PAGEERROR/i.test(l)).slice(-14)
   .forEach((l) => console.log("      " + l.slice(0, 175)));

await b.close();
