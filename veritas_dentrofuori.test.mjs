// Dentro e fuori:  node veritas_dentrofuori.test.mjs
//
// Segnalato da Raffaella il 18/08/2026: le zone sono incoerenti, il parcheggio
// non viene assegnato, i cartelli finiscono sul piazzale accanto all'aereo.
//
// Misurato sul suo modello: il piazzale vale **6.038 m² di "pavimento" contro
// i 1.763 m² del pavimento del terminal** — il 64% contro il 19%. Il programma
// sceglie come piano dell'edificio la fascia di quota più popolata, e sceglie
// il piazzale. Nessuno aveva mai chiesto DOVE FINISCE L'EDIFICIO.
//
// DUE STRADE PROVATE E SCARTATE, misurate, non ipotizzate:
//   1. «ho un tetto sopra?» — su quel modello il 71% del pavimento ha il cielo
//      sopra, e dove c'è copertura l'altezza libera mediana è 1,07 m: ali,
//      arredi e teste. Il tetto non c'è.
//   2. «riempio d'acqua dal bordo» — da una porta aperta l'acqua entra e
//      allaga l'edificio. Misurato: 100% allagato. Un interno è connesso
//      all'esterno per definizione, altrimenti nessuno ci entrerebbe.
//
// Quella che regge è la domanda che si fa una persona guardandosi intorno:
// *sono circondato, o vedo campo aperto?*
import { buildOccupancyGrid, closeHoles, distanceTransform } from './veritas_perception.js';
import { creaMappa, marcaOstacoli, apertura, eFuori } from './veritas_navigazione.js';

let ko = 0;
const check = (n, ok, d = '') => { console.log((ok ? '  ok  ' : ' FAIL ') + n + (d ? '   ' + d : '')); if (!ok) ko++; };
const motore = { buildOccupancyGrid, closeHoles, distanceTransform };

/**
 * Costruisce la mappa come la costruisce il programma: il pavimento dalla
 * nuvola, le pareti lette dalla geometria del modello.
 */
function mappaDa(pavimento, muri, x0, x1, z0, z1, cella = 0.15) {
  const punti = [];
  for (let x = x0; x <= x1; x += 0.1)
    for (let z = z0; z <= z1; z += 0.1)
      if (pavimento(x, z)) punti.push([x, 0, z]);
  let grid = buildOccupancyGrid(punti, 0, { cellSize: cella, floorTolerance: 1.2, padding: 2 });
  grid = closeHoles(grid, 1);
  const ft = distanceTransform(grid);
  let m = creaMappa({ grid, dist: ft.dist, levelY: 0, pontechiusuraM: 2 * cella });
  if (muri && muri.length) {
    const campioni = [];
    for (const [ax, az, bx, bz] of muri) {
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / (cella * 0.5)));
      for (let k = 0; k <= n; k++) campioni.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
    }
    const esito = marcaOstacoli(m, campioni, motore);
    if (esito.applicata) m = esito.mappa;
  }
  return m;
}

// La pianta di prova è quella del modello di Raffaella ridotta all'osso: un
// piazzale 60x40 molto più esteso dell'edificio 20x14 che ci sta dentro, con
// una porta larga 1,4 m sulla facciata sinistra.
const E = { x0: 20, x1: 40, z0: 13, z1: 27, portaZ0: 19.3, portaZ1: 20.7 };
const piazzale = (x, z) => x >= 0 && x <= 60 && z >= 0 && z <= 40;
const muriEdificio = [
  [E.x0, E.z0, E.x1, E.z0],
  [E.x0, E.z1, E.x1, E.z1],
  [E.x1, E.z0, E.x1, E.z1],
  [E.x0, E.z0, E.x0, E.portaZ0],
  [E.x0, E.portaZ1, E.x0, E.z1],
];

// ---------------------------------------------------------------------------
console.log('1. il caso vero: un edificio in mezzo a un piazzale');
{
  const m = mappaDa(piazzale, muriEdificio, 0, 60, 0, 40);
  check('i muri sono stati letti dal modello', !!m.muroLetto);

  const aP = apertura(m, 5, 5), aS = apertura(m, 30, 20);
  check('sul piazzale lo sguardo esce quasi sempre',
    aP.frazioneAperta > 0.6, (aP.frazioneAperta * 100).toFixed(0) + '% dei raggi esce');
  // Un raggio su 32 esce: e' la porta, ed e' giusto che si veda.
  check('dentro la sala esce si e no il raggio che passa dalla porta',
    aS.frazioneAperta < 0.10, (aS.frazioneAperta * 100).toFixed(0) + '% dei raggi esce');

  check('il piazzale risulta FUORI', eFuori(m, 5, 5) === true);
  check('la sala risulta DENTRO', eFuori(m, 30, 20) === false);
  check('anche un angolo della sala risulta dentro', eFuori(m, 22, 15) === false,
    (apertura(m, 22, 15).frazioneAperta * 100).toFixed(0) + '% aperto');
}

