// =============================================================================
// VERITAS — GLI OCCHI. Guardare lo spazio e dire cosa sono le cose.
// =============================================================================
//
// LA RICHIESTA
// Raffaella, 13/08/2026: *"Dovresti dare a questi agenti gli occhi, dovresti
// dare anche gli occhi per guardare le immagini e in questo caso i modelli."*
// E il 18/08, guardando il video: *"non capisce ancora l'AI cos'e' l'accesso,
// quindi il parcheggio dove ci sono i controlli, quindi il check-in. Non ha
// capito niente di quello che si trova di fronte."*
//
// LA DIFFERENZA CON TUTTO IL RESTO DEL PROGRAMMA
// La geometria sa MISURARE: quanto e' larga una porta, quanti metri quadri ha
// una sala, dove si stringe. Non sa e non sapra' mai che una superficie
// rettangolare con le righe bianche dipinte e' un PARCHEGGIO. Non e' un
// difetto di precisione: e' che il senso di uno spazio non sta nella sua forma.
// Un rettangolo di 30 x 15 m puo' essere un parcheggio, un atrio o una sala
// espositiva, e la differenza si vede guardando.
//
// CHE COSA SI E' CERCATO PRIMA DI SCRIVERE (Regola uno)
// Una libreria che guardi un modello 3D e dica "questo e' un parcheggio" NON
// ESISTE. Quello che esiste, ed e' concorde, e' la ricerca recente sul fatto
// che i modelli che vedono le immagini leggono bene le piante:
//   ViLLA — Vision-Language Layout Analyzer for Floor Plan Analysis (2026)
//   Vision Language Models Can Parse Floor Plan Maps (2026)
//   FloorplanVLM (arXiv 2602.06507)
// Il metodo di questi lavori e' sempre lo stesso: si da' al modello UNA pianta
// con le regioni gia' segnate e numerate, e gli si chiede solo di dire cosa
// sono. E' esattamente quello che si fa qui.
//
// E il progetto era gia' a meta' strada senza saperlo:
//   veritas_vista.js  disegna gia' la pianta ortografica, e i suoi pixel non
//                     dipendono da come e' stato costruito il modello
//   veritas_llm.js    ha gia' il ponte a un modello locale (LM Studio/Ollama,
//                     API compatibile OpenAI) e la regola giusta scritta:
//                     «la geometria MISURA, il modello CAPISCE L'INTENZIONE»
// Gli occhi sono l'unione di questi due pezzi.
//
// ⚠️ LA REGOLA CHE NON SI VIOLA
// Il modello che vede da' NOMI E RUOLI. Mai numeri, mai posizioni, mai quote,
// mai larghezze. In questo prodotto una misura contestata da un cliente deve
// poter essere rifatta identica, e un modello linguistico non e' riproducibile.
// Le zone restano dove le ha messe la geometria: gli occhi spostano le
// ETICHETTE, non i punti.
//
// ⚠️ E QUANDO NON C'E' NESSUN MODELLO ACCESO
// Si torna esattamente al comportamento di prima — ruoli dalle misure — e lo
// si dichiara. Gli occhi sono un miglioramento, non una dipendenza.
// =============================================================================

