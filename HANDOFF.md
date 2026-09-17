# HANDOFF — EIDETICA

> Documento unico di stato. Sostituisce ogni altra copia: `Desktop\HANDOFF.md`,
> `CLAUDE_INSTRUCTIONS.md`, la cartella `Veritas-spatial-ai-main` e il clone vuoto
> `Veritas-spatial-ai` sono morti e non vanno letti.

---

## 1. STATO ATTUALE

| | |
|---|---|
| **Aggiornato** | 17/09/2026, sera (§4: metodo di lavoro vincolante) |
| **Repository ufficiale** | `Raffaella23/Veritas-spatial-ai` |
| **Branch** | `main` (unico, Regola B) |
| **Ultimo commit di codice pubblicato** | `46dacdc` — *fix: la mappa di cammino riceve di nuovo le marcature — marcaOstacoli nel ponte* |
| **Deploy** | GitHub Pages da `main`. ⚠️ la CDN può servire la versione precedente per qualche minuto dopo il deploy: verificare sempre `window.__EIDETICA_COSTRUZIONE` prima di giudicare |
| **Costruzione dichiarata nel file** | `2026-09-17-a` (servita da Pages, controllata) |
| **Motore Python** | `veritas-core-api` su Render, piano gratuito: dorme dopo ~15 min, spesso non raggiungibile durante le prove; l'app ricade sul generatore JS locale e lo dichiara |

**Stato effettivo:** la piattaforma carica un modello, lo analizza, riconosce zone,
genera flussi e fa camminare 28 corpi fisici veri (Rapier). Il circuito
occhio-cervello gira. **Ma l'occhio non ha voce sulla mappa di cammino**, ed è
questo il problema di impianto aperto (§6.1), non un difetto isolato.

---

## 2. OBIETTIVO DEL PROGETTO

EIDETICA è una piattaforma che **capisce uno spazio guardandolo**, non leggendo
etichette scritte da qualcun altro.

Deve funzionare su ciò che le si mette davanti: un GLB esportato senza semantica,
una scansione, **un Gaussian Splat che è solo immagini e punti**. Se la risposta a
«non trovo la scritta muro» è chiedere un file migliore (un IFC, mesh nominate),
l'idea di partenza è già persa: quella conoscenza — cos'è un muro, cos'è un varco,
cos'è una sosta — va messa **dentro il programma**, non pretesa dal file.

Tre principi vincolanti, non negoziabili:

- **Regola 0 — il ciclo di percezione.** Occhio e cervello accesi insieme, stesse
  immagini, il modello girato in mano vista dopo vista, giro dopo giro fino a
  essere sicuri. Se non è sicuro **chiede**, non inventa.
- **Regola 0-bis — nessun vocabolario di tipologia nel codice.** I nomi nascono dal
  riconoscimento ("parcheggio" perché ci sono auto), mai da una tabella scritta
  prima di guardare. Le categorie architettoniche (accesso, distribuzione, attesa,
  servizio, collegamento verticale, esterno) sono ammesse; le parole da aeroporto no.
- **L'occhio è il re supremo.** Il cervello ha potere consultivo, mai decisionale.
  **Nel dubbio vince l'occhio** (deciso 17/09). Vale ovunque: nomi, zone, accessi,
  scala, quote — **e i muri**.

---

## 3. ARCHITETTURA E COMPONENTI

### Struttura dell'applicazione

Tutto vive in **`index.html`** (≈2,2 MB), servito staticamente da GitHub Pages.
Dentro, in ordine di apparizione:

1. **Blocco classico iniziale** (`<script>`, ~riga 245) — autenticazione Supabase,
   elenco progetti, deposito in IndexedDB, generatore di traiettoria JS locale
   (`generateTrajectory`), mappa di cammino (`veritasMappaCammino`), lettura muri
   dal modello (`muriDalModello`), separazione corpi (`resolveOverlaps`).
   Funzioni **private**: non esposte su `window`, non richiamabili da console.
2. **Bundle React minificato — "blocco 3"** (`<script type="module">`, ~riga 9011,
   ~3.800 righe). Possiede la scena Three.js, il proprio ciclo di rendering e
   **un proprio caricatore di file** (`handleFileSelected`). ⚠️ **Non si tocca a
   mano** (nessun sorgente disponibile, solo il minificato).
3. **36 moduli `<script type="module">`**, inline o esterni, tutti prefissati
   `veritas_` / `EIDETICA`: percezione, comprensione, navigazione, corpo fisico,
   cinema, carta (il vestito), apertura, accessi, flussi, referto.

### Moduli fondamentali

