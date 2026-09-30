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

/* ═══ 7 · LA FINESTRA TECNICA: IL PLASTICO SCURO ════════════════════════ */
/* 29/09: il grigio col reticolo del 05/09 e' SUPERATO. Il fondo vero lo
   dipinge la scena (vestiLaScena, piu' sotto: lo stesso fondo del velo).
   Questo colore resta solo per i momenti in cui la scena non c'e' ancora e
   la tela e' trasparente: e' il colore di meta' del fondo del velo, cosi'
   quando la scena arriva non si vede il salto. */
html[data-veritas-vestito] canvas{
  background-color:#0e131b!important;
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
}
/* e non deve poter crescere fino in fondo allo schermo: un menu e' un
   menu, se ha piu' voci di quante ce ne stanno si scorre. (Qualunque vestito.) */
html[data-veritas-vestito] #vaio-layers-menu,
html[data-veritas-vestito] #vaio-report-menu{
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
/* ⚠️ E COI PANNELLI SCURI (30/09). veritas_anteprima.js porta colori suoi,
      scritti in linea e tarati sul chiaro il 05/09: corpo grigio chiaro,
      intestazione scura con la scritta scura, menu scuro con la scritta
      scura. La carta li copriva; senza carta restava un pannello metà e metà
      che non si legge. Qui prende lo stesso vetro scuro degli altri segni
      sulla scena (cartellino, interruttore). La miniatura resta com'e': e'
      il disegno che l'occhio guarda, non un pannello. */
html[data-veritas-vestito="scuro"] #veritas-anteprima{
  background:rgba(10,14,20,.86)!important; color:#D7DEE8!important;
  border:1px solid rgba(255,255,255,.10)!important;
  backdrop-filter:blur(14px)!important; -webkit-backdrop-filter:blur(14px)!important;
}
html[data-veritas-vestito="scuro"] #veritas-anteprima > div:first-child{
  background:transparent!important; border-bottom:1px solid rgba(255,255,255,.08)!important;
}
html[data-veritas-vestito="scuro"] #veritas-anteprima > div:first-child > span{ color:#F2F5F9!important; }
html[data-veritas-vestito="scuro"] #veritas-anteprima label,
html[data-veritas-vestito="scuro"] #veritas-anteprima span{ color:#8A94A6; }
html[data-veritas-vestito="scuro"] #veritas-anteprima select{
  background:#0b0d12!important; color:#D7DEE8!important; border:1px solid rgba(255,255,255,.14)!important;
}
html[data-veritas-vestito="scuro"] #veritas-anteprima button{
  color:#AEB7C6!important; border:1px solid rgba(255,255,255,.14)!important; background:transparent!important;
}
html[data-veritas-vestito="scuro"] #veritas-anteprima canvas{ border-color:rgba(255,255,255,.10)!important; }

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
   Con 'order' il DOM resta identico: a spostarsi e' solo il disegno.
   29/09 — PANNELLI SCURI: questa e le regole d'impaginato qui sotto (la
   linguetta, la striscia, l'anteprima ancorata) valgono con QUALUNQUE
   vestito, [data-veritas-vestito]: sono comportamenti, non colori. Il
   vestito scuro li ha identici; cambia solo la tinta. */
html[data-veritas-vestito] [class*='border-r'][class*='shrink-0']{
  order:3!important;
  border-right:0!important;
  border-left:1px solid var(--va-orlo)!important;
}
html[data-veritas-vestito] [class*='border-l'][class*='shrink-0']{
  order:4!important;
}

/* MASSIMIZZA: sparisce il contorno, resta il modello.
   La barretta dei comandi resta: e' l'unico modo per tornare indietro, e un
   modo per tornare indietro che sparisce col resto e' una porta che si
   chiude da fuori. */
