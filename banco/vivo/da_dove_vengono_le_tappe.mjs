// DA DOVE VENGONO LE TAPPE: la filiera, non il risultato.
//
// `dove_stanno_le_tappe.mjs` misura DOVE finiscono le sette tappe. Questo
// misura PERCHE' finiscono li': apre uno per uno i quattro setacci che stanno
// fra i posti misurati nel modello e le tappe posate, e conta quanti posti
// muoiono a ogni setaccio e DOVE stavano quando sono morti.
//
//   1. `posti()`            — i mucchi di arredi trovati nel modello
//   2. `posiAppoggiabili()` — tolte le figure umane e gli oggetti appesi
//   3. sul calpestabile     — `sulCamminoCorrente(centro, [6,6,6])`
//   4. gruppi a piedi       — `percorsoCorrente`, e si tiene UN gruppo solo
//
// Serve al §6.14: sette tappe in una striscia di 24 m di un edificio di 106.
// Il setaccio che le stringe li' e' uno di questi quattro, e finche' non si sa
// quale non si tocca niente.
//
//   DAL_WORKSPACE=1 node banco/vivo/da_dove_vengono_le_tappe.mjs
//
// LIMITI ESPLICITI: 3 minuti per modello e zone, 4 per i gruppi a piedi (che
// sono O(n^2) percorsi veri). Oltre il tetto si stampa quello che si e'
// misurato fin li' e si esce: mai un'attesa indefinita.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.join(qui, "..", "..");
const DAL_WS = process.env.DAL_WORKSPACE === "1";
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
const t0 = Date.now();
const secondi = () => ((Date.now() - t0) / 1000).toFixed(0) + "s";
const FUORI = path.join(qui, "filiera_tappe.txt");
fs.writeFileSync(FUORI, "");
const scrivi = (r) => { console.log(r); fs.appendFileSync(FUORI, r + "\n"); };

const ctx = await chromium.launchPersistentContext(
  path.join(qui, process.env.PROFILO || (DAL_WS ? "profilo_ws" : "profilo_pub")), {
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true, viewport: { width: 1600, height: 900 },
    args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
await ctx.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js", (r) =>
  r.fulfill({ status: 200, path: path.join(WS, "banco", "finti", "supabase_finto.js"),
              headers: { "content-type": "text/javascript" } }));
const TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
               ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css",
               ".glb": "model/gltf-binary", ".png": "image/png", ".svg": "image/svg+xml" };
if (DAL_WS) {
  await ctx.route((url) => url.href.startsWith(BASE), (r) => {
    const u = new URL(r.request().url());
    const rel = decodeURIComponent(u.pathname.slice("/Veritas-spatial-ai/".length)) || "index.html";
    const f = path.join(WS, rel);
    if (f.startsWith(WS) && fs.existsSync(f) && fs.statSync(f).isFile())
      return r.fulfill({ status: 200, path: f, headers: {
        "content-type": TIPI[path.extname(f)] || "application/octet-stream",
        "cache-control": "no-store" } });
    return r.continue();
  });
}

const p = ctx.pages()[0] || await ctx.newPage();
p.on("pageerror", (e) => scrivi(secondi() + " PAGEERROR " + e.message));

await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 90000 });
scrivi(secondi() + " costruzione: " + await p.evaluate(() => window.__EIDETICA_COSTRUZIONE));
await p.waitForSelector("#v-pick-file", { timeout: 60000 }).catch(() => {});
const [scelta] = await Promise.all([
  p.waitForEvent("filechooser", { timeout: 30000 }),
  p.click("#v-pick-file"),
]).catch(() => [null]);
if (scelta) await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "filiera delle tappe").catch(() => {});
await p.evaluate(() => {
  const b = [...document.querySelectorAll("button,label,div,span")]
    .find((x) => x.offsetParent !== null && /^(Airport|Aeroporto)$/.test((x.textContent || "").trim()));
  if (b) b.click();
});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 })
  .then(() => p.click("#vs-start-btn")).catch(() => {});

