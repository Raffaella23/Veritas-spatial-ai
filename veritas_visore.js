// ============================================================================
// IL VISORE — Fase C (30/09/2026)
// Raffaella: «entrando nel visore vedo il plastico in scala, con gli agenti e
// i flussi luminosi in movimento». Si prova col Quest collegato al PC (Quest
// Link), nel Chrome del PC: il progetto e l'analisi restano dove sono.
//
// COS'E': la STESSA scena della pagina, vista col visore. Nessun secondo
// mondo, niente veritas_cinema.js: stesso modello d'argilla, stessi agenti,
// stessa luce, stesso orologio. Three (0.171, dentro il bundle) sa gia'
// disegnare nel visore: qui lo si accende e basta.
//
// SEI COSE, e niente di piu':
//   1. IL PLASTICO SUL TAVOLO. Non si rimpicciolisce il modello (la scena e'
//      di tutti: simulazione, occhio, selezione ci lavorano in metri veri):
//      si fa GRANDE chi guarda. La telecamera entra in un «supporto» scalato,
//      cosi' il lato lungo dell'edificio misura LARGHEZZA_TAVOLO_M davanti a
//      te, a ALTEZZA_TAVOLO_M da terra e DISTANZA_M davanti ai piedi.
//      Anche la distanza fra gli occhi cresce con la scala: il plastico si
//      legge come un modellino, non come un edificio lontano.
//   2. IL RITMO DEL VISORE. Il bundle disegna a ogni requestAnimationFrame
//      della finestra; il visore invece da' il suo ritmo, e un disegno fuori
//      dal suo fotogramma non arriva agli occhi (il visore resta nero).
//      Finche' il visore e' acceso, le richieste di fotogramma della pagina
//      si mettono in fila e si servono DENTRO il fotogramma del visore.
//      Il bundle non si tocca.
//   3. IL TAVOLO. Nel visore il terreno scuro della scena (200 x 200 m, a
//      1:80 una lastra di 2,5 m che si legge come pavimento) si spegne, e
//      sotto il plastico c'e' un piano della sua misura (sotto, IL TAVOLO).
//   4. IL PLASTICO UNITO. Nel visore i 2.416 pezzi del modello si disegnano
//      uniti per materiale (sotto, IL PLASTICO UNITO): erano 56 ms su 67.
//   5. LE MANI. La mano (pizzico) o il controller (presa laterale) prendono il
//      plastico e lo spostano e lo girano attorno alla verticale (sotto,
//      LE MANI). Niente zoom, niente scelta delle persone, per ora.
//   6. IL RITORNO. Quando il visore si spegne (pulsante, o tasto Meta) la
//      telecamera torna esattamente com'era, e i comandi del mouse anche.
//
// ⚠️ Il vestito d'argilla, le ombre e le zone spente dell'Esperienza li mette
//    veritas_carta.js, e solo quando si disegna «sullo schermo». Nel visore
//    lo schermo e' il bersaglio del visore: lo si segna su
//    renderer.__eideticaSchermoVisore a ogni fotogramma, e la carta lo
//    riconosce (una condizione in avvolgiIlRenderer, nient'altro).
// ⚠️ NON TOCCA il passo 5: dagli occhi di una persona il pulsante non c'e'
//    (si torna al plastico con Esc, poi si entra nel visore).
// ⚠️ Le schede della conoscenza nel visore NON sono qui: sono il passo dopo.
//
//   window.eideticaVisore.entra() / .esci() / .stato()
// ============================================================================

const LARGHEZZA_TAVOLO_M = 1.4;   // il lato lungo del plastico, davanti a te
const ALTEZZA_TAVOLO_M = 0.75;    // il piano del plastico, da terra
const DISTANZA_M = 0.9;           // il centro del plastico, davanti ai piedi

const TESTI = {
  it: { entra: "Entra nel visore", esci: "Esci dal visore",
        titolo: "Il plastico in scala, nel visore (Quest Link)" },
  en: { entra: "Enter headset", esci: "Exit headset",
        titolo: "The scale model, in the headset (Quest Link)" },
};
function lingua() {
  try { return localStorage.getItem("veritasLang") === "it" ? "it" : "en"; } catch (e) { return "en"; }
}
const testi = () => TESTI[lingua()];

// Lo stesso vetro scuro del selettore Analisi / Esperienza (veritas_modo.js).
const CSS = `
#eidetica-visore{all:unset;position:fixed;top:17px;z-index:9650;cursor:pointer;display:none;
  padding:9px 14px;border-radius:10px;background:rgba(10,14,20,.72);border:1px solid rgba(255,255,255,.10);
  box-shadow:0 10px 30px rgba(0,0,0,.35);backdrop-filter:blur(14px);
  font:500 12px Inter,"Segoe UI",system-ui,sans-serif;letter-spacing:.04em;color:#8A94A6;
  transition:color .25s,background .25s}
#eidetica-visore:hover{color:#D7DEE8}
#eidetica-visore.on{color:#0b1016;background:#2EE6D6}
`;

