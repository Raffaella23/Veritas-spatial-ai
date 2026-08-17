import { chromium } from "playwright";
import path from "path"; import { fileURLToPath } from "url";
const qui = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args:["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"] });
const p = await b.newPage();
p.on("pageerror",e=>console.log("PAGEERROR",e.message.slice(0,140)));
await p.goto("http://127.0.0.1:8899/index.html",{waitUntil:"load",timeout:60000});
await p.waitForTimeout(6000);
await p.fill("#v-new-name","pianta"); await p.click("#v-create-btn"); await p.waitForTimeout(6000);
await p.click("#vs-start-btn").catch(()=>{}); await p.waitForTimeout(10000);
await p.setInputFiles("#vaio-upload-input", path.join(qui,"airport_foot_traffic.glb"));
await p.waitForTimeout(22000);
console.log(await p.evaluate(() => {
  const r = window.__veritasModelRoot, T = window.THREE;
  const box = new T.Box3().setFromObject(r);
  const pi = window.__veritasUltimaPianta;
  let opachi = 0, tot = 0;
  if (pi) { tot = pi.larghezza*pi.altezza;
    for (let i=3; i<pi.pixel.length; i+=4) if (pi.pixel[i] >= 128) opachi++; }
  return JSON.stringify({
    ingombro: [+(box.max.x-box.min.x).toFixed(1), +(box.max.y-box.min.y).toFixed(1), +(box.max.z-box.min.z).toFixed(1)],
    boxMin: [+box.min.x.toFixed(1), +box.min.y.toFixed(1), +box.min.z.toFixed(1)],
    boxMax: [+box.max.x.toFixed(1), +box.max.y.toFixed(1), +box.max.z.toFixed(1)],
    pianta: pi ? { larghezza: pi.larghezza, altezza: pi.altezza,
                   mpp: +pi.metriPerPixel.toFixed(4), origine: pi.origine.map(v=>+v.toFixed(1)),
                   quotaPav: +pi.quotaPavimento.toFixed(3) } : null,
    pixelOpachi: opachi, pixelTotali: tot,
    percentualeCoperta: tot ? +(100*opachi/tot).toFixed(1) : 0,
  }, null, 1);
}));
await b.close();
