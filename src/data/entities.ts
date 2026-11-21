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
//   - lengthCm: echte Durchschnittslänge in cm (Vorgabe Entwickler,
//     21. November 2026). worldSize wird NICHT eingetragen, sondern beim
//     Laden über die Größenskala berechnet (balance.ts worldSizeFromLength,
//     heute 3 × √(Länge / 0,6 cm); resolveEntitySize unten).
//   - speedPerSize / reachPerSize / aggroPerSize / rangedReachPerSize:
//     Tempo, Reichweite, Aggro-Radius, Fernkampf als Vielfache von
//     worldSize — sie wachsen mit der Größe mit (Vorgabe Entwickler).
//     Grundregel 5 × / 2 × / 2,5 ×; Abweichungen aus Realismus oder Balance
//     stehen am Wesen. Begründung (Vorschlag Claude, offen) für alle
//     Abweichungen. Die Kommentare „≈ … px“ zeigen die heutigen Werte.
//     Die alten Werte stehen als [VERWORFEN] dabei.
// ============================================================

import type { EntityDefinition } from "../types/Entity";
import { worldSizeFromLength } from "./balance";

// Roh-Daten: echte Länge und Folgewerte als Vielfache der Größe.
// ENTITY_DEFINITIONS (unten) enthält die daraus berechneten Spielwerte.
const ENTITY_DATA: EntityDefinition[] = [

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
      // Vorgabe (Entwickler, 13. November 2026): Grow lernt man von Gras.
      // 20 % (Vorschlag Claude, offen): etwas häufiger als Photosynthese,
      // weil Wachsen die einzige Art ist, größer zu werden.
      { skillId: "grow", chance: 0.20 },
    ],
    materialDrops: [
      { materialId: "plant_fiber", amountMin: 1, amountMax: 3, chance: 1.00 },
    ],
    respawnTime: 60, // 1 Minute — wächst nach
    interactRadius: 50,
    lengthCm: 15,    // Wuchshöhe eines Grasbüschels ([VERWORFEN] worldSize 5 — „etwas größer als ein frischer Blob“)
  },

  // ==========================================================
  // WEICHTIERE UND WÜRMER — Level 1 (neutral, passiv, harmlos)
  // Vorgabe (Entwickler, 13. November 2026): Wurm und Schnecke geben
  //   Kriechen; an ihnen lernt der Blob im Erwachen Bewegen und Sehen
  //   (GDD-09). Ein Paar liegt fest am Startpunkt (Nest, BiomeDefinitions).
  // Begründung (Vorschlag Claude, übernommen): Sie greifen nie an
  //   (behavior passive), respawnen schnell und haben hohe Fundchancen,
  //   damit das Erwachen nicht hängen bleibt — ein blinder, unbeweglicher
  //   Blob erreicht nur, was direkt neben ihm liegt. Zahlen VORLÄUFIG.
  // ==========================================================

  {
    id: "earthworm",
    name: "Regenwurm",
    icon: "🪱",
    behavior: "passive",
    disposition: "neutral",
    category: "creature",
    rarity: "common",
    level: 1,
    skillDrops: [
      // Lichtempfindliche Hautzellen, keine Augen — der erste Lichtsinn
      { skillId: "light_sense", chance: 0.50 },
      // Kriecht mit Wellen von Muskelkontraktionen
      { skillId: "crawl",       chance: 0.35 },
    ],
    materialDrops: [],
    hp: 4_000, speedPerSize: 0.4,   // ≈ 5 px/s — kriecht ≈ 2 cm/s, langsamer als eine Ameise ([VERWORFEN] speed 4)
    respawnTime: 10,
    interactRadius: 35,
    lengthCm: 12,
  },
  {
    id: "snail",
    name: "Schnecke",
    icon: "🐌",
    behavior: "passive",
    disposition: "neutral",
    category: "creature",
    rarity: "common",
    level: 1,
    skillDrops: [
      // Gleitet auf einem Schleimfilm — die Fortbewegung, die dem Blob am nächsten ist
      { skillId: "crawl",       chance: 0.50 },
      // Einfache Augen auf den Fühlern, farbenblind
      { skillId: "light_sense", chance: 0.35 },
    ],
    materialDrops: [],
    hp: 5_000, speedPerSize: 0.35,   // ≈ 3 px/s — langsamstes Wesen, ≈ 1 mm/s ([VERWORFEN] speed 3)
    respawnTime: 10,
    interactRadius: 35,
    lengthCm: 5,     // Weinbergschnecke mit Fuß
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
      { skillId: "scuttle",       chance: 0.15 }, // Sechs Beine (GDD-09, VORLÄUFIG)
      { skillId: "compound_eye",  chance: 0.10 }, // Facettenaugen
    ],
    materialDrops: [],
    hp: 8_000, speedPerSize: 5,   // ≈ 15 px/s — Grundregel ([VERWORFEN] speed 15, Reichweite 6, Aggro 8)
    reachPerSize: 2, attackCooldownMs: 1800, attackType: "melee",  // ≈ 6 px
    respawnTime: 30,
    interactRadius: 35,
    aggroPerSize: 2.5,   // ≈ 8 px
    lengthCm: 0.6,     // Bezugspunkt der Größenskala (worldSize 3; [VERWORFEN] worldSize 3 eingetragen)
    // bite 27 % (Übung) → 5 Schaden; chitin 0 % → blockt nichts
    // Vorgabe (Entwickler, 1. Nov. 2026): Die Ameise soll 5 Schaden machen.
    //   → Biss-Erfahrung 65,5 XP: 1 + (16 − 1) × 26,7 % = 5,0 HP
    //   ([VERWORFEN] bite 0 XP → 1 Schaden; davor u=1 → 7 Schaden;
    //    chitin u=1 → blockt 3 HP Stich)
    skillXp: { bite: 65.5, chitin_armor: 0 },
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
      { skillId: "hemolymph",    chance: 0.15 }, // Defensivgift bei Treffer
      { skillId: "scuttle",      chance: 0.15 }, // Sechs Beine (GDD-09, VORLÄUFIG)
      { skillId: "compound_eye", chance: 0.12 }, // Facettenaugen
    ],
    materialDrops: [],
    hp: 6_000, speedPerSize: 5,   // ≈ 16 px/s — Grundregel ([VERWORFEN] speed 20, Reichweite 8, Aggro 10)
    reachPerSize: 2, attackCooldownMs: 2000, attackType: "melee",  // ≈ 6 px
    respawnTime: 35,
    interactRadius: 35,
    aggroPerSize: 2.5,   // ≈ 8 px
    lengthCm: 0.7,
    // Kein bite — Marienkäfer greifen nicht aktiv an.
    // Hemolymph 0 %: 1 Rückschlag-Schaden wenn der Blob ihn trifft ([VERWORFEN] u=1: 2).
    skillXp: { hemolymph: 0 },
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
      { skillId: "scuttle",        chance: 0.15 }, // Acht Beine (GDD-09, VORLÄUFIG)
      { skillId: "principal_eyes", chance: 0.12 }, // Die schärfsten Augen der Kleintiere
    ],
    materialDrops: [],
    hp: 18_000, speedPerSize: 5,   // ≈ 17 px/s — Grundregel ([VERWORFEN] speed 30, Reichweite 12, Aggro 15)
    reachPerSize: 2, attackCooldownMs: 1200, attackType: "charge",  // ≈ 7 px
    respawnTime: 45,
    interactRadius: 40,
    aggroPerSize: 2.5,   // ≈ 9 px
    lengthCm: 0.8,     // Körper ohne Beine
    // bite 3 % → 1,4 Schaden; chitin_armor 11 % → blockt 1,4 HP Stich; jump 3 % → Geschick 0,1
    //   ([VERWORFEN] bite u=2 → 8 Schaden; chitin_armor u=3; jump u=2 → Geschick ≈2)
    skillXp: { bite: 6, chitin_armor: 24, jump: 6 },
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
      { skillId: "scuttle", chance: 0.15 }, // Acht Beine (GDD-09, VORLÄUFIG)
    ],
    materialDrops: [],
    hp: 15_000, speedPerSize: 5,   // ≈ 24 px/s — Grundregel ([VERWORFEN] speed 30, Reichweite 12, Aggro 15)
    reachPerSize: 2, attackCooldownMs: 1600, attackType: "melee",  // ≈ 9 px
    respawnTime: 50,
    interactRadius: 40,
    aggroPerSize: 2.5,   // ≈ 12 px
    lengthCm: 1.5,     // Körper ohne Beine (Kreuzspinne)
    // bite 0 % → 1 Schaden; venom 11 % → 8 % Chance auf 4 HP Gift; chitin_armor 11 % → blockt 1,4 HP Stich
    //   ([VERWORFEN] bite u=1 → 7; venom u=3 → 44 % auf 12 HP; chitin u=3 → blockt 7,2 HP Stich)
    skillXp: { bite: 0, venom: 30, chitin_armor: 24 },
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
      { skillId: "scuttle", chance: 0.12 }, // Acht Beine (GDD-09, VORLÄUFIG)
    ],
    materialDrops: [],
    hp: 30_000, speedPerSize: 5,   // ≈ 36 px/s — Grundregel ([VERWORFEN] speed 35, Reichweite 14, Aggro 18)
    reachPerSize: 2, attackCooldownMs: 1400, attackType: "melee",  // ≈ 14 px
    respawnTime: 60,
    interactRadius: 45,
    aggroPerSize: 2.5,   // ≈ 18 px
    lengthCm: 3.5,              // Europäischer Skorpion (Euscorpius) — Größe ≈ 7 wie bisher
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
      { skillId: "scuttle", chance: 0.12 }, // Acht Beine (GDD-09, VORLÄUFIG)
    ],
    materialDrops: [],
    hp: 55_000, speedPerSize: 4,   // ≈ 54 px/s — 4 statt 5: Skorpione lauern und laufen nur kurze Strecken ([VERWORFEN] speed 50, Reichweite 20, Aggro 25)
    reachPerSize: 2, attackCooldownMs: 1600, attackType: "melee",  // ≈ 27 px
    respawnTime: 120,
    interactRadius: 55,
    aggroPerSize: 2.5,   // ≈ 34 px
    lengthCm: 12,               // Kaiserskorpion
    // pincer 98 % → 15,8 Wucht; chitin 75 % → blockt 9,8 HP Stich;
    // venom_sting 64 % → 7,4 Stich + 64 % Chance auf 21 HP Gift
    //   ([VERWORFEN] pincer u=13 → 16; chitin u=8 → 10,9; venom_sting u=7 → 9 + 92 % auf 24 HP)
    // Vorgabe (Entwickler, 1. Nov. 2026): Skorpione etwas schwächer
    //   ([VERWORFEN] pincer u=18 → 20, Giftdosis 33)
    skillXp: { pincer: 864, chitin_armor: 294, venom_sting: 324 },
    // Stachel nur gelegentlich — Begründung beim kleinen Skorpion. VORLÄUFIG
    occasionalAttack: { skillId: "venom_sting", chance: 0.15 },
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
    // Größe eines Elefanten (Vorgabe Entwickler, 21. November 2026).
    // Alle Folgewerte zugunsten der Balance gedämpft — nach der Grundregel
    // wäre er 475 px/s schnell, griffe 190 px weit und spiee 760 px weit
    // Feuer (weiter als die KI rechnet, 500 px):
    //   Tempo 0,95 × worldSize (≈ 90): ein Elefant läuft ≈ 7 m/s, doppelt so
    //     schnell wie eine Maus; im Spiel knapp schneller als die Maus (≈ 81),
    //     aber langsamer als der ausgewachsene Blob (≈ 166 px/s) — man kann
    //     ihm davonlaufen ([VERWORFEN] 35).
    //   Nahkampf 1 × worldSize (≈ 95): Klauen und Kopf reichen ≈ 43 px über
    //     den Körper hinaus ([VERWORFEN] 40 — wäre jetzt kürzer als sein
    //     eigener Radius von 52 px).
    //   Feueratem 2,5 × worldSize (≈ 237, [VERWORFEN] 160 = 8 × 20).
    //   Aggro 2,5 × worldSize (≈ 237, [VERWORFEN] 50), so weit wie das Feuer.
    hp: 500_000, speedPerSize: 0.95,   // ≈ 90 px/s — gedämpft, Begründung oben ([VERWORFEN] speed 35, Reichweite 40, Feuer 160, Aggro 50)
    reachPerSize: 1, attackCooldownMs: 1800, attackType: "melee",  // ≈ 95 px
    rangedAttackSkillId: "fire_breath",
    rangedReachPerSize: 2.5,   // ≈ 237 px
    rangedAttackCooldownMs: 2500,
    respawnTime: 600,                // 10 Minuten — sehr seltener Spawn
    interactRadius: 80,
    aggroPerSize: 2.5,   // ≈ 237 px
    lengthCm: 600,                   // Elefant: Kopf-Rumpf ≈ 6 m
    // claw ≈ 100 % → 18 Nahkampf-Schaden (Höchstwert)
    // fire_breath ≈ 100 % → 23 Fernkampf-Schaden (Höchstwert)
    //   ([VERWORFEN] u=20 → 24 bzw. 31 — der alte Übungsgrad wuchs unbegrenzt)
    skillXp: { claw: 2707.5, fire_breath: 4512.5 },
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
    // Folgewerte gedämpft (Realismus): Schlangen kriechen ≈ 1 m/s, langsamer
    // als eine Maus — nach der Grundregel wären es 162 px/s.
    //   Tempo 2,2 × worldSize (≈ 71, [VERWORFEN] 60), unter der Maus (≈ 81).
    //   Reichweite 1,5 × worldSize (≈ 49, [VERWORFEN] 24): Sie schnellt etwa ein
    //     Drittel ihrer Länge vor.
    //   Aggro 2 × worldSize (≈ 65, [VERWORFEN] 30): Lauerjägerin, schlägt erst zu,
    //     wenn die Beute nah ist.
    hp: 120_000, speedPerSize: 2.2,   // ≈ 71 px/s — gedämpft, Begründung oben ([VERWORFEN] speed 60, Reichweite 24, Aggro 30)
    reachPerSize: 1.5, attackCooldownMs: 1200, attackType: "melee",  // ≈ 49 px
    respawnTime: 180,               // 3 Minuten — seltener Gegner
    interactRadius: 60,
    aggroPerSize: 2,   // ≈ 65 px
    lengthCm: 70,                   // Kreuzotter/Ringelnatter mit Schwanz
    // bite 90 % (Natur) → 14,5 Schaden; venom 51 % → 35 % Chance auf 15 HP Gift
    //   ([VERWORFEN] bite u=10 → 14; venom u=6 → 52 % auf 18 HP)
    // Vorgabe (Entwickler, 1. Nov. 2026): Schlangen beißen etwas weniger fest,
    //   ihr Gift war viel zu stark ([VERWORFEN] bite u=15 → 18 HP, venom u=15
    //   → 67 % auf 36 HP: alle 1,2 s gebissen ≈ 20 HP/s Gift im Dauerzustand).
    //   Jetzt ≈ 8 HP/s Gift im Dauerzustand. VORLÄUFIG
    skillXp: { bite: 486, venom: 187.5 },
  },

  // ==========================================================
  // WIRBELTIERE MIT BEINEN — Level 2–5 (GDD-07 Teil 7)
  // Vorgabe (Entwickler, 21. November 2026): Alle fünf sind gebaut und im
  //   INDEX zu sehen, aber noch nirgends platziert (nicht in BIOME_SPAWNS).
  //   Sie bringen Laufen (GDD-09 Abschnitt 2.4).
  // Begründung (Vorschlag Claude, offen) für alle Zahlen:
  //   - Größe seit 21. November 2026 nach der echten Länge (Größenskala).
  //     [VERWORFEN] worldSize 6–11 — „größer als Insekten, kleiner als die
  //     Schlange (12), der Maßstab ist gestaucht“.
  //   - Tempo nach der echten Höchstgeschwindigkeit geordnet: Mauswiesel
  //     (≈ 6 m/s) > Waldmaus (≈ 3,5 m/s) > Zauneidechse, Wasserspitzmaus,
  //     Igel (≈ 1,5–2 m/s). [VERWORFEN] Tempo über worldSize × 5.
  //   - Laufen steht nicht in skillXp: Bewegungs-Skills wirken bei Gegnern
  //     nicht (ihr Tempo ist speed); wie bei den Insekten und Krabbeln.
  //   - Angriffsreichweite 2 × worldSize, Aggro-Radius 2,5 × worldSize wie
  //     bei allen Wesen (wachsen mit der neuen Größe mit).
  //   VORLÄUFIG — Platzierung, Spawn-Dichte und Balance sind offen.
  // ==========================================================

  {
    id: "wood_mouse",
    name: "Waldmaus",
    icon: "🐁",
    behavior: "defensive",
    disposition: "neutral",   // scheu: greift nur an, wenn sie gestört wird
    category: "creature",
    rarity: "common",
    level: 2,
    skillDrops: [
      { skillId: "run",    chance: 0.18 }, // Häufigstes Wirbeltier — der einfachste Weg zu Laufen
      { skillId: "gnaw",   chance: 0.15 }, // Nagezähne
      { skillId: "zigzag", chance: 0.12 }, // Fluchtverhalten
    ],
    materialDrops: [],
    hp: 14_000, speedPerSize: 7,   // ≈ 81 px/s — ≈ 3,5 m/s, schnell wie bisher ([VERWORFEN] speed 50, Reichweite 14, Aggro 18)
    reachPerSize: 2, attackCooldownMs: 900, attackType: "melee",  // ≈ 23 px
    respawnTime: 40,
    interactRadius: 45,
    aggroPerSize: 2.5,   // ≈ 29 px
    lengthCm: 9,                    // ohne Schwanz
    // gnaw 57 % → 5,0 Schnitt; zigzag 38 % → 7,5 % Ausweichen, Geschick 1,5
    skillXp: { gnaw: 120, zigzag: 100 },
    // Vorgabe (Entwickler, 21. November 2026): Die Waldmaus greift einmal an
    //   und haut dann 1 s im Zickzack ab. Ist der Blob danach noch in
    //   Reichweite (2 Mauslängen), greift sie wieder an und haut wieder ab;
    //   sonst greift sie nicht mehr an und läuft weiter weg.
    // Mauslänge = Durchmesser ihres Symbols (2 × 0,55 × worldSize ≈ 12,8 px,
    // [VERWORFEN] 7,7 px). Auf der Flucht kommt sie ≈ 28 px/s vom Blob weg.
    hitAndRun: { fleeMs: 1000, reengageLengths: 2 },
  },
  {
    id: "water_shrew",
    name: "Wasserspitzmaus",
    icon: "🐀",
    behavior: "aggressive",
    disposition: "hostile",
    category: "creature",
    rarity: "uncommon",
    level: 3,
    skillDrops: [
      { skillId: "run",      chance: 0.15 },
      { skillId: "bite",     chance: 0.12 },
      { skillId: "venom",    chance: 0.15 }, // Giftiger Speichel — eines der wenigen giftigen Säugetiere
      { skillId: "voracity", chance: 0.15 }, // Rasender Stoffwechsel
    ],
    materialDrops: [],
    hp: 16_000, speedPerSize: 5.5,   // ≈ 60 px/s — langsamer als die Waldmaus, an Land eher wuselnd ([VERWORFEN] speed 45, Reichweite 12, Aggro 15)
    reachPerSize: 2, attackCooldownMs: 1100, attackType: "melee",  // ≈ 22 px
    respawnTime: 50,
    interactRadius: 40,
    aggroPerSize: 2.5,   // ≈ 27 px
    lengthCm: 8,                    // ohne Schwanz
    // bite 38 % → 6,7 Stich; venom 20 % → 14 % Chance auf 6,7 HP Gift
    //   (schwächer als die Schlange; Spitzmausgift lähmt Insekten und Frösche)
    skillXp: { bite: 100, venom: 60 },
  },
  {
    id: "sand_lizard",
    name: "Zauneidechse",
    icon: "🦎",
    behavior: "defensive",
    disposition: "neutral",
    category: "creature",
    rarity: "uncommon",
    level: 3,
    skillDrops: [
      { skillId: "run",       chance: 0.15 },
      { skillId: "snap_bite", chance: 0.12 },
      { skillId: "tail_drop", chance: 0.12 },
    ],
    materialDrops: [],
    hp: 22_000, speedPerSize: 4,   // ≈ 69 px/s — kurze Sprints, langsamer als die Maus ([VERWORFEN] speed 55, Reichweite 16, Aggro 20)
    reachPerSize: 2, attackCooldownMs: 1600, attackType: "melee",  // ≈ 35 px
    respawnTime: 60,
    interactRadius: 45,
    aggroPerSize: 2.5,   // ≈ 43 px
    lengthCm: 20,                   // mit Schwanz (Kopf-Rumpf ≈ 9 cm)
    // snap_bite 51 % → 7,6 Stich (viele schwere Treffer).
    // Schwanz abwerfen wirkt nur beim Blob — Gegner werfen (noch) keinen ab.
    skillXp: { snap_bite: 150 },
  },
  {
    id: "hedgehog",
    name: "Igel",
    icon: "🦔",
    behavior: "defensive",
    disposition: "neutral",
    category: "creature",
    rarity: "uncommon",
    level: 4,
    skillDrops: [
      { skillId: "run",              chance: 0.12 },
      { skillId: "bite",             chance: 0.10 },
      { skillId: "spines",           chance: 0.20 }, // Das Merkmal des Igels
      { skillId: "venom_resistance", chance: 0.15 },
    ],
    materialDrops: [],
    hp: 45_000, speedPerSize: 2.8,   // ≈ 54 px/s — läuft bis ≈ 2 m/s, meist gemächlich ([VERWORFEN] speed 40, Reichweite 22, Aggro 28)
    reachPerSize: 2, attackCooldownMs: 1500, attackType: "melee",  // ≈ 39 px
    respawnTime: 90,
    interactRadius: 55,
    aggroPerSize: 2.5,   // ≈ 48 px
    lengthCm: 25,
    // bite 51 % → 8,6 Stich; spines 25 % → 4,5 HP Rückschlag, blockt 1,2 HP Stich/Schnitt;
    // venom_resistance 76 % → fängt 46 % jeder Giftdosis ab.
    // Rückschlag bewusst niedrig: Er trifft jeden Angriff des Blobs, auch frische mit 1–5 HP.
    skillXp: { bite: 150, spines: 60, venom_resistance: 300 },
  },
  {
    id: "least_weasel",
    name: "Mauswiesel",
    icon: "🦦",
    behavior: "aggressive",
    disposition: "hostile",
    category: "creature",
    rarity: "rare",
    level: 5,
    skillDrops: [
      { skillId: "run",       chance: 0.20 },
      { skillId: "neck_bite", chance: 0.15 },
      { skillId: "agility",   chance: 0.15 },
    ],
    materialDrops: [],
    hp: 40_000, speedPerSize: 6,   // ≈ 99 px/s — schnellstes Wirbeltier, schneller als die Maus ([VERWORFEN] speed 70, Reichweite 20, Aggro 25)
    reachPerSize: 2, attackCooldownMs: 1300, attackType: "melee",  // ≈ 33 px
    respawnTime: 120,
    interactRadius: 50,
    aggroPerSize: 2.5,   // ≈ 41 px
    lengthCm: 18,                   // ohne Schwanz
    // neck_bite 61 % → 9,0 Stich, 15 % kritisch; agility 76 % → Geschick 4,6.
    // Jagt Mäuse (Level 2): Gegner jagen Wesen 1–3 Level unter sich (GDD-03 Abschnitt 9).
    skillXp: { neck_bite: 250, agility: 300 },
  },
];

