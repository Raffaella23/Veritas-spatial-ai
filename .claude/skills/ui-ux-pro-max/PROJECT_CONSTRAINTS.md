# VINCOLI DI PROGETTO — VERITAS Spatial AI

> **Leggi questo file PRIMA di applicare qualsiasi raccomandazione di `ui-ux-pro-max` o `design-system`.**
>
> Questa skill è generica e pensata per app web/mobile con stack moderni. VERITAS **non è** una di quelle.
> Dove la skill e questo file sono in disaccordo, **vince sempre questo file**.

---

## 0. Gerarchia delle autorità

In caso di conflitto, l'ordine è:

1. `CLAUDE.md` (radice del repo) — regole operative non negoziabili
2. `design_brief.md` — north star di prodotto e UI/UX, già deciso dalla proprietaria
3. `PROJECT_INFO.md` — storia reale del codice, cosa è già stato provato e cosa è fallito
4. **questo file**
5. `ui-ux-pro-max` / `design-system` — solo come **fonte di dati**, mai come fonte di decisioni architetturali

La skill fornisce **palette, scale tipografiche, regole di accessibilità, motion preset, linee guida UX**.
La skill **non decide** stack, architettura, struttura dei file, né direzione di prodotto. Quelle sono già decise.

---

## 1. Lo stack è già deciso e non è negoziabile

VERITAS è **un singolo file HTML autocontenuto** (`Veritas-V17-FIX-SOLO-BUG.html`, ~1,07 MB).

`CLAUDE.md` §8.8: *«Il file HTML deve restare snello e scattante: singolo file, niente framework aggiuntivi, niente dipendenze superflue.»*

### ❌ Mai proporre, mai introdurre

- React come dipendenza nuova, Next.js, Vue, Nuxt, Svelte, Astro, Angular, Laravel
- **Tailwind CSS**, shadcn/ui, o qualsiasi libreria di componenti
- Build step, bundler, `package.json`, `node_modules`
- React Native, Flutter, SwiftUI, Jetpack Compose, WPF, WinUI, Avalonia, Uno, JavaFX, UWP

Tutti i file in `data/stacks/` **tranne** quelli elencati sotto sono **fuori ambito**. Non leggerli, non citarli.

### ⚠️ Attenzione al default automatico della skill

`SKILL.md` → *Step 1* dice: rileva lo stack da `package.json`, e **se non trova nulla usa `html-tailwind` come default**.

VERITAS **non ha un `package.json`**. Quindi la skill ricadrà automaticamente su `html-tailwind` → e inizierà a raccomandare Tailwind. **Questo default è sbagliato per questo progetto: ignoralo.**

### ✅ Stack reale da usare

**HTML5 + CSS vanilla (custom properties) + JavaScript ES modules, tutto inline nel singolo file.**

Gli unici file `data/stacks/` consultabili sono:
- `html-tailwind.csv` — **solo per le regole di struttura/semantica/accessibilità HTML**, ignorando ogni classe utility Tailwind
- `threejs.csv` — **solo con la correzione obbligatoria della sezione 2**

---

## 2. 🔴 `threejs.csv` è FATTUALMENTE SBAGLIATO per VERITAS

Il file `data/stacks/threejs.csv` presuppone **Three.js r128 caricato come UMD da cdnjs**. VERITAS non è così.

**Realtà verificata** — importmap in testa a `Veritas-V17-FIX-SOLO-BUG.html`:

```json
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.171.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.171.0/examples/jsm/",
    "three-mesh-bvh": "https://cdn.jsdelivr.net/npm/three-mesh-bvh@0.7.8/build/index.module.js"
  }
}
```

Quindi le prime due regole marcate **"Critical"** in `threejs.csv` vanno **entrambe ignorate**:

