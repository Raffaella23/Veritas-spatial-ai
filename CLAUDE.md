# CLAUDE.md — VERITAS Spatial AI

> Istruzioni operative per Claude Code su questo repository.
> **Leggi tutto questo file prima di scrivere una sola riga di codice.**
>
> Le sezioni 0-10 sono lo storico del progetto. **La sezione 11 in fondo
> descrive lo stato REALE al termine della sessione dell'11 agosto 2026** e
> corregge diversi punti precedenti ormai superati: dove divergono, vale
> la sezione 11.

---

## 0. Prima cosa da fare (obbligatoria)

Prima di qualsiasi modifica, **studia la documentazione nell'ordine seguente**. Non è opzionale: questo progetto ha una storia lunga e decisioni architetturali già prese, e ignorarle ha già causato regressioni.

| # | File | Dimensione | Cosa contiene |
|---|------|-----------|---------------|
| 1 | `PROJECT_INFO.md` | ~45 KB | **La fonte principale.** Storia completa del progetto in ~20 sezioni: auth multi-utente Supabase, storico delle modifiche al bundle minificato, fix rilevamento piani, camera auto-follow, attivazione backend, motore raccomandazioni, integrazione OpenSky. Leggilo per intero. |
| 2 | `CONTEXT.md` | ~5 KB | Snapshot architetturale (V13). Principi non negoziabili: Core-First, Dumb Viewer, Single Source of Truth, Behaviour Driven, Rule of Three. Contiene anche il Decision Log. |
| 3 | `design_brief.md` | ~6,5 KB | Brief di design del prodotto. |
| 4 | `handoff.md` | ~1 KB | Nota di passaggio di consegne, sintetica. |

Dopo averli letti, **verifica lo stato reale del codice** (vedi §3): la documentazione descrive in parte un'architettura *target* che non è ancora stata realizzata.

---

## 1. Cos'è VERITAS

Piattaforma **agentic di simulazione spaziale**, prodotto semi-commerciale. L'utente carica un modello 3D di uno spazio complesso (aeroporto, museo, ambiente di gioco), un'AI analizza lo spazio, identifica le zone, configura e simula il comportamento di agenti-folla, e produce un report analitico vendibile.

Flusso prodotto:

```
Upload → Spatial AI legge lo spazio → identifica zone → l'utente parla con l'AI
→ configura gli agenti → avvia simulazione → osserva → analizza → report
```

Architettura concettuale: **Environment → Spatial AI → Agent Core → Agent Skin → Simulation → Analysis → Report**.
La distinzione **Agent Core** (l'intelligenza, il comportamento) vs **Agent Skin** (l'archetipo visibile: business / famiglia / anziano / sedia a rotelle / turista / studente / staff / VIP) è architetturalmente importante — non collassarla.

Proprietaria: Raffaella Ciani (architetto + sviluppatrice XR, "RC XRArch", Meta Horizon Partner).

---

## 2. Repository

**https://github.com/Raffaella23/Veritas-spatial-ai**

### Branch

- **`main`** — produzione **e sorgente del deploy Render**. `index.html` (217 byte) è ancora
  un meta-refresh verso `Veritas-V17-FIX-SOLO-BUG.html`, cioè la build VECCHIA: il frontend
  nuovo non è ancora stato promosso qui. I file Python del Core invece sì, perché Render
  ridistribuisce automaticamente a ogni push su questa branch.
- **`veritas-ai-os-preview`** — anteprima pubblicata via GitHub Pages su
  **https://raffaella23.github.io/Veritas-spatial-ai/** — qui `index.html` è la build nuova
  completa (~1,13 MB), con shell AI-OS, layer percettivo e tutte le correzioni della
  sessione 11/08/2026.
- **`claude/...`** — branch di lavoro temporanee delle sessioni AI. Non sono deliverable:
  possono essere cancellate quando il loro contenuto è confluito altrove.

### File rilevanti (radice)

