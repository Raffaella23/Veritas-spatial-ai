// Prova della navigazione:  node veritas_navigazione.test.mjs
//
// Il caso vero del 18/08/2026: i passeggeri attraversavano i muri. Il controllo
// che doveva impedirlo chiedeva «almeno il 70% del tratto ha pavimento entro
// 2,5 m?», e un muro pieno spesso SEI METRI passava quel controllo.
//
// Qui si costruiscono spazi di cui si conosce la risposta giusta — due sale e
// una porta, un vicolo cieco, una fessura troppo stretta — e si verifica che
// il percorso prodotto non attraversi mai un muro. La verifica finale non
// guarda le tappe: campiona la spezzata metro per metro e controlla ogni
// singolo punto, perché è lì che si vedeva il difetto.
import { buildOccupancyGrid, closeHoles, distanceTransform } from './veritas_perception.js';
import { creaMappa, segmentoLibero, trovaPercorso, calpestabile, cellaDa } from './veritas_navigazione.js';

let ko = 0;
const check = (n, ok, d = '') => { console.log((ok ? '  ok  ' : ' FAIL ') + n + (d ? '   ' + d : '')); if (!ok) ko++; };

/** Costruisce una mappa di cammino da una funzione "qui si cammina". */
function mappaDa(dentro, x0, x1, z0, z1, passo = 0.1, cella = 0.1, chiusura = 1) {
  const punti = [];
  for (let x = x0; x <= x1; x += passo)
    for (let z = z0; z <= z1; z += passo)
      if (dentro(x, z)) punti.push([x, 0, z]);
  let grid = buildOccupancyGrid(punti, 0, { cellSize: cella, floorTolerance: 1.2, padding: 2 });
  if (chiusura > 0) grid = closeHoles(grid, chiusura);
  const ft = distanceTransform(grid);
  return {
    mappa: creaMappa({ grid, dist: ft.dist, levelY: 0, pontechiusuraM: 2 * chiusura * cella }),
    punti,
  };
}

/** La spezzata resta sul calpestabile per tutta la sua lunghezza? */
function spezzataPulita(m, da, tappe, raggio) {
  let px = da[0], pz = da[2] != null ? da[2] : da[1];
  for (const [qx, qz] of tappe) {
    const lung = Math.hypot(qx - px, qz - pz);
    const n = Math.max(1, Math.ceil(lung / (m.cellSize * 0.5)));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const [cx, cz] = cellaDa(m, px + (qx - px) * t, pz + (qz - pz) * t);
      if (!calpestabile(m, cx, cz, raggio)) return [false, [px + (qx - px) * t, pz + (qz - pz) * t]];
    }
    px = qx; pz = qz;
  }
  return [true, null];
}

// ---------------------------------------------------------------------------
console.log('1. IL DIFETTO: un muro pieno deve fermare la linea dritta');
// Due sale 20x20, muro pieno in mezzo, nessuna porta. Griglia a 5 cm come
// quella vera su nuvola densa: un tramezzo da 15 cm deve gia' vedersi.
for (const spess of [0.15, 0.3, 0.5, 1, 2, 6]) {
  const { mappa } = mappaDa((x, z) => !(x > 20 && x < 20 + spess), 0, 42, 0, 20, 0.05, 0.05);
  check('muro spesso ' + String(spess).padStart(4) + ' m: la linea dritta e bloccata',
    !segmentoLibero(mappa, 10, 10, 32, 10));
}

// ---------------------------------------------------------------------------
console.log('\n1-bis. Il limite dichiarato: sotto il "ponte" il muro non si vede');
// Non e' un difetto da nascondere: e' una proprieta' della chiusura dei buchi,
// misurata. Serve che sia DICHIARATA, perche' nessun controllo a valle puo'
// rimediare a un muro che la mappa non ha.
{
  const { mappa } = mappaDa((x, z) => !(x > 20 && x < 20.1), 0, 42, 0, 20, 0.05, 0.1, 2);
  check('la mappa dichiara qual e il muro piu sottile che vede',
    mappa.muroMinimoVisibileM === 0.4, mappa.muroMinimoVisibileM + ' m');
  check('un muro da 10 cm sotto quella soglia risulta assente, come dichiarato',
    segmentoLibero(mappa, 10, 10, 32, 10),
    'coerente con la soglia dichiarata di ' + mappa.muroMinimoVisibileM + ' m');
}

// ---------------------------------------------------------------------------
console.log('\n2. Due sale e UNA porta spostata: si passa dalla porta');
// Muro spesso 1 m in x=[20,21]; porta larga 1,2 m in alto, z=[17.4,18.6].
const dueSale = (x, z) => {
  if (x < 0 || x > 42 || z < 0 || z > 20) return false;
  if (x > 20 && x < 21) return z > 17.4 && z < 18.6;
  return true;
};
{
  const { mappa } = mappaDa(dueSale, 0, 42, 0, 20);
  check('la linea dritta fra i due centri e bloccata', !segmentoLibero(mappa, 10, 10, 32, 10));

  const r = trovaPercorso(mappa, [10, 0, 10], [32, 0, 10]);
  check('una strada esiste ed e stata trovata', !!r, r ? r.nota : 'nessuna');
  if (r) {
    check('NON e la linea dritta', !r.diretta);
    const [pulita, dove] = spezzataPulita(mappa, [10, 0, 10], r.punti, r.raggioUsato);
    check('nessun punto del percorso sta dentro un muro', pulita,
      dove ? 'passa da x=' + dove[0].toFixed(2) + ' z=' + dove[1].toFixed(2) : 'controllati tutti');
    // Per andare da una sala all'altra DEVE passare dalla porta: quindi in
    // corrispondenza del muro deve trovarsi in alto, non a meta altezza.
    let zAlVarco = null;
    let px = 10, pz = 10;
    for (const [qx, qz] of r.punti) {
      if ((px < 20.5) !== (qx < 20.5)) {
        const t = (20.5 - px) / (qx - px);
        zAlVarco = pz + (qz - pz) * t;
      }
      px = qx; pz = qz;
    }
    check('attraversa il muro in corrispondenza della porta',
      zAlVarco !== null && zAlVarco > 17.4 && zAlVarco < 18.6,
      zAlVarco === null ? 'non attraversa mai x=20.5' : 'passa a z=' + zAlVarco.toFixed(2) + ' (porta: 17.4-18.6)');
    check('il giro e piu lungo della linea dritta, come dev essere',
      r.lunghezzaM > 22, r.lunghezzaM.toFixed(1) + ' m contro i 22 in linea d aria');
  }
}