| File | Ruolo |
|---|---|
| `veritas_comprensione.js` | il ciclo occhio↔cervello (Regola 0), `comprendiGuardando()` |
| `veritas_navigazione.js` | mappa di cammino: griglia di occupazione, `marcaOstacoli`, `trovaPercorso` |
| `veritas_navmesh.js` | navmesh vera, `percorsoCorrente` (prima scelta per il tragitto) |
| `veritas_corpo.js` | ⚠️ **copia morta, mai caricata.** Il corpo fisico vero è incollato dentro `index.html` (~riga 28700+): `filtraFrames`, `dentroUnSolido`, `nascitaLibera` |
| `veritas_accessi.js` | ricerca dei varchi d'ingresso, con voci multiple che devono accordarsi |
| `veritas_bim.js` | lettura IFC (web-ifc). Strada separata, usata solo se il file è IFC |
| `veritas_apertura.js` | il velo di apertura: la scena che prende forma in diretta al caricamento |
| `veritas_carta.js` | il vestito: piattaforma chiara, vista 3D grigia col reticolo |
| `veritas_deposito.js` | i byte del modello in IndexedDB, legati all'id del progetto |

### Rapporti fra le parti

```
file caricato ──► riconoscimento formato dai primi byte (__veritasIngest)
                     │
      ┌──────────────┼───────────────┐
      ▼              ▼               ▼
   IFC/BIM        mesh (glb…)     splat/nuvola
   veritas_bim    GLTFLoader      __veritasLoadSplatFile
      └──────────────┴───────────────┘
                     ▼
             modello in scena (__veritasModelRoot)
                     ▼
      ┌──────────────┴──────────────┐
      ▼                             ▼
  OCCHIO + CERVELLO            GEOMETRIA
  (viste, riconoscimento)      (campionamento pavimento,
      │                         test di verticalità)
      ▼                             ▼
   nomi e tipi delle zone      MAPPA DI CAMMINO ◄── ⛔ l'occhio NON arriva qui
                     ▼
              flussi ─► traiettoria ─► corpo fisico (Rapier) ─► scena
```

### Servizi esterni

- **Supabase** — autenticazione e tabella `projects` (nomi, tipo, `nodes_config`,
  `sim_params`). **I modelli 3D non salgono sul server**: restano in IndexedDB nel
  browser (deciso 02/09). Conseguenza: aprendo lo stesso progetto da un altro
  browser compare «manca lo spazio» e il file va ricaricato.
- **Render** — `veritas-core-api`, motore fisico Python. Piano gratuito.
- **CDN via importmap** — three 0.180, rapier3d-compat, web-ifc 0.0.77, navcat,
  spark (splat), transformers. Nessun `npm install` necessario per far girare il sito.

---

## 4. REGOLE OPERATIVE VINCOLANTI

> Metodo di lavoro dettato da Raffaella il 17/09/2026. **Sono regole, non suggerimenti.**

**I quattro ambienti — si distinguono prima di ogni intervento:**

| | |
|---|---|
| **Codice ufficiale** | GitHub, `Raffaella23/Veritas-spatial-ai`, ramo `main`. L'unica fonte |
| **Workspace temporaneo** | clone isolato in una cartella di lavoro dedicata: qui si analizza, si modifica, si prova |
| **Versione pubblicata** | https://raffaella23.github.io/Veritas-spatial-ai/ — si verifica nel browser |
| **Cartella locale esclusa** | `...\VERITAS\Veritas-spatial-ai` sul Desktop: non è un repository Git valido, non si apre, non si modifica, non si usa. Nessuna cartella locale è una fonte |

1. **GitHub è l'unica fonte; il lavoro sta nel workspace temporaneo isolato.**
   Analisi, modifiche e test si fanno lì, mai in una cartella del Desktop.
2. **Il browser non è l'ambiente di sviluppo.** Serve solo a: aprire la versione
   pubblicata; verificare il comportamento dell'interfaccia; controllare il risultato
   finale; eseguire prove reali che il workspace non può simulare. Il lavoro non si
   sposta dentro Chrome.
3. **Tutto ciò che si può fare da soli si fa da soli**: letture del codice, analisi,
   verifiche, test, diagnosi. Non si chiede a Raffaella di aprire Chrome, entrare negli
   strumenti per sviluppatori, premere F12 o copiare log, se non è indispensabile.
4. **Se una verifica richiede davvero Raffaella nel browser:** (a) si spiega perché non
   si può eseguire da soli; (b) si predispone, se possibile, un test visibile
   direttamente nell'interfaccia; (c) istruzioni brevi e precise; (d) si chiede solo
   l'azione minima necessaria; (e) **si aspetta il risultato prima di modificare il
   codice**.
5. **Nessuna modifica al progetto ufficiale, nessun commit, nessun push senza
   autorizzazione esplicita**, richiesta volta per volta. Un'autorizzazione vale per
   quell'intervento, non per i successivi. **Unica eccezione: questo documento.**
   Ogni aggiornamento del HANDOFF si pubblica su GitHub appena è scritto, senza
   chiedere (autorizzazione permanente di Raffaella, 17/09/2026).
6. **Le decisioni scritte in questo documento si eseguono, non si richiedono.** Non si
   ripropongono come domande o proposte: si chiede solo ciò che nessuna regola scritta
   decide. *(17/09: le due regole del §9 erano state trasformate in domande.)*
