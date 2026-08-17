// =============================================================================
// VERITAS — Ponte verso un modello linguistico LOCALE
// =============================================================================
//
// A cosa serve: far capire a VERITAS le frasi normali. Oggi la console e' un
// parser a regole e capisce "visibilita" ma non "fammi vedere cosa si vede dai
// gate". Chi apre il prodotto non conosce i comandi, e non deve impararli.
//
// COSA FA E COSA NON FA — e' la parte importante.
//
// Il modello NON esegue niente e NON calcola niente. Traduce una frase in uno
// dei comandi che ESISTONO GIA', e lo fa passare dallo stesso dispatcher a
// regole di sempre (window.__veritasRunCommand). Non guadagna nessun potere
// nuovo: se propone qualcosa che non e' nel vocabolario qui sotto, si scarta.
//
// La ragione non e' prudenza generica. In questo prodotto un numero deve
// essere RIPRODUCIBILE: se un cliente contesta una larghezza, quella misura va
// rifatta identica. Un modello linguistico non e' riproducibile, quindi non
// tocca ne' misure, ne' quote, ne' KPI, ne' scala. Quelle restano geometria.
//   - la geometria MISURA
//   - il modello CAPISCE L'INTENZIONE
//
// Interviene solo DOPO che le regole hanno fallito: finche' si scrive
// "visibilita" non viene nemmeno interpellato, quindi non rallenta nulla e non
// puo' far regredire un comando che gia' funziona.
//
// Nessun costo: gira in locale (LM Studio / Ollama / llama.cpp, tutti con API
// compatibile OpenAI). Se non e' raggiungibile, la console torna a comportarsi
// esattamente come prima.
// =============================================================================

