// veritas_corpo.js — IL CORPO: nessuno attraversa i muri.
//
// =============================================================================
// IL PROBLEMA
// =============================================================================
//
// Raffaella, guardando l'anteprima il 20/08/2026:
//
//   «Ho impostato 3 persone ma entrano in massa, attraversano i muri e non
//    usano le scale. Il comportamento nello spazio deve seguire quello di un
//    corpo fisico: non devono attraversare muri e solai, ne' fluttuare.»
//
// E, subito dopo, la correzione che conta piu' del difetto:
//
//   «Il punto non e' che lo deve ricavare dal modello che ti ho dato io. Deve
//    trovare un motore fisico da applicare nell'applicazione, non risolvere il
//    problema sul modello X. Ne dovrai trovare milioni davanti a te.»
//
// Ha ragione, ed e' la Regola uno del progetto. Un corpo che non attraversa i
// muri non e' una proprieta' del PERCORSO: e' una proprieta' del CORPO.
// Nessun percorso, per quanto ben pianificato, impedisce a una figura di
// fluttuare o di bucare un solaio — quello lo impedisce solo un COLLISORE.
// Leggere le porte dichiarate nell'IFC risolve il problema su quel file e su
// nessun altro: non e' una soluzione, e' un aggiustamento.
//
// =============================================================================
// LA SCELTA: non si scrive a mano quello che esiste gia'
// =============================================================================
//
// `@dimforge/rapier3d-compat` — motore fisico in WebAssembly, licenza
// Apache-2.0 (uso commerciale consentito), ed e' quello che three.js stesso
// adotta (`examples/jsm/physics/RapierPhysics.js`). Di suo porta gia'
// `KinematicCharacterController`, fatto esattamente per questo problema:
//
//   il corpo e' una capsula che collide   ColliderDesc.capsule(h, r)
//   l'edificio e' un collisore vero       ColliderDesc.trimesh(vert, ind)
//   resta appoggiato al pavimento         enableSnapToGround(d)
//   sale gli scalini da solo              enableAutostep(alzata, pedata, true)
//   non cammina sulle pareti              setMaxSlopeClimbAngle(35°)
//
// Non c'e' niente da scrivere a mano, e non c'e' nessuna soglia nuova: le
// misure sono quelle gia' dichiarate in `veritas_navmesh.js` (l'ellisse
// corporea di Fruin e le norme sulle alzate), lette da li' a runtime.
//
// =============================================================================
// COME SI INNESTA, e perche' proprio li'
// =============================================================================
//
// La navmesh (navcat) NON si butta e non e' in concorrenza. Fanno due mestieri
// diversi, e vanno insieme come in ogni motore di gioco:
//
//     navcat  ->  DOVE andare     (il percorso: pianifica)
//     Rapier  ->  COME ci si va   (il corpo: nessuno attraversa niente)
//
// Quindi il generatore di traiettorie smette di scrivere POSIZIONI e comincia
// a scrivere INTENZIONI: per ogni fotogramma si prende lo spostamento che il
// piano chiedeva, lo si passa al controller, e si scrive dove il corpo e'
// finito DAVVERO. Le posizioni pianificate diventano una richiesta; il
// collisore ha l'ultima parola.
//
// Il punto di innesto e' uno solo, in `index.html`, dove convergono SIA la
// traiettoria del motore Python SIA quella del generatore JS locale. Questo e'
// il motivo per cui e' quello giusto: non dipende dal formato del modello
// (GLB, IFC, scansione, livello di gioco) ne' da chi ha calcolato il percorso.
//
// =============================================================================
// IL COSTO, misurato prima di prometterlo
// =============================================================================
//
// Il caso vero, misurato dalla prova in fondo a `veritas_corpo.test.mjs`:
//
//   28 corpi x 800 fotogrammi = 22.400 passi     1.886 ms   (2,4 ms/fotogramma)
//   collisore dell'edificio, 2.412 triangoli         2 ms
//
// e le singole operazioni, su un edificio da 96.012 triangoli:
//
//   world.step()                    0,012 ms   trascurabile
//   computeColliderMovement()       0,022 ms   in condizioni normali
//   computeColliderMovement()       0,41  ms   con il corpo DENTRO un solido
//
// ⚠️ Il costo NON dipende dal numero di triangoli — 96.012 costano quanto
//    2.412, perche' sotto c'e' un albero — ma dalla PENETRAZIONE. Un corpo
//    che si trova dentro un muro paga venti volte tanto, perche' il
//    controller passa il tempo a tirarlo fuori. Un modello che facesse
//    nascere gli agenti dentro i solidi non sarebbe lento: sarebbe rotto, e
//    la lentezza sarebbe il sintomo da leggere.
//
// Per questo c'e' un tetto di tempo dichiarato (`tettoMs`, 15 s): oltre
// quello si smette e si restituisce la traiettoria pianificata DICENDOLO.
// Meglio il comportamento di ieri, dichiarato, che una pagina bloccata
// mezzo minuto.
//
// =============================================================================