// -----------------------------------------------------------
// GRÖSSE AUSRECHNEN
// Vorgabe (Entwickler, 21. November 2026): Die echte Größe wird
// eingetragen, die Skala erst beim Anzeigen angewendet — so lässt sie sich
// leicht anpassen. worldSize = Größenskala(lengthCm) (balance.ts), daraus
// speed, attackRangePx, aggroRadius, rangedAttackRangePx als Vielfache.
// Alle anderen Teile des Spiels lesen nur die berechneten Felder.
// -----------------------------------------------------------
export function resolveEntitySize(e: EntityDefinition): EntityDefinition {
  if (e.lengthCm === undefined) return e;
  const ws = worldSizeFromLength(e.lengthCm);
  const r: EntityDefinition = { ...e, worldSize: ws };
  if (e.speedPerSize !== undefined)       r.speed = e.speedPerSize * ws;
  if (e.reachPerSize !== undefined)       r.attackRangePx = e.reachPerSize * ws;
  if (e.aggroPerSize !== undefined)       r.aggroRadius = e.aggroPerSize * ws;
  if (e.rangedReachPerSize !== undefined) r.rangedAttackRangePx = e.rangedReachPerSize * ws;
  return r;
}

export const ENTITY_DEFINITIONS: EntityDefinition[] = ENTITY_DATA.map(resolveEntitySize);

// Schnellzugriffs-Map
export const ENTITY_MAP: Map<string, EntityDefinition> = new Map(
  ENTITY_DEFINITIONS.map((e) => [e.id, e])
);
