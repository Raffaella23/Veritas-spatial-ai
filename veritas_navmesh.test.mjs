// Il cammino:  node veritas_navmesh.test.mjs
//
// ⚠️ NESSUNA DI QUESTE SCENE E' IL MODELLO DI RAFFAELLA.
// Sono stanze inventate qui dentro, una per difetto da bloccare. E' la
// condizione perche' questo modulo valga su un modello qualsiasi e non su uno:
// se una prova passasse solo grazie a un numero tarato sull'aeroporto, questo
// banco non se ne accorgerebbe mai.
//
// Ogni scena riproduce UNO dei difetti visti nel video del 18/08:
//   - i passeggeri escono dall'aereo camminando SULL'ALA   -> §3 e §4
//   - camminano al piano di terra sotto un'area di sopra   -> §5 e §6
//   - il percorso viene costruito attraverso un muro       -> §2
import { generateSoloNavMesh } from 'navcat/blocks';
import * as nav from 'navcat';
import {
  PERSONA, VOXEL_MAX, cellaOttima, parametri, costruisci, misura, isole, percorso, sulCammino,
} from './veritas_navmesh.js';

let ko = 0;
const check = (n, ok, d = '') => {
  console.log((ok ? '  ok  ' : ' FAIL ') + n + (d ? '   ' + d : ''));
  if (!ok) ko++;
};
const blocks = { generateSoloNavMesh };

// ---------------------------------------------------------------------------
// Officina: si costruiscono scene con scatole e piani, come farebbe chiunque
// in un programma 3D. Triangoli puri, nessuna dipendenza da three.
// ---------------------------------------------------------------------------
function scena() {
  const pos = [], idx = [];
  const vert = (x, y, z) => { pos.push(x, y, z); return pos.length / 3 - 1; };
  // ⚠️ L'ORDINE DEI VERTICI CONTA, e ci ho perso il primo giro di prove.
  // Recast guarda la normale CON IL SEGNO: un pavimento avvolto al contrario
  // punta in giu' ed e' come se non ci fosse. Le prime prove davano zero
  // poligoni su ogni scena — non un difetto della libreria, un difetto delle
  // mie scene. Con quest'ordine i piani guardano verso l'alto.
  const quad = (a, b, c, d) => { idx.push(a, c, b, a, d, c); };

  const api = {
    /** Un piano orizzontale calpestabile. */
    piano(x0, z0, x1, z1, y) {
      quad(vert(x0, y, z0), vert(x1, y, z0), vert(x1, y, z1), vert(x0, y, z1));
      return api;
    },
    /** Un piano inclinato: sale da y0 (lato z0) a y1 (lato z1). */
    rampa(x0, z0, x1, z1, y0, y1) {
      quad(vert(x0, y0, z0), vert(x1, y0, z0), vert(x1, y1, z1), vert(x0, y1, z1));
      return api;
    },
    /** Un muro verticale spesso `sp`, da (ax,az) a (bx,bz), alto `h`. */
    muro(ax, az, bx, bz, h, sp = 0.15) {
      const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
      const nx = -dz / L * sp / 2, nz = dx / L * sp / 2;
      const P = [[ax + nx, az + nz], [bx + nx, bz + nz], [bx - nx, bz - nz], [ax - nx, az - nz]];
      const b = P.map(([x, z]) => vert(x, 0, z));
      const t = P.map(([x, z]) => vert(x, h, z));
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        quad(b[i], b[j], t[j], t[i]);
      }
      quad(t[0], t[1], t[2], t[3]);
      return api;
    },
    /** Una scatola piena: ostacolo, o piano rialzato se la si usa come tale. */
    scatola(x0, y0, z0, x1, y1, z1) {
      const v = [];
      for (const y of [y0, y1]) for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]) v.push(vert(x, y, z));
      quad(v[3], v[2], v[1], v[0]);      // fondo, guarda in giu'
      quad(v[4], v[5], v[6], v[7]);      // coperchio, guarda in su'
      for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(v[i], v[j], v[4 + j], v[4 + i]); }
      return api;
    },
    geometria() {
      const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < pos.length; i += 3)
        for (let k = 0; k < 3; k++) {
          if (pos[i + k] < min[k]) min[k] = pos[i + k];
          if (pos[i + k] > max[k]) max[k] = pos[i + k];
        }
      return {
        positions: new Float32Array(pos), indices: new Uint32Array(idx),
        triangoli: idx.length / 3, mesh: 1, saltate: 0, ingombro: { min, max },
      };
    },
  };
  return api;
}

