// La folla:  node veritas_folla.test.mjs
//
// §0.9 (17/10/2026) — NESSUNA di queste scene e' un aeroporto. Una scuola con due
// piani e una rampa vista dall'occhio, una chiesa con navata e cappella divise da
// un muro con una porta vista dall'occhio, e una coda davanti a uno sportello.
// Se la folla funzionasse solo sul terminal, qui fallirebbe.
import * as T from 'three';
import * as nav from 'navcat';
import * as blocks from 'navcat/blocks';
import { costruisciDaScena } from './veritas_navmesh.js';
import { simula, missioni, accessiDaiPassaggi } from './veritas_folla.js';

let ko = 0;
const check = (n, ok, d = '') => { console.log((ok ? '  ok  ' : ' FAIL ') + n + (d ? '   ' + d : '')); if (!ok) ko++; };
const scatola = (radice, x0, y0, z0, x1, y1, z1, nome) => {
  const m = new T.Mesh(new T.BoxGeometry(x1 - x0, y1 - y0, z1 - z0));
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.name = nome; radice.add(m); return m;
};
const persone = (quante, tappe, partenza = (i) => i * 2) => Array.from({ length: quante }, (_, i) => ({
  id: i, archetipo: 'student', gruppo: Math.floor(i / 3), velocita: 1.1, raggio: 0.3, partenza: partenza(i), tappe }));
const contaScala = (frames) => frames.reduce((s, f) => s + f.agents.filter((a) => a.suScala).length, 0);

console.log('\n1. La scuola: si sale dal piano terra al primo per la rampa vista');
{
  const r = new T.Group();
  scatola(r, 0, -0.1, 0, 10.4, 0, 8, 'piano terra');
  scatola(r, 14.0, 1.9, 0, 24, 2.0, 8, 'piano primo');
  const rampa = new T.Mesh(new T.BoxGeometry(Math.hypot(4.4, 2), 0.1, 0.62));
  rampa.position.set(12.2, 1.0, 4); rampa.rotation.z = Math.atan2(2, 4.4); r.add(rampa);
  r.updateMatrixWorld(true);
  const rete = await costruisciDaScena(T, r, { coseNominate: [{ termine: 'stairs', nome: 'scale', postura: 'passa',
    min: [9.9, -0.1, 3.5], max: [14.5, 2.2, 4.5] }] });
  const m = missioni({ nav, navMesh: rete.navMesh, stato: rete,
    nodi: [{ name: 'ingresso', type: 'origine', pos: [2, 0, 2] }, { name: 'aula', type: 'destinazione', pos: [22, 2, 6] }], accessi: [] });
  check('una missione dall ingresso all aula', m.missioni.some((x) => x.verso === 'andata'), m.missioni.map((x) => x.nome).join(' | '));
  const andata = m.missioni.find((x) => x.verso === 'andata');
  const res = await simula({ nav, crowd: blocks.crowd, navMesh: rete.navMesh, persone: persone(9, andata ? andata.tappe : []), durata: 90 });
  check('tutti e 9 arrivano in aula', res.esiti.every((e) => e.uscita), res.esiti.map((e) => e.fatte + (e.uscita ? 'ok' : '')).join(' '));
  check('prendono la rampa alla velocita della scala (0,5 m/s): ci passano piu fotogrammi', contaScala(res.frames) >= 9 * 5, contaScala(res.frames) + ' fotogrammi sulla rampa');
  const sopra = res.frames.flatMap((f) => f.agents).filter((a) => a.pos[1] > 1.5 && !a.suScala);
  check('al primo piano camminano sul pavimento del primo piano', sopra.length > 0 && sopra.every((a) => a.pos[0] > 13.5), sopra.length + ' posizioni al primo piano');
}

