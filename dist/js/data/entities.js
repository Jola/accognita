// ============================================================
// ENTITY DATA
// Absorb & Evolve — Alle Entity-Definitionen
// Quelle: GDD-02-Skillsystem.md, GDD-03-Kampfsystem.md
//
// ERWEITERBARKEIT:
//   - Neue Entities: hier eintragen, dann in GameScene platzieren
//   - skillDrops: Array von { skillId, chance } — chance 0.0–1.0
//   - materialDrops: Array von { materialId, amountMin, amountMax, chance }
//   - level: bestimmt Schwierigkeit von Absorb/Analyze
//   - disposition: "neutral" | "hostile" — für Fehlschlag-Reaktion
// ============================================================
export const ENTITY_DEFINITIONS = [
    // ==========================================================
    // PFLANZEN
    // disposition: "neutral", category: "plant"
    // Fehlschlag: nichts passiert (leblos)
    // ==========================================================
    {
        id: "grass",
        name: "Gras",
        icon: "🌿",
        behavior: "passive",
        disposition: "neutral",
        category: "plant",
        rarity: "common",
        level: 1,
        skillDrops: [
            { skillId: "photosynthesis", chance: 0.12 }, // Selten — besonderer Fund
        ],
        materialDrops: [
            { materialId: "plant_fiber", amountMin: 1, amountMax: 3, chance: 1.00 },
        ],
        respawnTime: 60, // 1 Minute — wächst nach
        interactRadius: 50,
    },
    // ==========================================================
    // INSEKTEN — Level 1 (neutral, defensiv)
    // ==========================================================
    {
        id: "ant",
        name: "Ameise",
        icon: "🐜",
        behavior: "defensive",
        disposition: "neutral", // Greift nur an wenn Absorb fehlschlägt
        category: "creature",
        rarity: "common",
        level: 1,
        skillDrops: [
            { skillId: "chitin_armor", chance: 0.15 }, // Hartes Exoskelett
            { skillId: "superstrength", chance: 0.10 }, // 50x Körpergewicht
        ],
        materialDrops: [],
        hp: 8, damage: 3, speed: 60,
        attackRangePx: 40, attackCooldownMs: 1800, attackType: "melee",
        respawnTime: 30,
        interactRadius: 35,
        aggroRadius: 60,
    },
    {
        id: "ladybug",
        name: "Marienkäfer",
        icon: "🐞",
        behavior: "defensive",
        disposition: "neutral", // Greift nur an wenn Absorb fehlschlägt
        category: "creature",
        rarity: "common",
        level: 1,
        skillDrops: [
            { skillId: "hemolymph", chance: 0.15 }, // Defensivgift bei Treffer
        ],
        materialDrops: [],
        hp: 6, damage: 2, speed: 50,
        attackRangePx: 38, attackCooldownMs: 2000, attackType: "melee",
        respawnTime: 35,
        interactRadius: 35,
        aggroRadius: 50,
    },
    // ==========================================================
    // INSEKTEN — Level 2 (feindlich, angreifend)
    // ==========================================================
    {
        id: "jumping_spider",
        name: "Springspinne",
        icon: "🕷️",
        behavior: "aggressive",
        disposition: "hostile", // Greift immer an bei Fehlschlag
        category: "creature",
        rarity: "common",
        level: 2,
        skillDrops: [
            { skillId: "jump", chance: 0.20 }, // Charakteristischer Sprung
            { skillId: "chitin_armor", chance: 0.10 }, // Exoskelett (stärker als Ameise)
        ],
        materialDrops: [],
        hp: 18, damage: 8, speed: 100,
        attackRangePx: 55, attackCooldownMs: 1200, attackType: "charge",
        respawnTime: 45,
        interactRadius: 40,
        aggroRadius: 100,
    },
    {
        id: "poison_spider",
        name: "Giftspinne",
        icon: "🕸️",
        behavior: "aggressive",
        disposition: "hostile",
        category: "creature",
        rarity: "uncommon",
        level: 2,
        skillDrops: [
            { skillId: "venom", chance: 0.20 }, // Giftbiss
            { skillId: "chitin_armor", chance: 0.08 }, // Exoskelett
        ],
        materialDrops: [],
        hp: 15, damage: 6, speed: 80,
        attackRangePx: 50, attackCooldownMs: 1600, attackType: "melee",
        respawnTime: 50,
        interactRadius: 40,
        aggroRadius: 90,
    },
];
// Schnellzugriffs-Map
export const ENTITY_MAP = new Map(ENTITY_DEFINITIONS.map((e) => [e.id, e]));
//# sourceMappingURL=entities.js.map