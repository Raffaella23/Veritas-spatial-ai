# HANDOFF.md — VERITAS Spatial AI

> **Aggiornato il 24/08/2026.** Questo è **l'unico documento di stato del
> progetto.** Non ce ne sono altri, e non se ne creano altri.

---

## 🔴 LE DUE REGOLE CHE VENGONO PRIMA DI TUTTO

Nate da un problema misurato: al 24/08/2026 il progetto aveva **due rami e
nove documenti di stato per 227 KB** che si contraddicevano. Ogni chat nuova
bruciava token per capire dove guardare, e più volte il lavoro è finito nel
posto sbagliato. Il progetto si chiama VERITAS e aveva nove verità.

### Regola A — UN SOLO DOCUMENTO

**Questo file. Punto.**

- Non si crea `CLAUDE.md`, non si crea `handoff_v2.md`, non si crea
  `STATO_ATTUALE.md`, non si crea `NOTE_SESSIONE.md`. Mai, per nessun motivo.
- Se hai qualcosa da scrivere, **si aggiorna questo file**: si sostituisce la
  parte superata, non si accoda in fondo.
- I dettagli tecnici di una singola modifica **stanno nel messaggio di
  commit**, che è il posto giusto e non costa niente a nessuno.
- Questo file non deve superare le ~15 KB. Se cresce, vuol dire che dentro c'è
  del diario: il diario si toglie. La cronologia sta in `git log`.

⚠️ Questo file ha sostituito, il 24/08/2026: `CLAUDE.md`, `PROJECT_INFO.md`,
`ARCHITETTURA.md`, `handoff.md`, `AVVIO_NUOVA_CHAT.md`, `design_brief.md`,
`CONTEXT.md`, `PERCEPTION_LOOP_STATUS.md`. Sono in `git log`: **non ricrearli.**

### Regola B — UN SOLO RAMO: `main`

Non esistono altri rami. Non se ne aprono, nemmeno "solo per un attimo".

Il motivo è meccanico, non organizzativo: **`main` è il ramo predefinito di
GitHub**, dove atterrano da soli ogni `git clone`, ogni strumento, ogni chat
nuova. Con la verità altrove, sbagliare era il comportamento *predefinito*, e
nessun avvertimento scritto vince contro un'impostazione che agisce sempre.

Su `main` sono agganciati **entrambi** i deploy:

| consumatore | configurazione |
|---|---|
| Render — `veritas-core-api` | ramo `main`, auto-deploy a ogni commit |
| GitHub Pages — sito live | ramo `main`, cartella `/` |

Fino al 24/08 c'era anche `veritas-ai-os-preview`, che conteneva il lavoro
vero mentre `main` era indietro di 188 file: unificata dentro `main` e cancellata.

---

## Come si parla con Raffaella

**Niente tecnicismi.** È architetto e sviluppatrice XR, non programmatrice di
questo stack: nomi di funzioni, `id` interni e sigle del bundle non le dicono
niente e le fanno perdere il filo. Si spiega **cosa si vedeva prima e cosa si
vede adesso**, in italiano normale.

**Non chiederle pareri tecnici.** Se la scelta è fra due modi di scrivere una
cosa, decidi tu e dille in una riga cosa hai deciso e perché. Le domande utili
sono solo quelle sul **prodotto** — cosa deve fare, cosa conta di più, cosa
sembra sbagliato guardando lo schermo: lì la sua risposta vale più della tua.

**Le sue osservazioni sul mondo fisico sono affidabili.** È stata lei a dire
che i modelli sono in scala 1:1 e che quindi 0,12 non poteva essere una misura
umana, e aveva ragione.

**I token sono un vincolo reale.** Piano con limite settimanale, già esaurito a
metà settimana in passato. Si raggruppano le modifiche prima di provare, una
sola corsa del banco per verifica, niente elaborazioni non necessarie. Se
continuare oggi compromette i giorni successivi, **fermarla e dirglielo**.

---

## Cos'è VERITAS

Piattaforma di simulazione spaziale agentica. Si carica il modello 3D di uno
spazio complesso (aeroporto, museo, ambiente di gioco), un'AI lo legge,
riconosce le zone, simula il comportamento di agenti-folla e produce un
**report analitico vendibile**.

Non è "una dashboard più bella": è la prima interfaccia di un sistema operativo
per la simulazione agentica dello spazio. Priorità, in ordine: **chiarezza,
semplicità, interazione AI-first, comprensione spaziale, simulazione, analisi.**
L'aspetto visivo non è rifinitura — è parte di quello che si vende.

