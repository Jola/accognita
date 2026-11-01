// ============================================================
// SKILL EFFECTS
// Absorb & Evolve — Skill-Formeln (zentrale Berechnungsquelle)
//
// Jede Funktion berechnet einen Effektwert auf Basis des Fortschritts p (0–1, stetig aus Erfahrung).
// Gilt für Spieler UND Entitäten gleichermaßen — ein Code, ein Wert.
//
// Regel: Wer einen Skill-Wert berechnen möchte, ruft hier an.
//         Nirgendwo sonst stehen diese Formeln.
//
// Allgemeines Schema (progression.ts Abschnitt 1): Wert = start + (max − start) × p.
// Die Funktionen mit Parameter „practice“ (alter Übungsgrad u) sind
// Alt-Formeln, die nirgends mehr aufgerufen werden (TODO.md) — [VERWORFEN].
//
// Keine Phaser-Abhängigkeit. Kein State. Rein funktional.
// ============================================================

import type { SkillValue } from "../types/Skill";
import { getSkillEffectiveness } from "./SkillSystem";
import { evalSkillValue } from "./SkillEffectSystem";
import { ALL_SKILLS } from "../data/skills";
import { MILLI } from "../data/balance";

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
// bite — Direktangriff-Schaden (Werte: skills.ts)
// -----------------------------------------------------------
export function calcBiteDamage(progress: number): number {
  return calcSkillAttackDamage("bite", progress);
}

// -----------------------------------------------------------
// claw — Klauenhieb (Nahkampf, Werte: skills.ts)
// -----------------------------------------------------------
export function calcClawDamage(progress: number): number {
  return calcSkillAttackDamage("claw", progress);
}

// -----------------------------------------------------------
// fire_breath — Feueratem (Fernkampf, 8 × worldSize Reichweite, Werte: skills.ts)
// -----------------------------------------------------------
export function calcFireBreathDamage(progress: number): number {
  return calcSkillAttackDamage("fire_breath", progress);
}

// -----------------------------------------------------------
// jump — Dash-Reichweite in Weltpixeln
//
// 40 → 375 px, bei Natur 342 px (bisher 340).
// Startwert (Vorschlag Claude, offen): ein kleiner Hüpfer — der Wert soll
// bei 0 XP sehr niedrig sein (Vorgabe Entwickler), ein Sprung von 1 px wäre
// aber keiner.
// [VERWORFEN, 1. November 2026] 160 + 20 × (u − 1) px.
// -----------------------------------------------------------
const JUMP_DISTANCE_PX: SkillValue = { start: 40, max: 375 };

export function calcJumpDistance(progress: number): number {
  return evalSkillValue(JUMP_DISTANCE_PX, progress);
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
// photosynthesis — HP-Regeneration pro Sekunde (stufenlos, HoT)
//
// 0,1 → 1,2 HP/s, bei Natur 1,09 HP/s (bisher 1,1). Gespeichert in milli-HP.
// [VERWORFEN, 1. November 2026] 0,2 + 0,1 × (u − 1) HP/s (Schema-Umstellung).
// [VERWORFEN, 1. November 2026] 0,5 × u HP/s (u 10 → 5 HP/s).
// Vorgabe (Entwickler): Die Regeneration ist viel zu stark.
// Begründung (Vorschlag Claude): Fotosynthese liefert einem Tier wenig
// Energie — Schnecken mit eingelagerten Chloroplasten (Elysia) überleben
// damit wochenlang, wachsen aber kaum. Ein Blob mit 80 HP braucht bei u 10
// bei Natur rund eine Minute, um sich voll zu heilen. VORLÄUFIG
// -----------------------------------------------------------
const PHOTOSYNTHESIS_HEAL_HP_PER_S: SkillValue = { start: 0.1, max: 1.2 };

export function calcPhotosynthesisHeal(progress: number): number {
  return Math.round(evalSkillValue(PHOTOSYNTHESIS_HEAL_HP_PER_S, progress) * MILLI);
}
