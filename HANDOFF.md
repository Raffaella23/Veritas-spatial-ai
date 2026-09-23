# HANDOFF — EIDETICA

> Documento unico di stato. Sostituisce ogni altra copia: `Desktop\HANDOFF.md`,
> `CLAUDE_INSTRUCTIONS.md`, la cartella `Veritas-spatial-ai-main` e il clone vuoto
> `Veritas-spatial-ai` sono morti e non vanno letti.

---

## 0. DIRETTIVE DI RAFFAELLA — si eseguono, non si discutono

### 0.1 — Il velo è il vestito di TUTTA la piattaforma (20/09/2026)

> «Mi piacerebbe mantenere lo stesso render che abbiamo (velo) all'inizio anche
> nella vista live e nelle viste degli agenti: questo permette alle analisi della
> piattaforma di spiccare ed essere più evidenti.»

Il modo di disegnare del velo di apertura **non è la grafica di una schermata**: è
il modo in cui EIDETICA mostra lo spazio, ovunque. Vale per il velo, per la **vista
dal vivo** e per le **viste degli agenti**. La ragione è di lettura, non di gusto:
su un fondo trattenuto e uniforme, quello che la piattaforma ha **capito** — zone,
percorsi, conformità, flussi — si stacca e si vede. Su un modello con i suoi
materiali, colori e texture, l'analisi ci si perde dentro.

⚠️ **Conseguenza: il modello originale non sparisce, si mette sotto un pulsante.**
L'utente deve poter vedere il proprio modello com'è, quando vuole. Il pulsante segue
la logica già in uso nell'interfaccia — non se ne inventa una nuova, e non si
nasconde in un menù.

⚠️ Questa direttiva **vale per ogni vista che si costruirà d'ora in poi**. Non è un
compito da spuntare: è la regola con cui si giudica qualunque schermata nuova.

---

### 0.2 — LA FIGURA UMANA È IL METRO (acclarata da mesi, ribadita il 22/09/2026)

> «L'uomo, la figura della gente, è il metro. Se ti capita di passare con una
> persona a due metri sotto un'altezza interpiano di 1,75, abbiamo sbagliato la
> base: è sbagliato **a scalare il modello**. Infatti risultano leggermente più
> alti dei passeggeri che stanno nel modello. Questo è un falso problema.»

Un modello arriva senza unità affidabili. Le bande di `veritas_scala.js` —
unità dichiarate, altezza di piano, altezza totale, larghezza dei varchi — danno
un **intervallo**, non una misura. Le figure umane disegnate dentro il modello
sono l'unico oggetto di cui si conosce già la statura vera: **sono il campione**.

⚠️ **Regola operativa.** Ogni volta che un ingombro verticale fa dire «non ci
passa una persona» in modo assurdo per un edificio vero — interpiano sotto i
2,2 m, porte sotto 1,9 m — **il sospetto è la scala, non la geometria**. Si
confronta l'altezza dell'agente con quella delle figure presenti nel modello
PRIMA di indagare altro.

⚠️ **Dove va scolpita:** nelle fasi iniziali del riconoscimento del modello, da
cui esce il fattore di scala. Non a valle. Oggi `veritas_scala.js` **non guarda
le figure**: è la lacuna da chiudere.

⚠️ Le figure restano comunque fuori dal decidere DOVE vanno le tappe: lì sono la
controprova (`veritas_controprova.js`), e giudice e parte insieme non valgono.

---

### 0.3 — IL DUBBIO SI CHIEDE SUBITO, NON SI INDAGA (22/09/2026)

> «Prima di imbarcarti in odissee di token inutili, quando ti viene un dubbio
> chiariscimelo in linguaggio semplice e io ti do la dritta, in maniera da non
> sprecare tempo. Scrivitelo in fronte, scrivitelo dove non puoi non vederlo.»

Il 22/09 ho speso mezza sessione a misurare perché la mappa di cammino tagliava
l'edificio in nove pezzi, ho costruito quattro sonde e ho preparato un menù di
opzioni. La risposta era il §0.2, data mesi prima: **falso problema**.

⚠️ **Regola operativa, e vale PRIMA di aprire il banco, non dopo:**
1. appena una misura non torna, la domanda si fa **subito**, in due righe, in
   italiano semplice: «ho trovato X, non mi torna perché Y — come la leggi?»;
2. **non si costruisce una sonda** per rispondersi da soli a un dubbio che
   Raffaella chiarisce in una riga. Il banco viene DOPO la sua direzione;
3. una misura strana è quasi sempre il sintomo di qualcosa di **già deciso**:
   prima si cerca nel HANDOFF, poi si chiede, poi si misura;
4. i menù a scelta multipla la stancano: **una raccomandazione secca** con il
   numero dietro, e una sola domanda in fondo.

Il costo di un'indagine sbagliata non è il mio tempo: sono i suoi gettoni.

---

### 0.4 — L'OCCHIO È IL RE, IL CERVELLO È IL SUDDITO. NON È UNA DOMANDA

> Raffaella, 22/09/2026: «Io ho stabilito da tempo che il re è l'occhio e il
> suddito è il cervello. Elimina tutto quello che può portare di nuovo a questo
> problema. Non ce lo dobbiamo più porre come problema. **È una verità. Punto.**»

**Non si ridiscute, non si rimette ai voti, non si trasforma in opzione.** Chi
trova un pezzo di programma dove il cervello decide al posto dell'occhio non
apre una domanda: lo corregge.

Cosa vuol dire, operativamente:

1. **Vede l'occhio, valida il cervello.** Il cervello non comanda sull'occhio:
   casomai il contrario — va a validare quello che l'occhio ha visto. (Deciso il
   04/09/2026, dopo che l'avevo collegato al rovescio.)
2. **Nel dubbio vince l'occhio.** La mappa di cammino applica l'occhio **dopo**
   la geometria, mai prima: un varco visto apre anche un muro pieno. La
   geometria è un parere secondario, non un veto.
3. **Muro e varco si riconoscono guardando**, anche su uno splat. Non si chiede
   mai un IFC né una mesh che si chiami «muro».
4. **Se l'occhio non risponde ci si ferma e lo si dichiara.** Non si sostituisce
   l'occhio con un'euristica, con una tabella o con un vocabolario di tipologie
   (Regola 0-bis).

⚠️ **Stato del canale, verificato il 22/09/2026 riga per riga — il codice
   rispetta già questa verità:** `veritas_comprensione.js` posa quello che
   l'occhio vede in `window.__veritasVistoNelMondo`; `veritasMappaCammino`
   (`index.html` ~1953) lo rilegge a ogni ricostruzione della mappa e applica
   `marcaDallOcchio()` **dopo** la geometria, con la regola citata nel
   commento. `veritas_comprensione.js` **è in pagina**, importato da
   `veritas_montaggio.js` (`type="module"`, `?v=19`).

   Quindi **il §6.1 non è più «l'occhio non ha voce»: la voce ce l'ha, e non
   arriva niente da dire.** Il difetto è a monte, nel posare nel mondo quello
   che l'occhio vede — §6.12, le 44 rilevazioni «sul vuoto». Chi riapre il §6.1
   parta da lì e non dal permesso, che è già dato.

---

## 1. STATO ATTUALE

