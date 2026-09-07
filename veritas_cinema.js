/**
 * EIDETICA — LA LETTURA DAL VIVO
 * =============================================================================
 *
 * ⚠️ QUESTA FINESTRA NON MOSTRA IL MODELLO DELL'UTENTE, E NON E' UN DETTAGLIO.
 *
 *    Raffaella, 06/09/2026: *«io vorrei non vedere il modello che ho dato.
 *    Se abbiamo selezionato questo tipo di immagine e' perche' vogliamo la
 *    controprova visiva che il nostro meccanismo funziona, e soprattutto di
 *    come funziona. Se vedo gia' tutto il modello in partenza non mi serve.
 *    Io voglio vedere cosa vede lui, da zero.»*
 *
 *    Quindi qui dentro **non si disegna una sola mesh del GLB**. Si disegnano
 *    solo due cose, e sono tutte e due farina del programma:
 *      · i PUNTI che ha misurato — la nuvola navigabile, uno per uno;
 *      · i RETTANGOLI degli ambienti che ha ricostruito, con la forma che ha
 *        misurato lui (lungo, largo, angolo) e il nome che ha riconosciuto.
 *    Se il programma ha capito male, qui si vede subito. E' il punto.
 *
 * ⚠️ E VA A TUTTO SCHERMO. *«Si deve andare a tutto schermo, non devo vedere
 *    piu' niente: se cinema e' cinema. Musica e basta, e la barra li' sotto.»*
 *    Niente pannelli, niente KPI, niente barra dell'applicazione.
 *
 * ⚠️ TELA PROPRIA, RENDERER PROPRIO. Non e' pigrizia: la versione precedente
 *    disegnava dentro la scena dell'applicazione, e ci sono volute due ore per
 *    scoprire che una regola dello strato «carta» colora TUTTI i canvas e le
 *    stendeva addosso un foglio grigio. Qui la finestra e' sua, e nessuno ci
 *    puo' scrivere sopra.
 *
 * L'APERTURA e' il marchio con le ali che si aprono — quella che gia' esiste
 * nella schermata d'attesa. ⚠️ Non si ridisegna: si usa il file vero, che e' la
 * regola di Raffaella («cercare di farlo uguale al logo, perche' altrimenti
 * perde»).
 *
 * ⚠️ LA REGOLA CHE TIENE IN PIEDI TUTTO (direttive 10 e 15): i COLORI sono
 *    liberi, le POSIZIONI no. Ogni punto sta dove e' stato misurato; ogni
 *    rettangolo ha la forma che e' stata misurata; un nome incerto resta
 *    pallido. Si puo' rendere bella la rappresentazione, mai la conclusione.
 */

const MARCA = [
  [0.169, 0.361, 0.902],   // blu      #2B5CE6
  [0.482, 0.184, 0.831],   // viola    #7B2FD4
  [0.878, 0.204, 0.545],   // magenta  #E0348B
  [0.976, 0.447, 0.122],   // arancio  #F9721F
  [0.984, 0.690, 0.231],   // oro      #FBB03B
];
const CARTA = '#FCFCFE';
const INCHIOSTRO = '#141A33';
const NEBBIA = '#8A90A6';

const PAROLE = {
  it: {
    pulsante: 'Lettura dal vivo',
    sottotitolo: 'guarda come si forma la comprensione',
    fasi: ['Modello grezzo', 'Percezione', 'Riconoscimento', 'Semantica', 'Spazio ricomposto'],
    uno: 'ambiente riconosciuto', molti: 'ambienti riconosciuti',
    occhio: 'altezza occhio', avvia: 'Avvia', pausa: 'Pausa',
    riprendi: 'Riprendi', rivedi: 'Rivedi', suono: 'Musica', chiudi: 'Chiudi',
    senzaNome: 'senza nome', punti: 'punti misurati',
    niente: 'Non c’è ancora niente di misurato da mostrare.',
    dialogo: 'Parla',
    chiedo: 'Ho misurato $A m² e non so che spazio sia. Secondo te che cos’è?',
    forse: 'Qui potrebbe esserci $N, ma non ne sono sicuro. È giusto?',
    grazie: 'Segnato: $N.',
    tutteNominate: 'Ho un nome per tutti gli ambienti che ho misurato.',
    scrivi: 'scrivi, oppure premi il microfono',
    ascolto: 'ti ascolto…',
    nonSento: 'Il microfono non è disponibile in questo browser: scrivi pure.',
  },
  en: {
    pulsante: 'Live view',
    sottotitolo: 'watch understanding take shape',
    fasi: ['Raw model', 'Perception', 'Recognition', 'Semantics', 'Space recomposed'],
    uno: 'space recognised', molti: 'spaces recognised',
    occhio: 'eye height', avvia: 'Play', pausa: 'Pause',
    riprendi: 'Resume', rivedi: 'Replay', suono: 'Music', chiudi: 'Close',
    senzaNome: 'unnamed', punti: 'measured points',
    niente: 'Nothing measured to show yet.',
    dialogo: 'Talk',
    chiedo: 'I measured $A m² and I don’t know what this space is. What do you say?',
    forse: 'This could be $N, but I’m not sure. Is that right?',
    grazie: 'Noted: $N.',
    tutteNominate: 'I have a name for every space I measured.',
    scrivi: 'type, or press the microphone',
    ascolto: 'listening…',
    nonSento: 'The microphone is not available in this browser: please type.',
  },
};
// ⚠️ NON si guarda `document.documentElement.lang`: misurato il 06/09, diceva
//    «en» su un'interfaccia tutta italiana. La lingua e' quella SCELTA.
function lingua() {
  const g = window.__veritasLingua || window.__veritasLang;
  if (g && PAROLE[String(g).toLowerCase().slice(0, 2)]) return String(g).toLowerCase().slice(0, 2);
  try {
    const b = Array.prototype.slice.call(document.querySelectorAll('button'))
      .filter((x) => /^(IT|EN)$/i.test((x.textContent || '').trim()));
    for (const x of b) {
      const st = getComputedStyle(x);
      if (x.getAttribute('aria-pressed') === 'true'
          || /active|selected|attiv/i.test(x.className || '')
          || (parseFloat(st.opacity || '1') > 0.95 && +st.fontWeight >= 600))
        return (x.textContent || '').trim().toLowerCase();
    }
  } catch (e) {}
  // ⚠️ INGLESE DI PARTENZA — Raffaella, 06/09: *«avevo detto di mettere tutto in
  //    inglese, avere tutta la piattaforma in inglese, per non ritornare piu' su
  //    questo»*. Chi ha gia' scelto una lingua se la tiene: la scelta batte il
  //    valore di partenza, come dappertutto in questo programma.
  try {
    const l = localStorage.getItem('veritasLang');
    if (l && PAROLE[String(l).toLowerCase().slice(0, 2)]) return String(l).toLowerCase().slice(0, 2);
  } catch (e) {}
  return 'en';
}
const P = () => PAROLE[lingua()] || PAROLE.it;

// ⚠️ CHI GUARDA E' UN PARAMETRO DICHIARATO, e gli archetipi non si riscrivono
//    qui: stanno in `veritas_visibility` (business 1,65 · wheelchair 1,20),
//    sono gli stessi dell'isovista e quelli per cui il referto 7 promette «la
//    stessa pianta a 1,65 m e a 1,20 m». Due registri sarebbero due verita'.
function attore(nome) {
  const reg = (window.__veritasVisibility && window.__veritasVisibility.SKINS)
           || window.__veritasSkins || null;
  const k = nome || S.attore || 'business';
  if (reg && reg[k]) return { chiave: k, occhio: reg[k].eyeHeight };
  return { chiave: k, occhio: ({ business: 1.65, wheelchair: 1.20, tourist: 1.65 })[k] || 1.65 };
}

// ⚠️ 60 GRADI: e' la lente con cui i motori di rendering ricreano la sensazione
//    dell'occhio umano (Raffaella, 06/09). Non e' il cono percettivo, che in
//    `veritas_visibility` vale 100-140: quello dice quanto una persona
//    PERCEPISCE, questo dice che lente montiamo.
const LENTE = 60;
const APERTURA_MS = 2200;    // il marchio che apre le ali
// ⚠️ SI CAMMINA A PASSO D'UOMO — Raffaella, 06/09: *«dovrebbe essere piu'
//    lento, a misura d'uomo»*. La durata del film non e' un numero scelto: e'
//    la lunghezza del percorso MISURATO diviso l'andatura di una persona.
//    1,35 m/s e' il passo medio in piano su superficie libera (Fruin), che e'
//    la stessa fonte con cui questo programma misura il corpo in movimento —
//    non un valore inventato per far durare di piu'.
//    ⚠️ Con un tetto e un fondo dichiarati: sotto i 24 s non e' un film, sopra
//       i 150 s non lo guarda nessuno. Quando si tocca il tetto **si dichiara
//       di quanto si sta correndo**, invece di far finta che sia un passo vero.
const PASSO_UMANO = 1.35;       // m/s
const FILM_MIN_MS = 24000;
// ⚠️ Sei minuti, non due e mezzo — Raffaella, 06/09: *«il viaggio dovrebbe
//    avere la durata di una camminata normale e non di una maratona fatta di
//    corsa»*. Un tetto stretto costringe a correre proprio sui modelli grandi,
//    cioe' quelli in cui camminare conta di piu'. Chi guarda ha la barra e il
//    tasto di pausa: la lunghezza non gli e' imposta.
const FILM_MAX_MS = 360000;
const FILM_MS = 30000;          // se non si sa quanto e' lungo il percorso

const S = {
  aperto: false, t: 0, corre: false, ultimo: 0, raf: null,
  velo: null, tela: null, sopra: null, plancia: null, pannello: null,
  ren: null, scena: null, cam: null, geom: null, mat: null,
  zone: [], via: null, attore: null, piani: [], durata: FILM_MS, rintocco: null, accordo: null,
  muriMesh: null, muriFilo: null, pavMesh: null, oggMesh: null, oggFilo: null,
  tettoMesh: null, reticolo: null,
  porta: [0, 0], quotaOcchio: 0, sguardo: null,
  fotogrammi: 0,
  centro: [0, 0, 0], angolo0: 0,
  // ⚠️ LA MUSICA NASCE SPENTA — Raffaella, 07/09: «taglia quella musica
  //    orribile». Due tentativi a orecchio chiuso hanno prodotto prima un
  //    rombo d'aereo e poi un film horror: chi non puo' sentire non deve
  //    decidere come suona la cosa. Il bottone resta, e la accende chi ha le
  //    orecchie. ⚠️ Non si e' CANCELLATO il motore: cancellarlo vorrebbe dire
  //    ricostruirlo da zero il giorno in cui si trova la musica giusta.
  audio: null, musica: false, lancio: null,
  chat: null, chiestaZona: null, ascolto: null, voce: true,
};

