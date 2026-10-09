// ============================================================================
// ANALISI / ESPERIENZA — due quantita' di informazione sulla STESSA scena
// Raffaella, 29/09/2026 (passo 2 del piano: render → modi → selezione →
// traiettoria → occhi). «Non sono due scene diverse. E' la stessa scena con
// una diversa quantita' di informazione: Analisi → zone + cartellini +
// informazioni diagnostiche. Esperienza → cartellini delle zone spenti +
// agenti». E: «il sistema deve sembrare intelligente anche perche' sa COSA
// NON MOSTRARE».
//
// COS'E': uno STRATO, come la carta. Un attributo su <html>
// (`data-eidetica-modo`) e un foglio di regole che valgono solo con quello.
// Niente si cancella e niente si ricostruisce: in Analisi la pagina e'
// esattamente quella di prima.
//
// IN ESPERIENZA SI SPENGONO (inventario del 29/09, banco/vivo/inventario_segni.mjs):
//   - il gruppo delle zone in scena (blocchi, spigoli, anelli, cartellini):
//     lo nasconde veritas_carta.js SOLO mentre disegna la vista del cliente,
//     cosi' il comando «Spatial Layers → Zones» conserva il suo stato;
//   - gli strumenti da tecnico sopra la scena: Spatial Layers, Analysis /
//     Report, Zone editor, il riquadro dei KPI, la chat, la barra degli
//     strumenti a sinistra (tranne «Persone in scena»), i dettagli del
//     progetto, i messaggi del motore (#veritas-bridge-status).
// RESTANO: il modello, gli agenti, la barra di riproduzione, l'elenco delle
// persone in scena.
//
// ⚠️ NON TOCCA traiettorie, selezione dell'agente, prima persona: sono i
//    passi 3, 4 e 5, e questo passo deve poter essere giudicato da solo.
//
//   window.eideticaModo.imposta("esperienza" | "analisi")
//   window.eideticaModo.stato()
// ============================================================================

const CHIAVE = "eidetica:modo";
const ATTR = "data-eidetica-modo";

const TESTI = {
  it: { analisi: "Analisi", esperienza: "Esperienza", originale: "Modello originale",
        titoloOriginale: "Mostra il modello con i suoi materiali" },
  en: { analisi: "Analysis", esperienza: "Experience", originale: "Original model",
        titoloOriginale: "Show the model with its own materials" },
};
function lingua() {
  try { return localStorage.getItem("veritasLang") === "it" ? "it" : "en"; } catch (e) { return "en"; }
}

// Le stesse misure del velo e della tavola: vetro scuro, filo sottile,
// una tinta sola per dire «acceso». Sta sulla scena, quindi e' scuro anche
// finche' i pannelli sono ancora carta.
const CSS = `
/* Fuori dalla barra del bundle, al centro in alto: la carta ridipinge ogni
   bottone di #vaio-toolbar, e questo deve restare scuro sulla scena. */
#eidetica-modo{position:fixed;top:17px;left:50%;transform:translateX(-50%);z-index:9650;
  display:flex;align-items:center;gap:8px;pointer-events:auto}
#eidetica-modo .em-gruppo{display:flex;padding:3px;border-radius:10px;background:rgba(10,14,20,.72);
  border:1px solid rgba(255,255,255,.10);box-shadow:0 10px 30px rgba(0,0,0,.35);backdrop-filter:blur(14px)}
#eidetica-modo button{all:unset;cursor:pointer;padding:6px 13px;border-radius:7px;
  font:500 12px Inter,"Segoe UI",system-ui,sans-serif;letter-spacing:.04em;color:#8A94A6;transition:color .25s,background .25s}
#eidetica-modo button:hover{color:#D7DEE8}
#eidetica-modo button.on{color:#0b1016;background:#2EE6D6}
#eidetica-modo .em-originale.on{color:#D7DEE8;background:rgba(255,255,255,.12)}
html[${ATTR}="esperienza"] #vaio-toolbar,
html[${ATTR}="esperienza"] #vaio-dati,
html[${ATTR}="esperienza"] #vaio-console,
html[${ATTR}="esperienza"] #va-rail > :not(#va-agenti-tab),
html[${ATTR}="esperienza"] #veritas-picker-panel,
html[${ATTR}="esperienza"] #veritas-reopen-tab,
html[${ATTR}="esperienza"] #veritas-bridge-status{display:none!important}
`;

