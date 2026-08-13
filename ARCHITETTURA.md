# ARCHITETTURA.md — mappa unica del progetto VERITAS

> **A cosa serve questo file.** Il passaggio da una chat all'altra perde memoria, e
> ogni sessione che non guarda finisce per riscrivere ciò che c'era. Questo file è
> la **fonte unica** su *dove sta cosa* e *cosa esiste già*.
>
> - `ARCHITETTURA.md` (questo file) → **struttura e capacità.** Cosa c'è, dove, e se è verificato.
> - `CLAUDE.md` → **regole operative e storia.** Come si lavora qui, e cosa è successo.
> - `PROJECT_INFO.md` → archivio storico per sessione. Utile, non normativo.
> - `CONTEXT.md` → principi di design. ⚠️ descrive in parte un'architettura *target*, non lo stato.
>
> Ogni voce qui sotto è marcata:
> **[V]** verificato in questa sessione · **[D]** dichiarato dalla documentazione, non riverificato
>
> Se questo file contraddice gli altri, **vale questo** — ma solo per le voci **[V]**.
> Ultimo aggiornamento: 12 agosto 2026.

---

## 1. Topologia: branch e deploy

| Branch | Contiene | Serve a | Chi lo consuma |
|---|---|---|---|
| `main` | Core Python + `Veritas-V17-FIX-SOLO-BUG.html` + `index.html` (redirect 217 B) | Produzione | **Render ridistribuisce da qui** |
| `veritas-ai-os-preview` | `index.html` completo (~1,33 MB) + Core Python | Anteprima | **GitHub Pages** |
| `claude/...` | branch di lavoro, **una sola per volta** | Sessione in corso | nessuno |

⚠️ **Il frontend nuovo è solo sulla preview.** Su `main` vanno **solo i file Python**, per far
ridistribuire Render — eccezione registrata in CLAUDE.md §11.0. Promuovere il frontend a `main`
richiede approvazione esplicita di Raffaella.

**Conseguenza operativa che è già costata tempo:** una modifica al Core Python che resta sulla
preview **non arriva al servizio in esecuzione**. Il frontend la chiamerà e otterrà una risposta
del backend vecchio, senza errori evidenti.

### Deploy Render — **[V]**

- Servizio `veritas-core-api` (`srv-d9r2tmss728c73ct1c80`), piano **free**, regione Oregon
- Auto-deploy **sì**, a ogni commit su `main`
- URL: `https://veritas-core-api-7g2x.onrender.com` · health: `/health`
- Deploy corrente: `80e73f7` — **status `live`**, concluso 12/08/2026 18:27
- Piano free: si addormenta dopo ~15 min, **cold start 30-60 s**. Non è un guasto.

> **Il connettore Render è attivo in questa sessione.** Si possono leggere servizi, deploy e log
> senza uscire dalla chat — e serve, perché il proxy della sandbox blocca `onrender.com` via curl
> (403 sul tunnel). `workspaceId = tea-d9r2r1iju40c73e4k2cg`.

---

## 2. Il runtime: `index.html`, 14 blocchi `<script>` — **[V]**

Verificato con `html.parser`, non con regex (il bundle contiene stringhe che *sembrano* tag).

| # | Tipo | Byte | Ruolo |
|---|---|---|---|
| 0 | importmap | 367 | three 0.171, three-mesh-bvh 0.7.8, spark 2.1.0 |
| 1 | `src=` | 0 | supabase-js da CDN |
| 2 | classico | 229.933 | **BOOT** — auth, progetti, analisi spaziale, isovista, pathfinding, bridge Python, OpenSky |
| 3 | module | 872.507 | 🔴 **bundle React/Three minificato — INTOCCABILE** · sha `eedd9935ea908fd3` |
| 4 | classico | 529 | handler sicurezza link |
| 5 | module | 896 | patch three-mesh-bvh, espone `window.THREE` |
| 6 | module | 83.266 | **SHELL AI-OS** — topbar, console comandi, upload, report percezione, vista in prima persona |
| 7 | module | 9.664 | Gaussian Splat (**fermo**, vedi §7) |
| 8 | module | 28.513 | visibilità ← `veritas_visibility.js` |
| 9 | module | 26.934 | percezione geometrica ← `veritas_perception.js` |
| 10 | module | 11.264 | ponte LLM locale ← `veritas_llm.js` |
| 11 | module | 21.532 | normative ← `veritas_normative.js` |
| 12 | module | 9.803 | vie di esodo ← `veritas_esodo.js` |
| 13 | module | 11.485 | verdetti sul modello ← `veritas_visuale.js` |

