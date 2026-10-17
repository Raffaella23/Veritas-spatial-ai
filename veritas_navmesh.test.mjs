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
  PERSONA, VOXEL_MAX, cellaOttima, parametri, costruisci, misura, isole, percorso, sulCammino, ALTEZZA_LIBERA_NORMA, collegamentiOrizzontali,
  geometriaDaModello, eSegnaleticaATerra, costruisciDaScena, confermatoDallOcchio } from './veritas_navmesh.js';

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
  // ⛔ QUI C'ERA `PERSONA.altezza === 2`, e chiamava quel numero «altezza
  //    libera». Era la prova che teneva fermo l'errore: 2,00 m e' l'altezza
  //    libera che la NORMA chiede a un passaggio, non la statura di nessuno.
  //    Con quel corpo la mappa cancellava 20 m di terminal con 1,75 m di cielo,
  //    dove le 344 figure disegnate nel modello (mediana 1,63 m) passavano
  //    tutte. Raffaella, 22/09/2026: «l'uomo medio al massimo sta fra un 1,70
  //    e un 1,80. Se l'hai messo arbitrariamente a 2 metri, hai sbagliato».
  check('la statura sta fra 1,70 e 1,80: e un uomo, non un requisito di norma',
    PERSONA.altezza >= 1.70 && PERSONA.altezza <= 1.80, PERSONA.altezza + ' m');
  check('e non e tornata a essere l altezza libera di norma',
    PERSONA.altezza !== ALTEZZA_LIBERA_NORMA && ALTEZZA_LIBERA_NORMA === 2.00,
    'statura ' + PERSONA.altezza + ' m, norma ' + ALTEZZA_LIBERA_NORMA + ' m');
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

// ---------------------------------------------------------------------------
console.log('\n10. una parete fra due piastre: piena resta chiusa, con un\'apertura si passa');
{
  // Il terminal del 24/09: due piastre di pavimento con una fessura sotto una
  // parete vera. Il punto PIU' VICINO fra le piastre sta dove la parete e'
  // piena (il pezzetto sporgente a z 0-2); l'apertura sta a z 10-12. Prima si
  // provava solo il punto piu' vicino, e l'apertura non veniva mai guardata.
  const due = (conApertura) => {
    const s = scena().piano(0, 0, 20, 14, 0).piano(20.6, 0, 40.6, 14, 0).piano(20.45, 0, 20.6, 2, 0);
    if (conApertura) s.muro(20.3, 0, 20.3, 10, 3).muro(20.3, 12, 20.3, 14, 3);
    else s.muro(20.3, 0, 20.3, 14, 3);
    const geo = s.geometria();
    const r = costruisci(blocks, geo);
    const c = collegamentiOrizzontali(nav, r.navMesh, isole(r.navMesh), geo);
    const ps = percorso(nav, r.navMesh, [5, 0, 7], [35, 0, 7]);
    return { c, passa: !!(ps && !ps.parziale) };
  };
  const piena = due(false), aperta = due(true);
  check('parete piena: nessun ponte, non si passa', !piena.c.aggiunti.length && !piena.passa,
    piena.c.aggiunti.length + ' ponti · ' + (piena.c.scartati[0] || {}).perche);
  check('parete con apertura di 2 m: si passa dall\'apertura', aperta.c.aggiunti.length > 0 && aperta.passa,
    aperta.c.aggiunti.length + ' ponti a z ' + aperta.c.aggiunti.map((x) => x.da[2].toFixed(1)).join(', '));
  check('e il ponte sta nell\'apertura, non sulla parete',
    aperta.c.aggiunti.length > 0 && aperta.c.aggiunti.every((x) => x.da[2] > 9.5 && x.da[2] < 12.5));
}

