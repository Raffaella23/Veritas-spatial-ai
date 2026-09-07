// veritas_passo.js — L'OCCHIO GUARDA DOVE GUARDA CHI CAMMINA.
// =============================================================================
//
// Raffaella, 07/09/2026 (direttiva 19): *«se abbiamo dei problemi di
// tempistica: l'occhio dell'osservatore che si muove nello spazio, quello che
// vediamo nella live view, deve renderizzare pian piano che cammina, man mano
// che si muove, in maniera tale che non deve mettere in memoria tutto un giro.
// Tutti i programmi di rendering che vogliono fare il rendering istantaneo
// lavorano su quello che vede l'osservatore in quel momento. Quello che c'e'
// alle sue spalle non viene analizzato. Tutti cosi' lavorano.»*
//
// ⚠️ IL PROBLEMA CHE SCIOGLIE, e non e' un'ottimizzazione. Il giro di prima
//    prepara tutte le viste del modello e poi le manda all'occhio in mazzetti:
//    finche' non ha finito, **nessuno ha in mano niente**. Misurato sul banco
//    di prova: sette-otto minuti prima della prima testimonianza, e in quei
//    minuti gli spazi, il confine dentro/fuori e gli accessi sono gia' stati
//    decisi senza l'occhio. Qui invece **una fotografia sola, da dove il corpo
//    e' adesso**, vale da sola: la testimonianza arriva dove il corpo e',
//    mentre ci arriva.
//
// ⚠️ E NON SI COSTRUISCE NIENTE DI NUOVO. La fotografia la fa
//    `veritas_vista.js` (`vistaDalCamminatore`), la regione la misura
//    l'isovista di `veritas_visibility.js`, le parole e le loro conseguenze le
//    legge `occhioSuTutteLeViste` come per ogni altra vista, e chi rifa'
//    l'analisi quando l'occhio parla e' gia' `veritas_comando.js`. Questo file
//    tiene il passo e basta: **decide QUANDO scattare, non che cosa vale.**
//
// ⚠️ LA REGOLA 0 REGGE. Da una prospettiva non si ricava una posizione: da qui
//    non esce nessun `centro`, mai. Esce una REGIONE — il ventaglio di
//    pavimento che si vede da quel punto con quella lente — che e' misurata
//    sulla geometria PRIMA di scattare, non ricavata dai pixel.
//
//   window.__veritasPasso.unPasso()   → una vista sola, adesso, e la consegna
//   window.__veritasPasso.stato()     → quante ne ha fatte, e con che esito
//   window.__veritasPasso.accendi()   → segue il film da solo
//   window.__veritasPasso.spegni()

// ⚠️ LA VERSIONE NELL'IMPORT DEVE ESSERE LA STESSA DI `veritas_montaggio.js`.
//    Senza, il browser carica una SECONDA copia della comprensione, e due
//    copie dello stesso modulo che scrivono le stesse maniglie sono il guasto
//    del 06/09 (tre occhi accesi, a scrivere era l'ultima che finiva).
import { occhioSuTutteLeViste } from "./veritas_comprensione.js?v=9";

// ⚠️ PRIMA TARATURA, NON UNA MISURA. Vanno riviste guardando i numeri su
//    modelli veri: quanti metri di cammino portano davvero una scena nuova.
const PASSO_M = 6;         // ogni quanti metri di cammino si guarda
const MINIMO_FRA_DUE = 4000; // e mai piu' spesso di cosi': scattare + riconoscere costa secondi
const PORTATA_M = 40;      // oltre, dire «ho visto» non significa piu' niente
const LENTE = 60;          // la stessa del film (`LENTE` in veritas_cinema.js)
const OCCHIO_M = 1.65;     // l'altezza dell'uomo, come ovunque nel progetto

const S = {
  acceso: false, orologio: null, inCorso: false,
  ultimoPunto: null, ultimoIstante: 0,
  scatti: 0, testimonianze: 0, regioni: 0, mute: 0, saltati: 0,
  ultimoEsito: null, ultimoErrore: null,
};

function scena() {
  if (typeof window === "undefined") return null;
  const THREE = window.THREE, rend = window.__veritasRenderer,
        radice = window.__veritasModelRoot, vista = window.__veritasVista;
  if (!THREE || !rend || !radice || !vista) return null;
  if (typeof vista.vistaDalCamminatore !== "function") return null;
  return { THREE, rend, radice, vista };
}

/** Dove sta il corpo adesso, e dove guarda. Dal film, senza toccarlo. */
export function doveSiamo() {
  if (typeof window === "undefined") return null;
  const C = window.veritasCinema;
  if (!C || typeof C.stato !== "function") return null;
  const s = C.stato();
  if (!s || !s.aperto || !s.camera || !s.guarda) return null;
  return { posizione: s.camera, direzione: s.guarda, corre: s.corre, t: s.t };
}

/**
 * UNA vista, adesso, consegnata all'occhio.
 *
 * ⚠️ RESTITUISCE l'esito, non lo stampa e basta: una stampa ritardata arriva
 *    quando chi guardava ha gia' copiato (trappola del 06/09).
 */
