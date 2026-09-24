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

// ---------------------------------------------------------------------------
// LA POSTURA — che cosa fa il CORPO davanti a questo oggetto
// ---------------------------------------------------------------------------
//
// Deciso da Raffaella il 04/09/2026: *«mettiamo le animazioni base, poi
// vediamo»* — come in un motore di gioco, dove Idle e Walk non descrivono una
// situazione ma COME STA IL CORPO.
//
// ⚠️ LA FUNZIONE DICE A CHE COSA SERVE LA ZONA, LA POSTURA DICE COSA FA
//    L'AVATAR. Sono due cose diverse e non si sostituiscono. `FUNZIONE_DI`
//    resta com'e' ed e' letta da chi ordina le tappe del percorso: cambiarla
//    romperebbe il viaggio. Questa tabella si AGGIUNGE, e parla al corpo.
//
// ⚠️ PERCHE' SERVIVA, misurato il 04/09: nel registro delle funzioni una
//    voce sola, «sosta», faceva il lavoro di cinque comportamenti diversi —
//    sedersi su una panca, guardare un quadro in piedi, stare sdraiati in un
//    letto, mangiare, giocare. Un quadro e una panca dicevano al programma la
//    STESSA parola. Da li' nascevano i quattordici volumi chiamati tutti
//    «sala d'attesa»: non era l'occhio che non discriminava, era il registro
//    che aveva una parola sola dove ne servivano cinque.
//
// ⚠️ LE POSTURE SONO POCHE APPOSTA, E NON DIVENTANO MOLTE. I comportamenti
//    umani sono infiniti; le posture no. Quello che si moltiplica e' QUANDO si
//    cambia posizione e CHE COSA si ha davanti, non il numero delle voci qui
//    sotto. Se un giorno questa tabella arriva a venti righe, vuol dire che
//    dentro ci e' rientrato il tipo di edificio — che e' esattamente cio' che
//    la Regola 0-bis vieta.
//
//    seduto    ci si sta sopra, e ci si puo' fermare a lungo
//    sdraiato  idem, ma orizzontale: degenza, riposo
//    in piedi  ci si ferma davanti, senza sedersi: si guarda, si compra, si
//              e' ricevuti da qualcuno
//    passa     non ci si ferma: si attraversa, e uno per volta
//
// ⚠️ Chi non ha postura non e' un errore: e' un oggetto davanti al quale il
//    corpo non fa niente di particolare (un'automobile, una pista). L'avatar
//    ci passa accanto, e il programma lo dice invece di inventarsi un gesto.
// ⚠️ LE PAROLE CHE NOMINANO UN LUOGO, NON UN OGGETTO. Marcate il 05/09/2026
//    su decisione di Raffaella.
//
//    Il registro dichiara dal 30/08: NON SI CHIEDE PER TIPO DI EDIFICIO, SI
//    CHIEDE PER OGGETTO. Sette parole lo violavano, e quattro le avevamo
//    scritte noi. La piu' costosa e' «una sala d'attesa con file di sedute»:
//    misurato il 04/09, e' il nome finito su QUATTORDICI volumi su diciotto.
//
//    E l'occhio non aveva sbagliato. Gli abbiamo chiesto «vedi una sala
//    d'attesa?» a uno che vede sedute dappertutto, e ha risposto di si'
//    quattordici volte. La domanda era sbagliata, non la risposta.
//
// ⚠️ NON SI TOLGONO DAL VOCABOLARIO. La direttiva 6 dice che il vocabolario
//    e' enciclopedico e non si sceglie a mano cosa il programma sa riconoscere:
//    queste parole si continuano a chiedere, e quello che l'occhio vede si
//    continua a tenere. Ma non possono dare il NOME a un volume — come le
//    persone, che si riconoscono apposta per poterle mettere da parte.
//    Il nome della zona nasce dagli OGGETTI che ci stanno dentro.
const LUOGHI = Object.freeze(new Set([
  "building", "house", "field",
  "a waiting room with rows of seats", "a security checkpoint",
  "a lecture hall with tiered seating", "an airport departure gate",
]));

const POSTURA_DI = Object.freeze({
  // ci si siede
  chair: "seduto", armchair: "seduto", seat: "seduto", sofa: "seduto",
  bench: "seduto", stool: "seduto", ottoman: "seduto", grandstand: "seduto",
  toilet: "seduto",
  // ci si sta sdraiati
  bed: "sdraiato", cradle: "sdraiato",
  // ci si presenta a qualcuno: si sta in piedi, e si fa la fila
  counter: "in piedi", countertop: "in piedi", desk: "in piedi",
  booth: "in piedi", buffet: "in piedi", bar: "in piedi",
  // ci si ferma davanti e si guarda
  painting: "in piedi", sculpture: "in piedi", case: "in piedi",
  poster: "in piedi", stage: "in piedi", "bulletin board": "in piedi",
  // ci si sta davanti e si fa qualcosa con le mani
  "arcade machine": "in piedi", "pool table": "in piedi",
  refrigerator: "in piedi", stove: "in piedi", oven: "in piedi", food: "in piedi",
  sink: "in piedi", shower: "in piedi", washer: "in piedi", wardrobe: "in piedi",
  "conveyer belt": "in piedi",
  // non ci si ferma: si attraversa
  door: "passa", "screen door": "passa", stairs: "passa", stairway: "passa",
  escalator: "passa", step: "passa", path: "passa", bridge: "passa",
});

// ⚠️ DIRETTIVA 17 — LA PAROLA VISTA TIRA LA CONSEGUENZA.
//
// Raffaella, 06/09/2026: «l'occhio dovrebbe sparare un razzo in testa al
// cervello e dire: questa o e' una vendita di automobili, oppure c'e' una
// strada. Ma siccome c'e' un aereo, e' difficile che si vendano le macchine —
// e quindi e' un aeroporto, e quindi quello e' un ingresso».
//
// E' la sorella di POSTURA_DI, e ha la stessa forma: una parola, una
// conseguenza. La postura dice cosa fa il CORPO davanti a quell'oggetto;
// questa dice dove si TROVA chi lo vede.
//
// ⚠️ DUE FORZE, E LA DIFFERENZA E' IL PUNTO DELLA DIRETTIVA.
//   · "sempre"      — non puo' stare al chiuso. Il cielo, una strada, un
//                     marciapiede, una pista: chi li vede e' fuori, e basta.
//   · "quasi sempre" — al chiuso ci sta, ma solo in un edificio che lo espone:
//                     un'automobile in un concessionario, un aereo in un museo,
//                     una barca in un salone. Da sola non decide: e' un VOTO.
//                     E' esattamente il dubbio di Raffaella — «o e' una vendita
//                     di automobili, oppure c'e' una strada» — e si scioglie
//                     con gli altri indizi, non con una soglia.
//
// ⚠️ E' AGNOSTICO, e deve restarlo (Regola 0-bis). «Dove ci sono veicoli si e'
//    all'aperto» vale in un aeroporto, in una scuola, in un ospedale, in un
//    centro commerciale. Qui dentro non compare, e non deve comparire mai, il
//    nome di un tipo di edificio.
//
// ⚠️ NESSUNA MISURA IN METRI. Il marchio «da fuori» si reggeva su tre soglie
//    (lungo >= 3 m, largo >= 1,5 m, alto >= 1 m) tarate quando il modello
//    stava a scala 7,3x. Il righello umano lo ha portato a 5,272x, le macchine
//    si sono ristrette da 1,70 a 1,23 m, e zero su quattro passavano piu'.
//    Una soglia in metri e' tarata su una SCALA, e la scala di questo progetto
//    cambia. Cio' che l'occhio sa nominare non si misura: si chiede a lui.
const ARIA_APERTA_DI = Object.freeze({
  // non puo' stare al chiuso: chi lo vede e' fuori
  sky: "sempre", road: "sempre", sidewalk: "sempre", runway: "sempre",
  grass: "sempre", earth: "sempre", land: "sempre", field: "sempre",
  sea: "sempre", river: "sempre", mountain: "sempre", hill: "sempre",
  skyscraper: "sempre", streetlight: "sempre",
  // al chiuso ci sta solo in un edificio che lo espone: vota, non decide
  car: "quasi sempre", bus: "quasi sempre", truck: "quasi sempre",
  van: "quasi sempre", minibike: "quasi sempre", bicycle: "quasi sempre",
  boat: "quasi sempre", ship: "quasi sempre", airplane: "quasi sempre",
  tent: "quasi sempre", awning: "quasi sempre", palm: "quasi sempre",
  tree: "quasi sempre",
});

