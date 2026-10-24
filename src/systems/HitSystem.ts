// ============================================================
// HIT SYSTEM
// Absorb & Evolve — Treffer-Stufen (verfehlt … kritisch)
//
// Berechnet die Wahrscheinlichkeiten der fünf Treffer-Stufen aus
// Grundverteilung des Skills, Skill-Level und Geschick-Differenz,
// und würfelt eine Stufe. Formel und Konstanten: data/balance.ts.
//
// Keine Phaser-Abhängigkeit. Kein State. Rein funktional.
// ============================================================

import type { HitGrade, HitProfile } from "../types/Combat";
import {
  HIT_TILT_MAX,
  HIT_TILT_PER_SKILL_LEVEL,
  HIT_TILT_PER_DEX,
} from "../data/balance";

/** Stufen von schlecht nach gut — die Position bestimmt die Kipprichtung */
export const HIT_GRADES: HitGrade[] = ["miss", "light", "normal", "heavy", "crit"];

export const HIT_GRADE_DE: Record<HitGrade, string> = {
  miss: "Verfehlt",
  light: "Leichter Treffer",
  normal: "Treffer",
  heavy: "Schwerer Treffer",
  crit: "Kritischer Treffer",
};

/** Kipp-Wert in [−HIT_TILT_MAX, +HIT_TILT_MAX]; positiv = bessere Treffer */
export function calcHitTilt(skillLevel: number, attackerDex: number, defenderDex: number): number {
  const x = HIT_TILT_PER_SKILL_LEVEL * (Math.max(1, skillLevel) - 1)
          + HIT_TILT_PER_DEX * (attackerDex - defenderDex);
  return HIT_TILT_MAX * Math.tanh(x);
}

/** Wahrscheinlichkeiten je Stufe (Summe 1) */
export function calcHitChances(
  profile: HitProfile,
  skillLevel: number,
  attackerDex: number,
  defenderDex: number
): HitProfile {
  const tilt = calcHitTilt(skillLevel, attackerDex, defenderDex);
  const weights = HIT_GRADES.map((g, i) => Math.max(0, profile[g]) * Math.exp(tilt * (i - 2)));
  const total = weights.reduce((sum, w) => sum + w, 0) || 1;
  const result = {} as HitProfile;
  HIT_GRADES.forEach((g, i) => { result[g] = weights[i] / total; });
  return result;
}

/** Würfelt eine Stufe aus den Wahrscheinlichkeiten */
export function rollHitGrade(chances: HitProfile, rng: () => number = Math.random): HitGrade {
  let r = rng();
  for (const g of HIT_GRADES) {
    r -= chances[g];
    if (r < 0) return g;
  }
  return "normal";
}