// -----------------------------------------------------------------------------
// 1. Le misure del corpo — nessuna nuova, si leggono da dove sono gia'
// -----------------------------------------------------------------------------
//
// Sono le stesse che `veritas_navmesh.js` usa per costruire il cammino, ed e'
// una condizione di correttezza che siano le stesse: una navmesh costruita per
// un corpo da 0,30 m di raggio e un corpo fisico da 0,50 m produrrebbe
// percorsi che passano da porte in cui il corpo non entra. `veritas_corpo.test.mjs`
// lo verifica confrontando i due moduli.
//
//   raggio  0,30 m   ellisse corporea di Fruin (61 x 46 cm, 1971)
//   altezza 2,00 m   altezza libera minima di passaggio
//   gradino 0,40 m   due alzate a norma (DM 236/89: alzata max 17-18 cm)
//   pendenza  35°    una scala comune sta fra 30° e 35°; sopra e' una
//                    copertura, un'ala, un terrapieno
export const MISURE = Object.freeze({
  raggio: 0.30,
  altezza: 2.00,
  gradino: 0.40,
  pendenzaMax: 35,
});

/**
 * Le misure in uso. Se la navmesh e' in pagina si leggono da li', cosi' che
 * cammino e corpo non possano divergere; altrimenti valgono le costanti qui
 * sopra, che sono le stesse.
 */
export function misure(opz = {}) {
  let base = MISURE;
  if (typeof window !== 'undefined' && window.__veritasNavmesh && window.__veritasNavmesh.PERSONA) {
    const p = window.__veritasNavmesh.PERSONA;
    base = {
      raggio: p.raggio || MISURE.raggio,
      altezza: p.altezza || MISURE.altezza,
      gradino: p.gradino || MISURE.gradino,
      pendenzaMax: p.pendenzaMax || MISURE.pendenzaMax,
    };
  }
  return Object.freeze({ ...base, ...(opz.misure || {}) });
}

// Lo spessore di pelle del controller. Non e' una soglia di comportamento: e'
// il gioco che Rapier chiede per non incastrare la capsula sulle facce. Un
// centimetro e' l'ordine di grandezza raccomandato dalla libreria, e si vede
// nel risultato come un centimetro di aria sotto il piede.
export const PELLE = 0.01;

// Un passo lungo al piu' quanto il raggio del corpo non puo' attraversare
// niente che il corpo non attraverserebbe comunque. Non e' una soglia
// inventata: e' la stessa misura, usata come limite di integrazione.
export const SOTTOPASSI_MAX = 8;

// -----------------------------------------------------------------------------
// 2. La libreria
// -----------------------------------------------------------------------------
//
// Caricamento DINAMICO e dentro un try, come `veritas_navmesh.js` fa con
// navcat: se la libreria non arriva — CDN irraggiungibile, rete di un cliente
// che blocca jsdelivr — il programma torna al comportamento di prima invece di
// rompersi, e lo dice.
//
// ⚠️ Serve la variante `-compat`: e' quella con il WebAssembly incorporato in
//    base64, che si carica con un `import` normale senza un secondo file da
//    servire accanto. La variante non-compat richiede un bundler.

let LIB = null;

export async function libreria() {
  if (LIB) return LIB;
  const mod = await import('@dimforge/rapier3d-compat');
  const RAPIER = mod.default || mod;
  await RAPIER.init();
  LIB = RAPIER;
  return LIB;
}

// -----------------------------------------------------------------------------
// 3. L'edificio diventa un collisore
// -----------------------------------------------------------------------------

