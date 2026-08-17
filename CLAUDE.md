# CLAUDE.md — VERITAS Spatial AI

> Istruzioni operative per Claude Code su questo repository.
> **Leggi tutto questo file prima di scrivere una sola riga di codice.**
>
> Le sezioni 0-10 sono lo storico del progetto. **La sezione 11 in fondo
> descrive lo stato REALE al termine della sessione dell'11 agosto 2026** e
> corregge diversi punti precedenti ormai superati: dove divergono, vale
> la sezione 11.

---

## 🔻 Regola zero — leggi TUTTO prima, e non aprire branch

> Aggiunta il 12/08/2026 da Raffaella, dopo aver trovato quattro branch e
> lavoro duplicato. **Viene prima di ogni altra cosa in questo file.**

### 1. Leggi l'intero contenuto della repository prima di scrivere una riga

Non i documenti soltanto: **il codice che c'è già.** Prima di costruire
qualcosa, cerca se esiste. Il passaggio da una chat all'altra perde memoria, e
ogni sessione che non guarda finisce per riscrivere ciò che c'era.

Il giro minimo, tre minuti:

```bash
git branch -a                                   # quante branch, e perche'
ls *.js *.py *.json *.md                        # cosa c'e' in radice
ls Assets/core/ 2>/dev/null                     # ⚠️ il Core Python sta QUI
grep -rn "<parola chiave>" --include=*.js --include=*.py .
```

⚠️ **`Assets/` non è tutto rumore.** Il §2 dice di non indicizzarla perché
contiene ~1240 sample Unity, ed è vero — ma `Assets/core/` contiene il **Core
Python vero** (`engine.py`, `behaviour.py`, `compliance.py`, `zones.py`). Una
sessione che salta `Assets/` per intero non trova il Core e lo riscrive.

### 2. Non aprire branch nuove

Ne bastano **tre**, e sono queste:

| Branch | A cosa serve |
|---|---|
| `main` | produzione + sorgente del deploy Render |
| `veritas-ai-os-preview` | anteprima pubblica su GitHub Pages |
| **una** `claude/...` per volta | la sessione in corso, poi si cancella |

Se ne esiste già una `claude/...`, **lavora su quella**: non aprirne una
seconda. A fine sessione va cancellata, dopo aver verificato che il contenuto
sia confluito nella preview.

### 3. Cosa è successo davvero, per memoria

Il 12/08/2026 la repository aveva quattro branch, e sotto c'era questo:

- **`veritas_perception.js`** — scritto in una sessione, rimasto su una branch
  mai unita, ritrovato per caso il giorno dopo. Ci sono voluti mesi di lavoro
  perso e un recupero fortunoso.
- **Due moduli diversi con lo stesso nome.** `veritas_perception.js` misura
  *dove si cammina*; un altro, nato con lo stesso nome, calcola *cosa si vede*.
  Sono stati distinti a posteriori rinominando il secondo
  `veritas_visibility.js`. Se la prima sessione avesse guardato, non sarebbe
  successo.
- **`Assets/core/compliance.py`** — un modulo di conformità normativa esistente
  e collegato al Core, dimenticato per mesi perché stava sotto `Assets/`, che
  la documentazione dichiarava rumore.

Nessuno di questi era un errore di programmazione. Erano tre sessioni che non
avevano guardato cosa c'era già.

---

## 0-bis. Come si parla con Raffaella

> Chiesto esplicitamente da lei il 17/08/2026. Vale in ogni sessione.

**Niente tecnicismi.** Raffaella è architetto e sviluppatrice XR, non
programmatrice di questo stack: nomi di funzioni, `id` interni, dipendenze di
effetti React e sigle del bundle non le dicono nulla e le fanno perdere il filo.
Spiega **cosa si vedeva prima e cosa si vede adesso**, in italiano normale.
I dettagli tecnici stanno nei messaggi di commit, che è il posto giusto.

