# HANDOFF — EIDETICA

> Documento unico di stato. Sostituisce ogni altra copia: `Desktop\HANDOFF.md`,
> `CLAUDE_INSTRUCTIONS.md`, la cartella `Veritas-spatial-ai-main` e il clone vuoto
> `Veritas-spatial-ai` sono morti e non vanno letti.

---

## 1. STATO ATTUALE

| | |
|---|---|
| **Aggiornato** | 20/09/2026 (fix 2 di 4 chiuso: l'occhio in un Web Worker) |
| **Repository ufficiale** | `Raffaella23/Veritas-spatial-ai` |
| **Branch** | `main` (unico, Regola B) |
| **Ultimo commit di codice pubblicato** | `fdb5eaa` — *fix: l'occhio in una stanza sua* (prima: `9e4648e` conversazione, `eb2b966` interfaccia, `39199e2` tappe finte) |
| **Deploy** | GitHub Pages da `main`. ⚠️ la CDN può servire la versione precedente per qualche minuto dopo il deploy: verificare sempre `window.__EIDETICA_COSTRUZIONE` prima di giudicare |
| **Costruzione dichiarata nel file** | `2026-09-20-h` — link per Raffaella: `https://raffaella23.github.io/Veritas-spatial-ai/?v=2026-09-20-h` |
| **Motore Python** | `veritas-core-api` su Render, piano gratuito: dorme dopo ~15 min, spesso non raggiungibile durante le prove; l'app ricade sul generatore JS locale e lo dichiara |

**Stato effettivo:** la piattaforma carica un modello, lo analizza, riconosce zone,
genera flussi e fa camminare 28 corpi fisici veri (Rapier). Il circuito
occhio-cervello gira. **Dal 18/09 l'occhio posa nel mondo ciò che vede** (piante e
foto in prospettiva) e questo arriva alla mappa di cammino e al cervello, volume per
volume. Provato dal vivo sulla versione pubblicata (§7): sull'aeroporto l'occhio vede
quasi solo il lato aerei, e la mappa non ha ricevuto muri o porte credibili da lui.

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
| Mappa di cammino e percorsi | ✔ | ✔ | ✔ | ◐ | ✔ | `46dacdc` (-17-a): le marcature arrivano di nuovo sulla mappa — visto dal vivo al caricamento, «muri letti dal modello, 13,6%». `3a49378` (-18-a): **ascolta l'occhio** (muri visti chiudono, varchi visti aprono anche un muro pieno), provato nel workspace, **non ancora dal vivo**. I 3 tragitti in linea retta vengono dalle tappe cablate del bundle (§6.5) |
| Corpo fisico Rapier (28 capsule) | ✔ | ✔ | ✔ | ✔ | ✔ | misurato 17/09: 28 corpi, 21.947 passi, mondo e collisore edificio reali |
| Correzione «dentro un muro» | ✔ | ✔ | ✔ | ✔ | ✖ | **scritta e misurata, NON pubblicata**: attende autorizzazione. §6.2 |
| Sosta: gli agenti si siedono | ✔ | ✔ | ✔ | ✖ | ✔ | pubblicata 16/09 (`44038c5`), **mai vista funzionare a schermo** |
| Frecce del modello come obbligo di percorso | ✔ | ✔ | ✔ | ✖ | ✔ | `84ec89c`; il commit precedente dichiara «senza browser per verificare» |
| Apertura (scena che prende forma) | ✔ | ✔ | ✔ | ✔ | ✔ | velo bloccante corretto e verificato 17/09 (`03d43e6`) |
| Report laterale progressivo | ✔ | ✔ | ✔ | ◐ | ✔ | pubblicato `d1082de` (-b) e corretto `e6196f4` (-c): gli ambienti misurati si accendono uno alla volta con la scheda di lato; il nome dell'occhio solo dove l'occhio ha parlato; mai le tappe cablate del bundle. Provato nel workspace con fonti vere; sulla pagina pubblicata visto accendersi (-b), la -c non ancora vista dal vivo |
| Canale occhio → mondo (posizioni dalle foto) | ✔ | ✔ | ✔ | ◐ | ✔ | `3a49378` + `67e1cfc`. **Dal vivo (18/09, versione pubblicata, Chrome senza finestra, occhio vero):** 213 cose posate dalle piante (prima 0), 48/48 riquadri posati dalle prospettive, 20 volumi con «cose viste dentro». La mappa: nessuna marcatura dall'occhio su questo modello — i suoi 2 «muri» erano riquadri grandi come l'edificio (101 × 57 m), scartati dalla guardia. Il cervello (LM Studio) non era raggiungibile da quel Chrome: la parte «volume per volume al cervello» non è vista funzionare |
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