html[data-veritas-vestito][data-eidetica-massimo="si"] [class*='shrink-0'][class*='border-l'],
html[data-veritas-vestito][data-eidetica-massimo="si"] [class*='shrink-0'][class*='border-r'],
html[data-veritas-vestito][data-eidetica-massimo="si"] #veritas-anteprima,
html[data-veritas-vestito][data-eidetica-massimo="si"] .va-fascia-misure{
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
html[data-veritas-vestito] .va-fascia-misure{
  display:none!important;
}

/* LA LINGUETTA sta a sinistra, sotto i tastini: e' un comando, e i comandi
   stanno a sinistra. Scura come l'interruttore Analisi/Esperienza
   (veritas_modo.js): vetro scuro, filo sottile. Sulla carta, carta. */
#va-massimo{
  position:fixed; left:16px; bottom:16px; z-index:9630;
  display:flex; align-items:center; gap:8px;
  padding:8px 13px; border-radius:11px; cursor:pointer;
  font:600 11px/1 'Jura','Inter',system-ui,sans-serif; letter-spacing:.12em;
  background:rgba(10,14,20,.72); color:#AEB7C6;
  border:1px solid rgba(255,255,255,.10);
  box-shadow:0 10px 30px rgba(0,0,0,.35);
  backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px);
}
#va-massimo:hover{ color:#F2F5F9; border-color:rgba(46,230,214,.45); }
html[data-veritas-vestito="carta"] #va-massimo{
  background:oklch(.965 .026 266); color:oklch(.46 .16 266);
  border:1px solid oklch(.90 .045 266);
  box-shadow:0 1px 2px rgba(22,24,58,.05), 0 10px 26px -16px rgba(22,24,58,.30);
  backdrop-filter:none; -webkit-backdrop-filter:none;
}
html[data-veritas-vestito="carta"] #va-massimo:hover{ background:oklch(.94 .04 266); }
html:not([data-veritas-vestito]) #va-massimo{ display:none; }

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
html[data-veritas-vestito] #veritas-anteprima.va-ancorato{
  position:static!important;
  width:auto!important; max-width:none!important; max-height:none!important;
  margin:10px 10px 14px!important;
  z-index:auto!important;
  box-shadow:none!important;
}
/* la colonna deve poter scorrere, se no il pannello in fondo non si raggiunge */
html[data-veritas-vestito] .va-colonna-pannelli{
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
html:not([data-veritas-vestito]) #va-firma{ display:none; }

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
// LA VISTA TRIDIMENSIONALE — IL PLASTICO SCURO (29/09/2026)
// ============================================================================
// Raffaella, 29/09, con una tavola di riferimento: «piu' pulita e' la scena,
// meglio e'. Piu' abbiamo un plastico monocromo con questi segni colorati
// tech, dove spiccano solamente i cartellini e queste luci che diamo noi,
// meglio e'». SOSTITUISCE la vista grigia col reticolo del 05/09, che non
// vale piu': niente grigio, niente reticolo, niente gabbia.
//
// E' il render del velo (veritas_apertura.js) portato nella vista dal vivo,
// come chiede il §0.1 del HANDOFF: stesso fondo, stessa argilla. Un render
// solo; sopra cambiano soltanto i segni (zone, cartellini, traiettorie).
//
//   IL FONDO. Lo stesso del velo: un alone blu-notte un po' a sinistra del
//   centro che scende quasi al nero ai bordi. Una tessitura dipinta una
//   volta, non un CSS sotto la tela: e' la scena che comanda.
//
//   LA FOSCHIA. Sempre del colore del fondo — la regola del 05/09 resta vera
//   in qualunque vestito: una foschia di un altro colore spalma quel colore
//   sul modello invece di fonderlo nell'aria.
//
//   IL MODELLO IN ARGILLA. Un tono solo, quello del velo. I vetri restano
//   vetri (argilla trasparente), se no un tetto di vetro diventa un coperchio
//   e nasconde la gente.
//
// ⚠️ L'ARGILLA SI METTE SOLO MENTRE SI DISEGNA LA VISTA DEL CLIENTE, e si
//    toglie subito dopo. L'occhio fotografa lo STESSO modello con lo stesso
//    renderer (veritas_vista.js lo sposta in una scena sua e lo disegna): se
//    l'argilla restasse addosso al modello, l'occhio vedrebbe un plastico
//    grigio invece dei colori veri. Quindi si avvolge `renderer.render`, e
//    SOLO quando disegna la scena della pagina sullo schermo il modello
//    indossa l'argilla. Ogni altro disegno (occhio, piante, miniature) trova
//    il modello com'e'.
//
// ⚠️ IL MODELLO ORIGINALE NON SPARISCE (§0.1):
//      window.veritasCarta.modelloOriginale(true)   // i suoi materiali
//      window.veritasCarta.modelloOriginale(false)  // l'argilla
//    Il pulsante arriva col passo 2 (Analisi / Esperienza), nello stesso posto.

const PLASTICO = {
  // il fondo del velo: centro, meta', bordo (.vap-velo in veritas_apertura.js)
  fondo: ["#1a2231", "#0e131b", "#07090d"],
  aria: 0x0e131b,        // la foschia: il colore di meta' del fondo
  terra: 0x10151d,       // la lastra: appena sopra l'aria, riceve l'ombra
  argilla: 0x6b707a,     // ARGILLA di veritas_apertura.js
};

// La lastra di terra si ricolora; il colore di prima si tiene.
const memoria = new Map();   // uuid -> colore originale
function ricorda(oggetto, materiale) {
  if (!memoria.has(oggetto.uuid)) memoria.set(oggetto.uuid, materiale.color.getHex());
}

/**
 * La lastra di terra.
 *
 * ⚠️ SI CERCA PRIMA PER COLORE, POI PER MISURA, e l'ordine e' tutto.
 *    Un Box3 per OGNI mesh di un aeroporto (migliaia) pianta la pagina; i
 *    soli figli diretti non bastano (la lastra sta dentro un gruppo). Si
 *    scorre tutto l'albero guardando solo il COLORE, che non costa niente, e
 *    si misura l'ingombro solo delle poche mesh molto scure. La misura si
 *    fa NEL MONDO: un piano nasce in piedi (200 x 200 x 0) e viene coricato.
 */
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
  // Grande davvero: un pavimento di terminal sta sui 40.000 m2, un cubetto
  // nero del modello sotto il metro quadro. 2000 m2 separa i due.
  let vinta = null, area = 2000;
  const scatola = new T.Box3();
  for (const o of candidate) {
    const g = o.geometry;
    if (!g) continue;
    if (!g.boundingBox) g.computeBoundingBox();
    if (!g.boundingBox) continue;
    o.updateWorldMatrix(true, false);
    scatola.copy(g.boundingBox).applyMatrix4(o.matrixWorld);
    if (scatola.max.y - scatola.min.y > 1.0) continue;
    const a = (scatola.max.x - scatola.min.x) * (scatola.max.z - scatola.min.z);
    if (a > area) { area = a; vinta = o; }
  }
  return vinta;
}

