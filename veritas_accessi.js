// =============================================================================
// VERITAS — GLI ACCESSI. Da dove si entra, e quanti modi ci sono.
// =============================================================================
//
// PERCHE' ESISTE QUESTO FILE
//
// Il 01/09/2026 la simulazione aveva UN FLUSSO SOLO, quello che arriva dal
// tunnel dell'aereo. Raffaella: *«dovrebbe assegnare anche l'ingresso dalla
// strada: occhio e cervello riconoscono l'aeroporto e assegnano TUTTI i flussi
// che si generano, non solo uno.»*
//
// Il primo passo (`veritas_flussi.js`) ha dato al motore il posto dove tenere
// piu' di un flusso. Questo file trova **da dove nascono**.
//
// LA REGOLA, ED E' GEOMETRICA — vale per una scuola, una chiesa, un ospedale,
// un negozio (Regola 0-bis: nessuna parola di tipologia, nessun nome di mesh):
//
//     DOVE IL TETTO FINISCE E SI CONTINUA A CAMMINARE, LI' SI ENTRA.
//
// Si guarda in su da ogni punto calpestabile: se sopra la testa c'e' qualcosa
// si e' DENTRO, se c'e' il cielo si e' FUORI. Il punto dove i due si toccano —
// due passi vicini, uno coperto e uno scoperto — e' una SOGLIA. Le soglie
// vicine fra loro sono lo stesso accesso.
//
// Non serve sapere che edificio sia: il piazzale di un aeroporto, il cortile di
// una scuola, il parcheggio di un ospedale e il marciapiede davanti a un
// negozio sono tutti «scoperto», e la porta e' dove il coperto li tocca.
//
// ⚠️ COSA NON E' UN ACCESSO, e i filtri che lo tengono fuori:
//    - una soglia piu' stretta di una persona (due raggi): non ci si passa;
//    - un'ala d'aereo o una pensilina che coprono un pezzo di piazzale fanno
//      una macchia di «coperto» in mezzo allo scoperto. Il filtro e' che un
//      accesso deve avere DAVVERO dell'edificio dietro: si contano i punti
//      coperti raggiungibili a piedi dalla soglia, e se sono pochi non e' un
//      ingresso, e' un'ombra.
//
// ⚠️ Il conto si fa UNA VOLTA, al caricamento del modello, e resta. Non e' una
//    cosa da rifare a ogni fotogramma ne' a ogni corsa della simulazione.
// =============================================================================

/** Quanto si allarga la griglia dei campioni, in metri. */
export const PASSO = 2.0;

/** Oltre questo numero di campioni si allarga il passo: un aeroporto non deve
 *  costare piu' di una stanza solo perche' e' grande. */
export const CAMPIONI_MAX = 4000;

/**
 * Campiona la superficie calpestabile: dove si puo' mettere un piede.
 * Usa la navmesh, che e' l'unica che sappia dove si cammina davvero.
 */
export function campiona(nm, opz = {}) {
  const stato = nm && nm.stato && nm.stato();
  if (!stato || !stato.isole || !stato.isole.length) return [];
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const i of stato.isole)
    for (let k = 0; k < 3; k++) {
      if (i.ingombro.min[k] < min[k]) min[k] = i.ingombro.min[k];
      if (i.ingombro.max[k] > max[k]) max[k] = i.ingombro.max[k];
    }
  const lx = max[0] - min[0], lz = max[2] - min[2];
  if (!(lx > 0) || !(lz > 0)) return [];

  let passo = opz.passo || PASSO;
  const tetto = opz.campioniMax || CAMPIONI_MAX;
  // Il passo si allarga da solo finche' il conto sta nel tetto: cosi' una
  // stanza si guarda fitta e un terminal grossolano, senza toccare niente.
  while ((lx / passo) * (lz / passo) > tetto) passo *= 1.25;

  const punti = [];
  for (let x = min[0] + passo / 2; x < max[0]; x += passo)
    for (let z = min[2] + passo / 2; z < max[2]; z += passo) {
      // La quota non si sa: si cerca il pavimento in tutta l'altezza del
      // modello. Su due piani sovrapposti si prende quello che c'e'.
      const q = nm.sulCamminoCorrente([x, (min[1] + max[1]) / 2, z],
        [passo * 0.6, Math.max(4, (max[1] - min[1]) / 2 + 1), passo * 0.6]);
      if (q.ok) punti.push(q.punto);
    }
  return Object.assign(punti, { passo });
}

/**
 * Chi ha un tetto sopra la testa e chi no.
 *
 * Un raggio verso l'alto da ogni campione: se incontra geometria del modello
 * si e' dentro, altrimenti si e' fuori. Si parte poco sopra il pavimento per
 * non colpire il pavimento stesso.
 */
