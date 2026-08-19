// veritas_bim.js — l'IFC come ingresso di prima classe.
//
// =============================================================================
// PERCHE' ESISTE, ED E' LA COSA PIU' IMPORTANTE DI QUESTO FILE
// =============================================================================
//
// Per dieci giorni VERITAS ha ricevuto un GLB scaricato da Sketchfab e ha
// provato a dedurre da li' cos'era ogni spazio. Un GLB e' un EXPORT: e' il
// formato in cui la semantica e' gia' stata buttata via. Chi ha fatto quel
// modello le stanze, i nomi e le funzioni ce li aveva nel suo progetto;
// l'esportazione li ha appiattiti in 2.416 mesh chiamate `Cube.083`.
//
// L'ultimo difetto lo dice meglio di qualunque spiegazione: una tappa
// «Ingresso / Parcheggio» sull'ALA DI UN AEREO, a quota 3,64 m. E non era
// correggibile, perche' un'ala e un mezzanino sono geometricamente identici —
// superficie orizzontale, larga qualche metro, a tre metri e mezzo da terra,
// niente sopra la testa. Nessuna misura li distingue. Mai.
//
// Questo file legge il formato in cui la risposta c'e' ancora scritta.
//
// ⚠️ REGOLA DI DISCIPLINA DI QUESTO MODULO: qui dentro NON SI DEDUCE NIENTE.
// Ogni cosa che esce da questo file o e' scritta nel file IFC, o e' una
// MISURA presa sulla geometria dichiarata. Se il file non dice una cosa, il
// modulo lo dichiara in `avvisi` e passa oltre. Non esiste una soglia
// geometrica in tutto il modulo, e non deve entrarcene nessuna: se una tappa
// finisce nel posto sbagliato la risposta e' leggere un'altra dichiarazione,
// o chiedere a chi guarda lo schermo.
//
// =============================================================================
// IL LETTORE, E LA LICENZA
// =============================================================================
//
// `web-ifc` v0.0.77 (ThatOpen), MPL-2.0 -> uso commerciale consentito. Gira
// nel browser via WebAssembly e in node con lo stesso identico specificatore
// d'importazione, quindi le prove girano sul lettore VERO e non su una copia.
//
// E' l'unica strada legalmente pulita: tutti i dataset 3D annotati (HSSD,
// HM3DSem di Meta, Replica, ScanNet, Structured3D) sono CC BY-NC o solo
// ricerca — utili per misurare in sviluppo, non per il prodotto.
//
// Non si scrive un parser STEP a mano: e' la Regola uno. Un parser fatto in
// casa funziona sul file che si ha sotto mano e si rompe sul successivo, e
// l'IFC ha vent'anni di casi limite che qui non si vedranno mai.
//
// =============================================================================
// LE TRE TRAPPOLE VERIFICATE SU FILE VERI (19/08/2026)
// =============================================================================
//
// 1. IL NOME STA IN `LongName`, NON IN `Name`.
//    ArchiCAD mette il NUMERO della Zona in `Name` e il NOME in `LongName`.
//    Misurato su AC20-FZK-Haus.ifc, esportato da ARCHICAD 20:
//        Name='4' LongName='Schlafzimmer'   Name='1' LongName='Flur'
//    Chi legge `Name` si ritrova un edificio le cui stanze si chiamano
//    «1, 2, 3, 4». E' il difetto piu' facile da fare e il piu' silenzioso.
//
// 2. UN MURO BORDA DUE STANZE, MA NON LE COLLEGA.
//    `IfcRelSpaceBoundary` mette in relazione uno spazio e l'elemento che lo
//    delimita: porte, ma anche muri e solai. Misurato sullo stesso file: 81
//    bordi, di cui gli elementi che toccano due o piu' spazi sono in
//    maggioranza MURI e SOLAI. Prendere tutti i bordi come collegamenti
//    vorrebbe dire dichiarare che si passa attraverso i muri — esattamente il
//    difetto chiuso a mano il 18/08. Qui passano solo porte, scale, rampe e
//    varchi virtuali.
//
// 3. UN PASSAGGIO CHE TOCCA UN SOLO SPAZIO DA' SULL'ESTERNO.
//    Sempre sullo stesso file: «Haustuer» (la porta di casa) borda il solo
//    Flur, «Terrassentuer» il solo Wohnen. Le altre tre bordano due stanze.
//    Quindi l'ingresso non si indovina: e' dichiarato dal grafo dei bordi.
//
// =============================================================================
// COSA RESTA A CARICO DELLA GEOMETRIA, E NON E' POCO
// =============================================================================
//
// L'IFC dice QUALI stanze ci sono e come si chiamano. NON dice quanto e'
// largo il passaggio libero con gli arredi dentro, dove si formano le code,
// quanto ci mette la gente a uscire, se una porta e' a norma. Tutto il lavoro
// dei giorni scorsi — il piano delle cose, la navmesh, le file, la
// controprova — resta e diventa piu' forte, perche' smette di indovinare il
// COSA e torna a fare quello per cui e' buono: MISURARE.
// =============================================================================

// La versione e' fissata di proposito: web-ifc cambia la forma dei dati fra
// versioni minori, e un aggiornamento silenzioso da CDN romperebbe la lettura
// senza un errore. Si alza a mano, dopo aver rifatto le prove.
export const WEBIFC_VERSIONE = "0.0.77";

// Da dove prendere il .wasm. Sta scritto qui e non dentro una funzione perche'
// il banco di prova headless lo riscrive con una sostituzione di stringa,
// esattamente come fa per l'importmap (vedi banco/monta.sh).
export const WEBIFC_WASM = "https://cdn.jsdelivr.net/npm/web-ifc@0.0.77/";

// ---------------------------------------------------------------------------
// 1. RICONOSCIMENTO — logica pura, nessun web-ifc, nessun DOM
// ---------------------------------------------------------------------------

// Un file IFC in formato STEP comincia SEMPRE per questa riga: e' la prima
// riga della norma ISO 10303-21. Non serve l'estensione, e infatti non la si
// guarda: e' la stessa scelta gia' fatta in veritas_ingest.js.
const FIRMA_STEP = "ISO-10303-21";

/**
 * Questi byte sono un IFC?
 * @param {Uint8Array} testa  i primi byte del file
 */
