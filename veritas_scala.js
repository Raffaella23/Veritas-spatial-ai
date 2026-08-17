// veritas_scala.js — la scala si LEGGE, e solo se non c'e' si deduce.
//
// IL PROBLEMA: UNA DIPENDENZA CIRCOLARE
//
// La scala veniva dedotta dalla mediana della larghezza dei VARCHI
// (veritasScaleSanity): "una porta non e' mai piu' stretta di 80 cm, se la
// mediana sta sotto allora non sono metri". Il ragionamento e' giusto, la
// catena no. I varchi li misura il motore di occupazione; il motore lavora su
// una griglia di celle; la griglia dipende dalla densita' della nuvola
// campionata. Quindi:
//
//     campionamento -> varchi misurati -> scala -> campionamento
//
// E' un cerchio, e si e' chiuso davvero: cambiando il tetto dei campioni della
// prima passata, il modello e' finito dieci volte piu' piccolo in area (impronta
// 821 m2 invece di 8186). Nessuno avrebbe capito perche'.
//
// LA STRADA, dalla letteratura e dalle specifiche dei formati
//
// La scala nella maggior parte dei casi NON va dedotta: sta scritta nel file.
//
//   glTF / GLB   la specifica Khronos dichiara che tutte le distanze lineari
//                sono in METRI. Un GLB conforme e' gia' in scala.
//                In pratica gli esportatori la violano continuamente -- e'
//                esattamente il motivo per cui esiste la richiesta di un campo
//                "unit" esplicito (glTF issue #2425). Quindi la specifica si
//                crede, ma si verifica.
//   FBX          ha il campo esplicito GlobalSettings > UnitScaleFactor
//                (centimetri per default). Ma il FBXLoader di three.js LO
//                IGNORA -- bug aperto noto (three.js #20402, assimp #775).
//                Cioe' la scala e' scritta nel file e viene buttata via.
//   OBJ PLY SPZ  nessuna unita', mai. Solo qui dedurre e' inevitabile.
//
// QUANDO SI DEVE DEDURRE: BANDE, NON UN NUMERO
//
// Un invariante architettonico non da' un fattore: da' un INTERVALLO di fattori
// plausibili. L'altezza di piano di un edificio sta fra 2,5 e 6,5 m: se quella
// misurata e' 0,745 m, il fattore sta fra 3,4 e 8,7. Piu' invarianti si
// INTERSECANO, e l'intersezione e' piu' stretta di ognuno.
//
// Cosi' la stima e' onesta: si dichiara la banda, non una precisione finta. Il
// vecchio codice diceva "6x" come se fosse una misura, e non lo era.
//
// Gli invarianti usati qui sono NON CIRCOLARI: vengono dalle quote dei piani e
// dall'ingombro, non dalla griglia di occupazione. La mediana dei varchi resta
// utile, ma solo come CONFERMA a valle -- mai come sorgente.

/** Altezza fra due piani consecutivi, in un edificio reale. */
export const PIANO_MIN_M = 2.5;   // un interpiano sotto 2,5 m non e' abitabile
export const PIANO_MAX_M = 6.5;   // sopra: atri a doppia altezza, terminal

/** Altezza totale di qualunque edificio. */
export const EDIFICIO_MIN_M = 2.4;
export const EDIFICIO_MAX_M = 300;

/**
 * UnitScaleFactor da un file FBX, letto dai byte.
 *
 * Non serve un parser FBX completo: la proprieta' si chiama sempre
 * "UnitScaleFactor" e nel binario e' seguita dal tipo e dal valore. Si cerca la
 * stringa e si legge il primo double o float plausibile che segue. Funziona sia
 * sul binario che sull'ASCII, dove il valore compare come testo.
 *
 * @param {Uint8Array} bytes
 * @returns {{unitScaleFactor:number, fattoreVersoMetri:number}|null}
 */
