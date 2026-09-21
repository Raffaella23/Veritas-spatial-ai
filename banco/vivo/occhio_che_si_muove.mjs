// L'OCCHIO CHE SI MUOVE: quanto serve avvicinarsi, misurato.
//
// ⚠️ PERCHE' QUESTA PROVA ESISTE. Il 20/09 avevo misurato l'occhio su UNA SOLA
//    vista — la veduta larga di `scorciTreQuarti` — e concluso che «l'occhio sta
//    troppo lontano». Era vero di quella vista e falso del giro vero: il giro
//    monta anche `scorciRavvicinati` (telecamera al pavimento del gruppo + 1,10 m),
//    `passataInOrdine` e `giroDentro`, tutte gia' collegate in
//    `veritas_montaggio.js`. Misurare una vista sola e parlare dell'occhio e'
//    come giudicare un edificio da una foto della facciata.
//
// Qui si montano LE STESSE viste del giro vero e si fa guardare l'occhio a
// ognuna, separando i risultati per tipo di vista. La domanda a cui risponde e'
// una sola: avvicinarsi fa trovare le cose di DENTRO — sedute, banconi, metal
// detector, transenne — che da lontano non si vedono?
//
//   node occhio_che_si_muove.mjs
//
// Manopole: MODELLO, DAL_WORKSPACE=1, PROFILO, VICINI, PASSATA, DENTRO
//           (quante viste per tipo, per tenere il conto del tempo).
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.join(qui, "..", "..");
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const DAL_WS = process.env.DAL_WORKSPACE === "1";
const QUANTI = { vicini: Number(process.env.VICINI || 4),
                 passata: Number(process.env.PASSATA || 4),
                 dentro: Number(process.env.DENTRO || 3) };

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
await p.fill("#v-new-name", "occhio che si muove").catch(() => {});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).then(() => p.click("#vs-start-btn")).catch(() => {});
await p.waitForFunction(() => !!window.__veritasModelRoot, null, { timeout: 180000 });
// i mucchi di cose servono a scorciRavvicinati: si aspetta che siano misurati
await p.waitForFunction(() => {
  const t = window.__veritasCoseTrovate;
  return !!(t && t.posti && t.posti.length);
}, null, { timeout: 240000 }).catch(() => console.log("⚠️ i mucchi non sono arrivati: scorciRavvicinati restera' vuoto"));
await p.waitForTimeout(6000);

