import os
import json
import numpy as np
import trimesh
from sklearn.cluster import KMeans


# Parole chiave usate per etichettare automaticamente i nodi in base al nome
# degli oggetti nella scena 3D (se il modello li nomina in modo descrittivo).
# Questo e' cio' che permette all'agente di "specializzarsi" per dominio
# (sicurezza aeroportuale, museo, gaming) senza dover ricodificare a mano ogni scena.
DOMAIN_KEYWORDS = {
    "checkpoint": ["checkpoint", "security", "gate", "varco", "controllo"],
    "restricted": ["restricted", "riservato", "staff_only", "vietato"],
    "interest_level": ["exhibit", "opera", "artwork", "teca", "vetrina"],
    "objective": ["objective", "obiettivo", "target", "goal"],
    "hazard": ["hazard", "pericolo", "danger", "trap"],
}

# Percentuale di nodi (i piu' periferici rispetto al centro dell'area navigabile)
# candidati automaticamente come possibili ingressi/parcheggi, quando il modello
# non fornisce nomi descrittivi. E' un'euristica geometrica, non una vera
# comprensione semantica: gli ingressi tendono statisticamente a trovarsi ai
# margini dell'area calpestabile, non al centro.
ENTRANCE_BOUNDARY_FRACTION = 0.25

# Se la dimensione massima del modello grezzo supera questa soglia, si assume
# che sia espresso in millimetri (comune per export CAD/Revit/SketchUp) e viene
# riportato a metri. Senza questa correzione le distanze tra i nodi restano
# nell'ordine delle decine di migliaia di unita', e un agente che cammina a
# velocita' umana non arriva mai a destinazione in una simulazione realistica.
MM_DETECTION_THRESHOLD = 1000.0

# Mappa il "type" dichiarato a mano in config.json (hotspots) verso i tag
# di dominio gia' usati dal motore comportamentale. I punti caldi manuali
# sono piu' affidabili di qualunque euristica automatica: quando presenti,
# hanno sempre priorita'.
HOTSPOT_TYPE_TO_META = {
    "GATE": {"objective": True},
    "CHECK_IN": {"checkpoint": True},
    "CHECKPOINT": {"checkpoint": True},
    "SECURITY": {"checkpoint": True},
    "RESTRICTED": {"restricted": True},
    "EXHIBIT": {"interest_level": 1.0},
    "RETAIL": {"interest_level": 0.6},
    "HAZARD": {"hazard": True},
    "ENTRANCE": {"entrance": True},
    "PARKING": {"entrance": True},
}


