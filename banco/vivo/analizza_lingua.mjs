// Segna le scritte nella lingua sbagliata:   node analizza_lingua.mjs en|it
import fs from "node:fs";
const L = process.argv[2] || "en";
const inv = JSON.parse(fs.readFileSync(new URL("./inventario_" + L + ".json", import.meta.url)));
const IT = /\b(di|del|della|delle|dei|degli|il|lo|la|le|gli|un|una|uno|che|non|per|con|sul|sulla|nel|nella|da|dal|dalla|ancora|avvia|simulazione|vista|pianta|punti|scatole|quello|vedo|dati|progetto|progetti|massimizza|zone|zona|ambiente|ambienti|passaggio|varchi?|livelli|occhio|misurat[aoie]|lettura|carica|caricamento|nuovo|apri|entra|esci|scegli|nome|tipo|scala|persone|sedute|ingress[oi]|accesso|uscita|tappe|tappa|percorso|percorsi|attesa|sosta|servizio|distribuzione|origine|destinazione|filtro|accoglienza|esterno|elimina|salva|annulla|conferma|modello|file|trascina|qui|oppure|tutti|nessun[ao]?|camere|preset|luce|netta|porte|larghezza|corridoi|aereo|pontile|imbarco|è|più|perché|già|così|cioè|verifica|norma|soglia|superata|dettaglio|osservazioni|orientamento|conformità|comprensione|architettonica|analisi|tempo|reale)\b/i;
const EN = /\b(the|and|of|to|with|from|for|this|that|your|you|is|are|not|started|simulation|walking|flow|average|transit|saturation|live|view|layers|report|editor|zone editor|upload|environment|project|projects|new|open|delete|save|cancel|model|file|drag|drop|here|or|all|none|rooms?|passages?|openings?|levels?|eye|looking|enter|details|insights|standby|zones|compliance|wayfinding|comprehension|architectural|analysis|real-time|walkable|area|footprint|detected|scan|waiting|global|top down|trajectory|frames|nodes|maximize|start|stop|play|pause|speed|settings|scale|agents?|people|passengers?)\b/i;
const sbagliata = L === "en" ? IT : EN;
const giusta = L === "en" ? EN : IT;
const visti = new Set();
for (const [fase, righe] of Object.entries(inv)) {
  for (const [testo, dove] of righe) {
    if (visti.has(testo)) continue;
    visti.add(testo);
    const t = testo.replace(/^@/, "");
    if (!sbagliata.test(t)) continue;
    // parole di entrambe le lingue (nomi propri, sigle, file): segnalate a parte
    const dubbio = giusta.test(t) ? " (misto)" : "";
    console.log(fase.padEnd(12) + " " + t.slice(0, 100).padEnd(100) + " " + dove.slice(0, 30) + dubbio);
  }
}
