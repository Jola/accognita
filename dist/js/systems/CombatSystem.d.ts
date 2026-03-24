import type { PlayerState } from "../types/GameState";
import type { EntityDefinition, EntityInstance } from "../types/Entity";
import type { AttackResult } from "../types/Combat";
export declare function playerAttack(player: PlayerState, targetInst: EntityInstance, skillId?: string): AttackResult;
export declare function entityAttack(def: EntityDefinition, instance: EntityInstance, player: PlayerState): AttackResult;
export declare function canActivateSkill(player: PlayerState, skillId: string): {
    ok: boolean;
    reason?: string;
};
export declare function consumeSkill(player: PlayerState, skillId: string): number;
export declare function calcDashDistance(player: PlayerState, skillId: string): number;
export declare function executeCheckpoint(player: PlayerState): void;
export declare function regenMp(player: PlayerState, deltaMs: number): void;
//# sourceMappingURL=CombatSystem.d.ts.map