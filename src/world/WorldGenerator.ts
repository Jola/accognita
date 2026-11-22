// ============================================================
// WORLD GENERATOR
// Absorb & Evolve — Deterministiche Chunk-Generierung
//
// Kein Phaser-Import.
// generateChunk(cx, cy, worldSeed) → ChunkDef (immer gleich für gleiche Inputs)
// ============================================================

import type { ChunkDef, SpawnDef } from "./Chunk.js";
import { CHUNK_PX } from "./Chunk.js";
import type { BiomeSpawnEntry } from "./BiomeDefinitions.js";
import { BIOME_SPAWNS, START_NEST_CHUNK, START_NEST_SPAWNS } from "./BiomeDefinitions.js";
import { biomeAtPoint, circleBlocked } from "./Terrain.js";
import { makeLCG } from "./Noise.js";
import { ENTITY_MAP } from "../data/entities.js";
import { ENTITY_ICON_RADIUS_FACTOR } from "../data/balance.js";

// ────────────────────────────────────────
// Deterministisches seeded LCG
// ────────────────────────────────────────

function chunkSeed(cx: number, cy: number, worldSeed: number): number {
  return ((cx * 73856093) ^ (cy * 19349663) ^ worldSeed) >>> 0;
}

// [VERWORFEN, 22. November 2026] Höhenkarte je Chunk (4 Höhenstufen, nur
// Farbe, an Chunk-Grenzen nicht zusammenhängend). Ersetzt durch Bodenarten,
// Wasser und Hindernisse aus weltweitem Rauschen (Terrain.ts, GDD-12).

// ────────────────────────────────────────
// Gewichtete Zufallsauswahl
// ────────────────────────────────────────

function weightedPick(table: BiomeSpawnEntry[], rng: () => number): BiomeSpawnEntry {
  const total = table.reduce((s, e) => s + e.weight, 0);
  let r = rng() * total;
  for (const entry of table) {
    r -= entry.weight;
    if (r <= 0) return entry;
  }
  return table[table.length - 1];
}

// ────────────────────────────────────────
// Spawn-Generierung
// ────────────────────────────────────────

/** Versuche je Wesen, eine freie Stelle zu finden. */
const SPAWN_TRIES = 6;

/**
 * 64–112 Ziehungen pro Chunk. Je Ziehung: zufällige Stelle, Biom an dieser
 * Stelle (Grenzen verlaufen quer durch Chunks), Wesen aus dessen Tabelle.
 * Vorgabe (Entwickler, 22. November 2026): keine Einheiten im Wasser — und
 * auch nicht in Hindernissen, die das Wesen blockieren. Ist die Stelle nicht
 * frei, wird eine neue gesucht (bis zu SPAWN_TRIES Mal), sonst entfällt es.
 * Einträge mit count setzen mehrere Exemplare, jedes an eigener Stelle.
 */
function generateSpawns(cx: number, cy: number, rng: () => number, seed: number): SpawnDef[] {
  const count = 64 + Math.floor(rng() * 49); // 64–112
  const spawns: SpawnDef[] = [];

  for (let i = 0; i < count; i++) {
    let lx = 48 + Math.floor(rng() * (CHUNK_PX - 96));
    let ly = 48 + Math.floor(rng() * (CHUNK_PX - 96));
    const biome = biomeAtPoint(cx * CHUNK_PX + lx, cy * CHUNK_PX + ly, seed);
    const entry = weightedPick(BIOME_SPAWNS[biome] ?? [{ id: "grass", weight: 1 }], rng);
    const def = ENTITY_MAP.get(entry.id);
    const size = def?.worldSize ?? 5;
    const r = size * ENTITY_ICON_RADIUS_FACTOR;
    const copies = entry.count ?? 1;
    for (let c = 0; c < copies; c++) {
      if (c > 0) {
        lx = 48 + Math.floor(rng() * (CHUNK_PX - 96));
        ly = 48 + Math.floor(rng() * (CHUNK_PX - 96));
      }
      let ok = false;
      for (let t = 0; t < SPAWN_TRIES; t++) {
        if (t > 0) {
          lx = 48 + Math.floor(rng() * (CHUNK_PX - 96));
          ly = 48 + Math.floor(rng() * (CHUNK_PX - 96));
        }
        if (!circleBlocked(cx * CHUNK_PX + lx, cy * CHUNK_PX + ly, r, size, seed)) { ok = true; break; }
      }
      if (ok) spawns.push({ defId: entry.id, localX: lx, localY: ly });
    }
  }

  return spawns;
}

// ────────────────────────────────────────
// Haupt-Export
// ────────────────────────────────────────

/**
 * Generiert einen ChunkDef deterministisch.
 * Gleiche cx/cy/worldSeed → immer identisches Ergebnis.
 * Boden, Wasser und Hindernisse fragt man über Terrain.ts ab; der ChunkDef
 * enthält die Wesen.
 */
export function generateChunk(cx: number, cy: number, worldSeed: number): ChunkDef {
  const rng = makeLCG(chunkSeed(cx, cy, worldSeed));
  const biome = biomeAtPoint((cx + 0.5) * CHUNK_PX, (cy + 0.5) * CHUNK_PX, worldSeed);
  const spawns = generateSpawns(cx, cy, rng, worldSeed);
  // Nest am Startpunkt (GDD-09): feste Spawns zuerst, die Zufallsverteilung bleibt unverändert
  if (cx === START_NEST_CHUNK.cx && cy === START_NEST_CHUNK.cy) {
    spawns.unshift(...START_NEST_SPAWNS.map((s) => ({ defId: s.id, localX: s.localX, localY: s.localY })));
  }
  return { cx, cy, biome, spawns };
}
