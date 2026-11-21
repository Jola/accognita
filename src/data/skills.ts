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
//   Vorgabe (Entwickler, 14. November 2026): Alles, was zu einem Skill
//     gehört, wird am Skill konfiguriert — wie viel Stärke, Geschick oder
//     andere Eigenschaften er mit der Erfahrung gibt (effects), wie
//     Eigenschaften auf ihn wirken (scaling), seine Werte wie Sprungweite,
//     Heilung oder Verdauung (effects) und wodurch er Erfahrung bekommt
//     (practice). Allgemeine Regeln (Treffer-Stufen, Präzision durch
//     Geschick, Erfahrung, Schadensgrenzen …) stehen in src/data/balance.ts.
//   Begründung (Vorschlag Claude, übernommen): Alles, was einen Skill
//     ausmacht, steht an einem Ort — wer einen Skill balanciert, fasst nur
//     eine Stelle an und sieht im INDEX alle Werte. Präzision gilt für jeden
//     Angriff gleich und ist deshalb eine allgemeine Regel.
//
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
      "Gibt Stärke (0 → 10 Punkte mit der Übung). Stärke verstärkt Angriffe, die mit Stärke " +
      "skalieren (Biss, Klauenhieb, Zangengriff) — wie viel, steht am Angriff. Die Körpergröße verstärkt " +
      "die Stärke prozentual.",
    effects: [
      {
        trigger: "passive",
        effectType: "strength",
        formula: { start: 0, max: 10 },
        reasoning:
          "Ameisen tragen das 50-fache ihres Körpergewichts. Vorgabe (Entwickler, 13. November 2026): " +
          "Superstrength gibt dem Charakter Stärke, Stärke verstärkt Angriffe wie Schläge und Bisse. " +
          "0 → 10 Punkte, bei Natur 9 (Vorschlag Claude, offen: runde Skala; mit +8 % je Punkt beim Biss " +
          "ergibt Natur ≈ +72 %, nah am bisherigen ×1,75). " +
          "[VERWORFEN, 13. November 2026] Schadensfaktor ×1,0 → ×1,83 auf jeden Angriff (auch Feueratem). " +
          "[VERWORFEN] 1,30 + 0,05·(u−1).",
      },
    ],
  },
  {
    id: "venom",
    name: "Venom",
    element: "poison",
    icon: "☠",
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
    scaling: [
      {
        attribute: "strength", perPoint: 0.04,
        reasoning:
          "Vorgabe (Entwickler): Stärke verstärkt Bisse. +4 % je Punkt (VORLÄUFIG): Stärke reicht jetzt " +
          "bis ≈ 28 (Kriechen 1 + Krabbeln 3 + Superstrength 10, × 2 bei voller Größe, GDD-09). " +
          "[VERWORFEN, 13. November 2026] +8 % je Punkt bei Stärke 0–10.",
      },
    ],
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
        trigger: "on_activate",
        effectType: "jump_distance",
        formula: { start: 40, max: 375 },
        reasoning:
          "Sprungweite in Weltpixeln: 40 → 375 px, bei Natur 342 px (bisher 340). Startwert (Vorschlag Claude, " +
          "offen): ein kleiner Hüpfer — der Wert soll bei 0 XP sehr niedrig sein (Vorgabe Entwickler), ein Sprung " +
          "von 1 px wäre aber keiner. [VERWORFEN, 1. November 2026] 160 + 20 × (u − 1) px.",
      },
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
    scaling: [
      {
        attribute: "strength", perPoint: 0.04,
        reasoning:
          "Vorgabe (Entwickler): Stärke verstärkt Schläge. +4 % je Punkt wie beim Biss (VORLÄUFIG, neue Stärke-Skala GDD-09). " +
          "[VERWORFEN, 13. November 2026] +8 % je Punkt. " +
          "[VERWORFEN, 13. November 2026] +6 % je Punkt Stärke und +5 % je Punkt Geschick — Vorgabe (Entwickler): " +
          "Geschick erhöht die Präzision, nicht den Schaden, zumindest bei Schlägen und Bissen.",
      },
    ],
  },

  // --- BEWEGUNG UND SINNE (GDD-09) ---
  // Vorgabe (Entwickler, 13. November 2026): Der Blob erwacht ohne Bewegung
  //   und ohne Sicht und lernt beides erst durch Analyze und Absorb.
  //   Bewegung gibt Stärke und Geschick, die mit dem Fortschritt wachsen;
  //   das Tempo steigt mit dem Skill. Wurm und Schnecke geben Kriechen,
  //   Insekten Krabbeln, später kommt Laufen. Sehen: Schwarz → Schwarz-Weiß
  //   → Farbe. Regel „bester Skill zählt“: src/data/body.ts; Stärke aus der
