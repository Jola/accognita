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
        worldSize: 5, // Grashalm — etwas größer als der Blob auf Level 1
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
            { skillId: "bite", chance: 0.12 }, // Direkter Angriffsbiss
            { skillId: "chitin_armor", chance: 0.15 }, // Hartes Exoskelett
            { skillId: "superstrength", chance: 0.10 }, // 50x Körpergewicht
        ],
        materialDrops: [],
        hp: 8, speed: 15, // worldSize 3 × 5 = 15
        attackRangePx: 6, attackCooldownMs: 1800, attackType: "melee", // 2 × worldSize
        respawnTime: 30,
        interactRadius: 35,
        aggroRadius: 8, // 2.5 × worldSize
        skillLevels: { bite: 1, chitin_armor: 1 }, // bite Lv1 → 7 Schaden; chitin → 10% DR
        worldSize: 3, // Ameise — winziges Insekt, ähnlich groß wie Level-1-Blob
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
        hp: 6, speed: 20, // worldSize 4 × 5 = 20
        attackRangePx: 8, attackCooldownMs: 2000, attackType: "melee", // 2 × worldSize
        respawnTime: 35,
        interactRadius: 35,
        aggroRadius: 10, // 2.5 × worldSize
        // Kein bite — Marienkäfer greifen nicht aktiv an.
        // Hemolymph Lv1: 2 Rückschlag-Schaden wenn der Blob ihn trifft.
        skillLevels: { hemolymph: 1 },
        worldSize: 4, // Marienkäfer — etwas größer als Ameise
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
            { skillId: "bite", chance: 0.15 }, // Biss-Angriff
            { skillId: "jump", chance: 0.20 }, // Charakteristischer Sprung
            { skillId: "chitin_armor", chance: 0.10 }, // Exoskelett (stärker als Ameise)
        ],
        materialDrops: [],
        hp: 18, speed: 30, // worldSize 6 × 5 = 30
        attackRangePx: 12, attackCooldownMs: 1200, attackType: "charge", // 2 × worldSize
        respawnTime: 45,
        interactRadius: 40,
        aggroRadius: 15, // 2.5 × worldSize
        // bite Lv2 → 7 × 1.1 ≈ 8 Schaden; chitin_armor Lv3 → 20% DR
        skillLevels: { bite: 2, chitin_armor: 3 },
        worldSize: 6, // Springspinne — deutlich größer als Ameisen
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
            { skillId: "bite", chance: 0.15 }, // Biss-Angriff (kombiniert sich mit Venom)
            { skillId: "venom", chance: 0.20 }, // Giftbiss
            { skillId: "chitin_armor", chance: 0.08 }, // Exoskelett
        ],
        materialDrops: [],
        hp: 15, speed: 30, // worldSize 6 × 5 = 30
        attackRangePx: 12, attackCooldownMs: 1600, attackType: "melee", // 2 × worldSize
        respawnTime: 50,
        interactRadius: 40,
        aggroRadius: 15, // 2.5 × worldSize
        // bite Lv1 → 7 Schaden; venom Lv3 → 40% Chance, 3/Tick; chitin_armor Lv3 → 20% DR
        skillLevels: { bite: 1, venom: 3, chitin_armor: 3 },
        worldSize: 6, // Giftspinne — ähnlich groß wie Springspinne
    },
    // ==========================================================
    // SKORPIONE — Level 3 & 4 (feindlich, gepanzert, giftig)
    // ==========================================================
    {
        id: "small_scorpion",
        name: "Kleiner Skorpion",
        icon: "🦂",
        behavior: "aggressive",
        disposition: "hostile",
        category: "creature",
        rarity: "uncommon",
        level: 3,
        skillDrops: [
            { skillId: "chitin_armor", chance: 0.25 }, // Skorpion-Panzer
            { skillId: "venom", chance: 0.25 }, // Stachel-Gift
            { skillId: "bite", chance: 0.10 },
        ],
        materialDrops: [],
        hp: 30, speed: 35, // worldSize 7 × 5 = 35
        attackRangePx: 14, attackCooldownMs: 1400, attackType: "melee", // 2 × worldSize
        respawnTime: 60,
        interactRadius: 45,
        aggroRadius: 18, // 2.5 × worldSize
        // bite Lv6 → 7×1.65 ≈ 12 Schaden; chitin Lv5 → 30% DR; venom Lv5 → 50%/4Tick
        skillLevels: { bite: 6, chitin_armor: 5, venom: 5 },
        worldSize: 7,
    },
    {
        id: "large_scorpion",
        name: "Großer Skorpion",
        icon: "🦂",
        behavior: "aggressive",
        disposition: "hostile",
        category: "creature",
        rarity: "rare",
        level: 4,
        skillDrops: [
            { skillId: "chitin_armor", chance: 0.30 }, // Massiver Panzer
            { skillId: "venom", chance: 0.30 }, // Starkes Gift
            { skillId: "bite", chance: 0.15 },
        ],
        materialDrops: [],
        hp: 55, speed: 50, // worldSize 10 × 5 = 50
        attackRangePx: 20, attackCooldownMs: 1600, attackType: "melee", // 2 × worldSize
        respawnTime: 120,
        interactRadius: 55,
        aggroRadius: 25, // 2.5 × worldSize
        // bite Lv18 → 7×2.85 ≈ 20 Schaden; chitin Lv8 → 45% DR; venom Lv8 → 65%/5Tick
        skillLevels: { bite: 18, chitin_armor: 8, venom: 8 },
        worldSize: 10,
    },
    // ==========================================================
    // DRACHE — Level 20 (legendär, Dungeon-Boss)
    // ==========================================================
    {
        id: "dragon",
        name: "Drache",
        icon: "🐉",
        behavior: "aggressive",
        disposition: "hostile",
        category: "creature",
        rarity: "legendary",
        level: 20,
        skillDrops: [
            { skillId: "fire_breath", chance: 0.40 }, // Seltener und wertvoller Drop
            { skillId: "claw", chance: 0.30 },
            { skillId: "bite", chance: 0.10 },
        ],
        materialDrops: [],
        hp: 500, speed: 35, // worldSize 20 × 5 = 100 → langsamer, aber massiv
        attackRangePx: 40, attackCooldownMs: 1800, attackType: "melee", // 2 × worldSize
        // Feueratem: Fernkampf über 8 × worldSize = 160px Distanz
        rangedAttackSkillId: "fire_breath",
        rangedAttackRangePx: 160, // 8 × worldSize
        rangedAttackCooldownMs: 2500,
        respawnTime: 600, // 10 Minuten — sehr seltener Spawn
        interactRadius: 80,
        aggroRadius: 50, // 2.5 × worldSize
        // claw Lv20 → 8×3.05 ≈ 24 Nahkampf-Schaden
        // fire_breath Lv20 → 10×3.05 ≈ 31 Fernkampf-Schaden
        skillLevels: { claw: 20, fire_breath: 20 },
        worldSize: 20, // Deutlich größer als alle anderen Gegner
    },
    // ==========================================================
    // SCHLANGE — Level 10 (feindlich, giftig, schnell)
    // ==========================================================
    {
        id: "snake",
        name: "Schlange",
        icon: "🐍",
        behavior: "aggressive",
        disposition: "hostile",
        category: "creature",
        rarity: "rare",
        level: 10,
        skillDrops: [
            { skillId: "bite", chance: 0.30 }, // Giftzahn-Biss
            { skillId: "venom", chance: 0.30 }, // Starkes Schlangengift
        ],
        materialDrops: [],
        hp: 120, speed: 60, // worldSize 12 × 5 = 60
        attackRangePx: 24, attackCooldownMs: 1200, attackType: "melee", // 2 × worldSize
        respawnTime: 180, // 3 Minuten — seltener Gegner
        interactRadius: 60,
        aggroRadius: 30, // 2.5 × worldSize
        // bite Lv15 → 7×2.55 ≈ 18 Schaden; venom Lv15 → 100% Chance, 9/Tick
        skillLevels: { bite: 15, venom: 15 },
        worldSize: 12,
    },
];
// Schnellzugriffs-Map
export const ENTITY_MAP = new Map(ENTITY_DEFINITIONS.map((e) => [e.id, e]));
//# sourceMappingURL=entities.js.map