**Non chiederle pareri tecnici.** Se la scelta è fra due modi di scrivere una
cosa, decidi tu e dille cosa hai deciso e perché, in una riga. Le domande utili
sono solo quelle sul **prodotto** — cosa deve fare, cosa conta di più, cosa
sembra sbagliato guardando lo schermo — perché su quelle la sua risposta vale
più della tua.

**Le sue osservazioni sul mondo fisico sono affidabili** (vedi §11.5): è stata
lei a dire che i modelli sono 1:1 e che quindi 0.12 non poteva essere una scala
umana, e aveva ragione.

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

⚠️ **Unica eccezione, importante: `Assets/core/`.** Contiene il Core Python vero
(`engine.py`, `behaviour.py`, `compliance.py`, `zones.py`) — non è un sample Unity.
È stato dimenticato per mesi proprio per questa riga. Vedi la Regola zero in cima.

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
| `claude/...` (una sola) | Branch di lavoro della sessione in corso | Sviluppo, poi si cancella |

Anteprima live: **https://raffaella23.github.io/Veritas-spatial-ai/**

⚠️ **`main` ha ancora il frontend vecchio.** Su `main` sono stati portati solo
i file Python (per Render). Il frontend nuovo vive sulla preview e va promosso
a `main` **solo dopo approvazione esplicita di Raffaella**.

### Struttura di `index.html` (preview) — 14 blocchi `<script>`

⚠️ Erano dichiarati 9 con il motore di percezione al blocco 8. **Verificato con
`html.parser` il 12/08/2026: sono 10**, e i due moduli percettivi occupano
l'8 e il 9 — nell'ordine opposto a quello che c'era scritto qui.

| # | Tipo | Ruolo |
|---|---|---|
| 0 | importmap | three 0.171, three-mesh-bvh 0.7.8, spark 2.1.0 |
| 1 | `src=` | supabase-js da CDN |
| 2 | classico | **boot**: auth, progetti, analisi spaziale, generatore traiettorie, partenze da voli reali, bridge Python |
| 3 | module | 🔴 **bundle React/Three minificato — INTOCCABILE** |
| 4 | classico | handler sicurezza link |
| 5 | module | patch three-mesh-bvh, espone `window.THREE` |
| 6 | module | **shell AI-OS**: topbar, console comandi, upload, nascondimento pannelli nativi |
| 7 | module | Gaussian Splat (fermo, vedi §11.4a) |
| 8 | module | **visibilità** (`veritas_visibility.js`) — cosa si vede da dove |
| 9 | module | **motore di percezione** (`veritas_perception.js`) — dove si cammina e quanto è largo |
| 10 | module | **ponte al modello locale** (`veritas_llm.js`) — traduce le frasi in comandi esistenti |
| 11 | module | **normative** (`veritas_normative.js`) — soglie con citazione della fonte |
| 12 | module | **vie di esodo** (`veritas_esodo.js`) — lunghezza reale del percorso di fuga |
| 13 | module | **verdetti sul modello** (`veritas_visuale.js`) — mappa di esodo, flusso, zone che pulsano |

I file sorgente `veritas_visibility.js` e `veritas_perception.js` stanno in
radice e sono **inlinati** come blocchi 8 e 9. Se li modifichi, vanno
reinlinati (ricetta al §11.6).

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

**RISOLTO l'11/08/2026 con il riconoscimento del tipo di ambiente.**
`classifyEnvironment` guarda le misure gia' calcolate (area navigabile,
zone, varchi, livelli, provenienza da splat) e dichiara cosa ha davanti,
scegliendo poi la strategia. Le MISURE si tengono sempre, anche quando le
zone non bastano a costruire un percorso: erano la cosa piu' preziosa e
prima venivano scartate insieme al resto.

Il verdetto viene annunciato in chat via `window.__veritasAnnounce`, non
solo in console, perche' un'analisi automatica deve dire cosa ha capito e
permettere all'utente di correggerla subito. Verificato sul modello di
prova: *"Ho riconosciuto un ambiente unico: un solo spazio continuo di
1194 m2, senza divisioni reali"*.