//   Körpergröße: src/data/balance.ts. Erfahrung durch Tun: Feld practice.
  // Alle Zahlen VORLÄUFIG (Vorschlag Claude, Skala übernommen).

  {
    id: "crawl",
    name: "Kriechen",
    element: "earth",
    icon: "🐌",
    category: "basic",
    activation: "passive",
    // Klein, damit man nach kurzer Zeit annehmbar schnell ist (Vorgabe Entwickler)
    learningEffort: 5,
    description:
      "Passiv: Der Blob schiebt sich wie Wurm und Schnecke über den Boden. Erst damit kann er sich " +
      "überhaupt bewegen. Tempo ×0,15 → ×0,6 des Grundtempos, Stärke 0 → 1, Geschick 0 → 1 mit der Übung. " +
      "Lernt durch Bewegen. Quelle: Regenwurm, Schnecke.",
    practice: {
      unit: "body_radius_moved", xpPer: 0.5,
      reasoning:
        "Begründung (Vorschlag Claude, übernommen): Bewegung lernt man durch Bewegen — in Körperradien, damit " +
        "ein großer Blob nicht schneller lernt. 1 XP je 2 Körperradien (VORLÄUFIG): Kriechen ist damit nach " +
        "rund 30 s Bewegung bei „Übung“ und nach rund zwei Minuten bei Natur („nach kurzer Zeit annehmbar " +
        "schnell“, Vorgabe Entwickler).",
    },
    effects: [
      {
        trigger: "passive", effectType: "move_speed", formula: { start: 0.15, max: 0.6 },
        reasoning:
          "Kriechen ist die langsamste Fortbewegung: Wellen von Muskelkontraktionen (Wurm) oder ein " +
          "Kriechfuß auf Schleim (Schnecke). Am Anfang ein mühsames Schieben, geübt ein stetiges Gleiten.",
      },
      {
        trigger: "passive", effectType: "strength", formula: { start: 0, max: 1 },
        reasoning: "Vorgabe (Entwickler): Bewegung gibt Stärke. Kriechen trainiert nur wenig Muskelkraft.",
      },
      {
        trigger: "passive", effectType: "dexterity", formula: { start: 0, max: 1 },
        reasoning: "Vorgabe (Entwickler): Bewegung gibt Geschick. Kriechen verlangt wenig Körperbeherrschung.",
      },
    ],
  },
  {
    id: "scuttle",
    name: "Krabbeln",
    element: "earth",
    icon: "🐞",
    category: "basic",
    activation: "passive",
    learningEffort: 10,
    description:
      "Passiv: Der Blob formt kleine Beinchen und krabbelt wie Insekten und Spinnen. Tempo ×0,4 → ×1,0 " +
      "des Grundtempos, Stärke 0 → 3, Geschick 0 → 3 mit der Übung. Lernt durch Bewegen. " +
      "Quelle: Ameise, Marienkäfer, Spinnen, Skorpione.",
    practice: {
      unit: "body_radius_moved", xpPer: 0.5,
      reasoning:
        "Begründung (Vorschlag Claude, übernommen): Bewegung lernt man durch Bewegen — in Körperradien, damit " +
        "ein großer Blob nicht schneller lernt. 1 XP je 2 Körperradien (VORLÄUFIG); wie Kriechen.",
    },
    effects: [
      {
        trigger: "passive", effectType: "move_speed", formula: { start: 0.4, max: 1.0 },
        reasoning:
          "Gegliederte Beine heben den Körper vom Boden — viel schneller als Kriechen. ×1,0 bei Höchstwert " +
          "entspricht dem bisherigen Tempo des Blobs.",
      },
      {
        trigger: "passive", effectType: "strength", formula: { start: 0, max: 3 },
        reasoning: "Vorgabe (Entwickler): Bewegung gibt Stärke. Beine tragen und stemmen den Körper.",
      },
      {
        trigger: "passive", effectType: "dexterity", formula: { start: 0, max: 3 },
        reasoning: "Vorgabe (Entwickler): Bewegung gibt Geschick. Sechs bis acht Beine zu koordinieren schult die Körperbeherrschung.",
      },
    ],
  },
  {
    id: "light_sense",
    name: "Lichtsinn",
    element: "light",
    icon: "🌗",
    category: "basic",
    activation: "passive",
    learningEffort: 8,
    description:
      "Passiv: Lichtempfindliche Zellen unterscheiden hell und dunkel. Der Blob sieht seine Umgebung " +
      "in Graustufen — Sichtweite 2 → 10 Körperradien mit der Übung. Lernt durch Sehen (Zeit mit Licht). " +
      "Quelle: Regenwurm, Schnecke.",
    practice: {
      unit: "second_enabled", xpPer: 0.5,
      reasoning:
        "Begründung (Vorschlag Claude, übernommen): Sehen lernt man durch Sehen — wie Photosynthese läuft es " +
        "passiv mit. 0,5 XP je Sekunde (VORLÄUFIG): Lichtsinn ist nach rund einer Minute bei „Übung“ und nach gut " +
        "zehn Minuten bei Natur.",
    },
    effects: [
      {
        trigger: "passive", effectType: "sight_range", formula: { start: 2, max: 10 },
        reasoning:
          "Regenwürmer haben keine Augen, aber lichtempfindliche Zellen in der Haut; Schnecken einfache " +
          "Augen auf den Fühlern. Beide sehen nur hell und dunkel — eine Sorte Lichtsinneszellen ergibt " +
          "Graustufen, unscharf und nah.",
      },
    ],
  },
  {
    id: "compound_eye",
    name: "Facettenauge",
    element: "light",
    icon: "🪲",
    category: "basic",
    activation: "passive",
    learningEffort: 12,
    description:
      "Passiv: Viele Einzelaugen sehen weiter und in Farbe — aber ohne Rot, Rot erscheint dunkel. " +
      "Sichtweite 6 → 25 Körperradien, Farbe 0 → 100 % mit der Übung. Lernt durch Sehen. " +
      "Quelle: Ameise, Marienkäfer.",
    practice: {
      unit: "second_enabled", xpPer: 0.5,
      reasoning:
        "Begründung (Vorschlag Claude, übernommen): Sehen lernt man durch Sehen — wie Photosynthese läuft es " +
        "passiv mit. 0,5 XP je Sekunde (VORLÄUFIG); wie Lichtsinn.",
    },
    effects: [
      {
        trigger: "passive", effectType: "sight_range", formula: { start: 6, max: 25 },
        reasoning: "Insektenaugen bestehen aus Hunderten Einzelaugen — weiter Blick, aber grob gerastert.",
      },
      {
        trigger: "passive", effectType: "color_vision", formula: { start: 0, max: 1 },
        reasoning:
          "Insekten haben Lichtsinneszellen für UV, Blau und Grün, aber kaum für Rot. Mit der Übung kommt " +
          "fließend Farbe ins Bild (Vorgabe Entwickler: Übergang von Schwarz-Weiß zu Farbe).",
      },
    ],
  },
  {
    id: "principal_eyes",
    name: "Hauptaugen",
    element: "light",
    icon: "🕷️",
    category: "basic",
    activation: "passive",
    learningEffort: 15,
    description:
      "Passiv: Zwei große, scharfe Linsenaugen wie bei der Springspinne. Volle Farbe einschließlich Rot " +
      "und weiter Blick — Sichtweite 10 → 40 Körperradien, Rot 0 → 100 % mit der Übung. Lernt durch Sehen. " +
      "Quelle: Springspinne.",
    practice: {
      unit: "second_enabled", xpPer: 0.5,
      reasoning:
        "Begründung (Vorschlag Claude, übernommen): Sehen lernt man durch Sehen — wie Photosynthese läuft es " +
        "passiv mit. 0,5 XP je Sekunde (VORLÄUFIG); wie Lichtsinn.",
    },
    effects: [
      {
        trigger: "passive", effectType: "sight_range", formula: { start: 10, max: 40 },
        reasoning: "Springspinnen haben die schärfsten Augen unter den Kleintieren — sie jagen auf Sicht.",
      },
      {
        trigger: "passive", effectType: "color_vision", formula: { start: 0.5, max: 1 },
        reasoning: "Die Hauptaugen sehen Farben; wer sie lernt, sieht sofort zumindest blass farbig.",
      },
      {
        trigger: "passive", effectType: "red_vision", formula: { start: 0, max: 1 },
        reasoning:
          "Manche Springspinnen sehen Rot — mit der Übung leuchtet Rot (Feuer, Drache) im Bild auf.",
      },
    ],
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
    scaling: [
      {
        attribute: "strength", perPoint: 0.04,
        reasoning:
          "Quetschen ist reine Muskelkraft — wie beim Biss +4 % je Punkt Stärke (VORLÄUFIG, neue Stärke-Skala GDD-09). " +
          "[VERWORFEN, 13. November 2026] +8 % je Punkt.",
      },
    ],
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

  // --- WIRBELTIER-SKILLS (GDD-07 Teil 7, GDD-09 Abschnitt 2.4) ---
  // Vorgabe (Entwickler, 21. November 2026): Fünf Wirbeltiere mit Beinen
  //   (Waldmaus, Wasserspitzmaus, Zauneidechse, Igel, Mauswiesel) bringen
  //   Laufen, je einen Angriffs-Skill und mindestens einen weiteren Skill;
  //   die Skills orientieren sich an den Merkmalen der biologischen Vorbilder.
  //   Alle Vorschläge übernommen, Giftresistenz des Igels dazu.
  // Begründung (Vorschlag Claude, übernommen): jeweils im Feld reasoning.
  // Alle Zahlen VORLÄUFIG (Vorschlag Claude, offen).

  {
    id: "run",
    name: "Laufen",
    element: "earth",
    icon: "🐾",
    category: "basic",
    activation: "passive",
    learningEffort: 15,
    description:
      "Passiv: Der Blob formt vier Beine und läuft wie Maus, Eidechse oder Igel — die schnellste Fortbewegung. " +
      "Tempo ×0,7 → ×1,5 des Grundtempos, Stärke 0 → 5, Geschick 0 → 3 mit der Übung. Lernt durch Bewegen. " +
      "Quelle: Waldmaus, Wasserspitzmaus, Zauneidechse, Igel, Mauswiesel.",
    practice: {
      unit: "body_radius_moved", xpPer: 0.5,
      reasoning:
        "Begründung (Vorschlag Claude, übernommen): Bewegung lernt man durch Bewegen — wie Kriechen und Krabbeln " +
        "1 XP je 2 Körperradien. Mit Lernaufwand 15 dauert es etwa anderthalbmal so lange wie Krabbeln (VORLÄUFIG).",
    },
    effects: [
      {
        trigger: "passive", effectType: "move_speed", formula: { start: 0.7, max: 1.5 },
        reasoning:
          "Wirbeltierbeine sind lang, unter dem Körper aufgehängt und werden von großen Muskeln bewegt — viel " +
          "schneller als sechs kurze Insektenbeine. Schon ungeübt (×0,7) fast so schnell wie geübtes Krabbeln, " +
          "geübt anderthalbmal so schnell (GDD-09 Abschnitt 2.4).",
      },
      {
        trigger: "passive", effectType: "strength", formula: { start: 0, max: 5 },
        reasoning: "Vorgabe (Entwickler): Bewegung gibt Stärke. Laufen braucht kräftige Bein- und Rumpfmuskeln — mehr als Krabbeln (3).",
      },
      {
        trigger: "passive", effectType: "dexterity", formula: { start: 0, max: 3 },
        reasoning: "Vorgabe (Entwickler): Bewegung gibt Geschick. Auf vier Beinen zu balancieren schult so viel wie sechs Beine zu koordinieren (3).",
      },
    ],
  },
  {
    id: "gnaw",
    name: "Nagen",
    element: "none",
    icon: "🐭",
    category: "basic",
    activation: "active",
    learningEffort: 8,
    description:
      "Aktiv: Schnelle, schwache Bisse mit Nagezähnen (1 → 8 HP mit der Übung, Schnitt). Kurze Abklingzeit " +
      "und nur 1 MP — damit lässt sich lange durchhalten. Quelle: Waldmaus.",
    mpCost: 1_000,
    cooldownMs: 700,
    attackType: "melee",
    // Begründung (Vorschlag Claude, offen): Bei Natur 7,3 HP alle 0,7 s ≈ 10 HP/s —
    // etwas weniger als der Biss (≈ 12 HP/s), aber für 1,4 MP/s statt 2,5 MP/s.
    // Der Blob regeneriert 1 MP/s: Nagen kann er fast ohne Pause einsetzen.
    damage: { start: 1, max: 8 },
    // Begründung (Vorschlag Claude, offen): Nagezähne sind Meißel — sie schneiden
    // und schaben, statt zu stechen. Deshalb Schnitt; Chitin blockt Schnitt
    // schwächer als Stich, Mäuse nagen sich auch durch harte Schalen.
    damageType: "slash",
    // Viele kleine Bisse: selten daneben, selten schwer
    hitProfile: { miss: 0.03, light: 0.27, normal: 0.55, heavy: 0.13, crit: 0.02 },
    scaling: [
      {
        attribute: "strength", perPoint: 0.04,
        reasoning: "Vorgabe (Entwickler): Stärke verstärkt Bisse. +4 % je Punkt wie beim Biss (VORLÄUFIG).",
      },
    ],
  },
  {
    id: "zigzag",
    name: "Haken schlagen",
    element: "none",
    icon: "↯",
    category: "basic",
    activation: "passive",
    learningEffort: 12,
    description:
      "Passiv: Plötzliche Richtungswechsel wie eine fliehende Maus. Gibt Geschick (0 → 4) und eine Chance, " +
      "einem Treffer ganz auszuweichen (0 → 20 % mit der Übung). Lernt durch Ausweichen. Quelle: Waldmaus.",
    effects: [
      {
        trigger: "on_receive_damage",
        effectType: "evade",
        formula: { start: 0, max: 0.2 },
        reasoning:
          "Mäuse entkommen Eulen und Katzen, indem sie im letzten Moment einen Haken schlagen — der Angriff geht " +
          "ins Leere. 0 → 20 %, bei Natur 18 % (Vorschlag Claude, offen): kommt zum Verfehlen durch Geschick dazu, " +
          "darf also nicht zu hoch sein. Wirkt gegen jeden Treffer, auch Fernkampf.",
      },
      {
        trigger: "passive",
        effectType: "dexterity",
        formula: { start: 0, max: 4 },
        reasoning:
          "Wer Haken schlagen kann, beherrscht seinen Körper: Geschick 0 → 4, etwas weniger als Jump (4,4), " +
          "weil das Ausweichen dazukommt.",
      },
    ],
  },
  {
    id: "voracity",
    name: "Heißhunger",
    element: "nature",
    icon: "🍽️",
    category: "basic",
    activation: "passive",
    learningEffort: 10,
    description:
      "Passiv: Ein rasender Stoffwechsel wie bei der Spitzmaus. Wachsen verdaut ×1,0 → ×2,5 so schnell mit der " +
      "Übung. Wirkt nur zusammen mit Wachsen. Lernt durch Verdauen. Quelle: Wasserspitzmaus.",
    effects: [
      {
        trigger: "passive",
        effectType: "digest_mult",
        formula: { start: 1, max: 2.5 },
        reasoning:
          "Spitzmäuse haben einen der schnellsten Stoffwechsel aller Säugetiere: Sie fressen täglich etwa ihr " +
          "eigenes Körpergewicht und verhungern nach wenigen Stunden ohne Nahrung. ×1,0 → ×2,5, bei Natur ×2,35 " +
          "(Vorschlag Claude, offen): Wachsen bei Natur verdaut dann rund 64 statt 27 Fasern pro Minute — " +
          "dann begrenzt erst recht das Sammeln, nicht die Verdauung.",
      },
    ],
    practice: {
      unit: "fiber_digested", xpPer: 0.5,
      reasoning:
        "Begründung (Vorschlag Claude, offen): Wie Wachsen lernt Heißhunger an dem, was er bewirkt — je verdauter " +
        "Faser, solange Wachsen läuft. Halb so viel wie Wachsen (1 XP), weil er durch sich selbst mehr Fasern " +
        "verdaut und sonst schneller lernte. Natur bei ≈ 800 verdauten Fasern.",
    },
  },
  {
    id: "snap_bite",
    name: "Schnappbiss",
    element: "none",
    icon: "🦎",
    category: "basic",
    activation: "active",
    learningEffort: 12,
    description:
      "Aktiv: Blitzschnelles Zuschnappen (1 → 14 HP mit der Übung, Stich). Trifft oft schwer, verfehlt aber " +
      "auch öfter als ein Biss. MP-Kosten: 3. Quelle: Zauneidechse.",
    mpCost: 3_000,
    cooldownMs: 1600,
    attackType: "melee",
    // Begründung (Vorschlag Claude, offen): Basisschaden etwas unter dem Biss
    // (16), dafür viele schwere Treffer: im Schnitt ×1,08 statt ×1,03 je Treffer.
    damage: { start: 1, max: 14 },
    damageType: "pierce",
    // Eidechsen jagen aus dem Stand mit einem Sprint und einem Zuschnappen:
    // Sitzt der Biss, sitzt er fest — schnappt er zu früh, geht er daneben.
    // [VERWORFEN, 21. November 2026] Vorschlag „mehr schwere Treffer, wenn der
    // Blob sich vorher bewegt hat“ — braucht einen Bewegungszustand im Kampf,
    // den es nicht gibt; das schwere Profil gilt jetzt immer.
    hitProfile: { miss: 0.06, light: 0.12, normal: 0.42, heavy: 0.34, crit: 0.06 },
    scaling: [
      {
        attribute: "strength", perPoint: 0.04,
        reasoning: "Vorgabe (Entwickler): Stärke verstärkt Bisse. +4 % je Punkt wie beim Biss (VORLÄUFIG).",
      },
    ],
  },
  {
    id: "tail_drop",
    name: "Schwanz abwerfen",
    element: "none",
    icon: "〰️",
    category: "basic",
    activation: "passive",
    learningEffort: 10,
    description:
      "Passiv: Ein tödlicher Treffer trennt nur ein Stück Körper ab — der Blob überlebt mit 1 HP, und alle " +
      "Gegner in der Nähe stürzen sich 1 → 4 s lang auf das zappelnde Stück statt auf ihn. Danach muss das " +
      "Stück nachwachsen: 600 → 120 s mit der Übung. Gift im Körper wirkt weiter! Lernt, wenn er auslöst. " +
      "Quelle: Zauneidechse.",
    practice: {
      unit: "triggered", xpPer: 25,
      reasoning:
        "Begründung (Vorschlag Claude, offen): Der Skill löst nur selten aus und lernt am Auslösen — 25 XP je " +
        "abgeworfenem Stück, Natur nach gut 15 Mal (zusammen mit Absorb und Analyze schneller).",
    },
    effects: [
      {
        trigger: "on_receive_damage",
        effectType: "lethal_save",
        formula: { start: 600, max: 120 },
        reasoning:
          "Autotomie: Eidechsen werfen bei Gefahr den Schwanz an einer Sollbruchstelle ab und lassen ihn " +
          "nachwachsen — das dauert Wochen, deshalb geht es nur selten. Nachwachsen 600 → 120 s, bei Natur 168 s " +
          "(Vorschlag Claude, offen): Ein Wert, der fällt, je besser der Skill ist — Ausnahme vom üblichen " +
          "„steigt mit der Übung“, wie eine Abklingzeit. Rettet vor jedem Tod durch einen Treffer; Gift im Körper " +
          "wirkt weiter, denn ein abgeworfener Schwanz nimmt kein Gift mit.",
      },
      {
        trigger: "on_receive_damage",
        effectType: "distract",
        formula: { start: 1, max: 4 },
        reasoning:
          "Der abgeworfene Schwanz zappelt minutenlang weiter und zieht den Räuber auf sich, während die Eidechse " +
          "flieht. 1 → 4 s Ablenkung (Vorschlag Claude, offen): genug, um aus der Reichweite zu kommen.",
      },
    ],
  },
  {
    id: "spines",
    name: "Stachelkleid",
    element: "earth",
    icon: "🦔",
    category: "basic",
    activation: "passive",
    learningEffort: 12,
    description:
      "Passiv: Ein Kleid aus harten Stacheln. Wer den Blob trifft, sticht sich selbst (1 → 15 HP Rückschlag), " +
      "und Zähne und Klauen kommen schlechter an die Haut (0 → 5 HP Block gegen Stich und Schnitt). " +
      "Lernt durch Rückschlag und Blocken. Quelle: Igel.",
    effects: [
      {
        trigger: "on_receive_damage",
        effectType: "reflect_damage",
        formula: { start: 1, max: 15 },
        reasoning:
          "Rund 7000 Stacheln aus Keratin, die der Igel bei Gefahr aufrichtet — wer zubeißt, sticht sich. " +
          "1 → 15 HP, bei Natur 13,6 HP (Vorschlag Claude, offen): weniger als Hemolymph (22), weil das " +
          "Stachelkleid zusätzlich blockt.",
      },
      {
        trigger: "on_receive_damage",
        condition: { damageType: "pierce" },
        effectType: "flat_block",
        formula: { start: 0, max: 5 },
        reasoning:
          "Die Stacheln halten Zähne auf Abstand zur Haut. 0 → 5 HP, weniger als Chitin (13), weil zwischen den " +
          "Stacheln Lücken bleiben (Vorschlag Claude, offen).",
      },
      {
        trigger: "on_receive_damage",
        condition: { damageType: "slash" },
        effectType: "flat_block",
        formula: { start: 0, max: 5 },
        reasoning: "Klauen gleiten an den Stacheln ab — derselbe Schutz wie gegen Zähne (Vorschlag Claude, offen).",
      },
    ],
  },
  {
    id: "venom_resistance",
    name: "Giftresistenz",
    element: "poison",
    icon: "🧪",
    category: "basic",
    activation: "passive",
    learningEffort: 12,
    description:
      "Passiv: Das Blut neutralisiert Gift. Von jeder Giftdosis, die den Blob trifft, kommt nur ein Teil an — " +
      "0 → 60 % werden mit der Übung abgefangen. Lernt durch neutralisiertes Gift. Quelle: Igel.",
    effects: [
      {
        trigger: "on_receive_damage",
        effectType: "venom_resist",
        formula: { start: 0, max: 0.6 },
        reasoning:
          "Igel vertragen ein Vielfaches der Giftmenge, die andere Säugetiere ihrer Größe tötet: Eiweiße im Blut " +
          "binden das Gift der Kreuzotter, bevor es wirkt. Deshalb sinkt die Dosis, nicht der Abbau — schnellerer " +
          "Abbau wäre hier sogar mehr Schaden pro Sekunde (src/data/venom.ts Abschnitt 3). 0 → 60 %, bei Natur " +
          "54 % (Vorschlag Claude, offen): nie ganz immun.",
      },
    ],
  },
  {
    id: "neck_bite",
    name: "Nackenbiss",
    element: "none",
    icon: "🩸",
    category: "basic",
    activation: "active",
    learningEffort: 15,
    description:
      "Aktiv: Ein gezielter Biss in den Nacken (1 → 14 HP mit der Übung, Stich) mit hoher Chance auf kritische " +
      "Treffer (×2,5, schlagen durch Panzer). MP-Kosten: 5. Quelle: Mauswiesel.",
    mpCost: 5_000,
    cooldownMs: 1800,
    attackType: "melee",
    damage: { start: 1, max: 14 },
    damageType: "pierce",
    // Begründung (Vorschlag Claude, offen): Kritisch 15 % statt 4 % beim Biss.
    // Im Schnitt ×1,11 je Treffer (Biss ×1,03), dafür öfter daneben — und weil
    // kritische Treffer vor der Rüstung zählen, kommt er durch Chitin.
    hitProfile: { miss: 0.08, light: 0.20, normal: 0.42, heavy: 0.15, crit: 0.15 },
    scaling: [
      {
        attribute: "strength", perPoint: 0.04,
        reasoning: "Vorgabe (Entwickler): Stärke verstärkt Bisse. +4 % je Punkt wie beim Biss (VORLÄUFIG).",
      },
    ],
  },
  {
    id: "agility",
    name: "Wendigkeit",
    element: "none",
    icon: "🌀",
    category: "basic",
    activation: "passive",
    learningEffort: 12,
    description:
      "Passiv: Ein schlanker, biegsamer Körper, der jeder Bewegung folgt. Gibt Geschick (0 → 6 mit der Übung): " +
      "bessere Treffer, Gegner treffen seltener gut. Lernt durch Absorbieren und Analysieren. Quelle: Mauswiesel.",
    effects: [
      {
        trigger: "passive",
        effectType: "dexterity",
        formula: { start: 0, max: 6 },
        reasoning:
          "Wiesel folgen Mäusen bis in ihre Gänge; ihr Körper ist so schlank und biegsam, dass er durch ein " +
          "Mauseloch passt. Geschick 0 → 6, bei Natur 5,4 — das meiste Geschick aus einem Skill, weil Wendigkeit " +
          "sonst nichts gibt (Vorschlag Claude, offen). [VERWORFEN, 21. November 2026] „mehr Tempo beim " +
          "Richtungswechsel“ — braucht eine Kurvenmechanik, die es nicht gibt.",
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
      "Passiv: Regeneriert langsam HP — immer, auch im Kampf. " +
      "Wirkt automatisch nach Entdeckung. 0,1 → 1,2 HP/s mit der Übung.",
    effects: [
      {
        trigger: "passive",
        effectType: "regen_hp",
        formula: { start: 0.1, max: 1.2 },
        reasoning:
          "0,1 → 1,2 HP/s, bei Natur 1,09 HP/s (bisher 1,1); stufenlos, immer — auch im Kampf. " +
          "Vorgabe (Entwickler): Die Regeneration ist viel zu stark. Begründung (Vorschlag Claude): Fotosynthese " +
          "liefert einem Tier wenig Energie — Schnecken mit eingelagerten Chloroplasten (Elysia) überleben damit " +
          "wochenlang, wachsen aber kaum. Ein Blob mit 80 HP braucht bei Natur rund eine Minute, um sich voll zu " +
          "heilen. VORLÄUFIG. Startwert 0,1 HP/s: kleinster Wert, der noch etwas bewirkt. " +
          "[VERWORFEN, 1. November 2026] 0,2 + 0,1 × (u − 1) HP/s (Schema-Umstellung). " +
          "[VERWORFEN, 1. November 2026] 0,5 × u HP/s (u 10 → 5 HP/s).",
      },
    ],
    practice: {
      unit: "hp_healed", xpPer: 0.25,
      reasoning:
        "Vorgabe (Entwickler, 1. November 2026): Die Regeneration ist viel zu schnell auf dem höchsten Rang. " +
        "Begründung (Vorschlag Claude): Photosynthese läuft passiv mit, ohne dass der Spieler etwas tut — sie " +
        "soll langsamer lernen als Fähigkeiten, die man im Kampf einsetzen muss. 0,25 XP je geheiltem HP: mit " +
        "der schwächeren Heilung grob eine Stunde Heilen bis Natur. VORLÄUFIG. [VERWORFEN] 1 XP je HP: Natur " +
        "nach wenigen Minuten.",
    },
  },
  {
    id: "grow",
    name: "Wachsen",
    element: "nature",
    icon: "🌱",
    category: "basic",
    activation: "passive",
    // Begründung (Vorschlag Claude, offen): wie Photosynthese — ein
    // Körpervorgang, der passiv mitläuft; Natur bei ≈ 600 verdauten Fasern.
    learningEffort: 15,
    description:
      "Passiv: Der Blob verdaut über die Zeit Pflanzenfasern aus seinem Lager und wird daraus größer — " +
      "mehr Körpermasse heißt mehr Größe, MaxHP und MaxMP. Verdaut 2 → 30 Fasern pro Minute mit der Übung. " +
      "Ausschalten, um Fasern aufzuheben. Quelle: Gras.",
    // Allgemeine Regeln des Wachsens (Nahrung, Wachstum aus Körpermasse): src/data/grow.ts
    effects: [
      {
        trigger: "passive",
        effectType: "digest_rate",
        formula: { start: 2, max: 30 },
        reasoning:
          "Verdaute Pflanzenfasern pro Minute Spielzeit: 2 → 30, bei Natur 27,2. Begründung (Vorschlag Claude, " +
          "offen): Ein Grashalm bringt im Schnitt 2 Fasern. Am Anfang verdaut der Blob einen Halm pro Minute — " +
          "Wachsen ist spürbar, aber langsam. Geübt schafft er einen Halm alle paar Sekunden, so schnell, wie man " +
          "Gras sammeln kann; dann begrenzt die Nahrung, nicht die Verdauung.",
      },
    ],
    practice: {
      unit: "fiber_digested", xpPer: 1,
      reasoning:
        "Begründung (Vorschlag Claude, offen): Wie bei Photosynthese (XP je geheiltem HP) zählt, was der Skill " +
        "tatsächlich bewirkt hat. 1 XP je verdauter Faser — mit Lernaufwand 15 liegt Natur bei rund 600 " +
        "verdauten Fasern.",
    },
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
