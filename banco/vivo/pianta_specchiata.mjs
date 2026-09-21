// LA PIANTA E' SPECCHIATA?
//
// Raffaella, guardando la pianta del 20/09: «quella e' la vista dal basso».
// Una pianta guardata da sotto e' il RIFLESSO di una guardata da sopra: stessa
// figura, lati invertiti. E' il difetto che `veritas_riconosce.js` (riga 166)
// descrive da mesi come «perfettamente silenzioso: nomi plausibili, tutti
// specchiati» — cioe' ogni nome sul lato sbagliato dell'edificio.
//
// Non si decide guardando: si mette un SEGNO in un angolo noto del mondo e si
// guarda in quale angolo dell'immagine esce. Quattro cubi colorati, uno per
// angolo, e poi si legge di che colore sono i quattro angoli della pianta.
//
//   node pianta_specchiata.mjs
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.join(qui, "..", "..");
const MODELLO = process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb");
const FUORI = path.join(qui, "renderi");
fs.mkdirSync(FUORI, { recursive: true });

const ctx = await chromium.launchPersistentContext(path.join(qui, process.env.PROFILO || "profilo_ws"), {
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true, viewport: { width: 1600, height: 900 },
  args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
await ctx.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js", (r) =>
  r.fulfill({ status: 200, path: path.join(WS, "banco", "finti", "supabase_finto.js"),
              headers: { "content-type": "text/javascript" } }));
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
const p = ctx.pages()[0] || await ctx.newPage();
await p.bringToFront();
await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 120000 });
await p.waitForSelector("#v-pick-file", { timeout: 60000 });
const [scelta] = await Promise.all([p.waitForEvent("filechooser", { timeout: 30000 }), p.click("#v-pick-file")]);
await scelta.setFiles(MODELLO);
await p.fill("#v-new-name", "pianta specchiata").catch(() => {});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).then(() => p.click("#vs-start-btn")).catch(() => {});
await p.waitForFunction(() => !!window.__veritasModelRoot, null, { timeout: 180000 });
await p.waitForTimeout(8000);

const esito = await p.evaluate(async () => {
  const V = window.__veritasVista, T = window.THREE;
  const R = window.__veritasRenderer, radice = window.__veritasModelRoot;
  if (!V || !T || !R || !radice) return { guaio: "manca la scena" };

  const sc = new T.Box3().setFromObject(radice);
  const lato = Math.max(sc.max.x - sc.min.x, sc.max.z - sc.min.z) * 0.06;
  const alto = sc.max.y + lato;     // ben sopra tutto: nella pianta si vedono per forza

  // Quattro segni, uno per angolo del mondo. I nomi dicono dove STANNO nel mondo.
  const SEGNI = [
    { nome: "X minima, Z minima", colore: 0xff0000, x: sc.min.x, z: sc.min.z }, // rosso
    { nome: "X massima, Z minima", colore: 0x00ff00, x: sc.max.x, z: sc.min.z }, // verde
    { nome: "X minima, Z massima", colore: 0x0000ff, x: sc.min.x, z: sc.max.z }, // blu
    { nome: "X massima, Z massima", colore: 0xffff00, x: sc.max.x, z: sc.max.z }, // giallo
  ];
  const messi = [];
  for (const s of SEGNI) {
    const m = new T.Mesh(new T.BoxGeometry(lato, lato, lato),
                         new T.MeshBasicMaterial({ color: s.colore }));
    m.position.set(s.x, alto, s.z);
    radice.add(m); messi.push(m);
  }

  const pianta = V.piantaDelPavimento(T, R, radice, { tutto: true });
  for (const m of messi) { radice.remove(m); m.geometry.dispose(); m.material.dispose(); }
  if (!pianta) return { guaio: "niente pianta" };

  // Di che colore sono i quattro angoli dell'immagine?
  const L = pianta.larghezza, A = pianta.altezza, px = pianta.pixel;
  const leggi = (fx, fy) => {
    // media di una finestrella, per non cadere su un pixel di bordo
    let r = 0, g = 0, b = 0, n = 0;
    const cx = Math.round(fx * (L - 1)), cy = Math.round(fy * (A - 1));
    for (let y = Math.max(0, cy - 12); y <= Math.min(A - 1, cy + 12); y++)
      for (let x = Math.max(0, cx - 12); x <= Math.min(L - 1, cx + 12); x++) {
        const i = (y * L + x) * 4;
        if (px[i + 3] < 8) continue;
        r += px[i]; g += px[i + 1]; b += px[i + 2]; n++;
      }
    if (!n) return "vuoto";
    r /= n; g /= n; b /= n;
    if (r > 120 && g < 90 && b < 90) return "ROSSO";
    if (g > 120 && r < 90 && b < 90) return "VERDE";
    if (b > 120 && r < 90 && g < 90) return "BLU";
    if (r > 120 && g > 120 && b < 90) return "GIALLO";
    return "altro(" + Math.round(r) + "," + Math.round(g) + "," + Math.round(b) + ")";
  };

  return {
    mondo: { x: [+sc.min.x.toFixed(1), +sc.max.x.toFixed(1)],
             z: [+sc.min.z.toFixed(1), +sc.max.z.toFixed(1)] },
    immagine: { larghezza: L, altezza: A, origine: pianta.origine,
                metriPerPixel: pianta.metriPerPixel },
    // dove DOVREBBERO uscire, secondo la piattaforma stessa
    secondoLaPiattaforma: SEGNI.map((s) => ({
      nome: s.nome, pixel: V.mondoAPixel ? V.mondoAPixel(pianta, s.x, s.z) : "mondoAPixel assente" })),
    // dove ESCONO davvero
    angoliDellImmagine: {
      "alto a sinistra": leggi(0.02, 0.02),
      "alto a destra": leggi(0.98, 0.02),
      "basso a sinistra": leggi(0.02, 0.98),
      "basso a destra": leggi(0.98, 0.98),
    },
  };
});

console.log(JSON.stringify(esito, null, 1));
fs.writeFileSync(path.join(FUORI, "pianta_specchiata.json"), JSON.stringify(esito, null, 1));
await ctx.close();