**Il riconoscimento non si chiede: avviene.** Appena il modello è caricato,
occhio e cervello si parlano da soli, l'AI stabilisce cos'ha davanti e assegna
le zone; **solo dopo** l'utente corregge. Niente pulsante «analizza»: se lo
scambio non parte subito, il modello non viene riconosciuto per quello che è, e
una simulazione su zone sbagliate produce un report sbagliato — che è la stessa
merce avariata dei KPI finti. Deciso da Raffaella il 24/08/2026.

---

## 🔑 IL PUNTO DI SVOLTA — la semantica si LEGGE, non si deduce

> Detto da Raffaella il 19/08/2026, dopo dieci giorni che non sbloccavano
> niente. È la cosa più importante di tutto il progetto.

VERITAS riceveva un **GLB scaricato da Sketchfab**. Un GLB è un *export*: il
formato in cui la semantica **è già stata buttata via**. Chi ha fatto quel
modello i nomi e le funzioni ce li aveva; l'esportazione li ha appiattiti in
2.416 mesh chiamate `Cube.083`. Si stava facendo archeologia su un file a cui
la risposta era stata cancellata.

**La prova che non si poteva vincere, ed è geometrica.** L'ultimo difetto era
«Ingresso / Parcheggio» sull'ala di un aereo, a quota 3,64 m. Misurato: quella
navmesh ha isole a 3,6 m di 329, 138 e 71 m². Sono le ali.

> Un'ala d'aereo e un mezzanino sono **geometricamente identici**: superficie
> orizzontale, larga qualche metro, a tre metri e mezzo da terra, senza niente
> sopra la testa. Nessuna misura li distingue. **Mai.**

Chi aggiunge "una soglia in più" sta ricominciando il ciclo di dieci giorni.

| dominio | file d'origine | cosa porta già dentro |
|---|---|---|
| architettura (aeroporti, musei, ospedali) | **IFC / BIM** | `IfcSpace` con nome e funzione, piani, porte, scale, property set di antincendio e affollamento |
| gioco | progetto Unity | tag, collider, NavMesh, prefab — dichiarati dal level designer |
| nessuno dei due | GLB nudo | niente: **qui e solo qui** servono gli occhi e la conferma umana |

Conferma da un'altra strada: gli agenti di Meta che collaudano i videogiochi
non deducono cos'è una stanza — gliela dichiara il progetto. Nessuno, in nessun
campo, deduce la semantica dalla geometria quando può leggerla.

**ArchiCAD, verificato il 19/08:** `.pln` e `.pla` **non si leggono** (formati
chiusi, nessuna libreria aperta) — non perderci tempo. Ma **esporta IFC** e le
sue Zone diventano `IfcSpace`. ⚠️ Mette il **nome** in `IfcSpace.LongName` e il
**numero** in `IfcSpace.Name`: chi legge `Name` si ritrova «101» invece di
«Sala d'attesa».

---

## ⚠️ Le regole tecniche che non si violano

1. **Il blocco 3 di `index.html` non si tocca mai.** È il bundle React/Three
   minificato (872.494 byte, sha a 16 cifre `58d371701aa9a349`). Dopo *ogni*
   modifica al file va verificato — ricetta qui sotto.
2. **Per leggere i blocchi `<script>` si usa `html.parser` di Python, mai le
   regex.** Il bundle contiene stringhe che sembrano tag e mandano in tilt le
   regex.
3. **Non si scrive a mano quello che esiste già.** Prima di scrivere un
   algoritmo si cerca lo strumento che lo fa — su GitHub, su npm, *fuori* da
   questo repository. Non è efficienza, è qualità: un algoritmo fatto in casa e
   tarato su **un solo modello** funziona su quello e si rompe sul successivo.
   È esattamente com'è andata il 18/08 — griglia di occupazione, distanza dai
   muri, A\*, tiro della corda, dentro/fuori, tutto riscritto a mano e tutto
   tarato su `airport_foot_traffic.glb`: ogni giro chiudeva un buco e ne apriva
   un altro.
4. **Si legge il codice che c'è già prima di scriverne di nuovo.** ⚠️
   `Assets/` contiene ~1240 sample Unity ed è quasi tutta rumore — ma
   **`Assets/core/` contiene il Core Python vero**. Una sessione che salta
   `Assets/` per intero non lo trova e lo riscrive.
