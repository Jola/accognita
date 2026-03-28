// ============================================================
// GAME STATE TYPES
// Absorb & Evolve — Zentraler Spielzustand
// ============================================================
// -----------------------------------------------------------
// Startwerte für Kern-Fähigkeiten
// -----------------------------------------------------------
const CORE_BASE_XP = 10;
const CORE_XP_MULTIPLIER = 1.5;
const CORE_MAX_LEVEL = 20;
function createCoreAbility() {
    return {
        level: 1,
        currentXp: 0,
        xpToNextLevel: CORE_BASE_XP,
        totalXpEarned: 0,
    };
}
export { CORE_BASE_XP, CORE_XP_MULTIPLIER, CORE_MAX_LEVEL };
// -----------------------------------------------------------
// Hilfsfunktion: Neuen leeren GameState erstellen
// -----------------------------------------------------------
export function createInitialGameState() {
    return {
        version: "0.3.0",
        player: {
            x: 400,
            y: 300,
            hp: 80,
            maxHp: 80,
            mp: 40,
            maxMp: 40,
            level: 1,
            totalExp: 0,
            coreAbilities: {
                analyze: createCoreAbility(),
                absorb: createCoreAbility(),
            },
            discoveredSkills: new Map(),
            activeSkillSlots: [null, null, null, null, null],
            materials: new Map(),
            statusEffects: [],
            skillCooldowns: new Map(),
            spawnX: 400,
            spawnY: 300,
            totalAbsorbs: 0,
            totalAbsorbFailures: 0,
            totalAnalyzes: 0,
            totalAnalyzeFailures: 0,
            playtimeSeconds: 0,
        },
        world: {
            entities: new Map(),
            currentZone: "forest_start",
            timeElapsed: 0,
            worldSeed: 20250328,
        },
    };
}
//# sourceMappingURL=GameState.js.map