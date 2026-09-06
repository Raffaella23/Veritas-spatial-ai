// ============================================================================
// LA CARTA — il vestito chiaro della piattaforma.
// Raffaella, 05/09/2026. Deciso guardando banco/marchio.html.
//
// COS'E': uno STRATO, non una riscrittura. Si accende e si spegne con un
// attributo su <html>. Spento, non esiste: nessuna regola qui dentro tocca
// niente se manca `data-veritas-vestito="carta"`. Su una decisione visiva di
// questa portata non si scrive niente di definitivo prima di averla vista, e
// «averla vista» vuol dire poterla anche togliere.
//
//   window.veritasCarta.accendi()   // bianco
//   window.veritasCarta.spegni()    // com'era
//   window.veritasCarta.inverti()
//
// ⚠️ LA FINESTRA TECNICA NON E' NERA, E' GRIGIA CON UN RETICOLO.
//    Raffaella, 05/09, seconda passata — e questa SOSTITUISCE la prima, che
//    diceva «il nero va nella finestra tecnica e basta»: «non uno sfondo
//    nero, ma uno sfondo grigio con un reticolo in filigrana spaziale».
//    La ragione di fondo non cambia: un modello illuminato su bianco pieno si
//    slava, spariscono le sue ombre proprie e la sagoma si scioglie. Ma il
//    grigio quel lavoro lo fa lo stesso, e senza aprire un buco nero in mezzo
//    a una piattaforma di carta. Il reticolo e' il foglio a quadretti sotto
//    il disegno: da' la misura senza chiedere attenzione.
//
// ⚠️ IL VETRO DIVENTA CARTA, e non e' un dettaglio. Il vestito scuro regge su
//    `backdrop-filter: blur(34px)`: il vetro smerigliato si legge come
//    profondita' perche' sotto c'e' luminosita' da sfocare. Su bianco, vetro
//    bianco su fondo bianco non e' niente — i pannelli perdono il bordo e
//    galleggiano. Quindi qui la sfocatura si SPEGNE e il pannello torna a
//    definirsi come si e' sempre definito un foglio: un filo di contorno e
//    un'ombra corta. Invertire i numeri senza fare questo e' il modo in cui
//    un'interfaccia chiara sembra una scura girata male.
// ============================================================================

// ─── I DUE BIANCHI ──────────────────────────────────────────────────────────
// Hanno due mestieri diversi, ed e' la ragione per cui sono due.
// Se il fondo e' gia' bianco pieno non resta niente sopra: ogni pannello puo'
// solo scendere, e una velatura si legge come una MACCHIA. Con la carta sotto,
// il bianco pieno torna a essere la cosa che si SOLLEVA.
//   carta  #FAFBFA  il fondo di tutto — ed e' lo stesso bianco su cui e'
//                   disegnato il marchio: la piattaforma sta letteralmente
//                   sulla carta su cui e' nato il logo.
//   alzato #FFFFFF  solo cio' che si stacca: il corpo di una finestra, una
//                   tabella, un campo. Non e' un fondo, e' un rilievo.

// ─── LE QUATTRO VELATURE ────────────────────────────────────────────────────
// Dei quattro colori del marchio si tiene SOLO IL GRADO. Chiarezza e croma
// sono imposte uguali per tutti e quattro: e' quello che fa la differenza fra
// una famiglia e quattro cugini.
//   266°  era #2E5BFF   modello       le cose che ci sono
//   292°  era #7B2FF7   simulazione   le cose che si muovono
//   349°  era #E0219A   esiti         le cose venute fuori
//    63°  era #FF9A1F   norme         le cose da guardare
//
// ⚠️ LA TINTA DEVE DIRE QUALCOSA. Se si alternano per varieta' diventano
//    decorazione, e peggio: l'occhio si mette a cercare un significato che non
//    c'e'. Assegnate al TIPO di finestra, in un giorno si impara dove sta la
//    roba a colpo d'occhio.
//
// ⚠️ E NON SI SCHIARISCONO MESCOLANDOLE AL BIANCO. Misurato il 05/09: alla
//    dose leggerissima (9%) lo scarto di chiarezza fra la piu' chiara e la
//    piu' scura e' 0,022, invisibile — li' la scorciatoia funziona davvero.
//    Ma al 22%, la dose a cui una velatura si vede sul serio su uno schermo
//    mediocre o in proiezione, lo scarto sale a 0,055: l'ambra resta a 0,944
//    mentre il viola scende a 0,889, e la fila non e' piu' pari. La regola non
//    serve per come stanno oggi, serve per come reggono quando qualcuno le
//    dovra' spingere.

const GRADI = { modello: 266, simulazione: 292, esiti: 349, norme: 63 };

