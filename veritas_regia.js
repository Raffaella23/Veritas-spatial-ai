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
//   3. l'occhio guarda UNA volta, con le sole parole che sono COSE; il nome e'
//      la rilevazione piu' forte che copre almeno il 5% dell'inquadratura;
//   4. il nome passa a tutte le copie (`nominaIlTipo`) con la conseguenza del
//      vocabolario, e si annuncia (`veritas:nome`) col ragionamento a parole.
//
// L'ORDINE DELLE FERMATE: copie × impronta a terra. E' la superficie di
// pavimento che quel tipo occupa, cioe' quanto pesa per chi cammina e sosta.
// Misurato il 25/09 sul terminal: in cima banconi, sedute e chioschi; le
// sagome di persone (sottili) restano in fondo senza doverle riconoscere.
//
// IL CATALOGO — Raffaella, 26/09/2026: «fai il catalogo da 4 oggetti per
// foglio [...] Non passare al catalogo da 9.» Deciso il 25/09 sera: l'occhio si
// ferma su TUTTI gli oggetti (non su 6) e davanti a un oggetto gli si chiedono
// solo nomi di COSE. Il conto (HANDOFF §12.5, passo A): 73 tipi a terra, uno
// sguardo ciascuno = ~16 minuti; quattro per foglio = ~19 sguardi, ~4 minuti.
//   · il CARRELLO va comunque da ogni oggetto, uno alla volta: il movimento
//     non costa sguardi (§12.3), e mentre si muove l'occhio guarda il foglio;
//   · ogni tassello del foglio e' 480 x 480, l'inquadratura di quell'oggetto
//     da solo: l'immagine della fermata e' il tassello che l'occhio guarda;
//   · un nome appartiene al tassello in cui cade il CENTRO della rilevazione
//     (la regola di `tavolaDiRitagli`): un riquadro a cavallo non e' un oggetto.
//   ⚠️ 4 e non 9: col 9 i tasselli scendono a 320 px, e il passo B non ha mai
//      dimostrato che l'occhio riconosca la seduta cosi' piccola.
//
// MANOPOLE
//   window.__veritasRegiaAuto = false    non parte da sola
//   window.__veritasRegiaFermate         quante fermate (default: tutte)
//   window.__veritasRegiaTetto           ms massimi di tutta la regia (default 360000)
//
// ESITI: window.__veritasCoseNominate (tutte le copie con nome),
//        window.__veritasSedute (le copie dove ci si siede: §6.19, passo E).
// =============================================================================

const FERMATE = Infinity;
// Il criterio e' ~4 minuti (passo A); il tetto e' la rete sotto, non l'obiettivo.
const TETTO_MS = 360000;
const COPERTURA_MINIMA = 0.05;
export const PER_FOGLIO = 4;          // 2 x 2 — deciso da Raffaella, non 9
const TASSELLO_PX = 480;
const GRONDA_PX = 8;                  // il bianco fra un tassello e l'altro
const PASSO_CARRELLO_MS = 2500;       // il carrello del velo ci mette ~2 s

// ⚠️ SOLO NOMI DI COSE — 25/09 sera, deciso con Raffaella. Davanti a un
//    oggetto isolato l'occhio diceva «building», «sky»: parole di SFONDO e di
//    LUOGO, che su una cosa sola non possono essere vere. Non si tolgono dal
//    VOCABOLARIO (direttiva 6: resta enciclopedico, e il giro sulle piante le
//    chiede ancora): la regia ne chiede il sottoinsieme che sono cose.
//    Sono le superfici e il paesaggio di ADE20K-150, piu' i «luoghi»
//    (`luogo` nel vocabolario). Nessuna parola di tipologia (regola 0-bis).
export const NON_SONO_COSE = Object.freeze(new Set([
  "wall", "building", "sky", "floor", "ceiling", "road", "grass", "sidewalk",
  "earth", "mountain", "water", "sea", "field", "sand", "skyscraper", "house",
  "path", "runway", "river", "hill", "land", "lake", "dirt track", "hovel",
  "tower", "rock", "waterfall",
]));

