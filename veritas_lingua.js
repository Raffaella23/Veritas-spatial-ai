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
  // pannelli del bundle e dell'editor delle zone
  ['Non contiene logica di simulazione.', 'It contains no simulation logic.'],
  ['Il viewer NON contiene logica.', 'The viewer contains NO logic.'],
  ["Tutta l'intelligenza è nel Core. Questo file legge solo traiettoria + KPI.", 'All the intelligence is in the Core. This file only reads trajectory + KPIs.'],
  ['CLICCA CARICA', 'CLICK LOAD'],
  ['→ upload airport.glb direttamente (non via git) → Commit.', '→ upload airport.glb directly (not via git) → Commit.'],
  ["Trascina lo slider o scrivi il valore esatto per spostare su/giu' il punto selezionato, per i casi in cui il click sulla mesh non lo aggancia dove serve.",
    'Drag the slider or type the exact value to move the selected point up or down, for when a click on the mesh does not catch it where needed.'],
];

// Scritte con un numero dentro. `re` riconosce la scritta in qualunque delle
// due lingue; `it` ed `en` la riscrivono dai pezzi trovati.
export const FORME = [
  { // «◻︎ 2 dati di progetto» — il pulsante dei dati mancanti
    re: /^(\S+)\s+(\d+)\s+(?:dat[oi] di progetto|project details?)$/,
    it: (m) => m[1] + ' ' + m[2] + (m[2] === '1' ? ' dato di progetto' : ' dati di progetto'),
    en: (m) => m[1] + ' ' + m[2] + (m[2] === '1' ? ' project detail' : ' project details'),
  },
  { // i nomi NEUTRI che la misura da' alle zone e agli ingressi: «Zona 3 · 22 m²»,
    // «Accesso 1». Solo nome e numero (e i m²): dentro una frase non si tocca.
    re: /^(Zona|Zone|Ambiente|Room|Passaggio|Passage|Accesso|Entrance) (\d+)((?: · [\d.,]+ m²)?)$/,
    it: (m) => ({ Zone: 'Zona', Room: 'Ambiente', Passage: 'Passaggio', Entrance: 'Accesso' }[m[1]] || m[1]) + ' ' + m[2] + m[3],
    en: (m) => ({ Zona: 'Zone', Ambiente: 'Room', Passaggio: 'Passage', Accesso: 'Entrance' }[m[1]] || m[1]) + ' ' + m[2] + m[3],
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
const SPIA_ITALIANO = /\b(della|delle|degli|nella|sulla|dalla|non|sono|ancora|questo|questa|progetto|simulazione|vista|pianta|zona|ambiente|ambienti|varchi|livelli|occhio|misurat[aoie]|caricamento|tappe|percorso|persone|ingressi|accesso|verifiche|soglia|clicca|mancano|dati)\b/i;

// ---------------------------------------------------------------------------
// LA CONVERSAZIONE. I messaggi di EIDETICA nascono in italiano in una decina di
// punti del codice (misure, occhio, accessi, mappa di cammino). Con la
// piattaforma in inglese si traducono FRASE PER FRASE: una frase che qui non
// ha la sua forma resta com'e', intera — niente frasi tradotte a meta'.
// ---------------------------------------------------------------------------
const N = '(\\d+(?:[.,]\\d+)?)';
const rx = (s) => new RegExp('^' + s + '$');
const piu = (n, uno, tanti) => (n === '1' ? uno : tanti);

// Pezzi che il codice scrive in italiano DENTRO le frasi: nomi neutri, motivi,
// nomi delle voci degli ingressi.
const PEZZI = [
  [/\bZona (\d+)\b/g, 'Zone $1'], [/\bAmbiente (\d+)\b/g, 'Room $1'], [/\bPassaggio (\d+)\b/g, 'Passage $1'],
  [/\bAccesso (\d+)\b/g, 'Entrance $1'], [/(\d+) indizi d'accordo/g, '$1 agreeing clues'],
  [/il modello che vede non risponde/g, 'the vision model does not respond'],
  [/il cervello non ha risposto/g, 'the brain did not answer'], [/motivo ignoto/g, 'unknown reason'],
  [/la segnaletica del modello/g, "the model's signage"], [/gli oggetti in fila/g, 'objects in a row'],
  [/le persone gia' nel modello/g, 'people already in the model'], [/il tetto che finisce/g, 'where the roof ends'],
  [/l'occhio all'aperto/g, 'the eye outdoors'], [/l'occhio sul pontile/g, 'the eye on the jet bridge'],
];
const pezzi = (t) => PEZZI.reduce((s, [re, r]) => s.replace(re, r), t);

const TIPI_EN = { 'ambiente articolato': 'an articulated space', 'ambiente unico': 'a single space', 'non misurabile': 'a space that cannot be measured' };
function motivoEn(t) {
  return t
    .replace(/^(\d+) ambienti separati da (\d+) varchi reali/, '$1 rooms separated by $2 real openings')
    .replace(/^un solo spazio continuo di (\d+) m2, senza divisioni reali/, 'a single continuous space of $1 m², with no real divisions')
    .replace(/^(\d+) ambienti riconosciuti/, '$1 rooms recognized')
    .replace(/^il motore geometrico non ha riconosciuto superficie calpestabile/, 'the geometric engine found no walkable surface')
    .replace(/, su (\d+) livelli/, ', on $1 levels')
    .replace(/ \(scansione a gaussiane\)/, ' (Gaussian scan)');
}

export const FRASI = [
  [rx('Ho ricevuto il modello'), () => 'I received the model'],
  [rx("Prima sistemo l'ambiente: scala e appoggio a terra"), () => 'First I set up the environment: scale and ground placement'],
  [rx('Nel modello ci sono (\\d+) figure umane in piedi, alte ' + N + ' m'), (m) => `The model contains ${m[1]} standing human figures, ${m[2]} m tall`],
  [rx('Le ho portate a ' + N + ' m: modello ingrandito ' + N + ' volte PRIMA di misurare qualunque cosa'),
    (m) => `I brought them to ${m[1]} m: model scaled up ${m[2]} times BEFORE measuring anything`],
  [rx('Se il fattore non ti torna, scrivi "scala modello <n>" — tu la scala di questo spazio la riconosci meglio di qualunque regola'),
    () => 'If the factor looks wrong, type "scala modello <n>" — you know the scale of this space better than any rule'],
  [rx("⚠ La nuvola di punti e' troppo rada per la risoluzione che sto usando \\(spaziatura " + N + ' m contro celle da ' + N + ' m\\)(?:, su (\\d+) livelli)?'),
    (m) => `⚠ The point cloud is too sparse for the resolution I am using (spacing ${m[1]} m against ${m[2]} m cells)` + (m[3] ? `, on ${m[3]} levels` : '')],
  [rx('Le divisioni fra ambienti e le larghezze che ti dico NON sono affidabili: muri e banchi possono essere stati saldati fra loro, e due stanze contigue risultare una sola'),
    () => 'The room divisions and the widths I report are NOT reliable: walls and counters may have been merged, and two adjacent rooms may come out as one'],
  [rx('Ho assegnato (\\d+) zone su (\\d+) misurate: (.+)'), (m) => `I assigned ${m[1]} zones out of ${m[2]} measured: ${pezzi(m[3])}`],
  [rx("(\\d+) prendono il nome dal modello, le altre le ho dedotte dall'ordine del flusso"),
    (m) => `${m[1]} take their name from the model; I inferred the others from the order of the flow`],
  [rx("Nessuna aveva un nome riconoscibile nel modello, quindi i ruoli vengono dall'ordine del flusso"),
    () => 'None had a recognizable name in the model, so the roles come from the order of the flow'],
  [rx("Se un ruolo e' sbagliato dimmelo: `assegna <zona>` lo cambia"), () => 'If a role is wrong, tell me: `assegna <zona>` changes it'],
  [rx('Ho guardato le cose che stanno nello spazio: (\\d+) grupp[oi] di oggetti ripetuti su (\\d+) pezzi'),
    (m) => `I looked at the things in the space: ${m[1]} ${piu(m[1], 'group', 'groups')} of repeated objects out of ${m[2]} pieces`],
  [rx('Si addensano in (\\d+) post[oi]'), (m) => `They cluster in ${m[1]} ${piu(m[1], 'place', 'places')}`],
  [rx("Cosa siano lo dice l'occhio: qui ho solo misurato"), () => 'What they are, the eye will tell: here I only measured'],
  [rx("Cosa siano quegli arredi lo dice l'occhio; qui ho solo misurato"), () => 'What those furnishings are, the eye will tell; here I only measured'],
  [rx('Ho capito dove si cammina: (\\d+) m2 calpestabili, in (\\d+) parti separate fra loro \\(la piu grande (\\d+) m2\\)'),
    (m) => `I understood where one can walk: ${m[1]} m² walkable, in ${m[2]} separate parts (the largest ${m[3]} m²)`],
  [rx('Ho capito dove si cammina: (\\d+) m2 calpestabili, tutti collegati fra loro'), (m) => `I understood where one can walk: ${m[1]} m² walkable, all connected`],
  [rx('Le superfici troppo ripide, troppo piccole o senza spazio sopra la testa sono escluse: non ci si cammina'),
    () => 'Surfaces that are too steep, too small or without headroom are excluded: nobody walks there'],
  [rx('ho ricucito (\\d+) fessur[ae] fra pezzi di pavimento che il modello non fa toccare \\(la piu larga ' + N + ' m\\)(?:; (\\d+) passagg(?:io e rimasto chiuso|i sono rimasti chiusi): in mezzo c e un muro, e quella e una separazione vera)?'),
    (m) => `I stitched ${m[1]} ${piu(m[1], 'gap', 'gaps')} between floor pieces that the model does not join (the widest ${m[2]} m)`
      + (m[3] ? `; ${m[3]} ${piu(m[3], 'passage stayed', 'passages stayed')} closed: there is a wall in between, and that is a real separation` : '')],
  [rx('(\\d+) passagg(?:io e rimasto chiuso|i sono rimasti chiusi): in mezzo c e un muro, e quella e una separazione vera'),
    (m) => `${m[1]} ${piu(m[1], 'passage stayed', 'passages stayed')} closed: there is a wall in between, and that is a real separation`],
  [rx('Le tappe cadevano su (\\d+) aree che a piedi non si raggiungono fra loro'),
    (m) => `The stops fell on ${m[1]} areas that cannot be reached from each other on foot`],
  [rx("Ne ho appoggiate (\\d+) su (\\d+) sopra gli arredi che ho misurato — li' c'e' qualcosa di reale sotto(, e le altre le ho messe lungo il percorso che le unisce, perche' in questo modello non ci sono abbastanza arredi che si raggiungano a piedi fra loro)?"),
    (m) => `I placed ${m[1]} of ${m[2]} on the furnishings I measured — there is something real underneath`
      + (m[3] ? ', and I put the others along the path that joins them, because in this model there are not enough furnishings reachable on foot from each other' : '')],
  [rx('Non ho potuto guardare lo spazio \\((.+)\\)'), (m) => `I could not look at the space (${pezzi(m[1])})`],
  [rx('Uso solo le misure, come prima'), () => 'I use only the measures, as before'],
  [rx('Ho riconosciuto un (ambiente articolato|ambiente unico|non misurabile): (.+)'), (m) => `I recognized ${TIPI_EN[m[1]]}: ${motivoEn(m[2])}`],
  [rx('Area calpestabile (\\d+) m2'), (m) => `Walkable area ${m[1]} m²`],
  [rx("Passaggio piu' stretto: " + N + ' m'), (m) => `Narrowest passage: ${m[1]} m`],
  [rx('Ho trovato (\\d+) ingress[oi]: (.+)'), (m) => `I found ${m[1]} ${piu(m[1], 'entrance', 'entrances')}: ${pezzi(m[2])}`],
  [rx('Un ingresso e dove piu indizi diversi cadono nello stesso posto'), () => 'An entrance is where several different clues fall in the same place'],
  [rx("- (\\d+) oggetti uguali (in fila|in griglia|sparsi), (.+) m l'uno \\((.+)\\)"),
    (m) => `- ${m[1]} identical objects ${DISPOSIZIONE_EN[m[2]]}, ${m[3]} m each (${FORMA_EN[m[4]] || m[4]})`],
  [rx("Non ho trovato oggetti ripetuti in questo modello: non ci sono arredi, o sono tutti diversi fra loro"),
    () => 'I found no repeated objects in this model: there is no furniture, or it is all different'],
  [rx('Posso solo misurare lo spazio, non dire a cosa serve'), () => 'I can only measure the space, not say what it is for'],
  [rx('Ho visto (\\d+) livelli \\((.+)\\): li collegano (\\d+) ramp[ae] che si salgono a piedi'),
    (m) => `I saw ${m[1]} levels (${m[2]}): they are connected by ${m[3]} walkable ${piu(m[3], 'ramp', 'ramps')}`],
  [rx("Ho visto (\\d+) livelli \\((.+)\\): non ho trovato nessuna rampa che li colleghi, quindi da un piano all'altro a piedi non si passa"),
    (m) => `I saw ${m[1]} levels (${m[2]}): I found no ramp connecting them, so one cannot walk from one floor to another`],
];
const DISPOSIZIONE_EN = { 'in fila': 'in a row', 'in griglia': 'in a grid', sparsi: 'scattered' };
const FORMA_EN = {
  'segni per terra': 'marks on the floor',
  "oggetti in piedi, piu' stretti di una persona": 'standing objects, narrower than a person',
  "oggetti bassi, all'altezza di una seduta": 'low objects, at seat height',
  'oggetti a mezza altezza, come un bancone': 'waist-high objects, like a counter',
  'volumi grandi': 'large volumes',
  'oggetti staccati da terra, appesi o montati': 'objects off the ground, hanging or mounted',
};

// Parole che in una frase inglese tradiscono l'italiano rimasto: se dopo la
// traduzione ne resta una, la frase torna intera in italiano.
const SPIA_FRASE = /\b(della|delle|degli|nella|sulla|dalla|che|non|sono|ancora|questo|questa|gli|il|lo|piu|perche|dove|misurat[aoie]|ambient[ei]|varchi|livelli|occhio|tappe|persone|ingress[oi]|fra|loro|anche)\b/i;

/**
 * Un messaggio della conversazione («EIDETICA: ...») in inglese, frase per
 * frase, righe comprese. Restituisce anche le frasi rimaste in italiano.
 */
export function traduciMessaggio(testo) {
  const t = String(testo);
  const m = t.match(/^(EIDETICA|VERITAS): ([\s\S]*)$/);
  if (!m) return { testo: t, restano: [] };
  const restano = [];
  const righe = m[2].split('\n').map((rigaIntera) => rigaIntera.split(/(?<=\.)(\s+)(?=\S)/).map((pezzo) => {
    if (/^\s+$/.test(pezzo) || !pezzo) return pezzo;
    const lead = pezzo.match(/^\s*/)[0];
    const corpo = pezzo.slice(lead.length);
    const punto = /\.$/.test(corpo) ? '.' : '';
    const frase = punto ? corpo.slice(0, -1) : corpo;
    for (const [re, en] of FRASI) {
      const f = frase.match(re);
      if (!f) continue;
      const tradotta = en(f);
      if (SPIA_FRASE.test(tradotta)) break;
      return lead + tradotta + punto;
    }
    if (SPIA_FRASE.test(frase)) restano.push(frase.slice(0, 120));
    return pezzo;
  }).join(''));
  return { testo: m[1] + ': ' + righe.join('\n'), restano };
}

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
    // un messaggio della conversazione: frase per frase, a capo compresi
    if (/^(EIDETICA|VERITAS): /.test(orig)) {
      const finale = L === 'en' ? traduciMessaggio(orig) : { testo: orig, restano: [] };
      for (const r of finale.restano) if (restano.size < 200) restano.add(r);
      if (finale.testo !== ora) { n.nodeValue = finale.testo; tradotti++; }
      scritti.set(n, finale.testo);
      return;
    }
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
