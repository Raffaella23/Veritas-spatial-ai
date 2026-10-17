// I CORPI VERI DELLE PERSONE (v20, 16/10/2026, HANDOFF §13.8).
// Raffaella sulla v19: «corpi veri, non capsule di luce», come sul PC: la figura della
// Universal Animation Library di Quaternius (CC0, corpi/persona.gltf), alleggerita sul PC da
// strumenti/fai_corpo.mjs (2.671 triangoli; tre animazioni: cammina, fermo, seduto).
// Nel Quest 2 ventotto figure con lo scheletro costerebbero 28 disegni e 1.500 ossa da muovere
// a ogni fotogramma. Qui le pose si CUOCIONO una volta sola, all'apertura, in una trama
// (ogni riga una posa, ogni colonna un vertice): poi le 28 persone si disegnano in UNA chiamata
// e a ogni fotogramma cambiano solo tre numeri a testa (quale posa, la successiva, quanto fra
// le due). La luce e' quella del plastico (stessa stanza, stesso sole); il colore e' quello del
// profilo, con un filo di luce propria perche' si leggano sull'argilla anche a 1 cm d'altezza.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// [nome dell'animazione, pose cotte]: le pose intermedie le fa la scheda video
// v21 (17/10/2026): anche SEDERSI e ALZARSI, gesti che si fanno una volta (non in giro)
const CLIP = [["Walk_Loop", 24], ["Idle_Loop", 30], ["Sitting_Idle_Loop", 20], ["Sitting_Enter", 16], ["Sitting_Exit", 16]];
export const CAMMINA = 0, FERMO = 1, SEDUTO = 2, SIEDE = 3, ALZA = 4;
const UNA_VOLTA = new Set([SIEDE, ALZA]);
export const PASSO_CICLO = 1.45;   // metri di un giro del passo (due passi): il passo segue il cammino vero

