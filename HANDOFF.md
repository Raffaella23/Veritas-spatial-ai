# HANDOFF.md — VERITAS Spatial AI

> **Aggiornato il 31/08/2026.** Questo è **l'unico documento di stato del
> progetto.** Non ce ne sono altri, e non se ne creano altri.

---

## 📍 DOVE SIAMO — fine pomeriggio del 30/08/2026

**Il fronte 0 è chiuso e il circuito gira.** Nell'ultima corsa misurata:
`✅ Ho capito lo spazio: aeroporto (modello completo), fiducia 79%`,
**20 volumi nominati su 23** (erano 3 al mattino), e la simulazione parte.

Sei commit, in ordine. Ognuno ha il perché scritto per esteso nel proprio
messaggio: **si legge quello, non si riscrive qui.**

| commit | cosa |
|---|---|
| `7b41587` | il cervello nomina quando vede invece di descrivere e fermarsi |
| `9a80fff` | i volumi si chiedono a **mazzetti da 6**; tolto il cancello sul tipo |
| `68064a8` | **l'occhio guarda oggetti, non aeroporti** — vocabolario agnostico |
| `f5cf5c6` | l'esterno non si cancella più, si marca |
| `2625b98` | le convenzioni del disegno passano anche all'occhio |
| `e218edf` | i nomi capiti arrivano fino allo schermo |

### ✅ 30/08 sera — l'occhio fa nascere le tappe (`4b2290a`, `462b1192`, `7c87b66`)

Raffaella ha guardato due schermate e ha detto la cosa giusta: **in pianta i
nomi sono al posto giusto, nel modello no.** Non sbagliava l'occhio: il suo
lavoro arrivava troppo tardi. Le tappe nascono da `assegnaZoneMisurate` prima
che occhio e cervello parlino, e `applicaNomi` poteva solo RINOMINARE quelle
gia' li'. Un volume capito senza una tappa vicina non diventava niente: 22
capiti su 23, **3 tappe rinominate su 7**, diciannove volumi misurati e
nominati buttati a ogni corsa, in silenzio.

Cosa e' cambiato, tutto in `veritas_montaggio.js` (`index.html` non toccato):

1. `4b2290a` — un volume capito che non trova posto **nasce come tappa sua**,
   con la posizione e la forma con cui e' stato misurato e con `posMisurata`
   fin dalla nascita. Solo fiducia >= 0.35; gli scartati si contano nel log.
2. `462b1192` — le tappe del riempimento che nessuno ha mai riconosciuto si
   **ritirano**. Mai quelle toccate a mano, mai quelle `bim`, e mai sotto tre
   tappe capite. Gli indici di `assegnate` si rimappano per identita'
   dell'oggetto, non per numero: sbagliare li' vuol dire scrivere il nome
   capito sulla tappa sbagliata, errore con la faccia di un successo.
3. `7c87b66` — misurato subito dopo: 20 tappe nuove nate, **zero tolte**. Il
   riempimento non era `origine:"misura"` ma `"nome+misura"`, perche' porta il
   nome della MESH del GLB. Un nome di mesh e' il nome di un oggetto, non di
   uno spazio: stessa gerarchia della quinta porta, la comprensione vince.
   Aggiunta la garanzia che annulla la ripulitura per intero se fra le tappe
   rimaste manca una `origine` o una `destinazione` — senza partenza e arrivo
   il flusso e' zero, che e' peggio di una tappa nel posto sbagliato.

### ✅ 31/08 — I RUOLI VENGONO DAL RICONOSCIMENTO (`a7047cf`)

Deciso da Raffaella: «l'occhio deve essere libero di trovare e il cervello si
deve fare da parte». Tolto `FUNZIONI`, l'elenco chiuso di dodici nomi di spazi
che il modello che vede era obbligato a usare. Il perche' per esteso sta nel
messaggio di commit. Le tre cose da sapere:

1. **Sotto c'era un difetto meccanico che nessuno aveva visto.**
   `tipoDiFunzione` restituiva una **stringa**, e i due chiamanti leggono
   `.tipo` (`veritas_montaggio.js` ~882, `applicaNomi` ~22242): su una stringa
   `.tipo` e' `undefined`. Quindi `a.tipo` arrivava sempre vuoto a
   `__veritasApplicaOcchi` (~2943), dove `a.tipo || n.type` ripiegava sul ruolo
   posizionale, e ogni tappa nata dall'occhio nasceva `"sosta"`. **Il ponte
   esisteva dal 30/08 ma non ci e' mai passato niente.** Ora torna
   `{ tipo, fuori }`. Il documento dava la colpa all'ordinamento per la X:
   quello era solo il ripiego che sopravviveva.
2. **Si chiedono due cose separate.** `nome` libero, con le parole del modello
   (aula, corsia, reparto, magazzino: prima sparivano tutte). `ruolo` fra nove
   categorie architettoniche — origine, accoglienza, filtro, sosta,
   **distribuzione**, servizio, destinazione, esterno, escluso. Le categorie
   restano chiuse ed e' legittimo: non sono nomi, e non si mostrano all'utente.
3. ⚠️ **Un ruolo che il motore non conosce e' una tappa che non si muove.** La
   vecchia tabella emetteva `passaggio`, che non e' mai stato dentro
   `TYPE_OPTIONS_DEF` (riga ~282). Difetto latente. Chi tocca i ruoli
   **controlli quella riga**: e' l'unico insieme che il programma sa maneggiare.

