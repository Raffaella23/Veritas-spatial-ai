# EIDETICA nel visore (IWSDK) — sorgente

L'app leggera del §13 del HANDOFF: stanza a colori + plastico d'argilla gia'
unito sul PC + prese con le mani, da seduti. Si costruisce qui; il risultato
sta in `../visore/` ed e' servito da GitHub Pages:
`https://raffaella23.github.io/Veritas-spatial-ai/visore/`

## Come si rifa

```
npm install
mkdir -p public && cp -r public_studio public/studio && cp -r public_arredi public/arredi && cp -r public_marchio public/marchio   # stanza 360° e arredi (Poly Haven, CC0)
cp public_progetto/pacchetto.json public/                  # il pacchetto del progetto (v19)
mkdir -p public/corpo && cp public_corpo/* public/corpo/  # v20: il corpo delle persone (rifatto con strumenti/fai_corpo.mjs)
node strumenti/fai_plastico.mjs ../airport_foot_traffic.glb public/plastico.glb
npx vite build                                             # -> dist/
node strumenti/prova_emulatore.mjs                         # Quest 2 simulato (iwer)
node strumenti/prova_lettura.mjs                           # v19: schede, persone, presa di una scheda
node strumenti/prova_persona.mjs                           # v20: corpi, SPEED, rotellina, scegliere, finestra, dentro
```

Il pacchetto si rifa (solo quando cambia il cervello, ~7-10 minuti, Chrome senza finestra):
`node strumenti/fai_pacchetto.mjs` -> `public_progetto/pacchetto.json`.

Poi si copia `dist/` in `../visore/` (sostituendolo tutto).

- `strumenti/fai_plastico.mjs`: GLB grezzo -> plastico d'argilla unito per
  materiale (veste di `veritas_carta.js`: argilla, sagome, vetri). Aeroporto:
  2.416 pezzi -> 31, 186.074 triangoli.
- `strumenti/prova_emulatore.mjs`: si apre, si entra, il plastico c'e', zero
  errori. I fps dell'emulatore NON valgono: si misurano nel Quest.
- La spia sul tavolo (FPS ora / avg / min sugli ultimi 30 s, verde se il minimo
  e' >= 60) serve alle prove e poi si toglie.

## Il pacchetto del progetto e la lettura (v19, 16/10/2026)

- `strumenti/fai_pacchetto.mjs`: apre la pagina PUBBLICATA da `/quest` (aeroporto, simulazione
  che parte da sola, accesso finto del banco `banco/finti/supabase_finto.js`) e REGISTRA: il
  righello umano, l'ultimo report di ogni stato del velo (in inglese), ogni fermata della regia
  dell'occhio (con l'immagine a 224 px e la posa della telecamera), ogni nome, i fotogrammi delle
  persone col profilo, e la matrice del modello (dal file del plastico ai metri della pagina).
  Non calcola niente: e' il «file solo» del §13.3. Alza il tetto della regia a 600 s
  (`window.__veritasRegiaTetto`): senza scheda video uno sguardo costa 12-30 s.
- `src/lettura.js`: riproduce il pacchetto sul plastico. Prima la scala, poi zone, oggetti
  (immagine dell'occhio, nome, ragionamento in inglese, luce sulle copie, telecamera di luce,
  nome sopra l'oggetto), conformita', orientamento; a 61 s le persone camminano (al doppio,
  in giro continuo) con le scie colorate per profilo. Le sei schede sono di vetro coi fili LED,
  a sinistra del plastico; col pizzico (anche da lontano) vengono alla mano.
- `?salta=<s>` nel link manda avanti la lettura (per le prove e le foto).

## La v20 (16/10/2026 sera): persone vere, velocita' vera, i loro occhi

- `strumenti/fai_corpo.mjs`: la figura di `corpi/persona.gltf` (Quaternius, CC0) alleggerita per il
  Quest 2: 2.671 triangoli, solo cammina / fermo / seduto, 244 KB -> `public_corpo/corpo.glb`.
- `src/corpi.js`: le pose si cuociono all'apertura in una trama; le 28 persone si disegnano in UNA
  chiamata, colorate per profilo, con la luce del plastico. Il passo dei piedi segue i metri fatti.
- `src/lettura.js`: velocita' VERA di serie; pulsante SPEED (x1 / x2 / x4, tasto V sul PC). Scie a
  terra (4 cm), larghe 40 cm. «Seduto» solo dove l'occhio ha visto una seduta: altrove in piedi in
  attesa (il 95% dei seduti del cervello e' nel vuoto, HANDOFF §13.7).
- `src/persona.js`: elenco PEOPLE a destra del plastico (pizzico su una riga, o su una persona),
  cartellino (missione, meta, stato, metri, arrivo), anello e linea dorata fino alla meta; i suoi
  occhi in una FINESTRA (scheda di vetro, ridisegnata a fotogrammi alterni) o STEP INSIDE (dentro il
  modello a grandezza vera, sempre x1; EXIT davanti, Esc sul PC).
- `src/main.js`: zoom a due mani fino a 40 volte; sul PC la rotellina avvicina davvero verso il punto
  sotto il cursore; nella prova dei pesi la tappa «Their eyes window».
