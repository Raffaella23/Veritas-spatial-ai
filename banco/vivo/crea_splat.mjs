// Un Gaussian Splat di prova, fatto qui e non scaricato: un appartamento di
// 12 x 8 m, muri alti 2,7 m, tre stanze e un corridoio, porte da 0,75 / 0,90 /
// 1,20 m. Formato PLY del 3DGS (x,y,z, f_dc, opacity, scale, rot), grado 0.
//   node crea_splat.mjs stanze.ply
import fs from "node:fs";

const uscita = process.argv[2] || "stanze.ply";
const PASSO = 0.07, SIGMA = 0.045, SPESSORE = 0.008, H = 2.7;
const C0 = 0.28209479177387814;
const punti = [];
let seme = 7;
const caso = () => { seme = (seme * 16807) % 2147483647; return seme / 2147483647; };
function aggiungi(x, y, z, sx, sy, sz, r, g, b) {
  const v = 0.04 * (caso() - 0.5);
  punti.push([x, y, z, (r + v - 0.5) / C0, (g + v - 0.5) / C0, (b + v - 0.5) / C0, 4.0,
    Math.log(sx), Math.log(sy), Math.log(sz), 1, 0, 0, 0]);
}
// pavimento, legno chiaro
for (let x = 0; x <= 12; x += PASSO) for (let z = 0; z <= 8; z += PASSO)
  aggiungi(x, 0, z, SIGMA, SPESSORE, SIGMA, 0.46, 0.4, 0.33);
// un muro lungo x (a quota z) da x0 a x1, con i vani [da, a] lasciati aperti
function muroX(z, x0, x1, vani = []) {
  for (let x = x0; x <= x1; x += PASSO) {
    for (let y = PASSO / 2; y <= H; y += PASSO) {
      if (vani.some(([a, b]) => x > a && x < b && y < 2.1)) continue;
      aggiungi(x, y, z, SIGMA, SIGMA, SPESSORE, 0.93 - 0.12 * (1 - y / H), 0.92 - 0.12 * (1 - y / H), 0.9 - 0.12 * (1 - y / H));
    }
  }
}
function muroZ(x, z0, z1, vani = []) {
  for (let z = z0; z <= z1; z += PASSO) {
    for (let y = PASSO / 2; y <= H; y += PASSO) {
      if (vani.some(([a, b]) => z > a && z < b && y < 2.1)) continue;
      aggiungi(x, y, z, SPESSORE, SIGMA, SIGMA, 0.66 - 0.1 * (1 - y / H), 0.66 - 0.1 * (1 - y / H), 0.68 - 0.1 * (1 - y / H));
    }
  }
}
// perimetro, con la porta d'ingresso da 1,20 m sul lato sud
muroX(0, 0, 12, [[5.4, 6.6]]);
muroX(8, 0, 12);
muroZ(0, 0, 8);
muroZ(12, 0, 8);
// corridoio lungo x fra z = 3 e z = 4,4; stanze a nord (z 4,4..8) e a sud-ovest
muroX(3, 0, 5.4 - 0.001);            // stanza sud-ovest chiusa verso il corridoio...
muroX(3, 6.6, 12);                   // ...e sud-est
muroX(4.4, 0, 12, [[1.5, 2.25], [7.0, 7.9]]);   // porte da 0,75 e 0,90 verso nord
muroZ(6, 4.4, 8);                    // divide le due stanze a nord
muroZ(3, 0, 3, [[1.0, 1.9]]);        // porta da 0,90 fra le due stanze a sud
// qualche mobile, perche' l'occhio abbia qualcosa da guardare
function scatola(x0, x1, z0, z1, h, r, g, b) {
  for (let x = x0; x <= x1; x += PASSO) for (let z = z0; z <= z1; z += PASSO) aggiungi(x, h, z, SIGMA, SPESSORE, SIGMA, r, g, b);
  for (let y = PASSO / 2; y < h; y += PASSO) {
    for (let x = x0; x <= x1; x += PASSO) { aggiungi(x, y, z0, SIGMA, SIGMA, SPESSORE, r, g, b); aggiungi(x, y, z1, SIGMA, SIGMA, SPESSORE, r, g, b); }
    for (let z = z0; z <= z1; z += PASSO) { aggiungi(x0, y, z, SPESSORE, SIGMA, SIGMA, r, g, b); aggiungi(x1, y, z, SPESSORE, SIGMA, SIGMA, r, g, b); }
  }
}
scatola(1.0, 3.0, 6.0, 7.6, 0.45, 0.35, 0.42, 0.62);   // divano
scatola(8.0, 9.6, 5.6, 6.6, 0.75, 0.55, 0.38, 0.25);   // tavolo
scatola(9.0, 11.6, 0.3, 0.9, 0.9, 0.82, 0.82, 0.84);   // piano cucina

const props = ["x", "y", "z", "f_dc_0", "f_dc_1", "f_dc_2", "opacity", "scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3"];
const testa = "ply\nformat binary_little_endian 1.0\nelement vertex " + punti.length + "\n"
  + props.map((p) => "property float " + p).join("\n") + "\nend_header\n";
const corpo = Buffer.alloc(punti.length * props.length * 4);
let o = 0;
for (const p of punti) for (const v of p) { corpo.writeFloatLE(v, o); o += 4; }
fs.writeFileSync(uscita, Buffer.concat([Buffer.from(testa, "ascii"), corpo]));
console.log(uscita + ": " + punti.length + " gaussiane, " + (corpo.length / 1e6).toFixed(1) + " MB");
