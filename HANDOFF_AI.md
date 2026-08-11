# HANDOFF — VERITAS Spatial AI

> Consegna del lavoro a chi prosegue (persona o AI).
> Aggiornato: 11 agosto 2026. Scritto dopo una sessione lunga di debug guidata
> dalle prove sul campo di Raffaella Ciani, proprietaria del progetto.

**Leggi prima `CLAUDE.md`** (regole operative) e poi questo file, che descrive
lo stato reale al termine della sessione e corregge alcuni punti di `CLAUDE.md`
ormai superati.

---

## 0. Le tre regole che non si violano

1. **Il blocco 3 di `index.html` non si tocca mai.** È il bundle React/Three
   minificato (872.507 byte, sha 8-byte `eedd9935ea908fd3`). Dopo *ogni*
   modifica al file, verifica che sia byte-per-byte identico — c'è lo script
   pronto al §6.
2. **Mai push su `main` senza approvazione esplicita di Raffaella.**
   L'eccezione già concessa: i file Python per il deploy Render.
3. **Per analizzare i blocchi `<script>` usa `html.parser` di Python, mai
   regex.** Il bundle minificato contiene stringhe che sembrano tag e mandano
   in tilt le regex.

---

## 1. Dove sta il codice

| Branch | Cosa contiene | A cosa serve |
|---|---|---|
| `main` | `Veritas-V17-FIX-SOLO-BUG.html`, `index.html` (redirect), **Python del Core** | Produzione + sorgente del deploy Render |
| `veritas-ai-os-preview` | `index.html` completo (~1,13 MB) | Anteprima su GitHub Pages |
| `claude/veritas-perception-ai-os-876pru` | Branch di lavoro, allineata alla preview | Sviluppo |

Anteprima live: **https://raffaella23.github.io/Veritas-spatial-ai/**

⚠️ **`main` ha ancora il frontend vecchio.** Su `main` sono stati portati solo
i file Python (per Render). Il frontend nuovo vive sulla preview e va promosso
a `main` **solo dopo approvazione esplicita di Raffaella**.

### Struttura di `index.html` (preview) — 9 blocchi `<script>`

| # | Tipo | Ruolo |
|---|---|---|
| 0 | importmap | three 0.171, three-mesh-bvh 0.7.8, spark 2.1.0 |
| 1 | `src=` | supabase-js da CDN |
| 2 | classico | **boot**: auth, progetti, analisi spaziale, generatore traiettorie, bridge Python |
| 3 | module | 🔴 **bundle React/Three minificato — INTOCCABILE** |
| 4 | classico | handler sicurezza link |
| 5 | module | patch three-mesh-bvh, espone `window.THREE` |
| 6 | module | **shell AI-OS**: topbar, console comandi, upload, nascondimento pannelli nativi |
| 7 | module | Gaussian Splat (fermo, vedi §4) |
| 8 | module | **layer percettivo** (`veritas_perception.js`) |

Il file sorgente `veritas_perception.js` sta in radice ed è **inlinato** come
blocco 8. Se lo modifichi, va reinlinato (script al §6).

---

## 2. Cosa è stato risolto in questa sessione

Ogni voce è stata **misurata**, non stimata. I numeri stanno nei messaggi di
commit, che sono volutamente dettagliati: leggili prima di rifare una strada.

| Problema | Causa reale | Stato |
|---|---|---|
| Pannelli nativi sovrapposti | Cercati per **testo italiano** (`"CAMERE"`), invisibili con UI in inglese | ✅ criterio strutturale (`<aside>`, `#root header`) |
| Zone sospese a 3 m sui muri | Il filtro "fuori scala" **scartava il pavimento** perché era la superficie più estesa | ✅ scarta solo ciò che è fuori dall'ingombro del modello |
| Campionamento sbagliato | Per **vertici** anziché per **area**: un pavimento ha 4 vertici, otto muri ne hanno decine | ✅ campionamento per triangoli, reticolo deterministico |
| Agenti fuori dall'edificio | `applyNodesToScene` aggiornava le zone ma **usciva prima di ricalcolare i frame** | ✅ parametro `force` |
| Metà modello sotto il piano | Nessuno **appoggiava** il modello a quota 0 | ✅ `groundModel()` nel blocco 6 |
| Passeggeri invisibili | "Avvia simulazione" **non impostava** `__veritasSimStarted` | ✅ |
| **Agenti alti 25 cm** | Scala 0.12 su mesh da 2,08 m, mentre i modelli sono 1:1 in metri | ✅ default **0.82** → resa 1,71 m |
| Agenti tutti nello stesso punto | Un solo `mission_profile` per tutti | ✅ un profilo per gate + ventaglio d'ingresso |
| Agenti che avanzano in blocco | Il Core Python **non aveva sfasamento delle partenze** | ✅ `start_delay` (⚠️ serve redeploy) |
| Report sempre "generic" | `project_type` salvato in italiano, confrontato in inglese | ✅ normalizzazione |

