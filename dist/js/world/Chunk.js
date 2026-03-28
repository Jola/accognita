// ============================================================
// CHUNK TYPES
// Absorb & Evolve — Datenstrukturen für das Chunk-System
//
// Kein Phaser-Import — reine TypeScript-Typen.
// ============================================================
// ────────────────────────────────────────
// Chunk-Konstanten
// ────────────────────────────────────────
export const TILE_PX = 32;
export const TILES_PER_CHUNK = 32;
export const CHUNK_PX = TILE_PX * TILES_PER_CHUNK; // 1024
export const RENDER_RADIUS = 2; // 5×5 Chunks gerendert
export const ACTIVE_RADIUS = 1; // 3×3 Chunks KI-aktiv
export const UNLOAD_RADIUS = 3; // Chunks weiter als 3 Chunks entladen
export const WORLD_CHUNKS_X = 20; // 20480px Welt-Breite
export const WORLD_CHUNKS_Y = 20; // 20480px Welt-Höhe
export const CHUNK_TICK_MS = 500; // Wie oft ChunkManager.tick() arbeitet
/** Schlüssel für Chunk-Maps: "cx,cy" */
export function chunkKey(cx, cy) {
    return `${cx},${cy}`;
}
//# sourceMappingURL=Chunk.js.map