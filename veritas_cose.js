// =============================================================================
// VERITAS — LE COSE. Il piano che mancava fra "dove si cammina" e "che stanza e'".
// =============================================================================
//
// LA RICHIESTA
// Raffaella, 18/08/2026, guardando l'anteprima: *«Le tappe stanno tutte in un
// posto dove si arriva davvero a piedi, ma non in maniera da avere senso! Il
// parcheggio deve stare dove stanno le macchine. Il controllo, dove si vedono
// i banchi del check-in.»*
// E il 19/08, indicando il modello: *«hai delle figure umane, che sono degli
// elementi verticali, delle frecce orizzontali colorate che indicano i
// percorsi, e che tu dovresti essere in grado di discernere.»*
//
// PERCHE' NON ERA UN DIFETTO DA AGGIUSTARE
// `catenaCamminabile()` distribuisce le tappe a distanza uguale lungo il
// percorso piu' lungo. Il risultato misurato: 99,8% delle posizioni su terreno
// calpestabile, e sette tappe in fila indiana. Percorribili e insensate.
//
// Non e' una riga da correggere: e' che il programma non ha mai avuto un posto
// dove tenere LE COSE. Sa dove si cammina (il vuoto) e prova a dedurre da li'
// che stanza e'. Ma il senso di uno spazio non sta nel suo vuoto: sta in cio'
// che ci hanno messo dentro. Un rettangolo di 30 x 15 m e' un parcheggio o un
// atrio a seconda di cosa c'e' sopra.
//
// COSA SI E' CERCATO PRIMA DI SCRIVERE (Regola uno)
// La struttura esiste, e' pubblicata, ed e' quella che usano i robot che
// entrano in edifici mai visti: il GRAFO DI SCENA 3D.
//   Rosinol et al. — «Kimera: from SLAM to Spatial Perception with 3D Dynamic
//     Scene Graphs» (IJRR 2021)
//   Hughes, Chang, Carlone — «Hydra: A Real-time Spatial Perception System for
//     3D Scene Graph Construction and Optimization» (RSS 2022)
//     codice aperto: github.com/MIT-SPARK/Hydra e MIT-SPARK/Spark-DSG
//   Gu et al. — «ConceptGraphs: Open-Vocabulary 3D Scene Graphs for Perception
//     and Planning» (ICRA 2024), licenza MIT
//
// Sono cinque piani, e ognuno nasce da quello sotto:
//
//   5  EDIFICIO      dentro/fuori, i livelli
//   4  AMBIENTI      le stanze, e a cosa servono            <- il referto
//   3  LUOGHI        dove si cammina, e cosa si raggiunge   <- navcat + asse mediale
//   2  LE COSE       gli oggetti che stanno nello spazio    <- QUESTO FILE
//   1  GEOMETRIA     il modello caricato
//
// VERITAS aveva 1 e 3, e ricavava il 4 saltando il 2. Da li' viene il difetto:
// una zona non puo' stare sopra la cosa che la definisce, se le cose non sono
// un piano del sistema. Il codice di Hydra e' C++ per robot e non entra in un
// browser — quello che si prende e' LA STRUTTURA, non il codice.
//
// Nota: che il piano 3 di VERITAS sia gia' fatto con l'asse mediale
// (`veritas_perception.js`) non e' un caso fortunato: e' lo stesso metodo che
// Hydra usa per estrarre i suoi «luoghi» dal vuoto (diagramma di Voronoi
// generalizzato). Ci si era arrivati per la strada giusta.
//
// ⚠️ LA DIVISIONE DEL LAVORO, decisa da Raffaella il 19/08/2026
// Fino a ieri la regola era «gli occhi spostano le ETICHETTE, non i punti»
// (testa di `veritas_occhi.js`). Adesso e' questa, ed e' piu' precisa:
//
//     L'OCCHIO DICE DOVE SONO LE COSE.   LA GEOMETRIA DICE LE MISURE.
//
// Non si contraddicono, perche' parlano di due cose diverse: l'occhio localizza
// OGGETTI, la geometria misura SPAZIO. Una tappa si appoggia sull'oggetto che
// la definisce; area, larghezze, strettoie e conformita' restano misurate.
//
// E perche' resti difendibile davanti a un committente che contesta un numero:
// l'occhio sceglie QUALE mucchio di cose, la coordinata esatta la da' sempre
// la geometria (il baricentro del mucchio misurato). Cosi' la posizione e'
// rifacibile identica anche se l'occhio, richiesto due volte, sposta di
// qualche pixel le sue scatole.
//
// COSA FA QUESTO FILE, E COSA NON FA
// FA:      trova gli oggetti, li raggruppa, li misura, ne descrive la FORMA.
// NON FA:  non da' NOMI. «Sedute», «banconi», «automobili» sono nomi, e i nomi
//          vengono dagli occhi (`veritas_occhi.js`) o dal modello. Qui si dice
//          soltanto «quaranta oggetti uguali, alti 0,45 m, in griglia»: e'
//          una misura, e vale in aeroporto, in museo e in un livello di gioco.
//
// PERCHE' NIENTE NOMI DI MESH
// Misurato il 19/08 su un modello di esempio: 4.643 nodi, e i nomi sono
// «Cube.083», «Part551», «Plane.001». Un elenco di parole attese e' la stessa
// trappola gia' pagata due volte in questo progetto (i pannelli cercati per
// testo italiano e invisibili in inglese; le zone cercate per nome della mesh).
// Il modello puo' arrivare da chiunque, in qualunque lingua, da qualunque
// software.

