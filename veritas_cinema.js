/**
 * EIDETICA — LA FINESTRA DELLA CONOSCENZA CHE SI FORMA
 * =============================================================================
 *
 * Raffaella, 06/09/2026:
 *   «Io ho immaginato qualcosa di impressionante, di cinematico. Il marchio
 *    EIDETICA che diventa cliccabile e fa partire questo cinema di immagini che
 *    si formano, partendo dai frammenti di pixel che si creano. Deve essere
 *    qualcosa di trascendente: la formazione della conoscenza deve essere
 *    evocata visivamente. Stiamo facendo cose serie, ma in questo momento la
 *    cosa seria deve fare anche scena. L'architetto si deve fermare.»
 *
 * E' la DIRETTIVA 15 messa in scena, e la 15 dice due cose che qui comandano:
 *
 *   1. ⚠️ **LA MESSA IN SCENA LA GUIDA LO STATO VERO, MAI UN EFFETTO.** Non c'e'
 *      un solo numero inventato in questo file. I punti sono i 21.267 punti
 *      MISURATI dello spazio navigabile; le viste sono le viste che l'occhio
 *      sta guardando davvero; la fiducia e' quella che ha dichiarato lui. Se
 *      l'animazione la guidasse un effetto invece dello stato, avremmo
 *      costruito una bugia bellissima — la stessa merce avariata dei KPI finti,
 *      ma col budget del marketing dietro.
 *
 *   2. ⚠️ **MA QUI GLI EFFETTI SONO AMMESSI**, perche' stanno sulla
 *      RAPPRESENTAZIONE e non sulla conclusione (direttiva 10). *Come* si
 *      mostra e' libero; *che cosa* si afferma no. Un nome incerto resta
 *      pallido e con la sua domanda accanto, per quanto bello sia il modo in
 *      cui compare.
 *
 * ⚠️ NIENTE GAUSSIAN SPLAT (direttiva 9). L'occhio non produce punti
 *    tridimensionali, e costruirci uno splat vorrebbe dire disegnare
 *    un'immagine della comprensione al posto della comprensione. Il modello
 *    vero c'e' gia': si accende lui, progressivamente.
 *
 * LA SCELTA VISIVA — e la decide Raffaella, 06/09:
 *   «Se questi pixel hanno i colori di EIDETICA su un fondo bello, non ce ne
 *    frega niente che non rispecchino i colori del modello: l'importante e' che
 *    facciano vedere come il modello guarda la realta'.»
 *
 * Quindi **la stanza si abbassa e i colori si accendono.** La piattaforma e'
 * chiara («il vestito e' carta», 05/09) e su carta il marchio non puo'
 * brillare: al massimo si deposita. Il film si prende il suo fondo profondo per
 * la durata del film, e **alla fine la luce torna** — la piattaforma resta
 * quella di sempre, il buio e' un momento, non una scelta di prodotto.
 *
 * ⚠️ **E LA RIGA CHE NON SI ATTRAVERSA, che e' quella che fa vendere il
 *    referto: i COLORI sono liberi, le POSIZIONI no.** Ogni punto sta dove e'
 *    stato misurato, al millimetro. Si puo' rendere bella la rappresentazione,
 *    mai la conclusione (direttiva 10). Un fondo scuro non afferma niente sullo
 *    spazio; un punto spostato per far scena si'.
 *
 * E' UNO STRATO. `window.veritasCinema.spegni()` e la scena torna com'era:
 * nessun oggetto aggiunto resta, nessun materiale resta modificato.
 */

const MARCA = {
  // I quattro colori del marchio EIDETICA, nell'ordine dell'iride.
  blu:      [0.18, 0.36, 1.00],
  viola:    [0.48, 0.25, 0.89],
  magenta:  [0.88, 0.15, 0.60],
  arancio:  [0.96, 0.65, 0.14],
};
const SCALA = [MARCA.blu, MARCA.viola, MARCA.magenta, MARCA.arancio];

const T = {
  polvere:      1.2,   // s — la polvere compare
  condensa:     4.2,   // s — i punti raggiungono la loro posizione misurata
  respiro:      0.9,   // s — l'assestamento prima che l'occhio cominci
  discesa:      2.4,   // s — la camera scende dentro il corpo di chi cammina
  passeggiata: 55.0,   // s — quanto dura il cammino, dal primo all'ultimo passo
};

const stato = {
  acceso: false,
  gruppo: null,
  punti: null,
  geom: null,
  materiale: null,
  partenza: 0,
  fase: 'spento',
  raf: null,
  velature: [],        // opacita' originali, per rimetterle
  cartelli: null,
  viste: 0,
  ultimaVista: null,
  vive: [],            // le viste arrivate: {x, z, t}
  fondoPrima: null,
  fogColorePrima: null,
  cssPadrePrima: null,
  cielo: null,
  via: null,
  scoperti: 0,
  cameraPrima: null,
  controlliPrima: null,
  ultimoRacconto: 0,
};

// ---------------------------------------------------------------------------
// Le maniglie della pagina. Se manca qualcosa non si finge: si dice e si esce.
// ---------------------------------------------------------------------------
function pagina() {
  const THREE = window.THREE;
  const scena = window.__veritasScene;
  const camera = window.__veritasCamera;
  const tela = window.__veritasCanvasEl;
  const punti = window.__veritasAutoPoints || [];
  if (!THREE || !scena || !camera || !tela) return null;
  return { THREE, scena, camera, tela, punti };
}

