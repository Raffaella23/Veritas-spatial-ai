/**
 * EIDETICA — LA RICOMPOSIZIONE DELLO SPAZIO
 * =============================================================================
 *
 * ⚠️ LA GRAMMATICA DI QUESTO FILM NON L'HA INVENTATA CHI SCRIVE CODICE.
 *    Raffaella, 06/09/2026, ha scritto un prototipo intero — «Eidetica —
 *    ricomposizione dello spazio», HTML e canvas — e l'ha consegnato dicendo:
 *    *«ho creato questa simulazione, conclude sempre con i colori del marchio,
 *    qui e' in italiano ma dipende dalla lingua che si sceglie, e voglio anche
 *    il suono dentro. Vorrei che seguissi questa linea di pensiero.»*
 *
 *    Da quel prototipo vengono, e NON si ridiscutono senza di lei:
 *      · il fondo chiaro: si gira sulla carta, non al buio;
 *      · l'ordine — prima i PUNTI che precipitano, poi le SUPERFICI che si
 *        accendono sopra, poi i CARTELLINI che si posano;
 *      · il cartellino: pallino sull'ancora, filo, pastiglia bianca col nome;
 *      · le cinque fasi, che hanno un nome: modello grezzo, percezione,
 *        riconoscimento, semantica, spazio ricomposto;
 *      · la barra: play, pausa, scrub, «rivedi». E' un VIDEO, non degli scatti;
 *      · il pad sonoro, spento all'avvio;
 *      · la camera che orbita e si avvicina mentre lo spazio si ricompone.
 *
 * QUELLO CHE CAMBIA rispetto al prototipo, ed e' tutto il lavoro: li' i sei
 * ambienti erano disegnati a mano, qui sono gli AMBIENTI MISURATI; i punti sono
 * la nuvola vera; i nomi sono quelli che l'occhio ha riconosciuto; e i
 * cartellini stanno dove le zone stanno davvero.
 *
 * ⚠️ LA REGOLA CHE TIENE IN PIEDI TUTTO (direttive 10 e 15): **i COLORI sono
 *    liberi, le POSIZIONI no.** Il colore di un ambiente viene dal marchio e non
 *    afferma niente sullo spazio; la posizione di ogni punto e' la misura. Si
 *    puo' rendere bella la rappresentazione, mai la conclusione. Un nome
 *    incerto resta pallido, per bello che sia il modo in cui compare.
 *
 * E' UNO STRATO: `window.veritasCinema.spegni()` e la scena torna com'era —
 * camera, lente e materiali compresi.
 */

// I colori del marchio, nell'ordine dell'iride: sono quelli del prototipo.
const MARCA = [
  [0.169, 0.361, 0.902],   // blu      #2B5CE6
  [0.482, 0.184, 0.831],   // viola    #7B2FD4
  [0.878, 0.204, 0.545],   // magenta  #E0348B
  [0.976, 0.447, 0.122],   // arancio  #F9721F
  [0.984, 0.690, 0.231],   // oro      #FBB03B
];

// ⚠️ LE PAROLE SEGUONO LA LINGUA SCELTA. Raffaella: «qui risulta tutta in
//    italiano ma naturalmente dipende dalla lingua che si sceglie». La lingua
//    non si indovina: si legge da dove l'applicazione la tiene gia'.
const PAROLE = {
  it: {
    fasi: ['Modello grezzo', 'Percezione', 'Riconoscimento', 'Semantica', 'Spazio ricomposto'],
    uno: 'ambiente riconosciuto', molti: 'ambienti riconosciuti',
    occhio: 'altezza occhio', avvia: 'Avvia', pausa: 'Pausa',
    riprendi: 'Riprendi', rivedi: 'Rivedi', suono: 'Suono',
    senzaNome: 'senza nome', incontrati: 'incontrati camminando',
  },
  en: {
    fasi: ['Raw model', 'Perception', 'Recognition', 'Semantics', 'Space recomposed'],
    uno: 'space recognised', molti: 'spaces recognised',
    occhio: 'eye height', avvia: 'Play', pausa: 'Pause',
    riprendi: 'Resume', rivedi: 'Replay', suono: 'Sound',
    senzaNome: 'unnamed', incontrati: 'met while walking',
  },
};
function lingua() {
  // ⚠️ NON si guarda `document.documentElement.lang`: misurato il 06/09, quel
  //    campo diceva «en» mentre l'interfaccia era tutta in italiano, e il film
  //    e' uscito in inglese. La lingua e' quella che l'utente ha SCELTO, e
  //    l'applicazione la tiene nei suoi due bottoni IT/EN.
  const g = window.__veritasLingua || window.__veritasLang;
  if (g && PAROLE[String(g).toLowerCase().slice(0, 2)]) return String(g).toLowerCase().slice(0, 2);
  try {
    const b = Array.prototype.slice.call(document.querySelectorAll('button'))
      .filter(function (x) { return /^(IT|EN)$/i.test((x.textContent || '').trim()); });
    for (const x of b) {
      const st = getComputedStyle(x);
      const acceso = x.getAttribute('aria-pressed') === 'true'
        || /active|selected|attiv/i.test(x.className || '')
        || parseFloat(st.opacity || '1') > 0.95 && st.fontWeight >= 600;
      if (acceso) return (x.textContent || '').trim().toLowerCase();
    }
  } catch (e) {}
  return 'it';
}
const P = () => PAROLE[lingua()];

