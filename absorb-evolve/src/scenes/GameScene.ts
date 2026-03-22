// ============================================================
// GAME SCENE
// Absorb & Evolve — Phaser Scene für das Hauptspiel
//
// Diese Datei ist die einzige die Phaser kennt.
// Alle Spiellogik kommt aus systems/ und data/
// ============================================================

// Phaser wird als globales `Phaser` aus dem CDN geladen.
// TypeScript: wir deklarieren es als `any` bis wir
// @types/phaser installieren können.
declare const Phaser: any;

import { createInitialGameState } from "../types/GameState.js";
import type { GameState } from "../types/GameState.js";
import { ALL_SKILLS } from "../data/skills.js";
import { ENTITY_MAP, ENTITY_DEFINITIONS } from "../data/entities.js";
import {
  discoverSkill,
  combineSkills,
  getDiscoveredSkillsSorted,
  getXpProgress,
  isMaxLevel,
} from "../systems/SkillSystem.js";
import {
  absorbEntity,
  analyzeEntity,
  findNearestEntity,
  processRespawns,
} from "../systems/EntitySystem.js";
import type { EntityInstance } from "../types/Entity.js";

// ============================================================
// BOOT SCENE — lädt Assets (minimal, da wir Icons nutzen)
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
  // Game State — reine Daten, kein Phaser
  private gameState!: GameState;

  // Phaser-Objekte
  private slimeGraphic!: any;
  private entitySprites: Map<string, any> = new Map();
  private cursors!: any;
  private wasdKeys!: any;

  // Input-Tracking
  private eKey!: any;
  private qKey!: any;

  // UI (wird über DOM-Overlay gemacht, nicht Phaser)
  private lastNearbyId: string | null = null;

  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    // State initialisieren
    this.gameState = createInitialGameState();

    // Welt aufbauen
    this.createWorld();
    this.createEntities();
    this.createPlayer();
    this.createInput();

    // UI-Panel initialisieren
    (window as any).gameState = this.gameState;
    (window as any).gameScene = this;
    updateUI(this.gameState);

    // Kamera dem Slime folgen lassen
    this.cameras.main.startFollow(this.slimeGraphic, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5);
  }

  private createWorld() {
    const { width, height } = this.scale;
    const worldW = 1600;
    const worldH = 1200;

    // Hintergrund-Tiles
    const graphics = this.add.graphics();

    // Dunkelgrüner Boden (GDD Farbe: #1a3320)
    graphics.fillStyle(0x1a3320);
    graphics.fillRect(0, 0, worldW, worldH);

    // Tile-Muster
    graphics.fillStyle(0x142618, 0.5);
    for (let x = 0; x < worldW; x += 80) {
      for (let y = 0; y < worldH; y += 80) {
        if ((x + y) % 160 === 0) {
          graphics.fillRect(x, y, 40, 40);
        }
      }
    }

    // Weltgrenzen
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
  }

  private createPlayer() {
    const g = this.add.graphics();
    // Slime: Gradient-Kreis (GDD Farbe: #40e890)
    g.fillStyle(0x40e890);
    g.fillCircle(0, 0, 16);
    // Schimmer-Highlight
    g.fillStyle(0x90ffcc, 0.6);
    g.fillCircle(-4, -4, 7);

    // Als Texture erstellen
    g.generateTexture("slime", 40, 40);
    g.destroy();

    // Sprite
    this.slimeGraphic = this.physics.add.image(
      this.gameState.player.x,
      this.gameState.player.y,
      "slime"
    );
    this.slimeGraphic.setCollideWorldBounds(true);

    // Pulsier-Animation
    this.tweens.add({
      targets: this.slimeGraphic,
      scaleX: 1.08,
      scaleY: 0.93,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private createEntities() {
    // Entities zufällig in der Welt platzieren
    const placements = [
      { defId: "red_slime", x: 200, y: 200 },
      { defId: "red_slime", x: 600, y: 350 },
      { defId: "blue_slime", x: 400, y: 150 },
      { defId: "blue_slime", x: 800, y: 400 },
      { defId: "goblin", x: 500, y: 500 },
      { defId: "goblin", x: 300, y: 600 },
      { defId: "forest_wolf", x: 900, y: 250 },
      { defId: "stone_golem", x: 700, y: 700 },
      { defId: "vine_plant", x: 150, y: 450 },
      { defId: "vine_plant", x: 1000, y: 500 },
      { defId: "poison_mushroom", x: 350, y: 300 },
      { defId: "poison_mushroom", x: 650, y: 550 },
      { defId: "dark_wisp", x: 1100, y: 900 },
      { defId: "light_fairy", x: 1200, y: 200 },
    ];

    for (let i = 0; i < placements.length; i++) {
      const p = placements[i];
      const def = ENTITY_MAP.get(p.defId);
      if (!def) continue;

      const instanceId = `entity_${i}`;
      const instance: EntityInstance = {
        instanceId,
        definitionId: p.defId,
        x: p.x,
        y: p.y,
        currentHp: def.hp,
        isAlive: true,
      };
      this.gameState.world.entities.set(instanceId, instance);

      // Visuelles Sprite (Text-basiert mit Icon)
      const text = this.add
        .text(p.x, p.y, def.icon, {
          fontSize: "28px",
        })
        .setOrigin(0.5);

      // Wobble-Animation (GDD: "leichtes Auf-Ab-Schaukeln")
      this.tweens.add({
        targets: text,
        y: p.y - 5,
        duration: 1200 + i * 100,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      this.entitySprites.set(instanceId, text);
    }
  }

  private createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasdKeys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.qKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
  }

  update(_time: number, _delta: number) {
    this.handleMovement();
    this.syncPlayerPosition();
    this.updateEntityVisuals();
    this.checkNearbyEntity();
    this.handleInteraction();

    // Respawn-Prozess
    processRespawns(this.gameState.world);
  }

  private handleMovement() {
    const speed = 160;
    const body = this.slimeGraphic.body;

    const left = this.cursors.left.isDown || this.wasdKeys.left.isDown;
    const right = this.cursors.right.isDown || this.wasdKeys.right.isDown;
    const up = this.cursors.up.isDown || this.wasdKeys.up.isDown;
    const down = this.cursors.down.isDown || this.wasdKeys.down.isDown;

    body.setVelocity(0, 0);
    if (left) body.setVelocityX(-speed);
    if (right) body.setVelocityX(speed);
    if (up) body.setVelocityY(-speed);
    if (down) body.setVelocityY(speed);

    // Diagonal normalisieren
    if ((left || right) && (up || down)) {
      body.velocity.normalize().scale(speed);
    }
  }

  private syncPlayerPosition() {
    this.gameState.player.x = this.slimeGraphic.x;
    this.gameState.player.y = this.slimeGraphic.y;
  }

  private updateEntityVisuals() {
    for (const [id, instance] of this.gameState.world.entities) {
      const sprite = this.entitySprites.get(id);
      if (!sprite) continue;
      sprite.setAlpha(instance.isAlive ? 1.0 : 0.2);
    }
  }

  private checkNearbyEntity() {
    const nearest = findNearestEntity(this.gameState.player, this.gameState.world, 80);
    const nearestId = nearest?.instanceId ?? null;

    if (nearestId !== this.lastNearbyId) {
      this.lastNearbyId = nearestId;
      updateNearbyUI(nearest ? ENTITY_MAP.get(nearest.definitionId) : null);
    }
  }

  private handleInteraction() {
    if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
      this.doAbsorb();
    }
    if (Phaser.Input.Keyboard.JustDown(this.qKey)) {
      this.doAnalyze();
    }
  }

  // Public — wird auch von UI-Buttons aufgerufen
  doAbsorb() {
    if (!this.lastNearbyId) return;
    const result = absorbEntity(
      this.gameState.player,
      this.gameState.world,
      this.lastNearbyId
    );
    if (result.success) {
      showNotification(result.message, "absorb", result.skillResults);
      updateUI(this.gameState);
    }
  }

  doAnalyze() {
    if (!this.lastNearbyId) return;
    const result = analyzeEntity(
      this.gameState.player,
      this.gameState.world,
      this.lastNearbyId
    );
    if (result.success) {
      showNotification(result.message, "analyze", result.skillResults);
      updateUI(this.gameState);
    }
  }

  doCombine(skillIdA: string, skillIdB: string) {
    const result = combineSkills(this.gameState.player, skillIdA, skillIdB);
    showCombineResult(result);
    updateUI(this.gameState);
    return result;
  }
}

// ============================================================
// UI-FUNKTIONEN (DOM-basiert, kein Phaser)
// ============================================================

function updateUI(state: GameState) {
  // HUD
  setEl("ui-level", `Lv.${state.player.level}`);
  setEl("ui-hp", `${state.player.hp}/${state.player.maxHp}`);
  setEl("ui-mp", `${state.player.mp}/${state.player.maxMp}`);

  const hpPct = state.player.hp / state.player.maxHp;
  const mpPct = state.player.mp / state.player.maxMp;
  setStyle("hp-bar-fill", "width", `${hpPct * 100}%`);
  setStyle("mp-bar-fill", "width", `${mpPct * 100}%`);

  // Skill-Tab
  renderSkillList(state);
  renderCombinePanel(state);
}

function renderSkillList(state: GameState) {
  const container = document.getElementById("skills-list");
  if (!container) return;

  const skills = getDiscoveredSkillsSorted(state.player);
  if (skills.length === 0) {
    container.innerHTML =
      '<p class="empty-hint">Noch keine Skills entdeckt.<br>Nähere dich einer Entity und drücke <kbd>E</kbd> (Absorb) oder <kbd>Q</kbd> (Analyze).</p>';
    return;
  }

  container.innerHTML = skills
    .map((inst) => {
      const def = ALL_SKILLS.get(inst.definitionId)!;
      const progress = getXpProgress(inst);
      const maxed = isMaxLevel(inst);

      return `
      <div class="skill-card element-${def.element}">
        <div class="skill-header">
          <span class="skill-icon">${def.icon}</span>
          <span class="skill-name">${def.name}</span>
          ${def.category === "combo" ? '<span class="combo-badge">COMBO</span>' : ""}
          <span class="skill-level">Lv.${inst.level}${maxed ? " MAX" : ""}</span>
        </div>
        <div class="xp-bar-wrap">
          <div class="xp-bar-fill" style="width:${progress * 100}%"></div>
        </div>
        <div class="skill-xp-text">
          ${maxed ? "Maximales Level" : `${inst.currentXp} / ${inst.xpToNextLevel} XP`}
        </div>
        <div class="skill-desc">${def.description}</div>
      </div>
    `;
    })
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
      if (!def || def.category === "combo") continue;
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `${def.icon} ${def.name} (Lv.${inst.level})`;
      sel.appendChild(opt);
    }
    if (current) sel.value = current;
  }
}

