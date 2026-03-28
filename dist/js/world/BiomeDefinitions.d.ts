import type { BiomeId } from "./Chunk.js";
export interface ZoneDef {
    cx: number;
    cy: number;
    cw: number;
    ch: number;
    biome: BiomeId;
    danger: 1 | 2 | 3 | 4;
}
export declare const WORLD_ZONES: ZoneDef[];
/** Liefert das Biom für einen Chunk — forest als Fallback */
export declare function getBiomeAt(cx: number, cy: number): BiomeId;
export declare const BIOME_SPAWNS: Record<BiomeId, string[]>;
/**
 * Berechnet den Tileset-Index aus Biom und Höhe.
 * Layout: [biomeOffset + heightLevel]
 */
export declare function getTileIndex(biome: BiomeId, height: number): number;
//# sourceMappingURL=BiomeDefinitions.d.ts.map