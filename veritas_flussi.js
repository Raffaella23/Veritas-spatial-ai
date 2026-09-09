// =============================================================================
// VERITAS — I FLUSSI. Da dove si entra, e dove si va a finire.
// =============================================================================
//
// PERCHE' ESISTE QUESTO FILE
//
// Fino al 01/09/2026 il programma teneva UNA FILA SOLA. Dentro
// `generateTrajectory` c'erano tre righe che decidevano tutto:
//
//     const TYPE_ORDER = ["accoglienza", "filtro", "sosta"];
//     for (const ty of TYPE_ORDER) { const n = nodes.find(nd => nd.type === ty); ... }
//     rawPath = [ingresso].concat(trunk, [gate]);
//
// `find` prende il PRIMO che trova: una accoglienza, un filtro, una sosta, gli
// stessi per tutti. Chiunque entrasse, da qualunque porta, faceva quella fila
// li' e finiva a un gate. Un verso solo, un percorso solo.
//
// Detto da Raffaella il 01/09, guardando la simulazione: *«l'AI ha messo
// l'origine correttamente vicino al tunnel che collega aereo e terminal, ma
// quello e' il flusso in arrivo, ed e' uno solo. Dovrebbe assegnare anche
// l'ingresso dalla strada: occhio e cervello riconoscono l'aeroporto e
// assegnano TUTTI i flussi che si generano, non solo uno.»*
//
// E non era l'occhio a sbagliare: non c'era DOVE METTERLO. Anche riconoscendo
// quattro flussi, il programma ne poteva tenere uno.
//
// COSA FA QUESTO FILE, ED E' POCO APPOSTA
//
// Un flusso e' una fila di tappe con due capi: da dove si entra a dove si
// esce. Questo file rende i flussi una cosa che il programma sa contare,
// nominare e percorrere — piu' di uno, ognuno con la sua gente.
//
// ⚠️ OGGI COSTRUISCE ESATTAMENTE QUELLO CHE C'ERA PRIMA, e lo fa apposta: un
//    flusso per ogni coppia ingresso-uscita, con in mezzo le stesse tappe di
//    prima. Stessa immagine a schermo, nessuna regressione. Il guadagno e' che
//    adesso i flussi si possono DICHIARARE da fuori (`imposta`), ed e' li' che
//    entreranno i due passi seguenti:
//
//      2. gli ACCESSI — un flusso nasce a ogni modo di entrare dal fuori: la
//         strada delle macchine, il tunnel dell'aereo, il cancello di una
//         scuola, il pronto soccorso di un ospedale. Non e' una parola di
//         tipologia: e' «quante porte sul mondo ci sono».
//      3. L'ORDINE dentro ogni flusso, dagli indizi che l'occhio riconosce:
//         i portali di sicurezza si attraversano in un verso solo, i banchi
//         dei documenti stanno prima, le sedute in fila sono la sosta.
//
// ⚠️ `ORDINE_DI_MEZZO` E' ANCORA UNA FILA D'AEROPORTO, e resta un difetto
//    dichiarato: accoglienza, filtro, sosta. Una scuola non ce l'ha, un
//    ospedale nemmeno. Si toglie al passo 3, quando l'ordine verra' dagli
//    indizi — non prima, perche' senza qualcosa al suo posto la simulazione
//    resterebbe senza tappe (§ punto 1 dell'elenco in HANDOFF.md).
// =============================================================================

// Le tappe di mezzo, nell'ordine in cui si attraversano. E' l'ultima fila
// cablata che resta, ed e' dichiarata come tale qui sopra.
export const ORDINE_DI_MEZZO = ['accoglienza', 'filtro', 'sosta'];

/** Massimo comun divisore e minimo comune multiplo, per accoppiare senza resti. */
function mcd(a, b) { while (b) { const t = a % b; a = b; b = t; } return a; }
function mcm(a, b) { return (a * b) / mcd(a, b); }

/** Il nome di una tappa, comunque si chiami il campo. */
function nomeDi(n) {
  return (n && (n.label || n.name || n.nome)) || 'una tappa';
}