const pronto = await p.waitForFunction(
  () => !!window.__veritasModelRoot
     && !!(window.__veritasGetNodes && (window.__veritasGetNodes() || []).length)
     && !!(window.__veritasNavmesh && window.__veritasNavmesh.stato && window.__veritasNavmesh.stato())
     && !!(window.__veritasCoseTrovate && window.__veritasCoseTrovate.posti),
  null, { timeout: 3 * 60 * 1000 }).then(() => true).catch(() => false);
if (!pronto) { scrivi(secondi() + " \u2716 mappa di cammino, zone o cose non pronte entro il tetto");
               await ctx.close(); process.exit(1); }
await p.waitForTimeout(20000);

// --- setacci 1, 2 e 3: si misurano in un colpo solo, sono veloci ----------
const a = await p.evaluate(() => {
  const CO = window.__veritasCose, CP = window.__veritasControprova;
  const nm = window.__veritasNavmesh, T = window.THREE, R = window.__veritasModelRoot;
  const tutti = (window.__veritasCoseTrovate && window.__veritasCoseTrovate.posti) || [];
  const b = R && T ? new T.Box3().setFromObject(R) : null;
  const scatola = b ? { min: b.min.toArray(), max: b.max.toArray() } : null;

  const appoggiabili = CO.posiAppoggiabili(tutti, { eFigura: CP ? CP.eUnaFigura : undefined });
  const conCammino = appoggiabili.map((q) => {
    let r = null;
    try { r = nm.sulCamminoCorrente(q.centro, [6, 6, 6]); } catch (e) {}
    return { centro: q.centro, oggetti: q.oggetti, area: q.area,
             forma: q.formaPrevalente, figureTolte: q.figureTolte,
             appoggio: r && r.ok ? r.punto : null };
  });
  const riga = (q) => ({ x: +q.centro[0].toFixed(1), z: +q.centro[2].toFixed(1),
                         oggetti: q.oggetti, area: Math.round(q.area), forma: q.formaPrevalente || q.forma });
  return {
    scatola,
    tutti: tutti.map(riga),
    appoggiabili: appoggiabili.map(riga),
    sulCammino: conCammino.filter((q) => q.appoggio).map((q) => ({
      ...riga(q), ax: +q.appoggio[0].toFixed(1), az: +q.appoggio[2].toFixed(1) })),
    fuoriDalCammino: conCammino.filter((q) => !q.appoggio).map(riga),
  };
}).catch((e) => ({ errore: String((e && e.message) || e) }));

if (a.errore) { scrivi(secondi() + " \u2716 " + a.errore); await ctx.close(); process.exit(1); }

// --- setaccio 0: com'e' fatta la mappa di cammino sotto ai posti ----------
// Se i posti si spezzano in gruppi, la ragione sta qui: piani non uniti da una
// rampa dichiarata, piastre di pavimento con una fessura troppo larga, o muri
// veri. Sono tre difetti diversi e si curano in tre modi diversi: non si
// confondono.
const m = await p.evaluate(() => {
  const s = window.__veritasNavmesh && window.__veritasNavmesh.stato();
  if (!s) return { errore: "nessuna mappa di cammino" };
  const c = s.collegamenti || {}, k = s.cuciture || {};
  // Quanta della geometria del modello e' davvero entrata nella mappa: il
  // tetto dei triangoli e quello delle istanze scartano in silenzio.
  let geo = null;
  try { const g2 = window.__veritasNavmesh.geometriaDaModello(window.THREE, window.__veritasModelRoot);
        geo = { triangoli: g2.triangoli, mesh: g2.mesh, saltate: g2.saltate }; } catch (e) {}
  const conta = (el) => {
    const q = {};
    for (const x of el || []) { const r = x.perche || "(senza motivo)"; q[r] = (q[r] || 0) + 1; }
    return Object.keys(q).sort((u, v) => q[v] - q[u]).map((r) => q[r] + "× " + r);
  };
  return {
    isole: (s.isole || []).map((i) => ({ area: Math.round(i.area), quota: +(+i.quotaMedia).toFixed(2) }))
      .sort((u, v) => v.area - u.area).slice(0, 12),
    quanteIsole: (s.isole || []).length,
    livelli: (s.livelli || []).map((l) => ({ quota: +l.quota.toFixed(2), area: Math.round(l.area), isole: l.isole })),
    rampeAggiunte: (c.aggiunti || []).length,
    rampeScartate: conta(c.scartati),
    rampePerche: c.perche || null,
    cuciAggiunte: (k.aggiunti || []).map((x) => ({ luce: x.luce, fra: x.fra })).slice(0, 10),
    quanteCuciture: (k.aggiunti || []).length,
    cuciScartate: conta(k.scartati),
    cuciPerche: k.perche || null,
    isoleGuardate: k.isoleGuardate != null ? k.isoleGuardate : null,
    geo, cella: s.parametri && s.parametri.risoluzione ? s.parametri.risoluzione.cella : null,
    poligoni: s.poligoni, areaMappa: Math.round(s.area || 0),
  };
}).catch((e) => ({ errore: String((e && e.message) || e) }));

