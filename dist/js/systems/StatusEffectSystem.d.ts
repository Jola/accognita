import type { PlayerState } from "../types/GameState";
import type { StatusEffect } from "../types/Combat";
export declare function processTicks(target: {
    statusEffects: StatusEffect[];
    hp: number;
    maxHp: number;
}, now: number): number;
export declare function triggerAuras(target: {
    statusEffects: StatusEffect[];
}): number;
export declare function applyEffect(target: {
    statusEffects: StatusEffect[];
}, effect: StatusEffect): void;
export declare function removeExpiredEffects(target: {
    statusEffects: StatusEffect[];
}, now: number): void;
export declare function clearAllEffects(target: {
    statusEffects: StatusEffect[];
}): void;
export declare function syncPassiveEffects(player: PlayerState): void;
/** Gesamte Schadensreduktion durch alle aktiven stat_mod-Effekte (0.0–1.0) */
export declare function calcDamageReduction(effects: StatusEffect[]): number;
/** Multiplikator für ausgehenden Schaden (Superstrength etc.) */
export declare function calcDamageMult(effects: StatusEffect[]): number;
/** Geschwindigkeits-Multiplikator durch Slow-Effekte etc. */
export declare function calcSpeedMultiplier(effects: StatusEffect[]): number;
export declare function makeVenomEffect(venomLevel: number): StatusEffect;
//# sourceMappingURL=StatusEffectSystem.d.ts.map