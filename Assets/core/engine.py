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

    def trigger_emergency(self, status: bool = True):
        """Attiva o disattiva il protocollo di emergenza globale"""
        self.emergency_mode = status
        print(f"!!! Protocollo Emergenza: {'ATTIVATO' if status else 'DISATTIVATO'} !!!")

    def run_tick(self):
        """Ciclo principale di aggiornamento"""
        
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

                if decision == "MOVING_TO_NEAREST_EXIT":
                    # Qui potresti aggiungere logica per sovrascrivere dinamicamente il percorso
                    pass
                elif decision in ("IN_SECURITY_QUEUE", "OBSERVING_EXHIBIT"):
                    agent.hold()
                    continue  # l'agente resta fermo in questo tick
                else:
                    agent.resume()

            # 2. Movimento fisico (vecchia logica che resta valida)
            old_state = agent.state
            agent.update_position(self.dt)

            # 3. Verifica Compliance quando si arriva a un nodo
            if old_state != agent.state and agent.state.value == "arrived" and agent.current_node_id:
                arrived_meta = self.path_loader.get_node_metadata(agent.current_node_id)
                report = agent.validator.validate_node("wheelchair", arrived_meta)
                
                self.compliance_history.append({
                    "agent": agent.agent_id,
                    "node": agent.current_node_id,
                    "report": report
                })

    def export_state(self) -> str:
        """Genera il payload per il JSON Exchange Layer"""
        return json.dumps({
            "agents": [a.get_log_entry() for a in self.agents],
            "compliance_logs": self.compliance_history,
            "emergency_mode": self.emergency_mode
        }, indent=2)
