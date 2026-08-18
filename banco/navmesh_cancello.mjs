// IL CANCELLO: navcat regge sul modello vero di Raffaella?
//
//     node banco/navmesh_cancello.mjs
//
// Prima di collegare qualsiasi cosa al programma si verifica che la libreria
// risolva davvero i tre difetti visti nel video del 18/08:
//   1. i passeggeri escono dall'aereo camminando sull'ALA
//   2. camminano al piano di TERRA sotto un'area che sta al piano di sopra
//   3. il percorso viene costruito fra due aerei
//
// Se questa prova non passa, il piano si ferma qui.
import fs from 'node:fs';
import { generateSoloNavMesh } from 'navcat/blocks';
import { findNearestPoly, createFindNearestPolyResult, findNodePath, findPath,
         DEFAULT_QUERY_FILTER } from 'navcat';

const SCALA = 6;            // la scala che il programma applica a questo file
const FILE = new URL('../airport_foot_traffic.glb', import.meta.url);

// --- lettura del GLB: TUTTI i triangoli, non solo quelli rivolti in su -------
// navcat voxelizza l'intera geometria: i muri, l'aereo e gli arredi diventano
// ostacoli da soli. E' esattamente il lavoro che facevo a mano.
const d = fs.readFileSync(FILE);
const jl = d.readUInt32LE(12);
const j = JSON.parse(d.slice(20, 20 + jl).toString('utf8'));
const bin = d.slice(20 + jl + 8);
const CT = { 5120:[Int8Array,1], 5121:[Uint8Array,1], 5122:[Int16Array,2],
             5123:[Uint16Array,2], 5125:[Uint32Array,4], 5126:[Float32Array,4] };
const NC = { SCALAR:1, VEC2:2, VEC3:3, VEC4:4 };
function acc(i) {
  const a = j.accessors[i], bv = j.bufferViews[a.bufferView];
  const [T, sz] = CT[a.componentType], n = NC[a.type];
  const off = (bv.byteOffset||0) + (a.byteOffset||0), stride = bv.byteStride||0;
  if (!stride || stride === sz*n) return new T(bin.buffer, bin.byteOffset+off, a.count*n);
  const out = new T(a.count*n);
  for (let k=0;k<a.count;k++){const b=off+k*stride;for(let c=0;c<n;c++)out[k*n+c]=new T(bin.buffer,bin.byteOffset+b+c*sz,1)[0];}
  return out;
}
const mul=(a,b)=>{const o=new Float64Array(16);for(let r=0;r<4;r++)for(let c=0;c<4;c++){let s=0;for(let k=0;k<4;k++)s+=a[k*4+r]*b[c*4+k];o[c*4+r]=s;}return o;};
function trs(n){ if(n.matrix) return Float64Array.from(n.matrix);
  const t=n.translation||[0,0,0], r=n.rotation||[0,0,0,1], s=n.scale||[1,1,1];
  const [x,y,z,w]=r, x2=x+x, y2=y+y, z2=z+z;
  return Float64Array.from([(1-(y*y2+z*z2))*s[0],(x*y2+w*z2)*s[0],(x*z2-w*y2)*s[0],0,
    (x*y2-w*z2)*s[1],(1-(x*x2+z*z2))*s[1],(y*z2+w*x2)*s[1],0,
    (x*z2+w*y2)*s[2],(y*z2-w*x2)*s[2],(1-(x*x2+y*y2))*s[2],0, t[0],t[1],t[2],1]);
}

const pos = [], idx = [];
let nTri = 0;
// Dove sono le cose: serve per fare le domande dopo.
let alaY = -1e9, alaXZ = null, terrY = null, terrXZ = null, apronXZ = null;
const bandaArea = new Map();   // per trovare terminal e piazzale