// ---------------------------------------------------------------------------
// I DATI. Tutti misurati, nessuno inventato. Se mancano, si dice e non si apre.
// ---------------------------------------------------------------------------
function dati() {
  const punti = window.__veritasAutoPoints || [];
  const zone = ((window.__veritasPercezione || {}).zones || []).slice();
  if (!punti.length || !zone.length) return null;

  const nodi = (window.__veritasGetNodes ? window.__veritasGetNodes() : []) || [];

  // ⚠️ L'ORDINE PARTE DALL'INGRESSO, non da dove il modello comincia.
  //    Misurato il 06/09: ordinando per x crescente il film cominciava dal
  //    piazzale degli aerei (x −82) e finiva sulla strada (x +21), cioe'
  //    raccontava lo spazio al contrario — da dove non entra nessuno.
  //    Raffaella l'ha visto subito: «mi sembra che parta dagli aerei».
  //    L'ingresso lo sa gia' `veritas_accessi`; se non c'e' si parte dal capo
  //    piu' vicino al cammino, e se non c'e' nemmeno quello lo si dichiara.
  let porta = null;
  try {
    const a = (window.__veritasAccessi || {}).accessi || [];
    const daFuori = a.filter((x) => x.fuori);
    const scelto = (daFuori[0] || a[0]);
    if (scelto && scelto.pos) porta = [scelto.pos[0], scelto.pos[2]];
  } catch (e) {}

  const via = cammino();
  if (!porta && via) porta = [via[0][0], via[0][2]];
  if (!porta) porta = [zone[0].centroidX, zone[0].centroidZ];

  const dist = (z) => Math.hypot(z.centroidX - porta[0], z.centroidZ - porta[1]);
  const dmax = Math.max.apply(null, zone.map(dist)) || 1;

  const zz = zone.map((z, i) => {
    let nome = null, fiducia = 1, dmin = Infinity, vicino = null;
    for (const n of nodi) {
      if (!n.pos) continue;
      const d = Math.hypot(n.pos[0] - z.centroidX, n.pos[2] - z.centroidZ);
      if (d < dmin) { dmin = d; vicino = n; }
    }
    if (vicino && dmin < Math.max(6, Math.sqrt(z.areaM2 || 9))) {
      nome = vicino.label || null;
      fiducia = vicino.fiducia != null ? vicino.fiducia
              : (vicino.confidence != null ? vicino.confidence : 1);
    }
    return {
      i, nome, fiducia, area: z.areaM2 || 0,
      x: z.centroidX, y: z.y != null ? z.y : 0, z: z.centroidZ,
      lungo: z.formaLungo || Math.sqrt(z.areaM2 || 4),
      largo: z.formaLargo || Math.sqrt(z.areaM2 || 4),
      angolo: z.formaAngolo || 0,
      colore: MARCA[i % MARCA.length],
      quando: 0.10 + 0.62 * (dist(z) / dmax),   // dall'ingresso verso il fondo
    };
  });
  // ⚠️ SE NON C'E' UN CAMMINO VERO, SE NE DICHIARA UNO. La finestra si guarda
  //    all'altezza dell'uomo e camminando (Raffaella, 06/09: «non alzare la
  //    telecamera»), quindi un percorso serve sempre. Quando la simulazione non
  //    ne ha ancora prodotto uno, si entra dalla porta misurata e si attraversa
  //    gli ambienti nell'ordine in cui li si incontra — che e' l'ordine che
  //    l'architetto ha messo in pianta, non una sequenza scritta nel codice.
  //    ⚠️ E lo si DICHIARA nel log: un cammino dedotto non e' un cammino
  //       misurato, e la differenza non si nasconde.
  let viaVera = !!via;
  let percorso = via;

  // ⚠️ LA TESTIMONIANZA SI PRENDE UNA VOLTA SOLA, E SERVE A TUTTI E DUE I RAMI.
  //    Stava dentro il ramo «cammino dedotto», e questo lasciava scoperto
  //    proprio il caso che Raffaella stava guardando: quando la simulazione e'
  //    partita davvero, il film segue il passeggero VERO, il ramo dedotto non
  //    viene eseguito, e nessuno controllava piu' dove quel passeggero mette i
  //    piedi. Il registro proteggeva il cammino finto e non quello vero.
  let calpestioIn = null, fuoriDa = null, testimoni = 0;
  try {
    const M = window.__veritasAccessiModulo || {};
    const dalPiano = ((window.__veritasVisto || {}).viste) || [];
    const daVicino = window.__veritasVisteRegione || [];
    const viste = (Array.isArray(dalPiano) ? dalPiano : []).concat(
                  Array.isArray(daVicino) ? daVicino : []);
    testimoni = viste.length;
    if (viste.length && typeof M.calpestioVisto === 'function')
      calpestioIn = (p) => M.calpestioVisto(p, { viste, raggioVista: 12 });
    if (viste.length && typeof M.ariaApertaVista === 'function')
      fuoriDa = (p) => M.ariaApertaVista(p, { viste, raggioVista: 12 });
  } catch (e) { calpestioIn = null; fuoriDa = null; }

  // ⚠️ E SUL CAMMINO VERO NON SI TAGLIA: SI DICHIARA.
  //    Se il passeggero della simulazione passa in mezzo agli aerei, quello NON
  //    e' un difetto del film — e' l'area navigabile misurata che comprende il
  //    piazzale, cioe' il lavoro della zonizzazione, che e' aperto. Un film che
  //    ritagliasse la traiettoria racconterebbe una simulazione diversa da
  //    quella che sta girando: sarebbe la stessa merce avariata dei KPI finti.
  //    Quindi si CONTA e si dice, con il numero.
  if (viaVera && calpestioIn && Array.isArray(percorso) && percorso.length) {
    let suiMezzi = 0, suiPassaggi = 0;
    const passo = Math.max(1, Math.floor(percorso.length / 120));   // un campione ogni tanto
    let guardati = 0;
    for (let i = 0; i < percorso.length; i += passo) {
      const c = calpestioIn(percorso[i]);
      guardati++;
      if (!c) continue;
      if (c.regola === 'mezzi') suiMezzi++;
      else if (c.regola === 'passaggio') suiPassaggi++;
    }
    const quota = guardati ? Math.round(100 * suiMezzi / guardati) : 0;
    if (suiMezzi) {
      console.warn('[EIDETICA live] il passeggero VERO passa dove l’occhio ha visto'
        + ' i mezzi: ' + quota + '% dei passi campionati (' + suiMezzi + ' su ' + guardati + ').'
        + ' Non è il film: è l’area navigabile misurata che comprende il piazzale.'
        + ' Il film non taglia la traiettoria — racconterebbe una simulazione diversa'
        + ' da quella che sta girando.');
    } else {
      console.log('[EIDETICA live] il passeggero vero non passa mai dove l’occhio ha'
        + ' visto i mezzi (' + guardati + ' passi campionati'
        + (suiPassaggi ? ', ' + suiPassaggi + ' dentro un passaggio' : '') + ').');
    }
  }

  if (!percorso) {
    // ⚠️ DOVE SI METTONO I PIEDI — Raffaella, 07/09, guardando il film:
    //    *«stavamo camminando sull'ala di un aereo, quindi c'e' qualcosa che
    //    non va nel riconoscimento del percorso. Se riconosci un aereo, e che
    //    quello e' un aeroporto, devi sapere che non cammini in mezzo agli
    //    aerei, ma che c'e' un tunnel a un livello piu' basso fra l'aereo e il
    //    terminal»*.
    //
    //    Non si tara nessuna soglia in metri: **lo ha gia' detto l'occhio**
    //    (direttiva 17). La conseguenza viaggia con la parola, nel registro
    //    `CALPESTIO_DI` di `veritas_riconosce.js`, che a sua volta la prende da
    //    Uniclass 2015 tabella SL. Qui si legge, non si decide.
    //
    // ⚠️ E NON BASTAVA «FUORI», ed e' il motivo per cui serviva un registro
    //    nuovo invece di riusare `ariaApertaVista`. Un marciapiede sta
    //    all'aperto e ci si cammina; un pontile d'imbarco sta all'aperto, in
    //    mezzo agli aerei, ed e' l'unica strada per arrivarci. Chi togliesse
    //    tutto cio' che sta fuori toglierebbe anche il tubo — cioe' proprio la
    //    cosa che Raffaella ha chiesto di riconoscere.
    //
    // 🔴 E DUE GUASTI SILENZIOSI TROVATI QUI, tutti e due del 06/09, tutti e
    //    due della stessa famiglia: codice giusto che non veniva mai eseguito.
    //    1. si cercava `window.__veritasAccessi.ariaApertaVista`, ma
    //       `__veritasAccessi` e' il RISULTATO di `trova()` e non ha nessuna
    //       funzione dentro. Le funzioni stanno in `__veritasAccessiModulo`.
    //       Quindi `fuoriDa` era **sempre** null, e il filtro non ha mai
    //       girato nemmeno una volta;
    //    2. si passavano `__veritasTestimonianza.viste`, che sono i riepiloghi
    //       degli scorci — `{vista, cose:[...]}` — e non hanno ne' `centro`
    //       ne' `ariaAperta`. Anche col primo guasto riparato, il filtro
    //       avrebbe letto zero. Le rilevazioni vere stanno in
    //       `__veritasVisto.viste` (dalla pianta, con la posizione) e in
    //       `__veritasVisteRegione` (dai primi piani, legate a un'area).
    //    Nessuno dei due dava errore. Il film continuava a camminare fra gli
    //    aerei e in console usciva una riga che diceva un'altra cosa.
    let dentro = zz;
    if (calpestioIn || fuoriDa) {
      const mezzi = [], passaggi = [];
      const soloDentro = zz.filter((Z) => {
        const c = calpestioIn ? calpestioIn([Z.x, Z.y, Z.z]) : null;
        // ⚠️ IL PASSAGGIO BATTE TUTTO. Un tubo d'imbarco e' circondato da aerei
        //    e da pista: qualunque altra regola lo butterebbe.
        if (c && c.regola === 'passaggio') { passaggi.push(Z.nome + ' (' + c.parola + ')'); return true; }
        if (c && c.regola === 'mezzi') { mezzi.push(Z.nome + ' (' + c.parola + ')'); return false; }
        // Dove il calpestio non dice niente resta la vecchia domanda: se li' si
        // e' all'aperto, non e' un ambiente da attraversare a piedi.
        return !(fuoriDa && fuoriDa([Z.x, Z.y, Z.z]));
      });
      // ⚠️ Se restassero meno di due ambienti non ci sarebbe piu' un viaggio:
      //    li' si tiene tutto e LO SI DICHIARA, invece di consegnare un film
      //    che non va da nessuna parte.
      if (soloDentro.length >= 2) {
        if (mezzi.length)
          console.log('[EIDETICA live] ' + mezzi.length
            + ' ambienti tolti dal cammino: lì passano i mezzi e la gente non ci cammina — '
            + mezzi.join(', '));
        if (passaggi.length)
          console.log('[EIDETICA live] ' + passaggi.length
            + ' ambienti TENUTI anche se stanno all’aperto: sono passaggi, di lì si cammina — '
            + passaggi.join(', '));
        if (soloDentro.length < zz.length)
          console.log('[EIDETICA live] restano ' + soloDentro.length + ' ambienti su '
            + zz.length + ' (testimonianza di ' + testimoni + ' cose viste).');
        dentro = soloDentro;
      } else {
        console.warn('[EIDETICA live] l’occhio dice che quasi tutto è vietato ai piedi:'
          + ' tengo tutti gli ambienti, se no non resta un viaggio. Da guardare.');
      }
    } else {
      // ⚠️ E LO DICE FORTE. Un film che cammina fra gli aerei perché l'occhio
      //    non ha ancora finito non è un difetto del film: è una cosa che chi
      //    guarda deve sapere mentre la guarda.
      console.warn('[EIDETICA live] l’occhio non ha ancora consegnato una testimonianza'
        + ' (né dalla pianta né dai primi piani): il cammino NON sa evitare i piazzali'
        + ' e le corsie, e può passare dove i piedi non si mettono.'
        + ' Riapri la finestra quando l’analisi ha finito.');
    }

    const ordinate = dentro.slice().sort((a, b) => a.quando - b.quando);
    const tappe = [[porta[0], zone[0] && zone[0].y != null ? zone[0].y : 0, porta[1]]]
      .concat(ordinate.map((Z) => [Z.x, Z.y, Z.z]));
    percorso = [];
    for (let i = 0; i < tappe.length - 1; i++) {
      const a = tappe[i], b = tappe[i + 1];
      const passi = Math.max(6, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 1.2));
      for (let k = 0; k < passi; k++) {
        const f = k / passi;
        const x = a[0] + (b[0] - a[0]) * f, z = a[2] + (b[2] - a[2]) * f;
        const yInterp = a[1] + (b[1] - a[1]) * f;
        // ⚠️ la quota la da' il PAVIMENTO MISURATO sotto i piedi, non
        //    l'interpolazione fra due baricentri: e' il riferimento da cui si
        //    misura l'altezza dell'occhio.
        const y = pavimentoIn(x, z, yInterp);
        percorso.push([x, y != null ? y : yInterp, z]);
      }
    }
    percorso.push(tappe[tappe.length - 1]);
    if (percorso.length < 8) percorso = null;
    else {
      let m = 0;
      for (let i = 1; i < percorso.length; i++) {
        m += Math.hypot(percorso[i][0] - percorso[i - 1][0], percorso[i][2] - percorso[i - 1][2]);
      }
      percorso.metri = m;
    }
  }

  const mu = muriMisurati();
  const pav = pavimentiMisurati();
  const ve = verticiMisurati();
  return { punti, zone: zz, porta, via: percorso, viaVera,
           muri: mu.muri, muriEsito: mu, pavimenti: pav,
           vertici: ve.punti, triangoli: ve.triangoli, verticiEsito: ve };
}

// ⚠️ IL PAVIMENTO E' IL RIFERIMENTO, e da li' si misura tutto — Raffaella,
//    06/09: *«tieni presente l'altezza media della persona: una volta stabilito
//    il pavimento, piu' o meno dovresti avere dei riferimenti»*.
//    Quindi la quota dell'occhio NON si prende dalla traiettoria (che su questo
//    motore vale 0, cioe' non dice niente): si prende dal PIANO DI CALPESTIO
//    misurato sotto i piedi, e ci si somma l'altezza dell'occhio dell'uomo.
function pavimentoIn(x, z, vicinoA) {
  const livelli = ((window.__veritasPercezione || {}).levels) || [];
  let scelto = null, meglio = Infinity;
  for (const L of livelli) {
    const g = L.grid;
    if (!g || !g.free) continue;
    const cx = Math.floor((x - g.minX) / g.cellSize);
    const cz = Math.floor((z - g.minZ) / g.cellSize);
    if (cx < 0 || cz < 0 || cx >= g.w || cz >= g.h) continue;
    if (g.free[cz * g.w + cx] !== 1) continue;
    const d = vicinoA != null ? Math.abs(L.levelY - vicinoA) : L.levelY;
    if (d < meglio) { meglio = d; scelto = L.levelY; }
  }
  return scelto;
}

// ⚠️ SI SEGUE CHI CAMMINA DENTRO LO SPAZIO MISURATO, non l'agente numero zero.
//    Misurato il 06/09 sulla pagina viva: l'agente 0 arriva a x = 48 e z = 32,
//    mentre lo spazio ricostruito finisce a x = 21 e z = 20. Cioe' la finestra
//    seguiva qualcuno che a un certo punto esce dal modello, e per meta' film
//    la telecamera stava in aperta campagna a guardare il nulla — schermo
//    bianco con tutto il resto funzionante.
//    Scegliere fra i ventotto camminatori quello che sta davvero dentro non e'
//    inventare un percorso: e' seguire un passeggero invece di un altro. Chi si
//    e' scelto, e quanto sta dentro, lo dice il log.
const AGENTI_PROVATI = 28;

function cammino() {
  let t = null;
  try { t = window.__veritasGetTrajectory && window.__veritasGetTrajectory(); } catch (e) { return null; }
  if (!t) return null;
  const f = t.frames || t.fotogrammi || (Array.isArray(t) ? t : null);
  if (!Array.isArray(f) || !f.length) return null;

  const leggi = (a) => {
    if (!a) return null;
    const x = Array.isArray(a) ? a[0] : (a.x != null ? a.x : (a.pos && a.pos[0]));
    const y = Array.isArray(a) ? a[1] : (a.y != null ? a.y : (a.pos && a.pos[1]));
    const z = Array.isArray(a) ? a[2] : (a.z != null ? a.z : (a.pos && a.pos[2]));
    if (typeof x !== 'number' || typeof z !== 'number') return null;
    return [x, typeof y === 'number' ? y : 0, z];
  };
  const agenteIn = (q, k) => {
    if (Array.isArray(q)) return q[k];
    const l = q && (q.agents || q.agenti);
    return l ? l[k] : null;
  };

  let migliore = null;
  for (let k = 0; k < AGENTI_PROVATI; k++) {
    const via = [];
    let dentro = 0;
    for (const q of f) {
      const p = leggi(agenteIn(q, k));
      if (!p) continue;
      const y = pavimentoIn(p[0], p[2], p[1]);
      if (y != null) { dentro++; p[1] = y; }
      via.push(p);
    }
    if (via.length <= 8) continue;
    const quota = dentro / via.length;
    if (!migliore || quota > migliore.quota) migliore = { k, via, quota };
    if (quota > 0.97) break;    // meglio di cosi' non serve cercare
  }
  if (!migliore) return null;

  // ⚠️ UN CAMMINO CHE NON STA NELLO SPAZIO MISURATO NON E' UN CAMMINO DI QUESTO
  //    EDIFICIO, e si butta. Misurato il 06/09 sulla pagina viva, ed e' la
  //    scoperta che ha sbloccato questa finestra: **tutti e 28 i camminatori
  //    stavano fuori** — il migliore dentro il 13% dei passi, il peggiore il
  //    6%, tutti a quota zero, e uno arrivava a x = 48 mentre lo spazio
  //    misurato finisce a x = 21. Non erano passeggeri di questo aeroporto:
  //    erano i 361 fotogrammi della SEQUENZA DIMOSTRATIVA cablata nel bundle,
  //    che risponde anche quando la simulazione non e' mai partita (difetto
  //    gia' noto: «i 361 fotogrammi e i 180 secondi sono i numeri del bundle,
  //    non i nostri»). La telecamera li seguiva in aperta campagna, e lo
  //    schermo restava bianco con tutto il resto funzionante.
  //    ⚠️ La prova non nomina il bundle e non conta i fotogrammi: guarda se
  //       quei passi cadono sul calpestabile MISURATO. Cosi' regge anche il
  //       giorno in cui la sequenza finta cambia forma.
  if (migliore.quota < 0.6) {
    console.warn('[EIDETICA live] il cammino che mi viene dato NON sta nello spazio misurato'
      + ' (il migliore dei ' + AGENTI_PROVATI + ' camminatori ci sta dentro solo il '
      + Math.round(migliore.quota * 100) + '% dei passi): non è un percorso di questo edificio,'
      + ' e non lo seguo. Cammino dedotto dagli ambienti misurati. Per vedere un passeggero'
      + ' vero la simulazione deve essere stata avviata.');
    return null;
  }

  const via = migliore.via;

  // ⚠️ SI TAGLIA LA CODA FERMA — misurato il 06/09 sulla pagina viva, ed e' un
  //    difetto VERO che questa finestra ha reso visibile in tre secondi: il
  //    passeggero si pianta (e' il trap del motore fisico, «unreachable», gia'
  //    noto) e da li' in poi tutti i fotogrammi ripetono la stessa posizione.
  //    Sarebbe un fermo immagine spacciato per una camminata — e per giunta la
  //    telecamera guarderebbe il punto in cui si trova gia', il che ANNULLA
  //    l'inquadratura e fa sparire la scena intera.
  let fine = via.length - 1;
  const u = via[fine];
  // ⚠️ Mezzo metro, non cinque centimetri: un agente piantato non si ferma
  //    del tutto, TREMA. Misurato il 06/09: con 5 cm si tagliavano 4
  //    fotogrammi su 795 e l'ultimo quarto del film restava un fermo
  //    immagine — la telecamera si spostava di SEI CENTIMETRI fra il 75% e
  //    il 94%. Stare mezzo metro nello stesso posto per centinaia di
  //    fotogrammi e' stare fermi.
  while (fine > 1 && Math.hypot(via[fine - 1][0] - u[0], via[fine - 1][2] - u[2]) < 0.5) fine--;
  const tagliato = via.length - 1 - fine;
  const buono = via.slice(0, fine + 1);
  if (buono.length <= 8) return null;

  let percorsi = 0;
  for (let i = 1; i < buono.length; i++) {
    percorsi += Math.hypot(buono[i][0] - buono[i - 1][0], buono[i][2] - buono[i - 1][2]);
  }
  buono.metri = percorsi;
  buono.fermi = tagliato;
  buono.agente = migliore.k;
  buono.quota = migliore.quota;
  return buono;
}

// ---------------------------------------------------------------------------
// I MURI — 06/09/2026. Definito da Raffaella, ed e' cio' che tiene in piedi
// tutto il resto del film.
//
//   «Penso che il problema sia nella distanza fra i punti: si devono radunare e
//    condensare a formare delle MESH. Cosi' puoi stare all'altezza dell'uomo,
//    nello sguardo di uno che cammina.»
//
// Da dove nascono, e non sono inventati: nella griglia del motore percettivo il
// confine fra una cella LIBERA e una OCCUPATA **e' il muro**. La pianta la da'
// la griglia, l'altezza la da' il modello.
//
// ⚠️ DOVE NON C'E' IL MURO NON SI DISEGNA NIENTE — regola di Raffaella, 06/09:
//    *«dove non c'e' il muro non lo mettiamo, perche' altrimenti crei un
//    precedente che ti puo' danneggiare quando avrai un'architettura formata in
//    tutto e per tutto»*. Questo modello e' uno SPACCATO: sul lato tagliato la
//    griglia ha lo stesso identico confine libero/occupato di un muro vero, ma
//    sopra non sta in piedi niente — e li' il film deve mostrare aria, non una
//    parete inventata. Il filtro e' una riga sola: se il modello non misura
//    un'altezza, quel confine non diventa una superficie.
// ⚠️ E NIENTE SOFFITTO, per la stessa ragione: uno spaccato non ce l'ha.
// ---------------------------------------------------------------------------

const MURO_MINIMO = 0.45;   // sotto questa quota non e' un muro: e' un gradino
// ⚠️ UN MURO E' UNA COSA LUNGA, e va disegnato lungo. Misurato il 06/09: con le
//    altezze raggruppate in bande fisse da 75 cm, 1.121 confini diventavano 412
//    pannelli — cioe' tronconi da 68 cm, e a occhio d'uomo si leggevano come un
//    mazzo di carte in piedi, non come una parete. La corsa non si spezza a ogni
//    scalino della misura: si spezza quando l'altezza cambia DAVVERO.
const MURO_SCARTO = 1.2;    // metri di differenza che rompono la corsa
const MURI_MAX = 8000;