const CSS = `
/* ═══ 1 · I GETTONI ══════════════════════════════════════════════════════ */
html[data-veritas-vestito="carta"]{
  --va-carta:#FAFBFA;
  --va-alzato:#FFFFFF;

  /* Il vetro non e' piu' vetro: e' un foglio. Opaco, e definito dal bordo. */
  --va-vetro:#FFFFFF;
  --va-vetro-su:#F4F5FA;
  --va-sfuma:none;

  /* Il filo gira: era una linea di LUCE sul scuro, diventa una linea di
     INCHIOSTRO sul chiaro. Stessa funzione, contrasto rovesciato. */
  --va-orlo:rgba(22,24,58,.11);

  --va-testo:#16183A;
  /* ⚠️ ERA #6B6F8A: 4,75:1 sulla carta. Passa la soglia per un pelo, ma le
     etichette qui sono maiuscoletto da 10 px con la spaziatura larga, e li'
     un contrasto di soglia si legge male davvero — Raffaella, 05/09: «i testi
     risultano poco leggibili». Misurato e alzato a 6,71:1: resta chiaramente
     secondario rispetto all'inchiostro (16,5:1), ma si legge. */
  --va-testo-fioco:#41455C;   /* 8,9:1 — Raffaella: «piu' scuri» (era 6,71) */

  /* L'ombra sul chiaro dev'essere CORTA e poco densa. Quella di prima
     (40px, nero al 62%) sul bianco fa una pozza grigia: sul scuro non si
     vedeva perche' cadeva su altro scuro. E la riga di luce in alto sparisce:
     sul bianco non c'e' niente da schiarire. */
  --va-ombra:0 1px 2px rgba(22,24,58,.05), 0 10px 26px -16px rgba(22,24,58,.30);

  /* Il ciano era un accento da fondo scuro: sul bianco non esiste.
     Va al blu che apre le ali del marchio. */
  --va-accento:#2E5BFF;

  color-scheme: light;
}

/* ═══ 2 · IL FONDO ═══════════════════════════════════════════════════════ */
html[data-veritas-vestito="carta"],
html[data-veritas-vestito="carta"] body{
  background:var(--va-carta)!important;
  color:var(--va-testo);
}

/* ═══ 3 · IL VETRO DIVENTA CARTA ═════════════════════════════════════════ */
html[data-veritas-vestito="carta"] .va-vetro,
html[data-veritas-vestito="carta"] .va-vetrificato,
html[data-veritas-vestito="carta"] #vaio-brand,
html[data-veritas-vestito="carta"] #vaio-toolbar button{
  background:var(--va-alzato)!important;
  backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  border-color:var(--va-orlo)!important;
  box-shadow:var(--va-ombra)!important;
  color:var(--va-testo)!important;
}
html[data-veritas-vestito="carta"] #vaio-toolbar button:hover{
  background:var(--va-vetro-su)!important;
}

/* ═══ 4 · I FONDI SCURI DEL BUNDLE ═══════════════════════════════════════ */
/* Questi valgono per l'INTERNO dell'applicazione, oltre il cancello: li'
   il fondo scuro e' scritto dentro il nome della classe (Tailwind con
   valore arbitrario: bg-[#0c0f17]/70). Non passa da nessuna variabile,
   quindi l'unico modo di raggiungerlo senza rimettere le mani nel bundle —
   che e' il blocco che non si tocca — e' pescarlo dal nome.
   ⚠️ NON VERIFICATO CON GLI OCCHI: oltre l'accesso non ci sono ancora
      arrivato. Sono 15 tinte in 45 punti, e queste sono quelle che paiono
      fare da fondo. Da guardare al primo accesso vero.
   ⚠️ Si pesca solo 'bg-': le stesse tinte usate come testo o bordo hanno
      bisogno di un trattamento diverso, piu' sotto. */
html[data-veritas-vestito="carta"] [class*="bg-[#0c0f17]"],
html[data-veritas-vestito="carta"] [class*="bg-[#0a0c12]"],
html[data-veritas-vestito="carta"] [class*="bg-[#080a0f]"],
html[data-veritas-vestito="carta"] [class*="bg-[#11151f]"],
html[data-veritas-vestito="carta"] [class*="bg-[#0f172a]"],
html[data-veritas-vestito="carta"] [class*="bg-[#1e293b]"],
html[data-veritas-vestito="carta"] [class*="bg-[#0c0c0c]"],
html[data-veritas-vestito="carta"] [class*="bg-[#141414]"]{
  background-color:var(--va-alzato)!important;
}

/* ═══ 4-bis · LA SCHERMATA D'ACCESSO ═════════════════════════════════════ */
/* ⚠️ NON passa da Tailwind: ha un foglio suo, tutto '.v-*', scritto a mano
      dentro index.html. Le regole di sopra non la toccavano nemmeno di
      striscio, e infatti restava nera. Verificato guardandola, non dedotto.

   E' LA FACCIA: e' la prima cosa che vede chiunque, ed e' la schermata che
   finisce in ogni dimostrazione e in ogni immagine di lancio. Se il bianco
   deve reggere da qualche parte, deve reggere qui. */
html[data-veritas-vestito="carta"] #veritas-overlay{
  background:var(--va-carta)!important;
  color:var(--va-testo)!important;
}
html[data-veritas-vestito="carta"] .v-card{
  background:var(--va-alzato)!important;
  border-color:var(--va-orlo)!important;
  box-shadow:var(--va-ombra)!important;
}
/* IL MARCHIO SULLA FACCIA. Raffaella, 05/09: «non vedo il logo».
   Aveva ragione: sulla schermata d'accesso non c'era. C'era solo la scritta.
   ⚠️ Si usa la versione TRASPARENTE, non quella su bianco: la scheda e'
      #FFFFFF e la carta e' #FAFBFA, quindi il file col fondo cotto dentro
      lascerebbe vedere il suo rettangolo — di un soffio, ma si vede. E' la
      ragione per cui la versione trasparente e' stata fatta. */
/* ⚠️ SOLO SULLA SCHEDA D'ACCESSO, non su tutte. '.v-card' e' riusata da
      ogni finestra dell'applicazione — impostazioni, progetti, salvataggio —
      e senza questo filtro il marchio intero si ripeteva dentro ognuna. Che
      e' esattamente la decorazione che volevamo evitare: un marchio ripetuto
      smette di essere un marchio e diventa carta da parati.
      Il marchio sta all'INGRESSO. Dentro, il suo posto e' la barra in alto. */
html[data-veritas-vestito="carta"] .v-card:has(input[type="password"])::before{
  content:'';
  display:block;
  width:min(215px,64%);
  aspect-ratio:920/501;
  margin:2px auto 20px;
  background:url("./Assets/eidetica_intero_trasparente.webp") center/contain no-repeat;
}
/* Il titolo torna in inchiostro: ora che sopra c'e' il marchio, un titolo
   colorato farebbe tre blu in una pagina sola — marchio, titolo, bottone — e
   il bottone e' l'unico che deve chiamare. */
html[data-veritas-vestito="carta"] .v-card h1{ color:var(--va-testo)!important; }
/* ⚠️ E sulla scheda d'accesso il titolo si NASCONDE: sopra c'e' il marchio,
      che quella parola la dice gia', disegnata. Scriverla due volte di fila
      e' la stessa cosa detta due volte. */
html[data-veritas-vestito="carta"] .v-card:has(input[type="password"]) h1{ display:none!important; }

/* ⚠️ I GRIGI DEL BUNDLE, che erano grigi MEDI su fondo nero e sul bianco
   diventano invisibili. Misurati sulla carta: text-zinc-400 (#A1A1AA) fa
   2,4:1 — sotto qualunque soglia. Non e' un ritocco, e' roba che oggi non
   si legge.
   ⚠️ NON VERIFICATO CON GLI OCCHI: sta oltre l'accesso. */
html[data-veritas-vestito="carta"] [class*="text-zinc-400"],
html[data-veritas-vestito="carta"] [class*="text-zinc-500"],
html[data-veritas-vestito="carta"] [class*="text-slate-400"],
html[data-veritas-vestito="carta"] [class*="text-slate-500"],
html[data-veritas-vestito="carta"] [class*="text-gray-400"]{
  color:var(--va-testo-fioco)!important;
}
html[data-veritas-vestito="carta"] [class*="text-zinc-100"],
html[data-veritas-vestito="carta"] [class*="text-zinc-200"],
html[data-veritas-vestito="carta"] [class*="text-zinc-300"],
html[data-veritas-vestito="carta"] [class*="text-slate-200"],
html[data-veritas-vestito="carta"] [class*="text-slate-300"]{
  color:var(--va-testo)!important;
}
html[data-veritas-vestito="carta"] .v-card p.sub,
html[data-veritas-vestito="carta"] .v-field label,
html[data-veritas-vestito="carta"] .v-switch,
html[data-veritas-vestito="carta"] .v-hint,
html[data-veritas-vestito="carta"] .v-logout,
html[data-veritas-vestito="carta"] .v-scopa{ color:var(--va-testo-fioco)!important; }

/* IL CAMPO RIENTRA. Qui i due bianchi lavorano davvero: la scheda e' bianco
   pieno e si SOLLEVA dalla carta; il campo da compilare e' carta e RIENTRA
   dentro la scheda. Sul scuro questo si otteneva col nero piu' nero — stessa
   idea, un piano piu' in giu'. */
html[data-veritas-vestito="carta"] .v-field input,
html[data-veritas-vestito="carta"] .v-field select{
  background:var(--va-carta)!important;
  border-color:var(--va-orlo)!important;
  color:var(--va-testo)!important;
}
html[data-veritas-vestito="carta"] .v-field input:focus,
html[data-veritas-vestito="carta"] .v-field select:focus{
  border-color:var(--va-accento)!important;
}

/* ⚠️ IL BOTTONE ERA BIANCO SU NERO. Sul bianco sparisce — bianco su bianco.
      Diventa pieno, nel blu che apre le ali del marchio: e' l'azione
      principale della schermata, e ora e' anche l'unica cosa satura che
      c'e'. Su una pagina di carta basta quello per dire dove si preme. */
html[data-veritas-vestito="carta"] .v-btn{
  background:var(--va-accento)!important;
  color:#FFFFFF!important;
}
html[data-veritas-vestito="carta"] .v-btn:hover{ background:#2449CC!important; }
html[data-veritas-vestito="carta"] .v-btn.secondary{
  background:var(--va-alzato)!important;
  color:var(--va-testo)!important;
  border-color:var(--va-orlo)!important;
}
html[data-veritas-vestito="carta"] .v-btn.secondary:hover{ background:var(--va-vetro-su)!important; }
html[data-veritas-vestito="carta"] .v-switch a,
html[data-veritas-vestito="carta"] .v-file-scelto{ color:var(--va-accento)!important; }

/* L'errore restava leggibile anche cosi', ma era tarato sul nero: rosso
   chiaro su fondo scuro. Sul bianco il chiaro va invertito, se no e' una
   macchia rosa che non allarma nessuno. */
html[data-veritas-vestito="carta"] .v-error{
  background:rgba(220,38,38,.06)!important;
  border-color:rgba(220,38,38,.28)!important;
  color:#B91C1C!important;
}

/* ═══ 5 · CIO' CHE ERA CHIARO PERCHE' STAVA SU SCURO ═════════════════════ */
/* 'text-white' e 'border-white' erano la regola quando il fondo era nero.
   Sul bianco sono invisibili — e sono tanti: 45 bordi e 12 testi.
   ⚠️ ECCEZIONE: un testo bianco DENTRO un bottone pieno o una pastiglia
      colorata deve restare bianco, perche' li' il fondo scuro c'e' ancora.
      Per questo l'esclusione .va-pieno / [class*="bg-blue-"] eccetera. */
html[data-veritas-vestito="carta"] [class*="text-white"]:not(.va-pieno):not([class*="bg-blue-"]):not([class*="bg-emerald-"]):not([class*="bg-amber-"]):not([class*="bg-rose-"]):not(button){
  color:var(--va-testo)!important;
}
html[data-veritas-vestito="carta"] [class*="border-white"]{
  border-color:var(--va-orlo)!important;
}

/* ═══ 6 · LE QUATTRO VELATURE ════════════════════════════════════════════ */
/* Si usano cosi':  <div class="va-velato va-esiti"> ... </div>
   Aggiungere una quinta finestra vuol dire scegliere un grado, non inventare
   un colore. */
html[data-veritas-vestito="carta"] .va-modello    { --va-grado:${GRADI.modello}; }
html[data-veritas-vestito="carta"] .va-simulazione{ --va-grado:${GRADI.simulazione}; }
html[data-veritas-vestito="carta"] .va-esiti      { --va-grado:${GRADI.esiti}; }
html[data-veritas-vestito="carta"] .va-norme      { --va-grado:${GRADI.norme}; }

/* ⚠️ LA VELATURA DA SOLA NON SI VEDEVA. E' a chiarezza 0,965: giusta come
      fondo, ma su un blocco piccolo dentro un pannello bianco e' un soffio, e
      Raffaella infatti ha detto «mancano ancora».
      Quindi la velatura resta il fondo, e accanto ci va un FILO DI MARGINE
      nel colore pieno — come il segno a matita sul bordo di una tavola per
      dire di che serie e'. Quello si vede da lontano senza colorare niente. */
html[data-veritas-vestito="carta"] .va-velato{
  background:oklch(.965 .026 var(--va-grado))!important;
  border-left:3px solid oklch(.62 .16 var(--va-grado))!important;
  border-radius:0 8px 8px 0!important;
  backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  color:var(--va-testo)!important;
}

/* L'ETICHETTA prende l'inchiostro colorato: e' la cosa che si legge per
   prima, ed e' li' che la tinta deve dire il mestiere. */
html[data-veritas-vestito="carta"] .va-scritta{
  color:oklch(.50 .14 var(--va-grado))!important;
  font-weight:600!important;
}
/* L'intestazione della finestra e' l'unico posto dove la tinta si fa vedere
   davvero: e' li' che dice DI CHE FINESTRA SI TRATTA. */
html[data-veritas-vestito="carta"] .va-velato > header,
html[data-veritas-vestito="carta"] .va-velato .va-testata{
  border-bottom:1px solid oklch(.90 .045 var(--va-grado))!important;
  color:oklch(.50 .14 var(--va-grado))!important;
}
/* Il corpo si SOLLEVA dalla velatura: bianco pieno sopra il tinto. */
html[data-veritas-vestito="carta"] .va-velato .va-corpo{
  background:var(--va-alzato)!important;
}

/* ═══ 7 · LA FINESTRA TECNICA: GRIGIA, COL RETICOLO ═════════════════════ */
/* La tela 3D e' TRASPARENTE (verificato: alpha true sul contesto WebGL), e
   ne' lei ne' il suo contenitore dipingono un fondo. Quindi il fondo glielo
   si puo' dare qui, in CSS, senza entrare nel motore 3D e senza toccare il
   ciclo di disegno. Il modello ci si appoggia sopra.

   IL GRIGIO. Non bianco: un modello illuminato su bianco pieno perde le
   proprie ombre e la sagoma si scioglie. Non nero: aprirebbe un buco in
   mezzo a una piattaforma di carta. Questo e' il grigio della camera chiara.

   IL RETICOLO, due passi. Uno fitto da 24 px che da' la grana, e uno largo
   da 120 px che da' la misura — come un foglio a quadretti, dove i quadretti
   piccoli si sentono e le righe grosse si contano. Sono tutti e due
   debolissimi apposta: un reticolo che si vede e' un reticolo che disturba. */
/* ⚠️ QUI RESTA SOLO IL GRIGIO. Il reticolo NON e' piu' qui.
   Un reticolo disegnato in CSS sta SOPRA la tela, piatto, e non gira con la
   camera: si vede subito che e' un adesivo appiccicato allo schermo invece
   che un pavimento. Raffaella, 05/09: «con l'effetto prospettiva, insomma,
   per intenderci». Quindi il reticolo e' passato DENTRO la scena, sul piano
   di terra, dove la prospettiva gliela da' la camera — vedi vestiLaScena()
   piu' sotto. Questo grigio resta solo per i momenti in cui la scena non c'e'
   ancora e la tela e' trasparente. */
html[data-veritas-vestito="carta"] canvas{
  background-color:#E9EBF0!important;
}

/* ═══ 7-bis · IL CARATTERE DELLE SCRITTE UMANE ═══════════════════════════ */
/* Raffaella, 05/09: «usa lo stesso font dove non e' tecnico, quello che
   abbiamo nella scritta EIDETICA».
   ⚠️ QUEL CARATTERE NON ESISTE, o almeno non e' nominabile. Guardando le
      lettere ingrandite: la E e' ROVESCIATA e la A non ha la TRAVERSA — e'
      una Λ. La A senza traversa non ce l'ha praticamente nessun carattere
      vero, e il file e' nato da un generatore d'immagini: quelle lettere sono
      disegnate, non composte. Cercare «il font del logo» e' cercare una cosa
      che non c'e'.
      Jura e' il carattere che sta nello STESSO REGISTRO: geometrico, tratto
      unico senza spessori, cerchi veri, leggero. Con la spaziatura larga, in
      maiuscoletto, suona come il marchio. Non e' il marchio.

   ⚠️ E SOLO DOVE NON E' TECNICO. I numeri restano al monospaziato: le cifre
      incolonnate si confrontano a occhio, ed e' l'unica ragione per cui un
      monospaziato serve. Metterci Jura vorrebbe dire cifre di larghezza
      diversa e colonne che ballano. */
html[data-veritas-vestito="carta"] h1,
html[data-veritas-vestito="carta"] h2,
html[data-veritas-vestito="carta"] h3,
html[data-veritas-vestito="carta"] .va-scritta,
html[data-veritas-vestito="carta"] .v-btn,
html[data-veritas-vestito="carta"] .v-card h1,
html[data-veritas-vestito="carta"] .va-velato > header{
  font-family:'Jura', 'Inter', system-ui, sans-serif!important;
  letter-spacing:.13em!important;
}
/* I numeri e le misure non si toccano: restano incolonnabili. */
html[data-veritas-vestito="carta"] .va-num,
html[data-veritas-vestito="carta"] [class*="tabular"],
html[data-veritas-vestito="carta"] code,
html[data-veritas-vestito="carta"] pre{
  font-family:ui-monospace,'JetBrains Mono',Menlo,monospace!important;
  letter-spacing:normal!important;
}

/* ═══ 7-ter · I PEZZI CHE ERANO NATI SUL NERO ════════════════════════════ */
/* Tutti hanno lo stesso difetto: fondo scuro semitrasparente + scritta
   chiara. Sul bianco il fondo diventa chiaro e la scritta ci sparisce
   dentro. Non e' brutto: e' illeggibile, che e' peggio. */

/* ⚠️ DA FARE — C'E' UNA SECONDA SCHEDA BIANCA, E NON E' QUESTA.
      Raffaella, 06/09: durante il CARICAMENTO compare un pannello bianco alto
      quanto lo schermo nella meta' destra, che copre la vista. Dentro c'e'
      scritto «signal is aborted without reason». Sparisce a caricamento
      finito. Non e' uno dei due menu qui sotto — quelli sono sistemati — e va
      ancora trovato. Annotato anche in memoria (difetti_aperti).

   ⚠️ LA SCHEDA BIANCA GIGANTE. Raffaella, 05/09, con un «NO» grande cosi':
      sono i due menu a tendina di 'Spatial Layers' e 'Analysis / Report'.
      Fondo rgba(20,20,24,.85) e voci scritte in #e5e5ea: sul chiaro
      restavano un lenzuolo bianco con dentro delle voci invisibili. Sembrava
      un pannello vuoto e rotto, e invece era pieno. */
html[data-veritas-vestito="carta"] #vaio-layers-menu,
html[data-veritas-vestito="carta"] #vaio-report-menu{
  background:var(--va-alzato)!important;
  backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  border:1px solid var(--va-orlo)!important;
  box-shadow:var(--va-ombra)!important;
  /* e non deve poter crescere fino in fondo allo schermo: un menu e' un
     menu, se ha piu' voci di quante ce ne stanno si scorre. */
  max-height:min(60vh,420px)!important; overflow:auto!important;
}
html[data-veritas-vestito="carta"] #vaio-layers-menu button,
html[data-veritas-vestito="carta"] #vaio-report-menu button{
  color:var(--va-testo)!important;
}
html[data-veritas-vestito="carta"] #vaio-layers-menu button:hover,
html[data-veritas-vestito="carta"] #vaio-report-menu button:hover{
  background:oklch(.965 .026 266)!important;
  color:oklch(.50 .14 266)!important;
}

/* ⚠️ IL CARTELLINO IN ALTO A SINISTRA. Raffaella: «dove non si legge
      EIDETICA». Era vetro nero al 50% con scritta #f2f2f7: sul bianco
      diventa grigino con scritta bianca sopra. Ora e' una pastiglia di carta
      con la velatura blu e il nome in inchiostro blu — il nome del prodotto
      merita il colore del prodotto. */
html[data-veritas-vestito="carta"] #vaio-brand{
  background:oklch(.965 .026 266)!important;
  backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
  border:1px solid oklch(.90 .045 266)!important;
  box-shadow:var(--va-ombra)!important;
}
html[data-veritas-vestito="carta"] #vaio-brand .vname{
  color:oklch(.46 .16 266)!important;
  font-family:'Jura','Inter',system-ui,sans-serif!important;
  letter-spacing:.15em!important;
}
html[data-veritas-vestito="carta"] #vaio-brand .vmark{
  background:linear-gradient(135deg,#2E5BFF,#7B2FF7)!important;
}
html[data-veritas-vestito="carta"] #vaio-status{
  color:var(--va-testo-fioco)!important;
  border-left-color:var(--va-orlo)!important;
}

/* ⚠️ IL PANNELLO «QUELLO CHE VEDO». Raffaella: «smorza anche i neri, con un
      colore di quelli che stiamo inserendo». Aveva dentro due neri pieni
      (#0b0d12 e #1a1d26). Prende la velatura BLU perche' e' una finestra sul
      MODELLO — mostra la pianta, cioe' le cose che ci sono. */
html[data-veritas-vestito="carta"] #veritas-anteprima{
  background:oklch(.965 .026 266)!important;
  border:1px solid oklch(.90 .045 266)!important;
  box-shadow:var(--va-ombra)!important;
  color:var(--va-testo)!important;
}
html[data-veritas-vestito="carta"] #veritas-anteprima *{
  border-color:oklch(.90 .045 266)!important;
}
/* La miniatura dentro resta il suo grigio: e' un disegno, non un pannello. */
html[data-veritas-vestito="carta"] #veritas-anteprima canvas,
html[data-veritas-vestito="carta"] #veritas-anteprima img{
  background:#E9EBF0!important; border-radius:6px!important;
}

/* ⚠️ LA BARRETTA DEI TASTINI, a sinistra sopra la vista. Il suo effetto di
      passaggio era rgba(255,255,255,.07) — schiarire una cosa gia' bianca
      non fa niente, quindi passandoci sopra non succedeva piu' nulla. */
html[data-veritas-vestito="carta"] #va-rail{
  /* velatura BLU e non bianco piatto: questa barretta comanda cosa si vede
     del modello, quindi sta nella famiglia del modello come tutto il resto
     che parla di geometria. */
  background:oklch(.965 .026 266)!important;
  border:1px solid oklch(.90 .045 266)!important;
  box-shadow:var(--va-ombra)!important;
}
html[data-veritas-vestito="carta"] .va-strato:hover:not(:disabled){
  background:oklch(.965 .026 266)!important;
  color:oklch(.50 .14 266)!important;
}
html[data-veritas-vestito="carta"] .va-strato[aria-pressed="true"],
html[data-veritas-vestito="carta"] .va-strato.attivo{
  background:oklch(.94 .04 266)!important;
  color:oklch(.46 .16 266)!important;
}

/* ═══ 7-quater · LE LISTE SI RIGANO ══════════════════════════════════════ */
/* Raffaella, 05/09, guardando l'elenco dei punti tutto bianco: «rimane poco
   leggibile, devi dare una lista con le tonalita' pastello».
   E' il piu' vecchio trucco che esista — il registro di contabilita' a righe
   alterne — e serve a una cosa sola: tenere l'occhio sulla riga giusta
   mentre attraversa la lista da sinistra a destra. Su fondo scuro lo faceva
   il contrasto naturale; sul bianco, senza, sei sei righe identiche.
   ⚠️ La velatura qui e' ancora piu' tenue di quella dei blocchi (0.975
      invece di 0.965): deve accompagnare l'occhio, non dividere la lista in
      due gruppi. Se si vede come una fascia colorata, e' troppa. */
html[data-veritas-vestito="carta"] .va-lista > *:nth-child(even){
  background:oklch(.975 .018 266)!important;
}
html[data-veritas-vestito="carta"] .va-lista > *{
  border-radius:5px!important;
}

/* === 7-quinquies - I PANNELLI TUTTI DA UNA PARTE ======================== */
/* Raffaella, 05/09: «i pannelli tutti dovrebbero stare di lato, con la
   possibilita' di essere aperti e chiusi, perche' se l'utente vuole
   massimizza il 3D - e questa cosa te l'ho gia' detta tante volte».
   Aveva ragione anche sull'ultima parte: la regola e' scritta in HANDOFF.md
   dal 02/09 - «i comandi stanno tutti a sinistra e i pannelli si aprono a
   destra» - e non era mai stata applicata alle colonne del bundle, che
   stanno una per parte.

   NON SI SPOSTA NESSUN NODO. Le due colonne sono SORELLE nella stessa riga
   flex del contenitore della tela: basta cambiare l'ordine di disegno.
   Spostarle a mano vorrebbe dire staccarle dal loro genitore e sperare che
   il bundle non se ne accorga - e il bundle e' il blocco che non si tocca.
   Con 'order' il DOM resta identico: a spostarsi e' solo il disegno. */
html[data-veritas-vestito="carta"] [class*='border-r'][class*='shrink-0']{
  order:3!important;
  border-right:0!important;
  border-left:1px solid var(--va-orlo)!important;
}
html[data-veritas-vestito="carta"] [class*='border-l'][class*='shrink-0']{
  order:4!important;
}

/* MASSIMIZZA: sparisce il contorno, resta il modello.
   La barretta dei comandi resta: e' l'unico modo per tornare indietro, e un
   modo per tornare indietro che sparisce col resto e' una porta che si
   chiude da fuori. */
html[data-veritas-vestito="carta"][data-eidetica-massimo="si"] [class*='shrink-0'][class*='border-l'],
html[data-veritas-vestito="carta"][data-eidetica-massimo="si"] [class*='shrink-0'][class*='border-r'],
html[data-veritas-vestito="carta"][data-eidetica-massimo="si"] #veritas-anteprima,
html[data-veritas-vestito="carta"][data-eidetica-massimo="si"] .va-fascia-misure{
  display:none!important;
}

/* LA STRISCIA IN BASSO SPARISCE SEMPRE, non solo quando si massimizza.
   Raffaella, 05/09: «la striscia in basso va tolta e restano quelli di lato».
   Le stesse quattro misure comparivano in DUE posti — orizzontali sotto e
   verticali di lato — ed era lei ad accorgersene: «una volta lo vedo
   orizzontale sotto e una volta di lato, decidi dove metterlo».
   Due posti per lo stesso dato non sono ridondanza utile: sono due cose da
   tenere allineate per sempre, e il giorno che divergono nessuno sa quale
   guardare. Ora stanno solo di lato, dove stanno tutti i pannelli. */
html[data-veritas-vestito="carta"] .va-fascia-misure{
  display:none!important;
}

/* LA LINGUETTA sta a sinistra, sotto i tastini: e' un comando, e i comandi
   stanno a sinistra. */
#va-massimo{
  position:fixed; left:16px; bottom:16px; z-index:9630;
  display:flex; align-items:center; gap:8px;
  padding:8px 13px; border-radius:11px; cursor:pointer;
  font:600 11px/1 'Jura','Inter',system-ui,sans-serif; letter-spacing:.12em;
  background:oklch(.965 .026 266); color:oklch(.46 .16 266);
  border:1px solid oklch(.90 .045 266);
  box-shadow:0 1px 2px rgba(22,24,58,.05), 0 10px 26px -16px rgba(22,24,58,.30);
}
#va-massimo:hover{ background:oklch(.94 .04 266); }
html:not([data-veritas-vestito="carta"]) #va-massimo{ display:none; }

/* === 7-sexies - «QUELLO CHE VEDO» SI ANCORA, NON GALLEGGIA ============== */
/* Raffaella, 06/09: «facciamo in modo che non rimanga sempre li' a peso
   sopra, o me lo sistemi sotto gli altri punti che abbiamo a destra... si
   aprono cosi' a caso».
   Il pannello era 'position:fixed; right:16; top:64' con z-index 9100: stava
   SOPRA la colonna di destra invece che DENTRO. E la regola del progetto,
   scritta in HANDOFF.md, dice «i pannelli si aprono a destra» - non «sopra
   quello che c'e' a destra».
   Ora entra nella colonna, in fondo, e diventa uno dei pannelli invece di
   una finestra che vola.

   Il pannello ha una sua logica ('seguiLaPillola') che gli riscrive 'top'
   ogni secondo per non finire sotto la barra. Non si tocca: mettendolo in
   posizione statica quel 'top' non ha piu' effetto, e la logica gira a vuoto
   senza far danno. Se un domani il pannello tornera' a galleggiare, quella
   logica e' ancora li' buona. */
html[data-veritas-vestito="carta"] #veritas-anteprima.va-ancorato{
  position:static!important;
  width:auto!important; max-width:none!important; max-height:none!important;
  margin:10px 10px 14px!important;
  z-index:auto!important;
  box-shadow:none!important;
}
/* la colonna deve poter scorrere, se no il pannello in fondo non si raggiunge */
html[data-veritas-vestito="carta"] .va-colonna-pannelli{
  overflow-y:auto!important;
}

/* ═══ 8 · LA FIRMA NELL'ANGOLO DELLA VISTA ═══════════════════════════════ */
/* Raffaella, 05/09: «il logo non si vede nella finestra di lavoro, invece ci
   deve essere sempre in un angolo ben visibile e leggibile, perche' tutti i
   video o le riprese fatti all'interno devono riportare il marchio».
   Questo decide anche la vecchia domanda sulle tre collocazioni: e' la B —
   dentro la vista, non nella barra. La barra non entra in una ripresa del
   modello; l'angolo della vista si'. */
#va-firma{
  position:absolute; left:14px; bottom:14px; z-index:40;
  width:158px; pointer-events:none; user-select:none;
  opacity:.9;
}
#va-firma img{ display:block; width:100%; height:auto; }
html:not([data-veritas-vestito="carta"]) #va-firma{ display:none; }

/* LA FINESTRA DEV'ESSERE UNA FINESTRA, non un buco: il grigio non tocca il
   bianco di testa. Un filo e un rientro — il passe-partout di una tavola
   incorniciata e' quello che fa APPOGGIARE un'immagine su un muro chiaro
   invece di farla sembrare un pezzo mancante. */
html[data-veritas-vestito="carta"] .va-vista{
  border:1px solid var(--va-orlo)!important;
  border-radius:10px!important;
  overflow:hidden!important;
}
`;