// ⚠️ CHI GUARDA E' UN PARAMETRO DICHIARATO. Raffaella, 06/09: «dobbiamo
//    targettizzare chi e' il nostro osservatore: potremmo valutare quello sulla
//    sedia a rotelle». Gli archetipi non si riscrivono qui: stanno in
//    `veritas_visibility` (business 1,65 · wheelchair 1,20 · tourist), sono gli
//    stessi dell'isovista e gli stessi per cui il referto 7 promette «la stessa
//    pianta a 1,65 m e a 1,20 m». Due registri sarebbero due verita'.
const ATTORE_PREDEFINITO = 'business';
function attore(nome) {
  const reg = (window.__veritasVisibility && window.__veritasVisibility.SKINS)
           || window.__veritasSkins || null;
  const k = nome || stato.attore || ATTORE_PREDEFINITO;
  if (reg && reg[k]) return { chiave: k, occhio: reg[k].eyeHeight, nome: reg[k].label || k };
  const ripiego = { business: 1.65, wheelchair: 1.20, tourist: 1.65 };
  return { chiave: k, occhio: ripiego[k] || 1.65, nome: k, ripiego: true };
}

// ⚠️ LA LENTE E' 60 GRADI, e non e' il cono percettivo. Raffaella, 06/09: «nei
//    programmi di rendering, per ricreare la sensazione dell'occhio dell'uomo si
//    usa un'apertura di sessanta gradi». I 100-140 gradi di `veritas_visibility`
//    dicono quanto una persona PERCEPISCE; questi dicono che lente montiamo.
const LENTE_GRADI = 60;
const CONO_GRADI = 62;      // quanto il corpo INCONTRA camminando
const CONO_PORTATA = 26;    // m — oltre, il dettaglio non si legge

// Il film in frazioni di se stesso, come nel prototipo (t va da 0 a 1).
const ATTI = {
  polvere:   [0.00, 0.10],
  condensa:  [0.06, 0.55],
  superfici: [0.30, 0.72],
  cartelli:  [0.55, 0.80],
  cammino:   [0.80, 1.00],
};
const DURATA_MS = 26000;

const stato = {
  acceso: false, t: 0, corre: false, ultimo: 0, raf: null,
  gruppo: null, geom: null, materiale: null,
  ambienti: [], velature: [], cartelli: null, plancia: null, pannello: null,
  cameraPrima: null, controlliPrima: null,
  via: null, scoperti: 0, attore: null,
  centro: [0, 0, 0], raggio0: 40, angolo0: 0, altezza0: 20,
  audio: null, suonoAcceso: false,
};

function pagina() {
  const THREE = window.THREE, scena = window.__veritasScene,
        camera = window.__veritasCamera, tela = window.__veritasCanvasEl,
        punti = window.__veritasAutoPoints || [];
  if (!THREE || !scena || !camera || !tela) return null;
  return { THREE, scena, camera, tela, punti };
}

// ---------------------------------------------------------------------------
// GLI AMBIENTI SONO QUELLI MISURATI, non sei riquadri disegnati a mano.
// Ognuno prende un colore del marchio — che non afferma niente sullo spazio,
// e' rappresentazione — e un istante in cui entra in scena, sfalsato lungo x:
// cosi' la conoscenza si deposita da una parte all'altra, come uno sguardo.
// ---------------------------------------------------------------------------
function leggiGliAmbienti() {
  const z = ((window.__veritasPercezione || {}).zones || []).slice();
  if (!z.length) return [];
  const xs = z.map((a) => a.centroidX);
  const minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
  // I nomi VERI, se qualcuno li ha capiti. Se no si dichiara «senza nome»:
  // riempire con un'etichetta inventata sarebbe la bugia peggiore.
  const nodi = (window.__veritasGetNodes ? window.__veritasGetNodes() : []) || [];
  return z.map((a, i) => {
    const t = (a.centroidX - minX) / Math.max(1e-6, maxX - minX);
    let nome = null, fiducia = 1, vicino = null, dmin = Infinity;
    for (const n of nodi) {
      if (!n.pos) continue;
      const d = Math.hypot(n.pos[0] - a.centroidX, n.pos[2] - a.centroidZ);
      if (d < dmin) { dmin = d; vicino = n; }
    }
    if (vicino && dmin < Math.max(6, Math.sqrt(a.areaM2 || 9))) {
      nome = vicino.label || null;
      fiducia = vicino.fiducia != null ? vicino.fiducia
              : (vicino.confidence != null ? vicino.confidence : 1);
    }
    return {
      i, nome, fiducia, area: a.areaM2 || 0,
      x: a.centroidX, y: a.y != null ? a.y : 0, z: a.centroidZ,
      colore: MARCA[i % MARCA.length],
      t0: ATTI.condensa[0] + t * (ATTI.condensa[1] - ATTI.condensa[0]) * 0.75,
    };
  });
}

