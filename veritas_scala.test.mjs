// Prove di veritas_scala.js
//
//     node veritas_scala.test.mjs

import S from "./veritas_scala.js";

let fatte = 0, rotte = 0;
function ok(cosa, cond) {
  fatte++;
  if (cond) return;
  rotte++;
  console.error("  ROTTA: " + cosa);
}

// --- UnitScaleFactor da FBX ----------------------------------------------
function fbxAscii(valore) {
  const s = `; FBX 7.4.0 project file\nGlobalSettings:  {\n  Properties70:  {\n    P: "UnitScaleFactor", "double", "Number", "",${valore}\n  }\n}`;
  return new TextEncoder().encode(s);
}
function fbxBinario(valore) {
  // "UnitScaleFactor" seguito da un double little-endian, come nel binario.
  const nome = new TextEncoder().encode("UnitScaleFactor");
  const buf = new ArrayBuffer(nome.length + 16);
  const b = new Uint8Array(buf);
  b.set(nome, 0);
  b[nome.length] = 0x44; // 'D', marcatore di tipo double
  new DataView(buf).setFloat64(nome.length + 1, valore, true);
  return b;
}
{
  ok("FBX ascii in centimetri (usf 1)", S.unitaDaFBX(fbxAscii(1)).unitScaleFactor === 1);
  ok("usf 1 -> fattore 0,01 verso i metri",
     Math.abs(S.unitaDaFBX(fbxAscii(1)).fattoreVersoMetri - 0.01) < 1e-9);
  ok("FBX ascii in metri (usf 100)", S.unitaDaFBX(fbxAscii(100)).unitScaleFactor === 100);
  ok("usf 100 -> fattore 1", S.unitaDaFBX(fbxAscii(100)).fattoreVersoMetri === 1);
  ok("FBX ascii in pollici (usf 2.54)",
     Math.abs(S.unitaDaFBX(fbxAscii(2.54)).unitScaleFactor - 2.54) < 1e-9);
  ok("FBX ascii in piedi (usf 30.48)",
     Math.abs(S.unitaDaFBX(fbxAscii(30.48)).unitScaleFactor - 30.48) < 1e-9);
  ok("FBX binario in metri", Math.abs(S.unitaDaFBX(fbxBinario(100)).unitScaleFactor - 100) < 1e-6);
  ok("FBX binario in millimetri", Math.abs(S.unitaDaFBX(fbxBinario(0.1)).unitScaleFactor - 0.1) < 1e-6);
  ok("senza il campo torna null", S.unitaDaFBX(new TextEncoder().encode("niente qui")) === null);
  ok("byte vuoti tornano null", S.unitaDaFBX(new Uint8Array(0)) === null);
  ok("argomento assente torna null", S.unitaDaFBX(null) === null);
  ok("un valore assurdo viene scartato", S.unitaDaFBX(fbxAscii(999999)) === null);
}

// --- unita' dichiarate per formato ---------------------------------------
{
  const glb = S.scalaDaUnitaDichiarate({ formato: "glb" });
  ok("glTF dichiara metri: fattore 1", glb.fattore === 1);
  ok("glTF ha fiducia media, non alta (gli esportatori la violano)", glb.fiducia === "media");
  ok("gltf e glb si comportano uguale",
     S.scalaDaUnitaDichiarate({ formato: "gltf" }).fattore === 1);
  ok("il punto iniziale non conta", S.scalaDaUnitaDichiarate({ formato: ".GLB" }).fattore === 1);

  const fbx = S.scalaDaUnitaDichiarate({ formato: "fbx", bytes: fbxAscii(1) });
  ok("FBX in cm da fattore 0,01", Math.abs(fbx.fattore - 0.01) < 1e-9);
  ok("FBX ha fiducia alta: il campo e' esplicito", fbx.fiducia === "alta");
  ok("FBX senza byte torna null", S.scalaDaUnitaDichiarate({ formato: "fbx" }) === null);

  ok("OBJ non dichiara nulla", S.scalaDaUnitaDichiarate({ formato: "obj" }) === null);
  ok("PLY non dichiara nulla", S.scalaDaUnitaDichiarate({ formato: "ply" }) === null);
  ok("formato ignoto non dichiara nulla", S.scalaDaUnitaDichiarate({ formato: "xyz" }) === null);
}