7. **Modifiche minime e mirate.** Prima di scrivere codice si dichiara: causa
   accertata, file coinvolti, modifica proposta, cosa NON verrà toccato, criterio di
   successo.
8. **Nessun refactoring non richiesto.** Nessuna riscrittura, nessuna architettura
   nuova, nessuna funzione duplicata.
9. **«Semantico» e «social behavior» non si usano a vuoto.** Un nome preso da una
   tabella non è semantica. Un'animazione non è un comportamento sociale. Se una
   libreria è installata ma non collegata si dice «installata, non integrata».
10. **Test con limiti espliciti:** timeout, numero massimo di tentativi, condizione di
    uscita, messaggio d'errore. Niente cicli che interrogano all'infinito, niente
    attese indefinite spacciate per lavoro in corso.
11. **Dopo ogni intervento** si eseguono i test necessari e si comunica, in
    quest'ordine: costruzione, commit, file modificati, problema affrontato, test
    eseguiti, risultato, limite residuo, prossimo passo unico. **Ci si ferma** se manca
    una verifica decisiva o un'autorizzazione.

---

## 5. STATO DELLE FUNZIONALITÀ

Legenda: **R** richiesta · **P** progettata · **C** presente nel codice · **V** verificata · **Pub** pubblicata

| Funzionalità | R | P | C | V | Pub | Limite / condizione |
|---|:-:|:-:|:-:|:-:|:-:|---|
| Caricamento modello (glb/gltf/fbx/obj) | ✔ | ✔ | ✔ | ✔ | ✔ | provato dal vivo 16/09 su file reale da 18,6 MB, pipeline completa senza errori |
| Riconoscimento formato dai primi byte | ✔ | ✔ | ✔ | ✔ | ✔ | firma "glTF" letta correttamente; ripiego sull'estensione se fallisce |
| Caricamento IFC | ✔ | ✔ | ✔ | ✖ | ✔ | il percorso esiste (`veritas_bim.js`) ma **non è mai riuscito dal vivo**: vedi §6.3 e §6.4 |
| Caricamento splat/nuvola | ✔ | ✔ | ✔ | ✖ | ✔ | mai provato in questa sessione |
| Ciclo occhio-cervello (Regola 0) | ✔ | ✔ | ✔ | ✔ | ✔ | **17/09 sera risponde, sulla pagina pubblicata**: 13 viste, primo sguardo del cervello (qwen2.5-vl-7b, LM Studio) dopo ~3 min e mezzo, giro finito a ~5 min; consegna **0 cose con posizione dalla pianta e 18 legate a un'area** (primi piani), 12 «all'aperto»; poi *«l'occhio ha parlato: 9 → 10 ambienti, 1 accesso da fuori»*. Il 16-17/09 pomeriggio non rispondeva («Failed to fetch») |
| Zone misurate e nominate | ✔ | ✔ | ✔ | ◐ | ✔ | `assegnaZoneMisurate` gira; nomi neutri («Zona 3 · 210 m²») finché l'occhio non parla |
| Vocabolario di dominio rimosso (Regola 0-bis) | ✔ | ✔ | ✔ | ◐ | ✔ | `LESSICO_ZONE` eliminata (`631204a`); resta `ETICHETTA_OCCHI`, legittima perché applicata **solo dopo** un riconoscimento vero. Etichette vecchie possono restare salvate nei progetti: §6.5 |
| Accessi / varchi d'ingresso | ✔ | ✔ | ✔ | ◐ | ✔ | verificato l'11/09 con `trova()` a mano; il ricalcolo automatico su `veritas:vista` non scatta da solo |
| Mappa di cammino e percorsi | ✔ | ✔ | ✔ | ◐ | ✔ | fino alla costruzione `-16-g` nessuna marcatura arrivava sulla mappa (`marcaOstacoli` assente dal ponte); **corretto e pubblicato in `2026-09-17-a`** (`46dacdc`), controllo a schermo da fare. I 3 tragitti in linea retta vengono da tappe fuori dal modello: §6.1 |
| Corpo fisico Rapier (28 capsule) | ✔ | ✔ | ✔ | ✔ | ✔ | misurato 17/09: 28 corpi, 21.947 passi, mondo e collisore edificio reali |
| Correzione «dentro un muro» | ✔ | ✔ | ✔ | ✔ | ✖ | **scritta e misurata, NON pubblicata**: attende autorizzazione. §6.2 |
| Sosta: gli agenti si siedono | ✔ | ✔ | ✔ | ✖ | ✔ | pubblicata 16/09 (`44038c5`), **mai vista funzionare a schermo** |
| Frecce del modello come obbligo di percorso | ✔ | ✔ | ✔ | ✖ | ✔ | `84ec89c`; il commit precedente dichiara «senza browser per verificare» |
| Apertura (scena che prende forma) | ✔ | ✔ | ✔ | ✔ | ✔ | velo bloccante corretto e verificato 17/09 (`03d43e6`) |
| Report laterale progressivo | ✔ | ✔ | ◐ | ✖ | ◐ | il pannello dell'apertura elenca ciò che l'occhio conferma; **non è ancora il report richiesto** (§9). Misurato 17/09 sera: l'apertura si apre a 10 s e **si chiude a 40 s senza aver acceso niente**, perché l'occhio parla dopo ~5 min: è l'«attesa muta» che la regola 2 del §9 vieta |
| Deposito del modello nel browser | ✔ | ✔ | ✔ | ✔ | ✔ | funziona; il file non è condiviso fra browser diversi, per scelta |
| Motore Python (Render) | ✔ | ✔ | ✔ | ◐ | ✔ | raggiungibile a intermittenza; il ripiego JS è dichiarato con un pallino viola |