| | |
|---|---|
| **Aggiornato** | 22/09/2026 sera (la statura di chi cammina, l'occhio che guarda solo dove c'è qualcosa, e la scoperta che la pagina muore mentre l'occhio lavora) |
| **Repository ufficiale** | `Raffaella23/Veritas-spatial-ai` |
| **Branch** | `main` (unico, Regola B) |
| **Ultimo commit di codice pubblicato** | `1c4faef` — *l'occhio guarda solo dove c'è qualcosa* (prima: `c178d16` un giro solo e domande in fila, `90f59c6` la statura 1,75, `7ba9a28` tutta la documentazione al narratore) |
| **Nota** | `1c4faef` è il fix PARZIALE del §6.16: corretto ma **inerte** su questo modello, vedi §6.16 |
| **Deploy** | GitHub Pages da `main`. ⚠️ la CDN può servire la versione precedente per qualche minuto dopo il deploy: verificare sempre `window.__EIDETICA_COSTRUZIONE` prima di giudicare |
| **Costruzione pubblicata e servita** | `2026-09-22-e` — link: `https://raffaella23.github.io/Veritas-spatial-ai/?v=2026-09-22-e` |
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

### 6.1 — ⛔ PRIORITÀ: l'occhio ha voce sul cammino, ma non gli arriva niente da dire

⚠️ **TITOLO CORRETTO IL 22/09/2026.** Diceva «l'occhio non ha voce sulla mappa
di cammino», e non è più vero: fa riaprire la domanda sbagliata — il permesso —
quando il permesso c'è già (§0.4, **verità, non domanda**). Verificato riga per
riga: `veritasMappaCammino` legge `window.__veritasVistoNelMondo` a ogni
ricostruzione e applica `marcaDallOcchio()` **dopo** la geometria;
`veritas_comprensione.js`, che riempie quella variabile, è in pagina, importato
da `veritas_montaggio.js`. **Il canale è aperto e nessuno lo contraddice.**

⛔ **Il difetto è a monte: nel canale non arriva niente di posabile.** L'occhio
vede, ma quello che vede non si posa nel mondo con una posizione che la mappa
possa usare — §6.12, le 44 rilevazioni «sul vuoto». Chi riprende questo punto
parte da lì: **non dal permesso, e non dalla precedenza, che sono decisi.**


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
- **Autorizzazione.** La REGOLA è decisa e non si richiede (§0.4). Resta da
  chiedere, come sempre, il via a scrivere le righe di codice (§4.5).

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

### 6.9 — ✅ CHIUSO il 21/09: l'occhio non era cieco, era AL BUIO

⚠️ **LA DIAGNOSI SCRITTA QUI IL 20/09 ERA SBAGLIATA e va letta come un errore da
non rifare.** Diceva «l'occhio sta troppo lontano, prima l'inquadratura poi il
modello». Era una conclusione tratta da UNA SOLA vista — la veduta larga — mentre
il giro vero ne monta quattro. Misurando tutte:

| tipo di vista | quanto e' fitta | cose di dentro trovate |
|---|---|---|
| veduta larga | 8,4 px/m | 4 |
| ravvicinate ai gruppi | 11 → 51 px/m | 1, 0, 0, 8 |
| passata in ordine | **117,9 px/m** | 0, 0, 0, 2 |
| da dentro gli ambienti | 73-87 px/m | **0, 0, 0** |

A 117,9 pixel al metro una seduta e' larga 60 pixel e un metal detector 120, e
l'occhio trovava NIENTE. **Non era la distanza.**

**La causa vera: ogni resa passava da `spegniLuci`** — materiali sostituiti con
equivalenti non illuminati. Conservava il colore e buttava via il rilievo, e
senza luce non c'e' forma: un muro grigio, un pavimento grigio, una colonna
grigia e un bancone grigio sono lo stesso rettangolo grigio. Le viste da dentro
rispondevano «pista, cielo, ponte, terra» — roba di FUORI, stando dentro — oppure
niente.

**Acceso il sole** (`accendiIlSole`, `veritas_vista.js`), stesse identiche viste,
un solo cambiamento per volta:

| da dentro | senza luce | con il sole |
|---|---|---|
| 86,8 px/m | 0 | **2** — sala d'attesa con file di sedute, tornello |
| 73,4 px/m | **0** | **14** — sedie, sedute, colonna, scala mobile, sala d'attesa |
| 81,7 px/m | **0** | **4** — sala d'attesa, sedute girevoli, aula a gradoni |

Sono i nomi che servono al §6.1. **Resta vero** che il vocabolario non c'entrava
(le parole c'erano gia' tutte) e che una stanza non e' un oggetto: il nome del
luogo nasce dal gruppo, e `riconosci()` lo fa gia' — ora ha qualcosa da
raggruppare.

**Resta aperto:** la passata in ordine a 117,9 px/m inquadra ~6,5 m alla volta,
cioe' striscia a scala di mobile lungo un edificio di duecento metri: quasi tutti
i suoi scatti sono aria.

✅ **Le planimetrie per livello ora arrivano** (`5577a5e`, §6.12). E la frase
«all'occhio continuano a non arrivare» era piu' vera di quanto sembrasse: non
arrivavano perche' l'abaco era rotto da `1d5c25b` e non ne disegnava NESSUNA
(§6.11).

---

### 6.10 — ⛔ La guardia dell'impronta del bundle e' ferma

`banco/reinlina.py` rigenera le copie incollate, ma la sua verifica finale
(«il blocco 3 byte-per-byte quello di sempre») cerca l'impronta
`beb4953744b92c5b`, che non esiste piu' dal 18/09 — quando sono stati tolti i
codici fittizi (`8b96908`). Ogni reinline stampa **BUNDLE ALTERATO** e la
verifica non protegge piu' niente. E' lo stesso allarme delle 2 prove rosse di
`veritas_corpo_collegato.test.mjs` (§6.7). Va rimessa in pari l'impronta, dopo
aver controllato che il blocco 3 sia davvero quello di `main`.

---

### 6.11 — ✅ CHIUSO il 21/09 sera: l'abaco era morto da un giorno

`scatta()` in `veritas_tavole.js` chiamava `accendiIlSole(..., opzioni)` con una
variabile che in quella funzione **non esiste**. Ogni tavola moriva con
`opzioni is not defined`: piante, prospetti e sezioni, tutte, sempre. Nato con
`1d5c25b` (il sole), insieme alla correzione dell'ombra; al commit prima quella
riga non c'era.

**Perche' non si vedeva.** `abaco()` sta dentro un `try`: il giro scriveva una
riga di log — *«non sono riuscito a disegnare l'abaco: opzioni is not
defined»* — e proseguiva senza nessun disegno canonico. La funzione rispondeva
«niente tavole» invece di fermarsi: **un difetto silenzioso**, il tipo peggiore,
e lo stesso schema gia' pagato col travaso dei nomi (28/08) e col ponte della
navigazione (17/09).

**Conseguenza architettonica:** per un giorno intero all'occhio non e' arrivato
niente di canonico — ne' le piante per livello, ne' i quattro fronti, ne' le
sezioni. Cioe' l'unica cosa che gli mostra l'edificio per intero, e la ragione
per cui l'abaco esiste (08/09: una pianta porta 2.759 m2 in una figura, contro
tredici fotografie di cui sette vuote).

