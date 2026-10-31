// ============================================================
// GAME SCENE
// Absorb & Evolve — Phaser Scene für das Hauptspiel
//
// Diese Datei ist die einzige die Phaser, DOM und Browser kennt.
// Alle Spiellogik kommt aus systems/ und data/.
// ============================================================

// Phaser wird als globales `Phaser` aus dem CDN geladen.
declare const Phaser: any;

import { createInitialGameState } from "../types/GameState.js";
import type { GameState } from "../types/GameState.js";
import { ALL_SKILLS } from "../data/skills.js";
import { MATERIAL_MAP } from "../data/materials.js";
import { ENTITY_MAP, ENTITY_DEFINITIONS } from "../data/entities.js";
import {
  discoverSkill,
  combineSkills,
  getDiscoveredSkillsSorted,
  gainSkillXp,
  updatePlayerGrowth,
  calcMaxHp,
  calcMaxMp,
} from "../systems/SkillSystem.js";
import {
  tickProgression,
  settleAfterLoad,
  getRankInfo,
  getCapacityInfo,
  calcGrowth,
  getLearningEffort,
  getCorePractice,
  getEntitySkillPractice,
  rankNameForPractice,
} from "../systems/ProgressionSystem.js";
import type { GainResult, ProgressionEvent, RankInfo } from "../systems/ProgressionSystem.js";
import {
  absorbEntity,
  analyzeEntity,
  findNearestEntity,
  processRespawns,
  calcSuccessChance,
} from "../systems/EntitySystem.js";
import {
  useGrow,
  getMaterialList,
} from "../systems/MaterialSystem.js";
import type { EntityInstance } from "../types/Entity.js";
import type { HitGrade } from "../types/Combat.js";
import { createJoystick, type JoystickState } from "../ui/Joystick.js";
import { createSkillBar, type SkillBarState } from "../ui/SkillBar.js";
import { createSkillMenu } from "../ui/SkillMenu.js";
import { createSaveMenu } from "../ui/SaveMenu.js";
import { createGameMenu } from "../ui/GameMenu.js";
import { saveToSlot, loadFromSlot, deleteAllSaves } from "../systems/SaveSystem.js";
import {
  calcEntityAi,
  tickAttackCooldown,
  tickRangedCooldown,
  setAttackCooldown,
  setRangedCooldown,
  resetAi,
} from "../systems/AiSystem.js";
import {
  getEffectiveLevel,
  getScaledMaxHp,
  getScaledDamage,
  getScaledSpeed,
  getEntityBaseDamage,
  findLevelingPrey,
  processEntityVictory,
  canFight,
} from "../systems/EntityLevelingSystem.js";
import {
  playerAttack,
  entityAttack,
  entityRangedAttack,
  canActivateSkill,
  consumeSkill,
  executeJump,
  executeCheckpoint,
  regenMp,
} from "../systems/CombatSystem.js";
import {
  processTicks,
  applyEffect,
  removeExpiredEffects,
  syncPassiveEffects,
  refreshPassiveEffectValues,
} from "../systems/StatusEffectSystem.js";
import {
  PLAYER_WORLD_RADIUS_MIN,
  PLAYER_WORLD_RADIUS_MAX,
  PLAYER_SIZE_GROWTH_MAX,
  PLAYER_SCREEN_RADIUS,
  PLAYER_SPEED_PER_WORLD_RADIUS,
  toDisplayHp,
} from "../data/balance.js";
import { generateTileset, TILE_SIZE } from "../world/TilesetGenerator.js";
import { ChunkManager } from "../world/ChunkManager.js";
import { CHUNK_PX, WORLD_CHUNKS_X, WORLD_CHUNKS_Y } from "../world/Chunk.js";

// ============================================================
// BOOT SCENE
// ============================================================
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }
  create() {
    this.scene.start("GameScene");
  }
}

// ============================================================
// GAME SCENE — Hauptspiel
// ============================================================
export class GameScene extends Phaser.Scene {
  private gameState!: GameState;

  private blobGraphic!: any;
  private entitySprites: Map<string, any> = new Map();
  private chunkManager!: ChunkManager;

  private joy!: JoystickState;

  private lastNearbyId: string | null = null;
  private gamePaused = false;
  private pauseReasons = new Set<"fullscreen" | "ui">();
  private hpBarGraphics!: any;
  private skillBar!: SkillBarState;
  private playtimeAccumulator = 0; // Sekunden akkumulieren für player.playtimeSeconds

  constructor() {
    super({ key: "GameScene" });
  }

  preload() {
    generateTileset(this);
  }

  create() {
    this.gameState = createInitialGameState();

    this.createWorld();
    this.createPlayer();
    this.setupJoystick();
    this.setupFullscreen();
    this.setupGlobalFunctions();

    // HP-Bar-Layer über allem (depth: 10)
    this.hpBarGraphics = this.add.graphics().setDepth(10);

    // Passive Skills als permanente StatusEffekte initialisieren
    syncPassiveEffects(this.gameState.player);

    (window as any).gameState    = this.gameState;
    (window as any).gameScene    = this;
    (window as any).__ALL_SKILLS = ALL_SKILLS;

    this.setupSkillBar();
    this.setupSaveMenu();
    this.setupGameMenu();

    this.cameras.main.startFollow(this.blobGraphic, true, 1.0, 1.0);
    this.updateCameraZoom(); // Zoom passend zur Startgröße

    updateUI(this.gameState);
    addLog("Du erwachst als Blob…", "system");
    addLog("Joystick bewegen · ABSORB + ANALYZE tippen", "system");
  }

  // ----------------------------------------------------------
  // WELT
  // ----------------------------------------------------------
  private createWorld() {
    const worldW = WORLD_CHUNKS_X * CHUNK_PX; // 20480
    const worldH = WORLD_CHUNKS_Y * CHUNK_PX; // 20480

    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);

    this.chunkManager = new ChunkManager(
      this,
      this.gameState,
      (instance) => this.spawnEntitySprite(instance),
      (instanceId) => this.despawnEntitySprite(instanceId),
    );

