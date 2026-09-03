// veritas_aspetto.js — l'aspetto: essenziale, e con il modello come protagonista.
//
// IL PROBLEMA, MISURATO PRIMA DI TOCCARE NIENTE
//
// La shell AI-OS usa GIA' il vetro: rgba(16,16,18,.6) con blur(30px) e
// saturate(1.6). L'intenzione estetica c'era. Ma sullo schermo leggeva pesante,
// e la ragione non era il CSS:
//
//   1. LA TELA OCCUPAVA IL 60% DELLA FINESTRA. Misurato su 1920x1080: la tela
//      era 1352x921. E 1920-1352 = 568 = 268+300, cioe' esattamente i due
//      <aside> nativi. La shell li nasconde con display:none, il flex si
//      ricompone, ma il renderer ridimensiona SOLO sull'evento resize della
//      finestra -- che nessuno emetteva. La tela restava grande quanto era CON
//      i pannelli, e il 40% dello schermo era nero morto.
//
//   2. IL MODELLO NON ERA MAI INQUADRATO. La camera stava a [0,80,0], un preset
//      fisso "Top Down 80m", mentre il modello misura 121,1 x 67,6 m e non e'
//      centrato sull'origine: usciva dal bordo sinistro e dall'alto.
//
// Messe insieme, quelle due cose spiegano perche' il vetro non leggeva come
// vetro: DIETRO NON C'ERA NIENTE DA RIFRANGERE. Un pannello scuro al 60% di
// opacita' sopra il nero e' un pannello opaco. Sopra un modello illuminato e
// inquadrato, lo stesso pannello diventa vetro. L'estetica non andava
// riscritta: andava messa nelle condizioni di funzionare.
//
// Un'ipotesi di partenza era invece SBAGLIATA, e la misura l'ha smontata:
// "la scena non e' illuminata". Falso -- ci sono gia' 3 luci, ACESFilmic e
// shadowMap attiva. Il grigio piatto veniva dall'inquadratura, non dalla luce.
//
// COSA FA QUESTO MODULO
//
//   tela piena      un resize quando i pannelli nativi cambiano stato
//   inquadratura    sull'ingombro reale del modello, non su un preset fisso
//   essenziale      all'ingresso si vede quasi nulla; il resto si apre a richiesta
//   pannelli ai lati  la console lascia il centro, che serve a play/pausa
//   tastini         gli strati visivi (esodo, flusso, visibilita') accendibili
//
// I tastini NON duplicano logica: chiamano window.__veritasRunCommand, cioe'
// lo stesso percorso della console. Le pulsazioni sul modello esistono gia' in
// veritas_visuale.js (mappa di esodo, particelle sul gradiente, anelli che
// battono): prima erano raggiungibili solo scrivendo `esodo` a mano, e quindi
// di fatto invisibili.
//
// Perche' la console non sta piu' al centro: copriva play/pausa e la barra del
// tempo. Una simulazione che non si puo' fermare non si puo' guardare.

const FASI = ["ingresso", "modello", "analisi"];

// Elementi della shell che si vedono in ciascuna fase. Tutto il resto sta
// chiuso: all'ingresso non c'e' niente da configurare, e mostrare nove
// pannelli prima che esista un modello e' rumore, non ricchezza.
const VISIBILI = {
  ingresso: ["vaio-brand", "vaio-upload-wrap"],
  // Caricato un modello, l'invito al centro sparisce: ha finito il suo lavoro,
  // e da li' in poi coprirebbe la scena. Per cambiare modello c'e' la toolbar.
  modello: ["vaio-brand", "vaio-toolbar", "va-rail"],
  analisi: ["vaio-brand", "vaio-toolbar", "va-rail"],
};