// ---------------------------------------------------------------------------
// La polvere: un punto per ogni punto MISURATO dello spazio navigabile.
//
// Ogni punto ha due posizioni: da dove arriva (sparso, alto, senza forma) e
// dove sta davvero (la misura). Fra le due si interpola, e quella e' tutta
// l'animazione della condensazione: nessun numero inventato, solo il vero
// raggiunto piu' o meno tardi.
// ---------------------------------------------------------------------------
function costruisciPolvere(p) {
  const { THREE, punti } = p;
  const n = punti.length;
  if (!n) return null;

  const pos = new Float32Array(n * 3);      // posizione corrente (animata)
  const meta = new Float32Array(n * 3);     // dove sta davvero: la misura
  const nasce = new Float32Array(n * 3);    // da dove arriva
  const col = new Float32Array(n * 3);
  const rit = new Float32Array(n);          // ritardo: la polvere non arriva tutta insieme
  const dim = new Float32Array(n);

  // L'ingombro serve solo a far nascere la polvere ATTORNO allo spazio, non
  // dentro: cosi' si vede arrivare da fuori, come una cosa che si scopre.
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, maxY = -Infinity;
  for (const q of punti) {
    if (q[0] < minX) minX = q[0]; if (q[0] > maxX) maxX = q[0];
    if (q[2] < minZ) minZ = q[2]; if (q[2] > maxZ) maxZ = q[2];
    if (q[1] > maxY) maxY = q[1];
  }
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const raggio = Math.max(maxX - minX, maxZ - minZ) * 0.75;

  // Seme fisso: la stessa scena due volte deve fare lo stesso film.
  let seme = 20260906;
  const caso = () => { seme = (seme * 1664525 + 1013904223) % 4294967296; return seme / 4294967296; };

  for (let i = 0; i < n; i++) {
    const q = punti[i];
    meta[i * 3] = q[0]; meta[i * 3 + 1] = q[1]; meta[i * 3 + 2] = q[2];

    // Nasce su una cupola attorno allo spazio: angolo casuale, quota alta.
    const a = caso() * Math.PI * 2;
    const r = raggio * (0.8 + caso() * 0.7);
    nasce[i * 3]     = cx + Math.cos(a) * r;
    nasce[i * 3 + 1] = maxY + 6 + caso() * 22;
    nasce[i * 3 + 2] = cz + Math.sin(a) * r;

    pos[i * 3] = nasce[i * 3]; pos[i * 3 + 1] = nasce[i * 3 + 1]; pos[i * 3 + 2] = nasce[i * 3 + 2];

    // Il ritardo segue la POSIZIONE, non il caso: la conoscenza si deposita da
    // una parte all'altra dello spazio, come uno sguardo che lo percorre.
    const t = (q[0] - minX) / Math.max(1e-6, maxX - minX);
    rit[i] = Math.min(0.85, Math.max(0, t * 0.55 + caso() * 0.3));

    // Il colore viene dal marchio, e la posizione lungo l'edificio sceglie
    // dove si sta nell'iride: blu -> viola -> magenta -> arancio.
    const g = t * (SCALA.length - 1);
    const k = Math.min(SCALA.length - 2, Math.floor(g));
    const f = g - k;
    col[i * 3]     = SCALA[k][0] * (1 - f) + SCALA[k + 1][0] * f;
    col[i * 3 + 1] = SCALA[k][1] * (1 - f) + SCALA[k + 1][1] * f;
    col[i * 3 + 2] = SCALA[k][2] * (1 - f) + SCALA[k + 1][2] * f;

    // ⚠️ Il raggio e' in METRI, non in pixel. Un punto scritto in pixel e'
    //    tarato sulla distanza a cui stava la telecamera quando l'hai provato:
    //    misurato il 06/09, con la formula a pixel un punto veniva 0,38 px,
    //    cioe' invisibile. Un raggio in metri si comporta come una cosa vera.
    dim[i] = 0.30 + caso() * 0.26;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geom.setAttribute('tinta', new THREE.BufferAttribute(col, 3));
  geom.setAttribute('dimensione', new THREE.BufferAttribute(dim, 1));
  // ⚠️ QUANTO E' STATO SCOPERTO, per punto. 0 = il corpo non ci e' ancora
  //    passato davanti, 1 = l'ha incontrato. E' la direttiva 9 fatta numero:
  //    «la comprensione compare dove il corpo la incontra», e il buio dove non
  //    si e' ancora guardato NON e' un buco, e' un'informazione.
  geom.setAttribute('scoperto', new THREE.BufferAttribute(new Float32Array(n), 1));
  geom.userData = { meta, nasce, rit, n };

  // ⚠️ ADDITIVO, e si puo' perche' il film si prende un fondo scuro suo.
  //    Su carta l'additivo schiarisce e basta; sul profondo e' luce che si
  //    somma — due punti vicini fanno piu' luce di uno, ed e' esattamente cio'
  //    che si vuole vedere: dove la conoscenza si infittisce, la scena brucia.
  const materiale = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      opacitaGlobale: { value: 0 },
      // altezza della tela in pixel / (2*tan(fov/2)): la conversione standard
      // fra un raggio in metri e la sua dimensione a schermo. Si aggiorna a
      // ogni fotogramma, perche' la finestra si ridimensiona.
      scalaPixel: { value: 900.0 },
    },
    // ⚠️ Il colore si chiama `tinta` e si DICHIARA qui. Chiamarlo `color` e
    //    affidarsi a `vertexColors` funziona solo nei materiali di serie di
    //    three: in uno shader scritto a mano quell'attributo puo' non essere
    //    dichiarato dal prefisso, e il modulo non compila senza dire perche'.
    vertexShader: `
      attribute float dimensione;
      attribute vec3 tinta;
      attribute float scoperto;
      varying vec3 vColore;
      varying float vVicino;
      varying float vScoperto;
      uniform float scalaPixel;
      void main() {
        vColore = tinta;
        vScoperto = scoperto;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float d = max(0.001, -mv.z);
        // Un minimo di due pixel: sotto, la polvere sparisce e il film non
        // c'e' piu'. Un massimo, o da vicino un punto diventa una macchia.
        // Un punto non ancora incontrato resta piccolo e spento: c'e', ma non
        // afferma niente. Quando il corpo ci passa davanti, cresce e si accende.
        gl_PointSize = clamp(dimensione * scalaPixel / d, 1.5, 18.0) * (0.45 + 0.55 * scoperto);
        vVicino = clamp(30.0 / d, 0.25, 1.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vColore;
      varying float vVicino;
      varying float vScoperto;
      uniform float opacitaGlobale;
      void main() {
        // Un nucleo acceso con l'alone attorno: sommandosi, dove i punti si
        // infittiscono la scena brucia. E' cosi' che si vede a occhio DOVE la
        // conoscenza e' densa, senza scrivere un numero.
        vec2 d = gl_PointCoord - vec2(0.5);
        float r = length(d) * 2.0;
        if (r > 1.0) discard;
        float alone   = pow(1.0 - r, 2.2);
        float nucleo  = pow(max(0.0, 1.0 - r * 2.6), 3.0);
        // ⚠️ INCHIOSTRO, NON NEON. Il film si gira sulla carta grigia della
        //    piattaforma: l'additivo li' schiarisce e la polvere sparisce.
        //    Quindi colore pieno, e il nucleo si SCURISCE invece di accendersi.
        //    Non scoperto: un grigio appena piu' scuro della carta — «qui c'e'
        //    qualcosa, non so ancora cosa». Scoperto: il colore del marchio.
        vec3  spento  = vec3(0.62, 0.64, 0.69);
        vec3  acceso  = vColore * (1.0 - nucleo * 0.28);
        vec3  finale  = mix(spento, acceso, vScoperto);
        float forza   = mix(0.34, 1.0, vScoperto);
        gl_FragColor = vec4(finale, min(1.0, (alone * 0.55 + nucleo * 1.15)) * opacitaGlobale * vVicino * forza);
      }
    `,
  });

  const oggetto = new THREE.Points(geom, materiale);
  oggetto.frustumCulled = false;
  oggetto.name = '__eideticaCinema';
  return { oggetto, geom, materiale };
}

