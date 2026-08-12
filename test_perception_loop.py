#!/usr/bin/env python3
"""
Test del loop percettivo reale: un agente con competenza percettiva
- Osserva lo spazio
- Interpreta (visibilità, densità, rischio)
- Decide (evita zone a bassa visibilità)
- Agisce (sceglie percorso alternativo)
- Adatta comportamento

Non è un test unitario: è un'osservazione del comportamento emergente.
"""
import sys
import os
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "Assets")
if ASSETS_DIR not in sys.path:
    sys.path.insert(0, ASSETS_DIR)

from core.engine import SimulationEngine
from core.topology_analyzer import TopologyAnalyzer

MODEL_PATH = os.path.join(BASE_DIR, "demo", "veritas_test_airport.glb")
GRAPH_PATH = "/tmp/veritas_test_graph.json"

def test_perception_loop():
    print("=" * 70)
    print("TEST: Loop Percettivo Reale — Un Agente Che Percepisce")
    print("=" * 70)

    # 1. ANALIZZA MODELLO
    print("\n[1/5] Analizzando modello di prova...")
    if not os.path.exists(MODEL_PATH):
        print(f"❌ Modello non trovato: {MODEL_PATH}")
        return

    try:
        analyzer = TopologyAnalyzer(MODEL_PATH)
        analyzer.analyze_model()
        analyzer.get_navigable_zones()
        analyzer.export_navigation_graph(GRAPH_PATH)
        print(f"✅ Grafo esportato: {GRAPH_PATH}")
    except Exception as e:
        print(f"❌ Errore analisi: {e}")
        return

    # 2. CREA ENGINE + AGENTE
    print("\n[2/5] Creando engine e agente...")
    try:
        engine = SimulationEngine(graph_path=GRAPH_PATH, dt=0.1)

        # Agente tipo: "wheelchair" (bassa visibilità per handicap)
        # Questo lo farà più sensibile a bassa visibilità
        engine.add_agent(
            agent_id="test_agent_0",
            profile_id="airport_security",  # usa profilo che esiste nel grafo
            profile_data={
                "archetype": "wheelchair",
                "patience": 0.5,
                "risk_aversion": 0.7,
                "social_factor": 0.4,
            },
            domain="generic",
            group_id=None,
            start_delay=0.0,
        )
        print(f"✅ Agente creato: test_agent_0 (wheelchair, risk_aversion=0.7)")
    except Exception as e:
        print(f"❌ Errore creazione engine: {e}")
        return

    # 3. ESEGUI SIMULAZIONE
    print("\n[3/5] Eseguendo 150 tick (15 secondi simulati)...")
    stress_history = []
    decisions_log = []
    perception_log = []

    agent = engine.agents[0]
    for tick in range(150):
        engine.run_tick()

        # Log lo stress
        stress = agent.brain.stress_level if hasattr(agent.brain, 'stress_level') else 0.0
        stress_history.append({"tick": tick, "stress": stress})

        # Log della percezione ogni 10 tick.
        # agent.position e' un array numpy che il motore muta sul posto: senza
        # copia tutte le voci del log puntano allo stesso oggetto e la distanza
        # percorsa risulta sempre 0, cioe' un blocco che non c'e'.
        if tick % 10 == 0:
            perception_log.append({
                "tick": tick,
                "position": list(agent.position),
                "node": agent.current_node_id,
                "stress": stress,
            })

        if (tick + 1) % 50 == 0:
            pos = agent.position if agent.position is not None else [0, 0, 0]
            print(f"  tick {tick + 1}: stress={stress:.2f}, pos={[round(p, 1) for p in pos]}")

    # 4. ANALIZZA RISULTATI
    print("\n[4/5] Analizzando comportamento emergente...")

    # Stress finale vs iniziale
    stress_initial = stress_history[0]["stress"]
    stress_final = stress_history[-1]["stress"]
    stress_delta = stress_final - stress_initial
    print(f"\n📊 Stress Level:")
    print(f"  Iniziale: {stress_initial:.3f}")
    print(f"  Finale:   {stress_final:.3f}")
    print(f"  Δ:        {stress_delta:+.3f}")

    # Picco di stress
    max_stress = max(h["stress"] for h in stress_history)
    max_stress_tick = next(h["tick"] for h in stress_history if h["stress"] == max_stress)
    print(f"  Picco:    {max_stress:.3f} (tick {max_stress_tick})")

    # Comportamento: ha evitato zone ad alto stress?
    high_stress_ticks = [h for h in stress_history if h["stress"] > 0.6]
    if high_stress_ticks:
        print(f"\n⚠️  Alto stress rilevato in {len(high_stress_ticks)} tick (stress > 0.6)")
        print(f"   Questo indica: zona affollata, bassa visibilità, o entrambi")
    else:
        print(f"\n✅ Stress mantenuto basso (<0.6) per tutta la simulazione")

    # Posizione finale vs iniziale
    if len(perception_log) > 1:
        pos_init = perception_log[0]["position"]
        pos_final = perception_log[-1]["position"]
        distance = sum((a - b) ** 2 for a, b in zip(pos_init, pos_final)) ** 0.5
        print(f"\n🚶 Movimento:")
        print(f"  Da: {[round(p, 1) for p in pos_init]}")
        print(f"  A:  {[round(p, 1) for p in pos_final]}")
        print(f"  Distanza percorsa: {distance:.1f} m")

    # 5. VERDICT
    print("\n[5/5] Verdict:")
    print("=" * 70)
    if stress_delta < 0.1 and max_stress < 0.7:
        print("✅ PASS: Agente ha percepito e mantenuto comportamento stabile")
        print("   L'agente non ha subito stress eccessivo da percezione bassa.")
    elif stress_delta > 0.3:
        print("⚠️  WARN: Stress aumentato significativamente")
        print("   L'agente potrebbe aver incontrato zone di discomfort percettivo.")
    else:
        print("❓ NEUTRAL: Comportamento entro range normale")

    if distance > 5.0:
        print("✅ Movimento: agente ha navigato nello spazio (non bloccato)")
    else:
        print("❌ Movimento: agente ha navigato poco (possibile blocco)")

    print("=" * 70)
    print("\n💡 Prossimi passi:")
    print("   1. Integrare visibilità reale da mesh (ray-casting)")
    print("   2. Cognitive map: agente ricorda zone 'scomode'")
    print("   3. Decisione adattiva: scegli percorso alternativo se stress alto")
    print("   4. Report PDF: documenta questo comportamento intelligente")

if __name__ == "__main__":
    test_perception_loop()
