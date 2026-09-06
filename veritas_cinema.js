/**
 * EIDETICA — LA LETTURA DAL VIVO
 * =============================================================================
 *
 * ⚠️ QUESTA FINESTRA NON MOSTRA IL MODELLO DELL'UTENTE, E NON E' UN DETTAGLIO.
 *
 *    Raffaella, 06/09/2026: *«io vorrei non vedere il modello che ho dato.
 *    Se abbiamo selezionato questo tipo di immagine e' perche' vogliamo la
 *    controprova visiva che il nostro meccanismo funziona, e soprattutto di
 *    come funziona. Se vedo gia' tutto il modello in partenza non mi serve.
 *    Io voglio vedere cosa vede lui, da zero.»*
 *
 *    Quindi qui dentro **non si disegna una sola mesh del GLB**. Si disegnano
 *    solo due cose, e sono tutte e due farina del programma:
 *      · i PUNTI che ha misurato — la nuvola navigabile, uno per uno;
 *      · i RETTANGOLI degli ambienti che ha ricostruito, con la forma che ha
 *        misurato lui (lungo, largo, angolo) e il nome che ha riconosciuto.
 *    Se il programma ha capito male, qui si vede subito. E' il punto.
 *
 * ⚠️ E VA A TUTTO SCHERMO. *«Si deve andare a tutto schermo, non devo vedere
 *    piu' niente: se cinema e' cinema. Musica e basta, e la barra li' sotto.»*
 *    Niente pannelli, niente KPI, niente barra dell'applicazione.
 *
 * ⚠️ TELA PROPRIA, RENDERER PROPRIO. Non e' pigrizia: la versione precedente
 *    disegnava dentro la scena dell'applicazione, e ci sono volute due ore per
 *    scoprire che una regola dello strato «carta» colora TUTTI i canvas e le
 *    stendeva addosso un foglio grigio. Qui la finestra e' sua, e nessuno ci
 *    puo' scrivere sopra.
 *
 * L'APERTURA e' il marchio con le ali che si aprono — quella che gia' esiste
 * nella schermata d'attesa. ⚠️ Non si ridisegna: si usa il file vero, che e' la
 * regola di Raffaella («cercare di farlo uguale al logo, perche' altrimenti
 * perde»).
 *
 * ⚠️ LA REGOLA CHE TIENE IN PIEDI TUTTO (direttive 10 e 15): i COLORI sono
 *    liberi, le POSIZIONI no. Ogni punto sta dove e' stato misurato; ogni
 *    rettangolo ha la forma che e' stata misurata; un nome incerto resta
 *    pallido. Si puo' rendere bella la rappresentazione, mai la conclusione.
 */

const MARCA = [
  [0.169, 0.361, 0.902],   // blu      #2B5CE6
  [0.482, 0.184, 0.831],   // viola    #7B2FD4
  [0.878, 0.204, 0.545],   // magenta  #E0348B
  [0.976, 0.447, 0.122],   // arancio  #F9721F
  [0.984, 0.690, 0.231],   // oro      #FBB03B
];
const CARTA = '#FCFCFE';
const INCHIOSTRO = '#141A33';
const NEBBIA = '#8A90A6';

const PAROLE = {
  it: {
    pulsante: 'Lettura dal vivo',
    sottotitolo: 'guarda come si forma la comprensione',
    fasi: ['Modello grezzo', 'Percezione', 'Riconoscimento', 'Semantica', 'Spazio ricomposto'],
    uno: 'ambiente riconosciuto', molti: 'ambienti riconosciuti',
    occhio: 'altezza occhio', avvia: 'Avvia', pausa: 'Pausa',
    riprendi: 'Riprendi', rivedi: 'Rivedi', suono: 'Musica', chiudi: 'Chiudi',
    senzaNome: 'senza nome', punti: 'punti misurati',
    niente: 'Non c’è ancora niente di misurato da mostrare.',
  },
  en: {
    pulsante: 'Live view',
    sottotitolo: 'watch understanding take shape',
    fasi: ['Raw model', 'Perception', 'Recognition', 'Semantics', 'Space recomposed'],
    uno: 'space recognised', molti: 'spaces recognised',
    occhio: 'eye height', avvia: 'Play', pausa: 'Pause',
    riprendi: 'Resume', rivedi: 'Replay', suono: 'Music', chiudi: 'Close',
    senzaNome: 'unnamed', punti: 'measured points',
    niente: 'Nothing measured to show yet.',
  },
};
// ⚠️ NON si guarda `document.documentElement.lang`: misurato il 06/09, diceva
//    «en» su un'interfaccia tutta italiana. La lingua e' quella SCELTA.
function lingua() {
  const g = window.__veritasLingua || window.__veritasLang;
  if (g && PAROLE[String(g).toLowerCase().slice(0, 2)]) return String(g).toLowerCase().slice(0, 2);
  try {
    const b = Array.prototype.slice.call(document.querySelectorAll('button'))
      .filter((x) => /^(IT|EN)$/i.test((x.textContent || '').trim()));
    for (const x of b) {
      const st = getComputedStyle(x);
      if (x.getAttribute('aria-pressed') === 'true'
          || /active|selected|attiv/i.test(x.className || '')
          || (parseFloat(st.opacity || '1') > 0.95 && +st.fontWeight >= 600))
        return (x.textContent || '').trim().toLowerCase();
    }
  } catch (e) {}
  return 'it';
}
const P = () => PAROLE[lingua()] || PAROLE.it;

