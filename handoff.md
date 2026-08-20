# VERITAS Spatial AI — punto della situazione

> Aggiornato il **19/08/2026**. Questo file dice **su cosa si lavora adesso**.
> La storia lunga sta in `CLAUDE.md`; il blocco rosso in cima a quel file e la
> sua §18 sono da leggere **prima** di questo.

---

## 0. 🔴 IL PROSSIMO PASSO — UN MOTORE FISICO, e non è negoziabile

> Detto da Raffaella il **20/08/2026**, guardando l'anteprima. Viene prima di
> qualunque altra cosa scritta in questo file.

### Cosa ha visto sullo schermo

> *«Ho impostato 3 persone ma entrano in massa, attraversano i muri e non usano
> le scale. Il comportamento nello spazio deve seguire quello di un corpo
> fisico, l'ho specificato più volte: non devono attraversare muri e solai, né
> fluttuare.»*

### ⚠️ E L'ERRORE CHE HO FATTO IO, che è più importante del difetto

Davanti a quel difetto ho cominciato a far camminare gli agenti **leggendo le
porte dichiarate nell'IFC**. Funziona, ed è misurato — ma è la risposta
sbagliata, e Raffaella l'ha fermata subito:

> *«Il punto non è che lo deve ricavare dal modello che ti ho dato io. Deve
> trovare un motore fisico da applicare nell'applicazione, non risolvere il
> problema sul modello X. Ne dovrai trovare milioni davanti a te.»*

**Ha ragione, ed è la Regola uno che si ripete per la terza volta.** Un corpo
che non attraversa i muri non è una proprietà del *percorso*: è una proprietà
del *corpo*. Nessun percorso, per quanto giusto, impedisce a una figura di
fluttuare o di bucare un solaio — quello lo impedisce solo un **collisore**.
E deve valere su qualunque modello arrivi: GLB, IFC, scansione, livello di
gioco. Risolverlo sulle dichiarazioni di un file vuol dire non averlo risolto.

### La strada, e lo strumento che esiste già

**`@dimforge/rapier3d-compat`** — motore fisico in WebAssembly, licenza Apache-2.0
(uso commerciale consentito), ed è **quello che three.js stesso adotta**: il
pacchetto `three` che è già in questo repository contiene
`examples/jsm/physics/RapierPhysics.js`. Non c'è niente da scrivere a mano.

Quello che serve si chiama **`KinematicCharacterController`**, ed è fatto
esattamente per questo problema:

| cosa fa | come si chiama in Rapier | quale difetto chiude |
|---|---|---|
| il corpo è una capsula che collide | `ColliderDesc.capsule(h, r)` | **attraversano i muri** |
| l'edificio è un collisore vero | `ColliderDesc.trimesh(vertici, indici)` | **attraversano i solai** |
| resta appoggiato al pavimento | `enableSnapToGround(d)` | **fluttuano** |
| sale gli scalini da solo | `enableAutostep(alzata, pedata, true)` | **non usano le scale** |
| non cammina sulle pareti | `setMaxSlopeClimbAngle(45°)` | agenti sui tetti e sulle ali |

Le misure da dargli sono quelle **già dichiarate** in `veritas_navmesh.js`
(§17): raggio 0,30 m dall'ellisse di Fruin, altezza 2,00 m, gradino 0,40 m,
pendenza 35°. Nessuna soglia nuova.

⚠️ **La navmesh (navcat) NON si butta e non è in concorrenza.** Fanno due
mestieri diversi, e vanno insieme come in ogni motore di gioco:

```
navcat  -> DOVE andare      (il percorso: pianifica)
Rapier  -> COME ci si va    (il corpo: nessuno attraversa niente)
```

### Come si innesta

1. `rapier3d-compat` dall'importmap, come navcat e web-ifc — non inlinato.
2. Un collisore trimesh costruito **una volta** dalla geometria caricata,
   qualunque sia il formato: il punto è che sia indipendente dal file.
