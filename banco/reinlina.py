#!/usr/bin/env python3
"""Reinlina un modulo di radice dentro index.html, sostituendo il suo blocco.

    python3 banco/reinlina.py veritas_aspetto.js __veritasAspetto

Il sorgente in radice e' la fonte unica (§13.2): l'inline si rigenera togliendo
gli `export` e aggiungendo la legatura a `window`. Questo script fa solo quello,
e poi verifica che il blocco 3 sia byte-per-byte quello di sempre.

Si individua il blocco per CONTENUTO (la firma window.__veritasX), mai per
numero: gli indici cambiano a ogni inserimento (§13.1).
"""
import os
import hashlib
import re
import sys
from html.parser import HTMLParser

# ⚠️ Il numero atteso era rimasto indietro: il blocco 3 era cambiato in un
#    commit precedente e nessuno lo aveva aggiornato, quindi l'allarme suonava
#    a ogni reinline. Un allarme che suona sempre non protegge piu' niente.
#    Rimesso in pari il 04/09/2026, dopo aver verificato che il blocco 3 e'
#    identico byte per byte a quello committato su main.
# ⚠️ 06/09/2026 — ribattuto, e la vecchia impronta (415c4124f57d6453) non vale
#    piu': quel giorno il bundle e' stato modificato a mano per aggiungere il
#    carattere Jura ai font del vestito EIDETICA. Ventitre caratteri, voluti,
#    verificati uno per uno: e' l'unica differenza in 872.517.
NL = chr(10)
SHA_BUNDLE = "beb4953744b92c5b"


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
    fuori = re.sub(r"^export (async )?function ", r"\1function ", testo, flags=re.M)
    fuori = re.sub(r"^export (const|let|var) ", r"\1 ", fuori, flags=re.M)
    fuori = re.sub(r"^export default \{", f"window.{legatura} = {{", fuori, flags=re.M)
    # ⚠️ A INIZIO RIGA, non ovunque nel testo. La versione precedente cercava
    #    "export " dovunque, e un commento in italiano che diceva «un export
    #    architettonico» faceva fallire il reinline — che poi vuol dire girare
    #    con la copia vecchia in pagina senza accorgersene, che e' esattamente
    #    il difetto silenzioso che questo script serve a evitare.
    if re.search(r"^export ", fuori, flags=re.M):
        raise SystemExit("e' rimasto un export a inizio riga nel testo generato")
    if f"window.{legatura} = {{" not in fuori:
        raise SystemExit(f"la legatura window.{legatura} non e' stata creata")
    return fuori


