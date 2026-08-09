# VERITAS — Agentic Spatial Simulation Platform
### Design Brief / North Star — redesign UI+prodotto
*Salvato il 2026-08-09, su richiesta diretta dell'utente ("crei un file dove ti spieghi come si deve comportare, così andiamo sul fresco"). Questo file è la memoria persistente del progetto per le prossime sessioni.*

---

## 1. Cos'è il prodotto

VERITAS non è un software CAD né una dashboard. È una **Agentic Spatial Simulation Platform**: l'utente carica un modello 3D di uno spazio (aeroporto, museo, ambiente gaming, struttura complessa), il sistema lo interpreta come ambiente navigabile, e un'**AI residente nella scena** aiuta a identificare zone, configurare agenti, lanciare simulazioni di comportamento e produrre report.

Target: studi tecnici, architetti/ingegneri, aziende gaming, organizzazioni che devono testare/validare comportamenti agentici in ambienti 3D.

Use case iniziali: aeroporti, musei, ambienti gaming, strutture complesse. Architettura pensata fin dall'inizio per estendersi a digital twin / dati geospaziali (Google Maps Tiles, Cesium, altri layer 3D).

## 2. Paradigma di interazione

**L'AI è il principale punto di interazione**, non un pannello accessorio. L'utente dialoga con l'AI in linguaggio naturale (multilingua):

- "Identifica tutte le aree di attesa."
- "Simula 500 visitatori che entrano dall'ingresso principale."
- "Trova i punti di congestione."
- "Modifica questa zona e trasformala in area di controllo."
- "Crea un percorso alternativo."

L'AI supporta anche un linguaggio CAD 3D semplificato: le zone si possono creare, rinominare, ridimensionare, unire, dividere, riconfigurare, associare a comportamenti — sempre tramite comando naturale, non tramite form pesanti.

L'AI si auto-segmenta/auto-etichetta l'ambiente PRIMA che l'utente intervenga (comportamento già presente nel motore attuale: `analyzeMesh`/`runStructuralAnalysis`).

## 3. Architettura agentica

```
Environment → Spatial AI → Agent Core → Agent Skin → Simulation → Analysis → Report
```

- **Agent Core**: comportamento umano generalizzato e riutilizzabile (velocità, ingombro, evitamento ostacoli, pathfinding). Non cambia tra ambienti.
- **Agent Skin / Behaviour Profile**: specializzazione per scenario — passeggero aeroportuale, visitatore museo, NPC gaming, operatore, cliente. Il core non si riscrive mai; si aggiunge/scambia lo skin.

*(Nota implementativa: gli `ARCHETYPES` già esistenti nel motore — business/family/elderly/wheelchair/tourist/... — sono un primo abbozzo di Agent Skin. Vanno formalizzati come layer separato dal core di movimento.)*

## 4. Spatial Intelligence (già in gran parte costruita)

L'AI deve leggere/interpretare la mesh, capire geometrie/ostacoli/passaggi, identificare zone funzionali, costruire una rappresentazione semantica dello spazio, generare pathfinding, muovere gli agenti in modo realistico, distinguere aree/destinazioni/vincoli/punti di interesse. Le zone identificate devono restare visualizzabili e modificabili dall'utente.

Stato attuale: raycast reale contro la mesh (niente più punti sospesi), filtro a bande d'altezza per isolare il vero pavimento da muri/pilastri/arredi, clustering KMeans + rilevamento corridoi, generatore di traiettorie con evitamento ostacoli (JS) + motore fisico reale su backend Python (Social Force Model, Render) con fallback automatico.

## 5. Simulation Engine

Parametri configurabili: numero agenti, tipologia, comportamento, obiettivi, ingressi/uscite, densità, durata, condizioni ambientali, eventi/anomalie.

L'interfaccia deve rendere evidente: **scenario → agenti → ambiente → comportamento → risultato**, e permettere di osservare il comportamento nella scena 3D mentre gira.

## 6. Analytics & Reporting

A fine simulazione: congestion point, bottleneck, tempi di percorrenza, flussi, densità, anomalie, collisioni/interferenze, aree sotto/sovra-utilizzate, efficienza percorsi, comportamento agenti.

Ogni simulazione produce un **Simulation Report** leggibile anche da chi non ha seguito la sessione: scenario, configurazione, agenti, risultati, criticità, metriche, visualizzazioni, conclusioni, raccomandazioni AI.

*(Non ancora implementato — fase futura esplicita.)*

## 7. UI/UX — regole ferree

Schermata dominata dal **3D viewport**. Elementi ammessi, tutti minimi:

1. **AI Console / Chat** — interazione con l'AI residente (elemento primario)
2. **3D Viewport** — ambiente + agenti
3. **Simulation Controls** — play/pause/reset/speed, sottile
4. **Spatial Layers** — toggle zone/navigazione/agenti/heatmap/flussi
5. **Analysis/Report** — risultati, compare solo a fine simulazione
6. **Status indicator minimale** — stato sistema/backend

Tutto il resto **compare contestualmente**, solo quando serve (es. pannello dettaglio zona appare solo se una zona è selezionata — non un sidebar CAD sempre aperto).

Da evitare esplicitamente: sidebar enormi, dashboard enterprise, decine di pulsanti, card inutili, gradienti eccessivi, estetica "gaming dashboard", UI decorativa senza funzione.

## 8. Linguaggio visivo

Ispirazione: prodotto Apple / Meta, ma con identità propria. CAD 3D semplificato ma non tradizionale. Deve comunicare precisione, spatial computing, AI, professional engineering tool.

Feeling: **minimal / spatial / intelligent / precise / cinematic / professional**.

## 9. Workflow che l'utente deve percepire senza spiegazioni

```
Upload modello 3D → AI capisce lo spazio → AI identifica le zone →
Utente parla con l'AI → Configura agenti → Avvia simulazione →
Osserva il comportamento spaziale → Analizza → Genera report
```

## 10. Priorità assolute (in ordine)

1. Chiarezza
2. Semplicità
3. Interazione AI-first
4. Comprensione spaziale
5. Simulazione
6. Analisi
7. Scalabilità futura

## 11. Principio fondamentale

Non è "una dashboard più bella". È la prima interfaccia di un **sistema operativo per la simulazione agentica dello spazio**.

---

## Nota tecnica per continuità tra sessioni

Il motore di simulazione (raycast/mesh-snap, filtro pavimento, clustering zone, generatore traiettorie, bridge backend Python) è **già scritto, testato e verificato** dentro `Veritas-V17-FIX-SOLO-BUG.html` (repo `Raffaella23/Veritas-spatial-ai`). Il redesign descritto in questo brief riguarda **il guscio/presentazione (UI)**, non il motore: si costruisce un nuovo file HTML che porta questo brief a UI, riusando le funzioni del motore già provate (non riscrivendole da zero).
