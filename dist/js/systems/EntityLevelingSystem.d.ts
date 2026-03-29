import type { EntityDefinition, EntityInstance } from "../types/Entity";
export declare function canFight(def: EntityDefinition): boolean;
export declare function getEffectiveLevel(def: EntityDefinition, instance: EntityInstance): number;
export declare function getScaledMaxHp(def: EntityDefinition, bonusLevel: number): number;
/** Nahkampf-Basisschaden einer Entity — Priorität: bite > claw > standalone damage. */
export declare function getEntityBaseDamage(def: EntityDefinition): number;
/** Fernkampf-Schaden einer Entity — liest rangedAttackSkillId + level aus skillLevels. */
export declare function getEntityRangedDamage(def: EntityDefinition): number;
export declare function getScaledDamage(def: EntityDefinition, bonusLevel: number): number;
export declare function getScaledSpeed(def: EntityDefinition, bonusLevel: number): number;
export declare function findLevelingPrey(hunter: EntityInstance, hunterDef: EntityDefinition, allEntities: Map<string, EntityInstance>, entityMap: Map<string, EntityDefinition>): EntityInstance | null;
export declare function processEntityVictory(winner: EntityInstance, winnerDef: EntityDefinition): {
    skillLeveledUp: boolean;
    entityLeveledUp: boolean;
};
//# sourceMappingURL=EntityLevelingSystem.d.ts.map