import numpy as np
from enum import Enum
from typing import List, Dict, Any

class AgentState(Enum):
    IDLE = "idle"
    MOVING = "moving"
    ARRIVED = "arrived"
    WAITING = "waiting"  # nuovo: usato da checkpoint aeroportuali e osservazione museale

class SyntheticPlayer:
    def __init__(self, agent_id: str, start_pos: List[float]):
        self.agent_id = agent_id
        self.position = np.array(start_pos, dtype=float)
        self.target_path: List[Dict[str, Any]] = []
        self.state = AgentState.IDLE
        self.speed = 1.5  # Velocita' base per la simulazione
        self.current_node_id = None  # Nodo raggiunto piu' di recente (usato da compliance/dominio)
        
    def set_path(self, waypoints: List[Dict[str, Any]]):
        """Ingerisce il percorso dal PathLoader (lista di {node_id, pos})."""
        self.target_path = list(waypoints)
        self.state = AgentState.MOVING if self.target_path else AgentState.IDLE

    def update_position(self, dt: float):
        """Calcola il movimento vettoriale per il tick corrente."""
        if self.state != AgentState.MOVING or not self.target_path:
            return

        target = self.target_path[0]["pos"]
        direction = target - self.position
        distance = np.linalg.norm(direction)

        if distance <= (self.speed * dt):
            self.position = target
            self.current_node_id = self.target_path[0]["node_id"]
            self.target_path.pop(0)
            if not self.target_path:
                self.state = AgentState.ARRIVED
        else:
            velocity = (direction / distance) * self.speed
            self.position += velocity * dt

    def hold(self):
        """Mette in pausa il movimento per un tick (checkpoint di sicurezza, osservazione museale, ecc.)."""
        if self.target_path:
            self.state = AgentState.WAITING

    def resume(self):
        """Riprende il movimento dopo una pausa."""
        if self.target_path and self.state == AgentState.WAITING:
            self.state = AgentState.MOVING

    def get_log_entry(self) -> Dict[str, Any]:
        """Esporta lo stato per il JSON Layer."""
        return {
            "agent_id": self.agent_id,
            "position": self.position.tolist(),
            "state": self.state.value,
            "current_node_id": self.current_node_id,
            "remaining_nodes": len(self.target_path)
        }