const L = a.scatola ? a.scatola.max[0] - a.scatola.min[0] : 0;
const P = a.scatola ? a.scatola.max[2] - a.scatola.min[2] : 0;
const striscia = (el) => {
  if (!el.length) return "\u2014";
  const xs = el.map((q) => q.x), zs = el.map((q) => q.z);
  return "x " + Math.min(...xs).toFixed(0) + " \u2192 " + Math.max(...xs).toFixed(0)
    + " (" + (Math.max(...xs) - Math.min(...xs)).toFixed(0) + " m su " + L.toFixed(0) + ")"
    + " \u00b7 z " + Math.min(...zs).toFixed(0) + " \u2192 " + Math.max(...zs).toFixed(0);
};
scrivi("");
scrivi("=== LA FILIERA DELLE TAPPE ===");
scrivi("  edificio: " + L.toFixed(0) + " m per " + P.toFixed(0) + " m"
  + (a.scatola ? "  (x " + a.scatola.min[0].toFixed(0) + " \u2192 " + a.scatola.max[0].toFixed(0) + ")" : ""));
scrivi("");
scrivi("  0. LA MAPPA DI CAMMINO SOTTO AI POSTI");
if (m.errore) scrivi("     \u2716 " + m.errore);
else {
  scrivi("     mappa: " + m.poligoni + " poligoni, " + m.areaMappa + " m2, cella "
    + (m.cella != null ? m.cella.toFixed(2) + " m" : "?")
    + (m.geo ? " · geometria letta: " + m.geo.triangoli + " triangoli da " + m.geo.mesh
        + " mesh, " + m.geo.saltate + " saltate" : ""));
  scrivi("     isole calpestabili: " + m.quanteIsole
    + " \u00b7 le piu' grandi: " + m.isole.map((i) => i.area + " m2 a " + i.quota).join(" | "));
  scrivi("     livelli riconosciuti: " + (m.livelli.length
    ? m.livelli.map((l) => "quota " + l.quota + " (" + l.area + " m2, " + l.isole + " isole)").join(" | ")
    : "nessuno"));
  scrivi("     rampe dichiarate fra i livelli: " + m.rampeAggiunte
    + (m.rampePerche ? " \u00b7 " + m.rampePerche : "")
    + (m.rampeScartate.length ? " \u00b7 scartate: " + m.rampeScartate.join("; ") : ""));
  scrivi("     fessure cucite in piano: " + m.quanteCuciture
    + (m.isoleGuardate != null ? " (su " + m.isoleGuardate + " isole guardate)" : "")
    + (m.cuciPerche ? " \u00b7 " + m.cuciPerche : ""));
  if (m.cuciAggiunte.length)
    scrivi("       luci cucite: " + m.cuciAggiunte.map((x) => x.luce + " m").join(", "));
  if (m.cuciScartate.length)
    for (const r of m.cuciScartate.slice(0, 8)) scrivi("       non cucito: " + r);
}
// --- 0-bis: quanto sono larghe DAVVERO le fessure che non ha cucito -------
// La cucitura in piano si ferma a 1,5 m («oltre non e' una fessura, e' uno
// spazio»). Ma se in mezzo il pavimento manca del tutto, la navmesh non ci
// cammina mai e le due piastre restano divise per sempre, larga o stretta che
// sia la fessura. Qui si misura la luce vera fra le isole grandi.
const f = await p.evaluate(() => {
  const s = window.__veritasNavmesh && window.__veritasNavmesh.stato();
  if (!s || !s.isole) return { errore: "nessuna mappa di cammino" };
  const g = s.isole.filter((i) => i && i.area >= 20 && i.bordo && i.bordo.length)
    .sort((u, v) => v.area - u.area).slice(0, 10);
  const passo = (b) => b.filter((_, i) => i % 3 === 0);
  const fuori = [];
  for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
    const x = passo(g[i].bordo), y = passo(g[j].bordo);
    let mi = Infinity;
    for (const q of x) for (const w of y) {
      const d = Math.hypot(q[0] - w[0], q[2] - w[2]);
      if (d < mi) mi = d;
    }
    fuori.push({ a: Math.round(g[i].area), b: Math.round(g[j].area),
                 qa: +(+g[i].quotaMedia).toFixed(2), qb: +(+g[j].quotaMedia).toFixed(2),
                 luce: +mi.toFixed(2) });
  }
  // Le due piastre piu' grandi che stanno sullo STESSO livello: se il piano
  // terra e' spezzato, e' qui che si vede, e la luce fra loro dice se e' una
  // fessura da dichiarare o un vuoto vero.
  const perLivello = {};
  for (const i of g) { const q = Math.round(i.quotaMedia * 2) / 2;
    (perLivello[q] = perLivello[q] || []).push(i); }
  const piuGrosso = Object.keys(perLivello)
    .sort((u, v) => perLivello[v].reduce((s, i) => s + i.area, 0)
                  - perLivello[u].reduce((s, i) => s + i.area, 0))[0];
  const piastre = (perLivello[piuGrosso] || []).slice(0, 2);
  let spacco = null;
  if (piastre.length === 2) {
    const [u, v] = piastre;
    let mi = Infinity, qa = null, qb = null;
    for (const q of u.bordo) for (const w of v.bordo) {
      const d = Math.hypot(q[0] - w[0], q[2] - w[2]);
      if (d < mi) { mi = d; qa = q; qb = w; }
    }
    const ing = (i) => ({ x: [i.ingombro.min[0], i.ingombro.max[0]],
                          z: [i.ingombro.min[2], i.ingombro.max[2]] });
    spacco = { livello: +piuGrosso, luce: +mi.toFixed(2),
               da: qa.map((n) => +n.toFixed(1)), a: qb.map((n) => +n.toFixed(1)),
               aree: [Math.round(u.area), Math.round(v.area)],
               ingombri: [ing(u), ing(v)] };
  }
  return { coppie: fuori.sort((u, v) => u.luce - v.luce), spacco };
}).catch((e) => ({ errore: String((e && e.message) || e) }));

