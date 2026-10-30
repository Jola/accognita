// ============================================================
// SKILL EFFECTS
// Absorb & Evolve — Skill-Formeln (zentrale Berechnungsquelle)
//
// Jede Funktion berechnet einen Effektwert auf Basis des Übungsgrads (stetig, aus Erfahrung).
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
export function calcChitinDr(practice: number): number {
  return Math.min(0.10 + (practice - 1) * 0.05, 0.70);
}

// -----------------------------------------------------------
// venom — Vergiftungswahrscheinlichkeit (0.0–1.0) pro Treffer
//
// Lv 1 → 30%,  Lv 5 → 50%,  Lv 9 → 70%
// -----------------------------------------------------------
export function calcVenomChance(practice: number): number {
  return 0.30 + (practice - 1) * 0.05;
}

// -----------------------------------------------------------
// venom — Schaden pro Tick (DoT läuft 4 s in 1-Sekunden-Ticks)
//
// Lv 1 → 2/s,  Lv 3 → 3/s,  Lv 5 → 4/s,  Lv 8 → 5/s  (in HP)
// Gespeichert in milli-HP: ×1000
// -----------------------------------------------------------
export function calcVenomDmgPerTick(practice: number): number {
  return (2 + Math.floor((practice - 1) * 0.5)) * 1000;
}

// -----------------------------------------------------------
// Generisch: Angriffsskill-Schaden für beliebigen Skill
//
// Liest baseDamage aus SkillDefinition × getSkillEffectiveness.
// Neue Angriffsskills brauchen nur baseDamage in skills.ts — keine neue Formel.
// -----------------------------------------------------------
export function calcSkillAttackDamage(skillId: string, practice: number): number {
  const baseDamage = ALL_SKILLS.get(skillId)?.baseDamage ?? 0;
  if (baseDamage === 0) return 0;
  return Math.max(1, Math.round(baseDamage * getSkillEffectiveness(practice)));
}

// -----------------------------------------------------------
// bite — Direktangriff-Schaden
//
// Lv 1 → 7,  Lv 2 → 8,  Lv 3 → 10,  Lv 6 → 12,  Lv 18 → 20
// -----------------------------------------------------------
export function calcBiteDamage(practice: number): number {
  return calcSkillAttackDamage("bite", practice);
}

// -----------------------------------------------------------
// claw — Klauenhieb (Nahkampf)
//
// Lv 1 → 8,  Lv 3 → 10,  Lv 10 → 16,  Lv 20 → 24
// -----------------------------------------------------------
export function calcClawDamage(practice: number): number {
  return calcSkillAttackDamage("claw", practice);
}

// -----------------------------------------------------------
// fire_breath — Feueratem (Fernkampf, 8 × worldSize Reichweite)
//
// Lv 1 → 10,  Lv 5 → 15,  Lv 10 → 18,  Lv 20 → 31
// -----------------------------------------------------------
export function calcFireBreathDamage(practice: number): number {
  return calcSkillAttackDamage("fire_breath", practice);
}

// -----------------------------------------------------------
// jump — Dash-Reichweite in Weltpixeln
//
// Lv 1 → 160px,  Lv 2 → 180px,  Lv 5 → 240px
// -----------------------------------------------------------
const JUMP_BASE_PX        = 160;
const JUMP_BONUS_PER_LEVEL = 20;

export function calcJumpDistance(practice: number): number {
  return JUMP_BASE_PX + (practice - 1) * JUMP_BONUS_PER_LEVEL;
}

// -----------------------------------------------------------
// hemolymph — Rückschlag-Schaden pro Treffer (Aura)
//
// Lv 1 → 2,  Lv 3 → 6,  Lv 5 → 10  (in HP)
// Gespeichert in milli-HP: ×1000
// -----------------------------------------------------------
export function calcHemolymphReflect(practice: number): number {
  return 2 * practice * 1000;
}

// -----------------------------------------------------------
// superstrength — ausgehender Schaden-Multiplikator
//
// Lv 1 → ×1.30,  Lv 3 → ×1.59,  Lv 5 → ×1.74
// -----------------------------------------------------------
export function calcSuperstrengthMult(practice: number): number {
  return 1.0 + 0.3 * getSkillEffectiveness(practice);
}

// -----------------------------------------------------------
// photosynthesis — HP-Regeneration pro Sekunde (HoT)
//
// Lv 1 → 0.5/s,  Lv 3 → 1.5/s,  Lv 5 → 2.5/s  (in HP)
// Gespeichert in milli-HP: ×1000
// -----------------------------------------------------------
export function calcPhotosynthesisHeal(practice: number): number {
  return Math.round(0.5 * practice * 1000);
}
