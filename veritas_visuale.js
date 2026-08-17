// =============================================================================
// VERITAS — Verdetti sul modello
// =============================================================================
//
// Finora ogni analisi finiva scritta in una finestra: un elenco di numeri
// accanto a un modello 3D che restava grigio. Ma chi progetta uno spazio non
// legge una tabella per capire dove sta il problema — GUARDA LA PIANTA.
//
// Qui i verdetti tornano dove sono nati:
//
//   1. MAPPA DI ESODO — una texture stesa sul pavimento, colorata con la
//      distanza reale da un'uscita. Verde vicino, rosso oltre la soglia di
//      norma. Non e' una decorazione: e' il campo di distanze gia' calcolato,
//      reso visibile cella per cella.
//
//   2. FLUSSO DI FUGA — particelle che scendono lungo il gradiente di quel
//      campo, cioe' percorrono ESATTAMENTE la strada che farebbe una persona
//      in fuga. Non sono traiettorie inventate per far scena: seguono la
//      stessa matematica che produce il numero nel report.
//
//   3. ZONE CHE PULSANO — anelli sul pavimento, colorati per verdetto o per
//      densita'. Il battito serve a distinguerle dal modello: una cosa che
//      pulsa e' un'annotazione, non un pezzo di edificio.
//
// Nessuna modifica al bundle: si aggiunge un Group alla scena esistente e lo
// si toglie quando serve.
// =============================================================================

