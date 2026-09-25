// veritas_regia.js — L'OCCHIO REGISTA (HANDOFF §0.5 e §12, passo D)
// =============================================================================
//
// Raffaella, 25/09/2026: «una telecamera guidata dall'AI che si avvicina al
// modello, non alle immagini, al modello proprio, e guarda gli oggetti da
// vicino [...] Immaginati una regia cinematografica: un carrello che si muove,
// e zoom. [...] Dovrebbe uscire il pannello laterale con la scritta "sedia" e
// il ragionamento: in questo posto la gente potrà sostare.»
//
// E lo stesso giorno, sull'ordine: «deve essere un unico film, con vari livelli
// di lettura: prima la zonizzazione, poi gli zoom sugli oggetti, dopo l'analisi».
// Per questo la regia parte PRIMA del giro di comprensione (veritas_montaggio.js
// la aspetta), e il velo la mostra fra lo stato «zone» e la conformità.
//
// COSA FA, per ogni fermata:
//   1. sceglie un TIPO intero (veritas_cose `tipiInteri`): la geometria dice
//      dove sono le copie, mai cosa sono (§0.4); nessun nome di mesh (0-bis);
//   2. lo inquadra DA SOLO, di lato, col suo giro d'aria (`scorciTreQuarti`
//      con `isola`) e annuncia la fermata (`veritas:fermata`) con la STESSA
//      telecamera e la STESSA immagine che vanno all'occhio: quello che il
//      cliente vede e' quello che l'occhio guarda (§0.5);
//   3. l'occhio guarda UNA volta, col vocabolario intero; il nome e' la
//      rilevazione piu' forte che copre almeno il 5% dell'inquadratura;
//   4. il nome passa a tutte le copie (`nominaIlTipo`) con la conseguenza del
//      vocabolario, e si annuncia (`veritas:nome`) col ragionamento a parole.
//
// L'ORDINE DELLE FERMATE: copie × impronta a terra. E' la superficie di
// pavimento che quel tipo occupa, cioe' quanto pesa per chi cammina e sosta.
// Misurato il 25/09 sul terminal: in cima banconi, sedute e chioschi; le
// sagome di persone (sottili) restano in fondo senza doverle riconoscere.
//
// MANOPOLE
//   window.__veritasRegiaAuto = false    non parte da sola
//   window.__veritasRegiaFermate         quante fermate (default 6)
//   window.__veritasRegiaTetto           ms massimi di tutta la regia (default 180000)
//
// ESITI: window.__veritasCoseNominate (tutte le copie con nome),
//        window.__veritasSedute (le copie dove ci si siede: §6.19, passo E).
// =============================================================================

const FERMATE = 6;
const TETTO_MS = 180000;
const COPERTURA_MINIMA = 0.05;

function log(m) { try { console.log("[VERITAS regia] " + m); } catch (e) {} }

/** A misura d'uomo e appoggiato a terra: le soglie del passo A (§12.5). */
export function contaPerChiCammina(t) {
  const lato = Math.max(t.misura[0], t.misura[2]);
  return t.copie.length >= 2 && lato >= 0.3 && lato <= 6
    && t.misura[1] >= 0.2 && t.misura[1] <= 3 && t.stacco <= 0.3;
}

/** Le fermate, nell'ordine della superficie di pavimento occupata. */
export function scegliFermate(tipi, quante = FERMATE) {
  return (tipi || []).filter(contaPerChiCammina)
    .map((t) => ({ t, peso: t.copie.length * t.misura[0] * t.misura[2] }))
    .sort((a, b) => b.peso - a.peso).slice(0, quante).map((x) => x.t);
}

// ⚠️ IL SECONDO SGUARDO — Raffaella, 25/09: un nome che fa SEDERE la gente
//    (o sdraiare) si conferma guardando dal lato opposto, cioe' anche dal
//    davanti. Misurato quel giorno: su 6 fermate l'occhio ha detto «servizi
//    igienici» su un oggetto che non lo era, e sarebbero stati 6 posti a sedere
//    falsi nella simulazione. Se il secondo sguardo non conferma, il nome resta
//    ma perde la conseguenza. Costa uno sguardo in piu' solo per quei tipi.
export const DA_CONFERMARE = new Set(["seduto", "sdraiato"]);