// ---------------------------------------------------------------------------
// 1. Il vocabolario: le uniche risposte ammesse
// ---------------------------------------------------------------------------
//
// Sono FUNZIONI, non nomi. Il nome lo mette poi il lessico del dominio che
// esiste gia' in index.html (LESSICO_ZONE): la stessa funzione "accoglienza"
// si chiama Accettazione in un aeroporto e Biglietteria in un museo.
//
// `tipo` e' il vocabolario PORTANTE del programma — spawn / checkin /
// security / lounge / gate / passaggio — su cui si appoggiano generatore di
// traiettorie, altezze dei marker e grafo delle missioni in una ventina di
// punti (§14.3 di CLAUDE.md). Gli occhi scelgono la funzione; il tipo ne
// discende per tabella. Nessuna risposta del modello puo' introdurre un tipo
// nuovo.
export const FUNZIONI = Object.freeze([
  { chiave: 'parcheggio', tipo: 'spawn', fuori: true,
    descrizione: 'parcheggio auto, stalli, piazzale di sosta dei veicoli' },
  { chiave: 'piazzale', tipo: 'spawn', fuori: true,
    descrizione: "spazio aperto esterno: piazza, sagrato, marciapiede, piazzale d'ingresso" },
  { chiave: 'pista', tipo: 'escluso', fuori: true,
    descrizione: 'area di manovra dei mezzi: pista, via di rullaggio, banchina di carico. NON ci cammina il pubblico' },
  { chiave: 'ingresso', tipo: 'spawn', fuori: false,
    descrizione: "atrio, hall, foyer, il primo spazio interno appena entrati" },
  { chiave: 'accoglienza', tipo: 'checkin', fuori: false,
    descrizione: 'banchi, sportelli, casse, biglietteria, reception, accettazione' },
  { chiave: 'controlli', tipo: 'security', fuori: false,
    descrizione: 'varchi di sicurezza, tornelli, metal detector, punto di filtro obbligato' },
  { chiave: 'attesa', tipo: 'lounge', fuori: false,
    descrizione: 'sedute, sala d attesa, area di sosta del pubblico' },
  { chiave: 'esposizione', tipo: 'lounge', fuori: false,
    descrizione: 'sala espositiva, mostra, area con opere o vetrine' },
  { chiave: 'commerciale', tipo: 'lounge', fuori: false,
    descrizione: 'negozi, bar, ristorazione, duty free' },
  { chiave: 'corridoio', tipo: 'passaggio', fuori: false,
    descrizione: 'passaggio stretto e allungato che serve solo a spostarsi' },
  { chiave: 'destinazione', tipo: 'gate', fuori: false,
    descrizione: "il punto di arrivo del percorso: gate d'imbarco, uscita finale, sala principale di destinazione" },
  { chiave: 'servizi', tipo: 'lounge', fuori: false,
    descrizione: 'bagni, depositi, locali tecnici, spazi di servizio' },
]);

const PER_CHIAVE = new Map(FUNZIONI.map((f) => [f.chiave, f]));

/** Il tipo portante che corrisponde a una funzione. `null` se non riconosciuta. */
export function tipoDiFunzione(chiave) {
  const f = PER_CHIAVE.get(String(chiave || '').trim().toLowerCase());
  return f ? f.tipo : null;
}

// ---------------------------------------------------------------------------
// 2. La domanda
// ---------------------------------------------------------------------------

/**
 * Costruisce la domanda da fare al modello che vede.
 *
 * Le zone si citano per NUMERO, lo stesso disegnato sull'immagine. Non si
 * passano le coordinate: se il modello le vedesse potrebbe ragionare sui
 * numeri invece che sull'immagine, ed e' il contrario di quello che serve.
 * Le uniche misure che si danno sono area e forma, perche' aiutano a
 * distinguere un corridoio da una sala e il modello non puo' ricavarle da
 * un'immagine senza scala.
 */
