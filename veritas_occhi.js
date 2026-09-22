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
// 1. Le CATEGORIE. Non sono nomi di spazi, e il nome non sta piu' qui.
// ---------------------------------------------------------------------------
//
// ⚠️ QUI C'ERA `FUNZIONI`: dodici NOMI di spazi (parcheggio, piazzale, pista,
//    ingresso, accoglienza, controlli, attesa, esposizione, commerciale,
//    corridoio, destinazione, servizi) decisi PRIMA di guardare qualunque
//    modello. Era la Regola 0-bis violata alla lettera, e faceva due danni
//    misurati:
//
//    1. FACEVA SPARIRE CIO' CHE ERA STATO CAPITO. Chi legge la risposta
//       cercava la parola in questa tabella e, non trovandola, scartava il
//       volume: `if (!t) return`. Il cervello poteva rispondere «sala
//       d'attesa» o «parcheggio esterno» — descrizioni giuste — e sparire in
//       silenzio. E' la stessa malattia delle quattro porte del 29/08:
//       pretendere una parola gia' nota da chi sta guardando per la prima
//       volta.
//    2. SI RICOPIAVA. Le dodici parole finivano dentro la domanda, e un
//       modello piccolo che non sa cosa dire ripete quello che ha appena
//       letto. Da qui «parcheggio, parcheggio, parcheggio, parcheggio» su
//       quattro zone di un aeroporto, visto da Raffaella il 31/08.
//
// Restano le CATEGORIE, che sono un'altra cosa: non dicono che spazio e', ma
// che RUOLO ha uno spazio dentro un edificio qualunque. Valgono per un
// aeroporto, una scuola, un ospedale, un museo, un negozio, e non nominano
// nessuno di questi. Servono al Core e alle soglie per sapere cosa verificare;
// non si mostrano all'utente.
//
// ⚠️ Le chiavi sono ESATTAMENTE quelle che il simulatore gia' conosce
//    (`TYPE_OPTIONS_DEF`, index.html ~282), piu' `escluso`. Non e' un dettaglio:
//    il 31/08 `corridoio` mandava il ruolo `passaggio`, che il motore non
//    conosce, e il ruolo capito si perdeva per strada. Una categoria che il
//    motore non sa leggere e' una categoria che non arriva.
//
// IL NOME NON STA PIU' NEL CODICE. Lo dice chi guarda, modello per modello, in
// italiano libero, in base a cio' che vede: «sala d'attesa» perche' ci sono le
// sedute in fila, «parcheggio» perche' ci sono le macchine.
export const CATEGORIE = Object.freeze([
  { chiave: 'origine', fuori: false,
    descrizione: "da dove le persone entrano, o dove arrivano prima di entrare" },
  { chiave: 'accoglienza', fuori: false,
    descrizione: "dove si viene ricevuti, registrati o serviti da qualcuno dall'altra parte di un banco" },
  { chiave: 'filtro', fuori: false,
    descrizione: 'un passaggio obbligato e stretto che seleziona o rallenta chi lo attraversa' },
  { chiave: 'sosta', fuori: false,
    descrizione: 'dove si sta fermi: seduti, in attesa, a guardare, a consumare, ad acquistare' },
  { chiave: 'distribuzione', fuori: false,
    descrizione: 'si attraversa e basta: serve a raggiungere altro, non a starci' },
  { chiave: 'destinazione', fuori: false,
    descrizione: "il punto per cui si e' venuti, o quello da cui si esce" },
  { chiave: 'servizio', fuori: false,
    descrizione: "a supporto dell'edificio e non del percorso del pubblico" },
  { chiave: 'esterno', fuori: true,
    descrizione: "fuori dall'involucro costruito, all'aperto" },
  { chiave: 'escluso', fuori: true,
    descrizione: 'superficie su cui il pubblico non cammina: manovra di mezzi, carico, aree tecniche' },
]);

// ⚠️ `tipo` e' LA STESSA COSA di `chiave`, ed e' ripetuto apposta. Il campo che
//    il simulatore legge sui nodi si chiama `type`, e tutti i lettori scritti
//    finora prendono `.tipo` dalla voce. Tenerlo evita che un lettore
//    dimenticato legga `undefined` e perda il ruolo IN SILENZIO: e' esattamente
//    il guasto costato il 31/08, e la sua firma e' un successo apparente.
const PER_CHIAVE = new Map(
  CATEGORIE.map((c) => [c.chiave, Object.freeze({ ...c, tipo: c.chiave })]));