class TopologyAnalyzer:
    def __init__(self, model_path: str):
        self.model_path = model_path
        self.scene = None
        self.mesh = None
        self.navigable_points = []
        self.nodes = {}  # {"n000": {"pos": [...], "meta": {...}}, ...}
        self._tag_hints = []  # [(centroid, tag_dict), ...] per oggetti nominati nella scena
        self.scale_applied = 1.0  # fattore di scala applicato per normalizzare il modello a metri

    def analyze_model(self):
        """Carica il modello 3D (.glb) ed estrae le superfici e i punti di navigazione."""
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Modello non trovato al percorso: {self.model_path}")

        loaded = trimesh.load(self.model_path, force='scene')

        tag_hints = []

        if isinstance(loaded, trimesh.Scene):
            self.scene = loaded
            geom_list = []
            for name, geom in self.scene.geometry.items():
                if isinstance(geom, trimesh.Trimesh):
                    geom_list.append(geom)
                    tag = self._tag_from_name(name)
                    if tag:
                        tag_hints.append((geom.centroid, tag))
            if geom_list:
                self.mesh = trimesh.util.concatenate(geom_list)
            else:
                raise ValueError("Nessuna geometria mesh valida trovata nella scena .glb")
        elif isinstance(loaded, trimesh.Trimesh):
            self.mesh = loaded
        else:
            raise ValueError("Formato del modello 3D non supportato.")

        self._tag_hints = tag_hints

        # --- Normalizzazione di scala: se il modello e' in millimetri, lo riporta a metri ---
        bbox_size = self.mesh.bounds[1] - self.mesh.bounds[0]
        if bbox_size.max() > MM_DETECTION_THRESHOLD:
            self.mesh.apply_scale(0.001)
            self.scale_applied = 0.001
            # Anche i punti di riferimento nominati (tag_hints) vanno riportati a metri
            self._tag_hints = [(np.array(c) * 0.001, t) for c, t in self._tag_hints]
            print("[TopologyAnalyzer] Scala rilevata in millimetri: applicato fattore 0.001 (modello riportato a metri).")

        vertices = self.mesh.vertices
        normals = self.mesh.vertex_normals

        if len(normals) == len(vertices):
            navigable_mask = normals[:, 1] > 0.75
            self.navigable_points = vertices[navigable_mask]

        if len(self.navigable_points) == 0:
            self.navigable_points = vertices

        print(f"[TopologyAnalyzer] Analisi completata. Estratti {len(self.navigable_points)} punti navigabili.")

    def _tag_from_name(self, object_name: str) -> dict:
        """Deduce un tag di dominio dal nome dell'oggetto nella scena 3D."""
        name_lower = object_name.lower()
        tag = {}
        for key, keywords in DOMAIN_KEYWORDS.items():
            if any(kw in name_lower for kw in keywords):
                tag[key] = 1.0 if key == "interest_level" else True
        return tag

    def _nearest_tag(self, position, max_distance=5.0) -> dict:
        """Associa a un punto il tag dell'oggetto nominato piu' vicino, se abbastanza vicino."""
        if not self._tag_hints:
            return {}
        best_tag, best_dist = {}, max_distance
        for centroid, tag in self._tag_hints:
            dist = np.linalg.norm(np.array(centroid) - np.array(position))
            if dist < best_dist:
                best_dist = dist
                best_tag = tag
        return best_tag

    def get_navigable_zones(self, num_clusters=10):
        """Esegue il clustering reale (KMeans) sui punti navigabili per definire i nodi."""
        if len(self.navigable_points) == 0:
            self.nodes = {}
            return []

        n_clusters = min(num_clusters, len(self.navigable_points))
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        kmeans.fit(self.navigable_points)

        centers = kmeans.cluster_centers_

        nodes = {}
        zones_list = []
        for i, center in enumerate(centers):
            node_id = f"n{i:03d}"
            meta = self._nearest_tag(center)
            nodes[node_id] = {
                "pos": [float(center[0]), float(center[1]), float(center[2])],
                "meta": meta
            }
            zones_list.append({"id": node_id, "center": nodes[node_id]["pos"], "meta": meta})

        self._tag_entrance_candidates(nodes)

        self.nodes = nodes
        return zones_list

    def inject_hotspots(self, hotspots: list):
        """
        Inserisce nel grafo i punti caldi dichiarati a mano in config.json
        (es. gate, check-in, varchi) come nodi espliciti, con priorita' sulle
        etichette dedotte automaticamente. Le coordinate dei punti caldi sono
        gia' espresse in metri reali dal file di configurazione, non vanno
        ri-scalate come la mesh grezza.

        hotspots: lista di dict nel formato di config.json, es.
            {"id": "gate_A1", "type": "GATE", "position3D": {"x":10,"y":0,"z":5},
             "note_VVFF": "...", "status": "OK"}
        """
        if not hotspots:
            return

        for hs in hotspots:
            pos3d = hs.get("position3D", {})
            pos = [float(pos3d.get("x", 0)), float(pos3d.get("y", 0)), float(pos3d.get("z", 0))]

            meta = dict(HOTSPOT_TYPE_TO_META.get(hs.get("type", "").upper(), {}))
            meta["label"] = hs.get("id", "hotspot")
            meta["source"] = "config"
            if "note_VVFF" in hs:
                meta["vvff_note"] = hs["note_VVFF"]
            if "status" in hs:
                meta["vvff_status"] = hs["status"]

            node_id = f"hotspot_{hs.get('id', len(self.nodes))}"
            self.nodes[node_id] = {"pos": pos, "meta": meta}

        print(f"[TopologyAnalyzer] Iniettati {len(hotspots)} punti caldi da config.json.")

    def _tag_entrance_candidates(self, nodes: dict):
        """
        Marca come possibili ingressi/parcheggi (meta['entrance'] = True) i nodi
        piu' periferici rispetto al centro dell'area navigabile (sul piano
        orizzontale X/Z), quando il nome degli oggetti non da' gia' un'indicazione
        piu' specifica. E' un'euristica geometrica: approssima il fatto che gli
        ingressi tendono a stare ai margini dell'edificio, non e' una vera
        identificazione semantica del punto.
        """
        if not nodes:
            return

        ids = list(nodes.keys())
        xs = np.array([nodes[nid]["pos"][0] for nid in ids])
        zs = np.array([nodes[nid]["pos"][2] for nid in ids])
        cx, cz = xs.mean(), zs.mean()
        dists = np.sqrt((xs - cx) ** 2 + (zs - cz) ** 2)

        n_entrances = max(1, round(len(ids) * ENTRANCE_BOUNDARY_FRACTION))
        boundary_idx = np.argsort(dists)[-n_entrances:]

        for idx in boundary_idx:
            nid = ids[idx]
            meta = nodes[nid]["meta"]
            # Non sovrascrive tag piu' specifici gia' dedotti dal nome dell'oggetto
            if not any(k in meta for k in ("checkpoint", "objective", "interest_level", "restricted", "hazard")):
                meta["entrance"] = True

    def export_navigation_graph(self, output_path: str):
        """
        Esporta il grafo nel formato atteso da PathLoader:
        { "nodes": {...}, "mission_profiles": {...} }

        I nodi vengono ordinati con una catena nearest-neighbor a partire dal primo,
        cosi' da produrre un percorso di visita sensato invece di un ordine casuale.
        I punti caldi manuali (iniettati con inject_hotspots) vengono aggiunti in coda
        a ogni profilo, cosi' restano sempre raggiungibili come tappe finali.
        Lo stesso percorso viene esposto sotto piu' nomi di profilo, cosi' da
        funzionare sia per il visitatore standard sia per i domini specializzati
        (sicurezza aeroportuale, museo, gaming, integrazione Unity).
        """
        if not self.nodes:
            self.get_navigable_zones()

        auto_ids = [nid for nid in self.nodes if not nid.startswith("hotspot_")]
        hotspot_ids = [nid for nid in self.nodes if nid.startswith("hotspot_")]

        ordered_auto = self._nearest_neighbor_order({nid: self.nodes[nid] for nid in auto_ids})
        ordered_ids = ordered_auto + hotspot_ids

        graph_data = {
            "version": "2.0",
            "model": os.path.basename(self.model_path),
            "scale_applied": self.scale_applied,
            "nodes": self.nodes,
            "mission_profiles": {
                "visitor_standard": ordered_ids,
                "airport_security": ordered_ids,
                "museum_visitor": ordered_ids,
                "gaming_player": ordered_ids,
                "unity_bridge": ordered_ids,
            }
        }

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(graph_data, f, indent=4)
        print(f"[TopologyAnalyzer] Grafo di navigazione salvato in {output_path}")
        return graph_data

    def _nearest_neighbor_order(self, nodes: dict) -> list:
        """Ordina i nodi con una catena nearest-neighbor greedy, a partire dal primo inserito."""
        if not nodes:
            return []

        ids = list(nodes.keys())
        remaining = set(ids)
        current = ids[0]
        ordered = [current]
        remaining.remove(current)

        while remaining:
            cur_pos = np.array(nodes[current]["pos"])
            next_id = min(
                remaining,
                key=lambda nid: np.linalg.norm(np.array(nodes[nid]["pos"]) - cur_pos)
            )
            ordered.append(next_id)
            remaining.remove(next_id)
            current = next_id

        return ordered

    def export_visualization_html(self, output_path="topology_debug.html"):
        """Genera una visualizzazione 3D interattiva (HTML) dei punti navigabili e dei nodi individuati."""
        try:
            import plotly.graph_objects as go
        except ImportError:
            print("[TopologyAnalyzer] Libreria 'plotly' non installata: visualizzazione HTML saltata.")
            print("Installa con: pip install plotly")
            return None

        fig = go.Figure()

        if len(self.navigable_points) > 0:
            fig.add_trace(go.Scatter3d(
                x=self.navigable_points[:, 0],
                y=self.navigable_points[:, 1],
                z=self.navigable_points[:, 2],
                mode='markers',
                marker=dict(size=1.5, color='lightblue', opacity=0.4),
                name='Punti navigabili'
            ))

        if self.nodes:
            xs = [n["pos"][0] for n in self.nodes.values()]
            ys = [n["pos"][1] for n in self.nodes.values()]
            zs = [n["pos"][2] for n in self.nodes.values()]
            labels = [n["meta"].get("label", nid) for nid, n in self.nodes.items()]

            fig.add_trace(go.Scatter3d(
                x=xs, y=ys, z=zs,
                mode='markers+text',
                marker=dict(size=6, color='red'),
                text=labels,
                name='Nodi (centri cluster + punti caldi)'
            ))

            ordered_ids = self._nearest_neighbor_order({k: v for k, v in self.nodes.items() if not k.startswith("hotspot_")})
            path_coords = [self.nodes[nid]["pos"] for nid in ordered_ids]
            if len(path_coords) > 1:
                px = [p[0] for p in path_coords]
                py = [p[1] for p in path_coords]
                pz = [p[2] for p in path_coords]
                fig.add_trace(go.Scatter3d(
                    x=px, y=py, z=pz,
                    mode='lines',
                    line=dict(color='orange', width=3),
                    name='Percorso suggerito'
                ))

        fig.update_layout(
            title=f"Topologia estratta - {os.path.basename(self.model_path)} (scala applicata: {self.scale_applied})",
            scene=dict(aspectmode='data')
        )

        fig.write_html(output_path)
        print(f"[TopologyAnalyzer] Visualizzazione HTML salvata in {output_path}")
        return output_path
