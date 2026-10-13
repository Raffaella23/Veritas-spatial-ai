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
//   7. LE FINESTRE DAL VIVO (13/10). Il racconto del velo, lo zoom dell'occhio
//      e «quello che vedo», come sul PC, in finestre chiare che si aprono man
//      mano e si prendono con le mani (sotto, LE FINESTRE DAL VIVO).
//
//   window.eideticaVisore.entra() / .esci() / .stato()
// ============================================================================

const LARGHEZZA_TAVOLO_M = 1.4;   // il lato lungo del plastico, davanti a te
const ALTEZZA_TAVOLO_M = 0.75;    // il piano del plastico, da terra
const DISTANZA_M = 0.9;           // il centro del plastico, davanti ai piedi

const TESTI = {
  it: { entra: "Entra nel visore", esci: "Esci dal visore",
        titolo: "Il plastico in scala, nel visore (Quest Link)",
        prepara: "Visore in preparazione", pronto: "Ora puoi entrare nel visore",
        zoom: "zoom", avvia: "premi ▶ Avvia simulazione", persone: "le persone partono",
        comincia: "l'occhio sta per cominciare" },
  en: { entra: "Enter headset", esci: "Exit headset",
        titolo: "The scale model, in the headset (Quest Link)",
        prepara: "Headset getting ready", pronto: "You can now enter the headset",
        zoom: "close-ups", avvia: "press ▶ Start simulation", persone: "people are setting off",
        comincia: "the eye is about to start" },
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
#eidetica-visore.attesa{cursor:default;opacity:.6}
#eidetica-visore.pronto{color:#0b1016;background:#2EE6D6;animation:eidetica-lampeggia 1.1s ease-in-out infinite}
@keyframes eidetica-lampeggia{0%,100%{box-shadow:0 0 0 0 rgba(46,230,214,.75)}50%{box-shadow:0 0 26px 8px rgba(46,230,214,.9);filter:brightness(1.25)}}
`;
// Lo stesso lampeggio dentro l'ombra del velo (il CSS della pagina non ci arriva).
const CSS_VELO = `
#eidetica-visore-velo.attesa{cursor:default;opacity:.55}
#eidetica-visore-velo.pronto{color:#0b1016;background:#2EE6D6;border-color:#2EE6D6;font-weight:600;animation:eidetica-lampeggia 1.1s ease-in-out infinite}
@keyframes eidetica-lampeggia{0%,100%{box-shadow:0 0 0 0 rgba(46,230,214,.75)}50%{box-shadow:0 0 30px 10px rgba(46,230,214,.9);filter:brightness(1.25)}}
`;

// ─── QUANDO SI PUO' ENTRARE (13/10 sera) ──────────────────────────────────
// Raffaella, col Quest addosso: «entri e devi aspettare una vita col visore:
// non esiste. Fai partire il teatrino normale; quando il modello e' quasi
// pronto una luce lampeggia e dice: ora puoi entrare dal visore. Nel
// frattempo lo fai vedere sugli altri device.» Il velo gira sulla pagina
// (anche nella finestra piatta del Quest Browser); il pulsante del visore
// resta spento, con a che punto siamo, finche' l'occhio non ha finito gli
// zoom E le persone camminano. Poi lampeggia.
function prontoPerIlVisore() {
  const t = testi();
  if (document.getElementById("veritas-avvia") && !window.__veritasSimStarted) return { pronto: false, perche: t.avvia };
  let st = null;
  try { st = window.__veritasApertura && window.__veritasApertura.stato(); } catch (e) { st = null; }
  const veloAperto = !!(st && st.aperta);
  // 13/10 notte - Raffaella: «non vedo il processo di lettura dell'occhio, che e'
  // la cosa che voglio vedere». Si entra quando l'occhio COMINCIA a leggere (la
  // regia parte, a modello in scala): l'attesa diventa lo spettacolo.
  const analisi = !veloAperto || OCCHIO.regiaIniziata || OCCHIO.regiaFinita || (st && st.occhioHaParlato)
    || (st && (st.stato === "conformita" || st.stato === "orientamento"));
  if (!analisi) return { pronto: false, perche: t.comincia };
  if (!window.__veritasSimStarted && !veloAperto) return { pronto: true, perche: "" };   // pagina senza simulazione: come prima
  if (!window.__veritasSimStarted) return { pronto: false, perche: t.persone };
  return { pronto: true, perche: "" };
}

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
  supportatoAR: false, // il browser sa fare il passthrough (Quest Browser: si'; Chrome via Link: no)
  ar: false,          // la sessione in corso e' «immersive-ar»
  passthrough: true,  // la stanza vera dietro il plastico (solo se ar)
  tastoPrima: false,  // il tasto A/X al fotogramma prima (per accorgersi della pressione)
  finestre: null,     // le finestre dal vivo, solo nel visore
  presaFinestra: null, // la mano che tiene una finestra
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
// ─── IL PASSTHROUGH (09/10) ───────────────────────────────────────────────
// Raffaella, 09/10: «troppo scuro, troppo buio: prima di tutto il
// passthrough». Il Quest mostra la stanza vera solo in una sessione
// «immersive-ar» (Quest Browser; Chrome via Link non la offre, misurato il
// 03/10): li' il plastico sta nella stanza, sul tavolo vero. Il tasto A (o X)
// del controller lo accende e lo spegne: spento = la scena scura di prima.
function tastoDelPassthrough(frame) {
  if (!V.ar) return;
  let giu = false;
  for (const s of frame.session.inputSources || []) {
    const g = s.gamepad;
    if (g && g.buttons && g.buttons[4] && g.buttons[4].pressed) giu = true;
  }
  if (giu && !V.tastoPrima) passthrough(!V.passthrough);
  V.tastoPrima = giu;
}

// ─── DAVANTI A CHI GUARDA (13/10 sera) ────────────────────────────────────
// Raffaella, Quest Browser, seduta nella sua zona: «il modello mi e' uscito a
// terra, a destra, non di fronte al visore». Il pavimento del Quest ha
// l'origine dove dice lui (il centro della zona, non la testa), e il tavolo a
// 0,75 m da terra non tiene conto di chi e' seduto. Al primo fotogramma con la
// testa si misura dove sei e dove guardi: il plastico va 0,9 m davanti a te,
// il piano 0,55 m sotto gli occhi (fra 0,55 e 1,0 m da terra); le finestre
// girano con lui. Il tasto B (o Y) e il «ricentra» del Quest lo rifanno.
function centraSuChiGuarda(T, frame) {
  const ren = window.__veritasRenderer, spazio = ren.xr.getReferenceSpace();
  const pose = spazio && frame.getViewerPose(spazio);
  if (!pose || !V.supportoBase) return false;
  const p = pose.transform.position, o = pose.transform.orientation;
  const avanti = new T.Vector3(0, 0, -1).applyQuaternion(new T.Quaternion(o.x, o.y, o.z, o.w));
  const giro = Math.hypot(avanti.x, avanti.z) > 0.2 ? Math.atan2(-avanti.x, -avanti.z) : 0;
  const tavolo = Math.min(1.0, Math.max(0.55, p.y - 0.55));
  const O = new T.Matrix4().makeRotationY(giro).setPosition(p.x, tavolo - ALTEZZA_TAVOLO_M, p.z);
  const S = V.supporto;
  S.matrix.copy(V.supportoBase).multiply(O.clone().invert());
  S.matrix.decompose(S.position, S.quaternion, S.scale);
  S.updateMatrixWorld(true);
  V.presa = null;
  V.centro = { O, giro };
  if (V.finestre) for (const W of Object.values(V.finestre.lista)) metticiDavanti(T, W);
  console.log("[EIDETICA visore] plastico davanti a chi guarda: occhi a " + p.y.toFixed(2) + " m, tavolo a "
    + tavolo.toFixed(2) + " m, girato di " + Math.round(giro * 180 / Math.PI) + "°");
  return true;
}

function metticiDavanti(T, W) {
  if (!V.centro) return;
  W.pos.copy(W.pos0).applyMatrix4(V.centro.O);
  W.quat.copy(W.quat0).premultiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), V.centro.giro));
}

// 13/10 notte - Raffaella: «il plastico c'e', ma spostato di lato» (spia: 29° a
// destra). Al primo fotogramma si guarda ancora il pulsante della pagina; poi
// ci si gira. Nei primi SEGUI_S secondi, finche' nessuno lo prende: se la testa
// e' ferma (meno di 5° in 0,7 s) e guarda oltre 15° di lato, il plastico torna
// davanti. Dopo resta fermo; lo riporta il «ricentra» del Quest (anche a mani).
const SEGUI_S = 10;
function seguiConCalma() {
  if (!V.centro || !V.testa || V.presa || V.presaFinestra) return;
  const ora = performance.now();
  if (ora - V.dentroDa > SEGUI_S * 1000) return;
  if (V.prossimoControllo && ora < V.prossimoControllo) return;
  V.prossimoControllo = ora + 700;
  const T = window.THREE, f = new T.Vector3(0, 0, -1).applyQuaternion(V.testa.quat);
  if (Math.hypot(f.x, f.z) < 0.2) return;
  const giro = Math.atan2(-f.x, -f.z), ang = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const fermo = V.giroPrima != null && Math.abs(ang(giro - V.giroPrima)) < 5 * Math.PI / 180;
  V.giroPrima = giro;
  if (fermo && Math.abs(ang(giro - V.centro.giro)) > 15 * Math.PI / 180) V.daCentrare = true;
}

// la spia degli ingressi (13/10 notte): quanti ne vede il Quest e quanti ne collega three
function contaGliIngressi(frame) {
  const D = V.diag || (V.diag = {});
  const src = frame.session.inputSources || [];
  let mani = 0; for (const s of src) if (s.hand) mani++;
  D.quest = src.length; D.maniQuest = mani; D.maxQuest = Math.max(D.maxQuest || 0, src.length);
  const coll = (V.ingressi || []).filter((x) => x.fonte).length;
  D.maxCollegati = Math.max(D.maxCollegati || 0, coll);
  if (!D.concessi) try { D.concessi = frame.session.enabledFeatures ? [...frame.session.enabledFeatures].join(",") : "?"; } catch (e) { D.concessi = "?"; }
}

function tastoDelCentro(frame) {
  let giu = false;
  for (const s of frame.session.inputSources || []) {
    const g = s.gamepad;
    if (g && g.buttons && g.buttons[5] && g.buttons[5].pressed) giu = true;
  }
  if (giu && !V.tastoCentroPrima) V.daCentrare = true;
  V.tastoCentroPrima = giu;
}

function passthrough(si) {
  V.passthrough = !!si;
  console.log("[EIDETICA visore] passthrough " + (V.passthrough ? "acceso" : "spento"));
  return V.passthrough;
}

function fotogramma(tempo, frame) {
  if (!frame || !V.sessione) return;
  const t0 = performance.now();
  const ren = window.__veritasRenderer, cam = window.__veritasCamera;
  const terra = V.tavolo && V.tavolo.terra, terraAccesa = terra ? terra.visible : false;
  const scena = window.__veritasScene, fondo = scena ? scena.background : null;
  const stanza = V.ar && V.passthrough;
  try {
    const tm = performance.now();
    tastoDelPassthrough(frame);
    contaGliIngressi(frame);
    tastoDelCentro(frame);
    seguiConCalma();
    if (V.daCentrare && centraSuChiGuarda(window.THREE, frame)) V.daCentrare = false;
    pizzichiDelleMani(window.THREE);       // la mano nuda: il pizzico dalle dita
    seguiLaPresa(window.THREE);            // il supporto, prima della telecamera
    seguiLaFinestra(window.THREE);
    disegnaLeMani(window.THREE);
    if (V.finestre) { posaLeFinestre(window.THREE); V.finestre.gruppo.visible = true; }
    if (V.punti) V.punti.visible = true;
    V.costoMani = V.costoMani * 0.95 + (performance.now() - tm) * 0.05;
    cam.near = VICINO_M; cam.far = LONTANO_M;
    ren.xr.updateCamera(cam);
    campoDeiDueOcchi(window.THREE, ren.xr.getCamera(), V.scala);
    // la testa com'e' ADESSO: dopo, nel giro del bundle, la telecamera della pagina
    // puo' essere spostata (misurato: la spia leggeva 6,6 m invece di ~1)
    V.testa = { pos: cam.position.clone(), quat: cam.quaternion.clone() };
    posaLaSpia(window.THREE, cam);
    ren.__eideticaSchermoVisore = ren.getRenderTarget();
    // nel visore il terreno della scena diventa il piano del tavolo
    if (terra) terra.visible = false;
    // col passthrough il tavolo e' quello vero della stanza: il piano finto no,
    // e niente fondo dipinto (three, senza fondo, pulisce trasparente in AR)
    if (V.tavolo) V.tavolo.piano.visible = !stanza;
    if (stanza && scena) scena.background = null;
    // il plastico unito al posto dei suoi 2.416 pezzi (sotto, IL PLASTICO UNITO);
    // al primo fotogramma non c'e' ancora: si leggono i materiali della carta
    if (V.unito) accendiUnito(true); else if (!V.cattura) V.cattura = catturaIMateriali();
    const coda = V.coda;
    V.coda = [];
    V.dentroFotogramma = true;
    for (const [, cb] of coda) {
      try { cb(tempo); } catch (e) { erroreDelVisore(e); console.warn("[EIDETICA visore]", e && e.message); }
    }
  } catch (e) {
    erroreDelVisore(e);
    console.warn("[EIDETICA visore] fotogramma:", e && e.message);
  } finally {
    V.dentroFotogramma = false;
    if (stanza && scena) scena.background = fondo;
    if (terra) terra.visible = terraAccesa;
    if (V.tavolo) V.tavolo.piano.visible = false;
    if (V.unito) accendiUnito(false);
    if (V.punti) V.punti.visible = false;
    if (V.finestre) V.finestre.gruppo.visible = false;
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
  V.ritmo = { fps: Math.round(R.n * 1000 / (ora - R.da)), ms: +(R.somma / R.n).toFixed(1), max: Math.round(R.max) };
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
    raggio.addEventListener("selectstart", (e) => { V.selezioni = (V.selezioni || 0) + 1; if (eMano(e)) prendi(ing); });
    raggio.addEventListener("selectend", (e) => { if (eMano(e)) lascia(ing); });
    raggio.addEventListener("squeezestart", (e) => { if (!eMano(e)) prendi(ing); });
    raggio.addEventListener("squeezeend", (e) => { if (!eMano(e)) lascia(ing); });
    // 13/10: il grilletto del controller prende solo le finestre (il plastico
    // resta alla presa laterale; la scelta delle persone non c'e' ancora)
    raggio.addEventListener("selectstart", (e) => { if (!eMano(e)) prendiFinestra(window.THREE, ing); });
    raggio.addEventListener("selectend", (e) => { if (!eMano(e)) lasciaFinestra(ing); });
    return ing;
  });
  return V.ingressi;
}

function giroAttornoAllaVerticale(T, q) {
  return new T.Euler().setFromQuaternion(q, "YXZ").y;
}

function prendi(ing) {
  if (V.presa || V.presaFinestra || !V.supporto) return;   // una mano alla volta
  if (prendiFinestra(window.THREE, ing)) return;   // puntata una finestra: si prende quella
  const T = window.THREE;
  V.presa = { i: ing.i, supporto0: V.supporto.matrix.clone(),
              punto0: ing.raggio.position.clone(), giro0: giroAttornoAllaVerticale(T, ing.raggio.quaternion) };
  V.prese++;
}

function lascia(ing) {
  lasciaFinestra(ing);
  if (V.presa && V.presa.i === ing.i) V.presa = null;
}

function lasciaFinestra(ing) {
  if (V.presaFinestra && V.presaFinestra.i === ing.i) V.presaFinestra = null;
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
    // 09/10: anche un disegno «sullo schermo» FUORI dal fotogramma del visore
    // e' una foto (misurato: captureFOV, le occhiate degli agenti, index.html,
    // disegnano fra un fotogramma e l'altro): al visore non arriva, e con la
    // telecamera del visore al posto della sua l'occhiata usciva sbagliata.
    // ⚠️ fuori dal fotogramma three dichiara come bersaglio quello del visore
    //    (isXRRenderTarget), non «nessuno»: si guarda solo il tempo.
    const alVisore = !rt || rt.isXRRenderTarget === true;
    if (!V.scatti || !ren.xr.enabled || (alVisore && V.dentroFotogramma)) return vero.apply(this, arguments);
    ren.xr.enabled = false;
    if (alVisore) ren.setRenderTarget(null);   // senza visore per three: la tela della pagina
    const finestre = V.finestre && V.finestre.gruppo.visible ? V.finestre.gruppo : null;   // l'occhio non le vede
    if (finestre) finestre.visible = false;
    try { return vero.apply(this, arguments); }
    finally { ren.xr.enabled = true; if (alVisore && rt) ren.setRenderTarget(rt); if (finestre) finestre.visible = true; }
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

// ─── LE FINESTRE DAL VIVO (13/10) ─────────────────────────────────────────
// Raffaella, 03/10 e 13/10: nel visore «tutto quello che succede nel browser
// del PC — il velo, quello che vedo con gli zoom dell'occhio, il racconto —
// in finestre live che si aprono man mano, prendibili e ancorabili con le
// mani, piu' chiare». La scheda scura del 02/10 «non mi piace»: era sola,
// di lato, non si prendeva.
// TRE FINESTRE, nessun dato nuovo: ognuna ricopia una cosa che il PC mostra.
//   - IL RACCONTO = il report del velo (window.__veritasApertura.stato().report,
//     la stessa reportDi del riquadro del velo), al ritmo del suo battito;
//   - LO ZOOM DELL'OCCHIO = l'immagine della fermata che l'occhio sta
//     guardando (veritas:fermata, la stessa che il velo mette nella sua
//     inquadratura) col nome e il ragionamento (veritas:nome). Sul plastico,
//     un recinto di luce attorno all'oggetto inquadrato: nel velo del PC e'
//     la cornice della sua scena;
//   - QUELLO CHE VEDO = la tela del pannello «quello che vedo» del PC, con la
//     vista scelta. Il diario dell'occhio NO: Raffaella, 02/09, «l'utente non
//     le deve vedere».
// Racconto e zoom finiscono col velo (decisione del 02/10: niente «ultimo
// stato»); «quello che vedo» resta, come sul PC.
// SI APRONO MAN MANO: ognuna compare (crescendo) quando ha qualcosa da dire.
// SI PRENDONO: si punta la finestra col raggio (controller o mano) e si
// stringe (grilletto, presa laterale o pizzico); la finestra segue la mano e
// resta girata verso chi guarda; lasciata, resta li', FERMA NELLA STANZA (la
// posa e' in metri reali nel riferimento del supporto, come le mani: se si
// sposta il plastico le finestre non si muovono). La mano nuda prende anche
// a contatto: il pizzico a meno di 12 cm dal vetro.
// Come il tavolo, si accendono solo nei fotogrammi del visore e si spengono in
// ogni foto dell'occhio (GLI SCATTI DELL'OCCHIO): l'analisi non le vede mai.
// Misure e posti (FINESTRE) sono DI PROVA: si giudicano a occhio nel visore.
const FINESTRE = {
  //            larga  alta  posto (metri reali: x destra, y da terra, z davanti = -)
  racconto: { l: 0.52, h: 0.42, posto: [-0.80, 1.30, -0.72] },
  zoom:     { l: 0.58, h: 0.73, posto: [0.00, 1.42, -1.40] },   // 13/10 notte: il cuore, piu' grande
  vedo:     { l: 0.52, h: 0.42, posto: [0.80, 1.30, -0.72] },
};
const FINESTRA_PX = 900;                    // larghezza del disegno
const BATTITO_FINESTRE = 300;               // quello del velo
const NASCITA_MS = 450;                     // il tempo in cui una finestra compare
const PRESA_VICINA_M = 0.12;                // la mano nuda prende a contatto
const PIZZICO_SI_M = 0.02, PIZZICO_NO_M = 0.035;   // pollice-indice, con isteresi
const TINTE_DEL_VELO = { attesa: "#2EE6D6", zone: "#A970FF", oggetti: "#7CFFB2",
                         conformita: "#FF4D6D", orientamento: "#FFB020" };
// le stesse tinte, piu' scure: sul vetro chiaro si leggono
const INCHIOSTRI = { attesa: "#0B8F86", zone: "#7444D8", oggetti: "#17895A",
                     conformita: "#D02A4A", orientamento: "#B86E00" };
const TONI_RIGA = { ok: "#0B8F86", ko: "#D02A4A", avviso: "#B86E00" };
const VETRO = "rgba(246,248,251,0.94)", INCHIOSTRO = "#1B2230", GRIGIO = "#5B6576";
const SANS = 'Inter, "Segoe UI", system-ui, sans-serif';
const MONO = '"JetBrains Mono", Consolas, ui-monospace, monospace';
const TITOLI = {
  it: { racconto: "IL RACCONTO", zoom: "LO ZOOM DELL'OCCHIO", vedo: "QUELLO CHE VEDO",
        fermata: "fermata", guarda: "sta guardando…", fiducia: "fiducia",
        occhio: "occhio", nominati: "oggetti nominati", fa: "s fa",
        persone: "persone", cammino: "in cammino", ferme: "ferme", vista: "vista" },
  en: { racconto: "THE STORY", zoom: "THE EYE'S CLOSE-UP", vedo: "WHAT I SEE",
        fermata: "stop", guarda: "looking…", fiducia: "confidence",
        occhio: "eye", nominati: "objects named", fa: "s ago",
        persone: "people", cammino: "walking", ferme: "still", vista: "view" },
};
const titoli = () => TITOLI[lingua()];

// Quello che l'occhio fa, ascoltato da subito (anche fuori dal visore): chi
// entra a regia avviata trova gia' l'ultima fermata.
// ⚠️ Il nome arriva DOPO la fermata (misurato il 13/10: l'occhio guarda un
//    foglio da quattro, il carrello e' gia' avanti di tre): sotto l'immagine
//    di adesso si mostra l'ultimo oggetto nominato con la SUA immagine.
const OCCHIO = { fermata: null, immagine: null, immagini: new Map(), fermate: new Map(), nome: null, immagineNome: null,
                 nominati: 0, ultimo: 0, cambio: 0 };
function ascoltaLOcchio() {
  addEventListener("veritas:fermata", (e) => {
    const d = e.detail || {};
    OCCHIO.fermata = d; OCCHIO.cambio++;
    if (d.indice != null && d.min && d.max) {
      OCCHIO.fermate.set(d.indice, { min: d.min, max: d.max });
      if (OCCHIO.fermate.size > 24) OCCHIO.fermate.delete(OCCHIO.fermate.keys().next().value);
    }
    if (d.immagine) {
      const img = new Image();
      img.onload = () => {
        OCCHIO.immagini.set(d.indice, img);
        if (OCCHIO.immagini.size > 12) OCCHIO.immagini.delete(OCCHIO.immagini.keys().next().value);
        if (OCCHIO.fermata === d) { OCCHIO.immagine = img; OCCHIO.cambio++; }
      };
      img.src = d.immagine;
    }
  });
  addEventListener("veritas:regia", (e) => {
    const d = e.detail || {};
    if (d.fase === "inizio") { OCCHIO.regiaFinita = false; OCCHIO.regiaIniziata = true; }
    if (d.fase === "fine") OCCHIO.regiaFinita = true;
  });
  addEventListener("veritas:nome", (e) => {
    const d = e.detail || {};
    OCCHIO.nominati++; OCCHIO.ultimo = Date.now();
    OCCHIO.nome = d; OCCHIO.immagineNome = OCCHIO.immagini.get(d.indice) || null;
    OCCHIO.cambio++;
  });
}

function veloAperto() {
  try {
    const st = window.__veritasApertura && window.__veritasApertura.stato();
    return st && st.aperta ? st : null;
  } catch (e) { return null; }
}

function preparaLeFinestre(T) {
  const gruppo = new T.Group();
  gruppo.name = "eidetica-visore-finestre";
  gruppo.visible = false;                      // lo accende solo fotogramma()
  window.__veritasScene.add(gruppo);
  const F = { gruppo, lista: {}, timer: null, prese: 0, disegni: 0, msDisegno: 0, recinto: null, fermataRecinto: null };
  for (const nome of Object.keys(FINESTRE)) {
    const m = FINESTRE[nome];
    const tela = document.createElement("canvas");
    tela.width = FINESTRA_PX;
    tela.height = Math.round(FINESTRA_PX * m.h / m.l);
    const trama = new T.CanvasTexture(tela);
    trama.colorSpace = T.SRGBColorSpace;
    trama.anisotropy = 4;
    const mesh = new T.Mesh(new T.PlaneGeometry(1, 1),
      new T.MeshBasicMaterial({ map: trama, transparent: true, opacity: 0, toneMapped: false, depthWrite: false, fog: false }));
    mesh.name = "eidetica-visore-finestra-" + nome;
    mesh.matrixAutoUpdate = false;             // la posa la mette posaLeFinestre()
    mesh.frustumCulled = false;
    mesh.castShadow = false; mesh.receiveShadow = false;
    mesh.renderOrder = 10;
    mesh.raycast = () => {};
    mesh.visible = false;
    gruppo.add(mesh);
    // girata verso chi sta al centro della stanza
    const pos = new T.Vector3(...m.posto);
    const quat = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), Math.atan2(-pos.x, -pos.z));
    F.lista[nome] = { nome, l: m.l, h: m.h, tela, trama, mesh, pos, quat, pos0: pos.clone(), quat0: quat.clone(),
                      aperta: false, nata: 0, firma: null, disegni: 0 };
    metticiDavanti(T, F.lista[nome]);
  }
  // il recinto dell'oggetto che l'occhio guarda, sul plastico (metri veri)
  const recinto = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1, 1, 1)),
    new T.LineBasicMaterial({ color: TINTE_DEL_VELO.oggetti, transparent: true, opacity: 0.95, toneMapped: false, fog: false }));
  recinto.name = "eidetica-visore-recinto";
  recinto.visible = false;
  recinto.raycast = () => {};
  gruppo.add(recinto);
  F.recinto = recinto;
  F.lettura = preparaLaLettura(T, gruppo);
  F.timer = setInterval(() => leggiLeFinestre(F), BATTITO_FINESTRE);
  leggiLeFinestre(F);
  return F;
}

function apri(W, si) {
  if (si && !W.aperta) { W.aperta = true; W.nata = performance.now(); }
  if (!si && W.aperta) { W.aperta = false; W.firma = null; }
}

// Al ritmo del battito: chi ha qualcosa da dire si apre, e si ridisegna solo
// se il contenuto e' cambiato.
function leggiLeFinestre(F) {
  const st = veloAperto();
  const L = F.lista;
  // IL RACCONTO
  const report = st ? st.report : null;
  apri(L.racconto, !!report);
  if (report) {
    const piede = piedeDelRacconto();
    ridisegna(F, L.racconto, (st.stato || "") + "|" + JSON.stringify(report) + "|" + piede,
      () => disegnaIlRacconto(L.racconto, st.stato, report, piede));
  }
  // LO ZOOM DELL'OCCHIO (finisce col velo, come il racconto)
  apri(L.zoom, !!(st && OCCHIO.fermata));
  if (L.zoom.aperta) ridisegna(F, L.zoom, "z" + OCCHIO.cambio, () => disegnaLoZoom(L.zoom));
  // QUELLO CHE VEDO: la tela del pannello del PC, quando c'e' e ha disegnato
  const pannello = document.getElementById("veritas-anteprima");
  const tela = pannello && pannello.querySelector("canvas");
  const scelta = pannello && pannello.querySelector("select");
  const vista = scelta && scelta.selectedOptions && scelta.selectedOptions[0] ? scelta.selectedOptions[0].textContent : "";
  apri(L.vedo, !!(tela && pannello.isConnected && (vista || (scelta && scelta.options.length))));
  if (L.vedo.aperta) {
    // la tela cambia senza dirlo: si confronta un suo campione di pixel
    let campione = "";
    try {
      const c = tela.getContext("2d"), w = tela.width, h = tela.height;
      const d = c.getImageData(0, 0, w, h).data;
      let s = 0; for (let i = 0; i < d.length; i += 4 * 97) s = (s * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) | 0;
      campione = String(s);
    } catch (e) { campione = String(Date.now() >> 12); }
    ridisegna(F, L.vedo, vista + "|" + campione, () => disegnaQuelloCheVedo(L.vedo, tela, vista));
  }
}

function ridisegna(F, W, firma, disegno) {
  if (firma === W.firma) return;
  W.firma = firma;
  const t0 = performance.now();
  try { disegno(); } catch (e) { console.warn("[EIDETICA visore] finestra " + W.nome + ":", e && e.message); }
  W.trama.needsUpdate = true;
  W.disegni++; F.disegni++;
  F.msDisegno = performance.now() - t0;
}

function piedeDelRacconto() {
  const t = titoli();
  const s = OCCHIO.ultimo ? Math.round((Date.now() - OCCHIO.ultimo) / 1000) : null;
  return t.occhio + ": " + OCCHIO.nominati + " " + t.nominati + (s != null ? " · " + (Math.floor(s / 5) * 5) + " " + t.fa : "")
    + "   ·   " + t.persone + ": " + (window.__veritasSimStarted ? t.cammino : t.ferme);
}

// Il vetro: chiaro, bordo sottile, filo della tinta a sinistra, intestazione.
function vetro(c, W, H, tinta, intestazione) {
  c.clearRect(0, 0, W, H);
  c.beginPath();
  c.roundRect(3, 3, W - 6, H - 6, 30);
  c.fillStyle = VETRO; c.fill();
  c.lineWidth = 3; c.strokeStyle = "rgba(20,30,50,0.14)"; c.stroke();
  c.fillStyle = tinta; c.fillRect(3, H * 0.12, 7, H * 0.5);
  c.textBaseline = "alphabetic";
  c.font = "600 22px " + SANS; c.fillStyle = GRIGIO;
  c.fillText(intestazione.split("").join(String.fromCharCode(8202)), 48, 50);
}

function adatta(c, t, max) {
  t = String(t == null ? "" : t);
  if (c.measureText(t).width <= max) return t;
  while (t.length > 1 && c.measureText(t + "…").width > max) t = t.slice(0, -1);
  return t + "…";
}

function aCapo(c, t, max, righe) {
  const parole = String(t || "").split(/\s+/), fuori = [];
  let r = "";
  for (const p of parole) {
    const prova = r ? r + " " + p : p;
    if (c.measureText(prova).width <= max) { r = prova; continue; }
    if (r) fuori.push(r);
    r = p;
    if (fuori.length === righe) break;
  }
  if (fuori.length < righe && r) fuori.push(r);
  if (fuori.length === righe && parole.join(" ").length > fuori.join(" ").length)
    fuori[righe - 1] = adatta(c, fuori[righe - 1] + " …", max);
  return fuori.slice(0, righe);
}

// Il racconto ricalca il riquadro del velo: titolo e comando nella tinta,
// righe chiave · valore, barra a tacche, note con «›»; sotto, il piede con
// quello che fa l'occhio e se le persone camminano.
function disegnaIlRacconto(W, stato, r, piede) {
  const c = W.tela.getContext("2d"), L = W.tela.width, H = W.tela.height;
  const inchiostro = INCHIOSTRI[stato] || INCHIOSTRI.attesa;
  vetro(c, L, H, TINTE_DEL_VELO[stato] || TINTE_DEL_VELO.attesa, titoli().racconto);
  const X = 48, LARGO = L - X - 44, FONDO = H - 78;
  let y = 104;
  c.font = "700 38px " + SANS; c.fillStyle = inchiostro;
  c.fillText(adatta(c, r.titolo, LARGO), X, y); y += 46;
  c.font = "500 25px " + MONO; c.fillStyle = INCHIOSTRO;
  c.fillText(adatta(c, r.comando, LARGO), X, y); y += 50;
  c.font = "24px " + MONO;
  for (const riga of r.righe || []) {
    if (y > FONDO) break;
    c.fillStyle = GRIGIO;
    const k = adatta(c, riga.k, LARGO);
    c.fillText(k, X, y);
    if (riga.v) {
      const dx = c.measureText(k).width + 16;
      c.fillStyle = TONI_RIGA[riga.tono] || INCHIOSTRO;
      c.fillText(adatta(c, riga.v, LARGO - dx), X + dx, y);
    }
    y += 36;
  }
  if (r.barra != null && y <= FONDO) {
    const passo = 20, quante = Math.floor(LARGO / passo);
    const piene = Math.round(Math.max(0, Math.min(1, r.barra)) * quante);
    for (let i = 0; i < quante; i++) {
      c.fillStyle = i < piene ? inchiostro : "rgba(20,30,50,0.10)";
      c.fillRect(X + i * passo, y - 14, 14, 14);
    }
    y += 34;
  }
  c.font = "24px " + SANS;
  for (const n of r.note || []) {
    if (y > FONDO) break;
    c.fillStyle = inchiostro; c.fillText("›", X, y);
    c.fillStyle = TONI_RIGA[n.tono] || "#2F3A4C";
    c.fillText(adatta(c, n.t, LARGO - 26), X + 26, y);
    y += 34;
  }
  c.fillStyle = "rgba(20,30,50,0.10)"; c.fillRect(X, H - 64, LARGO, 2);
  c.font = "21px " + MONO; c.fillStyle = GRIGIO;
  c.fillText(adatta(c, piede, LARGO), X, H - 30);
}

// Lo zoom: l'immagine che l'occhio sta guardando, grande; sotto il nome e il
// ragionamento appena l'occhio ha parlato.
function disegnaLoZoom(W) {
  const c = W.tela.getContext("2d"), L = W.tela.width, H = W.tela.height, t = titoli();
  vetro(c, L, H, TINTE_DEL_VELO.oggetti, t.zoom);
  const f = OCCHIO.fermata || {}, n = OCCHIO.nome;
  const X = 48, LARGO = L - X - 44;
  if (f.quante) {
    c.font = "500 22px " + MONO; c.fillStyle = GRIGIO;
    const s = t.fermata + " " + ((f.indice || 0) + 1) + "/" + f.quante;
    c.fillText(s, L - 44 - c.measureText(s).width, 50);
  }
  const lato = Math.min(LARGO, H - 74 - 250), y0 = 74, xi = X + (LARGO - lato) / 2;
  c.fillStyle = "#0b0d12"; c.fillRect(xi, y0, lato, lato);
  if (OCCHIO.immagine) c.drawImage(OCCHIO.immagine, xi, y0, lato, lato);
  c.lineWidth = 3; c.strokeStyle = INCHIOSTRI.oggetti; c.strokeRect(xi, y0, lato, lato);
  let y = y0 + lato + 30;
  if (n && n.nome) {
    // l'ultimo nominato: la sua immagine piccola, il nome, il ragionamento
    const pic = 190;
    c.fillStyle = "#0b0d12"; c.fillRect(X, y, pic, pic);
    if (OCCHIO.immagineNome) c.drawImage(OCCHIO.immagineNome, X, y, pic, pic);
    c.lineWidth = 2; c.strokeStyle = INCHIOSTRI.oggetti; c.strokeRect(X, y, pic, pic);
    const tx = X + pic + 24, TL = LARGO - pic - 24;
    let ty = y + 40;
    c.font = "700 36px " + SANS; c.fillStyle = INCHIOSTRI.oggetti;
    const nome = n.nome + (n.copie && n.copie.length > 1 ? "  ×" + n.copie.length : "");
    c.fillText(adatta(c, nome, TL), tx, ty); ty += 38;
    c.font = "25px " + SANS; c.fillStyle = INCHIOSTRO;
    const ragione = String(n.ragionamento || "").replace(/^[^.]*,\s*\d+\s*in tutto\.\s*/i, "");
    for (const r of aCapo(c, ragione || n.ragionamento, TL, 3)) { c.fillText(r, tx, ty); ty += 32; }
    if (n.fiducia != null) {
      c.font = "21px " + MONO; c.fillStyle = GRIGIO;
      c.fillText(t.fiducia + " " + Math.round(n.fiducia * 100) + "%", tx, Math.min(ty + 4, y + pic));
    }
  } else {
    c.font = "italic 30px " + SANS; c.fillStyle = GRIGIO;
    c.fillText(t.guarda, X, y);
  }
}

// Quello che vedo: la tela del pannello del PC, intera, e la vista scelta.
function disegnaQuelloCheVedo(W, tela, vista) {
  const c = W.tela.getContext("2d"), L = W.tela.width, H = W.tela.height, t = titoli();
  vetro(c, L, H, TINTE_DEL_VELO.attesa, t.vedo);
  const X = 48, LARGO = L - X - 44, ALTO = H - 74 - 70;
  const k = Math.min(LARGO / tela.width, ALTO / tela.height);
  const w = tela.width * k, h = tela.height * k, x = X + (LARGO - w) / 2, y = 74;
  c.fillStyle = "#0b0d12"; c.fillRect(x, y, w, h);
  c.drawImage(tela, x, y, w, h);
  c.font = "22px " + MONO; c.fillStyle = GRIGIO;
  if (vista) c.fillText(adatta(c, t.vista + ": " + vista, LARGO), X, H - 32);
}

// Nel fotogramma del visore: le pose (supporto · posa), le aperte accese. Il
// velo si chiude nello stesso fotogramma (prova 1 del 02/10: la scheda restava
// un battito): si chiede al velo solo se e' aperto.
function posaLeFinestre(T) {
  const F = V.finestre;
  if (!F) return;
  const L = F.lista;
  if ((L.racconto.aperta || L.zoom.aperta) && !veloAperto()) { apri(L.racconto, false); apri(L.zoom, false); }
  const ora = performance.now(), M = new T.Matrix4(), uno = new T.Vector3();
  for (const W of Object.values(L)) {
    W.mesh.visible = W.aperta;
    if (!W.aperta) continue;
    // nasce crescendo: da 85% a 100%, da trasparente a pieno
    const k = Math.min(1, (ora - W.nata) / NASCITA_MS), e = 1 - Math.pow(1 - k, 3);
    W.mesh.material.opacity = e;
    const s = 0.85 + 0.15 * e;
    M.compose(W.pos, W.quat, uno.set(W.l * s, W.h * s, 1));
    W.mesh.matrix.multiplyMatrices(V.supporto.matrixWorld, M);
    W.mesh.matrixWorld.copy(W.mesh.matrix);
  }
  posaLaLettura(T, F.lettura, L.zoom.aperta && !OCCHIO.regiaFinita);
  // il recinto sull'oggetto che l'occhio guarda (metri veri, nella scena)
  const f = L.zoom.aperta && !OCCHIO.regiaFinita ? OCCHIO.fermata : null;
  F.recinto.visible = !!(f && f.min && f.max);
  if (F.recinto.visible && F.fermataRecinto !== f) {
    F.fermataRecinto = f;
    const r = F.recinto, mar = 1.08;
    r.position.set((f.min[0] + f.max[0]) / 2, (f.min[1] + f.max[1]) / 2, (f.min[2] + f.max[2]) / 2);
    r.scale.set(Math.max(0.05, f.max[0] - f.min[0]) * mar, Math.max(0.05, f.max[1] - f.min[1]) * mar,
                Math.max(0.05, f.max[2] - f.min[2]) * mar);
    r.updateMatrixWorld(true);
  }
}

// ── LA LETTURA DELL'OCCHIO, SUL PLASTICO (13/10 notte) ──
// Raffaella: «il processo di lettura dell'occhio e' il cuore di EIDETICA».
// Sul PC il velo mostra una telecamera che va dalle cose (§0.5); nel visore la
// si vede SUL PLASTICO: una piccola telecamera di luce sta dove sta l'occhio
// (la STESSA telecamera della fermata, veritas:fermata camera.mondo) e vola
// da un oggetto all'altro; un filo la lega all'oggetto guardato; quando
// l'occhio nomina un oggetto, sopra di lui compare il cartellino col nome e il
// ragionamento (veritas:nome). Nessun dato nuovo, nessuna animazione finta: si
// muove solo quando l'occhio si muove. Misure in metri reali x scala.
const OCCHIO_LATO_M = 0.05, NOME_L = 0.20, NOME_H = 0.062, NOME_SOPRA_M = 0.035, CARRELLO_S = 0.35;
function preparaLaLettura(T, gruppo) {
  const luce = () => new T.LineBasicMaterial({ color: TINTE_DEL_VELO.oggetti, transparent: true, opacity: 0.95, toneMapped: false, fog: false });
  // la telecamera: vertice + piramide aperta verso -z (come una telecamera di three)
  const v = [0, 0, 0], a = [-0.6, 0.45, -1], b = [0.6, 0.45, -1], c = [0.6, -0.45, -1], d = [-0.6, -0.45, -1];
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute([...v, ...a, ...v, ...b, ...v, ...c, ...v, ...d,
    ...a, ...b, ...b, ...c, ...c, ...d, ...d, ...a], 3));
  const occhio = new T.Group();
  occhio.name = "eidetica-visore-occhio";
  const piramide = new T.LineSegments(g, luce());
  occhio.add(piramide);
  const punto = new T.Mesh(new T.SphereGeometry(0.18, 12, 8),
    new T.MeshBasicMaterial({ color: TINTE_DEL_VELO.oggetti, toneMapped: false, fog: false }));
  occhio.add(punto);
  occhio.visible = false;
  gruppo.add(occhio);
  const filo = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]), luce());
  filo.material.opacity = 0.55; filo.frustumCulled = false; filo.visible = false;
  gruppo.add(filo);
  // il cartellino del nome, sopra l'oggetto nominato
  const tela = document.createElement("canvas");
  tela.width = 640; tela.height = Math.round(640 * NOME_H / NOME_L);
  const trama = new T.CanvasTexture(tela);
  trama.colorSpace = T.SRGBColorSpace;
  const nome = new T.Mesh(new T.PlaneGeometry(1, 1),
    new T.MeshBasicMaterial({ map: trama, transparent: true, toneMapped: false, depthWrite: false, fog: false }));
  nome.name = "eidetica-visore-nome";
  nome.renderOrder = 11; nome.visible = false; nome.matrixAutoUpdate = false; nome.frustumCulled = false;
  gruppo.add(nome);
  const asta = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]), luce());
  asta.frustumCulled = false; asta.visible = false;
  gruppo.add(asta);
  return { occhio, filo, nome, asta, tela, trama,
           disposti: [g, punto.geometry, filo.geometry, nome.geometry, asta.geometry],
           materiali: [piramide.material, punto.material, filo.material, nome.material, asta.material],
           posa: null, ultimo: performance.now(), nomeDi: null, voli: 0 };
}

function posaLaLettura(T, Lt, accesa) {
  if (!Lt) return;
  const ora = performance.now(), dt = Math.min(0.2, (ora - Lt.ultimo) / 1000);
  Lt.ultimo = ora;
  const f = accesa ? OCCHIO.fermata : null, m = f && f.camera && f.camera.mondo;
  Lt.occhio.visible = Lt.filo.visible = !!(m && m.length === 16 && V.scala);
  if (Lt.occhio.visible) {
    // il carrello: dalla posa di prima a quella della fermata, con calma
    const meta = new T.Matrix4().fromArray(m), p = new T.Vector3(), q = new T.Quaternion(), s = new T.Vector3();
    meta.decompose(p, q, s);
    if (!Lt.posa) Lt.posa = { p: p.clone(), q: q.clone() };
    if (Lt.posa.p.distanceTo(p) > 0.01) Lt.voli++;
    const k = 1 - Math.exp(-dt / CARRELLO_S);
    Lt.posa.p.lerp(p, k); Lt.posa.q.slerp(q, k);
    Lt.occhio.position.copy(Lt.posa.p); Lt.occhio.quaternion.copy(Lt.posa.q);
    Lt.occhio.scale.setScalar(OCCHIO_LATO_M * V.scala);
    Lt.occhio.updateMatrixWorld(true);
    const c = f.centro || [(f.min[0] + f.max[0]) / 2, (f.min[1] + f.max[1]) / 2, (f.min[2] + f.max[2]) / 2];
    const pos = Lt.filo.geometry.attributes.position;
    pos.setXYZ(0, Lt.posa.p.x, Lt.posa.p.y, Lt.posa.p.z); pos.setXYZ(1, c[0], c[1], c[2]); pos.needsUpdate = true;
  }
  // il nome sopra l'oggetto nominato: resta finche' ne arriva un altro (8 s dopo l'ultimo, sparisce)
  const n = OCCHIO.nome, dove = n && OCCHIO.fermate.get(n.indice);
  const vivo = !!(n && n.nome && dove && V.testa && V.supporto && (accesa || Date.now() - OCCHIO.ultimo < 8000));
  Lt.nome.visible = Lt.asta.visible = vivo;
  if (!vivo) return;
  if (Lt.nomeDi !== n) { Lt.nomeDi = n; disegnaIlNome(Lt, n); }
  const sc = V.scala, cx = (dove.min[0] + dove.max[0]) / 2, cz = (dove.min[2] + dove.max[2]) / 2;
  const base = new T.Vector3(cx, dove.max[1], cz), su = base.clone().add(new T.Vector3(0, NOME_SOPRA_M * sc, 0));
  const centro = su.clone().add(new T.Vector3(0, NOME_H * sc / 2, 0));
  const testa = V.testa.pos.clone().applyMatrix4(V.supporto.matrixWorld);
  const giro = Math.atan2(testa.x - centro.x, testa.z - centro.z);
  Lt.nome.matrix.compose(centro, new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), giro), new T.Vector3(NOME_L * sc, NOME_H * sc, 1));
  Lt.nome.matrixWorld.copy(Lt.nome.matrix);
  const pa = Lt.asta.geometry.attributes.position;
  pa.setXYZ(0, base.x, base.y, base.z); pa.setXYZ(1, su.x, su.y, su.z); pa.needsUpdate = true;
}

function disegnaIlNome(Lt, n) {
  const c = Lt.tela.getContext("2d"), W = Lt.tela.width, H = Lt.tela.height;
  c.clearRect(0, 0, W, H);
  c.beginPath(); c.roundRect(3, 3, W - 6, H - 6, 22);
  c.fillStyle = VETRO; c.fill();
  c.lineWidth = 4; c.strokeStyle = TINTE_DEL_VELO.oggetti; c.stroke();
  c.textBaseline = "alphabetic";
  c.font = "700 46px " + SANS; c.fillStyle = INCHIOSTRI.oggetti;
  c.fillText(adatta(c, n.nome + (n.copie && n.copie.length > 1 ? "  ×" + n.copie.length : ""), W - 50), 26, 64);
  const ragione = String(n.ragionamento || "").replace(/^[^.]*,\s*\d+\s*in tutto\.\s*/i, "") || n.ragionamento || "";
  c.font = "30px " + SANS; c.fillStyle = INCHIOSTRO;
  aCapo(c, ragione, W - 50, 2).forEach((t, i) => c.fillText(t, 26, 112 + i * 38));
  Lt.trama.needsUpdate = true;
}

function togliLaLettura(Lt) {
  if (!Lt) return;
  for (const g of Lt.disposti) g.dispose();
  for (const m of Lt.materiali) m.dispose();
  Lt.trama.dispose();
}

// ── PRENDERE UNA FINESTRA ──
// Il raggio dell'ingresso (in metri reali, nel riferimento del supporto)
// contro il vetro di ogni finestra aperta; la mano nuda anche a contatto.
function finestraSotto(T, ing) {
  const F = V.finestre;
  if (!F) return null;
  const r = ing.raggio;
  const o = r.position.clone(), d = new T.Vector3(0, 0, -1).applyQuaternion(r.quaternion);
  let vinta = null, meglio = Infinity;
  const inv = new T.Matrix4(), M = new T.Matrix4(), uno = new T.Vector3(1, 1, 1);
  const punta = puntaDellIndice(ing);
  for (const W of Object.values(F.lista)) {
    if (!W.aperta) continue;
    inv.copy(M.compose(W.pos, W.quat, uno)).invert();
    const ol = o.clone().applyMatrix4(inv), dl = d.clone().transformDirection(inv);
    if (Math.abs(dl.z) > 1e-6) {
      const t = -ol.z / dl.z;
      if (t > 0 && t < 4) {
        const x = ol.x + dl.x * t, y = ol.y + dl.y * t;
        if (Math.abs(x) <= W.l / 2 && Math.abs(y) <= W.h / 2 && t < meglio) { meglio = t; vinta = W; }
      }
    }
    if (punta) {                                // a contatto: la punta dell'indice vicino al vetro
      const p = punta.clone().applyMatrix4(inv);
      if (Math.abs(p.x) <= W.l / 2 + 0.03 && Math.abs(p.y) <= W.h / 2 + 0.03 && Math.abs(p.z) < PRESA_VICINA_M
          && Math.abs(p.z) < meglio) { meglio = Math.abs(p.z); vinta = W; }
    }
  }
  return vinta;
}

function puntaDellIndice(ing) {
  const j = ing.fonte && ing.fonte.hand && ing.mano && ing.mano.joints && ing.mano.joints["index-finger-tip"];
  return j && j.visible !== false ? j.position.clone() : null;
}

function prendiFinestra(T, ing) {
  if (V.presa || V.presaFinestra) return false;
  const W = finestraSotto(T, ing);
  if (!W) return false;
  const r = ing.raggio;
  const mano = new T.Matrix4().compose(r.position, r.quaternion, new T.Vector3(1, 1, 1));
  V.presaFinestra = { i: ing.i, W, scarto: mano.invert().multiply(new T.Matrix4().makeTranslation(W.pos.x, W.pos.y, W.pos.z)) };
  V.finestre.prese++;
  return true;
}

// La finestra segue la mano (posizione), ma resta dritta e girata verso chi
// guarda: un vetro che si inclina col polso non si legge.
function seguiLaFinestra(T) {
  const P = V.presaFinestra;
  if (!P) return;
  const r = V.ingressi[P.i].raggio, W = P.W;
  const M = new T.Matrix4().compose(r.position, r.quaternion, new T.Vector3(1, 1, 1)).multiply(P.scarto);
  W.pos.setFromMatrixPosition(M);
  const testa = V.testa ? V.testa.pos : new T.Vector3(0, 1.6, 0);
  W.quat.setFromAxisAngle(new T.Vector3(0, 1, 0), Math.atan2(testa.x - W.pos.x, testa.z - W.pos.z));
}

// Il pizzico letto dalle dita (pollice-indice), oltre a quello che il
// browser annuncia: nel Quest Browser (13/10) la mano nuda non prendeva.
function pizzichiDelleMani(T) {
  for (const ing of V.ingressi || []) {
    const j = ing.fonte && ing.fonte.hand && ing.mano && ing.mano.joints;
    const a = j && j["thumb-tip"], b = j && j["index-finger-tip"];
    if (!a || !b || a.visible === false || b.visible === false) { if (ing.pizzico) { ing.pizzico = false; lascia(ing); } continue; }
    const d = a.position.distanceTo(b.position);
    if (!ing.pizzico && d < PIZZICO_SI_M) { ing.pizzico = true; V.pizzichi = (V.pizzichi || 0) + 1; prendi(ing); }
    else if (ing.pizzico && d > PIZZICO_NO_M) { ing.pizzico = false; lascia(ing); }
  }
}

function togliLeFinestre() {
  const F = V.finestre;
  V.presaFinestra = null;
  if (!F) return;
  V.finestre = null;
  clearInterval(F.timer);
  if (F.gruppo.parent) F.gruppo.parent.remove(F.gruppo);
  for (const W of Object.values(F.lista)) { W.mesh.geometry.dispose(); W.mesh.material.dispose(); W.trama.dispose(); }
  F.recinto.geometry.dispose(); F.recinto.material.dispose();
  togliLaLettura(F.lettura);
}

// ─── LA SPIA (13/10 sera) ─────────────────────────────────────────────────
// Raffaella, Quest Browser: dentro il visore non vedeva niente; premuto il
// tasto per uscire, il plastico e le finestre comparivano «in basso a destra»
// accanto alla pagina. Nel Quest simulato invece si vede tutto: il perche' sta
// nel Quest vero, e dal PC non si legge. La spia lo dice in due posti:
//   - un cartellino DAVANTI AGLI OCCHI (segue la testa, 0,6 m avanti e un po'
//     sotto): se lo vedi il visore disegna, e il cartellino dice dove sta il
//     plastico rispetto a te; se non vedi nemmeno lui, il disegno non arriva;
//   - un riquadro sulla PAGINA, leggibile quando il Quest mostra la pagina.
// Dice: fotogrammi al secondo e ms, stato del Quest, dove sta il plastico
// (distanza, destra/sinistra, su/giu'), errori del fotogramma. Mai nelle foto.
const SPIA_L = 0.30, SPIA_H = 0.11, SPIA_POSTO = [0, -0.10, -0.6];
function erroreDelVisore(e) {
  V.errori = (V.errori || 0) + 1;
  V.ultimoErrore = String((e && e.message) || e).slice(0, 90);
}

function rigaDellaSpia(T) {
  const r = V.ritmo || {}, righe = [];
  righe.push("EIDETICA visore · " + (r.fps != null ? r.fps + " fps · " + r.ms + " ms (max " + r.max + ")" : "primi fotogrammi…")
    + " · Quest: " + (V.statoQuest || "visible"));
  const cam = V.testa, radice = window.__veritasModelRoot;
  if (cam && radice && V.supporto) {
    const b = new T.Box3().setFromObject(radice), c = b.getCenter(new T.Vector3());
    const P = new T.Vector3(c.x, b.min.y, c.z).applyMatrix4(V.supporto.matrixWorld.clone().invert());
    const v = P.sub(cam.pos).applyQuaternion(cam.quat.clone().invert());
    const d = v.length(), az = Math.atan2(v.x, -v.z) * 180 / Math.PI, el = Math.atan2(v.y, Math.hypot(v.x, v.z)) * 180 / Math.PI;
    righe.push("plastico a " + d.toFixed(1) + " m · " + Math.abs(Math.round(az)) + "° " + (az >= 0 ? "a destra" : "a sinistra")
      + " · " + Math.abs(Math.round(el)) + "° " + (el >= 0 ? "in alto" : "in basso")
      + " · occhi a " + cam.pos.y.toFixed(2) + " m");
  }
  const D = V.diag || {};
  righe.push("concessi: " + (D.concessi || "?") + " · il Quest vede " + (D.quest || 0) + " ingressi (max " + (D.maxQuest || 0)
    + ", mani " + (D.maniQuest || 0) + ") · collegati max " + (D.maxCollegati || 0) + " · pizzichi " + (V.pizzichi || 0)
    + " · select " + (V.selezioni || 0) + " · prese " + (V.prese || 0) + "/" + (V.finestre ? V.finestre.prese : 0));
  righe.push("errori " + (V.errori || 0) + (V.ultimoErrore ? ": " + V.ultimoErrore : "")
    + " · ingressi: " + ((V.ingressi || []).filter((x) => x.fonte).map((x) => (x.fonte.hand ? "mano " : "controller ") + (x.fonte.handedness || "")).join(", ") || "nessuno"));
  return righe;
}

function preparaLaSpia(T, gruppo) {
  const tela = document.createElement("canvas");
  tela.width = 1200; tela.height = Math.round(1200 * SPIA_H / SPIA_L);
  const trama = new T.CanvasTexture(tela);
  trama.colorSpace = T.SRGBColorSpace;
  const mesh = new T.Mesh(new T.PlaneGeometry(1, 1),
    new T.MeshBasicMaterial({ map: trama, transparent: true, toneMapped: false, depthTest: false, depthWrite: false, fog: false }));
  mesh.name = "eidetica-visore-spia";
  mesh.matrixAutoUpdate = false; mesh.frustumCulled = false; mesh.renderOrder = 20;
  mesh.raycast = () => {};
  gruppo.add(mesh);
  let pagina = document.getElementById("eidetica-visore-spia");
  if (!pagina) {
    pagina = document.createElement("div");
    pagina.id = "eidetica-visore-spia";
    pagina.style.cssText = "position:fixed;left:16px;bottom:16px;z-index:100001;max-width:min(720px,90vw);padding:10px 14px;"
      + "border-radius:10px;background:rgba(246,248,251,.96);color:#1B2230;border:2px solid #2EE6D6;"
      + "font:600 15px/1.45 ui-monospace,Consolas,monospace;white-space:pre-wrap;pointer-events:none";
    document.body.appendChild(pagina);
  }
  const S = { mesh, tela, trama, pagina, timer: null };
  S.timer = setInterval(() => {
    let righe;
    try { righe = rigaDellaSpia(window.THREE); } catch (e) { righe = ["spia: " + (e && e.message)]; }
    S.pagina.textContent = righe.join(String.fromCharCode(10));
    const c = tela.getContext("2d"), W = tela.width, H = tela.height;
    c.clearRect(0, 0, W, H);
    c.beginPath(); c.roundRect(3, 3, W - 6, H - 6, 24);
    c.fillStyle = "rgba(246,248,251,0.92)"; c.fill();
    c.lineWidth = 6; c.strokeStyle = "#2EE6D6"; c.stroke();
    c.fillStyle = "#1B2230"; c.font = "600 34px " + MONO;
    righe.forEach((r, i) => c.fillText(adatta(c, r, W - 60), 30, 64 + i * 46));
    trama.needsUpdate = true;
  }, 500);
  return S;
}

// segue la testa: matrice del mondo della telecamera · posto davanti agli occhi
function posaLaSpia(T, cam) {
  const S = V.spia;
  if (!S) return;
  // 13/10 notte - Raffaella: «il cartellino resta davanti agli occhi e copre le
  // schede». Ha fatto il suo lavoro: davanti agli occhi solo se c'e' un errore.
  S.mesh.visible = (V.errori || 0) > 0;
  S.mesh.matrix.copy(cam.matrixWorld).multiply(new T.Matrix4().compose(new T.Vector3(...SPIA_POSTO),
    new T.Quaternion(), new T.Vector3(SPIA_L, SPIA_H, 1)));
  S.mesh.matrixWorld.copy(S.mesh.matrix);
}

function togliLaSpia() {
  const S = V.spia;
  if (!S) return;
  V.spia = null;
  clearInterval(S.timer);
  if (S.mesh.parent) S.mesh.parent.remove(S.mesh);
  S.mesh.geometry.dispose(); S.mesh.material.dispose(); S.trama.dispose();
  // il riquadro sulla pagina resta, con l'ultima riga: si legge anche fuori
}

// ─── ENTRARE / USCIRE ─────────────────────────────────────────────────────
async function entra() {
  const T = window.THREE, ren = window.__veritasRenderer, cam = window.__veritasCamera,
        ctrl = window.__veritasControls;
  if (V.sessione || !T || !ren || !cam || !window.__veritasModelRoot || !navigator.xr) return false;
  if (window.eideticaSelezione && window.eideticaSelezione.negliOcchi()) return false;
  // la sessione si chiede per prima: vuole il clic ancora «caldo»
  // col passthrough se il browser lo sa fare (Quest Browser), se no come prima
  const modo = V.supportatoAR ? "immersive-ar" : "immersive-vr";
  const sessione = await navigator.xr.requestSession(modo,
    { optionalFeatures: ["local-floor", "bounded-floor", "hand-tracking"] });
  V.ar = modo === "immersive-ar";

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
  V.supportoBase = supporto.matrix.clone(); V.centro = null; V.daCentrare = true;   // al primo fotogramma, davanti a te
  V.dentroDa = performance.now(); V.giroPrima = null; V.prossimoControllo = 0;
  setTimeout(() => { if (V.sessione === sessione && !V.presa) V.daCentrare = true; }, 1500);   // e di nuovo a tracciamento assestato
  supporto.add(cam);                       // la telecamera sul supporto, non nella scena
  if (ctrl) ctrl.enabled = false;          // nel visore guida la testa, non il mouse
  V.tavolo = preparaIlTavolo(T, scala);
  // mani e controller stanno nel riferimento del visore: sul supporto, come la testa
  for (const ing of V.ingressi) { supporto.add(ing.raggio); supporto.add(ing.mano); }
  V.punti = preparaIPunti(T);
  V.finestre = preparaLeFinestre(T);
  V.errori = 0; V.ultimoErrore = null; V.ritmo = null; V.statoQuest = "visible";
  V.diag = {}; V.pizzichi = 0; V.selezioni = 0;
  V.spia = preparaLaSpia(T, V.finestre.gruppo);
  prendiIlRitmo();
  V.sessione = sessione;                   // da qui fotogramma() lavora
  sessione.addEventListener("end", esci);  // dopo quello di three: prima pulisce lui
  // il «ricentra» del Quest (tasto Meta tenuto premuto): di nuovo davanti
  try { const sp = ren.xr.getReferenceSpace(); if (sp) sp.addEventListener("reset", () => { V.daCentrare = true; }); } catch (e) { /* solo comodita' */ }
  // il Quest mette in pausa la sessione (menu, visore tolto, Link che cade):
  // si scrive, cosi' una clessidra si distingue da un disegno troppo lento
  sessione.addEventListener("visibilitychange", () =>
    { V.statoQuest = sessione.visibilityState; console.log("[EIDETICA visore] il Quest dice: " + sessione.visibilityState); });
  R.da = 0; R.n = 0; R.somma = 0; R.max = 0;
  try {
    const gl = ren.getContext(), d = gl.getExtension("WEBGL_debug_renderer_info");
    console.log("[EIDETICA visore] scheda grafica: " + (d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : "?"));
  } catch (e) { /* solo informazione */ }
  console.log("[EIDETICA visore] sessione " + modo + ", fondo " + (sessione.environmentBlendMode || "?")
    + (V.ar ? ", passthrough " + (V.passthrough ? "acceso" : "spento") + " (tasto A/X)" : ""));
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
  V.ar = false; V.tastoPrima = false;
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
  togliLaSpia();
  togliLeFinestre();
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
  // 13/10 sera: nel Quest Browser (passthrough) il pulsante c'e' anche in Analisi. Raffaella, uscita
  // dal visore: «riprovando a rientrare non me lo faceva fare» (il velo era chiuso).
  const pronto = V.supportato && (esperienza() || V.supportatoAR) && window.__veritasRenderer && window.__veritasModelRoot && !occhi;
  b.style.display = dentro || pronto ? "block" : "none";
  b.classList.toggle("on", dentro);
  const via = dentro ? null : prontoPerIlVisore();
  if (via && via.pronto && !V.annunciato) { V.annunciato = true; console.log("[EIDETICA visore] ora si puo' entrare nel visore"); }
  b.classList.toggle("attesa", !!via && !via.pronto);
  b.classList.toggle("pronto", !!via && via.pronto);
  b.textContent = dentro ? testi().esci
    : via.pronto ? testi().pronto : testi().prepara + (via.perche ? " · " + via.perche : "") + "…";
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
  if (!ombra.getElementById("eidetica-visore-velo-stile")) {
    const st = document.createElement("style");
    st.id = "eidetica-visore-velo-stile";
    st.textContent = CSS_VELO;
    ombra.appendChild(st);
  }
  if (!b) {
    b = document.createElement("button");
    b.id = "eidetica-visore-velo";
    b.type = "button";
    b.className = "vap-secondario";
    b.style.pointerEvents = "auto";
    b.addEventListener("click", premuto);
    entraDelVelo.insertAdjacentElement("afterend", b);
  }
  const via = dentro ? null : prontoPerIlVisore();
  b.classList.toggle("attesa", !!via && !via.pronto);
  b.classList.toggle("pronto", !!via && via.pronto);
  b.textContent = dentro ? testi().esci
    : via.pronto ? testi().pronto : testi().prepara + (via.perche ? " · " + via.perche : "") + "…";
  b.title = testi().titolo;
}

function premuto() {
  // si chiude la sessione: three pulisce, poi il suo «end» chiama esci()
  if (V.sessione) V.sessione.end().catch(() => esci());
  else if (!prontoPerIlVisore().pronto) return;     // non si aspetta dentro il visore
  else entra().catch((e) => console.warn("[EIDETICA visore]", e && e.message));
}

async function chiediAlBrowser() {
  try { V.supportato = !!(navigator.xr && await navigator.xr.isSessionSupported("immersive-vr")); }
  catch (e) { V.supportato = false; }
  try { V.supportatoAR = !!(navigator.xr && await navigator.xr.isSessionSupported("immersive-ar")); }
  catch (e) { V.supportatoAR = false; }
  if (V.supportatoAR) V.supportato = true;
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
  ascoltaLOcchio();
  // il visore si accende e si spegne (Link): Chrome lo dice
  if (navigator.xr) navigator.xr.addEventListener("devicechange", chiediAlBrowser);
  setInterval(aggiornaPulsante, 1000);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.eideticaVisore = {
    entra, esci, passthrough,
    stato: () => ({ supportato: V.supportato, supportatoAR: V.supportatoAR, ar: V.ar,
                    passthrough: V.ar && V.passthrough, dentro: !!V.sessione, scala: V.scala,
                    fotogrammi: V.fotogrammi, inFila: V.coda.length,
                    ingressi: (V.ingressi || []).filter((x) => x.fonte)
                      .map((x) => (x.fonte.hand ? "mano " : "controller ") + (x.fonte.handedness || "?")),
                    presa: V.presa ? V.presa.i : null, prese: V.prese,
                    costoMani_ms: +V.costoMani.toFixed(3),
                    finestre: V.finestre ? Object.fromEntries(Object.values(V.finestre.lista).map((W) =>
                      [W.nome, { aperta: W.aperta, disegni: W.disegni, posto: W.pos.toArray().map((v) => +v.toFixed(3)) }])) : null,
                    presaFinestra: V.presaFinestra ? V.presaFinestra.W.nome : null,
                    lettura: V.finestre && V.finestre.lettura ? { occhio: V.finestre.lettura.occhio.visible,
                      nome: V.finestre.lettura.nome.visible, voli: V.finestre.lettura.voli } : null,
                    prese_finestre: V.finestre ? V.finestre.prese : 0,
                    ms_disegno_finestre: V.finestre ? +V.finestre.msDisegno.toFixed(2) : 0,
                    supporto: V.supporto ? V.supporto.matrixWorld.toArray() : null }),
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avvio);
  else avvio();
}

export default { entra, esci };