function muriMisurati() {
  const livelli = ((window.__veritasPercezione || {}).levels) || [];
  const esito = { muri: [], confini: 0, senzaAltezza: 0, altezzaMax: 0, misurata: false };
  if (!livelli.length) return esito;

  // L'altezza dei muri il programma la misura gia' (`veritas_visibility`,
  // superfici verticali per estensione del triangolo). Finora non l'aveva mai
  // interrogata nessuno: e' «meta' del prodotto gia' pagata».
  let H = null;
  try {
    const L = window.__veritasPerception;
    if (L && typeof L.griglia === 'function') H = L.griglia();
  } catch (e) { H = null; }
  esito.misurata = !!H;
  if (!H) return esito;

  const altezzaIn = (x, z) => {
    const cx = Math.floor((x - H.minX) / H.cella);
    const cz = Math.floor((z - H.minZ) / H.cella);
    if (cx < 0 || cz < 0 || cx >= H.nx || cz >= H.nz) return 0;
    return H.altezze[cz * H.nx + cx];
  };

  // Quattro versi. Per ognuno si tiene fermo l'indice perpendicolare al muro e
  // si scorre lungo il muro: cosi' i confini consecutivi diventano UN pannello,
  // e non diecimila mattonelle da venticinque centimetri.
  const versi = [
    { asse: 'x', d:  1 }, { asse: 'x', d: -1 },
    { asse: 'z', d:  1 }, { asse: 'z', d: -1 },
  ];

  for (const L of livelli) {
    const g = L.grid;
    if (!g || !g.free) continue;
    const w = g.w, h = g.h, c = g.cellSize, mx = g.minX, mz = g.minZ, free = g.free;
    const y0 = L.levelY != null ? L.levelY : 0;
    const libera = (x, z) => (x >= 0 && z >= 0 && x < w && z < h && free[z * w + x] === 1);

    for (const V of versi) {
      const perX = V.asse === 'x';
      const dx = perX ? V.d : 0, dz = perX ? 0 : V.d;
      const nFermo = perX ? w : h;     // indice perpendicolare al muro
      const nCorsa = perX ? h : w;     // indice lungo il muro

      for (let f = 0; f < nFermo; f++) {
        let da = -1, fino = -1, banda = -1, somma = 0, quanti = 0;

        const chiudi = () => {
          if (da < 0 || !quanti) { da = -1; return; }
          const alt = somma / quanti;
          const lungo = (fino - da + 1) * c;
          if (perX) {
            // il muro guarda lungo X e si stende lungo Z
            esito.muri.push({
              asse: 'x', y: y0, alt, lungo,
              cx: mx + (f + (V.d > 0 ? 1 : 0)) * c,
              cz: mz + (da + (fino - da + 1) / 2) * c,
            });
          } else {
            esito.muri.push({
              asse: 'z', y: y0, alt, lungo,
              cx: mx + (da + (fino - da + 1) / 2) * c,
              cz: mz + (f + (V.d > 0 ? 1 : 0)) * c,
            });
          }
          if (alt > esito.altezzaMax) esito.altezzaMax = alt;
          da = -1;
        };

        for (let b = 0; b <= nCorsa; b++) {
          let confine = false, alt = 0;
          if (b < nCorsa) {
            const cx = perX ? f : b;
            const cz = perX ? b : f;
            if (libera(cx, cz) && !libera(cx + dx, cz + dz)) {
              esito.confini++;
              // si guarda dalla parte OCCUPATA, oltre il confine: la griglia
              // delle altezze ha celle da 40 cm, molto piu' grosse di questa.
              const px = mx + (cx + 0.5) * c, pz = mz + (cz + 0.5) * c;
              alt = Math.max(
                altezzaIn(px + dx * 0.25, pz + dz * 0.25),
                altezzaIn(px + dx * 0.55, pz + dz * 0.55)
              );
              if (alt >= MURO_MINIMO) confine = true;
              else { esito.senzaAltezza++; alt = 0; }
            }
          }
          // la corsa continua finche' l'altezza resta vicina alla media di
          // quello che si sta gia' misurando: cosi' un muro lungo trenta metri
          // resta UN muro, e un bancone accanto a una parete si stacca.
          const media = quanti ? somma / quanti : 0;
          const stessoMuro = confine && da >= 0 && b === fino + 1
                             && Math.abs(alt - media) <= MURO_SCARTO;
          if (stessoMuro) {
            fino = b; somma += alt; quanti++;
          } else {
            chiudi();
            if (confine) { da = b; fino = b; banda = 0; somma = alt; quanti = 1; }
          }
          if (esito.muri.length > MURI_MAX) break;
        }
        chiudi();
        if (esito.muri.length > MURI_MAX) break;
      }
      if (esito.muri.length > MURI_MAX) break;
    }
  }
  return esito;
}

// ---------------------------------------------------------------------------
// IL PAVIMENTO — 06/09/2026. Raffaella: *«perche' non hanno il pavimento? Il
// pavimento dovrebbe essere una delle prime cose che l'occhio misura.»*
//
// E infatti lo misura: sono le celle LIBERE della stessa griglia da cui vengono
// i muri, 3.363 m² su questo modello. Il difetto era che il film lo mostrava
// solo come nuvola navigabile — **6 punti al metro quadro**, che all'altezza
// dell'occhio, di taglio, non sono un pavimento: sono coriandoli. Adesso le
// celle libere diventano una SUPERFICIE misurata, e i punti ci si posano sopra
// fitti come sulle pareti.
// ---------------------------------------------------------------------------
function pavimentiMisurati() {
  const livelli = ((window.__veritasPercezione || {}).levels) || [];
  const fuori = [];
  for (const L of livelli) {
    const g = L.grid;
    if (!g || !g.free) continue;
    const w = g.w, h = g.h, c = g.cellSize, mx = g.minX, mz = g.minZ, free = g.free;
    const y = L.levelY != null ? L.levelY : 0;
    for (let z = 0; z < h; z++) {
      let da = -1;
      for (let x = 0; x <= w; x++) {
        const libera = x < w && free[z * w + x] === 1;
        if (libera && da < 0) da = x;
        if (!libera && da >= 0) {
          fuori.push({
            cx: mx + (da + (x - da) / 2) * c, cz: mz + (z + 0.5) * c,
            lungo: (x - da) * c, largo: c, y,
          });
          da = -1;
        }
      }
    }
  }
  return fuori;
}

// ---------------------------------------------------------------------------
// I VERTICI — 06/09/2026. E' Raffaella che ha dato la regola giusta, e chiude
// due sue osservazioni in una riga sola:
//
//   *«Ci sono tanti particolari che non vedo, vedo solo dei solidi. Le immagini
//    che lui vede sono scorci prospettici dettagliati, anche viste da vicino:
//    mi sembra strano che si veda cosi' in maniera semplificata.»*
//
//   *«Nei software di renderizzazione 3D le mesh derivano da dei triangoli:
//    questi puntini dovrebbero essere i VERTICI di questi triangoli, per darti
//    la proporzione. Altrimenti il dettaglio si perde per forza.»*
//
// ⚠️ E' la definizione esatta di «gli atomi che costituiscono il volume». Un
//    punto campionato a caso su una scatola non ha forma; un vertice del
//    modello **e' la forma**: una seduta viene come una seduta, una persona
//    come una persona, e la densita' non la decidiamo noi — la decide quanto
//    dettaglio ha messo chi ha fatto il modello.
//
// ⚠️ E NON e' disegnare il modello dell'utente. Nella finestra non entra una
//    sola mesh: entrano i suoi vertici come polvere, che e' cio' che il film
//    fa condensare. Le superfici che si accendono restano quelle che il
//    programma ha RICAVATO (pavimento e muri dalla griglia), non le sue.
// ---------------------------------------------------------------------------
// ⚠️ E DOPO I PUNTI ARRIVANO I TRIANGOLI, che sono il PROFILO — Raffaella,
//    06/09, guardando la prima versione: *«le ali risultano come delle sezioni
//    non collegate fra di loro, e invece dovrebbero: cosi' come i muri vengono
//    delineati con un bordo — ci sono i puntini e poi i bordi — cosi' dovrebbe
//    avvenire anche per gli oggetti, per dare un minimo di leggibilita'.»*
//    I vertici da soli sono una nuvola con dentro una forma; i triangoli che li
//    uniscono **sono** la forma. E' la riga 4 della grammatica portata fino in
//    fondo: i punti si condensano in MESH.
const VERTICI_MAX = 90000;
const VERTICI_MINIMI_PER_PEZZO = 8;
const TRIANGOLI_MAX = 26000;

function verticiMisurati() {
  const T = window.THREE;
  const radice = window.__veritasModelRoot;
  const esito = { punti: [], triangoli: [], mesh: 0, verticiVeri: 0,
                  presi: 0, triangoliVeri: 0, figure: 0 };
  if (!T || !radice) return esito;

  // Le figure umane le riconosce gia' `veritas_controprova`: non si riscrive la
  // regola, si chiede a chi la possiede. Servono per farle LEGGERE — Raffaella
  // non e' riuscita a distinguerne nessuna nella prima versione.
  const umane = new Set();
  try {
    const C = window.__veritasCoseTrovate, K = window.__veritasControprova;
    if (C && C.cose && K && typeof K.figure === 'function') {
      for (const g of K.figure(C.cose)) for (const p of (g.pezzi || [])) if (p && p.id) umane.add(p.id);
    }
  } catch (e) { /* si tira dritto */ }

  const mesh = [];
  radice.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    // ⚠️ non entrano i nostri disegni: i percorsi e i volumi che VERITAS mette
    //    sopra il modello sono marcati, e specchiarli qui sarebbe guardarsi
    //    allo specchio.
    let n = o, nostro = false;
    for (let i = 0; i < 6 && n; i++) { if (n.userData && n.userData.__veritasHelper) { nostro = true; break; } n = n.parent; }
    if (nostro) return;
    const p = o.geometry.attributes && o.geometry.attributes.position;
    if (!p || !p.count) return;
    const idx = o.geometry.index;
    const nTri = idx ? idx.count / 3 : p.count / 3;
    mesh.push({ o, n: p.count, nTri, uomo: umane.has(o.uuid) });
    esito.verticiVeri += p.count;
    esito.triangoliVeri += nTri;
    if (umane.has(o.uuid)) esito.figure++;
  });
  esito.mesh = mesh.length;
  if (!mesh.length) return esito;

  // ⚠️ Il passo e' PROPORZIONALE, non uguale per tutti: con un passo unico una
  //    persona da 900 vertici e un piazzale da 4 contribuirebbero allo stesso
  //    modo, e il dettaglio — che e' il punto — sparirebbe dalle cose piccole.
  //    Ogni mesh porta almeno otto vertici, cosi' niente scompare del tutto.
  const passo = Math.max(1, Math.ceil(esito.verticiVeri / VERTICI_MAX));
  const passoTri = Math.max(1, Math.ceil(esito.triangoliVeri / TRIANGOLI_MAX));
  const v = new T.Vector3(), v2 = new T.Vector3(), v3 = new T.Vector3();

  for (const m of mesh) {
    m.o.updateWorldMatrix(true, false);
    const a = m.o.geometry.attributes.position;
    const M4 = m.o.matrixWorld;

    if (esito.punti.length < VERTICI_MAX) {
      const suo = Math.max(VERTICI_MINIMI_PER_PEZZO, Math.round(a.count / passo));
      const p = Math.max(1, Math.floor(a.count / Math.min(a.count, suo)));
      for (let i = 0; i < a.count; i += p) {
        v.fromBufferAttribute(a, i).applyMatrix4(M4);
        if (!isFinite(v.x) || !isFinite(v.y) || !isFinite(v.z)) continue;
        esito.punti.push([v.x, v.y, v.z]);
        if (esito.punti.length >= VERTICI_MAX) break;
      }
    }

    if (esito.triangoli.length < TRIANGOLI_MAX) {
      const idx = m.o.geometry.index;
      const nTri = m.nTri | 0;
      // ⚠️ almeno due triangoli per pezzo: una figura umana con quattro
      //    triangoli e' ancora una figura; con zero e' sparita.
      const suoi = Math.max(2, Math.round(nTri / passoTri));
      const p = Math.max(1, Math.floor(nTri / Math.min(nTri, suoi)));
      for (let t = 0; t < nTri; t += p) {
        const i0 = idx ? idx.getX(t * 3) : t * 3;
        const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
        const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
        if (i2 >= a.count) continue;
        v.fromBufferAttribute(a, i0).applyMatrix4(M4);
        v2.fromBufferAttribute(a, i1).applyMatrix4(M4);
        v3.fromBufferAttribute(a, i2).applyMatrix4(M4);
        if (!isFinite(v.x) || !isFinite(v2.x) || !isFinite(v3.x)) continue;
        esito.triangoli.push({
          a: [v.x, v.y, v.z], b: [v2.x, v2.y, v2.z], c: [v3.x, v3.y, v3.z],
          uomo: m.uomo,
        });
        if (esito.triangoli.length >= TRIANGOLI_MAX) break;
      }
    }
    if (esito.punti.length >= VERTICI_MAX && esito.triangoli.length >= TRIANGOLI_MAX) break;
  }
  esito.presi = esito.punti.length;
  return esito;
}

// I quattro spigoli di un pannello, in coordinate di mondo.
function spigoli(M) {
  const m = M.lungo / 2, y0 = M.y, y1 = M.y + M.alt;
  if (M.asse === 'x') {
    return [
      [M.cx, y0, M.cz - m], [M.cx, y0, M.cz + m],
      [M.cx, y1, M.cz + m], [M.cx, y1, M.cz - m],
    ];
  }
  return [
    [M.cx - m, y0, M.cz], [M.cx + m, y0, M.cz],
    [M.cx + m, y1, M.cz], [M.cx - m, y1, M.cz],
  ];
}

