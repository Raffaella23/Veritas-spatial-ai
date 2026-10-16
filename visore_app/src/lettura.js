// LA LETTURA DELL'OCCHIO E LE PERSONE, DAL PACCHETTO DEL PROGETTO (16/10/2026, HANDOFF §13.3 e §13.8).
// Il visore non analizza niente: apre il «pacchetto» scritto dal PC (strumenti/fai_pacchetto.mjs)
// e lo RIPRODUCE sul plastico, nell'ordine in cui EIDETICA ha capito lo spazio:
//   prima la scala (§0.6), poi le zone, poi l'occhio che va dagli oggetti (immagine, nome,
//   ragionamento; luce sulle copie e telecamera di luce sul plastico), poi conformita' e
//   orientamento, e solo alla fine le persone che camminano (si muovono grazie a cio' che
//   l'occhio ha capito, §13.1).
// Le SCHEDE DELL'OCCHIO: lo stesso vetro con i fili LED del pannello (§0.7), a sinistra del
// plastico, all'altezza giusta per leggere da seduti; si accendono una alla volta man mano che
// procede la comprensione. Si prendono col pizzico anche da lontano e vengono alla mano
// (DistanceGrabbable, «MoveTowardsTarget»); lasciate, restano dove sono.
// Le SCIE delle persone: un nastro di luce per persona, colore del suo profilo, disegnato UNA
// volta sola e acceso dal tempo della simulazione (nessun calcolo per fotogramma: un numero).
// Dietro la scia recente resta un filo tenue di dove si e' camminato: i flussi si leggono.
// Tutto in inglese (VR Start). I numeri sono quelli del PC: nessuno si inventa qui.
import * as THREE from "three";
import { preparaCorpi, CAMMINA, FERMO, SEDUTO, PASSO_CICLO } from "./corpi.js";

// i colori dei profili: dalla tavola UX (arancio -> viola -> ciano), mai il verde e il rosso,
// che sono dei segnali (§0.7). Chi e' in sedia a rotelle e' ciano: si vede subito (Accessibility).
export const PROFILI = {
  wheelchair: ["#3fd0e8", "Wheelchair user"], elderly: ["#ff6fb1", "Elderly"], family: ["#ff8a3d", "Family"],
  business: ["#ffb020", "Business"], tourist: ["#b36bff", "Tourist"], student: ["#8a95ff", "Student"],
  crew: ["#e8eaf0", "Crew"], vip: ["#f0c8ff", "VIP"],
};
const SENZA_PROFILO = ["#9b87ff", "Visitor"];   // TINTA_AGENTE della pagina
const T = { // la regia della riproduzione, in secondi dall'avvio (dopo l'apertura del marchio)
  scala: 0, zone: 4, oggetti: 9, oggettiFine: 49, conformita: 51, orientamento: 56, persone: 61,
};
// v20 (Raffaella sulla v19: «troppo veloci»): di serie la velocita' VERA (misurata nel pacchetto: 0,7-1,3 m/s,
// mediana 0,9); il pulsante SPEED accelera a x2 e x4. ?velocita=<n> nel link per le prove.
export const VELOCITA = [1, 2, 4];
const VELOCITA_URL = parseFloat(new URLSearchParams(location.search).get("velocita")) || 1;
const CODA = 14;                    // secondi di simulazione di scia accesa dietro ogni persona
const FONDO = 0.10;                 // il filo tenue di dove si e' camminato
const LARGO_SCIA = 0.40;            // metri veri (sul plastico 1:177: 2 mm). v20: piu' stretta, a terra: da vicino si legge sotto i piedi
const SOPRA_SCIA = 0.04;            // v20: la scia sta a terra (v19: 25 cm, all'altezza delle ginocchia dei corpi veri)
const SCHEDA = { largo: 0.20, alto: 0.20 * 680 / 1024, W: 1024, H: 680, distanza: 0.50 };
// i posti delle schede, attorno agli occhi: [gradi a sinistra, metri sotto gli occhi]
const POSTI = [[40, 0.04], [64, 0.04], [40, 0.19], [64, 0.19], [64, 0.34], [40, 0.34]];
const CARATTERE = "'Segoe UI', Roboto, 'Helvetica Neue', system-ui, sans-serif";
const TESTO = "#e8eaf0", GRIGIO = "#9aa3b2", CIANO = "#3fd0e8", VERDE = "#4fe08a", AMBRA = "#ffb020", ROSSO = "#ff5f57", OGGETTI = "#7cffb2";
const TONO = { ok: VERDE, avviso: AMBRA, occhio: OGGETTI, errore: ROSSO, ko: ROSSO, grave: ROSSO };

const liscio = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const maiuscola = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const pulito = (s) => String(s || "").replace(/^(a|an|the)\s+/i, "").trim();

