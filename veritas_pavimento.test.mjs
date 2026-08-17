// Quale superficie e' il pavimento: prove su scegliPavimento().
//
//     node veritas_pavimento.test.mjs
//
// La funzione NON e' ricopiata qui: viene estratta da index.html cosi' com'e'
// e valutata. Una copia si scollerebbe dall'originale al primo ritocco, e
// queste prove continuerebbero a dichiarare "tutto a posto" su codice non piu'
// in uso. Stesso metodo di veritas_flights.test.mjs.
//
// IL DIFETTO CHE QUESTE PROVE INCHIODANO
// Il raggio parte da 500 m e va verso il basso, e i colpi tornano ordinati per
// distanza: il primo e' la superficie piu' ALTA, cioe' il tetto. Il codice
// aveva il commento "Verifica che sia pavimento (Y normale > 0.5)" ma il
// controllo non c'era, e tornava il primo colpo qualunque fosse. Misurato: gli
// agenti finivano a 11,21 m su un edificio alto 12,7 m, cioe' sul tetto.

import fs from 'node:fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const DA = '    function scegliPavimento(hits, yRif, T) {';
const A = '    window.__veritasScegliPavimento = scegliPavimento;';
const i0 = html.indexOf(DA), i1 = html.indexOf(A);
if (i0 < 0 || i1 < 0 || i1 <= i0) {
  console.error('Ancore non trovate in index.html: scegliPavimento e stata spostata o rinominata.');
  process.exit(2);
}
const scegliPavimento = eval('(' + html.slice(i0, i1).replace(/^\s*function scegliPavimento/, 'function') + ')');

let fatte = 0, rotte = 0;
function ok(cosa, cond) {
  fatte++;
  if (cond) return;
  rotte++;
  console.error('  ROTTA: ' + cosa);
}

// Un colpo del raggio: quota, e normale (verso l'alto = pavimento).
const colpo = (y, ny = 1) => ({ point: { y }, face: { normal: { y: ny } }, object: null });

// --- il caso vero, misurato sul modello di prova -------------------------
{
  // Raggio dall'alto in un punto dove sopra c'e' il tetto: i colpi arrivano
  // ordinati dal piu' alto al piu' basso. Il tetto e' il PRIMO.
  const hits = [
    colpo(11.21),        // tetto
    colpo(8.22),         // pensilina
    colpo(5.10),         // soppalco
    colpo(2.60),         // piano di un bancone
    colpo(0.63),         // pavimento del piano terra
  ];
  ok('senza quota attesa prende il pavimento piu' + "' basso, non il tetto",
     scegliPavimento(hits, null) === 0.63);
  ok('con quota attesa 0,63 sta al piano terra', scegliPavimento(hits, 0.63) === 0.63);
  ok('con quota attesa 5,10 sta sul soppalco', scegliPavimento(hits, 5.1) === 5.10);
  ok('NON torna mai il primo colpo per il solo fatto di essere il primo',
     scegliPavimento(hits, 0.63) !== 11.21 && scegliPavimento(hits, null) !== 11.21);
}

// --- la normale: un muro non e' un pavimento -----------------------------
{
  const hits = [
    colpo(9.0, 0.0),     // parete verticale
    colpo(7.0, -1.0),    // intradosso di una copertura: guarda in giu'
    colpo(3.0, 0.3),     // rampa troppo ripida per essere calpestabile
    colpo(0.5, 1.0),     // pavimento
  ];
  ok('le pareti verticali sono scartate', scegliPavimento(hits, null) === 0.5);
  ok('le superfici rivolte in basso sono scartate', scegliPavimento(hits, 8.5) === 0.5);
  ok('sotto 0,5 di normale non e' + "' calpestabile", scegliPavimento(hits, 3.0) === 0.5);
}
{
  // Nessuna superficie rivolta verso l'alto: non si inventa una quota.
  const hits = [colpo(9.0, 0.0), colpo(7.0, -1.0)];
  ok('senza pavimenti torna null', scegliPavimento(hits, 5) === null);
}

// --- due piani: il pavimento giusto dipende da dove sta l'agente ---------
{
  const hits = [colpo(5.10), colpo(0.63)];
  ok('agente al piano terra resta al piano terra', scegliPavimento(hits, 0.7) === 0.63);
  ok('agente sul soppalco resta sul soppalco', scegliPavimento(hits, 5.0) === 5.10);
  ok('a meta' + " scala vince il piano piu' vicino", scegliPavimento(hits, 4.0) === 5.10);
  ok('appena sopra il piano terra vince il piano terra', scegliPavimento(hits, 2.0) === 0.63);
}

// --- casi limite ---------------------------------------------------------
{
  ok('nessun colpo: null', scegliPavimento([], 1) === null);
  ok('lista assente: null', scegliPavimento(null, 1) === null);
  ok('colpi malformati non fanno cadere nulla',
     scegliPavimento([{}, { point: { y: 2 } }, colpo(1.5)], null) === 1.5);
  ok('quota attesa non finita si comporta come assente',
     scegliPavimento([colpo(4), colpo(1)], NaN) === 1);
  ok('quota attesa infinita si comporta come assente',
     scegliPavimento([colpo(4), colpo(1)], Infinity) === 1);
  ok('un solo pavimento e' + "' quello", scegliPavimento([colpo(2.5)], 99) === 2.5);
  ok('quote negative (interrato) sono ammesse',
     scegliPavimento([colpo(0), colpo(-3.5)], -3) === -3.5);
}

// --- la normale va portata nel mondo ------------------------------------
{
  // Un oggetto ruotato di 180 gradi: la normale locale dice "su", quella nel
  // mondo dice "giu'". Senza la trasformazione, un soffitto passerebbe per
  // pavimento. Si finge il minimo che serve a transformDirection.
  const T = {
    Vector3: class {
      constructor() { this.x = 0; this.y = 0; this.z = 0; }
      copy(v) { this.x = v.x || 0; this.y = v.y || 0; this.z = v.z || 0; return this; }
      transformDirection() { this.y = -this.y; return this; } // finge il capovolgimento
    },
  };
  const soffitto = { point: { y: 6 }, face: { normal: { y: 1 } }, object: { matrixWorld: {} } };
  const pavimento = { point: { y: 1 }, face: { normal: { y: -1 } }, object: { matrixWorld: {} } };
  ok('con la matrice del mondo il soffitto capovolto viene scartato',
     scegliPavimento([soffitto, pavimento], null, T) === 1);
}

console.log(`veritas_pavimento: ${fatte - rotte}/${fatte} prove passate`);
if (rotte) process.exit(1);
