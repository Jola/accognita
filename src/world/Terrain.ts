// ============================================================
// TERRAIN — Gelände der Oberwelt abfragen (GDD-12)
// Absorb & Evolve
//
// Kein Phaser-Import. Alles folgt deterministisch aus dem Welt-Seed:
//  - biomeAtPoint: Biom an einem Punkt (Zonen mit verbogenen Grenzen)
//  - vertexTerrain: Bodenart an einem Eckpunkt (alle 32 px)
//  - waterFieldAt: wie „nass“ ein Punkt ist (> 0,5 = Wasser) — dieselbe
//    gerundete Grenze, die die Grafik zeichnet
//  - chunkObstacles / circleBlocked: Hindernisse und Kollision
// Regeln und Werte: src/data/terrain.ts.
// ============================================================

import type { BiomeId } from "./Chunk.js";
import { CHUNK_PX, TILE_PX, TILES_PER_CHUNK, WORLD_CHUNKS_X, WORLD_CHUNKS_Y } from "./Chunk.js";
import { getBiomeAt } from "./BiomeDefinitions.js";
import { fbm, hash2, valueNoise } from "./Noise.js";
import { worldSizeFromLength } from "../data/balance.js";
import {
  T_WATER, BIOME_GROUND, BIOME_WATER, BIOME_WARP_PX, BIOME_WARP_SCALE_PX, BIOME_DETAIL_WARP_PX, BIOME_DETAIL_SCALE_PX,
  LAKE_SCALE_PX, STREAM_SCALE_PX, STREAM_HALF_WIDTH, STREAM_FORD_THRESHOLD, SHORE_WOBBLE,
  START_POINT, START_CLEAR_WATER_PX, START_CLEAR_OBSTACLE_PX,
  OBSTACLE_KINDS, BIOME_OBSTACLES, LARGE_CELL_PX, SMALL_CELL_PX,
  THICKET_SCALE_PX, THICKET_LOW, THICKET_RANGE, THICKET_MAX,
  BLOCK_LARGE_FROM_SIZE, BLOCK_SMALL_BELOW_SIZE,
} from "../data/terrain.js";
import type { ObstacleKind, WeightedKind } from "../data/terrain.js";

export const WORLD_W = WORLD_CHUNKS_X * CHUNK_PX;
export const WORLD_H = WORLD_CHUNKS_Y * CHUNK_PX;
const VERTS_X = WORLD_CHUNKS_X * TILES_PER_CHUNK; // 640 Eckpunkte je Achse (+1 Rand, geklemmt)
const VERTS_Y = WORLD_CHUNKS_Y * TILES_PER_CHUNK;

// ────────────────────────────────────────
// Biom
// ────────────────────────────────────────

/** Biom an einem Weltpunkt (px). */
export function biomeAtPoint(x: number, y: number, seed: number): BiomeId {
  const s = BIOME_WARP_SCALE_PX;
  const d = BIOME_DETAIL_SCALE_PX;
  const wx = x + (fbm(x / s, y / s, seed + 11, 3) - 0.5) * 2 * BIOME_WARP_PX
    + (valueNoise(x / d, y / d, seed + 13) - 0.5) * 2 * BIOME_DETAIL_WARP_PX;
  const wy = y + (fbm(x / s, y / s, seed + 23, 3) - 0.5) * 2 * BIOME_WARP_PX
    + (valueNoise(x / d, y / d, seed + 29) - 0.5) * 2 * BIOME_DETAIL_WARP_PX;
  return getBiomeAt(wx / CHUNK_PX, wy / CHUNK_PX);
}

// ────────────────────────────────────────
// Bodenart an Eckpunkten
// ────────────────────────────────────────

