// Prove dello strato di ingresso.
//
//     node veritas_ingest.test.mjs
//
// Provano la LOGICA PURA di riconoscimento: nessun three, nessun DOM. Le
// sequenze di byte non sono inventate, vengono da file reali (l'intestazione
// PLY e' copiata da un file del dataset 3DGS, letta a inizio sessione).

import {
  estensione, riconosciDaByte, estensioniAccettate,
  ingombroDiPunti, coloreDaGaussiana, SH_C0,
} from "./veritas_ingest.js";

let fatte = 0, rotte = 0;
function ok(cond, che) {
  fatte++;
  if (cond) console.log("  ok   " + che);
  else { rotte++; console.log("  ROTTO " + che); }
}
function uguale(a, b, che) { ok(a === b, `${che}  (${JSON.stringify(a)})`); }

const byte = (s) => new Uint8Array([...s].map((c) => c.charCodeAt(0)));

// --- intestazione di gaussiane, copiata da un file vero -------------------
const PLY_GAUSSIANE = byte(
  "ply\nformat binary_little_endian 1.0\nelement vertex 1495461\n" +
  "property float x\nproperty float y\nproperty float z\n" +
  "property float nx\nproperty float ny\nproperty float nz\n" +
  "property float f_dc_0\nproperty float f_dc_1\nproperty float f_dc_2\n" +
  "property float f_rest_0\nproperty float f_rest_1\n" +
  "property float opacity\nproperty float scale_0\nproperty float scale_1\n" +
  "property float scale_2\nproperty float rot_0\nproperty float rot_1\n" +
  "end_header\n"
);

// --- intestazione di una nuvola PLY classica ------------------------------
const PLY_NUVOLA = byte(
  "ply\nformat binary_little_endian 1.0\nelement vertex 100000\n" +
  "property float x\nproperty float y\nproperty float z\n" +
  "property uchar red\nproperty uchar green\nproperty uchar blue\n" +
  "end_header\n"
);

console.log("\n=== estensione ===");
uguale(estensione("modello.GLB"), "glb", "estensione normalizzata minuscola");
uguale(estensione("a.b.c.fbx"), "fbx", "prende l'ultima di un nome con piu' punti");
uguale(estensione("senzapunto"), "", "nome senza estensione");

console.log("\n=== firma binaria, non estensione ===");
const glb = new Uint8Array(20); glb.set(byte("glTF"), 0);
uguale(riconosciDaByte(glb, "qualsiasi.txt").formato, "glb",
  "un glb rinominato .txt resta un glb");
uguale(riconosciDaByte(glb, "qualsiasi.txt").famiglia, "mesh", "famiglia mesh");

const fbx = new Uint8Array(40); fbx.set(byte("Kaydara FBX Binary"), 0);
uguale(riconosciDaByte(fbx, "boh.dat").formato, "fbx", "FBX binario dalla firma");

console.log("\n=== .ply: il caso ambiguo, il piu' importante ===");
const g = riconosciDaByte(PLY_GAUSSIANE, "scena.ply");
uguale(g.formato, "ply-gaussiane", "PLY con f_dc/scale/rot = gaussiane");
uguale(g.famiglia, "splat", "famiglia splat");
ok(g.gaussiane === true, "marcato come gaussiane");

const n = riconosciDaByte(PLY_NUVOLA, "scena.ply");
uguale(n.formato, "ply-nuvola", "PLY senza quelle proprieta' = nuvola classica");
uguale(n.famiglia, "nuvola", "famiglia nuvola");
ok(n.gaussiane === false, "NON marcato come gaussiane");
ok(g.formato !== n.formato,
  "due file con la STESSA estensione .ply finiscono su strade diverse");

console.log("\n=== gltf come JSON ===");
const gltf = byte('{"asset":{"version":"2.0"},"scenes":[]}');
uguale(riconosciDaByte(gltf, "x.gltf").formato, "gltf", "gltf riconosciuto dal JSON");
uguale(riconosciDaByte(byte("FBXHeaderExtension {"), "x.fbx").formato, "fbx",
  "FBX testuale dall'intestazione");

