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
// Spawn-Tabellen pro Biom
// ────────────────────────────────────────

export const BIOME_SPAWNS: Record<BiomeId, string[]> = {
  forest:   ["ant", "ladybug", "grass"],
  swamp:    ["poison_spider", "grass"],
  highland: ["jumping_spider", "ant"],
  mountain: ["jumping_spider", "poison_spider"],
  desert:   ["ant"],
  dungeon:  ["jumping_spider", "poison_spider"],
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
