// ============================================================
// SKILL DATA
// Absorb & Evolve — Alle Skill-Definitionen
// Quelle: GDD-02-Skillsystem.md
//
// ERWEITERBARKEIT:
//   - Neue Basis-Skills: in BASE_SKILLS eintragen
//   - Neue Pflanzen-Skills: in PLANT_SKILLS eintragen
//   - Neue Kombis: in COMBO_SKILLS + RECIPE_INDEX eintragen
//   - Kern-Fähigkeiten: in CORE_SKILLS (nur Analyze + Absorb)
//
// BALANCING:
//   baseXpThreshold = XP für ersten Level-Up (1→2)
//   xpThresholdMultiplier = 1.5 (jedes Level 50% mehr XP)
// ============================================================

import type { SkillDefinition } from "../types/Skill";

// -----------------------------------------------------------
// KERN-FÄHIGKEITEN
// Analyse & Absorb sind angeboren — immer vorhanden, nie verlierbar.
// Ihr Level bestimmt die Erfolgswahrscheinlichkeit.
// category: "core" — tauchen in discoveredSkills nicht auf (nur Referenz).
// -----------------------------------------------------------
export const CORE_SKILLS: SkillDefinition[] = [
  {
    id: "analyze",
    name: "Analyze",
    element: "none",
    icon: "🔍",
    category: "core",
    activation: "active",
    maxLevel: 20,
    baseXpThreshold: 10,
    xpThresholdMultiplier: 1.5,
    description:
      "Analysiert eine Entität. Entität bleibt erhalten. +1 XP pro entdecktem Skill. " +
      "Fehlschlag: neutrale Wesen bleiben friedlich, feindliche greifen an.",
  },
  {
    id: "absorb",
    name: "Absorb",
    element: "none",
    icon: "💥",
    category: "core",
    activation: "active",
    maxLevel: 20,
    baseXpThreshold: 10,
    xpThresholdMultiplier: 1.5,
    description:
      "Absorbiert eine Entität. Entität verschwindet (respawnt). +3 XP pro entdecktem Skill. " +
      "Liefert auch Materialien. Fehlschlag: neutrale und feindliche Wesen greifen an.",
  },
];

// -----------------------------------------------------------
// BASIS-SKILLS (durch Entitäten entdeckbar)
// category: "basic", können beliebig ergänzt werden
// -----------------------------------------------------------
export const BASE_SKILLS: SkillDefinition[] = [
  {
    id: "fire",
    name: "Fireball",
    element: "fire",
    icon: "🔥",
    category: "basic",
    activation: "active",
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
    activation: "active",
    maxLevel: 10,
    baseXpThreshold: 10,
    xpThresholdMultiplier: 1.5,
    description: "Ein kraftvoller Wasserstrahl, der Feinde verlangsamt.",
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
    activation: "active",
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
    activation: "active",
    maxLevel: 10,
    baseXpThreshold: 10,
    xpThresholdMultiplier: 1.5,
    description: "Ein schneller Windschnitt, der den Slime kurzzeitig beschleunigt.",
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
    activation: "active",
    maxLevel: 10,
    baseXpThreshold: 8, // Leichter zu leveln — häufigste Quelle
    xpThresholdMultiplier: 1.5,
    description: "Bedeckt den Slime mit einer klebrigen Schicht, die Angreifer verlangsamt.",
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
    activation: "active",
    maxLevel: 10,
    baseXpThreshold: 12, // Etwas schwerer — weniger Quellen
    xpThresholdMultiplier: 1.5,
    description: "Spuckt Gift, das über Zeit Schaden verursacht.",
    baseDamage: 4,
    mpCost: 9,
    cooldownMs: 2500,
  },
  {
    id: "dark",
    name: "Shadow Step",
    element: "dark",
    icon: "🌑",
    category: "basic",
    activation: "active",
    maxLevel: 10,
    baseXpThreshold: 20, // Schwer — selten (Dark Wisp)
    xpThresholdMultiplier: 1.5,
    description: "Tritt in den Schatten — Gegner verlieren kurz die Aggro.",
    baseDamage: 20,
    mpCost: 12,
    cooldownMs: 4000,
  },
  {
    id: "light",
    name: "Holy Beam",
    element: "light",
    icon: "✨",
    category: "basic",
    activation: "active",
    maxLevel: 10,
    baseXpThreshold: 20, // Schwer — selten (Light Fairy, kämpft nie)
    xpThresholdMultiplier: 1.5,
    description: "Ein heiliger Lichtstrahl. Light Fairy kämpft nie — nur durch Analyze.",
    baseDamage: 18,
    mpCost: 11,
    cooldownMs: 3500,
  },
];

