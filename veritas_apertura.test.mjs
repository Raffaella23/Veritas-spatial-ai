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
  prossimoStato, reportDi, verificheDiConformita, segniDaVerificare, segniDellOcchio, formatta, nomeZona, titoloDi,
  STATI, DURATA_STATO, DURATA_ATTESA,
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

// 7. LA SUCCESSIONE DEGLI STATI — Raffaella, 18/09/2026: «vorrei che la
// pagina di attesa avesse questo stile con una successione di stati». Uno
// stato senza dati veri si salta, non si riempie.
console.log('\n7. la successione degli stati');
const tutti = { zone: true, conformita: true, orientamento: true };
check('cinque stati (25/09: un unico film, zone → oggetti → analisi)', STATI.join(',') === 'attesa,zone,oggetti,conformita,orientamento');
check('dopo le zone vengono gli oggetti, se ci sono', prossimoStato({ stato: 'zone', eta: DURATA_STATO, pronti: { ...tutti, oggetti: true } }) === 'oggetti'
  && prossimoStato({ stato: 'oggetti', eta: DURATA_STATO, pronti: { ...tutti, oggetti: true } }) === 'conformita');
check('in attesa finche\' non ci sono zone misurate', prossimoStato({ stato: 'attesa', eta: 60000, pronti: { zone: false } }) === 'attesa');
check('l\'attesa si vede: non si lascia prima di DURATA_ATTESA', prossimoStato({ stato: 'attesa', eta: DURATA_ATTESA - 1, pronti: tutti }) === 'attesa');
check('poi si passa alle zone', prossimoStato({ stato: 'attesa', eta: DURATA_ATTESA, pronti: tutti }) === 'zone');
check('uno stato resta almeno DURATA_STATO', prossimoStato({ stato: 'zone', eta: DURATA_STATO - 1, pronti: tutti }) === 'zone');
check('le zone restano finche\' ce n\'e\' in coda', prossimoStato({ stato: 'zone', eta: DURATA_STATO * 3, pronti: tutti, zoneInCoda: true }) === 'zone');
check('zone → conformita\' → orientamento → zone', prossimoStato({ stato: 'zone', eta: DURATA_STATO, pronti: tutti }) === 'conformita'
  && prossimoStato({ stato: 'conformita', eta: DURATA_STATO, pronti: tutti }) === 'orientamento'
  && prossimoStato({ stato: 'orientamento', eta: DURATA_STATO, pronti: tutti }) === 'zone');
check('uno stato senza dati si salta', prossimoStato({ stato: 'zone', eta: DURATA_STATO, pronti: { zone: true, conformita: false, orientamento: true } }) === 'orientamento');
check('se nessun altro ha dati si resta', prossimoStato({ stato: 'zone', eta: DURATA_STATO, pronti: { zone: true } }) === 'zone');
check('un clic ferma lo stato', prossimoStato({ stato: 'conformita', eta: DURATA_STATO * 5, pronti: tutti, manuale: true }) === 'conformita');

// 8. IL REPORT DICE SOLO CIO' CHE E' MISURATO. Le immagini di riferimento
// hanno numeri d'esempio («94.2%», «Sector B-3»): qui, senza dati, nessun
// numero deve comparire — in nessuno stato, in nessuna lingua.
console.log('\n8. il report dice solo cio\' che e\' misurato');
for (const L of ['it', 'en']) {
  for (const st of STATI) {
    const r = reportDi(st, {}, L);
    const testo = r.righe.map((x) => x.v).join(' ') + ' ' + r.note.map((n) => n.t).join(' ');
    check('senza dati, nessun numero — ' + st + ' (' + L + ')', !/\d/.test(testo), testo.slice(0, 90));
  }
}
const dati = {
  zone: { tot: 9, accese: 9, confermate: 2, ambienti: 7, passaggi: 2, max: { label: 'Ambiente 1 · 2759 m²', area: 2759 } },
  area: 3363.57, livelli: 2, verdetto: { tipo: 'ambiente articolato', zone: 9, varchi: 6, livelli: 2 },
  occhio: { viste: 5, giro: true },
};
const rz = reportDi('zone', dati, 'it');
check('zone: «COMPLETO [9/9]» quando sono tutte accese', rz.righe[0].v === 'COMPLETO [9/9]' && rz.righe[0].tono === 'ok');
check('zone: la superficie e\' quella misurata, arrotondata', rz.righe.some((x) => x.v === '3364 m²'));
check('zone: la barra e\' piena solo a zone tutte accese', rz.barra === 1 && reportDi('zone', { ...dati, zone: { ...dati.zone, accese: 3 } }, 'it').barra === 3 / 9);
check('zone: il verdetto si scrive dai numeri del motore', rz.note[0].t.includes('9 ambienti separati da 6 varchi reali, su 2 livelli'));
check('in inglese le migliaia hanno la virgola', reportDi('zone', dati, 'en').righe.some((x) => x.v === '3,364 m²'));
check('formatta: virgola in italiano, punto in inglese, «--» se non e\' un numero',
  formatta(0.8, 2, 'it') === '0,80' && formatta(0.8, 2, 'en') === '0.80' && formatta(null, 2, 'it') === '--' && formatta(NaN, 1, 'en') === '--');

