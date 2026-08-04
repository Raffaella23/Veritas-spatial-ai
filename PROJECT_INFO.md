# VERITAS Spatial AI — Riepilogo progetto (per Claude Code)

> Preparato da Claude (chat) dopo una sessione di sviluppo diretta sul file live. Contiene tutto quello che serve per continuare senza dover ripartire da zero.

---

## 1. Cos'\''e il progetto

**Prodotto**: motore che analizza uno spazio reale (aeroporto, poi museo/gaming) da un modello 3D `.glb`, simula il flusso di persone al suo interno, e mostra una visualizzazione 3D con telecamere multiple + KPI (flusso, tempo di transito, saturazione, conformita normativa).

**Cliente target**: piattaforma multi-utente a pagamento — ogni utente fa login, carica il proprio `.glb`, posiziona i punti di interesse (ingresso, controllo, gate...) e ottimizza la simulazione per il proprio spazio.

**Chi**: Raffaella (RC XRArch), architetto + sviluppatrice XR, Meta Horizon Partner.

**Repo**: https://github.com/Raffaella23/Veritas-spatial-ai
**File principale**: `Veritas-Spatial-57MB-Ready.html` (nome storico, in realta ~920KB)
**Pages live**: https://raffaella23.github.io/Veritas-spatial-ai/Veritas-Spatial-57MB-Ready.html

---

## 2. Architettura del file

Il file e **un'\''unica pagina HTML autonoma** composta da 3 parti, in quest'\''ordine nel sorgente:

1. `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js">` — libreria Supabase (classic script, espone `window.supabase`)
2. `<script>...</script>` — **script "boot"** scritto da zero in questa sessione: login/registrazione, gestione progetti multi-utente, editor punti/hotspot, slider scala passeggeri. Non minificato, leggibile, ~21KB.
3. `<script type="module">...</script>` — **bundle React/Three.js minificato** (esbuild output, variabili tipo `iB`, `hK`, `hV`, nomi a 1-2 lettere). Questo e il "vecchio" viewer, NON riscritto da zero ma **modificato chirurgicamente** con edit puntuali (vedi sezione 4).

**Perche questa struttura**: il bundle minificato e troppo rischioso da riscrivere interamente (variabili minificate riusate in scope diversi — vedi errori passati in questo stesso progetto). Si e scelto di:
- Lasciare il bundle intatto dove possibile
- Esporre riferimenti interni chiave su `window.__veritas*` con edit minimi e verificati (uno per volta, con `node --check` prima di ogni push)
- Costruire TUTTA la logica nuova (auth, editor, analisi mesh) nello script "boot" separato, che parla col bundle solo tramite queste variabili globali

**I due script vengono eseguiti in ordine, PRIMA del bundle** (script classici non-module eseguono in ordine di apparizione). Questo e essenziale: `window.__veritasBoot` deve esistere gia quando il bundle arriva alla sua ultima riga (che ora aspetta il boot prima di montare React).

---

## 3. Stato Supabase (multi-utente)

**Project URL**: `https://neeykmvfwwjpdpbcqcdm.supabase.co`
**Anon/public key** (gia nel codice, non e segreta): `sb_publishable_C5R-fyvf7NKa-Zg2jtH8jA_lckexRNC`

**Schema** (gia eseguito con successo in SQL Editor):
```sql
create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Nuovo progetto',
  project_type text not null default 'aeroporto' check (project_type in ('aeroporto','museo','gaming')),
  glb_filename text,
  glb_bbox jsonb,
  nodes_config jsonb not null default '[]'::jsonb,
  camera_config jsonb not null default '[]'::jsonb,
  sim_params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.projects enable row level security;
create policy "select_own_projects" on public.projects for select using (auth.uid() = user_id);
create policy "insert_own_projects" on public.projects for insert with check (auth.uid() = user_id);
create policy "update_own_projects" on public.projects for update using (auth.uid() = user_id);
create policy "delete_own_projects" on public.projects for delete using (auth.uid() = user_id);
create or replace function public.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
create trigger trg_projects_updated_at before update on public.projects for each row execute function public.set_updated_at();
create index if not exists idx_projects_user_id on public.projects(user_id);

-- eseguito DOPO per fix permessi (avendo disattivato "auto-expose new tables" alla creazione progetto):
grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on public.projects to authenticated;
```

