from core.engine import SimulationEngine
from core.behaviour import SyntheticPlayer

# 1. Inizializza il motore caricando il grafo
engine = SimulationEngine(graph_path="data/navigation_graph.json", dt=1.0)

# 2. Aggiungi un agente (es. profilo "visitor_standard")
# L'agente parte da [0,0,0] e riceverà il percorso dal loader interno
engine.add_agent("visitor_01", "visitor_standard")

print("--- Avvio Simulazione V13 ---")

# 3. Simula alcuni tick (cicli di tempo)
for tick in range(5):
    engine.run_tick()
    print(f"Tick {tick}: Stato Simulazione generato.")

# 4. Esporta il risultato finale
final_json = engine.export_state()
print("\n--- Report Finale Enriched JSON ---")
print(final_json)