5. **Mai numeri finti a schermo.** Un KPI cablato che sembra misurato è la
   bugia peggiore che questo strumento possa produrre, perché *il report si
   vende*. Se un dato non c'è, si dichiara non disponibile.

---

## Dove sta il codice

Ramo unico **`main`**. Anteprima live:
`https://raffaella23.github.io/Veritas-spatial-ai/`

| cosa | dove |
|---|---|
| runtime completo | `index.html` (~1,86 MB, 31 blocchi `<script>`) |
| landing page demo | `landing.html` |
| Core Python | `Assets/core/` — `engine.py`, `agent.py`, `behaviour.py`, `compliance.py`, `recommendations.py`, `topology_analyzer.py`, `report_builder.py`, `path_loader.py` |
| API del Core | `api_server.py` (FastAPI, servito da Render) |
| cervello visivo | `veritas_brain_server.py` (FastAPI + modello che vede) |
| banco di prova | `banco/*.mjs` + `*.test.mjs` in radice |

**Moduli in radice:** `ls veritas_*.js` (molti sono anche inlinati in
`index.html`). I non ovvi: `veritas_riconosce.js` l'occhio (OWLv2),
`veritas_vista.js` mondo↔pixel, `veritas_corpo.js` fisica Rapier,
`veritas_comprensione.js` ciclo occhio-cervello, `veritas_anteprima.js`
pannello visivo, `veritas_montaggio.js` il filo che li accende.

**Servizi:** Render workspace `tea-d9r2r1iju40c73e4k2cg`, servizio
`srv-d9r2tmss728c73ct1c80`, URL `https://veritas-core-api-7g2x.onrender.com`.
Supabase per il multi-utente.

---

## Ricette di verifica

