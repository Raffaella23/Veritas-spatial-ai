// ============================================================================
// RIPARA E CONTROLLA IL VESTITO — un comando solo, da lanciare SEMPRE dopo
// aver toccato veritas_carta.js.
//
//   node banco/sistema_carta.mjs
//
// PERCHE': il 05 e il 06/09 ho scritto TRE VOLTE un apice inclinato dentro un
// commento del blocco CSS. Quell'apice chiude la stringa e spezza il modulo.
// Tre volte vuol dire che ricordarselo non funziona: se una cosa si sbaglia
// sempre allo stesso modo, non va ricordata — va tolta di mano.
// Qui gli apici nel CSS si raddrizzano DA SOLI, e poi si controlla il resto.
// ============================================================================

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const QUI = dirname(fileURLToPath(import.meta.url));
const FILE = join(QUI, "..", "veritas_carta.js");
const APICE = String.fromCharCode(96);

let s = readFileSync(FILE, "utf8");

// --- 1. raddrizza gli apici dentro il blocco CSS ---------------------------
const apertura = "const CSS = " + APICE;
const a = s.indexOf(apertura);
if (a >= 0) {
  const da = a + apertura.length;
  const al = s.indexOf(APICE + ";", da);
  if (al > 0) {
    const corpo = s.slice(da, al);
    const quanti = (corpo.match(new RegExp(APICE, "g")) || []).length;
    if (quanti) {
      s = s.slice(0, da) + corpo.split(APICE).join("'") + s.slice(al);
      writeFileSync(FILE, s, "utf8");
      console.log(`[riparato] ${quanti} apice/i inclinato/i nel CSS -> apici dritti`);
    }
  }
}

// --- 1-bis. alza il numero di versione nel tag <script> --------------------
// TRAPPOLA GIA' REGISTRATA IN HANDOFF.md: «un modulo esterno ha la sua cache e
// arriva quello di prima anche con index.html rinfrescato. Si cambiano a ogni
// modifica di quei file.»
// Io non l ho mai fatto: veritas_carta.js e rimasto a ?v=1 per un giorno
// intero di modifiche, e il 06/09 Raffaella ha visto un errore
// (window.eidetica non definito) perche il browser le serviva una copia
// vecchia. Ricordarselo non ha funzionato: adesso lo fa il comando.
const INDICE = join(QUI, '..', 'index.html');
let html = readFileSync(INDICE, 'utf8');
const tag = /veritas_carta\.js\?v=(\d+)/;
const trovato = html.match(tag);
if (trovato) {
  const nuovo = Number(trovato[1]) + 1;
  html = html.replace(tag, 'veritas_carta.js?v=' + nuovo);
  writeFileSync(INDICE, html, 'utf8');
  console.log('[versione] veritas_carta.js ?v=' + trovato[1] + ' -> ?v=' + nuovo);
}

// --- 2. la sintassi ---------------------------------------------------------
try {
  execFileSync(process.execPath, ["--check", FILE], { stdio: "pipe" });
  console.log("[ok] sintassi");
} catch (e) {
  console.log("[X] SINTASSI ROTTA:\n" + String(e.stderr || e.message).slice(0, 600));
  process.exit(1);
}

// --- 3. le funzioni chiamate esistono? -------------------------------------
try {
  execFileSync(process.execPath, [join(QUI, "controlla_carta.mjs")], { stdio: "inherit" });
} catch (e) {
  process.exit(1);
}
