from typing import Dict, Any, List, Optional

class AccessibilityValidator:
    """Valida i nodi rispetto alle normative di accessibilita' (XAUR/WCAG) e,
    quando disponibili, alle regole di sicurezza antincendio (VVFF) dichiarate
    in config.json."""

    # Soglie standard (possono essere modificate via configurazione)
    DEFAULT_SLOPE_THRESHOLD_PCT = 8.33

    def __init__(self, domain_config: Dict[str, Any], vvff_rules: Optional[List[Dict[str, Any]]] = None):
        self.config = domain_config
        # Regole VVFF reali (es. larghezza minima uscite), da config.json:
        # [{"id": "uscita_1", "larghezza_min": 1.2}, ...]
        self.vvff_rules = vvff_rules or []
        self._vvff_by_id = {r["id"]: r for r in self.vvff_rules if "id" in r}
        self._min_larghezza_globale = (
            min((r["larghezza_min"] for r in self.vvff_rules if "larghezza_min" in r), default=None)
        )

    def validate_node(self, agent_profile: str, node_meta: Dict[str, Any]) -> Dict[str, Any]:
        """
        Valida i metadati del nodo e restituisce un report di conformita'.
        """
        # Estrae i dati XAUR dal dizionario meta
        xa_data = node_meta.get("xa_data", {})

        # Stato di default: conforme
        report = {"pass": True, "violations": []}

        # 1. Controllo Pendenza (Accessibilita' sedia a rotelle)
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

        # 3. Controllo Larghezza Varco/Uscita (norma VVFF, da config.json)
        # Un nodo puo' dichiarare esplicitamente a quale regola VVFF fa riferimento
        # (vvff_rule_id) oppure la propria larghezza misurata (exit_width_m); in
        # assenza di un riferimento esplicito si applica, per prudenza, la soglia
        # minima piu' restrittiva fra tutte le regole configurate.
        exit_width = node_meta.get("exit_width_m")
        if exit_width is not None and self.vvff_rules:
            rule_id = node_meta.get("vvff_rule_id")
            rule = self._vvff_by_id.get(rule_id) if rule_id else None
            larghezza_min = (
                rule["larghezza_min"] if rule and "larghezza_min" in rule
                else self._min_larghezza_globale
            )
            if larghezza_min is not None and exit_width < larghezza_min:
                report["pass"] = False
                report["violations"].append(
                    f"Larghezza varco non conforme (norma VVFF): {exit_width}m < {larghezza_min}m"
                )

        # 4. Stato VVFF gia' dichiarato a mano sul punto caldo (config.json hotspots)
        # Se chi ha censito il punto ha gia' indicato uno stato di non conformita',
        # lo riportiamo cosi' com'e', invece di ignorarlo.
        vvff_status = node_meta.get("vvff_status")
        if vvff_status and vvff_status.upper() != "OK":
            report["pass"] = False
            note = node_meta.get("vvff_note", "")
            report["violations"].append(f"Stato VVFF dichiarato non conforme ({vvff_status}): {note}".strip())

        return report