(function () {
  "use strict";

  const THREE = window.THREE;
  if (!THREE) { console.warn("[VERITAS visuale] THREE non disponibile"); return; }

  let gruppo = null, animazione = null;
  const pulsanti = [];   // oggetti con battito
  let particelle = null; // { punti, stato, grid, dist }

  function scena() { return window.__veritasScene || null; }

  function assicuraGruppo() {
    const s = scena();
    if (!s) return null;
    if (!gruppo) {
      gruppo = new THREE.Group();
      gruppo.name = "veritas-verdetti";
      gruppo.renderOrder = 999;
      s.add(gruppo);
    }
    return gruppo;
  }

  function spegni() {
    if (gruppo && gruppo.parent) gruppo.parent.remove(gruppo);
    if (gruppo) gruppo.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { if (o.material.map) o.material.map.dispose(); o.material.dispose(); }
    });
    gruppo = null; pulsanti.length = 0; particelle = null;
    if (animazione) { cancelAnimationFrame(animazione); animazione = null; }
  }

  // ---------------------------------------------------------------------------
  // La rampa di colore.
  //
  // Verde → giallo → arancio → rosso, con un salto NETTO alla soglia. Una
  // sfumatura continua e' piu' bella e comunica peggio: la norma non e' un
  // gradiente, e' un limite. Chi guarda deve vedere dove passa la riga.
  // ---------------------------------------------------------------------------
  function colore(v, soglia) {
    const q = soglia > 0 ? v / soglia : 0;
    if (q > 1)    return [220,  38,  38];  // oltre la soglia: rosso pieno
    if (q > 0.85) return [234, 130,  30];  // margine sottile
    if (q > 0.6)  return [214, 190,  40];
    if (q > 0.35) return [140, 190,  70];
    return [ 60, 170, 110];
  }

  // ---------------------------------------------------------------------------
  // 1. Mappa di esodo: il campo di distanze, steso sul pavimento.
  // ---------------------------------------------------------------------------
  function mappaEsodo(grid, dist, sogliaM) {
    const g = assicuraGruppo(); if (!g) return false;
    const { w, h, cellSize, minX, minZ, free, levelY } = grid;
    const dati = new Uint8Array(w * h * 4);
    let oltre = 0;
    for (let i = 0; i < w * h; i++) {
      const cx = i % w, cz = (i - cx) / w;
      // La texture ha l'origine in basso; la griglia cresce con Z nel mondo.
      // Senza questo ribaltamento la mappa uscirebbe specchiata, ed e' il tipo
      // di errore che non si nota finche' non si confronta con la pianta vera.
      const j = ((h - 1 - cz) * w + cx) * 4;
      if (!free[i]) { dati[j + 3] = 0; continue; }
      const d = dist[i];
      if (!isFinite(d)) {
        // Irraggiungibile: nero pieno, e si vede da lontano. E' area da cui
        // non si esce, non un valore alto.
        dati[j] = 20; dati[j+1] = 20; dati[j+2] = 20; dati[j+3] = 235;
        oltre++; continue;
      }
      const [r, v, b] = colore(d, sogliaM);
      dati[j] = r; dati[j+1] = v; dati[j+2] = b; dati[j+3] = 170;
      if (sogliaM > 0 && d > sogliaM) oltre++;
    }
    const tex = new THREE.DataTexture(dati, w, h, THREE.RGBAFormat);
    tex.needsUpdate = true;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;

    const piano = new THREE.Mesh(
      new THREE.PlaneGeometry(w * cellSize, h * cellSize),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false,
                                    side: THREE.DoubleSide })
    );
    piano.rotation.x = -Math.PI / 2;
    piano.position.set(minX + (w * cellSize) / 2, (levelY || 0) + 0.03, minZ + (h * cellSize) / 2);
    piano.renderOrder = 999;
    g.add(piano);
    avvia();
    return { celleOltre: oltre };
  }

  // ---------------------------------------------------------------------------
  // 2. Flusso di fuga: particelle che scendono il gradiente delle distanze.
  //
  // Ogni particella guarda le otto celle vicine e va in quella con distanza
  // minore. E' la definizione operativa di "scappare verso l'uscita piu'
  // vicina", quindi il disegno non illustra il calcolo: E' il calcolo.
  // ---------------------------------------------------------------------------
  function flussoEsodo(grid, dist, quante) {
    const g = assicuraGruppo(); if (!g) return false;
    const { w, h, cellSize, minX, minZ, free } = grid;
    const candidate = [];
    for (let i = 0; i < w * h; i++) if (free[i] && isFinite(dist[i]) && dist[i] > 0) candidate.push(i);
    if (!candidate.length) return false;
    const n = Math.min(quante || 600, candidate.length);
    const pos = new Float32Array(n * 3);
    const stato = [];
    for (let k = 0; k < n; k++) {
      const i = candidate[(Math.random() * candidate.length) | 0];
      stato.push({ i, vita: Math.random() });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const punti = new THREE.Points(geo, new THREE.PointsMaterial({
      size: Math.max(0.12, cellSize * 2.4), color: 0x7fd8ff,
      transparent: true, opacity: 0.9, depthWrite: false, sizeAttenuation: true,
    }));
    punti.renderOrder = 1000;
    g.add(punti);
    particelle = { punti, stato, grid, dist, candidate, y: (grid.levelY || 0) + 0.12 };
    avvia();
    return true;
  }

  function passoParticelle() {
    if (!particelle) return;
    const { punti, stato, grid, dist, candidate, y } = particelle;
    const { w, h, cellSize, minX, minZ, free } = grid;
    const pos = punti.geometry.attributes.position.array;
    for (let k = 0; k < stato.length; k++) {
      const s = stato[k];
      const cx = s.i % w, cz = (s.i - cx) / w;
      let meglio = s.i, dmin = dist[s.i];
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = cx + dx, nz = cz + dz;
        if (nx < 0 || nx >= w || nz < 0 || nz >= h) continue;
        const ni = nz * w + nx;
        if (!free[ni] || !isFinite(dist[ni])) continue;
        if (dist[ni] < dmin) { dmin = dist[ni]; meglio = ni; }
      }
      // Rinasce solo quando NON HA PIU' DOVE SCENDERE, cioe' quando e' gia'
      // sull'uscita. La versione precedente rinasceva un passo prima, appena
      // vedeva l'uscita fra i vicini: il flusso si spegneva a una cella dal
      // traguardo e non lo toccava mai. Difetto piccolo da guardare, ma la
      // riga rossa dell'uscita restava scoperta proprio dove serve vederla.
      if (meglio === s.i) s.i = candidate[(Math.random() * candidate.length) | 0];
      else s.i = meglio;
      const px = s.i % w, pz = (s.i - px) / w;
      pos[k*3]     = minX + (px + 0.5) * cellSize;
      pos[k*3 + 1] = y;
      pos[k*3 + 2] = minZ + (pz + 0.5) * cellSize;
    }
    punti.geometry.attributes.position.needsUpdate = true;
  }

  // ---------------------------------------------------------------------------
  // 3. Zone che pulsano.
  // ---------------------------------------------------------------------------
  function anello(x, z, y, raggio, rgb, fase) {
    const geo = new THREE.RingGeometry(Math.max(0.3, raggio * 0.72), raggio, 48);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(rgb[0]/255, rgb[1]/255, rgb[2]/255),
      transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y + 0.05, z);
    m.renderOrder = 1001;
    pulsanti.push({ m, fase: fase || Math.random() * 6.28 });
    return m;
  }

  function coloraDensita(righe) {
    const g = assicuraGruppo(); if (!g || !righe) return false;
    // 4 p/m² e' la soglia oltre cui il contatto diventa continuo: e' quella
    // che decide il colore, non il valore massimo trovato — una scala relativa
    // farebbe sembrare grave un edificio vuoto.
    const SOGLIA = 4.0;
    for (const r of righe) {
      const z = r.zona;
      const raggio = Math.max(0.8, Math.sqrt(z.areaM2 / Math.PI) * 0.55);
      anello(z.centroidX, z.centroidZ, z.y || 0, raggio, colore(r.densita, SOGLIA));
    }
    avvia();
    return true;
  }

  function coloraVerdetti(zone, statoPerZona) {
    const g = assicuraGruppo(); if (!g || !zone) return false;
    const tinta = { conforme: [60,170,110], difforme: [220,38,38],
                    dipendenza_mancante: [230,180,60], ignoto: [120,120,120] };
    zone.forEach((z, i) => {
      const st = (statoPerZona && statoPerZona[i]) || "ignoto";
      const raggio = Math.max(0.8, Math.sqrt((z.areaM2 || 4) / Math.PI) * 0.55);
      anello(z.centroidX, z.centroidZ, z.y || 0, raggio, tinta[st] || tinta.ignoto);
    });
    avvia();
    return true;
  }

  // ---------------------------------------------------------------------------
  // Il battito.
  //
  // Il modello viene disegnato dal bundle React, che ha il proprio ciclo di
  // rendering: qui non si ridisegna nulla, si cambiano solo opacita' e scala
  // degli oggetti aggiunti. Il ciclo del bundle li raccoglie da solo.
  // ---------------------------------------------------------------------------
  function avvia() {
    if (animazione) return;
    const t0 = performance.now();
    let ultimoPasso = 0;
    const tic = (t) => {
      animazione = requestAnimationFrame(tic);
      const s = (t - t0) / 1000;
      for (const p of pulsanti) {
        const b = 0.5 + 0.5 * Math.sin(s * 2.1 + p.fase);
        p.m.material.opacity = 0.28 + 0.5 * b;
        const k = 1 + 0.07 * b;
        p.m.scale.set(k, k, 1);
      }
      // Le particelle vanno a passo fisso: legarle ai fotogrammi le farebbe
      // correre piu' veloci su uno schermo a 120 Hz, cioe' mentire sul tempo.
      if (particelle && t - ultimoPasso > 55) { passoParticelle(); ultimoPasso = t; }
    };
    animazione = requestAnimationFrame(tic);
  }

  window.__veritasVisuale = {
    mappaEsodo, flussoEsodo, coloraDensita, coloraVerdetti, spegni,
    attiva: () => !!gruppo,
  };
  console.log("[VERITAS visuale] verdetti sul modello pronti — window.__veritasVisuale");
})();
