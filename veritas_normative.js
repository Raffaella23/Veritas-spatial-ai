// =============================================================================
// VERITAS — Riferimenti normativi
// =============================================================================
//
// Confronta le misure prodotte dal motore geometrico con soglie di norma, e
// dice cosa e' conforme e cosa no, CITANDO LA FONTE.
//
// PERCHE' SOGLIE E NON TESTI. I testi integrali di UNI, ISO, NFPA e simili
// sono sotto copyright e non si possono riprodurre. Ma per un confronto
// automatico servono comunque i numeri, non la prosa: norma, articolo,
// grandezza, valore, unita'. Cosi' e' anche verificabile — chi legge il
// report puo' andare all'articolo citato e controllare.
//
// ⚠️ OGNI REGOLA NASCE CON `validato: false`.
//
// Non e' una formalita'. Una soglia sbagliata in un report di conformita' e'
// peggio di nessun report: da' una sicurezza falsa su una cosa che riguarda
// l'incolumita' delle persone. Finche' un professionista non ha verificato
// una regola sulla fonte, VERITAS la usa ma la dichiara "da validare", e il
// report lo scrive. Il campo si alza a mano, una regola per volta.
//
// COME SI ESTENDE. Ogni regola e' una riga di REGOLE con un `ambito`
// ("accessibilita", "antincendio", "affollamento"). Aggiungere un ambito non
// richiede di toccare il motore di valutazione: si aggiungono righe.
//
// I numeri non escono mai da un modello linguistico: sono trascritti dalle
// norme e citati. Un LLM che "ricorda" una soglia e' esattamente il modo di
// costruire un report indifendibile.
// =============================================================================

