# VERITAS Spatial AI — punto della situazione

> Aggiornato il **18/08/2026**, a fine sessione.
> Questo file dice **su cosa si lavora adesso**. La storia lunga sta in
> `CLAUDE.md`; il dettaglio tecnico dell'ultima sessione nelle sue **§15 e §16**.
>
> ⚠️ Il vecchio contenuto di questo file (cartelle `/core/`, `/data/`,
> `visualizzatore.html`, `main.py` come avvio) era **superato da mesi**: quei
> file non esistono. Se un riassunto e il repository divergono, vale il
> repository.

---

## 1. Cos'è, in due righe

Si carica un modello 3D di uno spazio complesso (aeroporto, museo, ambiente di
gioco), un'AI lo legge, riconosce le stanze, ci fa camminare dentro una folla
di agenti e produce un report analitico vendibile.

Proprietaria: **Raffaella Ciani**, architetto e sviluppatrice XR.
Il prodotto deve essere **intelligente e bello**: l'aspetto visivo non è
rifinitura, è parte di ciò che vende.

---

## 2. ⚠️ Le regole che non si violano

1. **Il blocco 3 di `index.html` non si tocca mai.** È il bundle React/Three
   minificato. Dopo *ogni* modifica al file va verificato che sia identico:
   sha delle prime 16 cifre `eedd9935ea908fd3`. La ricetta pronta è in
   `CLAUDE.md` §11.6.
2. **Mai push su `main` senza il via libera esplicito di Raffaella.**
   Unica eccezione già concessa: i file Python, perché Render ridistribuisce
   da lì.
3. **Per leggere i blocchi `<script>` si usa `html.parser` di Python, mai le
   regex.** Il bundle contiene stringhe che sembrano tag e le mandano in tilt.
4. **Non aprire branch nuove.** Ne bastano tre: `main`, `veritas-ai-os-preview`
   e **una** `claude/...` per volta.
5. **Come si parla con Raffaella:** niente tecnicismi, e non chiederle pareri
   tecnici. Vedi `CLAUDE.md` §0-bis — è una regola, non un consiglio.

---

## 3. Dove sta il codice

| Ramo | Cosa c'è | A cosa serve |
|---|---|---|
| `main` | **frontend vecchio** + i file Python | produzione e sorgente del deploy Render |
| `veritas-ai-os-preview` | `index.html` completo, aggiornato al 18/08 | anteprima pubblica |
| `claude/veritas-spatial-ai-resume-z0iuw9` | uguale alla preview | ramo di lavoro della sessione |

Anteprima live: **https://raffaella23.github.io/Veritas-spatial-ai/**

⚠️ `index.html` ha **23 blocchi `<script>`**, non 9 né 20 né 22 come dicono le
sezioni più vecchie di `CLAUDE.md` e di questo file. Gli indici cambiano a ogni
inserimento: **riparsali, e individua i blocchi per contenuto, mai per numero.**

---

## 4. Cosa è stato fatto il 18/08 (da verificare a occhio)

Quattro difetti segnalati da Raffaella guardando l'anteprima, in due giri.
Tutti misurati prima e dopo.

### I nomi delle zone

| Prima | Adesso |
|---|---|
| Otto ambienti, **quattro chiamati tutti "Accettazione"** — in un museo, quattro "Biglietteria" | Otto ambienti, otto nomi diversi: *Ingresso · Biglietteria · Sala espositiva 1 · Sala espositiva 2 · Controllo accessi · Sala espositiva principale · Sala espositiva 3 · Uscita A* |
| Una sala diventava "Controllo" per dieci centimetri di differenza dalle altre | Il controllo compare solo dove lo spazio si stringe **davvero**. In una fila di sale uguali non ce n'è, e va bene così |
| Tre mesh chiamate "Gate" nel modello davano tre zone con lo stesso nome | Nessun nome ripetuto, mai, da qualunque parte venga |

### I passeggeri nei muri

Il controllo che doveva impedirlo chiedeva *«almeno il 70% del tratto ha del
pavimento entro 2,5 metri?»*. Misurato: **un muro pieno spesso sei metri
passava quel controllo.** Adesso la domanda è un'altra — *«ogni passo di questo
tratto sta dove ci passa una persona?»* — e un solo passo fuori basta a dire no.

Quando la strada dritta è chiusa non si improvvisa una deviazione: si cerca il
percorso vero sulle celle calpestabili, come fa una persona che gira attorno a
un muro per trovare la porta.

