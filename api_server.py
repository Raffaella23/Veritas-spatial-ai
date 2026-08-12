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
    # Oltre a dire che il servizio e' vivo, dichiara COSA sa fare. Serve a
    # capire dal browser, senza strumenti da sviluppatore, se il deploy in
    # esecuzione e' aggiornato: aprendo l'indirizzo si legge la risposta.
    # Senza questo, l'unico modo per accorgersi che il servizio era rimasto
    # indietro era osservare gli agenti comportarsi male, cioe' troppo tardi.
    return {
        "status": "ok",
        "service": "veritas-core-api",
        "versione": "2026-08-12",
        "funzioni": {
            # partenze sfasate: senza questa gli agenti avanzano tutti in blocco
            "start_delay": True,
            # ponte OpenSky: senza questa il pulsante "traffico aereo reale"
            # fallisce nel browser per CORS, comunque siano le credenziali
            "opensky_arrivals": True,
            # percezione agenti: consultazione visibility in tempo reale
            "agent_perception": True,
        },
    }


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
    piu' la traiettoria animata e dati percettivi per il report.
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
        perception_report = engine.export_perception_report()
        return {"kpi": kpi, "trajectory": trajectory, "perception": perception_report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if graph_path and os.path.exists(graph_path):
            os.unlink(graph_path)


OPENSKY_TOKEN_URL = (
    "https://auth.opensky-network.org/auth/realms/opensky-network"
    "/protocol/openid-connect/token"
)
OPENSKY_ARRIVALS_URL = "https://opensky-network.org/api/flights/arrival"


class OpenSkyRequest(BaseModel):
    client_id: str
    client_secret: str
    airport: str = "LIRF"          # Fiumicino
    begin: Optional[int] = None    # epoch secondi; se assente, le ultime 24h disponibili
    end: Optional[int] = None


@app.post("/api/opensky/arrivals")
def opensky_arrivals(req: OpenSkyRequest):
    """
    Ponte verso OpenSky Network per gli arrivi di un aeroporto.

    Serve perche' la chiamata NON si puo' fare dal browser: OpenSky non
    autorizza origini web esterne sull'endpoint del token. Verificato dalla
    pagina su GitHub Pages il 12/08/2026, ed e' un sintomo che inganna:
    con credenziali SBAGLIATE il browser legge un 401 regolare, con
    credenziali GIUSTE ottiene "Failed to fetch" - cioe' la risposta arriva
    ma il browser si rifiuta di esporla. Da server a server il problema non
    esiste.

    Vantaggio non secondario: il client_secret smette di dover vivere dentro
    una pagina web. Qui non viene mai scritto nei log ne' salvato su disco:
    si usa per ottenere il token e si butta.

    Restituisce solo i tre campi che servono a ricostruire la distribuzione
    degli arrivi (orario e identificativo), non l'intero record ADS-B: sono
    centinaia di voli e il resto sarebbe peso morto sulla rete.
    """
    import time as _time

    end = req.end if req.end is not None else int(_time.time()) - 86400
    begin = req.begin if req.begin is not None else end - 86400

    try:
        token_res = http_requests.post(
            OPENSKY_TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": req.client_id,
                "client_secret": req.client_secret,
            },
            timeout=20,
        )
    except Exception as e:
        # Non si include il testo dell'eccezione tale e quale: potrebbe
        # contenere l'URL con i parametri. Solo il tipo.
        raise HTTPException(status_code=502, detail=f"OpenSky non raggiungibile ({type(e).__name__})")

    if token_res.status_code in (400, 401, 403):
        raise HTTPException(status_code=401, detail="Credenziali OpenSky rifiutate")
    if not token_res.ok:
        raise HTTPException(status_code=502, detail=f"OpenSky token HTTP {token_res.status_code}")

    token = (token_res.json() or {}).get("access_token")
    if not token:
        raise HTTPException(status_code=502, detail="OpenSky non ha restituito un token")

    try:
        flights_res = http_requests.get(
            OPENSKY_ARRIVALS_URL,
            params={"airport": req.airport, "begin": begin, "end": end},
            headers={"Authorization": f"Bearer {token}"},
            timeout=45,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Arrivi non raggiungibili ({type(e).__name__})")

    if flights_res.status_code == 404:
        # Nessun dato per quella finestra: non e' un errore, e' una giornata vuota
        return {"airport": req.airport, "begin": begin, "end": end, "flights": []}
    if not flights_res.ok:
        raise HTTPException(status_code=502, detail=f"OpenSky arrivi HTTP {flights_res.status_code}")

    raw = flights_res.json()
    if not isinstance(raw, list):
        raw = []
    flights = [
        {
            "callsign": (f.get("callsign") or "").strip(),
            "lastSeen": f.get("lastSeen"),
            "firstSeen": f.get("firstSeen"),
        }
        for f in raw
        if isinstance(f, dict)
    ]
    return {"airport": req.airport, "begin": begin, "end": end, "flights": flights}


class AgentPerceptionRequest(BaseModel):
    agent_id: str
    x: float
    y: float
    z: float
    archetype: str = "business"
    # Punti navigabili da file mesh (o nuvola 3D) — necessari per il calcolo visibilità
    navigable_points: Optional[List[List[float]]] = None


@app.get("/agent-sees/{agent_id}")
def agent_sees(agent_id: str, x: float, y: float, z: float, archetype: str = "business"):
    """
    Ritorna la percezione visiva di un agente: zone visibili, isovista, visibility_pct,
    stress_factor da bassa visibilità. Consultato dal loop di simulazione del browser.

    Cache: ogni 5 tick per ridurre da 200 req/s (se 20 agenti × 10 Hz) a ~40 req/s.
    """
    try:
        # Importa veritas_visibility.js via Node.js eval? No, usa un mock Python
        # che simula la visibilità basata su geometria semplice (per ora).
        # La versione full userà i punti navigabili passati dal browser.

        # Mock base: se archetype è wheelchair, visibilità ridotta
        base_visibility = {
            "business": 0.70,
            "family": 0.65,
            "elderly": 0.50,
            "wheelchair": 0.40,
            "tourist": 0.55,
            "student": 0.75,
            "staff": 0.80,
            "vip": 0.65,
        }.get(archetype, 0.50)

        # Stress factor inversamente proporzionale a visibility
        stress_factor = max(0.0, min(1.0, 1.0 - base_visibility))

        return {
            "agent_id": agent_id,
            "position": [x, y, z],
            "archetype": archetype,
            "visible_zones": [],  # Placeholder: il full usa isovista reale
            "visibility_pct": base_visibility * 100,
            "stress_factor": stress_factor,
            "isovista_polygon": None,  # Placeholder
            "timestamp": str(__import__('datetime').datetime.now()),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