### Moduli in radice ↔ copia inlinata — **[V]**

I sei file `veritas_*.js` in radice sono **inlinati** nei blocchi 8-13. Confronto byte a byte:

| File | Blocco | Stato |
|---|---|---|
| `veritas_visibility.js` | 8 | identico |
| `veritas_perception.js` | 9 | **diverge di 23 righe — è corretto così** |
| `veritas_llm.js` | 10 | identico |
| `veritas_normative.js` | 11 | identico |
| `veritas_esodo.js` | 12 | identico |
| `veritas_visuale.js` | 13 | identico |

⚠️ La divergenza del 9 **non è un errore da sanare**: la copia inlinata è il file di radice *più*
un footer che espone `window.__veritasPerceptionEngine`. Il file di radice resta un modulo ES puro,
provabile in isolamento dai suoi test. **Non sovrascrivere l'uno con l'altro.** Se modifichi
`veritas_perception.js`, reinlinalo conservando quel footer.

---

## 3. Il Core Python — `Assets/core/`

⚠️ **Sta sotto `Assets/`**, che la documentazione dichiara rumore (~1240 sample Unity). È vero per
tutto il resto di `Assets/`, **non per `core/`**. È già stato dimenticato per mesi per questo.

| File | Righe | Ruolo |
|---|---|---|
| `engine.py` | ~420 | `SimulationEngine`: tick, KPI, traiettoria, **`_compute_agent_perception`**, `export_perception_report` |
| `agent.py` | ~215 | `HumanAgent`: decisione per dominio, stress, contagio sociale, **mappa cognitiva** |
| `behaviour.py` | ~60 | `SyntheticPlayer`: il corpo — posizione, waypoint, stato |
| `compliance.py` | ~50 | `AccessibilityValidator`: soglie per dominio + regole VVFF |
| `topology_analyzer.py` | ~300 | GLB → nuvola di punti → cluster → grafo di navigazione (usa trimesh + sklearn) |
| `path_loader.py` | ~30 | legge il grafo, restituisce waypoint per `mission_profile` |
| `recommendations.py` | ~130 | KPI → raccomandazioni con benchmark di ricavo |
| `report_builder.py` | ~340 | report HTML della percezione (versione lato server) |

⚠️ **`zones.py` non esiste.** CLAUDE.md lo elenca fra i file del Core: è un errore documentale.

`main.py` (radice) è un runner da riga di comando indipendente; `api_server.py` è il servizio HTTP.

---

## 4. I due contratti di integrazione

### 4a. Bridge globale `window.__veritas*` — **[V]** 68 simboli

È **l'unico modo sicuro** di integrarsi fra blocchi: il boot è uno script classico e non può
importare moduli ES. Non inventare nomi — cercali con grep.

I più rilevanti, per famiglia:

- **scena** `__veritasScene` `__veritasCamera` `__veritasRenderer` `__veritasControls` `__veritasModelRoot` `__veritasCanvasEl` `THREE`
- **zone** `__veritasGetNodes` `__veritasAddNode` `__veritasRemoveNode` `__veritasAutoZones` `__veritasHotspotGroup` `__veritasLastGraph`
- **analisi** `__veritasAnalyzePointCloud` `__veritasPerceptionEngine` `__veritasPerceive` `__veritasPercezione` `__veritasMisure` `__veritasFloorYNear`
- **agenti** `__veritasPassengerGroups` `__veritasPassengerScale` `__veritasAgentCount` `__veritasSimStarted` `__veritasSpeedMultiplier`
- **percezione** `__veritasPerceptionReport` `__veritasFOVFrames`
- **domini** `__veritasNormative` `__veritasEsodo` `__veritasVisuale` `__veritasVerdict`
- **AI/chat** `__veritasLLM` `__veritasRunCommand` `__veritasCommandExtensions` `__veritasAnnounce`
- **backend** `__veritasApiBase` `__veritasSaveProject` `__veritasFlightSchedule`

### 4b. Contratto HTTP verso il Core — `POST /api/simulate`

