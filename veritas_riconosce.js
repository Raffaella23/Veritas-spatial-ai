// =============================================================================
// VERITAS — L'OCCHIO. Guarda la pianta e dice cosa sono le cose.
// =============================================================================
//
// LA RICHIESTA
// Raffaella, 18/08/2026: *«il parcheggio deve stare dove stanno le macchine.»*
// E il 19/08: *«procedi per l'occhio finche' non funziona: inutile il controllo»*
// — cioe' la controprova non puo' dare un verdetto sensato finche' la macchina
// non sa CHE COSA sta guardando.
//
// LA DIVISIONE DEL LAVORO
//
//     LA GEOMETRIA DICE DOVE E QUANTO.   L'OCCHIO DICE CHE COS'E'.
//
// Il piano 2 (`veritas_cose.js`) trova i mucchi di oggetti uguali e li misura:
// «quaranta oggetti alti 45 cm, in griglia, qui». Non sa che sono sedute, e non
// puo' saperlo: il senso di un oggetto non sta nella sua forma.
// Questo modulo guarda la pianta renderizzata e attacca un NOME a quei mucchi.
//
// ⚠️ E NON SPOSTA NIENTE. La scatola che il modello disegna serve solo a
//    scegliere QUALE mucchio sta nominando; la coordinata che finisce nel
//    referto resta il baricentro misurato dalla geometria. Cosi' un numero
//    contestato da un committente si rifa' identico, anche se il modello,
//    interrogato due volte, sposta la sua scatola di qualche pixel.
//
// COSA SI E' CERCATO PRIMA (Regola uno)
// Un rilevatore A VOCABOLARIO APERTO: gli si dice a parole cosa cercare, e lo
// trova, senza essere stato addestrato su quella categoria.
//   Minderer et al. — «Simple Open-Vocabulary Object Detection with Vision
//     Transformers» (OWL-ViT, ECCV 2022) e «Scaling Open-Vocabulary Object
//     Detection» (OWLv2, NeurIPS 2023). Google, licenza Apache-2.0.
//   Pesi ONNX pronti: Xenova/owlv2-base-patch16-ensemble (128 MB in q4f16).
//   Gira DENTRO IL BROWSER con @huggingface/transformers, su scheda video
//     (WebGPU) o su processore (WASM).
//
// Quindi: nessun server, nessuna chiave, nessun costo per modello analizzato,
// e niente LM Studio da accendere. Il modello si scarica una volta e resta
// nella cache del browser.
//
// ⚠️ QUESTO NON E' «RICONOSCERE PER NOME», ED E' IMPORTANTE CAPIRE PERCHE'
//    Il progetto ha pagato due volte la trappola dell'elenco di parole: i
//    pannelli cercati per testo italiano e invisibili in inglese, le zone
//    cercate per nome della mesh. Li' le parole venivano confrontate con
//    STRINGHE SCRITTE DA QUALCUN ALTRO — il nome di un pannello, il nome di una
//    mesh — e bastava un traduttore o un esportatore diverso per far fallire
//    tutto.
//    Qui le parole sono una DOMANDA FATTA A CHI GUARDA. «a parked car» trova
//    le automobili in un modello giapponese chiamato «Cube.083» esattamente
//    come in uno italiano chiamato «automobile», perche' nessuno legge il nome:
//    si guardano i pixel. E' l'opposto della trappola.
//
// RAPPORTO CON `veritas_occhi.js`
// Quello e' il ponte a un modello locale (LM Studio, Ollama) che RACCONTA una
// pianta a parole. Resta, e fa un altro mestiere: risponde a domande aperte.
// Questo trova OGGETTI e da' scatole. Sono due strumenti diversi, e nessuno dei
// due rimpiazza l'altro.

// ---------------------------------------------------------------------------
// 1. Il vocabolario: cosa si chiede all'occhio di cercare
// ---------------------------------------------------------------------------
//
// Si chiedono OGGETTI, non stanze. E' il principio di Raffaella: «il parcheggio
// e' un parcheggio perche' li' ci sono le auto». Chiedere «un parcheggio» a un
// rilevatore vorrebbe dire chiedergli di fare il ragionamento al posto nostro,
// e su una pianta a piombo sbaglierebbe; chiedergli «un'automobile» e' una
// domanda che sa rispondere.
//
// Le domande sono in inglese perche' e' la lingua su cui il modello e' stato
// addestrato: e' una scelta tecnica, non una preferenza. Il nome che l'utente
// legge e' in italiano.
//
// ⚠️ La tabella e' un PUNTO DI PARTENZA, non un elenco chiuso. L'utente puo'
//    aggiungere parole sue (`occhi: banconi, tornelli`), ed e' il senso di un
//    vocabolario aperto: su un modello che contiene qualcosa a cui nessuno ha
//    pensato, si chiede e basta.

// LA LISTA NON E' SCRITTA DA ME: e' ADE20K-150, lo standard pubblicato per
// l'analisi delle scene, riportato qui alla lettera.
//
//   Zhou et al. — «Scene Parsing through ADE20K Dataset» (CVPR 2017) e
//   «Semantic Understanding of Scenes through the ADE20K Dataset» (IJCV 2019).
//   MIT CSAIL. Le 150 classi comuni sono la lista con cui si misura la
//   comprensione di una scena da vent'anni di ricerca, e coprono sia gli
//   oggetti sia le superfici, sia gli interni sia gli esterni.
//
// ⚠️ Prima qui c'erano 33 parole scritte da me. Erano il pezzo piu' fragile del
//    modulo: tarate su cio' che mi veniva in mente pensando a un aeroporto, e
//    quindi cieche su tutto il resto. Una lista pubblicata e' provata da
//    migliaia di lavori e da casi che qui non si vedranno mai — e' la Regola
//    uno applicata al vocabolario invece che a un algoritmo.
//
//    Si chiedono tutte, comprese quelle che sembrano inutili: chiedere «boat»
//    non costa niente in un aeroporto, e in un porto turistico e' la domanda
//    giusta. Il vocabolario deve valere sul modello che non abbiamo ancora
//    visto.

