// ============================================================
// GAME SCENE
// Absorb & Evolve — Phaser Scene für das Hauptspiel
//
// Diese Datei ist die einzige die Phaser, DOM und Browser kennt.
// Alle Spiellogik kommt aus systems/ und data/.
// ============================================================

// Phaser wird als globales `Phaser` aus dem CDN geladen.
declare const Phaser: any;

import { getPlayerVision, visionColorMatrix, getActiveMoveSkill, getActiveSightSkills, calcMoveXp, knowsMoveSkill } from "../systems/BodySystem";
import { getIntroStep, getIntroText, type IntroStep } from "../systems/IntroSystem";
import {
  settle, canSettle, split, canSplit, rise, canRise, merge, canMerge, dryOut, switchTo, canSwitch,
  findTouchedBlob, nearestSettled, summarizeAhead, storedCoreRadius, consciousWorkRange, radiusFromMass,
  previewSplit, defaultSplitTake, reassignSources, needsReassign,
} from "../systems/BlobSystem";
import { runActivity, calcWorkRange, planActivity, catchUpSettled } from "../systems/SettlementSystem";
import { ACTION_SECONDS, SETTLE_AGGRO_LOCK_MS } from "../data/blobs";
import { KG_PER_FIBER, MAX_BODY_MASS } from "../data/grow";
import type { BlobActivity, StoredBlob } from "../types/Blob";
import { createBlobActions, type BlobActionsState, type BlobActionButton } from "../ui/BlobActions.js";
import { createBlobPicker, type BlobPickerState } from "../ui/BlobPicker.js";
import { createTransferDialog, type TransferDialogState } from "../ui/TransferDialog.js";
import { createGainFeed, type GainFeedState } from "../ui/GainFeed.js";
import { createIntroQueue, skillIntroCard, type IntroQueueState, type IntroSection } from "../ui/SkillIntro.js";
import { SIGHT_INTRO, MOVE_INTRO_SETTLED, MOVE_TRY_SETTLED, MOVE_INTRO_TRAVELING, MOVE_TRY_TRAVELING, TRAVEL_TITLE, TRAVEL_TEXT } from "../data/tutorial";
import { createMapView, type MapViewState, type MapBlob } from "../ui/MapView.js";
import type { GameMenu } from "../ui/GameMenu.js";
import { createBlobArrows, type BlobArrowsState } from "../ui/BlobArrows.js";
import { BlobRenderer, type BlobVisualSpec } from "./BlobRenderer";
import { SIGHT_EDGE_FRACTION } from "../data/body";
import { processGrow, getPlayerGrowth } from "../systems/GrowSystem";
import { practiceXp } from "../systems/SkillEffectSystem";
import { createInitialGameState } from "../types/GameState.js";
import type { GameState, PlayerState } from "../types/GameState.js";
import { serializeBody, deserializeBody } from "../systems/BodySerializer";
import { getBiomeAt } from "../world/BiomeDefinitions.js";
import { ALL_SKILLS } from "../data/skills.js";
import { MATERIAL_MAP } from "../data/materials.js";
import { ENTITY_MAP, ENTITY_DEFINITIONS } from "../data/entities.js";
import {
  discoverSkill,
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
  getLearningEffort,
  getCoreProgress,
  levelFromProgress,
  getEntitySkillProgress,
  rankNameForProgress,
} from "../systems/ProgressionSystem.js";
import type { GainResult, ProgressionEvent, RankInfo } from "../systems/ProgressionSystem.js";
import {
  type InteractionResult,
  absorbEntity,
  analyzeEntity,
  findNearestEntity,
  getEntityRadius,
  processRespawns,
  calcSuccessChance,
} from "../systems/EntitySystem.js";
import {
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
  regenMp,
  formatPlayerSkillDamage,
} from "../systems/CombatSystem.js";
import {
  processTicks,
  processRegeneration,
  applyEffect,
  removeExpiredEffects,
  syncPassiveEffects,
  refreshPassiveEffectValues,
} from "../systems/StatusEffectSystem.js";
import {
  PLAYER_WORLD_RADIUS_MIN,
  PLAYER_SCREEN_RADIUS,
  toDisplayHp,
} from "../data/balance.js";
import { calcPlayerWorldRadius, calcPlayerSpeed, calcPlayerReach, describePlayerSkillValues } from "../systems/StatsSystem.js";
import { addVenomDose, processVenom, getVenomLoad, clearVenom } from "../systems/VenomSystem.js";
import { generateTileset, TILE_SIZE, biomeBaseColor } from "../world/TilesetGenerator.js";
import { ChunkManager } from "../world/ChunkManager.js";
import { CHUNK_PX, WORLD_CHUNKS_X, WORLD_CHUNKS_Y } from "../world/Chunk.js";

