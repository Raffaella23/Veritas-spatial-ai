// veritas_segnaletica.js — legge la segnaletica orizzontale dal colore.
//
// COS'E' E PERCHE'
// Un progettista che guarda una pianta non legge solo le pareti: legge anche
// le frecce, le strisce, le aree colorate. Sono un'informazione di PROGETTO -
// dicono dove chi ha disegnato lo spazio si aspetta che la gente cammini - e
// finora VERITAS non le vedeva affatto.
//
// COME, E COME NO
// Il riconoscimento e' per COLORE E FORMA, mai per nome della mesh. Le
// famiglie di tinta non sono un elenco precotto ("verde = avanti"): vengono
// SCOPERTE nella nuvola, raggruppando le tinte sature che stanno appoggiate al
// pavimento. Un modello puo' arrivare da chiunque, in qualunque lingua, con
// qualunque convenzione cromatica.
//
// Non c'e' nessuna soglia tarata su un modello particolare. Le uniche costanti
// sono due distinzioni generali - "saturo contro neutro" e "vicino al
// pavimento" - che valgono su qualunque ingresso, mesh o scansione. E' la
// lezione di DECAL_STACCO_MAX = 0.15, una costante ricavata da un solo file e
// spacciata per capacita' generale, che infatti su altre famiglie mancava il
// bersaglio.
//
// Funziona identico su mesh e su gaussiane perche' riceve punti e colori, e
// non sa da dove vengano.

// Un'architettura e' fatta di grigi, beige, bianchi: cemento, intonaco,
// moquette. La vernice segnaletica e' satura per definizione, perche' deve
// essere vista. E' la distinzione che regge in aeroporto, in museo e in un
// livello di gioco.
export const SATURAZIONE_MIN = 0.35;

// Quanto sopra il pavimento puo' stare una segnaletica, in metri. Generosa di
// proposito: comprende sia la vernice a spessore zero di una scansione sia le
// placche modellate qualche centimetro sopra il pavimento per non
// compenetrarlo. Non e' una soglia di riconoscimento, e' il confine fra "per
// terra" e "un oggetto che sta in piedi".
export const ALTEZZA_MAX = 0.35;

// Due tinte entro questo scarto sono lo stesso colore. 25 gradi separa un
// verde da un giallo e un rosa da un rosso, ma tiene insieme le sfumature
// della stessa vernice sotto luci diverse.
export const TINTA_VICINA = 25;

/** RGB 0..1 -> tinta in gradi, saturazione e luminosita' (HLS). */
export function tintaSatLum(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const lum = (max + min) / 2;
  const d = max - min;
  if (d < 1e-9) return { tinta: 0, sat: 0, lum };
  const sat = lum > 0.5 ? d / (2 - max - min) : d / (max + min);
  let t;
  if (max === r) t = ((g - b) / d) % 6;
  else if (max === g) t = (b - r) / d + 2;
  else t = (r - g) / d + 4;
  t *= 60;
  if (t < 0) t += 360;
  return { tinta: t, sat, lum };
}

/**
 * Quota del pavimento: la fascia di quota con piu' punti.
 *
 * Non si prende il minimo assoluto - un solo punto sotto quota, un gradino o
 * un artefatto di scansione lo sposterebbero. La moda e' robusta perche' il
 * pavimento e' quasi sempre la superficie con piu' campioni.
 */
export function quotaPavimento(punti, fascia = 0.20) {
  if (!punti || !punti.length) return null;
  const conta = new Map();
  for (const p of punti) {
    const b = Math.round(p[1] / fascia);
    conta.set(b, (conta.get(b) || 0) + 1);
  }
  let miglior = null, max = -1;
  conta.forEach((c, b) => { if (c > max) { max = c; miglior = b; } });
  return miglior * fascia;
}

/** Direzione dell'asse lungo in pianta e quanto la macchia e' allungata.
 *  Su una freccia o una striscia, l'asse lungo E' il verso di marcia. */
export function assePrincipale(xz) {
  const n = xz.length;
  if (n < 3) return { angolo: 0, allungamento: 1 };
  let mx = 0, mz = 0;
  for (const [x, z] of xz) { mx += x; mz += z; }
  mx /= n; mz /= n;
  let sxx = 0, szz = 0, sxz = 0;
  for (const [x, z] of xz) {
    const dx = x - mx, dz = z - mz;
    sxx += dx * dx; szz += dz * dz; sxz += dx * dz;
  }
  sxx /= n; szz /= n; sxz /= n;
  // autovalori della matrice di covarianza 2x2
  const tr = sxx + szz, det = sxx * szz - sxz * sxz;
  const rad = Math.sqrt(Math.max(0, tr * tr / 4 - det));
  const l1 = tr / 2 + rad, l2 = tr / 2 - rad;
  let angolo;
  if (Math.abs(sxz) > 1e-12) angolo = Math.atan2(l1 - sxx, sxz);
  else angolo = sxx >= szz ? 0 : Math.PI / 2;
  let g = (angolo * 180 / Math.PI) % 180;
  if (g < 0) g += 180;
  return {
    angolo: g,
    allungamento: l2 > 1e-12 ? Math.sqrt(l1 / l2) : (l1 > 1e-12 ? Infinity : 1),
    centro: [mx, mz],
  };
}