const esito = await p.evaluate(async (quanti) => {
  const R = window.__veritasRiconosce, V = window.__veritasVista;
  const T = window.THREE, Rend = window.__veritasRenderer, radice = window.__veritasModelRoot;
  if (!R || !V || !T || !Rend || !radice) return { guaio: "manca la scena" };

  const trovate = window.__veritasCoseTrovate || { posti: [] };
  const ambienti = ((window.__veritasPercezione || {}).zones) || [];

  // LE STESSE VISTE DEL GIRO VERO (veritas_montaggio.js, righe 654-770).
  const gruppi = [];
  const prendi = (nome, f, taglia) => {
    try {
      let v = f() || [];
      if (taglia) v = v.slice(0, taglia);
      gruppi.push({ nome, viste: v });
    } catch (e) { gruppi.push({ nome, viste: [], guaio: e.message }); }
  };
  // ⚠️ IL CONFRONTO DEL 21/09: le stesse identiche viste, SENZA luce (come
  //    oggi) e CON luce. Un solo cambiamento per volta, cosi' la differenza
  //    non si puo' attribuire ad altro.
  for (const luce of [false, true]) {
    const q = (o) => Object.assign({}, o, { conLuce: luce });
    const et = luce ? " [CON LUCE]" : " [senza luce, come oggi]";
    prendi("ravvicinate ai gruppi" + et,
      () => V.scorciRavvicinati(T, Rend, radice, trovate.posti, q({})), quanti.vicini);
    prendi("da dentro gli ambienti" + et,
      () => V.giroDentro(T, Rend, radice, ambienti, q({})), quanti.dentro);
  }

  const rileva = await R.occhioLocale({ attesaAccensione: 420000, attesaSguardo: 600000 });
  const st = R.stato();
  if (!rileva) return { guaio: "l'occhio non si e' acceso: " + st.perche, stato: st };
  const parole = R.vocabolarioPer(window.__veritasProjectType || null, []).map((v) => v.chiedi);

  // Le parole che raccontano il DENTRO di un edificio: sono quelle che ci
  // interessano. Se compaiono solo aerei e pontili, avvicinarsi non e' servito.
  const DENTRO = /seat|bench|chair|sofa|counter|desk|table|metal detector|security|checkpoint|turnstile|baggage|check-in|conveyor|escalator|stair|door|wall|column|screen|kiosk|shop|trash|plant|waiting|barrier|railing|sign/i;

  const inTela = (v) => {
    const c = document.createElement("canvas"); c.width = v.larghezza; c.height = v.altezza;
    const g = c.getContext("2d");
    const d = g.createImageData(v.larghezza, v.altezza); d.data.set(v.pixel); g.putImageData(d, 0, 0);
    return c;
  };

  const fuori = [];
  for (const gr of gruppi) {
    const righe = [];
    for (let i = 0; i < gr.viste.length; i++) {
      const v = gr.viste[i];
      if (!v || !v.pixel) continue;
      let out = null, guaio = null;
      const t0 = performance.now();
      try { out = await rileva(inTela(v), parole); } catch (e) { guaio = String(e && e.message || e); }
      const secondi = +((performance.now() - t0) / 1000).toFixed(1);
      if (!out) { righe.push({ guaio, secondi }); continue; }
      const forti = out.filter((o) => o.score >= 0.25);
      const diDentro = forti.filter((o) => DENTRO.test(o.label));
      const conta = new Map();
      for (const o of forti) conta.set(o.label, (conta.get(o.label) || 0) + 1);
      righe.push({
        secondi, pixelPerMetro: v.pixelPerMetro || null,
        lato: v.larghezza + "x" + v.altezza,
        trovate: out.length, sopra25: forti.length,
        diDentro: diDentro.length,
        migliore: out.length ? +(Math.max(...out.map((o) => o.score))).toFixed(2) : 0,
        parole: [...conta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => k + " x" + n),
        paroleDiDentro: [...new Set(diDentro.map((o) => o.label))].slice(0, 10),
      });
    }
    fuori.push({ nome: gr.nome, quante: gr.viste.length, guaio: gr.guaio || null, righe });
  }
  return { stato: st, parole: parole.length, mucchi: (trovate.posti || []).length,
           ambienti: ambienti.length, gruppi: fuori };
}, QUANTI);

if (esito.guaio) { console.log("GUAIO: " + esito.guaio); }
else {
  console.log("l'occhio guarda da: " + (esito.stato.dove || "(non dichiarato)")
    + " · " + esito.parole + " parole · " + esito.mucchi + " mucchi misurati · "
    + esito.ambienti + " ambienti");
  console.log("");
  for (const g of esito.gruppi) {
    console.log("### " + g.nome + (g.guaio ? "   GUAIO: " + g.guaio : ""));
    if (!g.righe.length) { console.log("    (nessuna vista)"); console.log(""); continue; }
    for (const r of g.righe) {
      if (r.guaio) { console.log("    GUAIO " + r.guaio); continue; }
      console.log("    " + String(r.pixelPerMetro).padStart(6) + " px/m · " + r.lato
        + " · " + r.secondi + " s · " + r.sopra25 + " sopra 25% · "
        + r.diDentro + " DI DENTRO · migliore " + Math.round(r.migliore * 100) + "%");
      console.log("           " + (r.parole.length ? r.parole.join(", ") : "niente"));
      if (r.paroleDiDentro.length) console.log("           dentro -> " + r.paroleDiDentro.join(", "));
    }
    console.log("");
  }
}
fs.writeFileSync(path.join(qui, "occhio_che_si_muove.json"),
  JSON.stringify({ costruzione, quando: new Date().toISOString(), ...esito }, null, 1));
console.log("scritto in occhio_che_si_muove.json");
await ctx.close();
