"""
veritas_brain_server.py — IL CERVELLO

Due endpoint, e fanno due mestieri diversi:

  POST /api/analyze-view   il vecchio. Guarda una scena dagli occhi di un
                           agente e risponde in PROSA. Invariato: chi lo usa
                           oggi continua a funzionare identico.

  POST /api/comprendi      il nuovo. E' la meta' "cervello" del ciclo di
                           `veritas_comprensione.js`, e risponde in JSON.

PERCHE' SERVIVA UN SECONDO ENDPOINT

Un verdetto che deve APRIRE UN CANCELLO non puo' essere un tema di cento
parole. `veritas_comprensione.js` non chiede un parere: chiede una struttura
con `capito`, `fiducia`, `dubbi`, e la usa per decidere se la simulazione puo'
partire. La prosa non e' verificabile da un programma, e infatti in dieci
giorni non l'ha verificata nessuno.

Non si e' toccato il vecchio endpoint perche' il suo mestiere e' un altro e lo
fa bene: raccontare una scena a un essere umano.

⚠️ TRE DIFETTI CORRETTI QUI, e tutti e tre avrebbero fermato l'anello

1. IL THROTTLE STROZZAVA IL CICLO. Il limite era uno solo, condiviso, una
   richiesta ogni 2 secondi. Ma il ciclo occhio-cervello fa fino a TRE
   chiamate di fila per capire un edificio: la seconda avrebbe preso 429 e
   l'anello si sarebbe spezzato al primo giro. Adesso i due endpoint hanno
   contatori separati, e quello del ciclo e' tarato sul giro (0,5 s).

2. IL SERVER NON PARTIVA SENZA CHIAVE. `raise RuntimeError` all'import: senza
   `OPENAI_API_KEY` non si accendeva nemmeno `/health`. Adesso l'errore arriva
   quando serve davvero — alla richiesta — e dice cosa manca.

3. NON SI POTEVA USARE LM STUDIO. Il client era inchiodato su OpenAI. Adesso
   `OPENAI_BASE_URL` lo fa puntare a un modello locale, e questo e' il fronte
   aperto n.2 dell'HANDOFF: provare l'occhio senza spendere un centesimo.
       export OPENAI_BASE_URL=http://localhost:1234/v1
       export OPENAI_API_KEY=lm-studio        # LM Studio la ignora
       export VERITAS_MODEL=qwen2-vl-7b-instruct

⚠️ QUI NON SI GIUDICA E NON SI CORREGGE. Questo endpoint passa la domanda al
   modello e restituisce la sua risposta GREZZA. Non la reinterpreta, non la
   "aggiusta", non inventa un `capito: true` se il modello non l'ha detto.
   Chi giudica e' `leggiVerdetto()` in `veritas_comprensione.js`, ed e' giusto
   che stia da una parte sola.
"""

import os
import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

