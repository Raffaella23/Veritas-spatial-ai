// Prove di veritas_aspetto.js — solo il nucleo puro.
//
//     node veritas_aspetto.test.mjs
//
// Il DOM si prova col banco (Chromium vero, pagina vera): qui si provano i
// conti, che sono la parte che puo' sbagliare in silenzio.

import A from "./veritas_aspetto.js";

let fatte = 0, rotte = 0;
function ok(cosa, cond) {
  fatte++;
  if (cond) return;
  rotte++;
  console.error("  ROTTA: " + cosa);
}
function quasi(cosa, a, b, tol = 1e-6) {
  ok(cosa + ` (${a} ~ ${b})`, Math.abs(a - b) <= tol);
}

// --- inquadratura ---------------------------------------------------------
{
  // Il modello di prova, misurato in browser: 121,1 x 12,7 x 67,6 m.
  const q = A.inquadratura({
    ingombro: { x: 121.1, y: 12.7, z: 67.6 },
    centro: { x: 0, y: 0, z: 0 },
    fovGradi: 75,
  });
  // Il raggio da inquadrare e' il lato piu' lungo in pianta, non la diagonale.
  const raggio = 121.1 / 2;
  const atteso = (raggio / Math.tan((75 * Math.PI) / 180 / 2)) * 1.15;
  quasi("distanza dalla trigonometria del lato piu' lungo", q.distanza, atteso, 1e-9);
}
{
  // Il fov vero della camera del bundle NON e' 75: misurato in browser, e'
  // 42 gradi. Con quello la distanza viene 181 m, che e' il valore letto nel
  // banco -- la prima stesura di questa prova assumeva 75 e pretendeva 181,
  // due cose incompatibili. La formula era giusta, il numero atteso no.
  const q = A.inquadratura({
    ingombro: { x: 121.1, y: 12.7, z: 67.6 },
    centro: { x: 0, y: 0, z: 0 },
    fovGradi: 42,
  });
  ok("col fov reale (42 gradi) la distanza e' quella misurata nel banco: ~181 m",
     Math.round(q.distanza) === 181);
  ok("near positivo", q.near > 0);
  ok("far oltre la distanza", q.far > q.distanza);
  ok("near molto minore di far", q.near < q.far / 100);
  ok("guarda il centro", q.bersaglio.x === 0 && q.bersaglio.z === 0);
  ok("tre quarti dall'alto: y e' la componente maggiore",
     q.posizione.y > q.posizione.x && q.posizione.y > q.posizione.z);
  ok("non e' lo zenit puro: x e z non sono nulli", q.posizione.x > 0 && q.posizione.z > 0);
}
{
  // Il centro non e' l'origine: era proprio questo il difetto -- la camera
  // stava a [0,80,0] mentre il modello stava altrove, e usciva dal bordo.
  const q = A.inquadratura({
    ingombro: { x: 40, y: 5, z: 40 },
    centro: { x: 100, y: 2, z: -50 },
    fovGradi: 75,
  });
  ok("l'inquadratura segue il centro in x", q.posizione.x > 100);
  ok("l'inquadratura segue il centro in z", q.posizione.z > -50 && q.posizione.z < 0);
  ok("il bersaglio e' il centro vero", q.bersaglio.x === 100 && q.bersaglio.z === -50);
}
{
  // Un fov piu' stretto obbliga ad allontanarsi: e' la stessa scena.
  const largo = A.inquadratura({ ingombro: { x: 50, y: 5, z: 50 }, centro: { x: 0, y: 0, z: 0 }, fovGradi: 75 });
  const stretto = A.inquadratura({ ingombro: { x: 50, y: 5, z: 50 }, centro: { x: 0, y: 0, z: 0 }, fovGradi: 45 });
  ok("fov stretto = camera piu' lontana", stretto.distanza > largo.distanza);
}
{
  // Un corridoio molto allungato: se si usasse la diagonale si finirebbe
  // lontanissimo, e il corridoio diventerebbe un filo.
  const q = A.inquadratura({ ingombro: { x: 200, y: 3, z: 4 }, centro: { x: 0, y: 0, z: 0 }, fovGradi: 75 });
  const diagonale = Math.hypot(200, 4) / 2;
  const conDiagonale = (diagonale / Math.tan((75 * Math.PI) / 180 / 2)) * 1.15;
  ok("il lato lungo, non la diagonale", q.distanza <= conDiagonale + 1e-9);
  ok("un corridoio entra comunque tutto", q.distanza > 100);
}

// --- schermoPerso --------------------------------------------------------
{
  // Il caso misurato: 1352x921 dentro 1920x1080.
  ok("il difetto misurato era il 40%",
     A.schermoPerso({ w: 1920, h: 1080 }, { w: 1352, h: 921 }) === 40);
  // Dopo la correzione.
  ok("dopo il resize resta il 9% (la barra del tempo)",
     A.schermoPerso({ w: 1920, h: 1080 }, { w: 1920, h: 978 }) === 9);
  ok("tela piena = niente perso",
     A.schermoPerso({ w: 1920, h: 1080 }, { w: 1920, h: 1080 }) === 0);
  ok("finestra a zero non divide per zero",
     A.schermoPerso({ w: 0, h: 0 }, { w: 10, h: 10 }) === 0);
}

