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
  // ⚠️ `tutto: true` — LA PIANTA DEL MODELLO INTERO, non la fetta.
  //    Deciso da Raffaella il 26/08 guardando il pannello. La fetta a 45 cm
  //    e' giusta su un modello CHIUSO (tetto e solai): senza, dall'alto si
  //    vedrebbe solo la copertura. Ma sui modelli veri che entrano qui —
  //    spaccati, senza muri ne' soffitti — la fetta butta via tutto quello
  //    che c'e' da riconoscere e lascia il pavimento nudo con qualche
  //    puntino: banchi, sedute, gate, nastri stanno TUTTI sopra i 45 cm.
  //    E' esattamente il motivo per cui gli scorci a tre quarti funzionano e
  //    la pianta no: gli scorci guardano il modello intero.
  //    Qui non si sceglie a priori quale sia il modello giusto: si guarda
  //    tutto, e cosa si sta vedendo — spaccato, sezione, modello chiuso — lo
  //    dice il cervello, che e' il suo mestiere.
  //    La proiezione resta ortografica dall'alto, quindi `pixelAMondo` e
  //    `scatolaInMondo` continuano a valere identici: cambia solo quanta
  //    altezza entra nell'inquadratura.
  //    Chi legge la segnaletica a terra NON passa `tutto` e tiene la fetta:
  //    con gli arredi dentro, il pavimento non si vedrebbe piu'.
  let spessore = opzioni.spessore;
  if (opzioni.tutto && spessore == null) {
    spessore = (scatola.max.y - quotaPav) + 0.10;
  }
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

  // ⚠️ I bordi alto/basso vanno espressi nel sistema DELLA TELECAMERA, non in
  //    quello del mondo. Con up = (0,0,-1) l'alto dello schermo guarda verso
  //    -Z, quindi la Z del mondo entra QUI cambiata di segno. Scrivendoci
  //    direttamente max.z e min.z l'inquadratura cadeva su z fra -max.z e
  //    -min.z: giusta solo per un modello centrato sull'origine, e del tutto
  //    FUORI dal modello per qualunque altro — pianta vuota, senza un errore
  //    in console. Misurato il 26/08 proiettando i vertici con three.
  const cam = new THREE.OrthographicCamera(
    scatola.min.x, scatola.max.x, -scatola.min.z, -scatola.max.z, 0.001, spessore + 0.05);
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

  // ⚠️ SI RADDRIZZA QUI, ALLA FONTE — come gia' fa scorciTreQuarti.
  //    `readRenderTargetPixels` consegna la riga 0 in fondo, e in fondo allo
  //    schermo (con up = (0,0,-1)) c'e' la Z MASSIMA. Ma tutti e tre i
  //    consumatori di questi pixel leggono la riga 0 come Z MINIMA:
  //    `pixelAMondo` e `scatolaInMondo` (origine = min.z), `piantaInTela`
  //    (riga 0 in cima alla tela) e `leggiSegnaleticaDaPianta`. Una sola
  //    girata qui li rimette d'accordo tutti insieme; NON si rovescia niente
  //    a valle, o si torna a specchiare. Misurato il 26/08.
  return { pixel: raddrizza(pixel, inq.larghezza, inq.altezza), ...inq, quotaPavimento: quotaPav };
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

  // ⚠️ SI PUO' METTERE A FUOCO. Chiesto da Raffaella il 05/09/2026: «avevo
  //    chiesto un'autofit, la capacita' di mettere a fuoco — visto sempre da
  //    lontano non si capisce niente, specialmente se ci sono molti dettagli».
  //
  //    MISURATO LO STESSO GIORNO sul banco di prova, col modello intero nel
  //    riquadro: la telecamera sta a 136 m e inquadra 126 m dentro 768 pixel,
  //    cioe' SEI PIXEL AL METRO. Un aereo lungo 40 m e' 243 pixel; un bancone
  //    lungo 3 m e' 18 pixel; una seduta larga 55 cm e' TRE PIXEL E MEZZO.
  //
  //    Di li' non puo' nascere nessun arredo, e nascono invece i grattacieli
  //    e le aule a gradoni: non sono parole sbagliate nel vocabolario, sono
  //    quello che tre pixel SEMBRANO a un modello a cui si fanno 176 domande
  //    e che deve rispondere qualcosa. Il rimedio non e' togliere parole:
  //    e' avvicinare la telecamera.
  const inquadra = opzioni.bersaglio
    ? new THREE.Box3(new THREE.Vector3().fromArray(opzioni.bersaglio.min),
                     new THREE.Vector3().fromArray(opzioni.bersaglio.max))
    : scatola;
  const centro = inquadra.getCenter(new THREE.Vector3());
  const dimInq = inquadra.getSize(new THREE.Vector3());
  const diagonale = scatola.getSize(new THREE.Vector3()).length();
  const fovGradi = opzioni.fovGradi || 50;
  // Sul modello intero resta la distanza di sempre, che e' tarata e funziona;
  // su un bersaglio piu' piccolo si calcola perche' lo RIEMPIA.
  const distanza = opzioni.distanza
    || (opzioni.bersaglio
        ? distanzaPerInquadrare([dimInq.x, dimInq.y, dimInq.z], fovGradi, opzioni.margine)
        : diagonale * 0.8);
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
    const cam = new THREE.PerspectiveCamera(fovGradi, larghezza / altezza, 0.05, distanza * 3 + diagonale);
    const bersaglioPrec = renderer.getRenderTarget();

    for (let i = 0; i < n; i++) {
      const azimuth = (i / n) * Math.PI * 2 + (opzioni.azimuthIniziale || 0);
      // ⚠️ L'ALTEZZA COMANDA SULL'ANGOLO, quando viene dichiarata.
      //
      //    Un angolo non basta a dire dove sta l'occhio: dipende da quanto
      //    si e' lontani. Misurato il 05/09 sul banco di prova — con
      //    l'elevazione a 18 gradi e un grappolo di 23 m da inquadrare, la
      //    distanza necessaria e' 36,6 m e la telecamera finisce a 16,4 m
      //    d'altezza. L'edificio ne e' alto 15,4: guardava da SOPRA IL
      //    TETTO. Piu' vicina di prima, ma sempre dall'alto — e dall'alto
      //    un sedile torna a essere un quadratino.
      //
      //    Con `altezzaTelecamera` si dichiara la quota assoluta e
      //    l'inquadratura resta la stessa: cambia solo dove si mette
      //    l'occhio sulla sfera di quel raggio.
      // ⚠️ SI CHIAMA `quotaTelecamera` E NON `altezza`, e non e' pignoleria:
      //    `altezza` in questa funzione e' gia' l'ALTEZZA DELL'IMMAGINE in
      //    pixel (768). Chiamando cosi' questa variabile la si copriva dentro
      //    il ciclo, e le figure uscivano alte UN pixel invece di 768.
      //    Misurato sulla pagina viva il 05/09: «mi avvicino a 6 grappoli: da
      //    0 a 0.1 pixel al metro», e zero testimonianze. `node --check` non lo
      //    vede — e' JavaScript valido — e nessuna prova in node lo prende,
      //    perche' la resa vuole un renderer. Se ne accorge solo il numero.
      const quotaTelecamera = opzioni.altezzaTelecamera != null
        ? opzioni.altezzaTelecamera
        : centro.y + distanza * Math.sin(elevRad);
      const dislivello = quotaTelecamera - centro.y;
      // il raggio orizzontale che resta, tenuta ferma la distanza: se la
      // quota chiesta e' piu' alta della distanza stessa, non si va sotto
      // mezzo metro dal bersaglio.
      const raggio = Math.sqrt(Math.max(0.25, distanza * distanza - dislivello * dislivello));
      cam.position.set(
        centro.x + raggio * Math.cos(azimuth),
        quotaTelecamera,
        centro.z + raggio * Math.sin(azimuth),
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
      // ⚠️ OGNI SCORCIO PORTA QUANTO E' FITTO. `pixelPerMetro` dice in un
      //    numero solo se in quella figura un arredo si puo' vedere o no:
      //    sotto una decina di pixel al metro una seduta e' una macchia, e
      //    qualunque parola l'occhio ci metta sopra e' un'ipotesi sul rumore.
      // ⚠️ E OGNI SCORCIO PORTA IL RETTANGOLO DI MONDO CHE HA INQUADRATO.
      //
      //    Non e' una posizione, e non lo diventa: la Regola 0 dice che da una
      //    prospettiva non si ricava dove sta una cosa, e resta vero. Ma
      //    l'inquadratura si sa PRIMA di scattare — e' il bersaglio, cioe' il
      //    grappolo, e le sue misure erano gia' state prese.
      //
      //    «In quest'area ho visto dei taxi» e' una testimonianza legata a una
      //    REGIONE, non una misura ricavata da un pixel. E' la differenza fra
      //    dire «li' c'e' una macchina, a quel metro» — che sarebbe falso — e
      //    «in questo rettangolo ci sono delle macchine» — che e' vero e
      //    verificabile. Senza questa riga il fronte strada resta interno per
      //    sempre: dall'alto le automobili non si vedono (misurato: ZERO in
      //    pianta, 83 da vicino), e da vicino non si prendeva niente.
      //
      //    Dove non c'e' un bersaglio la regione e' `null`, e chi legge deve
      //    saper vivere senza: un campo largo inquadra mezzo modello e dire
      //    «in quest'area» non significherebbe piu' niente.
      const regione = (opzioni.bersaglio && opzioni.bersaglio.min && opzioni.bersaglio.max)
        ? { min: opzioni.bersaglio.min.slice(), max: opzioni.bersaglio.max.slice() }
        : null;
      risultati.push({ pixel: raddrizza(pixel, larghezza, altezza),
                       larghezza, altezza, azimuth, elevazioneGradi, densita, numeroMesh,
                       etichetta: opzioni.etichetta || null,
                       regione,
                       altezzaTelecamera: +quotaTelecamera.toFixed(2),
                       pixelPerMetro: +(altezza / (2 * distanza
                         * Math.tan(fovGradi * Math.PI / 360))).toFixed(1) });
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


/**
 * La distanza a cui una scatola RIEMPIE l'inquadratura.
 *
 * Si usa la sfera che contiene la scatola: e' un po' larga per una scatola
 * lunga e stretta, ma non taglia mai niente da nessun angolo di ripresa — e
 * un arredo tagliato a meta' e' peggio di un arredo un po' piu' piccolo.
 */
export function distanzaPerInquadrare(dimensioni, fovGradi = 50, margine = 1.15) {
  const d = dimensioni || [0, 0, 0];
  const raggio = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]) / 2;
  const semiFov = Math.max(1e-3, (fovGradi * Math.PI / 180) / 2);
  return Math.max(0.5, (raggio / Math.sin(semiFov)) * (margine || 1.15));
}