// La gabbia del 05/09 non si costruisce piu'. Chi ha la pagina aperta da
// prima di questa versione potrebbe averla ancora in scena: si toglie.
function togliGabbia(scena) {
  const v = scena.getObjectByName("eidetica-gabbia");
  if (!v) return;
  v.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  scena.remove(v);
}

/** Il fondo del velo, dipinto una volta su una tessitura. */
function fondoDipinto(T) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  const x = c.getContext("2d");
  // come il velo: l'alone sta al 38% in orizzontale e al 52% in verticale
  const g = x.createRadialGradient(195, 266, 0, 195, 266, 420);
  g.addColorStop(0, PLASTICO.fondo[0]);
  g.addColorStop(0.55, PLASTICO.fondo[1]);
  g.addColorStop(1, PLASTICO.fondo[2]);
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 512);
  const t = new T.CanvasTexture(c);
  if (T.SRGBColorSpace) t.colorSpace = T.SRGBColorSpace;
  return t;
}

// ─── L'ARGILLA, SOLO SULLO SCHERMO DEL CLIENTE ──────────────────────────────
const ARGILLA = { opaca: null, vetri: new Map(), sagome: new Map(), originale: false };

function argillaPer(T, m) {
  if (!ARGILLA.opaca) {
    ARGILLA.opaca = new T.MeshStandardMaterial({ color: PLASTICO.argilla, roughness: 0.9, metalness: 0.02 });
    ARGILLA.opaca.name = "eidetica-argilla";
  }
  if (!m || !m.transparent) return ARGILLA.opaca;
  // ⚠️ UNA SAGOMA NON E' UN VETRO. Misurato sull'aeroporto il 29/09: dei 320
  //    materiali trasparenti, 227 sono immagini ritagliate (gente, piante:
  //    una foto con la trasparenza dentro, opacita' 1) e 93 sono vetri veri
  //    (opacita' 0,3-0,5, senza immagine). Trattate da vetro, le sagome
  //    diventavano rettangoli grigi. Qui l'immagine resta SOLO per il
  //    ritaglio: la forma della persona si vede, i suoi colori no.
  if (m.map) {
    if (!ARGILLA.sagome.has(m.map.uuid)) {
      const s = new T.MeshStandardMaterial({ color: PLASTICO.argilla, roughness: 0.9, metalness: 0.02,
        map: m.map, alphaTest: 0.5, side: m.side });
      s.name = "eidetica-argilla-sagoma";
      s.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>",
          "#ifdef USE_MAP\n  diffuseColor.a *= texture2D( map, vMapUv ).a;\n#endif");
      };
      s.customProgramCacheKey = () => "eidetica-argilla-sagoma";
      ARGILLA.sagome.set(m.map.uuid, s);
    }
    return ARGILLA.sagome.get(m.map.uuid);
  }
  // un vetro resta un vetro: stessa trasparenza, arrotondata al decimo
  // perche' i materiali siano una manciata e non uno per lastra
  const o = Math.max(0.1, Math.min(0.6, Math.round((m.opacity ?? 0.5) * 10) / 10));
  if (!ARGILLA.vetri.has(o)) {
    const v = new T.MeshStandardMaterial({ color: PLASTICO.argilla, roughness: 0.6, metalness: 0.02,
      transparent: true, opacity: o, depthWrite: false, side: m.side });
    v.name = "eidetica-argilla-vetro";
    ARGILLA.vetri.set(o, v);
  }
  return ARGILLA.vetri.get(o);
}

