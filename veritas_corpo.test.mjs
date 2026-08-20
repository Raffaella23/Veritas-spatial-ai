// Il CORPO: nessuno attraversa i muri.
//
//     node veritas_corpo.test.mjs
//
// ⚠️ Nessuna di queste prove usa il modello di Raffaella. Ogni difetto ha la
//    sua scena inventata, costruita apposta per riprodurlo. E' la condizione
//    perche' il modulo valga su un modello QUALSIASI e non su uno — che e'
//    esattamente la richiesta:
//
//      «Deve trovare un motore fisico da applicare nell'applicazione, non
//       risolvere il problema sul modello X. Ne dovrai trovare milioni.»
//
// I quattro difetti visti a schermo, e la scena che li riproduce:
//
//   attraversano i muri   -> un muro pieno in mezzo alla stanza
//   attraversano i solai  -> due piani sovrapposti
//   fluttuano             -> una tappa pianificata a tre metri d'aria
//   non usano le scale    -> una rampa di gradini da 17 cm
//
// e il quinto, che era gia' stato corretto altrove e non deve tornare:
//
//   camminano sulle ali   -> una falda a 60°, che non si sale

import RAPIER from '@dimforge/rapier3d-compat';
import * as CORPO from './veritas_corpo.js';
import * as NAVMESH from './veritas_navmesh.js';

await RAPIER.init();

let ko = 0;
const check = (n, ok, d = '') => {
  console.log((ok ? '  ok  ' : ' FAIL ') + n + (d ? '   ' + d : ''));
  if (!ok) ko++;
};

// --- attrezzi per costruire scene di triangoli --------------------------------
function Scatole() {
  const pos = [], idx = [];
  return {
    box(cx, cy, cz, sx, sy, sz) {
      const b = pos.length / 3;
      const v = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
      for (const [x, y, z] of v) pos.push(cx + x*sx/2, cy + y*sy/2, cz + z*sz/2);
      const f = [[0,1,2],[0,2,3],[4,6,5],[4,7,6],[0,4,5],[0,5,1],[3,2,6],[3,6,7],[0,3,7],[0,7,4],[1,5,6],[1,6,2]];
      for (const t of f) idx.push(b+t[0], b+t[1], b+t[2]);
      return this;
    },
    geometria() {
      const min = [Infinity,Infinity,Infinity], max = [-Infinity,-Infinity,-Infinity];
      for (let i = 0; i < pos.length; i += 3)
        for (let k = 0; k < 3; k++) {
          if (pos[i+k] < min[k]) min[k] = pos[i+k];
          if (pos[i+k] > max[k]) max[k] = pos[i+k];
        }
      return {
        positions: new Float32Array(pos), indices: new Uint32Array(idx),
        triangoli: idx.length / 3, ingombro: { min, max },
      };
    },
  };
}

// Una traiettoria PIANIFICATA: un agente che va in linea retta da A a B,
// esattamente come la scrive oggi il generatore — quota compresa.
function pianoRetto(da, a, passi, dt = 0.5) {
  const frames = [];
  for (let i = 0; i <= passi; i++) {
    const u = i / passi;
    frames.push({
      t: i * dt,
      agents: [{
        id: 0, state: 'MOVING', group: 0, archetype: 'business', stress: 0.2, rot: 0,
        pos: [da[0] + (a[0]-da[0])*u, da[1] + (a[1]-da[1])*u, da[2] + (a[2]-da[2])*u],
      }],
    });
  }
  return { nodes: [], frames, duration: passi * dt };
}

// Il dislivello piu' grande fra due fotogrammi consecutivi. Serve a
// distinguere «ha salito le scale» da «e' stato teletrasportato in cima».
function massimoSalto(quote) {
  let m = 0;
  for (let i = 1; i < quote.length; i++) m = Math.max(m, Math.abs(quote[i] - quote[i - 1]));
  return m;
}

// =============================================================================
console.log('\n— le misure sono le stesse del cammino —');
// =============================================================================
// Non e' un dettaglio: una navmesh costruita per un corpo da 0,30 m di raggio
// e un corpo fisico piu' largo produrrebbe percorsi che passano da porte in
// cui il corpo non entra. Devono essere LA STESSA dichiarazione.
for (const k of ['raggio', 'altezza', 'gradino', 'pendenzaMax']) {
  check(`${k}: corpo ${CORPO.MISURE[k]} = cammino ${NAVMESH.PERSONA[k]}`,
    CORPO.MISURE[k] === NAVMESH.PERSONA[k]);
}