```
richiesta  { graph: { nodes: {id: {pos:[x,y,z], meta:{...}}},
                      mission_profiles: {profile_id: [node_id,...]} },
             agents: [{agent_id, profile_id, profile_data, domain, group_id, start_delay}],
             ticks, dt, vvff_rules, emergency }

risposta   { kpi: {...},
             trajectory: { nodes: {...}, frames: [{t, agents:[{id,pos,rot,state,group,archetype,stress}]}] },
             perception: { perception_source, perception_timeline, agent_cognitive_maps, zone_comfort_analysis } }
```

⚠️ `graph.nodes` è un **dizionario**, non un array. Il Core numera gli agenti come stringhe
(`"a0"`) e usa stati minuscoli; `veritasNormalizeTrajectory` converte e **rifiuta** la traiettoria
se non descrive la scena caricata, ricadendo sul generatore JS locale. Tre righe in console con
prefisso `[VERITAS bridge]` sono la prima cosa da leggere se il motore reale si comporta male.

Altri endpoint: `GET /health` (dichiara le funzioni attive), `POST /api/analyze-topology`,
`POST /api/opensky/arrivals`, `POST /api/recommendations`, `GET /api/perception-report`,
`GET /agent-sees/{id}`.

⚠️ `/api/perception-report` e `/agent-sees` conservano **una copia sola e globale** lato server:
con più utenti collegati restituiscono la simulazione di qualcun altro. Il viewer per questo tiene
i dati nel browser (`__veritasPerceptionReport`) e non li rilegge dal server. Quei due endpoint
sono utili solo per prove da riga di comando.

---

## 5. Inventario delle capacità richieste

Legenda: ✅ esiste e verificato · 🟡 esiste ma parziale/non verificato a schermo · ❌ assente

### Percezione spaziale ✅
- **`veritas_perception.js`** (blocco 9, `window.__veritasPerceptionEngine`) — pipeline geometrica:
  griglia di occupazione → chiusura morfologica → distance transform → asse mediale → strettoie →
  watershed. La larghezza di un passaggio risulta `clearance × 2`: **una misura**. Test propri, passano **[V]**.
- **`veritasComputeIsovist`** (blocco 2) — 32 raggi orizzontali contro la mesh, area dell'isovista
  (Benedikt 1979), a **due altezze occhio** (1,65 / 1,20 m). Restituisce `area_m2`, `min_free_m`,
  `mean_free_m` e i 32 raggi grezzi. **[V]**
- **`veritas_visibility.js`** (blocco 8) — isoviste, linee di vista, intervisibilità fra zone,
  griglia di occlusione da mesh **e da splat**.

### Comprensione 3D 🟡
- `extractNavigablePoints` (blocco 2) — campionamento **per area** dei triangoli, reticolo deterministico
- `detectFloorLevels`, `kmeansCluster`, `clusterWidths` (PCA), `nearestNeighborOrder`
- **Riconoscimento della segnaletica orizzontale** — vedi §6, è il punto chiave
- `classifyEnvironment` — dichiara il tipo di ambiente dalle misure e sceglie la strategia **[D]**
- `TopologyAnalyzer` (Python) — stessa cosa lato server, con trimesh

### Comportamento agenti ✅
- `HumanAgent` — decisione per dominio (aeroporto / museo / gaming), stress, contagio sociale
  (Social Force Model), coesione di gruppo, panico per contagio
- **Mappa cognitiva** — l'agente ricorda visibilità e comfort di ogni zona attraversata, e
  rientrandoci alza la propria avversione al rischio **[V]**
- `start_delay` — partenze sfasate; senza, gli agenti avanzano in blocco

### Navigazione 🟡
- `buildZoneGraph`, `dijkstra`, `findRoute`, `lineHasSupport` (blocco 2) — aggiramento ostacoli
  **fra una zona e l'altra**
- `veritasSnapToFloor` + infittimento a 2,5 m nel ponte Python **[V]**
- ❌ **manca la collisione vera** sul tratto percorso — vedi §7

### Ragionamento semantico 🟡
- `veritas_normative.js` — 3 framework × 19 soglie, con citazione della fonte
- `veritas_esodo.js` — lunghezza reale del percorso di fuga
- `recommendations.py` + `benchmarks.json` — KPI → raccomandazioni con valore economico
- Interpretazione della percezione in `engine.py`: `isolated_low_visibility`, `limited_visibility`,
  `open_sightlines`, `crowded_perception`
- ❌ **manca la lettura del flusso progettato** — vedi §6

