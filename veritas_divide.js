// =============================================================================
// veritas_divide.js — DIVIDERE PER FUNZIONE, NON PER MURI
// =============================================================================
//
// Raffaella, 08/09/2026: *«dopo aver visto l'architettura, deve guardare gli
// indizi, che sono gli oggetti che stanno dentro — comprese le frecce, comprese
// le sedie, compresi i metal detector — riconoscerli e dedurre»*.
//
// IL GUASTO CHE RIPARA, misurato sul modello vero l'08/09.
// Il misuratore separa le stanze DOVE TROVA I MURI. In un terminal fra
// accettazione, controlli e lounge **i muri non ci sono**: sono divisi dalla
// funzione, non da un tramezzo. Risultato misurato: **una stanza da 2.759 m2,
// cioe' l'82% del calpestabile**, piu' otto ritagli da 7 a 39 m2. E il cervello,
// a cui si chiede «che stanza e' questa?» indicandogli l'82% dell'aeroporto,
// risponde **«Aeroporto internazionale»** — che e' la risposta GIUSTA a una
// domanda sbagliata.
//
// ⛔ FINCHE' LO SPAZIO NON E' DIVISO NON C'E' NIENTE DA NOMINARE, e nessun
//    modello piu' grosso lo ripara: darebbe un nome piu' elegante alla stessa
//    stanza unica.
//
// COME SI DIVIDE SENZA MURI, E SENZA NOMINARE NIENTE.
// L'indizio non e' il NOME dell'oggetto: e' la sua QUOTA, la sua RIPETIZIONE e
// dove sta. Un posto a sedere e' un piano orizzontale a 0,45 m ripetuto in file.
// Un banco e' un piano a 0,90-1,10 m allineato, con lo spazio libero davanti.
// Un metal detector e' un oggetto alto due metri, stretto, in fila con altri.
// **Tutti e tre si trovano MISURANDO, senza sapere come si chiamano** — ed e'
// per questo che la regola 0-bis regge: qui non c'e' la parola «aeroporto», e
// non c'e' nemmeno «sedia». C'e' «un piano orizzontale a 0,45 m ripetuto».
//
// ⚠️ LE QUOTE NON STANNO QUI: STANNO NEL MANUALE. `arredo.seduta_m`,
//    `arredo.banco_m`, `corpo.altezza_libera_m`, e le firme di
//    `comportamenti`. Se domani un banco si misura diverso, si cambia il
//    manuale — non questo file.
//
// ⚠️ E OGNI CAMPO PORTA LA SUA PROVA. Non basta dire «qui c'e' una sosta»: si
//    dice **quanti oggetti, a che quota, su quanti metri quadri**. Una
//    divisione senza la prova e' un'opinione con l'aria di una misura.
// =============================================================================

import { MANUALE } from "./veritas_manuale.js?v=2";

const A = MANUALE.arredo;
const C = MANUALE.corpo;
const CO = MANUALE.comportamenti;

function fascia(voce, difetto) {
  const v = A[voce];
  return v && Array.isArray(v.valore) ? v.valore : difetto;
}

function nota(m) {
  try { if (typeof console !== "undefined") console.log("[VERITAS divide] " + m); } catch (e) {}
}

// Le tre famiglie di indizio. Sono QUOTE, non nomi.
// ⚠️ `sedersi` e `appoggiarsi` si sovrappongono a 0,85: un oggetto alto
//    esattamente 0,85 puo' essere l'uno o l'altro, e va bene cosi' — la
//    ripetizione e l'allineamento decidono, non il centimetro.
// ⚠️ LA PERSONA VA DISTINTA DAL METAL DETECTOR, E LA PRIMA PROVA NON LA
//    DISTINGUEVA. Misurato sul modello vero l'08/09: senza la famiglia
//    `persona`, 267 figure umane in fila diventavano UN filtro da 199 m2 — e un
//    filtro grande 199 m2 non e' un filtro. Sono geometricamente parenti (alti
//    circa due metri, stretti), e si separano su una misura sola che sta gia'
//    nel manuale: **la spalla**. Una persona e' larga quanto un'ellisse
//    corporea ed e' slanciata; un varco controllato e' piu' largo e piu' tozzo.
//
// ⚠️ E LE PERSONE NON SONO RUMORE: SONO LA PROVA. Il manuale dice che
//    un'accoglienza e un filtro hanno la **coda a monte**. Un mucchio fitto di
//    persone ferme E' quella coda, e vale come indizio quanto un bancone.
function famigliaDi(altezzaSopraPavimento, ingombro) {
  const seduta = fascia("seduta_m", [0.35, 0.85]);
  const banco = fascia("banco_m", [0.85, 1.60]);
  const spalle = (C.ellisse_spalle_m || {}).valore || 0.61;
  const h = altezzaSopraPavimento;
  const impronta = ingombro.x * ingombro.z;
  const largo = Math.max(ingombro.x, ingombro.z);

  if (h >= 1.4 && h <= 2.1 && largo <= spalle * 1.6 && h / Math.max(largo, 0.01) >= 2.2)
    return "persona";
  if (h >= 1.7 && h <= 2.6 && largo > spalle * 1.6 && largo < 2.2) return "varco";
  if (h >= seduta[0] && h <= seduta[1] && impronta < 4) return "sedersi";
  if (h > banco[0] && h <= banco[1] && impronta < 12) return "appoggiarsi";
  return null;
}

