import type { PlayerState } from "../types/GameState";
export declare const NUM_SAVE_SLOTS = 3;
export interface SaveMeta {
    slot: number;
    version: number;
    savedAt: number;
    playerLevel: number;
    hp: number;
    maxHp: number;
    skillCount: number;
    playtimeSeconds: number;
    skillBarSlots: (string | null)[];
}
export declare function saveToSlot(slot: number, player: PlayerState, skillBarSlots?: (string | null)[]): SaveMeta;
export declare function loadFromSlot(slot: number): {
    player: PlayerState;
    meta: SaveMeta;
} | null;
export declare function getSlotMeta(slot: number): SaveMeta | null;
export declare function getAllSlotMetas(): (SaveMeta | null)[];
export declare function deleteSlot(slot: number): void;
export declare function deleteAllSaves(): void;
export declare function formatPlaytime(seconds: number): string;
//# sourceMappingURL=SaveSystem.d.ts.map