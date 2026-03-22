// ============================================================
// SKILL DATA
// Absorb & Evolve — Alle Skill-Definitionen
// Quelle: GDD-02-Skillsystem.md
//
// BALANCING-HINWEISE:
//   baseXpThreshold = XP für ersten Level-Up (1→2)
//   xpThresholdMultiplier = 1.5 laut GDD (jedes Level 50% mehr)
//   Beispiel fire: 10 → 15 → 22 → 33 → 49 → 73 → 109 → 163 → 244
// ============================================================

import type { SkillDefinition } from "../types/Skill";

// -----------------------------------------------------------
// BASIS-SKILLS (durch Entitites entdeckbar)
// -----------------------------------------------------------
export const BASE_SKILLS: SkillDefinition[] = [
  {
    id: "fire",
    name: "Fireball",
    element: "fire",
    icon: "🔥",
    category: "basic",
    maxLevel: 10,
    baseXpThreshold: 10,
    xpThresholdMultiplier: 1.5,
    description: "Schleudert einen Feuerball auf den Feind.",
    baseDamage: 15,
    mpCost: 8,
    cooldownMs: 1500,
  },
  {
    id: "water",
    name: "Water Jet",
    element: "water",
    icon: "💧",
    category: "basic",
    maxLevel: 10,
    baseXpThreshold: 10,
    xpThresholdMultiplier: 1.5,
    description: "Ein kraftvoller Wasserstrahl der Feinde verlangsamt.",
    baseDamage: 10,
    mpCost: 6,
    cooldownMs: 1200,
  },
  {
    id: "earth",
    name: "Stone Skin",
    element: "earth",
    icon: "🪨",
    category: "basic",
    maxLevel: 10,
    baseXpThreshold: 10,
    xpThresholdMultiplier: 1.5,
    description: "Verhärtet die Oberfläche des Slimes und erhöht die Verteidigung.",
    baseDamage: 0,
    mpCost: 5,
    cooldownMs: 3000,
  },
  {
    id: "wind",
    name: "Wind Slash",
    element: "wind",
    icon: "💨",
    category: "basic",
    maxLevel: 10,
    baseXpThreshold: 10,
    xpThresholdMultiplier: 1.5,
    description: "Ein schneller Windschnitt der den Slime kurzzeitig beschleunigt.",
    baseDamage: 12,
    mpCost: 7,
    cooldownMs: 1000,
  },
  {
    id: "slime",
    name: "Slime Coat",
    element: "slime",
    icon: "🫧",
    category: "basic",
    maxLevel: 10,
    baseXpThreshold: 8,       // Leichter zu leveln — häufigste Quelle
    xpThresholdMultiplier: 1.5,
    description: "Bedeckt den Slime mit einer klebrigen Schicht die Angreifer verlangsamt.",
    baseDamage: 5,
    mpCost: 4,
    cooldownMs: 2000,
  },
  {
    id: "poison",
    name: "Toxic Spit",
    element: "poison",
    icon: "☠️",
    category: "basic",
    maxLevel: 10,
    baseXpThreshold: 12,      // Etwas schwerer — weniger Quellen
    xpThresholdMultiplier: 1.5,
    description: "Spuckt Gift das über Zeit Schaden verursacht.",
    baseDamage: 4,             // DoT: 4/s für 5 Sekunden laut GDD
    mpCost: 9,
    cooldownMs: 2500,
  },
  {
    id: "dark",
    name: "Shadow Step",
    element: "dark",
    icon: "🌑",
    category: "basic",
    maxLevel: 10,
    baseXpThreshold: 20,      // Schwer zu leveln — selten (Dark Wisp)
    xpThresholdMultiplier: 1.5,
    description: "Tritt in den Schatten — Gegner verlieren kurz die Aggro.",
    baseDamage: 20,            // Hoher Schaden laut GDD (Dark Wisp: 20 dmg)
    mpCost: 12,
    cooldownMs: 4000,
  },
  {
    id: "light",
    name: "Holy Beam",
    element: "light",
    icon: "✨",
    category: "basic",
    maxLevel: 10,
    baseXpThreshold: 20,      // Schwer zu leveln — selten (Light Fairy)
    xpThresholdMultiplier: 1.5,
    description: "Ein heiliger Lichtstrahl. Light Fairy kämpft nie — nur durch Analyze.",
    baseDamage: 18,
    mpCost: 11,
    cooldownMs: 3500,
  },
];

