// ============================================================================
// LA SELEZIONE DI UNA PERSONA — passo 3 del piano (29/09/2026)
// Raffaella: «Clic sull'agente → gli altri diventano piu' trasparenti →
// compare il suo cartellino nello stile gia' definito». E dalla tavola: «la
// selezione deve essere immediatamente riconoscibile senza distruggere la
// scena»; «mostrare soltanto cio' che aiuta a capire l'agente».
//
// COSA FA, e niente di piu':
//   - un clic (non un trascinamento: quello gira la vista) vicino a una
//     figura la sceglie. Si sceglie SULLO SCHERMO: la figura la cui testa
//     cade piu' vicina al clic, entro 40 px — una persona alta 60 px non si
//     deve centrare al pixel;
//   - gli altri corpi scendono al 22% (restano presenti, diventano secondari);
//   - un anello di luce sotto i piedi della persona scelta;
//   - il cartellino, con il filo che scende sulla persona (lo stile dei
//     cartellini del velo): PERSONA, profilo, meta; velocita', altezza occhi,
//     larghezza. Ogni dato viene da window.__veritasSchedaAgente: dove manca,
//     la riga non si scrive.
//   - clic nel vuoto o Esc: tutto torna com'era.
//
// ⚠️ SOLO IN ESPERIENZA (veritas_modo.js). In Analisi il clic sulla scena ha
//    gia' dei padroni (lo Zone editor posa punti): non si ruba.
// Col passo 4 disegna anche la traiettoria della persona scelta (sotto).
// Col passo 5 porta la telecamera negli occhi della persona scelta (in fondo).
// ⚠️ NON TOCCA la simulazione: l'attenuazione cambia l'opacita' dei materiali
//    dei corpi (ogni corpo ha i suoi, clonati da vestiUna) e la rimette.
//
//   window.eideticaSelezione.scegli(id) / .lascia() / .scelto()
//                          .occhi() / .esciDagliOcchi() / .negliOcchi()
// ============================================================================

const TINTA = "#2EE6D6";          // la tinta «accesa» della piattaforma (velo, interruttore)
const ATTENUATI = 0.22;
const RAGGIO_PX = 40;

