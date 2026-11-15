// ============================================================
// BLOB TYPES
// Absorb & Evolve — Blob-Formen (GDD-10 Abschnitt 13.1)
//
// Gespielt wird immer mit einer Arbeitskopie des Blobs, bei dem das
// Bewusstsein ist: dem bisherigen PlayerState (GDD-10 Abschnitt 13.2).
// Alle anderen Blobs liegen als StoredBlob im GameState — ihr Körper
// in derselben Form, in der er auch gespeichert wird (SerializedBody).
// ============================================================

import type { SkillInstance } from "./Skill";
import type { CoreAbilityState } from "./GameState";

/** niedergelassen · reisend · vertrocknet (GDD-10 Abschnitt 2) */
export type BlobForm = "settled" | "traveling" | "dried";

/** Tätigkeit eines niedergelassenen Blobs (GDD-10 Abschnitt 8.4). */
export type BlobActivity = "rest" | "analyze" | "absorb";

/**
 * Körper eines Blobs, so wie er gespeichert wird (Maps als Arrays).
 * Entspricht dem PlayerState ohne Laufzeit-Felder (Cooldowns, Effekte).
 */
export interface SerializedBody {
  x: number; y: number;
  hp: number; maxHp: number;
  mp: number; maxMp: number;
  lifetimeXp: number;
  bodyMass: number;
  level?: number; totalExp?: number;   // [VERWORFEN] nur vor Spielstand v3, Migration 2 → 3
  spawnX: number; spawnY: number;
  coreAbilities: { analyze: CoreAbilityState; absorb: CoreAbilityState };
  discoveredSkills: [string, SkillInstance][];
  materials: [string, number][];
  activeSkillSlots: (string | null)[];
  totalAbsorbs: number;
  totalAbsorbFailures: number;
  totalAnalyzes: number;
  totalAnalyzeFailures: number;
  playtimeSeconds: number;
}

/** Eine Wesen-Art in Arbeitsreichweite eines niedergelassenen Blobs (GDD-10 8.3). */
export interface ActivitySource {
  entityId: string;
  count: number;
  respawnSeconds: number;
}

/** Was einen Blob ausmacht, außer seinem Körper. */
export interface BlobMeta {
  id: string;          // "b1", "b2" … — nie wiederverwendet
  name: string;        // „Nest“, „Reisender“, „Wald 2“ …
  form: BlobForm;
  /** Das Nest: unzerstörbar, ortsfest, kann sich nicht erheben, gilt als ausgewachsen */
  nest?: true;
  /** nur niedergelassen: eingestellte Tätigkeit (keine voreingestellt beim Erwachen) */
  activity?: BlobActivity | null;
  /** nur niedergelassen: bis zu welcher Spielzeit (s) sein Stand berechnet ist */
  simulatedUntil?: number;
  /** nur niedergelassen: friedliche Wesen, die er erntet (der nächste Blob erntet, GDD-10 8.3) */
  sources?: ActivitySource[];
  /** nur niedergelassen: Arbeitsreichweite (px), mit der `sources` verteilt wurde — wächst er, wird neu verteilt */
  workRange?: number;
  /** nur niedergelassen: Bruchteile der Tätigkeit ("mat:…", "find:…") */
  carry?: Record<string, number>;
  /** nur vertrocknet: Spielzeit (s) des Vertrocknens */
  driedAt?: number;
}

/** Ein Blob ohne Bewusstsein. */
export interface StoredBlob extends BlobMeta {
  body: SerializedBody;
}

// Stand: 15. November 2026 — workRange für die Verteilung der Quellen (Schritt 6); Erstfassung in Schritt 2
