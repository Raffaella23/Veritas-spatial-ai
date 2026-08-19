// L'occhio, collegato davvero:  node banco/occhio.mjs
//
// Le prove di `veritas_riconosce.test.mjs` dicono che il MODULO e' giusto.
// Questa dice se il PROGRAMMA lo usa, ed e' la domanda diversa che in questo
// progetto e' gia' costata una giornata: un modulo giusto collegato male non
// da' nessun errore in console.
//
// ⚠️ NON SERVE LA RETE. Il modello di visione qui non si scarica (la sandbox
//    non raggiunge huggingface.co), e non serve: si inietta un rilevatore
//    FINTO le cui scatole sono ricavate dai mucchi che la geometria ha gia'
//    misurato. Cosi' si prova tutto il giro tranne la rete neurale:
//
//      mucchio misurato -> pixel della pianta -> scatola del rilevatore
//      -> ritorno al mondo -> abbinamento al mucchio -> nome sulla tappa
//
//    ED E' PROPRIO IL GIRO CHE PUO' ROMPERSI IN SILENZIO. La pianta arriva da
//    `readRenderTargetPixels`, che consegna la riga 0 in fondo; una tela la
//    vuole in cima. Se le due convenzioni non combaciano, ogni nome finisce
//    sul lato opposto dell'edificio: nomi plausibili, tutti specchiati, e
//    nessun errore da nessuna parte. Questa prova lo vedrebbe.
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const modello = process.argv[2] || path.join(qui, "airport_foot_traffic.glb");

const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
});
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
const log = [];
p.on("console", (m) => log.push(m.text()));
p.on("pageerror", (e) => log.push("PAGEERROR " + e.message));

await p.goto("http://127.0.0.1:8899/index.html", { waitUntil: "load", timeout: 60000 });
await p.waitForTimeout(6000);
await p.fill("#v-new-name", "occhio");
await p.click("#v-create-btn");
await p.waitForTimeout(6000);
await p.click("#vs-start-btn").catch(() => {});
await p.waitForTimeout(8000);
await p.setInputFiles("#vaio-upload-input", modello);
await p.waitForTimeout(60000);

const r = await p.evaluate(async () => {
  const R = window.__veritasRiconosce, V = window.__veritasVista;
  const T = window.__veritasCoseTrovate, O = window.__veritasOcchi;
  const out = {
    modulo: !!R, vista: !!V, occhiPonte: typeof window.__veritasApplicaOcchi === "function",
    guarda: typeof window.__veritasGuarda === "function",
    cose: !!T, importmap: !!document.querySelector('script[type="importmap"]')
      ?.textContent.includes("@huggingface/transformers"),
  };
  if (!R || !V || !T) return out;

  // 1. La pianta, come la disegna il programma.
  const pianta = V.piantaDelPavimento(window.THREE, window.__veritasRenderer,
    window.__veritasModelRoot, {});
  if (!pianta) { out.perche = "pianta non disegnata"; return out; }
  out.pianta = { larghezza: pianta.larghezza, altezza: pianta.altezza,
                 metriPerPixel: +pianta.metriPerPixel.toFixed(3) };

  // 2. I mucchi piu' grossi, e per ognuno una parola diversa.
  // ⚠️ Devono essere parole DEL VOCABOLARIO VERO, altrimenti il rilevatore
  //    finto risponde a domande che nessuno fa e la prova non prova niente.
  //    E' successo: usavo le parole di una versione precedente e cinque
  //    campioni su sei sparivano in silenzio.
  const parole = ["a car", "a counter", "a chair", "a bench", "a painting",
                  "a check-in counter"];
  const scelti = T.posti.filter((q) => q.formaPrevalente !== "appeso").slice(0, parole.length);
  out.mucchiUsati = scelti.length;

  // 3. Il rilevatore finto: restituisce la scatola IN PIXEL di ogni mucchio,
  //    passando per `mondoAPixel` — la stessa conversione che usa il programma.
  const atteso = new Map();
  const saltati = [];
  const finto = async function (_immagine, chieste) {
    const fuori = [];
    scelti.forEach((q, i) => {
      const parola = parole[i];
      if (!chieste.includes(parola)) return;
      // si rientra di mezzo pixel dai bordi: `mondoAPixel` rifiuta il punto
      // esattamente sul limite, e un mucchio che tocca il bordo della pianta
      // non e' un caso da scartare
      const e = pianta.metriPerPixel / 2;
      const a = V.mondoAPixel(pianta, q.ingombro.min[0] + e, q.ingombro.min[2] + e);
      const c = V.mondoAPixel(pianta, q.ingombro.max[0] - e, q.ingombro.max[2] - e);
      if (!a || !c) {
        saltati.push({ parola, min: q.ingombro.min.map((v) => +v.toFixed(1)),
                       max: q.ingombro.max.map((v) => +v.toFixed(1)) });
        return;                               // il mucchio cade fuori dalla pianta
      }
      atteso.set(parola, q);
      fuori.push({ score: 0.6, label: parola,
                   box: { xmin: a[0], ymin: a[1], xmax: c[0], ymax: c[1] } });
    });
    return fuori;
  };

  // 4. Il giro completo, come lo fa il programma.
  const esito = await window.__veritasGuarda({ rileva: finto, dominio: "aeroporto" });
  out.esito = esito && esito.ok
    ? { nominati: esito.nominati, scartate: esito.scartate, rilevazioni: esito.rilevazioni,
        rinominate: esito.rinominate, senzaNome: esito.senzaNome }
    : { ok: false, perche: esito && esito.perche };
  if (!esito || !esito.ok) return out;

  // 5. LA VERIFICA: ogni mucchio ha ricevuto il nome che gli era destinato?
  //    Se la pianta fosse specchiata, i nomi finirebbero su altri mucchi.
  const nomiVoce = new Map(R.VOCABOLARIO.map((v) => [v.chiedi, v.nome]));
  let giusti = 0, sbagliati = [];
  for (const [parola, mucchio] of atteso) {
    const nominato = esito.posti.find((q) =>
      Math.abs(q.centro[0] - mucchio.centro[0]) < 1e-9 &&
      Math.abs(q.centro[2] - mucchio.centro[2]) < 1e-9);
    const voluto = nomiVoce.get(parola);
    if (nominato && nominato.nome === voluto) giusti++;
    else sbagliati.push({ voluto, avuto: nominato ? nominato.nome : "(nessuno)",
                          dove: [+mucchio.centro[0].toFixed(1), +mucchio.centro[2].toFixed(1)] });
  }
  out.andataERitorno = { chiesti: atteso.size, giusti, sbagliati,
                         saltati, ingombroPianta: [
                           +pianta.origine[0].toFixed(1), +pianta.origine[1].toFixed(1),
                           +(pianta.origine[0] + pianta.larghezza * pianta.metriPerPixel).toFixed(1),
                           +(pianta.origine[1] + pianta.altezza * pianta.metriPerPixel).toFixed(1)] };

  // 6. Le posizioni non devono essersi mosse di un millimetro.
  //    ⚠️ Il confronto e' PER INDICE: `riconosci` restituisce i mucchi
  //       nell'ordine in cui li ha ricevuti. Cercarli per conteggio, come
  //       facevo prima, abbina il mucchio sbagliato quando due hanno lo stesso
  //       numero di oggetti — e faceva fallire una prova buona.
  out.posizioniFerme = esito.posti.every((q, i) =>
    q.centro[0] === T.posti[i].centro[0] && q.centro[2] === T.posti[i].centro[2]
    && q.area === T.posti[i].area && q.oggetti === T.posti[i].oggetti);

  // 7. E le tappe che nome hanno adesso?
  out.tappe = (window.__veritasGetNodes ? window.__veritasGetNodes() : [])
    .map((n) => ({ label: n.label, origine: n.origine || null,
                   suCosa: !!n.suCosa, tipo: n.type }));

  // 8. L'occhio VERO: si prova ad accenderlo, e si dice com'e' andata.
  const vero = await R.occhioLocale().catch(() => null);
  out.occhioVero = { acceso: !!vero, ...R.stato() };
  return out;
});