**Blocco 3 intatto — dopo *ogni* modifica a `index.html`:**

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
assert hashlib.sha256(p.s[3].encode()).hexdigest()[:16]=='58d371701aa9a349', 'BLOCCO 3 ALTERATO'
print('ok, blocchi:', len(p.s))
```

Poi `node --check` sui blocchi modificati (i moduli ES vanno copiati in `.mjs`).

**Core Python senza Render:**
```bash
pip install numpy trimesh scikit-learn
PYTHONPATH=Assets python3 -c "from core.engine import SimulationEngine; ..."
```

**Banco headless** (le CDN sono spesso irraggiungibili):
`npm install three@0.171.0 three-mesh-bvh@0.7.8 @supabase/supabase-js @sparkjsdev/spark --legacy-peer-deps`,
build in `vendor/`, importmap su percorsi locali, stub Supabase,
`python3 -m http.server`, Playwright.
⚠️ `three.module.js` importa `three.core.js`: copia **tutta** la cartella `build/`.

⚠️ Dalla sandbox `curl` verso `onrender.com` dà 403: è il proxy, non il servizio.

---

## Dove siamo — 24/08/2026

**Fatto e provato.** Il Core Python calcola davvero KPI, conformità e
raccomandazioni. La percezione degli agenti è misurata, non stimata: isovista a
32 raggi sulla mesh (Benedikt 1979), con due altezze occhio — 1,65 m in piedi e
1,20 m seduto. Un bancone a 1,30 m non ostruisce chi cammina e chiude
l'orizzonte a chi è in carrozzina: stesso punto, due esperienze opposte, ed è
**misurato**. Senza mesh si ricade su una stima per archetipo che distingue le
persone ma non i luoghi: le curve risultano piatte e il report **lo dichiara**
(`perception_source` vale `archetype_estimate` invece di `isovist`).

L'IFC entra e viene letto sul lettore vero. I muri si leggono dal modello
invece di indovinarli. La fisica Rapier è innestata (`veritas_corpo.js`, con
tre file di prova) e il 24/08 sono stati sanificati i triangoli malformati
prima della costruzione del collisore.

**I KPI finti sono stati azzerati** il 24/08 (commit `9bb59b1`): erano cablati
in `hV()` dentro il bundle — 0,156 p/s, 12 rallentamenti, 131,4 s, 68%. Se quei
quattro numeri ricompaiono a schermo, è tornato il bundle vecchio.

**Acceso il 25/08** (`veritas_montaggio.js`, agganciato in fondo a
`index.html`): parte da solo 6,5 s dopo il caricamento del modello, dietro
l'occhio. I nomi passano dal ponte che esiste gia', `__veritasApplicaOcchi`.
`veritas_comprensione.js` e' il ciclo
occhio-cervello dell'infografica del 24/08: l'occhio manda al cervello anche i
volumi che **non** ha saputo nominare, il cervello risponde in JSON (`capito`,
`fiducia`, `dubbi`) e può far guardare ancora con parole nuove, max 3 giri; se
resta nel dubbio si ferma e scrive una domanda. `puoAgire()` è il cancello
prima della simulazione e richiede tutt'e tre: capito, fiducia ≥ 70%, almeno
metà volumi nominati. Con `veritas_anteprima.js`, il pannello che mostra cosa
vede davvero l'occhio.

---

## Fronti aperti, in ordine

1. **Il cervello non è mai stato raggiunto dalla pagina.** Il filo c'è dal
   25/08, ma `/api/comprendi` non ha mai risposto a nessuno: dalla sandbox non
   si esce, e non è detto che `veritas_brain_server.py` giri su Render (là c'è
   `api_server.py`). Finché tace, l'esito è `capito: false` con il motivo
   scritto — corretto, ma non mostra niente. **È il prossimo passo**: accendere
   il cervello e guardare il pannello. Indirizzo regolabile con
   `window.__veritasCervelloUrl`.
2. **Provare l'occhio davvero.** La lettura di una pianta vera non è mai stata
   fatta: dalla sandbox non si raggiunge nessun modello. L'occhio gira nel
   browser (OWLv2, niente server); è il **cervello** a volere un VLM — LM Studio
   con Qwen2-VL, LLaVA o MiniCPM-V. ⚠️ Si verifica **guardando il pannello**: se
   i nomi cadono tutti sul lato opposto dell'edificio la pianta è specchiata
   (`readRenderTargetPixels` dà la riga 0 in fondo, una tela la vuole in cima) —
   difetto che produce nomi plausibili e nessun errore, invisibile a ogni report.
3. **Le porte modellate chiuse.** Un pannello pieno è, per il programma, un
   muro: gli agenti lo aggirano. È corretto, ma su un modello con tutte le
   porte disegnate chiuse può bloccare percorsi veri. Il programma lo dice in
   console (`[VERITAS cammino] nessuna strada…`).
4. **I pannelli KPI sotto i 1280 px** si sovrappongono ai comandi: sotto quella
   larghezza il bundle mette i numeri in una riga in fondo che i selettori
   attuali non intercettano.
5. **Doppio Three.js.** Il bundle porta la sua copia (0.160), l'importmap ne
   carica un'altra (0.180). Aggirato, non risolto: la soluzione pulita è
   ricompilare il bundle. Da qui dipende anche il Gaussian Splat, fermo.
6. **Provare con una scansione vera.** Su gaussiane non c'è geometria di muri
   da leggere: valgono solo i muri dedotti, con il limite dichiarato.

---

## Errori documentali accertati — non ripercorrerli

Erano scritti nei documenti ora cancellati, e hanno mandato fuori strada più
di una sessione. Restano qui perché **sapere cos'era falso vale quanto sapere
cos'è vero**.

| Cosa dicevano | Realtà verificata |
|---|---|
| l'analisi geometrica è lanciata «asincrona da fonte sconosciuta», le 5 zone vengono «dai nomi delle mesh» | Falso entrambi: è `analyzeMesh`, sincrono, che comprime le 7 zone misurate nelle sue 5 tappe fisse (`order2`). Il messaggio «ripiego sui nomi» descrive una cosa che non accade |
| `Assets/core/zones.py` | non esiste |
| `vaio_module_v2.js`, `vaio_splat_module.js` sono file | non esistono, sono inlinati |
| `/core/engine.py`, `/data/simulation_config.json` in radice | non esistono: il Core è in `Assets/core/` |
| Render deploya da `main` con il vecchio frontend, `main` non si tocca | superato il 24/08: ramo unico `main`, allineato al lavoro vero |
| `Veritas-V17-FIX-SOLO-BUG.html` è la vetrina dell'app | falso: era la fotografia **vecchia** — niente Rapier, IFC, navmesh né occhio, e i **KPI finti erano ancora dentro**. Cancellato il 24/08. La vetrina è `index.html`, che è anche ciò che GitHub Pages serve da solo |
| il blocco 3 vale `eedd9935ea908fd3` | quello era il bundle di V17. L'azzeramento dei KPI ha cambiato il bundle di `index.html`: chi usava il vecchio codice trovava «non torna» e cambiava file |