/**
 * Costruisce i flussi a partire dalle tappe.
 *
 * Un flusso: `{ nome, tappe: [nodi in ordine], quota, entrata, uscita }`.
 * `quota` e' la parte di gente che lo percorre, e le quote sommano a 1.
 *
 * ⚠️ Riproduce l'accoppiamento che il motore faceva prima — il gruppo `g`
 *    entrava dal varco `g % ingressi` e usciva dal gate `g % uscite` — cosi'
 *    la stessa scena resta la stessa scena. Non e' una scelta di stile: un
 *    rifacimento che cambia anche l'immagine non si sa piu' se ha funzionato.
 */
export function costruisciFlussi(nodi, opz = {}) {
  const tutte = (nodi || []).filter((n) => n && n.pos);
  if (!tutte.length) return [];

  const ingressi = tutte.filter((n) => n.type === 'origine');
  const uscite = tutte.filter((n) => n.type === 'destinazione');
  const mezzo = [];
  for (const ty of (opz.ordineDiMezzo || ORDINE_DI_MEZZO)) {
    const n = tutte.find((x) => x.type === ty);
    if (n) mezzo.push(n);
  }

  let entrate = ingressi.slice();

  // GLI ACCESSI (`veritas_accessi.js`): dove il tetto finisce e si continua a
  // camminare. Ognuno fa nascere un flusso, ed e' la risposta al «manca
  // l'ingresso dalla strada»: una tappa di tipo origine li' puo' non esserci —
  // nessuno l'ha dichiarata, e la comprensione non ci e' arrivata — ma la
  // porta nel modello c'e' lo stesso, e si misura.
  const accessi = opz.accessi || (typeof window !== 'undefined'
    && window.__veritasAccessi && window.__veritasAccessi.accessi) || [];
  for (const a of accessi) {
    if (!a || !a.centro) continue;
    // Se una tappa di ingresso sta gia' li', l'accesso non ne aggiunge una
    // seconda: sarebbe lo stesso ingresso contato due volte.
    const gia = entrate.some((n) => Math.hypot(n.pos[0] - a.centro[0], n.pos[2] - a.centro[2])
      < (opz.stessoIngressoM || 8));
    if (gia) continue;
    entrate.push({
      label: a.nome || 'Accesso', type: 'origine', origine: 'accesso',
      pos: a.centro.slice(), larghezza: a.larghezza,
    });
  }

  // Nessun ingresso dichiarato e nessun accesso misurato: se ne elegge uno, la
  // tappa piu' lontana dalle uscite. E' la definizione operativa di «da che
  // parte si entra» quando nessuno l'ha detto — il lato terra, opposto al lato
  // volo.
  if (!entrate.length) {
    const rif = uscite.length ? uscite[0].pos : tutte[tutte.length - 1].pos;
    let meglio = null, dist = -1;
    for (const n of tutte) {
      if (n.type === 'destinazione') continue;
      const d = Math.hypot(n.pos[0] - rif[0], n.pos[2] - rif[2]);
      if (d > dist) { dist = d; meglio = n; }
    }
    if (meglio) entrate = [meglio];
  }

  // Senza due capi non c'e' un flusso: si percorre quello che c'e', in fila,
  // ed e' il comportamento di riserva che il motore aveva gia'.
  if (!entrate.length || !uscite.length) {
    const prima = entrate[0] || tutte[0];
    const tappe = [prima].concat(tutte.filter((n) => n !== prima));
    return [{ nome: 'flusso unico', tappe, quota: 1, entrata: prima, uscita: tappe[tappe.length - 1] }];
  }

  // Quanti flussi: tanti quanti bastano perche' ogni ingresso si accoppi con
  // ogni uscita almeno una volta, senza ripetere.
  const quanti = Math.min(opz.massimoFlussi || 12, mcm(entrate.length, uscite.length));
  const flussi = [];
  for (let i = 0; i < quanti; i++) {
    const entrata = entrate[i % entrate.length];
    const uscita = uscite[i % uscite.length];
    flussi.push({
      nome: nomeDi(entrata) + ' → ' + nomeDi(uscita),
      tappe: [entrata].concat(mezzo, [uscita]),
      quota: 1 / quanti,
      entrata, uscita,
    });
  }
  return flussi;
}


