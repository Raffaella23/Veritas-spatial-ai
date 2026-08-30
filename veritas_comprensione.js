// ===========================================================================
// VERITAS — LA COMPRENSIONE. Occhio e cervello che lavorano INSIEME.
// ===========================================================================
//
// IL PROBLEMA CHE RISOLVE
//
// Fino a oggi il giro era a senso unico, e in linea retta:
//
//     occhio guarda  ->  cervello riceve  ->  pipeline agisce
//
// L'occhio guardava UNA volta, il cervello riceveva una figura e rispondeva
// in prosa, e la pipeline partiva comunque — che avesse capito o no. Nessuno
// poteva dire «non ho capito», e quindi nessuno lo diceva mai. Un sistema che
// non sa dubitare non e' sicuro: e' solo silenzioso.
//
// Qui il giro diventa un ANELLO, e la conoscenza e' contemporanea:
//
//        ┌─────────────────────────────────────────────────┐
//        │                                                 │
//        v                                                 │
//   ┌─────────┐   cosa ho visto    ┌───────────┐           │
//   │ OCCHIO  │ ─────────────────> │ CERVELLO  │           │
//   │ OWLv2   │                    │  giudica  │           │
//   └─────────┘ <───────────────── └───────────┘           │
//        ^       guarda anche questo     │                 │
//        │       (parole nuove)          │                 │
//        └───────────────────────────────┘                 │
//                                        │                 │
//                              ┌─────────┴─────────┐       │
//                              │                   │       │
//                        «ho capito»         «non ho capito»
//                              │                   │       │
//                              v                   v       │
//                        ✅ SI PUO' AGIRE     ❓ CHIEDE A TE ┘
//
// Il cervello non riceve piu' solo un'immagine: riceve anche COSA L'OCCHIO HA
// GIA' NOMINATO e cosa e' rimasto senza nome. E puo' rispondere tre cose:
//
//   1. «ho capito»              -> il cancello si apre, la pipeline parte
//   2. «guarda anche questo»    -> l'occhio rifa' il giro con parole NUOVE
//   3. «non capisco, chiedi a lei» -> si ferma e scrive una domanda in chat
//
// ⚠️ REGOLA UNO, applicata qui. Se il cervello non risponde, o risponde in un
//    modo che non si sa leggere, questo modulo NON inventa un verdetto
//    ottimista: restituisce `capito: false` e dice perche'. Un «ho capito»
//    finto e' esattamente la bugia credibile dei KPI finti, e costa uguale.
//
// ⚠️ NIENTE E' STATO TOCCATO. Questo file IMPORTA `veritas_riconosce.js` e non
//    lo modifica. Chi oggi chiama `riconosci()` da solo continua a funzionare
//    identico. Questo modulo si mette SOPRA, non IN MEZZO.
//
// COME SI COLLAUDA
//   node --check veritas_comprensione.js
//   node banco/comprensione.test.mjs        (rilevatore e cervello finti)
//
// ===========================================================================

import { riconosci, vocabolarioPer, vociDaParole, racconta as raccontaOcchio } from "./veritas_riconosce.js";

// ---------------------------------------------------------------------------
// 1. Le soglie. Dichiarate qui, una volta, e non sparse nel codice.
// ---------------------------------------------------------------------------

// Quanti giri al massimo prima di arrendersi e chiedere a un umano.
// Tre e' un compromesso misurato: il primo giro usa il vocabolario di base,
// il secondo le parole che il cervello ha chiesto, il terzo e' l'ultima
// occasione. Oltre, il cervello sta girando a vuoto e va fermato.
// ⚠️ DUE GIRI, non tre. Deciso da Raffaella il 26/08: «il loop non puo' essere
//    eterno». Se dopo due scambi il cervello non e' sicuro, non lo sara' al
//    terzo: si ferma e CHIEDE a lei, che quel modello lo conosce.
export const GIRI_MASSIMI = 2;

// Quante viste ravvicinate stanno in UNA telefonata. Non e' una preferenza: e'
// la finestra del modello locale. Entrata massima misurata su questo PC il
// 29/08: 6358 token su 16384, e il contesto non si puo' alzare. Le porzioni
// pero' sono una dozzina (vedi scorciTreQuarti), quindi si mandano a mazzetti,
// un mazzetto per giro, con la pianta INTERA sempre presente in ognuno.
export const VISTE_PER_GIRO = 4;

// Quanti volumi si chiedono in UNA telefonata. Non e' una preferenza: e' la
// resa misurata del modello locale. Il 30/08 gli sono stati passati 23 volumi
// in un colpo e ha risposto con 222 gettoni su 2500 concessi, nominandone 3 e
// chiudendo: non e' stato troncato da noi, si e' fermato da solo. Un modello
// da 7 miliardi risponde sui primi elementi di una lista lunga e considera
// finito il lavoro. A mazzetti corti li nomina tutti, al prezzo di piu'
// telefonate: e' esattamente lo scambio che conviene, perche' le telefonate
// sono gratis e i volumi senza nome no.
export const VOLUMI_PER_MAZZETTO = 6;

// Sotto questa fiducia dichiarata dal cervello, «ho capito» non basta.
// Un modello che dice «ho capito, fiducia 0.3» sta dicendo «non ho capito».
export const FIDUCIA_PER_AGIRE = 0.7;

// Se restano piu' di questa quota di volumi senza nome, lo spazio non e'
// compreso anche se il cervello e' contento: significa che si sta per
// simulare dentro un edificio di cui si ignora meta'.
export const QUOTA_SENZA_NOME_MAX = 0.5;

// ---------------------------------------------------------------------------
// 2. Cosa l'occhio racconta al cervello
// ---------------------------------------------------------------------------
//
// NON gli si manda solo la figura. Gli si manda anche cosa e' gia' stato
// MISURATO, che e' l'unica cosa in tutto il sistema di cui siamo certi: la
// geometria dice DOVE, sempre e comunque. Il cervello discute solo il COSA.

export function riassuntoPerCervello(esito, opz = {}) {
  if (!esito || !esito.ok) return null;

  const nominati = esito.posti.filter((p) => p.nome);
  const anonimi = esito.posti.filter((p) => !p.nome);

  return {
    dominio: opz.dominio || "non dichiarato",
    giro: opz.giro || 1,
    volumi_totali: esito.posti.length,
    // Cosa l'occhio crede di aver riconosciuto, con la sua fiducia.
    riconosciuti: nominati.map((p) => ({
      nome: p.nome,
      area_m2: Math.round(p.area),
      oggetti: p.oggetti,
      fiducia: +(p.fiducia || 0).toFixed(2),
      centro: [+p.centro[0].toFixed(1), +p.centro[2].toFixed(1)],
    })),
    // ⚠️ QUESTO E' IL PEZZO CHE MANCAVA. I volumi misurati che l'occhio non
    //    ha saputo nominare sono l'informazione piu' utile per il cervello:
    //    sono le domande aperte dell'edificio.
    senza_nome: anonimi.map((p) => ({
      area_m2: Math.round(p.area),
      oggetti: p.oggetti,
      centro: [+p.centro[0].toFixed(1), +p.centro[2].toFixed(1)],
      forma: p.formaPrevalente || null,
    })),
    scartate: esito.scartate || 0,
    parole_gia_chieste: (opz.parole || []).slice(),
  };
}

// ---------------------------------------------------------------------------
// 3. La domanda al cervello
// ---------------------------------------------------------------------------
//
// ⚠️ Si pretende JSON e SOLO JSON. Il cervello di oggi
//    (`veritas_brain_server.py`) risponde in prosa: quella prosa non e'
//    verificabile da un programma, e infatti non e' mai stata verificata da
//    nessuno. Un verdetto che deve aprire un cancello dev'essere una
//    struttura, non un tema.

