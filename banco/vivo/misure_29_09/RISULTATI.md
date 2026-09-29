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

---

# La sera del 29/09: da dove nascono le inversioni, e lo sguardo nel tempo della simulazione

Un lancio per misura, sola lettura salvo le due correzioni autorizzate da Raffaella.
Per ogni lancio: il resoconto (`sera_N_*.log`) e l'uscita dell'analisi (`sera_N_*.analisi.txt`).

## 1. Il rientro sul calpestabile (`sera_1`, costruzione `-e`; `misura_rientro.mjs`, `analisi_rientro.cjs`)

Si registra ogni punto prima e dopo `veritasRientraSulCammino` (avvolgendo, solo nella
pagina della prova, `window.__veritasNavmesh.sulCamminoCorrente`).

| | prima del rientro | dopo |
|---|---|---|
| punti sulle linee x = −7,78 / z = 11,52 / 9,57 / 13,32 | 10 / 22 / 49 / 7 | 117 / 307 / 155 / 62 |
| inversioni (> 0,3 m avanti e indietro) | 1.074 | 1.052 |

Le linee fisse sono i BORDI della mappa di cammino: il rientro vi appoggia i punti che
ne escono (4.914 punti spostati, mediana 0,43 m). Le inversioni c'erano gia' prima.
Firma nelle 1.001 inversioni misurabili: scarto VIA dal centro del gruppo (cos mediano
0,94, nei passi normali 0,03), quota 0,275 per le famiglie e 0,096 per gli altri = i
coefficienti del richiamo al gruppo (0,24 / 0,08), che il planner saltava a caso 1 volta
su 10 (`Math.random() < 0.9`). 57% delle inversioni con questa firma; 43% non attribuito.

## 2. Correzione `-g`: il richiamo al gruppo sempre (`sera_2`)

| | `-e` | `-g` |
|---|---|---|
| inversioni nel percorso finale | 1.052 | **390** (−63%) |
| scarto laterale tipico / oltre 10 cm | 2,7 cm / 24% | 1,9 cm / 15% |

Rientro, spostamento laterale e separazione NON toccati (decisione di Raffaella).

## 3. La figura segue la traccia? (`sera_3`, `misura_figura.mjs`, `analisi_figura.cjs`)

Si': a traiettoria stabile ogni figura sta sulla retta fra i due fotogrammi giusti
(distanza mediana 0,000 m), tutte allo stesso istante, velocita' media 1,01 (barra ×1).
Ma: (a) dopo «Avvia» la traiettoria viene RIMPIAZZATA 5-6 volte (anche ~30 s dopo) e le
figure saltano fra una versione e l'altra; (b) senza scheda grafica l'orologio avanza a
scatti (0,08-3,3 volte il tempo reale fra un campione e l'altro). La vecchia sonda
(`misura_tracce.mjs`: riferimento = 1 s di tempo REALE, partenza subito dopo «Avvia»)
era quindi falsata. **Superata da `misura_sguardo.mjs`.**

## 4. Lo sguardo di prima, con la sonda corretta (`sera_4`, costruzione `-g`)

`misura_sguardo.mjs`: parte a traiettoria ferma (nessun rimpiazzo da 6 s, contatore di
versione uguale a inizio e fine) e confronta gli occhi con lo spostamento previsto dalla
traccia fra l'istante T della simulazione e T + 1 s. Un sesto rimpiazzo e' arrivato
durante i campioni: validi solo gli ultimi 2 su 10 → **46% entro 20°** (52 in cammino).

## 5. Correzione `-h`: gli occhi nel tempo della simulazione (`sera_5`)

Gli occhi trovano l'istante della simulazione in cui la persona e' sulla sua traccia
(andando avanti dal precedente) e guardano dove sara' 1 s dopo; da ferma guarda dove
guardava. Traiettoria ferma per tutta la misura (versione 5 → 5), velocita' 1,00.

| | `-g` (sera_4, 2 campioni validi) | `-h` (sera_5, 10 campioni) |
|---|---|---|
| occhi entro 20° | 46% | **92%** (236 / 256), mediana 0° |
| corpo giusto | 55 / 56 | 276 / 276 |

⚠️ In parte e' una verifica di COERENZA: occhi e riferimento leggono la stessa traccia.
Misura che gli occhi trovino la persona nel punto e nell'istante giusti. 8% residuo
(20 casi, alcuni a 180°) non analizzato. Aperto e non indagato: i rimpiazzi tardivi
della traiettoria dopo «Avvia».

    DAL_WORKSPACE=1 node banco/vivo/misura_rientro.mjs    → node banco/vivo/analisi_rientro.cjs banco/vivo/misura_rientro/rientro.json
    DAL_WORKSPACE=1 node banco/vivo/misura_figura.mjs     → node banco/vivo/analisi_figura.cjs  banco/vivo/misura_figura/figura.json
    DAL_WORKSPACE=1 node banco/vivo/misura_sguardo.mjs    → node banco/vivo/analisi_sguardo.cjs banco/vivo/misura_sguardo/sguardo.json
