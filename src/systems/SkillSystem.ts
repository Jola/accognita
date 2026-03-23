// ============================================================
// SKILL SYSTEM
// Absorb & Evolve — Reine Logik, keine Rendering-Abhängigkeit
//
// Dieses Modul kann ohne Browser, ohne Phaser, ohne DOM
// verwendet werden. Ideal für Tests und Balancing.
// ============================================================

import type {
  SkillInstance,
  SkillDiscoveryResult,
  CombineResult,
  CombineOutcome,
  DiscoveryMethod,
} from "../types/Skill";
import type { PlayerState } from "../types/GameState";
import { CORE_BASE_XP, CORE_XP_MULTIPLIER, CORE_MAX_LEVEL } from "../types/GameState";
import { ALL_SKILLS, RECIPE_INDEX } from "../data/skills";

// -----------------------------------------------------------
// XP-BERECHNUNG
// GDD: xpNeeded = floor(baseThreshold * multiplier^(level-1))
// -----------------------------------------------------------
export function calcXpThreshold(
  baseThreshold: number,
  multiplier: number,
  level: number
): number {
  return Math.floor(baseThreshold * Math.pow(multiplier, level - 1));
}

// -----------------------------------------------------------
// XP-GEWINN PRO METHODE (für entdeckte Skills)
// GDD: Absorb +3 XP, Analyze +1 XP
// -----------------------------------------------------------
export const XP_GAIN: Record<DiscoveryMethod, number> = {
  absorb: 3,
  analyze: 1,
};

// -----------------------------------------------------------
// KERN-FÄHIGKEITS-XP
// Jeder erfolgreiche Einsatz gibt +1 XP zur Kern-Fähigkeit.
// Höheres Level = höhere Erfolgswahrscheinlichkeit gegen stärkere Entities.
// -----------------------------------------------------------
export function gainCoreAbilityXp(
  player: PlayerState,
  method: DiscoveryMethod
): { leveledUp: boolean; newLevel?: number } {
  const ability = player.coreAbilities[method];

  if (ability.level >= CORE_MAX_LEVEL) {
    ability.totalXpEarned += 1;
    return { leveledUp: false };
  }

  ability.currentXp += 1;
  ability.totalXpEarned += 1;

  let leveledUp = false;
  let newLevel: number | undefined;

  while (ability.currentXp >= ability.xpToNextLevel && ability.level < CORE_MAX_LEVEL) {
    ability.currentXp -= ability.xpToNextLevel;
    ability.level += 1;
    ability.xpToNextLevel = calcXpThreshold(
      CORE_BASE_XP,
      CORE_XP_MULTIPLIER,
      ability.level
    );
    leveledUp = true;
    newLevel = ability.level;
  }

  return { leveledUp, newLevel };
}

// -----------------------------------------------------------
// Neue SkillInstance erstellen (bei Erstentdeckung)
// -----------------------------------------------------------
function createSkillInstance(skillId: string): SkillInstance {
  const def = ALL_SKILLS.get(skillId);
  if (!def) throw new Error(`Unbekannte Skill-ID: ${skillId}`);

  return {
    definitionId: skillId,
    level: 1,
    currentXp: 0,
    xpToNextLevel: def.baseXpThreshold,
    discoveredAt: Date.now(),
    totalXpEarned: 0,
  };
}

// -----------------------------------------------------------
// SKILL DISCOVER
// Verarbeitet das Erlernen oder XP-Gewinn eines Skills.
// Gibt Mutations-Daten zurück — ändert den State direkt.
// -----------------------------------------------------------
export function discoverSkill(
  player: PlayerState,
  skillId: string,
  method: DiscoveryMethod
): SkillDiscoveryResult {
  const def = ALL_SKILLS.get(skillId);
  if (!def) throw new Error(`Unbekannte Skill-ID: ${skillId}`);

  const xpGained = XP_GAIN[method];
  const existing = player.discoveredSkills.get(skillId);

  // ERSTENTDECKUNG
  if (!existing) {
    const newInstance = createSkillInstance(skillId);
    player.discoveredSkills.set(skillId, newInstance);
    return {
      skillId,
      method,
      xpGained: 0,
      wasNewDiscovery: true,
      leveledUp: false,
    };
  }

  // BEREITS BEKANNT: XP geben
  if (existing.level >= def.maxLevel) {
    existing.totalXpEarned += xpGained;
    return {
      skillId,
      method,
      xpGained,
      wasNewDiscovery: false,
      leveledUp: false,
    };
  }

  existing.currentXp += xpGained;
  existing.totalXpEarned += xpGained;

  let leveledUp = false;
  let newLevel: number | undefined;

  while (
    existing.currentXp >= existing.xpToNextLevel &&
    existing.level < def.maxLevel
  ) {
    existing.currentXp -= existing.xpToNextLevel;
    existing.level += 1;
    existing.xpToNextLevel = calcXpThreshold(
      def.baseXpThreshold,
      def.xpThresholdMultiplier,
      existing.level
    );
    leveledUp = true;
    newLevel = existing.level;
  }

  return {
    skillId,
    method,
    xpGained,
    wasNewDiscovery: false,
    leveledUp,
    newLevel,
  };
}

