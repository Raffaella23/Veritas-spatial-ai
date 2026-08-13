// veritas_ingest.js — lo strato di ingresso della piattaforma.
//
// UN SOLO punto per far entrare un modello, qualunque sia il formato:
//
//     mesh      .glb  .gltf  .fbx  .obj
//     gaussiane .ply  .splat .ksplat .spz .sog
//     nuvole    .ply (classico, senza gaussiane)
//
// PERCHE' ESISTE
// Prima c'erano due strati separati e duplicati: il blocco 6 caricava le mesh
// con ext()/loadFile()/buildUpload(), il blocco 7 gli splat con
// fileExt()/loadSplatFile()/buildSplatUploadUI(). Due parser di estensione,
// due controlli di dimensione, due gestioni d'errore, due widget. Ogni
// aggiunta andava fatta due volte, e infatti lo splat e' rimasto indietro.
//
// IL CONTRATTO, che e' il vero valore di questo file
// Qualunque cosa entri, esce SEMPRE la stessa forma:
//
//     { formato, famiglia, root, punti, colori, ingombro, provenienza }
//
// `punti` e' sempre una Float32Array xyz. `colori` e' rgb 0..1 quando la
// sorgente li porta. Da li' in poi NESSUNO a valle sa piu' da dove viene la
// roba: l'analisi strutturale, il motore di percezione, la visibilita' e la
// segnaletica ricevono punti e colori e basta.
//
// E' la stessa scelta gia' fatta altrove nel progetto e l'unica che regge la
// Rule of Three: un aeroporto scansionato e un livello di gioco modellato a
// mano devono arrivare a valle identici, o ogni funzione dovra' ramificare
// per tipo di sorgente e raddoppiare di complessita' a ogni formato nuovo.
//
// NIENTE RICONOSCIMENTO PER NOME. Il formato si stabilisce leggendo i primi
// byte del file. L'estensione e' solo un ripiego: un .glb rinominato .txt
// resta un glb, e un .ply puo' essere due cose completamente diverse.

const MB = 1024 * 1024;

// ---------------------------------------------------------------------------
// 1. RICONOSCIMENTO DEL FORMATO — logica pura, senza three, testabile in node
// ---------------------------------------------------------------------------

// Un .ply puo' essere una nuvola di punti classica OPPURE una scena di
// gaussiane. Si distinguono SOLO dall'intestazione: le gaussiane dichiarano
// f_dc_* (il colore come armonica sferica di grado 0), scale_* e rot_*.
// Verificato su un file vero del dataset 3DGS: l'intestazione elenca
// x y z nx ny nz f_dc_0..2 f_rest_0..44 opacity scale_0..2 rot_0..3.
const MARCHE_GAUSSIANE = ["f_dc_0", "scale_0", "rot_0", "opacity"];

const FIRME = [
  // [nome, famiglia, controllo sui primi byte]
  ["glb", "mesh", (b) => leggiAscii(b, 0, 4) === "glTF"],
  ["fbx", "mesh", (b) => leggiAscii(b, 0, 18) === "Kaydara FBX Binary"],
  ["ply", "?", (b) => /^ply[\r\n]/.test(leggiAscii(b, 0, 4))],
  // Gli altri formati di gaussiane non hanno una firma stabile e pubblica:
  // per quelli si ricade sull'estensione, dichiarandolo.
];

const PER_ESTENSIONE = {
  glb: ["glb", "mesh"],
  gltf: ["gltf", "mesh"],
  fbx: ["fbx", "mesh"],
  obj: ["obj", "mesh"],
  ply: ["ply", "?"],
  splat: ["splat", "splat"],
  ksplat: ["ksplat", "splat"],
  spz: ["spz", "splat"],
  sog: ["sog", "splat"],
};