/** Le voci che sono COSE: quelle che si chiedono davanti a un oggetto. */
export function paroleDiCose(voci) {
  return (voci || []).filter((v) => v && !v.luogo && !NON_SONO_COSE.has(v.termine));
}

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

/**
 * I nomi del foglio, tassello per tassello. Una rilevazione appartiene al
 * tassello che contiene il suo CENTRO, e conta solo se copre almeno il 5% del
 * tassello; vince la piu' forte. Le scatole possono arrivare normalizzate
 * (0..1) o in pixel: si riconosce dal valore, come in `nomeInquadrato`.
 */
export function nomiPerTassello(rilevazioni, tasselli, larghezza, altezza) {
  const fuori = tasselli.map(() => null);
  for (const r of rilevazioni || []) {
    const b = r && r.box; if (!b) continue;
    const s = Math.max(b.xmax, b.ymax) <= 1.001 ? [larghezza, altezza] : [1, 1];
    const x0 = b.xmin * s[0], x1 = b.xmax * s[0], y0 = b.ymin * s[1], y1 = b.ymax * s[1];
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const k = tasselli.findIndex((t) => cx >= t.x && cx < t.x + t.w && cy >= t.y && cy < t.y + t.h);
    if (k < 0) continue;
    const t = tasselli[k];
    if ((x1 - x0) * (y1 - y0) < COPERTURA_MINIMA * t.w * t.h) continue;
    if (!fuori[k] || r.score > fuori[k].score) fuori[k] = r;
  }
  return fuori;
}

/** Il foglio 2 x 2: i tasselli nell'ordine delle fermate, riga per riga. */
function foglio(tele) {
  const lato = TASSELLO_PX, col = 2, righe = Math.ceil(tele.length / col);
  const tela = document.createElement("canvas");
  tela.width = col * lato + (col + 1) * GRONDA_PX;
  tela.height = righe * lato + (righe + 1) * GRONDA_PX;
  const g = tela.getContext("2d");
  g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, tela.width, tela.height);
  const tasselli = tele.map((t, i) => {
    const x = GRONDA_PX + (i % col) * (lato + GRONDA_PX), y = GRONDA_PX + Math.floor(i / col) * (lato + GRONDA_PX);
    g.drawImage(t, x, y, lato, lato);
    return { x, y, w: lato, h: lato };
  });
  return { tela, tasselli };
}

const aspetta = (ms) => new Promise((r) => setTimeout(r, ms));