function computeVertexTerrain(i: number, j: number, seed: number): number {
  const x = i * TILE_PX, y = j * TILE_PX;
  const biome = biomeAtPoint(x, y, seed);
  const ground = BIOME_GROUND[biome];
  if (Math.hypot(x - START_POINT.x, y - START_POINT.y) < START_CLEAR_WATER_PX) return ground;
  const rule = BIOME_WATER[biome];
  if (fbm(x / LAKE_SCALE_PX, y / LAKE_SCALE_PX, seed + 101, 3) > rule.lakeThreshold) return T_WATER;
  if (rule.streams) {
    const n = fbm(x / STREAM_SCALE_PX, y / STREAM_SCALE_PX, seed + 202, 2);
    if (Math.abs(n - 0.5) < STREAM_HALF_WIDTH
      && valueNoise(x / 700, y / 700, seed + 203) < STREAM_FORD_THRESHOLD) return T_WATER;
  }
  return ground;
}

let cacheSeed = NaN;
let vertexCache: (Uint8Array | undefined)[] = [];
let obstacleCache: (ChunkObstacles | undefined)[] = [];

function ensureSeed(seed: number): void {
  if (seed === cacheSeed) return;
  cacheSeed = seed;
  vertexCache = new Array(WORLD_CHUNKS_X * WORLD_CHUNKS_Y);
  obstacleCache = new Array(WORLD_CHUNKS_X * WORLD_CHUNKS_Y);
}

function chunkVertices(cx: number, cy: number, seed: number): Uint8Array {
  ensureSeed(seed);
  const idx = cy * WORLD_CHUNKS_X + cx;
  let v = vertexCache[idx];
  if (!v) {
    v = new Uint8Array(TILES_PER_CHUNK * TILES_PER_CHUNK);
    for (let lj = 0; lj < TILES_PER_CHUNK; lj++) {
      for (let li = 0; li < TILES_PER_CHUNK; li++) {
        v[lj * TILES_PER_CHUNK + li] = computeVertexTerrain(cx * TILES_PER_CHUNK + li, cy * TILES_PER_CHUNK + lj, seed);
      }
    }
    vertexCache[idx] = v;
  }
  return v;
}

/** Bodenart am Eckpunkt (i, j) — Eckpunkt liegt bei (i × 32, j × 32) px. Außerhalb der Welt: Rand. */
export function vertexTerrain(i: number, j: number, seed: number): number {
  const ci = Math.min(VERTS_X - 1, Math.max(0, i));
  const cj = Math.min(VERTS_Y - 1, Math.max(0, j));
  const cx = (ci / TILES_PER_CHUNK) | 0, cy = (cj / TILES_PER_CHUNK) | 0;
  return chunkVertices(cx, cy, seed)[(cj - cy * TILES_PER_CHUNK) * TILES_PER_CHUNK + (ci - cx * TILES_PER_CHUNK)];
}

// ────────────────────────────────────────
// Ufer: gerundete Grenze zwischen den Eckpunkten
// ────────────────────────────────────────

/**
 * Welle der Uferlinie je Pixel einer Kachel (32 × 32), an den Kachelrändern 0 —
 * so passen Nachbarkacheln immer zusammen.
 */
export const SHORE_OFFSET: Float32Array = (() => {
  const t = new Float32Array(TILE_PX * TILE_PX);
  for (let py = 0; py < TILE_PX; py++) {
    for (let px = 0; px < TILE_PX; px++) {
      const u = (px + 0.5) / TILE_PX, v = (py + 0.5) / TILE_PX;
      const env = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
      t[py * TILE_PX + px] = (valueNoise(px / 5, py / 5, 777) - 0.5) * 2 * SHORE_WOBBLE * env;
    }
  }
  return t;
})();

/**
 * Wasseranteil an einem Punkt: 0 = Land, 1 = Wasser, > 0,5 gilt als Wasser.
 * Bilinear zwischen den 4 Eckpunkten der Kachel — ergibt gerundete Ecken.
 */