// ============================================================================
// LA VISTA TRIDIMENSIONALE
// ============================================================================
// Raffaella, 05/09: «troppo distacco fra il nero della finestra 3D e il resto»,
// «il nero proprio nero no», «reticolo prospettico leggermente piu' scuro».
//
// Tre cose, e vanno insieme:
//
//   IL FONDO. La tela e' trasparente (setClearColor(0x000000, 0)), quindi
//   basterebbe il CSS. Ma appena c'e' una scena conviene dirlo alla scena: e'
//   lei che comanda, e il CSS diventa un ripiego che nessuno legge.
//
//   ⚠️ LA FOSCHIA, ed e' QUESTA la ragione per cui restava nero anche col
//      fondo chiaro. C'e' una `THREE.Fog(0x0b0f17, ...)` — nero-blu — messa
//      per una ragione giusta: «lega il modello al fondo, senza l'edificio
//      galleggia». Ma una foschia NERA su un fondo CHIARO fa il contrario di
//      quello per cui e' nata: invece di fondere il modello nello sfondo, gli
//      spalma addosso del nero. La foschia deve SEMPRE essere del colore del
//      fondo — e' l'unica cosa che deve essere, sempre, in qualunque vestito.
//
//   IL RETICOLO. Non in CSS: sul piano di terra, dentro la scena, cosi' la
//   prospettiva gliela da' la camera. E' il pavimento a quadretti sotto il
//   modello, non un adesivo sullo schermo.
//   Due passi, come il foglio a quadretti: uno fitto che da' la grana e uno
//   largo che da' la misura. Il passo e' scelto in METRI TONDI — 1, 2, 5, 10,
//   20, 50 — perche' un reticolo si conta, e nessuno conta a passo 6,37.