function walk(ni, M, nome) {
  const n = j.nodes[ni], L = mul(M, trs(n));
  const mio = n.name || nome;
  if (n.mesh != null) for (const p of j.meshes[n.mesh].primitives||[]) {
    if (p.mode != null && p.mode !== 4) continue;
    const P = acc(p.attributes.POSITION);
    const I = p.indices != null ? acc(p.indices) : null;
    const nt = I ? I.length/3 : P.length/9;
    const base = pos.length/3;
    const nv = P.length/3;
    for (let v = 0; v < nv; v++) {
      const b = v*3, x = P[b], y = P[b+1], z = P[b+2];
      pos.push((L[0]*x+L[4]*y+L[8]*z+L[12])*SCALA,
               (L[1]*x+L[5]*y+L[9]*z+L[13])*SCALA,
               (L[2]*x+L[6]*y+L[10]*z+L[14])*SCALA);
    }
    for (let t = 0; t < nt; t++) {
      const a0 = I ? I[t*3] : t*3, a1 = I ? I[t*3+1] : t*3+1, a2 = I ? I[t*3+2] : t*3+2;
      idx.push(base+a0, base+a1, base+a2); nTri++;
      // misure di servizio, sul triangolo appena aggiunto
      const g = (k)=>[pos[(base+k)*3], pos[(base+k)*3+1], pos[(base+k)*3+2]];
      const A=g(a0), B=g(a1), C=g(a2);
      const ux=B[0]-A[0],uy=B[1]-A[1],uz=B[2]-A[2],vx=C[0]-A[0],vy=C[1]-A[1],vz=C[2]-A[2];
      const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx, len=Math.hypot(nx,ny,nz);
      if (!len || Math.abs(ny)/len < 0.75) continue;
      const cy=(A[1]+B[1]+C[1])/3, cx=(A[0]+B[0]+C[0])/3, cz2=(A[2]+B[2]+C[2])/3;
      const b = Math.round(cy/0.3);
      const e = bandaArea.get(b) || {a:0, sx:0, sz:0, n:0};
      e.a += len/2; e.sx += cx; e.sz += cz2; e.n++; bandaArea.set(b, e);
      // il punto piu' alto su una parte d'aereo: e' l'ala
      if (/plane\.|wing|flap|aileron/i.test(mio||'') && cy > alaY && cy > 1.5) { alaY = cy; alaXZ = [cx, cy, cz2]; }
    }
  }
  for (const c of n.children||[]) walk(c, L, mio);
}
for (const r of j.scenes[j.scene||0].nodes) walk(r, Float64Array.from([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]), null);

// le due fasce piu' estese: piazzale e pavimento del terminal
const fasce = [...bandaArea.entries()].sort((a,b)=>b[1].a-a[1].a);
const q = (e)=>[e[1].sx/e[1].n, e[0]*0.3, e[1].sz/e[1].n];
apronXZ = q(fasce[0]);
const terr = fasce.find(f => Math.abs(f[0]*0.3 - fasce[0][0]*0.3) > 1.5);
terrXZ = terr ? q(terr) : null;

console.log('=== IL MODELLO ===');
console.log('  triangoli: ' + nTri.toLocaleString('it') + ', vertici: ' + (pos.length/3).toLocaleString('it'));
console.log('  piazzale  (fascia piu estesa): quota ' + apronXZ[1].toFixed(2) + ' m, ' + fasce[0][1].a.toFixed(0) + ' m2');
if (terrXZ) console.log('  terminal  (seconda fascia):   quota ' + terrXZ[1].toFixed(2) + ' m, ' + terr[1].a.toFixed(0) + ' m2');
console.log('  ala       (punto piu alto):   ' + (alaXZ ? 'quota ' + alaXZ[1].toFixed(2) + ' m' : 'non trovata'));