const TESTI = {
  it: { persona: "PERSONA", velocita: "Velocità", occhi: "Altezza occhi", larghezza: "Larghezza",
        neiSuoiOcchi: "Con i suoi occhi", torna: "torna al plastico",
        profili: { business: "Viaggio di lavoro", family: "Famiglia", elderly: "Anziano", senior: "Anziano",
                   wheelchair: "In carrozzina", tourist: "Turista", student: "Studente", crew: "Personale", vip: "VIP" } },
  en: { persona: "PERSON", velocita: "Speed", occhi: "Eye height", larghezza: "Width",
        neiSuoiOcchi: "Through their eyes", torna: "back to the model",
        profili: { business: "Business traveller", family: "Family", elderly: "Senior", senior: "Senior",
                   wheelchair: "Wheelchair user", tourist: "Tourist", student: "Student", crew: "Crew", vip: "VIP" } },
};
function lingua() {
  try { return localStorage.getItem("veritasLang") === "it" ? "it" : "en"; } catch (e) { return "en"; }
}
const num = (x, d) => x.toFixed(d).replace(".", lingua() === "it" ? "," : ".");
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const CSS = `
#eidetica-scheda{position:fixed;left:0;top:0;z-index:9500;pointer-events:none;color:${TINTA};
  opacity:0;transition:opacity .35s ease}
#eidetica-scheda.su{opacity:1}
#eidetica-scheda .es-pt{position:absolute;left:-4px;width:8px;height:8px;border-radius:50%;background:currentColor;
  box-shadow:0 0 10px currentColor}
#eidetica-scheda .es-filo{position:absolute;left:0;width:1px;background:currentColor;opacity:.7}
#eidetica-scheda .es-carta{position:absolute;left:-20px;display:flex;gap:18px;align-items:flex-start;
  padding:14px 18px;border-radius:12px;background:rgba(10,14,20,.82);border:1px solid rgba(46,230,214,.38);
  box-shadow:0 18px 50px rgba(0,0,0,.45);backdrop-filter:blur(14px);white-space:nowrap;
  font:13px Inter,"Segoe UI",system-ui,sans-serif;color:#D7DEE8}
#eidetica-scheda .es-segno{width:30px;height:30px;border-radius:50%;border:1px solid currentColor;color:${TINTA};
  display:flex;align-items:center;justify-content:center;flex:none}
#eidetica-scheda .es-nome{font-weight:600;letter-spacing:.08em;color:#F2F5F9;margin-bottom:5px}
#eidetica-scheda .es-riga{color:#AEB7C6;line-height:1.55}
#eidetica-scheda .es-meta{color:#D7DEE8}
#eidetica-scheda .es-dati{border-left:1px solid rgba(255,255,255,.10);padding-left:16px;display:grid;
  grid-template-columns:auto auto;column-gap:18px;row-gap:5px;font-size:12px}
#eidetica-scheda .es-dati span:nth-child(odd){color:#8A94A6}
#eidetica-scheda .es-dati span:nth-child(even){color:#F2F5F9;text-align:right;font-variant-numeric:tabular-nums}
#eidetica-scheda .es-occhi{all:unset;pointer-events:auto;cursor:pointer;display:inline-flex;align-items:center;gap:7px;
  margin-top:9px;padding:5px 11px;border-radius:7px;border:1px solid rgba(46,230,214,.45);color:${TINTA};
  font:500 12px Inter,"Segoe UI",system-ui,sans-serif;letter-spacing:.03em;transition:background .25s,color .25s}
#eidetica-scheda .es-occhi:hover{background:${TINTA};color:#0b1016}
#eidetica-occhi{position:fixed;top:62px;left:50%;transform:translate(-50%,-6px);z-index:9600;pointer-events:none;
  display:flex;align-items:center;gap:10px;padding:7px 8px 7px 14px;border-radius:10px;white-space:nowrap;
  background:rgba(10,14,20,.72);border:1px solid rgba(46,230,214,.30);box-shadow:0 10px 30px rgba(0,0,0,.35);
  backdrop-filter:blur(14px);font:12px Inter,"Segoe UI",system-ui,sans-serif;color:#AEB7C6;
  opacity:0;transition:opacity .4s ease,transform .4s ease}
#eidetica-occhi.su{opacity:1;transform:translate(-50%,0)}
#eidetica-occhi .eo-pt{width:7px;height:7px;border-radius:50%;background:${TINTA};box-shadow:0 0 8px ${TINTA}}
#eidetica-occhi .eo-nome{font-weight:600;letter-spacing:.08em;color:#F2F5F9}
#eidetica-occhi .eo-meta{color:#D7DEE8}
#eidetica-occhi button{all:unset;pointer-events:auto;cursor:pointer;margin-left:4px;padding:3px 8px;border-radius:6px;
  border:1px solid rgba(255,255,255,.14);color:#8A94A6;font-size:11px}
#eidetica-occhi button:hover{color:#D7DEE8;border-color:rgba(255,255,255,.3)}
`;

const S = { id: null, scheda: null, anello: null, attenuati: new Map(), giro: 0,
            via: null, viaDa: -1, viaQuando: 0, viaTraj: null, viaN: 0 };

function esperienza() {
  return document.documentElement.getAttribute("data-eidetica-modo") === "esperienza";
}
function gruppi() {
  const out = [];
  const m = window.__veritasPassengerGroups;
  if (m && m.forEach) m.forEach((p, id) => { const g = p && (p.group || p); if (g && g.visible !== false) out.push([id, g]); });
  return out;
}

// ─── ATTENUARE GLI ALTRI ─────────────────────────────────────────────────────
function attenua(scelto) {
  for (const [id, g] of gruppi()) {
    if (id === scelto) continue;
    g.traverse((o) => {
      if (!o.isMesh && !o.isSkinnedMesh) return;
      for (const m of [].concat(o.material)) {
        if (!m || m.visible === false) continue;           // le capsule spente del bundle restano spente
        // ⚠️ una volta sola per materiale: alcuni sono condivisi fra piu' corpi,
        //    e ricordarli due volte rimetteva l'opacita' gia' abbassata.
        if (S.attenuati.has(m)) continue;
        S.attenuati.set(m, [m.transparent, m.opacity, m.depthWrite]);
        m.transparent = true; m.opacity = ATTENUATI * (m.opacity ?? 1); m.depthWrite = false;
        m.needsUpdate = true;
      }
    });
  }
}
function rimettiOpacita() {
  for (const [m, [t, o, d]] of S.attenuati) { m.transparent = t; m.opacity = o; m.depthWrite = d; m.needsUpdate = true; }
  S.attenuati.clear();
}

