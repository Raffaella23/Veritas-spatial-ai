import numpy as np
from enum import Enum
from typing import List, Dict, Any

class AgentState(Enum):
    IDLE = "idle"
    MOVING = "moving"
    ARRIVED = "arrived"

class SyntheticPlayer:
    def __init__(self, agent_id: str, start_pos: List[float]):
        self.agent_id = agent_id
        self.position = np.array(start_pos, dtype=float)
        self.target_path: List[np.ndarray] = []
        self.state = AgentState.IDLE
        self.speed = 1.5  # Velocità base per la simulazione
        
    def set_path(self, waypoints: List[List[float]]):
        """Ingerisce il percorso dal PathLoader."""
        self.target_path = [np.array(wp, dtype=float) for wp in waypoints]
        self.state = AgentState.MOVING if self.target_path else AgentState.IDLE

    def update_position(self, dt: float):
        """Calcola il movimento vettoriale per il tick corrente."""
        if self.state != AgentState.MOVING or not self.target_path:
            return

        target = self.target_path[0]
        direction = target - self.position
        distance = np.linalg.norm(direction)

        if distance <= (self.speed * dt):
            self.position = target
            self.target_path.pop(0)
            if not self.target_path:
                self.state = AgentState.ARRIVED
        else:
            velocity = (direction / distance) * self.speed
            self.position += velocity * dt

    def get_log_entry(self) -> Dict[str, Any]:
        """Esporta lo stato per il JSON Layer."""
        return {
            "agent_id": self.agent_id,
            "position": self.position.tolist(),
            "state": self.state.value,
            "remaining_nodes": len(self.target_path)
        }