---

## 6. PROBLEMI APERTI

### 6.1 — ⛔ PRIORITÀ: l'occhio non ha voce sulla mappa di cammino

- **Descrizione.** La mappa che decide dove si cammina e dove c'è un muro si
  costruisce da **due sole fonti, entrambe geometria pura**: i buchi nel
  campionamento del pavimento e un test di verticalità sui triangoli
  (`muriDalModello`). Il riconoscimento dell'occhio non entra mai in questa mappa.
- **Sintomo osservato.** Agenti che attraversano i muri; percorsi che puntano dentro
  le pareti; su un modello senza mesh nominate il programma non sa dire cos'è un
  muro e cos'è un varco.
- **File e funzioni.** `index.html`: `veritasMappaCammino` (~riga 1948),
  `muriDalModello` (~riga 2046), `resolveOverlaps` (~riga 2392), la catena di
  ripiego dei tragitti (~righe 2330-2384). `veritas_navigazione.js`: `marcaOstacoli`,
  `creaMappaDaNuvola`, `trovaPercorso`.
- **Causa accertata — MISURATA sulla pagina pubblicata il 17/09 sera** (sostituisce
  le ipotesi del pomeriggio):
  1. **Il collegamento era staccato.** Il ponte `window.__veritasNavigazione`
     inlinato in `index.html` **non esponeva `marcaOstacoli`**: `veritasMappaCammino`
     la cerca con `typeof nav.marcaOstacoli === "function"`, trovava `undefined`, e
     **nessuna marcatura arrivava mai sulla mappa** — né i muri letti dal modello né
     qualunque altra fonte. Nessun errore, nessun avviso. Controllato due volte, anche
     a pagina appena ricaricata. `veritas_muri.test.mjs` passava lo stesso perché si
     costruiva un ponte finto con le funzioni del FILE.
  2. **Collegata, la lettura regge.** Prova sulla pagina pubblicata con la funzione
     agganciata prima di aprire il progetto: *«muri letti dal modello: 297675
     campioni, 4520 celle chiuse (13.6% del calpestabile)»* al piano terra, *«1573
     celle chiuse (16.7%)»* al primo; *«i muri sono letti dal modello, quindi si
     vedono anche i tramezzi sottili»*. Sotto il tetto del 35%: applicata. L'ipotesi
     «la lettura viene scartata perché chiude troppo» è **smentita**.
  3. **I tre «nessuna strada … linea retta» NON dipendono dai muri**: restano 3 anche
     con i muri letti. Partono da tappe con coordinate **fuori dal modello** —
     [-45,-38], [48,32] — mentre il modello va da x −85 a 21,4 e da z −33,7 a 25,7; il
     log dice *«tappe: 0 appoggiate sul pavimento»*. **Verificato 17/09 sera:** sono le
     tappe **cablate nel bundle** (§6.5), non un `nodes_config` salvato.
  4. **Resta vero il limite di impianto**: la lettura dei muri dai triangoli **su uno
     splat non esiste** (non ci sono triangoli) e non sa CHE COSA sta chiudendo — i
     campioni più pesanti sono `Cylinder_0`, i due aerei (`Plane001/002`), `Cube002_0`.
     È un parere secondario: la precedenza di giudizio è dell'occhio (§9).
- **Correzione PUBBLICATA (`46dacdc`, costruzione `2026-09-17-a`):** `marcaOstacoli`
  aggiunta al ponte (1 parola) + prova 0 in `veritas_muri.test.mjs`, che controlla il
  ponte VERO: ogni `nav.X` chiamato dalla mappa deve comparire lì. La prova fallisce
  senza la correzione e passa con lei.
- **Test eseguiti (pomeriggio).** 17/09, `airport_foot_traffic.glb` caricato dal vivo:
  *«i muri sono dedotti dal campionamento: sotto 0.574 m di spessore non si vedono»*,
  tre avvisi «nessuna strada … linea retta». Misurato inoltre: **1.505 posizioni
  dentro un solido su 5.477 controllate (27,5%)** — misura fatta col collegamento
  staccato, da rifare dopo la pubblicazione.
