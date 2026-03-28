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
  getXpProgress,
  isMaxLevel,
  gainSkillXp,
  updatePlayerLevel,
  calcPlayerLevel,
  calcMaxHp,
  calcMaxMp,
} from "../systems/SkillSystem.js";
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
import { createJoystick, type JoystickState } from "../ui/Joystick.js";
import { createSkillBar, type SkillBarState } from "../ui/SkillBar.js";
import { createSkillMenu } from "../ui/SkillMenu.js";
import { createSaveMenu } from "../ui/SaveMenu.js";
import { saveToSlot, loadFromSlot, deleteAllSaves } from "../systems/SaveSystem.js";
import {
  calcEntityAi,
  tickAttackCooldown,
  setAttackCooldown,
  resetAi,
} from "../systems/AiSystem.js";
import {
  getEffectiveLevel,
  getScaledMaxHp,
  getScaledDamage,
  getScaledSpeed,
  findLevelingPrey,
  processEntityVictory,
} from "../systems/EntityLevelingSystem.js";
import {
  playerAttack,
  entityAttack,
  canActivateSkill,
  consumeSkill,
  calcDashDistance,
  executeCheckpoint,
  regenMp,
} from "../systems/CombatSystem.js";
import {
  processTicks,
  triggerAuras,
  applyEffect,
  removeExpiredEffects,
  syncPassiveEffects,
} from "../systems/StatusEffectSystem.js";
import {
  PLAYER_WORLD_RADIUS_MIN,
  PLAYER_WORLD_RADIUS_MAX,
  PLAYER_SIZE_LEVEL_MAX,
  PLAYER_SCREEN_RADIUS,
  PLAYER_SPEED_PER_WORLD_RADIUS,
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

  private slimeGraphic!: any;
  private entitySprites: Map<string, any> = new Map();
  private chunkManager!: ChunkManager;

  private joy!: JoystickState;

  private lastNearbyId: string | null = null;
  private gamePaused = false;
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

    this.cameras.main.startFollow(this.slimeGraphic, true, 0.1, 0.1);
    this.updateCameraZoom(); // Zoom basierend auf Level 1

    updateUI(this.gameState);
    addLog("Du erwachst als Schleim…", "system");
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
      this.lastNearbyId = instance.instanceId;
      this.doAbsorb();
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
    g.generateTexture("slime", 40, 40);
    g.destroy();

    this.slimeGraphic = this.physics.add.image(
      this.gameState.player.x,
      this.gameState.player.y,
      "slime"
    );
    this.slimeGraphic.setCollideWorldBounds(true);
    // Wobble wird in update() per Math.sin berechnet (kein Tween — kein Konflikt mit Skalierung)
  }

  // Berechnet den Welt-Radius des Slimes für ein gegebenes Level.
  // Wächst linear von PLAYER_WORLD_RADIUS_MIN bis PLAYER_WORLD_RADIUS_MAX.
  private calcPlayerWorldRadius(level: number): number {
    const t = Math.min((level - 1) / (PLAYER_SIZE_LEVEL_MAX - 1), 1.0);
    return PLAYER_WORLD_RADIUS_MIN + t * (PLAYER_WORLD_RADIUS_MAX - PLAYER_WORLD_RADIUS_MIN);
  }

  // Nahkampf-Angriffsreichweite des Slimes in Weltpixeln.
  // = Rand des Charakters + nochmal eine Charaktergröße = 2 × worldRadius.
  private getPlayerAttackRange(): number {
    return this.calcPlayerWorldRadius(this.gameState.player.level) * 2;
  }

  // Passt Kamera-Zoom an das aktuelle Level an.
  // Slime erscheint immer PLAYER_SCREEN_RADIUS px groß.
  private updateCameraZoom(): void {
    const worldRadius = this.calcPlayerWorldRadius(this.gameState.player.level);
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
      const isFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement
      );
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
      const isFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      if (isFs) {
        this.exitFullscreen();
      } else {
        this.enterFullscreen();
      }
    });
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

  private pauseGame() {
    if (this.gamePaused) return;
    this.gamePaused = true;
    this.physics.pause();
    const ov = document.getElementById("pauseOverlay");
    if (ov) ov.classList.add("visible");
  }

  private resumeGame() {
    if (!this.gamePaused) return;
    this.gamePaused = false;
    this.physics.resume();
    const ov = document.getElementById("pauseOverlay");
    if (ov) ov.classList.remove("visible");
  }

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
  pauseForUI() {
    this.gamePaused = true;
    this.physics.pause();
  }

  /** Spiel nach UI-Schließen fortsetzen */
  resumeForUI() {
    this.gamePaused = false;
    this.physics.resume();
  }

  // ----------------------------------------------------------
  // SAVE MENU
  // ----------------------------------------------------------
  private setupSaveMenu() {
    const menu = createSaveMenu();
    // 💾-Button im HUD verdrahten
    document.getElementById("btnSave")?.addEventListener("click", () => menu.open());
    // Auch aus der Pause-Overlay heraus öffnen
    document.getElementById("btnSaveFromPause")?.addEventListener("click", () => {
      const ov = document.getElementById("pauseOverlay");
      if (ov) ov.classList.remove("visible");
      menu.open();
    });
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
    this.slimeGraphic.setPosition(saved.player.x, saved.player.y);

    // maxHp/maxMp aus Level neu berechnen (migriert alte Saves)
    this.gameState.player.maxHp = calcMaxHp(saved.player.level);
    this.gameState.player.maxMp = calcMaxMp(saved.player.level);
    this.gameState.player.hp = Math.min(this.gameState.player.hp, this.gameState.player.maxHp);
    this.gameState.player.mp = Math.min(this.gameState.player.mp, this.gameState.player.maxMp);

    // Kamera-Zoom ans gespeicherte Level anpassen
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
    }

    updateUI(this.gameState);
    addLog(`▶ Slot ${slot + 1} geladen — Lv.${saved.player.level}, ${saved.player.discoveredSkills.size} Skills.`, "system");
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
    (window as any).switchTab    = switchTab;
    (window as any).toggleSheet  = toggleSheet;
    (window as any).touchAbsorb  = () => this.doAbsorb();
    (window as any).touchAnalyze = () => this.doAnalyze();
    (window as any).doGrow       = () => this.doGrow();
    (window as any).togglePassiveSkill = (skillId: string) => this.togglePassiveSkill(skillId);
    (window as any).resumeFromPause = () => {
      const el = document.documentElement as any;
      if (el.requestFullscreen || el.webkitRequestFullscreen) {
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
      this.gameState.player.playtimeSeconds += Math.floor(this.playtimeAccumulator / 1000);
      this.playtimeAccumulator %= 1000;
    }
    this.handleMovement();
    this.syncPlayerPosition();
    this.chunkManager.tick(this.gameState.player.x, this.gameState.player.y, Date.now());
    this.processEntityAi(delta);
    this.processEntityLeveling(delta);
    this.processCombatEffects(delta);
    this.updateEntityVisuals();
    this.updateSlimeWobble(_time);
    this.checkNearbyEntity();
    this.checkPlayerDeath();
    processRespawns(this.gameState.world);
  }

  // Setzt Slime-Skalierung (Level-basiert) + organisches Wobble
  private updateSlimeWobble(time: number): void {
    const worldRadius = this.calcPlayerWorldRadius(this.gameState.player.level);
    const baseScale = worldRadius / 20; // Textur ist 40×40, Mittelpunkt-Radius = 20
    const wobble = Math.sin(time * 0.00628) * 0.04;
    this.slimeGraphic.setScale(baseScale * (1 + wobble), baseScale * (1 - wobble));
  }

  private handleMovement() {
    // Geschwindigkeit skaliert mit Weltgröße → Bildschirm-Speed bleibt über alle Level konstant
    const worldRadius = this.calcPlayerWorldRadius(this.gameState.player.level);
    const speed = worldRadius * PLAYER_SPEED_PER_WORLD_RADIUS;
    const body = this.slimeGraphic.body;

    let dx = this.joy.active ? this.joy.dx : 0;
    let dy = this.joy.active ? this.joy.dy : 0;
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }

    body.setVelocity(dx * speed, dy * speed);
  }

  private syncPlayerPosition() {
    this.gameState.player.x = this.slimeGraphic.x;
    this.gameState.player.y = this.slimeGraphic.y;
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

      // Entity greift an
      if (frame.wantToAttack) {
        setAttackCooldown(instance, def);
        const result = entityAttack(def, instance, this.gameState.player);
        if (result.hit) {
          this.gameState.player.hp = Math.max(0, this.gameState.player.hp - result.damageDealt);
          for (const effect of result.statusApplied) {
            applyEffect(this.gameState.player, effect);
          }

          // Chitin Armor: XP für jeden eingesteckten Treffer
          this.skillLevelUp(gainSkillXp(this.gameState.player, "chitin_armor", 1), "chitin_armor");

          const reflectDmg = triggerAuras(this.gameState.player);
          if (reflectDmg > 0) {
            instance.currentHp = Math.max(0, instance.currentHp - reflectDmg);
            this.showDamageNumber(instance.x, instance.y, reflectDmg, "#ff8800");
            // Hemolymph: XP für jeden ausgelösten Rückschlag
            this.skillLevelUp(gainSkillXp(this.gameState.player, "hemolymph", 2), "hemolymph");
            if (instance.currentHp <= 0) {
              instance.isAlive  = false;
              instance.respawnAt = Date.now() + (def?.respawnTime ?? 60) * 1000;
              resetAi(instance);
              addLog(`${def?.icon ?? "?"} ${def?.name ?? "Entity"} wurde vernichtet!`, "system");
            }
          }

          addLog(result.message, "aggro");
          this.showDamageNumber(px, py, result.damageDealt, "#ff4444");
          updateUI(this.gameState);
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
      if (!hunterDef || hunterDef.category !== "creature" || !hunterDef.damage) continue;
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
        // Photosynthesis: XP pro Heilungs-Tick
        this.skillLevelUp(gainSkillXp(this.gameState.player, "photosynthesis", 1), "photosynthesis");
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
      removeExpiredEffects(instance, now);
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

    this.slimeGraphic.setPosition(this.gameState.player.x, this.gameState.player.y);
    this.cameras.main.flash(400, 255, 50, 50);
    addLog("💀 Besiegt! Checkpoint — HP/MP wiederhergestellt.", "system");
    updateUI(this.gameState);
  }

  /** Level-Up nach gainSkillXp() verarbeiten: Log + syncPassiveEffects */
  private skillLevelUp(
    result: { leveledUp: boolean; newLevel?: number },
    skillId: string
  ) {
    if (result.leveledUp) {
      const def = ALL_SKILLS.get(skillId);
      const icon = def?.icon ?? "⚡";
      addLog(`⬆️ ${icon} ${def?.name ?? skillId} → Lv.${result.newLevel}!`, "system");
      if (def?.activation === "passive") {
        syncPassiveEffects(this.gameState.player);
      }
    }
    this.checkPlayerLevelUp();
    updateUI(this.gameState);
  }

  /** Hauptlevel neu berechnen und bei Level-Up loggen */
  private checkPlayerLevelUp() {
    const r = updatePlayerLevel(this.gameState.player);
    if (r.leveledUp) {
      const p = this.gameState.player;
      addLog(`🌟 Charakter → Lv.${r.newLevel}! (HP: ${p.maxHp} / MP: ${p.maxMp})`, "levelup");
      this.updateCameraZoom(); // Welt schrumpft optisch mit dem Level-Up
    }
  }

  // Zeigt eine Schadenszahl an der Position (x, y) in Weltkoordinaten.
  // Font-Größe, Offset und Rise werden automatisch an den aktuellen Zoom angepasst,
  // damit die Zahlen auf dem Bildschirm immer gleich groß erscheinen.
  private showDamageNumber(x: number, y: number, dmg: number, color: string) {
    const zoom   = this.cameras.main.zoom;
    const fSize  = Math.max(1, Math.round(11 / zoom));  // ~11px auf dem Bildschirm
    const offset = Math.round(8  / zoom);               // Startversatz nach oben (Weltpixel)
    const rise   = Math.round(14 / zoom);               // Aufstieg der Animation (Weltpixel)
    const stroke = Math.max(1, Math.round(2 / zoom));

    const txt = this.add
      .text(x, y - offset, `${Math.round(dmg)}`, {
        fontSize: `${fSize}px`,
        color,
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: stroke,
      })
      .setOrigin(0.5)
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

  activateSkill(skillId: string) {
    const check = canActivateSkill(this.gameState.player, skillId);
    if (!check.ok) {
      showToast(check.reason ?? "Skill nicht verfügbar.", "system");
      return;
    }

    consumeSkill(this.gameState.player, skillId);
    const skillDef = ALL_SKILLS.get(skillId);

    if (skillDef?.attackType === "dash") {
      const dist = calcDashDistance(this.gameState.player, skillId);
      const dx = this.joy.active ? this.joy.dx : 0;
      const dy = this.joy.active ? this.joy.dy : 0;
      const len = Math.hypot(dx, dy);
      if (len > 0.1) {
        const nx = dx / len;
        const ny = dy / len;
        this.slimeGraphic.setPosition(
          Phaser.Math.Clamp(this.slimeGraphic.x + nx * dist, 0, 1600),
          Phaser.Math.Clamp(this.slimeGraphic.y + ny * dist, 0, 1200)
        );
      }
      // Jump: XP pro Benutzung
      this.skillLevelUp(gainSkillXp(this.gameState.player, skillId, 1), skillId);
      showToast(`🦘 Sprung! (${dist}px)`, "system");
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
      this.showDamageNumber(target.x, target.y, result.damageDealt, "#ffffff");
      if (target.currentHp <= 0) {
        target.isAlive  = false;
        const def = ENTITY_MAP.get(target.definitionId);
        target.respawnAt = Date.now() + (def?.respawnTime ?? 60) * 1000;
        resetAi(target);
        if (def) addLog(`${def.icon} ${def.name} wurde besiegt!`, "system");
      }
      addLog(result.message, "absorb");

      // XP durch aktiven Skill-Einsatz
      this.skillLevelUp(gainSkillXp(this.gameState.player, skillId, 2), skillId);
      // Superstrength: XP für jeden Nahkampftreffer
      this.skillLevelUp(gainSkillXp(this.gameState.player, "superstrength", 1), "superstrength");
      // Venom: XP wenn Vergiftung eingetreten
      if (result.statusApplied.length > 0) {
        this.skillLevelUp(gainSkillXp(this.gameState.player, "venom", 3), "venom");
      }
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
    if (result.success) {
      syncPassiveEffects(this.gameState.player);
      this.lastNearbyId = null;
      updateNearbyPanel(undefined, this.gameState);
    }
    this.checkPlayerLevelUp();
    updateUI(this.gameState);
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
    if (result.success) syncPassiveEffects(this.gameState.player);
    this.checkPlayerLevelUp();
    updateUI(this.gameState);
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
    this.checkPlayerLevelUp();
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

  // HUD
  setEl("ui-level", `Lv.${p.level}`);
  setEl("ui-hp", `${Math.floor(p.hp)}/${p.maxHp}`);
  setEl("ui-mp", `${p.mp}/${p.maxMp}`);
  setStyle("hp-bar-fill", "width", `${(p.hp / p.maxHp) * 100}%`);
  setStyle("mp-bar-fill", "width", `${(p.mp / p.maxMp) * 100}%`);
  const { xpIntoLevel, xpToNext } = calcPlayerLevel(p.totalExp);
  setStyle("xp-bar-fill", "width", `${(xpIntoLevel / xpToNext) * 100}%`);

  // Kern-Fähigkeiten
  setEl(
    "ui-analyze-level",
    `🔍 Lv.${p.coreAbilities.analyze.level} (${p.coreAbilities.analyze.currentXp}/${p.coreAbilities.analyze.xpToNextLevel} XP)`
  );
  setEl(
    "ui-absorb-level",
    `💥 Lv.${p.coreAbilities.absorb.level} (${p.coreAbilities.absorb.currentXp}/${p.coreAbilities.absorb.xpToNextLevel} XP)`
  );

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
      const progress = getXpProgress(inst);
      const maxed = isMaxLevel(inst);
      const isPassive = def.activation === "passive";
      const hasGrow = def.id === "grow" && !maxed;

      const enabled = inst.isEnabled !== false;
      return `
        <div class="skill-card element-${def.element}${isPassive && !enabled ? " skill-disabled" : ""}">
          <div class="skill-header">
            <span class="skill-icon">${def.icon}</span>
            <span class="skill-name">${def.name}</span>
            ${def.category === "combo" ? '<span class="combo-badge">COMBO</span>' : ""}
            ${isPassive ? '<span class="combo-badge" style="background:#4af0c8;color:#000">PASSIV</span>' : ""}
            <span class="skill-level">Lv.${inst.level}${maxed ? " MAX" : ""}</span>
            ${isPassive ? `<button class="btn-passive-toggle" onclick="window.togglePassiveSkill('${def.id}')">${enabled ? "AN" : "AUS"}</button>` : ""}
          </div>
          <div class="xp-bar-wrap">
            <div class="xp-bar-fill" style="width:${progress * 100}%"></div>
          </div>
          <div class="skill-xp-text">
            ${maxed ? "Maximales Level" : `${inst.currentXp} / ${inst.xpToNextLevel} XP`}
          </div>
          <div class="skill-desc">${def.description}</div>
          ${hasGrow ? `<button class="btn-grow" onclick="window.doGrow()">🌱 Grow anwenden (−5 Pflanzenfaser)</button>` : ""}
        </div>
      `;
    })
    .filter(Boolean)
    .join("");
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
      opt.textContent = `${def.icon} ${def.name} (Lv.${inst.level})`;
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
  state: GameState
) {
  const panel = document.getElementById("nearby-panel");
  if (!panel) return;

  if (!entityDef) {
    panel.innerHTML =
      '<span class="empty-hint">Keine Entity in Reichweite</span>';
    return;
  }

  const absorbLevel = state.player.coreAbilities.absorb.level;
  const analyzeLevel = state.player.coreAbilities.analyze.level;
  const absorbChance = Math.round(calcSuccessChance(absorbLevel, entityDef.level) * 100);
  const analyzeChance = Math.round(calcSuccessChance(analyzeLevel, entityDef.level) * 100);

  const skillIcons = entityDef.skillDrops
    .map((drop) => {
      const s = ALL_SKILLS.get(drop.skillId);
      return s
        ? `<span title="${s.name} (${Math.round(drop.chance * 100)}%)">${s.icon}</span>`
        : "";
    })
    .join(" ");

  const matIcons = entityDef.materialDrops
    .map((drop) => {
      const m = MATERIAL_MAP.get(drop.materialId);
      return m
        ? `<span title="${m.name} ×${drop.amountMin}–${drop.amountMax} (${Math.round(drop.chance * 100)}%)">${m.icon}</span>`
        : "";
    })
    .join(" ");

  panel.innerHTML = `
    <div class="nearby-entity">
      <span class="nearby-icon">${entityDef.icon}</span>
      <span class="nearby-name">${entityDef.name}</span>
      <span class="nearby-level" style="color:var(--muted);font-size:.75em"> Lv.${entityDef.level}</span>
      ${skillIcons ? `<div class="nearby-drops" title="Mögliche Skills">⚔️ ${skillIcons}</div>` : ""}
      ${matIcons   ? `<div class="nearby-drops" title="Mögliche Materialien">📦 ${matIcons}</div>` : ""}
    </div>
    <div class="nearby-chances" style="font-size:.7em;color:var(--muted);margin:4px 0">
      💥 ${absorbChance}% &nbsp;|&nbsp; 🔍 ${analyzeChance}%
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
      if (r.leveledUp)       return `⬆️ ${def.name} → Lv.${r.newLevel}`;
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

function switchTab(name: string) {
  (window as any)._currentTab = name;
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
  document.querySelectorAll(`.tab-btn[data-tab="${name}"]`).forEach((b) =>
    b.classList.add("active")
  );
  const el = document.getElementById(`tab-${name}`);
  if (el) el.classList.add("active");
  syncMobileTab(name);
}

function syncMobileTab(name: string) {
  const mc  = document.getElementById("mobileTabContent");
  const src = document.getElementById(`tab-${name}`);
  if (mc && src) mc.innerHTML = src.innerHTML;
}

function toggleSheet() {
  document.getElementById("bottomSheet")?.classList.toggle("open");
  syncMobileTab((window as any)._currentTab ?? "skills");
}

// -----------------------------------------------------------
// DOM-HELFER
// -----------------------------------------------------------
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
