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

/** Hinweistext je Schritt (Texte: Vorschlag Claude). */
export const INTRO_TEXT: Record<IntroStep, string> = {
  blind_still:
    "Wasser … Du erwachst aus der Trockenstarre. Du siehst nichts und kannst dich nicht bewegen. " +
    "Doch du spürst etwas direkt neben dir. Analysiere oder absorbiere es — vielleicht lernst du etwas.",
  seeing_still:
    "Licht! Hell und dunkel, verschwommene Umrisse. Bewegen kannst du dich noch nicht. " +
    "Lerne von den Wesen neben dir, wie man kriecht.",
  moving_blind:
    "Du kannst dich voranschieben — nutze den Joystick. Sehen kannst du noch nichts. " +
    "Lerne von den Wesen neben dir, Licht zu spüren.",
  awake:
    "Du siehst und bewegst dich. Je mehr du übst, desto schneller kriechst du und desto weiter siehst du. " +
    "Gras in der Nähe gibt Pflanzenfasern — Nahrung zum Wachsen.",
};

// Stand: 13. November 2026 — Erstfassung
