// =============================================================================
// VERITAS — LA FOLLA. Le persone camminano sulla rete, non su una polilinea.
// =============================================================================
//
// PERCHE' ESISTE (17/10/2026, strada approvata da Raffaella)
//
// Raffaella sulla v20 del visore: «i percorsi sono totalmente per aria, non
// prendono le scale, non prendono la scala mobile, camminano sui muri». Misurato
// lo stesso giorno: il generatore di prima tirava una polilinea fra le tappe e
// poi la correggeva a pezzi — serpeggio, richiamo del gruppo, `resolveOverlaps`
// che spinge, rientro sul cammino, corpo Rapier che arriva dopo 4 minuti e ferma
// chi va nei muri. Risultato: 13% dei passi nel vuoto, 9% dentro una parete,
// 521 incontri di corpi a meno di 40 cm, tutti ammucchiati in cima alla scala
// mobile.
//
// Qui le persone sono una FOLLA vera: quella di navcat (`navcat/blocks` →
// `crowd`), la stessa famiglia di Recast/Detour che usano Unity e Unreal. Ogni
// persona ha un corpo (raggio), una velocita' sua, e cammina SULLA rete di dove
// si cammina (veritas_navmesh.js): non puo' uscirne, si scansa dagli altri, e i
// collegamenti (scale mobili, passaggi visti dall'occhio) li attraversa lei,
// alla sua velocita' — non a salti.
//
// NESSUN NOME DI TIPOLOGIA, NESSUNA COORDINATA (§0.9). Le missioni nascono da
// cio' che l'occhio ha capito e dalla rete: da un accesso a un altro, passando
// per le tappe che stanno sulla via. Lo stesso codice fa camminare i passeggeri
// di un aeroporto, gli studenti di una scuola, i fedeli di una chiesa.
//
// Funziona nel browser (navcat dall'importmap) e in Node (prove al banco): le
// librerie si passano da fuori.
// =============================================================================

/** La persona, come la mappa (veritas_navmesh.js, PERSONA): raggio e gradino. */
export const PERSONA = Object.freeze({ raggio: 0.30, altezza: 1.75, gradino: 0.40 });

// Una scala mobile va alla SUA velocita', non a quella di chi la prende:
// 0,5 m/s e' la velocita' nominale della norma europea (EN 115-1). Sulla scala
// fissa si sale piu' piano che in piano: la stessa misura fa da tetto.
export const VELOCITA_SU_SCALA = 0.5;
// 17/10/2026 sera — il segno dei collegamenti piu' ripidi di una rampa a norma
// (scale, scale mobili: `veritas_navmesh`, stesso numero). Chi va in carrozzina
// (profilo `accessibleOnly`) non li usa: se non c'e' un'altra strada resta dove
// arriva, e il resoconto lo dice.
export const SOLO_A_PIEDI = 2;

const STATO_OFFMESH = 2;           // navcat: AgentState.OFFMESH
const BANDIERE = 1 | 2 | 4 | 8 | 16; // svolte, schivata, distanza, scorciatoie (CrowdUpdateFlags)

const distXZ = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2]);

/** Il punto della rete piu' vicino (o null). */
export function sullaRete(nav, navMesh, p, tolleranza = [2, 4, 2]) {
  if (!p) return null;
  const r = nav.createFindNearestPolyResult();
  nav.findNearestPoly(r, navMesh, p, tolleranza, nav.DEFAULT_QUERY_FILTER);
  if (!r.success || !r.nodeRef) return null;
  return { ref: r.nodeRef, punto: [r.position[0], r.position[1], r.position[2]] };
}

/** Quanti metri a piedi da `a` a `b` (Infinity se non ci si arriva). */
export function metriAPiedi(nav, navMesh, a, b) {
  try {
    const r = nav.findPath(navMesh, a, b, [2, 4, 2], nav.DEFAULT_QUERY_FILTER);
    if (!r || !r.success || !r.path || !r.path.length || (r.flags & 4)) return Infinity;
    let L = 0, p = a;
    for (const q of r.path) { const v = q.position || q; L += Math.hypot(v[0] - p[0], v[1] - p[1], v[2] - p[2]); p = v; }
    return L;
  } catch (e) { return Infinity; }
}

/** Da `a` si arriva a piedi a `b`? (strada intera, non «il piu' vicino possibile») */
export function siRaggiunge(nav, navMesh, a, b) {
  try {
    const r = nav.findPath(navMesh, a, b, [2, 4, 2], nav.DEFAULT_QUERY_FILTER);
    return !!(r && r.success && r.path && r.path.length && !(r.flags & 4));
  } catch (e) { return false; }
}