// --- la navmesh -------------------------------------------------------------
// Parametri in metri, cioe' le misure di una persona. Nient'altro.
const RAGGIO = 0.30, ALTEZZA = 2.0, GRADINO = 0.40, PENDENZA = 35;
const CELLA = 0.20, CELLA_H = GRADINO / 2;
// ⚠️ La libreria vuole le misure ANCHE in voxel, e usa quelle: passare solo i
// metri fa costruire una navmesh vuota, senza dire niente. Misurato.
const opzioni = {
  cellSize: CELLA,
  cellHeight: CELLA_H,
  walkableRadiusWorld: RAGGIO,
  walkableRadiusVoxels: Math.ceil(RAGGIO / CELLA),
  walkableHeightWorld: ALTEZZA,
  walkableHeightVoxels: Math.ceil(ALTEZZA / CELLA_H),
  walkableClimbWorld: GRADINO,
  walkableClimbVoxels: Math.ceil(GRADINO / CELLA_H),
  walkableSlopeAngleDegrees: PENDENZA,
  // isole piu' piccole di ~12 m2 non sono stanze: sono piani di chioschi,
  // monitor, spalle di persone. In celle: 12 / (0.20 * 0.20) = 300.
  minRegionArea: Math.round(12 / (CELLA*CELLA)),
  mergeRegionArea: Math.round(25 / (CELLA*CELLA)),
  maxSimplificationError: 1.3,
  maxEdgeLength: 12,
  maxVerticesPerPoly: 5,
  detailSampleDistance: CELLA * 6,
  detailSampleMaxError: CELLA_H * 1,
  borderSize: 0,
};
console.log('\n=== COSTRUZIONE DELLA NAVMESH ===');
console.log('  persona: raggio ' + RAGGIO + ' m, altezza ' + ALTEZZA + ' m, gradino ' + GRADINO + ' m, pendenza max ' + PENDENZA + '°');
console.log('  cella ' + CELLA + ' m, isola minima ' + (opzioni.minRegionArea*CELLA*CELLA).toFixed(0) + ' m2');
const t0 = Date.now();
const res = generateSoloNavMesh({ positions: new Float32Array(pos), indices: new Uint32Array(idx) }, opzioni);
const ms = Date.now() - t0;
const navMesh = res.navMesh;
console.log('  costruita in ' + ms + ' ms');

// quanti poligoni, e quanta area
let nPoly = 0, area = 0;
for (const key in navMesh.tiles) {
  const tile = navMesh.tiles[key];
  if (!tile || !tile.polys) continue;
  nPoly += tile.polys.length;
  for (const poly of tile.polys) {
    const v = poly.vertices;
    for (let k = 1; k + 1 < v.length; k++) {
      const A=[tile.vertices[v[0]*3],tile.vertices[v[0]*3+1],tile.vertices[v[0]*3+2]];
      const B=[tile.vertices[v[k]*3],tile.vertices[v[k]*3+1],tile.vertices[v[k]*3+2]];
      const C=[tile.vertices[v[k+1]*3],tile.vertices[v[k+1]*3+1],tile.vertices[v[k+1]*3+2]];
      area += Math.abs((B[0]-A[0])*(C[2]-A[2]) - (C[0]-A[0])*(B[2]-A[2]))/2;
    }
  }
}
console.log('  ' + nPoly + ' poligoni camminabili, ' + area.toFixed(0) + ' m2');

// --- LE TRE DOMANDE ---------------------------------------------------------
console.log('\n=== LE TRE DOMANDE DEL VIDEO ===');
function suNavmesh(p, nome, tol=[2,3,2]) {
  const r = createFindNearestPolyResult();
  findNearestPoly(r, navMesh, p, tol, DEFAULT_QUERY_FILTER);
  const ok = !!(r.success && r.nodeRef);
  return { ok, ref: ok ? r.nodeRef : null, punto: ok ? r.position : null,
           dy: ok ? Math.abs(r.position[1] - p[1]) : null, nome };
}