scrivi("");
scrivi("  0-bis. LA LUCE VERA FRA LE ISOLE GRANDI (≥ 20 m2, le prime 10)");
if (f.errore) scrivi("     ✖ " + f.errore);
else {
  for (const c of f.coppie.slice(0, 14))
    scrivi("     " + String(c.luce).padStart(6) + " m  fra " + c.a + " m2 (quota " + c.qa
      + ") e " + c.b + " m2 (quota " + c.qb + ")"
      + (c.luce <= 1.5 ? "   ← sotto la soglia di 1,5 m" : "")
      + (Math.abs(c.qa - c.qb) > 0.4 ? "   ⚠ quote diverse: e' un bordo di soppalco, non una fessura" : ""));
  if (f.spacco) {
    scrivi("");
    scrivi("     LO SPACCO DEL LIVELLO PIU' ESTESO (quota " + f.spacco.livello + "):");
    scrivi("       due piastre da " + f.spacco.aree[0] + " e " + f.spacco.aree[1]
      + " m2, luce " + f.spacco.luce + " m");
    scrivi("       i due bordi che si guardano: " + JSON.stringify(f.spacco.da)
      + " ↔ " + JSON.stringify(f.spacco.a));
    for (const i of f.spacco.ingombri)
      scrivi("       piastra: x " + i.x[0].toFixed(0) + " → " + i.x[1].toFixed(0)
        + " · z " + i.z[0].toFixed(0) + " → " + i.z[1].toFixed(0));
  }
}

