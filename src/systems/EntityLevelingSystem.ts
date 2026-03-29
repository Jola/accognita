// ============================================================
// ENTITY LEVELING SYSTEM
// Absorb & Evolve — Kreaturen kämpfen untereinander und leveln auf
//
// Mechanik:
//   - Kreaturen mit Kampfwerten greifen schwächere Kreaturen an
//   - Beute muss 1–3 Level niedriger sein (effektives Level)
//   - Sieg → skillWins++ (Skill-Level-Up visuell)
//   - Alle 3 Siege → bonusLevel++ (Entity-Level-Up, max 3)
//   - Kampfwerte (HP, Schaden, Speed) skalieren mit bonusLevel
//
// Keine Phaser-Abhängigkeit. Kein Rendering.
// ============================================================

import type { EntityDefinition, EntityInstance } from "../types/Entity";
import { ALL_SKILLS } from "../data/skills";
import { getSkillEffectiveness } from "./SkillSystem";

// -----------------------------------------------------------
// Konstanten
// -----------------------------------------------------------
const MAX_BONUS_LEVEL    = 3;
const SKILL_WINS_PER_LVL = 3;    // Siege bis zum nächsten bonusLevel
const HUNT_RADIUS_PX     = 300;  // Suchradius für Beute (px)
const STAT_SCALE         = 1.25; // Kampfwert-Faktor pro bonusLevel

// -----------------------------------------------------------
// Effektives Level (Basislevel + Bonuslevel)
// -----------------------------------------------------------
export function getEffectiveLevel(
  def: EntityDefinition,
  instance: EntityInstance
): number {
  return def.level + (instance.bonusLevel ?? 0);
}

// -----------------------------------------------------------
// Skalierte Kampfwerte basierend auf bonusLevel
// -----------------------------------------------------------
export function getScaledMaxHp(def: EntityDefinition, bonusLevel: number): number {
  return Math.round((def.hp ?? 1) * Math.pow(STAT_SCALE, bonusLevel));
}

/** Basisschaden einer Entity — aus bite-Skill-Level oder standalone damage. */
export function getEntityBaseDamage(def: EntityDefinition): number {
  const biteLevel = def.skillLevels?.["bite"];
  if (biteLevel !== undefined) {
    const biteDef = ALL_SKILLS.get("bite");
    return Math.max(1, Math.round((biteDef?.baseDamage ?? 7) * getSkillEffectiveness(biteLevel)));
  }
  return def.damage ?? 1;
}

export function getScaledDamage(def: EntityDefinition, bonusLevel: number): number {
  return Math.max(1, Math.round(getEntityBaseDamage(def) * Math.pow(STAT_SCALE, bonusLevel)));
}

export function getScaledSpeed(def: EntityDefinition, bonusLevel: number): number {
  return Math.round((def.speed ?? 60) * Math.pow(STAT_SCALE, bonusLevel));
}

// -----------------------------------------------------------
// Beute suchen
//
// Gibt die nächste lebende Kreatur zurück, die 1–3 Level niedriger ist.
// Nur Kreaturen mit Kampfwerten (damage definiert) kommen in Frage.
// -----------------------------------------------------------
export function findLevelingPrey(
  hunter: EntityInstance,
  hunterDef: EntityDefinition,
  allEntities: Map<string, EntityInstance>,
  entityMap: Map<string, EntityDefinition>
): EntityInstance | null {
  const hunterLevel    = getEffectiveLevel(hunterDef, hunter);
  const huntRadiusSq   = HUNT_RADIUS_PX * HUNT_RADIUS_PX;

  let best: EntityInstance | null = null;
  let bestDistSq = Infinity;

  for (const candidate of allEntities.values()) {
    if (candidate.instanceId === hunter.instanceId) continue;
    if (!candidate.isAlive) continue;

    const candidateDef = entityMap.get(candidate.definitionId);
    if (!candidateDef || candidateDef.category !== "creature") continue;
    if (!candidateDef.damage) continue;

    const levelDiff = hunterLevel - getEffectiveLevel(candidateDef, candidate);
    if (levelDiff < 1 || levelDiff > 3) continue;

    const dx = candidate.x - hunter.x;
    const dy = candidate.y - hunter.y;
    const distSq = dx * dx + dy * dy;

    if (distSq <= huntRadiusSq && distSq < bestDistSq) {
      best      = candidate;
      bestDistSq = distSq;
    }
  }

  return best;
}

// -----------------------------------------------------------
// Sieg verarbeiten
//
// skillWins++ → bei 3 Siegen: bonusLevel++, HP auf neues Maximum.
// Gibt zurück ob Skill- und/oder Entity-Level gestiegen sind.
// -----------------------------------------------------------
export function processEntityVictory(
  winner: EntityInstance,
  winnerDef: EntityDefinition
): { skillLeveledUp: boolean; entityLeveledUp: boolean } {
  const currentBonus = winner.bonusLevel ?? 0;
  if (currentBonus >= MAX_BONUS_LEVEL) {
    return { skillLeveledUp: false, entityLeveledUp: false };
  }

  winner.skillWins = (winner.skillWins ?? 0) + 1;

  if ((winner.skillWins ?? 0) >= SKILL_WINS_PER_LVL) {
    winner.skillWins  = 0;
    winner.bonusLevel = currentBonus + 1;
    // HP vollständig auf neues Maximum setzen
    winner.currentHp  = getScaledMaxHp(winnerDef, winner.bonusLevel);
    return { skillLeveledUp: true, entityLeveledUp: true };
  }

  return { skillLeveledUp: true, entityLeveledUp: false };
}