export const ADE20K_150 = Object.freeze([
  "wall", "building", "sky", "floor", "tree", "ceiling", "road", "bed",
  "windowpane", "grass", "cabinet", "sidewalk", "person", "earth", "door",
  "table", "mountain", "plant", "curtain", "chair", "car", "water", "painting",
  "sofa", "shelf", "house", "sea", "mirror", "rug", "field", "armchair", "seat",
  "fence", "desk", "rock", "wardrobe", "lamp", "bathtub", "railing", "cushion",
  "base", "box", "column", "signboard", "chest of drawers", "counter", "sand",
  "sink", "skyscraper", "fireplace", "refrigerator", "grandstand", "path",
  "stairs", "runway", "case", "pool table", "pillow", "screen door", "stairway",
  "river", "bridge", "bookcase", "blind", "coffee table", "toilet", "flower",
  "book", "hill", "bench", "countertop", "stove", "palm", "kitchen island",
  "computer", "swivel chair", "boat", "bar", "arcade machine", "hovel", "bus",
  "towel", "light", "truck", "tower", "chandelier", "awning", "streetlight",
  "booth", "television receiver", "airplane", "dirt track", "apparel", "pole",
  "land", "bannister", "escalator", "ottoman", "bottle", "buffet", "poster",
  "stage", "van", "ship", "fountain", "conveyer belt", "canopy", "washer",
  "plaything", "swimming pool", "stool", "barrel", "basket", "waterfall",
  "tent", "bag", "minibike", "cradle", "oven", "ball", "food", "step", "tank",
  "trade name", "microwave", "pot", "animal", "bicycle", "lake", "dishwasher",
  "screen", "blanket", "sculpture", "hood", "sconce", "vase", "traffic light",
  "tray", "ashcan", "fan", "pier", "crt screen", "plate", "monitor",
  "bulletin board", "shower", "radiator", "glass", "clock", "flag",
]);

// Che funzione implica un oggetto, quando ne implica una.
//
// ⚠️ Le chiavi sono quelle che `veritas_occhi.js` gia' conosce
//    (parcheggio, accoglienza, controlli, attesa, esposizione, destinazione,
//    corridoio, servizi, pista, commerciale, ingresso, piazzale): e' lui a
//    tradurle in tipo di zona e in nome per dominio. Un secondo vocabolario
//    qui divergerebbe alla prima modifica.
//
// ⚠️ La stragrande maggioranza dei 150 termini NON implica niente, e resta
//    fuori da questa tabella. Una lampada non dice a cosa serve una stanza.
//    Forzare una funzione su ogni oggetto sarebbe inventare.
const FUNZIONE_DI = Object.freeze({
  // ci si siede: e' un'area di sosta
  chair: "sosta", armchair: "sosta", seat: "sosta", sofa: "sosta",
  bench: "sosta", stool: "sosta", ottoman: "sosta", grandstand: "sosta",
  // ci si presenta a qualcuno
  counter: "accoglienza", countertop: "accoglienza", desk: "accoglienza",
  booth: "accoglienza", buffet: "accoglienza", bar: "sosta",
  // ci si sposta fra i livelli o si passa
  stairs: "distribuzione", stairway: "distribuzione", escalator: "distribuzione",
  door: "distribuzione", "screen door": "distribuzione", path: "distribuzione",
  bridge: "distribuzione", step: "distribuzione",
  // si guarda qualcosa: e' esposizione
  painting: "sosta", sculpture: "sosta", case: "sosta",
  poster: "sosta", stage: "sosta", "bulletin board": "sosta",
  // veicoli fermi: si arriva da li'
  car: "origine", van: "origine", truck: "origine", bus: "origine",
  bicycle: "origine", minibike: "origine", boat: "origine",
  // aree di manovra dei mezzi: il pubblico non ci cammina
  runway: "escluso", "dirt track": "escluso", road: "escluso", airplane: "escluso",
  ship: "escluso", pier: "escluso",
  // ci si sta sdraiati: e' un'area di degenza
  bed: "sosta", cradle: "sosta",
  // ci si lavora o si studia seduti a un piano: aula, ufficio, sala lettura
  "pool table": "sosta",
  // servizi
  toilet: "servizio", sink: "servizio", shower: "servizio", washer: "servizio",
  "conveyer belt": "servizio", wardrobe: "servizio",
  // commerciale
  "arcade machine": "sosta", refrigerator: "sosta",
  stove: "sosta", oven: "sosta", food: "sosta",
  "pool table": "sosta",
  // spazio aperto davanti a un edificio
  sidewalk: "origine", fountain: "origine", grass: "origine",
  field: "origine", "swimming pool": "origine",
});