// ⚠️ LA TERZA SORELLA — DOVE SI METTONO I PIEDI.
//
// Raffaella, 06/09/2026, dopo aver visto il camminatore attraversare il
// piazzale: «Dovrebbe fare anche due piu' due, l'AI. Nel senso: ci sono gli
// aerei. Si cammina in mezzo agli aerei? Non lo so. Ci sono i tubi attaccati
// agli aerei che portano a una struttura».
//
// E il 07/09, guardando il film dal vivo: «stavamo camminando sull'ala di un
// aereo. Se riconosci un aereo, e che quello e' un aeroporto, devi sapere che
// non cammini in mezzo agli aerei, ma che c'e' un tunnel a un livello piu'
// basso fra l'aereo e il terminal».
//
// E' la stessa forma di POSTURA_DI e ARIA_APERTA_DI: una parola, una
// conseguenza. Le tre insieme dicono tre cose diverse sulla stessa parola:
//   · POSTURA_DI      — che cosa fa il CORPO davanti a quell'oggetto;
//   · ARIA_APERTA_DI  — dove si TROVA chi lo vede (dentro o fuori);
//   · CALPESTIO_DI    — se li' i piedi ci si possono mettere.
//
// ⚠️ E NON SONO LA STESSA COSA, ed e' il motivo per cui ne serviva una terza.
//    Un marciapiede sta all'aperto e ci si cammina; una carreggiata sta
//    all'aperto e non ci si cammina. «Fuori» non risponde alla domanda «ci
//    passo?»: sono due domande diverse e vogliono due registri diversi.
//
// LE DUE INVARIANTI, dette da Raffaella, e sono AGNOSTICHE:
//   1. «dove passano i mezzi, la gente non cammina» -> "mezzi".
//      Vale per il piazzale di un aeroporto, la rampa delle ambulanze di un
//      ospedale, il carico e scarico di un centro commerciale, la corsia di
//      una strada davanti a una scuola.
//   2. «un tubo che unisce un mezzo a un edificio e' un passaggio: di li' si
//      cammina» -> "passaggio". E' il pontile d'imbarco, ed e' anche la
//      passerella di una nave e il sottopasso di una stazione.
//
// ⚠️ IL PASSAGGIO BATTE I MEZZI, SEMPRE, ed e' il cuore della seconda
//    invariante. Un pontile d'imbarco sta SOPRA il piazzale e in mezzo agli
//    aerei: chi guardasse solo la prima invariante lo butterebbe via —
//    cancellando proprio l'unica strada per cui un passeggero puo' passare.
//    Chi legge questo registro deve far vincere "passaggio".
//
// ⚠️ NESSUNA MISURA IN METRI, come per le sorelle. Un tubo non si riconosce
//    perche' e' lungo 30 m e largo 3: si riconosce perche' l'occhio lo NOMINA.
//    Una soglia in metri e' tarata su una scala, e la scala di questo progetto
//    e' gia' cambiata una volta (7,3x -> 5,272x).
//
// ⚠️ QUI NON SI SCRIVE «AEROPORTO», e non ci si scrive nessun tipo di
//    edificio (Regola 0-bis). Le chiavi sono OGGETTI che l'occhio sa nominare.
//
// 📌 LA FONTE, ED E' QUELLA DECISA: **Uniclass 2015, tabella SL**
//    (Spaces/locations) — gratuita, ISO 12006-2, la stessa con cui si
//    classificano gli oggetti IFC. Scaricata e letta il 07/09/2026 da
//    github.com/buildig/uniclass-2015 -> uniclass2015/Uniclass2015_SL.csv,
//    1.041 voci. Neufert e i manuali editoriali NO: sono opere protette, e in
//    un prodotto che si vende diventano un problema legale.
//
//    Uniclass classifica gli spazi per l'ATTIVITA' che ospitano, ed e'
//    esattamente la distinzione che Raffaella ha chiesto. Le due invarianti
//    hanno un corrispondente citabile, e queste sono le voci vere:
//
//    "mezzi"     SL_80_05    Aerospace ground spaces
//                SL_80_05_03 Aeroplane runways · SL_80_05_02 landing strips
//                SL_80_05_05 Aircraft manoeuvring areas
//                SL_80_05_06 Aircraft standing areas   <- il piazzale
//                SL_80_35_13 Carriageways · SL_80_35_45 Lanes
//                SL_80_35_08 Bus manoeuvring · SL_80_35_11 Car manoeuvring
//
//    "passaggio" SL_80_10_09 Boarding areas             <- il pontile
//                SL_80_10_80 Ship gangways
//                SL_80_10_16 Concourses
//                SL_80_35_62 Pedestrian crossings
//                SL_80_35_63 Pedestrian routes
//                SL_80_96_60 Passageway tunnels
//                SL_90_10_95 Walkways
//                SL_90_10_16 Covered walkways and internal bridges
//
// ⚠️ E QUELLO CHE UNICLASS **NON** HA, detto perche' non si scopra domani:
//    non esiste una voce «jet bridge» / «air bridge». La piu' vicina e'
//    SL_80_10_09 «Boarding areas». Quindi la parola che l'occhio usa
//    (`a jet bridge`) resta nostra, dichiarata fra le AGGIUNTE; e' la
//    CONSEGUENZA che viene dalla tabella, non il nome.
//
// ⚠️ E NON SI COPIANO I TITOLI DI UNICLASS DENTRO IL VOCABOLARIO. Sono nomi
//    di LUOGO («Departure lounges», «Passenger gates»), e il 05/09 quattro
//    nomi di luogo nel vocabolario hanno prodotto quattordici sale d'attesa
//    dove ce n'erano sei. Da Uniclass si prende il criterio, non le parole.
const CALPESTIO_DI = Object.freeze({
  // (1) DOVE PASSANO I MEZZI, LA GENTE NON CAMMINA.
  //     Il mezzo e la sua superficie di manovra dicono la stessa cosa: quello
  //     spazio e' di chi si muove su ruote o ali, non di chi ha i piedi.
  airplane: "mezzi", runway: "mezzi", road: "mezzi",
  car: "mezzi", truck: "mezzi", bus: "mezzi", van: "mezzi",
  minibike: "mezzi", bicycle: "mezzi", ship: "mezzi", boat: "mezzi",
  "a train": "mezzi",
  // ⚠️ `pier` (molo) sta di qua e non di la': in ADE20K e' la banchina su cui
  //    ormeggia una nave, cioe' il bordo dell'acqua, non il tubo d'imbarco.
  //    Il tubo e' `a jet bridge`, qui sotto.
  pier: "mezzi",

  // (2) UN TUBO CHE UNISCE UN MEZZO A UN EDIFICIO E' UN PASSAGGIO.
  //     E vince sui mezzi: sta in mezzo a loro apposta.
  "a jet bridge": "passaggio",   // il pontile — Uniclass SL_80_10_09
  bridge: "passaggio",           // la passerella — SL_90_10_16
  sidewalk: "passaggio",         // SL_80_35_63, ed e' il caso che dimostra
                                 // perche' «fuori» non basta: sta all'aperto
                                 // e ci si cammina eccome
  path: "passaggio",
  stairs: "passaggio", stairway: "passaggio", escalator: "passaggio",
});

