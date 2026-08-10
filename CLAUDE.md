# CLAUDE.md — VERITAS Spatial AI

> Istruzioni operative per Claude Code su questo repository.
> **Leggi tutto questo file prima di scrivere una sola riga di codice.**

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

- **`main`** — produzione. `index.html` (217 byte) è un meta-refresh che rimanda a `Veritas-V17-FIX-SOLO-BUG.html`.
- **`veritas-ai-os-preview`** — branch di anteprima, pubblicato via GitHub Pages su
  **https://raffaella23.github.io/Veritas-spatial-ai/** — qui `index.html` è la build nuova completa (~1,09 MB).

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

2. **`vaio_module_v2.js`** (~29 KB) — nuova shell UI minimale: topbar (brand + status + menu Spatial Layers / Analysis-Report / Editor zone), console AI unica in basso con parser di comandi in linguaggio naturale (regole, nessun costo LLM), widget upload GLB/GLTF/FBX (max 150 MB), occultamento dei pannelli nativi.

   ⚠️ **Bug già corretto, non reintrodurlo:** i pannelli nativi CAMERE e KPI sono `<aside>` con `position: static` dentro un layout flex. La prima euristica cercava solo ancestor `position: fixed|absolute` e quindi non li trovava mai. La versione corretta riconosce la landmark semantica (`<aside>` / `<nav>`) e ha come fallback solo un criterio dimensionale.

3. **`vaio_splat_module.js`** (~9 KB) — supporto **Gaussian Splatting**. Upload `.ply .splat .ksplat .spz .sog` via libreria **Spark** (`@sparkjsdev/spark` 2.1.0, aggiunta all'importmap). Estrae i centri delle gaussiane come nuvola di punti e li passa a `window.__veritasAnalyzePointCloud`: **stessa pipeline provata delle mesh, nessuna reinvenzione.** Non è visualizzazione soltanto — produce zone reali, punteggio e criticità.

4. Blocchi 6 e 7 (le due vecchie chat) **rimossi**. Titolo cambiato in `VERITAS AI-OS`.

---

## 7. Bug noto, non ancora corretto

In `showReportModal` (blocco 2) il confronto è su `project_type === "airport" || "museum"`, ma i valori reali salvati sono in italiano: **`"aeroporto"` / `"museo"`**. Risultato: le raccomandazioni ricadono sempre sul dominio "generic". Da sistemare.

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

- Verifica visiva dell'anteprima AI-OS da parte di Raffaella → poi merge su `main` (con aggiornamento del redirect in `index.html`).
- Correzione del bug `project_type` italiano/inglese (§7).
- Aggiornare `PROJECT_INFO.md` con il lavoro AI-OS + Gaussian Splat.
- Gaussian Splat Fase B: valutare occlusione/navigabilità reale sulle gaussiane (ellissoidi come ostacoli, approccio tipo Splat-Nav) oltre ai soli centri.
- Agente intelligente collegato a normative e skill di dominio reali — è la priorità dichiarata da Raffaella, ancora da costruire.