export async function unPasso(opz = {}) {
  const sc = scena();
  if (!sc) return { ok: false, perche: "manca la scena, il disegnatore o la vista aggiornata" };

  const dove = opz.posizione
    ? { posizione: opz.posizione, direzione: opz.direzione || [1, 0, 0] }
    : doveSiamo();
  if (!dove) return { ok: false, perche: "il film e' chiuso: non c'e' nessun corpo che cammina" };

  const rileva = opz.rileva || window.__veritasRileva;
  if (typeof rileva !== "function")
    return { ok: false, perche: "l'occhio non e' ancora acceso in questa pagina (window.__veritasRileva)" };

  if (S.inCorso) { S.saltati++; return { ok: false, perche: "sto ancora guardando la vista di prima" }; }
  S.inCorso = true;
  try {
    const v = sc.vista.vistaDalCamminatore(sc.THREE, sc.rend, sc.radice, {
      posizione: dove.posizione, direzione: dove.direzione,
      fovGradi: opz.fovGradi || LENTE, portata: opz.portata || PORTATA_M,
      altezzaOcchio: OCCHIO_M,
      etichetta: opz.etichetta || ("da dove cammina, passo " + (S.scatti + 1)),
    });
    if (!v) { S.ultimoErrore = "la fotografia non e' uscita"; return { ok: false, perche: S.ultimoErrore }; }
    S.scatti++;

    // ⚠️ SI SEGNALA SUBITO SE LA REGIONE NON C'E'. Senza isovista questa vista
    //    e' una testimonianza senza posto nel mondo: vale per il racconto, non
    //    per il confine dentro/fuori. Dirlo e' diverso da lasciarlo credere.
    if (!v.regione)
      console.warn("[VERITAS passo] vista senza regione: l'isovista non ha misurato niente"
        + " da qui. La testimonianza vale come racconto, non come luogo.");

    // Le parole, le conseguenze e la soglia di fiducia sono quelle di sempre:
    // qui non si giudica niente di nuovo.
    const esito = await occhioSuTutteLeViste({
      rileva,
      scorci: [v],
      dominio: opz.dominio || window.__veritasProjectType || null,
    }, [v], [], false);

    const viste = (esito && esito.viste) || [];
    const regioni = (esito && esito.regioni) || [];
    S.testimonianze += viste.length;
    S.regioni += regioni.length;

    // Si deposita nello STESSO registro delle altre testimonianze: chi legge
    // non deve sapere da dove viene, e `veritas_comando.js` si sveglia da solo.
    if (typeof window !== "undefined") {
      if (regioni.length) {
        const reg = Array.isArray(window.__veritasVisteRegione) ? window.__veritasVisteRegione : [];
        window.__veritasVisteRegione = reg.concat(regioni);
      }
      if (viste.length) {
        const V = window.__veritasVisto || (window.__veritasVisto = { viste: [] });
        if (!Array.isArray(V.viste)) V.viste = [];
        V.viste = V.viste.concat(viste);
      }
    }

    const cose = viste.reduce((n, x) => n + ((x.cose || []).length), 0);
    if (!cose) S.mute++;
    // ⚠️ UNA VISTA MUTA E' UN DATO, non un fallimento da nascondere: dice che
    //    da li' non si vede niente di riconoscibile, e serve a tarare il passo.
    console.log("[VERITAS passo] " + (v.etichetta || "vista") + ": "
      + cose + " cose, " + regioni.length + " legate a una regione · "
      + (v.areaVista != null ? v.areaVista + " m² in vista" : "regione non misurata")
      + (v.pixelPerMetro ? " · " + v.pixelPerMetro + " pixel al metro a " + v.raggioMedio + " m" : "")
      + (v.quantoPiuLargo ? " · il rettangolo e' " + v.quantoPiuLargo + "× il ventaglio" : ""));

    S.ultimoEsito = { cose, regioni: regioni.length, areaVista: v.areaVista,
                      pixelPerMetro: v.pixelPerMetro, quantoPiuLargo: v.quantoPiuLargo };
    return { ok: true, vista: v, viste, regioni, cose };
  } catch (e) {
    S.ultimoErrore = (e && e.message) || String(e);
    console.warn("[VERITAS passo] il passo e' fallito: " + S.ultimoErrore);
    return { ok: false, perche: S.ultimoErrore };
  } finally {
    S.inCorso = false;
    S.ultimoIstante = Date.now();
  }
}

/** Quanto ci si e' spostati da dove si e' guardato l'ultima volta. */
function quantoCamminato(p) {
  if (!S.ultimoPunto) return Infinity;
  return Math.hypot(p[0] - S.ultimoPunto[0], p[2] - S.ultimoPunto[2]);
}

function battito() {
  if (!S.acceso || S.inCorso) return;
  const dove = doveSiamo();
  if (!dove || !dove.corre) return;
  if (Date.now() - S.ultimoIstante < MINIMO_FRA_DUE) return;
  if (quantoCamminato(dove.posizione) < PASSO_M) return;
  S.ultimoPunto = dove.posizione.slice();
  unPasso().catch(() => {});
}

export function accendi() {
  if (S.acceso) return S;
  S.acceso = true;
  S.orologio = setInterval(battito, 1000);
  console.log("[VERITAS passo] acceso — l'occhio guarda dove guarda chi cammina:"
    + " una vista ogni " + PASSO_M + " m, lente " + LENTE + "°, occhio a " + OCCHIO_M + " m.");
  return S;
}

export function spegni() {
  S.acceso = false;
  if (S.orologio) clearInterval(S.orologio);
  S.orologio = null;
  return S;
}

export function stato() { return { ...S }; }

if (typeof window !== "undefined") {
  window.__veritasPasso = { unPasso, doveSiamo, accendi, spegni, stato };
  // ⚠️ SI ACCENDE DA SOLO, ma non fa niente finche' il film e' chiuso: il
  //    battito legge lo stato del film e torna indietro. Un modulo che va
  //    acceso a mano e' un modulo che nessuno accende.
  accendi();
}

export default { unPasso, doveSiamo, accendi, spegni, stato };
