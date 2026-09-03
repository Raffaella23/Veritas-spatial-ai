# HANDOFF.md — VERITAS Spatial AI

> **Aggiornato il 02/09/2026, sera.** Questo è **l'unico documento di stato del
> progetto.** Non ce ne sono altri, e non se ne creano altri.

---

## 🚩 SI RIPARTE DA QUI — 02/09/2026, sera

**Il progetto adesso si porta dietro il suo spazio, i passeggeri entrano da
tutti gli ingressi, e la simulazione corre.** Quattordici commit, tutti su
`main`, testa **`f900f50`**.

| pezzo | stato |
|---|---|
| il progetto si porta dietro il suo modello | ✅ **misurato**: riaperto un progetto, il modello torna **da solo** dal browser, **147,3 × 82,2 m × 15,4 m** — cioè dalla strada del pulsante, con la scala automatica |
| la schermata d'apertura | ✅ ogni riga dice file, peso, quando, e **se il modello c'è**; una strada sola per entrare; si rinomina e si butta |
| gli ingressi arrivano al motore vero | ✅ **misurato**: 10 profili di missione da 5 flussi, e col motore reale ACCETTATO i 28 passeggeri nascono **6+6+6+4+6** sui quattro accessi più la tappa Origine |
| la barra di riproduzione | ✅ **misurato**: da «0.1s / 180s · FRAME 0/361 · attivi 0» a **«6.6s / 400s · FRAME 13/800 · ATTIVI 28»**, e corre |
| i quattro numeri | ✅ sono nostri e sanno dire **perché** non hanno una risposta |
| l'interfaccia | 🟠 in corso — l'inventario è più giù, sei voci, due chiuse |
| il livello come campo della tappa | ❌ non fatto — resta il punto 2 |
| il passeggero attraversa il varco | 🔴 aperto il 02/09 — punto 8 |

| commit | cosa |
|---|---|
| `6eb5f69` | le prove viaggiano col risultato: scritto il lavoro promesso in pubblico |
| `003c4a0` | il progetto si porta dietro il suo spazio, e l'elenco lo dice |
| `2fc7153` | le righe vuote si buttano in un colpo: erano 175, non venti |
| `79f4955` | la revisione dell'interfaccia intera va in lista |
| `115dcab` | al motore vero arrivano gli ingressi, non le sole tappe: un profilo per flusso |
| `dac030c` | gli ingressi al motore vero, e il difetto che resta: la barra non parte |
| `9cc10bb` | il PLAY fa ripartire la barra, e la durata la dicono i fotogrammi |
| `e5a6e69` | la barra corre: 6.6s/400s, fotogramma 13 su 800, 28 attivi |
| `5210b91` | un posto solo per far partire, e l'avviso smette di coprire i tasti |
| `12c5088` | il metal detector si attraversa, non si sfiora: aperto il punto 8 |
| `2406014` | l'elenco si può davvero ripulire, e il caricatore è uno solo |
| `5983337` | l'inventario dell'interfaccia: sei voci guardate una per una |
| `f900f50` | la finestra dell'occhio mostra, non chiacchiera; e tre avvisi diventano uno |
| `(ultimo)` | i quattro numeri sono nostri e dicono perché non rispondono |

### Le cinque lezioni della sera, che valgono oltre stasera

1. **La domanda zero va fatta anche al RISULTATO, non solo alla diagnosi.**
   👁️ *«rispetto a ieri abbiamo perso: un solo ingresso, camminano in fila
   indiana»*. Fra il commit dei taxi (`6a75ddd`) e la testa del mattino
   (`d21ac28`) il codice cambia di **zero righe**. Era cambiato **quale motore
   risponde**: ieri Render dormiva e girava il generatore locale, che i flussi
   li usa; oggi Render risponde, e **al motore vero i flussi non arrivavano
   mai**. Il documento avvertiva di guardare quale motore gira prima di
   *diagnosticare*: vale anche prima di dire «è peggiorato».
2. **Un log che non distingue i due casi non è una diagnostica, è un rumore
   rassicurante.** Il ponte stampava «posizioni inviate» prendendo i primi
   quattro nodi del grafo: erano sempre le stesse tappe nello stesso angolo, e
   dicevano l'identica cosa con una partenza sola o con quattro diverse. Adesso
   stampa **da dove parte ogni profilo di missione**.
3. **Un'operazione che non può dimostrare di aver fatto qualcosa non deve
   dichiarare successo.** La cancellazione dei progetti falliva **due volte per
   due cause diverse**: prima l'indirizzo troppo lungo (172 uuid in una
   richiesta sola), poi il rifiuto per permessi, che PostgREST restituisce
   **senza errore e con zero righe toccate**. Adesso si chiede indietro
   `.select("id")` e si contano le righe uscite.
4. **Uno zero che c'è sempre non si distingue da un numero rotto.** 👁️ E la
   regola che ne è nata, che vale ovunque: **«quello che non sappiamo spiegare
   non si deve vedere»**.
5. **Non si rincorrono gli z-index.** Il pannello dell'occhio era arrivato a
   `99999` e stava sopra tutto. La regola del progetto era già scritta accanto
   al dock: **«i comandi stanno tutti a sinistra e i pannelli si aprono a
   destra»**.

### ⚠️ Trappole pagate stasera, da non ripercorrere

- **`veritas_montaggio.js` non aveva `?v=`**, e nemmeno il suo `import` di
  `veritas_anteprima.js`: un modulo esterno ha la sua cache e arriva quello di
  prima anche con `index.html` rinfrescato. Adesso il tag porta `?v=2` e
  l'import anche. **Si cambiano a ogni modifica di quei file.**
- **Un tag `<script>` in più in cima sposta di uno l'indice di tutti i
  blocchi** e il bundle React smette di essere il blocco 3: la ricetta di
  verifica fallirebbe per sempre, e sarebbe un allarme finto. Il deposito si
  carica **da dentro il blocco 2**, non con un tag nuovo.
- **`veritas-play-ready-btn` stava nell'elenco `NATIVE_BUTTON_IDS`**, cioè fra
  i «bottoni nativi del bundle da nascondere». Non era del bundle: era il
  nostro PLAY, e finiva nascosto insieme ai doppioni.
- **La finestra del browser dentro Claude riparte pulita**: la sessione
  Supabase scade e da lì non si guida più la pagina. Le verifiche a schermo
  vanno fatte **prima** che serva, o le fa Raffaella.
- **Una query in console che stampa un oggetto intero esplode.** Successo di
  nuovo con `window.__veritasFlussiCorrenti`: 2,8 milioni di caratteri. Si
  proiettano solo i campi che servono.

### Da dove si riparte, in ordine

1. **Finire l'interfaccia** — l'inventario è nella sezione dedicata più giù,
   sei voci: due chiuse, restano la riga in cima che si sovrappone (**va
   misurata con la pagina davanti**), il pannello Punti dentro le fasi, e le
   domande dell'occhio nella chat.
2. **Il passeggero attraversa il varco** (punto 8): una tappa è un punto e il
   percorso la sfiora; un varco è una **soglia**, e passarci accanto non è
   passarci dentro.
3. **Il livello come campo della tappa** (punto 2): è il motivo per cui in
   pianta i nomi non compaiono.
4. **Le prove viaggiano col risultato**: promesso in pubblico, sezione dedicata
   più giù.

---

## 🚩 IL QUADRO DEL 02/09/2026 — mattina e pomeriggio

**Gli ACCESSI ci sono, e i flussi nascono da loro.** Nove commit, tutti su
`main`, testa `6a75ddd`.

| pezzo | stato |
|---|---|
| gli accessi | ✅ accesi. Non piu' una regola sola: **quattro voci che votano**, e l'affidabilita' e' quante sono d'accordo |
| il tetto che finisce, su uno spaccato | ✅ si dichiara **MUTA da sola**: 36 campioni coperti su 1.544 (2%) |
| l'aggancio ai flussi | ✅ `veritas_flussi.js` legge `window.__veritasAccessi`: **da 1 flusso a 9** (misurato) |
| i tetti dei tunnel | ✅ buttati: **8 posti su 12** non erano porte ma lastre da cui non si entra |
| l'ingresso dalla strada | ✅ trovato dalle quattro voci a x=16, e **marcato «da fuori»**: si vedono arrivare i taxi |
| il livello come campo della tappa | ❌ non fatto — resta il punto 2 |
| il progetto si porta dietro il suo spazio | ✅ **fatto e misurato** (`003c4a0`): riaperto un progetto, il modello e' tornato **da solo** dal browser, **147,3 × 82,2 m in pianta e 15,4 m di altezza** — cioe' dalla strada del pulsante, con la scala automatica |
| la schermata d'apertura | ✅ **fatta** (`003c4a0`, `2fc7153`): ogni riga dice file, peso, quando e **se il modello c'e'**; una strada sola per entrare; si rinomina e si butta. Le righe vuote erano **175, non venti**, e **172** non hanno ne' modello ne' tappe |
| l'interfaccia intera | 🔴 aperta il 02/09 — nuova sezione qui sotto |
| gli ingressi arrivano al motore vero | ✅ **fatto e misurato** (`115dcab`): 10 profili di missione da 5 flussi, e col motore reale ACCETTATO i 28 passeggeri nascono **6 + 6 + 6 + 4 + 6** sui quattro accessi piu' la tappa Origine |
| la barra di riproduzione | ✅ **fatto e misurato** (`9cc10bb`): da «0.1s / 180s · FRAME 0/361 · attivi 0» a **«6.6s / 400s · FRAME 13/800 · ATTIVI 28»**, e corre |

👁️ **Visto a schermo da Raffaella, 02/09:** *«ho visto più flussi e passeggeri
che arrivavano al terminal dall'aereo attraverso il tunnel (correttamente),
altri ci camminavano sopra; non ho visto qualcuno entrare là to automobili»*.
Le prime due cose sono la conferma che l'aggancio funziona. La terza era un
difetto vero, ed e' quello che ha fatto nascere la regola «da un ingresso si
entra». La quarta e' il lavoro di domani.

