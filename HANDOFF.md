# HANDOFF.md — VERITAS Spatial AI

> **Aggiornato il 28/08/2026.** Questo è **l'unico documento di stato del
> progetto.** Non ce ne sono altri, e non se ne creano altri.

---

## 🔴 LE REGOLE CHE VENGONO PRIMA DI TUTTO

Nate da un problema misurato: al 24/08/2026 c'erano **due rami e nove
documenti di stato per 227 KB** che si contraddicevano. Il progetto si chiama
VERITAS e aveva nove verità.

### Regola 0 — IL MECCANISMO PERCETTIVO. Non è negoziabile.

**Questo è il cuore del prodotto. Non si reinterpreta, non si semplifica, non
si sostituisce con qualcosa che «funziona lo stesso». Chi lo cambia sta
costruendo un altro prodotto.**

> Occhio e cervello sono **accesi insieme dall'inizio**. Hanno **le stesse
> informazioni**: tutte le viste vanno a tutti e due. Il cervello analizza
> tutte le prospettive e tutte le misure. I due **si scambiano quello che
> trovano**, a giri, **finché non è sicuro di aver capito**. Se non è sicuro,
> **chiede** — non inventa. È un **circuito**: insieme ricostruiscono
> l'oggetto.

Le cinque cose che lo rendono quello che è. Se una salta, non è più questo:

1. **INSIEME.** Non due strade alternative, non «prima l'uno poi l'altro se il
   primo fallisce». Un anello solo. *(Era rotta fino al 26/08: `comprendi()`
   chiamava lo studio e ritornava; il giro occhio↔cervello partiva solo se lo
   studio falliva.)*
