// ============================================================
// ENTITY TYPES
// Absorb & Evolve — Entity Type Definitions
// ============================================================

import type { MaterialDrop } from "./Material";

// Verhalten im Spiel — wie reagiert die Entity auf Nähe?
export type EntityBehavior =
  | "passive"     // Greift nie an, ignoriert den Slime
  | "defensive"   // Greift nur an wenn angegriffen
  | "aggressive"  // Greift bei Sichtkontakt an
  | "territorial" // Greift in eigenem Radius an
  | "rare";       // Taucht kurz auf, flieht sofort

// Grunddisposition — bestimmt Reaktion auf Fehlschlag:
//   neutral  = passive / defensive (nie zuerst aggressiv)
//   hostile  = aggressive / territorial / rare (greift immer an bei Fehlschlag)
export type EntityDisposition = "neutral" | "hostile";

// Kategorie — bestimmt welche Systeme angewandt werden:
//   creature = Lebewesen mit Verhalten und Kampfwerten
//   plant    = Pflanze, passiv, liefert pflanzliche Materialien
//   mineral  = Unbelebtes Gestein, passiv, liefert Mineralien
export type EntityCategory = "creature" | "plant" | "mineral";

export type EntityRarity = "common" | "uncommon" | "rare" | "legendary";

// -----------------------------------------------------------
// SkillDrop: Drop-Spezifikation für Skills in EntityDefinition
// -----------------------------------------------------------
export interface SkillDrop {
  skillId: string;
  chance: number; // 0.0–1.0 — Basis-Chance bei Absorb
                  // Bei Analyze wird ANALYZE_CHANCE_MODIFIER angewendet
}

// -----------------------------------------------------------
// EntityDefinition: Blaupause für einen Entity-Typ
// -----------------------------------------------------------
export interface EntityDefinition {
  id: string;
  name: string;
  icon: string;
  behavior: EntityBehavior;
  disposition: EntityDisposition;
  category: EntityCategory;
  rarity: EntityRarity;

  // Level — bestimmt Schwierigkeit von Absorb/Analyze:
  // Erfolgswahrscheinlichkeit = min(1, abilityLevel / entityLevel)
  level: number;

  skillDrops: SkillDrop[];
  materialDrops: MaterialDrop[];  // Leer für reine Kreaturen

  // Kampfwerte (v0.3)
  hp?: number;
  damage?: number;
  speed?: number;

  respawnTime: number;
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
  respawnAt?: number;       // Timestamp wenn absorbiert
  isAggro?: boolean;        // Entity wurde durch Fehlschlag aggressiv
}