export function prompt(zone, opz = {}) {
  const dominio = opz.dominio || null;
  const voci = FUNZIONI.map((f) => `- ${f.chiave}: ${f.descrizione}`).join('\n');
  const elenco = zone.map((z, i) => {
    const n = i + 1;
    const a = z.area != null ? `${Math.round(z.area)} m2` : 'area ignota';
    const forma = z.allungamento != null
      ? (z.allungamento > 3 ? ', stretta e lunga' : (z.allungamento < 1.5 ? ', compatta' : ''))
      : '';
    return `zona ${n}: ${a}${forma}`;
  }).join('\n');

  return [
    "Guardi la pianta di uno spazio reale, vista dall'alto, e devi dire A COSA SERVE ogni zona.",
    dominio ? `Il progettista ha dichiarato che si tratta di: ${dominio}.` : '',
    '',
    "Sull'immagine sono segnate e NUMERATE alcune zone. Per ciascuna scegli UNA funzione fra queste:",
    voci,
    '',
    'Le zone segnate sono:',
    elenco,
    '',
    'REGOLE FERREE:',
    "1. Rispondi SOLO con JSON: {\"zone\": [{\"n\": 1, \"funzione\": \"parcheggio\", \"sicurezza\": \"alta\"}, ...]}",
    '2. `funzione` deve essere ESATTAMENTE una delle parole elencate sopra. Niente sinonimi, niente parole nuove.',
    '3. `sicurezza` vale "alta" se lo vedi chiaramente, "media" se lo deduci, "bassa" se stai tirando a indovinare.',
    '4. NON inventare misure, larghezze, aree, quote o distanze: quelle le misura la geometria, non tu.',
    '5. Se di una zona non sai dire niente, OMETTILA. Una zona in meno vale piu di una risposta a caso.',
    '6. Non aggiungere zone che non sono nell elenco.',
    '',
    'Cosa guardare:',
    "- righe bianche parallele e regolari a terra, in file -> parcheggio",
    "- file di sedute allineate -> attesa",
    "- una fila di banchi o sportelli lungo una parete -> accoglienza",
    "- un passaggio obbligato stretto con varchi affiancati -> controlli",
    "- asfalto ampio e vuoto, segnaletica gialla larga, mezzi -> pista",
    "- uno spazio lungo e stretto senza arredi -> corridoio",
  ].filter(Boolean).join('\n');
}

// ---------------------------------------------------------------------------
// 3. La rete: cosa si accetta di quello che risponde
// ---------------------------------------------------------------------------

/** Come `estraiJSON` di veritas_llm.js: i modelli piccoli incorniciano il JSON. */
export function estraiJSON(testo) {
  if (typeof testo !== 'string') return null;
  const i = testo.indexOf('{');
  if (i < 0) return null;
  let liv = 0;
  for (let k = i; k < testo.length; k++) {
    if (testo[k] === '{') liv++;
    else if (testo[k] === '}') {
      liv--;
      if (liv === 0) { try { return JSON.parse(testo.slice(i, k + 1)); } catch (e) { return null; } }
    }
  }
  return null;
}

/**
 * Verifica la risposta contro le zone che ESISTONO davvero.
 *
 * Tutto quello che non combacia si scarta e si conta: un numero di zona che
 * non esiste, una funzione fuori vocabolario, due risposte per la stessa zona.
 * Il conteggio degli scarti non e' cosmetico — e' il modo di accorgersi che il
 * modello acceso non e' adatto, invece di fidarsi di mezze risposte.
 */
export function validaRisposta(testo, zone) {
  const dati = typeof testo === 'string' ? estraiJSON(testo) : testo;
  const esito = { assegnate: [], scartate: [], totale: zone.length };
  if (!dati || !Array.isArray(dati.zone)) {
    esito.scartate.push({ perche: 'risposta non leggibile' });
    return esito;
  }
  const visto = new Set();
  for (const v of dati.zone) {
    const n = Number(v && v.n);
    if (!Number.isInteger(n) || n < 1 || n > zone.length) {
      esito.scartate.push({ n: v && v.n, perche: 'zona inesistente' });
      continue;
    }
    if (visto.has(n)) { esito.scartate.push({ n, perche: 'zona gia assegnata' }); continue; }
    const chiave = String((v && v.funzione) || '').trim().toLowerCase();
    const f = PER_CHIAVE.get(chiave);
    if (!f) { esito.scartate.push({ n, perche: 'funzione fuori vocabolario: ' + chiave }); continue; }
    const sic = String((v && v.sicurezza) || 'media').trim().toLowerCase();
    visto.add(n);
    esito.assegnate.push({
      indice: n - 1,
      funzione: f.chiave,
      tipo: f.tipo,
      fuori: f.fuori,
      sicurezza: ['alta', 'media', 'bassa'].includes(sic) ? sic : 'media',
    });
  }
  return esito;
}