// ---------------------------------------------------------------------------
// LA SCENA — tutta nostra. Qui dentro il GLB non entra.
// ---------------------------------------------------------------------------
function costruisci(D) {
  const T = window.THREE;
  const scena = new T.Scene();
  const cam = new T.PerspectiveCamera(LENTE, 1, 0.1, 4000);

  // ---- IL RETICOLO: la profondita' che il fondo bianco non da' -------------
  // ⚠️ Raffaella, 06/09: *«il fondo completamente bianco secondo me non ci
  //    aiuta ad avere l'effetto tridimensionale. Dobbiamo avere la sensazione
  //    dello spazio anche alle spalle del modello, sia pure con una griglia
  //    leggerissima: fondo bianco con delle sottili linee grigie.»*
  //
  //    Su carta bianca l'occhio non ha nessun appiglio per capire quanto e'
  //    lontana una cosa: senza un piano di riferimento, un muro a cinque metri
  //    e uno a cinquanta stanno allo stesso posto. Il reticolo e' quel piano —
  //    e lo era gia' nel prototipo di Raffaella.
  // ⚠️ E' l'unica cosa disegnata che NON e' misurata, quindi si dichiara con
  //    l'unico modo che ha un disegno per dichiararsi: **sparisce**. Man mano
  //    che lo spazio si ricompone il reticolo si spegne, e alla fine resta solo
  //    quello che e' stato misurato davvero.
  let reticolo = null;
  {
    let ax = Infinity, bx = -Infinity, az = Infinity, bz = -Infinity, ay = Infinity;
    for (const q of D.punti) {
      if (q[0] < ax) ax = q[0]; if (q[0] > bx) bx = q[0];
      if (q[2] < az) az = q[2]; if (q[2] > bz) bz = q[2];
      if (q[1] < ay) ay = q[1];
    }
    if (isFinite(ax)) {
      const ORLO = 70, PASSO = 5;
      ax = Math.floor((ax - ORLO) / PASSO) * PASSO; az = Math.floor((az - ORLO) / PASSO) * PASSO;
      bx = Math.ceil((bx + ORLO) / PASSO) * PASSO;  bz = Math.ceil((bz + ORLO) / PASSO) * PASSO;
      const y = ay - 0.02, rp = [];
      for (let x = ax; x <= bx; x += PASSO) rp.push(x, y, az, x, y, bz);
      for (let z = az; z <= bz; z += PASSO) rp.push(ax, y, z, bx, y, z);
      const gr = new T.BufferGeometry();
      gr.setAttribute('position', new T.BufferAttribute(new Float32Array(rp), 3));
      reticolo = new T.LineSegments(gr, new T.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { spegni: { value: 0 } },
        vertexShader: [
          'varying float vD;',
          'void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0);',
          '  vD = -mv.z; gl_Position = projectionMatrix * mv; }',
        ].join('\n'),
        fragmentShader: [
          'varying float vD; uniform float spegni;',
          'void main(){',
          // vicino sfuma (se no si vede il reticolo sotto i piedi), lontano
          // svanisce: resta la fascia di mezzo, che e' quella che dice «spazio»
          '  float a = smoothstep(2.0, 14.0, vD) * (1.0 - smoothstep(45.0, 150.0, vD));',
          '  a *= (1.0 - spegni);',
          '  if (a <= 0.002) discard;',
          '  gl_FragColor = vec4(0.541, 0.565, 0.651, a * 0.30); }',
        ].join('\n'),
      }));
      reticolo.frustumCulled = false;
      scena.add(reticolo);
    }
  }

  // ⚠️ Il seme e' fisso: lo stesso modello deve dare lo stesso film.
  let seme = 20260906;
  const caso = () => { seme = (seme * 1664525 + 1013904223) % 4294967296; return seme / 4294967296; };

  // ---- I BERSAGLI DELLA POLVERE -------------------------------------------
  // Ogni punto ha un posto dove andare, e quel posto e' MISURATO. Tre famiglie,
  // e nessuna delle tre e' inventata:
  //
  //   1. i VERTICI DEI TRIANGOLI del modello — la regola di Raffaella, ed e'
  //      quella che porta il dettaglio: una seduta viene come una seduta, una
  //      persona come una persona, e la densita' la decide chi ha fatto il file;
  //   2. il PAVIMENTO, dalle celle libere della griglia (un piano grande ha
  //      quattro vertici in tutto: sui soli vertici il calpestio sparirebbe,
  //      ed e' *«una delle prime cose che l'occhio misura»*);
  //   3. i MURI, dal confine fra cella libera e cella occupata.
  //
  // ⚠️ FITTI — Raffaella: *«pensa a questi puntini come agli atomi che
  //    costituiscono il volume, una serie abbastanza fitti, e tieni presente
  //    l'altezza media della persona»*. Il riferimento e' il corpo: su una
  //    parete alta quanto una persona e larga un metro devono cadere una
  //    trentina di punti, se no a quella distanza non si legge niente.
  const bersagli = [];
  for (const q of D.vertici) bersagli.push(q);

  const DENSITA_PAVIMENTO = 9;    // punti al metro quadro di calpestio
  const DENSITA_MURO = 18;        // punti al metro quadro di parete
  const PAVIMENTO_MAX = 34000;
  const MURI_MAX_PUNTI = 26000;

  let suiPavimenti = 0;
  for (const F of D.pavimenti) {
    if (suiPavimenti >= PAVIMENTO_MAX) break;
    let k = Math.min(400, Math.max(1, Math.round(F.lungo * F.largo * DENSITA_PAVIMENTO)));
    k = Math.min(k, PAVIMENTO_MAX - suiPavimenti);
    for (let j = 0; j < k; j++) {
      bersagli.push([F.cx + (caso() - 0.5) * F.lungo, F.y, F.cz + (caso() - 0.5) * F.largo]);
    }
    suiPavimenti += k;
  }

  let suiMuri = 0;
  for (const M of D.muri) {
    if (suiMuri >= MURI_MAX_PUNTI) break;
    let k = Math.min(600, Math.max(6, Math.round(M.lungo * M.alt * DENSITA_MURO)));
    k = Math.min(k, MURI_MAX_PUNTI - suiMuri);
    for (let j = 0; j < k; j++) {
      const s = (caso() - 0.5) * M.lungo, t = caso() * M.alt;
      bersagli.push([
        M.asse === 'x' ? M.cx : M.cx + s,
        M.y + t,
        M.asse === 'x' ? M.cz + s : M.cz,
      ]);
    }
    suiMuri += k;
  }

  const n = bersagli.length;
  const pos = new Float32Array(n * 3), meta = new Float32Array(n * 3),
        nasce = new Float32Array(n * 3), tinta = new Float32Array(n * 3),
        quando = new Float32Array(n), dim = new Float32Array(n);
  let minY = Infinity, maxY = -Infinity;
  for (const q of bersagli) { if (q[1] < minY) minY = q[1]; if (q[1] > maxY) maxY = q[1]; }

  // ⚠️ LO SPAZIO SI COSTRUISCE DOVE IL CORPO PASSA — Raffaella, 06/09:
  //    «man mano che l'AI procede nel suo percorso, chiaramente formera' i
  //    volumi che ha visto». Quindi il momento in cui un punto si posa non e'
  //    un effetto deciso a tavolino: e' QUANDO il camminatore gli arriva
  //    vicino, con un po' d'anticipo perche' un muro lo si vede prima di
  //    averlo a fianco. Dove non e' ancora passato nessuno resta il vuoto —
  //    e quel vuoto e' un'informazione, non un buco.
  // ⚠️ E si guarda LONTANO, non a un braccio: un muro in fondo alla sala lo si
  //    vede appena si entra, e trenta metri e' la portata con cui questo stesso
  //    programma calcola gia' cosa si vede da un punto.
  //    Il conto si fa una volta sola su una griglia da due metri, non punto per
  //    punto: con centomila punti e centoquaranta passi sarebbero quattordici
  //    milioni di distanze a ogni apertura della finestra.
  const passi = [];
  if (D.via && D.via.length > 8) {
    const salto = Math.max(1, Math.floor(D.via.length / 140));
    for (let i = 0; i < D.via.length; i += salto) passi.push(D.via[i]);
  }
  const PORTATA = 30, CELLA_Q = 2;
  let Q = null;
  if (passi.length >= 2) {
    let ax = Infinity, bx = -Infinity, az = Infinity, bz = -Infinity;
    for (const q of bersagli) {
      if (q[0] < ax) ax = q[0]; if (q[0] > bx) bx = q[0];
      if (q[2] < az) az = q[2]; if (q[2] > bz) bz = q[2];
    }
    ax -= PORTATA; az -= PORTATA; bx += PORTATA; bz += PORTATA;
    const w = Math.max(1, Math.ceil((bx - ax) / CELLA_Q));
    const h = Math.max(1, Math.ceil((bz - az) / CELLA_Q));
    const primo = new Int32Array(w * h).fill(-1);
    const r = Math.round(PORTATA / CELLA_Q);
    for (let i = passi.length - 1; i >= 0; i--) {   // all'indietro: vince il primo
      const p = passi[i];
      const cx = Math.floor((p[0] - ax) / CELLA_Q), cz = Math.floor((p[2] - az) / CELLA_Q);
      for (let dz = -r; dz <= r; dz++) {
        const z2 = cz + dz; if (z2 < 0 || z2 >= h) continue;
        for (let dx = -r; dx <= r; dx++) {
          if (dx * dx + dz * dz > r * r) continue;
          const x2 = cx + dx; if (x2 < 0 || x2 >= w) continue;
          primo[z2 * w + x2] = i;
        }
      }
    }
    Q = { ax, az, w, h, primo };
  }
  const ANTICIPO = 0.07;
  const quandoDi = (x, z, zona) => {
    if (!Q) return (zona ? zona.quando : 0.2);
    const cx = Math.floor((x - Q.ax) / CELLA_Q), cz = Math.floor((z - Q.az) / CELLA_Q);
    let k = -1;
    if (cx >= 0 && cz >= 0 && cx < Q.w && cz < Q.h) k = Q.primo[cz * Q.w + cx];
    // ⚠️ mai visto da nessun passo: NON si fa comparire lo stesso. Resta il
    //    vuoto, e quel vuoto e' un'informazione.
    if (k < 0) return 99;
    const u = k / (passi.length - 1);
    return Math.max(0.02, Math.min(0.93, 0.06 + u * 0.84 - ANTICIPO));
  };

  // ⚠️ Un punto che il camminatore non incontra MAI non entra nemmeno nella
  //    polvere: non si fa restare a mezz'aria a fare da nebbia. Il vuoto resta
  //    vuoto, ed e' un'informazione.
  let m = 0;
  for (let i = 0; i < n; i++) {
    const q = bersagli[i];
    let zona = null, dmin = Infinity;
    for (const Z of D.zone) {
      const d = (Z.x - q[0]) * (Z.x - q[0]) + (Z.z - q[2]) * (Z.z - q[2]);
      if (d < dmin) { dmin = d; zona = Z; }
    }
    const t = quandoDi(q[0], q[2], zona);
    if (t > 1) continue;

    meta[m * 3] = q[0]; meta[m * 3 + 1] = q[1]; meta[m * 3 + 2] = q[2];
    // precipitano dall'alto, sulla verticale: si vedono cadere al loro posto
    nasce[m * 3] = q[0] + (caso() - 0.5) * 5;
    nasce[m * 3 + 1] = maxY + 10 + caso() * 26;
    nasce[m * 3 + 2] = q[2] + (caso() - 0.5) * 5;
    pos[m * 3] = nasce[m * 3]; pos[m * 3 + 1] = nasce[m * 3 + 1]; pos[m * 3 + 2] = nasce[m * 3 + 2];

    const c = zona ? zona.colore : MARCA[0];
    tinta[m * 3] = c[0]; tinta[m * 3 + 1] = c[1]; tinta[m * 3 + 2] = c[2];
    quando[m] = t + caso() * 0.04;
    dim[m] = 0.19 + caso() * 0.17;
    m++;
  }
  const nVeri = m;

  const geom = new T.BufferGeometry();
  geom.setAttribute('position', new T.BufferAttribute(pos.subarray(0, nVeri * 3), 3));
  geom.setAttribute('tinta', new T.BufferAttribute(tinta.subarray(0, nVeri * 3), 3));
  geom.setAttribute('dimensione', new T.BufferAttribute(dim.subarray(0, nVeri), 1));
  geom.userData = { meta, nasce, quando, n: nVeri };

  const mat = new T.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { opacita: { value: 0 }, scalaPixel: { value: 900 } },
    vertexShader: [
      'attribute float dimensione; attribute vec3 tinta;',
      'varying vec3 vC; varying float vV;',
      'uniform float scalaPixel;',
      'void main(){',
      '  vC = tinta;',
      '  vec4 mv = modelViewMatrix * vec4(position,1.0);',
      '  float d = max(0.001, -mv.z);',
      '  gl_PointSize = clamp(dimensione * scalaPixel / d, 2.0, 26.0);',
      '  vV = clamp(26.0 / d, 0.07, 1.0);',
      '  gl_Position = projectionMatrix * mv;',
      '}',
    ].join('\n'),
    fragmentShader: [
      'varying vec3 vC; varying float vV; uniform float opacita;',
      'void main(){',
      '  vec2 d = gl_PointCoord - vec2(0.5);',
      '  float r = length(d) * 2.0;',
      '  if (r > 1.0) discard;',
      '  float alone = pow(1.0 - r, 2.2);',
      '  float nucleo = pow(max(0.0, 1.0 - r * 2.6), 3.0);',
      '  gl_FragColor = vec4(vC * (1.0 - nucleo * 0.25), min(1.0, alone*0.5 + nucleo*1.1) * opacita * vV);',
      '}',
    ].join('\n'),
  });
  const polvere = new T.Points(geom, mat);
  polvere.frustumCulled = false;
  scena.add(polvere);

  // ---- LE SUPERFICI: i punti si condensano QUI ----------------------------
  // ⚠️ ORDINE DEL FILM (grammatica, punto 3): i punti precipitano, POI la
  //    superficie si accende sotto di loro, POI si posa il nome. Mai il
  //    contrario. Per questo ogni parete si accende col suo `quando` — lo
  //    stesso dei punti che le stanno sopra, un soffio dopo — e non tutte
  //    insieme con un'opacita' sola.
  // ⚠️ SU FONDO CHIARO IL BLENDING ADDITIVO NON ESISTE (trappola del 06/09):
  //    «colore + bianco = bianco». Su carta i punti e le pareti sono
  //    inchiostro, non neon. Quindi mescolanza normale, e opacita' basse.
  // ⚠️ IL VICINO PESA, IL LONTANO SFUMA — 06/09. Raffaella: *«con questa
  //    rarefazione dei puntini non si capisce niente»*, e la causa non erano i
  //    puntini: era che vicino e lontano venivano disegnati **con lo stesso
  //    peso**. A 1,65 m dentro un edificio lungo cento metri, quasi tutto quello
  //    che si inquadra e' lontano: centomila segni tutti uguali diventano
  //    rumore, e il rumore copre la stanza in cui sei.
  //    E' la stessa regola con cui un architetto disegna: **la sezione e' nera,
  //    lo sfondo e' chiaro.** Sotto i 10 m si vede tutto, oltre i 55 resta un
  //    accenno — e quell'accenno non e' un difetto, e' la profondita'.
  // ⚠️ E il `finale`: nell'ultimo tratto il film ARRIVA. Raffaella: *«la
  //    costruzione progressiva ci piace perche' fa scena, pero' il finale deve
  //    essere intelligibile»*. Le superfici si chiudono, i punti si calmano, e
  //    l'ultima immagine e' un disegno che si legge — non la stessa polvere
  //    dell'inizio.
  const ombra = (forza) => new T.ShaderMaterial({
    transparent: true, depthWrite: false, side: T.DoubleSide,
    uniforms: { u: { value: 0 }, forza: { value: forza }, finale: { value: 1 } },
    vertexShader: [
      'attribute vec3 tinta; attribute float quando;',
      'varying vec3 vC; varying float vA; varying float vD;',
      'uniform float u;',
      'void main(){',
      '  vC = tinta;',
      '  vA = clamp((u - quando) / 0.09, 0.0, 1.0);',
      '  vec4 mv = modelViewMatrix * vec4(position,1.0);',
      '  vD = -mv.z;',
      '  gl_Position = projectionMatrix * mv;',
      '}',
    ].join('\n'),
    fragmentShader: [
      'varying vec3 vC; varying float vA; varying float vD;',
      'uniform float forza; uniform float finale;',
      'void main(){ if (vA <= 0.001) discard;',
      '  float p = 1.0 - 0.80 * smoothstep(10.0, 55.0, vD);',
      '  gl_FragColor = vec4(vC, vA * forza * p * finale); }',
    ].join('\n'),
  });

  // ⚠️ PRIMA I PUNTI, POI LA SUPERFICIE — Raffaella, 06/09, guardando la prima
  //    versione: *«nel caso delle superfici come muri verticali sembra che si
  //    generino prima e poi arrivano i puntini. Nella teoria dovrebbero
  //    generarsi i solidi DOPO che arrivano i puntini, ed e' giusto che poi si
  //    vedano i profili.»* E' la riga 3 della grammatica, e l'avevo invertita:
  //    la superficie partiva due centesimi dopo il punto e finiva di accendersi
  //    mentre i punti erano ancora per aria.
  //    I punti impiegano 0,16 a posarsi: la superficie comincia dopo.
  const RITARDO_SUPERFICIE = 0.17;

  // ---- IL PAVIMENTO, come superficie misurata -----------------------------
  // ⚠️ Le celle libere della griglia SONO il piano di calpestio misurato: qui
  //    diventano una superficie, non piu' soltanto una nuvola rada. Raffaella,
  //    06/09: *«perche' non hanno il pavimento? Il pavimento dovrebbe essere una
  //    delle prime cose che l'occhio misura»* — e infatti la misura: erano
  //    3.363 m² che il film mostrava con sei punti al metro quadro, cioe'
  //    coriandoli. Di taglio, a 1,65 m, sei punti al metro quadro non sono un
  //    pavimento: sono niente, e senza pavimento non si legge nessun volume.
  let pavMesh = null;
  if (D.pavimenti && D.pavimenti.length) {
    const nq = D.pavimenti.length;
    const fp = new Float32Array(nq * 6 * 3), fc = new Float32Array(nq * 6 * 3),
          fq = new Float32Array(nq * 6);
    let iv = 0;
    for (const F of D.pavimenti) {
      let zona = null, dmin = Infinity;
      for (const Z of D.zone) {
        const d = (Z.x - F.cx) * (Z.x - F.cx) + (Z.z - F.cz) * (Z.z - F.cz);
        if (d < dmin) { dmin = d; zona = Z; }
      }
      const t = quandoDi(F.cx, F.cz, zona) + RITARDO_SUPERFICIE;
      if (t > 1) continue;
      const c = zona ? zona.colore : MARCA[0];
      const a = F.lungo / 2, b = F.largo / 2, y = F.y + 0.01;
      const S4 = [[F.cx - a, y, F.cz - b], [F.cx + a, y, F.cz - b],
                  [F.cx + a, y, F.cz + b], [F.cx - a, y, F.cz + b]];
      for (const k of [0, 1, 2, 0, 2, 3]) {
        const pnt = S4[k];
        fp[iv * 3] = pnt[0]; fp[iv * 3 + 1] = pnt[1]; fp[iv * 3 + 2] = pnt[2];
        fc[iv * 3] = c[0]; fc[iv * 3 + 1] = c[1]; fc[iv * 3 + 2] = c[2];
        fq[iv] = t; iv++;
      }
    }
    if (iv) {
      const gp = new T.BufferGeometry();
      gp.setAttribute('position', new T.BufferAttribute(fp.subarray(0, iv * 3), 3));
      gp.setAttribute('tinta', new T.BufferAttribute(fc.subarray(0, iv * 3), 3));
      gp.setAttribute('quando', new T.BufferAttribute(fq.subarray(0, iv), 1));
      pavMesh = new T.Mesh(gp, ombra(0.11));
      pavMesh.frustumCulled = false;
      scena.add(pavMesh);
    }
  }

  // ---- IL TETTO, DOVE C'E' DAVVERO ---------------------------------------
  // ⚠️ Raffaella, 06/09: *«sono tutti senza soffitto i volumi che vengono
  //    disegnati. Dobbiamo far si' che quei pochi volumi che sono chiusi
  //    abbiano un tetto. Chiudere tutti i volumi che si possono chiudere.»*
  //
  // ⚠️ E NON contraddice la regola dello spaccato, la completa: non si mette un
  //    soffitto dove non c'e', si mette dove il modello ne ha uno. La misura la
  //    danno i triangoli quasi ORIZZONTALI che stanno sopra la testa: un solaio
  //    e' orizzontale, il fianco di un aereo no.
  // 📌 Su questo modello devono essere POCHI, e non e' un difetto: la voce «il
  //    tetto che finisce» di `veritas_accessi` su questo GLB e' MUTA — 36
  //    campioni coperti su 1.544, il 2%. E' uno spaccato: il tetto quasi non
  //    c'e'. Se qui uscisse un soffitto dappertutto, vorrebbe dire che lo
  //    stiamo inventando.
  const TESTA = 2.1;              // sopra questa quota si e' sopra la testa
  const CELLA_TETTO = 1.0;
  let tettoMesh = null, tettiQuanti = 0;
  if (D.triangoli && D.triangoli.length && D.pavimenti && D.pavimenti.length) {
    const sopra = new Map();
    const chiave = (x, z) => (Math.round(x / CELLA_TETTO) + 'x' + Math.round(z / CELLA_TETTO));
    for (const TR of D.triangoli) {
      // orizzontale? si guarda la normale, e basta il segno dominante
      const ux = TR.b[0] - TR.a[0], uy = TR.b[1] - TR.a[1], uz = TR.b[2] - TR.a[2];
      const wx = TR.c[0] - TR.a[0], wy = TR.c[1] - TR.a[1], wz = TR.c[2] - TR.a[2];
      const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      const L = Math.hypot(nx, ny, nz);
      if (!L || Math.abs(ny) / L < 0.75) continue;     // non e' orizzontale
      const y = (TR.a[1] + TR.b[1] + TR.c[1]) / 3;
      const cx = (TR.a[0] + TR.b[0] + TR.c[0]) / 3, cz = (TR.a[2] + TR.b[2] + TR.c[2]) / 3;
      const k = chiave(cx, cz);
      const q = sopra.get(k);
      if (!q || y < q) sopra.set(k, y);
    }

    const tp = [], tc = [], tq = [];
    for (const F of D.pavimenti) {
      const y = sopra.get(chiave(F.cx, F.cz));
      if (y == null || y < F.y + TESTA) continue;      // niente sopra la testa
      let zona = null, dmin = Infinity;
      for (const Z of D.zone) {
        const d = (Z.x - F.cx) * (Z.x - F.cx) + (Z.z - F.cz) * (Z.z - F.cz);
        if (d < dmin) { dmin = d; zona = Z; }
      }
      const t = quandoDi(F.cx, F.cz, zona) + RITARDO_SUPERFICIE + 0.02;
      if (t > 1) continue;
      const c = zona ? zona.colore : MARCA[1];
      const a = F.lungo / 2, b = F.largo / 2;
      const S4 = [[F.cx - a, y, F.cz - b], [F.cx + a, y, F.cz - b],
                  [F.cx + a, y, F.cz + b], [F.cx - a, y, F.cz + b]];
      for (const k of [0, 1, 2, 0, 2, 3]) {
        tp.push(S4[k][0], S4[k][1], S4[k][2]); tc.push(c[0], c[1], c[2]); tq.push(t);
      }
      tettiQuanti++;
    }
    if (tp.length) {
      const gt = new T.BufferGeometry();
      gt.setAttribute('position', new T.BufferAttribute(new Float32Array(tp), 3));
      gt.setAttribute('tinta', new T.BufferAttribute(new Float32Array(tc), 3));
      gt.setAttribute('quando', new T.BufferAttribute(new Float32Array(tq), 1));
      tettoMesh = new T.Mesh(gt, ombra(0.09));
      tettoMesh.frustumCulled = false;
      scena.add(tettoMesh);
    }
  }

  let muriMesh = null, muriFilo = null;
  if (D.muri.length) {
    const q = D.muri.length;
    const vp = new Float32Array(q * 6 * 3), vc = new Float32Array(q * 6 * 3),
          vq = new Float32Array(q * 6);
    const lp = new Float32Array(q * 8 * 3), lc = new Float32Array(q * 8 * 3),
          lq = new Float32Array(q * 8);
    let iv = 0, il = 0;
    for (const M of D.muri) {
      const S4 = spigoli(M);
      let zona = null, dmin = Infinity;
      for (const Z of D.zone) {
        const d = (Z.x - M.cx) * (Z.x - M.cx) + (Z.z - M.cz) * (Z.z - M.cz);
        if (d < dmin) { dmin = d; zona = Z; }
      }
      const c = zona ? zona.colore : MARCA[1];
      const t = quandoDi(M.cx, M.cz, zona) + RITARDO_SUPERFICIE;
      const met = (k) => {
        const p = S4[k];
        vp[iv * 3] = p[0]; vp[iv * 3 + 1] = p[1]; vp[iv * 3 + 2] = p[2];
        vc[iv * 3] = c[0]; vc[iv * 3 + 1] = c[1]; vc[iv * 3 + 2] = c[2];
        vq[iv] = t; iv++;
      };
      met(0); met(1); met(2); met(0); met(2); met(3);
      for (let k = 0; k < 4; k++) {
        const a = S4[k], b = S4[(k + 1) % 4];
        for (const p of [a, b]) {
          lp[il * 3] = p[0]; lp[il * 3 + 1] = p[1]; lp[il * 3 + 2] = p[2];
          lc[il * 3] = c[0]; lc[il * 3 + 1] = c[1]; lc[il * 3 + 2] = c[2];
          lq[il] = t; il++;
        }
      }
    }

    const gm = new T.BufferGeometry();
    gm.setAttribute('position', new T.BufferAttribute(vp, 3));
    gm.setAttribute('tinta', new T.BufferAttribute(vc, 3));
    gm.setAttribute('quando', new T.BufferAttribute(vq, 1));
    muriMesh = new T.Mesh(gm, ombra(0.14));
    muriMesh.frustumCulled = false;
    scena.add(muriMesh);

    const gl = new T.BufferGeometry();
    gl.setAttribute('position', new T.BufferAttribute(lp, 3));
    gl.setAttribute('tinta', new T.BufferAttribute(lc, 3));
    gl.setAttribute('quando', new T.BufferAttribute(lq, 1));
    muriFilo = new T.LineSegments(gl, ombra(0.55));
    muriFilo.frustumCulled = false;
    scena.add(muriFilo);
  }

  // ---- GLI OGGETTI PRENDONO FORMA: i triangoli uniscono i vertici ---------
  // ⚠️ Raffaella, 06/09: *«le ali risultano come delle sezioni non collegate fra
  //    di loro, e invece dovrebbero: cosi' come i muri vengono delineati con un
  //    bordo — ci sono i puntini e poi i bordi — cosi' dovrebbe avvenire anche
  //    per gli oggetti, per dare un minimo di leggibilita'.»*
  //    I vertici da soli sono una nuvola che CONTIENE una forma; i triangoli
  //    che li uniscono **sono** la forma. E arrivano dopo i punti, non prima.
  // ⚠️ E le FIGURE UMANE si devono distinguere — Raffaella non e' riuscita a
  //    riconoscerne nessuna. Prendono l'oro del marchio: e' un colore, cioe'
  //    rappresentazione, e non afferma niente che non sia gia' stato misurato
  //    (chi sia una figura lo decide `veritas_controprova`, non il film).
  let oggMesh = null, oggFilo = null;
  if (D.triangoli && D.triangoli.length) {
    const q = D.triangoli.length;
    const tp = new Float32Array(q * 3 * 3), tc = new Float32Array(q * 3 * 3),
          tq = new Float32Array(q * 3);
    const ep = new Float32Array(q * 6 * 3), ec = new Float32Array(q * 6 * 3),
          eq = new Float32Array(q * 6);
    let iv = 0, il = 0;
    for (const TR of D.triangoli) {
      const cx = (TR.a[0] + TR.b[0] + TR.c[0]) / 3, cz = (TR.a[2] + TR.b[2] + TR.c[2]) / 3;
      let zona = null, dmin = Infinity;
      for (const Z of D.zone) {
        const d = (Z.x - cx) * (Z.x - cx) + (Z.z - cz) * (Z.z - cz);
        if (d < dmin) { dmin = d; zona = Z; }
      }
      const t = quandoDi(cx, cz, zona) + RITARDO_SUPERFICIE;
      if (t > 1) continue;
      const c = TR.uomo ? MARCA[4] : (zona ? zona.colore : MARCA[0]);
      for (const P of [TR.a, TR.b, TR.c]) {
        tp[iv * 3] = P[0]; tp[iv * 3 + 1] = P[1]; tp[iv * 3 + 2] = P[2];
        tc[iv * 3] = c[0]; tc[iv * 3 + 1] = c[1]; tc[iv * 3 + 2] = c[2];
        tq[iv] = t; iv++;
      }
      for (const [P, Q2] of [[TR.a, TR.b], [TR.b, TR.c], [TR.c, TR.a]]) {
        for (const P2 of [P, Q2]) {
          ep[il * 3] = P2[0]; ep[il * 3 + 1] = P2[1]; ep[il * 3 + 2] = P2[2];
          ec[il * 3] = c[0]; ec[il * 3 + 1] = c[1]; ec[il * 3 + 2] = c[2];
          eq[il] = t; il++;
        }
      }
    }
    if (iv) {
      const go = new T.BufferGeometry();
      go.setAttribute('position', new T.BufferAttribute(tp.subarray(0, iv * 3), 3));
      go.setAttribute('tinta', new T.BufferAttribute(tc.subarray(0, iv * 3), 3));
      go.setAttribute('quando', new T.BufferAttribute(tq.subarray(0, iv), 1));
      oggMesh = new T.Mesh(go, ombra(0.10));
      oggMesh.frustumCulled = false;
      scena.add(oggMesh);

      const ge = new T.BufferGeometry();
      ge.setAttribute('position', new T.BufferAttribute(ep.subarray(0, il * 3), 3));
      ge.setAttribute('tinta', new T.BufferAttribute(ec.subarray(0, il * 3), 3));
      ge.setAttribute('quando', new T.BufferAttribute(eq.subarray(0, il), 1));
      oggFilo = new T.LineSegments(ge, ombra(0.22));
      oggFilo.frustumCulled = false;
      scena.add(oggFilo);
    }
  }

  // I RETTANGOLI DEGLI AMBIENTI: la forma che il programma ha MISURATO.
  // ⚠️ Non e' il pavimento del GLB: e' cio' che lui crede sia quell'ambiente.
  //    Se sbaglia, si vede — ed e' esattamente la controprova che serve.
  const piani = [];
  for (const Z of D.zone) {
    const g = new T.PlaneGeometry(Math.max(1, Z.lungo), Math.max(1, Z.largo));
    const m = new T.MeshBasicMaterial({
      color: new T.Color(Z.colore[0], Z.colore[1], Z.colore[2]),
      transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false,
    });
    const p = new T.Mesh(g, m);
    p.rotation.x = -Math.PI / 2;
    p.rotation.z = -(Z.angolo || 0);
    p.position.set(Z.x, Z.y + 0.04, Z.z);
    scena.add(p);
    // il bordo, che e' quello che fa leggere la forma
    const eg = new T.EdgesGeometry(g);
    const em = new T.LineBasicMaterial({
      color: new T.Color(Z.colore[0], Z.colore[1], Z.colore[2]),
      transparent: true, opacity: 0,
    });
    const e = new T.LineSegments(eg, em);
    e.rotation.copy(p.rotation); e.position.copy(p.position);
    scena.add(e);

    // ⚠️ QUI C'ERA UNA SCATOLA ALTA 2,60 m, UGUALE PER TUTTI GLI AMBIENTI, e
    //    non c'e' piu'. Era una quota DICHIARATA, messa il 06/09 solo perche'
    //    senza volume la finestra restava vuota. Adesso il volume ce l'hanno i
    //    muri veri, e la loro altezza la misura il modello.
    //    Raffaella, 06/09: *«il modello deve raccontare la verita' del
    //    modello»*. Una scatola uguale per tutti raccontava la nostra.
    //    (La nota vecchia si cancella, non si lascia accanto alla nuova.)

    piani.push({ Z, m, em, bm: null });
  }

  return { scena, cam, geom, mat, piani, minY, muriMesh, muriFilo, pavMesh,
           oggMesh, oggFilo, tettoMesh, reticolo, tettiQuanti };
}