// ---------------------------------------------------------------------------
console.log('\n11. «a terra»: la lastra vista come segnaletica si calpesta, la panca no');
{
  // Il terminal del 24/09 sera (§6.14): le frecce fucsia sono lastre da 13 cm
  // sollevate dal pavimento, proprio dentro le aperture della parete. Qui: due
  // stanze, un'apertura di 2 m, e nell'apertura una lastra (o una panca).
  // Decide l'OCCHIO (un riquadro «a terra» in `vistoNelMondo`); la geometria
  // dice soltanto QUALE cosa del riquadro e' la lastra.
  const T = await import('three');
  const scatola = (radice, x0, y0, z0, x1, y1, z1, nome) => {
    const m = new T.Mesh(new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0));
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.name = nome; radice.add(m); return m;
  };
  const stanze = (cosa) => {
    const r = new T.Group();
    scatola(r, 0, -0.1, 0, 20, 0, 6, 'pavimento');
    scatola(r, 9.9, 0, 0, 10.1, 3, 2, 'parete');
    scatola(r, 9.9, 0, 4, 10.1, 3, 6, 'parete');
    if (cosa === 'lastra') scatola(r, 9, 0.46, 2.2, 11, 0.59, 3.8, 'freccia');
    if (cosa === 'panca') scatola(r, 9, 0, 2.2, 11, 0.45, 3.8, 'panca');
    if (cosa === 'tavolo') {
      // una cosa in pezzi, come la divide un modello: il piano e le gambe
      const t = new T.Group(); t.name = 'tavolo'; r.add(t);
      scatola(t, 9, 0.97, 2.2, 11, 1.0, 3.8, 'tavolo_piano');
      for (const [x, z] of [[9, 2.2], [10.9, 2.2], [9, 3.7], [10.9, 3.7]])
        scatola(t, x, 0, z, x + 0.1, 0.97, z + 0.1, 'tavolo_gamba');
    }
    r.updateMatrixWorld(true);
    return r;
  };
  const occhio = (x0, z0, x1, z1) => [{ passo: 'a terra', quotaPiano: 0,
    mondo: { min: [x0, 0, z0], max: [x1, 0, z1] } }];
  const prova = (cosa, visto) => {
    const geo = geometriaDaModello(T, stanze(cosa), { vistoNelMondo: visto || [] });
    const r = costruisci(blocks, geo);
    const ps = r && r.navMesh ? percorso(nav, r.navMesh, [3, 0, 3], [17, 0, 3]) : null;
    return { passa: !!(ps && !ps.parziale), tolte: geo.segnaletica };
  };
  const cieco = prova('lastra', []);
  check('senza l occhio la lastra nell apertura chiude il passaggio', !cieco.passa && cieco.tolte === 0);
  const visto = prova('lastra', occhio(8.8, 2, 11.2, 4));
  check('l occhio la chiama «a terra»: la lastra esce e si passa', visto.passa && visto.tolte === 1,
    visto.tolte + ' lastre tolte');
  const panca = prova('panca', occhio(8.8, 2, 11.2, 4));
  check('una panca nello stesso riquadro resta: non e una lastra', !panca.passa && panca.tolte === 0,
    panca.tolte + ' tolte');
  check('il pavimento non esce mai: e piu grande del riquadro', visto.passa);
  const tavolo = prova('tavolo', occhio(8.8, 2, 11.2, 4));
  check('un tavolo si giudica intero: il piano sottile non esce, sotto non si passa',
    !tavolo.passa && tavolo.tolte === 0, tavolo.tolte + ' pezzi tolti');
  const largo = prova('lastra', occhio(-5, -5, 30, 25));
  check('un riquadro «a terra» grande come la sala non e credibile: la lastra resta',
    !largo.passa && largo.tolte === 0);
  const e = eSegnaleticaATerra;
  check('eSegnaleticaATerra: una freccia 2 x 1,6 x 0,13 e una lastra',
    e(new T.Box3(new T.Vector3(9, 0.46, 2.2), new T.Vector3(11, 0.59, 3.8)), occhio(8.8, 2, 11.2, 4)));
}