// ---------------------------------------------------------------------------
console.log('\n2. una stanza sola scansionata NON e un piazzale');
// Il caso di un museo o di una sala rilevata da sola: fuori non c'e' niente
// perche' non e' stato modellato, non perche' sia campo aperto. Senza i muri
// letti dalla geometria la distinzione non esiste, e la stanza risultava
// aperta al 100% — misurato, ed e' il difetto che questa prova blocca.
{
  const m = mappaDa((x, z) => x >= 0 && x <= 20 && z >= 0 && z <= 14,
    [[0, 0, 20, 0], [0, 14, 20, 14], [0, 0, 0, 14], [20, 0, 20, 14]], -1, 21, -1, 15);
  const a = apertura(m, 10, 7);
  check('la stanza risulta DENTRO', eFuori(m, 10, 7) === false,
    (a.frazioneAperta * 100).toFixed(0) + '% aperto');
}

// ---------------------------------------------------------------------------
console.log('\n3. davanti alla facciata si e ancora fuori');
// Conta perche' l'ingresso va messo li': se il punto davanti alla porta
// risultasse "dentro", la partenza finirebbe dentro l'edificio.
{
  const m = mappaDa(piazzale, muriEdificio, 0, 60, 0, 40);
  check('a due metri dalla facciata si e fuori', eFuori(m, 18, 20) === true,
    (apertura(m, 18, 20).frazioneAperta * 100).toFixed(0) + '% aperto');
}

// ---------------------------------------------------------------------------
console.log('\n4. sulla soglia si puo rispondere "non lo so", e va bene');
// In mezzo a una porta si vede fuori quanto dentro. La soglia lascia apposta
// una fascia grigia: meglio dichiarare l'incertezza che spostare una zona con
// la sicurezza di una misura che non c'e'.
{
  const m = mappaDa(piazzale, muriEdificio, 0, 60, 0, 40);
  const r = eFuori(m, 20.6, 20);
  check('sulla soglia non si dichiara "piazzale"', r !== true,
    'risposta: ' + r + '   (' + (apertura(m, 20.6, 20).frazioneAperta * 100).toFixed(0) + '% aperto)');
}

// ---------------------------------------------------------------------------
console.log('\n5. due edifici nello stesso piazzale');
{
  const muriDue = [];
  for (const [ax, bx] of [[8, 24], [36, 52]])
    muriDue.push([ax, 13, bx, 13], [ax, 27, bx, 27], [ax, 13, ax, 27], [bx, 13, bx, 27]);
  const m = mappaDa(piazzale, muriDue, 0, 60, 0, 40);
  check('il primo e dentro', eFuori(m, 16, 20) === false);
  check('il secondo e dentro', eFuori(m, 44, 20) === false);
  check('il piazzale fra i due resta fuori', eFuori(m, 30, 20) === true,
    (apertura(m, 30, 20).frazioneAperta * 100).toFixed(0) + '% aperto');
}

// ---------------------------------------------------------------------------
console.log('\n6. un capannone aperto su un lato: si vede che e mezzo aperto');
{
  const m = mappaDa(piazzale, muriEdificio.slice(0, 3), 0, 60, 0, 40);
  const a = apertura(m, 30, 20), aP = apertura(m, 5, 5);
  check('da dentro si vede il campo aperto dal lato che manca',
    a.frazioneAperta > 0, (a.frazioneAperta * 100).toFixed(0) + '% dei raggi esce');
  check('ma resta piu chiuso di un piazzale', a.frazioneAperta < aP.frazioneAperta,
    (a.frazioneAperta * 100).toFixed(0) + '% contro il ' + (aP.frazioneAperta * 100).toFixed(0) + '%');
}

// ---------------------------------------------------------------------------
console.log('\n7. senza muri letti si risponde lo stesso, dichiarandolo');
// Su una scansione a gaussiane non c'e' geometria di pareti da leggere: resta
// il criterio grezzo (c'e' pavimento oltre l'ostacolo?), da usare sapendo che
// e' meno affidabile. Qui i muri sono buchi nel pavimento, non geometria.
{
  const m = mappaDa((x, z) => {
    if (x < 0 || x > 60 || z < 0 || z > 40) return false;
    // Muro spesso 1 m: sotto i 30 cm la chiusura dei buchi lo salderebbe e non
    // resterebbe niente da vedere — e' il limite gia' misurato il 18/08, ed e'
    // proprio la ragione per cui i muri e' meglio leggerli dal modello.
    if (x > 20 && x < 40 && z > 13 && z < 27) return x > 21 && x < 39 && z > 14 && z < 26;
    return true;
  }, null, 0, 60, 0, 40);
  check('la mappa non dichiara muri letti', !m.muroLetto);
  const a = apertura(m, 30, 20);
  check('e la misura lo dichiara', a.daMuriLetti === false);
  check('la sala risulta comunque dentro', eFuori(m, 30, 20) === false,
    (a.frazioneAperta * 100).toFixed(0) + '% aperto');
  check('e il piazzale fuori', eFuori(m, 5, 5) === true,
    (apertura(m, 5, 5).frazioneAperta * 100).toFixed(0) + '% aperto');
}

console.log('\n' + (ko ? ko + ' PROVE FALLITE' : 'tutte le prove passate'));
process.exit(ko ? 1 : 0);