// ---------------------------------------------------------------------------
// 4. Guardare: dalla pianta all'immagine da mandare
// ---------------------------------------------------------------------------

/**
 * Dove cade ogni zona sull'immagine della pianta.
 * Logica pura: serve per disegnare i numeri e si prova senza browser.
 */
export function riquadriZone(inq, zone, mondoAPixel) {
  const out = [];
  for (let i = 0; i < zone.length; i++) {
    const z = zone[i];
    const p = z.pos || z.position || null;
    if (!p) { out.push(null); continue; }
    const px = mondoAPixel(inq, p[0], p[2]);
    if (!px) { out.push(null); continue; }
    // Raggio indicativo: dall'area, se c'e'. Serve a dare al modello un'idea
    // dell'estensione, non a definire un confine — i confini sono geometria.
    const r = z.area ? Math.sqrt(z.area / Math.PI) / inq.metriPerPixel : 20;
    out.push({ indice: i, numero: i + 1, px: px[0], py: px[1], raggio: Math.max(12, r) });
  }
  return out;
}

/**
 * Disegna la pianta con le zone numerate, e la restituisce come PNG.
 *
 * ⚠️ `readRenderTargetPixels` restituisce le righe dal basso verso l'alto,
 *    al contrario di come le vuole un canvas: senza il ribaltamento il modello
 *    guarderebbe la pianta a testa in giu' — e risponderebbe lo stesso,
 *    sbagliando in modo plausibile. E' il tipo di difetto silenzioso di §11.5.
 *
 * @param doc       document (iniettato: cosi' si prova con uno stub)
 * @param pianta    uscita di piantaDelPavimento
 */
export function immagineConZone(doc, pianta, zone, mondoAPixel, opz = {}) {
  if (!doc || !pianta) return null;
  const latoMax = opz.latoMax || 1024;
  const c0 = doc.createElement('canvas');
  c0.width = pianta.larghezza; c0.height = pianta.altezza;
  const g0 = c0.getContext('2d');
  const img = g0.createImageData(pianta.larghezza, pianta.altezza);
  const larg = pianta.larghezza, alt = pianta.altezza;
  for (let y = 0; y < alt; y++) {
    const src = (alt - 1 - y) * larg * 4, dst = y * larg * 4;
    for (let x = 0; x < larg * 4; x++) img.data[dst + x] = pianta.pixel[src + x];
  }
  g0.putImageData(img, 0, 0);

  // Il fondo trasparente diventa nero in PNG e confonde: si mette il grigio di
  // un foglio, cosi' quello che non e' stato modellato si vede che e' vuoto.
  const scala = Math.min(1, latoMax / Math.max(larg, alt));
  const c = doc.createElement('canvas');
  c.width = Math.max(1, Math.round(larg * scala));
  c.height = Math.max(1, Math.round(alt * scala));
  const g = c.getContext('2d');
  g.fillStyle = '#eceff1';
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(c0, 0, 0, c.width, c.height);

  const riquadri = riquadriZone(pianta, zone, mondoAPixel);
  g.lineWidth = Math.max(2, 3 * scala);
  g.font = 'bold ' + Math.max(14, Math.round(26 * scala)) + 'px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const q of riquadri) {
    if (!q) continue;
    // Il canvas ha l'origine in alto a sinistra; la pianta e' gia' ribaltata.
    const x = q.px * scala, y = (alt - 1 - q.py) * scala, r = Math.max(14, q.raggio * scala);
    g.strokeStyle = 'rgba(220,30,60,0.95)';
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(220,30,60,0.95)';
    g.beginPath(); g.arc(x, y, Math.max(12, 15 * scala), 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    g.fillText(String(q.numero), x, y);
  }
  return { dataURL: c.toDataURL('image/png'), larghezza: c.width, altezza: c.height, riquadri };
}

