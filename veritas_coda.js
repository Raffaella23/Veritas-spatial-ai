// ===========================================================================
// VERITAS — LA CODA. Una telefonata per volta al modello locale.
// ===========================================================================
//
// PERCHE' ESISTE (misurato il 29/08/2026, sui log di LM Studio di Raffaella).
//
// Il circuito si fermava con «Failed to fetch» e risposte grezze di 0
// caratteri. Non era il parser e non era la finestra: nel log del server si
// leggeva
//
//     slot get_availabl: selected slot by LRU
//     srv stop: cancel task, id_task = 189
//
// cioe' LM Studio ha un numero limitato di sportelli e, quando ne arriva una
// di troppo, CHIUDE LA PIU' VECCHIA per far posto. Il browser vede la
// connessione cadere e dice «Failed to fetch» — un messaggio che sembra un
// guasto di rete e manda a cercare nel posto sbagliato.
//
// Chi telefonava insieme: l'occhio vecchio inlinato in `index.html` e il
// circuito occhio-cervello dei moduli. Nessuno dei due sbagliava da solo.
//
// ⚠️ QUESTO NON VIOLA LA REGOLA 0. Occhio e cervello restano accesi INSIEME e
//    vedono le STESSE immagini: cambia solo che le loro telefonate escono una
//    per volta invece di accavallarsi. E' l'ordine sul filo, non l'ordine del
//    ragionamento.
//
// COME. Si avvolge `window.fetch` una volta sola: le richieste dirette al
// modello locale entrano in fila, tutte le altre passano identiche. Cosi' non
// si tocca `index.html` (e quindi nemmeno il blocco 3) e vale anche per il
// codice che non sappiamo di avere.
// ===========================================================================

// Quanto si aspetta una risposta prima di rinunciare. Una pianta grande su un
// modello che vede puo' richiedere minuti solo per essere LETTA, prima ancora
// che cominci a pensare: i 90 secondi di prima erano una rinuncia, non un
// guasto suo.
const ATTESA_MS = 300000;

// Respiro fra una telefonata e l'altra: da' al server il tempo di liberare lo
// sportello. Senza, la successiva puo' trovarlo ancora occupato.
const RESPIRO_MS = 200;

const PORTE_LOCALI = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?\//i;

function eIlModelloLocale(url) {
  try {
    const s = String(url || "");
    if (PORTE_LOCALI.test(s)) return true;
    const c = window.__veritasLLM && window.__veritasLLM.cfg && window.__veritasLLM.cfg.url;
    if (c && s.indexOf(String(c).replace(/\/+$/, "")) === 0) return true;
    const b = window.__veritasCervelloUrl;
    if (b && s.indexOf(String(b).replace(/\/chat\/completions$/, "")) === 0) return true;
  } catch (e) {}
  return false;
}

function aspetta(ms) { return new Promise((r) => setTimeout(r, ms)); }

// La fila: una promessa che si allunga. Ogni nuova richiesta si aggancia in
// fondo e parte solo quando la precedente ha finito, comunque sia finita.
let ultima = Promise.resolve();
let inAttesa = 0;

function inCoda(lavoro) {
  inAttesa++;
  const mio = ultima.then(lavoro, lavoro);
  ultima = mio.then(
    () => aspetta(RESPIRO_MS),
    () => aspetta(RESPIRO_MS)
  ).then(() => { inAttesa--; }, () => { inAttesa--; });
  return mio;
}

function installa() {
  if (window.__veritasCoda) return;              // una volta sola
  if (typeof window.fetch !== "function") return;

  const originale = window.fetch.bind(window);

  window.fetch = function (risorsa, opzioni) {
    let url = "";
    try { url = typeof risorsa === "string" ? risorsa : (risorsa && risorsa.url) || ""; } catch (e) {}
    if (!eIlModelloLocale(url)) return originale(risorsa, opzioni);

    return inCoda(function () {
      const opt = Object.assign({}, opzioni || {});
      // Un tempo d'attesa dichiarato. Se ce n'e' gia' uno, e' di chi chiama e
      // non si tocca: chi l'ha scritto sapeva cosa stava chiedendo.
      let libera = null;
      if (!opt.signal && typeof AbortController !== "undefined") {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), window.__veritasAttesaModello || ATTESA_MS);
        opt.signal = ctrl.signal;
        libera = () => clearTimeout(t);
      }
      const p = originale(risorsa, opt);
      return libera ? p.then((r) => { libera(); return r; },
                             (e) => { libera(); throw e; }) : p;
    });
  };

  window.__veritasCoda = {
    inAttesa: () => inAttesa,
    attesaMs: () => window.__veritasAttesaModello || ATTESA_MS,
  };

  try {
    console.log("[VERITAS coda] telefonate al modello locale messe in fila: " +
                "una per volta, attesa " + Math.round(ATTESA_MS / 1000) + " s");
  } catch (e) {}
}

installa();

export { inCoda, ATTESA_MS };
