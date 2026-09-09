// =============================================================================
// veritas_tavole.js — L'ABACO: piante, prospetti, sezioni
// =============================================================================
//
// Raffaella, 08/09/2026: *«a livello di elaborati, per me sa bene anche fare
// piante prospetti e sezioni. Quante? Quanti livelli ci sono? A che altezza si
// fa la pianta? Metti la libreria degli architetti dentro? Tutto il sapere da
// architetto»*. E poi, vista la prova: *«se funzionano devono diventare default
// del programma»*.
//
// PERCHE' ESISTE, ED E' LA DIRETTIVA 21 PORTATA FINO IN FONDO.
// *«Quello che gli dai in pasto all'occhio e' quello che vede»*. Misurato sul
// modello vero l'08/09: della passata in ordine, **sette scatti su tredici non
// contenevano un metro quadro di terminal** — cielo, un'ala, un pontile,
// asfalto. Non e' un problema di vocabolario e non si ripara aggiungendo
// parole: e' che all'occhio non era mai stato mostrato l'edificio per intero.
//
// Una prospettiva mostra quello che capita davanti alla lente. Un abaco di
// piante-prospetti-sezioni copre l'edificio **per costruzione**: e' la
// rappresentazione inventata apposta perche' un edificio si capisca senza
// esserci dentro. Misurato: tutto il livello 1 — 2.759 m2 — in UN disegno,
// contro tredici fotografie di cui sette vuote. E in 4,9 secondi.
//
// ⚠️ IN PROIEZIONE ORTOGONALE LA DIRETTIVA 22 SI RISPETTA DA SOLA. Non c'e'
//    prospettiva, quindi non esiste il soggetto piccolo in mezzo alla finestra:
//    il disegno riempie la tavola per definizione. Non va imposto niente.
//
// ⛔ REGOLA 0-bis: qui non c'e' una sola parola di tipologia. Un abaco si
//    disegna uguale per un aeroporto, una scuola e una chiesa — cambia il
//    contenuto, non la regola.
//
// ⚠️ LE REGOLE NON STANNO QUI: STANNO NEL MANUALE. Quante piante, a che quota
//    si taglia, quanti prospetti, dove passa la sezione, quando una tavola si
//    spezza — sono decisioni d'architettura e si leggono da
//    `MANUALE.disegno`. Questo file sa DISEGNARE, non sa decidere. Se domani si
//    taglia a 1,20 si cambia il manuale, non questo modulo.
//
// 🟠 QUELLO CHE ANCORA NON FA, e va detto invece di lasciarlo credere:
//    · `inquadratura_su: "il costruito"` NON e' implementato. Riconoscere il
//      costruito senza nominare una tipologia vorrebbe dire misurare che cosa
//      e' COPERTO (il manuale: «esterno = sopra non c'e' niente»), e costa
//      raggi. Oggi si inquadra l'ingombro intero. Sul modello dell'aeroporto
//      vuol dire 106,4 m invece di 81,2: un quarto di risoluzione buttato sul
//      piazzale — ma la regola del 6:1 qui sotto lo recupera quasi tutto.
//    · `sezione_passa_per: ["i collegamenti verticali", ...]` e' rispettato a
//      meta': si passa per il **baricentro dell'area calpestabile**, che cade
//      dentro il vano piu' grande. Le scale non sono ancora riconosciute come
//      scale, quindi non si puo' garantire che la sezione le tagli.
// =============================================================================

import { MANUALE } from "./veritas_manuale.js?v=2";

const D = MANUALE.disegno;
const V = MANUALE.visione;

/** Legge un valore dal manuale. Se manca, il disegno non si inventa un numero. */
function regola(chiave, difetto) {
  const v = D && D[chiave];
  return v && v.valore !== undefined ? v.valore : difetto;
}

function nota(m) {
  try { if (typeof console !== "undefined") console.log("[VERITAS tavole] " + m); } catch (e) {}
}

/**
 * Quante tavole servono per un fronte lungo `lunghezza` e alto `altezza`.
 * ⚠️ E' LA REGOLA CHE RIPARA I 16 PIXEL AL METRO. Un prospetto di 81 x 5,9 m
 *    disegnato in una tavola sola ha un rapporto di 13,8:1: a parita' di pixel
 *    spesi l'altezza si riduce a 94 pixel, e sotto i dieci pixel al metro
 *    (manuale, `visione`) una seduta e' una macchia. Spezzandolo in segmenti
 *    IN ORDINE — la passata di Raffaella applicata al disegno — ogni segmento
 *    torna sotto il rapporto e la figura ridiventa leggibile.
 */
export function quantiSegmenti(lunghezza, altezza) {
  const max = regola("rapporto_massimo_di_una_tavola", 6);
  if (!(altezza > 0) || !(lunghezza > 0)) return 1;
  return Math.max(1, Math.ceil((lunghezza / altezza) / max));
}

