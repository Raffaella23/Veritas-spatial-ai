// =============================================================================
// VERITAS — Vie di esodo
// =============================================================================
//
// Misura la LUNGHEZZA REALE del percorso di fuga: non la distanza in linea
// d'aria da un'uscita, ma quella che una persona percorre davvero, girando
// attorno ai muri.
//
// Le norme antincendio ragionano su tre grandezze:
//   1. quanto e' larga l'uscita
//   2. quanto e' larga la via che ci porta
//   3. QUANTO E' LUNGO il percorso per raggiungerla
// La terza e' quella che decide se un ambiente e' sicuro, ed e' anche l'unica
// che non si puo' leggere su una pianta a occhio.
//
// ⚠️ IL LIMITE DA DICHIARARE SEMPRE: LE USCITE NON SI RICONOSCONO DA SOLE.
//
// Da una nuvola di punti del pavimento, una porta chiusa e un muro sono la
// stessa cosa: in entrambi i casi il pavimento navigabile finisce li'. Non
// esiste un criterio geometrico onesto che li distingua, e inventarne uno
// significherebbe produrre un numero di esodo falso su un documento che
// riguarda la vita delle persone.
//
// Quindi: le uscite le DICHIARA chi progetta. Il modulo propone dei candidati
// dove la geometria lo consente davvero — cioe' dove il pavimento prosegue
// oltre l'ingombro dell'edificio, come su una soglia che da' su un piazzale —
// ma li marca "da confermare" e non li usa finche' non sono confermati.
//
// Questa non e' una mancanza da colmare: e' il confine fra cio' che si misura
// e cio' che si sa. Le misure che seguono sono esatte QUANTO LE USCITE che le
// generano, e il report deve dirlo.
// =============================================================================

