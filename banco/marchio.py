#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
IL MARCHIO — ritagli e formati leggeri, generati dal file vero.
Raffaella, 05/09/2026.

⚠️ QUESTO NON RIDISEGNA NIENTE. Prende `Assets/Eidetica _logo_colorato.png`
   e ne cava dei tagli e delle compressioni. La regola resta quella del
   05/09: il marchio non si ridisegna, si usa. Un ridisegno e' una copia,
   e una copia perde.

PERCHE' SERVIVA UNO SCRIPT E NON UNA PASSATA A MANO IN PHOTOSHOP:
   il file d'origine e' l'unico originale che abbiamo (e' nato da un
   generatore d'immagini — porta ancora dentro il suo certificato C2PA,
   22 KB di targhetta). Non esiste un file a livelli da cui ri-esportare.
   Quindi ogni versione — trasparente, piccola, leggera — e' un RICAVATO.
   Se un domani arriva l'originale a livelli, si buttano via i ricavati e
   si ri-esporta da li'. Nel frattempo, che almeno siano rifacibili con un
   comando invece che a memoria.

LA TRAPPOLA, ed e' il motivo per cui qui c'e' un riempimento e non una
soglia sul bianco:
   il BIANCO DELL'OCCHIO e' lo stesso bianco della pagina.
   fondo   = (250, 251, 250)
   sclera  = (251, 252, 253)
   Cinque livelli di differenza su 255. Chi cancella "tutto il bianco"
   cancella anche l'occhio, e resta un buco al centro del marchio — che si
   vede solo quando lo appoggi su fondo scuro, cioe' tardi.
   Quindi: si entra dai BORDI e si allaga solo quello che e' ATTACCATO al
   bordo. Il bianco chiuso dentro l'occhio non e' attaccato a niente, e
   resta.

   E POI LA TRAPPOLA HA UNA SECONDA META', scoperta il 05/09 guardando il
   marchio appoggiato sul grigio della vista 3D: anche il VUOTO DENTRO LA «D»
   e' un'isola chiusa, e la regola di sopra lo lasciava opaco — un tappo
   bianco in mezzo alla lettera. Invisibile finche' il marchio sta su bianco,
   lampante appena lo metti altrove.
   L'occhio e la D hanno lo stesso identico bianco: non li separa il colore.
   Li separa cosa sono — l'occhio e' un disegno, la D e' una lettera, e il
   vuoto di una lettera e' vuoto. Quindi si separano per posizione, sopra o
   sotto lo stacco fra simbolo e parola.

Uso:
   python banco/marchio.py
"""

from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

RADICE = Path(__file__).resolve().parent.parent
ORIGINALE = RADICE / "Assets" / "Eidetica _logo_colorato.png"
USCITA = RADICE / "Assets"

# Il fondo del file. Misurato, non supposto: e' anche il colore su cui sta
# la schermata d'attesa in index.html (#fafbfa). Se un domani arriva un
# originale con un altro fondo, questo e' l'unico numero da cambiare.
FONDO = np.array([250, 251, 250], dtype=np.float32)

# Quanto ci si allontana dal fondo prima di essere considerati marchio.
# 60 su 255 e' largo apposta: dev'entrare DENTRO la sfrangiatura dei bordi,
# altrimenti resta un alone chiaro di un pixel attorno a tutto — l'errore
# classico dello scontorno, quello che si nota solo su fondo scuro.
SOGLIA_ALLAGAMENTO = 60.0

# ⚠️ SI SVUOTA TUTTO, anche il bianco dell'occhio. Raffaella, 05/09:
#    «prova a svuotare anche il bianco dell'occhio».
#    Con questo a True ogni isola del colore del fondo diventa trasparente:
#    l'occhiello della D, i vuoti delle lettere e anche la sclera. Il marchio
#    diventa un RITAGLIO VERO — quello che c'e' sotto si vede attraverso.
#    Con questo a False torna la regola di prima: si allaga solo dal bordo, e
#    le isole chiuse restano opache (l'occhio resta bianco, ma la D si
#    ritappa). Non c'e' una via di mezzo che non sia una regola inventata.
SVUOTA_TUTTO = True

# Larghezze richieste. La schermata d'attesa disegna il marchio a
# `min(78vw, 460px)`: 920 px copre anche gli schermi a doppia densita'.
# Oltre e' peso trasportato per niente.
LARGHEZZA_INTERO = 920
LARGHEZZA_SIMBOLO = 256   # solo occhio e ali, per il logo fisso nella UI

QUALITA_WEBP = 88

# La trasparenza si comprime a parte dal colore. A 100 e' esatta e pesa;
# sotto 70 il bordo delle ali comincia a scalinare. 80 e' il punto in cui
# smette di calare senza che si veda niente.
QUALITA_TRASPARENZA = 80


def carica():
    im = Image.open(ORIGINALE).convert("RGB")
    return np.asarray(im, dtype=np.float32)


def distanza_dal_fondo(rgb):
    """Quanto un pixel e' lontano dal colore del fondo, canale peggiore."""
    return np.abs(rgb - FONDO).max(axis=2)


