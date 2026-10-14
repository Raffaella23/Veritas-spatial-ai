// IL PLASTICO PER IL VISORE (14/10/2026, primo passo del §13).
// Dal GLB grezzo al plastico d'argilla gia' unito per materiale, come lo fa
// veritas_visore.js nella pagina (uniscIlPlastico) ma una volta sola, sul PC:
// il visore apre il file e basta.
// La veste e' quella di veritas_carta.js (argillaPer): argilla 0x6b707a opaca;
// le immagini ritagliate (gente, piante) restano SOLO come ritaglio; i vetri
// restano vetri con l'opacita' arrotondata al decimo.
// Restano fuori, per ora: i pezzi animati e con scheletro (le personcine
// verranno dai percorsi del pacchetto).
//
//   node strumenti/fai_plastico.mjs <entrata.glb> <uscita.glb>
import { NodeIO } from "@gltf-transform/core";
import { flatten, join, prune, dedup, weld } from "@gltf-transform/functions";

const [entrata, uscita] = process.argv.slice(2);
const io = new NodeIO();
const doc = await io.read(entrata);
const root = doc.getRoot();
const prima = conta(root);

// 1. via animazioni e scheletri, e i pezzi che li usano
for (const a of root.listAnimations()) a.dispose();
let scheletrici = 0;
for (const n of root.listNodes()) {
  if (n.getSkin()) { n.setSkin(null); if (n.getMesh()) { n.setMesh(null); scheletrici++; } }
}
for (const s of root.listSkins()) s.dispose();

// 2. la veste d'argilla (veritas_carta.js, argillaPer)
const ARGILLA = [0x6b / 255, 0x70 / 255, 0x7a / 255, 1].map((c, i) => (i < 3 ? Math.pow(c, 2.2) : c));
const opaca = doc.createMaterial("eidetica-argilla").setBaseColorFactor(ARGILLA)
  .setRoughnessFactor(0.9).setMetallicFactor(0.02);
const sagome = new Map(), vetri = new Map();
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) {
  const vecchio = p.getMaterial();
  const trasparente = vecchio && vecchio.getAlphaMode() !== "OPAQUE";
  if (!trasparente) { p.setMaterial(opaca); continue; }
  const img = vecchio.getBaseColorTexture();
  if (img) {
    if (!sagome.has(img)) sagome.set(img, doc.createMaterial("eidetica-argilla-sagoma")
      .setBaseColorFactor(ARGILLA).setRoughnessFactor(0.9).setMetallicFactor(0.02)
      .setBaseColorTexture(img).setAlphaMode("MASK").setAlphaCutoff(0.5)
      .setDoubleSided(vecchio.getDoubleSided()));
    p.setMaterial(sagome.get(img));
    continue;
  }
  const o = Math.max(0.1, Math.min(0.6, Math.round((vecchio.getBaseColorFactor()[3] ?? 0.5) * 10) / 10));
  const k = o + (vecchio.getDoubleSided() ? "d" : "");
  if (!vetri.has(k)) vetri.set(k, doc.createMaterial("eidetica-argilla-vetro")
    .setBaseColorFactor([...ARGILLA.slice(0, 3), o]).setRoughnessFactor(0.6).setMetallicFactor(0.02)
    .setAlphaMode("BLEND").setDoubleSided(vecchio.getDoubleSided()));
  p.setMaterial(vetri.get(k));
}
// le sagome tengono solo il ritaglio: niente normali da immagine, niente colori per vertice
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) {
  if (p.getAttribute("COLOR_0")) p.setAttribute("COLOR_0", null);
  if (p.getMaterial() === opaca) for (const s of p.listSemantics()) if (s.startsWith("TEXCOORD")) p.setAttribute(s, null);
}

// 3. unito per materiale
await doc.transform(prune(), dedup(), flatten(), join({ keepNamed: false }), weld(), prune());
const dopo = conta(root);
await io.write(uscita, doc);
console.log(JSON.stringify({ prima, dopo, scheletrici, sagome: sagome.size, vetri: vetri.size }));

function conta(r) {
  let pezzi = 0, tri = 0;
  for (const m of r.listMeshes()) for (const p of m.listPrimitives()) {
    pezzi++; const i = p.getIndices(); tri += (i ? i.getCount() : p.getAttribute("POSITION").getCount()) / 3;
  }
  return { pezzi, triangoli: Math.round(tri), materiali: r.listMaterials().length, immagini: r.listTextures().length };
}