export function unitaDaFBX(bytes) {
  if (!bytes || !bytes.length) return null;
  const ago = "UnitScaleFactor";
  const codici = [];
  for (let i = 0; i < ago.length; i++) codici.push(ago.charCodeAt(i));

  let posizione = -1;
  for (let i = 0; i + codici.length <= bytes.length; i++) {
    let uguale = true;
    for (let k = 0; k < codici.length; k++) {
      if (bytes[i + k] !== codici[k]) { uguale = false; break; }
    }
    if (uguale) { posizione = i + codici.length; break; }
  }
  if (posizione < 0) return null;

  const finestra = bytes.subarray(posizione, Math.min(bytes.length, posizione + 128));

  // ASCII: il valore compare come testo dopo virgole e tipi.
  let testo = "";
  for (let i = 0; i < finestra.length; i++) {
    const c = finestra[i];
    testo += (c >= 32 && c < 127) ? String.fromCharCode(c) : " ";
  }
  const numeri = testo.match(/-?\d+\.\d+|-?\d+/g);
  if (numeri) {
    for (const n of numeri) {
      const v = parseFloat(n);
      if (plausibileUnitScale(v)) return { unitScaleFactor: v, fattoreVersoMetri: v / 100 };
    }
  }

  // Binario: si prova a leggere double e float ad allineamenti vicini.
  const vista = new DataView(finestra.buffer, finestra.byteOffset, finestra.byteLength);
  for (let off = 0; off + 8 <= finestra.byteLength; off++) {
    const d = vista.getFloat64(off, true);
    if (plausibileUnitScale(d)) return { unitScaleFactor: d, fattoreVersoMetri: d / 100 };
  }
  for (let off = 0; off + 4 <= finestra.byteLength; off++) {
    const f = vista.getFloat32(off, true);
    if (plausibileUnitScale(f)) return { unitScaleFactor: f, fattoreVersoMetri: f / 100 };
  }
  return null;
}

/**
 * Un UnitScaleFactor sensato. I valori che si incontrano davvero sono 1 (cm),
 * 2,54 (pollici), 30,48 (piedi), 100 (metri), 0,1 (mm). Un double letto a un
 * allineamento sbagliato da' numeri assurdi, e questo li scarta.
 */
function plausibileUnitScale(v) {
  if (typeof v !== "number" || !isFinite(v) || v <= 0) return false;
  return v >= 0.05 && v <= 1000;
}

/**
 * Il fattore dichiarato dal formato, quando esiste.
 * @returns {{fattore:number, provenienza:string, fiducia:string, spiegazione:string}|null}
 */
export function scalaDaUnitaDichiarate({ formato, bytes } = {}) {
  const f = String(formato || "").toLowerCase().replace(/^\./, "");
  if (f === "fbx") {
    const u = unitaDaFBX(bytes);
    if (u) {
      return {
        fattore: u.fattoreVersoMetri,
        provenienza: "unita dichiarate nel file (FBX UnitScaleFactor = " + u.unitScaleFactor + ")",
        fiducia: "alta",
        spiegazione: "Il file FBX dichiara UnitScaleFactor " + u.unitScaleFactor
          + ", cioe' " + descriviUnita(u.unitScaleFactor) + ". Il FBXLoader di three.js ignora"
          + " questo campo (bug noto), quindi lo applico io.",
      };
    }
    return null;
  }
  if (f === "gltf" || f === "glb") {
    return {
      fattore: 1,
      provenienza: "specifica glTF (distanze lineari in metri)",
      fiducia: "media",
      spiegazione: "La specifica glTF dichiara tutte le distanze lineari in metri, quindi"
        + " in linea di principio questo modello e' gia' in scala. Gli esportatori la"
        + " violano spesso, percio' lo verifico sugli invarianti.",
    };
  }
  return null; // obj, ply, splat: nessuna unita' dichiarata, mai
}

/** Banda di fattori compatibili con un'altezza di piano reale. */
export function bandaDaAltezzaPiano(dislivelliM) {
  const validi = (dislivelliM || []).filter((d) => typeof d === "number" && isFinite(d) && d > 0.01);
  if (!validi.length) return null;
  // Si usa la MEDIANA: un dislivello puo' essere un soppalco tecnico o un
  // artefatto, ma gli interpiani di un edificio si addensano.
  const ordinati = validi.slice().sort((a, b) => a - b);
  const mediana = ordinati[Math.floor(ordinati.length / 2)];
  return {
    min: PIANO_MIN_M / mediana,
    max: PIANO_MAX_M / mediana,
    da: "altezza di piano misurata " + mediana.toFixed(2) + " m",
  };
}

/** Banda di fattori compatibili con l'altezza totale di un edificio. */
export function bandaDaAltezzaTotale(altezzaM) {
  if (typeof altezzaM !== "number" || !isFinite(altezzaM) || altezzaM <= 0.01) return null;
  return {
    min: EDIFICIO_MIN_M / altezzaM,
    max: EDIFICIO_MAX_M / altezzaM,
    da: "altezza totale misurata " + altezzaM.toFixed(2) + " m",
  };
}