- **Nota sul modello di prova.** `airport_foot_traffic.glb` **non è un modello
  architettonico**: l'elenco delle sue mesh contiene aerei, persone, chioschi,
  monitor, frecce e centinaia di `Part###`/`Cube###`. Non esiste una mesh «muro».
  Non è il file giusto per misurare il riconoscimento delle pareti.
- **Prossima verifica.** Non serve un altro file: serve aprire il canale
  occhio → mappa. Vedi §9.
- **Autorizzazione mancante.** Sì: nessuna riga va scritta prima del via.

### 6.2 — Correzione «dentro un muro»: scritta, misurata, non pubblicata

- **Descrizione.** `dentroUnSolido()` rilevava i corpi dentro un solido ma non
  faceva nulla: contava e basta. La correzione riporta il corpo all'ultima posizione
  buona, **dentro la cadenza già esistente** (un controllo ogni 4 fotogrammi).
- **Perché non è come il tentativo del 15/09** (`024d7cb`, ritirato con `7905641`):
  quello faceva girare controllo e correzione **a ogni fotogramma**, quadruplicando
  il costo di un filtro già vicino al suo tetto di tempo, e **bloccava la pagina per
  minuti**. Qui non si aggiunge né un controllo né un `world.step()` rispetto a oggi.
- **File.** `index.html`, dentro `filtraFrames` (~righe 29332, 29399, 29444).
  41 righe aggiunte, 3 tolte.
- **Test eseguiti (17/09).** Stessa identica traiettoria catturata (800 fotogrammi,
  28 corpi, 5.477 posizioni controllate), eseguita due volte:

  | | senza correzione | con correzione |
  |---|---|---|
  | tempo | 2.262 ms | 1.847 ms |
  | posizioni dentro un solido | 1.505 (27,5%) | 1.680 (30,7%) |

- **Lettura onesta del risultato.** Nessun blocco e nessun rallentamento: il rischio
  che aveva causato il ritiro non si ripresenta. La percentuale **non scende** perché
  la correzione intercetta lo stesso tentativo di attraversamento più volte invece di
  lasciarlo riuscire una volta sola: l'agente non finisce più visibilmente dall'altra
  parte, ma **potrà apparire fermo o tremolante contro il muro**. È un sintomo
  diverso, non una guarigione: la causa vera resta §6.1.
- **Autorizzazione mancante.** Sì.

### 6.3 — Il caricatore del bundle rifiuta l'IFC

- **Sintomo.** Caricando un `.ifc` dal riquadro «Trascina qui / CLICCA CARICA» non
  succede nulla.
- **Causa accertata.** Il caricatore interno al bundle React (`handleFileSelected`)
  accetta **solo** `.glb`/`.gltf` e scarta il resto con un avviso poco visibile:
  `[VERITAS GLB] formato non supportato`. Osservato dal vivo il 17/09.
- **Strada giusta.** Il pulsante della piattaforma **«Carica ambiente 3D» /
  «Upload 3D environment»** (`#vaio-upload-btn`) riconosce il formato dai primi byte
  e manda l'IFC su `veritas_bim.js`. ⚠️ La sua etichetta però dichiara solo
  «.glb · .gltf · .fbx»: incompleta, non menziona IFC né splat.
- **Prossima verifica.** Nessuna finché non si torna sull'IFC; non è la priorità.

### 6.4 — Tetto di caricamento a 150 MB

- **Sintomo.** Un IFC da 414 MB non entra da nessuna strada.
- **Causa accertata.** `MAX_UPLOAD_MB` vale 150 salvo override
  (`window.__veritasMaxUploadMB`). La dimensione si controlla **prima** del formato.
- **Test.** Alzato a 500 dalla console il 17/09: il file ha comunque smesso di
  rispondere dopo la scelta. **Ipotesi non verificata:** 414 MB di IFC (formato
  testuale) sono troppi per il parser nel browser.
- **Nota.** La versione più piccola dello stesso progetto (33 MB) si apre in 322 ms
  ma è **vuota**: 0 `IfcSpace`, 0 geometrie. Non serve a niente.

### 6.5 — ⛔ CODICI FITTIZI NEL BUNDLE: tappe, traiettoria e inquadrature da aeroporto scritte a mano

- **Sintomo.** Compaiono «Ingresso / Parcheggio, Accettazione, Controllo, Lounge,
  Imbarco A, Gate A1» anche dove nessuno le ha misurate né viste; 3 tragitti in linea
  retta partono da tappe fuori dal modello.