app = FastAPI(title="VERITAS Spatial Brain", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Il modello: OpenAI oppure un modello locale, senza cambiare una riga
# ============================================================================

MODELLO = os.getenv("VERITAS_MODEL", "gpt-4o-mini")
BASE_URL = os.getenv("OPENAI_BASE_URL")          # LM Studio, Ollama, ecc.
API_KEY = os.getenv("OPENAI_API_KEY")

_client = None


def cliente():
    """
    Costruisce il client alla prima richiesta, non all'import.

    ⚠️ La differenza non e' di stile. Prima, senza chiave, il processo moriva
       in partenza e nemmeno `/health` rispondeva: impossibile capire se il
       servizio fosse su. Adesso il server si accende sempre e l'errore arriva
       dove si puo' leggere.
    """
    global _client
    if _client is not None:
        return _client

    if not API_KEY and not BASE_URL:
        raise HTTPException(
            status_code=503,
            detail="Nessun modello configurato: serve OPENAI_API_KEY, "
                   "oppure OPENAI_BASE_URL per un modello locale (LM Studio).",
        )

    try:
        _client = OpenAI(
            api_key=API_KEY or "non-serve",     # i server locali la ignorano
            base_url=BASE_URL or None,
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Client non inizializzabile: {e}")

    return _client


# ============================================================================
# Throttle — uno per endpoint, non uno solo per tutti
# ============================================================================

_ultima = {}


def freno(chiave: str, secondi: float):
    ora = time.time()
    if ora - _ultima.get(chiave, 0) < secondi:
        raise HTTPException(
            status_code=429,
            detail=f"Troppe richieste su {chiave}: max una ogni {secondi}s",
        )
    _ultima[chiave] = ora


# ============================================================================
# Contratti
# ============================================================================

class VisionPayload(BaseModel):
    image_data: str                    # base64 puro, senza il prefisso "data:"


class ComprensionePayload(BaseModel):
    """Quello che manda `veritas_comprensione.js` a ogni giro."""
    domanda: str                       # il prompt costruito da promptCervello()
    image_data: str | None = None      # la pianta dall'alto, base64 puro
    giro: int = 1


# ============================================================================
# 1. Il vecchio endpoint — INVARIATO
# ============================================================================

@app.post("/api/analyze-view")
async def analyze_view(payload: VisionPayload):
    """Analizza la visione dell'agente e risponde in prosa, per un umano."""
    freno("analyze-view", 2.0)

    if not payload.image_data or not payload.image_data.strip():
        raise HTTPException(status_code=400, detail="Image data is empty or missing")
    if len(payload.image_data) > 10_000_000:
        raise HTTPException(status_code=413, detail="Image data too large (max 10MB)")

    prompt = """
    Sei il cervello cognitivo di un agente autonomo che esplora uno spazio reale.
    L'agente vede questa scena da un'altezza di occhi (circa 1.65m dal suolo).

    Analizza la visione e fornisci un report BREVE con:
    1. Descrizione: Che ambiente e'? Ostacoli visibili?
    2. Sicurezza: Pericoli di inciampo, uscite, aree ristrette?
    3. Fruibilita': E' navigabile? Segnaletica chiara?
    4. Prossima mossa: Che direzione dovrebbe prendere l'agente?

    Sii conciso (max 100 parole). Usa punti numerati.
    """

    try:
        risposta = cliente().chat.completions.create(
            model=MODELLO,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {
                        "url": f"data:image/jpeg;base64,{payload.image_data}"}},
                ],
            }],
            max_tokens=300,
            timeout=15,
        )
        return {
            "status": "success",
            "report": risposta.choices[0].message.content,
            "model": MODELLO,
            "tokens_used": getattr(risposta.usage, "total_tokens", None),
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[cervello] errore: {e}")
        raise HTTPException(status_code=500, detail=f"Errore del modello: {e}")


# ============================================================================
# 2. Il nuovo endpoint — la meta' cervello del ciclo
# ============================================================================

@app.post("/api/comprendi")
async def comprendi(payload: ComprensionePayload):
    """
    Riceve la domanda gia' costruita da `promptCervello()` e restituisce la
    risposta GREZZA del modello. Chi la giudica sta dall'altra parte.

    ⚠️ Il freno e' 0,5 s, non 2: il ciclo fa fino a tre giri di seguito e con
       il vecchio limite si sarebbe strozzato da solo al secondo.
    """
    freno("comprendi", 0.5)

    if not payload.domanda or not payload.domanda.strip():
        raise HTTPException(status_code=400, detail="La domanda e' vuota")
    if len(payload.domanda) > 200_000:
        raise HTTPException(status_code=413, detail="Domanda troppo lunga")
    if payload.image_data and len(payload.image_data) > 10_000_000:
        raise HTTPException(status_code=413, detail="Immagine troppo grande (max 10MB)")

    # ⚠️ Qui la domanda arriva dal client, mentre in `/api/analyze-view` era
    #    fissa. E' voluto: e' il cervello che deve poter chiedere cose diverse
    #    a ogni giro. Il rischio e' contenuto perche' la domanda la costruisce
    #    `promptCervello()`, non un campo di testo dell'utente — ma se un
    #    giorno questo server uscira' dalla rete locale, qui va messa
    #    un'autenticazione.
    contenuto = [{"type": "text", "text": payload.domanda}]
    if payload.image_data:
        contenuto.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{payload.image_data}"},
        })

    parametri = {
        "model": MODELLO,
        "messages": [
            {"role": "system", "content":
                "Rispondi esclusivamente con un oggetto JSON valido. "
                "Nessun testo prima o dopo, nessun blocco markdown."},
            {"role": "user", "content": contenuto},
        ],
        "max_tokens": 900,
        "temperature": 0.2,   # e' un verdetto, non un tema: si vuole stabilita'
        "timeout": 40,        # tre giri di seguito: meglio largo
    }

    # Se il modello sa garantire JSON, glielo si chiede. Se non lo sa (molti
    # modelli locali), si riprova senza: `leggiVerdetto()` sa gia' scartare
    # l'involucro markdown, quindi non si perde niente.
    try:
        try:
            risposta = cliente().chat.completions.create(
                response_format={"type": "json_object"}, **parametri)
        except Exception as e:
            print(f"[cervello] json_object non supportato ({e}), riprovo senza")
            risposta = cliente().chat.completions.create(**parametri)

        grezzo = risposta.choices[0].message.content

        return {
            "status": "success",
            "giro": payload.giro,
            "verdetto": grezzo,          # GREZZO: non interpretato qui
            "model": MODELLO,
            "tokens_used": getattr(risposta.usage, "total_tokens", None),
        }

    except HTTPException:
        raise
    except Exception as e:
        # ⚠️ Non si restituisce un verdetto finto. Chi chiama ricevera' un
        #    errore e `comprendi()` dira' «non ho capito», che e' la verita'.
        print(f"[cervello] errore su /api/comprendi: {e}")
        raise HTTPException(status_code=500, detail=f"Errore del modello: {e}")


# ============================================================================
# Salute
# ============================================================================

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "VERITAS Spatial Brain",
        "endpoints": ["/api/analyze-view", "/api/comprendi"],
        "model": MODELLO,
        "base_url": BASE_URL or "api.openai.com",
        "model_configurato": bool(API_KEY or BASE_URL),
    }


# ============================================================================

if __name__ == "__main__":
    import uvicorn

    print(f"""
══════════════════════════════════════════════════════════════
            VERITAS Spatial Brain — il cervello

  POST /api/analyze-view   -> prosa, per un umano
  POST /api/comprendi      -> JSON, per il ciclo occhio-cervello
  GET  /health

  modello : {MODELLO}
  server  : {BASE_URL or 'api.openai.com'}
  chiave  : {'configurata' if API_KEY else 'ASSENTE'}
══════════════════════════════════════════════════════════════
""")

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