```
PROJECT_INFO.md               45 KB   documentazione principale
CONTEXT.md                     5 KB   snapshot architetturale
design_brief.md              6,5 KB   brief di design
handoff.md                     1 KB   handoff
Veritas-V17-FIX-SOLO-BUG.html 1,07 MB IL FILE LIVE (monolite autocontenuto)
veritas_spatial.html          9,4 KB  prototipo "dumb viewer"
index.html                    217 B   redirect (su main)
main.py                       8,8 KB  motore Python
api_server.py                 6,6 KB  API FastAPI (uvicorn, deploy su Render)
render.yaml                    776 B  blueprint Render (piano free → cold start 30-60s)
requirements.txt / config.json / benchmarks.json / simulation_config.json
Assets/ Packages/ ProjectSettings/    progetto Unity XR — quasi tutto sample XR Toolkit, RUMORE
```

⚠️ `Assets/`, `Packages/`, `ProjectSettings/` contengono ~1240 file, in stragrande maggioranza sample ufficiali Unity (XR Hands, XR Interaction Toolkit, VRTemplateAssets). **Non indicizzarli né analizzarli** se non esplicitamente richiesto: bruciano contesto senza dare informazione.

### ⚠️ Discrepanza documentazione ↔ realtà

`CONTEXT.md` descrive `/core/engine.py`, `/core/behaviour.py` e `/data/simulation_config.json` come architettura di riferimento. **Verificato: le directory `core/` e `data/` NON esistono nel repo.** La logica Python vive in `main.py` e `api_server.py` in radice. Tienine conto: quella parte di CONTEXT.md è un obiettivo, non lo stato attuale.

---

## 3. Anatomia di `Veritas-V17-FIX-SOLO-BUG.html`

File singolo autocontenuto da 1.076.223 byte. Contiene **8 blocchi `<script>`**. Struttura verificata con `html.parser` di Python (vedi §5).

| # | Tipo | Byte | Ruolo |
|---|------|------|-------|
| 0 | `importmap` | 282 | three@0.171.0, three/addons/, three-mesh-bvh@0.7.8 |
| 1 | `src=` | 0 | supabase-js da CDN |
| 2 | classico "boot" | 152.650 | Auth, progetti, editor zone CAD, analisi mesh, pathfinding, sync camera. ~70 funzioni in una closure IIFE. |
| 3 | `type="module"` | **872.507** | **IL MOTORE.** Bundle React + Three.js minificato. |
| 4 | classico | 529 | Handler di sicurezza sui link |
| 5 | `type="module"` | 896 | Patch three-mesh-bvh, espone `window.THREE` |
| 6 | `type="module"` | 12.096 | Modulo gaming/CANNON — costruisce una propria chat UI |
| 7 | classico | 9.321 | Chat "V17" — costruisce **un'altra** chat UI |

⚠️ **Questa tabella descrive `Veritas-V17-FIX-SOLO-BUG.html`, non la build AI-OS.**
Nella build su `veritas-ai-os-preview` i blocchi sono 9: le due vecchie chat sono state
rimosse, e si sono aggiunti shell AI-OS, modulo Gaussian Splat e layer percettivo.
Lo schema aggiornato è al §11.1.

### 🔴 Regola assoluta

**Il blocco 3 non si tocca. Mai.** È il motore React/Three minificato: nessuna modifica, nessuna riformattazione, nessuna reindentazione. Dopo ogni operazione sul file va verificato che sia **byte-per-byte identico** all'originale.

I blocchi 6 e 7 costruiscono **entrambi** una chat UI. Sono la causa dei doppioni visti in passato: se ne rimuovi solo uno, il duplicato resta. Nella build AI-OS sono stati **rimossi entrambi**.

---

## 4. Il bridge `window.__veritas*`

Il codebase espone lo stato interno della closure tramite globali `window.__veritas*`. **È il pattern stabilito e l'unico modo sicuro per integrarsi da moduli esterni.** Non inventare funzioni: se non è in questa lista, verifica con `grep` prima di usarla.

**Verificate esistenti:**