console.log("=== IL PROGRAMMA USA L'OCCHIO? ===");
console.log("modulo collegato        ", r.modulo ? "si" : "NO");
console.log("pianta disponibile      ", r.vista ? "si" : "NO");
console.log("ponte __veritasApplicaOcchi", r.occhiPonte ? "si" : "NO");
console.log("window.__veritasGuarda  ", r.guarda ? "si" : "NO");
console.log("transformers nell importmap", r.importmap ? "si" : "NO");
if (r.pianta)
  console.log("pianta                  ", r.pianta.larghezza + " x " + r.pianta.altezza
    + " px, " + r.pianta.metriPerPixel + " m/px");

if (r.esito) {
  console.log("\n=== IL GIRO COMPLETO, con un rilevatore finto ===");
  if (r.esito.ok === false) console.log("  non ha guardato:", r.esito.perche);
  else console.log("  " + r.esito.rilevazioni + " rilevazioni, " + r.esito.nominati
    + " mucchi nominati, " + r.esito.scartate + " buttate, "
    + r.esito.rinominate + " tappe rinominate");
}

if (r.andataERitorno) {
  const a = r.andataERitorno;
  console.log("\n=== ANDATA E RITORNO: mondo -> pixel -> scatola -> mondo ===");
  console.log("  " + a.giusti + " nomi su " + a.chiesti + " sono finiti sul mucchio giusto");
  if (a.sbagliati.length) {
    console.log("  ⚠️ FINITI ALTROVE (la pianta potrebbe essere specchiata):");
    for (const s of a.sbagliati)
      console.log("     voluto «" + s.voluto + "», avuto «" + s.avuto + "» in " + s.dove.join(", "));
  }
  console.log("  posizioni non toccate dall occhio: " + (r.posizioniFerme ? "si" : "NO"));
  console.log("  pianta: da (" + a.ingombroPianta[0] + ", " + a.ingombroPianta[1]
    + ") a (" + a.ingombroPianta[2] + ", " + a.ingombroPianta[3] + ")");
  if (a.saltati && a.saltati.length) {
    console.log("  mucchi fuori dalla pianta, quindi non provati:");
    for (const s of a.saltati)
      console.log("     " + s.parola + "  da " + s.min.join(",") + " a " + s.max.join(","));
  }
}

if (r.tappe) {
  console.log("\n=== LE TAPPE ADESSO ===");
  for (const t of r.tappe)
    console.log("  " + (t.label || "?").padEnd(26), (t.tipo || "-").padEnd(10),
      "origine: " + (t.origine || "-") + (t.suCosa ? "  (su una cosa vera)" : ""));
}

if (r.occhioVero) {
  console.log("\n=== L'OCCHIO VERO (OWLv2 nel browser) ===");
  console.log("  acceso:", r.occhioVero.acceso ? "si — " + r.occhioVero.device + "/" + r.occhioVero.dtype : "no");
  if (!r.occhioVero.acceso) console.log("  perche':", r.occhioVero.perche);
}

const int = log.filter((l) => /VERITAS occhio|VERITAS cose|PAGEERROR/i.test(l));
console.log("\n=== console ===");
for (const l of int.slice(0, 20)) console.log("  " + l);

await b.close();
const ok = r.andataERitorno && r.andataERitorno.giusti === r.andataERitorno.chiesti && r.posizioniFerme;
process.exit(ok ? 0 : 1);
