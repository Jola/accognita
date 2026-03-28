// ============================================================
// CHUNK MANAGER
// Absorb & Evolve — Dynamisches Laden und Entladen von Chunks
//
// Kein Phaser-Import (scene wird als any übergeben).
// Verwaltet LoadedChunks, Entity-Lifecycle und KI-Aktivierung.
// ============================================================
import { CHUNK_PX, TILE_PX, RENDER_RADIUS, ACTIVE_RADIUS, UNLOAD_RADIUS, WORLD_CHUNKS_X, WORLD_CHUNKS_Y, CHUNK_TICK_MS, chunkKey, } from "./Chunk.js";
import { generateChunk } from "./WorldGenerator.js";
import { ENTITY_MAP } from "../data/entities.js";
// ────────────────────────────────────────
// ChunkManager
// ────────────────────────────────────────
export class ChunkManager {
    constructor(scene, gameState, createEntitySprite, removeEntitySprite) {
        this.loadedChunks = new Map();
        /** Dead entity cache: chunkKey → Liste toter Entities mit respawnAt */
        this.deadCache = new Map();
        this.lastTickTime = 0;
        this.lastCx = -999;
        this.lastCy = -999;
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
    tick(px, py, now) {
        if (now - this.lastTickTime < CHUNK_TICK_MS)
            return;
        this.lastTickTime = now;
        const cx = Math.floor(px / CHUNK_PX);
        const cy = Math.floor(py / CHUNK_PX);
        // Nur wenn Chunk-Position sich geändert hat (oder erster Tick)
        if (cx === this.lastCx && cy === this.lastCy && this.loadedChunks.size > 0)
            return;
        this.lastCx = cx;
        this.lastCy = cy;
        this.updateChunks(cx, cy);
    }
    /**
     * Welche Chunks sollen jetzt KI-simuliert werden?
     * Gibt alle instanceIds in ACTIVE_RADIUS-Chunks zurück.
     */
    getActiveEntityIds() {
        const active = new Set();
        for (const [key, chunk] of this.loadedChunks) {
            const [kcx, kcy] = key.split(",").map(Number);
            if (Math.abs(kcx - this.lastCx) <= ACTIVE_RADIUS &&
                Math.abs(kcy - this.lastCy) <= ACTIVE_RADIUS) {
                for (const id of chunk.instanceIds)
                    active.add(id);
            }
        }
        return active;
    }
    isChunkLoaded(cx, cy) {
        return this.loadedChunks.has(chunkKey(cx, cy));
    }
    // ────────────────────────────────────────
    // Chunk-Verwaltung
    // ────────────────────────────────────────
    updateChunks(cx, cy) {
        // Chunks zum Laden ermitteln
        const toLoad = [];
        for (let dy = -RENDER_RADIUS; dy <= RENDER_RADIUS; dy++) {
            for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++) {
                const ncx = cx + dx;
                const ncy = cy + dy;
                if (ncx < 0 || ncy < 0 || ncx >= WORLD_CHUNKS_X || ncy >= WORLD_CHUNKS_Y)
                    continue;
                const key = chunkKey(ncx, ncy);
                if (!this.loadedChunks.has(key))
                    toLoad.push(key);
            }
        }
        // Chunks zum Entladen ermitteln
        const toUnload = [];
        for (const [key] of this.loadedChunks) {
            const [kcx, kcy] = key.split(",").map(Number);
            if (Math.abs(kcx - cx) > UNLOAD_RADIUS ||
                Math.abs(kcy - cy) > UNLOAD_RADIUS) {
                toUnload.push(key);
            }
        }
        // Entladen zuerst (Ressourcen freigeben)
        for (const key of toUnload)
            this.unloadChunk(key);
        // Laden
        for (const key of toLoad) {
            const [ncx, ncy] = key.split(",").map(Number);
            this.loadChunk(ncx, ncy);
        }
    }
    loadChunk(cx, cy) {
        const key = chunkKey(cx, cy);
        if (this.loadedChunks.has(key))
            return;
        const def = generateChunk(cx, cy, this.gameState.world.worldSeed);
        // Phaser Tilemap erstellen
        const tilemap = this.scene.make.tilemap({
            data: def.tileIndices,
            tileWidth: TILE_PX,
            tileHeight: TILE_PX,
        });
        const tileset = tilemap.addTilesetImage("worldTileset", "worldTileset", TILE_PX, TILE_PX, 0, 0);
        const layer = tilemap.createLayer(0, tileset, cx * CHUNK_PX, cy * CHUNK_PX);
        layer.setDepth(-1);
        // Entities spawnen
        const instanceIds = [];
        const now = Date.now();
        const deadRecords = this.deadCache.get(key) ?? [];
        for (const spawn of def.spawns) {
            const def2 = ENTITY_MAP.get(spawn.defId);
            if (!def2)
                continue;
            // Prüfen ob Entity tot ist (aus deadCache)
            const deadIdx = deadRecords.findIndex((d) => d.defId === spawn.defId && Math.abs(d.localX - spawn.localX) < 2);
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
            const instance = {
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
        }
        else {
            this.deadCache.delete(key);
        }
        this.loadedChunks.set(key, {
            def,
            tilemap,
            tilemapLayer: layer,
            instanceIds,
            loadedAt: now,
        });
        console.log(`[Chunk] Loaded [${cx},${cy}] biome=${def.biome} entities=${instanceIds.length}`);
    }
    unloadChunk(key) {
        const chunk = this.loadedChunks.get(key);
        if (!chunk)
            return;
        const now = Date.now();
        const deadRecords = this.deadCache.get(key) ?? [];
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
            if (alive.length > 0)
                this.deadCache.set(key, alive);
            else
                this.deadCache.delete(key);
        }
        // Phaser-Objekte freigeben
        chunk.tilemapLayer.destroy();
        chunk.tilemap.destroy();
        this.loadedChunks.delete(key);
        console.log(`[Chunk] Unloaded [${key}]`);
    }
}
//# sourceMappingURL=ChunkManager.js.map