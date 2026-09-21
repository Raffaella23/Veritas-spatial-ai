// LA FISICA C'E' O NON C'E': si guarda, non si spera.
//
// ⚠️ PERCHE' ESISTE. Raffaella, 21/09: *«nella simulazione le zone sono a caso e
//    gli agenti non usano la fisica, spero un bug temporaneo»*. Il codice ha un
//    ripiego DICHIARATO: se il mondo fisico non c'e', `filtraTraiettoria`
//    restituisce la traiettoria pianificata INTATTA e lo scrive in console
//    (`veritas_corpo.js`, «senza corpo fisico il programma si comporta come
//    ieri, e lo dice»). Quindi \u00abgli agenti non usano la fisica\u00bb e' uno stato
//    possibile e previsto: qui si misura se sta scattando davvero, invece di
//    chiedere a Raffaella di aprire la console.
//
//      DAL_WORKSPACE=1 node fisica_in_scena.mjs
//
// ⚠️ LIMITI ESPLICITI: 10 minuti in tutto, 3 per il modello in scena, 4 per le
//    traiettorie. Scaduto il tempo si dice che e' scaduto.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.join(qui, "..", "..");
const DAL_WS = process.env.DAL_WORKSPACE === "1";
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
const TETTO_MS = 10 * 60 * 1000;

const t0 = Date.now();
const secondi = () => ((Date.now() - t0) / 1000).toFixed(0) + "s";
const righe = [];
const scrivi = (r) => { righe.push(r); console.log(r);
  fs.appendFileSync(path.join(qui, "fisica.txt"), r + "\n"); };
fs.writeFileSync(path.join(qui, "fisica.txt"), "");

const ctx = await chromium.launchPersistentContext(
  path.join(qui, process.env.PROFILO || "profilo_fisica"), {
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
p.on("console", (m) => {
  const t = m.text();
  if (/corpo|fisic|rapier|traiettor|motore|zone|tappe/i.test(t))
    scrivi(secondi() + " \u00b7 " + t.replace(/\s+/g, " ").slice(0, 260));
});
p.on("pageerror", (e) => scrivi(secondi() + " PAGEERROR " + e.message));

await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 90000 });
scrivi(secondi() + " costruzione: " + await p.evaluate(() => window.__EIDETICA_COSTRUZIONE));

await p.waitForSelector("#v-pick-file", { timeout: 60000 }).catch(() => {});
const [scelta] = await Promise.all([
  p.waitForEvent("filechooser", { timeout: 30000 }),
  p.click("#v-pick-file"),
]).catch(() => [null]);
if (scelta) await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "prova fisica").catch(() => {});
await p.evaluate(() => {
  const b = [...document.querySelectorAll("button,label,div,span")]
    .find((x) => x.offsetParent !== null && /^(Airport|Aeroporto)$/.test((x.textContent || "").trim()));
  if (b) b.click();
});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 })
  .then(() => p.click("#vs-start-btn")).catch(() => {});
scrivi(secondi() + " progetto aperto");

await p.waitForFunction(() => !!window.__veritasModelRoot, null, { timeout: 3 * 60 * 1000 })
  .catch(() => scrivi(secondi() + " \u2716 modello non in scena entro il tetto"));

// Si aspetta che il mondo fisico esista (o che si dichiari assente) e che una
// traiettoria sia passata dal filtro almeno una volta.
const fino = Date.now() + 4 * 60 * 1000;
let visto = null;
while (Date.now() < fino && Date.now() - t0 < TETTO_MS) {
  visto = await p.evaluate(() => {
    const C = window.__veritasCorpo;
    return {
      modulo: !!C,
      // NON si stampa lo stato grezzo: dentro c'e' il mondo di Rapier, che e'
      // un anello e fa morire JSON.stringify. Si tengono solo i numeri.
      stato: (() => {
        try {
          const st = C && typeof C.stato === "function" ? C.stato() : null;
          if (!st) return null;
          const fuori = {};
          for (const k of Object.keys(st)) {
            const v = st[k];
            fuori[k] = (v == null || typeof v !== "object") ? v : "(" + typeof v + ")";
          }
          return fuori;
        } catch (e) { return { errore: String((e && e.message) || e) }; }
      })(),
      esito: C && typeof C.ultimoEsito === "function" ? C.ultimoEsito() : null,
      esitoSalvato: window.__veritasCorpoEsito || null,
      agenti: Array.isArray(window.__veritasAgents) ? window.__veritasAgents.length : null,
      tappe: window.__veritasGetNodes ? (window.__veritasGetNodes() || []).length : null,
    };
  }).catch(() => null);
  if (visto && (visto.esito || visto.esitoSalvato)) break;
  await p.waitForTimeout(6000);
}

scrivi("");
scrivi("=== LA FISICA ===");
if (!visto || !visto.modulo) scrivi("  \u2716 il modulo del corpo non c'e' proprio in pagina");
else {
  scrivi("  mondo fisico: " + JSON.stringify(visto.stato));
  const e = visto.esito || visto.esitoSalvato;
  if (!e) scrivi("  \u26a0\ufe0f nessuna traiettoria e' ancora passata dal filtro entro il tetto:"
    + " non si puo' dire ne' si ne' no");
  else if (e.ok === false) scrivi("  \u2716 LA FISICA NON E' STATA APPLICATA \u2014 motivo: " + (e.perche || "non detto"));
  else scrivi("  \u2714 la fisica E' stata applicata: " + Object.keys(e).map((k) => k + "=" + (typeof e[k] === "object" ? "(oggetto)" : e[k])).join(" / ").slice(0, 400));
  scrivi("  tappe: " + visto.tappe + " \u00b7 agenti: " + visto.agenti);
}
scrivi("durata " + secondi() + (Date.now() - t0 >= TETTO_MS ? "  (TETTO RAGGIUNTO)" : ""));
await ctx.close();