/** Scatta una figura con la telecamera data. Il modello TORNA sempre dov'era. */
function scatta(THREE, renderer, radice, cam, larghezza, altezza) {
  const bersaglio = new THREE.WebGLRenderTarget(larghezza, altezza, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
    colorSpace: THREE.SRGBColorSpace || undefined,
  });
  const scena = new THREE.Scene();
  scena.background = null;
  // Luce propria: un disegno deve leggersi anche se la scena della pagina ha
  // le luci spente o di scena. Emisferica per la forma, direzionale per lo
  // spessore — senza ombra un prospetto e' una sagoma.
  scena.add(new THREE.HemisphereLight(0xffffff, 0x8a8a8a, 2.4));
  const sole = new THREE.DirectionalLight(0xffffff, 1.5);
  sole.position.set(0.6, 1, 0.4);
  scena.add(sole);

  const genitore = radice.parent;
  const indice = genitore ? genitore.children.indexOf(radice) : -1;
  const pixel = new Uint8Array(larghezza * altezza * 4);
  try {
    scena.add(radice);
    const prec = renderer.getRenderTarget();
    renderer.setRenderTarget(bersaglio);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scena, cam);
    renderer.readRenderTargetPixels(bersaglio, 0, 0, larghezza, altezza, pixel);
    renderer.setRenderTarget(prec);
  } finally {
    // ⚠️ IL MODELLO E' QUELLO CHE L'UTENTE STA GUARDANDO. Lasciarlo nella scena
    //    di servizio lo fa sparire dallo schermo: e' il guasto piu' facile da
    //    fare qui dentro, e non da' nessun errore.
    scena.remove(radice);
    if (genitore) {
      if (indice >= 0) genitore.children.splice(indice, 0, radice);
      else genitore.children.push(radice);
      radice.parent = genitore;
    }
    bersaglio.dispose();
  }
  // ⚠️ SI RADDRIZZA QUI, ALLA FONTE, come negli scorci: `readRenderTargetPixels`
  //    consegna la riga 0 in fondo, e un modello che guarda un edificio a testa
  //    in giu' risponde una cosa plausibile e sbagliata.
  const dritto = new Uint8Array(pixel.length), riga = larghezza * 4;
  for (let y = 0; y < altezza; y++)
    dritto.set(pixel.subarray((altezza - 1 - y) * riga, (altezza - y) * riga), y * riga);
  return dritto;
}

// Il filo d'aria attorno alla tavola. Sta qui, in un posto solo, perche' lo
// usano in due: chi punta la telecamera e chi dichiara dove sta a terra. Due
// copie di questo numero sono due tavole che non combaciano.
const ARIA = 1.04;

/** Telecamera ortogonale centrata sulla propria posizione. */
function ortogonale(THREE, posizione, direzione, alto, larghezzaMondo, altezzaMondo, vicino, lontano) {
  const m = ARIA;                                  // un filo d'aria attorno
  const cam = new THREE.OrthographicCamera(
    -larghezzaMondo / 2 * m, larghezzaMondo / 2 * m,
    altezzaMondo / 2 * m, -altezzaMondo / 2 * m, vicino, lontano);
  cam.position.copy(posizione);
  cam.up.copy(alto);
  cam.lookAt(posizione.clone().add(direzione));
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
  return cam;
}

/** Una tavola: sceglie i pixel in modo che il lato lungo sia `lato`. */
function tavola(THREE, renderer, radice, opts) {
  const lato = opts.lato || 1300;
  const w = opts.larghezzaMondo, h = opts.altezzaMondo;
  if (!(w > 0) || !(h > 0)) return null;
  const W = Math.max(8, Math.round(w >= h ? lato : lato * w / h));
  const H = Math.max(8, Math.round(w >= h ? lato * h / w : lato));
  const cam = ortogonale(THREE, opts.posizione, opts.direzione, opts.alto, w, h, opts.vicino, opts.lontano);
  return {
    genere: opts.genere, etichetta: opts.etichetta,
    larghezza: W, altezza: H, pixelPerMetro: W / w,
    // ⚠️ DOVE STA A TERRA — aggiunto il 09/09/2026, ed e' la riga che mancava.
    //    Una pianta e' una proiezione ortogonale dall'alto: ogni pixel ha il
    //    suo corrispondente a terra, esattamente come la pianta del pavimento.
    //    Finche' questo campo non c'era, l'occhio riconosceva i banchi nella
    //    pianta del livello 1 e non gli era PERMESSO dire dove fossero: la
    //    tavola viaggiava nella fila degli scorci, e da uno scorcio — per la
    //    regola giusta del 26/08 — la posizione si butta.
    //    ⛔ Prospetti e sezioni non hanno questo campo, e su di loro la regola
    //    del 26/08 resta in piedi: da una proiezione verticale un punto a terra
    //    non si ricava, e qui non si finge di ricavarlo.
    //    ⚠️ Il rettangolo e' quello VERO della telecamera, filo d'aria
    //    compreso: `pixelPerMetro` qui sopra dichiara W/w e il margine lo
    //    ignora — un 4% che sulle posizioni si sente.
    inquadratura: (opts.genere === "pianta" && opts.posizione) ? {
      larghezza: W, altezza: H,
      metriPerPixel: (w * ARIA) / W,
      origine: [opts.posizione.x - (w * ARIA) / 2,
                opts.posizione.z - (h * ARIA) / 2],
    } : null,
    pixel: scatta(THREE, renderer, radice, cam, W, H),
  };
}