// Gli strati visivi, nell'ordine in cui hanno senso: prima capire lo spazio,
// poi come lo si attraversa, poi come se ne esce.
const STRATI = [
  { id: "analizza", segno: "◇", nome: "Leggi lo spazio", comando: "analizza" },
  { id: "visibilita", segno: "◉", nome: "Cosa si vede", comando: "visibilita" },
  { id: "accessibilita", segno: "◐", nome: "Chi sta seduto", comando: "accessibilita" },
  { id: "esodo", segno: "≈", nome: "Vie di esodo e flusso", comando: "esodo" },
  { id: "spegni", segno: "○", nome: "Togli dal modello", comando: "spegni" },
];

/**
 * L'inquadratura, dall'ingombro reale del modello.
 *
 * Il preset "Top Down 80m" e' un numero scelto una volta: va bene per il
 * modello su cui e' stato scelto e per nessun altro. Qui la distanza esce
 * dalla trigonometria -- il raggio che deve entrare nel campo visivo -- e il
 * margine e' l'unica cosa a gusto (15%: un edificio incollato ai bordi sembra
 * ritagliato male).
 *
 * Si guarda il lato PIU' LUNGO in pianta, non la diagonale: la diagonale
 * allontanerebbe troppo su modelli molto allungati come un terminal.
 */
export function inquadratura({ ingombro, centro, fovGradi = 75, margine = 1.15 }) {
  const raggio = Math.max(ingombro.x, ingombro.z) * 0.5;
  const fov = (fovGradi * Math.PI) / 180;
  const distanza = (raggio / Math.tan(fov * 0.5)) * margine;
  return {
    distanza,
    // Tre quarti dall'alto: si legge la pianta E si vede che e' un volume.
    // Lo zenit puro appiattisce tutto e nasconde le altezze.
    posizione: {
      x: centro.x + distanza * 0.55,
      y: centro.y + distanza * 0.62,
      z: centro.z + distanza * 0.55,
    },
    bersaglio: { x: centro.x, y: centro.y, z: centro.z },
    // near/far larghi ma non assurdi: near troppo piccolo mangia precisione
    // allo z-buffer e fa sfarfallare le superfici complanari (il pavimento e
    // la segnaletica stesa sopra, che qui sono esattamente complanari).
    near: distanza / 100,
    far: distanza * 12,
  };
}

/** Quanto schermo si sta buttando via, in percentuale. */
export function schermoPerso(finestra, tela) {
  const tot = finestra.w * finestra.h;
  if (!tot) return 0;
  return Math.round((1 - (tela.w * tela.h) / tot) * 100);
}

/**
 * In che fase siamo. Non e' una preferenza: dipende da cosa esiste davvero.
 * Senza modello non c'e' niente da misurare, e senza misure niente da mostrare.
 */
export function fase({ modello, zone }) {
  if (!modello) return "ingresso";
  if (zone && zone >= 2) return "analisi";
  return "modello";
}

/** Cosa si vede in una fase. Sconosciuta = si torna all'ingresso. */
export function visibiliInFase(f) {
  return VISIBILI[f] ? VISIBILI[f].slice() : VISIBILI.ingresso.slice();
}

/**
 * Quali tastini si possono premere. Uno strato spento perche' il modulo non
 * c'e' va mostrato spento, non nascosto: se scompare, chi guarda non sa che
 * esiste e non sa cosa gli manca.
 */
export function stratiAttivabili({ modello, visuale, normative }) {
  return STRATI.map((s) => {
    let attivo = !!modello;
    if (s.id === "esodo") attivo = !!modello && !!visuale && !!normative;
    // Spegnere ha senso solo se c'e' qualcosa sopra un modello: con la sola
    // visuale caricata il tastino risultava premibile a vuoto gia' all'ingresso.
    if (s.id === "spegni") attivo = !!modello && !!visuale;
    return { ...s, attivo };
  });
}

// ---------------------------------------------------------------------------
// Da qui in giu' e' DOM: si prova in browser col banco, non a tavolino.
// ---------------------------------------------------------------------------