def maschera_esterno(dist, stacco=None):
    """
    Il fondo: tutto cio' che ha il colore del fondo.

    LA STORIA, perche' e' istruttiva e per non rifarla.
    1. Prima versione: si allaga dal BORDO e si tiene tutto il resto. Serviva
       a salvare il bianco dell'occhio, che e' lo stesso identico bianco della
       pagina (fondo 250,251,250 — sclera 251,252,253) e che una soglia sul
       bianco avrebbe bucato.
    2. Poi, guardando il marchio sul grigio della vista 3D, e' saltato fuori
       che anche il VUOTO DENTRO LA «D» e' un'isola chiusa: restava opaco, un
       tappo bianco in mezzo alla lettera.
    3. Terza versione: si bucavano le isole sotto lo stacco (le lettere) e si
       tenevano quelle sopra (il disegno). Funzionava, ma era una regola in
       piu' da spiegare e da mantenere.
    4. Questa: si bucano TUTTE. Raffaella ha chiesto di svuotare anche
       l'occhio, e cosi' la regola sparisce — il marchio e' un ritaglio, e un
       ritaglio non ha tappi da nessuna parte.
    `stacco` non serve piu' e resta solo per non rompere chi chiama.
    """
    candidati = dist < SOGLIA_ALLAGAMENTO

    if SVUOTA_TUTTO:
        return candidati

    etichette, _ = ndimage.label(candidati)
    bordo = np.concatenate([
        etichette[0, :], etichette[-1, :], etichette[:, 0], etichette[:, -1],
    ])
    fondo = set(np.unique(bordo)) - {0}
    if not fondo:
        return np.zeros(dist.shape, dtype=bool)
    return np.isin(etichette, list(fondo))


def con_trasparenza(rgb):
    """
    RGBA con il fondo tolto e i bordi ricostruiti.

    La sfrangiatura: un pixel sul bordo di una lettera non e' ne' fondo ne'
    inchiostro, e' una MESCOLA dei due. Se ci si limita a renderlo
    trasparente a meta' lasciandogli il colore che ha, quel colore contiene
    ancora il fondo chiaro, e su nero si vede la frangia. Quindi si fa il
    conto all'incontrario — P = a*F + (1-a)*Fondo, da cui F — e si
    restituisce al pixel il colore che aveva PRIMA di essere annacquato.
    """
    dist = distanza_dal_fondo(rgb)

    fuori = maschera_esterno(dist)

    alfa = np.ones(dist.shape, dtype=np.float32)
    alfa[fuori] = np.clip(dist[fuori] / SOGLIA_ALLAGAMENTO, 0.0, 1.0)

    a = alfa[..., None]
    # ⚠️ SI DIVIDE PER ALMENO 0.35, NON PER L'ALFA VERA, e non e' pigrizia.
    #    Dove un pixel e' trasparente al 97% il conto all'incontrario lo
    #    moltiplica per trenta: un pelo di grana del file d'origine diventa
    #    una macchia di colore acceso. Il risultato non si vede — quei pixel
    #    sono quasi invisibili — ma si PESA: il file passava da 31 a 235 KB,
    #    tutto rumore lungo i bordi e nell'aura attorno alle ali.
    #    Sotto quella soglia si lascia il pixel un po' annacquato: e'
    #    trasparente al 97%, nessuno se ne accorgera' mai.
    sicuro = np.maximum(a, 0.35)
    colore = np.clip((rgb - (1.0 - a) * FONDO) / sicuro, 0, 255)
    colore = np.where(a > 0.004, colore, FONDO)

    return np.dstack([colore, alfa * 255.0]).astype(np.uint8)


def riquadro_inchiostro(alfa, soglia=8):
    """Il rettangolo minimo che contiene ancora del marchio."""
    righe = np.where(alfa.max(axis=1) > soglia)[0]
    colonne = np.where(alfa.max(axis=0) > soglia)[0]
    return colonne[0], righe[0], colonne[-1] + 1, righe[-1] + 1