// 9. LA CONFORMITA' VIENE DA veritas_normative.js, con fonte e «da validare».
console.log('\n9. la conformita\' e\' quella del motore delle norme');
const regola = (id, g, grandezza, valore, rif, titolo) => ({ id, ambito: 'accessibilita', giurisdizione: g, fonte: g === 'IT' ? 'DM 236/1989' : 'ADA 2010', riferimento: rif, titolo, grandezza, operatore: '>=', valore, unita: 'm', validato: false });
const esiti = [
  { regola: regola('it_porta', 'IT', 'larghezza_varco_m', 0.8, 'art. 8.1.1', 'Luce netta delle porte'), stato: 'conforme', conformi: 6, difformi: 0, peggiore: null, soglia: 0.8 },
  { regola: regola('it_corr', 'IT', 'larghezza_strettoia_m', 1.0, 'art. 8.1.9', 'Larghezza dei corridoi'), stato: 'difforme', conformi: 9, difformi: 29, peggiore: 0.5, soglia: 1.0 },
  { regola: regola('us_porta', 'US', 'larghezza_varco_m', 0.815, '404.2.3', 'Door clear width'), stato: 'conforme', conformi: 6, difformi: 0, peggiore: null, soglia: 0.815 },
  { regola: regola('it_rampa', 'IT', 'pendenza_pct', 8, 'art. 8.1.11', 'Rampe'), stato: 'non_misurabile', conformi: 0, difformi: 0, peggiore: null, soglia: 8 },
];
const ver = verificheDiConformita(esiti, 'IT');
check('si scelgono le regole di accessibilita\' italiane con dati', ver.principali.map((v) => v.id).join(',') === 'it_porta,it_corr');
check('le non misurabili si contano, non si mostrano come verdetto', ver.nonMisurabili === 1 && ver.tutte.length === 3);
check('senza regole italiane con dati si prendono le altre', verificheDiConformita(esiti.slice(2), 'IT').principali[0].id === 'us_porta');
const rc = reportDi('conformita', { verifiche: ver, dovePeggiore: 'Ambiente 1 · 2759 m²', incertezzaPeggiore: 0.25 }, 'it');
const rigaDi = (k) => (rc.righe.find((x) => x.k.startsWith(k)) || {}).v;
check('la fonte e\' scritta', rigaDi('Norma') === 'DM 236/1989');
check('porte: superata; corridoi: non superata', rc.righe.filter((x) => x.k === 'Verifica').map((x) => x.v).join(' | ') === 'SUPERATA ✓ | NON SUPERATA ⚠');
check('il caso peggiore e\' quello del motore, con la soglia della regola', rigaDi('Caso peggiore') === '0,50 m < 1,00 m');
check('si dichiara che le soglie sono da validare', rc.note.some((n) => /da validare/.test(n.t)));
check('senza misure la verifica non si fa, e lo dice', reportDi('conformita', { verifiche: { principali: [], tutte: [] } }, 'it').righe.some((x) => x.v === 'non eseguibile'));
const perc = {
  gateways: [{ widthM: 0.78, worldX: 1, worldZ: 2, y: 0 }, { widthM: 1.1, worldX: 5, worldZ: 5, y: 0 }],
  bottlenecks: [0.5, 0.9, 1.4, 0.6, 0.7, 0.75, 0.8, 0.85].map((w, i) => ({ widthM: w, worldX: i, worldZ: -i, y: 0 })),
};
const sv = segniDaVerificare(perc, ver);
check('i varchi ci sono tutti, col loro esito rispetto alla soglia della regola', sv.filter((x) => x.tipo === 'varco').map((x) => x.ok).join(',') === 'false,true');
check('delle strettoie solo quelle fuori soglia, le peggiori prime, al massimo sei',
  sv.filter((x) => x.tipo === 'strettoia').map((x) => x.larghezza).join(',') === '0.5,0.6,0.7,0.75,0.8,0.85');
check('senza regola nessun giudizio (ok = null)', segniDaVerificare(perc, { principali: [] }).every((x) => x.tipo !== 'varco' || x.ok === null));

// 10. I SEGNI DELL'OCCHIO: muri («ferma»), porte («varco»), cose.
console.log('\n10. i segni dell\'occhio');
const so = segniDellOcchio([
  { termine: 'wall', passo: 'ferma', segmento: [[0, 0, 0], [4, 0, 0]] },
  { termine: 'door', passo: 'varco', segmento: [[1, 0, 2], [1.9, 0, 2]], centro: [1.45, 1, 2] },
  { termine: 'airplane', passo: null, mondo: { min: [0, 0, 0], max: [30, 8, 30] } },
  { termine: 'wall', passo: 'ferma', segmento: null },
]);
check('un muro, una porta, una cosa; un muro senza segmento non si disegna', so.muri.length === 1 && so.porte.length === 1 && so.cose.length === 1);
check('la larghezza della porta viene dal suo segmento', Math.abs(so.porte[0].larghezza - 0.9) < 1e-9);
check('i nomi neutri delle zone si traducono, quelli dell\'occhio no',
  nomeZona('Ambiente 3 · 23 m²', 'en') === 'Room 3 · 23 m²' && nomeZona('Passaggio 1 · 14 m²', 'en') === 'Passage 1 · 14 m²'
  && nomeZona('Ambiente 3 · 23 m²', 'it') === 'Ambiente 3 · 23 m²' && nomeZona('Accesso 2', 'en') === 'Entrance 2' && nomeZona('pontile d\'imbarco', 'en') === 'pontile d\'imbarco');

check('i titoli delle norme in inglese, per id; senza voce resta l\'italiano',
  titoloDi({ id: 'it_dm236_porta', titolo: 'Luce netta delle porte' }, 'en') === 'Door clear width'
  && titoloDi({ id: 'it_dm236_porta', titolo: 'Luce netta delle porte' }, 'it') === 'Luce netta delle porte'
  && titoloDi({ id: 'sconosciuta', titolo: 'Titolo' }, 'en') === 'Titolo');

console.log(ko ? '\n' + ko + ' PROVE FALLITE' : '\ntutte le prove passate');
process.exit(ko ? 1 : 0);