// =============================================================================
// LA SECONDA EVIDENZA: LE MISURE DEL CORPO (28/09/2026)
//
// Raffaella, 28/09: «La geometria può togliere o sospendere una conseguenza
// funzionale/affordance, ma non deve modificare o cancellare il riconoscimento
// visivo dell'oggetto. [...] una geometria incompatibile non deve dire "non è
// una culla"; deve poter dire "non ho evidenza sufficiente per attribuire a
// questo oggetto l'affordance 'sdraiato'".»
//
// Quindi due cose separate, e quest'ordine:
//   1. RICONOSCIMENTO — la parola dell'occhio (termine, nome, fiducia). Resta
//      SEMPRE, qualunque cosa dicano le misure;
//   2. CONSEGUENZA — postura e funzione della voce. Passano alle copie SOLO se
//      le misure del tipo le confermano. Tre esiti:
//        · "confermata"       le misure stanno dentro quelle del corpo;
//        · "sospesa"          le misure ci sono e non tornano;
//        · "non verificabile" manca la misura, o per quella conseguenza non
//                             c'e' una prova scritta: non si inventa, si sospende.
//
// ⚠️ LE PROVE SONO PER AFFORDANCE, NON PER OGGETTO. Nessuna parola d'oggetto e
//    nessun tipo di edificio qui (regola 0-bis): «seduto» chiede le misure di
//    una seduta a chiunque lo dica — sedia, panca, gradinata — in una stazione
//    come in una villa. Il metro e' la figura umana (§0.2): la regia parte a
//    modello gia' scalato (§0.6), e la statura e' quella del righello umano
//    (ALTEZZA_UOMO in index.html).
// ⚠️ La scatola e' quella della prima copia, allineata agli assi del mondo: un
//    oggetto ruotato di sbieco risulta un po' piu' largo del vero.
// ⚠️ `passo` («a terra», «ferma», «varco») NON passa di qui: la sua conseguenza
//    vive sulla mappa di cammino (strada 3), fuori da questa verifica.
export const STATURA_M = 1.80;
const S_ = STATURA_M;
// ⚠️ «seduto» e «sdraiato» NON stanno qui dal 28/09: la scatola sospendeva a
//    torto le sedute vere (due file schiena contro schiena, profonde 1,48 m).
//    Per loro vale LA QUOTA DI SUPERFICIE VERTICALE, qui sotto.
export const MISURE_DEL_CORPO = Object.freeze({
  // ci si ferma davanti: arriva almeno al ginocchio di chi sta in piedi
  "in piedi": { altezza: [0.3 * S_, Infinity],
              perche: "per fermarsi davanti deve arrivare almeno a 0,54 m" },
  // ci si passa: ci sta il corpo di una persona (0,60 m, l'ellisse di Fruin)
  passa:    { latoLungo: [0.6, Infinity],
              perche: "per passarci serve almeno la larghezza di un corpo, 0,60 m" },
});

// =============================================================================
// LA QUOTA DI SUPERFICIE VERTICALE — «seduto» e «sdraiato» (28/09/2026)
//
// Raffaella, 28/09: il segnale minimo per impedire che una superficie piana
// verticale riceva un'affordance da corpo, senza compromettere le sedute vere.
// Si misura, su UNA copia del tipo, quanta della sua superficie e' verticale:
// area dei triangoli con la normale entro 15 gradi dall'orizzontale, divisa per
// l'area totale. Se e' almeno il 95%, nessuna parte dell'oggetto puo' reggere un
// corpo: «seduto» e «sdraiato» si sospendono. Sotto il 95% il segnale NON dice
// niente — non conferma e non sospende.
// ⚠️ Una sola direzione: sa togliere, non sa confermare. Non rinomina (il nome
//    resta quello dell'occhio), non tocca «in piedi» ne' «ci si passa»: una porta
//    e un manifesto sono verticali, e li' quelle conseguenze sono giuste.
// ⚠️ Solo geometria: direzione e area della superficie. Niente texture,
//    materiali, trasparenza, nomi, numero di triangoli. Su uno splat la stessa
//    misura si fa con le gaussiane (normale = asse piu' corto, peso = opacita' x
//    area): per questo la regola parla di superficie, non di triangoli.
// Misurato il 28/09 sul terminal (banco/appoggio.mjs): falsa sagoma 100%,
// sedie vere a 66 copie 51%.
export const QUOTA_VERTICALE_MAX = 0.95;
const SENO_15 = Math.sin(15 * Math.PI / 180);
const DA_CORPO = new Set(["seduto", "sdraiato"]);

/** Quota di superficie verticale di un elenco di triangoli [[x,y,z]x3], nel mondo. */
export function quotaVerticaleDaTriangoli(triangoli) {
  let totale = 0, verticale = 0;
  for (const [a, b, c] of triangoli || []) {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const doppia = Math.hypot(n[0], n[1], n[2]);
    if (!(doppia > 0)) continue;
    totale += doppia / 2;
    if (Math.abs(n[1]) / doppia <= SENO_15) verticale += doppia / 2;
  }
  return totale > 0 ? verticale / totale : null;
}

/**
 * La quota verticale di UNA copia del tipo, dalla geometria gia' in scena.
 * I pezzi dell'inventario portano l'uuid dell'oggetto (e ":n" se sono istanze).
 */
