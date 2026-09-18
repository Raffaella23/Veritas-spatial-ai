// veritas_lingua.js — LA LINGUA. Uno strato, come il vestito carta.
// =============================================================================
//
// Raffaella, 18/09/2026: «una parte dell'interfaccia è ancora metà in italiano
// e metà in inglese». L'inventario fatto quel giorno nel banco (tutte le
// scritte visibili, con la piattaforma in inglese e poi in italiano) ha trovato
// le scritte rimaste nell'altra lingua in tre posti:
//   · il BUNDLE (index.html, blocco 3): «KPI • LIVE DA PYTHON CORE»,
//     «TRAJECTORY • FRAMES • NODES», «GLOBAL · Top Down 80m»... — il bundle non
//     si tocca a mano (HANDOFF §11), quindi si traduce da fuori;
//   · i moduli con le loro scritte fisse (barra degli strumenti, «dati di
//     progetto», «EIDETICA · quello che vedo», «MASSIMIZZA»...), alcuni in due
//     copie (file e incollato in index.html);
//   · i messaggi della conversazione (vedi FRASI in fondo).
// Qui c'e' UN SOLO dizionario per tutte, invece di dieci ritocchi sparsi.
//
// COME FUNZIONA. La lingua e' quella scelta dall'utente (`localStorage
// .veritasLang`, «it» o «en», di partenza «en»: decisione del 06/09). Si
// guardano i nodi di testo e gli attributi title/placeholder/aria-label della
// pagina; una scritta che il dizionario conosce ESATTAMENTE si sostituisce con
// la sua forma nella lingua scelta. Una scritta che non conosce non si tocca:
// niente traduzioni indovinate. La pagina di attesa (veritas_apertura.js) vive
// in un'ombra ed e' gia' nelle due lingue: qui non ci si entra.
//
// ⚠️ SI RICORDA L'ORIGINALE di ogni nodo tradotto, cosi' cambiare lingua non
//    traduce una traduzione. React riscrive un testo solo quando i suoi dati
//    cambiano: in quel caso l'osservatore lo vede e lo ritraduce.
//
//   window.__veritasLingua.stato()          quante scritte tradotte, da tradurre
//   window.__veritasLingua.daTradurre()     le scritte italiane viste in inglese
//   node --check veritas_lingua.js  ·  node veritas_lingua.test.mjs
// =============================================================================

// [italiano, inglese]. Chi le scrive puo' averle messe in una lingua o
// nell'altra: si riconoscono tutte e due le forme. Terzo campo facoltativo: la
// forma MISTA che compare davvero nel bundle, quando non e' ne' l'una ne' l'altra.
export const PAROLE = [
  // la barra degli strumenti (veritas_aspetto.js e la sua copia in index.html)
  ['Parla con EIDETICA', 'Talk to EIDETICA'],
  ['Leggi lo spazio', 'Read the space'],
  ['Cosa si vede', 'What can be seen'],
  ['Chi sta seduto', 'Seated view'],
  ['Vie di esodo e flusso', 'Escape routes and flow'],
  ['Togli dal modello', 'Remove from the model'],
  ['Persone in scena', 'People in the scene'],
  // la piattaforma (il segno davanti — ▶ ⤢ ◼︎ — lo tiene traduci())
  ['Avvia simulazione', 'Start simulation'],
  ['Costruisce la simulazione su questo spazio e la fa partire', 'Builds the simulation on this space and starts it'],
  ['MASSIMIZZA', 'MAXIMIZE'],
  ['MOSTRA I PANNELLI', 'SHOW THE PANELS'],
  ['dati di progetto', 'project details'],
  ['Mancano dati senza i quali alcune verifiche non hanno una soglia. Clicca per compilarli.',
    'Some checks have no threshold without these project details. Click to fill them in.'],
  ['Dati di progetto completi. Clicca per rivederli.', 'Project details complete. Click to review them.'],
  ['Carica Gaussian Splat (.ply .splat .ksplat .spz .sog)', 'Load Gaussian Splat (.ply .splat .ksplat .spz .sog)'],
  ["Connessione al motore fisico reale (Render)... se e' inattivo da un po' puo' richiedere fino a 60s",
    'Connecting to the real physics engine (Render)... if it has been idle for a while it can take up to 60s'],
  // «EIDETICA · quello che vedo» (veritas_anteprima.js)
  ['EIDETICA · quello che vedo', 'EIDETICA · what I see'],
  ['vista:', 'view:'],
  ['pianta', 'plan'],
  ['punti', 'points'],
  ['scatole', 'boxes'],
  ['nomi', 'names'],
  ['nessuna immagine ancora', 'no image yet'],
  // il bundle
  ['KPI • IN DIRETTA DAL MOTORE PYTHON', 'KPI • LIVE FROM PYTHON CORE', 'KPI • LIVE DA PYTHON CORE'],
  ['kpi_report.json + traiettoria', 'kpi_report.json + trajectory'],
  ['TRAIETTORIA •', 'TRAJECTORY •'],
  ['FOTOGRAMMI •', 'FRAMES •'],
  ['NODI', 'NODES'],
  ['GLOBALE', 'GLOBAL'],
  ['Globale', 'Global'],
  ["Dall'alto 80 m", 'Top Down 80m'],
  ['% • FOTOGRAMMA', '% • FRAME'],
];

