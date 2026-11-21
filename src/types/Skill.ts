// ============================================================
// SKILL TYPES
// Absorb & Evolve — Core Type Definitions
// Keine Phaser-Abhängigkeit. Reine Datenstrukturen.
// ============================================================

import type { MaterialStack } from "./Material";
import type { AttackType, DamageType, HitProfile, StatusEffectType } from "./Combat";

// Element-Typen — erweiterbar durch neue Einträge hier
export type ElementType =
  | "fire"
  | "water"
  | "earth"
  | "wind"
  | "blob"
  | "poison"
  | "dark"
  | "light"
  | "nature"  // Pflanzenskills
  | "none";   // Kern-Fähigkeiten (Analyze, Absorb)

// Wie ein Skill erworben wird:
//   core  = angeboren, immer vorhanden (Analyze, Absorb)
//   basic = durch Entitäten entdeckbar
//   combo = durch Kombinieren zweier basic-Skills
export type SkillCategory = "core" | "basic" | "combo";

// Wie ein Skill wirkt:
//   active  = wird bewusst eingesetzt (Angriff, Fähigkeit)
//   passive = wirkt automatisch wenn entdeckt (immer aktiv)
export type SkillActivation = "active" | "passive";

// -----------------------------------------------------------
// SkillEffect-System (GDD-05)
// -----------------------------------------------------------

/** Wann feuert der Effekt? */
export type EffectTrigger =
  | "passive"           // Dauerhaft aktiv solange Skill entdeckt und enabled
  | "on_hit_enemy"      // Bei jedem erfolgreichen Treffer gegen einen Gegner
  | "on_receive_damage" // Wenn der Träger Schaden erhält
  | "on_activate"       // Wenn Skill manuell aktiviert wird
  | "on_kill"           // Wenn ein Gegner durch den Träger stirbt
  | "per_second"        // Einmal pro Sekunde
  | "on_move";          // Solange sich der Träger bewegt

/** Was tut der Effekt? */
export type EffectType =
  | "deal_damage"        // Verursacht Schaden (formula: HP)
  | "flat_block"         // Blockiert feste HP (formula: HP, absolute)
  | "percent_reduce"     // Reduziert Schaden um % (formula: 0.0–1.0)
  | "weakness"           // Multipliziert eingehenden Schaden (formula: Faktor >1.0)
  | "heal_flat"          // Heilt X HP (formula: HP)
  | "heal_percent"       // Heilt X% max HP (formula: 0.0–1.0)
  | "apply_status"       // Appliziert Status-Effekt; formula = Anwendungschance
  | "inject_venom"       // Spritzt Gift ein (Giftlast, VenomSystem); formula = Chance, venomDose = Dosis
  | "reflect_damage"     // Gibt Schaden zurück (formula: HP)
  | "damage_mult"        // Multiplikativer Schadensbonus (formula: Faktor)
  | "speed_mod"          // Geschwindigkeits-Modifikator (formula: Faktor)
  | "grant_penetration"  // Ignoriert X HP Flat-Block beim Angriff (formula: HP)
  | "dexterity"          // Geschick-Punkte: bessere Treffer-Stufen, Ausweichen (formula: Punkte)
  | "strength"           // Stärke-Punkte: verstärkt Angriffe, die mit Stärke skalieren (formula: Punkte)
  | "move_speed"         // Bewegungstempo als Faktor des Grundtempos (formula: Faktor; der beste Skill zählt)
  | "sight_range"        // Sichtweite in Körperradien (formula: Radien; der beste Skill zählt)
  | "color_vision"       // Farbsehen ohne Rot, 0–1 (formula: Anteil; der beste Skill zählt)
  | "red_vision"         // Rot sehen, 0–1 (formula: Anteil; der beste Skill zählt)
  | "jump_distance"      // Sprungweite in Weltpixeln (formula: px; trigger on_activate)
  | "regen_hp"           // HP-Regeneration, stufenlos (formula: HP pro Sekunde; StatusEffectSystem)
  | "digest_rate"        // Verdauung: Nahrung pro Minute Spielzeit (formula: Fasern/min; GrowSystem)
  | "digest_mult"        // Verdauungs-Faktor auf Grow (formula: Faktor; GrowSystem, z. B. Heißhunger)
  | "evade"              // Ausweichen: Chance, einem Treffer ganz zu entgehen (formula: 0–1; trigger on_receive_damage)
  | "venom_resist"       // Giftresistenz: Anteil jeder Giftdosis, der neutralisiert wird (formula: 0–1; trigger on_receive_damage)
  | "lethal_save"        // Einmal einen tödlichen Treffer mit 1 HP überstehen; formula = Zeit bis es wieder geht (s)
  | "distract";          // Lenkt Gegner ab, wenn lethal_save auslöst (formula: Sekunden)

/**
 * Charakter-Eigenschaften. Sie kommen nur aus Skills (GDD-02 Abschnitt 8.1):
 * Summe der passiven Effekte gleichen Namens.
 */
