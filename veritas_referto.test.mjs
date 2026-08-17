// Prove della memoria di lavoro.   node veritas_referto.test.mjs
import { nuovoReferto, deposita, annota, analisiConEsito, lacune, racconta, sintetizza, intercetta, SORGENTI }
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

console.log("\n=== sintesi: i numeri si tengono, le matrici no ===");
ok(sintetizza(42) === 42, "un numero resta un numero");
ok(sintetizza("ciao") === "ciao", "una stringa breve resta intera");
ok(sintetizza("x".repeat(400)).length === 201, "una stringa lunga viene troncata, e si vede");
const griglia = new Float32Array(500000);
const sg = sintetizza(griglia);
ok(sg.elementi === 500000 && !sg.campione,
   "una griglia da mezzo milione di celle diventa il suo conteggio, non la griglia");
ok(JSON.stringify(sg).length < 80, "e occupa quasi niente");
const lista = [{a:1},{a:2},{a:3},{a:4},{a:5}];
ok(sintetizza(lista).elementi === 5, "un array porta la sua lunghezza");
ok(sintetizza(lista).campione.length === 3, "piu' un campione, per capire cosa contiene");
const misto = { distanzaMax: 41.2, uscite: 3, nome: "esodo",
                mappa: new Float32Array(9), callback: () => {}, dom: { nodeType: 1 } };
const sm = sintetizza(misto);
ok(sm.distanzaMax === 41.2 && sm.uscite === 3, "i numeri utili sopravvivono");
ok(sm.mappa.elementi === 9, "gli array diventano conteggi");
ok(!("callback" in sm) && !("dom" in sm),
   "funzioni e nodi del DOM NON finiscono in memoria: non sono dati");
ok(sm.__esclusi === 2,
   "ma vengono contati, cosi' si sa che qualcosa e' stato lasciato fuori");

console.log("\n=== intercettazione: i numeri veri, non una seconda esecuzione ===");
let chiamate = 0;
const modulo = {
  analizzaEsodo(x) { chiamate++; return { distanzaMax: 41.2, uscite: 3, celle: new Array(9999) }; },
  usciteCandidate() { chiamate++; return [{ id: "u1" }, { id: "u2" }]; },
  niente() { chiamate++; },
};
let R2 = nuovoReferto("prova");
const n = intercetta(R2, "esodo", modulo, "misura");
ok(n === 3, `tre metodi intercettati (${n})`);
const esito = modulo.analizzaEsodo("arg");
ok(chiamate === 1, "l'analisi gira UNA volta sola, non due");
ok(esito.distanzaMax === 41.2, "chi chiama riceve il risultato vero, intatto");
ok(esito.celle.length === 9999, "compreso quello che in memoria non entra");
ok(R2.voci["esodo.analizzaEsodo"].valore.distanzaMax === 41.2,
   "e in memoria finisce il NUMERO");
ok(R2.voci["esodo.analizzaEsodo"].sorgente === "misura", "con la sua provenienza");
ok(R2.voci["esodo.analizzaEsodo"].valore.celle.elementi === 9999,
   "l'array pesante e' ridotto al conteggio");
modulo.usciteCandidate();
ok(R2.voci["esodo.usciteCandidate"].valore.elementi === 2, "anche gli altri metodi depositano");
modulo.niente();
ok(!("esodo.niente" in R2.voci), "un metodo che non restituisce niente non deposita niente");
ok(intercetta(R2, "esodo", modulo, "misura") === 0,
   "intercettare due volte non raddoppia gli involucri");

console.log("\n=== un difetto nella memoria non deve rompere l'analisi ===");
const rotto = { calcola() { return { v: 1 }; } };
intercetta(() => { throw new Error("memoria rotta"); }, "x", rotto, "misura");
let passato = true;
try { rotto.calcola(); } catch (e) { passato = false; }
ok(passato, "l'analisi va a buon fine anche se il deposito fallisce");

console.log(`\n${f-x}/${f} verifiche passate`);
process.exit(x?1:0);
