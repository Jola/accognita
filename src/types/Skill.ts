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
  | "reflect_damage"     // Gibt Schaden zurück (formula: HP)
  | "damage_mult"        // Multiplikativer Schadensbonus (formula: Faktor)
  | "speed_mod"          // Geschwindigkeits-Modifikator (formula: Faktor)
  | "grant_penetration"  // Ignoriert X HP Flat-Block beim Angriff (formula: HP)
  | "dexterity";         // Geschick-Punkte: bessere Treffer-Stufen, Ausweichen (formula: Punkte)

/**
 * Formel: Wert bei Übungsgrad u = base + perLevel × f(u−1)
 * u ist stetig und folgt aus der Erfahrung (ProgressionSystem.practiceFromXp).
 * „perLevel“ = Zuwachs je ganzer Einheit Übungsgrad; dazwischen fließend.
 * curve "linear" (Standard): f(n) = n
 * curve "sqrt":  f(n) = sqrt(n)   → stark zu Beginn, flacht ab
 * curve "log":   f(n) = log2(n+1) → sehr stark zu Beginn
 *
 * Für absolute Effekte (flat_block, deal_damage, heal_flat, reflect_damage,
 * grant_penetration): Wert in Display-HP-Einheiten (÷1000 = milli-HP).
 * Für Faktoren und Prozentwerte: Wert direkt.
 */
export interface LinearFormula {
  base: number;
  perLevel: number;
  curve?: "linear" | "sqrt" | "log";
  max?: number;   // Obergrenze des Ergebnisses (z.B. 1.0 für Chancen)
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
  damageFormula?: LinearFormula;  // für DoT: Schaden/Tick in HP-Einheiten
  healFormula?: LinearFormula;    // für HoT: Heilung/Tick in HP-Einheiten
}

/**
 * Ein einzelner deklarativer Effekt eines Skills.
 * Alle Formeln sind selbstbeschreibend — kein Skill-spezifischer Code in Systemen.
 */
export interface SkillEffect {
  trigger: EffectTrigger;
  condition?: EffectCondition;
  effectType: EffectType;
  formula: LinearFormula;
  damageType?: DamageType;      // Welchen Schadenstyp betrifft der Effekt
  statusConfig?: StatusConfig;  // Nur für apply_status-Effekte
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
  baseDamage?: number;
  damageType?: DamageType;       // Schadenstyp des Angriffs (pierce, slash, fire, …)
  hitProfile?: HitProfile;       // Treffer-Stufen bei Lv1 ohne Geschick (Standard: DEFAULT_HIT_PROFILE)
  mpCost?: number;
  cooldownMs?: number;
  attackType?: AttackType;       // Wie der Angriff ausgeführt wird

  // Deklarative Effekt-Liste (GDD-05) — bevorzugt gegenüber hardcoded Logik
  effects?: SkillEffect[];

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