| Regola in `threejs.csv` | Verità per VERITAS |
|---|---|
| «Usa sempre r128 da cdnjs, pinnato» | ❌ **NO.** Siamo su **0.171.0 via jsdelivr + importmap ESM**. Tornare a r128 UMD romperebbe l'importmap, gli `three/addons/`, e `three-mesh-bvh@0.7.8`. Sarebbe un downgrade di 43 release. |
| «`CapsuleGeometry` non esiste, ricostruiscila da primitive» | ❌ **NO.** `CapsuleGeometry` esiste da r142. Su 0.171.0 è disponibile e si usa normalmente. |

**Regola pratica:** di `threejs.csv` prendi solo le voci su *performance, scene management, disposal, memory leak, luci e ombre*. Tutto ciò che parla di **versione, CDN, o API mancanti** è riferito a r128 e qui non vale.

---

## 3. 🔴 Zone del codice da non toccare mai

### Blocco `<script>` n. 3 — il motore

`CLAUDE.md` §3: *«Il blocco 3 non si tocca. Mai.»*

È il bundle React + Three.js **minificato** (~872 KB). Nessuna modifica, nessuna riformattazione, nessuna reindentazione. Dopo ogni operazione sul file va verificato **byte-per-byte identico** all'originale.

Una skill di design non ha **nessuna** ragione legittima di modificarlo.

### Il Core Python

`Assets/core/` (`engine.py`, `agent.py`, `behaviour.py`, `compliance.py`, `topology_analyzer.py`, `path_loader.py`, `recommendations.py`), più `main.py` e `api_server.py` in radice.

**Fuori ambito totale per il lavoro UI.** Questa è la parte intelligente del prodotto e non si tocca in una sessione di redesign. Il `SKILL.md` stesso dice di saltare *«pure backend logic»* — qui si applica alla lettera.

### Il bridge `window.__veritas*`

Le globali elencate in `CLAUDE.md` §4 sono **l'unico contratto** tra la UI e il motore. La nuova UI deve consumarle, mai riscriverle o duplicarle.

Non inventare funzioni: se una funzione o un ID DOM non è nella lista di `CLAUDE.md` §4, **verificala con `grep` prima di usarla**.

> Perché insisto: `PROJECT_INFO.md` §17 documenta un caso reale in cui un prompt preparato da un'altra AI inventava `manualUnprojectToPlane`, `addHotspot`, `createAgentMesh` e un dropdown «Tipo agente» — **nessuno dei quali esisteva** — e usava `THREE.js` in uno scope dove non era disponibile. Fu rifiutato e riscritto sul codice vero. Stesso rischio qui.

---

## 4. Il design è già deciso: `design_brief.md`

La proprietaria ha già scritto il north star. La skill lo **riempie**, non lo **sostituisce**.

### Elementi UI ammessi (brief §7) — sono sei, e sono tassativi

1. **AI Console / Chat** — interazione con l'AI residente, **elemento primario**
2. **3D Viewport** — ambiente + agenti, **domina la schermata**
3. **Simulation Controls** — play/pause/reset/speed, sottile
4. **Spatial Layers** — toggle zone/navigazione/agenti/heatmap/flussi
5. **Analysis / Report** — compare solo a fine simulazione
6. **Status indicator minimale** — stato sistema/backend

Tutto il resto **compare contestualmente**, solo quando serve.

### Vietato esplicitamente dal brief

Sidebar enormi, dashboard enterprise, decine di pulsanti, card inutili, gradienti eccessivi, estetica «gaming dashboard», UI decorativa senza funzione.

> ⚠️ Molte raccomandazioni di `ui-ux-pro-max` per prodotti «dashboard» / «SaaS» spingono esattamente verso ciò che il brief vieta. **Filtra di conseguenza.**

### Linguaggio visivo (brief §8)

Ispirazione Apple / Meta con identità propria. Feeling: **minimal / spatial / intelligent / precise / cinematic / professional**.

Quando interroghi la skill, usa questi termini come query — non «dashboard», non «SaaS landing».

---

## 5. Rule of Three

`CLAUDE.md` §8.7 e `CONTEXT.md`: ogni feature deve reggere i **tre domini di riferimento — gaming, museo, aeroporto**. Se un elemento di UI funziona solo per l'aeroporto, il design va ripensato.

