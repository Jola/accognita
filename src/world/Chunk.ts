// ============================================================
// CHUNK TYPES
// Absorb & Evolve — Datenstrukturen für das Chunk-System
//
// Kein Phaser-Import — reine TypeScript-Typen.
// ============================================================

export type BiomeId = "forest" | "swamp" | "highland" | "mountain" | "desert" | "dungeon";
export type HeightLevel = 0 | 1 | 2 | 3;

// ────────────────────────────────────────
// Chunk-Konstanten
// ────────────────────────────────────────

export const TILE_PX       = 32;
export const TILES_PER_CHUNK = 32;
export const CHUNK_PX      = TILE_PX * TILES_PER_CHUNK;  // 1024

export const RENDER_RADIUS = 2;   // 5×5 Chunks gerendert
export const ACTIVE_RADIUS = 1;   // 3×3 Chunks KI-aktiv
export const UNLOAD_RADIUS = 3;   // Chunks weiter als 3 Chunks entladen

export const WORLD_CHUNKS_X = 20; // 20480px Welt-Breite
export const WORLD_CHUNKS_Y = 20; // 20480px Welt-Höhe

export const CHUNK_TICK_MS  = 500; // Wie oft ChunkManager.tick() arbeitet

// ────────────────────────────────────────
// Typen
// ────────────────────────────────────────

export interface SpawnDef {
  defId: string;      // Entity-Definitions-ID
  localX: number;     // Position relativ zum Chunk-Ursprung (px)
  localY: number;
}

export interface ChunkDef {
  cx: number;         // Chunk-Koordinaten (nicht Pixel)
  cy: number;
  biome: BiomeId;
  tileIndices: number[][];  // [row][col] → Phaser-Tileset-Index
  heightMap: HeightLevel[][]; // [row][col] → Höhe (für Spiellogik)
  spawns: SpawnDef[];
}

/** Geladener Chunk: enthält Laufzeit-Zustand (Phaser-Objekte als any) */
export interface LoadedChunk {
  def: ChunkDef;
  tilemap: any;           // Phaser.Tilemaps.Tilemap
  tilemapLayer: any;      // Phaser.Tilemaps.TilemapLayer
  instanceIds: string[];  // EntityInstance-IDs die zu diesem Chunk gehören
  loadedAt: number;       // Timestamp für Debugging
}

/** Schlüssel für Chunk-Maps: "cx,cy" */
export function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}