/**
 * I grappoli di arredo su cui vale la pena avvicinarsi.
 *
 * ⚠️ NON UNO PER OGGETTO. Centrare la telecamera arredo per arredo
 *    moltiplicherebbe il costo con il numero degli arredi — in questo
 *    aeroporto sono 31 gruppi di sedute soltanto. Si raggruppa per
 *    VICINANZA: quello che sta insieme si guarda insieme, e una fotografia
 *    sola lo copre.
 *
 * ⚠️ E si scartano gli ingombri grandi: un volume lungo venticinque metri
 *    non e' un arredo, e' l'ambiente che lo contiene. Avvicinarsi a quello
 *    riporterebbe l'inquadratura esattamente da dove siamo partiti.
 */
export const FORME_ARREDO = Object.freeze(['seduta', 'banco']);

export function grappoliDaInquadrare(posti, opz = {}) {
  // ⚠️ QUANTO STRETTO, E PERCHE' PROPRIO COSI'. Misurato il 05/09 sulla
  //    pagina viva: con grappoli da 20 m l'inquadratura dava 22 pixel al
  //    metro e una seduta restava 12 pixel — comparivano tornelli,
  //    ringhiere, colonne e scale mobili, ma nessuno schienale.
  //
  //      lato 20 m -> una seduta e' 12 pixel
  //      lato  8 m -> una seduta e' ~30 pixel
  //      lato  5 m -> una seduta e' ~48 pixel
  //
  //    Si paga in fotografie: grappoli piu' piccoli vuol dire piu'
  //    grappoli, e ogni fotografia e' tempo dell'occhio. Otto metri e'
  //    il bilanciamento provato; si stringe ancora solo misurando.
  const raggio = opz.raggio != null ? opz.raggio : 4;
  const maxLato = opz.maxLato != null ? opz.maxLato : 25;
  const latoMax = opz.latoMax != null ? opz.latoMax : 8;
  const bordo = opz.bordo != null ? opz.bordo : 1;
  const quanti = opz.quanti != null ? opz.quanti : 15;
  const arredo = new Set(opz.formeArredo || FORME_ARREDO);

  // ⚠️ CIO' CHE E' TROPPO GRANDE NON SI BUTTA: SI GUARDA DA PIU' LONTANO.
  //    Corretto il 06/09/2026, ed e' l'ultimo anello della catena del
  //    parcheggio. Qui c'era `continue`: una cosa piu' lunga di `maxLato`
  //    spariva dall'elenco, quindi non entrava in nessun grappolo e non
  //    riceveva MAI una fotografia ravvicinata — su nessun modello, mai.
  //
  //    Misurato su questo aeroporto: le corsie del fronte strada stanno in un
  //    gruppo lungo **26,13 m** contro un tetto di 25. **Buttate per 1,13
  //    metri.** Da li' l'occhio non ha mai visto la strada, non ha mai visto
  //    le automobili, e il «da fuori» veniva marcato solo dal lato degli
  //    aerei — cioe' dalla parte sbagliata rispetto a quello che Raffaella
  //    vede a schermo.
  //
  //    ⚠️ E la soglia non andava alzata: sarebbe stata la stessa medicina che
  //       si e' gia' rotta due volte oggi. Un numero in metri e' tarato su una
  //       SCALA, e questo progetto la scala se la ricalcola. A 26 metri
  //       inquadrati restano comunque ~29 pixel al metro, contro i 6 della
  //       veduta d'insieme: la fotografia serve ancora. Quindi la cosa grande
  //       diventa un grappolo DA SOLA, inquadrata alla sua misura, e non fa
  //       crescere gli altri — che era la ragione vera del tetto.
  const cose = [];
  const troppoGrandi = [];
  for (const p of posti || [])
    for (const c of (p.cose || [])) {
      if (!c || !c.centro || !c.ingombro || !c.ingombro.min || !c.ingombro.max) continue;
      const lx = c.ingombro.max[0] - c.ingombro.min[0];
      const lz = c.ingombro.max[2] - c.ingombro.min[2];
      if (lx > maxLato || lz > maxLato) { troppoGrandi.push(c); continue; }
      cose.push(c);
    }
  if (!cose.length && !troppoGrandi.length) return [];

  const grappoli = [];
  for (const c of cose) {
    let dentro = null;
    for (const g of grappoli) {
      const dx = Math.max(g.min[0] - c.centro[0], 0, c.centro[0] - g.max[0]);
      const dz = Math.max(g.min[2] - c.centro[2], 0, c.centro[2] - g.max[2]);
      if (Math.sqrt(dx * dx + dz * dz) > raggio) continue;
      // ⚠️ IL GRAPPOLO NON PUO' CRESCERE OLTRE MISURA, o non e' piu' un primo
      //    piano. Senza questo tetto un pezzo tira l'altro e in un edificio
      //    fitto di arredi si arriva a un grappolo solo grande quanto
      //    l'edificio: misurato sul banco il 05/09, 103 x 39 m con 1520
      //    pezzi dentro, cinque pixel e mezzo al metro — cioe' esattamente
      //    l'inquadratura da cui volevamo scappare.
      const nx = Math.max(g.max[0], c.ingombro.max[0]) - Math.min(g.min[0], c.ingombro.min[0]);
      const nz = Math.max(g.max[2], c.ingombro.max[2]) - Math.min(g.min[2], c.ingombro.min[2]);
      if (nx > latoMax || nz > latoMax) continue;
      dentro = g; break;
    }
    if (!dentro) {
      dentro = { min: c.ingombro.min.slice(), max: c.ingombro.max.slice(),
                 pezzi: 0, arredi: 0, forme: {} };
      grappoli.push(dentro);
    } else {
      for (let i = 0; i < 3; i++) {
        dentro.min[i] = Math.min(dentro.min[i], c.ingombro.min[i]);
        dentro.max[i] = Math.max(dentro.max[i], c.ingombro.max[i]);
      }
    }
    dentro.pezzi += (c.quante || 1);
    if (arredo.has(c.forma)) dentro.arredi += (c.quante || 1);
    const f = c.forma || 'senza forma';
    dentro.forme[f] = (dentro.forme[f] || 0) + 1;
  }

  // Le cose troppo grandi: ognuna un grappolo suo, alla sua misura. Non si
  // uniscono a niente — sarebbero loro a far crescere gli altri oltre il tetto.
  for (const c of troppoGrandi) {
    grappoli.push({
      min: c.ingombro.min.slice(), max: c.ingombro.max.slice(),
      pezzi: (c.quante || 1),
      arredi: arredo.has(c.forma) ? (c.quante || 1) : 0,
      forme: { [c.forma || 'senza forma']: 1 },
      daSola: true,
    });
  }

  // ⚠️ CI SI AVVICINA DOVE C'E' UN ARREDO, non dove ci sono piu' pezzi.
  //    Misurato il 05/09: ordinando per numero di pezzi i sei primi piani
  //    finivano tutti su ammassi di volumi e di cose appese, e NESSUNO
  //    conteneva una seduta — cioe' proprio la cosa per cui ci si avvicina.
  //    L'arredo e' quello che implica un comportamento (ci si siede, si fa
  //    la fila): e' li' che vale la pena spendere una fotografia.
  //
  // ⚠️ MA NON SOLO LI', E QUESTA E' LA CORREZIONE DEL 06/09.
  //
  //    Ordinando SOLO per arredi, un grappolo che di arredi non ne ha non
  //    riceve mai una fotografia — mai, su nessun modello. Misurato su questo
  //    aeroporto: il fronte strada e' un grappolo da 282 m2 con 28 oggetti in
  //    fila (le corsie, 4,5 x 26 m l'una), forma «volume», arredi ZERO.
  //    Quindici primi piani, nessuno li' sopra. Da cui: l'occhio non ha mai
  //    visto le automobili, il fuori non veniva marcato dal lato strada, e
  //    Raffaella vedeva a schermo delle macchine che il programma non nomina.
  //
  //    ⚠️ E il guasto era CIRCOLARE, che e' il motivo per cui e' durato: non
  //       ci si avvicina perche' non si sa cosa c'e', e non si sa cosa c'e'
  //       perche' non ci si avvicina. **Non si puo' concludere su cio' che non
  //       si e' mai guardato** — ed e' la direttiva 17 letta al contrario.
  //
  //    Si ALTERNA, come gia' si fa fra scorci larghi e ravvicinati per lo
  //    stesso identico motivo: una lista di cio' che PROMETTE un
  //    comportamento (gli arredi) e una di cio' di cui NON SI SA NIENTE (gli
  //    altri, i piu' estesi per primi), e si pesca una volta per parte.
  //    Nessuna quota fissa da tarare: se una delle due si esaurisce, l'altra
  //    prende i posti rimasti.
  const conArredi = grappoli.filter((g) => g.arredi > 0)
    .sort((a, b) => (b.arredi - a.arredi) || (b.pezzi - a.pezzi));
  const senzaArredi = grappoli.filter((g) => !g.arredi)
    .sort((a, b) => ((b.max[0] - b.min[0]) * (b.max[2] - b.min[2]))
                  - ((a.max[0] - a.min[0]) * (a.max[2] - a.min[2])));
  const scelti = [];
  let i = 0, j = 0;
  while (scelti.length < quanti && (i < conArredi.length || j < senzaArredi.length)) {
    if (i < conArredi.length) scelti.push(conArredi[i++]);
    if (scelti.length < quanti && j < senzaArredi.length) scelti.push(senzaArredi[j++]);
  }
  return scelti
    .map((g) => ({
      min: [g.min[0] - bordo, g.min[1], g.min[2] - bordo],
      max: [g.max[0] + bordo, g.max[1] + bordo, g.max[2] + bordo],
      pezzi: g.pezzi,
      arredi: g.arredi,
      etichetta: Object.keys(g.forme).sort((a, b) => g.forme[b] - g.forme[a])
        .slice(0, 3).map((k) => k + ' x' + g.forme[k]).join(', '),
    }));
}