def chiavi_esportate(testo, firma):
    """Le chiavi del blocco `window.__veritasX = { ... }`.

    Serve a capire se il blocco che si sta per sostituire e' davvero il gemello
    di questo modulo: due moduli diversi non esportano le stesse funzioni.
    """
    i = testo.find(firma)
    if i < 0:
        return set()
    corpo = testo[i + len(firma):]
    fine = corpo.find(chr(10) + "};")
    if fine >= 0:
        corpo = corpo[:fine]
    return set(re.findall(r"^\s*([A-Za-z_$][\w$]*)\s*[,:]", corpo, flags=re.M))


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
    if len(bersagli) > 1:
        raise SystemExit(
            f"trovati {len(bersagli)} blocchi con la firma {firma}: "
            "atteso esattamente 1 (individuazione per contenuto)"
        )
    if bersagli:
        # ⚠️ LA GUARDIA CHE MANCAVA, pagata il 07/09/2026.
        #
        #    Il blocco si trova per la firma `window.__veritasX`, e la firma da
        #    sola non basta: se si sbaglia il nome della legatura si sovrascrive
        #    IL MODULO DI QUALCUN ALTRO. Il 07/09 e' stato chiesto
        #    `veritas_perception.js __veritasPerception`, ma quella legatura e'
        #    del modulo della VISIBILITA' (isovista, linea di vista, altezza dei
        #    muri): la percezione ci e' finita sopra e l'ha cancellato.
        #    Il comando ha detto «blocco reinlinato, bundle intatto» e sembrava
        #    andato bene. Il guasto e' uscito sulla pagina viva come
        #    `__veritasPerception.reset is not a function`, e aveva fermato
        #    tutta la catena dopo il righello umano: 83,34 m² invece di 3.363.
        #    La legatura giusta era `__veritasPerceptionEngine`.
        #
        #    Regola: si confrontano le CHIAVI ESPORTATE. Il blocco che sta in
        #    pagina e quello che si sta per scrivere devono esportare piu' o meno
        #    le stesse cose — se non hanno quasi niente in comune, quel blocco e'
        #    di un altro modulo e non si tocca.
        #    ⚠️ NON si guarda il nome del file: meta' dei moduli non si nomina
        #       nella propria intestazione (`veritas_perception.js` comincia con
        #       «VERITAS — Motore di Percezione» e basta), e una guardia che
        #       boccia anche il caso giusto viene disattivata il giorno dopo.
        vecchie = chiavi_esportate(bersagli[0][0], firma)
        nuove = chiavi_esportate(nuovo_corpo, firma)
        comuni = vecchie & nuove
        if nuove and vecchie and len(comuni) * 2 < len(nuove):
            raise SystemExit(NL.join([
                f"RIFIUTO: il blocco con la firma {firma} esporta",
                f"  {sorted(vecchie)}",
                f"mentre {os.path.basename(modulo)} esporta",
                f"  {sorted(nuove)}",
                f"In comune: {sorted(comuni) or 'NIENTE'}. E' un ALTRO modulo,",
                "e sovrascriverlo lo cancellerebbe in silenzio.",
                "Successo il 07/09/2026 con __veritasPerception (che e' la",
                "VISIBILITA': isovista, linea di vista, altezza dei muri) al",
                "posto di __veritasPerceptionEngine. Il comando disse «blocco",
                "reinlinato, bundle intatto», e il guasto usci' due ore dopo",
                "sulla pagina viva: 83,34 m2 invece di 3.363.",
                "Per trovare la legatura giusta:",
                "  grep -n 'window.__veritas[A-Za-z]* = {' index.html",
            ]))
        _, inizio, fine = bersagli[0]
        documento = documento[:inizio] + "\n" + nuovo_corpo + documento[fine:]
    else:
        # Modulo nuovo: si inserisce in fondo, prima della chiusura del corpo.
        # Va per ultimo di proposito — gli altri moduli devono aver gia' legato
        # le loro globali quando questo si aggancia a __veritasOnModelLoaded.
        chiusura = documento.rindex("</body>")
        blocco = f'<script type="module">\n{nuovo_corpo}</script>\n'
        documento = documento[:chiusura] + blocco + documento[chiusura:]
        print(f"(blocco NUOVO, inserito in fondo)")
    open("index.html", "w", encoding="utf-8").write(documento)

    # Verifica: il bundle React non si tocca, mai.
    #
    # ⚠️ SI CERCA PER IMPRONTA, NON PER POSIZIONE — corretto il 06/09/2026.
    #    Questa guardia diceva `blocchi[3]`, e il 06/09 il bundle e' scivolato
    #    al blocco 4 (la schermata d'attesa EIDETICA ha portato i blocchi da 34
    #    a 37). Da quel momento il reinlinatore gridava «BLOCCO 3 ALTERATO» a
    #    ogni esecuzione, su un bundle intatto: un allarme finto, cioe'
    #    esattamente cio' contro cui la guardia era stata scritta. Un allarme
    #    che suona sempre e' un allarme spento.
    #    Cercandolo per impronta fra TUTTI i blocchi, aggiungerne uno non
    #    disturba piu' niente, e se il bundle sparisce davvero si sente.
    q = Estrai()
    q.feed(open("index.html", encoding="utf-8").read())
    dove = [i for i, b in enumerate(q.blocchi)
            if hashlib.sha256(b[0].encode()).hexdigest()[:16] == SHA_BUNDLE]
    if not dove:
        raise SystemExit(
            f"BUNDLE ALTERATO: nessuno dei {len(q.blocchi)} blocchi "
            f"ha l'impronta {SHA_BUNDLE}")

    print(f"{modulo} -> blocco reinlinato, {len(nuovo_corpo)} byte")
    print(f"blocchi totali: {len(q.blocchi)} — bundle intatto al blocco {dove[0]}")


if __name__ == "__main__":
    main()
