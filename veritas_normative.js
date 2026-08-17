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
    // ====================================================== ANTINCENDIO — IT
    {
      id: "it_dm1998_uscita",
      ambito: "antincendio",
      giurisdizione: "IT",
      fonte: "DM 10/03/1998",
      riferimento: "allegato III, punto 3.3",
      titolo: "Larghezza minima delle uscite",
      grandezza: "larghezza_uscita_m",
      operatore: ">=",
      valore: 0.80,
      unita: "m",
      nota: "La larghezza va comunque dimensionata sull'affollamento, in multipli del modulo da 0,60 m.",
      validato: false,
    },
    {
      id: "it_dm2015_via_esodo",
      ambito: "antincendio",
      giurisdizione: "IT",
      fonte: "DM 03/08/2015 (Codice di prevenzione incendi)",
      riferimento: "sez. S.4",
      titolo: "Larghezza minima delle vie di esodo",
      grandezza: "larghezza_via_esodo_m",
      operatore: ">=",
      valore: 0.90,
      unita: "m",
      nota: "Minimo assoluto. Il valore di progetto sale con l'affollamento servito dalla via.",
      validato: false,
    },
    {
      id: "it_dm1998_percorso",
      ambito: "antincendio",
      giurisdizione: "IT",
      fonte: "DM 10/03/1998",
      riferimento: "allegato III, punto 3.3",
      titolo: "Lunghezza massima del percorso di esodo",
      grandezza: "lunghezza_percorso_esodo_m",
      operatore: "<=",
      // La soglia NON esiste in assoluto: dipende dal livello di rischio, che
      // e' una classificazione di progetto. Senza quel dato non c'e' verdetto,
      // e la regola lo dichiara invece di scegliere un valore per conto suo.
      dipendeDa: "rischioIncendio",
      valorePer: { basso: 60, medio: 45, elevato: 30 },
      unita: "m",
      nota: "Rischio basso 45-60 m, medio 30-45 m, elevato 15-30 m. Qui si usa l'estremo "
          + "superiore di ciascuna fascia. La classificazione del rischio la fa il progettista.",
      validato: false,
    },
    {
      id: "it_dm1998_moduli",
      ambito: "antincendio",
      giurisdizione: "IT",
      fonte: "DM 10/03/1998",
      riferimento: "allegato III, punto 3.3",
      titolo: "Larghezza complessiva delle uscite in rapporto all'affollamento",
      grandezza: "larghezza_uscita_totale_m",
      operatore: ">=",
      // Larghezza = 0,60 m x numero di moduli, con moduli = affollamento / 50
      // (capacita' di deflusso al piano terra).
      dipendeDa: "affollamento",
      valoreDa: (n) => +(0.60 * Math.ceil(n / 50)).toFixed(2),
      unita: "m",
      nota: "Moduli da 0,60 m, capacita' di deflusso 50 persone per il piano terra "
          + "(37,5 ai piani superiori, caso non coperto qui).",
      validato: false,
    },
    // ===================================================== ANTINCENDIO — USA
    {
      id: "us_ibc_uscita",
      ambito: "antincendio",
      giurisdizione: "US",
      fonte: "International Building Code (IBC)",
      riferimento: "sez. 1010.1.1",
      titolo: "Larghezza libera delle porte di esodo",
      grandezza: "larghezza_uscita_m",
      operatore: ">=",
      valore: 0.815, // 32 in
      unita: "m",
      nota: "32 pollici di luce netta.",
      validato: false,
    },
    {
      id: "us_ibc_corridoio_esodo",
      ambito: "antincendio",
      giurisdizione: "US",
      fonte: "International Building Code (IBC)",
      riferimento: "sez. 1020.2",
      titolo: "Larghezza minima dei corridoi di esodo",
      grandezza: "larghezza_via_esodo_m",
      operatore: ">=",
      valore: 1.118, // 44 in
      unita: "m",
      nota: "44 pollici con affollamento pari o superiore a 50 persone; sotto tale soglia il minimo scende.",
      validato: false,
    },
  ];

  // ================================================== AFFOLLAMENTO E SOCIALE
  //
  // ⚠️ QUESTE NON SONO NORME COGENTI, e il report deve dirlo.
  //
  // Densita' di folla, livelli di servizio e distanze interpersonali sono
  // standard di progetto e risultati di ricerca: si citano, si usano, si
  // difendono in una relazione — ma nessuno viola una legge superandoli.
  // Presentarli come obblighi accanto al DM 236 significherebbe indebolire
  // anche quelli veri.
  const REGOLE_SOCIALI = [
    {
      id: "fruin_los_camminamento",
      ambito: "affollamento",
      giurisdizione: "—",
      cogente: false,
      fonte: "Fruin, Pedestrian Planning and Design (1971)",
      riferimento: "Level of Service D/E per i camminamenti",
      titolo: "Densita' oltre la quale il cammino si degrada",
      grandezza: "densita_p_m2",
      operatore: "<=",
      valore: 1.08,
      unita: "p/m²",
      nota: "Al di sopra si perde la liberta' di scegliere la propria velocita' e di sorpassare: "
          + "il flusso diventa a scatti. Soglia di comfort, non di sicurezza.",
      validato: false,
    },
    {
      id: "sicurezza_folla",
      ambito: "affollamento",
      giurisdizione: "—",
      cogente: false,
      fonte: "Still, Introduction to Crowd Science (2014)",
      riferimento: "soglie di densita' critica",
      titolo: "Densita' di rischio per la folla",
      grandezza: "densita_p_m2",
      operatore: "<=",
      valore: 4.0,
      unita: "p/m²",
      nota: "Oltre questa densita' il contatto diventa continuo e le onde di pressione si "
          + "propagano da persona a persona: e' il meccanismo degli incidenti da schiacciamento. "
          + "Sopra 5 p/m² il movimento individuale non e' piu' possibile.",
      validato: false,
    },
    {
      id: "green_guide_statico",
      ambito: "affollamento",
      giurisdizione: "UK",
      cogente: false,
      fonte: "Guide to Safety at Sports Grounds (Green Guide, 6a ed.)",
      riferimento: "capienza delle aree in piedi",
      titolo: "Densita' massima per aree con pubblico in piedi",
      grandezza: "densita_p_m2",
      operatore: "<=",
      valore: 4.7,
      unita: "p/m²",
      nota: "47 persone ogni 10 m², riferito ad aree statiche e sorvegliate, non a spazi di transito.",
      validato: false,
    },
    {
      id: "hall_distanza_sociale",
      ambito: "affollamento",
      giurisdizione: "—",
      cogente: false,
      fonte: "Hall, The Hidden Dimension (1966)",
      riferimento: "distanza sociale",
      titolo: "Distanza interpersonale in attesa",
      grandezza: "distanza_interpersonale_m",
      operatore: ">=",
      valore: 1.20,
      unita: "m",
      nota: "Sotto questa distanza si entra nella sfera personale: in coda si tollera, in "
          + "sosta prolungata produce disagio. Varia molto per cultura, ed e' descrittiva.",
      validato: false,
    },
  ];
  REGOLE.push(...REGOLE_SOCIALI);

  // ---------------------------------------------------------------------------
  // COSA NON E' CODIFICATO, E PERCHE'.
  //
  // Un elenco di assenze dichiarate vale piu' di un elenco di soglie a meta':
  // dice a chi legge il report dove NON deve fidarsi.
  //
  // - Dimensionamento delle uscite sull'affollamento (moduli da 0,60 m). Serve
  //   il numero di occupanti, che dipende dalla destinazione d'uso: e' una
  //   decisione di progetto, non una misura geometrica.
  // - Classificazione del rischio di incendio (basso / medio / elevato). Da
  //   essa dipende la lunghezza massima del percorso, e la fa il progettista.
  // - Numero minimo di uscite indipendenti e loro distanza angolare.
  // - Resistenza al fuoco, compartimentazione, filtri a prova di fumo: sono
  //   proprieta' dei materiali e delle chiusure, invisibili in una nuvola di
  //   punti.
  // - Travel distance NFPA 101: dipende da destinazione d'uso e presenza di
  //   impianto sprinkler, due informazioni che il modello non contiene.
  //
  // Aggiungerle a indovinare sarebbe il modo piu' rapido di rendere questo
  // strumento inutilizzabile in sede professionale.
  // ---------------------------------------------------------------------------

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
  // I dati di progetto: cio' che un modello 3D NON puo' contenere e che solo
  // chi progetta sa. Vivono in window.__veritasDatiProgetto, il pannello li
  // riempie, e da qui dipendono le soglie condizionate.
  const DATI_RICHIESTI = {
    rischioIncendio: {
      etichetta: "Classificazione del rischio di incendio",
      tipo: "scelta",
      opzioni: ["basso", "medio", "elevato"],
      perche: "Da essa dipende la lunghezza massima ammessa del percorso di esodo: "
            + "60 m se basso, 45 se medio, 30 se elevato. Senza questo dato la verifica "
            + "sull'esodo non ha una soglia, e nessuno puo' sceglierla al posto tuo.",
      fonte: "DM 10/03/1998, allegato III",
    },
    affollamento: {
      etichetta: "Affollamento previsto (persone)",
      tipo: "numero",
      perche: "La larghezza complessiva delle uscite si dimensiona su questo: moduli da "
            + "0,60 m, uno ogni 50 persone. E' una decisione legata alla destinazione d'uso, "
            + "non una grandezza geometrica.",
      fonte: "DM 10/03/1998, allegato III",
    },
  };

  function datiProgetto() {
    return (typeof window !== "undefined" && window.__veritasDatiProgetto) || {};
  }

  // Risolve la soglia di una regola condizionata. Restituisce null quando il
  // dato manca: e' il caso che va DETTO, non colmato con un valore plausibile.
  function soglia(r, dati) {
    if (!r.dipendeDa) return r.valore;
    const v = dati ? dati[r.dipendeDa] : undefined;
    if (v === undefined || v === null || v === "") return null;
    if (r.valorePer) return r.valorePer[v] != null ? r.valorePer[v] : null;
    if (r.valoreDa) {
      const n = Number(v);
      return isFinite(n) && n > 0 ? r.valoreDa(n) : null;
    }
    return r.valore;
  }

  function valuta(misure, opzioni) {
    const opt = opzioni || {};
    const ambito = opt.ambito || null;
    const giurisdizione = opt.giurisdizione || null;
    const dati = opt.dati || datiProgetto();
    const esiti = [];
    for (const r of REGOLE) {
      if (ambito && r.ambito !== ambito) continue;
      if (giurisdizione && r.giurisdizione !== giurisdizione) continue;
      // Prima la soglia: se dipende da un dato che manca, la regola non si
      // valuta e lo dichiara. Una verifica che sceglie in silenzio il valore
      // che le conviene e' peggio di una verifica assente.
      const s = soglia(r, dati);
      if (s === null) {
        esiti.push({ regola: r, stato: "dipendenza_mancante", manca: r.dipendeDa,
                     conformi: 0, difformi: 0, peggiore: null, soglia: null });
        continue;
      }
      const valori = (misure && misure[r.grandezza]) || [];
      if (!valori.length) {
        esiti.push({ regola: r, stato: "non_misurabile", conformi: 0, difformi: 0, peggiore: null, soglia: s });
        continue;
      }
      let conformi = 0, difformi = 0, peggiore = null;
      for (const v of valori) {
        if (typeof v !== "number" || !isFinite(v)) continue;
        if (confronta(v, r.operatore, s)) conformi++;
        else {
          difformi++;
          // il peggiore e' il piu' lontano dalla soglia, nel verso che viola
          if (peggiore === null) peggiore = v;
          else if (r.operatore === ">=" ? v < peggiore : v > peggiore) peggiore = v;
        }
      }
      if (!conformi && !difformi) {
        esiti.push({ regola: r, stato: "non_misurabile", conformi: 0, difformi: 0, peggiore: null, soglia: s });
      } else {
        esiti.push({
          regola: r,
          stato: difformi ? "difforme" : "conforme",
          conformi, difformi, peggiore, soglia: s,
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
    const val = esito.soglia != null ? esito.soglia : r.valore;
    const sogliaTxt = val + " " + r.unita;
    if (esito.stato === "dipendenza_mancante") {
      const d = DATI_RICHIESTI[esito.manca];
      return "◻️ " + r.titolo + ": non verificabile, manca un dato di progetto — "
           + (d ? d.etichetta.toLowerCase() : esito.manca) + " (" + dove + ").";
    }
    if (esito.stato === "non_misurabile") {
      return "· " + r.titolo + " (" + dove + ", " + r.operatore + " " + sogliaTxt + "): non misurabile su questo modello.";
    }
    if (esito.stato === "conforme") {
      return "✅ " + r.titolo + ": " + esito.conformi + " casi verificati, tutti entro la soglia ("
           + dove + ", " + (r.operatore === ">=" ? "minimo " : "massimo ") + sogliaTxt + ")."
           + (r.cogente === false ? " — standard di progetto, non norma cogente." : "");
    }
    const totale = esito.conformi + esito.difformi;
    const segno = r.cogente === false ? "🟠" : "❌";
    return segno + " " + r.titolo + ": " + esito.difformi + " casi su " + totale
         + (r.cogente === false ? " oltre la soglia" : " non conformi") + ", il peggiore "
         + esito.peggiore.toFixed(2) + " " + r.unita + " contro " + sogliaTxt + " ("
         + dove + ")." + (r.cogente === false ? " — standard di progetto, non norma cogente." : "");
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

  // Quali dati di progetto mancano, con il PERCHE' servono. Un pannello che
  // chiede un numero senza dire a cosa serve non viene compilato.
  function dipendenzeMancanti(esiti) {
    const chiavi = Array.from(new Set(
      esiti.filter((e) => e.stato === "dipendenza_mancante").map((e) => e.manca)));
    return chiavi.map((k) => ({ chiave: k, ...DATI_RICHIESTI[k] }));
  }

  window.__veritasNormative = {
    REGOLE, valuta, racconta, avvertenzaValidazione, confronta,
    DATI_RICHIESTI, dipendenzeMancanti, soglia, datiProgetto,
    ambiti: () => Array.from(new Set(REGOLE.map((r) => r.ambito))),
    giurisdizioni: () => Array.from(new Set(REGOLE.map((r) => r.giurisdizione))),
  };
  console.log("[VERITAS norme]", REGOLE.length, "soglie caricate —",
              window.__veritasNormative.ambiti().join(", "),
              "| giurisdizioni:", window.__veritasNormative.giurisdizioni().join(", "),
              "|", REGOLE.filter((r) => !r.validato).length, "da validare");
})();