// Gift-Farben: Dosis-Zahl beim Biss und Giftlast-Abschnitt der HP-Leisten
// (Spieler-HUD: #hp-bar-venom in accognita.template.html)
const VENOM_TEXT_COLOR = "#c070ff";
const VENOM_BAR_COLOR  = 0xaa44ff;

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
  // Sehen (GDD-09): Dunkelheit außerhalb der Sichtweite, Farbfilter der Kamera
  private darkness!: any;      // schwarze Flächen außerhalb des Sichtkreises
  private visionHole!: any;    // Bild mit weichem, durchsichtigem Kreis in der Mitte
  private colorFx: any = null;
  private lastVisionKey = "";
  // Erwachen: Hinweistext, solange der Blob blind oder unbeweglich ist
  private introEl: HTMLElement | null = null;
  private introStep: IntroStep | null = null;
  private introWorking = false;
  private gamePaused = false;
  private pauseReasons = new Set<"fullscreen" | "ui" | "death" | "intro">();
  private hpBarGraphics!: any;
  private skillBar!: SkillBarState;
  private playtimeAccumulator = 0; // Sekunden akkumulieren für player.playtimeSeconds
  // Stufenlose Erfahrung (Gift, Regeneration) kommt jeden Frame in kleinen Beträgen —
  // Werte, Wachstum und UI werden dann nur einmal pro Sekunde nachgeführt
  private progressDirty = false;
  // Blob-Formen (GDD-10): Knöpfe, Auswahl/Sterbescreen, Richtungspfeile, andere Blobs
  private blobActions!: BlobActionsState;
  private blobPicker!: BlobPickerState;
  private transferDialog!: TransferDialogState;
  private gainFeed: GainFeedState | null = null;
  private moveFeed: { id: string; xp: number } | null = null;
  private introQueue!: IntroQueueState;
  private gameMenu!: GameMenu;
  private mapView: MapViewState | null = null;
  /** Wahlmodus der Karte (Sterbescreen): wird beim Tipp auf „Hier weitermachen“ aufgerufen */
  private mapPick: { finish: (id: string) => void; dried: StoredBlob } | null = null;
  private visitedSet = new Set<string>();
  private visitedRef: string[] | null = null;
  private blobArrows!: BlobArrowsState;
  private blobRenderer!: BlobRenderer;
  private lastAggroAt = -Infinity;       // Date.now() der letzten Aggro auf den Reisenden
  private activityAccumulator = 0;       // ms Tätigkeit seit dem letzten Rechenstück
  private deathPending = false;          // Sterbescreen offen
  private actionsRefreshAt = 0;
  private formUiKey = "";

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
    this.setupVision();

    // Passive Skills als permanente StatusEffekte initialisieren
    syncPassiveEffects(this.gameState.player);

    (window as any).gameState    = this.gameState;
    (window as any).gameScene    = this;
    (window as any).__ALL_SKILLS = ALL_SKILLS;

    this.setupSkillBar();
    this.setupSaveMenu();
    this.setupGameMenu();
    this.setupBlobUi();

    this.cameras.main.startFollow(this.blobGraphic, true, 1.0, 1.0);
    this.updateCameraZoom(); // Zoom passend zur Startgröße

    updateUI(this.gameState);
    addLog("Du erwachst als Blob…", "system");
    this.updateIntro();
  }

  // ----------------------------------------------------------
  // SEHEN (GDD-09 Abschnitt 3) — Werte aus BodySystem, hier nur Darstellung
  // ----------------------------------------------------------
  private setupVision() {
    // Dunkelheit über der Welt, der Blob selbst bleibt sichtbar (er spürt sich).
    // Textur: schwarzes Quadrat mit weichem Loch (Rand = SIGHT_EDGE_FRACTION),
    // drumherum schwarze Rechtecke bis über den Bildschirmrand.
    const size = 256, half = size / 2;
    const tex = this.textures.createCanvas("vision-hole", size, size);
    const ctx = tex.getContext();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = "destination-out";
    const grad = ctx.createRadialGradient(half, half, half * (1 - SIGHT_EDGE_FRACTION), half, half, half);
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    tex.refresh();
    this.visionHole = this.add.image(0, 0, "vision-hole").setDepth(20);
    this.darkness = this.add.graphics().setDepth(20);
    this.blobGraphic.setDepth(21);
    // Farbfilter: nur mit WebGL verfügbar; ohne bleibt das Bild farbig, die Sichtweite gilt trotzdem
    const cam = this.cameras.main as any;
    this.colorFx = cam.postFX?.addColorMatrix?.() ?? null;
    if (this.colorFx) {
      // Der Renderer meldet sich schon beim Spielstart für RESIZE an, läuft
      // also vor diesem Listener — seine neue Größe steht dann schon fest.
      this.fixCameraFxSize();
      this.scale.on(Phaser.Scale.Events.RESIZE, this.fixCameraFxSize, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.scale.off(Phaser.Scale.Events.RESIZE, this.fixCameraFxSize, this);
      });
    }
  }

  private updateVision() {
    const player = this.gameState.player;
    const vision = getPlayerVision(player);
    const cam = this.cameras.main;
    const zoom = cam.zoom;
    const radius = this.calcPlayerWorldRadius();
    const r = vision.range * radius;                         // Sichtweite in Weltpixeln
    const far = Math.hypot(cam.width, cam.height) / zoom;    // reicht über den ganzen Bildschirm
    const g = this.darkness;
    const { x, y } = player;
    g.clear();
    if (r <= 0) {
      this.visionHole.setVisible(false);
      g.fillStyle(0x000000, 1);
      g.fillRect(x - far, y - far, far * 2, far * 2);
    } else if (r < far) {
      // Quadrat 2r × 2r mit weichem Loch, außen vier schwarze Rechtecke
      this.visionHole.setVisible(true).setPosition(x, y).setDisplaySize(r * 2, r * 2);
      g.fillStyle(0x000000, 1);
      g.fillRect(x - far, y - far, far * 2, far - r);       // oben
      g.fillRect(x - far, y + r, far * 2, far - r);         // unten
      g.fillRect(x - far, y - r, far - r, r * 2);           // links
      g.fillRect(x + r, y - r, far - r, r * 2);             // rechts
    } else {
      this.visionHole.setVisible(false);                    // Sichtweite größer als der Bildschirm
    }
    // Farbe nur nachführen, wenn sie sich spürbar ändert
    this.layoutIntro(r * zoom);
    const key = `${vision.color.toFixed(2)}|${vision.red.toFixed(2)}`;
    if (this.colorFx && key !== this.lastVisionKey) {
      this.lastVisionKey = key;
      this.colorFx.set(visionColorMatrix(vision));
    }
  }

  // Phaser 3.70: Der Kamera-Farbfilter zeichnet über Zwischenflächen
  // (Render Targets). Zwei davon behalten die Größe vom Spielstart:
  //  - die Flächen der Utility-Pipeline (fullFrame1/2, halfFrame1/2), in die
  //    der Farbfilter das gefilterte Bild schreibt — Phaser legt sie ohne
  //    autoResize an und schaltet es nie ein; ihr resize() tut dann nichts,
  //  - die Fläche der Farbfilter-Pipeline selbst (bootFX setzt autoResize
  //    erst beim ersten Zeichnen).
  // Nach Drehen ins Querformat wird dann nur ein Teil der alten Fläche neu
  // beschrieben, der Rest bleibt stehen und wird verzerrt gestreckt.
  // [VERWORFEN, v0.7.2] nur target.resize() — wirkungslos, solange
  // autoResize aus ist.
  // Deshalb: autoResize einschalten und sofort auf die Renderer-Größe
  // bringen — beim Start und bei jedem RESIZE (deckt Drehen ab).
  private fixCameraFxSize() {
    if (!this.colorFx) return;
    const renderer = this.game.renderer as any;
    const w = renderer.width, h = renderer.height;
    const pipelines = [
      renderer.pipelines?.UTILITY_PIPELINE,
      ...((this.cameras.main as any).postPipelines ?? []),
    ];
    for (const pipeline of pipelines) {
      for (const target of pipeline?.renderTargets ?? []) {
        target.autoResize = true;
        target.resize(w, h);   // berücksichtigt target.scale (halfFrame = 0,5)
      }
    }
  }

  // Hinweistext nie über den Sichtkreis legen (im Querformat ist die
  // Spielfläche flach — oben ist dort kein Platz): über dem Kreis, wenn er
  // dort hinpasst, sonst links daneben, notfalls schmal am oberen Rand.
  private introLayoutKey = "";
  private layoutIntro(sightScreenRadius: number) {
    const el = this.introEl;
    if (!el || el.style.opacity === "0") return;
    const cam = this.cameras.main;
    const W = cam.width, H = cam.height, gap = 10;
    const rs = Math.min(sightScreenRadius, Math.hypot(W, H));
    const width = Math.min(W * 0.86, 420);
    let mode: "top" | "side" | "edge";
    if (H / 2 - rs - gap >= el.offsetHeight + gap) mode = "top";
    else if (W / 2 - rs - 2 * gap >= 170) mode = "side";
    else mode = "edge";
    const key = `${mode}|${Math.round(rs)}|${W}|${H}`;
    if (key === this.introLayoutKey) return;
    this.introLayoutKey = key;
    if (mode === "top") {
      Object.assign(el.style, {
        left: "50%", width: `${width}px`, fontSize: ".82rem",
        top: `${Math.max(gap, (H / 2 - rs - el.offsetHeight) / 2)}px`, transform: "translateX(-50%)",
      });
    } else if (mode === "side") {
      Object.assign(el.style, {
        left: `${gap}px`, width: `${Math.min(W / 2 - rs - 2 * gap, 320)}px`, fontSize: ".74rem",
        top: "50%", transform: "translateY(-50%)",
      });
    } else {
      Object.assign(el.style, {
        left: "50%", width: `${width}px`, fontSize: ".68rem",
        top: `${gap / 2}px`, transform: "translateX(-50%)",
      });
    }
  }

  // ----------------------------------------------------------
  // ERWACHEN (GDD-09 Abschnitt 5) — Schritt aus IntroSystem
  // ----------------------------------------------------------
  private updateIntro() {
    const step = getIntroStep(this.gameState.player);
    const act = this.gameState.conscious.activity;
    const working = this.gameState.conscious.form === "settled" && !!act && act !== "rest";
    if (step === this.introStep && working === this.introWorking) return;
    const first = this.introStep === null;
    this.introStep = step;
    this.introWorking = working;
    this.lastNearbyId = null; // Nearby-Anzeige neu zeichnen (blind ↔ sehend)
    if (!this.introEl) {
      this.introEl = document.createElement("div");
      this.introEl.id = "intro-text";
      Object.assign(this.introEl.style, {
        position: "absolute", left: "50%", top: "10px", transform: "translateX(-50%)",
        width: "min(86vw, 420px)", padding: "10px 14px", borderRadius: "10px", boxSizing: "border-box",
        background: "rgba(5,8,14,.78)", border: "1px solid rgba(74,240,200,.25)",
        color: "#cfe", font: "italic .82rem/1.5 Georgia, serif", textAlign: "center",
        pointerEvents: "none", zIndex: "40", transition: "opacity .6s",
      });
      (document.getElementById("canvas-wrap") ?? document.body).appendChild(this.introEl);
    }
    if (step === "awake") {
      // Ein geladener, längst wacher Blob braucht keinen Hinweis
      if (first) { this.introEl.style.opacity = "0"; return; }
      this.introEl.textContent = getIntroText("awake", this.gameState.conscious.form);
      this.introEl.style.opacity = "1";
      this.introLayoutKey = "";
      addLog(getIntroText("awake", this.gameState.conscious.form), "system");
      this.time.delayedCall(9000, () => { if (this.introStep === "awake" && this.introEl) this.introEl.style.opacity = "0"; });
      return;
    }
    const text = getIntroText(step, this.gameState.conscious.form, working);
    this.introEl.textContent = text;
    this.introEl.style.opacity = "1";
    this.introLayoutKey = ""; // neuer Text, neue Höhe
    if (!first) addLog(text, "system");
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
      // Abstand bis zum Rand des Gegners (Treffer-Reichweite, balance.ts)
      const dist = Math.hypot(
        this.gameState.player.x - instance.x,
        this.gameState.player.y - instance.y,
      ) - getEntityRadius(def);
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

  // Welt-Radius des Blobs aus seinem stetigen Wachstum (StatsSystem — dieselbe
  // Funktion zeigt der Werte-Tab an).
  private calcPlayerWorldRadius(): number {
    return calcPlayerWorldRadius(this.gameState.player);
  }

  // Reichweite des Blobs (Nahkampf, Absorb, Analyze) in Weltpixeln, gemessen
  // vom Mittelpunkt des Blobs bis zum RAND des Gegners (StatsSystem).
  private getPlayerAttackRange(): number {
    return calcPlayerReach(this.gameState.player);
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
  private setPaused(reason: "fullscreen" | "ui" | "death" | "intro", on: boolean) {
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
      this.pauseReasons.has("fullscreen") && !this.pauseReasons.has("ui") && !this.pauseReasons.has("intro")
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
    const menu = createGameMenu({
      renderMap: (root) => this.renderMap(root),
      onClose: () => {
        // Karte im Wahlmodus ohne Wahl geschlossen: zurück zum Sterbescreen
        const pick = this.mapPick;
        this.mapPick = null;
        if (pick && this.deathPending) this.openDeathScreen(pick.dried);
      },
    });
    this.gameMenu = menu;
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
    if (this.deathPending) {
      showToast("Wähle erst einen Blob, bei dem du weitermachst.", "system");
      return;
    }
    // SkillBar-Slots in player.activeSkillSlots spiegeln
    if (this.skillBar) {
      for (let i = 0; i < 4; i++) {
        this.gameState.player.activeSkillSlots[i] = this.skillBar.slots[i];
      }
    }
    saveToSlot(slot, this.gameState, this.skillBar?.slots ?? []);
    addLog(`💾 Spielstand in Slot ${slot + 1} gespeichert.`, "system");
  }

  /** Spielstand aus Slot laden */
  loadGame(slot: number) {
    const saved = loadFromSlot(slot);
    if (!saved) {
      showToast("Speicherstand nicht gefunden.", "system");
      return;
    }

    // Spieler-State (Arbeitskopie des Blobs mit Bewusstsein) und alle Blobs ersetzen
    this.gameState.player = saved.player;
    this.gameState.conscious = saved.conscious;
    this.gameState.blobs = saved.blobs;
    this.gameState.nextBlobNumber = saved.nextBlobNumber;
    this.gameState.markedBlobIds = saved.markedBlobIds;
    this.gameState.visitedChunks = saved.visitedChunks;
    this.gameState.seenIntros = saved.seenIntros;
    this.gainFeed?.clear();

    // Spieler-Sprite an gespeicherte Position
    this.blobGraphic.setPosition(saved.player.x, saved.player.y);

    // Ruhe seit dem Speichern verbuchen (Übertraining klingt auch offline ab)
    // und die Kapazitätsgrenze herstellen (alte Spielstände können darüber liegen)
    this.logProgressionEvents(settleAfterLoad(this.gameState.player, Date.now()));

    // maxHp/maxMp aus dem Wachstum (Körpermasse) neu berechnen (migriert alte Saves)
    const growth = getPlayerGrowth(this.gameState.player);
    this.gameState.player.maxHp = calcMaxHp(growth);
    this.gameState.player.maxMp = calcMaxMp(growth);
    this.gameState.player.hp = Math.min(this.gameState.player.hp, this.gameState.player.maxHp);
    this.gameState.player.mp = Math.min(this.gameState.player.mp, this.gameState.player.maxMp);

    // Kamera-Zoom an die gespeicherte Größe anpassen
    this.updateCameraZoom();

    // Erwachen: Hinweis passend zum geladenen Stand (ein wacher Blob bekommt keinen)
    this.introStep = null;
    this.updateIntro();

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
      clearVenom(instance);
      instance.attackCooldownRemaining = 0;
      instance.isAlive = true;
      instance.respawnAt = undefined;
      // Bonus aus dem Entity-Leveling zurücksetzen — sonst passt currentHp
      // (Grundwert) nicht zum skalierten Maximum
      instance.bonusLevel = 0;
      instance.skillWins = 0;
      instance.levelingCooldown = 0;
    }

    this.deathPending = false;
    this.blobPicker?.close();
    this.setPaused("death", false);
    this.activityAccumulator = 0;
    reassignSources(this.gameState); // Quellen nach „der nächste Blob erntet“ (GDD-10 8.3)
    this.refreshBlobSprites();
    this.applyFormUi();

    updateUI(this.gameState);
    addLog(`▶ Slot ${slot + 1} geladen — ${this.gameState.conscious.name}, ${saved.player.discoveredSkills.size} Skills.`, "system");
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
      if (this.moveFeed) {
        const def = ALL_SKILLS.get(this.moveFeed.id);
        this.gainFeed?.add(`xp:${this.moveFeed.id}`, def?.icon ?? "💨", def?.name ?? this.moveFeed.id, this.moveFeed.xp, "XP", formatXp);
        this.moveFeed = null;
      }
      if (this.progressDirty) {
        this.progressDirty = false;
        this.afterProgressChange();
      }
    }
    if (this.deathPending) return;
    this.tickSettledActivity(delta);
    const prevX = this.gameState.player.x, prevY = this.gameState.player.y;
    this.handleMovement();
    this.syncPlayerPosition();
    this.gainBodyXp(prevX, prevY, delta);
    this.chunkManager.tick(this.gameState.player.x, this.gameState.player.y, Date.now());
    this.markVisitedChunk();
    this.processEntityAi(delta);
    this.processEntityLeveling(delta);
    this.processCombatEffects(delta);
    this.updateEntityVisuals();
    this.updateBlobWobble(_time);
    this.updateVision();
    this.updateGainFeedAnchor();
    this.checkNearbyEntity();
    this.checkPlayerDeath();
    processRespawns(this.gameState.world);
    this.updateBlobOverlay();
  }

  // Bewegen und Sehen lernt man durch Tun (Menge am Skill: practice): Strecke
  // für den aktiven Bewegungs-Skill, Spielzeit für jeden eingeschalteten Seh-Skill.
  // Stufenlos jeden Frame; Werte werden einmal pro Sekunde nachgeführt.
  private gainBodyXp(prevX: number, prevY: number, delta: number) {
    const player = this.gameState.player;
    const moveSkill = getActiveMoveSkill(player);
    const dist = Math.hypot(player.x - prevX, player.y - prevY);
    if (moveSkill && dist > 0) {
      const xpBefore = player.discoveredSkills.get(moveSkill)?.xp ?? 0;
      const gain = gainSkillXp(player, moveSkill, calcMoveXp(moveSkill, dist, this.calcPlayerWorldRadius()));
      // Für die Anzeige sammeln, einmal pro Sekunde zeigen (nicht jeden Frame)
      const xpGain = (player.discoveredSkills.get(moveSkill)?.xp ?? 0) - xpBefore;
      if (xpGain > 0) this.moveFeed = { id: moveSkill, xp: (this.moveFeed?.id === moveSkill ? this.moveFeed.xp : 0) + xpGain };
      this.logProgressionEvents(gain.events);
      this.progressDirty = true;
    }
    for (const id of getActiveSightSkills(player)) {
      const gain = gainSkillXp(player, id, practiceXp(id, "second_enabled", delta / 1000));
      this.logProgressionEvents(gain.events);
      this.progressDirty = true;
    }
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
    // Joystick nur beim Reisenden (GDD-10 Abschnitt 13.5)
    if (this.gameState.conscious.form !== "traveling") {
      this.blobGraphic.body.setVelocity(0, 0);
      return;
    }
    // Geschwindigkeit skaliert mit Weltgröße → Bildschirm-Speed bleibt über alle Größen konstant
    const speed = calcPlayerSpeed(this.gameState.player);
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
      const venomLoad = getVenomLoad(instance);
      if (def && def.hp && (instance.currentHp < scaledMaxHp || instance.isAggro || venomLoad > 0)) {
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
        this.hpBarGraphics.fillRect(bx, by, bw * ratio, bh);
        // Giftlast: violetter Abschnitt am Ende — so viele HP kostet das Gift noch
        if (venomLoad > 0) {
          const venomRatio = Math.min(venomLoad, instance.currentHp) / scaledMaxHp;
          this.hpBarGraphics.fillStyle(VENOM_BAR_COLOR, 1);
          this.hpBarGraphics.fillRect(bx + bw * (ratio - venomRatio), by, bw * venomRatio, bh);
        }
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
    // Niedergelassene Blobs sind vorerst kein Ziel (GDD-10 Abschnitt 2)
    const hasTarget = this.gameState.conscious.form === "traveling";

    for (const [id, instance] of this.gameState.world.entities) {
      if (!activeIds.has(id)) continue;
      if (!instance.isAlive) continue;
      const def = ENTITY_MAP.get(instance.definitionId);
      if (!def) continue;

      tickAttackCooldown(instance, delta);
      tickRangedCooldown(instance, delta);

      const frame = calcEntityAi(def, instance, px, py, now, hasTarget);
      if (instance.isAggro) this.lastAggroAt = now;

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
          if (result.venomDose && result.venomDose.total > 0) {
            addVenomDose(this.gameState.player, result.venomDose);
            this.showVenomDose(px, py, result.venomDose.total);
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

    // Spieler-Effekte (getickt)
    const playerHpDelta = processTicks(this.gameState.player, now);
    if (playerHpDelta !== 0) {
      this.gameState.player.hp = Math.max(0,
        Math.min(this.gameState.player.maxHp, this.gameState.player.hp + playerHpDelta));
      if (playerHpDelta < 0) {
        this.showDamageNumber(
          this.gameState.player.x, this.gameState.player.y,
          -playerHpDelta, "#aa44ff"
        );
      }
      updateUI(this.gameState);
    }
    removeExpiredEffects(this.gameState.player, now);

    // Regeneration (Photosynthesis): stufenlos als Rate, jeden Frame
    // Bei 0 HP heilt nichts mehr — sonst rettete eine winzige Heilung im selben Frame vor dem Vertrocknen
    const healed = this.gameState.player.hp > 0 ? processRegeneration(this.gameState.player, delta) : 0;
    if (healed > 0) {
      this.gameState.player.hp += healed;
      // Photosynthesis: XP je geheiltem HP (Menge am Skill: practice), stufenlos
      // (÷1000: milli-HP → HP, kein Entity-Level)
      const gain = gainSkillXp(this.gameState.player, "photosynthesis", practiceXp("photosynthesis", "hp_healed", healed / 1000));
      this.logProgressionEvents(gain.events);
      this.progressDirty = true;
      updateVitalsUI(this.gameState.player);
    }

    // Wachsen (Grow): verdaut Pflanzenfasern über die Spielzeit → Körpermasse → Wachstum
    // Das Nest gilt als ausgewachsen und wächst nicht (GDD-10 Abschnitt 7.1)
    const digested = this.gameState.conscious.nest ? 0 : processGrow(this.gameState.player, delta);
    if (digested > 0) {
      this.afterXpGain(gainSkillXp(this.gameState.player, "grow", practiceXp("grow", "fiber_digested", digested)));
    }

    // Gift auf dem Spieler: stufenlos, keine Zahl (die kam beim Biss)
    const playerVenom = processVenom(this.gameState.player, this.gameState.player.hp, delta).dealt;
    if (playerVenom > 0) {
      this.gameState.player.hp = Math.max(0, this.gameState.player.hp - playerVenom);
      updateVitalsUI(this.gameState.player);
    }

    // Entity-Effekte — processTicks erwartet { hp, maxHp } → Wrapper
    for (const instance of this.gameState.world.entities.values()) {
      if (!instance.isAlive) continue;
      const def = ENTITY_MAP.get(instance.definitionId);
      const wrapper = {
        statusEffects: instance.statusEffects,
        hp: instance.currentHp,
        maxHp: def?.hp ?? 0,
      };
      // Gift (VenomSystem): stufenloser Abbau der Giftlast = Schaden
      const venom = processVenom(instance, instance.currentHp, delta);
      const venomDealt = venom.dealt;
      const hpDelta = processTicks(wrapper, now) - venomDealt;
      if (hpDelta !== 0) {
        instance.currentHp = Math.max(0, instance.currentHp + hpDelta);
        // Schadenszahl nur für getickte Effekte — Gift zeigte seine beim Biss
        if (hpDelta + venomDealt < 0) {
          this.showDamageNumber(instance.x, instance.y, -(hpDelta + venomDealt), "#44ff88");
        }
        if (instance.currentHp <= 0) {
          instance.isAlive  = false;
          instance.respawnAt = Date.now() + (def?.respawnTime ?? 60) * 1000;
          resetAi(instance);
          if (def) addLog(`${def.icon} ${def.name} wurde vernichtet!`, "system");
        }
      }
      // Gift-XP = angerichteter Giftschaden, stufenlos jeden Frame (÷1000: milli-HP → XP),
      // anteilig für den Skill, der das Gift eingespritzt hat (Venom, Stachelstich).
      // Gegner vergiften sich nicht gegenseitig — jede Giftlast hier stammt vom Blob.
      for (const [skillId, amount] of Object.entries(venom.bySkill)) {
        if (amount <= 0) continue;
        const gain = gainSkillXp(this.gameState.player, skillId, amount / 1000, def?.level);
        this.logProgressionEvents(gain.events);
        this.progressDirty = true;
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

  // Vertrocknen statt Checkpoint (GDD-10 Abschnitt 9): Der Reisende wird zum
  // vertrockneten Blob, dann erscheint der Sterbescreen. [VERWORFEN, 15. November
  // 2026] executeCheckpoint — HP/MP wiederherstellen und zum Spawnpunkt.
  private checkPlayerDeath() {
    if (this.gameState.player.hp > 0 || this.deathPending) return;
    if (this.gameState.conscious.form !== "traveling") {
      this.gameState.player.hp = 1; // niedergelassen nicht angreifbar — Gift o. ä. lässt ihn nicht vertrocknen
      return;
    }
    this.syncSkillBarIntoPlayer();
    const dried = dryOut(this.gameState);
    for (const instance of this.gameState.world.entities.values()) resetAi(instance);
    this.cameras.main.flash(400, 255, 50, 50);
    addLog(`💀 Besiegt — dein Körper ist als ${dried.name} vertrocknet.`, "system");
    this.deathPending = true;
    this.setPaused("death", true);
    this.refreshBlobSprites();
    this.openDeathScreen(dried);
  }

  // ----------------------------------------------------------
  // BLOB-FORMEN (GDD-10) — Logik in BlobSystem/SettlementSystem, hier nur Glue
  // ----------------------------------------------------------
  private setupBlobUi() {
    this.blobActions = createBlobActions((id) => this.onBlobAction(id), (reason) => showToast(reason, "system"));
    this.blobPicker = createBlobPicker();
    this.transferDialog = createTransferDialog();
    // Skill-Vorstellungen: eigener Pause-Grund, damit ein Dialog, der sich
    // gleichzeitig schließt, das Spiel nicht unter der Karte fortsetzt
    this.introQueue = createIntroQueue({
      onFirstOpen: () => this.setPaused("intro", true),
      onAllClosed: () => this.setPaused("intro", false),
    });
    this.gainFeed = createGainFeed(document.getElementById("canvas-wrap") ?? document.body);
    this.blobArrows = createBlobArrows(document.getElementById("canvas-wrap") ?? document.body);
    this.blobRenderer = new BlobRenderer(this, 5);
    reassignSources(this.gameState); // neues Spiel: Quellen des Nests
    this.refreshBlobSprites();
    this.applyFormUi();
  }

  /** Meter aus Weltpixeln: 61 cm ≙ 16 px Durchmesser des ausgewachsenen Blobs. */
  private toMeters(px: number): number {
    return Math.round(px * 0.61 / 16);
  }

  /** Skill-Leiste gehört jedem Blob selbst (GDD-10 Abschnitt 5). */
  private syncSkillBarIntoPlayer() {
    if (!this.skillBar) return;
    for (let i = 0; i < 4; i++) this.gameState.player.activeSkillSlots[i] = this.skillBar.slots[i];
  }

  /** Tätigkeit des niedergelassenen Blobs mit Bewusstsein: je Aktion ein Rechenstück (13.6). */
  private tickSettledActivity(delta: number) {
    const meta = this.gameState.conscious;
    if (meta.form !== "settled") { this.activityAccumulator = 0; return; }
    meta.simulatedUntil = this.gameState.player.playtimeSeconds;
    if (!meta.activity || meta.activity === "rest") { this.activityAccumulator = 0; return; }
    this.activityAccumulator += delta;
    while (this.activityAccumulator >= ACTION_SECONDS * 1000) {
      this.activityAccumulator -= ACTION_SECONDS * 1000;
      this.runSettledAction(ACTION_SECONDS, true);
    }
  }

  private runSettledAction(seconds: number, feedback = false) {
    const state = this.gameState;
    const meta = state.conscious;
    if (meta.form !== "settled" || seconds <= 0) return;
    meta.carry = meta.carry ?? {};
    const p = state.player;
    // Reichweite gewachsen: neu verteilen (GDD-10 8.3)
    if (needsReassign(state)) reassignSources(state);
    const method = meta.activity === "absorb" || meta.activity === "analyze" ? meta.activity : null;
    const before = this.xpSnapshot();
    const r = runActivity(p, meta.activity, meta.sources ?? [], seconds, meta.carry, p.playtimeSeconds);
    if (method && feedback) {
      this.feedXpSince(before, r.discovered);
      this.feedMaterials(r.materials);
      this.feedFindProgress(meta.carry, (meta.sources ?? []).length > 0, method);
    }
    this.logProgressionEvents(r.events);
    for (const id of r.discovered) {
      const def = ALL_SKILLS.get(id);
      addLog(`✨ Neuer Skill entdeckt: ${def?.icon ?? ""} ${def?.name ?? id}`, "skill");
    }
    for (const [id, n] of Object.entries(r.materials)) {
      const m = MATERIAL_MAP.get(id);
      addLog(`+${n} ${m?.icon ?? ""} ${m?.name ?? id}`, "absorb");
    }
    if (r.discovered.length > 0) syncPassiveEffects(p);
    this.announceSkills(r.discovered);
    if (r.events.length > 0 || r.discovered.length > 0 || Object.keys(r.materials).length > 0) {
      this.afterProgressChange();
    } else {
      this.progressDirty = true;
    }
  }

  // ----------------------------------------------------------
  // RÜCKMELDUNG: Anzeige unter dem Blob (GainFeed) und Skill-Vorstellungen
  // (Vorgabe Entwickler, 15. November 2026)
  // ----------------------------------------------------------

  /** Erfahrung aller Skills und Kern-Fähigkeiten, um danach den Zuwachs zu zeigen */
  private xpSnapshot(): Map<string, number> {
    const p = this.gameState.player;
    const m = new Map<string, number>();
    m.set("absorb", p.coreAbilities.absorb.xp);
    m.set("analyze", p.coreAbilities.analyze.xp);
    for (const [id, inst] of p.discoveredSkills) m.set(id, inst.xp);
    return m;
  }

  /** Zuwachs seit `before` in die Anzeige; neu entdeckte Skills zeigt ihre Karte */
  private feedXpSince(before: Map<string, number>, skip: string[] = []) {
    const feed = this.gainFeed;
    if (!feed) return;
    const p = this.gameState.player;
    const show = (id: string, icon: string, name: string, now: number) => {
      const gain = now - (before.get(id) ?? now);
      if (gain > 1e-6) feed.add(`xp:${id}`, icon, name, gain, "XP", formatXp);
    };
    show("analyze", "🔍", "Analyze", p.coreAbilities.analyze.xp);
    show("absorb", "💥", "Absorb", p.coreAbilities.absorb.xp);
    for (const [id, inst] of p.discoveredSkills) {
      if (skip.includes(id) || !before.has(id)) continue;
      const def = ALL_SKILLS.get(id);
      show(id, def?.icon ?? "✨", def?.name ?? id, inst.xp);
    }
  }

  private feedMaterials(materials: Record<string, number>) {
    for (const [id, n] of Object.entries(materials)) {
      const m = MATERIAL_MAP.get(id);
      this.gainFeed?.add(`mat:${id}`, m?.icon ?? "📦", m?.name ?? id, n, "", (x) => String(Math.round(x)));
    }
  }

  /** Wie weit der nächste Fund ist (nur solange noch etwas zu entdecken ist) */
  private feedFindProgress(carry: Record<string, number>, hasSources: boolean, method: "absorb" | "analyze") {
    const feed = this.gainFeed;
    if (!feed) return;
    if (!hasSources) { feed.set("find", `${method === "absorb" ? "💥" : "🔍"} Nichts in Reichweite`); return; }
    let best = 0;
    for (const [k, v] of Object.entries(carry)) {
      if (k.startsWith("find:") && !this.gameState.player.discoveredSkills.has(k.slice(5))) best = Math.max(best, v);
    }
    if (best > 0) feed.set("find", `✨ Nächster neuer Skill ${Math.min(99, Math.floor(best * 100))} %`);
  }

  /** Feed unter dem Blob halten (Bildschirm-Pixel relativ zum Spielbereich) */
  private updateGainFeedAnchor() {
    if (!this.gainFeed) return;
    const cam = this.cameras.main;
    const p = this.gameState.player;
    const sx = (p.x - cam.worldView.x) * cam.zoom;
    const sy = (p.y - cam.worldView.y) * cam.zoom;
    const r = calcPlayerWorldRadius(p) * cam.zoom;
    // Querformat mit wenig Höhe: rechts neben den Blob, sonst darunter
    const landscape = cam.width > cam.height && cam.height < 600;
    if (landscape) this.gainFeed.setAnchor(sx + r + 16, sy - r, "left");
    else this.gainFeed.setAnchor(sx, sy + r + 12);
  }

  /**
   * Neu entdeckte Skills nacheinander vorstellen — jeder Skill nur beim
   * ersten Mal im ganzen Spiel (seenIntros). Reihenfolge: Sehen zuerst,
   * Bewegen zuletzt (endet mit der Aufforderung, es auszuprobieren).
   */
  private announceSkills(ids: string[]) {
    const state = this.gameState;
    const fresh = ids.filter((id) => ALL_SKILLS.has(id) && !state.seenIntros.includes(`skill:${id}`));
    if (fresh.length === 0) return;
    const has = (id: string, type: string) => ALL_SKILLS.get(id)?.effects?.some((e) => e.effectType === type) ?? false;
    const order = (id: string) => has(id, "sight_range") ? 0 : has(id, "move_speed") ? 2 : 1;
    fresh.sort((a, b) => order(a) - order(b));
    const knownSkills = state.seenIntros.filter((k) => k.startsWith("skill:")).map((k) => k.slice(6));
    let firstSight = !knownSkills.some((id) => has(id, "sight_range"));
    let firstMove = !knownSkills.some((id) => has(id, "move_speed"));
    for (const id of fresh) {
      state.seenIntros.push(`skill:${id}`);
      const def = ALL_SKILLS.get(id)!;
      const extra: IntroSection[] = [];
      if (firstSight && has(id, "sight_range")) {
        firstSight = false;
        extra.push({ heading: "Sehen", lines: SIGHT_INTRO, emphasis: true });
      }
      if (firstMove && has(id, "move_speed")) {
        firstMove = false;
        const settled = state.conscious.form === "settled";
        extra.push({ heading: "Bewegen", lines: settled ? MOVE_INTRO_SETTLED : MOVE_INTRO_TRAVELING, emphasis: true });
        extra.push({ lines: [settled ? MOVE_TRY_SETTLED : MOVE_TRY_TRAVELING], emphasis: true, atEnd: true });
        // Als Reisender gleich unterwegs: dann gibt es nach dem Abspalten nichts mehr zu erklären
        if (!settled && !state.seenIntros.includes("travel")) state.seenIntros.push("travel");
      }
      this.introQueue.push(skillIntroCard(def, state.player, extra));
    }
  }

  /** Nach dem ersten Abspalten: was Reisen bedeutet */
  private announceTravel() {
    const state = this.gameState;
    if (state.seenIntros.includes("travel")) return;
    state.seenIntros.push("travel");
    this.introQueue.push({
      kicker: "🧬 Abgespalten",
      icon: "🌍",
      title: TRAVEL_TITLE,
      tags: [],
      sections: [{ lines: TRAVEL_TEXT }],
    });
  }

  /** Angefangenes Rechenstück abschließen, bevor das Bewusstsein den Blob verlässt (4.6). */
  private flushSettledActivity() {
    if (this.gameState.conscious.form === "settled" && this.activityAccumulator > 0) {
      this.runSettledAction(this.activityAccumulator / 1000);
    }
    this.activityAccumulator = 0;
  }

  /** Nach jedem Wechsel des Körpers: Effekte, Größe, Kamera, Skill-Leiste, Anzeige. */
  private afterBodySwap() {
    const p = this.gameState.player;
    syncPassiveEffects(p);
    updatePlayerGrowth(p);
    this.blobGraphic.setPosition(p.x, p.y);
    this.blobGraphic.body?.setVelocity(0, 0);
    this.updateCameraZoom();
    if (this.skillBar) {
      for (let i = 0; i < 4; i++) this.skillBar.assignSlot(i, p.activeSkillSlots[i] ?? null);
    }
    this.lastNearbyId = null;
    updateNearbyPanel(undefined, undefined, this.gameState);
    this.refreshBlobSprites();
    this.applyFormUi();
    this.introStep = null;
    this.updateIntro();
    updateUI(this.gameState);
  }

  /** Steuerung je Form: Joystick, Absorb/Analyze und Skill-Leiste nur beim Reisenden. */
  private applyFormUi() {
    const form = this.gameState.conscious.form;
    const key = `${form}|${this.deathPending}`;
    if (key === this.formUiKey) return;
    this.formUiKey = key;
    const traveling = form === "traveling";
    for (const id of ["joystickZone", "joystickBase", "actionBtns", "skillBarWrap"]) {
      const el = document.getElementById(id);
      if (el) el.style.visibility = traveling ? "" : "hidden";
    }
    // Niedergelassen zeichnet der BlobRenderer das Adernetz; der runde Blob ist nur der Reisende (GDD-10 10.2)
    this.blobGraphic.setVisible(traveling && !this.deathPending);
    this.refreshBlobSprites();
    this.actionsRefreshAt = 0;
  }

  /** Niedergelassene und vertrocknete Blobs zeichnen (GDD-10 Abschnitt 10, scenes/BlobRenderer.ts). */
  private refreshBlobSprites() {
    if (!this.blobRenderer) return;
    const state = this.gameState;
    const specs: BlobVisualSpec[] = [];
    for (const b of state.blobs) {
      if (b.form !== "settled" && b.form !== "dried") continue;
      specs.push({
        id: b.id, form: b.form, x: b.body.x, y: b.body.y,
        coreRadius: storedCoreRadius(b),
        range: b.form === "settled" ? calcWorkRange(b.body.bodyMass, !!b.nest) : 0,
        conscious: false,
      });
    }
    if (state.conscious.form === "settled") {
      specs.push({
        id: state.conscious.id, form: "settled", x: state.player.x, y: state.player.y,
        coreRadius: radiusFromMass(state.player.bodyMass),
        range: consciousWorkRange(state),
        conscious: true,
      });
    }
    this.blobRenderer.sync(specs);
  }

  /** Je Frame: Richtungspfeile; alle 250 ms die Knöpfe und die Darstellung der Blobs. */
  private updateBlobOverlay() {
    const state = this.gameState;
    const cam = this.cameras.main;
    const view = cam.worldView;
    const zoom = cam.zoom;
    // Pfeile zu markierten Blobs
    const targets = [];
    for (const id of state.markedBlobIds) {
      const b = state.blobs.find((x) => x.id === id);
      if (!b) continue;
      const dist = Math.hypot(b.body.x - state.player.x, b.body.y - state.player.y);
      targets.push({
        id, sx: (b.body.x - view.x) * zoom, sy: (b.body.y - view.y) * zoom,
        label: `${b.name} · ${this.toMeters(dist)} m`,
        color: b.form === "dried" ? "#d8b060" : "#7fe0a0",
      });
    }
    this.blobArrows.update(targets, cam.width, cam.height);

    const now = Date.now();
    if (now < this.actionsRefreshAt) return;
    this.actionsRefreshAt = now + 250;
    this.refreshBlobSprites(); // Netz wächst mit (Größe, Arbeitsreichweite); unverändert = nichts zu tun
    this.blobActions.update(this.deathPending ? [] : this.computeBlobButtons(now));
  }

  private computeBlobButtons(now: number): BlobActionButton[] {
    const state = this.gameState;
    const buttons: BlobActionButton[] = [];
    const calm = now - this.lastAggroAt >= SETTLE_AGGRO_LOCK_MS;
    const aggroReason = "Erst wenn dich 5 s kein Gegner angreift.";
    if (state.conscious.form === "traveling") {
      const s = canSettle(state);
      if (knowsMoveSkill(state.player)) {
        buttons.push({ id: "settle", icon: "🌱", label: "Niederlassen", enabled: s.ok && calm, reason: s.reason ?? aggroReason });
      }
      const touched = findTouchedBlob(state);
      if (touched && canMerge(state, touched).ok) {
        buttons.push({ id: "merge", icon: "🫧", label: `Verschmelzen: ${touched.name}`, enabled: calm, reason: aggroReason });
      }
    } else if (state.conscious.form === "settled") {
      const act = state.conscious.activity;
      const actName = act === "analyze" ? "Analysieren" : act === "absorb" ? "Absorbieren" : act === "rest" ? "Ruhen" : "wählen";
      buttons.push({ id: "activity", icon: act === "absorb" ? "💥" : act === "analyze" ? "🔍" : "💤", label: `Tätigkeit: ${actName}`, enabled: true });
      if (knowsMoveSkill(state.player)) {
        const sp = canSplit(state);
        buttons.push({ id: "split", icon: "🧬", label: "Abspalten", enabled: sp.ok, reason: sp.reason });
        if (!state.conscious.nest) {
          const ri = canRise(state);
          buttons.push({ id: "rise", icon: "⬆️", label: "Erheben", enabled: ri.ok, reason: ri.reason });
        }
      }
      if (canSwitch(state).ok) buttons.push({ id: "switch", icon: "🔀", label: "Wechseln", enabled: true });
    }
    return buttons;
  }

  private onBlobAction(id: string) {
    const state = this.gameState;
    const world = state.world;
    this.syncSkillBarIntoPlayer();
    if (id === "settle") {
      const r = settle(state, world);
      if (!r.ok) { showToast(r.reason ?? "Geht nicht.", "system"); return; }
      for (const inst of world.entities.values()) if (inst.isAggro) resetAi(inst);
      addLog(`🌱 Du lässt dich nieder: ${state.conscious.name}. Dein Fortschritt ist gesichert.`, "system");
      this.afterBodySwap();
      showToast("Wähle eine Tätigkeit für deinen Blob.", "system");
    } else if (id === "merge") {
      const target = findTouchedBlob(state);
      if (!target) return;
      const wasDried = target.form === "dried";
      const r = merge(state, target.id, world);
      if (!r.ok) { showToast(r.reason ?? "Geht nicht.", "system"); return; }
      for (const inst of world.entities.values()) if (inst.isAggro) resetAi(inst);
      addLog(wasDried
        ? `🫧 Verschmolzen mit dem vertrockneten Blob — ${state.conscious.name} lebt wieder.`
        : `🫧 Verschmolzen mit ${state.conscious.name}.`, "system");
      this.logResultOfCatchUp(r.result);
      this.afterBodySwap();
    } else if (id === "split") {
      this.openTransferDialog();
    } else if (id === "rise") {
      this.flushSettledActivity();
      const r = rise(state);
      if (!r.ok) { showToast(r.reason ?? "Geht nicht.", "system"); return; }
      addLog("⬆️ Du erhebst dich und reist weiter.", "system");
      this.afterBodySwap();
    } else if (id === "switch") {
      this.openSwitchList();
    } else if (id === "activity") {
      this.openActivityPicker();
    }
  }

  private logResultOfCatchUp(result: { events: ProgressionEvent[]; discovered: string[]; materials: Record<string, number> } | null | undefined) {
    if (!result) return;
    this.logProgressionEvents(result.events);
    for (const id of result.discovered) {
      const def = ALL_SKILLS.get(id);
      addLog(`✨ In deiner Abwesenheit entdeckt: ${def?.icon ?? ""} ${def?.name ?? id}`, "skill");
    }
    this.announceSkills(result.discovered);
    const mats = Object.entries(result.materials).filter(([, n]) => n > 0);
    if (mats.length > 0) {
      addLog(`In deiner Abwesenheit gesammelt: ${mats.map(([id, n]) => `${n} ${MATERIAL_MAP.get(id)?.name ?? id}`).join(", ")}`, "absorb");
    }
  }

  private openActivityPicker() {
    const meta = this.gameState.conscious;
    if (meta.form !== "settled") return;
    this.pauseForUI();
    const pick = (activity: BlobActivity) => () => {
      this.flushSettledActivity();
      meta.activity = activity;
      const name = activity === "analyze" ? "Analysieren" : activity === "absorb" ? "Absorbieren" : "Ruhen";
      addLog(`Tätigkeit: ${name}.`, "system");
      this.actionsRefreshAt = 0;
      this.updateIntro();
    };
    this.blobPicker.open({
      title: "Tätigkeit",
      text: "Dein niedergelassener Blob arbeitet von allein an den friedlichen Wesen in seiner Reichweite — auch während du woanders bist.",
      items: [
        { label: "🔍 Analysieren", detail: "Erfahrung, keine Materialien. Die Wesen bleiben.", onPick: pick("analyze") },
        { label: "💥 Absorbieren", detail: "Erfahrung und Materialien, so oft die Wesen nachwachsen.", onPick: pick("absorb") },
        { label: "💤 Ruhen", detail: "Nichts tun.", onPick: pick("rest") },
      ],
      cancellable: true,
      onClose: () => this.resumeForUI(),
    });
  }

  /** Verteilen-Dialog vor dem Abspalten (GDD-10 7.2); das Spiel hält an. */
  private openTransferDialog() {
    const state = this.gameState;
    const check = canSplit(state);
    if (!check.ok) { showToast(check.reason ?? "Geht nicht.", "system"); return; }
    this.flushSettledActivity();
    const preview = previewSplit(state);
    const preset = defaultSplitTake(preview);
    const kg = (mass: number) => (mass * KG_PER_FIBER).toLocaleString("de-DE", { maximumFractionDigits: 1 });
    this.pauseForUI();
    this.transferDialog.open({
      title: "Neuer Reisender",
      info: [
        `Körpermasse ${kg(preview.childMass)} / ${kg(MAX_BODY_MASS)} kg`,
        `${preview.grown ? "ausgewachsen" : "nicht ausgewachsen"}, ${toDisplayHp(preview.maxHp)} HP`,
        ...(preview.childMass <= 0 ? ["Ohne Pflanzenfasern im Lager wird er winzig."] : []),
      ],
      rows: preview.materials.map((m) => {
        const def = MATERIAL_MAP.get(m.id);
        return { id: m.id, label: `${def?.icon ?? ""} ${def?.name ?? m.id}`.trim(), total: m.amount, take: preset[m.id] ?? 0 };
      }),
      onDone: (take) => { this.resumeForUI(); this.doSplit(take); },
      onCancel: () => this.resumeForUI(),
    });
  }

  private doSplit(take: Record<string, number>) {
    const state = this.gameState;
    const first = state.nextBlobNumber <= 2 || state.blobs.length === 0 && state.conscious.nest;
    const r = split(state, state.world, take);
    if (!r.ok) { showToast(r.reason ?? "Geht nicht.", "system"); return; }
    addLog(`🧬 Ein Teil von dir macht sich auf den Weg (${(state.player.bodyMass * KG_PER_FIBER).toLocaleString("de-DE", { maximumFractionDigits: 1 })} kg).`, "system");
    if (first) {
      const hint = "Wirst du besiegt, machst du bei einem niedergelassenen Blob weiter, zu Beginn im Nest. Lässt du dich nieder, ist dein Fortschritt gesichert.";
      addLog(hint, "system");
    }
    this.gainFeed?.clear();
    this.afterBodySwap();
    this.announceTravel();
  }

  private openSwitchList() {
    const state = this.gameState;
    const others = state.blobs.filter((b) => b.form === "settled");
    if (others.length === 0) return;
    this.pauseForUI();
    this.blobPicker.open({
      title: "Bewusstsein wechseln",
      text: "Du hast danach nur den Stand des gewählten Blobs.",
      items: others.map((b) => ({
        label: `${b.nest ? "🏠" : "🌱"} ${b.name}`,
        detail: `${this.toMeters(Math.hypot(b.body.x - state.player.x, b.body.y - state.player.y))} m entfernt`,
        onPick: () => this.switchConsciousness(b.id, true),
      })),
      cancellable: true,
      onClose: () => this.resumeForUI(),
    });
  }

  private switchConsciousness(targetId: string, storeCurrent: boolean) {
    if (storeCurrent) this.flushSettledActivity();
    this.syncSkillBarIntoPlayer();
    const r = switchTo(this.gameState, targetId, this.gameState.world, storeCurrent);
    if (!r.ok) { showToast(r.reason ?? "Geht nicht.", "system"); return false; }
    // Ziel liegt evtl. in einem nicht geladenen Teil der Welt: Chunks sofort laden
    this.chunkManager.tick(this.gameState.player.x, this.gameState.player.y, Date.now() - 1000);
    addLog(`🔀 Bewusstsein bei ${this.gameState.conscious.name}.`, "system");
    this.logResultOfCatchUp(r.result);
    this.afterBodySwap();
    return true;
  }

  /** Besuchte Chunks für den Nebel der Karte (GDD-10 11.1). */
  private markVisitedChunk() {
    const state = this.gameState;
    if (this.visitedRef !== state.visitedChunks) {
      this.visitedRef = state.visitedChunks;
      this.visitedSet = new Set(state.visitedChunks);
    }
    const key = `${Math.floor(state.player.x / CHUNK_PX)},${Math.floor(state.player.y / CHUNK_PX)}`;
    if (!this.visitedSet.has(key)) {
      this.visitedSet.add(key);
      state.visitedChunks.push(key);
    }
  }

  /** Reiter „Karte“ (GDD-10 11.1): Daten für ui/MapView zusammenstellen. */
  private renderMap(root: HTMLElement) {
    if (!this.mapView) {
      this.mapView = createMapView(root, {
        onToggleMark: (id) => {
          const marks = this.gameState.markedBlobIds;
          this.gameState.markedBlobIds = marks.includes(id) ? marks.filter((m) => m !== id) : [...marks, id];
          this.renderMap(root);
        },
        onSwitch: (id) => {
          this.gameMenu.close();
          this.switchConsciousness(id, true);
        },
        onPick: (id) => {
          const pick = this.mapPick;
          this.mapPick = null;
          this.gameMenu.close();
          pick?.finish(id);
        },
      });
    }
    this.markVisitedChunk();
    const state = this.gameState;
    const p = state.player;
    const meters = (x: number, y: number) => `${this.toMeters(Math.hypot(x - p.x, y - p.y))} m`;
    const matText = (mats: [string, number][]) => mats.filter(([, n]) => n > 0)
      .map(([id, n]) => `${Math.floor(n)} ${MATERIAL_MAP.get(id)?.name ?? id}`).join(", ");
    const activityText = (a: BlobActivity | null | undefined) =>
      a === "analyze" ? "Analysieren" : a === "absorb" ? "Absorbieren" : a === "rest" ? "Ruhen" : "keine gewählt";
    const yieldText = (body: PlayerState, a: BlobActivity | null | undefined, sources: StoredBlob["sources"]) => {
      const plan = planActivity(body, a, sources ?? [], 3600);
      if (plan.attempts <= 0) return "Ertrag pro Stunde: nichts";
      const parts = [`+${Math.round(plan.coreXp)} XP ${a === "absorb" ? "Absorb" : "Analyze"}`];
      const skills = Object.keys(plan.skillXp).length + Object.keys(plan.finds).length;
      if (skills) parts.push(`${skills} Skill${skills === 1 ? "" : "s"} lernen mit`);
      for (const [id, n] of Object.entries(plan.materials)) parts.push(`${n.toLocaleString("de-DE", { maximumFractionDigits: 1 })} ${MATERIAL_MAP.get(id)?.name ?? id}`);
      return `Ertrag pro Stunde: ${parts.join(", ")}`;
    };
    const consciousStored: StoredBlob = { ...state.conscious, body: serializeBody(p) };
    const blobs: MapBlob[] = [];
    if (!this.deathPending) {
      const c = state.conscious;
      blobs.push({
        id: c.id, name: c.name, form: c.form, nest: !!c.nest, x: p.x, y: p.y,
        conscious: true, marked: false, distance: "0 m",
        info: c.form === "settled"
          ? [`Tätigkeit: ${activityText(c.activity)}`, yieldText(p, c.activity, c.sources), `Lager: ${matText([...p.materials]) || "leer"}`]
          : [`${toDisplayHp(p.hp)} / ${toDisplayHp(p.maxHp)} HP`],
        canMark: false, canSwitch: false,
      });
    }
    for (const b of state.blobs) {
      const info: string[] = [];
      if (b.form === "settled") {
        // Nur zur Anzeige nachrechnen, ohne zu speichern (GDD-10 8.1)
        const body = deserializeBody(b.body);
        catchUpSettled(body, { activity: b.activity, sources: b.sources ?? [], carry: { ...(b.carry ?? {}) }, isNest: !!b.nest },
          b.simulatedUntil ?? p.playtimeSeconds, p.playtimeSeconds);
        info.push(`Tätigkeit: ${activityText(b.activity)}`, yieldText(body, b.activity, b.sources), `Lager: ${matText([...body.materials]) || "leer"}`);
      } else if (b.form === "dried") {
        const ahead = summarizeAhead(b, this.deathPending ? nearestSettled(state, b.body.x, b.body.y) : consciousStored);
        const parts: string[] = [];
        if (ahead.newSkills) parts.push(`${ahead.newSkills} neue Skill${ahead.newSkills === 1 ? "" : "s"}`);
        if (ahead.higherSkills) parts.push(`${ahead.higherSkills} Skill${ahead.higherSkills === 1 ? "" : "s"} höher`);
        if (ahead.materials.length) parts.push(matText(ahead.materials));
        info.push("Verschmilz mit ihm, um zurückzubekommen, was er dir voraushat.");
        if (parts.length) info.push(`Darin: ${parts.join(", ")}`);
      }
      blobs.push({
        id: b.id, name: b.name, form: b.form, nest: !!b.nest, x: b.body.x, y: b.body.y,
        conscious: false, marked: state.markedBlobIds.includes(b.id), distance: meters(b.body.x, b.body.y),
        info,
        canMark: true,
        canSwitch: !this.deathPending && state.conscious.form === "settled" && b.form === "settled",
      });
    }
    this.mapView.render({
      chunksX: WORLD_CHUNKS_X, chunksY: WORLD_CHUNKS_Y, chunkPx: CHUNK_PX,
      biomeColor: (cx, cy) => biomeBaseColor(getBiomeAt(cx, cy)),
      visited: this.visitedSet,
      blobs,
      pickMode: !!this.mapPick,
    });
  }

  private openDeathScreen(dried: StoredBlob) {
    const state = this.gameState;
    const nearest = nearestSettled(state, dried.body.x, dried.body.y);
    const ahead = summarizeAhead(dried, nearest);
    const parts: string[] = [];
    if (ahead.newSkills) parts.push(`${ahead.newSkills} neue Skill${ahead.newSkills === 1 ? "" : "s"}`);
    if (ahead.higherSkills) parts.push(`${ahead.higherSkills} Skill${ahead.higherSkills === 1 ? "" : "s"} höher`);
    for (const [id, n] of ahead.materials) parts.push(`${n} ${MATERIAL_MAP.get(id)?.name ?? id}`);
    const settledBlobs = state.blobs.filter((b) => b.form === "settled");
    const finish = (id: string) => {
      if (this.switchConsciousness(id, false)) {
        this.deathPending = false;
        this.setPaused("death", false);
        this.applyFormUi();
      } else {
        this.openDeathScreen(dried);
      }
    };
    this.applyFormUi();
    this.blobPicker.open({
      title: "Du wurdest besiegt",
      text: "Zum Schutz ist dein Körper an Ort und Stelle eingetrocknet. Mach bei einem anderen Blob weiter. Verschmilzt du später mit dem vertrockneten Blob, bekommst du zurück, was er dir voraushat.",
      summary: parts.length ? `Darin: ${parts.join(", ")}` : undefined,
      primary: nearest ? {
        label: `Zum nächsten Blob: ${nearest.name}, ${this.toMeters(Math.hypot(nearest.body.x - dried.body.x, nearest.body.y - dried.body.y))} m`,
        onPick: () => finish(nearest.id),
      } : undefined,
      listTitle: "Oder wählen",
      items: [
        {
          label: "🗺️ Auf der Karte wählen",
          onPick: () => { this.mapPick = { finish, dried }; this.gameMenu.open("map"); },
        },
        ...settledBlobs.filter((b) => b.id !== nearest?.id).map((b) => ({
          label: `${b.nest ? "🏠" : "🌱"} ${b.name}`,
          detail: `${this.toMeters(Math.hypot(b.body.x - dried.body.x, b.body.y - dried.body.y))} m entfernt`,
          onPick: () => finish(b.id),
        })),
      ],
      cancellable: false,
    });
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
    this.updateIntro();
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

  // Giftdosis einmal beim Einspritzen zeigen (src/data/venom.ts Abschnitt 5),
  // leicht versetzt neben der Trefferzahl
  private showVenomDose(x: number, y: number, dose: number) {
    this.showDamageNumber(x + 14 / this.cameras.main.zoom, y, dose, VENOM_TEXT_COLOR);
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
      if (result.venomDose && result.venomDose.total > 0 && target.currentHp > 0) {
        addVenomDose(target, result.venomDose);
        this.showVenomDose(target.x, target.y, result.venomDose.total);
      }

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
      // Venom: XP kommt stufenlos aus dem Giftschaden in processCombatEffects
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
    const before = this.xpSnapshot();
    const result = absorbEntity(
      this.gameState.player,
      this.gameState.world,
      this.lastNearbyId
    );
    showInteractionResult(result, this.gameState);
    this.feedInteraction(result, before);
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
    const before = this.xpSnapshot();
    const result = analyzeEntity(
      this.gameState.player,
      this.gameState.world,
      this.lastNearbyId
    );
    showInteractionResult(result, this.gameState);
    this.feedInteraction(result, before);
    this.logForgetting(result.skillResults);
    if (result.success) syncPassiveEffects(this.gameState.player);
    this.afterProgressChange();
  }

  /** Absorb/Analyze von Hand: Zuwachs in die Anzeige, neue Skills vorstellen */
  private feedInteraction(result: InteractionResult, before: Map<string, number>) {
    if (!result.success) return;
    const discovered = result.skillResults.filter((r) => r.wasNewDiscovery).map((r) => r.skillId);
    this.feedXpSince(before, discovered);
    const mats: Record<string, number> = {};
    for (const m of result.materialResults) mats[m.materialId] = (mats[m.materialId] ?? 0) + m.amount;
    this.feedMaterials(mats);
    this.announceSkills(discovered);
  }

  togglePassiveSkill(skillId: string) {
    const inst = this.gameState.player.discoveredSkills.get(skillId);
    if (!inst) return;
    inst.isEnabled = inst.isEnabled === false ? true : false;
    syncPassiveEffects(this.gameState.player);
    this.updateIntro();
    updateUI(this.gameState);
    const state = inst.isEnabled ? "aktiviert" : "deaktiviert";
    showToast(`${ALL_SKILLS.get(skillId)?.name ?? skillId} ${state}`, "system");
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
  const capPct = cap.capacity > 0 ? Math.round((cap.used / cap.capacity) * 100) : 0; // ohne entdeckte Skills: 0 %
  setEl("ui-level", `Kap. ${capPct}%${cap.overstretch > 0 ? " ↑" : ""}`);
  updateVitalsUI(p);
  // MP abrunden: sonst stünde z.B. „3 MP vorhanden“, obwohl ein 3-MP-Skill nicht geht
  setEl("ui-mp", `${Math.floor(p.mp / 1000)}/${Math.floor(p.maxMp / 1000)}`);
  setStyle("mp-bar-fill", "width", `${(p.mp / p.maxMp) * 100}%`);
  setStyle("xp-bar-fill", "width", `${Math.min(100, capPct)}%`);
  // Überdehnt: Balken in Gold — Grenze zeitweise überschritten
  setStyle("xp-bar-fill", "background", cap.overstretch > 0 ? "var(--gold)" : "");

  // Kern-Fähigkeiten
  const coreText = (ability: "absorb" | "analyze") => {
    const info = getRankInfo(p.coreAbilities[ability], getLearningEffort(ability));
    return `${info.rankName} ${formatProgress(info.progress)} (${formatRankProgress(info)})`;
  };
  setEl("ui-analyze-level", `🔍 ${coreText("analyze")}`);
  setEl("ui-absorb-level", `💥 ${coreText("absorb")}`);

  renderSkillList(state);
  renderMaterials(state);
}

/** HP-Anzeige inkl. Giftlast — leicht genug für jeden Frame (stufenloses Gift) */
function updateVitalsUI(p: GameState["player"]) {
  setEl("ui-hp", `${toDisplayHp(p.hp)}/${toDisplayHp(p.maxHp)}`);
  setStyle("hp-bar-fill", "width", `${(p.hp / p.maxHp) * 100}%`);
  // Giftlast: violetter Abschnitt am Ende der HP — so viele HP kostet das Gift noch
  const venom = Math.min(getVenomLoad(p), p.hp);
  setStyle("hp-bar-venom", "left", `${((p.hp - venom) / p.maxHp) * 100}%`);
  setStyle("hp-bar-venom", "width", `${(venom / p.maxHp) * 100}%`);
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

      const enabled = inst.isEnabled !== false;
      const damage = formatPlayerSkillDamage(state.player, def.id);
      return `
        <div class="skill-card element-${def.element}${isPassive && !enabled ? " skill-disabled" : ""}">
          <div class="skill-header">
            <span class="skill-icon">${def.icon}</span>
            <span class="skill-name">${def.name}</span>
            ${def.category === "combo" ? '<span class="combo-badge">COMBO</span>' : ""}
            ${isPassive ? '<span class="combo-badge" style="background:#4af0c8;color:#000">PASSIV</span>' : ""}
            <span class="skill-level">${info.rankName} ${formatProgress(info.progress)}</span>
            ${isPassive ? `<button class="btn-passive-toggle" onclick="window.togglePassiveSkill('${def.id}')">${enabled ? "AN" : "AUS"}</button>` : ""}
          </div>
          ${renderRankBar(info)}
          <div class="skill-xp-text">${formatRankProgress(info)}</div>
          ${damage ? `<div class="skill-dmg">${damage}, vor Rüstung des Ziels</div>` : ""}
          ${describePlayerSkillValues(state.player, def.id).map((v) => `<div class="skill-dmg">${v}</div>`).join("")}
          <div class="skill-desc">${def.description}</div>
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
/** XP-Beträge können Bruchteile sein (fließende Erfahrung) — eine Nachkommastelle */
function formatXp(xp: number): string {
  return xp.toLocaleString("de-DE", { maximumFractionDigits: 1 });
}

/** Fortschritt in Prozent, abgerundet — passt zu den Rang-Grenzen (10 %, 20 % …) */
function formatProgress(progress: number): string {
  return `${Math.floor(progress * 100 + 1e-7)} %`;
}

function formatRankProgress(info: RankInfo): string {
  const pending = info.pendingXp >= 1 ? ` · +${Math.floor(info.pendingXp)} in Ruhe` : "";
  if (!info.nextRankName) return `${Math.floor(info.xp)} XP · höchster Rang${pending}`;
  const target = Math.ceil(info.xp + info.xpToNextRank);
  return `${Math.floor(info.xp)} / ${target} XP → ${info.nextRankName}${pending}`;
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

  // Blind (kein Seh-Skill, GDD-09): Der Blob spürt nur, dass etwas da ist — kein Name, kein Bild, keine Werte
  if (getPlayerVision(state.player).range <= 0) {
    panel.innerHTML = `
      <div class="nearby-entity">
        <span class="nearby-icon">❓</span>
        <div style="flex:1;min-width:0">
          <span class="nearby-name">Etwas</span>
          <div style="font-size:.68em;color:var(--muted)">Du spürst etwas direkt neben dir — weich, feucht, lebendig.</div>
        </div>
      </div>
      <div class="nearby-actions">
        <button onclick="window.gameScene.doAbsorb()" class="btn-absorb">💥 Absorb</button>
        <button onclick="window.gameScene.doAnalyze()" class="btn-analyze">🔍 Analyze</button>
      </div>
    `;
    return;
  }

  const bonusLv      = instance?.bonusLevel ?? 0;
  const effectiveLv  = entityDef.level + bonusLv;
  // Gleiche Rechnung wie EntitySystem.absorbEntity/analyzeEntity: dort zählt die
  // Grundstufe (def.level), das Bonus-Level aus dem Entity-Leveling nicht
  const absorbChance = Math.round(calcSuccessChance(levelFromProgress(getCoreProgress(state.player, "absorb")),  entityDef.level) * 100);
  const analyzeChance= Math.round(calcSuccessChance(levelFromProgress(getCoreProgress(state.player, "analyze")), entityDef.level) * 100);

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
  for (const [skillId, progress] of Object.entries(getEntitySkillProgress(entityDef))) {
    const s = ALL_SKILLS.get(skillId);
    if (s) skillLines.push(`${s.icon} ${s.name} (${rankNameForProgress(progress)})`);
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

const ENTITY_DEFINITIONS_BY_NAME = new Map([...ENTITY_MAP.values()].map((d) => [d.name, d]));

function showInteractionResult(result: any, state: GameState) {
  const type = result.method as "absorb" | "analyze";

  // Blind (GDD-09): Name und Bild des Wesens sind unbekannt — „Etwas“
  if (getPlayerVision(state.player).range <= 0 && result.entityName) {
    const def = ENTITY_DEFINITIONS_BY_NAME.get(result.entityName);
    const hide = (msg: string) => msg.split(def ? `${def.icon} ${result.entityName}` : result.entityName).join("❓ Etwas");
    result = { ...result, message: hide(result.message), entityName: "Etwas" };
  }

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
      return `+${formatXp(r.xpGained)} XP für ${def.name}`;
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
  // Kein Toast mehr: Erfahrung und Materialien zeigt die Anzeige über dem Blob,
  // neue Skills ihre eigene Karte (Vorgabe Entwickler, 15. November 2026)
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