// ─── L'ANELLO SOTTO I PIEDI ──────────────────────────────────────────────────
function anello(T) {
  if (S.anello) return S.anello;
  const g = new T.RingGeometry(0.55, 0.66, 48);
  g.rotateX(-Math.PI / 2);
  const m = new T.MeshBasicMaterial({ color: TINTA, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false });
  S.anello = new T.Mesh(g, m);
  S.anello.name = "eidetica-selezione-anello";
  S.anello.renderOrder = 5;
  return S.anello;
}

// ─── LA TRAIETTORIA DELLA PERSONA SCELTA — passo 4 (29/09/2026) ─────────────
// Raffaella: «Solo dell'agente selezionato, dal punto attuale alla meta». E
// dalla tavola: luminosa, sottile, elegante, tridimensionale, leggibile sul
// pavimento; «evitare un eccesso di frecce, particelle o animazioni».
//
// E' il cammino VERO: le posizioni che la simulazione ha gia' calcolato per
// questa persona, dal fotogramma in cui si trova adesso fino all'ultimo — non
// una linea dritta verso la meta, non un percorso dedotto. Dove si ferma in
// coda, la linea si ferma con lei.
//
// Due tubi sulla stessa curva: un filo di luce calda (il colore dei percorsi
// nella legenda della tavola) e un alone largo e tenue attorno, che lo fa
// leggere da lontano senza ingrossarlo. Un punto alla fine: la meta.
// Si rifa' ogni mezzo secondo, dal punto in cui la persona e' arrivata: la
// linea si accorcia mentre cammina.
const TINTA_VIA = 0xFFB020;
const VIA_OGNI_MS = 500;

// Il fotogramma in cui la persona si trova ORA: il piu' vicino alla figura,
// cercato in avanti dall'ultimo trovato (una persona puo' ripassare dallo
// stesso punto: all'indietro non si torna).
function puntoAttuale(frames, id, pos, da) {
  let meglio = -1, d2 = Infinity;
  for (let i = Math.max(0, da); i < frames.length; i++) {
    const a = frames[i].agents && frames[i].agents.find((x) => x.id === id);
    if (!a || !a.pos) continue;
    const d = (a.pos[0] - pos.x) ** 2 + (a.pos[2] - pos.z) ** 2;
    if (d < d2) { d2 = d; meglio = i; }
    else if (d2 < 0.25 && d > d2 + 4) break;       // trovata, e ci si sta allontanando
  }
  return meglio;
}

function togliVia() {
  if (!S.via) return;
  S.via.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  if (S.via.parent) S.via.parent.remove(S.via);
  S.via = null;
}

