// QUANTO TROVA L'OCCHIO, OGGI, sulle immagini che guarda davvero.
//
// Prende le stesse immagini di `renderi_per_sam.mjs` — la pianta del pavimento
// e gli scorci di tre quarti — e ci fa passare sopra OWLv2 con il vocabolario
// vero della piattaforma. Serve come RIGA DI PARTENZA: il giorno in cui SAM 3.1
// arriva, si rifa' la stessa prova sugli stessi PNG e si confronta numero con
// numero, non impressione con impressione.
//
//   node occhio_sui_renderi.mjs [cartella]
//
// Manopole: MODELLO, SCORCI (quanti, default 3), PAROLE (quante chiederne,
//           0 = tutto il vocabolario), DAL_WORKSPACE=1, PROFILO, SOGLIA.
//
// ⚠️ SI MISURA DUE VOLTE LA PIANTA, e non e' uno spreco. L'app passa all'occhio
//    i pixel COSI' COME ESCONO dal disegnatore, sfondo trasparente compreso;
//    `renderi_per_sam.mjs` invece, per salvare un PNG guardabile, ci mette
//    sotto il bianco. Sono due immagini diverse, e se l'occhio le legge diverso
//    allora il confronto con SAM andrebbe fatto sull'immagine giusta — non su
//    quella comoda. Questa prova lo dice invece di darlo per scontato.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.join(qui, "..", "..");
const CARTELLA = path.resolve(process.argv[2] || path.join(qui, "renderi"));
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const QUANTI = Number(process.env.SCORCI || 3);
const QUANTE = Number(process.env.PAROLE || 0);
const DAL_WS = process.env.DAL_WORKSPACE === "1";
fs.mkdirSync(CARTELLA, { recursive: true });

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
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
if (DAL_WS) {
  await ctx.route((url) => url.href.startsWith(BASE), (r) => {
    const u = new URL(r.request().url());
    const rel = decodeURIComponent(u.pathname.slice("/Veritas-spatial-ai/".length)) || "index.html";
    const f = path.join(WS, rel);
    if (f.startsWith(WS) && fs.existsSync(f) && fs.statSync(f).isFile())
      return r.fulfill({ status: 200, path: f, headers: {
        "content-type": TIPI[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" } });
    return r.continue();
  });
}

const p = ctx.pages()[0] || await ctx.newPage();
p.on("pageerror", (e) => console.log("PAGEERROR " + String(e).slice(0, 200)));
await p.bringToFront();
await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 120000 });
const costruzione = await p.evaluate(() => window.__EIDETICA_COSTRUZIONE || "(non dichiarata)");
console.log("costruzione: " + costruzione + (DAL_WS ? "  (workspace)" : "  (pubblicata)"));
await p.waitForSelector("#v-pick-file", { timeout: 60000 });
const [scelta] = await Promise.all([p.waitForEvent("filechooser", { timeout: 30000 }), p.click("#v-pick-file")]);
await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "occhio sui renderi").catch(() => {});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).then(() => p.click("#vs-start-btn")).catch(() => {});
await p.waitForFunction(() => !!window.__veritasModelRoot, null, { timeout: 180000 });
await p.waitForTimeout(8000);

