from enum import Enum

class AgentState(Enum):
    NORMAL = 'NORMAL'
    EMERGENCY = 'EMERGENCY'
    SOCIALIZING = 'SOCIALIZING'

class HumanAgent:
    def __init__(self, agent_id, profile, domain="generic"):
        self.id = agent_id
        self.profile = profile  # Dict: {'patience': 0.8, 'risk_aversion': 0.2, ...}
        self.domain = domain    # 'airport_security' | 'museum_visitor' | 'gaming_player' | 'generic'
        self.state = AgentState.NORMAL
        self.stress_level = 0.0
        self.current_need = 'exploration'
        self._checkpoint_wait = 0
        self._dwell_ticks = 0

    def decide_action(self, environment_data):
        # 1. Gestione Sicurezza (Emergenza) - sempre prioritaria, in ogni dominio
        if environment_data.get('emergency_active'):
            self.state = AgentState.EMERGENCY
            self.stress_level += 0.2
            return self.calculate_evacuation_path(environment_data.get('exits'))

        # 2. Logica specifica del dominio, applicata sopra il profilo umano di base
        node_meta = environment_data.get('node_meta', {})

        if self.domain == "airport_security":
            return self._decide_airport_security(environment_data, node_meta)
        if self.domain == "museum_visitor":
            return self._decide_museum(environment_data, node_meta)
        if self.domain == "gaming_player":
            return self._decide_gaming(environment_data, node_meta)

        # 3. Logica generica (visitor_standard / unity_bridge)
        return self.navigate_by_context(environment_data)

    def calculate_evacuation_path(self, exits):
        return "MOVING_TO_NEAREST_EXIT"

    def navigate_by_context(self, data):
        # Logica di navigazione basata su densita'
        if data.get('density', 0) > 0.8:
            self.stress_level += 0.05
            return "AVOID_CROWD"
        return "PROCEED_TO_GOAL"

    def _decide_airport_security(self, data, node_meta):
        """Specializzazione sicurezza aeroportuale: code ai checkpoint, cautela sulle zone riservate."""
        if node_meta.get('checkpoint') and self._checkpoint_wait > 0:
            self._checkpoint_wait -= 1
            return "IN_SECURITY_QUEUE"

        if node_meta.get('checkpoint'):
            # Tempo di coda inversamente proporzionale alla pazienza (1-4 tick)
            self._checkpoint_wait = max(1, round((1 - self.profile.get('patience', 0.5)) * 4))
            return "APPROACHING_CHECKPOINT"

        if node_meta.get('restricted') and self.profile.get('risk_aversion', 0.5) > 0.6:
            self.stress_level += 0.05
            return "AVOIDING_RESTRICTED_AREA"

        return self.navigate_by_context(data)

    def _decide_museum(self, data, node_meta):
        """Specializzazione museale: tempo di osservazione sulle opere, comportamento sociale di gruppo."""
        if self._dwell_ticks > 0:
            self._dwell_ticks -= 1
            return "OBSERVING_EXHIBIT"

        interest = node_meta.get('interest_level', 0.0)
        if interest > 0:
            self._dwell_ticks = max(0, round(interest * self.profile.get('patience', 0.5) * 5))
            if self._dwell_ticks > 0:
                return "OBSERVING_EXHIBIT"

        if self.profile.get('social_factor', 0.5) > 0.6 and data.get('peers_here'):
            return "FOLLOWING_GROUP"

        return self.navigate_by_context(data)

    def _decide_gaming(self, data, node_meta):
        """Specializzazione gaming: ricerca obiettivi, rischio calcolato sugli hazard."""
        if node_meta.get('objective'):
            return "PURSUING_OBJECTIVE"

        if node_meta.get('hazard'):
            if self.profile.get('risk_aversion', 0.5) < 0.4:
                return "SEEKING_HAZARD_FOR_REWARD"
            self.stress_level += 0.05
            return "AVOIDING_HAZARD"

        return self.navigate_by_context(data)
