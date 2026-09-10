// =============================================================================
// L'INGRESSO DA FUORI — la prova che il viaggio non nasce piu' in mezzo agli
// aerei.
// =============================================================================
//
// Raffaella, 11/09/2026: «dei tre accessi che il programma trova, nessuno e'
// marcato "da fuori". Senza un fuori il viaggio comincia nel pezzo di pavimento
// piu' grosso che si raggiunge a piedi — che su questo modello sta in mezzo ai
// due aerei. E' da li' che nasce la fila unica che vedo partire fra gli aerei.»
//
// MISURATO PRIMA DI TOCCARE NIENTE, sulla pagina viva del 10/09:
//   · l'occhio dice «qui si e' all'aperto» UNA VOLTA SOLA, e da un'AREA
//     (`regione`), non da un punto;
//   · il referto della catena dice «3 accessi · 0 marcati da fuori».
//
// LA CAUSA, in una riga: il «da fuori» aveva una sola strada per arrivare a un
// ingresso — nascere dentro un indizio della voce «gli oggetti in fila», che e'
// l'unica che chiedeva all'occhio. Quell'unica area di cielo non conteneva
// nessuna fila di cose ferme, quindi la testimonianza non toccava niente.
// Nessuno ha MAI chiesto all'occhio «e qui, sull'ingresso, cosa vedi?».
//
// ⚠️ La prova gira sul FILE. In pagina `veritas_flussi.js` gira anche nella
//    copia inlinata in index.html: sono lo stesso codice e vanno tenute
//    allineate a mano. `veritas_accessi.js` vive in una copia sola.

import { test } from "node:test";
import assert from "node:assert/strict";
import { uniscoVoci } from "./veritas_accessi.js";
import { missioni } from "./veritas_flussi.js";

// -----------------------------------------------------------------------------
// Il banco: due posti dove piu' indizi sono d'accordo. Uno sul fronte strada
// (x = -60), uno in mezzo all'edificio (x = 0). Nessuna fila di cose ferme da
// nessuna delle due parti: e' esattamente il caso che non funzionava.
// -----------------------------------------------------------------------------
const VOCI = () => [
  { nome: "il tetto che finisce", punti: [
      { centro: [-60, 0, 0] }, { centro: [0, 0, 0] }] },
  { nome: "la segnaletica", punti: [
      { centro: [-59.4, 0, 0.5] }, { centro: [0.6, 0, 0.5] }] },
];

// Una testimonianza legata a un'AREA: la telecamera non da' un punto (Regola 0),
// ma si sa quale rettangolo di mondo aveva inquadrato. Copre il fronte strada e
// nient'altro.
const CIELO_SUL_FRONTE = [{
  nome: "cielo", termine: "sky", ariaAperta: "sempre", score: 0.82,
  centro: null, regione: { min: [-70, 0, -12], max: [-50, 0, 12] },
}];

const perX = (r, x) => r.accessi.find((a) => Math.abs(a.centro[0] - x) < 3);

test("l'occhio parla da un'AREA e l'ingresso sotto quell'area e' da fuori", () => {
  const r = uniscoVoci(VOCI(), null, { viste: CIELO_SUL_FRONTE });
  const strada = perX(r, -60), dentro = perX(r, 0);
  assert.ok(strada && dentro, "i due ingressi devono esserci tutti e due");
  assert.equal(strada.fuori, true,
    "l'occhio ha visto il cielo proprio qui: questo e' un ingresso da fuori");
  assert.equal(strada.fuoriDa, "occhio/regione",
    "e si deve sapere che lo dice di un'AREA, non di un punto");
  assert.match(strada.percheFuori, /AREA/,
    "il perche' deve dichiarare che la prova e' un'area, non una posizione");
});

test("l'ingresso che l'area NON copre resta un ingresso interno", () => {
  const r = uniscoVoci(VOCI(), null, { viste: CIELO_SUL_FRONTE });
  assert.equal(perX(r, 0).fuori, false,
    "una soglia in mezzo all'edificio non diventa una porta sulla strada");
  assert.equal(perX(r, 0).percheFuori, null);
});