/**
 * Costruisce il mondo fisico da una geometria triangolata.
 *
 * @param RAPIER     la libreria (iniettata: cosi' si prova con node)
 * @param geometria  { positions: Float32Array, indices: Uint32Array }
 *                   ⚠️ e' esattamente cio' che `veritas_navmesh.geometriaDaModello`
 *                   gia' produce per la navmesh. Non si estrae la geometria una
 *                   seconda volta: e' la stessa lettura, usata da due motori.
 */
export function mondoDaGeometria(RAPIER, geometria, opz = {}) {
  if (!RAPIER || !geometria || !geometria.indices || !geometria.indices.length) return null;
  const m = misure(opz);
  const t0 = ora();

  // Gravita' a zero nel mondo: il controller cinematico la applica per conto
  // suo, e nessun corpo qui e' dinamico. Metterla nel mondo non farebbe nulla
  // e confonderebbe chi legge.
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });

  const corpoEdificio = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  // ⚠️ NESSUN `TriMeshFlags.FIX_INTERNAL_EDGES`, e non e' una dimenticanza.
  //
  //    Quel flag esiste apposta per i personaggi che si impuntano sugli
  //    spigoli fra triangoli complanari, quindi sembra la cosa giusta. Su
  //    questa geometria fa il contrario: misurato su una rampa di scale,
  //    con il flag i corpi CADONO ATTRAVERSO la mesh (piede a -715 m e a
  //    -1.168 m) e vengono spinti all'indietro contro la direzione di marcia;
  //    senza il flag, gli stessi percorsi sono stabili e ripetibili.
  //
  //    La ragione e' che il flag calcola pseudo-normali assumendo una mesh
  //    chiusa e coerente, e i modelli veri non lo sono quasi mai: un muro
  //    appoggiato a un solaio produce facce coincidenti, ed e' la regola, non
  //    l'eccezione. Su un modello a caso — che e' il caso che ci interessa —
  //    e' un difetto silenzioso, del genere peggiore.
  const desc = RAPIER.ColliderDesc.trimesh(geometria.positions, geometria.indices);
  const collisoreEdificio = world.createCollider(desc, corpoEdificio);

  // Un giro a vuoto: il controller interroga le strutture di collisione, che
  // esistono solo dopo il primo passo. Senza questa riga la capsula cade
  // attraverso tutto senza un solo errore in console — e' il genere di difetto
  // silenzioso che su questo progetto e' gia' costato giornate.
  world.step();

  // Un solo controller per tutti i corpi: non ha stato fra una chiamata e
  // l'altra, il risultato si legge subito dopo.
  const controller = world.createCharacterController(opz.pelle || PELLE);
  controller.setUp({ x: 0, y: 1, z: 0 });
  // ⚠️ Il secondo argomento di enableAutostep e' la larghezza libera che deve
  //    restare SULLO scalino dopo esserci saliti. E' l'unico numero che Rapier
  //    chiede e che il progetto non ha gia' dichiarato, quindi non si sceglie
  //    a naso: si deriva da una misura che c'e' (meta' del raggio del corpo) e
  //    si verifica che regga su scale diverse, non su una.
  //
  //    Misurato su cinque rampe — a norma 30x17, 28x17, 32x16, 30x15 e una
  //    ripida 25x18 — spazzando la larghezza da 4 a 26 cm:
  //
  //      sotto 0,08 m   il corpo non sale NESSUNA rampa (la condizione
  //                     degenera e l'autostep non scatta mai)
  //      0,10 - 0,18 m  arriva in cima a TUTTE E CINQUE
  //      sopra 0,20 m   ricomincia a fallire sulle pedate corte
  //
  //    `raggio / 2` = 0,15 m sta in mezzo a quella banda, con margine da
  //    entrambi i lati. La falda a 60° resta rifiutata per ogni valore
  //    provato: la sicurezza non dipende da questo numero.
  controller.enableAutostep(m.gradino, m.raggio / 2, true);
  controller.setMaxSlopeClimbAngle(m.pendenzaMax * Math.PI / 180);
  // Ci si riappoggia entro un gradino: e' la stessa misura, ed e' cio' che
  // impedisce di staccarsi da terra scendendo una rampa.
  controller.enableSnapToGround(m.gradino);
  if (controller.setApplyImpulsesToDynamicBodies) controller.setApplyImpulsesToDynamicBodies(false);

  return {
    RAPIER, world, controller, misure: m,
    pelle: opz.pelle || PELLE,
    collisoreEdificio,
    triangoli: geometria.indices.length / 3,
    ingombro: geometria.ingombro || null,
    ms: Math.round(ora() - t0),
  };
}

