import type { GameState } from "../types/GameState.js";
import type { EntityInstance } from "../types/Entity.js";
export declare class ChunkManager {
    private scene;
    private gameState;
    private loadedChunks;
    /** Callback zum Erstellen eines Entity-Sprites (liefert das Sprite zurück) */
    private createEntitySprite;
    /** Callback zum Entfernen eines Entity-Sprites */
    private removeEntitySprite;
    /** Dead entity cache: chunkKey → Liste toter Entities mit respawnAt */
    private deadCache;
    private lastTickTime;
    private lastCx;
    private lastCy;
    constructor(scene: any, gameState: GameState, createEntitySprite: (instance: EntityInstance) => any, removeEntitySprite: (instanceId: string) => void);
    /**
     * Aufzurufen in GameScene.update().
     * Prüft alle CHUNK_TICK_MS ob Chunks geladen/entladen werden müssen.
     */
    tick(px: number, py: number, now: number): void;
    /**
     * Welche Chunks sollen jetzt KI-simuliert werden?
     * Gibt alle instanceIds in ACTIVE_RADIUS-Chunks zurück.
     */
    getActiveEntityIds(): Set<string>;
    isChunkLoaded(cx: number, cy: number): boolean;
    private updateChunks;
    private loadChunk;
    private unloadChunk;
}
//# sourceMappingURL=ChunkManager.d.ts.map