// -----------------------------------------------------------
// PFLANZEN-SKILLS (von Pflanzen und Mineralien)
// category: "basic" — aber nur durch Pflanzen/Mineralien erreichbar
// Neue Pflanzenskills hier eintragen.
// -----------------------------------------------------------
export const PLANT_SKILLS: SkillDefinition[] = [
  {
    id: "grow",
    name: "Grow",
    element: "nature",
    icon: "🌱",
    category: "basic",
    activation: "active",
    maxLevel: 10,
    baseXpThreshold: 10,
    xpThresholdMultiplier: 1.5,
    description:
      "Verbraucht Pflanzenfasern um zu wachsen. Erhöht MaxHP und Körpergröße dauerhaft. " +
      "Höheres Level = stärkeres Wachstum pro Einsatz.",
    materialCost: [{ materialId: "plant_fiber", amount: 5 }],
  },
  {
    id: "photosynthesis",
    name: "Photosynthesis",
    element: "nature",
    icon: "☀️",
    category: "basic",
    activation: "passive", // Wirkt automatisch, kein manueller Einsatz
    maxLevel: 5,
    baseXpThreshold: 15,
    xpThresholdMultiplier: 1.5,
    description:
      "Passiv: Regeneriert langsam HP, solange der Slime sich nicht kämpfend fortbewegt. " +
      "Wirkt automatisch nach Entdeckung. Höheres Level = stärkere Regeneration.",
  },
];

// -----------------------------------------------------------
// KOMBINATIONS-SKILLS (nur durch Kombinieren freischaltbar)
// category: "combo" — Input: zwei basic-Skills
// -----------------------------------------------------------
export const COMBO_SKILLS: SkillDefinition[] = [
  {
    id: "steam",
    name: "Steam Burst",
    element: "water",
    icon: "♨️",
    category: "combo",
    activation: "active",
    maxLevel: 5,
    baseXpThreshold: 15,
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
    activation: "active",
    maxLevel: 5,
    baseXpThreshold: 15,
    xpThresholdMultiplier: 1.5,
    description: "Ein rotierender Feuersturm, der mehrere Feinde trifft.",
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
    activation: "active",
    maxLevel: 5,
    baseXpThreshold: 15,
    xpThresholdMultiplier: 1.5,
    description: "Giftige Schleimschicht — Angreifer vergiften sich selbst.",
    baseDamage: 6,
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
    activation: "active",
    maxLevel: 5,
    baseXpThreshold: 15,
    xpThresholdMultiplier: 1.5,
    description: "Errichtet eine Schlammwand, die Feinde blockiert und verlangsamt.",
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
    activation: "active",
    maxLevel: 5,
    baseXpThreshold: 20, // Teuerster Combo — benötigt seltenen dark-Skill
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
    activation: "active",
    maxLevel: 5,
    baseXpThreshold: 15,
    xpThresholdMultiplier: 1.5,
    description: "Schleudert Eissplitter, die Feinde einfrieren.",
    baseDamage: 20,
    mpCost: 13,
    cooldownMs: 2500,
    recipe: ["wind", "water"],
  },
];

// -----------------------------------------------------------
// ALLE SKILLS — kombinierte Map für schnellen Zugriff
// Enthält: core + basic + plant + combo
// -----------------------------------------------------------
export const ALL_SKILLS: Map<string, SkillDefinition> = new Map(
  [...CORE_SKILLS, ...BASE_SKILLS, ...PLANT_SKILLS, ...COMBO_SKILLS].map(
    (s) => [s.id, s]
  )
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
