declare const Phaser: any;
export declare class BootScene extends Phaser.Scene {
    constructor();
    create(): void;
}
export declare class GameScene extends Phaser.Scene {
    private gameState;
    private slimeGraphic;
    private entitySprites;
    private chunkManager;
    private joy;
    private lastNearbyId;
    private gamePaused;
    private hpBarGraphics;
    private skillBar;
    private playtimeAccumulator;
    constructor();
    preload(): void;
    create(): void;
    private createWorld;
    private spawnEntitySprite;
    private despawnEntitySprite;
    private createPlayer;
    private calcPlayerWorldRadius;
    private getPlayerAttackRange;
    private updateCameraZoom;
    private setupJoystick;
    private setupFullscreen;
    private enterFullscreen;
    private exitFullscreen;
    private pauseGame;
    private resumeGame;
    private setupSkillBar;
    /** Spiel für UI pausieren (ohne Pause-Overlay) */
    pauseForUI(): void;
    /** Spiel nach UI-Schließen fortsetzen */
    resumeForUI(): void;
    private setupSaveMenu;
    /** Spielstand in Slot speichern */
    saveGame(slot: number): void;
    /** Spielstand aus Slot laden */
    loadGame(slot: number): void;
    /** Alles zurücksetzen und Seite neu laden */
    resetGame(): void;
    private setupGlobalFunctions;
    update(_time: number, delta: number): void;
    private updateSlimeWobble;
    private handleMovement;
    private syncPlayerPosition;
    private updateEntityVisuals;
    private processEntityAi;
    private processEntityLeveling;
    private processCombatEffects;
    private checkPlayerDeath;
    /** Level-Up nach gainSkillXp() verarbeiten: Log + syncPassiveEffects */
    private skillLevelUp;
    /** Hauptlevel neu berechnen und bei Level-Up loggen */
    private checkPlayerLevelUp;
    private showDamageNumber;
    activateSkill(skillId: string): void;
    private checkNearbyEntity;
    doAbsorb(): void;
    doAnalyze(): void;
    doGrow(): void;
    togglePassiveSkill(skillId: string): void;
    doCombine(skillIdA: string, skillIdB: string): import("../types/Skill.js").CombineResult;
    private findEntityNear;
}
export {};
//# sourceMappingURL=GameScene.d.ts.map