# Partire dal file che sa già le cose

## Contesto

Da dieci giorni l'assegnazione automatica delle zone non funziona. L'ultima
prova: **«Ingresso / Parcheggio» sull'ala di un aereo, a quota 3,64 m.**

### La causa vera, ed è di impostazione

Raffaella, 19/08: *«probabilmente avevo sbagliato la base del ragionamento…
il punto per cui ci siamo uccisi la vita è proprio non partire da questo
presupposto.»* **Ha ragione, ed è la cosa più importante detta in dieci
giorni.**

VERITAS riceveva un **GLB scaricato da Sketchfab**. Un GLB è un *export*: è il
formato in cui la semantica è già stata buttata via. Chi ha fatto quel modello
aveva stanze, nomi e funzioni nel suo progetto, e l'esportazione li ha
appiattiti in 2.416 mesh chiamate `Cube.083`.

Stavamo facendo **archeologia su un file a cui la risposta era stata
cancellata.** E la prova che non si poteva vincere è geometrica: la navmesh ha
isole a quota 3,6 m (329, 138, 71 m²) — le ali. **Un'ala e un mezzanino sono
identici**: superficie orizzontale, larga qualche metro, a tre metri e mezzo
da terra, niente sopra la testa. Nessuna misura li distingue. Mai.

### Ogni dominio ha un file d'origine che la semantica ce l'ha

| dominio | file d'origine | cosa porta già dentro |
|---|---|---|
| **architettura** (aeroporti, musei, ospedali) | **IFC / BIM** | `IfcSpace` con nome e funzione, piani, porte, scale, e i property set di sicurezza e affollamento |
| **gioco** | progetto Unity | tag, collider, NavMesh, prefab — dichiarati dal level designer |
| nessuno dei due | GLB nudo | niente: qui e solo qui servono occhi e conferma umana |

Conferma indipendente: gli agenti di Meta che testano i videogiochi (Unity
ML-Agents + PPO) **non deducono cos'è una stanza** — gliela dichiara il
progetto. Nessuno, in nessun campo, deduce la semantica dalla geometria quando
può leggerla.

### ArchiCAD: verificato

- **`.pln` e `.pla` non si leggono.** Formati chiusi di Graphisoft, nessuna
  libreria aperta esiste, e le versioni non sono nemmeno retrocompatibili fra
  loro. Solo ArchiCAD li apre. **Non è una strada.**
- **Ma ArchiCAD esporta IFC nativamente, e le sue Zone diventano `IfcSpace`.**
  Raffaella ha progetti in ArchiCAD: `File → Esporta → IFC` e la risposta
  giusta è nel file.
- ⚠️ **Dettaglio da non sbagliare:** ArchiCAD mette il **nome** della Zona in
  `IfcSpace.LongName` e il **numero** in `IfcSpace.Name`. Leggendo `Name` si
  ottiene «101»; il nome leggibile è in `LongName`.
- Le `IfcSpace` portano anche i property set di sicurezza antincendio,
  illuminazione e affollamento: **entrano diretti nel modulo normativo**, che
  oggi lavora su soglie stimate.

### Il lettore

`web-ifc` v0.0.77 (ThatOpen), **MPL-2.0 → uso commerciale consentito**, gira
nel browser via WebAssembly. A differenza di tutti i dataset 3D annotati
(HSSD, HM3DSem, Replica, ScanNet: tutti CC BY-NC o solo ricerca), qui la
licenza non blocca il prodotto.

### Decisioni prese

- Modello di prova: **uno con la risposta già dentro**.
- **La macchina propone, la persona conferma** (per i modelli senza BIM).
- **Promuovere l'anteprima.**

**Regola di disciplina: nessuna nuova euristica geometrica.** Se una tappa
finisce nel posto sbagliato la risposta non è una soglia in più: è leggere una
dichiarazione, o chiedere.

---

## Passo 0 — Promuovere l'anteprima (5 minuti, subito)

Verificato: avanti veloce pulito, nessun commit da recuperare.

```bash
git push origin claude/veritas-spatial-ai-resume-z0iuw9:veritas-ai-os-preview
```

I quattro lavori di oggi non sono mai stati sullo schermo di Raffaella. E nel
suo browser la rete funziona, quindi **l'occhio può girare per la prima
volta** (da questa macchina `huggingface.co` e `jsdelivr` sono bloccati).

