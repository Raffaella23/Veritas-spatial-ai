// =============================================================================
// VERITAS — LA CONTROPROVA. Il modello si porta dietro la risposta.
// =============================================================================
//
// LA RICHIESTA
// Raffaella, 19/08/2026: *«quando il sistema funzionera' alla perfezione,
// dovrei ritrovare una corrispondenza fra la presenza delle persone, le facce,
// e le zone che metti tu. Questa sara' la controprova che il sistema funziona.
// Ecco perche' ho dato questo modello.»*
//
// L'IDEA, ED E' UNA BUONA IDEA
// Chi costruisce un modello di uno spazio ci mette dentro delle persone, e non
// le mette a caso: le mette dove le persone stanno. In coda al banco, sedute in
// attesa, in fila al controllo, ferme davanti a un monitor. Quelle figure sono
// il giudizio di un progettista su come si usa quello spazio, gia' scritto
// dentro il file.
//
// Quindi ogni modello abitato porta con se' la propria risposta, e si puo'
// chiedere al programma: le zone che hai messo cadono dove c'e' gente?
//
// ⚠️ E VALE SOLO SE LE FIGURE NON DECIDONO NIENTE
//
//    Se le figure servissero anche a mettere le zone, questa misura direbbe
//    sempre di si' e non varrebbe niente: si verificherebbe da sola. Le figure
//    vanno TENUTE DA PARTE — le zone nascono da altro (arredi, segnaletica,
//    geometria, occhi), e solo dopo si controlla se sono cadute sulla gente.
//
//    E' la separazione fra cio' su cui si costruisce e cio' con cui si
//    verifica. Qui non e' una raffinatezza di metodo: e' la differenza fra una
//    prova e un'illusione. Il modulo si RIFIUTA di dare un punteggio se una
//    zona dichiara di essere nata dalle figure (vedi `circolare`).
//
// LE FACCE
// Le figure guardano da qualche parte, e da che parte guardano dice molto:
// dodici persone che guardano tutte nella stessa direzione sono una coda;
// dodici che guardano ognuna per conto suo sono un atrio di passaggio. E' un
// dato di comportamento, non di forma, e nessuna misura di geometria lo da'.
//
// ⚠️ Di una figura piatta si conosce l'ASSE dello sguardo, non il verso: il
//    piano ha due facce e da quale sia stampata la faccia non si sa senza
//    guardare la texture. Quindi si misura la concordanza fra assi (quanto
//    guardano tutte nello stesso modo) e mai «verso destra» o «verso sinistra».
//    Dirlo e' meglio che indovinarlo.
//
// COSA SI E' CERCATO PRIMA (Regola uno)
// Non esiste una libreria per «verifica le tue zone contro le comparse messe
// dentro un modello 3D», perche' e' una prova di questo prodotto. Il metodo
// pero' e' quello standard di chi valuta una mappa semantica: si tiene una
// parte dei dati fuori dall'addestramento e ci si misura sopra. E l'idea che
// la posizione e l'orientamento delle persone dicano a cosa serve uno spazio e'
// il fondamento della ricerca sull'uso dello spazio in architettura (Whyte,
// «The Social Life of Small Urban Spaces», 1980) e delle mappe di affordance
// in robotica.

// ---------------------------------------------------------------------------
// 1. Riconoscere una figura umana. Per misura, mai per nome.
// ---------------------------------------------------------------------------

// Statura di un adulto. Gli estremi sono larghi di proposito: comprendono un
// bambino accanto a un adulto alto, e la posa a braccia alzate. Sotto ci sono
// i paletti e i cestini, sopra le colonne e i totem.
export const STATURA = Object.freeze({ min: 1.35, max: 2.25 });

/**
 * E' una figura umana?
 *
 * ⚠️ Per misura non si puo' distinguere con certezza una persona da un totem
 *    alto quanto una persona. Il modulo lo dichiara invece di fingere: chi
 *    legge il risultato sa che sta contando «oggetti di taglia e postura
 *    umana». Gli occhi, se accesi, possono confermarlo — ma la controprova
 *    regge anche senza, perche' un totem sta dove sta la gente quasi quanto
 *    una persona.
 */
export function eUnaFigura(cosa) {
  if (!cosa || cosa.forma !== "verticale") return false;
  const h = cosa.ingombroUno ? cosa.ingombroUno[1] : null;
  return h != null && h >= STATURA.min && h <= STATURA.max;
}