// ---------------------------------------------------------------------------
// LA FINESTRA
// ---------------------------------------------------------------------------
function apriFinestra() {
  const v = document.createElement('div');
  v.id = 'eidetica-live';
  v.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:2147483000', 'background:' + CARTA,
    'font-family:"Helvetica Neue",Helvetica,Arial,sans-serif', 'color:' + INCHIOSTRO,
    'opacity:0', 'transition:opacity .5s ease',
  ].join(';');
  document.body.appendChild(v);
  requestAnimationFrame(() => { v.style.opacity = '1'; });
  return v;
}

// L'apertura: il marchio con le ali che si aprono. ⚠️ Non ridisegnato: e' il
// file vero, lo stesso della schermata d'attesa.
function apertura(v) {
  const d = document.createElement('div');
  d.id = 'eidetica-live-apertura';
  d.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;'
                  + 'transition:opacity .8s ease;background:' + CARTA + ';z-index:5';
  d.innerHTML =
    '<div style="text-align:center">'
    + '<img src="./Assets/eidetica_intero.webp" alt="EIDETICA" '
    + 'style="display:block;width:min(72vw,420px);height:auto;margin:0 auto;'
    + 'animation:eidetica-ali 1.15s cubic-bezier(.2,.8,.2,1) both">'
    + '<div style="margin-top:26px;font-size:11px;letter-spacing:.24em;'
    + 'text-transform:uppercase;color:' + NEBBIA + '">' + P().sottotitolo + '</div>'
    + '</div>';
  v.appendChild(d);
  return d;
}

function plancia(v) {
  const d = document.createElement('div');
  d.style.cssText = [
    'position:absolute', 'left:50%', 'bottom:34px', 'transform:translateX(-50%)',
    'z-index:10', 'display:flex', 'align-items:center', 'gap:16px',
    'padding:12px 20px', 'border-radius:100px', 'background:rgba(255,255,255,.86)',
    'backdrop-filter:blur(18px)', '-webkit-backdrop-filter:blur(18px)',
    'box-shadow:0 1px 2px rgba(20,26,51,.06),0 12px 40px rgba(20,26,51,.1)',
    'font-size:13px', 'opacity:0', 'transition:opacity .6s ease',
  ].join(';');
  d.innerHTML =
    '<button id="el-play" style="display:flex;align-items:center;gap:9px;font:inherit;'
    + 'font-weight:500;border:0;background:none;cursor:pointer;color:inherit;padding:6px 2px">'
    + '<span style="width:26px;height:26px;border-radius:50%;display:grid;place-items:center;'
    + 'color:#fff;font-size:10px;padding-left:1px;background:linear-gradient(125deg,'
    + '#2B5CE6,#7B2FD4 45%,#E0348B 72%,#F9721F)">▶</span>'
    + '<span id="el-et">' + P().pausa + '</span></button>'
    + '<div style="width:1px;height:22px;background:#E3E5EE"></div>'
    + '<input id="el-barra" type="range" min="0" max="1000" value="0" '
    + 'style="width:200px;height:3px;-webkit-appearance:none;appearance:none;'
    + 'border-radius:3px;background:#E3E5EE;cursor:pointer">'
    + '<div style="width:1px;height:22px;background:#E3E5EE"></div>'
    // ⚠️ IL DIALOGO STA ACCANTO A «RIVEDI» — Raffaella, 07/09: «abilita accanto
    //    dove dice replay, nella stessa schermata, la chat vocale col simbolo
    //    del dialogo». Sta con i comandi del film perche' e' un comando del
    //    film: si parla di quello che si sta guardando, mentre lo si guarda.
    + '<button id="el-chat" style="display:flex;align-items:center;gap:7px;font:inherit;'
    + 'border:0;background:none;cursor:pointer;color:inherit;padding:6px 2px;white-space:nowrap">'
    + '<span style="font-size:15px;line-height:1">💬</span>' + P().dialogo + '</button>'
    + '<div style="width:1px;height:22px;background:#E3E5EE"></div>'
    + '<button id="el-suono" style="font:inherit;border:0;background:none;cursor:pointer;'
    + 'color:inherit;padding:6px 2px;white-space:nowrap">' + P().suono + ': off</button>'
    + '<div style="width:1px;height:22px;background:#E3E5EE"></div>'
    + '<button id="el-chiudi" style="font:inherit;border:0;background:none;cursor:pointer;'
    + 'color:' + NEBBIA + ';padding:6px 2px">' + P().chiudi + ' ✕</button>';
  v.appendChild(d);
  d.querySelector('#el-play').onclick = () => (S.corre ? pausa() : riparti());
  d.querySelector('#el-barra').oninput = (e) => { S.t = e.target.value / 1000; pausa(); };
  d.querySelector('#el-suono').onclick = (e) => {
    S.musica = !S.musica;
    e.target.textContent = P().suono + ': ' + (S.musica ? 'on' : 'off');
    if (S.musica && S.corre) musicaSu(); else musicaGiu();
  };
  // ⚠️ Il microfono e la voce nascono DENTRO il clic, come il motore audio:
  //    fuori dalla catena del gesto dell'utente il browser non li fa partire.
  //    E' la trappola gia' pagata il 06/09 con la musica.
  d.querySelector('#el-chat').onclick = () => apriChat(v);
  d.querySelector('#el-chiudi').onclick = () => chiudi();
  return d;
}

