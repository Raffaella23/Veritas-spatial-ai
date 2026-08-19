// =============================================================================
// VERITAS — LE FILE. Le persone ferme non sono ostacoli: sono la coda.
// =============================================================================
//
// LA RICHIESTA
// Raffaella, 19/08/2026: *«quando trovi le figure umane le devi scansare
// mettendoti in fila.»*
//
// COSA CAMBIA, DETTO SEMPLICE
// Finora le figure ferme dentro un modello erano trattate come ostacoli: un
// agente ci girava attorno, come attorno a una colonna. Ma una persona ferma
// davanti a un banco non e' una colonna — e' qualcuno che sta aspettando il
// suo turno. Chi arriva non le gira attorno: **si mette dietro**.
//
// La differenza si vede subito e cambia i numeri del referto: girare attorno a
// venti persone e' un percorso libero, mettersi in fondo a una fila di venti e'
// un tempo d'attesa. Il primo caso non produce nessun affollamento, il secondo
// e' precisamente cio' che un referto di flusso deve misurare.
//
// COSA C'ERA GIA' (Regola zero)
// Nel Core Python esiste uno stato `WAITING` e un contatore `_checkpoint_wait`:
// l'agente si ferma sul posto per qualche tick, in funzione della sua pazienza.
// E' un'attesa NEL TEMPO, e non ha nessuna estensione nello spazio: dieci
// agenti in attesa stanno tutti nello stesso punto. Nessuna fila esiste oggi.
//
// COSA SI E' CERCATO FUORI (Regola uno)
// La coda pedonale e' un comportamento studiato e modellato:
//   Helbing & Molnar — «Social force model for pedestrian dynamics» (1995):
//     il modello di riferimento, da cui discendono quasi tutti gli altri.
//   JuPedSim (github.com/PedestrianDynamics/jupedsim) e Vadere (vadere.org):
//     i due ambienti aperti di riferimento per la dinamica pedonale.
//   Fruin — «Pedestrian Planning and Design» (1971): i livelli di servizio
//     delle AREE DI ACCUMULO, da cui vengono le distanze qui sotto.
// Sono Java, C++ e Python: qui non entrano. Si prende la MISURA, non il codice
// — che e' la stessa scelta fatta per il grafo di scena.
//
// ⚠️ E LA CONTROPROVA RESTA VALIDA
// Le figure umane servono a verificare DOVE il programma mette le zone
// (`veritas_controprova.js`), e non devono deciderlo. Qui non lo decidono: qui
// dicono come si COMPORTA un agente una volta che le zone ci sono gia'. Sono
// due momenti diversi — prima si capisce lo spazio, poi ci si cammina dentro —
// e la separazione regge. Se un giorno qualcuno usasse le file per spostare
// una zona, la controprova andrebbe dichiarata non valida.

// ---------------------------------------------------------------------------
// 1. Quanto spazio occupa una persona in coda
// ---------------------------------------------------------------------------
//
// Da Fruin, livelli di servizio per le aree di accumulo. Non sono numeri
// scelti qui: sono lo standard con cui si dimensionano i filtri di sicurezza e
// le biglietterie, e sono gli stessi da cui viene l'ellisse corporea gia' usata
// dal resto del programma (61 x 46 cm).

export const FILA = Object.freeze({
  // Distanza fra una persona e quella davanti, in una coda ordinata. Fruin
  // colloca il confort personale intorno a 0,6-0,9 m2 a testa; con la spalla
  // di 61 cm questo da' un passo di circa 90 cm fra un petto e la schiena
  // davanti. Sotto i 60 cm ci si tocca, ed e' il livello F.
  passo: 0.9,
  // Larghezza del corpo, per sapere quanto e' larga la fila.
  larghezza: 0.61,
  // Sotto questa concordanza di sguardi non e' una fila: e' gente che passa.
  // 0,8 su una scala 0-1 vuol dire che gli assi sono quasi paralleli.
  concordanzaMinima: 0.8,
  // Meno di cosi' non e' una fila, sono due persone vicine.
  personeMinime: 3,
  // Quanto puo' essere larga una fila rispetto a quanto e' lunga. Oltre, non e'
  // una fila indiana: e' una platea o un capannello.
  snellezzaMinima: 1.5,
});

