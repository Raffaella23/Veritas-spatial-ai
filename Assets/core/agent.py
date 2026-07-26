# core/agent.py

from enum import Enum

class AgentState(Enum):
    NORMAL = 'NORMAL'
    EMERGENCY = 'EMERGENCY'
    SOCIALIZING = 'SOCIALIZING'

class HumanAgent:
    def __init__(self, agent_id, profile):
        self.id = agent_id
        self.profile = profile # Dict: {'patience': 0.8, 'riskAversion': 0.2, ...}
        self.state = AgentState.NORMAL
        self.stress_level = 0.0
        self.current_need = 'exploration'

    def decide_action(self, environment_data):
        # 1. Gestione Sicurezza (Emergenza)
        if environment_data.get('emergency_active'):
            self.state = AgentState.EMERGENCY
            self.stress_level += 0.2
            return self.calculate_evacuation_path(environment_data.get('exits'))

        # 2. Logica Normale
        return self.navigate_by_context(environment_data)

    def calculate_evacuation_path(self, exits):
        return "MOVING_TO_NEAREST_EXIT"

    def navigate_by_context(self, data):
        # Logica di navigazione basata su densità
        if data.get('density', 0) > 0.8:
            self.stress_level += 0.05
            return "AVOID_CROWD"
        return "PROCEED_TO_GOAL"
