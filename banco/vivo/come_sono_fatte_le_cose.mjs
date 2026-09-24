// COME SONO FATTE LE COSE NEL MODELLO (§6.14, 24/09 sera): una freccia, un
// tavolo, una panca — quanti pezzi, e chi e' il loro genitore. Serve a sapere
// che cos'e' «la cosa intera» da togliere o lasciare, invece del suo pezzo.
//   node banco/vivo/come_sono_fatte_le_cose.mjs
// LIMITI: 3 minuti per il modello.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.join(qui, "..", "..");
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
const ctx = await chromium.launchPersistentContext(path.join(qui, "profilo_cose"), {
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true, viewport: { width: 1600, height: 900 },
  args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
await ctx.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js", (r) =>
  r.fulfill({ status: 200, path: path.join(WS, "banco", "finti", "supabase_finto.js"),
              headers: { "content-type": "text/javascript" } }));
const p = ctx.pages()[0] || await ctx.newPage();
await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 90000 });
await p.waitForSelector("#v-pick-file", { timeout: 60000 }).catch(() => {});
const [scelta] = await Promise.all([p.waitForEvent("filechooser", { timeout: 30000 }), p.click("#v-pick-file")]).catch(() => [null]);
if (scelta) await scelta.setFiles(path.join(WS, "airport_foot_traffic.glb"));
await p.fill("#v-new-name", "come sono fatte").catch(() => {});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).then(() => p.click("#vs-start-btn")).catch(() => {});
await p.waitForFunction(() => !!window.__veritasModelRoot, null, { timeout: 180000 }).catch(() => {});
const r = await p.evaluate(() => {
  const R = window.__veritasModelRoot, T = window.THREE;
  const cat = (o) => { const c = []; let q = o; while (q && q !== R && c.length < 6) {
    c.push(q.name + "[" + (q.isMesh ? "mesh" : q.type) + ", " + q.children.length + " figli]"); q = q.parent; } return c.join(" <- "); };
  return ["arrow005_0", "arrow027_0", "Cube059_2", "Cube055_3", "Cube040_2", "Cube146_0"].map((n) => {
    const o = R.getObjectByName(n); if (!o) return n + ": non trovato";
    const par = o.parent;
    const fr = par ? par.children.map((c) => c.name + (c.isMesh ? "" : "(" + c.type + ")")).slice(0, 8).join(", ") : "";
    return n + "\n    catena: " + cat(o) + "\n    fratelli: " + fr;
  });
});
for (const x of r) console.log(x);
await Promise.race([ctx.close(), new Promise((res) => setTimeout(res, 15000))]).catch(() => {});
process.exit(0);
