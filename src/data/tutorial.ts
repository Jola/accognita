// ============================================================
// TUTORIAL — Texte, mit denen neue Skills vorgestellt werden
// Absorb & Evolve
//
// Vorgabe (Entwickler, 15. November 2026): Ein neuer Skill wird beim ersten
// Mal prominent vorgestellt; man soll lesen können, wie genau er
// funktioniert. Neue Skills erscheinen nacheinander — der nächste erst, wenn
// die Ansicht geschlossen wurde. Bei den ersten beiden Skills (Sehen,
// Bewegen) steht zusätzlich, wie sie das Spiel grundsätzlich bestimmen:
// Sehen muss man erst ausbauen, so erweitert sich das Sichtfeld immer
// weiter. Beim Bewegen: eine Aufforderung, es auszuprobieren; erst danach
// kommt die Beschreibung, dass man nun reisen kann und mit der Zeit immer
// schneller wird.
// Begründung (Entwickler): Am Anfang muss man noch alles verstehen; der
// Spieler soll genug Zeit haben, sich einen neuen Skill anzuschauen.
//
// Die Texte selbst: Vorschlag Claude (offen). Im Nest heißt die Aufforderung
// „Abspalten“ statt „Erheben“, weil das Nest sich nicht erheben kann
// (GDD-10 Abschnitt 2, Vorgabe Entwickler).
// Keine Phaser-Abhängigkeit.
// ============================================================

/** Gilt für den ersten Skill mit Sichtweite (sight_range). */
export const SIGHT_INTRO = [
  "Das ist dein erster Sinn. Noch siehst du nur ganz nah, unscharf und in Graustufen.",
  "Sehen ist ein Skill wie jeder andere: Je länger du siehst, desto besser wird er — dein Sichtfeld wird mit der Zeit immer größer.",
  "Andere Wesen haben andere Augen. Von ihnen kannst du später lernen, weiter und in Farbe zu sehen.",
];

/** Gilt für den ersten Skill mit Bewegung (move_speed), entdeckt im Nest. */
export const MOVE_INTRO_SETTLED = [
  "Ab jetzt kannst du dich bewegen. Das Nest selbst bleibt aber, wo es ist — es ist dein fester Anker.",
  "Um die Welt zu erkunden, schickst du einen Teil von dir los.",
];
export const MOVE_TRY_SETTLED = "Probier es aus: Tippe auf 🧬 Abspalten.";

/** Derselbe Skill, entdeckt als Reisender (kein Abspalten nötig). */
export const MOVE_INTRO_TRAVELING = [
  "Ab jetzt kannst du dich bewegen.",
];
export const MOVE_TRY_TRAVELING = "Probier es aus: Schiebe dich mit dem Joystick voran.";

/** Karte „Auf Reisen“ — nach dem ersten Abspalten. */
export const TRAVEL_TITLE = "Auf Reisen";
export const TRAVEL_TEXT = [
  "Ein Teil von dir ist unterwegs. Schiebe dich mit dem Joystick voran.",
  "Je mehr du dich bewegst, desto besser wird dein Bewegungs-Skill — so reist du mit der Zeit immer schneller.",
  "Findest du einen guten Ort, kannst du dich dort niederlassen. Dann ist dein Fortschritt gesichert, und der Blob arbeitet dort von allein weiter.",
  "Wirst du besiegt, machst du bei einem niedergelassenen Blob weiter — zu Beginn im Nest.",
];

// Stand: 15. November 2026 — Erstfassung