/**
 * Gli scorci RAVVICINATI: uno per grappolo di arredo, messo a fuoco.
 *
 * ⚠️ L'ELEVAZIONE E' BASSA APPOSTA. Dall'alto un sedile e' un quadratino;
 *    di taglio si vede lo schienale, ed e' cosi' che una seduta si
 *    riconosce. E' la stessa ragione per cui gli scorci esistono: 18 gradi,
 *    non 35.
 *
 * ⚠️ Da queste figure si prende SOLO LA TESTIMONIANZA, mai una posizione.
 *    Sono prospettive: un riquadro qui dentro non ha un corrispondente a
 *    terra, e convertirlo produrrebbe coordinate credibili e sbagliate.
 */
/**
 * L'altezza a cui si taglia una pianta, in metri sopra il pavimento.
 *
 * ⚠️ NON E' UN NUMERO SCELTO A CASO, e' la convenzione del disegno di
 *    architettura. Raffaella, 05/09/2026: «la telecamera si deve
 *    posizionare di regola per l'architettura. Si va a sezionare a un
 *    metro e dieci, perche' di solito a quell'altezza tu hai
 *    praticamente in sezione le finestre, le porte, gli scorci».
 *
 *    A 1,10 m si taglia dove l'edificio dice qualcosa: davanzali,
 *    maniglie, banconi, schienali. Piu' in alto si vedono i tetti degli
 *    arredi; piu' in basso solo gambe.
 */