(function () {
  "use strict";

  const RADQ2 = Math.SQRT2;

  function cellaDaMondo(grid, x, z) {
    return {
      cx: Math.floor((x - grid.minX) / grid.cellSize),
      cz: Math.floor((z - grid.minZ) / grid.cellSize),
    };
  }

  // ---------------------------------------------------------------------------
  // Distanza di esodo, propagata sulla griglia navigabile.
  //
  // E' una BFS con costo diagonale √2 (Dijkstra su griglia a 8 vicini): la
  // distanza cresce SEGUENDO IL PAVIMENTO, quindi aggirare un muro costa
  // quanto costa davvero. Una distanza euclidea direbbe che due punti separati
  // da una parete sono vicini, che e' esattamente l'errore da non fare qui.
  //
  // Si parte da TUTTE le uscite insieme (multi-sorgente): ogni cella riceve
  // cosi' la distanza dall'uscita PIU' VICINA, che e' quella verso cui si
  // scapperebbe.
  // ---------------------------------------------------------------------------
  function distanzeDiEsodo(grid, uscite) {
    const { w, h, cellSize, free } = grid;
    const dist = new Float32Array(w * h).fill(Infinity);
    let coda = [];

    for (const u of uscite) {
      const { cx, cz } = cellaDaMondo(grid, u.worldX, u.worldZ);
      if (cx < 0 || cx >= w || cz < 0 || cz >= h) continue;
      // Un'uscita dichiarata puo' cadere sul muro per un errore di una cella:
      // si aggancia alla cella libera piu' vicina invece di scartarla.
      let i = cz * w + cx;
      if (!free[i]) {
        let miglior = -1, migliorD = Infinity;
        for (let r = 1; r <= 3 && miglior < 0; r++) {
          for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
            const nx = cx + dx, nz = cz + dz;
            if (nx < 0 || nx >= w || nz < 0 || nz >= h) continue;
            const ni = nz * w + nx;
            if (!free[ni]) continue;
            const d = dx * dx + dz * dz;
            if (d < migliorD) { migliorD = d; miglior = ni; }
          }
        }
        if (miglior < 0) continue;
        i = miglior;
      }
      if (dist[i] !== 0) { dist[i] = 0; coda.push(i); }
    }
    if (!coda.length) return null;

    // Dijkstra a secchi: i costi sono solo 1 e √2, quindi non serve un heap.
    let testa = 0;
    while (testa < coda.length) {
      const i = coda[testa++];
      const d = dist[i];
      const cx = i % w, cz = (i - cx) / w;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = cx + dx, nz = cz + dz;
        if (nx < 0 || nx >= w || nz < 0 || nz >= h) continue;
        const ni = nz * w + nx;
        if (!free[ni]) continue;
        // Vietato tagliare l'angolo fra due muri: in diagonale si passa solo
        // se almeno una delle due celle ortogonali e' libera. Senza questo, un
        // percorso attraverserebbe uno spigolo dove nessuno passa.
        if (dx && dz && !free[cz * w + nx] && !free[nz * w + cx]) continue;
        const nd = d + (dx && dz ? RADQ2 : 1) * cellSize;
        if (nd < dist[ni] - 1e-9) { dist[ni] = nd; coda.push(ni); }
      }
    }

    // Il punto piu' lontano da qualunque uscita: e' quello che la norma guarda.
    let peggiore = 0, peggioreI = -1, raggiunte = 0, irraggiungibili = 0;
    for (let i = 0; i < dist.length; i++) {
      if (!free[i]) continue;
      if (dist[i] === Infinity) { irraggiungibili++; continue; }
      raggiunte++;
      if (dist[i] > peggiore) { peggiore = dist[i]; peggioreI = i; }
    }
    const px = peggioreI >= 0 ? peggioreI % w : 0;
    const pz = peggioreI >= 0 ? (peggioreI - px) / w : 0;

    return {
      dist,
      percorsoMassimoM: +peggiore.toFixed(2),
      puntoPiuLontano: peggioreI < 0 ? null : {
        worldX: grid.minX + (px + 0.5) * cellSize,
        worldZ: grid.minZ + (pz + 0.5) * cellSize,
      },
      celleRaggiunte: raggiunte,
      celleIrraggiungibili: irraggiungibili,
      // Area da cui NON si raggiunge nessuna uscita. Se e' maggiore di zero il
      // dato va gridato, non annotato: e' gente chiusa dentro.
      areaIrraggiungibileM2: +(irraggiungibili * cellSize * cellSize).toFixed(2),
      incertezzaM: +cellSize.toFixed(3),
    };
  }

  // ---------------------------------------------------------------------------
  // Candidati uscita.
  //
  // L'unico caso in cui la geometria sa rispondere: il pavimento navigabile
  // PROSEGUE oltre l'ingombro costruito. Una soglia che da' su un piazzale si
  // vede; una porta chiusa in mezzo a un muro no, e non c'e' modo di saperlo.
  //
  // Il criterio: si allaga la griglia dal bordo esterno passando solo per
  // celle libere. Le celle libere raggiunte dall'esterno sono "aperto"; un
  // varco che le tocca e' un candidato uscita.
  //
  // Su un modello di soli interni questo non trova nulla, ed e' giusto cosi':
  // meglio zero candidati che candidati inventati.
  // ---------------------------------------------------------------------------
  function usciteCandidate(livello) {
    const grid = livello && livello.grid;
    if (!grid) return [];
    const { w, h, free, cellSize } = grid;
    const esterno = new Uint8Array(w * h);
    const coda = [];
    const spingi = (i) => { if (free[i] && !esterno[i]) { esterno[i] = 1; coda.push(i); } };
    for (let x = 0; x < w; x++) { spingi(x); spingi((h - 1) * w + x); }
    for (let z = 0; z < h; z++) { spingi(z * w); spingi(z * w + w - 1); }
    let t = 0;
    while (t < coda.length) {
      const i = coda[t++], cx = i % w, cz = (i - cx) / w;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, nz = cz + dz;
        if (nx < 0 || nx >= w || nz < 0 || nz >= h) continue;
        spingi(nz * w + nx);
      }
    }
    const fuori = [];
    for (const g of (livello.gateways || [])) {
      const { cx, cz } = cellaDaMondo(grid, g.worldX, g.worldZ);
      let tocca = false;
      const r = 2;
      for (let dz = -r; dz <= r && !tocca; dz++) for (let dx = -r; dx <= r; dx++) {
        const nx = cx + dx, nz = cz + dz;
        if (nx < 0 || nx >= w || nz < 0 || nz >= h) continue;
        if (esterno[nz * w + nx]) { tocca = true; break; }
      }
      if (tocca) fuori.push({ ...g, origine: "geometria", daConfermare: true });
    }
    return fuori;
  }

  // ---------------------------------------------------------------------------
  // Il quadro completo per il confronto normativo.
  // ---------------------------------------------------------------------------
  function analizzaEsodo(livello, usciteDichiarate) {
    if (!livello || !livello.grid) return null;
    const dichiarate = (usciteDichiarate || []).map((u) => ({ ...u, origine: "dichiarata", daConfermare: false }));
    const candidate = usciteCandidate(livello);
    const uscite = dichiarate.length ? dichiarate : candidate;
    if (!uscite.length) {
      return { uscite: [], candidate, distanze: null,
               motivo: "nessuna uscita dichiarata, e la geometria non ne propone" };
    }
    const distanze = distanzeDiEsodo(livello.grid, uscite);
    return {
      uscite, candidate, distanze,
      soloCandidate: !dichiarate.length,
      // grandezze nella forma attesa da __veritasNormative.valuta()
      misure: {
        larghezza_uscita_m: uscite.map((u) => u.widthConservativeM != null ? u.widthConservativeM : u.widthM)
                                  .filter((x) => x > 0),
        lunghezza_percorso_esodo_m: distanze ? [distanze.percorsoMassimoM] : [],
        larghezza_via_esodo_m: (livello.bottlenecks || [])
          .map((b) => b.widthConservativeM != null ? b.widthConservativeM : b.widthM)
          .filter((x) => x > 0),
      },
    };
  }

  window.__veritasEsodo = { analizzaEsodo, distanzeDiEsodo, usciteCandidate };
  console.log("[VERITAS esodo] modulo vie di esodo pronto — window.__veritasEsodo");
})();