export function quotaVerticaleDelTipo(THREE, radice, tipo, perUuid) {
  const c0 = tipo && tipo.copie && tipo.copie[0];
  if (!THREE || !radice || !c0 || !Array.isArray(c0.pezzi)) return null;
  const tris = [], M = new THREE.Matrix4(), I = new THREE.Matrix4(), p = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  for (const pezzo of c0.pezzi) {
    const [uuid, n] = String(pezzo.id || "").split(":");
    const o = perUuid.get(uuid);
    const pos = o && o.geometry && o.geometry.attributes && o.geometry.attributes.position;
    if (!pos) continue;
    M.copy(o.matrixWorld);
    if (n != null && o.isInstancedMesh) { o.getMatrixAt(Number(n), I); M.multiply(I); }
    const idx = o.geometry.index;
    const quanti = idx ? idx.count : pos.count;
    for (let t = 0; t + 2 < quanti; t += 3) {
      for (let j = 0; j < 3; j++) p[j].fromBufferAttribute(pos, idx ? idx.getX(t + j) : t + j).applyMatrix4(M);
      tris.push(p.map((q) => [q.x, q.y, q.z]));
    }
  }
  return quotaVerticaleDaTriangoli(tris);
}

/**
 * La conseguenza della voce, messa alla prova delle misure del tipo.
 * NON tocca il riconoscimento: restituisce solo l'esito sulla conseguenza.
 * `geo.quotaVerticale` (0..1 o null) serve a «seduto» e «sdraiato».
 * @returns {{esito: "confermata"|"non contraddetta"|"sospesa"|"non verificabile"|"nessuna", perche: string, conseguenza: string|null}}
 */