// --- bande da invarianti -------------------------------------------------
{
  // Il caso misurato: modello di prova non in scala, interpiano 0,745 m.
  const b = S.bandaDaAltezzaPiano([0.745]);
  ok("interpiano 0,745 m: banda da 3,4x", Math.abs(b.min - 2.5 / 0.745) < 1e-9);
  ok("interpiano 0,745 m: banda fino a 8,7x", Math.abs(b.max - 6.5 / 0.745) < 1e-9);
  ok("la banda contiene il 6x che il vecchio metodo stimava", b.min < 6 && b.max > 6);

  // Un modello gia' in metri: la banda contiene 1.
  const gia = S.bandaDaAltezzaPiano([4.47]);
  ok("interpiano 4,47 m: la banda contiene 1", gia.min < 1 && gia.max > 1);

  ok("si usa la mediana, non la media",
     Math.abs(S.bandaDaAltezzaPiano([3, 4, 100]).min - 2.5 / 4) < 1e-9);
  ok("dislivelli assenti: null", S.bandaDaAltezzaPiano([]) === null);
  ok("dislivelli non numerici: null", S.bandaDaAltezzaPiano([null, NaN]) === null);
  ok("dislivelli nulli scartati", S.bandaDaAltezzaPiano([0, 0.745]).min > 0);

  const t = S.bandaDaAltezzaTotale(2.12);
  ok("altezza totale 2,12 m: la banda parte sopra 1", t.min > 1);
  ok("altezza totale assente: null", S.bandaDaAltezzaTotale(null) === null);
  ok("altezza totale zero: null", S.bandaDaAltezzaTotale(0) === null);
}

// --- banda dai varchi: l'unica circolare, e va marcata come tale ---------
{
  // Il caso misurato: mediana dei varchi 0,15 m sul modello non in scala.
  const b = S.bandaDaVarchi([0.14, 0.15, 0.15, 0.17]);
  ok("varchi 0,15 m: banda da 5,3x", Math.abs(b.min - 0.8 / 0.15) < 1e-9);
  ok("varchi 0,15 m: banda fino a 10,7x", Math.abs(b.max - 1.6 / 0.15) < 1e-9);
  ok("la banda contiene il 6x che il vecchio metodo dava", b.min < 6 && b.max > 6);
  ok("la banda si dichiara CIRCOLARE", b.circolare === true);
  ok("meno di tre varchi: null", S.bandaDaVarchi([0.1, 0.2]) === null);
  ok("nessun varco: null", S.bandaDaVarchi([]) === null);
  ok("varchi gia' plausibili: la banda contiene 1",
     S.bandaDaVarchi([0.9, 1.0, 1.1]).min < 1 && S.bandaDaVarchi([0.9, 1.0, 1.1]).max > 1);
}
{
  // La circolarita' non e' un dettaglio: se e' l'unica banda, la fiducia scende.
  const solo = S.decidiScala({
    formato: "ply", altezzaTotaleM: null, dislivelliM: [],
    larghezzeVarchiM: [0.14, 0.15, 0.15, 0.17],
  });
  ok("con la sola banda circolare la fiducia e' bassa", solo.fiducia === "bassa");
  ok("con la sola banda circolare si decide comunque", solo.fattore > 1);

  // Con anche l'altezza di piano, la fiducia risale.
  const conPiano = S.decidiScala({
    formato: "ply", altezzaTotaleM: 2.12, dislivelliM: [0.745],
    larghezzeVarchiM: [0.14, 0.15, 0.15, 0.17],
  });
  ok("con un invariante non circolare la fiducia risale", conPiano.fiducia === "media");
  ok("le tre bande insieme stringono la stima",
     (conPiano.banda.max - conPiano.banda.min) < (solo.banda.max - solo.banda.min));
}
{
  // Il caso vero che aveva causato la regressione: GLB, un solo piano rilevato
  // prima del riscalo, quindi nessuna altezza di piano disponibile.
  const d = S.decidiScala({
    formato: "glb", altezzaTotaleM: 2.1, dislivelliM: [],
    larghezzeVarchiM: [0.14, 0.15, 0.15, 0.17],
  });
  ok("un piano solo: i varchi salvano la decisione", d.fattore > 3);
  ok("un piano solo: il conflitto col glTF viene dichiarato", d.conflitto === true);
  ok("un piano solo: fiducia bassa, ed e' giusto", d.fiducia === "bassa");
  // Senza i varchi la banda dalla sola altezza totale non contraddice nulla:
  // e' esattamente la regressione misurata (il modello restava a 20,2 m).
  const senza = S.decidiScala({ formato: "glb", altezzaTotaleM: 2.1, dislivelliM: [] });
  ok("senza varchi il glTF non viene contraddetto (la regressione)", senza.fattore === 1);
}

// --- intersezione --------------------------------------------------------
{
  const i = S.intersecaBande([{ min: 2, max: 9, da: "a" }, { min: 4, max: 20, da: "b" }]);
  ok("l'intersezione prende il massimo dei minimi", i.min === 4);
  ok("l'intersezione prende il minimo dei massimi", i.max === 9);
  ok("l'intersezione cita entrambe le provenienze", i.da === "a + b");
  ok("l'intersezione e' piu' stretta di ogni banda", (i.max - i.min) < (20 - 4) && (i.max - i.min) < (9 - 2));

  ok("bande incompatibili: null, non si indovina",
     S.intersecaBande([{ min: 1, max: 2, da: "a" }, { min: 5, max: 6, da: "b" }]) === null);
  ok("nessuna banda: null", S.intersecaBande([]) === null);
  ok("una banda sola passa", S.intersecaBande([{ min: 3, max: 8, da: "a" }]).min === 3);
  ok("i null vengono ignorati", S.intersecaBande([null, { min: 3, max: 8, da: "a" }]).max === 8);
}