### Visione ✅ (geometrica) / ❌ (semantica per immagine)
- **Vista in prima persona** — `captureFOV` nel blocco 6: uno scatto per zona attraversata,
  miniatura 320×180, camera orientata secondo la direzione di marcia **[V] codice, 🟡 a schermo**
- **Sagoma dell'isovista** — pianta reale dai 32 raggi, due quote sovrapposte **[V]**
- ❌ nessun modello di visione: il riconoscimento è geometrico. **È una scelta, non una lacuna** —
  vedi §8.

### Simulazione ✅
- `SimulationEngine` — tick a `dt`, KPI reali, traiettoria animata, emergenze
- **OpenSky** — la distribuzione delle partenze viene dagli orari di atterraggio reali, con
  finestra di punta di 2 h. 18 verifiche, passano **[V]**
- Generatore JS locale come fallback quando il backend non risponde

### Reporting ✅
- Report percezione nel viewer (blocco 6) — grafici SVG, mappe cognitive, comfort per zona,
  viste in prima persona, sagome. **Dichiara la provenienza dei dati** (`perception_source`) **[V]**
- `report_builder.py` — versione HTML lato server
- Report KPI + raccomandazioni nativo (`#veritas-report-btn`)
- ❌ nessun export PDF

### Integrazione AI 🟡
- `veritas_llm.js` — ponte verso un **modello locale** (LM Studio, `http://localhost:1234/v1`).
  Traduce frasi in comandi già esistenti; **non calcola e non esegue**. Nessun costo a runtime.
- Console comandi a regole nel blocco 6 (nessun LLM richiesto)
- `window.__veritasCommandExtensions` — punto di estensione per nuovi comandi

---

## 6. 🔑 Il punto chiave: il flusso è già progettato nel modello

Raffaella disegna la circolazione **dentro il modello**, con frecce colorate — verdi, gialle e rosa —
modellate come **piani orizzontali sollevati ~20 cm dal pavimento**.

### Cosa esiste già — **[V]**

In `index.html` blocco 2 c'è **una regola di riconoscimento della segnaletica orizzontale**, scritta
apposta per queste mesh, e **geometrica, non per nome** (scelta esplicita: un elenco di parole
sarebbe la stessa trappola già pagata coi pannelli cercati per testo italiano):

```
DECAL_SPESSORE_MAX  = 0.05   // mesh piatta, non un gradino
DECAL_STACCO_MAX    = 0.15   // 15 cm sopra l'ospite: oltre e' un podio
DECAL_RAPPORTO_AREA = 4      // l'ospite dev'essere 4x piu' esteso e contenerla in pianta
```

Le placche riconosciute **non vengono buttate**: vengono *abbassate* alla quota del pavimento —
giusto, perché sulla segnaletica ci si cammina. Ha i suoi test (`veritas_segnaletica.test.mjs`,
che estraggono la regola da `index.html` invece di ricopiarla), e **passano** **[V]**.

### I due problemi, entrambi piccoli

1. **La soglia è 15 cm, le frecce di Raffaella stanno a ~20 cm.** Non vengono riconosciute: restano
   superfici a sé, definiscono una quota propria, inquinano la nuvola navigabile e le zone si
   posano sopra. **È esattamente il sintomo osservato.** Da verificare misurando lo stacco reale sul
   suo modello — non da correggere alzando un numero a caso.

2. **L'informazione viene scartata.** La regola *appiattisce* le placche nel pavimento: dopo, sono
   punti anonimi. Ma nel momento in cui le riconosce ha in mano tutto quello che serve —
   posizione, impronta, asse lungo (**direzione**), e il materiale (**colore → famiglia di flusso**).
   Basta **conservare** ciò che trova, non aggiungere un rilevatore nuovo.

### ⚠️ Ma questa NON è la soluzione generale — vale solo per i GLB modellati così

Correzione del 12/08/2026. Avevo scritto che «questa è la strada e non richiede nessun modulo
nuovo». **È vero solo per questo modello**, e VERITAS è una piattaforma.

La regola lavora su **oggetti mesh**: in un Gaussian Splat non esistono, e in uno spazio scansionato
le frecce sono vernice complanare al pavimento, senza alcuna firma geometrica. `DECAL_STACCO_MAX`
è tarato su una convenzione di modellazione, non su una legge dello spazio.

Quindi: **tarare la soglia risolve il sintomo di oggi** (zone posate sopra la segnaletica, quote
sbagliate) ed è utile farlo, ma **non è leggere il flusso**. Per quello serve vedere — §8.

---