const V = {
  supportato: false,
  sessione: null,
  supporto: null,     // il Group scalato che porta la telecamera
  salvato: null,      // la telecamera e i comandi com'erano
  scala: 1,
  coda: [],           // le richieste di fotogramma messe in fila
  prossimo: 1e9,      // i numeri della fila, lontani da quelli della finestra
  rafVero: null,
  cafVero: null,
  fotogrammi: 0,
  tavolo: null,       // il piano sotto il plastico, solo nel visore
  cattura: null,      // i materiali letti dal primo disegno nel visore
  unito: null,        // il plastico unito per materiale, solo nel visore
  ingressi: null,     // mani e controller del visore (three), uno per lato
  presa: null,        // la mano che tiene il plastico, e com'era quando l'ha preso
  prese: 0,
  punti: null,        // i punti di luce di mani e controller
  costoMani: 0,       // ms per fotogramma della presa + dei punti (media)
};

function esperienza() {
  return document.documentElement.getAttribute("data-eidetica-modo") === "esperienza";
}

// ─── 1. IL PLASTICO SUL TAVOLO ────────────────────────────────────────────
// mondo = supporto · reale. Il punto reale (0, tavolo, -distanza) deve cadere
// sul centro del modello, alla quota del suo piede. Se l'edificio e' piu'
// lungo in z, il supporto gira di 90°: il lato lungo sta sempre di traverso.
function supportoPerIlPlastico(T) {
  const radice = window.__veritasModelRoot;
  const scatola = new T.Box3().setFromObject(radice);
  const centro = scatola.getCenter(new T.Vector3());
  const misure = scatola.getSize(new T.Vector3());
  const scala = Math.max(misure.x, misure.z, 1) / LARGHEZZA_TAVOLO_M;
  const giro = misure.z > misure.x ? Math.PI / 2 : 0;
  const supporto = new T.Group();
  supporto.name = "eidetica-visore-supporto";
  supporto.scale.setScalar(scala);
  supporto.rotation.y = giro;
  const davanti = new T.Vector3(0, ALTEZZA_TAVOLO_M, -DISTANZA_M)
    .multiplyScalar(scala).applyAxisAngle(new T.Vector3(0, 1, 0), giro);
  supporto.position.set(centro.x, scatola.min.y, centro.z).sub(davanti);
  supporto.updateMatrixWorld(true);
  return { supporto, scala, misure };
}

// ─── 2. IL RITMO DEL VISORE ───────────────────────────────────────────────
// IL DISEGNO DEL VELO, DA PARTE (01/10, misurato): col velo aperto il suo giro
// (veritas_apertura.js, giro: aggiornaScena + S.ren.render, tela e renderer
// suoi) finiva in fila e si disegnava dentro ogni fotogramma del visore:
// ~23 ms invece di 5-7, per un'immagine che nel visore non si vede. Finche' il
// visore e' acceso la sua richiesta si tiene da parte; all'uscita si
// restituisce e il velo riprende. Dati, stati, tempi, report ed eventi del
// velo stanno nel suo battito (setInterval), che non passa di qui.
// Si riconosce dal codice, non dal nome: «giro» c'e' anche altrove.
const FIRMA_DEL_VELO = "aggiornaScena(S, t); S.ren.render(S.scena, S.cam)";
const eDelVelo = new WeakMap();
function giroDelVelo(cb) {
  if (typeof cb !== "function") return false;
  let si = eDelVelo.get(cb);
  if (si === undefined) { si = Function.prototype.toString.call(cb).includes(FIRMA_DEL_VELO); eDelVelo.set(cb, si); }
  return si;
}

function prendiIlRitmo() {
  V.rafVero = window.requestAnimationFrame;
  V.cafVero = window.cancelAnimationFrame;
  V.velo = [];
  window.requestAnimationFrame = function (cb) {
    const id = V.prossimo++;
    (giroDelVelo(cb) ? V.velo : V.coda).push([id, cb]);
    return id;
  };
  window.cancelAnimationFrame = function (id) {
    for (const fila of [V.coda, V.velo]) {
      const i = fila.findIndex((x) => x[0] === id);
      if (i >= 0) { fila.splice(i, 1); return; }
    }
    V.cafVero.call(window, id);
  };
}

function lasciaIlRitmo() {
  if (!V.rafVero) return;
  window.requestAnimationFrame = V.rafVero;
  window.cancelAnimationFrame = V.cafVero;
  const coda = V.coda.concat(V.velo || []);
  V.coda = []; V.velo = []; V.rafVero = null; V.cafVero = null;
  for (const [, cb] of coda) window.requestAnimationFrame(cb);
}

// ─── LA TELECAMERA DEL VISORE, CON CHI GUARDA FATTO GRANDE ────────────────
// Misurato il 30/09 (banco/vivo/prova_visore.mjs, Quest 3 simulato): col
// supporto a 1:80 il visore mostrava solo il fondo — 0 pezzi del modello su
// 2.416 nel campo. Due numeri che three calcola in metri del MONDO e il
// visore legge in metri REALI:
//   - il piano vicino: la pagina tiene la telecamera a near 1,69 (misura del
//     plastico sullo schermo); nel visore diventano 1,69 m davanti agli occhi
//     e il plastico, a 1,2 m, sparisce. Nel visore: VICINO_M / LONTANO_M reali;
//   - il campo unico dei due occhi (serve a scartare cio' che non si vede):
//     three misura la distanza fra gli occhi nel mondo (6,3 cm x 80 = 5 m) e
//     la mescola con angoli e piani in metri reali. Si rifa' lo stesso conto
//     (setProjectionFromUnion di three) in metri reali, nel riferimento
//     dell'occhio sinistro, che la scala ce l'ha gia' dentro.
// Per questo la telecamera del visore si aggiorna qui (cameraAutoUpdate
// spento), una volta per fotogramma, prima di ogni disegno.
const VICINO_M = 0.05, LONTANO_M = 200;
const TINTA_MANI = 0x2EE6D6;   // la tinta «accesa» della piattaforma