const esito = await p.evaluate(async ([quanti, quante, soglia]) => {
  const R = window.__veritasRiconosce, V = window.__veritasVista;
  const T = window.THREE, Rend = window.__veritasRenderer, radice = window.__veritasModelRoot;
  if (!R || !V || !T || !Rend || !radice) return { guaio: "manca la scena o il disegnatore" };

  // Le stesse immagini di renderi_per_sam.mjs, nello stesso ordine.
  // ⚠️ `tutto: true` E' OBBLIGATORIO: vedi l'avviso in renderi_per_sam.mjs.
  //    Senza, si misura il pavimento nudo e non quello che guarda l'occhio.
  const viste = [];
  try {
    const pianta = V.piantaDelPavimento(T, Rend, radice, { tutto: true });
    if (pianta && pianta.pixel) viste.push({ nome: "pianta_dall_alto", v: pianta });
  } catch (e) { return { guaio: "pianta: " + e.message }; }
  try {
    (V.scorciTreQuarti(T, Rend, radice, { numeroScorci: quanti }) || [])
      .forEach((v, i) => viste.push({ nome: "scorcio_" + (i + 1), v }));
  } catch (e) { /* gli scorci possono mancare: si dice sotto */ }

  const inTela = (v, bianco) => {
    const l = v.larghezza, a = v.altezza;
    const c = document.createElement("canvas"); c.width = l; c.height = a;
    const g = c.getContext("2d");
    const d = g.createImageData(l, a); d.data.set(v.pixel); g.putImageData(d, 0, 0);
    if (!bianco) return c;
    const s = document.createElement("canvas"); s.width = l; s.height = a;
    const sg = s.getContext("2d");
    sg.fillStyle = "#ffffff"; sg.fillRect(0, 0, l, a); sg.drawImage(c, 0, 0);
    return s;
  };

  const rileva = await R.occhioLocale({ attesaAccensione: 420000, attesaSguardo: 600000 });
  const st = R.stato();
  if (!rileva) return { guaio: "l'occhio non si e' acceso: " + st.perche, stato: st };

  const voci = R.vocabolarioPer(window.__veritasProjectType || null, []);
  let parole = voci.map((v) => v.chiedi);
  if (quante > 0) parole = parole.slice(0, quante);

  const guarda = async (tela, etichetta) => {
    const t0 = performance.now();
    let out = null, guaio = null;
    try { out = await rileva(tela, parole); } catch (e) { guaio = String(e && e.message || e); }
    const secondi = +((performance.now() - t0) / 1000).toFixed(1);
    if (!out) return { etichetta, guaio, secondi };
    const conta = new Map();
    for (const o of out) conta.set(o.label, (conta.get(o.label) || 0) + 1);
    return {
      etichetta, secondi, larghezza: tela.width, altezza: tela.height,
      trovate: out.length,
      sopra30: out.filter((o) => o.score >= 0.3).length,
      sopra50: out.filter((o) => o.score >= 0.5).length,
      miglioreFiducia: out.length ? +(Math.max(...out.map((o) => o.score))).toFixed(3) : 0,
      parolePescate: [...conta.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => k + " x" + n),
      prime: out.slice().sort((a, b) => b.score - a.score).slice(0, 15)
        .map((o) => ({ cosa: o.label, fiducia: +o.score.toFixed(3),
                       dove: o.box ? [Math.round(o.box.xmin), Math.round(o.box.ymin),
                                      Math.round(o.box.xmax), Math.round(o.box.ymax)] : null })),
    };
  };

  const misure = [];
  for (const { nome, v } of viste)
    misure.push(await guarda(inTela(v, false), nome + " (come la vede l'app: sfondo trasparente)"));
  // Il controllo sul fondo bianco: solo sulla pianta, basta a dire se cambia.
  if (viste.length)
    misure.push(await guarda(inTela(viste[0].v, true), viste[0].nome + " (col fondo bianco: come il PNG per SAM)"));

  return { stato: st, parole: parole.length, elencoParole: parole, soglia, misure,
           immagini: viste.map((x) => ({ nome: x.nome, larghezza: x.v.larghezza, altezza: x.v.altezza,
                                         pixelPerMetro: x.v.pixelPerMetro || null })) };
}, [QUANTI, QUANTE, 0.1]);

if (esito.guaio) { console.log("GUAIO: " + esito.guaio); }
else {
  console.log("l'occhio guarda da: " + (esito.stato.dove || "(non dichiarato)")
    + "  (" + esito.stato.device + "/" + esito.stato.dtype + ")");
  console.log("parole chieste: " + esito.parole + "  ·  soglia " + esito.soglia);
  console.log("");
  for (const m of esito.misure) {
    if (m.guaio) { console.log("  " + m.etichetta + ": GUAIO " + m.guaio); continue; }
    console.log("  " + m.etichetta);
    console.log("    " + m.larghezza + "x" + m.altezza + " px · " + m.secondi + " s · "
      + m.trovate + " rilevazioni (" + m.sopra30 + " sopra 30%, " + m.sopra50 + " sopra 50%)"
      + " · migliore " + (m.miglioreFiducia * 100).toFixed(0) + "%");
    console.log("    parole pescate: " + (m.parolePescate.length ? m.parolePescate.slice(0, 12).join(", ") : "NESSUNA"));
    if (m.prime.length) console.log("    migliori: "
      + m.prime.slice(0, 6).map((x) => x.cosa + " " + (x.fiducia * 100).toFixed(0) + "%").join(", "));
    console.log("");
  }
}
const f = path.join(CARTELLA, "occhio_oggi.json");
fs.writeFileSync(f, JSON.stringify({ costruzione, sorgente: DAL_WS ? "workspace" : "pubblicata",
                                     quando: new Date().toISOString(), ...esito }, null, 1));
console.log("scritto in " + f);
await ctx.close();
