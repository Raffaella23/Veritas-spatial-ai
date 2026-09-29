// IL RIENTRO SUL CALPESTABILE (29/09): legge rientro.json di misura_rientro.mjs, accosta ogni punto
// della traiettoria finale al suo punto PRIMA del rientro, e conta inversioni e punti sulle linee
// fisse prima e dopo.   node banco/vivo/analisi_rientro.cjs [rientro.json]
const D = require(require("node:path").resolve(process.argv[2] || "banco/vivo/misura_rientro/rientro.json"));
const C = D.chiamate, F = [];
for (const f of D.finale) for (const [id, x, z, s] of f.a) F.push({ t: f.t, id, x, z, s });
const d2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
function allinea(s0) {
  let c = s0, ok = 0; const out = [];
  for (const e of F) {
    const k = C[c];
    if (k) {
      const dopo = k[2] ? [k[3], k[4]] : [k[0], k[1]];
      const m = d2(dopo[0], dopo[1], e.x, e.z) < 0.02 || d2(k[0], k[1], e.x, e.z) < 0.02
             || (e.s === "ARRIVED" && d2(dopo[0], dopo[1], e.x, e.z) < 0.6);
      if (m) { out.push({ ...e, px: k[0], pz: k[1], applicato: d2(k[0], k[1], e.x, e.z) >= 0.02 }); c++; ok++; continue; }
    }
    out.push({ ...e, px: e.x, pz: e.z, senza: true });
  }
  return { ok, out };
}
let migliore = null;
const primo = F[0];
for (let s = C.length - 1; s >= 0; s--) {
  const k = C[s], dopo = k[2] ? [k[3], k[4]] : [k[0], k[1]];
  if (d2(dopo[0], dopo[1], primo.x, primo.z) > 0.02 && d2(k[0], k[1], primo.x, primo.z) > 0.02) continue;
  const r = allinea(s); if (!migliore || r.ok > migliore.ok) migliore = { ...r, s };
  if (r.ok > F.length * 0.95) break;
}
console.log("chiamate", C.length, "punti finali", F.length, "accostati", migliore.ok, "da", migliore.s);
const per = new Map(); for (const e of migliore.out) { if (!per.has(e.id)) per.set(e.id, []); per.get(e.id).push(e); }
const LINEE = [["x=-7,78", (x, z) => Math.abs(x + 7.78) < 0.015], ["z=11,52", (x, z) => Math.abs(z - 11.52) < 0.015],
               ["z=9,57", (x, z) => Math.abs(z - 9.57) < 0.015], ["z=13,32", (x, z) => Math.abs(z - 13.32) < 0.015]];
function studia(X, Z) {
  let inv = 0, passi = 0; const linee = {}; const invPunti = [];
  per.forEach((arr) => { for (let k = 1; k + 1 < arr.length; k++) { const A = arr[k - 1], B = arr[k], Cc = arr[k + 1];
    if (A.s !== "MOVING" || B.s !== "MOVING" || Cc.s !== "MOVING") continue;
    const u = [B[X] - A[X], B[Z] - A[Z]], v = [Cc[X] - B[X], Cc[Z] - B[Z]], lu = Math.hypot(...u), lv = Math.hypot(...v); passi++;
    if (lu > 0.3 && lv > 0.3 && (u[0] * v[0] + u[1] * v[1]) / (lu * lv) < -0.5) { inv++; invPunti.push(B); } }
    for (const e of arr) for (const [n, f] of LINEE) if (f(e[X], e[Z])) linee[n] = (linee[n] || 0) + 1; });
  return { passi, inv, linee, invPunti };
}
const prima = studia("px", "pz"), dopo = studia("x", "z");
const sp = migliore.out.filter((e) => e.applicato).map((e) => d2(e.px, e.pz, e.x, e.z)).sort((a, b) => a - b);
const inFin = dopo.invPunti; const conRientro = inFin.filter((B) => B.applicato && d2(B.px, B.pz, B.x, B.z) > 0.1).length;
console.log("PRIMA del rientro:", JSON.stringify({ passi: prima.passi, inversioni: prima.inv, linee: prima.linee }));
console.log("DOPO il rientro:  ", JSON.stringify({ passi: dopo.passi, inversioni: dopo.inv, linee: dopo.linee }));
console.log("punti spostati dal rientro:", sp.length, "su", migliore.out.length, "| spostamento mediano", sp.length ? sp[sp.length >> 1].toFixed(2) : "-", "m, p90", sp.length ? sp[Math.floor(sp.length * 0.9)].toFixed(2) : "-", "m");
console.log("inversioni finali con il punto di mezzo spostato dal rientro (>10 cm):", conRientro, "su", inFin.length);
const es = inFin.slice(0, 5).map((B) => ({ id: B.id, t: B.t, prima: [B.px, B.pz], dopo: [B.x, B.z] }));
console.log("esempi:", JSON.stringify(es));