**Correzione** (`4e08685`, costruzione `2026-09-21-j`): `scatta()` riceve le
opzioni della tavola — quello che il commento del sole dichiarava gia' di fare.
Misurato nel banco: *«l'abaco: 11 tavole (2 piante, 6 prospetti, 3 sezioni) — da
12 a 24 pixel al metro»*.

⚠️ **Cosa insegna, e vale per i prossimi:** un `try` che scrive in console e
   tira dritto nasconde un guasto totale dietro una riga di log. Dove il
   fallimento significa «il giro prosegue senza l'informazione principale», non
   basta scriverlo: va contato e va detto nel referto.

---

### 6.12 — ✅ CHIUSO il 21/09 sera: all'occhio arriva una pianta PER LIVELLO

Fino a oggi `__veritasGuarda` — l'occhio che assegna i nomi — si disegnava da
solo **una** pianta: `piantaDelPavimento(..., tutto: true)`, il modello intero
schiacciato dall'alto, tutti i livelli stampati uno sopra l'altro.

**La regola l'ha dettata Raffaella il 21/09:** *«in architettura, relativamente
allo zero del piano, si taglia a 1,10 m. E quella e' la planimetria. Punto.»*
Quindi una pianta per livello, e **ogni ambiente si giudica sulla pianta del
piano su cui POGGIA** — il piano del suo solaio, non quello dove arriva la sua
testa.

**La doppia altezza**, posta da lei lo stesso giorno, e' il caso che la regola
deve reggere: una sala alta sei metri poggia a quota zero e si nomina UNA volta,
sulla pianta a 1,10. Sulla pianta del livello sopra quella sala c'e' ancora, ma
e' VUOTO: si vede in proiezione, giu' fino al pavimento di sotto, e li' non si
nomina niente — o prenderebbe due nomi, se stessa e quello che sembra la
balaustra vista dall'alto.

⛔ **Strada scartata, scritta perche' non si ripresenti:** «mostrare ogni mucchio
   su TUTTE le piante e tenere la lettura col punteggio migliore». E' una
   scorciatoia da programmatore: una pianta non e' un tentativo, e' il piano a
   cui appartiene.

**Misurato nel banco** (`banco/vivo/piante_all_occhio.mjs`, aeroporto GLB):

| | lastra schiacciata | 2 piante per livello |
|---|---|---|
| piante all'occhio | 0 | **2** |
| mucchi per piano | — | quota 0,55 → 14 · quota 2,63 → 6 |
| rilevazioni | 80 | **227** |
| mucchi nominati | **8** | **6** |
| nomi dati | pontile, land, scale, aereo, pista, windowpane x2, aereo | aereo, schermo, scale, aereo, armadietti, aereo |