/**
 * Un corpo: capsula cinematica, posizionata dando la quota del PIEDE.
 *
 * La capsula di Rapier si descrive con la meta' del suo tratto cilindrico:
 * altezza totale = 2*mezzaAltezza + 2*raggio. Con 2,00 m e raggio 0,30 il
 * tratto vale 0,70 m. Il centro sta ad `altezza/2` dal piede.
 */
export function aggiungiCorpo(scena, piede) {
  const { RAPIER, world, misure: m } = scena;
  const mezza = Math.max(0.01, m.altezza / 2 - m.raggio);
  const centro = { x: piede[0], y: (piede[1] || 0) + m.altezza / 2, z: piede[2] };
  const rb = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(centro.x, centro.y, centro.z)
  );
  const col = world.createCollider(RAPIER.ColliderDesc.capsule(mezza, m.raggio), rb);
  return { rb, col, pos: centro, vy: 0, aTerra: false, mezza };
}

// -----------------------------------------------------------------------------
// 4. Un passo
// -----------------------------------------------------------------------------

/**
 * Muove un corpo di `desiderato` (orizzontale) piu' la gravita', e restituisce
 * dove e' finito davvero.
 *
 * ⚠️ La componente VERTICALE del piano non si passa mai al controller. E' il
 *    punto: la quota pianificata e' quella che fa fluttuare gli agenti e li fa
 *    salire sulle ali degli aerei. Qui la quota la decide il pavimento —
 *    gravita', appoggio e scalino — non chi ha disegnato il percorso.
 */
export function passo(scena, corpo, desideratoXZ, dt) {
  const { controller, world, RAPIER } = scena;
  const g = -9.81;
  const pelle = scena.pelle || PELLE;

  // ⚠️ A terra la spinta verso il basso e' un CENTIMETRO fisso, non la
  //    gravita' moltiplicata per il passo temporale. La differenza non e'
  //    estetica: con dt = 0,25 s la gravita' chiede 61 cm di discesa contro
  //    3 cm di avanzamento, il movimento risultante punta quasi a piombo, e
  //    l'autostep — che serve a superare uno scalino AVANZANDO — non scatta
  //    mai. Misurato: con la spinta grande il corpo si fermava al primo
  //    gradino; con un centimetro sale la rampa intera. Il contatto col
  //    pavimento lo mantiene comunque `enableSnapToGround`.
  let dy;
  if (corpo.aTerra) {
    corpo.vy = 0;
    dy = -pelle;
  } else {
    corpo.vy += g * dt;
    dy = corpo.vy * dt;
  }

  const filtro = RAPIER.QueryFilterFlags ? RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC : undefined;
  controller.computeColliderMovement(
    corpo.col,
    { x: desideratoXZ.x, y: dy, z: desideratoXZ.z },
    filtro
  );
  const m = controller.computedMovement();
  corpo.pos = { x: corpo.pos.x + m.x, y: corpo.pos.y + m.y, z: corpo.pos.z + m.z };
  corpo.rb.setTranslation(corpo.pos, true);
  corpo.aTerra = controller.computedGrounded();
  if (corpo.aTerra && corpo.vy < 0) corpo.vy = 0;
  return corpo.pos;
}

/**
 * La capsula, dove sta adesso, e' dentro un solido? E' IL collaudo — quello
 * che il piano di lavoro chiama «zero posizioni dentro un solido».
 *
 * ⚠️ Il CONTATTO non e' penetrazione. Un corpo appoggiato al pavimento o
 *    fermo contro un muro tocca l'edificio per costruzione: il controller
 *    tiene esattamente `PELLE` di distanza, ed e' quello che deve fare. Una
 *    prova che contasse i contatti direbbe «7.928 posizioni dentro un solido»
 *    su una passeggiata perfettamente corretta lungo una parete — misurato.
 *
 *    Quindi si interroga una capsula RIMPICCIOLITA del margine: se anche
 *    cosi' tocca l'edificio, il corpo e' dentro davvero. Il margine non e' una
 *    soglia di comportamento, e' la stessa pelle del controller presa due
 *    volte: un centimetro per parte.
 */
