// PIANO -> CORPO (29/09): legge coppie.json di misura_piano_corpo.mjs e conta, per il piano e per il cammino
// del corpo, punti diversi, inversioni (>0,3 m avanti e indietro), scarto laterale, punti sulle linee fisse
// ricorrenti e la prima inversione per persona.   node banco/vivo/analisi_piano_corpo.cjs [coppie.json]
const D=require(require("node:path").resolve(process.argv[2] || "banco/vivo/misura_piano_corpo/coppie.json"));
const perAg=(fr)=>{const m=new Map();for(const f of fr)for(const [id,x,z,s] of f.a){if(!m.has(id))m.set(id,[]);m.get(id).push({t:f.t,x,z,s});}return m;};
const onScreen=(c)=>{const f=c.corpo.find(f=>f.t===D.tFirma);return f&&D.firma.every(([id,x,z])=>f.a.some(a=>a[0]===id&&Math.abs(a[1]-x)<1e-3&&Math.abs(a[2]-z)<1e-3));};
const LINEE=[["x=-7,78",p=>Math.abs(p.x+7.78)<0.015],["z=11,52",p=>Math.abs(p.z-11.52)<0.015],["z=9,57",p=>Math.abs(p.z-9.57)<0.015],["z=13,32",p=>Math.abs(p.z-13.32)<0.015]];
function studia(fr){const m=perAg(fr);let inv=0,passi=0,scarti=[];const linee={};const prime={};
 m.forEach((arr,id)=>{for(let k=1;k+1<arr.length;k++){const A=arr[k-1],B=arr[k],C=arr[k+1];if(A.s!=="MOVING"||B.s!=="MOVING"||C.s!=="MOVING")continue;
  const u=[B.x-A.x,B.z-A.z],v=[C.x-B.x,C.z-B.z],lu=Math.hypot(...u),lv=Math.hypot(...v);passi++;
  if(lu>0.3&&lv>0.3&&(u[0]*v[0]+u[1]*v[1])/(lu*lv)<-0.5){inv++;if(!(id in prime))prime[id]={t:B.t,x:B.x,z:B.z};}
  const L=Math.hypot(C.x-A.x,C.z-A.z);if(L>=0.2)scarti.push(Math.abs(((B.x-A.x)*(C.z-A.z)-(B.z-A.z)*(C.x-A.x))/L));}
  for(const p of arr)for(const [n,f] of LINEE)if(f(p))linee[n]=(linee[n]||0)+1;});
 scarti.sort((a,b)=>a-b);return {passiInCammino:passi,inversioni:inv,scartoMediano_cm:+(scarti[scarti.length>>1]*100).toFixed(1),oltre10cm:Math.round(100*scarti.filter(s=>s>0.1).length/scarti.length)+"%",puntiSulleLinee:linee,primaInversione:Object.entries(prime).slice(0,6)};}
D.tutte.forEach((c,i)=>{let diversi=0,tot=0,maxd=0;const P=perAg(c.piano),C=perAg(c.corpo);
 P.forEach((arr,id)=>{const b=C.get(id)||[];arr.forEach((p,k)=>{const q=b[k];if(!q)return;tot++;const d=Math.hypot(p.x-q.x,p.z-q.z);if(d>0.01)diversi++;if(d>maxd)maxd=d;});});
 console.log("COPPIA",i,"sullo schermo:",onScreen(c),"| punti piano≠corpo:",diversi+"/"+tot,"scarto max",maxd.toFixed(2),"m");
 console.log("  PIANO ",JSON.stringify(studia(c.piano)));console.log("  CORPO ",JSON.stringify(studia(c.corpo)));});
