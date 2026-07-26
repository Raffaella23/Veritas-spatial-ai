import sys
import os

# --- Fix percorsi Python: rende visibile la cartella Assets come sorgente dei moduli ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "Assets")

if ASSETS_DIR not in sys.path:
    sys.path.insert(0, ASSETS_DIR)
# --- Fine fix percorsi ---

import json
import webbrowser
import tkinter as tk
from tkinter import filedialog
from core.engine import SimulationEngine
from core.topology_analyzer import TopologyAnalyzer


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
    model_path = get_file_path()
    graph_path = os.path.join(ASSETS_DIR, "data", "navigation_graph.json")
    html_path = os.path.join(BASE_DIR, "topology_debug.html")

    print("=== AVVIO SISTEMA VERITAS-SPATIAL-AI ===")
    print(f"Modello caricato: {model_path}")
    print("Analisi automatica topologia in corso...")

    analyzer = TopologyAnalyzer(model_path)
    analyzer.analyze_model()

    nav_nodes = analyzer.get_navigable_zones(num_clusters=10)
    print(f"Topologia estratta: identificati {len(nav_nodes)} nodi.")

    if not nav_nodes:
        print("Nessun nodo navigabile trovato. Impossibile proseguire con la simulazione.")
        return

    # Esporta il grafo appena calcolato: da qui in poi l'engine legge SEMPRE
    # l'analisi reale del modello appena caricato, non un file statico vecchio.
    analyzer.export_navigation_graph(graph_path)

    # Genera la finestra HTML di verifica visiva della topologia estratta.
    analyzer.export_visualization_html(html_path)

    engine = SimulationEngine(graph_path=graph_path)

    profile_data = {
        'patience': 0.8,
        'risk_aversion': 0.2,
        'social_factor': 0.5,
        'base_speed': 1.2
    }
    engine.add_agent(
        agent_id="test_user_01",
        profile_id="visitor_standard",
        profile_data=profile_data
    )

    print("Esecuzione tick simulazione...")
    engine.run_tick()
    state = engine.export_state()

    print("\n--- Stato finale della simulazione (JSON) ---")
    print(state)

    with open("simulation_output.json", "w") as f:
        f.write(state)

    print("\nSalvataggio completato: 'simulation_output.json'")

    # Apre automaticamente la finestra HTML nel browser predefinito.
    webbrowser.open(f"file://{html_path}")


if __name__ == "__main__":
    main()
