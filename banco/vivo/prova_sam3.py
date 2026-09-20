# prova_sam3.py — SAM 3.1 sui render VERI di EIDETICA (quelli che guarda l'occhio).
#
# La domanda a cui risponde: su un render senza texture, visto da lontano
# (8 pixel al metro), SAM 3.1 trova le COSE (porte, sedute, banconi, cartelli)?
# E trova le FUNZIONI (corridoio, sala d'attesa, ingresso), oppure no?
# Se le funzioni non le trova, il nome della zona resta lavoro del cervello.
#
# Prima:
#   1. chiedere l'accesso ai pesi su https://huggingface.co/facebook/sam3.1
#      (si accettano i termini di Meta: lo fa una persona, non un programma)
#   2. hf auth login
#   3. git clone https://github.com/facebookresearch/sam3 && cd sam3 && pip install -e .
# Poi:
#   python prova_sam3.py ../renderi
import sys
import pathlib
from PIL import Image, ImageDraw

COSE = ["door", "glass door", "chair", "bench", "counter", "check-in desk",
        "sign", "escalator", "turnstile", "luggage trolley", "airplane"]
FUNZIONI = ["corridor", "waiting area", "entrance", "emergency exit"]
SOGLIA = 0.5

cartella = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "renderi")
immagini = sorted(cartella.glob("*.png"))
if not immagini:
    sys.exit(f"nessun PNG in {cartella}: falli con  node renderi_per_sam.mjs")

from sam3.model_builder import build_sam3_image_model          # noqa: E402
from sam3.model.sam3_image_processor import Sam3Processor      # noqa: E402

processor = Sam3Processor(build_sam3_image_model())

for percorso in immagini:
    immagine = Image.open(percorso).convert("RGB")
    stato = processor.set_image(immagine)
    disegno = ImageDraw.Draw(immagine)
    print(f"\n=== {percorso.name}  {immagine.width}x{immagine.height}")
    for parola in COSE + FUNZIONI:
        uscita = processor.set_text_prompt(state=stato, prompt=parola)
        riquadri = [[float(v) for v in b] for b in uscita["boxes"]]
        punteggi = [float(s) for s in uscita["scores"]]
        forti = [(b, s) for b, s in zip(riquadri, punteggi) if s >= SOGLIA]
        segno = "·" if parola in COSE else ">"   # > = parola di FUNZIONE
        print(f" {segno} {parola:16s} trovati {len(riquadri):3d} · sopra {SOGLIA:.2f}: "
              f"{len(forti):3d} · max {max(punteggi, default=0.0):.2f}")
        for (x0, y0, x1, y1), s in forti:
            disegno.rectangle([x0, y0, x1, y1], outline=(230, 40, 90), width=3)
            disegno.text((x0 + 4, y0 + 4), f"{parola} {s:.2f}", fill=(230, 40, 90))
    fuori = percorso.with_name(percorso.stem + "_sam3.png")
    immagine.save(fuori)
    print(f" scritto {fuori.name}")

print("\nGuarda le righe con «>»: se le parole di funzione non trovano niente di")
print("sensato, SAM vede le COSE e il nome della zona lo deve dire il cervello.")
