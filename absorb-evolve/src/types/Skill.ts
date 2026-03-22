// ============================================================
// SKILL TYPES
// Absorb & Evolve — Core Type Definitions
// Keine Phaser-Abhängigkeit. Reine Datenstrukturen.
// ============================================================

export type ElementType =
  | "fire"
  | "water"
  | "earth"
  | "wind"
  | "slime"
  | "poison"
  | "dark"
  | "light";

export type SkillCategory = "basic" | "combo";

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
  maxLevel: number;
  baseXpThreshold: number;       // XP für Level 1 → 2
  xpThresholdMultiplier: number; // Faktor pro Level (GDD: 1.5)
  description: string;

  // Kampfwerte (für späteres Kampfsystem, v0.2)
  baseDamage?: number;
  mpCost?: number;
  cooldownMs?: number;

  // Nur für Combo-Skills
  recipe?: [string, string];     // z.B. ["fire", "water"]
}

// -----------------------------------------------------------
// SkillInstance: Der Zustand eines Skills beim Spieler
// (lebt im GameState, verändert sich während des Spiels)
// -----------------------------------------------------------
export interface SkillInstance {
  definitionId: string;          // Referenz auf SkillDefinition
  level: number;                 // 1 bis maxLevel
  currentXp: number;             // XP im aktuellen Level
  xpToNextLevel: number;         // Schwelle für nächstes Level
  discoveredAt: number;          // Timestamp der Entdeckung
  totalXpEarned: number;         // Gesamt-XP (für Statistiken)
}

// -----------------------------------------------------------
// SkillDiscoveryEvent: Ergebnis einer Absorb/Analyze-Aktion
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
  | "success_new"    // Neuer Combo-Skill entdeckt
  | "success_xp"     // Bereits bekannt → XP erhalten
  | "no_recipe"      // Kombination existiert nicht
  | "invalid_input"; // Gleicher Skill doppelt, oder Combo als Input

export interface CombineResult {
  outcome: CombineOutcome;
  resultSkillId?: string;
  xpGained?: number;
  message: string;
}