// ---------------------------------------------------------------------------
console.log('\n12. La rete continua: si collega SOLO dove l occhio vede un passaggio (17/10/2026)');
{
  // §0.9 — NESSUNA di queste scene e' un aeroporto: una scuola, un ospedale,
  // una chiesa. Se la regola funzionasse solo sul terminal, qui fallirebbe.
  const T = await import('three');
  const scatola = (radice, x0, y0, z0, x1, y1, z1, nome) => {
    const m = new T.Mesh(new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0));
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.name = nome; radice.add(m); return m;
  };
  const strada = async (radice, da, a, occhio) => {
    radice.updateMatrixWorld(true);
    const r = await costruisciDaScena(T, radice, occhio ? { coseNominate: occhio } : {});
    const ps = r && r.navMesh ? percorso(nav, r.navMesh, da, a) : null;
    return { passa: !!(ps && !ps.parziale), r };
  };
  const riquadro = (termine, min, max) => ({ termine, nome: termine, min, max,
    postura: ['stairs', 'bridge', 'door'].includes(termine) ? 'passa' : null });

  // LA SCUOLA: due piani (0 e +2,0 m) e una rampa stretta fra i due, che la
  // geometria trova (superficie inclinata) ma la mappa non calpesta da sola.
  const scuola = () => {
    const r = new T.Group();
    scatola(r, 0, -0.1, 0, 10.4, 0, 8, 'piano terra');
    scatola(r, 14.0, 1.9, 0, 24, 2.0, 8, 'piano primo');
    const rampa = new T.Mesh(new T.BoxGeometry(Math.hypot(4.4, 2), 0.1, 0.62));
    rampa.position.set(12.2, 1.0, 4); rampa.rotation.z = Math.atan2(2, 4.4); rampa.name = 'rampa'; r.add(rampa);
    return r;
  };
  const cieca = await strada(scuola(), [5, 0, 4], [20, 2, 4], null);
  check('scuola, occhio muto: la rampa resta candidata, i piani non si uniscono',
    !cieca.passa && ((cieca.r.collegamenti || {}).candidati || []).length > 0,
    'candidate ' + ((cieca.r.collegamenti || {}).candidati || []).length);
  const vista = await strada(scuola(), [5, 0, 4], [20, 2, 4], [riquadro('stairs', [9.9, -0.1, 3.5], [14.5, 2.2, 4.5])]);
  check('scuola, l occhio la chiama «scale»: i due piani si uniscono', vista.passa,
    ((vista.r.collegamenti || {}).aggiunti || []).map((c) => c.visto).join(','));
  const sbaglio = await strada(scuola(), [5, 0, 4], [20, 2, 4], [riquadro('bus', [9.9, -0.1, 3.5], [14.5, 2.2, 4.5])]);
  check('scuola, l occhio la chiama «autobus» (non si passa): restano separati', !sbaglio.passa);
  check('un nome «si passa» ACCANTO al piede della rampa non la conferma',
    !confermatoDallOcchio([10, 0, 4], [14.4, 2, 4], 0.62, [riquadro('stairs', [8, 0, 5.2], [9.9, 2.2, 7])]));

  // L'OSPEDALE: due padiglioni uniti da un tunnel col soffitto a 1,6 m (il
  // modello stilizzato del §0.2). Chi lo vede come «passerella» ci fa passare.
  const ospedale = () => {
    const r = new T.Group();
    scatola(r, 0, -0.1, 0, 8, 0, 8, 'padiglione A');
    scatola(r, 16, -0.1, 0, 24, 0, 8, 'padiglione B');
    scatola(r, 8, -0.1, 3, 16, 0, 5.4, 'tunnel pavimento');
    scatola(r, 8, 0, 2.9, 16, 1.6, 3.0, 'tunnel parete');
    scatola(r, 8, 0, 5.4, 16, 1.6, 5.5, 'tunnel parete');
    scatola(r, 8, 1.6, 2.9, 16, 1.7, 5.5, 'tunnel tetto');
    return r;
  };
  const basso = await strada(ospedale(), [4, 0, 4], [20, 0, 4], null);
  check('ospedale, occhio muto: nel tunnel da 1,6 m la persona non passa', !basso.passa);
  const tunnel = await strada(ospedale(), [4, 0, 4], [20, 0, 4], [riquadro('bridge', [8, -0.1, 2.9], [16, 1.7, 5.5])]);
  check('ospedale, l occhio vede la passerella: tetto e pareti del tunnel non tolgono il pavimento, si passa',
    tunnel.passa && tunnel.r.geometria.soffitti === 3, 'tolti tetto e pareti: ' + tunnel.r.geometria.soffitti);

  // LA CHIESA: navata e cappella divise da un muro con una porta chiusa.
  const chiesa = (conPorta) => {
    const r = new T.Group();
    scatola(r, 0, -0.1, 0, 12, 0, 8, 'navata');
    scatola(r, 12.2, -0.1, 0, 18, 0, 8, 'cappella');
    if (!conPorta) { scatola(r, 12, 0, 0, 12.2, 3, 8, 'muro'); return r; }
    scatola(r, 12, 0, 0, 12.2, 3, 3.5, 'muro');
    scatola(r, 12, 0, 4.5, 12.2, 3, 8, 'muro');
    scatola(r, 12, 2.1, 3.5, 12.2, 3, 4.5, 'architrave');
    scatola(r, 12.05, 0, 3.5, 12.15, 2.1, 4.5, 'anta chiusa');
    return r;
  };
  const muro = await strada(chiesa(false), [6, 0, 4], [15, 0, 4], null);
  check('chiesa, muro pieno e occhio muto: separate', !muro.passa);
  const nonVista = await strada(chiesa(true), [6, 0, 4], [15, 0, 4], null);
  check('chiesa, porta modellata chiusa e occhio muto: separate (la geometria da sola non apre)', !nonVista.passa);
  const porta = await strada(chiesa(true), [6, 0, 4], [15, 0, 4], [riquadro('door', [11.9, 0, 3.45], [12.3, 2.15, 4.55])]);
  check('chiesa, l occhio vede la porta: si passa, e solo dalla porta', porta.passa
    && porta.r.passaggi.aggiunti.length > 0 && porta.r.passaggi.aggiunti.every((c) => c.da[2] > 3.3 && c.da[2] < 4.7),
    porta.r.passaggi.aggiunti.map((c) => c.da.map((v) => v.toFixed(1)).join('/')).join(' '));
  const portaFinta = await strada(chiesa(false), [6, 0, 4], [15, 0, 4], [riquadro('door', [11.9, 0, 3.45], [12.3, 2.15, 4.55])]);
  check('chiesa, l occhio dice «porta» su un muro pieno: la geometria non conferma, separate', !portaFinta.passa);

  // LA STAZIONE (17/10 sera): un mezzanino a +4 m e una scala mobile larga 1 m
  // SOPRA il piano terra, che continua sotto. Il nastro ha piu' vertici su un
  // fianco che sull'altro (come i modelli veri): la mediana cadeva sul fianco.
  // L'occhio la chiama «passerella», come all'aeroporto.
  const stazione = () => {
    const r = new T.Group();
    scatola(r, 0, -0.1, 0, 24, 0, 8, 'piano terra');
    scatola(r, 14, 3.9, 0, 24, 4.0, 8, 'mezzanino');
    const A0 = [6, 0, 3.5], Am = [10, 2, 3.5], A1 = [14, 4, 3.5], B0 = [6, 0, 4.5], B1 = [14, 4, 4.5];
    const v = [...A0, ...Am, ...B0, ...Am, ...A1, ...B1, ...Am, ...B1, ...B0];
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(new Float32Array(v), 3));
    const nastro = new T.Mesh(g, new T.MeshBasicMaterial({ side: T.DoubleSide }));
    nastro.name = 'nastro'; r.add(nastro);
    return r;
  };
  const scalaVista = await strada(stazione(), [3, 0, 2], [20, 4, 4], [riquadro('bridge', [5.8, -0.1, 3.3], [14.2, 4.2, 4.7])]);
  const corsia = ((scalaVista.r.collegamenti || {}).aggiunti || [])[0];
  check('stazione, la scala vista come «passerella»: i due piani si uniscono', scalaVista.passa);
  check('stazione, la passerella che sale non e un tetto: niente tolto dalla mappa',
    scalaVista.r.geometria.soffitti === 0, 'tolti: ' + scalaVista.r.geometria.soffitti);
  check('stazione, sotto il nastro basso il piano terra non si calpesta',
    !sulCammino(nav, scalaVista.r.navMesh, [7.5, 0, 4], [0.2, 0.5, 0.2]).ok);
  check('stazione, i capi della scala stanno a meta della larghezza (z 4,0), non sul fianco',
    !!corsia && !!corsia.asse && corsia.asse.every((q) => Math.abs(q[2] - 4) < 0.05),
    corsia && corsia.asse ? corsia.asse.map((q) => q[2].toFixed(2)).join(' / ') : 'nessun asse');

  // LA SALA DI VETRO: due padiglioni e fra loro una sala chiusa su tutti i lati
  // (pareti di testa comprese). L'occhio sbaglia e la chiama «passerella»: la
  // geometria sospende la conseguenza (28/09), le pareti restano.
  const salaDiVetro = () => {
    const r = ospedale();
    scatola(r, 8, 0, 2.9, 8.1, 1.6, 5.5, 'testata');
    scatola(r, 15.9, 0, 2.9, 16, 1.6, 5.5, 'testata');
    return r;
  };
  const sala = await strada(salaDiVetro(), [4, 0, 4], [20, 0, 4], [riquadro('bridge', [8, -0.1, 2.9], [16, 1.7, 5.5])]);
  check('sala di vetro chiamata «passerella»: chiusa ai due capi, le pareti restano e non ci si passa',
    !sala.passa && sala.r.geometria.soffitti === 0 && sala.r.geometria.stanze === 1,
    'tolti ' + sala.r.geometria.soffitti + ', stanze ' + sala.r.geometria.stanze);
}

console.log('\n' + (ko ? ko + ' PROVE FALLITE' : 'tutte le prove passate'));
process.exit(ko ? 1 : 0);
