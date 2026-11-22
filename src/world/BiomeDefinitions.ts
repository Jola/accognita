// ============================================================
// BIOME DEFINITIONS
// Absorb & Evolve — Zonen-Layout und Spawn-Tabellen
//
// Kein Phaser-Import.
// ============================================================

import type { BiomeId } from "./Chunk.js";

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

/**
 * Biom der Zonen-Tabelle an einer Stelle in Chunk-Koordinaten (auch Kommazahlen) —
 * forest als Fallback. Die verbogenen Grenzen der Welt: Terrain.ts biomeAtPoint.
 */
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
  /**
   * Exemplare je Treffer (Standard 1). 2 = doppelt so viele, ohne die
   * anderen Wesen seltener zu machen (jedes an eigener Position).
   */
  count?: number;
}

// Vorgabe (Entwickler, 13. November 2026): Gras doppelt so häufig
// platzieren, überall wo es vorkommt — Pflanzenfasern sind die Nahrung
// für Wachsen (Grow). > Begründung offen (naheliegend: genug Nahrung).
const GRASS_COUNT = 2;

// Vorgabe (Entwickler, 21. November 2026): die fünf Wirbeltiere (GDD-07
// Abschnitt 12) auf die Karte setzen. Verteilung und Gewichte:
// Vorschlag Claude (offen), VORLÄUFIG — nach dem Lebensraum des Vorbilds:
//   Waldmaus: Wald (häufigstes Wirbeltier, auch nah am Start), Hochland, Sumpf
//   Wasserspitzmaus: Sumpf (lebt am Wasser)
//   Zauneidechse: Hochland, Wüste (sonnig, trocken)
//   Igel: Wald, Hochland (Waldrand, Hecken)
//   Mauswiesel: nur Hochland (Wiesen, Felder) — nicht im Startwald, weil es
//     aggressiv ist (Stufe 5) und den Blob angreift, sobald er nicht mehr
//     4× kleiner ist (Größen-Aggro).
// Wirbeltiere bleiben seltener als Insekten (Gewicht 1–5 statt 6–15).
export const BIOME_SPAWNS: Record<BiomeId, BiomeSpawnEntry[]> = {
  forest:   [
    { id: "ant",     weight: 10 },
    { id: "ladybug", weight: 10 },
    { id: "grass",   weight: 15, count: GRASS_COUNT },
    { id: "earthworm", weight: 6 },   // GDD-09, VORLÄUFIG
    { id: "snail",     weight: 6 },
    { id: "wood_mouse", weight: 4 },
    { id: "hedgehog",   weight: 2 },
  ],
  swamp:    [
    { id: "poison_spider", weight: 10 },
    { id: "grass",         weight: 10, count: GRASS_COUNT },
    { id: "snail",         weight: 8 },   // GDD-09, VORLÄUFIG — feucht, Schneckenland
    { id: "earthworm",     weight: 4 },
    { id: "water_shrew",   weight: 5 },
    { id: "wood_mouse",    weight: 2 },
  ],
  highland: [
    { id: "jumping_spider", weight: 10 },
    { id: "ant",            weight: 10 },
    { id: "small_scorpion", weight:  6 },
    { id: "sand_lizard",    weight:  5 },
    { id: "wood_mouse",     weight:  3 },
    { id: "hedgehog",       weight:  2 },
    { id: "least_weasel",   weight:  2 },
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
    { id: "sand_lizard",    weight:  3 },
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
// [VERWORFEN, 22. November 2026] Tile-Index aus Biom + Höhe (getTileIndex,
// 6 Biome × 4 Höhenstufen). Ersetzt durch Bodenarten an Eckpunkten und
// berechnete Übergangskacheln (GDD-12, TilesetGenerator.ts).
// ────────────────────────────────────────

// ────────────────────────────────────────
// Nest am Startpunkt (GDD-09 Abschnitt 5)
//
// Vorgabe (Entwickler, 13. November 2026): Der Blob erwacht blind und ohne
// Bewegung; die Einheiten, an denen er Sehen und Bewegen lernt, müssen in
// seiner Nähe sein. Deshalb liegen in Chunk (0, 0) fest neben dem Startpunkt
// ein Regenwurm und eine Schnecke in Reichweite eines frischen Blobs
// (Radius 2, Reichweite 2,5 Radien bis zum Rand), dazu Gras etwas weiter
// weg — erreichbar, sobald er kriechen kann.
// Lokale Koordinaten im Chunk; Startpunkt (400, 300) = createInitialGameState.
// Seit 21. November 2026 (Größenskala) sind Wurm (Radius 7,4) und Schnecke
// (4,7) viel größer als der frische Blob (2): Sie liegen so, dass sie ihn
// nicht verdecken und ihr Rand trotzdem in Reichweite (5 px) ist —
// Wurm 11 px (Rand 3,6), Schnecke 8 px (Rand 3,4) vom Startpunkt.
// [VERWORFEN] Wurm (405, 300), Schnecke (396, 304) — bei worldSize 4.
// ────────────────────────────────────────
export const START_NEST_CHUNK = { cx: 0, cy: 0 };
export const START_NEST_SPAWNS: { id: string; localX: number; localY: number }[] = [
  { id: "earthworm", localX: 411, localY: 300 },
  { id: "snail",     localX: 393, localY: 304 },
  { id: "grass",     localX: 422, localY: 288 },
  { id: "grass",     localX: 378, localY: 320 },
  { id: "grass",     localX: 430, localY: 322 },
];