**Risultato doppio, e si dichiara.** L'occhio vede quasi il triplo e comincia a
vedere l'INTERNO — tornello, armadietti, scala mobile, nastro bagagli, cartello,
schermo, sala a gradoni — dove prima rispondeva quasi solo pontili, aerei e
pista. Ma i mucchi **nominati calano da 8 a 6**, e le buttate salgono a 205: 83
battute, 51 troppo grandi, **44 sul vuoto**, 27 sfiorate. Altre 16 erano nomi di
LUOGO (sala d'attesa, gate, varco) e restano testimonianza.

Il calo ha una spiegazione d'architettura: tagliando a 1,10 tutto cio' che sta
piu' in alto finisce dietro la telecamera, e spariscono proprio le cose ALTE che
prima davano i nomi — pontili, aerei, pista. Sono nomi che a un edificio non
servivano.

**Resta da capire: le 44 «sul vuoto»** — l'occhio vede qualcosa dove la
geometria non ha misurato nessun mucchio. E' il §6.1 visto dall'altro lato: non
«l'occhio non parla alla mappa», ma «la mappa non ha un posto dove mettere quello
che l'occhio dice».

---

### 6.13 — ✅ CHIUSO il 21/09 notte: il narratore leggeva un foglio quasi bianco

Raffaella, davanti a due cartellini sbagliati — «SALA D'ATTESA 9» su un
passaggio, «PISTA 5» su un bancone dentro l'edificio: *«sembra avere le
allucinazioni»*. **Non erano allucinazioni.**

Il modello che RACCONTA (`veritas_occhi.js`, via LM Studio) riceveva una fetta
alta 45 cm del modello intero schiacciato. L'immagine è stata **salvata dal
banco e guardata** (`banco/vivo/cosa_vede_il_narratore.mjs`): un rettangolo
grigio piatto, due aerei, e sopra i sette pallini delle zone — due dei quali
appoggiati sulle **ali degli aerei**. Nessun muro, nessun arredo, nessuna porta.
Da li' un narratore non tace: produce nomi plausibili. Rispondeva all'unica
domanda che quella figura permetteva.

**Corretto** (`7ba9a28`): la fetta è tolta — non messa da parte come ripiego. Se
una planimetria non c'è, `guarda()` dichiara e tace. E arriva **tutta** la
documentazione, come chiesto da Raffaella (*«non sono solo le piante, anche i
prospetti, le sezioni, le prospettive con il sole e le ombre... tutto»*):
misurato, **2 piante + 18 allegati** (6 prospetti, 3 sezioni, 9 prospettive).

**Misurato end-to-end**, LM Studio con `qwen2.5-vl-7b` caricato:

| | prima | dopo |
|---|---|---|
| zone nominate | 0 — immagine illeggibile | **7 su 7** in 444 s |

I nomi: *Area di sosta per i passeggeri* (x2), *Aeroporto internazionale* (x2),
*Pista d'atterraggio*, *porta di imbarco*, *area di attesa*. Tutti a fiducia
**media**.

**Lettura onesta:** tre nomi su sette sono nomi di stanza vera. Due sono il nome
dell'EDIFICIO, non della stanza. Due sono doppioni. Il collo di bottiglia si è
**spostato**, non è sparito: adesso non è più *cosa mostriamo*, è **dove sono le
zone** (§6.14).

⚠️ **Da sapere, e costa mezz'ora se non si sa:** LM Studio può essere ACCESO e
   non avere in memoria nessun modello che vede — li scarica dopo l'inattività.
   Il sintomo è `HTTP 400` «No models loaded». Si controlla con
   `lms ps` o `curl localhost:1234/api/v0/models` (campo `state`), si carica con
   `lms load qwen2.5-vl-7b-instruct`. E dal banco la pagina è servita in **https**
   mentre LM Studio sta su **http**: senza `--allow-running-insecure-content` il
   browser risponde «Failed to fetch» e sembra spento.

---

### 6.14 — ⛔ PRIORITÀ: le tappe coprono un quarto dell'edificio, e la causa è il metro

**Il sintomo, misurato il 21/09 notte** (`banco/vivo/dove_stanno_le_tappe.mjs`),
chiedendo alla mappa di cammino una tappa per volta invece di leggere un log:

- **7 su 7 stanno sul calpestabile**, scostamento **0,00 m**;
- **21 coppie su 21** si raggiungono a piedi;
- **MA** le prime cinque sono a **4,6 m esatti** l'una dall'altra, in linea
  retta, e tutte e sette stanno in una striscia di **24 m** (x da −67,3 a
  −43,5) di un edificio lungo **106**. Il 77% del fabbricato non ha una tappa.
- Solo **3 su 7** poggiano su qualcosa di misurato (`origine cose`); le altre
  quattro sono `origine cammino` — infilate lungo il percorso per riempire.

È la frase di Raffaella del 18/08, ancora aperta: *«le tappe stanno tutte in un
posto dove si arriva davvero a piedi, ma non in maniera da avere senso»*.

---

**La filiera, misurata il 22/09** (`banco/vivo/da_dove_vengono_le_tappe.mjs`,
che apre setaccio per setaccio quello che sta fra gli arredi del modello e le
tappe posate):

| setaccio | restano | dove stanno |
|---|---|---|
| 1. posti misurati nel modello | **20** | su 92 m dei 106 — la materia prima c'è |
| 2. tolte figure umane e appesi | **20** | nessuno perso |
| 3. sul calpestabile | **20** | nessuno perso |
| 4. gruppi che si raggiungono a piedi | **9 gruppi** | 28 coppie su 190 |
| il programma ne tiene **UNO** | 3 posti | 549 oggetti, **24 m** |

I primi tre setacci non perdono nessuno. **Si perde tutto nel quarto**, e il
quarto non è un difetto di chi posa le tappe: è la mappa di cammino che gli
arriva già in pezzi. La mappa copre **1.865 m² su 6.254** di impronta, legge
186.074 triangoli da 2.416 mesh **senza saltarne nessuno**, e riconosce 3
livelli (0,50 · 2,71 · 4,63) uniti da 4 rampe dichiarate.

Dove si spezza, tirando un filo a piombo ogni 2 m su tutta l'impronta:

| banda | pavimento disegnato → camminabile |
|---|---|
| x −85 → −45 | 76–100% |
| **x −45 → −35** | **40%** |
| **x −35 → −25** | **17%** |
| x −25 → 21 | 88–100% |

Nella banda di 20 m in mezzo al terminal il pavimento **c'è**, alla stessa quota
di tutto il resto (0,50 m), ma su 98 sonde **97 hanno 1,75 m di cielo sopra**.

---

⛔ **LA CAUSA VERA, e non è la geometria: è il metro** (Raffaella, 22/09,
direttiva §0.2 già data mesi fa)

> «L'uomo, la figura della gente, è il metro. Se ti capita di passare con una
> persona a due metri sotto un'altezza interpiano di 1,75, abbiamo sbagliato la
> base. Questo è un falso problema.»

Misurato subito dopo (`banco/vivo/quanto_e_alta_la_gente.mjs`):

| | |
|---|---|
| figure umane disegnate nel modello | **344 persone, statura mediana 1,63 m** (da 1,45 a 2,01) |
| tutto il verticale snello, senza finestra | 448 pezzi, mediana 1,63 m · decili 1,20 / 1,52 / **1,63** / 1,72 / 1,79 |
| persona con cui la mappa di cammino decide | **2,00 m** (`PERSONA.altezza`, `veritas_navmesh.js`) |
| **differenza** | **+0,37 m: la mappa cammina con qualcuno più alto di tutti i passeggeri del modello** |
| scala applicata alla radice del modello | 5,272× · `__veritasPassengerScale` 0,82 |

**Sotto quel soffitto di 1,75 m la gente del modello passa. Il fantasma da 2,00
no.** I nove pezzi, la striscia di 24 m e il nome «pista d'atterraggio» vengono
tutti da lì.

⚠️ **Un numero da non confondere:** rimettere la scala perfetta NON basta. Perché
le figure risultino alte 1,70 m il modello va scalato ×1,045, e quella banda
diventa 1,83 m — **ancora sotto i 2,00**. Il numero da correggere è quindi
`PERSONA.altezza`, che oggi è **deciso a priori** e non ricavato dalla gente del
modello. Il §0.2 dice che il metro è la figura: la statura della persona con cui
si cammina si **misura sul modello**, non si sceglie.

⚠️ **E la lacuna a monte:** `veritas_scala.js` decide il fattore da unità
dichiarate, altezza di piano, altezza totale e larghezza dei varchi. **Non
guarda le figure umane.** L'unico oggetto di cui si conosce già la misura vera
non entra nella decisione della scala.

**Cosa NON è il difetto** (tre strade che avevo proposto il 22/09 e che il §0.2
rende inutili, scritte per non ripercorrerle): spargere le tappe sui nove pezzi
dichiarando che fra pezzo e pezzo non si cammina; scegliere il pezzo per varietà
di arredi invece che per numero di oggetti; abbassare la persona a 1,85 m come
numero tarato a mano. Rimesso il metro giusto, l'edificio torna un pezzo solo e
le tappe si spargono da sole.

**Criterio di riuscita:** con la statura presa dalle figure del modello, la
banda x −45 → −25 torna camminabile, i gruppi scendono da 9 verso 1, e le tappe
escono dalla striscia di 24 m senza che si tocchi il posatore di tappe.

---

✅ **CORRETTO E PUBBLICATO il 22/09/2026** — commit `90f59c6`, costruzione
`2026-09-22-a`. La statura di chi cammina è **1,75 m** («l'uomo medio al massimo
sta fra un 1,70 e un 1,80», Raffaella). Il posatore di tappe **non è stato
toccato**.

| misura, stesso modello | `-m` | `-a` |
|---|---|---|
| banda x −45 → −35 camminabile | 40% | **100%** |
| banda x −35 → −25 camminabile | 17% | **100%** |
| mappa di cammino | 1.865 m² | **2.280 m²** |
| isole calpestabili | 30 | 29 |
| gruppi di posti raggiungibili a piedi | 9 | 8 |
| posti nel gruppo maggiore | 3 in 24 m | **10 in 43 m** |
| tappe su cose misurate | 3 su 7 | **7 su 7** |
| tappe infilate lungo un righello | 4 | **0** |
| striscia coperta dalle tappe | 24 m | **43 m** su 106 |
| coppie di tappe raggiungibili a piedi | 21 su 21 | 21 su 21 |
| livelli occupati dalle tappe | solo 0,5 | **0,5 e 2,7** |

Il numero stava in **sei** dichiarazioni (`veritas_navmesh.js` PERSONA,
`veritas_corpo.js` MISURE, `veritas_cose.js` CORPO e le tre copie ricopiate in
`index.html`): è la ragione per cui il difetto tornava a ogni giro.
`veritas_corpo.test.mjs` ora le confronta tutte e sei e si ferma se divergono.
`ALTEZZA_LIBERA_NORMA = 2,00` resta in `veritas_navmesh.js` per il confronto
normativo, che DEVE dire «qui il passaggio è 1,75, la norma chiede 2,00» invece
di cancellare il pavimento.

⛔ **QUEL CHE RESTA APERTO:** 43 m su 106, non tutto l'edificio. Gli altri sette
gruppi tengono 10 posti misurati fra x −75 e x 13 e restano fuori. E la lacuna
di §0.2 è intatta: **`veritas_scala.js` non guarda ancora le figure umane** —
la scala si decide da unità dichiarate, altezza di piano, altezza totale e
larghezza dei varchi. Su questo modello le figure risultano alte 1,63 m invece
di 1,70-1,80: il fattore è corto del 4,5%, e nessuno se ne accorge.

---

### 6.15 — ⚠️ DUE LETTURE SBAGLIATE DEL 21/09, scritte per non rifarle

Tutte e due mie, tutte e due riferite a Raffaella come guasti, tutte e due
false. Il costo è stato il suo scoraggiamento, ed è il piu' alto della giornata.

1. **«Nessuna meta poggia sul pavimento».** Veniva dalla riga
   `tappe: 0 appoggiate sul pavimento`. Quel numero conta le tappe **SPOSTATE**
   in quella passata, e vale 0 soprattutto nel caso BUONO — quando il gruppo
   raggiungibile regge già e non c'è niente da correggere (`index.html`, ramo
   `principale.length >= 2`). Un contatore di correzioni letto come un contatore
   di difetti. La misura vera: 7 su 7 sul pavimento (§6.14).
