import json
from core.behaviour import SyntheticPlayer
from core.compliance import AccessibilityValidator
from core.path_loader import PathLoader

class SimulationEngine:
    def __init__(self, graph_path: str, dt: float = 0.1):
        self.dt = dt
        self.agents: List[SyntheticPlayer] = []
        self.path_loader = PathLoader(graph_path)
        self.validator = AccessibilityValidator(domain_config={"min_clearance": 2.0})
        self.compliance_history = [] # Archivio dei report

    def add_agent(self, agent_id: str, profile_id: str):
        agent = SyntheticPlayer(agent_id, start_pos=[0.0, 0.0, 0.0])
        # Ingestione percorso tramite PathLoader
        waypoints = self.path_loader.get_waypoints(profile_id)
        agent.set_path(waypoints)
        self.agents.append(agent)

    def run_tick(self):
        for agent in self.agents:
            old_state = agent.state
            agent.update_position(self.dt)
            
            # Integration Hook: Check Compliance on Arrival
            if old_state != agent.state and agent.state.value == "arrived":
                # Supponiamo per semplicità di mappare l'arrivo all'ultimo nodo del percorso
                # In un sistema complesso, dovremmo tracciare quale nodo specifico è stato raggiunto
                node_id = "n003" # Esempio di nodo target
                node_meta = self.path_loader.get_node_metadata(node_id)
                report = self.validator.validate_node("wheelchair", node_meta)
                
                self.compliance_history.append({
                    "agent": agent.agent_id,
                    "node": node_id,
                    "report": report
                })

    def export_state(self) -> str:
        """Genera il payload per il JSON Exchange Layer."""
        return json.dumps({
            "agents": [a.get_log_entry() for a in self.agents],
            "compliance_logs": self.compliance_history
        }, indent=2)