const FONDO_VISTA   = 0xE9EBF0;   // l'aria attorno
const TERRA_VISTA   = 0xDFE2EA;   // la lastra di terra: un gradino sotto l'aria
const RETICOLO_SU_TERRA = 0xA8AEC2;  // il reticolo a terra: un gradino sotto la terra
const RETICOLO_SU_MURO  = 0xC2C7D6;  // sulle pareti piu' tenue: e' fondale, non piano di lavoro

// ⚠️ NON SI AGGIUNGE NIENTE ALLA SCENA. Verificato guardandola: la scena ha
//    GIA' la sua griglia (un GridHelper a y=0) e GIA' la sua lastra di terra
//    (200x200 m, colore #151a23 — ed e' LEI il «nero della finestra 3D», non
//    lo sfondo, che era gia' chiaro).
//    La prima versione di questo file ne aggiungeva di sue: due griglie dove
//    ne bastava una, e per giunta sotto la lastra, quindi invisibili. Due
//    oggetti che fanno lo stesso mestiere divergono alla prima modifica.
//    Qui si RICOLORA quello che c'e', e si tiene da parte il colore di prima
//    per poterlo rimettere: e' quello che rende lo strato uno strato.

const memoria = new Map();   // uuid -> colore originale

function ricorda(oggetto, materiale) {
  if (!memoria.has(oggetto.uuid)) memoria.set(oggetto.uuid, materiale.color.getHex());
}
function rimetti(scena) {
  scena.traverse((o) => {
    const m = o.material;
    if (m && m.color && memoria.has(o.uuid)) m.color.setHex(memoria.get(o.uuid));
  });
}

/**
 * La lastra di terra.
 *
 * ⚠️ SI CERCA PRIMA PER COLORE, POI PER MISURA, e l'ordine e' tutto.
 *    Primo tentativo: `traverse` + un Box3 per OGNI mesh. Su un aeroporto
 *    sono migliaia di mesh, ognuna con la geometria da scorrere: la pagina si
 *    e' piantata sul serio, il riquadro non rispondeva piu'.
 *    Secondo tentativo: solo i figli diretti della scena. Economico, ma
 *    SBAGLIATO — la lastra non e' un figlio diretto, sta dentro un gruppo, e
 *    cosi' non la trovava piu' nessuno. Il fondo restava nero.
 *    Terzo, e questo funziona: si scorre tutto l'albero ma si guarda solo il
 *    COLORE, che e' gia' in memoria e non costa niente. Le mesh molto scure
 *    sono una manciata; solo su quelle si misura l'ingombro. Migliaia di
 *    letture gratis, cinque misure vere.
 */
