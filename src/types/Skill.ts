// ============================================================
// SKILL TYPES
// Absorb & Evolve — Core Type Definitions
// Keine Phaser-Abhängigkeit. Reine Datenstrukturen.
// ============================================================

import type { MaterialStack } from "./Material";
import type { AttackType, DamageType, StatusEffectType } from "./Combat";

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
  | "grant_penetration"; // Ignoriert X HP Flat-Block beim Angriff (formula: HP)

/**
 * Lineare Formel: Wert bei Level L = base + perLevel × f(L-1)
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
  maxLevel: number;
  baseXpThreshold: number;          // XP für Level 1 → 2
  xpThresholdMultiplier: number;    // Faktor pro Level (GDD: 1.5)
  description: string;

  // Für aktive Skills (Kampf)
  baseDamage?: number;
  damageType?: DamageType;       // Schadenstyp des Angriffs (pierce, slash, fire, …)
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
// SkillInstance: Der Zustand eines Skills beim Spieler
// (lebt im GameState, verändert sich während des Spiels)
// -----------------------------------------------------------
export interface SkillInstance {
  definitionId: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  discoveredAt: number;             // Timestamp der Entdeckung (0 für core)
  totalXpEarned: number;
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
  leveledUp: boolean;
  newLevel?: number;
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