function campoDeiDueOcchi(T, cXR, scala) {
  const [L, R] = cXR.cameras;
  if (!L || !R) return;
  const pL = new T.Vector3().setFromMatrixPosition(L.matrixWorld);
  const pR = new T.Vector3().setFromMatrixPosition(R.matrixWorld);
  const ipd = pL.distanceTo(pR) / scala;                       // in metri reali
  const e = L.projectionMatrix.elements, r = R.projectionMatrix.elements;
  const near = e[14] / (e[10] - 1), far = e[14] / (e[10] + 1);
  const topFov = (e[9] + 1) / e[5], bottomFov = (e[9] - 1) / e[5];
  const leftFov = (e[8] - 1) / e[0], rightFov = (r[8] + 1) / r[0];
  const zOffset = ipd / (-leftFov + rightFov), xOffset = zOffset * -leftFov;
  cXR.matrixWorld.copy(L.matrixWorld).multiply(new T.Matrix4().makeTranslation(xOffset, 0, zOffset));
  cXR.matrixWorldInverse.copy(cXR.matrixWorld).invert();
  const near2 = near + zOffset, far2 = far + zOffset;
  cXR.projectionMatrix.makePerspective(near * leftFov - xOffset, near * rightFov + (ipd - xOffset),
    topFov * far / far2 * near2, bottomFov * far / far2 * near2, near2, far2);
  cXR.projectionMatrixInverse.copy(cXR.projectionMatrix).invert();
}

// Il fotogramma del visore: si posa la telecamera del visore, si segna il
// suo bersaglio (lo «schermo» per la carta), poi si servono le richieste in
// fila. Il bundle, dentro, richiede il fotogramma dopo: finisce nella fila nuova.
// Un errore qui dentro non deve spegnere il giro del visore: three chiede il
// fotogramma dopo SOLO se questo e' finito bene, e senza fotogrammi il Quest
// mostra la clessidra.
function fotogramma(tempo, frame) {
  if (!frame || !V.sessione) return;
  const t0 = performance.now();
  const ren = window.__veritasRenderer, cam = window.__veritasCamera;
  const terra = V.tavolo && V.tavolo.terra, terraAccesa = terra ? terra.visible : false;
  try {
    const tm = performance.now();
    seguiLaPresa(window.THREE);            // il supporto, prima della telecamera
    disegnaLeMani(window.THREE);
    if (V.punti) V.punti.visible = true;
    V.costoMani = V.costoMani * 0.95 + (performance.now() - tm) * 0.05;
    cam.near = VICINO_M; cam.far = LONTANO_M;
    ren.xr.updateCamera(cam);
    campoDeiDueOcchi(window.THREE, ren.xr.getCamera(), V.scala);
    ren.__eideticaSchermoVisore = ren.getRenderTarget();
    // nel visore il terreno della scena diventa il piano del tavolo
    if (terra) terra.visible = false;
    if (V.tavolo) V.tavolo.piano.visible = true;
    // il plastico unito al posto dei suoi 2.416 pezzi (sotto, IL PLASTICO UNITO);
    // al primo fotogramma non c'e' ancora: si leggono i materiali della carta
    if (V.unito) accendiUnito(true); else if (!V.cattura) V.cattura = catturaIMateriali();
    const coda = V.coda;
    V.coda = [];
    for (const [, cb] of coda) {
      try { cb(tempo); } catch (e) { console.warn("[EIDETICA visore]", e && e.message); }
    }
  } catch (e) {
    console.warn("[EIDETICA visore] fotogramma:", e && e.message);
  } finally {
    if (terra) terra.visible = terraAccesa;
    if (V.tavolo) V.tavolo.piano.visible = false;
    if (V.unito) accendiUnito(false);
    if (V.punti) V.punti.visible = false;
  }
  // letti i materiali, si unisce: dal fotogramma dopo si disegna unito
  if (!V.unito && V.cattura && V.cattura.pezzi) {
    try { V.unito = uniscIlPlastico(window.THREE, V.cattura.pezzi); }
    catch (e) { console.warn("[EIDETICA visore] unione:", e && e.message); V.unito = { vuoto: true, gruppi: [], pezzi: [] }; }
  }
  V.fotogrammi++;
  registra(performance.now() - t0);
}

// IL REGISTRO DELLA PROVA: ogni 5 s, quanti fotogrammi e quanto costa
// disegnarne uno. Il Quest vuole 72-90 fotogrammi al secondo; sotto, clessidra.
const R = { da: 0, n: 0, somma: 0, max: 0 };
function registra(ms) {
  const ora = performance.now();
  if (!R.da) R.da = ora;
  R.n++; R.somma += ms; R.max = Math.max(R.max, ms);
  if (ora - R.da < 5000) return;
  console.log("[EIDETICA visore] ritmo " + (R.n * 1000 / (ora - R.da)).toFixed(0) + " fotogrammi/s, disegno "
    + (R.somma / R.n).toFixed(1) + " ms (max " + R.max.toFixed(0) + "), in fila " + V.coda.length);
  R.da = ora; R.n = 0; R.somma = 0; R.max = 0;
}

