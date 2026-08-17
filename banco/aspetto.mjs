// Guarda com'e' fatta la piattaforma, fase per fase.
//
//     node banco/aspetto.mjs
//
// Non misura il cervello: fotografa l'aspetto. Una corsa sola, molte
// schermate, alle larghezze che contano davvero (1920, 1440, 1280, 1100).

import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const fuori = path.join(qui, "aspetto");
const URL_BANCO = "http://127.0.0.1:8899/index.html";

const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
});
const pagina = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errori = [];
pagina.on("pageerror", (e) => errori.push(e.message));

// Con il modello caricato il ciclo di rendering non si ferma mai e
// page.screenshot() aspetta un fotogramma stabile che non arriva: va in
// timeout. CDP scatta e basta, senza aspettare nulla.
const cdp = await pagina.context().newCDPSession(pagina);
async function scatta(nome) {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(fuori, nome + ".png"), Buffer.from(data, "base64"));
  console.log("   scattata  " + nome);
}

console.log("\n1. ingresso");
await pagina.goto(URL_BANCO, { waitUntil: "load", timeout: 60000 });
await pagina.waitForTimeout(6000);
await scatta("1-ingresso");

console.log("\n2. progetti");
await pagina.fill("#v-new-name", "Terminal T3 — prova cliente");
await pagina.selectOption("#v-new-type", { index: 0 }).catch(() => {});
await scatta("2-progetti");
await pagina.click("#v-create-btn");
await pagina.waitForTimeout(7000);
await scatta("3-impostazioni");

console.log("\n3. la scena");
await pagina.click("#vs-start-btn").catch(() => console.log("   (vs-start-btn assente)"));
await pagina.waitForTimeout(12000);
await scatta("4-scena-vuota");

console.log("\n4. il modello");
await pagina.setInputFiles("#vaio-upload-input", path.join(qui, "airport_foot_traffic.glb"));
await pagina.waitForTimeout(30000);
await scatta("5-modello-caricato");

console.log("\n5. un'analisi in chat");
const console_sel = "#vaio-console-input, #vaio-cmd, input[placeholder*='omand'], textarea[placeholder*='omand']";
const campo = await pagina.$(console_sel);
if (campo) {
  await campo.fill("visibilita");
  await campo.press("Enter");
  await pagina.waitForTimeout(15000);
  await scatta("6-analisi");
} else {
  console.log("   PROBLEMA: campo comandi non trovato con " + console_sel);
  const inputs = await pagina.evaluate(() =>
    [...document.querySelectorAll("input,textarea")].map((e) => `${e.tagName}#${e.id}.${e.className}|${e.placeholder || ""}`).slice(0, 30)
  );
  console.log(inputs.join("\n   "));
}

console.log("\n6. le larghezze");
for (const w of [1440, 1280, 1100]) {
  await pagina.setViewportSize({ width: w, height: 900 });
  await pagina.waitForTimeout(2500);
  await scatta("7-larghezza-" + w);
}

console.log("\nerrori: " + (errori.length ? [...new Set(errori)].slice(0, 6).join(" | ") : "nessuno"));
await browser.close();