- **Causa accertata (17/09 sera, letta nel bundle e vista sulla pagina pubblicata).**
  L'ipotesi «nomi salvati in `nodes_config`» è **smentita**. Dentro il bundle
  (`index.html` ~riga 12843, minificato):
  1. `iB` = **6 tappe da aeroporto cablate** a coordinate fisse di un altro scalo
     (`ingresso [-45,0,-38]` … `gate_A1 [48,0,32]`), usate quando il progetto non ha
     `nodes_config` (`window.__veritasInitialNodes` vuoto);
  2. `hV()` costruisce da `iB[0..5]` una **traiettoria dimostrativa finta** (360
     fotogrammi, 28 agenti) con **KPI finti**;
  3. `hK` = **inquadrature cablate** con nomi da aeroporto («Varco 3D / Security Scan»,
     «Lounge / Attesa 12m», «Imbarco A / Boarding», «Gate A / Gate A1 Close», «Controllo
     / Dettaglio Varco») puntate su quelle coordinate.
  Fuori dal bundle, `index.html` ~righe 4419-4461 **sposta** quelle tappe sugli oggetti o
  sul cammino (origine `cose`/`cammino`) **lasciando i nomi**. Visto sulla pagina
  pubblicata: 6 nodi, tutti da quel modello, nessuno misurato.
- **Danno fatto da me e già corretto nel workspace:** l'apertura `2026-09-17-b`
  leggeva le zone da `__veritasGetNodes()` e mostrava queste tappe come «misurate».
  Dalla `-c` legge solo le zone del motore geometrico (§5).
- **Ordine di Raffaella, 17/09 sera: «rimuovi i codici fittizi quando li trovi».**
  Prossimo intervento. ⚠️ `hV()` legge `iB[0]`…`iB[5]` per indice: togliere le tappe
  senza toccare `hV()` fa cadere il bundle al primo render. Serve una prova di
  caricamento reale prima di pubblicare.

### 6.6 — Difetti chiusi ma mai riconfermati dal vivo

- **Corpi Rapier non svuotati fra una corsa e l'altra** (`73ab9ff`, 11/09): la
  pulizia è nel codice, **mai riprovata con più Play consecutivi**.
- **Frecce come obbligo di percorso** (`84ec89c`, 15/09): pubblicata senza verifica.
- **Sosta che si siede** (`44038c5`, 16/09): pubblicata, mai vista a schermo.
- **Ricalcolo automatico degli accessi** su `veritas:vista`: non scatta da solo, il
  perché non è stato indagato.

---

## 7. TEST E VERIFICHE

| Test | Data | Tipo | Risultato |
|---|---|---|---|
| Pipeline di caricamento GLB, file reale 18,6 MB | 16/09 | reale nel browser | ✔ completa: riconoscimento, parsing, scena, zone, flussi, deposito |
| Suite `*.test.mjs` (automatica) | 16/09 | automatico | 10 file falliti — **9 già fallivano prima**, per dipendenze npm assenti e un export mancante; solo `veritas_zone.test.mjs` era una regressione vera, corretta in `fe12bd9` |
| Ancora di `veritas_zone.test.mjs` dopo il fix | 16/09 | automatico | ✔ il test riparte e gira le sue 25 prove (23 fallimenti pre-esistenti, invariati) |
| Velo dell'apertura: ciclo apri→chiudi | 17/09 | reale, server locale | ✔ dopo la correzione zero elementi bloccanti a schermo intero (prima: uno) |
| Correzione «dentro un muro», A/B stessa traiettoria | 17/09 | reale nel browser | ✔ nessun blocco, tempo invariato; percentuale non migliorata (§6.2) |
| Mappa di cammino: origine dei muri | 17/09 | reale nel browser | ✖ ricade sul campionamento (cieco sotto 0,574 m); 3 tragitti in linea retta attraverso i muri |
| Caricamento IFC 414 MB | 17/09 | reale nel browser | ✖ nessuna reazione dopo la scelta del file |
| Ponte della navigazione nella pagina pubblicata | 17/09 sera | reale nel browser | ✖ `typeof __veritasNavigazione.marcaOstacoli` = `undefined`, anche a pagina appena ricaricata |
| Muri letti dal modello, funzione agganciata prima dell'apertura del progetto | 17/09 sera | reale nel browser | ✔ 13,6% chiuso al piano terra, 16,7% al primo, applicata; ✖ i 3 tragitti in linea retta restano (tappe fuori dal modello) |
| `veritas_muri.test.mjs` con la prova 0 sul ponte vero | 17/09 sera | automatico, workspace | ✖ senza correzione (manca `marcaOstacoli`), ✔ con la correzione; `veritas_navigazione` ✔, `veritas_navmesh` ✔, `veritas_percorso` 23/24 **identico prima e dopo** (fallimento pre-esistente) |
| Giro dell'occhio sulla pagina pubblicata | 17/09 sera | reale nel browser | ✔ risponde: giro finito a ~5 min; 0 posizioni dalla pianta, 18 cose legate a un'area |
| Apertura mentre l'occhio lavora | 17/09 sera | reale nel browser | ✖ aperta a 10 s, chiusa a 40 s senza accendere niente |

**Limiti della verifica, dichiarati:**