// --- 0-ter: il pavimento manca nel MODELLO o solo nella MAPPA? ------------
// Si tira un filo a piombo ogni 2 m su tutta l'impronta dell'edificio: dove
// tocca una superficie quasi orizzontale c'e' un pavimento disegnato; poi si
// chiede alla mappa di cammino se in quel punto si cammina. Le due risposte
// insieme dicono di chi e' la colpa, banda per banda.
const r = await p.evaluate(() => {
  const T = window.THREE, R = window.__veritasModelRoot, nm = window.__veritasNavmesh;
  if (!T || !R || !nm) return { errore: "manca il modello o la mappa" };
  const b = new T.Box3().setFromObject(R);
  const rc = new T.Raycaster();
  rc.far = 200;
  const giu = new T.Vector3(0, -1, 0);
  const PASSO = 2, ALTO = b.max.y + 5;
  const bande = new Map();
  for (let x = b.min.x + PASSO / 2; x < b.max.x; x += PASSO)
    for (let z = b.min.z + PASSO / 2; z < b.max.z; z += PASSO) {
      rc.set(new T.Vector3(x, ALTO, z), giu);
      const colpi = rc.intersectObject(R, true);
      // il primo colpo quasi orizzontale: e' un pavimento, un tetto o una
      // piattaforma. Il piu' BASSO fra quelli sotto i 2 m di quota e' il
      // pavimento su cui si cammina.
      // ⚠️ Solo le facce rivolte in SU: `Math.abs(n.y)` prendeva anche il SOTTO
      //    del solaio, e la prima stesura di questa sonda misurava la faccia
      //    inferiore di una piastra spessa 25 cm chiamandola pavimento.
      //    E' la regola del §6.15 applicata a me stesso.
      let pav = null;
      for (const c of colpi) {
        if (!c.face) continue;
        const n = c.face.normal.clone().transformDirection(c.object.matrixWorld);
        if (n.y < 0.85) continue;
        if (c.point.y > 2.2) continue;
        if (pav == null || c.point.y > pav) pav = c.point.y;
      }
      let cammina = false;
      if (pav != null) {
        try { const q = nm.sulCamminoCorrente([x, pav, z], [1, 1.5, 1]); cammina = !!(q && q.ok); }
        catch (e) {}
      }
      const k = Math.floor((x - b.min.x) / 10);
      if (!bande.has(k)) bande.set(k, { da: b.min.x + k * 10, punti: 0, conPav: 0, camminabili: 0 });
      const v = bande.get(k);
      v.punti++;
      if (pav != null) v.conPav++;
      if (cammina) v.camminabili++;
    }
  return { bande: [...bande.values()].sort((u, v) => u.da - v.da), passo: PASSO };
}).catch((e) => ({ errore: String((e && e.message) || e) }));

scrivi("");
scrivi("  0-ter. PAVIMENTO DISEGNATO vs PAVIMENTO CAMMINABILE, banda per banda di 10 m");
if (r.errore) scrivi("     ✖ " + r.errore);
else for (const v of r.bande) {
  const perc = v.conPav ? Math.round(100 * v.camminabili / v.conPav) : 0;
  const barra = "█".repeat(Math.round(perc / 5)) + "·".repeat(20 - Math.round(perc / 5));
  scrivi("     x " + String(Math.round(v.da)).padStart(4) + " → " + String(Math.round(v.da + 10)).padStart(4)
    + "   pavimento disegnato su " + String(v.conPav).padStart(3) + "/" + String(v.punti).padEnd(3)
    + " sonde   camminabile " + barra + " " + String(perc).padStart(3) + "%");
}