const CSS = `
:root{
  /* Un accento solo, freddo, e usato quasi mai: serve a dire "questo e'
     acceso", non a decorare. Il blu di default del browser era il colore di
     nessuno. */
  --va-accento:#64D2FF;
  --va-vetro:rgba(22,24,30,.52);
  --va-vetro-su:rgba(30,33,40,.62);
  --va-orlo:rgba(255,255,255,.075);
  --va-testo:#EDEDF0;
  --va-testo-fioco:#8E8E96;
  /* L'ombra e' due cose: una proiezione sotto, e una linea di luce sul bordo
     alto. La seconda e' quella che da' lo spessore -- senza, il vetro sembra
     un rettangolo colorato. */
  --va-ombra:0 12px 40px -8px rgba(0,0,0,.62), inset 0 1px 0 rgba(255,255,255,.07);
  --va-sfuma:blur(34px) saturate(1.7);
}
/* Tipografia: una sola famiglia per l'interfaccia. Il mono resta, ma SOLO
   sui numeri misurati -- e' li' che serve, perche' le cifre incolonnate si
   confrontano a occhio. Altrove faceva sembrare tutto un terminale. */
#vaio-root,#vaio-root button,#vaio-root input,.va-strato,.va-dock{
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter",system-ui,sans-serif;
  letter-spacing:-.01em;
}
.va-num{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-variant-numeric:tabular-nums;}

/* Il vetro, uno solo, ereditato da tutti. */
.va-vetro{
  background:var(--va-vetro);
  backdrop-filter:var(--va-sfuma);-webkit-backdrop-filter:var(--va-sfuma);
  border:1px solid var(--va-orlo);box-shadow:var(--va-ombra);
}

/* La topbar si assottiglia: era la cosa piu' pesante sullo schermo e diceva
   meno di tutte. */
#vaio-brand{padding:6px 12px!important;border-radius:11px!important;font-size:11.5px!important;}
#vaio-toolbar button{
  padding:6px 11px!important;font-size:11px!important;border-radius:10px!important;
  border-color:var(--va-orlo)!important;background:var(--va-vetro)!important;
  box-shadow:var(--va-ombra)!important;transition:background .18s ease,transform .18s ease;
}
#vaio-toolbar button:hover{background:var(--va-vetro-su)!important;transform:translateY(-1px);}

/* IL RAIL: i tastini. Verticale a sinistra, fuori dal centro, fuori dal
   percorso di play/pausa. Chiuso mostra solo i segni; passandoci sopra si
   apre e dice i nomi -- cosi' non occupa spazio mentre si guarda il modello. */
#va-rail{
  position:fixed;left:16px;top:50%;transform:translateY(-50%);z-index:9620;
  display:flex;flex-direction:column;gap:4px;padding:6px;border-radius:15px;
  transition:opacity .25s ease;
}
.va-strato{
  display:flex;align-items:center;gap:0;overflow:hidden;
  width:34px;height:34px;border:0;border-radius:10px;cursor:pointer;
  background:transparent;color:var(--va-testo-fioco);
  transition:width .22s cubic-bezier(.4,0,.2,1),background .18s ease,color .18s ease,gap .22s ease;
}
.va-strato:hover:not(:disabled){background:rgba(255,255,255,.07);color:var(--va-testo);}
#va-rail:hover .va-strato{width:186px;gap:10px;}
.va-strato-segno{flex:0 0 22px;text-align:center;font-size:14px;line-height:1;}
.va-strato-nome{
  white-space:nowrap;font-size:11.5px;opacity:0;transition:opacity .18s ease .04s;
}
#va-rail:hover .va-strato-nome{opacity:1;}
.va-strato:disabled{opacity:.28;cursor:default;}
.va-strato[aria-pressed="true"]{color:var(--va-accento);background:rgba(100,210,255,.11);}

/* IL DOCK: la console lascia il centro e si ancora a destra. Chiusa e' una
   linguetta sottile; si apre solo quando serve parlare. */
/* La linguetta vive DENTRO il rail, non da sola sul bordo destro.
   Misurato: a destra c'era #veritas-progetto con z-index 100000, che la
   copriva e mangiava il click -- elementFromPoint sul suo centro restituiva
   il pannello, non il bottone. Invece di rincorrere gli z-index, i comandi
   stanno tutti a sinistra e i pannelli si aprono a destra. */
#va-dock-tab[aria-pressed="true"]{color:var(--va-accento);background:rgba(100,210,255,.11);}
#va-rail hr{
  border:0;border-top:1px solid var(--va-orlo);margin:3px 6px;
}
/* Un punto, non un numero: dice che VERITAS ha detto qualcosa mentre il dock
   era chiuso, senza aprire niente da solo. Aprire un pannello addosso a chi
   sta guardando il modello e' esattamente il difetto che stiamo togliendo. */
#va-dock-tab[data-nuovi="1"]::after{
  content:"";position:absolute;top:5px;right:5px;width:6px;height:6px;border-radius:50%;
  background:var(--va-accento);box-shadow:0 0 8px var(--va-accento);
}

/* La console, riportata dentro il dock. Le regole originali la mettevano a
   left:50% con translateX(-50%): sopra la barra del tempo. */
#vaio-console{
  left:auto!important;right:16px!important;bottom:16px!important;top:64px!important;
  transform:none!important;width:min(340px,32vw)!important;
  border-radius:16px!important;border-color:var(--va-orlo)!important;
  background:var(--va-vetro)!important;box-shadow:var(--va-ombra)!important;
  display:flex!important;flex-direction:column!important;
  transition:opacity .22s ease,transform .22s cubic-bezier(.4,0,.2,1);
}
/* Serve !important anche qui: la regola sopra fissa transform:none!important
   e, a pari specificita', batterebbe questa lasciando il pannello visibile. */
#vaio-console.va-chiuso{
  opacity:0!important;transform:translateX(14px)!important;pointer-events:none!important;
}
#vaio-console-log{flex:1 1 auto!important;max-height:none!important;font-size:11.5px!important;}
/* I numeri dentro le risposte si incolonnano: e' quello che si confronta. */
#vaio-console-log .va-num{color:var(--va-testo);}
#vaio-console-send{
  background:var(--va-accento)!important;border:0!important;
  box-shadow:0 4px 14px -2px rgba(100,210,255,.5)!important;
}

/* L'onboarding a muro di testo spariva letto una volta e restava per sempre.
   All'ingresso basta l'invito a caricare. */
#vaio-onboard{display:none!important;}

/* Il pannello dati di progetto: stile fisso scritto a mano (#141414, #333) e
   z-index 100000, cioe' sopra ogni cosa. Riportato allo stesso vetro di tutto
   il resto, e sotto la console: due pannelli non si aprono mai insieme. */
#veritas-progetto{
  background:var(--va-vetro)!important;
  backdrop-filter:var(--va-sfuma)!important;-webkit-backdrop-filter:var(--va-sfuma)!important;
  border:1px solid var(--va-orlo)!important;border-radius:16px!important;
  box-shadow:var(--va-ombra)!important;z-index:9690!important;
  color:var(--va-testo)!important;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter",system-ui,sans-serif!important;
}
#veritas-progetto input,#veritas-progetto select{
  background:rgba(255,255,255,.05)!important;border:1px solid var(--va-orlo)!important;
  border-radius:9px!important;color:var(--va-testo)!important;
}

/* Il widget di upload e' l'UNICA cosa da fare all'ingresso, quindi sta al
   centro di uno schermo vuoto e non in un angolo. A left:64px finiva sopra il
   marchio: testo su testo, il difetto piu' banale e il piu' visibile. */
#vaio-upload-wrap{
  bottom:auto!important;top:50%!important;left:50%!important;
  transform:translate(-50%,-50%)!important;
}
#vaio-upload-btn{
  padding:6px 12px!important;border-radius:11px!important;font-size:11px!important;
  background:var(--va-vetro)!important;border-color:var(--va-orlo)!important;
  box-shadow:var(--va-ombra)!important;flex-direction:row!important;
  align-items:center!important;gap:8px!important;
}

/* Quello che la fase non prevede non c'e'. */
.va-fuori-fase{opacity:0!important;pointer-events:none!important;}

/* L'avviso del ponte Python stava a left:20px, bottom:420px -- cioe' esattamente
   addosso al rail. Passa in basso a destra, sopra la barra del tempo, e smette
   di essere un riquadro giallo a bordo pieno: un avviso di servizio non deve
   pesare come il contenuto. Il testo resta quello, non si nasconde niente. */
#veritas-bridge-status{
  left:auto!important;right:16px!important;bottom:118px!important;
  max-width:260px!important;border-radius:11px!important;
  background:var(--va-vetro)!important;
  backdrop-filter:var(--va-sfuma)!important;-webkit-backdrop-filter:var(--va-sfuma)!important;
  border:1px solid var(--va-orlo)!important;box-shadow:var(--va-ombra)!important;
  color:var(--va-testo-fioco)!important;font-size:10.5px!important;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter",system-ui,sans-serif!important;
  z-index:9500!important;
}

/* Elementi creati da altri blocchi con stile inline e SENZA id: non si possono
   prendere con un selettore, e inventarne uno e' il modo piu' rapido di
   scrivere CSS che non fa niente. Si taggano da JS trovandoli per contenuto
   (vedi vetrifica()), poi valgono queste regole. */
.va-vetrificato{
  background:var(--va-vetro)!important;border:1px solid var(--va-orlo)!important;
  box-shadow:var(--va-ombra)!important;border-radius:10px!important;
  font-size:10.5px!important;color:var(--va-testo)!important;
  backdrop-filter:var(--va-sfuma)!important;-webkit-backdrop-filter:var(--va-sfuma)!important;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Inter",system-ui,sans-serif!important;
}
/* La pillola stava incollata al bordo, sopra l'etichetta dell'ultima tappa. */
.va-vetrificato[data-va="splat"]{bottom:118px!important;right:16px!important;}
`;

