#!/usr/bin/env python3
"""Reinlina un modulo di radice dentro index.html, sostituendo il suo blocco.

    python3 banco/reinlina.py veritas_aspetto.js __veritasAspetto

Il sorgente in radice e' la fonte unica (§13.2): l'inline si rigenera togliendo
gli `export` e aggiungendo la legatura a `window`. Questo script fa solo quello,
e poi verifica che il blocco 3 sia byte-per-byte quello di sempre.

Si individua il blocco per CONTENUTO (la firma window.__veritasX), mai per
numero: gli indici cambiano a ogni inserimento (§13.1).
"""
import hashlib
import re
import sys
from html.parser import HTMLParser

SHA_BLOCCO_3 = "eedd9935ea908fd3"


class Estrai(HTMLParser):
    """Individua i blocchi <script> con le regole raw-text del browser.

    Serve html.parser e non una regex: il bundle minificato contiene stringhe
    che sembrano tag e mandano in tilt le regex (regola di progetto).
    """

    def __init__(self):
        super().__init__()
        self.blocchi = []          # (testo, inizio_testo, fine_testo)
        self.dentro = False
        self.pezzi = []
        self.inizio = None

    def handle_starttag(self, tag, attrs):
        if tag == "script":
            self.dentro = True
            self.pezzi = []
            # offset subito dopo il tag di apertura
            riga, col = self.getpos()
            self.inizio = self.tag_end_offset()

    def tag_end_offset(self):
        # posizione assoluta della fine del tag di apertura
        testo = self.rawdata
        return testo.index(">", self.offset_corrente()) + 1

    def offset_corrente(self):
        riga, col = self.getpos()
        righe = self.rawdata.split("\n")
        return sum(len(r) + 1 for r in righe[: riga - 1]) + col

    def handle_endtag(self, tag):
        if tag == "script" and self.dentro:
            self.dentro = False
            fine = self.offset_corrente()
            self.blocchi.append(("".join(self.pezzi), self.inizio, fine))
            self.pezzi = []

    def handle_data(self, dati):
        if self.dentro:
            self.pezzi.append(dati)


def sorgente_inline(percorso, legatura):
    testo = open(percorso, encoding="utf-8").read()
    if "</script" in testo:
        raise SystemExit(f"{percorso} contiene '</script': non si puo' inlinare")
    fuori = re.sub(r"^export function ", "function ", testo, flags=re.M)
    fuori = re.sub(r"^export default \{", f"window.{legatura} = {{", fuori, flags=re.M)
    if "export " in fuori:
        raise SystemExit("e' rimasto un export nel testo generato")
    if f"window.{legatura} = {{" not in fuori:
        raise SystemExit(f"la legatura window.{legatura} non e' stata creata")
    return fuori


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    modulo, legatura = sys.argv[1], sys.argv[2]
    nuovo_corpo = sorgente_inline(modulo, legatura)

    documento = open("index.html", encoding="utf-8").read()
    p = Estrai()
    p.feed(documento)

    firma = f"window.{legatura} = {{"
    bersagli = [b for b in p.blocchi if firma in b[0]]
    if len(bersagli) != 1:
        raise SystemExit(
            f"trovati {len(bersagli)} blocchi con la firma {firma}: "
            "atteso esattamente 1 (individuazione per contenuto)"
        )
    _, inizio, fine = bersagli[0]

    documento = documento[:inizio] + "\n" + nuovo_corpo + documento[fine:]
    open("index.html", "w", encoding="utf-8").write(documento)

    # Verifica: il blocco 3 non si tocca, mai.
    q = Estrai()
    q.feed(open("index.html", encoding="utf-8").read())
    sha = hashlib.sha256(q.blocchi[3][0].encode()).hexdigest()[:16]
    if sha != SHA_BLOCCO_3:
        raise SystemExit(f"BLOCCO 3 ALTERATO: {sha} (atteso {SHA_BLOCCO_3})")

    print(f"{modulo} -> blocco reinlinato, {len(nuovo_corpo)} byte")
    print(f"blocchi totali: {len(q.blocchi)} — blocco 3 intatto ({sha})")


if __name__ == "__main__":
    main()