// ─── IL PLASTICO UNITO ────────────────────────────────────────────────────
// Misurato il 30/09 (banco/vivo/misura_ritmo_visore.mjs, NVIDIA, regia finita,
// dentro il visore): 13,5 fotogrammi/s, 67 ms l'uno, 5.210 pezzi disegnati per
// fotogramma; col modello spento 66 fotogrammi/s, 10 ms, 192 pezzi. Il peso non
// sono i triangoli: sono i 2.416 pezzi del modello, disegnati uno per uno per
// ogni occhio e per le ombre (~56 ms su 67). Il Quest ne vuole 72 al secondo.
// Nel visore, e solo li', il plastico si disegna UNITO PER MATERIALE: lo
// stesso modello, nella stessa posizione, con gli stessi materiali che la
// carta gli mette in quel momento (argilla, sagome, vetri), in pochi pezzi.
// Gli originali non si toccano: nei fotogrammi del visore si spengono, e
// subito dopo si riaccendono. Sullo schermo non cambia niente.
// I materiali si LEGGONO dal primo disegno nel visore (onBeforeRender della
// scena arriva dopo che la carta li ha messi): nessuna regola della carta e'
// copiata qui. Restano da soli i pezzi che non si possono unire (piu'
// materiali sullo stesso pezzo, colori per vertice, pezzi animati).
function visibileNelMondo(o) {
  for (let p = o; p; p = p.parent) if (!p.visible) return false;
  return true;
}

function catturaIMateriali() {
  const scena = window.__veritasScene, radice = window.__veritasModelRoot;
  const c = { pezzi: null };
  const prima = scena.onBeforeRender;
  scena.onBeforeRender = function () {
    scena.onBeforeRender = prima;
    const pezzi = [];
    radice.traverse((o) => {
      if (!o.isMesh || !o.geometry || !visibileNelMondo(o)) return;
      pezzi.push({ o, materiale: o.material, getta: o.castShadow, riceve: o.receiveShadow });
    });
    c.pezzi = pezzi;
    return prima && prima.apply(this, arguments);
  };
  return c;
}

function unibile(p) {
  const o = p.o, m = p.materiale, g = o.geometry;
  return !Array.isArray(m) && !!m && !o.isSkinnedMesh && !o.isInstancedMesh && !o.morphTargetInfluences
    && !m.vertexColors && !!g.attributes.position && !(g.morphAttributes && g.morphAttributes.position);
}

function uniscIlPlastico(T, pezzi) {
  const t0 = performance.now();
  const gruppi = new Map(), soli = [];
  for (const p of pezzi) {
    if (!unibile(p)) { soli.push(p); continue; }
    const k = p.materiale.uuid + (p.getta ? "|g" : "|n") + (p.riceve ? "r" : "");
    if (!gruppi.has(k)) gruppi.set(k, { materiale: p.materiale, getta: p.getta, riceve: p.riceve, pezzi: [] });
    gruppi.get(k).pezzi.push(p.o);
  }
  const scena = window.__veritasScene, fatti = [], uniti = [];
  const v = new T.Vector3(), n = new T.Vector3(), nm = new T.Matrix3();
  for (const gr of gruppi.values()) {
    const conUv = !!(gr.materiale.map || gr.materiale.alphaMap);
    let nv = 0, ni = 0;
    for (const o of gr.pezzi) {
      const g = o.geometry, c = g.attributes.position.count;
      nv += c; ni += g.index ? g.index.count : c;
    }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3);
    const uv = conUv ? new Float32Array(nv * 2) : null, idx = new Uint32Array(ni);
    let bv = 0, bi = 0;
    for (const o of gr.pezzi) {
      o.updateWorldMatrix(true, false);
      const g = o.geometry, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
      const M = o.matrixWorld, specchio = M.determinant() < 0;
      nm.getNormalMatrix(M);
      for (let i = 0; i < P.count; i++) {
        v.fromBufferAttribute(P, i).applyMatrix4(M);
        pos[(bv + i) * 3] = v.x; pos[(bv + i) * 3 + 1] = v.y; pos[(bv + i) * 3 + 2] = v.z;
        if (N) {
          n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
          nor[(bv + i) * 3] = n.x; nor[(bv + i) * 3 + 1] = n.y; nor[(bv + i) * 3 + 2] = n.z;
        }
        if (uv && U) { uv[(bv + i) * 2] = U.getX(i); uv[(bv + i) * 2 + 1] = U.getY(i); }
      }
      const I = g.index, k = I ? I.count : P.count;
      for (let j = 0; j + 2 < k; j += 3) {
        const a = I ? I.getX(j) : j, b = I ? I.getX(j + 1) : j + 1, c = I ? I.getX(j + 2) : j + 2;
        // un pezzo specchiato gira i triangoli: si rigirano, o la faccia si perde
        idx[bi++] = bv + a; idx[bi++] = bv + (specchio ? c : b); idx[bi++] = bv + (specchio ? b : c);
      }
      bv += P.count;
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    geo.setAttribute("normal", new T.BufferAttribute(nor, 3));
    if (uv) geo.setAttribute("uv", new T.BufferAttribute(uv, 2));
    geo.setIndex(new T.BufferAttribute(bi === idx.length ? idx : idx.slice(0, bi), 1));
    geo.computeBoundingSphere();
    const mesh = new T.Mesh(geo, gr.materiale);   // lo stesso materiale, non una copia
    mesh.name = "eidetica-visore-plastico";
    mesh.castShadow = gr.getta; mesh.receiveShadow = gr.riceve;
    mesh.matrixAutoUpdate = false;                // e' gia' nel mondo
    mesh.visible = false;                         // lo accende solo fotogramma()
    scena.add(mesh);
    fatti.push(mesh);
    for (const o of gr.pezzi) uniti.push(o);
  }
  console.log("[EIDETICA visore] plastico unito: " + uniti.length + " pezzi -> " + fatti.length
    + " (+" + soli.length + " rimasti da soli), " + (performance.now() - t0).toFixed(0) + " ms");
  return { gruppi: fatti, pezzi: uniti, accesi: uniti.map(() => true) };
}

