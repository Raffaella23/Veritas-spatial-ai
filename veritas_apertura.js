// veritas_apertura.js — L'APERTURA. La scena vuota che prende forma, in diretta.
// =============================================================================
//
// Raffaella, 16/09/2026: «io mi immaginavo una scena vuota in prospettiva,
// renderizzata, in cui si accendevano progressivamente i volumi e parti di
// mesh identificate dall'occhio... agganciandoci direttamente all'oggetto 3D,
// renderizzato davanti all'osservatore, in diretta.»
//
// QUESTO FILE FA UNA COSA SOLA: appena un modello entra, apre un velo sopra
// tutto il resto — il modello vero (non un doppione disegnato a mano) prende
// peso, poi ogni volume che l'occhio riconosce davvero si accende nella SUA
// posizione vera, col SUO nome vero, mentre il giro va avanti. Non e' un
// filmato canned: e' lo stesso stato che gia' gira, solo reso visibile.
//
// ⚠️ NON RIFA' I PUNTINI. Tolti il 15/09 su richiesta di Raffaella ("quel
//    rendering con i puntini non fa capire niente") — qui non ce n'e' uno.
//
// ⚠️ NON TOCCA LA SCENA VERA. Le mesh qui dentro sono repliche che
//    condividono la STESSA geometria (BufferGeometry per riferimento, non
//    copiata) con una materia fantasma tutta loro, in un canvas e una scena
//    TUTTI NOSTRI, sopra un velo. Se questo file si spegne, l'app sotto non
//    se ne accorge.
//
// ⚠️ IL VESTITO E' CARTA (Raffaella, 05/09/2026, vive in veritas_carta.js) —
//    corretto il 16/09 dopo la prima prova: la prima versione era scura,
//    contro la decisione gia' presa. Piattaforma chiara (#FAFBFA), la scena
//    3D e' grigia (#E9EBF0, "il nero proprio nero no"), il testo e' inchiostro
//    scuro. La tinta d'accento viene dalla stessa formula delle quattro
//    velature del marchio (oklch, grado imposto uguale) — qui il grado 266,
//    lo stesso della finestra "modello": e' il mestiere di questa apertura.
//
// MANOPOLE
//   window.__veritasAperturaAuto = false   per NON farla partire da sola
//   window.__veritasAperturaDurata         ms prima dello sbiadimento (default 30000)
//
//   node --check veritas_apertura.js
// =============================================================================

const DURATA_DEFAULT = 30000;

// La stessa formula delle velature del marchio (decisione-vestito-carta):
// oklch(.965 .026 H) per un fondo di pannello, il grado 266 ("modello") tenuto
// e basta per il tono chiaro. Per un accento che si deve VEDERE su grigio
// chiaro (il segnavolume, i bordi) serve piu' chroma e meno luce: qui non si
// inventa un colore nuovo, si scende sulla STESSA retta di tinta (266°).
const VEIL_266 = 'oklch(.965 .026 266)';
const ACCENTO_266 = 'oklch(.58 .16 266)';   // per CSS (bordi, testo d'accento)
const ACCENTO_266_HEX = 0x5b63c9;           // stessa tinta, approssimata per THREE (non legge oklch)
const CARTA = '#FAFBFA';
const ALZATO = '#FFFFFF';
const SCENA_GRIGIA = 0xe9ebf0;
const INCHIOSTRO = '#232838';
const INCHIOSTRO_MUTO = '#6b7280';

let S = null; // stato della sessione aperta corrente

function log(m) { try { console.log('[VERITAS apertura] ' + m); } catch (e) {} }

