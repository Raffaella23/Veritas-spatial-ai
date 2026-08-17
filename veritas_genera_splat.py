#!/usr/bin/env python3
"""
Genera un .ply di gaussiane valido, per provare lo strato di ingresso.

    python3 veritas_genera_splat.py uscita.ply

A COSA SERVE E A COSA NO
Serve a provare l'IMPIANTO: che il formato venga riconosciuto dai byte, che
finisca sul caricatore giusto, che Spark lo decodifichi e che punti e colori
arrivino a valle. Per questo va benissimo una scena sintetica.

NON serve a tarare soglie di riconoscimento della segnaletica. Quelle vanno
misurate su scansioni vere, con rumore vero: tararle su dati che mi sono
fabbricato da solo sarebbe l'errore gia' fatto in questo progetto con
DECAL_STACCO_MAX, una costante ricavata da un modello e spacciata per capacita'
generale.

IL FORMATO, preso da un file vero del dataset 3DGS
Le grandezze non sono memorizzate come si leggono - e' la cosa che fa sbagliare:
  opacity  e' il LOGIT dell'opacita'   (Spark applica la sigmoide)
  scale_*  e' il LOGARITMO della scala (Spark applica l'esponenziale)
  f_dc_*   e' un'armonica sferica di grado 0, non un RGB:
           colore = 0.5 + 0.28209479 * f_dc
"""
import sys
import math
import struct

SH_C0 = 0.28209479177387814


def da_colore(c):
    """RGB 0..1 -> coefficiente f_dc."""
    return (c - 0.5) / SH_C0


def logit(p):
    p = min(max(p, 1e-6), 1 - 1e-6)
    return math.log(p / (1 - p))


CAMPI = (
    ["x", "y", "z", "nx", "ny", "nz", "f_dc_0", "f_dc_1", "f_dc_2", "opacity"]
    + ["scale_0", "scale_1", "scale_2", "rot_0", "rot_1", "rot_2", "rot_3"]
)


def gaussiana(x, y, z, rgb, scala=0.03, opacita=0.95):
    return [
        x, y, z, 0.0, 0.0, 0.0,
        da_colore(rgb[0]), da_colore(rgb[1]), da_colore(rgb[2]),
        logit(opacita),
        math.log(scala), math.log(scala), math.log(scala),
        1.0, 0.0, 0.0, 0.0,
    ]


def scena():
    """Una sala di 12 x 8 m con segnaletica colorata a terra.

    Le misure sono in metri veri: se il riconoscimento a valle dice qualcosa di
    diverso da 12 x 8, sbaglia lui e si vede subito.
    """
    g = []
    passo = 0.10

    # pavimento grigio
    nx, nz = int(12 / passo), int(8 / passo)
    for i in range(nx):
        for k in range(nz):
            g.append(gaussiana(i * passo - 6.0, 0.0, k * passo - 4.0, (0.55, 0.55, 0.55)))

    # tre strisce di segnaletica, colori distinti, direzioni distinte.
    # Sono COMPLANARI al pavimento: nessuno spessore, esattamente come una
    # freccia dipinta. Chi le cerca con una regola sullo stacco verticale non
    # le trovera' mai - si vedono solo dal colore.
    strisce = [
        ((0.05, 0.75, 0.15), [(-5.0 + t * 0.1, -3.0) for t in range(80)]),   # verde, lungo x
        ((0.90, 0.75, 0.05), [(-2.0, -3.5 + t * 0.1) for t in range(70)]),   # giallo, lungo z
        ((0.85, 0.10, 0.45), [(2.0 + t * 0.07, -3.5 + t * 0.07) for t in range(70)]),  # rosa, diagonale
    ]
    for rgb, punti in strisce:
        for (x, z) in punti:
            for dx in (-0.06, -0.02, 0.02, 0.06):      # larghezza ~15 cm
                g.append(gaussiana(x + dx, 0.001, z, rgb))

    # due muri, per dare un'altezza alla scena
    for i in range(nx):
        for h in range(int(3.0 / 0.15)):
            g.append(gaussiana(i * passo - 6.0, h * 0.15, -4.0, (0.80, 0.78, 0.74)))
            g.append(gaussiana(i * passo - 6.0, h * 0.15, 4.0, (0.80, 0.78, 0.74)))
    return g


def scrivi(path, g):
    intestazione = "ply\nformat binary_little_endian 1.0\nelement vertex %d\n" % len(g)
    intestazione += "".join("property float %s\n" % c for c in CAMPI)
    intestazione += "end_header\n"
    with open(path, "wb") as f:
        f.write(intestazione.encode("ascii"))
        for v in g:
            f.write(struct.pack("<%df" % len(CAMPI), *v))
    return len(intestazione)


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "prova_gaussiane.ply"
    g = scena()
    n = scrivi(out, g)
    import os
    print("%s  %d gaussiane  intestazione %d byte  totale %.1f MB"
          % (out, len(g), n, os.path.getsize(out) / 1024 / 1024))
    print("scena: 12.0 x 3.0 x 8.0 m, tre strisce di segnaletica complanari al pavimento")
