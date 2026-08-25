// veritas_vista.js — la VISTA: guardare il modello invece di leggerne i dati.
//
// IL PROBLEMA CHE RISOLVE
// Ogni tecnico imposta il 3D a modo suo. Nomi diversi, layer diversi, e
// soprattutto il colore puo' stare in posti completamente diversi:
//
//   material.color        un colore piatto per mesh
//   baseColorTexture      un'immagine, e il colore piatto e' bianco
//   attributo color       colori per vertice
//   texture atlas         tutto il pavimento e' UNA mesh, e le frecce stanno
//                         dipinte dentro un'unica immagine
//   gaussiane             il colore e' un'armonica sferica
//
// Leggere material.color copre SOLO il primo caso. Misurato sul modello di
// prova: 89 materiali, di cui 33 con texture - su quelli si legge bianco, cioe'
// niente. Non e' un difetto da correggere con piu' casi particolari: e' che
// leggere la struttura dati significa leggere le abitudini di chi ha
// modellato, e quelle non sono standardizzabili.
//
// LA SOLUZIONE: GUARDARE
// Si mette una telecamera ortografica appena sopra il pavimento, rivolta in
// giu', e si legge l'immagine. I pixel sono identici qualunque sia l'origine
// del colore, perche' e' il renderer a risolverla - esattamente come farebbe
// l'occhio di chi apre il file. Nessuna convenzione, nessun nome, nessuna
// ipotesi su come e' fatto il file.
//
// DUE ACCORGIMENTI CHE FANNO LA DIFFERENZA
//
// 1. La telecamera sta APPENA SOPRA il pavimento, non in cielo. Cosi' soffitti,
//    coperture, mezzanini e aerei restano DIETRO l'obiettivo e non coprono
//    niente. E' il motivo per cui questo funziona anche in un terminal chiuso,
//    dove una vista dall'alto vedrebbe solo il tetto.
//
// 2. I materiali vengono sostituiti con equivalenti NON illuminati, che
//    conservano texture e colore. Serve la tinta della vernice, non la tinta
//    della vernice piu' l'ombra: senza questo una freccia in ombra e una
//    piastrella al sole diventano due colori diversi, e il raggruppamento per
//    tinta perde senso.

// ---------------------------------------------------------------------------
// Geometria della pianta — logica pura, senza three, testabile in node
// ---------------------------------------------------------------------------

/**
 * Decide risoluzione e inquadratura di una pianta ortografica.
 *
 * @param {{min:number[],max:number[]}} ingombro  in metri, mondo
 * @param {number} metriPerPixel  quanto misura un pixel a terra
 * @param {number} latoMax        tetto alla dimensione dell'immagine
 */
export function inquadratura(ingombro, metriPerPixel = 0.05, latoMax = 2048) {
  const largoM = ingombro.max[0] - ingombro.min[0];
  const profM = ingombro.max[2] - ingombro.min[2];
  if (!(largoM > 0) || !(profM > 0)) return null;
  let mpp = metriPerPixel;
  // Se al passo richiesto l'immagine sfonda il tetto, si allarga il passo:
  // meglio una pianta piu' grossolana che una troncata, che perderebbe pezzi
  // di edificio senza dirlo.
  const necessario = Math.max(largoM, profM) / latoMax;
  if (mpp < necessario) mpp = necessario;
  return {
    larghezza: Math.max(1, Math.round(largoM / mpp)),
    altezza: Math.max(1, Math.round(profM / mpp)),
    metriPerPixel: mpp,
    // angolo del mondo che corrisponde al pixel (0,0)
    origine: [ingombro.min[0], ingombro.min[2]],
  };
}

/** Da pixel a coordinate del mondo (centro del pixel). */
export function pixelAMondo(inq, px, py) {
  return [
    inq.origine[0] + (px + 0.5) * inq.metriPerPixel,
    inq.origine[1] + (py + 0.5) * inq.metriPerPixel,
  ];
}

/** Da coordinate del mondo a pixel. Null se cade fuori. */
export function mondoAPixel(inq, x, z) {
  const px = Math.floor((x - inq.origine[0]) / inq.metriPerPixel);
  const py = Math.floor((z - inq.origine[1]) / inq.metriPerPixel);
  if (px < 0 || py < 0 || px >= inq.larghezza || py >= inq.altezza) return null;
  return [px, py];
}

/**
 * Rimette le righe nell'ordine che si aspetta una tela: la prima riga in cima.
 * Logica pura, provabile in node.
 */
