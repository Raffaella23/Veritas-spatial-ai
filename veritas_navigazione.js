// veritas_navigazione.js — dove si può camminare davvero, e per che strada.
//
// IL PROBLEMA
// Gli agenti attraversavano i muri. Il controllo che avrebbe dovuto impedirlo
// (`lineHasSupport`) chiedeva: «lungo questo tratto, almeno il 70% dei campioni
// ha del pavimento entro 2,5 metri?». Sono tre errori sovrapposti, e ciascuno
// da solo basta a rendere il controllo cieco:
//
//   1. RAGGIO 2,5 m — in mezzo a un muro di trenta centimetri il pavimento
//      della stanza accanto è sempre entro due metri e mezzo. Un muro più
//      sottile di cinque metri non viene mai visto.
//   2. VOTO A MAGGIORANZA (70%) — attraversare un muro è un fatto LOCALE:
//      due metri di ostacolo su cinquanta di percorso sono il 4%, e passano.
//      Un muro non è mai la maggioranza di un percorso, quindi non perde mai.
//   3. SETTE CAMPIONI IN TUTTO — su un tratto di cinquanta metri è un campione
//      ogni otto. Un muro può stare per intero fra due campioni.
//
// Misurato: con quel controllo un muro pieno spesso SEI METRI risultava
// attraversabile.
//
// COME SI RISOLVE
// Non con un raggio più piccolo: con un'altra domanda. Non «c'è del pavimento
// qui vicino?» ma «questa cella è calpestabile da una persona?». La risposta
// è già stata misurata dal motore percettivo, che per ogni cella conosce la
// distanza dal muro più vicino. Una persona passa dove quella distanza è
// almeno mezza larghezza di spalle. Un campione fuori posto basta a bloccare:
// nessun voto a maggioranza.
//
// E quando la linea diretta è bloccata non si indovina una deviazione: si
// cerca la strada con A* sulle celle calpestabili, che è la stessa cosa che
// fa una persona quando gira attorno a un muro per trovare la porta.
//
// PERCHÉ NON RICALCOLA NULLA
// La griglia e le distanze dai muri arrivano dal motore percettivo
// (`veritas_perception.js`), che le ha già calcolate per misurare lo spazio.
// Qui si riusano così come sono: due misure della stessa cosa darebbero due
// risposte diverse alla stessa domanda.

export const NAVIGAZIONE_DEFAULTS = {
  /**
   * Mezza larghezza di spalle, in metri. 0,28 ⇒ una persona occupa 56 cm, che
   * è la misura antropometrica corrente per un adulto in movimento. È questo
   * il valore che decide se un varco è una porta o una fessura.
   */
  raggioPersona: 0.28,
  /**
   * Entro questa distanza da un muro camminare "costa" di più. Non è un
   * divieto: serve a far passare la gente in mezzo alla stanza e in mezzo alla
   * porta, invece che rasente allo stipite. Senza, A* produce percorsi
   * matematicamente corretti e visibilmente innaturali.
   */
  comfortMuro: 0.9,
  /** Quanto costa di più camminare attaccati al muro (moltiplicatore). */
  penalitaMuro: 1.6,
  /** Quanto lontano cercare una cella calpestabile se il punto chiesto è dentro un muro. */
  raggioAggancioM: 8,
  /**
   * Se la mappa non regge la persona intera si riprova più stretti, in
   * quest'ordine, prima di arrendersi. Serve per le nuvole rade, dove la
   * griglia è più grossolana della realtà e i passaggi risultano più stretti
   * di quello che sono. L'ultimo tentativo (0) chiede solo di stare sul
   * calpestabile: è l'ultima difesa prima di tornare alla linea dritta.
   */
  tolleranzeRaggio: [1, 0.65, 0.35, 0],
  /** Oltre questo numero di celle la mappa di cammino viene infittita di meno. */
  maxCelleMappa: 4e6,
  /** Tetto di sicurezza sulle celle esplorate da una singola ricerca. */
  maxCelleEsplorate: 8e5,
  /**
   * Quanto spazio calpestabile puo' al massimo togliere la lettura dei muri
   * dal modello prima che si smetta di crederle. I muri di un edificio
   * occupano una frazione modesta della pianta: se ne sparisce un terzo non
   * stiamo leggendo muri, stiamo leggendo altro.
   */
  maxChiusuraFrazione: 0.35,
  /**
   * Raggio della chiusura dei buchi, in celle, per la mappa di CAMMINO.
   *
   * Il motore percettivo usa 2, e per misurare è giusto: tappa i buchi del
   * campionamento, che altrimenti diventerebbero finte strettoie. Ma la stessa
   * operazione SALDA i muri sottili, e un muro saldato è un muro che gli
   * agenti attraversano.
   *
   * La relazione è esatta e misurata: la chiusura scavalca `2 × raggio × cella`
   * metri, e un muro più sottile di così sparisce dalla mappa. Con cella 5 cm
   * e raggio 2 sparisce ogni muro sotto i 25 cm — cioè quasi tutti i tramezzi
   * veri. Con raggio 1 la soglia scende a 15 cm.
   *
   * Per camminare si preferisce sbagliare per eccesso di prudenza: un buco non
   * tappato è un ostacolo finto, e A* ci gira attorno; un muro saldato è una
   * persona che passa attraverso una parete.
   */
  chiusuraCammino: 1,
};

