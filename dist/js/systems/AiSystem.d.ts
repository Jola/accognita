import type { EntityDefinition, EntityInstance } from "../types/Entity";
import type { AiFrame } from "../types/Combat";
export declare function calcEntityAi(def: EntityDefinition, instance: EntityInstance, playerX: number, playerY: number, now: number): AiFrame;
export declare function tickAttackCooldown(instance: EntityInstance, deltaMs: number): void;
export declare function setAttackCooldown(instance: EntityInstance, def: EntityDefinition): void;
export declare function resetAi(instance: EntityInstance): void;
//# sourceMappingURL=AiSystem.d.ts.map