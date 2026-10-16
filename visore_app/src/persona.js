// SCEGLIERE UNA PERSONA E GUARDARE CON I SUOI OCCHI (v20, 16/10/2026, HANDOFF §13.8, richiesta 5).
// Raffaella: «l'agente 1 e' un uomo d'affari che scende dall'aereo e deve prendere la macchina: lo
// seleziono e guardo il percorso con i suoi occhi». Come sul PC (veritas_selezione.js): si sceglie
// una persona (dall'elenco PEOPLE a destra del plastico, o toccandola sul plastico), gli altri si
// attenuano, ai suoi piedi un anello d'oro e davanti la LINEA DORATA (#FFB020) fino a dove arriva.
// Il cartellino dice chi e', che cosa deve fare, dove va, a che punto e'.
// I SUOI OCCHI, in due modi, e li sceglie il cliente (Raffaella, 16/10 sera: «darei la possibilita'
// al cliente»):
//   WINDOW      — una scheda di vetro accanto al plastico mostra quello che vede; si resta seduti;
//   STEP INSIDE — si entra nel modello a grandezza vera, all'altezza dei suoi occhi, e si cammina con
//                 lui, sempre alla velocita' vera (x1). Si esce dal pulsante che resta davanti (Esc sul PC).
// Nessun calcolo nuovo: posizioni, stati e tempi sono quelli del pacchetto del PC.
import * as THREE from "three";
import { vetro, testata } from "./lettura.js";

const CARATTERE = "'Segoe UI', Roboto, 'Helvetica Neue', system-ui, sans-serif";
const TESTO = "#e8eaf0", GRIGIO = "#9aa3b2", CIANO = "#3fd0e8", ORO = "#ffb020", VERDE = "#4fe08a";
const OCCHI = { piedi: 1.62, seduto: 1.20, carrozzina: 1.20 };   // metri sopra i piedi (l'uomo del righello e' 1,80)
const ELENCO = { largo: 0.20, W: 1024, H: 820 }, SCHEDA = { largo: 0.20, W: 1024, H: 700 }, FINESTRA = { largo: 0.24, W: 1024, H: 720 };
const RIGA = { y0: 200, passo: 42, colonna: 470 };
const IMM = { x0: 40, y0: 120, x1: 984, y1: 690 };                 // dove sta l'immagine dei suoi occhi nella finestra
const BOTTONI = { y: 506, alto: 76, lista: [["finestra", "THEIR EYES · WINDOW", 64, 404], ["dentro", "STEP INSIDE", 488, 296], ["chiudi", "CLOSE", 804, 156]] };
// i posti a DESTRA del plastico (le schede dell'occhio stanno a sinistra): [gradi, metri sotto gli occhi]
const POSTI = { elenco: [-40, 0.03], scheda: [-40, 0.205], finestra: [-66, 0.10] };
const DISTANZA = 0.50;
const MAXP = 1000;                                                 // punti della linea dorata (il pacchetto ne ha 800 a testa)
const pulito = (s) => String(s || "").replace(/^(a|an|the)\s+/i, "").trim();
const due = (i) => String(i + 1).padStart(2, "0");
const giro = (x) => Math.atan2(Math.sin(x), Math.cos(x));
const tempo = (s) => (s >= 60 ? Math.floor(s / 60) + " min " + String(Math.round(s % 60)).padStart(2, "0") + " s" : Math.round(s) + " s");