// ---------------------------------------------------------------------------
// LA POLVERE. Ogni punto ha due posizioni: da dove precipita e dove sta
// DAVVERO. Fra le due si interpola, e quella e' tutta l'animazione: l'unica
// cosa animata e' QUANDO arriva, mai DOVE.
// ---------------------------------------------------------------------------
function costruisciPolvere(p, ambienti) {
  const THREE = p.THREE, punti = p.punti, n = punti.length;
  if (!n) return null;

  const pos = new Float32Array(n * 3), meta = new Float32Array(n * 3),
        nasce = new Float32Array(n * 3), tinta = new Float32Array(n * 3),
        quando = new Float32Array(n), dim = new Float32Array(n),
        scoperto = new Float32Array(n);

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, maxY = -Infinity;
  for (const q of punti) {
    if (q[0] < minX) minX = q[0]; if (q[0] > maxX) maxX = q[0];
    if (q[2] < minZ) minZ = q[2]; if (q[2] > maxZ) maxZ = q[2];
    if (q[1] > maxY) maxY = q[1];
  }
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const raggio = Math.max(maxX - minX, maxZ - minZ) * 0.6;

  let seme = 20260906;   // seme fisso: la stessa scena fa sempre lo stesso film
  const caso = () => { seme = (seme * 1664525 + 1013904223) % 4294967296; return seme / 4294967296; };

  for (let i = 0; i < n; i++) {
    const q = punti[i];
    meta[i * 3] = q[0]; meta[i * 3 + 1] = q[1]; meta[i * 3 + 2] = q[2];

    const a = caso() * Math.PI * 2, r = raggio * (0.9 + caso() * 0.8);
    nasce[i * 3] = cx + Math.cos(a) * r;
    nasce[i * 3 + 1] = maxY + 5 + caso() * 20;
    nasce[i * 3 + 2] = cz + Math.sin(a) * r;
    pos[i * 3] = nasce[i * 3]; pos[i * 3 + 1] = nasce[i * 3 + 1]; pos[i * 3 + 2] = nasce[i * 3 + 2];

    // A quale ambiente appartiene: il piu' vicino fra quelli MISURATI. Da li'
    // prende il colore e il momento in cui entra in scena.
    let amb = null, dmin = Infinity;
    for (const A of ambienti) {
      const d = (A.x - q[0]) * (A.x - q[0]) + (A.z - q[2]) * (A.z - q[2]);
      if (d < dmin) { dmin = d; amb = A; }
    }
    const col = amb ? amb.colore : MARCA[0];
    tinta[i * 3] = col[0]; tinta[i * 3 + 1] = col[1]; tinta[i * 3 + 2] = col[2];
    quando[i] = (amb ? amb.t0 : ATTI.condensa[0]) + caso() * 0.07;
    dim[i] = 0.40 + caso() * 0.34;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geom.setAttribute('tinta', new THREE.BufferAttribute(tinta, 3));
  geom.setAttribute('dimensione', new THREE.BufferAttribute(dim, 1));
  geom.setAttribute('scoperto', new THREE.BufferAttribute(scoperto, 1));
  geom.userData = { meta: meta, nasce: nasce, quando: quando, n: n };

  // ⚠️ INCHIOSTRO, NON NEON. Si gira sulla carta (decisione di Raffaella): in
  //    additivo su fondo chiaro «colore + bianco = bianco» e la polvere
  //    sparisce. Colore pieno, nucleo che si scurisce.
  // ⚠️ E la dimensione e' un RAGGIO IN METRI, non in pixel: un valore in pixel
  //    e' tarato sulla distanza a cui stava la camera quando l'hanno provato —
  //    misurato il 06/09, veniva 0,38 pixel, cioe' invisibile.
  const materiale = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { opacitaGlobale: { value: 0 }, scalaPixel: { value: 900 } },
    vertexShader: [
      'attribute float dimensione;',
      'attribute vec3 tinta;',
      'attribute float scoperto;',
      'varying vec3 vColore; varying float vVicino; varying float vScoperto;',
      'uniform float scalaPixel;',
      'void main() {',
      '  vColore = tinta; vScoperto = scoperto;',
      '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
      '  float d = max(0.001, -mv.z);',
      '  gl_PointSize = clamp(dimensione * scalaPixel / d, 3.0, 30.0);',
      '  vVicino = clamp(34.0 / d, 0.30, 1.0);',
      '  gl_Position = projectionMatrix * mv;',
      '}',
    ].join('\n'),
    fragmentShader: [
      'varying vec3 vColore; varying float vVicino; varying float vScoperto;',
      'uniform float opacitaGlobale;',
      'void main() {',
      '  vec2 d = gl_PointCoord - vec2(0.5);',
      '  float r = length(d) * 2.0;',
      '  if (r > 1.0) discard;',
      '  float alone  = pow(1.0 - r, 2.2);',
      '  float nucleo = pow(max(0.0, 1.0 - r * 2.6), 3.0);',
      '  vec3 colore  = vColore * (1.0 - nucleo * 0.25);',
      '  float a = min(1.0, alone * 0.5 + nucleo * 1.1) * opacitaGlobale * vVicino;',
      '  gl_FragColor = vec4(colore, a);',
      '}',
    ].join('\n'),
  });

  const oggetto = new THREE.Points(geom, materiale);
  oggetto.frustumCulled = false;
  oggetto.name = '__eideticaPolvere';
  return { oggetto: oggetto, geom: geom, materiale: materiale };
}

// ---------------------------------------------------------------------------
// LE SUPERFICI SI ACCENDONO DOPO I PUNTI — l'ordine del prototipo, e Raffaella
// l'aveva gia' detto a voce: «poi si concretizzava in mesh».
// ⚠️ Si conservano le opacita' ORIGINALI: uno strato che non sa tornare
//    indietro non e' uno strato, e' un danno.
// ---------------------------------------------------------------------------
function velaIlModello(fattore) {
  const radice = window.__veritasModelRoot;
  if (!radice) return;
  if (!stato.velature.length) {
    radice.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) stato.velature.push({ m: m, opacity: m.opacity, transparent: m.transparent });
    });
  }
  for (const v of stato.velature) {
    v.m.transparent = true;
    v.m.opacity = v.opacity * fattore;
    v.m.needsUpdate = true;
  }
}
function rimettiIlModello() {
  for (const v of stato.velature) {
    v.m.opacity = v.opacity; v.m.transparent = v.transparent; v.m.needsUpdate = true;
  }
  stato.velature = [];
}

