import sys
import os

# --- Fix percorsi Python: rende visibile la cartella Assets come sorgente dei moduli ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "Assets")

if ASSETS_DIR not in sys.path:
    sys.path.insert(0, ASSETS_DIR)
# --- Fine fix percorsi ---

import json
import random
import webbrowser
import requests
import tkinter as tk
from tkinter import filedialog
from core.engine import SimulationEngine
from core.topology_analyzer import TopologyAnalyzer

# Gli stessi 7 archetipi di viaggiatore gia' validati nel viewer, cosi' il Core
# produce una popolazione eterogenea invece di agenti identici.
ARCHETYPES = [
    {"id": "business",        "weight": 35, "patience": 0.2,  "risk_aversion": 0.3, "social_factor": 0.1,  "base_speed": 1.6},
    {"id": "tourist_family",  "weight": 25, "patience": 0.7,  "risk_aversion": 0.5, "social_factor": 0.8,  "base_speed": 1.05},
    {"id": "pmr",             "weight": 8,  "patience": 0.6,  "risk_aversion": 0.7, "social_factor": 0.3,  "base_speed": 0.6},
    {"id": "elderly",         "weight": 10, "patience": 0.8,  "risk_aversion": 0.8, "social_factor": 0.4,  "base_speed": 0.7},
    {"id": "tour_group",      "weight": 7,  "patience": 0.6,  "risk_aversion": 0.4, "social_factor": 0.95, "base_speed": 0.95},
    {"id": "staff",           "weight": 10, "patience": 0.5,  "risk_aversion": 0.2, "social_factor": 0.2,  "base_speed": 1.3},
    {"id": "stressed_late",   "weight": 5,  "patience": 0.05, "risk_aversion": 0.1, "social_factor": 0.05, "base_speed": 2.1},
]

# Archetipi abbastanza socievoli da formare gruppi coesi (famiglie, comitive).
GROUP_FORMING_ARCHETYPES = {"tourist_family", "tour_group"}
GROUP_SIZE = 3

SIM_SECONDS = 180        # Durata della simulazione (in secondi simulati)
SIM_DOMAIN = "airport_security"  # Dominio corrente: aeroporto

# Bounding box reale attorno a Roma Fiumicino (LIRF), in coordinate WGS84.
# L'endpoint states/all di OpenSky NON supporta un parametro "airport": va
# interrogato con un riquadro geografico, come da documentazione ufficiale.
LIRF_BBOX = {"lamin": 41.65, "lomin": 12.05, "lamax": 41.95, "lomax": 12.45}

MIN_AGENTS = 15
MAX_AGENTS = 80
AGENTS_PER_FLIGHT = 4

CONFIG_PATH = os.path.join(BASE_DIR, "config.json")


def load_config():
    """Carica config.json (punti caldi reali, regole VVFF, dati aeroporto).
    Se assente, la simulazione prosegue comunque con i soli dati auto-rilevati."""
    if not os.path.exists(CONFIG_PATH):
        print("[Config] config.json non trovato: proseguo con la sola topologia auto-rilevata.")
        return {}
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def fetch_live_traffic(bbox: dict, timeout: float = 6.0):
    """
    Interroga l'API pubblica OpenSky Network per il traffico aereo reale
    nell'area indicata. Restituisce la lista di velivoli attualmente tracciati
    (puo' essere vuota in caso di errore, rate limit, o assenza di traffico:
    la simulazione deve funzionare comunque con un valore di default).
    """
    url = (
        "https://opensky-network.org/api/states/all"
        f"?lamin={bbox['lamin']}&lomin={bbox['lomin']}"
        f"&lamax={bbox['lamax']}&lomax={bbox['lomax']}"
    )
    try:
        response = requests.get(url, timeout=timeout)
        if response.status_code == 200:
            data = response.json()
            return data.get("states") or []
        print(f"[OpenSky] Risposta non valida (HTTP {response.status_code}). Uso popolazione di default.")
        return []
    except Exception as e:
        print(f"[OpenSky] Impossibile recuperare dati di traffico reale: {e}. Uso popolazione di default.")
        return []


def pick_archetype():
    weights = [a["weight"] for a in ARCHETYPES]
    return random.choices(ARCHETYPES, weights=weights, k=1)[0]


def get_file_path():
    """Apre una finestra di sistema per selezionare il file .glb"""
    root = tk.Tk()
    root.withdraw()

    file_path = filedialog.askopenfilename(
        title="Seleziona il modello 3D (.glb) per la simulazione",
        filetypes=[("GLB files", "*.glb"), ("All files", "*.*")]
    )

    root.destroy()

    if not file_path:
        print("Nessun file selezionato. Chiusura programma.")
        exit()

    return file_path