// ---------------------------------------------------------------------------
// IL CIELO DEL FILM, e sta DENTRO la scena.
//
// ⚠️ Misurato il 06/09, dopo due tentativi sbagliati: `scene.background` non si
//    vede (la tela e' trasparente, clear alpha = 0) e il bianco non viene dal
//    genitore della tela — sta piu' su, in un contenitore che non e' mio. Ogni
//    strada che passa dal DOM e' una gara con `veritas_carta`, e la perde chi
//    disegna per primo. Una sfera rovesciata dentro la scena invece non la puo'
//    riscrivere nessuno: e' geometria, come tutto il resto qui dentro.
// ---------------------------------------------------------------------------
function costruisciCielo(THREE, raggio) {
  const g = new THREE.SphereGeometry(Math.max(400, raggio * 6), 32, 24);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, transparent: true,
    uniforms: { velo: { value: 0 } },
    vertexShader: `
      varying vec3 vP;
      void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
    `,
    fragmentShader: `
      varying vec3 vP;
      uniform float velo;
      void main() {
        // Dal blu notte all'alto al quasi-nero in basso: profondita', non nero
        // piatto. Il nero spegne le tinte del marchio; questo le tiene vive.
        float h = clamp(vP.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 alto  = vec3(0.078, 0.094, 0.176);
        vec3 basso = vec3(0.016, 0.020, 0.043);
        gl_FragColor = vec4(mix(basso, alto, h), velo);
      }
    `,
  });
  const sfera = new THREE.Mesh(g, m);
  sfera.name = '__eideticaCielo';
  sfera.renderOrder = -1000;
  sfera.frustumCulled = false;
  return sfera;
}

