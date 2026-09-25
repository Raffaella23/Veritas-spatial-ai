// QUANTE TAPPE, E SU QUANTI POSTI MISURATI — §6.16.
//
// Raffaella, 22/09: «in quella zona non ho mai visto una zona». Si misura:
// quante tappe ci sono, quanti posti con arredi misurati, e quanti di quei
// posti hanno una tappa entro RAGGIO metri. Due istantanee: a meta' giro e a
// fine giro (dopo che l'occhio ha dato i nomi).
//
//   DAL_WORKSPACE=1 RADICE=<clone> MODELLO=<glb> node banco/vivo/conta_tappe.mjs
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.resolve(process.env.RADICE || path.join(qui, "..", ".."));
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const DAL_WS = process.env.DAL_WORKSPACE === "1";
const RAGGIO = Number(process.env.RAGGIO || 4);
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
const TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
               ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css",
               ".glb": "model/gltf-binary", ".png": "image/png", ".svg": "image/svg+xml" };
const conTetto = (pr, ms, cosa) => Promise.race([pr,
  new Promise((_, no) => setTimeout(() => no(new Error("tetto " + ms + " ms: " + cosa)), ms))]);
const t0 = Date.now();
const ora = () => String(Math.round((Date.now() - t0) / 1000)).padStart(4) + "s";

const ctx = await chromium.launchPersistentContext(path.join(qui, process.env.PROFILO || "profilo_seduta_da_sola"), {
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true, viewport: { width: 1600, height: 900 },
  args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
await ctx.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js", (r) =>
  r.fulfill({ status: 200, path: path.join(WS, "banco", "finti", "supabase_finto.js"),
              headers: { "content-type": "text/javascript" } }));
if (DAL_WS) {
  await ctx.route((url) => url.href.startsWith(BASE), (r) => {
    const u = new URL(r.request().url());
    const rel = decodeURIComponent(u.pathname.slice("/Veritas-spatial-ai/".length)) || "index.html";
    const f = path.join(WS, rel);
    let ok = false; try { ok = f.startsWith(WS) && fs.statSync(f).isFile() && (fs.accessSync(f, fs.constants.R_OK), true); } catch (e) {}
    if (ok)
      return r.fulfill({ status: 200, path: f, headers: {
        "content-type": TIPI[path.extname(f)] || "application/octet-stream", "cache-control": "no-store",
        "cross-origin-opener-policy": "same-origin", "cross-origin-embedder-policy": "credentialless",
        "cross-origin-resource-policy": "cross-origin" } });
    return r.continue();
  });
}
const p = ctx.pages()[0] || await ctx.newPage();
p.on("console", (m) => { const t = m.text();
  if (/\[VERITAS (montaggio\] giro|occhio\] (pronto|acceso))/.test(t)) console.log(ora() + "  " + t.slice(0, 230)); });
p.on("pageerror", (e) => console.log(ora() + "  PAGEERROR " + String(e).slice(0, 200)));

await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 120000 });
for (let i = 0; i < 20; i++) {
  if (await p.evaluate(() => window.crossOriginIsolated).catch(() => null)) break;
  await new Promise((r) => setTimeout(r, 500));
}
await p.waitForLoadState("load").catch(() => {});
console.log(ora() + "  costruzione " + await p.evaluate(() => window.__EIDETICA_COSTRUZIONE) + (DAL_WS ? " (workspace)" : " (pubblicata)"));
await p.waitForSelector("#v-pick-file", { timeout: 60000 });
const [scelta] = await Promise.all([p.waitForEvent("filechooser", { timeout: 30000 }), p.click("#v-pick-file")]);
await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "seduta da sola").catch(() => {});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).then(() => p.click("#vs-start-btn")).catch(() => {});


// L'OGGETTO DA SOLO — §12 passo B (25/09). I 4 tipi a terra a misura d'uomo
// con piu' copie: ognuno inquadrato di lato, UNA copia, prima con tutto
// l'edificio intorno e poi isolato (`isola`). L'occhio (OWLv2) riceve il
// vocabolario INTERO dell'app. Riuscita: la seduta isolata ha come primo nome
// una parola da seduti (POSTURA_DI = «seduto»). Tetto TETTO_MS (15 min).
const CARTELLA = process.env.CARTELLA || path.join(qui, "seduta_da_sola");
fs.mkdirSync(CARTELLA, { recursive: true });
const TETTO_MS = Number(process.env.TETTO_MS || 4 * 60000);
const scadenza = t0 + TETTO_MS;
while (Date.now() < scadenza - 3 * 60000) {
  const pronto = await conTetto(p.evaluate(() => !!(window.__veritasModelRoot && window.__veritasCoseTrovate
    && window.__veritasRiconosce && window.__veritasRiconosce.stato().fase === "pronto")), 15000, "pronto").catch(() => false);
  if (pronto) break;
  await new Promise((r) => setTimeout(r, 3000));
}
console.log(ora() + "  occhio acceso, codice nuovo: telecamera isola=" + await p.evaluate(() => String(window.__veritasVista.scorciTreQuarti).includes("opzioni.isola"))
  + ", swivel chair seduto=" + await p.evaluate(() => window.__veritasRiconosce.POSTURA_DI["swivel chair"] === "seduto"));
