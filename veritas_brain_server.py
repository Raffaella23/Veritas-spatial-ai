"""
veritas_brain_server.py (VERSIONE CORRETTA)
Backend FastAPI che analizza la visione dell'agente con GPT-4o-mini
"""

import os
import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

# Inizializzazione FastAPI
app = FastAPI(title="VERITAS Spatial Brain", version="1.0.0")

# CORS (permissivo per dev - in produzione: specifica l'origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Configurazione OpenAI
# ============================================================================
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    print("\u274c ERROR: OPENAI_API_KEY environment variable not set")
    print("   Set it with: export OPENAI_API_KEY='sk-...'")
    raise RuntimeError("OPENAI_API_KEY not configured")

try:
    client = OpenAI(api_key=OPENAI_API_KEY)
except Exception as e:
    print(f"\u274c Failed to initialize OpenAI client: {e}")
    raise

# ============================================================================
# Rate Limiting (semplice, in-memory)
# ============================================================================
last_request_time = [0]  # Lista per mutabilità in closure

def check_rate_limit(throttle_seconds=2.0):
    """Controlla se siamo dentro il throttle."""
    now = time.time()
    if now - last_request_time[0] < throttle_seconds:
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Max 1 per {throttle_seconds} seconds"
        )
    last_request_time[0] = now

# ============================================================================
# Modelli Pydantic
# ============================================================================
class VisionPayload(BaseModel):
    image_data: str  # Base64 string (senza "data:..." prefix)

# ============================================================================
# Endpoints
# ============================================================================

@app.post("/api/analyze-view")
async def analyze_view(payload: VisionPayload):
    """
    Analizza la visione dell'agente usando GPT-4o-mini.
    """
    
    # 1. Check rate limit
    try:
        check_rate_limit(throttle_seconds=2.0)
    except HTTPException as e:
        raise e

    # 2. Validazione input
    if not payload.image_data or len(payload.image_data.strip()) == 0:
        raise HTTPException(status_code=400, detail="Image data is empty or missing")

    if len(payload.image_data) > 10_000_000:  # ~10MB max
        raise HTTPException(status_code=413, detail="Image data too large (max 10MB)")

    # 3. Prompt fisso (no injection risk)
    prompt = """
    Sei il cervello cognitivo di un agente autonomo che esplora uno spazio reale.
    L'agente vede questa scena da un'altezza di occhi (circa 1.65m dal suolo).
    
    Analizza la visione e fornisci un report BREVE con:
    1. Descrizione: Che ambiente è? Ostacoli visibili?
    2. Sicurezza: Pericoli di inciampo, uscite, aree ristrette?
    3. Fruibilità: È navigabile? Segnaletica chiara?
    4. Prossima mossa: Che direzione dovrebbe prendere l'agente? (forward, left, right, back?)
    
    Sii conciso (max 100 parole). Usa punti numerati.
    """

    # 4. Chiama OpenAI
    try:
        # ✅ Data URI corretto: "data:image/jpeg;base64,<base64_string>"
        image_url = f"data:image/jpeg;base64,{payload.image_data}"

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_url
                            }
                        }
                    ]
                }
            ],
            max_tokens=300,
            timeout=15
        )

        report = response.choices[0].message.content

        return {
            "status": "success",
            "report": report,
            "model": "gpt-4o-mini",
            "tokens_used": response.usage.total_tokens
        }

    except Exception as e:
        error_msg = str(e)
        print(f"\u274c OpenAI API error: {error_msg}")
        raise HTTPException(
            status_code=500,
            detail=f"OpenAI error: {error_msg}"
        )

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "VERITAS Spatial Brain",
        "api_endpoint": "/api/analyze-view",
        "model": "gpt-4o-mini"
    }

# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    print("""
════════════════════════════════════════════════════════════════════
           🚀 VERITAS Spatial Brain — Backend
                                                
  Endpoint: POST http://0.0.0.0:8000/api/analyze-view
  Health:   GET  http://0.0.0.0:8000/health
                                                
  Payload: { "image_data": "<base64_string>" }
                                                
  Rate Limit: Max 1 request per 2 seconds
  Model: gpt-4o-mini (vision analysis)
════════════════════════════════════════════════════════════════════
    """)

    print(f"\u2705 OpenAI API Key: configured")
    print(f"\u26a0\ufe0f  CORS: enabled (dev mode)")
    print()

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )