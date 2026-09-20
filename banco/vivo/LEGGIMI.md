# Il banco dal vivo

Prove che aprono l'app VERA in un Chrome senza finestra e guardano cosa fa.
Vivevano in uno scratchpad temporaneo: dal 18/09/2026 stanno qui, perché una
cartella temporanea prima o poi sparisce.

## Come si prepara

```
npm i -D playwright            # non installa Chrome: si usa quello di sistema
```

Serve Google Chrome in `C:\Program Files\Google\Chrome\Application\chrome.exe`
(cambiare `executablePath` altrove). I file girano da questa cartella:

```
node prova_attesa.mjs
```

Ogni prova:

- parte dalla **versione pubblicata** (`https://raffaella23.github.io/Veritas-spatial-ai/`);
- serve dal **workspace** i file che esistono in locale (così si prova il
  codice prima di pubblicarlo): è la regola `DAL_WORKSPACE`/route del banco;
- sostituisce Supabase con lo stub `banco/finti/supabase_finto.js`, quindi
  l'accesso è finto e nessun dato esce;
- passa dal percorso vero dell'utente: «+ Nuovo progetto — scegli il file».

## Cosa c'è

| File | A cosa serve | Manopole |
|---|---|---|
| `prova_attesa.mjs` | fotografa la pagina di attesa a istanti dati, registra gli stati e ogni errore di pagina | `MODELLO`, `SCATTI` (secondi dopo il modello), `LINGUA`, `LARGO`/`ALTO`, `CARTELLA`, `PROFILO`, `ENTRA=1` (chiude il velo e fotografa la piattaforma), `VALUTA` (espressione da valutare nella pagina) |
| `sonda_stati.mjs` | quali dati esistono e QUANDO (zone, misure, norme, accessi, occhio) | `ISTANTI`, `MODELLO`, `DAL_WORKSPACE=1` |
| `inventario_lingua.mjs` | tutte le scritte visibili nelle tre schermate | `LINGUA`, `ATTESA`, `PROFILO` |
| `analizza_lingua.mjs` | segna le scritte rimaste nell'altra lingua (`node analizza_lingua.mjs en`) | — |
| `crea_splat.mjs` | fabbrica un Gaussian Splat di prova (appartamento, 3 stanze, porte da 0,75 / 0,90 / 1,20 m) invece di scaricarlo | `node crea_splat.mjs stanze.ply` |
| `fotogrammi.mjs` | estrae fotogrammi da un video (senza ffmpeg) per guardare un difetto | `node fotogrammi.mjs video.mp4 cartella 3` |
| `prova_occhio.mjs`, `prova_confronto.mjs` | prove più vecchie del giro dell'occhio e del confronto fra versioni | — |

## Regole imparate qui

- **La pagina dietro non lavora:** un Chrome senza finestra ferma i timer delle
  schede in secondo piano. Le prove tengono la scheda davanti.
- **La cache dei moduli:** ogni importatore ha `?v=`, e va alzato a ogni
  modifica, se no il browser serve il file vecchio.
- **Non si infila un file nell'`input[type=file]` con un `DataTransfer`:** il
  modello entra 7 volte più piccolo. Si passa dal pulsante vero.
- **La costruzione si controlla sempre** (`window.__EIDETICA_COSTRUZIONE`)
  prima di giudicare quello che si vede.
