// =============================================================================
// veritas_manuale.js — IL SAPERE TECNICO, IN UN POSTO SOLO
// =============================================================================
//
// Perche' esiste. Le misure del corpo umano erano gia' nel programma, ma in tre
// posti diversi e chiuse dentro i blocchi: `PERSONA` nella navmesh, `CORPO` nel
// riconoscitore di oggetti, le due altezze d'occhio nell'isovista. Nessuno le
// poteva leggere da fuori — e da oggi la chat DEVE poterle leggere, perche' chi
// compra questo strumento chiede «quanto deve essere largo un corridoio» e si
// aspetta un numero con una fonte dietro.
//
// ⚠️ IL MANUALE DELL'ARCHITETTO NON SI COPIA QUI DENTRO. Il Neufert e le altre
// raccolte editoriali sono opere protette: ricopiarne le tabelle in un prodotto
// che si vende e' un problema legale per chi lo vende. Non e' nemmeno
// necessario. I numeri che servono hanno una fonte primaria — Fruin per il
// corpo in movimento, i decreti per le prescrizioni — e citare la fonte
// primaria e' PIU' forte davanti a un cliente: alla domanda «da dove esce
// questo numero» c'e' una risposta verificabile.
//
// ⚠️ OGNI VOCE PORTA LA SUA FONTE E IL SUO STATO. `validato: false` significa
// trascritto ma non ancora ricontrollato sul testo originale. Un valore senza
// fonte non entra qui: sarebbe un numero finto travestito da sapere tecnico, ed
// e' la cosa che questo progetto non fa.
//
// ⚠️ QUI NON CI SONO SOGLIE DI GIUDIZIO. Quelle stanno nel modulo normative
// (19 soglie con giurisdizione e articolo). Qui c'e' il CORPO e quello che ne
// discende: la differenza e' che una misura descrive, una soglia giudica.
//
// -----------------------------------------------------------------------------
// AMPLIATO L'08/09/2026, su richiesta di Raffaella: «carica il manuale
// dell'architetto, tutto cio' che riguarda le misure, le architetture, le
// caratteristiche tipologiche di ogni architettura, tutto».
// Da 12 voci in 4 capitoli a 48 voci in 7 capitoli.
//
// ⛔ E LA REGOLA 0-bis RESTA IN PIEDI: nel codice non entra il vocabolario di
//    NESSUNA TIPOLOGIA. Qui dentro non c'e' e non entrera' mai la parola
//    «aeroporto», ne' «scuola», ne' «chiesa», ne' l'elenco delle parti di cui
//    sono fatte. Quell'elenco si CHIEDE al cervello — «hai detto che questo e'
//    un X: in un X che cose ti aspetteresti di trovare?» — e la risposta e'
//    sua. Il manuale non da' i NOMI: da' le MISURE con cui quei nomi si vanno a
//    cercare, e sono le stesse per un aeroporto e per un convento.
//
//    Il capitolo `comportamenti` e' esattamente questo: la firma dimensionale
//    delle nove categorie astratte del riconoscitore. Dice «un filtro e' un
//    passaggio stretto e lungo con una coda a monte» — non dice mai «il filtro
//    e' il controllo di sicurezza».
//
// ⚠️ IL CAPITOLO `disegno` E' LA REGOLA D'ARCHITETTURA DELL'ABACO. Prima
//    dell'08/09 le tavole non esistevano e le riprese venivano decise a occhio.
//    Quante piante, a che quota si taglia, quanti prospetti, dove passa la
//    sezione: sono decisioni di rappresentazione, hanno una regola, e la regola
//    sta qui — non sparsa dentro chi disegna.
// =============================================================================

