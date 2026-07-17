import json
import os
from core.engine import SpatialSimulation  # Assumendo la struttura core che abbiamo definito

def main():
    # 1. Inizializzazione del motore
    print("--- Avvio Simulazione V13 ---")
    sim = SpatialSimulation()
    
    # 2. Esecuzione dei tick
    # Eseguiamo la simulazione per mappare i movimenti
    results = sim.run_ticks(num_ticks=5)
    
    # 3. Creazione del Report (La parte che genera il JSON)
    report = {
        "metadata": {
            "version": "1.3",
            "status": "completed"
        },
        "agents": results.get("agents", []),
        "compliance_logs": results.get("compliance_logs", [])
    }
    
    # 4. Output a Terminale (per controllo immediato)
    print("--- Report Finale Enriched JSON ---")
    print(json.dumps(report, indent=4))
    
    # 5. Export su file (Il punto che ti serve per la visualizzazione)
    # Questo file verrà letto dalla tua dashboard HTML o da altri tool
    output_filename = "report_simulazione.json"
    try:
        with open(output_filename, 'w') as f:
            json.dump(report, f, indent=4)
        print(f"\n[INFO] Report salvato correttamente in: {output_filename}")
    except Exception as e:
        print(f"\n[ERRORE] Impossibile salvare il file: {e}")

if __name__ == "__main__":
    main()