// ---------------------------------------------------------------------------
// LE MISSIONI — 09/09/2026. E' il «passo 3» promesso qui sopra.
// ---------------------------------------------------------------------------
//
// Raffaella, guardando la simulazione: *«tutte le varie tipologie fanno tutti
// in fila indiana, tutte le tappe. Quelli che lavorano agli aerei rimangono sul
// piazzale, quelli che arrivano arrivano al lato strada, quelli che atterrano
// arrivano dagli aerei e passano attraverso i tunnel. Adesso tutti fanno tutto,
// ed e' un tour panoramico di tutte le zone.»*
//
// E poi, ad alta voce, la cosa che cambia l'impianto:
// *«in base alla tipologia la categoria viene assegnata a ciascun agente, ma in
// sostanza la categoria e' un TARGET, un obiettivo. E' come se lo stessimo
// gamificando: sa che deve entrare, fare il check-in, lasciare il bagaglio,
// fino alla sala d'aspetto, al gate, al tubo, all'aereo.»*
//
// QUINDI: UN PROFILO NON E' UN PERCORSO, E' UNA MISSIONE.
// Non una linea da seguire, ma un elenco di tappe da COMPIERE. E la conseguenza
// vera e' che la simulazione smette di essere un filmato e diventa una PROVA:
// l'edificio o permette di completare la missione, o no — e dove non lo
// permette, quella e' la scoperta.
//
// ⛔ DUE DIFETTI CHE QUESTO SOSTITUISCE, misurati il 09/09 sul log:
//   1. `mezzo` prendeva UNA zona per categoria (con `find`) e la dava a TUTTI
//      i flussi: cambiavano la porta d'ingresso e il punto finale, il mezzo era
//      identico. La fila indiana era scritta li'.
//   2. Senza nemmeno una tappa marcata «destinazione» si cadeva su «flusso
//      unico»: una fila sola con dentro tutto. E' quello che e' successo
//      sull'aeroporto — otto profili distanti 1,2 m l'uno dall'altro.
//
// COME SI RICAVA L'ORDINE, SENZA UNA PAROLA DI TIPOLOGIA
// Non da un elenco cablato (ORDINE_DI_MEZZO era «accoglienza, filtro, sosta»,
// cioe' un aeroporto scritto nel codice). Si ricava dallo SPAZIO: si tira la
// retta fra l'entrata e la meta di QUESTA missione, si tengono le zone che
// stanno lungo quella retta, e si ordinano per quanto sono avanti. L'ordine e'
// quello in cui le cose si incontrano davvero camminando.
// Cosi' due missioni con porte diverse attraversano zone diverse, ed e'
// esattamente la differenza fra chi entra dalla strada e chi scende dall'aereo.
// In un ospedale la stessa riga produce accettazione-triage-attesa-ambulatorio;
// in una chiesa, ingresso-acquasantiera-navata-banco. Regola 0-bis intatta.

/** Chi si raggiunge a piedi da chi, chiedendolo alla mappa di cammino vera.
 *
 *  ⚠️ E' LA RIPARAZIONE DI «CAMMINANO SULL'AEREO» — 09/09/2026.
 *     Raffaella: *«per prendere l'aereo invece di passare attraverso il tubo
 *     passano per terra, camminano sull'aereo, camminano sul tubo che collega
 *     il terminal con l'aereo stesso»*.
 *     La causa e' che il dorso di un aereo e il tetto di un pontile sono
 *     superfici orizzontali, e il programma ci mette sopra il calpestabile.
 *     ⛔ E la prova del tetto NON puo' risolverlo su questo modello: il
 *        cervello lo ha dichiarato «spaccato, manca soffitto e pareti
 *        laterali», e il modulo accessi ha misurato 3 campioni coperti su 840.
 *        Su un modello sezionato NIENTE ha qualcosa sopra la testa: chiedere
 *        un soffitto cancellerebbe anche il piano superiore del terminal.
 *     Quello che invece regge sempre e' il piede: sul dorso di un aereo non ci
 *     si arriva CAMMINANDO da nessuna porta. Qui si chiede alla navmesh, che
 *     il cammino lo calcola davvero, e le tappe irraggiungibili restano fuori.
 *
 *  Se la mappa di cammino non c'e' ancora torna `null`, e le missioni si
 *  costruiscono come prima: meglio una missione ottimista che nessuna. */