**Auth → URL Configuration** gia impostato: Site URL e Redirect URL puntano a `https://raffaella23.github.io/Veritas-spatial-ai/Veritas-Spatial-57MB-Ready.html`.

**Non ancora fatto**: bucket Storage per salvare il `.glb` stesso (per ora l'\''utente lo ricarica ogni volta; solo `nodes_config`/`camera_config` sono persistenti per progetto).

---

## 4. Edit fatti dentro il bundle minificato (riferimento esatto)

Questi sono i punti esatti modificati nel bundle originale (utile se serve rifare o capire cosa toccare):

| Cosa | Edit |
|---|---|
| Array hotspot demo `iB=[...]` | Sostituito con `iB=(window.__veritasInitialNodes&&window.__veritasInitialNodes.length?window.__veritasInitialNodes:[...originale...])` |
| Array telecamere `hK=[...]` | Wrappato in una IIFE che parte dal default (con le icone originali) e sovrascrive solo `pos/target/label/sub` da `window.__veritasInitialCameras` se presente |
| Jitter random passeggeri | `*0.15` → `*0.015` (ridotto il "vagare a caso", non eliminato — da solo oscillazione naturale del passo) |
| Scena Three.js (`new AK`) | Esposta come `window.__veritasScene` |
| Camera (`new mQ(...)`) | Esposta come `window.__veritasCamera` |
| Renderer + canvas | Esposti come `window.__veritasRenderer` e `window.__veritasCanvasEl` |
| OrbitControls | Esposto come `window.__veritasControls` |
| Gruppo pillar hotspot (`aA`) | Esposto come `window.__veritasHotspotGroup` — **i figli di questo gruppo sono creati in ordine 1:1 con `W.nodes`**, ogni nodo produce 3 mesh consecutivi aggiunti al gruppo (pillar + cerchio + sprite etichetta), NON un sottogruppo unico per nodo — **da sistemare per poter spostare un singolo pillar senza ricreare tutto** (vedi sezione 5, bug aperto) |
| Modello GLB caricato (`U.current`) | Esposto come `window.__veritasModelRoot` |
| Mappa gruppi passeggeri (`QE`/`C.current`) | **NON ancora esposta su window** — da fare per poter cambiare la scala/aspetto dei passeggeri senza ricostruire la scena (vedi bug aperto sotto) |
| Setter stato traiettoria (`[W,V]=useState`) | Esposto come `window.__veritasSetTrajectory` (=V) e `window.__veritasGetTrajectory` (=()=>W) |
| Riga finale di mount React | Ora aspetta `window.__veritasBoot(renderFn)` invece di montare subito |
| Funzione costruzione passeggero `lV(A)` | Aggiunto `Q.scale.setScalar(window.__veritasPassengerScale||1)` prima del return, per scala iniziale regolabile |

**✅ RISOLTO (commit 3e8cf95)** — Attenzione critica trovata in una sessione precedente, ora risolta: l'\''intero effetto React che crea scena/camera/renderer/controls/pillar/passeggeri **ha `[W]` (stato traiettoria) come dipendenza** — quindi si RICOSTRUISCE DA ZERO ogni volta che viene chiamato `window.__veritasSetTrajectory(...)`. Questo distrugge il modello GLB caricato (che vive in un ref/effect separato e non viene riaggiunto alla nuova scena). Il pannello "Rigenera simulazione" e lo slider "Scala passeggeri" ATTUALMENTE causano questo bug (il modello sparisce). **La soluzione corretta, iniziata ma non completata**: smettere di chiamare `setTrajectory` per aggiornamenti live, e invece:
1. Mutare `window.__veritasGetTrajectory().nodes` e `.frames` **in-place** (stessi riferimenti array, solo contenuto cambiato) — cosi React non rileva cambio di stato e non ricostruisce nulla
2. Muovere direttamente i mesh dei pillar dentro `window.__veritasHotspotGroup.children[...]` (nota: 3 figli per nodo, indici `i*3`, `i*3+1`, `i*3+2` circa — da verificare con precisione)
3. Esporre la mappa passeggeri (`C.current` → `window.__veritasPassengerGroups`) e chiamare `.scale.setScalar()` direttamente sui gruppi esistenti per il cambio scala, senza toccare lo stato React

---

## 5. Bug aperti / prossimi passi (in ordine di priorita, dalla sessione con la cliente)