Nessun costo di modello linguistico: sono soglie su grandezze misurate.

Restano da affinare le strategie: oggi `funzionale` non e' ancora
implementata come distribuzione dei waypoint per funzione lungo l'asse del
flusso, e si ricade su KMeans. E' il prossimo passo.

**La decisione originaria, per memoria.** Su quel modello il motore restituisce UNA zona, e
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

### b) OpenSky per i tempi d'arrivo reali — ✅ **FATTO** (12/08/2026)

Era: `#vs-opensky-btn` interrogava gli arrivi reali a Fiumicino (LIRF) ma
**stimava solo il numero di agenti**, non quando arrivano; `start_delay`
veniva da una formula regolare (ondate ogni 3,5 s), cioè un flusso costante
che in nessun aeroporto esiste.

Ora gli **orari di atterraggio** (`lastSeen` di OpenSky) diventano la
distribuzione delle partenze. Il numero di agenti resta quello scelto
dall'utente: si conserva la **forma** del traffico, non il volume, che sarebbe
insimulabile (Fiumicino muove ~100.000 pax/giorno).

Come funziona, in `index.html` blocco 2, subito dopo `runOpenSkyEstimate`:

1. `veritasScheduleFromArrivals` tiene orario e passeggeri stimati di ogni
   volo (prima si buttava via tutto tranne il conteggio);
2. `veritasPeakWindow` trova le **2 ore reali più cariche**. Comprimere le 24 h
   sui ~400 s di simulazione ridurrebbe ogni picco a un fotogramma, ed è la
   punta che dimensiona un terminal;
3. `veritasStartDelaysFromSchedule` ripartisce gli agenti sui voli in
   proporzione ai passeggeri e colloca ciascuno all'orario del proprio volo,
   più lo sbarco (~12 min reali, compressi con lo stesso fattore);
4. `veritasStartDelays` è il **punto unico** usato sia dal ponte Python sia dal
   generatore JS locale. Senza voli caricati ricade sulla formula di prima,
   byte per byte: nessuna regressione per chi non usa OpenSky, e nessun
   significato forzato su museo e gaming, dove un atterraggio non vuol dire
   niente (Rule of Three).

Gli arrivi restano in `localStorage` per 48 h (`window.__veritasFlightSchedule`):
la stima si fa nel pannello impostazioni, la simulazione parte molto dopo. La
punta riconosciuta è dichiarata nel pannello **e annunciata in chat** via
`__veritasAnnounce`.

⚠️ **Da fare con la trasparenza già adottata altrove:** OpenSky non fornisce
passeggeri, solo ADS-B. I 140 pax/volo sono una costante dichiarata, e i dati
di arrivo sono del giorno prima, non in tempo reale. Vale la **forma**, non il
valore assoluto.

Prove: `node veritas_flights.test.mjs` (18 verifiche, estrae le funzioni da
`index.html`, non le ricopia). Misurato su una giornata con tre banchi di
arrivi e un vuoto dichiarato di 40 minuti, 40 agenti su 400 s:

```
                    (20 intervalli da 20 s)
atterraggi reali    ##......4#4..8#.....
partenze simulate   3543....143412433...     ← segue i banchi e il vuoto
formula regolare    ##..................     ← tutto nei primi 42 s
```

**Difetto trovato e corretto strada facendo:** la prima ripartizione usava il
metodo dei resti più grandi. Siccome la stima dei passeggeri è la stessa per
ogni volo, tutti i resti sono identici e finivano in blocco sui primi voli: il
banco iniziale riceveva 18 agenti invece di 15,6, gli ultimi altrettanti in
meno — un picco gonfiato all'inizio e uno sgonfiato in fondo, cioè proprio
l'errore che questo lavoro serve a togliere. Ora è arrotondamento cumulativo:
scarto massimo **1,3%**.

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

