// ============================================================
// GAME STATE TYPES
// Absorb & Evolve — Zentraler Spielzustand
// ============================================================

import type { SkillInstance, SkillProgress } from "./Skill";
import { createSkillProgress } from "./Skill";
import type { EntityInstance } from "./Entity";
import type { StatusEffect } from "./Combat";
import { GAME_VERSION } from "../data/version";

// -----------------------------------------------------------
// CoreAbilityState: Zustand einer Kern-Fähigkeit (Analyze/Absorb)
// Kern-Fähigkeiten sind immer vorhanden und werden nie verlernt — sie
// belegen keine Kapazität (progression.ts Abschnitt 3).
// Ihre Erfahrung bestimmt die Erfolgswahrscheinlichkeit gegen Entitäten.
// -----------------------------------------------------------
export type CoreAbilityState = SkillProgress;

// -----------------------------------------------------------
// PlayerState: Alles was den Blob beschreibt
// -----------------------------------------------------------
export interface PlayerState {
  // Position
  x: number;
  y: number;

  // Vitals (alle in milli-Einheiten: 1 HP = 1000 mHP)
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;

  // Progression — kein Charakter-Level (progression.ts)
  // Lebenserfahrung: alle je gutgeschriebene Erfahrung, auch später verlernte.
  // Bestimmt das Wachstum des Blobs (Größe, HP, MP, Kapazität).
  lifetimeXp: number;

  // Kern-Fähigkeiten — immer vorhanden, werden durch Nutzung besser
  // Erfahrung bestimmt Erfolgswahrscheinlichkeit bei Analyze/Absorb
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
  playtimeSeconds: number;            // Spielzeit — Uhr für Verlernen und Überdehnung
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
// Hilfsfunktion: Neuen leeren GameState erstellen
// -----------------------------------------------------------
export function createInitialGameState(): GameState {
  return {
    version: GAME_VERSION,
    player: {
      x: 400,
      y: 300,
      hp: 80_000,
      maxHp: 80_000,
      mp: 40_000,
      maxMp: 40_000,
      lifetimeXp: 0,
      coreAbilities: {
        analyze: createSkillProgress(Date.now(), 0),
        absorb: createSkillProgress(Date.now(), 0),
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