/**
 * LA SIMULAZIONE. Ogni persona: { id, archetipo, gruppo, velocita, raggio,
 * partenza (s), tappe: [{ pos, attesa (s), seduto, nome }] }. Nasce sulla prima
 * tappa all'istante `partenza`, va alle seguenti, aspetta dove deve, e quando
 * arriva in fondo esce (non compare piu': e' salita sul mezzo, o uscita).
 *
 * @returns {{ frames, esiti, ms }} i fotogrammi nel formato del programma
 *   ({t, agents:[{id,pos,rot,state,group,archetype,stress,seduto}]}).
 */
// 17/10/2026 sera — SULLA RAMPA SI STA SULL'ASSE. Il collegamento porta l'asse
// della sua rampa (`asse`, da `veritas_navmesh.collegamentiVerticali`): si va
// dal punto di partenza all'asse, lo si percorre, e solo in fondo si piega verso
// il punto d'arrivo. In linea retta da un capo all'altro, misurato sulla scala
// mobile dell'aeroporto, con un capo agganciato di lato la persona correva
// contro la balaustra. Senza asse (un passaggio in piano) resta la linea retta.
function viaDelCollegamento(nav, navMesh, an) {
  const P0 = an.startPosition, P3 = an.endPosition;
  let punti = [P0, P3];
  try {
    const nodo = nav.getNodeByRef(navMesh, an.nodeRef);
    const oc = nodo && navMesh.offMeshConnections[nodo.offMeshConnectionId];
    if (oc && oc.asse) {
      const d = (p, q) => Math.hypot(p[0] - q[0], p[2] - q[2]);
      const [Q0, Q1] = d(P0, oc.asse[0]) <= d(P0, oc.asse[1]) ? oc.asse : [oc.asse[1], oc.asse[0]];
      const L = d(Q0, Q1);
      if (L > 1e-6) {
        const ux = (Q1[0] - Q0[0]) / L, uz = (Q1[2] - Q0[2]) / L;
        const sullAsse = (p) => {
          const t = Math.max(0, Math.min(L, (p[0] - Q0[0]) * ux + (p[2] - Q0[2]) * uz));
          return [Q0[0] + ux * t, Q0[1] + (Q1[1] - Q0[1]) * t / L, Q0[2] + uz * t];
        };
        punti = [P0, sullAsse(P0), sullAsse(P3), P3];
      }
    }
  } catch (e) { /* si resta in linea retta */ }
  const tratti = [];
  let lung = 0;
  for (let i = 1; i < punti.length; i++) {
    const l = Math.hypot(punti[i][0] - punti[i - 1][0], punti[i][1] - punti[i - 1][1], punti[i][2] - punti[i - 1][2]);
    tratti.push(l); lung += l;
  }
  return { punti, tratti, lung };
}

function puntoSullaVia(via, dist) {
  let resto = dist;
  for (let i = 0; i < via.tratti.length; i++) {
    const l = via.tratti[i];
    if (resto <= l || i === via.tratti.length - 1) {
      const f = l > 1e-9 ? Math.min(1, resto / l) : 1, A = via.punti[i], B = via.punti[i + 1];
      return [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f];
    }
    resto -= l;
  }
  return via.punti[via.punti.length - 1].slice();
}