// ⚠️ CHI GUARDA E' UN PARAMETRO DICHIARATO, e gli archetipi non si riscrivono
//    qui: stanno in `veritas_visibility` (business 1,65 · wheelchair 1,20),
//    sono gli stessi dell'isovista e quelli per cui il referto 7 promette «la
//    stessa pianta a 1,65 m e a 1,20 m». Due registri sarebbero due verita'.
function attore(nome) {
  const reg = (window.__veritasVisibility && window.__veritasVisibility.SKINS)
           || window.__veritasSkins || null;
  const k = nome || S.attore || 'business';
  if (reg && reg[k]) return { chiave: k, occhio: reg[k].eyeHeight };
  return { chiave: k, occhio: ({ business: 1.65, wheelchair: 1.20, tourist: 1.65 })[k] || 1.65 };
}

// ⚠️ 60 GRADI: e' la lente con cui i motori di rendering ricreano la sensazione
//    dell'occhio umano (Raffaella, 06/09). Non e' il cono percettivo, che in
//    `veritas_visibility` vale 100-140: quello dice quanto una persona
//    PERCEPISCE, questo dice che lente montiamo.
const LENTE = 60;
const APERTURA_MS = 2200;    // il marchio che apre le ali
const FILM_MS = 30000;

const S = {
  aperto: false, t: 0, corre: false, ultimo: 0, raf: null,
  velo: null, tela: null, sopra: null, plancia: null, pannello: null,
  ren: null, scena: null, cam: null, geom: null, mat: null,
  zone: [], via: null, attore: null,
  centro: [0,0,0], raggio0: 60, altezza0: 40, angolo0: 0,
  audio: null, musica: true, lancio: null,
};

// ---------------------------------------------------------------------------
// I DATI. Tutti misurati, nessuno inventato. Se mancano, si dice e non si apre.
// ---------------------------------------------------------------------------
function dati() {
  const punti = window.__veritasAutoPoints || [];
  const zone = ((window.__veritasPercezione || {}).zones || []).slice();
  if (!punti.length || !zone.length) return null;

  const nodi = (window.__veritasGetNodes ? window.__veritasGetNodes() : []) || [];

  // ⚠️ L'ORDINE PARTE DALL'INGRESSO, non da dove il modello comincia.
  //    Misurato il 06/09: ordinando per x crescente il film cominciava dal
  //    piazzale degli aerei (x −82) e finiva sulla strada (x +21), cioe'
  //    raccontava lo spazio al contrario — da dove non entra nessuno.
  //    Raffaella l'ha visto subito: «mi sembra che parta dagli aerei».
  //    L'ingresso lo sa gia' `veritas_accessi`; se non c'e' si parte dal capo
  //    piu' vicino al cammino, e se non c'e' nemmeno quello lo si dichiara.
  let porta = null;
  try {
    const a = (window.__veritasAccessi || {}).accessi || [];
    const daFuori = a.filter((x) => x.fuori);
    const scelto = (daFuori[0] || a[0]);
    if (scelto && scelto.pos) porta = [scelto.pos[0], scelto.pos[2]];
  } catch (e) {}

  const via = cammino();
  if (!porta && via) porta = [via[0][0], via[0][2]];
  if (!porta) porta = [zone[0].centroidX, zone[0].centroidZ];

  const dist = (z) => Math.hypot(z.centroidX - porta[0], z.centroidZ - porta[1]);
  const dmax = Math.max.apply(null, zone.map(dist)) || 1;

  const zz = zone.map((z, i) => {
    let nome = null, fiducia = 1, dmin = Infinity, vicino = null;
    for (const n of nodi) {
      if (!n.pos) continue;
      const d = Math.hypot(n.pos[0] - z.centroidX, n.pos[2] - z.centroidZ);
      if (d < dmin) { dmin = d; vicino = n; }
    }
    if (vicino && dmin < Math.max(6, Math.sqrt(z.areaM2 || 9))) {
      nome = vicino.label || null;
      fiducia = vicino.fiducia != null ? vicino.fiducia
              : (vicino.confidence != null ? vicino.confidence : 1);
    }
    return {
      i, nome, fiducia, area: z.areaM2 || 0,
      x: z.centroidX, y: z.y != null ? z.y : 0, z: z.centroidZ,
      lungo: z.formaLungo || Math.sqrt(z.areaM2 || 4),
      largo: z.formaLargo || Math.sqrt(z.areaM2 || 4),
      angolo: z.formaAngolo || 0,
      colore: MARCA[i % MARCA.length],
      quando: 0.10 + 0.62 * (dist(z) / dmax),   // dall'ingresso verso il fondo
    };
  });
  return { punti, zone: zz, porta, via };
}