Verificato: blocco 3 `58d371701aa9a349`, 33 blocchi; `node --check` pulito;
prova a mano sui nomi che prima sparivano. **Non provato a schermo.**

⚠️ Da guardare alla prossima corsa: quante tappe nascono e **dove**. Se ne
nascono sulle ali degli aerei o fuori dal pavimento, serve il filtro «dove si
cammina», e va messo qui, non altrove.

### Le tre lezioni di oggi, che valgono oltre oggi

1. **Il modello piccolo non va convinto, va interrogato bene.** 23 volumi in
   una telefonata → 222 gettoni su 2500 e 3 nomi. A mazzetti da 6 → 20 nomi.
   Nessuna soglia toccata, nessun modello cambiato.
2. **Gli esempi si ricopiano.** Nel foglio del cervello c'era, scritta per
   intero, la domanda sul volume 7: tornava identica da due giorni perché era
   l'esempio. Un esempio concreto in un prompt è un'istruzione travestita.
3. **I commenti mentono più del codice.** Due difetti di oggi erano commenti
   che promettevano quello che il codice non faceva: «resta chi è riconosciuto
   anche dall'occhio-cervello» (che gira dopo) e «le altre cercano al giro
   successivo» (che non esiste). Quando un commento promette, si verifica.

### ⚠️ RIPORTATA IN CIMA — la piattaforma è AGNOSTICA

Deciso da Raffaella il 30/08, ed è una decisione di prodotto, non di stile:
VERITAS riceve **aeroporti, scuole, musei, ospedali, negozi**. Non si scrive
codice, vocabolario o esempio che pensi a un solo tipo di edificio.
**L'occhio conta quanto o più del cervello**, perché un IFC con i nomi dentro è
l'eccezione: dove le indicazioni non ci sono, il sistema ci deve arrivare
guardando. Il report finale deve essere **interrogabile in italiano** su
volumi, strutture, aperture, visibilità e punti notevoli — non solo su ingressi
e uscite.

### Cosa resta aperto, in ordine di importanza

1. **La fila unica `origine → accoglienza → filtro → sosta → destinazione`.**
   È l'ultimo aeroporto cablato: una scuola non ce l'ha, un ospedale nemmeno, e
   un aeroporto ha **due versi** (chi parte e chi arriva), non una fila. Va
   sostituita da categorie che esistono ovunque (accesso, distribuzione, sosta,
   controllo, servizio, collegamento verticale, esterno) più le **relazioni**
   fra le zone. ⚠️ Non toglierla prima di avere qualcosa al suo posto: guida la
   simulazione, e senza resterebbero zero tappe.
2. **L'occhio non è un occhio separato.** OWLv2 non si apre su questo PC
   (`Provider type for Cast node ... is not set`, tutti e cinque i formati) e il
   ripiego è **lo stesso identico modello del cervello**: oggi il circuito è uno
   che parla da solo. Va portato fuori dal browser, dove può girare un
   rilevatore vero.
3. **Il taccuino.** Un registro unico di ciò che è stato misurato — volumi,
   aperture, altezze, distanze, visibilità, punti notevoli — con per ogni voce
   il valore, **come si è saputo** e quanto è affidabile. È la base della chat
   interrogabile: la chat risponde da lì, non a memoria.
4. **Le finestre e le aperture**, prima casella di `NON_MISURATO` e la prima
   che chiede un ingegnere. Si ricavano dalla geometria verticale che
   `veritas_visibility.js` già costruisce: un'apertura è un muro che si
   interrompe.
5. **`veritas_visibility.js` non è mai stato acceso a schermo.** Isovista, linea
   di vista, altezza dell'occhio diversa per chi è in piedi e chi è in
   carrozzina: scritto per intero, mai mostrato. È metà del prodotto già pagata.
6. ✅ **I ruoli vengono dall'occhio** (`a7047cf`, 31/08). **Da guardare alla
   prima corsa, ed è il primo passo della prossima sessione:** quante tappe
   nascono e **dove**. Se ne nascono sulle ali degli aerei o fuori dal
   pavimento serve il filtro «dove si cammina», in `veritas_montaggio.js`.
   ⚠️ Il ripiego per ordinamento resta in `applyAutoAssignment` (~3604) e in
   `assegnaZoneMisurate` (~3228): **non si toglie prima di aver visto che i
   ruoli capiti bastano** — senza ruoli la simulazione ha zero tappe.
7. **Il motore fisico** dà `unreachable` a ogni fotogramma, fase «ricerca punto
   libero», e `nessuna strada` fra le tappe. ⚠️ Il trap scatta nella prima
   interrogazione dei raggi, `dentroPerParita` → `world.intersectionsWithRay`,
   cioè DOPO il sanificatore dei triangoli: quel sanificatore non basta su
   questo modello. E i percorsi vanno da tappa a tappa: con le tappe piazzate
   per ordinamento, un `nessuna strada` può essere soltanto una tappa finita
   dove non si cammina. **Si guarda prima dove stanno le tappe, poi il grafo.**
8. **La chat non capisce l'italiano**: da una frase ha creato la zona «Le Zone».
   Risponde con frasi preconfezionate su ciò che ha misurato; la conversazione
   vera ha bisogno del taccuino (punto 3), non è aperta.