| commit | cosa |
|---|---|
| `868b0a4` | gli accessi: quattro voci che votano, e il tetto su uno spaccato tace |
| `0d32364` | un ingresso sta dentro sei metri: niente catene, e gli oggetti bassi non votano |
| `952da3b` | gli accessi ci sono prima delle tappe: il ricalcolo si chiede quando ci sono i due capi |
| `da4987c` | da un ingresso si entra: i tetti dei tunnel non sono porte |
| `4c81ddd` | il modulo ha la sua versione: `index.html?v=N` non rinfresca i moduli |
| `0623eab` | il ricalcolo dei flussi aspetta quanto dura il giro, non mezzo minuto |
| `c8bc969` | il quadro del 02/09 in cima al documento |
| `e02b5d9` | il fuori non e' una voce in piu': e' un marchio sull'accesso |
| `9646156` | una cosa parcheggiata e' grossa in tutte e due le dimensioni |
| `6a75ddd` | il quadro aggiornato: l'ingresso dalla strada c'era gia' |

### Come funziona adesso, in una riga

> Un accesso e' un posto dove **piu' indizi indipendenti sono d'accordo**, da
> cui **si entra davvero a piedi**. Quanti indizi sono d'accordo e' la sua
> affidabilita', ed e' il numero che va nel referto.

Le quattro voci, e nessuna decide da sola (`veritas_accessi.js`):

| voce | cosa guarda | su questo modello |
|---|---|---|
| il tetto che finisce | dove il coperto tocca lo scoperto | **MUTA**: 36 coperti su 1.544 |
| la segnaletica del modello | le macchie piatte e sature della stessa tinta sono una corsia, e una corsia ha due capi | 29 posti (76 macchie, 6 tinte) |
| le persone gia' modellate | dove le figure stanno **in fila** si passa uno per volta | 20 posti (37 gruppi, 140 figure) |
| gli oggetti | le cose ripetute **in fila** e alte abbastanza da non scavalcarsi stanno di traverso a un passaggio | 72 posti |

Poi due filtri, e sono tutti e due misure, non soglie inventate:
**almeno due voci diverse** entro sei metri (25 posti scartati perche' ne
avevano una sola), e **da li' si entra** — si guarda quanto spazio ognuno
raggiunge a piedi e si tiene chi sta sulla massa principale (8 posti buttati:
erano i tetti dei tunnel e pezzi staccati).

Esito misurato sulla pagina live: **4 accessi**, tutti sul calpestabile vero,
in ~5 secondi.

### Le tre lezioni del 02/09

1. **Una regola che non puo' funzionare va fatta TACERE, non tarata.** Il tetto
   su uno spaccato non e' impreciso: e' cieco, e ogni soglia che trova lungo il
   taglio e' finta. Adesso lo dice da solo nel log, col numero.
2. **Un indizio che parla troppo non e' un indizio.** Gli oggetti proponevano
   316 posti su 365 totali: si trovava d'accordo con chiunque. Due filtri
   geometrici l'hanno riportato a 72, e solo allora l'accordo ha voluto dire
   qualcosa.
3. **`index.html?v=N` NON rinfresca i moduli esterni.** Ognuno ha la sua cache.
   Una verifica intera e' stata buttata guardando codice di venti minuti prima
   e concludendo che la correzione non funzionava. Il tag porta `?v=` suo, e
   quel numero **si cambia a ogni modifica del modulo**.

⚠️ **E una trappola nuova sui file:** `index.html` NON si tocca con
`Get-Content -Raw` / `Set-Content` in PowerShell. Rilegge il file come ANSI, i
caratteri accentati si rompono e **il blocco 3 cambia hash**. Si modifica con
l'editor, mai riscrivendolo per intero. La ricetta di verifica l'ha preso al
volo — e' esattamente per questo che esiste.

### ✅ L'INGRESSO DALLA STRADA — c'era gia', e la quinta voce NON si scrive

👁️ Raffaella, 02/09, guardando la simulazione: *«GUARDA ARRIVANO DALLE
MACCHINE!»*. L'ingresso dalla strada l'hanno trovato **le quattro voci da
sole**, a x = 16, con la segnaletica e gli oggetti in fila.

Misurato nel file, senza browser, leggendo il GLB del repo: proprio li' ci sono
**4 oggetti lunghi 4,2 m e larghi 1,8 messi in fila**, due nastri lunghi 36 m a
x 18-29, e una decina di sagome umane fuori dall'edificio.

**Quindi la quinta voce non si e' scritta, ed e' la decisione giusta:** le
macchine votano gia' come oggetti in fila. Farle votare una seconda volta
alzerebbe l'affidabilita' con **lo stesso indizio detto due volte** — l'errore
contro cui questo stesso file mette in guardia.

Quello che mancava era **sapere che quell'accesso da' sul fuori**. E' un
**marchio**, non un voto (`coseFerme`), e si riconosce da quattro misure: cose
piu' lunghe di 3 m, piu' larghe di 1,5 m, piu' alte di 1 m (nessun arredo lo
e'), messe a **distanze regolari** con vuoto in mezzo, e almeno tre. L'accesso
che le tocca si chiama **«Accesso N da fuori»**, e siccome `veritas_flussi.js`
chiama il flusso col nome del suo ingresso, quel nome arriva fino allo schermo.

Provato sui 2.416 pezzi veri: su 139 gruppi con almeno tre copie ne marca
**due**, e uno e' il gruppo delle macchine. Senza la misura della larghezza ne
marcava sette, e sei erano pannelli e banconi interni — lunghi ma sottili.

⚠️ **Due strade misurate e scartate, per non rifarle:** «dove finisce il tetto»
(36 campioni coperti su 1.544) e «dove finisce il **costruito**», cioe' i muri —
**52 muri in tutto il modello, che non chiudono nessuna cella**. Su uno spaccato
il fuori lo dicono solo le cose che ci stanno.

### Il lavoro numero uno adesso: IL PROGETTO SI PORTA DIETRO IL SUO SPAZIO

Prima di tutto il resto, e per due ragioni che vanno nella stessa direzione: e'
un buco di prodotto che si vede subito, ed e' quello che oggi ha reso ogni
verifica a meta' — senza modello sulla pagina non si misura niente, e il giro di
comprensione dura minuti.

✅ **DECISO DA RAFFAELLA IL 02/09: il modello resta NEL BROWSER. Non si spende
altro in spazio sul server.** La decisione e' presa, non si riapre.

Come si fa, ed e' tutto qui:
1. il file caricato si tiene in **IndexedDB**, con la chiave del progetto.
   ⚠️ Non `localStorage`: quello tiene testo e sta stretto, e questo GLB pesa
   19 MB. IndexedDB tiene i byte;
2. il progetto salva **il nome e il peso del file**, non il file. Sono due
   campi, e servono a due cose: riconoscere che il modello ritrovato e' quello
   giusto, e poter **dire quale file chiedere** quando non c'e';
3. riaprendo il progetto: se in IndexedDB c'e' quel file, si rimette da solo e
   la pagina non chiede niente. Se non c'e' — altra macchina, altro browser,
   cache pulita — si dice **col nome**: «questo progetto lavora su
   `airport_foot_traffic.glb`, ricaricalo», invece di aprirsi vuoto e in
   silenzio.

⚠️ Il modello va rimesso **per la stessa strada del pulsante**, quella che passa
dalla scala automatica del blocco 2. Non con un `DataTransfer` e non saltando
quel passo: un modello 7 volte piu' piccolo del vero fa sbagliare in silenzio
tutto quello che viene dopo (trappola del 01/09).

### 🔴 E LA SCHERMATA D'APERTURA, che e' lo stesso problema visto da davanti

Detto da Raffaella il 02/09: *«ora nella schermata iniziale abbiamo infiniti
progetti creati nelle sessioni. Si puo' scegliere la tipologia di modello, ma si
puo' anche caricare direttamente senza dare un nome al progetto. A me non e'
chiaro, figuriamoci a un utente esterno!!!»*

Misurato aprendola: **venti righe, tutte chiamate «Nome progetto», tutte
«aeroporto», tutte con la stessa data.** Nessuna dice che cosa contiene. E una
sola di quelle venti, provandole, aveva ancora il modello — perche' era la cache
del browser, non il progetto.

E' lo stesso buco di prima visto da davanti: **se un progetto non contiene il suo
spazio, non c'e' niente da mostrare in quell'elenco** — restano un nome vuoto e
una data. Per questo le due cose si fanno insieme e in quest'ordine.

Le quattro cose da sistemare, e sono tutte conseguenze di quella:

1. **una riga deve dire di che spazio parla**: il nome del file su cui lavora,
   quando e' stata aperta l'ultima volta, e — la piu' importante — **se il
   modello ce l'ha o no**. Oggi un progetto pieno e uno vuoto sono identici;
2. **una strada sola per entrare, non due.** Oggi si puo' creare un progetto
   *oppure* trascinare un file senza dare un nome a niente: la seconda strada
   lascia un lavoro senza casa. Chi carica un file sta creando un progetto, e il
   nome del file e' un nome di partenza piu' che ragionevole;
3. **non si crea un progetto finche' non c'e' dentro qualcosa.** Le venti righe
   vuote sono sessioni aperte e mai riempite;
4. **si devono poter buttare.** Serve togliere quelle venti, e serve poterle
   rinominare.

⚠️ Nessuna di queste e' una scelta grafica: sono tutte «una cosa deve dire quello
che e'», che e' la stessa regola del resto del progetto.

Subito dopo: **il livello come campo della tappa** e i nomi accoppiati a parita'
di piano: e' il motivo per cui in pianta i nomi non compaiono.

### ✅ GLI INGRESSI ARRIVANO AL MOTORE VERO — e la lezione che vale oltre oggi

👁️ Raffaella, 02/09: *«rispetto a ieri abbiamo perso: un solo ingresso, non
vede il parcheggio come accesso, non partono e non arrivano attraverso il
tunnel. Oggi le vedo camminare in fila indiana, un comportamento sicuramente
non umano.»*

**Non era una regressione, ed e' stato misurato prima di toccare qualunque
cosa.** Fra il commit in cui si vedevano i taxi (`6a75ddd`) e la testa di
stamattina (`d21ac28`) il codice cambia di **zero righe**: due tentativi e i
loro due annullamenti esatti, tutto il resto documento.

⚠️ **Era la DOMANDA ZERO, e stavolta ci e' cascato il risultato invece della
diagnosi.** Ieri Render dormiva e girava il generatore JS locale, che i flussi
li usa. Oggi Render si e' svegliato, la sua traiettoria viene accettata, e **al
motore vero i flussi non erano mai arrivati.**

Misurato sulla pagina live, stesso modello e stesso progetto, spegnendo e
riaccendendo il motore remoto senza toccare una riga:

| motore reale | dove nascono i 28 passeggeri |
|---|---|
| spento | **14 punti** su tutti e quattro gli accessi + la tappa Origine |
| acceso | **1 punto solo**: −55, −14 |

