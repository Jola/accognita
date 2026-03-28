// ============================================================
// WORLD GENERATOR
// Absorb & Evolve — Deterministiche Chunk-Generierung
//
// Kein Phaser-Import.
// generateChunk(cx, cy, worldSeed) → ChunkDef (immer gleich für gleiche Inputs)
// ============================================================
import { TILES_PER_CHUNK, CHUNK_PX } from "./Chunk.js";
import { getBiomeAt, BIOME_SPAWNS, getTileIndex } from "./BiomeDefinitions.js";
// ────────────────────────────────────────
// Deterministisches seeded LCG
// ────────────────────────────────────────
function chunkSeed(cx, cy, worldSeed) {
    return ((cx * 73856093) ^ (cy * 19349663) ^ worldSeed) >>> 0;
}
function makeLCG(seed) {
    let s = seed >>> 0;
    return () => {
        s = ((s * 1664525 + 1013904223) & 0xffffffff) >>> 0;
        return s / 0xffffffff;
    };
}
// ────────────────────────────────────────
// Height-Map-Generierung
// ────────────────────────────────────────
/**
 * Generiert eine Höhenverteilung für einen Chunk.
 * Verteilung: 15% h0 (Wasser), 40% h1, 35% h2, 10% h3
 *
 * Verwendet einen Rausch-Ansatz mit mehreren LCG-Wellen für
 * organischere, zusammenhängende Geländeformen.
 */
function generateHeightMap(rng) {
    const map = [];
    // Grobe Schichten: 4×4 Blöcke mit Basis-Höhe
    const coarse = [];
    const coarseSize = Math.ceil(TILES_PER_CHUNK / 4);
    for (let cy = 0; cy < coarseSize; cy++) {
        coarse.push([]);
        for (let cx2 = 0; cx2 < coarseSize; cx2++) {
            const r = rng();
            let h;
            if (r < 0.15)
                h = 0;
            else if (r < 0.55)
                h = 1;
            else if (r < 0.90)
                h = 2;
            else
                h = 3;
            coarse[cy].push(h);
        }
    }
    for (let row = 0; row < TILES_PER_CHUNK; row++) {
        map.push([]);
        for (let col = 0; col < TILES_PER_CHUNK; col++) {
            // Basis-Höhe aus dem groben Raster
            const coarseH = coarse[Math.floor(row / 4)][Math.floor(col / 4)];
            // Kleine Variation per Tile (±1 Schritt, selten)
            const nudge = rng();
            let h = coarseH;
            if (nudge > 0.85 && h < 3)
                h++;
            else if (nudge < 0.08 && h > 0)
                h--;
            map[row].push(h);
        }
    }
    return map;
}
// ────────────────────────────────────────
// Spawn-Generierung
// ────────────────────────────────────────
/** ~16–28 Spawns pro Chunk, zufällig verteilt */
function generateSpawns(biome, rng) {
    const spawnTable = BIOME_SPAWNS[biome] ?? ["grass"];
    const count = 32 + Math.floor(rng() * 25); // 32–56
    const spawns = [];
    for (let i = 0; i < count; i++) {
        const defId = spawnTable[Math.floor(rng() * spawnTable.length)];
        // Position: nicht zu nah am Chunk-Rand (mindestens 48px Abstand)
        const localX = 48 + (rng() * (CHUNK_PX - 96)) | 0;
        const localY = 48 + (rng() * (CHUNK_PX - 96)) | 0;
        spawns.push({ defId, localX, localY });
    }
    return spawns;
}
// ────────────────────────────────────────
// Haupt-Export
// ────────────────────────────────────────
/**
 * Generiert einen ChunkDef deterministisch.
 * Gleiche cx/cy/worldSeed → immer identisches Ergebnis.
 */
export function generateChunk(cx, cy, worldSeed) {
    const seed = chunkSeed(cx, cy, worldSeed);
    const rng = makeLCG(seed);
    const biome = getBiomeAt(cx, cy);
    const heightMap = generateHeightMap(rng);
    // Tile-Indices aus Biom + Höhe
    const tileIndices = heightMap.map((row) => row.map((h) => getTileIndex(biome, h)));
    const spawns = generateSpawns(biome, rng);
    return { cx, cy, biome, tileIndices, heightMap, spawns };
}
//# sourceMappingURL=WorldGenerator.js.map