export function waterFieldAt(x: number, y: number, seed: number): number {
  const i = Math.floor(x / TILE_PX), j = Math.floor(y / TILE_PX);
  const w00 = vertexTerrain(i, j, seed) === T_WATER ? 1 : 0;
  const w10 = vertexTerrain(i + 1, j, seed) === T_WATER ? 1 : 0;
  const w01 = vertexTerrain(i, j + 1, seed) === T_WATER ? 1 : 0;
  const w11 = vertexTerrain(i + 1, j + 1, seed) === T_WATER ? 1 : 0;
  const sum = w00 + w10 + w01 + w11;
  if (sum === 0) return 0;
  if (sum === 4) return 1;
  const lx = x - i * TILE_PX, ly = y - j * TILE_PX;
  const u = lx / TILE_PX, v = ly / TILE_PX;
  const f = w00 * (1 - u) * (1 - v) + w10 * u * (1 - v) + w01 * (1 - u) * v + w11 * u * v;
  const px = Math.min(TILE_PX - 1, lx | 0), py = Math.min(TILE_PX - 1, ly | 0);
  return f + SHORE_OFFSET[py * TILE_PX + px];
}

export function isWaterAt(x: number, y: number, seed: number): boolean {
  return waterFieldAt(x, y, seed) > 0.5;
}

// ────────────────────────────────────────
// Hindernisse
// ────────────────────────────────────────

export interface ObstacleInstance {
  kind: string;
  x: number;
  y: number;
  /** Sichtbarer Radius (px). */
  r: number;
  /** Kollisionsradius (px). */
  cr: number;
  /** Radius der Baumkrone (px), falls vorhanden. */
  crownR?: number;
  /** Zufallswert für Varianten der Grafik. */
  variant: number;
}

interface ChunkObstacles {
  list: ObstacleInstance[];
  /** Je große Zelle (16 × 16 je Chunk) die Hindernisse, deren Mittelpunkt darin liegt. */
  buckets: (ObstacleInstance[] | undefined)[];
}

const CELLS_PER_CHUNK = CHUNK_PX / LARGE_CELL_PX; // 16
const SMALL_PER_CHUNK = CHUNK_PX / SMALL_CELL_PX; // 32

/** Größter Kollisionsradius aller Hindernisse — so weit muss eine Abfrage um sich schauen. */
export const MAX_OBSTACLE_RADIUS = Math.max(
  ...Object.values(OBSTACLE_KINDS).map((k) => worldSizeFromLength(k.lengthCm) / 2 * k.colliderFactor),
);

function pickWeighted(list: WeightedKind[], r: number): ObstacleKind {
  const total = list.reduce((s, e) => s + e.weight, 0);
  let x = r * total;
  for (const e of list) {
    x -= e.weight;
    if (x < 0) return OBSTACLE_KINDS[e.id];
  }
  return OBSTACLE_KINDS[list[list.length - 1].id];
}

function thicketFactor(x: number, y: number, seed: number): number {
  const t = fbm(x / THICKET_SCALE_PX, y / THICKET_SCALE_PX, seed + 400, 2);
  return Math.min(1, Math.max(0, (t - THICKET_LOW) / THICKET_RANGE)) * THICKET_MAX;
}

/** Steht ein Kreis ganz auf trockenem Land (mit etwas Abstand zum Ufer)? */
function dryLand(x: number, y: number, r: number, seed: number): boolean {
  if (waterFieldAt(x, y, seed) > 0.25) return false;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    if (waterFieldAt(x + Math.cos(a) * r, y + Math.sin(a) * r, seed) > 0.4) return false;
  }
  return true;
}

function makeObstacle(kind: ObstacleKind, x: number, y: number, variant: number): ObstacleInstance {
  const r = worldSizeFromLength(kind.lengthCm) / 2;
  const o: ObstacleInstance = { kind: kind.id, x, y, r, cr: r * kind.colliderFactor, variant };
  if (kind.crownCm) o.crownR = worldSizeFromLength(kind.crownCm) / 2;
  return o;
}

function nearStart(x: number, y: number, r: number): boolean {
  return Math.hypot(x - START_POINT.x, y - START_POINT.y) < START_CLEAR_OBSTACLE_PX + r;
}