const costruisciScena = (s, opz) => costruisci(blocks, s.geometria(), opz);

// ---------------------------------------------------------------------------
console.log('1. le misure sono quelle di una persona, non di questo modello');
{
  check('raggio = mezza ellisse di Fruin (61 cm di spalle)', Math.abs(PERSONA.raggio - 0.305) < 0.01,
    PERSONA.raggio + ' m');
  check('altezza libera 2 m', PERSONA.altezza === 2);
  check('pendenza max sotto i 40°: una copertura non e un percorso', PERSONA.pendenzaMax <= 40,
    PERSONA.pendenzaMax + '°');

  // La risoluzione si RICAVA. E' la prova che il modulo non e' tarato su una
  // taglia: stanzetta e aeroporto devono costruirsi entrambi.
  const piccola = cellaOttima({ min: [0, 0, 0], max: [8, 3, 6] });
  const enorme = cellaOttima({ min: [0, 0, 0], max: [400, 25, 300] });
  check('su una stanza la cella e fine', piccola.cella <= 0.15, piccola.cella.toFixed(3) + ' m');
  check('su un terminal enorme si allarga da sola', enorme.cella > piccola.cella,
    enorme.cella.toFixed(3) + ' m contro ' + piccola.cella.toFixed(3));
  // Il margine e' l'arrotondamento all'intero delle tre dimensioni in celle,
  // non un'eccezione al tetto.
  check('e in nessuno dei due casi si sfonda il tetto di lavoro',
    piccola.voxel <= VOXEL_MAX * 1.02 && enorme.voxel <= VOXEL_MAX * 1.02,
    (piccola.voxel / 1e6).toFixed(1) + ' e ' + (enorme.voxel / 1e6).toFixed(1)
    + ' milioni di voxel su ' + (VOXEL_MAX / 1e6) + ' consentiti');
  check('e il terminal dichiara di essere grossolano', enorme.grossolana);

  // ⚠️ Il difetto misurato che costerebbe una navmesh vuota senza un errore.
  const p = parametri({ min: [0, 0, 0], max: [40, 5, 30] });
  check('i parametri sono passati ANCHE in voxel',
    p.opzioni.walkableRadiusVoxels >= 1 && p.opzioni.walkableHeightVoxels >= 1
    && p.opzioni.walkableClimbVoxels >= 1,
    'raggio ' + p.opzioni.walkableRadiusVoxels + ', altezza ' + p.opzioni.walkableHeightVoxels
    + ', gradino ' + p.opzioni.walkableClimbVoxels + ' voxel');
  check('l isola minima e in m2, quindi indipendente dalla risoluzione',
    Math.abs(p.opzioni.minRegionArea * p.opzioni.cellSize ** 2 - 4) < 1,
    (p.opzioni.minRegionArea * p.opzioni.cellSize ** 2).toFixed(1) + ' m2');
}

