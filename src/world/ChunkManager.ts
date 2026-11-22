// ============================================================
// CHUNK MANAGER
// Absorb & Evolve — Dynamisches Laden und Entladen von Chunks
//
// Kein Phaser-Import (scene wird als any übergeben).
// Verwaltet LoadedChunks, Entity-Lifecycle und KI-Aktivierung.
// ============================================================

import type { ChunkDef, LoadedChunk } from "./Chunk.js";
import {
  CHUNK_PX, TILE_PX, TILES_PER_CHUNK,
  RENDER_RADIUS, ACTIVE_RADIUS, UNLOAD_RADIUS,
  WORLD_CHUNKS_X, WORLD_CHUNKS_Y, CHUNK_TICK_MS,
  chunkKey,
} from "./Chunk.js";
import { generateChunk } from "./WorldGenerator.js";
import { chunkObstacles } from "./Terrain.js";
import {
  chunkTileData, flushTerrainAtlas, obstacleTextureKey, crownTextureKey,
  TERRAIN_ATLAS_KEY, TERRAIN_ATLAS_MARGIN, TERRAIN_ATLAS_SPACING,
} from "./TilesetGenerator.js";
import { OBSTACLE_KINDS } from "../data/terrain.js";
import type { GameState } from "../types/GameState.js";
import type { EntityInstance } from "../types/Entity.js";
import { ENTITY_MAP } from "../data/entities.js";

// ────────────────────────────────────────
// Typen
// ────────────────────────────────────────

/** Cache für tote Entities: Chunk-Key → Entity-Instanz-Infos */
interface DeadEntityRecord {
  defId: string;
  localX: number;
  localY: number;
  respawnAt: number;
}

// Zeichenreihenfolge (GDD-12): Boden < Steine/Stämme < Wesen (0) < Gestrüpp < Kronen < HP-Balken (10)
const DEPTH_GROUND = -2;
const DEPTH_LOW_OBSTACLE = -1;
const DEPTH_OVERHEAD = 8;
const DEPTH_CROWN = 9;
/** Durchsichtigkeit von Kronen und Gestrüpp, unter denen der Blob gerade ist. */
const OVERHEAD_FADE_ALPHA = 0.3;

// ────────────────────────────────────────
// ChunkManager
// ────────────────────────────────────────

export class ChunkManager {
  private scene: any;
  private gameState: GameState;

  private loadedChunks: Map<string, LoadedChunk> = new Map();
  /** Callback zum Erstellen eines Entity-Sprites (liefert das Sprite zurück) */
  private createEntitySprite: (instance: EntityInstance) => any;
  /** Callback zum Entfernen eines Entity-Sprites */
  private removeEntitySprite: (instanceId: string) => void;

  /** Dead entity cache: chunkKey → Liste toter Entities mit respawnAt */
  private deadCache: Map<string, DeadEntityRecord[]> = new Map();

  private lastTickTime = 0;
  private lastCx = -999;
  private lastCy = -999;

  constructor(
    scene: any,
    gameState: GameState,
    createEntitySprite: (instance: EntityInstance) => any,
    removeEntitySprite: (instanceId: string) => void,
  ) {
    this.scene = scene;
    this.gameState = gameState;
    this.createEntitySprite = createEntitySprite;
    this.removeEntitySprite = removeEntitySprite;
  }

  // ────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────

  /**
   * Aufzurufen in GameScene.update().
   * Prüft alle CHUNK_TICK_MS ob Chunks geladen/entladen werden müssen.
   */
  tick(px: number, py: number, now: number): void {
    if (now - this.lastTickTime < CHUNK_TICK_MS) return;
    this.lastTickTime = now;

    const cx = Math.floor(px / CHUNK_PX);
    const cy = Math.floor(py / CHUNK_PX);

    // Nur wenn Chunk-Position sich geändert hat (oder erster Tick)
    if (cx === this.lastCx && cy === this.lastCy && this.loadedChunks.size > 0) return;
    this.lastCx = cx;
    this.lastCy = cy;

    this.updateChunks(cx, cy);
  }