---

## 💸 IL BUDGET DEI GETTONI — regola operativa, si legge prima di cominciare

Il 30/08 una sola sessione ha consumato circa il **12% del budget
settimanale**. Non era previsto: non era stato calcolato. La settimana di
lavoro che segue ha **sette giornate**, quindi va spartita prima, non dopo.

⚠️ Le percentuali qui sotto sono un **tetto deciso**, non una misura: il
consumo vero lo vede solo Raffaella nella sua applicazione. Chi lavora si ferma
al tetto anche se «sembra che ce ne sia ancora».

### I tetti

| | tetto | perché |
|---|---|---|
| **Una giornata** | **12%** | sette giornate × 12% = 84%, e resta il 16% per il giorno che va storto — succede, ed è successo |
| **Una sessione di chat** | **6%** | due sessioni al giorno. Una sessione chiusa a metà giornata consegna un passaggio di consegne pulito; una che muore al 15% lascia il lavoro a metà, e quella dopo deve ricostruire tutto il contesto da capo, pagandolo una seconda volta |
| **Soglia di atterraggio** | **5%** | qui si smette di aprire roba nuova: si chiude quello che è aperto, si verifica, si consegna il prompt e si aggiorna questo documento |

### Cosa è costato davvero, misurato il 30/08

1. **La lettura integrale di questo documento** (53 KB). Serviva, ma una volta
   sola. Da adesso: si legge la sezione *DOVE SIAMO* in cima, più le regole
   rosse, e si va a fondo **solo sul fronte che si tocca in quella sessione**.
2. **I pezzi di codice stampati in chat.** Ogni `sed -n 'A,Bp'` entra nel
   contesto e ci resta per tutta la sessione: non è un costo che si paga una
   volta, è un costo che si ripaga a ogni risposta successiva.
3. **I log incollati con le tracce di chiamata.** Nel log del mattino, circa
   **180 righe su 250** erano `funzione @ file:riga` — la stessa catena
   ripetuta identica decine di volte, con dentro zero informazione. Sono
   costate più di due letture di codice.

### Le sei regole che ne discendono

1. **Il lavoro sta nella sandbox, non nella chat.** Si scarica, si modifica e
   si verifica là dentro; in chat arriva solo quello che serve per decidere.
2. **Mai `grep` su `index.html` senza tagliare** (`| cut -c1-150` o
   `sed -n 'A,Bp'`). Una riga minificata brucia una sessione in un colpo.
3. **Il perché lungo va nel messaggio di commit, non nella risposta.** I
   messaggi di commit non costano contesto e restano per sempre. La risposta in
   chat dice cosa è cambiato e basta.
4. **I log si incollano senza le tracce.** Servono le righe `[VERITAS …]`, gli
   errori e le ultime righe del riepilogo. Le righe che finiscono con
   `@ file:numero` si buttano: sono la stessa informazione ripetuta.
5. **Una sola verifica finale per sessione**, non una dopo ogni modifica —
   tranne il blocco 3, che si controlla a ogni tocco di `index.html` perché lì
   l'errore è irreversibile.
6. **Se un passo rischia di sforare il tetto, ci si ferma e lo si dice PRIMA
   di cominciarlo.** Non a metà.

### Come si spartisce la settimana

Una giornata del piano = un tetto da 12%, in due sessioni. Il giorno più
carico è quello del referto e della chat interrogabile: se serve, prende il 14%
attingendo alla riserva, e in cambio il giorno del lancio ne usa 8%, perché
quel giorno il lavoro è pubblicare, non scrivere codice.

> Il piano dei sette giorni (referti visivi, azioni degli agenti, promozione)
> **non sta in questo repo**: è un documento di lavoro separato, per la regola
> del documento di stato unico.

---

## 🎯 LA DIREZIONE DI PRODOTTO — decisa il 30/08, vale da qui in avanti

Mancava, e senza questa le sessioni successive rifarebbero scelte già fatte.

### Gli otto referti (sono il prodotto che si vende)

1. **Pianta della comprensione** — zone, nomi, funzioni. C'è già.
2. **Mappa delle strozzature** — la larghezza libera misurata, in rosso sotto
   0,90 m, col numero scritto sopra. **È il referto più vendibile.**
3. **Mappa dell'affollamento** — persone/m² al picco.
4. **Linee di flusso** — traiettorie, più spesse dove passano in tanti.
5. **Isovista** — cosa si vede da un punto.
6. **Visibilità dei punti notevoli** — da dove si vede l'uscita, il cartello.
7. **Doppia accessibilità** — la stessa pianta a 1,65 m e a 1,20 m, affiancate.
8. **Tempi di uscita.**

Più la **copertina**: che edificio è, quanti m², quanta fiducia, e in fondo
l'elenco di quello che NON è stato misurato. È la pagina per cui un ingegnere
si fida.

### Le regole del disegno, decise una volta

- **Il tratteggio significa dubbio**: fiducia bassa si campisce a tratteggio,
  mai a tinta piena. Si capisce senza leggere la legenda.
- **Il grigio significa non misurato.** Nessun riempimento inventato.
- **Non si colora mai una larghezza che non è stata misurata.** Resta bianca e
  finisce nell'elenco del non misurato. È l'onestà del sistema tradotta in
  disegno.