// ---------------------------------------------------------------------------
// I CARTELLINI, come li ha disegnati Raffaella: pallino sull'ancora, filo,
// pastiglia bianca col nome. Stanno su una tela sopra la scena, non nel DOM:
// devono seguire la prospettiva.
// ⚠️ Un nome INCERTO resta pallido. E' l'unica cosa del film che afferma
//    qualcosa sullo spazio, quindi e' l'unica che deve dire quanto ci crede.
// ---------------------------------------------------------------------------
function costruisciSovrimpressione(p) {
  const c = document.createElement('canvas');
  c.id = 'eidetica-cinema-cartelli';
  // ⚠️ LA MISURA IN CSS SERVE, e la sua mancanza ha coperto tutto il film.
  //    Misurato il 06/09: senza `width`/`height` in CSS la tela si disegna alla
  //    sua misura INTRINSECA (larghezza in pixel del dispositivo, il doppio) e
  //    si stende sopra la scena come un lenzuolo. Per mezz'ora e' sembrato che
  //    il film non disegnasse niente: disegnava, e stava sotto un foglio.
  //    Il sintomo che l'ha svelato: i cartellini si vedevano e il 3D no — cioe'
  //    esattamente le due cose stanno su due tele diverse.
  c.style.cssText = 'position:absolute;left:0;top:0;z-index:9200;pointer-events:none';
  // ⚠️ IL FONDO SI TOGLIE CON `!important`, E CI SONO VOLUTE DUE ORE.
  //    Misurato il 06/09: la tela dei cartellini risultava
  //    `background: rgb(233,235,240)` — il grigio della piattaforma — perche'
  //    una regola dello strato «carta» colora TUTTI i canvas, e vince su uno
  //    stile in linea normale. Risultato: un foglio grigio steso sopra la
  //    scena 3D. Il film girava benissimo sotto, e i cartellini si vedevano
  //    perfettamente perche' erano gli unici disegnati su quel foglio.
  //    Il sintomo che l'ha svelato: nascondendo questa tela ricompariva tutto.
  c.style.setProperty('background', 'transparent', 'important');
  (p.tela.parentElement || document.body).appendChild(c);
  return c;
}
function disegnaCartelli(u) {
  const c = stato.cartelli, cam = window.__veritasCamera, tela = window.__veritasCanvasEl;
  if (!c || !cam || !tela) return 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = tela.clientWidth, h = tela.clientHeight;
  if (c.width !== Math.round(w * dpr)) {
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    c.style.width = w + 'px'; c.style.height = h + 'px';
  }
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);

  const a0 = ATTI.cartelli[0], a1 = ATTI.cartelli[1];
  let quanti = 0;
  const V = new window.THREE.Vector3();
  // ⚠️ NON tutti i cartellini: quelli di sette metri quadri si accavallano e
  //    non si legge piu' niente. Si tengono i piu' grandi — che sono anche
  //    quelli di cui ha senso parlare — e il conto dice quanti sono in tutto,
  //    cosi' non si nasconde nulla.
  const scelti = stato.ambienti.slice()
    .sort(function (x, y) { return y.area - x.area; }).slice(0, 8);
  const N = Math.max(1, scelti.length);
  const presi = [];
  scelti.forEach((A, k) => {
    const suo = a0 + (k / N) * (a1 - a0);
    const ap = Math.min(1, Math.max(0, (u - suo) / 0.06));
    if (ap <= 0) return;
    quanti++;
    V.set(A.x, A.y + 1.4, A.z).project(cam);
    if (V.z > 1) return;
    let x = (V.x * 0.5 + 0.5) * w, y = (-V.y * 0.5 + 0.5) * h;
    // se un cartellino cade addosso a uno gia' messo, si alza finche' respira
    let salto = 0;
    while (presi.some(function (q) { return Math.abs(q.x - x) < 150 && Math.abs(q.y - (y - salto)) < 30; })
           && salto < 200) salto += 32;
    const yBase = y; y -= salto;
    presi.push({ x: x, y: y });
    const col = A.colore.map((v) => Math.round(v * 255));
    const rgba = (al) => 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + al + ')';
    // ⚠️ La fiducia entra QUI e in nessun altro punto del film: un nome di cui
    //    non si e' sicuri si vede meno, e chi guarda lo capisce senza leggere.
    const al = ap * (0.45 + 0.55 * Math.min(1, A.fiducia));
    const testo = A.nome || (P().senzaNome + ' · ' + Math.round(A.area) + ' m²');

    g.font = '500 12.5px "Helvetica Neue",Helvetica,Arial,sans-serif';
    const lw = g.measureText(testo).width;
    const py = y - 30 * ap;
    g.strokeStyle = rgba(0.32 * al); g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, yBase); g.lineTo(x, py + 11); g.stroke();
    g.beginPath(); g.fillStyle = rgba(0.85 * al); g.arc(x, yBase, 2.6, 0, 6.283); g.fill();
    const bx = x - lw / 2 - 11, by = py - 11.5;
    g.beginPath();
    if (g.roundRect) g.roundRect(bx, by, lw + 22, 23, 11.5); else g.rect(bx, by, lw + 22, 23);
    g.fillStyle = 'rgba(255,255,255,' + (0.93 * al) + ')'; g.fill();
    g.strokeStyle = rgba(0.3 * al); g.stroke();
    g.fillStyle = 'rgba(20,26,51,' + al + ')';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(testo, x, py + 0.5);
  });
  return stato.ambienti.length ? Math.round(quanti * stato.ambienti.length / N) : 0;
}