// ---------------------------------------------------------------------------
// 1. Le misure del corpo umano, da cui discende tutto il resto
// ---------------------------------------------------------------------------
//
// Non sono soglie tarate su un modello: sono le stesse costanti antropometriche
// gia' usate dal resto del programma (`veritas_navmesh.js`), piu' due quote di
// arredo che in architettura sono standard. Un oggetto si descrive rispetto al
// corpo di chi ci sta accanto, ed e' l'unico riferimento che non cambia
// passando da un aeroporto a un museo a un livello di gioco.

export const CORPO = Object.freeze({
  // Ellisse corporea di Fruin (1971): 61 x 46 cm. La spalla e' la misura che
  // dice se un oggetto e' "piu' stretto di una persona".
  spalla: 0.61,
  // Altezza libera minima di passaggio, gia' usata per la navmesh.
  altezza: 2.0,
  // Quota di seduta: il piano di un sedile sta fra 40 e 48 cm da terra, e con
  // lo schienale l'oggetto arriva intorno agli 85 cm. E' una misura di
  // ergonomia, non una convenzione di questo progetto.
  seduta: [0.35, 0.85],
  // Quota di banco: un piano di lavoro o di accoglienza sta fra 90 e 110 cm;
  // un chiosco o un totem arriva a 160. Il DM 236/89 fissa a 90 cm il piano
  // utilizzabile da chi e' seduto: e' il centro di questa fascia.
  banco: [0.85, 1.6],
  // Portata del braccio: circa un metro. E' la misura che separa un ARREDO da
  // un VOLUME, ed e' piu' onesta dell'altezza. Un bancone e' profondo 70 cm
  // perche' ci si deve arrivare da fermi; un'automobile e' larga 1,80 m e non
  // ci si arriva — le si gira attorno. Senza questa prova un'automobile alta
  // 1,50 m finiva classificata "banco", perche' l'altezza da sola non basta.
  portata: 1.0,
  // Sotto questo spessore un oggetto non e' un volume: e' vernice, un adesivo,
  // una placca. Stessa costante gia' usata per la segnaletica orizzontale.
  placca: 0.05,
  // Quanto puo' stare staccato da terra un oggetto che ci sta ancora APPOGGIATO.
  // Oltre, non e' appoggiato: e' appeso o montato — un monitor, un cartello,
  // una mensola. 30 cm e' l'altezza di un gradino generoso.
  //
  // ⚠️ Trovato da una prova: un monitor alto 55 cm montato a 1,90 m finiva
  //    classificato «seduta», perche' la fascia di altezza veniva applicata
  //    alla dimensione dell'oggetto invece che alla sua quota dal pavimento.
  //    Una seduta e' alta 45 cm DA TERRA; un oggetto di 45 cm appeso al
  //    soffitto non e' una seduta. La quota conta quanto la dimensione.
  stacco: 0.30,
});

// Il passo d'uomo: due cose piu' vicine di cosi' si leggono come una cosa
// sola. 1,2 m e' il corridoio minimo per due persone che si incrociano.
//
// ⚠️ Serve solo come PAVIMENTO e come tetto di sicurezza. La distanza con cui
//    si uniscono gli oggetti NON e' questa costante: viene misurata sugli
//    oggetti stessi (vedi `distanzaDiUnione`). I sedili distano 60 cm, i
//    banconi 2,5 m, le automobili 3 m: una costante unica li sbaglia tutti, e
//    infatti li sbagliava — otto banconi in fila davano zero mucchi.
export const VICINANZA = 1.2;

// Quante volte la spaziatura tipica di un gruppo puo' crescere prima che il
// vuoto sia una separazione vera e non un intervallo. Due: un buco doppio del
// passo normale e' un buco voluto da chi ha progettato.
export const SALTO = 2;

// E quante volte la dimensione dell'oggetto, come tetto. Serve per i gruppi di
// due soli oggetti, dove la "spaziatura tipica" e' la loro distanza e da sola
// li unirebbe sempre, anche a quaranta metri.
export const RAGGIO_MAX_IN_OGGETTI = 8;

// Sotto due copie non si parla di "oggetti ripetuti": una sedia sola e' un
// arredo, una fila di sedie e' un'area di attesa. E' la differenza fra un
// dettaglio e un fatto di progetto.
export const COPIE_MINIME = 2;

// ---------------------------------------------------------------------------
// 2. La firma: quando due oggetti sono LO STESSO oggetto
// ---------------------------------------------------------------------------
//
// ⚠️ Misurato il 19/08, e ha cambiato l'impianto: nel modello di esempio la
//    ripetizione NON e' dichiarata. 2.416 mesh e 2.416 istanze — ogni mesh
//    usata una volta sola. L'esportatore ha appiattito tutto, ed e' il caso
//    normale, non l'eccezione: succede a chiunque esporti da un software CAD.
//
//    Quindi non basta guardare "quante volte e' usata questa mesh": bisogna
//    riconoscere che due mesh DIVERSE sono in realta' lo stesso oggetto
//    duplicato. Si confronta cio' che non cambia duplicando: quanti vertici,
//    quanti triangoli, che materiale, e che ingombro ha da sola.
//
//    Con la firma, sullo stesso file: 548 gruppi di oggetti ripetuti, 1.569
//    oggetti dentro. La ripetizione c'era, era solo invisibile.

/** Millimetro: sotto, due ingombri sono lo stesso ingombro. */
function mm(v) { return Math.round(v * 1000); }

/**
 * La firma di un pezzo. Due pezzi con la stessa firma sono copie.
 *
 * Si usa solo cio' che il duplicato conserva. NON il nome, NON la posizione,
 * NON la rotazione: un oggetto ruotato e' lo stesso oggetto, e infatti
 * l'ingombro si prende in coordinate LOCALI, prima di ruotarlo.
 */
