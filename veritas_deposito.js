// =============================================================================
// VERITAS — IL DEPOSITO: dove sta il modello di un progetto
// =============================================================================
//
// Il problema che chiude, misurato il 02/09/2026: un progetto salvato portava
// le tappe, le telecamere e i parametri, e basta. Nessun campo diceva su quale
// file lavorasse. Riaprendolo, l'edificio non c'era — e quando ogni tanto
// c'era, era la cache del browser, non il progetto.
//
// La decisione presa il 02/09 e non piu' riaperta: **il file resta nel
// browser.** Non si spende altro in spazio sul server. Quindi:
//
//   - i byte del file stanno qui, in IndexedDB, con la chiave del progetto.
//     ⚠️ Non `localStorage`: quello tiene testo e sta stretto (5 MB scarsi),
//     e un GLB di aeroporto pesa 19 MB. IndexedDB tiene i byte;
//   - il progetto, sul server, salva solo NOME e PESO del file. Servono a due
//     cose: riconoscere che il file ritrovato e' quello giusto, e poter DIRE
//     quale file chiedere quando non c'e' piu' (altra macchina, altro
//     browser, cache pulita).
//
// Due magazzini invece di uno, e non e' un dettaglio: la schermata d'apertura
// deve dire di venti progetti se il modello ce l'hanno, e leggere venti volte
// 19 MB per rispondere "si'" bloccherebbe l'apertura per secondi. Le SCHEDE
// sono poche decine di byte l'una e si leggono tutte insieme; i BYTE si
// toccano solo quando un progetto viene davvero aperto.
//
// Nessuna dipendenza, nessun import: e' uno script normale caricato prima del
// blocco 2, cosi' quando il blocco 2 parte il deposito c'e' gia'.
// =============================================================================