// ---------------------------------------------------------------------------
// LA PLANCIA: play, pausa, scrub, rivedi, suono. E' un VIDEO — Raffaella:
// «dovremmo vedere un video; io adesso ho visto degli scatti».
// ---------------------------------------------------------------------------
function costruisciPlancia(p) {
  const d = document.createElement('div');
  d.id = 'eidetica-cinema-plancia';
  d.style.cssText = [
    'position:absolute', 'left:50%', 'bottom:26px', 'transform:translateX(-50%)',
    'z-index:9300', 'display:flex', 'align-items:center', 'gap:16px',
    'padding:12px 20px', 'border-radius:100px',
    'background:rgba(255,255,255,.86)', 'backdrop-filter:blur(18px)',
    '-webkit-backdrop-filter:blur(18px)',
    'box-shadow:0 1px 2px rgba(20,26,51,.06),0 12px 40px rgba(20,26,51,.1)',
    'font-family:"Helvetica Neue",Helvetica,Arial,sans-serif', 'font-size:13px',
    'color:#141A33',
  ].join(';');
  d.innerHTML =
    '<button id="ec-play" style="display:flex;align-items:center;gap:9px;font:inherit;' +
    'font-weight:500;border:0;background:none;cursor:pointer;color:inherit;padding:6px 2px">' +
    '<span style="width:26px;height:26px;border-radius:50%;display:grid;place-items:center;' +
    'color:#fff;font-size:10px;padding-left:1px;' +
    'background:linear-gradient(125deg,#2B5CE6,#7B2FD4 45%,#E0348B 72%,#F9721F)">▶</span>' +
    '<span id="ec-et">' + P().pausa + '</span></button>' +
    '<div style="width:1px;height:22px;background:#E3E5EE"></div>' +
    '<input id="ec-barra" type="range" min="0" max="1000" value="0" ' +
    'style="width:190px;height:3px;-webkit-appearance:none;appearance:none;border-radius:3px;' +
    'background:#E3E5EE;cursor:pointer">' +
    '<div style="width:1px;height:22px;background:#E3E5EE"></div>' +
    '<button id="ec-suono" style="font:inherit;border:0;background:none;cursor:pointer;' +
    'color:inherit;padding:6px 2px;white-space:nowrap">' + P().suono + ': off</button>' +
    '<div style="width:1px;height:22px;background:#E3E5EE"></div>' +
    '<button id="ec-chiudi" style="font:inherit;border:0;background:none;cursor:pointer;' +
    'color:#8A90A6;padding:6px 2px">✕</button>';
  (p.tela.parentElement || document.body).appendChild(d);

  d.querySelector('#ec-play').onclick = function () { stato.corre ? pausa() : riparti(); };
  d.querySelector('#ec-barra').oninput = function (e) { stato.t = e.target.value / 1000; pausa(); };
  d.querySelector('#ec-suono').onclick = function (e) {
    stato.suonoAcceso = !stato.suonoAcceso;
    e.target.textContent = P().suono + ': ' + (stato.suonoAcceso ? 'on' : 'off');
    if (stato.suonoAcceso && stato.corre) suonoSu(); else suonoGiu();
  };
  d.querySelector('#ec-chiudi').onclick = function () { ferma(); };
  return d;
}

function costruisciStato(p) {
  const d = document.createElement('div');
  d.id = 'eidetica-cinema-stato';
  d.style.cssText = [
    'position:absolute', 'top:70px', 'right:26px', 'z-index:9300', 'text-align:right',
    'pointer-events:none', 'font-family:"Helvetica Neue",Helvetica,Arial,sans-serif',
    'font-size:11.5px', 'line-height:1.8', 'color:#8A90A6',
    'font-variant-numeric:tabular-nums',
  ].join(';');
  d.innerHTML =
    '<b id="ec-fase" style="display:block;font-size:13px;font-weight:500;color:#141A33"></b>' +
    '<span id="ec-conta"></span><br><span id="ec-occhio"></span>';
  (p.tela.parentElement || document.body).appendChild(d);
  return d;
}

// ---------------------------------------------------------------------------
// IL PAD SONORO — chiesto da Raffaella, e spento all'avvio come nel prototipo.
// Quattro voci filtrate e un lento respiro sul filtro. Non commenta niente: fa
// da aria, e l'aria non afferma nulla sullo spazio.
// ---------------------------------------------------------------------------
function creaSuono() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ac = new AC();
  const gn = ac.createGain(); gn.gain.value = 0;
  const flt = ac.createBiquadFilter();
  flt.type = 'lowpass'; flt.frequency.value = 850; flt.Q.value = 0.7;
  [110, 164.81, 220, 329.63].forEach(function (f, i) {
    const o = ac.createOscillator(); o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = f;
    const g = ac.createGain(); g.gain.value = 0.16 / (i + 1);
    o.connect(g); g.connect(flt); o.start();
  });
  flt.connect(gn); gn.connect(ac.destination);
  const l = ac.createOscillator(); l.frequency.value = 0.06;
  const lg = ac.createGain(); lg.gain.value = 420;
  l.connect(lg); lg.connect(flt.frequency); l.start();
  return { ac: ac, gn: gn };
}
function suonoSu() {
  if (!stato.suonoAcceso) return;
  if (!stato.audio) stato.audio = creaSuono();
  if (!stato.audio) return;
  const ac = stato.audio.ac, gn = stato.audio.gn;
  if (ac.state === 'suspended') ac.resume();
  gn.gain.cancelScheduledValues(ac.currentTime);
  gn.gain.linearRampToValueAtTime(0.085, ac.currentTime + 2.2);
}
function suonoGiu() {
  if (!stato.audio) return;
  const ac = stato.audio.ac, gn = stato.audio.gn;
  gn.gain.cancelScheduledValues(ac.currentTime);
  gn.gain.linearRampToValueAtTime(0, ac.currentTime + 1.1);
}

