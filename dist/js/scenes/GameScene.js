// ============================================================
// GAME SCENE
// Absorb & Evolve — Phaser Scene für das Hauptspiel
//
// Diese Datei ist die einzige die Phaser, DOM und Browser kennt.
// Alle Spiellogik kommt aus systems/ und data/.
// ============================================================
import { createInitialGameState } from "../types/GameState.js";
import { ALL_SKILLS } from "../data/skills.js";
import { MATERIAL_MAP } from "../data/materials.js";
import { ENTITY_MAP } from "../data/entities.js";
import { combineSkills, getDiscoveredSkillsSorted, getXpProgress, isMaxLevel, } from "../systems/SkillSystem.js";
import { absorbEntity, analyzeEntity, findNearestEntity, processRespawns, calcSuccessChance, } from "../systems/EntitySystem.js";
import { useGrow, getMaterialList, } from "../systems/MaterialSystem.js";
import { createJoystick } from "../ui/Joystick.js";
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
    constructor() {
        super({ key: "GameScene" });
        this.entitySprites = new Map();
        this.lastNearbyId = null;
        this.gamePaused = false;
    }
    create() {
        this.gameState = createInitialGameState();
        this.createWorld();
        this.createEntities();
        this.createPlayer();
        this.setupJoystick();
        this.setupFullscreen();
        this.setupGlobalFunctions();
        window.gameState = this.gameState;
        window.gameScene = this;
        this.cameras.main.startFollow(this.slimeGraphic, true, 0.1, 0.1);
        this.cameras.main.setZoom(1.5);
        updateUI(this.gameState);
        addLog("Du erwachst als Schleim…", "system");
        addLog("Joystick bewegen · ABSORB + ANALYZE tippen", "system");
    }
    // ----------------------------------------------------------
    // WELT
    // ----------------------------------------------------------
    createWorld() {
        const worldW = 1600;
        const worldH = 1200;
        const g = this.add.graphics();
        g.fillStyle(0x1a3320);
        g.fillRect(0, 0, worldW, worldH);
        g.fillStyle(0x142618, 0.5);
        for (let x = 0; x < worldW; x += 80) {
            for (let y = 0; y < worldH; y += 80) {
                if ((x + y) % 160 === 0)
                    g.fillRect(x, y, 40, 40);
            }
        }
        // Gras-Patches (visuelle Untermalung für Gras-Cluster)
        const grassPatches = [
            { x: 240, y: 200, w: 160, h: 120 }, // Cluster A — nahe Spielerstart
            { x: 680, y: 130, w: 180, h: 130 }, // Cluster B — oben Mitte
            { x: 120, y: 590, w: 170, h: 130 }, // Cluster C — links
            { x: 980, y: 340, w: 180, h: 140 }, // Cluster D — rechts
            { x: 780, y: 800, w: 190, h: 130 }, // Cluster E — unten Mitte
            { x: 1230, y: 640, w: 160, h: 120 }, // Cluster F — rechts unten
        ];
        g.fillStyle(0x1e4a28, 0.85);
        for (const p of grassPatches) {
            g.fillRoundedRect(p.x, p.y, p.w, p.h, 18);
        }
        g.fillStyle(0x256030, 0.4);
        for (const p of grassPatches) {
            g.fillRoundedRect(p.x + 8, p.y + 8, p.w - 16, p.h - 16, 12);
        }
        // Dekorationen
        const decos = [
            { x: 80, y: 80, i: "🌲" }, { x: 1450, y: 90, i: "🌲" },
            { x: 180, y: 1060, i: "🌲" }, { x: 1520, y: 1010, i: "🌲" },
            { x: 760, y: 28, i: "🪨" }, { x: 40, y: 610, i: "🪨" },
            { x: 1560, y: 490, i: "🪨" }, { x: 810, y: 1160, i: "🌲" },
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
    createPlayer() {
        const g = this.add.graphics();
        g.fillStyle(0x20a860);
        g.fillCircle(20, 20, 18);
        g.fillStyle(0x40e890);
        g.fillCircle(20, 20, 15);
        g.fillStyle(0x90ffcc, 0.7);
        g.fillCircle(14, 14, 7);
        g.generateTexture("slime", 40, 40);
        g.destroy();
        this.slimeGraphic = this.physics.add.image(this.gameState.player.x, this.gameState.player.y, "slime");
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
    createEntities() {
        const placements = [
            // --- Cluster A (nahe Spielerstart, ~300,250) ---
            { defId: "grass", x: 270, y: 220 },
            { defId: "grass", x: 320, y: 250 },
            { defId: "grass", x: 295, y: 295 },
            { defId: "ant", x: 350, y: 225 },
            { defId: "ladybug", x: 260, y: 300 },
            // --- Cluster B (oben Mitte, ~760,185) ---
            { defId: "grass", x: 720, y: 165 },
            { defId: "grass", x: 770, y: 190 },
            { defId: "grass", x: 745, y: 235 },
            { defId: "ant", x: 810, y: 170 },
            { defId: "jumping_spider", x: 690, y: 210 },
            // --- Cluster C (links, ~195,650) ---
            { defId: "grass", x: 160, y: 620 },
            { defId: "grass", x: 210, y: 645 },
            { defId: "grass", x: 185, y: 690 },
            { defId: "ladybug", x: 145, y: 665 },
            { defId: "ant", x: 245, y: 635 },
            // --- Cluster D (rechts, ~1060,400) ---
            { defId: "grass", x: 1010, y: 370 },
            { defId: "grass", x: 1065, y: 390 },
            { defId: "grass", x: 1035, y: 440 },
            { defId: "jumping_spider", x: 1110, y: 375 },
            { defId: "poison_spider", x: 1090, y: 445 },
            { defId: "ladybug", x: 1000, y: 430 },
            { defId: "ant", x: 1075, y: 450 },
            // --- Cluster E (unten Mitte, ~860,850) ---
            { defId: "grass", x: 825, y: 825 },
            { defId: "grass", x: 880, y: 850 },
            { defId: "grass", x: 850, y: 895 },
            { defId: "ant", x: 920, y: 830 },
            { defId: "jumping_spider", x: 810, y: 880 },
            { defId: "poison_spider", x: 900, y: 890 },
            // --- Cluster F (rechts unten, ~1295,680) ---
            { defId: "grass", x: 1255, y: 660 },
            { defId: "grass", x: 1310, y: 680 },
            { defId: "grass", x: 1280, y: 725 },
            { defId: "ladybug", x: 1350, y: 665 },
            { defId: "jumping_spider", x: 1240, y: 710 },
            { defId: "poison_spider", x: 1330, y: 720 },
        ];
        for (let i = 0; i < placements.length; i++) {
            const p = placements[i];
            const def = ENTITY_MAP.get(p.defId);
            if (!def)
                continue;
            const instanceId = `entity_${i}`;
            const instance = {
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
                const dist = Math.hypot(this.gameState.player.x - p.x, this.gameState.player.y - p.y);
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
    // JOYSTICK (Mobile)
    // ----------------------------------------------------------
    setupJoystick() {
        const container = document.getElementById("touchControls");
        if (!container)
            return;
        this.joy = createJoystick(container);
    }
    // ----------------------------------------------------------
    // VOLLBILD
    // ----------------------------------------------------------
    setupFullscreen() {
        const onChange = () => {
            const isFs = !!(document.fullscreenElement ||
                document.webkitFullscreenElement);
            if (!isFs) {
                this.pauseGame();
            }
            else {
                this.resumeGame();
            }
        };
        document.addEventListener("fullscreenchange", onChange);
        document.addEventListener("webkitfullscreenchange", onChange);
        // Beim ersten Tippen/Klicken in den Vollbild-Modus wechseln
        document.addEventListener("pointerdown", () => this.enterFullscreen(), { once: true });
    }
    enterFullscreen() {
        const el = document.documentElement;
        try {
            if (el.requestFullscreen) {
                el.requestFullscreen();
            }
            else if (el.webkitRequestFullscreen) {
                el.webkitRequestFullscreen();
            }
        }
        catch (_) { }
    }
    pauseGame() {
        if (this.gamePaused)
            return;
        this.gamePaused = true;
        this.physics.pause();
        const ov = document.getElementById("pauseOverlay");
        if (ov)
            ov.classList.add("visible");
    }
    resumeGame() {
        if (!this.gamePaused)
            return;
        this.gamePaused = false;
        this.physics.resume();
        const ov = document.getElementById("pauseOverlay");
        if (ov)
            ov.classList.remove("visible");
    }
    // ----------------------------------------------------------
    // GLOBALE FUNKTIONEN (für HTML-Buttons)
    // ----------------------------------------------------------
    setupGlobalFunctions() {
        window.switchTab = switchTab;
        window.toggleSheet = toggleSheet;
        window.touchAbsorb = () => this.doAbsorb();
        window.touchAnalyze = () => this.doAnalyze();
        window.doGrow = () => this.doGrow();
        window.resumeFromPause = () => {
            const el = document.documentElement;
            if (el.requestFullscreen || el.webkitRequestFullscreen) {
                this.enterFullscreen();
                // resumeGame() wird vom fullscreenchange-Event ausgelöst
            }
            else {
                // iOS Safari: kein Fullscreen-Support — direkt fortsetzen
                this.resumeGame();
            }
        };
    }
    // ----------------------------------------------------------
    // GAME LOOP
    // ----------------------------------------------------------
    update(_time, _delta) {
        if (this.gamePaused)
            return;
        this.handleMovement();
        this.syncPlayerPosition();
        this.updateEntityVisuals();
        this.checkNearbyEntity();
        this.applyPassiveSkills(_delta);
        processRespawns(this.gameState.world);
    }
    handleMovement() {
        const speed = 180;
        const body = this.slimeGraphic.body;
        let dx = this.joy.active ? this.joy.dx : 0;
        let dy = this.joy.active ? this.joy.dy : 0;
        const len = Math.hypot(dx, dy);
        if (len > 1) {
            dx /= len;
            dy /= len;
        }
        body.setVelocity(dx * speed, dy * speed);
    }
    syncPlayerPosition() {
        this.gameState.player.x = this.slimeGraphic.x;
        this.gameState.player.y = this.slimeGraphic.y;
    }
    updateEntityVisuals() {
        for (const [id, instance] of this.gameState.world.entities) {
            const sprite = this.entitySprites.get(id);
            if (!sprite)
                continue;
            if (!instance.isAlive) {
                sprite.setAlpha(0.2);
            }
            else if (instance.isAggro) {
                sprite.setTint(0xff4444); // Roter Tint bei Aggro
            }
            else {
                sprite.clearTint();
                sprite.setAlpha(1.0);
            }
        }
    }
    checkNearbyEntity() {
        const nearest = findNearestEntity(this.gameState.player, this.gameState.world, 100);
        const nearestId = nearest?.instanceId ?? null;
        if (nearestId !== this.lastNearbyId) {
            this.lastNearbyId = nearestId;
            updateNearbyPanel(nearest ? ENTITY_MAP.get(nearest.definitionId) : undefined, this.gameState);
        }
    }
    // Photosynthesis: passiver HP-Regen
    applyPassiveSkills(delta) {
        const photoSkill = this.gameState.player.discoveredSkills.get("photosynthesis");
        if (!photoSkill)
            return;
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
        const result = absorbEntity(this.gameState.player, this.gameState.world, this.lastNearbyId);
        showInteractionResult(result, this.gameState);
        updateUI(this.gameState);
        if (result.success) {
            this.lastNearbyId = null;
            updateNearbyPanel(undefined, this.gameState);
        }
    }
    doAnalyze() {
        if (!this.lastNearbyId) {
            showToast("Keine Entity in Reichweite.", "system");
            return;
        }
        const result = analyzeEntity(this.gameState.player, this.gameState.world, this.lastNearbyId);
        showInteractionResult(result, this.gameState);
        updateUI(this.gameState);
    }
    doGrow() {
        const result = useGrow(this.gameState.player);
        showToast(result.message, result.success ? "absorb" : "system");
        if (result.success)
            updateUI(this.gameState);
    }
    doCombine(skillIdA, skillIdB) {
        const result = combineSkills(this.gameState.player, skillIdA, skillIdB);
        showCombineResult(result);
        updateUI(this.gameState);
        return result;
    }
    // ----------------------------------------------------------
    // HILFSFUNKTION
    // ----------------------------------------------------------
    findEntityNear(wx, wy, radius) {
        for (const instance of this.gameState.world.entities.values()) {
            if (!instance.isAlive)
                continue;
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
function updateUI(state) {
    const p = state.player;
    // HUD
    setEl("ui-level", `Lv.${p.level}`);
    setEl("ui-hp", `${Math.floor(p.hp)}/${p.maxHp}`);
    setEl("ui-mp", `${p.mp}/${p.maxMp}`);
    setStyle("hp-bar-fill", "width", `${(p.hp / p.maxHp) * 100}%`);
    setStyle("mp-bar-fill", "width", `${(p.mp / p.maxMp) * 100}%`);
    // Kern-Fähigkeiten
    setEl("ui-analyze-level", `🔍 Lv.${p.coreAbilities.analyze.level} (${p.coreAbilities.analyze.currentXp}/${p.coreAbilities.analyze.xpToNextLevel} XP)`);
    setEl("ui-absorb-level", `💥 Lv.${p.coreAbilities.absorb.level} (${p.coreAbilities.absorb.currentXp}/${p.coreAbilities.absorb.xpToNextLevel} XP)`);
    renderSkillList(state);
    renderCombinePanel(state);
    renderMaterials(state);
}
function renderSkillList(state) {
    const container = document.getElementById("skills-list");
    if (!container)
        return;
    const skills = getDiscoveredSkillsSorted(state.player);
    if (skills.length === 0) {
        container.innerHTML =
            '<p class="empty-hint">Noch keine Skills entdeckt.<br>Nähere dich einer Entity und tippe 💥 Absorb oder 🔍 Analyze.</p>';
        return;
    }
    container.innerHTML = skills
        .map((inst) => {
        const def = ALL_SKILLS.get(inst.definitionId);
        if (!def)
            return "";
        const progress = getXpProgress(inst);
        const maxed = isMaxLevel(inst);
        const isPassive = def.activation === "passive";
        const hasGrow = def.id === "grow" && !maxed;
        return `
        <div class="skill-card element-${def.element}">
          <div class="skill-header">
            <span class="skill-icon">${def.icon}</span>
            <span class="skill-name">${def.name}</span>
            ${def.category === "combo" ? '<span class="combo-badge">COMBO</span>' : ""}
            ${isPassive ? '<span class="combo-badge" style="background:#4af0c8;color:#000">PASSIV</span>' : ""}
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
function renderCombinePanel(state) {
    const selects = ["combine-a", "combine-b"];
    for (const selId of selects) {
        const sel = document.getElementById(selId);
        if (!sel)
            continue;
        const current = sel.value;
        sel.innerHTML = '<option value="">— Skill wählen —</option>';
        for (const [id, inst] of state.player.discoveredSkills) {
            const def = ALL_SKILLS.get(id);
            if (!def || def.category !== "basic")
                continue; // Nur basic-Skills kombinierbar
            const opt = document.createElement("option");
            opt.value = id;
            opt.textContent = `${def.icon} ${def.name} (Lv.${inst.level})`;
            sel.appendChild(opt);
        }
        if (current)
            sel.value = current;
    }
}
function renderMaterials(state) {
    const container = document.getElementById("materials-list");
    if (!container)
        return;
    const mats = getMaterialList(state.player);
    if (mats.length === 0) {
        container.innerHTML =
            '<p class="empty-hint">Noch keine Materialien gesammelt.<br>Absorbiere Pflanzen oder Steine.</p>';
        return;
    }
    container.innerHTML = mats
        .map((m) => `
      <div class="material-row">
        <span class="mat-icon">${m.icon}</span>
        <span class="mat-name">${m.name}</span>
        <span class="mat-amount">×${m.formatted}</span>
      </div>
    `)
        .join("");
}
function updateNearbyPanel(entityDef, state) {
    const panel = document.getElementById("nearby-panel");
    if (!panel)
        return;
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
      ${matIcons ? `<div class="nearby-drops" title="Mögliche Materialien">📦 ${matIcons}</div>` : ""}
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
function showInteractionResult(result, state) {
    const type = result.method;
    if (!result.success) {
        const logType = result.aggroTriggered ? "aggro" : "system";
        addLog(result.message, logType);
        showToast(result.message, "system");
        return;
    }
    // Skill-Ergebnisse
    const skillLines = result.skillResults
        .map((r) => {
        const def = ALL_SKILLS.get(r.skillId);
        if (!def)
            return "";
        if (r.wasNewDiscovery)
            return `✨ ${def.name} entdeckt!`;
        if (r.leveledUp)
            return `⬆️ ${def.name} → Lv.${r.newLevel}`;
        return `+${r.xpGained} XP für ${def.name}`;
    })
        .filter(Boolean);
    // Material-Ergebnisse
    const matLines = result.materialResults.map((m) => {
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
function showToast(msg, type) {
    const el = document.getElementById("notification");
    if (!el)
        return;
    el.textContent = msg;
    el.className = `notification show notification-${type}`;
    setTimeout(() => el.classList.remove("show"), 2800);
}
function addLog(msg, type = "system") {
    const logState = window._log ?? (window._log = { log: [] });
    logState.log.unshift({ msg, type });
    if (logState.log.length > 50)
        logState.log.pop();
    const el = document.getElementById("logList");
    if (el) {
        el.innerHTML = logState.log
            .slice(0, 30)
            .map((l) => `<div class="log-entry ${l.type}">${l.msg}</div>`)
            .join("");
    }
}
function showCombineResult(result) {
    const out = document.getElementById("combine-result");
    if (!out)
        return;
    out.textContent = result.message;
    out.className = `combine-result outcome-${result.outcome}`;
}
function switchTab(name) {
    window._currentTab = name;
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    document.querySelectorAll(`.tab-btn[data-tab="${name}"]`).forEach((b) => b.classList.add("active"));
    const el = document.getElementById(`tab-${name}`);
    if (el)
        el.classList.add("active");
    syncMobileTab(name);
}
function syncMobileTab(name) {
    const mc = document.getElementById("mobileTabContent");
    const src = document.getElementById(`tab-${name}`);
    if (mc && src)
        mc.innerHTML = src.innerHTML;
}
function toggleSheet() {
    document.getElementById("bottomSheet")?.classList.toggle("open");
    syncMobileTab(window._currentTab ?? "skills");
}
// -----------------------------------------------------------
// DOM-HELFER
// -----------------------------------------------------------
function setEl(id, text) {
    const el = document.getElementById(id);
    if (el)
        el.textContent = text;
}
function setStyle(id, prop, value) {
    const el = document.getElementById(id);
    if (el)
        el.style[prop] = value;
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
//# sourceMappingURL=GameScene.js.map