// =============================================================================
console.log('\n— attraversano i muri —');
// =============================================================================
// Stanza 40 x 20, muro PIENO alto 3 m a x = 20. Il piano tira dritto da x = 5
// a x = 35: e' esattamente cio' che fa oggi il codice di riserva quando non
// trova un percorso. Il corpo deve fermarsi al muro.
{
  const g = Scatole().box(20, -0.05, 10, 40, 0.1, 20).box(20, 1.5, 10, 0.2, 3, 20).geometria();
  const scena = CORPO.mondoDaGeometria(RAPIER, g);
  const piano = pianoRetto([5, 0, 10], [35, 0, 10], 60);
  const e = CORPO.filtraFrames(scena, piano.frames);
  check('il filtro ha lavorato', e.ok, e.perche || '');
  const fine = e.frames[e.frames.length - 1].agents[0].pos;
  check('il corpo si ferma prima del muro (x < 19,9)', fine[0] < 19.9, 'x = ' + fine[0].toFixed(3));
  check('e non e passato dall altra parte', fine[0] < 20, 'x = ' + fine[0].toFixed(3));
  check('zero posizioni dentro un solido', e.dentroUnSolido === 0, 'dentro = ' + e.dentroUnSolido);
  // Il piano lo voleva a x = 35: lo scostamento DEVE essere grande. E' la
  // misura di quanto il piano aveva torto, e va dichiarata, non nascosta.
  check('lo scostamento dichiara il disaccordo col piano', e.scostamentoMassimo > 10,
    'max = ' + e.scostamentoMassimo + ' m');
  console.log('       piano: x 5 -> 35 dentro un muro | corpo: si ferma a x '
    + fine[0].toFixed(2) + ', scostamento mediano ' + e.scostamentoMediano + ' m');
}

// =============================================================================
console.log('\n— attraversano i solai —');
// =============================================================================
// Due piani: pavimento a 0, solaio a 4. Il piano pianificato sale in diagonale
// dal piano terra al primo piano ATTRAVERSANDO il solaio, come fa oggi
// l'interpolazione della quota fra due tappe a quote diverse.
{
  const g = Scatole()
    .box(20, -0.05, 10, 40, 0.1, 20)     // piano terra
    .box(20, 4.00, 10, 40, 0.2, 20)      // solaio pieno, nessuna apertura
    .geometria();
  const scena = CORPO.mondoDaGeometria(RAPIER, g);
  const piano = pianoRetto([5, 0, 10], [30, 4.5, 10], 60);
  const e = CORPO.filtraFrames(scena, piano.frames);
  const fine = e.frames[e.frames.length - 1].agents[0].pos;
  check('il corpo resta sotto il solaio', fine[1] < 1.0, 'y = ' + fine[1].toFixed(3));
  check('zero posizioni dentro un solido', e.dentroUnSolido === 0, 'dentro = ' + e.dentroUnSolido);
  const quote = e.frames.map((f) => f.agents[0].pos[1]);
  check('nessun fotogramma sopra il solaio', Math.max(...quote) < 3.9,
    'y max = ' + Math.max(...quote).toFixed(3));
  console.log('       piano: sale da y 0 a y 4,5 dentro un solaio | corpo: resta a y '
    + fine[1].toFixed(2));
}

// =============================================================================
console.log('\n— fluttuano —');
// =============================================================================
// La quota di una zona e' il baricentro del suo grappolo: su un modello vero
// mescola pavimento, pedane e arredi, e finisce a mezz'aria. Il piano qui
// manda l'agente a 3 m d'aria sopra un pavimento a 0. Deve appoggiarsi.
{
  const g = Scatole().box(20, -0.05, 10, 40, 0.1, 20).geometria();
  const scena = CORPO.mondoDaGeometria(RAPIER, g);
  const piano = pianoRetto([5, 3.0, 10], [30, 3.0, 10], 60);
  const e = CORPO.filtraFrames(scena, piano.frames);
  const quote = e.frames.map((f) => f.agents[0].pos[1]);
  const finale = quote[quote.length - 1];
  check('il piede appoggia a terra (|y| < 5 cm)', Math.abs(finale) < 0.05, 'y = ' + finale.toFixed(4));
  check('non affonda nel pavimento', finale > -0.02, 'y = ' + finale.toFixed(4));
  check('e ci resta per tutto il percorso', Math.max(...quote.slice(5)) < 0.05,
    'y max dopo la caduta = ' + Math.max(...quote.slice(5)).toFixed(4));
  console.log('       piano: y 3,00 m per tutto il tragitto | corpo: y ' + finale.toFixed(3) + ' m');
}