/**
 * Trova le famiglie di segnaletica in una nuvola colorata.
 *
 * @param {Array<[number,number,number]>} punti
 * @param {Float32Array|null} colori   rgb 0..1, allineati per indice
 * @returns {{quotaPavimento, esaminati, famiglie: Array}}
 */
export function leggiSegnaletica(punti, colori, opzioni = {}) {
  const satMin = opzioni.saturazioneMin != null ? opzioni.saturazioneMin : SATURAZIONE_MIN;
  const hMax = opzioni.altezzaMax != null ? opzioni.altezzaMax : ALTEZZA_MAX;
  if (!punti || !punti.length || !colori || colori.length < punti.length * 3) {
    return { quotaPavimento: null, esaminati: 0, famiglie: [], motivo: "nuvola senza colori" };
  }
  const pav = quotaPavimento(punti);
  if (pav == null) return { quotaPavimento: null, esaminati: 0, famiglie: [], motivo: "pavimento non trovato" };

  // solo cio' che sta per terra, e solo cio' che e' colorato
  const marcati = [];
  for (let i = 0; i < punti.length; i++) {
    const p = punti[i];
    const dy = p[1] - pav;
    if (dy < -0.05 || dy > hMax) continue;
    const { tinta, sat, lum } = tintaSatLum(colori[i * 3], colori[i * 3 + 1], colori[i * 3 + 2]);
    if (sat < satMin || lum < 0.10 || lum > 0.95) continue;
    marcati.push({ tinta, x: p[0], z: p[2], sat });
  }
  if (!marcati.length) {
    return { quotaPavimento: pav, esaminati: punti.length, famiglie: [],
             motivo: "nessun punto saturo vicino al pavimento" };
  }

  // Raggruppa per tinta. Le famiglie si SCOPRONO: nessun elenco di colori
  // attesi, nessun nome. La tinta e' circolare, quindi si chiude l'anello
  // unendo l'ultimo gruppo col primo se si toccano attraverso lo zero.
  marcati.sort((a, b) => a.tinta - b.tinta);
  const gruppi = [[marcati[0]]];
  for (let i = 1; i < marcati.length; i++) {
    if (marcati[i].tinta - gruppi[gruppi.length - 1].slice(-1)[0].tinta <= TINTA_VICINA)
      gruppi[gruppi.length - 1].push(marcati[i]);
    else gruppi.push([marcati[i]]);
  }
  if (gruppi.length > 1) {
    const primo = gruppi[0], ultimo = gruppi[gruppi.length - 1];
    if (360 - ultimo.slice(-1)[0].tinta + primo[0].tinta <= TINTA_VICINA) {
      gruppi[0] = ultimo.concat(primo);
      gruppi.pop();
    }
  }

  const minPunti = Math.max(8, Math.round(marcati.length * 0.02));
  const famiglie = gruppi
    .filter((g) => g.length >= minPunti)
    .map((g) => {
      const xz = g.map((m) => [m.x, m.z]);
      const asse = assePrincipale(xz);
      // tinta media circolare: la media aritmetica sbaglia a cavallo dello zero
      let sc = 0, ss = 0;
      for (const m of g) { const a = m.tinta * Math.PI / 180; sc += Math.cos(a); ss += Math.sin(a); }
      let tm = Math.atan2(ss, sc) * 180 / Math.PI;
      if (tm < 0) tm += 360;
      return {
        tinta: tm,
        punti: g.length,
        quota: pav,
        direzione: asse.angolo,
        allungamento: asse.allungamento,
        centro: asse.centro,
        // Una macchia allungata ha un verso; una tonda e' un'area, non una
        // freccia. La distinzione conta: un'area di attesa e una corsia di
        // flusso vanno lette in modo diverso.
        tipo: asse.allungamento >= 2 ? "direzionale" : "areale",
      };
    })
    .sort((a, b) => b.punti - a.punti);

  return { quotaPavimento: pav, esaminati: punti.length, marcati: marcati.length, famiglie };
}

export default { leggiSegnaletica, quotaPavimento, tintaSatLum, assePrincipale,
                 SATURAZIONE_MIN, ALTEZZA_MAX, TINTA_VICINA };
