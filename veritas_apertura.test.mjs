// Le regole dell'apertura, senza scena:   node veritas_apertura.test.mjs
//
// HANDOFF §9, regola 2 (17/09/2026): «finché l'occhio non ha ancora parlato, la
// scena mostra le zone che si accendono progressivamente, con i report che si
// aprono man mano lateralmente». Qui si provano le decisioni che la reggono:
// quali zone si accendono, quando una zona e' «confermata dall'occhio», cosa si
// scrive nella scheda, e soprattutto QUANDO il velo si chiude — la misura del
// 17/09 sera era un velo chiuso a 40 s senza aver acceso niente.
import {
  chiaveNodo, confermataDallOcchio, misureDi, quandoChiudere, confronta,
  DURATA_MINIMA, RESPIRO_DOPO_OCCHIO, TETTO_ATTESA,
} from './veritas_apertura.js';

let ko = 0;
const check = (n, ok, d = '') => { console.log((ok ? '  ok  ' : ' FAIL ') + n + (d ? '   ' + d : '')); if (!ok) ko++; };

// --- nodi come li consegna __veritasGetNodes() -----------------------------
const misurata = { id: 'zona_0', pos: [10.2, 0.5, -4.7], label: 'Zona 1 · 210 m²', type: 'sosta',
  origine: 'misura', areaM2: 210.4, formaLungo: 24.04, formaLargo: 8.96, formaAngolo: 0.3 };
const perNome = { id: 'zona_1', pos: [-30, 0.5, 12], label: 'Lounge', type: 'sosta', origine: 'nome+misura', areaM2: 90 };
const vista = { id: 'zona_2', pos: [3, 0.5, 3], label: 'sedute', type: 'sosta', origine: 'occhi', areaM2: 40 };
const capita = { id: 'zona_3', pos: [5, 0.5, 9], label: 'banco', type: 'filtro', origine: 'comprensione' };

console.log('1. solo l\'occhio conferma');
check('una zona misurata NON e\' confermata', !confermataDallOcchio(misurata));
check('un nome letto sulla mesh NON e\' confermato (correzione del 16/09)', !confermataDallOcchio(perNome));
check('origine «occhi» e\' confermata', confermataDallOcchio(vista));
check('origine «comprensione» e\' confermata', confermataDallOcchio(capita));
check('un nodo nullo non e\' confermato', !confermataDallOcchio(null));

console.log('\n2. la chiave di una zona');
check('stesso nodo, stessa chiave', chiaveNodo(misurata) === chiaveNodo({ ...misurata, label: 'altro' }));
check('stesso id spostato di 5 m: zona diversa', chiaveNodo(misurata) !== chiaveNodo({ ...misurata, pos: [15.2, 0.5, -4.7] }));
check('senza posizione non si accende', chiaveNodo({ id: 'x' }) === null);

console.log('\n3. la scheda dice solo cio\' che e\' misurato');
check('forma e area', misureDi(misurata) === '24,0 × 9,0 m · 210 m²', misureDi(misurata));
check('solo area', misureDi(perNome) === '90 m²', misureDi(perNome));
check('niente misure, niente testo inventato', misureDi(capita) === '', JSON.stringify(misureDi(capita)));

console.log('\n4. quando si chiude il velo');
const t0 = 1_000_000;
const tetto = t0 + TETTO_ATTESA;
check('occhio muto: il velo resta fino al tetto, non si chiude a 30 s',
  quandoChiudere({ nascita: t0, occhioHaParlato: false }) === tetto,
  'tetto ' + TETTO_ATTESA / 60000 + ' min');
check('il tetto esiste ed e\' finito (niente attese indefinite)', Number.isFinite(TETTO_ATTESA) && TETTO_ATTESA <= 15 * 60000);
check('occhio che non parte nemmeno: si chiude alla durata minima',
  quandoChiudere({ nascita: t0, occhioHaParlato: false, occhioAssente: true }) === t0 + DURATA_MINIMA);
check('occhio che parla presto: mai prima della durata minima',
  quandoChiudere({ nascita: t0, occhioHaParlato: true, ultimaNotizia: t0 + 2000 }) === t0 + DURATA_MINIMA);
const tardi = t0 + 5 * 60000;
check('occhio che parla a 5 min: si chiude dopo il respiro',
  quandoChiudere({ nascita: t0, occhioHaParlato: true, ultimaNotizia: tardi }) === tardi + RESPIRO_DOPO_OCCHIO);
check('occhio che parla dopo il tetto: vince il tetto',
  quandoChiudere({ nascita: t0, occhioHaParlato: true, ultimaNotizia: tetto + 60000 }) === tetto);
check('la durata minima si puo\' regolare',
  quandoChiudere({ nascita: t0, occhioHaParlato: true, ultimaNotizia: t0, durataMinima: 45000 }) === t0 + 45000);

console.log('\n5. il confronto fra le zone accese e i nodi di adesso');
const accese = new Map([
  [chiaveNodo(misurata), { label: misurata.label, confermata: false }],
  [chiaveNodo(perNome), { label: perNome.label, confermata: false }],
]);
const dopoOcchio = [
  { ...misurata, origine: 'occhi', label: 'sedute' },   // l'occhio l'ha confermata
  vista,                                                  // nuova
];
const c = confronta(accese, dopoOcchio);
check('la zona confermata dall\'occhio viene promossa', c.promosse.length === 1 && c.promosse[0] === chiaveNodo(misurata));
check('la zona nuova entra in coda', c.nuove.length === 1 && c.nuove[0] === chiaveNodo(vista));
check('la zona che non c\'e\' piu\' si spegne', c.spente.length === 1 && c.spente[0] === chiaveNodo(perNome));
const c2 = confronta(new Map([[chiaveNodo(misurata), { label: 'Zona 1 · 210 m²', confermata: false }]]),
  [{ ...misurata, label: 'Zona 4 · 210 m²' }]);
check('un nome misurato cambiato si riscrive, senza promuovere', c2.rinominate.length === 1 && c2.promosse.length === 0);
const c3 = confronta(new Map(), [misurata, { ...misurata }, perNome]);
check('un nodo ripetuto si accende una volta sola', c3.nuove.length === 2, c3.nuove.join(' | '));
check('nodi assenti: nessun errore, niente da fare', confronta(new Map(), undefined).nuove.length === 0);

console.log(ko ? '\n' + ko + ' PROVE FALLITE' : '\ntutte le prove passate');
process.exit(ko ? 1 : 0);