3. Ogni agente diventa una capsula. Il generatore di traiettorie smette di
   scrivere posizioni e comincia a scrivere **direzioni**: il controller
   decide dove il corpo finisce davvero.
4. Il collaudo che conta: **zero posizioni dentro un solido**, su modelli
   diversi. `banco/dentro.mjs` misura già una cosa simile e va stretto a
   questa.

⚠️ **Costo da dichiarare**: 28 capsule per ~800 fotogrammi sono un calcolo
vero. Va misurato prima di prometterlo, non dopo.

### Cosa è già stato corretto il 20/08

- **«3 persone ma entrano in massa»** ✅ **risolto.** Il bundle costruisce
  sempre 28 figure (`for (i = 0; i < 28; i++)`) e le si accendeva tutte
  insieme: tre camminavano e venticinque restavano lì. Ora si accendono solo
  quelle che i fotogrammi descrivono davvero.
- Muri, solai, scale e fluttuazione: **NON risolti.** Serve il motore fisico.

---

## 0-bis. Il piano precedente — l'IFC (Passo 1 ✅ fatto)

### Cosa è cambiato, e perché conta più di tutto il resto

Per dieci giorni VERITAS ha ricevuto un **GLB scaricato da Sketchfab** e ha
provato a dedurre da lì cos'era ogni spazio. Un GLB è un **export**: la
semantica è già stata buttata via. Era **archeologia su un file a cui la
risposta era stata cancellata**.

L'ultimo difetto lo dice meglio di qualunque spiegazione: **una tappa
«Ingresso / Parcheggio» sull'ala di un aereo, a quota 3,64 m.** E non era
correggibile, perché **un'ala e un mezzanino sono geometricamente identici**.

Adesso si parte dal file d'origine, che la semantica ce l'ha:

| dominio | file | cosa porta dentro |
|---|---|---|
| architettura | **IFC / BIM** | stanze con nome e funzione, piani, porte, dati antincendio |
| gioco | progetto Unity | tag, collider, NavMesh — dichiarati dal level designer |
| nessuno dei due | GLB nudo | niente: **solo qui** servono occhi e conferma umana |

### I quattro passi approvati

**0. ✅ Anteprima promossa** (fatto il 19/08). `veritas-ai-os-preview` è
allineata: https://raffaella23.github.io/Veritas-spatial-ai/
Serviva perché il lavoro dei giorni scorsi **non era mai stato sullo schermo**,
e perché dalla sandbox non si scarica il modello di visione: **nel browser di
Raffaella l'occhio può girare per la prima volta.**

**1. ✅ `veritas_bim.js` — l'IFC come ingresso di prima classe.** *(fatto il 19/08)*
Carichi un `.ifc` e le stanze compaiono **col nome che gli hai dato tu**, dove
le hai disegnate. Provato su un progetto vero esportato da ArchiCAD: sette
stanze su due piani, i loro nomi, le porte fra una stanza e l'altra con la
luce netta, e le due porte che danno sulla strada — quindi **l'ingresso non si
indovina più, c'è scritto**. Il dettaglio completo sta in `CLAUDE.md` §19.
- lettore `web-ifc` v0.0.77, **MPL-2.0 (uso commerciale consentito)**, via
  importmap come navcat — non inlinato;
- `IfcSpace` → zone dichiarate, con `origine: "bim"` che diventa il gradino
  più alto dell'ordine di autorità già in uso;
- ⚠️ **il nome sta in `LongName`, non in `Name`** (ArchiCAD ci mette il numero
  della Zona);
- `IfcDoor` / `IfcStair` / `IfcRamp` → i collegamenti fra ambienti, cioè
  esattamente il dato mancante che produce le 32 isole scollegate;
- property set (antincendio, affollamento) → `veritas_normative.js`, come dati
  **dichiarati** invece che stimati;
- `veritas_ingest.js` riconosce già i formati dai byte: un IFC comincia per
  `ISO-10303-21;`.

**2. La macchina propone, la persona conferma** — ripiego onesto per i file
senza BIM. Ogni zona con `confermata` e `fiducia`; una zona `bim` nasce
confermata; **spostare una zona la conferma** (l'editor c'è già); la chat
**chiede** dove non sa; il referto dichiara quante zone ha confermato una
persona.