/** La voce intera di una categoria — `{chiave, fuori, descrizione}` — o `null`. */
export function categoriaDi(chiave) {
  return PER_CHIAVE.get(String(chiave || '').trim().toLowerCase()) || null;
}

/**
 * La chiave di categoria, come STRINGA, o `null`.
 *
 * ⚠️ Restituisce una stringa, e chi legge deve saperlo. Il 31/08 tre chiamanti
 *    leggevano `.tipo` sul valore di ritorno — cioe' `.tipo` di una stringa,
 *    cioe' `undefined` — e il ruolo capito non arrivava mai al simulatore:
 *    restava quello messo per posizione. Se serve la voce intera si usa
 *    `categoriaDi`, non questa.
 */
export function tipoDiFunzione(chiave) {
  const c = categoriaDi(chiave);
  return c ? c.chiave : null;
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
  const voci = CATEGORIE.map((c) => `- ${c.chiave}: ${c.descrizione}`).join('\n');
  const elenco = zone.map((z, i) => {
    const n = i + 1;
    // ⚠️ NIENTE TESTO COPIABILE QUANDO L'AREA MANCA. Qui c'era
    //    'area ignota', e il 31/08 il modello l'ha restituita come NOME di
    //    tutte e sette le zone: «zona 1: area ignota» era l'ultima cosa che
    //    aveva letto, e l'ha ripetuta. Adesso, se l'area non c'e', della zona
    //    non si dice niente: nessuna frase da ricopiare.
    const a = z.area != null ? `${Math.round(z.area)} m2` : null;
    const forma = z.allungamento != null
      ? (z.allungamento > 3 ? ', stretta e lunga' : (z.allungamento < 1.5 ? ', compatta' : ''))
      : '';
    return a ? `zona ${n}: ${a}${forma}` : `zona ${n}`;
  }).join('\n');

  // ⚠️ QUI NON CI SONO PIU' ESEMPI DI RISPOSTA, ed e' voluto.
  //
  //    C'era un elenco «Cosa guardare» che finiva con «-> parcheggio»,
  //    «-> attesa», «-> controlli», e la riga del formato JSON conteneva la
  //    parola «parcheggio» come esempio. Un modello piccolo che non sa cosa
  //    dire ripete l'ultima cosa che ha letto: il 31/08 ha risposto
  //    «parcheggio» su quattro zone diverse di un aeroporto, e quelle quattro
  //    zone venivano rinominate davvero. Un esempio concreto dentro una
  //    domanda e' un'istruzione travestita.
  //
  //    Si dice COME si guarda — gli oggetti sono gli indizi, la funzione si
  //    deduce da quelli — senza mai dare una risposta gia' scritta.
  return [
    "Guardi la PLANIMETRIA di uno spazio reale — proiezione dall'alto, tagliata a 1,10 m dal pavimento, come si disegna in architettura — e devi dire CHE SPAZIO E' ognuna delle zone segnate.",
    dominio ? `Il progettista ha dichiarato che si tratta di: ${dominio}.` : '',
    // ⚠️ GLI ALTRI DISEGNI SI ANNUNCIANO, o restano immagini mute in coda.
    //    Un modello che riceve dieci figure senza sapere che cosa sono le
    //    tratta come varianti della prima. Qui si dice che cosa sono e a cosa
    //    servono: l'altezza e il numero dei piani, che in pianta non esistono.
    (Array.isArray(opz.contesto) && opz.contesto.length)
      ? `Dopo la planimetria trovi altri ${opz.contesto.length} disegni dello STESSO edificio: prospetti (i fronti visti da fuori), sezioni (l'edificio tagliato in verticale) e vedute prospettiche con il sole e le ombre. Servono a capire quanto e' alto, quanti piani ha, che cosa sta sopra a ogni zona e che aspetto hanno gli oggetti in rilievo. Le zone NON sono segnate su quei disegni: i numeri stanno solo sulla planimetria.`
      : '',
    '',
    "Sull'immagine sono segnate e NUMERATE alcune zone. Per ognuna dammi DUE cose:",
    '',
    "1. un NOME, in italiano, libero: come lo chiamerebbe chi ci lavora dentro.",
    "   Non scegli da un elenco — il nome lo decidi tu guardando. Deducilo dagli",
    "   OGGETTI che vedi: gli oggetti sono gli indizi da cui si capisce a cosa",
    "   serve uno spazio. Se in una zona non riconosci niente, dillo con il nome",
    "   piu' onesto che puoi.",
    '2. una CATEGORIA, che invece scegli fra queste, e sono ruoli validi in',
    '   qualunque edificio:',
    voci,
    '',
    'Le zone segnate sono:',
    elenco,
    '',
    'REGOLE FERREE:',
    '1. Rispondi SOLO con JSON, senza testo prima o dopo, senza ```:',
    '   {"zone": [{"n": <numero della zona>, "nome": "<il nome che dai tu>",',
    '              "categoria": "<una delle chiavi elencate sopra>",',
    '              "sicurezza": "alta" | "media" | "bassa"}, ...]}',
    '2. `categoria` deve essere ESATTAMENTE una delle chiavi elencate sopra.',
    '   `nome` invece e\' libero: non copiarlo dalle chiavi, e non copiarlo da',
    '   un\'altra zona.',
    '3. `sicurezza` vale "alta" se lo vedi chiaramente, "media" se lo deduci, "bassa" se stai tirando a indovinare.',
    '4. NON inventare misure, larghezze, aree, quote o distanze: quelle le misura la geometria, non tu.',
    '5. Se di una zona non sai dire niente, OMETTILA. Una zona in meno vale piu di una risposta a caso.',
    '6. Non aggiungere zone che non sono nell elenco.',
    '7. Zone diverse sono spazi diversi. Se ti accorgi di star dando lo stesso',
    '   nome a tutte, non hai guardato: guarda di nuovo, o ometti.',
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

    // ⚠️ IL NOME NON SI VALIDA PIU' CONTRO UN ELENCO, e questo e' il punto del
    //    cambiamento. Prima si cercava la parola in una tabella di dodici nomi
    //    e, non trovandola, si buttava tutta la zona: chi guardava per la
    //    prima volta doveva indovinare una parola decisa prima che guardasse.
    //    Ora il nome e' cio' che si e' capito, e si tiene com'e'.
    const nome = String((v && (v.nome || v.funzione)) || '').trim();
    if (!nome) { esito.scartate.push({ n, perche: 'nessun nome' }); continue; }

    // ⚠️ E IL NOME NON PUO' ESSERE LA CATEGORIA.
    //
    //    La regola 2 della domanda lo chiede gia' a parole — «non copiarlo
    //    dalle chiavi» — e il 22/09/2026 il modello l'ha disattesa lo stesso:
    //    sette zone su sette battezzate con la propria casella, «Zona di
    //    Sosta», «Zona di Servizio», «Zona di Filtro», «Zona di Origine».
    //    Non e' una lettura: e' l'elenco della domanda ricopiato, lo stesso
    //    difetto dei «quattro parcheggi» del 31/08 e di «area ignota».
    //
    //    Una parola che il modello ha appena letto nella domanda non e' una
    //    cosa che ha visto. Qui si butta la singola zona e si dice perche':
    //    la categoria resta valida, il nome no.
    const nudo = nome.toLowerCase()
      .replace(/^(zona|area|spazio|ambiente|locale)\s+(di|del|della|dei|delle|d')?\s*/, '')
      .replace(/[.\s]+$/, '').trim();
    if (PER_CHIAVE.has(nudo)) {
      esito.scartate.push({ n, perche: 'nome copiato dalla categoria («' + nome + '»)' });
      continue;
    }

    // Si valida SOLO la categoria, perche' quella la legge il simulatore e una
    // parola che non conosce si perde per strada. Se manca o e' sbagliata non
    // si butta la zona: si tiene il nome e si lascia il ruolo a chi ce l'ha
    // gia' — capito a meta' vale piu' di niente.
    const c = PER_CHIAVE.get(String((v && (v.categoria || v.ruolo)) || '').trim().toLowerCase());
    if (!c) esito.scartate.push({ n, perche: 'categoria non riconosciuta, tengo solo il nome' });

    const sic = String((v && v.sicurezza) || 'media').trim().toLowerCase();
    visto.add(n);
    esito.assegnate.push({
      indice: n - 1,
      nome: nome,
      funzione: c ? c.chiave : null,
      tipo: c ? c.chiave : null,
      fuori: c ? c.fuori : undefined,
      sicurezza: ['alta', 'media', 'bassa'].includes(sic) ? sic : 'media',
    });
  }

  // ⚠️ LA RISPOSTA CHE DICE SEMPRE LA STESSA COSA — vista da Raffaella il
  //    31/08 nel log: «Ho guardato la pianta e ho riconosciuto 4 zone su 7:
  //    parcheggio, parcheggio, parcheggio, parcheggio», e quelle quattro zone
  //    venivano rinominate DAVVERO, prima che il circuito completo aprisse
  //    bocca. Sullo schermo restavano quattro parcheggi dentro un aeroporto.
  //
  //    Non e' una lettura: e' un modello piccolo che si incastra su una parola
  //    e la ripete. Si butta TUTTA la risposta, non se ne salva una: se la
  //    parola e' sbagliata lo e' per tutte, e quale sarebbe quella giusta non
  //    si sa. Meglio nessun nome che quattro nomi finti. Sotto le tre zone non
  //    si giudica: due ambienti uguali capitano davvero.
  if (esito.assegnate.length >= 3) {
    const uniche = new Set(esito.assegnate.map((a) => a.nome.toLowerCase()));
    if (uniche.size === 1) {
      const parola = esito.assegnate[0].nome;
      for (const a of esito.assegnate) {
        esito.scartate.push({ n: a.indice + 1, perche: 'risposta uniforme: "' + parola + '" su tutte le zone' });
      }
      esito.assegnate = [];
      esito.uniforme = parola;
      try {
        console.warn('[VERITAS occhi] risposta buttata: "' + parola + '" su tutte le '
          + esito.scartate.length + ' zone lette. Un modello che ripete la stessa parola'
          + ' non ha guardato: meglio nessun nome che nomi finti.');
      } catch (e) {}
    }
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
/**
 * Una tavola dell'abaco (prospetto, sezione) diventa un'immagine da allegare.
 *
 * Non porta numeri di zona e non ne può portare: da una proiezione verticale
 * un punto a terra non si ricava, ed è la regola del 26/08. Serve a far vedere
 * l'edificio in alzato — quanti piani, quanto è alto, cosa c'è sopra.
 */
export function tavolaInImmagine(doc, tavola, opz = {}) {
  if (!doc || !tavola || !tavola.pixel) return null;
  const latoMax = opz.latoMax || 900;
  const tela = doc.createElement('canvas');
  tela.width = tavola.larghezza; tela.height = tavola.altezza;
  const ctx = tela.getContext('2d');
  const img = ctx.createImageData(tavola.larghezza, tavola.altezza);
  img.data.set(tavola.pixel);
  ctx.putImageData(img, 0, 0);
  const scala = Math.min(1, latoMax / Math.max(tavola.larghezza, tavola.altezza));
  let finale = tela;
  if (scala < 1) {
    finale = doc.createElement('canvas');
    finale.width = Math.max(1, Math.round(tavola.larghezza * scala));
    finale.height = Math.max(1, Math.round(tavola.altezza * scala));
    finale.getContext('2d').drawImage(tela, 0, 0, finale.width, finale.height);
  }
  return { dataURL: finale.toDataURL('image/png'), etichetta: tavola.etichetta || null,
           genere: tavola.genere || null };
}

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
// ⚠️ UNA DOMANDA ALLA VOLTA. Misurato il 22/09/2026 con LM Studio acceso: su
//    sedici chiamate, due sono partite NELLO STESSO SECONDO — una da 19
//    immagini e una da 6 — e tutte e due sono tornate HTTP 400. Le altre
//    quattordici, che erano in fila da sole, sono tornate 200.
//
//    LM Studio tiene UN modello in memoria e lo serve uno alla volta: due
//    richieste multimodali insieme non sono il doppio del lavoro, sono un
//    rifiuto. Qui non si cambia niente di quello che si chiede: si mette in
//    fila. Chi chiama non se ne accorge, aspetta un po' di piu' e ha la
//    risposta invece dell'errore.
//
//    Non e' un `inCorso` che scarta la seconda: scartarla vorrebbe dire
//    perdere una lettura. E' una coda, e nessuna domanda si perde.
let codaDelCervello = Promise.resolve();

export async function chiedi(dataURL, domanda, cfg, opz = {}) {
  const mia = codaDelCervello.then(() => chiediOra(dataURL, domanda, cfg, opz));
  // la coda prosegue anche se questa domanda fallisce: un errore non blocca
  // tutte le successive
  codaDelCervello = mia.then(() => undefined, () => undefined);
  return mia;
}

async function chiediOra(dataURL, domanda, cfg, opz = {}) {
  const url = (cfg && cfg.url) || 'http://localhost:1234/v1';
  const modello = (opz.modello || (cfg && cfg.modelloVista) || (cfg && cfg.model) || 'local-model');
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  // ⚠️ ERA 90 SECONDI. Stessa misura, stesso giorno: se il solo testo ne
  //    prende 24, un giro con le immagini ne prende molti di piu'. E il resto
  //    della catena aspetta gia' sette minuti prima di arrendersi
  //    («nessuna tappa dopo sette minuti»): tanto vale che il tempo del
  //    modello sia coerente con quello, invece di tagliare a meta' strada.
  const timer = ctrl ? setTimeout(() => ctrl.abort(), opz.timeoutMs || 360000) : null;
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
          // ⚠️ LA DOCUMENTAZIONE, NON UNA FIGURA SOLA — 21/09/2026.
          //    Raffaella: *«non sono solo le piante che devi dare all'occhio, ma
          //    l'occhio deve avere le sezioni, deve avere i prospetti... deve
          //    essere completa la documentazione tecnica che dai all'occhio, se
          //    no l'occhio che cavolo deve vedere»*.
          //    La PIANTA va per prima perché è l'unica con i numeri delle zone
          //    sopra: è la figura su cui si risponde. Prospetti e sezioni
          //    vengono dopo, e servono a sapere quant'è alto, quanti piani ci
          //    sono, cosa sta sopra — cose che da una pianta non si vedono.
          { role: 'user', content: [
            { type: 'text', text: domanda },
            { type: 'image_url', image_url: { url: dataURL } },
          ].concat((Array.isArray(opz.contesto) ? opz.contesto : [])
            .filter((c) => c && c.dataURL)
            .map((c) => ({ type: 'image_url', image_url: { url: c.dataURL } }))) },
        ],
      }),
      signal: ctrl ? ctrl.signal : undefined,
    });
    // ⚠️ IL MOTIVO, NON SOLO IL NUMERO. «HTTP 400» da solo non dice niente e
    //    costa un giro intero per capirlo: il corpo della risposta di LM Studio
    //    dice se il modello non e' caricato, se il contesto e' troppo lungo o
    //    se il nome del modello non esiste. Si legge e si riporta.
    if (!res.ok) {
      let perche = '';
      try { perche = (await res.text() || '').slice(0, 300).replace(/\s+/g, ' '); } catch (e) {}
      throw new Error('HTTP ' + res.status + (perche ? ' — ' + perche : ''));
    }
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

  // ⛔ LA FETTA A 45 cm E' STATA TOLTA — 21/09/2026, ordine di Raffaella.
  //    Fin qui il narratore riceveva una fetta alta 45 cm del modello intero
  //    schiacciato: un pavimento nudo, tutti i livelli uno sull'altro. Da
  //    quell'immagine non si legge un edificio, e un modello che RACCONTA non
  //    tace: produce nomi plausibili. E' così che sono nati «SALA D'ATTESA 9»
  //    su un passaggio e «PISTA 5» su un bancone.
  //    Adesso qui entra SOLO una planimetria d'architettura: `ctx.piantaPronta`,
  //    tagliata a 1,10 m sopra lo zero del suo livello. Se non c'è, non si
  //    ripiega su niente: si dichiara e si tace, che è l'unica cosa onesta.
  const pianta = ctx.piantaPronta;
  if (!pianta) return { disponibile: false,
    perche: 'nessuna planimetria: il narratore non guarda piu la fetta bassa a 45 cm' };

  const img = immagineConZone(doc, pianta, zone, vista.mondoAPixel, { latoMax: ctx.latoMax || 1024 });
  if (!img) return { disponibile: false, perche: 'non si e potuta preparare l immagine' };

  let testo;
  try {
    testo = await chiedi(img.dataURL,
      prompt(zone, { dominio: ctx.dominio, contesto: ctx.contesto }), cfg, ctx);
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
 * Le letture dei singoli piani tornano a essere un esito solo.
 *
 * Ogni zona compare una volta sola perche' e' stata mostrata su una pianta
 * sola. `piante` dice su quanti disegni si e' guardato: senza, una lettura
 * povera non si distingue da un edificio povero.
 */
export function unisciEsiti(pezzi, totale) {
  const tutti = (pezzi || []).filter(Boolean);
  const buoni = tutti.filter((e) => Array.isArray(e.assegnate));
  // ⚠️ SE NESSUNO HA LETTO, non si torna indietro a ridisegnare la fetta:
  //    si restituisce il primo fallimento com'e'. Porta con se' il MOTIVO
  //    («il modello che vede non risponde») e l'IMMAGINE che era stata
  //    preparata — cioè le due cose che servono a capire cos'e' successo.
  //    Ricadere sulla vecchia strada qui vorrebbe dire nascondere che il
  //    modello linguistico e' spento, disegnando in silenzio un'altra pianta.
  if (!buoni.length)
    return tutti.length ? Object.assign({}, tutti[0], { piante: tutti.length }) : null;
  const fuori = { disponibile: false, perche: null, assegnate: [], scartate: [],
                  totale: totale || 0, ms: 0, piante: buoni.length, grezza: null };
  const grezze = [];
  for (const e of buoni) {
    fuori.assegnate = fuori.assegnate.concat(e.assegnate);
    fuori.scartate = fuori.scartate.concat(e.scartate || []);
    fuori.ms += e.ms || 0;
    if (e.grezza) grezze.push(e.grezza);
    if (!fuori.immagine && e.immagine) fuori.immagine = e.immagine;
  }
  fuori.grezza = grezze.join('\n---\n') || null;
  fuori.disponibile = fuori.assegnate.length > 0;
  if (!fuori.disponibile) fuori.perche = 'il modello non ha riconosciuto nessuna zona';
  return fuori;
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
                + a.nome + (a.funzione ? ' (' + a.funzione + ')' : ''));
  const incerte = esito.assegnate.filter((a) => a.sicurezza === 'bassa').length;
  return 'Ho guardato la pianta e ho riconosciuto ' + esito.assegnate.length + ' zone su '
    + esito.totale + ': ' + nomi.join(', ') + '.'
    + (incerte ? ' Di ' + incerte + ' non sono sicuro.' : '')
    + (esito.scartate.length ? ' Ho scartato ' + esito.scartate.length + ' risposte che non tornavano.' : '')
    + ' Se ho sbagliato, dimmelo e correggo.';
}

