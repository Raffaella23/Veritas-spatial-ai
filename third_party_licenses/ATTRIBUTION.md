# Modelli e codice di terzi usati da EIDETICA

Stato al **20/09/2026**. Qui dentro sta il testo originale delle licenze, e qui
si scrive **cosa usiamo davvero**. Una riga si aggiunge quando il modello entra
nel prodotto, non quando lo proviamo.

---

## SAM 3.1 (Segment Anything 3.1) — Meta AI

> This product uses SAM 3.1 by Meta AI — Licensed under the SAM License.

| | |
|---|---|
| **Stato in EIDETICA** | ⏳ **valutato, non ancora integrato.** Candidato a sostituire OWLv2 come occhio, da server con GPU |
| **Licenza** | SAM License, versione del 19/11/2025 — testo integrale in [`SAM_LICENSE.txt`](./SAM_LICENSE.txt) |
| **Presa da** | `https://raw.githubusercontent.com/facebookresearch/sam3/main/LICENSE` (scaricata il 20/09/2026) |
| **Codice** | https://github.com/facebookresearch/sam3 |
| **Pesi** | https://huggingface.co/facebook/sam3.1 — **ad accesso chiesto**: si richiede a Meta, non si ridistribuiscono |

**Cosa permette** (art. 1.a): licenza *non esclusiva, mondiale, non trasferibile
e **royalty-free***, per usare, riprodurre, distribuire, copiare, fare opere
derivate e modificare. **Uso commerciale compreso**: non c'è nessuna clausola
«solo ricerca».

**Cosa dobbiamo fare per essere in regola:**

1. **Se un giorno distribuiamo i materiali di Meta** (pesi, codice del modello o
   un'opera derivata) a un terzo — per esempio dentro un pacchetto installabile,
   un'immagine Docker o un modello messo a punto da noi — dobbiamo **allegare una
   copia della licenza** (art. 1.b.i). Finché i pesi girano su un nostro server e
   il cliente riceve solo i risultati, questa clausola **non scatta**; teniamo lo
   stesso questa cartella, che costa niente.
2. **In una pubblicazione di ricerca** che usa SAM dobbiamo **citarlo** (art. 1.b.ii).
3. **Vietato** (art. 1.b.v): attività soggette a ITAR o vietate dai controlli
   sull'export, comprese quelle **militari o di guerra**, **nucleare**,
   **spionaggio**, **armi**. Vietato anche il reverse engineering del modello.
   Dobbiamo non essere soggetti a sanzioni commerciali.
4. **Niente garanzie**: i materiali sono forniti «as is», Meta non risponde dei
   risultati. Le misure e le verifiche di norma restano **responsabilità di
   EIDETICA**, cioè nostre: un modello che vede non certifica niente.

⚠️ **Nella licenza NON c'è una clausola sulla sorveglianza.** I divieti sono
quelli dell'elenco sopra. Se un giorno EIDETICA seguisse persone riconoscibili,
il vincolo vero sarebbe il **GDPR**, non Meta: dati personali, base giuridica,
informativa. Oggi EIDETICA non riconosce persone: conta corpi e misura spazi.

---

## DINOv3 — Meta AI

**Non usato.** Valutato il 20/09/2026 e rimandato: dà vettori semantici densi, non
nomi di zone, e per farne un classificatore servirebbe un insieme di esempi
etichettati che non abbiamo. Licenza: *DINOv3 License*, stessa forma della SAM
License (commerciale royalty-free, citazione nelle pubblicazioni, stessi divieti).
Se entrerà, qui va messo `DINOV3_LICENSE.md` e una riga come quella di SAM.

## SAM 3D Objects / SAM 3D Body — Meta AI

**Non usati.** Ricostruiscono un 3D da una foto: EIDETICA il 3D ce l'ha già (GLB o
splat) e non può accettare misure *inventate* da un modello generativo, perché il
suo prodotto sono misure. SAM 3D Body porta con sé anche il rig MHR, con una sua
licenza da verificare.

---

## Come si aggiorna questa cartella

- Un modello entra → si scarica la **sua** licenza originale qui dentro, con la
  data, e si aggiunge la riga «This product uses …».
- Un modello esce → la riga si toglie. Una nota vecchia lasciata accanto a quella
  nuova è un ordine ancora in vigore.