function creaVelo() {
  const velo = document.createElement('div');
  velo.style.cssText = `position:fixed;inset:0;z-index:99990;background:${CARTA};`
    + 'opacity:0;transition:opacity 900ms ease;overflow:hidden;font-family:"JetBrains Mono",monospace;';
  document.body.appendChild(velo);
  requestAnimationFrame(() => { velo.style.opacity = '1'; });

  const tela = document.createElement('canvas');
  tela.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  velo.appendChild(tela);

  const testata = document.createElement('div');
  testata.style.cssText = 'position:absolute;left:0;right:0;top:0;padding:28px 36px;pointer-events:none;';
  testata.innerHTML = `<div style="font-size:11px;letter-spacing:0.14em;color:${INCHIOSTRO_MUTO};">EIDETICA</div>`
    + `<div id="va-riga1" style="font-size:15px;margin-top:6px;min-height:20px;color:${INCHIOSTRO};font-weight:600;"></div>`
    + `<div id="va-riga2" style="font-size:11.5px;margin-top:4px;min-height:16px;color:${INCHIOSTRO_MUTO};"></div>`;
  velo.appendChild(testata);

  const salta = document.createElement('button');
  salta.textContent = 'Entra ->';
  salta.style.cssText = `position:absolute;right:28px;bottom:28px;z-index:3;`
    + `padding:10px 18px;border-radius:8px;border:1px solid ${ACCENTO_266};`
    + `background:${ALZATO};color:${INCHIOSTRO};font-family:inherit;font-size:12px;`
    + 'cursor:pointer;letter-spacing:0.04em;box-shadow:0 2px 8px rgba(30,35,60,0.10);';
  salta.onmouseenter = () => { salta.style.background = VEIL_266; };
  salta.onmouseleave = () => { salta.style.background = ALZATO; };
  salta.onclick = () => chiudi();
  velo.appendChild(salta);

  // IL PANNELLO LATERALE — Raffaella, 16/09: «pannelli informativi laterali
  // che poi confluiscano nella documentazione». Stessa lista che qui si
  // limita a mostrare e' pensata per diventare, senza altra trasformazione,
  // la sorgente del report scaricabile: {label, tipo, pos} per ogni riga,
  // stesso ordine in cui l'occhio le ha capite.
  const pannello = document.createElement('div');
  pannello.style.cssText = `position:absolute;right:28px;top:28px;bottom:80px;width:280px;`
    + `background:${ALZATO};border:1px solid rgba(35,40,56,0.10);border-radius:12px;`
    + 'box-shadow:0 4px 20px rgba(30,35,60,0.08);overflow:hidden;display:flex;flex-direction:column;'
    + 'opacity:0;transition:opacity 600ms ease;';
  pannello.innerHTML = `<div style="padding:12px 16px;background:${VEIL_266};border-bottom:1px solid rgba(35,40,56,0.08);">`
    + `<div style="font-size:10px;letter-spacing:0.1em;color:${INCHIOSTRO_MUTO};">MODELLO</div>`
    + `<div style="font-size:12.5px;color:${INCHIOSTRO};font-weight:600;">ciò che sto capendo</div></div>`
    + '<div id="va-lista" style="flex:1;overflow-y:auto;padding:6px 0;"></div>';
  velo.appendChild(pannello);
  requestAnimationFrame(() => { pannello.style.opacity = '1'; });

  const strati = document.createElement('div');
  strati.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
  velo.appendChild(strati);

  return {
    velo, tela, strati, pannello,
    lista: pannello.querySelector('#va-lista'),
    riga1: testata.querySelector('#va-riga1'),
    riga2: testata.querySelector('#va-riga2'),
  };
}

function aggiungiRigaPannello(S, testo, sottotitolo) {
  const riga = document.createElement('div');
  riga.style.cssText = `padding:8px 16px;border-bottom:1px solid rgba(35,40,56,0.06);`
    + 'opacity:0;transform:translateX(6px);transition:opacity 400ms ease, transform 400ms ease;';
  riga.innerHTML = `<div style="font-size:12px;color:${INCHIOSTRO};">${testo}</div>`
    + (sottotitolo ? `<div style="font-size:10px;color:${INCHIOSTRO_MUTO};margin-top:1px;">${sottotitolo}</div>` : '');
  S.lista.appendChild(riga);
  requestAnimationFrame(() => { riga.style.opacity = '1'; riga.style.transform = 'translateX(0)'; });
  // Cresce dal basso: l'ultima cosa capita resta visibile senza dover
  // scorrere apposta, come un referto che si scrive da solo.
  S.lista.scrollTop = S.lista.scrollHeight;
}

// Una replica fantasma del modello vero: STESSA geometria (per riferimento),
// stessa posizione nel mondo (matrixWorld copiata), materia neutra tutta
// nostra. Non e' un secondo modello: e' lo stesso, vestito d'argilla — grigia
// chiara, come la vista 3D di veritas_carta.js, non scura.
function replicaFantasma(THREE, radice, scena) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xaab0bd, roughness: 0.88, metalness: 0.04,
  });
  let n = 0;
  radice.updateMatrixWorld(true);
  radice.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const m = new THREE.Mesh(o.geometry, mat);
    m.matrix.copy(o.matrixWorld);
    m.matrixAutoUpdate = false;
    scena.add(m);
    n++;
  });
  log('replica fantasma: ' + n + ' mesh, stessa geometria del modello vero');
  return mat;
}

function inquadraTutto(THREE, radice, cam) {
  const box = new THREE.Box3().setFromObject(radice);
  const size = new THREE.Vector3(); box.getSize(size);
  const centro = new THREE.Vector3(); box.getCenter(centro);
  const raggio = Math.max(size.x, size.y, size.z, 1) * 0.72;
  cam.position.set(centro.x + raggio * 0.9, centro.y + raggio * 0.62, centro.z + raggio * 0.9);
  cam.lookAt(centro);
  cam.near = raggio * 0.01; cam.far = raggio * 12;
  cam.updateProjectionMatrix();
  return { box, centro, raggio };
}