// Le mesh del modello e la loro argilla, calcolate una volta per modello.
let coppie = null, radiceDiCoppie = null;
function coppieDi(T, radice) {
  if (radiceDiCoppie === radice && coppie) return coppie;
  coppie = [];
  radice.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const argilla = Array.isArray(o.material)
      ? o.material.map((m) => argillaPer(T, m)) : argillaPer(T, o.material);
    // un vetro non fa ombra: la luce ci passa. Solo opachi e sagome.
    const vetro = [].concat(o.material).every((m) => m && m.transparent && !m.map);
    coppie.push([o, argilla, null, null, null, !vetro]);
  });
  radiceDiCoppie = radice;
  return coppie;
}

function avvolgiIlRenderer(T, renderer) {
  if (renderer.__eideticaPlastico) return;
  renderer.__eideticaPlastico = true;
  const disegna = renderer.render.bind(renderer);
  renderer.render = function (scena, camera) {
    const radice = window.__veritasModelRoot;
    // solo la scena della pagina, sullo schermo, col modello dentro
    if (scena !== window.__veritasScene || !radice
        || renderer.getRenderTarget() !== null || !radice.parent) {
      return disegna(scena, camera);
    }
    // Le ombre valgono anche col modello originale: sono leggibilita', non
    // vestito. L'argilla solo se non si e' chiesto l'originale.
    const argilla = !ARGILLA.originale;
    const cc = coppieDi(T, radice);
    for (const c of cc) {
      const o = c[0];
      c[2] = o.material; c[3] = o.castShadow; c[4] = o.receiveShadow;
      if (argilla) o.material = c[1];
      o.castShadow = c[5]; o.receiveShadow = true;
    }
    // In Esperienza (veritas_modo.js) le zone non si disegnano: si spengono
    // solo per questo disegno, cosi' «Spatial Layers → Zones» resta com'era.
    const zone = document.documentElement.getAttribute("data-eidetica-modo") === "esperienza"
      ? window.__veritasHotspotGroup : null;
    const zoneAccese = zone ? zone.visible : false;
    if (zone) zone.visible = false;
    try { return disegna(scena, camera); }
    finally {
      for (const c of cc) { c[0].material = c[2]; c[0].castShadow = c[3]; c[0].receiveShadow = c[4]; }
      if (zone) zone.visible = zoneAccese;
    }
  };
}