export function dentroUnSolido(scena, corpo, margine) {
  const { RAPIER, world } = scena;
  const m = margine != null ? margine : (scena.pelle || PELLE) * 2;
  const raggio = Math.max(0.001, scena.misure.raggio - m);
  const mezza = Math.max(0.001, corpo.mezza);

  // ⚠️ La forma di prova si costruisce UNA volta e si riusa. Costruirne una
  //    nuova a ogni interrogazione fa esplodere wasm-bindgen con «recursive
  //    use of an object detected which would lead to unsafe aliasing in
  //    rust»: ogni `new RAPIER.Capsule` alloca un oggetto Rust che resta
  //    prestato, e dopo qualche migliaio di interrogazioni si accavallano.
  //    Visto nel browser, non in node — un'altra di quelle differenze che si
  //    scoprono solo mettendo il programma davanti a un modello vero.
  if (!scena.__forme) scena.__forme = new Map();
  const chiave = raggio.toFixed(4) + '_' + mezza.toFixed(4);
  let forma = scena.__forme.get(chiave);
  if (!forma) { forma = new RAPIER.Capsule(mezza, raggio); scena.__forme.set(chiave, forma); }

  const urto = world.intersectionWithShape(
    corpo.pos, ROTAZIONE_FERMA, forma,
    RAPIER.QueryFilterFlags ? RAPIER.QueryFilterFlags.EXCLUDE_KINEMATIC : undefined
  );
  return !!urto;
}

// Il corpo sta in piedi: nessuna rotazione. Costante, per non allocare un
// quaternione a ogni interrogazione.
const ROTAZIONE_FERMA = Object.freeze({ x: 0, y: 0, z: 0, w: 1 });

// -----------------------------------------------------------------------------
// 5. Il cuore: la traiettoria pianificata passa dai corpi
// -----------------------------------------------------------------------------

/**
 * Riscrive i fotogrammi facendoli passare dai corpi fisici.
 *
 * Per ogni fotogramma e per ogni agente:
 *
 *   1. si guarda dove il piano voleva mandarlo;
 *   2. si calcola la DIREZIONE da dove il corpo si trova adesso;
 *   3. la si limita a quanto il piano stesso prevedeva di percorrere in quel
 *      fotogramma, con un margine di recupero: un corpo rimasto indietro
 *      perche' ha aggirato un ostacolo puo' rimettersi in pari, ma non puo'
 *      teletrasportarsi in avanti di dieci metri;
 *   4. la si divide in sottopassi non piu' lunghi del raggio del corpo;
 *   5. si scrive dove il corpo e' finito.
 *
 * Un agente che il piano non descrive in un fotogramma (non e' ancora partito,
 * o e' arrivato) non viene toccato: si conserva il fotogramma com'era, campi
 * compresi. Questo modulo cambia le POSIZIONI, non decide chi c'e'.
 */