/** Il nome della cosa inquadrata: la rilevazione piu' forte che la copre davvero. */
export function nomeInquadrato(rilevazioni, larghezza, altezza) {
  const area = larghezza * altezza;
  return (rilevazioni || []).filter((r) => {
    const b = r.box || {};
    const s = Math.max(b.xmax, b.ymax) <= 1.001 ? [larghezza, altezza] : [1, 1];
    return (b.xmax - b.xmin) * s[0] * (b.ymax - b.ymin) * s[1] >= COPERTURA_MINIMA * area;
  }).sort((a, b) => b.score - a.score)[0] || null;
}

const maiuscola = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Il ragionamento, a parole. Non si inventa: e' la CONSEGUENZA gia' scritta
 * nel vocabolario (POSTURA_DI, PASSO_DI, FUNZIONE_DI) detta in italiano.
 */
export function ragionamento(voce, copie) {
  if (!voce) return "Non l'ho riconosciuto: resta misurato, senza nome.";
  if (voce.nonConfermato) return maiuscola(voce.nome || voce.termine || "oggetto") + (copie > 1 ? ", " + copie + " in tutto" : "")
    + ". Guardato anche dal davanti non l'ho confermato: non lo conto come posto a sedere.";
  const nome = maiuscola(voce.nome || voce.termine || "oggetto");
  const quante = copie > 1 ? ", " + copie + " in tutto" : "";
  if (voce.controprova) return nome + quante + ". Sono figure di persone: danno la misura, non una funzione.";
  if (voce.postura === "seduto") return nome + quante + ". In questo posto la gente potrà sostare seduta.";
  if (voce.postura === "sdraiato") return nome + quante + ". Qui ci si sdraia.";
  if (voce.postura === "in piedi") return nome + quante + ". Qui ci si ferma in piedi, davanti.";
  if (voce.postura === "passa") return nome + quante + ". Qui si passa.";
  if (voce.passo === "a terra") return nome + quante + ". Si cammina sopra: indica la direzione.";
  if (voce.funzione) return nome + quante + ". Dice che qui c'è: " + voce.funzione + ".";
  return nome + quante + ".";
}

function annuncia(tipo, dettaglio) {
  try { window.dispatchEvent(new CustomEvent(tipo, { detail: dettaglio })); } catch (e) {}
}

function inImmagine(R, sc) {
  const tela = document.createElement("canvas");
  tela.width = sc.larghezza; tela.height = sc.altezza;
  const g = tela.getContext("2d");
  g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, tela.width, tela.height);
  g.drawImage(R.piantaInTela(sc), 0, 0);
  return tela;
}

let inCorso = null;