// ---------------------------------------------------------------------------
// 2. Leggere una fila da un capannello di figure
// ---------------------------------------------------------------------------
//
// Il capannello arriva da `veritas_controprova.capannelli()`: gente vicina fra
// loro, con la concordanza degli sguardi gia' misurata. Qui si guarda se quel
// gruppo e' una FILA, e in tal caso dove sta la testa e dove la coda.
//
// ⚠️ Il verso non si puo' leggere dagli sguardi: di una figura piatta si conosce
//    l'asse, non quale delle due facce sia stampata. La testa si trova invece
//    guardando DOVE SI SERVE — il banco, il varco, il tornello piu' vicino. Sono
//    le cose (piano 2), che non hanno questa ambiguita'.
//    Se non c'e' nessun servizio noto si ricade sulla densita': in una coda la
//    gente si stringe verso la testa e si dirada in fondo. E' una misura, ed e'
//    dichiarata come ripiego.

/** Proietta i punti su un asse e sul suo perpendicolare. */
function proietta(pezzi, ax, az) {
  const t = [], u = [];
  for (const p of pezzi) {
    t.push(p.centro[0] * ax + p.centro[2] * az);
    u.push(-p.centro[0] * az + p.centro[2] * ax);
  }
  return { t, u };
}

/** L'asse medio degli sguardi di un gruppo (angolo raddoppiato: conta l'asse). */
export function asseSguardi(pezzi) {
  const con = (pezzi || []).filter((p) => p.avanti && (p.avanti[0] || p.avanti[2]));
  if (!con.length) return null;
  let sc = 0, ss = 0;
  for (const p of con) {
    const a = Math.atan2(p.avanti[2], p.avanti[0]) * 2;
    sc += Math.cos(a); ss += Math.sin(a);
  }
  const ang = Math.atan2(ss, sc) / 2;
  return [Math.cos(ang), Math.sin(ang)];
}

/**
 * Un capannello e' una fila? E se si', dove sono testa e coda?
 *
 * @param {Object} capannello  da `veritas_controprova.capannelli()`
 * @param {Object} opz
 *   @param {Array} opz.servizi  punti dove si viene serviti (banchi, varchi):
 *          servono a capire da che parte guarda la fila. Vengono dal piano 2.
 * @returns {null|Object} { tipo, asse, testa, coda, lunghezza, larghezza,
 *                          persone, passo, verso }
 */
