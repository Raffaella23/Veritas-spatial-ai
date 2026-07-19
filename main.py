import json
from core.engine import SimulationEngine
from core.topology_analyzer import TopologyAnalyzer

def main():
    # --- Configurazione Iniziale ---
    # Assicurati che i percorsi siano corretti per il tuo progetto
    model_path = "data/airport_LIRF.glb" 
    graph_path = "data/navigation_graph.json"

    print("=== AVVIO SISTEMA VERITAS-SPATIAL-AI ===")

    # --- FASE 1: Analisi Topologica Automatica ---
    # L'AI legge il modello 3D e capisce la struttura (senza lavoro manuale)
    print("Analisi automatica topologia in corso...")
    analyzer = TopologyAnalyzer(model_path)
    analyzer.analyze_model()
    
    # Estraiamo i nodi di navigazione (in futuro questi popoleranno automaticamente il graph_path)
    nav_nodes = analyzer.get_navigable_zones(num_clusters=10)
    print(f"Topologia estratta: identificati {len(nav_nodes)} nodi navigabili.")

    # --- FASE 2: Inizializzazione Motore ---
    # Il motore ora gestisce sia la fisica che il "cervello" degli agenti
    engine = SimulationEngine(graph_path=graph_path)

    # --- FASE 3: Aggiunta Agenti con Profilo Cognitivo ---
    # Definiamo il "DNA" (HumanAgent) dell'agente che il motore userà
    # Questi parametri definiscono come l'agente reagisce (socialità, pazienza, ecc.)
    profile_data = {
        'patience': 0.8,
        'risk_aversion': 0.2,
        'social_factor': 0.5,
        'base_speed': 1.2
    }

    # Aggiungiamo un agente di test
    engine.add_agent(
        agent_id="test_user_01", 
        profile_id="standard_visitor", 
        profile_data=profile_data
    )
    print("Agente 'test_user_01' inizializzato con core cognitivo.")

    # --- FASE 4: Esecuzione Simulazione ---
    print("Esecuzione tick simulazione...")
    
    # Esempio: testiamo il sistema di emergenza che abbiamo inserito
    # engine.trigger_emergency(status=True) 
    
    engine.run_tick()

    # --- FASE 5: Esportazione Dati ---
    state = engine.export_state()
    print("\n--- Stato finale della simulazione (JSON) ---")
    print(state)

    # Opzionale: salvare su file
    with open("simulation_output.json", "w") as f:
        f.write(state)
    print("\nSalvataggio completato: 'simulation_output.json'")

if __name__ == "__main__":
    main()
