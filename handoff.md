# Progetto: Veritas Spatial AI - Handoff Document

## 1. Descrizione del Progetto
**Veritas-spatial-ai** è un motore di simulazione per il flusso pedonale basato su grafi spaziali. L'obiettivo è mappare nodi (posizioni) e archi (percorsi) per analizzare il comportamento degli agenti in ambienti complessi.

## 2. Struttura del Repository
*   `/core/`: Contiene il motore di simulazione (`SimulationEngine`).
*   `/data/`: Contiene i grafi di navigazione (`navigation_graph.json`).
*   `main.py`: Script di avvio che esegue la simulazione ed esporta i dati.
*   `visualizzatore.html`: Dashboard front-end che visualizza la mappa e gli agenti in tempo reale.
*   `dati_simulazione.json`: File generato automaticamente dal motore con lo stato corrente.

## 3. Setup & Esecuzione
### Requisiti
*   Python 3.x
*   Editor: Visual Studio Code

### Come avviare la simulazione
1. Aprire il terminale nella directory principale.
2. Eseguire il comando:
   ```bash
   python main.py
   ```

---

## 0. 🔴 RAPIER3D — PROSSIMO PASSO (20/08/2026)

> **Richiesto da Raffaella il 20/08/2026** — gli agenti attraversano muri, solai e fluttuano. Serve un motore fisico per il corpo, non euristica sulle dichiarazioni.

### Piano di implementazione

**Strumento**: `@dimforge/rapier3d-compat` (WebAssembly, Apache-2.0, già usato da three.js)

**Cosa implementare**:
1. **Collisore trimesh della geometria** — costruito UNA VOLTA dal modello caricato (GLB/IFC/altro), indipendente dal formato
2. **Capsula per ogni agente** — raggio 0.30m, altezza 2.00m (dati già in `veritas_navmesh.js` §17)
3. **KinematicCharacterController** — usa la navmesh per DOVE andare, Rapier per COME il corpo ci va (non attraversa, non fluttua)
   - `ColliderDesc.capsule(2.0, 0.30)` → corpo che collide
   - `ColliderDesc.trimesh(vertices, indices)` → edificio vero
   - `enableSnapToGround(0.1)` → appoggiato al pavimento
   - `enableAutostep(0.18, 0.40, true)` → sale gli scalini
   - `setMaxSlopeClimbAngle(45°)` → non cammina sulle pareti
4. **Generatore traiettorie**: smette di scrivere **posizioni**, comincia a scrivere **direzioni**; il controller decide dove il corpo finisce davvero
5. **Test**: `banco/dentro.mjs` — zero posizioni dentro solidi su modelli diversi

**Misure da usare** (già dichiarate):
| Misura | Valore | Da |
|---|---|---|
| Raggio capsula | 0.30 m | Ellisse Fruin (corpo umano medio) |
| Altezza capsula | 2.00 m | Altezza libera minima |
| Alzata scalino | 0.18 m | Norma DM 236/89 (max 17–18 cm) |
| Pedata scalino | 0.40 m | Norma DM 236/89 |
| Pendenza max | 35° | Scala comune |

**Attenzione**:
- ⚠️ Navmesh (navcat) NON si butta — fa due mestieri diversi e vanno insieme:
  - navcat → DOVE andare (percorso, pianificazione)
  - Rapier → COME ci si va (corpo, nessuno attraversa niente)
- ⚠️ Costo computazionale: 28 capsule × ~800 fotogrammi = calcolo vero, va misurato prima di prometterlo
- ⚠️ Non toccare il bundle minificato `index.html` (Blocco 3) — usare solo gli hook `window.__veritas*` esposti

**Branch**: `claude/rapier3d-integration` (creato da questa sessione, non `main` finché non ok esplicito di Raffaella)

**Commit checklist**:
- [ ] Package.json: aggiungere `@dimforge/rapier3d-compat` all'importmap
- [ ] Nuovo modulo `veritas_physics.js` — wrapper Rapier, espone `initPhysics(geometry)`, `stepAgent(id, direction, dt)`
- [ ] Aggiornare `generateTrajectory()` in `veritas_perception.js` — chiama controller Rapier invece di interpolare posizioni
- [ ] Modifica minima nel bundle: esporre `window.__veritasWorldPhysics` per test
- [ ] Test: `node banco/dentro.test.mjs` passa su 2+ modelli diversi
- [ ] Documentare in CLAUDE.md §20 (new) le equazioni di stato del controller

---

## Riferimenti completezza

**PROJECT_INFO.md** (45KB) — storia completa delle sessioni precedenti, stato attuale, bug aperti, roadmap
**CLAUDE.md** — contesto di progetto, convenzioni, regole di disciplina