// Il nome che legge l'utente. Dove manca si mostra il termine originale: e'
// piu' onesto di una traduzione inventata, e succede solo per gli oggetti che
// non diventano mai il nome di una zona.
const NOME_IT = Object.freeze({
  chair: "sedie", armchair: "poltrone", seat: "sedute", sofa: "divani",
  bench: "panche", stool: "sgabelli", ottoman: "pouf", grandstand: "gradinata",
  counter: "bancone", countertop: "piano di lavoro", desk: "scrivania",
  booth: "chiosco", buffet: "banco", bar: "bar",
  stairs: "scale", stairway: "scala", escalator: "scala mobile",
  door: "porta", "screen door": "porta a vetri", path: "percorso",
  bridge: "passerella", step: "gradino", railing: "parapetto",
  painting: "quadri", sculpture: "sculture", case: "vetrine",
  poster: "manifesti", stage: "palco", "bulletin board": "bacheca",
  car: "automobili", van: "furgoni", truck: "camion", bus: "autobus",
  bicycle: "biciclette", minibike: "motorini", boat: "imbarcazioni",
  runway: "pista", road: "strada", airplane: "aereo", ship: "nave",
  pier: "molo", toilet: "servizi igienici", sink: "lavabo",
  "conveyer belt": "nastro trasportatore", wardrobe: "guardaroba",
  person: "persona", column: "colonne", pole: "pali", signboard: "cartello",
  screen: "schermo", monitor: "monitor", "television receiver": "televisore",
  "crt screen": "schermo", computer: "computer", clock: "orologio",
  plant: "piante", flower: "fiori", vase: "vasi", ashcan: "cestini",
  box: "casse", basket: "cesti", barrel: "barili", bag: "borse",
  cabinet: "armadi", shelf: "scaffali", bookcase: "libreria",
  table: "tavoli", "coffee table": "tavolini", lamp: "lampade",
  light: "luci", chandelier: "lampadario", streetlight: "lampioni",
  fence: "recinzione", awning: "tettoia", canopy: "pensilina",
  tent: "tenda", fountain: "fontana", "traffic light": "semaforo",
  flag: "bandiere", sidewalk: "marciapiede", "swimming pool": "piscina",
  "arcade machine": "cabinati", "pool table": "biliardo", food: "cibo",
  apparel: "abbigliamento", tray: "vassoi", bottle: "bottiglie",
});

// Cio' che ADE20K non ha, e che questi edifici hanno.
//
// ⚠️ Sono aggiunte DICHIARATE, non un secondo elenco travestito: ognuna sta
//    qui perche' nel vocabolario pubblicato non esiste un termine equivalente,
//    e il motivo e' scritto accanto. Se un giorno se ne aggiungono altre,
//    devono superare la stessa prova.
// ⚠️ NON SI CHIEDE PER TIPO DI EDIFICIO, SI CHIEDE PER OGGETTO. Riscritto il
//    30/08 su richiesta di Raffaella: la piattaforma e' agnostica e riceve
//    scuole, musei, ospedali, negozi, palestre. Un elenco legato all'aeroporto
//    rende cieco l'occhio davanti a tutto il resto — e la cecita' non si vede
//    nel log, si vede solo nei volumi che restano senza nome.
//
//    Quasi tutte le voci sono ora `domini: "*"`, per lo stesso motivo gia'
//    scritto piu' sotto per le automobili: un letto in un museo non e' un
//    errore, e' l'infermeria; un armadietto in un aeroporto e' il deposito
//    bagagli; un banco scolastico in un ospedale e' l'aula dei tirocinanti.
//    Chiedere una cosa che non c'e' costa una riga di risposta vuota; non
//    chiederla costa un volume senza nome.
//
//    Restano legate a un dominio solo le due voci che fuori da li' non
//    significano niente.
export const AGGIUNTE = Object.freeze([
  // --- accoglienza: il punto in cui qualcuno ti riceve ---------------------
  { chiedi: "a reception desk", nome: "banco di accoglienza", funzione: "accoglienza",
    domini: "*", perche: "«counter» c'e', ma non dice che dietro ci sta una persona che riceve" },
  { chiedi: "a check-in counter", nome: "banchi di accettazione", funzione: "accoglienza",
    domini: "*", perche: "accettazione: aeroporto, ospedale, albergo, fiera" },
  { chiedi: "a ticket desk", nome: "biglietteria", funzione: "accoglienza",
    domini: "*", perche: "museo, teatro, stadio, stazione: la funzione e' la stessa" },
  { chiedi: "a self service kiosk", nome: "chioschi", funzione: "accoglienza",
    domini: "*", perche: "il totem di servizio, diverso da «booth»" },
  { chiedi: "a waiting room with rows of seats", nome: "sala d'attesa", funzione: "sosta",
    domini: "*", perche: "le sedute in fila si vedono, ma nessun termine ADE20K le lega all'attesa" },

  // --- controlli: dove si passa uno per volta ------------------------------
  { chiedi: "a security checkpoint", nome: "varco di controllo", funzione: "filtro",
    domini: "*", perche: "aeroporti, tribunali, stadi, ospedali: il filtro obbligato non e' in ADE20K" },
  { chiedi: "a metal detector", nome: "metal detector", funzione: "filtro",
    domini: "*", perche: "e' l'oggetto che si vede in pianta, e non solo in aeroporto" },
  { chiedi: "a turnstile", nome: "tornelli", funzione: "filtro",
    domini: "*", perche: "il filtro dei musei e dei trasporti, assente da ADE20K" },

  // --- cura: ospedali, cliniche, ambulatori, infermerie --------------------
  { chiedi: "a hospital bed", nome: "letti di degenza", funzione: "sosta",
    domini: "*", perche: "ADE20K ha «bed», ma non distingue un letto di casa da uno di reparto" },
  { chiedi: "a hospital stretcher", nome: "barelle", funzione: "sosta",
    domini: "*", perche: "dice che li' passano lettighe, quindi il passaggio dev'essere largo" },
  { chiedi: "a wheelchair", nome: "sedie a rotelle", funzione: null,
    domini: "*", perche: "non implica una funzione, ma cambia le larghezze che servono" },
  { chiedi: "a medical examination table", nome: "lettino da visita", funzione: "sosta",
    domini: "*", perche: "l'oggetto che distingue un ambulatorio da un ufficio" },
  { chiedi: "a medical imaging machine", nome: "apparecchiature diagnostiche", funzione: "sosta",
    domini: "*", perche: "macchinari ingombranti e fissi: vincolano la stanza attorno" },
  { chiedi: "a nurses station", nome: "postazione infermieri", funzione: "accoglienza",
    domini: "*", perche: "il presidio di reparto, che non e' ne' un banco ne' un ufficio" },

  // --- didattica: scuole, universita', sale corsi --------------------------
  { chiedi: "rows of school desks", nome: "banchi scolastici", funzione: "sosta",
    domini: "*", perche: "«desk» e «table» non dicono che sono in file rivolte da una parte" },
  { chiedi: "a whiteboard or blackboard", nome: "lavagna", funzione: "sosta",
    domini: "*", perche: "l'oggetto che orienta l'aula e ne indica il fronte" },
  { chiedi: "a lecture hall with tiered seating", nome: "aula a gradoni", funzione: "sosta",
    domini: "*", perche: "ADE20K ha «grandstand», che non e' la stessa cosa di un'aula" },
  { chiedi: "a row of lockers", nome: "armadietti", funzione: "servizio",
    domini: "*", perche: "scuole, palestre, piscine, depositi: assente da ADE20K" },
  { chiedi: "a laboratory bench", nome: "banconi da laboratorio", funzione: "sosta",
    domini: "*", perche: "distingue un laboratorio da un'aula normale" },

  // --- esposizione e vendita ----------------------------------------------
  { chiedi: "a museum display case", nome: "vetrine espositive", funzione: "sosta",
    domini: "*", perche: "ADE20K ha «case», generico: qui la funzione e' precisa" },
  { chiedi: "supermarket shelving aisles", nome: "scaffalature", funzione: "sosta",
    domini: "*", perche: "le corsie di vendita si leggono in pianta come file parallele" },
  { chiedi: "a checkout counter with cash register", nome: "casse", funzione: "sosta",
    domini: "*", perche: "il punto di pagamento: e' un filtro, e fa coda" },

  // --- trasporto: bagagli e mezzi -----------------------------------------
  { chiedi: "a baggage carousel", nome: "nastro bagagli", funzione: "servizio",
    domini: "*", perche: "ADE20K ha «conveyer belt», qui e' piu' preciso" },
  { chiedi: "a luggage trolley", nome: "carrelli", funzione: null,
    domini: "*", perche: "non implica una funzione, ma dice che li' si trascina qualcosa" },

  // --- le uniche due che restano legate a un dominio -----------------------
  { chiedi: "a jet bridge", nome: "pontile d'imbarco", funzione: "destinazione",
    domini: "aeroporto", perche: "fuori da un aeroporto non esiste: il punto in cui il cammino finisce" },
  { chiedi: "an airport departure gate", nome: "gate d'imbarco", funzione: "destinazione",
    domini: "aeroporto", perche: "idem: la meta di chi parte, e non significa niente altrove" },
]);

