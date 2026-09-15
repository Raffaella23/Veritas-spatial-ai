# HANDOFF.md — EIDETICA *(il prodotto si chiamava VERITAS)*

**Aggiornato il 15/09/2026 (tarda notte).** Questo è l'unico documento di stato del progetto.

---

# ⛔ IL METODO — SI FA COSÌ, PUNTO

> Raffaella, 13/09/2026: *«certe volte lavori nella sandbox, certe volte vai nel
> browser, io mi perdo. Non apro neanche il link perché non so se è aggiornato.
> Non ti posso aiutare dal momento che cambi sempre il tuo metodo di lavoro.
> Dovrebbe essere scolpito da qualche parte che si fa così, punto e basta.»*

1. **Si lavora su GitHub.** Scrivere → commit → push. Mai lavoro che resta in
   locale: Raffaella non può aprirlo e non può aiutare.
2. **Dopo ogni pubblicazione, la PRIMA riga scritta a Raffaella è il numero di
   costruzione.** Così sa se il link è aggiornato senza doverlo aprire.
3. **Si guarda nel SUO Chrome**, sulla scheda di EIDETICA: si apre e si ricarica
   **senza chiedere ogni volta**. Nessun'altra sua scheda, mai. *(Sostituisce la
   vecchia regola «non toccare il browser senza chiedere».)*
4. **Si legge la console, non si fanno fotografie.** Uno screenshot costa come
   venti righe di log: foto solo per una forma o un colore.
5. **I conti puri si fanno con uno script usa-e-getta, cancellato nello stesso turno.**
6. **A fine turno non resta niente aperto** — né server, né schede, né file.

