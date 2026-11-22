// ============================================================
// TILESET GENERATOR — Pixel-Art für Boden und Hindernisse (GDD-12)
// Absorb & Evolve
//
// Kein Phaser-Import (scene als any). Canvas 2D erlaubt.
//
// Vorgabe (Entwickler, 22. November 2026): Die Kacheln sollen besser
// aussehen und erkennbar zeigen, was sie darstellen; Übergänge schön
// erkennbar (Ufer zwischen Land und Wasser, gerundete Ecken). Inspiration:
// Top-Down-Pixel-Art-Sets (z. B. craftpix „Main Characters Home“, „2D Top
// Down Pixel Dungeon“) — oder selbst etwas ausdenken.
//
// Umsetzung (Vorschlag Claude, offen): Alles wird beim Start im Code
// gezeichnet — keine Bilddateien. Begründung: Das Spiel bleibt eine einzige
// HTML-Datei, und fremde Grafiken dürfen nach ihrer Lizenz meist nicht in
// einem öffentlichen Repository weitergegeben werden.
//
// Boden („Dual-Grid“): Eine Kachel hängt von den Bodenarten ihrer 4 Ecken ab.
// Jede vorkommende Kombination wird beim ersten Bedarf in einen Atlas
// gezeichnet (Canvas-Textur „terrainAtlas“), die Grenze verläuft gerundet:
// bilinear zwischen den Ecken, dieselbe Rechnung wie die Wasser-Kollision
// (Terrain.ts waterFieldAt).
// ============================================================

import { TILE_PX } from "./Chunk.js";
import { hash2, valueNoise } from "./Noise.js";
import { SHORE_OFFSET, vertexTerrain } from "./Terrain.js";
import type { ObstacleInstance } from "./Terrain.js";
import {
  T_WATER, T_FOREST, T_SWAMP, T_MEADOW, T_ROCK, T_SAND, T_DUNGEON, TERRAIN_COUNT,
  TERRAIN_MAP_COLORS, BIOME_GROUND, OBSTACLE_KINDS,
} from "../data/terrain.js";
import { worldSizeFromLength } from "../data/balance.js";
import type { BiomeId } from "./Chunk.js";

export const TILE_SIZE = TILE_PX;

type RGB = [number, number, number];