**La causa:** `veritasNodesToGraph` costruisce il grafo per il Core Python
dalle sole **tappe**. Gli ingressi misurati non sono tappe: vivono nei
**flussi**. Con un solo gate la funzione ripiegava su otto profili
`ingresso_v` che erano solo un ventaglio di otto punti a 1,2 m attorno alla
prima tappa — otto file affiancate che partono dallo stesso posto e fanno lo
stesso tronco. Da li' l'unico ingresso e la fila indiana.

**Sistemato in `115dcab`:** ogni flusso diventa un profilo di missione con la
sua entrata, il suo tronco e la sua uscita, presi da
`window.__veritasFlussi.per` — **la stessa funzione del generatore locale**, e
questa e' la parte che impedisce al difetto di tornare da un'altra porta: i due
motori non possono piu' raccontare due edifici diversi. Il ventaglio non
sparisce, si sposta: adesso e' **per flusso**, e le file sono tante quante
bastano perche' ogni gruppo di agenti abbia il suo profilo.

Esito misurato **col motore reale ACCETTATO**: 10 profili da 5 flussi, e i 28
passeggeri nascono **6 all'Accesso 1, 6 all'Accesso 2, 6 all'Accesso 3 — quello
dalla strada, i taxi —, 4 all'Accesso 4 da fuori, 6 alla tappa Origine**, su
due quote (0,69 e 3,64 m).

⚠️ **E una lezione sul log, che vale oltre oggi.** Il ponte stampava «posizioni
inviate» prendendo i **primi quattro nodi del grafo**: erano sempre le stesse
tappe nello stesso angolo, e dicevano la **identica cosa** sia quando le
partenze erano una sola sia quando erano quattro. Un log che non distingue i
due casi non e' una diagnostica, e' un rumore rassicurante. Adesso stampa **da
dove parte ogni profilo di missione**.

### ✅ LA BARRA DI RIPRODUZIONE — chiusa il 02/09 (`9cc10bb`)

Aperto il progetto col modello, premuto il **▶ PLAY** vero (quello del
cartellino «Zone pronte», non la barra del bundle), e misurato subito dopo:
`__veritasSimStarted` **true**, i 5 flussi **ci sono**, la traiettoria ha
**800 fotogrammi** — e la barra a schermo resta su **«0.1s / 180s · FRAME
0/361»**, con FLUSSO 0.000 e ATTIVI 0.

E' quello che Raffaella ha chiamato «ora e' bloccato», ed e' un difetto **a
valle** di tutto il resto: i dati della simulazione sono giusti e completi, e'
la riproduzione che non li consuma. I 361 fotogrammi e i 180 secondi sono i
numeri **del bundle**, non i nostri (800 fotogrammi): la barra sta ancora
guardando la sua sequenza dimostrativa.

⚠️ Da non confondere col difetto degli ingressi qui sopra: quello riguardava
**dove nascono** i passeggeri, questo riguarda **se si muovono**. Sono due
difetti diversi, ed e' stato utile trattarli come due.

**Le due cause, e nessuna delle due era la simulazione:**

1. **la barra era stata messa in pausa da noi all'avvio** — apposta, e per una
   ragione buona: senza quella pausa i passeggeri camminano sulle sei tappe
   cablate dentro il bundle, di un aeroporto che non e' quello dell'utente,
   prima ancora che un modello sia stato caricato. Il commento di quella pausa
   diceva *«finche' non la riavvia l'utente dal bottone stesso o dal nostro
   PLAY»*: **il nostro PLAY non l'ha mai riavviata.** Metteva a posto i dati,
   toglieva il cartellino, e lasciava la barra ferma dov'era;
2. **`traj.duration` restava a 180 s**, la lunghezza della sequenza
   dimostrativa del bundle. `applyNodesToScene` sostituiva i fotogrammi e
   lasciava la durata dov'era. La barra conta i fotogrammi dalla durata
   (180 × 2 + 1 = **361**) davanti a 800 fotogrammi veri che arrivano a
   **399,5 s**. Anche facendola ripartire, con la durata vecchia la corsa si
   sarebbe fermata a meta' — e sarebbe sembrato un difetto ancora diverso.

