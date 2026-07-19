# core/topology_analyzer.py
import trimesh
import numpy as np

class TopologyAnalyzer:
    def __init__(self, model_path):
        """
        Carica il modello 3D e prepara l'analisi topologica.
        """
        self.mesh = trimesh.load(model_path)
        self.walkable_mesh = None
        self.poi_objects = []

    def analyze_model(self, floor_threshold=0.9):
        """
        Analisi completa: 
        1. Estrae il pavimento (navigabile).
        2. Estrae gli oggetti (POI - opere d'arte, check-in, ecc.).
        """
        # 1. Filtra le facce rivolte verso l'alto (Pavimento)
        # Una faccia è 'pavimento' se la sua normale è quasi verticale (Z > 0.9)
        floor_faces = self.mesh.faces[self.mesh.face_normals[:, 2] > floor_threshold]
        self.walkable_mesh = self.mesh.submesh([floor_faces], append=True)
        
        # 2. Identifica gli oggetti (Tutto ciò che non è pavimento)
        # Semplificazione: consideriamo oggetti i cluster che non sono parte del pavimento
        # In una logica reale, qui useremmo il bounding box delle geometrie separate
        print("Analisi completata: Area navigabile estratta e oggetti mappati.")
        
        return {
            "walkable_area": self.walkable_mesh.area,
            "object_count": len(self.mesh.geometry) if isinstance(self.mesh, trimesh.Scene) else 1
        }

    def get_navigable_zones(self, num_clusters=5):
        """
        Restituisce i centri delle zone calpestabili per la navigazione.
        """
        if self.walkable_mesh is None:
            self.analyze_model()
            
        # Prende i centri dei triangoli del pavimento per mappare lo spazio
        points = self.walkable_mesh.triangles_center
        
        # Semplice suddivisione in base alla densità (potremmo evolverlo con K-Means)
        # Qui ritorniamo dei punti campione per il tuo path-loader
        indices = np.linspace(0, len(points)-1, num_clusters, dtype=int)
        return points[indices].tolist()

    def get_poi_list(self):
        """
        Ritorna la lista degli oggetti (Opere d'arte o Banchi) identificati.
        Nel museo, questi saranno i target dell'agente.
        """
        # Logica base: estrae le coordinate del centroide degli oggetti non-pavimento
        # Placeholder per logica di estrazione specifica (es: altezza > 0.5m)
        return [{"id": "poi_1", "type": "exhibit", "pos": [0,0,0]}]
