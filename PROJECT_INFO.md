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

**Attenzione critica trovata in questa sessione, NON ancora risolta**: l'\''intero effetto React che crea scena/camera/renderer/controls/pillar/passeggeri **ha `[W]` (stato traiettoria) come dipendenza** — quindi si RICOSTRUISCE DA ZERO ogni volta che viene chiamato `window.__veritasSetTrajectory(...)`. Questo distrugge il modello GLB caricato (che vive in un ref/effect separato e non viene riaggiunto alla nuova scena). Il pannello "Rigenera simulazione" e lo slider "Scala passeggeri" ATTUALMENTE causano questo bug (il modello sparisce). **La soluzione corretta, iniziata ma non completata**: smettere di chiamare `setTrajectory` per aggiornamenti live, e invece:
1. Mutare `window.__veritasGetTrajectory().nodes` e `.frames` **in-place** (stessi riferimenti array, solo contenuto cambiato) — cosi React non rileva cambio di stato e non ricostruisce nulla
2. Muovere direttamente i mesh dei pillar dentro `window.__veritasHotspotGroup.children[...]` (nota: 3 figli per nodo, indici `i*3`, `i*3+1`, `i*3+2` circa — da verificare con precisione)
3. Esporre la mappa passeggeri (`C.current` → `window.__veritasPassengerGroups`) e chiamare `.scale.setScalar()` direttamente sui gruppi esistenti per il cambio scala, senza toccare lo stato React

---

## 5. Bug aperti / prossimi passi (in ordine di priorita, dalla sessione con la cliente)

1. **[BUG CRITICO] Spostare un punto esistente non funziona + slider scala passeggeri fa sparire il modello** — causa radice diagnosticata sopra (sezione 4, riquadro "Attenzione critica"). Serve completare il fix non-distruttivo.
2. **[FEATURE RICHIESTA DALLA CLIENTE] "Grip" visivo sul punto selezionato** — quando un punto e selezionato per essere riposizionato, deve avere un indicatore visivo chiaro (gizmo/anello pulsante/handle) che comunichi "questo si sta muovendo", non solo l'\''evidenziazione nella lista laterale.
3. **[FEATURE RICHIESTA DALLA CLIENTE — importante, priorita alta] Analisi automatica della mesh via AI/algoritmo**, non punti "a caso": la cliente ha esplicitamente detto che il sistema deve poter *leggere* la geometria del `.glb` caricato e suggerire punti di partenza sensati (ingresso, corridoi, gate...), che poi l'\''utente ottimizza manualmente — non lasciare che l'\''utente parta da zero o da coordinate demo scollegate dal modello reale. Approccio suggerito (non ancora implementato):
   - Analizzare i nomi degli oggetti mesh nel GLB caricato (keyword matching: ingresso/entrance/parking, checkin/reception, security/varco/gate, lounge/attesa, gate/imbarco/boarding) — stesso approccio gia usato nel vecchio `topology_analyzer.py` Python (vedi sezione 6)
   - Fallback geometrico se non ci sono nomi utili: bounding box del modello, asse lungo, punti equidistanti lungo quell'\''asse, snap a y=0 (pavimento)
   - Bottone "Rianalizza mesh" per ri-eseguire l'\''analisi quando serve
   - Questo deve girare in automatico al primo caricamento di un GLB per un progetto senza punti salvati
4. Bucket Supabase Storage per salvare il `.glb` stesso (oggi si ricarica manualmente ogni volta)
5. Editor per le telecamere (oggi solo i nodi/hotspot sono editabili dal pannello, le 7 telecamere preset restano fisse)

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