// ---------------------------------------------------------------------------
// Il modello vero fa un passo indietro mentre la polvere parla, e torna dopo.
// ⚠️ Si conservano le opacita' ORIGINALI e si rimettono allo spegnimento: uno
//    strato che non sa tornare indietro non e' uno strato, e' un danno.
// ---------------------------------------------------------------------------
function velaIlModello(fattore) {
  const radice = window.__veritasModelRoot;
  if (!radice) return;
  if (!stato.velature.length) {
    radice.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        stato.velature.push({ m, opacity: m.opacity, transparent: m.transparent });
      }
    });
  }
  for (const v of stato.velature) {
    v.m.transparent = true;
    v.m.opacity = v.opacity * fattore;
    v.m.needsUpdate = true;
  }
}
// ---------------------------------------------------------------------------
// LA STANZA SI ABBASSA — deciso da Raffaella il 06/09: «un fondo bello».
//
// Per la durata del film il fondo va sul profondo, cosi' i colori del marchio
// possono BRILLARE invece che depositarsi. Alla fine la luce torna: la
// piattaforma resta chiara, il buio e' un momento e non una scelta di prodotto.
// ⚠️ Si conserva ESATTAMENTE quello che c'era, foschia compresa: `veritas_carta`
//    ha lavorato per allineare la foschia al colore dell'aria, e riaccendere la
//    luce con la foschia sbagliata rimetterebbe il nero sul modello — il difetto
//    gia' pagato il 05/09.
// ---------------------------------------------------------------------------
const FONDO_FILM = 0x0b0d16;   // blu notte, non nero: il nero spegne le tinte
function abbassaLaStanza() {
  const scena = window.__veritasScene, THREE = window.THREE;
  if (!scena || !THREE) return;
  stato.fondoPrima = { background: scena.background, fog: scena.fog };
  scena.background = new THREE.Color(FONDO_FILM);
  if (scena.fog) {
    stato.fogColorePrima = scena.fog.color ? scena.fog.color.clone() : null;
    if (scena.fog.color) scena.fog.color.setHex(FONDO_FILM);
  }
}
function rialzaLaStanza() {
  const tela = window.__veritasCanvasEl;
  const padre = tela && tela.parentElement;
  if (padre && stato.cssPadrePrima !== null) {
    padre.style.background = stato.cssPadrePrima;
    stato.cssPadrePrima = null;
  }
  const scena = window.__veritasScene;
  if (!scena || !stato.fondoPrima) return;
  scena.background = stato.fondoPrima.background;
  if (scena.fog && stato.fogColorePrima) scena.fog.color.copy(stato.fogColorePrima);
  stato.fondoPrima = null; stato.fogColorePrima = null;
}

// ⚠️ IL FONDO VERO NON E' `scene.background` — misurato il 06/09.
//    La tela e' trasparente (clear alpha = 0) e dietro c'e' il BIANCO della
//    pagina: mettere il colore sulla scena non serviva a niente, e in additivo
//    «colore + bianco = bianco», cioe' la polvere c'era ed era invisibile.
//    Il fondo si prende dove il fondo sta davvero: sotto la tela.
function tieniIlFondo() {
  const scena = window.__veritasScena || window.__veritasScene, THREE = window.THREE;
  const tela = window.__veritasCanvasEl;
  const padre = tela && tela.parentElement;
  if (padre && stato.cssPadrePrima === null) {
    stato.cssPadrePrima = padre.style.background || '';
    padre.style.transition = 'background 1.1s ease';
    padre.style.background =
      'radial-gradient(120% 90% at 50% 40%, #141833 0%, #0b0d16 55%, #05060c 100%)';
  }
  if (!scena || !THREE) return;
  if (!scena.background || scena.background.getHex() !== FONDO_FILM) {
    if (!scena.background || !scena.background.isColor) scena.background = new THREE.Color(FONDO_FILM);
    else scena.background.setHex(FONDO_FILM);
  }
  if (scena.fog && scena.fog.color && scena.fog.color.getHex() !== FONDO_FILM)
    scena.fog.color.setHex(FONDO_FILM);
}

function aggiornaScalaPixel() {
  const c = window.__veritasCamera, tela = window.__veritasCanvasEl;
  if (!c || !tela || !stato.materiale) return;
  const h = tela.clientHeight || tela.height || 800;
  const fov = (c.fov || 50) * Math.PI / 180;
  stato.materiale.uniforms.scalaPixel.value = h / (2 * Math.tan(fov / 2));
}

function rimettiIlModello() {
  for (const v of stato.velature) {
    v.m.opacity = v.opacity;
    v.m.transparent = v.transparent;
    v.m.needsUpdate = true;
  }
  stato.velature = [];
}