function updateNearbyUI(entityDef: any) {
  const panel = document.getElementById("nearby-panel");
  if (!panel) return;
  if (!entityDef) {
    panel.innerHTML = '<span class="empty-hint">Keine Entity in Reichweite</span>';
    return;
  }
  panel.innerHTML = `
    <div class="nearby-entity">
      <span class="nearby-icon">${entityDef.icon}</span>
      <span class="nearby-name">${entityDef.name}</span>
      <div class="nearby-drops">Skills: ${entityDef.skillDrops
        .map((id: string) => {
          const s = ALL_SKILLS.get(id);
          return s ? `${s.icon}` : id;
        })
        .join(" ")}</div>
    </div>
    <div class="nearby-actions">
      <button onclick="window.gameScene.doAbsorb()" class="btn-absorb">💥 Absorb (E)</button>
      <button onclick="window.gameScene.doAnalyze()" class="btn-analyze">🔍 Analyze (Q)</button>
    </div>
  `;
}

function showNotification(
  message: string,
  type: "absorb" | "analyze",
  skillResults: any[]
) {
  const container = document.getElementById("notifications");
  if (!container) return;

  const details = skillResults
    .map((r) => {
      const def = ALL_SKILLS.get(r.skillId);
      if (!def) return "";
      if (r.wasNewDiscovery) return `✨ ${def.name} entdeckt!`;
      if (r.leveledUp) return `⬆️ ${def.name} → Lv.${r.newLevel}`;
      return `+${r.xpGained} XP für ${def.name}`;
    })
    .filter(Boolean)
    .join(" · ");

  const notif = document.createElement("div");
  notif.className = `notification notification-${type}`;
  notif.innerHTML = `<strong>${message}</strong>${details ? `<br><small>${details}</small>` : ""}`;
  container.appendChild(notif);

  setTimeout(() => notif.remove(), 3000);
}

function showCombineResult(result: any) {
  const out = document.getElementById("combine-result");
  if (!out) return;
  out.textContent = result.message;
  out.className = `combine-result outcome-${result.outcome}`;
}

function setEl(id: string, text: string) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setStyle(id: string, prop: string, value: string) {
  const el = document.getElementById(id) as HTMLElement | null;
  if (el) (el.style as any)[prop] = value;
}