function leggiAscii(bytes, da, quanti) {
  let s = "";
  const fine = Math.min(bytes.length, da + quanti);
  for (let i = da; i < fine; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

export function estensione(nome) {
  const parti = String(nome || "").toLowerCase().split(".");
  return parti.length > 1 ? parti.pop() : "";
}

/**
 * Stabilisce formato e famiglia dai primi byte del file.
 * Funzione PURA: nessun DOM, nessun three. E' testata in node.
 *
 * @param {Uint8Array} testa  i primi ~4 KB del file
 * @param {string} nome       nome del file, usato solo come ripiego
 * @returns {{formato, famiglia, motivo, gaussiane?}}
 */
export function riconosciDaByte(testa, nome) {
  const ext = estensione(nome);

  for (const [formato, famiglia, prova] of FIRME) {
    if (!prova(testa)) continue;
    if (formato === "ply") return classificaPly(testa, ext);
    return { formato, famiglia, motivo: "firma nei primi byte" };
  }

  // gltf e' JSON: riconoscibile dal contenuto, non da una firma binaria
  const inizio = leggiAscii(testa, 0, 200).trimStart();
  if (inizio.startsWith("{") && inizio.includes('"asset"')) {
    return { formato: "gltf", famiglia: "mesh", motivo: "JSON con campo asset" };
  }
  // FBX in formato testo
  if (leggiAscii(testa, 0, 1024).includes("FBXHeaderExtension")) {
    return { formato: "fbx", famiglia: "mesh", motivo: "intestazione FBX testuale" };
  }

  const noto = PER_ESTENSIONE[ext];
  if (noto) {
    return {
      formato: noto[0],
      famiglia: noto[1] === "?" ? "splat" : noto[1],
      motivo: "estensione (nessuna firma riconosciuta nei primi byte)",
    };
  }
  return { formato: null, famiglia: null, motivo: `formato non riconosciuto (.${ext || "senza estensione"})` };
}

/**
 * Un .ply: gaussiane o nuvola classica? Decide leggendo l'elenco delle
 * proprieta' dichiarate nell'intestazione, che e' sempre in chiaro anche nei
 * file binari.
 */
function classificaPly(testa, ext) {
  const intestazione = leggiAscii(testa, 0, testa.length);
  const fine = intestazione.indexOf("end_header");
  const testo = fine >= 0 ? intestazione.slice(0, fine) : intestazione;
  const trovate = MARCHE_GAUSSIANE.filter((m) => testo.includes("property float " + m));
  if (trovate.length >= 3) {
    return {
      formato: "ply-gaussiane",
      famiglia: "splat",
      gaussiane: true,
      motivo: `intestazione PLY con ${trovate.join(", ")}`,
    };
  }
  return {
    formato: "ply-nuvola",
    famiglia: "nuvola",
    gaussiane: false,
    motivo: "intestazione PLY senza proprieta' gaussiane",
  };
}

/** Estensioni dichiarate, per l'attributo accept dell'input file. */
export function estensioniAccettate() {
  return Object.keys(PER_ESTENSIONE).map((e) => "." + e);
}

// ---------------------------------------------------------------------------
// 2. NORMALIZZAZIONE — vale per ogni sorgente, quindi sta scritta una volta
// ---------------------------------------------------------------------------

/**
 * Estrae i punti da una radice di mesh campionando per AREA, non per vertice.
 *
 * Il campionamento per vertice e' gia' costato caro in questo progetto: un
 * pavimento ha 4 vertici, otto muri ne hanno decine, quindi la nuvola
 * risultava fatta quasi tutta di muri e il pavimento spariva. Qui ogni
 * triangolo riceve un numero di campioni proporzionale alla propria area.
 *
 * Restituisce anche i colori, presi dal materiale o dai colori per vertice:
 * servono a leggere la segnaletica orizzontale, e senza di loro il sistema
 * vede la forma di uno spazio ma non quello che c'e' scritto per terra.
 */
export function puntiDaMesh(THREE, root, maxCampioni = 40000) {
  root.updateMatrixWorld(true);
  const triangoli = [];
  let areaTotale = 0;

  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes || !o.geometry.attributes.position) return;
    const g = o.geometry;
    const pos = g.attributes.position;
    const idx = g.index;
    const n = idx ? idx.count : pos.count;
    const colore = coloreDiMesh(THREE, o);
    const perVertice = g.attributes.color || null;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();

    for (let i = 0; i + 2 < n; i += 3) {
      const i0 = idx ? idx.getX(i) : i;
      const i1 = idx ? idx.getX(i + 1) : i + 1;
      const i2 = idx ? idx.getX(i + 2) : i + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(o.matrixWorld);
      b.fromBufferAttribute(pos, i1).applyMatrix4(o.matrixWorld);
      c.fromBufferAttribute(pos, i2).applyMatrix4(o.matrixWorld);
      const area = b.clone().sub(a).cross(c.clone().sub(a)).length() * 0.5;
      if (!(area > 0)) continue;
      areaTotale += area;
      triangoli.push({
        a: a.clone(), b: b.clone(), c: c.clone(), area,
        colore: perVertice ? coloreVertice(perVertice, i0) : colore,
      });
    }
  });

  if (!triangoli.length || !(areaTotale > 0)) {
    return { punti: new Float32Array(0), colori: null };
  }

  const punti = [], colori = [];
  const densita = maxCampioni / areaTotale;
  for (const t of triangoli) {
    // almeno 1 campione per triangolo, al massimo 150: il tetto evita che una
    // sola superficie enorme si mangi l'intero budget e lasci fuori il resto
    let quanti = Math.min(150, Math.max(1, Math.round(t.area * densita)));
    for (let k = 0; k < quanti; k++) {
      // punto uniforme nel triangolo (radice quadrata: senza, i campioni si
      // addensano verso un vertice)
      let u = Math.random(), v = Math.random();
      if (u + v > 1) { u = 1 - u; v = 1 - v; }
      punti.push(
        t.a.x + u * (t.b.x - t.a.x) + v * (t.c.x - t.a.x),
        t.a.y + u * (t.b.y - t.a.y) + v * (t.c.y - t.a.y),
        t.a.z + u * (t.b.z - t.a.z) + v * (t.c.z - t.a.z),
      );
      if (t.colore) colori.push(t.colore[0], t.colore[1], t.colore[2]);
      else colori.push(1, 1, 1);
    }
  }
  return { punti: new Float32Array(punti), colori: new Float32Array(colori) };
}

function coloreDiMesh(THREE, mesh) {
  const m = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  if (!m || !m.color) return null;
  return [m.color.r, m.color.g, m.color.b];
}

function coloreVertice(attr, i) {
  return [attr.getX(i), attr.getY(i), attr.getZ(i)];
}

/**
 * Il colore di una gaussiana non e' RGB: e' il termine costante di
 * un'armonica sferica. Va convertito, o si leggono numeri che sembrano
 * colori e non lo sono.
 */
export const SH_C0 = 0.28209479177387814;
export function coloreDaGaussiana(fDc) {
  return Math.min(1, Math.max(0, 0.5 + SH_C0 * fDc));
}

/** Ingombro di una nuvola. Serve a tutti, quindi sta qui una volta sola. */
export function ingombroDiPunti(punti) {
  if (!punti || !punti.length) return null;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < punti.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = punti[i + k];
      if (v < min[k]) min[k] = v;
      if (v > max[k]) max[k] = v;
    }
  }
  return { min, max, dim: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
}

export default {
  estensione, riconosciDaByte, estensioniAccettate,
  puntiDaMesh, ingombroDiPunti, coloreDaGaussiana, SH_C0, MB,
};