## 7. Lacune reali, in ordine di valore

| # | Lacuna | Perché conta | Esiste qualcosa da riusare? |
|---|---|---|---|
| 1 | ❗ **Il sistema non VEDE** | è la capacità fondante, non un extra: è l'unica che vale su GLB *e* su splat *e* su scansione. Vedi §8. | 🟡 il renderer e `captureFOV` ci sono; manca la pianta ortografica e la lettura dell'immagine |
| 2 | ❗ **Gaussian Splat fermo** | metà degli ingressi della piattaforma non si apre. **Percorso critico**, non minore. | Spark 2.1.0 è già nell'importmap; serve alzare three ≥ 0.180 **e** three-mesh-bvh ≥ 0.8 insieme (tocca blocchi 5,6,7,8) |
| 3 | **Flusso progettato scartato** | le zone restano grumi di geometria, non le tappe progettate | dipende da 1: sul GLB la regola decal aiuta, ma **non generalizza** |
| 4 | **Collisione coi muri** | un agente che attraversa una parete rende non credibile ogni numero | 🟡 `lineHasSupport` esiste ma vale solo fra zone; three-mesh-bvh è già patchato |
| 5 | **Animazioni di flusso** | richiesto esplicitamente, mai fatto | 🟡 `veritas_visuale.js` fa già particelle su gradiente |
| 6 | Frecce a 20 cm non riconosciute sul GLB | sintomo visibile oggi: zone posate sopra la segnaletica | ✅ regola decal, ma è **una taratura, non una soluzione** — vale solo per i GLB modellati così |
| 7 | Doppio Three.js | warning "Multiple instances" | stessa radice del 2 |
| 8 | Pannelli KPI sotto 1280 px | i selettori non intercettano il layout Tailwind in riga | — |
| 9 | Export PDF | — | Chromium headless è preinstallato in `/opt/pw-browsers` |
| 10 | Mappa cognitiva non persistita | vive solo dentro la simulazione | Supabase è già collegato |

---

## 8. Connettori ed estensioni: cosa c'è già, cosa serve davvero

**Connettori attivi in chat** — Adobe, Canva, Composio, Figma, Gamma, Gmail, Google Calendar,
Google Drive, Hugging Face, **Render**, Vercel.
**Non connessi:** Adobe Marketing, HyperFrames, Miro, Tripadvisor.

**Skill attive** rilevanti: `doc-coauthoring`, `skill-creator`, `mcp-builder`, `web-artifacts-builder`,
`pdf`, `xlsx`, `docx`, `pptx`, `canvas-design`, `theme-factory`, `algorithmic-art`.

### Verifica prima di aggiungere — conclusione

| Serve per | Basta ciò che c'è? |
|---|---|
| Leggere le frecce sul pavimento | ✅ **sì** — regola decal già presente e provata. Nessuna aggiunta. |
| Direzione del flusso | ✅ **sì** — asse lungo dell'impronta, PCA già usata in `clusterWidths` |
| Famiglie di flusso dal colore | ✅ **sì** — il materiale è leggibile da `mesh.material.color`, nessuna libreria |
| Collisione muri | ✅ **sì** — three-mesh-bvh è già nell'importmap e già patchato (blocco 5) |
| Animazioni di flusso | ✅ **sì** — `veritas_visuale.js` ha già le particelle su gradiente |
| Verificare Render senza uscire dalla chat | ✅ **sì** — connettore Render, già attivo **[V]** |
| Export PDF | ✅ **sì** — Chromium preinstallato + skill `pdf` |
| Persistere la mappa cognitiva | ✅ **sì** — Supabase già collegato per auth e progetti |
| Visione semantica per immagine | 🟡 Hugging Face è connesso, **ma non serve** — vedi sotto |

### ⚠️ Conclusione corretta il 12/08/2026 — la prima era sbagliata

**Prima avevo concluso: «non serve vedere, la geometria basta». È sbagliato**, e va lasciato
scritto perché è un ragionamento che si rifà da solo.

L'argomento che lo demolisce è il **Gaussian Splat**, che è un ingresso di prima classe di questa
piattaforma, non un extra:

- La regola della segnaletica (§6) lavora su **oggetti mesh**: spessore verticale, bounding box,
  «ospite più esteso che la contiene in pianta». **In una nuvola di gaussiane niente di tutto
  questo esiste.** Non c'è nessuna mesh da misurare.