Sullo stesso spazio di prova (due sale, un muro, una porta spostata di lato):

| | il muro è visto? | quanto percorso passa **dentro** il muro |
|---|---|---|
| Prima | no | **6,3%** |
| Adesso | sì | **0,0%** |

E soprattutto: **i muri adesso si leggono dal modello**, non si indovinano dai
buchi nel campionamento. Prima un tramezzo era visibile solo se più spesso
della distanza fra un punto campionato e l'altro — su un edificio grande,
circa **un metro**. Ora un tramezzo da **dieci centimetri** viene visto,
perché nel modello è una parete e la si legge come tale.

### La simulazione partiva da sola

Il bottone del pannello iniziale si chiamava "Avvia simulazione" e faceva due
mestieri: apriva lo spazio di lavoro **e** dichiarava avviata la simulazione —
quando l'unica cosa caricata erano i sei punti finti dentro il bundle, di un
aeroporto che non è il tuo.

Adesso quel bottone **apre soltanto** (e si chiama così). Si parte da un posto
solo: il **▶ PLAY**, che compare quando c'è un modello vero e le sue zone sono
state assegnate. Prima di allora niente si muove e i passeggeri restano
invisibili.

### Il parcheggio, e le zone sul piazzale

Ho aperto il tuo modello e l'ho misurato. Il piazzale vale **6.038 m² di
"pavimento" contro i 1.763 m² del pavimento del terminal** — il 64% contro il
19%. Il programma sceglieva come piano dell'edificio la fascia di quota più
popolata: sceglieva il piazzale, e ci posava sopra i cartelli. Ecco perché
finivano accanto all'aereo.

Nessuno gli aveva mai chiesto **dove finisce l'edificio**. Ho provato due
strade e le ho scartate misurando:

- *«ho un tetto sopra la testa?»* — nel tuo modello il 71% del pavimento ha il
  cielo sopra, e dove c'è qualcosa l'altezza libera mediana è 1,07 m: sono ali,
  arredi e teste. Il tetto non c'è.
- *«riempio d'acqua dal bordo, dove non arriva è dentro»* — da una porta aperta
  l'acqua entra e allaga l'edificio. Misurato: 100%.

Quella che regge è la domanda che ti fai tu guardandoti intorno: **sono
circondato, o vedo campo aperto?** Da ogni zona si guarda in tutte le
direzioni e si conta quante portano fuori. In una sala sono zero, su un
piazzale quasi tutte.