export type Attribute = "strength" | "dexterity";

/**
 * Wie der SCHADEN eines Angriffs-Skills mit einer Eigenschaft skaliert (GDD-02 Abschnitt 8.11):
 * Schaden × (1 + Σ perPoint × Punkte der Eigenschaft).
 * Vorgabe (Entwickler, 13. November 2026): An den Skills steht, mit welcher
 * Eigenschaft sie wie skalieren; ein Skill kann mit mehreren skalieren.
 * Vorgabe (Entwickler, 13. November 2026): Geschick erhöht die Präzision
 * (Treffer-Stufen, HitSystem), nicht den Schaden — zumindest bei Schlägen
 * und Bissen. Begründung (Entwickler): Geschick lässt besser treffen, nicht
 * fester zuschlagen. Präzision gilt für jeden Angriff und steht nicht hier.
 */
export interface AttributeScaling {
  attribute: Attribute;
  /** Schadensbonus je Punkt, z. B. 0.08 = +8 % je Punkt */
  perPoint: number;
  reasoning: string;            // Pflichtfeld — Warum skaliert der Skill so?
}

/**
 * Wodurch ein Skill außerhalb von Absorb/Analyze und Kampf Erfahrung bekommt
 * (Übung durch Tun). Die Menge steht am Skill, damit jeder Skill einzeln
 * balanciert werden kann.
 * Vorgabe (Entwickler, 14. November 2026): Was zu einem Skill gehört, wird am
 * Skill konfiguriert; allgemeine Regeln stehen in src/data/balance.ts.
 *   body_radius_moved — je zurückgelegtem Körperradius (nur der Bewegungs-Skill,
 *                       mit dem sich der Blob gerade bewegt: data/body.ts)
 *   second_enabled    — je Sekunde Spielzeit, solange eingeschaltet
 *   hp_healed         — je tatsächlich geheiltem HP
 *   fiber_digested    — je verdauter Pflanzenfaser
 *   triggered         — je Auslösen (seltene Effekte wie Schwanz abwerfen)
 */
export type PracticeUnit = "body_radius_moved" | "second_enabled" | "hp_healed" | "fiber_digested" | "triggered";

export interface SkillPractice {
  unit: PracticeUnit;
  /** Erfahrung je Einheit */
  xpPer: number;
  reasoning: string;            // Pflichtfeld — Warum lernt der Skill so schnell?
}

/**
 * Ein Skill-Wert: läuft mit dem Fortschritt p (0 … 1) vom Startwert zum
 * Höchstwert —  Wert = start + (max − start) × p.
 * p folgt stetig aus der Erfahrung (ProgressionSystem.progressFromXp) und
 * erreicht 1 nie; bei Natur (90 %) ist der Wert start + 0,9 × (max − start).
 * Allgemeines Schema für alle Skills: src/data/progression.ts Abschnitt 1.
 * Konstante Werte (z. B. Materialschwächen): start = max.
 *
 * Für absolute Effekte (flat_block, deal_damage, heal_flat, reflect_damage,
 * grant_penetration) und Schaden: Wert in Display-HP-Einheiten (×1000 = milli-HP).
 * Für Faktoren und Prozentwerte: Wert direkt.
 */
export interface SkillValue {
  start: number;
  max: number;
}

/** Optionale Bedingung für einen SkillEffect */
export interface EffectCondition {
  damageType?: DamageType | DamageType[];  // Nur bei diesem Schadenstyp
  hpBelow?: number;                        // Nur wenn HP < X% von max (0.0–1.0)
  hpAbove?: number;                        // Nur wenn HP > X% von max (0.0–1.0)
  hasStatus?: string;                      // Nur wenn dieser Status-Effekt aktiv
}

/** Optionale Konfiguration für apply_status-Effekte */
export interface StatusConfig {
  type: StatusEffectType;
  durationMs: number;
  tickIntervalMs?: number;
  damageFormula?: SkillValue;   // für DoT: Schaden/Tick in HP-Einheiten
  healFormula?: SkillValue;    // für HoT: Heilung/Tick in HP-Einheiten
}

/**
 * Ein einzelner deklarativer Effekt eines Skills.
 * Alle Formeln sind selbstbeschreibend — kein Skill-spezifischer Code in Systemen.
 */
export interface SkillEffect {
  trigger: EffectTrigger;
  condition?: EffectCondition;
  effectType: EffectType;
  formula: SkillValue;
  damageType?: DamageType;      // Welchen Schadenstyp betrifft der Effekt
  statusConfig?: StatusConfig;  // Nur für apply_status-Effekte
  venomDose?: SkillValue;    // Nur für inject_venom: Giftdosis je Biss in HP (src/data/venom.ts)
  reasoning: string;            // Pflichtfeld — Warum verhält sich der Effekt so?
}

