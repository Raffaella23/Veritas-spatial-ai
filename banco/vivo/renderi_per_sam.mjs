// Tira fuori dall'app le IMMAGINI VERE che guarda l'occhio (pianta del
// pavimento e scorci di tre quarti) e le salva come PNG, per provarci sopra un
// altro modello (per esempio SAM 3.1) senza doverlo far girare nel browser.
//   node renderi_per_sam.mjs [cartella]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.join(qui, "..", "..");
const CARTELLA = path.resolve(process.argv[2] || path.join(qui, "renderi"));
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
fs.mkdirSync(CARTELLA, { recursive: true });

const ctx = await chromium.launchPersistentContext(path.join(qui, process.env.PROFILO || "profilo"), {
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true, viewport: { width: 1600, height: 900 },
  args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
await ctx.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js", (r) =>
  r.fulfill({ status: 200, path: path.join(WS, "banco", "finti", "supabase_finto.js"), headers: { "content-type": "text/javascript" } }));
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
const p = ctx.pages()[0] || await ctx.newPage();
await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 90000 });
await p.waitForSelector("#v-pick-file", { timeout: 60000 });
const [scelta] = await Promise.all([p.waitForEvent("filechooser", { timeout: 30000 }), p.click("#v-pick-file")]);
await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "renderi per sam").catch(() => {});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).then(() => p.click("#vs-start-btn")).catch(() => {});
await p.waitForFunction(() => !!window.__veritasModelRoot, null, { timeout: 180000 });
await p.waitForTimeout(8000);   // il modello si assesta (scala, appoggio a terra)

const immagini = await p.evaluate(async (quanti) => {
  const V = window.__veritasVista, T = window.THREE, R = window.__veritasRenderer, radice = window.__veritasModelRoot;
  if (!V || !T || !R || !radice) return [{ nome: "errore", perche: "manca " + (!V ? "vista" : !T ? "three" : !R ? "renderer" : "modello") }];
  const inTela = (v) => {
    const l = v.larghezza || (v.inq && v.inq.larghezza), a = v.altezza || (v.inq && v.inq.altezza);
    const c = document.createElement("canvas"); c.width = l; c.height = a;
    const ctx2 = c.getContext("2d");
    const dati = ctx2.createImageData(l, a);
    dati.data.set(v.pixel);
    ctx2.putImageData(dati, 0, 0);
    // fondo bianco sotto: i PNG dell'occhio hanno lo sfondo trasparente
    const sotto = document.createElement("canvas"); sotto.width = l; sotto.height = a;
    const s = sotto.getContext("2d");
    s.fillStyle = "#ffffff"; s.fillRect(0, 0, l, a); s.drawImage(c, 0, 0);
    return sotto.toDataURL("image/png");
  };
  const fuori = [];
  try {
    const pianta = V.piantaDelPavimento(T, R, radice, {});
    if (pianta && pianta.pixel) fuori.push({ nome: "pianta_dall_alto", dataURL: inTela(pianta), larghezza: pianta.larghezza || pianta.inq.larghezza });
  } catch (e) { fuori.push({ nome: "pianta", perche: e.message }); }
  try {
    const scorci = V.scorciTreQuarti(T, R, radice, { numeroScorci: quanti });
    (scorci || []).forEach((v, i) => fuori.push({
      nome: "scorcio_" + (i + 1), dataURL: inTela(v), larghezza: v.larghezza,
      azimuth: Math.round((v.azimuth || 0) * 57.3), pixelPerMetro: v.pixelPerMetro,
    }));
  } catch (e) { fuori.push({ nome: "scorci", perche: e.message }); }
  return fuori;
}, Number(process.env.SCORCI || 3));

for (const im of immagini) {
  if (!im.dataURL) { console.log(im.nome + ": " + (im.perche || "niente")); continue; }
  const f = path.join(CARTELLA, im.nome + ".png");
  fs.writeFileSync(f, Buffer.from(im.dataURL.split(",")[1], "base64"));
  console.log(im.nome + ".png · " + im.larghezza + " px di lato"
    + (im.pixelPerMetro ? " · " + im.pixelPerMetro + " pixel al metro" : "")
    + " · " + (fs.statSync(f).size / 1024).toFixed(0) + " KB");
}
console.log("in " + CARTELLA);
await ctx.close();