2. **«Gli agenti non usano la fisica».** Veniva da `ultimoEsito()` vuoto. Ma
   `window.__veritasCorpoEsito` è l'esito della COSTRUZIONE del mondo
   (`preparaDaScena`), non del filtraggio, e il mondo si costruisce benissimo:
   186.074 triangoli, capsula r=0,3 h=2, scalino 0,4 m, pendenza 35°.
   Resta **non stabilito** se una traiettoria passi davvero dal filtro del
   corpo: nella finestra osservata (4 minuti, senza far partire la simulazione a
   mano) nessuna c'è passata, e il motore Python su Render veniva chiamato ma
   dorme. **Va misurato prima di dirlo di nuovo.**

⛔ **La regola che ne esce:** un contatore non si legge dal nome. Prima di
   riferire un numero come difetto si apre la riga che lo scrive e si guarda
   **che cosa conta**.

---

### 6.16 — ⛔ Sette zone distribuite su venti posti misurati — fix META' FATTO

Raffaella, 22/09/2026, cerchiando in rosso un blocco di sedute in mezzo al
terminal, con i flussi che ci passano sopra: *«in quella zona non ho mai visto
una zona»*.

**Misurato:** 20 posti con arredi misurati, 7 zone distribuite, tredici posti
veri senza niente.

**Causa:** il numero delle zone nasceva dal conteggio degli **ambienti
riconosciuti dalla geometria** (`veritas_percorso.tappeConsigliate`), che non sa
niente di cosa c'è dentro. Un atrio vuoto di 900 m² e un atrio con quattro
banchi, venti sedute e una fila di casse contano uno tutti e due.

✅ **Meta' fatta** (`1c4faef`, non pubblicata): `tappeConsigliate` prende un
secondo conto, i posti misurati, e tiene il **più grande dei due**. Con 13
ambienti e 20 posti dà 20 zone invece di 7; tetto TAPPE_MAX = 24 invariato;
senza posti misurati si comporta esattamente come prima.

⛔ **META' MANCANTE, ed è la ragione per cui il fix oggi NON FA NIENTE.**
Misurato al banco (`banco/vivo/regge_venti_tappe.mjs`), console della pagina:

```
[VERITAS percorso] 21 ambienti, 0 posti misurati -> 10 tappe
```

Quando `applyAutoAssignment` decide quante zone fare, **i posti misurati sono
ancora zero**: `veritas_cose` legge la scena dopo. Dieci secondi più tardi sono
20, ma la decisione è già presa e nessuno la rifà.

**Cosa serve:** rifare il conto quando gli arredi arrivano. `veritas_cose.js`
già chiama `window.__veritasZoneSulCammino()` appena finisce di leggere la
scena; li' accanto serve un ponte che rilanci l'assegnazione **una volta sola**
e **solo se** i posti misurati chiedono più zone di quelle che ci sono.
`applyAutoAssignment` è interna a `index.html` e non è esposta: il ponte va
aggiunto li', vicino a `window.__veritasAssegnazioneAutorevole`.

⚠️ **Prima di farlo, leggere il §6.17:** aggiungere una riassegnazione a una
pagina che già muore peggiora il guasto più grave, non il meno grave.

---

### 6.17 — LA PAGINA MUORE MENTRE L'OCCHIO LAVORA — il guasto piu' grave

Misurato il 22/09/2026 sera, `banco/vivo/regge_venti_tappe.mjs`: si chiede alla
pagina una cosa banale ogni 10 secondi e si cronometra la risposta.

**Sulla versione PUBBLICATA** — quella che si darebbe a un cliente:

```
  8s ... 79s   OK  risponde in 15-360 ms        otto risposte buone
      148s     NO  ferma: 58.700 ms per rispondere
      307s     NO  ferma: 149.243 ms per rispondere
      307s     PAGEERROR: unreachable
```

Nel workspace la stessa cosa arriva fino in fondo: **`Target crashed`**, la
scheda muore. Un banco lanciato prima e' rimasto appeso **36 minuti** senza che
il suo tetto di 3 minuti scattasse — perche' il filo della pagina era fermo e
nemmeno il cronometro girava.

**NON E' STATO INTRODOTTO OGGI:** succede identico sulla costruzione pubblicata.
E' parente del 6.8.

---

#### La diagnosi, letta sul codice il 22/09 notte

**Com'e' fatto oggi** (`veritas_occhio_lavoratore.js`):

- un Worker solo, con una coda interna (`inFila`): le inferenze sono **gia' una
  alla volta**;
- `pipeline("zero-shot-object-detection", "Xenova/owlv2-base-patch16-ensemble",
  {device: "wasm", dtype: "q8"})`;
- la **sessione vive per tutta la vita del Worker** — giusto cosi', non si
  rilascia per immagine;
- `env.backends.onnx.wasm.proxy = false` — corretto dentro un Worker;
- `numThreads` fino a **8** se la pagina e' `crossOriginIsolated`;
- per inferenza: `new RawImage(new Uint8ClampedArray(m.dati), w, h, 4)` e poi
  `rileva(immagine, parole, {threshold})`.

**⛔ CORRETTO IL 23/09: IL "TETTO DI 255,5 MB" NON ESISTE.** La diagnosi del
22/09 notte poggiava su due errori, verificati sui file:

1. **Le versioni erano sbagliate.** La 4.2.0 sta solo nel `package.json` del
   workspace, e con la 4.x OWL non si apre nemmeno (avviso in `index.html`).
   L'occhio carica **transformers.js 3.8.1** (`index.html:91`,
   `veritas_riconosce.js:1227`), che dipende da **onnxruntime-web
   1.22.0-dev.20250409-89f8206ba4** (`npm view @huggingface/transformers@3.8.1
   dependencies`). E' comunque una build **dev**. L'ultima stabile oggi e'
   la **1.30.0**.