/**
 * Il vocabolario, montato dalle sue fonti.
 *
 * ⚠️ «a person standing» resta e viene marcata `controprova`: le persone si
 *    riconoscono APPOSTA per poterle mettere da parte. Se una zona prendesse il
 *    nome dalle figure umane, la controprova si darebbe ragione da sola.
 */
export const VOCABOLARIO = Object.freeze(
  ADE20K_150.map((t) => ({
    chiedi: t === "person" ? "a person standing" : "a " + t,
    termine: t,
    nome: NOME_IT[t] || t,
    funzione: FUNZIONE_DI[t] || null,
    domini: "*",
    fonte: "ADE20K-150",
    controprova: t === "person",
  })).concat(AGGIUNTE.map((a) => ({ ...a, termine: a.chiedi, fonte: "aggiunta dichiarata" })))
);

/**
 * Le voci da chiedere, per un dominio.
 *
 * ⚠️ La lista pubblicata si chiede SEMPRE, in ogni dominio. Un'automobile in un
 *    museo non e' un errore: e' il suo parcheggio. Solo le aggiunte dichiarate
 *    sono legate a un dominio, perche' li' il termine esiste proprio in quanto
 *    quel tipo di edificio ce l'ha.
 *
 * L'ordine mette davanti cio' che implica una funzione: se qualcuno mette un
 * tetto al numero di domande (`limite`), a cadere sono le meno informative.
 */
/** Normalizza un elenco di parole in voci di vocabolario, senza aggiungerne. */
export function vociDaParole(parole) {
  return (parole || [])
    .map((a) => (typeof a === "string"
      ? { chiedi: a, termine: a, nome: a, funzione: null, domini: "*", fonte: "chiesta dal cervello" }
      : a))
    .filter((v) => v && typeof v.chiedi === "string" && v.chiedi.trim());
}

export function vocabolarioPer(dominio, aggiunte = [], opz = {}) {
  const d = (dominio || "").toLowerCase();
  const voci = VOCABOLARIO.filter((v) => v.domini === "*" || v.domini === d)
    .concat((aggiunte || []).map((a) =>
      typeof a === "string"
        ? { chiedi: a, termine: a, nome: a, funzione: null, domini: "*", fonte: "chiesta dall'utente" }
        : a))
    .sort((a, b) => {
      // 1° cio' che l'utente ha chiesto — vince sempre, e' lui che sa cosa
      //    c'e' in quel modello;  2° cio' che implica una funzione;  3° il resto
      const p = (v) => (v.fonte === "chiesta dall'utente" ? 0 : (v.funzione ? 1 : 2));
      return p(a) - p(b);
    });
  return opz.limite ? voci.slice(0, opz.limite) : voci;
}

// ---------------------------------------------------------------------------
// 2. Dalle scatole in pixel alle scatole nel mondo
// ---------------------------------------------------------------------------
//
// La pianta e' vista a piombo: un pixel e' un punto del pavimento, e la
// conversione la fa gia' `veritas_vista.js`. Qui si applica agli angoli della
// scatola.
//
// ⚠️ Il modello puo' restituire le coordinate in pixel oppure normalizzate fra
//    0 e 1, a seconda della versione. Si riconosce dal valore: se tutto sta
//    sotto 1.001 e l'immagine e' piu' grande di due pixel, sono normalizzate.
//    Indovinare male qui vorrebbe dire piazzare ogni scatola nell'angolo in
//    alto a sinistra, e nessuno se ne accorgerebbe.