def main():
    config = load_config()
    hotspots = config.get("hotspots", [])
    vvff_rules = config.get("regole_vvff", [])

    model_path = get_file_path()
    graph_path = os.path.join(ASSETS_DIR, "data", "navigation_graph.json")
    html_path = os.path.join(BASE_DIR, "topology_debug.html")
    report_path = os.path.join(BASE_DIR, "kpi_report.json")

    print("=== AVVIO SISTEMA VERITAS-SPATIAL-AI ===")
    print(f"Modello caricato: {model_path}")

    print("Recupero traffico aereo reale (Roma Fiumicino - LIRF)...")
    voli_attivi = fetch_live_traffic(LIRF_BBOX)
    print(f"Velivoli attualmente tracciati nell'area: {len(voli_attivi)}")

    print("Analisi automatica topologia in corso...")

    analyzer = TopologyAnalyzer(model_path)
    analyzer.analyze_model()

    nav_nodes = analyzer.get_navigable_zones(num_clusters=10)
    print(f"Topologia estratta: identificati {len(nav_nodes)} nodi.")

    if not nav_nodes:
        print("Nessun nodo navigabile trovato. Impossibile proseguire con la simulazione.")
        return

    # Inietta i punti caldi reali dichiarati in config.json (gate, check-in, varchi)
    if hotspots:
        analyzer.inject_hotspots(hotspots)

    # Esporta il grafo appena calcolato: da qui in poi l'engine legge SEMPRE
    # l'analisi reale del modello appena caricato, non un file statico vecchio.
    analyzer.export_navigation_graph(graph_path)

    # Genera la finestra HTML di verifica visiva della topologia estratta.
    analyzer.export_visualization_html(html_path)

    engine = SimulationEngine(graph_path=graph_path, vvff_rules=vvff_rules)

    # La popolazione simulata e' proporzionale al traffico aereo reale del
    # momento (entro limiti ragionevoli), invece di essere sempre fissa a 30.
    num_agents = max(MIN_AGENTS, min(MAX_AGENTS, len(voli_attivi) * AGENTS_PER_FLIGHT))
    if not voli_attivi:
        num_agents = 30  # fallback se l'API non risponde

    print(f"Genero popolazione di {num_agents} agenti (dominio: {SIM_DOMAIN})...")
    group_counters = {}
    for i in range(num_agents):
        arch = pick_archetype()
        profile_data = {
            'patience': arch['patience'],
            'risk_aversion': arch['risk_aversion'],
            'social_factor': arch['social_factor'],
            'base_speed': arch['base_speed'],
        }

        group_id = None
        if arch['id'] in GROUP_FORMING_ARCHETYPES:
            count = group_counters.get(arch['id'], 0)
            group_id = f"{arch['id']}_grp_{count // GROUP_SIZE}"
            group_counters[arch['id']] = count + 1

        engine.add_agent(
            agent_id=f"{arch['id']}_{i:03d}",
            profile_id="visitor_standard",
            profile_data=profile_data,
            domain=SIM_DOMAIN,
            group_id=group_id,
        )

    ticks = int(SIM_SECONDS / engine.dt)
    print(f"Esecuzione simulazione estesa: {ticks} tick ({SIM_SECONDS}s simulati)...")
    for _ in range(ticks):
        engine.run_tick()

    state = engine.export_state()
    state_data = json.loads(state)
    state_data["live_traffic"] = {
        "aeroporto": config.get("aeroporto", {}).get("nome", "LIRF"),
        "velivoli_tracciati": len(voli_attivi),
        "agenti_generati": num_agents,
    }

    print("\n--- REPORT SINTETICO DI VIVIBILITA' ---")
    print(json.dumps(state_data["kpi_report"], indent=2, ensure_ascii=False))
    print("\n--- TRAFFICO REALE UTILIZZATO ---")
    print(json.dumps(state_data["live_traffic"], indent=2, ensure_ascii=False))

    with open("simulation_output.json", "w", encoding="utf-8") as f:
        json.dump(state_data, f, indent=2, ensure_ascii=False)

    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(state_data["kpi_report"], f, indent=2, ensure_ascii=False)

    print("\nSalvataggio completato: 'simulation_output.json' e 'kpi_report.json'")

    # Apre automaticamente la finestra HTML nel browser predefinito.
    webbrowser.open(f"file://{html_path}")


if __name__ == "__main__":
    main()
