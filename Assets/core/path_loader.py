import json
import numpy as np
from typing import List

class PathLoader:
    """Carica i percorsi basati sui profili missione definiti nel JSON."""
    
    def __init__(self, graph_path: str):
        with open(graph_path, 'r') as f:
            self.data = json.load(f)
            
    def get_waypoints(self, profile_id: str) -> List[np.ndarray]:
        """Restituisce la lista di waypoint per un dato profilo."""
        if profile_id not in self.data['mission_profiles']:
            raise ValueError(f"Profile {profile_id} not found in graph.")
            
        node_ids = self.data['mission_profiles'][profile_id]
        return [np.array(self.data['nodes'][nid]['pos'], dtype=float) for nid in node_ids]

    def get_node_metadata(self, node_id: str):
        """Recupera i metadati di un nodo specifico per la compliance."""
        return self.data['nodes'].get(node_id, {}).get('meta', {})
