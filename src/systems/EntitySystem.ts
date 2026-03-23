// ============================================================
// ENTITY SYSTEM
// Absorb & Evolve — Interaktions-Logik mit Entities
//
// Zuständig für:
//   - Erfolgswahrscheinlichkeit von Absorb/Analyze
//   - Fehlschlag-Reaktionen nach Entity-Typ
//   - Skill-Drops (mit Chance-Roll)
//   - Material-Drops (nur bei Absorb)
//   - Kern-Fähigkeits-XP (Analyze- und Absorb-Level)
// ============================================================

import type { PlayerState, WorldState } from "../types/GameState";
import type { EntityInstance, EntityDisposition } from "../types/Entity";
import type { MaterialStack } from "../types/Material";
import { ENTITY_MAP } from "../data/entities";
import { discoverSkill, gainCoreAbilityXp } from "./SkillSystem";
import { addMaterial } from "./MaterialSystem";
import type { SkillDiscoveryResult, DiscoveryMethod } from "../types/Skill";
import { CORE_BASE_XP, CORE_XP_MULTIPLIER, CORE_MAX_LEVEL } from "../types/GameState";

// -----------------------------------------------------------
// ERFOLGS-MECHANIK
// GDD: Erfolgswahrscheinlichkeit = min(1, abilityLevel / entityLevel)
// Bei Gleichstand oder höherem Ability-Level: 100% Erfolg
// -----------------------------------------------------------
export function calcSuccessChance(
  abilityLevel: number,
  entityLevel: number
): number {
  if (abilityLevel >= entityLevel) return 1.0;
  return abilityLevel / entityLevel;
}

// -----------------------------------------------------------
// FEHLSCHLAG-REAKTION
// Bestimmt ob die Entity angreift wenn die Aktion scheitert.
// Leblose Entities (plant, mineral) reagieren nie aggressiv.
// -----------------------------------------------------------
function shouldAggro(
  disposition: EntityDisposition,
  method: DiscoveryMethod,
  category: string
): boolean {
  // Leblose Entitäten: niemals aggressiv
  if (category === "plant" || category === "mineral") return false;

  // Feindliche Wesen greifen immer an
  if (disposition === "hostile") return true;

  // Neutrale Wesen:
  //   Fehlgeschlagenes Absorb   → greifen an
  //   Fehlgeschlagenes Analyze  → bleiben friedlich
  return method === "absorb";
}

// -----------------------------------------------------------
// ANALYSE-MODIFIER für Skill-Drop-Chancen
// Analyze-Chancen werden reduziert (physisch nichts absorbiert)
// -----------------------------------------------------------
const ANALYZE_CHANCE_MODIFIER = 0.7;

// -----------------------------------------------------------
// Ergebnis einer Interaktion (Absorb oder Analyze)
// -----------------------------------------------------------
export interface InteractionResult {
  success: boolean;
  method: DiscoveryMethod;
  entityName: string;
  skillResults: SkillDiscoveryResult[];
  materialResults: MaterialStack[];  // Leer bei Analyze oder Fehlschlag
  aggroTriggered: boolean;           // Entity greift jetzt an
  message: string;
}

// -----------------------------------------------------------
// ABSORB
// Entity verschwindet, Skills und Materialien werden verarbeitet
// -----------------------------------------------------------
export function absorbEntity(
  player: PlayerState,
  world: WorldState,
  instanceId: string
): InteractionResult {
  const instance = world.entities.get(instanceId);
  if (!instance?.isAlive) {
    return failResult("absorb", "?", "Entity nicht verfügbar.", false);
  }

  const def = ENTITY_MAP.get(instance.definitionId);
  if (!def) {
    return failResult("absorb", "?", "Unbekannte Entity.", false);
  }

  // Erfolgs-Check
  const absorbLevel = player.coreAbilities.absorb.level;
  const chance = calcSuccessChance(absorbLevel, def.level);

  if (Math.random() > chance) {
    // FEHLSCHLAG
    player.totalAbsorbFailures += 1;
    const aggro = shouldAggro(def.disposition, "absorb", def.category);
    if (aggro) instance.isAggro = true;

    const failMsg = aggro
      ? `${def.icon} ${def.name} weicht aus und greift an!`
      : `${def.icon} ${def.name}: Absorb fehlgeschlagen.`;

    return failResult("absorb", def.name, failMsg, aggro);
  }

  // ERFOLG — Entity entfernen
  instance.isAlive = false;
  instance.isAggro = false;
  instance.respawnAt = Date.now() + def.respawnTime * 1000;
  player.totalAbsorbs += 1;

  // Kern-Fähigkeit leveln
  gainCoreAbilityXp(player, "absorb");

  // Skill-Drops verarbeiten (mit Chance-Roll)
  const skillResults: SkillDiscoveryResult[] = [];
  for (const drop of def.skillDrops) {
    if (Math.random() <= drop.chance) {
      skillResults.push(discoverSkill(player, drop.skillId, "absorb"));
    }
  }

  // Material-Drops verarbeiten
  const materialResults: MaterialStack[] = [];
  for (const drop of def.materialDrops) {
    if (Math.random() <= drop.chance) {
      const amount =
        drop.amountMin +
        Math.floor(Math.random() * (drop.amountMax - drop.amountMin + 1));
      if (amount > 0) {
        addMaterial(player, drop.materialId, amount);
        materialResults.push({ materialId: drop.materialId, amount });
      }
    }
  }

  return {
    success: true,
    method: "absorb",
    entityName: def.name,
    skillResults,
    materialResults,
    aggroTriggered: false,
    message: `${def.icon} ${def.name} absorbiert!`,
  };
}

