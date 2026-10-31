// ============================================================
// VENOM SYSTEM
// Absorb & Evolve — Giftlast: Einspritzen, stufenloser Abbau, Ende
//
// Alle Stellschrauben und ihre Begründungen: src/data/venom.ts
// (gleiche Abschnittsnummern). Hier steht nur, wie gerechnet wird.
//
// Keine Phaser-Abhängigkeit. Kein Rendering. Vollständig testbar.
// ============================================================

import { ALL_SKILLS } from "../data/skills";
import { MILLI } from "../data/balance";
import { VENOM_HALF_LIFE_MS, VENOM_MIN_RATE_HP_PER_S } from "../data/venom";
import { evalFormula } from "./SkillEffectSystem";

/** Alles, was vergiftet werden kann: Blob (PlayerState) und Gegner (EntityInstance). */
export interface VenomTarget {
  venomLoad?: number; // milli-HP; fehlt = 0
}

// Abbaukonstante λ = ln 2 / T (pro ms) und Mindestrate (milli-HP pro ms)
const DECAY_PER_MS = Math.LN2 / VENOM_HALF_LIFE_MS;
const MIN_RATE_PER_MS = (VENOM_MIN_RATE_HP_PER_S * MILLI) / 1000;
// Unterhalb dieser Last ist λ·L kleiner als die Mindestrate (≈ 2,9 HP)
const TAIL_LOAD = MIN_RATE_PER_MS / DECAY_PER_MS;

// -----------------------------------------------------------
// 1. DOSIS JE BISS — beim Treffer würfeln
// -----------------------------------------------------------

/**
 * Würfelt für jeden Skill mit "inject_venom"-Effekt die Bisschance und
 * gibt die Summe der eingespritzten Dosen zurück (milli-HP, 0 = trocken).
 * skillPractice: { skillId → Übungsgrad } des Angreifers.
 */
export function rollVenomDose(skillPractice: Record<string, number>): number {
  let dose = 0;
  for (const [skillId, practice] of Object.entries(skillPractice)) {
    for (const effect of ALL_SKILLS.get(skillId)?.effects ?? []) {
      if (effect.trigger !== "on_hit_enemy" || effect.effectType !== "inject_venom") continue;
      if (!effect.venomDose) continue;
      if (Math.random() >= evalFormula(effect.formula, practice)) continue;
      dose += Math.round(evalFormula(effect.venomDose, practice) * MILLI);
    }
  }
  return dose;
}

// -----------------------------------------------------------
// 2. GIFTLAST — Dosen addieren sich
// -----------------------------------------------------------

export function addVenomDose(target: VenomTarget, dose: number): void {
  if (dose > 0) target.venomLoad = (target.venomLoad ?? 0) + dose;
}

/** Restliche Giftlast = so viele milli-HP wird das Gift noch kosten. */
export function getVenomLoad(target: VenomTarget): number {
  return target.venomLoad ?? 0;
}

/** Gift entfernen (Tod, Respawn, Checkpoint, Laden). */
export function clearVenom(target: VenomTarget): void {
  target.venomLoad = 0;
}

// -----------------------------------------------------------
// 3./4. ABBAU — Halbwertszeit, am Ende Mindestrate
// -----------------------------------------------------------

/**
 * Giftlast nach deltaMs — exakt, unabhängig von der Bildrate.
 * Über TAIL_LOAD: L · 2^(−t/T). Erreicht die Last TAIL_LOAD innerhalb von
 * deltaMs, läuft die restliche Zeit mit der Mindestrate weiter bis 0.
 */
export function venomLoadAfter(load: number, deltaMs: number): number {
  if (load <= 0 || deltaMs <= 0) return Math.max(0, load);
  let remainingMs = deltaMs;
  if (load > TAIL_LOAD) {
    const msToTail = Math.log(load / TAIL_LOAD) / DECAY_PER_MS;
    if (remainingMs <= msToTail) return load * Math.exp(-DECAY_PER_MS * remainingMs);
    load = TAIL_LOAD;
    remainingMs -= msToTail;
  }
  return Math.max(0, load - MIN_RATE_PER_MS * remainingMs);
}

/** Zeit in ms, bis eine Giftlast vollständig abgebaut ist. */
export function venomDurationMs(load: number): number {
  if (load <= 0) return 0;
  const toTail = load > TAIL_LOAD ? Math.log(load / TAIL_LOAD) / DECAY_PER_MS : 0;
  return toTail + Math.min(load, TAIL_LOAD) / MIN_RATE_PER_MS;
}

/**
 * Baut die Giftlast um deltaMs ab und gibt den Schaden zurück, den das
 * Ziel tatsächlich nimmt (milli-HP, höchstens currentHp). Stirbt das Ziel,
 * verfällt der Rest — Gift-XP gibt es nur für echten Schaden (Abschnitt 5).
 */
export function processVenom(target: VenomTarget, currentHp: number, deltaMs: number): number {
  const load = getVenomLoad(target);
  if (load <= 0) return 0;
  const after = venomLoadAfter(load, deltaMs);
  const dealt = Math.min(load - after, Math.max(0, currentHp));
  target.venomLoad = dealt >= currentHp ? 0 : after;
  return dealt;
}

// Stand: 31. Oktober 2026