console.log("\n=== ripiego sull'estensione, dichiarato ===");
const ignoto = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
uguale(riconosciDaByte(ignoto, "s.spz").formato, "spz", "spz per estensione");
uguale(riconosciDaByte(ignoto, "s.spz").famiglia, "splat", "spz e' splat");
ok(riconosciDaByte(ignoto, "s.spz").motivo.includes("estensione"),
  "dichiara di aver usato l'estensione, non finge una firma");
uguale(riconosciDaByte(ignoto, "s.ksplat").famiglia, "splat", "ksplat");
uguale(riconosciDaByte(ignoto, "s.sog").famiglia, "splat", "sog");
uguale(riconosciDaByte(ignoto, "s.obj").famiglia, "mesh", "obj e' mesh");

console.log("\n=== formato sconosciuto: dice di no, non tira a indovinare ===");
const no = riconosciDaByte(ignoto, "documento.pdf");
uguale(no.formato, null, "pdf rifiutato");
ok(no.motivo.includes("non riconosciuto"), "spiega il rifiuto");

console.log("\n=== elenco per l'attributo accept ===");
const acc = estensioniAccettate();
for (const e of [".glb", ".gltf", ".fbx", ".obj", ".ply", ".splat", ".ksplat", ".spz", ".sog"]) {
  ok(acc.includes(e), `accept contiene ${e}`);
}

console.log("\n=== IFC: l'unico formato che porta dentro la semantica ===");
// Un IFC e' un file STEP e comincia sempre per ISO-10303-21. E' il formato in
// cui le stanze hanno ancora un nome — vedi veritas_bim.js e il blocco rosso
// in cima a CLAUDE.md.
const ifc = byte("ISO-10303-21;\nHEADER;\nFILE_SCHEMA(('IFC4'));\n");
uguale(riconosciDaByte(ifc, "progetto.ifc").formato, "ifc", "un IFC dalla firma");
uguale(riconosciDaByte(ifc, "progetto.ifc").famiglia, "bim", "famiglia bim, non mesh");
uguale(riconosciDaByte(ifc, "senzaestensione").formato, "ifc",
  "e si riconosce anche senza estensione, come tutti gli altri");
// Il BOM di UTF-8 e' TRE BYTE: un editor Windows lo mette, e senza saltarlo
// il file risulta di formato sconosciuto.
uguale(riconosciDaByte(new Uint8Array([0xEF, 0xBB, 0xBF, ...ifc]), "x.ifc").formato, "ifc",
  "un BOM di UTF-8 davanti non lo nasconde");
uguale(riconosciDaByte(new Uint8Array([1, 2, 3, 4]), "x.ifc").formato, "ifc",
  "e in mancanza di firma vale l'estensione, dichiarandolo");
ok(acc.includes(".ifc"), "accept contiene .ifc");

console.log("\n=== colore di una gaussiana ===");
ok(Math.abs(coloreDaGaussiana(0) - 0.5) < 1e-9,
  "f_dc = 0 da' grigio medio 0.5, non 0");
ok(coloreDaGaussiana(1) > 0.5 && coloreDaGaussiana(-1) < 0.5,
  "il segno di f_dc muove il colore nel verso giusto");
ok(coloreDaGaussiana(99) === 1 && coloreDaGaussiana(-99) === 0,
  "resta dentro 0..1");
ok(Math.abs(SH_C0 - 0.28209479177387814) < 1e-15,
  "la costante SH e' quella dello standard 3DGS");

console.log("\n=== ingombro ===");
const p = new Float32Array([0, 0, 0, 2, 4, 6, -1, 1, 3]);
const ing = ingombroDiPunti(p);
uguale(ing.min[0], -1, "min x");
uguale(ing.max[1], 4, "max y");
uguale(ing.dim[2], 6, "dimensione z");
ok(ingombroDiPunti(new Float32Array(0)) === null, "nuvola vuota da' null");

console.log(`\n${fatte - rotte}/${fatte} verifiche passate`);
process.exit(rotte ? 1 : 0);