/**
 * Banda di fattori compatibili con la larghezza reale di porte e passaggi.
 *
 * ⚠️ QUESTA E' L'UNICA BANDA CIRCOLARE, e va trattata di conseguenza.
 * Le larghezze le misura il motore di occupazione, che lavora su una griglia di
 * celle, la cui risoluzione dipende dalla densita' della nuvola. Quindi il
 * valore si sposta se cambia il campionamento -- ed e' esattamente cosi' che il
 * vecchio codice, che la usava da SOLA e come numero secco, ha fatto finire un
 * modello dieci volte piu' piccolo.
 *
 * Perche' allora tenerla: perche' e' informazione vera, e su un modello senza
 * unita' dichiarate e con un solo piano rilevato e' l'unico invariante
 * disponibile. Misurato: senza di lei la banda dalla sola altezza totale va da
 * 1,1x a 143x, cioe' non dice niente.
 *
 * La differenza rispetto a prima e' il ruolo: una banda fra le altre, che si
 * interseca e che da sola abbassa la fiducia -- non la sorgente della verita'.
 */
export const VARCO_MIN_M = 0.80;  // porta minima: sotto non ci passa una persona
export const VARCO_MAX_M = 1.60;  // sopra siamo su passaggi larghi, non su porte

export function bandaDaVarchi(larghezzeM) {
  const valide = (larghezzeM || []).filter((w) => typeof w === "number" && isFinite(w) && w > 0);
  if (valide.length < 3) return null; // troppo poche misure per una mediana
  const ordinate = valide.slice().sort((a, b) => a - b);
  const mediana = ordinate[Math.floor(ordinate.length / 2)];
  if (mediana <= 0) return null;
  return {
    min: VARCO_MIN_M / mediana,
    max: VARCO_MAX_M / mediana,
    da: "larghezza mediana dei varchi " + mediana.toFixed(2) + " m",
    circolare: true,
  };
}

/** Intersezione di piu' bande. Null se sono incompatibili fra loro. */
export function intersecaBande(bande) {
  const valide = (bande || []).filter((b) => b && isFinite(b.min) && isFinite(b.max) && b.min <= b.max);
  if (!valide.length) return null;
  let min = -Infinity, max = Infinity;
  for (const b of valide) { min = Math.max(min, b.min); max = Math.min(max, b.max); }
  if (min > max) return null; // gli invarianti si contraddicono: non si indovina
  return { min, max, da: valide.map((b) => b.da).join(" + ") };
}

/**
 * Il fattore da una banda. Media GEOMETRICA e non aritmetica: la scala e' una
 * grandezza moltiplicativa, e fra 2x e 8x il centro giusto e' 4x, non 5x.
 */
export function fattoreDaBanda(banda) {
  if (!banda) return null;
  return Math.sqrt(banda.min * banda.max);
}

/**
 * LA DECISIONE.
 *
 * Ordine: unita' dichiarate, poi invarianti, poi si chiede. Le unita' dichiarate
 * vincono, ma se gli invarianti le contraddicono in modo grosso (oltre 2x) si
 * dichiara il conflitto invece di ignorarlo -- e' il caso dell'esportatore che
 * ha scritto metri e ha esportato centimetri.
 */
