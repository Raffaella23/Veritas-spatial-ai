# 🤖 VERITAS Spatial AI — AI Agent with Vision

An AI agent that can see and think in a 3D environment.

**Components:**
- 👁️ **Vision** (JavaScript) - Captures frames from 3D scene
- 🧠 **Brain** (Python + OpenAI) - Analyzes frames with GPT-4o-mini
- 🦵 **Body** (JavaScript + Rapier3D) - Moves in physics-enabled 3D space

**Controls:**
- `W/A/S/D` - Move the agent
- `SPACE` - Jump
- `E` - Capture vision & send to brain

---

## ⚡ Quick Start

### 1. Setup Brain Server (Terminal 1)

```bash
# Install dependencies
pip install -r requirements.txt

# Setup API key
export OPENAI_API_KEY="sk-proj-..."

# Start brain
python veritas_brain_server.py
# Output: 🚀 VERITAS Spatial Brain running on http://0.0.0.0:8000
```

### 2. Start Web Server (Terminal 2)

```bash
python -m http.server 8080
# Open: http://localhost:8080/Veritas-V17-FIX-SOLO-BUG.html
```

### 3. Test in Browser

- **WASD** - Move around
- **E** - Send frame to AI brain
- Watch the Python terminal for AI analysis!

---

## 📚 Documentation

See project outputs for detailed guides.