export async function simula({ nav, crowd, navMesh, persone, durata = 400, passo = 0.5, dt = 0.1, respira = null }) {
  const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const C = crowd.create(Math.max(PERSONA.raggio, ...persone.map((p) => p.raggio || PERSONA.raggio)));
  const vive = new Map();         // id persona -> stato
  const esiti = new Map(persone.map((p) => [p.id, { id: p.id, tappe: p.tappe.length, fatte: 0, metri: 0, uscita: false, nata: false, inciampi: 0, soloAccessibile: !!p.soloAccessibile }]));
  const senzaScale = typeof nav.createDefaultQueryFilter === 'function'
    ? Object.assign(nav.createDefaultQueryFilter(), { excludeFlags: SOLO_A_PIEDI }) : nav.DEFAULT_QUERY_FILTER;
  const frames = [];
  // LA FILA (Raffaella, 17/10: «fare la fila se si tratta di fare una fila»).
  // Davanti a un banco o a un controllo (tappa con `fila`) si serve UNO alla
  // volta: chi arriva si mette dietro l'ultimo, a 0,75 m (lo spazio di una
  // persona in coda), sulla linea da cui la coda e' cominciata; quando il primo
  // ha finito, tutti avanzano di un posto. Nessuna tipologia: banco, sportello,
  // tornello, cassa — e' la stessa coda.
  const PASSO_FILA = 0.75;
  const file = new Map();
  const filaDi = (meta) => {
    const k = meta.pos.map((v) => v.toFixed(1)).join(',');
    if (!file.has(k)) { const q = sullaRete(nav, navMesh, meta.pos); file.set(k, { pos: q ? q.punto : meta.pos, dir: null, gente: [] }); }
    return file.get(k);
  };
  // LE SEDUTE (Raffaella, 17/10: «sedersi»). Ognuno si siede su una seduta vista
  // dall'occhio, LIBERA, la piu' vicina alla sosta; la libera quando riparte. Se
  // sono tutte prese aspetta in piedi.
  const occupate = new Set();
  const chiaveSedia = (c) => c.map((v) => v.toFixed(2)).join(',');
  const esciDallaFila = (s, meta) => { if (!meta || !meta.fila) return; const F = filaDi(meta); const i = F.gente.indexOf(s); if (i >= 0) F.gente.splice(i, 1); };
  const sottopassi = Math.max(1, Math.round(passo / dt));
  const totali = Math.round(durata / passo);

  const vaiA = (s, k) => {
    s.k = k;
    const meta = s.tappe[k];
    const q = sullaRete(nav, navMesh, meta.pos);
    if (!q) { s.attesa = 0; s.k = k; s.saltaSubito = true; return; }
    crowd.requestMoveTarget(C, s.agente, q.ref, q.punto);
    s.meta = q.punto; s.fermoDa = 0; s.ancora = null; s.riprova = 0;
  };

  for (let f = 0; f < totali; f++) {
    const t = f * passo;
    for (let s0 = 0; s0 < sottopassi; s0++) {
      const tt = t + s0 * dt;
      // 1. chi nasce adesso
      for (const p of persone) {
        if (vive.has(p.id) || esiti.get(p.id).nata || tt < p.partenza) continue;
        const q = sullaRete(nav, navMesh, p.tappe[0].pos);
        esiti.get(p.id).nata = true;
        if (!q || p.tappe.length < 2) continue;
        const agente = crowd.addAgent(C, navMesh, q.punto, {
          radius: p.raggio || PERSONA.raggio, height: PERSONA.altezza,
          maxAcceleration: 3.0, maxSpeed: p.velocita, collisionQueryRange: (p.raggio || PERSONA.raggio) * 12,
          separationWeight: 2.0, updateFlags: BANDIERE, queryFilter: p.soloAccessibile ? senzaScale : nav.DEFAULT_QUERY_FILTER,
          autoTraverseOffMeshConnections: false,
        });
        const s = { p, agente, tappe: p.tappe, k: 1, attesa: 0, seduto: false, ultimo: q.punto.slice(), rot: 0 };
        vive.set(p.id, s);
        vaiA(s, 1);
      }
      // 2. i collegamenti li attraversa la persona, alla sua velocita' (o a
      //    quella della scala, se il collegamento sale)
      for (const s of vive.values()) {
        const a = C.agents[s.agente];
        if (!a || a.state !== STATO_OFFMESH || !a.offMeshAnimation) continue;
        const an = a.offMeshAnimation;
        if (!an.via) an.via = viaDelCollegamento(nav, navMesh, an);
        const lung = Math.max(0.05, an.via.lung);
        const sale = Math.abs(an.endPosition[1] - an.startPosition[1]) > PERSONA.gradino;
        const v = sale ? Math.min(s.p.velocita, VELOCITA_SU_SCALA) : s.p.velocita;
        an.t = (an.t || 0) + dt;
        const fr = an.t * v / lung;
        if (fr >= 1) { crowd.completeOffMeshConnection(C, s.agente); s.suScala = false; }
        else {
          const q = puntoSullaVia(an.via, fr * lung);
          for (let k = 0; k < 3; k++) a.position[k] = q[k];
          s.suScala = sale;
        }
      }
      // 3. arrivi, attese, uscite
      for (const s of [...vive.values()]) {
        const a = C.agents[s.agente];
        if (!a) continue;
        if (s.attesa > 0) {
          s.attesa -= dt;
          if (s.attesa <= 0) {
            esciDallaFila(s, s.tappe[s.k]);
            if (s.sedia) { occupate.delete(chiaveSedia(s.sedia)); s.sedia = null; }
            s.seduto = false;
            if (s.k + 1 < s.tappe.length) vaiA(s, s.k + 1);
            else { crowd.removeAgent(C, s.agente); vive.delete(s.p.id); esiti.get(s.p.id).uscita = true; }
          }
          continue;
        }
        if (a.state === STATO_OFFMESH) continue;
        const metaF = s.tappe[s.k];
        if (metaF && metaF.fila && !s.saltaSubito) {
          const F = filaDi(metaF);
          let posto = F.gente.indexOf(s);
          if (posto < 0 && distXZ(a.position, F.pos) < 10) {
            if (!F.dir) { const dx = a.position[0] - F.pos[0], dz = a.position[2] - F.pos[2], L = Math.hypot(dx, dz) || 1; F.dir = [dx / L, dz / L]; }
            F.gente.push(s); posto = F.gente.length - 1;
          }
          if (posto > 0) {
            const slot = [F.pos[0] + F.dir[0] * PASSO_FILA * posto, F.pos[1], F.pos[2] + F.dir[1] * PASSO_FILA * posto];
            if (!s.slot || s.postoFila !== posto) {
              const q = sullaRete(nav, navMesh, slot, [1, 2, 1]);
              if (q) { crowd.requestMoveTarget(C, s.agente, q.ref, q.punto); s.slot = q.punto; s.postoFila = posto; }
            }
            s.inFila = !!s.slot && distXZ(a.position, s.slot) < 0.6;
            s.fermoDa = 0; s.ancora = null;      // chi aspetta in fila non e' bloccato
            continue;
          }
          if (posto === 0 && s.slot) {            // tocca a lui: va al banco
            const q = sullaRete(nav, navMesh, F.pos);
            if (q) { crowd.requestMoveTarget(C, s.agente, q.ref, q.punto); s.meta = q.punto; }
            s.slot = null; s.postoFila = 0; s.fermoDa = 0; s.ancora = null;
          }
          s.inFila = false;
        }
        const d = s.meta ? distXZ(a.position, s.meta) : 0;
        // 17/10/2026 sera: con la meta irraggiungibile la strada di navcat finisce
        // prima, e `isAgentAtTarget` dava «arrivato» in fondo alla strada
        // possibile (misurato: una carrozzina «arrivata» all'imbarco stando al
        // piano di sotto, 2,4 m piu' in basso). Si e' arrivati solo vicino alla
        // meta E allo stesso piano.
        const arrivato = s.saltaSubito || (s.meta
          ? d < (s.p.raggio || PERSONA.raggio) * 2.5 && Math.abs(a.position[1] - s.meta[1]) < PERSONA.gradino * 2
          : crowd.isAgentAtTarget(C, s.agente, (s.p.raggio || PERSONA.raggio) * 2.5));
        // Bloccato: in 20 s si e' mosso meno di un metro (meta irraggiungibile, o
        // calca). Non lo si giudica dalla distanza in linea d'aria: la strada vera
        // gira (per salire si va prima alla scala) e ci si allontana camminando.
        // Non si salta dentro un muro: si rinuncia a QUELLA tappa e si va avanti.
        if (!arrivato) {
          if (!s.ancora || Math.hypot(a.position[0] - s.ancora[0], a.position[1] - s.ancora[1], a.position[2] - s.ancora[2]) > 1) {
            s.ancora = [a.position[0], a.position[1], a.position[2]]; s.fermoDa = 0;
          } else s.fermoDa += dt;
          // LA STRETTOIA: due persone faccia a faccia in un passaggio largo una
          // persona (il pontile stilizzato, una porta) non si sbloccano scansandosi.
          // Dopo 6 s ferma, per 4 s chi e' bloccato si stringe e passa di fianco:
          // la folla smette di spingerlo (niente schivata e distanza), come chi
          // gira le spalle in un corridoio. Misurato al banco: in un verso solo
          // 28 persone su 28 arrivano; nei due versi, senza questa regola, 15.
          if (s.fermoDa > 6 && !s.stretto && !s.inFila) { s.stretto = 4; a.updateFlags = 1 | 8 | 16; esiti.get(s.p.id).strettoie = (esiti.get(s.p.id).strettoie || 0) + 1; }
          if (a.targetState === 1 || s.fermoDa > 20) {
            // prima di rinunciare si riprova (la calca davanti a una scala si scioglie)
            if (a.targetState !== 1 && (s.riprova || 0) < 3) {
              s.riprova = (s.riprova || 0) + 1; s.fermoDa = 0; s.ancora = null;
              const q = sullaRete(nav, navMesh, s.slot || s.tappe[s.k].pos);
              if (q) crowd.requestMoveTarget(C, s.agente, q.ref, q.punto);
              continue;
            }
            esiti.get(s.p.id).inciampi++; s.saltaSubito = true;
          }
          else continue;
        }
        const meta = s.tappe[s.k];
        const saltata = s.saltaSubito;
        if (!saltata && meta.sedute && meta.sedute.length && !s.sedia) {
          let migliore = null, dmin = Infinity;
          for (const c of meta.sedute) { if (occupate.has(chiaveSedia(c))) continue; const dd = distXZ(c, a.position); if (dd < dmin) { dmin = dd; migliore = c; } }
          if (migliore) {
            const q = sullaRete(nav, navMesh, migliore, [1.5, 1.5, 1.5]);
            if (q) { occupate.add(chiaveSedia(migliore)); s.sedia = migliore; crowd.requestMoveTarget(C, s.agente, q.ref, q.punto); s.meta = q.punto; s.fermoDa = 0; s.ancora = null; continue; }
          }
        }
        if (saltata) esciDallaFila(s, meta);
        if (!saltata) esiti.get(s.p.id).fatte++;
        s.saltaSubito = false;
        // la meta finale non raggiunta: resta li', in attesa — non sparisce
        if (saltata && s.k + 1 >= s.tappe.length) { crowd.resetMoveTarget(C, s.agente); s.attesa = durata; s.seduto = false; continue; }
        crowd.resetMoveTarget(C, s.agente);
        s.attesa = Math.max(dt, meta.attesa || 0);
        s.seduto = !!s.sedia;
      }
      for (const s of vive.values()) if (s.stretto) { s.stretto -= dt; if (s.stretto <= 0) { s.stretto = 0; const a = C.agents[s.agente]; if (a) a.updateFlags = BANDIERE; } }
      crowd.update(C, navMesh, dt);
      if (respira && s0 === 0 && f % 50 === 0) await respira();
    }
    // 4. il fotogramma
    const ag = [];
    for (const s of vive.values()) {
      const a = C.agents[s.agente];
      if (!a) continue;
      // seduto: il corpo sta SULLA seduta (che per la mappa e' un ostacolo), ai piedi della quota del pavimento
      const pos = s.attesa > 0 && s.seduto && s.sedia ? [s.sedia[0], a.position[1], s.sedia[2]] : [a.position[0], a.position[1], a.position[2]];
      const dx = pos[0] - s.ultimo[0], dz = pos[2] - s.ultimo[2];
      const m = Math.hypot(dx, dz);
      if (m > 0.02) s.rot = Math.atan2(dz, dx);
      esiti.get(s.p.id).metri += m;
      s.ultimo = pos;
      const ferma = s.attesa > 0 || !!s.inFila;
      ag.push({ id: s.p.id, pos, rot: s.rot, state: ferma ? 'WAITING' : 'MOVING', group: s.p.gruppo,
        archetype: s.p.archetipo, stress: ferma ? 0.5 : 0.2, seduto: ferma && s.seduto, suScala: !!s.suScala });
    }
    frames.push({ t, agents: ag });
  }
  const ms = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
  return { frames, esiti: [...esiti.values()], ms };
}