// =============================================================================
console.log('\n— non usano le scale —');
// =============================================================================
// Una rampa di 12 gradini da 17 cm di alzata e 30 di pedata (DM 236/89), che
// porta a un pianerottolo a 2,04 m. Il piano chiede solo di andare avanti in
// orizzontale, a quota zero: se il corpo sale, e' il controller che ha salito
// i gradini da solo — che e' il punto.
// ⚠️ Il pianerottolo deve attaccarsi alla rampa. La prima versione di questa
//    scena lo metteva 1,75 m piu' in la', e il corpo saliva tutta la rampa
//    fino a 2,07 m per poi cadere nel vuoto: sembrava che le scale non si
//    salissero, e invece si salivano. Il difetto era nella prova, non nel
//    motore — e per accorgersene e' servito stampare la quota lungo il
//    percorso invece di guardare solo il punto d'arrivo.
{
  const s = Scatole().box(20, -0.05, 10, 40, 0.1, 20);
  const N = 12, PEDATA = 0.30, ALZATA = 0.17;
  for (let i = 0; i < N; i++)
    s.box(10 + i * PEDATA + PEDATA / 2, (i + 1) * ALZATA / 2, 10, PEDATA, (i + 1) * ALZATA, 6);
  const xCima = 10 + N * PEDATA;                       // 13,60
  s.box(xCima + 3, N * ALZATA - 0.05, 10, 6, 0.1, 6);  // pianerottolo, attaccato
  const scena = CORPO.mondoDaGeometria(RAPIER, s.geometria());
  const piano = pianoRetto([6, 0, 10], [16, 0, 10], 60);
  const e = CORPO.filtraFrames(scena, piano.frames);
  const fine = e.frames[e.frames.length - 1].agents[0].pos;
  const quote = e.frames.map((f) => f.agents[0].pos[1]);
  check('il corpo ha salito la rampa (y > 1,8 m)', fine[1] > 1.8, 'y = ' + fine[1].toFixed(3));
  check('ed e arrivato oltre la cima della rampa', fine[0] > xCima, 'x = ' + fine[0].toFixed(3));
  check('ed e salito un gradino alla volta, non di schianto',
    massimoSalto(quote) < CORPO.MISURE.gradino + 0.05, 'salto max = ' + massimoSalto(quote).toFixed(3) + ' m');
  check('zero posizioni dentro un solido', e.dentroUnSolido === 0, 'dentro = ' + e.dentroUnSolido);
  console.log('       piano: y 0,00 per tutto il tragitto | corpo: sale a y '
    + fine[1].toFixed(2) + ' m senza che nessuno glielo dica');
}

// =============================================================================
console.log('\n— camminano sulle ali (la pendenza) —');
// =============================================================================
// Una falda a 60°: il tetto di un edificio, l'ala di un aereo, un terrapieno.
// Sopra i 35° dichiarati non si sale. Il piano ci prova.
{
  // rampa costruita a gradoni fini, cosi' e' una superficie inclinata vera
  const s = Scatole().box(20, -0.05, 10, 40, 0.1, 20);
  for (let i = 0; i < 60; i++) {
    const x = 15 + i * 0.05, h = i * 0.05 * Math.tan(60 * Math.PI / 180);
    s.box(x, h / 2, 10, 0.05, Math.max(h, 0.01), 8);
  }
  const scena = CORPO.mondoDaGeometria(RAPIER, s.geometria());
  const piano = pianoRetto([6, 0, 10], [20, 0, 10], 60);
  const e = CORPO.filtraFrames(scena, piano.frames);
  const quote = e.frames.map((f) => f.agents[0].pos[1]);
  const yMax = Math.max(...quote);
  // Tollera l'autostep: il primo gradone da 40 cm si sale per definizione.
  check('non risale la falda a 60° (y max <= gradino)', yMax <= CORPO.MISURE.gradino + 0.1,
    'y max = ' + yMax.toFixed(3) + ' m');
  console.log('       piano: attraversa una falda a 60° | corpo: si ferma a y ' + yMax.toFixed(2) + ' m');
}