// Scritte con un numero dentro. `re` riconosce la scritta in qualunque delle
// due lingue; `it` ed `en` la riscrivono dai pezzi trovati.
export const FORME = [
  { // «◻︎ 2 dati di progetto» — il pulsante dei dati mancanti
    re: /^(\S+)\s+(\d+)\s+(?:dat[oi] di progetto|project details?)$/,
    it: (m) => m[1] + ' ' + m[2] + (m[2] === '1' ? ' dato di progetto' : ' dati di progetto'),
    en: (m) => m[1] + ' ' + m[2] + (m[2] === '1' ? ' project detail' : ' project details'),
  },
  { // «1/14  pianta dall'alto» — la scelta della vista nell'anteprima
    re: /^(\d+\/\d+)\s+(?:pianta dall'alto|top-down plan)$/,
    it: (m) => m[1] + "  pianta dall'alto",
    en: (m) => m[1] + '  top-down plan',
  },
];

const norma = (t) => String(t).replace(/\s+/g, ' ').trim();
const INDICE = new Map();
for (const [it, en, misto] of PAROLE) {
  const voce = { it, en };
  for (const forma of [it, en, misto]) if (forma) INDICE.set(norma(forma), voce);
}

/** La scritta nella lingua data, o null se il dizionario non la conosce. */
export function traduci(testo, lingua) {
  const L = lingua === 'it' ? 'it' : 'en';
  const t = norma(testo);
  if (!t) return null;
  const voce = INDICE.get(t);
  if (voce) return voce[L];
  for (const f of FORME) {
    const m = t.match(f.re);
    if (m) return f[L](m);
  }
  // Un segno davanti (▶ ⤢ ◼︎ ▤ ✎ ...) resta com'e', si traduce il resto.
  const s = t.match(/^([^\p{L}\p{N}\s]+)\s+(.+)$/u);
  if (s) {
    const resto = traduci(s[2], L);
    if (resto != null) return s[1] + ' ' + resto;
  }
  return null;
}

// Parole che in una scritta inglese tradiscono l'italiano: servono solo a
// DIRE cosa resta da tradurre (window.__veritasLingua.daTradurre()), mai a
// tradurre.
const SPIA_ITALIANO = /\b(della|delle|degli|nella|sulla|dalla|non|sono|ancora|questo|questa|progetto|simulazione|vista|pianta|zona|zone|ambiente|ambienti|varchi|livelli|occhio|misurat[aoie]|caricamento|tappe|percorso|persone|ingressi|accesso|verifiche|soglia|clicca|mancano|dati)\b/i;

export function lingua() {
  try { return localStorage.getItem('veritasLang') === 'it' ? 'it' : 'en'; } catch (e) { return 'en'; }
}

const ATTRIBUTI = ['title', 'placeholder', 'aria-label'];

function avvia() {
  const originali = new WeakMap();      // nodo -> testo originale (come l'ha scritto chi l'ha creato)
  const scritti = new WeakMap();        // nodo -> testo che ci abbiamo messo noi
  const attrOriginali = new WeakMap();  // elemento -> { attributo: originale }
  const restano = new Set();
  let tradotti = 0, linguaFatta = null;

  function testo(n, L) {
    const ora = n.nodeValue;
    if (scritti.get(n) !== ora) originali.set(n, ora);     // chi l'ha creato l'ha cambiato
    const orig = originali.get(n);
    const nuovo = traduci(orig, L);
    if (nuovo == null) {
      if (L === 'en' && SPIA_ITALIANO.test(orig) && restano.size < 200) restano.add(norma(orig).slice(0, 140));
      return;
    }
    const lead = orig.match(/^\s*/)[0], trail = orig.match(/\s*$/)[0];
    const finale = lead + nuovo + trail;
    if (finale !== ora) { n.nodeValue = finale; tradotti++; }
    scritti.set(n, finale);
  }

  function attributi(el, L) {
    let mem = attrOriginali.get(el);
    for (const a of ATTRIBUTI) {
      if (!el.hasAttribute(a)) continue;
      const ora = el.getAttribute(a);
      if (!mem) { mem = {}; attrOriginali.set(el, mem); }
      const noto = mem[a];
      if (!noto || (ora !== noto.scritto)) mem[a] = { orig: ora, scritto: null };
      const nuovo = traduci(mem[a].orig, L);
      if (nuovo == null) continue;
      if (nuovo !== ora) { el.setAttribute(a, nuovo); tradotti++; }
      mem[a].scritto = nuovo;
    }
  }

  function passa(radice, L) {
    if (!radice) return;
    if (radice.nodeType === 3) { testo(radice, L); return; }
    if (radice.nodeType !== 1 && radice.nodeType !== 11) return;
    if (radice.nodeType === 1) {
      if (/^(SCRIPT|STYLE|TEXTAREA)$/.test(radice.tagName)) return;
      attributi(radice, L);
    }
    const w = document.createTreeWalker(radice, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) {
        const p = n.parentElement;
        if (p && /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.tagName)) continue;
        testo(n, L);
      } else attributi(n, L);
    }
  }

  let coda = new Set(), previsto = false;
  function piu_tardi() {
    if (previsto) return;
    previsto = true;
    requestAnimationFrame(() => {
      previsto = false;
      const L = lingua();
      if (L !== linguaFatta) { linguaFatta = L; coda.clear(); passa(document.body, L); return; }
      const lotto = coda; coda = new Set();
      for (const n of lotto) if (n.isConnected) passa(n, L);
    });
  }

  new MutationObserver((mut) => {
    for (const m of mut) {
      if (m.type === 'characterData') coda.add(m.target);
      else if (m.type === 'attributes') coda.add(m.target);
      else for (const n of m.addedNodes) coda.add(n);
    }
    if (coda.size) piu_tardi();
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTI });

  linguaFatta = lingua();
  passa(document.body, linguaFatta);
  // Il pulsante della lingua riscrive la pagina: se non lo facesse, si ripassa
  // comunque quando cambia la scelta salvata.
  addEventListener('storage', (e) => { if (e.key === 'veritasLang') piu_tardi(); });

  window.__veritasLingua = {
    lingua, traduci,
    stato: () => ({ lingua: linguaFatta, tradotti, daTradurre: restano.size }),
    daTradurre: () => [...restano],
    ripassa: () => { linguaFatta = null; piu_tardi(); },
  };
  console.log('[VERITAS lingua] pronta — ' + PAROLE.length + ' scritte e ' + FORME.length + ' forme nelle due lingue; lingua ' + linguaFatta);
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.body) avvia();
  else addEventListener('DOMContentLoaded', avvia, { once: true });
}