// ─── LE OMBRE ────────────────────────────────────────────────────────────────
// Raffaella, 29/09: «mi sembra manchino le ombre, dobbiamo dare la massima
// leggibilita'». Misurato: il sole della scena dal vivo fa ombra (mappa 2048),
// ma NESSUNA mesh del modello la getta (0 su 2416), e la sua camera d'ombra e'
// quella di fabbrica di three, un quadrato di 10 m attorno all'origine: su un
// aeroporto di 113 x 63 m quasi tutto resta fuori. Qui: il sole guarda il
// centro del modello e la sua camera d'ombra lo copre tutto; il modello getta
// e riceve ombra SOLO mentre si disegna la vista del cliente (sopra), come
// l'argilla — l'occhio, che accende un sole suo, trova il modello com'e'.
// L'altezza del sole resta quella della scena (~60 gradi): ombre lunghe
// quanto basta a dire l'altezza, senza annegare la pianta.
function sistemaIlSole(T, scena, radice) {
  let sole = null;
  scena.traverse((o) => { if (!sole && o.isDirectionalLight && o.castShadow) sole = o; });
  if (!sole || !radice) return null;
  const scatola = new T.Box3().setFromObject(radice);
  if (scatola.isEmpty()) return null;
  const centro = scatola.getCenter(new T.Vector3());
  const misure = scatola.getSize(new T.Vector3());
  const raggio = Math.max(5, Math.hypot(misure.x, misure.z) / 2 + 2);
  if (!sole.userData.__eideticaDirezione) sole.userData.__eideticaDirezione = sole.position.clone().sub(sole.target.position).normalize();
  const dir = sole.userData.__eideticaDirezione;
  sole.target.position.copy(centro);
  if (!sole.target.parent) scena.add(sole.target);
  sole.position.copy(centro).addScaledVector(dir, raggio * 2);
  const c = sole.shadow.camera;
  c.left = -raggio; c.right = raggio; c.top = raggio; c.bottom = -raggio;
  c.near = 0.5; c.far = raggio * 4 + misure.y;
  c.updateProjectionMatrix();
  // 4096: su 130 m sono 3 cm per punto d'ombra — una seduta si legge
  if (sole.shadow.mapSize.x < 4096) {
    sole.shadow.mapSize.set(4096, 4096);
    if (sole.shadow.map) { sole.shadow.map.dispose(); sole.shadow.map = null; }
  }
  sole.shadow.bias = -0.0004;
  sole.shadow.normalBias = Math.max(0.02, raggio * 0.0015);

  // LA LUCE DEL VELO (§0.1). Misurato: la scena dal vivo aveva una luce
  // diffusa BIANCA e UGUALE da tutte le parti (0,45) contro un sole di 1,2:
  // le ombre c'erano ma deboli, e un muro e un pavimento si leggevano quasi
  // uguali — lo stesso errore del §6.9, «non cieco, al buio». Il velo usa un
  // CIELO (chiaro dall'alto, scuro da terra: le facce verticali si staccano
  // dal pavimento) e un sole piu' forte. Si porta qui la stessa ricetta:
  // cielo 0,95, sole 1,7; la luce diffusa scende a un filo che tiene
  // leggibile il fondo delle ombre. Il controluce azzurro resta com'e'.
  sole.intensity = 1.7;
  scena.traverse((o) => { if (o.isAmbientLight) o.intensity = 0.12; });
  if (!scena.getObjectByName("eidetica-cielo")) {
    const cielo = new T.HemisphereLight(0xb8c4d6, 0x141820, 0.95);
    cielo.name = "eidetica-cielo";
    scena.add(cielo);
  }
  return { raggio: Math.round(raggio), mappa: sole.shadow.mapSize.x };
}