// --- 0-quater: nelle bande perse, che cosa c'e' sopra il pavimento? -------
// Un pavimento disegnato che la mappa non calpesta ha tre cause possibili, e
// si distinguono guardando: c'e' un ingombro sopra all'altezza di una persona
// (allora la mappa ha ragione), c'e' un gradino troppo alto, oppure non c'e'
// niente (e allora la mappa sbaglia).
const w = await p.evaluate((banda) => {
  const T = window.THREE, R = window.__veritasModelRoot, nm = window.__veritasNavmesh;
  if (!T || !R || !nm) return { errore: "manca il modello o la mappa" };
  const b = new T.Box3().setFromObject(R);
  const rc = new T.Raycaster(); rc.far = 200;
  const giu = new T.Vector3(0, -1, 0), su = new T.Vector3(0, 1, 0);
  const esito = { persi: 0, conIngombro: 0, liberi: 0, quote: {}, nomi: {}, cielo: {} };
  for (let x = banda[0]; x < banda[1]; x += 2)
    for (let z = b.min.z + 1; z < b.max.z; z += 2) {
      rc.set(new T.Vector3(x, b.max.y + 5, z), giu);
      let pav = null, ogg = null;
      for (const c of rc.intersectObject(R, true)) {
        if (!c.face) continue;
        const n = c.face.normal.clone().transformDirection(c.object.matrixWorld);
        if (n.y < 0.85 || c.point.y > 2.2) continue;   // solo facce rivolte in su
        if (pav == null || c.point.y > pav) { pav = c.point.y; ogg = c.object; }
      }
      if (pav == null) continue;
      let cammina = false;
      try { const q = nm.sulCamminoCorrente([x, pav, z], [1, 1.5, 1]); cammina = !!(q && q.ok); }
      catch (e) {}
      if (cammina) continue;
      esito.persi++;
      const q = (Math.round(pav * 4) / 4).toFixed(2);
      esito.quote[q] = (esito.quote[q] || 0) + 1;
      const nome = (ogg && (ogg.name || (ogg.parent && ogg.parent.name))) || "(senza nome)";
      esito.nomi[nome] = (esito.nomi[nome] || 0) + 1;
      // QUANTO CIELO C'E' SOPRA: una persona alta 2 m non passa sotto un
      // solaio a 1,9 m, e Recast toglie la cella. Si misura la luce vera.
      rc.set(new T.Vector3(x, pav + 0.05, z), su);
      rc.far = 12;
      const sopra = rc.intersectObject(R, true).filter((c) => c.distance > 0.02);
      rc.far = 200;
      if (sopra.length && sopra[0].distance < 1.8) esito.conIngombro++; else esito.liberi++;
      const h = sopra.length ? Math.round(sopra[0].distance * 4) / 4 : null;
      const ck = h == null ? "niente sopra (cielo aperto)" : h.toFixed(2) + " m di luce";
      esito.cielo[ck] = (esito.cielo[ck] || 0) + 1;
    }
  const top = (o) => Object.keys(o).sort((u, v) => o[v] - o[u]).slice(0, 6).map((k) => o[k] + "× " + k);
  return { persi: esito.persi, conIngombro: esito.conIngombro, liberi: esito.liberi,
           quote: top(esito.quote), nomi: top(esito.nomi), cielo: top(esito.cielo) };
}, [-45, -25]).catch((e) => ({ errore: String((e && e.message) || e) }));

scrivi("");
scrivi("  0-quater. LA BANDA PERSA x −45 → −25: perche' non ci si cammina");
if (w.errore) scrivi("     ✖ " + w.errore);
else {
  scrivi("     sonde con pavimento disegnato ma non camminabile: " + w.persi);
  scrivi("       con un ingombro sopra, fra +0,30 e +1,80 m: " + w.conIngombro
    + "  ·  con l'aria libera sopra: " + w.liberi);
  scrivi("       quote del pavimento perso: " + w.quote.join(" | "));
  scrivi("       su che cosa cadono: " + w.nomi.join(" | "));
  scrivi("       luce sopra il pavimento perso: " + w.cielo.join(" | "));
}

scrivi("");
scrivi("  1. posti misurati nel modello ...... " + a.tutti.length + "  \u00b7 " + striscia(a.tutti));
scrivi("  2. senza figure e senza appesi ..... " + a.appoggiabili.length + "  \u00b7 " + striscia(a.appoggiabili));
scrivi("  3. sul calpestabile ................ " + a.sulCammino.length + "  \u00b7 " + striscia(a.sulCammino));
if (a.fuoriDalCammino.length) {
  scrivi("     caduti qui (" + a.fuoriDalCammino.length + "):");
  for (const q of a.fuoriDalCammino.slice(0, 12))
    scrivi("       x " + q.x + " z " + q.z + " \u00b7 " + q.oggetti + " oggetti \u00b7 " + q.area + " m2 \u00b7 " + q.forma);
}

