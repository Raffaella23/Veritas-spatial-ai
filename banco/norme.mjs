// Il confronto normativo gira su misure GIUSTE, ora che l'ordine e' imposto?
import { chromium } from "playwright";
import path from "path"; import { fileURLToPath } from "url";
const qui = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args:["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"] });
const p = await b.newPage();
p.on("pageerror",e=>console.log("PAGEERROR",e.message.slice(0,120)));
await p.goto("http://127.0.0.1:8899/index.html",{waitUntil:"load",timeout:60000});
await p.waitForTimeout(6000);
await p.fill("#v-new-name","norme"); await p.click("#v-create-btn"); await p.waitForTimeout(6000);
await p.click("#vs-start-btn").catch(()=>{}); await p.waitForTimeout(10000);
await p.setInputFiles("#vaio-upload-input", path.join(qui,"airport_foot_traffic.glb"));
await p.waitForTimeout(46000);
console.log(await p.evaluate(() => {
  const R = window.__veritasReferto, T = window.THREE, r = window.__veritasModelRoot;
  const box = r ? new T.Box3().setFromObject(r) : null;
  const val = R && R.voci["normative.valuta"] ? R.voci["normative.valuta"].valore : null;
  // da dove vengono le larghezze? il motore geometrico le calcola qui
  const pe = window.__veritasPerceptionEngine;
  const auto = window.__veritasAutoPoints || [];
  return JSON.stringify({
    fase: window.__veritasSequenza && window.__veritasSequenza.fase,
    scalaModello: r ? +r.scale.x.toFixed(3) : null,
    ingombro: box ? [+(box.max.x-box.min.x).toFixed(1), +(box.max.y-box.min.y).toFixed(1), +(box.max.z-box.min.z).toFixed(1)] : null,
    puntiNuvola: auto.length,
    normativeValuta: val,
    nuvolaDove: (() => {
      const a = window.__veritasAutoPoints || [];
      if (!a.length) return null;
      let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9,y0=1e9,y1=-1e9;
      for (const p of a) { if(p[0]<x0)x0=p[0]; if(p[0]>x1)x1=p[0];
        if(p[2]<z0)z0=p[2]; if(p[2]>z1)z1=p[2]; if(p[1]<y0)y0=p[1]; if(p[1]>y1)y1=p[1]; }
      // quante celle da 1 m sono occupate: la superficie VERA coperta
      const celle = new Set();
      for (const p of a) celle.add(Math.floor(p[0]) + "|" + Math.floor(p[2]));
      return { estensione: [+(x1-x0).toFixed(1), +(y1-y0).toFixed(1), +(z1-z0).toFixed(1)],
               celleDa1m: celle.size, punti: a.length };
    })(),
    percezionePerceive: R && R.voci["percezione.perceive"] ? R.voci["percezione.perceive"].valore : null,
    spaziaturaPunti: R && R.voci["percezione.estimatePointSpacing"] ? R.voci["percezione.estimatePointSpacing"].valore : null,
    // quanto distano DAVVERO due punti della nuvola, misurato qui e ora
    distanzaTipica: (() => {
      const a = window.__veritasAutoPoints || [];
      if (a.length < 200) return null;
      const d = [];
      for (let i = 0; i < 300; i++) {
        const p1 = a[(i * 97) % a.length];
        let best = Infinity;
        for (let k = 0; k < 200; k++) {
          const p2 = a[(i * 97 + k * 13 + 1) % a.length];
          if (p1 === p2) continue;
          const dx = p1[0]-p2[0], dz = p1[2]-p2[2], dy = p1[1]-p2[1];
          const q = dx*dx + dy*dy + dz*dz;
          if (q > 1e-12 && q < best) best = q;
        }
        if (isFinite(best)) d.push(Math.sqrt(best));
      }
      d.sort((x, y) => x - y);
      return { mediana: +d[Math.floor(d.length/2)].toFixed(4), n: d.length };
    })(),
    varchiUltimi: window.__veritasUltimiVarchi || window.__veritasBottleneckGrid ? "presenti" : "assenti",
    perceptionUltimo: window.__veritasPerceptionEngine && window.__veritasReferto
      ? Object.keys(window.__veritasReferto.voci).filter(k=>k.startsWith("percezione")) : [],
  }, null, 1);
}));
await b.close();