function stile() {
  if (document.getElementById("va-stile")) return;
  const s = document.createElement("style");
  s.id = "va-stile";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/**
 * LA TELA PIENA.
 *
 * Non si tocca il renderer: si emette l'evento che il renderer aspetta gia'.
 * Toccarlo direttamente vorrebbe dire indovinare come il bundle calcola la
 * propria dimensione -- e il bundle e' il blocco 3, che non si tocca.
 *
 * Un ResizeObserver sul contenitore della tela copre tutti i casi senza
 * doverli elencare: pannelli nascosti, pannelli riaperti, drawer che si apre.
 */
let telaSeguita = null;

function telaPiena() {
  const avvisa = () => window.dispatchEvent(new Event("resize"));
  const tela = document.querySelector("canvas");
  // La tela non esiste all'avvio: la scena 3D monta solo dopo "Avvia
  // simulazione". Misurato: all'ingresso restava 1352x921, cioe' il 40% di
  // schermo perso, perche' l'osservatore non si era mai potuto agganciare.
  if (!tela) { avvisa(); return; }
  if (tela === telaSeguita) { avvisa(); return; }
  telaSeguita = tela;
  const contenitore = tela.parentElement;
  if (contenitore && typeof ResizeObserver === "function") {
    let ultimo = 0;
    new ResizeObserver(() => {
      const ora = Date.now();
      if (ora - ultimo < 120) return;
      ultimo = ora;
      const r = contenitore.getBoundingClientRect();
      const t = tela.getBoundingClientRect();
      if (Math.abs(r.width - t.width) > 2 || Math.abs(r.height - t.height) > 2) avvisa();
    }).observe(contenitore);
  }
  avvisa();
}

/** L'inquadratura applicata alla camera vera. */
function inquadra() {
  const THREE = window.THREE;
  const camera = window.__veritasCamera;
  const radice = window.__veritasModelRoot;
  if (!THREE || !camera || !radice) return null;

  const scatola = new THREE.Box3().setFromObject(radice);
  if (scatola.isEmpty()) return null;
  const centro = scatola.getCenter(new THREE.Vector3());
  const ingombro = scatola.getSize(new THREE.Vector3());

  const q = inquadratura({ ingombro, centro, fovGradi: camera.fov });
  camera.position.set(q.posizione.x, q.posizione.y, q.posizione.z);
  camera.near = q.near;
  camera.far = q.far;
  camera.updateProjectionMatrix();
  camera.lookAt(centro);

  const controlli = window.__veritasControls;
  if (controlli && controlli.target) { controlli.target.copy(centro); controlli.update(); }

  // La foschia lega il modello al fondo: senza, l'edificio galleggia su un
  // nero che non ha profondita'.
  const scena = window.__veritasScene;
  if (scena && THREE.Fog) scena.fog = new THREE.Fog(0x0b0f17, q.distanza * 1.4, q.distanza * 4.2);

  return { ingombro, distanza: q.distanza };
}

function rail() {
  if (document.getElementById("va-rail")) return document.getElementById("va-rail");
  const r = document.createElement("div");
  r.id = "va-rail";
  r.className = "va-vetro";
  document.body.appendChild(r);
  return r;
}

function disegnaRail() {
  const r = rail();
  const strati = stratiAttivabili({
    modello: !!window.__veritasModelRoot,
    visuale: !!window.__veritasVisuale,
    normative: !!window.__veritasNormative,
  });
  r.innerHTML = "";

  // Primo il parlare, poi il guardare: la console e' il modo in cui si chiede
  // qualcosa che i tastini non prevedono.
  const parla = document.createElement("button");
  parla.id = "va-dock-tab";
  parla.className = "va-strato";
  parla.type = "button";
  parla.title = "Parla con VERITAS";
  parla.setAttribute("aria-label", "Parla con VERITAS");
  parla.setAttribute("aria-pressed", dockAperto ? "true" : "false");
  parla.innerHTML = '<span class="va-strato-segno">◨</span>'
                  + '<span class="va-strato-nome">Parla con VERITAS</span>';
  parla.addEventListener("click", () => apriDock(!dockAperto));
  r.appendChild(parla);
  r.appendChild(document.createElement("hr"));

  for (const s of strati) {
    const b = document.createElement("button");
    b.className = "va-strato";
    b.type = "button";
    b.disabled = !s.attivo;
    b.title = s.nome;
    b.setAttribute("aria-label", s.nome);
    const segno = document.createElement("span");
    segno.className = "va-strato-segno";
    segno.textContent = s.segno;
    const nome = document.createElement("span");
    nome.className = "va-strato-nome";
    nome.textContent = s.nome;
    b.appendChild(segno);
    b.appendChild(nome);
    b.addEventListener("click", () => {
      if (typeof window.__veritasRunCommand !== "function") return;
      // Il tastino non calcola niente: passa per la console, cioe' per
      // l'unico percorso che esiste. Se domani il comando cambia, cambia in
      // un posto solo.
      window.__veritasRunCommand(s.comando);
      if (s.id === "spegni") {
        r.querySelectorAll('.va-strato[aria-pressed="true"]')
         .forEach((x) => x.setAttribute("aria-pressed", "false"));
      } else {
        b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true");
      }
      apriDock(true);
    });
    r.appendChild(b);
  }
  return r;
}

let dockAperto = false;

function apriDock(v) {
  dockAperto = !!v;
  // Un pannello per volta, e vale nei DUE sensi. Chiudendo solo la console
  // quando compare il pannello, il caso opposto restava aperto: il pannello
  // dati finiva DIETRO la console e si leggeva in trasparenza attraverso il
  // vetro -- due testi sovrapposti, illeggibili entrambi.
  if (dockAperto) {
    const dati = document.getElementById("veritas-progetto");
    if (dati) dati.remove();
  }
  const c = document.getElementById("vaio-console");
  if (c) c.classList.toggle("va-chiuso", !dockAperto);
  const t = document.getElementById("va-dock-tab");
  if (t) {
    t.setAttribute("aria-pressed", dockAperto ? "true" : "false");
    if (dockAperto) t.removeAttribute("data-nuovi");
  }
}

/**
 * La console non c'e' ancora quando questo modulo parte: la shell la costruisce
 * dopo. Chiuderla subito non funzionava -- getElementById tornava null e lo
 * stato non veniva mai applicato, per cui il pannello nasceva aperto e copriva
 * la linguetta. Era un difetto silenzioso: nessun errore, solo un click che
 * non arrivava.
 *
 * Quindi non si indovina QUANDO arriva: si guarda. Stesso principio di §13.3.
 */
function segueConsole() {
  let vista = null;
  const guarda = () => {
    const c = document.getElementById("vaio-console");
    if (!c || c === vista) return;
    vista = c;
    apriDock(dockAperto);
    // Ogni riga nuova mentre il dock e' chiuso accende il punto sulla
    // linguetta, e nient'altro.
    const log = document.getElementById("vaio-console-log");
    if (log && typeof MutationObserver === "function") {
      new MutationObserver(() => {
        if (dockAperto) return;
        const t = document.getElementById("va-dock-tab");
        if (t) t.setAttribute("data-nuovi", "1");
      }).observe(log, { childList: true, subtree: true });
    }
  };
  guarda();
  if (typeof MutationObserver === "function") {
    new MutationObserver(guarda).observe(document.body, { childList: true, subtree: true });
  }
}

/**
 * Un pannello per volta. Il pannello dati di progetto e la console occupano
 * la stessa colonna a destra: aperti insieme si coprono a vicenda. Quando
 * compare il pannello, la console si chiude.
 */
function unPannelloPerVolta() {
  if (typeof MutationObserver !== "function") return;
  new MutationObserver(() => {
    if (document.getElementById("veritas-progetto") && dockAperto) apriDock(false);
  }).observe(document.body, { childList: true });
}

/**
 * Tagga per CONTENUTO gli elementi che altri blocchi creano con stile inline e
 * senza id. Il bottone "Splat 3D" e' uno di quelli: nessun id, stile scritto a
 * mano, posizione fissa in basso a destra sopra l'etichetta dell'ultima tappa.
 *
 * Non si inventa un selettore: si guarda cosa c'e' scritto. Se domani il
 * bottone cambia nome questa funzione smette di trovarlo -- e va bene, meglio
 * che una regola CSS che sembra funzionare e non prende niente.
 */
function vetrifica() {
  for (const b of document.querySelectorAll("button")) {
    if (b.classList.contains("va-vetrificato")) continue;
    if (b.textContent.trim() === "Splat 3D") {
      b.classList.add("va-vetrificato");
      b.dataset.va = "splat";
    }
  }
}

/** Mostra solo cio' che la fase prevede. */
function applicaFase() {
  const zone = typeof window.__veritasGetNodes === "function"
    ? (window.__veritasGetNodes() || []).length : 0;
  const f = fase({ modello: !!window.__veritasModelRoot, zone });
  const ammessi = visibiliInFase(f);
  // va-dock-tab NON va in questa lista: da quando vive dentro il rail, la sua
  // visibilita' e' quella del rail. Elencandolo qui prendeva va-fuori-fase in
  // ogni fase, cioe' restava sempre invisibile e non cliccabile.
  const tutti = ["vaio-brand", "vaio-toolbar", "vaio-upload-wrap", "va-rail"];
  for (const id of tutti) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("va-fuori-fase", !ammessi.includes(id));
  }
  return f;
}