/**
 * Divide lo spazio in CAMPI di funzione, leggendo gli oggetti come indizi.
 *
 * @param {Object} opzioni.pavimento  quota del pavimento del livello (m)
 * @param {number} opzioni.passo      lato della cella con cui si raggruppa (m)
 * @param {number} opzioni.minimo     quanti oggetti servono per fare un campo
 * @returns {{campi: Array, scartati: Object, prova: string}}
 */
export function dividiPerFunzione(THREE, radice, opzioni = {}) {
  if (!THREE || !radice) return { campi: [], scartati: {}, prova: "niente da dividere" };
  radice.updateMatrixWorld(true);

  const scatola = new THREE.Box3().setFromObject(radice);
  const pavimento = opzioni.pavimento != null ? opzioni.pavimento : scatola.min.y;
  const passo = opzioni.passo || 2.0;
  const minimo = opzioni.minimo || 4;

  // --- 1. GLI OGGETTI, LETTI COME QUOTE ------------------------------------
  // ⚠️ Si scartano le cose troppo grandi per essere un oggetto: un muro, un
  //    solaio, una copertura. Il criterio non e' il nome ma la taglia — un
  //    arredo piu' grande di una stanza non e' un arredo. Cosi' vale su
  //    qualunque modello, anche uno in cui le mesh si chiamano `Part_0012`.
  const tetto = opzioni.ingombroMassimo || 30;   // m2 di impronta
  const indizi = [];
  const scartati = { grandi: 0, fuoriQuota: 0, senzaGeometria: 0 };
  const b = new THREE.Box3(), dim = new THREE.Vector3(), cen = new THREE.Vector3();

  // ⚠️ UN LIVELLO ALLA VOLTA. Senza questa banda, l'arredo del soppalco viene
  //    misurato rispetto al pavimento di sotto e finisce fra i «varchi alti due
  //    metri»: un piano intero diventa un filtro. La banda e' l'altezza in cui
  //    puo' stare l'arredo di QUEL piano, e sopra c'e' il piano dopo.
  const banda = opzioni.banda || 3.0;
  radice.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    b.setFromObject(o);
    if (b.isEmpty()) { scartati.senzaGeometria++; return; }
    b.getSize(dim); b.getCenter(cen);
    if (dim.x * dim.z > tetto) { scartati.grandi++; return; }
    const appoggio = b.min.y - pavimento;
    if (appoggio < -0.4 || appoggio > banda) { scartati.altroPiano = (scartati.altroPiano || 0) + 1; return; }
    const h = b.max.y - pavimento;
    const fam = famigliaDi(h, dim);
    if (!fam) { scartati.fuoriQuota++; return; }
    indizi.push({ fam, x: cen.x, z: cen.z, h: h });
  });

  if (!indizi.length) {
    nota("nessun oggetto alla quota di un arredo: non e' che non ci fossero stanze, e' che non ci sono indizi");
    return { campi: [], scartati, prova: "nessun indizio" };
  }

  // --- 2. I CAMPI: oggetti della stessa famiglia che si toccano ------------
  // Griglia grossa e componenti connesse. Non serve di piu': un campo di
  // sedute e' fatto di oggetti a meno di due metri l'uno dall'altro, e due
  // campi diversi sono separati da un corridoio, che due metri li supera.
  const campi = [];
  for (const fam of ["sedersi", "appoggiarsi", "varco", "persona"]) {
    const miei = indizi.filter((i) => i.fam === fam);
    if (miei.length < minimo) continue;
    const celle = new Map();
    for (const i of miei) {
      const k = Math.floor(i.x / passo) + "|" + Math.floor(i.z / passo);
      if (!celle.has(k)) celle.set(k, []);
      celle.get(k).push(i);
    }
    const visti = new Set();
    for (const k of celle.keys()) {
      if (visti.has(k)) continue;
      const coda = [k]; visti.add(k);
      const dentro = [];
      while (coda.length) {
        const c = coda.pop();
        const l = celle.get(c) || [];
        for (const i of l) dentro.push(i);
        const [cx, cz] = c.split("|").map(Number);
        for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
          const v = (cx + dx) + "|" + (cz + dz);
          if (celle.has(v) && !visti.has(v)) { visti.add(v); coda.push(v); }
        }
      }
      if (dentro.length < minimo) continue;
      const n = dentro.length;
      let sx = 0, sz = 0, sh = 0, minx = Infinity, maxx = -Infinity, minz = Infinity, maxz = -Infinity;
      for (const i of dentro) {
        sx += i.x; sz += i.z; sh += i.h;
        if (i.x < minx) minx = i.x; if (i.x > maxx) maxx = i.x;
        if (i.z < minz) minz = i.z; if (i.z > maxz) maxz = i.z;
      }
      const larghezza = Math.max(passo, maxx - minx), profondita = Math.max(passo, maxz - minz);
      const lungo = Math.max(larghezza, profondita), corto = Math.min(larghezza, profondita);
      campi.push({
        famiglia: fam, oggetti: n,
        centroX: sx / n, centroZ: sz / n, quotaMedia: sh / n,
        larghezza: larghezza, profondita: profondita,
        areaM2: larghezza * profondita, allungamento: lungo / corto,
        densita: n / (larghezza * profondita),
      });
    }
  }

  // --- 3. DA CAMPO A COMPORTAMENTO ----------------------------------------
  // ⚠️ La regola la porta il manuale (`comportamenti`), non questo file: un
  //    filtro e' stretto e lungo, una sosta ha gli oggetti bassi e non ci si
  //    passa attraverso, un'accoglienza ha il piano all'altezza del gomito.
  const lungoStretto = (CO.filtro || {}).rapporto_lunghezza_larghezza_min || 2;
  // La densita' che separa una coda da gente che passa: e' il livello di
  // servizio in attesa del manuale (Fruin), non un numero scelto qui.
  const coda = (MANUALE.deflusso.densita_coda_m2_persona || {}).valore || [0.2, 1.2];
  const fitta = 1 / coda[1];                       // ~0,83 persone al m2
  for (const c of campi) {
    if (c.famiglia === "varco") c.comportamento = "filtro";
    else if (c.famiglia === "persona")
      c.comportamento = c.densita >= fitta ? "coda" : "passaggio di gente";
    else if (c.famiglia === "appoggiarsi")
      c.comportamento = c.allungamento >= lungoStretto ? "accoglienza" : "servizio";
    else c.comportamento = "sosta";
    c.prova = c.oggetti + (c.famiglia === "persona" ? " persone" : " oggetti col piano")
      + " a " + c.quotaMedia.toFixed(2).replace(".", ",")
      + " m, su " + Math.round(c.areaM2) + " m2"
      + (c.famiglia === "persona" ? " (" + c.densita.toFixed(2).replace(".", ",") + " al m2)" : "")
      + (c.allungamento >= lungoStretto ? ", in fila (" + c.allungamento.toFixed(1) + ":1)" : "");
  }

  campi.sort((a, b2) => b2.areaM2 - a.areaM2);

  const per = {};
  for (const c of campi) per[c.comportamento] = (per[c.comportamento] || 0) + 1;
  const riassunto = Object.keys(per).map((k) => per[k] + " " + k).join(", ") || "nessuno";
  nota(campi.length + " campi di funzione da " + indizi.length + " oggetti letti come indizi — "
    + riassunto + " · scartati: " + scartati.grandi + " troppo grandi per essere arredo, "
    + scartati.fuoriQuota + " fuori dalle quote del manuale");
  for (const c of campi.slice(0, 8))
    nota("  " + c.comportamento + " — " + c.prova);

  return { campi, scartati, indizi: indizi.length, prova: riassunto };
}