- Sette colori per le sette categorie, sempre gli stessi in tutti i referti.
- Ogni immagine porta scala grafica, data e **la scala applicata** (7,3× su
  questo modello). Un referto senza scala dichiarata non è un referto.

### Le azioni degli agenti — sei, non di più

**VAI** a un punto · **ASPETTA** · **USA** un oggetto (banco, tornello, cassa,
bottone) · **GUARDA** un punto · **SCEGLI** fra due strade · **ESCI**.

Bastano per un check-in, un triage, un cambio d'aula, una cassa, un'evacuazione.

**Il pezzo forte, e la frase da usare in ogni presentazione:**

> L'occhio trova il banco. Il banco diventa un'azione. L'azione fa la coda.
> La coda fa il numero che il cliente deve decidere.

Ogni oggetto che l'occhio riconosce diventa un **punto d'interazione** con
posizione, capienza, tempo di servizio proposto e verso della coda. Le azioni
si scrivono **in italiano dalla chat**, non con un pannello di parametri. La
domanda che vale soldi è «quanti banchi servono per stare sotto i dieci
minuti»: si risponde **provando**, non stimando.

### Il registro

Tutte le risposte della chat vengono da **un registro unico** di ciò che è
stato misurato — volumi, larghezze, aperture, distanze, visibilità, tempi,
code — dove ogni voce porta il valore, **come si è saputo** (misurato / visto /
dichiarato dal file / detto da Raffaella) e quanto è affidabile. La chat non
risponde a memoria: se non è nel registro, dice che non lo sa. È anche ciò che
impedisce di inventare zone come «Le Zone».

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

**Perché un passo del cervello si è fermato — NON SERVE PIÙ INCOLLARE NIENTE.**
Dal 28/08 (`2ac2641`) `cervelloLocale` conserva `finish_reason` e `usage`: ogni
telefonata lascia da sola una riga

    [VERITAS cervello] 3 assegnazione — stop | entrata 8001 · uscita 442 · 1275 caratteri

e la storia sta in `window.__veritasChiusura` (ultime 200). Se il motivo è
`length` la riga diventa un avviso che dice esplicitamente **«TRONCATA: manca
spazio nella finestra, non è un JSON rotto»**.

⚠️ **La lezione resta, ed è quella che il 26/08 è costata una giornata:** prima
di diagnosticare un JSON illeggibile si guarda il motivo di chiusura. `length` =
troncata, manca spazio → si allarga la finestra. `stop` = malformata, sbaglia la
sintassi → si guarda il parser. Due guasti opposti: chi salta questo passo
ripara quello sbagliato.

---

## Dove siamo — 29/08/2026, sera

**Il 28/08 il circuito capiva. Il 29/08 abbiamo scoperto perché quello che
capiva non arrivava mai a schermo: fra il cervello e la barra delle tappe
c'erano QUATTRO porte chiuse, tutte silenziose.** Nessuna dava errore. Tutte
scartavano. È il motivo per cui Raffaella confermava le zone e non cambiava
nulla — un'intera giornata sua persa a inseguire un difetto che non lasciava
tracce.

### ⚠️ Le quattro porte, in ordine dal cervello allo schermo

| # | dove | cosa pretendeva | commit |
|---|---|---|---|
| 1 | `applicaNomi`, ciclo del confronto | il volume doveva avere una `funzione` **conosciuta**, altrimenti scartato PRIMA di misurare le distanze | `ee9f4cc` |
| 2 | `applicaNomi`, dopo l'accoppiamento | stessa pretesa, di nuovo | `91f98ff` |
| 3 | `applicaNomi`, soglia | 5 metri fissi, su un edificio lungo 147 | `37722dd` |
| 4 | `__veritasApplicaOcchi` | buttava via il **nome letto** e rimetteva una parola di tabella | `5784fd2` |

Tutte e quattro sono la stessa malattia: **chiedere una parola già conosciuta a
chi sta guardando per la prima volta.** Se il cervello dice «parcheggio
esterno» e quella parola non è nell'elenco, sparisce. Bastava che una zona su
sette non passasse per non vederla mai.

⚠️ **Se ricompaiono nomi da elenco a schermo, si guarda in questi quattro
punti**, non nel circuito: la comprensione può essere perfetta e perdersi
nell'ultimo centimetro.

### La terza forma di guasto, che il documento non prevedeva

| cosa leggi | chi ha sbagliato | dove si guarda |
|---|---|---|
| `length` / **TRONCATA** | manca spazio nella finestra | si allarga la finestra |
| `stop` con testo illeggibile | il modello sbaglia la sintassi | si guarda il parser |
| **`Failed to fetch` / 0 caratteri** | **abbiamo riattaccato noi** | **si guarda LM Studio, non il codice** |

La terza si riconosce dal log **del server**, non del browser: `selected slot by
LRU` e `srv stop: cancel task`. LM Studio ha sportelli limitati e chiude la
telefonata più vecchia per far posto. Chi la confonde con un JSON rotto ripara
il posto sbagliato, come già successo il 26/08.

### Le immagini verso il modello che vede

