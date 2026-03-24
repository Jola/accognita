declare const Phaser: any;
export declare class BootScene extends Phaser.Scene {
    constructor();
    create(): void;
}
export declare class GameScene extends Phaser.Scene {
    private gameState;
    private slimeGraphic;
    private entitySprites;
    private joy;
    private lastNearbyId;
    private gamePaused;
    private hpBarGraphics;
    constructor();
    create(): void;
    private createWorld;
    private createPlayer;
    private createEntities;
    private setupJoystick;
    private setupFullscreen;
    private enterFullscreen;
    private pauseGame;
    private resumeGame;
    private setupGlobalFunctions;
    update(_time: number, delta: number): void;
    private handleMovement;
    private syncPlayerPosition;
    private updateEntityVisuals;
    private processEntityAi;
    private processCombatEffects;
    private checkPlayerDeath;
    private showDamageNumber;
    activateSkill(skillId: string): void;
    private checkNearbyEntity;
    doAbsorb(): void;
    doAnalyze(): void;
    doGrow(): void;
    doCombine(skillIdA: string, skillIdB: string): import("../types/Skill.js").CombineResult;
    private findEntityNear;
}
export {};
//# sourceMappingURL=GameScene.d.ts.map