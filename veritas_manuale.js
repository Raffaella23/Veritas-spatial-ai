// =============================================================================
// veritas_manuale.js — IL SAPERE TECNICO, IN UN POSTO SOLO
// =============================================================================
//
// Perche' esiste. Le misure del corpo umano erano gia' nel programma, ma in tre
// posti diversi e chiuse dentro i blocchi: `PERSONA` nella navmesh, `CORPO` nel
// riconoscitore di oggetti, le due altezze d'occhio nell'isovista. Nessuno le
// poteva leggere da fuori — e da oggi la chat DEVE poterle leggere, perche' chi
// compra questo strumento chiede «quanto deve essere largo un corridoio» e si
// aspetta un numero con una fonte dietro.
//
// ⚠️ IL MANUALE DELL'ARCHITETTO NON SI COPIA QUI DENTRO. Il Neufert e le altre
// raccolte editoriali sono opere protette: ricopiarne le tabelle in un prodotto
// che si vende e' un problema legale per chi lo vende. Non e' nemmeno
// necessario. I numeri che servono hanno una fonte primaria — Fruin per il
// corpo in movimento, i decreti per le prescrizioni — e citare la fonte
// primaria e' PIU' forte davanti a un cliente: alla domanda «da dove esce
// questo numero» c'e' una risposta verificabile.
//
// ⚠️ OGNI VOCE PORTA LA SUA FONTE E IL SUO STATO. `validato: false` significa
// trascritto ma non ancora ricontrollato sul testo originale. Un valore senza
// fonte non entra qui: sarebbe un numero finto travestito da sapere tecnico, ed
// e' la cosa che questo progetto non fa.
//
// ⚠️ QUI NON CI SONO SOGLIE DI GIUDIZIO. Quelle stanno nel modulo normative
// (19 soglie con giurisdizione e articolo). Qui c'e' il CORPO e quello che ne
// discende: la differenza e' che una misura descrive, una soglia giudica.

export const MANUALE = Object.freeze({
  corpo: {
    ellisse_spalle_m: { valore: 0.61, fonte: "Fruin, Pedestrian Planning and Design (1971)", nota: "Ellisse corporea 61 x 46 cm; standard dei modelli di deflusso.", validato: true },
    ellisse_profondita_m: { valore: 0.46, fonte: "Fruin (1971)", validato: true },
    raggio_m: { valore: 0.30, fonte: "Fruin (1971)", nota: "Mezza larghezza di spalle, 0,305 m arrotondato.", validato: true },
    altezza_libera_m: { valore: 2.00, fonte: "uso corrente", nota: "Sotto i 2 m una persona si china: non e' passaggio.", validato: false },
    occhio_in_piedi_m: { valore: 1.65, fonte: "isovista VERITAS", nota: "Altezza dell'occhio usata per la visibilita' di chi cammina.", validato: false },
    occhio_seduto_m: { valore: 1.20, fonte: "isovista VERITAS", nota: "Occhio di chi e' seduto o in carrozzina: un bancone a 1,30 m gli chiude l'orizzonte.", validato: false },
  },
  arredo: {
    seduta_m: { valore: [0.35, 0.85], fonte: "ergonomia corrente", nota: "Piano del sedile 40-48 cm; con lo schienale l'oggetto arriva a ~85 cm.", validato: false },
    banco_m: { valore: [0.85, 1.60], fonte: "ergonomia corrente + DM 236/1989", nota: "Piano di lavoro 90-110 cm; il DM fissa a 90 cm il piano utilizzabile da seduti. Totem e chioschi fino a 160.", validato: false },
  },
  circolazione: {
    alzata_max_m: { valore: 0.18, fonte: "DM 236/1989", riferimento: "art. 8.1.10", validato: false },
    pendenza_scala_gradi: { valore: [30, 35], fonte: "uso corrente", nota: "Oltre 35 gradi non e' un percorso: e' una copertura, un'ala, un terrapieno.", validato: false },
    gradino_navmesh_m: { valore: 0.40, fonte: "derivato", nota: "Due alzate: serve a salire le scale del modello senza saltare fra piani.", validato: false },
  },
  deflusso: {
    modulo_uscita_m: { valore: 0.60, fonte: "prassi antincendio italiana", nota: "Modulo unitario di uscita. DA VERIFICARE sul decreto vigente prima di usarlo in un referto.", validato: false },
  },
});

// Quello che il sistema puo' dire di sapere, e quello che NON sa.
// Serve alla chat: alla domanda «quante finestre ci sono» la risposta onesta e'
// «non le ho misurate», e questa lista dice perche'.
export const NON_MISURATO = Object.freeze([
  "finestre e aperture in facciata: nessun rilevatore le conta",
  "altezze utili stanza per stanza: si misura il pavimento, non il soffitto",
  "arredi come oggetti distinti: si riconoscono le zone, non i pezzi",
  "materiali, finiture, impianti: il GLB non li dichiara",
]);

if (typeof window !== "undefined") {
  window.__veritasManuale = MANUALE;
  window.__veritasNonMisurato = NON_MISURATO;
  console.log("[VERITAS manuale] misure tecniche pronte — window.__veritasManuale");
}
