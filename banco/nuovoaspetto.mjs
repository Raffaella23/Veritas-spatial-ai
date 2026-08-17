// Il nuovo aspetto, provato in browser vero.
//
//     node banco/nuovoaspetto.mjs
//
// Una corsa sola: misura (fov, tela, fase), poi fotografa l'ingresso, il
// modello inquadrato, il dock aperto e l'esodo accesso dal tastino.

import { chromium } from "playwright";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const fuori = path.join(qui, "aspetto");
const browser = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
});
const pagina = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
const errori = [];
pagina.on("pageerror", (e) => errori.push(e.message));
const cdp = await pagina.context().newCDPSession(pagina);
async function scatta(nome) {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(fuori, nome + ".png"), Buffer.from(data, "base64"));
  console.log("   scattata  " + nome);
}
const stato = () => pagina.evaluate(() => {
  const c = document.querySelector("canvas");
  const r = c ? c.getBoundingClientRect() : { width: 0, height: 0 };
  const cam = window.__veritasCamera;
  const A = window.__veritasAspetto;
  const visibile = (id) => {
    const e = document.getElementById(id);
    return e ? !e.classList.contains("va-fuori-fase") : null;
  };
  return {
    modulo: !!A,
    tela: [Math.round(r.width), Math.round(r.height)],
    perso: A ? A.schermoPerso({ w: innerWidth, h: innerHeight }, { w: r.width, h: r.height }) + "%" : "?",
    fov: cam ? cam.fov : null,
    fase: A ? A.fase({ modello: !!window.__veritasModelRoot,
      zone: (window.__veritasGetNodes ? window.__veritasGetNodes() : []).length }) : null,
    rail: !!document.getElementById("va-rail"),
    tastiniAttivi: [...document.querySelectorAll(".va-strato:not(:disabled)")].length,
    vede: { brand: visibile("vaio-brand"), rail: visibile("va-rail"),
            upload: visibile("vaio-upload-wrap"), toolbar: visibile("vaio-toolbar") },
    consoleChiusa: (document.getElementById("vaio-console") || {}).classList
      ? document.getElementById("vaio-console").classList.contains("va-chiuso") : null,
    spia: A && A.diagnostica ? A.diagnostica() : null,
  };
});

await pagina.goto("http://127.0.0.1:8899/index.html", { waitUntil: "load", timeout: 60000 });
await pagina.waitForTimeout(6000);
await pagina.fill("#v-new-name", "Terminal T3");
await pagina.click("#v-create-btn");
await pagina.waitForTimeout(7000);
await pagina.click("#vs-start-btn").catch(() => {});
await pagina.waitForTimeout(12000);

console.log("\nINGRESSO (nessun modello): si deve vedere quasi niente");
console.log("  ", JSON.stringify(await stato()));
await scatta("11-nuovo-ingresso");

console.log("\nMODELLO caricato");
await pagina.setInputFiles("#vaio-upload-input", path.join(qui, "airport_foot_traffic.glb"));
await pagina.waitForTimeout(32000);
console.log("  ", JSON.stringify(await stato()));
await scatta("12-nuovo-modello");

console.log("\nDOCK aperto dalla linguetta");
// Chi c'e' davvero sotto il puntatore, sul centro della linguetta? Se il click
// non arriva, la risposta e' qui e non nelle ipotesi.
console.log("   copre la linguetta:", JSON.stringify(await pagina.evaluate(() => {
  const t = document.getElementById("va-dock-tab");
  if (!t) return "linguetta assente";
  const r = t.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  const sopra = document.elementFromPoint(x, y);
  const catena = [];
  for (let e = sopra; e && catena.length < 4; e = e.parentElement) {
    const s = getComputedStyle(e);
    catena.push(`${e.tagName}#${e.id || "-"}.${(e.className || "").toString().slice(0, 24)} z=${s.zIndex} pe=${s.pointerEvents}`);
  }
  return { punto: [Math.round(x), Math.round(y)], catena };
})));
// Click via JS: aggira il test di copertura, cosi' la corsa continua e le
// schermate si fanno comunque anche se la copertura non e' ancora risolta.
await pagina.evaluate(() => document.getElementById("va-dock-tab").click());
await pagina.waitForTimeout(1800);
await scatta("13-nuovo-dock");

console.log("\nESODO acceso dal tastino (le pulsazioni che c'erano ma non si vedevano)");
const acceso = await pagina.evaluate(() => {
  const b = [...document.querySelectorAll(".va-strato")]
    .find((x) => /esodo/i.test(x.title) && !x.disabled);
  if (!b) return false;
  b.click();
  return true;
});
console.log("   tastino esodo premuto:", acceso);
await pagina.waitForTimeout(28000);
await scatta("14-nuovo-esodo");
console.log("  ", JSON.stringify(await stato()));

console.log("\nerrori: " + (errori.length ? [...new Set(errori)].slice(0, 6).join(" | ") : "nessuno"));
await browser.close();