(function () {
  "use strict";

  const LS_URL = "veritas_llm_url";
  const LS_MODEL = "veritas_llm_model";
  const LS_ON = "veritas_llm_on";

  // LM Studio espone l'API compatibile OpenAI su questa porta.
  const URL_DEFAULT = "http://localhost:1234/v1";
  const MODEL_DEFAULT = "local-model"; // LM Studio accetta un identificativo qualsiasi

  const cfg = {
    get url() { return localStorage.getItem(LS_URL) || URL_DEFAULT; },
    get model() { return localStorage.getItem(LS_MODEL) || MODEL_DEFAULT; },
    get attivo() { return localStorage.getItem(LS_ON) !== "0"; },
    set(url, model, attivo) {
      if (url) localStorage.setItem(LS_URL, url.replace(/\/$/, ""));
      if (model) localStorage.setItem(LS_MODEL, model);
      localStorage.setItem(LS_ON, attivo === false ? "0" : "1");
    },
  };

  // -------------------------------------------------------------------------
  // Il vocabolario. E' l'unica cosa che il modello puo' produrre.
  //
  // Ogni voce e' un comando che il dispatcher a regole gia' sa eseguire: il
  // modello sceglie, non inventa. `esempi` non serve al codice ma al modello,
  // ed e' li' che si insegna il mestiere senza riaddestrare nulla.
  // -------------------------------------------------------------------------
  const VOCABOLARIO = [
    { cmd: "analizza", quando: "rileggere lo spazio, rifare l'analisi delle zone",
      esempi: ["rianalizza il modello", "rileggi lo spazio", "rifai l'analisi"] },
    { cmd: "visibilita", quando: "cosa si vede da dove, linee di vista, orientamento, segnaletica visiva",
      esempi: ["cosa si vede dai gate", "si vede l'uscita dall'ingresso?", "controlla le linee di vista"] },
    { cmd: "accessibilita", quando: "passaggi, larghezze, sedia a rotelle, barriere",
      esempi: ["e' accessibile in carrozzina?", "i passaggi sono larghi abbastanza?", "verifica le barriere"] },
    { cmd: "report struttura", quando: "colli di bottiglia, criticita' della struttura",
      esempi: ["dove sono i colli di bottiglia", "quali sono le criticita'", "mostrami i punti critici"] },
    { cmd: "scala modello {n}", quando: "correggere la scala del modello; {n} e' il fattore numerico",
      esempi: ["il modello e' troppo piccolo, raddoppialo -> scala modello 2",
               "portalo a scala reale, e' 6 volte piu' piccolo -> scala modello 6"] },
    { cmd: "assegna {zona}", quando: "assegnare un ruolo a una zona; {zona} e' il nome della zona",
      esempi: ["questa e' la lounge -> assegna lounge", "metti il gate qui -> assegna gate"] },
    { cmd: "avvia simulazione", quando: "far partire la simulazione degli agenti",
      esempi: ["parti", "fai camminare le persone", "lancia la simulazione"] },
  ];

  function prompt() {
    const righe = VOCABOLARIO.map((v) =>
      `- "${v.cmd}" — ${v.quando}\n    es. ${v.esempi.join(" | ")}`).join("\n");
    return [
      "Sei il traduttore di comandi di VERITAS, uno strumento di analisi spaziale.",
      "Il tuo UNICO compito e' tradurre la frase dell'utente in UNO dei comandi elencati.",
      "",
      "COMANDI DISPONIBILI:",
      righe,
      "",
      "REGOLE FERREE:",
      "1. Rispondi SOLO con JSON: {\"comando\": \"...\"} oppure {\"comando\": null, \"perche\": \"...\"}.",
      "2. Non calcolare niente. Non inventare misure, larghezze, aree o quote:",
      "   quelle le misura la geometria, non tu. Se ti chiedono un numero che non",
      "   e' nella frase stessa, rispondi comando null.",
      "3. Se nessun comando corrisponde, rispondi comando null. Non forzare.",
      "4. Sostituisci {n} e {zona} con i valori presi DALLA FRASE dell'utente.",
      "",
      "Esempi:",
      'utente: "fammi vedere cosa si vede dai gate" -> {"comando": "visibilita"}',
      'utente: "ci passa una carrozzina?" -> {"comando": "accessibilita"}',
      'utente: "e\' 6 volte piu\' piccolo del vero" -> {"comando": "scala modello 6"}',
      'utente: "che tempo fa a Roma" -> {"comando": null, "perche": "fuori ambito"}',
      'utente: "quanto e\' largo il corridoio" -> {"comando": null, "perche": "e\' una misura, non un comando"}',
    ].join("\n");
  }

  // Accetta solo cio' che il vocabolario prevede. E' la rete che impedisce al
  // modello di far accadere qualcosa che le regole non sanno gia' fare.
  function validaComando(c) {
    if (typeof c !== "string") return null;
    const s = c.trim().toLowerCase();
    if (!s) return null;
    for (const v of VOCABOLARIO) {
      const modello = v.cmd.toLowerCase();
      if (modello.includes("{n}")) {
        const m = s.match(new RegExp("^" + modello.replace("{n}", "([\\d.,]+)") + "$"));
        if (m && isFinite(parseFloat(m[1].replace(",", ".")))) return s;
      } else if (modello.includes("{zona}")) {
        const m = s.match(new RegExp("^" + modello.replace("{zona}", "([a-z0-9 _-]{1,40})") + "$"));
        if (m) return s;
      } else if (s === modello) {
        return s;
      }
    }
    return null;
  }

  function estraiJSON(testo) {
    if (typeof testo !== "string") return null;
    // I modelli piccoli incorniciano spesso il JSON in ```json ... ``` o lo
    // fanno precedere da una frase. Si prende il primo oggetto bilanciato.
    const i = testo.indexOf("{");
    if (i < 0) return null;
    let liv = 0;
    for (let k = i; k < testo.length; k++) {
      if (testo[k] === "{") liv++;
      else if (testo[k] === "}") {
        liv--;
        if (liv === 0) { try { return JSON.parse(testo.slice(i, k + 1)); } catch (e) { return null; } }
      }
    }
    return null;
  }

  async function interroga(frase, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs || 20000);
    try {
      const res = await fetch(cfg.url + "/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: cfg.model,
          // temperatura 0: la stessa frase deve dare sempre lo stesso comando.
          // In uno strumento professionale una console che cambia idea fra due
          // tentativi identici e' peggio di una console che non capisce.
          temperature: 0,
          max_tokens: 120,
          messages: [
            { role: "system", content: prompt() },
            { role: "user", content: frase },
          ],
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const dati = await res.json();
      const testo = dati && dati.choices && dati.choices[0] &&
                    dati.choices[0].message && dati.choices[0].message.content;
      return estraiJSON(testo);
    } finally { clearTimeout(timer); }
  }

  // Verifica di raggiungibilita', con diagnosi distinte: "spento" e "bloccato
  // dal browser" si curano in due modi diversi e non vanno confusi.
  async function prova() {
    try {
      const res = await fetch(cfg.url + "/models", { method: "GET" });
      if (!res.ok) return { ok: false, causa: "http", dettaglio: "HTTP " + res.status };
      const d = await res.json();
      const ids = ((d && d.data) || []).map((m) => m.id);
      return { ok: true, modelli: ids };
    } catch (e) {
      const misto = location.protocol === "https:" && cfg.url.startsWith("http:");
      return {
        ok: false,
        causa: misto ? "bloccato" : "irraggiungibile",
        dettaglio: (e && e.message) || String(e),
      };
    }
  }

  let inCorso = false;

  // Si registra come estensione: il dispatcher a regole la interpella solo
  // dopo aver fallito da solo.
  window.__veritasCommandExtensions = window.__veritasCommandExtensions || [];
  window.__veritasCommandExtensions.push(function (raw) {
    if (!cfg.attivo) return false;
    if (inCorso) return false; // niente rientri: il comando tradotto non torna qui
    if (typeof window.__veritasRunCommand !== "function") return false;
    const dillo = window.__veritasChatLog || function () {};

    inCorso = true;
    interroga(raw).then((out) => {
      const comando = validaComando(out && out.comando);
      if (!comando) {
        const perche = (out && out.perche) || "nessun comando corrispondente";
        console.log("[VERITAS LLM] nessuna traduzione:", perche, "- frase:", JSON.stringify(raw));
        dillo("assistant", "Non ho capito cosa vuoi che faccia. Prova a dirmelo in altre parole, "
                         + "oppure usa un comando diretto come \"visibilita\" o \"accessibilita\".");
        return;
      }
      console.log("[VERITAS LLM]", JSON.stringify(raw), "->", JSON.stringify(comando));
      dillo("system", "Ho capito: " + comando);
      window.__veritasRunCommand(comando);
    }).catch((e) => {
      // Il modello locale spento non e' un errore dell'utente: si torna al
      // comportamento di prima, dicendolo una volta sola e senza allarmismi.
      console.warn("[VERITAS LLM] modello locale non raggiungibile:", (e && e.message) || e);
      dillo("assistant", "Non ho capito, e il modello locale non risponde "
                       + "(" + cfg.url + "). Usa un comando diretto, oppure controlla che "
                       + "il server locale sia acceso.");
    }).finally(() => { inCorso = false; });

    return true; // preso in carico: la risposta arriva in modo asincrono
  });

  window.__veritasLLM = { cfg, prova, validaComando, estraiJSON, VOCABOLARIO, prompt };
  console.log("[VERITAS LLM] ponte al modello locale pronto —", cfg.url,
              "(modello:", cfg.model + ").",
              "Configura con window.__veritasLLM.cfg.set(url, modello), prova con __veritasLLM.prova()");
})();
