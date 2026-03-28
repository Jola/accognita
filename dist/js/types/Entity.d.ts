import type { MaterialDrop } from "./Material";
import type { StatusEffect } from "./Combat";
export type EntityBehavior = "passive" | "defensive" | "aggressive" | "territorial" | "rare";
export type EntityDisposition = "neutral" | "hostile";
export type EntityCategory = "creature" | "plant" | "mineral";
export type EntityRarity = "common" | "uncommon" | "rare" | "legendary";
export interface SkillDrop {
    skillId: string;
    chance: number;
}
export interface EntityDefinition {
    id: string;
    name: string;
    icon: string;
    behavior: EntityBehavior;
    disposition: EntityDisposition;
    category: EntityCategory;
    rarity: EntityRarity;
    level: number;
    skillDrops: SkillDrop[];
    materialDrops: MaterialDrop[];
    hp?: number;
    damage?: number;
    speed?: number;
    attackRangePx?: number;
    attackCooldownMs?: number;
    attackType?: "melee" | "ranged" | "charge";
    respawnTime: number;
    interactRadius: number;
    aggroRadius?: number;
}
export interface EntityInstance {
    instanceId: string;
    definitionId: string;
    x: number;
    y: number;
    currentHp: number;
    isAlive: boolean;
    respawnAt?: number;
    isAggro: boolean;
    statusEffects: StatusEffect[];
    attackCooldownRemaining: number;
    chunkKey?: string;
}
//# sourceMappingURL=Entity.d.ts.map