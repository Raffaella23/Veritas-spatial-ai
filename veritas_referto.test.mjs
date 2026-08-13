// Prove della memoria di lavoro.   node veritas_referto.test.mjs
import { nuovoReferto, deposita, annota, analisiConEsito, lacune, racconta, SORGENTI }
  from "./veritas_referto.js";
let f=0, x=0;
const ok=(c,t)=>{f++; c?console.log("  ok   "+t):(x++,console.log("  ROTTO "+t));};

console.log("\n=== deposito e provenienza ===");
let R = nuovoReferto("terminal di prova");
deposita(R, "areaPavimento", 3589.4, { sorgente: "misura", unita: "m2", da: "pianta ortografica" });
ok(R.voci.areaPavimento.valore === 3589.4, "il valore c'e'");
ok(R.voci.areaPavimento.sorgente === "misura", "la provenienza e' conservata");
ok(R.voci.areaPavimento.da === "pianta ortografica", "e anche CHI l'ha prodotto");
ok(R.voci.areaPavimento.quando > 0, "e quando");

deposita(R, "scala", 6, { sorgente: "inventata" });
ok(R.voci.scala.sorgente === "riferito",
   "una provenienza non prevista NON passa come misura: ricade su 'riferito'");
ok(SORGENTI.includes("misura") && SORGENTI.includes("stima"),
   "misura e stima sono distinte, non si confondono");

console.log("\n=== le analisi lasciano traccia ===");
ok(analisiConEsito(R).length === 0, "all'inizio nessuna analisi ha prodotto niente");
annota(R, "esodo", "Percorso di fuga piu' lungo: 41 m.");
annota(R, "esodo", "Due uscite su tre sono sullo stesso lato.");
annota(R, "visibilita", "Il gate 3 non e' visibile dall'ingresso.");
ok(analisiConEsito(R).length === 2, "due analisi hanno prodotto qualcosa");
ok(R.analisi.esodo.detto.length === 2, "le frasi si accumulano nell'ordine");
annota(R, "affollamento");
ok(!analisiConEsito(R).includes("affollamento"),
   "un'analisi che gira ma non dice niente NON risulta svolta");

console.log("\n=== dichiara cosa manca invece di tacerlo ===");
const m = lacune(R);
ok(m.includes("zone") && m.includes("quotaPavimento"), "elenca i dati mancanti");
ok(!m.includes("areaPavimento"), "e non quelli che ci sono");
deposita(R, "zone", 7, { sorgente: "misura" });
deposita(R, "quotaPavimento", 0.4, { sorgente: "misura", unita: "m" });
ok(lacune(R).length === 0, "quando ci sono tutti, nessuna lacuna");

console.log("\n=== racconto ===");
deposita(R, "segnaletica", [
  { tinta: 51, tipo: "direzionale" }, { tinta: 226, tipo: "areale" },
  { tinta: 115, tipo: "areale" },
], { sorgente: "misura", da: "pianta ortografica" });
const testo = racconta(R);
console.log("   " + testo);
ok(/3589/.test(testo), "riporta l'area");
ok(/misura/.test(testo), "e dichiara che e' una misura, non una stima");
ok(/3 famiglie/.test(testo), "riporta la segnaletica");
ok(/1 con un verso/.test(testo), "e quante hanno un verso");
ok(/esodo/.test(testo) && /visibilita/.test(testo), "elenca le analisi svolte");

console.log("\n=== memoria vuota: dice di esserlo ===");
ok(/vuota/.test(racconta(nuovoReferto())), "una memoria vuota lo dichiara");
ok(/Nessuno spazio/.test(racconta(null)), "nessuna memoria: nessuna invenzione");

console.log(`\n${f-x}/${f} verifiche passate`);
process.exit(x?1:0);