// -----------------------------------------------------------------------------
// LE MISSIONI — da un accesso a un altro, nate da cio' che l'occhio ha capito
// -----------------------------------------------------------------------------

/**
 * Gli ACCESSI che la rete conosce dai passaggi visti dall'occhio: un passaggio
 * il cui pavimento (un'isola) e' collegato al resto da UN SOLO lato e' un tubo
 * che porta fuori dalla rete — un pontile verso l'aereo, una passerella verso
 * la nave, un tunnel verso il binario. Il suo capo lontano e' un accesso.
 * Nessun nome: vale per qualunque passaggio che finisce dove la rete finisce.
 */
export function accessiDaiPassaggi(stato) {
  const pas = stato && stato.passaggi;
  if (!pas || !pas.catene || !stato.isole) return [];
  const tutti = [].concat(((stato.collegamenti || {}).aggiunti) || [], ((stato.cuciture || {}).aggiunti) || [], pas.aggiunti || []);
  const fuori = [];
  pas.catene.forEach((c, ci) => {
    const miei = (pas.aggiunti || []).filter((a) => a.catena === ci);
    if (!miei.length || !c.punti || !c.punti.length) return;
    for (const l of miei) {
      // l'isola del passaggio: quella del capo che ha piu' punti dentro il passaggio
      const conta = (gi) => c.punti.filter((q) => q.isola === gi).length;
      const isola = conta(l.isole[0]) >= conta(l.isole[1]) ? l.isole[0] : l.isole[1];
      const capoQui = isola === l.isole[0] ? l.da : l.a;
      // il pavimento e' DEL passaggio: l'isola sta dentro il passaggio (col suo
      // giro d'aggancio, 1,5 m). Un oggetto pieno chiamato «pontile» per sbaglio
      // non contiene nessun pavimento, e non fa nascere un accesso.
      const I = stato.isole[isola] && stato.isole[isola].ingombro, g = PERSONA.raggio * 5;
      if (!I || I.min[0] < c.min[0] - g || I.max[0] > c.max[0] + g || I.min[2] < c.min[2] - g || I.max[2] > c.max[2] + g) continue;
      // collegata da un solo lato: nessun altro collegamento tocca quell'isola
      const altri = tutti.filter((x) => x !== l && x.isole && x.isole.indexOf(isola) >= 0);
      if (altri.length) continue;
      let lontano = null, dmax = -1;
      for (const q of c.punti) {
        if (q.isola !== isola) continue;
        const d = distXZ(q.punto, capoQui);
        if (d > dmax) { dmax = d; lontano = q.punto; }
      }
      if (lontano && dmax > PERSONA.raggio * 4)
        fuori.push({ nome: c.nome, pos: lontano, da: 'passaggio', verso: 'mezzo', lunghezza: Math.round(dmax * 10) / 10 });
    }
  });
  return fuori;
}

