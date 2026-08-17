// Prove della sequenza.   node veritas_sequenza.test.mjs
import { nuovaSequenza, avvia, registraPassata, misuraFatta, giudizioFatto,
         puoSimulare, misuraAffidabile, raccontaFase, MAX_PASSATE }
  from "./veritas_sequenza.js";
let f=0,x=0;
const ok=(c,t)=>{f++; c?console.log("  ok   "+t):(x++,console.log("  ROTTO "+t));};

console.log("\n=== il caso che ci ha fatto perdere due giorni ===");
// modello non in metri: la prima passata corregge, la seconda e' pulita
let s = avvia(nuovaSequenza());
ok(s.fase === "ambiente", "si comincia dall'ambiente, non dall'analisi");
ok(!misuraAffidabile(s), "durante la sistemazione NESSUNA misura e' affidabile");
ok(!puoSimulare(s), "e non si simula");

let r1 = registraPassata(s, { correzione: "scala 6x" });
ok(r1.ambientePronto === false, "dopo una correzione l'ambiente NON e' pronto");
ok(s.fase === "ambiente", "si resta nell'ambiente");
ok(!misuraAffidabile(s), "e le misure restano inaffidabili: e' qui che nascevano");
ok(/rifaccio/.test(r1.motivo), "si dichiara che si rifa'");

let r2 = registraPassata(s, {});
ok(r2.ambientePronto === true, "una passata SENZA correzioni chiude l'ambiente");
ok(s.fase === "misura", "e si passa a misurare");
ok(misuraAffidabile(s), "ora le misure valgono");
ok(/scala 6x/.test(r2.motivo), "e si ricorda cosa e' stato corretto");

console.log("\n=== il modello gia' a posto non paga niente ===");
let g = avvia(nuovaSequenza());
const rg = registraPassata(g, {});
ok(rg.ambientePronto === true && g.passate === 1, "una sola passata");
ok(/gia' a posto/.test(rg.motivo), "e lo dice");

console.log("\n=== un ambiente che non si assesta: ci si ferma e SI DICE ===");
let m = avvia(nuovaSequenza());
let ultimo;
for (let i = 0; i < MAX_PASSATE + 2; i++) ultimo = registraPassata(m, { correzione: "scala " + i });
ok(ultimo.ambientePronto === true, "non si gira all'infinito");
ok(ultimo.instabile === true, "ma l'instabilita' e' marcata");
ok(/sospetto/.test(ultimo.motivo), "e si avverte di guardare le misure con sospetto");
ok(m.passate <= MAX_PASSATE, "il numero di passate e' limitato");

console.log("\n=== l'ordine non si salta ===");
let o = avvia(nuovaSequenza());
registraPassata(o, {});
ok(!puoSimulare(o), "non si simula appena misurato");
misuraFatta(o);
ok(o.fase === "giudizio", "dalla misura si passa al giudizio");
ok(!puoSimulare(o), "non si simula durante il giudizio: i numeri sono provvisori");
giudizioFatto(o);
ok(o.fase === "pronto" && puoSimulare(o), "solo a valle di tutto si puo' simulare");

console.log("\n=== la storia resta, per capire cosa e' successo ===");
ok(o.storia.length >= 4, `le fasi attraversate sono registrate (${o.storia.length})`);
ok(o.storia.every((p) => p.quando > 0), "ognuna con il proprio momento");

console.log("\n=== racconto ===");
for (const seq of [nuovaSequenza(), avvia(nuovaSequenza()), o]) {
  const t = raccontaFase(seq); console.log("   " + t); ok(t.length > 10, "  dice dove siamo");
}
ok(/Nessun modello/.test(raccontaFase(null)), "senza sequenza non inventa");

console.log(`\n${f-x}/${f} verifiche passate`);
process.exit(x?1:0);
