import type { MaterialStack } from "./Material";
import type { AttackType } from "./Combat";
export type ElementType = "fire" | "water" | "earth" | "wind" | "slime" | "poison" | "dark" | "light" | "nature" | "none";
export type SkillCategory = "core" | "basic" | "combo";
export type SkillActivation = "active" | "passive";
export interface SkillDefinition {
    id: string;
    name: string;
    element: ElementType;
    icon: string;
    category: SkillCategory;
    activation: SkillActivation;
    maxLevel: number;
    baseXpThreshold: number;
    xpThresholdMultiplier: number;
    description: string;
    baseDamage?: number;
    mpCost?: number;
    cooldownMs?: number;
    attackType?: AttackType;
    materialCost?: MaterialStack[];
    recipe?: [string, string];
}
export interface SkillInstance {
    definitionId: string;
    level: number;
    currentXp: number;
    xpToNextLevel: number;
    discoveredAt: number;
    totalXpEarned: number;
    isEnabled: boolean;
}
export type DiscoveryMethod = "absorb" | "analyze";
export interface SkillDiscoveryResult {
    skillId: string;
    method: DiscoveryMethod;
    xpGained: number;
    wasNewDiscovery: boolean;
    leveledUp: boolean;
    newLevel?: number;
}
export type CombineOutcome = "success_new" | "success_xp" | "no_recipe" | "invalid_input";
export interface CombineResult {
    outcome: CombineOutcome;
    resultSkillId?: string;
    xpGained?: number;
    message: string;
}
//# sourceMappingURL=Skill.d.ts.map