⚠️ Non risolve l'ala. Serve a smettere di decidere alla cieca.

---

## Passo 1 — L'IFC entra come ingresso di prima classe *(la linea principale)*

**Nuovo modulo `veritas_bim.js`** — legge un IFC e ne ricava le zone
*dichiarate*, senza dedurre niente.

- `web-ifc` (MPL-2.0) via importmap, come navcat: non inlinato.
- Da `IfcSpace`: identificativo, **`LongName` come nome** (non `Name`),
  geometria del volume, piano di appartenenza (`IfcBuildingStorey`).
- Da `IfcDoor` / `IfcStair` / `IfcRamp`: i collegamenti reali fra ambienti —
  che è precisamente il dato mancante che produce le 32 isole scollegate.
- Property set (`Pset_SpaceCommon`, occupancy, antincendio) → passati a
  `veritas_normative.js` come **dati dichiarati**, non stimati.

**Come si innesta senza riscrivere niente.** Le zone IFC entrano nella
pipeline esistente con `origine: "bim"`, che diventa **il gradino più alto**
dell'ordine di autorità già in uso (oggi: nome del modello → occhi → misure →
sequenza). `assegnaZoneMisurate` e `__veritasApplicaOcchi` in `index.html`
già rispettano `origine`: una zona `bim` non viene toccata da nessuno.

**Cosa resta a carico della geometria, e non è poco.** L'IFC dice *quali*
stanze ci sono e come si chiamano. Non dice quanto è largo il passaggio libero
con gli arredi dentro, dove si formano le code, quanto ci mette la gente a
uscire. **Tutto il lavoro dei giorni scorsi resta e diventa più forte**, perché
smette di indovinare il *cosa* e torna a fare quello per cui è buono: misurare.

**Caricamento:** `veritas_ingest.js` riconosce già i formati dai byte. Un IFC
è testo che inizia per `ISO-10303-21;` — riconoscimento banale e robusto.

**Prove:** `veritas_bim.test.mjs` su un IFC piccolo scritto a mano (poche
stanze, un nome, un numero, una porta): il nome viene da `LongName` e non da
`Name`; una stanza senza nome non ne inventa uno; un file senza `IfcSpace` lo
dichiara invece di fallire; le porte producono i collegamenti fra stanze.

---

## Passo 2 — La macchina propone, la persona conferma *(per i file senza BIM)*

Non più la soluzione universale: il **ripiego onesto** per un GLB nudo.

**File: `index.html` blocco 2** (`assegnaZoneMisurate`,
`__veritasZoneSulCammino`, `__veritasApplicaOcchi`, pannello «PUNTI»).

1. Ogni zona porta `confermata: false` e una `fiducia` 0–1 ricavata da quello
   che c'è già (fiducia del rilevatore, se sta su un arredo misurato, se
   l'isola è collegata). Una zona `origine: "bim"` nasce **confermata**.
2. Si vede a colpo d'occhio: proposta ≠ confermata, nell'elenco e sul modello.
3. Confermare è un clic; **spostare una zona la conferma** (l'editor c'è già).
4. La chat **chiede** dove non sa, via `__veritasAnnounce`: *«c'è una
   superficie piatta di 329 m² a 3,6 m, staccata dal resto: è un mezzanino
   senza scale o è qualcosa su cui non si cammina?»*
5. `veritas_referto.js` dichiara quante zone vengono dal BIM, quante confermate
   da una persona, quante accettate in silenzio.

**Prove:** nuovo `veritas_conferma.test.mjs` + le 30 esistenti di
`veritas_zone.test.mjs`.

---

## Passo 3 — L'occhio guarda di sbieco, non a piombo

Correttivo strutturale al ripiego, non un ritocco. I rilevatori sono
addestrati su **fotografie**: un'automobile vista a piombo è un rettangolo. La
ricerca lo quantifica — i VLM generici sulle piante architettoniche prendono
il **33–38%**.

**File: `veritas_vista.js`** (accanto a `piantaDelPavimento`, che resta e
serve alla segnaletica) e **`veritas_riconosce.js`**.

- `vistePanoramiche(THREE, renderer, radice, {quante: 8})` → viste
  prospettiche da ~30–45°, **restituendo la matrice di camera di ciascuna**.