function gruppiDiCammino(nodi) {
  const N = (typeof window !== 'undefined' && window.__veritasNavmesh) || null;
  if (!N || typeof N.gruppiCollegati !== 'function' || nodi.length > 60) return null;
  try {
    const r = N.gruppiCollegati(nodi.map((n) => n.pos));
    if (!r || !r.gruppo) return null;
    const m = new Map();
    nodi.forEach((n, i) => m.set(n, r.gruppo[i]));
    return m;
  } catch (e) { return null; }
}

/** Quanto larga e' la strada: una zona piu' lontana di cosi' dalla retta non e'
 *  «sulla via», e' un'altra parte dell'edificio.
 *  ⚠️ PRIMA TARATURA, NON UNA MISURA, e il tetto e' la parte che conta: senza,
 *     su un tragitto di 70 m la strada diventava larga 24 e si portava dentro
 *     il piazzale — misurato al banco il 09/09, con «Piazzale sud» infilato in
 *     mezzo al percorso dei passeggeri. Un corridoio d'edificio non e' largo
 *     venti metri: oltre quelli si sta attraversando un'altra cosa. */
function corridoio(lungo) { return Math.max(8, Math.min(20, lungo / 4)); }

/** Una tappa per categoria, la piu' vicina alla propria strada.
 *
 *  ⚠️ E' IL CUORE DELLA MISSIONE, ed e' la differenza fra un obiettivo e un
 *     itinerario. L'obiettivo e' «fai il check-in», non «passa da tutti i
 *     banchi dell'aeroporto»: chi cammina va a UN banco, attraversa UN
 *     controllo, aspetta in UNA sala — quello che gli capita sulla sua strada.
 *     Misurato al banco il 09/09 senza questa riga: le due andate, entrando da
 *     due porte diverse, attraversavano gli stessi identici sei ambienti. Era
 *     ancora la fila indiana, solo con due porte.
 *     Adesso chi entra dalla strada trova la sua accettazione e chi entra da
 *     ovest la propria: due missioni, due percorsi, e le zone si dividono la
 *     gente invece di riceverla tutta. */
function unaPerCategoria(candidati) {
  const meglio = new Map();
  for (const c of candidati) {
    const cat = c.n.type || 'sosta';
    const gia = meglio.get(cat);
    if (!gia || c.scarto < gia.scarto) meglio.set(cat, c);
  }
  return Array.from(meglio.values()).sort((p, q) => p.t - q.t);
}

/** Le zone che stanno lungo il tragitto entrata->meta, in ordine di cammino. */
function tappeLungoLaVia(tutte, entrata, meta, opz = {}, gruppo) {
  const ax = entrata.pos[0], az = entrata.pos[2];
  const bx = meta.pos[0],    bz = meta.pos[2];
  const dx = bx - ax, dz = bz - az;
  const lungo = Math.hypot(dx, dz);
  if (!(lungo > 0)) return [];
  const largo = opz.corridoioM || corridoio(lungo);
  const dentro = [];
  for (const n of tutte) {
    if (n === entrata || n === meta) continue;
    if (n.type === 'origine' || n.type === 'destinazione') continue;
    // a piedi, o non e' una tappa di questa missione
    if (gruppo && gruppo.get(n) !== gruppo.get(entrata)) continue;
    const px = n.pos[0] - ax, pz = n.pos[2] - az;
    // t = quanto e' avanti lungo la strada (0 all'entrata, 1 alla meta)
    const t = (px * dx + pz * dz) / (lungo * lungo);
    if (t <= 0.02 || t >= 0.98) continue;   // dietro l'entrata, o oltre la meta
    // scarto = quanto e' fuori strada
    const scarto = Math.abs(px * dz - pz * dx) / lungo;
    if (scarto > largo) continue;
    dentro.push({ n, t, scarto });
  }
  return unaPerCategoria(dentro).map((x) => x.n);
}

