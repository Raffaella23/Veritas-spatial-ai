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
