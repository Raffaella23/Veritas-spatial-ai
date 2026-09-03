// ===========================================================================
// VERITAS — L'ANTEPRIMA. Vedere con gli occhi dell'AI, mentre ragiona.
// ===========================================================================
//
// A COSA SERVE, e non e' una comodita'
//
// C'e' un difetto che nessun report puo' mostrare, ed e' scritto in
// `banco/occhio.mjs`: la pianta arriva da `readRenderTargetPixels`, che
// consegna la riga 0 IN FONDO; una tela la vuole IN CIMA. Se le due
// convenzioni non combaciano, ogni nome finisce sul lato opposto
// dell'edificio.
//
//     nomi plausibili + tutti specchiati + nessun errore da nessuna parte
//
// Il referto direbbe «7 volumi nominati, fiducia 82%» e sarebbe una bugia
// perfetta — la stessa specie dei KPI finti. L'unico strumento che la vede in
// mezzo secondo e' un occhio umano davanti all'immagine vera.
//
// COSA MOSTRA, in tempo reale
//
//   ┌─ VERITAS · quello che vedo ────────────────── [▾] [×] ─┐
//   │                                                            │
//   │   ┌──────────────────────────────────────────────┐       │
//   │   │  LA PIANTA VERA, quella data in pasto all'occhio│      │
//   │   │                                                 │      │
//   │   │   ·  ·   ┌──────────┐ ·        ← scatole viste  │      │
//   │   │      ·   │check-in  │    ·                      │      │
//   │   │   · · ·  └──────────┘  ·  ·   ← nuvola di punti │      │
//   │   │                                  (volumi misurati)│    │
//   │   └──────────────────────────────────────────────┘       │
//   │   [✓] pianta  [✓] punti  [✓] scatole  [✓] nomi             │
//   │                                                            │
//   │   giro 1 · 34 volumi · chiedo 41 parole                    │
//   │   giro 1 · 12 scatole viste                                │
//   │   giro 1 · cervello: capito=no fiducia 45%                 │
//   │   giro 2 · chiedo anche: a baggage carousel, a gate desk   │
//   └────────────────────────────────────────────────────────┘
//
// COME SI USA — due righe, e non si tocca niente d'altro
//
//     import { anteprima } from "./veritas_anteprima.js";
//     import { comprendi, racconta } from "./veritas_comprensione.js";
//
//     const occhio = anteprima(document);          // crea il pannello
//     const c = await comprendi(occhio.collega(ctx));   // <- avvolge il ctx
//     occhio.esito(c);                             // colora i nomi trovati
//
// ⚠️ `collega` NON modifica il ctx originale: ne restituisce una copia in cui
//    `rileva` e `cervello` sono avvolti. Se togli l'anteprima, tutto
//    funziona identico. Nessun altro file e' stato toccato.
//
// ⚠️ QUI NON SI GIUDICA NIENTE. Questo modulo disegna quello che passa, e
//    basta. Se l'occhio vede male, l'anteprima mostra che vede male: non
//    corregge, non abbellisce, non riordina. Un pannello che «aggiusta» la
//    figura sarebbe peggio di non averlo.
//
//     node --check veritas_anteprima.js
//
// ===========================================================================

import { piantaInTela } from "./veritas_riconosce.js";
import { mondoAPixel } from "./veritas_vista.js";

const COLORI = {
  sfondo: "#12141a",
  testo: "#e8eaf0",
  tenue: "#8b91a3",
  punto: "#6b7a99",        // volume misurato, ancora senza nome
  puntoNome: "#3ddc97",    // volume che ha ricevuto un nome
  scatola: "#ff8c42",      // cosa l'occhio dice di aver visto
  bordo: "#2a2e3a",
};

// ---------------------------------------------------------------------------
// 1. Il pannello
// ---------------------------------------------------------------------------