// Il reticolo a terra — la stessa idea di veritas_carta.js ("vista 3D grigia
// col reticolo"), qui solo sul pavimento: le pareti in prospettiva libera
// restano piu' lette senza gabbia intorno a un modello che gira in automatico.
function reticoloPavimento(THREE, scena, box) {
  const size = new THREE.Vector3(); box.getSize(size);
  const passo = Math.max(2, Math.round(Math.max(size.x, size.z) / 40));
  const divisioni = Math.max(4, Math.round(Math.max(size.x, size.z) / passo));
  const lato = Math.max(size.x, size.z) * 1.15;
  const griglia = new THREE.GridHelper(lato, divisioni, 0xc3c8d4, 0xd7dae2);
  griglia.position.set(box.min.x + size.x / 2, box.min.y - 0.02, box.min.z + size.z / 2);
  scena.add(griglia);
}

// Un segnavolume: una piccola sfera che pulsa piano, piu' un'etichetta HTML
// proiettata sulla sua posizione — niente sprite-a-canvas, il testo resta
// nitido a ogni zoom perche' e' DOM vero sopra il canvas.
function accendiVolume(THREE, S, pos, testo) {
  const geo = new THREE.SphereGeometry(Math.max(0.35, S.raggioScena * 0.014), 16, 12);
  const mat = new THREE.MeshStandardMaterial({
    color: ACCENTO_266_HEX, emissive: ACCENTO_266_HEX, emissiveIntensity: 0,
    transparent: true, opacity: 0,
  });
  const sfera = new THREE.Mesh(geo, mat);
  sfera.position.set(pos[0], pos[1] + 0.15, pos[2]);
  S.scena.add(sfera);

  const et = document.createElement('div');
  et.style.cssText = `position:absolute;transform:translate(-50%,-140%);`
    + `padding:3px 9px;border-radius:6px;background:${ALZATO};`
    + `border:1px solid ${ACCENTO_266};color:${INCHIOSTRO};font-size:11px;`
    + 'white-space:nowrap;opacity:0;transition:opacity 500ms ease;pointer-events:none;'
    + 'box-shadow:0 2px 6px rgba(30,35,60,0.12);';
  et.textContent = testo;
  S.strati.appendChild(et);

  S.volumi.push({ sfera, mat, et, pos3: sfera.position, nato: performance.now() });
  requestAnimationFrame(() => { et.style.opacity = '1'; });
}

function aggiornaVolumi(S) {
  const now = performance.now();
  const v3 = new (window.THREE).Vector3();
  for (const v of S.volumi) {
    const eta = Math.min(1, (now - v.nato) / 700);
    v.mat.opacity = eta;
    v.mat.emissiveIntensity = 0.25 + 0.35 * Math.sin(now * 0.0025 + v.nato);
    v.sfera.scale.setScalar(0.4 + eta * 0.6);
    v3.copy(v.pos3).project(S.cam);
    if (v3.z > 1) { v.et.style.display = 'none'; continue; }
    v.et.style.display = 'block';
    v.et.style.left = ((v3.x * 0.5 + 0.5) * S.larghezza) + 'px';
    v.et.style.top = ((-v3.y * 0.5 + 0.5) * S.altezza) + 'px';
  }
}

// I due ganci veri: ogni vista esaminata (conteggio onesto, niente stime),
// e ogni volta che il circuito occhio-cervello assegna dei nomi — la STESSA
// chiamata che gia' scrive sulle tappe vere (__veritasApplicaOcchi), non una
// finzione a parte. Si aggancia in coda a chi c'e' gia' (veritas_catena.js
// lo fa allo stesso modo): mai sostituire, sempre incatenare.
function agganciaEventiVeri(S) {
  let viste = 0;
  S.suVista = () => {
    viste++;
    if (S.riga2) S.riga2.textContent = viste + (viste === 1 ? ' vista esaminata' : ' viste esaminate');
  };
  addEventListener('veritas:vista', S.suVista);

  S.applicaOcchiPrec = window.__veritasApplicaOcchi;
  window.__veritasApplicaOcchi = function (esito, zone) {
    let out;
    try { out = S.applicaOcchiPrec ? S.applicaOcchiPrec.apply(this, arguments) : undefined; }
    finally {
      try {
        if (S.aperto && esito && esito.assegnate) {
          const nodi = (zone && zone.length) ? zone
            : (typeof window.__veritasGetNodes === 'function' ? window.__veritasGetNodes() : []);
          let nuovi = 0;
          for (const a of esito.assegnate) {
            const n = nodi && nodi[a.indice];
            if (!n || !n.pos || a.sicurezza === 'bassa') continue;
            const chiave = n.id || (n.pos[0] + '_' + n.pos[2]);
            if (S.gia.has(chiave)) continue;
            S.gia.add(chiave);
            const nome = n.label || a.tipo || 'zona riconosciuta';
            accendiVolume(window.THREE, S, n.pos, nome);
            aggiungiRigaPannello(S, nome, a.tipo && a.tipo !== nome ? a.tipo : null);
            nuovi++;
          }
          if (nuovi && S.riga1) {
            S.riga1.textContent = S.gia.size + ' ' + (S.gia.size === 1 ? 'ambiente riconosciuto' : 'ambienti riconosciuti');
          }
        }
      } catch (e) { /* la messa in scena non deve mai far cadere il vero assegnamento */ }
    }
    return out;
  };
}

