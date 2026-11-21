// ============================================================
// SKILL EFFECTS
// Absorb & Evolve — Skill-Formeln (zentrale Berechnungsquelle)
//
// Die Werte selbst stehen an den Skills (src/data/skills.ts); hier steht nur,
// wie sie in Spielgrößen (milli-HP, px) umgerechnet werden.
//
// Jede Funktion berechnet einen Effektwert auf Basis des Fortschritts p (0–1, stetig aus Erfahrung).
// Gilt für Spieler UND Entitäten gleichermaßen — ein Code, ein Wert.
//
// Regel: Wer einen Skill-Wert berechnen möchte, ruft hier an.
//         Nirgendwo sonst stehen diese Formeln.
//
// Allgemeines Schema (progression.ts Abschnitt 1): Wert = start + (max − start) × p.
// [VERWORFEN, 21. November 2026] Alt-Formeln mit Übungsgrad u (calcChitinDr,
// calcVenomChance, calcVenomDmgPerTick, calcHemolymphReflect,
// calcSuperstrengthMult) und die Hüllen calcBiteDamage/calcClawDamage/
// calcFireBreathDamage entfernt — sie wurden nirgends mehr aufgerufen und
// lieferten teils andere Werte als die Effekte in skills.ts (Auftrag Entwickler).
//
// Keine Phaser-Abhängigkeit. Kein State. Rein funktional.
// ============================================================

import { evalSkillValue, evalSkillEffect } from "./SkillEffectSystem";
import { ALL_SKILLS } from "../data/skills";
import { MILLI } from "../data/balance";

// -----------------------------------------------------------
// Generisch: Angriffsskill-Schaden für beliebigen Skill
//
// Liest damage { start, max } aus der SkillDefinition (HP) → milli-HP.
// Neue Angriffsskills brauchen nur damage in skills.ts — keine neue Formel.
// [VERWORFEN, 1. November 2026] baseDamage × getSkillEffectiveness(u).
// -----------------------------------------------------------
export function calcSkillAttackDamage(skillId: string, progress: number): number {
  const damage = ALL_SKILLS.get(skillId)?.damage;
  if (!damage) return 0;
  return Math.max(1, Math.round(evalSkillValue(damage, progress) * MILLI));
}

// -----------------------------------------------------------
// jump — Dash-Reichweite in Weltpixeln
//
// Wert und Begründung am Skill (skills.ts, Effekt "jump_distance").
// [VERWORFEN, 14. November 2026] Konstante JUMP_DISTANCE_PX hier —
// Vorgabe (Entwickler): Was zu einem Skill gehört, steht am Skill.
// -----------------------------------------------------------
export function calcJumpDistance(progress: number, skillId = "jump"): number {
  return evalSkillEffect(skillId, "jump_distance", progress);
}

// -----------------------------------------------------------
// Regeneration — HP pro Sekunde (stufenlos, HoT), in milli-HP
//
// Wert und Begründung am Skill (skills.ts, Effekt "regen_hp", derzeit nur
// Photosynthese). [VERWORFEN, 14. November 2026] Konstante
// PHOTOSYNTHESIS_HEAL_HP_PER_S hier — Vorgabe (Entwickler): Was zu einem
// Skill gehört, steht am Skill.
// -----------------------------------------------------------
export function calcRegenHp(skillId: string, progress: number): number {
  return Math.round(evalSkillEffect(skillId, "regen_hp", progress) * MILLI);
}