// ---------------------------------------------------------------------------
console.log('\n2. due stanze e una porta: si passa DALLA PORTA');
// Il difetto del 18/08 mattina: un muro pieno spesso 6 m risultava
// attraversabile. Qui il muro e' spesso 15 cm — un tramezzo vero.
{
  const s = scena().piano(0, 0, 20, 14, 0)
    .muro(10, 0, 10, 6, 3).muro(10, 8, 10, 14, 3);   // porta larga 2 m fra z=6 e z=8
  const r = costruisciScena(s);
  check('la navmesh esiste', !!r && r.poligoni > 0, r ? r.poligoni + ' poligoni' : 'NIENTE');

  // ⚠️ I due capi stanno alla STESSA quota z=12, cioe' dalla parte opposta
  //    della porta: la linea d'aria fra loro attraversa il muro in pieno.
  //    Al primo giro li avevo messi in diagonale e la linea d'aria passava
  //    esattamente in mezzo alla porta — la prova non provava niente.
  const p = percorso(nav, r.navMesh, [3, 0, 12], [17, 0, 12]);
  check('il percorso esiste', !!p && !p.parziale);
  if (p) {
    // Se attraversasse il muro passerebbe da x=10 lontano dalla porta.
    let dentroIlMuro = 0, passi = 0;
    for (let k = 1; k < p.punti.length; k++) {
      const [a, b] = [p.punti[k - 1], p.punti[k]];
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.1));
      for (let t = 0; t <= n; t++) {
        const x = a[0] + (b[0] - a[0]) * t / n, z = a[2] + (b[2] - a[2]) * t / n;
        passi++;
        if (Math.abs(x - 10) < 0.4 && (z < 5.7 || z > 8.3)) dentroIlMuro++;
      }
    }
    check('e NON attraversa il muro', dentroIlMuro === 0,
      (100 * dentroIlMuro / passi).toFixed(1) + '% del percorso dentro il muro');
    check('quindi e piu lungo della linea d aria', p.lunghezza > 14 + 1,
      p.lunghezza.toFixed(1) + ' m contro 14.0 in linea d aria');
    check('e devia verso la porta', Math.min(...p.punti.map((q) => q[2])) < 9,
      'scende fino a z=' + Math.min(...p.punti.map((q) => q[2])).toFixed(1) + ' (la porta e a z 6-8)');
  }

  // Una porta piu' stretta delle spalle non e' una porta.
  const stretta = scena().piano(0, 0, 20, 14, 0)
    .muro(10, 0, 10, 6.75, 3).muro(10, 7.25, 10, 14, 3);   // 50 cm: non ci si passa
  const rs = costruisciScena(stretta);
  const ps = percorso(nav, rs.navMesh, [3, 0, 12], [17, 0, 12]);
  check('una fessura da 50 cm non e attraversabile', !ps || ps.parziale,
    ps ? (ps.parziale ? 'percorso parziale, giusto' : 'PASSA: sbagliato') : 'nessun percorso');
}

// ---------------------------------------------------------------------------
console.log('\n3. l ALA: una superficie inclinata non e un pavimento');
// Il difetto del video, ridotto all'osso: una superficie liscia, rivolta in su
// e inclinata a 50°. Per il codice scritto a mano era pavimento.
{
  const s = scena().piano(0, 0, 20, 14, 0)
    .rampa(2, 2, 18, 12, 0.6, 12.5);   // 10 m in orizzontale, 11.9 in verticale: ~50°
  const r = costruisciScena(s);
  const alta = sulCammino(nav, r.navMesh, [10, 10, 10], [1, 1.5, 1]);
  check('sulla superficie inclinata non si cammina', !alta.ok,
    alta.ok ? 'AGGANCIATA a quota ' + alta.punto[1].toFixed(1) : 'nessuna navmesh li');

  // Controprova, ed e' quella che conta: una pendenza da scala DEVE passare,
  // altrimenti la soglia non discrimina, esclude e basta.
  const s2 = scena().piano(0, 0, 20, 14, 0).rampa(2, 2, 18, 12, 0.0, 5.0);   // ~26°
  const r2 = costruisciScena(s2);
  const su = sulCammino(nav, r2.navMesh, [10, 4.0, 10], [1, 1.5, 1]);
  check('ma una scala a 26° si sale', su.ok,
    su.ok ? 'agganciata a quota ' + su.punto[1].toFixed(1) + ' m' : 'nessuna navmesh');
}

// ---------------------------------------------------------------------------
console.log('\n4. l AEREO: staccato da terra, non ci arriva nessuno');
// Non serve nessuna soglia per dirlo: lo dice la connettivita' della mesh.
{
  const s = scena().piano(0, 0, 30, 20, 0)          // il piazzale
    .piano(10, 6, 20, 14, 4.0);                     // una piattaforma sospesa a 4 m
  const r = costruisciScena(s);
  const g = isole(r.navMesh);
  check('sono due isole distinte', g.length >= 2, g.length + ' isole');
  const aTerra = g.find((i) => i.quotaMedia < 1), sospesa = g.find((i) => i.quotaMedia > 3);
  check('una a terra e una per aria', !!aTerra && !!sospesa,
    aTerra && sospesa ? 'quota ' + aTerra.quotaMedia.toFixed(1) + ' e ' + sospesa.quotaMedia.toFixed(1) : '');
  const p = percorso(nav, r.navMesh, [3, 0, 3], [15, 4, 10], { tolleranza: [1, 0.6, 1] });
  check('da terra NON si arriva sulla piattaforma', !p || p.parziale,
    p ? (p.parziale ? 'percorso parziale, giusto' : 'CI ARRIVA: sbagliato') : 'nessun percorso');
}