  /**
   * Welche Chunks sollen jetzt KI-simuliert werden?
   * Gibt alle instanceIds in ACTIVE_RADIUS-Chunks zurück.
   */
  getActiveEntityIds(): Set<string> {
    const active = new Set<string>();
    for (const [key, chunk] of this.loadedChunks) {
      const [kcx, kcy] = key.split(",").map(Number);
      if (
        Math.abs(kcx - this.lastCx) <= ACTIVE_RADIUS &&
        Math.abs(kcy - this.lastCy) <= ACTIVE_RADIUS
      ) {
        for (const id of chunk.instanceIds) active.add(id);
      }
    }
    return active;
  }

  isChunkLoaded(cx: number, cy: number): boolean {
    return this.loadedChunks.has(chunkKey(cx, cy));
  }

  // ────────────────────────────────────────
  // Chunk-Verwaltung
  // ────────────────────────────────────────

  private updateChunks(cx: number, cy: number): void {
    // Chunks zum Laden ermitteln
    const toLoad: string[] = [];
    for (let dy = -RENDER_RADIUS; dy <= RENDER_RADIUS; dy++) {
      for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++) {
        const ncx = cx + dx;
        const ncy = cy + dy;
        if (ncx < 0 || ncy < 0 || ncx >= WORLD_CHUNKS_X || ncy >= WORLD_CHUNKS_Y) continue;
        const key = chunkKey(ncx, ncy);
        if (!this.loadedChunks.has(key)) toLoad.push(key);
      }
    }

    // Chunks zum Entladen ermitteln
    const toUnload: string[] = [];
    for (const [key] of this.loadedChunks) {
      const [kcx, kcy] = key.split(",").map(Number);
      if (
        Math.abs(kcx - cx) > UNLOAD_RADIUS ||
        Math.abs(kcy - cy) > UNLOAD_RADIUS
      ) {
        toUnload.push(key);
      }
    }

    // Entladen zuerst (Ressourcen freigeben)
    for (const key of toUnload) this.unloadChunk(key);