// ---------------------------------------------------------------------------
// LA CONTROPROVA: dentro gli occhi di chi cammina. Raffaella: «poi faremo
// queste simulazioni partendo dall'occhio dei personaggi, che scendono dal
// taxi, entrano, seguono le frecce verdi. Ed e' quella la controprova che tutto
// funziona.» Ultimo atto, non primo: prima si capisce, poi si verifica.
// ⚠️ IL CAMMINO NON SI INVENTA: e' la traiettoria vera della simulazione. Se non
//    c'e', il film finisce orbitando e LO DICE, invece di far camminare un
//    fantasma su un percorso finto.
// ---------------------------------------------------------------------------
function trovaIlCammino() {
  let t = null;
  try { t = window.__veritasGetTrajectory && window.__veritasGetTrajectory(); } catch (e) { t = null; }
  if (!t) return null;
  const frames = t.frames || t.fotogrammi || (Array.isArray(t) ? t : null);
  if (!Array.isArray(frames) || !frames.length) return null;
  const via = [];
  for (const f of frames) {
    const a = Array.isArray(f) ? f[0]
            : (f && (f.agents || f.agenti) ? (f.agents || f.agenti)[0] : null);
    if (!a) continue;
    const x = Array.isArray(a) ? a[0] : (a.x != null ? a.x : (a.pos && a.pos[0]));
    const y = Array.isArray(a) ? a[1] : (a.y != null ? a.y : (a.pos && a.pos[1]));
    const z = Array.isArray(a) ? a[2] : (a.z != null ? a.z : (a.pos && a.pos[2]));
    if (typeof x === 'number' && typeof z === 'number') via.push([x, typeof y === 'number' ? y : 0, z]);
  }
  return via.length > 8 ? via : null;
}
function scopriNelCono(dove) {
  const g = stato.geom, c = window.__veritasCamera;
  if (!g || !dove || !c) return 0;
  const meta = g.userData.meta, n = g.userData.n, sc = g.attributes.scoperto.array;
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
// IL FOTOGRAMMA
// ---------------------------------------------------------------------------
const dolce = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));
function fra(a, u) { return dolce((u - a[0]) / (a[1] - a[0])); }

function fotogramma(ms) {
  if (!stato.acceso) return;
  if (stato.corre) {
    stato.t += (stato.ultimo ? ms - stato.ultimo : 16) / DURATA_MS;
    if (stato.t >= 1) { stato.t = 1; pausa(); }
  }
  stato.ultimo = ms;
  const u = stato.t, g = stato.geom;
  if (!g) { stato.raf = requestAnimationFrame(fotogramma); return; }
  const meta = g.userData.meta, nasce = g.userData.nasce,
        quando = g.userData.quando, n = g.userData.n;
  const pos = g.attributes.position.array;

  const cam = window.__veritasCamera, tela = window.__veritasCanvasEl;
  if (cam && tela) {
    const h = tela.clientHeight || 800;
    stato.materiale.uniforms.scalaPixel.value = h / (2 * Math.tan((cam.fov || 60) * Math.PI / 360));
  }

  // I punti precipitano e si posano. Nessuna posizione inventata: solo QUANDO.
  for (let i = 0; i < n; i++) {
    const s = dolce((u - quando[i]) / 0.16);
    if (s >= 1) {
      pos[i * 3] = meta[i * 3]; pos[i * 3 + 1] = meta[i * 3 + 1]; pos[i * 3 + 2] = meta[i * 3 + 2];
    } else {
      pos[i * 3]     = nasce[i * 3]     + (meta[i * 3]     - nasce[i * 3])     * s;
      pos[i * 3 + 1] = nasce[i * 3 + 1] + (meta[i * 3 + 1] - nasce[i * 3 + 1]) * s;
      pos[i * 3 + 2] = nasce[i * 3 + 2] + (meta[i * 3 + 2] - nasce[i * 3 + 2]) * s;
    }
  }
  g.attributes.position.needsUpdate = true;
  stato.materiale.uniforms.opacitaGlobale.value = 0.45 + 0.55 * fra(ATTI.polvere, u);

  // Le superfici si accendono SOPRA i punti, dopo.
  velaIlModello(0.06 + 0.72 * fra(ATTI.superfici, u));

  const quanti = disegnaCartelli(u);

  // La camera orbita e si avvicina — finche' non comincia la controprova.
  if (cam && (u < ATTI.cammino[0] || !stato.via)) {
    const k = dolce(Math.min(1, u / ATTI.cammino[0]));
    const mira = stato.centro;
    const ang = stato.angolo0 + k * 0.9;
    const dist = stato.raggio0 * (1 - 0.42 * k);
    const alt = stato.altezza0 * (1 - 0.55 * k);
    cam.position.set(mira[0] + Math.sin(ang) * dist, mira[1] + alt, mira[2] + Math.cos(ang) * dist);
    cam.lookAt(mira[0], mira[1], mira[2]);
    cam.updateMatrixWorld();
  } else if (cam && stato.via) {
    const k = Math.min(1, (u - ATTI.cammino[0]) / (ATTI.cammino[1] - ATTI.cammino[0]));
    const occhio = attore().occhio;
    const i = Math.min(stato.via.length - 2, Math.floor(k * (stato.via.length - 1)));
    const f = k * (stato.via.length - 1) - i;
    const a = stato.via[i], b = stato.via[i + 1];
    const px = a[0] + (b[0] - a[0]) * f, py = a[1] + (b[1] - a[1]) * f,
          pz = a[2] + (b[2] - a[2]) * f;
    const avanti = stato.via[Math.min(stato.via.length - 1, i + 6)];
    cam.position.set(px, py + occhio, pz);
    // ⚠️ Si guarda DRITTO: mirare piu' in basso inclina la camera, e una camera
    //    inclinata in giu' si legge come «sto in alto». Raffaella l'ha sentito
    //    prima che venisse misurato.
    cam.lookAt(avanti[0], avanti[1] + occhio, avanti[2]);
    cam.updateMatrixWorld();
    stato.scoperti += scopriNelCono([px, py, pz]);
  }

  if (stato.pannello) {
    const W = P();
    const fase = u < 0.03 ? 0 : u < ATTI.condensa[1] ? 1 : u < ATTI.cartelli[0] ? 2
               : u < ATTI.cammino[0] ? 3 : 4;
    const ef = stato.pannello.querySelector('#ec-fase');
    const ec = stato.pannello.querySelector('#ec-conta');
    const eo = stato.pannello.querySelector('#ec-occhio');
    if (ef) ef.textContent = W.fasi[fase];
    if (ec) ec.textContent = (u >= ATTI.cammino[0] && stato.via)
      ? stato.scoperti.toLocaleString() + ' ' + W.incontrati
      : quanti + ' ' + (quanti === 1 ? W.uno : W.molti);
    if (eo) eo.textContent = W.occhio + ' ' + attore().occhio.toFixed(2).replace('.', ',') + ' m';
  }
  if (stato.plancia && stato.corre) {
    const b = stato.plancia.querySelector('#ec-barra');
    if (b) b.value = Math.round(u * 1000);
  }

  // ⚠️ QUI NON SI CHIAMA `renderer.render()`, ED E' STATO PROVATO.
  //    Il 06/09 e' stata aggiunta una chiamata di disegno «per sicurezza»,
  //    pensando che la tela non venisse aggiornata. Risultato: il film
  //    disegnava sopra il fotogramma appena dipinto dall'applicazione e lo
  //    cancellava — schermo bianco, con i cartellini (che stanno su una tela
  //    2D a parte) perfettamente visibili sopra il nulla.
  //    Chi dipinge la tela 3D e' l'applicazione, e la dipinge mentre la
  //    riproduzione corre: per questo il film la fa partire, ed e' anche
  //    quello che Raffaella aveva chiesto — «dovrebbe essere il play della
  //    simulazione».
  stato.raf = requestAnimationFrame(fotogramma);
}