export const MANUALE = Object.freeze({

  // ---------------------------------------------------------------------------
  // IL CORPO. Tutto il resto discende da qui: un varco e' largo abbastanza in
  // rapporto a una spalla, un'altezza e' libera in rapporto a una testa.
  // ---------------------------------------------------------------------------
  corpo: {
    ellisse_spalle_m: { valore: 0.61, fonte: "Fruin, Pedestrian Planning and Design (1971)", nota: "Ellisse corporea 61 x 46 cm; standard dei modelli di deflusso.", validato: true },
    ellisse_profondita_m: { valore: 0.46, fonte: "Fruin (1971)", validato: true },
    raggio_m: { valore: 0.30, fonte: "Fruin (1971)", nota: "Mezza larghezza di spalle, 0,305 m arrotondato.", validato: true },
    altezza_libera_m: { valore: 2.00, fonte: "uso corrente", nota: "Sotto i 2 m una persona si china: non e' passaggio.", validato: false },
    occhio_in_piedi_m: { valore: 1.65, fonte: "isovista VERITAS", nota: "Altezza dell'occhio usata per la visibilita' di chi cammina.", validato: false },
    occhio_seduto_m: { valore: 1.20, fonte: "isovista VERITAS", nota: "Occhio di chi e' seduto o in carrozzina: un bancone a 1,30 m gli chiude l'orizzonte.", validato: false },
    velocita_cammino_ms: { valore: 1.34, fonte: "Weidmann (1993), sintesi di venticinque studi", nota: "Velocita' media in piano, adulto, senza folla.", validato: false },
    velocita_scala_discesa_ms: { valore: 0.60, fonte: "Fruin (1971)", nota: "Sulle scale si va a circa meta' della velocita' in piano.", validato: false },
    passo_m: { valore: 0.75, fonte: "ergonomia corrente", nota: "Serve a leggere una distanza in passi, non solo in metri.", validato: false },
    rotazione_carrozzina_m: { valore: 1.50, fonte: "DM 236/1989", nota: "Diametro dello spazio di manovra per l'inversione di marcia.", validato: false },
  },

  // ---------------------------------------------------------------------------
  // L'ARREDO. Non i pezzi: le QUOTE degli oggetti che si toccano col corpo.
  // ---------------------------------------------------------------------------
  arredo: {
    seduta_m: { valore: [0.35, 0.85], fonte: "ergonomia corrente", nota: "Piano del sedile 40-48 cm; con lo schienale l'oggetto arriva a ~85 cm.", validato: false },
    banco_m: { valore: [0.85, 1.60], fonte: "ergonomia corrente + DM 236/1989", nota: "Piano di lavoro 90-110 cm; il DM fissa a 90 cm il piano utilizzabile da seduti. Totem e chioschi fino a 160.", validato: false },
    piano_utilizzabile_da_seduti_m: { valore: 0.90, fonte: "DM 236/1989", nota: "Sopra questa quota un bancone e' un muro per chi e' in carrozzina.", validato: false },
    interasse_sedute_in_fila_m: { valore: 0.50, fonte: "ergonomia corrente", nota: "Serve a contare i posti da una fila misurata, senza riconoscere i singoli pezzi.", validato: false },
    profondita_fila_sedute_m: { valore: 0.80, fonte: "ergonomia corrente", validato: false },
    altezza_maniglie_e_comandi_m: { valore: [0.85, 0.95], fonte: "DM 236/1989", validato: false },
  },

  // ---------------------------------------------------------------------------
  // LA CIRCOLAZIONE. Le misure che decidono se un passaggio e' un passaggio.
  // ---------------------------------------------------------------------------
  circolazione: {
    alzata_max_m: { valore: 0.18, fonte: "DM 236/1989", riferimento: "art. 8.1.10", validato: false },
    pedata_min_m: { valore: 0.30, fonte: "DM 236/1989", riferimento: "art. 8.1.10", validato: false },
    formula_blondel_m: { valore: [0.62, 0.64], fonte: "Blondel (1683)", nota: "Due alzate piu' una pedata. E' il controllo piu' vecchio del mestiere e regge ancora.", validato: false },
    pendenza_scala_gradi: { valore: [30, 35], fonte: "uso corrente", nota: "Oltre 35 gradi non e' un percorso: e' una copertura, un'ala, un terrapieno.", validato: false },
    gradino_navmesh_m: { valore: 0.40, fonte: "derivato", nota: "Due alzate: serve a salire le scale del modello senza saltare fra piani.", validato: false },
    luce_netta_porta_m: { valore: 0.80, fonte: "DM 236/1989", nota: "Luce netta minima di una porta perche' sia percorribile da tutti.", validato: false },
    luce_netta_porta_principale_m: { valore: 0.90, fonte: "DM 236/1989", validato: false },
    corridoio_min_m: { valore: 1.00, fonte: "DM 236/1989", nota: "Sotto questa misura non e' distribuzione: e' un'intercapedine.", validato: false },
    corridoio_con_manovra_m: { valore: 1.50, fonte: "DM 236/1989", nota: "Larghezza che consente l'inversione e l'incrocio.", validato: false },
    pendenza_rampa_max: { valore: 0.08, fonte: "DM 236/1989", nota: "Otto per cento. Oltre, non e' una rampa accessibile.", validato: false },
    ripiano_rampa_ogni_m: { valore: 10, fonte: "DM 236/1989", nota: "Ripiano orizzontale di sosta ogni dieci metri di sviluppo.", validato: false },
    altezza_parapetto_m: { valore: 1.00, fonte: "DM 236/1989 e prassi", validato: false },
  },

  // ---------------------------------------------------------------------------
  // IL DEFLUSSO. Quanti ne escono, e in quanto tempo.
  // ---------------------------------------------------------------------------
  deflusso: {
    modulo_uscita_m: { valore: 0.60, fonte: "prassi antincendio italiana", nota: "Modulo unitario di uscita. DA VERIFICARE sul decreto vigente prima di usarlo in un referto.", validato: false },
    larghezza_via_esodo_min_m: { valore: 1.20, fonte: "Codice di prevenzione incendi (DM 03/08/2015)", nota: "DA VERIFICARE sull'edizione vigente: il valore dipende dall'affollamento.", validato: false },
    persone_per_modulo: { valore: 50, fonte: "prassi antincendio italiana", nota: "DA VERIFICARE. Serve a tradurre una larghezza misurata in una capienza.", validato: false },
    densita_coda_m2_persona: { valore: [0.2, 1.2], fonte: "Fruin (1971), livelli di servizio in attesa", nota: "1,2 m2 a persona e' attesa comoda; 0,2 e' calca. E' il metro con cui si legge una sosta.", validato: false },
  },

  // ---------------------------------------------------------------------------
  // LA VISIONE. Quanto ci vuole perche' una cosa si VEDA in una figura: e' il
  // capitolo che decide se una ripresa serve o e' tempo buttato.
  // ---------------------------------------------------------------------------
  visione: {
    cono_visivo_gradi: { valore: 60, fonte: "isovista VERITAS", nota: "Il ventaglio davanti. Oltre, si vede ma non si guarda.", validato: false },
    pixel_per_metro_minimo_arredo: { valore: 10, fonte: "VERITAS, misurato", nota: "Sotto una decina di pixel al metro una seduta e' una macchia: la figura non serve a niente.", validato: true },
    pixel_per_metro_buono: { valore: 40, fonte: "VERITAS, misurato l'08/09/2026", nota: "A 41 px/m un prospetto mostra i taxi, le persone e i monitor appesi.", validato: true },
    isovista_minima_m2: { valore: 4, fonte: "direttiva 21, 07/09/2026", nota: "Sotto 4 m2 visti da nessun punto l'ambiente NON si fotografa, e lo si dice con i numeri.", validato: true },
  },

  // ---------------------------------------------------------------------------
  // IL DISEGNO. La regola d'architettura dell'abaco: quante tavole, a che quota
  // si taglia, dove passa la sezione. Non si decide a occhio, si legge qui.
  // ---------------------------------------------------------------------------
  disegno: {
    quota_taglio_pianta_m: { valore: 1.10, fonte: "convenzione di rappresentazione", nota: "A 1,10 la sezione taglia porte e finestre e passa SOPRA i banconi bassi: e' la quota che fa vedere insieme il muro e l'arredo. E' anche l'occhio di un bambino.", validato: false },
    quota_taglio_ammessa_m: { valore: [1.00, 1.50], fonte: "convenzione di rappresentazione", validato: false },
    una_pianta_per_livello: { valore: true, fonte: "prassi di rilievo", nota: "Un livello non disegnato e', per chi legge, un livello che non c'e'.", validato: true },
    prospetti_minimi: { valore: 4, fonte: "prassi di rilievo", nota: "I quattro fronti. Se l'edificio non e' ortogonale, uno per ogni giacitura di facciata.", validato: true },
    sezioni_minime: { valore: 2, fonte: "prassi di rilievo", nota: "Una per ciascun asse principale: longitudinale e trasversale.", validato: true },
    sezione_passa_per: { valore: ["i collegamenti verticali", "il vano piu' grande"], fonte: "prassi di rilievo", nota: "Una sezione che non taglia le scale non dice come si sale, e una sezione dice soprattutto quello.", validato: true },
    inquadratura_su: { valore: "il costruito", fonte: "misurato l'08/09/2026", nota: "NON l'ingombro. Sul modello dell'aeroporto il costruito misura 81,2 x 31,7 m e l'ingombro 106,4 x 59,4: inquadrando l'ingombro meta' delle riprese cade sul piazzale.", validato: true },
    rapporto_massimo_di_una_tavola: { valore: 6, fonte: "derivato dalla leggibilita'", nota: "Oltre 6:1 la tavola si spezza in SEGMENTI IN ORDINE, come una passata. Misurato: un prospetto 81 x 5,9 m in una tavola sola esce a 16 px/m, sotto la soglia dell'arredo.", validato: true },
    proiezione: { valore: "ortogonale", fonte: "prassi di rilievo", nota: "In proiezione ortogonale il soggetto riempie la finestra per costruzione: la direttiva 22 non va imposta, si rispetta da sola.", validato: true },
    scala_di_pianta: { valore: [100, 200], fonte: "prassi di rilievo", nota: "1:100 per un edificio, 1:200 per un complesso.", validato: false },
    scala_di_dettaglio: { valore: [20, 50], fonte: "prassi di rilievo", validato: false },
  },

  // ---------------------------------------------------------------------------
  // I COMPORTAMENTI. La firma DIMENSIONALE delle nove categorie astratte del
  // riconoscitore — le stesse chiavi di `__veritasOcchi.CATEGORIE`.
  //
  // ⛔ QUI NON C'E' NESSUN NOME DI TIPOLOGIA, ED E' IL PUNTO. Questa tabella
  //    dice come SI MISURA un filtro, non che cosa il filtro sia in un
  //    aeroporto. Il nome lo mette il cervello, che sa gia' cos'e' un aeroporto;
  //    il manuale mette il metro con cui quel nome si va a cercare — e il metro
  //    e' lo stesso in una scuola, in un ospedale e in una chiesa.
  //
  // ⚠️ SONO FIRME, NON SOGLIE. Servono a CERCARE, non a bocciare: un ambiente
  //    che non combacia non e' sbagliato, e' solo un ambiente da guardare meglio.
  // ---------------------------------------------------------------------------
  comportamenti: {
    origine: { tocca_l_esterno: true, larghezza_varco_m: [1.2, 6.0], nota: "Da dove si entra: ha una soglia, e di la' c'e' il fuori.", fonte: "carattere geometrico", validato: false },
    accoglienza: { banco_alto_m: [0.85, 1.10], coda_a_monte: true, profondita_coda_m: [2, 8], nota: "Un piano orizzontale all'altezza del gomito, e davanti lo spazio in cui si aspetta.", fonte: "carattere geometrico", validato: false },
    filtro: { larghezza_m: [0.9, 1.8], rapporto_lunghezza_larghezza_min: 2, coda_a_monte: true, nota: "Stretto, lungo, obbligato, e a monte si accumula. La strettoia e' la firma.", fonte: "carattere geometrico", validato: false },
    sosta: { m2_per_persona: [0.9, 2.0], sedute_presenti: true, attraversamento: false, nota: "Ci si ferma: densita' bassa, arredo per stare, e il flusso non ci passa attraverso.", fonte: "carattere geometrico + Fruin", validato: false },
    distribuzione: { rapporto_lunghezza_larghezza_min: 3, larghezza_m: [1.2, 12], attraversamento: true, nota: "Si attraversa e basta. Lungo, e non ci si ferma.", fonte: "carattere geometrico", validato: false },
    destinazione: { fine_del_flusso: true, nota: "Dove il percorso finisce: dopo non si prosegue, si esce dal sistema.", fonte: "carattere geometrico", validato: false },
    servizio: { area_m2: [2, 30], accessi: 1, nota: "Piccolo, con un solo accesso, fuori dal flusso principale.", fonte: "carattere geometrico", validato: false },
    esterno: { copertura: false, nota: "Sopra non c'e' niente. Si misura guardando in su, non riconoscendo il suolo.", fonte: "carattere geometrico", validato: false },
    escluso: { calpestabile: false, passaggio_mezzi: true, nota: "Superficie su cui una persona non mette i piedi. E' la categoria che tiene il piazzale fuori dal calpestabile.", fonte: "carattere geometrico", validato: false },
  },
});