function hex(c: string): RGB {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Grundfarbe eines Bioms — für die Karte (GDD-10 11.1). */
export function biomeBaseColor(biome: string): string {
  return TERRAIN_MAP_COLORS[BIOME_GROUND[biome as BiomeId] ?? T_FOREST];
}
/** Farbe einer Bodenart — für die Karte. */
export function terrainColor(t: number): string {
  return TERRAIN_MAP_COLORS[t] ?? "#222";
}

// ────────────────────────────────────────
// Bildpuffer
// ────────────────────────────────────────

interface Img { w: number; h: number; d: Uint8ClampedArray<ArrayBuffer> }

function newImg(w: number, h: number): Img {
  return { w, h, d: new Uint8ClampedArray(new ArrayBuffer(w * h * 4)) };
}
/** Pixel setzen mit Alpha-Mischung über den vorhandenen Pixel. */
function put(img: Img, x: number, y: number, c: RGB, a = 255): void {
  x |= 0; y |= 0;
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return;
  const i = (y * img.w + x) * 4;
  const d = img.d;
  if (a >= 255 || d[i + 3] === 0) {
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
    d[i + 3] = a >= 255 ? 255 : Math.max(d[i + 3], a);
    return;
  }
  const t = a / 255;
  d[i] = d[i] + (c[0] - d[i]) * t;
  d[i + 1] = d[i + 1] + (c[1] - d[i + 1]) * t;
  d[i + 2] = d[i + 2] + (c[2] - d[i + 2]) * t;
  d[i + 3] = Math.max(d[i + 3], a);
}
function getRGB(img: Img, x: number, y: number): RGB {
  const i = (y * img.w + x) * 4;
  return [img.d[i], img.d[i + 1], img.d[i + 2]];
}
function alphaAt(img: Img, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return 0;
  return img.d[(y * img.w + x) * 4 + 3];
}

// ────────────────────────────────────────
// Bodenmuster (32 × 32, nahtlos; Details halten Abstand zum Rand)
// ────────────────────────────────────────

const VARIANTS = 4;

/**
 * Periodisches Rauschen über die Kachel (Periode 32 px) → nahtlos. Die
 * Gitterpunkte auf dem Kachelrand sind in allen Varianten gleich, das Innere
 * hängt von der Variante ab — so passen alle Varianten aneinander, und das
 * Muster wiederholt sich nicht sichtbar.
 */
function periodicNoise(px: number, py: number, cells: number, seed: number, variant = 0): number {
  const cs = TILE_PX / cells;
  const x = px / cs, y = py / cs;
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const h = (a: number, b: number) => {
    const ca = ((a % cells) + cells) % cells, cb = ((b % cells) + cells) % cells;
    return hash2(ca, cb, ca === 0 || cb === 0 ? seed : seed + 31 * (variant + 1));
  };
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v;
}

function shadeBase(img: Img, shades: RGB[], seed: number, variant: number, lowWeight = 0.65): void {
  for (let y = 0; y < TILE_PX; y++) {
    for (let x = 0; x < TILE_PX; x++) {
      const low = periodicNoise(x, y, 4, seed, variant) * 0.7 + periodicNoise(x, y, 8, seed + 1, variant) * 0.3;
      const t = low * lowWeight + hash2(x, y, seed + 10 + variant) * (1 - lowWeight);
      const k = Math.min(shades.length - 1, Math.max(0, Math.floor(t * shades.length * 1.05 - 0.02)));
      put(img, x, y, shades[k]);
    }
  }
}

/** Zufallszahlen für Details (deterministisch je Muster und Variante). */
function rngFor(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
const inner = (r: () => number, pad = 3) => pad + Math.floor(r() * (TILE_PX - 2 * pad));

function grassTufts(img: Img, r: () => number, n: number, dark: RGB, light: RGB, tall: number): void {
  for (let i = 0; i < n; i++) {
    const x = inner(r), y = inner(r, 5);
    const h = 2 + Math.floor(r() * tall);
    put(img, x, y, dark);
    for (let d = 1; d <= h; d++) put(img, x, y - d, d === h ? mix(light, [255, 255, 200], 0.25) : light);
    if (r() < 0.7) { put(img, x - 1, y - 1, light); put(img, x - 2, y - 2, light, 200); }
    if (r() < 0.7) { put(img, x + 1, y - 1, light); put(img, x + 2, y - 2, light, 200); }
  }
}
function flower(img: Img, x: number, y: number, petal: RGB, center: RGB): void {
  put(img, x, y - 1, petal); put(img, x - 1, y, petal); put(img, x + 1, y, petal); put(img, x, y + 1, petal);
  put(img, x, y, center);
}

function makeGround(t: number, variant: number): Img {
  const img = newImg(TILE_PX, TILE_PX);
  const seed = 1000 + t * 97;
  const r = rngFor(seed * 31 + variant * 7 + 3);
  switch (t) {
    case T_WATER: {
      shadeBase(img, ["#2c64a1", "#3170ae", "#3779b9", "#3d82c3", "#458bcb"].map(hex), seed, variant, 0.85);
      const crest = hex("#7db5e5"), spark = hex("#d8f0ff");
      for (let i = 0; i < 3 + variant; i++) {
        const x = inner(r, 4), y = inner(r, 3);
        for (let k = 0; k < 4; k++) put(img, x + k, y + (k === 0 || k === 3 ? 1 : 0), crest, 200);
        if (r() < 0.4) put(img, x + 1, y, spark);
      }
      break;
    }
    case T_FOREST: {
      const shades = ["#2e6a2b", "#357530", "#3d8135", "#468d3b", "#529944"].map(hex);
      shadeBase(img, shades, seed, variant);
      grassTufts(img, r, 7, hex("#25561f"), hex("#62ad4f"), 2);
      if (variant === 1) { flower(img, inner(r, 4), inner(r, 4), hex("#f4f4ea"), hex("#e8c83a")); flower(img, inner(r, 4), inner(r, 4), hex("#f4f4ea"), hex("#e8c83a")); }
      if (variant === 2) for (let i = 0; i < 4; i++) { const x = inner(r), y = inner(r); put(img, x, y, hex("#9a6a2c")); put(img, x + 1, y, hex("#b98034")); }
      if (variant === 3) { const x = inner(r, 5), y = inner(r, 5); put(img, x, y, hex("#c8382c")); put(img, x + 1, y, hex("#c8382c")); put(img, x, y - 1, hex("#e65a48")); put(img, x + 1, y - 1, hex("#f2f2f2")); put(img, x, y + 1, hex("#e8dcc0")); }
      break;
    }
    case T_MEADOW: {
      shadeBase(img, ["#6c973d", "#78a444", "#84b04b", "#90bb54", "#a0c762"].map(hex), seed, variant);
      grassTufts(img, r, 9, hex("#5a8434"), hex("#b0d470"), 3);
      const petals = [hex("#e04848"), hex("#f2d43c"), hex("#9a64d8"), hex("#f6f6f0")];
      const n = variant === 0 ? 1 : variant + 1;
      for (let i = 0; i < n; i++) flower(img, inner(r, 4), inner(r, 4), petals[Math.floor(r() * 4)], hex("#f8e070"));
      break;
    }
    case T_SWAMP: {
      shadeBase(img, ["#3d4327", "#42492a", "#474f2d", "#4c5530", "#525b34"].map(hex), seed, variant, 0.3);
      // Moos-Polster: unregelmäßige Flecken im Inneren der Kachel
      const moss = hex("#587534"), mossL = hex("#6d8f3d"), mossD = hex("#465e2a");
      const pads = 2 + (variant % 3);
      for (let k2 = 0; k2 < pads; k2++) {
        const mx = 7 + r() * 18, my = 7 + r() * 18, rx = 3.5 + r() * 3.5, ry = 2.5 + r() * 3;
        for (let y = 0; y < TILE_PX; y++) for (let x = 0; x < TILE_PX; x++) {
          const d = ((x - mx) / rx) ** 2 + ((y - my) / ry) ** 2 + (hash2(x, y, seed + k2 + variant * 9) - 0.5) * 0.6;
          if (d < 1) put(img, x, y, d < 0.35 ? mossL : d > 0.8 ? mossD : moss);
        }
      }
      if (variant === 1 || variant === 3) {
        const x = inner(r, 6), y = inner(r, 6);
        for (let dy = 0; dy < 2; dy++) for (let dx = -1; dx < 3; dx++) put(img, x + dx, y + dy, hex("#2a3a35"));
        put(img, x, y, hex("#5c8577"));
      }
      grassTufts(img, r, variant === 2 ? 4 : 2, hex("#2f3a1c"), hex("#7a8c40"), 3);
      break;
    }
    case T_ROCK: {
      shadeBase(img, ["#5e5e67", "#6a6a73", "#76767f", "#83838c", "#91919b"].map(hex), seed, variant, 0.5);
      const crack = hex("#46464e");
      const cracks = variant === 2 ? 2 : 1;
      for (let c = 0; c < cracks; c++) {
        let x = inner(r, 6), y = inner(r, 6);
        for (let k = 0; k < 7; k++) { put(img, x, y, crack); x += r() < 0.5 ? 1 : 0; y += r() < 0.6 ? 1 : -1; if (x > 28 || y > 28 || y < 3) break; }
      }
      const n = variant === 1 ? 7 : 3;
      for (let i = 0; i < n; i++) { const x = inner(r), y = inner(r); put(img, x, y, hex("#acacb6")); put(img, x, y + 1, hex("#4e4e56")); }
      if (variant === 3) for (let i = 0; i < 5; i++) put(img, inner(r), inner(r), hex("#9aa54e"));
      break;
    }
    case T_SAND: {
      shadeBase(img, ["#cdaf6a", "#d3b672", "#d9be79", "#dfc580", "#e5cc89"].map(hex), seed, variant, 0.45);
      const lite = hex("#f0dca4"), dark = hex("#bb9c58");
      // Rippeln: je Variante anders, zum Rand hin ausgeblendet (nahtlos)
      const rows = [5 + variant * 2, 14 + (variant % 2) * 3, 23 + ((variant + 1) % 3) * 2];
      for (const y0 of rows) {
        const len = 12 + Math.floor(r() * 12), xs = 2 + Math.floor(r() * (TILE_PX - len - 4));
        for (let x = xs; x < xs + len; x++) {
          const y = y0 + Math.round(Math.sin(x * 0.45 + variant + y0) * 1.3);
          const fade = Math.min(1, (x - xs) / 3, (xs + len - x) / 3);
          put(img, x, y, lite, 150 * fade); put(img, x, y + 1, dark, 110 * fade);
        }
      }
      if (variant === 1) for (let i = 0; i < 3; i++) { const x = inner(r), y = inner(r); put(img, x, y, hex("#9c8658")); put(img, x + 1, y, hex("#b39d6c")); }
      if (variant === 2) grassTufts(img, r, 2, hex("#8d8440"), hex("#b8ae5c"), 2);
      break;
    }
    case T_DUNGEON: {
      const mortar = hex("#26262e");
      const slabs = ["#454552", "#4b4b59", "#515160", "#575767"].map(hex);
      for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
        const base = slabs[Math.floor(hash2(sx + variant * 2, sy, seed) * slabs.length)];
        for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
          const X = sx * 16 + x, Y = sy * 16 + y;
          let c: RGB = base;
          const n = hash2(X, Y, seed + variant) * 0.12 - 0.06;
          c = mix(c, n > 0 ? [255, 255, 255] : [0, 0, 0], Math.abs(n));
          if (x === 0 || y === 0) c = mortar;
          else if (x === 1 || y === 1) c = mix(base, [200, 200, 220], 0.18);
          else if (x === 15 || y === 15) c = mix(base, [0, 0, 0], 0.25);
          put(img, X, Y, c);
        }
      }
      if (variant === 1) { let x = 6, y = 20; for (let k = 0; k < 8; k++) { put(img, x, y, mortar); x++; y += r() < 0.5 ? 1 : -1; } }
      if (variant === 3) for (let i = 0; i < 6; i++) put(img, 2 + Math.floor(r() * 4), 2 + Math.floor(r() * 4), hex("#3f5a3a"));
      break;
    }
  }
  return img;
}