// il ragionamento IN INGLESE, dalla stessa conseguenza che la regia scrive in italiano
// (veritas_regia.js, ragionamento()): stessi casi, nessuna parola inventata
export function ragionamentoEN(n) {
  const quante = n.copie && n.copie.length > 1 ? ", " + n.copie.length + " in all" : "";
  const it = String(n.ragionamento || "");
  if (!n.nome && !n.termine) return "Not recognised: it stays measured, without a name.";
  const nome = maiuscola(pulito(n.termine || n.nome));
  if (/non l'ho confermato/.test(it)) return nome + quante + ". Seen from the front too, not confirmed: I do not count it as a seat.";
  if (n.affordance === "sospesa") return nome + quante + ". I recognise it, but the measurements do not confirm its use: no consequence.";
  if (n.affordance === "non verificabile") return nome + quante + ". I recognise it, but I cannot verify its use: no consequence.";
  if (/figure di persone/.test(it)) return nome + quante + ". Figures of people: they give the scale, not a function.";
  if (n.postura === "seduto") return nome + quante + ". People will be able to sit and rest here.";
  if (n.postura === "sdraiato") return nome + quante + ". People lie down here.";
  if (n.postura === "in piedi") return nome + quante + ". People stop here, standing in front of it.";
  if (n.postura === "passa") return nome + quante + ". People pass through here.";
  if (/Si cammina sopra/.test(it)) return nome + quante + ". You walk on it: it shows the way.";
  return nome + quante + ".";
}

// la cornice di vetro coi fili LED: lo stesso disegno del pannello (main.js, scriviPannello)
export function vetro(g, W, H, accesa, attiva) {
  const B = 22, r = 26;
  g.clearRect(0, 0, W, H);
  g.beginPath(); g.roundRect(B, B, W - 2 * B, H - 2 * B, r);
  g.fillStyle = accesa ? "rgba(12,16,24,0.62)" : "rgba(12,16,24,0.30)"; g.fill();
  if (!accesa) { g.lineWidth = 2; g.strokeStyle = "rgba(154,163,178,0.35)"; g.stroke(); return; }
  const led = g.createLinearGradient(B, B, W - B, H - B);
  led.addColorStop(0, "#ffb020"); led.addColorStop(0.5, "#b36bff"); led.addColorStop(1, "#3fd0e8");
  g.save();
  g.shadowColor = "rgba(179,107,255,0.95)"; g.shadowBlur = attiva ? 30 : 20; g.lineWidth = attiva ? 6 : 4.5; g.strokeStyle = led; g.stroke();
  g.shadowColor = "rgba(63,208,232,0.8)"; g.shadowBlur = 9; g.lineWidth = 2.2; g.strokeStyle = led; g.stroke();
  g.shadowBlur = 0; g.lineWidth = 1; g.strokeStyle = "rgba(255,255,255,0.55)"; g.stroke();
  g.restore();
}
export function testata(g, numero, nome, sotto, accesa) {
  g.textBaseline = "alphabetic"; g.textAlign = "left";
  if ("letterSpacing" in g) g.letterSpacing = "4px";
  g.fillStyle = accesa ? CIANO : GRIGIO; g.font = "600 30px " + CARATTERE;
  g.fillText(numero + "  ·  " + nome, 64, 92);
  if ("letterSpacing" in g) g.letterSpacing = "1px";
  g.fillStyle = accesa ? GRIGIO : "rgba(154,163,178,0.6)"; g.font = "400 26px " + CARATTERE;
  if (sotto) g.fillText(sotto, 64, 130);
  if ("letterSpacing" in g) g.letterSpacing = "0px";
  g.fillStyle = "rgba(154,163,178,0.30)"; g.fillRect(64, 150, SCHEDA.W - 128, 2);
}
export function aCapo(g, testo, x, y, largo, passo, righeMax) {
  const parole = String(testo).split(/\s+/); let riga = "", n = 0;
  for (const p of parole) {
    const prova = riga ? riga + " " + p : p;
    if (g.measureText(prova).width > largo && riga) {
      if (n === righeMax - 1) { g.fillText(riga + " …", x, y + n * passo); return n + 1; }
      g.fillText(riga, x, y + n * passo); n++; riga = p;
    } else riga = prova;
  }
  if (riga) { g.fillText(riga, x, y + n * passo); n++; }
  return n;
}
function righe(g, lista, y0, passo = 52) {
  g.font = "400 30px " + CARATTERE;
  lista.slice(0, 6).forEach((r, i) => {
    const y = y0 + i * passo;
    g.textAlign = "left"; g.fillStyle = GRIGIO; g.fillText(String(r.k).replace(/\.+$/, ""), 64, y);
    g.textAlign = "right"; g.fillStyle = TONO[r.tono] || TESTO; g.font = "500 30px " + CARATTERE;
    g.fillText(String(r.v), SCHEDA.W - 64, y); g.font = "400 30px " + CARATTERE;
  });
  g.textAlign = "left";
  return y0 + Math.min(6, lista.length) * passo;
}

export async function preparaLettura({ world, BASE, modello, plastico, RayInteractable, DistanceGrabbable, MovementMode }) {
  const vuota = { posa() {}, avvia() {}, aggiorna() {}, visibile() {}, velocita: () => 1, stato: { pacchetto: false }, agenti: [] };
  let K;
  try {
    const r = await fetch(BASE + "pacchetto.json");
    if (!r.ok) throw new Error("HTTP " + r.status);
    K = await r.json();
  } catch (e) { console.warn("[EIDETICA visore] nessun pacchetto del progetto (" + e.message + "): solo il plastico"); return vuota; }
  const S = { pacchetto: true, da: null, fase: "attesa", schedeAccese: 0, tempoSim: null, inVista: 0, oggetto: null, fermata: null,
    velocita: VELOCITA_URL, ts: null, ultimo: null, nascosto: null, corpi: false };
  const salta = parseFloat(new URLSearchParams(location.search).get("salta")) || 0;   // per le prove: ?salta=<secondi>

  // IL SISTEMA DEI METRI DELLA PAGINA dentro il plastico: la matrice del modello, rovesciata.
  // Il plastico e' il file stesso (unito per materiale, stesse coordinate): tutto cio' che
  // e' in metri della pagina (persone, oggetti, telecamere dell'occhio) ci si appoggia sopra.
  const metri = new THREE.Group();
  metri.name = "eidetica-metri-della-pagina";
  metri.matrixAutoUpdate = false;
  metri.matrix.fromArray(K.modello.matrice).invert();
  modello.add(metri);

  // ---------- LE PERSONE: scie e personcine ----------
  const cammino = new URLSearchParams(location.search).get("cammino");
  const P = (cammino === "piano" && K.personePiano) || K.persone, tempi = P.tempi, durata = P.durata || tempi[tempi.length - 1];
  S.cammino = P === K.persone ? "finale" : "piano";
  const agenti = P.agenti.map((a) => {
    const [hex, etichetta] = PROFILI[a.profilo] || SENZA_PROFILO;
    return { ...a, colore: new THREE.Color(hex), hex, etichetta, n: a.st.length };
  });
  // v20: per il cartellino di chi si sceglie: metri gia' fatti, fine del tratto in corso, passo medio
  for (const a of agenti) {
    a.cum = new Float32Array(a.n); a.fineTratto = new Int32Array(a.n);
    let cam = 0, t = 0;
    for (let j = 1; j < a.n; j++) {
      const d = Math.hypot(a.xyz[3 * j] - a.xyz[3 * j - 3], a.xyz[3 * j + 2] - a.xyz[3 * j - 1]) / 100;
      a.cum[j] = a.cum[j - 1] + (d > 4 ? 0 : d);
      if (a.st[j] === "M" && d <= 4) { cam += d; t += (tempi[a.k0 + j] - tempi[a.k0 + j - 1]) || 0.5; }
    }
    a.passo = t ? cam / t : 0;
    a.fineTratto[a.n - 1] = a.n - 1;
    for (let j = a.n - 2; j >= 0; j--) {
      const d = Math.hypot(a.xyz[3 * j + 3] - a.xyz[3 * j], a.xyz[3 * j + 5] - a.xyz[3 * j + 2]) / 100;
      a.fineTratto[j] = d > 4 ? j : a.fineTratto[j + 1];   // un salto (rimpiazzo): il tratto finisce qui
    }
    a.ora = null; a.ang = null; a.fase = Math.random();
  }
  // v20: SEDUTO SOLO DOVE L'OCCHIO HA VISTO UNA SEDUTA. Misurato nel pacchetto: l'86% dei fotogrammi
  // «seduto» del cervello cade a piu' di 1 m da ogni seduta riconosciuta: coi corpi veri si sedevano
  // nel vuoto. Nel dubbio vince l'occhio (§0.4): li' la persona aspetta in piedi. (Difetto del cervello, §13.7.)
  {
    const sedi = [];
    for (const n of ((K.regia && K.regia.nomi) || [])) if (n.postura === "seduto" && n.copie) for (const c of n.copie) if (c) sedi.push(c);
    let s = 0, su = 0;
    for (const a of agenti) {
      a.seduta = new Uint8Array(a.n);
      for (let j = 0; j < a.n; j++) {
        if (a.st[j] !== "S") continue;
        s++;
        const x = a.xyz[3 * j] / 100, y = a.xyz[3 * j + 1] / 100, z = a.xyz[3 * j + 2] / 100;
        if (sedi.some((c) => Math.hypot(c[0] - x, c[2] - z) < 1.0 && Math.abs(c[1] - y) < 2)) { a.seduta[j] = 1; su++; }
      }
    }
    S.sedutiSuSeduta = su; S.sedutiNelVuoto = s - su;
    console.log("[EIDETICA visore] seduti: " + su + " fotogrammi su una seduta vista dall'occhio, " + (s - su) + " nel vuoto (mostrati in attesa, in piedi)");
  }
  {
    const pos = [], tt = [], col = [], lato = [], ind = [];
    for (const a of agenti) {
      let corsa = [];
      const chiudi = () => {
        if (corsa.length >= 2) {
          const base = pos.length / 3;
          corsa.forEach((q, i) => {
            const pr = corsa[Math.max(0, i - 1)], ds = corsa[Math.min(corsa.length - 1, i + 1)];
            let tx = ds[0] - pr[0], tz = ds[2] - pr[2]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
            const nx = -tz * LARGO_SCIA / 2, nz = tx * LARGO_SCIA / 2;
            pos.push(q[0] + nx, q[1] + SOPRA_SCIA, q[2] + nz, q[0] - nx, q[1] + SOPRA_SCIA, q[2] - nz);
            tt.push(q[3], q[3]); lato.push(1, -1);
            col.push(a.colore.r, a.colore.g, a.colore.b, a.colore.r, a.colore.g, a.colore.b);
            if (i < corsa.length - 1) { const v = base + 2 * i; ind.push(v, v + 2, v + 1, v + 1, v + 2, v + 3); }
          });
        }
        corsa = [];
      };
      for (let i = 0; i < a.n; i++) {
        const q = [a.xyz[3 * i] / 100, a.xyz[3 * i + 1] / 100, a.xyz[3 * i + 2] / 100, tempi[a.k0 + i]];
        const prima = corsa[corsa.length - 1];
        if (prima && Math.hypot(q[0] - prima[0], q[2] - prima[2]) > 4) chiudi();   // un salto (rimpiazzo): la scia si spezza
        if (!prima || Math.hypot(q[0] - prima[0], q[1] - prima[1], q[2] - prima[2]) > 0.05 || i === a.n - 1) corsa.push(q);
      }
      chiudi();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aT", new THREE.Float32BufferAttribute(tt, 1));
    g.setAttribute("aColore", new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute("aLato", new THREE.Float32BufferAttribute(lato, 1));
    g.setIndex(ind);
    g.computeBoundingSphere();
    S.scieVertici = pos.length / 3;
    var materialeScia = new THREE.ShaderMaterial({
      uniforms: { uT: { value: -1 }, uCoda: { value: CODA }, uFondo: { value: FONDO } },
      vertexShader: `attribute float aT; attribute vec3 aColore; attribute float aLato; uniform float uT; uniform float uCoda; uniform float uFondo;
        varying float vA; varying vec3 vC; varying float vL;
        void main() { float d = uT - aT; vA = d < 0.0 ? -1.0 : max(uFondo, 1.0 - d / uCoda); vC = aColore; vL = aLato;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying float vA; varying vec3 vC; varying float vL;
        void main() { if (vA <= 0.0) discard; float bordo = 1.0 - abs(vL);
          // v19 (foto nell'emulatore): piu' tenue, se no dove le scie si sommano diventa tutto bianco e il profilo si perde
          gl_FragColor = vec4(vC * (0.35 + 0.65 * vA), vA * 0.8 * smoothstep(0.0, 0.7, bordo));
          #include <colorspace_fragment>
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,   // v20: a terra, senza sfarfallare col pavimento
    });
    var scie = new THREE.Mesh(g, materialeScia);
    scie.name = "eidetica-scie"; scie.renderOrder = 4; scie.castShadow = false; scie.receiveShadow = false;
    metri.add(scie);
  }
  // le personcine: una capsula di luce per persona, alta come un uomo (1,80, il righello)
  const geoPersona = new THREE.CapsuleGeometry(0.42, 0.96, 3, 10);   // un po' piu' larga del vero: sul plastico e' alta 1 cm
  geoPersona.translate(0, 0.9, 0);
  const persone = new THREE.InstancedMesh(geoPersona, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }), agenti.length);
  persone.name = "eidetica-persone"; persone.frustumCulled = false; persone.castShadow = false;
  const zero = new THREE.Matrix4().makeScale(0, 0, 0), m4 = new THREE.Matrix4();
  agenti.forEach((a, i) => { persone.setColorAt(i, a.colore); persone.setMatrixAt(i, zero); });
  persone.instanceColor.needsUpdate = true;
  metri.add(persone);
  // v20: I CORPI VERI (src/corpi.js). Se il file non arriva si resta alle capsule: peggio, ma non vuoto.
  let corpi = null;
  try {
    corpi = await preparaCorpi({ BASE, quanti: agenti.length, altezza: (K.scala && K.scala.uomo) || 1.8 });
    agenti.forEach((a, i) => corpi.colora(i, a.colore));
    metri.add(corpi.mesh);
    persone.visible = false; S.corpi = true;
  } catch (e) { console.warn("[EIDETICA visore] corpi veri non caricati (" + e.message + "): restano le capsule"); }

  // ---------- L'OCCHIO SUL PLASTICO: luce sulle copie, telecamera di luce, nome ----------
  const R = K.regia || { fermate: [], nomi: [] };
  const maxCopie = Math.max(1, ...R.nomi.map((n) => (n.copie || []).length));
  const luci = new THREE.InstancedMesh(new THREE.SphereGeometry(0.55, 10, 8),
    new THREE.MeshBasicMaterial({ color: OGGETTI, transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false }), maxCopie);
  luci.name = "eidetica-luci-copie"; luci.frustumCulled = false; luci.count = 0; luci.renderOrder = 5;
  metri.add(luci);
  // la telecamera di luce (13-d): una piramide verde che vola da una fermata all'altra, col filo fino all'oggetto
  const occhio = new THREE.Group();
  const piramide = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.6, 4, 1, true),
    new THREE.MeshBasicMaterial({ color: OGGETTI, wireframe: true, transparent: true, opacity: 0.95, toneMapped: false }));
  piramide.rotation.x = Math.PI / 2;                 // la punta indietro, la bocca avanti (-z)
  piramide.position.z = -0.8;
  occhio.add(piramide);
  occhio.visible = false;
  metri.add(occhio);
  const filoGeo = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
  const filo = new THREE.Line(filoGeo, new THREE.LineBasicMaterial({ color: OGGETTI, transparent: true, opacity: 0.6, toneMapped: false }));
  filo.frustumCulled = false; filo.visible = false;
  metri.add(filo);
  // il nome sopra l'oggetto: un cartellino in metri VERI (non scala col plastico), girato verso chi guarda
  const telaN = document.createElement("canvas"); telaN.width = 640; telaN.height = 120;
  const gN = telaN.getContext("2d"), tramaN = new THREE.CanvasTexture(telaN); tramaN.colorSpace = THREE.SRGBColorSpace;
  const cartellino = new THREE.Mesh(new THREE.PlaneGeometry(0.085, 0.085 * 120 / 640),
    new THREE.MeshBasicMaterial({ map: tramaN, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  cartellino.renderOrder = 20; cartellino.visible = false; cartellino.name = "eidetica-cartellino-occhio";
  world.scene.add(cartellino);
  function scriviCartellino(testo) {
    gN.clearRect(0, 0, 640, 120);
    gN.beginPath(); gN.roundRect(6, 6, 628, 108, 54); gN.fillStyle = "rgba(10,14,20,0.78)"; gN.fill();
    gN.lineWidth = 3; gN.strokeStyle = OGGETTI; gN.stroke();
    gN.fillStyle = TESTO; gN.font = "600 52px " + CARATTERE; gN.textAlign = "center"; gN.textBaseline = "middle";
    if ("letterSpacing" in gN) gN.letterSpacing = "3px";
    gN.fillText(String(testo).toUpperCase().slice(0, 22), 320, 64);
    tramaN.needsUpdate = true;
  }

  // la riproduzione dell'occhio: tempi registrati -> la finestra 9-49 s
  const tPrimo = R.fermate.length ? R.fermate[0].t : 0;
  const tUltimo = Math.max(tPrimo + 1, ...R.fermate.map((f) => f.t), ...R.nomi.map((n) => n.t));
  const mappa = (t) => T.oggetti + (T.oggettiFine - T.oggetti) * (t - tPrimo) / (tUltimo - tPrimo);
  const fermate = R.fermate.map((f) => ({ ...f, quando: mappa(f.t) }));
  const nomi = R.nomi.map((n) => ({ ...n, quando: mappa(n.t), testo: ragionamentoEN(n) }));
  const immagini = new Map();                          // indice -> Image (si carica quando serve)
  const immagine = (i) => {
    if (immagini.has(i)) return immagini.get(i);
    const f = fermate.find((x) => x.indice === i && x.immagine);
    const im = f ? Object.assign(new Image(), { src: f.immagine }) : null;
    if (im) im.onload = () => { S.ridisegna = true; };
    immagini.set(i, im); return im;
  };

  // ---------- LE SCHEDE DELL'OCCHIO ----------
  const V = (K.velo && K.velo.report) || {};
  const schede = [];
  function nuovaScheda(numero, nome, quando, disegna) {
    const tela = document.createElement("canvas"); tela.width = SCHEDA.W; tela.height = SCHEDA.H;
    const g = tela.getContext("2d"), trama = new THREE.CanvasTexture(tela);
    trama.colorSpace = THREE.SRGBColorSpace; trama.anisotropy = 4;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(SCHEDA.largo, SCHEDA.alto),
      new THREE.MeshBasicMaterial({ map: trama, transparent: true, toneMapped: false, depthWrite: false, side: THREE.DoubleSide }));
    mesh.name = "eidetica-scheda-" + nome.toLowerCase(); mesh.renderOrder = 11;
    const ente = world.createTransformEntity(mesh);
    ente.addComponent(RayInteractable);
    // rotate: false — in mano la scheda non si storce con il polso: la gira il battito, sempre verso chi guarda
    ente.addComponent(DistanceGrabbable, { movementMode: MovementMode.MoveTowardsTarget, scale: false, rotate: false,
      targetPositionOffset: [0, 0.02, -0.16], moveSpeedFactor: 0.18 });
    const s = { numero, nome, quando, disegna, g, trama, mesh, ente, accesa: false, da: 0 };
    s.scrivi = (attiva) => { vetro(g, SCHEDA.W, SCHEDA.H, s.accesa, attiva); disegna(g, s.accesa, attiva); trama.needsUpdate = true; };
    s.scrivi(false);
    schede.push(s);
    return s;
  }
  const sc = K.scala;
  nuovaScheda("01", "SCALE", T.scala, (g, accesa) => {
    testata(g, "01", "SCALE", accesa ? "The human ruler: first the scale, then everything else" : "Waiting for the eye…", accesa);
    if (!accesa) return;
    g.fillStyle = sc ? VERDE : AMBRA; g.font = "300 110px " + CARATTERE;
    g.fillText(sc ? "× " + sc.fattore.toFixed(2) : "—", 64, 290);
    g.fillStyle = GRIGIO; g.font = "400 30px " + CARATTERE;
    g.fillText(sc ? "measured on the people drawn in the model" : "no figures to measure the scale", 64, 340);
    if (sc) righe(g, [{ k: "Standing figures in the model", v: sc.figure }, { k: "Their height in the file", v: sc.alteNelFile.toFixed(2) + " m" },
      { k: "Scaled to a person of", v: sc.uomo.toFixed(2) + " m", tono: "ok" }], 420);
  });
  const sceltaVelo = (chiave, numero, nome, quando) => nuovaScheda(numero, nome, quando, (g, accesa) => {
    const rep = V[chiave] && V[chiave].report;
    testata(g, numero, nome, accesa ? (rep ? String(rep.comando || "").replace(/^\$\s*/, "").replace(/\.+$/, "") : "") : "Waiting for the eye…", accesa);
    if (!accesa || !rep) { if (accesa) { g.fillStyle = GRIGIO; g.font = "400 30px " + CARATTERE; g.fillText("Not recorded in this project", 64, 220); } return; }
    let y = righe(g, (rep.righe || []).filter((r) => r.v && r.v !== "--" && !/^Eye$/.test(r.k)), 210);
    if (rep.barra != null) { g.fillStyle = "rgba(154,163,178,0.25)"; g.fillRect(64, y - 18, SCHEDA.W - 128, 8); g.fillStyle = CIANO; g.fillRect(64, y - 18, (SCHEDA.W - 128) * rep.barra, 8); y += 22; }
    g.font = "400 26px " + CARATTERE;
    for (const n of (rep.note || []).slice(0, 2)) { g.fillStyle = TONO[n.tono] || GRIGIO; y += 34 * aCapo(g, n.t, 64, y, SCHEDA.W - 128, 34, 2); }
  });
  sceltaVelo("zone", "02", "ZONES", T.zone);
  const schedaOggetti = nuovaScheda("03", "OBJECTS", T.oggetti, (g, accesa, attiva) => {
    const o = S.oggetto, f = S.fermata, fatti = nomi.filter((n) => n.quando <= S.tau);
    testata(g, "03", "OBJECTS", accesa ? (attiva ? "The eye goes to the objects, one per type" : "Every type looked at, up close") : "Waiting for the eye…", accesa);
    if (!accesa) return;
    const lato = 300, x0 = 64, y0 = 184;
    const im = o ? immagine(o.indice) : f ? immagine(f.indice) : null;
    g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(x0, y0, lato, lato);
    if (im && im.complete && im.naturalWidth) g.drawImage(im, x0, y0, lato, lato);
    g.lineWidth = 2; g.strokeStyle = o ? OGGETTI : "rgba(154,163,178,0.5)"; g.strokeRect(x0, y0, lato, lato);
    const x1 = x0 + lato + 36, largo = SCHEDA.W - 64 - x1;
    g.fillStyle = GRIGIO; g.font = "400 26px " + CARATTERE;
    g.fillText("Stop " + Math.min(f ? f.indice + 1 : 0, f ? f.quante : 0) + " / " + (f ? f.quante : fermate.length), x1, y0 + 26);
    g.fillStyle = o && o.nome ? TESTO : GRIGIO; g.font = "600 44px " + CARATTERE;
    aCapo(g, o ? (o.nome ? pulito(o.termine || o.nome).toUpperCase() : "NOT RECOGNISED") : "LOOKING…", x1, y0 + 84, largo, 48, 2);
    g.fillStyle = "#c8ced8"; g.font = "400 27px " + CARATTERE;
    if (o) aCapo(g, o.testo, x1, y0 + 178, largo, 34, 4);
    const sedute = fatti.filter((n) => n.postura === "seduto").reduce((s, n) => s + (n.copie ? n.copie.length : 0), 0);
    const nominati = fatti.filter((n) => n.nome).length;
    g.font = "400 26px " + CARATTERE; g.fillStyle = GRIGIO;
    g.fillText("Types named", x0, 548); g.fillText("Seats", x0 + 420, 548);
    g.font = "500 34px " + CARATTERE; g.fillStyle = nominati ? VERDE : TESTO;
    g.fillText(nominati + " / " + (nomi.length || fermate.length), x0, 592);
    g.fillStyle = sedute ? VERDE : TESTO; g.fillText(String(sedute), x0 + 420, 592);
    g.fillStyle = "rgba(154,163,178,0.25)"; g.fillRect(x0, 618, SCHEDA.W - 128, 6);
    g.fillStyle = OGGETTI; g.fillRect(x0, 618, (SCHEDA.W - 128) * Math.min(1, fatti.length / Math.max(1, nomi.length)), 6);
  });
  sceltaVelo("conformita", "04", "COMPLIANCE", T.conformita);
  sceltaVelo("orientamento", "05", "WAYFINDING", T.orientamento);
  const contaProfili = {};
  for (const a of agenti) contaProfili[a.etichetta] = (contaProfili[a.etichetta] || { n: 0, hex: a.hex }), contaProfili[a.etichetta].n++;
  const schedaPersone = nuovaScheda("06", "PEOPLE", T.persone, (g, accesa) => {
    testata(g, "06", "PEOPLE", accesa ? "They move by what the eye understood" : "Waiting for the eye…", accesa);
    if (!accesa) return;
    g.fillStyle = TESTO; g.font = "300 96px " + CARATTERE; g.fillText(String(agenti.length), 64, 272);
    const w = g.measureText(String(agenti.length)).width;
    g.fillStyle = GRIGIO; g.font = "400 30px " + CARATTERE; g.fillText("people · " + Math.round(durata / 60) + " min of walking, " + (S.velocita === 1 ? "real speed" : "at ×" + S.velocita), 64 + w + 18, 272);
    const c = S.conta || {};
    g.font = "400 28px " + CARATTERE;
    [["Walking", c.M], ["Waiting", c.W], ["Seated", c.S]].forEach(([k, v], i) => {
      g.fillStyle = GRIGIO; g.fillText(k, 64 + i * 300, 330); g.fillStyle = TESTO; g.font = "500 34px " + CARATTERE;
      g.fillText(v == null ? "—" : String(v), 64 + i * 300, 372); g.font = "400 28px " + CARATTERE;
    });
    Object.entries(contaProfili).sort((a, b) => b[1].n - a[1].n).slice(0, 8).forEach(([nome, d], i) => {
      const x = 64 + (i % 2) * 460, y = 440 + Math.floor(i / 2) * 50;
      g.fillStyle = d.hex; g.fillRect(x, y - 22, 36, 10);
      g.fillStyle = TESTO; g.font = "400 28px " + CARATTERE; g.fillText(nome + "  " + d.n, x + 52, y - 8);
    });
  });

  // i posti delle schede: attorno agli occhi, a sinistra del plastico, girate verso chi siede
  const occhiMondo = new THREE.Vector3();
  function posa(punto, occhi) {
    occhiMondo.set(punto.x, occhi, punto.z + 0.45);
    schede.forEach((s, i) => {
      const [gradi, sotto] = POSTI[i], a = gradi * Math.PI / 180;
      s.mesh.position.set(occhiMondo.x - Math.sin(a) * SCHEDA.distanza, occhi - sotto, occhiMondo.z - Math.cos(a) * SCHEDA.distanza);
      s.mesh.lookAt(occhiMondo);
    });
  }
  function avvia(adesso) {
    S.da = adesso + 4000 - salta * 1000;   // dopo l'apertura del marchio (3,8 s)
    for (const s of schede) { s.accesa = false; s.scrivi(false); s.mesh.material.opacity = 1; s.mesh.scale.setScalar(1); }
    S.schedeAccese = 0; S.oggetto = null; S.fermata = null; S.k = 0; S.ts = null;
    console.log("[EIDETICA visore] la lettura dell'occhio riparte: " + fermate.length + " fermate, " + nomi.length + " nomi, " + agenti.length + " persone");
  }

  // ---------- IL BATTITO ----------
  const testa = new THREE.Vector3(), v3 = new THREE.Vector3(), q4 = new THREE.Quaternion(), s3 = new THREE.Vector3();
  let ultimaScritta = 0, nomeCartellino = null;
  const giro = (x) => Math.atan2(Math.sin(x), Math.cos(x));
  function aggiorna(adesso) {
    const dt = S.ultimo == null ? 0 : Math.min(0.1, Math.max(0, (adesso - S.ultimo) / 1000));
    S.ultimo = adesso;
    if (S.da == null) return;
    const tau = S.tau = (adesso - S.da) / 1000;
    // le schede si accendono quando arriva il loro momento
    world.camera.getWorldPosition(testa);
    for (const s of schede) {
      s.mesh.lookAt(testa);   // ovunque la si porti, la scheda si legge
      if (!s.accesa && tau >= s.quando) { s.accesa = true; s.da = adesso; S.schedeAccese++; s.scrivi(true); }
      if (s.accesa) {   // l'accensione: cresce e si fa piena in 0,6 s
        const k = liscio((adesso - s.da) / 600);
        s.mesh.scale.setScalar(0.94 + 0.06 * k);
      }
    }
    // l'occhio: la fermata corrente e l'ultimo oggetto nominato
    let f = null, o = null;
    for (const x of fermate) if (x.quando <= tau) f = x; else break;
    for (const x of nomi) if (x.quando <= tau) o = x; else break;
    const inOggetti = tau >= T.oggetti && tau < T.oggettiFine + 2;
    if (f !== S.fermata || o !== S.oggetto || S.ridisegna || inOggetti !== S.eraInOggetti) {
      S.fermata = f; S.oggetto = o; S.ridisegna = false; S.eraInOggetti = inOggetti;
      schedaOggetti.scrivi(inOggetti);
      // la luce sulle copie dell'ultimo nominato
      const copie = (o && o.nome && o.copie) || [];
      copie.forEach((c, i) => { if (c) { m4.makeTranslation(c[0], c[1] + 0.4, c[2]); luci.setMatrixAt(i, m4); } });
      luci.count = copie.length; luci.instanceMatrix.needsUpdate = true;
      if (o && o.nome && inOggetti) {
        if (nomeCartellino !== o) { scriviCartellino(pulito(o.termine || o.nome)); nomeCartellino = o; }
      }
    }
    luci.visible = inOggetti && luci.count > 0;
    luci.material.opacity = 0.55 + 0.4 * Math.sin(adesso / 180);
    // la telecamera di luce e il suo filo, sulla fermata corrente
    occhio.visible = filo.visible = inOggetti && !!(f && f.camera && f.camera.mondo && f.centro) && metri.visible;
    if (occhio.visible) {   // la posa della telecamera dell'occhio a quella fermata (istantaneaDellaCamera: matrixWorld)
      m4.fromArray(f.camera.mondo).decompose(v3, q4, s3);
      occhio.position.lerp(v3, 0.15); occhio.quaternion.slerp(q4, 0.15);
      const a = filoGeo.attributes.position;
      a.setXYZ(0, occhio.position.x, occhio.position.y, occhio.position.z); a.setXYZ(1, f.centro[0], f.centro[1], f.centro[2]); a.needsUpdate = true;
    }
    // il nome sopra l'oggetto, in metri veri, girato verso chi guarda
    cartellino.visible = inOggetti && !!(o && o.nome && o.max && o.min) && metri.visible;
    if (cartellino.visible) {
      v3.set((o.min[0] + o.max[0]) / 2, o.max[1] + 2.5, (o.min[2] + o.max[2]) / 2);
      metri.updateMatrixWorld(); metri.localToWorld(v3);
      cartellino.position.copy(v3).y += 0.025;
      cartellino.lookAt(testa);
    }
    // le persone: dopo la lettura, alla velocita' scelta (di serie quella vera), in giro continuo.
    // v20: il tempo della simulazione si somma fotogramma per fotogramma, cosi' il pulsante SPEED
    // cambia il passo senza far saltare nessuno
    if (tau < T.persone) { materialeScia.uniforms.uT.value = -1; S.tempoSim = null; S.ts = null; S.inVista = 0; return; }
    S.ts = S.ts == null ? ((tau - T.persone) * S.velocita) % durata : (S.ts + dt * S.velocita) % durata;
    const ts = S.ts;
    S.tempoSim = +ts.toFixed(1);
    materialeScia.uniforms.uT.value = ts;
    if (S.k == null || S.k >= tempi.length || tempi[S.k] > ts) S.k = 0;
    while (S.k + 1 < tempi.length && tempi[S.k + 1] <= ts) S.k++;
    const k = S.k, u = k + 1 < tempi.length ? (ts - tempi[k]) / ((tempi[k + 1] - tempi[k]) || 1) : 0;
    S.u = u;
    const conta = { M: 0, W: 0, S: 0, A: 0, I: 0 };
    let inVista = 0;
    agenti.forEach((a, i) => {
      const j = k - a.k0;
      if (j < 0 || j >= a.n - 1) { a.ora = null; if (corpi) corpi.nascondi(i); else persone.setMatrixAt(i, zero); return; }
      const X = a.xyz, x = (X[3 * j] + (X[3 * j + 3] - X[3 * j]) * u) / 100, y = (X[3 * j + 1] + (X[3 * j + 4] - X[3 * j + 1]) * u) / 100,
        z = (X[3 * j + 2] + (X[3 * j + 5] - X[3 * j + 2]) * u) / 100;
      // v20: verso dove va (un secondo avanti), girando con calma; un salto (rimpiazzo) gira subito
      const j2 = Math.min(a.n - 1, j + 2), dx = X[3 * j2] - X[3 * j], dz = X[3 * j2 + 2] - X[3 * j + 2];
      const salto = a.ora ? Math.hypot(x - a.ora.x, z - a.ora.z) : 0;
      if (Math.hypot(dx, dz) > 15) {
        const voluto = Math.atan2(dx, dz);
        a.ang = a.ang == null || salto > 3 ? voluto : a.ang + giro(voluto - a.ang) * Math.min(1, dt * 4 * Math.max(1, S.velocita));
      }
      const passo = Math.hypot(X[3 * j + 3] - X[3 * j], X[3 * j + 5] - X[3 * j + 2]) / 100 / ((tempi[k + 1] - tempi[k]) || 0.5);
      const st = a.st[j] === "S" && !a.seduta[j] ? "W" : a.st[j], gesto = st === "S" ? SEDUTO : st === "W" || passo < 0.2 ? FERMO : CAMMINA;
      // il passo dei piedi segue i metri fatti davvero: x2 e x4 camminano piu' svelti, non scivolano
      if (gesto === CAMMINA) a.fase += (salto < 3 ? salto : 0) / PASSO_CICLO;
      else if (corpi) a.fase += dt * S.velocita / corpi.clips[gesto].durata;
      a.ora = { x, y, z, j, st, passo, gesto, ang: a.ang || 0 };
      if (corpi) { if (S.nascosto === i) corpi.nascondi(i); else corpi.posa(i, x, y, z, a.ang || 0, gesto, a.fase); }
      else { m4.makeTranslation(x, y, z); persone.setMatrixAt(i, m4); }
      inVista++;
      conta[st] = (conta[st] || 0) + 1;
    });
    if (corpi) corpi.fine(); else persone.instanceMatrix.needsUpdate = true;
    S.inVista = inVista;
    if (adesso - ultimaScritta > 1000) { ultimaScritta = adesso; S.conta = conta; schedaPersone.scrivi(false); }
  }
  function visibile(si) {
    metri.visible = si;
    for (const s of schede) s.mesh.visible = si;
    if (!si) cartellino.visible = false;
  }
  console.log("[EIDETICA visore] pacchetto del progetto: " + agenti.length + " persone, " + tempi.length + " fotogrammi (" + Math.round(durata) + " s), "
    + fermate.length + " fermate dell'occhio, " + nomi.filter((n) => n.nome).length + "/" + nomi.length + " tipi nominati, scie " + S.scieVertici + " vertici");
  S.schede = schede.length;
  // v20: il pulsante SPEED (main.js) e chi sceglie una persona (src/persona.js) leggono e muovono da qui
  function velocita(v) {
    if (v && v !== S.velocita) { S.velocita = v; schedaPersone.scrivi(false); console.log("[EIDETICA visore] velocita' x" + v); }
    return S.velocita;
  }
  return { posa, avvia, aggiorna, visibile, velocita, stato: S, agenti, tempi, durata, metri, nomi, corpi, T, scala: K.scala };
}
