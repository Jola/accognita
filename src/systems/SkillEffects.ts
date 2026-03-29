// ============================================================
// SKILL EFFECTS
// Absorb & Evolve — Skill-Formeln (zentrale Berechnungsquelle)
//
// Jede Funktion berechnet einen Effektwert auf Basis des Skill-Levels.
// Gilt für Spieler UND Entitäten gleichermaßen — ein Code, ein Wert.
//
// Regel: Wer einen Skill-Wert berechnen möchte, ruft hier an.
//         Nirgendwo sonst stehen diese Formeln.
//
// Keine Phaser-Abhängigkeit. Kein State. Rein funktional.
// ============================================================

import { getSkillEffectiveness } from "./SkillSystem";
import { ALL_SKILLS } from "../data/skills";

// -----------------------------------------------------------
// chitin_armor — Passive Schadensreduktion (0.0–0.70)
//
// Lv 1 → 10%,  Lv 2 → 15%,  Lv 5 → 30%,  Lv 8 → 45%
// Maximum: 70% (nie vollständig unverwundbar)
// -----------------------------------------------------------
export function calcChitinDr(level: number): number {
  return Math.min(0.10 + (level - 1) * 0.05, 0.70);
}

// -----------------------------------------------------------
// venom — Vergiftungswahrscheinlichkeit (0.0–1.0) pro Treffer
//
// Lv 1 → 30%,  Lv 5 → 50%,  Lv 9 → 70%
// -----------------------------------------------------------
export function calcVenomChance(level: number): number {
  return 0.30 + (level - 1) * 0.05;
}

// -----------------------------------------------------------
// venom — Schaden pro Tick (DoT läuft 4 s in 1-Sekunden-Ticks)
//
// Lv 1 → 2/s,  Lv 3 → 3/s,  Lv 5 → 4/s,  Lv 8 → 5/s
// -----------------------------------------------------------
export function calcVenomDmgPerTick(level: number): number {
  return 2 + Math.floor((level - 1) * 0.5);
}

// -----------------------------------------------------------
// bite — Direktangriff-Schaden
//
// Basiert auf SkillDefinition.baseDamage (7) × getSkillEffectiveness.
// Lv 1 → 7,  Lv 2 → 8,  Lv 3 → 10,  Lv 6 → 12,  Lv 18 → 20
// -----------------------------------------------------------
export function calcBiteDamage(level: number): number {
  const baseDamage = ALL_SKILLS.get("bite")?.baseDamage ?? 7;
  return Math.max(1, Math.round(baseDamage * getSkillEffectiveness(level)));
}

// -----------------------------------------------------------
// jump — Dash-Reichweite in Weltpixeln
//
// Lv 1 → 160px,  Lv 2 → 180px,  Lv 5 → 240px
// -----------------------------------------------------------
const JUMP_BASE_PX        = 160;
const JUMP_BONUS_PER_LEVEL = 20;

export function calcJumpDistance(level: number): number {
  return JUMP_BASE_PX + (level - 1) * JUMP_BONUS_PER_LEVEL;
}

// -----------------------------------------------------------
// hemolymph — Rückschlag-Schaden pro Treffer (Aura)
//
// Lv 1 → 2,  Lv 3 → 6,  Lv 5 → 10
// -----------------------------------------------------------
export function calcHemolymphReflect(level: number): number {
  return 2 * level;
}

// -----------------------------------------------------------
// superstrength — ausgehender Schaden-Multiplikator
//
// Lv 1 → ×1.30,  Lv 3 → ×1.59,  Lv 5 → ×1.74
// -----------------------------------------------------------
export function calcSuperstrengthMult(level: number): number {
  return 1.0 + 0.3 * getSkillEffectiveness(level);
}

// -----------------------------------------------------------
// photosynthesis — HP-Regeneration pro Sekunde (HoT)
//
// Lv 1 → 0.5/s,  Lv 3 → 1.5/s,  Lv 5 → 2.5/s
// -----------------------------------------------------------
export function calcPhotosynthesisHeal(level: number): number {
  return 0.5 * level;
}
