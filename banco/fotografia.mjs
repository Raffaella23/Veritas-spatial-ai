// La fotografia del difetto:  node banco/fotografia.mjs
//
// Serve a mettere un'IMMAGINE dentro la documentazione. Raffaella, 18/08:
// «per voi questo concetto non è facile da comprendere, magari se ci metti
// anche quell'immagine aiuti la nuova chat».
//
// Ha ragione: "le tappe devono stare sopra la cosa che le definisce" si
// capisce in un colpo guardando, e male leggendo. Questa prova carica il
// modello vero nel browser vero, mette la telecamera a piombo sul terminal e
// salva la scena — con i cartellini dove il programma li mette OGGI.
//
// L'immagine finisce in `documentazione/` ed è rifacibile da chiunque: non è
// uno screenshot preso a mano che invecchia senza che nessuno se ne accorga.
import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const fuori = path.join(qui, "..", "documentazione");
fs.mkdirSync(fuori, { recursive: true });

const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
});
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
await p.goto("http://127.0.0.1:8899/index.html", { waitUntil: "load", timeout: 60000 });
await p.waitForTimeout(6000);
await p.fill("#v-new-name", "fotografia");
await p.click("#v-create-btn");
await p.waitForTimeout(6000);
await p.click("#vs-start-btn").catch(() => {});
await p.waitForTimeout(8000);
await p.setInputFiles("#vaio-upload-input", path.join(qui, "airport_foot_traffic.glb"));
await p.waitForTimeout(50000);

// ⚠️ NON si fotografa lo schermo. Provato: la telecamera del bundle si
//    riprende il controllo un fotogramma dopo (fa un lerp verso un bersaglio
//    suo a ogni giro), e per giunta i pannelli coprono mezza scena. Il
//    risultato era un'inquadratura di un'ala d'aereo con sopra una finestra
//    di dialogo — inutile per spiegare qualcosa.
//
// Si disegna invece LA PIANTA, con lo stesso pezzo che usano gli occhi
// (`piantaDelPavimento` + `immagineConZone`): vista a piombo, niente pannelli,
// niente prospettiva, e i cartellini esattamente dove il programma li mette.
// E' anche una verifica in più: se questa immagine viene bene, vuol dire che
// quello che gli occhi mandano al modello è leggibile.
const info = await p.evaluate(() => {
  const V = window.__veritasVista, O = window.__veritasOcchi;
  const nodi = window.__veritasGetNodes ? window.__veritasGetNodes() : [];
  if (!V || !O || !nodi.length) return { errore: "manca vista, occhi o nodi" };

  const pianta = V.piantaDelPavimento(window.THREE, window.__veritasRenderer,
    window.__veritasModelRoot, { metriPerPixel: 0.06, latoMax: 2048 });
  if (!pianta) return { errore: "la pianta non si e potuta disegnare" };

  const img = O.immagineConZone(document, pianta, nodi, V.mondoAPixel, { latoMax: 1500 });
  if (!img) return { errore: "l immagine non si e potuta preparare" };

  return {
    dataURL: img.dataURL,
    misura: img.larghezza + "x" + img.altezza + " pixel, "
          + pianta.metriPerPixel.toFixed(3) + " m per pixel",
    tappe: nodi.map((n) => ({
      nome: n.label, tipo: n.type, origine: n.origine,
      pos: n.pos.map((v) => +v.toFixed(1)),
    })),
  };
});

if (info.errore) { console.error("NIENTE FOTOGRAFIA:", info.errore); await b.close(); process.exit(1); }
const file = path.join(fuori, "tappe-in-fila-indiana.png");
fs.writeFileSync(file, Buffer.from(info.dataURL.split(",")[1], "base64"));
console.log("salvata:", file, "—", info.misura);
if (info) {
  console.log("centro delle tappe:", JSON.stringify(info.centro), " larghezza:", info.largo, "m");
  console.log("\nle tappe come le mette il programma OGGI:");
  for (const t of info.tappe)
    console.log("   " + String(t.nome).padEnd(24) + String(t.tipo).padEnd(10)
      + JSON.stringify(t.pos).padEnd(24) + (t.origine || "?"));
  // Se sono in fila, le distanze fra tappe consecutive sono quasi uguali:
  // e' la firma numerica del difetto, e vale la pena stamparla accanto alla
  // fotografia — cosi' si vede che non e' un'impressione.
  const d = [];
  for (let i = 1; i < info.tappe.length; i++)
    d.push(Math.hypot(info.tappe[i].pos[0] - info.tappe[i - 1].pos[0],
                      info.tappe[i].pos[2] - info.tappe[i - 1].pos[2]));
  if (d.length) {
    const m = d.reduce((a, c) => a + c, 0) / d.length;
    const sc = Math.sqrt(d.reduce((a, c) => a + (c - m) ** 2, 0) / d.length);
    console.log("\ndistanze fra tappe consecutive: "
      + d.map((v) => v.toFixed(1)).join(" | ") + " m");
    console.log("media " + m.toFixed(1) + " m, scarto " + sc.toFixed(2)
      + " m  -> " + (sc / m < 0.15 ? "SONO IN FILA A PASSO COSTANTE (il difetto)"
                                   : "non sono equidistanti"));
  }
}
await b.close();