**Aggiunto:** layer percettivo (isovista, linee di vista, intervisibilità fra
zone, confronto in piedi/seduto) e comandi console `visibilita`,
`accessibilita`, `assegna <zona>`, `scala modello <n>`.

---

## 3. ⚠️ AZIONE IMMEDIATA — redeploy di Render

Le modifiche a `Assets/core/engine.py` e `api_server.py` (parametro
`start_delay`) sono su `main` ma **hanno effetto solo dopo che Render
ridistribuisce il servizio**.

Finché non avviene, il client invia `start_delay` e il backend lo ignora —
non si rompe nulla, ma **gli agenti continuano ad avanzare in blocco**.

Verifica dopo il deploy: gli agenti devono entrare a ondate. Prova locale già
fatta, sei agenti su 40 m:

```
senza sfasamento  x = [30.5, 30.5, 30.5, 30.5, 30.5, 30.5]  dispersione  0.00 m
con  sfasamento   x = [30.5, 24.6, 18.6, 12.6,  6.6,  0.8]  dispersione 29.75 m
```

---

## 4. Cosa resta aperto, in ordine di valore

### a) Doppio Three.js + Gaussian Splat fermo — *stessa radice*

In console: `WARNING: Multiple instances of Three.js being imported`.
Il bundle porta la propria copia di Three, l'importmap ne carica una seconda.

Conseguenza concreta: **il Gaussian Splat non parte affatto** —
`Spark requires THREE.js r179 or above`, ma l'importmap fissa `three@0.171.0`.

Per risolvere servono **insieme**: `three` ≥ 0.180 e `three-mesh-bvh` ≥ 0.8.0
(la 0.7.8 è dichiarata incompatibile con Three recenti). Tocca i blocchi 5, 6,
7, 8. **Da fare con calma e verificando con uno splat vero**, non a fine
giornata.

### b) OpenSky per i tempi d'arrivo reali — *massimo valore prodotto*

Esiste già `#vs-opensky-btn` che interroga gli arrivi reali a Fiumicino (LIRF),
ma **oggi stima solo il numero di agenti**, non quando arrivano.

`start_delay` è il gancio che mancava: oggi lo calcolo con una formula
regolare (ondate ogni 3,5 s). Alimentandolo con i voli reali diventa la
distribuzione vera — 180 passeggeri alle 14:32, poi il vuoto, poi 250 alle
14:51. **È lì che nascono i picchi di affollamento veri**, quelli che un report
vendibile deve mostrare. Richiesta esplicita di Raffaella.

### c) Pannelli KPI nativi sotto i 1280 px

Sotto la soglia `xl:` di Tailwind il bundle non usa più gli `<aside>` laterali
ma dispone i KPI in una riga in fondo, che i selettori attuali non
intercettano: si sovrappongono ai comandi. Serve un selettore per quel layout.

### d) Minori

- Le quote delle zone non sono perfettamente uniformi (residuo del baricentro
  di cluster). Piccolo ma della stessa famiglia del "piede dell'agente".
- Il bundle cerca ancora `./airport.glb` → 404 a ogni avvio. Rumore innocuo.
- Il confronto in piedi/seduto funziona ma serve un modello **con arredi a
  mezza altezza** (banconi, gate) per mostrare qualcosa.

---

## 5. Come lavorare su questo progetto — lezioni pagate care

**Misura, non ipotizzare.** In questa sessione ho sbagliato tre ipotesi di fila
sul caso "passeggeri invisibili col motore reale" (scala, sistema di
riferimento, formato degli id). L'ha risolto una misura di tre valori:

```
frame 0: [2.29,-0.28] | frame 400: [-7.07,-0.94] | frame 799: [-7.07,-0.94]
```

Gli agenti si muovevano e si fermavano tutti nello stesso punto. Nessuna delle
tre ipotesi era giusta. **Quando sei incerto, chiedi un dato invece di
scrivere codice.**

**I difetti gravi qui sono silenziosi.** Nessun errore in console, solo
comportamento sbagliato: pannelli cercati per testo nella lingua sbagliata,
pavimento scartato come "terreno", visibilità mai riattivata. Diffida di
qualunque cosa "sembri funzionare".

**Verifica sempre le premesse.** `CLAUDE.md` cita `vaio_module_v2.js` e
`vaio_splat_module.js` come file: **non esistono**, sono inlinati. Un §11 non
c'è mai stato.

**Raffaella è architetto.** Le sue osservazioni sul mondo fisico sono
affidabili e vanno prese sul serio: è stata lei a dire che i modelli sono 1:1
e che quindi 0.12 non poteva essere una scala umana. Aveva ragione, e quello
era il difetto che rendeva tutto il resto incomprensibile.

---

## 6. Ricette pronte

### Verificare che il blocco 3 sia intatto (dopo ogni modifica)

```python
from html.parser import HTMLParser
import hashlib
class SE(HTMLParser):
    def __init__(self):
        super().__init__(); self.s=[]; self.i=False; self.b=[]
    def handle_starttag(self,t,a):
        if t=='script': self.i=True; self.b=[]
    def handle_endtag(self,t):
        if t=='script' and self.i: self.i=False; self.s.append(''.join(self.b)); self.b=[]
    def handle_data(self,d):
        if self.i: self.b.append(d)
p=SE(); p.feed(open('index.html',encoding='utf-8').read())
h=hashlib.sha256(p.s[3].encode()).hexdigest()[:16]
assert h=='eedd9935ea908fd3', 'BLOCCO 3 ALTERATO: '+h
print('blocco 3 intatto')
```

Poi `node --check` su ogni blocco modificato (i moduli ES vanno copiati in
`.mjs`).

### Reinlinare `veritas_perception.js` nel blocco 8

Estrai il blocco 8 con lo stesso parser e sostituiscilo con il contenuto del
file, verificando che il sorgente non contenga la stringa `</script`.

### Banco di prova headless

I CDN sono spesso irraggiungibili dagli ambienti sandbox. Ricetta che funziona:
`npm install three@0.171.0 three-mesh-bvh@0.7.8 @supabase/supabase-js
@sparkjsdev/spark --legacy-peer-deps`, copia i build in una cartella `vendor/`,
riscrivi l'importmap su percorsi locali, sostituisci `supabase.js` con uno stub
che finge login e progetto, servi con `python3 -m http.server` e pilota con
Playwright (Chromium è preinstallato in `/opt/pw-browsers`).

⚠️ `three.module.js` importa `three.core.js`: copia **tutta** la cartella
`build/`, non il solo file.

### Provare il Core Python senza Render

```bash
pip install numpy
PYTHONPATH=Assets python3 -c "
from core.engine import SimulationEngine
..."
```
Funziona: è così che è stato verificato `start_delay`.

---

## 7. Contratto del bridge Python

`POST /api/simulate`

```
graph: {"nodes": {id: {"pos":[x,y,z], "meta":{...}}},
        "mission_profiles": {profile_id: [node_id, ...]}}
agents: [{agent_id, profile_id, profile_data, domain, group_id, start_delay}]
ticks, dt
```

Risposta: `{"kpi": {...}, "trajectory": {"nodes": {...}, "frames": [...]}}`
dove ogni frame è `{"t": float, "agents": [{id, pos, rot, state, group,
archetype, stress}]}`.

⚠️ **`graph.nodes` è un dizionario, non un array.** Il Core numera gli agenti
come stringhe (`"a0"`) e usa stati minuscoli (`"moving"`), mentre il viewer
vuole id numerici e stati maiuscoli: `veritasNormalizeTrajectory` fa la
conversione e **rifiuta** la traiettoria se non descrive la scena caricata,
ricadendo sul generatore JS locale. Il ponte lascia sempre tre righe in
console con prefisso `[VERITAS bridge]` — sono la prima cosa da leggere se il
motore reale si comporta male.