export function verificaAffordance(voce, tipo, geo = {}) {
  const conseguenza = voce ? (voce.postura || (voce.funzione ? "funzione " + voce.funzione : null)) : null;
  if (!voce || (!voce.postura && !voce.funzione)) return { esito: "nessuna", perche: "la voce non porta conseguenze", conseguenza: null };
  if (voce.controprova) return { esito: "nessuna", perche: "figure di persone: sono il metro, non una funzione", conseguenza: null };
  if (DA_CORPO.has(voce.postura)) {
    const q = geo.quotaVerticale;
    if (typeof q !== "number" || !isFinite(q))
      return { esito: "non verificabile", conseguenza, perche: "manca la superficie dell'oggetto" };
    const pc = Math.round(q * 100) + "%";
    if (q >= QUOTA_VERTICALE_MAX) return { esito: "sospesa", conseguenza,
      perche: "il " + pc + " della sua superficie e' verticale: nessuna parte puo' reggere un corpo" };
    return { esito: "non contraddetta", conseguenza,
      perche: "il " + pc + " della sua superficie e' verticale: la geometria non la esclude" };
  }
  const regola = voce.postura ? MISURE_DEL_CORPO[voce.postura] : null;
  if (!regola) return { esito: "non verificabile", conseguenza,
    perche: "per «" + conseguenza + "» non c'e' una prova sulle misure del corpo" };
  const m = tipo && tipo.misura;
  if (!Array.isArray(m) || m.length < 3 || !m.every((v) => typeof v === "number" && isFinite(v) && v > 0))
    return { esito: "non verificabile", conseguenza, perche: "mancano le misure dell'oggetto" };
  const misure = { altezza: m[1], latoCorto: Math.min(m[0], m[2]), latoLungo: Math.max(m[0], m[2]) };
  for (const k of ["altezza", "latoCorto", "latoLungo"]) {
    const r = regola[k]; if (!r) continue;
    if (misure[k] < r[0] || misure[k] > r[1]) return { esito: "sospesa", conseguenza,
      perche: regola.perche + "; questo misura " + m.map((v) => v.toFixed(2).replace(".", ",")).join(" x ") + " m" };
  }
  return { esito: "confermata", conseguenza, perche: regola.perche };
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
  // riconosciuto, ma la conseguenza non e' passata la prova delle misure
  if (voce.affordance && (voce.affordance.esito === "sospesa" || voce.affordance.esito === "non verificabile"))
    return maiuscola(voce.nome || voce.termine || "oggetto") + (copie > 1 ? ", " + copie + " in tutto" : "")
      + ". Lo riconosco, ma " + (voce.affordance.esito === "sospesa"
        ? "le misure non confermano «" + voce.affordance.conseguenza + "»"
        : "non posso verificare «" + voce.affordance.conseguenza + "»") + ": nessuna conseguenza.";
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
    const voci = paroleDiCose(R.vocabolarioPer(window.__veritasDominio || "aeroporto"));
    const perParola = new Map(voci.map((v) => [v.chiedi, v]));
    const parole = voci.map((v) => v.chiedi);
    log(tipi.length + " tipi interi, " + fermate.length + " fermate, "
      + Math.ceil(fermate.length / PER_FOGLIO) + " fogli da " + PER_FOGLIO + ", " + parole.length + " parole di cose");
    annuncia("veritas:regia", { fase: "inizio", quante: fermate.length, tipi: tipi.length });

    const nominate = [], esiti = [];
    let perUuid = null;   // gli oggetti della scena per uuid, costruito alla prima seduta
    // un'inquadratura: l'oggetto da solo, di lato, col suo giro d'aria
    // ⚠️ Nella CONFERMA niente giro d'aria (misurato il 25/09): le file di
    //    sedute stanno schiena contro schiena, e dal davanti la fila accanto,
    //    dentro il metro d'aria, copriva la seduta. Si guarda l'oggetto e basta.
    const inquadra = (c0, scartoGradi, lato) => {
      const giroDAria = scartoGradi ? 0.05 : 1;
      const sc = V.scorciTreQuarti(THREE, rend, radice, { bersaglio: { min: c0.min, max: c0.max },
        diLato: true, scartoGradi, numeroScorci: 1, conLuce: true, elevazioneGradi: 25, isola: true, giroDAria,
        larghezza: lato, altezza: lato })[0];
      return sc ? { sc, tela: inImmagine(R, sc), giroDAria } : null;
    };
    const fermata = (i, t, c0, q, conferma) => annuncia("veritas:fermata", { indice: i, quante: fermate.length,
      min: c0.min, max: c0.max, centro: c0.centro, camera: q.sc.camera, copie: t.copie.length, conferma,
      giroDAria: q.giroDAria, immagine: q.tela.toDataURL("image/jpeg", 0.8) });

    let fatte = 0;
    for (let p = 0; p < fermate.length; p += PER_FOGLIO) {
      if (Date.now() - t0 > tetto) { log("tetto raggiunto dopo " + fatte + " fermate"); break; }
      const a = Date.now();
      // 1. i tasselli: disegnare costa meno di mezzo secondo a oggetto
      const gruppo = [];
      for (let i = p; i < Math.min(p + PER_FOGLIO, fermate.length); i++) {
        const t = fermate[i], c0 = t.copie[0];
        const q = inquadra(c0, 0, TASSELLO_PX);
        if (q) gruppo.push({ i, t, c0, q });
      }
      if (!gruppo.length) continue;
      // 2. uno sguardo sul foglio, e intanto il carrello va da ogni oggetto
      const f = foglio(gruppo.map((x) => x.q.tela));
      const sguardo = rileva(f.tela, parole);
      for (let k = 0; k < gruppo.length; k++) {
        const x = gruppo[k];
        fermata(x.i, x.t, x.c0, x.q, false);
        if (k < gruppo.length - 1) await aspetta(PASSO_CARRELLO_MS);
      }
      const ril = await sguardo;
      const primi = nomiPerTassello(ril, f.tasselli, f.tela.width, f.tela.height);
      // 3. i nomi, uno per tassello, con la conseguenza passata alle copie
      for (let k = 0; k < gruppo.length; k++) {
        const { i, t, c0 } = gruppo[k];
        const primo = primi[k];
        let voce = primo ? perParola.get(primo.label) : null;
        // ⚠️ SPENTA di serie (25/09): dal lato opposto la seduta del terminal non si
        //    conferma (fila schiena contro schiena, poi «base»), e toglieva i posti
        //    veri. Si riaccende con window.__veritasRegiaConferma = true.
        if (window.__veritasRegiaConferma === true && voce && DA_CONFERMARE.has(voce.postura) && Date.now() - t0 <= tetto) {
          const q2 = inquadra(c0, 180);
          let di2 = null;
          if (q2) {
            fermata(i, t, c0, q2, true);
            const r2 = nomeInquadrato(await rileva(q2.tela, parole), q2.tela.width, q2.tela.height);
            di2 = { primo: r2, voce: r2 ? perParola.get(r2.label) : null };
          }
          const ok = !!(di2 && di2.voce && di2.voce.postura === voce.postura);
          log((i + 1) + ": «" + voce.nome + "» dal davanti " + (ok ? "confermato" : "NON confermato")
            + (di2 && di2.primo ? " (" + di2.primo.label + " " + di2.primo.score.toFixed(2) + ")" : ""));
          if (!ok) voce = Object.assign({}, voce, { postura: null, funzione: null, nonConfermato: true });
        }
        // LA SECONDA EVIDENZA (28/09): il riconoscimento resta; la conseguenza
        // passa alle copie solo se le misure del corpo la confermano.
        // «seduto»/«sdraiato»: la quota di superficie verticale, su UNA copia
        let geo = {};
        if (voce && DA_CORPO.has(voce.postura)) {
          if (!perUuid) { perUuid = new Map(); radice.traverse((o) => { if (o.isMesh) perUuid.set(o.uuid, o); }); }
          try { geo = { quotaVerticale: quotaVerticaleDelTipo(THREE, radice, t, perUuid) }; } catch (e) { geo = {}; }
        }
        const affordance = voce ? verificaAffordance(voce, t, geo) : null;
        if (affordance && (affordance.esito === "sospesa" || affordance.esito === "non verificabile"))
          voce = Object.assign({}, voce, { postura: null, funzione: null, affordance });
        else if (affordance) voce = Object.assign({}, voce, { affordance });
        const copie = voce ? C.nominaIlTipo(t, voce, { fiducia: primo.score }) : [];
        nominate.push(...copie);
        const esito = { indice: i, quante: fermate.length, min: c0.min, max: c0.max,
          nome: voce ? voce.nome : null, termine: voce ? voce.termine : null,
          postura: voce ? voce.postura || null : null, fiducia: primo ? +primo.score.toFixed(2) : null,
          copie: t.copie.map((c) => c.centro), ragionamento: ragionamento(voce, t.copie.length),
          misura: t.misura ? t.misura.map((v) => +v.toFixed(2)) : null,
          affordance: affordance ? affordance.esito : null, affordancePerche: affordance ? affordance.perche : null,
          foglio: Math.floor(p / PER_FOGLIO) + 1, sguardoMs: Date.now() - a };
        esiti.push(esito);
        log((i + 1) + "/" + fermate.length + ": " + esito.ragionamento
          + (primo ? " (" + primo.label + " " + esito.fiducia + ")" : ""));
        annuncia("veritas:nome", esito);
        fatte++;
      }
      log("foglio " + (Math.floor(p / PER_FOGLIO) + 1) + ": " + gruppo.length + " oggetti in " + (Date.now() - a) + " ms");
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

export default { regia, scegliFermate, nomeInquadrato, nomiPerTassello, paroleDiCose, ragionamento, contaPerChiCammina, verificaAffordance,
  quotaVerticaleDaTriangoli, quotaVerticaleDelTipo };
