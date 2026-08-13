import { chromium } from "playwright";
import path from "path"; import { fileURLToPath } from "url";
const qui = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch({ executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args:["--use-gl=swiftshader","--enable-unsafe-swiftshader","--no-sandbox"] });
const p = await b.newPage();
const log=[]; p.on("console",m=>log.push(m.text()));
p.on("pageerror",e=>console.log("PAGEERROR",e.message.slice(0,110)));
await p.goto("http://127.0.0.1:8899/index.html",{waitUntil:"load",timeout:60000});
await p.waitForTimeout(6000);
await p.fill("#v-new-name","zone"); await p.click("#v-create-btn"); await p.waitForTimeout(6000);
await p.click("#vs-start-btn").catch(()=>{}); await p.waitForTimeout(10000);
await p.setInputFiles("#vaio-upload-input", path.join(qui,"airport_foot_traffic.glb"));
await p.waitForTimeout(46000);
console.log(await p.evaluate(() => JSON.stringify({
  zoneTrovate: (window.__veritasAutoZones||[]).length,
  zoneAssegnate: (window.__veritasGetNodes ? window.__veritasGetNodes() : []).length,
  nomiAssegnati: (window.__veritasGetNodes ? window.__veritasGetNodes() : []).map(n=>n.type||n.name||"?"),
}, null, 1)));
console.log("--- righe AUTO ---");
log.filter(l=>/AUTO|zone|assegn/i.test(l)).slice(-14).forEach(l=>console.log("  "+l.slice(0,140)));
await b.close();