function sgancia(S) {
  try { removeEventListener('veritas:vista', S.suVista); } catch (e) {}
  // Il ponte su __veritasApplicaOcchi NON si ripristina: e' incatenato, come
  // veritas_catena.js fa con lo stesso identico ponte. Staccarlo rischierebbe
  // di tagliar via anche chi si e' agganciato sopra di noi nel frattempo — la
  // guardia S.aperto (sopra) lo rende gia' innocuo a velo chiuso.
}

function giro(t) {
  if (!S || !S.aperto) return;
  const dt = S.ultimo ? Math.min(0.05, (t - S.ultimo) / 1000) : 0;
  S.ultimo = t;
  aggiornaVolumi(S);
  S.ren.render(S.scena, S.cam);
  S.raf = requestAnimationFrame(giro);
}

function chiudi() {
  if (!S || !S.aperto) return;
  S.aperto = false;
  cancelAnimationFrame(S.raf);
  sgancia(S);
  S.velo.style.opacity = '0';
  setTimeout(() => { try { S.velo.remove(); } catch (e) {} }, 900);
  log('chiusa — l\'analisi vera continua sotto, invariata');
  S = null;
}

function costruisciEApri() {
  const THREE = window.THREE;
  const radice = window.__veritasModelRoot;
  if (!THREE || !radice) return;
  if (window.__veritasAperturaAuto === false) return;
  if (S && S.aperto) return;

  const { velo, tela, strati, pannello, lista, riga1, riga2 } = creaVelo();
  const larghezza = innerWidth, altezza = innerHeight;
  const ren = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: false });
  ren.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  ren.setSize(larghezza, altezza);
  ren.setClearColor(SCENA_GRIGIA, 1);
  ren.outputColorSpace = THREE.SRGBColorSpace;
  ren.toneMapping = THREE.ACESFilmicToneMapping;

  const scena = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(42, larghezza / altezza, 0.1, 1000);
  scena.add(new THREE.HemisphereLight(0xffffff, 0xd8dbe3, 1.25));
  const sole = new THREE.DirectionalLight(0xfff8ee, 1.1);
  sole.position.set(40, 60, 30);
  scena.add(sole);

  const { box, raggio } = inquadraTutto(THREE, radice, cam);
  replicaFantasma(THREE, radice, scena);
  reticoloPavimento(THREE, scena, box);

  S = {
    aperto: true, velo, tela, strati, pannello, lista, riga1, riga2, ren, scena, cam,
    larghezza, altezza, raggioScena: raggio, volumi: [], gia: new Set(), ultimo: 0,
  };
  riga1.textContent = 'sto guardando lo spazio...';
  agganciaEventiVeri(S);

  const durata = window.__veritasAperturaDurata || DURATA_DEFAULT;
  S.timerFine = setTimeout(chiudi, durata);
  // Un ridimensionamento della finestra non deve lasciare l'apertura storta.
  S.onResize = () => {
    if (!S || !S.aperto) return;
    S.larghezza = innerWidth; S.altezza = innerHeight;
    S.ren.setSize(S.larghezza, S.altezza);
    S.cam.aspect = S.larghezza / S.altezza; S.cam.updateProjectionMatrix();
  };
  addEventListener('resize', S.onResize);

  log('aperta — modello vero, ' + Math.round(durata / 1000) + ' s prima dello sbiadimento (o "Entra")');
  S.raf = requestAnimationFrame(giro);
}

// Parte da sola quando un modello nuovo entra — stessa filosofia di
// veritas_montaggio.js ("il riconoscimento non si chiede: avviene"): qui non
// c'e' bottone, l'apertura succede.
let ultimaRadiceVista = null;
function forseParti() {
  const r = window.__veritasModelRoot;
  if (!r || r === ultimaRadiceVista) return;
  ultimaRadiceVista = r;
  costruisciEApri();
}
addEventListener('veritas:modello', forseParti);
setInterval(forseParti, 1000); // vedetta, come in veritas_montaggio.js: copre chi carica senza sparare l'evento

window.__veritasApertura = { apri: costruisciEApri, chiudi };
log('pronta — parte da sola al caricamento di un modello, o window.__veritasApertura.apri()');

export default { apri: costruisciEApri, chiudi };