function stato() {
  return document.documentElement.getAttribute(ATTR) || "analisi";
}

// Il riquadro dei KPI e' del bundle React e non ha un id: e' l'<aside> a
// destra dentro #root. Si nasconde a mano (non con una regola), perche' a
// chiuderlo la tela si allarga e il motore deve sapere che la finestra e'
// cambiata: si manda un «resize», lo stesso che manda il browser.
// ⚠️ Si tiene il riferimento: nascosto, non ha piu' misure e non lo si
//    ritroverebbe per riaccenderlo.
let kpiTrovato = null;
function riquadroKpi() {
  if (kpiTrovato && kpiTrovato.isConnected) return kpiTrovato;
  // il primo <aside> di #root appoggiato al bordo destro, largo ~300 px
  return kpiTrovato = [...document.querySelectorAll("#root aside")].find((a) => {
    const r = a.getBoundingClientRect();
    return r.width > 200 && r.width < 420 && Math.abs(r.right - innerWidth) < 4;
  }) || null;
}
function applica(modo) {
  const kpi = riquadroKpi();
  if (kpi) {
    const via = modo === "esperienza";
    if (via !== (kpi.style.display === "none")) {
      kpi.style.display = via ? "none" : "";
      window.dispatchEvent(new Event("resize"));
    }
  }
  const box = document.getElementById("eidetica-modo");
  if (box) {
    box.querySelector('[data-modo="analisi"]').classList.toggle("on", modo === "analisi");
    box.querySelector('[data-modo="esperienza"]').classList.toggle("on", modo === "esperienza");
  }
}

function imposta(modo) {
  modo = modo === "esperienza" ? "esperienza" : "analisi";
  document.documentElement.setAttribute(ATTR, modo);
  try { localStorage.setItem(CHIAVE, modo); } catch (e) {}
  applica(modo);
  return modo;
}

function costruisci() {
  if (document.getElementById("eidetica-modo")) return true;
  if (!document.getElementById("vaio-toolbar")) return false;   // lo spazio di lavoro non e' aperto
  const T = TESTI[lingua()];
  const box = document.createElement("div");
  box.id = "eidetica-modo";
  box.innerHTML = `<div class="em-gruppo">
      <button data-modo="analisi">${T.analisi}</button>
      <button data-modo="esperienza">${T.esperienza}</button>
    </div>
    <div class="em-gruppo"><button class="em-originale" title="${T.titoloOriginale}">${T.originale}</button></div>`;
  box.querySelectorAll("[data-modo]").forEach((b) => b.addEventListener("click", () => imposta(b.dataset.modo)));
  const orig = box.querySelector(".em-originale");
  orig.addEventListener("click", () => {
    const carta = window.veritasCarta;
    if (!carta || typeof carta.modelloOriginale !== "function") return;
    const ora = !orig.classList.contains("on");
    carta.modelloOriginale(ora);
    orig.classList.toggle("on", ora);
  });
  document.body.appendChild(box);
  applica(stato());
  return true;
}

function avvio() {
  if (!document.getElementById("eidetica-modo-stile")) {
    const s = document.createElement("style");
    s.id = "eidetica-modo-stile";
    s.textContent = CSS;
    document.head.appendChild(s);
  }
  // Si parte in Esperienza: e' quello che vede chi non conosce EIDETICA.
  // La scelta di chi ci lavora si ricorda in questo browser.
  let scelto = null;
  try { scelto = localStorage.getItem(CHIAVE); } catch (e) {}
  document.documentElement.setAttribute(ATTR, scelto === "analisi" ? "analisi" : "esperienza");
  // La barra nasce quando si apre lo spazio di lavoro, e il riquadro dei KPI
  // quando lo disegna il bundle: si riprova per un po', poi si smette — non un
  // ciclo eterno. Tetto: 10 minuti (il velo puo' restare aperto a lungo).
  let tentativi = 0;
  const t = setInterval(() => {
    const fatto = costruisci();
    if (fatto) applica(stato());
    if ((fatto && riquadroKpi()) || ++tentativi > 600) clearInterval(t);
  }, 1000);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.eideticaModo = { imposta, stato };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", avvio);
  else avvio();
}

export default { imposta, stato };