// ---------------------------------------------------------------------------
export function avvia(opz) {
  if (stato.acceso) { riparti(); return true; }
  const p = pagina();
  if (!p) { console.warn('[EIDETICA cinema] la scena non è pronta'); return false; }
  if (!p.punti.length) {
    console.warn('[EIDETICA cinema] non c’è ancora una nuvola misurata: '
      + 'il film racconta lo spazio, e senza misure non c’è niente da raccontare');
    return false;
  }
  stato.attore = (opz && opz.attore) || null;
  stato.ambienti = leggiGliAmbienti();
  const costruito = costruisciPolvere(p, stato.ambienti);
  if (!costruito) return false;

  stato.gruppo = new p.THREE.Group();
  stato.gruppo.name = '__eideticaCinemaGruppo';
  stato.gruppo.add(costruito.oggetto);
  p.scena.add(stato.gruppo);
  stato.geom = costruito.geom; stato.materiale = costruito.materiale;

  stato.cartelli = costruisciSovrimpressione(p);
  stato.plancia = costruisciPlancia(p);
  stato.pannello = costruisciStato(p);
  stato.via = trovaIlCammino();
  stato.scoperti = 0; stato.t = 0;

  // Da dove orbita: dal punto in cui la camera sta adesso, cosi' il film non
  // comincia con un salto.
  // ⚠️ L'ORBITA SI CALCOLA SUL MODELLO, non da dove la camera si trovava.
  //    Misurato il 06/09: partendo dalla posizione corrente il film cominciava
  //    da ottanta metri e finiva con i cartellini grandi come formiche. Il
  //    raggio lo detta l'edificio, che e' l'unica cosa che sa quanto e' grande.
  const b = new p.THREE.Box3().setFromObject(window.__veritasModelRoot);
  const c = b.getCenter(new p.THREE.Vector3());
  const dim = b.getSize(new p.THREE.Vector3());
  stato.centro = [c.x, c.y + Math.min(6, dim.y * 0.4), c.z];
  stato.raggio0 = Math.max(24, Math.max(dim.x, dim.z) * 0.78);
  stato.angolo0 = Math.atan2(p.camera.position.x - c.x, p.camera.position.z - c.z);
  stato.altezza0 = stato.raggio0 * 0.52;
  stato.cameraPrima = {
    pos: p.camera.position.clone(), quat: p.camera.quaternion.clone(), fov: p.camera.fov,
  };
  try { p.camera.fov = LENTE_GRADI; p.camera.updateProjectionMatrix(); } catch (e) {}
  try {
    const ctr = window.__veritasControls;
    if (ctr && 'enabled' in ctr) { stato.controlliPrima = ctr.enabled; ctr.enabled = false; }
  } catch (e) {}

  const partita = facciPartireLaRiproduzione();
  stato.acceso = true; stato.corre = true; stato.ultimo = 0;
  console.log('[EIDETICA cinema] riproduzione '
    + (partita ? 'avviata dal film' : 'era gia in corso, oppure non trovata')
    + ' — senza, la tela 3D non viene ridipinta e il film non si vede');
  console.log('[EIDETICA cinema] ' + p.punti.length.toLocaleString() + ' punti misurati, '
    + stato.ambienti.length + ' ambienti'
    + (stato.via ? ', cammino vero di ' + stato.via.length + ' passi' : ', senza cammino: resto in orbita')
    + '. Lo guida lo stato vero, non un effetto.');
  suonoSu();
  stato.raf = requestAnimationFrame(fotogramma);
  return true;
}

