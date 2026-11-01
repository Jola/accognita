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
//   learningEffort = Lernaufwand. Skills haben keine Level, nur Erfahrung;
//   daraus folgt fließend der Übungsgrad u, mit dem alle Formeln hier
//   ausgewertet werden (src/data/progression.ts Abschnitt 1).
//   Dieselbe Definition gilt für Blob und Gegner — gleiche Erfahrung,
//   gleiche Wirkung (Vorgabe Entwickler, GDD-02 Abschnitt 8.6).
// ============================================================

import type { SkillDefinition } from "../types/Skill";

// -----------------------------------------------------------
// KERN-FÄHIGKEITEN
// Analyse & Absorb sind angeboren — immer vorhanden, nie verlierbar.
// Ihre Erfahrung bestimmt die Erfolgswahrscheinlichkeit.
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
    learningEffort: 1,       // Wird nie trainiert — keine Steigerung
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
    learningEffort: 10,
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
    learningEffort: 10,
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
    learningEffort: 12,
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
    learningEffort: 15,
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
    learningEffort: 15,
    description:
      "Passiv: Jeder Nahkampftreffer des Blobs hat eine Chance, dem Ziel Gift einzuspritzen. " +
      "Gift stapelt: Jede Dosis kommt auf die Giftlast des Ziels, der Körper baut sie mit 2 s " +
      "Halbwertszeit ab — dieser Abbau ist der Schaden. Anfangs 30% Chance und 8 HP je Dosis; " +
      "die Chance steigt mit der Übung immer langsamer (höchstens 100%), die Dosis um 2 HP je Übungsgrad.",
    effects: [
      {
        trigger: "on_hit_enemy",
        effectType: "inject_venom",
        formula: { base: 0.30, perLevel: 0.10, curve: "sqrt", max: 1.0 },
        venomDose: { base: 8, perLevel: 2 },
        reasoning:
          "Giftdrüsen spritzen bei Treffer Gift ein, aber nicht bei jedem Biss (auch Schlangen beißen " +
          "oft trocken). Sqrt-Kurve: Chance steigt anfangs schnell, dann immer langsamer " +
          "(u5 50%, u10 60%, u20 74%); bei 100% gedeckelt (ab u50). Dosis = Gesamtschaden des " +
          "früheren 4-s-Gifts (2 + 0,5·(u−1) HP je Tick × 4). Gift stapelt — Regeln: src/data/venom.ts.",
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
    learningEffort: 12,
    description:
      "Aktiv: Gezielter Biss — verursacht direkten Stich-Schaden (7 HP Basis). " +
      "Ist Venom bekannt, hat jeder Biss zusätzliche Chance das Ziel zu vergiften. " +
      "Höheres Level = stärkerer Biss. MP-Kosten: 3.",
    mpCost: 3_000,
    cooldownMs: 1200,
    attackType: "melee",
    baseDamage: 7_000,
    damageType: "pierce",
    // Gezielt und präzise: etwas mehr kritische Treffer als ein Körperstoß
    hitProfile: { miss: 0.03, light: 0.17, normal: 0.52, heavy: 0.24, crit: 0.04 },
  },
  {
    id: "jump",
    name: "Jump",
    element: "none",
    icon: "🦘",
    category: "basic",
    activation: "active",
    learningEffort: 12,
    description:
      "Aktiv: Springt 160px in Bewegungsrichtung — überwindet Hindernisse und erzeugt Distanz. " +
      "Höheres Level = größere Sprungweite. MP-Kosten: 4. " +
      "Passiv: Sprungkraft macht den Blob geschickter — bessere Treffer, Gegner treffen seltener gut.",
    mpCost: 4_000,
    cooldownMs: 1800,
    attackType: "dash",
    effects: [
      {
        trigger: "passive",
        effectType: "dexterity",
        formula: { base: 1, perLevel: 1, curve: "sqrt" },
        reasoning:
          "Springspinnen sind extrem reaktionsschnell. Wer springen kann, kontrolliert seinen Körper " +
          "präziser: Geschick 1 bei Lv1, 3 bei Lv5, ~5,4 bei Lv20 (sqrt-Kurve flacht ab).",
      },
    ],
  },
  {
    id: "claw",
    name: "Klauenhieb",
    element: "none",
    icon: "🦅",
    category: "basic",
    activation: "active",
    learningEffort: 15,
    description:
      "Aktiv: Ein mächtiger Nahkampfhieb mit scharfen Klauen (8 HP Basis-Schaden, Schnitt). " +
      "Höheres Level = stärkerer Hieb. MP-Kosten: 5.",
    mpCost: 5_000,
    cooldownMs: 1500,
    attackType: "melee",
    baseDamage: 8_000,
    damageType: "slash",
    // Weit ausholender Hieb: öfter schwer, aber auch öfter daneben
    hitProfile: { miss: 0.05, light: 0.15, normal: 0.45, heavy: 0.32, crit: 0.03 },
  },

  // --- SKORPION-SKILLS ---
  // Vorgabe (Entwickler): Skorpione greifen mit den Scheren an und nur
  //   gelegentlich mit dem Giftstachel. Das Skorpiongift ist relativ stark,
  //   stärker als das der Spinnen, und wirkt nur beim Stachel, nicht bei den
  //   Scheren. Namen und Symbole: Vorschlag Claude.
  // Wie oft ein Gegner sticht: occasionalAttack in entities.ts.

  {
    id: "pincer",
    name: "Zangengriff",
    element: "none",
    icon: "🦀",
    category: "basic",
    activation: "active",
    learningEffort: 12,
    description:
      "Aktiv: Packt das Ziel mit kräftigen Scheren und quetscht zu (7 HP Basis, Wucht). " +
      "Kein Gift — die Scheren haben keine Giftdrüsen. Mehr Übung = festerer Griff. MP-Kosten: 3.",
    mpCost: 3_000,
    cooldownMs: 1400,
    attackType: "melee",
    baseDamage: 7_000,
    // Begründung (Vorschlag Claude): Skorpionscheren (Pedipalpen) packen und
    // quetschen, sie schneiden nicht — deshalb Wucht. Chitin dämpft Wucht
    // nur prozentual, blockt sie nicht fest.
    damageType: "blunt",
    // Begründung (Vorschlag Claude): Wer festhält, verfehlt selten, trifft
    // aber auch selten eine verwundbare Stelle — weniger Fehlschläge und
    // weniger kritische Treffer als ein Biss. Lernaufwand und Schaden wie
    // beim Biss: Die Scheren ersetzen beim Skorpion den bisherigen Biss.
    hitProfile: { miss: 0.02, light: 0.20, normal: 0.58, heavy: 0.17, crit: 0.03 },
  },
  {
    id: "venom_sting",
    name: "Stachelstich",
    element: "poison",
    icon: "💉",
    category: "basic",
    activation: "active",
    learningEffort: 18,
    description:
      "Aktiv: Sticht mit dem Giftstachel zu (5 HP Basis, Stich) und spritzt fast immer eine " +
      "starke Giftdosis ein: anfangs 12 HP, +2 HP je Übungsgrad. Das Gift stapelt wie Venom. " +
      "MP-Kosten: 6.",
    mpCost: 6_000,
    cooldownMs: 2500,
    attackType: "melee",
    // Begründung (Vorschlag Claude): Der Stachel selbst ist dünn — die Wunde
    // ist klein, die Wirkung kommt vom Gift.
    baseDamage: 5_000,
    damageType: "pierce",
    // Gezielter Stich: wie ein Biss präzise, etwas mehr schwere Treffer
    hitProfile: { miss: 0.04, light: 0.16, normal: 0.50, heavy: 0.26, crit: 0.04 },
    effects: [
      {
        trigger: "on_hit_enemy",
        effectType: "inject_venom",
        formula: { base: 0.80, perLevel: 0.05, curve: "sqrt", max: 1.0 },
        venomDose: { base: 12, perLevel: 2 },
        reasoning:
          "Gift wirkt nur, wenn mit dem Stachel gestochen wird (aktiver Skill: Effekt nur beim eigenen Treffer). " +
          "Der Stachel ist ein reines Giftwerkzeug mit großer Giftblase und Muskulatur zum Einspritzen — " +
          "anders als Spinnen, deren Biss vor allem packt und nicht immer Gift abgibt. Deshalb 80 % Chance " +
          "statt 30 % und höhere Dosis: 12 HP statt 8 bei u1, 18 statt 14 bei u4, 24 statt 20 bei u7 " +
          "(abgeschwächt am 1. Nov. 2026 auf Wunsch des Entwicklers, vorher 15 + 3 je Übungsgrad). " +
          "Gift ist teuer herzustellen (Gift-Ökonomie) — Skorpione stechen darum nur gelegentlich. VORLÄUFIG.",
      },
    ],
  },
  {
    id: "fire_breath",
    name: "Feueratem",
    element: "fire",
    icon: "🔥",
    category: "basic",
    activation: "active",
    learningEffort: 25,
    description:
      "Aktiv: Fernkampf-Angriff — ein Strom lodernder Flammen über 8× Körpergröße Distanz. " +
      "Verursacht Feuer-Schaden (10 HP Basis) — schmilzt Chitin-Panzer. MP-Kosten: 8.",
    mpCost: 8_000,
    cooldownMs: 2500,
    attackType: "ranged_projectile",
    baseDamage: 10_000,
    damageType: "fire",
    // Flammenstrom trifft fast immer, aber selten eine Schwachstelle
    hitProfile: { miss: 0.02, light: 0.25, normal: 0.55, heavy: 0.16, crit: 0.02 },
  },
  {
    id: "hemolymph",
    name: "Hemolymph",
    element: "poison",
    icon: "🐞",
    category: "basic",
    activation: "passive",
    learningEffort: 12,
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
    learningEffort: 15,
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