| cosa | prima | ora | commit |
|---|---|---|---|
| numero di viste | 7 scorci + pianta = 8 | **12 porzioni, 4 per giro + pianta** | `4d68f87`, `7d26f5b` |
| cosa inquadra uno scorcio | il modello intero | **una porzione**, e le porzioni coprono tutto | `7d26f5b` |
| pianta | 2048 px, illeggibile per il modello | **1024 px** | `2daac13` |
| forma del riquadro | sempre quadrato 768×768 | **la sagoma del modello** | `cd4a9b5` |
| distanza telecamera | fissa, `diagonale × 0.8` | **calcolata spigolo per spigolo** | `4d68f87`, `b6a6894` |
| misure dichiarate nel log | no | sì, `[VERITAS scorci] … misure vere` | `3b66634` |

⚠️ **Il pannello di anteprima incornicia l'immagine in un riquadro fisso.** Il
nero che si vede lì è della cornice, non di ciò che parte. Non si giudica
l'inquadratura a occhio dal pannello: si legge la riga `[VERITAS scorci] …
misure vere`. Se sono tutte `768x768`, sulla pagina non è arrivato niente e si
guarda cache o deploy, non il codice.

⚠️ **Tentativo sbagliato, non ripeterlo.** `ingombroDelGrosso` (`6b130d2`,
tolto in `cd4a9b5`) ritagliava l'ingombro per inquadrare solo il costruito.
Curava il sintomo buttando via il soggetto: i **due tubi d'imbarco sono
ingressi veri** e il **parcheggio è una delle cose da riconoscere**. Il
problema non era mai stato *quanto* si inquadra, ma la *forma* del riquadro.

### Confermato da Raffaella guardando lo schermo

- **La scala 7,3× è giusta.** Il modello vale davvero 147 × 82 m per 15,4 m di
  altezza, e i 6340 m² calpestabili valgono. **Non ci si torna sopra.**
- **La pianta si legge benissimo**: aerei, terminal, corridoi, percorsi
  colorati. L'ipotesi «l'immagine è illeggibile» era sbagliata.
- Il contesto di LM Studio **non va alzato e il suo PC non può**: entrata
  massima misurata 6358 token su 16384. I tre passi chiudono con `stop`.

### ⚠️ La causa a monte, che resta aperta

Il travaso può solo **rincorrere** le tappe, perché le tappe nascono da un
**riempimento posizionale** in `applyAutoAssignment` e non da ciò che si è
capito. Il 29/08 il cervello ha nominato 6 volumi su 23 e nessuno di quelli
stava vicino a una tappa. Finché le tappe si generano prima di guardare,
qualunque accoppiamento è una toppa.

**Il fronte 0 è la riparazione vera, non un'ottimizzazione.**

---

## Cosa fare, in questo ordine

1. 🔴 **FAR CONCLUDERE IL CERVELLO INVECE DI FERMARLO A CHIEDERE.** E' il
   fronte, e i tre commit del 30/08 sera hanno tolto tutto quello che stava
   davanti. Vedi «IL COLLO DI BOTTIGLIA ADESSO». Da guardare, in quest'ordine:
   perche' un volume descritto bene («sedute in fila») finisce fra i senza
   nome; perche' il giro 3 ripete identico il giro 2 invece di riassegnare;
   perche' la stessa domanda sul volume 7 torna uguale a due giornate di
   distanza. ⚠️ Non si risolve alzando la soglia di fiducia a caso: si guarda
   cosa fa il passo di assegnazione con un volume descritto ma incerto.

2. 🔴 **VERIFICARE A SCHERMO I VOLUMI CON LA FORMA** (`f4ff56a`, mai visto
   girare al momento della scrittura di questa riga). Cosa si deve vedere: la
   zona dei controlli come **un solo volume allungato** che la copre, non un
   cubetto in mezzo; una zona in diagonale disegnata in diagonale. Se compare
   ancora un cubetto, quel nodo non porta `formaLungo`/`formaLargo` — succede
   per le zone create a mano dalla chat, ed e' voluto.

3. 🟠 **La chat deve capire l'italiano, non solo i comandi.** Il 30/08
   «assegna le zone e fai partire la simulazione» ha creato una zona chiamata
   **«Le Zone E Fai Partire La Simulazione»**. Detto da Raffaella, ed è
   prodotto, non rifinitura: *«il cliente dovrà chiedere dettagli sul
   modello»* — quanti banchi, quante sedute servono. Serve una lettura
   puntuale, non una riga di comando.

4. 🟠 **Il superpotere all'occhio.** Dagli scorci si prende solo la
   testimonianza, mai i riquadri (in prospettiva un riquadro non ha una
   posizione a terra — commenti in `veritas_comprensione.js` ~597). Con la
   rotazione a mazzetti l'occhio riceve già le stesse immagini del cervello,
   giro per giro: resta da verificarlo a schermo.

5. 🟡 **La segnaletica semantica.** Il lettore misura colore, direzione e area
   (`[VERITAS segnaletica] … tinta 46deg direzionale direzione 90deg`). Manca
   il passaggio da *fisica del segno* a *significato*.
   ⚠️ **Le frecce rosa/arancioni/verdi sulla pianta NON sono segnaletica
   dell'edificio: le disegna VERITAS.** Darle in pasto al cervello è
   guardarsi allo specchio.

### ✅ Fatto il 30/08 — sette commit su `main`, e la prima corsa che migliora

| cosa | commit |
|---|---|
| le zone non escono prima che qualcuno abbia guardato; l'editor si apre da solo | `f48c732` |
| gli scorci inquadrano una porzione, non tutto l'edificio | `7d26f5b` |
| le viste a mazzetti, un mazzetto per giro | `fe75509` |
| l'editor si apre solo per il circuito, non per l'occhio della sola pianta | `13061a9` |
| **fronte 0**: niente vocabolario d'aeroporto prima di guardare + quinta porta | `68325d0` |
| gli scorci erano quasi vuoti: l'altezza la dicono i pezzi | `8410d34` |
| **fronte 0 · posizione**: il nome si accoppia dove la tappa era stata MISURATA, non dove e' finita dopo lo spostamento | `8256e3c` |
| i volumi delle tappe non sono piu' grigi: azzurro filtro, verde acqua destinazione, ciano le altre | `8256e3c` |
| **fronte 0 · contenimento**: la portata dell'accoppiamento e' l'area della zona, non un numero uguale per tutti | `1c4d70a` |
| **il volume prende la FORMA della zona** — lungo, largo e verso misurati, non un cubetto fisso | `f4ff56a` |

**Misurato, non sperato.** Le tre corse della giornata, stesso modello:

| | 29/08 | 30/08 mattina | 30/08 dopo `8410d34` |
|---|---|---|---|
| volumi nominati su 23 | 4 | 6 | **7** |
| giro 2 → giro 3 | fermo | 6 → 6, **fermo** | 5 → **7, sale** |
| fiducia | 90% | 90% | 80% |
| parole cercate | parcheggi, piazzali | parcheggi, piazzali | **scale mobili, scivoli per bagagli** |

Le due righe che contano sono le ultime due. Per la prima volta il **terzo giro
aggiunge qualcosa** invece di ripetere il secondo: prima il circuito girava a
vuoto. E le parole che cerca sono passate da cose viste dall'alto e da lontano
(parcheggi, piazzali) a cose **dentro l'edificio** (scale mobili, scivoli per
bagagli). La fiducia scende da 90% a 80% ed è un miglioramento: prima era
sicuro perché non vedeva niente.

⚠️ **Il difetto che ha reso inutile lo zoom per mezza giornata, e come si è
visto.** Nel commento di `7d26f5b` era scritto «l'altezza resta INTERA: si
taglia in pianta, mai in alzato». Sembra prudente ed è il difetto: il modello
è alto 15,4 m ma quei metri sono **le code degli aerei**, presenti in 2
porzioni su 12. Nelle altre c'è un pavimento alto due metri, e la camera
riempiva il riquadro con una scatola 36×27×15: il soggetto schiacciato in
fondo, nove decimi di nero spediti al cervello. Non si è visto da nessun
numero — i 4,8 cm/punto erano giusti sulla carta. Si è visto perché Raffaella
ha aperto l'anteprima e ha guardato un'immagine. **Le altezze ora vanno da 3,4
a 14,9 m, e una porzione vuota non si manda più.**

### ✅ FRONTE 0 CHIUSO IL 30/08 SERA — e ha scoperto il collo di bottiglia vero

**Cos'era.** Il circuito capiva 7 volumi e **1 tappa su 7** veniva rinominata.
Le tappe **vengono spostate** dopo la misura per renderle raggiungibili a piedi
(`appoggiaTappe` / `catenaCamminabile`, `index.html` ~3050): finiscono sugli
arredi o lungo il corridoio che li unisce, non piu' sopra la zona da cui sono
nate. `applicaNomi` le confrontava li'.

**Riparato in tre passi, ognuno reso possibile dal precedente.**

1. `8256e3c` — **la posizione.** Una tappa porta due informazioni diverse: dove
   sta la roba (serve per il nome) e dove si mettono i piedi (serve per
   camminare). Lo spostamento riguarda solo la seconda. Chi sposta conservava
   gia' la prima in `posMisurata` e nessuno la usava: ora il confronto si fa li'.
   ⚠️ Non e' un allargamento di soglia. Allargarla accoppierebbe la tappa alla
   zona sbagliata piu' vicina al corridoio, con la faccia di un accoppiamento
   giusto.

2. `1c4d70a` — **il contenimento.** Corretta la posizione, il log ha mostrato il
   difetto vero: `7 confrontate sulla posizione misurata, il piu' vicino a
   17.7 m, soglia 9.4 m`. Si confrontavano cose di **scala diversa**: una tappa
   e' una ZONA (qui ~900 m2, cioe' 17 m di raggio), un volume capito e' un
   ARREDO che ci sta dentro. Il centro di un banco non coincide mai con il
   centro della sala che lo contiene. Ora la portata e' l'estensione della zona
   (`areaM2` → raggio), non un numero uguale per tutti.

3. `f4ff56a` — **la forma.** Chiesto da Raffaella, ed e' prodotto: «il sistema
   funziona quando individua tutta la zona dei controlli e mette UN volume
   allungato che la copre, non un cubetto dentro». Le sedute e i banchi sono gli
   INDIZI che danno il nome; la tappa e' **l'ambito funzionale intero**. Lungo e
   largo si ricavavano gia'; mancava il **verso**, e una fila in diagonale
   veniva disegnata dritta. Ora dove si contano le celle di ogni zona si
   accumulano i momenti secondi: dalla dispersione escono lato lungo, lato corto
   e angolo, senza un secondo giro.
   ⚠️ Il rettangolo non dichiara mai piu' pavimento di quanto ne sia stato
   misurato: su una zona a L si stringe in proporzione.
   ⚠️ L'altezza NON e' misurata per zona e resta quella del ruolo (2 / 2,2 /
   3,5 m). E' dichiarato nel commento: non si finga che venga dal modello.

📌 **Perche' la forma conta, detto da Raffaella il 30/08.** Nell'editor una
tappa **e' un volume**: si sposta con un clic e si modificano lunghezza,
larghezza e altezza. Finche' il sistema mette un cubetto standard, l'utente
deve allungarlo e allargarlo a mano su ogni zona di ogni modello — cioe' fa
lui il lavoro che si vende. Il volume deve nascere gia' della misura giusta:
l'editor serve a correggere un errore, non a costruire.

⚠️ **Gli effetti visivi si discutono dopo che il flusso gira** — deciso il
30/08, non dimenticato. Non e' rifinitura da anticipare: prima le tappe devono
prendere nome e forma giusti.

**Anche il colore** (`8256e3c`): i volumi erano tre grigi scuri e su un modello
grigio e bianco si confondevano con l'edificio. Ora azzurro (filtro), verde
acqua (destinazione), ciano (le altre), con `emissive` e uno spigolo acceso;
sopra i 30 m2 d'impronta l'opacita' scende, cosi' un volume esteso non nasconde
quello che copre. ⚠️ Rosa, arancione e verde chiaro restano ai percorsi che
VERITAS disegna sulla pianta: riusarli qui farebbe leggere una tappa come un
percorso.

### 🔴 IL COLLO DI BOTTIGLIA ADESSO: IL CERVELLO NON OSA NOMINARE

Corsa del 30/08 sera, con tutto quanto sopra attivo:

    1 tappe su 7 rinominate (1 esatta, 1 per vicinanza, 1 fuori elenco,
    6 senza nome dal cervello, soglia 9 m, 7 confrontate dove erano state
    misurate, 2 accoppiate dentro la propria area misurata)

    18 volumi su 23 restano senza nome.
    giro 1: 0 nominati, 23 senza nome, fiducia 95%
    giro 2: 5 nominati, 18 senza nome, fiducia 80%
    giro 3: 5 nominati, 18 senza nome, fiducia 80%

**I meccanismi nuovi hanno lavorato** — «7 confrontate dove erano state
misurate», «2 dentro la propria area» — ma con **5 volumi nominati su 23** piu'
di 5 tappe su 7 non potevano prendere un nome in nessun caso: l'accoppiamento
non ha materiale. **Non e' piu' un problema di geometria.**

⚠️ **E non e' l'occhio troppo lontano.** La prova e' la domanda che fa da solo:
*«il volume 7 e' un rettangolo largo con delle sedute in fila: che spazio e'?»*
Le sedute le vede, e le vede in fila. Un occhio lontano non descrive delle
sedute. Manca il passo da **«sedute» a «sala d'attesa»**: descrive e poi
chiede, invece di concludere. La domanda va in chat, nessuno risponde, e il
giro 3 ripete identico il giro 2 — il circuito ha smesso di imparare.

⚠️ **Il volume 7 e' la stessa domanda del 29/08.** Allora era «un rettangolo
largo con delle sedute in fila» per due volumi diversi; oggi torna uguale.
Chi ci mette mano guardi anche perche' quella domanda si ripete invece di
essere consumata.

⚠️ Regola 0 punto 5 dice «se non sa, chiede» — e va tenuta. Il difetto non e'
che chiede: e' che chiede **anche quando sa**, e chiedendo si ferma. Sedute in
fila dentro un rettangolo largo e' un'inferenza architettonica normale, non un
salto nel buio: va nominata con fiducia dichiarata, non trasformata in domanda.

### ⚠️ Due cose da NON rifare, misurate il 30/08

**1. Non ridurre il numero di viste per paura di saturare il modello locale.**
Il dubbio è legittimo — 12 porzioni più la pianta sembrano tante — ma i numeri
dicono di no. Ogni telefonata porta la pianta più 4 porzioni, cinque immagini
in tutto, mai tredici. Le cinque telefonate della corsa del 30/08 sera:

    1 sguardo       entrata 3401
    2 studio        entrata 5292
    3 assegnazione  entrata 5345
    4 sguardo       entrata 3464
    5 assegnazione  entrata 5387

Tetto 16384, tutte chiuse con `stop`, nessuna troncata. Il massimo è **5387**,
più basso dei 6358 del 29/08 con quattro viste larghe. C'è margine per il
doppio delle porzioni, non per meno.

**2. I numeri non bastano: bisogna GUARDARE un'immagine.** Il difetto più caro
della giornata (`8410d34`, porzioni quasi nere) aveva tutti i conti giusti —
4,8 cm per punto era vero — e nessuna riga di log lo segnalava. È saltato
fuori solo aprendo l'anteprima. Il comando per farlo senza spendere un giro:

    __veritasProvaScorci({latoMassimo: 30})

Disegna in fondo allo schermo esattamente le immagini che partono. Prima di
dichiarare che una modifica all'occhio funziona, si guarda.

### Altro dalla corsa del 30/08

- ✅ **Il motore vero su Render si è svegliato**: `traiettoria remota ACCETTATA
  e in uso al posto di quella locale`, 800 frame, 28 mappe cognitive.
- 🔴 **L'occhio della sola pianta continua a scrivere «parcheggio» su quattro
  zone** (fronte 2). In un'altra corsa della stessa giornata rispondeva
  `HTTP 400`. Non è ridondante: è rotto, e sporca il risultato.
- 🔴 **Motore fisico**: `unreachable` a ogni ricalcolo, in fase «ricerca punto
  libero». Gli agenti ripiegano sul percorso pianificato.
- 🟠 **Le sei tappe scritte a mano nel bundle** (`INGRESSO · ACCETTAZIONE ·
  CONTROLLO · LOUNGE · GATE A1`) compaiono in barra dal primo istante, prima
  di qualunque misura: `applyAutoAssignment chiamato, zone: 3, currentNodes: 6`.
  Sono nel blocco 3 e vanno zittite **da fuori**, come le zone grigie.
- 🟠 **La chat prende una frase per un nome di zona.** Il cliente deve poter
  chiedere «quanti banchi servono», non solo dare comandi.

### ⚠️ Non spiegato, e va spiegato prima di aggiungere altro

- **Il 28/08 nominava 23 volumi su 23. Il 29/08 ne nomina 4 su 23.** È un
  peggioramento vero, non rumore, e nessuno sa ancora perché.
- **Due numeri diversi per la stessa cosa nello stesso messaggio:** «4
  nominati» e due righe sotto «parto con i 6 volumi che ho riconosciuto».
- **La stessa domanda per due volumi diversi:** volume 7 e volume 8 descritti
  entrambi come «un rettangolo largo con delle sedute in fila», quando poco
  prima il volume 8 era «un rettangolo lungo vicino ai vetri».
- **Motore fisico:** `table index is out of bounds` (30/08), dopo
  `unreachable` e `memory access out of bounds` del 25/08. Gli agenti
  ripiegano sul percorso pianificato.

### Difetti minori visti il 29/08, non ancora aperti

- Alla dichiarazione di ingressi e uscite risponde *«appena finisco questo giro
  ne faccio uno con quello che mi hai detto»* e poi ricomincia a dire che non
  trova uscite. Promessa non mantenuta.
- `index.html` ha **33** blocchi `<script>` dal 30/08 (era 32; il 31 è nuovo).
  Il blocco 3 resta il 3: nessun indice si è spostato.

---

## Come si è lavorato il 29/08 (metodo che ha funzionato)

Modifiche fatte in sandbox e **committate direttamente**, senza far passare i
file per la chat: costa un decimo. Per ogni modifica a `index.html`: estrazione
dei blocchi con `html.parser`, `sha256` del blocco 3 verificato
(`58d371701aa9a349`), `node --check` sul blocco toccato, e solo allora commit.

⚠️ **La CDN `raw.githubusercontent.com` serve copie vecchie anche con
cache-buster.** Per leggere lo stato vero si passa dall'API: `GITHUB_GET_A_TREE`
→ `GITHUB_GET_A_BLOB`. Una patch applicata su una copia vecchia fallisce in
silenzio o, peggio, sovrascrive.

⚠️ **Non si fa `grep` su `index.html` senza tagliare l'uscita.** I blocchi 2 e
3 hanno righe minificate da centinaia di migliaia di caratteri: una sola riga
che corrisponde riempie la chat e brucia budget in un colpo. Si usa `sed -n
'A,Bp'`, oppure `grep -n … | cut -c1-160`. Successo il 30/08, costo reale.

📌 **Come si committa `index.html` senza farlo passare per la chat** (30/08,
funziona). L'API dei contenuti di GitHub e' scomoda per un file da 1,9 MB. Si
usa l'API Git in quattro passi: si crea un *blob* col file in base64, un
*tree* con `base_tree` = commit corrente e dentro solo i file cambiati, un
*commit* con quel tree, e infine si sposta `refs/heads/main`. Nessun file
transita in chat e la storia resta lineare. ⚠️ Prima del blob si rilegge
`refs/heads/main` e si verifica che sia ancora il commit da cui si e' partiti.

⚠️ **Due chat sullo stesso ramo si calpestano.** Il 29/08 alle 08:13 un'altra
chat ha riportato `main` a `084dd95` (28/08 ore 10:11), portando via quattro
commit del 28/08 che funzionavano. Ripristinato a `0f4a48d` con un commit nuovo
(`cbacdbe`), senza riscrivere la storia. **Prima di scrivere, guardare
`GITHUB_LIST_COMMITS`.**

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

⚠️ **CORREZIONE 30/08 — NON sta nel bundle grosso.** Questo documento diceva
il contrario e ci ha tenuti lontani per giorni da una riparazione che costa
molto meno del previsto. `applyAutoAssignment` è alla **riga 3492 di
`index.html`, blocco 2**, che è codice leggibile e commentato (312 KB), non il
bundle minificato. Il blocco 3 non c'entra e non va toccato lo stesso.
Struttura della funzione: prova `assegnaZoneMisurate` (misure + tipo di
progetto) e, **se quella fallisce**, ripiega sull'ordinamento per X con una
sequenza di ruoli fissa. È il ripiego il difetto, non tutta la funzione.

⚠️ **Prima di aprirlo, provare il travaso (`27d2003`).** Se quello funziona i
nomi veri arrivano già alle tappe, e questo fronte cambia di forma: resterebbe
solo da togliere il riempimento iniziale, non da ricostruire l'assegnazione.

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
