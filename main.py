import json
import tkinter as tk
from tkinter import filedialog
from core.engine import SimulationEngine
from core.topology_analyzer import TopologyAnalyzer

# --- CONFIGURAZIONE ---
# Questa è la variabile che punta alla tua nuova versione dell'interfaccia
HTML_TEMPLATE_PATH = "data/V17_con_agente_server_2.html"

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
        print("Nessun file selezionato. Chiusura.")
        exit()
    return file_path

def main():
    model_path = get_file_path()
    graph_path = "data/navigation_graph.json"

    print("=== AVVIO SISTEMA VERITAS-SPATIAL-AI ===")
    print(f"Interfaccia configurata: {HTML_TEMPLATE_PATH}")
    
    # --- FASE 1: Analisi Topologica ---
    print("Analisi automatica topologia in corso...")
    analyzer = TopologyAnalyzer(model_path)
    analyzer.analyze_model()
    
    # Visualizzazione 3D (Si apre la finestra)
    print("Apertura visualizzatore 3D...")
    analyzer.mesh.show() 
    
    # Estraiamo i nodi
    nav_nodes = analyzer.get_navigable_zones(num_clusters=10)
    print(f"Topologia estratta: identificati {len(nav_nodes)} nodi.")

    # --- FASE 2: Inizializzazione Motore ---
    engine = SimulationEngine(graph_path=graph_path)

    # --- FASE 3: Aggiunta Agenti ---
    profile_data = {'patience': 0.8, 'risk_aversion': 0.2, 'social_factor': 0.5, 'base_speed': 1.2}

    engine.add_agent(
        agent_id="test_user_01", 
        profile_id="visitor_standard", 
        profile_data=profile_data
    )
    
    # --- FASE 4: Esecuzione ---
    print("Esecuzione tick simulazione...")
    engine.run_tick()

    # --- FASE 5: Esportazione ---
    state = engine.export_state()
    with open("simulation_output.json", "w") as f:
        f.write(state)
    print("\nSalvataggio completato: 'simulation_output.json'")

if __name__ == "__main__":
    main()