let groundCache: Img[][] | null = null;
function ground(t: number, v: number): Img {
  if (!groundCache) {
    groundCache = [];
    for (let t2 = 0; t2 < TERRAIN_COUNT; t2++) {
      groundCache.push([]);
      for (let v2 = 0; v2 < VARIANTS; v2++) groundCache[t2].push(makeGround(t2, v2));
    }
  }
  return groundCache[t][v];
}

// ────────────────────────────────────────
// Übergangskacheln
// ────────────────────────────────────────

/** Unregelmäßigkeit der Grenze zwischen zwei Landarten, an den Kachelrändern 0. */
function landDither(t: number, px: number, py: number): number {
  const u = (px + 0.5) / TILE_PX, v = (py + 0.5) / TILE_PX;
  const env = Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
  const n = (valueNoise(px / 3, py / 3, 900 + t) - 0.5) + (hash2(px, py, 950 + t) - 0.5) * 0.6;
  return n * 0.55 * env;
}

const SHORE_SAND = hex("#d6c189");
const SHORE_WET = hex("#a7905c");
const SHORE_RIM = hex("#7d6b42");
const FOAM = hex("#dcf0fa");
const SHALLOW = hex("#6aaee0");

function compositeTile(c: [number, number, number, number], variant: number): Img {
  const img = newImg(TILE_PX, TILE_PX);
  const hasWater = c.includes(T_WATER);
  const lands = [...new Set(c.filter((t) => t !== T_WATER))];
  for (let py = 0; py < TILE_PX; py++) {
    for (let px = 0; px < TILE_PX; px++) {
      const u = (px + 0.5) / TILE_PX, v = (py + 0.5) / TILE_PX;
      const w = [(1 - u) * (1 - v), u * (1 - v), (1 - u) * v, u * v];
      let wf = 0;
      for (let k = 0; k < 4; k++) if (c[k] === T_WATER) wf += w[k];
      if (hasWater && lands.length > 0) wf += SHORE_OFFSET[py * TILE_PX + px];
      if (hasWater && (lands.length === 0 || wf > 0.5)) {
        let col = getRGB(ground(T_WATER, variant), px, py);
        if (lands.length > 0) {
          if (wf < 0.56) col = FOAM;
          else if (wf < 0.75) col = mix(col, SHALLOW, (1 - (wf - 0.56) / 0.19) * 0.6);
        }
        put(img, px, py, col);
        continue;
      }
      // Land: welche Landart?
      let best = lands[0], bestScore = -9;
      if (lands.length > 1) {
        for (const t of lands) {
          let s = 0;
          for (let k = 0; k < 4; k++) if (c[k] === t) s += w[k];
          s += landDither(t, px, py);
          if (s > bestScore) { bestScore = s; best = t; }
        }
      }
      let col = getRGB(ground(best, lands.length === 1 && !hasWater ? variant : 0), px, py);
      if (hasWater) {
        // Ufer: trockener Sand → nasser Sand → dunkle Kante
        if (wf > 0.47) col = SHORE_RIM;
        else if (wf > 0.38) col = SHORE_WET;
        else if (wf > 0.26) col = mix(col, SHORE_SAND, Math.min(1, (wf - 0.26) / 0.07));
      }
      put(img, px, py, col);
    }
  }
  return img;
}

