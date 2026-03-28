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
import { combineSkills, getDiscoveredSkillsSorted, getXpProgress, isMaxLevel, gainSkillXp, updatePlayerLevel, calcPlayerLevel, calcMaxHp, calcMaxMp, } from "../systems/SkillSystem.js";
import { absorbEntity, analyzeEntity, findNearestEntity, processRespawns, calcSuccessChance, } from "../systems/EntitySystem.js";
import { useGrow, getMaterialList, } from "../systems/MaterialSystem.js";
import { createJoystick } from "../ui/Joystick.js";
import { createSkillBar } from "../ui/SkillBar.js";
import { createSkillMenu } from "../ui/SkillMenu.js";
import { createSaveMenu } from "../ui/SaveMenu.js";
import { saveToSlot, loadFromSlot, deleteAllSaves } from "../systems/SaveSystem.js";
import { calcEntityAi, tickAttackCooldown, setAttackCooldown, resetAi, } from "../systems/AiSystem.js";
import { playerAttack, entityAttack, canActivateSkill, consumeSkill, calcDashDistance, executeCheckpoint, regenMp, } from "../systems/CombatSystem.js";
import { processTicks, triggerAuras, applyEffect, removeExpiredEffects, syncPassiveEffects, } from "../systems/StatusEffectSystem.js";
import { generateTileset } from "../world/TilesetGenerator.js";
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
    constructor() {
        super({ key: "GameScene" });
        this.entitySprites = new Map();
        this.lastNearbyId = null;
        this.gamePaused = false;
        this.playtimeAccumulator = 0; // Sekunden akkumulieren für player.playtimeSeconds
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
        window.gameState = this.gameState;
        window.gameScene = this;
        window.__ALL_SKILLS = ALL_SKILLS;
        this.setupSkillBar();
        this.setupSaveMenu();
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
        const worldW = WORLD_CHUNKS_X * CHUNK_PX; // 20480
        const worldH = WORLD_CHUNKS_Y * CHUNK_PX; // 20480
        this.physics.world.setBounds(0, 0, worldW, worldH);
        this.cameras.main.setBounds(0, 0, worldW, worldH);
        this.chunkManager = new ChunkManager(this, this.gameState, (instance) => this.spawnEntitySprite(instance), (instanceId) => this.despawnEntitySprite(instanceId));
        // Initialen Tick sofort auslösen (Spielerstart in Chunk 0,0)
        this.chunkManager.tick(this.gameState.player.x, this.gameState.player.y, Date.now() - 1000);
    }
    // ────────────────────────────────────────
    // Entity-Sprite: Erstellen / Entfernen
    // ────────────────────────────────────────
    spawnEntitySprite(instance) {
        const def = ENTITY_MAP.get(instance.definitionId);
        if (!def)
            return null;
        const text = this.add
            .text(instance.x, instance.y, def.icon, { fontSize: "28px" })
            .setOrigin(0.5)
            .setInteractive();
        text.on("pointerdown", () => {
            const dist = Math.hypot(this.gameState.player.x - instance.x, this.gameState.player.y - instance.y);
            if (dist > 100) {
                showToast("Näher herangehen!", "system");
                return;
            }
            this.lastNearbyId = instance.instanceId;
            this.doAbsorb();
        });
        // Float-Phase für jede Entity individuell — wird in updateEntityVisuals() genutzt
        text.floatPhase = Math.random() * Math.PI * 2;
        this.entitySprites.set(instance.instanceId, text);
        return text;
    }
    despawnEntitySprite(instanceId) {
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
        const btn = document.getElementById("btnFullscreen");
        const updateBtn = (isFs) => {
            if (!btn)
                return;
            btn.textContent = isFs ? "✕" : "⛶";
            btn.title = isFs ? "Vollbild beenden" : "Vollbild";
        };
        const onChange = () => {
            const isFs = !!(document.fullscreenElement ||
                document.webkitFullscreenElement);
            updateBtn(isFs);
            if (!isFs) {
                this.pauseGame();
            }
            else {
                this.resumeGame();
            }
        };
        document.addEventListener("fullscreenchange", onChange);
        document.addEventListener("webkitfullscreenchange", onChange);
        btn?.addEventListener("click", (e) => {
            e.stopPropagation();
            const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
            if (isFs) {
                this.exitFullscreen();
            }
            else {
                this.enterFullscreen();
            }
        });
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
    exitFullscreen() {
        try {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
            else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
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
    // SKILL BAR + SKILL MENU
    // ----------------------------------------------------------
    setupSkillBar() {
        const container = document.getElementById("skillBarWrap");
        if (!container)
            return;
        // Closure: menuRef wird erst nach createSkillMenu gesetzt,
        // aber erst beim ersten Öffnen aufgerufen → kein doppeltes Erstellen nötig.
        let menuRef = null;
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
    setupSaveMenu() {
        const menu = createSaveMenu();
        // 💾-Button im HUD verdrahten
        document.getElementById("btnSave")?.addEventListener("click", () => menu.open());
        // Auch aus der Pause-Overlay heraus öffnen
        document.getElementById("btnSaveFromPause")?.addEventListener("click", () => {
            const ov = document.getElementById("pauseOverlay");
            if (ov)
                ov.classList.remove("visible");
            menu.open();
        });
    }
    /** Spielstand in Slot speichern */
    saveGame(slot) {
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
    loadGame(slot) {
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
    setupGlobalFunctions() {
        window.switchTab = switchTab;
        window.toggleSheet = toggleSheet;
        window.touchAbsorb = () => this.doAbsorb();
        window.touchAnalyze = () => this.doAnalyze();
        window.doGrow = () => this.doGrow();
        window.togglePassiveSkill = (skillId) => this.togglePassiveSkill(skillId);
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
    update(_time, delta) {
        if (this.gamePaused)
            return;
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
        this.processCombatEffects(delta);
        this.updateEntityVisuals();
        this.checkNearbyEntity();
        this.checkPlayerDeath();
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
        this.hpBarGraphics.clear();
        const now = this.time.now;
        for (const [id, instance] of this.gameState.world.entities) {
            const sprite = this.entitySprites.get(id);
            if (!sprite)
                continue;
            if (!instance.isAlive) {
                sprite.setAlpha(0.2);
                continue;
            }
            if (instance.isAggro) {
                sprite.setTint(0xff4444);
            }
            else {
                sprite.clearTint();
                sprite.setAlpha(1.0);
            }
            // Float-Animation: sanftes Schweben ohne Tween-Konflikt
            sprite.x = instance.x;
            sprite.y = instance.y + Math.sin(now * 0.001 + sprite.floatPhase) * 2.5;
            // HP-Balken (nur bei Schaden oder Aggro)
            const def = ENTITY_MAP.get(instance.definitionId);
            if (def && def.hp && (instance.currentHp < def.hp || instance.isAggro)) {
                const ratio = Math.max(0, instance.currentHp / def.hp);
                const bw = 30;
                const bh = 4;
                const bx = instance.x - bw / 2;
                const by = instance.y - 26;
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
    processEntityAi(delta) {
        const now = Date.now();
        const px = this.gameState.player.x;
        const py = this.gameState.player.y;
        // Nur Entities in aktiven Chunks (ACTIVE_RADIUS) simulieren
        const activeIds = this.chunkManager.getActiveEntityIds();
        for (const [id, instance] of this.gameState.world.entities) {
            if (!activeIds.has(id))
                continue;
            if (!instance.isAlive)
                continue;
            const def = ENTITY_MAP.get(instance.definitionId);
            if (!def)
                continue;
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
                        this.showDamageNumber(instance.x, instance.y - 20, reflectDmg, "#ff8800");
                        // Hemolymph: XP für jeden ausgelösten Rückschlag
                        this.skillLevelUp(gainSkillXp(this.gameState.player, "hemolymph", 2), "hemolymph");
                        if (instance.currentHp <= 0) {
                            instance.isAlive = false;
                            instance.respawnAt = Date.now() + (def?.respawnTime ?? 60) * 1000;
                            resetAi(instance);
                            addLog(`${def?.icon ?? "?"} ${def?.name ?? "Entity"} wurde vernichtet!`, "system");
                        }
                    }
                    addLog(result.message, "aggro");
                    this.showDamageNumber(px, py - 30, result.damageDealt, "#ff4444");
                    updateUI(this.gameState);
                }
            }
        }
    }
    processCombatEffects(delta) {
        const now = Date.now();
        // Spieler-Effekte
        const playerHpDelta = processTicks(this.gameState.player, now);
        if (playerHpDelta !== 0) {
            this.gameState.player.hp = Math.max(0, Math.min(this.gameState.player.maxHp, this.gameState.player.hp + playerHpDelta));
            if (playerHpDelta < 0) {
                this.showDamageNumber(this.gameState.player.x, this.gameState.player.y - 30, -playerHpDelta, "#aa44ff");
            }
            else if (playerHpDelta > 0) {
                // Photosynthesis: XP pro Heilungs-Tick
                this.skillLevelUp(gainSkillXp(this.gameState.player, "photosynthesis", 1), "photosynthesis");
            }
            updateUI(this.gameState);
        }
        removeExpiredEffects(this.gameState.player, now);
        // Entity-Effekte — processTicks erwartet { hp, maxHp } → Wrapper
        for (const instance of this.gameState.world.entities.values()) {
            if (!instance.isAlive)
                continue;
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
                    this.showDamageNumber(instance.x, instance.y - 20, -hpDelta, "#44ff88");
                }
                if (instance.currentHp <= 0) {
                    instance.isAlive = false;
                    instance.respawnAt = Date.now() + (def?.respawnTime ?? 60) * 1000;
                    resetAi(instance);
                    if (def)
                        addLog(`${def.icon} ${def.name} wurde vernichtet!`, "system");
                }
            }
            removeExpiredEffects(instance, now);
        }
        // MP-Regen (1 MP/s)
        regenMp(this.gameState.player, delta);
    }
    checkPlayerDeath() {
        if (this.gameState.player.hp > 0)
            return;
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
    skillLevelUp(result, skillId) {
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
    checkPlayerLevelUp() {
        const r = updatePlayerLevel(this.gameState.player);
        if (r.leveledUp) {
            const p = this.gameState.player;
            addLog(`🌟 Charakter → Lv.${r.newLevel}! (HP: ${p.maxHp} / MP: ${p.maxMp})`, "levelup");
        }
    }
    showDamageNumber(x, y, dmg, color) {
        const txt = this.add
            .text(x, y, `${Math.round(dmg)}`, {
            fontSize: "13px",
            color,
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 3,
        })
            .setOrigin(0.5)
            .setDepth(20);
        this.tweens.add({
            targets: txt,
            y: y - 38,
            alpha: 0,
            duration: 900,
            ease: "Power1",
            onComplete: () => txt.destroy(),
        });
    }
    activateSkill(skillId) {
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
                this.slimeGraphic.setPosition(Phaser.Math.Clamp(this.slimeGraphic.x + nx * dist, 0, 1600), Phaser.Math.Clamp(this.slimeGraphic.y + ny * dist, 0, 1200));
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
            this.showDamageNumber(target.x, target.y - 20, result.damageDealt, "#ffffff");
            if (target.currentHp <= 0) {
                target.isAlive = false;
                const def = ENTITY_MAP.get(target.definitionId);
                target.respawnAt = Date.now() + (def?.respawnTime ?? 60) * 1000;
                resetAi(target);
                if (def)
                    addLog(`${def.icon} ${def.name} wurde besiegt!`, "system");
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
        }
        else {
            showToast(result.message, "system");
        }
        updateUI(this.gameState);
    }
    checkNearbyEntity() {
        const nearest = findNearestEntity(this.gameState.player, this.gameState.world, 100);
        const nearestId = nearest?.instanceId ?? null;
        if (nearestId !== this.lastNearbyId) {
            this.lastNearbyId = nearestId;
            updateNearbyPanel(nearest ? ENTITY_MAP.get(nearest.definitionId) : undefined, this.gameState);
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
        const result = analyzeEntity(this.gameState.player, this.gameState.world, this.lastNearbyId);
        showInteractionResult(result, this.gameState);
        if (result.success)
            syncPassiveEffects(this.gameState.player);
        this.checkPlayerLevelUp();
        updateUI(this.gameState);
    }
    doGrow() {
        const result = useGrow(this.gameState.player);
        showToast(result.message, result.success ? "absorb" : "system");
        if (result.success)
            updateUI(this.gameState);
    }
    togglePassiveSkill(skillId) {
        const inst = this.gameState.player.discoveredSkills.get(skillId);
        if (!inst)
            return;
        inst.isEnabled = inst.isEnabled === false ? true : false;
        syncPassiveEffects(this.gameState.player);
        updateUI(this.gameState);
        const state = inst.isEnabled ? "aktiviert" : "deaktiviert";
        showToast(`${ALL_SKILLS.get(skillId)?.name ?? skillId} ${state}`, "system");
    }
    doCombine(skillIdA, skillIdB) {
        const result = combineSkills(this.gameState.player, skillIdA, skillIdB);
        showCombineResult(result);
        this.checkPlayerLevelUp();
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
    const { xpIntoLevel, xpToNext } = calcPlayerLevel(p.totalExp);
    setStyle("xp-bar-fill", "width", `${(xpIntoLevel / xpToNext) * 100}%`);
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