    // Initialen Tick sofort auslösen (Spielerstart in Chunk 0,0)
    this.chunkManager.tick(
      this.gameState.player.x,
      this.gameState.player.y,
      Date.now() - 1000, // force: lastTickTime so alt, dass Bedingung greift
    );
  }

  // ────────────────────────────────────────
  // Entity-Sprite: Erstellen / Entfernen
  // ────────────────────────────────────────

  private spawnEntitySprite(instance: EntityInstance): any {
    const def = ENTITY_MAP.get(instance.definitionId);
    if (!def) return null;

    // Emoji in hoher Qualität rendern, dann in Weltgröße skalieren
    const RENDER_FONT = 28;
    const worldSize = def.worldSize ?? 5;
    const text = this.add
      .text(instance.x, instance.y, def.icon, { fontSize: `${RENDER_FONT}px` })
      .setOrigin(0.5)
      .setScale(worldSize / RENDER_FONT)
      .setInteractive();

    text.on("pointerdown", () => {
      const dist = Math.hypot(
        this.gameState.player.x - instance.x,
        this.gameState.player.y - instance.y,
      );
      if (dist > this.getPlayerAttackRange()) {
        showToast("Näher herangehen!", "system");
        return;
      }
      // Tap zeigt Info — kein automatisches Absorb mehr
      this.lastNearbyId = instance.instanceId;
      updateNearbyPanel(def, instance, this.gameState);
    });

    // Float-Phase für jede Entity individuell — wird in updateEntityVisuals() genutzt
    (text as any).floatPhase = Math.random() * Math.PI * 2;

    this.entitySprites.set(instance.instanceId, text);
    return text;
  }

  private despawnEntitySprite(instanceId: string): void {
    const sprite = this.entitySprites.get(instanceId);
    if (sprite) {
      this.tweens.killTweensOf(sprite);
      sprite.destroy();
      this.entitySprites.delete(instanceId);
    }
  }

  // ----------------------------------------------------------
  // SPIELER
  // ----------------------------------------------------------
  private createPlayer() {
    const g = this.add.graphics();
    g.fillStyle(0x20a860);
    g.fillCircle(20, 20, 18);
    g.fillStyle(0x40e890);
    g.fillCircle(20, 20, 15);
    g.fillStyle(0x90ffcc, 0.7);
    g.fillCircle(14, 14, 7);
    g.generateTexture("blob", 40, 40);
    g.destroy();

    this.blobGraphic = this.physics.add.image(
      this.gameState.player.x,
      this.gameState.player.y,
      "blob"
    );
    this.blobGraphic.setCollideWorldBounds(true);
    // Wobble wird in update() per Math.sin berechnet (kein Tween — kein Konflikt mit Skalierung)
  }

  // Berechnet den Welt-Radius des Blobs aus seinem stetigen Wachstum.
  // Wächst linear von PLAYER_WORLD_RADIUS_MIN bis PLAYER_WORLD_RADIUS_MAX.
  private calcPlayerWorldRadius(): number {
    const growth = calcGrowth(this.gameState.player.lifetimeXp);
    const t = Math.min(growth / PLAYER_SIZE_GROWTH_MAX, 1.0);
    return PLAYER_WORLD_RADIUS_MIN + t * (PLAYER_WORLD_RADIUS_MAX - PLAYER_WORLD_RADIUS_MIN);
  }

  // Nahkampf-Angriffsreichweite des Blobs in Weltpixeln.
  // = Rand des Charakters + nochmal eine Charaktergröße = 2 × worldRadius.
  private getPlayerAttackRange(): number {
    return this.calcPlayerWorldRadius() * 2;
  }

  // Passt Kamera-Zoom an die aktuelle Größe des Blobs an.
  // Blob erscheint immer PLAYER_SCREEN_RADIUS px groß.
  private updateCameraZoom(): void {
    const worldRadius = this.calcPlayerWorldRadius();
    this.cameras.main.setZoom(PLAYER_SCREEN_RADIUS / worldRadius);
  }

  // ----------------------------------------------------------
  // JOYSTICK (Mobile)
  // ----------------------------------------------------------
  private setupJoystick() {
    const container = document.getElementById("touchControls");
    if (!container) return;
    this.joy = createJoystick(container);
  }

  // ----------------------------------------------------------
  // VOLLBILD
  // ----------------------------------------------------------
  private setupFullscreen() {
    const btn = document.getElementById("btnFullscreen") as HTMLButtonElement | null;

    const updateBtn = (isFs: boolean) => {
      if (!btn) return;
      btn.textContent = isFs ? "✕" : "⛶";
      btn.title = isFs ? "Vollbild beenden" : "Vollbild";
    };

    const onChange = () => {
      const isFs = isFullscreen();
      updateBtn(isFs);
      if (!isFs) {
        this.pauseGame();
      } else {
        this.resumeGame();
      }
    };

    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);

    btn?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isFullscreen()) {
        this.exitFullscreen();
      } else {
        this.enterFullscreen();
      }
    });

    // Gespielt wird nur im Vollbild. Ohne Fullscreen-API (iPhone-Safari) läuft
    // das Spiel trotzdem, sonst wäre es dort gar nicht spielbar.
    if (fullscreenSupported() && !isFullscreen()) this.pauseGame();
  }

  private enterFullscreen() {
    const el = document.documentElement as any;
    try {
      if (el.requestFullscreen)             { el.requestFullscreen(); }
      else if (el.webkitRequestFullscreen)  { el.webkitRequestFullscreen(); }
    } catch (_) {}
  }

  private exitFullscreen() {
    try {
      if ((document as any).exitFullscreen)        { (document as any).exitFullscreen(); }
      else if ((document as any).webkitExitFullscreen) { (document as any).webkitExitFullscreen(); }
    } catch (_) {}
  }

  // Das Spiel läuft nur, wenn kein Pause-Grund aktiv ist. So setzt das Schließen
  // eines Menüs das Spiel nicht fort, solange der Vollbildmodus verlassen ist.
  private setPaused(reason: "fullscreen" | "ui", on: boolean) {
    if (on) this.pauseReasons.add(reason);
    else this.pauseReasons.delete(reason);

    const paused = this.pauseReasons.size > 0;
    if (paused !== this.gamePaused) {
      this.gamePaused = paused;
      if (paused) this.physics.pause();
      else this.physics.resume();
    }
    // Pause-Overlay nur zeigen, wenn kein Menü darüber liegt
    document.getElementById("pauseOverlay")?.classList.toggle(
      "visible",
      this.pauseReasons.has("fullscreen") && !this.pauseReasons.has("ui")
    );
  }

  private pauseGame()  { this.setPaused("fullscreen", true); }
  private resumeGame() { this.setPaused("fullscreen", false); }

  // ----------------------------------------------------------
  // SKILL BAR + SKILL MENU
  // ----------------------------------------------------------
  private setupSkillBar() {
    const container = document.getElementById("skillBarWrap");
    if (!container) return;

    // Closure: menuRef wird erst nach createSkillMenu gesetzt,
    // aber erst beim ersten Öffnen aufgerufen → kein doppeltes Erstellen nötig.
    let menuRef: { open(): void; close(): void } | null = null;
    this.skillBar = createSkillBar(container, () => menuRef?.open());
    menuRef = createSkillMenu(this.skillBar);
  }

  /** Spiel für UI pausieren (ohne Pause-Overlay) */
  pauseForUI()  { this.setPaused("ui", true); }

  /** Spiel nach UI-Schließen fortsetzen (sofern kein anderer Pause-Grund aktiv) */
  resumeForUI() { this.setPaused("ui", false); }

  // ----------------------------------------------------------
  // SPIELMENÜ
  // ----------------------------------------------------------
  private setupGameMenu() {
    const menu = createGameMenu();
    document.getElementById("btnPanel")?.addEventListener("click", () => menu.open());
  }

  // ----------------------------------------------------------
  // SAVE MENU
  // ----------------------------------------------------------
  private setupSaveMenu() {
    const menu = createSaveMenu();
    // 💾-Button im HUD verdrahten
    document.getElementById("btnSave")?.addEventListener("click", () => menu.open());
    // Auch aus der Pause-Overlay heraus öffnen
    document.getElementById("btnSaveFromPause")?.addEventListener("click", () => menu.open());
  }

  /** Spielstand in Slot speichern */
  saveGame(slot: number) {
    // SkillBar-Slots in player.activeSkillSlots spiegeln
    if (this.skillBar) {
      for (let i = 0; i < 4; i++) {
        this.gameState.player.activeSkillSlots[i] = this.skillBar.slots[i];
      }
    }
    saveToSlot(slot, this.gameState.player, this.skillBar?.slots ?? []);
    addLog(`💾 Spielstand in Slot ${slot + 1} gespeichert.`, "system");
  }

  /** Spielstand aus Slot laden */
  loadGame(slot: number) {
    const saved = loadFromSlot(slot);
    if (!saved) {
      showToast("Speicherstand nicht gefunden.", "system");
      return;
    }

    // Spieler-State ersetzen
    this.gameState.player = saved.player;

    // Spieler-Sprite an gespeicherte Position
    this.blobGraphic.setPosition(saved.player.x, saved.player.y);

    // Ruhe seit dem Speichern verbuchen (Übertraining klingt auch offline ab)
    // und die Kapazitätsgrenze herstellen (alte Spielstände können darüber liegen)
    this.logProgressionEvents(settleAfterLoad(this.gameState.player, Date.now()));

    // maxHp/maxMp aus dem Wachstum neu berechnen (migriert alte Saves)
    const growth = calcGrowth(this.gameState.player.lifetimeXp);
    this.gameState.player.maxHp = calcMaxHp(growth);
    this.gameState.player.maxMp = calcMaxMp(growth);
    this.gameState.player.hp = Math.min(this.gameState.player.hp, this.gameState.player.maxHp);
    this.gameState.player.mp = Math.min(this.gameState.player.mp, this.gameState.player.maxMp);

    // Kamera-Zoom an die gespeicherte Größe anpassen
    this.updateCameraZoom();

    // Passive Effekte neu aufbauen
    syncPassiveEffects(this.gameState.player);

    // SkillBar-Slots wiederherstellen
    if (this.skillBar && saved.player.activeSkillSlots) {
      for (let i = 0; i < 4; i++) {
        this.skillBar.assignSlot(i, saved.player.activeSkillSlots[i] ?? null);
      }
    }

    // Entities zurücksetzen (HP, Aggro — nicht Position)
    for (const [, instance] of this.gameState.world.entities) {
      const def = ENTITY_MAP.get(instance.definitionId);
      instance.currentHp = def?.hp ?? 0;
      instance.isAggro = false;
      instance.statusEffects = [];
      instance.attackCooldownRemaining = 0;
      instance.isAlive = true;
      instance.respawnAt = undefined;
      // Bonus aus dem Entity-Leveling zurücksetzen — sonst passt currentHp
      // (Grundwert) nicht zum skalierten Maximum
      instance.bonusLevel = 0;
      instance.skillWins = 0;
      instance.levelingCooldown = 0;
    }

    updateUI(this.gameState);
    addLog(`▶ Slot ${slot + 1} geladen — ${saved.player.discoveredSkills.size} Skills.`, "system");
  }

  /** Alles zurücksetzen und Seite neu laden */
  resetGame() {
    deleteAllSaves();
    window.location.reload();
  }

  // ----------------------------------------------------------
  // GLOBALE FUNKTIONEN (für HTML-Buttons)
  // ----------------------------------------------------------
  private setupGlobalFunctions() {
    (window as any).touchAbsorb  = () => this.doAbsorb();
    (window as any).touchAnalyze = () => this.doAnalyze();
    (window as any).doGrow       = () => this.doGrow();
    (window as any).togglePassiveSkill = (skillId: string) => this.togglePassiveSkill(skillId);
    (window as any).resumeFromPause = () => {
      if (fullscreenSupported()) {
        this.enterFullscreen();
        // resumeGame() wird vom fullscreenchange-Event ausgelöst
      } else {
        // iOS Safari: kein Fullscreen-Support — direkt fortsetzen
        this.resumeGame();
      }
    };
  }

  // ----------------------------------------------------------
  // GAME LOOP
  // ----------------------------------------------------------
  update(_time: number, delta: number) {
    if (this.gamePaused) return;
    // Spielzeit akkumulieren
    this.playtimeAccumulator += delta;
    if (this.playtimeAccumulator >= 1000) {
      const seconds = Math.floor(this.playtimeAccumulator / 1000);
      this.gameState.player.playtimeSeconds += seconds;
      this.playtimeAccumulator %= 1000;
      this.tickProgression(seconds);
    }
    this.handleMovement();
    this.syncPlayerPosition();
    this.chunkManager.tick(this.gameState.player.x, this.gameState.player.y, Date.now());
    this.processEntityAi(delta);
    this.processEntityLeveling(delta);
    this.processCombatEffects(delta);
    this.updateEntityVisuals();
    this.updateBlobWobble(_time);
    this.checkNearbyEntity();
    this.checkPlayerDeath();
    processRespawns(this.gameState.world);
  }

  // Einmal pro Spielsekunde: Ruhe nach Übertraining (Echtzeit) und
  // Abschmelzen der Überdehnung (Spielzeit) — Regeln in ProgressionSystem.ts
  private tickProgression(playSeconds: number): void {
    const player = this.gameState.player;
    const { changed, events } = tickProgression(player, Date.now(), playSeconds);
    this.logProgressionEvents(events);
    if (!changed) return;
    refreshPassiveEffectValues(player);
    updatePlayerGrowth(player);
    this.updateCameraZoom();
    updateUI(this.gameState);
  }

  // Setzt Blob-Skalierung (wachstumsbasiert) + organisches Wobble
  private updateBlobWobble(time: number): void {
    const worldRadius = this.calcPlayerWorldRadius();
    const baseScale = worldRadius / 20; // Textur ist 40×40, Mittelpunkt-Radius = 20
    const wobble = Math.sin(time * 0.00628) * 0.04;
    this.blobGraphic.setScale(baseScale * (1 + wobble), baseScale * (1 - wobble));
  }

  private handleMovement() {
    // Geschwindigkeit skaliert mit Weltgröße → Bildschirm-Speed bleibt über alle Größen konstant
    const worldRadius = this.calcPlayerWorldRadius();
    const speed = worldRadius * PLAYER_SPEED_PER_WORLD_RADIUS;
    const body = this.blobGraphic.body;

    let dx = this.joy.active ? this.joy.dx : 0;
    let dy = this.joy.active ? this.joy.dy : 0;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }

    body.setVelocity(dx * speed, dy * speed);
  }

  private syncPlayerPosition() {
    this.gameState.player.x = this.blobGraphic.x;
    this.gameState.player.y = this.blobGraphic.y;
  }

  private updateEntityVisuals() {
    this.hpBarGraphics.clear();
    const now = this.time.now;

    for (const [id, instance] of this.gameState.world.entities) {
      const sprite = this.entitySprites.get(id);
      if (!sprite) continue;

      if (!instance.isAlive) {
        sprite.setAlpha(0.2);
        continue;
      }

      if (instance.isAggro) {
        sprite.setTint(0xff4444);
      } else if ((instance.bonusLevel ?? 0) > 0) {
        // Gelevelete Entity: goldener Tint als visueller Hinweis
        sprite.setTint(0xffdd44);
        sprite.setAlpha(1.0);
      } else {
        sprite.clearTint();
        sprite.setAlpha(1.0);
      }

      // Float-Animation: sanftes Schweben ohne Tween-Konflikt
      sprite.x = instance.x;
      sprite.y = instance.y + Math.sin(now * 0.001 + (sprite as any).floatPhase) * 2.5;

      // HP-Balken (nur bei Schaden oder Aggro)
      // Breite/Höhe/Abstand in Screen-Pixeln, umgerechnet in Weltkoordinaten via Zoom
      const def = ENTITY_MAP.get(instance.definitionId);
      const scaledMaxHp = def ? getScaledMaxHp(def, instance.bonusLevel ?? 0) : 0;
      if (def && def.hp && (instance.currentHp < scaledMaxHp || instance.isAggro)) {
        const ratio = Math.max(0, instance.currentHp / scaledMaxHp);
        const zoom = this.cameras.main.zoom;
        const worldSize = def.worldSize ?? 5;
        const bw = 18 / zoom;                         // 18px Breite auf dem Bildschirm
        const bh = 2.5 / zoom;                        // 2.5px Höhe
        const bx = instance.x - bw / 2;
        const by = instance.y - worldSize * 0.8 - bh; // knapp über dem Sprite
        this.hpBarGraphics.fillStyle(0x222222, 0.8);
        this.hpBarGraphics.fillRect(bx, by, bw, bh);
        const color = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xddaa00 : 0xcc2222;
        this.hpBarGraphics.fillStyle(color, 1);
        this.hpBarGraphics.fillRect(bx, by, Math.round(bw * ratio), bh);
      }
    }
  }

  // ----------------------------------------------------------
  // KAMPF-LOOP
  // ----------------------------------------------------------

  private processEntityAi(delta: number) {
    const now = Date.now();
    const px = this.gameState.player.x;
    const py = this.gameState.player.y;

    // Nur Entities in aktiven Chunks (ACTIVE_RADIUS) simulieren
    const activeIds = this.chunkManager.getActiveEntityIds();

    for (const [id, instance] of this.gameState.world.entities) {
      if (!activeIds.has(id)) continue;
      if (!instance.isAlive) continue;
      const def = ENTITY_MAP.get(instance.definitionId);
      if (!def) continue;

      tickAttackCooldown(instance, delta);
      tickRangedCooldown(instance, delta);

      const frame = calcEntityAi(def, instance, px, py, now);

      if (frame.becameAggro) {
        addLog(`${def.icon} ${def.name} wird aggressiv!`, "aggro");
      }
      if (frame.lostAggro) {
        instance.isAggro = false;
      }

      // Entity bewegen (nur Logik-Position — Sprite-Update in updateEntityVisuals)
      if ((frame.vx !== 0 || frame.vy !== 0) && instance.isAlive) {
        instance.x += frame.vx * (delta / 1000);
        instance.y += frame.vy * (delta / 1000);
      }

      // Entity setzt Fernkampf ein (z.B. Drachen-Feueratem)
      if (frame.wantToRangedAttack && def.rangedAttackSkillId) {
        setRangedCooldown(instance, def);
        const ranged = entityRangedAttack(def, this.gameState.player);
        this.gameState.player.hp = Math.max(0, this.gameState.player.hp - ranged.damageDealt);
        this.showFireBreath(instance.x, instance.y, px, py);
        this.showDamageNumber(px, py, ranged.damageDealt, "#ff6600", ranged.hitGrade);
        addLog(ranged.message, "aggro");
        updateUI(this.gameState);
      }

      // Entity greift an (Nahkampf)
      if (frame.wantToAttack) {
        setAttackCooldown(instance, def);
        const result = entityAttack(def, instance, this.gameState.player);
        if (result.hit) {
          this.gameState.player.hp = Math.max(0, this.gameState.player.hp - result.damageDealt);
          for (const effect of result.statusApplied) {
            applyEffect(this.gameState.player, effect);
          }

          // Chitin Armor: XP = durch Verteidigung absorbierter Schaden
          if ((result.absorbedDamage ?? 0) > 0) {
            this.afterXpGain(gainSkillXp(this.gameState.player, "chitin_armor", Math.round(result.absorbedDamage! / 1000), def.level));
          }

          // Hemolymph: Rückschlag-Schaden an die angreifende Entity
          const reflectDmg = result.reflectDamage ?? 0;
          if (reflectDmg > 0) {
            instance.currentHp = Math.max(0, instance.currentHp - reflectDmg);
            this.showDamageNumber(instance.x, instance.y, reflectDmg, "#ff8800");
            this.afterXpGain(gainSkillXp(this.gameState.player, "hemolymph", Math.round(reflectDmg / 1000), def.level));
            if (instance.currentHp <= 0) {
              instance.isAlive  = false;
              instance.respawnAt = Date.now() + (def?.respawnTime ?? 60) * 1000;
              resetAi(instance);
              addLog(`${def?.icon ?? "?"} ${def?.name ?? "Entity"} wurde vernichtet!`, "system");
            }
          }

          addLog(result.message, "aggro");
          this.showDamageNumber(px, py, result.damageDealt, "#ff4444", result.hitGrade);
          updateUI(this.gameState);
        } else if (result.hitGrade === "miss") {
          addLog(result.message, "aggro");
          this.showDamageNumber(px, py, 0, "#ff4444", "miss");
        }
      }
    }
  }

  // ----------------------------------------------------------
  // ENTITY-LEVELING-LOOP
  // Kreaturen jagen schwächere Artgenossen und leveln auf.
  // ----------------------------------------------------------
  private processEntityLeveling(delta: number) {
    const activeIds = this.chunkManager.getActiveEntityIds();

    for (const [id, hunter] of this.gameState.world.entities) {
      if (!activeIds.has(id)) continue;
      if (!hunter.isAlive || hunter.isAggro) continue;

      const hunterDef = ENTITY_MAP.get(hunter.definitionId);
      if (!hunterDef || hunterDef.category !== "creature" || !canFight(hunterDef)) continue;
      if (hunterDef.behavior === "passive") continue;

      // Leveling-Cooldown ticken
      if ((hunter.levelingCooldown ?? 0) > 0) {
        hunter.levelingCooldown = Math.max(0, (hunter.levelingCooldown ?? 0) - delta);
      }

      // Beute suchen (nur aktive Entities)
      const prey = findLevelingPrey(
        hunter, hunterDef,
        this.gameState.world.entities,
        ENTITY_MAP
      );
      if (!prey || !activeIds.has(prey.instanceId)) continue;

      // Auf Beute zubewegen
      const dx   = prey.x - hunter.x;
      const dy   = prey.y - hunter.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const attackRange = hunterDef.attackRangePx ?? 60;

      if (dist > attackRange) {
        const spd = getScaledSpeed(hunterDef, hunter.bonusLevel ?? 0);
        hunter.x += (dx / dist) * spd * (delta / 1000);
        hunter.y += (dy / dist) * spd * (delta / 1000);
      } else if ((hunter.levelingCooldown ?? 0) <= 0) {
        // Angriff
        hunter.levelingCooldown = hunterDef.attackCooldownMs ?? 1500;

        const dmg     = getScaledDamage(hunterDef, hunter.bonusLevel ?? 0);
        const preyDef = ENTITY_MAP.get(prey.definitionId);
        prey.currentHp = Math.max(0, prey.currentHp - dmg);
        this.showDamageNumber(prey.x, prey.y, dmg, "#ff8800");

        if (prey.currentHp <= 0) {
          prey.isAlive   = false;
          prey.respawnAt = Date.now() + (preyDef?.respawnTime ?? 60) * 1000;
          resetAi(prey);

          const result = processEntityVictory(hunter, hunterDef);
          if (result.entityLeveledUp) {
            const newLv = getEffectiveLevel(hunterDef, hunter);
            addLog(`${hunterDef.icon} ${hunterDef.name} steigt auf Stufe ${newLv} auf! ✨`, "levelup");
          } else if (result.skillLeveledUp) {
            const wins = hunter.skillWins ?? 0;
            addLog(`${hunterDef.icon} ${hunterDef.name} wird stärker! (${wins}/3)`, "system");
          }
        }
      }
    }
  }

  private processCombatEffects(delta: number) {
    const now = Date.now();

    // Spieler-Effekte
    const playerHpDelta = processTicks(this.gameState.player, now);
    if (playerHpDelta !== 0) {
      this.gameState.player.hp = Math.max(0,
        Math.min(this.gameState.player.maxHp, this.gameState.player.hp + playerHpDelta));
      if (playerHpDelta < 0) {
        this.showDamageNumber(
          this.gameState.player.x, this.gameState.player.y,
          -playerHpDelta, "#aa44ff"
        );
      } else if (playerHpDelta > 0) {
        // Photosynthesis: XP = regenerierte HP (÷1000: milli-HP → XP, kein Entity-Level)
        this.afterXpGain(gainSkillXp(this.gameState.player, "photosynthesis", Math.round(playerHpDelta / 1000)));
      }
      updateUI(this.gameState);
    }
    removeExpiredEffects(this.gameState.player, now);

    // Entity-Effekte — processTicks erwartet { hp, maxHp } → Wrapper
    for (const instance of this.gameState.world.entities.values()) {
      if (!instance.isAlive) continue;
      const def = ENTITY_MAP.get(instance.definitionId);
      const wrapper = {
        statusEffects: instance.statusEffects,
        hp: instance.currentHp,
        maxHp: def?.hp ?? 0,
      };
      // Venom-XP: Schaden fälliger Venom-Ticks zählen (vor processTicks, da lastTickAt danach aktualisiert wird)
      let venomXp = 0;
      for (const effect of instance.statusEffects) {
        if (effect.sourceSkillId === "venom" && effect.type === "dot"
            && effect.tickIntervalMs > 0 && now - effect.lastTickAt >= effect.tickIntervalMs) {
          venomXp += effect.damagePerTick;
        }
      }

      const hpDelta = processTicks(wrapper, now);
      if (hpDelta !== 0) {
        instance.currentHp = Math.max(0, instance.currentHp + hpDelta);
        if (hpDelta < 0) {
          this.showDamageNumber(instance.x, instance.y, -hpDelta, "#44ff88");
        }
        if (instance.currentHp <= 0) {
          instance.isAlive  = false;
          instance.respawnAt = Date.now() + (def?.respawnTime ?? 60) * 1000;
          resetAi(instance);
          if (def) addLog(`${def.icon} ${def.name} wurde vernichtet!`, "system");
        }
      }
      // Venom: XP = Schaden der getickten Venom-DoTs (÷1000: milli-HP → XP)
      if (venomXp > 0) {
        this.afterXpGain(gainSkillXp(this.gameState.player, "venom", Math.round(venomXp / 1000), def?.level));
      }
      removeExpiredEffects(instance, now);

      // HP-Regeneration außerhalb des Kampfes: 5% MaxHP/s
      if (!instance.isAggro && instance.currentHp > 0) {
        const scaledMax = getScaledMaxHp(def!, instance.bonusLevel ?? 0);
        if (instance.currentHp < scaledMax) {
          instance.currentHp = Math.min(scaledMax,
            instance.currentHp + scaledMax * 0.05 * (delta / 1000));
        }
      }
    }

    // MP-Regen (1 MP/s)
    regenMp(this.gameState.player, delta);
  }

  private checkPlayerDeath() {
    if (this.gameState.player.hp > 0) return;

    executeCheckpoint(this.gameState.player);
    syncPassiveEffects(this.gameState.player);

    for (const instance of this.gameState.world.entities.values()) {
      resetAi(instance);
    }

    this.blobGraphic.setPosition(this.gameState.player.x, this.gameState.player.y);
    this.cameras.main.flash(400, 255, 50, 50);
    addLog("💀 Besiegt! Checkpoint — HP/MP wiederhergestellt.", "system");
    updateUI(this.gameState);
  }

  /** Nach jeder Erfahrung: Rangwechsel loggen, Werte und Wachstum nachführen */
  private afterXpGain(result: GainResult) {
    this.logProgressionEvents(result.events);
    this.afterProgressChange();
  }

  /** Werte folgen der Erfahrung fließend: passive Effekte, HP/MP, Größe */
  private afterProgressChange() {
    refreshPassiveEffectValues(this.gameState.player);
    updatePlayerGrowth(this.gameState.player);
    this.updateCameraZoom(); // Welt schrumpft optisch, während der Blob wächst
    updateUI(this.gameState);
  }

  /** Absorb/Analyze: Aufstiege zeigt showInteractionResult, hier nur das Verlernen anderer Skills */
  private logForgetting(results: { events: ProgressionEvent[] }[]) {
    this.logProgressionEvents(results.flatMap((r) => r.events.filter((e) => e.kind === "rank_down")));
  }

  /** Rangwechsel ins Log — aufgestiegen oder durch Verlernen abgestiegen */
  private logProgressionEvents(events: ProgressionEvent[]) {
    for (const e of events) {
      const def = ALL_SKILLS.get(e.skillId);
      const label = `${def?.icon ?? "⚡"} ${def?.name ?? e.skillId}`;
      if (e.kind === "rank_up") addLog(`⬆️ ${label} → ${e.rankName}!`, "levelup");
      else addLog(`💭 ${label} verlernt → ${e.rankName}`, "system");
    }
  }

  // Zeigt eine Schadenszahl an der Position (x, y) in Weltkoordinaten.
  // Schadenszahl in Bildschirmgröße rendern — scharf auf jedem Zoom-Level.
  //
  // Trick: Text wird bei voller Bildschirm-Fontgröße (14px) gerendert,
  // dann per setScale(1/zoom) auf Weltgröße runterskaliert.
  // Der Kamera-Zoom hebt das wieder auf → exakt 14px auf dem Bildschirm, nie unscharf.
  // Offset und Rise ebenfalls in Bildschirm-Pixeln, dann durch Zoom geteilt.
  private showDamageNumber(x: number, y: number, dmg: number, color: string, grade?: HitGrade) {
    const zoom   = this.cameras.main.zoom;
    const scale  = 1 / zoom;
    const offset = 10 / zoom;   // 10 Bildschirmpixel nach oben
    const rise   = 18 / zoom;   // 18 Bildschirmpixel Aufstieg

    // Treffer-Stufe sichtbar machen: Größe, Farbe, Text
    const n = `${toDisplayHp(dmg)}`;
    const style: Record<HitGrade, { text: string; size: number; color: string }> = {
      miss:   { text: "verfehlt", size: 12, color: "#aaaaaa" },
      light:  { text: n,          size: 11, color },
      normal: { text: n,          size: 14, color },
      heavy:  { text: `${n}!`,    size: 17, color },
      crit:   { text: `${n}!!`,   size: 21, color: "#ffd23f" },
    };
    const s = style[grade ?? "normal"];

    const txt = this.add
      .text(x, y - offset, s.text, {
        fontSize: `${s.size}px`,
        color: s.color,
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScale(scale)
      .setDepth(20);

    this.tweens.add({
      targets: txt,
      y: y - offset - rise,
      alpha: 0,
      duration: 900,
      ease: "Power1",
      onComplete: () => txt.destroy(),
    });
  }

  // Feueratem-Animation: drei 🔥-Partikel fliegen von der Entity zum Spieler.
  // Alle Koordinaten in Weltpixeln; setScale(1/zoom) hält die Anzeigegröße konstant.
  private showFireBreath(fromX: number, fromY: number, toX: number, toY: number) {
    const zoom = this.cameras.main.zoom;
    for (let i = 0; i < 3; i++) {
      const delay = i * 90;
      const spread = 12 / zoom;
      const sx = fromX + (Math.random() - 0.5) * spread;
      const sy = fromY + (Math.random() - 0.5) * spread;
      const tx = toX  + (Math.random() - 0.5) * spread * 0.5;
      const ty = toY  + (Math.random() - 0.5) * spread * 0.5;

      const flame = this.add
        .text(sx, sy, "🔥", { fontSize: "20px" })
        .setOrigin(0.5)
        .setScale(1.8 / zoom)
        .setDepth(15);

      this.tweens.add({
        targets: flame,
        x: tx,
        y: ty,
        scaleX: 0.3 / zoom,
        scaleY: 0.3 / zoom,
        alpha: 0,
        delay,
        duration: 520,
        ease: "Power2",
        onComplete: () => flame.destroy(),
      });
    }
  }

  activateSkill(skillId: string) {
    const check = canActivateSkill(this.gameState.player, skillId);
    if (!check.ok) {
      showToast(check.reason ?? "Skill nicht verfügbar.", "system");
      return;
    }

    consumeSkill(this.gameState.player, skillId);
    const skillDef = ALL_SKILLS.get(skillId);

    if (skillDef?.attackType === "dash") {
      const dx = this.joy.active ? this.joy.dx : 0;
      const dy = this.joy.active ? this.joy.dy : 0;
      const len = Math.hypot(dx, dy);
      if (len > 0.1) {
        const dist = executeJump(
          this.gameState.player,
          dx / len, dy / len,
          skillId,
          WORLD_CHUNKS_X * CHUNK_PX,
          WORLD_CHUNKS_Y * CHUNK_PX
        );
        this.blobGraphic.setPosition(this.gameState.player.x, this.gameState.player.y);
        showToast(`🦘 Sprung! (${Math.round(dist)}px)`, "system");
      }
      // Jump: XP pro Benutzung
      this.afterXpGain(gainSkillXp(this.gameState.player, skillId, 1));
      updateUI(this.gameState);
      return;
    }

    const target = this.lastNearbyId
      ? this.gameState.world.entities.get(this.lastNearbyId)
      : null;

    if (!target || !target.isAlive) {
      showToast("Kein Ziel in Reichweite.", "system");
      updateUI(this.gameState);
      return;
    }

    const result = playerAttack(this.gameState.player, target, skillId);
    if (result.hit) {
      target.currentHp = Math.max(0, target.currentHp - result.damageDealt);
      for (const effect of result.statusApplied) {
        applyEffect(target, effect);
      }
      this.showDamageNumber(target.x, target.y, result.damageDealt, "#ffffff", result.hitGrade);

      const def = ENTITY_MAP.get(target.definitionId);

      if (target.currentHp <= 0) {
        target.isAlive  = false;
        target.respawnAt = Date.now() + (def?.respawnTime ?? 60) * 1000;
        resetAi(target);
        if (def) addLog(`${def.icon} ${def.name} wurde besiegt!`, "system");
      } else {
        // Angegriffene Entity wird sofort aggro (Gegenwehr)
        target.isAggro = true;

        // Hemolymph: Rückschlag-Schaden wenn Entity diesen Skill trägt
        const reflectDmgPlayer = result.reflectDamage ?? 0;
        if (reflectDmgPlayer > 0) {
          this.gameState.player.hp = Math.max(0, this.gameState.player.hp - reflectDmgPlayer);
          this.showDamageNumber(
            this.gameState.player.x, this.gameState.player.y,
            reflectDmgPlayer, "#ff8800"
          );
          addLog(`${def?.icon ?? "🐞"} Hemolymph! ${toDisplayHp(reflectDmgPlayer)} Rückschlag-Schaden.`, "aggro");
        }
      }

      addLog(result.message, "absorb");

      // XP = angerichteter Schaden (÷1000: milli-HP → XP, Entity-Level für Skalierung)
      this.afterXpGain(gainSkillXp(this.gameState.player, skillId, Math.round(result.damageDealt / 1000), def?.level));
      // Superstrength: 1 XP pro Treffer, skaliert nach Entity-Level
      this.afterXpGain(gainSkillXp(this.gameState.player, "superstrength", 1, def?.level));
      // Venom: XP kommt von den DoT-Ticks in processCombatEffects
    } else if (result.hitGrade === "miss") {
      // Verfehlt: kein Schaden, keine XP — das Ziel bemerkt den Angriff trotzdem
      target.isAggro = true;
      this.showDamageNumber(target.x, target.y, 0, "#ffffff", "miss");
      addLog(result.message, "absorb");
    } else {
      showToast(result.message, "system");
    }
    updateUI(this.gameState);
  }

  private checkNearbyEntity() {
    const nearest = findNearestEntity(this.gameState.player, this.gameState.world, this.getPlayerAttackRange());
    const nearestId = nearest?.instanceId ?? null;

    if (nearestId !== this.lastNearbyId) {
      this.lastNearbyId = nearestId;
      updateNearbyPanel(
        nearest ? ENTITY_MAP.get(nearest.definitionId) : undefined,
        nearest ?? undefined,
        this.gameState
      );
    }
  }

  // ----------------------------------------------------------
  // INTERAKTIONEN — Public (für HTML-Buttons und Joystick)
  // ----------------------------------------------------------
  doAbsorb() {
    if (!this.lastNearbyId) {
      showToast("Keine Entity in Reichweite.", "system");
      return;
    }
    const result = absorbEntity(
      this.gameState.player,
      this.gameState.world,
      this.lastNearbyId
    );
    showInteractionResult(result, this.gameState);
    this.logForgetting(result.skillResults);
    if (result.success) {
      syncPassiveEffects(this.gameState.player);
      this.lastNearbyId = null;
      updateNearbyPanel(undefined, undefined, this.gameState);
    }
    this.afterProgressChange();
  }

  doAnalyze() {
    if (!this.lastNearbyId) {
      showToast("Keine Entity in Reichweite.", "system");
      return;
    }
    const result = analyzeEntity(
      this.gameState.player,
      this.gameState.world,
      this.lastNearbyId
    );
    showInteractionResult(result, this.gameState);
    this.logForgetting(result.skillResults);
    if (result.success) syncPassiveEffects(this.gameState.player);
    this.afterProgressChange();
  }

  doGrow() {
    const result = useGrow(this.gameState.player);
    showToast(result.message, result.success ? "absorb" : "system");
    if (result.success) updateUI(this.gameState);
  }

  togglePassiveSkill(skillId: string) {
    const inst = this.gameState.player.discoveredSkills.get(skillId);
    if (!inst) return;
    inst.isEnabled = inst.isEnabled === false ? true : false;
    syncPassiveEffects(this.gameState.player);
    updateUI(this.gameState);
    const state = inst.isEnabled ? "aktiviert" : "deaktiviert";
    showToast(`${ALL_SKILLS.get(skillId)?.name ?? skillId} ${state}`, "system");
  }

  doCombine(skillIdA: string, skillIdB: string) {
    const result = combineSkills(this.gameState.player, skillIdA, skillIdB);
    showCombineResult(result);
    this.afterProgressChange();
    updateUI(this.gameState);
    return result;
  }

  // ----------------------------------------------------------
  // HILFSFUNKTION
  // ----------------------------------------------------------
  private findEntityNear(
    wx: number,
    wy: number,
    radius: number
  ): EntityInstance | null {
    for (const instance of this.gameState.world.entities.values()) {
      if (!instance.isAlive) continue;
      if (Math.hypot(instance.x - wx, instance.y - wy) < radius) {
        return instance;
      }
    }
    return null;
  }
}

// ============================================================
// UI-FUNKTIONEN (DOM-basiert, kein Phaser)
// ============================================================

function updateUI(state: GameState) {
  const p = state.player;

  // HUD — statt Charakter-Level: belegte Skill-Kapazität (progression.ts Abschnitt 3/4)
  const cap = getCapacityInfo(p);
  const capPct = Math.round((cap.used / cap.capacity) * 100);
  setEl("ui-level", `Kap. ${capPct}%${cap.overstretch > 0 ? " ↑" : ""}`);
  setEl("ui-hp", `${toDisplayHp(p.hp)}/${toDisplayHp(p.maxHp)}`);
  // MP abrunden: sonst stünde z.B. „3 MP vorhanden“, obwohl ein 3-MP-Skill nicht geht
  setEl("ui-mp", `${Math.floor(p.mp / 1000)}/${Math.floor(p.maxMp / 1000)}`);
  setStyle("hp-bar-fill", "width", `${(p.hp / p.maxHp) * 100}%`);
  setStyle("mp-bar-fill", "width", `${(p.mp / p.maxMp) * 100}%`);
  setStyle("xp-bar-fill", "width", `${Math.min(100, capPct)}%`);
  // Überdehnt: Balken in Gold — Grenze zeitweise überschritten
  setStyle("xp-bar-fill", "background", cap.overstretch > 0 ? "var(--gold)" : "");

  // Kern-Fähigkeiten
  const coreText = (ability: "absorb" | "analyze") => {
    const info = getRankInfo(p.coreAbilities[ability], getLearningEffort(ability));
    return `${info.rankName} (${formatRankProgress(info)})`;
  };
  setEl("ui-analyze-level", `🔍 ${coreText("analyze")}`);
  setEl("ui-absorb-level", `💥 ${coreText("absorb")}`);

  renderSkillList(state);
  renderCombinePanel(state);
  renderMaterials(state);
}

function renderSkillList(state: GameState) {
  const container = document.getElementById("skills-list");
  if (!container) return;

  const skills = getDiscoveredSkillsSorted(state.player);
  if (skills.length === 0) {
    container.innerHTML =
      '<p class="empty-hint">Noch keine Skills entdeckt.<br>Nähere dich einer Entity und tippe 💥 Absorb oder 🔍 Analyze.</p>';
    return;
  }

  container.innerHTML = skills
    .map((inst) => {
      const def = ALL_SKILLS.get(inst.definitionId);
      if (!def) return "";
      const info = getRankInfo(inst, getLearningEffort(def.id));
      const isPassive = def.activation === "passive";
      const hasGrow = def.id === "grow";

      const enabled = inst.isEnabled !== false;
      return `
        <div class="skill-card element-${def.element}${isPassive && !enabled ? " skill-disabled" : ""}">
          <div class="skill-header">
            <span class="skill-icon">${def.icon}</span>
            <span class="skill-name">${def.name}</span>
            ${def.category === "combo" ? '<span class="combo-badge">COMBO</span>' : ""}
            ${isPassive ? '<span class="combo-badge" style="background:#4af0c8;color:#000">PASSIV</span>' : ""}
            <span class="skill-level">${info.rankName}</span>
            ${isPassive ? `<button class="btn-passive-toggle" onclick="window.togglePassiveSkill('${def.id}')">${enabled ? "AN" : "AUS"}</button>` : ""}
          </div>
          ${renderRankBar(info)}
          <div class="skill-xp-text">${formatRankProgress(info)}</div>
          <div class="skill-desc">${def.description}</div>
          ${hasGrow ? `<button class="btn-grow" onclick="window.doGrow()">🌱 Grow anwenden (−5 Pflanzenfaser)</button>` : ""}
        </div>
      `;
    })
    .filter(Boolean)
    .join("");
}

/**
 * Erfahrungsbalken im aktuellen Rang. Der goldene Abschnitt vor der Füllung
 * zeigt die ausstehende Erfahrung aus Übertraining — so weit wird der Balken
 * nach der Ruhe stehen (progression.ts Abschnitt 6).
 */
function renderRankBar(info: RankInfo): string {
  return `
    <div class="xp-bar-wrap">
      <div class="xp-bar-pending" style="width:${info.pendingFraction * 100}%"></div>
      <div class="xp-bar-fill" style="width:${info.fraction * 100}%"></div>
    </div>`;
}

/** „24 / 74 XP · +12 in Ruhe“ — XP bis zum nächsten Rang, ausstehende Erfahrung */
function formatRankProgress(info: RankInfo): string {
  const pending = info.pendingXp >= 1 ? ` · +${Math.floor(info.pendingXp)} in Ruhe` : "";
  if (!info.nextRankName) return `${Math.floor(info.xp)} XP · höchster Rang${pending}`;
  const target = Math.ceil(info.xp + info.xpToNextRank);
  return `${Math.floor(info.xp)} / ${target} XP → ${info.nextRankName}${pending}`;
}

function renderCombinePanel(state: GameState) {
  const selects = ["combine-a", "combine-b"];
  for (const selId of selects) {
    const sel = document.getElementById(selId) as HTMLSelectElement | null;
    if (!sel) continue;
    const current = sel.value;
    sel.innerHTML = '<option value="">— Skill wählen —</option>';
    for (const [id, inst] of state.player.discoveredSkills) {
      const def = ALL_SKILLS.get(id);
      if (!def || def.category !== "basic") continue; // Nur basic-Skills kombinierbar
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `${def.icon} ${def.name} (${getRankInfo(inst, getLearningEffort(id)).rankName})`;
      sel.appendChild(opt);
    }
    if (current) sel.value = current;
  }
}

function renderMaterials(state: GameState) {
  const container = document.getElementById("materials-list");
  if (!container) return;

  const mats = getMaterialList(state.player);
  if (mats.length === 0) {
    container.innerHTML =
      '<p class="empty-hint">Noch keine Materialien gesammelt.<br>Absorbiere Pflanzen oder Steine.</p>';
    return;
  }

  container.innerHTML = mats
    .map(
      (m) => `
      <div class="material-row">
        <span class="mat-icon">${m.icon}</span>
        <span class="mat-name">${m.name}</span>
        <span class="mat-amount">×${m.formatted}</span>
      </div>
    `
    )
    .join("");
}

function updateNearbyPanel(
  entityDef: ReturnType<typeof ENTITY_MAP.get>,
  instance: EntityInstance | undefined,
  state: GameState
) {
  const panel = document.getElementById("nearby-panel");
  if (!panel) return;

  if (!entityDef) {
    panel.innerHTML = '<span class="empty-hint">Keine Entity in Reichweite</span>';
    return;
  }

  const bonusLv      = instance?.bonusLevel ?? 0;
  const effectiveLv  = entityDef.level + bonusLv;
  // Gleiche Rechnung wie EntitySystem.absorbEntity/analyzeEntity: dort zählt die
  // Grundstufe (def.level), das Bonus-Level aus dem Entity-Leveling nicht
  const absorbChance = Math.round(calcSuccessChance(getCorePractice(state.player, "absorb"),  entityDef.level) * 100);
  const analyzeChance= Math.round(calcSuccessChance(getCorePractice(state.player, "analyze"), entityDef.level) * 100);

  // HP-Leiste (intern milli-HP, Anzeige in HP)
  const scaledMaxHp    = getScaledMaxHp(entityDef, bonusLv);
  const currentHp      = instance?.currentHp ?? scaledMaxHp;
  const currentHpDisp  = toDisplayHp(currentHp);
  const scaledMaxDisp  = toDisplayHp(scaledMaxHp);
  const hpPct          = Math.round(Math.max(0, currentHp / scaledMaxHp) * 100);
  const hpColor     = hpPct > 50 ? "#44cc44" : hpPct > 25 ? "#cccc44" : "#cc4444";

  // Bonus-Level Sterne
  const bonusStars = bonusLv > 0 ? ` ${"★".repeat(bonusLv)}` : "";

  // Skills der Entity (aus skillXp) — mit Rang wie beim Blob
  const skillLines: string[] = [];
  for (const [skillId, practice] of Object.entries(getEntitySkillPractice(entityDef))) {
    const s = ALL_SKILLS.get(skillId);
    if (s) skillLines.push(`${s.icon} ${s.name} (${rankNameForPractice(practice)})`);
  }

  // Effektiver Schaden (aus Biss-Erfahrung oder standalone)
  const effectiveDmg = getEntityBaseDamage(entityDef);

  // Mögliche Skill-Drops (nur was noch nicht in skillXp ist)
  const ownSkillIds = new Set(Object.keys(entityDef.skillXp ?? {}));
  const dropLines = entityDef.skillDrops
    .filter((d) => !ownSkillIds.has(d.skillId))
    .map((drop) => {
      const s = ALL_SKILLS.get(drop.skillId);
      return s ? `${s.icon} ${s.name} (${Math.round(drop.chance * 100)}%)` : "";
    })
    .filter(Boolean);

  panel.innerHTML = `
    <div class="nearby-entity">
      <span class="nearby-icon">${entityDef.icon}</span>
      <div style="flex:1;min-width:0">
        <div>
          <span class="nearby-name">${entityDef.name}</span>
          <span style="color:var(--muted);font-size:.72em"> Lv.${effectiveLv}${bonusStars}</span>
        </div>
        <div style="margin:3px 0 2px">
          <div style="height:6px;background:#222;border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${hpPct}%;background:${hpColor};transition:width .2s"></div>
          </div>
          <span style="font-size:.65em;color:var(--muted)">${currentHpDisp}/${scaledMaxDisp} HP</span>
        </div>
        <div style="font-size:.68em;color:var(--muted)">
          ⚔️ ${toDisplayHp(effectiveDmg)} &nbsp;|&nbsp; 💨 ${entityDef.speed ?? "–"}
        </div>
      </div>
    </div>
    ${skillLines.length ? `<div style="font-size:.68em;color:#ccc;margin:4px 0 2px"><b>Skills:</b> ${skillLines.join(" &nbsp; ")}</div>` : ""}
    ${dropLines.length ? `<div style="font-size:.68em;color:var(--muted);margin:2px 0">🎁 ${dropLines.join(", ")}</div>` : ""}
    <div style="font-size:.65em;color:var(--muted);margin:3px 0">
      💥 Absorb ${absorbChance}% &nbsp;|&nbsp; 🔍 Analyze ${analyzeChance}%
    </div>
    <div class="nearby-actions">
      <button onclick="window.gameScene.doAbsorb()" class="btn-absorb">💥 Absorb</button>
      <button onclick="window.gameScene.doAnalyze()" class="btn-analyze">🔍 Analyze</button>
    </div>
  `;
}

function showInteractionResult(result: any, state: GameState) {
  const type = result.method as "absorb" | "analyze";

  if (!result.success) {
    const logType = result.aggroTriggered ? "aggro" : "system";
    addLog(result.message, logType);
    showToast(result.message, "system");
    return;
  }

  // Skill-Ergebnisse
  const skillLines = result.skillResults
    .map((r: any) => {
      const def = ALL_SKILLS.get(r.skillId);
      if (!def) return "";
      if (r.wasNewDiscovery) return `✨ ${def.name} entdeckt!`;
      const up = r.events?.find((e: ProgressionEvent) => e.skillId === r.skillId && e.kind === "rank_up");
      if (up)                return `⬆️ ${def.name} → ${up.rankName}`;
      return `+${r.xpGained} XP für ${def.name}`;
    })
    .filter(Boolean);

  // Material-Ergebnisse
  const matLines = result.materialResults.map((m: any) => {
    const def = MATERIAL_MAP.get(m.materialId);
    return def ? `${def.icon} +${m.amount} ${def.name}` : "";
  }).filter(Boolean);

  const allLines = [...skillLines, ...matLines];
  const detail = allLines.join(" · ");

  addLog(`${result.message}${detail ? ` — ${detail}` : ""}`, type);
  showToast(`${result.message}${detail ? `\n${detail}` : ""}`, type);
}

// -----------------------------------------------------------
// TOAST / LOG / TABS
// -----------------------------------------------------------
function showToast(msg: string, type: string) {
  const el = document.getElementById("notification");
  if (!el) return;
  el.textContent = msg;
  el.className = `notification show notification-${type}`;
  setTimeout(() => el.classList.remove("show"), 2800);
}

function addLog(msg: string, type = "system") {
  const logState: { log: { msg: string; type: string }[] } =
    (window as any)._log ?? ((window as any)._log = { log: [] });
  logState.log.unshift({ msg, type });
  if (logState.log.length > 50) logState.log.pop();

  const el = document.getElementById("logList");
  if (el) {
    el.innerHTML = logState.log
      .slice(0, 30)
      .map((l) => `<div class="log-entry ${l.type}">${l.msg}</div>`)
      .join("");
  }
}

function showCombineResult(result: any) {
  const out = document.getElementById("combine-result");
  if (!out) return;
  out.textContent = result.message;
  out.className   = `combine-result outcome-${result.outcome}`;
}

// -----------------------------------------------------------
// DOM-HELFER
// -----------------------------------------------------------
function isFullscreen(): boolean {
  return !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
}

function fullscreenSupported(): boolean {
  const el = document.documentElement as any;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}

function setEl(id: string, text: string) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setStyle(id: string, prop: string, value: string) {
  const el = document.getElementById(id) as HTMLElement | null;
  if (el) (el.style as any)[prop] = value;
}

// ============================================================
// PHASER INITIALISIERUNG
// ============================================================
window.addEventListener("load", () => {
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "canvas-wrap",
    backgroundColor: "#0a0d14",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: { default: "arcade", arcade: { debug: false } },
    scene: [BootScene, GameScene],
  });
});
