// ============================================================
// INTRO SYSTEM — Erwachen: Hinweise, solange der Blob blind oder unbeweglich ist
// Absorb & Evolve
//
// Vorgabe (Entwickler, 13. November 2026): Am Anfang ist der Bildschirm
// schwarz, nur Analyze und Absorb existieren; einige Texte erklären, was
// geschieht. Der Blob lernt Sehen und Bewegen an Wesen neben sich (GDD-09
// Abschnitt 5).
// Der Schritt folgt allein aus den Skills — kein eigener Zustand, nichts zu
// speichern; ein geladener Spielstand zeigt den passenden Hinweis.
// Keine Phaser-Abhängigkeit.
// ============================================================

import type { PlayerState } from "../types/GameState";
import { getMoveSpeedFactor, getPlayerVision } from "./BodySystem";

export type IntroStep = "blind_still" | "seeing_still" | "moving_blind" | "awake";

export function getIntroStep(player: PlayerState): IntroStep {
  const sees = getPlayerVision(player).range > 0;
  const moves = getMoveSpeedFactor(player) > 0;
  if (sees && moves) return "awake";
  if (sees) return "seeing_still";
  if (moves) return "moving_blind";
  return "blind_still";
}

/**
 * Hinweistexte je Schritt, für das Nest (niedergelassen) und den Reisenden
 * (GDD-10 Abschnitt 12, Texte: Vorschlag Claude). Im Nest gibt es keine
 * aktiven Skills: Man wählt eine Tätigkeit, keine ist voreingestellt
 * (Vorgabe Entwickler, 15. November 2026); mit Kriechen kommt das Abspalten.
 */
const INTRO_TEXT_SETTLED: Record<IntroStep, string> = {
  blind_still:
    "Du erwachst. Du siehst nichts und kannst dich nicht bewegen. Doch du spürst etwas direkt neben dir. " +
    "Wähle eine Tätigkeit — Analysieren oder Absorbieren —, vielleicht lernst du etwas.",
  seeing_still:
    "Licht! Hell und dunkel, verschwommene Umrisse. Bewegen kannst du dich noch nicht. " +
    "Lerne weiter von den Wesen neben dir — vielleicht auch, wie man kriecht.",
  moving_blind:
    "Du könntest einen Teil von dir losschicken: Tippe auf Abspalten. Sehen kannst du noch nichts — " +
    "lerne von den Wesen neben dir, Licht zu spüren.",
  awake:
    "Du siehst, und du könntest einen Teil von dir losschicken: Tippe auf Abspalten. " +
    "Gras gibt Pflanzenfasern — aus ihnen entsteht der Körper des Reisenden.",
};

const INTRO_TEXT_TRAVELING: Record<IntroStep, string> = {
  blind_still:
    "Du siehst nichts. Lerne von den Wesen um dich, Licht zu spüren.",
  seeing_still:
    "Bewegen kannst du dich noch nicht. Lerne von den Wesen um dich, wie man kriecht.",
  moving_blind:
    "Du kannst dich voranschieben — nutze den Joystick. Sehen kannst du noch nichts. " +
    "Lerne von den Wesen um dich, Licht zu spüren.",
  awake:
    "Du siehst und bewegst dich. Je mehr du übst, desto schneller kriechst du und desto weiter siehst du. " +
    "Gras gibt Pflanzenfasern — Nahrung zum Wachsen.",
};

/**
 * Blind und unbeweglich im Nest, Tätigkeit schon gewählt: sagen, dass sie
 * läuft und dass Lernen etwas dauert (Vorschlag Claude, offen, 15. November
 * 2026 — der Entwickler bemerkte, dass nach der Wahl scheinbar nichts geschieht).
 */
const INTRO_TEXT_SETTLED_WORKING =
  "Du tastest die Wesen neben dir ab. Jede Aktion bringt ein wenig Erfahrung. " +
  "Hab Geduld — nach und nach lernst du etwas Neues.";

export function getIntroText(
  step: IntroStep,
  form: "settled" | "traveling" | "dried",
  activityChosen = false
): string {
  if (form === "settled" && step === "blind_still" && activityChosen) return INTRO_TEXT_SETTLED_WORKING;
  return (form === "settled" ? INTRO_TEXT_SETTLED : INTRO_TEXT_TRAVELING)[step];
}

// [VERWORFEN, 15. November 2026] INTRO_TEXT (ein Satz je Schritt, Erwachen
//   als Reisender mit Joystick): „Wasser … Du erwachst aus der Trockenstarre.
//   … Analysiere oder absorbiere es“ — Grund: Start im Nest (GDD-10 Abschnitt
//   12), Wasser verworfen, im Nest keine aktiven Skills.

// Stand: 15. November 2026 — Hinweis, sobald im Nest eine Tätigkeit läuft; Texte für Nest und Reisenden (GDD-10); davor 13. November 2026 — Erstfassung