export function raddrizza(pixel, larghezza, altezza) {
  const fuori = new Uint8Array(pixel.length);
  const riga = larghezza * 4;
  for (let y = 0; y < altezza; y++) {
    fuori.set(pixel.subarray((altezza - 1 - y) * riga, (altezza - y) * riga), y * riga);
  }
  return fuori;
}

/** Area a terra di un pixel, in m². Serve a convertire i conteggi in misure. */
export function areaPixel(inq) {
  return inq.metriPerPixel * inq.metriPerPixel;
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Quanti scorci servono — cresce con la complessità del modello, non fisso
// ---------------------------------------------------------------------------

/**
 * Densita' di mesh sulla pianta: quante mesh distinte per m2 di ingombro.
 *
 * Perche' questa e non altro: e' esattamente il caso che ha bloccato il primo
 * giro (banco, sedute, muretto - tre oggetti diversi sulla stessa impronta a
 * terra) e non richiede nulla che il resto del file non calcoli gia'
 * (bounding box). Un container vuoto ha densita' bassa; un terminal pieno di
 * arredi ravvicinati ce l'ha alta.
 */
export function densitaMesh(numeroMesh, ingombro) {
  const largoM = ingombro.max[0] - ingombro.min[0];
  const profM = ingombro.max[2] - ingombro.min[2];
  const area = Math.max(1, largoM * profM);
  return numeroMesh / area;
}

/**
 * Da densita' a numero di scorci a tre quarti.
 *
 * Logica pura, testabile in node. I due capi non sono arbitrari: sotto 4 non
 * si gira davvero il modello fra le mani (resta sempre un lato cieco); sopra
 * 9 il costo verso il cervello cresce senza che l'occhio impari qualcosa di
 * nuovo, perche' dopo il quarto-quinto lato le facce iniziano a ripetersi.
 * Le due soglie di densita' sono una prima taratura, non una misura: vanno
 * riviste guardando il pannello su modelli reali di complessita' diversa.
 */
export function numeroScorci(densita) {
  const MIN = 4, MAX = 9;
  const D_BASSA = 0.02, D_ALTA = 0.30;
  const d = densita || 0;
  const t = Math.max(0, Math.min(1, (d - D_BASSA) / (D_ALTA - D_BASSA)));
  return Math.round(MIN + t * (MAX - MIN));
}

// La resa vera e propria — richiede three e un renderer
// ---------------------------------------------------------------------------

/**
 * Sostituisce i materiali con equivalenti non illuminati, conservando texture
 * e colore. Restituisce la funzione per rimettere tutto com'era.
 *
 * Va rimesso SEMPRE, anche se la resa fallisce: sono i materiali del modello
 * che l'utente sta guardando, non una copia.
 */
function spegniLuci(THREE, radice) {
  const originali = [];
  radice.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    originali.push([o, o.material]);
    const piatti = mats.map((m) => {
      const b = new THREE.MeshBasicMaterial({
        color: m && m.color ? m.color.clone() : new THREE.Color(0xffffff),
        map: (m && (m.map || (m.emissiveMap || null))) || null,
        vertexColors: !!(m && m.vertexColors),
        side: m ? m.side : THREE.FrontSide,
        transparent: !!(m && m.transparent),
        opacity: m ? m.opacity : 1,
        alphaTest: m ? m.alphaTest : 0,
      });
      // Il colore di base moltiplica la texture, e in glTF vale 1,1,1 quando
      // c'e' una texture. Lasciandolo com'e' il prodotto e' corretto in
      // entrambi i casi: colore piatto senza texture, texture senza tinta.
      return b;
    });
    o.material = Array.isArray(o.material) ? piatti : piatti[0];
  });
  return function rimetti() {
    for (const [o, m] of originali) {
      const attuali = Array.isArray(o.material) ? o.material : [o.material];
      for (const a of attuali) { try { a.dispose(); } catch (e) {} }
      o.material = m;
    }
  };
}

/**
 * Guarda il pavimento dall'alto e restituisce l'immagine.
 *
 * @returns {{pixel:Uint8Array, larghezza, altezza, metriPerPixel, origine, quotaPavimento}}
 */
