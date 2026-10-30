// ============================================================
// SKILL EFFECT SYSTEM
// Absorb & Evolve — Effekt-Auflösung aus SkillEffect-Deklarationen
//
// Liest effects[] aus SkillDefinition, wertet Formeln aus und
// aggregiert die Ergebnisse für DamageSystem und CombatSystem.
//
// Keine Phaser-Abhängigkeit. Kein State. Rein funktional.
// ============================================================

import type { PlayerState } from "../types/GameState";
import type { DamageType, StatusEffect } from "../types/Combat";
import type { LinearFormula, SkillEffect } from "../types/Skill";
import { ALL_SKILLS } from "../data/skills";
import { MILLI, SKILL_DEFENSE_BASE_MULTIPLIER } from "../data/balance";
import { makeStatusEffect } from "../types/Combat";
import { getSkillPractice } from "./ProgressionSystem";

// -----------------------------------------------------------
// Formelauswertung
//
// Für absolute Effekte (flat_block, reflect_damage, deal_damage,
// heal_flat, grant_penetration): Wert in Display-HP, × MILLI → milli-HP.
// Für Faktoren (percent_reduce, weakness, damage_mult): Wert direkt.
// -----------------------------------------------------------
//
// practice = Übungsgrad u (stetig, aus Erfahrung — ProgressionSystem).
// Gleiche Formel für Blob und Gegner: gleiche Erfahrung, gleicher Wert.
export function evalFormula(formula: LinearFormula, practice: number): number {
  const l = practice - 1;
  let value: number;
  switch (formula.curve ?? "linear") {
    case "sqrt": value = formula.base + formula.perLevel * Math.sqrt(l); break;
    case "log":  value = formula.base + formula.perLevel * (l > 0 ? Math.log2(l + 1) : 0); break;
    default:     value = formula.base + formula.perLevel * l;
  }
  return formula.max !== undefined ? Math.min(formula.max, value) : value;
}

// -----------------------------------------------------------
// Hilfsfunktion: Prüft ob ein Effekt auf einen Schadenstyp passt
// -----------------------------------------------------------
function matchesDamageType(effect: SkillEffect, damageType: DamageType | undefined): boolean {
  if (!effect.condition?.damageType) return true; // Keine Bedingung = immer aktiv
  if (!damageType) return false;                   // Bedingung vorhanden, aber kein Typ = kein Match
  const cond = effect.condition.damageType;
  return Array.isArray(cond) ? cond.includes(damageType) : cond === damageType;
}

// -----------------------------------------------------------
// DefenderEffects: Ergebnis der Verteidiger-Auflösung
// -----------------------------------------------------------
export interface DefenderEffects {
  flatBlock: number;        // milli-HP (summiert aus allen Quellen)
  percentReduce: number;    // 0.0–1.0 (additiv, wird extern gecappt)
  weaknessMult: number;     // multiplikativ gestapelt (1.0 = neutral)
  reflectDamage: number;    // milli-HP (z.B. Hemolymph)
  immune: boolean;
}

/** Leere DefenderEffects — neutraler Zustand */
function emptyDefender(): DefenderEffects {
  return { flatBlock: 0, percentReduce: 0, weaknessMult: 1.0, reflectDamage: 0, immune: false };
}

// -----------------------------------------------------------
// resolveDefenderEffects
//
// Wertet alle on_receive_damage-Effekte der gegebenen Skills aus.
// skillPractice: { skillId → Übungsgrad } (Spieler oder Entity)
// damageType:  Typ des eingehenden Schadens (undefined = untypisiert)
// -----------------------------------------------------------
export function resolveDefenderEffects(
  skillPractice: Record<string, number>,
  damageType?: DamageType
): DefenderEffects {
  const result = emptyDefender();

  for (const [skillId, practice] of Object.entries(skillPractice)) {
    const def = ALL_SKILLS.get(skillId);
    if (!def?.effects) continue;

    for (const effect of def.effects) {
      if (effect.trigger !== "on_receive_damage") continue;
      if (!matchesDamageType(effect, damageType)) continue;

      const value = evalFormula(effect.formula, practice) * SKILL_DEFENSE_BASE_MULTIPLIER;

      switch (effect.effectType) {
        case "flat_block":
          // formula in Display-HP → ×MILLI für milli-HP
          result.flatBlock += Math.round(value * MILLI);
          break;
        case "percent_reduce":
          // formula direkt als 0.0–1.0
          result.percentReduce += value;
          break;
        case "weakness":
          // Multiplikativ gestapelt
          result.weaknessMult *= value;
          break;
        case "reflect_damage":
          // formula in Display-HP → ×MILLI
          result.reflectDamage += Math.round(value * MILLI);
          break;
      }
    }
  }

  return result;
}

