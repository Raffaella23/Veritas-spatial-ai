# 🗪️ STEP 3: Test AI Agent in Browser

## **Prerequisiti Completati:**

✅ Step 1: HTML integration done  
✅ Step 2: Brain server running  

---

## **Test Setup (5 min)**

### 1. Open 2 Terminals

**Terminal A** (Brain - already running from STEP 2):
```
🚀 VERITAS Spatial Brain running on http://0.0.0.0:8000
```

**Terminal B** (Web Server - NEW):
```bash
cd Veritas-spatial-ai
python -m http.server 8080
```

### 2. Open Browser

Navigate to: `http://localhost:8080/Veritas-V17-FIX-SOLO-BUG.html`

---

## **Test Checklist**

- ⬜ WASD moves robot
- ⬜ E key sends vision
- ⬜ Brain returns response