export function leggiFila(capannello, opz = {}) {
  const c = capannello;
  if (!c || !c.pezzi || c.pezzi.length < (opz.personeMinime || FILA.personeMinime)) return null;
  if (c.sguardo == null || c.sguardo < (opz.concordanzaMinima || FILA.concordanzaMinima)) return null;

  // L'asse della fila e' quello dello SGUARDO: in una coda si guarda avanti,
  // cioe' verso chi ci precede. Non e' l'asse principale della nuvola, che su
  // una coda corta e larga darebbe la direzione sbagliata.
  const a = asseSguardi(c.pezzi);
  if (!a) return null;
  const [ax, az] = a;

  const { t, u } = proietta(c.pezzi, ax, az);
  const tMin = Math.min(...t), tMax = Math.max(...t);
  const uMin = Math.min(...u), uMax = Math.max(...u);
  const lungo = tMax - tMin;
  const largo = uMax - uMin;

  // Una fila e' lunga nella direzione in cui si guarda. Se invece e' larga, la
  // gente sta fianco a fianco e guarda tutta avanti: e' una platea — una fila
  // di sedute davanti a un gate, un pubblico. Si dice, non si forza.
  const snellezza = largo > 1e-6 ? lungo / largo : Infinity;
  const tipo = snellezza >= (opz.snellezzaMinima || FILA.snellezzaMinima) ? "fila" : "platea";

  const uMed = (uMin + uMax) / 2;
  const capo = (tt) => [ax * tt - az * uMed, c.centro[1], az * tt + ax * uMed];

  // Da che parte sta la testa. Prima strada: il servizio piu' vicino.
  let verso = null, perche = null;
  const servizi = opz.servizi || [];
  if (servizi.length) {
    const dA = Math.min(...servizi.map((s) => Math.hypot(s[0] - capo(tMax)[0], s[2] - capo(tMax)[2])));
    const dB = Math.min(...servizi.map((s) => Math.hypot(s[0] - capo(tMin)[0], s[2] - capo(tMin)[2])));
    if (Math.abs(dA - dB) > 0.5) { verso = dA < dB ? +1 : -1; perche = "servizio"; }
  }
  // Ripiego: dove la gente e' piu' fitta. In coda ci si stringe davanti.
  if (verso === null) {
    const mezzo = (tMin + tMax) / 2;
    const avanti = t.filter((v) => v > mezzo).length, dietro = t.length - avanti;
    verso = avanti >= dietro ? +1 : -1;
    perche = "densita";
  }

  const testa = capo(verso > 0 ? tMax : tMin);
  const coda = capo(verso > 0 ? tMin : tMax);

  return {
    tipo, verso, perche,
    asse: [ax, 0, az],
    testa, coda,
    lunghezza: lungo,
    larghezza: Math.max(largo, FILA.larghezza),
    persone: c.pezzi.length,
    passo: opz.passo || FILA.passo,
    centro: c.centro,
  };
}

/** Tutte le file e le platee di un elenco di capannelli. */
export function file(capannelli, opz = {}) {
  return (capannelli || []).map((c) => leggiFila(c, opz)).filter(Boolean);
}

// ---------------------------------------------------------------------------
// 3. Dove si mette chi arriva
// ---------------------------------------------------------------------------

/**
 * Il posto dell'n-esimo nuovo arrivato: in fondo, dietro l'ultimo.
 *
 * n = 1 e' il primo che arriva dopo quelli gia' presenti nel modello.
 * La fila si allunga all'indietro, mai in avanti: davanti c'e' chi e' arrivato
 * prima, ed e' il punto di tutta la faccenda.
 */
export function postoInCoda(f, n = 1, opz = {}) {
  if (!f) return null;
  const passo = opz.passo || f.passo || FILA.passo;
  const d = passo * Math.max(1, n);
  // all'indietro = dalla parte opposta alla testa
  const ax = f.asse[0] * f.verso, az = f.asse[2] * f.verso;
  return [f.coda[0] - ax * d, f.coda[1], f.coda[2] - az * d];
}

/**
 * Il punto sta dentro l'ingombro di questa fila?
 *
 * Serve a sapere se un percorso ci passerebbe attraverso — cioe' se un agente
 * camminerebbe addosso a chi sta aspettando.
 */
export function dentroLaFila(f, punto, margine = 0) {
  if (!f || !punto) return false;
  const ax = f.asse[0], az = f.asse[2];
  const tT = f.testa[0] * ax + f.testa[2] * az;
  const tC = f.coda[0] * ax + f.coda[2] * az;
  const t = punto[0] * ax + punto[2] * az;
  const u = -punto[0] * az + punto[2] * ax;
  const uF = -f.centro[0] * az + f.centro[2] * ax;
  const dentroLungo = t >= Math.min(tT, tC) - margine && t <= Math.max(tT, tC) + margine;
  const dentroLargo = Math.abs(u - uF) <= f.larghezza / 2 + margine;
  return dentroLungo && dentroLargo;
}

/**
 * Quanto aspetta chi si mette in fondo, in secondi.
 *
 * Non e' una stima a occhio: e' la lunghezza della fila divisa per il ritmo con
 * cui il servizio smaltisce. Il ritmo lo decide chi conosce il servizio (un
 * varco di sicurezza fa 8-12 persone al minuto, un banco check-in 2-3), quindi
 * si CHIEDE invece di inventarlo, e senza di esso si restituisce null.
 *
 * ⚠️ Restituire null e' voluto. Un tempo d'attesa inventato in un referto che
 *    si vende e' esattamente il genere di numero credibile e falso gia' pagato
 *    due volte in questo progetto (il verdetto normativo, i KPI cablati).
 */