// ⚠️ SI LEGGE IL COLORE COME LO SI VEDE, non come lo tiene THREE.
//    `colore.r/.g/.b` puo' essere in spazio lineare, dove #151a23 vale circa
//    0,009 invece di 0,082: una soglia scelta guardando il codice a occhio
//    sbaglia di un ordine di grandezza. `getHexString()` torna sempre l'sRGB,
//    cioe' il numero che si legge nel file e che corrisponde a quello che si
//    vede. Misurato: #151a23 fa 0,100 di luminanza. La prima soglia era 0,06
//    e lo mancava — e allora ricoloriva il primo cubetto nero che trovava,
//    che e' peggio di non fare niente.
function luminanzaSRGB(materiale) {
  const h = materiale.color.getHexString();
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function terraDi(T, scena) {
  const candidate = [];
  scena.traverse((o) => {
    if (!o.isMesh || !o.material || !o.material.color) return;
    if (luminanzaSRGB(o.material) > 0.25) return;   // costa tre moltiplicazioni
    candidate.push(o);
  });
  // ⚠️ E DEV'ESSERE GRANDE DAVVERO. Un pavimento di un terminal sta sui
  //    40.000 m2; un cubetto nero del modello sta sotto il metro quadro. La
  //    soglia a 2000 m2 e' larga per un pavimento e impossibile per un
  //    oggetto — e' quella che impedisce di ricolorare la cosa sbagliata.
  // ⚠️ SI MISURA NEL MONDO, NON NELLA GEOMETRIA. Errore mio, e mi e' costato
  //    tre giri: un piano orizzontale, DENTRO la sua geometria, e' 200 x 200
  //    x ZERO — largo in X e in Y, spesso niente in Z — perche' nasce in
  //    piedi e viene coricato con una rotazione. Io controllavo «e' alta meno
  //    di un metro?» guardando la Y della geometria, che vale 200, e quindi
  //    scartavo esattamente l'oggetto che stavo cercando.
  //    Trasformare la scatola gia' in cache con la matrice del mondo costa
  //    otto vertici — non tutta la geometria — e da' le misure come si vedono.
  let vinta = null, area = 2000;
  const scatola = new T.Box3();
  for (const o of candidate) {
    const g = o.geometry;
    if (!g) continue;
    if (!g.boundingBox) g.computeBoundingBox();
    if (!g.boundingBox) continue;
    o.updateWorldMatrix(true, false);
    scatola.copy(g.boundingBox).applyMatrix4(o.matrixWorld);
    const dx = scatola.max.x - scatola.min.x;
    const dy = scatola.max.y - scatola.min.y;
    const dz = scatola.max.z - scatola.min.z;
    if (dy > 1.0) continue;              // piatta, adesso davvero
    const a = dx * dz;
    if (a > area) { area = a; vinta = o; }
  }
  return vinta;
}

// ─── LA GABBIA: IL RETICOLO SUI TRE PIANI ───────────────────────────────────
// Raffaella, 05/09: «il reticolo va esteso a tutto l'ambiente, non solo al
// piano orizzontale — una griglia prospettica su tutti e tre i piani».
//
// E' il fondale dello studio, o la carta da spolvero attorno al plastico: un
// pavimento e due pareti a quadretti. Serve a una cosa precisa — dare la
// PROFONDITA'. Un reticolo sul solo pavimento dice quanto e' larga una cosa;
// tre reticoli ad angolo dicono anche quanto e' alta e quanto e' lontana,
// perche' l'occhio legge la prospettiva sulle righe che convergono.
//
// ⚠️ NON SI USA GridHelper. Quello nasce sempre QUADRATO: per fare una parete
//    alta un quarto di quanto e' larga bisognerebbe schiacciarlo, e le
//    caselle diventerebbero rettangoli. Su tre piani che devono sembrare LO
//    STESSO foglio piegato, caselle di forma diversa rovinano tutto. Quindi
//    la griglia se la fa da se', rettangolare, con lo stesso passo ovunque.

const NOME_GABBIA = "eidetica-gabbia";

/** Una griglia piana w x h di passo `passo`, nel piano XY, centrata. */
function grigliaPiana(T, w, h, passo, colore, opacita) {
  const punti = [];
  const nx = Math.round(w / passo), ny = Math.round(h / passo);
  const x0 = -w / 2, y0 = -h / 2;
  for (let i = 0; i <= nx; i++) {
    const x = x0 + i * passo;
    punti.push(x, y0, 0, x, y0 + ny * passo, 0);
  }
  for (let j = 0; j <= ny; j++) {
    const y = y0 + j * passo;
    punti.push(x0, y, 0, x0 + nx * passo, y, 0);
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(punti, 3));
  const m = new T.LineBasicMaterial({
    color: colore, transparent: true, opacity: opacita, depthWrite: false,
  });
  return new T.LineSegments(g, m);
}

/** Un passo tondo in metri: un reticolo si conta, e nessuno conta a 6,37. */
function passoTondo(lato) {
  for (const p of [0.5, 1, 2, 5, 10, 20, 50, 100]) if (lato / p <= 60) return p;
  return 100;
}

function togliGabbia(scena) {
  const v = scena.getObjectByName(NOME_GABBIA);
  if (!v) return;
  v.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  scena.remove(v);
}

function costruisciGabbia(T, scena, scatola) {
  togliGabbia(scena);
  const dim = scatola.getSize(new T.Vector3());
  const centro = scatola.getCenter(new T.Vector3());
  const lato = Math.max(dim.x, dim.z) * 1.45 || 60;
  // ⚠️ Le pareti NON sono alte quanto sono larghe. Un aeroporto e' largo
  //    300 m e alto 15: una parete quadrata sarebbe un muro di 300 m che
  //    riempie il cielo e nasconde il modello. Si sta sul triplo dell'altezza
  //    vera dell'edificio, che e' quanto basta per leggere la profondita'.
  const alto = Math.min(lato * 0.45, Math.max(dim.y * 3, lato * 0.12));
  const passo = passoTondo(lato);

  const gruppo = new T.Group();
  gruppo.name = NOME_GABBIA;
  const base = scatola.min.y;

  // IL PAVIMENTO — un filo sotto il modello, se no i due piani si contendono
  // lo stesso pixel e il reticolo sfarfalla appena si muove la camera.
  const suolo = grigliaPiana(T, lato, lato, passo, RETICOLO_SU_TERRA, 0.75);
  suolo.rotation.x = -Math.PI / 2;
  suolo.position.set(centro.x, base + 0.02, centro.z);
  gruppo.add(suolo);

  // LE QUATTRO PARETI. Raffaella, 05/09: «la griglia ovunque».
  // Prima erano due, ad angolo, e da certe inquadrature meta' campo restava
  // bianco vuoto — la profondita' si leggeva solo girandosi da una parte.
  // Quattro chiudono lo spazio da qualunque parte guardi.
  //
  // ⚠️ NIENTE SOFFITTO. Con la camera dall'alto — che e' l'inquadratura
  //    normale di una pianta — un reticolo sul soffitto si infilerebbe fra
  //    l'occhio e il modello, e si guarderebbe il piano attraverso una rete.
  //
  // Piu' tenui del pavimento: sono il FONDALE, non il piano di lavoro. Se
  // pesassero uguale, il modello sembrerebbe chiuso dentro una gabbia invece
  // che appoggiato su un tavolo.
  const mezzo = lato / 2;
  const pareti = [
    [centro.x, centro.z - mezzo, 0],              // dietro
    [centro.x, centro.z + mezzo, 0],              // davanti
    [centro.x - mezzo, centro.z, Math.PI / 2],    // sinistra
    [centro.x + mezzo, centro.z, Math.PI / 2],    // destra
  ];
  for (const [px, pz, ry] of pareti) {
    const muro = grigliaPiana(T, lato, alto, passo, RETICOLO_SU_MURO, 0.45);
    muro.rotation.y = ry;
    muro.position.set(px, base + alto / 2, pz);
    gruppo.add(muro);
  }

  gruppo.renderOrder = -1;
  scena.add(gruppo);
  console.log("[EIDETICA carta] gabbia: lato " + Math.round(lato) + " m, alto "
              + Math.round(alto) + " m, passo " + passo + " m, 4 pareti + pavimento");
}

/**
 * Veste la scena: aria, terra, reticolo, foschia.
 * Torna false se la scena non c'e' ancora — non e' un errore, e' «non ancora».
 */
function vestiLaScena() {
  const T = window.THREE, scena = window.__veritasScene;
  if (!T || !scena) return false;
  const acceso = document.documentElement.getAttribute("data-veritas-vestito") === "carta";

  if (!acceso) {
    togliGabbia(scena);
    rimetti(scena);
    scena.background = null;
    // ⚠️ la foschia torna al nero-blu di prima: e' il colore giusto per il
    //    vestito scuro, ed e' il file che lo rimette, non chi lo aveva messo.
    if (scena.fog) scena.fog.color = new T.Color(0x0b0f17);
    return true;
  }

  scena.background = new T.Color(FONDO_VISTA);
  // ⚠️ LA FOSCHIA E' LA RAGIONE PER CUI RESTAVA NERO. Era 0x0b0f17, messa per
  //    una ragione giusta — «lega il modello al fondo, senza galleggia» — ma
  //    una foschia NERA su un fondo CHIARO fa l'opposto: spalma nero sul
  //    modello invece di fonderlo nell'aria. Dev'essere sempre del colore
  //    dell'aria, in qualunque vestito.
  if (scena.fog) scena.fog.color = new T.Color(FONDO_VISTA);

  // ⚠️ NIENTE Box3 SUL MODELLO. Anche solo misurare l'ingombro del modello
  //    intero costa un giro completo dell'albero, ed e' l'altra meta' del
  //    motivo per cui la pagina si piantava. Non serve: la lastra e' la mesh
  //    piatta piu' larga fra i figli diretti della scena, e questo si sa
  //    senza misurare niente del modello.
  const terra = terraDi(T, scena);
  if (terra) { ricorda(terra, terra.material); terra.material.color.setHex(TERRA_VISTA); }

  // IL RETICOLO che c'e' gia'. «Leggermente piu' scuro» della terra: si conta,
  // non si guarda.
  let quante = 0;
  scena.traverse((o) => {
    if (o.type !== "GridHelper" && !o.isGridHelper) return;
    if (o.name && o.name.startsWith("va-reticolo")) return;
    const materiali = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of materiali) {
      if (!m || !m.color) continue;
      ricorda(o, m);
      m.color.setHex(RETICOLO_SU_TERRA);
      m.opacity = 0.85; m.transparent = true;
    }
    quante++;
  });
  // LA GABBIA sui tre piani. Serve la misura del modello, quindi si fa solo
  // quando il modello c'e'. ⚠️ UN Box3 SOLO, sulla radice: e' un giro
  // dell'albero, non uno per mesh — quello era l'errore che piantava la
  // pagina.
  const radice = window.__veritasModelRoot;
  if (radice) {
    const scatola = new T.Box3().setFromObject(radice);
    if (isFinite(scatola.min.y)) costruisciGabbia(T, scena, scatola);
  }

  console.log("[EIDETICA carta] vista chiara: terra " + (terra ? "ricolorata" : "non trovata")
              + ", " + quante + " reticolo/i dell'applicazione, foschia allineata all'aria.");
  return true;
}

