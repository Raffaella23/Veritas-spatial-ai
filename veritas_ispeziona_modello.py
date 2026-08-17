#!/usr/bin/env python3
"""
Ispezione di un modello 3D: cosa c'e' dentro, e in che scala.

    python3 veritas_ispeziona_modello.py <file.glb>

Serve a rispondere PRIMA di scrivere codice a tre domande che finora si sono
date per scontate, sbagliando:

  1. In che scala e' il modello? Le soglie normative sono in metri. Se il
     modello non e' 1:1 ogni confronto e' senza senso, e non lo dice nessuno.
  2. Ci sono elementi colorati appoggiati al pavimento? Sono la segnaletica
     orizzontale: le frecce di flusso disegnate da chi ha progettato lo spazio.
  3. La regola DECAL di index.html li riconoscerebbe?

Il riconoscimento e' PER COLORE E GEOMETRIA, mai per nome. Un elenco di parole
("arrow", "freccia", "flow") e' la stessa trappola gia' pagata due volte in
questo progetto: coi pannelli cercati per testo italiano e invisibili in
inglese, e con le zone cercate per nome della mesh. Il modello puo' arrivare da
chiunque, in qualunque lingua.
"""
import sys
import colorsys
import numpy as np
import trimesh

# Le stesse tre soglie della regola in index.html blocco 2. Sono qui per
# poterle CONFRONTARE con la misura, non per riapplicarle alla cieca.
DECAL_SPESSORE_MAX = 0.05
DECAL_STACCO_MAX = 0.15
DECAL_RAPPORTO_AREA = 4
DECAL_SOVRAPPOSIZIONE_MIN = 0.9

SATURAZIONE_MIN = 0.5      # sotto questa e' grigio d'architettura, non vernice
SPESSORE_PLACCA_MAX = 0.30  # oltre non e' una placca ma un volume


def colore_base(mesh):
    """Colore del materiale. None se non leggibile."""
    try:
        mat = getattr(mesh.visual, "material", None)
        if mat is not None:
            for attr in ("baseColorFactor", "main_color", "diffuse"):
                c = getattr(mat, attr, None)
                if c is not None:
                    c = np.asarray(c, dtype=float)
                    return (c / 255.0 if c.max() > 1.5 else c)[:3]
        if getattr(mesh.visual, "kind", None) == "vertex":
            return np.asarray(mesh.visual.vertex_colors, float)[:, :3].mean(axis=0) / 255.0
    except Exception:
        pass
    return None


def istanze(scena):
    """Ogni geometria puo' comparire piu' volte con trasformazioni diverse.
    Restituisce i vertici gia' in coordinate mondo, una voce per istanza."""
    for nodo in scena.graph.nodes_geometry:
        T, nome = scena.graph[nodo]
        mesh = scena.geometry.get(nome)
        if mesh is None:
            continue
        yield nome, mesh, trimesh.transform_points(mesh.vertices, T)


def impronta(v):
    lo, hi = v.min(0), v.max(0)
    return (hi[0] - lo[0]) * (hi[2] - lo[2])


def scatola_pianta(v):
    lo, hi = v.min(0), v.max(0)
    return [lo[0], hi[0], lo[2], hi[2]]


def sovrapposizione(b, o):
    w = max(0.0, min(b[1], o[1]) - max(b[0], o[0]))
    d = max(0.0, min(b[3], o[3]) - max(b[2], o[2]))
    a = (b[1] - b[0]) * (b[3] - b[2])
    return (w * d) / a if a > 0 else 0.0


def asse_principale(v):
    """Direzione dell'asse lungo in pianta, e quanto l'elemento e' allungato.
    Su una freccia l'asse lungo E' il verso di marcia."""
    p = v[:, [0, 2]]
    p = p - p.mean(0)
    if len(p) < 3:
        return 0.0, 1.0
    lam, _, V = np.linalg.svd(p, full_matrices=False), None, None
    U, S, V = np.linalg.svd(p, full_matrices=False)
    ang = float(np.degrees(np.arctan2(V[0, 1], V[0, 0])) % 180)
    elong = float(S[0] / max(S[1], 1e-9))
    return ang, elong


def trova_pavimento(inst):
    """La superficie orizzontale piu' estesa. Restituisce (quota_superiore,
    scatola_in_pianta, impronta)."""
    best = None
    for _, _, v in inst:
        e = v.max(0) - v.min(0)
        if e[1] > SPESSORE_PLACCA_MAX:
            continue
        imp = impronta(v)
        if best is None or imp > best[2]:
            best = (float(v.max(0)[1]), scatola_pianta(v), imp)
    return best