export function attesaStimata(f, personeAlMinuto, davanti = 0) {
  if (!f || !personeAlMinuto || personeAlMinuto <= 0) return null;
  return (f.persone + davanti) / personeAlMinuto * 60;
}

// ---------------------------------------------------------------------------
// 4. Scansare una fila mettendosi in coda
// ---------------------------------------------------------------------------

/**
 * Il percorso di chi arriva a un servizio davanti al quale c'e' gia' una fila.
 *
 * Invece di puntare dritto al banco — attraversando venti persone — si punta
 * al fondo della fila e ci si ferma li'.
 *
 * @param {Array}  da    da dove arriva
 * @param {Array}  a     dove voleva andare (il servizio)
 * @param {Array}  file  le file lette da `file()`
 * @param {Object} opz   { nArrivo: quanti sono gia' arrivati prima di lui,
 *                         percorso(a,b): il cammino vero, se disponibile }
 * @returns {null|{punti, fila, attesa}} null se nessuna fila riguarda questo
 *          viaggio: in tal caso il chiamante tiene il percorso di prima.
 */
export function mettitiInFila(da, a, elencoFile, opz = {}) {
  if (!da || !a || !elencoFile || !elencoFile.length) return null;

  // Quale fila serve il posto in cui volevo andare? Quella la cui TESTA e' li'.
  const raggio = opz.raggio != null ? opz.raggio : 6;
  let scelta = null, d = Infinity;
  for (const f of elencoFile) {
    if (f.tipo !== "fila") continue;
    const q = Math.hypot(f.testa[0] - a[0], f.testa[2] - a[2]);
    if (q <= raggio && q < d) { d = q; scelta = f; }
  }
  if (!scelta) return null;

  const fondo = postoInCoda(scelta, opz.nArrivo || 1, opz);
  const punti = opz.percorso
    ? (opz.percorso(da, fondo) || { punti: [da, fondo] }).punti
    : [da, fondo];

  return {
    punti,
    fila: scelta,
    // quante persone ha davanti: quelle gia' in fila piu' chi e' arrivato prima
    davanti: scelta.persone + Math.max(0, (opz.nArrivo || 1) - 1),
  };
}

// ---------------------------------------------------------------------------
// 5. Raccontarlo in italiano
// ---------------------------------------------------------------------------

export function racconta(elencoFile) {
  const f = (elencoFile || []).filter((x) => x.tipo === "fila");
  const p = (elencoFile || []).filter((x) => x.tipo === "platea");
  if (!f.length && !p.length) {
    return "Non ho trovato file: le persone ferme in questo modello non sono "
      + "disposte in coda, oppure non si sa da che parte guardano.";
  }
  const righe = [];
  if (f.length) {
    righe.push("Ho trovato " + f.length + (f.length === 1 ? " fila" : " file")
      + ". Chi arriva ci si mette dietro invece di attraversarla:");
    for (const x of f.slice(0, 6))
      righe.push("  - " + x.persone + " persone in coda su " + x.lunghezza.toFixed(1)
        + " m, la testa e' in (" + x.testa[0].toFixed(0) + ", " + x.testa[2].toFixed(0) + ")"
        + (x.perche === "servizio" ? " davanti a un servizio" : " (verso dedotto dalla densita)"));
  }
  if (p.length) {
    righe.push((f.length ? "E " : "Ho trovato ") + p.length
      + (p.length === 1 ? " platea" : " platee")
      + ": gente affiancata che guarda tutta avanti — sono sedute davanti a "
      + "qualcosa, non una coda.");
  }
  return righe.join("\n");
}

export default {
  FILA,
  asseSguardi, leggiFila, file, postoInCoda, dentroLaFila,
  attesaStimata, mettitiInFila, racconta,
};