### 6.5 — ✅ CODICI FITTIZI NEL BUNDLE — TOLTI il 18/09 (`8b96908`)

- **Cosa c'era** (bundle, `index.html` ~riga 12843): `iB` = sei tappe da aeroporto a
  coordinate fisse di un altro scalo, usate quando il progetto non ha `nodes_config`;
  `hV()` = una traiettoria dimostrativa di 28 figure finte con una durata inventata
  di 180 s; `hK` = inquadrature con nomi da aeroporto. Da lì venivano i nomi
  «Ingresso / Parcheggio, Accettazione, Controllo, Lounge, Imbarco A, Gate A1» e i
  tragitti in linea retta fuori dal modello. L'ipotesi «nomi salvati in
  `nodes_config`» era sbagliata.
- **Cosa c'è adesso:** tappe iniziali vuote, una scena vuota finché non arriva la
- **18/09, trovate facendo l'inventario delle scritte e tolte (`39199e2`):** sotto la
  linea del tempo c'erano cinque `<span>` fissi «INGRESSO · ACCETTAZIONE · CONTROLLO ·
  LOUNGE · GATE A1», che non venivano da nessuna zona. La guardia
  `veritas_fittizi.test.mjs` (sezione 4) fallisce se tornano.
  simulazione vera, una sola inquadratura («global»). La guardia
  `veritas_fittizi.test.mjs` legge il bundle vero e fallisce se tornano.
- ⚠️ **Nascondevano un difetto vero, trovato dalla prova di caricamento reale:** con
  «almeno due nodi» in scena `applyAutoAssignment` non assegnava le zone misurate al
  primo caricamento. Tolte le tappe finte partiva il giro `analyzeMesh →
  runStructuralAnalysis → applyAutoAssignment → assegnaZoneMisurate → analyzeMesh`, 80
  volte, fino a «Maximum call stack size exceeded» e alla scheda crollata. Corretto con
  una guardia in `assegnaZoneMisurate` (non rifà l'analisi dentro se stessa).
- **«Reception» e «Origin» (visto il 18/09 nella sonda del banco):** sono nodi con
  origine `nome+cose`, cioè nascono dai NOMI DELLE MESH del file (e dagli oggetti
  attorno), non dal bundle. Resta da decidere se un nome di mesh inglese debba
  diventare il nome di una tappa (Regola 0-bis: i nomi nascono dal riconoscimento).
- **Visto una volta, non ripetuto:** un errore `RuntimeError: unreachable` dentro un
  modulo WebAssembly (probabilmente Rapier) durante una delle prove; nelle due prove da
  200 s successive non è ricomparso.

### 6.6 — Difetti chiusi ma mai riconfermati dal vivo

- **Corpi Rapier non svuotati fra una corsa e l'altra** (`73ab9ff`, 11/09): la
  pulizia è nel codice, **mai riprovata con più Play consecutivi**.
- **Frecce come obbligo di percorso** (`84ec89c`, 15/09): pubblicata senza verifica.
- **Sosta che si siede** (`44038c5`, 16/09): pubblicata, mai vista a schermo.
- **Ricalcolo automatico degli accessi** su `veritas:vista`: non scatta da solo, il
  perché non è stato indagato.

### 6.7 — Visti nel banco il 18/09, mentre si faceva la pagina di attesa

- ✅ **Durante il lavoro dell'occhio la pagina si ferma a tratti — CHIUSO il
  20/09** (`fdb5eaa`, costruzione -h). Non era il motore ONNX, che il `proxy` aveva
  già spostato: era il contorno che transformers.js faceva sul filo della pagina
  (ridimensionare la pianta a 960×960, normalizzarla, spezzare in simboli 177 parole,
  e leggere 3.600 riquadri **per ogni parola**). Ora l'occhio intero sta in un Web
  Worker. Misurato a pagina isolata: blocco peggiore 394 → **183 ms**, attività lunga
  peggiore 241 → **114 ms**, sguardo 13,1 → 11,7 s, e **le stesse 91 cose con gli
  stessi punteggi**. Nel Chrome di Raffaella, con la GPU, resta non misurato.
- **Splat: sotto il velo l'app inquadra male** (camera attaccata al pavimento): il
  riquadro dello splat per la camera dell'app è vuoto (`Box3.setFromObject` non vede
  le gaussiane; Spark ha `getBoundingBox`). Il velo lo legge giusto.