// ---------------------------------------------------------------------------
// LA SOGGETTIVA — chiesta da Raffaella il 06/09.
//
//   «Perche' il film non lo facciamo partire in soggettiva, partendo proprio
//    dall'occhio di uno degli agenti dentro? Cosi' hai la definizione degli
//    oggetti man mano che quello cammina, come fanno i motori dei videogiochi:
//    renderizzano la parte del cono visivo, e pian piano la gente capisce,
//    mette cartellini e quant'altro.»
//
// E' la direttiva 9, ed e' **onesta di natura**: la comprensione compare dove
// il corpo la incontra, e dove il corpo non e' ancora passato resta buio — che
// non e' un buco, e' un'informazione.
//
// ⚠️ IL CAMMINO NON SI INVENTA: e' la traiettoria vera della simulazione
//    (`__veritasGetTrajectory`). Se non c'e' ancora, il film resta dall'alto e
//    LO DICE, invece di far camminare un fantasma su un percorso finto.
// ---------------------------------------------------------------------------
// ⚠️ CHI GUARDA E' UN PARAMETRO DICHIARATO, non un numero nascosto.
//    Raffaella, 06/09: «dobbiamo targettizzare chi e' il nostro osservatore:
//    potremmo valutare di mettere quello sulla sedia a rotelle. Adesso facciamo
//    il caso tipo, pero' tieni a mente che possiamo dire chi e' l'attore.»
//
//    Gli archetipi NON si riscrivono qui: esistono gia' in `veritas_visibility`
//    (`business` occhio 1,65 · `wheelchair` 1,20 · `tourist` 1,65), sono gli
//    stessi con cui si calcola l'isovista, e sono la ragione per cui il referto
//    7 promette «la stessa pianta a 1,65 m e a 1,20 m». Due registri di altezze
//    d'occhio che divergono sarebbero due verita' sullo stesso spazio.
const ATTORE_PREDEFINITO = 'business';
function attore(nome) {
  const reg = (window.__veritasVisibility && window.__veritasVisibility.SKINS)
           || (window.__veritasSkins) || null;
  const k = nome || stato.attore || ATTORE_PREDEFINITO;
  if (reg && reg[k]) return { chiave: k, occhio: reg[k].eyeHeight, nome: reg[k].label || k };
  // Ripiego dichiarato: se il registro non e' esposto, si usano le due quote
  // che il prodotto promette per iscritto, e si DICE che sono un ripiego.
  const fallback = { business: 1.65, wheelchair: 1.20, tourist: 1.65 };
  return { chiave: k, occhio: fallback[k] || 1.65, nome: k, ripiego: true };
}

// ⚠️ LA LENTE E' 60 GRADI, e non e' il cono percettivo.
//    Raffaella, 06/09: «nei programmi di rendering, per ricreare la sensazione
//    dell'occhio dell'uomo si usa un'apertura di sessanta gradi». E' vero, ed e'
//    una cosa DIVERSA dai 100-140 gradi che `veritas_visibility` usa per
//    l'isovista: quelli dicono quanto spazio una persona percepisce, questi
//    dicono che lente stiamo montando. Confonderli darebbe una soggettiva da
//    grandangolo, che deforma e fa sembrare tutto piu' lontano.
const LENTE_GRADI = 60;
const CONO_GRADI = 62;      // quanto il corpo INCONTRA camminando
const CONO_PORTATA = 26;    // m — oltre, il dettaglio non si legge

function trovaIlCammino() {
  let t = null;
  try { t = window.__veritasGetTrajectory && window.__veritasGetTrajectory(); } catch (e) { t = null; }
  if (!t) return null;
  // La traiettoria puo' arrivare in due forme: fotogrammi di agenti, o agenti
  // con i loro fotogrammi. Si accettano tutte e due, senza indovinare.
  const frames = t.frames || t.fotogrammi || (Array.isArray(t) ? t : null);
  if (!Array.isArray(frames) || !frames.length) return null;
  const via = [];
  for (const f of frames) {
    const a = Array.isArray(f) ? f[0] : (f && (f.agents || f.agenti) ? (f.agents || f.agenti)[0] : null);
    if (!a) continue;
    const x = Array.isArray(a) ? a[0] : (a.x != null ? a.x : (a.pos && a.pos[0]));
    const y = Array.isArray(a) ? a[1] : (a.y != null ? a.y : (a.pos && a.pos[1]));
    const z = Array.isArray(a) ? a[2] : (a.z != null ? a.z : (a.pos && a.pos[2]));
    if (typeof x === 'number' && typeof z === 'number') via.push([x, typeof y === 'number' ? y : 0, z]);
  }
  return via.length > 8 ? via : null;
}

function guidaLOcchio(u) {
  const via = stato.via, c = window.__veritasCamera;
  if (!via || !c) return null;
  const OCCHIO_H = attore().occhio;
  const i = Math.min(via.length - 2, Math.floor(u * (via.length - 1)));
  const f = u * (via.length - 1) - i;
  const a = via[i], b = via[i + 1];
  const px = a[0] + (b[0] - a[0]) * f;
  const py = a[1] + (b[1] - a[1]) * f;
  const pz = a[2] + (b[2] - a[2]) * f;
  // Si guarda avanti lungo il cammino, non a caso: e' il verso in cui il corpo
  // sta andando, ed e' quello che decide che cosa incontra.
  const avanti = via[Math.min(via.length - 1, i + 6)];
  c.position.set(px, py + OCCHIO_H, pz);
  // ⚠️ SI GUARDA DRITTO, non in giu'. Mirare piu' in basso dell'occhio inclina
  //    la camera, e una camera inclinata in giu' si legge come «sto in alto»:
  //    misurato il 06/09, l'altezza era giusta (1,61 m sul pavimento) e
  //    sembrava sbagliata solo per questo.
  c.lookAt(avanti[0], avanti[1] + OCCHIO_H, avanti[2]);
  c.updateMatrixWorld();
  return [px, py, pz];
}

// Scopre i punti che il corpo si trova davanti, e non li rispegne mai piu'.
function scopriNelCono(dove) {
  const g = stato.geom; if (!g || !dove) return 0;
  const c = window.__veritasCamera; if (!c) return 0;
  const { meta, n } = g.userData;
  const sc = g.attributes.scoperto.array;
  const d = new window.THREE.Vector3(0, 0, -1).applyQuaternion(c.quaternion);
  const cosMax = Math.cos(CONO_GRADI * Math.PI / 360);
  let nuovi = 0;
  for (let i = 0; i < n; i++) {
    if (sc[i] >= 1) continue;
    const vx = meta[i * 3] - dove[0], vz = meta[i * 3 + 2] - dove[2];
    const dist = Math.hypot(vx, vz);
    if (dist > CONO_PORTATA || dist < 0.001) continue;
    if ((vx * d.x + vz * d.z) / dist < cosMax) continue;
    sc[i] = 1; nuovi++;
  }
  if (nuovi) g.attributes.scoperto.needsUpdate = true;
  return nuovi;
}