```js
__veritasGetNodes()            // legge le zone correnti
__veritasAddNode(node)         // aggiunge una zona
__veritasRemoveNode(query)     // rimuove per query
__veritasModelRoot             // THREE.Object3D del modello caricato
__veritasScene                 // THREE.Scene
__veritasCamera
__veritasControls
__veritasRenderer              // THREE.WebGLRenderer (esposto dal bundle)
__veritasHotspotGroup          // THREE.Group dei marker zona
__veritasPassengerGroups       // Map agentId → { group: THREE.Group }
__veritasApiBase               // URL backend Render
__veritasSpeedMultiplier
__veritasAgentCount
__veritasOnModelLoaded(root)   // callback dopo il caricamento modello
__veritasSimStarted
__veritasProjectType
__veritasSaveProject
__veritasAnalyzePointCloud(points, airsideAnchor)   // ← aggiunto (vedi §6)
window.THREE                   // esposto dal blocco 5
```

**ID DOM stabili** (trovati con grep, non inventati) — usali per pilotare azioni native:

```
#vp-regen              rigenera simulazione
#vp-report             report struttura
#vp-reanalyze          ri-analizza mesh
#vp-save
#veritas-picker-panel  contenitore editor zone CAD
#vs-start-btn          "▶ Avvia simulazione"
#veritas-report-btn    modale report KPI + raccomandazioni (vendibile)
#veritas-play-ready-btn
```

---

## 5. Pipeline di analisi spaziale (nel blocco 2)

Il cuore intelligente. **Solo `extractNavigablePoints` dipende dalla mesh**; tutto il resto opera su array di punti puri ed è quindi riutilizzabile per qualsiasi sorgente di nuvola di punti.

```
extractNavigablePoints(root, maxSamples)   ← UNICA funzione mesh-dipendente
  ↓ { points, airsideAnchor }
structuralAnalysisFromPoints(points, airsideAnchor)
  ├── detectFloorLevels(points)            rilevamento piani
  ├── kmeansCluster(points, k, iterations) clustering zone
  ├── clusterWidths(points, assign, i)     larghezza corridoi via PCA
  ├── nearestNeighborOrder(items)          ordine di flusso
  └── auto-assegnazione nodi → applyNodesToScene() / renderListRef()
  ↓ { zones, ordered, flowOrder, hasAirsideReference, pointsAnalyzed, score, critici, floorLevels }
```

Altre funzioni disponibili: `buildZoneGraph(zones, points)`, `dijkstra(adj, start, end)`, `findRoute(fromPos, toPos)`, `lineHasSupport(a, b, points, sampleN, radius)`, `analyzeMesh(root)`.

`airsideAnchor` è il centroide delle superfici scartate perché fuori scala (piste, piazzali): serve come riferimento direzionale "lato volo" per ordinare le zone da lato terra a lato volo, come farebbe un progettista aeroportuale.

---

## 6. Lavoro fatto nella sessione più recente (build AI-OS)

Pubblicato solo sul branch `veritas-ai-os-preview`. **`main` è intatto.**

1. **Refactor extract-method nel blocco 2.** `runStructuralAnalysis(root)` è stato spezzato in:
   - `structuralAnalysisFromPoints(points, airsideAnchor)` — tutta la logica di clustering/scoring (corpo invariato)
   - `runStructuralAnalysis(root)` — wrapper sottile: `extractNavigablePoints` → chiama la precedente
   - `window.__veritasAnalyzePointCloud` — entry point pubblico

   Comportamento del percorso mesh **preservato identico**. Single Source of Truth rispettata: nessuna duplicazione di logica.

2. **Shell UI minimale** (~29 KB, il blocco 6 — ⚠️ *non* esiste come file `vaio_module_v2.js`,
   è inlinata): topbar (brand + status + menu Spatial Layers / Analysis-Report / Editor zone), console AI unica in basso con parser di comandi in linguaggio naturale (regole, nessun costo LLM), widget upload GLB/GLTF/FBX (max 150 MB), occultamento dei pannelli nativi.

   ⚠️ **Bug già corretto, non reintrodurlo:** i pannelli nativi CAMERE e KPI sono `<aside>` con `position: static` dentro un layout flex. La prima euristica cercava solo ancestor `position: fixed|absolute` e quindi non li trovava mai. La versione corretta riconosce la landmark semantica (`<aside>` / `<nav>`) e ha come fallback solo un criterio dimensionale.