export function firma(pezzo) {
  const d = pezzo.ingombroLocale || pezzo.ingombro || [0, 0, 0];
  // le tre dimensioni ordinate: cosi' un oggetto coricato e uno in piedi,
  // se sono lo stesso pezzo girato, danno la stessa firma
  const ord = [mm(d[0]), mm(d[1]), mm(d[2])].sort((a, b) => a - b);
  return [
    pezzo.nVertici == null ? "?" : pezzo.nVertici,
    pezzo.nTriangoli == null ? "?" : pezzo.nTriangoli,
    pezzo.materiale == null ? "?" : pezzo.materiale,
    ord.join("x"),
  ].join("/");
}

/**
 * Raggruppa un inventario di pezzi per firma.
 *
 * @param {Array} inventario pezzi: { id, centro:[x,y,z], ingombro:[dx,dy,dz],
 *                                    ingombroLocale?, nVertici?, nTriangoli?,
 *                                    materiale?, nome? }
 * @returns {Map<string, Array>} firma -> pezzi
 */
export function perFirma(inventario) {
  const m = new Map();
  for (const p of inventario || []) {
    const f = firma(p);
    if (!m.has(f)) m.set(f, []);
    m.get(f).push(p);
  }
  return m;
}

// ---------------------------------------------------------------------------
// 3. La forma: una MISURA, non un nome
// ---------------------------------------------------------------------------
//
// Descrive come sta al mondo un oggetto rispetto a una persona. Non dice cosa
// e': dice com'e' fatto. La differenza conta, perche' una descrizione di forma
// sbagliata di poco resta una descrizione onesta, mentre un nome sbagliato in
// un referto e' una bugia credibile — il difetto peggiore che questo strumento
// possa produrre (§ il verdetto normativo falso del 13/08, i KPI finti).
//
// Le forme sono cinque, e servono a due cose sole:
//   1. sapere se una cosa si attraversa o si aggira;
//   2. dare all'occhio un suggerimento su cosa guardare.

export const FORME = Object.freeze([
  "placca",      // piatta, appoggiata a terra: vernice, segnaletica, adesivo
  "appeso",      // staccato da terra: monitor, cartello, mensola, lampada
  "verticale",   // alta e piu' stretta di una spalla: persona, palo, totem
  "seduta",      // volume basso: ci si siede sopra, o e' un tavolino
  "banco",       // volume a mezza altezza: bancone, chiosco, varco
  "volume",      // tutto il resto: un armadio, un muro, un veicolo, un aereo
]);

/**
 * Che forma ha questo ingombro, in metri e con l'asse Y in alto.
 *
 * ⚠️ Presuppone il modello gia' in scala reale. E' garantito dalla sequenza
 *    (`veritas_sequenza.js`): nessuna misura esce prima che l'ambiente sia
 *    sistemato. Se il modello non fosse in metri ogni fascia qui sotto sarebbe
 *    priva di senso, ed e' lo stesso motivo per cui il confronto normativo
 *    aspetta la fase «misura».
 */
export function forma(ingombro, stacco = 0) {
  if (!ingombro) return null;
  const dx = Math.abs(ingombro[0]), dy = Math.abs(ingombro[1]), dz = Math.abs(ingombro[2]);
  const base = Math.max(dx, dz), spessore = Math.min(dx, dz);

  // Piatto: nessuno spessore. E' vernice o una placca, e ci si cammina sopra.
  if (dy <= CORPO.placca && base > CORPO.placca && stacco <= CORPO.stacco) return "placca";

  // Staccato da terra: non ci si appoggia sopra e non ci si sbatte contro.
  // Va provato prima delle fasce di altezza, che valgono solo per cio' che sta
  // per terra.
  if (stacco > CORPO.stacco) return "appeso";

  // Piu' profondo della portata di un braccio: non e' un arredo a cui ci si
  // accosta, e' un volume attorno a cui si gira. Va provato PRIMA delle fasce
  // di altezza, perche' l'altezza da sola non distingue un bancone da
  // un'automobile — misurato, e sbagliava.
  if (spessore > CORPO.portata) return "volume";

  // Piu' alto che largo, e almeno alla cintola: sta in piedi. Una figura
  // umana, un palo, un totem, un monitor su piantana. Non si attraversa, si
  // scansa.
  //
  // ⚠️ La prova era «piu' stretto di una spalla» (61 cm, ellisse di Fruin).
  //    Misurato su un modello vero: una figura umana che CAMMINA ha le braccia
  //    e le gambe aperte, e la sua scatola e' larga 89 cm. Restava fuori, e
  //    finiva classificata volume. La snellezza — piu' alto che largo — dice
  //    la stessa cosa e non dipende dalla posa.
  if (dy >= CORPO.banco[0] && dy > base) return "verticale";

  if (dy >= CORPO.seduta[0] && dy < CORPO.seduta[1]) return "seduta";
  if (dy >= CORPO.banco[0] && dy < CORPO.banco[1]) return "banco";
  return "volume";
}

// ---------------------------------------------------------------------------
// 4. Il mucchio: dove le cose uguali stanno insieme
// ---------------------------------------------------------------------------
//
// Sessantasei sedili uguali non sono un fatto: sono quattro isole di sedili in
// quattro punti diversi della sala, e OGNI isola e' un posto. Raggrupparli tutti
// in un baricentro solo darebbe un punto in mezzo al corridoio fra due file —
// esattamente l'errore di KMeans sui corridoi gia' descritto in CLAUDE.md.
//
// Il raggruppamento e' per contatto: due oggetti a meno di VICINANZA metri
// stanno nello stesso mucchio, e la relazione si propaga. E' l'unione di
// insiemi disgiunti, non ha parametri da tarare oltre alla distanza, e non
// impone quanti mucchi debbano venire fuori — che e' precisamente il difetto
// di KMeans, a cui il numero di gruppi va detto prima.

