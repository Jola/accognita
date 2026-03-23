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
  private cursors!: any;
  private wasdKeys!: any;
  private eKey!: any;
  private qKey!: any;

  // Joystick-Zustand (mobile)
  private joy = { active: false, id: -1, cx: 0, cy: 0, dx: 0, dy: 0 };
  private readonly JOY_RADIUS = 44;

  private lastNearbyId: string | null = null;

  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    this.gameState = createInitialGameState();

    this.createWorld();
    this.createEntities();
    this.createPlayer();
    this.createInput();
    this.setupJoystick();
    this.setupGlobalFunctions();

    (window as any).gameState  = this.gameState;
    (window as any).gameScene  = this;

    this.cameras.main.startFollow(this.slimeGraphic, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5);

    updateUI(this.gameState);
    addLog("Du erwachst als Schleim…", "system");
    addLog("📱 Mobile: Joystick + ABSORB/ANALYZE", "system");
    addLog("🖥️ Desktop: WASD + E (Absorb) / Q (Analyze)", "system");
  }

  // ----------------------------------------------------------
  // WELT
  // ----------------------------------------------------------
  private createWorld() {
    const worldW = 1600;
    const worldH = 1200;
    const g = this.add.graphics();

    g.fillStyle(0x1a3320);
    g.fillRect(0, 0, worldW, worldH);
    g.fillStyle(0x142618, 0.5);
    for (let x = 0; x < worldW; x += 80) {
      for (let y = 0; y < worldH; y += 80) {
        if ((x + y) % 160 === 0) g.fillRect(x, y, 40, 40);
      }
    }

    // Dekorationen
    const decos = [
      { x: 80,   y: 80,   i: "🌲" }, { x: 1450, y: 90,   i: "🌲" },
      { x: 180,  y: 1060, i: "🌲" }, { x: 1520, y: 1010, i: "🌲" },
      { x: 760,  y: 28,   i: "🪨" }, { x: 40,   y: 610,  i: "🪨" },
      { x: 1560, y: 490,  i: "🪨" }, { x: 810,  y: 1160, i: "🌲" },
    ];
    for (const d of decos) {
      this.add.text(d.x, d.y, d.i, { fontSize: "32px" }).setAlpha(0.5);
    }

    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
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

  // ----------------------------------------------------------
  // ENTITIES
  // ----------------------------------------------------------
  private createEntities() {
    const placements = [
      { defId: "red_slime",      x: 200,  y: 200 },
      { defId: "red_slime",      x: 600,  y: 350 },
      { defId: "blue_slime",     x: 400,  y: 150 },
      { defId: "blue_slime",     x: 800,  y: 400 },
      { defId: "goblin",         x: 500,  y: 500 },
      { defId: "goblin",         x: 300,  y: 600 },
      { defId: "forest_wolf",    x: 900,  y: 250 },
      { defId: "stone_golem",    x: 700,  y: 700 },
      { defId: "vine_plant",     x: 150,  y: 450 },
      { defId: "vine_plant",     x: 1000, y: 500 },
      { defId: "poison_mushroom",x: 350,  y: 300 },
      { defId: "poison_mushroom",x: 650,  y: 550 },
      { defId: "forest_stone",   x: 250,  y: 800 },
      { defId: "forest_stone",   x: 900,  y: 800 },
      { defId: "dark_wisp",      x: 1100, y: 900 },
      { defId: "light_fairy",    x: 1200, y: 200 },
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

      const text = this.add
        .text(p.x, p.y, def.icon, { fontSize: "28px" })
        .setOrigin(0.5)
        .setInteractive();

      // Tap auf Entity (mobil: Absorb)
      text.on("pointerdown", () => {
        const dist = Math.hypot(
          this.gameState.player.x - p.x,
          this.gameState.player.y - p.y
        );
        if (dist > 100) {
          showToast("Näher herangehen!", "system");
          return;
        }
        this.lastNearbyId = instanceId;
        this.doAbsorb();
      });

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

  // ----------------------------------------------------------
  // INPUT
  // ----------------------------------------------------------
  private createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasdKeys = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.qKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    // Rechtsklick = Analyze
    this.game.canvas.addEventListener("contextmenu", (e: MouseEvent) => {
      e.preventDefault();
      const rect = this.game.canvas.getBoundingClientRect();
      const cam = this.cameras.main;
      const wx = (e.clientX - rect.left) / cam.zoom + cam.scrollX;
      const wy = (e.clientY - rect.top)  / cam.zoom + cam.scrollY;
      const hit = this.findEntityNear(wx, wy, 50);
      if (!hit) return;
      const dist = Math.hypot(
        this.gameState.player.x - hit.x,
        this.gameState.player.y - hit.y
      );
      if (dist > 100) { showToast("Näher herangehen!", "system"); return; }
      this.lastNearbyId = hit.instanceId;
      this.doAnalyze();
    });

    // Tab-Taste: Tabs durchschalten
    this.input.keyboard.on("keydown-TAB", (e: KeyboardEvent) => {
      e.preventDefault();
      const tabs = ["skills", "combine", "materials", "log"];
      const current = (window as any)._currentTab ?? "skills";
      const next = tabs[(tabs.indexOf(current) + 1) % tabs.length];
      switchTab(next);
    });
  }

  // ----------------------------------------------------------
  // JOYSTICK (Mobile)
  // ----------------------------------------------------------
  private setupJoystick() {
    const jZone  = document.getElementById("joystickZone");
    const jThumb = document.getElementById("joystickThumb");
    if (!jZone || !jThumb) return;

    const JR = this.JOY_RADIUS;

    const moveJoy = (touch: Touch) => {
      const rect = jZone.getBoundingClientRect();
      const dx = touch.clientX - this.joy.cx;
      const dy = touch.clientY - this.joy.cy;
      const len = Math.hypot(dx, dy);
      const capped = Math.min(len, JR);
      const angle = Math.atan2(dy, dx);
      this.joy.dx = (Math.cos(angle) * capped) / JR;
      this.joy.dy = (Math.sin(angle) * capped) / JR;
      jThumb.style.transform = `translate(${Math.cos(angle) * capped}px, ${Math.sin(angle) * capped}px)`;
    };

    jZone.addEventListener("touchstart", (e: TouchEvent) => {
      e.preventDefault();
      if (this.joy.active) return;
      const t = e.changedTouches[0];
      const rect = jZone.getBoundingClientRect();
      this.joy = {
        active: true,
        id: t.identifier,
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
        dx: 0, dy: 0,
      };
      moveJoy(t);
    }, { passive: false });

    jZone.addEventListener("touchmove", (e: TouchEvent) => {
      e.preventDefault();
      if (!this.joy.active) return;
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.joy.id) moveJoy(t);
      }
    }, { passive: false });

    const endJoy = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === this.joy.id) {
          this.joy.active = false;
          this.joy.dx = 0;
          this.joy.dy = 0;
          jThumb.style.transform = "translate(0,0)";
        }
      }
    };
    jZone.addEventListener("touchend",    endJoy, { passive: false });
    jZone.addEventListener("touchcancel", endJoy, { passive: false });
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
  }

  // ----------------------------------------------------------
  // GAME LOOP
  // ----------------------------------------------------------
  update(_time: number, _delta: number) {
    this.handleMovement();
    this.syncPlayerPosition();
    this.updateEntityVisuals();
    this.checkNearbyEntity();
    this.handleKeyboardInteraction();
    this.applyPassiveSkills(_delta);

    processRespawns(this.gameState.world);
  }

  private handleMovement() {
    const speed = 180;
    const body = this.slimeGraphic.body;

    const left  = this.cursors.left.isDown  || this.wasdKeys.left.isDown;
    const right = this.cursors.right.isDown || this.wasdKeys.right.isDown;
    const up    = this.cursors.up.isDown    || this.wasdKeys.up.isDown;
    const down  = this.cursors.down.isDown  || this.wasdKeys.down.isDown;

    let dx = (left ? -1 : right ? 1 : 0) + (this.joy.active ? this.joy.dx : 0);
    let dy = (up   ? -1 : down  ? 1 : 0) + (this.joy.active ? this.joy.dy : 0);
    const len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }

    body.setVelocity(dx * speed, dy * speed);
  }

  private syncPlayerPosition() {
    this.gameState.player.x = this.slimeGraphic.x;
    this.gameState.player.y = this.slimeGraphic.y;
  }

  private updateEntityVisuals() {
    for (const [id, instance] of this.gameState.world.entities) {
      const sprite = this.entitySprites.get(id);
      if (!sprite) continue;
      if (!instance.isAlive) {
        sprite.setAlpha(0.2);
      } else if (instance.isAggro) {
        sprite.setTint(0xff4444); // Roter Tint bei Aggro
      } else {
        sprite.clearTint();
        sprite.setAlpha(1.0);
      }
    }
  }

  private checkNearbyEntity() {
    const nearest = findNearestEntity(this.gameState.player, this.gameState.world, 100);
    const nearestId = nearest?.instanceId ?? null;

    if (nearestId !== this.lastNearbyId) {
      this.lastNearbyId = nearestId;
      updateNearbyPanel(
        nearest ? ENTITY_MAP.get(nearest.definitionId) : null,
        this.gameState
      );
    }
  }

  private handleKeyboardInteraction() {
    if (Phaser.Input.Keyboard.JustDown(this.eKey)) this.doAbsorb();
    if (Phaser.Input.Keyboard.JustDown(this.qKey)) this.doAnalyze();
  }

  // Photosynthesis: passiver HP-Regen
  private applyPassiveSkills(delta: number) {
    const photoSkill = this.gameState.player.discoveredSkills.get("photosynthesis");
    if (!photoSkill) return;

    const regenPerMs = (0.01 * photoSkill.level) / 1000;
    const regen = regenPerMs * delta;
    const p = this.gameState.player;
    if (p.hp < p.maxHp) {
      p.hp = Math.min(p.maxHp, p.hp + regen);
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
    updateUI(this.gameState);
    if (result.success) {
      this.lastNearbyId = null;
      updateNearbyPanel(null, this.gameState);
    }
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
    updateUI(this.gameState);
  }

  doGrow() {
    const result = useGrow(this.gameState.player);
    showToast(result.message, result.success ? "absorb" : "system");
    if (result.success) updateUI(this.gameState);
  }

  doCombine(skillIdA: string, skillIdB: string) {
    const result = combineSkills(this.gameState.player, skillIdA, skillIdB);
    showCombineResult(result);
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
      '<p class="empty-hint">Noch keine Skills entdeckt.<br>Nähere dich einer Entity und drücke <kbd>E</kbd> (Absorb) oder <kbd>Q</kbd> (Analyze).</p>';
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

      return `
        <div class="skill-card element-${def.element}">
          <div class="skill-header">
            <span class="skill-icon">${def.icon}</span>
            <span class="skill-name">${def.name}</span>
            ${def.category === "combo"   ? '<span class="combo-badge">COMBO</span>'   : ""}
            ${isPassive                  ? '<span class="combo-badge" style="background:#4af0c8;color:#000">PASSIV</span>' : ""}
            <span class="skill-level">Lv.${inst.level}${maxed ? " MAX" : ""}</span>
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
      <button onclick="window.gameScene.doAbsorb()" class="btn-absorb">💥 Absorb (E)</button>
      <button onclick="window.gameScene.doAnalyze()" class="btn-analyze">🔍 Analyze (Q)</button>
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