// ────────────────────────────────────────
// Atlas
// ────────────────────────────────────────

const SLOT = TILE_PX + 2; // 1 px Rand je Seite gegen Nähte
const ATLAS_COLS = 32;
const ATLAS_ROWS = 60;
const ATLAS_CAPACITY = ATLAS_COLS * ATLAS_ROWS;
export const TERRAIN_ATLAS_KEY = "terrainAtlas";
/** Für addTilesetImage: Rand und Abstand der Kacheln im Atlas. */
export const TERRAIN_ATLAS_MARGIN = 1;
export const TERRAIN_ATLAS_SPACING = 2;

let atlasTex: any = null;
let atlasCtx: CanvasRenderingContext2D | null = null;
const tileIndex = new Map<string, number>();
let atlasDirty = false;

function blitTile(index: number, img: Img): void {
  const col = index % ATLAS_COLS, row = Math.floor(index / ATLAS_COLS);
  // Mit 1 px Rand: Randpixel werden nach außen kopiert
  const ext = newImg(SLOT, SLOT);
  for (let y = 0; y < SLOT; y++) for (let x = 0; x < SLOT; x++) {
    const sx = Math.min(TILE_PX - 1, Math.max(0, x - 1)), sy = Math.min(TILE_PX - 1, Math.max(0, y - 1));
    const i = (sy * TILE_PX + sx) * 4, o = (y * SLOT + x) * 4;
    ext.d[o] = img.d[i]; ext.d[o + 1] = img.d[i + 1]; ext.d[o + 2] = img.d[i + 2]; ext.d[o + 3] = 255;
  }
  const id = new ImageData(ext.d, SLOT, SLOT);
  atlasCtx!.putImageData(id, col * SLOT, row * SLOT);
  atlasDirty = true;
}

