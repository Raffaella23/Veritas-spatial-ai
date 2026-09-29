# Blocco prima del passo 5 — misure del 29/09/2026

Modello `airport_foot_traffic.glb`, pagina servita dal workspace (`DAL_WORKSPACE=1`),
Chrome senza scheda grafica, ~2 minuti a lancio. Criterio deciso PRIMA (Raffaella):
tutte le persone in `TRACCE`; per chi cammina, occhi entro 20° dallo spostamento
vero nel secondo dopo in almeno il 90% dei campioni; corpo coincidente ≥ 90%.

## I lanci

| resoconto | costruzione | cosa | persone in `TRACCE` | occhi entro 20° | corpo giusto |
|---|---|---|---|---|---|
| `prima.log` | `2026-09-29-d` | com'era | 0 / 28 | 0% (tutti [1,0,0], mediana 162°) | 99 / 140 |
| `dopo.log` | `-e` | tracce riparate | 28 / 28 | 48% (mediana 21°) | 140 / 140 |
| `dopo2.log` | `-e` | idem, con i punti di traccia attorno a ogni persona | 28 / 28 | 48% (51% senza le figure che compaiono) | 138 / 140 |
| `dopo3.log` | `-f` | PROVA sguardo 0,5 m davanti (NON salvata nel codice) | 28 / 28 | 70% (mediana 9°) | 138 / 140 |
| `piano.log` | `-f` | piano → corpo, sola lettura | — | — | — |

A tavolino, sui dati del lancio `dopo2`, lo sguardo a 0,5 m dava 82%; dal vivo 70%.
I dati grezzi (JSON) non sono salvati: si rifanno con le sonde qui sotto.
La prova e' FALLITA rispetto al criterio (90%) ed e' stata tolta dal codice.

## I casi a 180°

Quasi tutti dove il percorso va avanti e indietro su linee fisse ricorrenti:
**x = −7,78; z = 11,52 / 9,57 / 13,32** (persona 2: −7,78 → −6,43 → −7,78 in 1 s;
persona 8: z 11,52 ↔ 9,57 ogni 0,5 s). Chi ripassa dallo stesso punto confonde la
ricerca del punto sulla traccia e gli occhi guardano indietro: probabilmente una
conseguenza del percorso, non un errore della prima persona.

## Ondeggiamento (`dopo3.log`, riga ONDE: 16.606 terne di punti in cammino)

Scarto laterale tipico 2,7 cm; 24% dei passi oltre 10 cm, 10% oltre 25 cm.
Non un dondolio continuo: SALTI su quelle linee.

## Piano → corpo (`piano.log`, `analisi_piano_corpo.cjs`)

Nella stessa corsa, copia di cio' che entra in `window.__veritasCorpo.filtraTraiettoria`
(piano) e di cio' che ne esce (cammino del corpo). Corsa sullo schermo:

| | piano | corpo |
|---|---|---|
| punti diversi | — | **0 / 21.978** |
| inversioni (> 0,3 m avanti e indietro) | 1.055 su 17.611 passi | identiche |
| punti su x = −7,78 / z = 11,52 / 9,57 / 13,32 | 121 / 319 / 160 / 67 | identici |
| prima inversione | persona 1, t = 2 s, su x = −7,78 | identica |

**Le inversioni nascono nel percorso pianificato.** Il corpo non le introduce.
Problema separato, da NON indagare ora: il resoconto del corpo (`ultimoEsito`) e'
vuoto e il corpo non ha spostato nessun punto.

Decisione di Raffaella: nessuna correzione; non lisciare la traiettoria per far
passare gli occhi. Prossima misura: perche' il planner produce le inversioni.
Il passo 5 resta bloccato.

## Come si rifa'

    DAL_WORKSPACE=1 node banco/vivo/misura_tracce.mjs                        (tetto 600 s)
    DAL_WORKSPACE=1 node banco/vivo/misura_piano_corpo.mjs                   (tetto 600 s)
    node banco/vivo/analisi_piano_corpo.cjs banco/vivo/misura_piano_corpo/coppie.json

Serve `airport_foot_traffic.glb` nella radice del workspace e `playwright`.