export function promptCervello(riassunto) {
  return [
    "Sei il cervello spaziale di VERITAS. Guardi la pianta dall'alto di un edificio reale",
    "e ricevi cosa l'occhio (un rilevatore visivo) ha gia' riconosciuto.",
    "",
    "La geometria e' certa: le posizioni e le aree sono MISURATE, non discutibili.",
    "Tu giudichi solo se lo spazio e' COMPRESO abbastanza da poterci simulare persone dentro.",
    "",
    "ECCO COSA L'OCCHIO HA VISTO:",
    JSON.stringify(riassunto, null, 2),
    "",
    "Rispondi SOLO con un oggetto JSON, senza testo prima o dopo, senza ```:",
    "{",
    '  "capito": true oppure false,',
    '  "fiducia": numero fra 0 e 1,',
    '  "cosa_e": "che edificio e\', in una frase",',
    '  "dubbi": [ { "cosa": "...", "perche": "...", "dove": [x, z] } ],',
    '  "chiedi_all_occhio": [ { "chiedi": "a baggage carousel", "nome": "nastro bagagli", "funzione": "attesa" } ],',
    '  "chiedi_all_umano": "una domanda in italiano, oppure null"',
    "}",
    "",
    "REGOLE, e sono vincolanti:",
    "- Se non sei sicuro, capito=false. Non e' una sconfitta: e' il comportamento corretto.",
    "- `chiedi_all_occhio` serve a farti guardare MEGLIO: metti parole in inglese, precise,",
    "  per oggetti che ti aspetti in questo edificio e che l'occhio non ha ancora cercato.",
    "  Non ripetere parole in `parole_gia_chieste`: l'occhio le ha gia' provate.",
    "- Se hai gia' guardato piu' volte e resti nel dubbio, lascia `chiedi_all_occhio` vuoto",
    "  e scrivi una domanda chiara in `chiedi_all_umano`. Chiedere a chi ha fatto il modello",
    "  e' sempre meglio che indovinare.",
    "- Non inventare oggetti che non sono nell'elenco. Non riposizionare niente.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// 4. Leggere il verdetto senza fidarsi
// ---------------------------------------------------------------------------
//
// ⚠️ Se il verdetto non si legge, il risultato NON e' «capito». E' «non so»,
//    che e' una cosa diversa e va detta.

export function leggiVerdetto(testo) {
  const g = estraiJson(testo);
  if (!g.ok) return { valido: false, perche: g.perche };
  const v = g.valore;

  if (typeof v.capito !== "boolean") {
    return { valido: false, perche: "il cervello non ha detto se ha capito (campo `capito` assente)" };
  }

  const fiducia = typeof v.fiducia === "number" && v.fiducia >= 0 && v.fiducia <= 1 ? v.fiducia : 0;

  // Le parole nuove: si accettano sia stringhe sia voci complete di vocabolario.
  const parole = (Array.isArray(v.chiedi_all_occhio) ? v.chiedi_all_occhio : [])
    .map((p) => {
      if (typeof p === "string") return p.trim() ? { chiedi: p.trim(), nome: p.trim(), funzione: null, domini: "*", fonte: "chiesta dal cervello" } : null;
      if (p && typeof p.chiedi === "string" && p.chiedi.trim()) {
        return { chiedi: p.chiedi.trim(), nome: (p.nome || p.chiedi).trim(), funzione: p.funzione || null, domini: "*", fonte: "chiesta dal cervello" };
      }
      return null;
    })
    .filter(Boolean);

  return {
    valido: true,
    capito: v.capito,
    fiducia,
    cosaE: typeof v.cosa_e === "string" ? v.cosa_e : null,
    dubbi: Array.isArray(v.dubbi) ? v.dubbi.filter((d) => d && d.cosa) : [],
    parole,
    domandaUmana: typeof v.chiedi_all_umano === "string" && v.chiedi_all_umano.trim()
      ? v.chiedi_all_umano.trim() : null,
  };
}

// ---------------------------------------------------------------------------
// 4-bis. LO STUDIO — «che cosa sto guardando», prima di ogni altra cosa
// ---------------------------------------------------------------------------
//
// ⚠️ MISURATO IL 25/08. Il giro a parole ha trovato 0 cose su 158 chieste. Non
//    perche' il modello che vede sia scarso: perche' gli si chiedeva «trovi un
//    banco? trovi una sedia?» dodici parole alla volta, su una pianta dall'alto
//    dove un banco, una fila di sedute e un muretto sono lo stesso rettangolo
//    grigio. Non gli e' MAI stato chiesto che posto fosse.
//
// Qui la domanda si rovescia, in tre gradini:
//
//   1. STUDIO        cosa ho davanti, e come me lo stanno mostrando
//   2. FUNZIONAMENTO come funziona un posto cosi' — lo dice il cervello, non noi
//   3. ASSEGNAZIONE  dove stanno, qui dentro, le zone di quel funzionamento
//
// ⚠️ PERCHE' IL GRADINO 2 NON E' UN ELENCO NOSTRO. La piattaforma e' agnostica:
//    oggi un aeroporto, domani un ospedale, dopodomani un museo o il collaudo
//    di un livello di videogioco. Scrivere qui dentro «ingresso, accettazione,
//    controlli, attesa, imbarco» taglierebbe su misura su UN tipo di edificio,
//    ed e' lo stesso errore delle soglie tarate su un modello solo. La sequenza
//    la enuncia il cervello, che quei posti li conosce gia'.
//
// Il NOME delle zone resta libero e viene dalla tipologia riconosciuta. Il
// RUOLO invece viene da questo elenco chiuso e corto: serve solo al Core Python
// e alle soglie normative per sapere cosa verificare, e non e' quello che si
// legge a schermo.
export const RUOLI = ["ingresso", "transito", "attesa", "controllo", "servizio", "uscita"];

// I volumi MISURATI, come li vede il cervello. La geometria e' certa: si manda
// cosi' com'e' e non si discute. Il cervello mette solo i nomi.
export function volumiPerCervello(posti) {
  return (posti || []).map((p, i) => {
    const v = {
      id: i,
      area_m2: Math.round(p.area),
      centro: [+p.centro[0].toFixed(1), +p.centro[2].toFixed(1)],
    };
    if (p.formaPrevalente) v.forma = p.formaPrevalente;
    if (p.oggetti) v.oggetti = p.oggetti;
    if (p.altezza != null) v.altezza_m = +Number(p.altezza).toFixed(1);
    return v;
  });
}

// ---------------------------------------------------------------------------
// 3-zero. LO SGUARDO — l'occhio parla per primo, e senza elenco
// ---------------------------------------------------------------------------
//
// ⚠️ Regola di Raffaella, 26/08, ed e' il modo in cui funziona la percezione:
//    «l'AI occhio guarda e dice questo potrebbe essere un aeroporto. Poi il
//    cervello dice fammi vedere, e' un aeroporto veramente? Si', perche' ho
//    trovato queste misure. Ora puo' assegnare le zone.»
//
//    Entrando in uno spazio nessuno ti consegna un elenco di parole prima di
//    aprire gli occhi. Vedi una facciata, e il cervello dice «e' una scatola,
//    dentro ci saranno solai e persone». Qui era il contrario: si entrava con
//    in mano 158 parole SCRITTE A MANO NEL CODICE, uguali per un aeroporto e
//    per un ospedale, e si chiedeva «c'e' questa? c'e' questa?». Cosi' un
//    parcheggio non lo trovi mai, se la parola «parcheggio» non era nella
//    lista — ed e' esattamente quello che succedeva.
//
// ⚠️ E c'e' il motivo per cui Qwen sta qui: SA RACCONTARE quello che vede.
//    Usarlo per rispondere si'/no a 158 termini dodici alla volta e' fargli
//    fare il mestiere di un rilevatore, che non e' il suo — infatti tornava
//    perfino con JSON storto. Qui gli si chiede la cosa che sa fare.
//
// ⚠️ Non gli si dice MAI che tipo di edificio e', nemmeno di sfuggita: la
//    parola la deve tirare fuori lui guardando. Dentro possono entrare un
//    ospedale, una scuola, un museo, un parcheggio.

export function promptSguardo(quanteViste, mettiAFuoco) {
  return [
    "Guarda queste " + quanteViste + " immagini: sono lo stesso posto visto da",
    "punti di vista diversi. La pianta dall'alto mostra TUTTO l'edificio. Gli",
    "scorci sono ingrandimenti ravvicinati, ognuno su una PORZIONE diversa dello",
    "stesso edificio: non sono edifici diversi, e quello che vedi in uno scorcio",
    "e' un pezzo di cio' che si vede nella pianta. Non concludere che l'edificio",
    "e' piccolo perche' in uno scorcio ne vedi poco.",
    "",
    "Non ti do nessun elenco e non ti chiedo di cercare niente in particolare.",
    "Guarda e dimmi cosa vedi, con parole tue.",
    ...(mettiAFuoco ? ["",
      "In piu', guarda meglio questo, che al giro prima e' rimasto in dubbio:",
      mettiAFuoco] : []),
    "",
    "Rispondi SOLO con un oggetto JSON, senza testo prima o dopo, senza ```:",
    "{",
    '  "potrebbe_essere": "che posto ti sembra, in poche parole",',
    '  "quanto_ci_credi": numero fra 0 e 1,',
    '  "cosa_vedo": ["ogni cosa riconoscibile, una per voce, con parole tue:",',
    '                "arredi, mezzi, persone, attrezzature, superfici"],',
    '  "attorno": ["cosa c\'e\' FUORI o ai bordi: mezzi fermi, piazzali, corsie,",',
    '              "banchine, cortili, parcheggi, alberi"],',
    '  "perche_lo_dico": ["gli indizi che ti hanno portato li\', uno per voce"],',
    '  "cosa_non_capisco": ["le cose che vedi ma non sai nominare, oppure []"]',
    "}",
    "",
    "REGOLE:",
    "- Non dare per scontato che tipo di posto sia: puo' essere un aeroporto, un",
    "  ospedale, una scuola, un museo, un parcheggio, una casa. Dillo tu.",
    "- `attorno` conta quanto `cosa_vedo`: mezzi e piazzali attorno a un edificio",
    "  dicono cos'e' quell'edificio piu' di quello che c'e' dentro.",
    "- Se una cosa non sai come si chiama, descrivila in `cosa_non_capisco`",
    "  invece di darle un nome a caso.",
    "- Se manca il soffitto o mancano le pareti NON e' un edificio rotto: e' un",
    "  modello fatto per farsi guardare dentro. Non e' una cosa da segnalare.",
  ].join("\n");
}

/** Legge lo sguardo. Se non si lascia leggere, non e' un disastro: il cervello
 *  guardera' le stesse immagini da solo, solo senza il vantaggio dell'occhio. */
export function leggiSguardo(testo) {
  const g = estraiJson(testo);
  if (!g.ok) return { valido: false, perche: g.perche };
  const v = g.valore;
  const elenco = (x) => (Array.isArray(x) ? x.map(String).filter(Boolean) : []);
  const ipotesi = typeof v.potrebbe_essere === "string" ? v.potrebbe_essere.trim() : "";
  const cose = elenco(v.cosa_vedo), attorno = elenco(v.attorno);
  if (!ipotesi && !cose.length && !attorno.length) {
    return { valido: false, perche: "l'occhio non ha detto niente di leggibile" };
  }
  return {
    valido: true,
    ipotesi,
    quantoCiCrede: typeof v.quanto_ci_crede === "number" ? v.quanto_ci_crede : 0.5,
    cose, attorno,
    perche: elenco(v.perche_lo_dico),
    nonCapisco: elenco(v.cosa_non_capisco),
  };
}

/** Lo sguardo messo in righe, come arriva al cervello. */
export function sguardoInParole(s) {
  if (!s || !s.valido) return null;
  const r = [];
  if (s.ipotesi) r.push("Gli sembra: " + s.ipotesi + " (ci crede " + Math.round(s.quantoCiCrede * 100) + "%)");
  if (s.cose.length) r.push("Dentro vede: " + s.cose.join(", "));
  if (s.attorno.length) r.push("Attorno vede: " + s.attorno.join(", "));
  if (s.perche.length) r.push("Lo dice perche': " + s.perche.join("; "));
  if (s.nonCapisco.length) r.push("Vede ma non sa nominare: " + s.nonCapisco.join(", "));
  return r.join("\n");
}

export function promptStudio(quanteViste, quantiVolumi, sguardo, misure) {
  return [
    "Sei il cervello spaziale di VERITAS. Ti mostro lo stesso edificio da " + quanteViste +
      " punti di vista diversi: una pianta dall'alto con TUTTO l'edificio, e alcuni",
      " scorci ravvicinati, ognuno su una porzione diversa dello stesso edificio,",
    "come si girerebbe un plastico fra le mani.",
    "",
    ...(sguardo ? ["",
      "L'OCCHIO HA GIA' GUARDATO. Ecco cosa dice, con parole sue:",
      sguardo,
      "",
      "IL TUO MESTIERE NON E' GUARDARE UN'ALTRA VOLTA: E' VERIFICARE.",
      "L'occhio e' bravo a riconoscere le cose ma non misura niente, e puo'",
      "prendere lucciole per lanterne. Tu hai le misure, che non mentono.",
      "Chiediti: quello che dice regge davanti ai numeri? Un oggetto lungo 35 m",
      "con due appendici laterali puo' essere un aereo; lungo 4 m e' un'auto;",
      "lungo 1 m non e' ne' l'uno ne' l'altro. Se le misure confermano, dillo e",
      "vai avanti. Se lo smentiscono, correggilo: le misure vincono sempre.",
      "Se lo confermano solo in parte, tieni la parte che regge."] : []),
    ...(misure ? ["", "LE MISURE DELLO SPAZIO (queste sono certe):", misure] : []),
    "",
    "Devi stabilire due cose: CHE POSTO E', e COME TE LO STANNO MOSTRANDO.",
    "",
    "Sulla rappresentazione: un modello 3D puo' essere completo, oppure uno",
    "spaccato (tolto il soffitto o una parete per far vedere dentro), oppure una",
    "sezione, oppure un solo piano. Se manca il soffitto o mancano le pareti",
    "laterali NON e' un difetto e non e' un edificio incompleto: e' il modo in cui",
    "il modello e' stato costruito per farsi guardare. Dillo e vai avanti.",
    "",
    "Quello che vedi attorno all'edificio conta: aerei, banchine, binari, corsie,",
    "cortili. Sono indizi forti su cos'e' l'edificio e su da che parte arrivano e",
    "se ne vanno le persone.",
    "",
    "Ci sono " + quantiVolumi + " volumi gia' misurati dentro questo spazio: al",
    "prossimo passo dovrai dargli un nome, quindi adesso servi te stesso.",
    "",
    "Rispondi SOLO con un oggetto JSON, senza testo prima o dopo, senza ```:",
    "{",
    '  "tipo": "che tipo di edificio o ambiente e\', in poche parole",',
    '  "rappresentazione": "modello completo" | "spaccato" | "sezione" | "un solo piano" | "non so",',
    '  "cosa_manca": ["soffitto", "pareti laterali"],',
    '  "indizi": ["cosa te lo fa dire, uno per voce"],',
    '  "come_funziona": [',
    '    { "zona": "nome della zona, nella lingua e nel lessico di questo tipo di edificio",',
    '      "ruolo": uno fra ' + JSON.stringify(RUOLI) + ',',
    '      "a_cosa_serve": "una frase",',
    '      "viene_dopo": "il nome della zona che la precede, oppure null" }',
    "  ],",
    '  "capito": true oppure false,',
    '  "fiducia": numero fra 0 e 1,',
    '  "chiedi_all_umano": "una domanda in italiano, oppure null"',
    "}",
    "",
    "",
    "REGOLE, e sono vincolanti:",
    "- Se l'occhio ha proposto un tipo di posto e le misure lo reggono, NON",
    "  cambiarlo per cautela: confermalo. Il dubbio serve quando c'e' un motivo,",
    "  non come abitudine.",
    "- Metti in `indizi` cosa dell'occhio hai confermato e cosa hai scartato, e",
    "  con quale misura. E' la parte che rende il verdetto controllabile.",
    "- `come_funziona` e' la SEQUENZA con cui le persone attraversano un posto di",
    "  questo tipo, dal loro arrivo alla loro uscita. Non descrivere quello che",
    "  vedi in queste immagini: descrivi come funziona un edificio del genere, che",
    "  tu gia' sai. Serve da traccia per il passo dopo.",
    "- Se non sei sicuro di che posto sia, capito=false. Non e' una sconfitta: e'",
    "  il comportamento corretto. Meglio una domanda che una simulazione dentro un",
    "  edificio che non e' quello.",
    "- Non inventare zone che in un posto del genere non esisterebbero.",
  ].join("\n");
}

export function leggiStudio(testo) {
  const g = estraiJson(testo);
  if (!g.ok) return { valido: false, perche: g.perche };
  const v = g.valore;

  if (typeof v.tipo !== "string" || !v.tipo.trim()) {
    return { valido: false, perche: "il cervello non ha detto che posto e'" };
  }

  const sequenza = (Array.isArray(v.come_funziona) ? v.come_funziona : [])
    .map((z) => {
      if (!z || typeof z.zona !== "string" || !z.zona.trim()) return null;
      return {
        zona: z.zona.trim(),
        ruolo: RUOLI.indexOf(z.ruolo) >= 0 ? z.ruolo : null,
        aCosaServe: typeof z.a_cosa_serve === "string" ? z.a_cosa_serve : null,
        vieneDopo: typeof z.viene_dopo === "string" ? z.viene_dopo : null,
      };
    })
    .filter(Boolean);

  return {
    valido: true,
    tipo: v.tipo.trim(),
    rappresentazione: typeof v.rappresentazione === "string" ? v.rappresentazione : "non so",
    cosaManca: Array.isArray(v.cosa_manca) ? v.cosa_manca.filter((x) => typeof x === "string") : [],
    indizi: Array.isArray(v.indizi) ? v.indizi.filter((x) => typeof x === "string") : [],
    sequenza,
    capito: v.capito === true,
    fiducia: typeof v.fiducia === "number" && v.fiducia >= 0 && v.fiducia <= 1 ? v.fiducia : 0,
    domandaUmana: typeof v.chiedi_all_umano === "string" && v.chiedi_all_umano.trim()
      ? v.chiedi_all_umano.trim() : null,
  };
}

// ---------------------------------------------------------------------------
// 4-ter. L'AUTO-ASSEGNAZIONE — i nomi sui volumi gia' misurati
// ---------------------------------------------------------------------------
//
// ⚠️ NON si disegnano aree nuove. Si nominano i volumi che la geometria ha gia'
//    misurato — quelli che nell'editor si stirano, si abbassano, si allargano e
//    si moltiplicano. Un contorno inventato dal cervello non avrebbe niente di
//    tutto questo dietro, e l'editor non potrebbe prenderlo in mano.
//
// Uno stesso nome puo' toccare a piu' volumi: tre sale d'attesa restano tre.

// Quello che l'umano ha gia' risposto alle domande dei giri precedenti.
// Regola 0 punto 5: «se non sa, chiede». Chiedere serve a qualcosa solo se poi
// ascolta: senza questo, la domanda esce, la risposta cade nel vuoto e i volumi
// restano senza nome per sempre.
export function risposteUmane() {
  const a = (typeof globalThis !== "undefined" && globalThis.__veritasRisposteUmane) || [];
  return Array.isArray(a) ? a.filter((x) => typeof x === "string" && x.trim()) : [];
}

export function promptAssegnazione(studio, volumi, testimonianza, giaFatto) {
  return [
    "Sei il cervello spaziale di VERITAS. Hai gia' stabilito che posto stai guardando:",
    JSON.stringify({
      tipo: studio.tipo,
      rappresentazione: studio.rappresentazione,
      cosa_manca: studio.cosaManca,
      come_funziona: studio.sequenza,
    }, null, 2),
    "",
    "Rivedi le immagini — la pianta dall'alto con tutto l'edificio, e gli scorci",
    "ravvicinati, ognuno su una porzione diversa (possono essere porzioni nuove",
    "rispetto al giro prima: e' cosi' che si finisce di guardare tutto).",
    "",
    "Questi sono i volumi MISURATI dentro lo spazio. Le posizioni e le aree sono",
    "certe e non si discutono: `centro` e' [x, z] in metri, come sulla pianta.",
    "Sono POCHI apposta: e' un mazzetto, non tutto l'edificio. Nominali TUTTI,",
    "uno per uno, senza saltarne nessuno. Degli altri volumi ti occupi dopo, in",
    "un'altra telefonata: non e' un tuo problema adesso.",
    JSON.stringify(volumi, null, 2),
    ...(testimonianza ? ["",
      "E questo e' quello che l'occhio ha visto nelle immagini, con parole sue.",
      "Serve ad ancorare i nomi a qualcosa di osservato invece che al solo",
      "ragionamento: se dice che vede file di sedute, il volume grande e sgombro",
      "vicino ai vetri e' probabilmente una sala d'attesa, non un magazzino.",
      "E' una testimonianza fallibile: se contraddice le misure, vincono le",
      "misure.",
      testimonianza] : []),
    "",
    "Assegna a ciascun volume una zona della sequenza qui sopra. Rispondi SOLO con",
    "un oggetto JSON, senza testo prima o dopo, senza ```:",
    "{",
    '  "assegnazioni": [',
    '    { "id": 0, "nome": "nome della zona", "ruolo": uno fra ' + JSON.stringify(RUOLI) + ',',
    '      "fiducia": numero fra 0 e 1, "perche": "una frase" }',
    "  ],",
    '  "senza_nome": [ { "id": <id del volume>, "domanda": "<la domanda vera, gia\' scritta per intero>" } ],',
    '  "capito": true oppure false,',
    '  "fiducia": numero fra 0 e 1',
    "}",
    ...(giaFatto && giaFatto.nomi && giaFatto.nomi.length ? [
      "",
      "AL GIRO PRIMA avevi gia' nominato questi volumi. Sono buoni: confermali con",
      "lo stesso nome e spendi questo giro sui RIMANENTI. Ridarmi identico il giro",
      "prima non aggiunge niente.",
      ...giaFatto.nomi.map((x) => "- volume " + x.id + ": " + x.nome),
    ] : []),
    ...(giaFatto && giaFatto.domandeFatte && giaFatto.domandeFatte.length ? [
      "",
      "QUESTE DOMANDE LE HAI GIA' FATTE e nessuno ha risposto. Non rifarle uguali:",
      "su quei volumi concludi da solo con la fiducia che hai, anche bassa.",
      ...giaFatto.domandeFatte.map((d) => "- " + d),
    ] : []),
    ...(risposteUmane().length ? [
      "",
      "QUELLO CHE TI HA GIA' DETTO CHI CONOSCE IL PROGETTO. Vale piu' di",
      "qualunque tua deduzione: non lo contraddire, usalo per nominare i volumi",
      "che avevi lasciato senza nome.",
      ...risposteUmane().map((r) => "- " + r),
    ] : []),
    "",
    "REGOLE, e sono vincolanti:",
    "- La SOLA FORMA non decide: dall'alto un banco, una fila di sedute e un",
    "  muretto sono lo stesso rettangolo. Decidono due cose insieme: la POSIZIONE",
    "  nella sequenza e QUELLO CHE SI VEDE SOPRA O DENTRO il volume. Un rettangolo",
    "  largo con delle sedute in fila, messo dopo il filtro, e' una sala d'attesa:",
    "  dirlo e' una deduzione architettonica normale, non un'invenzione. Usa gli",
    "  scorci per l'altezza e quello che c'e' attorno all'edificio per orientarti.",
    "- Lo stesso nome puo' toccare a piu' volumi: se ci sono tre sale d'attesa,",
    "  assegnale tutte e tre. Non accorparle.",
    "- TRE STRADE, e la seconda e' quella che userai piu' spesso:",
    "  1. lo riconosci: nome e `fiducia` alta;",
    "  2. NON sei certo ma vedi che cosa c'e' sopra o dentro: **nominalo lo stesso**",
    "     con `fiducia` fra 0.4 e 0.7 e scrivi in `perche` cosa te lo fa dire. Una",
    "     fiducia bassa dichiarata e' un'informazione utile; un volume senza nome",
    "     non lo e';",
    "  3. `senza_nome` SOLO se non vedi niente sopra quel volume, o se due letture",
    "     opposte sono ugualmente possibili e la differenza cambia il percorso.",
    "  Non nominare mai a caso: ma descrivere una cosa e poi non nominarla e' lo",
    "  spreco peggiore, perche' la descrizione l'avevi gia' fatta.",
    "- ⚠️ UNA DOMANDA ALLA VOLTA. Se hai piu' dubbi, metti per primo il volume",
    "  che pesa di piu' sul percorso: si chiede quello, il resto al giro dopo.",
    "  Tre domande insieme non ricevono tre risposte, ne ricevono zero.",
    "- ⚠️ In `domanda` ci va LA DOMANDA VERA, gia' scritta, rivolta a una persona",
    "  che conosce l'edificio: cita quel volume e quello che ci vedi sopra. Non",
    "  scrivere che cosa chiederesti: scrivilo direttamente. Una riga che comincia",
    "  con \"cosa chiederesti\" e' sbagliata e non si puo' mostrare a nessuno.",
    "- Non inventare volumi: usa solo gli `id` dell'elenco.",
  ].join("\n");
}

export function leggiAssegnazione(testo) {
  const g = estraiJson(testo);
  if (!g.ok) return { valido: false, perche: g.perche };
  const v = g.valore;

  const assegnazioni = (Array.isArray(v.assegnazioni) ? v.assegnazioni : [])
    .map((a) => {
      if (!a || typeof a.id !== "number" || typeof a.nome !== "string" || !a.nome.trim()) return null;
      return {
        id: a.id,
        nome: a.nome.trim(),
        ruolo: RUOLI.indexOf(a.ruolo) >= 0 ? a.ruolo : null,
        fiducia: typeof a.fiducia === "number" && a.fiducia >= 0 && a.fiducia <= 1 ? a.fiducia : 0.5,
        perche: typeof a.perche === "string" ? a.perche : null,
      };
    })
    .filter(Boolean);

  const senzaNome = (Array.isArray(v.senza_nome) ? v.senza_nome : [])
    .map((s) => (s && typeof s.id === "number"
      ? { id: s.id, domanda: typeof s.domanda === "string" ? s.domanda.trim() : null } : null))
    .filter(Boolean);

  if (!assegnazioni.length && !senzaNome.length) {
    return { valido: false, perche: "il cervello non ha assegnato nessun volume" };
  }

  return {
    valido: true,
    assegnazioni,
    senzaNome,
    capito: v.capito === true,
    fiducia: typeof v.fiducia === "number" && v.fiducia >= 0 && v.fiducia <= 1 ? v.fiducia : 0,
  };
}

// L'involucro JSON, isolato una volta sola: lo usano tutti e tre i verdetti.
function estraiJson(testo) {
  if (typeof testo !== "string" || !testo.trim()) {
    return { ok: false, perche: "il cervello non ha risposto niente" };
  }
  let grezzo = testo.trim();
  const blocco = grezzo.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (blocco) grezzo = blocco[1].trim();
  const apre = grezzo.indexOf("{"), chiude = grezzo.lastIndexOf("}");
  if (apre === -1 || chiude <= apre) {
    return { ok: false, perche: "nella risposta del cervello non c'e' un oggetto JSON" };
  }
  try {
    return { ok: true, valore: JSON.parse(grezzo.slice(apre, chiude + 1)) };
  } catch (e) {
    return { ok: false, perche: "il JSON del cervello non si legge: " + (e && e.message) };
  }
}

// ---------------------------------------------------------------------------
// 4-bis. L'OCCHIO GUARDA TUTTE LE VISTE, non solo la pianta
// ---------------------------------------------------------------------------
//
// ⚠️ Deciso da Raffaella il 26/08, ed e' la regola del circuito: occhio e
//    cervello devono avere LE STESSE informazioni. Prima non era cosi': il
//    cervello riceveva pianta + scorci, l'occhio soltanto la pianta. Gli si
//    chiedeva «trovi un banco?» guardando il pavimento, mentre il banco stava
//    in uno scorcio che l'occhio non ha mai visto.
//
// ⚠️ SULLA PIANTA le rilevazioni diventano POSIZIONI: la proiezione e'
//    ortografica dall'alto, quindi un riquadro si converte in metri con
//    `scatolaInMondo` e si puo' abbinare a un volume misurato.
//    SUGLI SCORCI no: sono prospettive, e un riquadro li' non ha un
//    corrispondente a terra. Convertirlo lo stesso produrrebbe posizioni
//    credibili e sbagliate — la stessa merce avariata dei KPI finti. Quindi
//    dagli scorci si prende solo la TESTIMONIANZA (che cosa ha visto, e in
//    quale vista), che va al cervello come indizio e non come misura.
//
// Il numero di viste non e' scelto qui: sono esattamente quelle che vanno al
// cervello, e quante siano lo decide gia' la densita' di mesh del modello.

export async function occhioSuTutteLeViste(ctx, immagini, parole, soloQueste) {
  const fuori = { esitoPianta: null, testimonianza: null, viste: [] };
  if (typeof ctx.rileva !== "function") return fuori;

  // (a) la pianta: e' l'unica che da' posizioni, e passa dalla strada di sempre
  if (ctx.pianta && ctx.inquadratura) {
    try {
      const e = await riconosci(ctx.posti, {
        rileva: ctx.rileva, pianta: ctx.pianta, inquadratura: ctx.inquadratura,
        dominio: ctx.dominio, parole: parole || [], soloParole: !!soloQueste,
      });
      if (e && e.ok) fuori.esitoPianta = e;
    } catch (e) { /* la pianta muta non deve fermare gli scorci */ }
  }

  // (b) gli scorci: solo testimonianza
  const voci = soloQueste ? vociDaParole(parole) : vocabolarioPer(ctx.dominio, parole || []);
  const chiedi = voci.map((v) => v.chiedi);
  if (!chiedi.length) { fuori.testimonianza = riassuntoTestimonianza(fuori); return fuori; }
  const scorci = ctx.scorci || [];
  for (let i = 0; i < scorci.length; i++) {
    let grezze = null;
    try { grezze = await ctx.rileva(scorci[i], chiedi); } catch (e) { grezze = null; }
    if (!Array.isArray(grezze)) continue;
    const conta = new Map();
    for (const g of grezze) {
      if (!g || typeof g.score !== "number" || !g.label) continue;
      if (g.score < FIDUCIA_MINIMA_TESTIMONE) continue;
      conta.set(g.label, (conta.get(g.label) || 0) + 1);
    }
    const gradi = typeof scorci[i].azimuth === "number"
      ? Math.round(scorci[i].azimuth * 180 / Math.PI) : null;
    fuori.viste.push({
      vista: "scorcio " + (i + 1) + (gradi == null ? "" : " a " + gradi + " gradi"),
      cose: [...conta.entries()].map(([label, quante]) => ({ cosa: label, quante })),
    });
  }

  fuori.testimonianza = riassuntoTestimonianza(fuori);
  return fuori;
}

// Sotto questa fiducia una rilevazione su una prospettiva e' rumore: sulla
// pianta un falso positivo viene comunque buttato da `abbina` se non sta sopra
// un volume misurato, qui invece nessuno lo filtra e arriverebbe intero al
// cervello.
export const FIDUCIA_MINIMA_TESTIMONE = 0.2;

function riassuntoTestimonianza(o) {
  const righe = [];
  if (o.esitoPianta) {
    const c = new Map();
    for (const p of o.esitoPianta.posti || []) {
      if (p && p.nome) c.set(p.nome, (c.get(p.nome) || 0) + 1);
    }
    righe.push("pianta dall'alto: " + (c.size
      ? [...c.entries()].map(([n, q]) => n + " x" + q).join(", ")
      : "niente di riconosciuto"));
  }
  for (const v of o.viste) {
    righe.push(v.vista + ": " + (v.cose.length
      ? v.cose.map((x) => x.cosa + " x" + x.quante).join(", ")
      : "niente di riconosciuto"));
  }
  return righe.length ? righe.join("\n") : null;
}

// ---------------------------------------------------------------------------
// 4-quater. IL PERCORSO CHE GUARDA — studio, poi assegnazione, poi il cancello
// ---------------------------------------------------------------------------
//
// Restituisce `null` se lo studio non si e' potuto fare: in quel caso chi
// chiama prosegue con il giro a parole, che resta esattamente com'era.

// ---------------------------------------------------------------------------
// 4-ter. LA RISPOSTA GREZZA NON SI BUTTA PIU'
// ---------------------------------------------------------------------------
//
// ⚠️ Aggiunto il 26/08. Fino a qui, quando lo studio o l'assegnazione non si
//    lasciavano leggere si faceva `return null` in SILENZIO e il programma
//    ripiegava sul giro a parole. Il ripiego funzionava — non si rompeva
//    niente — ma la risposta del cervello, cioe' l'unica cosa che dice
//    PERCHE' si e' fermato, spariva senza lasciare traccia. Cosi' ogni
//    diagnosi diventava un'ipotesi: troncata? JSON storto? scorci mancanti?
//
//    Questo NON corregge niente e NON cambia il comportamento: registra e
//    basta. Si legge da console con `__veritasRisposteGrezze`.
export function conservaRisposta(passo, testo, motivo) {
  try {
    if (typeof window === "undefined") return;
    const m = window.__veritasRisposteGrezze || (window.__veritasRisposteGrezze = {});
    const s = testo == null ? null : String(testo);
    m[passo] = {
      quando: new Date().toISOString(),
      motivo: motivo || null,
      lunghezza: s == null ? 0 : s.length,
      testo: s,
    };
    if (motivo) {
      console.warn("[VERITAS cervello] passo \u00ab" + passo + "\u00bb fermo: " + motivo
        + " \u2014 risposta grezza di " + (s == null ? 0 : s.length)
        + " caratteri in window.__veritasRisposteGrezze." + passo + ".testo");
      if (s) console.warn("[VERITAS cervello] ultimi 400 caratteri: " + s.slice(-400));
    }
  } catch (e) {}
}

/** Le misure gia' certe dello spazio, in righe. Sono la controprova con cui il
 *  cervello mette alla prova quello che l'occhio ha detto. */
export function misureInParole(posti) {
  if (!posti || !posti.length) return null;

  // ⚠️ SI LEGGONO SOLO I CAMPI CHE ESISTONO DAVVERO. Il 26/08 qui c'era
  //    `p.max[0] - p.min[0]`: `min` e `max` su un posto NON ESISTONO, e il
  //    risultato era «Cannot read properties of undefined (reading '0')» che
  //    faceva morire tutto `comprendi()` prima ancora dello sguardo. I campi
  //    veri sono quelli che usa `volumiPerCervello`: area, centro, oggetti,
  //    altezza, formaPrevalente.
  //
  // ⚠️ E il banco non l'aveva preso perche' i volumi finti li avevo costruiti
  //    IO, con dentro `min` e `max`: il banco confermava la mia supposizione
  //    invece di metterla alla prova. Un banco che si fabbrica i dati non
  //    verifica niente. Percio' qui ogni lettura e' difensiva: se un campo
  //    manca, la riga si accorcia, non si spacca.
  const num = (x) => (typeof x === "number" && isFinite(x) ? x : null);
  const ordinati = posti.slice()
    .sort((a, b) => (num(b && b.area) || 0) - (num(a && a.area) || 0));

  const righe = [];
  for (let i = 0; i < ordinati.length && righe.length < 25; i++) {
    const p = ordinati[i];
    if (!p) continue;
    const pezzi = [];
    const area = num(p.area);
    if (area != null) {
      pezzi.push("area " + Math.round(area) + " m2");
      // Il lato equivalente serve al cervello per farsi un'idea della TAGLIA:
      // e' dichiarato per quello che e', non spacciato per una misura presa.
      pezzi.push("largo all'incirca " + Math.sqrt(area).toFixed(1) + " m");
    }
    const h = num(p.altezza);
    if (h != null) pezzi.push("alto " + h.toFixed(1) + " m");
    const og = num(p.oggetti);
    if (og != null) pezzi.push(og + " pezzi dentro");
    if (p.formaPrevalente) pezzi.push("forma " + String(p.formaPrevalente));
    if (!pezzi.length) continue;
    righe.push("  volume " + (num(p.id) != null ? p.id : i) + ": " + pezzi.join(", "));
  }
  if (!righe.length) return null;

  const totale = posti.reduce((s, p) => s + (num(p && p.area) || 0), 0);
  return ["  " + posti.length + " volumi misurati, " + Math.round(totale) + " m2 in tutto",
          "  (il lato e' ricavato dall'area, quindi e' un ordine di grandezza,",
          "   non una misura presa lungo un fianco)"]
    .concat(righe).join("\n");
}

export async function comprendiGuardando(ctx) {
  // ⚠️ LE VISTE VANNO A GIRI, NON TUTTE IN UNA VOLTA.
  //    Perche' l'occhio veda davvero qualcosa, ogni scorcio inquadra una
  //    porzione del modello invece dell'edificio intero (scorciTreQuarti): su
  //    147 metri servono una dozzina di porzioni per scendere da 19 a 5
  //    centimetri per punto. Dodici immagini in una sola telefonata non entrano
  //    nella finestra. Quindi ogni giro ne porta VISTE_PER_GIRO, diverse dal
  //    giro prima, e dopo tre giri il modello e' stato guardato tutto, da
  //    vicino, senza aver tagliato via niente — ne' i tubi d'imbarco ne' il
  //    parcheggio.
  //
  //    ⚠️ REGOLA 0 PUNTO 2 — LE STESSE IMMAGINI PER TUTTI E DUE. `viste()`
  //    riscrive `ctx.scorci` con il mazzetto del giro: cosi' `occhioSuTutteLeViste`
  //    guarda ESATTAMENTE quello che e' andato al cervello, e non una vista in
  //    meno. Se questo si scollega, si torna al difetto del 26/08: il cervello
  //    con gli scorci e l'occhio con la sola pianta.
  const scorciTutti = (ctx.scorci || []).filter(Boolean);
  const perGiro = Math.max(1, ctx.vistePerGiro || VISTE_PER_GIRO);
  const mazzetti = Math.max(1, Math.ceil(scorciTutti.length / perGiro));
  function viste(k) {
    if (scorciTutti.length <= perGiro) {
      ctx.scorci = scorciTutti;
    } else {
      const p = ((((k % mazzetti) + mazzetti) % mazzetti) * perGiro) % scorciTutti.length;
      const s = [];
      for (let i = 0; i < perGiro; i++) s.push(scorciTutti[(p + i) % scorciTutti.length]);
      ctx.scorci = s;
      try {
        console.log("[VERITAS scorci] giro " + (k + 1) + ": porzioni "
          + ctx.scorci.map((v) => (v && v.porzione ? v.porzione.indice : "?")).join(", ")
          + " di " + scorciTutti.length + " (piu' la pianta intera)");
      } catch (e) {}
    }
    return [ctx.pianta, ...ctx.scorci].filter(Boolean);
  }
  const immagini = viste(0);
  const volumi = volumiPerCervello(ctx.posti);
  const giriMassimi = ctx.giriMassimi || GIRI_MASSIMI;
  const posti = ctx.posti;

  // ⚠️ L'ORDINE: IL CERVELLO PARLA PER PRIMO. Misurato sul modello vero il
  //    26/08. Nel primo giro del circuito l'occhio guardava per primo, e
  //    guardava tutte le viste con l'elenco intero del vocabolario: 158 parole
  //    in 14 mazzetti da 12, per 8 viste = 112 interrogazioni PRIMA che il
  //    cervello dicesse una parola. Non ci arrivava mai: il log si fermava su
  //    «ha trovato 0 cose su 12 chieste», ripetuto, e lo studio non partiva.
  //
  //    Non e' solo un problema di costo: e' proprio la strada dichiarata morta
  //    il 25/08. Chiedere «trovi un banco? trovi una sedia?» dodici parole alla
  //    volta non funziona, e col VLM di riserva funziona ancora meno — i suoi
  //    riquadri sono piu' larghi e non confrontabili, e infatti alcuni mazzetti
  //    tornano perfino con JSON malformato.
  //
  //    Quindi il primo scambio va DAL CERVELLO ALL'OCCHIO: una domanda sola
  //    («che posto e', come funziona»), con tutte le immagini. L'occhio resta
  //    acceso e continua a vedere tutte le viste — quella regola non si tocca —
  //    ma gli si chiede SOLO quello che il cervello ha detto di cercare.
  //    Da 112 domande a una manciata.

  // --- (0) LO SGUARDO — l'occhio guarda per primo, libero, senza elenco -----
  //
  // ⚠️ L'ORDINE E' QUESTO E NON SI GIRA. L'occhio guarda e dice cosa gli
  //    sembra; il cervello poi contesta con le misure; solo dopo si assegnano
  //    le zone. Un cervello che parla per primo giudica a occhi chiusi, e ho
  //    gia' sbagliato una volta a metterlo davanti — l'avevo fatto per
  //    risparmiare domande, non perche' fosse giusto.
  let sguardo = null;
  try {
    const r = await ctx.cervello(promptSguardo(immagini.length, null),
      { immagine: ctx.pianta, immagini, passo: "sguardo" });
    conservaRisposta("sguardo", r, null);
    const s = leggiSguardo(r);
    if (s.valido) sguardo = s;
    else conservaRisposta("sguardo", r, s.perche || "risposta non leggibile");
  } catch (e) {
    conservaRisposta("sguardo", null, "l'occhio non ha risposto: " + ((e && e.message) || e));
  }
  if (sguardo && typeof ctx.onGiro === "function") {
    ctx.onGiro({ giro: 0, passo: "sguardo", cosaE: sguardo.ipotesi,
                 fiducia: sguardo.quantoCiCrede, nominati: 0,
                 senzaNome: volumi.length, capito: false,
                 paroleChieste: sguardo.cose.slice(0, 6), dubbi: sguardo.nonCapisco.length });
  }

  // --- (1) IL CERVELLO VERIFICA: e' davvero quello, secondo le misure? ------
  let misure = null;
  try { misure = misureInParole(posti); }
  catch (e) {
    // Le misure sono un aiuto, non una condizione: se si rompono il cervello
    // ragiona senza, non muore. Ma lo si scrive, non lo si nasconde.
    conservaRisposta("misure", null, "non ho saputo mettere in parole le misure: "
      + ((e && e.message) || e));
  }
  let rispostaStudio;
  try {
    const viStudio = viste(1);
    rispostaStudio = await ctx.cervello(
      promptStudio(viStudio.length, volumi.length, sguardoInParole(sguardo), misure),
      { immagine: ctx.pianta, immagini: viStudio, passo: "studio" });
  } catch (e) {
    conservaRisposta("studio", null, "il cervello non ha risposto: " + ((e && e.message) || e));
    return null;
  }
  conservaRisposta("studio", rispostaStudio, null);
  const studio = leggiStudio(rispostaStudio);
  if (!studio.valido) {
    conservaRisposta("studio", rispostaStudio, studio.perche || "risposta non leggibile");
    return null;
  }

  const cosaE = studio.tipo +
    (studio.rappresentazione && studio.rappresentazione !== "non so"
      ? " (" + studio.rappresentazione +
        (studio.cosaManca.length ? ", manca " + studio.cosaManca.join(" e ") : "") + ")"
      : "");

  const giri = [{ giro: 1, passo: "studio", cosaE: studio.tipo,
                  fiducia: studio.fiducia, nominati: 0, senzaNome: volumi.length,
                  capito: studio.capito, paroleChieste: [], dubbi: 0 }];
  if (typeof ctx.onGiro === "function") ctx.onGiro(giri[0]);

  // ⚠️ QUI C'ERA UN CANCELLO, ed e' stato tolto il 30/08 su decisione di
  //    Raffaella: «il cervello non deve bloccare la visione, ma chiedere
  //    conferma». Prima, se non era sicuro del TIPO di edificio, si fermava
  //    qui e nessun volume veniva nemmeno guardato: un dubbio solo spegneva
  //    tutto il resto. Adesso il dubbio si dichiara e si va avanti lo stesso.
  //    Un volume con le sedute in fila e' una sala d'attesa in un aeroporto,
  //    in un ospedale e in un museo: il tipo di edificio serve a rifinire i
  //    nomi, non a permettere di leggere lo spazio.
  const dubbioTipo = (!studio.capito || studio.fiducia < FIDUCIA_PER_AGIRE)
    ? (studio.domandaUmana
       || "Non sono sicuro di che tipo di spazio sia questo: me lo confermi tu?")
    : null;

  // --- (2) L'ANELLO: assegna, e se non basta manda l'occhio a cercare -------
  const paroleAccumulate = [];
  const gia = new Set(vocabolarioPer(ctx.dominio, []).map((v) => v.chiedi));
  let testimonianza = null;
  let ass = null, nominati = 0, senzaNome = posti.length, quotaAnonima = 1;
  // Cosa il cervello ha gia' fatto ai giri prima. Senza questo il giro 3 riceve
  // esattamente lo stesso foglio del giro 2 e risponde identico: misurato il
  // 30/08 (giro 2: 5 nominati, giro 3: 5 nominati, stessa domanda).
  let giaFatto = null;
  const domandeFatte = [];
  let sicuro = false, coperto = false;

  for (let n = 1; n <= giriMassimi; n++) {
    // I volumi ancora anonimi, spezzati in mazzetti corti. Al primo giro sono
    // tutti; dal secondo restano solo quelli rimasti, cosi' il giro nuovo non
    // rifa' il lavoro gia' fatto ma lo completa.
    const daFare = volumi.filter((v) => !(posti[v.id] && posti[v.id].nome));
    const mazzetti = [];
    for (let i = 0; i < daFare.length; i += VOLUMI_PER_MAZZETTO) {
      mazzetti.push(daFare.slice(i, i + VOLUMI_PER_MAZZETTO));
    }
    if (!mazzetti.length) break;

    const unite = [], senzaUniti = [];
    let sommaFiducia = 0, mazzettiRiusciti = 0, capitoTutti = true, ultimoGuaio = null;

    for (let m = 0; m < mazzetti.length; m++) {
      const mazzo = mazzetti[m];
      const dove = "mazzetto " + (m + 1) + "/" + mazzetti.length + " (" + mazzo.length
        + " volumi, giro " + n + ")";
      let risposta;
      try {
        risposta = await ctx.cervello(
          promptAssegnazione(studio, mazzo, testimonianza || sguardoInParole(sguardo), giaFatto),
          { immagine: ctx.pianta, immagini: viste(1 + n), passo: "assegnazione",
            giro: n, mazzetto: m + 1, diQuanti: mazzetti.length });
      } catch (e) {
        ultimoGuaio = "il cervello non ha risposto: " + ((e && e.message) || e) + " — " + dove;
        conservaRisposta("assegnazione", null, ultimoGuaio);
        continue;
      }
      conservaRisposta("assegnazione", risposta, null);
      const parziale = leggiAssegnazione(risposta);
      if (!parziale.valido) {
        // ⚠️ Qui si ferma il fronte 2. `perche` distingue i casi che finora si
        //    potevano solo indovinare: risposta troncata (JSON incompleto), JSON
        //    assente, oppure elenco vuoto — il cervello ha risposto bene ma non
        //    ha voluto nominare niente. Sono tre difetti diversi.
        ultimoGuaio = (parziale.perche || "risposta non leggibile") + " — " + dove;
        conservaRisposta("assegnazione", risposta, ultimoGuaio);
        continue;
      }
      // Un mazzetto risponde solo dei propri volumi: se nomina l'id 19 mentre
      // gli sono stati dati gli id 0-5, quel nome non l'ha guardato.
      const ammessi = new Set(mazzo.map((v) => v.id));
      for (const x of parziale.assegnazioni) if (ammessi.has(x.id)) unite.push(x);
      for (const q of parziale.senzaNome) if (ammessi.has(q.id)) senzaUniti.push(q);
      sommaFiducia += parziale.fiducia;
      mazzettiRiusciti++;
      if (!parziale.capito) capitoTutti = false;
    }

    if (!mazzettiRiusciti) {
      conservaRisposta("assegnazione", null,
        "nessun mazzetto e' andato a buon fine al giro " + n
        + (ultimoGuaio ? " — ultimo guaio: " + ultimoGuaio : ""));
      return ass ? finaleGuardando() : null;
    }

    const a = {
      valido: true,
      assegnazioni: unite,
      senzaNome: senzaUniti,
      capito: capitoTutti,
      fiducia: sommaFiducia / mazzettiRiusciti,
    };
    ass = a;

    // Solo `nome`, `ruolo` e `fiducia`: la geometria non si tocca, e' l'unica
    // cosa certa che c'e'.
    for (const x of ass.assegnazioni) {
      const p = posti[x.id];
      if (!p) continue;
      p.nome = x.nome; p.ruolo = x.ruolo; p.fiducia = x.fiducia;
      p.fonte = "assegnazione"; p.perche = x.perche;
    }
    // ⚠️ Si contano i posti con un nome, NON le righe dell'ultima risposta.
    //    Con i mazzetti l'ultima risposta parla solo dei volumi rimasti: se si
    //    contasse quella, i nomi dati al giro prima sparirebbero dal conto e il
    //    sistema si direbbe da solo di aver fatto meno di quello che ha fatto.
    nominati = posti.filter((p) => p && p.nome).length;
    senzaNome = posti.length - nominati;
    quotaAnonima = posti.length ? senzaNome / posti.length : 1;
    sicuro = ass.capito && ass.fiducia >= FIDUCIA_PER_AGIRE;
    coperto = quotaAnonima <= QUOTA_SENZA_NOME_MAX;

    // Quello che porta al giro dopo: i nomi gia' dati (da confermare, non da
    // rifare) e le domande gia' uscite (da non ripetere uguali).
    for (const d of ass.senzaNome.map((x) => x.domanda).filter(Boolean)) {
      if (!domandeFatte.includes(d)) domandeFatte.push(d);
    }
    giaFatto = {
      nomi: posti.map((p, i) => (p && p.nome ? { id: i, nome: p.nome } : null))
        .filter(Boolean).slice(0, 24),
      domandeFatte: domandeFatte.slice(0, 6),
    };

    giri.push({ giro: giri.length + 1, passo: "assegnazione", cosaE: studio.tipo,
                fiducia: ass.fiducia, nominati, senzaNome,
                capito: ass.capito, paroleChieste: [], dubbi: ass.senzaNome.length });
    if (typeof ctx.onGiro === "function") ctx.onGiro(giri[giri.length - 1]);

    // Il cancello: si esce quando e' sicuro, non quando e' finita.
    if (sicuro && coperto) break;
    if (n >= giriMassimi) break;

    // --- (3) SI TORNA A GUARDARE, non a spazzolare parole ------------------
    //
    // ⚠️ Il secondo giro non e' «cerca queste altre 12 parole»: e' «guarda
    //    ancora, e stavolta guarda QUESTO». Il cervello dice cosa e' rimasto
    //    in dubbio, l'occhio riapre gli occhi sulle stesse immagini con quella
    //    domanda in testa. E' l'unico giro in piu' che si fa: al terzo non
    //    sarebbe piu' sicuro di quanto non lo sia al secondo, e a quel punto
    //    la persona che sa com'e' fatto quel modello e' Raffaella, non lui.
    const inDubbio = ass.senzaNome.map((s) => s.domanda).filter(Boolean).slice(0, 5);
    const mettiAFuoco = inDubbio.length
      ? inDubbio.join(" ")
      : senzaNome + " volumi su " + posti.length + " sono rimasti senza nome: guarda "
        + "se ci sono arredi, mezzi o attrezzature che al primo sguardo ti sono sfuggiti.";
    try {
      const viGiro = viste(2 + n);
      const r = await ctx.cervello(promptSguardo(viGiro.length, mettiAFuoco),
        { immagine: ctx.pianta, immagini: viGiro, passo: "sguardo", giro: n + 1 });
      conservaRisposta("sguardo", r, null);
      const s2 = leggiSguardo(r);
      if (!s2.valido) {
        conservaRisposta("sguardo", r, s2.perche || "risposta non leggibile");
        break;
      }
      // Si somma al primo sguardo: quello che aveva gia' visto non si perde.
      s2.cose = [...new Set([...(sguardo ? sguardo.cose : []), ...s2.cose])];
      s2.attorno = [...new Set([...(sguardo ? sguardo.attorno : []), ...s2.attorno])];
      sguardo = s2;
      testimonianza = sguardoInParole(s2);
      giri[giri.length - 1].paroleChieste = s2.cose.slice(0, 6);
    } catch (e) {
      conservaRisposta("sguardo", null, "l'occhio non ha risposto: " + ((e && e.message) || e));
      break;
    }
  }

  if (!ass) return null;
  return finaleGuardando();

  function finaleGuardando() {
    // Le domande sui volumi rimasti senza nome: vanno in chat, non nel silenzio.
    const domande = ass.senzaNome.map((s) => s.domanda).filter(Boolean);
    // Il dubbio sul tipo di edificio non ferma piu' niente, ma non si perde:
    // esce come domanda, prima delle altre, perche' e' quella che, se risolta,
    // rifinisce tutti i nomi insieme.
    const domandaUmana = dubbioTipo ? dubbioTipo : (sicuro && coperto)
      ? (domande.length
          ? "Ho assegnato " + nominati + " volumi su " + posti.length + ". Su questi ho un dubbio: "
            + domande[0]
          : null)
      : (domande.length
          ? domande[0]
          : "Ho nominato solo " + nominati + " volumi su " + posti.length
            + ". Mi sai dire cosa sono gli altri?");
    return {
      ok: true,
      capito: sicuro && coperto,
      agire: sicuro && coperto,
      cosaE, fiducia: ass.fiducia, studio, posti, giri,
      dubbi: ass.senzaNome.map((s) => ({ cosa: "volume " + s.id, perche: s.domanda })),
      domandaUmana,
      perche: (sicuro && coperto && !dubbioTipo) ? null
        : (dubbioTipo ? "il cervello non e' sicuro di che tipo di edificio sia, "
             + "ma ha nominato lo stesso quello che ha riconosciuto"
           : !sicuro ? "il cervello non e' sicuro dell'assegnazione"
                     : senzaNome + " volumi su " + posti.length + " restano senza nome"),
      quotaSenzaNome: +quotaAnonima.toFixed(2),
    };
  }
}

// ---------------------------------------------------------------------------
// 5. L'ANELLO
// ---------------------------------------------------------------------------
//
// @param ctx.posti          i volumi gia' MISURATI (da `__veritasCoseTrovate`)
// @param ctx.pianta         la pianta dall'alto (immagine o dataURL)
// @param ctx.inquadratura   da `veritas_vista.inquadratura`
// @param ctx.rileva         (immagine, parole) -> [{score,label,box}]   L'OCCHIO
// @param ctx.cervello       (domanda, {immagine}) -> testo              IL CERVELLO
// @param ctx.dominio        "aeroporto" | "museo" | ...
// @param ctx.giriMassimi    default GIRI_MASSIMI
// @param ctx.onGiro         (info) -> void   per mostrare l'avanzamento a schermo
//
// Occhio e cervello sono INIETTATI, come `rileva` in `veritas_riconosce.js`.
// E' la stessa ragione: cosi' il banco di prova puo' farli finti e provare
// tutto l'anello senza rete e senza spendere un token.

export async function comprendi(ctx = {}) {
  if (!ctx.posti || !ctx.posti.length) {
    return finale(false, "non ci sono volumi misurati: prima si misura, poi si guarda", []);
  }
  // ⚠️ CON GLI SCORCI SI PASSA DALLO STUDIO. Il giro a parole resta intatto
  //    sotto, e serve ancora quando non ci sono scorci o quando il cervello non
  //    risponde allo studio: nessuna strada che funzionava e' stata tolta.
  if (ctx.scorci && ctx.scorci.length && typeof ctx.cervello === "function") {
    const g = await comprendiGuardando(ctx);
    if (g) return g;
  }

  if (typeof ctx.rileva !== "function") {
    return finale(false, "l'occhio non e' disponibile", []);
  }
  if (typeof ctx.cervello !== "function") {
    return finale(false, "il cervello non e' disponibile", []);
  }
  if (!ctx.pianta || !ctx.inquadratura) {
    return finale(false, "manca la pianta vista dall'alto", []);
  }

  const giriMassimi = ctx.giriMassimi || GIRI_MASSIMI;
  const giri = [];
  const paroleAccumulate = [];   // voci di vocabolario aggiunte dal cervello
  const gia = new Set(vocabolarioPer(ctx.dominio, []).map((v) => v.chiedi));

  let ultimoEsito = null, ultimoVerdetto = null;

  for (let n = 1; n <= giriMassimi; n++) {
    // --- (a) L'OCCHIO GUARDA -------------------------------------------
    const esito = await riconosci(ctx.posti, {
      rileva: ctx.rileva,
      pianta: ctx.pianta,
      inquadratura: ctx.inquadratura,
      dominio: ctx.dominio,
      parole: paroleAccumulate,
    });

    if (!esito.ok) {
      return finale(false, "l'occhio non ha guardato: " + esito.perche, giri);
    }
    ultimoEsito = esito;

    // --- (b) L'OCCHIO RACCONTA AL CERVELLO ------------------------------
    const riass = riassuntoPerCervello(esito, {
      dominio: ctx.dominio, giro: n,
      parole: [...gia],
    });

    let risposta;
    try {
      risposta = await ctx.cervello(promptCervello(riass), { immagine: ctx.pianta, giro: n });
    } catch (e) {
      return finale(false, "il cervello non ha risposto: " + (e && e.message ? e.message : e), giri, esito);
    }

    // --- (c) IL CERVELLO GIUDICA ----------------------------------------
    const verdetto = leggiVerdetto(risposta);
    if (!verdetto.valido) {
      return finale(false, verdetto.perche, giri, esito);
    }
    ultimoVerdetto = verdetto;

    const senzaNome = esito.posti.filter((p) => !p.nome).length;
    const quotaAnonima = esito.posti.length ? senzaNome / esito.posti.length : 1;

    giri.push({
      giro: n,
      nominati: esito.nominati,
      senzaNome,
      capito: verdetto.capito,
      fiducia: verdetto.fiducia,
      paroleChieste: verdetto.parole.map((p) => p.chiedi),
      dubbi: verdetto.dubbi.length,
    });
    if (typeof ctx.onGiro === "function") ctx.onGiro(giri[giri.length - 1]);

    // --- (d) IL CANCELLO -------------------------------------------------
    // Tre condizioni, e servono TUTTE E TRE. Il cervello puo' essere
    // ottimista; la geometria no.
    const abbastanzaSicuro = verdetto.capito && verdetto.fiducia >= FIDUCIA_PER_AGIRE;
    const abbastanzaCoperto = quotaAnonima <= QUOTA_SENZA_NOME_MAX;

    if (abbastanzaSicuro && abbastanzaCoperto) {
      return {
        ok: true, capito: true, agire: true,
        cosaE: verdetto.cosaE,
        fiducia: verdetto.fiducia,
        posti: esito.posti,
        giri, dubbi: verdetto.dubbi, domandaUmana: null,
        perche: null,
        quotaSenzaNome: +quotaAnonima.toFixed(2),
      };
    }

    // Il cervello si dice sicuro ma meta' edificio non ha nome: si insiste.
    if (abbastanzaSicuro && !abbastanzaCoperto && !verdetto.parole.length) {
      return {
        ok: true, capito: false, agire: false,
        cosaE: verdetto.cosaE, fiducia: verdetto.fiducia,
        posti: esito.posti, giri, dubbi: verdetto.dubbi,
        domandaUmana: verdetto.domandaUmana
          || ("Ho riconosciuto solo " + esito.nominati + " volumi su " + esito.posti.length
              + ". Di cosa si tratta, e cosa dovrei cercare che non ho cercato?"),
        perche: "il cervello e' sicuro, ma " + senzaNome + " volumi su "
          + esito.posti.length + " restano senza nome",
        quotaSenzaNome: +quotaAnonima.toFixed(2),
      };
    }

    // --- (e) GUARDA ANCORA, con parole nuove ------------------------------
    // ⚠️ Solo parole DAVVERO nuove. Un cervello che richiede le stesse parole
    //    fa girare l'anello a vuoto: e' il modo piu' facile di bruciare token
    //    convinti di stare progredendo.
    const nuove = verdetto.parole.filter((p) => !gia.has(p.chiedi));
    if (!nuove.length) break;
    for (const p of nuove) { gia.add(p.chiedi); paroleAccumulate.push(p); }
  }

  // --- (f) FINITI I GIRI: si chiede a un umano ----------------------------
  const senzaNome = ultimoEsito ? ultimoEsito.posti.filter((p) => !p.nome).length : 0;
  return {
    ok: true, capito: false, agire: false,
    cosaE: ultimoVerdetto ? ultimoVerdetto.cosaE : null,
    fiducia: ultimoVerdetto ? ultimoVerdetto.fiducia : 0,
    posti: ultimoEsito ? ultimoEsito.posti : [],
    giri,
    dubbi: ultimoVerdetto ? ultimoVerdetto.dubbi : [],
    domandaUmana: (ultimoVerdetto && ultimoVerdetto.domandaUmana)
      || ("Ho guardato " + giri.length + " volte e non sono sicuro di aver capito questo spazio."
          + (senzaNome ? " Restano " + senzaNome + " volumi senza nome." : "")
          + " Puoi dirmi che edificio e' e cosa dovrei cercarci?"),
    perche: "dopo " + giri.length + " giri il cervello non ha dichiarato di aver capito",
    quotaSenzaNome: ultimoEsito && ultimoEsito.posti.length
      ? +(senzaNome / ultimoEsito.posti.length).toFixed(2) : 1,
  };
}

function finale(ok, perche, giri, esito) {
  return {
    ok, capito: false, agire: false, cosaE: null, fiducia: 0,
    posti: esito ? esito.posti : [],
    giri: giri || [], dubbi: [], domandaUmana: null, perche,
    quotaSenzaNome: 1,
  };
}

// ---------------------------------------------------------------------------
// 6. IL CANCELLO — «validazione prima dell'azione»
// ---------------------------------------------------------------------------
//
// Da chiamare PRIMA di far partire la simulazione. Una riga sola, e la
// pipeline smette di poter partire al buio.
//
//     const c = await comprendi({...});
//     if (!puoAgire(c)) { mostraInChat(c.domandaUmana); return; }
//     avviaSimulazione(c.posti);

export function puoAgire(comprensione) {
  const c = comprensione;
  if (!c || !c.ok) return false;
  if (c.capito && c.agire) return true;
  // Deciso da Raffaella il 28/08: ASSEGNA E DICHIARA, non bloccare.
  // Prima bastava un volume incerto perche' la simulazione non partisse mai: su
  // un modello vero restano sempre volumi che nessuno sa cosa siano, e uno
  // strumento che si blocca all'ultimo dubbio non parte mai e non si vende.
  // Il confine che regge: non si INVENTA un nome per far partire il giro. I
  // volumi incerti restano senza nome, il dubbio resta scritto e finisce nel
  // referto, la simulazione cammina su quelli che un nome ce l'hanno. E' un
  // report parziale che lo dichiara, non un report falso.
  const nominati = (c.posti || []).filter((p) => p && p.nome).length;
  return nominati >= 2;
}

// ---------------------------------------------------------------------------
// 7. Raccontarlo in italiano
// ---------------------------------------------------------------------------

export function racconta(c) {
  if (!c) return "";
  if (!c.ok) return "Non ho potuto capire lo spazio: " + c.perche + ".";

  const righe = [];
  if (c.capito) {
    righe.push("✅ Ho capito lo spazio" + (c.cosaE ? ": " + c.cosaE : "") + ".");
    righe.push("   Fiducia " + Math.round(c.fiducia * 100) + "%, dopo "
      + c.giri.length + (c.giri.length === 1 ? " giro" : " giri") + " fra occhio e cervello.");
  } else {
    righe.push("❓ Non sono sicuro di aver capito questo spazio.");
    if (c.perche) righe.push("   " + c.perche.charAt(0).toUpperCase() + c.perche.slice(1) + ".");
  }

  for (const g of c.giri) {
    righe.push("   giro " + g.giro + ": " + g.nominati + " nominati, " + g.senzaNome
      + " senza nome, fiducia " + Math.round(g.fiducia * 100) + "%"
      + (g.paroleChieste.length ? " -> poi ho cercato: " + g.paroleChieste.join(", ") : ""));
  }

  if (c.dubbi && c.dubbi.length) {
    righe.push("   Quello che non mi torna:");
    for (const d of c.dubbi.slice(0, 5)) righe.push("     - " + d.cosa + (d.perche ? " (" + d.perche + ")" : ""));
  }

  if (c.domandaUmana) {
    righe.push("");
    righe.push("💬 " + c.domandaUmana);
  }

  righe.push("");
  const nominatiOra = (c.posti || []).filter((p) => p && p.nome).length;
  righe.push(c.agire
    ? "La simulazione puo' partire."
    : (puoAgire(c)
        ? "Parto con i " + nominatiOra + " volumi che ho riconosciuto. I dubbi qui sopra restano dichiarati: non li ho nominati a caso e finiscono nel referto."
        : "Non ho riconosciuto abbastanza per far camminare qualcuno: servono almeno due volumi con un nome."));
  return righe.join("\n");
}

export default {
  conservaRisposta,
  GIRI_MASSIMI, FIDUCIA_PER_AGIRE, QUOTA_SENZA_NOME_MAX, RUOLI, VOLUMI_PER_MAZZETTO,
  riassuntoPerCervello, promptCervello, leggiVerdetto,
  volumiPerCervello, promptStudio, leggiStudio,
  promptAssegnazione, leggiAssegnazione, comprendiGuardando,
  comprendi, puoAgire, racconta,
};