export function piantaDelPavimento(THREE, renderer, radice, opzioni = {}) {
  if (!THREE || !renderer || !radice) return null;
  radice.updateMatrixWorld(true);
  const scatola = new THREE.Box3().setFromObject(radice);
  if (scatola.isEmpty()) return null;

  const quotaPav = opzioni.quotaPavimento != null ? opzioni.quotaPavimento : scatola.min.y;
  // Fin dove guarda l'occhio sotto di se'.
  //
  // Era fissa a 45 cm, e su un modello riscalato non bastava: la correzione
  // automatica moltiplica TUTTO, compresi gli scostamenti della segnaletica.
  // Misurato: placche che stavano a 8 cm dal pavimento, dopo il 6x stavano a
  // 50, e altre a 110 - sopra la telecamera, cioe' dietro l'obiettivo. Tre
  // famiglie su quattro sparivano.
  //
  // Fissare una costante piu' grande sarebbe lo stesso errore di
  // DECAL_STACCO_MAX: un numero scelto a tavolino invece che misurato. Qui la
  // fascia si RICAVA da dove stanno davvero le superfici vicine al pavimento -
  // il quantile 98 delle quote, cosi' una coda di casi estremi non la fa
  // esplodere. Il tetto di 1,6 m impedisce di inghiottire banconi e soppalchi,
  // che coprirebbero il pavimento invece di mostrarlo.
  let spessore = opzioni.spessore;
  if (spessore == null) {
    spessore = 0.45;
    const punti = opzioni.punti;
    if (punti && punti.length > 50) {
      const dh = [];
      for (const p of punti) {
        const d = p[1] - quotaPav;
        if (d >= -0.02 && d <= 2.5) dh.push(d);
      }
      if (dh.length > 50) {
        dh.sort((a, b) => a - b);
        const q98 = dh[Math.min(dh.length - 1, Math.floor(dh.length * 0.98))];
        spessore = Math.max(0.30, Math.min(1.60, q98 + 0.10));
      }
    }
  }

  const inq = inquadratura(
    { min: [scatola.min.x, scatola.min.y, scatola.min.z],
      max: [scatola.max.x, scatola.max.y, scatola.max.z] },
    opzioni.metriPerPixel || 0.05,
    opzioni.latoMax || 2048,
  );
  if (!inq) return null;

  const cam = new THREE.OrthographicCamera(
    scatola.min.x, scatola.max.x, scatola.max.z, scatola.min.z, 0.001, spessore + 0.05);
  // Guarda in giu'. L'occhio sta appena sopra la fascia da leggere, cosi'
  // tutto quello che sta piu' in alto - soffitti, coperture, aerei - finisce
  // DIETRO la telecamera e non copre il pavimento.
  cam.position.set(0, quotaPav + spessore, 0);
  cam.up.set(0, 0, -1);
  cam.lookAt(0, quotaPav, 0);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);

  const bersaglio = new THREE.WebGLRenderTarget(inq.larghezza, inq.altezza, {
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
    colorSpace: THREE.SRGBColorSpace || undefined,
  });

  const scena = new THREE.Scene();
  scena.background = null;
  const rimetti = spegniLuci(THREE, radice);
  const genitore = radice.parent;
  const indice = genitore ? genitore.children.indexOf(radice) : -1;

  const pixel = new Uint8Array(inq.larghezza * inq.altezza * 4);
  try {
    scena.add(radice);
    const bersaglioPrec = renderer.getRenderTarget();
    renderer.setRenderTarget(bersaglio);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scena, cam);
    renderer.readRenderTargetPixels(bersaglio, 0, 0, inq.larghezza, inq.altezza, pixel);
    renderer.setRenderTarget(bersaglioPrec);
  } finally {
    // Il modello TORNA dov'era, sempre. E' quello che l'utente sta guardando:
    // lasciarlo nella scena di servizio lo farebbe sparire dallo schermo.
    if (genitore) {
      if (indice >= 0) genitore.children.splice(indice, 0, radice);
      else genitore.add(radice);
      radice.parent = genitore;
    } else {
      scena.remove(radice);
    }
    rimetti();
    try { bersaglio.dispose(); } catch (e) {}
  }

  return { pixel, ...inq, quotaPavimento: quotaPav };
}

/**
 * Guarda il modello INTERO da piu' punti di vista in prospettiva, a tre
 * quarti - come lo si girerebbe fra le mani. A differenza di
 * piantaDelPavimento (una pianta dall'alto, ortografica, dove l'altezza non
 * esiste) qui la telecamera vede l'altezza: l'unica cosa che separa un banco
 * da un muretto.
 *
 * Sempre e solo sul modello intero, mai zummato su un singolo oggetto: su
 * un'architettura complessa (aeroporto, museo) centrare la telecamera volume
 * per volume moltiplica il costo con il numero di arredi. Il numero di
 * scorci invece si adatta - poche fotografie per un modello semplice, di
 * piu' per uno complesso - vedi numeroScorci().
 *
 * @returns {Array<{pixel:Uint8Array, larghezza, altezza, azimuth, elevazioneGradi}>}
 */