// ---------------------------------------------------------------------------
// 5. Chiedere
// ---------------------------------------------------------------------------

/**
 * Manda immagine e domanda al modello che vede.
 *
 * Usa lo stesso indirizzo e lo stesso modello configurati per veritas_llm.js:
 * un solo posto da accendere, un solo posto da configurare. Se non risponde,
 * non e' un errore dell'utente — si torna alle misure e lo si dice.
 */
export async function chiedi(dataURL, domanda, cfg, opz = {}) {
  const url = (cfg && cfg.url) || 'http://localhost:1234/v1';
  const modello = (opz.modello || (cfg && cfg.modelloVista) || (cfg && cfg.model) || 'local-model');
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), opz.timeoutMs || 90000) : null;
  try {
    const res = await fetch(url + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modello,
        // Temperatura 0: la stessa pianta deve dare sempre la stessa lettura.
        // Uno strumento che cambia idea fra due analisi identiche non e'
        // difendibile davanti a un cliente.
        temperature: 0,
        max_tokens: opz.maxTokens || 900,
        messages: [
          { role: 'user', content: [
            { type: 'text', text: domanda },
            { type: 'image_url', image_url: { url: dataURL } },
          ] },
        ],
      }),
      signal: ctrl ? ctrl.signal : undefined,
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const d = await res.json();
    return d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
  } finally { if (timer) clearTimeout(timer); }
}

// ---------------------------------------------------------------------------
// 6. Il giro completo
// ---------------------------------------------------------------------------

/**
 * Guarda il modello e dice cosa sono le zone.
 *
 * Restituisce sempre un esito leggibile, anche quando fallisce: `disponibile`
 * dice se il modello ha risposto, `perche` dice cosa e' andato storto. Chi
 * chiama decide cosa farne — qui non si applica niente.
 */
export async function guarda(ctx) {
  const { THREE, renderer, radice, zone, vista, doc, cfg } = ctx;
  const t0 = Date.now();
  if (!zone || !zone.length) return { disponibile: false, perche: 'nessuna zona da riconoscere' };
  if (!THREE || !renderer || !radice || !vista || !doc)
    return { disponibile: false, perche: 'manca la scena da guardare' };

  const pianta = vista.piantaDelPavimento(THREE, renderer, radice, {
    metriPerPixel: ctx.metriPerPixel || 0.05,
    latoMax: 2048,
    punti: ctx.punti || null,
  });
  if (!pianta) return { disponibile: false, perche: 'non si e potuta disegnare la pianta' };

  const img = immagineConZone(doc, pianta, zone, vista.mondoAPixel, { latoMax: ctx.latoMax || 1024 });
  if (!img) return { disponibile: false, perche: 'non si e potuta preparare l immagine' };

  let testo;
  try {
    testo = await chiedi(img.dataURL, prompt(zone, { dominio: ctx.dominio }), cfg, ctx);
  } catch (e) {
    return { disponibile: false, perche: 'il modello che vede non risponde ('
             + ((e && e.message) || e) + ')', immagine: img };
  }

  const esito = validaRisposta(testo, zone);
  return {
    disponibile: esito.assegnate.length > 0,
    perche: esito.assegnate.length ? null : 'il modello non ha riconosciuto nessuna zona',
    ...esito,
    ms: Date.now() - t0,
    immagine: img,
    grezza: testo,
  };
}

/**
 * Riassunto in italiano normale, da dire in chat.
 * Non e' cosmetica: un'analisi automatica deve dichiarare cosa ha capito,
 * perche' e' l'unico momento in cui chi guarda lo schermo puo' correggerla.
 */
