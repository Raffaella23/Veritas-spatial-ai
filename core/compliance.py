from typing import Dict, Any

class AccessibilityValidator:
    """Valida i nodi rispetto alle normative di accessibilità (XAUR/WCAG)."""
    
    # Soglie standard (possono essere modificate via configurazione)
    DEFAULT_SLOPE_THRESHOLD_PCT = 8.33 

    def __init__(self, domain_config: Dict[str, Any]):
        self.config = domain_config

    def validate_node(self, agent_profile: str, node_meta: Dict[str, Any]) -> Dict[str, Any]:
        """
        Valida i metadati del nodo e restituisce un report di conformità.
        """
        # Estrae i dati XAUR dal dizionario meta
        xa_data = node_meta.get("xa_data", {})
        
        # Stato di default: conforme
        report = {"pass": True, "violations": []}

        # 1. Controllo Pendenza (Accessibilità sedia a rotelle)
        if agent_profile == "wheelchair":
            slope = xa_data.get("slope_percent", 0)
            if slope > self.DEFAULT_SLOPE_THRESHOLD_PCT:
                report["pass"] = False
                report["violations"].append(f"Pendenza non conforme: {slope}% > {self.DEFAULT_SLOPE_THRESHOLD_PCT}%")

        # 2. Controllo Altezza (Clearance)
        min_height = self.config.get("min_clearance", 2.0)
        if xa_data.get("clearance_height_m", 2.5) < min_height:
            report["pass"] = False
            report["violations"].append("Altezza di passaggio insufficiente")

        return report