// ---------------------------------------------------------------------------
// 2-quater. IL PASSO: ferma chi cammina, o ci si passa?
// ---------------------------------------------------------------------------
//
// HANDOFF §9, 17/09/2026: «cio' che l'occhio riconosce — "qui e' una parete",
// "qui si passa" — deve marcare la mappa di cammino. La geometria resta un
// parere secondario. Nel dubbio vince l'occhio.» E Raffaella, lo stesso
// giorno: *«non trovo la scritta muro... io voglio un'intelligenza che capisce
// guardando»*. Muro e varco sono conclusioni da indizi visti, non nomi di mesh.
//
// E' la quarta sorella di POSTURA_DI, ARIA_APERTA_DI e CALPESTIO_DI: una
// parola, una conseguenza. Due valori soli:
//   · "ferma" — un elemento che separa: dove l'occhio lo vede, di li' non si
//     passa, anche se la geometria non ci ha visto niente;
//   · "varco" — un'apertura in una separazione: dove l'occhio lo vede, di li'
//     si passa, anche se la geometria ci vede un muro pieno (la porta
//     modellata chiusa).
//
// 📌 LA FONTE: Uniclass 2015, tabella EF (Elements/functions), letta il
//    17/09/2026 da github.com/buildig/uniclass-2015 -> Uniclass2015_EF.csv:
//      EF_25     Wall and barrier elements
//      EF_25_10  Walls                    -> "ferma"
//      EF_25_30  Doors and windows        -> la porta e' "varco", la finestra
//                                            e' parte della parete: "ferma"
//      EF_25_55  Barriers                 -> "ferma" (recinzioni, parapetti)
//    Le scale e le rampe (EF_35) NON stanno qui: collegano piani, e quel
//    collegamento lo dichiara gia' la navmesh (collegamentiVerticali).
//
// ⚠️ QUI NON SI SCRIVE NESSUN TIPO DI EDIFICIO (Regola 0-bis). Le chiavi sono
//    OGGETTI che l'occhio sa nominare; la conseguenza viene dalla tabella.
const PASSO_DI = Object.freeze({
  wall: "ferma",                 // EF_25_10
  windowpane: "ferma",           // EF_25_30, la finestra
  fence: "ferma",                // EF_25_55
  railing: "ferma",              // EF_25_55
  bannister: "ferma",            // EF_25_55
  door: "varco",                 // EF_25_30, la porta
  "screen door": "varco",        // EF_25_30, la porta a vetri
  "a turnstile": "varco",        // aggiunta dichiarata: si passa, uno alla volta
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
  { chiedi: "a reception desk", postura: "in piedi", nome: "banco di accoglienza", funzione: "accoglienza",
    domini: "*", perche: "«counter» c'e', ma non dice che dietro ci sta una persona che riceve" },
  { chiedi: "a check-in counter", postura: "in piedi", nome: "banchi di accettazione", funzione: "accoglienza",
    domini: "*", perche: "accettazione: aeroporto, ospedale, albergo, fiera" },
  { chiedi: "a ticket desk", postura: "in piedi", nome: "biglietteria", funzione: "accoglienza",
    domini: "*", perche: "museo, teatro, stadio, stazione: la funzione e' la stessa" },
  { chiedi: "a self service kiosk", postura: "in piedi", nome: "chioschi", funzione: "accoglienza",
    domini: "*", perche: "il totem di servizio, diverso da «booth»" },
  { chiedi: "a waiting room with rows of seats", postura: "seduto", nome: "sala d'attesa", funzione: "sosta",
    domini: "*", perche: "le sedute in fila si vedono, ma nessun termine ADE20K le lega all'attesa" },

  // --- controlli: dove si passa uno per volta ------------------------------
  { chiedi: "a security checkpoint", postura: "passa", nome: "varco di controllo", funzione: "filtro",
    domini: "*", perche: "aeroporti, tribunali, stadi, ospedali: il filtro obbligato non e' in ADE20K" },
  { chiedi: "a metal detector", postura: "passa", nome: "metal detector", funzione: "filtro",
    domini: "*", perche: "e' l'oggetto che si vede in pianta, e non solo in aeroporto" },
  { chiedi: "a turnstile", postura: "passa", nome: "tornelli", funzione: "filtro",
    domini: "*", perche: "il filtro dei musei e dei trasporti, assente da ADE20K" },

  // --- cura: ospedali, cliniche, ambulatori, infermerie --------------------
  { chiedi: "a hospital bed", postura: "sdraiato", nome: "letti di degenza", funzione: "sosta",
    domini: "*", perche: "ADE20K ha «bed», ma non distingue un letto di casa da uno di reparto" },
  { chiedi: "a hospital stretcher", postura: "sdraiato", nome: "barelle", funzione: "sosta",
    domini: "*", perche: "dice che li' passano lettighe, quindi il passaggio dev'essere largo" },
  { chiedi: "a wheelchair", postura: "seduto", nome: "sedie a rotelle", funzione: null,
    domini: "*", perche: "non implica una funzione, ma cambia le larghezze che servono" },
  { chiedi: "a medical examination table", postura: "sdraiato", nome: "lettino da visita", funzione: "sosta",
    domini: "*", perche: "l'oggetto che distingue un ambulatorio da un ufficio" },
  { chiedi: "a medical imaging machine", postura: "sdraiato", nome: "apparecchiature diagnostiche", funzione: "sosta",
    domini: "*", perche: "macchinari ingombranti e fissi: vincolano la stanza attorno" },
  { chiedi: "a nurses station", postura: "in piedi", nome: "postazione infermieri", funzione: "accoglienza",
    domini: "*", perche: "il presidio di reparto, che non e' ne' un banco ne' un ufficio" },

  // --- didattica: scuole, universita', sale corsi --------------------------
  { chiedi: "rows of school desks", postura: "seduto", nome: "banchi scolastici", funzione: "sosta",
    domini: "*", perche: "«desk» e «table» non dicono che sono in file rivolte da una parte" },
  { chiedi: "a whiteboard or blackboard", postura: "in piedi", nome: "lavagna", funzione: "sosta",
    domini: "*", perche: "l'oggetto che orienta l'aula e ne indica il fronte" },
  { chiedi: "a lecture hall with tiered seating", postura: "seduto", nome: "aula a gradoni", funzione: "sosta",
    domini: "*", perche: "ADE20K ha «grandstand», che non e' la stessa cosa di un'aula" },
  { chiedi: "a row of lockers", postura: "in piedi", nome: "armadietti", funzione: "servizio",
    domini: "*", perche: "scuole, palestre, piscine, depositi: assente da ADE20K" },
  { chiedi: "a laboratory bench", postura: "in piedi", nome: "banconi da laboratorio", funzione: "sosta",
    domini: "*", perche: "distingue un laboratorio da un'aula normale" },

  // --- esposizione e vendita ----------------------------------------------
  { chiedi: "a museum display case", postura: "in piedi", nome: "vetrine espositive", funzione: "sosta",
    domini: "*", perche: "ADE20K ha «case», generico: qui la funzione e' precisa" },
  { chiedi: "supermarket shelving aisles", postura: "in piedi", nome: "scaffalature", funzione: "sosta",
    domini: "*", perche: "le corsie di vendita si leggono in pianta come file parallele" },
  { chiedi: "a checkout counter with cash register", postura: "in piedi", nome: "casse", funzione: "sosta",
    domini: "*", perche: "il punto di pagamento: e' un filtro, e fa coda" },

  // --- trasporto: bagagli e mezzi -----------------------------------------
  { chiedi: "a baggage carousel", postura: "in piedi", nome: "nastro bagagli", funzione: "servizio",
    domini: "*", perche: "ADE20K ha «conveyer belt», qui e' piu' preciso" },
  { chiedi: "a luggage trolley", postura: null, nome: "carrelli", funzione: null,
    domini: "*", perche: "non implica una funzione, ma dice che li' si trascina qualcosa" },

  // 🔴 LIBERATA IL 07/09/2026, E LA RAGIONE SCRITTA QUI ERA FALSA.
  //
  //    Diceva «fuori da un aeroporto non esiste», e non e' vero: lo stesso
  //    oggetto — un tubo chiuso che unisce un mezzo fermo a un edificio — c'e'
  //    su una nave (la passerella d'imbarco) e su una stazione (il tunnel
  //    coperto verso il binario). Il nome commerciale e' «passenger boarding
  //    bridge», e nessuno dei tre settori lo chiama in un modo solo.
  //
  // ⚠️ E CHIUDERLA COSTAVA CARO, ed e' esattamente la paura di Raffaella
  //    (07/09): *«tu metti le parole, io ti dico i ragionamenti — se no rischi
  //    che non valga quando cambieremo il modello»*. Con `domini: "aeroporto"`
  //    la seconda invariante del calpestio («un tubo che unisce un mezzo a un
  //    edificio e' un passaggio») **non poteva scattare su un porto o su una
  //    stazione**, perche' all'occhio quella parola non veniva nemmeno chiesta.
  //    L'invariante era agnostica; una delle sue parole no.
  //
  // 📌 E non c'e' nessun motivo di risparmiare: **le parole non costano**
  //    (misurato il 04/09 — 4 parole 201,3 s, 158 parole 201,3 s: si paga il
  //    guardare la figura, una volta sola). Chiederla su una scuola costa zero
  //    e non trova niente, che e' il comportamento giusto.
  { chiedi: "a jet bridge", postura: "passa", nome: "pontile d'imbarco", funzione: "destinazione",
    domini: "*", perche: "un tubo chiuso fra un mezzo fermo e un edificio: c'e' anche su una nave e su una stazione" },
  // --- l'unica che resta legata a un dominio -------------------------------
  { chiedi: "an airport departure gate", postura: "in piedi", nome: "gate d'imbarco", funzione: "destinazione",
    domini: "aeroporto", perche: "e' un NOME DI LUOGO, non un oggetto: sta in LUOGHI e non nomina niente" },
  // Un mezzo che ADE20K-150 non ha, e senza il quale la prima invariante non
  // scatta su una stazione: dove passa un treno, la gente non cammina.
  // ⚠️ E' un VEICOLO, non un tipo di edificio. La differenza e' tutta qui.
  { chiedi: "a train", postura: null, nome: "treno", funzione: null,
    domini: "*", perche: "ADE20K-150 non ha nessun mezzo su rotaia, e un binario e' il caso da manuale di «dove passano i mezzi»" },
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
    postura: POSTURA_DI[t] || null,
    ariaAperta: ARIA_APERTA_DI[t] || null,
    luogo: LUOGHI.has(t),
    domini: "*",
    fonte: "ADE20K-150",
    controprova: t === "person",
  })).concat(AGGIUNTE.map((a) => ({ ...a, termine: a.chiedi, luogo: LUOGHI.has(a.chiedi),
    fonte: "aggiunta dichiarata" })))
    // ⚠️ IL CALPESTIO SI ATTACCA DOPO, e a tutte e due le sorgenti insieme.
    //    Le parole di ADE20K e le AGGIUNTE dichiarate arrivano da due strade
    //    diverse: se la conseguenza si scrivesse solo dentro il primo `map`,
    //    `a jet bridge` — che e' un'aggiunta, ed e' proprio la parola per cui
    //    questo registro esiste — resterebbe senza. Una passata sola su
    //    entrambe, e nessuna parola puo' restare indietro per la porta da cui
    //    e' entrata.
    .map((v) => ({ ...v, calpestio: v.calpestio || CALPESTIO_DI[v.termine] || null,
                   passo: v.passo || PASSO_DI[v.termine] || null }))
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
export function sovrapposizione(a, b) {
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
  // ⚠️ E NEMMENO I LUOGHI, per la stessa ragione rovesciata: «sala d'attesa»
  //    non e' una cosa che sta nella stanza, e' la stanza. Chiamare un volume
  //    con il nome di una stanza vuol dire aver deciso la zonazione PRIMA di
  //    guardare cosa c'e' dentro — ed e' cosi' che quattordici volumi su
  //    diciotto hanno preso lo stesso nome. Il nome nasce dagli oggetti.
  //    Cio' che l'occhio ha visto non si butta: esce in `luoghiVisti`, come
  //    testimonianza da dare al cervello.
  const luoghi = buone.filter((r) => r.voce && r.voce.luogo);
  const nominanti = buone.filter((r) => !(r.voce && (r.voce.controprova || r.voce.luogo)));

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

  // ⚠️ PERCHE' una rilevazione viene buttata. Il conteggio nudo non basta:
  //    «78 buttate» puo' voler dire quattro guasti diversi, e tre di loro NON
  //    si curano toccando le soglie.
  //      sul vuoto     — il riquadro non tocca nessun mucchio. O l'occhio si e'
  //                      sbagliato, o `veritas_cose.js` non raccoglie in mucchi
  //                      quella cosa. Nessuna soglia la recupera.
  //      sfiorata      — tocca un mucchio ma sotto SOVRAPPOSIZIONE_MINIMA. E'
  //                      l'unico caso in cui la soglia c'entra davvero, e
  //                      `sovrapposizioneMax` dice di quanto si e' mancato.
  //      troppo grande — combacia, ma il riquadro supera INGRANDIMENTO_MAX
  //                      volte il mucchio: sta indicando la stanza, non la cosa.
  //      battuta       — era una candidata buona e ha perso il mucchio contro
  //                      una migliore. NON e' un guasto e non va corretta:
  //                      gonfia il conteggio senza che manchi niente.
  //    Si guardano PRIMA di spostare qualunque numero.
  const scarti = nominanti.filter((r) => !usate.has(r)).map((r) => {
    const areaR = areaDi(r.mondo);
    const cx = (r.mondo.min[0] + r.mondo.max[0]) / 2;
    const cz = (r.mondo.min[2] + r.mondo.max[2]) / 2;
    let sMax = 0, vicino = null, candidata = false, oltreIngombro = false;
    // ⚠️ Due «piu' vicini» diversi, e servono tutti e due: `vicino` e' quello
    //    che si sovrappone di piu' (e su una buttata «sul vuoto» non esiste),
    //    `accanto` e' quello che sta a meno metri. E' `accanto` a dire se un
    //    riquadro sul vuoto e' caduto a mezzo metro da un mucchio — allora la
    //    cosa c'e' e non combacia — o a trenta, e allora indica qualcosa che
    //    `veritas_cose.js` non ha raccolto in nessun mucchio.
    let dMin = Infinity, accanto = null;
    for (const p of (posti || [])) {
      const d = Math.hypot(p.centro[0] - cx, p.centro[2] - cz);
      if (d < dMin) { dMin = d; accanto = p; }
      const s = sovrapposizione(p.ingombro, r.mondo);
      if (s > sMax) { sMax = s; vicino = p; }
      if (s < minSovr) continue;
      if (areaR > maxIngr * areaDi(p.ingombro)) { oltreIngombro = true; continue; }
      candidata = true;
    }
    const rif = vicino || accanto;
    return {
      motivo: candidata ? "battuta" : oltreIngombro ? "troppo grande"
        : sMax <= 0 ? "sul vuoto" : "sfiorata",
      nome: r.voce ? r.voce.nome : (r.label || "?"),
      score: +r.score.toFixed(3),
      sovrapposizioneMax: +sMax.toFixed(3),
      areaRiquadro: +areaR.toFixed(1),
      // dove sta il riquadro, in metri di mondo: serve a capire se le buttate
      // cadono tutte nella stessa zona o sono sparse
      dove: [+cx.toFixed(1), +cz.toFixed(1)],
      distanza: dMin === Infinity ? null : +dMin.toFixed(1),
      vicinoForma: rif ? (rif.forma || null) : null,
      vicinoArea: rif ? +areaDi(rif.ingombro).toFixed(1) : null,
      ingrandimento: rif ? +(areaR / areaDi(rif.ingombro)).toFixed(1) : null,
    };
  });
  const scartatePerMotivo = scarti.reduce((a, s) => {
    a[s.motivo] = (a[s.motivo] || 0) + 1; return a;
  }, {});

  return {
    posti: fuori,
    senzaNome: fuori.filter((p) => !p.nome).length,
    // quante rilevazioni non hanno trovato nessun mucchio sotto: e' il numero
    // che dice quanto l'occhio e la geometria si stanno parlando
    scartate: scarti.length,
    // ...e queste dicono PERCHE', una per una
    scarti,
    scartatePerMotivo,
    persone: persone.length,
    luoghi: luoghi.length,
    luoghiVisti: luoghi.map((r) => ({
      nome: r.voce.nome, score: +r.score.toFixed(3),
      dove: r.mondo ? [+((r.mondo.min[0] + r.mondo.max[0]) / 2).toFixed(1),
                       +((r.mondo.min[2] + r.mondo.max[2]) / 2).toFixed(1)] : null,
    })),
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
/**
 * I RITAGLI DOVE C'E' QUALCOSA. Non si guarda piu' tutta la pianta.
 *
 * Raffaella, 22/09/2026: *«l'occhio dovrebbe essere cosi' intelligente da
 * scartare l'aria e passare alle porzioni significative»*.
 *
 * ⚠️ PERCHE' SI PUO' FARE, e non e' una scorciatoia. Le porzioni significative
 *    non vanno indovinate: sono gia' misurate. `veritas_cose.posti()` dice
 *    dove stanno i mucchi di arredi, con il loro ingombro in metri. Guardare
 *    li' non e' guardare di meno — e' guardare esattamente dove c'e' qualcosa
 *    che merita un nome.
 *
 * ⚠️ E PERCHE' SERVE. Misurato il 22/09 sul terminal: 227 rilevazioni, di cui
 *    **44 buttate perche' cadevano sul vuoto**, e 316 secondi di sola
 *    scansione. La pianta e' larga 106 m e i mucchi ne occupano una frazione:
 *    tutto il resto e' pavimento nudo fotografato per niente. In piu' un
 *    ritaglio stretto fa vedere la seduta GRANDE invece che di dieci pixel,
 *    che e' la ragione per cui un rilevatore la riconosce o no.
 *
 * ⚠️ IL MARGINE NON E' UN NUMERO A CASO: e' il giro d'aria attorno a un
 *    arredo, cioe' lo spazio che serve a capire a cosa serve. Un banco senza
 *    il suo davanti non si distingue da uno scaffale.
 *
 * ⚠️ E I RITAGLI CHE SI TOCCANO SI FONDONO: due mucchi vicini in un ritaglio
 *    solo si leggono nel loro rapporto — file di sedute davanti a un banco —
 *    mentre in due ritagli separati diventano due cose che non si parlano.
 *
 * Se non c'e' niente da ritagliare torna `null`, e chi chiama guarda la pianta
 * intera come prima: un modello senza arredi misurati non deve smettere di
 * essere guardato.
 *
 * @returns {null|Array<{tela, inquadratura, quanti}>}
 */
export function ritagliSuiPosti(tela, inq, posti, opz = {}) {
  const doc = opz.doc || (typeof document !== "undefined" ? document : null);
  if (!doc || !tela || !inq || !posti || !posti.length) return null;
  const m = inq.metriPerPixel;
  if (!(m > 0) || !(tela.width > 0) || !(tela.height > 0)) return null;

  const margine = opz.margineM != null ? opz.margineM : 2.5;
  // Sotto questo lato il rilevatore non ha abbastanza pixel per decidere: un
  // ritaglio piu' piccolo si allarga, non si assottiglia.
  const minLato = opz.minLatoPx != null ? opz.minLatoPx : 256;
  const W = tela.width, H = tela.height;

  let rett = [];
  for (const p of posti) {
    const c = p && p.centro;
    if (!c) continue;
    const d = (p.ingombro && p.ingombro.dim) || [0, 0, 0];
    const lx = Math.max(0, d[0]) / 2 + margine, lz = Math.max(0, d[2]) / 2 + margine;
    let x0 = (c[0] - lx - inq.origine[0]) / m, x1 = (c[0] + lx - inq.origine[0]) / m;
    let y0 = (c[2] - lz - inq.origine[1]) / m, y1 = (c[2] + lz - inq.origine[1]) / m;
    if (x1 < x0) { const t = x0; x0 = x1; x1 = t; }
    if (y1 < y0) { const t = y0; y0 = y1; y1 = t; }
    // allargare fino al lato minimo, restando dentro la tela
    const cresci = (a, b, limite) => {
      const manca = minLato - (b - a);
      if (manca > 0) { a -= manca / 2; b += manca / 2; }
      if (a < 0) { b -= a; a = 0; }
      if (b > limite) { a -= (b - limite); b = limite; }
      return [Math.max(0, Math.round(a)), Math.min(limite, Math.round(b))];
    };
    const [ax, bx] = cresci(x0, x1, W);
    const [ay, by] = cresci(y0, y1, H);
    if (bx - ax < 8 || by - ay < 8) continue;
    rett.push({ x0: ax, y0: ay, x1: bx, y1: by, quanti: 1 });
  }
  if (!rett.length) return null;

  // Fondere quelli che si toccano, finche' non cambia piu' niente.
  let cambiato = true;
  while (cambiato) {
    cambiato = false;
    for (let i = 0; i < rett.length && !cambiato; i++)
      for (let k = i + 1; k < rett.length; k++) {
        const a = rett[i], b = rett[k];
        if (a.x1 < b.x0 || b.x1 < a.x0 || a.y1 < b.y0 || b.y1 < a.y0) continue;
        a.x0 = Math.min(a.x0, b.x0); a.y0 = Math.min(a.y0, b.y0);
        a.x1 = Math.max(a.x1, b.x1); a.y1 = Math.max(a.y1, b.y1);
        a.quanti += b.quanti;
        rett.splice(k, 1);
        cambiato = true;
        break;
      }
  }

  // Se i ritagli coprono quasi tutta la pianta non c'e' niente da guadagnare:
  // si guarda la pianta intera, che almeno e' un'immagine sola.
  const areaTela = W * H;
  const areaRit = rett.reduce((s, r) => s + (r.x1 - r.x0) * (r.y1 - r.y0), 0);
  if (areaRit >= areaTela * (opz.sogliaResa != null ? opz.sogliaResa : 0.75)) return null;

  const fuori = [];
  for (const r of rett) {
    const w = r.x1 - r.x0, h = r.y1 - r.y0;
    const c = doc.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    if (!g) continue;
    g.drawImage(tela, r.x0, r.y0, w, h, 0, 0, w, h);
    fuori.push({
      tela: c,
      quanti: r.quanti,
      // ⚠️ L'INQUADRATURA DEL RITAGLIO, ed e' la riga da cui dipende tutto:
      //    `scatolaInMondo` legge `origine` e `metriPerPixel`, e se l'origine
      //    restasse quella della pianta intera OGNI rilevazione finirebbe
      //    spostata del taglio. Nomi plausibili sul posto sbagliato — il
      //    difetto peggiore di tutti, gia' pagato una volta con le piante per
      //    livello.
      inquadratura: Object.assign({}, inq, {
        larghezza: w, altezza: h,
        origine: [inq.origine[0] + r.x0 * m, inq.origine[1] + r.y0 * m],
      }),
    });
  }
  return fuori.length ? fuori : null;
}

/**
 * I RITAGLI SU UNA TAVOLA SOLA — come si impagina un foglio di dettagli.
 *
 * ⚠️ PERCHE' ESISTE. Misurato il 22/09/2026: ritagliare la pianta sui mucchi
 *    porta i pixel guardati dal 100% al 19% e i mucchi nominati da 6 a 9 su
 *    20 — ma il giro passa da 316 a 394 secondi. Il tempo del rilevatore NON
 *    lo fa la superficie: lo fa il numero di CHIAMATE per il numero di PAROLE
 *    (177 a chiamata). Tre ritagli sono tre vocabolari invece di uno.
 *
 *    Quindi i ritagli si affiancano su un'unica immagine e si chiede una volta
 *    sola: i pixel utili restano quelli, l'aria resta fuori, e le chiamate
 *    tornano a essere una per pianta.
 *
 * ⚠️ OGNI TASSELLO PORTA LA SUA INQUADRATURA, e un riquadro si attribuisce al
 *    tassello in cui cade il suo CENTRO. Un riquadro a cavallo di due tasselli
 *    non e' un oggetto: e' il rilevatore che ha unito due cose lontane
 *    nel mondo e vicine sul foglio. Si butta, e si dice quanti.
 *
 * @returns {null|{tela, tasselli:Array<{x,y,w,h,inquadratura}>}}
 */
export function tavolaDiRitagli(ritagli, opz = {}) {
  const doc = opz.doc || (typeof document !== "undefined" ? document : null);
  if (!doc || !ritagli || ritagli.length < 2) return null;
  const gronda = opz.grondaPx != null ? opz.grondaPx : 8;   // il bianco fra un tassello e l'altro
  const latoMax = opz.latoMaxPx != null ? opz.latoMaxPx : 2048;

  // Impaginazione a scaffali: si ordina per altezza e si riempie riga per riga.
  const pezzi = ritagli.map((r, i) => ({ i, w: r.tela.width, h: r.tela.height, r }))
    .sort((a, b) => b.h - a.h);
  const largo = Math.min(latoMax, Math.max(...pezzi.map((p) => p.w)) + gronda * 2,
    Math.max(512, Math.ceil(Math.sqrt(pezzi.reduce((s, p) => s + p.w * p.h, 0)) * 1.4)));
  const posti_ = [];
  let x = gronda, y = gronda, altezzaRiga = 0;
  for (const p of pezzi) {
    if (x + p.w + gronda > largo && x > gronda) { x = gronda; y += altezzaRiga + gronda; altezzaRiga = 0; }
    posti_.push({ p, x, y });
    x += p.w + gronda;
    if (p.h > altezzaRiga) altezzaRiga = p.h;
  }
  const alto = y + altezzaRiga + gronda;
  if (!(largo > 0) || !(alto > 0) || largo * alto > latoMax * latoMax * 2) return null;

  const tela = doc.createElement("canvas");
  tela.width = largo; tela.height = alto;
  const g = tela.getContext("2d");
  if (!g) return null;
  // Il fondo e' quello della pianta, non bianco: un bordo netto inventa spigoli
  // che il rilevatore legge come muri.
  g.fillStyle = opz.fondo || "#eceff1";
  g.fillRect(0, 0, largo, alto);
  const tasselli = [];
  for (const q of posti_) {
    g.drawImage(q.p.r.tela, q.x, q.y);
    tasselli.push({ x: q.x, y: q.y, w: q.p.w, h: q.p.h, inquadratura: q.p.r.inquadratura });
  }
  return { tela, tasselli };
}

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

  // ⚠️ SI GUARDA SOLO DOVE C'E' QUALCOSA. I ritagli nascono dai mucchi gia'
  //    misurati: se non se ne puo' fare nessuno si guarda la pianta intera,
  //    esattamente come prima.
  const ritagli = opz.soloDoveCePosti === false
    ? null : ritagliSuiPosti(opz.pianta, opz.inquadratura, posti, opz);
  // I ritagli su una tavola sola: una chiamata, non N. Se l'impaginazione non
  // riesce si guardano uno per uno, che e' il comportamento precedente.
  const tavola = ritagli ? tavolaDiRitagli(ritagli, opz) : null;
  const viste = tavola
    ? [{ tela: tavola.tela, tasselli: tavola.tasselli, quanti: posti.length }]
    : (ritagli || [{ tela: opz.pianta, inquadratura: opz.inquadratura, quanti: posti.length }]);

  const perParola = new Map(voci.map((v) => [v.chiedi, v]));
  const rilevazioni = [];
  let guardate = 0, fallite = 0, ultimoErrore = null, fuoriTassello = 0;
  for (const v of viste) {
    let grezze;
    try {
      grezze = await opz.rileva(v.tela, parole);
    } catch (e) {
      // ⚠️ Un ritaglio muto non ferma gli altri, ma si conta e si dice: un
      //    silenzio parziale spacciato per lettura completa e' il difetto che
      //    questo progetto ha gia' pagato piu' volte.
      fallite++; ultimoErrore = (e && e.message) || String(e);
      continue;
    }
    if (!Array.isArray(grezze)) { fallite++; ultimoErrore = "risposta illeggibile"; continue; }
    guardate++;
    for (const g of grezze) {
      if (!g || typeof g.score !== "number" || !g.box) continue;
      const voce = perParola.get(g.label);
      if (!voce) continue;                       // il modello ha inventato un'etichetta
      let inq = v.inquadratura, box = g.box;
      if (v.tasselli) {
        // Il riquadro appartiene al tassello in cui cade il suo CENTRO.
        let b = box;
        if (Math.max(b.xmin, b.ymin, b.xmax, b.ymax) <= 1.001 && v.tela.width > 2)
          b = { xmin: b.xmin * v.tela.width, xmax: b.xmax * v.tela.width,
                ymin: b.ymin * v.tela.height, ymax: b.ymax * v.tela.height };
        const cx = (b.xmin + b.xmax) / 2, cy = (b.ymin + b.ymax) / 2;
        const t = v.tasselli.find((q) => cx >= q.x && cx <= q.x + q.w && cy >= q.y && cy <= q.y + q.h);
        if (!t) { fuoriTassello++; continue; }
        // a cavallo di due tasselli non e' un oggetto: e' il foglio letto come
        // se fosse il mondo
        if (b.xmin < t.x - 1 || b.xmax > t.x + t.w + 1
            || b.ymin < t.y - 1 || b.ymax > t.y + t.h + 1) { fuoriTassello++; continue; }
        inq = t.inquadratura;
        box = { xmin: b.xmin - t.x, xmax: b.xmax - t.x, ymin: b.ymin - t.y, ymax: b.ymax - t.y };
      }
      const mondo = scatolaInMondo(inq, box);
      if (!mondo) continue;
      rilevazioni.push({ score: g.score, voce, mondo });
    }
  }
  if (!guardate) {
    return { ok: false, perche: "l'occhio non ha risposto" + (ultimoErrore ? ": " + ultimoErrore : "") };
  }
  if (ritagli) {
    try {
      const px = ritagli.reduce((s, v) => s + v.tela.width * v.tela.height, 0);
      const tot = opz.pianta.width * opz.pianta.height;
      console.log("[VERITAS occhio] guardato solo dove c'e' qualcosa: " + ritagli.length
        + " ritagli sui " + posti.length + " mucchi misurati, "
        + Math.round(100 * px / Math.max(1, tot)) + "% dei pixel della pianta"
        + (tavola ? ", impaginati su UNA tavola " + tavola.tela.width + "×" + tavola.tela.height
            + " (1 chiamata invece di " + ritagli.length + ")" : ", uno per uno")
        + (fuoriTassello ? " · " + fuoriTassello + " riquadri a cavallo fra due tasselli, buttati" : "")
        + (fallite ? " (" + fallite + " ritagli muti)" : ""));
    } catch (e) {}
  }

  const esito = abbina(posti, rilevazioni, opz);
  return {
    ok: true,
    ...esito,
    rilevazioni: rilevazioni.length,
    chieste: parole.length,
    nominati: esito.posti.filter((p) => p.nome).length,
    // ⚠️ DIRETTIVA 17 — QUELLO CHE L'OCCHIO HA VISTO NON RESTA DENTRO L'OCCHIO.
    //    Fino al 06/09 di qui usciva solo il NUMERO delle rilevazioni: chi
    //    voleva sapere *che cosa* fosse stato visto, e DOVE, non aveva modo di
    //    chiederlo. Cosi' il marchio «da fuori» degli accessi si e' dovuto
    //    reggere su tre soglie in metri — che si sono rotte il giorno in cui la
    //    scala e' cambiata (7,3x -> 5,272x: le macchine da 1,70 a 1,23 m di
    //    larghezza, e zero su quattro passavano piu').
    //
    //    Adesso ogni rilevazione esce con la sua parola, dove sta, quanto ci
    //    crede l'occhio, e la CONSEGUENZA che quella parola porta con se'
    //    (`ariaAperta`: "sempre" / "quasi sempre" / null). Chi deve decidere
    //    qualcosa lo chiede all'occhio invece di misurarlo.
    //
    //    ⚠️ Restano rilevazioni, non misure: sono cio' che l'occhio DICE di
    //       aver visto, con la sua fiducia accanto. Chi le usa lo dichiari.
    viste: rilevazioni.map((r) => ({
      termine: r.voce.termine,
      nome: r.voce.nome,
      ariaAperta: r.voce.ariaAperta || null,
      // ⚠️ E LA TERZA CONSEGUENZA VIAGGIA COL RESTO: «mezzi» dove la gente non
      //    cammina, «passaggio» dove si cammina anche se sta all'aperto. Senza
      //    questa riga il registro esisterebbe e non lo leggerebbe nessuno —
      //    che e' lo stesso identico difetto di `occhioSuTutteLeViste()`,
      //    scritta giusta e mai chiamata per due settimane.
      calpestio: r.voce.calpestio || null,
      // e la quarta: ferma chi cammina, o ci si passa (PASSO_DI)
      passo: r.voce.passo || null,
      luogo: !!r.voce.luogo,
      controprova: !!r.voce.controprova,
      score: +r.score.toFixed(3),
      centro: r.mondo && r.mondo.centro ? r.mondo.centro.slice() : null,
      mondo: r.mondo ? { min: r.mondo.min.slice(), max: r.mondo.max.slice() } : null,
    })),
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

let _occhio = null, _inCorso = null, _stato = { fase: "spento", device: null, perche: null };

export function stato() { return { ..._stato }; }

// ⚠️ L'INDIRIZZO PER ESTESO DELLA LIBRERIA. Serve al lavoratore, che non puo'
//    usare l'importmap di `index.html` (le mappe di importazione non valgono
//    dentro un Web Worker). Tenerlo qui, in chiaro, e' la stessa scelta gia'
//    fatta per il `.wasm` di web-ifc in `veritas_bim.js`: una costante che
//    `banco/monta.sh` possa riscrivere quando il CDN non si raggiunge.
//    `window.__veritasTransformersUrl` la scavalca senza toccare il file.
export const LIBRERIA =
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js";

// La scala dei formati: una sola, e sta qui. La usano tutte e due le strade.
const TENTATIVI = [
  { device: "wasm", dtype: "q8" },       // MISURATO: e' quello che apre
  { device: "wasm", dtype: "fp32" },     // nessuna compressione: l'ultima spiaggia
];

function perche(e) {
  if (e == null) return "motivo non detto";
  if (typeof e === "string" || typeof e === "number") return String(e);
  return e.message ? e.message : String(e);
}

// I pixel da mandare di la'. Si RICOPIANO sempre, mai si passa l'originale:
// un ArrayBuffer trasferito viene svuotato da questa parte, e chi ce l'aveva
// si ritroverebbe l'immagine vuota senza un errore — la pianta e gli scorci
// vengono riusati dal cervello e dal referto dopo che l'occhio li ha visti.
function pixelDa(immagine, doc) {
  if (!immagine) return null;
  // Una vista grezza (`piantaDelPavimento`, `scorciTreQuarti`): i pixel ci sono gia'.
  if (immagine.pixel && immagine.larghezza && immagine.altezza)
    return { dati: new Uint8Array(immagine.pixel).buffer,
             larghezza: immagine.larghezza, altezza: immagine.altezza };
  // Una tela. ⚠️ Se `getContext` dice di no (una tela gia' presa da WebGL non
  //    restituisce un contesto 2D) non si va avanti a testa bassa: si scende
  //    alla strada sotto, che ridisegna su una tela nuova. Un `getImageData`
  //    su `null` qui dentro tornerebbe a chi chiama come uno sguardo vuoto, e
  //    l'occhio sembrerebbe cieco invece che ostacolato.
  if (typeof immagine.getContext === "function") {
    const c = immagine.getContext("2d", { willReadFrequently: true });
    if (c) {
      const d = c.getImageData(0, 0, immagine.width, immagine.height);
      return { dati: d.data.buffer, larghezza: immagine.width, altezza: immagine.height };
    }
  }
  // Qualunque altra immagine (un `<img>`, un ImageBitmap): si passa da una tela.
  const D = doc || (typeof document !== "undefined" ? document : null);
  const l = immagine.width || immagine.naturalWidth, a = immagine.height || immagine.naturalHeight;
  if (!D || !l || !a) return null;
  const t = D.createElement("canvas");
  t.width = l; t.height = a;
  const ctx = t.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(immagine, 0, 0);
  const d = ctx.getImageData(0, 0, l, a);
  return { dati: d.data.buffer, larghezza: l, altezza: a };
}

/**
 * L'occhio in una stanza sua: apre `veritas_occhio_lavoratore.js` in un Web
 * Worker e gli parla per messaggi. Restituisce una `rileva` con la stessa
 * firma di sempre, oppure `null` se la stanza non si apre — e in quel caso
 * chi chiama ripiega sulla strada vecchia, che resta qui sotto intatta.
 *
 * ⚠️ IL MOTIVO E' IL §6.7 DEL HANDOFF: durante il lavoro dell'occhio la pagina
 *    si fermava a tratti, e si fermava anche il velo. Non era il motore ONNX —
 *    quello stava gia' di la' col `proxy`. Era il contorno che transformers.js
 *    fa sul filo di chi chiama: ridimensionare l'immagine a 960x960,
 *    normalizzarla, spezzare in simboli fino a 158 parole, e poi leggere 3.600
 *    riquadri PER OGNI parola. Spostando tutto, sul filo della pagina non
 *    resta che la copia dei pixel.
 */
async function occhioNelLavoratore(opz = {}) {
  if (typeof Worker === "undefined" || typeof window === "undefined") return null;

  let lav = null;
  try {
    lav = new Worker(new URL("./veritas_occhio_lavoratore.js?v=1", import.meta.url),
                     { type: "module" });
  } catch (e) {
    _stato = { fase: "spento", device: null, dove: "lavoratore",
               perche: "la stanza separata non si apre: " + perche(e) };
    return null;
  }

  const attese = new Map();
  let numero = 0, rispondiAccensione = null, finito = null;

  lav.onmessage = function (ev) {
    const m = ev.data || {};
    if (m.tipo === "pronto" || m.tipo === "spento") {
      if (rispondiAccensione) { const f = rispondiAccensione; rispondiAccensione = null; f(m); }
      return;
    }
    const a = attese.get(m.id);
    if (!a) return;
    attese.delete(m.id);
    if (m.tipo === "visto") a.ok(m.esito);
    else a.ko(new Error(m.perche || "sguardo non riuscito"));
  };
  // Se il lavoratore muore, muore in silenzio: nessuno riceverebbe mai una
  // risposta e ogni attesa resterebbe appesa per sempre. Qui si fa il contrario
  // di quello che vieta la regola 10: si chiude tutto e si dice cos'e' successo.
  lav.onerror = lav.onmessageerror = function (ev) {
    finito = (ev && ev.message) || "il lavoratore si e' fermato";
    if (rispondiAccensione) { const f = rispondiAccensione; rispondiAccensione = null; f({ tipo: "spento", perche: finito }); }
    for (const a of attese.values()) a.ko(new Error(finito));
    attese.clear();
  };

  // Accensione, con un tetto d'attesa esplicito: al primo giro il modello si
  // scarica (centinaia di MB), quindi il tetto e' largo — ma c'e'.
  const tettoAccensione = opz.attesaAccensione != null ? opz.attesaAccensione : 300000;
  const esito = await new Promise(function (risolvi) {
    rispondiAccensione = risolvi;
    const sveglia = setTimeout(function () {
      if (rispondiAccensione) { rispondiAccensione = null;
        risolvi({ tipo: "spento", perche: "l'occhio non ha risposto entro "
                  + Math.round(tettoAccensione / 1000) + " s" }); }
    }, tettoAccensione);
    const chiudi = function (m) { clearTimeout(sveglia); risolvi(m); };
    rispondiAccensione = chiudi;
    lav.postMessage({
      tipo: "accendi",
      libreria: opz.libreria || window.__veritasTransformersUrl || LIBRERIA,
      modello: opz.modello || MODELLO,
      tentativi: opz.tentativi || TENTATIVI,
      soglia: opz.soglia != null ? opz.soglia : FIDUCIA_MINIMA,
      fili: navigator.hardwareConcurrency || 2,
    });
  });

  if (esito.tipo !== "pronto") {
    try { lav.terminate(); } catch (e) {}
    _stato = { fase: "spento", device: null, dove: "lavoratore", perche: esito.perche };
    return null;
  }

  _stato = { fase: "pronto", device: esito.device, dtype: esito.dtype,
             dove: "lavoratore", perche: null };

  const tettoSguardo = opz.attesaSguardo != null ? opz.attesaSguardo : 600000;
  return async function rileva(immagine, parole) {
    if (finito) throw new Error(finito);
    const p = pixelDa(immagine);
    if (!p) throw new Error("non ho capito che immagine mi hai dato");
    const id = ++numero;
    return await new Promise(function (ok, ko) {
      const sveglia = setTimeout(function () {
        attese.delete(id);
        ko(new Error("l'occhio non ha finito di guardare entro "
                     + Math.round(tettoSguardo / 1000) + " s"));
      }, tettoSguardo);
      attese.set(id, { ok: function (v) { clearTimeout(sveglia); ok(v); },
                       ko: function (e) { clearTimeout(sveglia); ko(e); } });
      lav.postMessage({ tipo: "guarda", id, dati: p.dati,
                        larghezza: p.larghezza, altezza: p.altezza,
                        parole, soglia: opz.soglia != null ? opz.soglia : FIDUCIA_MINIMA },
                      [p.dati]);
    });
  };
}

/**
 * Costruisce il rilevatore vero. Restituisce una funzione `rileva`.
 *
 * @param {Function} importa  () -> Promise<modulo transformers.js>
 *                   iniettabile per la stessa ragione di sopra: qui non si
 *                   scarica niente durante le prove.
 */
export async function occhioLocale(opz = {}) {
  if (_occhio) return _occhio;
  // ⚠️ UNA SOLA ACCENSIONE PER VOLTA, e questo freno mancava.
  //
  //    La guardia sopra vede solo l'occhio GIA' ACCESO: due chiamate che
  //    arrivano mentre il modello sta ancora aprendosi passavano tutte e due.
  //    Nella pagina succede davvero — lo sguardo automatico parte 8 s dopo il
  //    caricamento, e chi chiede un giro nel frattempo entra insieme a lui.
  //    Prima costava un secondo scaricamento; da oggi costerebbe anche un
  //    SECONDO LAVORATORE, cioe' due copie di OWLv2 in memoria: esattamente il
  //    carico che fa fallire l'apertura (il numero nudo 267935216 del 04/09).
  //    Chi arriva secondo non riaccende niente: aspetta lo stesso risultato.
  if (_inCorso) return await _inCorso;
  _inCorso = accendiOcchioVero(opz);
  try { return await _inCorso; } finally { _inCorso = null; }
}

async function accendiOcchioVero(opz = {}) {
  // ⚠️ PRIMA LA STANZA SEPARATA, POI LA STRADA DI SEMPRE. Non si toglie
  //    niente: se il lavoratore non si apre (browser vecchio, modulo non
  //    servito, motore che non parte di la') si ricade qui sotto, dove il
  //    codice e' quello di prima, riga per riga. Un fix che spegne l'occhio
  //    quando fallisce sarebbe peggio del difetto che cura.
  //
  //    Non ci si prova quando la prova inietta `importa`: quelle prove esistono
  //    apposta per non scaricare niente, e un lavoratore andrebbe a cercare la
  //    libreria vera sul CDN.
  if (opz.lavoratore !== false && !opz.importa) {
    _stato = { fase: "carico", device: null, dove: "lavoratore", perche: null };
    const nellaStanza = await occhioNelLavoratore(opz);
    if (nellaStanza) { _occhio = nellaStanza; return _occhio; }
    try { console.warn("[VERITAS occhio] stanza separata non disponibile ("
      + _stato.perche + ") — si guarda dal filo della pagina"); } catch (e) {}
  }

  const importa = opz.importa || (() => import("@huggingface/transformers"));
  _stato = { fase: "carico", device: null, perche: null };

  let pipeline, env;
  try {
    ({ pipeline, env } = await importa());
  } catch (e) {
    _stato = { fase: "spento", device: null, dove: "pagina", perche: "libreria non caricata: " + (e && e.message) };
    return null;
  }

  // ⚠️ L'OCCHIO VUOLE UNA STANZA SUA. Questa e' la strada di riserva, quando
  //    il lavoratore (`occhioNelLavoratore`) non si apre: `proxy` sposta
  //    almeno il motore ONNX in un lavoratore separato, cosi' la pagina non si
  //    blocca mentre lui carica.
  //    ⛔ La vecchia spiegazione di qui («267935216 = 255,5 MB, il tetto di
  //       memoria») era sbagliata: e' l'indirizzo di un'eccezione C++, non una
  //       misura (23/09). E l'occhio che «non si apriva con la scena carica»
  //       era la pagina ferma in un ciclo infinito di `dijkstra` (24/09).
  //
  //    ⚠️ VA MESSO PRIMA che venga creata la prima sessione. Dopo non serve a
  //       niente: il motore si accende una volta sola per pagina e resta com'e'
  //       (stessa regola per cui la scala dei tentativi conta solo al primo
  //       gradino -- vedi TENTATIVI in veritas_montaggio.js).
  try {
    if (env && env.backends && env.backends.onnx && env.backends.onnx.wasm) {
      env.backends.onnx.wasm.proxy = true;

      // ⚠️ I FILI. Misurato il 04/09/2026 sulla stessa macchina, stessa figura,
      //    stesso formato:
      //
      //      un filo solo   16 parole 201,3 s   158 parole ~690 s
      //      otto fili      16 parole  63,4 s   158 parole   72,3 s
      //
      //    Tre volte e mezzo, e non e' una taratura: e' che i dodici processori
      //    prima stavano fermi. Il motore puo' usarli solo se la pagina e'
      //    `crossOriginIsolated`, e su GitHub Pages lo diventa grazie a
      //    `veritas_fili.js` — senza quello questa riga non fa niente di male,
      //    semplicemente non serve a niente.
      //
      //    ⚠️ Otto e non dodici: oltre gli otto il guadagno si appiattisce e la
      //    macchina resta senza fiato per il resto (la scena 3D, la fisica).
      //    Come il proxy, va deciso PRIMA che il motore si accenda.
      if (typeof self !== "undefined" && self.crossOriginIsolated)
        env.backends.onnx.wasm.numThreads =
          Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 2)));
    }
  } catch (e) { /* se la libreria cambia forma non ci si ferma per questo */ }

  // ⚠️ IN CIMA VA QUELLO CHE REGGE, NON QUELLO CHE SAREBBE PIU' VELOCE.
  //
  //    Il motore ONNX si accende UNA VOLTA SOLA per pagina e resta com'e': dal
  //    secondo tentativo in poi non si prova quel formato, si riceve l'esito
  //    del primo. Quindi una lista che comincia con un formato che non si apre
  //    non e' una scala di ripieghi: e' un guasto secco, e i tentativi
  //    successivi ne sono solo l'eco.
  //
  //    Qui la lista cominciava da `webgpu/q4f16`, che su questo modello NON si
  //    apre — provato il 04/09/2026 per primo, su pagina pulita, col proxy e
  //    senza: sempre lo stesso errore. Cosi' ogni accensione automatica moriva,
  //    e ogni volta si passava all'occhio di riserva. Le prove che riuscivano
  //    erano quelle in cui il formato veniva passato a mano.
  //
  //    La stessa correzione era gia' stata fatta nella lista di
  //    `veritas_montaggio.js` e non era mai arrivata qui: due liste, una
  //    corretta e una no.
  //    ⚠️ La lista ora e' UNA SOLA (`TENTATIVI`, in cima) e la usano tutte e
  //       due le strade, quella nel lavoratore e questa. Il difetto raccontato
  //       qui sopra era proprio due liste che divergono.
  const tentativi = opz.tentativi || TENTATIVI;
  let detector = null, usato = null, ultimo = null;
  for (const t of tentativi) {
    try {
      detector = await pipeline("zero-shot-object-detection", opz.modello || MODELLO, t);
      usato = t;
      break;
    } catch (e) { ultimo = e; }
  }
  if (!detector) {
    _stato = { fase: "spento", device: null, dove: "pagina",
               perche: "modello non caricato: " + (ultimo && ultimo.message ? ultimo.message : ultimo) };
    return null;
  }

  _stato = { fase: "pronto", device: usato.device, dtype: usato.dtype,
             dove: "pagina", perche: null };
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
// 7-bis. UNA PIANTA PER LIVELLO — la convenzione, non un'opzione
// ---------------------------------------------------------------------------
//
// Raffaella, 21/09/2026: *«in architettura, relativamente allo zero del piano,
// si taglia a 1,10 m. E quella è la planimetria. Punto.»*
//
// Fino a oggi a quest'occhio arrivava UNA sola pianta: il modello intero
// schiacciato dall'alto (`piantaDelPavimento`, `tutto: true`), cioè tutti i
// livelli stampati uno sopra l'altro. Su un edificio a più piani è una macchia
// in cui il piano terra e il primo si coprono a vicenda. Le piante giuste
// `veritas_tavole.js` le disegnava già, ma qui non arrivavano.
//
// ⚠️ OGNI AMBIENTE SI GIUDICA SULLA PIANTA DEL PIANO SU CUI POGGIA, e il piano
//    su cui poggia è quello del suo SOLAIO — non quello dove arriva la sua
//    testa. È la regola che regge la DOPPIA ALTEZZA, il caso posto da Raffaella
//    lo stesso giorno: una sala alta sei metri poggia a quota zero e si nomina
//    UNA volta, sulla pianta tagliata a 1,10. Sulla pianta del livello sopra
//    — 3,05 + solaio + 1,10 — quella stessa sala c'è ancora, ma è VUOTO: si
//    vede in proiezione, giù fino al pavimento di sotto. Lì non si nomina
//    niente, o la stessa sala prenderebbe due nomi: sé stessa, e quello che
//    sembra la balaustra vista dall'alto.
//
// ⛔ LA STRADA SCARTATA, perché non si ripresenti: «mostrare ogni mucchio su
//    TUTTE le piante e tenere la lettura col punteggio migliore». È una
//    scorciatoia da programmatore che in architettura non vuol dire niente:
//    una pianta non è un tentativo, è il piano a cui appartiene.
//
// ⚠️ LIMITE DEL MODELLO, NON DEL DISEGNO: su uno SPACCATO senza solai — come
//    l'aeroporto di prova — la pianta del livello 1 mostra lo stesso il piano
//    terra, perché non c'è niente che lo copra. È esattamente il motivo per
//    cui questa assegnazione serve: senza, l'occhio nominerebbe due volte il
//    piano terra.

/**
 * A quale pianta appartiene un mucchio: quella del piano su cui POGGIA.
 *
 * @param posto un mucchio misurato (`ingombro`, `centro`)
 * @param quote le quote dei pavimenti, NELL'ORDINE delle piante
 * @returns l'indice della pianta. Mai null: un mucchio sotto il livello più
 *          basso (un interrato non misurato) va con il più basso che c'è,
 *          invece di sparire.
 */
export function pianoDi(posto, quote) {
  if (!quote || !quote.length) return 0;
  // Il pavimento del mucchio e' il punto piu' basso del suo ingombro: e' li'
  // che appoggia. Il centro e' l'ultima rete, e si dichiara che e' una rete.
  const y = (posto && posto.ingombro && posto.ingombro.min
             && typeof posto.ingombro.min[1] === "number") ? posto.ingombro.min[1]
          : (posto && posto.centro && typeof posto.centro[1] === "number") ? posto.centro[1]
          : null;
  // Il gioco fra la quota dichiarata del solaio e i piedi di cio' che ci sta
  // sopra. Dieci centimetri, scritti qui e non sparsi.
  const GIOCO = 0.10;
  let scelto = -1, quotaScelta = -Infinity, piuBasso = 0, minima = Infinity;
  quote.forEach((q, i) => {
    if (typeof q !== "number") return;
    if (q < minima) { minima = q; piuBasso = i; }
    if (y != null && q <= y + GIOCO && q > quotaScelta) { quotaScelta = q; scelto = i; }
  });
  return scelto >= 0 ? scelto : piuBasso;
}

/**
 * Le letture dei singoli piani tornano a essere un referto solo.
 *
 * I numeri si sommano, gli elenchi si accodano: ogni mucchio compare una volta
 * sola perche' e' stato guardato su una pianta sola. `piante` dice su quanti
 * disegni si e' guardato — senza, un referto povero non si distingue da un
 * edificio povero.
 */
function unisciLetture(letture) {
  const buone = (letture || []).filter((x) => x && x.esito && x.esito.ok);
  if (!buone.length) return null;
  if (buone.length === 1) return Object.assign({}, buone[0].esito, { piante: 1 });
  const u = { ok: true, posti: [], senzaNome: 0, scartate: 0, scarti: [], scartatePerMotivo: {},
              persone: 0, luoghi: 0, luoghiVisti: [], rilevazioni: 0, chieste: 0,
              nominati: 0, viste: [], piante: buone.length };
  for (const { esito } of buone) {
    u.posti = u.posti.concat(esito.posti || []);
    u.scarti = u.scarti.concat(esito.scarti || []);
    u.luoghiVisti = u.luoghiVisti.concat(esito.luoghiVisti || []);
    u.viste = u.viste.concat(esito.viste || []);
    u.senzaNome += esito.senzaNome || 0;
    u.scartate += esito.scartate || 0;
    u.persone += esito.persone || 0;
    u.luoghi += esito.luoghi || 0;
    u.rilevazioni += esito.rilevazioni || 0;
    u.nominati += esito.nominati || 0;
    u.chieste = Math.max(u.chieste, esito.chieste || 0);
    for (const k of Object.keys(esito.scartatePerMotivo || {}))
      u.scartatePerMotivo[k] = (u.scartatePerMotivo[k] || 0) + esito.scartatePerMotivo[k];
  }
  return u;
}

// ---------------------------------------------------------------------------
// 8. Si aggancia da solo
// ---------------------------------------------------------------------------
//
// L'occhio e' SEMPRE ACCESO: si accende da solo a pagina ferma e resta pronto,
// e il modello di visione si scarica una volta e resta nella cache del browser.
//
// ⚠️ Ma non guarda piu' da solo a ogni modello caricato: quella riga del
//    19/08/2026 e' stata sostituita il 04/09 (vedi la nota in fondo a questa
//    sezione). A guardare la pianta e' il giro di comprensione.
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

    // ⚠️ L'OCCHIO SI CHIEDE PRIMA DI DISEGNARE. Le piante da disegnare adesso
    //    sono una per livello, non una sola: scoprire DOPO che l'occhio non si
    //    accende vorrebbe dire buttare via tutte quelle rese.
    const rileva = opz.rileva || await occhioLocale(opz);
    if (!rileva) return { ok: false, perche: (stato().perche || "l'occhio non si e' acceso") };

    // --- UNA PIANTA PER LIVELLO (sezione 7-bis) ------------------------------
    const T = window.__veritasTavole;
    const livelli = (opz.tavole && opz.tavole.livelli)
      || (window.__veritasPercezione && window.__veritasPercezione.levels) || [];
    let piante = [];
    if (T && typeof T.piantePerLivello === "function") {
      try {
        // ⚠️ LA STESSA FINEZZA DI PRIMA, non quella dell'abaco. La pianta
        //    schiacciata che si disegnava qui chiedeva `latoMax: 2048` — su
        //    questo aeroporto 19 pixel al metro. L'abaco disegna a 1300 (12
        //    px/m), che basta a un occhio umano su un foglio e non a un
        //    rilevatore: una seduta larga 55 cm passerebbe da 10 pixel a 6.
        //    Misurato nel banco il 21/09: a 1300 le cose viste raddoppiano
        //    rispetto alla lastra schiacciata, ma i mucchi nominati calano.
        piante = T.piantePerLivello(THREE, rend, radice,
          Object.assign({ lato: 2048 }, opz.tavole || {}, { livelli })) || [];
      } catch (e) {
        piante = [];
        console.warn("[VERITAS occhio] le piante per livello non si sono disegnate: "
          + ((e && e.message) || e));
      }
    }

    const letture = [];
    if (piante.length) {
      // ⚠️ L'APPARTENENZA SI LEGGE DALLA TAVOLA, non dall'indice: se una pianta
      //    non e' uscita, le altre restano appaiate al loro pavimento lo stesso.
      const quote = piante.map((t) => t.quotaPiano);
      const perPiano = piante.map(() => []);
      for (const p of trovate.posti) perPiano[pianoDi(p, quote)].push(p);
      console.log("[VERITAS occhio] " + piante.length + " piante per livello, mucchi per piano: "
        + perPiano.map((g, i) => (typeof quote[i] === "number" ? "quota " + quote[i].toFixed(2) : "?")
          + " → " + g.length).join(" · "));
      for (let i = 0; i < piante.length; i++) {
        // Un piano senza mucchi non si guarda: sarebbe una domanda senza
        // nessuno a cui riferire la risposta.
        if (!perPiano[i].length) continue;
        const t = piante[i];
        const tela = piantaInTela(t);
        if (!tela) continue;
        const esito = await riconosci(perPiano[i], {
          ...opz,
          inquadratura: Object.assign({}, t.inquadratura, { quotaPavimento: t.quotaPiano }),
          pianta: tela,
          rileva,
          dominio: opz.dominio || window.__veritasProjectType || null,
        });
        letture.push({ etichetta: t.etichetta, esito });
      }
    }

    let r = unisciLetture(letture);
    if (!r) {
      // ⚠️ LA STRADA DI PRIMA, e resta quella giusta: senza livelli misurati
      //    «la pianta del suo piano» non esiste, e di un edificio a un piano
      //    solo la pianta schiacciata e' la pianta.
      const pianta = vista.piantaDelPavimento(THREE, rend, radice,
        Object.assign({ tutto: true, conLuce: true }, opz.pianta || {}));
      if (!pianta) return { ok: false, perche: "non sono riuscito a disegnare la pianta" };
      const tela = piantaInTela(pianta);
      if (!tela) return { ok: false, perche: "non sono riuscito a costruire l'immagine" };
      r = await riconosci(trovate.posti, {
        ...opz,
        inquadratura: pianta,
        pianta: tela,
        rileva,
        dominio: opz.dominio || window.__veritasProjectType || null,
      });
      r.piante = 0;
    }
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
        // ⚠️ L'INGOMBRO DELL'OGGETTO, che fin qui si buttava.
        //    Il nome dell'occhio arrivava alla tappa, la MISURA dell'oggetto
        //    no: restava nella catena della pianta e non passava mai di qua.
        //    Serve per una cosa sola, ma decisiva: la soglia di un varco. La
        //    forma della zona descrive tutto l'ambito dei controlli (4,55 m),
        //    l'oggetto e' molto piu' stretto, e la differenza e' la gente che
        //    passa di lato. Il DOVE della tappa non si tocca: questo e' un
        //    bersaglio a cui mirare, non una posizione da riscrivere.
        // ⚠️ Scritto il 04/09 (d741aac) DENTRO index.html e mai qui: il
        //    reinline lo cancellava. Riportato nella fonte unica il 04/09 sera.
        bersaglio: (p.ingombro && p.centro)
          ? { centro: p.centro.slice(), ingombro: { min: p.ingombro.min.slice(), max: p.ingombro.max.slice() } }
          : null,
      });
    });
    r.rinominate = assegnate.length && typeof window.__veritasApplicaOcchi === "function"
      ? window.__veritasApplicaOcchi({ assegnate }, nodi)
      : 0;

    console.log("[VERITAS occhio] " + r.nominati + " mucchi nominati su " + r.posti.length
      + ", " + r.scartate + " rilevazioni buttate, " + r.rinominate + " tappe rinominate"
      + " (" + stato().device + "/" + stato().dtype + ")");
    // ⚠️ Le buttate dicono da sole di che guasto si tratta: si stampa la
    //    ripartizione, non il numero nudo. `window.__veritasScarti` le tiene
    //    tutte, una per una, per guardarle senza rifare il giro.
    window.__veritasScarti = r.scarti || [];
    const perMotivo = r.scartatePerMotivo || {};
    const righe = Object.keys(perMotivo).sort((a, b) => perMotivo[b] - perMotivo[a])
      .map((k) => perMotivo[k] + " " + k);
    if (righe.length)
      console.log("[VERITAS occhio] delle buttate: " + righe.join(", ")
        + " — window.__veritasScarti per vederle una per una");
    // ⚠️ Un ramo che si salta in silenzio e' come una funzione mai chiamata.
    //    Le parole di LUOGO si continuano a chiedere e quello che l'occhio
    //    vede si tiene: qui si dice quante erano, perche' non nominano.
    window.__veritasLuoghiVisti = r.luoghiVisti || [];
    if (r.luoghi)
      console.log("[VERITAS occhio] " + r.luoghi + " rilevazioni erano nomi di LUOGO"
        + " (sala d'attesa, gate, varco...): tenute come testimonianza, non danno il"
        + " nome a un volume — window.__veritasLuoghiVisti");
    const sfiorate = (r.scarti || []).filter((s) => s.motivo === "sfiorata")
      .map((s) => s.sovrapposizioneMax).sort((a, b) => b - a);
    if (sfiorate.length)
      console.log("[VERITAS occhio] le sfiorate mancano la soglia "
        + SOVRAPPOSIZIONE_MINIMA + ": la migliore sta a " + sfiorate[0]
        + ", la mediana a " + sfiorate[Math.floor(sfiorate.length / 2)]);

    if (typeof window.__veritasAnnounce === "function")
      try { window.__veritasAnnounce(racconta(r)); } catch (e) {}
    return r;
  };

  // ⚠️ NIENTE SGUARDO AUTOMATICO A OGNI MODELLO CARICATO. Tolto il 04/09/2026.
  //
  //    Qui stava un aggancio a `__veritasOnModelLoaded` che 3 s dopo ogni
  //    segnale rifaceva lo sguardo sulla pianta. Il segnale pero' non arriva
  //    una volta sola: si ripete (misurato: ogni ~80 s), e lo sguardo ripartiva
  //    ogni volta sullo STESSO rilevatore che il giro di comprensione sta
  //    usando. Due padroni per un occhio solo: le chiamate si accodano, e il
  //    giro completo ci ha messo venti minuti invece di cinque.
  //
  //    E ne partivano DUE per evento, non uno: questa pagina carica questo
  //    codice due volte (il blocco dentro `index.html` e il modulo in radice) e
  //    qui non c'era la guardia che protegge l'accensione qui sotto.
  //
  //    Non si perde niente. La pianta la guarda gia' `occhioSuTutteLeViste()`
  //    dentro il giro di comprensione, che parte da solo a modello nuovo
  //    (`veritas_montaggio.js`, una volta per modello, con la guardia) ed e'
  //    l'unico che di quello sguardo ha bisogno. `__veritasGuarda` resta la
  //    maniglia: si chiama a mano, e guarda UNA volta.
  // ⚠️ L'OCCHIO SI ACCENDE SUBITO, A PAGINA VUOTA — e non dopo il modello.
  //
  //    Misurato il 04/09/2026, quattro volte di fila sulla pagina viva:
  //      pagina vuota, nessun progetto aperto  →  si apre in 3,6-7,9 s
  //      dopo che il modello e' entrato        →  non si apre, e l'errore e' un
  //                                               numero nudo (267935216,
  //                                               272418864: eccezioni mai
  //                                               tradotte, non quantita')
  //
  //    Non e' il modello a essere troppo grande: e' il momento a essere
  //    sbagliato. Finche' l'accensione stava tre secondi DOPO il caricamento,
  //    cadeva sempre nell'istante peggiore della vita della pagina, e ogni
  //    volta si passava all'occhio di riserva senza che nessuno lo sapesse.
  //
  //    Acceso qui, all'avvio, l'occhio regge poi tutto il carico: verificato,
  //    resta `pronto` con la scena 3D dentro e i 23 mucchi misurati.
  //
  //    ⚠️ Vale la regola del motore: quello che lo riguarda si decide PRIMA che
  //       si accenda. Dopo, ogni prova misura il primo tentativo e non il
  //       proprio.
  //    ⚠️ E UNA COPIA SOLA ACCENDE. Questa pagina carica DUE volte questo
  //       codice: il blocco dentro `index.html` e il modulo in radice. Senza
  //       guardia partirebbero due accensioni e resterebbero due modelli di
  //       visione in memoria, che e' esattamente il carico che fa fallire
  //       l'apertura. Accende solo la copia che sta su `window.__veritasRiconosce`,
  //       perche' e' quella che `veritas_montaggio.js` poi usa davvero
  //       («accendo l'occhio gia' montato nella pagina»).
  //    ⚠️ E SI ASPETTA CHE LA PAGINA SIA FERMA, non solo vuota. Misurato il
  //       04/09, stessa pagina senza nessun progetto aperto:
  //         2,5 s dopo l'avvio  →  non si apre (267935216 / 269045048 /
  //                                272418864), e fallisce sia con un filo solo
  //                                sia con otto: NON sono i fili
  //         8-15 s dopo `load`  →  si apre in 3,6-7,9 s, sempre
  //       A due secondi e mezzo la pagina sta ancora tirando su three.js, la
  //       fisica, il lettore IFC e l'autenticazione: e' l'istante piu'
  //       affollato della sua vita, non il piu' libero. «Pagina leggera» vuol
  //       dire FERMA, e il momento si aspetta — non si indovina.
  function accendiQuandoEFerma() {
    if (_stato.fase !== "spento") return;
    if (!window.__veritasRiconosce || window.__veritasRiconosce.occhioLocale !== occhioLocale) return;
    occhioLocale({}).then(function (r) {
      console.log(r
        ? "[VERITAS occhio] acceso a pagina ferma (" + _stato.device + "/" + _stato.dtype + ")"
        : "[VERITAS occhio] non si e' acceso all'avvio: " + _stato.perche);
    }).catch(function (e) {
      console.warn("[VERITAS occhio] non si e' acceso all'avvio: " + ((e && e.message) || e));
    });
  }
  if (document.readyState === "complete") setTimeout(accendiQuandoEFerma, 8000);
  else window.addEventListener("load", function () { setTimeout(accendiQuandoEFerma, 8000); });

  console.log("[VERITAS occhio] pronto — window.__veritasGuarda()");
}

