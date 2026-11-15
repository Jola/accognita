// ============================================================
// BLOBS — Stellschrauben der Blob-Formen (GDD-10)
// Absorb & Evolve
//
// Niederlassen, Abspalten, Verschmelzen, Erheben, Vertrocknen und die
// Tätigkeit niedergelassener Blobs. Die Rechenregeln stehen in
// src/systems/BlobSystem.ts und src/systems/SettlementSystem.ts.
// Höchstmasse und Umrechnung Faser → kg: src/data/grow.ts Abschnitt 5.
//
// Kennzeichnung der Herkunft (CLAUDE.md, Begründungspflicht):
//   Vorgabe (Entwickler) · Begründung (Entwickler) ·
//   Begründung (Vorschlag Claude, übernommen)
// Alle Zahlen VORLÄUFIG (GDD-10 Abschnitt 15, „Später“: Zahlen abstimmen).
// ============================================================

// -----------------------------------------------------------
// 1. NIEDERLASSEN UND VERSCHMELZEN NUR OHNE AGGRO (GDD-10 Abschnitt 3, 4.5)
//
// Vorgabe (Entwickler, 14. November 2026): Niederlassen und Verschmelzen nur,
//   wenn seit 5 s kein Gegner Aggro auf den Reisenden hat.
// Begründung (Vorschlag Claude, übernommen): Ein niedergelassener Blob ist
//   unverwundbar. Ohne diese Sperre wäre Niederlassen ein Notausgang aus
//   jedem Kampf — und Verschmelzen mit sofortigem Erheben ein Trick, um
//   Gegner abzuschütteln.
// -----------------------------------------------------------
export const SETTLE_AGGRO_LOCK_MS = 5000;

// -----------------------------------------------------------
// 2. ARBEITSREICHWEITE (GDD-10 Abschnitt 8.3)
//
// Vorgabe (Entwickler, 15. November 2026): 48 px beim frischen Blob bis
//   96 px ausgewachsen, mit dem Wachstum ansteigend wie der Körperradius.
//   Das Nest gilt als ausgewachsen und hat 96 px.
// Begründung (Vorschlag Claude, übernommen): Mit „Reichweite × 2, mindestens
//   48 px“ galt immer das Minimum. Jetzt bringen große Blobs mehr, Miniblob-
//   Farmen weniger. 48 px reichen, damit das Nest die Grashalme erreicht, die
//   25–37 px vom Startpunkt liegen (GDD-10 Abschnitt 12).
// -----------------------------------------------------------
export const WORK_RANGE_MIN_PX = 48;
export const WORK_RANGE_MAX_PX = 96;

// -----------------------------------------------------------
// 3. TÄTIGKEIT (GDD-10 Abschnitte 8.4, 8.5, 13.6)
//
// Eine Aktion (Analysieren oder Absorbieren) dauert ACTION_SECONDS. Gerechnet
// wird mit Mittelwerten statt Würfeln, in Stücken: CATCHUP_CHUNK_SECONDS
// beim Nachrechnen, je Aktion, solange das Bewusstsein dort ist; höchstens
// CATCHUP_MAX_CHUNKS Stücke.
// Begründung (Vorschlag Claude, übernommen): Mittelwerte ergeben immer
//   dasselbe, egal wie oft und in welchen Stücken gerechnet wird. Kleine
//   Stücke vor Ort, damit man den Fortschritt sofort sieht (beim Erwachen
//   sähe man sonst eine Minute lang nichts).
// -----------------------------------------------------------
export const ACTION_SECONDS = 6;
export const CATCHUP_CHUNK_SECONDS = 60;
export const CATCHUP_MAX_CHUNKS = 500;

// -----------------------------------------------------------
// 4. ABSPALTEN (GDD-10 Abschnitte 4.3, 7.1, 7.2)
//
// Vorgabe (Entwickler): Ressourcen werden aufgeteilt, standardmäßig 50/50.
//   Bei ungerader Menge bleibt das übrige Stück beim niedergelassenen Blob.
// Der neue Reisende erscheint SPLIT_OFFSET_PX neben dem niedergelassenen Blob
// (außerhalb seiner Berührung, damit man nicht sofort verschmilzt).
// -----------------------------------------------------------
export const SPLIT_SHARE_DEFAULT = 0.5;
export const SPLIT_OFFSET_PX = 24;

// -----------------------------------------------------------
// 5. DARSTELLUNG (Platzhalter bis Umsetzungsschritt 5, GDD-10 Abschnitt 10)
//
// Vertrocknet: etwa 70 % des Radius, den der Reisende hatte.
// -----------------------------------------------------------
export const DRIED_RADIUS_FACTOR = 0.7;

// -----------------------------------------------------------
// 6. NAMEN (GDD-10 Abschnitt 11.1)
//
// „Nest“, dann Biom und Nummer („Wald 2“). Der Reisende heißt „Reisender“.
// -----------------------------------------------------------
export const NEST_NAME = "Nest";
export const TRAVELER_NAME = "Reisender";
export const BIOME_NAMES: Record<string, string> = {
  forest: "Wald", swamp: "Sumpf", highland: "Hochland",
  mountain: "Gebirge", desert: "Wüste", dungeon: "Verlies",
};

// Stand: 15. November 2026 — Erstfassung (GDD-10 Umsetzungsschritt 3)
