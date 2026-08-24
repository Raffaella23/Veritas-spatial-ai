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

import { riconosci, vocabolarioPer, racconta as raccontaOcchio } from "./veritas_riconosce.js";

// ---------------------------------------------------------------------------
// 1. Le soglie. Dichiarate qui, una volta, e non sparse nel codice.
// ---------------------------------------------------------------------------

// Quanti giri al massimo prima di arrendersi e chiedere a un umano.
// Tre e' un compromesso misurato: il primo giro usa il vocabolario di base,
// il secondo le parole che il cervello ha chiesto, il terzo e' l'ultima
// occasione. Oltre, il cervello sta girando a vuoto e va fermato.
export const GIRI_MASSIMI = 3;

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
  if (typeof testo !== "string" || !testo.trim()) {
    return { valido: false, perche: "il cervello non ha risposto niente" };
  }

  // Il modello puo' incartare il JSON in un blocco markdown: si scarta l'involucro.
  let grezzo = testo.trim();
  const blocco = grezzo.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (blocco) grezzo = blocco[1].trim();
  const apre = grezzo.indexOf("{"), chiude = grezzo.lastIndexOf("}");
  if (apre === -1 || chiude <= apre) {
    return { valido: false, perche: "nella risposta del cervello non c'e' un oggetto JSON" };
  }

  let v;
  try {
    v = JSON.parse(grezzo.slice(apre, chiude + 1));
  } catch (e) {
    return { valido: false, perche: "il JSON del cervello non si legge: " + (e && e.message) };
  }

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
  return !!(comprensione && comprensione.ok && comprensione.capito && comprensione.agire);
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
  righe.push(c.agire
    ? "La simulazione puo' partire."
    : "La simulazione NON parte finche' non ho capito: preferisco chiedere che indovinare.");
  return righe.join("\n");
}

export default {
  GIRI_MASSIMI, FIDUCIA_PER_AGIRE, QUOTA_SENZA_NOME_MAX,
  riassuntoPerCervello, promptCervello, leggiVerdetto,
  comprendi, puoAgire, racconta,
};