/** Distanza in pianta. La quota non entra: due piani diversi li separa gia' la navmesh. */
function distanzaInPianta(a, b) {
  return Math.hypot(a.centro[0] - b.centro[0], a.centro[2] - b.centro[2]);
}

/**
 * A che distanza si uniscono DUE OGGETTI DI QUESTO GRUPPO.
 *
 * ⚠️ E' la correzione del difetto trovato dalle prove: con una distanza fissa
 *    di 1,2 m, otto banconi allineati a 2,5 m l'uno dall'altro davano ZERO
 *    mucchi — ognuno restava solo e veniva scartato come oggetto unico.
 *
 * La spaziatura non si puo' decidere a tavolino perche' dipende da cosa sono
 * gli oggetti, e cosa sono non lo sappiamo (e' proprio il punto). Ma si puo'
 * MISURARE: si guarda quanto dista, in media, ogni oggetto dal suo vicino piu'
 * prossimo. Quella e' la spaziatura naturale del gruppo — 60 cm per i sedili,
 * 2,5 m per i banconi, 3 m per le automobili — e un vuoto molto piu' grande di
 * cosi' e' una separazione voluta.
 *
 * Si usa la MEDIANA e non la media: un solo oggetto smarrito lontano dagli
 * altri sposterebbe la media e allargherebbe il criterio per tutti.
 *
 * Il tetto sulla dimensione dell'oggetto serve al caso limite di due soli
 * oggetti, dove la "spaziatura tipica" e' la loro distanza reciproca e da sola
 * li unirebbe sempre, anche se stanno ai due capi dell'edificio.
 */
export function distanzaDiUnione(pezzi, opz = {}) {
  const salto = opz.salto != null ? opz.salto : SALTO;
  if (!pezzi || pezzi.length < 2) return VICINANZA;

  // Distanza al vicino piu' prossimo. Su gruppi grandi si campiona a passo
  // fisso invece di confrontare tutti con tutti: il risultato non cambia in
  // modo apprezzabile e resta deterministico, perche' il passo non e' casuale.
  const passo = Math.max(1, Math.floor(pezzi.length / 300));
  const vicine = [];
  for (let i = 0; i < pezzi.length; i += passo) {
    let d = Infinity;
    for (let j = 0; j < pezzi.length; j++) {
      if (j === i) continue;
      const q = distanzaInPianta(pezzi[i], pezzi[j]);
      if (q < d) d = q;
    }
    if (isFinite(d)) vicine.push(d);
  }
  if (!vicine.length) return VICINANZA;
  vicine.sort((a, b) => a - b);
  const mediana = vicine[Math.floor(vicine.length / 2)];

  const d = pezzi[0].ingombro || [0, 0, 0];
  const lato = Math.max(Math.abs(d[0]), Math.abs(d[2]));
  const tetto = lato * RAGGIO_MAX_IN_OGGETTI + VICINANZA;

  return Math.min(Math.max(mediana * salto, VICINANZA), tetto);
}

/**
 * Unisce in mucchi i pezzi che si toccano, entro `vicinanza` metri.
 *
 * Implementazione a griglia: ogni pezzo guarda solo le celle attorno alla
 * propria, invece di confrontarsi con tutti. Su 2.400 pezzi la differenza fra
 * qualche millisecondo e qualche secondo — e questo gira a ogni caricamento.
 */
export function mucchi(pezzi, vicinanza = VICINANZA, raggioDi = null) {
  if (!pezzi || !pezzi.length) return [];
  // Il raggio di ingombro: due cose grandi possono avere i centri lontani e
  // toccarsi lo stesso. Senza questo, un blocco di sedute e una fila di
  // monitor sopra di esso risultavano due posti distinti perche' i loro
  // baricentri distano — mentre nello spazio vero sono lo stesso posto.
  const raggio = raggioDi ? pezzi.map((p) => Math.max(0, raggioDi(p))) : null;
  const rMax = raggio ? Math.max(...raggio) : 0;
  const lato = Math.max(vicinanza + 2 * rMax, 1e-3);
  const cella = new Map();
  const chiave = (i, k) => i + ":" + k;
  pezzi.forEach((p, idx) => {
    const i = Math.floor(p.centro[0] / lato), k = Math.floor(p.centro[2] / lato);
    const c = chiave(i, k);
    if (!cella.has(c)) cella.set(c, []);
    cella.get(c).push(idx);
  });

  const padre = pezzi.map((_, i) => i);
  const radice = (i) => { while (padre[i] !== i) { padre[i] = padre[padre[i]]; i = padre[i]; } return i; };
  const unisci = (a, b) => { const ra = radice(a), rb = radice(b); if (ra !== rb) padre[rb] = ra; };

  pezzi.forEach((p, idx) => {
    const i = Math.floor(p.centro[0] / lato), k = Math.floor(p.centro[2] / lato);
    for (let di = -1; di <= 1; di++) for (let dk = -1; dk <= 1; dk++) {
      const vicini = cella.get(chiave(i + di, k + dk));
      if (!vicini) continue;
      for (const j of vicini) {
        if (j <= idx) continue;
        const luce = distanzaInPianta(p, pezzi[j]) - (raggio ? raggio[idx] + raggio[j] : 0);
        if (luce <= vicinanza) unisci(idx, j);
      }
    }
  });

  const per = new Map();
  pezzi.forEach((p, idx) => {
    const r = radice(idx);
    if (!per.has(r)) per.set(r, []);
    per.get(r).push(p);
  });
  return [...per.values()];
}