// -----------------------------------------------------------
// COMBO-SKILLS (nur durch Kombinieren freischaltbar)
// -----------------------------------------------------------
export const COMBO_SKILLS: SkillDefinition[] = [
  {
    id: "steam",
    name: "Steam Burst",
    element: "water",
    icon: "♨️",
    category: "combo",
    maxLevel: 5,
    baseXpThreshold: 15,      // Höher als Basis — Combos sind mächtiger
    xpThresholdMultiplier: 1.5,
    description: "Explosiver Dampfausbruch aus Feuer und Wasser.",
    baseDamage: 22,
    mpCost: 14,
    cooldownMs: 2000,
    recipe: ["fire", "water"],
  },
  {
    id: "firestorm",
    name: "Firestorm",
    element: "fire",
    icon: "🌪️",
    category: "combo",
    maxLevel: 5,
    baseXpThreshold: 15,
    xpThresholdMultiplier: 1.5,
    description: "Ein rotierender Feuersturm der mehrere Feinde trifft.",
    baseDamage: 25,
    mpCost: 16,
    cooldownMs: 3000,
    recipe: ["fire", "wind"],
  },
  {
    id: "toxiccoat",
    name: "Toxic Coat",
    element: "poison",
    icon: "🟣",
    category: "combo",
    maxLevel: 5,
    baseXpThreshold: 15,
    xpThresholdMultiplier: 1.5,
    description: "Giftige Schleimschicht — Angreifer vergiften sich selbst.",
    baseDamage: 6,             // DoT-fokussiert
    mpCost: 13,
    cooldownMs: 4000,
    recipe: ["poison", "slime"],
  },
  {
    id: "mudwall",
    name: "Mud Wall",
    element: "earth",
    icon: "🟫",
    category: "combo",
    maxLevel: 5,
    baseXpThreshold: 15,
    xpThresholdMultiplier: 1.5,
    description: "Errichtet eine Schlammwand die Feinde blockiert und verlangsamt.",
    baseDamage: 8,
    mpCost: 15,
    cooldownMs: 5000,
    recipe: ["earth", "water"],
  },
  {
    id: "shadowform",
    name: "Shadow Form",
    element: "dark",
    icon: "👤",
    category: "combo",
    maxLevel: 5,
    baseXpThreshold: 20,      // Teuerster Combo — benötigt seltenen dark-Skill
    xpThresholdMultiplier: 1.5,
    description: "Der Slime wird für kurze Zeit unsichtbar und schneller.",
    baseDamage: 0,
    mpCost: 18,
    cooldownMs: 6000,
    recipe: ["dark", "slime"],
  },
  {
    id: "iceshard",
    name: "Ice Shard",
    element: "wind",
    icon: "🧊",
    category: "combo",
    maxLevel: 5,
    baseXpThreshold: 15,
    xpThresholdMultiplier: 1.5,
    description: "Schleudert Eissplitter die Feinde einfrieren.",
    baseDamage: 20,
    mpCost: 13,
    cooldownMs: 2500,
    recipe: ["wind", "water"],
  },
];

// -----------------------------------------------------------
// ALLE SKILLS — kombinierte Map für schnellen Zugriff
// -----------------------------------------------------------
export const ALL_SKILLS: Map<string, SkillDefinition> = new Map(
  [...BASE_SKILLS, ...COMBO_SKILLS].map((s) => [s.id, s])
);

// -----------------------------------------------------------
// REZEPT-INDEX — für schnelle Kombinationssuche
// Key: "idA+idB" (alphabetisch sortiert für Konsistenz)
// -----------------------------------------------------------
export const RECIPE_INDEX: Map<string, string> = new Map();
for (const skill of COMBO_SKILLS) {
  if (skill.recipe) {
    const [a, b] = [...skill.recipe].sort();
    RECIPE_INDEX.set(`${a}+${b}`, skill.id);
  }
}