function largeCellObstacle(gx: number, gy: number, seed: number): ObstacleInstance | null {
  const mx = (gx + 0.5) * LARGE_CELL_PX, my = (gy + 0.5) * LARGE_CELL_PX;
  const rule = BIOME_OBSTACLES[biomeAtPoint(mx, my, seed)];
  const p = Math.min(0.92, rule.largeDensity * thicketFactor(mx, my, seed));
  if (hash2(gx, gy, seed + 501) >= p) return null;
  const kind = pickWeighted(rule.large, hash2(gx, gy, seed + 502));
  const r = worldSizeFromLength(kind.lengthCm) / 2;
  // Ganz in der Zelle → Hindernisse überlappen nie
  const margin = Math.max(0, LARGE_CELL_PX / 2 - r - 2);
  const x = mx + (hash2(gx, gy, seed + 503) * 2 - 1) * margin;
  const y = my + (hash2(gx, gy, seed + 504) * 2 - 1) * margin;
  if (nearStart(x, y, r)) return null;
  if (!dryLand(x, y, r, seed)) return null;
  return makeObstacle(kind, x, y, hash2(gx, gy, seed + 505));
}

function smallCellObstacle(sx: number, sy: number, seed: number): ObstacleInstance | null {
  const mx = (sx + 0.5) * SMALL_CELL_PX, my = (sy + 0.5) * SMALL_CELL_PX;
  const rule = BIOME_OBSTACLES[biomeAtPoint(mx, my, seed)];
  if (hash2(sx, sy, seed + 601) >= rule.smallDensity) return null;
  const kind = pickWeighted(rule.small, hash2(sx, sy, seed + 602));
  const r = worldSizeFromLength(kind.lengthCm) / 2;
  const margin = Math.max(0, SMALL_CELL_PX / 2 - r - 1);
  const x = mx + (hash2(sx, sy, seed + 603) * 2 - 1) * margin;
  const y = my + (hash2(sx, sy, seed + 604) * 2 - 1) * margin;
  if (nearStart(x, y, r)) return null;
  if (!dryLand(x, y, r, seed)) return null;
  return makeObstacle(kind, x, y, hash2(sx, sy, seed + 605));
}

function buildChunkObstacles(cx: number, cy: number, seed: number): ChunkObstacles {
  const list: ObstacleInstance[] = [];
  const buckets: (ObstacleInstance[] | undefined)[] = new Array(CELLS_PER_CHUNK * CELLS_PER_CHUNK);
  const put = (o: ObstacleInstance) => {
    list.push(o);
    const lx = Math.min(CELLS_PER_CHUNK - 1, Math.max(0, Math.floor((o.x - cx * CHUNK_PX) / LARGE_CELL_PX)));
    const ly = Math.min(CELLS_PER_CHUNK - 1, Math.max(0, Math.floor((o.y - cy * CHUNK_PX) / LARGE_CELL_PX)));
    const k = ly * CELLS_PER_CHUNK + lx;
    (buckets[k] ??= []).push(o);
  };
  for (let ly = 0; ly < CELLS_PER_CHUNK; ly++) {
    for (let lx = 0; lx < CELLS_PER_CHUNK; lx++) {
      const o = largeCellObstacle(cx * CELLS_PER_CHUNK + lx, cy * CELLS_PER_CHUNK + ly, seed);
      if (o) put(o);
    }
  }
  for (let ly = 0; ly < SMALL_PER_CHUNK; ly++) {
    for (let lx = 0; lx < SMALL_PER_CHUNK; lx++) {
      const o = smallCellObstacle(cx * SMALL_PER_CHUNK + lx, cy * SMALL_PER_CHUNK + ly, seed);
      if (!o) continue;
      // Nicht auf einem großen Hindernis
      const bucket = buckets[Math.floor(ly / 2) * CELLS_PER_CHUNK + Math.floor(lx / 2)];
      if (bucket?.some((b) => Math.hypot(b.x - o.x, b.y - o.y) < b.r + o.r + 1)) continue;
      put(o);
    }
  }
  return { list, buckets };
}

function getChunkObstacles(cx: number, cy: number, seed: number): ChunkObstacles {
  ensureSeed(seed);
  const idx = cy * WORLD_CHUNKS_X + cx;
  let c = obstacleCache[idx];
  if (!c) {
    c = buildChunkObstacles(cx, cy, seed);
    obstacleCache[idx] = c;
  }
  return c;
}

