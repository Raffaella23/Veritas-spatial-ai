# -*- coding: utf-8 -*-
"""Genera il pulviscolo della schermata d'attesa e lo scrive dentro index.html."""
import io
import math
import random
import sys

p = 'index.html'
s = io.open(p, encoding='utf-8', newline='').read()
# index.html gira fra strumenti che scrivono LF e strumenti che scrivono CRLF:
# non si suppone, si guarda.
NL = "\r\n" if "\r\n" in s else "\n"

random.seed(23)
COLORI = ["#2E5BFF", "#7B2FF7", "#E0219A", "#FF9A1F", "#B98CFF"]

cerchi = []
for _ in range(54):
    ang = random.uniform(0, 6.2832)
    r = random.uniform(0.42, 0.66)
    x = round(50 + 52 * r * math.cos(ang), 2)
    y = round(50 + 44 * r * math.sin(ang), 2)
    raggio = round(random.uniform(0.22, 0.72), 2)
    col = random.choice(COLORI)
    op = round(random.uniform(0.18, 0.62), 2)
    dur = round(random.uniform(2.6, 5.4), 2)
    inizio = round(random.uniform(0, 4.5), 2)
    dx = round(random.uniform(-1.6, 1.6), 2)
    dy = round(random.uniform(-1.9, 1.1), 2)
    cerchi.append(
        '      <circle cx="' + str(x) + '" cy="' + str(y) + '" r="' + str(raggio)
        + '" fill="' + col + '">'
        + '<animate attributeName="opacity" values="0;' + str(op) + ';0" dur="'
        + str(dur) + 's" begin="' + str(inizio) + 's" repeatCount="indefinite"/>'
        + '<animateTransform attributeName="transform" type="translate" values="0 0;'
        + str(dx) + ' ' + str(dy) + '" dur="' + str(dur) + 's" begin="'
        + str(inizio) + 's" repeatCount="indefinite"/>'
        + '</circle>')

VECCHIO = """    <div style="animation:eidetica-respiro 3.4s ease-in-out 1.2s infinite;">
      <img src="./Assets/Eidetica%20_logo_colorato.png" alt="EIDETICA — the intelligence layer for space"
           style="display:block;width:min(78vw,460px);height:auto;animation:eidetica-ali 1.15s cubic-bezier(.22,.9,.25,1) both;">
    </div>"""

MASCHERA = "radial-gradient(ellipse 88% 84% at 50% 50%, #000 62%, transparent 100%)"

NOTA = [
    '      <!-- IL PULVISCOLO. Idea di Raffaella, 05/09/2026.',
    '           Serve a una cosa concreta e a una vera.',
    "           La concreta: il fondo del file non e' piatto, ha una velatura, e su",
    "           qualunque tinta piena si vedeva il suo RETTANGOLO — che e' il modo in",
    '           cui un marchio perde. I punti se lo mangiano.',
    "           La vera: il marchio che si condensa da una polvere di punti E' il",
    "           prodotto. L'iride del logo e' gia' una rete di punti, e il programma",
    '           per davvero compone una comprensione un pezzo alla volta.',
    '           I punti sono NUMERI scritti nel file (seme 23): la pagina non calcola',
    "           niente mentre l'applicazione sta partendo. Rigenerabile con",
    '           python banco/pulviscolo.py -->',
]

NUOVO = (
    '    <div style="position:relative;animation:eidetica-respiro 3.4s ease-in-out 1.2s infinite;">\n'
    + "\n".join(NOTA) + '\n'
    '      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"\n'
    '           style="position:absolute;inset:-9% -7%;width:114%;height:118%;pointer-events:none;">\n'
    + "\n".join(cerchi) + '\n'
    '      </svg>\n'
    '      <img src="./Assets/Eidetica%20_logo_colorato.png" alt="EIDETICA — the intelligence layer for space"\n'
    '           style="position:relative;display:block;width:min(78vw,460px);height:auto;'
    'animation:eidetica-ali 1.15s cubic-bezier(.22,.9,.25,1) both;'
    '-webkit-mask-image:' + MASCHERA + ';mask-image:' + MASCHERA + ';">\n'
    '    </div>')

VECCHIO = VECCHIO.replace("\n", NL)
NUOVO = NUOVO.replace("\n", NL)

if s.count(VECCHIO) != 1:
    print("FERMO: blocco del marchio trovato %d volte" % s.count(VECCHIO))
    sys.exit(1)

io.open(p, 'w', encoding='utf-8', newline='').write(s.replace(VECCHIO, NUOVO))
print("ok: pulviscolo di %d punti, e il bordo del file sfumato" % len(cerchi))
