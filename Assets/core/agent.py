from enum import Enum

class AgentState(Enum):
    NORMAL = 'NORMAL'
    EMERGENCY = 'EMERGENCY'
    SOCIALIZING = 'SOCIALIZING'

# Soglia oltre la quale lo stress "contagiato" da altri agenti in emergenza
# fa scattare uno stato di panico anche in un agente che non ha visto
# direttamente la causa dell'emergenza. Ispirato al Social Force Model
# (Helbing & Molnar, 1995) e alla letteratura su panico da folla: la paura
# si propaga per prossimita' sociale, non solo per esposizione diretta.
PANIC_CONTAGION_THRESHOLD = 0.75


class HumanAgent:
    def __init__(self, agent_id, profile, domain="generic", group_id=None):
        self.id = agent_id
        self.profile = profile  # Dict: {'patience': 0.8, 'risk_aversion': 0.2, ...}
        self.domain = domain    # 'airport_security' | 'museum_visitor' | 'gaming_player' | 'generic'
        self.group_id = group_id  # Agenti con lo stesso group_id formano un gruppo sociale coeso
        self.state = AgentState.NORMAL
        self.stress_level = 0.0
        self.current_need = 'exploration'
        self._checkpoint_wait = 0
        self._dwell_ticks = 0

        # Cognitive map: memoria dei nodi e del comfort associato
        self.cognitive_map = {}  # node_id → {'visits': int, 'avg_visibility': float, 'comfort': float}
        self._last_visited_node = None
        self._last_visibility_pct = None
        self._warned_low_visibility = False

    def decide_action(self, environment_data):
        # 0. Contagio emotivo: lo stress dei membri del proprio gruppo, o della
        # folla circostante, si propaga in base alla socievolezza del profilo.
        self._apply_social_contagion(environment_data.get('peers_here', []))

        # 0.5 PERCEZIONE SPAZIALE: consulta la visibility reale, adatta stress e cautela
        # Stress da percezione è basato su CAMBIAMENTI nella visibility, non su uno stato statico.
        # Questo evita accumulo infinito mentre l'agente è fermo in una zona a bassa visibilità.
        perception = environment_data.get('perception', {})
        if perception:
            current_visibility = perception.get('visibility_pct', 50.0) / 100.0
            # Default a current_visibility se primo tick (no previous visibility)
            previous_visibility = self._last_visibility_pct if self._last_visibility_pct is not None else current_visibility

            # Stress da deterioramento della visibilità: se vedi MENO di prima, ti stressa
            visibility_delta = previous_visibility - current_visibility
            if visibility_delta > 0.1:  # significativa perdita di visibilità
                stress_increment = visibility_delta * 0.3  # fino a +3% per perdita significativa
                self.stress_level = min(1.0, self.stress_level + stress_increment)
            elif visibility_delta < -0.1:  # miglioramento della visibilità
                stress_reduction = abs(visibility_delta) * 0.2  # riduce stress se migliora
                self.stress_level = max(0.0, self.stress_level - stress_reduction)

            # Stress baseline da zona isolata (bassa visibilità): apply una sola volta, non ogni tick
            if current_visibility < 0.3 and not self._warned_low_visibility:
                self.stress_level = min(1.0, self.stress_level + 0.05)  # piccolo aumento una tantum
                self._warned_low_visibility = True
            elif current_visibility >= 0.4:
                self._warned_low_visibility = False  # reset warning per prossima bassa zona

            # Aggiorna cognitive map per il nodo corrente
            current_node = perception.get('cognitive_map_update', {}).get('visited_node')
            if current_node and current_node != self._last_visited_node:
                if current_node not in self.cognitive_map:
                    self.cognitive_map[current_node] = {'visits': 0, 'visibility_sum': 0.0, 'stress_at_visit': []}
                self.cognitive_map[current_node]['visits'] += 1
                self.cognitive_map[current_node]['visibility_sum'] += current_visibility
                self.cognitive_map[current_node]['stress_at_visit'].append(self.stress_level)
                self._last_visited_node = current_node

            self._last_visibility_pct = current_visibility

        # 1. Gestione Sicurezza (Emergenza) - sempre prioritaria, in ogni dominio
        if environment_data.get('emergency_active') or self.state == AgentState.EMERGENCY:
            self.state = AgentState.EMERGENCY
            self.stress_level = min(1.0, self.stress_level + 0.2)
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

    def _apply_social_contagion(self, peers_here):
        """
        Propaga lo stress tra agenti vicini, pesato dalla socievolezza
        (social_factor) del profilo. Un agente molto sociale risente di piu'
        dello stato emotivo del gruppo; un agente poco sociale ne e' quasi
        immune. Se lo stress accumulato supera la soglia di contagio, l'agente
        puo' entrare in uno stato di panico anche senza aver visto la causa
        originaria dell'emergenza - un comportamento da folla reale.
        """
        if not peers_here:
            return

        social_factor = self.profile.get('social_factor', 0.5)
        if social_factor <= 0:
            return

        peers_in_distress = 0
        for peer in peers_here:
            peer_brain = getattr(peer, 'brain', None)
            if peer_brain is None:
                continue
            same_group = self.group_id is not None and peer_brain.group_id == self.group_id
            if peer_brain.state == AgentState.EMERGENCY:
                weight = social_factor * (1.5 if same_group else 0.6)
                self.stress_level = min(1.0, self.stress_level + 0.03 * weight)
                peers_in_distress += 1
            elif peer_brain.stress_level > 0.5:
                weight = social_factor * (1.3 if same_group else 0.4)
                self.stress_level = min(1.0, self.stress_level + 0.01 * weight)

        if peers_in_distress > 0 and self.stress_level >= PANIC_CONTAGION_THRESHOLD:
            self.state = AgentState.EMERGENCY

    def calculate_evacuation_path(self, exits):
        return "MOVING_TO_NEAREST_EXIT"

    def navigate_by_context(self, data):
        # Coesione di gruppo: un agente sociale con compagni di gruppo nelle
        # vicinanze tende a seguirli invece di scegliere un target indipendente.
        # Vale in tutti i domini, non solo nel museo.
        social_factor = self.profile.get('social_factor', 0.5)
        if self.group_id is not None and social_factor > 0.6:
            group_peers = [
                p for p in data.get('peers_here', [])
                if getattr(getattr(p, 'brain', None), 'group_id', None) == self.group_id
            ]
            if group_peers:
                return "FOLLOWING_GROUP"

        # COGNITIVE MAP: controlla se attualmente in una zona scomoda dalla memoria
        # Se l'agente ha visitato questo nodo prima e ha subito alto stress, esercita cautela
        current_node = data.get('node_meta', {}).get('node_id')
        if current_node and current_node in self.cognitive_map:
            node_record = self.cognitive_map[current_node]
            if node_record['visits'] > 0:
                avg_visibility = node_record['visibility_sum'] / node_record['visits']
                avg_stress = sum(node_record['stress_at_visit']) / len(node_record['stress_at_visit'])
                # Se nodo è ricordato come scomodo (bassa visibilità + alto stress), aumenta cautela
                if avg_visibility < 0.4 and avg_stress > 0.3:
                    self.profile['risk_aversion'] = min(1.0, self.profile.get('risk_aversion', 0.5) + 0.2)
                    return "PROCEED_TO_GOAL_CAREFUL"

        # Logica di navigazione basata su densita'
        if data.get('density', 0) > 0.8:
            self.stress_level = min(1.0, self.stress_level + 0.05)
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
            self.stress_level = min(1.0, self.stress_level + 0.05)
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

        return self.navigate_by_context(data)

    def _decide_gaming(self, data, node_meta):
        """Specializzazione gaming: ricerca obiettivi, rischio calcolato sugli hazard."""
        if node_meta.get('objective'):
            return "PURSUING_OBJECTIVE"

        if node_meta.get('hazard'):
            if self.profile.get('risk_aversion', 0.5) < 0.4:
                return "SEEKING_HAZARD_FOR_REWARD"
            self.stress_level = min(1.0, self.stress_level + 0.05)
            return "AVOIDING_HAZARD"

        return self.navigate_by_context(data)

    def get_cognitive_map_summary(self):
        """Esporta un riepilogo della cognitive map per il report."""
        summary = {}
        for node_id, record in self.cognitive_map.items():
            if record['visits'] > 0:
                avg_visibility = record['visibility_sum'] / record['visits']
                avg_stress = sum(record['stress_at_visit']) / len(record['stress_at_visit'])
                summary[node_id] = {
                    'visits': record['visits'],
                    'avg_visibility_pct': round(avg_visibility * 100, 1),
                    'avg_stress': round(avg_stress, 3),
                    'comfort_level': 'low' if avg_visibility < 0.4 else 'medium' if avg_visibility < 0.65 else 'high',
                }
        return summary