export const ALTEZZA_SEZIONE = 1.10;

/**
 * Gli scorci RAVVICINATI: uno per grappolo di arredo, messo a fuoco e
 * messo alla quota giusta.
 *
 * ⚠️ L'ALTEZZA SI MISURA DAL PAVIMENTO DI QUEL GRAPPOLO, non dal fondo
 *    del modello. Un edificio ha piu' livelli, e a ogni livello si deve
 *    poter guardare: il pavimento su cui l'arredo APPOGGIA e' il fondo
 *    del suo ingombro — un arredo non galleggia, ed e' la stessa idea
 *    con cui `veritas_cose.js` separa i mucchi piano per piano.
 */
export function scorciRavvicinati(THREE, renderer, radice, posti, opzioni = {}) {

  const grappoli = grappoliDaInquadrare(posti, opzioni);
  const fuori = [];
  for (let i = 0; i < grappoli.length; i++) {
    const g = grappoli[i];
    const viste = scorciTreQuarti(THREE, renderer, radice, {
      ...opzioni,
      bersaglio: { min: g.min, max: g.max },
      numeroScorci: opzioni.scorciPerGrappolo || 1,
      elevazioneGradi: opzioni.elevazioneGradi != null ? opzioni.elevazioneGradi : 18,
      // il pavimento di QUESTO grappolo, piu' l'altezza di sezione
      altezzaTelecamera: opzioni.altezzaTelecamera != null
        ? opzioni.altezzaTelecamera
        : g.min[1] + (opzioni.altezzaSezione != null ? opzioni.altezzaSezione : ALTEZZA_SEZIONE),
      // ogni grappolo si guarda da un lato diverso: se fossero tutti dallo
      // stesso azimuth, meta' degli arredi resterebbe sempre dietro a qualcosa
      azimuthIniziale: (i / Math.max(1, grappoli.length)) * Math.PI * 2,
      etichetta: 'grappolo di ' + g.pezzi + ' pezzi (' + g.etichetta + ')',
    });
    for (const v of viste) fuori.push(v);
  }
  return fuori;
}

