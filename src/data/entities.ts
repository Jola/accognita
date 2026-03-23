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

import type { EntityDefinition } from "../types/Entity";

export const ENTITY_DEFINITIONS: EntityDefinition[] = [

  // ==========================================================
  // KREATUREN
  // ==========================================================

  // --- SLIMES ---
  {
    id: "red_slime",
    name: "Red Slime",
    icon: "🔴",
    behavior: "defensive",
    disposition: "neutral",   // Greift nur an wenn Absorb fehlschlägt
    category: "creature",
    rarity: "common",
    level: 2,
    skillDrops: [
      { skillId: "fire",  chance: 0.80 },
      { skillId: "slime", chance: 0.90 },
    ],
    materialDrops: [],
    hp: 20, damage: 5, speed: 60,
    respawnTime: 30,
    interactRadius: 40,
    aggroRadius: 80,
  },
  {
    id: "blue_slime",
    name: "Blue Slime",
    icon: "🔵",
    behavior: "defensive",
    disposition: "neutral",
    category: "creature",
    rarity: "common",
    level: 2,
    skillDrops: [
      { skillId: "water", chance: 0.80 },
      { skillId: "slime", chance: 0.90 },
    ],
    materialDrops: [],
    hp: 20, damage: 5, speed: 55,
    respawnTime: 30,
    interactRadius: 40,
    aggroRadius: 80,
  },

  // --- WALDWESEN ---
  {
    id: "goblin",
    name: "Goblin",
    icon: "👺",
    behavior: "aggressive",
    disposition: "hostile",   // Greift immer an bei Fehlschlag
    category: "creature",
    rarity: "common",
    level: 3,
    skillDrops: [
      { skillId: "fire", chance: 0.60 },
    ],
    materialDrops: [],
    hp: 30, damage: 8, speed: 80,
    respawnTime: 45,
    interactRadius: 40,
    aggroRadius: 120,
  },
  {
    id: "forest_wolf",
    name: "Forest Wolf",
    icon: "🐺",
    behavior: "aggressive",
    disposition: "hostile",
    category: "creature",
    rarity: "uncommon",
    level: 4,
    skillDrops: [
      { skillId: "wind", chance: 0.70 },
    ],
    materialDrops: [],
    hp: 50, damage: 15, speed: 120,
    respawnTime: 60,
    interactRadius: 40,
    aggroRadius: 150,
  },
  {
    id: "stone_golem",
    name: "Stone Golem",
    icon: "🗿",
    behavior: "territorial",
    disposition: "hostile",
    category: "creature",
    rarity: "uncommon",
    level: 6,
    skillDrops: [
      { skillId: "earth", chance: 0.75 },
    ],
    materialDrops: [              // Golem hinterlässt Steine
      { materialId: "stone", amountMin: 1, amountMax: 3, chance: 0.80 },
      { materialId: "ore",   amountMin: 1, amountMax: 1, chance: 0.20 },
    ],
    hp: 120, damage: 25, speed: 40,
    respawnTime: 120,
    interactRadius: 60,
    aggroRadius: 100,
  },

  // --- SELTENE WESEN ---
  {
    id: "dark_wisp",
    name: "Dark Wisp",
    icon: "👻",
    behavior: "rare",
    disposition: "hostile",   // Greift immer an
    category: "creature",
    rarity: "rare",
    level: 8,
    skillDrops: [
      { skillId: "dark", chance: 0.50 },
    ],
    materialDrops: [],
    hp: 15, damage: 20, speed: 150,
    respawnTime: 300,
    interactRadius: 60,
    aggroRadius: 60,
  },
  {
    id: "light_fairy",
    name: "Light Fairy",
    icon: "🧚",
    behavior: "rare",
    disposition: "neutral",   // Kämpft NIE — nur Analyze sinnvoll
    category: "creature",
    rarity: "rare",
    level: 5,
    skillDrops: [
      { skillId: "light", chance: 0.60 },
    ],
    materialDrops: [],
    hp: 10, damage: 0, speed: 180,
    respawnTime: 300,
    interactRadius: 80,
  },

  // ==========================================================
  // PFLANZEN
  // Alle Pflanzen: disposition "neutral", category "plant"
  // Fehlschlag: nichts passiert (leblos)
  // Liefern grow (häufig), photosynthesis (selten), Materialien
  // ==========================================================

  {
    id: "vine_plant",
    name: "Vine Plant",
    icon: "🌿",
    behavior: "passive",
    disposition: "neutral",
    category: "plant",
    rarity: "common",
    level: 1,
    skillDrops: [
      { skillId: "earth",        chance: 0.70 },
      { skillId: "poison",       chance: 0.50 },
      { skillId: "grow",         chance: 0.85 }, // Häufig — jede Pflanze
      { skillId: "photosynthesis", chance: 0.10 }, // Selten
    ],
    materialDrops: [
      { materialId: "plant_fiber", amountMin: 1, amountMax: 4, chance: 1.00 },
      { materialId: "wood",        amountMin: 0, amountMax: 2, chance: 0.40 },
      { materialId: "seed",        amountMin: 0, amountMax: 1, chance: 0.20 },
    ],
    respawnTime: 20,
    interactRadius: 50,
  },
  {
    id: "poison_mushroom",
    name: "Poison Mushroom",
    icon: "🍄",
    behavior: "passive",
    disposition: "neutral",
    category: "plant",
    rarity: "common",
    level: 2,
    skillDrops: [
      { skillId: "poison",         chance: 0.80 },
      { skillId: "grow",           chance: 0.70 },
      { skillId: "photosynthesis", chance: 0.08 },
    ],
    materialDrops: [
      { materialId: "spore",       amountMin: 1, amountMax: 3, chance: 1.00 },
      { materialId: "plant_fiber", amountMin: 0, amountMax: 2, chance: 0.50 },
    ],
    respawnTime: 25,
    interactRadius: 40,
  },

  // ==========================================================
  // MINERALIEN
  // Keine Skills außer passive Effekte, nur Materialien
  // ==========================================================

  {
    id: "forest_stone",
    name: "Forest Stone",
    icon: "🪨",
    behavior: "passive",
    disposition: "neutral",
    category: "mineral",
    rarity: "common",
    level: 1,
    skillDrops: [],             // Steine geben keine Skills
    materialDrops: [
      { materialId: "stone", amountMin: 1, amountMax: 3, chance: 1.00 },
      { materialId: "ore",   amountMin: 0, amountMax: 1, chance: 0.10 },
    ],
    respawnTime: 60,
    interactRadius: 40,
  },
];

// Schnellzugriffs-Map
export const ENTITY_MAP: Map<string, EntityDefinition> = new Map(
  ENTITY_DEFINITIONS.map((e) => [e.id, e])
);
