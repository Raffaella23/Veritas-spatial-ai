import json
import tkinter as tk
from tkinter import filedialog
from core.engine import SimulationEngine
from core.topology_analyzer import TopologyAnalyzer

def get_file_path():
    """Apre una finestra di sistema per selezionare il file .glb"""
    root = tk.Tk()
    root.withdraw() # Nasconde la finestra principale di tkinter
    
    file_path = filedialog.askopenfilename(
        title="Seleziona il modello 3D (.glb) per la simulazione",
        filetypes=[("GLB files", "*.glb"), ("All files", "*.*")]
    )
    
    root.destroy() # Chiude la finestra
    
    if not file_path:
        print("Nessun file selezionato. Chiusura programma.")
        exit()
        
    return file_path

def main():
    # --- Configurazione Iniziale ---
    # Il percorso del modello viene ora scelto da te all'avvio!
    model_path = get_file_path()
    
    # Il file JSON invece rimane fisso (o puoi renderlo dinamico in futuro)
    graph_path = "data/navigation_graph.json"

    print("=== AVVIO SISTEMA VERITAS-SPATIAL-AI ===")
    print(f"Modello caricato: {model_path}")

    # --- FASE 1: Analisi Topologica Automatica ---
    print("Analisi automatica topologia in corso...")
    analyzer = TopologyAnalyzer(model_path)
    analyzer.analyze_model()
    
    # Visualizzazione 3D (Si apre la finestra)
    print("Apertura visualizzatore 3D...")
    analyzer.mesh.show() 
    
    # Estraiamo i nodi di navigazione
    nav_nodes = analyzer.get_navigable_zones(num_clusters=10)
    print(f"Topologia estratta: identificati {len(nav_nodes)} nodi.")

    # --- FASE 2: Inizializzazione Motore ---
    engine = SimulationEngine(graph_path=graph_path)

    # --- FASE 3: Aggiunta Agenti con Profilo Cognitivo ---
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
    
    # --- FASE 4: Esecuzione ---
    print("Esecuzione tick simulazione...")
    engine.run_tick()

    # --- FASE 5: Esportazione ---
    state = engine.export_state()
    print("\n--- Stato finale della simulazione (JSON) ---")
    print(state)

    # Salvataggio su file
    with open("simulation_output.json", "w") as f:
        f.write(state)
    print("\nSalvataggio completato: 'simulation_output.json'")

if __name__ == "__main__":
    main()