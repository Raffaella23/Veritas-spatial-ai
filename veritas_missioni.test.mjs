// =============================================================================
// LE MISSIONI — la prova che non e' piu' una fila indiana.
// =============================================================================
//
// Raffaella, 09/09/2026, guardando la simulazione: «tutte le varie tipologie
// fanno tutti in fila indiana, tutte le tappe. Quelli che lavorano agli aerei
// rimangono sul piazzale, quelli che arrivano arrivano al lato strada.»
//
// Questa prova tiene ferme le tre cose che rendevano vero quel rimprovero, e
// che devono restare risolte:
//   1. le missioni sono piu' d'una, e ognuna ha il SUO percorso di mezzo;
//   2. chi entra da una porta non attraversa gli stessi ambienti di chi entra
//      da un'altra: due accettazioni, due controlli, due sale;
//   3. quello che sta fuori dalla strada — il piazzale — non finisce nel
//      percorso dei passeggeri, ma nel presidio di chi ci lavora.
//
// ⚠️ La prova gira sul FILE. In pagina gira la copia inlinata in index.html:
//    sono lo stesso codice, e vanno tenute allineate a mano (la guardia in
//    veritas_vista.js fa lo stesso lavoro per la vista).

import { test } from "node:test";
import assert from "node:assert/strict";
import { missioni } from "./veritas_flussi.js";

// Geometria presa dal log del 09/09 sul modello vero: terminal lungo l'asse X,
// gli accessi misurati tutti intorno a x=-67, i gate in fondo, il piazzale
// fuori da entrambi i lati.
const n = (label, type, x, z) => ({ label, type, pos: [x, 0, z] });
const AEROPORTO = () => [
  n("Ingresso strada", "origine",     -67,  -2),
  n("Ingresso ovest",  "origine",     -67,  12),
  n("Accettazione",    "accoglienza", -50,  -0.3),
  n("Banchi 2",        "accoglienza", -43,   6.8),
  n("Controllo",       "filtro",      -30,  -1.2),
  n("Controllo 2",     "filtro",      -28,   7.8),
  n("Lounge",          "sosta",       -19,  -2.8),
  n("Sala 2",          "sosta",       -13,   9.6),
  n("Gate A1",         "destinazione",  2,  -3),
  n("Gate B2",         "destinazione",  4,  12),
  n("Piazzale nord",   "servizio",    -40, -30),
  n("Piazzale sud",    "servizio",    -20,  34),
];

const mezzoDi = (m) => m.tappe.slice(1, -1).map((t) => t.label).join("|");

test("le missioni sono piu' d'una e vanno nei due versi", () => {
  const m = missioni(AEROPORTO(), { accessi: [] });
  assert.ok(m.length > 1, "una missione sola e' la fila indiana di prima");
  assert.ok(m.some((x) => x.verso === "andata"),  "manca chi attraversa in avanti");
  assert.ok(m.some((x) => x.verso === "ritorno"), "manca chi torna indietro");
});

test("chi entra da porte diverse non fa lo stesso giro", () => {
  const m = missioni(AEROPORTO(), { accessi: [] });
  const andate = m.filter((x) => x.verso === "andata");
  assert.ok(andate.length >= 2, "servono almeno due andate per poterle confrontare");
  const distinti = new Set(andate.map(mezzoDi));
  assert.equal(distinti.size, andate.length,
    "due andate con lo stesso percorso di mezzo: e' ancora la fila indiana");
});

test("una tappa per categoria: si va a UN banco, non a tutti", () => {
  const m = missioni(AEROPORTO(), { accessi: [] });
  for (const x of m.filter((v) => v.verso !== "presidio")) {
    const conta = new Map();
    for (const t of x.tappe.slice(1, -1))
      conta.set(t.type, (conta.get(t.type) || 0) + 1);
    for (const [tipo, quante] of conta)
      assert.equal(quante, 1,
        x.nome + " passa da " + quante + " ambienti di tipo " + tipo);
  }
});

test("il piazzale non sta sulla strada dei passeggeri", () => {
  const m = missioni(AEROPORTO(), { accessi: [] });
  for (const x of m.filter((v) => v.verso !== "presidio"))
    for (const t of x.tappe)
      assert.ok(!/Piazzale/.test(t.label),
        "«" + t.label + "» e' finito dentro " + x.nome);
});

test("chi non attraversa presidia, e sono le zone lasciate fuori", () => {
  const m = missioni(AEROPORTO(), { accessi: [] });
  const presidio = m.find((x) => x.verso === "presidio");
  assert.ok(presidio, "nessuno resta a lavorare dov'e'");
  assert.ok(presidio.tappe.some((t) => /Piazzale/.test(t.label)),
    "il presidio non ha preso in carico il piazzale");
});

test("ogni missione porta i suoi obiettivi in ordine", () => {
  const m = missioni(AEROPORTO(), { accessi: [] });
  for (const x of m) {
    assert.equal(x.obiettivi.length, x.tappe.length,
      x.nome + ": obiettivi e tappe non combaciano");
    x.obiettivi.forEach((o, k) => {
      assert.equal(o.ordine, k, "gli obiettivi non sono in ordine");
      assert.ok(o.tipo, "un obiettivo senza categoria non e' un obiettivo");
      assert.ok(Array.isArray(o.pos) && o.pos.length === 3, "obiettivo senza posto");
    });
  }
});

test("le quote sommano a uno: nessuno resta senza missione", () => {
  const m = missioni(AEROPORTO(), { accessi: [] });
  const somma = m.reduce((a, x) => a + x.quota, 0);
  assert.ok(Math.abs(somma - 1) < 1e-9, "le quote sommano a " + somma);
});

test("su un modello povero non inventa niente", () => {
  assert.deepEqual(missioni([], { accessi: [] }), []);
  assert.deepEqual(missioni([n("solo", "origine", 0, 0)], { accessi: [] }), []);
});
