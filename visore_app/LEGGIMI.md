# EIDETICA nel visore (IWSDK) — sorgente

L'app leggera del §13 del HANDOFF: stanza a colori + plastico d'argilla gia'
unito sul PC + prese con le mani, da seduti. Si costruisce qui; il risultato
sta in `../visore/` ed e' servito da GitHub Pages:
`https://raffaella23.github.io/Veritas-spatial-ai/visore/`

## Come si rifa

```
npm install
mkdir public && cp -r ../visore/stanza public/            # stanza Meta (Apache 2.0)
node strumenti/fai_plastico.mjs ../airport_foot_traffic.glb public/plastico.glb
npx vite build                                             # -> dist/
node strumenti/prova_emulatore.mjs                         # Quest 2 simulato (iwer)
```

Poi si copia `dist/` in `../visore/` (sostituendolo tutto).

- `strumenti/fai_plastico.mjs`: GLB grezzo -> plastico d'argilla unito per
  materiale (veste di `veritas_carta.js`: argilla, sagome, vetri). Aeroporto:
  2.416 pezzi -> 31, 186.074 triangoli.
- `strumenti/prova_emulatore.mjs`: si apre, si entra, il plastico c'e', zero
  errori. I fps dell'emulatore NON valgono: si misurano nel Quest.
- La spia sul tavolo (FPS ora / avg / min sugli ultimi 30 s, verde se il minimo
  e' >= 60) serve alle prove e poi si toglie.
