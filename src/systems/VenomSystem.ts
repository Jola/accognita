// ============================================================
// VENOM SYSTEM
// Absorb & Evolve — Giftlast: Einspritzen, stufenloser Abbau, Ende
//
// Alle Stellschrauben und ihre Begründungen: src/data/venom.ts
// (gleiche Abschnittsnummern). Hier steht nur, wie gerechnet wird.
//
// Keine Phaser-Abhängigkeit. Kein Rendering. Vollständig testbar.
// ============================================================

import type { VenomDose } from "../types/Combat";
import type { SkillEffect } from "../types/Skill";
import { ALL_SKILLS } from "../data/skills";
import { MILLI } from "../data/balance";
import { VENOM_HALF_LIFE_MS, VENOM_MIN_RATE_HP_PER_S } from "../data/venom";
import { evalSkillValue } from "./SkillEffectSystem";

/** Alles, was vergiftet werden kann: Blob (PlayerState) und Gegner (EntityInstance). */
export interface VenomTarget {
  venomLoad?: number;                     // milli-HP; fehlt = 0
  venomBySkill?: Record<string, number>;  // Anteil der Last je Gift-Skill (milli-HP) — für die XP
}

/** Giftschaden eines Frames: gesamt und je Gift-Skill (milli-HP). */
export interface VenomTick {
  dealt: number;
  bySkill: Record<string, number>;
}

// Abbaukonstante λ = ln 2 / T (pro ms) und Mindestrate (milli-HP pro ms)
const DECAY_PER_MS = Math.LN2 / VENOM_HALF_LIFE_MS;
const MIN_RATE_PER_MS = (VENOM_MIN_RATE_HP_PER_S * MILLI) / 1000;
// Unterhalb dieser Last ist λ·L kleiner als die Mindestrate (≈ 2,9 HP)
const TAIL_LOAD = MIN_RATE_PER_MS / DECAY_PER_MS;

// -----------------------------------------------------------
// 1. DOSIS JE BISS — beim Treffer würfeln
// -----------------------------------------------------------

/** Chance, dass ein Treffer Gift einspritzt (0–1) — für Würfeln und Anzeige. */
export function venomBiteChance(effect: SkillEffect, progress: number): number {
  return evalSkillValue(effect.formula, progress);
}

/** Eingespritzte Dosis in milli-HP — für Würfeln und Anzeige. */
export function venomDoseMilli(effect: SkillEffect, progress: number): number {
  return effect.venomDose ? Math.round(evalSkillValue(effect.venomDose, progress) * MILLI) : 0;
}

/**
 * Würfelt für jeden Skill mit "inject_venom"-Effekt die Bisschance und
 * gibt die eingespritzten Dosen zurück (milli-HP; total 0 = trocken).
 * skillProgress: { skillId → Fortschritt } des Angreifers.
 * attack: der Skill, mit dem gerade getroffen wurde (fehlt = unbewaffnet).
 *
 * Passive Skills (Venom) spritzen bei jedem Treffer. Aktive Skills
 * (Stachelstich) nur, wenn genau sie getroffen haben — das Gift sitzt im
 * Stachel, nicht in den Scheren.
 */
export function rollVenomDose(
  skillProgress: Record<string, number>,
  attack?: { skillId: string; progress: number }
): VenomDose {
  const sources = { ...skillProgress, ...(attack ? { [attack.skillId]: attack.progress } : {}) };
  const dose: VenomDose = { total: 0, bySkill: {} };
  for (const [skillId, progress] of Object.entries(sources)) {
    const def = ALL_SKILLS.get(skillId);
    if (def?.activation === "active" && skillId !== attack?.skillId) continue;
    for (const effect of def?.effects ?? []) {
      if (effect.trigger !== "on_hit_enemy" || effect.effectType !== "inject_venom") continue;
      if (!effect.venomDose) continue;
      if (Math.random() >= venomBiteChance(effect, progress)) continue;
      const amount = venomDoseMilli(effect, progress);
      dose.total += amount;
      dose.bySkill[skillId] = (dose.bySkill[skillId] ?? 0) + amount;
    }
  }
  return dose;
}

// -----------------------------------------------------------
// 2. GIFTLAST — Dosen addieren sich
// -----------------------------------------------------------

// Alles Gift landet in derselben Last (gleicher Abbau). Nebenbei wird
// gemerkt, welcher Skill wie viel beigetragen hat: Der Schaden wird anteilig
// aufgeteilt, damit Venom und Stachelstich jeweils ihre eigene XP bekommen.
export function addVenomDose(target: VenomTarget, dose: VenomDose): void {
  if (dose.total <= 0) return;
  target.venomLoad = (target.venomLoad ?? 0) + dose.total;
  const shares = (target.venomBySkill ??= {});
  for (const [skillId, amount] of Object.entries(dose.bySkill)) {
    shares[skillId] = (shares[skillId] ?? 0) + amount;
  }
}

/** Restliche Giftlast = so viele milli-HP wird das Gift noch kosten. */
export function getVenomLoad(target: VenomTarget): number {
  return target.venomLoad ?? 0;
}

/** Gift entfernen (Tod, Respawn, Checkpoint, Laden). */
export function clearVenom(target: VenomTarget): void {
  target.venomLoad = 0;
  target.venomBySkill = {};
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
 * Ziel tatsächlich nimmt (milli-HP, höchstens currentHp) — gesamt und
 * anteilig je Gift-Skill. Stirbt das Ziel, verfällt der Rest — Gift-XP gibt
 * es nur für echten Schaden (Abschnitt 5).
 */
export function processVenom(target: VenomTarget, currentHp: number, deltaMs: number): VenomTick {
  const load = getVenomLoad(target);
  if (load <= 0) return { dealt: 0, bySkill: {} };
  const after = venomLoadAfter(load, deltaMs);
  const dealt = Math.min(load - after, Math.max(0, currentHp));

  // Anteilig aufteilen: Jeder Skill verliert so viel, wie sein Anteil an der Last ausmacht
  const bySkill: Record<string, number> = {};
  const shares = target.venomBySkill ?? {};
  for (const [skillId, share] of Object.entries(shares)) {
    bySkill[skillId] = (dealt * share) / load;
    shares[skillId] = (share * after) / load;
  }

  if (dealt >= currentHp || after <= 0) clearVenom(target);
  else target.venomLoad = after;
  return { dealt, bySkill };
}

// Stand: 1. November 2026 (Chance und Dosis als eigene Funktionen — dieselben für Anzeige und Spiel)
// Davor: 31. Oktober 2026 (Anteile je Gift-Skill für die XP)
