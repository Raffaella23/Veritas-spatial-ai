# Loop percettivo degli agenti — stato

**Aggiornato:** 12 agosto 2026 · branch `veritas-ai-os-preview`

---

## Cosa fa

L'agente non segue più soltanto i waypoint: in ogni tick **misura cosa vede**,
lo **interpreta**, e la misura entra nella decisione.

```
1. Osserva      isovista misurata sulla mesh, all'altezza occhio dell'archetipo
2. Interpreta   orizzonte chiuso → zona isolata → cautela
3. Decide       consulta la mappa cognitiva: "ci sono già stato? com'era?"
4. Agisce       cammina normalmente, ~1,4 m/s
5. Registra     visibilità e stress finiscono nella timeline
6. Adatta       rientrando in una zona scomoda alza la propria avversione al rischio
```

---

## La misura: isovista, non stima

Dal punto in cui si trova l'agente si tirano **32 raggi orizzontali** contro la
geometria caricata, all'altezza occhio dell'archetipo, e si misura fin dove
arrivano. L'area che ne risulta è l'**isovista** (Benedikt, 1979) — una misura in
metri quadri, confrontabile con una norma, non un numero inventato.

Il calcolo sta nel browser (`veritasComputeIsovist`, blocco 2) perché lì c'è già
la mesh e il BVH: nessun download lato server, nessun costo su Render. Il
risultato viaggia nel grafo come `node.meta.isovist` e il motore Python lo legge.

**Due altezze occhio**, perché l'altezza cambia tutto:

| | in piedi (1,65 m) | seduto (1,20 m) |
|---|---|---|
| sala aperta | 90,2 % | 85,5 % |
| corridoio stretto | 10,7 % | 10,0 % |
| **zona con bancone a 1,30 m** | **71,2 % → HIGH** | **16,6 % → LOW** |

Il bancone non ostruisce chi cammina e chiude l'orizzonte a chi è in carrozzina.
È lo stesso punto dello spazio, con due esperienze opposte — ed è misurato.

### Quando la misura non c'è

Senza mesh (o senza BVH montato) si ricade su una stima per archetipo che
**distingue le persone ma non i luoghi**: le curve risultano piatte. Il report lo
dichiara in testa con un avviso rosso, e il campo `perception_source` vale
`archetype_estimate` invece di `isovist`. Un grafico piatto va quindi letto, non
indagato.

---

## Dove leggere il risultato

Nel viewer: **Analysis / Report → Percezione agenti**, dopo aver lanciato una
simulazione con il motore Render collegato.

Il modale mostra, per ogni agente: intervallo di isovista in m², distanza
dall'ostacolo più vicino, andamento nel tempo di visibilità e stress, e la mappa
cognitiva zona per zona. In fondo, la stessa zona vista da agenti diversi.

I dati arrivano da `/api/simulate` nel campo `perception` e restano nel browser
(`window.__veritasPerceptionReport`). Non vengono riletti dal server: il backend
ne tiene **una copia sola e globale**, quindi con più utenti collegati
`/api/perception-report` restituirebbe la simulazione di qualcun altro. Quel
endpoint resta utile solo per prove da riga di comando.

---

## File toccati

| File | Cosa |
|---|---|
| `index.html` blocco 2 | `veritasComputeIsovist`, isovista nel grafo, cattura del payload percettivo |
| `index.html` blocco 6 | voce di menu, modale del report, grafico SVG |
| `Assets/core/engine.py` | `_compute_agent_perception` legge l'isovista, logging |
| `Assets/core/agent.py` | percezione nella decisione, mappa cognitiva |
| `api_server.py` | `perception` nella risposta di `/api/simulate` |
| `Assets/core/report_builder.py` | versione HTML lato server (per prove) |

**Blocco 3 verificato byte-per-byte** dopo ogni modifica: `eedd9935ea908fd3`.

---

## Verifiche fatte

- Blocco 3 intatto, 14 blocchi script invariati
- `node --check` su blocchi 2 e 6
- Catena completa via HTTP: 280 campioni percettivi, `source: isovist`
- Renderer eseguito sul payload vero: nessun `undefined`/`NaN`, 2 grafici, 35 righe
- `test_perception_loop.py` e `test_multi_agent_perception.py` passano

Corretto un bug del test: salvava `agent.position` per riferimento e numpy la
muta sul posto, quindi la distanza percorsa risultava sempre 0 — un blocco
inesistente. Ora misura 21 m.

---

## Cosa resta

- L'isovista è calcolata **per zona**, non per posizione continua: fra un nodo e
  l'altro il valore resta quello del nodo. Le curve sono a gradini, non lisce.
- Nessun ricalcolo del percorso: l'agente diventa più cauto in una zona scomoda
  ma non sceglie ancora una strada alternativa.
- La mappa cognitiva vive solo dentro la simulazione, non è salvata.
- Export PDF non fatto.