export default {
  CATEGORIE, categoriaDi, tipoDiFunzione, prompt, estraiJSON, validaRisposta,
  riquadriZone, immagineConZone, tavolaInImmagine, chiedi, guarda, unisciEsiti, racconta,
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

  // ⚠️ SI GUARDA UNA VOLTA SOLA LO STESSO SPAZIO.
  //
  //    Misurato il 22/09/2026 con LM Studio acceso: in 17 minuti il giro e'
  //    ripartito SEI volte sulla stessa identica documentazione — 2 piante e
  //    18 allegati, 19 immagini per chiamata, cinque minuti a volta.
  //
  //    Non e' il cervello: `comprendi()` fa al massimo GIRI_MASSIMI = 2. E'
  //    che `applyAutoAssignment` (index.html) rilancia l'occhio ogni volta che
  //    riassegna le zone dalle misure, e in una sola passata si riassegna piu'
  //    volte mentre la scena si assesta — lo dice il commento li' accanto:
  //    «durante una passata applyAutoAssignment viene invocata tre volte».
  //
  //    Riguardare lo stesso disegno non e' «giro dopo giro fino a essere
  //    sicuri» (Regola 0): quello vuol dire CONVERGERE su qualcosa che cambia.
  //    Se lo spazio e' identico, la risposta a temperatura 0 e' identica, e
  //    l'unica cosa che cambia e' il tempo perso.
  //
  //    L'impronta NON contiene i nomi, ed e' voluto: l'occhio i nomi li
  //    cambia, e un'impronta che li guardasse si invaliderebbe da sola a ogni
  //    giro — il giro infinito al posto del giro doppio.
  let ultimaImpronta = null;
  const improntaDi = (zz) => zz.map((n) => {
    const p = n.pos || n.position || [0, 0, 0];
    return [Math.round(p[0] * 2), Math.round(p[1] * 2), Math.round(p[2] * 2),
            Math.round(n.area || 0)].join(',');
  }).join('|');

  window.__veritasOcchiGuarda = async function (zone, opz = {}) {
    if (inCorso) return { disponibile: false, perche: 'sto gia guardando' };
    const zz = zone || (typeof window.__veritasGetNodes === 'function'
      ? window.__veritasGetNodes() : null);
    if (!zz || !zz.length) return { disponibile: false, perche: 'nessuna zona da riconoscere' };

    const impronta = improntaDi(zz);
    if (!opz.comunque && impronta === ultimaImpronta) {
      console.log('[VERITAS occhi] le zone sono le stesse dell\'ultimo giro: non riguardo '
        + 'lo stesso disegno (per forzare: __veritasOcchiGuarda(null, {comunque: true}))');
      return window.__veritasOcchiEsito
        || { disponibile: false, perche: 'gia guardato, niente e cambiato' };
    }
    ultimaImpronta = impronta;

    inCorso = true;
    try {
      const base = {
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
      };

      // ⚠️ AL NARRATORE LA STESSA DOCUMENTAZIONE DEL RILEVATORE — 21/09/2026.
      //
      //    Questo è il modello che RACCONTA, e fino a oggi raccontava a partire
      //    da una fetta alta 45 cm del modello intero schiacciato: un pavimento
      //    nudo con qualche puntino, tutti i livelli uno sull'altro. Da
      //    un'immagine così un narratore non tace: produce nomi PLAUSIBILI.
      //    Misurato con Raffaella davanti allo schermo il 21/09 — «SALA
      //    D'ATTESA 9» su un passaggio, «PISTA 5» su un bancone dentro
      //    l'edificio: *«sembra avere le allucinazioni»*. Non erano
      //    allucinazioni: era la documentazione tecnica che non c'era.
      //
      //    Raffaella, lo stesso giorno: *«i disegni tecnici devono essere
      //    completi, visibili, dettagliati, si devono vedere tutte le zone»*.
      //    Ora riceve la PIANTA del livello su cui la zona poggia, tagliata a
      //    1,10 m — la stessa che riceve il rilevatore.
      //
      // ⛔ UN GIRO PER LIVELLO, con le sole zone di quel livello: chiedere di
      //    una zona del primo piano mostrando la pianta del terra è la domanda
      //    che ha prodotto quei nomi.
      const T = window.__veritasTavole, R = window.__veritasRiconosce;
      const misurati = (window.__veritasPercezione && window.__veritasPercezione.levels) || [];
      // ⚠️ NESSUN LIVELLO MISURATO NON VUOL DIRE NESSUNA PIANTA: vuol dire UN
      //    livello, quello del pavimento. Un edificio a un piano solo ha la sua
      //    planimetria come tutti gli altri. Così la fetta a 45 cm non rientra
      //    dalla finestra come «ripiego».
      const livelli = misurati.length ? misurati : [{}];
      let piante = [], contesto = [];
      if (T && typeof T.piantePerLivello === 'function') {
        try {
          // Due finezze diverse, e la ragione è il mestiere: sulla PIANTA si
          // deve leggere una seduta da 55 cm, quindi 2048. Prospetti e sezioni
          // dicono quanti piani e quanto è alto: a 1100 si leggono benissimo e
          // non affogano il modello di pixel.
          piante = T.piantePerLivello(window.THREE, window.__veritasRenderer,
            window.__veritasModelRoot, { livelli, lato: 2048 }) || [];
          if (typeof T.abaco === 'function' && typeof tavolaInImmagine === 'function') {
            const tutte = T.abaco(window.THREE, window.__veritasRenderer,
              window.__veritasModelRoot, { livelli, lato: 1100 }) || [];
            const doc = typeof document !== 'undefined' ? document : null;
            contesto = tutte.filter((t) => t.genere !== 'pianta')
              .map((t) => tavolaInImmagine(doc, t, { latoMax: 900 }))
              .filter(Boolean);
            // ⚠️ E LE PROSPETTIVE, COL SOLE E LE OMBRE — 21/09/2026.
            //    Raffaella: *«non solo le piante, anche i prospetti, le sezioni,
            //    le prospettive con il sole e le ombre... tutto, mi
            //    raccomando»*. Piante, prospetti e sezioni sono proiezioni
            //    ortogonali: dicono le misure e non dicono com'è stare dentro.
            //    La prospettiva sì, e con l'ombra portata si legge l'altezza di
            //    un volume — che in pianta non esiste (§6.9: senza luce non c'è
            //    forma).
            //    Quante: le decide `numeroScorci` dalla densità di mesh del
            //    modello, come per il rilevatore. Non un numero scelto qui.
            const V = window.__veritasVista;
            if (V && typeof V.scorciTreQuarti === 'function') {
              const scorci = V.scorciTreQuarti(window.THREE, window.__veritasRenderer,
                window.__veritasModelRoot, { conLuce: true, ombre: true }) || [];
              for (const sc of scorci) {
                const im = tavolaInImmagine(doc, sc, { latoMax: 900 });
                if (im) {
                  im.genere = 'prospettiva';
                  im.etichetta = sc.etichetta || ('veduta a '
                    + (typeof sc.azimuth === 'number'
                        ? Math.round(sc.azimuth * 180 / Math.PI) + '°' : '?'));
                  contesto.push(im);
                }
              }
            }
          }
        } catch (e) {
          piante = []; contesto = [];
          console.warn('[VERITAS occhi] i disegni non si sono fatti: ' + ((e && e.message) || e));
        }
      }
      const perGenere = contesto.reduce((a, c) => {
        a[c.genere || '?'] = (a[c.genere || '?'] || 0) + 1; return a; }, {});
      console.log('[VERITAS occhi] documentazione per il narratore: ' + piante.length
        + ' piante + ' + contesto.length + ' allegati ('
        + Object.keys(perGenere).map((k) => perGenere[k] + ' ' + k).join(', ') + ')');

      let esito = null;
      if (piante.length && R && typeof R.pianoDi === 'function') {
        const quote = piante.map((t) => t.quotaPiano);
        const perPiano = piante.map(() => []);
        zz.forEach((n, i) => {
          const p = n.pos || n.position || null;
          const y = p && typeof p[1] === 'number' ? p[1] : null;
          perPiano[R.pianoDi({ centro: [0, y, 0] }, quote)].push({ n, i });
        });
        console.log('[VERITAS occhi] ' + piante.length + ' piante per livello, zone per piano: '
          + perPiano.map((g, k) => (typeof quote[k] === 'number'
              ? 'quota ' + quote[k].toFixed(2) : '?') + ' → ' + g.length).join(' · '));
        const pezzi = [];
        for (let k = 0; k < piante.length; k++) {
          if (!perPiano[k].length) continue;
          const t = piante[k];
          const e = await guarda(Object.assign({}, base, {
            zone: perPiano[k].map((x) => x.n),
            piantaPronta: Object.assign({}, t.inquadratura,
              { pixel: t.pixel, quotaPavimento: t.quotaPiano }),
            contesto,
          }));
          // ⚠️ GLI INDICI TORNANO QUELLI VERI. Dentro il giro le zone sono
          //    rinumerate da 0: senza questa riga il nome del primo piano
          //    finirebbe sulla prima zona del piano terra — nomi plausibili e
          //    tutti spostati, cioè il difetto peggiore di tutti.
          if (e && Array.isArray(e.assegnate))
            for (const a of e.assegnate)
              if (perPiano[k][a.indice]) a.indice = perPiano[k][a.indice].i;
          pezzi.push(e);
        }
        esito = unisciEsiti(pezzi, zz.length);
      }
      // La strada di prima resta SOLO quando le piante per livello non ci sono
      // (nessun livello misurato): allora la fetta bassa e' il comportamento di
      // ieri. Se le piante c'erano e la lettura e' fallita, si dice perche'.
      if (!esito) esito = await guarda(base);

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