export function scatolaInMondo(inq, box) {
  if (!inq || !box) return null;
  let { xmin, ymin, xmax, ymax } = box;
  if (Math.max(xmin, ymin, xmax, ymax) <= 1.001 && inq.larghezza > 2) {
    xmin *= inq.larghezza; xmax *= inq.larghezza;
    ymin *= inq.altezza;   ymax *= inq.altezza;
  }
  const m = inq.metriPerPixel, ox = inq.origine[0], oz = inq.origine[1];
  const x0 = ox + Math.min(xmin, xmax) * m, x1 = ox + Math.max(xmin, xmax) * m;
  const z0 = oz + Math.min(ymin, ymax) * m, z1 = oz + Math.max(ymin, ymax) * m;
  return {
    min: [x0, 0, z0], max: [x1, 0, z1],
    centro: [(x0 + x1) / 2, 0, (z0 + z1) / 2],
    larghezza: x1 - x0, profondita: z1 - z0,
  };
}

// ---------------------------------------------------------------------------
// 3. Abbinare le rilevazioni ai mucchi misurati
// ---------------------------------------------------------------------------
//
// ⚠️ UNA RILEVAZIONE CHE NON COMBACIA CON NIENTE VIENE BUTTATA.
//    Il modello non puo' creare un posto: se dice «qui c'e' un bancone» dove la
//    geometria non ha misurato niente, o si e' sbagliato lui o e' un oggetto
//    unico che non fa un mucchio. In tutti e due i casi non deve entrare nel
//    referto, perche' non ci sarebbe una misura sotto a reggerlo.

/** Quanto due impronte si sovrappongono, rispetto alla piu' piccola. */
function sovrapposizione(a, b) {
  const larg = Math.min(a.max[0], b.max[0]) - Math.max(a.min[0], b.min[0]);
  const prof = Math.min(a.max[2], b.max[2]) - Math.max(a.min[2], b.min[2]);
  if (larg <= 0 || prof <= 0) return 0;
  const areaA = Math.max(1e-9, (a.max[0] - a.min[0]) * (a.max[2] - a.min[2]));
  const areaB = Math.max(1e-9, (b.max[0] - b.min[0]) * (b.max[2] - b.min[2]));
  return (larg * prof) / Math.min(areaA, areaB);
}

// Quanto deve combaciare una scatola con un mucchio perche' sia quel mucchio.
// Un terzo: il modello disegna scatole generose e la geometria misura
// l'ingombro stretto, quindi pretendere la coincidenza perderebbe tutto.
export const SOVRAPPOSIZIONE_MINIMA = 0.33;

// Quante volte una scatola puo' essere piu' grande del mucchio che dice di
// indicare.
//
// ⚠️ Trovato da una prova: senza questo limite una scatola grande quanto la
//    pianta nominava OGNI mucchio, perche' li conteneva tutti per intero. Una
//    scatola che copre l'edificio non sta indicando un mucchio: sta indicando
//    la stanza, e non e' quello che le si e' chiesto.
//
//    Il limite vale in una direzione sola, di proposito: una scatola molto piu'
//    PICCOLA del mucchio va benissimo. Chiedendo «una fila di sedie» il modello
//    puo' restituire quaranta scatoline, una per sedia, e ciascuna e' una
//    risposta giusta su quel mucchio.
export const INGRANDIMENTO_MAX = 4;

// Sotto questa fiducia non si guarda nemmeno. OWLv2 e' generoso di rilevazioni
// deboli, e una fiducia bassa dentro un referto e' peggio di un buco.
export const FIDUCIA_MINIMA = 0.12;

/**
 * Attacca i nomi ai mucchi misurati.
 *
 * @param {Array} posti        l'uscita di `veritas_cose.posti()`
 * @param {Array} rilevazioni  [{ score, label, box }] gia' in coordinate mondo
 *                             (`scatolaInMondo`), con `voce` del vocabolario
 * @returns {{posti, senzaNome, scartate, persone}}
 */
export function abbina(posti, rilevazioni, opz = {}) {
  const minSovr = opz.sovrapposizioneMinima != null ? opz.sovrapposizioneMinima : SOVRAPPOSIZIONE_MINIMA;
  const minFid = opz.fiduciaMinima != null ? opz.fiduciaMinima : FIDUCIA_MINIMA;
  const maxIngr = opz.ingrandimentoMax != null ? opz.ingrandimentoMax : INGRANDIMENTO_MAX;
  const areaDi = (b) => Math.max(1e-9, (b.max[0] - b.min[0]) * (b.max[2] - b.min[2]));

  const buone = (rilevazioni || []).filter((r) => r && r.score >= minFid && r.mondo);
  const persone = buone.filter((r) => r.voce && r.voce.controprova);
  // ⚠️ Le persone non nominano niente: sono la controprova
  //    (`veritas_controprova.js`). Se una zona prendesse il nome dalle figure
  //    umane, la verifica si darebbe ragione da sola.
  const nominanti = buone.filter((r) => !(r.voce && r.voce.controprova));

  const usate = new Set();
  const fuori = (posti || []).map((p) => {
    let migliore = null, punteggio = -1;
    const alternative = [];
    for (const r of nominanti) {
      const s = sovrapposizione(p.ingombro, r.mondo);
      if (s < minSovr) continue;
      // una scatola molto piu' grande del mucchio non sta indicando quel
      // mucchio: sta indicando la stanza che lo contiene
      if (areaDi(r.mondo) > maxIngr * areaDi(p.ingombro)) continue;
      // il punteggio tiene conto sia della fiducia del modello sia di quanto
      // la scatola combacia: una rilevazione sicura ma spanciata vale meno di
      // una meno sicura ma centrata
      const q = r.score * s;
      alternative.push({ nome: r.voce.nome, score: +r.score.toFixed(3), sovrapposizione: +s.toFixed(2) });
      if (q > punteggio) { punteggio = q; migliore = r; }
    }
    if (!migliore) return { ...p, nome: null, provenienza: "geometria" };
    usate.add(migliore);
    return {
      ...p,
      // ⚠️ SOLO il nome e il ruolo vengono dall'occhio. Centro, ingombro, area,
      //    quota e conteggi restano quelli misurati: non si copia mai una
      //    coordinata dalla scatola del modello.
      nome: migliore.voce.nome,
      funzione: migliore.voce.funzione || null,
      provenienza: "occhio",
      fiducia: +migliore.score.toFixed(3),
      alternative: alternative.sort((a, b) => b.score - a.score).slice(0, 3),
    };
  });

  return {
    posti: fuori,
    senzaNome: fuori.filter((p) => !p.nome).length,
    // quante rilevazioni non hanno trovato nessun mucchio sotto: e' il numero
    // che dice quanto l'occhio e la geometria si stanno parlando
    scartate: nominanti.filter((r) => !usate.has(r)).length,
    persone: persone.length,
  };
}