3. **Modulo Gaussian Splat** (~9 KB, il blocco 7 — ⚠️ *non* esiste come file
   `vaio_splat_module.js`, è inlinato). ⚠️ **Oggi NON funziona**: Spark richiede three r179+
   mentre l'importmap fissa 0.171 — vedi §11.4a. Supporto **Gaussian Splatting**. Upload `.ply .splat .ksplat .spz .sog` via libreria **Spark** (`@sparkjsdev/spark` 2.1.0, aggiunta all'importmap). Estrae i centri delle gaussiane come nuvola di punti e li passa a `window.__veritasAnalyzePointCloud`: **stessa pipeline provata delle mesh, nessuna reinvenzione.** Non è visualizzazione soltanto — produce zone reali, punteggio e criticità.

4. Blocchi 6 e 7 (le due vecchie chat) **rimossi**. Titolo cambiato in `VERITAS AI-OS`.

---

## 7. Bug noto, non ancora corretto

✅ **RISOLTO** nella sessione 11/08/2026: i `project_type` salvati sono in italiano
(`"aeroporto"`, `"museo"`) mentre benchmark e raccomandazioni sono indicizzati in inglese,
quindi ogni report ricadeva sul dominio "generic". Ora c'è una normalizzazione esplicita.

---

## 8. Regole di lavoro

1. **Mai fare push su `main` senza approvazione esplicita di Raffaella.** Costruisci, mostra il risultato, aspetta il via libera. È una regola permanente, non legata a un singolo task.
2. **Mai toccare il blocco 3.** Verificalo byte-per-byte dopo ogni modifica.
3. **Per analizzare o modificare i blocchi `<script>` usa `html.parser` di Python**, mai regex. Il bundle minificato contiene stringhe che *sembrano* tag script e mandano in tilt le regex; `html.parser` implementa correttamente le regole raw-text del browser, incluso il caso `</script`.
4. **Valida sempre con `node --check`** prima di riassemblare (i moduli ES vanno copiati in `.mjs` per il check).
5. **Verifica sempre prima di assumere.** Se pensi che esista una funzione o un ID DOM, cercalo con grep. Il codice è cresciuto per stratificazioni e le assunzioni non reggono.
6. **Nessun costo LLM a runtime** per ora: il parser di comandi della console è a regole. Se proponi un LLM, dichiara esplicitamente il costo.
7. **Rule of Three:** ogni feature deve reggere i tre domini di riferimento — gaming, museo, aeroporto. Se non ci riesce, ripensa il design.
8. Il file HTML deve restare **snello e scattante**: singolo file, niente framework aggiuntivi, niente dipendenze superflue.

---

## 9. Servizi collegati

- **Supabase** — auth multi-utente + persistenza progetti. URL e chiave *publishable* sono nel blocco 2 (già pubblici nel file). Non introdurre mai una service-role key nel client.
- **Render** — API Python (`api_server.py` via uvicorn). **Piano free: si addormenta dopo ~15 min, cold start di 30-60s.** La UI mostra "Motore in risveglio" — è comportamento atteso, non un bug.
- **Vercel** — hosting frontend.
- **GitHub Pages** — usato per le anteprime dal branch `veritas-ai-os-preview`.

---

## 10. Prossimi passi aperti

> ⚠️ Questa lista è quella di *prima* della sessione 11/08/2026. Per lo stato
> aggiornato, con le priorità in ordine di valore, vedi §11.4.