(function () {
  "use strict";

  var NOME_DB = "veritas-deposito";
  var VERSIONE = 1;
  var BYTE = "byte";      // chiave = id progetto, valore = { nome, peso, tipo, byte, quando }
  var SCHEDE = "schede";  // chiave = id progetto, valore = { nome, peso, tipo, quando }

  var aperturaInCorso = null;

  // -------------------------------------------------------------------------
  // Aprire il database una volta sola.
  //
  // Se IndexedDB non c'e' o e' negato (navigazione privata su certi browser,
  // impostazioni restrittive) NON si solleva un errore: si restituisce null e
  // tutto il resto del programma continua a funzionare come prima, cioe'
  // chiedendo il file all'utente. Un deposito che non si apre e' una comodita'
  // in meno, non un guasto.
  // -------------------------------------------------------------------------
  function apri() {
    if (aperturaInCorso) return aperturaInCorso;
    aperturaInCorso = new Promise(function (risolvi) {
      var richiesta;
      try {
        if (typeof indexedDB === "undefined" || !indexedDB) { risolvi(null); return; }
        richiesta = indexedDB.open(NOME_DB, VERSIONE);
      } catch (e) {
        console.warn("[VERITAS deposito] IndexedDB non disponibile:", e && e.message);
        risolvi(null);
        return;
      }
      richiesta.onupgradeneeded = function () {
        var db = richiesta.result;
        if (!db.objectStoreNames.contains(BYTE)) db.createObjectStore(BYTE);
        if (!db.objectStoreNames.contains(SCHEDE)) db.createObjectStore(SCHEDE);
      };
      richiesta.onsuccess = function () { risolvi(richiesta.result); };
      richiesta.onerror = function () {
        console.warn("[VERITAS deposito] non si apre:", richiesta.error && richiesta.error.message);
        risolvi(null);
      };
      richiesta.onblocked = function () { risolvi(null); };
    });
    return aperturaInCorso;
  }

  function operazione(magazzini, modo, lavoro) {
    return apri().then(function (db) {
      if (!db) return null;
      return new Promise(function (risolvi) {
        var tx;
        try { tx = db.transaction(magazzini, modo); }
        catch (e) { console.warn("[VERITAS deposito] transazione rifiutata:", e && e.message); risolvi(null); return; }
        var esito = null;
        tx.oncomplete = function () { risolvi(esito); };
        tx.onerror = function () {
          console.warn("[VERITAS deposito] transazione fallita:", tx.error && tx.error.message);
          risolvi(null);
        };
        tx.onabort = function () {
          console.warn("[VERITAS deposito] transazione annullata:", tx.error && tx.error.message);
          risolvi(null);
        };
        try {
          lavoro(tx, function (v) { esito = v; });
        } catch (e) {
          console.warn("[VERITAS deposito] errore dentro la transazione:", e && e.message);
          try { tx.abort(); } catch (e2) {}
        }
      });
    });
  }

  // -------------------------------------------------------------------------
  // Tenere il file di un progetto.
  //
  // Si scrive nei due magazzini nella STESSA transazione: se la scrittura dei
  // byte non entra (quota piena), non deve restare una scheda che promette un
  // modello che non c'e'. Una scheda bugiarda e' peggio di nessuna scheda:
  // farebbe dire alla schermata d'apertura "pronto" davanti a un progetto
  // vuoto, che e' esattamente il difetto da cui si e' partiti.
  // -------------------------------------------------------------------------
  function salva(idProgetto, file) {
    if (!idProgetto || !file) return Promise.resolve(false);
    return file.arrayBuffer().then(function (byte) {
      var scheda = {
        nome: file.name || "modello",
        peso: file.size || (byte && byte.byteLength) || 0,
        tipo: file.type || "",
        quando: new Date().toISOString(),
      };
      return operazione([BYTE, SCHEDE], "readwrite", function (tx, poni) {
        var pieno = {
          nome: scheda.nome, peso: scheda.peso, tipo: scheda.tipo,
          quando: scheda.quando, byte: byte,
        };
        tx.objectStore(BYTE).put(pieno, idProgetto);
        tx.objectStore(SCHEDE).put(scheda, idProgetto);
        poni(scheda);
      });
    }).then(function (scheda) {
      if (scheda) {
        console.log("[VERITAS deposito] tenuto nel browser: " + scheda.nome +
          " (" + Math.round(scheda.peso / 1048576) + " MB) per il progetto " + idProgetto);
        return true;
      }
      console.warn("[VERITAS deposito] il file non e' stato tenuto: il progetto chiedera' di ricaricarlo");
      return false;
    }).catch(function (e) {
      console.warn("[VERITAS deposito] non ho potuto tenere il file:", e && e.message);
      return false;
    });
  }

  // Il file intero, byte compresi. Si chiama solo aprendo un progetto.
  function leggi(idProgetto) {
    if (!idProgetto) return Promise.resolve(null);
    return operazione([BYTE], "readonly", function (tx, poni) {
      var r = tx.objectStore(BYTE).get(idProgetto);
      r.onsuccess = function () { poni(r.result || null); };
    });
  }

  // Solo il cartellino: nome, peso, quando. Nessun byte.
  function scheda(idProgetto) {
    if (!idProgetto) return Promise.resolve(null);
    return operazione([SCHEDE], "readonly", function (tx, poni) {
      var r = tx.objectStore(SCHEDE).get(idProgetto);
      r.onsuccess = function () { poni(r.result || null); };
    });
  }

  // Tutti i cartellini in un colpo: e' quello che serve alla schermata
  // d'apertura per dire, riga per riga, se il modello c'e'.
  function schede() {
    return operazione([SCHEDE], "readonly", function (tx, poni) {
      var m = tx.objectStore(SCHEDE);
      var chiavi = m.getAllKeys();
      var valori = m.getAll();
      chiavi.onsuccess = function () {
        valori.onsuccess = function () {
          var mappa = {};
          var k = chiavi.result || [], v = valori.result || [];
          for (var i = 0; i < k.length; i++) mappa[k[i]] = v[i];
          poni(mappa);
        };
      };
    }).then(function (m) { return m || {}; });
  }

  // Buttare il modello di un progetto: si chiama quando il progetto stesso
  // viene buttato, altrimenti i 19 MB resterebbero nel browser per sempre,
  // legati a una chiave che non esiste piu'.
  function butta(idProgetto) {
    if (!idProgetto) return Promise.resolve(false);
    return operazione([BYTE, SCHEDE], "readwrite", function (tx, poni) {
      tx.objectStore(BYTE).delete(idProgetto);
      tx.objectStore(SCHEDE).delete(idProgetto);
      poni(true);
    }).then(function (v) { return !!v; });
  }

  // Il file ritrovato e' quello giusto? Si confronta con quello che il
  // progetto dichiara sul server. Il peso al byte e' un confronto onesto: due
  // esportazioni diverse dello stesso edificio non pesano mai identiche.
  function combacia(scheda_, dichiarato) {
    if (!scheda_ || !dichiarato) return false;
    if (dichiarato.nome && scheda_.nome && dichiarato.nome !== scheda_.nome) return false;
    if (dichiarato.peso && scheda_.peso && dichiarato.peso !== scheda_.peso) return false;
    return true;
  }

  window.__veritasDeposito = {
    salva: salva,
    leggi: leggi,
    scheda: scheda,
    schede: schede,
    butta: butta,
    combacia: combacia,
  };
})();