// ---------------------------------------------------------------------------
// La riga che racconta. Dice SEMPRE lo stato vero, e quando non sa, lo dice.
// ---------------------------------------------------------------------------
function costruisciCartelli(p) {
  const d = document.createElement('div');
  d.id = 'eidetica-cinema-cartelli';
  d.style.cssText = [
    'position:absolute', 'left:28px', 'bottom:232px', 'z-index:9200', 'max-width:44%',
    'pointer-events:none', 'font-family:Jura,Inter,system-ui,sans-serif',
    'color:#1b1d23', 'opacity:0', 'transition:opacity .8s ease',
    'text-shadow:0 1px 0 rgba(255,255,255,.9)',
  ].join(';');
  d.innerHTML = `
    <div id="eidetica-cinema-atto" style="font-size:11px;letter-spacing:.22em;
         text-transform:uppercase;opacity:.55;margin-bottom:6px"></div>
    <div id="eidetica-cinema-riga" style="font-size:19px;font-weight:600;
         letter-spacing:.01em;line-height:1.3"></div>
    <div id="eidetica-cinema-nota" style="font-size:12px;opacity:.6;margin-top:5px"></div>`;
  (p.tela.parentElement || document.body).appendChild(d);
  return d;
}
function racconta(atto, riga, nota) {
  if (!stato.cartelli) return;
  stato.cartelli.style.opacity = '1';
  const a = stato.cartelli.querySelector('#eidetica-cinema-atto');
  const r = stato.cartelli.querySelector('#eidetica-cinema-riga');
  const n = stato.cartelli.querySelector('#eidetica-cinema-nota');
  if (a) a.textContent = atto || '';
  if (r) r.textContent = riga || '';
  if (n) n.textContent = nota || '';
}

// ---------------------------------------------------------------------------
// Il film. Ogni fotogramma legge il tempo e lo STATO VERO, e basta.
// ---------------------------------------------------------------------------
function fotogramma() {
  if (!stato.acceso) return;
  const ora = (performance.now() - stato.partenza) / 1000;

  // ⚠️ IL FONDO SI TIENE A OGNI FOTOGRAMMA. `veritas_carta` riscrive il colore
  //    della scena per conto suo: metterlo una volta sola all'avvio non basta,
  //    misurato il 06/09 — dopo due secondi era gia' tornato chiaro.
  tieniIlFondo();
  aggiornaScalaPixel();
  const g = stato.geom;
  if (!g) return;
  const { meta, nasce, rit, n } = g.userData;
  const pos = g.attributes.position.array;

  const morbido = (x) => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3);
  if (stato.cielo && ora < T.polvere + T.condensa)
    stato.cielo.material.uniforms.velo.value = Math.min(1, ora / 0.9);

  // ATTO 1 — la polvere compare.
  if (ora < T.polvere) {
    stato.materiale.uniforms.opacitaGlobale.value = morbido(ora / T.polvere) * 0.92;
    if (stato.fase !== 'polvere') {
      stato.fase = 'polvere';
      racconta('atto primo', 'Non so ancora che posto sia questo.',
               (window.__veritasAutoPoints || []).length.toLocaleString('it-IT') + ' punti misurati, ancora senza forma');
    }
  }
  // ATTO 2 — la condensazione: ogni punto raggiunge la sua misura.
  else if (ora < T.polvere + T.condensa) {
    const u = (ora - T.polvere) / T.condensa;
    if (stato.fase !== 'condensa') {
      stato.fase = 'condensa';
      racconta('atto secondo', 'Lo spazio prende forma.',
               'ogni punto va dove è stato misurato — nessuna posizione è inventata');
    }
    for (let i = 0; i < n; i++) {
      const t = morbido(Math.min(1, Math.max(0, (u - rit[i]) / (1 - rit[i] + 1e-6))));
      pos[i * 3]     = nasce[i * 3]     + (meta[i * 3]     - nasce[i * 3])     * t;
      pos[i * 3 + 1] = nasce[i * 3 + 1] + (meta[i * 3 + 1] - nasce[i * 3 + 1]) * t;
      pos[i * 3 + 2] = nasce[i * 3 + 2] + (meta[i * 3 + 2] - nasce[i * 3 + 2]) * t;
    }
    g.attributes.position.needsUpdate = true;
    stato.materiale.uniforms.opacitaGlobale.value = 0.92;
    velaIlModello(0.30 + 0.12 * u);
  }
  // ATTO 3 — SI ENTRA NEL CORPO. La camera scende agli occhi di chi cammina.
  else {
    if (stato.fase !== 'sguardo') {
      stato.fase = 'sguardo';
      for (let i = 0; i < n * 3; i++) pos[i] = meta[i];
      g.attributes.position.needsUpdate = true;
      racconta('atto terzo',
        stato.via ? 'Adesso ci cammino dentro.' : 'Adesso guardo.',
        stato.via
          ? 'la camera scende sugli occhi di un passeggero — cammino vero della simulazione'
          : '⚠️ non c’è ancora una traiettoria: resto dall’alto invece di far camminare un fantasma');
    }
    stato.materiale.uniforms.opacitaGlobale.value = 0.90 + 0.06 * Math.sin(ora * 1.6);
    velaIlModello(0.42);
    if (stato.cielo) stato.cielo.material.uniforms.velo.value =
      Math.min(1, (ora - T.polvere - T.condensa) / 1.2);
    if (!stato.cielo && stato.cartelli) stato.cartelli.style.color = '#1b1d23';

    if (stato.via) {
      const t3 = ora - (T.polvere + T.condensa);
      if (t3 < T.discesa) {
        // La discesa: dalla veduta d'insieme fino agli occhi. Si scende, non si
        // salta: un taglio secco farebbe perdere l'orientamento a chi guarda.
        const u = morbido(t3 / T.discesa);
        const c = window.__veritasCamera;
        const meta0 = stato.via[0];
        const hOcchio = attore().occhio;
        c.position.lerpVectors(stato.cameraPrima.pos,
          new window.THREE.Vector3(meta0[0], meta0[1] + hOcchio, meta0[2]), u);
        const q = c.quaternion.clone();
        c.lookAt(stato.via[Math.min(stato.via.length - 1, 6)][0],
                 meta0[1] + hOcchio, stato.via[Math.min(stato.via.length - 1, 6)][2]);
        c.quaternion.slerpQuaternions(stato.cameraPrima.quat, c.quaternion.clone(), u);
        c.quaternion.copy(q.slerp(c.quaternion, u));
        c.updateMatrixWorld();
      } else {
        const u = Math.min(1, (t3 - T.discesa) / T.passeggiata);
        const dove = guidaLOcchio(u);
        const nuovi = scopriNelCono(dove);
        stato.scoperti = (stato.scoperti || 0) + nuovi;
        if (nuovi && (performance.now() - (stato.ultimoRacconto || 0)) > 900) {
          stato.ultimoRacconto = performance.now();
          const tot = g.userData.n;
          racconta('atto terzo', 'Cammino, e lo spazio si apre davanti a me.',
            stato.scoperti.toLocaleString('it-IT') + ' punti su ' + tot.toLocaleString('it-IT')
            + ' incontrati dal corpo — il resto è buio perché non ci sono ancora passato');
        }
        if (u >= 1 && stato.fase !== 'finito') {
          stato.fase = 'finito';
          racconta('e adesso lo so',
            'Ho attraversato lo spazio.',
            stato.scoperti.toLocaleString('it-IT') + ' punti incontrati camminando · '
            + 'nessuna posizione è inventata');
        }
      }
    }
  }

  stato.raf = requestAnimationFrame(fotogramma);
}