function accendiUnito(acceso) {
  const U = V.unito;
  if (!U || U.vuoto) return;
  for (const m of U.gruppi) m.visible = acceso;
  // gli originali: spenti per il disegno del visore, poi com'erano
  if (acceso) U.pezzi.forEach((o, i) => { U.accesi[i] = o.visible; o.visible = false; });
  else U.pezzi.forEach((o, i) => { o.visible = U.accesi[i]; });
}

function togliUnito() {
  const U = V.unito;
  V.unito = null; V.cattura = null;
  if (!U || U.vuoto) return;
  for (const m of U.gruppi) { if (m.parent) m.parent.remove(m); m.geometry.dispose(); }
}

// ─── LE MANI: PRENDERE IL PLASTICO ────────────────────────────────────────
// Raffaella, 30/09, dal Quest: «non vedo i controller, non funzionano le
// mani; dovrei con le mani poter muovere il modello». Primo incremento
// (corrispondenza nel HANDOFF §9, Fase C): la mano PRENDE il plastico e lo
// sposta e lo gira. Niente zoom, niente scelta delle persone, niente schede.
//   - MANO: il pizzico prende (per il visore e' la «select» della mano);
//   - CONTROLLER: la presa laterale (grip, «squeeze») prende; il grilletto
//     resta libero — sara' la scelta di una persona.
// Nella scena non si muove niente: si muove il supporto di chi guarda, al
// contrario. Il plastico segue la mano come se fosse in mano: la stessa
// traslazione, e la stessa rotazione ATTORNO ALLA VERTICALE, con perno nel
// punto della presa. Il tavolo non si inclina. Si ricalcola a ogni fotogramma
// dal momento della presa (supporto0 · D⁻¹), non si accumula: a mano ferma il
// plastico e' fermo. Una mano alla volta: la seconda, per ora, non fa niente.
// Mani e controller si vedono come punti di luce (un solo disegno per tutti),
// solo nei fotogrammi del visore.
const PUNTI_MANI = 64, RAGGIO_PUNTO_M = 0.007, PASSO_RAGGIO_M = 0.025;

function preparaGliIngressi(ren) {
  if (!V.ingressi) V.ingressi = [0, 1].map((i) => {
    const raggio = ren.xr.getController(i), mano = ren.xr.getHand(i);
    const ing = { i, raggio, mano, fonte: null };
    raggio.addEventListener("connected", (e) => {
      ing.fonte = e.data;
      console.log("[EIDETICA visore] ingresso " + i + ": " + (e.data && e.data.hand ? "mano" : "controller")
        + " " + ((e.data && e.data.handedness) || "?"));
    });
    raggio.addEventListener("disconnected", () => { if (V.presa && V.presa.i === i) V.presa = null; ing.fonte = null; });
    const eMano = (e) => !!(e.data && e.data.hand);
    raggio.addEventListener("selectstart", (e) => { if (eMano(e)) prendi(ing); });
    raggio.addEventListener("selectend", (e) => { if (eMano(e)) lascia(ing); });
    raggio.addEventListener("squeezestart", (e) => { if (!eMano(e)) prendi(ing); });
    raggio.addEventListener("squeezeend", (e) => { if (!eMano(e)) lascia(ing); });
    return ing;
  });
  return V.ingressi;
}

function giroAttornoAllaVerticale(T, q) {
  return new T.Euler().setFromQuaternion(q, "YXZ").y;
}

function prendi(ing) {
  if (V.presa || !V.supporto) return;          // una mano alla volta
  const T = window.THREE;
  V.presa = { i: ing.i, supporto0: V.supporto.matrix.clone(),
              punto0: ing.raggio.position.clone(), giro0: giroAttornoAllaVerticale(T, ing.raggio.quaternion) };
  V.prese++;
}

function lascia(ing) {
  if (V.presa && V.presa.i === ing.i) V.presa = null;
}

// supporto = supporto0 · D⁻¹, con D = T(punto) · Ry(giro - giro0) · T(-punto0),
// tutto in metri reali (la posa della mano e' nel riferimento del visore).
function seguiLaPresa(T) {
  const P = V.presa;
  if (!P || !V.supporto) return;
  const r = V.ingressi[P.i].raggio;
  const D = new T.Matrix4().makeTranslation(r.position.x, r.position.y, r.position.z)
    .multiply(new T.Matrix4().makeRotationY(giroAttornoAllaVerticale(T, r.quaternion) - P.giro0))
    .multiply(new T.Matrix4().makeTranslation(-P.punto0.x, -P.punto0.y, -P.punto0.z));
  const S = V.supporto;
  S.matrix.copy(P.supporto0).multiply(D.invert());
  S.matrix.decompose(S.position, S.quaternion, S.scale);
  S.updateMatrixWorld(true);
}

function preparaIPunti(T) {
  const m = new T.InstancedMesh(new T.SphereGeometry(1, 10, 8),
    new T.MeshBasicMaterial({ color: TINTA_MANI, transparent: true, opacity: 0.9 }), PUNTI_MANI);
  m.name = "eidetica-visore-mani";
  m.frustumCulled = false;
  m.castShadow = false; m.receiveShadow = false;
  m.count = 0;
  m.visible = false;                           // lo accende solo fotogramma()
  window.__veritasScene.add(m);
  return m;
}