### Reinlinare `veritas_perception.js` nel blocco 9

Estrai il blocco 9 con lo stesso parser e sostituiscilo con il contenuto del
file, verificando che il sorgente non contenga la stringa `</script`.
(`veritas_visibility.js` è il blocco 8, stessa procedura.)

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

---

## 12. Stato reale — sessione 13 agosto 2026

> **Blocco critico**: Zone assignment ancora rotto (5 vs 7). Tentativo di fix
> con setTimeout fallito. Root cause: analisi geometrica lanciata asincrona da
> modulo sconosciuto.

### 12.0 Il difetto non è risolto

**Console log reale** (modello caricato):
```
[VERITAS] analisi con motore geometrico: 7 zone, 63 strettoie, 84.23 m2 navigabili
[VERITAS AUTO v5] nessuna zona misurate, ripiego sui nomi: Array(5)
[VERITAS AUTO v5] Auto-assegnati 5 nodi da analyzeMesh
```

Il motore geometrico calcola **7 zone** correttamente, ma `__veritasOnModelLoaded`
le vede **zero** e fallback a `analyzeMesh` che ne estrae **5 dai nomi mesh**.

**Tentativo**: `setTimeout(..., 0)` a riga 2872 non ha risolto. Prova che
l'asincronia è **ancora più profonda**.

### 12.1 Root cause identificato

L'analisi geometrica (`structuralAnalysisFromPoints`) è lanciata **asincrona da
una fonte sconosciuta**, NON da `__veritasOnModelLoaded`:

1. Modello caricato → `window.__veritasModelRoot` impostato (riga 9099)
2. `__veritasOnModelLoaded(rootObj)` richiamato (riga 9102)
3. **Subito**: `__veritasOnModelLoaded` esegue, verifica `lastZones` (vuoto),
   fallback su `analyzeMesh` (5 zone)
4. **In parallelo**: Un modulo (forse blocco 3 React, o blocchi 8-9) lancia
   `structuralAnalysisFromPoints`, popola `lastZones` con 7 zone
5. **Troppo tardi**: `__veritasOnModelLoaded` ha già finito e scelto i 5

**Dove stampa il messaggio "analisi con motore geometrico"?** Riga 2739, dentro
`structuralAnalysisFromPoints`. Ma NON è raggiunto da `__veritasOnModelLoaded`.

**Chi chiama `structuralAnalysisFromPoints`?**
- Non direttamente `__veritasOnModelLoaded` ❌
- Potenzialmente: blocco 3 (bundle React), moduli ES (blocchi 8-9), handler UI

### 12.2 Prossimo passo — vero fix

**Azione 1: Trovare il lanciatore**
```bash
grep -rn "Ho riconosciuto" . --include=*.js --include=*.md
grep -rn "classifyEnvironment\|zonesFromPerceptionEngine" . --include=*.js
```

Se "Ho riconosciuto" è in `veritas_perception.js` (blocco 9 inlinato), allora
il lanciatore è un modulo ES, **non** il blocco 2.

**Azione 2: Aggiungere callback post-analisi**

Una volta trovato il lanciatore, aggiungere una callback tipo:

```javascript
window.__veritasOnAnalysisComplete = () => {
  if (lastZones && lastZones.length >= 2) {
    console.log('[VERITAS callback] Analisi completata, assegno', lastZones.length, 'zone');
    applyAutoAssignment(lastZones);
  }
};
```

E richiamarlo dal lanciatore dopo che `structuralAnalysisFromPoints` termina.

**Azione 3: Verificare**

Dopo il fix, console dovrebbe mostrare:
```
[VERITAS] analisi con motore geometrico: 7 zone
[VERITAS callback] Analisi completata, assegno 7 zone
[VERITAS AUTO v5] Auto-assegnati 7 nodi da motore geometrico
```

### 12.3 Normative, visuale, esodo — tutto OK