// ---------------------------------------------------------------------------
// 4. Il giro completo
// ---------------------------------------------------------------------------

/**
 * Guarda la pianta e nomina i mucchi.
 *
 * @param {Array}  posti
 * @param {Object} opz
 *   @param {Object}   opz.inquadratura  da `veritas_vista.inquadratura`
 *   @param {*}        opz.pianta        l'immagine (data URL, canvas, ImageData)
 *   @param {Function} opz.rileva        (immagine, parole) -> Promise<[{score,label,box}]>
 *                     iniettato: cosi' il modulo si prova senza scaricare
 *                     seicento megabyte di modello, e si puo' cambiare
 *                     rilevatore senza toccare il resto.
 *   @param {string}   opz.dominio
 *   @param {Array}    opz.parole        parole in piu', chieste dall'utente
 */
export async function riconosci(posti, opz = {}) {
  if (!posti || !posti.length) {
    return { ok: false, perche: "non ci sono mucchi misurati da nominare" };
  }
  if (!opz.rileva) {
    return { ok: false, perche: "l'occhio non e' disponibile" };
  }
  if (!opz.inquadratura || !opz.pianta) {
    return { ok: false, perche: "manca la pianta vista dall'alto" };
  }

  // ⚠️ `soloParole` — si cerca SOLO quello che e' stato chiesto, senza il
  //    vocabolario di base. Serve al circuito: quando e' il cervello a dire
  //    all'occhio cosa cercare, l'elenco e' di poche voci mirate e aggiungerci
  //    158 termini generici rifarebbe lo spazzolamento cieco che il 25/08 era
  //    gia' stato dichiarato morto — moltiplicato per il numero di viste.
  const voci = opz.soloParole
    ? vociDaParole(opz.parole)
    : vocabolarioPer(opz.dominio, opz.parole);
  const parole = voci.map((v) => v.chiedi);

  let grezze;
  try {
    grezze = await opz.rileva(opz.pianta, parole);
  } catch (e) {
    return { ok: false, perche: "l'occhio non ha risposto: " + (e && e.message ? e.message : e) };
  }
  if (!Array.isArray(grezze)) {
    return { ok: false, perche: "l'occhio ha risposto in un modo che non so leggere" };
  }

  const perParola = new Map(voci.map((v) => [v.chiedi, v]));
  const rilevazioni = [];
  for (const g of grezze) {
    if (!g || typeof g.score !== "number" || !g.box) continue;
    const voce = perParola.get(g.label);
    if (!voce) continue;                       // il modello ha inventato un'etichetta
    const mondo = scatolaInMondo(opz.inquadratura, g.box);
    if (!mondo) continue;
    rilevazioni.push({ score: g.score, voce, mondo });
  }

  const esito = abbina(posti, rilevazioni, opz);
  return {
    ok: true,
    ...esito,
    rilevazioni: rilevazioni.length,
    chieste: parole.length,
    nominati: esito.posti.filter((p) => p.nome).length,
  };
}

// ---------------------------------------------------------------------------
// 5. L'occhio vero: OWLv2 dentro il browser
// ---------------------------------------------------------------------------
//
// Si carica alla prima richiesta e resta caricato. Il modello si scarica una
// volta sola e poi vive nella cache del browser.
//
// ⚠️ Prima si prova sulla scheda video (WebGPU) con i pesi a 4 bit — 128 MB e
//    qualche secondo. Se la scheda non c'e' o il browser non la espone, si
//    ricade sul processore con i pesi a 8 bit: piu' lento, ma funziona.
//    Non si finge che sia andata bene: `stato()` dice sempre com'e' andata.

export const MODELLO = "Xenova/owlv2-base-patch16-ensemble";

let _occhio = null, _stato = { fase: "spento", device: null, perche: null };

export function stato() { return { ..._stato }; }

/**
 * Costruisce il rilevatore vero. Restituisce una funzione `rileva`.
 *
 * @param {Function} importa  () -> Promise<modulo transformers.js>
 *                   iniettabile per la stessa ragione di sopra: qui non si
 *                   scarica niente durante le prove.
 */