// ---------------------------------------------------------------------------
// LA CHAT VOCALE — Raffaella, 07/09/2026
// ---------------------------------------------------------------------------
//
// > *«Dare una voce, la voce dell'AI che dice: questo potrebbe essere una sala
// >  d'attesa. E la finestra chat contestuale a questo elemento, in cui l'utente
// >  puo' dire si', hai ragione, e' una sala d'attesa. E quindi quei metri quadri
// >  senza nome automaticamente possono essere rinominati durante la
// >  costruzione.»*
// >
// > *«Metti anche la possibilita' del dialogo direttamente vocale senza
// >  scrivere. Una finestra di dialogo semplicissima, linguaggio naturale.»*
//
// ⚠️ E' LA REGOLA 0 PUNTO 5 CHE FINALMENTE ARRIVA A QUALCUNO. «Se non sa,
//    chiede» e' scritto dal 24/08, e la domanda finiva in un riquadro dove non
//    si poteva rispondere. Qui la domanda si sente, la risposta si dice, e il
//    nome si posa sul volume mentre il film scorre.
//
// ⚠️ IL CONDIZIONALE NON E' GENTILEZZA, E' LA DIRETTIVA 10. Una voce calda
//    persuade piu' di un'etichetta: un cartellino pallido si legge come
//    incerto, una voce che afferma no. Quindi la voce dice sempre «non so che
//    spazio sia» o «potrebbe essere», mai «questa e'». E dove non sa niente
//    TACE — che e' il grigio «non misurato», parlato.
//
// ⚠️ E IL NOME CHE SI POSA E' DI RAFFAELLA, NON NOSTRO. Non e' una deduzione
//    del programma travestita da conferma: e' una persona che guarda e dice.
//    Per questo il volume si marca `origine: 'detto da chi guarda'` — la
//    fonte piu' alta che esista, e nel referto deve restare scritta.
//
// ⚠️ Tutto sta nel browser (Web Speech): niente si scarica e niente si manda a
//    nessuno. Stessa regola della musica — si usa quello che c'e'.
function voceDi(testo) {
  if (!S.voce || !testo) return;
  try {
    const s = window.speechSynthesis;
    if (!s) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(testo);
    u.lang = lingua() === 'it' ? 'it-IT' : 'en-GB';
    u.rate = 0.95; u.pitch = 1.0; u.volume = 0.9;
    s.speak(u);
  } catch (e) { /* una voce che non parte non deve fermare il film */ }
}

// L'ambiente di cui parlare: il piu' grande fra quelli che non hanno un nome.
// ⚠️ Il piu' grande e non il piu' vicino: se l'AI deve chiedere una cosa sola,
//    chiede quella che pesa di piu' nel referto.
function zonaDaChiedere() {
  const zz = S.zone || [];
  let scelta = null;
  for (const Z of zz) if (!Z.nome && (!scelta || Z.area > scelta.area)) scelta = Z;
  return scelta;
}

function apriChat(v) {
  if (S.chat) {
    S.chat.remove(); S.chat = null;
    try { if (S.ascolto) S.ascolto.stop(); } catch (e) {}
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
    return;
  }
  const d = document.createElement('div');
  // ⚠️ «Un'unica finestra di dialogo ottimizzata nelle dimensioni» — quindi una
  //    sola, stretta, e sopra la barra invece che in mezzo alla scena: il film
  //    resta la cosa che si guarda.
  d.style.cssText = [
    'position:absolute', 'right:34px', 'bottom:104px', 'z-index:11',
    'width:330px', 'max-width:calc(100vw - 68px)', 'box-sizing:border-box',
    'padding:16px 18px 14px', 'border-radius:20px',
    'background:rgba(255,255,255,.94)', 'backdrop-filter:blur(18px)',
    '-webkit-backdrop-filter:blur(18px)',
    'box-shadow:0 1px 2px rgba(20,26,51,.06),0 16px 44px rgba(20,26,51,.14)',
    'font-size:13px', 'line-height:1.55', 'color:#1b1b20',
  ].join(';');
  d.innerHTML =
    '<div id="ec-testo" style="min-height:42px;margin-bottom:12px"></div>'
    + '<div style="display:flex;align-items:center;gap:8px">'
    + '<input id="ec-in" type="text" placeholder="' + P().scrivi + '" '
    + 'style="flex:1;min-width:0;font:inherit;border:1px solid #E3E5EE;border-radius:100px;'
    + 'padding:8px 13px;outline:none;background:#fff;color:inherit">'
    + '<button id="ec-mic" title="microfono" style="width:34px;height:34px;flex:0 0 34px;'
    + 'border:0;border-radius:50%;cursor:pointer;font-size:15px;line-height:1;'
    + 'background:#F1F2F6;color:#1b1b20">🎤</button>'
    + '<button id="ec-ok" style="width:34px;height:34px;flex:0 0 34px;border:0;border-radius:50%;'
    + 'cursor:pointer;color:#fff;font-size:12px;background:linear-gradient(125deg,'
    + '#2B5CE6,#7B2FD4 45%,#E0348B 72%,#F9721F)">➤</button></div>';
  v.appendChild(d);
  S.chat = d;

  const testo = d.querySelector('#ec-testo');
  const input = d.querySelector('#ec-in');
  const dico = (t) => { testo.textContent = t; voceDi(t); };

  const chiedi = () => {
    const Z = zonaDaChiedere();
    S.chiestaZona = Z;
    if (!Z) { dico(P().tutteNominate); return; }
    dico(P().chiedo.replace('$A', Math.round(Z.area)));
  };
  chiedi();

  const rispondi = () => {
    const t = (input.value || '').trim();
    if (!t) return;
    input.value = '';
    const Z = S.chiestaZona;
    if (Z) {
      // ⚠️ Il nome si posa SUBITO: il cartellino lo legge a ogni fotogramma
      //    (`Z.nome || senza nome`), quindi si vede mentre il film scorre —
      //    che e' esattamente «rinominati durante la costruzione».
      Z.nome = t;
      Z.origine = 'detto da chi guarda';
      console.log('[EIDETICA live] ' + Math.round(Z.area) + ' m² rinominati a voce: «'
        + t + '». Origine: detto da chi guarda — la fonte piu\' alta che esista,'
        + ' e nel referto resta scritta.');
      dico(P().grazie.replace('$N', t));
      setTimeout(chiedi, 2200);
    } else {
      dico(P().tutteNominate);
    }
  };
  d.querySelector('#ec-ok').onclick = rispondi;
  input.onkeydown = (e) => { if (e.key === 'Enter') rispondi(); };

  // ── IL MICROFONO
  const mic = d.querySelector('#ec-mic');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    mic.disabled = true; mic.style.opacity = '.4'; mic.title = P().nonSento;
  } else {
    mic.onclick = () => {
      if (S.ascolto) { try { S.ascolto.stop(); } catch (e) {} S.ascolto = null; return; }
      // ⚠️ Mentre si ascolta, la voce TACE: se no il microfono si sente parlare
      //    da solo e trascrive quello che l'AI ha appena detto.
      try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
      const r = new SR();
      r.lang = lingua() === 'it' ? 'it-IT' : 'en-GB';
      r.interimResults = true; r.continuous = false;
      r.onresult = (ev) => {
        let t = '';
        for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript;
        input.value = t.trim();
      };
      const spento = () => {
        S.ascolto = null;
        mic.style.background = '#F1F2F6'; mic.textContent = '🎤';
        input.placeholder = P().scrivi;
        // ⚠️ Non si invia da soli: il parlato si sbaglia, e un nome messo per
        //    sbaglio su un volume e' peggio di nessun nome. Si rilegge e si
        //    conferma — e' la stessa regola dei nomi inventati.
      };
      r.onend = spento; r.onerror = spento;
      try {
        r.start();
        S.ascolto = r;
        mic.style.background = '#E0348B'; mic.textContent = '●';
        input.placeholder = P().ascolto;
      } catch (e) { spento(); }
    };
  }
  input.focus();
  return d;
}

function pannello(v) {
  const d = document.createElement('div');
  d.style.cssText = 'position:absolute;top:34px;right:34px;z-index:10;text-align:right;'
    + 'pointer-events:none;font-size:11.5px;line-height:1.8;color:' + NEBBIA
    + ';font-variant-numeric:tabular-nums;opacity:0;transition:opacity .6s ease';
  d.innerHTML = '<b id="el-fase" style="display:block;font-size:13px;font-weight:500;color:'
    + INCHIOSTRO + '"></b><span id="el-conta"></span><br><span id="el-occhio"></span>';
  v.appendChild(d);
  return d;
}

// ---------------------------------------------------------------------------
// LA MUSICA. Raffaella: «e la musica mettine una qualsiasi adesso». Un pad di
// quattro voci filtrate con un lento respiro: fa da aria, e l'aria non afferma
// niente sullo spazio — quindi non puo' mentire.
// ---------------------------------------------------------------------------
// ⚠️ LA MUSICA C'ERA E NON SUONAVA — 06/09. Raffaella: *«abbiamo musica on, ma
//    non abbiamo musica»*. Due cause, e la prima e' quella che conta:
//
//    1. **la sala si accendeva troppo tardi.** Il motore audio nasceva dentro
//       un `setTimeout` due secondi dopo il clic: fuori dalla catena del gesto
//       dell'utente il browser lo crea SOSPESO e non lo fa ripartire da solo.
//       Ora nasce dentro il clic che apre la finestra, che e' un gesto vero;
//    2. **era un ronzio, non una musica.** Un accordo fermo a volume 0,075 e'
//       un frigorifero. Adesso c'e' un organo che respira, il basso sotto e un
//       rintocco lontano ogni tanto.
//
// ⚠️ E' TUTTA SINTETIZZATA, nota per nota, e non e' un ripiego tecnico:
//    Raffaella ha chiesto *«una musica di fantascienza»* dicendo lei stessa che
//    quella dei film non si puo' usare. Un pezzo protetto dentro un prodotto
//    che si vende e' lo stesso problema legale di Neufert per le tabelle.
//    Quindi si SUONA, non si prende. RE minore a quinta vuota — nessuna terza,
//    respiro lento: e' il registro che si sta cercando.
// ⚠️ «SEMBRAVA IL ROMBO DI UN AEREO» — Raffaella, 07/09/2026: *«la musica
//    sembrava un rombo di un aereo. Vorrei fosse un po' piu' ispirata, piu'
//    evocativa»*. E non era un'impressione: era esattamente quello che il
//    motore stava suonando, e si vede dai numeri della versione precedente.
//
//    1. **le fondamentali stavano a 58 e 73 Hz**, sotto un passa-basso a
//       620 Hz. Un suono continuo con l'energia fra 50 e 600 Hz e' lo spettro
//       di un turbofan in crociera. Non «somigliava» a un aereo: aveva la
//       stessa firma;
//    2. **due voci a 110,00 e 110,35 Hz** battevano a 0,35 Hz — cioe' un
//       ondeggiamento ogni tre secondi. E' il battimento di due motori fuori
//       sincrono, il rumore che si sente in cabina;
//    3. **niente cominciava mai.** Tutto era tenuto: nessuna nota attaccava,
//       nessuna finiva. Un suono che non comincia non e' musica, e' un motore
//       acceso;
//    4. **non c'era spazio.** Senza riverbero un accordo sta attaccato
//       all'orecchio, e li' un pad diventa un ronzio.
//
//    La cura e' musicale, non tecnica, ed e' tutta e quattro insieme:
//    · **si alza il registro** — niente sotto i 116 Hz, il peso fra 200 e
//      800 Hz, dove l'orecchio sente un'ALTEZZA e non una vibrazione;
//    · **il battimento stretto diventa uno scintillio** — non due note quasi
//      uguali che pulsano, ma cinque voci scordate di pochi centesimi che si
//      muovono ognuna col suo respiro;
//    · **c'e' una MELODIA** — poche note, che cominciano e finiscono, con salti
//      veri. E' la differenza fra un tappeto e una frase;
//    · **c'e' una sala** — un riverbero lungo, sintetizzato qui dentro. Lo
//      spazio e' meta' dell'emozione, e questo film parla di spazio.
//
// ⚠️ E RESTA TUTTA SINTETIZZATA, nota per nota. Raffaella ha chiesto *«una
//    musica di fantascienza»* dicendo lei stessa che quella dei film non si
//    puo' usare: un pezzo protetto dentro un prodotto che si vende e' lo stesso
//    problema legale di Neufert per le tabelle. **Si suona, non si prende.**

// La sala. Rumore che decade: e' il modo piu' onesto di fabbricare un
// riverbero senza scaricare la registrazione di una cattedrale — che sarebbe
// un file di qualcun altro dentro un prodotto che si vende.
function salaSintetica(ac, secondi) {
  const n = Math.floor(ac.sampleRate * secondi);
  const buf = ac.createBuffer(2, n, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) {
      const x = i / n;
      // la coda scende come in una sala vera, e i primi 40 ms sono piu' radi:
      // sono le riflessioni delle pareti, non ancora il riverbero
      const primo = i < ac.sampleRate * 0.04 ? 0.35 : 1;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - x, 2.6) * primo;
    }
  }
  return buf;
}

