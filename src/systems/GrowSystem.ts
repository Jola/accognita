// ============================================================
// GROW SYSTEM — Wachsen: Pflanzenfasern verdauen, Körpermasse, Wachstum
// Absorb & Evolve
//
// Stellschrauben und Begründungen: src/data/grow.ts (gleiche
// Abschnittsnummern). Keine Phaser-Abhängigkeit. Reine Logik.
// ============================================================

import type { PlayerState } from "../types/GameState";
import { GROW_FOOD_MATERIAL_ID, GROWTH_FIBER_SCALE, MAX_BODY_MASS } from "../data/grow";
import { GROWTH_XP_SCALE } from "../data/progression";
import { getSkillProgress } from "./ProgressionSystem";
import { evalSkillEffect, evalSkillValue, getPlayerPassiveSkillProgress } from "./SkillEffectSystem";
import { ALL_SKILLS } from "../data/skills";
import { getMaterialAmount } from "./MaterialSystem";

// -----------------------------------------------------------
// 2. VERDAUUNGSTEMPO
// -----------------------------------------------------------

/** Fasern pro Minute beim Fortschritt p (0–1) — Wert am Skill (skills.ts, Effekt "digest_rate"). */
export function calcGrowFibersPerMinute(progress: number): number {
  return evalSkillEffect("grow", "digest_rate", progress);
}

/**
 * Faktor auf das Verdauungstempo aus eingeschalteten Passiv-Skills mit Effekt
 * "digest_mult" (Heißhunger), multiplikativ; 1 = keiner. Wert am Skill.
 */
export function calcDigestMult(player: PlayerState): number {
  let mult = 1;
  for (const [id, progress] of Object.entries(getPlayerPassiveSkillProgress(player))) {
    for (const e of ALL_SKILLS.get(id)?.effects ?? []) {
      if (e.trigger === "passive" && e.effectType === "digest_mult") mult *= evalSkillValue(e.formula, progress);
    }
  }
  return mult;
}

/** true, wenn Grow bekannt und eingeschaltet ist. */
export function isGrowActive(player: PlayerState): boolean {
  const inst = player.discoveredSkills.get("grow");
  return !!inst && inst.isEnabled !== false;
}

/** Ausgewachsen: Körpermasse ≥ Höchstmasse (data/grow.ts Abschnitt 5, GDD-10 7.1). */
export function isFullyGrown(bodyMass: number): boolean {
  return bodyMass >= MAX_BODY_MASS;
}

/**
 * Verdaut über deltaMs Spielzeit Fasern aus dem Lager. Gibt die Zahl der
 * verdauten Fasern zurück (für XP und Anzeige); die Körpermasse wächst um
 * genau diese Zahl. Ohne Fasern ruht Grow, höchstens eine Faser wartet.
 * Ausgewachsen verdaut Grow nicht mehr; die Fasern bleiben im Lager.
 */
export function processGrow(player: PlayerState, deltaMs: number): number {
  if (!isGrowActive(player)) return 0;
  if (isFullyGrown(player.bodyMass ?? 0)) { player.growDigest = 0; return 0; }
  const perMs = calcGrowFibersPerMinute(getSkillProgress(player, "grow")) * calcDigestMult(player) / 60_000;
  let pending = (player.growDigest ?? 0) + perMs * deltaMs;
  let digested = 0;
  while (pending >= 1 && getMaterialAmount(player, GROW_FOOD_MATERIAL_ID) >= 1 && !isFullyGrown(player.bodyMass + digested)) {
    player.materials.set(GROW_FOOD_MATERIAL_ID, getMaterialAmount(player, GROW_FOOD_MATERIAL_ID) - 1);
    pending -= 1;
    digested += 1;
  }
  player.growDigest = Math.min(pending, 1);
  player.bodyMass = (player.bodyMass ?? 0) + digested;
  return digested;
}

// -----------------------------------------------------------
// 4. WACHSTUM AUS KÖRPERMASSE
// -----------------------------------------------------------

/** Wachstum aus der Körpermasse (verdaute Fasern) — stetig. */
export function calcGrowthFromMass(bodyMass: number): number {
  return Math.log2(1 + Math.max(0, bodyMass) / GROWTH_FIBER_SCALE);
}

/** Wachstum des Blobs — bestimmt Größe, maxHp und maxMp. */
export function getPlayerGrowth(player: PlayerState): number {
  return calcGrowthFromMass(player.bodyMass ?? 0);
}

/**
 * Körpermasse, die das alte Wachstum aus Lebenserfahrung genau ergibt
 * (Migration alter Spielstände): log2(1 + xp/200) = log2(1 + m/20).
 */
export function bodyMassFromLifetimeXp(lifetimeXp: number): number {
  return (Math.max(0, lifetimeXp) / GROWTH_XP_SCALE) * GROWTH_FIBER_SCALE;
}

// Stand: 21. November 2026 — Verdauungs-Faktor aus Heißhunger (calcDigestMult); davor 15. November 2026 — verdaut nur bis ausgewachsen (GDD-10 7.1); davor 13. November 2026 — Erstfassung