export function racconta(esito, zone) {
  if (!esito || !esito.disponibile)
    return "Non ho potuto guardare lo spazio (" + ((esito && esito.perche) || 'motivo ignoto')
         + "). Uso solo le misure, come prima.";
  const nomi = esito.assegnate
    .filter((a) => a.sicurezza !== 'bassa')
    .map((a) => (zone && zone[a.indice] && zone[a.indice].nome ? zone[a.indice].nome + ': ' : '')
                + a.funzione);
  const incerte = esito.assegnate.filter((a) => a.sicurezza === 'bassa').length;
  return 'Ho guardato la pianta e ho riconosciuto ' + esito.assegnate.length + ' zone su '
    + esito.totale + ': ' + nomi.join(', ') + '.'
    + (incerte ? ' Di ' + incerte + ' non sono sicuro.' : '')
    + (esito.scartate.length ? ' Ho scartato ' + esito.scartate.length + ' risposte che non tornavano.' : '')
    + ' Se ho sbagliato, dimmelo e correggo.';
}

export default {
  FUNZIONI, tipoDiFunzione, prompt, estraiJSON, validaRisposta,
  riquadriZone, immagineConZone, chiedi, guarda, racconta,
};

// ---------------------------------------------------------------------------
// 7. L'aggancio al programma
// ---------------------------------------------------------------------------
//
// Un solo punto d'ingresso, `guardaOra()`, che raccoglie da se' quello che
// serve dalle globali gia' esposte. Lo chiama `assegnaZoneMisurate` in fondo
// al suo lavoro: prima le misure, poi gli occhi, cosi' se il modello e' spento
// resta esattamente il comportamento di prima.
if (typeof window !== 'undefined') {
  let inCorso = false;

  window.__veritasOcchiGuarda = async function (zone, opz = {}) {
    if (inCorso) return { disponibile: false, perche: 'sto gia guardando' };
    const zz = zone || (typeof window.__veritasGetNodes === 'function'
      ? window.__veritasGetNodes() : null);
    if (!zz || !zz.length) return { disponibile: false, perche: 'nessuna zona da riconoscere' };

    inCorso = true;
    try {
      const esito = await guarda({
        THREE: window.THREE,
        renderer: window.__veritasRenderer,
        radice: window.__veritasModelRoot,
        zone: zz,
        vista: window.__veritasVista,
        doc: typeof document !== 'undefined' ? document : null,
        cfg: window.__veritasLLM ? window.__veritasLLM.cfg : null,
        dominio: window.__veritasProjectType || null,
        punti: window.__veritasUltimiPunti || null,
        ...opz,
      });

      // Si dichiara sempre: anche "non ho potuto guardare" e' un'informazione,
      // ed e' l'unico momento in cui chi guarda lo schermo puo' correggere.
      const detto = racconta(esito, zz);
      console.log('[VERITAS occhi]', detto, esito.grezza ? '\n  risposta grezza: ' + esito.grezza : '');
      if (typeof window.__veritasAnnounce === 'function') {
        try { window.__veritasAnnounce(detto); } catch (e) {}
      }
      window.__veritasOcchiEsito = esito;

      // L'applicazione la fa il programma, non gli occhi: qui non si tocca
      // nessuna zona. Gli occhi propongono, l'ordine di autorita' decide.
      if (esito.disponibile && typeof window.__veritasApplicaOcchi === 'function') {
        try { window.__veritasApplicaOcchi(esito, zz); }
        catch (e) { console.error('[VERITAS occhi] applicazione fallita:', e); }
      }
      return esito;
    } finally { inCorso = false; }
  };

  // Comando di console, per rifarlo a mano quando si accende il modello dopo.
  window.__veritasCommandExtensions = window.__veritasCommandExtensions || [];
  window.__veritasCommandExtensions.push(function (raw) {
    if (!/^\s*(occhi|guarda|riconosci)\s*$/i.test(String(raw || ''))) return false;
    const dillo = window.__veritasChatLog || function () {};
    dillo('system', 'Guardo la pianta...');
    window.__veritasOcchiGuarda();
    return true;
  });

  console.log('[VERITAS occhi] pronti — scrivi "occhi" per far guardare la pianta '
    + '(serve un modello che vede acceso: LM Studio, Ollama)');
}