// =============================================================================
console.log('\n— quello che il modulo NON deve fare —');
// =============================================================================
// In campo aperto il corpo non deve inventare niente: se il piano e' buono,
// la traiettoria camminata gli somiglia. Altrimenti avremmo scambiato un
// difetto con un altro.
{
  const g = Scatole().box(20, -0.05, 10, 40, 0.1, 20).geometria();
  const scena = CORPO.mondoDaGeometria(RAPIER, g);
  const piano = pianoRetto([5, 0, 10], [30, 0, 10], 60);
  const e = CORPO.filtraFrames(scena, piano.frames);
  check('in campo libero segue il piano (scostamento mediano < 10 cm)',
    e.scostamentoMediano < 0.10, 'mediano = ' + e.scostamentoMediano + ' m');
  check('e arriva dove il piano voleva', Math.abs(e.frames[e.frames.length-1].agents[0].pos[0] - 30) < 0.5,
    'x = ' + e.frames[e.frames.length-1].agents[0].pos[0].toFixed(2));
}
{
  // I campi degli agenti non si toccano: questo modulo cambia le POSIZIONI.
  const g = Scatole().box(20, -0.05, 10, 40, 0.1, 20).geometria();
  const scena = CORPO.mondoDaGeometria(RAPIER, g);
  const piano = pianoRetto([5, 0, 10], [30, 0, 10], 10);
  piano.frames[5].agents[0].archetype = 'wheelchair';
  piano.frames[5].agents[0].stress = 0.77;
  const e = CORPO.filtraFrames(scena, piano.frames);
  const a = e.frames[5].agents[0];
  check('archetipo conservato', a.archetype === 'wheelchair', a.archetype);
  check('stress conservato', a.stress === 0.77, String(a.stress));
  check('id conservato', a.id === 0, String(a.id));
  check('numero di fotogrammi conservato', e.frames.length === piano.frames.length,
    e.frames.length + ' vs ' + piano.frames.length);
  check('il tempo t e conservato', e.frames[5].t === piano.frames[5].t);
}
{
  // Un fotogramma che non descrive un agente resta come sta: chi decide quanti
  // agenti ci sono e' il generatore, non il corpo.
  const g = Scatole().box(20, -0.05, 10, 40, 0.1, 20).geometria();
  const scena = CORPO.mondoDaGeometria(RAPIER, g);
  const piano = pianoRetto([5, 0, 10], [30, 0, 10], 10);
  piano.frames[0].agents = [];
  const e = CORPO.filtraFrames(scena, piano.frames);
  check('un fotogramma senza agenti resta vuoto', e.frames[0].agents.length === 0);
  check('un solo corpo creato', e.corpi === 1, 'corpi = ' + e.corpi);
}

// =============================================================================
console.log('\n— nascere dentro un solido —');
// =============================================================================
// E' LA cosa che decide se il motore fisico regge un edificio vero. Un piano
// che manda una persona dentro un muro non e' un caso raro: e' il caso normale
// quando le tappe stanno su piani diversi e il percorso e' una retta. Un corpo
// nato li' dentro non ne esce piu' da solo, costa duecento volte tanto e non
// produce niente di vero.
{
  // Il piano fa nascere l'agente NEL PIENO di un pilastro 2 x 2 m.
  const g = Scatole().box(20, -0.15, 10, 40, 0.3, 20).box(10, 1.5, 10, 2, 3, 2).geometria();
  const scena = CORPO.mondoDaGeometria(RAPIER, g);
  const piano = pianoRetto([10, 0, 10], [30, 0, 10], 40);
  const e = CORPO.filtraFrames(scena, piano.frames);
  check('il filtro ha lavorato', e.ok, e.perche || '');
  check('lo dichiara: un corpo e nato dentro un solido', e.natiDentro === 1, 'natiDentro = ' + e.natiDentro);
  check('ma non e rimasto dentro', e.dentroUnSolido === 0, 'dentro = ' + e.dentroUnSolido);
  check('e non e stato dichiarato impossibile: un posto libero c era',
    e.impossibili === 0, 'impossibili = ' + e.impossibili);
  const p0 = e.frames[0].agents[0].pos;
  const spostato = Math.hypot(p0[0] - 10, p0[2] - 10);
  check('lo ha spostato POCO, sul libero piu vicino (< 3 m)', spostato > 0 && spostato < 3,
    spostato.toFixed(2) + ' m');
  console.log('       piano: nascita nel pieno di un pilastro | corpo: spostato di '
    + spostato.toFixed(2) + ' m sul punto libero piu vicino');
}
{
  // Nessun posto libero: dentro un blocco pieno da 30 m. Va DETTO, non
  // macinato per ottocento fotogrammi.
  const g = Scatole().box(20, -0.15, 10, 40, 0.3, 20).box(20, 1.5, 10, 30, 3, 18).geometria();
  const scena = CORPO.mondoDaGeometria(RAPIER, g);
  const piano = pianoRetto([20, 0, 10], [25, 0, 10], 20);
  const e = CORPO.filtraFrames(scena, piano.frames);
  check('un agente senza un posto libero attorno viene dichiarato',
    e.impossibili === 1, 'impossibili = ' + e.impossibili);
  check('e non viene simulato affatto', e.corpi === 0, 'corpi = ' + e.corpi);
  check('la sua posizione resta quella del piano, non inventata',
    e.frames[10].agents[0].pos[0] === piano.frames[10].agents[0].pos[0]);
  check('e il racconto lo dice', /non li ho fatti camminare|non lo ho fatto camminare|il piano li metteva/
    .test(CORPO.racconta(e)), CORPO.racconta(e).slice(-120));
}
{
  // La ricerca non deve spostare chi sta gia' bene.
  const g = Scatole().box(20, -0.15, 10, 40, 0.3, 20).geometria();
  const scena = CORPO.mondoDaGeometria(RAPIER, g);
  const piano = pianoRetto([5, 0, 10], [30, 0, 10], 40);
  const e = CORPO.filtraFrames(scena, piano.frames);
  check('in campo libero nessuno viene spostato alla nascita', e.natiDentro === 0,
    'natiDentro = ' + e.natiDentro);
  check('e nessuno viene dichiarato impossibile', e.impossibili === 0);
}