const esito = await conTetto(p.evaluate(async () => {
  const THREE = window.THREE, root = window.__veritasModelRoot, rend = window.__veritasRenderer;
  const C = window.__veritasCose, V = window.__veritasVista, R = window.__veritasRiconosce;
  const rileva = await R.occhioLocale();
  if (!rileva) return { errore: "occhio spento", stato: R.stato() };
  const inv = C.inventarioDaScena(THREE, root);
  const ta = performance.now();
  const tutti = C.tipiInteri(inv);                       // la funzione VERA della pagina
  const msTipi = Math.round(performance.now() - ta);
  const scelti = tutti.filter((t) => Math.max(t.misura[0], t.misura[2]) >= 0.3 && Math.max(t.misura[0], t.misura[2]) <= 6
      && t.misura[1] >= 0.2 && t.misura[1] <= 3 && t.stacco <= 0.3 && t.copie.length >= 2)
    .slice(0, Number(window.__QUANTI_TIPI || 1))
    .map((t) => Object.assign(t, { min: t.copie[0].min, max: t.copie[0].max, d: t.misura, nome: t.copie[0].pezzi[0].nome, copieN: t.copie.length }));
  const voci = R.vocabolarioPer("aeroporto");
  const parole = voci.map((v) => v.chiedi);
  const postura = new Map(voci.map((v) => [v.chiedi, v.postura || null]));
  const perParola = new Map(voci.map((v) => [v.chiedi, v]));
  const fuori = [];
  for (const t of scelti) {
    for (const isola of [true]) {
      const a = performance.now();
      const sc = V.scorciTreQuarti(THREE, rend, root, { bersaglio: { min: t.min, max: t.max },
        diLato: true, numeroScorci: 1, conLuce: true, elevazioneGradi: 25, isola })[0];
      const tela = document.createElement("canvas"); tela.width = sc.larghezza; tela.height = sc.altezza;
      const g = tela.getContext("2d"); g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, tela.width, tela.height);
      g.drawImage(R.piantaInTela(sc), 0, 0);
      const disegno = Math.round(performance.now() - a);
      const b = performance.now();
      const ril = await rileva(tela, parole);
      const sguardo = Math.round(performance.now() - b);
      // il nome della cosa INQUADRATA: la rilevazione piu' forte fra quelle
      // che coprono almeno il 5% dell'immagine (sotto e' un dettaglio, non la cosa)
      const W = tela.width, H = tela.height;
      const alCentro = ril.filter((r) => { const x = r.box; const s = Math.max(x.xmax, x.ymax) <= 1.001 ? [W, H] : [1, 1];
        return (x.xmax - x.xmin) * s[0] * (x.ymax - x.ymin) * s[1] >= 0.05 * W * H; })
        .sort((p, q) => q.score - p.score);
      const top = ril.slice().sort((p, q) => q.score - p.score).slice(0, 5)
        .map((r) => r.label + " " + r.score.toFixed(2));
      const primo = alCentro[0] || null;
      const nominate = primo ? C.nominaIlTipo(t, perParola.get(primo.label), { fiducia: primo.score }) : [];
      fuori.push({ msTipi, nominate: nominate.length, conNome: nominate.filter((n) => n.nome).length,
        sedute: nominate.filter((n) => n.postura === "seduto").length, nomeIt: nominate[0] && nominate[0].nome,
        nome: t.nome, copie: t.copieN, misura: t.d.map((v) => +v.toFixed(2)), isola,
        pxPerMetro: sc.pixelPerMetro, disegno, sguardo, rilevazioni: ril.length,
        primoAlCentro: primo ? primo.label + " " + primo.score.toFixed(2) : null,
        postura: primo ? postura.get(primo.label) : null, top,
        immagine: tela.toDataURL("image/jpeg", 0.85) });
    }
  }
  return { parole: parole.length, fuori };
}), Math.max(60000, scadenza - Date.now()), "passo B").catch((e) => ({ errore: e.message }));
if (esito.fuori) for (const [i, r] of esito.fuori.entries()) {
  fs.writeFileSync(path.join(CARTELLA, (i + 1) + "_" + (r.isola ? "isolata" : "intera") + ".jpg"),
    Buffer.from(r.immagine.split(",")[1], "base64"));
  delete r.immagine;
  console.log(ora() + "  " + JSON.stringify(r));
}
console.log(ora() + "  ESITO: " + JSON.stringify({ parole: esito.parole, errore: esito.errore || null }));
await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 15000))]).catch(() => {});
process.exit(0);