**3. L'occhio guarda di sbieco, non a piombo.** I VLM generici sulle piante
prendono il 33-38%; sulle fotografie molto di più. Viste prospettiche a
30-45°, e il ritorno al 3D si fa **proiettando i mucchi misurati dentro
l'immagine**, non disproiettando le scatole.

**4. Le isole irraggiungibili si dichiarano, non si usano.**

### ⚠️ La regola di disciplina di questo piano

> **Nessuna nuova euristica geometrica.** Se una tappa finisce nel posto
> sbagliato la risposta non è una soglia in più: è **leggere una
> dichiarazione** o **chiedere**. Provarci ancora è ricominciare il ciclo di
> dieci giorni.

### Cosa serve e non ce l'ha la macchina

**✅ Trovato un file pubblico, il 19/08: `AC20-FZK-Haus.ifc`** — modello di
riferimento del KIT, **esportato da ARCHICAD 20**, 2,45 MB, un comando solo:

```bash
curl -sL -o banco/AC20-FZK-Haus.ifc \
  https://raw.githubusercontent.com/ThatOpen/engine_web-ifc/main/tests/ifcfiles/public/AC20-FZK-Haus.ifc
```

È quello con cui è stato costruito e provato il Passo 1: ha le Zone col nome,
due piani, le porte, i bordi di spazio e i property set — tutto quello che
serve. **Ma è una casa di sette stanze.**

**Serve ancora un export IFC da un progetto ArchiCAD di Raffaella**:
`File → Esporta → IFC`, anche un progetto piccolo. È un edificio del suo
dominio, con la sua nomenclatura, ed è l'unico modo di misurare quanto VERITAS
ci prendeva prima partendo dalla sola geometria.

⚠️ **`.pln` e `.pla` non si leggono**: formati chiusi Graphisoft, nessuna
libreria esiste, versioni non retrocompatibili. Non perderci tempo.

### Il numero da battere

```
tappe su arredi veri     3 su 7      persone con una zona vicina   3%
distanza mediana         16,1 m      (misurato il 19/08 sul GLB)
```

⚠️ **Questo numero non si può ancora battere, e va detto.** Serve un IFC con le
stanze dichiarate per fare il confronto: su un file con N stanze scritte dal
progettista, quante ne indovinava VERITAS partendo dalla sola geometria.
Finora non c'era modo di saperlo perché non c'era niente con cui confrontarsi.
Il banco è pronto (`node banco/bim.mjs <file.ifc>`), manca il file.

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
6. **Non si scrive a mano quello che esiste già.** Prima di scrivere un
   algoritmo si cerca lo strumento che lo fa — su GitHub, su npm, fuori da
   questo repository. Un algoritmo fatto in casa e tarato su un solo modello
   funziona su quello e si rompe sul successivo. Vedi `CLAUDE.md` Regola uno.

---

## 3. Dove sta il codice

| Ramo | Cosa c'è | A cosa serve |
|---|---|---|
| `main` | **frontend vecchio** + i file Python | produzione e sorgente del deploy Render |
| `veritas-ai-os-preview` | **allineata al 19/08** (promossa in quella sessione) | anteprima pubblica |
| `claude/veritas-spatial-ai-resume-z0iuw9` | il lavoro in corso | ramo di lavoro della sessione |
| `claude/new-session-wqeyfh` | ⚠️ **da cancellare, dopo un ok** | vedi qui sotto |

⚠️ **Il quarto ramo, e cosa c'era dentro.** Controllato il 19/08 su richiesta
di Raffaella. `claude/new-session-wqeyfh` (17/08) è interamente contenuto in
z0iuw9 **tranne un commit di sola documentazione**, che scriveva una §14
diversa da quella attuale: la sessione successiva ha riscritto la §14 con
altro contenuto, e quelle pagine erano rimaste solo lì. Il **codice** che
descrivevano c'è e funziona (`veritas_aspetto.js`, `veritas_scala.js`,
`veritas_pavimento.test.mjs`); erano perse le **cause e le misure**, cioè la
parte che impedisce di rifare la stessa strada. Recuperata come **§14-bis** di
`CLAUDE.md`. Adesso il ramo si può cancellare senza perdere niente — ma non si
tocca senza un ok esplicito.