/**
 * LA VISTA DI CHI CAMMINA - direttiva 19, 07/09/2026.
 *
 * Raffaella: *«l'occhio dell'osservatore che si muove nello spazio, quello che
 * vediamo nella live view, deve renderizzare pian piano che cammina, man mano
 * che si muove, in maniera tale che non deve mettere in memoria tutto un giro.
 * Tutti i programmi di rendering che vogliono fare il rendering istantaneo
 * lavorano su quello che vede l'osservatore in quel momento. Quello che c'e'
 * alle sue spalle non viene analizzato.»*
 *
 * ⚠️ E' L'OPPOSTO DI `scorciTreQuarti`, ed e' voluto. Quelli girano il modello
 *    fra le mani da fuori, tutti insieme, e finche' non hanno finito il giro
 *    l'occhio non ha detto niente a nessuno: sul banco di prova sono minuti.
 *    Questa e' UNA fotografia sola, da dove il corpo si trova adesso, e vale
 *    da sola: la testimonianza arriva dove il corpo e', mentre ci arriva.
 *
 * ⚠️ LE STESSE OTTICHE DEL FILM, e non e' un dettaglio estetico: occhio a
 *    1,65 m e lente da 60 gradi (`LENTE` in veritas_cinema.js). Se l'occhio
 *    guardasse con una lente diversa da quella che si vede sullo schermo,
 *    starebbe testimoniando su un'altra scena - e nessuno potrebbe
 *    contestarlo guardando.
 *
 * ⚠️ E LA REGOLA 0 REGGE, ma va detto come. Da una prospettiva NON si ricava
 *    una posizione, e qui non si ricava: `centro` non esiste. Quello che si sa
 *    - e si sa PRIMA di scattare, dalla geometria e non dai pixel - e' quale
 *    pezzo di pavimento sta dentro il campo visivo: e' l'ISOVISTA, che
 *    `veritas_visibility` misura da sempre e che nessuno aveva mai usato per
 *    questo. Ristretta al cono della lente, e' il ventaglio davanti ai piedi.
 *    «Da qui ho visto dei taxi» = testimonianza legata a CIO' CHE SI VEDE DA
 *    QUESTO PUNTO, misurato, non a un pixel.
 *
 * ⚠️ IL RETTANGOLO E' PIU' LARGO DEL VENTAGLIO, e sta scritto qui perche' non
 *    diventi una bugia silenziosa. `regione` e' il rettangolo che contiene il
 *    ventaglio, ed e' l'unica forma che i lettori di oggi sanno dipingere
 *    (`veritas_perception.js`, `veritas_accessi.js`). Il ventaglio vero esce
 *    accanto, in `poligono`, insieme a `quantoPiuLargo`: chi vorra' essere
 *    esatto ha gia' il dato in mano e non deve rifare niente.
 *
 * @param {object} opzioni
 *   posizione     [x,y,z] l'OCCHIO, non i piedi (la telecamera del film lo e' gia')
 *   direzione     [dx,dy,dz] dove guarda; oppure `azimuth` in radianti
 *   altezzaOcchio quota d'occhio per l'occlusione dell'isovista (default 1,65)
 *   fovGradi      la lente (default 60, come il film)
 *   portata       fin dove ha senso dire di aver visto (default 40 m)
 *   isovista      funzione (pos, opts) -> isovista; default window.__veritasPerception
 */
