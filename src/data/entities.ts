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
//   - skillXp: Erfahrung der Art in ihren Skills { skillId → XP }. Gleiche
//     Skills, gleiche Regeln wie beim Blob: dieselbe Erfahrung ergibt dieselbe
//     Wirkung (Vorgabe Entwickler, GDD-02 Abschnitt 8.6). In den Kommentaren
//     steht der Fortschritt in %, der daraus folgt (progression.ts
//     Abschnitt 1), und die Werte, die sich daraus ergeben.
//     Stand 1. Nov. 2026 (allgemeines Schema): Die XP sind unverändert, die
//     Werte daraus sind bei wenig Erfahrung deutlich niedriger als vorher
//     (Startwerte ≈ 1). Die alten Werte stehen als [VERWORFEN] dabei.
//   - disposition: "neutral" | "hostile" — für Fehlschlag-Reaktion
// ============================================================

import type { EntityDefinition } from "../types/Entity";

export const ENTITY_DEFINITIONS: EntityDefinition[] = [

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
    worldSize: 5,    // Grashalm — etwas größer als ein frischer Blob
  },

  // ==========================================================
  // INSEKTEN — Level 1 (neutral, defensiv)
  // ==========================================================

  {
    id: "ant",
    name: "Ameise",
    icon: "🐜",
    behavior: "defensive",
    disposition: "neutral",   // Greift nur an wenn Absorb fehlschlägt
    category: "creature",
    rarity: "common",
    level: 1,
    skillDrops: [
      { skillId: "bite",          chance: 0.12 }, // Direkter Angriffsbiss
      { skillId: "chitin_armor",  chance: 0.15 }, // Hartes Exoskelett
      { skillId: "superstrength", chance: 0.10 }, // 50x Körpergewicht
    ],
    materialDrops: [],
    hp: 8_000, speed: 15,          // worldSize 3 × 5 = 15
    attackRangePx: 6, attackCooldownMs: 1800, attackType: "melee",  // 2 × worldSize
    respawnTime: 30,
    interactRadius: 35,
    aggroRadius: 8,    // 2.5 × worldSize
    // bite 0 % → 1 Schaden; chitin 0 % → blockt nichts
    //   ([VERWORFEN] bite u=1 → 7 Schaden; chitin u=1 → blockt 3 HP Stich)
    skillXp: { bite: 0, chitin_armor: 0 },
    worldSize: 3,    // Ameise — winziges Insekt, ähnlich groß wie ein frischer Blob
  },
  {
    id: "ladybug",
    name: "Marienkäfer",
    icon: "🐞",
    behavior: "defensive",
    disposition: "neutral",   // Greift nur an wenn Absorb fehlschlägt
    category: "creature",
    rarity: "common",
    level: 1,
    skillDrops: [
      { skillId: "hemolymph", chance: 0.15 }, // Defensivgift bei Treffer
    ],
    materialDrops: [],
    hp: 6_000, speed: 20,          // worldSize 4 × 5 = 20
    attackRangePx: 8, attackCooldownMs: 2000, attackType: "melee",   // 2 × worldSize
    respawnTime: 35,
    interactRadius: 35,
    aggroRadius: 10,   // 2.5 × worldSize
    // Kein bite — Marienkäfer greifen nicht aktiv an.
    // Hemolymph 0 %: 1 Rückschlag-Schaden wenn der Blob ihn trifft ([VERWORFEN] u=1: 2).
    skillXp: { hemolymph: 0 },
    worldSize: 4,    // Marienkäfer — etwas größer als Ameise
  },

  // ==========================================================
  // INSEKTEN — Level 2 (feindlich, angreifend)
  // ==========================================================

  {
    id: "jumping_spider",
    name: "Springspinne",
    icon: "🕷️",
    behavior: "aggressive",
    disposition: "hostile",   // Greift immer an bei Fehlschlag
    category: "creature",
    rarity: "common",
    level: 2,
    skillDrops: [
      { skillId: "bite",         chance: 0.15 }, // Biss-Angriff
      { skillId: "jump",         chance: 0.20 }, // Charakteristischer Sprung
      { skillId: "chitin_armor", chance: 0.10 }, // Exoskelett (stärker als Ameise)
    ],
    materialDrops: [],
    hp: 18_000, speed: 30,         // worldSize 6 × 5 = 30
    attackRangePx: 12, attackCooldownMs: 1200, attackType: "charge", // 2 × worldSize
    respawnTime: 45,
    interactRadius: 40,
    aggroRadius: 15,   // 2.5 × worldSize
    // bite 3 % → 1,4 Schaden; chitin_armor 11 % → blockt 1,4 HP Stich; jump 3 % → Geschick 0,1
    //   ([VERWORFEN] bite u=2 → 8 Schaden; chitin_armor u=3; jump u=2 → Geschick ≈2)
    skillXp: { bite: 6, chitin_armor: 24, jump: 6 },
    worldSize: 6,    // Springspinne — deutlich größer als Ameisen
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
      { skillId: "bite",         chance: 0.15 }, // Biss-Angriff (kombiniert sich mit Venom)
      { skillId: "venom",        chance: 0.20 }, // Giftbiss
      { skillId: "chitin_armor", chance: 0.08 }, // Exoskelett
    ],
    materialDrops: [],
    hp: 15_000, speed: 30,         // worldSize 6 × 5 = 30
    attackRangePx: 12, attackCooldownMs: 1600, attackType: "melee",  // 2 × worldSize
    respawnTime: 50,
    interactRadius: 40,
    aggroRadius: 15,   // 2.5 × worldSize
    // bite 0 % → 1 Schaden; venom 11 % → 8 % Chance auf 4 HP Gift; chitin_armor 11 % → blockt 1,4 HP Stich
    //   ([VERWORFEN] bite u=1 → 7; venom u=3 → 44 % auf 12 HP; chitin u=3 → blockt 7,2 HP Stich)
    skillXp: { bite: 0, venom: 30, chitin_armor: 24 },
    worldSize: 6,    // Giftspinne — ähnlich groß wie Springspinne
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
      { skillId: "venom_sting",  chance: 0.25 }, // Giftstachel (vorher: Venom)
      { skillId: "pincer",       chance: 0.10 }, // Scheren (vorher: Biss)
    ],
    materialDrops: [],
    hp: 30_000, speed: 35,         // worldSize 7 × 5 = 35
    attackRangePx: 14, attackCooldownMs: 1400, attackType: "melee",  // 2 × worldSize
    respawnTime: 60,
    interactRadius: 45,
    aggroRadius: 18,            // 2.5 × worldSize
    // pincer 37 % → 6,5 Wucht; chitin 37 % → blockt 4,7 HP Stich;
    // venom_sting 23 % → 3,3 Stich + 23 % Chance auf 8 HP Gift
    //   ([VERWORFEN] pincer u=5 → 11; chitin u=5 → 9; venom_sting u=4 → 7 + 89 % auf 18 HP)
    // Vorgabe (Entwickler, 1. Nov. 2026): Skorpione etwas schwächer
    //   ([VERWORFEN] pincer u=6 → 12, Giftdosis 24)
    skillXp: { pincer: 96, chitin_armor: 96, venom_sting: 81 },
    // Vorgabe (Entwickler): Der Stachel kommt nur gelegentlich zum Einsatz,
    //   sonst greifen Skorpione mit den Scheren an.
    // Begründung (Vorschlag Claude): Gift kostet viel Energie und braucht Tage
    //   zum Nachbilden (Gift-Ökonomie) — Skorpione packen meist mit den Scheren
    //   und stechen nur, wenn es sich lohnt. 15 % der Angriffe ≈ alle 9 s. VORLÄUFIG
    occasionalAttack: { skillId: "venom_sting", chance: 0.15 },
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
      { skillId: "venom_sting",  chance: 0.30 }, // Starker Giftstachel (vorher: Venom)
      { skillId: "pincer",       chance: 0.15 }, // Scheren (vorher: Biss)
    ],
    materialDrops: [],
    hp: 55_000, speed: 50,         // worldSize 10 × 5 = 50
    attackRangePx: 20, attackCooldownMs: 1600, attackType: "melee",  // 2 × worldSize
    respawnTime: 120,
    interactRadius: 55,
    aggroRadius: 25,            // 2.5 × worldSize
    // pincer 98 % → 15,8 Wucht; chitin 75 % → blockt 9,8 HP Stich;
    // venom_sting 64 % → 7,4 Stich + 64 % Chance auf 21 HP Gift
    //   ([VERWORFEN] pincer u=13 → 16; chitin u=8 → 10,9; venom_sting u=7 → 9 + 92 % auf 24 HP)
    // Vorgabe (Entwickler, 1. Nov. 2026): Skorpione etwas schwächer
    //   ([VERWORFEN] pincer u=18 → 20, Giftdosis 33)
    skillXp: { pincer: 864, chitin_armor: 294, venom_sting: 324 },
    // Stachel nur gelegentlich — Begründung beim kleinen Skorpion. VORLÄUFIG
    occasionalAttack: { skillId: "venom_sting", chance: 0.15 },
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
      { skillId: "claw",        chance: 0.30 },
      { skillId: "bite",        chance: 0.10 },
    ],
    materialDrops: [],
    hp: 500_000, speed: 35,        // worldSize 20 × 5 = 100 → langsamer, aber massiv
    attackRangePx: 40, attackCooldownMs: 1800, attackType: "melee",   // 2 × worldSize
    // Feueratem: Fernkampf über 8 × worldSize = 160px Distanz
    rangedAttackSkillId: "fire_breath",
    rangedAttackRangePx: 160,        // 8 × worldSize
    rangedAttackCooldownMs: 2500,
    respawnTime: 600,                // 10 Minuten — sehr seltener Spawn
    interactRadius: 80,
    aggroRadius: 50,                 // 2.5 × worldSize
    // claw ≈ 100 % → 18 Nahkampf-Schaden (Höchstwert)
    // fire_breath ≈ 100 % → 23 Fernkampf-Schaden (Höchstwert)
    //   ([VERWORFEN] u=20 → 24 bzw. 31 — der alte Übungsgrad wuchs unbegrenzt)
    skillXp: { claw: 2707.5, fire_breath: 4512.5 },
    worldSize: 20,                   // Deutlich größer als alle anderen Gegner
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
      { skillId: "bite",  chance: 0.30 }, // Giftzahn-Biss
      { skillId: "venom", chance: 0.30 }, // Starkes Schlangengift
    ],
    materialDrops: [],
    hp: 120_000, speed: 60,        // worldSize 12 × 5 = 60
    attackRangePx: 24, attackCooldownMs: 1200, attackType: "melee", // 2 × worldSize
    respawnTime: 180,               // 3 Minuten — seltener Gegner
    interactRadius: 60,
    aggroRadius: 30,                // 2.5 × worldSize
    // bite 90 % (Natur) → 14,5 Schaden; venom 51 % → 35 % Chance auf 15 HP Gift
    //   ([VERWORFEN] bite u=10 → 14; venom u=6 → 52 % auf 18 HP)
    // Vorgabe (Entwickler, 1. Nov. 2026): Schlangen beißen etwas weniger fest,
    //   ihr Gift war viel zu stark ([VERWORFEN] bite u=15 → 18 HP, venom u=15
    //   → 67 % auf 36 HP: alle 1,2 s gebissen ≈ 20 HP/s Gift im Dauerzustand).
    //   Jetzt ≈ 8 HP/s Gift im Dauerzustand. VORLÄUFIG
    skillXp: { bite: 486, venom: 187.5 },
    worldSize: 12,
  },
];

// Schnellzugriffs-Map
export const ENTITY_MAP: Map<string, EntityDefinition> = new Map(
  ENTITY_DEFINITIONS.map((e) => [e.id, e])
);
