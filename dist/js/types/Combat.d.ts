export type AttackType = "melee" | "ranged_projectile" | "magic_aoe" | "magic_self" | "dash";
export type StatusEffectType = "dot" | "hot" | "stat_mod" | "aura";
export interface StatusEffect {
    id: string;
    type: StatusEffectType;
    sourceSkillId?: string;
    durationMs: number;
    expiresAt: number;
    tickIntervalMs: number;
    lastTickAt: number;
    damagePerTick: number;
    healPerTick: number;
    speedMultiplier: number;
    damageReduction: number;
    reflectDamage: number;
    damageBonus: number;
    damageMult: number;
}
export declare function makeStatusEffect(base: Pick<StatusEffect, "id" | "type"> & Partial<Omit<StatusEffect, "id" | "type">>): StatusEffect;
export interface ProjectileData {
    x: number;
    y: number;
    dx: number;
    dy: number;
    skillId: string;
    speedPx: number;
    rangePx: number;
}
export interface AttackResult {
    hit: boolean;
    damageDealt: number;
    statusApplied: StatusEffect[];
    projectile?: ProjectileData;
    message: string;
}
export interface AiFrame {
    vx: number;
    vy: number;
    wantToAttack: boolean;
    wantToRangedAttack: boolean;
    becameAggro: boolean;
    lostAggro: boolean;
}
//# sourceMappingURL=Combat.d.ts.map