export function vistaDalCamminatore(THREE, renderer, radice, opzioni = {}) {
  if (!THREE || !renderer || !radice) return null;
  const posizione = opzioni.posizione;
  if (!posizione || posizione.length < 3) return null;

  const dir = opzioni.direzione;
  const azimuth = typeof opzioni.azimuth === 'number'
    ? opzioni.azimuth
    : (dir ? Math.atan2(dir[2], dir[0]) : 0);
  // Il beccheggio si conserva se c'e': un camminatore che scende una rampa
  // guarda in basso, e appiattirlo vorrebbe dire fotografare un'altra scena.
  const dy = dir && dir.length > 2 ? dir[1] : 0;
  const orizz = dir ? Math.hypot(dir[0], dir[2]) : 1;

  const fovGradi = opzioni.fovGradi || 60;
  const larghezza = opzioni.larghezza || 768;
  const altezza = opzioni.altezza || 768;
  const portata = opzioni.portata || 40;
  const altezzaOcchio = opzioni.altezzaOcchio != null ? opzioni.altezzaOcchio : 1.65;

  // ---- la REGIONE, presa dalla geometria e non dai pixel -------------------
  const misuraIsovista = opzioni.isovista
    || (typeof window !== 'undefined' && window.__veritasPerception
        && window.__veritasPerception.isovist) || null;
  let iso = null;
  if (misuraIsovista) {
    try {
      iso = misuraIsovista(posizione, {
        eyeHeight: altezzaOcchio, range: portata,
        direzione: azimuth, ampiezzaGradi: fovGradi,
        // un raggio ogni due gradi dentro il cono: piu' fitto del giro intero,
        // perche' qui il ventaglio e' tutto quello che c'e'
        rays: Math.max(8, Math.round(fovGradi / 2)),
      });
    } catch (e) { iso = null; }
  }
  let regione = null, quantoPiuLargo = null;
  if (iso && iso.polygon && iso.polygon.length > 2) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const p of iso.polygon) {
      if (p[0] < x0) x0 = p[0];
      if (p[0] > x1) x1 = p[0];
      if (p[1] < z0) z0 = p[1];
      if (p[1] > z1) z1 = p[1];
    }
    const piedi = posizione[1] - altezzaOcchio;
    regione = { min: [x0, piedi, z0], max: [x1, piedi + 3, z1] };
    const areaRett = Math.max(1e-6, (x1 - x0) * (z1 - z0));
    quantoPiuLargo = +(areaRett / Math.max(1e-6, iso.area)).toFixed(2);
  }

  // ---- la fotografia -------------------------------------------------------
  const scena = new THREE.Scene();
  scena.background = null;
  const rimetti = spegniLuci(THREE, radice);
  const genitore = radice.parent;
  const indice = genitore ? genitore.children.indexOf(radice) : -1;
  let fuori = null;
  try {
    scena.add(radice);
    const bersaglio = new THREE.WebGLRenderTarget(larghezza, altezza, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat, type: THREE.UnsignedByteType,
      colorSpace: THREE.SRGBColorSpace || undefined,
    });
    const bersaglioPrec = renderer.getRenderTarget();
    // near piccolo: la telecamera sta DENTRO l'edificio, non fuori a guardarlo
    const cam = new THREE.PerspectiveCamera(fovGradi, larghezza / altezza, 0.05, portata * 2 + 10);
    cam.position.set(posizione[0], posizione[1], posizione[2]);
    cam.up.set(0, 1, 0);
    cam.lookAt(posizione[0] + Math.cos(azimuth) * orizz,
               posizione[1] + dy,
               posizione[2] + Math.sin(azimuth) * orizz);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);

    const pixel = new Uint8Array(larghezza * altezza * 4);
    renderer.setRenderTarget(bersaglio);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(scena, cam);
    renderer.readRenderTargetPixels(bersaglio, 0, 0, larghezza, altezza, pixel);
    renderer.setRenderTarget(bersaglioPrec);
    try { bersaglio.dispose(); } catch (e) {}

    // ⚠️ QUANTO E' FITTA LA FIGURA, e in prospettiva non e' un numero solo:
    //    un tavolo a due metri e' grande, lo stesso tavolo a trenta e' una
    //    macchia. Si dichiara la densita' ALLA DISTANZA MEDIA DI CIO' CHE SI
    //    VEDE (il raggio medio dell'isovista), che e' l'unico punto in cui
    //    quel numero significa qualcosa. Senza isovista non si inventa: resta
    //    `null`, e chi legge sa di non saperlo.
    const distanzaTipica = iso ? iso.meanRadius : null;
    const pixelPerMetro = distanzaTipica
      ? +(altezza / (2 * distanzaTipica * Math.tan(fovGradi * Math.PI / 360))).toFixed(1)
      : null;

    fuori = {
      pixel: raddrizza(pixel, larghezza, altezza),
      larghezza, altezza,
      azimuth,
      elevazioneGradi: 0,
      etichetta: opzioni.etichetta || 'da dove cammina',
      // la stessa forma di uno scorcio ravvicinato: chi la legge non deve
      // sapere da dove viene
      regione,
      // ...e il ventaglio vero, per chi vorra' essere esatto
      poligono: iso ? iso.polygon : null,
      quantoPiuLargo,
      areaVista: iso ? iso.area : null,
      chiusura: iso ? iso.occlusivity : null,
      raggioMedio: distanzaTipica,
      pixelPerMetro,
      altezzaTelecamera: +posizione[1].toFixed(2),
      daCamminatore: true,
    };
  } finally {
    // Il modello TORNA dov'era, sempre - stessa regola di scorciTreQuarti.
    if (genitore) {
      if (indice >= 0) genitore.children.splice(indice, 0, radice);
      else genitore.add(radice);
      radice.parent = genitore;
    } else {
      scena.remove(radice);
    }
    rimetti();
  }
  return fuori;
}