⛔ **E IL HANDOFF È QUESTO FILE, DENTRO `temp-repo`.** Il 13/09 è stato letto
per mezza sessione `Desktop\HANDOFF.md` (387 KB, fermo all'11/09), lavorando su
priorità non più in vigore. Quel file e gli altri morti — `CLAUDE_INSTRUCTIONS.md`,
la cartella `Veritas-spatial-ai-main`, il clone vuoto `Veritas-spatial-ai` — vanno
eliminati. *«Bisogna eliminare ogni possibile causa di errore.»*

---

## 📋 SESSIONE 15/09/2026 (tarda notte) — DALLA MESH A RAGGI X ALL'ARGILLA, E LA FORMA DELLE ZONE CHE NON SI BUTTA PIÙ

**Pubblicato: costruzione `2026-09-15-k`.**

### ✅ Fatto 1 — la Vista dell'Agente non è più a raggi X

Diagnosi prima di tutto (chiesta da Raffaella, nessun codice scritto finché
non era chiara): la Vista dell'Agente (`apriSuAgente()`) non disegna mai il
GLB importato — ricostruisce muri/pavimento/tetto da `ombra()`, un materiale
custom con **`depthWrite: false`**. Ecco il vero motivo per cui tutto si
vedeva attraverso tutto, non un difetto del modello: nessuna di quelle
superfici scriveva mai nello z-buffer, quindi niente occludeva niente,
qualunque fosse l'opacità impostata.

Corretto **solo** dentro `apriSuAgente()` (mai `costruisci()`/`ombra()`
condivisa con `apri()`/"Lettura dal vivo", che resta identica a prima):
muri/pavimento/tetto/oggetti passano a `MeshStandardMaterial` vero (argilla
neutra, `depthWrite`/`depthTest` veri, normali calcolate), un `DirectionalLight`
con ombra vera + un `HemisphereLight`, `renderer.shadowMap` con
`PCFSoftShadowMap`, tone mapping ACES. Fili di contorno e reticolo
nascosti (`visible=false`, geometria e dati intatti — non cancellati).
**Verificato dal vivo**: l'effetto raggi X è sparito, si vedono ombre reali
proiettate a terra, profondità e prospettiva leggibili.
⚠️ Resta un limite noto e non affrontato: la geometria è ancora quella
**ricostruita** (pannelli isolati dalla griglia), non il GLB vero — visibile
ora che non è più mascherato dalla trasparenza. Prossimo passo naturale,
non ancora iniziato.

### ✅ Fatto 2 — le zone non buttano più la loro forma

Audit (stessa sera, prima del codice): ogni zona nasce da un bacino
watershed su una griglia — la forma vera esiste cella per cella durante il
calcolo — ma l'esportazione teneva solo centroide + area. Risultato:
un accesso allungato e un ambiente quadrato con la stessa area finivano
disegnati **identici**, un cubetto/cerchio ricavato dalla sola area. Questo
era esattamente il difetto scritto sopra come "punto 2" fino a stanotte
(vedi sostituzione sotto) — e la causa vera non era lo scaling del righello
umano come si ipotizzava: erano i campi `formaLungo`/`formaLargo`/`formaAngolo`,
già previsti nel modello dati e già letti in tre punti del codice, mai
scritti da nessuna parte.

Corretto in `segmentZones()` (**due copie, la trappola nota**: quella che
gira davvero è inline in `index.html`, non il modulo `veritas_perception.js`
— aggiornate entrambe): tre somme in più nello stesso giro sulle celle che
già esisteva (`sumXX/sumZZ/sumXZ`), poi la stessa matematica degli assi
principali già scritta in `assePrincipale()` (`veritas_segnaletica.js`) —
niente algoritmo nuovo. Sotto 6 celle resta `null`, vale il vecchio ripiego
ad area. **Nessun'altra funzione toccata**: non il watershed, non la fusione
zone, non `currentNodes`, non il riconoscimento frecce.

📌 **La scoperta migliore della serata**: il consumatore che disegna il
volume di una tappa (`veritasRebuildHotspots()`, `index.html:5985`) aspettava
già questi campi — scritto il 30/08 rispondendo a Raffaella parola per
parola (*«mette UN volume allungato che la copre, non un cubetto dentro»*)
— e per due settimane e mezzo ha sempre ricevuto `null`, disegnando sempre
il cubetto di ripiego. Stanotte, per la prima volta, riceve il dato vero.
**Verificato dal vivo** (screenshot di Raffaella, tarda notte): il volume
sopra l'area d'imbarco è ora un riquadro esteso e allungato, non un cubo —
e accanto c'è un anello/ancora separato, distinto dalla zona.

### 🟡 Scoperto, non causato da stanotte — il ciclo dei sette minuti

Durante la stessa prova, il log mostrava molte righe ripetute
*"nessuna tappa dopo sette minuti: flussi non rifatti"* con una lunga fila
`passo → setTimeout`. Rintracciato: è `chiediRicalcolo()` in
`veritas_accessi.js:1054-1085`, codice **preesistente e non toccato
stanotte**, che aspetta fino a 900 volte (ogni 0,5 s = 7 minuti) un nodo
"origine" e uno "destinazione" insieme prima di ricalcolare i flussi. La
causa vera: è la **prima volta in questa sessione che il modello di
visione locale (`qwen2.5-vl-7b-instruct`) è davvero acceso e risponde**
— prima usciva sempre "backend non raggiungibile". La regola già scritta
in `veritas_comando.js` (*«l'occhio comanda: quando parla, l'analisi si
rifà»*) fa ripartire tutta l'analisi ogni volta che l'occhio parla, e ogni
ripartenza conta di nuovo come "l'occhio ha parlato" — un ciclo che si
morde la coda, mai esercitato per davvero prima di stanotte perché il
ponte al modello locale non aveva mai risposto abbastanza a lungo.
**Non è un guasto introdotto stanotte**: l'area navigabile misurata restava
identica (3363,57 m²) in ogni giro, cambiava solo quante zone il watershed
accorpava — governato dalla testimonianza dell'occhio, non dal calcolo di
forma. **Ha finito da solo**, dopo 3 giri occhio-cervello, fiducia 90%,
19 volumi su 20 assegnati, simulazione pronta a partire. Da guardare la
prossima sessione: serve un limite a quante volte il ciclo può
incatenarsi, mai servito finora perché nessuno aveva mai visto l'occhio
rispondere per davvero durante un giro completo.

Build `2026-09-15-j` (resa argilla) → `2026-09-15-k` (forma delle zone).
Commit `bfd9b31`, `df08009`.

---

## 📋 SESSIONE 14/09/2026 — IL PAVIMENTO A PEZZI

**Pubblicato: costruzione `2026-09-13-a`.**

### ✅ Fatto: le fessure del pavimento si ricuciono, i muri no

Nessun modello disegna il pavimento come una superficie sola: GLB, IFC, SketchUp
lo fanno sempre a piastre affiancate, e dove due piastre non si toccano la
navmesh ne fa due isole irraggiungibili. **Non è il difetto di un modello, è il
modo in cui si disegna** — quindi la cura è generale, non tarata sull'aeroporto.

`collegamentiOrizzontali()` dichiara il ponte fra due isole vicine, come §6-bis
già fa in verticale per le rampe. **Prima però guarda cosa c'è in mezzo,
all'altezza del petto** (`muroInMezzo`): se c'è un muro, niente ponte, e il
motivo finisce nel referto. È la regola del 18/08 su `gruppiCollegati` — *«due
sale confinanti separate da un muro sono vicine e irraggiungibili»* — che resta
in vigore.

Misurato su `airport_foot_traffic.glb`: **1 fessura ricucita, 3 passaggi
rifiutati per il muro, i gruppi raggiungibili a piedi da 6 a 5.**
⚠️ Scritto in `veritas_navmesh.js` **e** nella copia dentro `index.html`.

### ✅ Misurato, e smonta due ipotesi sbagliate

| domanda | risposta misurata |
|---|---|
| I varchi si chiudono perché la persona è larga? | **No.** Dimezzando il raggio le isole grandi restano 15 |
| Le isole piccole buttate spezzano il pavimento? | **No.** Abbassando la soglia si aggiungono 21 m² su 1.865 |
| **«Mancano 1.500 m² camminabili»** (3.364 vs 1.865) | **Non è un guasto.** Il modello è uno *spaccato*: è giusto che sia quasi tutto all'aperto. I due numeri sono due metri diversi, non un buco |
| Le frecce colorate a terra fanno da ostacolo? | **No: 35 su 36 sono calpestabili.** Si chiamano `arrow*` nel modello, 3 famiglie di colore (tinte ~330, ~120, ~15), quasi tutte a quota −1,0 m. Una sola resta fuori dal cammino: `arrow006_0`, larga 5 m, a −1,13 m |
| Quanto c'è di inclinato? | **331 m²** — ma le due scale mobili insieme fanno ~40 m². 🔴 **Gli altri ~290 m² sono gli aerei** (ali e fusoliere curve), e secondo la regola di Raffaella non dovrebbero contare: *«i collegamenti fra i piani sono le scale mobili, altre cose inclinate non le dovresti avere»* |

### 📌 Come si riconosce il dentro dal fuori — detto da Raffaella il 13/09

Non è una questione di geometria, **sono gli indizi**:
- **fuori**: gli aerei da una parte, i taxi dall'altra;
- **dentro**: le **frecce colorate** dipinte a terra, che indicano il percorso e
  **si attraversano**;
- le **pareti verticali** sono porte, varchi e chiusure: **non si attraversano**;
- le **scale mobili** sono gli unici collegamenti fra piani di calpestio.

---

## 📋 SESSIONE 14/09/2026 (pomeriggio) — I CORPI VERI, LO STATO VERO, LE FRECCE CHE GUIDANO

**Pubblicato: costruzione `2026-09-14-j`.**

### ✅ I corpi — da 8 figure ripetute a 25 diverse, con un incidente in mezzo

Raffaella dal vivo: *«li vedo tutti uguali, solo di colore diverso»*, poi:
*«se c'è una libreria di corpi o animazioni a cui attingere, caricala»*.

- **Prima causa trovata**: il seed di ogni figura nasceva dal **colore**
  dell'archetipo, non dall'id — tutti gli agenti dello stesso tipo erano
  identici. `senior`/`elderly` (colore `#6a994e`) cadevano sotto la soglia dei
  bambini ed **erano disegnati come bambini**. Corretto: il seed nasce dall'id.
- **Caricata la Universal Animation Library di Quaternius** (CC0, in `corpi/`):
  un corpo vero + 46 animazioni, 3,9 MB. Dentro c'è la direttiva 12 e oltre:
  `Idle_Loop`, `Sitting_Enter/Idle/Exit`, `Walk_Loop`, `Push_Loop` (carrello),
  `Jog_Fwd_Loop`, `Interact`.
- ⛔ **LA TRAPPOLA DELLE DUE COPIE, AL CONTRARIO.** Il lavoro sui corpi (statura,
  sesso, sedia a rotelle) non arrivava a schermo: **le figure le costruisce il
  bundle minificato**, non `veritasBuildPassenger` in `index.html` — quella era
  la copia morta stavolta. Misurato: tutte e 28 le figure avevano scala uniforme
  0,820. Soluzione: non si riscrive il bundle, si **veste** quello che crea —
  `vestiLeFigure()` gira due volte al secondo, spegne le capsule (materiale
  **e** mesh: il bundle riaccende `visible` a ogni giro, spegnere solo la mesh
  non basta) e infila il corpo vero in un sottogruppo nostro.
- **La sedia a rotelle ora è geometria vera** (ruote, seduta, schienale), non
  più una persona seduta nel vuoto. L'anziano ha il bastone.
- Console: `window.__veritasCorpi.stato()` — quante figure vestite, quante
  animazioni in corso, se la libreria è pronta.

### ✅ Lotto A — lo stato vero guida l'animazione

Ogni frame della traiettoria (motore vero e generatore locale, stessa
struttura) porta già `state` (MOVING/WAITING/ARRIVED) e `pos` per ogni id. Il
bundle la consuma ma non la lascia sul gruppo — si **ricostruisce la traccia**
di ogni agente una volta, e ad ogni battito si cerca il punto più vicino **per
posizione** (non per tempo: funziona con play/pausa/x1/x2).

⚠️ **Misurato e corretto un artefatto**: con due soli campioni consecutivi,
13 persone su 25 risultavano "in corsa" — l'interpolazione ease-in-out del
cammino accelera al centro di ogni tratto per recuperare il tempo perso in
curva, e un campione lì vede un falso picco. Corretto mediando su 2 secondi:
verificato, nessuno supera più 1,87 m/s in una simulazione normale.

I bambini (`family`) restano vicini al gruppo (richiamo triplicato, solo nel
generatore locale). Chi è in **carrozzina e resta bloccato pulsa in rosso**
dopo 3 s — dichiarato come segnale, non ancora come diagnosi (richiede sapere
se manca *davvero* una rampa, cioè la navmesh filtrata per profilo del punto 3
qui sotto, mai costruita).

### ✅ Lotto B — le frecce guidano anche il cammino, non solo la meta

Il 12/09 le frecce erano già un indizio per **scegliere la tappa** giusta fra
più candidati (`unaPerCategoria`, `veritas_flussi.js`). Ma il **tragitto
fisico** fra due tappe (`findRoute` → navmesh pura) restava cieco alla
segnaletica: fra un corridoio segnalato e uno di servizio, vinceva sempre il
più corto.

🔴 **INCIDENTE, e la lezione vale più della cura.** Il primo tentativo era uno
SCONTO: un tratto allineato a una freccia costa metà della sua distanza vera.
Passava il test isolato. **Sul modello vero ha bloccato il renderer di
Chrome** — nessun errore in console, la pagina smette di rispondere.

**Causa**: navcat usa A* con euristica = distanza euclidea al goal (misurato
nel sorgente: `heuristic = vec3.distance(...) * 0.999`). Quell'euristica è
valida **solo se nessun arco costa meno della propria lunghezza**. Uno sconto
lo viola: l'algoritmo riapre nodi già chiusi, e senza un limite esplicito sulle
riaperture (non c'è, verificato) il calcolo non finisce più.

⚠️ **REGOLA NUOVA PER QUALUNQUE FILTRO FUTURO SULLA NAVMESH: mai abbassare un
costo sotto la distanza vera. Solo rincarare le alternative.** Corretto così:
chi passa vicino a una freccia (25 m) ma non nella sua direzione (cono di
35°) paga il 15% in più; ovunque altro il costo resta quello vero, invariato.
Stesso risultato relativo, euristica mai violata. `filtroCosto()` in
`veritas_navmesh.js` fabbrica il filtro (passFilter intatto, cambia solo
getCost); `filtroSeguiFrecce()` in `index.html` (vicino a `findRoute`) lo
costruisce dalle frecce già lette da `veritas_segnaletica.js`.

Verificato prima isolatamente (5-6 casi geometrici), poi sul modello vero su
una scheda pulita: 0 irraggiungibili, nessun blocco.

### 📌 Sulla domanda «esiste un modulo di semiotica?» — 14/09

Non con quel nome. Il meccanismo (un segno letto → un comportamento) esiste in
**due punti indipendenti**, entrambi dentro `veritas_flussi.js`/`findRoute`:
1. `unaPerCategoria` — la freccia sceglie **quale tappa** raggiungere;
2. `filtroSeguiFrecce` — la freccia guida **come ci si arriva** (sopra).

Nessuno dei due sa leggere segni diversi dalle frecce (un cartello "USCITA",
un simbolo di divieto): resta un vocabolario di un solo segno.

### 🔴 QUELLO CHE RESTA APERTO, in ordine di peso — aggiornato 15/09 tarda notte

| | | |
|---|---|---|
| **1** | 🟡 **Sovrapposizione dei corpi — corretta ma MAI verificata dal vivo** | `SimulationEngine._risolvi_sovrapposizioni()` aggiunta in `Assets/core/engine.py` (prima il motore Python non aveva NESSUNA regola di distanza). Lato JS, `resolveOverlaps` non escludeva più chi è ARRIVED (era il bug vero — chi arriva allo stesso gate restava fuso per sempre), rinforzato due volte (0,25→0,55 m, 1→3 passate). **Nessuna delle due correzioni è stata vista funzionare**: la pagina si blocca per minuti su "Leggi lo spazio" ad ogni prova (vedi punto 4). Un tentativo di correggere ANCHE l'attraversamento dei muri (`ultimoBuono`, dentroUnSolido ogni fotogramma) ha bloccato la scheda per oltre due minuti ed è stato **revertito** (commit `Revert "fix: chi finisce dentro un muro..."`, 15/09): resta aperto |
| ~~2~~ | ✅ **CHIUSO 15/09 tarda notte — le scatole delle zone ora hanno l'ampiezza vera** | La causa non era lo scaling del righello umano (ipotesi scartata): erano `formaLungo`/`formaLargo`/`formaAngolo`, già previsti nel modello dati e mai scritti da nessuna parte. Riempiti alla fonte in `segmentZones()` (indice/covarianza sulle celle del bacino, stessa matematica di `assePrincipale()`). **Verificato dal vivo**: il volume su una zona allungata (imbarco) è ora un riquadro esteso, non un cubo. Vedi sessione 15/09 tarda notte sopra |
| **3** | 🟡 **La "Vista dell'agente" (AI-Eye View) — punti 3 e 7 fatti, punto 9 no; base del render sistemata stanotte** | Brief in 12 punti di Raffaella (15/09 notte). Fatto: camera vera sulla traiettoria reale (`apriSuAgente()`), altri agenti come corpi veri, bounding box proiettate, scia 3D, mirino; **punto 3 (percezione dentro il rendering)**: lo shader `ombra()` sfuma opacità e saturazione verso la periferia dello sguardo, stessa curva su corpi e bounding box; **punto 7 (campo percettivo senza cono opaco)**: stesso meccanismo, nessuna geometria aggiunta. **Aggiunto 15/09 tarda notte**: la resa di base non è più a raggi X — materiale argilla opaco, luce e ombra vere (vedi sessione sopra). Ancora aperto: **punto 9** — le altre traiettorie non sono disegnate in scena, il rapporto fra le frecce segnaletiche 2D e questa vista 3D non è chiarito, e la geometria resta quella ricostruita dalla griglia, non il GLB vero |
| **4** | 🔴 **"Leggi lo spazio" blocca la scheda per minuti — causa trovata in parte** | Misurato ripetutamente la notte del 15/09. **Aggiornamento tarda notte**: una fonte precisa del blocco è `chiediRicalcolo()` in `veritas_accessi.js:1054` — aspetta fino a 7 minuti (900 tentativi ogni 0,5 s) nodi "origine"+"destinazione" insieme, e la regola "l'occhio comanda: quando parla, l'analisi si rifà" (`veritas_comando.js`) può incatenare più giri quando il modello di visione locale è davvero acceso e risponde (successo per la prima volta stanotte). Non ha un limite al numero di incatenamenti: da mettere. Resta da capire se questo spiega TUTTO il blocco o solo una parte — impedisce ancora la verifica dal vivo dei punti 1 e 3 |
| **5** | **Navmesh filtrata per profilo** — carrozzina e scale, rimandato dal 12/09 | Stesso meccanismo tecnico del filtro-frecce (`QueryFilter`/`getCost`), ma qui serve anche **negare** un passaggio a chi non è del profilo giusto — parte rischiosa mai toccata. Serve a rendere vera la pulsazione rossa della carrozzina bloccata, E a farla segnalare l'assenza di una rampa/ascensore (chiesto da Raffaella 15/09 notte, non iniziato) |
| **6** | **Comportamenti sedersi/attesa in piedi** — direttiva 12, mai iniziato | Raffaella, 15/09: non vede animazioni di seduta nemmeno dove la sala d'attesa è stata riconosciuta. Oggi non esiste NESSUNO stato del genere durante la simulazione — il "posturale" serve solo all'analisi della vista, non anima nessuno. È il grosso di LOTTO A del piano di Raffaella (corsa/sostenuta/normale + sedersi/coda), mai aperto per intero |
| — | **Telecamere di sorveglianza fisse per zona** | Mai iniziato |

✅ **Chiusi stanotte (15/09), con codice ma senza verifica dal vivo — vedi punto 4:**
corsa solo in simulazione di emergenza; frecce da consiglio debole (+15%) a
obbligo di fatto (+50000%, mai un divieto vero per non rompere A*); pannello
"Persone in scena" (nome/compito/occhi, settima icona del rail); "Lettura dal
vivo" non si apre più muta se manca l'analisi; puntini tolti dal Cinema.

⚠️ **NON SI TORNA AL PANNELLO O AD ALTRO finché il punto 3 non è chiuso davvero
— i punti 3/7/9 del brief, non solo la parte meccanica.** Raffaella, 15/09 notte,
dopo aver visto che erano stati saltati senza dirlo abbastanza chiaramente:
*«non decidessi tu cosa fare e cosa non fare, ma ti limitassi a fare quello che
io ti chiedo»*.

---

📌 Il rettangolo che contiene tutte le frecce — **52,9 × 23,6 m** — è quindi una
misura del «dentro» letta dal modello stesso, non ipotizzata.

---

## 📋 RIASSUNTO OPERATIVO — Sessione 13/09/2026 (sera)

**Fatti e confermati dal vivo, in ordine:**

1. **IFC bloccato per sempre su "Sto leggendo..."** — causa: web-ifc su GitHub Pages
   prova i Worker multi-thread, che vengono da un dominio diverso
   (cdn.jsdelivr.net) e falliscono in silenzio. Forzato a un solo thread
   (`api.Init(undefined, true)` in `index.html` e `veritas_bim.js`). Confermato
   su un IFC reale da 34 MB (impianti, Revit) e uno da 207 MB con 1000 stanze
   vere lette correttamente in Node — quest'ultimo supera pero' il limite di
   caricamento del sito (150 MB), quindi non ancora provato dentro al sito.
2. **Corpi uomo/donna aggiunti** (spalle, vita, capelli) — ribalta la scelta
   del 12/09 che li escludeva apposta. Prima versione troppo debole per
   vedersi a schermo («i corpi sono tutti uguali»): alzata di netto.
3. **Telecamera che segue un agente**, nuova — comando in chat "segui agente
   N" / "smetti di seguire". Quota alta apposta, stile drone: il difetto
   segnalato era "in sezione si vedeva, in un modello chiuso reale si perde",
   e una camera bassa in un edificio chiuso vero finisce dentro un muro
   (schermo nero, nessun errore). Zoom automatico quando l'agente si ferma.

### 🔴 Aperti per la prossima sessione

- **Motore fisico segnalato "non funziona" da Raffaella**: nessun sintomo
  preciso raccolto ancora — chiedere COSA fa di sbagliato prima di toccare
  nulla (e' stato corretto tre volte diverse a settembre).
- **Comportamenti (sedersi/alzarsi/mettersi in coda), direttiva 12**: oggi
  NON esiste nessuno stato del genere durante la simulazione — il
  "posturale" che c'e' serve solo all'analisi della vista, non anima
  nessuno. Tocca anche il motore Python su Render, non solo la parte 3D:
  lavoro grosso. Decidere con Raffaella se va prima o dopo i punti 4/5.
- **Campo Task per agente** (dalla lista di Raffaella: "prendi bus / scendi
  aereo / esci da auto", deve guidare il movimento) e **Vista occhio agente
  dal vivo con selettore**: non ancora iniziati.
- **Nuova idea di rendering** (l'attuale non soddisfa, troppo "sala
  controllo"): discussa a parole con Raffaella — un cartellino di
  comportamento sopra l'agente + una luce debole sulla tappa verso cui sta
  andando. Non ancora disegnata ne' costruita.
- **`airport_final_big_scene.glb` (il progetto "aeroporto completo")**: la
  generazione della simulazione crasha ("Cannot read properties of null
  (reading 'length')"). Il modello ha 12 piani senza rampe che li
  colleghino: probabile causa, non confermata, non toccata oggi. Test fatti
  con successo su `airport_foot_traffic.glb` invece.

---

## 📋 RIASSUNTO OPERATIVO — Sessione 12/09/2026 (pomeriggio)

Osservato dal vivo: muri attraversati a volte, scale di servizio prese al posto
del tunnel, frecce di segnaletica ignorate. Raffaella ha chiesto anche una
libreria di comportamenti sociali per profilo (in corso, vedi direttiva 12
gia' scritta) e varieta' di corpi (uomini/donne/bambini/disabili) +
aggiramento ostacoli — **punto 4, ancora da fare**.

| # | Cosa | Stato |
|---|---|---|
| 1 | **Muro attraversato** — `SOTTOPASSI_MAX` a 8 tradiva: oltre 2,4 m di recupero i sottopassi tornavano piu' larghi del raggio. Alzato a 40 in `index.html` riga ~27226. | ✅ Fatto |
| 2 | **Frecce ignorate** — il sistema le leggeva ma nessuno le rileggeva. Ora sono un indizio nella scelta della tappa (`unaPerCategoria`, riga ~21850): una freccia che punta a un candidato azzera il suo scarto geometrico. Indizio di missione, non vincolo. | ✅ Fatto |
| 3 | **Scale di servizio al posto del tunnel** — la navmesh va doppiamente filtrata per profilo. Scavato: navcat ha `QueryFilter` + area-code sulle `offMeshConnection`. Rimandato. | 🔴 Rimandato alla prossima sessione |
| 4 | **Corpi diversi** — bambini (~15%, seed dal colore), corporature varie (0.85–1.15), wheelchair (già c'era). Fatto in `veritasBuildPassenger` riga ~5896. | ✅ Fatto |
| 5 | **Aggiramento ostacoli** — esiste gia' in `resolveOverlaps` (riga 2318): evitamento pairwise fra agenti + anti-muro. Arredi statici: coperti se nella navmesh (Rapier), non gestiti se no. Come il tunnel/scale — problema della mappa, non del motore fisico. | ✅ Esiste, come da disegno |

### 🔴 Punto 3 — quello che serve, per chi riprende

navcat (la libreria di percorso, `navcat@0.4.1` via CDN) **ha gia'** il
meccanismo giusto — non va inventato, va collegato:

- ogni `offMeshConnection` (le scale/rampe: `collegamentiVerticali`, riga
  ~22855) puo' avere un `area` diversa da 0;
- `findPath`/`findSmoothPath` accettano un `QueryFilter` al posto di
  `nav.DEFAULT_QUERY_FILTER` (righe 22595/22600), con due funzioni:
  `passFilter(nodeRef, navMesh)` (vero/falso: ci si passa?) e
  `getCost(...)` (quanto costa passarci).

**Il pezzo mancante non e' l'API, sono due domande di impianto:**

1. **Quale scala e' "di servizio"?** Non lo dice la geometria da sola. L'idea
   piu' onesta trovata oggi: una connessione verticale e' riservata se
   l'isola a cui porta non e' MAI una tappa di nessuna missione
   andata/ritorno (passeggero) — lo si scopre pero' SOLO dopo aver calcolato
   le missioni, mentre la connessione va creata PRIMA (serve a calcolare la
   raggiungibilita' delle tappe). Serve una doppia passata: prima si costruisce
   tutto con l'area di default, poi si ri-etichettano le connessioni "solo
   presidio" e si ricalcola il tragitto fisico di chi non e' presidio con un
   filtro che le esclude.
2. **`findRoute(fromPos, toPos)` (riga 2218) oggi non sa CHI sta camminando.**
   Va fatto arrivare il profilo (passeggero / presidio) fino a li', per
   scegliere il filtro giusto.

⚠️ Non affrettare questo pezzo: tocca la navmesh, che ha gia' una lunga storia
di casi limite documentati sopra (isole scollegate, «camminano sull'aereo»,
gruppi raggiungibili). Un filtro scritto in fretta puo' spezzare la
raggiungibilita' per TUTTI, non solo per le scale di servizio.

---

## 📋 RIASSUNTO OPERATIVO — Sessione 11/09/2026, ore 08:00 – 20:45

**Versione live attualmente pubblicata: `2026-09-11-e`**

### ✅ Tre bug critici chiusi (confermati sul codice, deploy pending live verification)

| Bug | Sintomo | Root Cause | Fix | Status |
|---|---|---|---|---|
| **1. Render memory leak** | Browser riavvia dopo ~30 min | GLB texture decode in RAM senza release; `trimesh.load()` lazy-decodes tutto | Sostituzione con ColorVisuals + `gc.collect()` a fine `/api/analyze-topology` | ✅ Deployed, live build 2026-09-11-e |
| **2. Physics world body leak** | Agenti saltano/attraversano muri dopo 2-3 cicli Play | Rapier accumula rigid bodies indefinitamente in `filtraFrames`, mai tolti | Chiama `pulisciCorpi()` (cleanup di tutti i bodies) ai due exit di `filtraFrames` | ✅ Deployed in index.html righe 27768-27953 |
| **3. Status indicator hidden** | Fallback engine path nascosto da UI; utente non sa quale motore è attivo | `/health` dice solo "server alive", non quale engine in use | Aggiunge indicatore persistente (viola) quando fallback è attivo | ✅ Deployed, versione -e |

🔗 **LA PAGINA VIVA — l'ultima versione pubblicata sta qui:**
### → https://raffaella23.github.io/Veritas-spatial-ai/

⚠️ **Prima di misurare, due controlli, in quest'ordine.**
1. **La costruzione è quella giusta?**
   `curl -s "https://raffaella23.github.io/Veritas-spatial-ai/?cb=$(date +%s)" | grep -m1 -o '__EIDETICA_COSTRUZIONE = "[^"]*"'`
   Se non combacia, la pagina viva non ha il lavoro spinto. Deve dire `2026-09-11-e`.
2. **E i MODULI sono quelli giusti?** Vedi la trappola della cache, in fondo.

### 🟡 Pending verification (da confessare al vivo)

- **Physics fix**: muri/scale mobili traversabili con agenti dopo 2+ cicli Play — confermato che non salta più?
- **Render memory**: applicazione stabile oltre 30 minuti di uso continuato?
- **Status indicator**: fallback path visibile quando si attiva?

### 🔴 Prossima sessione — Priorità

Dalla sezione 11/09 (righe 83-98 del documento precedente):

**I due posti riservati oggi vanno TUTTI airside.** Bisogna scegliere per MASSIMA DISTANZA fra grappoli, non per DENSITÀ. Su un aeroporto, uno dei due posti deve guardare il landside (strade/taxi/parking), non solo aerei.

---

## ✅ CHIUSURA DELL'11/09/2026 — L'INGRESSO DA FUORI: L'ANELLO C'È, MANCA CHI PARLA

**Costruzione in pagina: `2026-09-11-e`.** (Nota: la precedente era -b e -d; i tre bug sopra sono stati corretti in -e.)

### Che cosa è stato riparato, e ogni riga è misurata sulla pagina viva

| | com'era | com'è |
|---|---|---|
| **il «da fuori»** | aveva **una sola strada** per arrivare a un ingresso: nascere dentro un indizio della voce «gli oggetti in fila», l'unica che chiamava `ariaApertaVista`. **Nessuno chiedeva mai all'occhio «e qui, sull'INGRESSO, cosa vedi?»** | si chiede **sull'ingresso**, dopo l'appoggio sul calpestabile. Provato sulla pagina viva: con una testimonianza d'area sull'Accesso 3 → *«DA FUORI — l'occhio, proprio qui, ci ha visto cielo, che al chiuso non ci sta (lo dice di quest'AREA, non di questo punto)»*; senza occhio, **tutti e tre invariati** |
| **il marchio non contava** | `missioni()` distribuisce con `entrate[i % entrate.length]` e la lista era nell'ordine in cui le entrate erano nate: prima la tappa chiamata «origine», che su questo modello è il piazzale fra i due aerei | **chi si entra dal fuori va in testa.** Se nessuno è da fuori l'ordine resta identico a ieri |
| **il marchio moriva sulla soglia** | un accesso entro 8 m da una tappa d'ingresso veniva scartato **intero**, e con lui l'unica cosa che nessun'altra voce sa | l'accesso non raddoppia la tappa, ma le **passa** il «da fuori» |
| **il referto** | «3 accessi · 0 marcati da fuori» — un numero solo | **una riga per ingresso**, e chi non è da fuori dice perché |

7 prove nuove in `veritas_ingressodafuori.test.mjs`, due delle quali sono guardie:
«se l'occhio non ha guardato non cambia niente» e «senza nessun ingresso da
fuori l'ordine resta quello di ieri». La quarta è l'agnosticità: un **cortile di
scuola** risponde come una pista.

### ✅ RISOLTO L'11/09 (secondo giro) — NON ERA CHI GUARDA, ERA CHI SERVE

La domanda era: *una sezione sa da quale striscia di edificio è stata tagliata —
perché non se la porta dietro?*

**Sì, la sa. E non deve portarsela.** Una sezione è misurata PRIMA di scattare
(dove passa il taglio, quanto è larga la fetta, quanto è alta, fin dove arriva
lo sguardo): il rettangolo esiste già, manca solo di scriverlo. Ma quella
striscia è **mezzo edificio**, dal taglio alla parete di fondo, e il cielo che
l'occhio ci vede sta **sopra il tetto** — in qualunque edificio, sempre. Darle
voce vorrebbe dire dichiarare «all'aperto» tutto il terminal e «da fuori» ogni
ingresso. ⛔ Peggio di zero: non si fa.

**Il difetto vero, contato sul log dell'11/09.** All'occhio sono arrivate
**cinque** viste: 2 piante e 3 sezioni. Zero primi piani sui grappoli, zero
viste da dentro, zero prospetti, zero veduta d'insieme. Le uniche due famiglie
che portano un rettangolo **stretto e misurato** sono i primi piani sui grappoli
(`vicini`: il rettangolo è il grappolo stesso) e le viste da dentro (`dentro`:
il rettangolo è l'isovista). I primi piani stavano in fondo alla fila, fra le
«conferme», e su questo aeroporto prendevano **zero posti**: **l'unica voce che
vede la strada e i taxi — 83 il 06/09, contro ZERO dall'alto — non arrivava mai
all'occhio.** Non è un difetto del riconoscere. È del SERVIRE.

**Riparato in `veritas_montaggio.js`:**
- **due posti riservati** ai primi piani sui grappoli, serviti **subito dopo la
  pianta e prima delle sezioni**, così arrivano anche quando la fila è corta;
- la fila adesso **dichiara quante viste portano un rettangolo**, e se sono zero
  lo grida **dove il difetto nasce** — non dieci minuti dopo, a giro finito.

**E una trappola trovata strada facendo.** `veritas_comprensione.js` era
importato con **due numeri di versione diversi** (`?v=11` da montaggio, `?v=9`
da passo): due copie dello stesso modulo nella stessa pagina, la seconda vecchia
di giorni. Il file era cambiato il 09/09 **senza** che nessuno toccasse quei
numeri. Allineati a `?v=12`.
⚠️ **Regola: si cambia un modulo, si cambia il suo numero in OGNI punto che lo
importa.** È la quarta faccia della trappola della cache.

### ✅ MISURATO SULLA PAGINA VIVA, costruzione `2026-09-11-e`, 11/09 ore 20:45

```
[VERITAS occhio] ha guardato per primo 6 viste col vocabolario intero — testimonianze da 3 scorci
[VERITAS occhio] 15 testimonianze legate a una REGIONE di mondo (i primi piani):
                 9 dicono «qui si e' all'aperto», 5 «qui passano i mezzi», 6 «di qui si cammina».
```

**Ieri zero, oggi quindici.** Stesso numero di viste (la fila resta corta), ma
due dei tre scorci adesso portano un rettangolo, e bastano.

### 🔴 IL LAVORO NUMERO UNO DELLA PROSSIMA SESSIONE — LE AREE CI SONO, MA SONO TUTTE AIRSIDE

Le nove aree «all'aperto» parlano di: `airplane`, `runway`, `sky`, `land`,
`ship`, `skyscraper`. **Nessun taxi, nessuna automobile, nessuna strada.** E
l'ingresso misurato (x ≈ −67, il fronte landside) **non cade dentro nessuna** di
quelle nove aree: resta senza voce, e non perche' manchi la voce — perche' la
voce guarda dall'altra parte.

La causa e' quella che Raffaella aveva gia' detto il 07/09 sera: *«vedo ancora
troppe fotografie ravvicinate della zona degli aerei»*. `scorciRavvicinati`
sceglie i grappoli **piu' fitti**, e su un aeroporto i piu' fitti sono gli
aerei. I due posti riservati vanno tutti e due airside.

**La domanda della prossima sessione:** i due posti riservati non vanno dati ai
grappoli piu' FITTI, ma ai piu' LONTANI fra loro — o almeno uno per lato del
calpestabile. Un aeroporto ha due facce e oggi l'occhio ne vede una sola.

### ⛔ LA TERZA TRAPPOLA SILENZIOSA DEL BANCO

Dopo `.nojekyll` e la scheda in secondo piano, la terza: **il browser tiene in
cache i moduli**. La pagina dichiarava `2026-09-11-a` — perché `index.html` ha il
suo `?fresco=` — e girava col `veritas_accessi.js` **vecchio**: il server aveva
quello nuovo, Chrome no. Sintomo: la prova sul vivo falliva e il codice era
giusto. Si smaschera in una riga, e da oggi si fa **prima** di misurare:

```js
String(window.__veritasAccessiModulo.uniscoVoci).indexOf('nomeDelPezzoNuovo')
```

Se dà `-1`, si rinfresca (`fetch(file,{cache:'reload'})` su ogni modulo toccato)
e si ricarica. ⚠️ Il numero di costruzione **non** garantisce i moduli: dice solo
che `index.html` è nuovo.

---

# ⛔ LE DIRETTIVE DEL 04-05/09/2026 — NON SI PERDONO E NON SI RIDISCUTONO

> Raffaella, 04/09/2026: *«mi raccomando trecento volte: deve essere chiaro che
> le direttive che abbiamo stabilito oggi non si devono perdere più.»*

**Questa sezione sta in cima al documento e ci resta.** Chi apre una chat nuova
legge PRIMA questa, poi il resto. Nessuna di queste decisioni si ricava di nuovo
dal codice, si mette ai voti o si «interpreta»: sono già state prese, e ognuna è
costata una giornata.

⚠️ **Se un commento nel codice dice il contrario di una di queste righe, il
commento è vecchio e va cancellato** — non seguito. È successo oggi, ed è costato
un giro intero (vedi la direttiva 3).

## 1. Prima il recinto, poi il significato

L'architettura dà i **contenitori**, gli oggetti danno la **funzione**.

> *«Ho guardato prima l'architettura, non mi era molto chiaro a cosa servissero
> gli spazi; poi guardando con più attenzione ho visto dove erano le sedute,
> dove erano i check-in, e quindi ho ipotizzato la zonazione.»*

Gli arredi **suddividono** dentro un ambiente, non lo creano. Ma in pianta libera
i muri non bastano: il confine fra attesa e check-in **lo disegnano gli arredi**.

## 2. L'occhio guarda per primo, il cervello valida

> *«Non è il cervello che comanda sull'occhio, casomai il contrario: va a
> validare quello che l'occhio ha visto.»*

Hanno **la stessa importanza** e vedono **le stesse immagini** (Regola 0 punto
2). Il cervello contesta con le misure; non decide al posto dell'occhio.

## 3. Quando si decide, la nota vecchia si CANCELLA

> *«Quando decidiamo delle cose elimina questi vecchi codici che vengono sempre
> a rompere le scatole.»*

Una nota superata **non è storia: è un'istruzione ancora in vigore** per chi la
legge senza sapere che è morta. Si conserva il **fatto misurato**, si butta la
**prescrizione**. La ⚠️ è un ordine: un ordine morto si toglie. Vale anche per le
righe «corretto» di questo documento — si verificano contando le **chiamate**,
non l'esistenza di una funzione.

## 4. Sulle scelte di impianto si CHIEDE a Raffaella

> *«Abbi dubbi e chiedi di più a me.»*

Chi comanda su chi, in che ordine avvengono le cose, da cosa nasce una zona:
**si chiede**, anche se il codice sembra dire già la risposta. Misurare e
verificare resta compito di chi lavora; **scegliere l'impianto no**.

## 5. Si parla da architetto, non da programmatore

> *«Sei troppo tecnico, non riesco a seguirti. Vedo delle zone messe meglio, però
> non so dirne sì e no.»*

I guasti si raccontano **in metri quadri e in spazi**, e quando c'è di mezzo una
geometria **si disegna in scala** e si manda il disegno. Si chiude sempre con una
domanda a cui si può rispondere **guardando il modello**. I nomi delle funzioni
stanno nell'HANDOFF, non nei messaggi.

## 6. Il vocabolario è ENCICLOPEDICO: deve riconoscere tutto

> *«Io gli darei il vocabolario della Treccani, cioè dare l'enciclopedia da
> capire come conoscenze, così non ci sbagliamo di voler riconoscere il metal
> detector: deve riconoscere tutto.»*

⚠️ **Non si sceglie a mano che cosa il programma deve saper riconoscere.**
Scegliere una lista è già decidere che tipo di edificio ci si aspetta — è la
Regola 0-bis portata alle sue conseguenze. Il rilevatore è **a vocabolario
aperto**: va usato aperto.

📌 Misurato il 04/09, e toglie l'unica obiezione che c'era: **le parole non
costano.** 4 parole 201,3 s, 16 parole 201,3 s, tutte e 158 in una chiamata sola
72,3 s. Si paga il **guardare la figura**, una volta sola. Quindi un vocabolario
enorme costa quanto uno piccolo — a patto di chiederlo **in una chiamata sola,
mai spezzato in mazzetti**.

## 7. Riconoscere serve ad AGIRE, non a mettere targhette

> *«Sono sedute: questo cosa implica? Implica che, ovunque sia nel suo percorso,
> l'avatar lì si può fermare. Il check-in è chiuso, si siede; poi si mette in
> fila. Sta aspettando che si apra il gate: si siede. Come fanno le persone.»*

⚠️ **È il punto che tiene insieme tutto il prodotto.** Il layer semantico non
finisce sull'etichetta: arriva al **comportamento degli agenti**. «Sedute» vuol
dire *ci si può fermare e attendere*; «banco di accettazione» vuol dire *lì si fa
la fila*; «varco» vuol dire *si passa uno per volta*. La comprensione **abilita
un repertorio di comportamenti**, e la simulazione deve usarlo.

Ne discende che la sequenza dev'essere naturale: aspetta seduto → il check-in
apre → si alza → si mette in fila → passa. **Fluida, come fanno le persone.**

## 8. Avatar realistici e camminate diversificate — e non è estetica

> *«Quegli omini sono brutti brutti. Se facciamo la cosa da cinema dobbiamo
> mettere avatar più realistici, animazioni di camminata diversificate.
> Altrimenti tutto quello che stiamo ipotizzando, che ci piace tantissimo, non
> riusciamo a farlo.»*

Discende dalla 7: se il comportamento diventa ricco (sedersi, alzarsi, accodarsi,
aspettare) **serve un corpo capace di mostrarlo**. Sagome rigide tutte uguali
rendono invisibile proprio la cosa che abbiamo costruito. Servono: avatar
credibili, camminate diverse per passo, velocità e postura, varietà di figure
(età, corporature, bagagli, gruppi che camminano insieme).

## 9. Il viaggio dentro il progetto

> *«Sarebbe il cinema, sarebbe effetto wow. [...] Vorrei attivare la vista
> attraverso i passeggeri: mentre cammini ti vedi crescere le cose attorno.
> Davanti l'immagine che si compone, e sotto solamente una riga di chat in cui
> scrivere — anzi, il microfono, uno scambio immediato. L'esperienza utente è un
> viaggio dentro il progetto, con l'AI che dà un superpotere alla percezione
> dell'architetto.»*

⚠️ **La messa in scena la guida lo STATO VERO, mai un effetto.** La drammaturgia
è già nei dati: il vuoto misurato, le masse senza nome, gli indizi che si
accendono uno alla volta, i nomi che si posano con la fiducia che sale.

⚠️ **Niente Gaussian Splat** per rappresentare la comprensione: l'occhio non
produce punti 3D, e costruirci uno splat sarebbe disegnare *un'immagine della
comprensione al posto della comprensione*. Il modello vero c'è già: si accende
lui, progressivamente.

## 10. Si può rendere bella la RAPPRESENTAZIONE, mai la CONCLUSIONE

La linea che separa il «wow» onesto dalla bugia: un avatar bello non afferma
niente di falso sullo spazio; un nome inventato sì. Sulle persone e sulla scena
l'aspetto è libero. Sulla comprensione si mostra **solo ciò che è misurato**.

## 11. Il cartellino dice un COMPORTAMENTO, non il nome di una stanza

> *«Ho spiegato che il cartellino va ovunque, ma sostanzialmente indica il fatto
> che l'avatar si siede. Quindi indica un comportamento.»*

Che «sedute» compaia in quattordici posti **non è un difetto**: in quattordici
posti ci si siede davvero. Il difetto era leggerlo come nome di ambiente. «Sala
d'attesa» descrive una stanza; «ci si siede» descrive un'azione — e noi
scrivevamo il secondo e leggevamo il primo.

## 12. Il registro comportamentale: invarianti che portano il peso, posture poche apposta

> *«Se tu dentro l'AI metti una serie di regole, di invarianti comportamentali,
> più dei modelli specifici a cui attingere in funzione dell'oggetto che sta
> analizzando, allora può darsi che ce la caviamo.»*
>
> *«Quanti sono i comportamenti umani? Non possiamo metterli tutti. Mettiamo le
> animazioni base, poi vediamo.»*

Come *Idle* e *Walk* in un motore di gioco: non descrivono una situazione,
descrivono **come sta il corpo**. Quattro posture — **seduto, in piedi,
sdraiato, passa** — e i passaggi fra loro. Quello che si moltiplica è **quando**
si cambia posizione e **che cosa** si ha davanti, non il numero delle voci.

⚠️ **I «modelli specifici» sono la porta da cui rientra il tipo di edificio.**
Se scriviamo «in aeroporto: siedi, poi il banco, poi il varco», abbiamo
riscritto in verbi l'elenco cancellato il 30/08 — e sarebbe invisibile: un museo
simulerebbe lo stesso, solo sbagliato. Le invarianti portano il peso, i modelli
specifici restano sottili. **Se la tabella delle posture arriva a venti righe,
dentro ci è rientrato l'aeroporto.**

⚠️ E l'**ordine** delle tappe non si scrive: **si legge dalla pianta.**
Camminando dall'ingresso alla destinazione, gli oggetti si incontrano nell'ordine
in cui l'architetto li ha messi. Così il secondo modello non chiede una seconda
tabella, né il terzo una terza.

## 13. Se non si mette a fuoco non si vede — e allora si inventa

> *«Avevo già chiesto che negli scorci prospettici ci fossero delle zoommate,
> perché visto sempre da lontano non si capisce niente, specialmente se ci sono
> molti dettagli. Avevo chiesto un'autofit, la capacità di mettere a fuoco.»*
>
> *«Questa aula a gradoni io non l'ho vista da nessuna parte.»*

📌 Misurato il 05/09 sulla pagina viva, col modello intero nel riquadro: la
telecamera sta a **136 m**, inquadra **126 m** dentro 768 pixel, cioè **6 pixel
al metro**. Un aereo lungo 40 m è 243 pixel; un bancone 18; **una seduta larga
55 cm è 3,3 pixel**.

⚠️ **I grattacieli e le aule a gradoni non sono parole sbagliate nel
vocabolario: sono quello che tre pixel *sembrano*** a un modello a vocabolario
aperto a cui si fanno 176 domande e che deve rispondere qualcosa. Il rimedio non
è togliere parole — sarebbe la direttiva 6 violata — **è avvicinare la
telecamera.**

## 14. La telecamera si posiziona per regola d'architettura: sezione a 1,10 m

> *«La telecamera si deve posizionare di regola per l'architettura, ci si regola
> cosi'. Si va a sezionare a un metro e dieci, perche' di solito a quell'altezza
> tu hai praticamente in sezione le finestre, le porte, gli scorci.»*
>
> *«E se si tratta di un edificio multipiano, bisogna avere la possibilita' di
> guardare a ogni livello, a ogni piano: l'altezza della telecamera viene
> regolata in funzione di ogni piano, cosi' posso controllare tutte le zone.»*

La telecamera **non inquadra il pavimento**: si posiziona a **occhio umano**
(1,10 m), inquadra le finestre, le porte, il prospetto che **un architetto
vede** quando cammina. Se l'edificio è su tre piani, la camera **sale di piano
in piano**. (Se il documento non dice l'altezza di una sezione, si può ricavare
da `.altezza` nel JSON della pianta; se manca quella, si chiede.)

---

### ⛔ LE SEI REGOLE FERREE

**1. Non puoi andare oltre quello che è scritto qui.** Se una cosa non è
scritta, non la deduci dal codice e non la decidi: **chiedi a Raffaella.** Il
codice dice *com'è*, non *come deve essere*. Su ogni scelta di impianto — un
pannello, un nome, un colore, una soglia, un'architettura — si chiede.

**2. Un commento nel codice che contraddice questo documento è vecchio: si
cancella, non si segue.** Ed è costato un giro intero il 04/09.

**3. UN SOLO DOCUMENTO: questo.** Non si crea `CLAUDE.md`, non si crea
`RIPARTENZA.md`, non si crea `NOTE_SESSIONE.md`, non si crea niente. Se hai
qualcosa da scrivere, **si aggiorna questo file sostituendo la parte superata**,
non accodando in fondo.

**4. Prima di costruire qualunque cosa strutturale, fai un `grep` qui dentro.**
Il 06/09 stavo per costruire un secondo dock: la regola *«i comandi stanno tutti
a sinistra e i pannelli si aprono a destra»* era già scritta, e il dock esisteva
già. Raffaella: *«questa cosa io te l'ho espressa già tante volte»*. Aveva
ragione, ed era scritta.

**5. Verifica con i numeri, non con l'impressione.** Ogni affermazione in questo
documento che dice «misurato» ha dietro una misura vera. Se scrivi qualcosa qui,
o l'hai misurata, o la marchi **[DA VERIFICARE]**.

**6. Se una cosa si sbaglia sempre allo stesso modo, non va ricordata: va tolta
di mano.** Tre errori identici in un giorno hanno prodotto
`banco/sistema_carta.mjs`. Fanne altri se servono.

### ⛔ LE TRE COSE CHE TI FARANNO PERDERE UN'ORA SE NON LE SAI

⚠️ **Il repo vero è `C:\\Users\\ciani\\OneDrive\\Desktop\\VERITAS\\temp-repo`.**
La cartella `Veritas-spatial-ai` accanto è un clone rotto e vuoto.

⚠️ **`veritas_corpo.js`, `veritas_llm.js`, `veritas_occhi.js` sono COPIE che non
vengono caricate.** Il codice che gira è incollato dentro `index.html` (2 MB).
Il 06/09 ho corretto il file sbagliato e non è successo niente. Prima di toccare
una funzione, cerca se esiste anche dentro `index.html`.

🔴 **E IL RE-INLINE PUÒ SOVRASCRIVERE IL MODULO SBAGLIATO — pagato il 07/09.**
`banco/reinlina.py` trova il blocco per la firma `window.__veritasX`, e la firma
da sola non basta: chiedendo `veritas_perception.js __veritasPerception` la
percezione è finita **sopra il modulo della VISIBILITÀ** e lo ha cancellato. La
legatura giusta era `__veritasPerceptionEngine`. Il comando aveva detto
*«blocco reinlinato, bundle intatto»*: **sembrava andato bene**, e il guasto è
uscito due ore dopo sulla pagina viva come `__veritasPerception.reset is not a
function`.
✅ **Tolto di mano**: `reinlina.py` adesso confronta le **chiavi esportate** del
blocco in pagina con quelle del modulo, e se hanno in comune meno della metà
**rifiuta** stampando le due liste. Provato in tutti e due i versi.

⚠️ **Sul Desktop ci sono ancora documenti superati** — `AVVIO_NUOVA_CHAT.md`,
`handoff.md`, `Piano/CLAUDE_INSTRUCTIONS.md`, e la vecchia cartella
`Veritas-spatial-ai-main` con dentro `CLAUDE.md`, `CONTEXT.md`,
`PROJECT_INFO.md`, `design_brief.md`. **Sono tutti morti dal 24/08.** Se ne apri
uno, stai leggendo istruzioni di venti giorni fa. **Non sono qui.**

### Come si lavora, in pratica

- **Il server**: `http://localhost:5173/index.html`. Il riquadro d'anteprima
  dentro Claude **non regge** l'applicazione 3D. Per guardare si usa **Chrome**.
- ⛔ **E NON LE SI LASCIANO I PROMEMORIA.** Raffaella, 07/09/2026: *«quello che si
  dimentica le cose sei tu. Stiamo perdendo un sacco di tempo perché da una chat
  all'altra si perdono le informazioni.»*
  Ogni ricordo va scritto **nel prompt della chat successiva o in questo
  documento**, non in un messaggio.
- **Dopo ogni modifica a `veritas_carta.js`: `node banco/sistema_carta.mjs`.**
- **Ogni volta che apri o chiudi una finestra, dillo. Il link alla pagina sempre.**

### Come si scrive a Raffaella

> *«Scrivimi proprio due righe e in grassetto quello che vuoi chiedermi.»* — 06/09/2026

**Due righe in grassetto in cima, con l'azione o la decisione. Il resto sotto, e
solo se serve.** Si parla da architetto: metri quadri e disegni, non nomi di
funzioni.