- Il **motore fisico Python su Render non era raggiungibile** durante le prove del
  pomeriggio: le traiettorie misurate venivano dal generatore JS locale. La sera
  `/health` rispondeva in 0,25 s dalla pagina pubblicata.
- **L'occhio non ha risposto** («Failed to fetch») il 16/09 e il 17/09 pomeriggio. **La
  sera del 17/09 sì** (vedi sopra): il riconoscimento è verificato dal vivo per
  quanto consegna, cioè aree e non posizioni puntuali.
- I test automatici non toccano la scena: verificano funzioni estratte da
  `index.html` per àncore testuali. Se un'àncora cambia, il test si ferma subito —
  è successo il 16/09 ed è stato corretto.
- Le prove sono state fatte su `airport_foot_traffic.glb`, che **non è un modello
  architettonico** (§6.1): qualunque conclusione sul riconoscimento delle pareti
  misurata lì non è trasferibile a un edificio vero.

---

## 8. ULTIMO INTERVENTO

| | |
|---|---|
| **Costruzione** | `2026-09-17-a` — servita da Pages al terzo controllo (~1 min dopo il push) |
| **Commit / push** | `46dacdc`, pubblicato su `main` con autorizzazione di Raffaella (17/09 sera) |
| **File modificati** | `index.html` (ponte `window.__veritasNavigazione`: + `marcaOstacoli`, commento, numero di costruzione) · `veritas_muri.test.mjs` (prova 0 sul ponte vero) — 34 righe aggiunte, 2 tolte |
| **Problema** | nessuna marcatura arrivava sulla mappa di cammino: il ponte inlinato non esponeva `marcaOstacoli`, e la mappa si spegneva in silenzio sui soli punti del pavimento (cieca sotto 0,57 m) |
| **Test eseguiti** | workspace: `veritas_muri` ✖ senza / ✔ con la correzione; `veritas_navigazione` ✔, `veritas_navmesh` ✔, `veritas_percorso` 23/24 identico prima e dopo. Pagina pubblicata (funzione agganciata prima di aprire il progetto): muri letti, 13,6% e 16,7% chiusi, applicata |
| **Risultato** | la pagina pubblicata ha il ponte corretto (controllato nel sorgente servito da Pages) |
| **Limite residuo** | è il parere della geometria: su uno splat non legge niente e non sa cosa chiude. Il controllo finale a schermo sulla costruzione `-a` (log «muri letti dal modello» al caricamento) si fa insieme alla verifica delle zone. I 3 tragitti in linea retta vengono da tappe fuori dal modello (§6.1 punto 3) |
| **Prossimo passo unico** | regola 2 del §9: zone che si accendono e report laterali mentre l'occhio lavora |

---

## 9. PROSSIMO PASSO AUTORIZZATO

**Uno solo: aprire il canale dall'occhio alla mappa di cammino.**

- **Obiettivo.** Ciò che l'occhio riconosce — «qui è una parete», «qui si passa» —
  deve **marcare la mappa di cammino**. La geometria resta un parere secondario.
  Deve funzionare anche dove di triangoli non ce n'è nessuno (splat).
- **Regole di impianto già decise da Raffaella (17/09):**
  1. **Nel dubbio vince l'occhio.** Quando occhio e geometria si contraddicono,
     l'ultima parola è dell'occhio.
  2. **Finché l'occhio non ha parlato**, la scena mostra le zone che si accendono
     **progressivamente**, con i **report che si aprono man mano lateralmente**: il
     cliente deve avere un riscontro immediato, non un'attesa muta.
- **Ambito.** Solo il canale e la marcatura. Nessun refactoring della navigazione,
  nessuna riscrittura del ciclo di percezione, nessun intervento sul bundle.
- **File probabilmente coinvolti.** `index.html` (`veritasMappaCammino`, il punto in
  cui oggi si chiama `muriDalModello`), `veritas_navigazione.js` (`marcaOstacoli`,
  che già accetta punti-ostacolo e sa rifiutare una marcatura troppo aggressiva),
  e la sorgente dei riconoscimenti dell'occhio.
- **Verifica richiesta.** Dal vivo, su un modello dove l'occhio risponde davvero:
  la mappa deve dichiarare che i muri vengono da ciò che è stato visto, e il numero
  di tragitti «in linea retta attraverso un muro» deve scendere.
- **Condizioni per fermarsi.** Se l'occhio non risponde (motore non raggiungibile),
  ci si ferma e lo si dichiara: **non si sostituisce l'occhio con un'euristica**.
  Se serve una decisione di impianto non ancora presa, si chiede.

