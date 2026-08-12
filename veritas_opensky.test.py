"""Prova del ponte /api/opensky/arrivals con risposte OpenSky simulate.

    python3 veritas_opensky.test.py       (serve: fastapi, httpx)

Verifica la mappatura degli errori, che e' il punto dolente: dal browser una
credenziale sbagliata e un servizio irraggiungibile davano lo stesso messaggio,
e si perdeva tempo sulla causa sbagliata.

Il Core (numpy/trimesh/sklearn) non serve a questo endpoint: lo si sostituisce
con degli stub, cosi' la prova gira ovunque senza installare mezzo mondo.
Le chiamate a OpenSky sono simulate: nessuna rete, nessuna credenziale vera.
"""
import sys, types, time

for nome in ("numpy", "trimesh", "sklearn", "plotly"):
    sys.modules.setdefault(nome, types.ModuleType(nome))
core = types.ModuleType("core"); core.__path__ = []
sys.modules["core"] = core
for mod, attrs in (("core.engine", ["SimulationEngine"]),
                   ("core.topology_analyzer", ["TopologyAnalyzer"]),
                   ("core.recommendations", ["generate_recommendations"])):
    m = types.ModuleType(mod)
    for a in attrs:
        setattr(m, a, object)
    sys.modules[mod] = m

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
import api_server
from fastapi.testclient import TestClient

client = TestClient(api_server.app, raise_server_exceptions=False)
falliti = []


def check(nome, ok, dettaglio=""):
    print(("  ok  " if ok else " FAIL ") + nome + ("   " + dettaglio if dettaglio else ""))
    if not ok:
        falliti.append(nome)


class Risposta:
    def __init__(self, status, payload=None):
        self.status_code = status
        self._payload = payload
        self.ok = 200 <= status < 300

    def json(self):
        return self._payload


VISTO = {}


def finto(token_status=200, token_body=None, voli_status=200, voli_body=None,
          token_exc=None, voli_exc=None):
    def post(url, data=None, timeout=None, **kw):
        VISTO["token_data"] = data
        if token_exc:
            raise token_exc
        return Risposta(token_status, token_body if token_body is not None else {"access_token": "T0K3N"})

    def get(url, params=None, headers=None, timeout=None, **kw):
        VISTO["voli_params"] = params
        VISTO["voli_headers"] = headers
        if voli_exc:
            raise voli_exc
        return Risposta(voli_status, voli_body if voli_body is not None else [])
    finto_mod = types.SimpleNamespace(post=post, get=get)
    api_server.http_requests = finto_mod


CRED = {"client_id": "tizio@example.com-api-client", "client_secret": "segretissimo"}

# --- caso buono -------------------------------------------------------------
finto(voli_body=[
    {"callsign": "AZA123 ", "lastSeen": 1000, "firstSeen": 900, "icao24": "abc", "estDepartureAirport": "LIN"},
    {"callsign": None, "lastSeen": 2000, "firstSeen": 1900},
    "spazzatura",
])
r = client.post("/api/opensky/arrivals", json=CRED)
check("caso buono: 200", r.status_code == 200, str(r.status_code))
body = r.json()
check("scarta le voci non valide", len(body["flights"]) == 2, str(len(body["flights"])))
check("tiene solo i tre campi utili",
      set(body["flights"][0]) == {"callsign", "lastSeen", "firstSeen"}, str(set(body["flights"][0])))
check("ripulisce il callsign", body["flights"][0]["callsign"] == "AZA123", repr(body["flights"][0]["callsign"]))
check("callsign assente non rompe", body["flights"][1]["callsign"] == "", repr(body["flights"][1]["callsign"]))
check("finestra: 24h che finiscono ieri",
      body["end"] <= int(time.time()) - 86000 and body["end"] - body["begin"] == 86400,
      f"{body['begin']} -> {body['end']}")
check("il token usa client_credentials", VISTO["token_data"]["grant_type"] == "client_credentials")
check("il secret viene inoltrato solo a OpenSky", VISTO["token_data"]["client_secret"] == "segretissimo")
check("il bearer arriva agli arrivi", VISTO["voli_headers"]["Authorization"] == "Bearer T0K3N")
check("aeroporto predefinito LIRF", VISTO["voli_params"]["airport"] == "LIRF")

# --- credenziali rifiutate --------------------------------------------------
for st in (400, 401, 403):
    finto(token_status=st, token_body={})
    r = client.post("/api/opensky/arrivals", json=CRED)
    check(f"OpenSky {st} -> 401 al browser", r.status_code == 401, str(r.status_code))
    check(f"  e lo dice in chiaro ({st})", "rifiutate" in r.json().get("detail", ""), r.json().get("detail", ""))

# --- token senza access_token ----------------------------------------------
finto(token_body={"qualcosa": "altro"})
r = client.post("/api/opensky/arrivals", json=CRED)
check("token vuoto -> 502", r.status_code == 502, str(r.status_code))

# --- OpenSky irraggiungibile ------------------------------------------------
finto(token_exc=ConnectionError("boom"))
r = client.post("/api/opensky/arrivals", json=CRED)
check("token irraggiungibile -> 502", r.status_code == 502, str(r.status_code))
check("  il messaggio non contiene l'eccezione grezza",
      "boom" not in r.json().get("detail", "") and "ConnectionError" in r.json().get("detail", ""),
      r.json().get("detail", ""))

finto(voli_exc=ConnectionError("boom"))
r = client.post("/api/opensky/arrivals", json=CRED)
check("arrivi irraggiungibili -> 502", r.status_code == 502, str(r.status_code))

# --- giornata vuota ---------------------------------------------------------
finto(voli_status=404)
r = client.post("/api/opensky/arrivals", json=CRED)
check("404 sugli arrivi = giornata vuota, non errore",
      r.status_code == 200 and r.json()["flights"] == [], str(r.status_code))

# --- risposta non lista -----------------------------------------------------
finto(voli_body={"non": "una lista"})
r = client.post("/api/opensky/arrivals", json=CRED)
check("risposta inattesa -> lista vuota, non eccezione",
      r.status_code == 200 and r.json()["flights"] == [], str(r.status_code))

# --- richiesta malformata ---------------------------------------------------
r = client.post("/api/opensky/arrivals", json={"client_id": "solo-id"})
check("secret mancante -> 422", r.status_code == 422, str(r.status_code))

# --- finestra esplicita -----------------------------------------------------
finto()
r = client.post("/api/opensky/arrivals", json={**CRED, "airport": "LIML", "begin": 100, "end": 200})
check("finestra e aeroporto espliciti rispettati",
      VISTO["voli_params"] == {"airport": "LIML", "begin": 100, "end": 200}, str(VISTO["voli_params"]))

# --- /health dichiara la nuova funzione ------------------------------------
h = client.get("/health").json()
check("/health dichiara opensky_arrivals", h["funzioni"].get("opensky_arrivals") is True, str(h["funzioni"]))

print()
print(f"{len(falliti)} PROVE FALLITE: {falliti}" if falliti else "tutte le prove passano")
sys.exit(1 if falliti else 0)