// -----------------------------------------------------------
// SKILL COMBINE
// Versucht zwei Skills zu kombinieren.
// -----------------------------------------------------------
export function combineSkills(
  player: PlayerState,
  skillIdA: string,
  skillIdB: string
): CombineResult {
  if (skillIdA === skillIdB) {
    return {
      outcome: "invalid_input",
      message: "Du kannst einen Skill nicht mit sich selbst kombinieren.",
    };
  }

  const defA = ALL_SKILLS.get(skillIdA);
  const defB = ALL_SKILLS.get(skillIdB);

  if (!defA || !defB) {
    return { outcome: "invalid_input", message: "Unbekannter Skill." };
  }

  // Nur basic-Skills dürfen kombiniert werden (nicht core oder combo)
  if (defA.category !== "basic" || defB.category !== "basic") {
    return {
      outcome: "invalid_input",
      message: "Nur Basis-Skills können kombiniert werden.",
    };
  }

  // Rezept suchen (alphabetisch sortiert)
  const [a, b] = [skillIdA, skillIdB].sort();
  const resultId = RECIPE_INDEX.get(`${a}+${b}`);

  if (!resultId) {
    return {
      outcome: "no_recipe",
      message: "Diese Kombination ergibt keinen bekannten Skill.",
    };
  }

  // Bereits bekannt?
  const alreadyKnown = player.discoveredSkills.has(resultId);

  if (alreadyKnown) {
    const xpGained = XP_GAIN["absorb"];
    const instance = player.discoveredSkills.get(resultId)!;
    const resultDef = ALL_SKILLS.get(resultId)!;

    if (instance.level < resultDef.maxLevel) {
      instance.currentXp += xpGained;
      instance.totalXpEarned += xpGained;

      while (
        instance.currentXp >= instance.xpToNextLevel &&
        instance.level < resultDef.maxLevel
      ) {
        instance.currentXp -= instance.xpToNextLevel;
        instance.level += 1;
        instance.xpToNextLevel = calcXpThreshold(
          resultDef.baseXpThreshold,
          resultDef.xpThresholdMultiplier,
          instance.level
        );
      }
    }

    return {
      outcome: "success_xp",
      resultSkillId: resultId,
      xpGained,
      message: `${resultDef.name} bereits bekannt — +${xpGained} XP.`,
    };
  }

  // Neuen Combo-Skill entdecken
  const newInstance = createSkillInstance(resultId);
  player.discoveredSkills.set(resultId, newInstance);
  const resultDef = ALL_SKILLS.get(resultId)!;

  return {
    outcome: "success_new",
    resultSkillId: resultId,
    message: `Neuer Skill entdeckt: ${resultDef.icon} ${resultDef.name}!`,
  };
}

// -----------------------------------------------------------
// PASSIVE SKILLS — Hilfsfunktionen
// -----------------------------------------------------------

/** Gibt alle entdeckten passiven Skills zurück */
export function getPassiveSkills(player: PlayerState): SkillInstance[] {
  const result: SkillInstance[] = [];
  for (const instance of player.discoveredSkills.values()) {
    const def = ALL_SKILLS.get(instance.definitionId);
    if (def?.activation === "passive") result.push(instance);
  }
  return result;
}

// -----------------------------------------------------------
// HILFSFUNKTIONEN für UI
// -----------------------------------------------------------

/** Gibt alle entdeckten Skills sortiert nach Entdeckungszeitpunkt zurück */
export function getDiscoveredSkillsSorted(
  player: PlayerState
): SkillInstance[] {
  return Array.from(player.discoveredSkills.values()).sort(
    (a, b) => a.discoveredAt - b.discoveredAt
  );
}

/** XP-Fortschritt als Prozentwert (0.0 bis 1.0) */
export function getXpProgress(instance: SkillInstance): number {
  if (instance.xpToNextLevel === 0) return 1.0;
  return Math.min(instance.currentXp / instance.xpToNextLevel, 1.0);
}

/** Prüft ob ein Skill den Max-Level erreicht hat */
export function isMaxLevel(instance: SkillInstance): boolean {
  const def = ALL_SKILLS.get(instance.definitionId);
  if (!def) return false;
  return instance.level >= def.maxLevel;
}

/** Skill-Effektivität basierend auf Level */
export function getSkillEffectiveness(level: number): number {
  const baseBonus = (level - 1) * 0.1;
  const tier3Bonus = level >= 3 ? 0.15 : 0;
  return 1.0 + baseBonus + tier3Bonus;
}