// --- 3-bis: DA DOVE SI ENTRA? il salto dal baricentro al punto calpestabile
// Raffaella, 22/09: «per quale motivo mette una zona dal lato opposto al
// tunnel di accesso dell'aereo?». Il sospetto e' che la tappa non vada DOVE SI
// ENTRA, ma sul primo punto calpestabile piu' vicino al baricentro
// dell'ingombro — e il baricentro di un aereo sta dentro l'aereo, quindi il
// punto piu' vicino cade da una parte o dall'altra per puro caso geometrico.
const e = await p.evaluate(() => {
  const CO = window.__veritasCose, CP = window.__veritasControprova, nm = window.__veritasNavmesh;
  const tutti = (window.__veritasCoseTrovate && window.__veritasCoseTrovate.posti) || [];
  const righe = [];
  for (const q of CO.posiAppoggiabili(tutti, { eFigura: CP ? CP.eUnaFigura : undefined })) {
    let r = null;
    try { r = nm.sulCamminoCorrente(q.centro, [6, 6, 6]); } catch (err) {}
    if (!r || !r.ok) continue;
    const d = (q.ingombro && q.ingombro.dim) || [0, 0, 0];
    const dx = r.punto[0] - q.centro[0], dz = r.punto[2] - q.centro[2];
    const salto = Math.hypot(dx, dz);
    // il baricentro sta DENTRO l'ingombro? allora il punto calpestabile e'
    // per forza su un bordo, e quale bordo non lo decide nessuno
    const dentro = Math.abs(dx) <= d[0] / 2 + 0.1 && Math.abs(dz) <= d[2] / 2 + 0.1;
    righe.push({
      oggetti: q.oggetti, forma: q.formaPrevalente,
      ingombro: [+d[0].toFixed(1), +d[2].toFixed(1)],
      centro: [+q.centro[0].toFixed(1), +q.centro[2].toFixed(1)],
      appoggio: [+r.punto[0].toFixed(1), +r.punto[2].toFixed(1)],
      salto: +salto.toFixed(1),
      verso: (Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? "est" : "ovest") : (dz > 0 ? "sud" : "nord")),
      sulBordo: dentro,
    });
  }
  return { righe: righe.sort((a, b) => b.salto - a.salto) };
}).catch((err) => ({ errore: String((err && err.message) || err) }));

scrivi("");
scrivi("  3-bis. DAL BARICENTRO AL PUNTO CALPESTABILE: quanto salta, e da che parte");
if (e.errore) scrivi("     ✖ " + e.errore);
else {
  const grossi = e.righe.filter((r) => r.salto > 3);
  scrivi("     " + grossi.length + " posti su " + e.righe.length
    + " hanno il punto calpestabile a piu' di 3 m dal proprio baricentro");
  for (const r of e.righe.slice(0, 10))
    scrivi("      ingombro " + String(r.ingombro[0]).padStart(5) + "×" + String(r.ingombro[1]).padEnd(5)
      + " m · " + String(r.oggetti).padStart(3) + " oggetti · " + (r.forma || "?").padEnd(10)
      + " · baricentro " + JSON.stringify(r.centro) + " → appoggio " + JSON.stringify(r.appoggio)
      + " · salto " + r.salto + " m verso " + r.verso
      + (r.sulBordo ? "   ⚠ il baricentro sta DENTRO l'ingombro: il lato lo sceglie il caso" : ""));
}