function raccontaSguardo() {
  const v = stato.ultimaVista;
  if (!v) {
    racconta('atto terzo', 'Adesso guardo.',
             'l’occhio si annuncia a ogni vista finita — questa riga cambia da sola');
    return;
  }
  const quante = v.quante != null ? v.quante : null;
  racconta('atto terzo',
    v.titolo || 'Ho guardato una vista.',
    (quante != null ? quante + ' cose viste' : 'nessuna cosa riconosciuta')
    + (v.pixelPerMetro ? ' · ' + Math.round(v.pixelPerMetro) + ' pixel al metro' : '')
    + ' · vista ' + stato.viste);
}

// ---------------------------------------------------------------------------
// L'aggancio all'occhio: l'evento c'e' gia' dal 05/09 e nessuno lo ascoltava.
// ⚠️ Qui NON si mette le mani dentro il giro dell'occhio: si ascolta e basta.
// ---------------------------------------------------------------------------
function ascoltaLOcchio() {
  window.addEventListener('veritas:vista', (e) => {
    if (!stato.acceso) return;
    const d = (e && e.detail) || {};
    stato.viste++;
    const cose = d.trovate || d.rilevazioni || d.viste || null;
    stato.ultimaVista = {
      titolo: d.nome || d.etichetta || 'Ho guardato una vista.',
      quante: Array.isArray(cose) ? cose.length : (typeof cose === 'number' ? cose : null),
      pixelPerMetro: d.pixelPerMetro || null,
    };
    raccontaSguardo();
  });
}

// ---------------------------------------------------------------------------
// Il marchio diventa cliccabile. Idea di Raffaella, 06/09.
// ---------------------------------------------------------------------------
function preparaIlMarchio() {
  const img = [...document.querySelectorAll('img')]
    .find((i) => /eidetica/i.test(i.src) && i.getBoundingClientRect().width > 40);
  if (!img) return null;
  img.style.cursor = 'pointer';
  img.title = 'EIDETICA — guarda come si forma la conoscenza';
  img.style.transition = 'filter .4s ease, transform .4s ease';
  img.addEventListener('mouseenter', () => {
    img.style.filter = 'drop-shadow(0 0 14px rgba(123,63,228,.45))';
    img.style.transform = 'scale(1.04)';
  });
  img.addEventListener('mouseleave', () => {
    img.style.filter = ''; img.style.transform = '';
  });
  img.addEventListener('click', () => {
    if (stato.acceso) ferma(); else avvia();
  });
  return img;
}