Anteprima live: **https://raffaella23.github.io/Veritas-spatial-ai/**

⚠️ `index.html` ha **30 blocchi `<script>`**, non 9 né 20 né 25 come dicono le
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

## 4-bis. Il 18/08 pomeriggio: il cervello e gli occhi

> Nasce dalla **Regola uno** di `CLAUDE.md`: non si scrive a mano quello che
> esiste già. Tutto il §4 qui sopra era codice fatto in casa e tarato su un
> solo modello. Questo lo sostituisce.

### Il cervello: dove si cammina lo decide un software vero

Non decidiamo più noi cos'è un pavimento. Diciamo **quanto è larga e alta una
persona, che gradino sale e che pendenza affronta**, e la costruzione della
*navigation mesh* — la stessa che usano Unity, Unreal e Godot — ricava il
resto guardando tutta la geometria.

| misura | da dove viene |
|---|---|
| raggio **0,30 m** | ellisse corporea di Fruin (61 × 46 cm, 1971), lo standard dei modelli di deflusso |
| altezza **2,00 m** | altezza libera minima di passaggio |
| gradino **0,40 m** | due alzate a norma (DM 236/89: max 17–18 cm) |
| pendenza **35°** | una scala comune sta fra 30° e 35°; sopra è una copertura, un'ala, un terrapieno |

Da queste discendono **senza nessuna soglia inventata**: l'ala dell'aereo cade
per pendenza, i piani dei chioschi e le spalle delle figure umane cadono per
area minima, i muri sono ostacoli senza doverli leggere, e un piano staccato da
terra è irraggiungibile per costruzione.

**La misura che conta**, sul modello vero, 1.084 posizioni di agenti campionate
su 800 fotogrammi — *quante stanno su terreno dove si cammina davvero?*

| | |
|---|---|
| prima | agenti che escono dall'aereo **camminando sull'ala** |
| adesso | **99,8%** — 2 posizioni su 1.084 |

### Il difetto grosso: sei aree che non si raggiungono

Il modello ha **sei aree camminabili grandi e scollegate** (piazzale a −2 m,
piano del terminal a +0,5, un livello a +3,8), e le sette tappe erano
distribuite su tutte e sei: si chiedeva un percorso fra posti che a piedi non
si raggiungono, non si trovava, e partiva la linea retta dentro i muri.

Verificato che fossero separazioni **vere** e non disordine: tolti 2.197 pezzi
fra arredi, banchi e figure umane, le aree grandi restavano sei. E verificato
che non fosse precisione: a celle da 10 cm restavano 30 isole.

Quindi non si aggira: le tappe si **prendono dallo spazio camminabile**, lungo
il suo asse più lungo. Nomi, ruoli e misure restano quelli di prima — si
sposta il dove, non il cosa.

### Gli occhi: la pianta si guarda

Due pezzi che c'erano già e non si erano mai parlati: `veritas_vista.js`
disegna la pianta vista dall'alto, `veritas_llm.js` ha il ponte a un modello
locale. Adesso la pianta con le zone numerate va a **un modello che vede**, che
dice solo *cosa sono*: parcheggio, atrio, banchi, controlli, sala d'attesa.

Il modello dà **nomi**, mai numeri: una misura contestata da un cliente va
rifatta identica, e un modello linguistico non è ripetibile. Tutto ciò che non
combacia con una zona che esiste viene buttato, e c'è una prova che lo
verifica.

⚠️ **Serve LM Studio acceso** con un modello che vede (Qwen2-VL, LLaVA,
MiniCPM-V). Spento, il programma lo dice in chat e usa solo le misure, come
prima. Nel comando di chat si scrive **`occhi`** per farlo guardare.

---