function cammino() {
  let t = null;
  try { t = window.__veritasGetTrajectory && window.__veritasGetTrajectory(); } catch (e) { return null; }
  if (!t) return null;
  const f = t.frames || t.fotogrammi || (Array.isArray(t) ? t : null);
  if (!Array.isArray(f) || !f.length) return null;
  const via = [];
  for (const q of f) {
    const a = Array.isArray(q) ? q[0] : (q && (q.agents || q.agenti) ? (q.agents || q.agenti)[0] : null);
    if (!a) continue;
    const x = Array.isArray(a) ? a[0] : (a.x != null ? a.x : (a.pos && a.pos[0]));
    const y = Array.isArray(a) ? a[1] : (a.y != null ? a.y : (a.pos && a.pos[1]));
    const z = Array.isArray(a) ? a[2] : (a.z != null ? a.z : (a.pos && a.pos[2]));
    if (typeof x === 'number' && typeof z === 'number') via.push([x, typeof y === 'number' ? y : 0, z]);
  }
  return via.length > 8 ? via : null;
}

// ---------------------------------------------------------------------------
// LA SCENA — tutta nostra. Qui dentro il GLB non entra.
// ---------------------------------------------------------------------------
function costruisci(D) {
  const T = window.THREE;
  const scena = new T.Scene();
  const cam = new T.PerspectiveCamera(LENTE, 1, 0.1, 4000);

  // LA POLVERE: un punto per ogni punto misurato.
  const n = D.punti.length;
  const pos = new Float32Array(n * 3), meta = new Float32Array(n * 3),
        nasce = new Float32Array(n * 3), tinta = new Float32Array(n * 3),
        quando = new Float32Array(n), dim = new Float32Array(n);
  let minY = Infinity, maxY = -Infinity;
  for (const q of D.punti) { if (q[1] < minY) minY = q[1]; if (q[1] > maxY) maxY = q[1]; }

  let seme = 20260906;
  const caso = () => { seme = (seme * 1664525 + 1013904223) % 4294967296; return seme / 4294967296; };

  for (let i = 0; i < n; i++) {
    const q = D.punti[i];
    meta[i * 3] = q[0]; meta[i * 3 + 1] = q[1]; meta[i * 3 + 2] = q[2];
    // precipitano dall'alto, sulla verticale: si vedono cadere al loro posto
    nasce[i * 3] = q[0] + (caso() - 0.5) * 5;
    nasce[i * 3 + 1] = maxY + 10 + caso() * 26;
    nasce[i * 3 + 2] = q[2] + (caso() - 0.5) * 5;
    pos[i * 3] = nasce[i * 3]; pos[i * 3 + 1] = nasce[i * 3 + 1]; pos[i * 3 + 2] = nasce[i * 3 + 2];

    let zona = null, dmin = Infinity;
    for (const Z of D.zone) {
      const d = (Z.x - q[0]) * (Z.x - q[0]) + (Z.z - q[2]) * (Z.z - q[2]);
      if (d < dmin) { dmin = d; zona = Z; }
    }
    const c = zona ? zona.colore : MARCA[0];
    tinta[i * 3] = c[0]; tinta[i * 3 + 1] = c[1]; tinta[i * 3 + 2] = c[2];
    quando[i] = (zona ? zona.quando : 0.2) + caso() * 0.05;
    dim[i] = 0.22 + caso() * 0.20;
  }

  const geom = new T.BufferGeometry();
  geom.setAttribute('position', new T.BufferAttribute(pos, 3));
  geom.setAttribute('tinta', new T.BufferAttribute(tinta, 3));
  geom.setAttribute('dimensione', new T.BufferAttribute(dim, 1));
  geom.userData = { meta, nasce, quando, n };

  const mat = new T.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { opacita: { value: 0 }, scalaPixel: { value: 900 } },
    vertexShader: [
      'attribute float dimensione; attribute vec3 tinta;',
      'varying vec3 vC; varying float vV;',
      'uniform float scalaPixel;',
      'void main(){',
      '  vC = tinta;',
      '  vec4 mv = modelViewMatrix * vec4(position,1.0);',
      '  float d = max(0.001, -mv.z);',
      '  gl_PointSize = clamp(dimensione * scalaPixel / d, 2.0, 26.0);',
      '  vV = clamp(30.0 / d, 0.22, 1.0);',
      '  gl_Position = projectionMatrix * mv;',
      '}',
    ].join('\n'),
    fragmentShader: [
      'varying vec3 vC; varying float vV; uniform float opacita;',
      'void main(){',
      '  vec2 d = gl_PointCoord - vec2(0.5);',
      '  float r = length(d) * 2.0;',
      '  if (r > 1.0) discard;',
      '  float alone = pow(1.0 - r, 2.2);',
      '  float nucleo = pow(max(0.0, 1.0 - r * 2.6), 3.0);',
      '  gl_FragColor = vec4(vC * (1.0 - nucleo * 0.25), min(1.0, alone*0.5 + nucleo*1.1) * opacita * vV);',
      '}',
    ].join('\n'),
  });
  const polvere = new T.Points(geom, mat);
  polvere.frustumCulled = false;
  scena.add(polvere);

  // I RETTANGOLI DEGLI AMBIENTI: la forma che il programma ha MISURATO.
  // ⚠️ Non e' il pavimento del GLB: e' cio' che lui crede sia quell'ambiente.
  //    Se sbaglia, si vede — ed e' esattamente la controprova che serve.
  const piani = [];
  for (const Z of D.zone) {
    const g = new T.PlaneGeometry(Math.max(1, Z.lungo), Math.max(1, Z.largo));
    const m = new T.MeshBasicMaterial({
      color: new T.Color(Z.colore[0], Z.colore[1], Z.colore[2]),
      transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false,
    });
    const p = new T.Mesh(g, m);
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = -(Z.angolo || 0);
    p.position.set(Z.x, Z.y + 0.04, Z.z);
    scena.add(p);
    // il bordo, che e' quello che fa leggere la forma
    const eg = new T.EdgesGeometry(g);
    const em = new T.LineBasicMaterial({
      color: new T.Color(Z.colore[0], Z.colore[1], Z.colore[2]),
      transparent: true, opacity: 0,
    });
    const e = new T.LineSegments(eg, em);
    e.rotation.copy(p.rotation); e.position.copy(p.position);
    scena.add(e);

    // ⚠️ IL VOLUME, e l'altezza NON e' misurata: e' dichiarata.
    //    Misurato il 06/09: i punti sono il PAVIMENTO, e all'altezza
    //    dell'occhio un tappeto piatto si vede di taglio — cioe' non si vede.
    //    Senza volume la finestra resta vuota anche quando funziona tutto.
    //    Il prototipo di Raffaella aveva pareti e soffitto proprio per questo.
    //    ⚠️ L'altezza degli ambienti il programma NON la misura (sta scritto
    //       anche nel commento di `f4ff56a`, 30/08: resta quella del ruolo).
    //       Quindi qui e' una quota DICHIARATA, uguale per tutti, e non si
    //       finge che venga dal modello: serve a far leggere lo spazio, non
    //       afferma niente su quanto sia alto.
    const H = 2.6;
    const bg = new T.BoxGeometry(Math.max(1, Z.lungo), H, Math.max(1, Z.largo));
    const bm = new T.LineBasicMaterial({
      color: new T.Color(Z.colore[0], Z.colore[1], Z.colore[2]),
      transparent: true, opacity: 0,
    });
    const box = new T.LineSegments(new T.EdgesGeometry(bg), bm);
    box.rotation.y = -(Z.angolo || 0);
    box.position.set(Z.x, Z.y + H / 2, Z.z);
    scena.add(box);

    piani.push({ Z, m, em, bm });
  }

  return { scena, cam, geom, mat, piani, minY };
}