**Sistemato:** il PLAY fa ripartire la barra **dopo** `applyNodesToScene`, non
prima (fatta ripartire prima correrebbe sui fotogrammi vecchi, cioe' su
un'altra simulazione), e la durata si prende dai fotogrammi stessi invece che
da un valore dichiarato.

Il bottone si riconosce come quello della pausa, dalla geometria esatta
dell'icona: il Play di lucide-react e' un solo
`<polygon points="6 3 20 12 6 21 6 3">` senza rettangoli. E' **lo stesso
bottone** che fa pausa, quindi quando lo mettiamo in pausa all'avvio ce lo
teniamo. ⚠️ Prima di cliccare si guarda quale icona porta: se c'e' gia' la
pausa la barra sta gia' correndo, e cliccarla la fermerebbe — lo stesso
difetto al contrario.

Esito misurato a schermo: da «0.1s / 180s · FRAME 0/361 · ATTIVI 0» a
**«6.6s / 400s · FRAME 13/800 · ATTIVI 28»**, con l'icona di pausa sul
bottone, cioe' in corsa.

### 🔴 IL PASSEGGERO NON PASSA SEMPRE SOTTO IL METAL DETECTOR — visto il 02/09

👁️ Raffaella, guardando la simulazione con gli ingressi a posto: *«i flussi
funzionano quasi bene, potrebbero essere ancora più precisi: il passeggero non
passa sempre sotto il metal detector»*.

E' la prima cosa che si vede **dopo** che gli ingressi sono giusti, ed e' un
difetto diverso da tutti quelli chiusi oggi: non riguarda **da dove** si parte
ne' **se** ci si muove, riguarda **per dove si passa**.

La causa sta nella natura della tappa: una tappa e' un **punto**, e il percorso
la tocca passandole vicino. Un varco di controllo non e' un punto: e' una
**soglia larga quanto il varco**, e passarci accanto non e' passarci dentro. Un
referto che dice «tutti controllati» mentre a schermo qualcuno gira attorno al
metal detector e' un numero che non regge alla prima domanda di chi legge.

⚠️ Da non risolvere spostando la tappa a mano: vale su questo modello e si
rompe sul successivo. La larghezza del varco e' gia' misurata (gli accessi
portano `larghezza`, e la stessa misura la fa `veritas_navmesh.js` sui
passaggi): la strada e' che una tappa di tipo **filtro** dichiari la sua
soglia — due capi e un verso — e che il percorso ci passi **dentro**, non
accanto.

### 🔴 LA REVISIONE DELL'INTERFACCIA INTERA — chiesta da Raffaella il 02/09

Guardando la cattura dello spazio di lavoro aperto sul progetto «Aeroporto —
banco di prova»: *«il nome del progetto non si vede, e le icone si sovrappongono.
Metti in lista un check della UI intera: potrebbero esserci vecchie impostazioni,
oppure la necessità di menù contestuali all'azione che l'utente sta svolgendo.
Più la UI è semplice e intuitiva meglio è, dando per scontato che deve offrire
tutto quello che stiamo progettando. Per esempio le domande dell'occhio non
trovano risposta in quella finestra: al massimo potremmo rispondere nella chat.
Preferisco che le palette stiano lateralmente, con la possibilità di espandersi
alla richiesta dell'utente.»*

Non e' una passata di stile: e' la stessa regola dei due lavori di oggi — **una
cosa deve dire quello che e', e deve stare dove serve.** Oggi lo spazio di
lavoro apre tutto insieme e sopra il modello: il pannello dei punti, «quello che
vedo», i dati di progetto, la barra di riproduzione, i comandi di vista. Il
modello, che e' l'unica cosa che si deve guardare, resta sotto.

✅ **Due pezzi gia' fatti il 02/09 (`5210b91`),** e sono l'esempio di come va
fatto il resto:

- **«✅ Zone pronte» non c'e' piu'.** 👁️ *«esce immediatamente, credo si possa
  eliminare, e non e' veritiero»* — vero: compariva appena c'erano due tappe, e
  all'apertura ce ne sono gia' sei, quelle cablate dentro il bundle. Ma non
  bastava toglierlo, perche' portava **l'unico bottone che avvia davvero la
  simulazione**. Quindi l'avvio si e' spostato **dentro la barra in basso**,
  accanto al ▶ del bundle (un posto solo per far partire le cose), e compare
  **solo quando lo spazio e' stato misurato davvero** — cioe' quando c'e' un
  modello **e** la navmesh costruita su di lui, che per le tappe demo non puo'
  esistere. ⚠️ Scoperto per strada: `veritas-play-ready-btn` stava
  nell'elenco dei «bottoni nativi del bundle da nascondere». Non era del
  bundle: era il nostro, e finiva nascosto insieme ai doppioni;
- **l'avviso del motore non copre piu' i tasti.** 👁️ *«si sovrappone a dei
  tasti che non si vedono e non so cosa siano»* — erano le linguette del bundle
  sotto la pillola del marchio: «Motore in risveglio (30-60s, piano gratuito)»
  scritto per esteso la allargava fino a coprirle. Resta il **pallino
  colorato**, sempre; la frase si legge passandoci sopra. L'informazione non si
  perde, smette di stare davanti a qualcos'altro.

Le quattro cose da fare, in ordine:

1. **le palette stanno di lato e si aprono a richiesta**, non tutte aperte sopra
   al modello. Chiuse sono una linguetta; aperte prendono una colonna, non il
   centro;
2. **i comandi seguono quello che si sta facendo.** Posizionare un punto,
   guardare un referto e far correre la simulazione sono tre momenti diversi, e
   oggi mostrano gli stessi venti comandi tutti insieme;
3. **una passata su cosa e' rimasto indietro.** Ci sono comandi e riquadri nati
   in sessioni vecchie che potrebbero non servire piu': si guarda uno per uno se
   risponde a una domanda che qualcuno si fa davvero;
4. **le domande dell'occhio si rispondono nella chat**, non in un riquadro di
   suo: sono una conversazione, e in una finestra separata restano senza
   risposta — come si vede oggi («giro 1 · 0 scatole viste», «il cervello non ha
   risposto»).

⚠️ Il vincolo, scritto: **deve offrire tutto quello che stiamo progettando.**
Semplificare qui non vuol dire togliere funzioni, vuol dire non mostrarle tutte
nello stesso momento.

#### L'inventario del 02/09 — sei voci guardate una per una

👁️ Raffaella, riepilogando: *«con tutte le cautele, ma dobbiamo ripulire la UI
e avere solo parti collegate e funzionanti»*. E' il criterio, ed e' piu' stretto
di «semplificare»: **ogni cosa a schermo deve rispondere a una domanda che
qualcuno si fa davvero, ed essere attaccata a qualcosa che funziona.** Una cosa
che non risponde a niente non si abbellisce: si toglie.

| | cosa | stato |
|---|---|---|
| 1 | l'elenco lunghissimo non si riusciva a ripulire | ✅ chiuso (`2406014`) — la cancellazione andava in una richiesta sola, indirizzo troppo lungo |
| 2 | «carica il file» compariva due volte | ✅ chiuso (`2406014`) — uno solo per volta, quello che sta chiedendo |
| 3 | FLUSSO, TRANSITO, ATTIVI, SATURAZIONE sempre a zero | ✅ chiuso — i quattro numeri sono **nostri** e dicono perché non rispondono |
| 4 | **la pillola VERITAS copre ancora le linguette** | 🔴 aperto — l'unico che ha bisogno della pagina davanti |
| 5 | i «pannelli avanzati» | ✅ chiuso (`f900f50`) — l'interruttore è stato tolto |
| 6 | le domande dell'occhio in un riquadro di suo | 🟠 metà — il testo non si vede più e il pannello si è spostato; **la chat resta da fare** |

**3 — com'è stato chiuso.** ⚠️ Quei riquadri stanno **nel blocco 3**, che per
regola non si tocca mai: non si potevano correggere, si potevano solo
sostituire. Lì dentro il flusso è «quanti **arrivano** al secondo» e il transito
è la media di chi **è arrivato**: se la traiettoria non dichiara mai un arrivo,
quei due numeri sono zero **per costruzione**, alla fine come all'inizio.
Adesso i riquadri del bundle si nascondono e al loro posto, **nello stesso
spazio**, vanno quattro numeri nostri con tre stati distinti — «non avviata»,
«nessun arrivo», il numero — e sotto ognuno la riga che dice che cosa misura.
⚠️ Se i riquadri del bundle non si trovano **non si mette niente**: sostituire o
lasciare stare, mai affiancare due file di numeri.

⚠️ E resta da capire **perché nessuno arriva**: a ogni traiettoria il log
adesso conta gli stati e stampa quanti agenti raggiungono `ARRIVED`. Se sono
zero lo dice per esteso. È la prima cosa da leggere alla prossima corsa.

**6 — che cosa è stato fatto e che cosa no.** Il diario delle domande non si
appende più al pannello ma **resta vivo** e riceve tutto
(`window.__veritasDiarioOcchio`): le immagini, gli interruttori e il selettore
delle viste restano, apri e chiudi restano. 👁️ Raffaella: *«un conto è il dato
che serve all'AI, un conto è quello che facciamo vedere all'utente»*. Il
pannello si è spostato dalla posizione in basso a destra — dove copriva la barra
del tempo e i numeri, con `z-index:99999` — alla colonna di destra sotto la
barra dei comandi, con `z-index:9100`. **La chat in linguaggio naturale resta da
fare, e ha bisogno del taccuino.**

**3 — i quattro riquadri a zero.** 👁️ *«a cosa servono, rimangono sempre
così»*. Sono i KPI della simulazione, e restano a zero finche' nessun agente
completa il percorso: il flusso e' «quanti arrivano al secondo», il transito e'
la media di chi e' arrivato. A simulazione ferma, o nei primi secondi, sono
onestamente zero. ⚠️ Ma **un numero che e' sempre zero non si distingue da un
numero rotto**, ed e' il difetto: non dicono se sono zero perche' e' presto,
perche' la simulazione non e' partita, o perche' non li sa calcolare. Devono
dire **quale delle tre**.

**4 — la sovrapposizione non e' finita.** La pillola adesso e' stretta (solo il
pallino) ma sta ancora **sopra** la fila delle linguette del bundle: e' appesa a
`top:16px`, la stessa riga. Ridurla e' servito, spostarla no: va **sotto** quella
riga, o le linguette vanno spostate. ⚠️ Da misurare con la pagina davanti, non a
occhio: sotto ci sono anche «GLOBAL · Top Down 80m» e «CONTROLLO · Dettaglio
Varco», e spostando alla cieca si copre un'altra cosa.

**5 — i pannelli avanzati.** Vanno guardati uno per uno e divisi in tre mucchi:
quelli **iniziali** (nati da una sessione vecchia e mai piu' usati), i
**doppioni** (la stessa cosa gia' raggiungibile altrove) e gli **ornamentali**
(non attaccati a niente). I primi due si tolgono, il terzo si toglie o si
collega. ⚠️ «Con cautela»: prima di togliere si guarda **chi lo chiama**, perche'
un riquadro muto puo' essere l'unica strada verso una funzione viva.

**6 — le domande dell'occhio non vanno in una finestra.** 👁️ *«queste domande in
questa finestra sono inutili, e invece serve avere la chat con AI in linguaggio
naturale funzionante»*. Oggi il riquadro «quello che vedo» fa domande
(«GUARDA LA FIGURA: i nomi stanno sopra le cose giuste?») a cui **in quella
finestra non si puo' rispondere**, e accanto dice «giro 1 · 0 scatole viste» e
«il cervello non ha risposto: Failed to fetch». Sono una **conversazione**, e
vanno nella chat — che pero' deve funzionare davvero, non essere un'altra
casella muta. ⚠️ Questa non e' ripulitura: e' la chat interrogabile, e si appoggia
al **taccuino** (punto 6 delle priorita'). Le due cose vanno insieme.

### 📌 LE PROVE VIAGGIANO COL RISULTATO — promesso in pubblico il 02/09

Il 02/09 il risultato di oggi e' stato pubblicato, e un commento tecnico
pubblico (Aviotix) ha centrato un buco vero. In sostanza: le tre cose giuste
sono **la corroborazione** (piu' voci che devono concordare), **l'astensione
esplicita** (una regola che si dichiara cieca invece di indovinare) e **il
vincolo fisico** (da un ingresso si deve poter entrare). Ma la salvaguardia che
manca e' che **il pacchetto di prove** — compresi i candidati scartati e la
ragione per cui una regola ha taciuto — **viaggi insieme a ogni ingresso
inferito, dentro ogni cosa che ne discende.** Altrimenti il risultato e'
spiegabile quando lo crei e indifendibile quando lo riusi. In pubblico e' stato
risposto che e' il prossimo lavoro: quindi sta scritto qui, altrimenti e' una
promessa che non sta da nessuna parte.

**Quello che c'e' gia', ed e' molto: il pacchetto esiste nel momento del
calcolo.** In `window.__veritasAccessi`, per ogni accesso:

| campo | cosa dice |
|---|---|
| `voci` | quali indizi l'hanno proposto |
| `affidabilita` | quante voci concordano |
| gli indizi | quanti sono, e quali |
| `raggiunge` | quanto spazio si tocca a piedi partendo da li' |

e accanto, **gia' scritte per esteso**: la lista degli **scartati col motivo**
(«una voce sola (...)», «da qui non si entra: si raggiunge il X% dello spazio»)
e le **voci mute con la ragione e il numero** — la voce del tetto su questo
modello tace, e lo dice cosi': 36 campioni coperti su 1.544.

**Quello che manca: non viaggia.** `veritas_flussi.js`, quando un accesso fa
nascere un flusso, costruisce una tappa fatta di
`{ label, type, origine:'accesso', pos, larghezza }` e basta. Affidabilita',
voci, scarti e silenzi restano indietro. Da li' in poi — la traiettoria, il
referto, il numero che finisce in una presentazione — **c'e' solo un nome.**

Le due cose da fare:

1. **la tappa che nasce da un accesso si porta dietro le sue prove**, non il
   solo nome;
2. **il flusso deve poter risalire all'accesso che l'ha generato**, e da li'
   all'intero pacchetto.

⚠️ **Le prove negative contano quanto le altre.** Gli scartati e le regole che
hanno taciuto sono esattamente la parte che viene contestata: quindi **non sono
righe di log, sono parte del referto.** Un referto che mostra solo cio' che ha
trovato e' un referto che nasconde come l'ha trovato.

Si lega al **punto 6 dell'elenco delle priorita'** — «il taccuino, cioe' il
referto interrogabile»: e' la stessa cosa, e questa ne e' la prima meta'.

⚠️ **Il limite, scritto perche' non si allarghi da solo:** non abbiamo firme,
catena di custodia ne' registro esterno, e **in pubblico non e' stato promesso
niente del genere.** Quello che si promette e' una cosa sola: **le prove
restano attaccate al risultato.**

### 🔴 UN PROGETTO SALVATO NON CONTIENE IL SUO MODELLO — misurato il 02/09

Detto da Raffaella dopo aver guardato che cosa viene salvato davvero: **un
progetto porta tappe, telecamere e parametri, e basta. Non c'e' nessun campo che
dica quale file sia.**

⚠️ Questo **cancella** la spiegazione scritta qui prima, ed era sbagliata: non e'
il caricatore automatico che cerca tre nomi di file inesistenti
(`./airport.glb`, `./Assets/models/airport.glb`, `./veritas_airport.glb` — quelli
sono un residuo, e c'e' gia' del codice apposta che li spegne). **Il modello non
torna perche' al progetto non e' mai stato attaccato.** Quando tornava, era la
cache del browser, non il progetto: ecco perche' ogni tanto c'era e ogni tanto no.

E non e' un fastidio da sviluppo. Un progetto di gemello digitale che non
contiene il suo spazio non e' un progetto: si riapre e l'edificio non c'e'. Lo
vede il primo cliente prima di noi.

Nel frattempo, per misurare senza pagina: **la parte JSON di un glTF porta gia'
gli ingombri e le matrici dei nodi**, quindi non serve nemmeno three — lo script
sta in `scratchpad/leggi_glb.mjs` e si rifa' in venti righe.

---

## 🚩 SI RIPARTE DA QUI — 01/09/2026, sera

**Dove siamo, in una tabella.** Sette commit oggi, tutti su `main`.

| pezzo | stato |
|---|---|
| le scale mobili nella navmesh | ✅ 4 collegamenti agganciati, **1 gruppo** invece di 2, le tappe restano ai loro piani |
| gli agenti dentro i muri | ✅ rientro sul calpestabile, misurato **98%** delle posizioni, e vale per **tutti e due** i motori |
| il piano su cui stanno | 🆕 scritto il 01/09 sera, **ancora da guardare a schermo**: la folla la fa il motore, la quota la mettiamo noi |
| più flussi insieme | 🟡 l'impianto regge N flussi, ma ne nasce ancora **uno**: manca chi glieli dà |
| gli accessi | ⏸ scritti e **spenti**: aspettano gli indizi, perché su uno spaccato la sola geometria sbaglia |
| i nomi in pianta | ❌ non compaiono ancora — è il punto 2 delle priorità |

**La riga da cercare al primo avvio:** `quote rimesse dai nostri piani: …
cambi di piano senza un collegamento`. Quel numero misura quanto il motore
piano stia ignorando i livelli, e va guardato prima di ogni altra cosa.

| commit | cosa |
|---|---|
| `c310e37` | le scale mobili entrano nella navmesh (§6-bis) |
| `f1dcfe8` | la prova sul modello vero: 4 collegamenti, un gruppo solo |
| `9ab1107` | la pagina live si prova da soli; a schermo si scende la scala |
| `da9acc7` | il motore tiene più di un flusso (l'idraulica) |
| `56409f7` | trappola: il modello non si carica dalla console |
| `7914058` + `ac82d7c` | il cammino ha l'ultima parola, e la scala si sblocca |
| `49fa69f` | la correzione era nel motore sbagliato: ora vale per tutti e due |
| `115705b` | la folla è sua, la quota è nostra |

**Le tre lezioni di oggi, e valgono oltre oggi:**

1. **Una cosa dichiarata non si indovina dai suoi effetti.** Riconoscere una
   scala mobile chiedendo «questo punto è calpestabile?» sembrava funzionare, e
   ai piedi della rampa il pavimento di sotto è lì a un passo: gli agenti
   restavano bloccati. Il collegamento si chiede a chi l'ha dichiarato.
2. **Prima di correggere un comportamento, si guarda quale dei due motori lo
   sta producendo.** Una correzione scritta nel ramo che non gira dà
   esattamente la scena di prima, e sembra che la diagnosi fosse sbagliata.
3. **Un modello più piccolo del vero fa sbagliare tutto quello che viene dopo,
   in silenzio.** Dopo ogni caricamento si guarda l'ingombro prima di credere a
   qualunque numero.

---

## 🚩 IL PUNTO 0 — com'era la mattina del 01/09/2026

**Testa: `a260eba` + questo commit. La cura del punto 0 è SCRITTA**, in
`veritas_navmesh.js` (nuova sezione 6-bis) e nella copia inlinata di
`index.html` — le due copie sono identiche riga per riga, verificato.

**La riga sola:** dove una superficie inclinata quanto basta a una persona
parte da un livello misurato e arriva a un altro, lì i due livelli si
collegano, e il collegamento si dichiara a navcat con `addOffMeshConnection`.

✅ **MISURATO SULLA PAGINA LIVE, sul modello vero, subito dopo il commit.**
Non è più una prova al banco:

| cosa | misura |
|---|---|
| livelli letti dalle isole | **3**: +0,70 m (3.845 m²) · +3,70 m (710 m²) · +6,25 m (155 m²) |
| collegamenti dichiarati e **agganciati** | **4**: `Cube062_0/_2` e `Cube195_0/_2` — le due scale mobili, ognuna in due pezzi di mesh. Dislivello 2,90 m, pendenza 26°, riempimento 100% |
| scartati, col loro motivo | `Plane001_8` 9% · `Rudder_0` 23% · `Part290001_0` larga 15 cm. Sono aerei, e cadono da soli |
| terra ↔ primo piano | `gruppiCollegati` → **1 gruppo** (era 2). Percorso vero: 38 m, 34 punti, non parziale, finisce a +3,64 m |
| dove stanno le tappe | **5 su 7 restano a +3,64 m** (erano 0 su 7), una nasce e resta al terra |

La settima nasce a x ≈ −90, su un'isola staccata che è un pezzo d'aereo, e
viene spostata nella sala: quella è un'altra questione, e non è questa.

👁️ **E SI VEDE A SCHERMO.** Raffaella, 01/09, guardando la simulazione: *«per
la prima volta sono scesi dalla scala mobile e sembrava arrivassero dall'aereo
a destra, e poi risalgono a sinistra per partire»*. Sono i due versi di un
aeroporto — chi arriva e chi parte — e nessuno li ha scritti: escono dalla
geometria e dai collegamenti. È anche la conferma delle frecce del modello, che
salgono la scala mobile.
⚠️ Resta vero che **in pianta i nomi non ci sono ancora**: è l'accoppiamento
nome→tappa a parità di piano, che è il prossimo lavoro qui sotto.

Al banco restano provati anche i casi che devono FALLIRE, su sette figure
costruite a mano: passano la scala mobile (anche messa in diagonale) e lo
scalone monumentale; falliscono aereo (riempimento 14%), ala, piastra piatta e
passerella da 40 cm.

**Un errore trovato scrivendo, che vale oltre oggi:** la direzione della salita
non è l'asse più lungo. Uno scalone monumentale è largo 10 m e lungo 5, e
misurando lungo il lato lungo saliva 18 cm invece di 3 m — spariva. Si legge
dalla media delle normali delle facce, pesata sull'area.

### 🔴 IL MOTORE REALE È UN MODELLO PIANO — scoperto il 01/09 sera

Misurato leggendo la traiettoria in esecuzione: **2.240 posizioni campionate,
zero sopra i due metri**, mentre le tappe da cui gli agenti nascono stanno a
+3,64 m e a quella quota gli vengono mandate. Non è che scendevano male dalla
scala mobile: **al piano di sopra non ci sono mai stati.** È il «solo 1 è sceso
correttamente» visto da Raffaella.

Il Social Force Model su Render lavora **in due dimensioni**: spinge, evita, fa
le code — e quelle cose le fa bene — ma un edificio a due piani lo schiaccia in
uno. Non è un difetto da riparare nel motore: è quello che quel modello è.

**La cura, ed è la stessa regola di tutta la giornata: la cosa dichiarata la sa
chi l'ha dichiarata.** Al motore si chiede quello che sa fare — come si muove
la gente in pianta — e **il piano su cui sta lo rimettiamo noi**
(`veritasRiportaSuiPiani`). La regola è la continuità: una persona parte dal
livello della tappa da cui è nata e lo cambia **solo lungo un collegamento
dichiarato**, dove la quota la dà il collegamento stesso. Dove il suo piano non
c'è più si prende quello che c'è **e si conta**: quel numero, nel log, è la
misura di quanto il motore piano stia ignorando i livelli.
⚠️ L'ordine conta: prima la quota, poi il rientro sul calpestabile. Al
contrario ci si aggancia al pavimento del piano sbagliato e ci si resta.

🔴 **Le tre cose che questo documento affermava e che sono FALSE.** Erano il
vero ostacolo: tenevano lontani dalla riparazione più di quanto facesse il
codice.

| il documento diceva | la misura dice |
|---|---|
| «le frecce colorate le disegna VERITAS, darle al cervello è specchiarsi» | sono **36 mesh `arrow*` dentro il GLB**, tre flussi, e due **salgono la scala mobile** |
| «le isole a 3,6 m di 329, 138 e 71 m² sono le ali» | stanno **dentro il terminal, sopra il piano terra**: sono il **piano superiore** |
| «il modello ha due piani e il sistema ne vede uno» | ne vede **due**, li misura e li stampa: sono le **tappe** a non arrivarci |

E una quarta, che è una scelta da rivedere più che un errore: le **226 sagome
umane** (164 al piano di sopra) sono messe in quarantena come «controprova» e
non contano come indizi. L'occhio le capisce; è il sistema che non le ascolta.

⚠️ **Detto da Raffaella il 31/08, ed è la direzione:** *«noi ci dobbiamo
occupare di semantica e lettura di segni e spazi tridimensionali. La missione
è più profonda.»* Le sagome e le frecce **sono indicatori di flusso messi da
chi ha fatto il modello**, non rumore da scartare. La segnaletica semantica
sale da 🟡 a 🔴 (punto 5 dell'elenco).

**Il primo lavoro della prossima sessione**, in ordine, sta scritto nel punto 0
sotto «LA CURA È GIÀ STATA PROVATA». Non serve rifare nessuna diagnosi.

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

⚠️ **CHE COSA NON E' ANCORA RISOLTO, ed e' il lavoro numero uno.** I NOMI ora
vengono dall'occhio. I **RUOLI** no. `type` (origine / accoglienza / filtro /
sosta / destinazione) lo decide ancora `applyAutoAssignment` in `index.html`
riga ~3492 ordinando le zone per la X, prima che qualcuno guardi — e la
simulazione legge i ruoli, non i nomi. Finche' e' cosi' **l'occhio nomina ma
non comanda**, e la garanzia del punto 3 scattera' spesso, scrivendolo ogni
volta nel log. Quando i ruoli verranno dal riconoscimento, si spegnera' da sola.

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

### 🎯 A COSA SERVE VERITAS — le tre cose che fa, e chi fa cosa

Detto da Raffaella il 31/08, perché non era mai stato messo per intero in un
posto solo. Vale come direzione, non come commento.

La piattaforma è **agnostica** — qualunque edificio, qualunque modello, anche
uno spaccato o un pezzo — e fa **tre cose, in quest'ordine**:

1. **Capire a fondo il modello.** Prima dichiara **che cosa ha davanti nel suo
   insieme** (una chiesa, una scuola, un ospedale, un pezzo d'aeroporto), poi
   dice che spazio è ogni ambiente. Gli **oggetti che vede dentro sono gli
   indizi** da cui deduce la funzione degli spazi: le sedute in fila fanno la
   sala d'attesa, le macchine fanno il parcheggio, i letti la degenza.
2. **Generare i referti che l'utente chiede**, in base alle sue domande, non a
   un elenco fisso deciso prima.
3. **Dare un compito agli agenti** e farglielo svolgere dentro il modello.

**Chi fa cosa, e non si scambia:**

> **L'occhio comanda e dà i nomi** a ciò che vede.
> **Il cervello misura e certifica.**

⚠️ Finché il **ruolo** di uno spazio lo decide una regola di posizione
(`applyAutoAssignment`, ordinamento per la X) invece dell'occhio, questa
divisione è violata. È il difetto aperto al 31/08, ed è il punto 6 dell'elenco
qui sotto.

**La chat è in italiano normale** e serve all'utente per **interrogare il
modello**: quanti banchi servono, cosa si vede da dove, quant'è largo quel
corridoio, dove si formano le code. Non è una riga di comando, e non risponde a
memoria: risponde dal registro di ciò che è stato misurato.

⚠️ **Il vocabolario semantico di riferimento non si inventa e non si copia.**
Se serve più semantica per aiutare il riconoscimento si prendono raccolte
libere e citabili — **Uniclass 2015 tabella SL** (gratuita, ISO 12006-2, in CSV
su GitHub, `buildig/uniclass-2015`) è la prima, ed è la stessa con cui si
classificano gli oggetti IFC. Neufert e i manuali editoriali no: sono opere
protette e in un prodotto che si vende diventano un problema legale.

### 📍 STATO AL 31/08 sera — cosa e' cambiato oggi

Testa: `e42c3fb`. Tre commit, tutti additivi, nessun ramo nuovo.

**`d371820` — la direzione di prodotto, scritta.** La sezione "A COSA SERVE
VERITAS" qui sopra. Non c'era.

**`71f3111` — il ruolo capito arriva alle tappe.** Era il difetto che Raffaella
descriveva come «l'occhio vedeva bene ma non veniva tradotto in
un'autoassegnazione intelligente». `tipoDiFunzione` torna una STRINGA e i tre
chiamanti leggevano `.tipo` su di essa, cioe' `undefined`: al ponte arrivava un
ruolo vuoto, e `a.tipo || n.type` teneva ogni volta il ruolo messo per posizione
da `applyAutoAssignment`. Aggiunta `funzioneDi(chiave)` che torna la voce intera;
i tre chiamanti usano quella. `corridoio` passato da `passaggio` (ruolo che il
motore non conosce) a `distribuzione` (che conosce).

**`e42c3fb` — buttata la risposta uniforme.** Nel log: «ho riconosciuto 4 zone
su 7: parcheggio, parcheggio, parcheggio, parcheggio», e le rinominava davvero,
prima che parlasse il circuito completo. `validaRisposta` ora scarta l'intera
risposta quando le zone lette sono almeno tre e hanno tutte la stessa funzione.

**COSA DICE IL LOG DEL 31/08, letto per intero — due paure rientrate:**

1. **Le 4 zone della geometria non esistono.** Quella corsa ha misurato 7
   ambienti separati da varchi reali su 2 livelli, 6340 m2 calpestabili, e il
   circuito ha capito **22 volumi su 23, fiducia 74%**, in 2 giri. Il "4" era
   l'occhio della sola pianta. Nessuna regressione da indagare.
2. **Gli agenti CAMMINANO** — detto da Raffaella e confermato dal log: la
   traiettoria dal motore remoto viene accettata e usata, 800 frame, 27 punti.

**Cosa resta rotto nel log, in ordine:**
- `[VERITAS corpo] non applicato: errore nel motore fisico` — sempre allo stesso
  punto, `nascitaLibera/dentroUnSolido`, fotogramma 0-1. Due errori diversi:
  `memory access out of bounds` e `recursive use of an object detected which
  would lead to unsafe aliasing in rust`. Il secondo e' la firma di una query
  Rapier chiamata DENTRO la callback di un'altra query sullo stesso world.
  Il movimento c'e' lo stesso: e' il corpo fisico che non si applica.
- `tappe: 0 appoggiate sul pavimento, 1 gruppi raggiungibili`; navmesh in **32
  parti separate**.
- OWLv2 non si apre in nessun formato (webgpu q4f16/fp16/q8, wasm q8/fp32):
  `Provider type for Cast node '/class_head/Cast' is not set`. Si passa
  all'occhio di riserva (qwen2.5-vl-7b), i cui riquadri non sono confrontabili
  con le misure di OWLv2.
- `backend non raggiungibile` a intermittenza su Render (cold start).

### Cosa resta aperto, in ordine di importanza

0. 🔴 **IL MODELLO HA DUE PIANI E NESSUNO CI SALE.** Detto da Raffaella
   il 31/08 guardando la simulazione: *«l'AI guarda solo un piano, la quota
   zero, e non il piano superiore: fino a oggi non ho mai visto un passeggero
   salire seguendo la scala mobile».* Non è un dettaglio del movimento, è una
   cosa che rompe **tutti e tre** i mestieri di VERITAS insieme, ed è per
   questo che sta in cima:
   - **la comprensione**: la pianta è UNA vista dall'alto, e da lì i due
     livelli si sovrappongono. Un volume al primo piano e uno al terra cadono
     sullo stesso punto in pianta e diventano indistinguibili. È la ragione
     per cui il fronte 4 (sezioni e piante di piano) non è una rifinitura;
   - **il referto**: un'attesa al terra e una al primo non sono la stessa cosa
     per esodo e affollamento, e oggi il livello non è nemmeno un campo;
   - **la simulazione**: se le persone non salgono, metà edificio non viene
     mai attraversato e ogni numero che ne esce è calcolato su metà modello.
   ✅ **SEPARATE IL 31/08 SERA, MISURANDO SULLA PAGINA LIVE. Vince la (b):
   il sistema HA CAPITO che c'è un piano sopra, e sono le TAPPE a non
   arrivarci.** La (a) è esclusa: la comprensione dei due livelli c'è già e
   funziona. I numeri, letti dalla simulazione in esecuzione:

   | cosa | misura |
   |---|---|
   | piani riconosciuti | **2** — piano 0 a +0,77 m, piano 1 a +3,64 m |
   | zone misurate | 7: **una** al terra (5.261 m²), **sei** al primo (942 + 44 + 12 + 27 + 23 + 31 m²) |
   | dove le tappe sono NATE | **6 su 7 a +3,64 m** (`posMisurata`), 1 a +0,77 m |
   | dove le tappe STANNO ora | **7 su 7 a +0,79 m** — tutte al piano terra |
   | isole della navmesh | 32; fra la zona del terra e quella del primo: **2 gruppi, nessun percorso** |

   Il piano sopra non è un'ala d'aereo: la zona da 942 m² sta a (-48, -4),
   cioè **sopra** la sala del terra che sta a (-43, -2). Le altre cinque,
   piccole e spostate a x ≈ -90, sono i tubi d'imbarco e i pezzi degli aerei.

   **Dove si perde, esattamente.** Le tappe nascono giuste, al piano giusto.
   Poi il passo che le rende raggiungibili a piedi (`index.html` ~3048) chiede
   alla navmesh in quanti gruppi cadono, trova che stanno su isole scollegate,
   e siccome il gruppo principale non regge metà delle tappe ripiega:
   `appoggiaTappe` / `catenaCamminabile` le rimettono **tutte sull'isola più
   estesa**, che è il piano terra. Sei tappe scendono di 2,85 m e il primo
   piano resta senza una sola tappa. Si riconosce dal loro `origine`, che
   diventa `cose` o `cammino` — i due nomi che solo quel ripiego assegna.

   **Perché le due isole non si toccano: le due scale mobili non sono nella
   navmesh.** Nel GLB non hanno un nome — ⚠️ `ElevatorL/R` e `Aileron` sono
   le code e gli alettoni degli aerei, non ascensori: chi le cerca per nome
   trova quelli e sbaglia strada. Sono `Cube062` e `Cube195`, a (-34, -0,6) e
   (-34, +10,5): due rampe di **7,2 × 1,2 m** che salgono da +0,65 a +3,75,
   pendenza **23-29°**, sotto i 35° ammessi, con ~20 m² di superficie ad
   angolo camminabile ciascuna. La geometria c'è ed è buona. Ma campionando la
   rampa lungo la salita la navmesh risponde «calpestabile» solo in basso — e
   lì aggancia il pavimento sotto, 1,89 m più giù — e **«non calpestabile»
   da +3,7 m in su**: la rampa non c'è.
   ⚠️ Ipotesi da provare per prima, NON ancora verificata: la rampa è larga
   1,2 m fra due balaustre piene; erosa del raggio della persona (0,30 m per
   lato) resta una striscia di 2-4 celle da 15 cm, cioè **sotto
   `minRegionArea` (176 celle ≈ 4 m²)**, e viene buttata come isola troppo
   piccola. Si controlla abbassando `isolaMinimaM2` **solo per la prova**: se
   la scala compare, è quello. La risoluzione non è il problema — cella
   0,151 m, `grossolana: false`.

   **La riparazione è nel GRAFO, non nelle sezioni.** Il fronte 4 (piante di
   piano) resta utile per la comprensione e per il referto, ma **non è quello
   che impedisce di salire**: partire da lì era la giornata che questo punto
   avvertiva di non spendere.

   ### ✅ SCRITTA IL 01/09 — dove sta, e cosa resta da guardare

   `veritas_navmesh.js` §6-bis e la stessa identica copia in `index.html`:
   `livelli()` (raggruppa le quote delle ISOLE), `superficiInclinate()` (cerca
   mesh per mesh le facce fra 5° e la pendenza di una persona),
   `misuraInclinata()` (asse della salita, riempimento, i due capi) e
   `collegamentiVerticali()` (i quattro filtri, poi `addOffMeshConnection` e la
   verifica `isOffMeshConnectionConnected`: se non si aggancia si toglie e si
   conta). Chiamate da `costruisciDaScena` subito dopo le isole; il log dice
   sempre quanti livelli ha visto e se qualcosa li collega.
   ✅ **Misurato sulla pagina live: 4 collegamenti agganciati, 1 gruppo invece
   di 2, cinque tappe restano al piano di sopra.** I numeri stanno in cima.

   ### ✅ LA CURA È GIÀ STATA PROVATA SULLA PAGINA LIVE — si scrive, non si cerca

   Eseguito il 31/08 sera nella console della simulazione, sul modello vero:

       prima:  gruppiCollegati([terra, sopra]).quanti  ->  2
       addOffMeshConnection(navMesh, {start: basso, end: alto,
             radius: 1.5, direction: BIDIRECTIONAL, flags: 1, area: 0})
       isOffMeshConnectionConnected(navMesh, id)       ->  true
       dopo:   gruppiCollegati([terra, sopra]).quanti  ->  1

   **I due piani diventano uno spazio solo.** E non serve toccare
   l'appiattimento: il ripiego di `index.html` ~3048 scatta solo quando
   `g.quanti > 1`. Con un gruppo solo **non parte proprio**, le sei tappe
   restano a +3,64 m e il piano di sopra resta popolato. Un difetto chiuso
   senza toccare il codice che lo produceva.

   ⚠️ **navcat ha già lo strumento: `addOffMeshConnection`,
   `removeOffMeshConnection`, `isOffMeshConnectionConnected`,
   `OffMeshConnectionDirection`.** È il meccanismo con cui Recast/Detour
   dichiara scale, scale mobili e salti da vent'anni. **Non si scrive a mano.**

   ⚠️ **Trappola che è costata un tentativo:** la rampa sale verso **−X**. Se
   si presume il verso invece di leggerlo dalla geometria, il capo alto cade
   dove il piano di sopra non c'è, si aggancia al pavimento di sotto e il
   risultato è un falso «già collegati, 1 gruppo». Il verso si legge dalla
   **mediana delle quote ai due capi dell'asse lungo**, sempre.

   ### La regola da scrivere, ed è GEOMETRICA — vale per qualunque edificio

   Regola 0-bis rispettata: nessuna parola di tipologia, nessun nome di mesh,
   nessun numero tarato su questo modello. I limiti sono le misure della
   `PERSONA` (raggio 0,30 · gradino 0,40 · pendenza max 35°), che vengono da
   riferimenti pubblicati.

   > Dove una superficie inclinata quanto basta a una persona **parte da un
   > livello misurato e arriva a un altro**, lì i due livelli si collegano.

   I filtri, e sono stati **provati anche sui casi che devono FALLIRE**:

   | filtro | perché |
   |---|---|
   | larghezza ≥ 2 × raggio | ci deve passare una persona |
   | i due capi entro un `gradino` da due livelli **diversi** | parte da un piano e arriva a un altro |
   | superficie inclinata (5°…pendenzaMax) ≥ **50% dell'impronta** | è una rampa, non un oggetto grande che spazia in altezza |
   | il collegamento **si aggancia** (`isOffMeshConnectionConnected`), altrimenti si toglie e si conta | mai dichiarare un passaggio che non c'è |

   Misurato, riempimento = inclinata / impronta: **rampa vera 87%** ·
   aereo 9% · ala 8% · piastra piatta 0%. Separazione netta.
   ⚠️ Il riempimento è preferibile al rapporto lunghezza/larghezza, che
   boccerebbe uno **scalone monumentale** — largo 10 m e lungo 5 — cioè
   proprio una chiesa o un museo.

   ⚠️ **I livelli si ricavano raggruppando le quote delle ISOLE, non
   l'istogramma delle quote.** Provato: le bande a mezzo metro l'una
   dall'altra si incatenano e finiscono per unire il mezzanino con la coda di
   un aereo sei metri più su. Con le isole vengono puliti: 0,75 · 3,7 · 6,2.

   ### Poi, in quest'ordine

   1. **il livello come campo della tappa.** Oggi non ce l'ha: la zona lo sa
      (`floorIdx`), la tappa lo perde per strada. Serve al referto — un'attesa
      al terra e una al primo non sono la stessa cosa per esodo e affollamento.
   2. **l'accoppiamento dei nomi a parità di piano** (vedi qui sotto).
   3. **la sentinella:** un livello con sagome umane sopra che resta
      irraggiungibile va **dichiarato**, non appiattito in silenzio. Con questo
      modello avrebbe gridato mesi fa: *164 persone su un piano dove non sale
      nessuno*.
   4. **le frecce del modello come conferma**: `arrow013_0` (quota 2,10, in
      mezzo alla rampa) e `arrow014_0` (quota 4,12, in cima) dichiarano il
      passaggio verticale. La geometria trova la rampa, i segni confermano.

   **E QUI SI SPIEGA ANCHE IL «3 TAPPE SU 7 RINOMINATE».** È lo stesso piano
   di troppo. L'accoppiamento nome→tappa (`applicaNomi`, `veritas_montaggio.js`)
   misura la distanza con `distanzaXZ`: **solo in pianta, la quota non entra
   nel confronto.** Ma la zona del primo piano e quella del terra si
   sovrappongono quasi esattamente in pianta — 5,4 m fra i due centri, dentro
   il raggio di entrambe. Due spazi diversi, uno sopra l'altro, sono lo
   **stesso punto** per chi confronta in pianta: si contendono gli stessi
   volumi capiti, la prima tappa che arriva se li prende, e le altre restano
   «Zona 4 · 541 m²» pur avendo volumi nominati proprio sotto. Aggiungere il
   livello alla tappa (punto 3 qui sopra) e confrontare **a parità di piano**
   chiude i due difetti con un lavoro solo.
   ⚠️ E c'è una causa a monte, ed è l'unica parte di questo punto che il
   fronte 4 riguarda davvero: i 22 volumi il cervello li capisce dalla
   **pianta**, che è UNA vista dall'alto. Un volume visto lì non ha un piano,
   perché i due livelli sono sovrapposti nell'immagine. Finché la vista è una,
   il livello di un volume capito non è deducibile: si può solo **ereditare
   dalla zona misurata**, che il piano lo sa.

1. **I FLUSSI: il programma ne teneva UNO SOLO. Ora ne tiene più di uno.**
   Detto da Raffaella il 01/09: *«l'AI ha messo l'origine correttamente vicino
   al tunnel che collega aereo e terminal, ma quello è il flusso in arrivo, ed
   è uno solo. Dovrebbe assegnare anche l'ingresso dalla strada: occhio e
   cervello riconoscono l'aeroporto e assegnano TUTTI i flussi che si generano,
   non solo uno.»* Non sbagliava l'occhio: **non c'era dove metterlo.** Dentro
   `generateTrajectory` tre righe decidevano tutto — `find` prendeva la PRIMA
   accoglienza, il PRIMO filtro, la PRIMA sosta, gli stessi per tutti.

   **La regola generale, e non è una parola di tipologia:** un flusso nasce a
   ogni **modo di entrare dal fuori**. Qui sono due — la strada delle macchine
   e il tunnel dell'aereo. In una scuola il cancello e il cortile; in un
   ospedale il pronto soccorso e l'ingresso normale, che sono due flussi con
   due versi diversi. Il verso e l'ordine li danno le cose che stanno in mezzo,
   e l'occhio quelle le vede già: i portali di sicurezza si attraversano in un
   senso solo, i banchi dei documenti stanno prima, le sedute in fila e i
   chioschi sono la sosta. E il modello lo sta già dicendo: le sue frecce sono
   **tre flussi**, e due salgono la scala mobile.

   I tre passi, e il primo è idraulica:
   1. ✅ **fatto il 01/09** — `veritas_flussi.js` (+ copia inlinata, blocco 23).
      Un flusso è `{ nome, tappe, quota }`, il motore ne percorre più di uno e
      ogni gruppo fa il suo. ⚠️ Oggi ne costruisce **esattamente quanti ne
      faceva prima** — uno per coppia ingresso-uscita, stesso accoppiamento,
      stessa immagine a schermo: un rifacimento che cambia anche l'immagine non
      si sa più se ha funzionato. Il guadagno è `imposta()`, la porta da cui
      entrano i due passi seguenti.
   2. **gli ACCESSI — geometria PIÙ indizi.** `veritas_accessi.js` è scritto e
      **spento apposta**. La regola geometrica è «dove il tetto finisce e si
      continua a camminare»: si guarda in su da ogni punto calpestabile, se
      c'è qualcosa sei dentro, se c'è il cielo sei fuori, e la soglia è dove i
      due si toccano. ⚠️ Ma Raffaella, 01/09: *«questo modello è uno SPACCATO,
      ma ci sono gli indizi che ti dicono da dove si entra: sì
      all'architettura, ma + indizi visivi + segnaletica + persone +
      oggetti»*. Su uno spaccato il tetto manca dove il modello è tagliato, e
      la sola geometria troverebbe una fila di ingressi lungo il taglio.
      Gli indizi, e ognuno vale come voce: il tetto che finisce · la
      **segnaletica** del modello (frecce e cartelli sono messi da chi l'ha
      disegnato) · le **persone** già modellate (dove stanno in fila c'è una
      porta o un banco) · gli **oggetti** (le macchine stanno fuori, i tunnel
      attaccano un aereo all'edificio, i tornelli stanno su una soglia).
      **Un accesso è dove più indizi sono d'accordo, e quanti sono d'accordo è
      la sua affidabilità** — il numero da mettere nel referto.
   3. **l'ORDINE dentro ogni flusso**, dagli indizi che l'occhio riconosce fra
      i due capi — controlli, banchi, sedute, chioschi.

   ### L'ordine di priorità, deciso il 01/09

   Detto da Raffaella: *«metti in ordine di priorità»*, e sulla domanda
   dell'algoritmo predittivo la risposta è **no, non per i percorsi**. Quanti
   flussi ci sono e dove vanno non è una previsione, è una **lettura**: gli
   accessi, i controlli e le mete stanno nel modello e si misurano. Un modello
   che indovina i percorsi dà numeri indifendibili, e il referto si vende. Il
   predittivo serve più in basso e in due punti soli — **quanti vanno di qua e
   quanti di là**, e **come si muove il singolo nella folla** — e lì si usano
   modelli pubblicati e citabili (forze sociali di Helbing, RVO/ORCA per
   l'evitamento, teoria delle code ai controlli), non una scatola nera.

   | | cosa |
   |---|---|
   | 🔴 1 | gli accessi → i flussi principali (geometria + indizi) |
   | 🔴 2 | il livello sulla tappa, e i nomi accoppiati a parità di piano |
   | 🟠 3 | il comportamento legato alla funzione: ci si siede, si fa la coda |
   | 🟠 4 | quanti vanno di qua e quanti di là — qui entra il predittivo |
   | 🟡 5 | l'evitamento vero fra le persone al posto del serpeggio finto |
   | 🟡 6 | il taccuino, cioè il referto interrogabile |
   | 🟠 7 | **la revisione dell'interfaccia intera** — pannelli laterali che si aprono a richiesta, comandi legati a quello che si sta facendo (dettaglio nel blocco del 02/09) |
   | 🟠 8 | **il passeggero passa DENTRO il varco, non accanto** — le tappe si toccano, il filtro va attraversato (dettaglio nel blocco del 02/09) |

1-bis. **La fila unica `origine → accoglienza → filtro → sosta → destinazione`.**
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
6. **I RUOLI non vengono ancora dall'occhio — è il lavoro numero uno.** I nomi
   sì (`4b2290a`, `462b1192`, `7c87b66`), `type` no: lo decide
   `applyAutoAssignment` in `index.html` riga ~3492 ordinando le zone per la X,
   prima che qualcuno guardi. La simulazione legge i ruoli, non i nomi: finché
   è così l'occhio nomina ma non comanda, e a schermo il divario si vede
   esattamente come lo ha visto Raffaella — pianta giusta, movimento no.
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
«Ingresso / Parcheggio» sull'ala di un aereo, a quota 3,64 m.

> Un'ala d'aereo e un mezzanino sono **geometricamente identici**: superficie
> orizzontale, larga qualche metro, a tre metri e mezzo da terra, senza niente
> sopra la testa. Nessuna misura li distingue. **Mai.**

Chi aggiunge "una soglia in più" sta ricominciando il ciclo di dieci giorni.

🔴 **CORREZIONE 31/08, e questo paragrafo lo dimostra da solo.** Fino a oggi
qui c'era scritto: *«quella navmesh ha isole a 3,6 m di 329, 138 e 71 m². Sono
le ali.»* **È FALSO, ed è stato misurato.** Quelle tre isole stanno a
x −58…−38, cioè **dentro l'impronta del terminal, esattamente sopra il piano
terra**: sono il **PIANO SUPERIORE**. Le ali e i pezzi d'aereo sono altre
isole, da ~45 m², a x −90…−105. A quota 3,6 m ci sono **tutte e due le cose**,
e questo documento le aveva confuse chiamandole tutte ali.

Il danno è durato giorni: il piano di sopra dell'edificio era stato
catalogato come rottame d'aeroporto, quindi non c'era niente da spiegare.
⚠️ E la lezione qui sopra ne esce **rafforzata, non smentita**: proprio perché
nessuna misura distingue un'ala da un mezzanino, chi prova a deciderlo
guardando solo la geometria sbaglia — e ha sbagliato. Si distinguono
**leggendo i segni**: sul piano superiore ci sono 164 sagome umane in piedi e
ci arrivano le frecce del modello. Su un'ala non c'è nessuno.

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
| runtime completo | `index.html` (~1,9 MB, **34** blocchi `<script>` dal 01/09: prima 33) |
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

**🔴 LA PAGINA LIVE SI PROVA DA SOLI — dal 01/09 non si incolla più niente.**

Claude ha una finestra browser dentro Claude desktop: apre
`https://raffaella23.github.io/Veritas-spatial-ai/`, **il modello si carica da
solo**, e da lì legge la console e interroga il programma. Non serve più che
Raffaella copi il log: si guarda da soli, e si torna con i numeri.
⚠️ Da fare sempre PRIMA di dire che una cosa funziona. Il 01/09 questa modalità
ha trasformato un «provato al banco, da guardare sulla pagina» in una misura
vera in tre domande.

🔴 **TRAPPOLA, pagata il 01/09: il modello NON si carica dalla console.**
Infilare il GLB nell'`input[type=file]` con un `DataTransfer` sembra funzionare
— il modello compare — ma **salta la scala automatica del blocco 2**. Misurato:
l'aeroporto entrava 20 × 11 m invece di 145 × 76, la navmesh trovava 23 m²
calpestabili invece di 6.340, e le sagome umane, che erano giuste (0,82 m),
sembravano giganti. Raffaella l'ha visto subito e ha detto «hai modificato la
scala uomo/modello»: era il modello, non la scala.
**Il modo giusto:** aprire un progetto che ha già il suo modello dentro, oppure
farlo caricare dal pulsante. E la prima cosa da guardare dopo un caricamento è
sempre l'ingombro: `new THREE.Box3().setFromObject(window.__veritasModelRoot)`.

**Come si fa, in pratica.** Si aprono le domande a mazzi con `browser_batch`
— navigare, aspettare, leggere console, interrogare la pagina — in una chiamata
sola invece di una alla volta: è la differenza fra una verifica che costa un
minuto e una che costa venti. `read_console_messages` con un filtro
(`VERITAS cammino|VERITAS bridge`) dà il log in diretta; `javascript_tool`
interroga il programma e **misura da solo** invece di credere a quello che si è
appena scritto.
⚠️ La pagina viene servita dalla cache del browser: dopo un `git push` si apre
`index.html?v=<numero diverso ogni volta>`, altrimenti si guarda il codice
vecchio e si conclude che la correzione non ha funzionato. Costato una volta.

🔴 **E il `?v=` NON basta per i moduli esterni** (`veritas_accessi.js`,
`veritas_montaggio.js`): ognuno ha la sua cache, e resta quello di prima anche
con index.html rinfrescato. Costato una verifica intera il 02/09. Due modi:
il tag porta il suo numero (`src="./veritas_accessi.js?v=4"`, **e si cambia a
ogni modifica del modulo**), oppure, per una prova al volo senza ricaricare:

```js
const M = await import('./veritas_accessi.js?fresh=' + Date.now());
M.trova(window.THREE, window.__veritasModelRoot, window.__veritasNavmesh);
```

**La quarta domanda, da quando ci sono gli accessi:**

```js
// da dove si entra, con quante voci d'accordo e quanto spazio raggiunge
window.__veritasAccessi.accessi.map(a => [a.nome, a.affidabilita, a.voci, a.raggiunge]);
window.__veritasAccessi.voci        // chi ha parlato, chi e' MUTA e perche'
(window.__veritasFlussiCorrenti || []).map(f => f.nome);   // quanti flussi ne nascono
```

🔴 **LA DOMANDA ZERO, PRIMA DI OGNI ALTRA: quale motore sta girando?**
Le traiettorie arrivano da due posti — il **motore reale** su Render (Social
Force Model) e il **generatore JS locale** dentro `index.html` — e il riquadro
in alto lo dice sempre. Il 01/09 una correzione è stata scritta nel generatore
locale mentre girava quello reale: il difetto era riparato e continuava a
vedersi identico, come se la diagnosi fosse sbagliata. **Correggere il ramo che
non sta girando dà esattamente la scena di prima.** La riga da cercare:

    [VERITAS bridge] traiettoria remota ACCETTATA e in uso al posto di quella locale

Le tre domande che valgono per qualunque lavoro sul cammino:

```js
// 1. cosa ha capito la navmesh: livelli, collegamenti agganciati, scarti col motivo
window.__veritasNavmeshEsito     // .ok .isole .livelli .collegamenti

// 2. due punti si raggiungono a piedi? (uno al terra, uno al piano di sopra)
window.__veritasNavmesh.gruppiCollegati([[-43, 0.79, -2], [-48, 3.64, -4]]).quanti

// 3. dove stanno le tappe, e dove erano NATE
window.__veritasGetNodes().map(z => [z.label, z.type, z.pos[1], z.posMisurata && z.posMisurata[1], z.origine])
```

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

5. 🔴 **LA SEGNALETICA SEMANTICA — promossa il 31/08, ed è la missione, non
   una rifinitura.** Detto da Raffaella: *«noi ci dobbiamo occupare di
   semantica e lettura di segni e spazi tridimensionali, la missione è più
   profonda»*. Il lettore misura già colore, verso e area
   (`[VERITAS segnaletica] … tinta 46deg direzionale direzione 90deg`). Manca
   il passaggio da *fisica del segno* a *significato*.

   🔴 **CORREZIONE 31/08 — QUI C'ERA LA BUGIA PIÙ COSTOSA DEL DOCUMENTO.**
   Fino a oggi c'era scritto: *«Le frecce rosa/arancioni/verdi sulla pianta
   NON sono segnaletica dell'edificio: le disegna VERITAS. Darle in pasto al
   cervello è guardarsi allo specchio.»* **È FALSO.** Nel GLB ci sono **36
   mesh che si chiamano `arrow_0`, `arrow001_0` … `arrow031_0`**, materiali
   `arrow.001` / `.002` / `.003`, spesse 17 cm e stese sul pavimento: **le ha
   messe chi ha fatto il modello.** Tre tinte = **tre flussi**: verde 9, rosa
   18, arancione 9.

   E due di quelle frecce **salgono la scala mobile**: `arrow013_0` a x −33 e
   quota **2,10 m** (in mezzo alla rampa), `arrow014_0` a x −38 e quota
   **4,12 m** (in cima). L'edificio dichiara per iscritto che il flusso rosa
   va al piano di sopra — mentre il sistema concludeva che lassù non ci
   arriva nessuno. **Non c'è nessun filtro nel codice che le butti: a
   escluderle è stata questa riga di documento**, per giorni.

   ⚠️ Quello che resta vero è solo questo, e va tenuto distinto: i percorsi
   che **VERITAS disegna a schermo** (rosa, arancio, verde chiaro) non vanno
   rimandati al cervello. Si distinguono all'origine, non dal colore: quelli
   del modello stanno dentro `__veritasModelRoot`, i nostri sono marcati
   `__veritasHelper`. Chi confonde le due cose butta la segnaletica vera —
   ed è successo.

   📌 Raffaella l'aveva già detto il **19/08**, ed è citato dentro
   `veritas_cose.js` riga 11: *«hai delle figure umane, che sono degli
   elementi verticali, delle frecce orizzontali colorate che indicano i
   percorsi»*. Il documento lo ha smentito e sono passati dodici giorni.

6. 🔴 **LE SAGOME UMANE SONO INDIZI, e oggi vengono buttate.** Nel modello ci
   sono **226 figure**: 61 al piano terra e **164 al piano di sopra** — c'è
   più gente sopra che sotto, su un piano che il sistema dichiarava
   irraggiungibile. L'occhio le capisce benissimo (`person` è nel suo
   vocabolario, chiede *«a person standing»*), ma ogni persona vista viene
   marcata `controprova` e messa in quarantena: *«le persone non nominano
   niente»* (`veritas_riconosce.js` ~435), e vengono tolte dai posti su cui
   si appoggiano le tappe (`veritas_cose.js` ~831).

   ⚠️ La quarantena ha **una** ragione buona e una sola: se le figure
   decidessero dove vanno le tappe, la controprova — «le zone che ho misurato
   tornano con dove sta la gente?» — si darebbe ragione da sola. Quella
   ragione vale per la VERIFICA, non per tutto il resto. Una figura modellata
   è un indizio come una sedia o un'auto: **non è roba nostra, l'ha messa
   l'autore del file.** Regola da applicare: le figure continuano a non dare
   NOMI, ma valgono come prova che **una superficie è calpestabile e usata**.
   Un livello con delle figure sopra è un livello a cui si deve poter
   arrivare: se dopo i collegamenti resta irraggiungibile, il sistema lo
   **dichiara** invece di appiattire in silenzio. Vale in una scuola, in una
   chiesa, in un negozio: una figura modellata sta dove la gente sta.

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
