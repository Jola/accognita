// ============================================================
// BODY SYSTEM — Bewegung, Sinne, Stärke aus Größe
// Absorb & Evolve
//
// Stellschrauben und Begründungen: src/data/body.ts (gleiche
// Abschnittsnummern). Keine Phaser-Abhängigkeit. Reine Logik.
// Gilt nur für den Blob (body.ts): Gegner haben festes Tempo, keine Sicht
// und keinen Größenbonus. bestOfEffect ist allgemein und wird auch für
// Anzeigen einzelner Skills genutzt.
// [VERWORFEN, 14. November 2026] „Für Blob und Gegner gilt dieselbe
//   Auswertung“ — stimmte nicht, Gegner nutzen dieses Modul nicht.
// ============================================================

import type { PlayerState } from "../types/GameState";
import type { EffectType } from "../types/Skill";
import { ALL_SKILLS } from "../data/skills";
import { PLAYER_SIZE_GROWTH_MAX, SIZE_STRENGTH_BONUS_MAX } from "../data/balance";
import { evalSkillValue, resolveStrength, getPlayerPassiveSkillProgress, practiceXp } from "./SkillEffectSystem";
import { getPlayerGrowth } from "./GrowSystem";

// -----------------------------------------------------------
// Bester Wert eines passiven Effekts über alle gegebenen Skills
// (Tempo, Sichtweite, Farbe: „der beste Skill zählt“, body.ts)
// -----------------------------------------------------------
export function bestOfEffect(
  skillProgress: Record<string, number>,
  type: EffectType,
): { value: number; skillId?: string } {
  let best = 0;
  let bestId: string | undefined;
  for (const [skillId, progress] of Object.entries(skillProgress)) {
    for (const e of ALL_SKILLS.get(skillId)?.effects ?? []) {
      if (e.trigger !== "passive" || e.effectType !== type) continue;
      const v = evalSkillValue(e.formula, progress);
      if (v > best) { best = v; bestId = skillId; }
    }
  }
  return { value: best, skillId: bestId };
}

// -----------------------------------------------------------
// 1. BEWEGUNG
// -----------------------------------------------------------

/** Tempo-Faktor des besten eingeschalteten Bewegungs-Skills (0 = keine Bewegung). */
export function getMoveSpeedFactor(player: PlayerState): number {
  return bestOfEffect(getPlayerPassiveSkillProgress(player), "move_speed").value;
}

/**
 * Kennt der Blob einen Bewegungs-Skill? „Bekannt“ heißt entdeckt, nicht
 * eingeschaltet (GDD-10 Abschnitt 13.6). Voraussetzung für Niederlassen,
 * Abspalten und Erheben.
 */
export function knowsMoveSkill(player: PlayerState): boolean {
  for (const id of player.discoveredSkills.keys()) {
    if ((ALL_SKILLS.get(id)?.effects ?? []).some((e) => e.trigger === "passive" && e.effectType === "move_speed")) return true;
  }
  return false;
}

/** Der Bewegungs-Skill, mit dem sich der Blob bewegt (der schnellste) — bekommt die Erfahrung. */
export function getActiveMoveSkill(player: PlayerState): string | undefined {
  return bestOfEffect(getPlayerPassiveSkillProgress(player), "move_speed").skillId;
}

/** Erfahrung des Bewegungs-Skills für eine Strecke (Weltpixel) bei Körperradius r — Menge am Skill (practice). */
export function calcMoveXp(skillId: string, distancePx: number, bodyRadiusPx: number): number {
  if (bodyRadiusPx <= 0) return 0;
  return practiceXp(skillId, "body_radius_moved", distancePx / bodyRadiusPx);
}

// -----------------------------------------------------------
// 2. STÄRKE AUS DER KÖRPERGRÖSSE
// -----------------------------------------------------------

/** Größenbonus auf die Stärke beim Wachstum g: 0 … SIZE_STRENGTH_BONUS_MAX. */
export function calcSizeStrengthBonus(growth: number): number {
  return SIZE_STRENGTH_BONUS_MAX * Math.min(1, Math.max(0, growth) / PLAYER_SIZE_GROWTH_MAX);
}

/** Faktor der Körpergröße auf die Stärke des Blobs (1 = kein Bonus). */
export function getSizeStrengthMult(player: PlayerState): number {
  return 1 + calcSizeStrengthBonus(getPlayerGrowth(player));
}

/**
 * Stärke des Blobs: Summe der Stärke-Effekte der eingeschalteten
 * Passiv-Skills × Größenfaktor. Dieselbe Zahl nutzt der Kampf.
 */
export function getPlayerStrength(player: PlayerState, passiveProgress = getPlayerPassiveSkillProgress(player)): number {
  return resolveStrength(passiveProgress) * getSizeStrengthMult(player);
}

// -----------------------------------------------------------
// 3. SEHEN
// -----------------------------------------------------------

export interface Vision {
  /** Sichtweite in Körperradien (0 = blind) */
  range: number;
  /** 0 = Graustufen, 1 = Farbe ohne Rot */
  color: number;
  /** 0 = Rot erscheint dunkel, 1 = volle Farbe */
  red: number;
}

/** Was der Blob sieht — aus den eingeschalteten Seh-Skills. */
export function getPlayerVision(player: PlayerState): Vision {
  const p = getPlayerPassiveSkillProgress(player);
  return {
    range: bestOfEffect(p, "sight_range").value,
    color: Math.min(1, bestOfEffect(p, "color_vision").value),
    red: Math.min(1, bestOfEffect(p, "red_vision").value),
  };
}

/** Eingeschaltete Seh-Skills (bekommen Erfahrung je Sekunde, Menge am Skill: practice). */
export function getActiveSightSkills(player: PlayerState): string[] {
  const p = getPlayerPassiveSkillProgress(player);
  return Object.keys(p).filter((id) => ALL_SKILLS.get(id)?.effects?.some((e) => e.effectType === "sight_range"));
}

/** Höchste erreichbare Sichtweite (Körperradien) über alle Skills — für INDEX-Achsen. */
export function maxEffectOverSkills(type: EffectType, at = 1): number {
  let best = 0;
  for (const def of ALL_SKILLS.values()) {
    for (const e of def.effects ?? []) {
      if (e.trigger === "passive" && e.effectType === type) best = Math.max(best, evalSkillValue(e.formula, at));
    }
  }
  return best;
}

// Stand: 13. November 2026 — Erstfassung

// -----------------------------------------------------------
// 3b. FARBE ALS 4×5-FARBMATRIX (für den Bildfilter der Szene)
//
// Graustufen G (Helligkeit nach Rec. 601), „ohne Rot“ P (Rot erscheint
// dunkel, ähnlich einer Rotblindheit), volle Farbe I:
//   M = lerp(G, lerp(P, I, Rot), Farbe)
// Reine Mathematik — GameScene reicht das Ergebnis an Phaser weiter.
// -----------------------------------------------------------
const GRAY = [0.299, 0.587, 0.114, 0.299, 0.587, 0.114, 0.299, 0.587, 0.114];
const NO_RED = [0.567, 0.433, 0, 0.558, 0.442, 0, 0, 0.242, 0.758];
const FULL = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export function visionColorMatrix(v: Vision): number[] {
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const rgb = GRAY.map((g, i) => lerp(g, lerp(NO_RED[i], FULL[i], v.red), v.color));
  return [
    rgb[0], rgb[1], rgb[2], 0, 0,
    rgb[3], rgb[4], rgb[5], 0, 0,
    rgb[6], rgb[7], rgb[8], 0, 0,
    0, 0, 0, 1, 0,
  ];
}