/**
 * LA RICONCILIAZIONE.
 *
 * Prima questo modulo si agganciava a window.__veritasOnModelLoaded avvolgendolo.
 * Misurato: non basta -- 32 secondi dopo il caricamento del modello la fase era
 * ancora "ingresso", il rail non era comparso e i tastini erano ancora spenti.
 * Il gancio o non veniva chiamato o veniva riassegnato da qualcun altro, e da
 * fuori non si puo' sapere quale delle due.
 *
 * Quindi non si aggancia niente: si GUARDA lo stato osservabile e si allinea
 * l'interfaccia. E' lo stesso principio del §13.3 -- guardare il risultato, non
 * ipotizzare come viene prodotto -- ed e' anche l'unica strategia che non si
 * rompe quando il resto del codice cambia.
 *
 * Costa poco: qualche getElementById e un confronto di stringhe. Il rail si
 * ridisegna solo quando l'insieme dei tastini attivi cambia davvero, e
 * l'inquadratura si rifa' solo quando il modello e' un altro oggetto.
 */
let ultimaChiave = "";
let ultimoModello = null;
// Contatori: quando la fase resta indietro si guarda qui, non si tira a indovinare.
const spia = { giri: 0, allineamenti: 0, inquadrature: 0, ultimoErrore: null };