/** Atlas-Index der Kachel mit diesen 4 Ecken (oben links, oben rechts, unten links, unten rechts). */
function tileIndexFor(c00: number, c10: number, c01: number, c11: number, variant: number): number {
  const uniform = c00 === c10 && c00 === c01 && c00 === c11;
  const v = uniform ? variant : 0;
  const key = `${c00}${c10}${c01}${c11}${v}`;
  let idx = tileIndex.get(key);
  if (idx !== undefined) return idx;
  if (tileIndex.size >= ATLAS_CAPACITY) {
    // Atlas voll: volle Kachel der Bodenart oben links
    return tileIndexFor(c00, c00, c00, c00, 0);
  }
  idx = tileIndex.size;
  tileIndex.set(key, idx);
  blitTile(idx, compositeTile([c00, c10, c01, c11], v));
  return idx;
}

/** Kachel-Indizes eines Chunks (32 × 32) für Phaser make.tilemap({ data }). */
export function chunkTileData(cx: number, cy: number, tilesPerChunk: number, seed: number): number[][] {
  const rows: number[][] = [];
  const i0 = cx * tilesPerChunk, j0 = cy * tilesPerChunk;
  for (let lj = 0; lj < tilesPerChunk; lj++) {
    const row: number[] = [];
    for (let li = 0; li < tilesPerChunk; li++) {
      const i = i0 + li, j = j0 + lj;
      row.push(tileIndexFor(
        vertexTerrain(i, j, seed), vertexTerrain(i + 1, j, seed),
        vertexTerrain(i, j + 1, seed), vertexTerrain(i + 1, j + 1, seed),
        Math.floor(hash2(i, j, seed + 77) * VARIANTS),
      ));
    }
    rows.push(row);
  }
  return rows;
}

/** Neu gezeichnete Kacheln an die Grafikkarte geben (einmal nach dem Laden eines Chunks). */
export function flushTerrainAtlas(): void {
  if (atlasDirty && atlasTex) {
    atlasTex.refresh();
    atlasDirty = false;
  }
}

// ────────────────────────────────────────
// Hindernisse
// ────────────────────────────────────────

export const OBSTACLE_VARIANTS = 3;
const LIGHT = (() => { const l = [-0.5, -0.65, 0.75]; const n = Math.hypot(l[0], l[1], l[2]); return l.map((x) => x / n); })();

interface Circle { x: number; y: number; r: number; z?: number }

/**
 * Zeichnet eine Gruppe von Kugeln (Laub, Fels) mit Licht von oben links,
 * Farbstufen wie Pixel-Art und dunkler Umrisslinie.
 */
