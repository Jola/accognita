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
    id: "infinite_storage",
    name: "Infinite Storage",
    element: "none",
    icon: "♾️",
    category: "core",
    activation: "passive",
    maxLevel: 1,             // Immer auf Level 1 — keine Steigerung
    baseXpThreshold: 999999, // Nie steigerbar
    xpThresholdMultiplier: 1.0,
    description:
      "Der Slime-Körper ist ein dimensionales Lager ohne Kapazitätsgrenze. " +
      "Alle gesammelten Materialien werden unbegrenzt gespeichert. " +
      "Mengen bis Number.MAX_SAFE_INTEGER (~9 Quadrillionen) werden unterstützt.",
  },
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

  // --- INSEKTEN-SKILLS ---

  {
    id: "chitin_armor",
    name: "Chitin Armor",
    element: "earth",
    icon: "🛡️",
    category: "basic",
    activation: "passive",
    maxLevel: 0,
    baseXpThreshold: 12,
    xpThresholdMultiplier: 1.5,
    description:
      "Passiv: Zieht eine harte Chitinschicht über die Außenhaut. " +
      "Reduziert eingehenden physischen Schaden. Höheres Level = stärkere Schutzwirkung. " +
      "Quelle: Ameisen (Lv1) und Spinnen (Lv2).",
  },
  {
    id: "superstrength",
    name: "Superstrength",
    element: "none",
    icon: "💪",
    category: "basic",
    activation: "passive",
    maxLevel: 0,
    baseXpThreshold: 15,
    xpThresholdMultiplier: 1.5,
    description:
      "Passiv: Ameisen tragen das 50-fache ihres Körpergewichts — der Slime übernimmt diese Stärke. " +
      "Materialien werden in größerer Menge absorbiert. Höheres Level = höherer Mengenbonus.",
  },
  {
    id: "venom",
    name: "Venom",
    element: "poison",
    icon: "🕷️",
    category: "basic",
    activation: "passive",
    maxLevel: 0,
    baseXpThreshold: 15,
    xpThresholdMultiplier: 1.5,
    description:
      "Passiv: Jeder Treffer des Slimes hat eine Chance, dem Ziel Gift zu injizieren. " +
      "Gift verursacht Schaden über Zeit. Höheres Level = höhere Vergiftungschance und stärkeres Gift.",
  },
  {
    id: "jump",
    name: "Jump",
    element: "none",
    icon: "🦘",
    category: "basic",
    activation: "active",
    maxLevel: 0,
    baseXpThreshold: 12,
    xpThresholdMultiplier: 1.5,
    description:
      "Schaltet die Fähigkeit zu Springen frei. Ohne diesen Skill kann der Slime nicht springen. " +
      "Höheres Level = größere Sprunghöhe und -weite.",
    mpCost: 4,
    cooldownMs: 800,
  },
  {
    id: "hemolymph",
    name: "Hemolymph",
    element: "poison",
    icon: "🐞",
    category: "basic",
    activation: "passive",
    maxLevel: 0,
    baseXpThreshold: 12,
    xpThresholdMultiplier: 1.5,
    description:
      "Passiv: Wird der Slime getroffen, gibt er bitteres Hämolymph ab — " +
      "der Angreifer erleidet sofort Giftschaden. Höheres Level = stärkerer Rückschlag.",
  },
];

// -----------------------------------------------------------
// PFLANZEN-SKILLS (von Pflanzen und Mineralien)
// category: "basic" — aber nur durch Pflanzen/Mineralien erreichbar
// Neue Pflanzenskills hier eintragen.
// -----------------------------------------------------------
export const PLANT_SKILLS: SkillDefinition[] = [
  {
    id: "photosynthesis",
    name: "Photosynthesis",
    element: "nature",
    icon: "☀️",
    category: "basic",
    activation: "passive", // Wirkt automatisch, kein manueller Einsatz
    maxLevel: 0,
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
// Rezepte werden hier definiert, sobald Kombos entworfen sind.
// -----------------------------------------------------------
export const COMBO_SKILLS: SkillDefinition[] = [
  // Noch keine Kombinations-Skills definiert.
  // Mechanismus ist vorhanden — Rezepte hier eintragen.
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