- ✅ **Accessibilità, antincendio, affollamento**: 3 framework × 19 soglie
- ✅ **Mappa di esodo**: heatmap texture floor
- ✅ **Flusso di particelle**: discende gradiente distanze
- ✅ **Zone pulsanti**: anelli animati per verdetto
- ✅ **Deploy Render**: Python Core operativo, `start_delay` funzionante
- ✅ **OpenSky**: distribuzione partenze da arrivi reali

### 12.4 Blocchi aperti oltre zone

1. **Gaussian Splat** (fermo): Spark richiede three ≥ r179, importmap fissa 0.171
2. **Doppio Three.js**: Warning "Multiple instances"
3. **Pannelli KPI sotto 1280px**: Layout Tailwind non intercettato dai selettori
4. **Agente pathfinding**: Attraversa muri (Backend issue, Assets/core/)

### 12.5 La richiesta di Raffaella: "Gli occhi"

> *"Dovresti dare a questi agenti gli occhi, dovresti dare anche gli occhi per
> guardare le immagini e in questo caso i modelli."*

**Tre opzioni**:

**A) Motore di percezione geometrico + ragionamento di sequenza**
- Ordina le 7 zone per flusso geometrico (terra → volo)
- Riconosci tipo spazio da forma/misura (rettangolo stretto = corridoio)
- Deduce funzione da posizione nella sequenza
- ⏱️ **1-2 giorni**, nessun costo LLM, deterministico

**B) LLM-based visione 3D**
- Genera screenshot del modello da più angoli
- Manda a Claude Vision per etichettatura semantica
- Vincola le 7 zone geometriche agli spazi riconosciuti
- ⏱️ **2-3 giorni**, costo API Vision per modello, latenza

**C) Ibrido**
- A per misure e geometria (sempre)
- B per validazione semantica quando richiesto (optional)
- ⏱️ **3-4 giorni**

**Suggerimento**: Partire da A (percettivo geometrico puro). Raffaella sa come
riconoscere uno spazio guardandolo — un algoritmo che capisce forma/flusso è
la prima cosa vera.

---

## 13. Stato reale — sessione 13 agosto 2026 (pomeriggio)

> **Dove questa sezione contraddice le precedenti, vale questa.**
> La §12 e' superata: il difetto delle zone che descriveva e' RISOLTO.

### 13.0 Come si lavora qui, in tre righe

1. **Il blocco 3 non si tocca** (sha `eedd9935ea908fd3`). Verificalo dopo ogni modifica.
2. **Mai push su `main`** senza approvazione esplicita. Eccezione gia' concessa: i file Python per Render.
3. **Misura, non dedurre.** In questa sessione due ipotesi scritte col tono
   della certezza sono state smontate da un esperimento di controllo durato un
   minuto. Prima di scrivere "la causa e'", fai la prova.

### 13.1 La struttura di `index.html`: 20 blocchi

| # | Ruolo |
|---|---|
| 0 | importmap — **three 0.180.0**, three-mesh-bvh 0.8.3, spark 2.1.0 |
| 2 | boot: auth, analisi spaziale, `extractNavigablePoints`, scala automatica |
| 3 | 🔴 **bundle React/Three minificato — INTOCCABILE** (porta dentro three 0.160) |
| 5 | patch three-mesh-bvh, espone `window.THREE` |
| 6 | **ingresso** — riconoscimento formato dai byte |
| 7 | **segnaletica** — famiglie di colore a terra |
| 8 | **percorso** — da ambienti a tappe |
| 9 | **sequenza** — le quattro fasi |
| 10 | **memoria** — referto con provenienza |
| 11 | **vista** — pianta ortografica |
| 12 | shell AI-OS |
| 13 | Gaussian Splat |
| 14+ | visibilita', percezione, LLM, normative, esodo, visuale |

⚠️ Gli indici cambiano a ogni inserimento: **non fidarti di questa tabella,
riparsala con `html.parser`.** Individua i blocchi per contenuto, mai per numero.

### 13.2 I moduli nuovi (radice, inlinati in `index.html`)