export async function occhioLocale(opz = {}) {
  if (_occhio) return _occhio;
  const importa = opz.importa || (() => import("@huggingface/transformers"));
  _stato = { fase: "carico", device: null, perche: null };

  let pipeline, env;
  try {
    ({ pipeline, env } = await importa());
  } catch (e) {
    _stato = { fase: "spento", device: null, perche: "libreria non caricata: " + (e && e.message) };
    return null;
  }

  // ⚠️ L'OCCHIO VUOLE UNA STANZA SUA. Misurato il 04/09/2026 sulla pagina viva:
  //    con la scena 3D caricata l'occhio non si apre e l'errore e' un numero
  //    nudo, 267935216 -- che sono 255,5 MB, cioe' il tetto di memoria del
  //    motore ONNX. Non e' un guasto: e' che quella memoria, nella pagina, non
  //    c'e' piu'. Nella stessa identica prova fatta su una pagina vuota lo
  //    stesso formato si apre senza un fiato.
  //
  //    `proxy` sposta il motore in un lavoratore separato, che ha la sua
  //    memoria e il suo filo di esecuzione. Due cose in una: l'occhio trova lo
  //    spazio, e la pagina smette di bloccarsi mentre lui carica -- gli scatti
  //    che si vedevano durante la simulazione erano anche questo.
  //
  //    ⚠️ VA MESSO PRIMA che venga creata la prima sessione. Dopo non serve a
  //       niente: il motore si accende una volta sola per pagina e resta com'e'
  //       (stessa regola per cui la scala dei tentativi conta solo al primo
  //       gradino -- vedi TENTATIVI in veritas_montaggio.js).
  try {
    if (env && env.backends && env.backends.onnx && env.backends.onnx.wasm)
      env.backends.onnx.wasm.proxy = true;
  } catch (e) { /* se la libreria cambia forma non ci si ferma per questo */ }

  const tentativi = opz.tentativi || [
    { device: "webgpu", dtype: "q4f16" },
    { device: "wasm", dtype: "q8" },
  ];
  let detector = null, usato = null, ultimo = null;
  for (const t of tentativi) {
    try {
      detector = await pipeline("zero-shot-object-detection", opz.modello || MODELLO, t);
      usato = t;
      break;
    } catch (e) { ultimo = e; }
  }
  if (!detector) {
    _stato = { fase: "spento", device: null,
               perche: "modello non caricato: " + (ultimo && ultimo.message ? ultimo.message : ultimo) };
    return null;
  }

  _stato = { fase: "pronto", device: usato.device, dtype: usato.dtype, perche: null };
  _occhio = async function rileva(immagine, parole) {
    const out = await detector(immagine, parole, {
      threshold: opz.soglia != null ? opz.soglia : FIDUCIA_MINIMA,
      // ⚠️ percent_boxes: OWLv2 in transformers.js puo' restituire le scatole
      //    in pixel; `scatolaInMondo` riconosce da sola i due formati, quindi
      //    non si impone nulla qui.
    });
    return Array.isArray(out) ? out : [];
  };
  return _occhio;
}

// ---------------------------------------------------------------------------
// 6. Raccontarlo in italiano
// ---------------------------------------------------------------------------

export function racconta(r) {
  if (!r) return "";
  if (!r.ok) return "Non ho potuto guardare: " + r.perche + ".";
  if (!r.nominati) {
    return "Ho guardato la pianta e non ho riconosciuto niente di quello che ho "
      + "misurato (" + r.rilevazioni + " cose viste, nessuna sopra un mucchio "
      + "misurato). Puo' voler dire che la pianta e' troppo grossolana, o che in "
      + "questo modello ci sono oggetti a cui non ho pensato: dimmi tu cosa "
      + "cercare e glielo chiedo.";
  }
  const righe = [];
  righe.push("Ho guardato la pianta e ho riconosciuto " + r.nominati
    + (r.nominati === 1 ? " cosa" : " cose") + " su " + r.posti.length + ":");
  for (const p of r.posti.filter((x) => x.nome).slice(0, 10))
    righe.push("  - " + p.nome + " — " + p.oggetti + " oggetti, "
      + Math.round(p.area) + " m2 (fiducia " + Math.round(p.fiducia * 100) + "%)");
  if (r.senzaNome)
    righe.push(r.senzaNome + (r.senzaNome === 1 ? " mucchio resta" : " mucchi restano")
      + " senza nome: li ho misurati ma non ho capito cosa sono.");
  if (r.scartate)
    righe.push(r.scartate + " cose viste non stanno sopra niente di misurato, e le ho "
      + "buttate: senza una misura sotto non possono entrare in un referto.");
  righe.push("Le posizioni non sono cambiate: l'occhio dice cosa, la geometria dice dove.");
  return righe.join("\n");
}

// ---------------------------------------------------------------------------
// 7. La pianta come immagine
// ---------------------------------------------------------------------------
//
// `veritas_vista.piantaDelPavimento` restituisce i pixel come Uint8Array RGBA,
// letti dal bersaglio di rendering. Il rilevatore vuole un'immagine.
//
// ⚠️ IL VERSO DELLE RIGHE. `readRenderTargetPixels` consegna la riga 0 in
//    fondo (convenzione WebGL), una tela la vuole in cima. Qui NON si gira
//    niente di proposito: si scrive la riga 0 dell'array nella riga 0 della
//    tela, cosi' la coordinata `y` che il rilevatore restituisce e' lo stesso
//    indice che `pixelAMondo` si aspetta. Una sola convenzione, quella gia' in
//    uso da chi legge la segnaletica.
//
//    Girare qui e non la' — o viceversa — metterebbe ogni nome sul lato
//    sbagliato dell'edificio, e sarebbe un difetto perfettamente silenzioso:
//    nomi plausibili, tutti specchiati.

export function piantaInTela(pianta, doc) {
  const d = doc || (typeof document !== "undefined" ? document : null);
  if (!d || !pianta || !pianta.pixel) return null;
  const tela = d.createElement("canvas");
  tela.width = pianta.larghezza;
  tela.height = pianta.altezza;
  const ctx = tela.getContext("2d");
  const img = ctx.createImageData(pianta.larghezza, pianta.altezza);
  img.data.set(pianta.pixel);
  ctx.putImageData(img, 0, 0);
  return tela;
}

// ---------------------------------------------------------------------------
// 8. Si aggancia da solo
// ---------------------------------------------------------------------------
//
// L'occhio e' SEMPRE ACCESO — deciso da Raffaella il 19/08/2026. Ogni modello
// caricato viene guardato, senza chiedere. Il modello di visione si scarica una
// volta e resta nella cache del browser.
//
// ⚠️ Si guarda DOPO che le cose sono state misurate: senza i mucchi non c'e'
//    niente da nominare, e una rilevazione senza una misura sotto viene
//    buttata (vedi `abbina`).