- Verifica visiva dell'anteprima AI-OS da parte di Raffaella → poi merge su `main` (con aggiornamento del redirect in `index.html`).
- Correzione del bug `project_type` italiano/inglese (§7).
- Aggiornare `PROJECT_INFO.md` con il lavoro AI-OS + Gaussian Splat.
- Gaussian Splat Fase B: valutare occlusione/navigabilità reale sulle gaussiane (ellissoidi come ostacoli, approccio tipo Splat-Nav) oltre ai soli centri.
- Agente intelligente collegato a normative e skill di dominio reali — è la priorità dichiarata da Raffaella, ancora da costruire.

---

## 11. Stato reale — sessione 11 agosto 2026

> Scritto dopo una sessione lunga di debug guidata dalle prove sul campo di
> Raffaella. **Dove questa sezione contraddice le precedenti, vale questa.**


### 11.0 Le tre regole che non si violano

1. **Il blocco 3 di `index.html` non si tocca mai.** È il bundle React/Three
   minificato (872.507 byte, sha 8-byte `eedd9935ea908fd3`). Dopo *ogni*
   modifica al file, verifica che sia byte-per-byte identico — c'è lo script
   pronto al §6.
2. **Mai push su `main` senza approvazione esplicita di Raffaella.**
   L'eccezione già concessa: i file Python per il deploy Render.
3. **Per analizzare i blocchi `<script>` usa `html.parser` di Python, mai
   regex.** Il bundle minificato contiene stringhe che sembrano tag e mandano
   in tilt le regex.

---

### 11.1 Dove sta il codice

| Branch | Cosa contiene | A cosa serve |
|---|---|---|
| `main` | `Veritas-V17-FIX-SOLO-BUG.html`, `index.html` (redirect), **Python del Core** | Produzione + sorgente del deploy Render |
| `veritas-ai-os-preview` | `index.html` completo (~1,13 MB) | Anteprima su GitHub Pages |
| `claude/veritas-perception-ai-os-876pru` | Branch di lavoro, allineata alla preview | Sviluppo |

Anteprima live: **https://raffaella23.github.io/Veritas-spatial-ai/**

⚠️ **`main` ha ancora il frontend vecchio.** Su `main` sono stati portati solo
i file Python (per Render). Il frontend nuovo vive sulla preview e va promosso
a `main` **solo dopo approvazione esplicita di Raffaella**.

### Struttura di `index.html` (preview) — 9 blocchi `<script>`

| # | Tipo | Ruolo |
|---|---|---|
| 0 | importmap | three 0.171, three-mesh-bvh 0.7.8, spark 2.1.0 |
| 1 | `src=` | supabase-js da CDN |
| 2 | classico | **boot**: auth, progetti, analisi spaziale, generatore traiettorie, bridge Python |
| 3 | module | 🔴 **bundle React/Three minificato — INTOCCABILE** |
| 4 | classico | handler sicurezza link |
| 5 | module | patch three-mesh-bvh, espone `window.THREE` |
| 6 | module | **shell AI-OS**: topbar, console comandi, upload, nascondimento pannelli nativi |
| 7 | module | Gaussian Splat (fermo, vedi §4) |
| 8 | module | **layer percettivo** (`veritas_perception.js`) |

Il file sorgente `veritas_perception.js` sta in radice ed è **inlinato** come
blocco 8. Se lo modifichi, va reinlinato (script al §6).

---

### 11.2 Cosa è stato risolto in questa sessione

Ogni voce è stata **misurata**, non stimata. I numeri stanno nei messaggi di
commit, che sono volutamente dettagliati: leggili prima di rifare una strada.

