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
  zoneMisurate, conLOcchio,
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

// ---------------------------------------------------------------------------
// 6. LE ZONE VENGONO SOLO DAL MOTORE CHE LE MISURA — 17/09 sera, pagina
//    pubblicata -b: l'apertura accendeva «Ingresso / Parcheggio»,
//    «Accettazione», «Gate A1»: tappe cablate nel bundle, origine «cose» e
//    «cammino», mostrate come «misurate». Regola 0-bis violata a schermo.
// ---------------------------------------------------------------------------
console.log('\n6. le zone vengono solo dal motore che le misura');
const percezione = { zones: [
  { centroidX: -14, centroidZ: -8, y: 0.5, areaM2: 420.4, kind: 'ambiente', formaLungo: 28, formaLargo: 15, formaAngolo: 0 },
  { centroidX: 16, centroidZ: -8, y: 0.5, areaM2: 300, kind: 'ambiente', formaLungo: 24, formaLargo: 12.5, formaAngolo: Math.PI / 2 },
  { centroidX: 15, centroidZ: 11, y: 0.5, areaM2: 90, kind: 'corridoio' },
  { areaM2: 50, kind: 'ambiente' },                                     // senza baricentro: non si accende
] };
const zm = zoneMisurate(percezione);
check('tre zone con baricentro, la quarta scartata', zm.length === 3, zm.map((z) => z.label).join(' | '));
check('nomi neutri dalla misura: Ambiente / Passaggio con i m²',
  zm[0].label === 'Ambiente 1 · 420 m²' && zm[2].label === 'Passaggio 1 · 90 m²');
check('tutte con origine «misura», nessuna confermata', zm.every((z) => z.origine === 'misura' && !confermataDallOcchio(z)));
check('senza percezione, nessuna zona e nessun errore', zoneMisurate(undefined).length === 0 && zoneMisurate({}).length === 0);

const tappeDelBundle = [
  { id: 'ingresso', pos: [-67, 0, -2], type: 'spawn', label: 'Ingresso / Parcheggio', origine: 'cose' },
  { id: 'accettazione', pos: [-14, 0, -8], type: 'checkin', label: 'Accettazione', origine: 'cammino' },
  { id: 'gate_A1', pos: [16, 0, -8], type: 'gate', label: 'Gate A1', origine: 'nome+cose' },
];
const conTappe = conLOcchio(zm, tappeDelBundle, new Map());
check('le tappe cablate del bundle non entrano mai, nemmeno sopra una zona',
  conTappe.length === 3 && conTappe.every((z) => /^(Ambiente|Passaggio) /.test(z.label)),
  conTappe.map((z) => z.label).join(' | '));

// L'occhio parla: un nodo dentro la seconda zona, che e' ruotata di 90 gradi
// (lunga 24 m lungo z, larga 12,5 m lungo x). Il punto (18, 0, 0) sta 2 m a
// est e 8 m a nord del centro: dentro solo se la rotazione e' letta giusta.
const tipi = new Map();
const nodoOcchio = { id: 'zona_7', pos: [18, 0.5, 0], label: 'Sedute', origine: 'occhi' };
tipi.set(chiaveNodo(nodoOcchio), 'ci si siede');
const vista2 = conLOcchio(zm, [...tappeDelBundle, nodoOcchio], tipi);
check('il nodo dell\'occhio si posa sulla zona ruotata che lo contiene',
  vista2[1].label === 'Sedute' && confermataDallOcchio(vista2[1]) && vista2[1].tipo === 'ci si siede',
  vista2.map((z) => z.label).join(' | '));
check('le altre zone restano misurate', !confermataDallOcchio(vista2[0]) && !confermataDallOcchio(vista2[2]));
check('la chiave della zona non cambia quando l\'occhio la conferma (si promuove, non si riaccende)',
  chiaveNodo(vista2[1]) === chiaveNodo(zm[1]));
const lontano = { id: 'zona_9', pos: [200, 0, 200], label: 'Banchi', origine: 'comprensione' };
const vista3 = conLOcchio(zm, [lontano], new Map());
check('un nodo dell\'occhio fuori da ogni zona si mostra da solo, confermato',
  vista3.length === 4 && vista3[3].label === 'Banchi' && confermataDallOcchio(vista3[3]));
const promo = confronta(new Map(zm.map((z) => [chiaveNodo(z), { label: z.label, confermata: false }])), vista2);
check('il confronto vede la promozione, non una zona nuova', promo.promosse.length === 1 && promo.nuove.length === 0);

console.log(ko ? '\n' + ko + ' PROVE FALLITE' : '\ntutte le prove passate');
process.exit(ko ? 1 : 0);