export function eIfc(testa) {
  if (!testa || !testa.length) return false;
  // \u26A0\uFE0F Il BOM di UTF-8 e' una sequenza di TRE BYTE (EF BB BF), non il
  // carattere \uFEFF: qui si leggono byte, e togliere il carattere non toglie
  // niente. Un editor Windows che salva un IFC ce lo mette, e senza questa
  // riga il file risulterebbe "formato sconosciuto".
  let da = 0;
  if (testa.length >= 3 && testa[0] === 0xEF && testa[1] === 0xBB && testa[2] === 0xBF) da = 3;
  let s = "";
  const fine = Math.min(testa.length, da + 64);
  for (let i = da; i < fine; i++) s += String.fromCharCode(testa[i]);
  return s.trimStart().startsWith(FIRMA_STEP);
}

/**
 * La versione dello schema e chi ha esportato il file, letti dall'intestazione.
 * Serve al referto: «questo edificio viene da un'esportazione ArchiCAD 20» e'
 * un'informazione di provenienza, e la provenienza in questo progetto si
 * dichiara sempre.
 *
 * @param {Uint8Array} testa  i primi ~4 KB
 */
export function intestazione(testa) {
  let s = "";
  const fine = Math.min(testa.length, 8192);
  for (let i = 0; i < fine; i++) s += String.fromCharCode(testa[i]);
  const schema = /FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/.exec(s);
  // ⚠️ Il nome del programma si cerca SOLO dentro l'istruzione FILE_NAME, non
  // in tutta l'intestazione: un IFC puo' avere righe di commento in cima, e
  // cercando dappertutto si finisce per leggere un commento e chiamarlo
  // "programma di origine". (Successo qui, il 19/08, sul file di prova: il
  // commento parlava della trappola ArchiCAD e il modulo ha risposto
  // "esportato da ArchiCAD: chi legge Name si ritrova 101".)
  const dichiarazione = /FILE_NAME\s*\(([\s\S]{0,2000}?)\)\s*;/.exec(s);
  const dentro = dichiarazione ? dichiarazione[1] : "";
  const applicazione = /(ARCHICAD[^'\\]*|Revit[^'\\]*|Allplan[^'\\]*|Tekla[^'\\]*|IfcOpenShell[^'\\]*|Vectorworks[^'\\]*|Solibri[^'\\]*)/i.exec(dentro);
  return {
    schema: schema ? schema[1] : null,
    applicazione: applicazione ? applicazione[1].trim() : null,
  };
}

// ---------------------------------------------------------------------------
// 2. SROTOLARE I VALORI — web-ifc non restituisce numeri e stringhe nudi
// ---------------------------------------------------------------------------
//
// Un attributo torna come { value: "Flur", type: 1, name: "IFCLABEL" }, un
// enumerato come { type: 3, value: "INTERNAL" }, una misura come
// { _internalValue: "120.", _representationValue: 120 }. Leggere `.value` e
// basta funziona quasi sempre, e "quasi" in questo progetto e' gia' costato
// caro: sulle misure `.value` non c'e'.

/** Il testo di un attributo IFC, o null. */
export function testoDi(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.length ? v : null;
  if (typeof v === "number") return String(v);
  if (typeof v === "object") {
    const dentro = v.value !== undefined ? v.value
                 : v._representationValue !== undefined ? v._representationValue
                 : v._internalValue !== undefined ? v._internalValue
                 : null;
    if (dentro === null || dentro === undefined) return null;
    const s = String(dentro).trim();
    return s.length ? s : null;
  }
  return null;
}

/** Il numero di un attributo IFC, o null. */
export function numeroDi(v) {
  const s = testoDi(v);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Il booleano di una proprieta' IFC (.T. / .F. arrivano come true/false). */
export function booleanoDi(v) {
  if (v === null || v === undefined) return null;
  const dentro = typeof v === "object" && v.value !== undefined ? v.value : v;
  if (typeof dentro === "boolean") return dentro;
  const s = String(dentro).trim().toUpperCase();
  if (s === "T" || s === "TRUE" || s === ".T.") return true;
  if (s === "F" || s === "FALSE" || s === ".F.") return false;
  return null;
}

// ---------------------------------------------------------------------------
// 3. IL NOME DI UNO SPAZIO — la trappola numero uno
// ---------------------------------------------------------------------------

/**
 * Nome e numero di un IfcSpace, con dichiarato DA DOVE viene il nome.
 *
 * `LongName` per primo, sempre: e' li' che ArchiCAD scrive «Sala d'attesa»,
 * mentre in `Name` mette «101». Quando `LongName` manca si tiene `Name` ma si
 * dice che e' un numero, non un nome — cosi' chi sta a valle sa che quella
 * stanza NON e' stata descritta da nessuno e va chiesta a una persona.
 * Non si inventa un nome. Mai.
 *
 * @param {object} spazio  la riga IfcSpace come la restituisce web-ifc
 * @returns {{nome:string|null, numero:string|null, dichiarato:boolean}}
 */
export function nomeDiSpazio(spazio) {
  const lungo = testoDi(spazio && spazio.LongName);
  const corto = testoDi(spazio && spazio.Name);
  if (lungo) return { nome: lungo, numero: corto, dichiarato: true };
  // Un `Name` che e' solo un numero non e' un nome: e' un'etichetta di
  // disegno. Se invece contiene lettere, qualcuno l'ha scritto e vale.
  if (corto && /[^\d\s.\-_]/.test(corto)) return { nome: corto, numero: null, dichiarato: true };
  return { nome: null, numero: corto, dichiarato: false };
}

// Un identificativo interno del programma di disegno: non e' un nome, e va
// buttato invece che mostrato. `ACID00000001-0000-0000-0000-000000000000` e'
// quello che ArchiCAD scrive nel LongName dei piani.
const IDENTIFICATIVO_INTERNO = /^(ACID|GUID|ID)?[0-9A-F]{6,}(-[0-9A-F]{4,}){2,}$/i;

/**
 * Il nome di un PIANO. ⚠️ Qui la regola e' ROVESCIATA rispetto agli spazi.
 *
 * Misurato il 19/08 su AC20-FZK-Haus.ifc, esportato da ARCHICAD 20:
 *
 *     IfcSpace          Name='4'          LongName='Schlafzimmer'   <- nome in LongName
 *     IfcBuildingStorey Name='Erdgeschoss' LongName='ACID00000001-…' <- nome in Name
 *
 * Applicare agli uni la regola degli altri da' un edificio i cui piani si
 * chiamano `ACID00000001-0000-0000-0000-000000000000`. E' successo, e nessuno
 * se ne sarebbe accorto guardando il codice: si vede solo guardando l'uscita.
 * Quindi la regola non e' «sempre LongName»: e' «LongName per le Zone, Name
 * per i piani», piu' una rete che butta cio' che e' palesemente un codice.
 */
export function nomeDiPiano(piano) {
  const corto = testoDi(piano && piano.Name);
  const lungo = testoDi(piano && piano.LongName);
  const buono = (s) => s && !IDENTIFICATIVO_INTERNO.test(s) ? s : null;
  return buono(corto) || buono(lungo) || null;
}

// ---------------------------------------------------------------------------
// 4. IL VOCABOLARIO — leggere un nome dichiarato, non dedurre una funzione
// ---------------------------------------------------------------------------
//
// ⚠️ Questa tabella NON e' un'euristica. Non guarda ne' forme ne' misure:
// traduce una parola SCRITTA DA UNA PERSONA nella funzione corrispondente. E'
// la stessa operazione che fa un lettore umano davanti a una pianta quotata.
//
// Le chiavi sono le stesse di ETICHETTA_OCCHI in index.html, di proposito:
// cosi' una zona che viene dal BIM e una che viene dagli occhi parlano la
// stessa lingua e nessuno a valle deve sapere da dove arrivano.
//
// Le tre lingue ci sono perche' i file veri sono in tre lingue: il modello di
// riferimento pubblico piu' completo (AC20-FZK-Haus) e' tedesco, i file di
// Raffaella sono italiani, e la maggior parte dei campioni e' inglese.
export const VOCABOLARIO_SPAZI = {
  parcheggio:   ["parcheggio", "autorimessa", "garage", "parking", "carpark", "stellplatz", "tiefgarage"],
  piazzale:     ["piazzale", "sagrato", "cortile", "forecourt", "courtyard", "vorplatz", "hof"],
  ingresso:     ["ingresso", "entrata", "atrio", "androne", "hall", "entrance", "entry", "lobby", "foyer",
                 "eingang", "vorraum", "windfang", "diele"],
  accoglienza:  ["accettazione", "accoglienza", "reception", "biglietteria", "check-in", "checkin",
                 "ticket", "empfang", "anmeldung", "kasse"],
  controlli:    ["controllo", "sicurezza", "security", "varco", "filtro", "screening", "kontrolle",
                 "sicherheit"],
  attesa:       ["attesa", "waiting", "lounge", "soggiorno", "wohnen", "wohnzimmer", "aufenthalt",
                 "warteraum", "sala d'attesa", "living"],
  esposizione:  ["esposizione", "espositiva", "mostra", "galleria", "gallery", "exhibition", "museo",
                 "galerie", "ausstellung", "aula", "classroom", "sala"],
  commerciale:  ["negozio", "bar", "ristorante", "caffetteria", "bookshop", "shop", "retail", "duty free",
                 "laden", "gastronomie"],
  // ⚠️ La cucina ha una voce sua e NON sta sotto «commerciale». Misurato il
  // 19/08 sul modello ArchiCAD pubblico: la «Küche» di una casa usciva «area
  // commerciale», perche' pensando ai ristoranti l'avevo messa li'. Una
  // parola sola in una lista sbagliata e una stanza cambia mestiere.
  cucina:       ["cucina", "kitchen", "kueche", "küche"],
  corridoio:    ["corridoio", "disimpegno", "passaggio", "ballatoio", "corridor", "hallway", "passage",
                 "flur", "gang", "treppenhaus", "scala", "stairs", "stairwell"],
  destinazione: ["gate", "imbarco", "boarding", "uscita", "exit", "partenze", "departure", "ausgang",
                 "notausgang"],
  servizi:      ["wc", "bagno", "servizi", "toilette", "toilet", "restroom", "spogliatoio", "bad",
                 "sanitaer", "sanitär", "umkleide", "waschraum"],
  tecnico:      ["locale tecnico", "tecnico", "impianti", "deposito", "magazzino", "ripostiglio",
                 "archivio", "plant", "storage", "technical", "technik", "lager", "abstellraum",
                 "heizung"],
  // ⚠️ Un ufficio NON e' un locale tecnico. Stessa misura, stesso giorno: il
  // «Buero» del modello usciva «tecnico» e quindi ESCLUSO dal percorso, cioe'
  // una stanza dove lavora una persona veniva dichiarata un vano impianti.
  ufficio:      ["ufficio", "office", "buero", "büro", "studio", "sala riunioni", "meeting"],
  camera:       ["camera", "camera da letto", "bedroom", "schlafzimmer", "schlafraum", "degenza"],
};

// Dalla funzione dichiarata al vocabolario dei `type` che il simulatore usa.
//
// ⚠️ Il vocabolario dei `type` — spawn / checkin / security / lounge / gate —
// e' PORTANTE: ci si appoggiano il generatore di traiettorie, le altezze dei
// marker e il grafo delle missioni in una ventina di punti. Si cambia
// l'etichetta, mai il tipo.
export const TIPO_DA_FUNZIONE = {
  parcheggio:   { tipo: "spawn",  fuori: true },
  piazzale:     { tipo: "spawn",  fuori: true },
  ingresso:     { tipo: "spawn",  fuori: false },
  accoglienza:  { tipo: "checkin", fuori: false },
  controlli:    { tipo: "security", fuori: false },
  attesa:       { tipo: "lounge", fuori: false },
  esposizione:  { tipo: "lounge", fuori: false },
  commerciale:  { tipo: "lounge", fuori: false },
  corridoio:    { tipo: "lounge", fuori: false },
  destinazione: { tipo: "gate",   fuori: false },
  // I servizi e i locali tecnici sono ambienti veri e restano nel referto,
  // ma non sono tappe di un percorso: nessuno attraversa un edificio per
  // passare da un locale caldaia.
  servizi:      { tipo: "lounge", fuori: false, escluso: true },
  tecnico:      { tipo: "lounge", fuori: false, escluso: true },
  camera:       { tipo: "lounge", fuori: false },
  // Un ufficio e una cucina sono stanze dove sta della gente: restano nel
  // percorso. Escluderle e' quello che faceva la versione di un'ora fa, e su
  // una casa vera toglieva due stanze su sette.
  ufficio:      { tipo: "lounge", fuori: false },
  cucina:       { tipo: "lounge", fuori: false },
};

/**
 * Che funzione dichiara questo nome? `null` quando non lo dice.
 *
 * `null` NON e' un fallimento: e' la risposta onesta per «Sala 3», ed e' il
 * gancio del passo successivo del piano (la macchina propone, la persona
 * conferma). Meglio una stanza che si dichiara sconosciuta di una a cui e'
 * stata appiccicata una funzione plausibile.
 */
export function funzioneDaNome(nome) {
  if (!nome) return null;
  const n = String(nome).toLowerCase().trim();
  let miglior = null, migliorLunghezza = 0;
  for (const funzione in VOCABOLARIO_SPAZI) {
    for (const parola of VOCABOLARIO_SPAZI[funzione]) {
      if (!n.includes(parola)) continue;
      // Vince la parola PIU' LUNGA che compare: «sala d'attesa» deve battere
      // «sala», altrimenti una sala d'attesa diventa una sala espositiva.
      if (parola.length > migliorLunghezza) { migliorLunghezza = parola.length; miglior = funzione; }
    }
  }
  return miglior;
}

// ---------------------------------------------------------------------------
// 5. I COLLEGAMENTI — la trappola numero due, e il dato che mancava
// ---------------------------------------------------------------------------
//
// E' il pezzo che vale di piu' di tutto il file. Nel GLB i collegamenti fra
// ambienti non c'erano affatto, ed e' per questo che il modello di prova aveva
// SEI aree camminabili che a piedi non si raggiungono (§17.2). Qui sono
// scritti: una porta fra due stanze e' un passaggio dichiarato da chi ha
// progettato l'edificio.

// Cosa e' un passaggio, e cosa no. Un muro e un solaio bordano due spazi
// esattamente come una porta: e' la SEPARAZIONE che dichiarano, non il
// passaggio. Confonderli vuol dire far camminare la gente nei muri.
const PASSAGGI = {
  IFCDOOR: "porta",
  IFCSTAIR: "scala",
  IFCSTAIRFLIGHT: "rampa di scala",
  IFCRAMP: "rampa",
  IFCRAMPFLIGHT: "rampa",
  // Un IfcVirtualElement e' una separazione che NON esiste fisicamente: due
  // ambienti distinti in pianta con niente in mezzo. E' un passaggio libero,
  // ed e' come ArchiCAD dichiara il salotto che si apre sul corridoio.
  IFCVIRTUALELEMENT: "varco",
};

/**
 * Da bordi di spazio a collegamenti fra ambienti.
 *
 * @param {Array} bordi  [{ spazio, elemento, tipoElemento, nomeElemento,
 *                          virtuale, larghezzaM }]
 *                       una riga per ogni coppia (spazio, elemento delimitante)
 * @returns {{collegamenti:Array, esterni:Array, scartati:number}}
 *   collegamenti: [{ da, a, tramite, tipo, nome, larghezzaM }]
 *   esterni:      [{ spazio, tramite, tipo, nome }] — passaggi che toccano UN
 *                 solo ambiente, cioe' che danno sull'esterno: sono gli
 *                 INGRESSI dell'edificio, dichiarati e non indovinati
 */
export function collegamentiDaBordi(bordi) {
  const perElemento = new Map();
  let scartati = 0;
  for (const b of bordi || []) {
    if (!b || b.spazio == null || b.elemento == null) { scartati++; continue; }
    const tipo = PASSAGGI[String(b.tipoElemento || "").toUpperCase()];
    // Non e' un passaggio: e' un muro, un solaio, una finestra. Si scarta, e
    // si scarta in silenzio perche' e' la maggioranza dei bordi di un file
    // vero (misurato: 81 bordi, 8 passaggi).
    if (!tipo) { scartati++; continue; }
    if (!perElemento.has(b.elemento)) {
      perElemento.set(b.elemento, {
        tipo, nome: b.nomeElemento || null,
        larghezzaM: b.larghezzaM != null ? b.larghezzaM : null,
        spazi: new Set(),
      });
    }
    perElemento.get(b.elemento).spazi.add(b.spazio);
  }

  const collegamenti = [], esterni = [];
  for (const [elemento, d] of perElemento) {
    const spazi = [...d.spazi];
    if (spazi.length === 1) {
      // Un passaggio che borda un solo ambiente da' sull'esterno: e'
      // l'ingresso. Misurato su AC20-FZK-Haus: «Haustuer» borda il solo Flur.
      esterni.push({ spazio: spazi[0], tramite: elemento, tipo: d.tipo, nome: d.nome,
                     larghezzaM: d.larghezzaM });
      continue;
    }
    // Una porta puo' bordare piu' di due ambienti (capita con i disimpegni):
    // si dichiarano tutte le coppie, perche' da tutte ci si passa.
    for (let i = 0; i < spazi.length; i++) {
      for (let j = i + 1; j < spazi.length; j++) {
        collegamenti.push({ da: spazi[i], a: spazi[j], tramite: elemento,
                            tipo: d.tipo, nome: d.nome, larghezzaM: d.larghezzaM });
      }
    }
  }
  return { collegamenti, esterni, scartati };
}

/**
 * Le isole: gruppi di ambienti che fra loro si raggiungono a piedi.
 *
 * Serve per dichiarare cosa NON si raggiunge, che e' il punto 4 del piano.
 * Un ambiente scollegato non e' un errore da nascondere: e' una domanda da
 * fare a chi guarda lo schermo.
 */
export function isole(idSpazi, collegamenti) {
  const padre = new Map();
  for (const id of idSpazi) padre.set(id, id);
  const radice = (a) => { while (padre.get(a) !== a) { padre.set(a, padre.get(padre.get(a))); a = padre.get(a); } return a; };
  for (const c of collegamenti || []) {
    if (!padre.has(c.da) || !padre.has(c.a)) continue;
    const ra = radice(c.da), rb = radice(c.a);
    if (ra !== rb) padre.set(ra, rb);
  }
  const gruppi = new Map();
  for (const id of idSpazi) {
    const r = radice(id);
    if (!gruppi.has(r)) gruppi.set(r, []);
    gruppi.get(r).push(id);
  }
  return [...gruppi.values()].sort((a, b) => b.length - a.length);
}

// ---------------------------------------------------------------------------
// 6. I DATI DICHIARATI PER LE NORMATIVE
// ---------------------------------------------------------------------------
//
// `veritas_normative.js` oggi chiede a una persona due dati che un modello 3D
// non puo' contenere: l'affollamento previsto e la classe di rischio
// d'incendio. Nell'IFC il primo c'e' spesso scritto, ed e' scritto da chi ha
// progettato: passa da «dato mancante» a «dato dichiarato», che e' la
// differenza fra una verifica che si puo' fare e una che non si puo' fare.

/**
 * @param {Array} spazi  gli spazi letti, con `.proprieta`
 * @returns {{affollamento:number|null, daSpazi:number, accessibili:number,
 *            resistenzaAlFuoco:Array}}
 */
export function datiDaProprieta(spazi) {
  let affollamento = 0, daSpazi = 0, accessibili = 0;
  const resistenzaAlFuoco = [];
  for (const s of spazi || []) {
    const p = s.proprieta || {};
    const occ = p.OccupancyNumber != null ? Number(p.OccupancyNumber) : null;
    if (occ != null && Number.isFinite(occ) && occ > 0) { affollamento += occ; daSpazi++; }
    if (p.HandicapAccessible === true) accessibili++;
    if (p.FireRating) resistenzaAlFuoco.push({ spazio: s.id, nome: s.nome, valore: String(p.FireRating) });
  }
  return {
    // Somma degli affollamenti dichiarati stanza per stanza. Se NESSUNA stanza
    // lo dichiara resta null, e la verifica sulle uscite continua a dire che
    // il dato manca — che e' la risposta giusta, non zero.
    affollamento: daSpazi ? affollamento : null,
    daSpazi, accessibili, resistenzaAlFuoco,
  };
}

// ---------------------------------------------------------------------------
// 7. DA SPAZI DICHIARATI A ZONE VERITAS
// ---------------------------------------------------------------------------

/**
 * @param {Array} spazi   gli spazi letti dal file
 * @param {object} opzioni { esterni: [idSpazio, ...] — chi ha una porta verso fuori }
 * @returns {Array} nodi nella forma che usa tutto il resto del programma
 */
export function zoneDaSpazi(spazi, opzioni) {
  const opt = opzioni || {};
  const conIngresso = new Set(opt.esterni || []);
  const nodi = [];

  for (const s of spazi || []) {
    // Senza una posizione misurata non si puo' mettere un marker da nessuna
    // parte. Lo spazio resta nel referto (e' dichiarato, esiste) ma non
    // diventa una tappa, e la cosa si dice.
    if (!s.centro) continue;

    const funzione = funzioneDaNome(s.nome);
    const mappa = funzione ? TIPO_DA_FUNZIONE[funzione] : null;
    let tipo = mappa ? mappa.tipo : "lounge";

    // Chi ha una porta che da' sull'esterno E' un ingresso, qualunque cosa
    // dica il nome: e' una dichiarazione piu' forte di una parola, perche'
    // viene dal grafo dei bordi e non dal vocabolario.
    if (conIngresso.has(s.id) && tipo !== "gate") tipo = "spawn";

    nodi.push({
      pos: [s.centro[0], s.centro[1], s.centro[2]],
      type: tipo,
      // L'etichetta e' il NOME SCRITTO NEL FILE, non una parola del nostro
      // vocabolario: si chiama «Sala d'attesa» perche' cosi' l'ha chiamata chi
      // ha fatto il progetto. Quando il nome non c'e' si mostra il numero
      // della stanza, dichiarandolo.
      label: s.nome || ("Ambiente " + (s.numero || s.id)),
      scale: 1.0, scaleZ: 1.0,
      id: "bim_" + s.id,
      // Il gradino piu' alto dell'ordine di autorita' gia' in uso:
      // bim > nome del modello > occhi > misure > sequenza posizionale.
      origine: "bim",
      // Una zona dichiarata da chi ha progettato l'edificio nasce confermata;
      // una stanza che nel file ha solo un numero, no — e' esattamente il
      // caso in cui il programma deve CHIEDERE invece di decidere.
      confermata: !!s.nome,
      fiducia: s.nome ? 1 : 0.4,
      funzione: funzione || null,
      escluso: !!(mappa && mappa.escluso),
      fuori: mappa ? mappa.fuori : false,
      areaM2: s.areaM2 != null ? s.areaM2 : null,
      piano: s.piano || null,
      ifc: { guid: s.guid, numero: s.numero, nome: s.nome, id: s.id },
    });
  }

  // Nessun nome ripetuto, mai. In un file vero due stanze si chiamano davvero
  // «Ufficio», e due zone omonime sullo schermo non si distinguono. E' la
  // stessa rete gia' presente per i nomi dedotti (§15.0): qui pero' NON si
  // cambia il nome dichiarato, si aggiunge il numero della stanza, che e'
  // anch'esso scritto nel file.
  const visti = new Map();
  for (const n of nodi) visti.set(n.label, (visti.get(n.label) || 0) + 1);
  const usati = new Map();
  for (const n of nodi) {
    if (visti.get(n.label) < 2) continue;
    const q = (usati.get(n.label) || 0) + 1;
    usati.set(n.label, q);
    n.label = n.ifc.numero ? n.label + " " + n.ifc.numero : n.label + " " + q;
  }
  return nodi;
}

// ---------------------------------------------------------------------------
// 8. MISURE SULLA GEOMETRIA DICHIARATA
// ---------------------------------------------------------------------------

/**
 * Area di pavimento e baricentro del volume di uno spazio.
 *
 * NON e' una stima: il volume dello spazio e' un solido chiuso dichiarato nel
 * file, e l'area di pavimento e' la somma delle facce rivolte in giu'. Per un
 * solido chiuso quella somma E' l'impronta, qualunque sia la forma della
 * stanza.
 *
 * @param {Float32Array} vertici  6 valori per vertice: posizione + normale
 * @param {Uint32Array}  indici
 * @param {Array}        t        matrice 4x4 in ordine colonna
 */
export function misuraVolume(vertici, indici, t) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const punto = (i) => {
    const x = vertici[i * 6], y = vertici[i * 6 + 1], z = vertici[i * 6 + 2];
    return t ? [
      t[0] * x + t[4] * y + t[8] * z + t[12],
      t[1] * x + t[5] * y + t[9] * z + t[13],
      t[2] * x + t[6] * y + t[10] * z + t[14],
    ] : [x, y, z];
  };

  let areaGiu = 0, areaProiettata = 0;
  let cx = 0, cz = 0;
  for (let k = 0; k + 2 < indici.length; k += 3) {
    const a = punto(indici[k]), b = punto(indici[k + 1]), c = punto(indici[k + 2]);
    for (const p of [a, b, c]) {
      for (let i = 0; i < 3; i++) {
        if (p[i] < min[i]) min[i] = p[i];
        if (p[i] > max[i]) max[i] = p[i];
      }
    }
    // Area con segno del triangolo proiettato sul piano orizzontale. Il segno
    // dice se la faccia guarda in su o in giu' — e' cosi' che si isola il
    // pavimento senza fidarsi delle normali dichiarate, che in un file
    // esportato male possono essere rovesciate tutte insieme.
    const proj = 0.5 * ((b[0] - a[0]) * (c[2] - a[2]) - (c[0] - a[0]) * (b[2] - a[2]));
    areaProiettata += Math.abs(proj);
    if (proj > 0) {
      areaGiu += proj;
      cx += proj * (a[0] + b[0] + c[0]) / 3;
      cz += proj * (a[2] + b[2] + c[2]) / 3;
    }
  }

  if (!(min[0] < Infinity)) return null;
  // Se le facce sono orientate al contrario (succede, ed e' il difetto che il
  // 18/08 sera aveva dato zero poligoni su ogni scena di prova) meta' dell'area
  // proiettata resta la risposta giusta per un solido chiuso.
  const area = areaGiu > 0 ? areaGiu : areaProiettata / 2;
  const centro = areaGiu > 0
    ? [cx / areaGiu, min[1], cz / areaGiu]
    : [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2];
  return {
    ingombro: { min, max },
    areaM2: area,
    // La quota e' il PAVIMENTO della stanza, non il centro del volume: e' li'
    // che sta in piedi una persona.
    centro,
  };
}

// ---------------------------------------------------------------------------
// 9. IL LETTORE — l'unica parte che dipende da web-ifc
// ---------------------------------------------------------------------------

async function caricaWebIfc(opzioni) {
  if (opzioni && opzioni.webifc) return opzioni.webifc;      // le prove passano il modulo gia' importato
  return await import(/* @vite-ignore */ "web-ifc");
}

/**
 * Legge un IFC e ne ricava quello che il file DICHIARA.
 *
 * @param {Uint8Array|ArrayBuffer} byte
 * @param {object} opzioni { webifc, wasm, conGeometria }
 * @returns {Promise<object>} l'esito completo (vedi in fondo alla funzione)
 */
export async function leggi(byte, opzioni) {
  const opt = opzioni || {};
  const dati = byte instanceof Uint8Array ? byte : new Uint8Array(byte);
  const WebIFC = await caricaWebIfc(opt);
  const api = new WebIFC.IfcAPI();
  const wasm = opt.wasm !== undefined ? opt.wasm : WEBIFC_WASM;
  if (wasm) { try { api.SetWasmPath(wasm, true); } catch (e) { /* in node lo trova da solo */ } }
  await api.Init();

  const t0 = (typeof performance !== "undefined" ? performance.now() : Date.now());
  const modello = api.OpenModel(dati);
  const avvisi = [];

  try {
    // --- 9.1 i piani -------------------------------------------------------
    const piani = new Map();   // expressID -> { nome, quota }
    for (const id of elenco(api, modello, WebIFC.IFCBUILDINGSTOREY)) {
      const l = riga(api, modello, id);
      if (!l) continue;
      // ⚠️ Per i piani vale la regola ROVESCIATA rispetto agli spazi: vedi
      // nomeDiPiano(), che spiega perche' e su quale misura.
      piani.set(id, { id, nome: nomeDiPiano(l), quota: numeroDi(l.Elevation) });
    }

    // --- 9.2 a che piano sta ogni spazio -----------------------------------
    const pianoDiSpazio = new Map();
    for (const id of elenco(api, modello, WebIFC.IFCRELAGGREGATES)) {
      const l = riga(api, modello, id);
      if (!l || !l.RelatingObject || !Array.isArray(l.RelatedObjects)) continue;
      const p = piani.get(l.RelatingObject.value);
      if (!p) continue;
      for (const o of l.RelatedObjects) if (o && o.value != null) pianoDiSpazio.set(o.value, p);
    }

    // --- 9.3 gli spazi -----------------------------------------------------
    const spazi = [];
    const perId = new Map();
    for (const id of elenco(api, modello, WebIFC.IFCSPACE)) {
      const l = riga(api, modello, id);
      if (!l) continue;
      const { nome, numero, dichiarato } = nomeDiSpazio(l);
      const piano = pianoDiSpazio.get(id) || null;
      const s = {
        id,
        guid: testoDi(l.GlobalId),
        nome, numero, nomeDichiarato: dichiarato,
        // INTERNAL / EXTERNAL / PARKING: quando c'e' e' una dichiarazione, e
        // vale piu' di qualunque misura di apertura verso il cielo.
        predefinito: testoDi(l.PredefinedType),
        piano: piano ? piano.nome : null,
        quotaPiano: piano ? piano.quota : null,
        centro: null, ingombro: null, areaM2: null, areaDichiarata: false,
        proprieta: {},
      };
      spazi.push(s);
      perId.set(id, s);
    }
    if (!spazi.length) {
      avvisi.push("Questo IFC non contiene nessun IfcSpace: e' un modello senza le Zone. "
        + "Chi l'ha esportato non le ha incluse, oppure il progetto non ne ha. "
        + "Senza IfcSpace il file dice come e' fatto l'edificio ma non come si chiamano le sue stanze.");
    }

    // --- 9.4 le misure, dai volumi dichiarati ------------------------------
    // ⚠️ Gli IfcSpace non entrano nel flusso di geometria normale di web-ifc
    // (sono una categoria "opzionale"): vanno chiesti per tipo, altrimenti si
    // ottengono zero volumi e nessun errore.
    let senzaGeometria = 0;
    try {
      api.StreamAllMeshesWithTypes(modello, [WebIFC.IFCSPACE], (mesh) => {
        const s = perId.get(mesh.expressID);
        if (!s) return;
        let area = 0, centro = null, ingombro = null;
        for (let i = 0; i < mesh.geometries.size(); i++) {
          const p = mesh.geometries.get(i);
          const g = api.GetGeometry(modello, p.geometryExpressID);
          const v = api.GetVertexArray(g.GetVertexData(), g.GetVertexDataSize());
          const idx = api.GetIndexArray(g.GetIndexData(), g.GetIndexDataSize());
          const m = misuraVolume(v, idx, p.flatTransformation);
          if (!m) continue;
          if (m.areaM2 > area) { area = m.areaM2; centro = m.centro; ingombro = m.ingombro; }
          if (g.delete) g.delete();
        }
        if (centro) { s.centro = centro; s.ingombro = ingombro; s.areaM2 = area; }
      });
    } catch (e) {
      avvisi.push("Non sono riuscito a leggere i volumi degli ambienti: " + (e && e.message || e));
    }
    for (const s of spazi) if (!s.centro) senzaGeometria++;
    if (senzaGeometria) {
      avvisi.push(senzaGeometria + " ambiente/i e' dichiarato nel file ma senza un volume: "
        + "so che esiste e come si chiama, non dove sta. Resta nel referto e non diventa una tappa.");
    }

    // --- 9.5 le proprieta' dichiarate --------------------------------------
    for (const s of spazi) {
      try {
        const insiemi = await api.properties.getPropertySets(modello, s.id, true);
        for (const p of insiemi || []) {
          for (const q of (p.HasProperties || p.Quantities || [])) {
            const chiave = testoDi(q.Name);
            if (!chiave) continue;
            const valore = q.NominalValue !== undefined ? q.NominalValue
                         : q.AreaValue !== undefined ? q.AreaValue
                         : q.LengthValue !== undefined ? q.LengthValue
                         : q.VolumeValue !== undefined ? q.VolumeValue
                         : q.CountValue !== undefined ? q.CountValue : null;
            if (valore === null) continue;
            const b = booleanoDi(valore);
            s.proprieta[chiave] = b !== null ? b : (numeroDi(valore) !== null ? numeroDi(valore) : testoDi(valore));
          }
        }
        // L'area dichiarata batte quella misurata: se chi ha fatto il progetto
        // ha scritto 24,5 m2, quello e' il numero che finisce sul referto e
        // che il cliente puo' ritrovare nei suoi computi.
        const dichiarata = s.proprieta.NetFloorArea != null ? Number(s.proprieta.NetFloorArea)
                         : s.proprieta.GrossFloorArea != null ? Number(s.proprieta.GrossFloorArea) : null;
        if (dichiarata != null && Number.isFinite(dichiarata) && dichiarata > 0) {
          s.areaM2 = dichiarata; s.areaDichiarata = true;
        }
      } catch (e) { /* un pset illeggibile non deve far cadere il file */ }
    }

    // --- 9.6 i passaggi ----------------------------------------------------
    const bordi = [];
    let bordiRotti = 0;
    for (const id of elenco(api, modello, WebIFC.IFCRELSPACEBOUNDARY)) {
      const b = riga(api, modello, id);
      if (!b || !b.RelatingSpace || !b.RelatedBuildingElement) continue;
      const idElemento = b.RelatedBuildingElement.value;
      const el = riga(api, modello, idElemento);
      // Capita nei file veri: un bordo che punta a un elemento che nel file
      // non c'e'. Misurato su AC20-FZK-Haus: 5 bordi su 81.
      if (!el) { bordiRotti++; continue; }
      bordi.push({
        spazio: b.RelatingSpace.value,
        elemento: idElemento,
        tipoElemento: nomeTipo(WebIFC, el.type),
        nomeElemento: testoDi(el.Name),
        virtuale: testoDi(b.PhysicalOrVirtualBoundary) === "VIRTUAL",
        larghezzaM: numeroDi(el.OverallWidth),
      });
    }
    if (bordiRotti) {
      avvisi.push(bordiRotti + " bordo/i di spazio punta a un elemento che nel file non c'e': ignorati.");
    }
    const { collegamenti, esterni, scartati } = collegamentiDaBordi(bordi);
    if (!bordi.length && spazi.length > 1) {
      avvisi.push("Il file non dichiara nessun bordo di spazio (IfcRelSpaceBoundary): so quali "
        + "ambienti ci sono, non quali comunicano fra loro. Chi ha esportato puo' riesportare "
        + "con l'opzione dei bordi di spazio attiva.");
    }

    // --- 9.7 le scale, che spesso non dichiarano cosa collegano ------------
    const scale = [];
    for (const tipo of [WebIFC.IFCSTAIR, WebIFC.IFCRAMP]) {
      for (const id of elenco(api, modello, tipo)) {
        const l = riga(api, modello, id);
        if (!l) continue;
        scale.push({ id, nome: testoDi(l.Name), tipo: tipo === WebIFC.IFCSTAIR ? "scala" : "rampa" });
      }
    }
    const scaleCollegate = new Set(collegamenti.filter((c) => c.tipo !== "porta" && c.tipo !== "varco").map((c) => c.tramite));
    const scaleMute = scale.filter((s) => !scaleCollegate.has(s.id));
    if (scaleMute.length && piani.size > 1) {
      avvisi.push(scaleMute.length + " fra scale e rampe sono dichiarate, ma il file non dice quali "
        + "ambienti collegano: i piani restano separati finche' qualcuno non lo dice. "
        + "Non lo indovino dalla geometria.");
    }

    // --- 9.8 le zone, e cosa non si raggiunge ------------------------------
    const zone = zoneDaSpazi(spazi, { esterni: esterni.map((e) => e.spazio) });
    const gruppi = isole(spazi.filter((s) => s.centro).map((s) => s.id), collegamenti);
    if (gruppi.length > 1) {
      avvisi.push(gruppi.length + " gruppi di ambienti che fra loro non comunicano, secondo quello "
        + "che il file dichiara. Il piu' grande ne ha " + gruppi[0].length + ".");
    }

    const testa = dati.subarray(0, 8192);
    const esito = {
      sorgente: "ifc",
      ...intestazione(testa),
      spazi, zone, collegamenti, esterni, scale, piani: [...piani.values()],
      isole: gruppi,
      dati: datiDaProprieta(spazi),
      avvisi,
      conteggi: {
        spazi: spazi.length,
        conNome: spazi.filter((s) => s.nomeDichiarato).length,
        conGeometria: spazi.length - senzaGeometria,
        piani: piani.size,
        collegamenti: collegamenti.length,
        ingressi: esterni.length,
        bordiScartati: scartati,
      },
      ms: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - t0),
    };
    // La geometria da disegnare si prende solo se qualcuno la vuole: su un
    // file grande e' la parte cara, e chi legge solo le stanze non deve pagarla.
    if (opt.conGeometria !== false) esito.geometria = geometriaVisibile(api, modello);
    return esito;
  } finally {
    try { api.CloseModel(modello); } catch (e) {}
  }
}

// --- utilita' sul lettore, tenute corte e tutte tolleranti agli errori ------

function elenco(api, modello, tipo) {
  if (tipo === undefined) return [];
  let v;
  try { v = api.GetLineIDsWithType(modello, tipo); } catch (e) { return []; }
  const out = [];
  for (let i = 0; i < v.size(); i++) out.push(v.get(i));
  return out;
}

function riga(api, modello, id) {
  try { return api.GetLine(modello, id) || null; } catch (e) { return null; }
}

// Il codice numerico del tipo -> il nome IFC. web-ifc espone le costanti come
// costanti del modulo (IFCDOOR, IFCWALL...), quindi la tabella si costruisce una
// volta sola dal modulo stesso: non si scrive a mano nessun numero.
let TABELLA_TIPI = null;
function nomeTipo(WebIFC, codice) {
  if (!TABELLA_TIPI) {
    TABELLA_TIPI = new Map();
    for (const k in WebIFC) {
      if (/^IFC[A-Z0-9]+$/.test(k) && typeof WebIFC[k] === "number") TABELLA_TIPI.set(WebIFC[k], k);
    }
  }
  return TABELLA_TIPI.get(codice) || null;
}

/**
 * La geometria da mettere in scena: tutto l'edificio TRANNE i volumi degli
 * ambienti, che sono scatole piene e riempirebbero il modello.
 *
 * Si accorpa per colore invece di tenere una mesh per elemento: un edificio
 * vero ha migliaia di elementi, e mille disegnate separatamente fanno crollare
 * il frame rate. Nel giro di analisi non serve sapere quale muro e' quale —
 * per quello ci sono le dichiarazioni, che stanno negli oggetti qui sopra.
 */
function geometriaVisibile(api, modello) {
  const perColore = new Map();
  let elementi = 0;
  api.StreamAllMeshes(modello, (mesh) => {
    elementi++;
    for (let i = 0; i < mesh.geometries.size(); i++) {
      const p = mesh.geometries.get(i);
      const c = p.color;
      const chiave = [c.x, c.y, c.z, c.w].map((n) => n.toFixed(3)).join(",");
      if (!perColore.has(chiave)) {
        perColore.set(chiave, { colore: [c.x, c.y, c.z], opacita: c.w, posizioni: [], normali: [], indici: [] });
      }
      const acc = perColore.get(chiave);
      const g = api.GetGeometry(modello, p.geometryExpressID);
      const v = api.GetVertexArray(g.GetVertexData(), g.GetVertexDataSize());
      const idx = api.GetIndexArray(g.GetIndexData(), g.GetIndexDataSize());
      const t = p.flatTransformation;
      const base = acc.posizioni.length / 3;
      for (let k = 0; k < v.length; k += 6) {
        const x = v[k], y = v[k + 1], z = v[k + 2];
        acc.posizioni.push(
          t[0] * x + t[4] * y + t[8] * z + t[12],
          t[1] * x + t[5] * y + t[9] * z + t[13],
          t[2] * x + t[6] * y + t[10] * z + t[14],
        );
        // La normale si ruota, non si trasla.
        const nx = v[k + 3], ny = v[k + 4], nz = v[k + 5];
        acc.normali.push(
          t[0] * nx + t[4] * ny + t[8] * nz,
          t[1] * nx + t[5] * ny + t[9] * nz,
          t[2] * nx + t[6] * ny + t[10] * nz,
        );
      }
      for (let k = 0; k < idx.length; k++) acc.indici.push(base + idx[k]);
      if (g.delete) g.delete();
    }
  });
  return { elementi, gruppi: [...perColore.values()] };
}

// ---------------------------------------------------------------------------
// 10. LA SCENA — l'unica parte che dipende da three
// ---------------------------------------------------------------------------

/**
 * Da geometria letta a un THREE.Group da mettere in scena.
 * Separata di proposito: la lettura di un IFC si prova in node, questa no.
 */
export function scena(THREE, geometria, nome) {
  const gruppo = new THREE.Group();
  gruppo.name = nome || "ifc";
  if (!geometria || !geometria.gruppi) return gruppo;
  for (const g of geometria.gruppi) {
    if (!g.posizioni.length) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(g.posizioni), 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(g.normali), 3));
    geo.setIndex(new THREE.BufferAttribute(
      g.posizioni.length / 3 > 65535 ? new Uint32Array(g.indici) : new Uint16Array(g.indici), 1));
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(g.colore[0], g.colore[1], g.colore[2]),
      transparent: g.opacita < 1, opacity: g.opacita,
      side: THREE.DoubleSide, roughness: 0.85, metalness: 0.0,
    });
    gruppo.add(new THREE.Mesh(geo, mat));
  }
  return gruppo;
}