function disegnaVia(T, id, pos, piedi) {
  const traj = window.__veritasGetTrajectory && window.__veritasGetTrajectory();
  const frames = traj && traj.frames;
  if (!frames || frames.length < 2) return;
  // una traiettoria nuova (ricalcolo): si ricomincia a cercare dall'inizio
  if (traj !== S.viaTraj || frames.length !== S.viaN) { S.viaTraj = traj; S.viaN = frames.length; S.viaDa = -1; }
  const i0 = puntoAttuale(frames, id, pos, S.viaDa);
  if (i0 < 0) return;
  S.viaDa = i0;
  // la quota: i fotogrammi portano l'origine del gruppo (a mezz'aria); la
  // linea va sul pavimento, alla stessa distanza sotto a cui stanno i piedi
  const giu = piedi - pos.y + 0.06;
  // «dal punto attuale alla meta»: la linea si ferma dove la persona arriva
  // entro 6 m dalla meta della sua missione — la stessa soglia con cui la
  // pagella delle missioni dice «ci e' stata» (index.html, VICINO_M). Dopo, la
  // simulazione puo' farla ancora camminare: non e' piu' il cammino verso
  // la meta. Se non ci arriva mai, si vede tutto il cammino vero.
  const scheda = typeof window.__veritasSchedaAgente === "function" ? window.__veritasSchedaAgente(id) : null;
  const mp = scheda && scheda.metaPos;
  const punti = [new T.Vector3(pos.x, pos.y + giu, pos.z)];
  for (let i = i0 + 1; i < frames.length; i++) {
    const a = frames[i].agents && frames[i].agents.find((x) => x.id === id);
    if (!a || !a.pos) continue;
    const q = new T.Vector3(a.pos[0], a.pos[1] + giu, a.pos[2]);
    if (mp && Math.hypot(a.pos[0] - mp[0], a.pos[2] - mp[1]) < 6) { punti.push(q); break; }
    if (q.distanceToSquared(punti[punti.length - 1]) < 0.35 * 0.35) continue;   // niente zigzag da fermo
    punti.push(q);
  }
  togliVia();
  if (punti.length < 2) return;                   // arrivata: niente da disegnare
  const curva = new T.CatmullRomCurve3(punti, false, "centripetal");
  const segmenti = Math.min(1200, punti.length * 6);
  const g = new T.Group();
  g.name = "eidetica-selezione-via";
  const filo = new T.Mesh(new T.TubeGeometry(curva, segmenti, 0.045, 6, false),
    new T.MeshBasicMaterial({ color: TINTA_VIA, toneMapped: false }));
  const alone = new T.Mesh(new T.TubeGeometry(curva, segmenti, 0.2, 8, false),
    new T.MeshBasicMaterial({ color: TINTA_VIA, transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false }));
  const meta = new T.Mesh(new T.SphereGeometry(0.16, 16, 12),
    new T.MeshBasicMaterial({ color: TINTA_VIA, toneMapped: false }));
  meta.position.copy(punti[punti.length - 1]);
  const metaAlone = new T.Mesh(new T.RingGeometry(0.3, 0.42, 40).rotateX(-Math.PI / 2),
    new T.MeshBasicMaterial({ color: TINTA_VIA, transparent: true, opacity: 0.6, depthWrite: false, toneMapped: false }));
  metaAlone.position.copy(punti[punti.length - 1]);
  for (const m of [filo, alone, meta, metaAlone]) { m.renderOrder = 4; g.add(m); }
  window.__veritasScene.add(g);
  S.via = g;
}

// ─── IL CARTELLINO ───────────────────────────────────────────────────────────
function scheda(id) {
  const d = typeof window.__veritasSchedaAgente === "function" ? window.__veritasSchedaAgente(id) : null;
  const L = TESTI[lingua()];
  const profilo = d && d.archetipo ? (L.profili[d.archetipo] || d.archetipo) : null;
  const dati = [];
  if (d && d.velocita != null) dati.push([L.velocita, num(d.velocita, 1) + " m/s"]);
  if (d && d.altezzaOcchio != null) dati.push([L.occhi, num(d.altezzaOcchio, 2) + " m"]);
  if (d && d.larghezza != null) dati.push([L.larghezza, num(d.larghezza, 2) + " m"]);
  const el = S.scheda || document.body.appendChild(Object.assign(document.createElement("div"), { id: "eidetica-scheda" }));
  S.scheda = el;
  el.innerHTML = `<div class="es-pt"></div><div class="es-filo"></div>
    <div class="es-carta">
      <div class="es-segno"><svg width="14" height="16" viewBox="0 0 14 16" fill="none" stroke="currentColor" stroke-width="1.4">
        <circle cx="7" cy="3.2" r="2.2"/><path d="M3 15v-5.2L1.6 9V6.6c0-.9.7-1.6 1.6-1.6h7.6c.9 0 1.6.7 1.6 1.6V9L11 9.8V15"/></svg></div>
      <div>
        <div class="es-nome">${L.persona} ${String(id).padStart(2, "0")}</div>
        ${profilo ? `<div class="es-riga">${esc(profilo)}</div>` : ""}
        ${d && d.meta ? `<div class="es-riga es-meta">→ ${esc(d.meta)}</div>` : ""}
        <button class="es-occhi" type="button"><svg width="15" height="10" viewBox="0 0 15 10" fill="none" stroke="currentColor" stroke-width="1.3">
          <path d="M1 5c1.8-2.7 4-4 6.5-4S12.2 2.3 14 5c-1.8 2.7-4 4-6.5 4S2.8 7.7 1 5z"/><circle cx="7.5" cy="5" r="1.8"/></svg>${esc(L.neiSuoiOcchi)}</button>
      </div>
      ${dati.length ? `<div class="es-dati">${dati.map(([k, v]) => `<span>${esc(k)}</span><span>${esc(v)}</span>`).join("")}</div>` : ""}
    </div>`;
  el.querySelector(".es-occhi").addEventListener("click", (e) => { e.stopPropagation(); occhi(); });
  requestAnimationFrame(() => el.classList.add("su"));
}