const ESPORTATE = {
  VOCABOLARIO, ADE20K_150, AGGIUNTE, POSTURA_DI, ARIA_APERTA_DI, CALPESTIO_DI, PASSO_DI,
  SOVRAPPOSIZIONE_MINIMA, INGRANDIMENTO_MAX, FIDUCIA_MINIMA, MODELLO, LIBRERIA,
  piantaInTela,
  vocabolarioPer, scatolaInMondo, abbina, riconosci, ritagliSuiPosti, tavolaDiRitagli, pianoDi,
  occhioLocale, stato, racconta,
};
export default ESPORTATE;

// ⚠️ LA MANIGLIA LA DA' IL MODULO — 06/09/2026, e serve a togliere un doppione.
//
// Raffaella: «questo problema e' gia' noto, dopo il controllo vanno tolte le
// cose che non servono: perche' abbiamo ancora il duplicato?». Aveva ragione.
// Di questo file giravano DUE copie insieme: il modulo e il blocco reinlinato
// dentro `index.html`. Misurato in console: tre righe «occhio pronto» allo
// stesso secondo, e a scrivere le maniglie era l'ultima che finiva di
// caricarsi — cioe' a caso.
//
// `window.__veritasRiconosce` la assegnava solo la copia inline (gliela
// aggiunge `banco/reinlina.py`, ed e' il suo secondo argomento). Il modulo la
// LEGGEVA per sapere se toccava a lui accendere l'occhio all'avvio: tolta la
// copia inline senza questa riga, quella guardia uscirebbe subito e l'occhio
// non si accenderebbe piu' da solo — in silenzio, che e' il modo peggiore.
//
// ⚠️ Non sovrascrive: se la copia inline c'e' ancora, comanda lei e questa
//    riga non fa niente. Cosi' i due stati sono tutti e due sani, e la
//    rimozione non deve avvenire nello stesso istante.
if (typeof window !== "undefined" && !window.__veritasRiconosce)
  window.__veritasRiconosce = ESPORTATE;