| Problema | Causa reale | Stato |
|---|---|---|
| Pannelli nativi sovrapposti | Cercati per **testo italiano** (`"CAMERE"`), invisibili con UI in inglese | ✅ criterio strutturale (`<aside>`, `#root header`) |
| Zone sospese a 3 m sui muri | Il filtro "fuori scala" **scartava il pavimento** perché era la superficie più estesa | ✅ scarta solo ciò che è fuori dall'ingombro del modello |
| Campionamento sbagliato | Per **vertici** anziché per **area**: un pavimento ha 4 vertici, otto muri ne hanno decine | ✅ campionamento per triangoli, reticolo deterministico |
| Agenti fuori dall'edificio | `applyNodesToScene` aggiornava le zone ma **usciva prima di ricalcolare i frame** | ✅ parametro `force` |
| Metà modello sotto il piano | Nessuno **appoggiava** il modello a quota 0 | ✅ `groundModel()` nel blocco 6 |
| Passeggeri invisibili | "Avvia simulazione" **non impostava** `__veritasSimStarted` | ✅ |
| **Agenti alti 25 cm** | Scala 0.12 su mesh da 2,08 m, mentre i modelli sono 1:1 in metri | ✅ default **0.82** → resa 1,71 m |
| Agenti tutti nello stesso punto | Un solo `mission_profile` per tutti | ✅ un profilo per gate + ventaglio d'ingresso |
| Agenti che avanzano in blocco | Il Core Python **non aveva sfasamento delle partenze** | ✅ `start_delay` (⚠️ serve redeploy) |
| Report sempre "generic" | `project_type` salvato in italiano, confrontato in inglese | ✅ normalizzazione |

**Aggiunto:** layer percettivo (isovista, linee di vista, intervisibilità fra
zone, confronto in piedi/seduto) e comandi console `visibilita`,
`accessibilita`, `assegna <zona>`, `scala modello <n>`.

---

### 11.3 Deploy Render