// ---------------------------------------------------------------------------
// LA FINESTRA
// ---------------------------------------------------------------------------
function apriFinestra() {
  const v = document.createElement('div');
  v.id = 'eidetica-live';
  v.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:2147483000', 'background:' + CARTA,
    'font-family:"Helvetica Neue",Helvetica,Arial,sans-serif', 'color:' + INCHIOSTRO,
    'opacity:0', 'transition:opacity .5s ease',
  ].join(';');
  document.body.appendChild(v);
  requestAnimationFrame(() => { v.style.opacity = '1'; });
  return v;
}

// L'apertura: il marchio con le ali che si aprono. ⚠️ Non ridisegnato: e' il
// file vero, lo stesso della schermata d'attesa.
function apertura(v) {
  const d = document.createElement('div');
  d.id = 'eidetica-live-apertura';
  d.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;'
                  + 'transition:opacity .8s ease;background:' + CARTA + ';z-index:5';
  d.innerHTML =
    '<div style="text-align:center">'
    + '<img src="./Assets/eidetica_intero.webp" alt="EIDETICA" '
    + 'style="display:block;width:min(72vw,420px);height:auto;margin:0 auto;'
    + 'animation:eidetica-ali 1.15s cubic-bezier(.2,.8,.2,1) both">'
    + '<div style="margin-top:26px;font-size:11px;letter-spacing:.24em;'
    + 'text-transform:uppercase;color:' + NEBBIA + '">' + P().sottotitolo + '</div>'
    + '</div>';
  v.appendChild(d);
  return d;
}