// -----------------------------------------------------------
// AttackerEffects: Ergebnis der Angreifer-Auflösung
// -----------------------------------------------------------
export interface AttackerEffects {
  damageMult: number;    // Multiplikativ gestapelt (1.0 = neutral)
  penetration: number;   // milli-HP Flat-Block die ignoriert werden
}

/** Leere AttackerEffects — neutraler Zustand */
function emptyAttacker(): AttackerEffects {
  return { damageMult: 1.0, penetration: 0 };
}

// -----------------------------------------------------------
// resolveAttackerEffects
//
// Wertet alle on_hit_enemy-Effekte der gegebenen Skills aus.
// -----------------------------------------------------------
export function resolveAttackerEffects(
  skillPractice: Record<string, number>
): AttackerEffects {
  const result = emptyAttacker();

  for (const [skillId, practice] of Object.entries(skillPractice)) {
    const def = ALL_SKILLS.get(skillId);
    if (!def?.effects) continue;

    for (const effect of def.effects) {
      if (effect.trigger !== "on_hit_enemy" && effect.trigger !== "passive") continue;

      const value = evalFormula(effect.formula, practice);

      switch (effect.effectType) {
        case "damage_mult":
          result.damageMult *= value;
          break;
        case "grant_penetration":
          result.penetration += Math.round(value * MILLI);
          break;
      }
    }
  }

  return result;
}

// -----------------------------------------------------------
// resolveDexterity
//
// Summe aller passiven Geschick-Effekte. Geschick verbessert die
// Treffer-Stufen beim Angriff und lässt Gegner öfter schlecht treffen.
// excludeSkillId: der angreifende Skill — sein eigener Geschick-Beitrag zählt
// nicht, weil sein Level schon direkt in die Treffer-Stufen eingeht.
// -----------------------------------------------------------
export function resolveDexterity(skillPractice: Record<string, number>, excludeSkillId?: string): number {
  let dex = 0;
  for (const [skillId, practice] of Object.entries(skillPractice)) {
    if (skillId === excludeSkillId) continue;
    for (const effect of ALL_SKILLS.get(skillId)?.effects ?? []) {
      if (effect.trigger === "passive" && effect.effectType === "dexterity") {
        dex += evalFormula(effect.formula, practice);
      }
    }
  }
  return dex;
}

// -----------------------------------------------------------
// resolveOnHitStatusEffects
//
// Gibt StatusEffect-Instanzen zurück die bei einem Treffer
// auf das Ziel angewendet werden sollen (z.B. Venom-DoT).
// -----------------------------------------------------------
export function resolveOnHitStatusEffects(
  skillPractice: Record<string, number>
): StatusEffect[] {
  const result: StatusEffect[] = [];
  const now = Date.now();

  for (const [skillId, practice] of Object.entries(skillPractice)) {
    const def = ALL_SKILLS.get(skillId);
    if (!def?.effects) continue;

    for (const effect of def.effects) {
      if (effect.trigger !== "on_hit_enemy") continue;
      if (effect.effectType !== "apply_status") continue;
      if (!effect.statusConfig) continue;

      const chance = evalFormula(effect.formula, practice);
      if (Math.random() >= chance) continue;

      const cfg = effect.statusConfig;
      const durationMs = cfg.durationMs;

      const statusEffect = makeStatusEffect({
        id: `${skillId}_status_${now}_${Math.random().toString(36).slice(2)}`,
        type: cfg.type,
        sourceSkillId: skillId,
        durationMs,
        expiresAt: now + durationMs,
        tickIntervalMs: cfg.tickIntervalMs ?? 0,
        lastTickAt: now,
        damagePerTick: cfg.damageFormula
          ? Math.round(evalFormula(cfg.damageFormula, practice) * MILLI)
          : 0,
        healPerTick: cfg.healFormula
          ? Math.round(evalFormula(cfg.healFormula, practice) * MILLI)
          : 0,
      });
      result.push(statusEffect);
    }
  }

  return result;
}

// -----------------------------------------------------------
// Hilfsfunktionen: Übungsgrade aus dem Spieler extrahieren
// (Gegner: ProgressionSystem.getEntitySkillPractice)
// -----------------------------------------------------------

/** Alle aktiven passiven Skills des Spielers als { id → Übungsgrad }. */
export function getPlayerPassiveSkillPractice(player: PlayerState): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [id, instance] of player.discoveredSkills) {
    const def = ALL_SKILLS.get(id);
    if (def?.activation === "passive" && instance.isEnabled !== false) {
      result[id] = getSkillPractice(player, id);
    }
  }
  return result;
}

/** Alle Skills des Spielers (passiv und aktiv) als { id → Übungsgrad }. */
export function getPlayerAllSkillPractice(player: PlayerState): Record<string, number> {
  const result: Record<string, number> = {};
  for (const id of player.discoveredSkills.keys()) {
    result[id] = getSkillPractice(player, id);
  }
  return result;
}