// 1. l'ala
if (alaXZ) {
  const a = suNavmesh(alaXZ, 'ala');
  const suAla = a.ok && a.dy < 1.0;
  console.log('1. L ALA e camminabile?   ' + (suAla ? 'SI  <<< il cancello NON passa' : 'NO  ✅')
    + (a.ok ? '   (la navmesh piu vicina sta ' + a.dy.toFixed(1) + ' m sotto)' : '   (nessuna navmesh li)'));
} else console.log('1. ala non individuata nel file');

// 2. piazzale e terminal separati?
const pz = suNavmesh(apronXZ, 'piazzale');
const tr = terrXZ ? suNavmesh(terrXZ, 'terminal') : null;
console.log('2. piazzale sulla navmesh: ' + (pz.ok ? 'si' : 'no') + '   |   terminal: ' + (tr && tr.ok ? 'si' : 'no'));
if (pz.ok && tr && tr.ok) {
  const cammino = findNodePath(navMesh, pz.ref, tr.ref, apronXZ, terrXZ, DEFAULT_QUERY_FILTER);
  const collegati = cammino && cammino.success && cammino.path && cammino.path.length > 0
                    && !(cammino.flags & 1);   // partial = non ci arriva
  console.log('   si passa a piedi dal piazzale al terminal?  '
    + (collegati ? 'si (c e una rampa o una scala nel modello)' : 'NO — sono due piani separati  ✅'));
}

// 3. il percorso vero: dove passa, e a che quota
if (pz.ok && tr && tr.ok) {
  const t1 = Date.now();
  for (let i = 0; i < 20; i++) findPath(navMesh, apronXZ, terrXZ, [2,3,2], DEFAULT_QUERY_FILTER);
  const msP = (Date.now()-t1)/20;
  const r = findPath(navMesh, apronXZ, terrXZ, [2,3,2], DEFAULT_QUERY_FILTER);
  console.log('3. un percorso completo: ' + msP.toFixed(1) + ' ms');
  if (r && r.path && r.path.length) {
    const q = r.path.map(p => p.position ? p.position : p);
    console.log('   ' + q.length + ' tappe, dalla quota ' + q[0][1].toFixed(2)
      + ' m alla quota ' + q[q.length-1][1].toFixed(2) + ' m');
    // Il profilo delle quote: se sale con gradualita' e' una rampa, se salta
    // di due metri e mezzo in una tappa e' l'aereo o un errore.
    let saltoMax = 0, doveSalto = null;
    for (let k = 1; k < q.length; k++) {
      const dy = Math.abs(q[k][1] - q[k-1][1]);
      const dx = Math.hypot(q[k][0]-q[k-1][0], q[k][2]-q[k-1][2]);
      if (dy > saltoMax) { saltoMax = dy; doveSalto = [q[k-1], q[k], dx]; }
    }
    console.log('   salto di quota piu grande fra due tappe: ' + saltoMax.toFixed(2) + ' m'
      + (doveSalto ? ' su ' + doveSalto[2].toFixed(1) + ' m di percorso' : ''));
    console.log('   ' + (saltoMax < 0.5
      ? 'sale con gradualita: e una rampa vera nel modello  ✅'
      : 'SALTA: da guardare, potrebbe non essere un passaggio vero'));
  }
}

// 4. e' rimasta roba per aria? (piani di chioschi, monitor, spalle)
{
  const quote = [];
  for (const key in navMesh.tiles) {
    const tile = navMesh.tiles[key];
    if (!tile || !tile.polys) continue;
    for (const poly of tile.polys) {
      let y = 0; const v = poly.vertices;
      for (const vi of v) y += tile.vertices[vi*3+1];
      quote.push(y / v.length);
    }
  }
  quote.sort((a,b)=>a-b);
  const conta = new Map();
  for (const y of quote) { const b = Math.round(y/0.5); conta.set(b, (conta.get(b)||0)+1); }
  console.log('\n=== A CHE QUOTA STA LA NAVMESH ===');
  for (const [b, n] of [...conta.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8))
    console.log('   quota ' + (b*0.5).toFixed(1).padStart(6) + ' m   ' + String(n).padStart(4) + ' poligoni');
}