- In uno spazio **scansionato dal vero** le frecce non sono piani sollevati: sono **vernice**,
  spessore zero, complanari al pavimento. Nessuna firma geometrica le distingue.
- La soglia `DECAL_STACCO_MAX = 0.15` è tarata su una convenzione di modellazione, non su una
  legge dello spazio. Un altro progettista le fa a 2 cm, o le disegna in texture, o le mappa
  con vertex color.

**VERITAS è una piattaforma, non un lettore di un modello.** Una regola che vale per il GLB di
oggi e non per lo splat di domani non è una capacità: è una taratura.

L'unica cosa che accomuna tutti gli ingressi — GLB modellato, splat da scansione, livello di gioco
— è che **le frecce si vedono diverse dal pavimento**. Colore e aspetto. Cioè: vedere.

### Come si vede, qui

Il punto di unione fra mesh e splat esiste già ed è il **renderer**: entrambi si disegnano a
schermo. Una **vista ortografica dall'alto** del piano di calpestio produce un'immagine in
entrambi i casi, e da lì il problema diventa di immagine — che è il livello a cui il segnale
esiste davvero.

La macchina per farlo è già stata scritta, senza rendersene conto: `captureFOV` (blocco 6)
posiziona una camera arbitraria, disegna nel renderer esistente e legge i pixel in un canvas.
Una pianta ortografica è la stessa cosa con un'altra camera.

Cosa fare dell'immagine è la **seconda** domanda, e ha due risposte che convivono:

| | cosa dà | costo | riproducibile |
|---|---|---|---|
| Segmentazione per colore (deterministica) | dove sono le frecce, di che famiglia, che direzione (asse principale) | zero | sì |
| Modello di visione | **cosa significano** — coda, attesa, uscita, senso di marcia | per chiamata | no |

La prima è misura e va sempre. La seconda aggiunge significato che nessuna geometria può dare, e
va usata dove serve il significato — dichiarando il costo, come prescritto da CLAUDE.md §8.6.