Vale anche per palette e iconografia: niente scelte che leghino visivamente il prodotto a un solo dominio.

---

## 6. Accessibilità: qui conta doppio

L'accessibilità non è solo qualità di UI — è **parte del prodotto vendibile**. `CONTEXT.md` la assegna al Core, e `compliance.py` implementa regole VVFF reali; esiste l'archetipo `wheelchair` tra gli agenti.

Un prodotto che simula l'accessibilità di uno spazio **non può avere una UI inaccessibile**. Le regole di priorità 1-2 di `ui-ux-pro-max` (contrasto 4.5:1, target 44×44px, focus visibile, navigazione da tastiera, `prefers-reduced-motion`) sono **obbligatorie**, non consigliate.

---

## 7. Come invocare la skill in questo repo

La skill è **vendorizzata come project skill**, non installata come plugin. Quindi `${CLAUDE_PLUGIN_ROOT}` **non è definita** e i percorsi in `SKILL.md` non funzionano così come sono.

Usa i percorsi relativi alla radice del repo:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <dominio>
```

Domini utili: `style`, `color`, `typography`, `ux`, `product`, `gsap`, `chart`, `icon`.

Esempio reale, tarato sul brief:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py \
  "minimal spatial professional engineering tool dark 3d viewport" --domain style
```

---

## 8. Cosa ignorare nella skill `design-system`

`design-system` è stata portata dentro **solo** per l'architettura dei design token:

✅ **Usa**: `references/token-architecture.md`, `primitive-tokens.md`, `semantic-tokens.md`, `component-tokens.md`, `states-and-variants.md`, `templates/design-tokens-starter.json`, `scripts/html-token-validator.py`

❌ **Ignora**: tutto ciò che riguarda le slide — `data/slide-*.csv`, `scripts/generate-slide.py`, `search-slides.py`, `slide_search_core.py`, `slide-token-validator.py`. Sono per generare presentazioni, non c'entrano con VERITAS.

❌ **Ignora**: `references/tailwind-integration.md` (vedi sezione 1).

I token vanno emessi come **CSS custom properties inline nel file HTML**, non come config Tailwind né come file JSON esterno.

---

## 9. Checklist prima di consegnare qualsiasi modifica UI

- [ ] Il blocco `<script>` n. 3 è **byte-per-byte identico** all'originale
- [ ] Nessun file sotto `Assets/core/`, `main.py`, `api_server.py` è stato toccato
- [ ] Nessun framework, bundler o `package.json` introdotto
- [ ] Three.js resta **0.171.0 via importmap**
- [ ] Le funzioni e gli ID DOM usati sono stati **verificati con `grep`**, non assunti
- [ ] Validato con `node --check` prima di riassemblare (i moduli ES vanno copiati in `.mjs` per il check) — `CLAUDE.md` §8.4
- [ ] Per analizzare/modificare i blocchi `<script>` è stato usato `html.parser` di Python, **mai regex** — `CLAUDE.md` §8.3
- [ ] La feature regge gaming + museo + aeroporto
- [ ] Contrasto ≥ 4.5:1, target ≥ 44×44px, focus visibile, `prefers-reduced-motion` rispettato
- [ ] **Nessun push su `main`** senza approvazione esplicita di Raffaella — `CLAUDE.md` §8.1

---

## 10. Provenienza

- Upstream: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Commit vendorizzato: `abb7f2fd5a083fa1ff55c326a963ff0d95c33f99` (6 agosto 2026)
- Licenza: MIT — copia in `LICENSE.upstream`
- Skill portate dentro: `ui-ux-pro-max`, `design-system`
- Skill **escluse** di proposito: `ui-styling` (5,8 MB di librerie di componenti per framework che qui non si usano), `brand`, `design`, `banner-design`, `slides` (loghi, banner, presentazioni — fuori ambito)
- Nessuna chiave API, nessuna chiamata di rete, nessun servizio a pagamento: Python solo standard library, funziona offline