/* ========================================================================== *
 * 1. La mappa di cammino
 * ========================================================================== */

/**
 * Costruisce la mappa di cammino da un livello già percepito.
 *
 * Non è la griglia della percezione: è la stessa griglia letta con un'altra
 * domanda. La percezione chiede «questa cella è spazio libero?», qui si chiede
 * «ci passa una persona?». La differenza è la distanza dal muro, che il motore
 * percettivo ha già misurato cella per cella.
 *
 * @param {object} livello  un elemento di `perceive().levels`: { grid, dist }
 * @returns {object|null} mappa, oppure null se il livello non è utilizzabile
 */
export function creaMappa(livello, opts = {}) {
  if (!livello || !livello.grid || !livello.dist) return null;
  const o = { ...NAVIGAZIONE_DEFAULTS, ...opts };
  const g = livello.grid;
  if (!g.w || !g.h) return null;

  let { w, h, cellSize, minX, minZ } = g;
  let libera = g.free, distanza = livello.dist;

  // Su modelli molto estesi la griglia della percezione può avere milioni di
  // celle: per misurare va bene, per cercare una strada no. Si accorpa a
  // blocchi, tenendo per ogni blocco la distanza dal muro MIGLIORE — così una
  // porta larga 90 cm resta una porta invece di sparire nell'accorpamento.
  const fattore = Math.max(1, Math.ceil(Math.sqrt((w * h) / o.maxCelleMappa)));
  if (fattore > 1) {
    const w2 = Math.ceil(w / fattore), h2 = Math.ceil(h / fattore);
    const lib2 = new Uint8Array(w2 * h2);
    const dist2 = new Float32Array(w2 * h2);
    for (let y = 0; y < h; y++) {
      const y2 = (y / fattore) | 0;
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!libera[i]) continue;
        const i2 = y2 * w2 + ((x / fattore) | 0);
        lib2[i2] = 1;
        if (distanza[i] > dist2[i2]) dist2[i2] = distanza[i];
      }
    }
    w = w2; h = h2; cellSize = cellSize * fattore;
    libera = lib2; distanza = dist2;
  }

  return {
    w, h, cellSize, minX, minZ,
    quota: g.levelY != null ? g.levelY : (livello.levelY || 0),
    libera, distanza,
    accorpamento: fattore,
    /**
     * Il muro più sottile che questa mappa può vedere, in metri. Dichiarato e
     * non sottinteso: sotto questa soglia la mappa non sa che il muro c'è, e
     * nessun controllo a valle può rimediare. Chi legge un percorso deve
     * poterlo sapere.
     */
    muroMinimoVisibileM: +((livello.pontechiusuraM != null
      ? livello.pontechiusuraM
      : 2 * (livello.closeRadius != null ? livello.closeRadius : 2) * (g.cellSize || cellSize))
      .toFixed(3)),
    // Il raggio effettivamente in uso: lo fissa `trovaPercorso` provando le
    // tolleranze, e resta scritto qui per chi vuole sapere con che larghezza
    // è stata calcolata una strada.
    raggio: o.raggioPersona,
  };
}

/**
 * Mappa di cammino a partire da una nuvola di punti, quando la percezione
 * completa non è disponibile.
 *
 * Usa le funzioni del motore percettivo, non una copia: la griglia di
 * occupazione e la distanza dai muri sono calcolate da lui.
 *
 * @param {object} motore  window.__veritasPerceptionEngine
 */
