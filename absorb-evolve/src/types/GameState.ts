// ============================================================
// GAME STATE TYPES
// Absorb & Evolve — Zentraler Spielzustand
// ============================================================

import type { SkillInstance } from "./Skill";
import type { EntityInstance } from "./Entity";

// -----------------------------------------------------------
// PlayerState: Alles was den Slime beschreibt
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

  // Skills
  discoveredSkills: Map<string, SkillInstance>; // skillId → Instance
  activeSkillSlots: (string | null)[];          // 5 Slots, null = leer

  // Statistiken
  totalAbsorbs: number;
  totalAnalyzes: number;
  playtimeSeconds: number;
}

// -----------------------------------------------------------
// WorldState: Zustand der Spielwelt
// -----------------------------------------------------------
export interface WorldState {
  entities: Map<string, EntityInstance>; // instanceId → Instance
  currentZone: string;
  timeElapsed: number;
}

// -----------------------------------------------------------
// GameState: Der komplette Spielzustand
// Dieser Zustand kann gespeichert und geladen werden (v0.2)
// -----------------------------------------------------------
export interface GameState {
  player: PlayerState;
  world: WorldState;
  version: string;               // Für zukünftige Migration
  savedAt?: number;              // Timestamp letzter Speicherung
}

// -----------------------------------------------------------
// Hilfsfunktion: Neuen leeren GameState erstellen
// -----------------------------------------------------------
export function createInitialGameState(): GameState {
  return {
    version: "0.2.0",
    player: {
      x: 400,
      y: 300,
      hp: 80,
      maxHp: 80,
      mp: 40,
      maxMp: 40,
      level: 1,
      totalExp: 0,
      discoveredSkills: new Map(),
      activeSkillSlots: [null, null, null, null, null],
      totalAbsorbs: 0,
      totalAnalyzes: 0,
      playtimeSeconds: 0,
    },
    world: {
      entities: new Map(),
      currentZone: "forest_start",
      timeElapsed: 0,
    },
  };
}