/**
 * IL GIRO DENTRO L'EDIFICIO — una vista per ambiente, da dentro, ad altezza
 * d'uomo. Raffaella, 07/09/2026 sera, dopo aver guardato le fotografie che
 * l'occhio riceveva:
 *
 * > *«le visuali dall'alto, la pianta dall'alto, poi partono tutte le viste
 * > più ravvicinate, gli scorci ravvicinati, e sono tutti dall'alto degli
 * > aerei. Ci sono cinquecento foto degli aerei e delle altre parti
 * > dell'edificio non c'è proprio nulla. È proprio nella modalità di ripresa,
 * > quello che gli dai in pasto all'occhio è quello che vede. Ecco perché il
 * > modello non lo capisce.»*
 *
 * ⚠️ AVEVA RAGIONE, ED È GEOMETRIA, NON UN DIFETTO DI VOCABOLARIO.
 *    `scorciRavvicinati` inquadra i grappoli di arredo mettendo la telecamera
 *    **fuori dal grappolo**, alla distanza che serve a riempire l'inquadratura,
 *    a 18 gradi sopra l'orizzonte. Su un grappolo grande — un aereo è lungo
 *    quaranta metri — quella distanza porta la telecamera **fuori
 *    dall'edificio e in alto**, e da lì si vede il piazzale. Dentro il terminal
 *    non ci si è mai messi: **l'unica cosa che il programma non aveva mai
 *    fotografato è il posto dove cammina la gente.**
 *
 * ⚠️ E NON SI RISOLVE AGGIUNGENDO PAROLE. Se in cinquecento fotografie
 *    l'interno non compare, nessun vocabolario lo farà comparire: *quello che
 *    gli dai in pasto all'occhio è quello che vede*. Si risolve **cambiando da
 *    dove si scatta**, ed è esattamente la direttiva 19.
 *
 * COME SCEGLIE DOVE GUARDARE, e non è a caso: da ogni ambiente misurato prova
 * otto direzioni con l'**isovista** (che costa solo raggi, non pixel) e tiene
 * le poche in cui si vede di più. Così la telecamera non finisce col naso
 * contro un muro, e ogni ambiente porta almeno una fotografia di sé.
 *
 * ⚠️ UN AMBIENTE = ALMENO UNA FOTOGRAFIA. È il punto: prima l'ordine era per
 *    quantità di arredo, e gli aerei vincevano sempre. Qui si gira per
 *    AMBIENTI, dal più grande al più piccolo, e il tetto (`massimo`) taglia in
 *    coda — non toglie mai il primo scatto di un ambiente prima di aver dato
 *    il secondo a un altro.
 *
 * @param {Array} ambienti  gli ambienti MISURATI (`__veritasPercezione.zones`)
 * @param {object} opzioni  perAmbiente (2), massimo (12), sonde (8), fovGradi (60)
 */