function drawClump(img: Img, circles: Circle[], pal: RGB[], outline: RGB, seed: number, speckle = 0.25): void {
  const mask = new Uint8Array(img.w * img.h);
  for (let y = 0; y < img.h; y++) {
    for (let x = 0; x < img.w; x++) {
      let best = -1, nx = 0, ny = 0, nz = 0;
      for (const c of circles) {
        const dx = (x + 0.5 - c.x) / c.r, dy = (y + 0.5 - c.y) / c.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= 1) continue;
        const h = Math.sqrt(1 - d2);
        const hz = h + (c.z ?? 0);
        if (hz > best) { best = hz; nx = dx; ny = dy; nz = h; }
      }
      if (best < 0) continue;
      mask[y * img.w + x] = 1;
      const l = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
      let t = (l + 0.25) / 1.2 + (hash2(x, y, seed) - 0.5) * speckle;
      t = Math.min(0.999, Math.max(0, t));
      put(img, x, y, pal[Math.floor(t * pal.length)]);
    }
  }
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    if (!mask[y * img.w + x]) continue;
    const edge = x === 0 || y === 0 || x === img.w - 1 || y === img.h - 1
      || !mask[y * img.w + x - 1] || !mask[y * img.w + x + 1] || !mask[(y - 1) * img.w + x] || !mask[(y + 1) * img.w + x];
    if (edge) put(img, x, y, outline);
  }
}

function shadow(img: Img, cx: number, cy: number, rx: number, ry: number, alpha = 70): void {
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dx * dx + dy * dy < 1) put(img, x, y, [10, 20, 10], alpha);
  }
}

function ring(r: () => number, cx: number, cy: number, R: number, n: number, cr: number, jitter = 0.25): Circle[] {
  const out: Circle[] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + r() * 0.5;
    const d = R * (1 - jitter / 2 + r() * jitter);
    out.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: cr * (0.85 + r() * 0.3) });
  }
  return out;
}

const PAL = {
  oak: ["#1d4c22", "#2a662b", "#378235", "#4b9d41", "#6dbd55"].map(hex),
  birch: ["#3a6828", "#4b8632", "#62a43e", "#82c052", "#a8d872"].map(hex),
  alder: ["#273f21", "#33522a", "#426531", "#527b3b", "#67924a"].map(hex),
  bush: ["#1f4426", "#2a5a2e", "#386f35", "#4a873f", "#64a04e"].map(hex),
  rock: ["#46464e", "#5e5e67", "#787882", "#9696a0", "#b6b6c0"].map(hex),
  sandrock: ["#6e5f45", "#887659", "#a08d6c", "#b8a581", "#d0bd97"].map(hex),
  bark: ["#3b2715", "#553a20", "#6c4a2a", "#86603a"].map(hex),
  cactus: ["#2c5a2a", "#387034", "#468a40", "#5aa450"].map(hex),
};