2. **`267935216` non e' una misura di memoria.** E' un **numero nudo**, cioe'
   l'indirizzo di un'eccezione C++ che ORT Web lancia cosi' com'e', perche'
   e' compilato senza il supporto alle eccezioni di Emscripten. Fonti: [ORT
   #13408](https://github.com/microsoft/onnxruntime/issues/13408), [Emscripten,
   C++ exceptions](https://emscripten.org/docs/porting/exceptions.html). Lo
   conferma il fatto che lo stesso identico numero esce anche su
   `webgpu/q4f16` (`veritas_fili.js:21`): un tetto non darebbe lo stesso valore
   su due strade diverse. Dividerlo per 1.048.576 non ha significato.
3. **Il tetto vero del motore e' 4 GB.** Letto dentro i binari di ORT 1.22.0-dev
   (`ort-wasm-simd-threaded.wasm` e `.jsep.wasm`): memoria importata condivisa,
   iniziale **16 MB**, massima **4096 MB**. `env.wasm` non ha manopole di
   memoria: le sue opzioni sono `numThreads`, `simd`, `trace`, `initTimeout`,
   `wasmPaths`, `wasmBinary`, `proxy` (`onnxruntime-common/dist/esm/env.d.ts`).

**Quindi non sappiamo ancora COSA finisce.** Ipotesi aperte, tutte da misurare
col banco del punto 0, nessuna provata:
- la memoria del motore cresce fino ai 4 GB (perdita o frammentazione);
- muore il processo della scheda (`Target crashed`) prima dei 4 GB, perche'
  pesa la pagina intera: scena 3D + motore + 8 fili;
- un'eccezione C++ reale (il numero nudo) con dietro un'altra causa.

Restano validi i conti sulla grandezza del lavoro: OWLv2 a 960x960,
`pixel_values` = **11 MB**, patch embedding (3.600 x 768) altri **11 MB**, gli
intermedi dell'attenzione sono un multiplo di questi, e con **8 fili** il
picco si moltiplica. E resta valida la forma del guasto: **otto risposte buone,
poi il collasso**.

**Ma le 177 parole contano poco sul tempo**, misurato il 04/09
(`veritas_fili.js`): 4 parole 202,8 s, 16 parole 201,3 s. Il tempo va a
guardare l'immagine. Il test B dirà se vale anche per la memoria.

**Le 177 parole NON si possono calcolare una volta sola.** Verificato sul Hub:
`Xenova/owlv2-base-patch16-ensemble` ha **un grafo unico** (`onnx/model.onnx`
614 MB, piu' le versioni compresse: `model_quantized` 155 MB, `model_fp16` 308,
`model_q4f16` 128). Non c'e' nessun export separato del text encoder, quindi
testo e immagine entrano nello stesso passaggio. Cacharli richiederebbe di
riesportare il modello. **L'unica leva su quell'asse e' chiamare il rilevatore
MENO VOLTE**, ed e' quello che fa gia' `tavolaDiRitagli` (3 chiamate -> 1).

---

#### I tre interventi, in ordine

**0. Prima di toccare qualunque cosa: il banco strumentato.** Senza vedere la
memoria salire immagine per immagine, i tre interventi qui sotto sono tre
scommesse. Servono, per ogni inferenza: numero, durata di preprocess, inferenza
e postprocess, heap JS disponibile, memoria del motore se leggibile. E i test di
isolamento: **A** stessa immagine 10 volte con 177 parole; **B** stessa immagine
con 1 parola sola; **C** 177 parole ricreando il Worker ogni 5 immagini; **D**
177 parole con immagini a 512 / 768 / 1024 px.
Lettura: A cresce -> cumulativo; B regge e A no -> contano le query; C risolve ->
memoria non recuperata nel Worker; D cambia tutto -> pressione da risoluzione.

**1 - ~~Alzare il tetto di memoria del motore.~~ CANCELLATO il 23/09.** Il
tetto e' gia' 4 GB e `env` non ha una manopola per cambiarlo (vedi sopra).
Al suo posto, **solo se il banco lo indica**, c'e' da provare la stabile
**onnxruntime-web 1.30.0** al posto della dev 1.22. Non si fa a fiducia: la
dev 1.22 e' quella che apre OWL (Cast(13), avviso in `index.html`), e con
un'altra versione l'occhio potrebbe non aprirsi piu'.

**2 - Ridurre i fili da 8 a 2-4.**
Stesso file, stessa funzione, la riga `numThreads`. Ogni filo ha la propria area
di lavoro e il picco scala con i fili. **La misura che giustifica gli 8 e' del
04/09 ed era su 16 parole, non 177**: il bilancio puo' essersi rovesciato.
Rischio: inferenza piu' lenta, misurabile in un colpo e reversibile in un
carattere.

**3 - Non copiare il buffer dell'immagine.**
Stesso file, `guarda()`: `new Uint8ClampedArray(m.dati)` duplica un buffer che
la pagina ha **gia' trasferito** (`postMessage(..., [p.dati])`). Usarlo
direttamente. Una copia in meno e una referenza in meno viva per inferenza.
E' l'unico dei tre che non puo' peggiorare niente.

**E' a monte di tutto il resto.** Nomi, zone, tempi, l'occhio che si avvicina:
tutto gira sopra questa pagina. Un cliente non aspetta 149 secondi, chiude.

---

### 6.18 — ⛔ La zona finisce dal lato sbagliato: nessuno guarda da dove si entra

Raffaella, 22/09/2026, con la foto di un aereo col finger attaccato a destra e
la zona posata a sinistra: *«per quale motivo mette una zona dal lato opposto al
tunnel di accesso dell'aereo?»*

**Misurato** (`banco/vivo/da_dove_vengono_le_tappe.mjs`, sezione 3-bis):

```
ingombro 7,8 × 42,7 m · 4 oggetti · volume
baricentro [-79.8, -4.3] → appoggio [-75.2, -4.4] · salto 4,6 m verso est
```

Quel posto lungo 42,7 m è un aereo. La tappa finisce sul **primo punto
calpestabile più vicino al suo baricentro** (`sulCamminoCorrente(centro,
[6,6,6])`). Per un oggetto lungo 42 metri il baricentro sta **dentro** l'oggetto,
e «il più vicino» si decide per centimetri: cade dal lato che capita.

**Il finger, la porta, il varco non entrano nel conto.** Per il programma quel
volume è un ingombro con un centro, e basta.

**Direzione del fix** (è la decisione di Raffaella già scritta — *«il lato
dell'accesso»*): la tappa va posata sul punto calpestabile più vicino a un
**accesso** di quel posto — un varco visto dall'occhio, una porta, un finger —
e solo in mancanza di accessi si ricade sul punto più vicino al baricentro.
L'occhio i finger li vede già («a jet bridge 66%», visto a schermo il 22/09), e
la mappa di cammino ha i varchi.

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
| L'abaco disegna di nuovo | 21/09 sera | reale, banco del workspace (`banco/vivo/piante_all_occhio.mjs`) | ✖ prima: «non sono riuscito a disegnare l'abaco: opzioni is not defined»; ✔ dopo: «11 tavole (2 piante, 6 prospetti, 3 sezioni) — da 12 a 24 px/m» (§6.11) |
| Piante per livello all'occhio, prima/dopo sullo stesso modello | 21/09 sera | reale, banco del workspace, occhio OWLv2 vero | ✔ 2 piante ricevute (0 prima), mucchi divisi 14 + 6 per piano, rilevazioni 80 → 227, cose di dentro riconosciute per la prima volta dalla pianta; ✖ mucchi nominati 8 → 6, buttate 60 → 205 (§6.12) |
| `veritas_riconosce.test.mjs` con le prove della regola del piano | 21/09 sera | automatico, workspace | ✔ 6 prove nuove verdi (doppia altezza compresa); 1 rossa **identica prima e dopo**, verificata rimettendo il codice di `main`. `veritas_zone` 23 e `veritas_corpo_collegato` 2 invariate |
| Cosa vede il narratore, immagine salvata e guardata | 21/09 notte | reale, banco del workspace | ✖ prima: rettangolo grigio piatto, due aerei, zone 5 e 6 sulle ali — niente da leggere; ✔ dopo: pianta a 1,10 con sedute, transenne, banconi, nastri (§6.13) |
| Narratore end-to-end con LM Studio (`qwen2.5-vl-7b`) | 21/09 notte | reale, banco del workspace, modello visivo caricato a mano | ✔ **7 zone su 7 nominate** in 444 s con 2 piante + 18 allegati; 3 nomi di stanza vera, 2 il nome dell'edificio, 2 doppioni, tutti a fiducia media |
| Dove stanno le tappe, una per una | 21/09 notte | reale, banco del workspace | ✔ 7/7 sul calpestabile a 0,00 m, 21/21 coppie raggiungibili; ✖ cinque in fila a 4,6 m, tutte in 24 m su 106 (§6.14) |
| Il mondo fisico si costruisce | 21/09 notte | reale, banco del workspace | ✔ 186.074 triangoli, capsula r=0,3 h=2, scalino 0,4 m, pendenza 35°; ⚠️ non stabilito se una traiettoria passi dal filtro (§6.15) |
| `veritas_apertura.test.mjs` dopo la lama | 21/09 notte | automatico, workspace | ✔ 72/72 |

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

| Filiera delle tappe, setaccio per setaccio | 22/09 | reale, banco del workspace (`da_dove_vengono_le_tappe.mjs`) | 20 posti misurati su 92 m dei 106; i primi tre setacci non ne perdono nessuno; al quarto 9 gruppi, se ne tiene **uno**: 3 posti in 24 m |
| Statura: figure del modello contro persona della mappa | 22/09 | reale, banco (`quanto_e_alta_la_gente.mjs`) | 344 figure, mediana **1,63 m**; persona della mappa **2,00 m**; il righello umano gia esistente scala 5,272x per portare 97 persone in piedi a 1,70 m |
| Statura 1,75: banda x -45 -> -25 del terminal | 22/09 | reale, banco, prima e dopo | camminabile dal **40% e 17%** al **100%**; mappa da 1.865 a 2.280 m2; tappe da 24 a **43 m**, da 3 a **7 su 7** su cose misurate, 21 coppie su 21 ancora raggiungibili |
| Tutte le tavole al cervello, LM Studio acceso | 22/09 | reale, banco (`tutte_le_tavole_al_cervello.mjs`), qwen2.5-vl-7b | 20 tavole disegnate (2 piante, 6 prospetti, 3 sezioni, 9 prospettive), **20 su 20** diventano immagine, **19 spedite per chiamata, HTTP 200**; 386 cose posate nel mondo; comprensione: capito |
| Giri del narratore, prima e dopo il fix dell'impronta | 22/09 | reale, banco | **6 -> 3** giri; chiamate al cervello 16 -> 13; rifiutate (HTTP 400) 2 -> 1; nomi dalle caselle ricopiate a **7 zone su 7 con nomi veri** |
| Occhio: pianta intera / ritagli separati / ritagli su una tavola | 22/09 | reale, banco, tre passate | giro **316 s / 394 s / 231 s**; pixel guardati 100% / 19% / 19%; rilevazioni sul vuoto **44 / 58 / 6**; mucchi nominati 6 / **9** / 6 su 20 |
| **La pagina regge? versione PUBBLICATA `-d`** | 22/09 sera | reale, banco (`regge_venti_tappe.mjs`) | **NO**: 8 risposte buone (15-360 ms), poi **58,7 s** per rispondere, poi **149 s**, poi `PAGEERROR: unreachable`. Nel workspace: **Target crashed** |

## 8. ULTIMO INTERVENTO

| | |
|---|---|
| **Costruzione pubblicata** | `2026-09-22-e` - commit `1c4faef` su `main` |
| **Nota** | `1c4faef` e il fix parziale del 6.16: corretto ma **inerte** su questo modello (vedi 6.16) |
| **Giornata** | quattro fix pubblicati, tre difetti nuovi trovati misurando |

**Quello che e' stato corretto, in ordine:**

1. **La statura di chi cammina: 2,00 -> 1,75 m** (`90f59c6`, costruzione `-a`).
   Il 2,00 non era la statura di nessuno: era l'**altezza libera minima di
   passaggio**, cioe' quello che la norma chiede a un edificio da costruire,
   usata come corpo di chi cammina in un edificio esistente. Il numero stava in
   **sei dichiarazioni** (`veritas_navmesh` PERSONA, `veritas_corpo` MISURE,
   `veritas_cose` CORPO e le tre copie ricopiate in `index.html`): e' la ragione
   per cui il difetto tornava a ogni giro. Ora `veritas_corpo.test.mjs` le
   confronta tutte e sei e si ferma se divergono. `ALTEZZA_LIBERA_NORMA = 2,00`
   resta per il confronto normativo. **Risultato: tappe da 24 a 43 m, da 3 a 7
   su 7 su cose misurate** (6.14).
2. **Un giro solo, domande in fila, nomi che non sono categorie** (`c178d16`,
   costruzione `-b`). L'occhio tiene un'impronta delle zone (posizioni e aree,
   **mai i nomi**) e non riguarda lo stesso disegno; le domande al cervello
   vanno in coda perche' LM Studio tiene un modello solo; `validaRisposta` butta
   i nomi che sono la categoria ricopiata.
3. **L'occhio guarda solo dove c'e' qualcosa** (`056f333`, costruzione `-d`).
   `ritagliSuiPosti` ritaglia la pianta sui mucchi misurati con 2,5 m di giro
   d'aria e fonde quelli che si toccano; `tavolaDiRitagli` li impagina su
   un'unica immagine, perche' il tempo del rilevatore non lo fa la superficie ma
   le **chiamate per le parole** (177 a chiamata). **231 s invece di 316, 19%
   dei pixel, rilevazioni sul vuoto da 44 a 6.**
4. **Il HANDOFF**: 0.2, 0.3, 0.4 - tre direttive di Raffaella scritte dove non
   si possono non vedere.

**Quello che e' stato TROVATO e non corretto:**

- **6.17 - la pagina muore mentre l'occhio lavora.** E' il guasto piu' grave e
  non e' di oggi: succede identico sulla costruzione pubblicata.
- **6.18 - la zona finisce dal lato sbagliato** di un aereo lungo 42 m, perche'
  nessuno guarda da dove si entra.
- **6.16 - il fix e' meta'**: quando si decide quante zone fare, i posti
  misurati sono ancora zero.

**Tre cose che avevo riferito male e che ho corretto misurando** (la regola del
6.15 applicata a me stesso, tre volte in un giorno):

1. "Il canale dell'occhio sulla mappa di cammino e' vuoto: 0 cose posate" -
   **falso**: avevo letto i depositi *prima* che il giro del cervello finisse.
   Sono 386.
2. "`veritas_comprensione.js` non e' in pagina" - **falso**: e' importato da
   `veritas_montaggio.js` (`type="module"`, `?v=19`).
3. "Con 20 tappe la pagina non regge" - **falso**: le tappe erano 10-11, e la
   pagina non si e' seduta per le tappe, e' crepata (6.17).

E una quarta, sulla scala: **il "righello umano" esisteva gia'** (`index.html`
~5619) e funziona - trova 97 persone in piedi alte 0,322 e scala x5,272 per
portarle a 1,70 m. Ne avevo scritto un doppione in `veritas_scala.js`: buttato,
mai pubblicato.

---

## 9. PROSSIMO PASSO AUTORIZZATO

**6.17 - LA PAGINA CHE MUORE, e viene prima di tutto il resto.**

Deciso con Raffaella il 22/09 sera. Ragione: nomi, zone, tempi e l'occhio che
si avvicina girano tutti **sopra** questa pagina, e un cliente non aspetta 149
secondi.

**Da dove partire: il 6.17, CORRETTO il 23/09.** Il "tetto di 255,5 MB" non
esiste: era un numero d'errore. Il motore arriva a 4 GB e le versioni vere sono
transformers.js 3.8.1 e ORT 1.22.0-dev. **La causa non e' ancora nota.** Il
banco strumentato (punto 0) e' l'unica strada, e va fatto PRIMA di toccare
qualunque intervento.

1. Rifare la misura di `regge_venti_tappe.mjs` con `SENZA_OCCHIO` (la manopola
   c'e' gia' in `prova_fluidita.mjs`, 6.8): se senza occhio la pagina regge, la
   causa e' confermata e non piu' un indizio.
2. Guardare quanta memoria tiene il lavoratore dell'occhio e se rilascia fra un
   ritaglio e l'altro. I ritagli sono nuovi di oggi: vanno misurati anche loro,
   anche se il guasto e' precedente.
3. Nel banco, leggere la memoria del motore direttamente dal lavoratore (la
   grandezza del buffer di memoria WASM, dopo ogni sguardo) e la memoria
   della scheda. Solo cosi' si capisce quale delle tre ipotesi del 6.17 e'
   quella vera.

**Poi, nell'ordine deciso con Raffaella:**
- **6.16** la meta' mancante (rifare il conto quando gli arredi arrivano);
- **6.18** il lato dell'accesso;
- **l'occhio che gira e si avvicina** a quello che sta capendo, con il nome che
  compare li': chiesto da Raffaella il 22/09, ed e' il 0.1 applicato alla
  zonizzazione. Non e' decorazione: oggi il cliente guarda una schermata ferma
  per cinque minuti e non sa se sta lavorando.

- **Regole di impianto decise da Raffaella (17/09), eseguite:**
  1. **Nel dubbio vince l'occhio** - fatto, e verificato riga per riga il 22/09
     (0.4): `veritasMappaCammino` applica `marcaDallOcchio()` dopo la geometria.
  2. **Finche' l'occhio non ha parlato**, zone che si accendono e report
     laterali: fatto (`d1082de`, `e6196f4`).
- **Condizioni per fermarsi.** Se l'occhio non risponde, ci si ferma e lo si
  dichiara: **non si sostituisce l'occhio con un'euristica**.

**I banchi del workspace** (`banco/vivo/`, si riusano):
`da_dove_vengono_le_tappe.mjs` (la filiera setaccio per setaccio),
`quanto_e_alta_la_gente.mjs` (le stature a confronto),
`tutte_le_tavole_al_cervello.mjs` (tavola per tavola fino al cervello, **serve
LM Studio acceso**), `regge_venti_tappe.mjs` (la pagina risponde ancora?),
`dove_stanno_le_tappe.mjs`, `prova_attesa.mjs`, `sonda_stati.mjs`.
Servono `npm install playwright` nel workspace e, per LM Studio da una pagina
https, `--allow-running-insecure-content`.

---

## 10. REGISTRO DELLE DECISIONI

| Data | Decisione |
|---|---|
| 22/09 | **La figura umana e' il metro** (§0.2): la gente disegnata nel modello da' la scala e la statura, non uno standard |
| 22/09 | **Il dubbio si chiede subito** (§0.3): non si costruisce una sonda per rispondersi da soli a cio' che Raffaella chiarisce in una riga |
| 22/09 | **L'occhio e' il re, il cervello e' il suddito** (§0.4): e' una verita', non una domanda. Non si ridiscute |
| 22/09 | La misura dell'uomo non sta in sei posti: una guardia li confronta tutti (`veritas_corpo.test.mjs`) |
| 22/09 | L'occhio guarda **solo dove c'e' qualcosa di misurato**, impaginato su una tavola sola |
| 22/09 sera | Prima di tutto il resto si cura la pagina che muore (§6.17) |
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
| 21/09 | **La pianta si taglia a 1,10 m sopra lo zero di QUEL piano, e quella è la planimetria. Punto.** Una per livello. Non è un'opzione ne' una taratura: è la convenzione del disegno d'architettura |
| 21/09 | **Ogni ambiente si giudica sulla pianta del piano su cui POGGIA** — quello del suo solaio, non quello dove arriva la sua testa. La sala a doppia altezza si nomina una volta sola; sulla pianta di sopra è vuoto visto in proiezione, e li' non si nomina niente |
| 21/09 | **Scartata**: «mostrare ogni mucchio su tutte le piante e tenere il punteggio migliore». Una pianta non è un tentativo, è il piano a cui appartiene |
| 17/09 | Finché l'occhio non ha parlato: accensione progressiva delle zone e report laterali che si aprono man mano |
| 17/09 | **I codici fittizi si rimuovono appena trovati** (tappe, nomi, traiettorie, KPI, inquadrature scritti a mano): «rimuovi i codici fittizi quando li trovi». Vale anche dentro il bundle, con prova di caricamento reale prima di pubblicare |
| 17/09 | Il canale dell'occhio si costruisce **sulle immagini**, perché funzioni su tutti i modelli, splat compresi; serve anche a risolvere il **riconoscimento delle zone**, non solo i muri |
| 18/09 | **La pagina di attesa prende lo stile delle immagini di riferimento di Raffaella**: scuro col fumo, modello vero, report a terminale sul lato, quattro stati in successione (attesa, zone, conformità, orientamento). Il resto della piattaforma resta carta. I numeri d'esempio delle immagini non si copiano: solo misure |
| 18/09 | **Dopo ogni pubblicazione si dà a Raffaella il link con la costruzione nella query** (`?v=<costruzione>`), perché il suo browser le mostrava versioni vecchie. «Quando è possibile aggiorna GitHub, fermati e fornisci link» |
| 18/09 | **I fix si fanno uno alla volta, ognuno col suo commit** («comincia fix e commit uno alla volta: mi raccomando»); ordine: lingua → pagina fluida → soglie di norma → nomi degli ambienti |
| 18/09 | Le scritte dell'interfaccia nelle due lingue stanno in **un solo dizionario** (`veritas_lingua.js`), che traduce anche il bundle senza toccarlo |
| 21/09 | **IL SOLE E' LA REGOLA, il piatto l'eccezione.** Le viste tridimensionali dell'occhio si rendono illuminate, con ombre proprie e portate. La PIANTA resta piatta se non le si chiede il sole: da quella stessa pianta si legge la segnaletica a terra dal COLORE dei pixel, e un'ombra sopra una striscia gialla la fa diventare un'altra tinta |
| 21/09 | **Un solo sole per tutta la piattaforma** (`accendiIlSole` in `veritas_vista.js`, riusato da `veritas_tavole.js`). Due soli tarati diversi darebbero due letture diverse dello stesso edificio |
| 21/09 | **La costruzione si alza PRIMA di misurare nel banco.** Il 21/09 due giri col sole hanno dato immagini identiche al byte: il banco serviva la versione pubblicata e non il workspace, e siccome la costruzione era `-h` in tutti e due i casi il controllo non poteva accorgersene |
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
