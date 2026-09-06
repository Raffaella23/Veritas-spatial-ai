// ============================================================================
// CONTROLLO DEL VESTITO — quello che node --check non vede.
//
// PERCHE' ESISTE, che e' la parte che conta.
//
// 1. FUNZIONI SPARITE. Il 05/09 ho cancellato per sbaglio due funzioni di
//    veritas_carta.js — rivestiBottoni e scostaLaBarra — sostituendo un
//    blocco di testo che le conteneva in mezzo. Il file restava perfettamente
//    valido: `node --check` diceva OK, perche' CHIAMARE UNA FUNZIONE CHE NON
//    C'E' NON E' UN ERRORE DI SINTASSI. Se ne accorge solo chi guarda lo
//    schermo, cioe' Raffaella.
//
// 2. APICI INCLINATI DENTRO IL CSS. Lo stesso giorno, DUE VOLTE, scrivendo un
//    nome di classe fra apici inclinati dentro un commento del blocco CSS.
//    Quell'apice chiude la stringa e spezza il modulo. Averlo rifatto
//    identico la seconda volta vuol dire che ricordarselo non basta.
//
// Il difetto vero, tutte e tre le volte, non era la svista: era non avere un
// modo di accorgersene senza aprire il browser. Questo e' quel modo.
//
// Uso:
//   node banco/controlla_carta.mjs
// ============================================================================

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const QUI = dirname(fileURLToPath(import.meta.url));
const FILE = join(QUI, "..", "veritas_carta.js");
const APICE = String.fromCharCode(96);        // l'apice inclinato, senza scriverlo

const grezzo = readFileSync(FILE, "utf8");
let problemi = 0;

// --- 1. apici inclinati dentro il blocco CSS -------------------------------
const apertura = "const CSS = " + APICE;
const apreCSS = grezzo.indexOf(apertura);
if (apreCSS >= 0) {
  const dopo = apreCSS + apertura.length;
  const chiude = grezzo.indexOf(APICE + ";", dopo);
  const dentro = chiude > 0 ? grezzo.slice(dopo, chiude) : "";
  const quanti = (dentro.match(new RegExp(APICE, "g")) || []).length;
  if (quanti) {
    console.log("\n[X] " + quanti + " apice/i inclinato/i dentro il blocco CSS.");
    console.log("    Chiude la stringa e spezza il modulo.");
    console.log("    Nei commenti del CSS si usano gli apici dritti.");
    problemi++;
  }
}

// --- 2. funzioni chiamate ma non dichiarate --------------------------------
// Prima si toglie cio' che non e' codice, se no il controllo grida al lupo: il
// blocco CSS (dove rgba( e var( e oklch( sembrano chiamate di funzione) e i
// commenti (dove una parola italiana seguita da parentesi sembra anche lei una
// chiamata). Senza questa pulizia segnalava 23 falsi allarmi e zero veri, che
// e' il modo piu' rapido per far smettere di guardarlo a chiunque.
const sorgente = grezzo
  .replace(new RegExp(apertura + "[\\s\\S]*?" + APICE + ";"), "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

const dichiarate = new Set(
  [...sorgente.matchAll(/^function\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]),
);

const chiamate = new Map();
for (const m of sorgente.matchAll(/(.?)\b([a-z_$][\w$]*)\s*\(/g)) {
  if (m[1] === ".") continue;                 // e' un metodo, non roba nostra
  chiamate.set(m[2], (chiamate.get(m[2]) || 0) + 1);
}

const ALTRUI = new Set([
  "if", "for", "while", "switch", "catch", "return", "typeof", "function",
  "new", "await", "console", "setTimeout", "setInterval", "clearInterval",
  "parseInt", "parseFloat", "isFinite", "isNaN", "String", "Number", "Boolean",
  "require", "import", "get", "set", "then", "of", "in", "do", "else", "try",
  "getComputedStyle", "var", "MutationObserver", "Image", "Map", "Set",
  "Object", "Event", "RegExp", "Array", "Math", "JSON",
]);

const mancanti = [...chiamate.keys()]
  .filter((n) => !dichiarate.has(n) && !ALTRUI.has(n))
  .filter((n) => !new RegExp("(const|let|var)\\s+" + n + "\\b").test(sorgente));

if (mancanti.length) {
  console.log("\n[X] CHIAMATE MA NON DICHIARATE:");
  for (const n of mancanti) {
    console.log("      " + n + "()  — usata " + chiamate.get(n) + " volte");
  }
  console.log("\n    Se e' roba del browser va aggiunta ad ALTRUI qui sopra.");
  console.log("    Se no e' sparita: rimettila.");
  problemi++;
}

// --- esito ----------------------------------------------------------------
console.log("\nveritas_carta.js — " + dichiarate.size + " funzioni dichiarate");
if (problemi) process.exit(1);
console.log("Nessun problema.");