// -----------------------------------------------------------
// SkillDefinition: Die unveränderliche Blaupause eines Skills
// (kommt aus data/skills.ts, wird nie verändert)
// -----------------------------------------------------------
export interface SkillDefinition {
  id: string;
  name: string;
  element: ElementType;
  icon: string;
  category: SkillCategory;
  activation: SkillActivation;
  /**
   * Lernaufwand: wie viel Erfahrung der Skill für einen Fortschritt braucht.
   * Doppelter Aufwand = doppelt so viel XP für dieselbe Wirkung und doppelt so
   * viel Kapazität (progression.ts Abschnitt 1).
   */
  learningEffort: number;
  description: string;

  // Für aktive Skills (Kampf)
  damage?: SkillValue;           // Angriffsschaden in HP: start → max mit dem Fortschritt
  damageType?: DamageType;       // Schadenstyp des Angriffs (pierce, slash, fire, …)
  hitProfile?: HitProfile;       // Treffer-Stufen bei Lv1 ohne Geschick (Standard: DEFAULT_HIT_PROFILE)
  mpCost?: number;
  cooldownMs?: number;
  attackType?: AttackType;       // Wie der Angriff ausgeführt wird
  scaling?: AttributeScaling[];  // Mit welchen Eigenschaften der Schaden wächst (keine = keine)

  // Deklarative Effekt-Liste (GDD-05) — bevorzugt gegenüber hardcoded Logik
  effects?: SkillEffect[];

  // Erfahrung durch Tun (Bewegen, Sehen, Heilen, Verdauen) — siehe SkillPractice
  practice?: SkillPractice;

  // Materialkosten bei Aktivierung (z.B. grow)
  materialCost?: MaterialStack[];

  // Nur für Combo-Skills
  recipe?: [string, string];
}

// -----------------------------------------------------------
// SkillProgress: Erfahrungsstand eines Skills oder einer Kern-Fähigkeit
// Regeln dazu: src/data/progression.ts + src/systems/ProgressionSystem.ts
// -----------------------------------------------------------
export interface SkillProgress {
  xp: number;                // aktuelle Erfahrung — bestimmt die Wirkung, belegt Kapazität
  peakXp: number;            // höchste je erreichte Erfahrung — bis dahin doppelt schnell wiedererlernen
  pendingXp: number;         // durch Übertraining zurückgehalten — kommt in der Ruhe nach
  fatigue: number;           // Übertrainings-Ermüdung (in XP)
  fatigueUpdatedAt: number;  // Echtzeit (ms) der letzten Ruhe-Verbuchung
  lastTrainedRealMs: number; // Echtzeit (ms) der letzten Übung — Ruhe beginnt danach
  lastPracticedAt: number;   // Spielzeit (s) der letzten Übung — am längsten Ungeübtes wird zuerst verlernt
  totalXpEarned: number;     // je gutgeschriebene Erfahrung (Statistik, sinkt nie)
}

/** Rangwechsel eines Skills — für Log und Anzeige. */
export interface ProgressionEvent {
  skillId: string;
  kind: "rank_up" | "rank_down";
  rankName: string;
}

/** Frischer Fortschritt ohne Erfahrung. */
export function createSkillProgress(nowMs: number, playtimeSeconds: number): SkillProgress {
  return {
    xp: 0, peakXp: 0, pendingXp: 0, fatigue: 0,
    fatigueUpdatedAt: nowMs, lastTrainedRealMs: 0,
    lastPracticedAt: playtimeSeconds, totalXpEarned: 0,
  };
}

// -----------------------------------------------------------
// SkillInstance: Der Zustand eines Skills beim Spieler
// (lebt im GameState, verändert sich während des Spiels)
// -----------------------------------------------------------
export interface SkillInstance extends SkillProgress {
  definitionId: string;
  discoveredAt: number;             // Timestamp der Entdeckung (0 für core)
  isEnabled: boolean;               // false = passiver Skill manuell deaktiviert
}

// -----------------------------------------------------------
// Interaktions-Methoden und Ergebnisse
// -----------------------------------------------------------
export type DiscoveryMethod = "absorb" | "analyze";

export interface SkillDiscoveryResult {
  skillId: string;
  method: DiscoveryMethod;
  xpGained: number;
  wasNewDiscovery: boolean;
  events: ProgressionEvent[];       // Rangwechsel (auch verlernte Skills)
}

// -----------------------------------------------------------
// CombineResult: Ergebnis eines Kombinationsversuchs
// -----------------------------------------------------------
export type CombineOutcome =
  | "success_new"     // Neuer Combo-Skill entdeckt
  | "success_xp"      // Bereits bekannt → XP erhalten
  | "no_recipe"       // Kombination existiert nicht
  | "invalid_input";  // Gleicher Skill doppelt, oder Combo als Input

export interface CombineResult {
  outcome: CombineOutcome;
  resultSkillId?: string;
  xpGained?: number;
  message: string;
}