function obstacleImage(kind: string, v: number): { img: Img; crown?: Img } {
  const k = OBSTACLE_KINDS[kind];
  const r = worldSizeFromLength(k.lengthCm) / 2;
  const rnd = rngFor(hash2(v, kind.length * 31 + kind.charCodeAt(0), 4242) * 1e9);
  const seed = 5000 + kind.charCodeAt(0) * 13 + kind.length * 7 + v * 101;

  if (k.crownCm) {
    const cr = worldSizeFromLength(k.crownCm) / 2;
    // Unterteil: Schatten der Krone + Stamm
    const S = Math.ceil(2 * (cr * 0.8 + 8));
    const base = newImg(S, S);
    const c = S / 2;
    shadow(base, c + 5, c + 7, cr * 0.78, cr * 0.62, 60);
    if (kind === "birch") {
      drawClump(base, [{ x: c, y: c, r }], ["#4a4a46", "#b8b8ae", "#d8d8ce", "#efefe6"].map(hex), hex("#3a3a36"), seed, 0.1);
      for (let i = 0; i < 4; i++) { const a = rnd() * Math.PI * 2, d = rnd() * r * 0.7; put(base, c + Math.cos(a) * d, c + Math.sin(a) * d, hex("#2a2a28")); }
    } else {
      drawClump(base, [{ x: c, y: c, r }], PAL.bark, hex("#2a1a0c"), seed, 0.2);
    }
    // Krone
    const CS = Math.ceil(2 * cr + 4);
    const crown = newImg(CS, CS);
    const cc = CS / 2;
    const pal = kind === "birch" ? PAL.birch : kind === "swamp_tree" ? PAL.alder : PAL.oak;
    const circles: Circle[] = [{ x: cc, y: cc, r: cr * 0.55, z: 0.15 }];
    circles.push(...ring(rnd, cc, cc, cr * 0.5, 7, cr * 0.42));
    circles.push(...ring(rnd, cc, cc, cr * 0.22, 3, cr * 0.32).map((ci) => ({ ...ci, z: 0.3 })));
    drawClump(crown, circles, pal, hex(kind === "swamp_tree" ? "#18281a" : "#143618"), seed, 0.35);
    return { img: base, crown };
  }

  const pad = 5;
  const S = Math.ceil(2 * (r + pad));
  const img = newImg(S, S);
  const c = S / 2;
  switch (kind) {
    case "rock":
    case "boulder": {
      shadow(img, c + 2, c + 3, r * 0.95, r * 0.8);
      const n = kind === "boulder" ? 3 : 2;
      const circles: Circle[] = [{ x: c - r * 0.1, y: c - r * 0.1, r: r * 0.8, z: 0.1 }, ...ring(rnd, c, c, r * 0.35, n, r * 0.6, 0.4)];
      drawClump(img, circles, PAL.rock, hex("#2e2e34"), seed, 0.18);
      if (kind === "boulder") { let x = c - r * 0.3, y = c - r * 0.5; for (let i = 0; i < r * 0.8; i++) { put(img, x, y, hex("#3c3c44")); x += rnd() < 0.5 ? 1 : 0; y += 1; } }
      if (v === 2) for (let i = 0; i < r * 1.5; i++) { const a = -Math.PI / 2 + (rnd() - 0.5) * 1.6, d = rnd() * r * 0.6; put(img, c + Math.cos(a) * d, c - r * 0.3 + Math.sin(a) * d * 0.6, hex(rnd() < 0.5 ? "#5f8a3a" : "#4b7430")); }
      break;
    }
    case "stump": {
      shadow(img, c + 2, c + 3, r, r * 0.85);
      drawClump(img, [{ x: c, y: c, r }], PAL.bark, hex("#2a1a0c"), seed, 0.15);
      const wood = hex("#c49a62"), line = hex("#93703f");
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
        if (d < r * 0.78) put(img, x, y, Math.floor(d / 2.2 + hash2(x, y, seed) * 0.4) % 2 === 0 ? wood : line);
      }
      break;
    }
    case "cactus": {
      shadow(img, c + 2, c + 3, r, r * 0.8);
      drawClump(img, [{ x: c, y: c, r }], PAL.cactus, hex("#1e3d1d"), seed, 0.08);
      const ribs = 8;
      for (let k2 = 0; k2 < ribs; k2++) {
        const a = (k2 / ribs) * Math.PI * 2;
        for (let d = 2; d < r - 1; d++) put(img, c + Math.cos(a) * d, c + Math.sin(a) * d, hex("#24481f"), 180);
        put(img, c + Math.cos(a + 0.2) * (r - 0.5), c + Math.sin(a + 0.2) * (r - 0.5), hex("#f2e8a0"));
      }
      if (v === 1) { put(img, c, c, hex("#f06aa0")); put(img, c + 1, c, hex("#f06aa0")); put(img, c, c + 1, hex("#ffd0e0")); }
      break;
    }
    case "pillar": {
      shadow(img, c + 3, c + 4, r, r);
      const half = r * 0.9;
      for (let y = Math.floor(c - half); y < c + half; y++) for (let x = Math.floor(c - half); x < c + half; x++) {
        const ex = Math.min(x - (c - half), c + half - 1 - x), ey = Math.min(y - (c - half), c + half - 1 - y);
        if (ex + ey < 3) continue; // abgerundete Ecken
        let col = mix(hex("#6a6a78"), hex("#7a7a88"), hash2(x, y, seed));
        if (x - (c - half) < 2 || y - (c - half) < 2) col = hex("#9898a8");
        else if (c + half - 1 - x < 2 || c + half - 1 - y < 2) col = hex("#46464f");
        put(img, x, y, col);
      }
      const inset = half * 0.55;
      for (let k2 = 0; k2 < inset * 2; k2++) { put(img, c - inset + k2, c - inset, hex("#55555f")); put(img, c - inset, c - inset + k2, hex("#55555f")); }
      break;
    }
    case "bush": {
      shadow(img, c + 2, c + 3, r * 0.95, r * 0.8, 60);
      const circles: Circle[] = [{ x: c, y: c, r: r * 0.5, z: 0.1 }, ...ring(rnd, c, c, r * 0.55, 9, r * 0.4)];
      drawClump(img, circles, PAL.bush, hex("#173d1d"), seed, 0.4);
      if (v === 1) for (let i = 0; i < 7; i++) { const a = rnd() * Math.PI * 2, d = rnd() * r * 0.75; put(img, c + Math.cos(a) * d, c + Math.sin(a) * d, hex("#d23a4a")); }
      break;
    }
    case "dry_bush": {
      shadow(img, c + 2, c + 3, r * 0.9, r * 0.75, 50);
      const twig = hex("#6e5638"), twigD = hex("#4a3a26");
      for (let i = 0; i < 16; i++) {
        const a = rnd() * Math.PI * 2;
        let x = c, y = c;
        const len = r * (0.5 + rnd() * 0.5);
        for (let d = 0; d < len; d++) {
          x += Math.cos(a + (rnd() - 0.5) * 0.6); y += Math.sin(a + (rnd() - 0.5) * 0.6);
          put(img, x + 1, y + 1, twigD); put(img, x, y, twig);
        }
        if (rnd() < 0.4) put(img, x, y, hex("#8a9a4a"));
      }
      break;
    }
    case "reeds": {
      shadow(img, c + 1, c + 2, r * 0.8, r * 0.65, 45);
      const blades = [hex("#4e7a2c"), hex("#65933a"), hex("#86ad4c"), hex("#a3c45e")];
      for (let i = 0; i < 26; i++) {
        const a = rnd() * Math.PI * 2;
        const len = r * (0.45 + rnd() * 0.55);
        const col = blades[Math.floor(rnd() * blades.length)];
        for (let d = 0; d < len; d++) put(img, c + Math.cos(a) * d, c + Math.sin(a) * d, col);
        if (rnd() < 0.25) {
          const hx = c + Math.cos(a) * len, hy = c + Math.sin(a) * len;
          put(img, hx, hy, hex("#5a3a1e")); put(img, hx + 1, hy, hex("#5a3a1e")); put(img, hx, hy + 1, hex("#3e2812"));
        }
      }
      break;
    }
    case "pebble":
    case "rubble": {
      const n = kind === "rubble" ? 3 : 2;
      const pal = kind === "rubble" ? PAL.rock : PAL.sandrock;
      const circles = ring(rnd, c, c, r * 0.4, n, r * 0.55, 0.6);
      for (const ci of circles) shadow(img, ci.x + 1, ci.y + 1, ci.r, ci.r * 0.8, 60);
      drawClump(img, circles, pal, hex("#3a332a"), seed, 0.1);
      break;
    }
  }
  return { img };
}