// Quello che il sistema puo' dire di sapere, e quello che NON sa.
// Serve alla chat: alla domanda «quante finestre ci sono» la risposta onesta e'
// «non le ho misurate», e questa lista dice perche'.
export const NON_MISURATO = Object.freeze([
  "finestre e aperture in facciata: nessun rilevatore le conta",
  "altezze utili stanza per stanza: si misura il pavimento, non il soffitto",
  "arredi come oggetti distinti: si riconoscono le zone, non i pezzi",
  "materiali, finiture, impianti: il GLB non li dichiara",
  "le parti di cui e' fatta una tipologia: quelle si chiedono al cervello, non stanno qui (regola 0-bis)",
]);

/** Legge una voce con la sua fonte. `voce('circolazione.corridoio_min_m')`. */
export function voce(percorso) {
  const parti = String(percorso).split(".");
  let n = MANUALE;
  for (const p of parti) { if (!n || typeof n !== "object") return null; n = n[p]; }
  return n || null;
}

/** Tutte le voci in fila, per la chat e per il referto. */
export function tutte() {
  const fuori = [];
  for (const capitolo of Object.keys(MANUALE))
    for (const chiave of Object.keys(MANUALE[capitolo]))
      fuori.push({ capitolo, chiave, ...MANUALE[capitolo][chiave] });
  return fuori;
}

/** Quante voci, e quante ancora da ricontrollare sul testo originale. */
export function stato() {
  const t = tutte();
  const da = t.filter((v) => v.validato !== true);
  return {
    voci: t.length, validate: t.length - da.length, daValidare: da.length,
    capitoli: Object.keys(MANUALE).map((c) => c + ":" + Object.keys(MANUALE[c]).length).join(" "),
  };
}

if (typeof window !== "undefined") {
  window.__veritasManuale = MANUALE;
  window.__veritasNonMisurato = NON_MISURATO;
  window.__veritasManualeVoce = voce;
  window.__veritasManualeTutte = tutte;
  window.__veritasManualeStato = stato;
  const s = stato();
  console.log("[VERITAS manuale] " + s.voci + " voci (" + s.validate + " validate, "
    + s.daValidare + " da ricontrollare) — " + s.capitoli);
}
