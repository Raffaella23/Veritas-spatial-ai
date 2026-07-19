import json
from typing import List
from core.behaviour import SyntheticPlayer
from core.compliance import AccessibilityValidator
from core.path_loader import PathLoader
from core.agent import HumanAgent # Il tuo nuovo cervello IA

class SimulationEngine:
    def __init__(self, graph_path: str, dt: float = 0.1):
        self.dt = dt
        self.agents: List[SyntheticPlayer] = []
        self.path_loader = PathLoader(graph_path)
        self.validator = AccessibilityValidator(domain_config={"min_clearance": 2.0})
        self.compliance_history = []
        
        # Stato Globale per la gestione emergenze
        self.emergency_mode = False

    def add_agent(self, agent_id: str, profile_id: str, profile_data: dict):
        """Aggiunge un agente con capacità fisiche e capacità cognitive (HumanAgent)"""
        # 1. Creiamo il corpo (SyntheticPlayer)
        agent = SyntheticPlayer(agent_id, start_pos=[0.0, 0.0, 0.0])
        
        # 2. Creiamo il cervello (HumanAgent) e lo colleghiamo
        agent.brain = HumanAgent(agent_id, profile_data)
        
        # 3. Gestione percorso
        waypoints = self.path_loader.get_waypoints(profile_id)
        agent.set_path(waypoints)
        
        self.agents.append(agent)

    def trigger_emergency(self, status: bool = True):
        """Attiva o disattiva il protocollo di emergenza globale"""
        self.emergency_mode = status
        print(f"!!! Protocollo Emergenza: {'ATTIVATO' if status else 'DISATTIVATO'} !!!")

    def run_tick(self):
        """Ciclo principale di aggiornamento"""
        
        # Prepara i dati ambientali per il 'cervello' degli agenti
        env_data = {
            'emergency_active': self.emergency_mode,
            'density': 0.0 # Placeholder: qui potresti calcolare la densità reale
        }

        for agent in self.agents:
            # 1. L'agente usa il suo cervello per decidere
            if hasattr(agent, 'brain'):
                decision = agent.brain.decide_action(env_data)
                
                # Se è in emergenza, puoi aggiungere qui logica per sovrascrivere il percorso
                if decision == "MOVING_TO_NEAREST_EXIT":
                    # Esempio: qui potresti forzare un cambio di rotta
                    pass

            # 2. Movimento fisico (vecchia logica che resta valida)
            old_state = agent.state
            agent.update_position(self.dt)

            # 3. Verifica Compliance
            if old_state != agent.state and agent.state.value == "arrived":
                node_id = "n003" # Esempio nodo target
                node_meta = self.path_loader.get_node_metadata(node_id)
                report = self.validator.validate_node("wheelchair", node_meta)
                
                self.compliance_history.append({
                    "agent": agent.id,
                    "node": node_id,
                    "report": report
                })

    def export_state(self) -> str:
        """Genera il payload per il JSON Exchange Layer"""
        return json.dumps({
            "agents": [a.get_log_entry() for a in self.agents],
            "compliance_logs": self.compliance_history,
            "emergency_mode": self.emergency_mode
        }, indent=2)
