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
//   daraus folgt fließend der Fortschritt p (0–100 %, src/data/progression.ts
//   Abschnitt 1). NaturXP = 40,5 × learningEffort bringt einen Skill auf 90 %.
//   Dieselbe Definition gilt für Blob und Gegner — gleiche Erfahrung,
//   gleiche Wirkung (Vorgabe Entwickler, GDD-02 Abschnitt 8.6).
//
// ALLGEMEINES SCHEMA — jeder Wert hat { start, max }:
//   Wert = start + (max − start) × p
//   Vorgabe (Entwickler, 1. November 2026): Alle Werte nähern sich einem
//     Höchstwert an und sind bei 0 XP sehr niedrig („z. B. 1 Schaden“). Bei
//     Natur (90 %) kommt der bisherige Natur-Wert heraus.
//   Begründung (Entwickler): ein verständliches, allgemeines Schema der
//     Skillentwicklung, um es managen zu können.
//
//   Höchstwert: max = start + (bisheriger Natur-Wert − start) / 0,9, gerundet.
//   Startwerte (Vorschlag Claude, offen — bitte bestätigen):
//     - Schaden, Rückschlag, Giftdosis: 1 HP (Vorgabe Entwickler: „Wert 1,
//       wie 1 Schaden“).
//     - Chancen: 1 %.
//     - Schutz (Flat-Block, %-Reduktion) und Geschick: 0. Begründung: Ein
//       Startblock von 1 HP höbe jeden Startschaden von 1 HP ganz auf —
//       zwei frische Wesen könnten sich gar nicht verletzen.
//     - Faktoren (Schadensfaktor): ×1,0 — noch kein Bonus.
//     - Sprungweite 40 px, Photosynthese 0,1 HP/s: kleinster Wert, der
//       noch etwas bewirkt.
//     - Materialeigenschaften (Feuer-/Säureschwäche): konstant, start = max.
//   [VERWORFEN, 1. November 2026] Formeln base + perLevel × f(u − 1) mit
//     Kurven linear/√/log im Übungsgrad u, teils ohne Obergrenze; Angriffe
//     baseDamage × getSkillEffectiveness(u).
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
        formula: { start: 0, max: 13 },
        reasoning:
          "Chitin ist hart und spröde — Stiche stoppen an der Oberfläche. " +
          "0 → 13 HP, bei Natur 11,7 HP (bisher 12). [VERWORFEN] 3 + 3·√(u−1).",
      },
      {
        trigger: "on_receive_damage",
        condition: { damageType: "slash" },
        effectType: "flat_block",
        formula: { start: 0, max: 9 },
        reasoning:
          "Klingen können entlang der Plattenränder eindringen — weniger Schutz als gegen Stiche. " +
          "0 → 9 HP, bei Natur 8,1 HP (bisher 8). [VERWORFEN] 2 + 2·√(u−1).",
      },
      {
        trigger: "on_receive_damage",
        condition: { damageType: "blunt" },
        effectType: "percent_reduce",
        formula: { start: 0, max: 0.33 },
        reasoning:
          "Erschütterung wird durch das starre Chitin weitergeleitet. " +
          "Dämpfung ist gering — Chitin ist kein Stoßdämpfer. 0 → 33 %, bei Natur 30 % (wie bisher).",
      },
      {
        trigger: "on_receive_damage",
        condition: { damageType: "fire" },
        effectType: "weakness",
        formula: { start: 1.3, max: 1.3 },
        reasoning:
          "Chitin ist organisch und brennt leicht. Konstant — " +
          "diese Schwäche ist eine inhärente Materialeigenschaft.",
      },
      {
        trigger: "on_receive_damage",
        condition: { damageType: "acid" },
        effectType: "weakness",
        formula: { start: 1.5, max: 1.5 },
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
      "Verstärkt den Nahkampf-Angriff des Blobs: anfangs kaum, mit der Übung bis +83 %.",
    effects: [
      {
        trigger: "on_hit_enemy",
        effectType: "damage_mult",
        formula: { start: 1.0, max: 1.83 },
        reasoning:
          "Ameisen tragen das 50-fache ihres Körpergewichts. " +
          "×1,0 → ×1,83, bei Natur ×1,75 (wie bisher). [VERWORFEN] 1,30 + 0,05·(u−1).",
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
      "Halbwertszeit ab — dieser Abbau ist der Schaden. Anfangs 1 % Chance und 1 HP je Dosis; " +
      "mit der Übung bis 67 % Chance und 29 HP je Dosis.",
    effects: [
      {
        trigger: "on_hit_enemy",
        effectType: "inject_venom",
        formula: { start: 0.01, max: 0.67 },
        venomDose: { start: 1, max: 29 },
        reasoning:
          "Giftdrüsen spritzen bei Treffer Gift ein, aber nicht bei jedem Biss (auch Schlangen beißen " +
          "oft trocken). Chance 1 % → 67 %, bei Natur 60 % (wie bisher); Dosis 1 → 29 HP, bei Natur " +
          "26 HP (wie bisher). [VERWORFEN] Chance 0,30 + 0,10·√(u−1), Dosis 8 + 2·(u−1). " +
          "Gift stapelt — Regeln: src/data/venom.ts.",
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
      "Aktiv: Gezielter Biss — verursacht direkten Stich-Schaden (1 → 16 HP mit der Übung). " +
      "Ist Venom bekannt, hat jeder Biss zusätzliche Chance das Ziel zu vergiften. MP-Kosten: 3.",
    mpCost: 3_000,
    cooldownMs: 1200,
    attackType: "melee",
    // 1 → 16 HP, bei Natur 14,5 HP (bisher 14,35). [VERWORFEN] 7 HP × getSkillEffectiveness(u)
    damage: { start: 1, max: 16 },
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
      "Aktiv: Springt in Bewegungsrichtung (40 → 375 px mit der Übung) — überwindet Hindernisse " +
      "und erzeugt Distanz. MP-Kosten: 4. " +
      "Passiv: Sprungkraft macht den Blob geschickter — bessere Treffer, Gegner treffen seltener gut.",
    mpCost: 4_000,
    cooldownMs: 1800,
    attackType: "dash",
    effects: [
      {
        trigger: "passive",
        effectType: "dexterity",
        formula: { start: 0, max: 4.4 },
        reasoning:
          "Springspinnen sind extrem reaktionsschnell. Wer springen kann, kontrolliert seinen Körper " +
          "präziser: Geschick 0 → 4,4, bei Natur 4,0 (wie bisher). [VERWORFEN] 1 + √(u−1).",
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
      "Aktiv: Ein mächtiger Nahkampfhieb mit scharfen Klauen (1 → 18 HP mit der Übung, Schnitt). " +
      "MP-Kosten: 5.",
    mpCost: 5_000,
    cooldownMs: 1500,
    attackType: "melee",
    // 1 → 18 HP, bei Natur 16,3 HP (bisher 16,4). [VERWORFEN] 8 HP × getSkillEffectiveness(u)
    damage: { start: 1, max: 18 },
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
      "Aktiv: Packt das Ziel mit kräftigen Scheren und quetscht zu (1 → 16 HP mit der Übung, Wucht). " +
      "Kein Gift — die Scheren haben keine Giftdrüsen. MP-Kosten: 3.",
    mpCost: 3_000,
    cooldownMs: 1400,
    attackType: "melee",
    // 1 → 16 HP, bei Natur 14,5 HP — wie der Biss. [VERWORFEN] 7 HP × getSkillEffectiveness(u)
    damage: { start: 1, max: 16 },
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
      "Aktiv: Sticht mit dem Giftstachel zu (1 → 11 HP, Stich) und spritzt eine starke Giftdosis " +
      "ein: mit der Übung bis 100 % Chance und 33 HP je Dosis. Das Gift stapelt wie Venom. " +
      "MP-Kosten: 6.",
    mpCost: 6_000,
    cooldownMs: 2500,
    attackType: "melee",
    // Begründung (Vorschlag Claude): Der Stachel selbst ist dünn — die Wunde
    // ist klein, die Wirkung kommt vom Gift.
    // 1 → 11 HP, bei Natur 10 HP (bisher 10,25). [VERWORFEN] 5 HP × getSkillEffectiveness(u)
    damage: { start: 1, max: 11 },
    damageType: "pierce",
    // Gezielter Stich: wie ein Biss präzise, etwas mehr schwere Treffer
    hitProfile: { miss: 0.04, light: 0.16, normal: 0.50, heavy: 0.26, crit: 0.04 },
    effects: [
      {
        trigger: "on_hit_enemy",
        effectType: "inject_venom",
        formula: { start: 0.01, max: 1.0 },
        venomDose: { start: 1, max: 33 },
        reasoning:
          "Gift wirkt nur, wenn mit dem Stachel gestochen wird (aktiver Skill: Effekt nur beim eigenen Treffer). " +
          "Der Stachel ist ein reines Giftwerkzeug mit großer Giftblase und Muskulatur zum Einspritzen — " +
          "anders als Spinnen, deren Biss vor allem packt und nicht immer Gift abgibt. Deshalb mehr Chance " +
          "und Dosis als Venom: Chance 1 % → 100 %, bei Natur 90 % (bisher 95 %, Höchstwert auf 100 % " +
          "begrenzt); Dosis 1 → 33 HP, bei Natur 30 HP (wie bisher). [VERWORFEN] Chance 0,80 + 0,05·√(u−1), " +
          "Dosis 12 + 2·(u−1) (abgeschwächt am 1. Nov. 2026 auf Wunsch des Entwicklers, vorher 15 + 3·(u−1)). " +
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
      "Verursacht Feuer-Schaden (1 → 23 HP mit der Übung) — schmilzt Chitin-Panzer. MP-Kosten: 8.",
    mpCost: 8_000,
    cooldownMs: 2500,
    attackType: "ranged_projectile",
    // 1 → 23 HP, bei Natur 20,8 HP (bisher 20,5). [VERWORFEN] 10 HP × getSkillEffectiveness(u)
    damage: { start: 1, max: 23 },
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
      "der Angreifer erleidet Sofortschaden (1 → 22 HP mit der Übung).",
    effects: [
      {
        trigger: "on_receive_damage",
        effectType: "reflect_damage",
        formula: { start: 1, max: 22 },
        reasoning:
          "Bitteres Hämolymph tritt aus und verletzt den Angreifer beim Kontakt. " +
          "1 → 22 HP, bei Natur 20 HP (wie bisher). [VERWORFEN] 2 + 2·(u−1).",
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
      "Wirkt automatisch nach Entdeckung. 0,1 → 1,2 HP/s mit der Übung.",
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