// ---------------------------------------------------------------------------
// 5. La disposizione: in fila, in griglia, o sparsi
// ---------------------------------------------------------------------------
//
// Dice come sono messi gli oggetti di un mucchio, e non e' un dettaglio
// estetico: una FILA di banconi e una GRIGLIA di sedute sono due fatti di
// progetto diversi, e il modo in cui la gente ci si dispone davanti cambia.
// E' anche il suggerimento piu' utile da passare all'occhio.
//
// Si misura con l'asse principale della nuvola dei centri (componenti
// principali in due dimensioni): se l'allungamento e' forte, e' una fila.

/** Asse principale e allungamento di una nuvola di punti in pianta. */
export function assePrincipale(punti) {
  const n = punti.length;
  if (n === 0) return null;
  const cx = punti.reduce((s, p) => s + p[0], 0) / n;
  const cz = punti.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0, szz = 0, sxz = 0;
  for (const p of punti) {
    const dx = p[0] - cx, dz = p[1] - cz;
    sxx += dx * dx; szz += dz * dz; sxz += dx * dz;
  }
  sxx /= n; szz /= n; sxz /= n;
  const tr = sxx + szz, det = sxx * szz - sxz * sxz;
  const r = Math.sqrt(Math.max(0, tr * tr / 4 - det));
  const l1 = tr / 2 + r, l2 = tr / 2 - r;
  const angolo = Math.abs(sxz) < 1e-12 && Math.abs(sxx - szz) < 1e-12
    ? 0 : 0.5 * Math.atan2(2 * sxz, sxx - szz);
  return {
    centro: [cx, cz],
    angolo,
    // quanto e' piu' lunga che larga. 1 = tonda.
    allungamento: l2 > 1e-9 ? Math.sqrt(l1 / l2) : (l1 > 1e-9 ? Infinity : 1),
  };
}

/**
 * "fila" | "griglia" | "sparso"
 *
 * Una fila e' molto piu' lunga che larga. Una griglia ha piu' oggetti ed e'
 * compatta. Il resto e' sparso, e va detto invece di essere forzato in una
 * delle due categorie.
 */
export function disposizione(pezzi) {
  if (!pezzi || pezzi.length < 3) return "sparso";
  const a = assePrincipale(pezzi.map((p) => [p.centro[0], p.centro[2]]));
  if (!a) return "sparso";
  if (a.allungamento >= 3) return "fila";
  if (pezzi.length >= 6 && a.allungamento < 2) return "griglia";
  return "sparso";
}

// ---------------------------------------------------------------------------
// 6. Il piano 2: le cose
// ---------------------------------------------------------------------------

/**
 * Le quote a cui c'e' un pavimento, misurate dagli oggetti stessi.
 *
 * Non serve sapere dov'e' il pavimento: basta guardare dove gli oggetti
 * APPOGGIANO. Dove molti oggetti hanno la base alla stessa quota, li' c'e' un
 * piano di calpestio — un arredo non galleggia. E' la stessa idea gia' usata
 * per la segnaletica orizzontale (la moda dell'istogramma delle quote), estesa
 * a piu' livelli perche' un edificio ne ha piu' di uno.
 *
 * Serve per distinguere cio' che sta PER TERRA da cio' che e' APPESO, e senza
 * un pavimento di riferimento quella distinzione non si puo' fare.
 */
export function quotePavimento(inventario, fascia = 0.2) {
  const pezzi = inventario || [];
  if (!pezzi.length) return [0];
  const basi = pezzi.map((p) => p.centro[1] - Math.abs((p.ingombro || [0, 0, 0])[1]) / 2);

  const casella = new Map();
  pezzi.forEach((p, i) => {
    const k = Math.round(basi[i] / fascia);
    if (!casella.has(k)) casella.set(k, []);
    casella.get(k).push(i);
  });
  const chiavi = [...casella.keys()].sort((a, b) => a - b);
  const quanti = (k) => (casella.get(k) || []).length;

  // ⚠️ Un pavimento e' un PICCO, non un tratto pieno.
  //
  //    Il primo tentativo univa le caselle adiacenti, pensando alle tolleranze
  //    di modellazione. Su un modello vero e' andato a sbattere: con 2.416
  //    oggetti quasi nessuna casella e' vuota, le adiacenti si incatenano una
  //    con l'altra, e ne esce UNA banda sola alta quanto l'edificio. Misurato:
  //    una quota di pavimento invece di tre, e da li' 1.943 oggetti su 1.970
  //    dichiarati "appesi" — cioe' tutto il terminal.
  //
  //    Le cose appoggiate a un piano fanno una punta netta nell'istogramma
  //    delle quote: decine di basi alla stessa altezza. Quello che sta in mezzo
  //    e' rado. Quindi si cercano i massimi locali, non i tratti pieni. E' la
  //    stessa scelta gia' fatta per la segnaletica orizzontale, dove il
  //    pavimento e' la MODA e non il minimo.
  //
  //    E un pavimento e' dove appoggiano cose di TIPI DIVERSI: sei monitor
  //    montati tutti alla stessa altezza non sono un piano di calpestio. Il
  //    numero da solo non distingue un pavimento da una famiglia di arredi
  //    appesa in fila; la varieta' si'.
  const soglia = Math.max(3, Math.round(pezzi.length * 0.02));
  const intorno = 2;                        // +/- 40 cm: due caselle per parte
  const picchi = [];
  for (const k of chiavi) {
    const n = quanti(k);
    if (n < soglia) continue;
    let massimo = true;
    for (let d = -intorno; d <= intorno && massimo; d++) {
      if (d === 0) continue;
      // a parita' vince la casella piu' bassa: le cose appoggiano, non fluttuano
      if (quanti(k + d) > n || (quanti(k + d) === n && k + d < k)) massimo = false;
    }
    if (!massimo) continue;
    const vicine = [];
    for (let d = -intorno; d <= intorno; d++) vicine.push(...(casella.get(k + d) || []));
    if (new Set(vicine.map((i) => firma(pezzi[i]))).size < 2) continue;
    // la quota e' dove le cose appoggiano davvero, non il centro della casella
    picchi.push(Math.min(...(casella.get(k) || []).map((i) => basi[i])));
  }

  const quote = picchi.sort((a, b) => a - b);
  // Nessun picco convincente: tutto appoggia sulla cosa piu' bassa che c'e'.
  return quote.length ? quote : [Math.min(...basi)];
}

