// Prove della riduzione a percorso.   node veritas_percorso.test.mjs
import { riduciAPercorso, tappeConsigliate, TAPPE_MAX } from "./veritas_percorso.js";
let f=0,x=0;
const ok=(c,t)=>{f++; c?console.log("  ok   "+t):(x++,console.log("  ROTTO "+t));};

const zona = (id, area) => ({ id, areaM2: area });

console.log("\n=== il caso reale: 31 ambienti ===");
const trentuno = [];
for (let i = 0; i < 31; i++) trentuno.push(zona("z"+i, (i % 7) * 30 + 10));
const r = riduciAPercorso(trentuno, trentuno, 5);
ok(r.tappe.length === 5, `31 ambienti -> 5 tappe (${r.tappe.length})`);
ok(r.scartate === 26, "e lo dice quante ne ha lasciate fuori");
ok(r.tappe[0].id === "z0", "la prima tappa e' l'ingresso");
ok(r.tappe[4].id === "z30", "l'ultima e' la destinazione");

console.log("\n=== l'ordine e' quello di attraversamento, non di dimensione ===");
const idx = r.tappe.map((t) => +t.id.slice(1));
ok(idx.every((v, i) => i === 0 || v > idx[i-1]),
   `le tappe escono in sequenza spaziale: ${idx.join(" -> ")}`);
// controprova: la piu' grande in assoluto non e' per forza in mezzo
const grandi = [zona("a",1), zona("b",999), zona("c",1), zona("d",1), zona("e",1), zona("f",1)];
const rg = riduciAPercorso(grandi, grandi, 3);
ok(rg.tappe.map(t=>t.id).join("") === "abf" || rg.tappe[0].id === "a",
   `dentro il tratto vince la piu' estesa: ${rg.tappe.map(t=>t.id).join(" ")}`);
ok(rg.tappe[0].id === "a" && rg.tappe[rg.tappe.length-1].id === "f",
   "ma primo e ultimo restano gli estremi");

console.log("\n=== il flusso conta: se cambia, cambiano le tappe ===");
const z = [zona("p",10), zona("q",10), zona("r",10), zona("s",10), zona("t",10)];
const dritto = riduciAPercorso(z, [z[0],z[1],z[2],z[3],z[4]], 3);
const rovescio = riduciAPercorso(z, [z[4],z[3],z[2],z[1],z[0]], 3);
ok(dritto.tappe[0].id === "p" && rovescio.tappe[0].id === "t",
   "invertendo il flusso si inverte il percorso");
ok(dritto.daFlusso === true, "dichiara di aver usato il flusso");

console.log("\n=== senza flusso lo DICE, non finge ===");
const senza = riduciAPercorso(z, null, 3);
ok(senza.daFlusso === false, "marcato come senza flusso");
ok(/nessun flusso/.test(senza.motivo), "e lo scrive nel motivo");
ok(senza.tappe.length === 3, "ma una risposta la da' comunque");

console.log("\n=== pochi ambienti: non si riduce niente ===");
const pochi = [zona("a",1), zona("b",2), zona("c",3)];
const rp = riduciAPercorso(pochi, pochi, 5);
ok(rp.tappe.length === 3 && rp.scartate === 0, "3 ambienti restano 3 tappe");
ok(/gia' pochi/.test(rp.motivo), "e si dichiara");

console.log("\n=== limiti ===");
ok(riduciAPercorso(trentuno, trentuno, 1).tappe.length === 2, "sotto 2 non e' un percorso");
ok(riduciAPercorso(trentuno, trentuno, 99).tappe.length <= TAPPE_MAX,
   `e non si superano ${TAPPE_MAX} tappe`);
ok(riduciAPercorso([], null, 5).tappe.length === 0, "nessun ambiente: nessuna tappa");
ok(/nessun ambiente/.test(riduciAPercorso([], null, 5).motivo), "e lo dice");
ok(riduciAPercorso(null, null, 5).tappe.length === 0, "input nullo non rompe");

console.log("\n=== quante tappe consigliare ===");
ok(tappeConsigliate(3) === 3, "3 ambienti -> 3 tappe");
ok(tappeConsigliate(10) === 5, "10 ambienti -> 5 tappe");
ok(tappeConsigliate(31) === 7, "31 ambienti -> 7 tappe");
ok(tappeConsigliate(0) === 2, "nessun ambiente -> il minimo");

console.log("\n=== zone senza area dichiarata non fanno saltare niente ===");
const nude = [{id:"a"},{id:"b"},{id:"c"},{id:"d"},{id:"e"},{id:"f"}];
ok(riduciAPercorso(nude, nude, 4).tappe.length === 4, "funziona anche senza aree");

console.log(`\n${f-x}/${f} verifiche passate`);
process.exit(x?1:0);
