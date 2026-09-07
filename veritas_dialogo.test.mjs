// Prova del DIALOGO — si parla, non si compila un modulo.
//   node veritas_dialogo.test.mjs
//
// ⚠️ QUESTA PROVA ESISTE PER UN GUASTO PRECISO, del 07/09/2026. Il dialogo si
//    era rotto — non rispondeva ne' parlando ne' scrivendo — e nessuno se n'e'
//    accorto, perche' per provarlo servivano un browser con una finestra vera
//    e un clic. `node --check` era passato: la riga cancellata era un `for`, e
//    usare una variabile che non esiste non e' un errore di sintassi.
//    L'ha trovato Raffaella in un minuto, usandolo.
//
//    Da qui la regola: cio' che si puo' provare senza browser, si prova senza
//    browser. Mezzo secondo a ogni giro invece di una finestra e un clic.
//
// Quello che si prova e' la frase di Raffaella, testuale (07/09):
//   *«questa e' una sala d'attesa, questa potrebbe essere, e il cliente dice
//    si', hai capito bene, questa e' una sala d'attesa. Questo e' il dialogo.»*
import { leggiRisposta } from './veritas_cinema.js';

let ko = 0;
const check = (detto, proposta, atteso) => {
  const r = leggiRisposta(detto, proposta);
  const avuto = r.azione === 'nome' ? r.nome : r.azione;
  const ok = avuto === atteso;
  if (!ok) ko++;
  console.log((ok ? '  ok  ' : '  KO  ') + '«' + detto + '» -> ' + avuto
    + (ok ? '' : '   (atteso ' + atteso + ')'));
};

const PROPOSTA = 'uno spazio dove ci si ferma e si aspetta';

console.log('\n1. la frase di Raffaella, parola per parola');
check('sì, hai capito bene', PROPOSTA, PROPOSTA);
check('sì, hai capito bene, questa è una sala d\'attesa', PROPOSTA, 'sala d\'attesa');
check('questa è una sala d\'attesa', PROPOSTA, 'sala d\'attesa');

console.log('\n2. l\'accordo secco vale la proposta');
for (const d of ['sì', 'si', 'esatto', 'giusto', 'corretto', 'certo', 'va bene', 'hai ragione', 'yes'])
  check(d, PROPOSTA, PROPOSTA);
// ⚠️ e senza una proposta davanti, un «sì» non vuol dire niente: si richiede.
check('sì', null, 'non capito');

console.log('\n3. la correzione');
check('no, è un ufficio', PROPOSTA, 'ufficio');
check('no, si tratta di un deposito', PROPOSTA, 'deposito');
// ⚠️ In una correzione vale l'ULTIMA cosa detta, non la prima: chi corregge
//    nomina prima quello che sta negando. Qui la risposta giusta è «corridoio».
check('non è una sala d\'attesa, è un corridoio', PROPOSTA, 'corridoio');
// ⚠️ un «no» secco non e' una correzione: e' un rifiuto, e non si inventa niente.
check('no', PROPOSTA, 'non capito');

console.log('\n4. il nome detto e basta, come si parla');
check('sala d\'attesa', PROPOSTA, 'sala d\'attesa');
check('Il check-in', PROPOSTA, 'check-in');
check('qui è la biglietteria', PROPOSTA, 'biglietteria');
check('it is a waiting area', PROPOSTA, 'waiting area');

console.log('\n5. e quando non sa, non si inventa');
for (const d of ['non lo so', 'non so', 'boh', 'non saprei', 'no idea'])
  check(d, PROPOSTA, 'non lo so');
check('', PROPOSTA, 'niente');
check('   ', PROPOSTA, 'niente');

console.log(ko ? '\n' + ko + ' PROVE FALLITE' : '\ntutte le prove passano');
process.exit(ko ? 1 : 0);