// ---------------------------------------------------------------------------
export function avvia(opz) {
  if (stato.acceso) return true;
  const p = pagina();
  if (!p) { console.warn('[EIDETICA cinema] la scena non è pronta: non parte'); return false; }
  if (!p.punti.length) {
    console.warn('[EIDETICA cinema] non c’è ancora una nuvola misurata: '
      + 'il film racconta lo spazio, e senza misure non c’è niente da raccontare');
    return false;
  }
  const costruito = costruisciPolvere(p);
  if (!costruito) return false;

  stato.gruppo = new p.THREE.Group();
  stato.gruppo.name = '__eideticaCinemaGruppo';
  stato.gruppo.add(costruito.oggetto);

  // Il cielo del film, dentro la scena: nessuno lo puo' riscrivere.
  let raggio = 200;
  try {
    const b = new p.THREE.Box3().setFromObject(window.__veritasModelRoot);
    raggio = Math.max(50, b.getSize(new p.THREE.Vector3()).length());
  } catch (e) {}
  // ⚠️ NIENTE CIELO SCURO — deciso da Raffaella il 06/09: «questo nero non mi
  //    piace: farei lo schermo grigio, e poi la scena grigia dove precipitano
  //    questi pixel colorati». Il film si gira dentro la carta della
  //    piattaforma, e la polvere ci si deposita sopra come inchiostro.
  //    (`costruisciCielo` resta scritta: se un giorno servira' una versione da
  //     proiettare al buio, e' li' e si accende con `opz.cielo`.)
  if (opz && opz.cielo) { stato.cielo = costruisciCielo(p.THREE, raggio); stato.gruppo.add(stato.cielo); }
  p.scena.add(stato.gruppo);

  // Il cammino vero. Se non c'e', il film si fa dall'alto e LO DICE.
  stato.via = trovaIlCammino();
  stato.cameraPrima = {
    pos: p.camera.position.clone(),
    quat: p.camera.quaternion.clone(),
    fov: p.camera.fov,
  };
  stato.controlliPrima = null;
  try {
    const ctr = window.__veritasControls;
    if (ctr && 'enabled' in ctr) { stato.controlliPrima = ctr.enabled; ctr.enabled = false; }
  } catch (e) {}

  stato.punti = costruito.oggetto;
  stato.geom = costruito.geom;
  stato.materiale = costruito.materiale;
  stato.cartelli = costruisciCartelli(p);
  try { p.camera.fov = LENTE_GRADI; p.camera.updateProjectionMatrix(); } catch (e) {}
  stato.partenza = performance.now();
  stato.fase = 'spento';
  stato.viste = 0;
  stato.acceso = true;

  console.log('[EIDETICA cinema] parte: ' + p.punti.length.toLocaleString('it-IT')
    + ' punti misurati. Lo guida lo stato vero, non un effetto.');
  fotogramma();
  return true;
}

export function ferma() {
  if (!stato.acceso) return;
  stato.acceso = false;
  if (stato.raf) cancelAnimationFrame(stato.raf);
  stato.raf = null;
  const scena = window.__veritasScene;
  if (scena && stato.gruppo) scena.remove(stato.gruppo);
  if (stato.geom) stato.geom.dispose();
  if (stato.materiale) stato.materiale.dispose();
  if (stato.cartelli && stato.cartelli.parentElement)
    stato.cartelli.parentElement.removeChild(stato.cartelli);
  // La camera torna dove stava: un film che ti lascia dentro un muro non e' un
  // film, e' un danno.
  try {
    const c = window.__veritasCamera;
    if (c && stato.cameraPrima) {
      c.position.copy(stato.cameraPrima.pos);
      c.quaternion.copy(stato.cameraPrima.quat);
      if (stato.cameraPrima.fov != null) { c.fov = stato.cameraPrima.fov; c.updateProjectionMatrix(); }
      c.updateMatrixWorld();
    }
    const ctr = window.__veritasControls;
    if (ctr && stato.controlliPrima !== null && 'enabled' in ctr) ctr.enabled = stato.controlliPrima;
  } catch (e) {}
  stato.cameraPrima = null; stato.controlliPrima = null;
  stato.cielo = null; stato.via = null; stato.scoperti = 0;
  rialzaLaStanza();
  rimettiIlModello();
  stato.gruppo = stato.punti = stato.geom = stato.materiale = stato.cartelli = null;
  stato.fase = 'spento';
  console.log('[EIDETICA cinema] fermo. La scena è tornata com’era.');
}

export const spegni = ferma;

if (typeof window !== 'undefined') {
  window.veritasCinema = { avvia, ferma, spegni: ferma, stato: () => ({ ...stato, geom: undefined, materiale: undefined, gruppo: undefined, punti: undefined, cartelli: undefined }) };
  ascoltaLOcchio();
  // Il marchio puo' non esserci ancora quando questo modulo si carica.
  const prova = (n) => {
    if (preparaIlMarchio()) {
      console.log('[EIDETICA cinema] pronto — il marchio è cliccabile, oppure window.veritasCinema.avvia()');
      return;
    }
    if (n < 40) setTimeout(() => prova(n + 1), 500);
    else console.log('[EIDETICA cinema] pronto — window.veritasCinema.avvia() (il marchio non l’ho trovato)');
  };
  prova(0);
}