// --- setaccio 4: i gruppi che si raggiungono a piedi ----------------------
scrivi("");
scrivi(secondi() + " setaccio 4: percorsi a piedi fra i " + a.sulCammino.length + " posti rimasti\u2026");
const g = await p.evaluate(async (tetto) => {
  const nm = window.__veritasNavmesh, CO = window.__veritasCose, CP = window.__veritasControprova;
  const tutti = (window.__veritasCoseTrovate && window.__veritasCoseTrovate.posti) || [];
  const c = CO.posiAppoggiabili(tutti, { eFigura: CP ? CP.eUnaFigura : undefined })
    .map((q) => { let r = null;
      try { r = nm.sulCamminoCorrente(q.centro, [6, 6, 6]); } catch (e) {}
      return r && r.ok ? { ...q, appoggio: r.punto } : null; }).filter(Boolean);
  const t = Date.now();
  const padre = c.map((_, i) => i);
  const radice = (i) => { while (padre[i] !== i) { padre[i] = padre[padre[i]]; i = padre[i]; } return i; };
  // ⚠️ null e parziale non sono la stessa cosa, e leggerli insieme sarebbe
  //    l'errore del §6.15: `null` = la navmesh non ha trovato la partenza o
  //    l'arrivo; `parziale` = li ha trovati ma stanno su due isole diverse.
  let coppie = 0, collegate = 0, tagliato = false, vuoti = 0, parziali = 0;
  for (let i = 0; i < c.length && !tagliato; i++)
    for (let j = i + 1; j < c.length; j++) {
      if (Date.now() - t > tetto) { tagliato = true; break; }
      coppie++;
      let ok = false;
      try { const r = nm.percorsoCorrente(c[i].appoggio, c[j].appoggio, { aderente: false });
            if (!r) vuoti++; else if (r.parziale) parziali++;
            ok = !!(r && !r.parziale); } catch (e) { vuoti++; }
      if (ok) { collegate++; const x = radice(i), y = radice(j); if (x !== y) padre[y] = x; }
    }
  const per = new Map();
  c.forEach((q, i) => { const r = radice(i); if (!per.has(r)) per.set(r, []); per.get(r).push(q); });
  const gruppi = [...per.values()].map((gr) => ({
    posti: gr.length,
    oggetti: gr.reduce((s, q) => s + q.oggetti, 0),
    area: Math.round(gr.reduce((s, q) => s + q.area, 0)),
    x: [Math.min(...gr.map((q) => q.appoggio[0])), Math.max(...gr.map((q) => q.appoggio[0]))],
    z: [Math.min(...gr.map((q) => q.appoggio[2])), Math.max(...gr.map((q) => q.appoggio[2]))],
    y: [Math.min(...gr.map((q) => q.appoggio[1])), Math.max(...gr.map((q) => q.appoggio[1]))],
  })).sort((u, v) => v.oggetti - u.oggetti);
  return { gruppi, coppie, collegate, tagliato, vuoti, parziali, ms: Date.now() - t };
}, 4 * 60 * 1000).catch((e) => ({ errore: String((e && e.message) || e) }));

if (g.errore) scrivi("  \u2716 " + g.errore);
else {
  scrivi("  " + g.collegate + " coppie collegate su " + g.coppie + " provate ("
    + g.parziali + " su due isole diverse, " + g.vuoti + " senza partenza o arrivo)"
    + (g.tagliato ? " \u26a0 TAGLIATO dal tetto di 4 minuti: i gruppi qui sotto sono spezzati piu' del vero" : "")
    + " \u00b7 " + (g.ms / 1000).toFixed(0) + "s");
  scrivi("  4. gruppi che si raggiungono a piedi: " + g.gruppi.length);
  g.gruppi.forEach((gr, i) => {
    const largo = gr.x[1] - gr.x[0];
    scrivi("     " + (i === 0 ? "\u25b6" : " ") + " gruppo " + (i + 1) + ": " + gr.posti + " posti \u00b7 "
      + gr.oggetti + " oggetti \u00b7 " + gr.area + " m2 \u00b7 larghezza " + largo.toFixed(0)
      + " m (x " + gr.x[0].toFixed(0) + " \u2192 " + gr.x[1].toFixed(0) + ")"
      + (gr.posti < 2 ? "  \u2716 scartato: meno di 2 posti" : ""));
  });
  const vince = g.gruppi.filter((gr) => gr.posti >= 2)[0];
  if (vince) { scrivi("");
    scrivi("  \u25b6 VINCE il gruppo da " + vince.oggetti + " oggetti: " + vince.posti
      + " posti in " + (vince.x[1] - vince.x[0]).toFixed(0) + " m di edificio su " + L.toFixed(0)
      + ". Le tappe non possono uscire da qui."); }
}
scrivi("durata " + secondi());
await ctx.close();