export function preparaPersona({ world, lettura, plastico, RayInteractable, PokeInteractable, DistanceGrabbable, MovementMode, ombre = () => {}, rilascia = () => {} }) {
  const agenti = lettura.agenti || [];
  const vuota = { posa() {}, aggiorna() {}, prova() {}, dentro: () => false, esci() {}, stato: { persone: 0 } };
  if (!agenti.length) return vuota;
  const metri = lettura.metri, nomi = lettura.nomi || [], RIGHE = Math.ceil(agenti.length / 2);
  const S = { persone: agenti.length, scelta: null, finestra: false, dentro: false, sopra: -1, acceso: false, occhiFatti: 0 };

  // ---------- i pannelli: lo stesso vetro coi fili LED delle schede (§0.7) ----------
  function pannello(nome, largo, W, H, { premibile = true, prendibile = false } = {}) {
    const tela = document.createElement("canvas"); tela.width = W; tela.height = H;
    const g = tela.getContext("2d"), trama = new THREE.CanvasTexture(tela);
    trama.colorSpace = THREE.SRGBColorSpace; trama.anisotropy = 4;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(largo, largo * H / W),
      new THREE.MeshBasicMaterial({ map: trama, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide }));
    mesh.name = "eidetica-" + nome; mesh.renderOrder = 11;
    const ente = world.createTransformEntity(mesh);
    ente.addComponent(RayInteractable);
    if (premibile) ente.addComponent(PokeInteractable);
    if (prendibile) ente.addComponent(DistanceGrabbable, { movementMode: MovementMode.MoveTowardsTarget, scale: false, rotate: false,
      targetPositionOffset: [0, 0.02, -0.18], moveSpeedFactor: 0.18 });
    return { g, trama, mesh, ente, W, H, largo, aggiorna() { trama.needsUpdate = true; } };
  }
  // dal punto toccato (uv del raggio o del dito) ai pixel della tela
  const punto = (e, P) => (e && e.uv ? [e.uv.x * P.W, (1 - e.uv.y) * P.H] : null);

  // ---------- 07 · PEOPLE: l'elenco, a destra del plastico ----------
  const E = pannello("elenco-persone", ELENCO.largo, ELENCO.W, ELENCO.H);
  const statoBreve = (a) => (!a.ora ? "not yet" : a.ora.st === "S" ? "seated" : a.ora.st === "W" ? "waiting" : a.ora.passo < 0.2 ? "standing" : "walking");
  function scriviElenco() {
    const { g, W, H } = E;
    vetro(g, W, H, S.acceso, false);
    testata(g, "07", "PEOPLE", S.acceso ? "Choose one: who they are, where they go, their eyes" : "Waiting for the eye…", S.acceso);
    if (S.acceso) {
      agenti.forEach((a, i) => {
        const c = Math.floor(i / RIGHE), r = i % RIGHE, x = 64 + c * RIGA.colonna, y = RIGA.y0 + r * RIGA.passo;
        if (i === S.scelta || i === S.sopra) {
          g.beginPath(); g.roundRect(x - 14, y - 31, RIGA.colonna - 24, 40, 10);
          if (i === S.scelta) { g.fillStyle = "rgba(255,176,32,0.16)"; g.fill(); g.lineWidth = 2.5; g.strokeStyle = ORO; g.stroke(); }
          else { g.fillStyle = "rgba(255,255,255,0.08)"; g.fill(); }
        }
        g.fillStyle = a.hex; g.fillRect(x, y - 22, 8, 24);
        g.textAlign = "left"; g.fillStyle = i === S.scelta ? ORO : GRIGIO; g.font = "500 24px " + CARATTERE; g.fillText(due(i), x + 22, y);
        g.fillStyle = a.ora ? TESTO : GRIGIO; g.font = "400 26px " + CARATTERE; g.fillText(a.etichetta, x + 70, y);
        g.textAlign = "right"; g.fillStyle = GRIGIO; g.font = "400 22px " + CARATTERE; g.fillText(statoBreve(a), x + RIGA.colonna - 48, y);
      });
      g.textAlign = "left"; g.fillStyle = "rgba(154,163,178,0.75)"; g.font = "400 22px " + CARATTERE;
      g.fillText("Pinch a row, or pinch a person on the model", 64, H - 46);
    }
    E.aggiorna();
  }
  function rigaDa(e) {
    const p = punto(e, E); if (!p) return -1;
    const c = p[0] >= 64 + RIGA.colonna - 24 ? 1 : 0, r = Math.floor((p[1] - (RIGA.y0 - 31)) / RIGA.passo);
    if (r < 0 || r >= RIGHE) return -1;
    const i = c * RIGHE + r;
    return i < agenti.length ? i : -1;
  }
  E.mesh.addEventListener("click", (e) => { if (S.acceso) { const i = rigaDa(e); if (i >= 0) scegli(i); } });
  E.mesh.addEventListener("pointermove", (e) => { const i = S.acceso ? rigaDa(e) : -1; if (i !== S.sopra) { S.sopra = i; scriviElenco(); } });
  E.mesh.addEventListener("pointerleave", () => { if (S.sopra !== -1) { S.sopra = -1; scriviElenco(); } });

  // ---------- il cartellino della persona scelta ----------
  const SC = pannello("scheda-persona", SCHEDA.largo, SCHEDA.W, SCHEDA.H);
  SC.mesh.visible = false;
  // dove va: la fine del tratto che sta camminando; per dirla a parole, la cosa nominata dall'occhio piu' vicina
  function dove(a) {
    const o = a.ora; if (!o) return { meta: "—", tra: "—", resta: 0 };
    const f = a.fineTratto[o.j], X = a.xyz, fx = X[3 * f] / 100, fy = X[3 * f + 1] / 100, fz = X[3 * f + 2] / 100;
    let nome = null, meglio = 15;
    for (const n of nomi) {
      if (!n.nome || !n.min || !n.max || /figure di persone/.test(n.ragionamento || "")) continue;   // le figure danno la scala, non un posto
      const d = Math.hypot((n.min[0] + n.max[0]) / 2 - fx, (n.min[2] + n.max[2]) / 2 - fz);
      if (d < meglio && Math.abs(n.min[1] - fy) < 5) { meglio = d; nome = pulito(n.termine || n.nome); }
    }
    const resta = Math.max(0, a.cum[f] - a.cum[o.j]), v = lettura.velocita();
    const sec = (lettura.tempi[a.k0 + f] - (lettura.stato.ts || 0)) / v;
    return { meta: (nome ? "Near the " + nome : "End of their path") + " · " + Math.round(resta) + " m", tra: sec > 1 && resta > 0.5 ? tempo(sec) + (v > 1 ? "  (×" + v + ")" : "") : "Arrived", resta, fine: [fx, fy, fz] };
  }
  function scriviScheda() {
    if (S.scelta == null) return;
    const { g, W, H } = SC, a = agenti[S.scelta], o = a.ora, info = dove(a);
    vetro(g, W, H, true, true);
    testata(g, "AGENT " + due(S.scelta), a.etichetta.toUpperCase(), "Chosen · the gold line is their way", true);
    g.beginPath(); g.roundRect(W - 112, 60, 48, 48, 12); g.fillStyle = a.hex; g.fill();
    const righe = [
      ["Mission", "Free walk · no mission yet", GRIGIO],
      ["Going to", info.meta, TESTO],
      ["Now", o ? (o.st === "S" ? "Seated" : o.st === "W" ? "Waiting" : o.passo < 0.2 ? "Standing" : "Walking · " + o.passo.toFixed(1) + " m/s") : "Not in the building yet", o ? VERDE : GRIGIO],
      ["Walked", o ? Math.round(a.cum[o.j]) + " m of " + Math.round(a.cum[a.fineTratto[o.j]]) + " m" : "—", TESTO],
      ["Arrives in", info.tra, TESTO],
    ];
    righe.forEach(([k, v, colore], i) => {
      const y = 205 + i * 56;
      g.textAlign = "left"; g.fillStyle = GRIGIO; g.font = "400 28px " + CARATTERE; g.fillText(k, 64, y);
      g.textAlign = "right"; g.fillStyle = colore; g.font = "500 28px " + CARATTERE; g.fillText(v, W - 64, y);
    });
    for (const [chi, testo, x, w] of BOTTONI.lista) {
      const attivo = chi === "finestra" && S.finestra, spento = chi !== "chiudi" && !o;
      g.beginPath(); g.roundRect(x, BOTTONI.y, w, BOTTONI.alto, 38);
      g.fillStyle = attivo ? "rgba(63,208,232,0.30)" : "rgba(255,255,255,0.06)"; g.fill();
      const led = g.createLinearGradient(x, 0, x + w, 0);
      led.addColorStop(0, "#ffb020"); led.addColorStop(0.5, "#b36bff"); led.addColorStop(1, "#3fd0e8");
      g.lineWidth = 3; g.strokeStyle = spento ? "rgba(154,163,178,0.35)" : led; g.stroke();
      g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = spento ? GRIGIO : TESTO; g.font = "500 25px " + CARATTERE;
      if ("letterSpacing" in g) g.letterSpacing = "3px";
      g.fillText(testo, x + w / 2, BOTTONI.y + BOTTONI.alto / 2 + 1);
      if ("letterSpacing" in g) g.letterSpacing = "0px";
      g.textBaseline = "alphabetic";
    }
    g.textAlign = "left"; g.fillStyle = "rgba(154,163,178,0.75)"; g.font = "400 22px " + CARATTERE;
    g.fillText("Window: you stay at your desk  ·  Step inside: life size, real speed", 64, H - 50);
    SC.aggiorna();
  }
  SC.mesh.addEventListener("click", (e) => {
    const p = punto(e, SC); if (!p || S.scelta == null) return;
    if (p[1] < BOTTONI.y - 8 || p[1] > BOTTONI.y + BOTTONI.alto + 8) return;
    const b = BOTTONI.lista.find(([, , x, w]) => p[0] >= x - 8 && p[0] <= x + w + 8);
    if (!b) return;
    if (b[0] === "chiudi") return chiudi();
    if (!agenti[S.scelta].ora) return;
    if (b[0] === "finestra") finestra(!S.finestra);
    if (b[0] === "dentro") entra();
  });

  // ---------- l'anello ai piedi, la linea dorata, la meta ----------
  const oro = new THREE.Color(ORO);
  const anello = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.62, 40),
    new THREE.MeshBasicMaterial({ color: oro, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  anello.geometry.rotateX(-Math.PI / 2); anello.renderOrder = 6; anello.name = "eidetica-anello-scelta";
  const meta = new THREE.Mesh(anello.geometry, anello.material.clone()); meta.scale.setScalar(1.6); meta.renderOrder = 6;
  // la linea: un nastro d'oro a terra (si legge da vicino e a grandezza vera) + un filo che si vede anche da lontano
  const nastroPos = new Float32Array(MAXP * 2 * 3), filoPos = new Float32Array(MAXP * 3), nastroInd = [];
  for (let i = 0; i < MAXP - 1; i++) { const v = 2 * i; nastroInd.push(v, v + 2, v + 1, v + 1, v + 2, v + 3); }
  const nastroGeo = new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(nastroPos, 3));
  nastroGeo.setIndex(nastroInd); nastroGeo.setDrawRange(0, 0);
  const nastro = new THREE.Mesh(nastroGeo, new THREE.MeshBasicMaterial({ color: oro, transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false,
    side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  const filoGeo = new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(filoPos, 3));
  filoGeo.setDrawRange(0, 0);
  const filo = new THREE.Line(filoGeo, new THREE.LineBasicMaterial({ color: oro, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }));
  for (const o of [anello, meta, nastro, filo]) { o.frustumCulled = false; o.visible = false; metri.add(o); }
  nastro.renderOrder = 6; filo.renderOrder = 7;
  function disegnaLinea(a) {
    const o = a.ora;
    if (!o) { nastroGeo.setDrawRange(0, 0); filoGeo.setDrawRange(0, 0); meta.visible = false; return; }
    const f = a.fineTratto[o.j], X = a.xyz, punti = [[o.x, o.y, o.z]];
    for (let j = o.j + 1; j <= f && punti.length < MAXP; j++) {
      const q = [X[3 * j] / 100, X[3 * j + 1] / 100, X[3 * j + 2] / 100], u = punti[punti.length - 1];
      if (Math.hypot(q[0] - u[0], q[2] - u[2]) > 0.08) punti.push(q);
    }
    punti.forEach((q, i) => {
      const pr = punti[Math.max(0, i - 1)], ds = punti[Math.min(punti.length - 1, i + 1)];
      let tx = ds[0] - pr[0], tz = ds[2] - pr[2]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      const nx = -tz * 0.14, nz = tx * 0.14;
      nastroPos.set([q[0] + nx, q[1] + 0.06, q[2] + nz, q[0] - nx, q[1] + 0.06, q[2] - nz], 6 * i);
      filoPos.set([q[0], q[1] + 0.12, q[2]], 3 * i);
    });
    nastroGeo.attributes.position.needsUpdate = true; filoGeo.attributes.position.needsUpdate = true;
    nastroGeo.setDrawRange(0, Math.max(0, punti.length - 1) * 6); filoGeo.setDrawRange(0, punti.length);
    const u = punti[punti.length - 1];
    meta.position.set(u[0], u[1] + 0.03, u[2]); meta.visible = punti.length > 1;
  }

  // ---------- WINDOW: la scheda con i suoi occhi ----------
  const F = pannello("finestra-occhi", FINESTRA.largo, FINESTRA.W, FINESTRA.H, { premibile: false, prendibile: true });
  F.mesh.visible = false;
  const largoImm = FINESTRA.largo * (IMM.x1 - IMM.x0) / FINESTRA.W, altoImm = largoImm * (IMM.y1 - IMM.y0) / (IMM.x1 - IMM.x0);
  const rt = new THREE.WebGLRenderTarget(660, Math.round(660 * (IMM.y1 - IMM.y0) / (IMM.x1 - IMM.x0)));
  const immagine = new THREE.Mesh(new THREE.PlaneGeometry(largoImm, altoImm), new THREE.MeshBasicMaterial({ map: rt.texture, toneMapped: true }));
  immagine.position.set(((IMM.x0 + IMM.x1) / 2 - FINESTRA.W / 2) / FINESTRA.W * FINESTRA.largo,
    -((IMM.y0 + IMM.y1) / 2 - FINESTRA.H / 2) / FINESTRA.W * FINESTRA.largo, 0.001);
  immagine.renderOrder = 12; immagine.name = "eidetica-occhi-immagine";
  F.mesh.add(immagine);
  function scriviFinestra() {
    if (S.scelta == null) return;
    const { g, W, H } = F, a = agenti[S.scelta], v = lettura.velocita();
    vetro(g, W, H, true, true);
    g.textBaseline = "alphabetic"; g.textAlign = "left";
    if ("letterSpacing" in g) g.letterSpacing = "4px";
    g.fillStyle = CIANO; g.font = "600 28px " + CARATTERE; g.fillText("THROUGH THEIR EYES  ·  AGENT " + due(S.scelta), 64, 88);
    if ("letterSpacing" in g) g.letterSpacing = "0px";
    g.textAlign = "right"; g.fillStyle = a.hex; g.font = "500 26px " + CARATTERE;
    g.fillText(a.etichetta + "  ·  " + (v === 1 ? "real speed" : "×" + v), W - 64, 88);
    g.fillStyle = "#05070a"; g.fillRect(IMM.x0, IMM.y0, IMM.x1 - IMM.x0, IMM.y1 - IMM.y0);
    F.aggiorna();
  }
  const occhiCam = new THREE.PerspectiveCamera(72, (IMM.x1 - IMM.x0) / (IMM.y1 - IMM.y0), 0.01, 100);
  const v3 = new THREE.Vector3(), w3 = new THREE.Vector3(), su = new THREE.Vector3(), s3 = new THREE.Vector3(), colPrima = new THREE.Color();
  // per guardare dentro il plastico si spegne per un attimo tutto il resto (scrivania, studio, pannelli)
  const nascosti = [];
  function soloIlModello(si, tranne = []) {
    if (si) {
      let o = plastico;
      while (o.parent) {
        for (const f of o.parent.children) if (f !== o && f.visible && !f.isLight && !tranne.includes(f)) { nascosti.push(f); f.visible = false; }
        o = o.parent;
      }
    } else { for (const f of nascosti) f.visible = true; nascosti.length = 0; }
  }
  const altezzaOcchi = (a, o) => (o.st === "S" ? OCCHI.seduto : a.profilo === "wheelchair" ? OCCHI.carrozzina : OCCHI.piedi);
  function rendiOcchi(a) {
    const o = a.ora; if (!o) return;
    const h = altezzaOcchi(a, o), fx = Math.sin(o.ang), fz = Math.cos(o.ang);
    v3.set(o.x + fx * 0.14, o.y + h, o.z + fz * 0.14);
    w3.set(o.x + fx * 10, o.y + h - 1.1, o.z + fz * 10);   // lo sguardo di chi cammina: un po' in giu', dove mette i piedi
    metri.updateMatrixWorld(true);
    metri.localToWorld(v3); metri.localToWorld(w3);
    su.set(0, 1, 0).transformDirection(metri.matrixWorld);
    metri.getWorldScale(s3);
    occhiCam.near = 0.06 * s3.x; occhiCam.far = 400 * s3.x; occhiCam.updateProjectionMatrix();
    occhiCam.position.copy(v3); occhiCam.up.copy(su); occhiCam.lookAt(w3); occhiCam.updateMatrixWorld();
    const r = world.renderer, xr = r.xr.enabled, prima = r.getRenderTarget(), alfa = r.getClearAlpha();
    r.getClearColor(colPrima);
    soloIlModello(true);
    r.xr.enabled = false;
    r.setRenderTarget(rt); r.setClearColor(0x0e131b, 1); r.clear(); r.render(world.scene, occhiCam);
    r.setRenderTarget(prima); r.setClearColor(colPrima, alfa); r.xr.enabled = xr;
    soloIlModello(false);
    S.occhiFatti++;
  }
  const posti = {};
  function posaPannello(P, nome) { const q = posti[nome]; if (q) P.mesh.position.copy(q); }
  function finestra(si) {
    S.finestra = !!si && S.scelta != null;
    F.mesh.visible = S.finestra;
    if (S.finestra) { posaPannello(F, "finestra"); scriviFinestra(); }
    scriviScheda();
    console.log("[EIDETICA visore] i suoi occhi in una finestra: " + (S.finestra ? "aperta" : "chiusa"));
  }

  // ---------- STEP INSIDE: dentro il modello, a grandezza vera, con lui ----------
  const H = pannello("dentro-comando", 0.22, 1024, 220);
  H.mesh.visible = false;
  function scriviComando() {
    const { g, W } = H, a = agenti[S.scelta];
    vetro(g, W, 220, true, true);
    g.textBaseline = "middle"; g.textAlign = "left";
    g.fillStyle = a.hex; g.fillRect(64, 92, 10, 36);
    g.fillStyle = TESTO; g.font = "500 30px " + CARATTERE;
    if ("letterSpacing" in g) g.letterSpacing = "3px";
    g.fillText("THEIR EYES · " + due(S.scelta) + " " + a.etichetta.toUpperCase() + " · REAL SPEED", 96, 112);
    g.beginPath(); g.roundRect(W - 250, 70, 186, 84, 42); g.fillStyle = "rgba(255,176,32,0.22)"; g.fill();
    g.lineWidth = 3; g.strokeStyle = ORO; g.stroke();
    g.textAlign = "center"; g.fillStyle = TESTO; g.fillText("EXIT", W - 157, 113);
    if ("letterSpacing" in g) g.letterSpacing = "0px";
    g.textBaseline = "alphabetic";
    H.aggiorna();
  }
  H.mesh.addEventListener("click", () => esci());
  // il fondo del velo attorno, al posto della stanza: dentro l'edificio non c'e' la scrivania
  const fondo = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0x0e131b, side: THREE.BackSide, depthWrite: false, toneMapped: false }));
  fondo.renderOrder = -10; fondo.visible = false; fondo.name = "eidetica-fondo-dentro";
  world.scene.add(fondo);
  const D = { testa: new THREE.Vector3(), yaw0: 0, ang: 0, h: OCCHI.piedi, p: new THREE.Vector3(), sVita: 1, salvato: null, vel: 1, ultimo: null, yawComando: 0 };
  const SU = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();
  function entra() {
    if (S.dentro || S.scelta == null) return;
    const a = agenti[S.scelta], o = a.ora; if (!o) return;
    D.salvato = { p: plastico.position.clone(), q: plastico.quaternion.clone(), s: plastico.scale.x };
    D.vel = lettura.velocita(); lettura.velocita(1);                 // Raffaella: dentro, sempre il passo vero
    world.camera.getWorldPosition(D.testa);
    world.camera.getWorldDirection(dir);
    D.yaw0 = D.yawComando = Math.atan2(dir.x, dir.z);
    metri.updateMatrixWorld(true); metri.getWorldScale(s3);
    D.sVita = plastico.scale.x / s3.x;                                  // un metro della pagina = un metro vero
    D.ang = o.ang; D.h = altezzaOcchi(a, o); D.p.set(o.x, o.y, o.z); D.ultimo = o;
    rilascia(); plastico.pointerEvents = "none";                      // dentro, il plastico non si prende
    S.finestraPrima = S.finestra; F.mesh.visible = false;
    H.mesh.visible = true; fondo.visible = true; scriviComando();
    soloIlModello(true, [H.mesh, fondo]);
    ombre(false);
    lettura.stato.nascosto = S.scelta;                                // il suo corpo non si vede: sei tu
    S.dentro = true;
    console.log("[EIDETICA visore] dentro il modello con la persona " + due(S.scelta) + ": grandezza vera (x" + D.sVita.toFixed(1) + "), velocita' vera");
  }
  function esci() {
    if (!S.dentro) return;
    S.dentro = false;
    plastico.position.copy(D.salvato.p); plastico.quaternion.copy(D.salvato.q); plastico.scale.setScalar(D.salvato.s);
    plastico.updateMatrixWorld(true);
    soloIlModello(false);
    H.mesh.visible = false; fondo.visible = false;
    if (S.finestraPrima) { F.mesh.visible = true; scriviFinestra(); }
    lettura.velocita(D.vel);
    lettura.stato.nascosto = null;
    plastico.pointerEvents = "auto";
    ombre(true);
    scriviScheda();
    console.log("[EIDETICA visore] fuori dal modello: il plastico torna sulla scrivania");
  }
  const testa = new THREE.Vector3();
  function seguiDentro(a, dt) {
    const o = a.ora || D.ultimo; D.ultimo = o;
    if (a.ora && Math.hypot(o.x - D.p.x, o.z - D.p.z) > 3) D.p.set(o.x, o.y, o.z);   // un salto (rimpiazzo): si va con lui
    const k = 1 - Math.exp(-dt / 0.2);
    D.p.x += (o.x - D.p.x) * k; D.p.y += (o.y - D.p.y) * k; D.p.z += (o.z - D.p.z) * k;
    D.h += (altezzaOcchi(a, o) - D.h) * Math.min(1, dt * 2);
    D.ang += giro(o.ang - D.ang) * Math.min(1, dt / 0.9);              // gira con calma: da seduti, senza nausea
    plastico.scale.setScalar(D.sVita);
    plastico.quaternion.setFromAxisAngle(SU, D.yaw0 - D.ang);
    plastico.position.set(0, 0, 0); plastico.updateMatrixWorld(true);
    v3.set(D.p.x, D.p.y + D.h, D.p.z); metri.localToWorld(v3);
    plastico.position.copy(D.testa).sub(v3); plastico.updateMatrixWorld(true);
    // il comando EXIT resta davanti, un po' in basso, e segue lo sguardo con calma
    world.camera.getWorldPosition(testa); world.camera.getWorldDirection(dir);
    D.yawComando += giro(Math.atan2(dir.x, dir.z) - D.yawComando) * Math.min(1, dt * 1.5);
    H.mesh.position.set(testa.x + Math.sin(D.yawComando) * 0.45, testa.y - 0.16, testa.z + Math.cos(D.yawComando) * 0.45);
    H.mesh.lookAt(testa);
    fondo.position.copy(testa);
  }

  // ---------- scegliere, chiudere ----------
  function colori() {
    if (!lettura.corpi) return;
    agenti.forEach((a, k) => lettura.corpi.colora(k, S.scelta == null ? a.colore
      : k === S.scelta ? a.colore.clone().multiplyScalar(1.3) : a.colore.clone().multiplyScalar(0.28)));
  }
  function scegli(i) {
    if (S.dentro || i == null || i < 0 || i >= agenti.length) return;
    S.scelta = i;
    colori();
    posaPannello(SC, "scheda"); SC.mesh.visible = true;
    scriviScheda(); scriviElenco(); disegnaLinea(agenti[i]);
    anello.visible = nastro.visible = filo.visible = true;
    if (S.finestra) scriviFinestra();
    console.log("[EIDETICA visore] scelta la persona " + due(i) + " (" + agenti[i].etichetta + ")");
  }
  function chiudi() {
    if (S.dentro) esci();
    S.scelta = null; S.finestra = false;
    SC.mesh.visible = F.mesh.visible = false;
    anello.visible = meta.visible = nastro.visible = filo.visible = false;
    colori(); scriviElenco();
  }
  // toccare una persona sul plastico (col raggio della mano, o col mouse sul PC)
  if (lettura.corpi) lettura.corpi.mesh.addEventListener("click", (e) => { if (S.acceso && e.instanceId != null) scegli(e.instanceId); });

  // ---------- i posti, il battito ----------
  function posa(punto, occhi) {
    const occhiMondo = new THREE.Vector3(punto.x, occhi, punto.z + 0.45);
    for (const [nome, P] of [["elenco", E], ["scheda", SC], ["finestra", F]]) {
      const [gradi, sotto] = POSTI[nome], a = gradi * Math.PI / 180;
      posti[nome] = new THREE.Vector3(occhiMondo.x - Math.sin(a) * DISTANZA, occhi - sotto, occhiMondo.z - Math.cos(a) * DISTANZA);
      P.mesh.position.copy(posti[nome]);
      P.mesh.lookAt(occhiMondo);
    }
  }
  let ultimo = null, conta = 0, scrittoElenco = 0, scrittaScheda = 0, scrittaLinea = 0;
  function aggiorna(adesso) {
    const dt = ultimo == null ? 0 : Math.min(0.1, Math.max(0, (adesso - ultimo) / 1000)); ultimo = adesso;
    const L = lettura.stato, acceso = L.tau != null && L.tau >= lettura.T.persone;
    if (acceso !== S.acceso) { S.acceso = acceso; if (!acceso) chiudi(); scriviElenco(); }
    world.camera.getWorldPosition(testa);
    if (!S.dentro) for (const P of [E, SC, F]) if (P.mesh.visible) P.mesh.lookAt(testa);   // ovunque lo si porti, si legge
    if (S.acceso && adesso - scrittoElenco > 2000) { scrittoElenco = adesso; scriviElenco(); }
    if (S.scelta == null) return;
    const a = agenti[S.scelta];
    if (a.ora && !S.dentro) anello.position.set(a.ora.x, a.ora.y + 0.03, a.ora.z);
    anello.visible = !!a.ora && !S.dentro;
    meta.material.opacity = 0.45 + 0.4 * Math.sin(adesso / 260);
    if (adesso - scrittaLinea > 400) { scrittaLinea = adesso; disegnaLinea(a); }
    if (adesso - scrittaScheda > 1000) { scrittaScheda = adesso; if (SC.mesh.visible) scriviScheda(); if (F.mesh.visible) scriviFinestra(); }
    if (S.dentro) seguiDentro(a, dt);
    else if (S.finestra && (++conta % 2 === 0)) rendiOcchi(a);      // a fotogrammi alterni: meta' del costo
  }
  // per la prova dei pesi: la finestra aperta su una persona che cammina
  function prova(si) {
    if (!si) { if (S.provaAperta) chiudi(); S.provaAperta = false; return; }
    const i = agenti.findIndex((a) => a.ora && a.ora.st !== "S");
    if (i < 0) return;
    scegli(i); finestra(true); S.provaAperta = true;
  }
  scriviElenco();
  const api = { posa, aggiorna, prova, scegli, chiudi, finestra, entra, esci, dentro: () => S.dentro, stato: S };
  window.__EIDETICA_PERSONA = api;   // per le prove nell'emulatore
  console.log("[EIDETICA visore] scegliere una persona: elenco di " + agenti.length + ", finestra dei suoi occhi " + rt.width + "x" + rt.height + ", dentro a grandezza vera");
  return api;
}
