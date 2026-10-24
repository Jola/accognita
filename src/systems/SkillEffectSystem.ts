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

// -----------------------------------------------------------
// Formelauswertung
//
// Für absolute Effekte (flat_block, reflect_damage, deal_damage,
// heal_flat, grant_penetration): Wert in Display-HP, × MILLI → milli-HP.
// Für Faktoren (percent_reduce, weakness, damage_mult): Wert direkt.
// -----------------------------------------------------------
export function evalFormula(formula: LinearFormula, level: number): number {
  const l = level - 1;
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
// skillLevels: { skillId → level } (Spieler oder Entity)
// damageType:  Typ des eingehenden Schadens (undefined = untypisiert)
// -----------------------------------------------------------
export function resolveDefenderEffects(
  skillLevels: Record<string, number>,
  damageType?: DamageType
): DefenderEffects {
  const result = emptyDefender();

  for (const [skillId, level] of Object.entries(skillLevels)) {
    const def = ALL_SKILLS.get(skillId);
    if (!def?.effects) continue;

    for (const effect of def.effects) {
      if (effect.trigger !== "on_receive_damage") continue;
      if (!matchesDamageType(effect, damageType)) continue;

      const value = evalFormula(effect.formula, level) * SKILL_DEFENSE_BASE_MULTIPLIER;

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
  skillLevels: Record<string, number>
): AttackerEffects {
  const result = emptyAttacker();

  for (const [skillId, level] of Object.entries(skillLevels)) {
    const def = ALL_SKILLS.get(skillId);
    if (!def?.effects) continue;

    for (const effect of def.effects) {
      if (effect.trigger !== "on_hit_enemy" && effect.trigger !== "passive") continue;

      const value = evalFormula(effect.formula, level);

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
// resolveOnHitStatusEffects
//
// Gibt StatusEffect-Instanzen zurück die bei einem Treffer
// auf das Ziel angewendet werden sollen (z.B. Venom-DoT).
// -----------------------------------------------------------
export function resolveOnHitStatusEffects(
  skillLevels: Record<string, number>
): StatusEffect[] {
  const result: StatusEffect[] = [];
  const now = Date.now();

  for (const [skillId, level] of Object.entries(skillLevels)) {
    const def = ALL_SKILLS.get(skillId);
    if (!def?.effects) continue;

    for (const effect of def.effects) {
      if (effect.trigger !== "on_hit_enemy") continue;
      if (effect.effectType !== "apply_status") continue;
      if (!effect.statusConfig) continue;

      const chance = evalFormula(effect.formula, level);
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
          ? Math.round(evalFormula(cfg.damageFormula, level) * MILLI)
          : 0,
        healPerTick: cfg.healFormula
          ? Math.round(evalFormula(cfg.healFormula, level) * MILLI)
          : 0,
      });
      result.push(statusEffect);
    }
  }

  return result;
}

// -----------------------------------------------------------
// Hilfsfunktionen: Skill-Levels aus Spieler oder Entity extrahieren
// -----------------------------------------------------------

/** Alle aktiven passiven Skills des Spielers als { id → level }. */
export function getPlayerPassiveSkillLevels(player: PlayerState): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [id, instance] of player.discoveredSkills) {
    const def = ALL_SKILLS.get(id);
    if (def?.activation === "passive" && instance.isEnabled !== false) {
      result[id] = instance.level;
    }
  }
  return result;
}

/** Alle Skill-Levels des Spielers (passiv und aktiv) als { id → level }. */
export function getPlayerAllSkillLevels(player: PlayerState): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [id, instance] of player.discoveredSkills) {
    result[id] = instance.level;
  }
  return result;
}
