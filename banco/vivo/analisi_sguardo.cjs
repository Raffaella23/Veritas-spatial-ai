// LO SGUARDO NEL TEMPO DELLA SIMULAZIONE (29/09): legge sguardo.json di misura_sguardo.mjs.
//   node banco/vivo/analisi_sguardo.cjs [sguardo.json]
const D = require(require("node:path").resolve(process.argv[2] || "banco/vivo/misura_sguardo/sguardo.json"));
const per = new Map(); const tempi = D.traccia.map((f) => f.t);
for (const f of D.traccia) for (const [id, x, z, s, sed] of f.a) { if (!per.has(id)) per.set(id, new Map()); per.get(id).set(f.t, [x, z, s, sed]); }
function stima(id, x, z) { const tr = per.get(id); if (!tr) return null; let best = null;
  for (let k = 0; k + 1 < tempi.length; k++) { const a = tr.get(tempi[k]), b = tr.get(tempi[k + 1]); if (!a || !b) continue;
    const sx = b[0] - a[0], sz = b[1] - a[1], l2 = sx * sx + sz * sz;
    let u = l2 > 1e-9 ? ((x - a[0]) * sx + (z - a[1]) * sz) / l2 : 0; u = Math.max(0, Math.min(1, u));
    const d = Math.hypot(x - (a[0] + sx * u), z - (a[1] + sz * u)); if (!best || d < best.d) best = { d, t: tempi[k] + 0.5 * u, lungo: Math.sqrt(l2) }; }
  return best; }
const at = (id, T) => { const tr = per.get(id); const k = Math.floor(T / 0.5 + 1e-9), u = T / 0.5 - k;
  const a = tr && tr.get(tempi[k]); if (!a) return null; const b = tr.get(tempi[k + 1]) || a;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, u < 0.5 ? a[2] : b[2], u < 0.5 ? a[3] : b[3]]; };
const med = (a) => { a = a.slice().sort((x, y) => x - y); return a[a.length >> 1]; };
const ang = (ax, az, bx, bz) => { const n = Math.hypot(ax, az) * Math.hypot(bx, bz); return n < 1e-9 ? 180 : Math.acos(Math.max(-1, Math.min(1, (ax * bx + az * bz) / n))) * 180 / Math.PI; };
console.log("traiettoria: versione", D.versione0, "->", D.versione1, "| stesso oggetto", D.stessoOggetto);
let inMoto = 0, entro = 0, corpoOk = 0, corpoTot = 0, fuoriTraccia = 0; const angoli = [], male = [], Ts = [];
for (const c of D.campioni) {
  const st = c.righe.map((r) => ({ r, s: stima(r[0], r[1], r[2]) })).filter((e) => e.s);
  const T = med(st.filter((e) => e.s.lungo > 0.1 && e.s.d < 0.05).map((e) => e.s.t)); Ts.push(T);
  for (const { r } of st) { const [id, x, z, dir, clip] = r; const p0 = at(id, T), p1 = at(id, T + 1.0); if (!p0) continue;
    if (Math.hypot(p0[0] - x, p0[1] - z) > 0.1) { fuoriTraccia++; continue; }
    corpoTot++; const atteso = p0[2] === "MOVING" ? "Walk_Loop" : (p0[2] === "WAITING" && p0[3]) ? "Sitting_Idle_Loop" : "Idle_Loop";
    if (clip === atteso || clip === "Sitting_Idle_Loop") corpoOk++;
    if (!p1 || p0[2] !== "MOVING") continue; const dx = p1[0] - p0[0], dz = p1[1] - p0[1]; if (Math.hypot(dx, dz) < 0.3) continue;
    inMoto++; const a = ang(dir[0], dir[2], dx, dz); angoli.push(a); if (a <= 20) entro++;
    else male.push({ id, T: +T.toFixed(2), ang: Math.round(a), lunghezzaOcchi: +Math.hypot(dir[0], dir[2]).toFixed(2) }); } }
const dT = []; for (let k = 1; k < Ts.length; k++) dT.push(((Ts[k] - Ts[k - 1]) / ((D.campioni[k].ms - D.campioni[k - 1].ms) / 1000)).toFixed(2));
console.log("istanti T:", Ts.map((t) => t.toFixed(2)).join(" "), "| velocita' fra campioni:", dT.join(" "));
console.log("figure fuori dalla traccia (>10 cm, escluse):", fuoriTraccia);
console.log("IN CAMMINO:", inMoto, "| occhi entro 20°:", entro, "=", Math.round(100 * entro / inMoto) + "% | mediana", Math.round(med(angoli)) + "°");
console.log("corpo giusto:", corpoOk + "/" + corpoTot);
const corti = male.filter((m) => m.lunghezzaOcchi < 0.1).length;
console.log("fuori 20°:", male.length, "di cui con tratto degli occhi sotto 10 cm:", corti, "| esempi", JSON.stringify(male.slice(0, 8)));
