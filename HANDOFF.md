# HANDOFF.md — VERITAS Spatial AI

> **Aggiornato il 25/08/2026.** Questo è **l'unico documento di stato del
> progetto.** Non ce ne sono altri, e non se ne creano altri.

---

## 🔴 LE DUE REGOLE CHE VENGONO PRIMA DI TUTTO

Nate da un problema misurato: al 24/08/2026 c'erano **due rami e nove
documenti di stato per 227 KB** che si contraddicevano. Il progetto si chiama
VERITAS e aveva nove verità.

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

Il motivo è meccanico: **`main` è il ramo predefinito di GitHub**, dove
atterrano da soli ogni `git clone` e ogni chat nuova. Con la verità altrove,
sbagliare era il comportamento *predefinito*, e nessun avvertimento scritto
vince contro un'impostazione che agisce sempre.

Su `main` sono agganciati **entrambi** i deploy:

| consumatore | configurazione |
|---|---|
| Render — `veritas-core-api` | ramo `main`, auto-deploy a ogni commit |
| GitHub Pages — sito live | ramo `main`, cartella `/` |

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

Un GLB è un *export*: il formato in cui la semantica **è già stata buttata
via**. Chi ha fatto il modello i nomi ce li aveva; l'esportazione li ha
appiattiti in 2.416 mesh chiamate `Cube.083`.

**La prova che non si poteva vincere è geometrica.** Un difetto ricorrente era
«Ingresso / Parcheggio» sull'ala di un aereo, a quota 3,64 m: quella navmesh ha
isole a 3,6 m di 329, 138 e 71 m². Sono le ali.

> Un'ala d'aereo e un mezzanino sono **geometricamente identici**: superficie
> orizzontale, larga qualche metro, a tre metri e mezzo da terra, senza niente
> sopra la testa. Nessuna misura li distingue. **Mai.**

Chi aggiunge "una soglia in più" sta ricominciando il ciclo di dieci giorni.

| dominio | file d'origine | cosa porta già dentro |
|---|---|---|
| architettura (aeroporti, musei, ospedali) | **IFC / BIM** | `IfcSpace` con nome e funzione, piani, porte, scale, property set di antincendio e affollamento |
| gioco | progetto Unity | tag, collider, NavMesh, prefab — dichiarati dal level designer |
| nessuno dei due | GLB nudo | niente: **qui e solo qui** servono gli occhi e la conferma umana |

**ArchiCAD, verificato il 19/08:** `.pln` e `.pla` **non si leggono** (formati
chiusi) — non perderci tempo; ma **esporta IFC**, e le sue Zone diventano
`IfcSpace`. ⚠️ Nome in `IfcSpace.LongName`, numero in `IfcSpace.Name`: chi legge
`Name` trova «101» invece di «Sala d'attesa».

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
build in `vendor/`, importmap locale, stub Supabase, `python3 -m http.server`,
Playwright. ⚠️ `three.module.js` importa `three.core.js`: copia **tutta** `build/`.

⚠️ Dalla sandbox `curl` verso `onrender.com` dà 403: è il proxy, non il servizio.

---

## Dove siamo — 25/08/2026

**Fatto e provato.** Il Core Python calcola davvero KPI, conformità e
raccomandazioni. La percezione degli agenti è **misurata**: isovista a 32 raggi
sulla mesh (Benedikt 1979), con due altezze occhio — 1,65 m in piedi e 1,20 m
seduto, così un bancone a 1,30 m non ostruisce chi cammina e chiude l'orizzonte
a chi è in carrozzina. Senza mesh si ricade su una stima per archetipo e il
report **lo dichiara** (`perception_source`).

L'IFC entra e viene letto sul lettore vero. I muri si leggono dal modello
invece di indovinarli. La fisica Rapier è innestata (`veritas_corpo.js`) ma va
in crash — fronte 5. **I KPI finti sono stati azzerati** il 24/08 (`9bb59b1`):
erano cablati in `hV()` — 0,156 p/s, 12 rallentamenti, 131,4 s, 68%. Se quei
quattro numeri ricompaiono a schermo, è tornato il bundle vecchio.

**Il ciclo occhio-cervello gira** (`veritas_montaggio.js`, parte da solo su
qualunque modello caricato). Il cervello è LM Studio via `__veritasLLM`,
nessun server da accendere; `puoAgire()` è il cancello prima della simulazione.

**Rifatto il 25/08 come si guarda un progetto, non come si legge un file.**
Il giro a parole trovava 0 cose su 158 chieste, e non per colpa del modello: gli
si chiedeva «trovi un banco?» dodici parole alla volta su una pianta dall'alto,
dove banco, sedute e muretto sono lo stesso rettangolo grigio. **Non gli era mai
stato chiesto che posto fosse.** Ora la domanda è rovesciata (`071ca95`):

1. **studio** — che edificio è, e *come* lo stanno mostrando: modello completo,
   spaccato, sezione, un piano solo. Un modello senza soffitto non è un difetto
   ed è compito del cervello dirlo.