// I punti si posano dove sono le articolazioni (mani) o lungo il raggio
// (controller): matrice del mondo dell'articolazione, raggio in metri reali
// (la scala del supporto c'e' gia' nella matrice).
function disegnaLeMani(T) {
  const m = V.punti;
  if (!m || !V.ingressi) return;
  const M = new T.Matrix4(), s = new T.Matrix4(), dx = new T.Matrix4();
  let n = 0;
  for (const ing of V.ingressi) {
    if (!ing.fonte) continue;
    if (ing.fonte.hand && ing.mano.joints) {
      for (const k in ing.mano.joints) {
        const j = ing.mano.joints[k];
        if (!j.visible || n >= PUNTI_MANI) continue;
        const r = j.jointRadius || RAGGIO_PUNTO_M;
        m.setMatrixAt(n++, M.copy(j.matrixWorld).multiply(s.makeScale(r, r, r)));
      }
    } else if (ing.raggio.visible) {
      const presa = V.presa && V.presa.i === ing.i;
      for (let k = 0; k < 5 && n < PUNTI_MANI; k++) {
        const r = RAGGIO_PUNTO_M * (k === 0 ? (presa ? 1.8 : 1.3) : 0.6);
        m.setMatrixAt(n++, M.copy(ing.raggio.matrixWorld)
          .multiply(dx.makeTranslation(0, 0, -k * PASSO_RAGGIO_M)).multiply(s.makeScale(r, r, r)));
      }
    }
  }
  m.count = n;
  m.instanceMatrix.needsUpdate = true;
}

function togliLeMani() {
  V.presa = null;
  if (V.ingressi && V.supporto) for (const ing of V.ingressi) { V.supporto.remove(ing.raggio); V.supporto.remove(ing.mano); }
  const m = V.punti;
  V.punti = null;
  if (m) { if (m.parent) m.parent.remove(m); m.geometry.dispose(); m.material.dispose(); }
}

// ─── IL TAVOLO ────────────────────────────────────────────────────────────
// Misurato col Quest vero il 30/09: «vedo il plastico davanti a me, a terra».
// Il terreno della scena (quello che la carta tinge, ~200 x 200 m) a 1:80 e'
// una lastra scura di 2,5 m senza bordi, alla quota del tavolo, sul fondo
// buio: l'occhio la legge come pavimento. Nel visore, e solo li', si spegne,
// e sotto il plastico c'e' un piano grande quanto l'edificio piu' un bordo,
// spesso TAVOLO_SPESSORE_M: un tavolo, con uno spigolo che si vede.
const TAVOLO_BORDO = 0.06, TAVOLO_SPESSORE_M = 0.04;
function terraDellaScena(T, scena, radice) {
  let vinta = null, area = 2000;
  const b = new T.Box3();
  scena.traverse((o) => {
    if (!o.isMesh || !o.geometry || o.name === "eidetica-visore-tavolo") return;
    let dentro = false; for (let p = o; p; p = p.parent) if (p === radice) { dentro = true; break; }
    if (dentro) return;
    b.setFromObject(o);
    if (b.max.y - b.min.y > 1.0) return;
    const a = (b.max.x - b.min.x) * (b.max.z - b.min.z);
    if (a > area) { area = a; vinta = o; }
  });
  return vinta;
}

function preparaIlTavolo(T, scala) {
  const scena = window.__veritasScene, radice = window.__veritasModelRoot;
  const scatola = new T.Box3().setFromObject(radice);
  const c = scatola.getCenter(new T.Vector3()), m = scatola.getSize(new T.Vector3());
  const terra = terraDellaScena(T, scena, radice);
  const colore = terra && terra.material && terra.material.color ? terra.material.color.clone() : new T.Color(0x1a1f27);
  const spessore = TAVOLO_SPESSORE_M * scala;
  const piano = new T.Mesh(new T.BoxGeometry(m.x * (1 + TAVOLO_BORDO), spessore, m.z * (1 + TAVOLO_BORDO)),
    new T.MeshStandardMaterial({ color: colore, roughness: 0.9, metalness: 0 }));
  piano.name = "eidetica-visore-tavolo";
  piano.position.set(c.x, scatola.min.y - spessore / 2 - 0.02, c.z);
  piano.receiveShadow = true;
  piano.visible = false;                  // lo accende solo fotogramma()
  scena.add(piano);
  return { piano, terra };
}

function togliIlTavolo() {
  if (!V.tavolo) return;
  const p = V.tavolo.piano;
  if (p.parent) p.parent.remove(p);
  p.geometry.dispose(); p.material.dispose();
  V.tavolo = null;
}

// ─── GLI SCATTI DELL'OCCHIO ───────────────────────────────────────────────
// Misurato il 01/10 (4 regie, iwer): finche' il visore e' acceso, three in
// OGNI render() mette la telecamera del visore al posto di quella chiesta —
// anche nelle foto fuori schermo che la regia scatta per l'occhio. L'occhio
// riceveva 74 fogli vuoti su 74: 0/74 tipi nominati invece di 74/74.
// Un disegno su un bersaglio che NON e' quello del visore e' una foto: per
// la sua durata il visore si spegne per three, e la foto si fa con la
// telecamera della regia. Il disegno del visore non cambia.
function prendiGliScatti(ren) {
  if (V.scatti) return;
  const vero = ren.render;
  const nostro = function (scena, camera) {
    const rt = ren.getRenderTarget();
    if (!V.scatti || !ren.xr.enabled || !rt || rt.isXRRenderTarget === true) return vero.apply(this, arguments);
    ren.xr.enabled = false;
    try { return vero.apply(this, arguments); } finally { ren.xr.enabled = true; }
  };
  ren.render = nostro;
  V.scatti = { vero, nostro };
}