/** Tutte le figure di un elenco di cose, con quante persone rappresentano. */
export function figure(cose) {
  return (cose || []).filter(eUnaFigura);
}

/** Quante persone in tutto. Una «cosa» sta per N copie della stessa figura. */
export function quantePersone(elenco) {
  return elenco.reduce((s, c) => s + c.quante, 0);
}

// ---------------------------------------------------------------------------
// 2. Dove si raduna la gente
// ---------------------------------------------------------------------------
//
// Le figure di un modello arrivano in gruppi per FIRMA (venti copie della
// stessa persona), ma quello che conta non e' quali persone sono: e' dove sono
// radunate. Due comparse diverse in piedi una accanto all'altra sono lo stesso
// capannello.
//
// Quindi si riparte dai singoli pezzi e si raggruppano per vicinanza, senza
// guardare di che figura si tratti.

// A che distanza due persone stanno «insieme». 2,5 m e' la distanza sociale
// oltre la quale, in prossemica, due persone non stanno piu' interagendo
// (Hall, «The Hidden Dimension», 1966: la distanza sociale arriva a ~3,6 m; qui
// si sta piu' stretti perche' interessa il capannello, non la conversazione).
export const CAPANNELLO = 2.5;

/**
 * I capannelli: dove la gente sta insieme.
 *
 * @param {Array} figure  cose riconosciute come figure
 * @returns {Array} { centro, persone, raggio, sguardo }
 */
export function capannelli(elencoFigure, opz = {}) {
  const vicinanza = opz.vicinanza != null ? opz.vicinanza : CAPANNELLO;
  const pezzi = [];
  for (const c of elencoFigure) for (const p of c.pezzi || []) pezzi.push(p);
  if (!pezzi.length) return [];

  // unione per contatto, come per le cose: nessun numero di gruppi da decidere
  // prima, che e' precisamente cio' che rende KMeans inadatto qui
  const padre = pezzi.map((_, i) => i);
  const radice = (i) => { while (padre[i] !== i) { padre[i] = padre[padre[i]]; i = padre[i]; } return i; };
  for (let i = 0; i < pezzi.length; i++) for (let j = i + 1; j < pezzi.length; j++) {
    const d = Math.hypot(pezzi[i].centro[0] - pezzi[j].centro[0],
                         pezzi[i].centro[2] - pezzi[j].centro[2]);
    if (d <= vicinanza) { const a = radice(i), b = radice(j); if (a !== b) padre[b] = a; }
  }
  const per = new Map();
  pezzi.forEach((p, i) => {
    const r = radice(i);
    if (!per.has(r)) per.set(r, []);
    per.get(r).push(p);
  });

  return [...per.values()].map((g) => {
    const cx = g.reduce((s, p) => s + p.centro[0], 0) / g.length;
    const cz = g.reduce((s, p) => s + p.centro[2], 0) / g.length;
    const cy = g.reduce((s, p) => s + p.centro[1], 0) / g.length;
    return {
      centro: [cx, cy, cz],
      persone: g.length,
      raggio: Math.max(...g.map((p) => Math.hypot(p.centro[0] - cx, p.centro[2] - cz))),
      sguardo: concordanzaSguardi(g),
      pezzi: g,
    };
  }).sort((a, b) => b.persone - a.persone);
}

// ---------------------------------------------------------------------------
// 3. Le facce: quanto guardano tutte dalla stessa parte
// ---------------------------------------------------------------------------

/**
 * Concordanza degli assi di sguardo di un gruppo, da 0 a 1.
 *
 * 1 = guardano tutte nello stesso modo (una coda, una platea).
 * 0 = ognuna per conto suo (un atrio, uno spazio di passaggio).
 *
 * Si lavora sull'ASSE e non sulla direzione, perche' di una figura piatta non
 * si sa quale delle due facce sia quella stampata. Matematicamente: si
 * raddoppia l'angolo prima di mediarlo, cosi' 0 e 180 gradi diventano lo
 * stesso valore. E' il modo standard di mediare orientamenti senza verso.
 *
 * @returns {number|null} null se le direzioni non sono note
 */
export function concordanzaSguardi(pezzi) {
  const con = (pezzi || []).filter((p) => p.avanti && (p.avanti[0] || p.avanti[2]));
  if (con.length < 2) return null;
  let sc = 0, ss = 0;
  for (const p of con) {
    const a = Math.atan2(p.avanti[2], p.avanti[0]) * 2;   // angolo raddoppiato
    sc += Math.cos(a); ss += Math.sin(a);
  }
  return Math.hypot(sc, ss) / con.length;
}