console.log('\n2. La chiesa: dalla navata alla cappella, solo dalla porta vista');
{
  const r = new T.Group();
  scatola(r, 0, -0.1, 0, 12, 0, 8, 'navata'); scatola(r, 12.2, -0.1, 0, 18, 0, 8, 'cappella');
  scatola(r, 12, 0, 0, 12.2, 3, 3.5, 'muro'); scatola(r, 12, 0, 4.5, 12.2, 3, 8, 'muro');
  scatola(r, 12, 2.1, 3.5, 12.2, 3, 4.5, 'architrave'); scatola(r, 12.05, 0, 3.5, 12.15, 2.1, 4.5, 'anta chiusa');
  r.updateMatrixWorld(true);
  const rete = await costruisciDaScena(T, r, { coseNominate: [{ termine: 'door', nome: 'porta', postura: 'passa',
    min: [11.9, 0, 3.45], max: [12.3, 2.15, 4.55] }] });
  const tappe = [{ pos: [3, 0, 1], attesa: 0 }, { pos: [16, 0, 7], attesa: 0 }];
  const res = await simula({ nav, crowd: blocks.crowd, navMesh: rete.navMesh, persone: persone(6, tappe), durata: 80 });
  check('tutti e 6 arrivano nella cappella', res.esiti.every((e) => e.uscita));
  const muro = res.frames.flatMap((f) => f.agents).filter((a) => a.pos[0] > 11.9 && a.pos[0] < 12.3);
  check('il muro si attraversa solo dove c e la porta', muro.length > 0 && muro.every((a) => a.pos[2] > 3.3 && a.pos[2] < 4.7), muro.length + ' passaggi nel muro');
  check('accessiDaiPassaggi: una porta fra due stanze non e un accesso', accessiDaiPassaggi(rete).length === 0);
}

console.log('\n3. Lo sportello: chi arriva fa la fila, uno alla volta');
{
  const r = new T.Group();
  scatola(r, 0, -0.1, 0, 20, 0, 10, 'atrio');
  r.updateMatrixWorld(true);
  const rete = await costruisciDaScena(T, r, {});
  const tappe = [{ pos: [2, 0, 5], attesa: 0 }, { pos: [15, 0, 5], attesa: 6, fila: true, nome: 'sportello' }, { pos: [18, 0, 9], attesa: 0 }];
  const res = await simula({ nav, crowd: blocks.crowd, navMesh: rete.navMesh, persone: persone(6, tappe, (i) => i * 0.5), durata: 120 });
  check('tutti e 6 passano dallo sportello e escono', res.esiti.every((e) => e.uscita && e.fatte >= 2));
  // in un istante di coda: quanti aspettano in fila, e a che distanza l'uno dall'altro
  let fila = 0, distMin = Infinity;
  for (const f of res.frames) {
    const ferme = f.agents.filter((a) => a.state === 'WAITING');
    if (ferme.length > fila) fila = ferme.length;
    for (let i = 0; i < ferme.length; i++) for (let k = i + 1; k < ferme.length; k++)
      distMin = Math.min(distMin, Math.hypot(ferme[i].pos[0] - ferme[k].pos[0], ferme[i].pos[2] - ferme[k].pos[2]));
  }
  check('si forma una fila (almeno 3 persone ferme insieme)', fila >= 3, 'al massimo ' + fila + ' in attesa');
  check('in fila non si sta uno dentro l altro (almeno 0,5 m)', distMin >= 0.5, 'distanza minima ' + distMin.toFixed(2) + ' m');
}

