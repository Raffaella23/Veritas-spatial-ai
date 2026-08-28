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

**Perché un passo del cervello si è fermato — sonda da console, non tocca
niente.** Si incolla PRIMA di caricare il GLB: una ricarica di pagina la
cancella. Stampa una riga per telefonata — `finish_reason`, gettoni in entrata
e in uscita, caratteri. È così che il 27/08 si è distinto «troncata» da
«malformata» senza indovinare: `length` = manca lo spazio, `stop` = sbaglia la
sintassi. Due guasti diversi, due riparazioni opposte.

```js
(() => {
  const originale = window.fetch;
  window.__veritasChiusura = [];
  window.fetch = async (...a) => {
    const r = await originale(...a);
    const url = String((a[0] && a[0].url) || a[0] || "");
    if (!url.includes("/chat/completions")) return r;
    let chiesti = null;
    try { chiesti = JSON.parse(a[1].body).max_tokens; } catch (e) {}
    r.clone().json().then((d) => {
      const c = d && d.choices && d.choices[0];
      const rec = { motivo_stop: c && c.finish_reason, gettoni_chiesti: chiesti,
        gettoni_entrata: d.usage && d.usage.prompt_tokens,
        gettoni_uscita: d.usage && d.usage.completion_tokens,
        caratteri: ((c && c.message && c.message.content) || "").length };
      window.__veritasChiusura.push(rec);
      console.log("[SONDA]", window.__veritasChiusura.length, rec);
    }).catch(() => {});
    return r;
  };
  console.log("Sonda accesa.");
})();
```

⚠️ Da mettere nel codice quando si toccherà `cervelloLocale`: `finish_reason` e
`usage` vanno conservati accanto alla risposta grezza. Oggi si buttano via, ed è
per questo che è servita una sonda per sapere una cosa che il codice aveva già
in mano.

---

## Dove siamo — 27/08/2026

**IL CIRCUITO GIRA SUL MODELLO VERO, TUTTO IL GIRO, PER LA PRIMA VOLTA.**
Nessuna riga di codice cambiata oggi, nessun commit sul codice: il guasto che
bloccava tutto era **una manopola di LM Studio**, non un difetto.

### La misura che l'ha chiuso (27/08, `airport_foot_traffic.glb`)

Il passo 2 moriva con «JSON troncato». La diagnosi scritta il 26/08 diceva «il
modello ha finito i gettoni, si alza il tetto di uscita»: **era sbagliata**. Il
tetto di uscita era gia' 2500 e la risposta si fermava a ~150 gettoni.

Misurato con una sonda che intercetta `/chat/completions` e legge
`finish_reason` + `usage` — dati che `cervelloLocale` buttava via:

| | finestra 8.192 | finestra 16.384 |
|---|---|---|
| studio: entrata | 7.966 | 8.001 |
| studio: uscita | 226 | 442 |
| **entrata + uscita** | **8.192 = il muro** | 8.443 |
| `finish_reason` | `length` (tagliata) | `stop` (finita da sola) |

8.192 esatti: il modello scriveva fino all'ultimo gettone disponibile. Non era
malformata — quindi **irrobustire il parser sarebbe stato riparare la cosa
sbagliata**, e un parser che "ripara" un JSON troncato inventa i pezzi mancanti.

⚠️ **REGOLA IMPARATA — la finestra di contesto e' un vincolo di prodotto, non
un dettaglio di macchina.** `promptStudio` porta pianta + 7 scorci + il racconto
dell'occhio + le misure: ~8.000 gettoni di sola domanda. Con una finestra da
8.192 non resta spazio per rispondere, e il guasto **si presenta come un JSON
rotto**, che manda a riparare tutt'altro. Chi riprende: **prima di diagnosticare
un JSON illeggibile, guarda `finish_reason`.** `length` = troncata (spazio),
`stop` = malformata (sintassi). Sono due guasti diversi con due riparazioni
opposte.

Serve **Context Length ≥ 16384** su `qwen2.5-vl-7b-instruct` in LM Studio, e il
modello va **ricaricato** dopo averla cambiata. Sotto quella soglia il passo 2
non passa, qualunque cosa si faccia al codice.