export function creaMappaDaNuvola(motore, punti, quota = 0, opts = {}) {
  if (!motore || typeof motore.buildOccupancyGrid !== "function") return null;
  if (!punti || !punti.length) return null;
  const o = { ...NAVIGAZIONE_DEFAULTS, ...opts };
  const passo = typeof motore.estimatePointSpacing === "function"
    ? motore.estimatePointSpacing(punti, quota, o) : null;
  const cella = opts.cellSize || Math.max(0.05, +(passo ? passo * 1.5 : 0.15).toFixed(3));

  const chiusura = opts.chiusuraCammino != null ? opts.chiusuraCammino : o.chiusuraCammino;
  let grid = motore.buildOccupancyGrid(punti, quota, { ...o, cellSize: cella });
  if (!grid) return null;
  if (typeof motore.closeHoles === "function" && chiusura > 0) grid = motore.closeHoles(grid, chiusura);
  const ft = motore.distanceTransform(grid);
  return creaMappa({ grid, dist: ft.dist, levelY: quota, pontechiusuraM: 2 * chiusura * cella }, opts);
}

/**
 * Marca sulla mappa gli ostacoli letti direttamente dal modello.
 *
 * PERCHÉ SERVE. Fin qui i muri sono DEDOTTI: dove non è atterrato nessun
 * campione di pavimento, si assume che ci sia qualcosa. È un'inferenza per
 * assenza, e ha un limite invalicabile — non si può vedere un muro più sottile
 * della distanza fra un campione e l'altro. Misurato su un terminal di
 * 120 x 80 m campionato con i 40.000 punti che il programma si concede: sotto
 * il metro di spessore, nessun muro risulta visibile.
 *
 * Ma i muri nel modello ci sono: sono superfici verticali, e il campionamento
 * del pavimento le scarta di proposito (tiene solo ciò che è rivolto verso
 * l'alto). Leggerle è un'informazione POSITIVA, e non ha quel limite: un
 * tramezzo di dieci centimetri che attraversa una cella rende occupata quella
 * cella, e la barriera resta continua.
 *
 * SICUREZZA. Marcare troppo è pericoloso quanto marcare troppo poco: una porta
 * modellata chiusa, o una vetrata, chiuderebbero un passaggio vero. Per questo
 * il risultato viene misurato prima di essere accettato: se lo spazio
 * calpestabile crolla oltre la soglia, la marcatura viene SCARTATA e si tiene
 * la mappa di prima, dicendolo. Meglio la mappa di ieri che una mappa che
 * chiude l'edificio.
 *
 * @param {object} m       mappa di cammino
 * @param {Array} punti    campioni di superfici verticali, [x, z] o [x, y, z]
 * @param {object} motore  window.__veritasPerceptionEngine (per la distance transform)
 * @returns {object} { applicata, celleChiuse, fraseCalo, mappa }
 */
export function marcaOstacoli(m, punti, motore, opts = {}) {
  const o = { ...NAVIGAZIONE_DEFAULTS, ...opts };
  const esito = { applicata: false, celleChiuse: 0, fraseCalo: 0, mappa: m };
  if (!m || !punti || !punti.length || !motore || typeof motore.distanceTransform !== "function") return esito;

  let libereePrima = 0;
  for (let i = 0; i < m.libera.length; i++) if (m.libera[i]) libereePrima++;
  if (!libereePrima) return esito;

  const libera = m.libera.slice();
  let chiuse = 0;
  for (const p of punti) {
    const x = p[0], z = p.length > 2 ? p[2] : p[1];
    const cx = Math.floor((x - m.minX) / m.cellSize), cz = Math.floor((z - m.minZ) / m.cellSize);
    if (cx < 0 || cz < 0 || cx >= m.w || cz >= m.h) continue;
    const i = cz * m.w + cx;
    if (libera[i]) { libera[i] = 0; chiuse++; }
  }
  if (!chiuse) return esito;

  const calo = chiuse / libereePrima;
  esito.celleChiuse = chiuse;
  esito.fraseCalo = +(calo * 100).toFixed(1);
  // Soglia prudente: i muri di un edificio occupano una frazione modesta della
  // pianta. Se ne risulta chiusa un terzo, non stiamo leggendo i muri — stiamo
  // leggendo qualcos'altro (arredi ovunque, una mesh sbagliata, un modello con
  // le stanze piene). In quel caso non ci si fida.
  if (calo > (o.maxChiusuraFrazione != null ? o.maxChiusuraFrazione : 0.35)) return esito;

  const ft = motore.distanceTransform({ w: m.w, h: m.h, free: libera, cellSize: m.cellSize });
  esito.applicata = true;
  esito.mappa = { ...m, libera, distanza: ft.dist, muroMinimoVisibileM: 0, muriDalModello: true };
  return esito;
}