// Ogni fotogramma: l'anello ai piedi, il cartellino sopra la testa. Il filo
// e' lungo abbastanza da non coprire la persona.
const FILO_PX = 70;
function segui() {
  S.giro = 0;
  if (S.id == null) return;
  const T = window.THREE, cam = window.__veritasCamera, ren = window.__veritasRenderer;
  const g = gruppi().find(([id]) => id === S.id);
  if (!T || !cam || !ren || !g) { lascia(); return; }
  // i piedi e la testa si MISURANO sul corpo vero (il gruppo del bundle ha
  // l'origine a mezz'aria, e il corpo e' scalato due volte): una scatola sola
  // per fotogramma, su una persona sola.
  const corpo = g[1].getObjectByName("__veritasCorpo") || g[1];
  const box = new T.Box3().setFromObject(corpo);
  const pos = new T.Vector3(); g[1].getWorldPosition(pos);
  const piedi = box.isEmpty() ? pos.y : box.min.y, cima = box.isEmpty() ? pos.y + 1.8 : box.max.y;
  // negli occhi della persona (passo 5) l'anello e il cartellino sono suoi:
  // non si vedono. La linea del cammino RESTA, ed e' LA STESSA (disegnaVia,
  // il percorso vero della simulazione): Raffaella, 29/09 — «non una nuova
  // linea costruita per la prima persona». Plastico → persona → il suo
  // percorso → i suoi occhi → lo stesso percorso mentre si cammina con lei.
  const dentro = O.fase === "giu" || O.fase === "dentro";
  if (S.anello) { S.anello.position.set(pos.x, piedi + 0.03, pos.z); S.anello.visible = !dentro; }
  const adesso = performance.now();
  if (adesso - S.viaQuando > VIA_OGNI_MS) {
    S.viaQuando = adesso;
    try { disegnaVia(T, S.id, pos, piedi); } catch (e) { console.warn("[EIDETICA selezione] traiettoria:", e && e.message); }
  }
  const testa = new T.Vector3(pos.x, cima + 0.25, pos.z);
  testa.project(cam);
  const r = ren.domElement.getBoundingClientRect();
  const dietro = testa.z > 1;
  const x = r.left + (testa.x + 1) / 2 * r.width, y = r.top + (1 - testa.y) / 2 * r.height;
  const el = S.scheda;
  if (el) {
    el.style.display = dietro || dentro ? "none" : "";
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    const carta = el.querySelector(".es-carta"), filo = el.querySelector(".es-filo"), pt = el.querySelector(".es-pt");
    if (carta && filo && pt) {
      const h = carta.offsetHeight || 70;
      pt.style.top = "-4px";
      filo.style.top = -FILO_PX + "px"; filo.style.height = FILO_PX + "px";
      carta.style.top = -(FILO_PX + h) + "px";
    }
  }
  S.giro = requestAnimationFrame(segui);
}

function scegli(id) {
  const T = window.THREE, scena = window.__veritasScene;
  if (!T || !scena) return false;
  if (S.id != null) lascia();
  S.id = id;
  S.viaDa = -1; S.viaQuando = 0;
  attenua(id);
  scena.add(anello(T));
  scheda(id);
  if (!S.giro) S.giro = requestAnimationFrame(segui);
  return true;
}
function lascia() {
  if (S.id == null) return;
  if (O.fase) esciSubito();
  S.id = null;
  togliVia(); S.viaDa = -1; S.viaQuando = 0;
  rimettiOpacita();
  if (S.anello && S.anello.parent) S.anello.parent.remove(S.anello);
  if (S.scheda) { S.scheda.classList.remove("su"); const s = S.scheda; setTimeout(() => { if (S.id == null) s.style.display = "none"; }, 350); }
  if (S.giro) { cancelAnimationFrame(S.giro); S.giro = 0; }
}

