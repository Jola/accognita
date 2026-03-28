// ============================================================
// BIOME DEFINITIONS
// Absorb & Evolve — Zonen-Layout und Spawn-Tabellen
//
// Kein Phaser-Import.
// ============================================================
import { BIOME_TILE_OFFSET } from "./TilesetGenerator.js";
export const WORLD_ZONES = [
    { cx: 0, cy: 0, cw: 5, ch: 5, biome: "forest", danger: 1 }, // Startzone
    { cx: 5, cy: 0, cw: 4, ch: 4, biome: "swamp", danger: 2 },
    { cx: 0, cy: 5, cw: 5, ch: 4, biome: "highland", danger: 2 },
    { cx: 5, cy: 5, cw: 5, ch: 5, biome: "mountain", danger: 3 },
    { cx: 10, cy: 2, cw: 3, ch: 6, biome: "desert", danger: 3 },
    { cx: 7, cy: 9, cw: 5, ch: 5, biome: "dungeon", danger: 4 },
];
/** Liefert das Biom für einen Chunk — forest als Fallback */
export function getBiomeAt(cx, cy) {
    for (const zone of WORLD_ZONES) {
        if (cx >= zone.cx && cx < zone.cx + zone.cw &&
            cy >= zone.cy && cy < zone.cy + zone.ch) {
            return zone.biome;
        }
    }
    return "forest"; // Alles ausserhalb: Forest
}
// ────────────────────────────────────────
// Spawn-Tabellen pro Biom
// ────────────────────────────────────────
export const BIOME_SPAWNS = {
    forest: ["ant", "ladybug", "grass"],
    swamp: ["poison_spider", "grass"],
    highland: ["jumping_spider", "ant"],
    mountain: ["jumping_spider", "poison_spider"],
    desert: ["ant"],
    dungeon: ["jumping_spider", "poison_spider"],
};
// ────────────────────────────────────────
// Tile-Index-Berechnung
// ────────────────────────────────────────
/**
 * Berechnet den Tileset-Index aus Biom und Höhe.
 * Layout: [biomeOffset + heightLevel]
 */
export function getTileIndex(biome, height) {
    const offset = BIOME_TILE_OFFSET[biome] ?? 0;
    return offset + Math.min(3, Math.max(0, height));
}
//# sourceMappingURL=BiomeDefinitions.js.map