/** Le mete, quando nessuno le ha dichiarate: la tappa piu' lontana da ogni
 *  entrata. E' la definizione operativa di «dove si va a finire» quando il
 *  modello non porta un nodo di tipo destinazione — ed e' il caso NORMALE:
 *  sull'aeroporto di prova erano zero, ed e' per questo che c'era una fila
 *  sola per tutti. */
function meteDedotte(tutte, entrate, quante, gruppo) {
  const scelte = [];
  for (const e of entrate) {
    let meglio = null, dist = -1;
    for (const n of tutte) {
      if (n.type === 'origine' || scelte.indexOf(n) >= 0) continue;
      // una meta che non si raggiunge a piedi non e' una meta: e' un posto
      // dove si potrebbe solo atterrare.
      if (gruppo && gruppo.get(n) !== gruppo.get(e)) continue;
      const d = Math.hypot(n.pos[0] - e.pos[0], n.pos[2] - e.pos[2]);
      if (d > dist) { dist = d; meglio = n; }
    }
    if (meglio) scelte.push(meglio);
    if (scelte.length >= quante) break;
  }
  return scelte;
}

/** Gli obiettivi di una missione: che cosa l'agente DEVE compiere, in ordine.
 *  Non e' una polilinea: e' l'elenco che permette di chiedere «e' arrivato in
 *  fondo?» invece di «ha percorso la linea?». */
function obiettiviDa(tappe) {
  return tappe.map((n, k) => ({
    ordine: k, tipo: n.type || 'sosta', nome: nomeDi(n), pos: n.pos.slice(),
  }));
}

/**
 * LE MISSIONI del modello: tre famiglie, e nessuna porta un nome di tipologia.
 *
 *   andata   — attraversa in avanti:    entrata -> le tappe sulla via -> meta
 *   ritorno  — attraversa all'indietro: meta -> le stesse tappe al contrario
 *   presidio — non attraversa: resta dov'e', ed e' chi ci lavora
 *
 * In un aeroporto si leggono chi parte, chi atterra, chi lavora sul piazzale.
 * In un ospedale: chi entra, chi viene dimesso, il personale. In una chiesa:
 * chi entra, chi esce, il sacrestano. La stessa riga di codice.
 *
 * ⚠️ LE QUOTE SONO UNA PRIMA TARATURA, NON UNA MISURA, ed e' dichiarato qui:
 *    meta' va in avanti, tre decimi tornano indietro, due decimi presidiano.
 *    Quando il conteggio delle persone gia' nel modello sara' affidabile per
 *    zona, le quote verranno da li' e questa riga sparisce.
 */