/** Le tappe che stanno sulla via fra `a` e `b`: una per categoria, in ordine. */
function sullaVia(tappe, a, b) {
  const dx = b[0] - a[0], dz = b[2] - a[2], L = Math.hypot(dx, dz);
  if (!(L > 0)) return [];
  const largo = Math.max(8, Math.min(20, L / 4));      // come veritas_flussi.js (corridoio)
  const per = new Map();
  for (const n of tappe) {
    const px = n.pos[0] - a[0], pz = n.pos[2] - a[2];
    const t = (px * dx + pz * dz) / (L * L);
    if (t <= 0.02 || t >= 0.98) continue;
    const scarto = Math.abs(px * dz - pz * dx) / L;
    if (scarto > largo) continue;
    const gia = per.get(n.type);
    if (!gia || scarto < gia.scarto) per.set(n.type, { n, t, scarto });
  }
  return [...per.values()].sort((u, v) => u.t - v.t).map((x) => x.n);
}

/**
 * Le missioni: chi ENTRA da fuori va verso un accesso dei passaggi (in un
 * aeroporto: dalla strada all'aereo), fermandosi alle tappe che incontra; chi
 * ARRIVA da un passaggio va dritto all'uscita (dall'aereo alla strada).
 * Se l'occhio non ha dato accessi di passaggio, si va fra gli accessi piu'
 * lontani fra loro. Sempre e solo fra punti che si raggiungono a piedi.
 */
