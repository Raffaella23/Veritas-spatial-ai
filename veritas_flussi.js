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