1. **DONE (commit 3e8cf95)** — Spostamento punti esistenti e slider scala passeggeri ora aggiornano gli oggetti Three.js direttamente (mutazione in-place di nodes/frames, mesh pillar spostati via window.__veritasHotspotGroup.children[i*3..i*3+2], scala passeggeri via window.__veritasPassengerGroups esposto), senza mai chiamare setTrajectory per aggiornamenti live — il modello GLB non sparisce piu.
2. **DONE (commit 3e8cf95)** — Grip visivo: quando un punto e selezionato appare un anello blu pulsante (#veritas-grip, overlay DOM) che segue la posizione proiettata del punto sullo schermo ad ogni frame (proiezione mondo-schermo manuale, nessuna dipendenza da Three.js esterno).
3. **DONE (commit 3e8cf95)** — Analisi automatica mesh: funzione analyzeMesh() nello script boot — cerca prima nomi oggetti nel GLB (keyword matching multilingua: ingresso/entrance/parking, checkin/reception, security/varco/gate, lounge/attesa, gate/imbarco/boarding), fallback su bounding box + asse lungo se non trova nomi utili. Gira in automatico al primo caricamento GLB per un progetto senza punti salvati (hook window.__veritasOnModelLoaded), piu bottone manuale "Rianalizza mesh" nel pannello.
   - Nota per iterazioni future: il matching per nome resta un substring matching su keyword IT/EN; se i GLB dei clienti hanno naming poco descrittivo, il fallback geometrico entra in gioco spesso — un'euristica piu sofisticata (es. rilevare corridoi/varchi da densita di geometria, o clustering dei nodi di navigazione come nel vecchio topology_analyzer.py Python) resta un miglioramento futuro valido, non urgente.
4. Bucket Supabase Storage per salvare il .glb stesso (oggi si ricarica manualmente ogni volta)
5. Editor per le telecamere (oggi solo i nodi/hotspot sono editabili dal pannello, le 7 telecamere preset restano fisse)
6. Rimossa la dipendenza da three@0.160.0 via CDN (unpkg) introdotta in una sessione precedente — non piu necessaria, tutta la matematica di proiezione/raycasting ora e manuale (funzioni mat4xVec4, projectToScreen, unprojectToFloor nello script boot), piu robusta e senza rischio di incompatibilita cross-libreria.

---

## 6. Riferimento storico — Core Python (esiste ma NON e collegato a questo viewer)

Il repo contiene anche un **motore Python separato** (cartella `Assets/core/`) piu maturo concettualmente ma mai collegato al viewer HTML attuale:
- `topology_analyzer.py` — carica `.glb`, rileva scala mm→m, clustering KMeans dei punti navigabili, tagga nodi per dominio da nomi oggetti, rileva ingressi/parcheggi come nodi periferici
- `agent.py` — `HumanAgent` con contagio emotivo dello stress + coesione di gruppo (Social Force Model, Helbing 1995)
- `behaviour.py`, `compliance.py` (regole VVFF reali), `path_loader.py`, `engine.py` (KPI reali + traiettoria)
- `main.py` — orchestratore, chiama l'\''API reale OpenSky Network per traffico aereo vero su Fiumicino/LIRF

**Il viewer HTML attuale NON legge nessun output di questo Core Python** — la label "KPI - LIVE DA PYTHON CORE" nell'\''interfaccia e decorativa/ereditata da una versione precedente. Tutta la simulazione visibile oggi (traiettorie, KPI mostrati) e generata client-side in JS (funzione `hV()` nel bundle + la mia `generateTrajectory()` nello script boot). Decidere se e quando ricollegare il Core Python reale e una decisione architetturale futura, non urgente per lo sblocco dei bug attuali.

---

## 7. File legacy da NON toccare come base di codice

`V12.html`, `V13.html`, `V17.html`, `Veritas-V18.html`, `Veritas1607.html` nella root del repo — versioni precedenti autonome, utili solo come riferimento visivo/UX, non collegate all'\''architettura attuale.


---

## 8. Aggiornamento sessione successiva (dopo commit 3e8cf95)

**Nota importante**: questo documento NON viene aggiornato automaticamente dopo ogni sessione di lavoro — va richiesto esplicitamente o l'assistente deve ricordarsene da solo. Tra il commit 3e8cf95 e questo aggiornamento sono stati fatti diversi commit non documentati qui sopra. Riepilogo:

- **Livello 1 — analisi geometrica reale**: `extractNavigablePoints()`, `kmeansCluster()`, `clusterWidths()` (PCA per corridoi), `runStructuralAnalysis()`, bottone "Report struttura" con score/zone/criticità. Filtra mesh con impronta fuori scala (piste/piazzali) usandole pero come riferimento direzionale lato-terra/lato-volo per ordinare i punti con un criterio di flusso reale (non piu solo nearest-neighbor).
- **Multilingua IT/EN**: dizionario `I18N` + funzione `t()` nello script boot. Copre login, registrazione, lista progetti, pannello punti, report struttura. NON copre il testo dentro il bundle minificato originale (nomi telecamere, etichette KPI a destra, "CAMERE - 7 PRESET" ecc.) — resta italiano, e sarebbe un lavoro a parte piu rischioso.
- **Pannello punti agganciabile**: parte collassato di default (solo tab "Punti"), si trascina dall'intestazione, posizione salvata in localStorage — non copre piu altre parti dell'interfaccia.
- **Marker con dimensione regolabile**: slider "Dimensione marker selezionato" (0.05x-6x) quando un punto e selezionato, sostituendo il precedente slider minuscolo per riga.
- **Telecamere agganciate ai nodi**: `syncCamerasToNodes()` aggiorna pos/target delle 7 telecamere preset in base ai punti reali quando questi si spostano (mappatura fissa per id: varco/controllo->security, imbarco/gateA->gate, lounge->lounge, accettazione->checkin).
- **[IMPORTANTE] Supporto mesh multipiano**: fino a questo punto TUTTO il sistema forzava la quota Y a 0 (punti, passeggeri, telecamere) — su una mesh a piu livelli i passeggeri finivano sempre a terra invece che al piano reale. Risolto in piu punti:
  - `detectFloorLevels()` raggruppa i punti navigabili in fasce di quota (gap >1.5m = nuovo piano), risultato in `lastFloorLevels`
  - Le zone rilevate ora portano la Y reale (`zone.pos[1]`) e un `floorIdx` assegnato al piano piu vicino
  - `analyzeMesh()` e i punti auto-suggeriti preservano la quota reale invece di azzerarla
  - **Bug nel bundle originale trovato e corretto**: il codice che applica ogni frame la posizione ai passeggeri (`dA.group.position.set(h,0,b)`, vicino alla stringa `leftHip` nel bundle) ignorava completamente `pos[1]`. Aggiunta variabile `yQ` che legge/interpola la quota reale, sostituendo lo `0` hardcoded — 5 edit puntuali nel bundle, verificati con `node --check` prima del push
  - `generateTrajectory()` ora interpola anche la Y tra un nodo e il successivo (i passeggeri salgono/scendono, non solo si spostano in piano)
  - Il click di posizionamento manuale (`unprojectToFloor`) ora prova ogni livello rilevato e sceglie quello con punti navigabili vicini nel raggio di 3m, invece di intersecare sempre il piano y=0
  - Il report struttura mostra ora "LIVELLI RILEVATI" e l'indicazione di piano per ogni zona

**Prossimi passi aperti** (non affrontati in questa sessione): Livello 2 (ragionamento AI vero con Claude via backend/Supabase Edge Function, richiede chiave API Anthropic separata), bucket Storage per il `.glb`, editor dedicato per le 7 telecamere, traduzione del testo dentro il bundle minificato.


---

## 9. Sessione realismo simulazione (in corso)

Richiesta cliente: il flusso passeggeri attuale e un'unica sequenza standard identica per tutti gli agenti — non realistico. Da migliorare in ordine, con commit + aggiornamento di questo file ad ogni passo:
1. Distribuzione su piu gate/destinazioni diverse (non tutti allo stesso gate)
2. Code reali che si accumulano ai varchi stretti (non solo attesa "invisibile")
3. Evitamento ostacoli (i percorsi sono linee rette, non navigano attorno a muri reali)
4. Evitamento tra agenti (possono sovrapporsi)

Inoltre richiesto: le telecamere devono essere sensibili a dove si trova realmente il flusso passeggeri, non fisse su coordinate assolute pensate per edifici a quota zero. E una schermata di "impostazioni prima di avviare" la simulazione invece di partire subito con i default.

**FATTO (commit 0c1194b)**: bug critico — i passeggeri risultavano invisibili/sotto il pavimento su edifici con quota reale diversa da 0. Causa: la telecamera "Global" (vista dall'alto) aveva pos/target fissi assoluti ([0,80,0] / [0,0,0]), scollegati dalla quota reale rilevata dopo il fix multipiano della sessione precedente. `syncCamerasToNodes()` ora calcola la quota media dei nodi correnti e riposiziona la camera Global di conseguenza ad ogni sincronizzazione.

**Ancora da fare**: i 4 punti di realismo sopra elencati, la UX "impostazioni poi avvio simulazione".


**FATTO (commit 385635d)**: `generateTrajectory()` riscritta per supportare percorsi divergenti — ogni agente segue un tronco condiviso (ingresso->accettazione->controllo->lounge, solo i tipi effettivamente presenti) poi devia verso UNO dei gate disponibili (round robin per gruppo/famiglia, cosi chi viaggia insieme arriva allo stesso gate). Aggiunta anche una coda visibile reale al controllo sicurezza: gli agenti in stato WAITING si dispongono in fila su 2 colonne dietro il varco invece di sovrapporsi nello stesso punto, con ordine di coda stabile basato sull'orario di arrivo. Se non ci sono gate multipli o nodi di tipo riconosciuto, ripiega sul comportamento precedente (percorso unico condiviso) per sicurezza.

**Ancora da fare**: evitamento ostacoli (percorsi ancora rettilinei tra i nodi, non navigano attorno a muri reali della mesh), evitamento tra agenti (possono sovrapporsi), schermata "impostazioni poi avvio simulazione".


**FATTO (commit 58ad7e3)**: evitamento ostacoli. Nuove funzioni `lineHasSupport()` (verifica se una linea retta tra due punti passa vicino a punti navigabili reali campionati, altrimenti la considera "bloccata"), `buildZoneGraph()` (collega tra loro le zone rilevate dall'analisi se il collegamento diretto e libero), `dijkstra()` (cammino minimo nel grafo), `findRoute()` (usa la linea diretta se libera, altrimenti passa per le zone). Il percorso di ogni agente viene ora "espanso" con `expandRoute()` inserendo waypoint intermedi dove serve — quindi gli agenti girano attorno a muri/ostacoli reali invece di attraversarli in linea retta. Funziona solo se e stata gia fatta un'analisi (Rianalizza mesh / Report struttura) in questa sessione, altrimenti ripiega sul comportamento precedente (linea diretta) per sicurezza.

**Ancora da fare**: evitamento tra agenti (possono ancora sovrapporsi), schermata "impostazioni poi avvio simulazione".


**FATTO (commit 38b4e3b)**: evitamento tra agenti. Nuova funzione `resolveOverlaps()` chiamata ad ogni frame gia calcolato — se due agenti sono piu vicini di 0.55m si spingono via a meta ciascuno lungo la normale tra le loro posizioni, con 3 iterazioni per stabilizzare i gruppi piu fitti (es. in coda al controllo). Gli agenti gia arrivati a destinazione (stato ARRIVED) sono esclusi dal calcolo.

**Con questo commit sono COMPLETATI tutti e 4 i punti di realismo richiesti dalla cliente in questa sessione**:
1. Distribuzione su piu gate (commit 385635d)
2. Code reali al controllo sicurezza (commit 385635d)
3. Evitamento ostacoli — routing sulle zone reali (commit 58ad7e3)
4. Evitamento tra agenti (commit 38b4e3b)

**Ancora aperto, non affrontato in questa sessione**: schermata "impostazioni poi avvio simulazione" (oggi la simulazione parte subito con i default invece di permettere di configurare tutto prima), scala passeggeri di progetti salvati prima del cambio di default (0.12x) che restano al valore vecchio salvato finche non si risalva manualmente, Livello 2 (AI vera con report/score via backend), bucket Storage per il .glb, editor dedicato telecamere, traduzione testo dentro il bundle minificato.

---

## 10. Sessione successiva — impostazioni pre-avvio, spawn multipli, dati reali, movimento intelligente

**FATTO (commit 7ca88d9)**: schermata "impostazioni poi avvio simulazione". Dopo l'apertura/creazione di un progetto, prima che la scena 3D venga montata, appare uno schermo con due slider — scala passeggeri (0.02x-1x, precompilato dal valore salvato o 0.12 di default) e numero di passeggeri (6-60, precompilato dal valore salvato o 28 di default, prima era una costante fissa nel codice) — e un pulsante "Avvia simulazione" che applica i valori e solo allora sblocca il rendering. Testi aggiunti in IT/EN nel dizionario I18N esistente. Il numero di passeggeri viene ora salvato insieme alla scala passeggeri nei sim_params del progetto.

**FATTO (commit fb6fd2a)**: spawn multipli. `generateTrajectory()` prima usava solo il primo nodo di tipo "spawn" trovato (`nodes.find`), quindi tutti gli agenti partivano dallo stesso punto. Ora usa `nodes.filter(nd => nd.type === "spawn")`: se il progetto ha piu' varchi/ingressi definiti, i gruppi di agenti (famiglia/comitiva) vengono distribuiti su tutti round-robin, ognuno con il proprio percorso in cache (chiave varco+gate). Se c'e' un solo spawn o nessuno, il comportamento resta identico a prima (compatibilita' con i progetti esistenti).

**Verifica importante sui dati reali Fiumicino (OpenSky)**: prima di implementare, controllato lo stato reale — l'API OpenSky Network **non fornisce e non ha mai fornito numeri di passeggeri** (solo dati ADS-B: velivoli, non persone a bordo), e l'endpoint arrivi per aeroporto e' aggiornato a batch (dati del giorno precedente, non in tempo reale) e sta passando a autenticazione OAuth2 obbligatoria (client_id/secret), non piu' accesso anonimo libero. Il Core Python separato che chiamava OpenSky non e' mai stato collegato al viewer HTML (la label "KPI - LIVE DA PYTHON CORE" e' decorativa/ereditata, confermato gia' in sezione 6).

**FATTO (commit 7d3050e)**: stima passeggeri da traffico aereo reale Fiumicino (OpenSky), opt-in. Nella schermata impostazioni, pulsante "Stima da traffico aereo reale" che: chiede una volta sola client_id/client_secret OpenSky (salvati solo in localStorage del browser, mai inviati altrove), ottiene un token OAuth2, interroga `flights/arrival` su LIRF per la finestra 24h piu' recente disponibile, e mappa il numero di voli su un valore stimato dello slider passeggeri. In caso di errore (credenziali sbagliate, servizio irraggiungibile, problemi CORS) ripiega senza rompere la schermata, lasciando lo slider manuale.

**Limite dichiarato in interfaccia e qui per chiarezza** (verificato via documentazione ufficiale OpenSky prima di scrivere il codice): OpenSky **non fornisce numeri di passeggeri** (solo dati ADS-B su velivoli/voli), l'endpoint arrivi e' aggiornato a batch — dati del giorno precedente, non in tempo reale — e l'accesso anonimo e' in dismissione a favore di OAuth2 client_credentials. Il numero mostrato e' quindi una stima approssimativa (voli x media passeggeri/volo), non un dato ufficiale in tempo reale. Non e' stato possibile testare dal vivo in un browser reale se l'endpoint di token OpenSky accetta richieste CORS da pagina statica: da verificare al primo utilizzo reale.

**FATTO (commit 0d96712)**: movimento passeggeri meno lineare. Nessuna modifica alla logica di stato/coda (troppo delicata, non toccata): solo il calcolo visivo della posizione dentro ogni segmento del percorso.
- Interpolazione "eased" (ease-in-out) al posto di quella lineare: l'agente rallenta leggermente vicino alle svolte e accelera a meta' segmento, invece di muoversi a velocita' costante su ogni tratto rettilineo.
- Nuova griglia di densita' locale ricalcolata ad ogni frame dalle posizioni del frame precedente: il serpeggio laterale di ciascun agente si amplifica nelle zone piu' affollate (fino a 1.6x), per un effetto "si scansano di piu' dove c'e' piu' gente" senza toccare l'evitamento reale (resolveOverlaps, invariato).
- Aggiunto un meandro lento e ampio (periodo ~37s) diverso per ogni agente, cosi' il percorso non sembra sempre lo stesso "corridoio a 3 corsie" ripetuto identico da tutti.
- **Nota onesta**: non e' collegato a nessun dataset reale di comportamento passeggeri (non ne esiste uno accessibile via API pubblica collegabile a una pagina statica) — resta un modello procedurale euristico, piu' vario e organico di prima ma non basato su dati reali. Il Social Force Model vero (Helbing 1995, contagio dello stress, coesione di gruppo) esiste solo nel Core Python separato, mai collegato al viewer.

**Con questi 3 commit sono completati i punti richiesti dalla cliente in questa sessione**: schermata impostazioni pre-avvio, spawn multipli, stima OpenSky opt-in, movimento meno lineare/piu' organico.

---

## 11. Backend Core Python — predisposto ma NON ATTIVATO (commit 1cdfb3c)

Decisione presa con la cliente: collegare il Core Python reale invece di continuare a duplicare la logica in JS. Nessun file del Core (`engine.py`, `agent.py`, `behaviour.py`, `compliance.py`, `path_loader.py`, `topology_analyzer.py`) e' stato toccato, come richiesto.

**Nuovi file (root del repo)**:
- `api_server.py` — wrapper FastAPI, due endpoint:
  - `POST /api/analyze-topology` — scarica un .glb da URL pubblico, esegue `TopologyAnalyzer`, restituisce il grafo di navigazione (`{"nodes":..., "mission_profiles":...}`)
  - `POST /api/simulate` — prende un grafo + lista agenti, fa girare `SimulationEngine` reale per N tick, restituisce KPI veri (flusso, tempo transito, saturazione, violazioni compliance — non piu' decorativi) + traiettoria per il viewer
  - `GET /health`
- `requirements.txt` — fastapi, uvicorn, pydantic, requests, numpy, trimesh, scikit-learn, plotly
- `render.yaml` — blueprint per deploy su Render (non applicato finche' non colleghi manualmente il repo su render.com)

**Verificato prima del commit** (nel sandbox, non in produzione): import reale contro il codice vero del Core = OK; test funzionale end-to-end di `/api/simulate` con un grafo minimo sintetico (3 nodi, 1 agente, 50 tick) = OK, KPI e traiettoria generati correttamente. **Non testato**: `/api/analyze-topology` con un .glb reale (serve un file vero, non disponibile in questa sessione) — da verificare al primo utilizzo reale.

**Per attivare (quando deciso)**:
1. render.com -> New -> Blueprint -> collega il repo Raffaella23/Veritas-spatial-ai (legge `render.yaml` automaticamente)
2. Scegli piano Starter (~7$/mese, sempre attivo) o Free per test (si addormenta dopo inattivita', 30-60s di risveglio — sconsigliato per demo a clienti)
3. Copia l'URL pubblico assegnato da Render
4. Da fare quando si attiva: aggiungere nel viewer HTML un campo "URL Core API" (impostazioni) che punta a quell'URL, e sostituire la generazione traiettoria/KPI lato client con una chiamata a `/api/simulate` quando configurato — non ancora fatto, e' il prossimo passo dopo l'attivazione.

Prossimo lavoro con questo backend (deciso con la cliente): Fase 5-6 della roadmap (motore di raccomandazioni + revenue/decision report), verticale ancora da confermare tra aeroporti/musei/generico.

---

## 12. Fase 5 — motore di raccomandazioni (commit 6768155)

`Assets/core/recommendations.py` (nuovo file, nessun file esistente del Core toccato): funzione `generate_recommendations(kpi, context)` che legge il KPI report di `SimulationEngine` e produce una lista di raccomandazioni (problem/cause/recommendation/priority/expected_improvement/stima impatto revenue mensile). Regole: saturazione checkpoint >70% = priorita' alta, 40-70% = media; tempo di transito >30% oltre un ideale di 100s; violazioni compliance sempre priorita' alta; rallentamenti eccessivi rispetto ai completamenti = collo di bottiglia strutturale.

`benchmarks.json` (nuovo): numeri di riferimento per stimare l'impatto in euro/mese (spesa airside aeroportuale, dwell time, capacita' oraria/prezzo biglietto musei). Fonti miste (report reali + stime dichiarate come tali nel file — vedi campo "notes" per ciascun settore, da validare meglio con dati proprietari quando disponibili).

`api_server.py`: nuovo endpoint `POST /api/recommendations` (kpi + domain -> lista raccomandazioni), carica benchmarks.json all'avvio.

**Bozza generata da un altro modello (Gemini/ChatGPT) su specifica esatta preparata da Claude (schema KPI, firma funzione, regole di soglia)**, poi verificata da Claude prima del push: ricostruito l'ambiente reale con tutte le dipendenze, test funzionale end-to-end della funzione + dell'endpoint con un KPI di esempio — output corretto.

Ancora da fare: il backend resta NON attivato (vedi sezione 11) — questo endpoint esiste nel codice ma non e' raggiungibile finche' non si attiva un hosting.
