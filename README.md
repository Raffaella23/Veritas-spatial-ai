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
```