// ─── NEGLI OCCHI DELLA PERSONA — passo 5 (29/09/2026) ───────────────────────
// Dal plastico, «Con i suoi occhi» nel cartellino: la telecamera della STESSA
// scena (niente veritas_cinema.js, niente secondo mondo) scende in 1,5 s
// all'altezza d'occhio del profilo e da li' segue la persona scelta. Esc (o il
// tasto nel cartellino in alto) la riporta, in 1,5 s, dov'era sul plastico.
//
// Da dove vengono i dati, e nient'altro:
//   dove sta      la figura, cioe' la posizione che la simulazione le da' ORA
//                 (il bundle la mette li' a ogni fotogramma);
//   dove guarda   window.__veritasOcchiDiAgente(id).direzione: gli occhi nel
//                 tempo della simulazione, verso dove sara' 1 s dopo; ferma,
//                 guarda dove guardava (index.html, verificato 92% entro 20°);
//   a che altezza i piedi MISURATI sul corpo (come l'anello) + l'altezza
//                 d'occhio del profilo (la tabella di __veritasOcchiDiAgente:
//                 in carrozzina 1,20 m). Non group.y + altezza: l'origine del
//                 gruppo del bundle non e' ai piedi.
// Soste e code sono quelle vere: la figura si ferma, la telecamera con lei.
//
// ⚠️ LA TELECAMERA SI POSA DENTRO renderer.render, e solo li'. Qui la
//    muovono in tanti (i controlli a ogni fotogramma, il volo del bundle,
//    l'inquadratura a ogni «Avvia», l'inseguimento dalla lista): posandola un
//    istante prima del disegno, vince sempre e non si litiga con nessuno. Per
//    lo stesso motivo il corpo della persona si spegne solo per quel disegno:
//    nessuno stato da rimettere se qualcosa va storto.
// ⚠️ I rimpiazzi tardivi della traiettoria (HANDOFF §9, aperto) fanno saltare
//    le figure: negli occhi salta anche la telecamera. Noto, non si copre.
const DISCESA_MS = 1500;
const O = { fase: null, t0: 0,                     // fase: "giu" | "dentro" | "su"
            daPos: null, daQuat: null,              // da dove parte il volo in corso
            plastico: null,                         // { pos, target, quat, comandi } per tornare
            y: null, yaw: null, ultimo: 0, cartello: null };

const liscia = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

function cartelloInAlto(id) {
  const d = typeof window.__veritasSchedaAgente === "function" ? window.__veritasSchedaAgente(id) : null;
  const L = TESTI[lingua()];
  const profilo = d && d.archetipo ? (L.profili[d.archetipo] || d.archetipo) : null;
  const el = O.cartello || document.body.appendChild(Object.assign(document.createElement("div"), { id: "eidetica-occhi" }));
  O.cartello = el;
  el.innerHTML = `<span class="eo-pt"></span>
    <span class="eo-nome">${L.persona} ${String(id).padStart(2, "0")}</span>
    ${profilo ? `<span>${esc(profilo)}</span>` : ""}
    ${d && d.meta ? `<span class="eo-meta">→ ${esc(d.meta)}</span>` : ""}
    <button type="button" title="${esc(L.torna)}">Esc</button>`;
  el.querySelector("button").addEventListener("click", () => esciDagliOcchi());
  el.style.display = "";
  requestAnimationFrame(() => el.classList.add("su"));
}
function togliCartello() {
  const el = O.cartello;
  if (!el) return;
  el.classList.remove("su");
  setTimeout(() => { if (!O.fase || O.fase === "su") el.style.display = "none"; }, 400);
}

// La posa degli occhi ORA: posizione e orientamento (quaternione).
function posaDegliOcchi(T) {
  const g = gruppi().find(([id]) => id === S.id);
  const occhi = g && typeof window.__veritasOcchiDiAgente === "function" ? window.__veritasOcchiDiAgente(S.id) : null;
  if (!g || !occhi) return null;
  // il corpo vero; se la libreria dei corpi non e' arrivata, la figura del bundle
  const corpo = g[1].getObjectByName("__veritasCorpo") || g[1];
  const pos = new T.Vector3(); g[1].getWorldPosition(pos);
  const box = new T.Box3().setFromObject(corpo);
  const piedi = box.isEmpty() ? pos.y : box.min.y;
  const adesso = performance.now();
  const dt = O.ultimo ? Math.min(0.1, (adesso - O.ultimo) / 1000) : 0;
  O.ultimo = adesso;
  // la quota si liscia appena (il passo del bundle fa sobbalzare la figura di
  // 7 cm); x e z no: la telecamera sta dove sta la persona.
  const y = piedi + occhi.altezzaOcchio;
  O.y = O.y == null ? y : O.y + (y - O.y) * (1 - Math.exp(-dt / 0.2));
  // lo sguardo gira come gira una testa, non scatta: 0,35 s
  const [dx, , dz] = occhi.direzione;
  const verso = Math.atan2(dz, dx);
  if (O.yaw == null) O.yaw = verso;
  else {
    let d = verso - O.yaw;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    O.yaw += d * (1 - Math.exp(-dt / 0.35));
  }
  const p = new T.Vector3(pos.x, O.y, pos.z);
  const avanti = new T.Vector3(Math.cos(O.yaw), 0, Math.sin(O.yaw));
  const m = new T.Matrix4().lookAt(p, p.clone().add(avanti), new T.Vector3(0, 1, 0));
  return { pos: p, quat: new T.Quaternion().setFromRotationMatrix(m), avanti, corpo };
}

function posaLaTelecamera(T, cam) {
  const ctrl = window.__veritasControls;
  const e = liscia(Math.min(1, (performance.now() - O.t0) / DISCESA_MS));
  if (O.fase === "su") {
    const P = O.plastico;
    cam.position.lerpVectors(O.daPos, P.pos, e);
    cam.quaternion.slerpQuaternions(O.daQuat, P.quat, e);
    if (e >= 1) finisciUscita();
    // il corpo torna visibile appena la telecamera esce dalla testa
    return e < 0.3 ? O.corpo : null;
  }
  const occhi = posaDegliOcchi(T);
  if (!occhi) { esciDagliOcchi(); return null; }         // la persona non c'e' piu' (arrivata, ricalcolo)
  O.corpo = occhi.corpo;
  if (O.fase === "giu") {
    cam.position.lerpVectors(O.daPos, occhi.pos, e);
    cam.quaternion.slerpQuaternions(O.daQuat, occhi.quat, e);
    if (e >= 1) { O.fase = "dentro"; cartelloInAlto(S.id); }
  } else {
    cam.position.copy(occhi.pos);
    cam.quaternion.copy(occhi.quat);
  }
  // i controlli guardano un punto davanti agli occhi: al fotogramma dopo il
  // loro update riparte da qui, non da dov'era il plastico
  if (ctrl) ctrl.target.copy(occhi.pos).addScaledVector(occhi.avanti, 3);
  return occhi.corpo;
}

function avvolgiIlRenderer(ren) {
  if (ren.__eideticaOcchi) return;
  ren.__eideticaOcchi = true;
  const disegna = ren.render.bind(ren);
  ren.render = function (scena, camera) {
    // solo la vista del cliente: la scena della pagina, la sua telecamera,
    // sullo schermo (l'occhio che fotografa ha i suoi bersagli)
    if (!O.fase || scena !== window.__veritasScene || camera !== window.__veritasCamera
        || ren.getRenderTarget() !== null || !window.THREE) return disegna(scena, camera);
    let corpo = null;
    try { corpo = posaLaTelecamera(window.THREE, camera); }
    catch (e) { console.warn("[EIDETICA occhi]", e && e.message); }
    const acceso = corpo ? corpo.visible : false;
    if (corpo) corpo.visible = false;
    try { return disegna(scena, camera); }
    finally { if (corpo) corpo.visible = acceso; }
  };
}

function occhi() {
  const T = window.THREE, cam = window.__veritasCamera, ctrl = window.__veritasControls;
  if (S.id == null || O.fase || !T || !cam || !ctrl) return false;
  if (typeof window.__veritasOcchiDiAgente !== "function" || !window.__veritasOcchiDiAgente(S.id)) return false;
  O.plastico = { pos: cam.position.clone(), target: ctrl.target.clone(), quat: cam.quaternion.clone(),
                 comandi: ctrl.enabled };
  O.daPos = cam.position.clone(); O.daQuat = cam.quaternion.clone();
  O.y = null; O.yaw = null; O.ultimo = 0; O.corpo = null;
  ctrl.enabled = false;               // negli occhi non si gira la vista col mouse
  rimettiOpacita();                   // fra la gente, la gente e' tutta presente
  O.fase = "giu"; O.t0 = performance.now();
  return true;
}