✅ **Fatto.** Il servizio su Render è aggiornato e include `start_delay`
(verificato l'11/08/2026 su `/health`, che ora dichiara versione e funzioni).

Render ridistribuisce da solo a ogni push su `main`: non serve intervento
manuale. Per controllare in qualunque momento basta aprire nel browser
**https://veritas-core-api-7g2x.onrender.com/health** e cercare la funzione
attesa nell'elenco.

Verifica dopo il deploy: gli agenti devono entrare a ondate. Prova locale già
fatta, sei agenti su 40 m:

```
senza sfasamento  x = [30.5, 30.5, 30.5, 30.5, 30.5, 30.5]  dispersione  0.00 m
con  sfasamento   x = [30.5, 24.6, 18.6, 12.6,  6.6,  0.8]  dispersione 29.75 m
```

---

### 11.4 Cosa resta aperto, in ordine di valore

#### 0) Integrare il Motore di Percezione recuperato — *priorità*

`veritas_perception.js` in radice è stato recuperato l'11/08/2026 da una
branch rimasta non unita (`claude/study-clude-repository-mfcbvm`). Ha i
propri test (`veritas_perception.test.mjs`, passano) e una demo autonoma in
`demo/`.

Sostituisce il clustering KMeans, che per i corridoi è lo strumento
sbagliato: KMeans cerca grumi attorno a un centroide, mentre un corridoio è
una striscia sottile e allungata, quindi viene fuso con la stanza adiacente
o spezzato a caso. Da lì viene buona parte delle zone incoerenti viste in
questa sessione. La pipeline è geometrica (griglia di occupazione, chiusura
morfologica, distance transform, asse mediale, strettoie, watershed) e la
larghezza di un passaggio risulta `clearance × 2`: una **misura**, non una
stima — indispensabile per un report che deve reggere un confronto
normativo.

**Stato: collegato, non ancora in uso.** Il modulo è inlinato in
`index.html` ed esposto come `window.__veritasPerceptionEngine`;
`structuralAnalysisFromPoints` lo interroga per primo e ricade su KMeans se
non ottiene almeno due zone. KMeans è rimasto intatto: nessuna regressione
possibile.

Adattamenti già fatti per farlo funzionare su nuvole da mesh:
- la cella non è più il predefinito di 5 cm (pensato per Gaussian Splat) ma
  viene derivata dalla spaziatura reale dei punti, con un minimo di 5 cm;
- il campionamento di `extractNavigablePoints` è molto più denso (tetto per
  triangolo da 40 a 150, `maxSamples` da 4.000 a 40.000). Con la nuvola rada
  di prima il motore riconosceva **3,15 m² su 1.200**: quasi tutte le celle
  risultavano vuote.

Misurato dopo gli adattamenti, sul modello di prova: **1.193,63 m² di area
navigabile riconosciuta su una sala che ne misura 1.200 al lordo dei muri.**
La misura è quindi corretta.

**La decisione che resta.** Su quel modello il motore restituisce UNA zona, e
ha ragione: è un unico ambiente, e il varco fra i due muri di controllo è
largo 4 m, sopra `mergeGatewayM` (3 m) oltre il quale due spazi non sono
separati da nulla di reale. Ma la pipeline a valle ha bisogno di almeno due
punti per costruire un percorso spawn → gate, e quindi ricade su KMeans.

Le due cose non sono in contraddizione: servono a scopi diversi. La strada
giusta è **usare il motore per le MISURE** (area navigabile, larghezze,
strettoie, varchi — dati veri da mettere nel report) e continuare a
suddividere in waypoint con un altro criterio quando l'ambiente è unico.
Oggi invece è tutto o niente. Questo è il prossimo passo, e va disegnato
prima di scriverlo.

⚠️ Non confondere i due moduli, entrambi nati come `veritas_perception.js`:
`veritas_perception.js` misura **dove si cammina e quanto è largo**;
`veritas_visibility.js` calcola **cosa si vede da dove**. Sono
complementari.


### a) Doppio Three.js + Gaussian Splat fermo — *stessa radice*

In console: `WARNING: Multiple instances of Three.js being imported`.
Il bundle porta la propria copia di Three, l'importmap ne carica una seconda.

Conseguenza concreta: **il Gaussian Splat non parte affatto** —
`Spark requires THREE.js r179 or above`, ma l'importmap fissa `three@0.171.0`.

Per risolvere servono **insieme**: `three` ≥ 0.180 e `three-mesh-bvh` ≥ 0.8.0
(la 0.7.8 è dichiarata incompatibile con Three recenti). Tocca i blocchi 5, 6,
7, 8. **Da fare con calma e verificando con uno splat vero**, non a fine
giornata.

### b) OpenSky per i tempi d'arrivo reali — *massimo valore prodotto*

Esiste già `#vs-opensky-btn` che interroga gli arrivi reali a Fiumicino (LIRF),
ma **oggi stima solo il numero di agenti**, non quando arrivano.

`start_delay` è il gancio che mancava: oggi lo calcolo con una formula
regolare (ondate ogni 3,5 s). Alimentandolo con i voli reali diventa la
distribuzione vera — 180 passeggeri alle 14:32, poi il vuoto, poi 250 alle
14:51. **È lì che nascono i picchi di affollamento veri**, quelli che un report
vendibile deve mostrare. Richiesta esplicita di Raffaella.

### c) Pannelli KPI nativi sotto i 1280 px

Sotto la soglia `xl:` di Tailwind il bundle non usa più gli `<aside>` laterali
ma dispone i KPI in una riga in fondo, che i selettori attuali non
intercettano: si sovrappongono ai comandi. Serve un selettore per quel layout.

### d) Minori

- Le quote delle zone non sono perfettamente uniformi (residuo del baricentro
  di cluster). Piccolo ma della stessa famiglia del "piede dell'agente".
- Il bundle cerca ancora `./airport.glb` → 404 a ogni avvio. Rumore innocuo.
- Il confronto in piedi/seduto funziona ma serve un modello **con arredi a
  mezza altezza** (banconi, gate) per mostrare qualcosa.

---

### 11.5 Come lavorare su questo progetto — lezioni pagate care

**Misura, non ipotizzare.** In questa sessione ho sbagliato tre ipotesi di fila
sul caso "passeggeri invisibili col motore reale" (scala, sistema di
riferimento, formato degli id). L'ha risolto una misura di tre valori:

```
frame 0: [2.29,-0.28] | frame 400: [-7.07,-0.94] | frame 799: [-7.07,-0.94]
```

Gli agenti si muovevano e si fermavano tutti nello stesso punto. Nessuna delle
tre ipotesi era giusta. **Quando sei incerto, chiedi un dato invece di
scrivere codice.**

**I difetti gravi qui sono silenziosi.** Nessun errore in console, solo
comportamento sbagliato: pannelli cercati per testo nella lingua sbagliata,
pavimento scartato come "terreno", visibilità mai riattivata. Diffida di
qualunque cosa "sembri funzionare".

**Verifica sempre le premesse.** `CLAUDE.md` cita `vaio_module_v2.js` e
`vaio_splat_module.js` come file: **non esistono**, sono inlinati. Un §11 non
c'è mai stato.

**Raffaella è architetto.** Le sue osservazioni sul mondo fisico sono
affidabili e vanno prese sul serio: è stata lei a dire che i modelli sono 1:1
e che quindi 0.12 non poteva essere una scala umana. Aveva ragione, e quello
era il difetto che rendeva tutto il resto incomprensibile.

---

### 11.6 Ricette pronte

### Verificare che il blocco 3 sia intatto (dopo ogni modifica)

```python
from html.parser import HTMLParser
import hashlib
class SE(HTMLParser):
    def __init__(self):
        super().__init__(); self.s=[]; self.i=False; self.b=[]
    def handle_starttag(self,t,a):
        if t=='script': self.i=True; self.b=[]
    def handle_endtag(self,t):
        if t=='script' and self.i: self.i=False; self.s.append(''.join(self.b)); self.b=[]
    def handle_data(self,d):
        if self.i: self.b.append(d)
p=SE(); p.feed(open('index.html',encoding='utf-8').read())
h=hashlib.sha256(p.s[3].encode()).hexdigest()[:16]
assert h=='eedd9935ea908fd3', 'BLOCCO 3 ALTERATO: '+h
print('blocco 3 intatto')
```

Poi `node --check` su ogni blocco modificato (i moduli ES vanno copiati in
`.mjs`).

### Reinlinare `veritas_perception.js` nel blocco 8

Estrai il blocco 8 con lo stesso parser e sostituiscilo con il contenuto del
file, verificando che il sorgente non contenga la stringa `</script`.

### Banco di prova headless

I CDN sono spesso irraggiungibili dagli ambienti sandbox. Ricetta che funziona:
`npm install three@0.171.0 three-mesh-bvh@0.7.8 @supabase/supabase-js
@sparkjsdev/spark --legacy-peer-deps`, copia i build in una cartella `vendor/`,
riscrivi l'importmap su percorsi locali, sostituisci `supabase.js` con uno stub
che finge login e progetto, servi con `python3 -m http.server` e pilota con
Playwright (Chromium è preinstallato in `/opt/pw-browsers`).

⚠️ `three.module.js` importa `three.core.js`: copia **tutta** la cartella
`build/`, non il solo file.

### Provare il Core Python senza Render

```bash
pip install numpy
PYTHONPATH=Assets python3 -c "
from core.engine import SimulationEngine
..."
```
Funziona: è così che è stato verificato `start_delay`.

---

### 11.7 Contratto del bridge Python

`POST /api/simulate`

```
graph: {"nodes": {id: {"pos":[x,y,z], "meta":{...}}},
        "mission_profiles": {profile_id: [node_id, ...]}}
agents: [{agent_id, profile_id, profile_data, domain, group_id, start_delay}]
ticks, dt
```

Risposta: `{"kpi": {...}, "trajectory": {"nodes": {...}, "frames": [...]}}`
dove ogni frame è `{"t": float, "agents": [{id, pos, rot, state, group,
archetype, stress}]}`.

⚠️ **`graph.nodes` è un dizionario, non un array.** Il Core numera gli agenti
come stringhe (`"a0"`) e usa stati minuscoli (`"moving"`), mentre il viewer
vuole id numerici e stati maiuscoli: `veritasNormalizeTrajectory` fa la
conversione e **rifiuta** la traiettoria se non descrive la scena caricata,
ricadendo sul generatore JS locale. Il ponte lascia sempre tre righe in
console con prefisso `[VERITAS bridge]` — sono la prima cosa da leggere se il
motore reale si comporta male.