function plancia(v) {
  const d = document.createElement('div');
  d.style.cssText = [
    'position:absolute', 'left:50%', 'bottom:34px', 'transform:translateX(-50%)',
    'z-index:10', 'display:flex', 'align-items:center', 'gap:16px',
    'padding:12px 20px', 'border-radius:100px', 'background:rgba(255,255,255,.86)',
    'backdrop-filter:blur(18px)', '-webkit-backdrop-filter:blur(18px)',
    'box-shadow:0 1px 2px rgba(20,26,51,.06),0 12px 40px rgba(20,26,51,.1)',
    'font-size:13px', 'opacity:0', 'transition:opacity .6s ease',
  ].join(';');
  d.innerHTML =
    '<button id="el-play" style="display:flex;align-items:center;gap:9px;font:inherit;'
    + 'font-weight:500;border:0;background:none;cursor:pointer;color:inherit;padding:6px 2px">'
    + '<span style="width:26px;height:26px;border-radius:50%;display:grid;place-items:center;'
    + 'color:#fff;font-size:10px;padding-left:1px;background:linear-gradient(125deg,'
    + '#2B5CE6,#7B2FD4 45%,#E0348B 72%,#F9721F)">▶</span>'
    + '<span id="el-et">' + P().pausa + '</span></button>'
    + '<div style="width:1px;height:22px;background:#E3E5EE"></div>'
    + '<input id="el-barra" type="range" min="0" max="1000" value="0" '
    + 'style="width:200px;height:3px;-webkit-appearance:none;appearance:none;'
    + 'border-radius:3px;background:#E3E5EE;cursor:pointer">'
    + '<div style="width:1px;height:22px;background:#E3E5EE"></div>'
    + '<button id="el-suono" style="font:inherit;border:0;background:none;cursor:pointer;'
    + 'color:inherit;padding:6px 2px;white-space:nowrap">' + P().suono + ': on</button>'
    + '<div style="width:1px;height:22px;background:#E3E5EE"></div>'
    + '<button id="el-chiudi" style="font:inherit;border:0;background:none;cursor:pointer;'
    + 'color:' + NEBBIA + ';padding:6px 2px">' + P().chiudi + ' ✕</button>';
  v.appendChild(d);
  d.querySelector('#el-play').onclick = () => (S.corre ? pausa() : riparti());
  d.querySelector('#el-barra').oninput = (e) => { S.t = e.target.value / 1000; pausa(); };
  d.querySelector('#el-suono').onclick = (e) => {
    S.musica = !S.musica;
    e.target.textContent = P().suono + ': ' + (S.musica ? 'on' : 'off');
    if (S.musica && S.corre) musicaSu(); else musicaGiu();
  };
  d.querySelector('#el-chiudi').onclick = () => chiudi();
  return d;
}

function pannello(v) {
  const d = document.createElement('div');
  d.style.cssText = 'position:absolute;top:34px;right:34px;z-index:10;text-align:right;'
    + 'pointer-events:none;font-size:11.5px;line-height:1.8;color:' + NEBBIA
    + ';font-variant-numeric:tabular-nums;opacity:0;transition:opacity .6s ease';
  d.innerHTML = '<b id="el-fase" style="display:block;font-size:13px;font-weight:500;color:'
    + INCHIOSTRO + '"></b><span id="el-conta"></span><br><span id="el-occhio"></span>';
  v.appendChild(d);
  return d;
}

// ---------------------------------------------------------------------------
// LA MUSICA. Raffaella: «e la musica mettine una qualsiasi adesso». Un pad di
// quattro voci filtrate con un lento respiro: fa da aria, e l'aria non afferma
// niente sullo spazio — quindi non puo' mentire.
// ---------------------------------------------------------------------------
function creaMusica() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ac = new AC();
  const gn = ac.createGain(); gn.gain.value = 0;
  const flt = ac.createBiquadFilter();
  flt.type = 'lowpass'; flt.frequency.value = 780; flt.Q.value = 0.7;
  [110, 164.81, 220, 329.63].forEach((f, i) => {
    const o = ac.createOscillator(); o.type = i % 2 ? 'sine' : 'triangle';
    o.frequency.value = f;
    const g = ac.createGain(); g.gain.value = 0.16 / (i + 1);
    o.connect(g); g.connect(flt); o.start();
  });
  flt.connect(gn); gn.connect(ac.destination);
  const l = ac.createOscillator(); l.frequency.value = 0.055;
  const lg = ac.createGain(); lg.gain.value = 380;
  l.connect(lg); lg.connect(flt.frequency); l.start();
  return { ac, gn };
}
function musicaSu() {
  if (!S.musica) return;
  if (!S.audio) S.audio = creaMusica();
  if (!S.audio) return;
  if (S.audio.ac.state === 'suspended') S.audio.ac.resume();
  S.audio.gn.gain.cancelScheduledValues(S.audio.ac.currentTime);
  S.audio.gn.gain.linearRampToValueAtTime(0.075, S.audio.ac.currentTime + 2.5);
}
function musicaGiu() {
  if (!S.audio) return;
  S.audio.gn.gain.cancelScheduledValues(S.audio.ac.currentTime);
  S.audio.gn.gain.linearRampToValueAtTime(0, S.audio.ac.currentTime + 1.2);
}

// ---------------------------------------------------------------------------
const dolce = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));

