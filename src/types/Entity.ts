// ============================================================
// ENTITY TYPES
// Absorb & Evolve — Entity Type Definitions
// ============================================================

import type { MaterialDrop } from "./Material";
import type { StatusEffect } from "./Combat";

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
  hp?: number;                   // Maximale Trefferpunkte
  damage?: number;               // Schaden pro Angriff (Basiswert)
  speed?: number;                // Bewegungsgeschwindigkeit (px/s)
  attackRangePx?: number;        // Angriffs-Reichweite in Pixeln (default 60)
  attackCooldownMs?: number;     // Millisekunden zwischen Angriffen (default 1500)
  attackType?: "melee" | "ranged" | "charge";  // Angriffsart

  respawnTime: number;
  interactRadius: number;
  aggroRadius?: number;          // Ab dieser Distanz wird die Entity aggro (px)

  // Passive Verteidigung & Angriffsgift — skalieren 1:1 mit Skill-Werten
  damageReduction?: number;      // 0–1: Schadensreduktion (wie Chitin Armor)
  venomChance?: number;          // 0–1: Chance Gift zu applizieren bei jedem Treffer
  venomDamagePerTick?: number;   // Schaden pro Tick des applizierten Gifts

  /**
   * Skill-Levels der Entity (skillId → Level).
   * Überschreibt standalone Props wenn gesetzt:
   *   chitin_armor → damageReduction nach Spielerformel
   *   venom        → venomChance + venomDamagePerTick nach Spielerformel
   *   bite         → damage nach Spielerformel (baseDamage × getSkillEffectiveness)
   */
  skillLevels?: Record<string, number>;

  /** Visuelle Weltgröße in World-Pixeln. Bestimmt wie groß das Icon dargestellt wird.
   *  Kleines Insekt: 3–4, Mittelgroßes: 5–7. Default: 5 wenn nicht angegeben. */
  worldSize?: number;
}

// -----------------------------------------------------------
// EntityInstance: Zustand einer Entity in der Spielwelt
// -----------------------------------------------------------
export interface EntityInstance {
  instanceId: string;
  definitionId: string;
  x: number;
  y: number;
  currentHp: number;        // Aktuelle HP (wird bei Spawn aus Definition befüllt)
  isAlive: boolean;
  respawnAt?: number;       // Timestamp wenn absorbiert
  isAggro: boolean;         // Entity ist im Kampfmodus
  statusEffects: StatusEffect[];       // Aktive Effekte auf dieser Entity
  attackCooldownRemaining: number;     // ms bis zum nächsten Angriff
  chunkKey?: string;        // "cx,cy" — welchem Chunk diese Entity gehört

  // --- Entity-Leveling-System ---
  bonusLevel?: number;      // Bonus-Level durch Siege (0–3)
  skillWins?: number;       // Siege seit letztem bonusLevel-Anstieg (0–2)
  levelingCooldown?: number; // ms Cooldown für Angriffe auf Beute
}