function creaMusica() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ac = new AC();

  const gn = ac.createGain(); gn.gain.value = 0;
  gn.connect(ac.destination);

  // ── LA SALA
  // ⚠️ E NON DEVE ESSERE UNA CRIPTA. Raffaella, 07/09: *«la musica è terribile,
  //    sembra un film horror»*. Una coda di cinque secondi e' una cattedrale
  //    vuota, ed e' meta' della ricetta del thriller: il suono torna da lontano
  //    quando non te lo aspetti piu'. Tre secondi sono una sala grande e
  //    accogliente — lo spazio si sente lo stesso, la minaccia no.
  const sala = ac.createConvolver();
  try { sala.buffer = salaSintetica(ac, 2.9); } catch (e) {}
  const salaG = ac.createGain(); salaG.gain.value = 0.6;
  sala.connect(salaG); salaG.connect(gn);
  const versoLaSala = (nodo, quanto) => {
    const g = ac.createGain(); g.gain.value = quanto;
    nodo.connect(g); g.connect(sala);
  };

  // ── IL TAPPETO, e non deve rombare
  // ⚠️ E PIU' APERTO DI PRIMA (07/09). Un pad scuro che si apre e si chiude
  //    piano e' il respiro di qualcosa nel buio: e' suspense, non spazio.
  //    Piu' luce e meno movimento, e diventa aria.
  const flt = ac.createBiquadFilter();
  flt.type = 'lowpass'; flt.frequency.value = 1500; flt.Q.value = 0.6;
  // ⚠️ IL PASSA-ALTO E' LA RIGA CHE TOGLIE L'AEREO. Sotto i 110 Hz non passa
  //    piu' niente: e' li' che vive il rombo, ed e' li' che non serve nessuna
  //    delle note che stiamo suonando.
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 110; hp.Q.value = 0.6;
  flt.connect(hp); hp.connect(gn);
  versoLaSala(hp, 0.5);

  const respiro = ac.createGain(); respiro.gain.value = 0.66;
  respiro.connect(flt);
  const lfoR = ac.createOscillator(); lfoR.frequency.value = 0.062;
  const lfoRg = ac.createGain(); lfoRg.gain.value = 0.22;
  lfoR.connect(lfoRg); lfoRg.connect(respiro.gain); lfoR.start();

  // ⚠️ MAGGIORE, NON MINORE — ed e' l'altra meta' dell'horror, tolta il 07/09.
  //
  //    La versione di prima era in RE MINORE senza terza, con campane e cinque
  //    secondi di coda: e' la ricetta letterale del thriller. «Senza terza non
  //    dice ne' allegro ne' triste» e' vero da fermo, ma appena la melodia
  //    entra su una pentatonica MINORE la terza la mette lei — e quello che
  //    resta e' inquietudine.
  //
  //    Meraviglia e minaccia usano gli stessi ingredienti e cambiano di segno
  //    per due dettagli soli: **il modo** e **il verso della linea**. Qui:
  //    FA maggiore con la nona — fa, do, sol, la — che e' un accordo aperto e
  //    luminoso, e una cadenza che RITORNA a casa invece di restare sospesa.
  //    La minore in fondo e' l'unica ombra, e serve: senza nessuna ombra
  //    diventa zuccheroso, che e' l'altro modo di sbagliare.
  const ACCORDI = [
    [174.61, 261.63, 349.23, 392.00, 523.25],   // fa9   (fa do fa sol do)
    [130.81, 196.00, 261.63, 293.66, 392.00],   // do9   (do sol do re sol)
    [196.00, 293.66, 392.00, 440.00, 587.33],   // sol9  (sol re sol la re)
    [220.00, 329.63, 440.00, 493.88, 659.26],   // la m9 (la mi la si mi)
  ];
  const TIMBRI = ['sine', 'sine', 'triangle', 'sine', 'triangle'];
  const VOLUMI = [0.30, 0.24, 0.13, 0.16, 0.07];
  // ⚠️ SCORDATE DI POCHI CENTESIMI, NON DI UN TERZO DI HERTZ. Cinque valori
  //    diversi e nessuno multiplo dell'altro: quello che ne esce e' uno
  //    scintillio, non una pulsazione. Il battimento stretto era l'aereo.
  const SCARTI = [-6, 4, -3, 7, -9];
  const osc = [];
  for (let i = 0; i < TIMBRI.length; i++) {
    const o = ac.createOscillator(); o.type = TIMBRI[i];
    o.frequency.value = ACCORDI[0][i];
    o.detune.value = SCARTI[i];
    const g = ac.createGain(); g.gain.value = VOLUMI[i];
    o.connect(g); g.connect(respiro); o.start();
    // ogni voce respira col suo passo: cinque respiri diversi non fanno
    // un'onda sola
    const l = ac.createOscillator(); l.frequency.value = 0.03 + i * 0.017;
    const lg = ac.createGain(); lg.gain.value = 3.5;
    l.connect(lg); lg.connect(o.detune); l.start();
    osc.push(o);
  }
  let accordo = 0;
  const cambia = () => {
    if (!S.aperto || !S.audio) return;
    accordo = (accordo + 1) % ACCORDI.length;
    const t = ac.currentTime;
    for (let i = 0; i < osc.length; i++) {
      const f = osc[i].frequency;
      f.cancelScheduledValues(t);
      f.setValueAtTime(f.value, t);
      f.exponentialRampToValueAtTime(ACCORDI[accordo][i], t + 7);
    }
    S.accordo = setTimeout(cambia, 16000);
  };
  S.accordo = setTimeout(cambia, 13000);

  // il filtro che si apre e si chiude piano: lo spazio che si allarga
  const lfoF = ac.createOscillator(); lfoF.frequency.value = 0.045;
  const lfoFg = ac.createGain(); lfoFg.gain.value = 240;
  lfoF.connect(lfoFg); lfoFg.connect(flt.frequency); lfoF.start();

  // ── LA FRASE, ed e' la differenza fra un tappeto e una musica.
  //
  // ⚠️ Prima c'era un «rintocco» che pescava una nota dell'accordo e la
  //    ribatteva: sempre la stessa altezza, sempre lo stesso gesto. Una nota
  //    ripetuta e' un segnale, non una frase. Qui le note sono scelte da una
  //    scala di cinque suoni — re, fa, sol, la, do, la pentatonica minore, che
  //    e' consonante con tutti e quattro gli accordi — e ogni tanto **salta**
  //    invece di andare per gradi. Il salto e' quello che si ricorda.
  //
  // ⚠️ E NON E' PIU' UNA CAMPANA — 07/09. La campana era il terzo pezzo
  //    dell'horror, e stava in un numero: il parziale a **2,76 volte** la
  //    fondamentale. Non e' un rapporto qualsiasi, e' il primo parziale
  //    INARMONICO delle campane vere — cioe' una nota che non sta nella scala
  //    di nessuno. E' quello che fa «rintocco funebre» invece di «nota».
  //    Adesso i parziali sono **armonici** (1, 2, 3, 4 volte): ottava, quinta
  //    sopra, doppia ottava. Tutti dentro l'accordo, nessuno contro. Il timbro
  //    che ne esce e' vetro, non bronzo.
  //
  // ⚠️ E LA SCALA E' MAGGIORE. Prima era pentatonica MINORE su re, ed era lei a
  //    mettere la terza che il pad aveva tolto: da li' l'inquietudine. Questa e'
  //    la pentatonica maggiore di fa — fa sol la do re — che sta bene su tutti e
  //    quattro gli accordi e non contiene nessun intervallo di tensione.
  //
  // ⚠️ E LA LINEA SALE PIU' DI QUANTO SCENDE. Meraviglia e minaccia hanno gli
  //    stessi suoni e verso opposto: una linea che scende e' un peso che cade,
  //    una che sale e' qualcosa che si apre. Qui il verso e' sbilanciato in su.
  const SCALA = [349.23, 392.00, 440.00, 523.25, 587.33, 698.46, 783.99];
  //             fa      sol     la      do      re      fa      sol
  let grado = 1, versoSu = true;
  const frase = () => {
    if (!S.aperto || !S.audio) return;
    const t = ac.currentTime;
    // per gradi quasi sempre, un salto ogni tanto: e' cosi' che una melodia
    // respira invece di camminare
    const passo = Math.random() < 0.3 ? 2 : 1;
    grado += versoSu ? passo : -passo;
    if (grado >= SCALA.length) { grado = SCALA.length - 2; versoSu = false; }
    if (grado < 0) { grado = 1; versoSu = true; }
    // ⚠️ 0,18 in su contro 0,38 in giu': la linea torna a salire prima di
    //    quanto scenda. Non e' simmetria, ed e' voluto.
    if (Math.random() < (versoSu ? 0.18 : 0.38)) versoSu = !versoSu;
    const f = SCALA[grado];

    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    // attacco morbido, non percussivo: 0,25 s invece di 0,05. Un attacco
    // secco e' un colpo, e un colpo mette in allarme.
    g.gain.exponentialRampToValueAtTime(0.085, t + 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 5.5);
    g.connect(gn); versoLaSala(g, 0.7);

    for (const [rap, vol] of [[1, 1], [2, 0.30], [3, 0.12], [4, 0.05]]) {
      const o = ac.createOscillator(); o.type = 'sine';
      o.frequency.value = f * rap;
      const gv = ac.createGain(); gv.gain.value = vol;
      o.connect(gv); gv.connect(g);
      o.start(t); o.stop(t + 6);
    }
    // il respiro fra una nota e l'altra non e' regolare: una frase non e' un
    // metronomo
    S.rintocco = setTimeout(frase, 2800 + Math.random() * 3600);
  };
  S.rintocco = setTimeout(frase, 2000);

  return { ac, gn };
}
function musicaSu() {
  if (!S.musica) return;
  if (!S.audio) S.audio = creaMusica();
  if (!S.audio) return;
  if (S.audio.ac.state === 'suspended') S.audio.ac.resume();
  S.audio.gn.gain.cancelScheduledValues(S.audio.ac.currentTime);
  S.audio.gn.gain.linearRampToValueAtTime(0.62, S.audio.ac.currentTime + 3.5);
}
function musicaGiu() {
  if (!S.audio) return;
  S.audio.gn.gain.cancelScheduledValues(S.audio.ac.currentTime);
  S.audio.gn.gain.linearRampToValueAtTime(0, S.audio.ac.currentTime + 1.2);
}

// ---------------------------------------------------------------------------
const dolce = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3));

function giro(ms) {
  if (!S.aperto) return;
  if (S.corre) {
    S.t += (S.ultimo ? ms - S.ultimo : 16) / (S.durata || FILM_MS);
    if (S.t >= 1) { S.t = 1; pausa(); }
  }
  S.ultimo = ms;
  const u = S.t, T = window.THREE;

  const w = S.tela.clientWidth, h = S.tela.clientHeight;
  if (S.tela.width !== w || S.tela.height !== h) {
    S.ren.setSize(w, h, false);
    S.cam.aspect = w / h; S.cam.updateProjectionMatrix();
  }
  S.mat.uniforms.scalaPixel.value = h / (2 * Math.tan(LENTE * Math.PI / 360));

  // i punti precipitano al loro posto MISURATO
  const g = S.geom, { meta, nasce, quando, n } = g.userData;
  const pos = g.attributes.position.array;
  for (let i = 0; i < n; i++) {
    const s = dolce((u - quando[i]) / 0.16);
    if (s >= 1) {
      pos[i * 3] = meta[i * 3]; pos[i * 3 + 1] = meta[i * 3 + 1]; pos[i * 3 + 2] = meta[i * 3 + 2];
    } else {
      pos[i * 3] = nasce[i * 3] + (meta[i * 3] - nasce[i * 3]) * s;
      pos[i * 3 + 1] = nasce[i * 3 + 1] + (meta[i * 3 + 1] - nasce[i * 3 + 1]) * s;
      pos[i * 3 + 2] = nasce[i * 3 + 2] + (meta[i * 3 + 2] - nasce[i * 3 + 2]) * s;
    }
  }
  g.attributes.position.needsUpdate = true;
  // ⚠️ IL FINALE ARRIVA — Raffaella, 06/09: *«la costruzione progressiva ci
  //    piace perche' fa scena, pero' il finale deve essere intelligibile»*.
  //    Nell'ultimo quinto le superfici si chiudono e la polvere si calma: la
  //    scena passa da POLVERE CHE SI POSA a DISEGNO CHE SI LEGGE. Non e' un
  //    effetto: e' la fase «spazio ricomposto» che finalmente ricompone.
  const chiusura = dolce((u - 0.78) / 0.20);
  S.mat.uniforms.opacita.value = (0.35 + 0.6 * dolce(u / 0.08)) * (1 - 0.45 * chiusura);
  const forte = 1 + 1.45 * chiusura;
  for (const M of [S.muriMesh, S.muriFilo, S.pavMesh, S.oggMesh, S.oggFilo, S.tettoMesh]) {
    if (M) M.material.uniforms.finale.value = forte;
  }

  // gli ambienti ricostruiti compaiono quando il cammino ci arriva
  let riconosciuti = 0;
  for (const p of S.piani) {
    const a = dolce((u - p.Z.quando - 0.10) / 0.10);
    if (a > 0.01) riconosciuti++;
    const cred = 0.45 + 0.55 * Math.min(1, p.Z.fiducia);
    p.m.opacity = a * 0.10 * cred;
    p.em.opacity = a * 0.55 * cred;
    if (p.bm) p.bm.opacity = a * 0.34 * cred;
  }

  // le superfici si accendono col loro `quando`, una per una
  if (S.muriMesh) S.muriMesh.material.uniforms.u.value = u;
  if (S.muriFilo) S.muriFilo.material.uniforms.u.value = u;
  if (S.pavMesh) S.pavMesh.material.uniforms.u.value = u;
  if (S.oggMesh) S.oggMesh.material.uniforms.u.value = u;
  if (S.oggFilo) S.oggFilo.material.uniforms.u.value = u;
  if (S.tettoMesh) S.tettoMesh.material.uniforms.u.value = u;
  // il reticolo si spegne man mano che lo spazio misurato prende il suo posto
  if (S.reticolo) S.reticolo.material.uniforms.spegni.value = dolce((u - 0.10) / 0.75) * 0.85;

  // ⚠️ L'OCCHIO STA ALL'ALTEZZA DELL'UOMO, E CI RESTA — Raffaella, 06/09:
  //    *«voglio l'occhio dell'osservatore all'altezza dell'uomo. Non alzare la
  //    telecamera.»*
  //
  //    ⚠️ QUESTA NOTA CANCELLA quella scritta poche ore prima («si orbita, poi
  //       si scende»), e vale la pena dire perche' era stata scritta: era vera
  //       finche' il programma ricostruiva soltanto PAVIMENTO. Un tappeto
  //       piatto, visto da 1,65 m, si vede di taglio — cioe' non si vede — e
  //       alzarsi era l'unico modo di vedere qualcosa. Ma alzandosi si otteneva
  //       «un'altra vista dall'alto, cioe' proprio quella che la finestra non
  //       deve essere». La cura non era la telecamera, erano le SUPERFICI, e
  //       l'aveva detto Raffaella: *«se i punti arrivano dal nulla e si
  //       condensano, vanno a formare la mesh? Cosi' puoi stare all'altezza
  //       dell'uomo»*. Adesso i muri ci sono, a 1,65 m c'e' lo spazio, e non si
  //       sale piu'. La nota vecchia si cancella: non si lascia accanto.
  const occhio = attore().occhio;
  const via = S.via;
  if (via && via.length > 1) {
    const k = Math.min(1, Math.max(0, u));
    const i = Math.min(via.length - 2, Math.floor(k * (via.length - 1)));
    const f = k * (via.length - 1) - i;
    const a = via[i], b = via[i + 1];
    const px = a[0] + (b[0] - a[0]) * f, py = a[1] + (b[1] - a[1]) * f,
          pz = a[2] + (b[2] - a[2]) * f;
    S.cam.position.set(px, py + occhio, pz);

    // ⚠️ SI GUARDA UN PUNTO CHE STA DAVVERO PIU' AVANTI, e non e' pignoleria:
    //    misurato il 06/09, con un agente fermo il punto «otto passi avanti»
    //    coincideva con la posizione della telecamera, `lookAt` non aveva una
    //    direzione da cui ricavare l'orientamento, e **tutta la scena spariva**
    //    — schermo bianco, con tutto il resto funzionante. Un difetto che si
    //    presenta come «non funziona niente» e invece e' una riga sola.
    //    Quindi si cerca in avanti finche' non si trova un punto lontano
    //    almeno un passo e mezzo; se non c'e', si tiene l'ultima direzione
    //    buona invece di annullare l'inquadratura.
    let avanti = null;
    for (let j = i + 1; j < via.length; j++) {
      if (Math.hypot(via[j][0] - px, via[j][2] - pz) >= 1.5) { avanti = via[j]; break; }
    }
    if (avanti) {
      S.sguardo = [avanti[0] - px, avanti[2] - pz];
    }
    const d = S.sguardo && Math.hypot(S.sguardo[0], S.sguardo[1]) > 1e-4
      ? S.sguardo : [0, 1];
    const L = Math.hypot(d[0], d[1]);
    // si guarda DRITTO: mirare piu' in basso inclina la camera, e una camera
    // inclinata in giu' si legge come «sto in alto» — Raffaella l'ha sentito
    // prima che venisse misurato.
    S.cam.lookAt(px + (d[0] / L) * 20, py + occhio, pz + (d[1] / L) * 20);
  } else {
    // Nessun cammino, nemmeno dedotto: si sta fermi sulla soglia e si gira su
    // se' stessi. Sempre a 1,65 m — non si sale nemmeno qui.
    const p = S.porta, y = S.quotaOcchio;
    S.cam.position.set(p[0], y + occhio, p[1]);
    const ang = S.angolo0 + u * 1.9;
    S.cam.lookAt(p[0] + Math.sin(ang) * 20, y + occhio, p[1] + Math.cos(ang) * 20);
  }

  S.ren.render(S.scena, S.cam);
  S.fotogrammi++;
  disegnaNomi(u);

  const W = P();
  const fase = u < 0.05 ? 0 : u < 0.35 ? 1 : u < 0.6 ? 2 : u < 0.85 ? 3 : 4;
  const ef = S.pannello.querySelector('#el-fase');
  const ec = S.pannello.querySelector('#el-conta');
  const eo = S.pannello.querySelector('#el-occhio');
  if (ef) ef.textContent = W.fasi[fase];
  if (ec) ec.textContent = riconosciuti + ' ' + (riconosciuti === 1 ? W.uno : W.molti);
  if (eo) eo.textContent = W.occhio + ' ' + occhio.toFixed(2).replace('.', ',') + ' m';
  if (S.corre) { const b = S.plancia.querySelector('#el-barra'); if (b) b.value = Math.round(u * 1000); }

  S.raf = requestAnimationFrame(giro);
}

// I cartellini: pallino, filo, pastiglia — come nel prototipo di Raffaella.
function disegnaNomi(u) {
  const c = S.sopra, T = window.THREE;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = S.tela.clientWidth, h = S.tela.clientHeight;
  if (c.width !== Math.round(w * dpr)) {
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    c.style.width = w + 'px'; c.style.height = h + 'px';
  }
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const V = new T.Vector3();
  const presi = [];
  for (const Z of S.zone) {
    const a = dolce((u - Z.quando - 0.14) / 0.08);
    if (a <= 0.02) continue;
    V.set(Z.x, Z.y + 1.5, Z.z).project(S.cam);
    if (V.z > 1) continue;
    let x = (V.x * 0.5 + 0.5) * w, y = (-V.y * 0.5 + 0.5) * h;
    if (x < -200 || x > w + 200) continue;
    let salto = 0;
    while (presi.some((q) => Math.abs(q.x - x) < 160 && Math.abs(q.y - (y - salto)) < 30) && salto < 220) salto += 32;
    const base = y; y -= salto;
    presi.push({ x, y });
    const col = Z.colore.map((v) => Math.round(v * 255));
    const rgba = (al) => 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + al + ')';
    // ⚠️ la fiducia entra qui, e solo qui: un nome incerto si vede meno
    const al = a * (0.45 + 0.55 * Math.min(1, Z.fiducia));
    const testo = Z.nome || (P().senzaNome + ' · ' + Math.round(Z.area) + ' m²');
    g.font = '500 12.5px "Helvetica Neue",Helvetica,Arial,sans-serif';
    const lw = g.measureText(testo).width;
    const py = y - 30 * a;
    g.strokeStyle = rgba(0.3 * al); g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, base); g.lineTo(x, py + 11); g.stroke();
    g.beginPath(); g.fillStyle = rgba(0.85 * al); g.arc(x, base, 2.6, 0, 6.283); g.fill();
    g.beginPath();
    if (g.roundRect) g.roundRect(x - lw / 2 - 11, py - 11.5, lw + 22, 23, 11.5);
    else g.rect(x - lw / 2 - 11, py - 11.5, lw + 22, 23);
    g.fillStyle = 'rgba(255,255,255,' + (0.93 * al) + ')'; g.fill();
    g.strokeStyle = rgba(0.3 * al); g.stroke();
    g.fillStyle = 'rgba(20,26,51,' + al + ')';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(testo, x, py + 0.5);
  }
}

