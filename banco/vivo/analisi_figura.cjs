// LA FIGURA SEGUE LA TRACCIA? (29/09): legge figura.json di misura_figura.mjs.
//   node banco/vivo/analisi_figura.cjs [figura.json]
const D = require(require("node:path").resolve(process.argv[2] || "banco/vivo/misura_figura/figura.json"));
const per = new Map();
for (const f of D.traccia) for (const [id, x, z, s] of f.a) { if (!per.has(id)) per.set(id, new Map()); per.get(id).set(f.t, [x, z, s]); }
const tempi = D.traccia.map((f) => f.t);
// 1. per ogni figura, l'istante della traccia che le corrisponde meglio (su tutta la traccia)
function stima(id, x, z) {
  const tr = per.get(id); if (!tr) return null; let best = null;
  for (let k = 0; k + 1 < tempi.length; k++) {
    const a = tr.get(tempi[k]), b = tr.get(tempi[k + 1]); if (!a || !b) continue;
    const sx = b[0] - a[0], sz = b[1] - a[1], l2 = sx * sx + sz * sz;
    let u = l2 > 1e-9 ? ((x - a[0]) * sx + (z - a[1]) * sz) / l2 : 0; u = Math.max(0, Math.min(1, u));
    const d = Math.hypot(x - (a[0] + sx * u), z - (a[1] + sz * u));
    if (!best || d < best.d) best = { d, t: tempi[k] + 0.5 * u, lungo: Math.sqrt(l2), stato: a[2] };
  }
  return best;
}
const attesa = (id, T) => { const tr = per.get(id); const k = Math.floor(T / 0.5), u = (T % 0.5) / 0.5;
  const a = tr && tr.get(tempi[k]), b = tr && (tr.get(tempi[k + 1]) || a); if (!a) return null;
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2]]; };
const med = (a) => { a = a.slice().sort((x, y) => x - y); return a[a.length >> 1]; };
const righe = [], scartiAttesa = [], spread = [];
for (const c of D.campioni) {
  const st = c.fig.map(([id, x, z]) => ({ id, x, z, s: stima(id, x, z) })).filter((e) => e.s);
  const mobili = st.filter((e) => e.s.lungo > 0.1 && e.s.d < 0.05);
  const T = med(mobili.map((e) => e.s.t));
  for (const e of mobili) spread.push(Math.abs(e.s.t - T));
  for (const e of st) { const p = attesa(e.id, T); if (p) scartiAttesa.push({ d: Math.hypot(p[0] - e.x, p[1] - e.z), stato: p[2], id: e.id, T }); }
  righe.push({ ms: c.ms, T, barra: c.barra && c.barra[0], mobili: mobili.length, figure: st.length,
    fuoriTraccia: st.filter((e) => e.s.d > 0.05).length });
}
console.log("velocita' scritta nella barra:", D.velocitaScritta);
console.log("campione | ms | istante stimato T | barra | figure (mobili) | fuori traccia >5 cm");
for (const r of righe) console.log(Math.round(r.ms), r.T && r.T.toFixed(3), r.barra, r.figure + " (" + r.mobili + ")", r.fuoriTraccia);
const v = []; for (let k = 1; k < righe.length; k++) { const dT = righe[k].T - righe[k - 1].T, dms = (righe[k].ms - righe[k - 1].ms) / 1000; v.push(dT / dms); }
console.log("velocita' effettiva (s di simulazione per s reale): mediana", med(v).toFixed(2), "min", Math.min(...v).toFixed(2), "max", Math.max(...v).toFixed(2));
console.log("accordo fra figure sullo stesso istante: scarto mediano", med(spread).toFixed(3), "s, massimo", Math.max(...spread).toFixed(3), "s");
const sd = scartiAttesa.map((e) => e.d);
console.log("distanza figura <-> posizione attesa all'istante T: mediana", med(sd).toFixed(3), "m; oltre 10 cm:", sd.filter((d) => d > 0.1).length, "su", sd.length);
const grandi = scartiAttesa.filter((e) => e.d > 0.1).slice(0, 6); console.log("esempi oltre 10 cm:", JSON.stringify(grandi));