```
veritas_ingest.js       40 prove   9 formati riconosciuti dai byte
veritas_segnaletica.js  37 prove   famiglie di colore a terra, direzioni
veritas_vista.js        25 prove   pianta ortografica: GUARDARE il modello
veritas_referto.js      42 prove   memoria di lavoro con provenienza
veritas_sequenza.js     27 prove   ambiente -> misura -> giudizio -> pronto
veritas_percorso.js     24 prove   31 ambienti -> 7 tappe
```

Il sorgente in radice e' la **fonte unica**; l'inline si rigenera togliendo gli
`export` e aggiungendo la legatura a `window`. Se modifichi un modulo, reinlinalo.

### 13.3 Il principio che regge tutto: GUARDARE, non leggere la struttura dati

Ogni tecnico imposta il 3D a modo suo. Il colore puo' stare in `material.color`,
in una texture, in un atlas, nei colori per vertice, in un'armonica sferica.
**Misurato sul modello di prova: 89 materiali, 33 con texture** — su quelli
`material.color` vale bianco.

Quindi la segnaletica si legge da una **pianta renderizzata**: telecamera
ortografica appena sopra il pavimento, rivolta in giu'. I pixel sono identici
qualunque sia l'origine del colore, perche' e' il renderer a risolverla.
Soffitti e coperture restano dietro l'obiettivo.

Stesso principio per catturare cio' che dicono le analisi: si osserva il
contenitore della chat con un `MutationObserver`, non si aggancia una funzione
interna. **Guardare il risultato, non ipotizzare come viene prodotto.**

### 13.4 Difetti gravi risolti, con i numeri

| Difetto | Causa reale | Prova |
|---|---|---|
| Verdetto normativo **falso** | la nuvola non veniva rifatta dopo il riscalo 6× | 30 difformi → 23 conformi; peggiore 0,151 m → 0,50 m |
| 84 m² navigabili su 3592 | idem: nuvola ferma a 19,7 × 10,4 su modello 121 × 67,6 | 84,23 → 3700,5 m² |
| Ordine al contrario | si analizzava prima di sistemare l'ambiente | sequenza a fasi con punto fisso |
| Zone 7 trovate / 6 assegnate (§12) | guardia `currentNodes < 2`: i nodi sbagliati vincevano perche' arrivavano prima | 31 ambienti → 7 tappe |
| Gaussiane invisibili | Spark registra `splatDefines` nel three sbagliato | patch su `Material.prototype` |
| Colore mai letto | nessuno lo estraeva | 4 famiglie, 3 con verso di marcia |

**La conferma piu' forte:** motore geometrico 3700,5 m², occhio 3592 m². Due
metodi indipendenti che convergono al 3%. Prima erano 84 contro 3592, e nessuno
poteva accorgersene perche' non si parlavano — e' per questo che serve la
memoria condivisa.

### 13.5 Il banco di prova

```bash
sh banco/monta.sh                        # rimonta vendor + index locale
(cd banco && python3 -m http.server 8899 &)
node banco/prova.mjs                     # ingresso: mesh + gaussiane
node banco/cervello.mjs                  # stato di tutti i moduli
node banco/norme.mjs                     # verdetto normativo e sue misure
node banco/zone.mjs                      # ambienti e tappe
```

Chromium vero, pagina vera, widget vero. **Una corsa completa dura 80-100 s**:
se sfora, e' un sintomo, non un problema del banco.

⚠️ Render e OpenSky sono bloccati dal proxy: gli errori di rete sono attesi.
Ogni riassegnazione di nodi fa ripartire `__veritasGetTrajectory`, che li
aspetta — e' per questo che riassegnare tre volte portava la prova da 96 a 260 s.

### 13.6 Cosa resta aperto

1. **Provare con una scansione vera.** Lo splat sintetico
   (`veritas_genera_splat.py`) verifica l'impianto, non la qualita' su dati
   rumorosi. Dalla sandbox non si scarica niente: solo git passa.
