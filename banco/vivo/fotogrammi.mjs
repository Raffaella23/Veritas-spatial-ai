// Estrae fotogrammi dal video del difetto (nessun ffmpeg sul sistema): Chrome
// senza finestra apre il file, si sposta a intervalli e fotografa il video.
//   node fotogrammi.mjs <video.mp4> <cartella> [passo_s]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [video, cartella, passoArg] = process.argv.slice(2);
const passo = Number(passoArg || 2);
fs.mkdirSync(cartella, { recursive: true });
const pagina = path.join(cartella, "_video.html");
fs.writeFileSync(pagina, `<!doctype html><body style="margin:0;background:#000"><video id="v" src="${pathToFileURL(video).href}" muted preload="auto" style="display:block;width:1280px"></video></body>`);

const browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true, args: ["--allow-file-access-from-files"] });
const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto(pathToFileURL(pagina).href);
const info = await p.evaluate(() => new Promise((ok, ko) => {
  const v = document.getElementById("v");
  if (v.readyState >= 1) return ok({ durata: v.duration, w: v.videoWidth, h: v.videoHeight });
  v.onloadedmetadata = () => ok({ durata: v.duration, w: v.videoWidth, h: v.videoHeight });
  v.onerror = () => ko(new Error("video non leggibile: " + (v.error && v.error.code)));
}));
console.log(JSON.stringify(info));
const h = Math.round(1280 * info.h / info.w);
await p.setViewportSize({ width: 1280, height: h });
let n = 0;
for (let t = 0.2; t < info.durata; t += passo) {
  await p.evaluate((t) => new Promise((ok) => { const v = document.getElementById("v"); v.onseeked = () => ok(); v.currentTime = t; }), t);
  const nome = path.join(cartella, "f" + String(n++).padStart(3, "0") + "_" + t.toFixed(1) + "s.jpg");
  await p.screenshot({ path: nome, type: "jpeg", quality: 70 });
}
console.log("fotogrammi: " + n);
await browser.close();