// ---------------------------------------------------------------------------
console.log('\n5. due piani uniti da una rampa: quelli SI che si collegano');
// L'altra faccia del §4. Se separasse anche i piani collegati sarebbe inutile.
{
  const s = scena().piano(0, 0, 30, 10, 0)              // piano terra
    .piano(0, 16, 30, 26, 2.0)                          // piano rialzato
    .rampa(12, 10, 18, 16, 0, 2.0);                     // rampa: 2 m su 6 -> 18°
  const r = costruisciScena(s);
  const p = percorso(nav, r.navMesh, [5, 0, 5], [25, 2, 21]);
  check('si sale davvero', !!p && !p.parziale, p ? p.lunghezza.toFixed(1) + ' m' : 'nessun percorso');

  // ⚠️ La domanda giusta e' la PENDENZA, non il dislivello.
  //    Il percorso corto restituisce solo i vertici di svolta: fra il piede e
  //    la testa di una rampa il dislivello e' tutto quello della rampa, ed e'
  //    corretto. Un dislivello che NON e' una pendenza — due metri fatti sul
  //    posto — sarebbe invece un salto di piano.
  const pendenza = (q) => {
    let max = 0;
    for (let k = 1; k < q.length; k++) {
      const dy = Math.abs(q[k][1] - q[k - 1][1]);
      const dxz = Math.hypot(q[k][0] - q[k - 1][0], q[k][2] - q[k - 1][2]);
      if (dy > 0.05) max = Math.max(max, Math.atan2(dy, dxz) * 180 / Math.PI);
    }
    return max;
  };
  if (p) check('e nessun tratto e piu ripido della pendenza ammessa',
    pendenza(p.punti) <= PERSONA.pendenzaMax + 1,
    'tratto piu ripido ' + pendenza(p.punti).toFixed(0) + '° (ammessi ' + PERSONA.pendenzaMax + '°)');

  // Il percorso ADERENTE e' quello con cui camminano gli agenti: segue la
  // superficie passo passo, quindi la figura sale la rampa invece di
  // comparire in cima.
  const pa = percorso(nav, r.navMesh, [5, 0, 5], [25, 2, 21], { aderente: true, passo: 0.5 });
  check('il percorso aderente ha molti piu punti', !!pa && pa.punti.length > (p ? p.punti.length * 3 : 99),
    pa ? pa.punti.length + ' punti contro ' + (p ? p.punti.length : 0) : 'nessun percorso');
  if (pa) {
    let salto = 0;
    for (let k = 1; k < pa.punti.length; k++)
      salto = Math.max(salto, Math.abs(pa.punti[k][1] - pa.punti[k - 1][1]));
    check('e sale a piccoli scalini, senza mai saltare', salto < 0.4,
      'dislivello massimo fra due punti ' + salto.toFixed(2) + ' m');
  }

  // Senza la rampa gli stessi due piani devono restare separati.
  const senza = scena().piano(0, 0, 30, 10, 0).piano(0, 16, 30, 26, 2.0);
  const p2 = percorso(nav, costruisciScena(senza).navMesh, [5, 0, 5], [25, 2, 21]);
  check('togliendo la rampa non si sale piu', !p2 || p2.parziale,
    p2 ? (p2.parziale ? 'parziale, giusto' : 'SALTA SU: sbagliato') : 'nessun percorso');
}

