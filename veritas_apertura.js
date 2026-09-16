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
// MANOPOLE
//   window.__veritasAperturaAuto = false   per NON farla partire da sola
//   window.__veritasAperturaDurata         ms prima dello sbiadimento (default 30000)
//
//   node --check veritas_apertura.js
// =============================================================================

const DURATA_DEFAULT = 30000;

let S = null; // stato della sessione aperta corrente

function log(m) { try { console.log('[VERITAS apertura] ' + m); } catch (e) {} }

function creaVelo() {
  const velo = document.createElement('div');
  velo.style.cssText = 'position:fixed;inset:0;z-index:99990;background:#0b0d12;'
    + 'opacity:0;transition:opacity 900ms ease;overflow:hidden;font-family:"JetBrains Mono",monospace;';
  document.body.appendChild(velo);
  requestAnimationFrame(() => { velo.style.opacity = '1'; });

  const tela = document.createElement('canvas');
  tela.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  velo.appendChild(tela);

  const testata = document.createElement('div');
  testata.style.cssText = 'position:absolute;left:0;right:0;top:0;padding:28px 36px;'
    + 'color:#e2e8f0;pointer-events:none;';
  testata.innerHTML = '<div style="font-size:11px;letter-spacing:0.14em;color:#64748b;">EIDETICA</div>'
    + '<div id="va-riga1" style="font-size:15px;margin-top:6px;min-height:20px;color:#cbd5e1;"></div>'
    + '<div id="va-riga2" style="font-size:11.5px;margin-top:4px;min-height:16px;color:#64748b;"></div>';
  velo.appendChild(testata);

  const salta = document.createElement('button');
  salta.textContent = 'Entra ->';
  salta.style.cssText = 'position:absolute;right:28px;bottom:28px;z-index:2;'
    + 'padding:10px 18px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);'
    + 'background:rgba(255,255,255,0.06);color:#e2e8f0;font-family:inherit;font-size:12px;'
    + 'cursor:pointer;letter-spacing:0.04em;';
  salta.onmouseenter = () => { salta.style.background = 'rgba(255,255,255,0.14)'; };
  salta.onmouseleave = () => { salta.style.background = 'rgba(255,255,255,0.06)'; };
  salta.onclick = () => chiudi();
  velo.appendChild(salta);

  const strati = document.createElement('div');
  strati.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
  velo.appendChild(strati);

  return { velo, tela, strati, riga1: testata.querySelector('#va-riga1'), riga2: testata.querySelector('#va-riga2') };
}

// Una replica fantasma del modello vero: STESSA geometria (per riferimento),
// stessa posizione nel mondo (matrixWorld copiata), materia neutra tutta
// nostra. Non e' un secondo modello: e' lo stesso, vestito d'argilla.
function replicaFantasma(THREE, radice, scena) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x3a4250, roughness: 0.92, metalness: 0.05,
    emissive: 0x0a0c10, emissiveIntensity: 1,
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

// Un segnavolume: una piccola sfera che pulsa piano, piu' un'etichetta HTML
// proiettata sulla sua posizione — niente sprite-a-canvas, il testo resta
// nitido a ogni zoom perche' e' DOM vero sopra il canvas.
function accendiVolume(THREE, S, pos, testo) {
  const geo = new THREE.SphereGeometry(Math.max(0.35, S.raggioScena * 0.014), 16, 12);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x7dd3fc, emissive: 0x38bdf8, emissiveIntensity: 0, transparent: true, opacity: 0,
  });
  const sfera = new THREE.Mesh(geo, mat);
  sfera.position.set(pos[0], pos[1] + 0.15, pos[2]);
  S.scena.add(sfera);

  const et = document.createElement('div');
  et.style.cssText = 'position:absolute;transform:translate(-50%,-140%);'
    + 'padding:3px 9px;border-radius:6px;background:rgba(11,13,18,0.72);'
    + 'border:1px solid rgba(125,211,252,0.35);color:#e0f2fe;font-size:11px;'
    + 'white-space:nowrap;opacity:0;transition:opacity 500ms ease;pointer-events:none;';
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
    v.mat.emissiveIntensity = 0.4 + 0.5 * Math.sin(now * 0.0025 + v.nato);
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
            accendiVolume(window.THREE, S, n.pos, n.label || a.tipo || 'zona riconosciuta');
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
  try { if (window.__veritasApplicaOcchi && S.applicaOcchiPrec !== undefined) {
    // Si ripristina solo se nessun altro si e' agganciato sopra di noi nel
    // frattempo (stesso identico test di sicurezza che il codice usa altrove
    // prima di togliere un ponte creato da se': se la firma non torna piu'
    // quella prevista, meglio lasciare la catena com'e' che romperla).
  } } catch (e) {}
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

  const { velo, tela, strati, riga1, riga2 } = creaVelo();
  const larghezza = innerWidth, altezza = innerHeight;
  const ren = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: false });
  ren.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  ren.setSize(larghezza, altezza);
  ren.outputColorSpace = THREE.SRGBColorSpace;
  ren.toneMapping = THREE.ACESFilmicToneMapping;

  const scena = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(42, larghezza / altezza, 0.1, 1000);
  scena.add(new THREE.HemisphereLight(0x9fb4d8, 0x1a1408, 1.15));
  const sole = new THREE.DirectionalLight(0xfff4e0, 1.6);
  sole.position.set(40, 60, 30);
  scena.add(sole);

  const { raggio } = inquadraTutto(THREE, radice, cam);
  replicaFantasma(THREE, radice, scena);

  S = {
    aperto: true, velo, tela, strati, riga1, riga2, ren, scena, cam,
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
