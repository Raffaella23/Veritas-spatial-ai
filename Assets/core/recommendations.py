"""
VERITAS Spatial AI - Motore di raccomandazioni (Fase 5-6)
============================================================
Traduce i KPI prodotti da SimulationEngine.get_kpi_report() in raccomandazioni
operative (Problem -> Cause -> Recommendation -> Priority -> Expected
Improvement) con stima dell'impatto economico, usando i benchmark di settore
in benchmarks.json.
"""


def generate_recommendations(kpi: dict, context: dict) -> list[dict]:
    recommendations = []
    domain = context.get("domain", "generic")
    benchmarks = context.get("revenue_benchmarks", {})

    saturazione = kpi.get("saturazione_checkpoint_pct", 0.0)
    tempo_transito = kpi.get("tempo_transito_medio_s", 0.0)
    violazioni = kpi.get("violazioni_compliance", 0)
    rallentamenti = kpi.get("rallentamenti", 0)
    agenti_completati = kpi.get("agenti_completati", 0)

    DEFAULT_DAILY_PASSENGERS = 5000
    DAYS_PER_MONTH = 30

    if saturazione > 70.0:
        revenue_impact = None
        if domain == "airport":
            spend_per_min = benchmarks.get("airport", {}).get("spend_per_extra_dwell_minute_eur", 0.25)
            monthly_passengers = DEFAULT_DAILY_PASSENGERS * DAYS_PER_MONTH
            revenue_impact = round(monthly_passengers * 4.0 * spend_per_min, 2)
        elif domain == "museum":
            ticket_price = benchmarks.get("museum", {}).get("avg_ticket_price_eur", 11.97)
            shop_conv = benchmarks.get("museum", {}).get("shop_spend_conversion_pct", 25.0) / 100.0
            hourly_cap = benchmarks.get("museum", {}).get("avg_hourly_capacity_before_overcrowding", 200.0)
            extra_visitors_month = hourly_cap * 0.05 * 8 * DAYS_PER_MONTH
            revenue_impact = round(extra_visitors_month * (ticket_price + (ticket_price * shop_conv * 0.4)), 2)
        recommendations.append({
            "problem": "Saturazione elevata al checkpoint di sicurezza/controllo",
            "cause": "Tempo medio di attesa superiore alla soglia accettabile e varchi insufficienti rispetto al flusso",
            "recommendation": "Aggiungere un varco di controllo attivo o implementare un sistema di gestione dinamica delle code",
            "priority": "alta",
            "expected_improvement": "Riduzione della saturazione dei checkpoint di almeno il 25-30%",
            "estimated_revenue_impact_eur_per_month": revenue_impact
        })
    elif 40.0 <= saturazione <= 70.0:
        recommendations.append({
            "problem": "Saturazione moderata al checkpoint",
            "cause": "Flussi di transito non perfettamente bilanciati nei momenti di picco",
            "recommendation": "Ribilanciare la segnaletica direzionale e introdurre personale di supporto temporaneo",
            "priority": "media",
            "expected_improvement": "Stabilizzazione della saturazione sotto la soglia del 40%",
            "estimated_revenue_impact_eur_per_month": None
        })

    IDEAL_TRANSIT_TIME_S = 100.0
    if tempo_transito > IDEAL_TRANSIT_TIME_S * 1.3:
        priority = "alta" if tempo_transito > (IDEAL_TRANSIT_TIME_S * 1.6) else "media"
        revenue_impact = None
        if domain == "airport":
            spend_per_min = benchmarks.get("airport", {}).get("spend_per_extra_dwell_minute_eur", 0.25)
            saved_mins = (tempo_transito - IDEAL_TRANSIT_TIME_S) / 60.0
            monthly_passengers = DEFAULT_DAILY_PASSENGERS * DAYS_PER_MONTH
            revenue_impact = round(monthly_passengers * saved_mins * spend_per_min * 0.5, 2)
        elif domain == "museum":
            ticket_price = benchmarks.get("museum", {}).get("avg_ticket_price_eur", 11.97)
            shop_conv = benchmarks.get("museum", {}).get("shop_spend_conversion_pct", 25.0) / 100.0
            extra_visitors_month = 50 * DAYS_PER_MONTH
            revenue_impact = round(extra_visitors_month * ticket_price * (1.0 + shop_conv), 2)
        recommendations.append({
            "problem": "Tempo di transito medio superiore del 30% rispetto al valore ideale",
            "cause": "Presenza di colli di bottiglia geometrici o percorsi non ottimali lungo il tragitto",
            "recommendation": "Ridisegnare il layout dei corridoi critici o rimuovere elementi di intralcio fisico",
            "priority": priority,
            "expected_improvement": f"Riduzione del tempo di transito verso il target ideale di {IDEAL_TRANSIT_TIME_S}s",
            "estimated_revenue_impact_eur_per_month": revenue_impact
        })

    if violazioni > 0:
        recommendations.append({
            "problem": "Rilevate violazioni dei requisiti di accessibilita' e compliance",
            "cause": "Spazi di manovra ridotti o barriere architettoniche nei punti di passaggio chiave",
            "recommendation": "Adeguare immediatamente le dimensioni dei passaggi e dei varchi alle normative vigenti di accessibilita' universale",
            "priority": "alta",
            "expected_improvement": "Azzeramento totale delle violazioni di compliance e miglioramento della sicurezza",
            "estimated_revenue_impact_eur_per_month": None
        })

    if rallentamenti > agenti_completati * 0.2:
        recommendations.append({
            "problem": "Possibile collo di bottiglia strutturale lungo il percorso",
            "cause": "Numero elevato di eventi di rallentamento rispetto al volume di completamento",
            "recommendation": "Allargare i punti di strozzatura identificati o creare percorsi alternativi di sfollamento",
            "priority": "media",
            "expected_improvement": "Diminuzione degli eventi di rallentamento del 50% e incremento della fluidita'",
            "estimated_revenue_impact_eur_per_month": None
        })

    return recommendations
