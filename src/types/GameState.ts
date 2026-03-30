// ============================================================
// GAME STATE TYPES
// Absorb & Evolve — Zentraler Spielzustand
// ============================================================

import type { SkillInstance } from "./Skill";
import type { EntityInstance } from "./Entity";
import type { StatusEffect } from "./Combat";

// -----------------------------------------------------------
// CoreAbilityState: Zustand einer Kern-Fähigkeit (Analyze/Absorb)
// Kern-Fähigkeiten sind immer vorhanden und werden nie "verloren".
// Ihr Level bestimmt die Erfolgswahrscheinlichkeit gegen Entitäten.
// -----------------------------------------------------------
export interface CoreAbilityState {
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  totalXpEarned: number;
}

// -----------------------------------------------------------
// PlayerState: Alles was den Blob beschreibt
// -----------------------------------------------------------
export interface PlayerState {
  // Position
  x: number;
  y: number;

  // Vitals
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;

  // Progression
  level: number;
  totalExp: number;

  // Kern-Fähigkeiten — immer vorhanden, levelbar durch Nutzung
  // Level bestimmt Erfolgswahrscheinlichkeit bei Analyze/Absorb
  coreAbilities: {
    analyze: CoreAbilityState;
    absorb: CoreAbilityState;
  };

  // Entdeckte Skills (basic + combo)
  discoveredSkills: Map<string, SkillInstance>;   // skillId → Instance
  activeSkillSlots: (string | null)[];            // 5 Slots, null = leer

  // Materialien-Inventar (materialId → Menge)
  materials: Map<string, number>;

  // Kampfzustand (v0.3)
  statusEffects: StatusEffect[];        // Aktive Effekte auf dem Spieler
  skillCooldowns: Map<string, number>;  // skillId → expiresAt-Timestamp (ms)
  spawnX: number;                       // Respawn-Punkt X (Checkpoint)
  spawnY: number;                       // Respawn-Punkt Y (Checkpoint)

  // Statistiken
  totalAbsorbs: number;
  totalAbsorbFailures: number;
  totalAnalyzes: number;
  totalAnalyzeFailures: number;
  playtimeSeconds: number;
}

// -----------------------------------------------------------
// WorldState: Zustand der Spielwelt
// -----------------------------------------------------------
export interface WorldState {
  entities: Map<string, EntityInstance>;  // instanceId → Instance
  currentZone: string;
  timeElapsed: number;
  worldSeed: number;  // Seed für deterministiche Chunk-Generierung
}

// -----------------------------------------------------------
// GameState: Der komplette Spielzustand
// -----------------------------------------------------------
export interface GameState {
  player: PlayerState;
  world: WorldState;
  version: string;
  savedAt?: number;
}

// -----------------------------------------------------------
// Startwerte für Kern-Fähigkeiten
// -----------------------------------------------------------
const CORE_BASE_XP = 10;
const CORE_XP_MULTIPLIER = 1.5;
const CORE_MAX_LEVEL = 20;

function createCoreAbility(): CoreAbilityState {
  return {
    level: 1,
    currentXp: 0,
    xpToNextLevel: CORE_BASE_XP,
    totalXpEarned: 0,
  };
}

export { CORE_BASE_XP, CORE_XP_MULTIPLIER, CORE_MAX_LEVEL };

// -----------------------------------------------------------
// Hilfsfunktion: Neuen leeren GameState erstellen
// -----------------------------------------------------------
export function createInitialGameState(): GameState {
  return {
    version: "0.3.0",
    player: {
      x: 400,
      y: 300,
      hp: 80,
      maxHp: 80,
      mp: 40,
      maxMp: 40,
      level: 1,
      totalExp: 0,
      coreAbilities: {
        analyze: createCoreAbility(),
        absorb: createCoreAbility(),
      },
      discoveredSkills: new Map(),
      activeSkillSlots: [null, null, null, null, null],
      materials: new Map(),
      statusEffects: [],
      skillCooldowns: new Map(),
      spawnX: 400,
      spawnY: 300,
      totalAbsorbs: 0,
      totalAbsorbFailures: 0,
      totalAnalyzes: 0,
      totalAnalyzeFailures: 0,
      playtimeSeconds: 0,
    },
    world: {
      entities: new Map(),
      currentZone: "forest_start",
      timeElapsed: 0,
      worldSeed: 20250328,
    },
  };
}