export function missioni(nodi, opz = {}) {
  const tutte = (nodi || []).filter((n) => n && n.pos);
  if (tutte.length < 2) return [];

  let entrate = tutte.filter((n) => n.type === 'origine');
  const accessi = opz.accessi || (typeof window !== 'undefined'
    && window.__veritasAccessi && window.__veritasAccessi.accessi) || [];
  for (const a of accessi) {
    if (!a || !a.centro) continue;
    const gia = entrate.some((n) =>
      Math.hypot(n.pos[0] - a.centro[0], n.pos[2] - a.centro[2])
        < (opz.stessoIngressoM || 8));
    if (gia) continue;
    entrate.push({ label: a.nome || 'Accesso', type: 'origine', origine: 'accesso',
                   pos: a.centro.slice(), larghezza: a.larghezza });
  }
  if (!entrate.length) return [];

  // Chi si raggiunge a piedi da chi: si chiede una volta sola, e da qui in
  // avanti nessuna missione puo' contenere una tappa dove non ci si arriva.
  const gruppo = gruppiDiCammino(entrate.concat(tutte.filter((n) => entrate.indexOf(n) < 0)));

  let mete = tutte.filter((n) => n.type === 'destinazione');
  if (gruppo && mete.length)
    mete = mete.filter((m) => entrate.some((e) => gruppo.get(e) === gruppo.get(m)));
  if (!mete.length) mete = meteDedotte(tutte, entrate, Math.max(1, entrate.length), gruppo);
  if (!mete.length) return [];

  const fuori = [];
  const quante = Math.min(opz.massimo || 6, Math.max(entrate.length, mete.length));
  for (let i = 0; i < quante; i++) {
    const entrata = entrate[i % entrate.length];
    const meta = mete[i % mete.length];
    if (gruppo && gruppo.get(entrata) !== gruppo.get(meta)) continue;
    const via = tappeLungoLaVia(tutte, entrata, meta, opz, gruppo);
    if (!via.length) continue;
    const avanti = [entrata].concat(via, [meta]);
    fuori.push({ nome: 'va: ' + nomeDi(entrata) + ' → ' + nomeDi(meta),
                 verso: 'andata', tappe: avanti, quota: 0,
                 entrata: entrata, uscita: meta, obiettivi: obiettiviDa(avanti) });
    const indietro = [meta].concat(via.slice().reverse(), [entrata]);
    fuori.push({ nome: 'torna: ' + nomeDi(meta) + ' → ' + nomeDi(entrata),
                 verso: 'ritorno', tappe: indietro, quota: 0,
                 entrata: meta, uscita: entrata, obiettivi: obiettiviDa(indietro) });
  }
  if (!fuori.length) return [];

  // CHI NON ATTRAVERSA. Le zone che nessuna via ha toccato: chi ci lavora ci
  // resta, e non fa il giro dell'edificio. Sull'aeroporto sono le squadre sul
  // piazzale — la ragione per cui c'erano tappe fra i due aerei.
  const toccate = new Set();
  for (const m of fuori) for (const t of m.tappe) toccate.add(t);
  // ⚠️ CHI PRESIDIA CI DEVE ESSERE ARRIVATO. Le zone lasciate fuori si dividono
  //    in due: quelle dove a piedi ci si arriva — e li' qualcuno ci lavora — e
  //    quelle dove NON ci si arriva, che sono il dorso dell'aereo e il tetto
  //    del pontile. Le seconde non diventano niente, e si dicono: un ambiente
  //    sparito in silenzio, per chi legge, e' un ambiente che non c'era.
  const avanzate = tutte.filter((n) => !toccate.has(n) && n.type !== 'origine');
  const raggiungibili = gruppo
    ? avanzate.filter((n) => entrate.some((e) => gruppo.get(e) === gruppo.get(n)))
    : avanzate;
  const irraggiungibili = avanzate.filter((n) => raggiungibili.indexOf(n) < 0);
  if (irraggiungibili.length) {
    try {
      console.warn('[VERITAS flussi] ' + irraggiungibili.length
        + ' zone restano fuori dalle missioni: a piedi non ci si arriva '
        + 'da nessun ingresso: ' + irraggiungibili.map(nomeDi).join(', ')
        + '. Su un modello di aeroporto sono tipicamente il dorso degli aerei e '
        + 'il tetto dei pontili: superfici orizzontali su cui nessuno cammina.');
    } catch (e) {}
  }
  const presidi = raggiungibili;
  if (presidi.length) {
    const p = presidi.slice(0, 2);
    const giro = p.length > 1 ? p : p.concat(p);
    fuori.push({ nome: 'presidia: ' + p.map(nomeDi).join(' e '),
                 verso: 'presidio', tappe: giro, quota: 0,
                 entrata: giro[0], uscita: giro[giro.length - 1],
                 obiettivi: obiettiviDa(giro) });
  }

  const nAnd = fuori.filter((m) => m.verso === 'andata').length;
  const nRit = fuori.filter((m) => m.verso === 'ritorno').length;
  const nPre = fuori.filter((m) => m.verso === 'presidio').length;
  for (const m of fuori) {
    m.quota = m.verso === 'andata'  ? 0.5 / Math.max(1, nAnd)
            : m.verso === 'ritorno' ? 0.3 / Math.max(1, nRit)
            :                         0.2 / Math.max(1, nPre);
  }
  return fuori;
}