function giro(ms) {
  if (!S.aperto) return;
  if (S.corre) {
    S.t += (S.ultimo ? ms - S.ultimo : 16) / FILM_MS;
    if (S.t >= 1) { S.t = 1; pausa(); }
  }
  S.ultimo = ms;
  const u = S.t, T = window.THREE;

  const w = S.tela.clientWidth, h = S.tela.clientHeight;
  if (S.tela.width !== w || S.tela.height !== h) {
    S.ren.setSize(w, h, false);
    S.cam.aspect = w / h; S.cam.updateProjectionMatrix();
  }
  S.mat.uniforms.scalaPixel.value = h / (2 * Math.tan(LENTE * Math.PI / 360));

  // i punti precipitano al loro posto MISURATO
  const g = S.geom, { meta, nasce, quando, n } = g.userData;
  const pos = g.attributes.position.array;
  for (let i = 0; i < n; i++) {
    const s = dolce((u - quando[i]) / 0.16);
    if (s >= 1) {
      pos[i * 3] = meta[i * 3]; pos[i * 3 + 1] = meta[i * 3 + 1]; pos[i * 3 + 2] = meta[i * 3 + 2];
    } else {
      pos[i * 3] = nasce[i * 3] + (meta[i * 3] - nasce[i * 3]) * s;
      pos[i * 3 + 1] = nasce[i * 3 + 1] + (meta[i * 3 + 1] - nasce[i * 3 + 1]) * s;
      pos[i * 3 + 2] = nasce[i * 3 + 2] + (meta[i * 3 + 2] - nasce[i * 3 + 2]) * s;
    }
  }
  g.attributes.position.needsUpdate = true;
  S.mat.uniforms.opacita.value = 0.35 + 0.6 * dolce(u / 0.08);

  // gli ambienti ricostruiti compaiono quando il cammino ci arriva
  let riconosciuti = 0;
  for (const p of S.piani) {
    const a = dolce((u - p.Z.quando - 0.10) / 0.10);
    if (a > 0.01) riconosciuti++;
    const cred = 0.45 + 0.55 * Math.min(1, p.Z.fiducia);
    p.m.opacity = a * 0.10 * cred;
    p.em.opacity = a * 0.55 * cred;
    if (p.bm) p.bm.opacity = a * 0.34 * cred;
  }

  // ⚠️ SI ORBITA, POI SI SCENDE — e l'ordine e' obbligato, non una preferenza.
  //
  //    Misurato il 06/09: camminando all'altezza dell'occhio dall'inizio la
  //    finestra restava VUOTA anche con tutto funzionante. Il motivo e'
  //    geometrico e vale su qualunque modello: cio' che il programma ricostruisce
  //    e' quasi tutto PAVIMENTO — la nuvola navigabile e le impronte degli
  //    ambienti — e un tappeto piatto, visto da 1,65 m, si vede di taglio.
  //    Il prototipo di Raffaella orbitava (distanza da 40 a 11), ed e' per
  //    questo che si legge: da fuori e dall'alto la pianta si vede tutta.
  //
  //    Quindi: si orbita mentre lo spazio si ricompone, e si SCENDE agli occhi
  //    solo alla fine — che e' anche la sequenza giusta di prodotto: prima si
  //    capisce lo spazio, poi ci si cammina dentro per la controprova.
  const occhio = attore().occhio;
  const DISCESA = 0.80;
  if (u < DISCESA || !S.via) {
    const k = dolce(Math.min(1, u / DISCESA));
    const m = S.centro;
    const ang = S.angolo0 + k * 1.15;
    const dist = S.raggio0 * (1 - 0.62 * k);
    const alt = S.altezza0 * (1 - 0.72 * k);
    S.cam.position.set(m[0] + Math.sin(ang) * dist, m[1] + alt, m[2] + Math.cos(ang) * dist);
    S.cam.lookAt(m[0], m[1], m[2]);
  } else {
    const k = Math.min(1, (u - DISCESA) / (1 - DISCESA));
    const i = Math.min(S.via.length - 2, Math.floor(k * (S.via.length - 1)));
    const f = k * (S.via.length - 1) - i;
    const a = S.via[i], b = S.via[i + 1];
    const px = a[0] + (b[0] - a[0]) * f, py = a[1] + (b[1] - a[1]) * f,
          pz = a[2] + (b[2] - a[2]) * f;
    const avanti = S.via[Math.min(S.via.length - 1, i + 8)];
    S.cam.position.set(px, py + occhio, pz);
    // si guarda DRITTO: mirare piu' in basso inclina la camera, e una camera
    // inclinata in giu' si legge come «sto in alto» — Raffaella l'ha sentito
    // prima che venisse misurato.
    S.cam.lookAt(avanti[0], avanti[1] + occhio, avanti[2]);
  }

  S.ren.render(S.scena, S.cam);
  disegnaNomi(u);

  const W = P();
  const fase = u < 0.05 ? 0 : u < 0.35 ? 1 : u < 0.6 ? 2 : u < 0.85 ? 3 : 4;
  const ef = S.pannello.querySelector('#el-fase');
  const ec = S.pannello.querySelector('#el-conta');
  const eo = S.pannello.querySelector('#el-occhio');
  if (ef) ef.textContent = W.fasi[fase];
  if (ec) ec.textContent = riconosciuti + ' ' + (riconosciuti === 1 ? W.uno : W.molti);
  if (eo) eo.textContent = W.occhio + ' ' + occhio.toFixed(2).replace('.', ',') + ' m';
  if (S.corre) { const b = S.plancia.querySelector('#el-barra'); if (b) b.value = Math.round(u * 1000); }

  S.raf = requestAnimationFrame(giro);
}