// --- fase ----------------------------------------------------------------
{
  ok("senza modello si e' all'ingresso", A.fase({ modello: false, zone: 0 }) === "ingresso");
  ok("senza modello le zone non contano", A.fase({ modello: false, zone: 7 }) === "ingresso");
  ok("modello ma nessuna zona", A.fase({ modello: true, zone: 0 }) === "modello");
  ok("una zona sola non basta per un percorso", A.fase({ modello: true, zone: 1 }) === "modello");
  ok("due zone: si puo' analizzare", A.fase({ modello: true, zone: 2 }) === "analisi");
  ok("le 7 tappe del modello di prova", A.fase({ modello: true, zone: 7 }) === "analisi");
  ok("zone assenti non rompono", A.fase({ modello: true }) === "modello");
}

// --- visibiliInFase ------------------------------------------------------
{
  const i = A.visibiliInFase("ingresso");
  ok("all'ingresso si vedono due cose sole", i.length === 2);
  ok("all'ingresso c'e' il marchio", i.includes("vaio-brand"));
  ok("all'ingresso c'e' il caricamento", i.includes("vaio-upload-wrap"));
  ok("all'ingresso NON c'e' il rail", !i.includes("va-rail"));
  ok("all'ingresso NON c'e' la toolbar", !i.includes("vaio-toolbar"));

  const m = A.visibiliInFase("modello");
  ok("col modello compare il rail", m.includes("va-rail"));
  ok("la linguetta vive dentro il rail, non da sola sul bordo", !m.includes("va-dock-tab"));

  const a = A.visibiliInFase("analisi");
  ok("in analisi il caricamento si tira via", !a.includes("vaio-upload-wrap"));
  ok("in analisi il rail resta", a.includes("va-rail"));

  ok("ogni fase mostra meno di sei elementi",
     [i, m, a].every((x) => x.length < 6));
  ok("fase sconosciuta ricade sull'ingresso",
     A.visibiliInFase("boh").join() === i.join());
  // Non deve restituire il proprio array interno, o chi lo modifica rompe tutto.
  const copia = A.visibiliInFase("ingresso");
  copia.push("intruso");
  ok("restituisce una copia", A.visibiliInFase("ingresso").length === 2);
}

// --- stratiAttivabili ----------------------------------------------------
{
  const spenti = A.stratiAttivabili({ modello: false, visuale: false, normative: false });
  ok("cinque strati, sempre gli stessi", spenti.length === 5);
  ok("senza modello nessuno strato e' attivo", spenti.every((s) => !s.attivo));
  ok("gli strati restano ELENCATI anche se spenti", spenti.length === 5);

  // Difetto trovato nel banco: all'ingresso i tastini attivi erano 2 e non 1.
  // Il secondo era `spegni`, acceso perche' la condizione guardava solo la
  // presenza del modulo visuale -- che e' caricato da subito. Senza modello non
  // c'e' niente da spegnere.
  const soloVisuale = A.stratiAttivabili({ modello: false, visuale: true, normative: true });
  ok("all'ingresso NIENTE e' premibile, nemmeno spegni",
     soloVisuale.every((s) => !s.attivo));

  const conModello = A.stratiAttivabili({ modello: true, visuale: false, normative: false });
  const trova = (id) => conModello.find((s) => s.id === id);
  ok("col modello si puo' leggere lo spazio", trova("analizza").attivo);
  ok("col modello si puo' chiedere la visibilita'", trova("visibilita").attivo);
  ok("l'esodo pretende visuale e normative", !trova("esodo").attivo);
  ok("spegni non serve se non c'e' niente da spegnere", !trova("spegni").attivo);

  const tutto = A.stratiAttivabili({ modello: true, visuale: true, normative: true });
  ok("con tutto collegato l'esodo si accende",
     tutto.find((s) => s.id === "esodo").attivo);
  ok("con la visuale si puo' spegnere",
     tutto.find((s) => s.id === "spegni").attivo);
  ok("ogni strato ha un comando", tutto.every((s) => typeof s.comando === "string" && s.comando));
  ok("ogni strato ha un nome leggibile", tutto.every((s) => s.nome && s.nome.length > 3));
  ok("ogni strato ha un segno", tutto.every((s) => s.segno && s.segno.length >= 1));
  ok("l'esodo c'e' fra gli strati", tutto.some((s) => s.comando === "esodo"));
  // I comandi devono essere quelli che la console riconosce davvero: sono
  // stati letti da handleCommand, non inventati.
  const veri = ["analizza", "visibilita", "accessibilita", "esodo", "spegni"];
  ok("i comandi sono quelli veri della console",
     tutto.every((s) => veri.includes(s.comando)));
  ok("nessun comando duplicato",
     new Set(tutto.map((s) => s.comando)).size === tutto.length);
}

console.log(`veritas_aspetto: ${fatte - rotte}/${fatte} prove passate`);
if (rotte) process.exit(1);