export function anteprima(doc, opz = {}) {
  if (!doc || !doc.createElement) {
    // Nessun documento (sandbox, test): si restituisce un guscio inerte, cosi'
    // il codice chiamante non deve sapere se il pannello c'e' o no.
    return guscioInerte();
  }

  const stato = {
    pianta: null,          // la tela con l'immagine vera
    inquadratura: null,
    posti: [],             // i volumi misurati
    nomi: new Map(),       // indice del volume -> nome assegnato
    scatole: [],           // { xmin,ymin,xmax,ymax, label, score, giro }
    mostra: { pianta: true, punti: true, scatole: true, nomi: true },
    // ⚠️ TUTTE le immagini che l'AI riceve, non solo la pianta. Deciso da
    //    Raffaella il 26/08: il pannello si chiama «quello che vedo» e ne
    //    mostrava una su N, quindi guardandolo non si poteva capire se un
    //    difetto stesse nella pianta, negli scorci o nel cervello.
    viste: [],
    vista: 0,
  };

  const radice = doc.createElement("div");
  radice.id = "veritas-anteprima";
  // ⚠️ DOVE STA, e perche' non e' un dettaglio.
  //
  // Stava in basso a destra (bottom:16) con z-index 99999: cioe' sopra la barra
  // del tempo e sopra i quattro riquadri dei numeri, e sopra qualunque altra
  // cosa. 👁️ Raffaella, 02/09: «il posizionamento deve essere
  // controllato, non deve sovrapporsi ad altri elementi».
  //
  // La regola in questo progetto e' gia' scritta, in index.html accanto al
  // dock: «i comandi stanno tutti a sinistra e i pannelli si aprono a destra».
  // Questo e' un pannello, quindi sta nella colonna di destra sotto la barra
  // dei comandi. E lo z-index scende da 99999 a 9100: sopra il pannello dei
  // punti, sotto gli avvisi e sotto i dati di progetto. Rincorrere gli z-index
  // e' come si e' arrivati a 99999.
  radice.style.cssText = [
    "position:fixed", "right:16px", "top:64px", "width:min(440px,38vw)",
    "max-height:calc(100vh - 96px)", "overflow:auto", "z-index:9100",
    "background:" + COLORI.sfondo, "color:" + COLORI.testo,
    "border:1px solid " + COLORI.bordo, "border-radius:10px",
    "font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace",
    "box-shadow:0 8px 32px rgba(0,0,0,.5)",
  ].join(";");

  // ⚠️ QUEL 64px SOPRA E' UN VALORE DI PARTENZA, NON LA POSIZIONE.
  //
  // 64 era il bordo basso della pillola VERITAS quando la pillola stava a
  // top:16. Ma sotto i 1024px il bundle mostra anche la sua fila di tab
  // telecamera in cima alla pagina, la pillola scende sotto quella fila, e 64
  // non e' piu' il bordo di niente: la finestra finisce sopra le linguette.
  // Fotografato da Raffaella. Quindi si misura la pillola invece di
  // indovinare - e' gia' lei a misurare la fila - con lo stesso schema di
  // veritasPositionTopbar e veritasPositionChat in index.html: subito, poi
  // ogni secondo e a ogni ridimensionamento.
  const seguiLaPillola = () => {
    if (!radice.isConnected) return;
    const pillola = doc.getElementById("vaio-topbar");
    const r = pillola ? pillola.getBoundingClientRect() : null;
    const alto = r && r.height > 0 ? Math.round(r.bottom + 8) : 64;
    radice.style.top = alto + "px";
    radice.style.maxHeight = "calc(100vh - " + (alto + 32) + "px)";
  };
  seguiLaPillola();
  setInterval(seguiLaPillola, 1000);
  (doc.defaultView || window).addEventListener("resize", seguiLaPillola);

  // --- intestazione, con apri/chiudi ---------------------------------------
  const testa = doc.createElement("div");
  testa.style.cssText = "display:flex;align-items:center;gap:8px;padding:8px 10px;"
    + "background:#1a1d26;border-bottom:1px solid " + COLORI.bordo + ";cursor:default";
  const titolo = doc.createElement("span");
  titolo.textContent = "VERITAS · quello che vedo";
  titolo.style.cssText = "flex:1;font-weight:600;letter-spacing:.02em";
  const bPiega = bottone(doc, "▾", "apri e chiudi");
  const bChiudi = bottone(doc, "×", "chiudi del tutto");
  testa.append(titolo, bPiega, bChiudi);

  // --- corpo ----------------------------------------------------------------
  const corpo = doc.createElement("div");
  corpo.style.cssText = "padding:10px";

  const tela = doc.createElement("canvas");
  tela.width = 500; tela.height = 320;
  tela.style.cssText = "width:100%;display:block;background:#0b0d12;"
    + "border:1px solid " + COLORI.bordo + ";border-radius:6px;image-rendering:pixelated";

  const interruttori = doc.createElement("div");
  interruttori.style.cssText = "display:flex;gap:12px;padding:8px 2px;color:" + COLORI.tenue;
  for (const [chiave, etichetta] of [["pianta", "pianta"], ["punti", "punti"],
                                     ["scatole", "scatole"], ["nomi", "nomi"]]) {
    const l = doc.createElement("label");
    l.style.cssText = "display:flex;align-items:center;gap:4px;cursor:pointer;user-select:none";
    const cb = doc.createElement("input");
    cb.type = "checkbox"; cb.checked = true;
    cb.addEventListener("change", () => { stato.mostra[chiave] = cb.checked; disegna(); });
    l.append(cb, doc.createTextNode(etichetta));
    interruttori.appendChild(l);
  }

  // --- il selettore delle viste --------------------------------------------
  const barraViste = doc.createElement("div");
  barraViste.style.cssText = "display:flex;align-items:center;gap:8px;"
    + "padding:0 2px 8px;color:" + COLORI.tenue;
  const etichettaViste = doc.createElement("span");
  etichettaViste.textContent = "vista:";
  const scelta = doc.createElement("select");
  scelta.style.cssText = "flex:1;background:#0b0d12;color:" + COLORI.testo
    + ";border:1px solid " + COLORI.bordo + ";border-radius:6px;padding:3px 6px;"
    + "font:12px ui-monospace,SFMono-Regular,Menlo,monospace";
  scelta.addEventListener("change", function () {
    stato.vista = Number(scelta.value) || 0;
    disegna();
  });
  barraViste.append(etichettaViste, scelta);

  const diario = doc.createElement("div");
  diario.style.cssText = "max-height:150px;overflow-y:auto;padding-top:6px;"
    + "border-top:1px solid " + COLORI.bordo + ";color:" + COLORI.tenue;

  // ⚠️ IL DIARIO NON SI APPENDE PIU', ed e' voluto.
  //
  // 👁️ Raffaella, 02/09: «le domande dell'occhio servono, ma
  // l'utente non le deve vedere: un conto e' il dato che serve all'AI, un conto
  // e' quello che facciamo vedere all'utente». Le domande sono il ragionamento
  // in corso — «GUARDA LA FIGURA: i nomi stanno sopra le cose giuste?» — e in
  // questa finestra non c'e' modo di rispondere: chi legge si confonde e basta.
  //
  // L'elemento resta VIVO e continua a ricevere tutto: chi scrive nel diario
  // non cambia una riga, e da console si legge con
  // `window.__veritasDiarioOcchio.textContent`. Cambia solo che non sta a
  // schermo. Le immagini, gli interruttori e il selettore delle viste restano
  // dov'erano: sono cio' che l'occhio VEDE, e quello si guarda.
  corpo.append(barraViste, tela, interruttori);
  if (typeof window !== "undefined") window.__veritasDiarioOcchio = diario;
  radice.append(testa, corpo);
  (doc.body || doc.documentElement).appendChild(radice);
  aggiornaScelta();

  let piegato = false;
  bPiega.addEventListener("click", () => {
    piegato = !piegato;
    corpo.style.display = piegato ? "none" : "block";
    bPiega.textContent = piegato ? "▸" : "▾";
  });
  bChiudi.addEventListener("click", () => radice.remove());

  // --- disegno --------------------------------------------------------------
  function disegna() {
    const c = tela.getContext("2d");
    c.clearRect(0, 0, tela.width, tela.height);
    const v = stato.viste[stato.vista] || null;
    if (!v || !v.tela) {
      c.fillStyle = COLORI.tenue; c.font = "12px monospace";
      c.fillText("in attesa della prima occhiata…", 14, 26);
      return;
    }

    // L'immagine occupa la tela mantenendo le proporzioni: la scala vale poi
    // per tutto il resto, cosi' punti e scatole restano dove devono stare.
    const s = Math.min(tela.width / v.tela.width, tela.height / v.tela.height);
    const ox = (tela.width - v.tela.width * s) / 2;
    const oy = (tela.height - v.tela.height * s) / 2;

    if (stato.mostra.pianta) {
      c.drawImage(v.tela, ox, oy, v.tela.width * s, v.tela.height * s);
    }

    // ⚠️ Punti, scatole e nomi vivono nel sistema di coordinate DELLA PIANTA
    //    (pixel -> metri, via `inquadratura`). Su uno scorcio in prospettiva
    //    quelle coordinate non vogliono dire niente: disegnarceli sopra
    //    metterebbe riquadri credibili nel posto sbagliato, cioe' proprio il
    //    difetto che questo pannello esiste per far vedere. Quindi su uno
    //    scorcio si mostra l'immagine nuda, e lo si scrive.
    if (v.tipo !== "pianta") {
      c.fillStyle = COLORI.tenue; c.font = "11px monospace";
      c.fillText(v.etichetta + " \u2014 prospettiva: niente punti ne' scatole", 8, 14);
      return;
    }

    // --- la nuvola di punti: i volumi MISURATI --------------------------
    // Sono l'unica cosa certa in tutta la scena: la geometria dice dove.
    if (stato.mostra.punti && stato.inquadratura) {
      for (let i = 0; i < stato.posti.length; i++) {
        const p = stato.posti[i];
        const px = mondoAPixel(stato.inquadratura, p.centro[0], p.centro[2]);
        if (!px) continue;                       // il volume cade fuori dalla pianta
        const nome = stato.nomi.get(i);
        const x = ox + px[0] * s, y = oy + px[1] * s;
        const r = Math.max(2, Math.min(6, Math.sqrt(p.area || 1) * s * 0.25));
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
        c.fillStyle = nome ? COLORI.puntoNome : COLORI.punto;
        c.globalAlpha = nome ? 0.95 : 0.55;
        c.fill(); c.globalAlpha = 1;

        if (nome && stato.mostra.nomi) {
          c.font = "10px monospace"; c.fillStyle = COLORI.puntoNome;
          c.fillText(nome, x + r + 3, y + 3);
        }
      }
    }

    // --- le scatole: cosa l'occhio DICE di aver visto -------------------
    if (stato.mostra.scatole) {
      c.lineWidth = 1.5;
      for (const b of stato.scatole) {
        const x = ox + b.xmin * s, y = oy + b.ymin * s;
        const w = (b.xmax - b.xmin) * s, h = (b.ymax - b.ymin) * s;
        c.strokeStyle = COLORI.scatola;
        c.globalAlpha = 0.35 + 0.65 * Math.min(1, b.score / 0.5);
        c.strokeRect(x, y, w, h);
        if (stato.mostra.nomi) {
          c.font = "10px monospace"; c.fillStyle = COLORI.scatola;
          c.fillText(b.label + " " + Math.round(b.score * 100) + "%", x + 2, y - 3);
        }
        c.globalAlpha = 1;
      }
    }
  }

  function aggiornaScelta() {
    while (scelta.firstChild) scelta.removeChild(scelta.firstChild);
    if (!stato.viste.length) {
      const o = doc.createElement("option");
      o.textContent = "nessuna immagine ancora";
      scelta.appendChild(o);
      scelta.disabled = true;
      return;
    }
    scelta.disabled = false;
    for (let i = 0; i < stato.viste.length; i++) {
      const o = doc.createElement("option");
      o.value = String(i);
      o.textContent = (i + 1) + "/" + stato.viste.length + "  " + stato.viste[i].etichetta;
      scelta.appendChild(o);
    }
    scelta.value = String(stato.vista);
  }

  function riga(testo, colore) {
    const d = doc.createElement("div");
    d.textContent = testo;
    if (colore) d.style.color = colore;
    diario.appendChild(d);
    diario.scrollTop = diario.scrollHeight;
  }

  // -------------------------------------------------------------------------
  // 2. L'avvolgimento: si mette in mezzo senza cambiare niente
  // -------------------------------------------------------------------------

  function collega(ctx) {
    stato.posti = ctx.posti || [];
    stato.inquadratura = ctx.inquadratura || null;

    // La pianta VERA, passata per la stessa conversione che usa il programma.
    // ⚠️ Se `piantaInTela` capovolge le righe, l'anteprima lo capovolge
    //    uguale: e' il punto. Un'anteprima che raddrizza da sola nasconde
    //    esattamente il difetto che deve mostrare.
    stato.viste = [];
    try {
      stato.pianta = piantaInTela(ctx.pianta, doc);
      if (stato.pianta) {
        stato.viste.push({ etichetta: "pianta dall'alto", tela: stato.pianta, tipo: "pianta" });
      }
    } catch (e) {
      riga("non ho potuto disegnare la pianta: " + (e && e.message), COLORI.scatola);
    }

    // Gli scorci: le stesse immagini che partono verso il cervello, nello
    // stesso ordine. Se qui non ne compare nessuno, il cervello sta
    // giudicando l'edificio con la sola pianta — ed e' un'informazione.
    const scorci = ctx.scorci || [];
    for (let i = 0; i < scorci.length; i++) {
      try {
        const t = piantaInTela(scorci[i], doc);
        if (!t) continue;
        const gradi = typeof scorci[i].azimuth === "number"
          ? Math.round(scorci[i].azimuth * 180 / Math.PI) : null;
        stato.viste.push({
          etichetta: "scorcio " + (i + 1) + (gradi == null ? "" : " \u2014 " + gradi + "\u00b0"),
          tela: t, tipo: "scorcio",
        });
      } catch (e) { /* uno scorcio illeggibile non deve spegnere il pannello */ }
    }

    stato.vista = 0;
    aggiornaScelta();
    riga(stato.posti.length + " volumi misurati, " + stato.viste.length
      + (stato.viste.length === 1 ? " immagine" : " immagini")
      + " verso il cervello, in attesa dell'occhio");
    disegna();

    const rilevaVero = ctx.rileva, cervelloVero = ctx.cervello;
    let giro = 0;

    return {
      ...ctx,

      rileva: async function (immagine, parole) {
        giro++;
        riga("giro " + giro + " · chiedo " + parole.length + " parole");
        const grezze = await rilevaVero(immagine, parole);

        for (const g of (grezze || [])) {
          if (!g || !g.box) continue;
          let { xmin, ymin, xmax, ymax } = g.box;
          // stessa ambiguita' di `scatolaInMondo`: pixel oppure 0..1
          if (Math.max(xmin, ymin, xmax, ymax) <= 1.001 && stato.pianta && stato.pianta.width > 2) {
            xmin *= stato.pianta.width;  xmax *= stato.pianta.width;
            ymin *= stato.pianta.height; ymax *= stato.pianta.height;
          }
          stato.scatole.push({ xmin, ymin, xmax, ymax, label: g.label, score: g.score, giro });
        }
        riga("giro " + giro + " · " + (grezze ? grezze.length : 0) + " scatole viste",
             COLORI.scatola);
        disegna();
        return grezze;
      },

      cervello: async function (domanda, extra) {
        const risposta = await cervelloVero(domanda, extra);
        // Si legge solo per il diario: il verdetto vero lo giudica
        // `veritas_comprensione.js`, non questo pannello.
        const m = String(risposta || "").match(/"capito"\s*:\s*(true|false)/);
        const f = String(risposta || "").match(/"fiducia"\s*:\s*([0-9.]+)/);
        riga("giro " + giro + " · cervello: capito=" + (m ? (m[1] === "true" ? "si" : "no") : "?")
          + (f ? " fiducia " + Math.round(parseFloat(f[1]) * 100) + "%" : ""));
        return risposta;
      },

      onGiro: function (info) {
        if (info && info.paroleChieste && info.paroleChieste.length) {
          riga("giro " + (info.giro + 1) + " · chiedo anche: " + info.paroleChieste.join(", "));
        }
        if (typeof ctx.onGiro === "function") ctx.onGiro(info);
      },
    };
  }

  // -------------------------------------------------------------------------
  // 3. La fine: si colorano i volumi che hanno ricevuto un nome
  // -------------------------------------------------------------------------

  function esito(c) {
    if (!c) return;
    stato.nomi.clear();
    (c.posti || []).forEach((p, i) => { if (p.nome) stato.nomi.set(i, p.nome); });
    riga("");
    riga(c.capito
      ? "✅ capito" + (c.cosaE ? ": " + c.cosaE : "") + " — fiducia "
        + Math.round(c.fiducia * 100) + "%"
      : "❓ non capito — " + (c.perche || ""),
      c.capito ? COLORI.puntoNome : COLORI.scatola);
    if (c.domandaUmana) riga("💬 " + c.domandaUmana, COLORI.testo);
    riga("");
    riga("GUARDA LA FIGURA: i nomi stanno sopra le cose giuste?");
    riga("Se sono tutti sul lato sbagliato, la pianta e' specchiata.", COLORI.tenue);
    disegna();
  }

  return { radice, collega, esito, disegna, stato, riga };
}

// ---------------------------------------------------------------------------
// 4. Il guscio inerte, per quando non c'e' una finestra
// ---------------------------------------------------------------------------

function guscioInerte() {
  return {
    radice: null,
    collega: (ctx) => ctx,
    esito: () => {},
    disegna: () => {},
    riga: () => {},
    stato: null,
  };
}

function bottone(doc, testo, titolo) {
  const b = doc.createElement("button");
  b.textContent = testo; b.title = titolo;
  b.style.cssText = "background:none;border:1px solid " + COLORI.bordo + ";color:"
    + COLORI.tenue + ";width:22px;height:22px;border-radius:4px;cursor:pointer;"
    + "font:14px/1 monospace;padding:0";
  return b;
}

export default { anteprima };