Da lì: **il parcheggio è la partenza** (la gente scende dall'auto ed entra), le
piste e i piazzali di servizio restano misurati e nominati ma non sono tappe di
un percorso a piedi, e le zone del percorso stanno dentro l'edificio.

⚠️ Se questa lettura non è netta il programma **non la usa** e si comporta come
prima: meglio il comportamento di ieri che un percorso costruito su una lettura
debole.

### Ali, chioschi e teste non sono pavimento

Nel tuo modello ci sono un aereo intero, 80 chioschi, 80 monitor e centinaia di
figure umane già ferme. Le loro superfici piatte guardano in su, quindi il
programma le prendeva per pavimento. Ora una superficie che sta **sopra
un'altra molto più grande** è un oggetto, non un piano: misurato sul tuo file,
**1.084 m² di finto pavimento tolti**.

E come avevi scelto, persone ferme e aereo restano **ostacoli da aggirare**:
occupano il 6,1% dello spazio calpestabile, ben sotto la soglia oltre la quale
il programma smetterebbe di crederci.

**Il prossimo passo è il tuo occhio su un modello vero.** Le prove automatiche
contano e misurano; non guardano lo schermo.

---

## 5. Cosa resta aperto, in ordine

### 1) I KPI finti che sembrano veri — *il più importante*

In basso a destra ci sono flusso, rallentamenti, tempo di transito e
saturazione. Sono **cablati dentro la demo** (`hV()` nel bundle: flusso 0.156,
12 rallentamenti, transito 131,4 s, saturazione 68%). Quando il motore di
calcolo Python non risponde o la sua risposta viene rifiutata, quei numeri
restano a schermo **con l'aria di essere misurati**.

È lo stesso genere di bugia credibile del verdetto normativo falso già
corretto il 13/08, ed è il difetto peggiore che questo strumento possa
produrre, perché il report si vende. **Vanno azzerati o dichiarati non
disponibili, non lasciati lì.** Deciso a fine sessione 17/08, non ancora fatto.

### 2) Gli occhi veri: leggere la pianta, non solo misurarla

La separazione dentro/fuori è **geometrica**: capisce che sei circondato da
muri, non che quello è un parcheggio. Con due aree all'aperto sceglie come
partenza la più vicina all'edificio, ed è un'ipotesi ragionevole — non una
lettura.

Il pezzo che *guarda* esiste già (`veritas_vista.js`: renderizza una pianta
ortografica da poco sopra il pavimento, e i pixel non dipendono da come il
modello è stato costruito). Leggerla vorrebbe dire riconoscere gli stalli
dipinti di un parcheggio dalle linee gialle di un piazzale, e dare il nome
giusto a ciascuno. È la mossa naturale adesso che la geometria ha separato i
pezzi: prima non aveva senso, si sarebbero dati nomi giusti a pezzi sbagliati.

### 3) Le porte modellate chiuse

I muri ora si leggono dal modello. Una porta modellata come pannello pieno è,
per il programma, un muro: gli agenti la aggirano invece di attraversarla. È il
comportamento corretto — una porta chiusa si apre, non si attraversa — ma su un
modello dove tutte le porte sono disegnate chiuse può bloccare percorsi veri.
Se succede, il programma lo dice in console (`[VERITAS cammino] nessuna
strada…`). Da guardare al primo modello con le porte modellate.

### 4) I pannelli KPI sotto i 1280 px

Sotto quella larghezza il bundle non usa più le colonne laterali ma mette i
numeri in una riga in fondo, che i selettori attuali non intercettano: si
sovrappongono ai comandi e li coprono.

### 5) `main` ha ancora il frontend vecchio

`index.html` su `main` è un rimando di 217 byte alla build vecchia. La
promozione della build nuova **aspetta il via libera esplicito di Raffaella**.

### 6) Doppio Three.js, e le gaussiane ferme

Il bundle porta la propria copia di Three (0.160), l'importmap ne carica
un'altra (0.180). Aggirato, non risolto: la soluzione pulita è ricompilare il
bundle. Da qui dipende anche il Gaussian Splat.

### 7) Provare con una scansione vera

Lo splat sintetico verifica l'impianto, non la qualità su dati rumorosi.
Su una scansione a gaussiane non c'è geometria di muri da leggere: lì valgono
solo i muri dedotti, con il limite dichiarato. Dalla sandbox non si scarica
niente: passa solo git.

---

## 6. ⚠️ La trappola da non ripetere

`window.__veritasSetTrajectory` è esposto dal bundle e **non lo chiama
nessuno**. Sembra la via naturale per sostituire i nodi. **Non lo è:**
l'effetto React che costruisce la scena dipende da `[W]`, quindi cambiare
l'identità di quell'oggetto la ricostruisce da capo — e **il modello caricato
non ci rientra**, perché lo aggiunge solo il callback del loader GLB, che non
viene rieseguito. Si otterrebbero marker perfetti su una scena vuota, senza un
errore in console.

Per questo `applyNodesToScene` **muta l'oggetto sul posto** invece di chiamare
il setter. Chi tocca questa parte deve saperlo prima, non dopo.

---

## 7. Come si prova

Prove veloci, senza browser, meno di un secondo:

```bash
node veritas_zone.test.mjs         # nomi, ruoli dalle misure, parcheggio come partenza
node veritas_play.test.mjs         # niente si muove finche non premi play
node veritas_dentrofuori.test.mjs  # dentro o fuori: circondato o campo aperto?
node veritas_navigazione.test.mjs  # muri, porte, strettoie: il modulo
node veritas_muri.test.mjs         # che il programma lo USI davvero
node veritas_marker.test.mjs       # cartelli e figure degli agenti
for t in veritas_*.test.mjs; do node "$t" >/dev/null || echo "$t KO"; done
```

Estraggono le funzioni **dall'HTML per àncore testuali** e le eseguono su stub
minimi: non ricopiano il codice, quindi se cambi una firma la prova fallisce
subito invece di verificare una copia vecchia.

Il banco con browser vero (Playwright, Chromium preinstallato) è in
`CLAUDE.md` §13.5, per le prove d'insieme. Render e OpenSky sono bloccati dal
proxy: gli errori di rete lì sono attesi.