// ─── LA RETE A STRASCICO: TUTTO CIO' CHE E' NATO SUL NERO ───────────────────
//
// Fino a qui i pannelli li ho rincorsi uno per uno, per nome: il menu a
// tendina, il cartellino in alto, la barretta dei tastini, il pannello
// dell'occhio... e ne saltava fuori un altro ogni volta che Raffaella apriva
// una schermata nuova. E' un metodo che non finisce mai, perche' i pannelli
// li conosce l'applicazione, non io.
//
// Questa invece e' una regola: QUALUNQUE cosa abbia un fondo scuro diventa
// carta, chiunque l'abbia scritta, e anche se nasce dopo.
//
// ⚠️ E SI PORTA DIETRO IL TESTO. Un fondo scuro ha quasi sempre sopra una
//    scritta chiara: schiarire il fondo e lasciare la scritta com'e' vuol
//    dire bianco su bianco, che e' PEGGIO del nero — il nero almeno si
//    legge. Quindi i due cambiamenti vanno insieme, sempre, o nessuno dei
//    due.
//
// ⚠️ COSA RESTA FUORI: la tela 3D e chi la contiene, perche' li' il fondo lo
//    decide la scena; e la schermata d'attesa, che ha una sua pastiglia
//    scura voluta.

const FUORI_DALLA_RETE = new Set(["CANVAS", "SCRIPT", "STYLE", "SVG", "PATH", "IMG"]);
const memoriaDOM = new Map();   // elemento -> {sfondo, colore} inline di prima

function luminanzaDi(css) {
  const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(css || "");
  if (!m) return null;
  const alfa = m[4] === undefined ? 1 : parseFloat(m[4]);
  const L = (+m[1] * 0.2126 + +m[2] * 0.7152 + +m[3] * 0.0722) / 255;
  return { L, alfa };
}

function dentroLaVista(el) {
  return !!el.closest("canvas, .va-vista, #veritas-boot-splash, #va-firma");
}

function sbiancaScuri(radice) {
  let toccati = 0;
  const tutti = (radice || document.body).querySelectorAll("*");
  for (const el of tutti) {
    if (FUORI_DALLA_RETE.has(el.tagName)) continue;
    if (el.id === "va-firma" || dentroLaVista(el)) continue;
    if (memoriaDOM.has(el)) continue;

    const cs = getComputedStyle(el);
    const sf = luminanzaDi(cs.backgroundColor);
    const te = luminanzaDi(cs.color);

    // un FONDO scuro e davvero coprente
    const fondoScuro = sf && sf.alfa > 0.15 && sf.L < 0.28;
    // una SCRITTA chiara: da sola non basta a intervenire, ma se il fondo
    // schiarisce (qui o piu' su) va portata via anche lei.
    const scrittaChiara = te && te.L > 0.62;

    if (!fondoScuro && !scrittaChiara) continue;

    memoriaDOM.set(el, { sfondo: el.style.backgroundColor, colore: el.style.color });
    if (fondoScuro) {
      el.style.backgroundColor = "var(--va-alzato)";
      // il vetro smerigliato non ha piu' niente da sfocare
      if (cs.backdropFilter && cs.backdropFilter !== "none") el.style.backdropFilter = "none";
    }
    if (scrittaChiara) el.style.color = "var(--va-testo)";
    toccati++;
  }
  return toccati;
}

function rimettiDOM() {
  for (const [el, prima] of memoriaDOM) {
    el.style.backgroundColor = prima.sfondo;
    el.style.color = prima.colore;
  }
  memoriaDOM.clear();
}

// ⚠️ I PANNELLI NASCONO DOPO. Mezza applicazione si disegna quando ci clicchi
//    sopra, quindi una passata sola all'avvio pesca meta' delle cose. Si sta
//    in ascolto delle nascite — con un fiato di attesa, se no si rifa' il giro
//    ad ogni singolo nodo aggiunto mentre una lista si popola.
let attesa = null;
function sorveglia() {
  if (window.__vaSentinella) return;
  const oss = new MutationObserver(() => {
    if (attesa) return;
    attesa = setTimeout(() => {
      attesa = null;
      if (document.documentElement.getAttribute("data-veritas-vestito") !== "carta") return;
      const n = sbiancaScuri();
      const t = tingiUI();
      rigaturaListe();
      rivestiBottoni();
      scostaLaBarra();
      scriviTarghetta();
      sfoltisciChat();
      linguettaMassimo();
      fasciaMisure();
      ancoraAnteprima();
      if (n || t) console.log("[EIDETICA carta] nati dopo: " + n + " fondi, " + t + " etichette");
    }, 260);
  });
  oss.observe(document.body, { childList: true, subtree: true });
  window.__vaSentinella = oss;
}

// ─── LE VELATURE IN GIRO PER L'INTERFACCIA ──────────────────────────────────
// Raffaella, 05/09: «i toni pastello nelle varie parti della UI mancano
// ancora, io li voglio».
//
// La prima versione tingeva quattro riquadri e basta, ed era troppo poco per
// vedersi. Qui si tinge OGNI blocco che si sa nominare, e la tinta arriva in
// due modi che lavorano insieme:
//
//   L'ETICHETTA prende l'inchiostro colorato — e' quella che si vede subito.
//   IL BLOCCO prende la velatura — e' quella che tiene insieme il gruppo.
//
// ⚠️ SI RICONOSCE DALLA SCRITTA. Se un domani «SATURAZIONE» diventa
//    «AFFOLLAMENTO», quel blocco torna bianco e nessuno capisce perche'.
//    E' un aggancio di ripiego e lo dichiaro qui invece di lasciarlo scoprire
//    a qualcuno fra sei mesi: il modo giusto sarebbe che ogni pannello
//    portasse da solo il proprio mestiere.
//
// ⚠️ E LA TINTA DICE IL MESTIERE, non fa varieta'. Se si alternassero per
//    bellezza sarebbe decorazione, e l'occhio si metterebbe a cercare un
//    significato che non c'e'.

const MESTIERI = [
  // le cose che CI SONO — geometria, modello, inquadrature
  ["va-modello", [
    /^\s*CAMERE\b/i, /^\s*PRESET\b/i, /^\s*VISTA\b/i, /^\s*PIANTA\b/i,
    /^\s*MODELLO\b/i, /^\s*MESH\b/i, /^\s*ZONE\b/i, /^\s*SPATIAL LAYERS\b/i,
    /^\s*FLUSSO\b/i, /^\s*ESPORTA\b/i, /config nodi/i,
  ]],
  // le cose che SI MUOVONO — agenti, tempo, simulazione
  ["va-simulazione", [
    /^\s*ARCHETIPI\b/i, /^\s*AGENTI\b/i, /^\s*ATTIVI\b/i, /^\s*PASSEGGERI\b/i,
    /^\s*IN CAMMINO\b/i, /^\s*IN MOVIMENTO\b/i, /^\s*IN CODA\b/i,
    /^\s*SIMULAZIONE\b/i, /^\s*VELOCIT/i, /^\s*SCALA PASSEGGERI\b/i,
  ]],
  // le cose VENUTE FUORI — misure, esiti, referti
  ["va-esiti", [
    /^\s*TRANSITO\b/i, /^\s*ESITI?\b/i, /^\s*REPORT\b/i, /^\s*KPI\b/i,
    /^\s*ANALYSIS\b/i, /^\s*DENSIT/i, /^\s*TEMPO DI ESODO\b/i,
  ]],
  // le cose da GUARDARE — regole, verifiche, avvisi
  ["va-norme", [
    /^\s*SATURAZIONE\b/i, /^\s*NORME\b/i, /^\s*AVVIS/i, /^\s*VERIFIC/i,
    /^\s*MANCA\b/i, /^\s*ATTENZIONE\b/i, /^\s*ERRORE\b/i,
  ]],
];

function mestiereDi(testo) {
  for (const [classe, segni] of MESTIERI) {
    for (const segno of segni) if (segno.test(testo)) return classe;
  }
  return null;
}

/** Dal testo dell'etichetta al blocco che la contiene. */
// AZIONE PRINCIPALE BLU, NON VERDE. Raffaella, 05/09, indicando il bottone
// «Avvia simulazione»: «qui usa lo stesso blu della simulazione».
// La ragione va oltre il gusto: in questa piattaforma il VERDE SIGNIFICA GIA'
// QUALCOSA — e' il pallino che dice «il motore fisico e' pronto». Un verde
// acceso usato anche per «premi qui» toglie forza all'unico posto in cui quel
// verde e' una informazione.
const BOTTONI_PRINCIPALI = [
  /^\s*[\u25b6\u25ba]?\s*(Avvia|Start)\s+simulaz/i,
  /^\s*Start simulation/i,
  /^\s*[\u21bb\u27f3]?\s*(Rigenera|Regenerate)\s+simulaz/i,
];

function rivestiBottoni() {
  let n = 0;
  for (const b of document.querySelectorAll("button")) {
    if (b.dataset.vaVestito) continue;
    const t = (b.textContent || "").trim();
    if (!t || t.length > 30) continue;
    if (!BOTTONI_PRINCIPALI.some((r) => r.test(t))) continue;
    b.style.setProperty("background", "var(--va-accento)", "important");
    b.style.setProperty("background-image", "none", "important");
    b.style.setProperty("color", "#FFFFFF", "important");
    b.style.setProperty("border-color", "var(--va-accento)", "important");
    b.dataset.vaVestito = "1";
    n++;
  }
  return n;
}

// LA BARRA IN ALTO FINIVA SOPRA I PANNELLI LATERALI. Raffaella, 05/09:
// «Spatial Layers, Analysis/Report, Zone editor vanno a finire sulla banda
// verticale delle simulazioni».
// La barra e' fissa da bordo a bordo (left:16 / right:16) e galleggia sopra
// tutto, mentre i pannelli laterali sono colonne del layout.
// NON E' UN DIFETTO DEL VESTITO CHIARO: c'era anche prima. Sul nero erano due
// schede scure una sull'altra e si notava poco; il chiaro l'ha reso visibile,
// non l'ha creato.
// E si MISURA invece di indovinare: i pannelli compaiono solo su schermi
// larghi, quindi un numero fisso sbaglierebbe meta' delle volte.
function colonnaAlBordo(lato) {
  let larghezza = 0;
  for (const el of document.querySelectorAll("[class*='border-l'],[class*='border-r']")) {
    const r = el.getBoundingClientRect();
    if (r.width < 120 || r.width > 520 || r.height < 200) continue;
    const aFilo = lato === "destra"
      ? Math.abs(r.right - window.innerWidth) < 6
      : Math.abs(r.left) < 6;
    if (aFilo) larghezza = Math.max(larghezza, r.width);
  }
  return larghezza;
}