if (typeof window !== "undefined") {
  window.__veritasGuarda = async function (opz = {}) {
    const THREE = window.THREE;
    const vista = window.__veritasVista;
    const rend = window.__veritasRenderer;
    const radice = window.__veritasModelRoot;
    const trovate = window.__veritasCoseTrovate;

    if (!THREE || !vista || !rend || !radice)
      return { ok: false, perche: "manca la scena o il disegnatore di piante" };
    if (!trovate || !trovate.posti || !trovate.posti.length)
      return { ok: false, perche: "non ho ancora misurato nessun mucchio di oggetti" };

    const pianta = vista.piantaDelPavimento(THREE, rend, radice,
      Object.assign({ tutto: true }, opz.pianta || {}));
    if (!pianta) return { ok: false, perche: "non sono riuscito a disegnare la pianta" };
    const tela = piantaInTela(pianta);
    if (!tela) return { ok: false, perche: "non sono riuscito a costruire l'immagine" };

    const rileva = opz.rileva || await occhioLocale(opz);
    if (!rileva) return { ok: false, perche: (stato().perche || "l'occhio non si e' acceso") };

    const r = await riconosci(trovate.posti, {
      ...opz,
      inquadratura: pianta,
      pianta: tela,
      rileva,
      dominio: opz.dominio || window.__veritasProjectType || null,
    });
    window.__veritasVisto = r;
    if (!r.ok) return r;

    // I nomi arrivano alle tappe che stanno sopra i mucchi nominati.
    //
    // ⚠️ SI PASSA DAL PONTE CHE ESISTE GIA': `__veritasApplicaOcchi`. Quello
    //    conosce il vocabolario dei `type` (portante: ci si appoggiano
    //    traiettorie, altezze dei marker e grafo delle missioni in una ventina
    //    di punti), la tabella dei nomi per dominio, la guardia «il nome del
    //    modello vince», e la rete di unicita' che impedisce quattro sale
    //    chiamate uguale. Scriverne un secondo qui vorrebbe dire due
    //    meccanismi che divergono alla prima modifica — l'errore che questo
    //    progetto ha gia' pagato due volte.
    const nodi = window.__veritasGetNodes ? window.__veritasGetNodes() : [];
    const assegnate = [];
    nodi.forEach(function (n, i) {
      if (!n.posto) return;
      const p = r.posti.find((q) =>
        Math.abs(q.centro[0] - n.posto.centro[0]) < 1e-9 &&
        Math.abs(q.centro[2] - n.posto.centro[2]) < 1e-9);
      // ⚠️ QUI C'ERANO DUE CANCELLI, e sono la quinta porta del 29/08 rimasta
      //    aperta in questo file mentre il gemello dentro index.html veniva
      //    riparato. Il primo pretendeva una `funzione`: un volume con un nome
      //    ottimo ma senza la parola giusta spariva. Il secondo chiamava
      //    `tipoDiFunzione`, che restituisce una STRINGA, e ne leggeva `.tipo`
      //    e `.fuori`: due `undefined`. Il ruolo capito non e' mai arrivato al
      //    simulatore da questa strada.
      //
      //    Ora basta il NOME. Il ruolo si prende se c'e', e se non c'e' si
      //    lascia null: chi riceve tiene quello che la tappa aveva gia'.
      //    Capito a meta' vale piu' di niente.
      if (!p || !p.nome) return;
      const t = window.__veritasOcchi && window.__veritasOcchi.categoriaDi
        ? window.__veritasOcchi.categoriaDi(p.funzione) : null;
      assegnate.push({
        indice: i,
        funzione: t ? t.chiave : null,
        tipo: t ? t.chiave : null,
        fuori: t ? t.fuori : undefined,
        // La fiducia del rilevatore diventa la sicurezza che il ponte gia'
        // sa leggere: sotto la soglia bassa non scavalca una misura.
        sicurezza: p.fiducia >= 0.35 ? "alta" : (p.fiducia >= 0.2 ? "media" : "bassa"),
        nome: p.nome,
      });
    });
    r.rinominate = assegnate.length && typeof window.__veritasApplicaOcchi === "function"
      ? window.__veritasApplicaOcchi({ assegnate }, nodi)
      : 0;

    console.log("[VERITAS occhio] " + r.nominati + " mucchi nominati su " + r.posti.length
      + ", " + r.scartate + " rilevazioni buttate, " + r.rinominate + " tappe rinominate"
      + " (" + stato().device + "/" + stato().dtype + ")");
    if (typeof window.__veritasAnnounce === "function")
      try { window.__veritasAnnounce(racconta(r)); } catch (e) {}
    return r;
  };

  const precedente = window.__veritasOnModelLoaded;
  window.__veritasOnModelLoaded = function () {
    let out;
    try { out = precedente ? precedente.apply(this, arguments) : undefined; }
    catch (e) { console.error("[VERITAS occhio] errore nel passo precedente:", e); }
    // Molto dopo gli altri: servono la scala sistemata, le cose misurate e la
    // navmesh. Se qualcosa non c'e' ancora, `__veritasGuarda` lo dice e non
    // rompe niente.
    setTimeout(function () {
      window.__veritasGuarda().catch(function (e) {
        console.warn("[VERITAS occhio] non ha guardato:", e && e.message ? e.message : e);
      });
    }, 3000);
    return out;
  };
  console.log("[VERITAS occhio] pronto — window.__veritasGuarda()");
}

export default {
  VOCABOLARIO, ADE20K_150, AGGIUNTE,
  SOVRAPPOSIZIONE_MINIMA, INGRANDIMENTO_MAX, FIDUCIA_MINIMA, MODELLO,
  piantaInTela,
  vocabolarioPer, scatolaInMondo, abbina, riconosci,
  occhioLocale, stato, racconta,
};