function chiaveStato() {
  const zone = typeof window.__veritasGetNodes === "function"
    ? (window.__veritasGetNodes() || []).length : 0;
  return [
    !!window.__veritasModelRoot,
    !!window.__veritasVisuale,
    !!window.__veritasNormative,
    zone >= 2,
  ].join("|");
}

function riconcilia() {
  const passo = () => {
    spia.giri++;
    try {
      vetrifica();
      const chiave = chiaveStato();
      if (chiave !== ultimaChiave) {
        ultimaChiave = chiave;
        disegnaRail();
        applicaFase();
        spia.allineamenti++;
      }
      const modello = window.__veritasModelRoot || null;
      if (modello && modello !== ultimoModello) {
        ultimoModello = modello;
        // La scala puo' cambiare dopo il caricamento (il modello di prova viene
        // riscalato 6x): si inquadra un attimo dopo, non durante.
        setTimeout(() => { inquadra(); telaPiena(); spia.inquadrature++; }, 500);
      }
    } catch (e) {
      // Un errore qui non deve fermare il battito: senza try il primo intoppo
      // spegnerebbe la riconciliazione per sempre, in silenzio.
      spia.ultimoErrore = String(e && e.message ? e.message : e);
    }
  };
  passo();
  setInterval(passo, 700);
}

function applica() {
  stile();
  disegnaRail();
  apriDock(false);
  segueConsole();
  unPannelloPerVolta();
  applicaFase();
  telaPiena();

  // La tela nasce tardi (dopo "Avvia simulazione"): si aspetta che compaia,
  // invece di indovinare quando.
  if (typeof MutationObserver === "function") {
    new MutationObserver(() => {
      if (document.querySelector("canvas") !== telaSeguita) { telaPiena(); applicaFase(); }
    }).observe(document.body, { childList: true, subtree: true });
  }

  window.addEventListener("resize", () => { applicaFase(); });
  riconcilia();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(applica, 600));
  } else {
    setTimeout(applica, 600);
  }
}

export default {
  inquadratura, schermoPerso, fase, visibiliInFase, stratiAttivabili,
  applica, inquadra, telaPiena, apriDock, FASI, STRATI,
  diagnostica: () => ({ ...spia, chiave: chiaveStato(), ultimaChiave }),
};
