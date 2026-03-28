import type { SkillInstance } from "./Skill";
import type { EntityInstance } from "./Entity";
import type { StatusEffect } from "./Combat";
export interface CoreAbilityState {
    level: number;
    currentXp: number;
    xpToNextLevel: number;
    totalXpEarned: number;
}
export interface PlayerState {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    level: number;
    totalExp: number;
    coreAbilities: {
        analyze: CoreAbilityState;
        absorb: CoreAbilityState;
    };
    discoveredSkills: Map<string, SkillInstance>;
    activeSkillSlots: (string | null)[];
    materials: Map<string, number>;
    statusEffects: StatusEffect[];
    skillCooldowns: Map<string, number>;
    spawnX: number;
    spawnY: number;
    totalAbsorbs: number;
    totalAbsorbFailures: number;
    totalAnalyzes: number;
    totalAnalyzeFailures: number;
    playtimeSeconds: number;
}
export interface WorldState {
    entities: Map<string, EntityInstance>;
    currentZone: string;
    timeElapsed: number;
    worldSeed: number;
}
export interface GameState {
    player: PlayerState;
    world: WorldState;
    version: string;
    savedAt?: number;
}
declare const CORE_BASE_XP = 10;
declare const CORE_XP_MULTIPLIER = 1.5;
declare const CORE_MAX_LEVEL = 20;
export { CORE_BASE_XP, CORE_XP_MULTIPLIER, CORE_MAX_LEVEL };
export declare function createInitialGameState(): GameState;
//# sourceMappingURL=GameState.d.ts.map