/** Riassunto in italiano normale, da dire in chat o nel log. */
export function raccontaFlussi(flussi) {
  const f = flussi || [];
  if (!f.length) return 'Non ho ancora capito da dove si entra e dove si va.';
  if (f.length === 1) return 'Ho un flusso solo: ' + f[0].nome + '.';
  return 'Ho ' + f.length + ' flussi: ' + f.map((x) => x.nome).join('; ') + '.';
}

// ---------------------------------------------------------------------------
// L'aggancio al programma
// ---------------------------------------------------------------------------
//
// I flussi si possono anche DICHIARARE da fuori con `imposta`: e' la porta da
// cui entreranno gli accessi (passo 2) e l'ordine letto dagli indizi (passo 3).
// Finche' nessuno li dichiara, `per` li costruisce dalle tappe come sopra.

let DICHIARATI = null;

/** Dichiara i flussi da fuori. `null` torna a costruirli dalle tappe. */
export function imposta(flussi) {
  DICHIARATI = (flussi && flussi.length) ? flussi : null;
  return DICHIARATI;
}

/** I flussi da percorrere adesso: quelli dichiarati, o quelli delle tappe. */
export function per(nodi, opz = {}) {
  // ⚠️ PRIMA LE MISSIONI — 09/09/2026. Se il modello permette di costruirle
  //    (almeno un'entrata, almeno una meta, e qualcosa in mezzo) sono quelle:
  //    ognuna ha il SUO percorso, non il mezzo condiviso di tutti.
  //    Il vecchio costruisciFlussi resta sotto come ripiego per i modelli
  //    troppo poveri, e quando scatta si vede nel nome («flusso unico»).
  if (!DICHIARATI) {
    try {
      const m = missioni(nodi, opz);
      if (m && m.length > 1) {
        try {
          console.log('[VERITAS flussi] ' + m.length + ' missioni: '
            + m.map((x) => x.nome + ' (' + x.tappe.length + ' tappe)').join('; '));
        } catch (e) {}
        return m;
      }
    } catch (e) {
      try { console.warn('[VERITAS flussi] missioni non costruite: '
        + ((e && e.message) || e) + ' — resto sui flussi di prima'); } catch (x) {}
    }
  }
  if (DICHIARATI) {
    // Un flusso dichiarato vale solo se le sue tappe esistono ancora: le zone
    // si cancellano e si rifanno a ogni rilettura del modello.
    const vivi = DICHIARATI.filter((f) => f && f.tappe && f.tappe.length >= 2
      && f.tappe.every((t) => t && t.pos));
    if (vivi.length) return vivi;
    DICHIARATI = null;
  }
  return costruisciFlussi(nodi, opz);
}

/** Quale flusso tocca a questo gruppo di persone. */
export function flussoDelGruppo(flussi, gruppo) {
  if (!flussi || !flussi.length) return null;
  return flussi[((gruppo % flussi.length) + flussi.length) % flussi.length];
}

export default { ORDINE_DI_MEZZO, costruisciFlussi, raccontaFlussi, imposta, per, flussoDelGruppo };

if (typeof window !== 'undefined') {
  window.__veritasFlussi = {
    ORDINE_DI_MEZZO, costruisciFlussi, raccontaFlussi, imposta, per, flussoDelGruppo,
  };
  console.log('[VERITAS flussi] pronto — window.__veritasFlussi');
}