function toCanvas(img: Img): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = img.w; cv.height = img.h;
  cv.getContext("2d")!.putImageData(new ImageData(img.d, img.w, img.h), 0, 0);
  return cv;
}

export function obstacleTextureKey(o: ObstacleInstance): string {
  return `obs_${o.kind}_${Math.min(OBSTACLE_VARIANTS - 1, Math.floor(o.variant * OBSTACLE_VARIANTS))}`;
}
export function crownTextureKey(o: ObstacleInstance): string {
  return `crown_${o.kind}_${Math.min(OBSTACLE_VARIANTS - 1, Math.floor(o.variant * OBSTACLE_VARIANTS))}`;
}

const NEAREST = 1; // Phaser.Textures.FilterMode.NEAREST — scharfe Pixel beim Zoomen

/**
 * Legt Atlas und Hindernis-Texturen an. In GameScene.preload() aufrufen,
 * bevor Chunks geladen werden.
 */
export function initTerrainArt(scene: any): void {
  if (!scene.textures.exists(TERRAIN_ATLAS_KEY)) {
    atlasTex = scene.textures.createCanvas(TERRAIN_ATLAS_KEY, ATLAS_COLS * SLOT, ATLAS_ROWS * SLOT);
    atlasCtx = atlasTex.getContext();
    atlasTex.setFilter?.(NEAREST);
    tileIndex.clear();
  }
  for (const kind of Object.keys(OBSTACLE_KINDS)) {
    for (let v = 0; v < OBSTACLE_VARIANTS; v++) {
      const key = `obs_${kind}_${v}`;
      if (scene.textures.exists(key)) continue;
      const { img, crown } = obstacleImage(kind, v);
      scene.textures.addCanvas(key, toCanvas(img))?.setFilter?.(NEAREST);
      if (crown) scene.textures.addCanvas(`crown_${kind}_${v}`, toCanvas(crown))?.setFilter?.(NEAREST);
    }
  }
}

// Für Tests/Vorschau ohne Phaser: Kachel und Hindernis als Pixel
export const __art = { compositeTile, makeGround, obstacleImage, alphaAt };
