// ============================================================
// BIOME DEFINITIONS
// Absorb & Evolve — Zonen-Layout und Spawn-Tabellen
//
// Kein Phaser-Import.
// ============================================================

import type { BiomeId } from "./Chunk.js";
import { BIOME_TILE_OFFSET } from "./TilesetGenerator.js";

// ────────────────────────────────────────
// Zonen-Layout (Authored, in Chunk-Koordinaten)
// ────────────────────────────────────────

export interface ZoneDef {
  cx: number; cy: number;   // Start-Chunk (oben links)
  cw: number; ch: number;   // Breite/Höhe in Chunks
  biome: BiomeId;
  danger: 1 | 2 | 3 | 4;   // Schwierigkeitsgrad
}

export const WORLD_ZONES: ZoneDef[] = [
  { cx:  0, cy:  0, cw: 5, ch: 5, biome: "forest",   danger: 1 }, // Startzone
  { cx:  5, cy:  0, cw: 4, ch: 4, biome: "swamp",    danger: 2 },
  { cx:  0, cy:  5, cw: 5, ch: 4, biome: "highland", danger: 2 },
  { cx:  5, cy:  5, cw: 5, ch: 5, biome: "mountain", danger: 3 },
  { cx: 10, cy:  2, cw: 3, ch: 6, biome: "desert",   danger: 3 },
  { cx:  7, cy:  9, cw: 5, ch: 5, biome: "dungeon",  danger: 4 },
];

/** Liefert das Biom für einen Chunk — forest als Fallback */
export function getBiomeAt(cx: number, cy: number): BiomeId {
  for (const zone of WORLD_ZONES) {
    if (
      cx >= zone.cx && cx < zone.cx + zone.cw &&
      cy >= zone.cy && cy < zone.cy + zone.ch
    ) {
      return zone.biome;
    }
  }
  return "forest"; // Alles ausserhalb: Forest
}

// ────────────────────────────────────────
// Spawn-Tabellen pro Biom (gewichtet)
//
// weight: relative Spawn-Wahrscheinlichkeit.
// Höheres weight = häufiger. Niedrig-level Biome haben keine seltenen Einträge.
// ────────────────────────────────────────

export interface BiomeSpawnEntry {
  id: string;
  weight: number;
}

export const BIOME_SPAWNS: Record<BiomeId, BiomeSpawnEntry[]> = {
  forest:   [
    { id: "ant",     weight: 10 },
    { id: "ladybug", weight: 10 },
    { id: "grass",   weight: 15 },
  ],
  swamp:    [
    { id: "poison_spider", weight: 10 },
    { id: "grass",         weight: 10 },
  ],
  highland: [
    { id: "jumping_spider", weight: 10 },
    { id: "ant",            weight: 10 },
    { id: "small_scorpion", weight:  6 },
  ],
  mountain: [
    { id: "jumping_spider", weight: 10 },
    { id: "poison_spider",  weight: 10 },
    { id: "small_scorpion", weight:  6 },
  ],
  desert:   [
    { id: "ant",            weight:  8 },
    { id: "small_scorpion", weight:  8 },
    { id: "large_scorpion", weight:  5 },
    { id: "snake",          weight:  2 },
  ],
  dungeon:  [
    { id: "jumping_spider", weight: 10 },
    { id: "poison_spider",  weight: 10 },
    { id: "large_scorpion", weight:  8 },
    { id: "snake",          weight:  4 },
    { id: "dragon",         weight:  1 },  // ~3% → ca. 2–3 Drachen pro Chunk
  ],
};

// ────────────────────────────────────────
// Tile-Index-Berechnung
// ────────────────────────────────────────

/**
 * Berechnet den Tileset-Index aus Biom und Höhe.
 * Layout: [biomeOffset + heightLevel]
 */
export function getTileIndex(biome: BiomeId, height: number): number {
  const offset = BIOME_TILE_OFFSET[biome] ?? 0;
  return offset + Math.min(3, Math.max(0, height));
}