// La colonna dei pannelli: quella a filo del bordo destro.
function colonnaDestra() {
  let vinta = null, larga = 0;
  for (const el of document.querySelectorAll("[class*='border-l'],[class*='border-r']")) {
    const r = el.getBoundingClientRect();
    if (r.width < 120 || r.width > 520 || r.height < 200) continue;
    if (Math.abs(r.right - window.innerWidth) > 6) continue;
    if (r.width > larga) { larga = r.width; vinta = el; }
  }
  return vinta;
}

// «Quello che vedo» smette di galleggiare e va in fondo alla colonna.
function ancoraAnteprima() {
  const pannello = document.getElementById("veritas-anteprima");
  if (!pannello) return false;
  const colonna = colonnaDestra();
  if (!colonna) return false;                 // schermo stretto: resta com'e'
  if (pannello.parentElement === colonna) return true;
  colonna.classList.add("va-colonna-pannelli");
  pannello.classList.add("va-ancorato");
  colonna.appendChild(pannello);
  console.log("[EIDETICA carta] «quello che vedo» ancorato in fondo alla colonna di destra");
  return true;
}

function scostaLaBarra() {
  const barra = document.getElementById("vaio-topbar");
  if (!barra) return false;
  const d = colonnaAlBordo("destra"), sx = colonnaAlBordo("sinistra");
  barra.style.setProperty("right", (d ? d + 14 : 16) + "px", "important");
  barra.style.setProperty("left", (sx ? sx + 14 : 16) + "px", "important");
  return true;
}

// IL NOME DEL PROGETTO NELLA TARGHETTA.
// Raffaella, 05/09: «dal momento che abbiamo messo il logo in basso a
// sinistra, nella targhetta in alto dove hai riscritto EIDETICA dovrebbe
// andare il nome del progetto, che non si vede da nessuna parte».
//
// Ha ragione due volte. Il marchio e' gia' nell'angolo della vista: nella
// targhetta era la stessa parola detta due volte a mezzo schermo di distanza.
// E il nome del progetto — l'unica cosa che cambia fra una sessione e
// l'altra, l'unica che dice A COSA stai lavorando — non compariva da nessuna
// parte dentro lo spazio di lavoro.
//
// Il nome si prende AL VOLO quando apri il progetto, non da una variabile
// dell'applicazione, perche' quella variabile NON C'E': il nome vive dentro
// la riga della lista e basta. Se un domani l'applicazione lo espone davvero,
// questo pezzo si butta.
const CHIAVE_PROGETTO = "eidetica:progetto";

function ricordaProgetto() {
  if (window.__vaAscoltoProgetto) return;
  window.__vaAscoltoProgetto = true;
  document.addEventListener("click", (ev) => {
    const riga = ev.target.closest && ev.target.closest(".v-proj-item");
    if (!riga) return;
    const n = riga.querySelector(".name");
    const nome = n && n.textContent.trim();
    if (!nome) return;
    try { localStorage.setItem(CHIAVE_PROGETTO, nome); } catch (e) {}
    window.__vaNomeProgetto = nome;
    setTimeout(scriviTarghetta, 500);
  }, true);
}

// Se si e' gia' dentro allo spazio di lavoro e nessuno ha cliccato una riga
// della lista in questa sessione, il nome si va a leggere dove l'applicazione
// lo scrive comunque: l'intestazione del pannello dei punti, che dice
// «⠿ Punti • Aeroporto — banco di prova».
// E' un ripiego, e vale quanto vale: se quella scritta cambia, questo smette
// di funzionare e la targhetta torna al nome del programma. Non si rompe
// niente, si perde solo il nome.
function nomeDallIntestazione() {
  for (const e of document.querySelectorAll("div,span,h1,h2,h3")) {
    if (e.children.length) continue;
    const t = (e.textContent || "").trim();
    if (t.length > 70) continue;
    const m = /^[^A-Za-z0-9]*(?:Punti|Points)\s*[•·|]\s*(.+)$/.exec(t);
    if (m && m[1].trim().length > 1) return m[1].trim();
  }
  return null;
}

function scriviTarghetta() {
  const el = document.querySelector("#vaio-brand .vname");
  if (!el) return false;
  let nome = window.__vaNomeProgetto;
  if (!nome) { try { nome = localStorage.getItem(CHIAVE_PROGETTO); } catch (e) {} }
  if (!nome) nome = nomeDallIntestazione();
  if (!nome || el.textContent.trim() === nome) return !!nome;
  el.textContent = nome;
  el.title = nome;
  // un nome di progetto puo' essere lungo quanto vuole, e la targhetta non
  // deve allargarsi fino a coprire i bottoni accanto: e' gia' successo una
  // volta con l'avviso del motore, ed e' scritto nei commenti qui sopra.
  Object.assign(el.style, {
    maxWidth: "230px", overflow: "hidden", textOverflow: "ellipsis",
    whiteSpace: "nowrap", display: "inline-block", verticalAlign: "middle",
  });
  return true;
}

// LA CHAT: MENO RUMORE.
// Raffaella, 05/09: «un problema bello grosso: la chat dice chi sta seduto,
// chi sta in piedi, chi e' in coda... all'utente serve un report ordinato,
// non la ripetizione di centomila volte delle stesse cose».
//
// QUELLE FRASI NON SI BUTTANO. C'e' gia' un osservatore, scritto prima di me,
// che le raccoglie dentro window.__veritasReferto. Il referto le prende
// comunque: questo interviene DOPO e tocca solo cio' che si VEDE. Nessuna
// informazione va persa — smette di essere gridata.
//
// Qui si fa la cosa piu' piccola che toglie il grosso del rumore: le righe
// uguali di fila si accorpano in una sola, con il conteggio.
// PORTARE DAVVERO L'ANALISI NEL REFERTO, e lasciare in chat solo domande e
// risposte, e' un'altra cosa: e' cambiare cosa E' la chat. Va deciso e fatto
// per bene, non di straforo da qui.
function sfoltisciChat() {
  const log = document.getElementById("vaio-console-log");
  if (!log || log.__vaSfoltito) return false;
  log.__vaSfoltito = true;
  const normalizza = (t) => (t || "").replace(/\d+([.,]\d+)?/g, "#").trim();

  new MutationObserver((mut) => {
    for (const m of mut) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1 || !n.textContent) continue;
        const prec = n.previousElementSibling;
        if (!prec) continue;
        if (normalizza(prec.textContent) !== normalizza(n.textContent)) continue;
        const q = (+prec.dataset.vaQuante || 1) + 1;
        prec.dataset.vaQuante = String(q);
        let segno = prec.querySelector(".va-quante");
        if (!segno) {
          segno = document.createElement("span");
          segno.className = "va-quante";
          prec.appendChild(segno);
        }
        segno.textContent = "  \u00d7" + q;
        n.remove();
      }
    }
  }).observe(log, { childList: true });
  return true;
}

// --- MASSIMIZZA IL MODELLO -------------------------------------------------
// Un interruttore solo: o vedi gli strumenti, o vedi il modello.
//
// DOPO SI DEVE AVVISARE CHI DISEGNA. La tela cambia larghezza, e il
// disegnatore 3D deve rifare i suoi conti: se no il modello resta schiacciato
// nella misura di prima, con le proporzioni sbagliate.
// Non si tocca il renderer: c'e' gia' `telaPiena()` in veritas_aspetto.js che
// emette l'evento che il renderer aspetta. Si chiama quello. Toccare il
// renderer vorrebbe dire indovinare come calcola la propria dimensione.
const CHIAVE_MASSIMO = "eidetica:massimo";

function fasciaMisure() {
  // La striscia delle misure in basso: si riconosce perche' contiene i
  // blocchi gia' velati, sta a tutta larghezza e sta in fondo. Se non si
  // trova non succede niente di male: resta visibile.
  const velati = [...document.querySelectorAll(".va-velato")];
  if (velati.length < 2) return null;
  let n = velati[0];
  for (let i = 0; i < 6 && n && n.parentElement; i++) {
    n = n.parentElement;
    const r = n.getBoundingClientRect();
    if (r.width > window.innerWidth * 0.6 && r.top > window.innerHeight * 0.5) {
      n.classList.add("va-fascia-misure");
      return n;
    }
  }
  return null;
}

function massimizza(si) {
  const r = document.documentElement;
  if (si) r.setAttribute("data-eidetica-massimo", "si");
  else r.removeAttribute("data-eidetica-massimo");
  try { localStorage.setItem(CHIAVE_MASSIMO, si ? "si" : "no"); } catch (e) {}

  const b = document.getElementById("va-massimo");
  if (b) b.textContent = si ? "\u2921  MOSTRA I PANNELLI" : "\u2922  MASSIMIZZA";

  const avvisa = () => {
    try {
      const a = window.__veritasAspetto || window.veritasAspetto;
      if (a && typeof a.telaPiena === "function") a.telaPiena();
    } catch (e) {}
    window.dispatchEvent(new Event("resize"));
  };
  avvisa();
  setTimeout(avvisa, 320);
}

function linguettaMassimo() {
  if (document.getElementById("va-massimo")) return true;
  if (!document.querySelector("canvas")) return false;  // non siamo nello spazio di lavoro
  const b = document.createElement("button");
  b.id = "va-massimo";
  b.type = "button";
  b.addEventListener("click", () => {
    fasciaMisure();
    massimizza(document.documentElement.getAttribute("data-eidetica-massimo") !== "si");
  });
  document.body.appendChild(b);
  let scelto = "no";
  try { scelto = localStorage.getItem(CHIAVE_MASSIMO) || "no"; } catch (e) {}
  fasciaMisure();
  massimizza(scelto === "si");
  return true;
}

function bloccoDi(etichetta) {
  // Il PRIMO antenato che ha la taglia di un gruppo: etichetta, valore e
  // riga di spiegazione.
  //
  // ⚠️ E NON PIU' IN SU. Misurato sul pannello vero: sopra il gruppo (275x72)
  //    c'e' l'elenco che tiene TUTTE E QUATTRO le misure (275x310). Velare
  //    quello vorrebbe dire una tinta sola sopra flusso, transito, cammino e
  //    saturazione — cioe' una tinta che copre quattro mestieri diversi, che
  //    e' esattamente il modo in cui il colore smette di dire qualcosa.
  let n = etichetta;
  for (let i = 0; i < 5 && n && n.parentElement; i++) {
    n = n.parentElement;
    const r = n.getBoundingClientRect();
    if (r.width >= 110 && r.height >= 30 && r.height <= 200 && r.width <= 700) return n;
    if (r.height > 340) break;
  }
  return null;
}