/**
 * Quanto un gruppo guarda verso un punto, da 0 a 1.
 *
 * Serve a chiedere: la gente davanti a questa zona la sta guardando, o le
 * passa accanto? Anche qui conta l'asse, non il verso: 1 vuol dire che la
 * retta dello sguardo passa per la zona, non che le danno le spalle.
 */
export function guardanoVerso(pezzi, punto) {
  const con = (pezzi || []).filter((p) => p.avanti && (p.avanti[0] || p.avanti[2]));
  if (!con.length) return null;
  let somma = 0;
  for (const p of con) {
    const vx = punto[0] - p.centro[0], vz = punto[2] - p.centro[2];
    const n = Math.hypot(vx, vz);
    if (n < 1e-6) { somma += 1; continue; }
    const m = Math.hypot(p.avanti[0], p.avanti[2]);
    somma += Math.abs((p.avanti[0] * vx + p.avanti[2] * vz) / (m * n));
  }
  return somma / con.length;
}

// ---------------------------------------------------------------------------
// 4. Il guardiano contro la circolarita'
// ---------------------------------------------------------------------------

/**
 * Le zone sono state costruite USANDO le figure?
 *
 * Se si', la controprova non vale: si verificherebbe da sola. Si guarda la
 * provenienza dichiarata su ogni zona — il campo `origine` che il programma
 * gia' compila («misura», «cammino», «occhi», «nome+misura»...).
 *
 * ⚠️ Meglio rifiutare un punteggio che darne uno che si e' costruito da solo.
 *    E' la stessa scelta gia' fatta per il verdetto normativo e per i KPI
 *    finti: un numero credibile e falso e' la cosa peggiore che questo
 *    strumento possa produrre.
 */
export function circolare(zone) {
  const sospette = (zone || []).filter((z) =>
    typeof z.origine === "string" && /figur|persone|comparse/i.test(z.origine));
  return sospette.length ? sospette.map((z) => z.label || z.id || "?") : null;
}

// ---------------------------------------------------------------------------
// 5. La controprova
// ---------------------------------------------------------------------------

// Entro quanti metri una zona e un capannello «si corrispondono». Non e' una
// soglia di riconoscimento ma una scelta di lettura, e infatti il risultato
// riporta sempre anche le distanze vere, che non dipendono da questo numero.
// Dieci metri e' la scala di una funzione in un edificio pubblico: un banco,
// un varco, un'isola di sedute.
export const RAGGIO = 10;

/**
 * Le zone cadono dove sta la gente?
 *
 * @param {Array} zone   [{ pos:[x,y,z], label, origine }]
 * @param {Array} cose   l'uscita di `veritas_cose.cose().cose`
 * @param {Object} opz   { raggio }
 */
export function controprova(zone, cose, opz = {}) {
  const raggio = opz.raggio != null ? opz.raggio : RAGGIO;

  const viziate = circolare(zone);
  if (viziate) {
    return {
      valida: false,
      perche: "le zone " + viziate.join(", ") + " sono nate dalle figure umane: "
        + "la controprova si verificherebbe da sola e non vale niente",
    };
  }

  const f = figure(cose);
  if (!f.length) {
    return {
      valida: false,
      perche: "in questo modello non ci sono figure umane: manca il termine di "
        + "paragone, e non e' un difetto del modello — semplicemente non si puo' "
        + "fare questa verifica",
    };
  }

  const gruppi = capannelli(f, opz);
  const persone = quantePersone(f);
  if (!zone || !zone.length) {
    return { valida: false, perche: "non ci sono zone da verificare" };
  }

  const dist = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

  // Per ogni zona: il capannello piu' vicino.
  const perZona = zone.map((z) => {
    let vicino = null, d = Infinity;
    for (const g of gruppi) { const q = dist(z.pos, g.centro); if (q < d) { d = q; vicino = g; } }
    // quante persone stanno entro il raggio, di qualunque capannello
    const attorno = gruppi.reduce((s, g) =>
      s + (dist(z.pos, g.centro) <= raggio ? g.persone : 0), 0);
    return {
      zona: z.label || z.id || "?",
      distanza: d,
      persone: attorno,
      sola: attorno === 0,
      guardano: vicino && d <= raggio ? guardanoVerso(vicino.pezzi, z.pos) : null,
    };
  });

  // Per ogni capannello: la zona piu' vicina.
  const perCapannello = gruppi.map((g) => {
    let d = Infinity, quale = null;
    for (const z of zone) { const q = dist(z.pos, g.centro); if (q < d) { d = q; quale = z; } }
    return {
      persone: g.persone,
      centro: g.centro,
      distanza: d,
      zona: quale ? (quale.label || quale.id || "?") : null,
      scoperto: d > raggio,
      sguardo: g.sguardo,
    };
  });

  const zoneConGente = perZona.filter((r) => !r.sola).length;
  const personeCoperte = perCapannello.filter((r) => !r.scoperto)
    .reduce((s, r) => s + r.persone, 0);
  const distanze = perCapannello.map((r) => r.distanza).sort((a, b) => a - b);

  return {
    valida: true,
    raggio,
    persone,
    capannelli: gruppi.length,
    zone: zone.length,
    // Le due misure che contano, e sono diverse fra loro:
    //   una zona senza gente attorno e' una funzione inventata;
    //   della gente senza una zona vicina e' una funzione non vista.
    zoneConGente,
    zoneSole: zone.length - zoneConGente,
    personeCoperte,
    personeScoperte: persone - personeCoperte,
    // Le distanze non dipendono dal raggio scelto: sono il dato solido.
    distanzaMediana: distanze.length ? distanze[Math.floor(distanze.length / 2)] : null,
    distanzaPeggiore: distanze.length ? distanze[distanze.length - 1] : null,
    perZona,
    perCapannello: perCapannello.sort((a, b) => b.persone - a.persone),
  };
}