// ---------------------------------------------------------------------------
export function apri() {
  if (S.aperto) return true;
  const T = window.THREE;
  if (!T) { console.warn('[EIDETICA live] three non è pronto'); return false; }
  const D = dati();
  if (!D) { alert(P().niente); return false; }

  // ⚠️ IL MOTORE AUDIO NASCE QUI, DENTRO IL CLIC. Fuori dalla catena del gesto
  //    dell'utente il browser lo crea sospeso e non riparte piu': era questo il
  //    motivo per cui «Musica: on» non suonava niente.
  if (S.musica && !S.audio) { try { S.audio = creaMusica(); } catch (e) { S.audio = null; } }

  S.velo = apriFinestra();
  const ap = apertura(S.velo);

  const tela = document.createElement('canvas');
  tela.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  tela.style.setProperty('background', 'transparent', 'important');
  S.velo.appendChild(tela);
  const sopra = document.createElement('canvas');
  sopra.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:6';
  sopra.style.setProperty('background', 'transparent', 'important');
  S.velo.appendChild(sopra);
  S.tela = tela; S.sopra = sopra;

  const ren = new T.WebGLRenderer({ canvas: tela, antialias: true, alpha: true });
  ren.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  ren.setClearColor(0x000000, 0);

  const c = costruisci(D);
  S.ren = ren; S.scena = c.scena; S.cam = c.cam;
  S.geom = c.geom; S.mat = c.mat; S.piani = c.piani;
  S.muriMesh = c.muriMesh; S.muriFilo = c.muriFilo; S.pavMesh = c.pavMesh;
  S.oggMesh = c.oggMesh; S.oggFilo = c.oggFilo;
  S.tettoMesh = c.tettoMesh; S.reticolo = c.reticolo;
  S.zone = D.zone; S.via = D.via; S.porta = D.porta;

  // ⚠️ Le misure d'inquadratura si prendono dai PUNTI MISURATI, non
  //    dall'ingombro del GLB: qui dentro il modello dell'utente non esiste, e
  //    non deve entrare nemmeno per decidere dove mettere la telecamera.
  let ax = Infinity, bx = -Infinity, az = Infinity, bz = -Infinity, ay = Infinity;
  for (const q of D.punti) {
    if (q[0] < ax) ax = q[0]; if (q[0] > bx) bx = q[0];
    if (q[2] < az) az = q[2]; if (q[2] > bz) bz = q[2];
    if (q[1] < ay) ay = q[1];
  }
  S.centro = [(ax + bx) / 2, ay, (az + bz) / 2];
  S.quotaOcchio = ay;   // il piano di calpestio misurato piu' basso
  S.angolo0 = Math.atan2(S.centro[0] - D.porta[0], S.centro[2] - D.porta[1]);

  S.plancia = plancia(S.velo);
  S.pannello = pannello(S.velo);
  const metri = (D.via && D.via.metri) || 0;
  S.durata = FILM_MS;
  if (metri > 1) {
    const giusta = (metri / PASSO_UMANO) * 1000;
    S.durata = Math.max(FILM_MIN_MS, Math.min(FILM_MAX_MS, giusta));
    if (giusta > FILM_MAX_MS) {
      console.warn('[EIDETICA live] a passo d’uomo questo percorso durerebbe '
        + Math.round(giusta / 1000) + ' s: il film ne dura ' + Math.round(S.durata / 1000)
        + ', quindi si cammina ' + (giusta / S.durata).toFixed(1).replace('.', ',')
        + ' volte più veloce del vero. È una scelta di regia, non una misura.');
    }
  }

  S.aperto = true; S.t = 0; S.corre = false; S.ultimo = 0; S.fotogrammi = 0;

  // ⚠️ L'OCCHIO RESTA FINCHE' LA LETTURA NON E' PRONTA — Raffaella, 06/09:
  //    *«avevo suggerito di mettere la schermata nel frattempo che partono
  //    tutti i sistemi per la lettura, l'occhio con l'animazione, se non
  //    vogliamo tenere questo schermo bianco indefinitamente»*.
  //    Prima l'apertura durava un tempo FISSO (2,2 s) e poi si toglieva
  //    comunque: se la scena non aveva ancora niente da mostrare, dietro c'era
  //    il bianco. Adesso l'apertura si toglie quando **lo stato vero** dice che
  //    c'e' qualcosa da vedere — la scena montata e almeno un fotogramma
  //    dipinto — e mai prima del tempo delle ali.
  //    ⚠️ E non aspetta all'infinito: dopo il tetto si va avanti lo stesso e
  //       **lo si dichiara nel log**, invece di lasciare l'utente davanti a un
  //       marchio che gira per sempre.
  const ATTESA_MAX_MS = 12000;
  const pronto = () => !!(S.scena && S.ren && S.fotogrammi > 0 && S.geom);
  const t0 = Date.now();
  const via = () => {
    ap.style.opacity = '0';
    setTimeout(() => ap.remove(), 800);
    S.plancia.style.opacity = '1';
    S.pannello.style.opacity = '1';
    S.corre = true; S.ultimo = 0;
    musicaSu();
  };
  const aspetta = () => {
    if (!S.aperto) return;
    const passati = Date.now() - t0;
    if (passati < APERTURA_MS) { setTimeout(aspetta, 120); return; }
    if (pronto()) { via(); return; }
    if (passati > ATTESA_MAX_MS) {
      console.warn('[EIDETICA live] la scena non era pronta dopo '
        + Math.round(passati / 1000) + ' s: il film parte lo stesso, e questo è un difetto da guardare.');
      via(); return;
    }
    setTimeout(aspetta, 120);
  };
  setTimeout(aspetta, 120);

  S.esc = (e) => { if (e.key === 'Escape') chiudi(); };
  addEventListener('keydown', S.esc);
  S.raf = requestAnimationFrame(giro);
  // ⚠️ IL LOG DICE I NUMERI, COMPRESI QUELLI CHE NON TORNANO. In particolare
  //    dice quanti confini libero/occupato NON sono diventati un muro perche'
  //    sul modello li' non sta in piedi niente: su uno spaccato devono essere
  //    tanti, ed e' la regola di Raffaella che funziona, non un guasto.
  const E = D.muriEsito;
  console.log('[EIDETICA live] ' + D.punti.length.toLocaleString() + ' ' + P().punti
    + ', ' + D.zone.length + ' ambienti ricostruiti'
    + (D.via ? (D.viaVera ? ', cammino vero di ' : ', cammino DEDOTTO dagli ambienti, ')
        + D.via.length + ' passi'
        + (D.viaVera && D.via.metri != null
            ? ' — il passeggero ha percorso ' + D.via.metri.toFixed(1).replace('.', ',')
              + ' m e poi si e\' fermato: ' + D.via.fermi + ' fotogrammi fermi tagliati'
            : '')
        : ', senza cammino')
    + '. Il modello dell’utente NON viene disegnato: si vede solo ciò che il programma ha capito.');
  const V = D.verticiEsito;
  console.log('[EIDETICA polvere] ' + V.presi.toLocaleString() + ' punti dai VERTICI dei triangoli'
    + ' e ' + V.triangoli.length.toLocaleString() + ' triangoli che li uniscono'
    + ' (su ' + V.verticiVeri.toLocaleString() + ' vertici veri, ' + V.mesh + ' mesh, '
    + V.figure + ' figure umane), più il pavimento'
    + ' misurato (' + D.pavimenti.length + ' strisce di celle libere). I puntini sono i vertici:'
    + ' il dettaglio è quello che ha messo chi ha fatto il modello, non uno che scegliamo noi.');
  console.log('[EIDETICA tetto] ' + (c.tettiQuanti || 0) + ' strisce di soffitto misurato'
    + ' (triangoli orizzontali sopra i 2,1 m). Su uno spaccato devono essere poche:'
    + ' se fossero tante lo staremmo inventando.');
  console.log('[EIDETICA muri] ' + E.muri.length + ' superfici da ' + E.confini
    + ' confini fra cella libera e cella occupata; ' + E.senzaAltezza
    + ' confini NON alzati perché sul modello lì non sta in piedi niente'
    + ' (spaccato: è la regola, non un difetto). Altezza massima misurata '
    + E.altezzaMax.toFixed(2).replace('.', ',') + ' m'
    + (E.misurata ? '' : ' — ⚠️ la griglia delle altezze NON era disponibile: nessun muro.'));
  return true;
}

export function pausa() {
  S.corre = false;
  const et = S.plancia && S.plancia.querySelector('#el-et');
  if (et) et.textContent = S.t >= 1 ? P().rivedi : P().riprendi;
  musicaGiu();
}
export function riparti() {
  if (S.t >= 1) S.t = 0;
  S.corre = true; S.ultimo = 0;
  const et = S.plancia && S.plancia.querySelector('#el-et');
  if (et) et.textContent = P().pausa;
  musicaSu();
}
export function chiudi() {
  if (!S.aperto) return;
  S.aperto = false; S.corre = false;
  if (S.raf) cancelAnimationFrame(S.raf);
  if (S.rintocco) { clearTimeout(S.rintocco); S.rintocco = null; }
  if (S.accordo) { clearTimeout(S.accordo); S.accordo = null; }
  musicaGiu();
  // ⚠️ Il microfono e la voce si spengono con la finestra. Un microfono che
  //    resta acceso dopo che l'utente ha chiuso e' la cosa peggiore che questo
  //    programma possa lasciare in giro.
  try { if (S.ascolto) S.ascolto.stop(); } catch (e) {}
  S.ascolto = null;
  try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
  if (S.chat) { try { S.chat.remove(); } catch (e) {} S.chat = null; }
  S.chiestaZona = null;
  removeEventListener('keydown', S.esc);
  if (S.geom) S.geom.dispose();
  if (S.mat) S.mat.dispose();
  if (S.ren) S.ren.dispose();
  if (S.velo) { S.velo.style.opacity = '0'; const v = S.velo; setTimeout(() => v.remove(), 500); }
  S.velo = S.tela = S.sopra = S.ren = S.scena = S.cam = S.geom = S.mat = null;
  S.plancia = S.pannello = null;
}

// ---------------------------------------------------------------------------
// IL PULSANTE. Raffaella: «un pulsante vocativo di questa atmosfera, con il
// nostro logo, in basso a destra sul riquadro perimetrale, con un minimo di
// ombreggiatura». Non e' un comando in piu' fra venti: e' la porta del cinema.
// ---------------------------------------------------------------------------
// ⚠️ IL PULSANTE STA NELLA BARRA, ACCANTO A x1/x2 — Raffaella, 06/09, indicando
//    sullo schermo: *«il tasto della visione dal vivo te l'ho messo vicino a
//    x1»*. Sta accanto ai comandi della riproduzione perche' e' quello che fa:
//    far partire un filmato. Da solo, appeso in un angolo sopra il modello, era
//    un oggetto che non si sa a che famiglia appartiene.
// ⚠️ Il posto NON si trova a coordinate: i comandi x1/x2 sono dentro il bundle,
//    che non si tocca mai. Si cerca il bottone PER TESTO e ci si mette accanto —
//    la stessa strada gia' usata per il bottone «Splat 3D». Se domani quei
//    comandi cambiano nome, il pulsante torna nel suo angolo invece di
//    atterrare in mezzo allo schermo.
// ⚠️ IL BUNDLE NON SI TOCCA, NEMMENO PER METTERGLI UN BOTTONE ACCANTO.
//    Costato subito, il 06/09: infilare il pulsante DENTRO il contenitore di
//    x1/x2 gli ha rotto la disposizione e ha aperto un pannello bianco vuoto
//    sopra i quattro numeri. La regola era gia' scritta ed e' la stessa dei
//    pannelli: «le colonne si spostano con `order`, non muovendo nodi: il
//    bundle non si tocca». Ci si mette ACCANTO senza entrarci: si misura dove
//    sta x1 sullo schermo e ci si affianca, restando fuori dal suo albero.
function accantoAllaBarra(b) {
  try {
    const q = Array.prototype.slice.call(document.querySelectorAll('button'))
      .filter((x) => /^x[12]$/i.test((x.textContent || '').trim()));
    if (!q.length) return false;
    const r = q[0].getBoundingClientRect();
    if (!r.width || !r.height) return false;
    b.style.position = 'fixed';
    b.style.left = 'auto';
    b.style.right = Math.round(window.innerWidth - r.left + 12) + 'px';
    b.style.bottom = Math.round(window.innerHeight - r.bottom) + 'px';
    b.style.padding = '7px 15px 7px 8px';
    b.style.fontSize = '12.5px';
    b.dataset.ancorato = '1';
    return true;
  } catch (e) { return false; }
}

// La barra si sposta quando la finestra cambia misura o si massimizza: il
// pulsante la segue, invece di restare dov'era.
function seguiLaBarra() {
  const b = document.getElementById('eidetica-live-btn');
  if (b && b.dataset.ancorato) accantoAllaBarra(b);
}

function pulsante() {
  if (document.getElementById('eidetica-live-btn')) return;
  const b = document.createElement('button');
  b.id = 'eidetica-live-btn';
  b.style.cssText = [
    'position:fixed', 'right:26px', 'bottom:96px', 'z-index:9400',
    'display:flex', 'align-items:center', 'gap:11px', 'padding:10px 18px 10px 12px',
    'border:0', 'border-radius:100px', 'cursor:pointer',
    'background:rgba(255,255,255,.92)', 'backdrop-filter:blur(18px)',
    '-webkit-backdrop-filter:blur(18px)',
    'box-shadow:0 2px 6px rgba(20,26,51,.10),0 14px 44px rgba(20,26,51,.16)',
    'font-family:"Helvetica Neue",Helvetica,Arial,sans-serif', 'font-size:13px',
    'font-weight:500', 'color:' + INCHIOSTRO,
    'transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s ease',
  ].join(';');
  b.innerHTML =
    '<img src="./Assets/eidetica_simbolo_trasparente.webp" alt="" '
    + 'style="width:30px;height:30px;object-fit:contain;display:block">'
    + '<span style="letter-spacing:.04em">' + P().pulsante + '</span>';
  b.onmouseenter = () => {
    b.style.transform = 'translateY(-2px) scale(1.02)';
    b.style.boxShadow = '0 4px 10px rgba(20,26,51,.12),0 18px 54px rgba(123,47,212,.28)';
  };
  b.onmouseleave = () => { b.style.transform = ''; b.style.boxShadow = ''; };
  b.onclick = () => apri();

  // ⚠️ La barra del bundle nasce dopo di noi: si riprova finche' c'e', e nel
  //    frattempo il pulsante resta comunque raggiungibile nel suo angolo.
  document.body.appendChild(b);
  if (!accantoAllaBarra(b)) {
    let tentativi = 0;
    const riprova = () => {
      if (tentativi++ > 40 || !document.getElementById('eidetica-live-btn')) return;
      if (!accantoAllaBarra(b)) setTimeout(riprova, 700);
    };
    setTimeout(riprova, 700);
  }
  addEventListener('resize', seguiLaBarra);
}

if (typeof window !== 'undefined') {
  // La maniglia per guardarci dentro dalla console, come fanno gli altri
  // moduli: senza, un film che non si vede non si puo' nemmeno interrogare.
  window.__eideticaLive = S;
  window.veritasCinema = {
    apri, chiudi, pausa, riparti,
    avvia: apri, ferma: chiudi, spegni: chiudi,
    // ⚠️ La diagnosi RESTITUISCE i numeri, non li stampa dopo tre secondi:
    //    una stampa ritardata arriva quando chi guarda ha gia' copiato.
    stato: () => {
      const c = S.cam;
      const g = S.geom && S.geom.userData;
      let arrivati = 0;
      if (g) for (let i = 0; i < g.n; i++) if (S.t >= g.quando[i]) arrivati++;
      const d = c ? new window.THREE.Vector3(0, 0, -1).applyQuaternion(c.quaternion) : null;
      return {
        aperto: S.aperto, t: +S.t.toFixed(3), corre: S.corre, zone: S.zone.length,
        attore: attore().chiave, lingua: lingua(), cammino: !!S.via,
        passi: S.via ? S.via.length : 0,
        camera: c ? [+c.position.x.toFixed(2), +c.position.y.toFixed(2), +c.position.z.toFixed(2)] : null,
        guarda: d ? [+d.x.toFixed(2), +d.y.toFixed(2), +d.z.toFixed(2)] : null,
        puntiTotali: g ? g.n : 0, puntiArrivati: arrivati,
        opacitaPolvere: S.mat ? +S.mat.uniforms.opacita.value.toFixed(3) : null,
        muri: S.muriMesh ? S.muriMesh.geometry.attributes.position.count / 6 : 0,
        muriU: S.muriMesh ? +S.muriMesh.material.uniforms.u.value.toFixed(3) : null,
        figliScena: S.scena ? S.scena.children.length : 0,
      };
    },
  };
  const attesa = (n) => {
    if (document.body) { pulsante(); return; }
    if (n < 40) setTimeout(() => attesa(n + 1), 300);
  };
  attesa(0);
  console.log('[EIDETICA live] pronto — il pulsante è in basso a destra, oppure window.veritasCinema.apri()');
}
