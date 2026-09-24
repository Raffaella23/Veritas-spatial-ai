// I PEZZI DELLA MAPPA DI CAMMINO, disegnati (§6.14, 24/09). Base: da_dove_vengono_le_tappe.mjs
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
const FUORI = path.join(qui, "pezzi_della_mappa.txt");
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
// --- LA PIANTA DEI PEZZI ----------------------------------------------------
// Ogni isola calpestabile col suo bordo, le cuciture fatte e rifiutate, e i
// posti misurati col gruppo a piedi a cui appartengono. Si scrive una SVG
// (vista dall'alto, x verso destra, z verso il basso) da guardare, non da leggere.
const d = await p.evaluate(() => {
  const nm = window.__veritasNavmesh, s = nm.stato();
  const iso = (s.isole || []).filter((i) => i.area >= 3).map((i) => ({
    area: Math.round(i.area), quota: +(+i.quotaMedia).toFixed(2),
    bordo: (i.bordo || []).map((q) => [+q[0].toFixed(2), +q[2].toFixed(2)]),
    min: [i.ingombro.min[0], i.ingombro.min[2]], max: [i.ingombro.max[0], i.ingombro.max[2]] }));
  const k = s.cuciture || {};
  const posti = ((window.__veritasCoseTrovate || {}).posti || []).map((q) => {
    let r = null; try { r = nm.sulCamminoCorrente(q.centro, [6, 6, 6]); } catch (e) {}
    return { c: [q.centro[0], q.centro[2]], a: r && r.ok ? r.punto : null, forma: q.formaPrevalente, n: q.oggetti };
  });
  const conA = posti.filter((q) => q.a);
  const g = nm.gruppiCollegati(conA.map((q) => q.a)) || { gruppo: [] };
  conA.forEach((q, i) => { q.g = g.gruppo[i]; });
  return { iso, cuciOk: (k.aggiunti || []).map((x) => ({ da: x.da, a: x.a, luce: x.luce })),
           cuciNo: (k.scartati || []).map((x) => ({ perche: x.perche, luce: x.luce, fra: x.fra })),
           posti, gruppi: g.quanti };
});
// L'occhio: si aspetta la fine del suo giro (tetto 5 minuti) e si prendono le
// cose che ha posato nel mondo come «varco» e «ferma».
const fineOcchio = Date.now() + 300000;
while (Date.now() < fineOcchio) {
  if (await p.evaluate(() => !!window.__veritasComprensione).catch(() => false)) break;
  await p.waitForTimeout(5000);
}
d.occhio = await p.evaluate(() => (window.__veritasVistoNelMondo || [])
  .filter((o) => o && (o.passo === "varco" || o.passo === "ferma") && o.mondo)
  .map((o) => ({ passo: o.passo, da: o.da, nome: o.nome || o.etichetta || o.parola || null,
                 min: [o.mondo.min[0], o.mondo.min[2]], max: [o.mondo.max[0], o.mondo.max[2]],
                 y: +(((o.mondo.min[1] + o.mondo.max[1]) / 2) || 0).toFixed(2) }))).catch(() => []);
scrivi(secondi() + " l'occhio ha posato " + d.occhio.filter((o) => o.passo === "varco").length + " varchi e "
  + d.occhio.filter((o) => o.passo === "ferma").length + " elementi che separano");
for (const o of d.occhio) scrivi("   occhio " + o.passo + " (" + (o.nome || "?") + ", " + o.da + ") x "
  + o.min[0].toFixed(1) + "→" + o.max[0].toFixed(1) + " z " + o.min[1].toFixed(1) + "→" + o.max[1].toFixed(1) + " y " + o.y);
fs.writeFileSync(path.join(qui, "pezzi_della_mappa.json"), JSON.stringify(d));
scrivi(secondi() + " isole " + d.iso.length + ", cuciture " + d.cuciOk.length + " fatte / "
  + d.cuciNo.length + " rifiutate, gruppi di posti " + d.gruppi);
for (const c of d.cuciNo) scrivi("   rifiutata: " + c.luce + " m fra " + c.fra.join(" e ") + " m2 — " + c.perche);
for (const i of d.iso.slice(0, 12)) scrivi("   isola " + i.area + " m2 quota " + i.quota
  + "  x " + i.min[0].toFixed(0) + "→" + i.max[0].toFixed(0) + "  z " + i.min[1].toFixed(0) + "→" + i.max[1].toFixed(0));
for (const q of d.posti) scrivi("   posto " + q.n + " " + q.forma + " @ " + q.c.map((v) => v.toFixed(0)).join(",")
  + (q.a ? " gruppo " + q.g : " FUORI dal calpestabile"));
await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 15000))]).catch(() => {});
process.exit(0);
