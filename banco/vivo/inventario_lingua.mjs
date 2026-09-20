// Inventario delle scritte visibili, in una lingua data, nelle tre schermate:
// elenco progetti, pagina di attesa, piattaforma. Serve a trovare le scritte
// rimaste nell'altra lingua.   LINGUA=en node inventario_lingua.mjs
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const WS = path.join(qui, "..", "ws");
const LINGUA = process.env.LINGUA || "en";
const USCITA = path.join(qui, "inventario_" + LINGUA + ".json");
const ctx = await chromium.launchPersistentContext(path.join(qui, process.env.PROFILO || "profilo"), {
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true, viewport: { width: 1600, height: 900 },
  args: ["--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
await ctx.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js", (r) =>
  r.fulfill({ status: 200, path: path.join(WS, "banco", "finti", "supabase_finto.js"), headers: { "content-type": "text/javascript" } }));
const TIPI = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".css": "text/css", ".glb": "model/gltf-binary", ".webp": "image/webp" };
const BASE = "https://raffaella23.github.io/Veritas-spatial-ai/";
if (process.env.DAL_WORKSPACE !== "0") {
  await ctx.route((url) => url.href.startsWith(BASE), (r) => {
    const u = new URL(r.request().url());
    const rel = decodeURIComponent(u.pathname.slice("/Veritas-spatial-ai/".length)) || "index.html";
    const f = path.join(WS, rel);
    if (f.startsWith(WS) && fs.existsSync(f) && fs.statSync(f).isFile())
      return r.fulfill({ status: 200, path: f, headers: { "content-type": TIPI[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" } });
    return r.continue();
  });
}
const p = ctx.pages()[0] || await ctx.newPage();
await p.addInitScript((l) => { try { localStorage.setItem("veritasLang", l); } catch (e) {} }, LINGUA);

function raccogli() {
  const out = new Map();
  const visibile = (el) => {
    if (!el || !el.getClientRects || !el.getClientRects().length) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none" && Number(s.opacity) > 0.05;
  };
  const cammina = (radice) => {
    const w = document.createTreeWalker(radice, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      const t = (n.nodeValue || "").replace(/\s+/g, " ").trim();
      if (t.length < 2 || !/[A-Za-zÀ-ÿ]/.test(t)) continue;
      const el = n.parentElement;
      if (!el || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName) || !visibile(el)) continue;
      const k = t.slice(0, 160);
      if (!out.has(k)) out.set(k, (el.tagName + "." + String(el.className || "").slice(0, 40)).trim());
    }
    radice.querySelectorAll("*").forEach((e) => { if (e.shadowRoot) cammina(e.shadowRoot); });
  };
  cammina(document.body);
  // anche i testi dei pulsanti e dei campi che non sono nodi di testo
  document.querySelectorAll("[placeholder],[title],[aria-label]").forEach((e) => {
    if (!visibile(e)) return;
    for (const a of ["placeholder", "title", "aria-label"]) {
      const v = e.getAttribute(a);
      if (v && v.length > 1 && !out.has("@" + v)) out.set("@" + v.slice(0, 160), e.tagName + "[" + a + "]");
    }
  });
  return [...out.entries()];
}

const esito = {};
await p.goto(BASE + "?cb=" + Date.now(), { waitUntil: "load", timeout: 90000 });
await p.waitForSelector("#v-pick-file", { timeout: 60000 });
await p.waitForTimeout(1500);
esito.elenco = await p.evaluate(raccogli);
const [scelta] = await Promise.all([p.waitForEvent("filechooser", { timeout: 30000 }), p.click("#v-pick-file")]);
await scelta.setFiles(process.env.MODELLO || path.join(WS, "airport_foot_traffic.glb"));
await p.waitForTimeout(800);
esito.nuovo = await p.evaluate(raccogli);
await p.fill("#v-new-name", "inventario").catch(() => {});
await p.click("#v-create-btn").catch(() => {});
await p.waitForSelector("#vs-start-btn", { timeout: 60000 }).catch(() => {});
esito.impostazioni = await p.evaluate(raccogli);
await p.click("#vs-start-btn").catch(() => {});
await p.waitForFunction(() => !!window.__veritasModelRoot, null, { timeout: 180000 });
await p.waitForTimeout(Number(process.env.ATTESA || 30000));
esito.attesa = await p.evaluate(raccogli);
await p.evaluate(() => window.__veritasApertura && window.__veritasApertura.chiudi("inventario"));
await p.waitForTimeout(4000);
esito.piattaforma = await p.evaluate(raccogli);
esito.daTradurre = await p.evaluate(() => (window.__veritasLingua ? window.__veritasLingua.daTradurre() : ["strato assente"]).map((t) => [t, "daTradurre"]));
esito.statoLingua = [[await p.evaluate(() => JSON.stringify(window.__veritasLingua && window.__veritasLingua.stato())), "stato"]];
await p.screenshot({ path: path.join(qui, "inventario_" + LINGUA + ".jpg"), type: "jpeg", quality: 80 });
fs.writeFileSync(USCITA, JSON.stringify(esito, null, 1));
console.log(Object.entries(esito).map(([k, v]) => k + ": " + v.length).join(" · "));
await ctx.close();