2. **funzionamento** — la sequenza con cui le persone attraversano un posto del
   genere la enuncia il **cervello**, non noi. Scriverla nel codice taglierebbe
   la piattaforma su un tipo di edificio solo: oggi aeroporto, domani ospedale,
   dopodomani museo o collaudo di un livello di gioco.
3. **assegnazione** — i nomi vanno sui volumi **già misurati** (quelli che
   l'editor stira, allarga, moltiplica), mai su contorni nuovi. Nome libero
   dalla tipologia riconosciuta; **ruolo** da un elenco chiuso (`RUOLI`) per il
   Core e le soglie. Più volumi possono avere lo stesso nome: tre sale d'attesa
   restano tre. Un volume incerto non si nomina — finisce in `senza_nome` con
   la domanda, che va in chat. Deciso da Raffaella il 25/08.

`veritas_vista.js` sa **girare il modello fra le mani**: `scorciTreQuarti()`
rende N viste in prospettiva attorno al modello **intero** — mai zummate sui
singoli arredi, che su un aeroporto moltiplicherebbero il costo per il numero di
banchi. Quante: da 4 a 9, ricavate dalla densità di mesh per m². Da console:
`__veritasProvaScorci()`.

---

## Fronti aperti — IN ORDINE DI PRIORITÀ

Si affrontano in quest'ordine e non in un altro: i primi due falsano tutto
quello che viene dopo, e correggere il resto prima significherebbe tarare il
sistema su letture sbagliate.

### 1. 🔴 LA PIANTA È SPECCHIATA — si vede il modello DA SOTTO

⚠️ **Confermato da Raffaella il 25/08 guardando il pannello**, non più un
sospetto. La pianta che occhio e cervello ricevono non è una vista dall'alto: è
la stessa scena vista **da sotto**.

⚠️ E il modello è **solido, non wireframe**: da sotto si vede l'intradosso del
pavimento, una superficie piena che copre tutto. Non si intravede niente di
quello che sta sopra — non è una vista trasparente, è una scatola guardata dal
fondo, col coperchio chiuso. Per questo «non si capisce niente»: non è che i
nomi finiscono nel posto sbagliato, è che **non c'è proprio niente da
riconoscere**. Chi legge questo fronte non lo tratti come un problema di
orientamento: è la vista che manca del tutto.

Meccanismo: `readRenderTargetPixels` dà la **riga 0 in fondo**, e `piantaInTela`
(in `veritas_riconosce.js`) la copia così com'è.

**Vale su ogni modello**: non dipende dal file, dipende da come si leggono i
pixel. Ogni pianta prodotta finora era specchiata.

⚠️ **La correzione è DOPPIA e va fatta in coppia**, perché quei pixel hanno due
consumatori con esigenze opposte:
- le **misure** li usano per convertire pixel in metri, e lì la riga 0 in fondo
  è l'origine di `pixelAMondo`: raddrizzare lì specchierebbe tutte le posizioni;
- l'**occhio e il cervello** li usano come immagine, e a loro serve dritta.

Quindi: si raddrizza al momento di **mostrarla**, e si rovescia indietro la
coordinata verticale dei riquadri che il modello restituisce. Fatta a metà
peggiora le cose, in silenzio. È un difetto che non dà errori: produce nomi
plausibili sul lato sbagliato dell'edificio, e nessun report lo rivela.

📌 Gli **scorci** sono già raddrizzati alla fonte dentro `scorciTreQuarti()`
(25/08). La pianta è stata lasciata apposta com'era, proprio per questa doppia
natura.

### 2. 🔴 L'assegnazione si ferma a metà

⚠️ Misurato il 25/08 sul modello vero. Il primo gradino **funziona**: il
pannello dice `cervello: capito=sì, fiducia 95%`. Il secondo — l'assegnazione
dei nomi ai 23 volumi — dà `capito=?`, cioè risposta non leggibile, e il
programma ricade sul giro a parole vecchio (`chiedo 158 parole`), che si sa già
che non porta niente. Il ripiego ha fatto il suo mestiere: **non si è rotto
niente**, ma la strada nuova non arriva in fondo.

Da guardare per prima cosa: **cosa risponde davvero il cervello a quel passo.**
Ipotesi non verificate, da non trattare come diagnosi: risposta troncata
(`max_tokens` è già a 2500 sui passi nuovi), JSON con 23 voci malformato, o
scorci non prodotti. Non si corregge niente prima di aver letto la risposta
grezza.

### 3. 🟠 L'asse delle altezze non si presume: si misura

⚠️ Segnalato da Raffaella il 25/08. Nel visualizzatore l'altezza è la **Y** e
tutto il codice la usa così; glTF la impone, quindi di norma siamo allineati. Ma
un modello con l'altezza sulla **Z** (Blender, conversioni a mano, scansioni)
entra **coricato** e non dà errore: la pianta diventa un prospetto senza che
nessuno lo dica.

Il rimedio non è dichiarare l'asse a mano, si **ricava**: su un edificio
l'impronta a terra è larga e l'altezza è piccola, e da quali due assi sono i più
estesi si capisce com'è messo. Va fatto **prima** delle sezioni, altrimenti si
taglia nel verso sbagliato.

### 4. 🟠 Le quattro rappresentazioni — sezioni e piante di piano

Deciso con Raffaella il 25/08, ed è il modo in cui un architetto spiega un
progetto: **planimetrie, prospetti, sezioni.** Stato:

| rappresentazione | stato |
|---|---|
| **pianta** | ✅ c'è — ed è già una sezione orizzontale: la telecamera sta appena sopra il pavimento, non in cielo (⚠️ ma specchiata, fronte 1) |
| **prospetti** | ✅ `scorciTreQuarti()`, dal 25/08. Dicono *che edificio è* |
| **sezioni** | ❌ mancano |
| **piante di piano** | ❌ mancano |

Perché servono: gli scorci girano **fuori** dall'ingombro. Su uno spaccato
bastano; su un **modello chiuso** (tetto e solai) mostrerebbero sette facciate e
zero interni. Serve tagliare. Come:
- **non si sceglie a priori, si misura**: se sopra l'impronta a terra c'è
  geometria che la copre, il modello è chiuso e i prospetti non bastano;
- la sezione è la stessa operazione della pianta ruotata di 90°, più qualche
  vista interna ad altezza d'occhio;
- **è la sezione che scopre i piani**, e le quote dei solai le trova lei: una
  altezza standard scritta a mano funziona su un modello e si rompe sul
  successivo (errore del 18/08);
- ogni immagine arriva al cervello **etichettata** («pianta del piano primo»,
  «sezione trasversale»): senza etichetta, un edificio tagliato a metà diventa
  mezzo edificio;
- con più piani i volumi si assegnano **anche a un livello** — un'attesa al
  terra e una al primo non sono la stessa cosa per esodo e affollamento. Campo
  in più accanto a nome e ruolo, che l'editor eredita.

### 5. 🟠 La fisica va in crash a ogni fotogramma

⚠️ Misurato il 25/08 su `airport_foot_traffic.glb` (186.074 triangoli): `trap
nel motore fisico — fase: ricerca punto libero (nascitaLibera/dentroUnSolido) —
fotogramma 1, agente 0 — memory access out of bounds` / `unreachable`, a ogni
ricalcolo. Rapier non si applica mai: la simulazione prosegue senza corpo —
onesta, non inventa numeri, ma la fisica non c'è. Sospetto principale: i raggi
di `dentroPerParita`.

### 6. 🟡 OWLv2 è morto su questa macchina — non perderci altro tempo

Tutti e cinque i formati (webgpu q4f16/fp16/q8, wasm q8/fp32) danno lo stesso
errore: `Can't create a session … Provider type for Cast node with name
'/class_head/Cast' is not set`. Non è la compressione, è il grafo. La strada è
quella già presa: **un VLM guarda E giudica** — `qwen2.5-vl-7b-instruct` su
`localhost:1234`, `/models` per il nome vero (`cfg.model` è un segnaposto).
⚠️ Le parole si chiedono in **mazzetti da 12**: 158 in un colpo le risponde a
caso. E `__veritasOcchioSorgente` dichiara sempre chi ha guardato — un
rilevatore e un VLM non danno riquadri confrontabili.

### 7. 🟡 Le altre, in coda

- **Porte modellate chiuse**: un pannello pieno è, per il programma, un muro, e
  gli agenti lo aggirano. Corretto, ma su un modello con tutte le porte chiuse
  può bloccare percorsi veri. Lo dice in console (`[VERITAS cammino] nessuna
  strada…`).
- **Pannelli KPI sotto i 1280 px**: si sovrappongono ai comandi — sotto quella
  larghezza il bundle mette i numeri in una riga in fondo che i selettori
  attuali non intercettano.
- **Doppio Three.js**: il bundle porta la sua copia (0.160), l'importmap ne
  carica un'altra (0.180). Aggirato, non risolto; la soluzione pulita è
  ricompilare il bundle. Da qui dipende anche il Gaussian Splat, fermo.
- **Provare con una scansione vera**: su gaussiane non c'è geometria di muri da
  leggere, valgono solo i muri dedotti, con il limite dichiarato.

---

## Due cose che restano vere, e sono le uniche superstiti del vecchio elenco

Il resto delle smentite documentali è stato tolto il 25/08: i documenti che le
avevano generate non esistono più e nessuna sessione ricrea quei file. Queste
due invece fanno ancora danno se non si sanno.

- **Il blocco 3 vale `58d371701aa9a349`**, non `eedd9935ea908fd3`: quello era il
  bundle di V17, e l'azzeramento dei KPI ha cambiato quello di `index.html`. Chi
  usa il valore vecchio trova «non torna» e cambia file.
- **Le 5 zone non vengono dai nomi delle mesh.** È `analyzeMesh`, sincrono, che
  comprime le 7 zone misurate in 5 tappe fisse (`order2`). Il messaggio «ripiego
  sui nomi» in console descrive una cosa che non accade.