/**
 * Veste la scena: fondo, foschia, terra, niente reticolo, modello d'argilla.
 * Torna false se la scena non c'e' ancora — non e' un errore, e' «non ancora».
 */
function vestiLaScena() {
  const T = window.THREE, scena = window.__veritasScene, renderer = window.__veritasRenderer;
  if (!T || !scena) return false;

  togliGabbia(scena);
  if (!scena.userData.__eideticaFondo) scena.userData.__eideticaFondo = fondoDipinto(T);
  scena.background = scena.userData.__eideticaFondo;
  if (scena.fog) scena.fog.color = new T.Color(PLASTICO.aria);

  const terra = terraDi(T, scena);
  if (terra) { ricorda(terra, terra.material); terra.material.color.setHex(PLASTICO.terra); }

  // IL RETICOLO NON C'E' PIU': la griglia della scena si spegne, non si
  // cancella (e' del bundle).
  let griglie = 0;
  scena.traverse((o) => {
    if (o.type !== "GridHelper" && !o.isGridHelper) return;
    o.visible = false; griglie++;
  });

  if (renderer) avvolgiIlRenderer(T, renderer);
  if (terra) terra.receiveShadow = true;
  const ombre = sistemaIlSole(T, scena, window.__veritasModelRoot);

  console.log("[EIDETICA carta] plastico scuro: terra " + (terra ? "ricolorata" : "non trovata")
              + ", " + griglie + " griglia/e spenta/e, argilla "
              + (ARGILLA.originale ? "tolta (modello originale)" : "sullo schermo")
              + (ombre ? ", ombre sul modello intero (raggio " + ombre.raggio + " m, mappa " + ombre.mappa + ")" : ", ombre: sole o modello non ancora pronti"));
  return true;
}