test("se l'occhio non ha guardato non cambia niente", () => {
  const r = uniscoVoci(VOCI(), null, { viste: [] });
  assert.equal(perX(r, -60).fuori, false);
  assert.equal(perX(r, 0).fuori, false);
  // Un difetto di vista non deve diventare un difetto di geometria: gli
  // ingressi restano tutti e due, con gli stessi centri di prima.
  assert.equal(r.accessi.length, 2);
});

test("una parola vista basta a se stessa: vale anche fuori da un aeroporto", () => {
  // Rule 0-bis: la conseguenza viaggia con la parola, non col tipo di edificio.
  // Un cortile di scuola risponde come una pista.
  const cortile = [{
    nome: "cortile", termine: "courtyard", ariaAperta: "sempre", score: 0.7,
    centro: null, regione: { min: [-70, 0, -12], max: [-50, 0, 12] },
  }];
  const r = uniscoVoci(VOCI(), null, { viste: cortile });
  assert.equal(perX(r, -60).fuori, true,
    "nessuna parola di aeroporto in mezzo: la regola e' la stessa");
  assert.match(perX(r, -60).percheFuori, /cortile/);
});

// -----------------------------------------------------------------------------
// E qui si vede se serve a qualcosa: da dove parte la gente.
// -----------------------------------------------------------------------------
const n = (label, type, x, z) => ({ label, type, pos: [x, 0, z] });

// Il modello com'e' fatto davvero: la tappa che il cervello ha chiamato
// «origine» — tutta minuscola, una categoria usata come posto — sta nel pezzo
// di pavimento piu' grosso, che qui e' il piazzale fra i due aerei (x = 30).
// L'edificio si allunga verso ovest, e la strada sta ancora piu' in la'.
const MODELLO = () => [
  n("origine",      "origine",      30,  0),
  n("Accettazione", "accoglienza", -10,  0),
  n("Controllo",    "filtro",      -25,  0),
  n("Sala",         "sosta",       -40,  0),
  n("Uscita",       "destinazione",-70,  0),
];

test("il viaggio comincia dall'ingresso da fuori, non dal pezzo piu' grosso", () => {
  const m = missioni(MODELLO(), { accessi: [
    { nome: "Accesso 2", centro: [45, 0, 25], fuori: false },
    { nome: "Accesso 1 da fuori", centro: [60, 0, 0], fuori: true,
      percheFuori: "l'occhio, proprio qui, ci ha visto cielo" },
  ] });
  assert.ok(m.length, "deve nascere almeno una missione");
  assert.equal(m[0].entrata.label, "Accesso 1 da fuori",
    "la prima missione deve nascere fuori, non nel piazzale fra gli aerei");
  assert.equal(m[0].entrata.fuori, true);
});

test("il «da fuori» non muore quando una tappa sta gia' li'", () => {
  // L'accesso cade sopra la tappa «origine»: non ne nasce un secondo ingresso,
  // ma quella tappa impara da che parte guarda. Prima si perdeva in silenzio.
  const m = missioni(MODELLO(), { accessi: [
    { nome: "Accesso 1 da fuori", centro: [32, 0, 1], fuori: true,
      percheFuori: "l'occhio, proprio qui, ci ha visto cielo" },
  ] });
  assert.ok(m.length);
  assert.equal(m[0].entrata.label, "origine",
    "non si aggiunge un ingresso doppio a due metri dall'altro");
  assert.equal(m[0].entrata.fuori, true,
    "ma il «da fuori» dev'essere passato sulla tappa che stava li'");
});

test("senza nessun ingresso da fuori l'ordine resta quello di ieri", () => {
  const prima = missioni(MODELLO(), { accessi: [] });
  const dopo  = missioni(MODELLO(), { accessi: [
    { nome: "Accesso 2", centro: [45, 0, 25], fuori: false }] });
  assert.ok(prima.length && dopo.length);
  assert.equal(prima[0].entrata.label, "origine",
    "senza testimonianza il comportamento e' identico a prima");
  assert.equal(dopo[0].entrata.label, "origine",
    "un accesso che non e' da fuori non scavalca nessuno");
});
