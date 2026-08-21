# 🧠 CUSTOMIZE VERITAS AI BEHAVIOR

## **Cosa Puoi Customizzare**

Il file `veritas_brain_server.py` ha **3 punti chiave**:

---

## 1️⃣ **SYSTEM PROMPT (Personalità AI)**

### Attuale (Neutrale):
```python
prompt = """Analyze the image from a spatial intelligence perspective.
Describe: objects, spatial relationships, navigation points."""
```

### Architetto (RC XRArch):
```python
prompt = """You are RC XRArch, spatial architect and XR designer.
Analyze for: architectural elements, XR opportunities, design flow."""
```

### Game Designer:
```python
prompt = """You are a game level designer.
Describe: gameplay points, cover, verticality, design improvements."""
```

## 2️⃣ **RESPONSE LENGTH**
- `max_tokens=100` - Brevissima
- `max_tokens=300` - Normale
- `max_tokens=1000` - Dettagliata

## 3️⃣ **MODELLO AI**
- `gpt-4o-mini` - Veloce, economico
- `gpt-4-turbo` - Intelligente, caro
- `gpt-3.5-turbo` - Velocissimo, gratis

See full guide for complete templates and examples!