// I cartellini: pallino, filo, pastiglia — come nel prototipo di Raffaella.
function disegnaNomi(u) {
  const c = S.sopra, T = window.THREE;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = S.tela.clientWidth, h = S.tela.clientHeight;
  if (c.width !== Math.round(w * dpr)) {
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    c.style.width = w + 'px'; c.style.height = h + 'px';
  }
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const V = new T.Vector3();
  const presi = [];
  for (const Z of S.zone) {
    const a = dolce((u - Z.quando - 0.14) / 0.08);
    if (a <= 0.02) continue;
    V.set(Z.x, Z.y + 1.5, Z.z).project(S.cam);
    if (V.z > 1) continue;
    let x = (V.x * 0.5 + 0.5) * w, y = (-V.y * 0.5 + 0.5) * h;
    if (x < -200 || x > w + 200) continue;
    let salto = 0;
    while (presi.some((q) => Math.abs(q.x - x) < 160 && Math.abs(q.y - (y - salto)) < 30) && salto < 220) salto += 32;
    const base = y; y -= salto;
    presi.push({ x, y });
    const col = Z.colore.map((v) => Math.round(v * 255));
    const rgba = (al) => 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + al + ')';
    // ⚠️ la fiducia entra qui, e solo qui: un nome incerto si vede meno
    const al = a * (0.45 + 0.55 * Math.min(1, Z.fiducia));
    const testo = Z.nome || (P().senzaNome + ' · ' + Math.round(Z.area) + ' m²');
    g.font = '500 12.5px "Helvetica Neue",Helvetica,Arial,sans-serif';
    const lw = g.measureText(testo).width;
    const py = y - 30 * a;
    g.strokeStyle = rgba(0.3 * al); g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, base); g.lineTo(x, py + 11); g.stroke();
    g.beginPath(); g.fillStyle = rgba(0.85 * al); g.arc(x, base, 2.6, 0, 6.283); g.fill();
    g.beginPath();
    if (g.roundRect) g.roundRect(x - lw / 2 - 11, py - 11.5, lw + 22, 23, 11.5);
    else g.rect(x - lw / 2 - 11, py - 11.5, lw + 22, 23);
    g.fillStyle = 'rgba(255,255,255,' + (0.93 * al) + ')'; g.fill();
    g.strokeStyle = rgba(0.3 * al); g.stroke();
    g.fillStyle = 'rgba(20,26,51,' + al + ')';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(testo, x, py + 0.5);
  }
}

// ---------------------------------------------------------------------------
export function apri() {
  if (S.aperto) return true;
  const T = window.THREE;
  if (!T) { console.warn('[EIDETICA live] three non è pronto'); return false; }
  const D = dati();
  if (!D) { alert(P().niente); return false; }

  S.velo = apriFinestra();
  const ap = apertura(S.velo);

  const tela = document.createElement('canvas');
  tela.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  tela.style.setProperty('background', 'transparent', 'important');
  S.velo.appendChild(tela);
  const sopra = document.createElement('canvas');
  sopra.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:6';
  sopra.style.setProperty('background', 'transparent', 'important');
  S.velo.appendChild(sopra);
  S.tela = tela; S.sopra = sopra;

  const ren = new T.WebGLRenderer({ canvas: tela, antialias: true, alpha: true });
  ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  ren.setClearColor(0x000000, 0);

  const c = costruisci(D);
  S.ren = ren; S.scena = c.scena; S.cam = c.cam;
  S.geom = c.geom; S.mat = c.mat; S.piani = c.piani;
  S.zone = D.zone; S.via = D.via;

  // ⚠️ L'orbita si calcola sui PUNTI MISURATI, non sull'ingombro del GLB: qui
  //    dentro il modello dell'utente non esiste, e non deve entrare nemmeno
  //    per decidere un'inquadratura.
  let ax = Infinity, bx = -Infinity, az = Infinity, bz = -Infinity, ay = Infinity, by = -Infinity;
  for (const q of D.punti) {
    if (q[0] < ax) ax = q[0]; if (q[0] > bx) bx = q[0];
    if (q[2] < az) az = q[2]; if (q[2] > bz) bz = q[2];
    if (q[1] < ay) ay = q[1]; if (q[1] > by) by = q[1];
  }
  S.centro = [(ax + bx) / 2, ay + 1.6, (az + bz) / 2];
  S.raggio0 = Math.max(26, Math.max(bx - ax, bz - az) * 0.72);
  S.altezza0 = S.raggio0 * 0.62;
  S.angolo0 = Math.atan2(D.porta[0] - S.centro[0], D.porta[1] - S.centro[2]);

  S.plancia = plancia(S.velo);
  S.pannello = pannello(S.velo);
  S.aperto = true; S.t = 0; S.corre = false; S.ultimo = 0;

  // L'apertura dura il tempo delle ali, poi il film.
  setTimeout(() => {
    ap.style.opacity = '0';
    setTimeout(() => ap.remove(), 800);
    S.plancia.style.opacity = '1';
    S.pannello.style.opacity = '1';
    S.corre = true; S.ultimo = 0;
    musicaSu();
  }, APERTURA_MS);

  S.esc = (e) => { if (e.key === 'Escape') chiudi(); };
  addEventListener('keydown', S.esc);
  S.raf = requestAnimationFrame(giro);
  console.log('[EIDETICA live] ' + D.punti.length.toLocaleString() + ' ' + P().punti
    + ', ' + D.zone.length + ' ambienti ricostruiti'
    + (D.via ? ', cammino vero di ' + D.via.length + ' passi' : ', senza cammino')
    + '. Il modello dell’utente NON viene disegnato: si vede solo ciò che il programma ha capito.');
  return true;
}