// -----------------------------------------------------------
// ANALYZE
// Entity bleibt erhalten — geringere Skill-Drop-Chance, keine Materialien
// -----------------------------------------------------------
export function analyzeEntity(
  player: PlayerState,
  world: WorldState,
  instanceId: string
): InteractionResult {
  const instance = world.entities.get(instanceId);
  if (!instance?.isAlive) {
    return failResult("analyze", "?", "Entity nicht verfügbar.", false);
  }

  const def = ENTITY_MAP.get(instance.definitionId);
  if (!def) {
    return failResult("analyze", "?", "Unbekannte Entity.", false);
  }

  // Erfolgs-Check
  const analyzeLevel = player.coreAbilities.analyze.level;
  const chance = calcSuccessChance(analyzeLevel, def.level);

  if (Math.random() > chance) {
    // FEHLSCHLAG
    player.totalAnalyzeFailures += 1;
    const aggro = shouldAggro(def.disposition, "analyze", def.category);
    if (aggro) instance.isAggro = true;

    const failMsg = aggro
      ? `${def.icon} ${def.name} fühlt sich bedroht und greift an!`
      : `${def.icon} ${def.name}: Analyze fehlgeschlagen — zu weit entfernt auf der Macht-Skala.`;

    return failResult("analyze", def.name, failMsg, aggro);
  }

  // ERFOLG — Entity bleibt
  player.totalAnalyzes += 1;

  // Kern-Fähigkeit leveln
  gainCoreAbilityXp(player, "analyze");

  // Skill-Drops mit reduzierter Chance (Analyze gibt weniger als Absorb)
  const skillResults: SkillDiscoveryResult[] = [];
  for (const drop of def.skillDrops) {
    const modifiedChance = drop.chance * ANALYZE_CHANCE_MODIFIER;
    if (Math.random() <= modifiedChance) {
      skillResults.push(discoverSkill(player, drop.skillId, "analyze"));
    }
  }

  return {
    success: true,
    method: "analyze",
    entityName: def.name,
    skillResults,
    materialResults: [],   // Analyze liefert keine Materialien
    aggroTriggered: false,
    message: `${def.icon} ${def.name} analysiert.`,
  };
}

// -----------------------------------------------------------
// RESPAWN-CHECK — regelmäßig im Game Loop aufrufen
// -----------------------------------------------------------
export function processRespawns(world: WorldState): string[] {
  const respawned: string[] = [];
  const now = Date.now();

  for (const [id, instance] of world.entities) {
    if (!instance.isAlive && instance.respawnAt && now >= instance.respawnAt) {
      const def = ENTITY_MAP.get(instance.definitionId);
      if (def) {
        instance.isAlive = true;
        instance.isAggro = false;
        instance.respawnAt = undefined;
        instance.currentHp = def.hp;
        respawned.push(id);
      }
    }
  }

  return respawned;
}

// -----------------------------------------------------------
// NEAREST ENTITY — findet nächste lebende Entity in Reichweite
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

// -----------------------------------------------------------
// HILFSFUNKTION: Fehlschlag-Ergebnis erstellen
// -----------------------------------------------------------
function failResult(
  method: DiscoveryMethod,
  entityName: string,
  message: string,
  aggroTriggered: boolean
): InteractionResult {
  return {
    success: false,
    method,
    entityName,
    skillResults: [],
    materialResults: [],
    aggroTriggered,
    message,
  };
}

// Re-Export damit GameScene.ts importieren kann
export { CORE_BASE_XP, CORE_XP_MULTIPLIER, CORE_MAX_LEVEL };