/** Alle Hindernisse eines Chunks (zum Zeichnen). */
export function chunkObstacles(cx: number, cy: number, seed: number): ObstacleInstance[] {
  return getChunkObstacles(cx, cy, seed).list;
}

/** Ruft fn für jedes Hindernis auf, dessen Mittelpunkt höchstens `range` + größter Radius von (x, y) entfernt sein kann. */
export function forEachObstacleNear(
  x: number, y: number, range: number, seed: number,
  fn: (o: ObstacleInstance) => boolean | void,
): void {
  const reach = range + MAX_OBSTACLE_RADIUS;
  const gx0 = Math.max(0, Math.floor((x - reach) / LARGE_CELL_PX));
  const gy0 = Math.max(0, Math.floor((y - reach) / LARGE_CELL_PX));
  const gx1 = Math.min(WORLD_CHUNKS_X * CELLS_PER_CHUNK - 1, Math.floor((x + reach) / LARGE_CELL_PX));
  const gy1 = Math.min(WORLD_CHUNKS_Y * CELLS_PER_CHUNK - 1, Math.floor((y + reach) / LARGE_CELL_PX));
  for (let gy = gy0; gy <= gy1; gy++) {
    const cy = (gy / CELLS_PER_CHUNK) | 0;
    for (let gx = gx0; gx <= gx1; gx++) {
      const cx = (gx / CELLS_PER_CHUNK) | 0;
      const bucket = getChunkObstacles(cx, cy, seed).buckets[(gy - cy * CELLS_PER_CHUNK) * CELLS_PER_CHUNK + (gx - cx * CELLS_PER_CHUNK)];
      if (!bucket) continue;
      for (const o of bucket) if (fn(o) === true) return;
    }
  }
}

/** Blockiert diese Hindernisart ein Wesen dieser Größe (worldSize)? */
export function obstacleBlocks(kindId: string, beingSize: number): boolean {
  const k = OBSTACLE_KINDS[kindId];
  if (!k) return false;
  if (k.block === "all") return true;
  if (k.block === "large") return beingSize >= BLOCK_LARGE_FROM_SIZE;
  return beingSize < BLOCK_SMALL_BELOW_SIZE;
}

// ────────────────────────────────────────
// Kollision
// ────────────────────────────────────────

/**
 * Ist ein Kreis (Mittelpunkt x/y, Radius r) eines Wesens der Größe `size`
 * blockiert — durch Weltrand, Wasser oder ein Hindernis, das diese Größe blockiert?
 */
export function circleBlocked(x: number, y: number, r: number, size: number, seed: number): boolean {
  if (x < r || y < r || x > WORLD_W - r || y > WORLD_H - r) return true;
  if (waterFieldAt(x, y, seed) > 0.5) return true;
  const n = r > 12 ? 12 : 8;
  const rr = r * 0.9;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    if (waterFieldAt(x + Math.cos(a) * rr, y + Math.sin(a) * rr, seed) > 0.5) return true;
  }
  let hit = false;
  forEachObstacleNear(x, y, r, seed, (o) => {
    if (!obstacleBlocks(o.kind, size)) return;
    const d = r + o.cr;
    const dx = o.x - x, dy = o.y - y;
    if (dx * dx + dy * dy < d * d) { hit = true; return true; }
  });
  return hit;
}

/**
 * Nächster freier Punkt um (x, y) — Spirale nach außen. Für Spielstände aus
 * der alten Welt, in denen der Blob jetzt im Wasser oder in einem Felsen steht.
 */
export function findFreeSpot(x: number, y: number, r: number, size: number, seed: number): { x: number; y: number } {
  if (!circleBlocked(x, y, r, size, seed)) return { x, y };
  const step = Math.max(4, r);
  for (let ring = 1; ring < 200; ring++) {
    const d = ring * step;
    const n = Math.max(8, Math.round((2 * Math.PI * d) / step));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const nx = x + Math.cos(a) * d, ny = y + Math.sin(a) * d;
      if (!circleBlocked(nx, ny, r, size, seed)) return { x: nx, y: ny };
    }
  }
  return { x, y };
}
