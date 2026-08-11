"""
VERITAS Spatial AI - Core API
==============================
Espone il Core Python (engine.py / agent.py / behaviour.py / compliance.py /
topology_analyzer.py / path_loader.py) come servizio HTTP, cosi' il viewer
statico (Veritas-Spatial-57MB-Ready.html, su GitHub Pages) puo' usare il
motore reale invece della simulazione semplificata lato client.

STATO: predisposizione. Non ancora attivato su nessun hosting. Il codice del
Core NON e' stato toccato (come richiesto): questo file lo importa e basta.

Per attivarlo (quando deciso):
  1. Crea un servizio Web su Render (https://render.com), collega questo repo
  2. Build command:  pip install -r requirements.txt
  3. Start command:  uvicorn api_server:app --host 0.0.0.0 --port $PORT
  4. Copia l'URL pubblico che Render assegna e configuralo nel viewer HTML
     (nuova impostazione da aggiungere quando si attiva davvero)

Endpoint:
  GET  /health                 - verifica che il servizio sia vivo
  POST /api/analyze-topology   - analizza un modello .glb (URL pubblico) e
                                  restituisce il grafo di navigazione
                                  {"nodes": {...}, "mission_profiles": {...}}
  POST /api/simulate           - esegue la simulazione vera con il Core Python
                                  (SimulationEngine + HumanAgent reale) su un
                                  grafo + lista di agenti, restituisce KPI
                                  reali (non decorativi) + traiettoria animata
"""
import sys
import os

# --- Stesso fix percorsi usato in main.py: rende visibile Assets/ come sorgente moduli ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(BASE_DIR, "Assets")
if ASSETS_DIR not in sys.path:
    sys.path.insert(0, ASSETS_DIR)
# --- Fine fix percorsi ---

import json
import tempfile
from typing import Optional, List, Dict, Any

import requests as http_requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from core.engine import SimulationEngine
from core.topology_analyzer import TopologyAnalyzer
from core.recommendations import generate_recommendations

app = FastAPI(title="VERITAS Spatial AI - Core API", version="0.1.0")

_BENCHMARKS_PATH = os.path.join(BASE_DIR, "benchmarks.json")
try:
    with open(_BENCHMARKS_PATH, "r") as _f:
        REVENUE_BENCHMARKS = json.load(_f)
except FileNotFoundError:
    REVENUE_BENCHMARKS = {}

# CORS aperto durante la preparazione/test. Prima di andare in produzione con
# clienti reali, restringere allow_origins al dominio effettivo del viewer
# (es. "https://raffaella23.github.io").
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "veritas-core-api"}


class TopologyRequest(BaseModel):
    model_url: str  # URL pubblico del .glb (es. Supabase Storage) da analizzare


@app.post("/api/analyze-topology")
def analyze_topology(req: TopologyRequest):
    """
    Scarica un modello .glb da un URL pubblico e ne analizza la topologia
    reale (TopologyAnalyzer): zone navigabili, tag automatici, grafo di
    navigazione pronto per /api/simulate.
    """
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".glb", delete=False) as tmp:
            r = http_requests.get(req.model_url, timeout=30)
            r.raise_for_status()
            tmp.write(r.content)
            tmp_path = tmp.name

        analyzer = TopologyAnalyzer(tmp_path)
        analyzer.analyze_model()
        analyzer.get_navigable_zones()

        with tempfile.NamedTemporaryFile(mode="r", suffix=".json", delete=False) as out:
            out_path = out.name
        analyzer.export_navigation_graph(out_path)
        with open(out_path, "r") as f:
            graph = json.load(f)
        os.unlink(out_path)
        return graph
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


class AgentSpec(BaseModel):
    agent_id: str
    profile_id: str
    profile_data: Dict[str, Any] = {}
    domain: Optional[str] = None
    group_id: Optional[str] = None
    # Secondi di attesa prima che l'agente si metta in moto. Senza
    # sfasamento gli agenti partono tutti insieme e avanzano in blocco.
    start_delay: float = 0.0


class SimulateRequest(BaseModel):
    # Grafo nel formato prodotto da /api/analyze-topology:
    # {"nodes": {node_id: {"pos":[x,y,z], "meta":{...}}}, "mission_profiles": {profile_id: [node_id,...]}}
    graph: Dict[str, Any]
    agents: List[AgentSpec]
    ticks: int = 600      # numero di step; con dt=0.1 di default, 600 tick = 60s simulati
    dt: float = 0.1
    vvff_rules: Optional[List[Dict[str, Any]]] = None
    emergency: bool = False


@app.post("/api/simulate")
def simulate(req: SimulateRequest):
    """
    Esegue la simulazione con il Core Python reale (motore fisico + agenti
    con stato/stress/logica di dominio + validazione accessibilita') e
    restituisce KPI reali (flusso, tempo transito, saturazione, compliance)
    piu' la traiettoria animata per il viewer.
    """
    graph_path = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as tmp:
            json.dump(req.graph, tmp)
            graph_path = tmp.name

        engine = SimulationEngine(graph_path=graph_path, dt=req.dt, vvff_rules=req.vvff_rules)
        for a in req.agents:
            engine.add_agent(a.agent_id, a.profile_id, a.profile_data, domain=a.domain, group_id=a.group_id, start_delay=a.start_delay)
        if req.emergency:
            engine.trigger_emergency(True)

        for _ in range(req.ticks):
            engine.run_tick()

        kpi = engine.get_kpi_report()
        trajectory = json.loads(engine.export_trajectory(nodes=req.graph.get("nodes", {})))
        return {"kpi": kpi, "trajectory": trajectory}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if graph_path and os.path.exists(graph_path):
            os.unlink(graph_path)


class RecommendationsRequest(BaseModel):
    kpi: Dict[str, Any]
    domain: str = "generic"


@app.post("/api/recommendations")
def recommendations(req: RecommendationsRequest):
    try:
        context = {"domain": req.domain, "revenue_benchmarks": REVENUE_BENCHMARKS}
        return {"recommendations": generate_recommendations(req.kpi, context)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