/* ========================================================================== *
 * 2. Le domande elementari
 * ========================================================================== */

const idx = (m, cx, cz) => cz * m.w + cx;

export function cellaDa(m, x, z) {
  return [Math.floor((x - m.minX) / m.cellSize), Math.floor((z - m.minZ) / m.cellSize)];
}

export function centroCella(m, cx, cz) {
  return [m.minX + (cx + 0.5) * m.cellSize, m.minZ + (cz + 0.5) * m.cellSize];
}

/** Ci passa una persona di questo raggio? */
export function calpestabile(m, cx, cz, raggio) {
  if (cx < 0 || cz < 0 || cx >= m.w || cz >= m.h) return false;
  const i = idx(m, cx, cz);
  if (!m.libera[i]) return false;
  return m.distanza[i] >= (raggio != null ? raggio : m.raggio);
}

/**
 * Il segmento fra due punti è percorribile per intero?
 *
 * Qui sta la correzione del difetto: si campiona a mezza cella — quindi
 * nessun muro può nascondersi fra due campioni — e **un solo** campione fuori
 * dal calpestabile basta a rispondere no. Niente maggioranze: un muro è un
 * muro anche se occupa il 4% del percorso.
 */
export function segmentoLibero(m, ax, az, bx, bz, raggio) {
  if (!m) return true;                       // senza mappa non si blocca nulla
  const r = raggio != null ? raggio : m.raggio;
  const lung = Math.hypot(bx - ax, bz - az);
  const passi = Math.max(1, Math.ceil((lung / m.cellSize) * 2));
  for (let k = 0; k <= passi; k++) {
    const t = k / passi;
    const [cx, cz] = cellaDa(m, ax + (bx - ax) * t, az + (bz - az) * t);
    if (!calpestabile(m, cx, cz, r)) return false;
  }
  return true;
}

/**
 * La cella calpestabile più vicina a quella chiesta.
 *
 * Serve perché i baricentri delle zone non cadono per forza sul calpestabile:
 * il baricentro di una stanza a L può stare dentro il muro. Senza questo
 * aggancio la ricerca partirebbe da un punto impossibile e fallirebbe sempre.
 */
export function agganciaCella(m, cx, cz, raggio, raggioMaxM) {
  if (calpestabile(m, cx, cz, raggio)) return [cx, cz];
  const maxCelle = Math.ceil((raggioMaxM != null ? raggioMaxM : NAVIGAZIONE_DEFAULTS.raggioAggancioM) / m.cellSize);
  for (let r = 1; r <= maxCelle; r++) {
    for (let d = -r; d <= r; d++) {
      const cand = [[cx + d, cz - r], [cx + d, cz + r], [cx - r, cz + d], [cx + r, cz + d]];
      for (const [qx, qz] of cand) if (calpestabile(m, qx, qz, raggio)) return [qx, qz];
    }
  }
  return null;
}

/* ========================================================================== *
 * 3. La ricerca della strada
 * ========================================================================== */

/** Coda di priorità minima: senza, A* su mezzo milione di celle non finisce. */
class Coda {
  constructor(n) { this.k = new Float64Array(n); this.v = new Int32Array(n); this.n = 0; }
  push(kk, vv) {
    let i = this.n++;
    this.k[i] = kk; this.v[i] = vv;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.k[p] <= this.k[i]) break;
      const tk = this.k[p], tv = this.v[p];
      this.k[p] = this.k[i]; this.v[p] = this.v[i];
      this.k[i] = tk; this.v[i] = tv;
      i = p;
    }
  }
  pop() {
    const top = this.v[0];
    if (--this.n > 0) {
      this.k[0] = this.k[this.n]; this.v[0] = this.v[this.n];
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let s = i;
        if (l < this.n && this.k[l] < this.k[s]) s = l;
        if (r < this.n && this.k[r] < this.k[s]) s = r;
        if (s === i) break;
        const tk = this.k[s], tv = this.v[s];
        this.k[s] = this.k[i]; this.v[s] = this.v[i];
        this.k[i] = tk; this.v[i] = tv;
        i = s;
      }
    }
    return top;
  }
  get vuota() { return this.n === 0; }
}

const DIR = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