export function copertura(THREE, radice, punti, opz = {}) {
  const coperti = [], scoperti = [];
  if (!THREE || !radice || !punti || !punti.length) return { coperti, scoperti };
  const raggio = new THREE.Raycaster();
  // three-mesh-bvh, se c'e', si ferma al primo colpo: qui basta sapere SE
  // c'e' qualcosa sopra, non che cosa.
  raggio.firstHitOnly = true;
  const su = new THREE.Vector3(0, 1, 0);
  const da = new THREE.Vector3();
  const alto = opz.altezzaTesta != null ? opz.altezzaTesta : 2.0;
  for (const p of punti) {
    da.set(p[0], p[1] + alto, p[2]);
    raggio.set(da, su);
    raggio.far = opz.quantoInSu || 200;
    let colpi = [];
    try { colpi = raggio.intersectObject(radice, true); } catch (e) { colpi = []; }
    (colpi && colpi.length ? coperti : scoperti).push(p);
  }
  return { coperti, scoperti };
}

/** Distanza in pianta. */
function dXZ(a, b) { return Math.hypot(a[0] - b[0], a[2] - b[2]); }

/**
 * Le SOGLIE: i punti coperti che toccano lo scoperto, raggruppati.
 *
 * Un gruppo di soglie vicine e' un accesso solo: una porta larga tre metri
 * campionata ogni due da' due punti, non due ingressi.
 */
export function accessiDaCopertura(coperti, scoperti, opz = {}) {
  const passo = opz.passo || PASSO;
  const vicino = passo * 1.6;
  if (!coperti.length || !scoperti.length) return [];

  // Chi, fra i coperti, ha dello scoperto a un passo.
  const soglie = [];
  for (const c of coperti) {
    for (const s of scoperti) {
      if (dXZ(c, s) <= vicino && Math.abs(c[1] - s[1]) <= (opz.dislivelloMax || 1.0)) {
        soglie.push(c); break;
      }
    }
  }
  if (!soglie.length) return [];

  // Gruppi di soglie che si toccano.
  const presi = new Uint8Array(soglie.length);
  const gruppi = [];
  for (let i = 0; i < soglie.length; i++) {
    if (presi[i]) continue;
    const coda = [i]; presi[i] = 1;
    const gruppo = [];
    while (coda.length) {
      const k = coda.pop();
      gruppo.push(soglie[k]);
      for (let j = 0; j < soglie.length; j++) {
        if (presi[j]) continue;
        if (dXZ(soglie[k], soglie[j]) <= vicino * 1.2 && Math.abs(soglie[k][1] - soglie[j][1]) <= 1.0) {
          presi[j] = 1; coda.push(j);
        }
      }
    }
    gruppi.push(gruppo);
  }

  const raggioPersona = (opz.persona && opz.persona.raggio) || 0.30;
  const out = [];
  for (const g of gruppi) {
    let sx = 0, sy = 0, sz = 0;
    const min = [Infinity, Infinity], max = [-Infinity, -Infinity];
    for (const p of g) {
      sx += p[0]; sy += p[1]; sz += p[2];
      if (p[0] < min[0]) min[0] = p[0]; if (p[0] > max[0]) max[0] = p[0];
      if (p[2] < min[1]) min[1] = p[2]; if (p[2] > max[1]) max[1] = p[2];
    }
    const centro = [sx / g.length, sy / g.length, sz / g.length];
    // La larghezza di un varco e' il suo lato lungo in pianta: una porta e'
    // larga quanto e' larga, non quanto e' profonda.
    const larghezza = Math.max(max[0] - min[0], max[1] - min[1]) + passo;
    if (larghezza < raggioPersona * 2) continue;
    out.push({ centro, larghezza, campioni: g.length, punti: g });
  }
  // Il piu' largo per primo: un ingresso principale e' largo, una porta di
  // servizio no. Non e' una regola di tipologia, e' una misura.
  return out.sort((a, b) => b.larghezza - a.larghezza);
}

/**
 * Quanto edificio c'e' dietro una soglia: i campioni coperti raggiungibili a
 * piedi da li'. Serve a buttare le ombre — un'ala d'aereo che copre un pezzo
 * di piazzale fa una macchia di «coperto» che non e' un ingresso.
 */
export function profondita(nm, accesso, coperti, opz = {}) {
  const limite = opz.quantiControllare || 40;
  let dentro = 0, provati = 0;
  // Si guardano i coperti piu' lontani dalla soglia: se anche quelli si
  // raggiungono, dietro c'e' un edificio vero e non una tettoia.
  const ordinati = coperti.slice().sort((a, b) => dXZ(b, accesso.centro) - dXZ(a, accesso.centro));
  for (const c of ordinati) {
    if (provati >= limite) break;
    provati++;
    const r = nm.percorsoCorrente(accesso.centro, c);
    if (r && !r.parziale) dentro++;
  }
  return provati ? dentro / provati : 0;
}