- **Splat di prova (appartamento, 3 stanze, porte da 0,75 / 0,90 / 1,20 m): il motore
  geometrico vede UN solo ambiente da 88 m² e nessun varco.** Lo splat è fatto qui
  (`scratchpad/banco_vivo/crea_splat.mjs`), letto giusto da Spark (scale e colori
  controllati). È il caso in cui le zone le deve dare l'occhio.
- **`veritas_corpo_collegato.test.mjs`: 2 prove falliscono già su `8b96908`** (non
  toccato dal 18/09 -d): «blocco 3 byte-per-byte quello di sempre» (la guardia non
  ritrova il blocco dopo che i codici fittizi sono stati tolti) e «il collisore
  dell'edificio non riceve flag». Da guardare.

---

### 6.8 — ⛔ Alla prima visita la pagina si blocca da sola, e non è l'occhio

Misurato nel banco il 20/09 (`banco/vivo/prova_fluidita.mjs`, manopola
`SENZA_OCCHIO`). Con l'occhio **acceso ma che non guarda**, su un profilo nuovo:

| | prima visita | visita di ritorno |
|---|---|---|
| pagina `crossOriginIsolated` | **no** | sì |
| blocco peggiore, occhio fermo | **87,6 s** | — |
| attività lunga peggiore | 19,9 s | 241 ms |
| fotogrammi | 3,4 al secondo | 13,4 al secondo |

Un'attesa programmata di 70 s ne ha impiegati 145: il filo principale era occupato
al punto da far slittare i timer di più del doppio. **L'occhio non c'entra — era
fermo.** È lavoro d'avvio della pagina stessa.

Due conseguenze:

1. **È un difetto più grosso di quello appena chiuso**, e va guardato prima di
   rimettere mano alla fluidità: finché dura, qualunque misura fatta alla prima
   visita descrive questo e non ciò che si sta misurando.
2. `veritas_fili.js` installa il lavoratore di servizio che isola la pagina, ma un
   lavoratore di servizio prende il comando **solo dal caricamento successivo**. Alla
   prima visita la pagina non è isolata, il motore ONNX resta a un filo solo, e lo
   stesso sguardo passa da 13 s a 120. Chi apre EIDETICA per la prima volta prende la
   macchina peggiore, ed è esattamente il cliente nuovo.

⚠️ **Le misure di fluidità si fanno a pagina isolata, e si dichiara sempre in quale
delle due condizioni si è**: la prova lo stampa (`contorno:`). Due giri sullo stesso
identico codice, uno isolato e uno no, danno 13 s e 120 s — chi li mescola non sta
misurando niente.

---

### 6.9 — ⛔ MISURATO: l'occhio non sbaglia, sta troppo lontano

Misura del 20/09 (`banco/vivo/occhio_sui_renderi.mjs`, aeroporto, 177 parole, OWLv2
q8). È la riga di partenza per il confronto con SAM 3, e spiega la frase del §1
«sull'aeroporto l'occhio vede quasi solo il lato aerei».

| immagine | rilevazioni | sopra 30% | migliore | che cosa pesca |
|---|---|---|---|---|
| pianta dall'alto | 19 | **0** | 19% | schermo, cielo, bacheca, grattacielo, computer, monitor, quadro |
| scorcio 1 | 37 | 5 | 50% | aereo ×9, pontile ×6, scala ×5 |
| scorcio 2 | 39 | 5 | 37% | pontile ×10, aereo ×7, grattacielo ×4 |
| scorcio 3 | 64 | 5 | 52% | aereo ×14, pontile ×10, grattacielo ×4 |

**La causa si vede guardando le immagini, e non è il modello.**

1. **La pianta dall'alto è quasi vuota**: due rettangoli grigi piatti, proiezione
   ortografica senza ombre né altezza. Non ci sono sedute, banconi, muri leggibili.
   OWLv2 risponde «schermo / monitor / quadro / manifesto» perché è **esattamente
   quello che l'immagine mostra**: pannelli piatti. Non è un errore dell'occhio, è
   una risposta corretta a una figura senza architettura dentro.
