export type BiomeId = "forest" | "swamp" | "highland" | "mountain" | "desert" | "dungeon";
export type HeightLevel = 0 | 1 | 2 | 3;
export declare const TILE_PX = 32;
export declare const TILES_PER_CHUNK = 32;
export declare const CHUNK_PX: number;
export declare const RENDER_RADIUS = 2;
export declare const ACTIVE_RADIUS = 1;
export declare const UNLOAD_RADIUS = 3;
export declare const WORLD_CHUNKS_X = 20;
export declare const WORLD_CHUNKS_Y = 20;
export declare const CHUNK_TICK_MS = 500;
export interface SpawnDef {
    defId: string;
    localX: number;
    localY: number;
}
export interface ChunkDef {
    cx: number;
    cy: number;
    biome: BiomeId;
    tileIndices: number[][];
    heightMap: HeightLevel[][];
    spawns: SpawnDef[];
}
/** Geladener Chunk: enthält Laufzeit-Zustand (Phaser-Objekte als any) */
export interface LoadedChunk {
    def: ChunkDef;
    tilemap: any;
    tilemapLayer: any;
    instanceIds: string[];
    loadedAt: number;
}
/** Schlüssel für Chunk-Maps: "cx,cy" */
export declare function chunkKey(cx: number, cy: number): string;
//# sourceMappingURL=Chunk.d.ts.map