function aStar(m, partenza, arrivo, raggio, o) {
  const N = m.w * m.h;
  const gCost = new Float64Array(N).fill(Infinity);
  const prev = new Int32Array(N).fill(-1);
  const chiuso = new Uint8Array(N);
  // Capienza generosa: una cella può entrare in coda più volte, perché non si
  // fa decrease-key ma si reinserisce (più semplice, e più veloce in pratica).
  const coda = new Coda(Math.min(N * 4, 4e6) | 0);

  const iP = idx(m, partenza[0], partenza[1]), iA = idx(m, arrivo[0], arrivo[1]);
  const ax = arrivo[0], az = arrivo[1];
  // Distanza ottile: il costo minimo reale su griglia a 8 vicini, quindi
  // ammissibile — A* non può sbagliare percorso per colpa sua.
  const stima = (cx, cz) => {
    const dx = Math.abs(cx - ax), dz = Math.abs(cz - az);
    return (Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz)) * m.cellSize;
  };

  gCost[iP] = 0;
  coda.push(stima(partenza[0], partenza[1]), iP);
  let esplorate = 0;

  while (!coda.vuota) {
    const cur = coda.pop();
    if (chiuso[cur]) continue;
    chiuso[cur] = 1;
    if (cur === iA) break;
    if (++esplorate > o.maxCelleEsplorate) return { trovato: false, esplorate, motivo: "troppo grande" };

    const cx = cur % m.w, cz = (cur / m.w) | 0;
    for (let d = 0; d < 8; d++) {
      const nx = cx + DIR[d][0], nz = cz + DIR[d][1];
      if (!calpestabile(m, nx, nz, raggio)) continue;
      // In diagonale non si taglia lo spigolo: se uno dei due lati è muro,
      // quel passo attraverserebbe il vertice del muro. È il modo classico in
      // cui un agente "sfiora" l'angolo e sembra passarci dentro.
      if (d >= 4 && (!calpestabile(m, cx + DIR[d][0], cz, raggio) ||
                     !calpestabile(m, cx, cz + DIR[d][1], raggio))) continue;
      const ni = idx(m, nx, nz);
      if (chiuso[ni]) continue;
      const passo = (d >= 4 ? Math.SQRT2 : 1) * m.cellSize;
      // Stare attaccati al muro costa di più: è ciò che tiene i passeggeri in
      // mezzo alla porta invece che rasente allo stipite.
      const libero = m.distanza[ni];
      const stretto = Math.max(0, (o.comfortMuro - libero) / o.comfortMuro);
      const costo = gCost[cur] + passo * (1 + o.penalitaMuro * stretto * stretto);
      if (costo < gCost[ni]) {
        gCost[ni] = costo; prev[ni] = cur;
        coda.push(costo + stima(nx, nz), ni);
      }
    }
  }

  if (gCost[iA] === Infinity) return { trovato: false, esplorate, motivo: "nessuna strada" };
  const celle = [];
  for (let c = iA; c !== -1; c = prev[c]) celle.push([c % m.w, (c / m.w) | 0]);
  celle.reverse();
  return { trovato: true, celle, esplorate, costo: gCost[iA] };
}

/**
 * Riduce la scia di celle a poche tappe.
 *
 * A* restituisce una cella dopo l'altra: centinaia di punti a zig-zag di mezzo
 * passo. Qui si tira la corda — si tiene una tappa solo dove la linea dritta
 * smette di essere libera — e restano i pochi angoli veri, quelli che una
 * persona farebbe davvero.
 *
 * ⚠️ La scorciatoia si verifica con un raggio PIU' LARGO di quello con cui e'
 * stata cercata la strada. Senza questo margine, uscendo da una porta la
 * spezzata taglia l'angolo e sfiora lo stipite: misurato, due punti su 552 a
 * 22 cm dal muro invece dei 28 richiesti. Non e' un muro attraversato — e' una
 * spalla che struscia — ma su un modello si vede, e qui l'aspetto conta.
 * Se il margine non passa la tappa resta: meglio una tappa in piu' che un
 * passeggero incastrato nella porta.
 */
export function tiraLaCorda(m, celle, raggio, margine) {
  if (!celle || celle.length <= 2) return (celle || []).map(([cx, cz]) => centroCella(m, cx, cz));
  const r = (raggio != null ? raggio : m.raggio) * (margine != null ? margine : 1.3);
  const punti = [centroCella(m, celle[0][0], celle[0][1])];
  let ancora = 0;
  for (let i = 2; i < celle.length; i++) {
    const [ax, az] = centroCella(m, celle[ancora][0], celle[ancora][1]);
    const [bx, bz] = centroCella(m, celle[i][0], celle[i][1]);
    if (!segmentoLibero(m, ax, az, bx, bz, r)) {
      ancora = i - 1;
      punti.push(centroCella(m, celle[ancora][0], celle[ancora][1]));
    }
  }
  punti.push(centroCella(m, celle[celle.length - 1][0], celle[celle.length - 1][1]));
  return punti;
}