// --- media geometrica ----------------------------------------------------
{
  ok("fra 2x e 8x il centro e' 4x, non 5x", S.fattoreDaBanda({ min: 2, max: 8 }) === 4);
  ok("banda assente: null", S.fattoreDaBanda(null) === null);
  ok("banda degenere da il valore stesso", S.fattoreDaBanda({ min: 3, max: 3 }) === 3);
}

// --- la decisione completa ----------------------------------------------
{
  // FBX in centimetri: vince il file, e la geometria concorda.
  const d = S.decidiScala({
    formato: "fbx", bytes: fbxAscii(1),
    altezzaTotaleM: 1270, dislivelliM: [447],
  });
  ok("FBX in cm: fattore 0,01 dal file", Math.abs(d.fattore - 0.01) < 1e-9);
  ok("FBX in cm: provenienza dichiarata", /UnitScaleFactor/.test(d.provenienza));
}
{
  // Il caso vero: GLB che dichiara metri ma e' 6 volte piu' piccolo.
  const d = S.decidiScala({
    formato: "glb", altezzaTotaleM: 2.12, dislivelliM: [0.745],
  });
  ok("GLB in conflitto: si crede alla geometria", d.conflitto === true);
  ok("GLB in conflitto: il fattore non e' 1", d.fattore !== 1);
  ok("GLB in conflitto: il fattore sta nella banda",
     d.fattore >= d.banda.min && d.fattore <= d.banda.max);
  ok("GLB in conflitto: fattore fra 3 e 9", d.fattore > 3 && d.fattore < 9);
  ok("la spiegazione dichiara il conflitto", /contraddicono|conflitto/i.test(d.spiegazione));
  ok("la banda viene dichiarata, non una precisione finta", d.banda && d.banda.min < d.banda.max);
}
{
  // GLB davvero in metri: nessuna correzione.
  const d = S.decidiScala({ formato: "glb", altezzaTotaleM: 12.7, dislivelliM: [4.47] });
  ok("GLB in scala: fattore 1", d.fattore === 1);
  ok("GLB in scala: nessun conflitto", !d.conflitto);
}
{
  // PLY (gaussiane) non in scala: nessuna unita', solo invarianti.
  const d = S.decidiScala({ formato: "ply", altezzaTotaleM: 2.12, dislivelliM: [0.745] });
  ok("PLY: provenienza invarianti", d.provenienza === "invarianti architettonici");
  ok("PLY: il fattore sta nella banda", d.fattore >= d.banda.min && d.fattore <= d.banda.max);
  ok("PLY: la spiegazione dice che il formato non dichiara le unita'",
     /non dichiara/.test(d.spiegazione));
}
{
  // PLY in scala: si dichiara che va bene.
  const d = S.decidiScala({ formato: "ply", altezzaTotaleM: 12.7, dislivelliM: [4.0] });
  ok("PLY in scala: fattore 1", d.fattore === 1);
  ok("PLY in scala: lo dichiara", /gia' in scala/.test(d.spiegazione));
}
{
  // Nessun dato: si CHIEDE, non si inventa.
  const d = S.decidiScala({ formato: "obj" });
  ok("senza dati non si indovina", d.fattore === null);
  ok("senza dati si chiede all'utente", d.chiediAllUtente === true);
  ok("senza dati la fiducia e' nessuna", d.fiducia === "nessuna");
}
{
  // Un modello con un solo piano: solo l'altezza totale, banda larga.
  const d = S.decidiScala({ formato: "ply", altezzaTotaleM: 0.5, dislivelliM: [] });
  ok("un piano solo: si decide comunque", d.fattore !== null);
  ok("un piano solo: fiducia bassa, la banda e' larga", d.fiducia === "bassa");
}

// --- i varchi come conferma, non come sorgente ---------------------------
{
  const c = S.confermaDaVarchi([0.9, 1.0, 1.1, 1.2]);
  ok("varchi plausibili: coerente", c.coerente === true);
  ok("varchi plausibili: nessun messaggio", c.messaggio === null);

  const stretti = S.confermaDaVarchi([0.1, 0.15, 0.15, 0.2]);
  ok("varchi troppo stretti: incoerente", stretti.coerente === false);
  ok("il messaggio dichiara che e' un indizio, non una prova",
     /indizio e non una prova/.test(stretti.messaggio));
  ok("il messaggio ammette la dipendenza dalla densita'",
     /densita/.test(stretti.messaggio));

  const larghi = S.confermaDaVarchi([8, 9, 10]);
  ok("varchi troppo larghi: incoerente", larghi.coerente === false);
  ok("varchi larghi: si sospetta che i muri non siano stati visti",
     /non ha[\s\S]*riconosciuto i muri|spazio aperto/.test(larghi.messaggio));

  ok("meno di tre varchi: non si conclude", S.confermaDaVarchi([1, 2]) === null);
  ok("nessun varco: non si conclude", S.confermaDaVarchi([]) === null);
}

console.log(`veritas_scala: ${fatte - rotte}/${fatte} prove passate`);
if (rotte) process.exit(1);
