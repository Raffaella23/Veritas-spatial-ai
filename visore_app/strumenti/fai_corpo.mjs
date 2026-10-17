// IL CORPO DELLE PERSONE PER IL VISORE (v20, 16/10/2026, HANDOFF §13.8).
// Raffaella sulla v19: «corpi veri, non capsule di luce», come sul PC (corpi/persona.gltf,
// Universal Animation Library di Quaternius, CC0: 13.743 triangoli e 46 animazioni, 4,2 MB).
// Nel Quest 2 ventotto corpi cosi' costano troppo: qui si tiene SOLO quello che serve
// (cammina, fermo, seduto) e si alleggerisce la figura, conservando ossa e pesi.
// Il visore poi «cuoce» le pose in una trama e disegna le 28 persone in UNA chiamata.
//
//   node strumenti/fai_corpo.mjs ../corpi/persona.gltf public_corpo/corpo.glb
import { NodeIO } from "@gltf-transform/core";
import { weld, simplify, prune, dedup, resample } from "@gltf-transform/functions";
import { MeshoptSimplifier } from "meshoptimizer";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const [, , entrata = "../corpi/persona.gltf", uscita = "public_corpo/corpo.glb"] = process.argv;
// v21 (17/10): anche SEDERSI e ALZARSI (Raffaella: «aggiungere animazioni per sedersi, per aspettare»)
const TENERE = ["Walk_Loop", "Idle_Loop", "Sitting_Idle_Loop", "Sitting_Enter", "Sitting_Exit"];
const RAPPORTO = Number(process.env.RAPPORTO || 0.16);   // ~2.200 triangoli: a 1:177 la persona e' alta 1 cm

const io = new NodeIO();
const doc = await io.read(entrata);
const root = doc.getRoot();
const conta = () => root.listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((t, p) => t + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute("POSITION").getCount()) / 3, 0), 0);
const prima = conta();
for (const a of root.listAnimations()) if (!TENERE.includes(a.getName())) {   // con canali e campionatori: se no le chiavi restano nel file
  for (const c of a.listChannels()) c.dispose();
  for (const s of a.listSamplers()) { const i = s.getInput(), o = s.getOutput(); s.dispose(); for (const x of [i, o]) if (x && x.listParents().every((p) => p.propertyType === "Root")) x.dispose(); }
  a.dispose();
}
await MeshoptSimplifier.ready;
await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: RAPPORTO, error: 0.004, lockBorder: false }), resample({ tolerance: 1e-3 }), dedup(), prune());
// le chiavi delle 43 animazioni tolte restano orfane (prune non le vede): via a mano
for (const a of root.listAccessors()) if (a.listParents().every((p) => p.propertyType === "Root")) a.dispose();
mkdirSync(dirname(uscita), { recursive: true });
await io.write(uscita, doc);
console.log("corpo: " + Math.round(prima) + " -> " + Math.round(conta()) + " triangoli; animazioni: " + root.listAnimations().map((a) => a.getName()).join(", ") + " -> " + uscita);