// ⚠️ COSA E' UNA LISTA, misurato e non dedotto dal nome della classe: un
//    contenitore con almeno quattro figli impilati in verticale, tutti alti
//    piu' o meno uguale e larghi piu' o meno uguale. Le barre di bottoni non
//    passano (sono orizzontali), i riquadri delle misure non passano (sono
//    pochi e di altezze diverse).
function rigaturaListe() {
  let n = 0;
  for (const el of document.querySelectorAll("div,ul,ol,tbody,section")) {
    if (el.dataset.vaRigato) continue;
    const figli = [...el.children].filter((c) => c.nodeType === 1);
    if (figli.length < 4 || figli.length > 60) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 140 || r.width > 620 || r.height < 80) continue;

    const misure = figli.map((c) => c.getBoundingClientRect());
    if (misure.some((m) => m.height < 20 || m.height > 64)) continue;
    // impilati: ognuno comincia sotto il precedente
    for (let i = 1; i < misure.length; i++) {
      if (misure[i].top < misure[i - 1].bottom - 2) { n = -1; break; }
    }
    if (n === -1) { n = 0; continue; }
    // e di altezza confrontabile: una lista, non un impaginato qualunque
    const alte = misure.map((m) => m.height);
    if (Math.max(...alte) > Math.min(...alte) * 1.7) continue;

    el.classList.add("va-lista");
    el.dataset.vaRigato = "1";
    n++;
  }
  return n;
}

function tingiUI() {
  let etichette = 0, blocchi = 0;
  for (const e of document.querySelectorAll("div,span,p,label,h1,h2,h3,button")) {
    if (e.children.length) continue;                     // solo le foglie
    const t = (e.textContent || "").trim();
    if (!t || t.length > 26) continue;
    const classe = mestiereDi(t);
    if (!classe) continue;

    // 1. l'etichetta prende l'inchiostro colorato: e' quella che si vede.
    if (!e.dataset.vaScritto) {
      e.classList.add("va-scritta", classe);
      e.dataset.vaScritto = "1";
      etichette++;
    }

    // 2. il blocco prende la velatura.
    // ⚠️ QUESTO SI SEGNA A PARTE, ed e' il difetto che aveva ingannato
    //    Raffaella («le scritte sono colorate ma i blocchi no»): quando si
    //    passa la prima volta, i pannelli sono appena nati e il browser non
    //    li ha ancora impaginati — misurano 0x0. Il blocco non si trova, ma
    //    io segnavo l'etichetta come FATTA lo stesso, e non ci si tornava
    //    piu'. Risultato: 18 etichette colorate e 2 blocchi velati.
    //    Con due segni distinti, chi non ha trovato il suo blocco ci riprova
    //    al giro dopo, quando le misure ci sono.
    if (!e.dataset.vaBloccoOk) {
      const q = bloccoDi(e);
      if (q) {
        if (!q.classList.contains("va-velato")) {
          q.classList.add("va-velato", classe);
          blocchi++;
        }
        e.dataset.vaBloccoOk = "1";
      }
    }
  }
  if (etichette) {
    console.log("[EIDETICA carta] velature: " + etichette + " etichette, "
                + blocchi + " blocchi.");
  }
  return etichette;
}

/**
 * LA FIRMA nell'angolo della vista.
 * ⚠️ Sta nel DOM, sopra la tela — quindi entra nelle riprese dello schermo,
 *    che e' il caso di cui parlava Raffaella. NON entrerebbe in una foto
 *    presa dalla sola tela WebGL (c'e' un banco/fotografia.mjs che fa
 *    qualcosa del genere): se serve anche li', va disegnata nella scena, ed
 *    e' un lavoro diverso. Da verificare quando tocca a quello.
 */
function firma() {
  if (document.getElementById("va-firma")) return;
  const tela = document.querySelector("canvas");
  const casa = tela && tela.parentElement;
  if (!casa) return;
  if (getComputedStyle(casa).position === "static") casa.style.position = "relative";
  const d = document.createElement("div");
  d.id = "va-firma";
  const img = document.createElement("img");
  img.src = "./Assets/eidetica_intero_trasparente.webp";
  img.alt = "EIDETICA";
  d.appendChild(img);
  casa.appendChild(d);
}

// Ci si aggancia al caricamento del modello avvolgendo il gancio che c'e'
// gia', come fanno gli altri moduli: cosi' togliendo questo file il
// programma resta intero.
function agganciaAlModello() {
  const precedente = window.__veritasOnModelLoaded;
  window.__veritasOnModelLoaded = function () {
    let out;
    try { out = precedente ? precedente.apply(this, arguments) : undefined; }
    catch (e) { console.error("[VERITAS carta] errore nel passo precedente:", e); }
    // dopo di loro: la scala automatica e la foschia si assestano prima.
    setTimeout(() => { try { vestiLaScena(); firma(); tingiUI(); } catch (e) {} }, 900);
    return out;
  };
}

const CHIAVE = "veritas:vestito";

function stile() {
  if (document.getElementById("va-carta-stile")) return;
  const s = document.createElement("style");
  s.id = "va-carta-stile";
  s.textContent = CSS;
  // In coda a <head>: deve vincere sul CSS compilato del bundle, che sta
  // piu' su. Non basterebbe l'ordine da solo -- per quello ci sono gli
  // !important -- ma toglie un motivo di sorprese.
  document.head.appendChild(s);
}

function accendi() {
  stile();
  document.documentElement.setAttribute("data-veritas-vestito", "carta");
  try { localStorage.setItem(CHIAVE, "carta"); } catch {}
  try { sbiancaScuri(); vestiLaScena(); firma(); tingiUI(); rigaturaListe(); rivestiBottoni(); scostaLaBarra();
         scriviTarghetta(); sfoltisciChat(); ricordaProgetto();
         linguettaMassimo(); ancoraAnteprima(); sorveglia(); } catch (e) {}
  return "carta";
}

function spegni() {
  document.documentElement.removeAttribute("data-veritas-vestito");
  try { localStorage.setItem(CHIAVE, "notte"); } catch {}
  try { rimettiDOM(); vestiLaScena(); } catch (e) {}
  return "notte";
}

function inverti() {
  return document.documentElement.getAttribute("data-veritas-vestito")
    ? spegni() : accendi();
}

// All'avvio: si accende, a meno che qualcuno non abbia scelto la notte.
// ⚠️ IL VALORE PREDEFINITO E' IL MARCHIO. La scelta e' per chi ci sta dentro
//    da tre ore; il valore predefinito e' quello che vede il mondo — ogni
//    schermata, ogni dimostrazione, ogni immagine di lancio.
function avvio() {
  agganciaAlModello();
  let scelto = null;
  try { scelto = localStorage.getItem(CHIAVE); } catch {}
  if (scelto === "notte") { stile(); return; }
  accendi();
  // ⚠️ LA SCENA NASCE DOPO DI NOI, e non sempre passa dal gancio del modello
  //    (si entra nello spazio di lavoro, la tela si crea, il modello magari
  //    arriva molto dopo o non arriva). Quindi si riprova per un po', e si
  //    smette appena la scena c'e' — non un ciclo eterno che gira a vuoto per
  //    tutta la sessione.
  let tentativi = 0;
  const t = setInterval(() => {
    let fatto = false;
    try { fatto = vestiLaScena(); firma(); sbiancaScuri(); tingiUI(); rigaturaListe(); rivestiBottoni(); scostaLaBarra();
           scriviTarghetta(); sfoltisciChat(); linguettaMassimo(); ancoraAnteprima(); } catch (e) {}
    if (fatto || ++tentativi > 40) clearInterval(t);
  }, 700);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.veritasCarta = { accendi, spegni, inverti, GRADI };

  // RIFAI LE ZONE DA CAPO.
  //
  // Serve perche' un modo per farlo NON C'E'. In index.html (~4661) c'e':
  //     const hasFewNodes = !currentNodes || currentNodes.length < 2 || autorevole;
  // cioe': se il progetto ha gia' dei nodi salvati, l'assegnazione automatica
  // non riparte, e le zone appena ricalcolate vengono buttate. La bandierina
  // __veritasAssegnazioneAutorevole si alza in UN SOLO punto — quando cambia
  // la scala del modello — e «Rianalizza mesh» non la alza.
  // Risultato: si puo' cambiare la regola di zonizzazione quanto si vuole, su
  // un progetto salvato non si vedra' mai niente. E infatti Raffaella, 06/09:
  // «sono qui gia' da un po, ma le zone non sono ancora cambiate».
  //
  // ⚠️ CANCELLA I PUNTI RINOMINATI O SPOSTATI A MANO. Per questo e un comando
  //    esplicito e non un bottone: chi lo lancia deve sapere cosa perde.
  window.eidetica = window.eidetica || {};
  // Le tappe di adesso, in una riga sola. Serve perche' le stampe ritardate
  // (setTimeout) arrivano DOPO che Raffaella ha gia' copiato la console: un
  // dato che arriva tardi e' un dato che non arriva.
  window.eidetica.tappe = function () {
    const nodi = window.__veritasGetNodes ? window.__veritasGetNodes() : [];
    return nodi.map(function (n, i) {
      return (i + 1) + ". " + (n.label || n.name || "?") + "  [" + (n.type || "?") + "]";
    });
  };

  window.eidetica.rifaiLeZone = function () {
    if (typeof window.__veritasRianalizzaModello !== "function") {
      console.warn("[EIDETICA] non c'e' niente da rianalizzare: manca il modello.");
      return null;
    }
    const prima = (window.__veritasGetNodes ? window.__veritasGetNodes() : []).length;
    window.__veritasAssegnazioneAutorevole = true;
    const esito = window.__veritasRianalizzaModello();
    setTimeout(function () {
      const nodi = window.__veritasGetNodes ? window.__veritasGetNodes() : [];
      console.log("[EIDETICA] zone rifatte: da " + prima + " a " + nodi.length + " tappe");
      console.log("[EIDETICA] " + nodi.map(function (n) { return n.label || n.name || n.type; }).join(" -> "));
    }, 3000);
    return esito;
  };
  // i pannelli laterali compaiono e spariscono con la larghezza della
  // finestra: la barra deve rimisurarsi, se no torna a sovrapporsi.
  window.addEventListener("resize", () => {
    if (document.documentElement.getAttribute("data-veritas-vestito") === "carta") {
      try { scostaLaBarra(); } catch (e) {}
    }
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", avvio);
  } else {
    avvio();
  }
}

export default { accendi, spegni, inverti, GRADI };