// ---------------------------------------------------------------------------
// 6. Raccontarlo in italiano
// ---------------------------------------------------------------------------

export function racconta(r) {
  if (!r) return "";
  if (!r.valida) return "Non posso fare la controprova: " + r.perche + ".";

  const pc = r.persone ? Math.round(r.personeCoperte / r.persone * 100) : 0;
  const righe = [];
  righe.push("CONTROPROVA — le zone cadono dove sta la gente?");
  righe.push("");
  righe.push("Nel modello ci sono " + r.persone + " figure umane, radunate in "
    + r.capannelli + (r.capannelli === 1 ? " capannello" : " capannelli") + ".");
  righe.push("");
  righe.push("  " + r.zoneConGente + " zone su " + r.zone + " hanno gente attorno ("
    + r.raggio + " m)");
  righe.push("  " + pc + "% delle persone (" + r.personeCoperte + " su " + r.persone
    + ") ha una zona vicina");
  righe.push("  distanza mediana fra un capannello e la sua zona: "
    + (r.distanzaMediana == null ? "-" : r.distanzaMediana.toFixed(1) + " m"));
  righe.push("  la peggiore: "
    + (r.distanzaPeggiore == null ? "-" : r.distanzaPeggiore.toFixed(1) + " m"));

  const sole = r.perZona.filter((z) => z.sola);
  if (sole.length) {
    righe.push("");
    righe.push("Zone dove non c'e' nessuno — funzioni che il programma ha inventato:");
    for (const z of sole.slice(0, 8))
      righe.push("  - " + z.zona + " (la gente piu' vicina e' a " + z.distanza.toFixed(0) + " m)");
  }

  const persi = r.perCapannello.filter((c) => c.scoperto);
  if (persi.length) {
    righe.push("");
    righe.push("Gente senza una zona vicina — funzioni che il programma non ha visto:");
    for (const c of persi.slice(0, 8))
      righe.push("  - " + c.persone + " persone in (" + c.centro[0].toFixed(0) + ", "
        + c.centro[2].toFixed(0) + "), la zona piu' vicina e' a " + c.distanza.toFixed(0) + " m"
        + (c.sguardo != null && c.sguardo > 0.8 ? " — e guardano tutte dalla stessa parte" : ""));
  }

  const code = r.perCapannello.filter((c) => c.sguardo != null && c.sguardo > 0.8 && c.persone >= 4);
  if (code.length) {
    righe.push("");
    righe.push(code.length + (code.length === 1 ? " gruppo guarda" : " gruppi guardano")
      + " tutto nella stessa direzione: dove succede questo c'e' una coda o una "
      + "platea, non uno spazio di passaggio.");
  }

  return righe.join("\n");
}

export default {
  STATURA, CAPANNELLO, RAGGIO,
  eUnaFigura, figure, quantePersone, capannelli,
  concordanzaSguardi, guardanoVerso, circolare, controprova, racconta,
};