/**
 * La strada da un punto all'altro, che non attraversa muri.
 *
 * @returns {object|null} { punti: [[x,z]…], lunghezzaM, raggioUsato, diretta, nota }
 *   `punti` esclude la partenza e termina sull'arrivo, come si aspetta chi
 *   costruisce la traiettoria. `null` significa "non lo so": chi chiama deve
 *   decidere cosa fare, e non deve credere che la strada sia libera.
 */
export function trovaPercorso(m, da, a, opts = {}) {
  if (!m) return null;
  const o = { ...NAVIGAZIONE_DEFAULTS, ...opts };
  const [dx, dz] = [da[0], da[2] != null ? da[2] : da[1]];
  const [ax, az] = [a[0], a[2] != null ? a[2] : a[1]];

  for (const frazione of o.tolleranzeRaggio) {
    const raggio = o.raggioPersona * frazione;

    // Se si vede l'arrivo, non c'è niente da cercare.
    if (segmentoLibero(m, dx, dz, ax, az, raggio)) {
      return {
        punti: [[ax, az]], lunghezzaM: Math.hypot(ax - dx, az - dz),
        raggioUsato: raggio, diretta: true,
        nota: frazione < 1 ? "linea libera solo restringendo a " + raggio.toFixed(2) + " m" : "linea libera",
      };
    }

    const cP = agganciaCella(m, ...cellaDa(m, dx, dz), raggio, o.raggioAggancioM);
    const cA = agganciaCella(m, ...cellaDa(m, ax, az), raggio, o.raggioAggancioM);
    if (!cP || !cA) continue;
    if (cP[0] === cA[0] && cP[1] === cA[1]) {
      return { punti: [[ax, az]], lunghezzaM: Math.hypot(ax - dx, az - dz),
               raggioUsato: raggio, diretta: true, nota: "stessa cella" };
    }

    const r = aStar(m, cP, cA, raggio, o);
    if (!r.trovato) continue;

    const punti = tiraLaCorda(m, r.celle, raggio);
    // La prima tappa è la cella d'aggancio della partenza: se coincide con
    // dove siamo già, è un punto in più che non serve a nessuno.
    if (punti.length && Math.hypot(punti[0][0] - dx, punti[0][1] - dz) < m.cellSize) punti.shift();
    // Si arriva dove è stato chiesto — ma solo se l'ultimo tratto è davvero
    // libero. Quando la destinazione cade dentro un muro (capita: il baricentro
    // di una stanza a L ci finisce) l'ultimo passo la raggiungerebbe passando
    // per il pieno. Meglio fermarsi al punto calpestabile più vicino e dirlo,
    // che consegnare un arrivo perfetto ottenuto attraversando una parete.
    let arrivoEsatto = true;
    if (punti.length) {
      const [ux, uz] = punti.length > 1 ? punti[punti.length - 2] : [dx, dz];
      if (segmentoLibero(m, ux, uz, ax, az, raggio)) punti[punti.length - 1] = [ax, az];
      else arrivoEsatto = false;
    } else if (segmentoLibero(m, dx, dz, ax, az, raggio)) {
      punti.push([ax, az]);
    } else {
      arrivoEsatto = false;
      punti.push(centroCella(m, cA[0], cA[1]));
    }

    let lung = 0, px = dx, pz = dz;
    for (const [qx, qz] of punti) { lung += Math.hypot(qx - px, qz - pz); px = qx; pz = qz; }
    return {
      punti, lunghezzaM: lung, raggioUsato: raggio, diretta: false,
      celleEsplorate: r.esplorate, arrivoEsatto,
      nota: "aggirato in " + punti.length + " tappe"
        + (frazione < 1 ? ", restringendo a " + raggio.toFixed(2) + " m" : "")
        + (arrivoEsatto ? "" : "; la destinazione non e' calpestabile, ci si ferma al punto utile piu' vicino"),
    };
  }
  return null;
}

export default {
  NAVIGAZIONE_DEFAULTS, creaMappa, creaMappaDaNuvola, marcaOstacoli, cellaDa,
  centroCella, calpestabile, segmentoLibero, agganciaCella, tiraLaCorda,
  trovaPercorso,
};