def stacco_sotto_le_ali(alfa, soglia=8):
    """
    Dove finisce l'occhio alato e comincia la scritta.

    Si conta quanto inchiostro c'e' su ogni riga e si cercano le righe vuote.

    ⚠️ IL PRIMO STACCO, NON IL PIU' LUNGO. Errore mio del 05/09, e mi e'
       costato un giro: cercavo la fascia vuota piu' lunga, e quella non e'
       fra il simbolo e la parola — e' fra la PAROLA e la RIGA PICCOLA sotto
       («the intelligence layer for space»), che sono piu' distanziate.
       Misurato sul file vero: lo stacco usciva alla riga 691, mentre
       l'occhiello della D sta fra la 599 e la 657. Cioe' la riga di
       separazione cadeva SOTTO le lettere, e il vuoto della D restava dalla
       parte del simbolo — dove non si tocca niente. Il tappo bianco restava.
       Scendendo dall'alto, il primo vuoto vero e' quello giusto: sotto le
       ali e sopra le lettere.
    """
    per_riga = (alfa > soglia).sum(axis=1)
    H = len(per_riga)
    vuote = per_riga == 0
    minimo = max(3, int(H * 0.01))     # un vuoto di un pixel e' rumore

    inizio = None
    for y in range(int(H * 0.30), int(H * 0.85)):
        if vuote[y]:
            if inizio is None:
                inizio = y
        elif inizio is not None:
            if (y - inizio) >= minimo:
                return (inizio + y) // 2
            inizio = None
    if inizio is not None and (int(H * 0.85) - inizio) >= minimo:
        return (inizio + int(H * 0.85)) // 2
    return int(H * 0.62)               # ripiego: la proporzione a occhio


def salva_webp(arr, percorso, larghezza):
    im = Image.fromarray(arr)
    altezza = max(1, round(im.height * larghezza / im.width))
    im = im.resize((larghezza, altezza), Image.LANCZOS)
    im.save(percorso, "WEBP", quality=QUALITA_WEBP,
            alpha_quality=QUALITA_TRASPARENZA, method=6)
    return im.size, percorso.stat().st_size


def main():
    rgb = carica()
    print(f"originale        {ORIGINALE.name}  "
          f"{rgb.shape[1]}x{rgb.shape[0]}  {ORIGINALE.stat().st_size/1024:.0f} KB")

    rgba = con_trasparenza(rgb)
    alfa = rgba[..., 3]

    x0, y0, x1, y1 = riquadro_inchiostro(alfa)
    tagliato = rgba[y0:y1, x0:x1]

    # 1. INTERO, SU BIANCO — quello che usa oggi la schermata d'attesa.
    #    Stesso disegno di adesso, solo pesato il giusto.
    piano = Image.new("RGB", (tagliato.shape[1], tagliato.shape[0]),
                      tuple(FONDO.astype(int)))
    piano.paste(Image.fromarray(tagliato), (0, 0), Image.fromarray(tagliato))
    misura, peso = salva_webp(np.asarray(piano),
                              USCITA / "eidetica_intero.webp", LARGHEZZA_INTERO)
    print(f"intero su bianco {misura[0]}x{misura[1]}  {peso/1024:.0f} KB")

    # 2. INTERO, TRASPARENTE — per quando il marchio va su fondo scuro.
    misura, peso = salva_webp(tagliato,
                              USCITA / "eidetica_intero_trasparente.webp",
                              LARGHEZZA_INTERO)
    print(f"intero traspar.  {misura[0]}x{misura[1]}  {peso/1024:.0f} KB")

    # 3. SOLO IL SIMBOLO — occhio e ali, senza la parola.
    #    Serve al logo fisso: a 28 px di altezza la scritta "EIDETICA" e la
    #    riga sotto non si leggono, si impastano. Un marchio illeggibile
    #    non e' un marchio piccolo, e' sporco.
    stacco = stacco_sotto_le_ali(alfa[y0:y1, x0:x1])
    simbolo = tagliato[:stacco]
    sx0, sy0, sx1, sy1 = riquadro_inchiostro(simbolo[..., 3])
    simbolo = simbolo[sy0:sy1, sx0:sx1]
    misura, peso = salva_webp(simbolo,
                              USCITA / "eidetica_simbolo_trasparente.webp",
                              LARGHEZZA_SIMBOLO)
    print(f"solo simbolo     {misura[0]}x{misura[1]}  {peso/1024:.0f} KB")

    # 4. PNG trasparente a piena risoluzione — non per il sito: per chi
    #    dovra' rimetterci le mani (stampa, slide, chi fa il sito vero).
    #    Il web non lo carica mai.
    png = Image.fromarray(tagliato)
    png.save(USCITA / "eidetica_intero_trasparente.png", "PNG", optimize=True)
    print(f"png trasparente  {png.width}x{png.height}  "
          f"{(USCITA / 'eidetica_intero_trasparente.png').stat().st_size/1024:.0f} KB")


if __name__ == "__main__":
    main()