export function giroDentro(THREE, renderer, radice, ambienti, opzioni = {}) {
  if (!THREE || !renderer || !radice || !Array.isArray(ambienti) || !ambienti.length) return [];
  const perAmbiente = opzioni.perAmbiente || 2;
  const massimo = opzioni.massimo || 12;
  const sonde = opzioni.sonde || 8;
  const fovGradi = opzioni.fovGradi || 60;
  const portata = opzioni.portata || 40;
  const altezzaOcchio = opzioni.altezzaOcchio != null ? opzioni.altezzaOcchio : 1.65;
  const misuraIsovista = opzioni.isovista
    || (typeof window !== 'undefined' && window.__veritasPerception
        && window.__veritasPerception.isovist) || null;

  // ⚠️ QUANTO BISOGNA VEDERE PERCHÉ VALGA LA PENA DI SCATTARE. Misurato sul
  //    banco di prova il 07/09: dal baricentro delle stanze piccole (10-23 m²)
  //    l'isovista vedeva **1,0-1,7 m²** con un raggio medio di **1,3-1,8 m** —
  //    cioè il naso contro un armadio, a 470 pixel al metro. Fotografie
  //    bellissime di una superficie, e ognuna si mangia un turno dell'occhio
  //    (decine di secondi) senza portare nessuna testimonianza.
  //    ⚠️ **PRIMA TARATURA, NON UNA MISURA.** Quattro metri quadri è poco più
  //       di un bagno: sotto, non si sta guardando un luogo, si sta guardando
  //       una parete.
  const UTILE_M2 = opzioni.utileM2 != null ? opzioni.utileM2 : 4;

  // Dal più grande al più piccolo: se il tetto taglia, taglia gli sgabuzzini.
  const ordinati = ambienti.slice()
    .filter((z) => z && typeof z.centroidX === 'number' && typeof z.centroidZ === 'number')
    .sort((a, b) => (b.areaM2 || 0) - (a.areaM2 || 0));

  /** Prova un punto: restituisce le direzioni ordinate per quanto si vede. */
  function provaPunto(occhio) {
    if (!misuraIsovista) {
      // Senza isovista non si indovina: quattro direzioni cardinali, e si dice.
      return [0, 1, 2, 3].map((k) => ({ a: k * Math.PI / 2, area: null }));
    }
    const out = [];
    for (let i = 0; i < sonde; i++) {
      const a = (i / sonde) * Math.PI * 2;
      let area = 0;
      try {
        const iso = misuraIsovista(occhio, { eyeHeight: altezzaOcchio, range: portata,
          direzione: a, ampiezzaGradi: fovGradi, rays: 10 });
        area = iso ? iso.area : 0;
      } catch (e) { area = 0; }
      out.push({ a, area });
    }
    return out.sort((p, q) => q.area - p.area);
  }

  // Prima si decide DOVE STARE e DOVE GUARDARE (costa raggi, non pixel), poi
  // si scatta. È il motivo per cui si può provare più di un punto per stanza
  // senza pagarlo: una sonda è dieci raggi, una fotografia è mezzo milione di
  // pixel piu' un turno dell'occhio.
  const daScattare = [];
  const saltati = [];
  ordinati.forEach((z, idx) => {
    const nome = 'il ' + (idx + 1) + 'º ambiente di ' + ordinati.length
      + ' (' + Math.round(z.areaM2 || 0) + ' m²)';
    const quota = (z.y || 0) + altezzaOcchio;
    // ⚠️ IL BARICENTRO NON È SEMPRE UN POSTO DOVE SI PUÒ STARE. In una stanza
    //    a L cade nel muro; in una stanza piena cade dentro un mobile. Si
    //    provano anche quattro punti su un anello attorno, largo quanto la
    //    stanza lo consente, e si tiene il migliore — sempre a raggi, quindi
    //    quasi gratis.
    const raggioAnello = Math.max(1, Math.min(3, Math.sqrt(z.areaM2 || 1) / 3));
    const candidati = [[z.centroidX, quota, z.centroidZ]];
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2;
      candidati.push([z.centroidX + Math.cos(a) * raggioAnello, quota,
                      z.centroidZ + Math.sin(a) * raggioAnello]);
    }
    let meglio = null;
    for (const c of candidati) {
      const dir = provaPunto(c);
      const quanto = dir.length ? (dir[0].area == null ? Infinity : dir[0].area) : 0;
      if (!meglio || quanto > meglio.quanto) meglio = { occhio: c, direzioni: dir, quanto };
    }
    if (!meglio || meglio.quanto < UTILE_M2) {
      saltati.push({ nome, visto: meglio ? meglio.quanto : 0 });
      return;
    }
    meglio.direzioni
      .filter((d) => d.area == null || d.area >= UTILE_M2)
      .slice(0, perAmbiente)
      .forEach((d, k) => {
        daScattare.push({ occhio: meglio.occhio, a: d.a, area: d.area, nome, primo: k === 0 });
      });
  });

  // ⚠️ QUELLO CHE NON SI È GUARDATO SI DICE. Un ambiente saltato in silenzio
  //    diventa, per chi legge il referto, un ambiente in cui non c'era niente.
  if (saltati.length && typeof console !== 'undefined')
    console.log('[VERITAS dentro] ' + saltati.length + ' ambienti non fotografati da dentro:'
      + ' da nessun punto si vedono ' + UTILE_M2 + ' m² ('
      + saltati.map((x) => x.nome + ': ' + x.visto + ' m²').join(' · ')
      + '). Non è che non ci sia niente: è che non ci si sta in piedi a guardare.');

  // Il tetto taglia in coda, ma prima i PRIMI scatti di tutti gli ambienti:
  // meglio nove stanze viste una volta che tre viste tre volte.
  daScattare.sort((p, q) => (q.primo ? 1 : 0) - (p.primo ? 1 : 0));

  const fuori = [];
  for (const d of daScattare.slice(0, massimo)) {
    const v = vistaDalCamminatore(THREE, renderer, radice, {
      posizione: d.occhio,
      direzione: [Math.cos(d.a), 0, Math.sin(d.a)],
      fovGradi, portata, altezzaOcchio,
      etichetta: 'da dentro ' + d.nome + ', verso ' + Math.round(d.a * 180 / Math.PI) + '°',
    });
    if (v) fuori.push(v);
  }
  return fuori;
}

export default { inquadratura, pixelAMondo, mondoAPixel, areaPixel, raddrizza, piantaDelPavimento, densitaMesh, numeroScorci, scorciTreQuarti,
  distanzaPerInquadrare, grappoliDaInquadrare, scorciRavvicinati, FORME_ARREDO,
  ALTEZZA_SEZIONE, vistaDalCamminatore, giroDentro };