function esciDagliOcchi() {
  if (O.fase !== "giu" && O.fase !== "dentro") return;
  const cam = window.__veritasCamera;
  O.daPos = cam.position.clone(); O.daQuat = cam.quaternion.clone();
  O.fase = "su"; O.t0 = performance.now();
  togliCartello();
}

function finisciUscita() {
  const cam = window.__veritasCamera, ctrl = window.__veritasControls, P = O.plastico;
  O.fase = null; O.corpo = null;
  if (cam && P) { cam.position.copy(P.pos); cam.quaternion.copy(P.quat); }
  if (ctrl && P) { ctrl.target.copy(P.target); ctrl.enabled = P.comandi; }
  O.plastico = null;
  if (S.id != null) attenua(S.id);    // di nuovo sul plastico, con la persona scelta
}

// Senza volo: quando la selezione si chiude (Analisi, clic nel vuoto) o la
// pagina lo chiede.
function esciSubito() {
  if (!O.fase) return;
  togliCartello();
  const id = S.id;
  S.id = null;                        // finisciUscita non riattenua
  finisciUscita();
  S.id = id;
}

// ─── IL CLIC ─────────────────────────────────────────────────────────────────
// Un clic, non un trascinamento: meno di 5 px e meno di 400 ms fra giu' e su.
function vicino(xClient, yClient) {
  const T = window.THREE, cam = window.__veritasCamera, ren = window.__veritasRenderer;
  if (!T || !cam || !ren) return null;
  const r = ren.domElement.getBoundingClientRect();
  let meglio = null, d2 = RAGGIO_PX * RAGGIO_PX;
  const p = new T.Vector3();
  for (const [id, g] of gruppi()) {
    // si prova la testa e il bacino: si clicca dove si vede la figura
    for (const quota of [1.7, 0.9]) {
      g.getWorldPosition(p); p.y += quota; p.project(cam);
      if (p.z > 1) continue;
      const x = r.left + (p.x + 1) / 2 * r.width, y = r.top + (1 - p.y) / 2 * r.height;
      const dd = (x - xClient) ** 2 + (y - yClient) ** 2;
      if (dd < d2) { d2 = dd; meglio = id; }
    }
  }
  return meglio;
}

function aggancia() {
  const ren = window.__veritasRenderer;
  if (!ren || ren.domElement.__eideticaSelezione) return !!ren;
  const tela = ren.domElement;
  tela.__eideticaSelezione = true;
  avvolgiIlRenderer(ren);
  let giu = null;
  tela.addEventListener("pointerdown", (e) => { giu = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  tela.addEventListener("pointerup", (e) => {
    // negli occhi di qualcuno un clic sulla scena non sceglie un altro
    if (!giu || !esperienza() || e.button !== 0 || O.fase) { giu = null; return; }
    const mosso = Math.hypot(e.clientX - giu.x, e.clientY - giu.y), durata = performance.now() - giu.t;
    giu = null;
    if (mosso > 5 || durata > 400) return;
    const id = vicino(e.clientX, e.clientY);
    if (id != null) scegli(id); else lascia();
  });
  return true;
}

function avvio() {
  if (!document.getElementById("eidetica-selezione-stile")) {
    const s = document.createElement("style");
    s.id = "eidetica-selezione-stile";
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  // Esc: dagli occhi si torna al plastico con la persona ancora scelta; dal
  // plastico, si lascia la persona.
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (O.fase === "giu" || O.fase === "dentro") esciDagliOcchi(); else if (!O.fase) lascia();
  });
  // Si passa in Analisi: la selezione si lascia (i suoi segni sono dell'Esperienza).
  new MutationObserver(() => { if (!esperienza()) lascia(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-eidetica-modo"] });
  // La tela nasce quando si apre lo spazio di lavoro: si riprova, con un tetto.
  let tentativi = 0;
  const t = setInterval(() => { if (aggancia() || ++tentativi > 600) clearInterval(t); }, 1000);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.eideticaSelezione = { scegli, lascia, scelto: () => S.id,
                               occhi, esciDagliOcchi, negliOcchi: () => O.fase };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avvio);
  else avvio();
}

export default { scegli, lascia };
