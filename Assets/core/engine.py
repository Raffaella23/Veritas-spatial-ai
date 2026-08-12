import json
import math
from typing import List, Optional
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

# Ogni quanti tick viene registrato uno snapshot della posizione di tutti gli
# agenti, per poter poi animare la simulazione nel viewer passivo. Con dt=0.1
# e RECORD_EVERY=5, uno snapshot ogni 0.5 secondi simulati: abbastanza fluido
# da vedere, senza generare un file enorme.
RECORD_EVERY = 5

class SimulationEngine:
    def __init__(self, graph_path: str, dt: float = 0.1, vvff_rules: Optional[List[dict]] = None):
        self.dt = dt
        self.agents: List[SyntheticPlayer] = []
        self.path_loader = PathLoader(graph_path)
        self.compliance_history = []
        self.vvff_rules = vvff_rules or []

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

        # --- Traiettoria nel tempo, per il viewer passivo (animazione) ---
        self.trajectory = []
        self._agent_start_delay = {}
        # Ultima rotazione nota per agente (fallback quando l'agente e' fermo
        # o e' appena arrivato e non ha piu' un target_path da cui calcolarla)
        self._last_rot = {}

        # --- Perception data logging per report ---
        self.perception_log = []  # Lista di {tick, agent_id, visibility_pct, stress, node_id, decision}
        self.comfort_timeline = {}  # agent_id → lista di {tick, node_id, comfort_level}

    def add_agent(self, agent_id: str, profile_id: str, profile_data: dict, domain: str = None, group_id: str = None, start_delay: float = 0.0):
        """Aggiunge un agente con capacita' fisiche e capacita' cognitive (HumanAgent).

        - profile_id: seleziona il percorso (mission_profile) da seguire nel grafo.
        - domain: seleziona la specializzazione comportamentale ('airport_security',
          'museum_visitor', 'gaming_player'); se omesso, usa profile_id come dominio.
        - group_id: se valorizzato, lega l'agente a un gruppo sociale coeso (famiglia,
          gruppo turistico) - vedi HumanAgent per la logica di coesione/contagio.
        - start_delay: secondi di attesa prima che l'agente inizi a muoversi.
          Senza questo tutti gli agenti partono nello stesso istante dallo stesso
          punto e procedono in blocco, sovrapposti: a schermo sembra un unico
          gruppo compatto invece di un flusso. Le persone non entrano tutte nello
          stesso secondo, quindi lo sfasamento non e' un espediente grafico ma la
          condizione minima perche' densita' e code abbiano senso.
        """
        # 1. Creiamo il corpo (SyntheticPlayer)
        agent = SyntheticPlayer(agent_id, start_pos=[0.0, 0.0, 0.0])

        # 2. Creiamo il cervello (HumanAgent) e lo colleghiamo
        resolved_domain = domain or profile_id
        agent.brain = HumanAgent(agent_id, profile_data, domain=resolved_domain, group_id=group_id)

        # 3. Gestione percorso
        waypoints = self.path_loader.get_waypoints(profile_id)
        agent.set_path(waypoints)
        if waypoints:
            agent.position = waypoints[0]["pos"].copy()

        self._agent_start_delay[agent_id] = max(0.0, float(start_delay or 0.0))

        # 4. Validatore di accessibilita' calibrato sul dominio di questo agente,
        # con le regole VVFF reali (larghezza minima uscite) se disponibili
        domain_cfg = DOMAIN_CONFIG_DEFAULTS.get(resolved_domain, {"min_clearance": 2.0})
        agent.validator = AccessibilityValidator(domain_config=domain_cfg, vvff_rules=self.vvff_rules)

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
            # Agente non ancora entrato: resta fermo al proprio punto di
            # partenza finche' non scatta il suo ritardo. Viene comunque
            # registrato nei frame, cosi' il viewer non deve gestire comparse
            # e sparizioni.
            if self.elapsed_time < self._agent_start_delay.get(agent.agent_id, 0.0):
                continue

            # Prepara i dati ambientali per il 'cervello' dell'agente
            lookup_node_id = agent.current_node_id or (agent.target_path[0]["node_id"] if agent.target_path else None)
            node_meta = self.path_loader.get_node_metadata(lookup_node_id) if lookup_node_id else {}

            peers_here = [
                a for a in self.agents
                if a is not agent and agent.current_node_id and a.current_node_id == agent.current_node_id
            ]

            # PERCEZIONE REALE: cosa vede l'agente dalla zona in cui si trova.
            # node_meta porta l'isovista misurata sulla mesh dal browser.
            perception = self._compute_agent_perception(agent, node_meta)

            env_data = {
                'emergency_active': self.emergency_mode,
                'density': len(peers_here) / max(1, 10),  # semplificata: agenti per cella
                'node_meta': node_meta,
                'peers_here': peers_here,
                'perception': perception,  # ← NUOVO: dati percettivi reali
            }

            # LOG: registra percezione per report
            if self.tick_count % 5 == 0:  # ogni 5 tick = ogni 0.5 secondi simulati
                self.perception_log.append({
                    'tick': self.tick_count,
                    'agent_id': agent.agent_id,
                    'visibility_pct': perception.get('visibility_pct', 50.0),
                    'stress': agent.brain.stress_level if hasattr(agent, 'brain') else 0.0,
                    'node_id': lookup_node_id,
                    'archetype': agent.brain.profile.get('archetype', 'business') if hasattr(agent, 'brain') else 'unknown',
                    'posture': perception.get('posture'),
                    'source': perception.get('perception_source'),
                    'isovist_area_m2': perception.get('isovist_area_m2'),
                    'nearest_obstacle_m': perception.get('nearest_obstacle_m'),
                })

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

        # 4. Registra uno snapshot della scena per l'animazione nel viewer
        if self.tick_count % RECORD_EVERY == 0:
            frame_agents = []
            for a in self.agents:
                # Rotazione (radianti, atan2(dz, dx)) dalla direzione verso il
                # prossimo waypoint - stessa convenzione del generatore JS lato
                # viewer, cosi' il bridge non deve indovinarla lato client.
                # Se l'agente e' fermo/arrivato, mantiene l'ultima rotazione nota
                # invece di scattare a 0.
                rot = self._last_rot.get(a.agent_id, 0.0)
                if a.target_path:
                    direction = a.target_path[0]["pos"] - a.position
                    dx, dz = float(direction[0]), float(direction[2])
                    if dx != 0.0 or dz != 0.0:
                        rot = math.atan2(dz, dx)
                self._last_rot[a.agent_id] = rot

                brain = getattr(a, "brain", None)
                # "archetype" e' il tipo visivo/comportamentale dell'agente
                # (es. "wheelchair", "family") usato dal viewer per scegliere
                # la resa grafica - preferito da profile["type"] se presente
                # (impostato dal bridge JS dagli ARCHETYPES del viewer), con
                # fallback al domain per compatibilita' con chi non lo passa.
                archetype = None
                if brain:
                    profile = getattr(brain, "profile", None) or {}
                    archetype = profile.get("type") or brain.domain
                frame_agents.append({
                    "id": a.agent_id,
                    "pos": a.position.tolist(),
                    "rot": round(rot, 4),
                    "state": a.state.value,
                    "group": getattr(brain, "group_id", None) if brain else None,
                    "archetype": archetype,
                    "stress": round(getattr(brain, "stress_level", 0.0), 3) if brain else 0.0,
                })
            self.trajectory.append({
                "t": round(self.elapsed_time, 2),
                "agents": frame_agents,
            })

    # Altezza occhio per archetipo, in metri. Sotto AGENT_SEATED_EYE_M si usa
    # l'isovista calcolata da seduti: un bancone a 1,10 m non ostruisce chi sta
    # in piedi ma chiude l'orizzonte a chi e' in carrozzina.
    EYE_HEIGHTS = {
        "business": 1.65,
        "family": 1.60,
        "elderly": 1.58,
        "wheelchair": 1.20,
        "tourist": 1.62,
        "student": 1.70,
        "staff": 1.68,
        "vip": 1.65,
    }
    SEATED_EYE_M = 1.40

    # Isovista di riferimento: area, in mq, oltre la quale si considera che
    # l'orizzonte sia completamente aperto (visibilita' 100%). 400 mq e' un
    # cerchio libero di ~11 m di raggio: in un terminal o in una sala museale
    # e' gia' campo lungo. Serve solo a portare una misura in metri quadri su
    # una scala 0-100 leggibile; la misura grezza resta nel report.
    ISOVIST_FULL_M2 = 400.0

    # Stima di ripiego quando la geometria non e' disponibile (nessuna mesh,
    # BVH non montato, chiamata all'API senza isovista nel grafo). NON e' una
    # misura: distingue gli archetipi ma non i luoghi, quindi produce curve
    # piatte. Il campo perception_source lo dichiara, cosi' un grafico piatto
    # si spiega guardando il report invece che indagando sul motore.
    FALLBACK_VISIBILITY = {
        "business": 65.0,
        "family": 60.0,
        "elderly": 45.0,
        "wheelchair": 35.0,
        "tourist": 55.0,
        "student": 75.0,
        "staff": 80.0,
        "vip": 70.0,
    }

    def _compute_agent_perception(self, agent, node_meta=None) -> dict:
        """Calcola cosa l'agente vede davvero dalla sua posizione attuale.

        LOOP PERCETTIVO:
        1. Osserva: legge l'isovista misurata sulla mesh nella zona in cui si trova
        2. Interpreta: assegna significato ("orizzonte chiuso = zona isolata")
        3. decide_action() usa questa interpretazione
        4. Muove
        5. Osserva il risultato
        6. Aggiorna la mappa cognitiva

        L'isovista arriva dal browser dentro node_meta['isovist'], gia'
        calcolata a due altezze occhio sulla geometria caricata. Qui si sceglie
        la quota giusta per l'archetipo e si porta l'area su una scala 0-100.
        """
        archetype = agent.brain.profile.get("archetype", "business")
        pos = agent.position if agent.position is not None else [0, 0, 0]
        eye_height = self.EYE_HEIGHTS.get(archetype, 1.65)

        isovist = (node_meta or {}).get("isovist") or {}
        posture = "seated" if eye_height < self.SEATED_EYE_M else "standing"
        measured = isovist.get(posture) or {}
        area_m2 = measured.get("area_m2")

        if area_m2 is not None:
            # Misura reale: l'area vista dal punto in cui l'agente si trova.
            base_visibility = 100.0 * min(1.0, float(area_m2) / self.ISOVIST_FULL_M2)
            perception_source = "isovist"
        else:
            base_visibility = self.FALLBACK_VISIBILITY.get(archetype, 50.0)
            perception_source = "archetype_estimate"

        # La folla e' occlusione: chi ti sta davanti ti toglie la vista.
        peers_near = len([a for a in self.agents if a is not agent and
                         ((a.position[0]-pos[0])**2 + (a.position[2]-pos[2])**2)**0.5 < 5.0])
        visibility_pct = base_visibility * (1.0 - min(0.4, peers_near * 0.05))

        # INTERPRETAZIONE SEMANTICA della percezione
        # ============================================
        stress_from_visibility = 0.0
        visible_zone_interpretations = []

        if visibility_pct < 30.0:
            # Zona isolata o occlusione alta: disagio psicologico
            stress_from_visibility = 0.15
            visible_zone_interpretations.append("isolated_low_visibility")
        elif visibility_pct < 50.0:
            # Bassa visibilità ma non critica: cautela
            stress_from_visibility = 0.08
            visible_zone_interpretations.append("limited_visibility")
        elif visibility_pct < 70.0:
            # Visibilità normale: nessuno stress aggiunto
            stress_from_visibility = 0.0
            visible_zone_interpretations.append("normal_visibility")
        else:
            # Buona visibilità: rassicurazione
            stress_from_visibility = -0.05  # riduce stress preesistente
            visible_zone_interpretations.append("open_sightlines")

        # Aggiungere stress da affollamento percepito
        if peers_near > 5:
            stress_from_visibility += 0.1
            visible_zone_interpretations.append("crowded_perception")

        comfort = 1.0 - (stress_from_visibility / 0.2) if stress_from_visibility > 0 else 1.0

        return {
            "archetype": archetype,
            "eye_height": eye_height,
            "posture": posture,
            "position": pos,
            "visibility_pct": visibility_pct,
            "perception_source": perception_source,
            # Le misure grezze restano: sono in metri e in metri quadri, cioe'
            # confrontabili con una norma. La percentuale serve a leggere il
            # grafico, non a fare una verifica.
            "isovist_area_m2": measured.get("area_m2"),
            "nearest_obstacle_m": measured.get("min_free_m"),
            "mean_sightline_m": measured.get("mean_free_m"),
            "stress_increment": max(-0.1, min(0.2, stress_from_visibility)),  # clamp [-0.1, 0.2]
            "peers_near": peers_near,
            "visible_zone_interpretations": visible_zone_interpretations,
            "cognitive_map_update": {
                "visited_node": agent.current_node_id,
                "visibility_measured": visibility_pct,
                "archetype_comfort": comfort,
            }
        }

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

        non_compliant = sum(1 for c in self.compliance_history if not c["report"]["pass"])

        return {
            "flusso_effettivo_p_s": round(flow_rate, 3),
            "rallentamenti": self.slowdown_events,
            "tempo_transito_medio_s": round(avg_transit, 2),
            "saturazione_checkpoint_pct": round(saturation_pct, 1),
            "agenti_completati": completed,
            "agenti_attivi": len(self.agents) - completed,
            "durata_simulazione_s": round(self.elapsed_time, 2),
            "violazioni_compliance": non_compliant,
        }

    def export_state(self) -> str:
        """Genera il payload per il JSON Exchange Layer, incluso il report KPI"""
        return json.dumps({
            "agents": [a.get_log_entry() for a in self.agents],
            "compliance_logs": self.compliance_history,
            "emergency_mode": self.emergency_mode,
            "kpi_report": self.get_kpi_report(),
        }, indent=2)

    def export_trajectory(self, nodes: dict) -> str:
        """Genera il payload per il viewer passivo: nodi statici + traiettoria animata."""
        return json.dumps({
            "nodes": nodes,
            "frames": self.trajectory,
        }, indent=2)

    def export_perception_report(self) -> dict:
        """Esporta dati percettivi per generazione report: timeline visibilità, stress, cognitive maps."""
        # Da dove vengono i numeri: isovista misurata sulla mesh, oppure stima
        # per archetipo. Senza questo campo una curva piatta e' ambigua - puo'
        # essere uno spazio uniforme o una misura mai arrivata.
        sources = {s.get("source") for s in self.perception_log}
        if sources == {"isovist"}:
            source = "isovist"
        elif "isovist" in sources:
            source = "mixed"
        else:
            source = "archetype_estimate"

        report = {
            "simulation_duration_s": round(self.elapsed_time, 2),
            "total_ticks": self.tick_count,
            "perception_samples": len(self.perception_log),
            "perception_source": source,
            "perception_timeline": self.perception_log,
            "agent_cognitive_maps": {},
            "zone_comfort_analysis": {},
        }

        # Cognitive map per ogni agente
        for agent in self.agents:
            if hasattr(agent, 'brain'):
                cog_map = agent.brain.get_cognitive_map_summary()
                report["agent_cognitive_maps"][agent.agent_id] = cog_map

                # Aggregare comfort a livello di zona
                for node_id, node_data in cog_map.items():
                    if node_id not in report["zone_comfort_analysis"]:
                        report["zone_comfort_analysis"][node_id] = []
                    report["zone_comfort_analysis"][node_id].append({
                        "agent_id": agent.agent_id,
                        "avg_visibility_pct": node_data["avg_visibility_pct"],
                        "avg_stress": node_data["avg_stress"],
                        "comfort_level": node_data["comfort_level"],
                    })

        return report
