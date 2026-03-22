// ============================================================
// ENTITY TYPES
// Absorb & Evolve — Entity Type Definitions
// ============================================================

export type EntityBehavior =
  | "passive"     // Greift nie an, flieht bei Nähe
  | "defensive"   // Greift nur an wenn angegriffen
  | "aggressive"  // Greift bei Sichtkontakt an
  | "territorial" // Greift in eigenem Radius an
  | "rare";       // Taucht kurz auf, flieht sofort

export type EntityRarity = "common" | "uncommon" | "rare" | "legendary";

// -----------------------------------------------------------
// EntityDefinition: Blaupause für einen Entity-Typ
// -----------------------------------------------------------
export interface EntityDefinition {
  id: string;
  name: string;
  icon: string;
  behavior: EntityBehavior;
  rarity: EntityRarity;

  // Skill-Drops: welche Skills kann dieser Entity vermitteln
  skillDrops: string[];          // Skill-IDs

  // Kampfwerte (v0.2)
  hp?: number;
  damage?: number;
  speed?: number;

  // Respawn-Zeit in Sekunden nach Absorb
  respawnTime: number;

  // Radius in dem Entity reagiert (Aggro/Interact)
  interactRadius: number;
  aggroRadius?: number;
}

// -----------------------------------------------------------
// EntityInstance: Zustand einer Entity in der Spielwelt
// -----------------------------------------------------------
export interface EntityInstance {
  instanceId: string;
  definitionId: string;
  x: number;
  y: number;
  currentHp?: number;
  isAlive: boolean;
  respawnAt?: number;            // Timestamp wenn absorbiert
}
