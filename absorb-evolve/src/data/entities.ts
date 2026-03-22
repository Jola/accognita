// ============================================================
// ENTITY DATA
// Absorb & Evolve — Alle Entity-Definitionen
// Quelle: GDD-03-Kampfsystem.md
// ============================================================

import type { EntityDefinition } from "../types/Entity";

export const ENTITY_DEFINITIONS: EntityDefinition[] = [
  // --- SLIMES ---
  {
    id: "red_slime",
    name: "Red Slime",
    icon: "🔴",
    behavior: "defensive",
    rarity: "common",
    skillDrops: ["fire", "slime"],
    hp: 20,
    damage: 5,
    speed: 60,
    respawnTime: 30,
    interactRadius: 40,
    aggroRadius: 80,
  },
  {
    id: "blue_slime",
    name: "Blue Slime",
    icon: "🔵",
    behavior: "defensive",
    rarity: "common",
    skillDrops: ["water", "slime"],
    hp: 20,
    damage: 5,
    speed: 55,
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
    rarity: "common",
    skillDrops: ["fire"],
    hp: 30,
    damage: 8,
    speed: 80,
    respawnTime: 45,
    interactRadius: 40,
    aggroRadius: 120,
  },
  {
    id: "forest_wolf",
    name: "Forest Wolf",
    icon: "🐺",
    behavior: "aggressive",
    rarity: "uncommon",
    skillDrops: ["wind"],
    hp: 50,
    damage: 15,
    speed: 120,
    respawnTime: 60,
    interactRadius: 40,
    aggroRadius: 150,
  },
  {
    id: "stone_golem",
    name: "Stone Golem",
    icon: "🗿",
    behavior: "territorial",
    rarity: "uncommon",
    skillDrops: ["earth"],
    hp: 120,
    damage: 25,
    speed: 40,
    respawnTime: 120,
    interactRadius: 60,
    aggroRadius: 100,
  },

  // --- PFLANZEN & PILZE ---
  {
    id: "vine_plant",
    name: "Vine Plant",
    icon: "🌿",
    behavior: "passive",
    rarity: "common",
    skillDrops: ["earth", "poison"],
    hp: 15,
    damage: 0,
    speed: 0,
    respawnTime: 20,
    interactRadius: 50,
  },
  {
    id: "poison_mushroom",
    name: "Poison Mushroom",
    icon: "🍄",
    behavior: "passive",
    rarity: "common",
    skillDrops: ["poison"],
    hp: 10,
    damage: 0,
    speed: 0,
    respawnTime: 25,
    interactRadius: 40,
  },

  // --- SELTENE ENTITIES ---
  {
    id: "dark_wisp",
    name: "Dark Wisp",
    icon: "🌑",
    behavior: "rare",
    rarity: "rare",
    skillDrops: ["dark"],
    hp: 15,
    damage: 20,
    speed: 150,
    respawnTime: 300,          // 5 Minuten
    interactRadius: 60,
    aggroRadius: 60,
  },
  {
    id: "light_fairy",
    name: "Light Fairy",
    icon: "🧚",
    behavior: "rare",
    rarity: "rare",
    skillDrops: ["light"],
    hp: 10,
    damage: 0,                 // Kämpft NIE (GDD: "Kämpft nie")
    speed: 180,
    respawnTime: 300,
    interactRadius: 80,
  },
];

// -----------------------------------------------------------
// Schnellzugriffs-Map
// -----------------------------------------------------------
export const ENTITY_MAP: Map<string, EntityDefinition> = new Map(
  ENTITY_DEFINITIONS.map((e) => [e.id, e])
);