(function () {
  "use strict";

  // ---------------------------------------------------------------------------
  // grandezza: cosa si misura. Il motore geometrico gia' produce:
  //   larghezza_varco_m    larghezza dei passaggi fra ambienti (gateways)
  //   larghezza_strettoia_m i punti piu' stretti lungo i percorsi (bottlenecks)
  //   rotazione_m          diametro libero disponibile per girare
  //   pendenza_pct         pendenza dei percorsi
  //   altezza_libera_m     altezza sotto ostacoli sporgenti
  // ---------------------------------------------------------------------------
  const REGOLE = [
    // ---------------------------------------------------------------- ITALIA
    {
      id: "it_dm236_porta",
      ambito: "accessibilita",
      giurisdizione: "IT",
      fonte: "DM 236/1989",
      riferimento: "art. 8.1.1",
      titolo: "Luce netta delle porte",
      grandezza: "larghezza_varco_m",
      operatore: ">=",
      valore: 0.80,
      unita: "m",
      nota: "Luce netta minima della porta. Le porte di accesso principali richiedono misure maggiori.",
      validato: false,
    },
    {
      id: "it_dm236_corridoio",
      ambito: "accessibilita",
      giurisdizione: "IT",
      fonte: "DM 236/1989",
      riferimento: "art. 8.1.9",
      titolo: "Larghezza dei corridoi",
      grandezza: "larghezza_strettoia_m",
      operatore: ">=",
      valore: 1.00,
      unita: "m",
      nota: "Oltre alla larghezza minima la norma richiede allargamenti per l'inversione di marcia.",
      validato: false,
    },
    {
      id: "it_dm236_rotazione",
      ambito: "accessibilita",
      giurisdizione: "IT",
      fonte: "DM 236/1989",
      riferimento: "art. 8.0.2",
      titolo: "Spazio di manovra, rotazione 360 gradi",
      grandezza: "rotazione_m",
      operatore: ">=",
      valore: 1.50,
      unita: "m",
      nota: "Diametro del cerchio libero necessario a una rotazione completa in carrozzina.",
      validato: false,
    },
    {
      id: "it_dm236_rampa",
      ambito: "accessibilita",
      giurisdizione: "IT",
      fonte: "DM 236/1989",
      riferimento: "art. 8.1.11",
      titolo: "Pendenza delle rampe",
      grandezza: "pendenza_pct",
      operatore: "<=",
      valore: 8,
      unita: "%",
      nota: "Pendenze superiori sono ammesse solo in rapporto allo sviluppo lineare della rampa.",
      validato: false,
    },
    // ------------------------------------------------------------------- USA
    {
      id: "us_ada_percorso",
      ambito: "accessibilita",
      giurisdizione: "US",
      fonte: "ADA Standards for Accessible Design (2010)",
      riferimento: "sez. 403.5.1",
      titolo: "Larghezza libera del percorso accessibile",
      grandezza: "larghezza_strettoia_m",
      operatore: ">=",
      valore: 0.915, // 36 in
      unita: "m",
      nota: "36 pollici. Ammessa la riduzione a 815 mm (32 in) per tratti non superiori a 610 mm.",
      validato: false,
    },
    {
      id: "us_ada_porta",
      ambito: "accessibilita",
      giurisdizione: "US",
      fonte: "ADA Standards for Accessible Design (2010)",
      riferimento: "sez. 404.2.3",
      titolo: "Luce netta delle porte",
      grandezza: "larghezza_varco_m",
      operatore: ">=",
      valore: 0.815, // 32 in
      unita: "m",
      nota: "32 pollici misurati con l'anta aperta a 90 gradi.",
      validato: false,
    },
    {
      id: "us_ada_rotazione",
      ambito: "accessibilita",
      giurisdizione: "US",
      fonte: "ADA Standards for Accessible Design (2010)",
      riferimento: "sez. 304.3.1",
      titolo: "Spazio di rotazione",
      grandezza: "rotazione_m",
      operatore: ">=",
      valore: 1.525, // 60 in
      unita: "m",
      nota: "60 pollici di diametro; in alternativa e' ammesso lo spazio a T della sez. 304.3.2.",
      validato: false,
    },
    {
      id: "us_ada_rampa",
      ambito: "accessibilita",
      giurisdizione: "US",
      fonte: "ADA Standards for Accessible Design (2010)",
      riferimento: "sez. 405.2",
      titolo: "Pendenza delle rampe",
      grandezza: "pendenza_pct",
      operatore: "<=",
      valore: 8.33, // 1:12
      unita: "%",
      nota: "Rapporto massimo 1:12.",
      validato: false,
    },
    {
      id: "us_ada_altezza",
      ambito: "accessibilita",
      giurisdizione: "US",
      fonte: "ADA Standards for Accessible Design (2010)",
      riferimento: "sez. 307.4",
      titolo: "Altezza libera sotto oggetti sporgenti",
      grandezza: "altezza_libera_m",
      operatore: ">=",
      valore: 2.03, // 80 in
      unita: "m",
      nota: "80 pollici. Sotto questa quota un oggetto sporgente e' un ostacolo non rilevabile con il bastone.",
      validato: false,
    },
  ];

  function confronta(valore, operatore, soglia) {
    return operatore === ">=" ? valore >= soglia - 1e-9 : valore <= soglia + 1e-9;
  }

  // ---------------------------------------------------------------------------
  // Valutazione.
  //
  // `misure` e' un dizionario grandezza -> array di valori misurati, cosi'
  // com'escono dal motore geometrico. Per ogni regola si contano i casi
  // conformi e non, e si tiene IL PEGGIORE: in una verifica di conformita' la
  // media non significa niente, conta il punto che non passa.
  // ---------------------------------------------------------------------------
  function valuta(misure, opzioni) {
    const opt = opzioni || {};
    const ambito = opt.ambito || null;
    const giurisdizione = opt.giurisdizione || null;
    const esiti = [];
    for (const r of REGOLE) {
      if (ambito && r.ambito !== ambito) continue;
      if (giurisdizione && r.giurisdizione !== giurisdizione) continue;
      const valori = (misure && misure[r.grandezza]) || [];
      if (!valori.length) {
        esiti.push({ regola: r, stato: "non_misurabile", conformi: 0, difformi: 0, peggiore: null });
        continue;
      }
      let conformi = 0, difformi = 0, peggiore = null;
      for (const v of valori) {
        if (typeof v !== "number" || !isFinite(v)) continue;
        if (confronta(v, r.operatore, r.valore)) conformi++;
        else {
          difformi++;
          // il peggiore e' il piu' lontano dalla soglia, nel verso che viola
          if (peggiore === null) peggiore = v;
          else if (r.operatore === ">=" ? v < peggiore : v > peggiore) peggiore = v;
        }
      }
      if (!conformi && !difformi) {
        esiti.push({ regola: r, stato: "non_misurabile", conformi: 0, difformi: 0, peggiore: null });
      } else {
        esiti.push({
          regola: r,
          stato: difformi ? "difforme" : "conforme",
          conformi, difformi, peggiore,
        });
      }
    }
    return esiti;
  }

  // Frase leggibile, con la fonte. Un verdetto senza citazione non e'
  // difendibile davanti a nessuno.
  function racconta(esito) {
    const r = esito.regola;
    const dove = r.fonte + ", " + r.riferimento;
    const soglia = r.valore + " " + r.unita;
    if (esito.stato === "non_misurabile") {
      return "· " + r.titolo + " (" + dove + ", " + r.operatore + " " + soglia + "): non misurabile su questo modello.";
    }
    if (esito.stato === "conforme") {
      return "✅ " + r.titolo + ": " + esito.conformi + " casi verificati, tutti conformi ("
           + dove + ", minimo " + soglia + ").";
    }
    const totale = esito.conformi + esito.difformi;
    return "❌ " + r.titolo + ": " + esito.difformi + " casi su " + totale + " non conformi, il peggiore "
         + esito.peggiore.toFixed(2) + " " + r.unita + " contro " + soglia + " richiesti ("
         + dove + ").";
  }

  // Le regole non ancora validate da un professionista vanno dichiarate nel
  // report, non nascoste.
  function avvertenzaValidazione(esiti) {
    const daValidare = esiti.filter((e) => !e.regola.validato).length;
    if (!daValidare) return null;
    return "⚠️ " + daValidare + " delle " + esiti.length + " soglie usate non sono ancora state "
         + "validate da un professionista sulla fonte originale. I valori sono trascritti dalle norme "
         + "citate, ma finche' la verifica non e' fatta questo confronto vale come indicazione "
         + "progettuale, non come attestazione di conformita'.";
  }

  window.__veritasNormative = {
    REGOLE, valuta, racconta, avvertenzaValidazione, confronta,
    ambiti: () => Array.from(new Set(REGOLE.map((r) => r.ambito))),
    giurisdizioni: () => Array.from(new Set(REGOLE.map((r) => r.giurisdizione))),
  };
  console.log("[VERITAS norme]", REGOLE.length, "soglie caricate —",
              window.__veritasNormative.ambiti().join(", "),
              "| giurisdizioni:", window.__veritasNormative.giurisdizioni().join(", "),
              "|", REGOLE.filter((r) => !r.validato).length, "da validare");
})();