function modelloOriginale(si) {
  ARGILLA.originale = !!si;
  return ARGILLA.originale ? "originale" : "argilla";
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

// #eidetica-modo (veritas_modo.js), #eidetica-scheda e #eidetica-occhi (veritas_selezione.js)
// stanno SULLA scena, che e' scura: la carta non li schiarisce e non li tinge.
function dentroLaVista(el) {
  return !!el.closest("canvas, .va-vista, #veritas-boot-splash, #va-firma, #eidetica-modo, #eidetica-scheda, #eidetica-occhi");
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
      const vestito = document.documentElement.getAttribute("data-veritas-vestito");
      if (!vestito) return;
      let n = 0, t = 0;
      if (vestito === "carta") { n = sbiancaScuri(); t = tingiUI(); rigaturaListe(); rivestiBottoni(); }
      lavoriComuni();
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
    if (dentroLaVista(e)) continue;
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

// ─── PANNELLI SCURI (29/09/2026) ─────────────────────────────────────────────
// Raffaella, 29/09: tutta EIDETICA su fondo scuro; la carta chiara del 05/09
// e' superata. Ma la carta non faceva solo colore: faceva anche dei LAVORI
// (il nome del progetto nella targhetta, la linguetta MASSIMIZZA,
// l'anteprima ancorata in fondo alla colonna, e l'impaginato: pannelli a
// destra, striscia in basso tolta, barra scostata, chat sfoltita, firma).
// Quei lavori restano IDENTICI; cambia solo la tinta. Quindi tre vestiti:
//   "scuro"  il predefinito: pannelli scuri NATIVI (il vetro del bundle,
//            index.html --va-vetro) + i lavori + il plastico;
//   "carta"  la carta chiara di prima, per chi la chiede a mano
//            (veritasCarta.accendi());
//   nessuno  com'era prima della carta (veritasCarta.spegni()).
// Il plastico scuro della vista (vestiLaScena) vale in tutti e tre.
function lavoriComuni() {
  scostaLaBarra(); scriviTarghetta(); sfoltisciChat();
  linguettaMassimo(); fasciaMisure(); ancoraAnteprima();
}

// Dalla carta allo scuro senza ricaricare: si tolgono i colori che la carta
// aveva scritto DENTRO gli elementi (le classi .va-velato/.va-scritta/.va-lista
// non hanno regole fuori dalla carta, e restano innocue).
function togliColoriCarta() {
  rimettiDOM();
  for (const b of document.querySelectorAll("button[data-va-vestito]")) {
    for (const p of ["background", "background-image", "color", "border-color"]) b.style.removeProperty(p);
    delete b.dataset.vaVestito;
  }
}

// ⚠️ UNA CHIAVE NUOVA. La vecchia («veritas:vestito») la scriveva accendi()
//    a OGNI avvio: dentro c'e' «carta» per tutti, anche per chi non l'ha mai
//    scelta. Leggerla terrebbe tutti sulla carta.
const CHIAVE = "eidetica:vestito";

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
  try { sbiancaScuri(); vestiLaScena(); firma(); tingiUI(); rigaturaListe(); rivestiBottoni();
         ricordaProgetto(); lavoriComuni(); sorveglia(); } catch (e) {}
  return "carta";
}

function scuro(ricorda = true) {
  stile();
  document.documentElement.setAttribute("data-veritas-vestito", "scuro");
  if (ricorda) { try { localStorage.setItem(CHIAVE, "scuro"); } catch {} }
  try { togliColoriCarta(); vestiLaScena(); firma(); ricordaProgetto(); lavoriComuni(); sorveglia(); } catch (e) {}
  return "scuro";
}

function spegni() {
  document.documentElement.removeAttribute("data-veritas-vestito");
  try { localStorage.setItem(CHIAVE, "notte"); } catch {}
  try { togliColoriCarta(); vestiLaScena(); } catch (e) {}
  return "notte";
}

function inverti() {
  return document.documentElement.getAttribute("data-veritas-vestito") === "carta"
    ? scuro() : accendi();
}

// All'avvio: lo SCURO (29/09), a meno che qualcuno non abbia scelto a mano
// la carta o la notte. Il predefinito non si scrive: resta una non-scelta.
function avvio() {
  agganciaAlModello();
  let scelto = null;
  try { scelto = localStorage.getItem(CHIAVE); } catch {}
  if (scelto === "notte") { stile(); return; }
  if (scelto === "carta") accendi(); else scuro(false);
  const carta = () => document.documentElement.getAttribute("data-veritas-vestito") === "carta";
  // ⚠️ LA SCENA NASCE DOPO DI NOI, e non sempre passa dal gancio del modello
  //    (si entra nello spazio di lavoro, la tela si crea, il modello magari
  //    arriva molto dopo o non arriva). Quindi si riprova per un po', e si
  //    smette appena la scena c'e' — non un ciclo eterno che gira a vuoto per
  //    tutta la sessione.
  let tentativi = 0;
  const t = setInterval(() => {
    let fatto = false;
    try { fatto = vestiLaScena(); firma();
           if (carta()) { sbiancaScuri(); tingiUI(); rigaturaListe(); rivestiBottoni(); }
           lavoriComuni(); } catch (e) {}
    if (fatto || ++tentativi > 40) clearInterval(t);
  }, 700);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  window.veritasCarta = { accendi, scuro, spegni, inverti, GRADI, modelloOriginale };

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
    if (document.documentElement.getAttribute("data-veritas-vestito")) {
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
