# VERITAS Spatial AI — punto della situazione

> Aggiornato il **17/08/2026**, a fine sessione.
> Questo file dice **su cosa si lavora adesso**. La storia lunga sta in
> `CLAUDE.md`; il dettaglio tecnico dell'ultima sessione nella sua **§14**.
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
| `veritas-ai-os-preview` | `index.html` completo, aggiornato al 17/08 | anteprima pubblica |
| `claude/veritas-spatial-ai-resume-z0iuw9` | uguale alla preview | ramo di lavoro della sessione |

Anteprima live: **https://raffaella23.github.io/Veritas-spatial-ai/**

⚠️ `index.html` ha **22 blocchi `<script>`**, non 9 né 20 come dicono le
sezioni più vecchie di `CLAUDE.md`. Gli indici cambiano a ogni inserimento:
**riparsali, e individua i blocchi per contenuto, mai per numero.**

---

## 4. Cosa è stato fatto il 17/08 (da verificare a occhio)

Tutte e tre le correzioni nascono dalla stessa causa: dentro il bundle c'è un
**finto aeroporto di prova** con sei punti fissi, e il programma continuava a
usare quelli invece delle stanze misurate nel modello caricato.

| Cosa si vedeva prima | Cosa si deve vedere adesso |
|---|---|
| Scatole con scritto `LOUNGE` / `GATE A1` in mezzo al piazzale | Un cartello per ogni stanza vera, e nient'altro |
| Chiedendo 50 persone se ne vedevano 28 | 50 persone quando ne chiedi 50 |
| "Accettazione" e "Controllo" scritti sulle sale di un museo | I nomi del posto: museo, aeroporto o gioco |

**Il prossimo passo è il feedback di Raffaella su questi tre punti**, guardando
un modello vero. Le prove automatiche contano gli oggetti, non guardano lo
schermo: se qualcosa non torna, lo dice solo il suo occhio.

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

### 2) I pannelli KPI sotto i 1280 px

Sotto quella larghezza il bundle non usa più le colonne laterali ma mette i
numeri in una riga in fondo, che i selettori attuali non intercettano: si
sovrappongono ai comandi e li coprono.

### 3) `main` ha ancora il frontend vecchio

`index.html` su `main` è un rimando di 217 byte alla build vecchia. La
promozione della build nuova **aspetta il via libera esplicito di Raffaella**.

### 4) Doppio Three.js, e le gaussiane ferme

Il bundle porta la propria copia di Three (0.160), l'importmap ne carica
un'altra (0.180). Aggirato, non risolto: la soluzione pulita è ricompilare il
bundle. Da qui dipende anche il Gaussian Splat.

### 5) Provare con una scansione vera

Lo splat sintetico verifica l'impianto, non la qualità su dati rumorosi.
Dalla sandbox non si scarica niente: passa solo git.

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
node veritas_zone.test.mjs      # 30 prove: nomi per dominio, ruoli dalle misure
node veritas_marker.test.mjs    # 33 prove: cartelli e figure degli agenti
for t in veritas_*.test.mjs; do node "$t" >/dev/null || echo "$t KO"; done
```

Estraggono le funzioni **dall'HTML per àncore testuali** e le eseguono su stub
minimi: non ricopiano il codice, quindi se cambi una firma la prova fallisce
subito invece di verificare una copia vecchia.

Il banco con browser vero (Playwright, Chromium preinstallato) è in
`CLAUDE.md` §13.5, per le prove d'insieme. Render e OpenSky sono bloccati dal
proxy: gli errori di rete lì sono attesi.