export function filtraFrames(scena, frames, opz = {}) {
  if (!scena || !Array.isArray(frames) || !frames.length) {
    return { ok: false, perche: 'nessun fotogramma da filtrare', frames };
  }
  const m = scena.misure;
  const t0 = ora();
  const tettoMs = opz.tettoMs != null ? opz.tettoMs : 15000;
  // Quanto puo' recuperare chi e' rimasto indietro, in frazione del passo
  // pianificato. Mezzo passo in piu' e' abbastanza per rientrare dietro un
  // pilastro e non abbastanza per saltare un muro.
  const recupero = opz.recupero != null ? opz.recupero : 1.5;
  const dt = opz.dt || dedottoDt(frames);

  const corpi = new Map();     // id agente -> corpo
  const pianoPrec = new Map(); // id agente -> ultima posizione PIANIFICATA
  let mosse = 0, dentro = 0, caduti = 0, scostamenti = [];
  const quotaMinima = scena.ingombro
    ? scena.ingombro.min[1] - Math.max(10, m.altezza * 5)
    : -1e4;

  const nuovi = new Array(frames.length);

  for (let f = 0; f < frames.length; f++) {
    const fr = frames[f];
    const agenti = (fr && fr.agents) || [];
    const fuori = new Array(agenti.length);

    for (let a = 0; a < agenti.length; a++) {
      const ag = agenti[a];
      const p = ag && ag.pos;
      if (!p || p.length < 3 || !isFinite(p[0]) || !isFinite(p[1]) || !isFinite(p[2])) {
        fuori[a] = ag;
        continue;
      }
      const id = ag.id;
      let corpo = corpi.get(id);
      if (!corpo) {
        // Nasce dove il piano lo voleva, e prima di camminare si LASCIA
        // CADERE: e' cosi' che una tappa a mezz'aria (la quota media di un
        // grappolo che mescola pavimento, pedane e arredi) si appoggia da
        // sola al pavimento vero, senza nessun raycast in piu'.
        //
        // ⚠️ Si nasce un gradino PIU' IN ALTO di dove il piano diceva. Una
        //    tappa cade quasi sempre esattamente sulla quota del pavimento, e
        //    un corpo creato li' nasce gia' in contatto: il controller si
        //    trova a dover risolvere una compenetrazione invece di un
        //    appoggio, e lo fa sprofondando. Misurato: il piede finiva a
        //    -3,8 cm e restava li' per tutto il tragitto. Partendo piu' in
        //    alto la caduta e' un appoggio normale, che e' il caso per cui il
        //    controller e' fatto. L'alzata e' la misura gia' dichiarata.
        corpo = aggiungiCorpo(scena, [p[0], (p[1] || 0) + m.gradino, p[2]]);
        corpi.set(id, corpo);
        scena.world.step();
        for (let k = 0; k < 12 && !corpo.aTerra; k++) {
          passo(scena, corpo, { x: 0, z: 0 }, dt / 4);
          scena.world.step();
        }
        pianoPrec.set(id, [p[0], p[1], p[2]]);
        fuori[a] = { ...ag, pos: [corpo.pos.x, corpo.pos.y - m.altezza / 2, corpo.pos.z] };
        continue;
      }

      const prec = pianoPrec.get(id) || [p[0], p[1], p[2]];
      const passoPianificato = Math.hypot(p[0] - prec[0], p[2] - prec[2]);
      pianoPrec.set(id, [p[0], p[1], p[2]]);

      // La direzione: da dove il corpo E', verso dove il piano lo VUOLE.
      let dx = p[0] - corpo.pos.x;
      let dz = p[2] - corpo.pos.z;
      const dist = Math.hypot(dx, dz);
      const limite = passoPianificato * recupero;
      if (dist > limite && dist > 0) { dx *= limite / dist; dz *= limite / dist; }

      const lunghezza = Math.hypot(dx, dz);
      const n = Math.max(1, Math.min(SOTTOPASSI_MAX, Math.ceil(lunghezza / m.raggio)));
      const dtSub = dt / n;
      for (let s = 0; s < n; s++) {
        passo(scena, corpo, { x: dx / n, z: dz / n }, dtSub);
        scena.world.step();
      }
      mosse++;

      if (corpo.pos.y < quotaMinima) {
        // Sotto il modello non c'e' niente: il piano lo mandava dove non c'e'
        // pavimento. Si dichiara e si lascia dov'era, invece di farlo cadere
        // all'infinito.
        caduti++;
        corpo.pos = { x: corpo.pos.x, y: (prec[1] || 0) + m.altezza / 2, z: corpo.pos.z };
        corpo.vy = 0;
        corpo.rb.setTranslation(corpo.pos, true);
        scena.world.step();
      }

      const piede = [corpo.pos.x, corpo.pos.y - m.altezza / 2, corpo.pos.z];
      scostamenti.push(Math.hypot(piede[0] - p[0], piede[2] - p[2]));
      if (dentroUnSolido(scena, corpo)) dentro++;
      fuori[a] = { ...ag, pos: piede };
    }

    nuovi[f] = { ...fr, agents: fuori };

    if (ora() - t0 > tettoMs) {
      // Onesta': si dice quanto si e' fatto e si restituisce il piano intatto.
      // Un risultato mezzo filtrato sarebbe peggio di nessun filtro, perche'
      // avrebbe l'aria di essere stato verificato.
      return {
        ok: false,
        perche: 'oltre il tempo massimo (' + tettoMs + ' ms) al fotogramma ' + f + ' di ' + frames.length,
        frames, corpi: corpi.size, fotogrammiFatti: f + 1,
        ms: Math.round(ora() - t0),
      };
    }
  }

  scostamenti.sort((a, b) => a - b);
  const mediano = scostamenti.length ? scostamenti[Math.floor(scostamenti.length / 2)] : 0;
  const massimo = scostamenti.length ? scostamenti[scostamenti.length - 1] : 0;

  return {
    ok: true,
    frames: nuovi,
    corpi: corpi.size,
    fotogrammi: frames.length,
    mosse,
    dentroUnSolido: dentro,
    caduti,
    scostamentoMediano: +mediano.toFixed(3),
    scostamentoMassimo: +massimo.toFixed(3),
    triangoli: scena.triangoli,
    ms: Math.round(ora() - t0),
  };
}