export function scorciTreQuarti(THREE, renderer, radice, opzioni = {}) {
  if (!THREE || !renderer || !radice) return [];
  radice.updateMatrixWorld(true);
  const scatola = new THREE.Box3().setFromObject(radice);
  if (scatola.isEmpty()) return [];

  let numeroMesh = 0;
  radice.traverse((o) => { if (o.isMesh) numeroMesh++; });
  const ingombro = { min: [scatola.min.x, scatola.min.y, scatola.min.z],
                      max: [scatola.max.x, scatola.max.y, scatola.max.z] };
  const densita = densitaMesh(numeroMesh, ingombro);
  const n = opzioni.numeroScorci || numeroScorci(densita);

  const centro = scatola.getCenter(new THREE.Vector3());
  const diagonale = scatola.getSize(new THREE.Vector3()).length();
  const distanza = opzioni.distanza || diagonale * 0.8;
  const elevazioneGradi = opzioni.elevazioneGradi != null ? opzioni.elevazioneGradi : 35;
  const elevRad = elevazioneGradi * Math.PI / 180;

  const larghezza = opzioni.larghezza || 768;
  const altezza = opzioni.altezza || 768;

  const scena = new THREE.Scene();
  scena.background = null;
  const rimetti = spegniLuci(THREE, radice);
  const genitore = radice.parent;
  const indice = genitore ? genitore.children.indexOf(radice) : -1;

  const risultati = [];
  try {
    scena.add(radice);
    const bersaglio = new THREE.WebGLRenderTarget(larghezza, altezza, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
      colorSpace: THREE.SRGBColorSpace || undefined,
    });
    const cam = new THREE.PerspectiveCamera(50, larghezza / altezza, 0.05, distanza * 3 + diagonale);
    const bersaglioPrec = renderer.getRenderTarget();

    for (let i = 0; i < n; i++) {
      const azimuth = (i / n) * Math.PI * 2 + (opzioni.azimuthIniziale || 0);
      cam.position.set(
        centro.x + distanza * Math.cos(elevRad) * Math.cos(azimuth),
        centro.y + distanza * Math.sin(elevRad),
        centro.z + distanza * Math.cos(elevRad) * Math.sin(azimuth),
      );
      cam.up.set(0, 1, 0);
      cam.lookAt(centro);
      cam.updateProjectionMatrix();
      cam.updateMatrixWorld(true);

      const pixel = new Uint8Array(larghezza * altezza * 4);
      renderer.setRenderTarget(bersaglio);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(scena, cam);
      renderer.readRenderTargetPixels(bersaglio, 0, 0, larghezza, altezza, pixel);

      // ⚠️ SI RADDRIZZA QUI, ALLA FONTE. `readRenderTargetPixels` restituisce la
      //    riga 0 in fondo; chi trasforma questi pixel in immagine
      //    (`piantaInTela`) li copia cosi' come sono. Senza questo giro lo
      //    scorcio arriva al cervello CAPOVOLTO — e un modello che guarda un
      //    edificio a testa in giu' non sbaglia in modo rumoroso: risponde una
      //    cosa plausibile e sbagliata, che e' il difetto peggiore.
      //    La pianta invece NON si tocca: li' la riga 0 in fondo e' l'origine
      //    di `pixelAMondo`, e raddrizzarla specchierebbe tutte le posizioni.
      risultati.push({ pixel: raddrizza(pixel, larghezza, altezza),
                       larghezza, altezza, azimuth, elevazioneGradi, densita, numeroMesh });
    }
    renderer.setRenderTarget(bersaglioPrec);
    try { bersaglio.dispose(); } catch (e) {}
  } finally {
    // Il modello TORNA dov'era, sempre - stessa regola di piantaDelPavimento.
    if (genitore) {
      if (indice >= 0) genitore.children.splice(indice, 0, radice);
      else genitore.add(radice);
      radice.parent = genitore;
    } else {
      scena.remove(radice);
    }
    rimetti();
  }

  return risultati;
}

export default { inquadratura, pixelAMondo, mondoAPixel, areaPixel, raddrizza, piantaDelPavimento, densitaMesh, numeroScorci, scorciTreQuarti };
