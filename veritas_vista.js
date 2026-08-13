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

/** Area a terra di un pixel, in m². Serve a convertire i conteggi in misure. */
export function areaPixel(inq) {
  return inq.metriPerPixel * inq.metriPerPixel;
}

// ---------------------------------------------------------------------------
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
  // Fin dove guarda l'occhio sotto di se'. Comprende la vernice a spessore zero
  // e le placche modellate qualche centimetro sopra il pavimento.
  const spessore = opzioni.spessore != null ? opzioni.spessore : 0.45;

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

export default { inquadratura, pixelAMondo, mondoAPixel, areaPixel, piantaDelPavimento };
