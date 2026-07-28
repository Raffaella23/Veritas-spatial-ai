import json
from typing import List
from core.behaviour import SyntheticPlayer
from core.compliance import AccessibilityValidator
from core.path_loader import PathLoader
from core.agent import HumanAgent  # Il tuo nuovo cervello IA

# Soglie di accessibilita' calibrate per dominio (usate per validare i nodi raggiunti)
DOMAIN_CONFIG_DEFAULTS = {
    "generic": {"min_clearance": 2.0},
    "visitor_standard": {"min_clearance": 2.0},
    "airport_security": {"min_clearance": 2.2},
    "museum_visitor": {"min_clearance": 2.0},
    "gaming_player": {"min_clearance": 1.5},
    "unity_bridge": {"min_clearance": 2.0},
}

class SimulationEngine:
    def __init__(self, graph_path: str, dt: float = 0.1):
        self.dt = dt
        self.agents: List[SyntheticPlayer] = []
        self.path_loader = PathLoader(graph_path)
        self.compliance_history = []

        # Stato Globale per la gestione emergenze
        self.emergency_mode = False

        # --- KPI / report di vivibilita' (il vero output vendibile) ---
        self.tick_count = 0
        self.elapsed_time = 0.0
        self.slowdown_events = 0
        self.transit_times = []
        self._agent_start_tick = {}
        self._checkpoint_encounters = {}
        self._checkpoint_waits = {}

    def add_agent(self, agent_id: str, profile_id: str, profile_data: dict, domain: str = None):
        """Aggiunge un agente con capacita' fisiche e capacita' cognitive (HumanAgent).

        - profile_id: seleziona il percorso (mission_profile) da seguire nel grafo.
        - domain: seleziona la specializzazione comportamentale ('airport_security',
          'museum_visitor', 'gaming_player'); se omesso, usa profile_id come dominio.
        """
        # 1. Creiamo il corpo (SyntheticPlayer)
        agent = SyntheticPlayer(agent_id, start_pos=[0.0, 0.0, 0.0])

        # 2. Creiamo il cervello (HumanAgent) e lo colleghiamo
        resolved_domain = domain or profile_id
        agent.brain = HumanAgent(agent_id, profile_data, domain=resolved_domain)

        # 3. Gestione percorso
        waypoints = self.path_loader.get_waypoints(profile_id)
        agent.set_path(waypoints)
        if waypoints:
            agent.position = waypoints[0]["pos"].copy()

        # 4. Validatore di accessibilita' calibrato sul dominio di questo agente
        domain_cfg = DOMAIN_CONFIG_DEFAULTS.get(resolved_domain, {"min_clearance": 2.0})
        agent.validator = AccessibilityValidator(domain_config=domain_cfg)

        self.agents.append(agent)
        self._agent_start_tick[agent_id] = self.tick_count

    def trigger_emergency(self, status: bool = True):
        """Attiva o disattiva il protocollo di emergenza globale"""
        self.emergency_mode = status
        print(f"!!! Protocollo Emergenza: {'ATTIVATO' if status else 'DISATTIVATO'} !!!")

    def run_tick(self):
        """Ciclo principale di aggiornamento"""
        self.tick_count += 1
        self.elapsed_time += self.dt

        for agent in self.agents:
            # Prepara i dati ambientali per il 'cervello' dell'agente
            lookup_node_id = agent.current_node_id or (agent.target_path[0]["node_id"] if agent.target_path else None)
            node_meta = self.path_loader.get_node_metadata(lookup_node_id) if lookup_node_id else {}

            peers_here = [
                a for a in self.agents
                if a is not agent and agent.current_node_id and a.current_node_id == agent.current_node_id
            ]

            env_data = {
                'emergency_active': self.emergency_mode,
                'density': 0.0,  # Placeholder: qui potresti calcolare la densita' reale
                'node_meta': node_meta,
                'peers_here': peers_here,
            }

            # 1. L'agente usa il suo cervello per decidere
            if hasattr(agent, 'brain'):
                decision = agent.brain.decide_action(env_data)

                if node_meta.get('checkpoint') and lookup_node_id:
                    self._checkpoint_encounters[lookup_node_id] = self._checkpoint_encounters.get(lookup_node_id, 0) + 1

                if decision == "MOVING_TO_NEAREST_EXIT":
                    # Qui potresti aggiungere logica per sovrascrivere dinamicamente il percorso
                    pass
                elif decision in ("IN_SECURITY_QUEUE", "OBSERVING_EXHIBIT"):
                    agent.hold()
                    self.slowdown_events += 1
                    if decision == "IN_SECURITY_QUEUE" and lookup_node_id:
                        self._checkpoint_waits[lookup_node_id] = self._checkpoint_waits.get(lookup_node_id, 0) + 1
                    continue  # l'agente resta fermo in questo tick
                else:
                    agent.resume()

            # 2. Movimento fisico (vecchia logica che resta valida)
            old_state = agent.state
            agent.update_position(self.dt)

            # 3. Verifica Compliance e tempo di transito quando si arriva a un nodo
            if old_state != agent.state and agent.state.value == "arrived":
                if agent.current_node_id:
                    arrived_meta = self.path_loader.get_node_metadata(agent.current_node_id)
                    report = agent.validator.validate_node("wheelchair", arrived_meta)

                    self.compliance_history.append({
                        "agent": agent.agent_id,
                        "node": agent.current_node_id,
                        "report": report
                    })

                start_tick = self._agent_start_tick.get(agent.agent_id, 0)
                transit_seconds = (self.tick_count - start_tick) * self.dt
                self.transit_times.append(transit_seconds)

    def get_kpi_report(self) -> dict:
        """
        Calcola il report sintetico di vivibilita' dello spazio: quello che
        viene venduto, non la sola simulazione visiva.
        """
        completed = len(self.transit_times)
        flow_rate = (completed / self.elapsed_time) if self.elapsed_time > 0 else 0.0
        avg_transit = (sum(self.transit_times) / completed) if completed else 0.0

        total_checkpoint_encounters = sum(self._checkpoint_encounters.values())
        total_checkpoint_waits = sum(self._checkpoint_waits.values())
        saturation_pct = (
            (total_checkpoint_waits / total_checkpoint_encounters * 100)
            if total_checkpoint_encounters else 0.0
        )

        return {
            "flusso_effettivo_p_s": round(flow_rate, 3),
            "rallentamenti": self.slowdown_events,
            "tempo_transito_medio_s": round(avg_transit, 2),
            "saturazione_checkpoint_pct": round(saturation_pct, 1),
            "agenti_completati": completed,
            "agenti_attivi": len(self.agents) - completed,
            "durata_simulazione_s": round(self.elapsed_time, 2),
        }

    def export_state(self) -> str:
        """Genera il payload per il JSON Exchange Layer, incluso il report KPI"""
        return json.dumps({
            "agents": [a.get_log_entry() for a in self.agents],
            "compliance_logs": self.compliance_history,
            "emergency_mode": self.emergency_mode,
            "kpi_report": self.get_kpi_report(),
        }, indent=2)