- **Il ritorno al 3D si fa al contrario, ed è la parte robusta:** non si
  disproiettano le scatole, si **proiettano i mucchi già misurati dentro
  l'immagine** e si guarda quale scatola li contiene. Nessuna ambiguità di
  profondità, e la coordinata resta quella misurata.
- **Voto fra le viste:** un mucchio riconosciuto da cinque viste su otto è
  quello; da una sola, è un dubbio → va al Passo 2. È l'associazione
  multi-vista di ConceptGraphs.
- `abbina()` non cambia: cambia solo da dove arrivano le rilevazioni.

---

## Passo 4 — Le isole irraggiungibili si dichiarano, non si usano

**File: `veritas_cose.js` (`appoggiaTappe`)** e **`index.html`
(`__veritasZoneSulCammino`)**.

- Una zona sta **solo** sull'isola collegata al resto del percorso. Un'isola
  scollegata non ospita tappe, mai.
- E non si tace: si dice quante isole restano fuori, quanto sono grandi, a che
  quota, e **si chiede** cosa siano (Passo 2, punto 4).
- Con l'IFC il problema in buona parte sparisce: `IfcStair` e `IfcRamp`
  dichiarano i collegamenti che nel GLB non c'erano.

---

## Cosa NON si fa

- Nessuna soglia geometrica per distinguere un'ala da un mezzanino: **non è
  distinguibile per geometria**, e provarci è il ciclo di dieci giorni.
- Non si prova a leggere `.pln` / `.pla`: formati chiusi, nessuna libreria.
- Non si tocca il blocco 3 di `index.html` (sha `eedd9935ea908fd3`).
- Non si spinge su `main`.
- Non si usano le figure umane per decidere dove vanno le zone: restano la
  controprova.

---

## Verifica

**Senza browser:**
```bash
for t in veritas_*.test.mjs; do node "$t" >/dev/null || echo "$t KO"; done
node veritas_bim.test.mjs        # nuovo, Passo 1
node veritas_conferma.test.mjs   # nuovo, Passo 2
```

**Con browser e file veri:**
```bash
sh banco/monta.sh
(cd banco && python3 -m http.server 8899 &)
node banco/bim.mjs <file.ifc>    # nuovo: stanze dichiarate vs zone dedotte
node banco/occhio.mjs            # il giro dell'occhio (oggi 6/6)
node banco/controprova.mjs       # zone vs persone
```

**Il primo numero onesto che avremo mai avuto:** su un IFC con N stanze
dichiarate, quante ne indovina VERITAS partendo dalla sola geometria. Finora
non c'era modo di saperlo.

**Il numero da battere, misurato oggi sul GLB:** 3 tappe su 7 su arredi veri,
3% delle persone con una zona vicina, distanza mediana 16,1 m.

**E il controllo che non è un numero:** sull'anteprima, caricare un modello e
guardare. Le zone incerte devono dichiararsi tali, e correggerne una deve
costare un clic.

---

## Il file di prova

**Serve un IFC architettonico vero, con le Zone.** Verificato:
`raw.githubusercontent.com` è raggiungibile da qui, quindi posso scaricarne
uno — ma il primo trovato era un file strutturale con una sola `IfcSpace`
sbagliata (una trave). Occorre cercarne uno buono.

**Meglio ancora: un export IFC da un progetto ArchiCAD di Raffaella.** È un
edificio vero, con la sua nomenclatura, nel suo dominio. Vale più di qualsiasi
campione. Basta `File → Esporta → IFC`, e per la prova va bene anche un
progetto piccolo.

---

## Il modulo gioco (non in questo piano, ma va detto ora)

⚠️ **«Ti serve il file di Unity» è giusto come idea, ma non come meccanica.**
Una scena Unity è un YAML che referenzia gli asset per GUID: serve il progetto
intero, e non si legge in un browser. Le due strade vere sono:

1. **Un piccolo esportatore dentro Unity** (uno script C#) che scrive tag,
   collider, NavMesh e nomi delle stanze accanto al GLB. Terreno di casa per
   chi sviluppa in XR.
2. **glTF con `extras`**: Unity esporta il GLB e ci attacca la semantica nodo
   per nodo.

In tutti e due i casi VERITAS legge **un file di accompagnamento dichiarato**,
esattamente come legge `IfcSpace`. Stessa forma, sorgente diversa.