**Domanda ancora aperta, da decidere prima di scrivere:** un varco riconosciuto
dall'occhio deve **aprire un passaggio dove la geometria vede un muro pieno** (caso
della porta modellata chiusa)? Il punto 1 («nel dubbio vince l'occhio») suggerisce
di sì, ma è un'apertura in una barriera e va confermata esplicitamente.

---

## 10. REGISTRO DELLE DECISIONI

| Data | Decisione |
|---|---|
| 24/08 | Un solo documento di stato: questo. Gli altri sono in `git log`, non si ricreano |
| 25-28/08 | **Regola 0-bis**: nessun vocabolario di tipologia nel codice; i nomi nascono dal riconoscimento |
| 26/08 | **Regola 0**: occhio e cervello accesi insieme, stesse immagini, giro dopo giro fino a essere sicuri; se incerto, chiede |
| 28/08 | «All'aperto» non è una ragione per escludere una zona dal percorso: decide il riconoscimento, non la quota |
| 30/08 | L'esterno non si cancella più, si marca: nasce come nodo `esterno`, visibile e nominabile |
| 02/09 | Il modello **non va sul server**: resta in IndexedDB legato al progetto. Un solo «carica file» per volta a schermo |
| 05/09 | Il vestito è carta: piattaforma chiara, vista 3D grigia col reticolo, quattro velature dal marchio |
| 06/09 | Inglese come lingua di partenza della piattaforma |
| 11/09 | **L'occhio è il re supremo**, il cervello ha potere consultivo, mai decisionale. Vale per ogni posizionamento |
| 13/09 | Si lavora nella scheda EIDETICA del browser di Raffaella senza chiedere ogni volta; mai le altre schede |
| 15/09 | I puntini del rendering vanno tolti: non fanno capire niente. Resta la resa ombreggiata vera |
| 16/09 | Il prodotto si chiama **EIDETICA**; `VERITAS` resta solo prefisso interno dei file |
| 16/09 | `LESSICO_ZONE` eliminata: era Regola 0-bis violata, rientrata dalla porta accanto |
| 17/09 | **Nel dubbio vince l'occhio.** E: non si cerca un file già intelligente (IFC, mesh nominate) — la conoscenza sta nel programma, non nel file. Deve funzionare su uno splat |
| 17/09 | Finché l'occhio non ha parlato: accensione progressiva delle zone e report laterali che si aprono man mano |
| 17/09 | **I codici fittizi si rimuovono appena trovati** (tappe, nomi, traiettorie, KPI, inquadrature scritti a mano): «rimuovi i codici fittizi quando li trovi». Vale anche dentro il bundle, con prova di caricamento reale prima di pubblicare |
| 17/09 | Il canale dell'occhio si costruisce **sulle immagini**, perché funzioni su tutti i modelli, splat compresi; serve anche a risolvere il **riconoscimento delle zone**, non solo i muri |

---

## 11. LIMITI E AVVERTENZE

**Non verificato:**
- che l'occhio sappia dire DOVE sta un muro o una porta: il 17/09 sera ha risposto,
  ma ha consegnato solo aree (18) e nessuna posizione dalla pianta;
- il motore fisico Python su Render (non raggiungibile durante le prove);
- il caricamento IFC, in nessuna delle sue due strade;
- il caricamento di splat e nuvole;
- «sosta che si siede», «frecce come obbligo», pulizia dei corpi Rapier: pubblicati
  ma mai visti funzionare.

**Solo ipotizzato (da non riportare come fatto):**
- che le etichette vecchie nei progetti siano dati salvati e non rigenerati (§6.5);
- che i 414 MB di IFC siano oltre la capacità del parser nel browser (§6.4);
- che la correzione «dentro un muro» produca agenti fermi contro le pareti: è la
  lettura dei numeri, non un'osservazione a schermo (§6.2).

**Da non modificare:**
- il **bundle React minificato** (~riga 9011 di `index.html`): nessun sorgente, si tocca solo per togliere codici fittizi (ordine del 17/09) e con prova di caricamento reale; per il resto si
  interviene solo dall'esterno;
- `veritas_corpo.js`: è una **copia morta**, il codice vivo è dentro `index.html`;
- l'ordine dei blocchi `<script>` in `index.html`: il bundle deve restare il terzo,
  una ricetta di verifica ne controlla la posizione.

**Dipendenze e condizioni mancanti:**
- `node_modules` non installati nel workspace: i test automatici che importano
  pacchetti npm falliscono per questo, non per un difetto del progetto;
- la CDN di GitHub Pages può servire una versione vecchia per minuti dopo il deploy:
  controllare `window.__EIDETICA_COSTRUZIONE`, non fidarsi del solo push riuscito;
- il deposito è per-browser: lo stesso progetto aperto altrove chiede di ricaricare
  il file, e non è un difetto.

**Trappole già pagate, da non ripetere:**
- leggere un `HANDOFF.md` che non sia questo, sul repository;
- correggere `veritas_corpo.js` credendo che sia il file vivo;
- infilare un file nell'`input[type=file]` con un `DataTransfer`: il modello entra
  7 volte più piccolo e da lì in poi sbaglia in silenzio. Si passa da
  `window.__veritasCaricaFile`;
- dichiarare chiuso un difetto perché il codice è stato scritto: finché non è stato
  visto funzionare, è «presente nel codice», non «verificato».