/**
 * L'ABACO. Piante (una per livello), prospetti (i quattro fronti), sezioni
 * (una per asse principale), tutte in proiezione ortogonale.
 *
 * @param {Array} opzioni.livelli  i livelli misurati; se mancano si usa
 *                                 `window.__veritasPercezione.levels`
 * @param {Array} opzioni.ambienti gli ambienti misurati: servono a trovare il
 *                                 baricentro del calpestabile per le sezioni
 */
export function abaco(THREE, renderer, radice, opzioni = {}) {
  if (!THREE || !renderer || !radice) return [];
  radice.updateMatrixWorld(true);
  const scatola = new THREE.Box3().setFromObject(radice);
  if (scatola.isEmpty()) { nota("nessun ingombro: non c'e' niente da disegnare"); return []; }

  const centro = scatola.getCenter(new THREE.Vector3());
  const misura = scatola.getSize(new THREE.Vector3());
  const lato = opzioni.lato || 1300;
  const su = new THREE.Vector3(0, 1, 0);

  const P = (typeof window !== "undefined" && window.__veritasPercezione) || {};
  const livelli = opzioni.livelli || P.levels || [];
  const ambienti = (opzioni.ambienti || P.zones || []).filter((z) => z && (z.areaM2 || 0) > 0);

  // Il baricentro del calpestabile: e' li' che passano le sezioni. Pesato
  // sull'area, quindi cade dentro il vano piu' grande — che e' meta' della
  // regola `sezione_passa_per` del manuale.
  let bx = centro.x, bz = centro.z;
  if (ambienti.length) {
    let a = 0, sx = 0, sz = 0;
    for (const z of ambienti) { a += z.areaM2; sx += z.centroidX * z.areaM2; sz += z.centroidZ * z.areaM2; }
    if (a > 0) { bx = sx / a; bz = sz / a; }
  }

  const fuori = [];
  const quota = regola("quota_taglio_pianta_m", 1.10);

  // --- LE PIANTE: una per livello, tagliate a 1,10 m sopra il pavimento -----
  // La telecamera sta ALLA quota di taglio e guarda in giu': tutto quello che
  // sta piu' in alto — soffitti, coperture, aerei — finisce dietro di lei e non
  // copre il pavimento. E' la stessa idea della pianta del pavimento, applicata
  // a ogni livello invece che a uno solo.
  if (regola("una_pianta_per_livello", true) && livelli.length) {
    livelli.forEach((l, i) => {
      const pav = typeof l.levelY === "number" ? l.levelY : scatola.min.y;
      const y = pav + quota;
      const t = tavola(THREE, renderer, radice, {
        genere: "pianta", lato,
        etichetta: "PIANTA livello " + (i + 1) + " di " + livelli.length
          + " — taglio a " + quota.toFixed(2).replace(".", ",") + " m sopra quota "
          + pav.toFixed(2).replace(".", ",") + " m"
          + (l.navigableAreaM2 ? " (" + Math.round(l.navigableAreaM2) + " m2 calpestabili)" : ""),
        posizione: new THREE.Vector3(centro.x, y, centro.z),
        direzione: new THREE.Vector3(0, -1, 0),
        alto: new THREE.Vector3(0, 0, -1),
        larghezzaMondo: misura.x, altezzaMondo: misura.z,
        vicino: 0.001, lontano: Math.max(0.5, y - scatola.min.y) + 1,
      });
      if (t) fuori.push(t);
    });
  } else {
    nota("nessun livello misurato: niente piante. Non e' che non c'erano piani, e' che non li ho.");
  }

  // --- I PROSPETTI: i quattro fronti, spezzati se troppo lunghi -------------
  const fronti = [
    ["nord",  new THREE.Vector3(0, 0, -1), "x", scatola.max.z + 1],
    ["sud",   new THREE.Vector3(0, 0,  1), "x", scatola.min.z - 1],
    ["est",   new THREE.Vector3(-1, 0, 0), "z", scatola.max.x + 1],
    ["ovest", new THREE.Vector3( 1, 0, 0), "z", scatola.min.x - 1],
  ];
  const quanti = regola("prospetti_minimi", 4);
  fronti.slice(0, quanti).forEach(([nome, dir, asse, fuoriQuota]) => {
    const lungo = asse === "x" ? misura.x : misura.z;
    const profondo = asse === "x" ? misura.z : misura.x;
    const n = quantiSegmenti(lungo, misura.y);
    const passo = lungo / n;
    const da = asse === "x" ? scatola.min.x : scatola.min.z;
    for (let i = 0; i < n; i++) {
      const mezzo = da + passo * (i + 0.5);
      const pos = asse === "x"
        ? new THREE.Vector3(mezzo, centro.y, fuoriQuota)
        : new THREE.Vector3(fuoriQuota, centro.y, mezzo);
      const t = tavola(THREE, renderer, radice, {
        genere: "prospetto", lato,
        etichetta: "PROSPETTO " + nome + (n > 1 ? " — segmento " + (i + 1) + " di " + n
          + ", dal metro " + Math.round(passo * i) + " al metro " + Math.round(passo * (i + 1)) : ""),
        posizione: pos, direzione: dir, alto: su,
        larghezzaMondo: passo, altezzaMondo: misura.y,
        vicino: 0.001, lontano: profondo + 2,
      });
      if (t) fuori.push(t);
    }
  });

  // --- LE SEZIONI: una per asse, e la telecamera sta SUL piano di taglio ----
  // ⚠️ E' lo stesso trucco della pianta, girato in verticale: mettendo la
  //    telecamera esattamente sul taglio, tutto quello che sta di qua finisce
  //    dietro di lei. Una sezione e' un prospetto la cui telecamera e' entrata
  //    dentro l'edificio.
  if (regola("sezioni_minime", 2) >= 1) {
    const sezioni = [
      ["longitudinale", new THREE.Vector3(centro.x, centro.y, bz), new THREE.Vector3(0, 0, -1),
       misura.x, (bz - scatola.min.z) + 2, "z=" + bz.toFixed(1)],
      ["trasversale",   new THREE.Vector3(bx, centro.y, centro.z), new THREE.Vector3(-1, 0, 0),
       misura.z, (bx - scatola.min.x) + 2, "x=" + bx.toFixed(1)],
    ];
    for (const [nome, pos, dir, largo, lontano, dove] of sezioni) {
      const n = quantiSegmenti(largo, misura.y);
      const passo = largo / n;
      const da = nome === "longitudinale" ? scatola.min.x : scatola.min.z;
      for (let i = 0; i < n; i++) {
        const mezzo = da + passo * (i + 0.5);
        const p = nome === "longitudinale"
          ? new THREE.Vector3(mezzo, centro.y, pos.z)
          : new THREE.Vector3(pos.x, centro.y, mezzo);
        const t = tavola(THREE, renderer, radice, {
          genere: "sezione", lato,
          etichetta: "SEZIONE " + nome + " — taglio sul baricentro del calpestabile, " + dove
            + (n > 1 ? ", segmento " + (i + 1) + " di " + n : ""),
          posizione: p, direzione: dir, alto: su,
          larghezzaMondo: passo, altezzaMondo: misura.y,
          vicino: 0.001, lontano: lontano,
        });
        if (t) fuori.push(t);
      }
    }
  }

  // Il referto: quante tavole, quanto sono fitte, e se qualcuna resta sotto la
  // soglia sotto la quale un arredo non si vede. Un numero brutto detto e' un
  // numero che si puo' riparare; taciuto, diventa una conclusione sbagliata.
  const fitto = fuori.map((t) => t.pixelPerMetro);
  const soglia = (V.pixel_per_metro_minimo_arredo || {}).valore || 10;
  const scarse = fuori.filter((t) => t.pixelPerMetro < soglia);
  nota(fuori.length + " tavole — "
    + fuori.filter((t) => t.genere === "pianta").length + " piante, "
    + fuori.filter((t) => t.genere === "prospetto").length + " prospetti, "
    + fuori.filter((t) => t.genere === "sezione").length + " sezioni — da "
    + Math.round(Math.min.apply(null, fitto)) + " a " + Math.round(Math.max.apply(null, fitto))
    + " pixel al metro"
    + (scarse.length ? " ⚠️ " + scarse.length + " sotto i " + soglia + " px/m: li' l'arredo e' una macchia"
                     : " — tutte sopra i " + soglia + " px/m"));
  return fuori;
}

if (typeof window !== "undefined") {
  window.__veritasTavole = { abaco, quantiSegmenti };
}