export function missioni({ nav, navMesh, stato, nodi, accessi, sedute }) {
  const daPassaggi = accessiDaiPassaggi(stato);
  const daFuori = [];
  for (const a of accessi || []) if (a && a.centro) daFuori.push({ nome: a.nome || 'accesso', pos: a.centro.slice(), da: 'accesso', fuori: !!a.fuori });
  for (const n of nodi || []) if (n && n.pos && n.type === 'origine' && !n.escluso) daFuori.push({ nome: n.name || n.label || 'ingresso', pos: n.pos.slice(), da: 'tappa', fuori: !!n.fuori });
  for (const n of nodi || []) if (n && n.pos && n.type === 'destinazione' && !n.escluso) daPassaggi.push({ nome: n.name || n.label || 'meta', pos: n.pos.slice(), da: 'tappa', verso: 'meta' });
  const sulla = (x) => { const q = sullaRete(nav, navMesh, x.pos); return q ? { ...x, pos: q.punto } : null; };
  let A = daPassaggi.map(sulla).filter(Boolean), B = daFuori.map(sulla).filter(Boolean);
  // doppioni: lo stesso accesso detto due volte
  const unici = (L) => L.filter((x, i) => !L.slice(0, i).some((y) => distXZ(x.pos, y.pos) < 8));
  A = unici(A); B = unici(B).sort((x, y) => (y.fuori ? 1 : 0) - (x.fuori ? 1 : 0));
  // 17/10/2026 sera — LO STESSO ACCESSO DETTO DA DUE FONTI. Il pontile visto e la
  // ricerca degli accessi davano lo stesso ingresso a 20 cm l'uno dall'altro
  // (misurato sull'aeroporto): ne nascevano due missioni da un punto a se' stesso,
  // e chi le riceveva nasceva gia' arrivato ed usciva subito di scena (6 persone
  // su 28). Vicino in pianta come i doppioni (8 m) e allo stesso piano: e' uno.
  const stesso = (x, y) => distXZ(x.pos, y.pos) < 8 && Math.abs(x.pos[1] - y.pos[1]) < PERSONA.altezza;
  B = B.filter((b) => !A.some((a) => stesso(a, b)));
  const tappe = (nodi || []).filter((n) => n && n.pos && !n.escluso && ['accoglienza', 'filtro', 'sosta'].indexOf(n.type) >= 0)
    .map((n) => { const q = sullaRete(nav, navMesh, n.pos); return q ? { ...n, pos: q.punto } : null; }).filter(Boolean);
  const coppie = [];
  if (A.length && B.length) {
    for (const b of B) for (const a of A) if (!stesso(a, b) && siRaggiunge(nav, navMesh, b.pos, a.pos)) coppie.push([b, a]);
  }
  if (!coppie.length) {
    const tutti = unici(A.concat(B));
    let best = null, dmax = -1;
    for (let i = 0; i < tutti.length; i++) for (let k = i + 1; k < tutti.length; k++) {
      const d = distXZ(tutti[i].pos, tutti[k].pos);
      if (d > dmax && siRaggiunge(nav, navMesh, tutti[i].pos, tutti[k].pos)) { dmax = d; best = [tutti[i], tutti[k]]; }
    }
    if (best) coppie.push(best);
  }
  const seduta = (p) => {
    let m = null, d = 6;
    for (const s of sedute || []) { const c = s.centro || s.pos; if (!c) continue; const dd = distXZ(c, p); if (dd < d) { d = dd; m = c; } }
    return m;
  };
  const fuori = [];
  for (const [entra, meta] of coppie) {
    // SULLA VIA A PIEDI, non in pianta: una tappa che allunga il cammino di piu'
    // della meta' (un banco al piano di sotto, sotto un pontile che sta sopra)
    // non e' sulla via. Misurato il 17/10: in pianta una missione scendeva sul
    // piazzale per un banco e risaliva.
    const diretto = metriAPiedi(nav, navMesh, entra.pos, meta.pos);
    const via = sullaVia(tappe, entra.pos, meta.pos).filter((n) =>
      metriAPiedi(nav, navMesh, entra.pos, n.pos) + metriAPiedi(nav, navMesh, n.pos, meta.pos) <= diretto * 1.5);
    const avanti = [{ pos: entra.pos, nome: entra.nome, attesa: 0 }]
      .concat(via.map((n) => {
        const vicine = n.type === 'sosta' ? (sedute || []).map((x) => x.centro || x.pos).filter((c) => c && distXZ(c, n.pos) < 8 && Math.abs(c[1] - n.pos[1]) < 2) : [];
        return { pos: n.pos, sedute: vicine, nome: n.name || n.label || n.type, tipo: n.type, seduto: vicine.length > 0, fila: n.type === 'filtro' || n.type === 'accoglienza',
                 attesa: n.type === 'sosta' ? 20 : n.type === 'filtro' ? 8 : 12 };
      }))
      .concat([{ pos: meta.pos, nome: meta.nome, attesa: 0 }]);
    fuori.push({ nome: 'va: ' + entra.nome + ' → ' + meta.nome, verso: 'andata', tappe: avanti });
    fuori.push({ nome: 'arriva: ' + meta.nome + ' → ' + entra.nome, verso: 'ritorno',
      tappe: [{ pos: meta.pos, nome: meta.nome, attesa: 0 }, { pos: entra.pos, nome: entra.nome, attesa: 0 }] });
  }
  return { missioni: fuori, accessi: { passaggi: A, fuori: B } };
}