2. **Negli scorci il terminal è un francobollo.** Misurato: **8,4 pixel al metro**.
   Una seduta da 55 cm è **4,5 pixel**; un bancone da 3 m è 25 pixel; un aereo da
   40 m è 336. Poi OWLv2 rimpicciolisce ancora a 960×960. L'occhio nomina gli aerei
   e i pontili perché sono le uniche cose abbastanza grandi da esistere.

⚠️ **CONSEGUENZA SULLA STRATEGIA: prima l'inquadratura, poi il modello.** Nessun
modello — né SAM 3, né Grounding DINO — può dare un nome a una seduta di quattro
pixel. Cambiare occhio senza cambiare distanza non sposta niente, e costerebbe un
server con scheda video per scoprirlo. Il passo che ha senso è **avvicinare
l'occhio**: scorci che inquadrano una PORZIONE dell'edificio a 40-60 pixel al metro,
dove una seduta è 25-35 pixel. È un cambio di inquadratura, non di impianto, e il
banco lo misura già.

**Lo sfondo trasparente costa.** La stessa pianta, con il bianco sotto invece del
fondo trasparente, passa da 19% a 30% di fiducia migliore e comincia a pescare
**«muro» ×3 e «soffitto»** invece di «schermo» e «grattacielo». L'app oggi passa
all'occhio i pixel con l'alfa, che diventa NERO: gli stiamo mostrando una pianta
chiara su fondo nero, cioè una cosa che somiglia a uno schermo acceso. Mettere un
fondo prima di far guardare è una riga, e sposta le parole verso l'edificio.

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
| Canale dell'occhio sulla versione pubblicata -a e col codice -b | 18/09 | reale, Chrome senza finestra del workspace (accesso finto dello stub, modello scelto dal pulsante «Nuovo progetto», occhio OWLv2 vero) | ✔ posizioni dalla pianta 213 (prima 0); ✔ 48/48 riquadri dalle prospettive (con 8 s a foto; 25/48 con 2,5 s); ✔ 20 volumi con cose viste dentro; ✔ apertura: 11 zone accese, 2 confermate dall'occhio, chiusa dopo che l'occhio ha parlato; ✖ nessuna marcatura dell'occhio sulla mappa (niente di credibile visto); ✖ cervello non raggiungibile da quel Chrome |
| Codici fittizi tolti dal bundle, caricamento reale | 18/09 | reale, banco del workspace (app vera, codice del workspace) | ✖ prima della guardia: giro infinito, «Maximum call stack size exceeded», scheda crollata; ✔ con la guardia: modello in 10 s, zero errori di pagina, solo «global», tappe = ambienti misurati; confronto di 200 s con la versione pubblicata: stesso ritmo di rigenerazione della traiettoria, stesse tappe finali |
| `veritas_fittizi.test.mjs` | 18/09 | automatico | ✔ 19/19 sul workspace; ✖ sulla versione pubblicata prima di `8b96908` (come deve) |
| Pagina di attesa, aeroporto GLB | 18/09 | reale, banco del workspace, codice del workspace | ✔ quattro stati in successione (attesa 3 s → zone → conformità → orientamento → zone...), zero errori di pagina; conformità vera: porte 6/6 ≥ 0,80 m (DM 236/1989 art. 8.1.1), strettoie 29/38 < 1,00 m (art. 8.1.9), caso peggiore 0,50 m ± 0,25 in Ambiente 1; 3 ingressi; 47 tratti in linea retta |
| Pagina di attesa, Gaussian Splat di prova | 18/09 | reale, banco del workspace | ✔ lo splat si vede nel velo (61.079 gaussiane, stessi dati del modello); ✖ il motore vede un solo ambiente (§6.7) |
| Pagina di attesa in inglese, 1280×720 | 18/09 | reale, banco del workspace | ✔ Standby / Zones / Compliance / Wayfinding; nomi neutri tradotti |
| `veritas_apertura.test.mjs` | 18/09 | automatico | ✔ 72/72 (erano 34), fra cui «senza dati nessun numero, in nessuno stato, in nessuna lingua» |
| Tappe finte della linea del tempo tolte, caricamento reale | 18/09 | reale, banco del workspace | ✔ zero errori di pagina, 9 zone e 6 varchi come prima; la riga sotto la linea del tempo è vuota |
| Inventario delle scritte, prima e dopo `veritas_lingua.js` | 18/09 | reale, banco del workspace (`inventario_lingua.mjs` + `analizza_lingua.mjs`) | prima: una trentina di scritte nella lingua sbagliata; dopo: in italiano nessuna, in inglese solo i messaggi della conversazione (e il nome del progetto, che è un dato) |
| `veritas_lingua.test.mjs` | 18/09 | automatico | ✔ 35/35 |
| Conversazione in inglese, banco | 18/09 | reale, banco del workspace, piattaforma in inglese, 45 s | ✔ 14 messaggi su 14 in inglese, 87 scritte tradotte, nessuna scritta italiana visibile (salvo il nome del progetto); `veritas_lingua.test.mjs` 45/45 |

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
| **Costruzione** | `2026-09-20-h` |
| **Commit / push** | `fdb5eaa` — *l'occhio in una stanza sua*, su `main`. Autorizzazione di Raffaella: «un fix e un commit alla volta, prova nel banco prima di pubblicare» |
| **File modificati** | `veritas_occhio_lavoratore.js` (**nuovo**: l'occhio intero in un Web Worker) · `veritas_riconosce.js` (prova il lavoratore, e ricade sulla strada di prima se non si apre; freno sulle accensioni in corso; una sola scala di formati; `stato().dove` dice da dove guarda) · `index.html` + `veritas_anteprima.js`, `veritas_comprensione.js`, `veritas_montaggio.js`, `veritas_passo.js` (solo la cascata dei `?v=`: riconosce 5→6, anteprima 16→17, comprensione 15→16, passo 1→2, montaggio 33→34) · `banco/vivo/prova_fluidita.mjs` e `occhio_sui_renderi.mjs` (**nuovi**) · `.gitignore` |
| **Problema** | fix 2 di 4 della lista del 18/09: la pagina si ferma mentre l'occhio guarda (§6.7) |
| **Test eseguiti** | §7, più il banco dal vivo: quattro coppie prima/dopo sulla versione pubblicata e sul workspace, a pagina isolata e non |
| **Risultato** | a pagina isolata: blocco peggiore 394 → **183 ms**, attività lunga peggiore 241 → **114 ms**, sguardo 13,1 → 11,7 s. **Le stesse 91 cose con gli stessi punteggi**: il trasloco non cambia ciò che l'occhio vede |
| **Limite residuo** | ① nel Chrome di Raffaella, con la GPU, non misurato. ② L'accensione dentro il lavoratore è variabile (11,6 s e 110,6 s in due giri a parità di condizioni): da tenere d'occhio, succede una volta per pagina. ③ **§6.8**: alla prima visita la pagina si blocca fino a 87,6 s **da sola**, con l'occhio fermo — più di quanto la bloccasse l'occhio. ④ `veritas_riconosce.test.mjs` 1 prova rossa, `veritas_zone` 23, `veritas_corpo_collegato` 2: **rosse già su `a6550eb`**, verificato togliendo le mie modifiche |
| **Prossimo passo unico** | Raffaella guarda la -h dal link. Poi, in ordine: **§6.9** (avvicinare l'occhio e mettergli un fondo — è il passo che sblocca il §6.1 e costa poco) e **§6.8** (la pagina che si blocca da sola), tutti e due **prima** del fix 3: il primo perché senza di lui nessun cambio di modello serve a niente, il secondo perché falsa ogni misura fatta alla prima visita |

---

## 9. PROSSIMO PASSO AUTORIZZATO

**I quattro fix chiesti da Raffaella il 18/09, uno alla volta, ognuno col suo commit** («comincia fix e commit uno alla volta: mi raccomando»):

1. ✅ **Lingua** — interfaccia (`eb2b966`) e conversazione (`9e4648e`), costruzione -g.
2. ✅ **Pagina che non rallenta mentre l'occhio guarda** — l'occhio in un Web Worker
   (`fdb5eaa`), costruzione -h. Sono emersi §6.8 (la pagina si blocca da sola alla
   prima visita) e la conferma che OWLv2 vede quasi solo il lato aerei.
3. **Soglie di norma**: una tabella delle 19 soglie con la fonte, da far validare a
   Raffaella; se lo vuole, distinguere i corridoi dagli spazi fra le sedute.
4. **Nomi giusti agli ambienti** dall'occhio: prova nel Chrome di Raffaella con LM
   Studio acceso, e un modello con interni veri.

Altri punti aperti: vedere l'occhio segnare muri e porte (la pagina di attesa li
disegna); splat inquadrato male sotto il velo; `veritas_corpo_collegato` (§6.7).

Il banco del workspace si riusa: `scratchpad/banco_vivo/prova_attesa.mjs`,
`sonda_stati.mjs`, `crea_splat.mjs`, `inventario_lingua.mjs` + `analizza_lingua.mjs`.
⚠️ Lo scratchpad è temporaneo: se non c'è più, si rifà da `banco/finti/supabase_finto.js`.

- **Regole di impianto decise da Raffaella (17/09), eseguite:**
  1. **Nel dubbio vince l'occhio** — la mappa applica l'occhio dopo la geometria; un
     varco visto apre anche un muro pieno (la domanda aperta del 17/09 era decisa da
     questa regola: si esegue, non si richiede).
  2. **Finché l'occhio non ha parlato**, zone che si accendono e report laterali:
     fatto (`d1082de`, `e6196f4`).
- **Condizioni per fermarsi.** Se l'occhio non risponde, ci si ferma e lo si
  dichiara: **non si sostituisce l'occhio con un'euristica**.

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
| 18/09 | **La pagina di attesa prende lo stile delle immagini di riferimento di Raffaella**: scuro col fumo, modello vero, report a terminale sul lato, quattro stati in successione (attesa, zone, conformità, orientamento). Il resto della piattaforma resta carta. I numeri d'esempio delle immagini non si copiano: solo misure |
| 18/09 | **Dopo ogni pubblicazione si dà a Raffaella il link con la costruzione nella query** (`?v=<costruzione>`), perché il suo browser le mostrava versioni vecchie. «Quando è possibile aggiorna GitHub, fermati e fornisci link» |
| 18/09 | **I fix si fanno uno alla volta, ognuno col suo commit** («comincia fix e commit uno alla volta: mi raccomando»); ordine: lingua → pagina fluida → soglie di norma → nomi degli ambienti |
| 18/09 | Le scritte dell'interfaccia nelle due lingue stanno in **un solo dizionario** (`veritas_lingua.js`), che traduce anche il bundle senza toccarlo |
| 20/09 | **Dentro il lavoratore il proxy di ONNX si SPEGNE.** Era stato acceso il 04/09 perché l'occhio non trovava i 255,5 MB del motore con la scena 3D caricata: la stanza separata adesso è il lavoratore stesso, e tenerlo acceso aprirebbe un lavoratore dentro il lavoratore e una seconda copia del motore in WebAssembly |
| 20/09 | **Si misura il BLOCCO, non l'occupazione del filo.** Col lavoratore la pagina torna a disegnare e ogni fotogramma è lavoro: a contare il filo occupato, il rimedio risulta peggiore del male. Conta il blocco più lungo e i fotogrammi che escono |
| 20/09 | **Accesso SAM concesso (20/09). Si parte da `facebook/sam3`, non da `sam3.1`**: `sam3` è confezionato per la libreria che già usiamo (`AutoModel`, pronto per un server) e ha la versione ONNX per il browser; `sam3.1` è un checkpoint nudo, una seconda strada di codice per una precisione che non sappiamo ancora misurare. Passare a 3.1 sarà cambiare i pesi, non l'impianto |
| 20/09 | **SAM non sostituisce OWLv2, lo completa**: uno trova e nomina (rettangoli), l'altro ritaglia il contorno (sagome). Per il §6.1 servono le sagome — una porta è un vuoto in un muro, non un rettangolo. La faccia di SAM che trova per nome gira solo su server con scheda video; quella che ritaglia gira nel browser, e `Sam3Tracker` è già dentro transformers.js 3.8.1 |
| 20/09 | ⛔ **SegFormer su ADE20K NON SI CONSIDERA.** Deciso da Raffaella: «non consideriamo assolutamente questo prodotto». Regge anche da sola la ragione tecnica — i pesi NVIDIA sono §3.3, «solo uso non commerciale» — ma la decisione è sua e non si riapre. ⚠️ La tentazione è in casa: `ADE20K_150` sta in `veritas_riconosce.js:97`. **Quell'elenco è un vocabolario di parole, non pesi NVIDIA, e come vocabolario resta**; quello che non entra è il modello |
| 20/09 | **Dei modelli Meta si prende solo SAM 3.1**, e solo come occhio da server (sostituto di OWLv2), tenendo locchio nel browser come ripiego. SAM 3D Objects/Body no: EIDETICA il 3D ce lha gia e non puo accettare misure inventate. DINOv3 rimandato: da vettori, non nomi, e servirebbe un insieme etichettato. Licenze e conformita in `third_party_licenses/` |

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