2. **I nomi delle tappe sono grezzi** — tre "lounge" di fila. Logica preesistente.
3. **Pannelli KPI sotto i 1280 px** si sovrappongono ai comandi.
4. **`main` ha ancora il frontend vecchio.** La promozione aspetta il via libera.
5. **Doppio three** (bundle 0.160 + importmap 0.180): aggirato, non risolto.
   La soluzione pulita e' ricompilare il bundle.

---

## 14. Stato reale — sessione 17 agosto 2026

> **Dove questa sezione contraddice le precedenti, vale questa.**
> Corregge il punto 2 di §13.6 ("i nomi delle tappe sono grezzi"): la causa
> non era la logica dei nomi, ed era molto piu' grave di un difetto estetico.

### 14.0 Il difetto che spiegava le fotografie

Nella scena comparivano scatole con scritto `LOUNGE`, `IMBARCO A`, `GATE A1`
in mezzo al piazzale, su modelli che non erano quell'aeroporto. **Non era la
segmentazione: le zone erano gia' misurate bene.**

Il bundle (blocco 3, intoccabile) contiene sei nodi cablati:

```
ingresso [-45,0,-38]  accettazione [-12,0,-18]  controllo [2,0,2]
lounge   [ 18,0, 14]  imbarco      [ 32,0, 22]  gate_A1   [48,0,32]
```

un ingombro di 93 x 70 m. Vincono perche' `iB` si valuta **al caricamento del
modulo**, leggendo `window.__veritasInitialNodes`, che a quel punto e' vuoto:
le zone misurate arrivano secondi dopo, quando il GLB e' letto e l'analisi
geometrica e' finita. Da li' in poi non le legge piu' nessuno.

Da quei sei nodi discendono tre cose, tutte silenziose:

| Conseguenza | Meccanismo |
|---|---|
| Marker fantasma sul piazzale | il gruppo nasce con 6x3 figli; `moveHotspotVisual` indicizza `children[i*3]`, quindi con **meno** di sei zone quelli in eccesso non venivano mai spostati |
| Zone senza marker | con **piu'** di sei zone, dalla settima in poi non esisteva alcun figlio da spostare |
| Agenti che spariscono | il pool nasce con `for (i=0; i<28; i++)`; il ciclo di animazione fa `if (!figura) return`. Il cursore arriva a **60** e la chat accetta qualunque numero: si chiedono 50 persone, se ne vedono 28 |

I KPI di `hV()` sono **cablati** (flusso 0.156, 12 rallentamenti, transito
131,4 s, saturazione 68%). Se il ponte Python viene rifiutato restano a
schermo con l'aria di essere misurati.

### 14.1 ⚠️ La trappola: `__veritasSetTrajectory` NON si usa

`window.__veritasSetTrajectory` e' esposto dal bundle e **non lo chiama
nessuno** (una sola occorrenza in tutto il file: la definizione). Sembra la
via naturale per sostituire i nodi. **Non lo e'.**

L'effetto React che costruisce la scena dipende da `[W]`. Cambiare
l'*identita'* di quell'oggetto lo fa ripartire da capo: nuova `THREE.Scene`,
renderer distrutto e ricreato — e **il modello caricato non rientra**, perche'
lo aggiunge solo il callback del loader GLB, che non viene rieseguito. Si
otterrebbero marker perfetti su una scena vuota.

Per questo `applyNodesToScene` **muta l'oggetto sul posto** (`traj.nodes = …`,
`traj.frames.length = 0`) invece di chiamare il setter: funziona per il ciclo
di animazione, che rilegge `W.frames` a ogni fotogramma, ma non ricostruisce
nulla. **Chi tocca questa parte deve saperlo prima, non dopo.**

### 14.2 Come si e' corretto

Tutto dal blocco 2, senza toccare il blocco 3 e senza passare da React:

- `veritasRebuildHotspots()` ricostruisce i figli **tenendo lo stesso oggetto
  gruppo** — il bundle ne conserva il riferimento per accendere e spegnere il
  layer zone, e sostituirlo lo scollegherebbe. Geometrie, materiali e texture
  vecchi vengono liberati: senza `dispose` la memoria video crescerebbe a ogni
  rianalisi.
- `veritasEnsurePassengerPool(frames)` **estende** il pool, non lo ricostruisce.
  Quante figure servano lo dicono i frame, non il numero chiesto: con lo
  sfasamento delle partenze gli agenti non compaiono tutti al frame zero, per
  cui si guarda l'id piu' alto su **tutti** i frame.
- Colori e geometrie sono copiati dal bundle di proposito: un marker o un
  agente ricostruito non deve distinguersi da uno originale.

### 14.3 Auto-assegnazione: dominio e misure

Due difetti nella stessa funzione (`assegnaZoneMisurate`), entrambi silenziosi:

1. **I nomi erano sempre da aeroporto.** `window.__veritasProjectType` esiste
   ed e' scelto dall'utente alla creazione, ma la funzione non lo guardava:
   "Accettazione" e "Controllo" finivano sulle sale di un museo. Ora c'e'
   `LESSICO_ZONE` per dominio, piu' uno **neutro** per quando il tipo non e'
   dichiarato — non si indovina l'edificio, si descrive la funzione.
2. **I ruoli venivano dalla posizione in fila.** La terza zona era "il
   controllo" *perche' era terza*. Ora, per le zone di mezzo, comandano le
   misure gia' calcolate: il filtro dove lo spazio si **stringe**
   (`widthMinor` minimo = clearance x 2, larghezza libera reale), la sosta
   dove si **allarga** (area massima). Prima e ultima restano ingresso e
   destinazione, quelle le definisce il flusso.

⚠️ **Il vocabolario dei `type` e' portante** — `spawn / checkin / security /
lounge / gate` — e ci si appoggiano generatore di traiettorie, altezze marker
e grafo delle missioni in una ventina di punti. **Cambia l'etichetta, non il
tipo.** Senza `widthMinor` si ricade sulla sequenza posizionale di prima.

### 14.4 Il banco di prova, e perche' basta

`veritas_zone.test.mjs` e `veritas_marker.test.mjs` estraggono le funzioni
**dall'HTML per ancore testuali** e le eseguono con `new Function` su stub
minimi (THREE finto che conta figli e `dispose`). Non ricopiano il codice:
se cambi la firma di una funzione, l'ancora smette di combaciare e la prova
fallisce subito invece di provare una copia vecchia.

```bash
node veritas_zone.test.mjs      # 30 prove: lessico, ruoli dalle misure
node veritas_marker.test.mjs    # 33 prove: marker e pool agenti
for t in veritas_*.test.mjs; do node "$t" >/dev/null || echo "$t KO"; done
```

Girano in meno di un secondo, senza browser. Il banco Playwright di §13.5
resta per le prove d'insieme.

### 14.5 Cosa resta aperto

1. **Verifica visiva di Raffaella** su un modello vero: le prove coprono la
   contabilita' degli oggetti, non l'aspetto della scena.
2. I KPI cablati di `hV()` restano visibili quando il ponte Python cade.
   Andrebbero azzerati o dichiarati, invece di sembrare misurati.
3. Restano aperti i punti 1, 3, 4 e 5 di §13.6 (scansione vera, pannelli KPI
   sotto i 1280 px, `main` col frontend vecchio, doppio three).

### 14.6 Nota di metodo

`__veritasSetTrajectory` sembrava la soluzione ovvia, ed era una trappola che
avrebbe svuotato la scena senza un errore. L'ha smontata la lettura delle
**dipendenze dell'effetto** (`}, [W]);`), non un ragionamento sull'API.
Vale la regola gia' scritta in §11.5: qui i difetti gravi sono silenziosi, e
quello che "sembra funzionare" va verificato guardando il codice che lo esegue.