console.log('\n4. La carrozzina (17/10 sera): non sale le scale; una rampa a norma si');
{
  const misti = (tappe) => Array.from({ length: 6 }, (_, i) => i < 3
    ? { id: i, archetipo: 'student', gruppo: 0, velocita: 1.1, raggio: 0.3, partenza: i * 2, tappe }
    : { id: i, archetipo: 'wheelchair', gruppo: 1, velocita: 0.85, raggio: 0.45, partenza: i * 2, tappe, soloAccessibile: true });
  // la scuola del punto 1: fra i due piani solo le scale (24 gradi)
  const r = new T.Group();
  scatola(r, 0, -0.1, 0, 10.4, 0, 8, 'piano terra');
  scatola(r, 14.0, 1.9, 0, 24, 2.0, 8, 'piano primo');
  const rampa = new T.Mesh(new T.BoxGeometry(Math.hypot(4.4, 2), 0.1, 0.62));
  rampa.position.set(12.2, 1.0, 4); rampa.rotation.z = Math.atan2(2, 4.4); r.add(rampa);
  r.updateMatrixWorld(true);
  const rete = await costruisciDaScena(T, r, { coseNominate: [{ termine: 'stairs', nome: 'scale', postura: 'passa',
    min: [9.9, -0.1, 3.5], max: [14.5, 2.2, 4.5] }] });
  const tappe = [{ nome: 'ingresso', pos: [2, 0, 2] }, { nome: 'aula', pos: [22, 2, 6] }];
  const res = await simula({ nav, crowd: blocks.crowd, navMesh: rete.navMesh, persone: misti(tappe), durata: 90 });
  const carr = res.frames.flatMap((f) => f.agents).filter((a) => a.id >= 3);
  check('scuola: chi va in carrozzina non sale le scale', carr.length > 0 && carr.every((a) => !a.suScala && a.pos[1] < 1.5),
    carr.filter((a) => a.suScala || a.pos[1] >= 1.5).length + ' posizioni sulle scale o al primo piano');
  check('scuola: in carrozzina e senza strada non risulta arrivato', res.esiti.filter((e) => e.id >= 3).every((e) => !e.uscita && e.fatte === 0));
  check('scuola: gli altri salgono e arrivano', res.esiti.filter((e) => e.id < 3).every((e) => e.uscita));

  // il museo: fra la sala e il mezzanino una rampa al 7% (1,0 m su 14 m)
  const m = new T.Group();
  scatola(m, 0, -0.1, 0, 10, 0, 8, 'sala');
  scatola(m, 24, 0.9, 0, 32, 1.0, 8, 'mezzanino');
  const dolce = new T.Mesh(new T.BoxGeometry(Math.hypot(14, 1), 0.1, 2.0));
  dolce.position.set(17, 0.45, 4); dolce.rotation.z = Math.atan2(1, 14); m.add(dolce);
  m.updateMatrixWorld(true);
  const reteM = await costruisciDaScena(T, m, { coseNominate: [{ termine: 'ramp', nome: 'rampa', postura: 'passa',
    min: [9.5, -0.1, 2.8], max: [24.5, 1.2, 5.2] }] });
  const resM = await simula({ nav, crowd: blocks.crowd, navMesh: reteM.navMesh, durata: 120,
    persone: misti([{ nome: 'sala', pos: [3, 0, 4] }, { nome: 'mezzanino', pos: [29, 1, 4] }]) });
  check('museo: sulla rampa al 7% sale anche chi va in carrozzina', resM.esiti.every((e) => e.uscita),
    resM.esiti.map((e) => e.id + ':' + e.fatte + (e.uscita ? 'ok' : '')).join(' '));

  // 17/10 sera: lo stesso accesso detto da due fonti (una meta vista e un accesso
  // trovato a 30 cm) non fa una missione da un punto a se' stesso
  const doppio = missioni({ nav, navMesh: reteM.navMesh, stato: reteM,
    nodi: [{ name: 'mezzanino', type: 'destinazione', pos: [29, 1, 4] }],
    accessi: [{ nome: 'Accesso 1', centro: [29, 1, 4.3] }, { nome: 'ingresso', centro: [3, 0, 4] }] });
  const lunghezze = doppio.missioni.map((x) => Math.hypot(x.tappe[0].pos[0] - x.tappe[x.tappe.length - 1].pos[0], x.tappe[0].pos[2] - x.tappe[x.tappe.length - 1].pos[2]));
  check('museo: lo stesso accesso da due fonti non fa una missione da un punto a se stesso',
    doppio.missioni.length > 0 && lunghezze.every((l) => l > 8), doppio.missioni.map((x, i) => x.nome + ' ' + lunghezze[i].toFixed(1) + ' m').join(' | '));
}

console.log('\n' + (ko ? ko + ' PROVE FALLITE' : 'tutte le prove passate'));
process.exit(ko ? 1 : 0);