def main(path):
    scena = trimesh.load(path, process=False)
    inst = list(istanze(scena))
    b = scena.bounds
    dim = b[1] - b[0]

    print("=" * 68)
    print(f"  {path}")
    print("=" * 68)
    print(f"geometrie: {len(scena.geometry)}   istanze: {len(inst)}")
    print(f"ingombro (unita' del modello): {dim[0]:.2f} x {dim[1]:.2f} x {dim[2]:.2f}")

    # --- SCALA -------------------------------------------------------------
    # Nessun modo affidabile di dedurla da solo: si riportano gli indizi e si
    # dichiara l'incertezza, invece di scegliere un numero e tacere.
    verticali = []
    for nome, _, v in inst:
        e = v.max(0) - v.min(0)
        if e[1] > max(e[0], e[2]) * 1.6 and e[1] > 0.1:
            verticali.append((float(e[1]), nome))
    verticali.sort(reverse=True)
    print("\n--- SCALA ---")
    print(f"altezza totale della scena: {dim[1]:.2f}")
    if dim[1] < 4.0:
        print("  ATTENZIONE: una scena architettonica alta meno di 4 unita' NON puo' essere")
        print("  in metri 1:1. Le soglie normative (larghezze minime, altezze) sono in metri:")
        print("  confrontarle con queste unita' da' risultati privi di senso.")
    if verticali:
        print("  oggetti verticali piu' alti (per stimare la scala a occhio):")
        for h, n in verticali[:5]:
            print(f"    {n[:44]:44s} {h:.3f}")

    # --- PAVIMENTO ---------------------------------------------------------
    pav = trova_pavimento(inst)
    if not pav:
        print("\nNessuna superficie orizzontale estesa: non trovo il pavimento.")
        return
    pav_y, pav_box, pav_imp = pav
    print(f"\n--- PAVIMENTO ---\nfaccia superiore a Y = {pav_y:+.3f}   impronta {pav_imp:.1f}")

    # --- ELEMENTI COLORATI APPOGGIATI AL PAVIMENTO -------------------------
    trovati = []
    for nome, mesh, v in inst:
        c = colore_base(mesh)
        if c is None:
            continue
        r, g, bl = (float(x) for x in c)
        h, l, sat = colorsys.rgb_to_hls(r, g, bl)
        if sat < SATURAZIONE_MIN or not (0.12 < l < 0.92):
            continue
        e = v.max(0) - v.min(0)
        if e[1] > SPESSORE_PLACCA_MAX:
            continue
        ang, elong = asse_principale(v)
        trovati.append(dict(
            nome=nome, tinta=h * 360, sat=sat, rgb=(r, g, bl),
            spessore=float(e[1]), stacco=float(v.min(0)[1] - pav_y),
            impronta=impronta(v), sovr=sovrapposizione(scatola_pianta(v), pav_box),
            ang=ang, elong=elong,
        ))

    if not trovati:
        print("\nNessun elemento colorato piatto vicino al pavimento.")
        return

    # raggruppa per tinta, senza nomi di colore precotti
    trovati.sort(key=lambda x: x["tinta"])
    gruppi, corrente = [], [trovati[0]]
    for t in trovati[1:]:
        if t["tinta"] - corrente[-1]["tinta"] <= 25:
            corrente.append(t)
        else:
            gruppi.append(corrente); corrente = [t]
    gruppi.append(corrente)

    print(f"\n--- SEGNALETICA ORIZZONTALE: {len(trovati)} elementi, {len(gruppi)} famiglie di tinta ---")
    for gr in gruppi:
        if len(gr) < 2:
            continue
        tinte = np.array([x["tinta"] for x in gr])
        st = np.array([x["stacco"] for x in gr])
        sp = np.array([x["spessore"] for x in gr])
        el = np.array([x["elong"] for x in gr])
        rgb = gr[0]["rgb"]
        print(f"\n  tinta {tinte.mean():5.0f}deg  rgb=({rgb[0]:.2f},{rgb[1]:.2f},{rgb[2]:.2f})  n={len(gr)}")
        print(f"    spessore  mediana {np.median(sp):.4f}   stacco dal pavimento  mediana {np.median(st):+.3f}"
              f"  (min {st.min():+.3f}  max {st.max():+.3f})")
        print(f"    allungamento mediana {np.median(el):.2f}")
        dirs = sorted({round(x["ang"] / 5) * 5 for x in gr if x["elong"] > 2})
        if dirs:
            print(f"    direzioni dell'asse lungo: {dirs}")

        # verdetto sulla regola gia' presente in index.html
        presi = sum(1 for x in gr
                    if x["spessore"] <= DECAL_SPESSORE_MAX
                    and -0.01 <= x["stacco"] <= DECAL_STACCO_MAX
                    and x["sovr"] >= DECAL_SOVRAPPOSIZIONE_MIN
                    and pav_imp >= x["impronta"] * DECAL_RAPPORTO_AREA)
        esito = "TUTTI" if presi == len(gr) else ("NESSUNO" if presi == 0 else f"SOLO {presi}")
        print(f"    regola DECAL di index.html: riconosce {esito} su {len(gr)}")
        if presi < len(gr):
            oltre = [x for x in gr if x["stacco"] > DECAL_STACCO_MAX]
            if oltre:
                print(f"      -> {len(oltre)} sopra DECAL_STACCO_MAX={DECAL_STACCO_MAX}"
                      f" (fino a {max(x['stacco'] for x in oltre):+.3f})")

    print("\n" + "=" * 68)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    main(sys.argv[1])