export function pausa() {
  stato.corre = false;
  const et = stato.plancia && stato.plancia.querySelector('#ec-et');
  if (et) et.textContent = stato.t >= 1 ? P().rivedi : P().riprendi;
  suonoGiu();
}
export function riparti() {
  if (stato.t >= 1) stato.t = 0;
  stato.corre = true; stato.ultimo = 0;
  const et = stato.plancia && stato.plancia.querySelector('#ec-et');
  if (et) et.textContent = P().pausa;
  suonoSu();
}

export function ferma() {
  if (!stato.acceso) return;
  stato.acceso = false; stato.corre = false;
  if (stato.raf) cancelAnimationFrame(stato.raf);
  stato.raf = null;
  suonoGiu();
  const scena = window.__veritasScene;
  if (scena && stato.gruppo) scena.remove(stato.gruppo);
  if (stato.geom) stato.geom.dispose();
  if (stato.materiale) stato.materiale.dispose();
  [stato.cartelli, stato.plancia, stato.pannello].forEach(function (el) {
    if (el && el.parentElement) el.parentElement.removeChild(el);
  });
  // La camera torna dove stava: un film che ti lascia dentro un muro non è un
  // film, è un danno.
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
  rimettiIlModello();
  stato.gruppo = null; stato.geom = null; stato.materiale = null;
  stato.cartelli = null; stato.plancia = null; stato.pannello = null;
  stato.cameraPrima = null; stato.controlliPrima = null; stato.via = null;
  console.log('[EIDETICA cinema] fermo. La scena è tornata com’era.');
}
export const spegni = ferma;

// ---------------------------------------------------------------------------
// ⚠️ IL FILM FA PARTIRE LA RIPRODUZIONE, e non e' una comodita': senza, non si
//    vede NIENTE. Misurato il 06/09, e ci sono volute due ore per capirlo.
//
//    L'applicazione ridipinge la tela 3D solo mentre la riproduzione corre. A
//    simulazione ferma nessuno disegna, e il film — che pure girava, con la
//    camera al posto giusto e 2.416 mesh al 45% di opacita' — restava invisibile
//    su una tela che nessuno aggiornava.
//
//    Raffaella l'aveva detto prima che venisse misurato: *«secondo me dovrebbe
//    essere il play della simulazione, cioe' dovremmo vedere un video»*. Aveva
//    ragione due volte: e' giusto di prodotto ED e' l'unico modo perche' si
//    veda.
//
//    ⚠️ Il bottone si riconosce dalla GEOMETRIA dell'icona, non dal testo: il
//       Play di lucide-react e' un solo `<polygon points="6 3 20 12 6 21 6 3">`
//       senza rettangoli. E' lo STESSO bottone che fa pausa, quindi se porta
//       gia' la pausa la riproduzione sta correndo e cliccarlo la fermerebbe —
//       lo stesso difetto al contrario, gia' pagato il 02/09.
// ---------------------------------------------------------------------------
function facciPartireLaRiproduzione() {
  try {
    const bottoni = Array.prototype.slice.call(document.querySelectorAll('button'));
    for (const b of bottoni) {
      const poly = b.querySelectorAll('polygon');
      const rect = b.querySelectorAll('rect');
      // un solo triangolo e nessun rettangolo = Play. Due rettangoli = Pausa.
      if (poly.length === 1 && rect.length === 0 && b.querySelector('svg')) {
        const r = b.getBoundingClientRect();
        if (r.width > 8 && r.height > 8) { b.click(); return true; }
      }
    }
  } catch (e) {}
  return false;
}

// Il marchio fa partire il film — idea di Raffaella, 06/09.
function preparaIlMarchio() {
  const img = Array.prototype.slice.call(document.querySelectorAll('img'))
    .filter(function (i) { return /eidetica/i.test(i.src) && i.getBoundingClientRect().width > 40; })[0];
  if (!img) return null;
  img.style.cursor = 'pointer';
  img.title = 'EIDETICA';
  img.style.transition = 'filter .4s ease, transform .4s ease';
  img.addEventListener('mouseenter', function () {
    img.style.filter = 'drop-shadow(0 0 14px rgba(123,47,212,.45))';
    img.style.transform = 'scale(1.04)';
  });
  img.addEventListener('mouseleave', function () { img.style.filter = ''; img.style.transform = ''; });
  img.addEventListener('click', function () { stato.acceso ? ferma() : avvia(); });
  return img;
}

if (typeof window !== 'undefined') {
  window.veritasCinema = {
    avvia: avvia, ferma: ferma, spegni: ferma, pausa: pausa, riparti: riparti,
    stato: function () {
      return {
        acceso: stato.acceso, t: stato.t, corre: stato.corre,
        ambienti: stato.ambienti.length, scoperti: stato.scoperti,
        attore: attore().chiave, lingua: lingua(), cammino: !!stato.via,
      };
    },
  };
  const prova = function (n) {
    if (preparaIlMarchio()) {
      console.log('[EIDETICA cinema] pronto — il marchio fa partire il film, oppure window.veritasCinema.avvia()');
      return;
    }
    if (n < 40) setTimeout(function () { prova(n + 1); }, 500);
    else console.log('[EIDETICA cinema] pronto — window.veritasCinema.avvia()');
  };
  prova(0);
}