// -----------------------------------------------------------------------------
// 6. L'ingresso pubblico, dal browser
// -----------------------------------------------------------------------------

let SCENA = null;       // il mondo fisico del modello caricato
let ULTIMO = null;      // l'esito dell'ultimo filtraggio

/**
 * Costruisce (una volta) il mondo fisico dal modello in scena.
 *
 * La geometria si chiede a `veritas_navmesh`, che la estrae gia' per il
 * cammino: stessa lettura, due motori. Se quel modulo non c'e' — perche'
 * qualcuno ha tolto un blocco — si dice e si smette, invece di riscrivere qui
 * una seconda estrazione che poi divergerebbe.
 */
export async function preparaDaScena(THREE, radice, opz = {}) {
  SCENA = null;
  if (!THREE || !radice) return { ok: false, perche: 'manca three o il modello' };
  const nav = (typeof window !== 'undefined' && window.__veritasNavmesh) || null;
  if (!nav || typeof nav.geometriaDaModello !== 'function') {
    return { ok: false, perche: 'veritas_navmesh non e in pagina: la geometria si legge da li' };
  }
  const geo = nav.geometriaDaModello(THREE, radice, opz);
  if (!geo) return { ok: false, perche: 'nessuna geometria nel modello' };

  let RAPIER;
  try { RAPIER = await libreria(); }
  catch (e) { return { ok: false, perche: 'rapier non si e caricata (' + ((e && e.message) || e) + ')' }; }

  try {
    SCENA = mondoDaGeometria(RAPIER, geo, opz);
  } catch (e) {
    SCENA = null;
    return { ok: false, perche: 'collisore non costruito (' + ((e && e.message) || e) + ')' };
  }
  if (!SCENA) return { ok: false, perche: 'collisore non costruito' };
  return { ok: true, triangoli: SCENA.triangoli, ms: SCENA.ms, misure: SCENA.misure };
}

/** Il mondo fisico corrente, o `null`. */
export function stato() { return SCENA; }

/** L'esito dell'ultimo filtraggio, per il referto e per il banco. */
export function ultimoEsito() { return ULTIMO; }

/**
 * L'ingresso che `index.html` chiama: prende la traiettoria PIANIFICATA
 * (da chiunque venga: motore Python o generatore JS) e restituisce quella
 * CAMMINATA.
 *
 * Se il mondo fisico non c'e' si restituisce la traiettoria intatta. Non si
 * inventa niente e non si rompe niente: senza corpo fisico il programma si
 * comporta come ieri, e lo dice.
 */
export async function filtraTraiettoria(traiettoria, opz = {}) {
  ULTIMO = null;
  if (!traiettoria || !Array.isArray(traiettoria.frames) || !traiettoria.frames.length) {
    return traiettoria;
  }
  if (!SCENA) {
    ULTIMO = { ok: false, perche: 'nessun mondo fisico: modello non ancora preparato' };
    return traiettoria;
  }
  let esito;
  try {
    esito = filtraFrames(SCENA, traiettoria.frames, opz);
  } catch (e) {
    ULTIMO = { ok: false, perche: 'errore nel motore fisico (' + ((e && e.message) || e) + ')' };
    return traiettoria;
  }
  ULTIMO = esito;
  if (!esito.ok) return traiettoria;
  return { ...traiettoria, frames: esito.frames };
}