/**
 * IL COLLEGAMENTO. Sostituisce la stanza che non e' una stanza con i campi di
 * funzione che ci stanno dentro.
 *
 * ⚠️ QUANDO SCATTA, E NON E' UNA PAROLA DI TIPOLOGIA. Scatta quando un solo
 *    ambiente misurato si prende una fetta enorme del calpestabile: sotto quel
 *    numero e' una stanza grande, sopra non e' piu' una stanza, e' l'edificio.
 *    Misurato sul terminal: 2.759 m2 su 3.364, cioe' l'82%.
 *
 * ⚠️ E SE NON C'E' NIENTE DA DIVIDERE, NON DIVIDE. Su un edificio con i muri —
 *    una scuola, un ospedale, un convento — nessun ambiente arriva alla soglia
 *    e le zone restano quelle misurate. La divisione per funzione serve dove i
 *    muri non ci sono, e si accende da sola solo li'.
 *
 * @param {Array} zone      gli ambienti misurati
 * @param {Object} radice   il modello
 * @param {Array} livelli   i livelli misurati (per il pavimento di ciascuno)
 * @returns {Array} le zone, con quella dominante sostituita dai suoi campi
 */
export function dividiZoneGrandi(THREE, zone, radice, livelli, opzioni = {}) {
  if (!THREE || !radice || !Array.isArray(zone) || !zone.length) return zone;
  const soglia = opzioni.soglia || 0.40;
  const quanti = opzioni.massimoCampi || 12;
  const totale = zone.reduce((s, z) => s + (z.areaM2 || 0), 0);
  if (!(totale > 0)) return zone;

  const dominanti = zone.filter((z) => (z.areaM2 || 0) / totale >= soglia);
  if (!dominanti.length) {
    nota("nessun ambiente si prende piu' del " + Math.round(soglia * 100)
      + "% del calpestabile: i muri ci sono, non c'e' niente da dividere");
    return zone;
  }

  const fuori = [];
  for (const z of zone) {
    if (dominanti.indexOf(z) < 0) { fuori.push(z); continue; }

    // Il pavimento di QUESTO ambiente: la quota del suo livello.
    let pav = z.y != null ? z.y : 0;
    if (Array.isArray(livelli) && livelli.length) {
      let vicino = livelli[0];
      for (const l of livelli)
        if (Math.abs((l.levelY || 0) - pav) < Math.abs((vicino.levelY || 0) - pav)) vicino = l;
      pav = vicino.levelY != null ? vicino.levelY : pav;
    }

    const esito = dividiPerFunzione(THREE, radice, Object.assign({ pavimento: pav }, opzioni));
    const campi = (esito.campi || []).slice(0, quanti);
    if (campi.length < 2) {
      nota("l'ambiente da " + Math.round(z.areaM2) + " m2 vale il "
        + Math.round(100 * z.areaM2 / totale) + "% del calpestabile, ma dentro non ci sono"
        + " abbastanza indizi per dividerlo: lo lascio com'e'");
      fuori.push(z);
      continue;
    }

    // ⚠️ L'AREA NON SI INVENTA. I campi coprono solo la parte arredata: il
    //    resto dell'ambiente e' pavimento libero, e resta un ambiente suo. Cosi'
    //    la somma non cresce e il referto non racconta metri quadri che non ci
    //    sono.
    let coperta = 0;
    for (const c of campi) coperta += c.areaM2;
    const libera = Math.max(0, (z.areaM2 || 0) - coperta);

    for (const c of campi) {
      fuori.push({
        label: null, areaM2: c.areaM2,
        centroidX: c.centroX, centroidZ: c.centroZ, y: pav,
        maxClearanceM: z.maxClearanceM, floorIdx: z.floorIdx,
        kind: c.comportamento, comportamento: c.comportamento,
        prova: c.prova, daDivisione: true,
      });
    }
    if (libera > 0) {
      fuori.push(Object.assign({}, z, {
        areaM2: libera, kind: "distribuzione", comportamento: "distribuzione",
        prova: "quello che resta dell'ambiente da " + Math.round(z.areaM2)
          + " m2 una volta tolti i " + campi.length + " campi arredati: pavimento libero,"
          + " cioe' dove si cammina", daDivisione: true,
      }));
    }
    nota("l'ambiente da " + Math.round(z.areaM2) + " m2 (il "
      + Math.round(100 * z.areaM2 / totale) + "% del calpestabile) non e' una stanza:"
      + " lo sostituisco con " + campi.length + " campi di funzione + "
      + Math.round(libera) + " m2 di pavimento libero");
  }
  return fuori;
}

if (typeof window !== "undefined") {
  window.__veritasDivide = { dividiPerFunzione, dividiZoneGrandi };
}