// ---------------------------------------------------------------------------
console.log('\n6. sotto un soffitto basso non ci si passa');
{
  const s = scena().piano(0, 0, 24, 10, 0)
    .scatola(10, 1.4, -1, 14, 1.7, 11);     // una soletta a 1,4 m: ci si sbatte la testa
  const r = costruisciScena(s);
  const p = percorso(nav, r.navMesh, [3, 0, 5], [21, 0, 5]);
  check('non si passa sotto una soletta a 1,4 m', !p || p.parziale,
    p ? (p.parziale ? 'parziale, giusto' : 'PASSA: sbagliato') : 'nessun percorso');

  // Controprova: alzandola a 2,4 m ci si passa.
  const alto = scena().piano(0, 0, 24, 10, 0).scatola(10, 2.4, -1, 14, 2.7, 11);
  const p2 = percorso(nav, costruisciScena(alto).navMesh, [3, 0, 5], [21, 0, 5]);
  check('ma a 2,4 m si passa', !!p2 && !p2.parziale, p2 ? p2.lunghezza.toFixed(1) + ' m' : 'nessun percorso');
}

// ---------------------------------------------------------------------------
console.log('\n7. i piani dei chioschi e i monitor non sono pavimento');
// Superfici piatte, rivolte in su, alla giusta altezza: indistinguibili da un
// pavimento se si guarda solo l'inclinazione. A escluderle e' la loro AREA.
{
  const s = scena().piano(0, 0, 30, 20, 0);
  for (let i = 0; i < 12; i++)                       // dodici banchi da 1,2 x 0,8 m
    s.piano(2 + i * 2, 4, 3.2 + i * 2, 4.8, 1.0);
  const r = costruisciScena(s);
  const perAria = r.quote.filter((q) => q.quota > 0.5).reduce((a, q) => a + q.area, 0);
  check('nessuna superficie camminabile per aria', perAria < 1,
    perAria.toFixed(1) + ' m2 sopra i 50 cm');
  check('il pavimento invece c e tutto', r.area > 500, r.area.toFixed(0) + ' m2 su 600');
}

// ---------------------------------------------------------------------------
console.log('\n8. quando non si puo costruire, si dice perche');
{
  // Un modello in millimetri letti come metri: enorme e senza senso.
  const s = scena().piano(0, 0, 20000, 14000, 0);
  const r = costruisciScena(s, { voxelMax: 2e6 });
  check('un modello fuori scala non da una navmesh muta',
    !r || r.poligoni === 0 ? !!(r && r.diagnosi) : true,
    r ? (r.diagnosi || r.poligoni + ' poligoni') : 'niente');

  // Una stanza di 2 m: nessuno ci cammina.
  const min = costruisciScena(scena().piano(0, 0, 2, 1.5, 0));
  check('una stanza di 2 m lo dichiara', !min || min.poligoni === 0 ? !!(min && min.diagnosi) : true,
    min ? (min.diagnosi || min.poligoni + ' poligoni') : 'niente');
}

// ---------------------------------------------------------------------------
console.log('\n9. quanto costa');
{
  // Una pianta realistica per estensione, costruita qui: 120 x 80 m con 40
  // tramezzi. Non e' un modello vero, e' un ordine di grandezza.
  const s = scena().piano(0, 0, 120, 80, 0);
  for (let i = 0; i < 20; i++) { s.muro(6 * i, 10, 6 * i, 34, 3); s.muro(6 * i, 46, 6 * i, 70, 3); }
  const t0 = Date.now();
  const r = costruisciScena(s);
  const ms = Date.now() - t0;
  check('120 x 80 m con 40 tramezzi si costruisce sotto i 3 s', ms < 3000,
    ms + ' ms, ' + r.poligoni + ' poligoni, ' + r.area.toFixed(0) + ' m2, cella '
    + r.parametri.risoluzione.cella.toFixed(2) + ' m');
  const t1 = Date.now();
  for (let i = 0; i < 50; i++) percorso(nav, r.navMesh, [3, 0, 3], [117, 0, 77]);
  const msP = (Date.now() - t1) / 50;
  check('e un percorso costa meno di 5 ms', msP < 5, msP.toFixed(2) + ' ms');
}

console.log('\n' + (ko ? ko + ' PROVE FALLITE' : 'tutte le prove passate'));
process.exit(ko ? 1 : 0);