// ---------------------------------------------------------------------------
console.log('\n3. Una fessura piu stretta di una persona non e una porta');
// Stessa pianta, ma il varco e largo 30 cm: nessuno ci passa.
{
  const fessura = (x, z) => {
    if (x < 0 || x > 42 || z < 0 || z > 20) return false;
    if (x > 20 && x < 21) return z > 17.85 && z < 18.15;
    return true;
  };
  const { mappa } = mappaDa(fessura, 0, 42, 0, 20, 0.05, 0.05);
  const r = trovaPercorso(mappa, [10, 0, 10], [32, 0, 10], { tolleranzeRaggio: [1] });
  check('con una fessura di 30 cm non si dichiara un passaggio',
    r === null, r ? 'ha risposto: ' + r.nota : 'nessuna strada, corretto');
}

// ---------------------------------------------------------------------------
console.log('\n4. Stanza unica senza ostacoli: si va dritti');
{
  const { mappa } = mappaDa((x, z) => x >= 0 && x <= 30 && z >= 0 && z <= 30, 0, 30, 0, 30);
  const r = trovaPercorso(mappa, [3, 0, 3], [27, 0, 27]);
  check('la strada e diretta', r && r.diretta, r ? r.nota : 'nessuna');
  check('una sola tappa: la destinazione', r && r.punti.length === 1, r ? r.punti.length + ' tappe' : '');
}

// ---------------------------------------------------------------------------
console.log('\n5. Destinazione murata: si dice "non lo so", non si inventa');
{
  // Un ripostiglio chiuso da tutti i lati dentro la sala.
  const murata = (x, z) => {
    if (x < 0 || x > 30 || z < 0 || z > 30) return false;
    const dentroStanzino = x > 12 && x < 18 && z > 12 && z < 18;
    const muroStanzino = x > 11 && x < 19 && z > 11 && z < 19;
    if (dentroStanzino) return true;
    if (muroStanzino) return false;
    return true;
  };
  const { mappa } = mappaDa(murata, 0, 30, 0, 30, 0.05, 0.05);
  const r = trovaPercorso(mappa, [3, 0, 3], [15, 0, 15], { tolleranzeRaggio: [1], raggioAggancioM: 1 });
  check('non viene inventata una strada dentro il locale chiuso',
    r === null, r ? 'ha risposto: ' + r.nota + ' (' + r.punti.length + ' tappe)' : 'nessuna strada, corretto');
}

// ---------------------------------------------------------------------------
console.log('\n6. Una L: si gira l angolo senza tagliarlo');
{
  const elle = (x, z) => {
    if (x < 0 || x > 30 || z < 0 || z > 30) return false;
    return (z < 6) || (x > 24);            // braccio orizzontale + braccio verticale
  };
  const { mappa } = mappaDa(elle, 0, 30, 0, 30);
  const r = trovaPercorso(mappa, [3, 0, 3], [27, 0, 27]);
  check('trova la strada attorno all angolo', !!r, r ? r.nota : 'nessuna');
  if (r) {
    const [pulita, dove] = spezzataPulita(mappa, [3, 0, 3], r.punti, r.raggioUsato);
    check('non taglia l angolo passando nel pieno', pulita,
      dove ? 'taglia a x=' + dove[0].toFixed(2) + ' z=' + dove[1].toFixed(2) : 'controllati tutti');
    check('almeno una tappa intermedia (l angolo)', r.punti.length >= 2, r.punti.length + ' tappe');
  }
}

// ---------------------------------------------------------------------------
console.log('\n7. In un corridoio si cammina in mezzo, non rasente al muro');
{
  // Corridoio largo 4 m lungo 30: la strada deve stare nella fascia centrale.
  const corr = (x, z) => x >= 0 && x <= 30 && z >= 8 && z <= 12;
  const { mappa } = mappaDa(corr, 0, 30, 6, 14);
  const r = trovaPercorso(mappa, [2, 0, 10], [28, 0, 10]);
  check('la strada esiste', !!r);
  if (r) {
    const scostamento = Math.max(...r.punti.map(([, qz]) => Math.abs(qz - 10)));
    check('resta in mezzo al corridoio', scostamento < 1.0, 'scostamento massimo ' + scostamento.toFixed(2) + ' m');
  }
}

// ---------------------------------------------------------------------------
console.log('\n8. Partenza dentro un muro: si aggancia al calpestabile piu vicino');
{
  const { mappa } = mappaDa(dueSale, 0, 42, 0, 20);
  // 20.5 / 5 e' dentro il muro (la porta e' in alto): il baricentro di una
  // stanza a L puo' cadere cosi'.
  const r = trovaPercorso(mappa, [20.5, 0, 5], [32, 0, 10]);
  check('non fallisce solo perche il punto di partenza e murato', !!r, r ? r.nota : 'nessuna');
}

console.log('\n' + (ko ? ko + ' PROVE FALLITE' : 'tutte le prove passate'));
process.exit(ko ? 1 : 0);