export function decidiScala({ formato, bytes, altezzaTotaleM, dislivelliM, larghezzeVarchiM } = {}) {
  const bande = [
    bandaDaAltezzaPiano(dislivelliM),
    bandaDaAltezzaTotale(altezzaTotaleM),
    bandaDaVarchi(larghezzeVarchiM),
  ].filter(Boolean);
  const banda = intersecaBande(bande);
  // LA FIDUCIA non dipende da quante bande ci sono, ma da quanto STRINGONO.
  //
  // Prima guardavo solo "sono tutte circolari?". Una prova l'ha smontato: con
  // altezza totale 2,1 m la banda va da 1,1x a 143x, cioe' non dice niente, e
  // pur essendo non circolare faceva risultare "media" una stima che in realta'
  // poggiava solo sui varchi. Una banda larga 125 volte non e' un invariante:
  // e' un vincolo di buon senso.
  const informativa = (b) => b && b.min > 0 && (b.max / b.min) <= 10;
  const appoggioSolido = bande.some((b) => !b.circolare && informativa(b));
  const soloCircolare = bande.length > 0 && !appoggioSolido;

  const dichiarata = scalaDaUnitaDichiarate({ formato, bytes });
  if (dichiarata) {
    if (banda && (dichiarata.fattore < banda.min / 2 || dichiarata.fattore > banda.max * 2)) {
      const suggerito = fattoreDaBanda(banda);
      return {
        fattore: arrotonda(suggerito),
        provenienza: "invarianti architettonici (unita' dichiarate in conflitto)",
        fiducia: soloCircolare ? "bassa" : "media",
        banda: { min: +banda.min.toFixed(2), max: +banda.max.toFixed(2) },
        conflitto: true,
        spiegazione: "Il formato dichiara scala " + dichiarata.fattore + "x, ma "
          + banda.da + " la colloca fra " + banda.min.toFixed(1) + "x e " + banda.max.toFixed(1)
          + "x. Quando il file e la geometria si contraddicono credo alla geometria: un"
          + " esportatore che sbaglia le unita' e' molto piu' comune di un edificio impossibile.",
      };
    }
    return { ...dichiarata, banda: banda ? { min: +banda.min.toFixed(2), max: +banda.max.toFixed(2) } : null };
  }

  if (!banda) {
    return {
      fattore: null,
      provenienza: "nessuna",
      fiducia: "nessuna",
      spiegazione: "Questo formato non dichiara unita' e non ho abbastanza geometria per"
        + " dedurle. Dimmi tu la scala con \"scala modello <n>\", oppure quanto e' alto"
        + " un piano di questo spazio.",
      chiediAllUtente: true,
    };
  }

  const f = fattoreDaBanda(banda);
  const serve = f < 0.9 || f > 1.1; // dentro il 10% si considera gia' in scala
  return {
    fattore: serve ? arrotonda(f) : 1,
    provenienza: "invarianti architettonici",
    fiducia: (soloCircolare || banda.max / banda.min > 3) ? "bassa" : "media",
    banda: { min: +banda.min.toFixed(2), max: +banda.max.toFixed(2) },
    spiegazione: serve
      ? "Questo formato non dichiara le unita'. " + maiuscola(banda.da) + ", che per un"
        + " edificio reale colloca il fattore fra " + banda.min.toFixed(1) + "x e "
        + banda.max.toFixed(1) + "x: prendo " + arrotonda(f) + "x, il centro della banda."
        + " Se la scala di questo spazio la riconosci tu, scrivi \"scala modello <n>\"."
      : maiuscola(banda.da) + ": il modello risulta gia' in scala.",
  };
}

/**
 * La mediana dei varchi come CONFERMA, non come sorgente. Torna un avviso
 * quando contraddice la scala applicata: e' un'informazione utile, ma arriva
 * dopo l'analisi e non puo' guidarla senza chiudere il cerchio.
 */
export function confermaDaVarchi(larghezzeM, { varcoMinM = 0.80, varcoMaxM = 4.0 } = {}) {
  const valide = (larghezzeM || []).filter((w) => typeof w === "number" && isFinite(w) && w > 0);
  if (valide.length < 3) return null;
  const ordinate = valide.slice().sort((a, b) => a - b);
  const mediana = ordinate[Math.floor(ordinate.length / 2)];
  if (mediana >= varcoMinM && mediana <= varcoMaxM) {
    return { coerente: true, mediana, messaggio: null };
  }
  return {
    coerente: false,
    mediana,
    messaggio: mediana < varcoMinM
      ? "I varchi misurati hanno mediana " + mediana.toFixed(2) + " m, sotto la porta minima"
        + " di " + varcoMinM.toFixed(2) + " m: la scala applicata potrebbe essere ancora"
        + " troppo piccola. Attenzione, questa misura dipende dalla densita' della nuvola,"
        + " quindi e' un indizio e non una prova."
      : "I varchi misurati hanno mediana " + mediana.toFixed(2) + " m, sopra i "
        + varcoMaxM.toFixed(1) + " m: o la scala e' troppo grande, o il motore non ha"
        + " riconosciuto i muri e sta misurando spazio aperto.",
  };
}

function arrotonda(f) {
  if (f == null || !isFinite(f)) return null;
  return f >= 10 ? Math.round(f) : +f.toFixed(1);
}
function descriviUnita(usf) {
  if (Math.abs(usf - 1) < 0.01) return "centimetri";
  if (Math.abs(usf - 100) < 0.5) return "metri";
  if (Math.abs(usf - 2.54) < 0.01) return "pollici";
  if (Math.abs(usf - 30.48) < 0.05) return "piedi";
  if (Math.abs(usf - 0.1) < 0.005) return "millimetri";
  return usf + " centimetri per unita";
}
function maiuscola(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

export default {
  unitaDaFBX, scalaDaUnitaDichiarate, bandaDaAltezzaPiano, bandaDaAltezzaTotale, bandaDaVarchi,
  intersecaBande, fattoreDaBanda, decidiScala, confermaDaVarchi,
  PIANO_MIN_M, PIANO_MAX_M, EDIFICIO_MIN_M, EDIFICIO_MAX_M, VARCO_MIN_M, VARCO_MAX_M,
};
