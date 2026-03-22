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
import { ALL_SKILLS, RECIPE_INDEX } from "../data/skills";

// -----------------------------------------------------------
// XP-BERECHNUNG
// GDD: xpNeeded = floor(xpNeeded * 1.5) pro Level
// -----------------------------------------------------------
export function calcXpThreshold(
  baseThreshold: number,
  multiplier: number,
  level: number
): number {
  // Level 1→2 braucht baseThreshold
  // Level 2→3 braucht floor(baseThreshold * 1.5)
  // Level 3→4 braucht floor(baseThreshold * 1.5^2)
  // usw.
  return Math.floor(baseThreshold * Math.pow(multiplier, level - 1));
}

// -----------------------------------------------------------
// XP-GEWINN PRO METHODE
// GDD: Absorb +3 XP, Analyze +1 XP
// -----------------------------------------------------------
export const XP_GAIN: Record<DiscoveryMethod, number> = {
  absorb: 3,
  analyze: 1,
};

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
// Hauptfunktion: Verarbeitet eine Absorb- oder Analyze-Aktion
//
// Gibt Mutation-Daten zurück — ändert den State NICHT selbst.
// Der Aufrufer (Scene) ist für die State-Mutation verantwortlich.
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

  // --- ERSTENTDECKUNG ---
  if (!existing) {
    const newInstance = createSkillInstance(skillId);
    player.discoveredSkills.set(skillId, newInstance);

    return {
      skillId,
      method,
      xpGained: 0,             // Keine XP bei Erstentdeckung
      wasNewDiscovery: true,
      leveledUp: false,
    };
  }

  // --- BEREITS BEKANNT: XP GEBEN ---
  if (existing.level >= def.maxLevel) {
    // Max Level erreicht — trotzdem totalXp zählen
    existing.totalXpEarned += xpGained;
    return {
      skillId,
      method,
      xpGained,
      wasNewDiscovery: false,
      leveledUp: false,
    };
  }

  // XP hinzufügen
  existing.currentXp += xpGained;
  existing.totalXpEarned += xpGained;

  // Level-Up prüfen (kann mehrfach hintereinander eintreten)
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
// Versucht zwei Skills zu kombinieren
// GDD-Regeln:
//   1. Beide IDs müssen verschieden sein
//   2. Combo-Skills dürfen nicht als Input verwendet werden
//   3. Rezept muss existieren
//   4. Wenn bereits bekannt → XP statt neuer Skill
// -----------------------------------------------------------
export function combineSkills(
  player: PlayerState,
  skillIdA: string,
  skillIdB: string
): CombineResult {
  // Regel 1: Nicht gleich
  if (skillIdA === skillIdB) {
    return {
      outcome: "invalid_input",
      message: "Du kannst einen Skill nicht mit sich selbst kombinieren.",
    };
  }

  // Regel 2: Kein Combo-Skill als Input
  const defA = ALL_SKILLS.get(skillIdA);
  const defB = ALL_SKILLS.get(skillIdB);

  if (!defA || !defB) {
    return {
      outcome: "invalid_input",
      message: "Unbekannter Skill.",
    };
  }

  if (defA.category === "combo" || defB.category === "combo") {
    return {
      outcome: "invalid_input",
      message: "Kombinierte Skills können nicht weiter kombiniert werden.",
    };
  }

  // Regel 3: Rezept suchen (alphabetisch sortiert)
  const [a, b] = [skillIdA, skillIdB].sort();
  const recipeKey = `${a}+${b}`;
  const resultId = RECIPE_INDEX.get(recipeKey);

  if (!resultId) {
    return {
      outcome: "no_recipe",
      message: "Diese Kombination ergibt keinen bekannten Skill.",
    };
  }

  // Regel 4: Bereits bekannt?
  const alreadyKnown = player.discoveredSkills.has(resultId);

  if (alreadyKnown) {
    // XP für den bereits bekannten Combo-Skill vergeben
    const xpGained = XP_GAIN["absorb"]; // Kombination = Absorb-XP
    const instance = player.discoveredSkills.get(resultId)!;
    const resultDef = ALL_SKILLS.get(resultId)!;

    if (instance.level < resultDef.maxLevel) {
      instance.currentXp += xpGained;
      instance.totalXpEarned += xpGained;

      // Level-Up prüfen
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
      message: `${resultDef.name} ist bereits bekannt — du erhältst ${xpGained} XP.`,
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
// SKILL EFFECTIVENESS (für Kampfsystem, v0.2)
// GDD: Level 3 = +25% Effektivität
// Formel: 1.0 + (level - 1) * 0.1 + (level >= 3 ? 0.15 : 0)
// -----------------------------------------------------------
export function getSkillEffectiveness(level: number): number {
  const baseBonus = (level - 1) * 0.1;
  const tier3Bonus = level >= 3 ? 0.15 : 0;
  return 1.0 + baseBonus + tier3Bonus;
}

// -----------------------------------------------------------
// HILFSFUNKTIONEN für UI
// -----------------------------------------------------------

/** Gibt alle entdeckten Skills als Array zurück, sortiert nach Entdeckungszeitpunkt */
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