/** Il pavimento su cui appoggia un oggetto la cui base sta a `base`. */
export function pavimentoSotto(base, quote) {
  let scelta = quote[0];
  for (const q of quote) if (q <= base + CORPO.stacco) scelta = q;
  return scelta;
}

/** Ingombro complessivo di un insieme di pezzi, in coordinate mondo. */
function ingombroDi(pezzi) {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (const p of pezzi) {
    const d = p.ingombro || [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      mn[i] = Math.min(mn[i], p.centro[i] - Math.abs(d[i]) / 2);
      mx[i] = Math.max(mx[i], p.centro[i] + Math.abs(d[i]) / 2);
    }
  }
  return { min: mn, max: mx, dim: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]] };
}

/**
 * IL PIANO 2. Da un inventario di pezzi alle COSE che stanno nello spazio.
 *
 * Una «cosa» qui e' un mucchio di oggetti uguali che stanno insieme: quaranta
 * sedili in griglia, otto banconi in fila, tre automobili. Non ha un nome — ha
 * un dove, un quanto, un quanto e' grande e una forma.
 *
 * @param {Array} inventario  i pezzi del modello (vedi `perFirma`)
 * @param {Object} opz
 * @returns {{cose: Array, pezzi: number, firme: number, scartate: number}}
 */
export function cose(inventario, opz = {}) {
  const copieMinime = opz.copieMinime != null ? opz.copieMinime : COPIE_MINIME;
  const gruppi = perFirma(inventario);
  // I pavimenti si misurano una volta sola, su tutto l'inventario: servono a
  // dire cosa e' appoggiato e cosa e' appeso.
  const quote = opz.quotePavimento || quotePavimento(inventario);
  const fuori = [];
  let scartate = 0;

  for (const [f, pezzi] of gruppi) {
    if (pezzi.length < copieMinime) { scartate += pezzi.length; continue; }

    // ⚠️ PRIMA si separa per piano, POI si raggruppa in pianta.
    //
    //    Trovato da una prova: le distanze si misurano in pianta (la quota la
    //    gestisce gia' la navmesh), ma questo significa che due sedie sullo
    //    stesso punto di due piani diversi risultano a distanza ZERO. Non solo
    //    finivano nello stesso mucchio — falsavano anche la misura della
    //    spaziatura tipica, che diventava zero, e da li' tutti i mucchi si
    //    spezzavano. Un difetto silenzioso: nessun errore, sei mucchi al posto
    //    di uno.
    //
    //    Due sedie su piani diversi non sono la stessa fila di sedie. E'
    //    ovvio a dirsi, e non lo era al codice.
    const perPiano = new Map();
    for (const p of pezzi) {
      const base = p.centro[1] - Math.abs((p.ingombro || [0, 0, 0])[1]) / 2;
      const piano = pavimentoSotto(base, quote);
      if (!perPiano.has(piano)) perPiano.set(piano, []);
      perPiano.get(piano).push(p);
    }

    const insiemi = [];
    for (const suUnPiano of perPiano.values()) {
      if (suUnPiano.length < copieMinime) { scartate += suUnPiano.length; continue; }
      // la distanza si MISURA sul gruppo, non si decide qui: vedi
      // `distanzaDiUnione`. E' la correzione del difetto degli otto banconi.
      const vicinanza = opz.vicinanza != null ? opz.vicinanza : distanzaDiUnione(suUnPiano, opz);
      insiemi.push(...mucchi(suUnPiano, vicinanza));
    }

    for (const mucchio of insiemi) {
      if (mucchio.length < copieMinime) { scartate += mucchio.length; continue; }
      const ing = ingombroDi(mucchio);
      const uno = mucchio[0].ingombro || [0, 0, 0];
      // quanto sta staccato da terra: la base piu' bassa del mucchio, meno il
      // pavimento su cui quel mucchio appoggia
      const baseMin = Math.min(...mucchio.map((p) =>
        p.centro[1] - Math.abs((p.ingombro || [0, 0, 0])[1]) / 2));
      const stacco = baseMin - pavimentoSotto(baseMin, quote);
      fuori.push({
        firma: f,
        quante: mucchio.length,
        // il baricentro MISURATO: e' questa la coordinata che finisce nel
        // referto, non quella che dira' l'occhio
        centro: [
          mucchio.reduce((s, p) => s + p.centro[0], 0) / mucchio.length,
          mucchio.reduce((s, p) => s + p.centro[1], 0) / mucchio.length,
          mucchio.reduce((s, p) => s + p.centro[2], 0) / mucchio.length,
        ],
        ingombro: ing,
        // quanto e' grande UNO degli oggetti: e' questo che dice la forma,
        // non l'ingombro di tutto il mucchio
        ingombroUno: [Math.abs(uno[0]), Math.abs(uno[1]), Math.abs(uno[2])],
        forma: forma(uno, stacco),
        disposizione: disposizione(mucchio),
        // superficie di pianta occupata dal mucchio
        area: Math.max(0, ing.dim[0]) * Math.max(0, ing.dim[2]),
        quota: baseMin,
        stacco,
        // ⚠️ nessun nome. Il nome lo danno gli occhi o il modello.
        nome: null,
        provenienza: "geometria",
        pezzi: mucchio,
      });
    }
  }

  // Le cose piu' numerose e piu' estese prima: sono quelle che dicono di piu'
  // su cos'e' un posto. Un solo oggetto grande e' un arredo, quaranta oggetti
  // uguali sono una funzione.
  fuori.sort((a, b) => (b.quante * Math.max(1, b.area)) - (a.quante * Math.max(1, a.area)));
  return { cose: fuori, pezzi: (inventario || []).length, firme: gruppi.size, scartate };
}