/**
 * Trova gli accessi del modello. Da chiamare una volta, a modello caricato.
 */
export function trova(THREE, radice, nm, opz = {}) {
  const punti = campiona(nm, opz);
  if (!punti.length) return { accessi: [], perche: 'nessuna superficie calpestabile campionata' };
  const passo = punti.passo || opz.passo || PASSO;
  const { coperti, scoperti } = copertura(THREE, radice, punti, opz);
  if (!coperti.length) return { accessi: [], coperti: 0, scoperti: scoperti.length,
    perche: "niente ha un tetto sopra: e' tutto aperto, non ci sono soglie" };
  if (!scoperti.length) return { accessi: [], coperti: coperti.length, scoperti: 0,
    perche: "e' tutto coperto: il modello non contiene il fuori, e senza fuori non c'e' un ingresso" };

  const grezzi = accessiDaCopertura(coperti, scoperti, { ...opz, passo });
  const minimo = opz.profonditaMinima != null ? opz.profonditaMinima : 0.25;
  const accessi = [], scartati = [];
  for (const a of grezzi) {
    a.profondita = profondita(nm, a, coperti, opz);
    if (a.profondita < minimo) { scartati.push({ ...a, perche: "dietro non c'e' edificio: e' una tettoia, non un ingresso" }); continue; }
    a.nome = 'Accesso ' + (accessi.length + 1);
    delete a.punti;   // servivano solo a misurare
    accessi.push(a);
    if (accessi.length >= (opz.massimoAccessi || 8)) break;
  }
  return { accessi, scartati, coperti: coperti.length, scoperti: scoperti.length, passo };
}

/** Riassunto in italiano normale. */
export function raccontaAccessi(r) {
  const a = (r && r.accessi) || [];
  if (!a.length) return 'Non ho trovato nessun ingresso' + (r && r.perche ? ' (' + r.perche + ').' : '.');
  return 'Ho trovato ' + a.length + (a.length === 1 ? ' ingresso' : ' ingressi') + ': '
    + a.map((x) => x.nome + ', largo ' + x.larghezza.toFixed(1) + ' m').join('; ')
    + '. Un ingresso e dove il tetto finisce e si continua a camminare.';
}

export default { PASSO, CAMPIONI_MAX, campiona, copertura, accessiDaCopertura, profondita, trova, raccontaAccessi };

// ---------------------------------------------------------------------------
// Si aggancia da solo al caricamento del modello
// ---------------------------------------------------------------------------
//
// Dopo la navmesh, che serve: senza sapere dove si cammina non si sa neanche
// dove si entra. Il risultato resta in `window.__veritasAccessi`, e da li' lo
// legge `veritas_flussi.js` per far nascere un flusso da ogni ingresso.

if (typeof window !== 'undefined') {
  const precedente = window.__veritasOnModelLoaded;
  window.__veritasOnModelLoaded = function (radice) {
    let out;
    try { out = precedente ? precedente.apply(this, arguments) : undefined; }
    catch (e) { console.error('[VERITAS accessi] errore nel passo precedente:', e); }

    const THREE = window.THREE;
    const root = radice || window.__veritasModelRoot;
    if (!THREE || !root) return out;

    // Si aspetta la navmesh: e' costruita da un altro modulo, un giro di
    // eventi dopo. Si prova qualche volta e poi si rinuncia dicendolo.
    let tentativi = 0;
    const prova = function () {
      const nm = window.__veritasNavmesh;
      if (!nm || !nm.stato()) {
        if (++tentativi > 40) { console.warn('[VERITAS accessi] navmesh non pronta: ingressi non cercati'); return; }
        setTimeout(prova, 500);
        return;
      }
      try {
        const t0 = performance.now();
        const r = trova(THREE, root, nm);
        r.ms = Math.round(performance.now() - t0);
        window.__veritasAccessi = r;
        console.log('[VERITAS accessi] ' + raccontaAccessi(r)
          + ' (' + r.coperti + ' punti al coperto, ' + r.scoperti + ' scoperti, ' + r.ms + ' ms)');
        if (r.scartati && r.scartati.length)
          console.log('[VERITAS accessi] scartate ' + r.scartati.length
            + ' soglie: ' + r.scartati.slice(0, 3).map((s) => s.perche).join(' | '));
        if (typeof window.__veritasAnnounce === 'function' && r.accessi.length > 1) {
          try { window.__veritasAnnounce(raccontaAccessi(r)); } catch (e) {}
        }
      } catch (e) {
        console.error('[VERITAS accessi] non riuscito:', e);
      }
    };
    setTimeout(prova, 300);
    return out;
  };
  window.__veritasAccessiModulo = { PASSO, campiona, copertura, accessiDaCopertura, profondita, trova, raccontaAccessi };
  console.log('[VERITAS accessi] pronto — window.__veritasAccessi dopo il caricamento');
}