// =============================================================================
console.log('\n— la resa, misurata —');
// =============================================================================
// Il costo va dichiarato prima di prometterlo. Questo e' il caso vero:
// 28 corpi, 800 fotogrammi, un edificio con 200 muri.
{
  const s = Scatole().box(60, -0.05, 40, 120, 0.1, 80);
  for (let i = 0; i < 200; i++) s.box((i % 20) * 6 + 3, 1.5, Math.floor(i / 20) * 6 + 3, 0.2, 3, 5);
  const g = s.geometria();
  const t0 = Date.now();
  const scena = CORPO.mondoDaGeometria(RAPIER, g);
  const msMondo = Date.now() - t0;

  const N = 28, F = 800;
  const frames = [];
  for (let f = 0; f <= F; f++) {
    const agents = [];
    for (let i = 0; i < N; i++) {
      const u = f / F;
      agents.push({ id: i, state: 'MOVING', group: i % 9, archetype: 'business', stress: 0.2, rot: 0,
        pos: [5 + u * 100, 0, 4 + (i % 14) * 5.5] });
    }
    frames.push({ t: f * 0.5, agents });
  }
  const t1 = Date.now();
  const e = CORPO.filtraFrames(scena, frames, { tettoMs: 120000 });
  const ms = Date.now() - t1;
  check('il filtro regge il caso vero', e.ok, e.perche || '');
  check('zero posizioni dentro un solido', e.dentroUnSolido === 0, 'dentro = ' + e.dentroUnSolido);
  console.log(`       ${g.triangoli.toLocaleString('it-IT')} triangoli, collisore in ${msMondo} ms`);
  console.log(`       ${N} corpi x ${F} fotogrammi = ${e.mosse.toLocaleString('it-IT')} passi in ${ms} ms `
    + `(${(ms / F).toFixed(2)} ms/fotogramma)`);
  console.log('       scostamento dal piano: ' + e.scostamentoMediano + ' m mediano, '
    + e.scostamentoMassimo + ' m massimo');
  // Il tetto e' quello che protegge la pagina dal bloccarsi: se questo caso lo
  // sfonda, il tetto e' sbagliato o il filtro e' peggiorato.
  check('sta sotto il tetto dichiarato di 15 s', ms < 15000, ms + ' ms');
}

// =============================================================================
console.log('\n— quando non si puo, si dice —');
// =============================================================================
{
  const g = Scatole().box(20, -0.05, 10, 40, 0.1, 20).geometria();
  const scena = CORPO.mondoDaGeometria(RAPIER, g);
  const piano = pianoRetto([5, 0, 10], [30, 0, 10], 200);
  const e = CORPO.filtraFrames(scena, piano.frames, { tettoMs: 0 });
  check('oltre il tempo massimo non restituisce mezzo lavoro', !e.ok);
  check('e restituisce il piano intatto', e.frames === piano.frames);
  check('e dice perche', /tempo massimo/.test(e.perche || ''), e.perche);
  check('e il racconto lo dichiara', /non applicato/.test(CORPO.racconta(e)));
}
{
  check('senza geometria non costruisce un mondo',
    CORPO.mondoDaGeometria(RAPIER, { positions: new Float32Array(0), indices: new Uint32Array(0) }) === null);
  check('senza fotogrammi lo dice', CORPO.filtraFrames({ misure: CORPO.MISURE }, []).ok === false);
}

console.log(ko ? `\n${ko} PROVE FALLITE\n` : '\ntutte le prove passano\n');
process.exit(ko ? 1 : 0);