// ---------------------------------------------------------------------------
// 7. I posti: dove le cose si addensano
// ---------------------------------------------------------------------------
//
// Un esportatore spezza un singolo arredo in molti pezzi: il sedile, i
// braccioli, le gambe, la targhetta — spesso uno per materiale. Un POSTO
// rimette insieme quei pezzi: e' l'arredo intero, ed e' quello a poter reggere
// una tappa.
//
// ⚠️ UN POSTO NON E' UNA STANZA, e questo modulo non le inventa.
//
//    Primo tentativo: unire tutte le cose VICINE fra loro. Su un modello vero
//    ha dato UN POSTO SOLO — 1.608 oggetti su 7.165 m2, cioe' tutto l'edificio.
//    Ed e' giusto che sia andata cosi': in uno spazio arredato ogni cosa e'
//    vicina a qualcos'altro, quindi la vicinanza incatena tutto. Non era un
//    parametro da tarare: era l'idea sbagliata.
//
//    Nella struttura di Hydra le stanze NON nascono raggruppando oggetti:
//    nascono dallo SPAZIO LIBERO (il piano 3, che qui c'e' gia' — navmesh e
//    asse mediale), e gli oggetti ci vengono assegnati dentro con un legame di
//    appartenenza. Il piano 2 non deve costruire il piano 4: deve dargli le
//    cose da assegnare.
//
//    Quindi qui si unisce solo cio' che si SOVRAPPONE in pianta — i pezzi dello
//    stesso arredo stanno uno sull'altro — e mai cio' che e' soltanto vicino.

/**
 * Distanza vera fra due rettangoli in pianta. Zero se si sovrappongono.
 *
 * ⚠️ Serve al posto del cerchio circoscritto, e la differenza non e' una
 *    raffinatezza. Misurato su un modello vero: un aeroplano di 31 x 21 m ha
 *    un cerchio circoscritto di 19 m di raggio, quindi "toccava" qualunque cosa
 *    entro venti metri, e da li' l'intero modello si incatenava in UN POSTO
 *    SOLO — 1.970 oggetti, 7.356 m2, un unico posto. Nessun errore in console:
 *    solo una risposta priva di senso.
 *
 *    Con la distanza vera un oggetto lungo tocca solo cio' che ha davvero
 *    accanto, e la sua lunghezza non diventa un raggio d'influenza.
 */
export function distanzaFraScatole(a, b) {
  const dx = Math.max(a.min[0] - b.max[0], b.min[0] - a.max[0], 0);
  const dz = Math.max(a.min[2] - b.max[2], b.min[2] - a.max[2], 0);
  return Math.hypot(dx, dz);
}

/** Quanto due impronte in pianta si sovrappongono, rispetto alla piu' piccola. */
export function sovrapposizione(a, b) {
  const larg = Math.min(a.max[0], b.max[0]) - Math.max(a.min[0], b.min[0]);
  const prof = Math.min(a.max[2], b.max[2]) - Math.max(a.min[2], b.min[2]);
  if (larg <= 0 || prof <= 0) return 0;
  const areaA = Math.max(1e-9, (a.max[0] - a.min[0]) * (a.max[2] - a.min[2]));
  const areaB = Math.max(1e-9, (b.max[0] - b.min[0]) * (b.max[2] - b.min[2]));
  return (larg * prof) / Math.min(areaA, areaB);
}

/**
 * Unisce le cose i cui pezzi stanno UNO SULL'ALTRO: sono lo stesso arredo,
 * spezzato dall'esportatore.
 *
 * La soglia e' su quanto la piu' PICCOLA delle due e' coperta dall'altra: un
 * bracciolo lungo e sottile sta interamente dentro l'impronta del blocco di
 * sedute, ma quel blocco copre solo una fetta della propria area.
 *
 * Le cose sono poche (centinaia, non migliaia): il confronto di tutti con
 * tutti costa niente e non ha l'approssimazione della griglia.
 */
export function mucchiPerScatola(elementi, minSovrapposizione = 0.5) {
  const n = elementi.length;
  const padre = elementi.map((_, i) => i);
  const radice = (i) => { while (padre[i] !== i) { padre[i] = padre[padre[i]]; i = padre[i]; } return i; };
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (sovrapposizione(elementi[i].ingombro, elementi[j].ingombro) >= minSovrapposizione) {
      const ra = radice(i), rb = radice(j);
      if (ra !== rb) padre[rb] = ra;
    }
  }
  const per = new Map();
  elementi.forEach((e, i) => {
    const r = radice(i);
    if (!per.has(r)) per.set(r, []);
    per.get(r).push(e);
  });
  return [...per.values()];
}

