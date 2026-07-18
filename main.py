import json
import os
import requests  # Necessario per OpenSky API
from core.engine import SpatialSimulation

def fetch_opensky_data(icao_code):
    """TASK 1: Recupero dati voli da OpenSky"""
    url = f"https://opensky-network.org/api/states/all?airport={icao_code}"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            return response.json().get('states', [])
        return []
    except Exception as e:
        print(f"Errore API OpenSky: {e}")
        return []

def main():
    print("--- Avvio Simulazione V17 ---")
    
    # 1. Caricamento Configurazione (TASK 4: JSON Unico)
    if not os.path.exists('config.json'):
        print("[ERRORE] config.json non trovato!")
        return

    with open('config.json', 'r') as f:
        config = json.load(f)
    
    # 2. Inizializzazione dati
    voli_attivi = fetch_opensky_data(config['voli']['codice_icao'])
    
    # Calcolo passeggeri stimati (TASK 1.2)
    # Assumiamo struttura OpenSky: indice 13 è capacity (se disponibile) o dato fittizio
    sim = SpatialSimulation()
    
    # Task 1.3/1.4: Integrazione voli nel motore
    for volo in voli_attivi:
        # Logica: n_posti * 0.8 load_factor (placeholder 180 posti standard)
        pax_totali = int(180 * 0.8) 
        ritardo = 20 # Esempio logica ritardo
        
        sim.add_flight_event({
            "volo": volo[1], 
            "pax": pax_totali,
            "ritardo": True if ritardo > 15 else False
        })

    # 3. Esecuzione Simulazione
    results = sim.run_ticks(num_ticks=5)

    # 4. Creazione Report Integrato (TASK 2 e 3)
    # Strutturiamo il report per la visualizzazione (Layering)
    report = {
        "metadata": {
            "version": "1.7",
            "status": "completed",
            "timestamp_run": "2026-07-18"
        },
        "scene": {
            "root_group": {
                "aeroporto": config["aeroporto"]["nome"],
                "hotspots": config.get("hotspots", []), # TASK 2: Hotspot nel report
                "passeggeri": results.get("agents", [])
            }
        },
        "compliance_logs": results.get("compliance_logs", [])
    }

    # 5. Output e Salvataggio
    print("--- Report Finale V17 Generato ---")
    
    output_filename = "report_simulazione_v17.json"
    try:
        with open(output_filename, 'w') as f:
            json.dump(report, f, indent=4)
        print(f"[INFO] Report salvato correttamente in: {output_filename}")
    except Exception as e:
        print(f"[ERRORE] Impossibile salvare il file: {e}")

if __name__ == "__main__":
    main()