export async function preparaCorpi({ BASE, quanti, altezza = 1.8, bagliore = 0.3 }) {
  const g = await new GLTFLoader().loadAsync(BASE + "corpo/corpo.glb");
  const radice = g.scene;
  radice.updateMatrixWorld(true);
  const pelli = [];
  radice.traverse((o) => { if (o.isSkinnedMesh) pelli.push(o); });
  if (!pelli.length) throw new Error("nel corpo non c'e' una figura con lo scheletro");
  // una figura sola: le due parti (il corpo e le giunture, piu' scure) una dopo l'altra
  const V = pelli.reduce((s, m) => s + m.geometry.attributes.position.count, 0);
  const indici = [], giunto = new Float32Array(V), aV = new Float32Array(V);
  let base = 0;
  for (const m of pelli) {
    const n = m.geometry.attributes.position.count, idx = m.geometry.index;
    if (idx) for (let i = 0; i < idx.count; i++) indici.push(idx.getX(i) + base);
    else for (let i = 0; i < n; i++) indici.push(i + base);
    const scuro = /joint/i.test((m.material && m.material.name) || "") ? 1 : 0;
    for (let i = 0; i < n; i++) { giunto[base + i] = scuro; aV[base + i] = base + i; }
    base += n;
  }
  // la cottura: per ogni posa, la posizione di ogni vertice (scheletro applicato) e la sua normale
  const F = CLIP.reduce((s, c) => s + c[1], 0);
  const dati = new Float32Array(V * 2 * F * 4);
  const tmp = new THREE.BufferGeometry();
  const pos = new Float32Array(V * 3);
  tmp.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  tmp.setIndex(indici);
  const mixer = new THREE.AnimationMixer(radice), v = new THREE.Vector3();
  const clips = [];
  let riga = 0, alto = 0, basso = Infinity;
  for (const [nome, n] of CLIP) {
    const clip = g.animations.find((c) => c.name === nome);
    if (!clip) throw new Error("manca l'animazione " + nome);
    mixer.stopAllAction();
    const azione = mixer.clipAction(clip); azione.reset().play();
    clips.push({ nome, inizio: riga, n, durata: clip.duration });
    for (let f = 0; f < n; f++) {
      mixer.setTime((f / n) * clip.duration);
      radice.updateMatrixWorld(true);
      let k = 0;
      for (const m of pelli) {
        const c = m.geometry.attributes.position.count;
        for (let i = 0; i < c; i++, k++) {
          m.getVertexPosition(i, v).applyMatrix4(m.matrixWorld);
          pos[3 * k] = v.x; pos[3 * k + 1] = v.y; pos[3 * k + 2] = v.z;
          if (nome === "Idle_Loop" && f === 0) { alto = Math.max(alto, v.y); basso = Math.min(basso, v.y); }
        }
      }
      tmp.computeVertexNormals();
      const nor = tmp.attributes.normal.array;
      for (let i = 0; i < V; i++) {
        const p = 4 * (riga * V + i), q = 4 * ((riga + F) * V + i);
        dati[p] = pos[3 * i]; dati[p + 1] = pos[3 * i + 1]; dati[p + 2] = pos[3 * i + 2]; dati[p + 3] = 1;
        dati[q] = nor[3 * i]; dati[q + 1] = nor[3 * i + 1]; dati[q + 2] = nor[3 * i + 2]; dati[q + 3] = 0;
      }
      riga++;
    }
  }
  mixer.stopAllAction();
  const trama = new THREE.DataTexture(dati, V, 2 * F, THREE.RGBAFormat, THREE.FloatType);
  trama.minFilter = trama.magFilter = THREE.NearestFilter; trama.generateMipmaps = false; trama.needsUpdate = true;

  // la figura di partenza (prima posa del cammino): serve al raggio della mano per «toccare» una persona
  const geo = new THREE.BufferGeometry();
  const p0 = new Float32Array(V * 3);
  for (let i = 0; i < V; i++) { p0[3 * i] = dati[4 * i]; p0[3 * i + 1] = dati[4 * i + 1]; p0[3 * i + 2] = dati[4 * i + 2]; }
  geo.setAttribute("position", new THREE.BufferAttribute(p0, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(V * 3).fill(0), 3));
  geo.setAttribute("aV", new THREE.BufferAttribute(aV, 1));
  geo.setAttribute("aGiunto", new THREE.BufferAttribute(giunto, 1));
  geo.setIndex(indici);
  geo.computeBoundingSphere();
  const posa = new THREE.InstancedBufferAttribute(new Float32Array(quanti * 3), 3);
  posa.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("aPosa", posa);

  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uVat = { value: trama }; sh.uniforms.uF = { value: F }; sh.uniforms.uBagliore = { value: bagliore };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform highp sampler2D uVat; uniform float uF;\nattribute float aV; attribute float aGiunto; attribute vec3 aPosa;\nvec3 vatP;")
      .replace("#include <beginnormal_vertex>", `int vi = int(aV + 0.5), fa = int(aPosa.x + 0.5), fb = int(aPosa.y + 0.5), nf = int(uF + 0.5);
  vatP = mix(texelFetch(uVat, ivec2(vi, fa), 0).xyz, texelFetch(uVat, ivec2(vi, fb), 0).xyz, aPosa.z);
  vec3 objectNormal = normalize(mix(texelFetch(uVat, ivec2(vi, fa + nf), 0).xyz, texelFetch(uVat, ivec2(vi, fb + nf), 0).xyz, aPosa.z) + vec3(0.0, 1e-5, 0.0));
  #ifdef USE_TANGENT
  vec3 objectTangent = vec3(tangent.xyz);
  #endif`)
      .replace("#include <begin_vertex>", "vec3 transformed = vatP;")
      .replace("#include <color_vertex>", "#include <color_vertex>\n  vColor.rgb *= mix(1.0, 0.42, aGiunto);");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uBagliore;")
      .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n  totalEmissiveRadiance += vColor.rgb * uBagliore;");
  };
  mat.customProgramCacheKey = () => "eidetica-corpi-cotti";

  const mesh = new THREE.InstancedMesh(geo, mat, quanti);
  mesh.name = "eidetica-corpi"; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
  const zero = new THREE.Matrix4().makeScale(0, 0, 0), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), su = new THREE.Vector3(0, 1, 0);
  const sc = altezza / Math.max(0.5, alto - basso), s3 = new THREE.Vector3(sc, sc, sc), t3 = new THREE.Vector3();
  for (let i = 0; i < quanti; i++) { mesh.setMatrixAt(i, zero); mesh.setColorAt(i, new THREE.Color(1, 1, 1)); }
  console.log("[EIDETICA visore] corpi veri: " + V + " vertici, " + (indici.length / 3) + " triangoli, " + F + " pose cotte (" + clips.map((c) => c.nome + " " + c.durata.toFixed(2) + " s").join(", ") + "), alti " + altezza + " m");

  return {
    mesh, clips, scala: sc,
    // una persona: dove (metri della pagina), verso dove guarda, che cosa fa, a che punto del gesto
    posa(i, x, y, z, angolo, clip, fase) {
      const c = clips[clip];
      // un gesto che si fa una volta si ferma all'ultima posa, non ricomincia
      const f = UNA_VOLTA.has(clip) ? Math.min(0.999, Math.max(0, fase)) * (c.n - 1) : (((fase % 1) + 1) % 1) * c.n, a = Math.floor(f);
      posa.setXYZ(i, c.inizio + a, c.inizio + (UNA_VOLTA.has(clip) ? Math.min(a + 1, c.n - 1) : (a + 1) % c.n), f - a);
      m4.compose(t3.set(x, y, z), q.setFromAxisAngle(su, angolo), s3);
      mesh.setMatrixAt(i, m4);
    },
    nascondi(i) { mesh.setMatrixAt(i, zero); },
    colora(i, colore) { mesh.setColorAt(i, colore); mesh.instanceColor.needsUpdate = true; },
    fine() { mesh.instanceMatrix.needsUpdate = true; posa.needsUpdate = true; },
  };
}
