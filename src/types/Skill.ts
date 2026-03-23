// ============================================================
// SKILL TYPES
// Absorb & Evolve — Core Type Definitions
// Keine Phaser-Abhängigkeit. Reine Datenstrukturen.
// ============================================================

import type { MaterialStack } from "./Material";

// Element-Typen — erweiterbar durch neue Einträge hier
export type ElementType =
  | "fire"
  | "water"
  | "earth"
  | "wind"
  | "slime"
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

  // Für aktive Skills (Kampf, v0.3)
  baseDamage?: number;
  mpCost?: number;
  cooldownMs?: number;

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
