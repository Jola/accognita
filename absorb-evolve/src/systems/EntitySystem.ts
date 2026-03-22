// ============================================================
// ENTITY SYSTEM
// Absorb & Evolve — Interaktions-Logik mit Entities
// ============================================================

import type { PlayerState, WorldState } from "../types/GameState";
import type { EntityInstance } from "../types/Entity";
import { ENTITY_MAP } from "../data/entities";
import { discoverSkill } from "./SkillSystem";
import type { SkillDiscoveryResult, DiscoveryMethod } from "../types/Skill";

export interface InteractionResult {
  success: boolean;
  method: DiscoveryMethod;
  entityName: string;
  skillResults: SkillDiscoveryResult[];
  message: string;
}

// -----------------------------------------------------------
// ABSORB
// Entity verschwindet, alle skillDrops werden verarbeitet
// -----------------------------------------------------------
export function absorbEntity(
  player: PlayerState,
  world: WorldState,
  instanceId: string
): InteractionResult {
  const instance = world.entities.get(instanceId);
  if (!instance || !instance.isAlive) {
    return {
      success: false,
      method: "absorb",
      entityName: "?",
      skillResults: [],
      message: "Entity nicht verfügbar.",
    };
  }

  const def = ENTITY_MAP.get(instance.definitionId);
  if (!def) {
    return {
      success: false,
      method: "absorb",
      entityName: "?",
      skillResults: [],
      message: "Unbekannte Entity.",
    };
  }

  // Entity entfernen (respawnt später)
  instance.isAlive = false;
  instance.respawnAt = Date.now() + def.respawnTime * 1000;
  player.totalAbsorbs += 1;

  // Alle Skill-Drops verarbeiten
  const skillResults: SkillDiscoveryResult[] = def.skillDrops.map((skillId) =>
    discoverSkill(player, skillId, "absorb")
  );

  return {
    success: true,
    method: "absorb",
    entityName: def.name,
    skillResults,
    message: `${def.icon} ${def.name} absorbiert!`,
  };
}

// -----------------------------------------------------------
// ANALYZE
// Entity bleibt erhalten, schwächere Rewards
// -----------------------------------------------------------
export function analyzeEntity(
  player: PlayerState,
  world: WorldState,
  instanceId: string
): InteractionResult {
  const instance = world.entities.get(instanceId);
  if (!instance || !instance.isAlive) {
    return {
      success: false,
      method: "analyze",
      entityName: "?",
      skillResults: [],
      message: "Entity nicht verfügbar.",
    };
  }

  const def = ENTITY_MAP.get(instance.definitionId);
  if (!def) {
    return {
      success: false,
      method: "analyze",
      entityName: "?",
      skillResults: [],
      message: "Unbekannte Entity.",
    };
  }

  // Entity bleibt — kein Respawn nötig
  player.totalAnalyzes += 1;

  // Alle Skill-Drops mit niedrigerer XP verarbeiten
  const skillResults: SkillDiscoveryResult[] = def.skillDrops.map((skillId) =>
    discoverSkill(player, skillId, "analyze")
  );

  return {
    success: true,
    method: "analyze",
    entityName: def.name,
    skillResults,
    message: `${def.icon} ${def.name} analysiert.`,
  };
}

// -----------------------------------------------------------
// RESPAWN-CHECK
// Soll regelmäßig im Game Loop aufgerufen werden
// -----------------------------------------------------------
export function processRespawns(world: WorldState): string[] {
  const respawned: string[] = [];
  const now = Date.now();

  for (const [id, instance] of world.entities) {
    if (!instance.isAlive && instance.respawnAt && now >= instance.respawnAt) {
      const def = ENTITY_MAP.get(instance.definitionId);
      if (def) {
        instance.isAlive = true;
        instance.respawnAt = undefined;
        instance.currentHp = def.hp;
        respawned.push(id);
      }
    }
  }

  return respawned;
}

// -----------------------------------------------------------
// NEAREST ENTITY — findet nächste interagierbare Entity
// -----------------------------------------------------------
export function findNearestEntity(
  player: PlayerState,
  world: WorldState,
  maxRadius: number = 80
): EntityInstance | null {
  let nearest: EntityInstance | null = null;
  let nearestDist = maxRadius;

  for (const instance of world.entities.values()) {
    if (!instance.isAlive) continue;

    const dx = instance.x - player.x;
    const dy = instance.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = instance;
    }
  }

  return nearest;
}