## 5. Cosa resta aperto, in ordine

### 0) ✅ SUPERATO — vedi il §0 in cima a questo file

Era: *«le tappe devono stare sopra la cosa che le definisce»*. Il principio
resta giusto; era sbagliato il presupposto che quella cosa si dovesse
**dedurre** dalla geometria invece che **leggere** da un file che la dichiara.

Costruito il 19/08 e provato (182 prove, tutte su scene inventate):
`veritas_cose.js` (il piano delle cose), `veritas_controprova.js` (le figure
umane come verifica), `veritas_fila.js` (le code), `veritas_riconosce.js`
(l'occhio). Misurato: 3 tappe su 7 su arredi veri, **3% delle persone con una
zona vicina** — cioè la controprova dice di no, ed è per questo che è stata
costruita.

**Il seguito è il piano del §0**, non un'altra passata di geometria.

### 1) I KPI finti che sembrano veri

In basso a destra ci sono flusso, rallentamenti, tempo di transito e
saturazione. Sono **cablati dentro la demo** (`hV()` nel bundle: flusso 0.156,
12 rallentamenti, transito 131,4 s, saturazione 68%). Quando il motore di
calcolo Python non risponde o la sua risposta viene rifiutata, quei numeri
restano a schermo **con l'aria di essere misurati**.

È lo stesso genere di bugia credibile del verdetto normativo falso già
corretto il 13/08, ed è il difetto peggiore che questo strumento possa
produrre, perché il report si vende. **Vanno azzerati o dichiarati non
disponibili, non lasciati lì.** Deciso a fine sessione 17/08, non ancora fatto.

### 2) Gli occhi: **provarli davvero, con LM Studio acceso**

Il giro è costruito e collegato (§4-bis), e le prove coprono la domanda, la
verifica delle risposte e l'immagine. Quello che **non** è stato provato è la
lettura vera di una pianta: dalla sandbox non si raggiunge nessun modello.

Serve che Raffaella accenda **LM Studio** con un modello che vede — Qwen2-VL,
LLaVA o MiniCPM-V vanno tutti — e scriva `occhi` nella console. Poi si guarda
cosa ha riconosciuto e si calibra la domanda su quello che sbaglia.

Se il modello locale non basta, la strada dichiarata è un servizio a pagamento:
poche immagini una volta per analisi, circa **1–3 centesimi per modello**.

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
node veritas_navmesh.test.mjs      # il cammino: ala, aereo, rampe, porte, soffitti
node veritas_occhi.test.mjs        # gli occhi: cosa si accetta di cio che risponde
node veritas_zone.test.mjs         # nomi, ruoli dalle misure, parcheggio come partenza
node veritas_play.test.mjs         # niente si muove finche non premi play
node veritas_dentrofuori.test.mjs  # dentro o fuori: circondato o campo aperto?
node veritas_muri.test.mjs         # che il programma USI davvero i moduli
for t in veritas_*.test.mjs; do node "$t" >/dev/null || echo "$t KO"; done
```

⚠️ `veritas_navmesh.test.mjs` non usa il modello di Raffaella: costruisce una
stanza inventata per ogni difetto da bloccare. È la condizione perché il
modulo valga su un modello qualsiasi e non su uno.

E la prova d'insieme, con browser e modello veri — risponde alla domanda
diversa *«il programma li usa?»*, che è quella che qui è già costata una
giornata:

```bash
sh banco/monta.sh                          # rimonta vendor + index locale
(cd banco && python3 -m http.server 8899 &)
node banco/cammino.mjs                     # navmesh, tappe, agenti sul calpestabile
```

Estraggono le funzioni **dall'HTML per àncore testuali** e le eseguono su stub
minimi: non ricopiano il codice, quindi se cambi una firma la prova fallisce
subito invece di verificare una copia vecchia.

Il banco con browser vero (Playwright, Chromium preinstallato) è in
`CLAUDE.md` §13.5, per le prove d'insieme. Render e OpenSky sono bloccati dal
proxy: gli errori di rete lì sono attesi.