2. **STESSE IMMAGINI.** Tutto quello che vede il cervello lo vede anche
   l'occhio, e viceversa. Un occhio che guarda una vista in meno cerca cose in
   una figura da cui quelle cose sono state tagliate via. *(Era rotta: il
   cervello aveva pianta + scorci, l'occhio solo la pianta.)*
3. **SI GIRA IL MODELLO FRA LE MANI.** Piante, prospettive, sezioni: quante ne
   servono lo dice la complessità del modello, non un numero scritto a mano.
   Una vista sola non basta mai, perché un'ala d'aereo e un mezzanino sono
   geometricamente identici.
4. **A GIRI, FINO A ESSERE SICURO.** Il cervello dice all'occhio cosa cercare,
   l'occhio ricerca su **tutte** le viste, si riassegna. Si esce quando è
   sicuro, **non quando è finita**. *(Era rotta: un solo scambio.)*
5. **SE NON SA, CHIEDE.** Un volume incerto finisce `senza_nome` con la
   domanda, e la domanda va in chat. Nominare per riempire è la bugia peggiore:
   un report costruito su zone sbagliate è merce avariata quanto un KPI finto.

⚠️ **Il confine che tiene in piedi tutto:** sulla **pianta** (ortografica
dall'alto) una rilevazione diventa una **posizione**, perché il pixel si
converte in metri. Sugli **scorci** (prospettiva) **no**: lì un riquadro non
ha un corrispondente a terra, e convertirlo lo stesso produce posizioni
credibili e sbagliate. Dagli scorci si prende solo la **testimonianza** —
*che cosa* ha visto e *in quale vista* — che va al cervello come indizio
dichiarato fallibile, **mai come misura**.

📌 Dove vive: `veritas_comprensione.js` — `comprendiGuardando()` è l'anello,
`occhioSuTutteLeViste()` è la regola 2. Stato e prove: fronte 2.


### Regola 0-bis — NEL CODICE NON ENTRA IL VOCABOLARIO DI NESSUNA TIPOLOGIA

Detta da Raffaella il 25/08 e di nuovo il 28/08, perche' non era mai stata
trascritta **come regola**. E' il punto, non un dettaglio: finche' resta a voce
va ridetta ogni giorno, e ogni giorno costa crediti.

Il codice dichiara **due sole cose**:

1. **come avviene la lettura** — il circuito occhio-cervello della Regola 0;
2. **quali categorie esistono** — e sono le categorie **dell'architettura**,
   valide per qualunque edificio (accesso, distribuzione, sosta, servizio,
   collegamento verticale, esterno...). Servono al Core per le soglie, non si
   mostrano all'utente.

**I nomi non stanno nel codice.** Li da' il riconoscimento, modello per
modello, in base a quello che si vede: «parcheggio» perche' ci sono le
macchine, «sala d'attesa» perche' ci sono le sedute. Un nome scritto nel codice
e' un nome deciso **prima** di guardare.

⚠️ **Non vale sostituire le parole d'aeroporto con cinque parole neutre.** Un
elenco chiuso di *tappe* e' gia' un'ipotesi sul tipo di edificio, qualunque
parola ci si metta. Le categorie architettoniche non sono tappe: sono il tipo
di ruolo che uno spazio ha, e valgono ovunque.

⚠️ **E il modello non e' per forza un edificio chiuso.** Puo' essere una
sezione, uno spaccato, un pezzo — il modello di prova e' un pezzo d'aeroporto,
non l'aeroporto. Che cosa si ha davanti lo stabilisce il passo 1 del cervello
(«studio»), e le categorie seguono da li'. Deciso da Raffaella il 28/08.

⚠️ **Prova, dieci secondi, da fare prima di dire che e' a posto:**
`grep -n "checkin\|security\|lounge\|spawn\|Accettazione\|Controllo" index.html`
Se quelle parole compaiono come **dati** — elenchi, etichette, sequenze — il
difetto c'e' ancora. Possono comparire solo come esempi dentro i commenti.

### Regola A — UN SOLO DOCUMENTO

**Questo file. Punto.**

- Non si crea `CLAUDE.md`, non si crea `handoff_v2.md`, non si crea
  `STATO_ATTUALE.md`, non si crea `NOTE_SESSIONE.md`. Mai, per nessun motivo.
- Se hai qualcosa da scrivere, **si aggiorna questo file**: si sostituisce la
  parte superata, non si accoda in fondo.
- I dettagli tecnici di una singola modifica **stanno nel messaggio di
  commit**, che è il posto giusto e non costa niente a nessuno.
- **Nessun tetto di dimensione.** Il file è lungo quanto serve: il criterio non
  è la lunghezza, è che ogni riga serva ancora a chi legge domani. Quello che
  si toglie è il *diario* (cosa è successo), non la *regola* e non il
  *meccanismo*. La cronologia sta in `git log`.

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

### Regola C — FINE SESSIONE: si consegna, non si abbandona

Ogni sessione si chiude con **due cose fatte, non promesse**:

1. **Il prompt per la chat successiva**, scritto e consegnato in chat, pronto
   da incollare. Dentro ci va: da dove si riparte, qual è il primo fronte
   aperto, cosa è stato verificato e cosa no, e le trappole trovate quel
   giorno. Senza, la chat nuova ricomincia a indovinare e si rispende in
   scoperta quello che era già stato scoperto.
2. **Questo file ottimizzato alla luce di quello che è cambiato**: lo stato
   superato si **sostituisce**, non si accoda. Se una regola è diventata
   codice, si scrive che è codice e si cita il commit — una regola scritta come
   intenzione mentre il codice fa altro costringe Raffaella a fare lei da
   documento, e la fa ripetere le stesse cose a ogni chat.

### Regola D — IL BUDGET: **massimo 12% al giorno**

Il piano ha un limite settimanale, ed è già stato esaurito a metà settimana in
passato. Una sessione non deve superare il **12%** del budget: sotto quella
soglia si arriva a domenica, sopra si perde la fine della settimana.

Cosa lo consuma davvero, in ordine:

- **rileggere file grossi** — `index.html` è 1,8 MB: si lavora in sandbox con
  `grep`/`sed` e si tira in chat solo il pezzo che serve, mai il file;
- **provare a vuoto** — si raggruppano le modifiche e si fa **una** corsa del
  banco, non una per ritocco;
- **rifare la diagnosi** già fatta — è a questo che serve il prompt della
  Regola C.

⚠️ Se continuare oggi compromette i giorni successivi, **fermarla e dirglielo**
prima di cominciare il pezzo grosso, non dopo averlo speso.



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

- **Il banco non si fabbrica i dati.** Il 26/08 `misureInParole` leggeva
  `p.min`/`p.max`, campi che su un posto non esistono, e ammazzava
  `comprendi()` per intero. Il banco non l'aveva preso perche' i volumi finti
  erano stati costruiti CON quei campi: confermava la supposizione invece di
  metterla alla prova. I dati di prova vanno presi dalla forma che i dati
  hanno **davvero** nel codice — si guarda cosa legge una funzione che gia'
  gira (qui `volumiPerCervello`), non come ce li si immagina.


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
| runtime completo | `index.html` (~1,86 MB, **32** blocchi `<script>`) |
| landing page demo | `landing.html` |
| Core Python | `Assets/core/` — `engine.py`, `agent.py`, `behaviour.py`, `compliance.py`, `recommendations.py`, `topology_analyzer.py`, `report_builder.py`, `path_loader.py` |
| API del Core | `api_server.py` (FastAPI, servito da Render) |
| cervello visivo | `veritas_brain_server.py` (FastAPI + modello che vede) |
| banco di prova | `banco/*.mjs` + `*.test.mjs` in radice |

**Moduli in radice:** `ls veritas_*.js` (molti sono anche inlinati in
`index.html`). I non ovvi: `veritas_riconosce.js` l'occhio (OWLv2),
`veritas_vista.js` mondo↔pixel, `veritas_corpo.js` fisica Rapier,
`veritas_comprensione.js` ciclo occhio-cervello, `veritas_anteprima.js`
pannello visivo, `veritas_montaggio.js` il filo che li accende, `veritas_coda.js`
mette in fila indiana le telefonate al modello locale (avvolge `fetch`, non
tocca `index.html`).

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

**Perché un passo del cervello si è fermato — NON SERVE PIÙ INCOLLARE NIENTE.**
Dal 28/08 (`2ac2641`) `cervelloLocale` conserva `finish_reason` e `usage`: ogni
telefonata lascia da sola una riga

    [VERITAS cervello] 3 assegnazione — stop | entrata 8001 · uscita 442 · 1275 caratteri

e la storia sta in `window.__veritasChiusura` (ultime 200). Se il motivo è
`length` la riga diventa un avviso che dice esplicitamente **«TRONCATA: manca
spazio nella finestra, non è un JSON rotto»**.

⚠️ **Le TRE forme di guasto. Chi non le distingue ripara quella sbagliata** —
è quello che il 26/08 è costato una giornata.

| cosa leggi | chi ha sbagliato | dove si guarda |
|---|---|---|
| `length` / **TRONCATA** | manca spazio nella finestra | si allarga la finestra |
| `stop` con testo illeggibile | il modello sbaglia la sintassi | si guarda il parser |
| **`Failed to fetch` / 0 caratteri** | **abbiamo riattaccato noi** | **si guarda LM Studio, non il codice** |

La terza è stata misurata il 29/08 e prima non esisteva nel documento. Si
riconosce dal log **del server**, non del browser:

    slot get_availabl: selected slot by LRU
    srv stop: cancel task, id_task = 189

LM Studio ha sportelli limitati e chiude la telefonata più vecchia per far
posto alla nuova. Curata con `veritas_coda.js` (`4dedfbd`), ma se ricompare si
guarda lì e non nel parser.

---

## Dove siamo — 29/08/2026

**Il 29/08 non si è provato niente di nuovo: la comprensione non arrivava in
fondo, e il motivo non era dove lo cercavamo.**

Corsa sul modello vero, `airport_foot_traffic.glb`. Il circuito partiva, poi
`[VERITAS cervello] passo «sguardo» fermo … Failed to fetch — 0 caratteri`, e
14 mazzetti su 14 falliti. Diagnosi dai log **di LM Studio**, non del browser:
sportelli saturi, telefonate cancellate per far posto (vedi la tabella delle
tre forme di guasto, sopra). Telefonavano insieme l'occhio inlinato in
`index.html` e il circuito dei moduli.

Riparato lo stesso giorno, **senza toccare il bundle**:

| cosa | commit |
|---|---|
| telefonate in fila indiana + attesa 300 s al posto di 90 | `4dedfbd` (`veritas_coda.js`) |
| figure verso il modello che vede fermate a 1024 px di lato | `e5de99a` |
| **il nome letto vince sulla parola da tabella**; i due occhi non si riscrivono | `eb2e8ee`, `25b9aaa` |

⚠️ **Da provare per primo alla prossima corsa. Nessuno dei due ha ancora
girato.** La riga da cercare è `[VERITAS coda] telefonate … messe in fila`, poi
`figura rimpicciolita da … a …`, e infine il travaso.

**Confermato il 29/08 da Raffaella, guardando lo schermo:** la correzione
automatica di scala **7,3x è giusta**. Il modello vale davvero 147 × 82 m per
15,4 m di altezza, e i 6340 m² calpestabili valgono. Non ci si torna sopra.

### 🔑 Il buco della Regola 0-bis che nessuno aveva visto — chiuso il 29/08

Trovato guardando `__veritasApplicaOcchi`, che è **la porta da cui passano tutti
e due gli occhi**: il circuito (pianta E scorci) e uno più vecchio inlinato in
`index.html` (~19048, ~2904) che guarda **la sola pianta**. Due difetti, sovrapposti:

1. **La porta buttava via il nome letto.** Riceveva `nome` dal circuito e non lo
   guardava mai: ricostruiva l'etichetta da `ETICHETTA_OCCHI` / `LESSICO_ZONE`,
   che per l'aeroporto contengono `Ingresso`, `Accettazione`, `Controllo`.
   **Il circuito poteva capire perfettamente e a schermo compariva comunque il
   vocabolario d'aeroporto** — la Regola 0-bis rispettata nella lettura e violata
   nell'ultimo centimetro. Ora il nome **letto** vince; le tabelle sono l'ultima
   riserva per chi un nome non ce l'ha.
2. **Chi vedeva meno riscriveva sopra chi vedeva di più.** L'occhio della sola
   pianta arrivava dopo e sovrascriveva: nella corsa ha messo `parcheggio` su
   quattro zone diverse. La scala di autorità ora conosce `comprensione`, sopra
   `occhi`, e la fonte è **dichiarata** da chi chiama (`esito.fonte`), non dedotta.

⚠️ **Se ricompaiono nomi da elenco a schermo, si guarda qui**, non nel circuito:
la comprensione può essere giusta e perdersi in fondo alla catena.

---

## Dove eravamo — 28/08/2026

**HA CAPITO UN AEROPORTO, DA SOLO, E L'HA DETTO A SCHERMO.**
`aeroporto (modello completo). Fiducia 95%, dopo 2 giri. giro 1: 0 nominati, 23
senza nome; giro 2: 23 nominati, 0 senza nome` — con un dubbio dichiarato sul
volume 7 e la domanda in chat. Quattro giorni fa scriveva «Ingresso /
Parcheggio» sull'ala di un aereo.

Il 27/08 il circuito girava ma non si vedeva. Il 28/08 si vede, e parla.

### Fatto il 28/08 — dodici commit su `main`

| cosa | commit | provato |
|---|---|---|
| Regola 0-bis scritta nel documento | `5704ecb`, `ba8f3f3` | — |
| i tipi diventano ruoli architettonici, nessuna parola d'aeroporto nel codice | `cb0fc0e` | ✅ a schermo |
| «all'aperto» non esclude più: decide il flusso riconosciuto | `b612058` | ⚠️ mai scattato (7 dentro, 0 fuori) |
| il circuito ASCOLTA: la risposta umana rientra nel ragionamento | `fdfb31c`, `f790d64` | ✅ a schermo |
| la risposta passa davanti al traduttore; la domanda è una domanda vera | `3dc0215`, `12fc01d` | ✅ a schermo |
| niente si perde: una risposta scritta a giro in corso viene raccolta | `e6bdd1e` | ✅ a schermo |
| **la chat**: risponde alle domande, solo su ciò che ha misurato | `00617dd` | ⚠️ mai provata |
| il sapere tecnico in un posto solo (`veritas_manuale.js`) | `1b6df24`, `0bc96f8` | ⚠️ mai provato |
| assegna e dichiara i dubbi, non si blocca più | `084dd95` | ✅ a schermo |
| la sonda entra nel codice | `2ac2641` | ⚠️ mai provata |
| un ordine non è una risposta | `db842fc` | ⚠️ mai provato |
| **il travaso volumi capiti → tappe** | `27d2003` | ⚠️ **MAI PROVATO — la prima cosa da verificare** |

### Il travaso, che è la prima cosa da provare

Sintomo osservato: il circuito diceva «23 volumi su 23 assegnati», Raffaella
confermava, **e le tappe che comandano il movimento non cambiavano di una
virgola.**

Causa, misurata in `applicaNomi` (`veritas_montaggio.js`): per accoppiare un
volume a una tappa pretendeva che la tappa avesse il campo `posto` e che le
coordinate coincidessero **alla nona cifra decimale**. Le tappe però nascono da
`applyAutoAssignment` e quel campo non ce l'hanno mai: la lista restava vuota,
non rinominava niente, **e non lo diceva a nessuno.** Difetto silenzioso, il
tipo peggiore.

Ora si accoppia per vicinanza a terra, soglia dichiarata 5 m, e il silenzio è
finito. La riga da cercare in console:

    [VERITAS montaggio] 6 tappe su 7 rinominate dopo la comprensione
                        (0 per corrispondenza esatta, 6 per vicinanza)

Se invece dice «nessuna tappa accoppiata», dentro ci sono quante tappe, quanti
volumi e quante erano oltre soglia: si legge quello, non si indovina.

### Il patto della chat — non è una comodità, è il prodotto

Chi compra questo strumento lo compra per **chiedergli** le cose. La chat
risponde **solo dalla fotografia di quello che il sistema ha misurato**: se il
dato non c'è dice «non l'ho misurato» e cosa servirebbe, non stima mai, e
distingue la MISURA (`largo 0,90 m`) dal GIUDIZIO su una soglia (`a norma`, e
rispetto a quale regola). `NON_MISURATO` in `veritas_manuale.js` dichiara cosa
il sistema non sa: finestre, altezze utili, arredi come pezzi, materiali.

Le tre strade non si pestano i piedi: se sta chiedendo qualcosa, quello che
scrivi è una **risposta**; se sta ancora guardando viene messo da parte; i verbi
d'ordine («fai partire», «mostra», «report») tornano al dispatcher; il resto, se
è scritto come domanda, è una **domanda**.

⚠️ **Il manuale dell'architetto non si copia nel prodotto.** Neufert e le
raccolte editoriali sono opere protette: chi vende un prodotto con dentro le
loro tabelle ha un problema legale. Si citano le fonti primarie — Fruin per il
corpo in movimento, i decreti per le prescrizioni — che davanti a un cliente
reggono di più. Se serve più vocabolario: **Uniclass 2015 tabella SL**,
gratuita, ISO 12006-2, già in CSV su GitHub (`buildig/uniclass-2015`), ed è la
stessa con cui si classificano gli oggetti IFC.


## Fronti aperti — IN ORDINE DI PRIORITÀ

### 0. 🔴 LE TAPPE NASCONO PRIMA CHE QUALCUNO GUARDI

**Cosa è già stato tolto il 28/08 (`cb0fc0e`):** le sette liste di parole
d'aeroporto. I tipi ora sono ruoli architettonici (`origine`, `accoglienza`,
`filtro`, `sosta`, `destinazione`), validi su qualunque edificio, e i nomi li dà
il circuito. Prova della Regola 0-bis, dieci secondi:

    grep -n "checkin\|security\|lounge\|spawn\|Accettazione\|Controllo" index.html

Se quelle parole compaiono come **dati** il difetto è tornato. Nei commenti va
bene.

**Cosa resta, ed è il fronte:** `applyAutoAssignment` (~3500 di `index.html`)
piazza ancora le tappe **ordinandole per la X** e assegnando il ruolo per
posizione, **prima** che occhio e cervello abbiano parlato. Non è un
riconoscimento, è un riempimento. Domanda di Raffaella, 28/08: «quando apri il
modello ti mette già 6 zone su 7, in base a che cosa?» — in base all'asse X, e a
nient'altro.

La riparazione, in una riga: **le tappe devono nascere dal riconoscimento, non
precederlo.** La sequenza posizionale torna dov'è scritto che stia — ultima
delle autorità (`bim > nome del modello > occhi > misure > sequenza
posizionale`), e solo quando non c'è nient'altro.

⚠️ Sta nel bundle grosso e tocca barra e marker. Non si comincia con meno del 5%
di budget: una modifica interrotta lì dentro è la situazione peggiore.

⚠️ **Prima di aprirlo, provare il travaso (`27d2003`).** Se quello funziona i
nomi veri arrivano già alle tappe, e questo fronte cambia di forma: resterebbe
solo da togliere il riempimento iniziale, non da ricostruire l'assegnazione.

⚠️ **E prima ancora, la comprensione deve arrivare in fondo** — il 29/08 non ci
arrivava, e il travaso non ha nemmeno parlato: la sua riga non compare né in un
senso né nell'altro. Ordine obbligato: coda e figure (`4dedfbd`, `e5de99a`) →
travaso → questo fronte.

⚠️ E quando ci si arriva: `applyAutoAssignment` **non è l'unico** posto dove
vivono parole scelte prima di guardare. `ETICHETTA_OCCHI` e `LESSICO_ZONE`
(~3142 di `index.html`) sono elenchi per tipologia — aeroporto, museo, gaming.
Dal 29/08 non vincono più sul nome letto, ma esistono ancora come dati.

### 1. ✅ LA PIANTA — RISOLTO il 26/08 (`19a4831`, `1be10aa`)

Era rotta in **due** modi, nella stessa telecamera di `piantaDelPavimento`.
Misurato proiettando i vertici con three in node, senza WebGL — non dedotto.

1. **Inquadratura fuori dal modello.** I bordi alto/basso della camera
   ortografica erano scritti in coordinate del **mondo** (`max.z`, `min.z`)
   invece che della **telecamera**. Con `up = (0,0,-1)` l'alto dello schermo
   guarda verso -Z, quindi la Z entra cambiata di segno: il riquadro cadeva
   fra `-max.z` e `-min.z`. Corretto solo per un modello centrato
   sull'origine; per ogni altro **la pianta usciva vuota**, senza un errore in
   console. Misurato: modello su z fra 50 e 90 → riga -250, fuori del tutto.
   È questo il «non c'è niente da riconoscere».
2. **Specchiatura.** `readRenderTargetPixels` dà la riga 0 in fondo, e in
   fondo allo schermo c'è la Z **massima**.

⚠️ **La correzione NON è doppia**, e questo corregge quanto diceva prima
questo stesso paragrafo. Tutti i consumatori di quei pixel leggono la riga 0
come Z **minima**: `pixelAMondo`, `scatolaInMondo` (origine = `min.z`),
`piantaInTela` (riga 0 in cima alla tela) e `leggiSegnaleticaDaPianta`
(blocco 7). L'inversione della telecamera li aveva **già** ribaltati tutti
insieme, quindi si raddrizza **una volta sola alla fonte** — come fa
`scorciTreQuarti` — e non si rovescia niente a valle. Rovesciare anche i
riquadri avrebbe ri-specchiato le misure: lo stesso difetto silenzioso, dal
lato opposto.

Prova del giro completo mondo → riga → `raddrizza` → `pixelAMondo` → mondo:
chiude a 0,025 m con pixel da 0,05 m, su modello centrato, spostato a Z+ e a
Z-. ⚠️ La copia che gira davvero è quella **inlinata nel blocco 8 di
`index.html`** (l'unica ad assegnare `window.__veritasVista`); il file
`veritas_vista.js` è il gemello importato solo per `mondoAPixel`. Vanno
tenuti allineati: correggerne uno solo non cambia niente a schermo.

### 2. ✅ IL CIRCUITO OCCHIO↔CERVELLO — ricostruito il 26/08 (`3d296e0`),
###    VERIFICATO SUL MODELLO VERO IL 27/08

**Questa è la regola, e non va più ridetta a voce a ogni chat: adesso è nel
codice.** Occhio e cervello accesi insieme dall'inizio, **le stesse immagini
per tutti e due**, si scambiano quello che trovano finché non è sicuro, e se
non è sicuro **chiede** invece di inventare.

Misurato il 26/08: il codice faceva tre cose diverse da questa.

| era | è |
|---|---|
| `comprendi()` chiamava lo studio e **ritornava**; il giro occhio↔cervello partiva solo **se lo studio falliva** — due strade alternative, mai insieme | un anello solo |
| il cervello riceveva pianta **+ scorci**, l'occhio **solo la pianta**: gli si chiedeva «trovi un banco?» sul pavimento mentre il banco stava in uno scorcio che non ha mai visto | `occhioSuTutteLeViste()` — l'occhio guarda esattamente le immagini che vanno al cervello |
| studio → assegnazione → fine: **un solo scambio**, e se restavano volumi senza nome nessuno tornava a guardare | il cervello chiede altre parole, l'occhio le cerca su **tutte** le viste al giro dopo, si riassegna, fino a `GIRI_MASSIMI` |

⚠️ **Sulla pianta** le rilevazioni diventano **posizioni** (proiezione
ortografica → `scatolaInMondo`). **Sugli scorci no**: sono prospettive, un
riquadro lì non ha un corrispondente a terra, e convertirlo lo stesso darebbe
posizioni credibili e sbagliate — la stessa merce avariata dei KPI finti.
Dagli scorci si prende solo la **testimonianza** (cosa ha visto, in quale
vista), che arriva al cervello dentro i prompt come indizio fallibile, mai
come misura.

Provato su banco con occhio e cervello finti, senza spendere token: sequenza
`studio → assegnazione#1 → parole#1 → assegnazione#2`, da 1 volume su 6
nominato a 6 su 6 dopo il rimbalzo. ✅ **Verificato sul modello vero il 27/08**
— studio, assegnazione e rimbalzo all'occhio, tutti chiusi da soli, con
`motivo: null` su entrambi i passi (i numeri sono in «Dove siamo»). Serve
Context Length ≥ 16384 in LM Studio, vedi lì. Se si
ferma ancora, la risposta grezza non si perde più: `__veritasRisposteGrezze`
(`.studio`, `.assegnazione`, `.parole` — con `testo`, `lunghezza`, `motivo`).

📌 Il pannello ha un **selettore** con tutte le immagini che partono verso il
cervello (`143302d`): se non ci sono scorci nella tendina, il cervello sta
giudicando con la sola pianta, ed è un'informazione.

📌 La pianta per il cervello è il **modello intero dall'alto**, non la fetta a
45 cm (`dabe4d1`): sugli spaccati la fetta tagliava via banchi, sedute e gate,
che stanno tutti più in alto. Chi legge la segnaletica a terra tiene la fetta.

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
| **pianta** | ✅ c'è, e raddrizzata dal 26/08 — è già una sezione orizzontale: la telecamera sta appena sopra il pavimento, non in cielo |
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