export function pausa() {
  S.corre = false;
  const et = S.plancia && S.plancia.querySelector('#el-et');
  if (et) et.textContent = S.t >= 1 ? P().rivedi : P().riprendi;
  musicaGiu();
}
export function riparti() {
  if (S.t >= 1) S.t = 0;
  S.corre = true; S.ultimo = 0;
  const et = S.plancia && S.plancia.querySelector('#el-et');
  if (et) et.textContent = P().pausa;
  musicaSu();
}
export function chiudi() {
  if (!S.aperto) return;
  S.aperto = false; S.corre = false;
  if (S.raf) cancelAnimationFrame(S.raf);
  musicaGiu();
  removeEventListener('keydown', S.esc);
  if (S.geom) S.geom.dispose();
  if (S.mat) S.mat.dispose();
  if (S.ren) S.ren.dispose();
  if (S.velo) { S.velo.style.opacity = '0'; const v = S.velo; setTimeout(() => v.remove(), 500); }
  S.velo = S.tela = S.sopra = S.ren = S.scena = S.cam = S.geom = S.mat = null;
  S.plancia = S.pannello = null;
}

// ---------------------------------------------------------------------------
// IL PULSANTE. Raffaella: «un pulsante vocativo di questa atmosfera, con il
// nostro logo, in basso a destra sul riquadro perimetrale, con un minimo di
// ombreggiatura». Non e' un comando in piu' fra venti: e' la porta del cinema.
// ---------------------------------------------------------------------------
function pulsante() {
  if (document.getElementById('eidetica-live-btn')) return;
  const b = document.createElement('button');
  b.id = 'eidetica-live-btn';
  b.style.cssText = [
    'position:fixed', 'right:26px', 'bottom:96px', 'z-index:9400',
    'display:flex', 'align-items:center', 'gap:11px', 'padding:10px 18px 10px 12px',
    'border:0', 'border-radius:100px', 'cursor:pointer',
    'background:rgba(255,255,255,.92)', 'backdrop-filter:blur(18px)',
    '-webkit-backdrop-filter:blur(18px)',
    'box-shadow:0 2px 6px rgba(20,26,51,.10),0 14px 44px rgba(20,26,51,.16)',
    'font-family:"Helvetica Neue",Helvetica,Arial,sans-serif', 'font-size:13px',
    'font-weight:500', 'color:' + INCHIOSTRO,
    'transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s ease',
  ].join(';');
  b.innerHTML =
    '<img src="./Assets/eidetica_simbolo_trasparente.webp" alt="" '
    + 'style="width:30px;height:30px;object-fit:contain;display:block">'
    + '<span style="letter-spacing:.04em">' + P().pulsante + '</span>';
  b.onmouseenter = () => {
    b.style.transform = 'translateY(-2px) scale(1.02)';
    b.style.boxShadow = '0 4px 10px rgba(20,26,51,.12),0 18px 54px rgba(123,47,212,.28)';
  };
  b.onmouseleave = () => { b.style.transform = ''; b.style.boxShadow = ''; };
  b.onclick = () => apri();
  document.body.appendChild(b);
}

if (typeof window !== 'undefined') {
  // La maniglia per guardarci dentro dalla console, come fanno gli altri
  // moduli: senza, un film che non si vede non si puo' nemmeno interrogare.
  window.__eideticaLive = S;
  window.veritasCinema = {
    apri, chiudi, pausa, riparti,
    avvia: apri, ferma: chiudi, spegni: chiudi,
    stato: () => ({ aperto: S.aperto, t: S.t, corre: S.corre, zone: S.zone.length,
                    attore: attore().chiave, lingua: lingua(), cammino: !!S.via }),
  };
  const attesa = (n) => {
    if (document.body) { pulsante(); return; }
    if (n < 40) setTimeout(() => attesa(n + 1), 300);
  };
  attesa(0);
  console.log('[EIDETICA live] pronto — il pulsante è in basso a destra, oppure window.veritasCinema.apri()');
}