/** In una riga, per la console e il velo. */
export function racconta(r) {
  if (!r) return 'nessuna folla';
  const e = r.esiti || [];
  const nate = e.filter((x) => x.nata).length, fatte = e.filter((x) => x.uscita).length;
  const metri = e.map((x) => x.metri).sort((a, b) => a - b);
  const carr = e.filter((x) => x.soloAccessibile), ferme = carr.filter((x) => x.fatte < x.tappe - 1).length;
  return e.length + ' persone, ' + nate + ' entrate, ' + fatte + ' hanno compiuto la missione; metri a testa (mediana) '
    + Math.round(metri[metri.length >> 1] || 0) + '; calcolata in ' + r.ms + ' ms'
    + (carr.length ? '; in carrozzina ' + carr.length + (ferme ? ', ' + ferme + ' senza una strada senza scale fino alla meta' : ', tutte arrivate senza scale') : '');
}

export default { PERSONA, VELOCITA_SU_SCALA, sullaRete, siRaggiunge, metriAPiedi, simula, accessiDaiPassaggi, missioni, racconta };

// -----------------------------------------------------------------------------
// Si aggancia da solo alla pagina. `genera` la chiama il giro delle traiettorie
// (index.html, `veritasFolla`) passando i profili delle persone, che stanno li'.
// -----------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.__veritasFolla = {
    PERSONA, VELOCITA_SU_SCALA, sullaRete, siRaggiunge, simula, accessiDaiPassaggi, missioni, racconta,
    async genera(nodi, opz = {}) {
      const N = window.__veritasNavmesh, U = N && N.stato && N.stato();
      if (!U || !U.navMesh || typeof N.libreria !== 'function') return null;
      const lib = await N.libreria();
      const nav = lib.nav, navMesh = U.navMesh;
      const m = missioni({ nav, navMesh, stato: U, nodi,
        accessi: (window.__veritasAccessi && window.__veritasAccessi.accessi) || [], sedute: window.__veritasSedute || [] });
      if (!m.missioni.length) {
        console.warn('[VERITAS folla] nessuna missione: servono due accessi che si raggiungano a piedi '
          + '(accessi dai passaggi ' + m.accessi.passaggi.length + ', da fuori ' + m.accessi.fuori.length + '). Resta il generatore di prima.');
        return null;
      }
      const archetipi = opz.archetipi || { tourist: { speed: 1 } };
      const chiavi = Object.keys(archetipi);
      const quante = opz.agentCount || 28, fotogrammi = opz.totalFrames || 800;
      const persone = [];
      // 17/10/2026 sera: i gruppi «famiglia» (uno su tre) prendevano proprio le
      // persone 3, 12 e 21, cioe' tutte le carrozzine: nessuna era mai in scena
      // (§13.7 p. 7). Le famiglie restano; gli altri profili si alternano fra loro.
      const altri = chiavi.filter((k) => k !== 'family');
      let giro = 0;
      for (let i = 0; i < quante; i++) {
        const gruppo = Math.floor(i / 3);
        const archetipo = gruppo % 3 === 1 && archetipi.family ? 'family' : (altri.length ? altri[giro++ % altri.length] : chiavi[i % chiavi.length]);
        const A = archetipi[archetipo] || {};
        persone.push({ id: i, archetipo, gruppo, velocita: (A.speed || 1) * (0.9 + Math.random() * 0.2),
          raggio: A.width ? A.width / 2 : PERSONA.raggio, soloAccessibile: !!A.accessibleOnly,
          partenza: (opz.partenze && opz.partenze[i]) || 0,
          tappe: m.missioni[gruppo % m.missioni.length].tappe, missione: m.missioni[gruppo % m.missioni.length].nome });
      }
      const r = await simula({ nav, crowd: lib.blocks.crowd, navMesh, persone, durata: fotogrammi * 0.5,
        respira: () => new Promise((ok) => setTimeout(ok, 0)) });
      window.__veritasFollaUltima = { missioni: m.missioni, accessi: m.accessi, esiti: r.esiti, ms: r.ms,
        persone: persone.map((p) => ({ id: p.id, archetipo: p.archetipo, missione: p.missione })) };
      console.log('[VERITAS folla] ' + racconta(r) + ' · missioni: ' + m.missioni.map((x) => x.nome).join(' | '));
      return { nodes: nodi, frames: r.frames, duration: fotogrammi * 0.5, dallaFolla: true, missioni: m.missioni };
    },
  };
  console.log('[VERITAS folla] pronta — window.__veritasFolla');
}