    // Laden
    for (const key of toLoad) {
      const [ncx, ncy] = key.split(",").map(Number);
      this.loadChunk(ncx, ncy);
    }
  }

  /**
   * Kronen und Gestrüpp über dem Blob werden durchsichtig, damit man ihn
   * (und was um ihn ist) sieht. Begründung (Vorschlag Claude, offen): Kronen
   * verdecken sonst große Teile des Bildes, besonders beim winzigen Blob am Anfang.
   */
  updateOverhead(px: number, py: number, blobRadius: number): void {
    const cx = Math.floor(px / CHUNK_PX), cy = Math.floor(py / CHUNK_PX);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const chunk = this.loadedChunks.get(chunkKey(cx + dx, cy + dy));
      if (!chunk) continue;
      for (const o of chunk.overhead) {
        const reach = o.r + blobRadius + 4;
        const ddx = o.x - px, ddy = o.y - py;
        const target = ddx * ddx + ddy * ddy < reach * reach ? OVERHEAD_FADE_ALPHA : 1;
        const a = o.sprite.alpha;
        if (a !== target) o.sprite.setAlpha(Math.abs(target - a) < 0.02 ? target : a + (target - a) * 0.2);
      }
    }
  }

  private loadChunk(cx: number, cy: number): void {
    const key = chunkKey(cx, cy);
    if (this.loadedChunks.has(key)) return;

    const def: ChunkDef = generateChunk(cx, cy, this.gameState.world.worldSeed);

    // Boden: Phaser-Tilemap aus berechneten Übergangskacheln (GDD-12)
    const seed = this.gameState.world.worldSeed;
    const tilemap = this.scene.make.tilemap({
      data: chunkTileData(cx, cy, TILES_PER_CHUNK, seed),
      tileWidth: TILE_PX,
      tileHeight: TILE_PX,
    });
    flushTerrainAtlas();
    const tileset = tilemap.addTilesetImage(
      TERRAIN_ATLAS_KEY, TERRAIN_ATLAS_KEY, TILE_PX, TILE_PX, TERRAIN_ATLAS_MARGIN, TERRAIN_ATLAS_SPACING,
    );
    const layer = tilemap.createLayer(0, tileset, cx * CHUNK_PX, cy * CHUNK_PX);
    layer.setDepth(DEPTH_GROUND);

    // Hindernisse: Unterteil unter den Wesen, Kronen und Gestrüpp darüber
    const sprites: any[] = [];
    const overhead: LoadedChunk["overhead"] = [];
    for (const o of chunkObstacles(cx, cy, seed)) {
      const kind = OBSTACLE_KINDS[o.kind];
      if (kind?.overhead) {
        const sp = this.scene.add.image(o.x, o.y, obstacleTextureKey(o)).setDepth(DEPTH_OVERHEAD);
        sprites.push(sp);
        overhead.push({ sprite: sp, x: o.x, y: o.y, r: o.r });
        continue;
      }
      sprites.push(this.scene.add.image(o.x, o.y, obstacleTextureKey(o)).setDepth(DEPTH_LOW_OBSTACLE));
      if (o.crownR) {
        const crown = this.scene.add.image(o.x, o.y - 2, crownTextureKey(o)).setDepth(DEPTH_CROWN);
        sprites.push(crown);
        overhead.push({ sprite: crown, x: o.x, y: o.y, r: o.crownR });
      }
    }

    // Entities spawnen
    const instanceIds: string[] = [];
    const now = Date.now();
    const deadRecords = this.deadCache.get(key) ?? [];

    for (const spawn of def.spawns) {
      const def2 = ENTITY_MAP.get(spawn.defId);
      if (!def2) continue;

      // Prüfen ob Entity tot ist (aus deadCache)
      const deadIdx = deadRecords.findIndex(
        (d) => d.defId === spawn.defId && Math.abs(d.localX - spawn.localX) < 2
      );
      if (deadIdx >= 0) {
        const dead = deadRecords[deadIdx];
        if (now < dead.respawnAt) {
          // Noch nicht respawnt — überspringen
          continue;
        }
        deadRecords.splice(deadIdx, 1);
      }

      const instanceId = `chunk_${key}_${instanceIds.length}`;
      const worldX = cx * CHUNK_PX + spawn.localX;
      const worldY = cy * CHUNK_PX + spawn.localY;

      const instance: EntityInstance = {
        instanceId,
        definitionId: spawn.defId,
        x: worldX,
        y: worldY,
        currentHp: def2.hp ?? 10,
        isAlive: true,
        isAggro: false,
        statusEffects: [],
        attackCooldownRemaining: 0,
        chunkKey: key,
        bonusLevel: 0,
        skillWins: 0,
        levelingCooldown: 0,
      };

      this.gameState.world.entities.set(instanceId, instance);
      this.createEntitySprite(instance);
      instanceIds.push(instanceId);
    }

    // Dead-Cache aktualisieren (nur noch lebende Records behalten)
    if (deadRecords.length > 0) {
      this.deadCache.set(key, deadRecords);
    } else {
      this.deadCache.delete(key);
    }

    this.loadedChunks.set(key, {
      def,
      tilemap,
      tilemapLayer: layer,
      sprites,
      overhead,
      instanceIds,
      loadedAt: now,
    });

    console.log(`[Chunk] Loaded [${cx},${cy}] biome=${def.biome} entities=${instanceIds.length}`);
  }

  private unloadChunk(key: string): void {
    const chunk = this.loadedChunks.get(key);
    if (!chunk) return;

    const now = Date.now();
    const deadRecords: DeadEntityRecord[] = this.deadCache.get(key) ?? [];

    // Entities entfernen, tote cachen
    for (const instanceId of chunk.instanceIds) {
      const instance = this.gameState.world.entities.get(instanceId);
      if (instance) {
        if (!instance.isAlive && instance.respawnAt) {
          // Tote Entity im Cache merken
          const cx = chunk.def.cx;
          const cy = chunk.def.cy;
          deadRecords.push({
            defId: instance.definitionId,
            localX: instance.x - cx * CHUNK_PX,
            localY: instance.y - cy * CHUNK_PX,
            respawnAt: instance.respawnAt,
          });
        }
        this.gameState.world.entities.delete(instanceId);
      }
      this.removeEntitySprite(instanceId);
    }

    if (deadRecords.length > 0) {
      // Abgelaufene Einträge bereinigen
      const alive = deadRecords.filter((d) => d.respawnAt > now);
      if (alive.length > 0) this.deadCache.set(key, alive);
      else this.deadCache.delete(key);
    }

    // Phaser-Objekte freigeben
    chunk.tilemapLayer.destroy();
    chunk.tilemap.destroy();
    for (const sp of chunk.sprites) sp.destroy();

    this.loadedChunks.delete(key);
    console.log(`[Chunk] Unloaded [${key}]`);
  }
}