// ---------------------------------------------------------------------------
// 11. IL RACCONTO — cosa dire a chi guarda lo schermo
// ---------------------------------------------------------------------------

/**
 * Una frase in italiano per la chat. Dichiara SEMPRE cosa e' stato letto e
 * cosa no: un'analisi automatica che non dice cosa ha capito non si puo'
 * correggere.
 */
export function riassunto(esito) {
  if (!esito) return "Non sono riuscito a leggere il file.";
  const c = esito.conteggi || {};
  const da = esito.applicazione ? " esportato da " + esito.applicazione : "";
  if (!c.spazi) {
    return "Ho letto un file " + (esito.schema || "IFC") + da + ", ma non contiene ambienti dichiarati "
      + "(IfcSpace): posso disegnarlo, non posso leggerne le stanze.";
  }
  const nomi = esito.zone.filter((z) => z.confermata).map((z) => z.label);
  let s = "Ho letto il progetto" + da + ": " + c.spazi + " ambienti dichiarati"
    + (c.piani > 1 ? " su " + c.piani + " piani" : "") + ", "
    + c.conNome + " con un nome scritto dal progettista"
    + (nomi.length ? " — " + nomi.slice(0, 8).join(", ") + (nomi.length > 8 ? "…" : "") : "")
    + ". " + c.collegamenti + " passaggi dichiarati fra ambienti"
    + (c.ingressi ? " e " + c.ingressi + " verso l'esterno" : "") + ". ";
  if (esito.dati && esito.dati.affollamento != null) {
    s += "L'affollamento previsto e' dichiarato nel file: " + esito.dati.affollamento
       + " persone su " + esito.dati.daSpazi + " ambienti. ";
  }
  s += "Questi nomi non li ho dedotti: erano scritti nel file.";
  return s;
}

export default {
  WEBIFC_VERSIONE, WEBIFC_WASM,
  eIfc, intestazione, testoDi, numeroDi, booleanoDi,
  nomeDiSpazio, funzioneDaNome, VOCABOLARIO_SPAZI, TIPO_DA_FUNZIONE,
  collegamentiDaBordi, isole, datiDaProprieta, zoneDaSpazi, misuraVolume,
  leggi, scena, riassunto,
};
