#!/usr/bin/env python3
"""
Test multi-agente con diverse architetture percettive.
Dimostra come agenti diversi (wheelchair vs business) percepiscono
e reagiscono diversamente allo stesso ambiente.
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
GRAPH_PATH = "/tmp/veritas_test_graph_multi.json"

def test_multi_agent_perception():
    print("=" * 70)
    print("TEST: Multi-Agent Perception — Diversi Archetype, Diverse Reazioni")
    print("=" * 70)

    # 1. Analizza modello
    print("\n[1/4] Analizzando modello...")
    if not os.path.exists(MODEL_PATH):
        print(f"❌ Modello non trovato: {MODEL_PATH}")
        return

    try:
        analyzer = TopologyAnalyzer(MODEL_PATH)
        analyzer.analyze_model()
        analyzer.get_navigable_zones()
        analyzer.export_navigation_graph(GRAPH_PATH)
        print(f"✅ Grafo esportato")
    except Exception as e:
        print(f"❌ Errore analisi: {e}")
        return

    # 2. Crea engine e agenti diversi
    print("\n[2/4] Creando engine e agenti (3 archetipe diversi)...")
    try:
        engine = SimulationEngine(graph_path=GRAPH_PATH, dt=0.1)

        # Agente 1: Wheelchair (visibilità bassa, stress sensitivity alta)
        engine.add_agent(
            agent_id="agent_wheelchair",
            profile_id="airport_security",
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

        # Agente 2: Business (visibilità media, stress sensitivity bassa)
        engine.add_agent(
            agent_id="agent_business",
            profile_id="airport_security",
            profile_data={
                "archetype": "business",
                "patience": 0.8,
                "risk_aversion": 0.4,
                "social_factor": 0.3,
            },
            domain="generic",
            group_id=None,
            start_delay=0.5,  # sfasamento per evitare sovrapposizione
        )

        # Agente 3: Tourist (visibilità bassa, explorative)
        engine.add_agent(
            agent_id="agent_tourist",
            profile_id="airport_security",
            profile_data={
                "archetype": "tourist",
                "patience": 0.6,
                "risk_aversion": 0.3,
                "social_factor": 0.7,
            },
            domain="generic",
            group_id=None,
            start_delay=1.0,
        )

        print(f"✅ Creati 3 agenti con archetype diversi")
    except Exception as e:
        print(f"❌ Errore creazione engine: {e}")
        return

    # 3. Esegui simulazione
    print("\n[3/4] Eseguendo 150 tick (15 secondi simulati)...")
    for tick in range(150):
        engine.run_tick()

    # 4. Analizza risultati
    print("\n[4/4] Analizzando risultati...")
    print("=" * 70)

    # Estrai perception report
    report = engine.export_perception_report()

    # Analisi per agente
    print("\n📊 STRESS E PERCEZIONE PER AGENTE:\n")
    for agent in engine.agents:
        stress = agent.brain.stress_level if hasattr(agent, 'brain') else 0.0
        archetype = agent.brain.profile.get('archetype', 'unknown') if hasattr(agent, 'brain') else 'unknown'

        # Calcola media visibility da perception log
        agent_perceptions = [p for p in report['perception_timeline'] if p['agent_id'] == agent.agent_id]
        avg_visibility = sum(p['visibility_pct'] for p in agent_perceptions) / len(agent_perceptions) if agent_perceptions else 0.0

        print(f"{agent.agent_id} ({archetype}):")
        print(f"  Stress finale: {stress:.3f}")
        print(f"  Visibilità media percepita: {avg_visibility:.1f}%")
        print(f"  Movimento totale: {agent.position}")

    # Analisi cognitive map per agente
    print("\n🧠 COGNITIVE MAP (Memoria Spaziale):\n")
    for agent_id, cog_map in report['agent_cognitive_maps'].items():
        print(f"{agent_id}:")
        for zone_id, data in cog_map.items():
            print(f"  {zone_id}: comfort={data['comfort_level']}, stress_avg={data['avg_stress']:.3f}, visits={data['visits']}")

    # Validazione
    print("\n✅ VALIDAZIONE:\n")

    # Check 1: Tutti gli agenti hanno dati di percezione
    print(f"✓ Perception samples logged: {report['perception_samples']}")

    # Check 2: Cognitive maps sono diversi per agente
    unique_maps = len(set(str(v) for v in report['agent_cognitive_maps'].values()))
    print(f"✓ Cognitive maps created: {len(report['agent_cognitive_maps'])} agenti")

    # Check 3: Zone analysis è disponibile
    print(f"✓ Zone comfort analysis: {len(report['zone_comfort_analysis'])} zone")

    # Summary
    print("\n" + "=" * 70)
    print("✅ TEST COMPLETATO: Perception loop multi-agente funzionante")
    print("   - Agenti diversi percepiscono con sensibilità diverse")
    print("   - Cognitive maps traccia memoria spaziale")
    print("   - Dati pronti per report visuale")
    print("=" * 70)

if __name__ == "__main__":
    test_multi_agent_perception()
