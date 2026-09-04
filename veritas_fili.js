// =============================================================================
// VERITAS — I FILI: sbloccare i processori fermi
// =============================================================================
//
// IL PROBLEMA, misurato il 04/09/2026 sulla pagina viva.
//
// L'occhio (OWLv2 in WebAssembly) gira su UN FILO SOLO, e uno sguardo costa
// circa 200 secondi. La macchina ha DODICI processori e restano fermi. Non e'
// una svista di configurazione: il motore ONNX puo' usare piu' fili solo se la
// pagina e' «cross-origin isolated», e una pagina lo diventa solo se il server
// manda due intestazioni:
//
//     Cross-Origin-Opener-Policy: same-origin
//     Cross-Origin-Embedder-Policy: credentialless
//
// GitHub Pages serve file statici e NON manda intestazioni proprie. Misurato:
// `crossOriginIsolated: false`, `SharedArrayBuffer` non esiste.
//
// ⚠️ E le altre due strade sono chiuse, provate una per pagina:
//    - la scheda video (`webgpu/q4f16`) non apre questo modello, ne' col proxy
//      ne' senza: sempre `267935216`;
//    - ridurre il vocabolario non serve a NIENTE: 4 parole costano 202,8 s,
//      16 parole 201,3 s. Il tempo se ne va a guardare l'immagine, e si paga
//      una volta sola.
//
// LA CORREZIONE. Un service worker sta in mezzo fra la pagina e la rete, e le
// intestazioni che il server non manda puo' aggiungerle lui. Da quel momento
// la pagina e' isolata, `SharedArrayBuffer` esiste, e `numThreads` si puo'
// alzare.
//
// ⚠️ SI SCEGLIE `credentialless` E NON `require-corp`, di proposito. Con
//    `require-corp` ogni risorsa che arriva da un'altra origine deve dichiarare
//    di volersi far includere, e qui ne arrivano parecchie che non lo fanno:
//    three.js e la libreria di visione da jsdelivr, spark da sparkjs.dev, il
//    progetto da Supabase, il cervello da `localhost:1234`. Con `require-corp`
//    si spegnerebbe mezzo programma per accendere i fili.
//    `credentialless` isola la pagina lo stesso: le richieste verso altre
//    origini partono senza credenziali, e non serve che nessuno dichiari niente.
//
// ⚠️ COME SI SPEGNE, se qualcosa va storto: aprire la pagina con `?nocoi` in
//    coda all'indirizzo. Il file si cancella da solo e la pagina torna com'era.
//    Sta scritto qui e non altrove perche' chi lo trova rotto deve poterlo
//    spegnere senza cercare in giro.

/* eslint-env serviceworker */

if (typeof window === "undefined") {
  // -------------------------------------------------------------------------
  // Dentro il service worker
  // -------------------------------------------------------------------------
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

  self.addEventListener("message", (e) => {
    if (e.data && e.data.type === "spegniti") self.registration.unregister();
  });

  self.addEventListener("fetch", (e) => {
    const r = e.request;
    // ⚠️ Le richieste `only-if-cached` non same-origin non si possono
    //    rispondere: toccarle rompe la navigazione all'indietro.
    if (r.cache === "only-if-cached" && r.mode !== "same-origin") return;

    e.respondWith(
      fetch(r)
        .then((res) => {
          // Risposta opaca (arriva da un'altra origine in `no-cors`): il corpo
          // non si puo' leggere ne' ricostruire. Si lascia passare com'e' —
          // con `credentialless` e' permessa.
          if (res.status === 0) return res;
          const h = new Headers(res.headers);
          h.set("Cross-Origin-Opener-Policy", "same-origin");
          h.set("Cross-Origin-Embedder-Policy", "credentialless");
          h.set("Cross-Origin-Resource-Policy", "cross-origin");
          return new Response(res.body, {
            status: res.status,
            statusText: res.statusText,
            headers: h,
          });
        })
        .catch((err) => {
          console.error("[VERITAS fili] rete:", err && err.message ? err.message : err);
          throw err;
        })
    );
  });
} else {
  // -------------------------------------------------------------------------
  // Dentro la pagina
  // -------------------------------------------------------------------------
  (function () {
    const sorgente = document.currentScript && document.currentScript.src;

    function spegni() {
      if (!navigator.serviceWorker) return;
      navigator.serviceWorker.getRegistrations().then((tutte) => {
        for (const reg of tutte) reg.unregister();
        console.log("[VERITAS fili] spento, i fili tornano a uno");
      });
    }
    window.__veritasFiliSpegni = spegni;

    if (location.search.indexOf("nocoi") >= 0) { spegni(); return; }

    if (window.crossOriginIsolated) {
      console.log("[VERITAS fili] pagina gia' isolata: " +
        (navigator.hardwareConcurrency || "?") + " processori disponibili");
      return;
    }
    if (!window.isSecureContext || !navigator.serviceWorker || !sorgente) {
      console.log("[VERITAS fili] non attivabile qui: la pagina resta a un filo solo");
      return;
    }

    navigator.serviceWorker.register(sorgente).then(
      (reg) => {
        // ⚠️ La PRIMA navigazione non passa dal service worker: e' arrivata
        //    prima che esistesse. Serve un ricaricamento, e uno solo — il
        //    segno in `sessionStorage` impedisce l'anello infinito se per
        //    qualche motivo l'isolamento non arriva.
        if (reg.active && !navigator.serviceWorker.controller) {
          if (!sessionStorage.getItem("veritasFiliRicaricato")) {
            sessionStorage.setItem("veritasFiliRicaricato", "1");
            console.log("[VERITAS fili] acceso: ricarico una volta per isolare la pagina");
            location.reload();
          }
        }
      },
      (err) => console.log("[VERITAS fili] non si e' acceso: " +
        (err && err.message ? err.message : err))
    );
  })();
}