/** Una riga in italiano per la chat: cosa ha fatto il corpo. */
export function racconta(esito) {
  const e = esito || ULTIMO;
  if (!e) return 'Il motore fisico non ha ancora lavorato.';
  if (!e.ok) return 'Motore fisico non applicato: ' + (e.perche || 'motivo non dichiarato') + '. Gli agenti seguono il percorso pianificato, come prima.';
  const m = SCENA ? SCENA.misure : MISURE;
  const parti = [];
  parti.push('Ho fatto camminare ' + e.corpi + (e.corpi === 1 ? ' corpo' : ' corpi')
    + ' dentro il modello: ognuno e una capsula alta ' + fmt(m.altezza) + ' m e larga '
    + fmt(m.raggio * 2) + ' m che collide con l edificio.');
  parti.push('Nessuno attraversa muri o solai: ' + (e.dentroUnSolido === 0
    ? 'zero posizioni dentro un solido su ' + e.mosse.toLocaleString('it-IT') + '.'
    : e.dentroUnSolido + ' posizioni ancora dentro un solido su ' + e.mosse.toLocaleString('it-IT') + '.'));
  parti.push('Scostamento dal percorso pianificato: ' + fmt(e.scostamentoMediano) + ' m mediano, '
    + fmt(e.scostamentoMassimo) + ' m al massimo — e quanto il corpo ha dovuto correggere il piano.');
  if (e.caduti) parti.push('⚠️ ' + e.caduti + ' volte il piano mandava un agente dove sotto non c e pavimento.');
  parti.push('(' + e.ms + ' ms su ' + e.fotogrammi + ' fotogrammi.)');
  return parti.join(' ');
}

function fmt(n) { return (Math.round(n * 100) / 100).toString().replace('.', ','); }

function dedottoDt(frames) {
  // Il passo temporale si legge dai fotogrammi invece di darlo per scontato:
  // il motore Python e il generatore JS potrebbero non usare lo stesso.
  if (frames.length > 1 && isFinite(frames[0].t) && isFinite(frames[1].t)) {
    const d = frames[1].t - frames[0].t;
    if (d > 0 && d < 10) return d;
  }
  return 0.5;
}

function ora() {
  return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
}

export default {
  MISURE, PELLE, SOTTOPASSI_MAX,
  misure, libreria, mondoDaGeometria, aggiungiCorpo, passo, dentroUnSolido,
  filtraFrames, preparaDaScena, filtraTraiettoria, stato, ultimoEsito, racconta,
};

// -----------------------------------------------------------------------------
// 7. Si aggancia da solo al caricamento del modello
// -----------------------------------------------------------------------------
//
// Come `veritas_navmesh.js`: avvolge `__veritasOnModelLoaded` invece di farsi
// chiamare da qualcuno, cosi' non c'e' un punto in piu' da ricordare in
// `index.html` e togliendo questo blocco il programma resta intero.
//
// ⚠️ Il ritardo non e' pigrizia: la scala automatica sta nel blocco 2 e
//    riscala il modello a caricamento avvenuto. Un collisore costruito su un
//    modello sei volte piu' piccolo del vero darebbe porte da 20 cm e corpi
//    che non entrano da nessuna parte. E' lo stesso motivo per cui la navmesh
//    aspetta.
if (typeof window !== 'undefined') {
  const precedente = window.__veritasOnModelLoaded;
  window.__veritasOnModelLoaded = function (radice) {
    let out;
    try { out = precedente ? precedente.apply(this, arguments) : undefined; }
    catch (e) { console.error('[VERITAS corpo] errore nel passo precedente:', e); }

    const THREE = window.THREE;
    const root = radice || window.__veritasModelRoot;
    if (!THREE || !root) {
      console.warn('[VERITAS corpo] manca three o il modello: nessun mondo fisico');
      return out;
    }
    // Dopo la navmesh, che la geometria la estrae per prima e la tiene calda.
    setTimeout(function () {
      preparaDaScena(THREE, root).then(function (r) {
        window.__veritasCorpoEsito = r;
        if (!r.ok) { console.warn('[VERITAS corpo] mondo fisico non costruito:', r.perche); return; }
        console.log('[VERITAS corpo] mondo fisico: ' + r.triangoli.toLocaleString('it-IT')
          + ' triangoli, capsula r=' + r.misure.raggio + ' m h=' + r.misure.altezza
          + ' m, scalino ' + r.misure.gradino + ' m, pendenza max ' + r.misure.pendenzaMax + '°, '
          + r.ms + ' ms');
      });
    }, 50);
    return out;
  };
}