export async function regia(opz = {}) {
  if (inCorso) return inCorso;
  inCorso = (async () => {
    const t0 = Date.now();
    const tetto = opz.tetto || window.__veritasRegiaTetto || TETTO_MS;
    const THREE = window.THREE, radice = window.__veritasModelRoot, rend = window.__veritasRenderer;
    const C = window.__veritasCose, V = window.__veritasVista, R = window.__veritasRiconosce;
    if (!THREE || !radice || !rend || !C || !V || !R || typeof C.tipiInteri !== "function")
      return { ok: false, perche: "manca la scena, le cose o l'occhio" };
    const rileva = await Promise.race([R.occhioLocale(), new Promise((r) => setTimeout(() => r(null), tetto))]);
    if (!rileva) return { ok: false, perche: "l'occhio non si e' acceso" };

    const tipi = C.tipiInteri(C.inventarioDaScena(THREE, radice));
    const fermate = scegliFermate(tipi, opz.fermate || window.__veritasRegiaFermate || FERMATE);
    const voci = R.vocabolarioPer(window.__veritasDominio || "aeroporto");
    const perParola = new Map(voci.map((v) => [v.chiedi, v]));
    const parole = voci.map((v) => v.chiedi);
    log(tipi.length + " tipi interi, " + fermate.length + " fermate");
    annuncia("veritas:regia", { fase: "inizio", quante: fermate.length, tipi: tipi.length });

    const nominate = [], esiti = [];
    // una fermata: la telecamera va, il cliente vede, l'occhio guarda
    // ⚠️ Nella CONFERMA niente giro d'aria (misurato il 25/09): le file di
    //    sedute stanno schiena contro schiena, e dal davanti la fila accanto,
    //    dentro il metro d'aria, copriva la seduta. Si guarda l'oggetto e basta.
    const guardaDa = async (i, t, c0, scartoGradi) => {
      const giroDAria = scartoGradi ? 0.05 : 1;
      const sc = V.scorciTreQuarti(THREE, rend, radice, { bersaglio: { min: c0.min, max: c0.max },
        diLato: true, scartoGradi, numeroScorci: 1, conLuce: true, elevazioneGradi: 25, isola: true, giroDAria })[0];
      if (!sc) return null;
      const tela = inImmagine(R, sc);
      annuncia("veritas:fermata", { indice: i, quante: fermate.length, min: c0.min, max: c0.max,
        centro: c0.centro, camera: sc.camera, copie: t.copie.length, conferma: scartoGradi !== 0, giroDAria,
        immagine: tela.toDataURL("image/jpeg", 0.8) });
      const ril = await rileva(tela, parole);
      const primo = nomeInquadrato(ril, tela.width, tela.height);
      return { primo, voce: primo ? perParola.get(primo.label) : null };
    };

    for (let i = 0; i < fermate.length; i++) {
      if (Date.now() - t0 > tetto) { log("tetto raggiunto dopo " + i + " fermate"); break; }
      const t = fermate[i], c0 = t.copie[0];
      const a = Date.now();
      const visto = await guardaDa(i, t, c0, 0);
      if (!visto) continue;
      const primo = visto.primo;
      let voce = visto.voce;
      // ⚠️ SPENTA di serie (25/09): dal lato opposto la seduta del terminal non si
      //    conferma (fila schiena contro schiena, poi «base»), e toglieva i posti
      //    veri. Si riaccende con window.__veritasRegiaConferma = true.
      if (window.__veritasRegiaConferma === true && voce && DA_CONFERMARE.has(voce.postura) && Date.now() - t0 <= tetto) {
        const di2 = await guardaDa(i, t, c0, 180);
        const ok = !!(di2 && di2.voce && di2.voce.postura === voce.postura);
        log((i + 1) + ": «" + voce.nome + "» dal davanti " + (ok ? "confermato" : "NON confermato")
          + (di2 && di2.primo ? " (" + di2.primo.label + " " + di2.primo.score.toFixed(2) + ")" : ""));
        if (!ok) voce = Object.assign({}, voce, { postura: null, funzione: null, nonConfermato: true });
      }
      const copie = voce ? C.nominaIlTipo(t, voce, { fiducia: primo.score }) : [];
      nominate.push(...copie);
      const esito = { indice: i, quante: fermate.length, min: c0.min, max: c0.max,
        nome: voce ? voce.nome : null, termine: voce ? voce.termine : null,
        postura: voce ? voce.postura || null : null, fiducia: primo ? +primo.score.toFixed(2) : null,
        copie: t.copie.map((c) => c.centro), ragionamento: ragionamento(voce, t.copie.length),
        sguardoMs: Date.now() - a };
      esiti.push(esito);
      log((i + 1) + "/" + fermate.length + ": " + esito.ragionamento
        + (primo ? " (" + primo.label + " " + esito.fiducia + ")" : "") + " — " + esito.sguardoMs + " ms");
      annuncia("veritas:nome", esito);
    }
    window.__veritasCoseNominate = nominate;
    window.__veritasSedute = nominate.filter((n) => n.postura === "seduto");
    const ms = Date.now() - t0;
    log("finita in " + Math.round(ms / 1000) + " s: " + esiti.filter((e) => e.nome).length + "/" + esiti.length
      + " tipi nominati, " + nominate.length + " copie col nome, " + window.__veritasSedute.length + " sedute");
    annuncia("veritas:regia", { fase: "fine", esiti, ms });
    return { ok: true, esiti, nominate: nominate.length, sedute: window.__veritasSedute.length, ms };
  })();
  try {
    const r = await inCorso;
    if (!r.ok) { log("non parte: " + r.perche); annuncia("veritas:regia", { fase: "fine", ok: false, perche: r.perche }); }
    return r;
  } catch (e) {
    annuncia("veritas:regia", { fase: "fine", ok: false, perche: (e && e.message) || String(e) });
    throw e;
  } finally { inCorso = null; }
}

if (typeof window !== "undefined") window.__veritasRegia = regia;

export default { regia, scegliFermate, nomeInquadrato, ragionamento, contaPerChiCammina };