/**
 * Dai gruppi di cose ai posti: si uniscono le cose che si sovrappongono in
 * pianta o si toccano.
 *
 * @param {Array} elenco  l'uscita di `cose().cose`
 * @param {Object} opz    { vicinanza, minOggetti, minArea }
 */
export function posti(elenco, opz = {}) {
  // Quanto la piu' piccola delle due impronte dev'essere coperta dall'altra
  // perche' siano lo stesso arredo. Meta': i pezzi di un mobile stanno uno
  // dentro l'altro quasi per intero, due mobili accostati quasi per niente.
  const minSovr = opz.minSovrapposizione != null ? opz.minSovrapposizione : 0.5;
  const minOggetti = opz.minOggetti != null ? opz.minOggetti : 3;
  const minArea = opz.minArea != null ? opz.minArea : 1.0;

  // Le placche non fanno posto da sole: la vernice sta SUL pavimento di un
  // posto, non lo costituisce.
  const solide = elenco.filter((c) => c.forma !== "placca");
  const gruppi = mucchiPerScatola(solide, minSovr);

  const fuori = [];
  for (const g of gruppi) {
    const oggetti = g.reduce((s, c) => s + c.quante, 0);
    const ing = ingombroDi(g.map((c) => ({ centro: c.centro, ingombro: c.ingombro.dim })));
    const area = Math.max(0, ing.dim[0]) * Math.max(0, ing.dim[2]);
    if (oggetti < minOggetti || area < minArea) continue;

    // Il baricentro pesato sul numero di oggetti: dove le cose sono davvero
    // fitte, non il centro geometrico della scatola che le contiene.
    let px = 0, pz = 0, py = 0, peso = 0;
    for (const c of g) { px += c.centro[0] * c.quante; py += c.centro[1] * c.quante; pz += c.centro[2] * c.quante; peso += c.quante; }

    const perForma = {};
    for (const c of g) perForma[c.forma] = (perForma[c.forma] || 0) + c.quante;

    fuori.push({
      centro: [px / peso, py / peso, pz / peso],
      ingombro: ing,
      area,
      oggetti,
      gruppi: g.length,
      // di che forma sono le cose che stanno qui: e' il riassunto che si
      // passa all'occhio, ed e' tutto misurato
      forme: perForma,
      formaPrevalente: Object.keys(perForma).sort((a, b) => perForma[b] - perForma[a])[0] || null,
      disposizione: disposizione(g),
      quota: Math.min(...g.map((c) => c.quota)),
      nome: null,
      provenienza: "geometria",
      cose: g,
    });
  }
  fuori.sort((a, b) => b.oggetti - a.oggetti);
  return fuori;
}

// ---------------------------------------------------------------------------
// 8. Raccontarlo in italiano
// ---------------------------------------------------------------------------
//
// Un'analisi automatica deve dire cosa ha capito, non solo lasciarlo in
// console: e' quello che permette a chi guarda di correggerla subito. Stessa
// scelta gia' fatta per il riconoscimento del tipo di ambiente.

const FORMA_IN_ITALIANO = {
  placca: "segni per terra",
  verticale: "oggetti in piedi, piu' stretti di una persona",
  seduta: "oggetti bassi, all'altezza di una seduta",
  banco: "oggetti a mezza altezza, come un bancone",
  volume: "volumi grandi",
  appeso: "oggetti staccati da terra, appesi o montati",
};

/** Una riga per una cosa. Misure, mai nomi. */
export function raccontaCosa(c) {
  if (!c) return "";
  const d = c.ingombroUno.map((v) => v.toFixed(2)).join(" x ");
  const come = c.disposizione === "fila" ? "in fila"
    : c.disposizione === "griglia" ? "in griglia" : "sparsi";
  return c.quante + " oggetti uguali " + come + ", " + d + " m l'uno ("
    + (FORMA_IN_ITALIANO[c.forma] || c.forma) + ")";
}

/** Il riassunto del piano 2, da dire in chat. */
export function racconta(esito, elencoPosti) {
  if (!esito || !esito.cose.length) {
    return "Non ho trovato oggetti ripetuti in questo modello: non ci sono arredi, "
      + "o sono tutti diversi fra loro. Posso solo misurare lo spazio, non dire a cosa serve.";
  }
  const p = elencoPosti || [];
  const righe = esito.cose.slice(0, 4).map((c) => "  - " + raccontaCosa(c));
  return "Ho guardato le cose che stanno nello spazio: " + esito.cose.length
    + (esito.cose.length === 1 ? " gruppo di oggetti ripetuti" : " gruppi di oggetti ripetuti")
    + " su " + esito.pezzi + " pezzi."
    + (p.length ? " Si addensano in " + p.length + (p.length === 1 ? " posto" : " posti") + "." : "")
    + "\n" + righe.join("\n")
    + "\nCosa siano lo dice l'occhio: qui ho solo misurato.";
}

export default {
  CORPO, VICINANZA, SALTO, RAGGIO_MAX_IN_OGGETTI, COPIE_MINIME, FORME,
  firma, perFirma, forma, mucchi, assePrincipale, disposizione,
  quotePavimento, pavimentoSotto, distanzaDiUnione,
  distanzaFraScatole, sovrapposizione, mucchiPerScatola,
  cose, posti, racconta, raccontaCosa,
};