**Conseguenza sulle priorità:** se lo splat è un ingresso di prima classe, allora il suo blocco
(§7 punto 5: Spark richiede three ≥ r179, l'importmap fissa 0.171) **non è un problema minore** —
sta sul percorso critico, perché senza splat funzionante metà degli ingressi non si può nemmeno
guardare.

---

## 8-bis. L'obiettivo: un'AI che VEDE, CAPISCE, SA e REFERTA

> *«La nostra AI deve vedere e comprendere lo spazio e deve avere le conoscenze e le competenze
> per fare tutte le analisi e sviluppare i report.»* — Raffaella, 12/08/2026
>
> Questa è la specifica del prodotto. Le quattro parole sono quattro strati, e vanno tenute
> distinte: confonderle è ciò che ha prodotto finora un sistema che misura bene e capisce poco.

### Il pattern giusto è già nel codice — **[V]**

`veritas_visibility.js` risolve già il problema degli ingressi diversi, e lo risolve bene:

```
occludersFromMesh(root)  ─┐
                          ├─→  occluders  ─→  griglia  ─→  isovist / LOS / intervisibilità
occludersFromSplat(root) ─┘        (intermedio comune, indipendente dalla sorgente)
```

**Due adattatori, un intermedio, il resto del modulo non sa da dove vengano i dati.** È il pattern
da estendere a tutto. Non va inventato: va applicato dove manca.

### Dove il pattern c'è e dove no — **[V]**

| Canale | Intermedio comune | GLB | Splat | Stato |
|---|---|---|---|---|
| Navigabilità | `points` (nuvola) | `extractNavigablePoints` | `extractSplatPoints` | ✅ generalizza |
| Occlusione / visibilità | `occluders` → griglia | `occludersFromMesh` | `occludersFromSplat` | ✅ generalizza |
| **Isovista** | — | `veritasComputeIsovist` (raycast mesh) | ❌ **niente** | ❌ **duplicato e mesh-only** |
| **Apparenza (colore)** | — | ❌ | ❌ | ❌ **il canale che manca del tutto** |

⚠️ **`veritasComputeIsovist` (blocco 2, scritto il 12/08/2026) è un duplicato da rimuovere.**
`window.__veritasPerception.isovist(pos, opts)` esisteva già, restituisce area, perimetro e
**compattezza**, e funziona su entrambe le sorgenti. Il duplicato raycasta `__veritasModelRoot`:
su uno splat non colpisce nulla e risponde «orizzonte completamente aperto» ovunque — sbagliato,
e in silenzio. Va sostituito con la chiamata al modulo esistente, conservando solo l'aggiunta
utile: le due altezze occhio e i raggi grezzi per disegnare la sagoma.

### ❗ Il canale che manca: l'apparenza

Nessuno strato oggi legge **il colore**. Ed è l'unico segnale che sopravvive a tutti gli ingressi:
le frecce sul pavimento si vedono diverse, su un GLB come su una scansione.

Serve un terzo intermedio comune, accanto a `points` e `occluders`:

```
apparenzaDaMesh(root)   ─┐
                         ├─→  campioni {x, z, colore, quota}  ─→  segmentazione → elementi visti
apparenzaDaSplat(root)  ─┘
```

Con un'inversione da notare: **su uno splat il colore è nativo** — una gaussiana *è* un punto
colorato, il dato c'è già ed è quello che il modulo splat estrae per la nuvola. È il **GLB** a
richiedere lavoro: colore del materiale, vertex color, o campionamento della texture.

E il renderer è il secondo punto di unione: una **pianta ortografica dall'alto** produce
un'immagine per entrambe le sorgenti. La macchina esiste già — `captureFOV` (blocco 6) piazza una
camera arbitraria, disegna e legge i pixel; una pianta è la stessa cosa con una camera ortografica.

### I quattro strati: cosa c'è, cosa manca

| Strato | Cosa deve fare | Cosa c'è già | Cosa manca |
|---|---|---|---|
| **1. VEDERE** | rilevare, da qualunque ingresso, senza metadati | navigabilità ✅, occlusione ✅, isovista 🟡 (mesh), pianta ortografica ❌ | **canale apparenza/colore**, pianta ortografica, isovista unificata |
| **2. CAPIRE** | dire *cosa* è ciò che vede | `classifyEnvironment` (tipo di ambiente dalle misure), interpretazioni della percezione in `engine.py` | riconoscimento degli **elementi** (freccia, coda, soglia, seduta), lettura del **flusso**, attribuzione di **funzione** alle zone |
| **3. SAPERE** | competenza di dominio, con fonte | **il pezzo più forte già oggi**: `veritas_normative.js` 3 framework × 19 soglie citate, `veritas_esodo.js`, `compliance.py`, `benchmarks.json`, `recommendations.py` | è alimentato **solo da misure**. Sa dire «questo varco è 1,1 m, sotto soglia», non «qui si forma la coda, quindi quel 1,1 m pesa di più» |
| **4. REFERTARE** | analisi e report vendibili | KPI reali, report percezione, raccomandazioni con valore economico, verdetti sul modello | sintesi che leghi visto + capito + norma, ed export PDF |

### La lacuna strutturale: manca un modello dello spazio

I quattro strati non condividono **niente**. Si scambiano globali (`window.__veritas*`), non una
rappresentazione. Ecco perché il sistema *sembra* slegato: lo è davvero, ma non per mancanza di
funzioni — per mancanza di **un oggetto comune** su cui scriverle.

Il principio *Single Source of Truth* di `CONTEXT.md` è applicato al codice; va applicato **allo
spazio**:

```
ModelloSpaziale {
  sorgente        "glb" | "splat" | "scan"
  livelli         [{ quota, piantaOrtografica, grigliaNavigabile, occluders }]
  elementiVisti   [{ poligono, colore, asseLungo, tipo, confidenza,
                     origine: "colore" | "geometria" | "modello" }]
  zone            [{ poligono, area, larghezze, isovista, funzione, confidenza }]
  flussi          [{ sequenzaZone, famiglia, origine: "disegnato" | "dedotto" }]
  verdetti        [{ norma, soglia, misurato, esito, fonteCitata }]
}
```

Ogni strato **legge e scrive qui**. Il report non ricostruisce niente: descrive questo oggetto.
E ogni voce porta `origine` e `confidenza`, così un dato misurato non si confonde mai con uno
dedotto o con uno proposto da un modello — la stessa disciplina già adottata con
`perception_source`.

### Dove serve davvero un modello di visione

Non per **trovare** le frecce: colore, forma allungata e posizione sul calpestio bastano, sono
misura e vanno sempre.

Serve per **capire cosa significano** — che quella è una coda e non un corridoio, che quel verso
va verso l'imbarco, che quella seduta è un'area di attesa. È significato, e nessuna geometria lo
contiene. Va usato lì, dichiarando il costo (CLAUDE.md §8.6), e ciò che produce va marcato
`origine: "modello"` e `confidenza`, mai confuso con una misura.

---

## 9. Errori documentali accertati — non ripercorrerli

| Dove | Cosa dice | Realtà **[V]** |
|---|---|---|
| CLAUDE.md §12.1 | l'analisi geometrica è lanciata "asincrona da una fonte sconosciuta"; le 5 zone vengono "dai nomi delle mesh" | **Falso entrambi.** È `analyzeMesh` a lanciarla, sincrono, e poi a comprimere le 7 zone misurate nelle sue 5 tappe fisse (`order2`). Il 5 è la lunghezza di quell'elenco. Corretto in `9cb5035`. Il messaggio `"ripiego sui nomi"` descrive una cosa che non accade ed è ciò che ha mandato fuori strada. |
| CLAUDE.md §2 | `Assets/core/` contiene anche `zones.py` | non esiste |
| CLAUDE.md §11.5 | `vaio_module_v2.js`, `vaio_splat_module.js` sono file | non esistono, sono inlinati (blocchi 6 e 7) |
| CLAUDE.md §11.1 | i blocchi sono 10 | sono **14** |
| CONTEXT.md | `/core/engine.py`, `/data/simulation_config.json` | `core/` e `data/` in radice non esistono; il Core è in `Assets/core/` |

---

## 10. Prove: stato reale — **[V]**

**13 su 13 passano.** Eseguite tutte in questa sessione.

```
JS      esodo · flights · floor · llm · normative · perception
        scala · segnaletica · visuale · zone
Python  test_perception_loop · test_multi_agent_perception · veritas_opensky
```

`veritas_opensky.test.py` era rotto: stub-a i moduli del Core per importare `api_server` senza
numpy/trimesh, e l'aggiunta di `core.report_builder` fra gli import di `api_server` non era stata
riflessa nella lista degli stub. Corretto. Richiede `pip install httpx`.

I test JS **estraggono il codice da `index.html`** invece di ricopiarlo (`veritas_segnaletica`,
`veritas_flights`, `veritas_zone`): se sposti o rinomini una funzione ancorata, falliscono dicendo
che l'ancora non c'è. È voluto.

---

## 11. Ricette di verifica

### Blocco 3 intatto — dopo **ogni** modifica a `index.html`

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
assert hashlib.sha256(p.s[3].encode()).hexdigest()[:16]=='eedd9935ea908fd3', 'BLOCCO 3 ALTERATO'
assert len(p.s)==14, 'numero blocchi cambiato: %d' % len(p.s)
print('ok')
```

Poi `node --check` sui blocchi modificati (i moduli ES vanno copiati in `.mjs`).

### Core Python senza Render

```bash
pip install numpy trimesh scikit-learn
PYTHONPATH=Assets python3 -c "from core.engine import SimulationEngine; ..."
```

### Stato del deploy

Connettore Render (`workspaceId tea-d9r2r1iju40c73e4k2cg`, servizio `srv-d9r2tmss728c73ct1c80`),
oppure aprire `/health` nel browser. **Da questa sandbox `curl` verso `onrender.com` dà 403**: è il
proxy, non il servizio.

### Banco di prova headless

CDN spesso irraggiungibili: `npm install three@0.171.0 three-mesh-bvh@0.7.8 @supabase/supabase-js
@sparkjsdev/spark --legacy-peer-deps`, copia i build in `vendor/`, riscrivi l'importmap su percorsi
locali, stub per supabase, `python3 -m http.server`, pilota con Playwright.
⚠️ `three.module.js` importa `three.core.js`: copia **tutta** la cartella `build/`.
Chromium è in `/opt/pw-browsers`, Playwright va installato con `npm install playwright`.

---

## 12. Le regole che non si violano

1. **Il blocco 3 non si tocca.** Verifica byte-per-byte dopo ogni modifica.
2. **Mai push su `main` senza approvazione**, eccetto i file Python per Render.
3. **Per i blocchi `<script>` usa `html.parser`, mai regex.**
4. **Verifica prima di assumere.** Questa mappa contiene cinque errori documentali trovati proprio
   perché sono stati verificati invece che creduti.
5. **Rule of Three:** ogni feature deve reggere gaming, museo, aeroporto.
6. **Non duplicare.** Prima di scrivere qualcosa, cercalo: la regola della segnaletica esisteva già
   e stava per essere riscritta da zero.
