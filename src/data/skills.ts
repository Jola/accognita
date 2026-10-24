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
      "Der Blob-Körper ist ein dimensionales Lager ohne Kapazitätsgrenze. " +
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
      "Schützt gegen Stiche und Schnitte (Flat-Block), dämpft Wucht (%-Reduktion), " +
      "ist aber anfällig für Feuer und Säure. Quelle: Ameisen (Lv1) und Spinnen (Lv2).",
    effects: [
      {
        trigger: "on_receive_damage",
        condition: { damageType: "pierce" },
        effectType: "flat_block",
        formula: { base: 3, perLevel: 3, curve: "sqrt" },
        reasoning:
          "Chitin ist hart und spröde — Stiche stoppen an der Oberfläche. " +
          "Sqrt-Kurve: frühe Level sehr effektiv, höhere Level Diminishing Returns.",
      },
      {
        trigger: "on_receive_damage",
        condition: { damageType: "slash" },
        effectType: "flat_block",
        formula: { base: 2, perLevel: 2, curve: "sqrt" },
        reasoning:
          "Klingen können entlang der Plattenränder eindringen — weniger Schutz als gegen Stiche.",
      },
      {
        trigger: "on_receive_damage",
        condition: { damageType: "blunt" },
        effectType: "percent_reduce",
        formula: { base: 0.03, perLevel: 0.03 },
        reasoning:
          "Erschütterung wird durch das starre Chitin weitergeleitet. " +
          "Dämpfung ist gering — Chitin ist kein Stoßdämpfer.",
      },
      {
        trigger: "on_receive_damage",
        condition: { damageType: "fire" },
        effectType: "weakness",
        formula: { base: 1.3, perLevel: 0 },
        reasoning:
          "Chitin ist organisch und brennt leicht. Kein Level-Scaling — " +
          "diese Schwäche ist eine inhärente Materialeigenschaft.",
      },
      {
        trigger: "on_receive_damage",
        condition: { damageType: "acid" },
        effectType: "weakness",
        formula: { base: 1.5, perLevel: 0 },
        reasoning: "Säure zersetzt Chitin chemisch. Kritische Schwachstelle.",
      },
    ],
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
      "Passiv: Ameisen tragen das 50-fache ihres Körpergewichts — der Blob übernimmt diese Stärke. " +
      "Verstärkt den Nahkampf-Angriff des Blobs. Lv1: +30%, +5% pro Level.",
    effects: [
      {
        trigger: "on_hit_enemy",
        effectType: "damage_mult",
        formula: { base: 1.30, perLevel: 0.05 },
        reasoning:
          "Ameisen tragen das 50-fache ihres Körpergewichts. " +
          "Lineare Skalierung: Lv1 = 1.30×, Lv5 = 1.50×, Lv10 = 1.75×.",
      },
    ],
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
      "Passiv: Jeder Nahkampftreffer des Blobs hat eine Chance, dem Ziel Gift zu injizieren. " +
      "Lv1: 30% Chance, 2 Schaden/s für 4s. Chance steigt mit dem Level immer langsamer (Lv5: 50%, Lv10: 60%), höchstens 100%. +0.5 Schaden/s pro Level.",
    effects: [
      {
        trigger: "on_hit_enemy",
        effectType: "apply_status",
        formula: { base: 0.30, perLevel: 0.10, curve: "sqrt", max: 1.0 },
        reasoning:
          "Giftdrüsen injizieren Gift bei Treffer. Sqrt-Kurve: Chance steigt anfangs schnell, " +
          "dann immer langsamer (Lv5 50%, Lv10 60%, Lv20 74%); bei 100% gedeckelt (ab Lv50).",
        statusConfig: {
          type: "dot",
          durationMs: 4000,
          tickIntervalMs: 1000,
          damageFormula: { base: 2, perLevel: 0.5 },
        },
      },
    ],
  },
  {
    id: "bite",
    name: "Biss",
    element: "none",
    icon: "🦷",
    category: "basic",
    activation: "active",
    maxLevel: 0,
    baseXpThreshold: 12,
    xpThresholdMultiplier: 1.5,
    description:
      "Aktiv: Gezielter Biss — verursacht direkten Stich-Schaden (7 HP Basis). " +
      "Ist Venom bekannt, hat jeder Biss zusätzliche Chance das Ziel zu vergiften. " +
      "Höheres Level = stärkerer Biss. MP-Kosten: 3.",
    mpCost: 3_000,
    cooldownMs: 1200,
    attackType: "melee",
    baseDamage: 7_000,
    damageType: "pierce",
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
      "Aktiv: Springt 160px in Bewegungsrichtung — überwindet Hindernisse und erzeugt Distanz. " +
      "Höheres Level = größere Sprungweite. MP-Kosten: 4.",
    mpCost: 4_000,
    cooldownMs: 1800,
    attackType: "dash",
  },
  {
    id: "claw",
    name: "Klauenhieb",
    element: "none",
    icon: "🦅",
    category: "basic",
    activation: "active",
    maxLevel: 0,
    baseXpThreshold: 15,
    xpThresholdMultiplier: 1.5,
    description:
      "Aktiv: Ein mächtiger Nahkampfhieb mit scharfen Klauen (8 HP Basis-Schaden, Schnitt). " +
      "Höheres Level = stärkerer Hieb. MP-Kosten: 5.",
    mpCost: 5_000,
    cooldownMs: 1500,
    attackType: "melee",
    baseDamage: 8_000,
    damageType: "slash",
  },
  {
    id: "fire_breath",
    name: "Feueratem",
    element: "fire",
    icon: "🔥",
    category: "basic",
    activation: "active",
    maxLevel: 0,
    baseXpThreshold: 25,
    xpThresholdMultiplier: 1.5,
    description:
      "Aktiv: Fernkampf-Angriff — ein Strom lodernder Flammen über 8× Körpergröße Distanz. " +
      "Verursacht Feuer-Schaden (10 HP Basis) — schmilzt Chitin-Panzer. MP-Kosten: 8.",
    mpCost: 8_000,
    cooldownMs: 2500,
    attackType: "ranged_projectile",
    baseDamage: 10_000,
    damageType: "fire",
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
      "Passiv: Wird der Blob getroffen, gibt er bitteres Hämolymph ab — " +
      "der Angreifer erleidet Sofortschaden (2 HP pro Level). Höheres Level = stärkerer Rückschlag.",
    effects: [
      {
        trigger: "on_receive_damage",
        effectType: "reflect_damage",
        formula: { base: 2, perLevel: 2 },
        reasoning:
          "Bitteres Hämolymph tritt aus und verletzt den Angreifer beim Kontakt. " +
          "Lv1 = 2 HP, Lv3 = 6 HP, linear mit Level.",
      },
    ],
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
      "Passiv: Regeneriert langsam HP, solange der Blob sich nicht kämpfend fortbewegt. " +
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