function lasciaGliScatti(ren) {
  const S = V.scatti;
  if (!S) return;
  V.scatti = null;                        // se qualcuno l'ha avvolto dopo, il nostro passa e basta
  if (ren.render === S.nostro) ren.render = S.vero;
}

// ─── ENTRARE / USCIRE ─────────────────────────────────────────────────────
async function entra() {
  const T = window.THREE, ren = window.__veritasRenderer, cam = window.__veritasCamera,
        ctrl = window.__veritasControls;
  if (V.sessione || !T || !ren || !cam || !window.__veritasModelRoot || !navigator.xr) return false;
  if (window.eideticaSelezione && window.eideticaSelezione.negliOcchi()) return false;
  // la sessione si chiede per prima: vuole il clic ancora «caldo»
  const sessione = await navigator.xr.requestSession("immersive-vr",
    { optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"] });

  // Prima il visore, poi la scena. Misurato col Quest vero il 30/09: il primo
  // tentativo puo' essere rifiutato (setSession: «object not usable») e il
  // secondo riesce. Finche' il visore non ha accettato, la telecamera, i
  // comandi e il ritmo della pagina non si toccano: un rifiuto non lascia segni.
  ren.xr.enabled = true;
  ren.xr.cameraAutoUpdate = false;         // la posa fotogramma() (sopra)
  ren.xr.setReferenceSpaceType("local-floor");
  preparaGliIngressi(ren);                 // prima della sessione: cosi' arriva «connected»
  ren.setAnimationLoop(fotogramma);        // prima della sessione: three ferma il suo giro a vuoto
  try {
    await ren.xr.setSession(sessione);
  } catch (e) {
    console.warn("[EIDETICA visore] sessione rifiutata:", (e && e.name) + " " + (e && e.message)
      + " | contesto perso: " + ren.getContext().isContextLost());
    try { await sessione.end(); } catch (_) {}
    rimettiIlRenderer(ren);
    aggiornaPulsante();
    return false;
  }
  prendiGliScatti(ren);                    // le foto dell'occhio con la telecamera della regia

  V.salvato = { parent: cam.parent, pos: cam.position.clone(), quat: cam.quaternion.clone(),
                scale: cam.scale.clone(), fov: cam.fov, zoom: cam.zoom, near: cam.near, far: cam.far,
                aspect: cam.aspect, comandi: ctrl ? ctrl.enabled : null };
  const { supporto, scala, misure } = supportoPerIlPlastico(T);
  V.supporto = supporto; V.scala = scala; V.fotogrammi = 0;
  supporto.add(cam);                       // la telecamera sul supporto, non nella scena
  if (ctrl) ctrl.enabled = false;          // nel visore guida la testa, non il mouse
  V.tavolo = preparaIlTavolo(T, scala);
  // mani e controller stanno nel riferimento del visore: sul supporto, come la testa
  for (const ing of V.ingressi) { supporto.add(ing.raggio); supporto.add(ing.mano); }
  V.punti = preparaIPunti(T);
  prendiIlRitmo();
  V.sessione = sessione;                   // da qui fotogramma() lavora
  sessione.addEventListener("end", esci);  // dopo quello di three: prima pulisce lui
  // il Quest mette in pausa la sessione (menu, visore tolto, Link che cade):
  // si scrive, cosi' una clessidra si distingue da un disegno troppo lento
  sessione.addEventListener("visibilitychange", () =>
    console.log("[EIDETICA visore] il Quest dice: " + sessione.visibilityState));
  R.da = 0; R.n = 0; R.somma = 0; R.max = 0;
  try {
    const gl = ren.getContext(), d = gl.getExtension("WEBGL_debug_renderer_info");
    console.log("[EIDETICA visore] scheda grafica: " + (d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : "?"));
  } catch (e) { /* solo informazione */ }
  console.log("[EIDETICA visore] dentro: plastico 1:" + Math.round(scala) + ", "
    + misure.x.toFixed(0) + " x " + misure.z.toFixed(0) + " m -> "
    + (misure.x / scala).toFixed(2) + " x " + (misure.z / scala).toFixed(2) + " m");
  aggiornaPulsante();
  return true;
}

// Il renderer come prima del visore. Il giro di three si ferma dentro un
// try: se la sessione non e' mai partita, three non ha il contesto del
// visore e stop() cade su null — e un errore qui non deve impedire di
// rimettere a posto la telecamera (visto dal vivo il 30/09).
function rimettiIlRenderer(ren) {
  lasciaGliScatti(ren);
  try { ren.setAnimationLoop(null); } catch (e) { /* sessione mai partita */ }
  ren.xr.enabled = false;
  ren.xr.cameraAutoUpdate = true;
  ren.__eideticaSchermoVisore = undefined;
}

function esci() {
  const s = V.sessione;
  if (!s && !V.salvato) return;
  V.sessione = null;
  lasciaIlRitmo();
  const ren = window.__veritasRenderer, cam = window.__veritasCamera, ctrl = window.__veritasControls;
  if (ren) rimettiIlRenderer(ren);
  const P = V.salvato;
  if (cam && P) {
    if (V.supporto) V.supporto.remove(cam);
    if (P.parent) P.parent.add(cam);
    cam.position.copy(P.pos); cam.quaternion.copy(P.quat); cam.scale.copy(P.scale);
    cam.fov = P.fov; cam.zoom = P.zoom; cam.near = P.near; cam.far = P.far; cam.aspect = P.aspect;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
  }
  if (ctrl && P && P.comandi != null) ctrl.enabled = P.comandi;
  togliIlTavolo();
  togliUnito();
  togliLeMani();
  V.salvato = null; V.supporto = null;
  // se si esce dal pulsante della pagina, la sessione e' ancora aperta
  if (s && ren && ren.xr.getSession && ren.xr.getSession() === s) s.end().catch(() => {});
  console.log("[EIDETICA visore] fuori, " + V.fotogrammi + " fotogrammi nel visore");
  aggiornaPulsante();
}

// ─── IL PULSANTE ──────────────────────────────────────────────────────────
// C'e' solo se il visore c'e' (Chrome lo sa: Quest Link acceso), in
// Esperienza, con il modello in scena, e fuori dagli occhi di una persona.
// Sta accanto al selettore Analisi / Esperienza.
function aggiornaPulsante() {
  const b = document.getElementById("eidetica-visore");
  if (!b) return;
  const dentro = !!V.sessione;
  const occhi = window.eideticaSelezione && window.eideticaSelezione.negliOcchi();
  const pronto = V.supportato && esperienza() && window.__veritasRenderer && window.__veritasModelRoot && !occhi;
  b.style.display = dentro || pronto ? "block" : "none";
  b.classList.toggle("on", dentro);
  b.textContent = dentro ? testi().esci : testi().entra;
  b.title = testi().titolo;
  const modo = document.getElementById("eidetica-modo");
  const r = modo && modo.getBoundingClientRect();
  if (r && r.width) { b.style.left = Math.round(r.right + 10) + "px"; b.style.right = "auto"; }
  else { b.style.left = "auto"; b.style.right = "24px"; }
  pulsanteNelVelo(dentro, occhi);
}

// IL PUNTO D'INGRESSO NEL VELO (Raffaella, 01/10, scelta A): «Entra nel
// visore» accanto a «Entra», mentre l'analisi e' viva. Il velo sta sopra la
// pagina (99990) e copre il pulsante qui sopra (9650). Lo mette questo modulo,
// con la stessa veste dei bottoni del velo: veritas_apertura.js non si tocca,
// e quando il velo si chiude il bottone se ne va con lui.
// ⚠️ Il velo vive in un'ombra (shadow DOM): da document non si vede.
function pulsanteNelVelo(dentro, occhi) {
  const ospite = document.querySelector("[data-veritas-apertura]");
  const ombra = ospite && ospite.shadowRoot;
  const entraDelVelo = ombra && ombra.querySelector('.vap-primario[data-azione="entra"]');
  if (!entraDelVelo) return;
  let b = ombra.getElementById("eidetica-visore-velo");
  const pronto = V.supportato && window.__veritasRenderer && window.__veritasModelRoot && !occhi;
  if (!dentro && !pronto) { if (b) b.remove(); return; }
  if (!b) {
    b = document.createElement("button");
    b.id = "eidetica-visore-velo";
    b.type = "button";
    b.className = "vap-secondario";
    b.style.pointerEvents = "auto";
    b.addEventListener("click", premuto);
    entraDelVelo.insertAdjacentElement("afterend", b);
  }
  b.textContent = dentro ? testi().esci : testi().entra;
  b.title = testi().titolo;
}

function premuto() {
  // si chiude la sessione: three pulisce, poi il suo «end» chiama esci()
  if (V.sessione) V.sessione.end().catch(() => esci());
  else entra().catch((e) => console.warn("[EIDETICA visore]", e && e.message));
}

async function chiediAlBrowser() {
  try { V.supportato = !!(navigator.xr && await navigator.xr.isSessionSupported("immersive-vr")); }
  catch (e) { V.supportato = false; }
  aggiornaPulsante();
}

function avvio() {
  if (!document.getElementById("eidetica-visore-stile")) {
    const s = document.createElement("style");
    s.id = "eidetica-visore-stile";
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  const b = document.createElement("button");
  b.id = "eidetica-visore";
  b.type = "button";
  b.addEventListener("click", premuto);
  document.body.appendChild(b);
  chiediAlBrowser();
  // il visore si accende e si spegne (Link): Chrome lo dice
  if (navigator.xr) navigator.xr.addEventListener("devicechange", chiediAlBrowser);
  setInterval(aggiornaPulsante, 1000);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.eideticaVisore = {
    entra, esci,
    stato: () => ({ supportato: V.supportato, dentro: !!V.sessione, scala: V.scala,
                    fotogrammi: V.fotogrammi, inFila: V.coda.length,
                    ingressi: (V.ingressi || []).filter((x) => x.fonte)
                      .map((x) => (x.fonte.hand ? "mano " : "controller ") + (x.fonte.handedness || "?")),
                    presa: V.presa ? V.presa.i : null, prese: V.prese,
                    costoMani_ms: +V.costoMani.toFixed(3),
                    supporto: V.supporto ? V.supporto.matrixWorld.toArray() : null }),
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avvio);
  else avvio();
}

export default { entra, esci };