### Esito del giro completo, 27/08

| sonda | passo | entrata | uscita | caratteri | esito |
|---|---|---|---|---|---|
| 3 | studio | 8.001 | 442 | 1.275 | `stop` — `motivo: null` ✅ |
| 4 | **assegnazione** | 8.408 | 489 | 1.311 | `stop` — `motivo: null`, `capito: true`, `fiducia 0.95` ✅ |
| 5 | parole (rimbalzo all'occhio) | 6.473 | 146 | 397 | `stop` ✅ |

La sonda 5 e' il **giro n°2 della Regola 0** sul modello vero: il cervello ha
assegnato, poi e' tornato a chiedere all'occhio. Fino a ieri era provato solo
sul banco con occhio e cervello finti.

⚠️ Questo dice che **il circuito funziona**, NON che **nomina bene**. La qualita'
dei nomi non e' stata giudicata, e a schermo non si vede comunque — fronte 0.

| cosa | commit | provato |
|---|---|---|
| pianta specchiata + inquadratura fuori bersaglio | `1be10aa` | ✅ misurato con three |
| pianta = modello INTERO dall'alto, non la fetta a 45 cm | `dabe4d1` | ✅ a schermo |
| selettore con tutte le viste nel pannello | `143302d` | ✅ a schermo (`6/8 scorcio 5 — 206°`) |
| circuito occhio↔cervello (Regola 0) | `3d296e0` | ⚠️ solo banco |
| l'occhio guarda per primo e SENZA elenco; il cervello verifica con le misure | `bbf6554` | ⚠️ solo banco |
| `misureInParole` leggeva `p.min`/`p.max`, che non esistono → uccideva `comprendi()` | `c20d322` | ⚠️ mai ricorso dopo |



**Fatto e provato.** Il Core Python calcola davvero KPI, conformità e
raccomandazioni. La percezione degli agenti è **misurata**: isovista a 32 raggi
sulla mesh (Benedikt 1979), con due altezze occhio — 1,65 m in piedi e 1,20 m
seduto, così un bancone a 1,30 m non ostruisce chi cammina e chiude l'orizzonte
a chi è in carrozzina. Senza mesh si ricade su una stima per archetipo e il
report **lo dichiara** (`perception_source`).

L'IFC entra e viene letto sul lettore vero. I muri si leggono dal modello
invece di indovinarli. La fisica Rapier è innestata (`veritas_corpo.js`) ma va
in crash — fronte 5. **I KPI finti sono stati azzerati** il 24/08 (`9bb59b1`):
erano cablati in `hV()` — 0,156 p/s, 12 rallentamenti, 131,4 s, 68%. Se quei
quattro numeri ricompaiono a schermo, è tornato il bundle vecchio.

**Il ciclo occhio-cervello gira** (`veritas_montaggio.js`, parte da solo su
qualunque modello caricato). Il cervello è LM Studio via `__veritasLLM`,
nessun server da accendere; `puoAgire()` è il cancello prima della simulazione.

**Rifatto il 25/08 come si guarda un progetto, non come si legge un file.**
Il giro a parole trovava 0 cose su 158 chieste, e non per colpa del modello: gli
si chiedeva «trovi un banco?» dodici parole alla volta su una pianta dall'alto,
dove banco, sedute e muretto sono lo stesso rettangolo grigio. **Non gli era mai
stato chiesto che posto fosse.** Ora la domanda è rovesciata (`071ca95`):

1. **studio** — che edificio è, e *come* lo stanno mostrando: modello completo,
   spaccato, sezione, un piano solo. Un modello senza soffitto non è un difetto
   ed è compito del cervello dirlo.
2. **funzionamento** — la sequenza con cui le persone attraversano un posto del
   genere la enuncia il **cervello**, non noi. Scriverla nel codice taglierebbe
   la piattaforma su un tipo di edificio solo: oggi aeroporto, domani ospedale,
   dopodomani museo o collaudo di un livello di gioco.
3. **assegnazione** — i nomi vanno sui volumi **già misurati** (quelli che
   l'editor stira, allarga, moltiplica), mai su contorni nuovi. Nome libero
   dalla tipologia riconosciuta; **ruolo** da un elenco chiuso (`RUOLI`) per il
   Core e le soglie. Più volumi possono avere lo stesso nome: tre sale d'attesa
   restano tre. Un volume incerto non si nomina — finisce in `senza_nome` con
   la domanda, che va in chat. Deciso da Raffaella il 25/08.

`veritas_vista.js` sa **girare il modello fra le mani**: `scorciTreQuarti()`
rende N viste in prospettiva attorno al modello **intero** — mai zummate sui
singoli arredi, che su un aeroporto moltiplicherebbero il costo per il numero di
banchi. Quante: da 4 a 9, ricavate dalla densità di mesh per m². Da console:
`__veritasProvaScorci()`.

---

## Fronti aperti — IN ORDINE DI PRIORITÀ

### 0. 🔴 IL VOCABOLARIO D'AEROPORTO STA NEL CODICE — in QUATTRO posti

**MISURATO IL 28/08 leggendo `index.html` su `main`. La diagnosi precedente
mandava al posto sbagliato e va buttata:** diceva «`__veritasApplicaOcchi`
(~2890) cambia solo `n.label`, mai `n.type`». **Falso:** la riga 2876 fa
`n.type = a.tipo`. Quel pezzo funziona. Chi seguiva quella nota riparava una
cosa sana e lasciava in piedi il difetto.

**Il colpevole di quello che si vede a schermo e' `applyAutoAssignment` (~3500):**

```js
const typeSeq = ['spawn','checkin','security','lounge','gate','gate','gate','gate'];
// zone ordinate per X, poi:  spawn -> 'Ingresso / Parcheggio'
//                            checkin -> 'Accettazione'
//                            security -> 'Controllo'
```

Le zone **misurate** vengono messe in fila da sinistra a destra e ricevono i
cinque nomi d'aeroporto **per posizione**. Nessun riconoscimento entra: la
prima zona a sinistra si chiama «Ingresso / Parcheggio» perche' e' la prima a
sinistra. Su un ospedale direbbe le stesse parole.

⚠️ **Il codice si contraddice da solo, venti righe sopra**, dove e' scritto
l'ordine di autorita' giusto: `bim > nome del modello > occhi > misure >
sequenza posizionale`. La sequenza posizionale e' **l'ultima** della lista, ed
e' quella che comanda la barra.

| | dove | cosa fa |
|---|---|---|
| ✅ sano | `applicaOcchi` 2876 | scrive gia' `type` **e** `label` — non toccare |
| 🔴 | `typeSeq` ~3500 in `applyAutoAssignment` | dipinge la barra, cinque nomi per posizione |
| 🟠 | `order` 2143 / `order2` 2155 | stesse cinque parole, percorsi di riserva |
| 🟠 | `TYPE_OPTIONS_DEF` 276 | stesse cinque parole, tendina dell'editor |

Quattro copie della stessa lista. Toglierne una sola non cambia niente: al
primo modello che passa da un altro ramo del codice tornano.

**La riparazione, in una riga:** le categorie diventano quelle architettoniche
(Regola 0-bis), i nomi arrivano dal circuito, e la sequenza posizionale torna
al posto che il codice stesso le assegna — ultima, e solo quando non c'e'
nient'altro.

**Le aree all'aperto — deciso da Raffaella il 28/08.** «All'aperto» non e' una
ragione per escludere. Se il cervello ha riconosciuto un aeroporto, i
passeggeri arrivano dal parcheggio — e il parcheggio si vede perche' ci sono le
macchine — oppure dagli aerei. **Decide il flusso riconosciuto, non la quota.**
La regola che c'e' adesso nel codice (`escluseFuori` ~3441: «cio' su cui il
pubblico non cammina non e' una tappa») butta via proprio l'inizio del flusso,
ed e' uno stampo d'aeroporto travestito da prudenza. E' il pezzo piu' grosso
dei tre e non e' stato aperto: va fatto con la giornata davanti.

⚠️ Sta nel bundle grosso e tocca barra e marker. Non si comincia con meno del
5% di budget: una modifica interrotta li' dentro e' la situazione peggiore.

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
