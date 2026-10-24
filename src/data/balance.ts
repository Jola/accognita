// ============================================================
// BALANCE — Alle Balancing-Konstanten und Skalierungsformeln
// Absorb & Evolve
//
// DIESER ORT IST DIE EINZIGE QUELLE FÜR:
//   - XP-Gewinne pro Interaktionsmethode
//   - XP-Skalierung basierend auf Entity- vs. Skill-Level
//   - Erfolgswahrscheinlichkeits-Formel
//   - XP-Schwellen-Multiplikator pro Level-Up
//   - Analyze-Chance-Modifikator
//
// Alle anderen Module IMPORTIEREN von hier, definieren nichts selbst.
// ============================================================

import type { HitProfile } from "../types/Combat";

// -----------------------------------------------------------
// MILLI-EINHEITEN
//
// HP, MP, Schaden und Heilung werden intern als ganze Zahlen
// in Milli-Einheiten gespeichert und berechnet (1 HP = 1000 mHP).
// Für die Anzeige immer durch MILLI teilen.
// Faktoren (damageReduction, damageMult …) und Level/XP bleiben unverändert.
// -----------------------------------------------------------
export const MILLI = 1_000;

/**
 * Milli-HP → angezeigte HP. Immer aufrunden: Solange auch nur 1 mHP übrig ist,
 * lebt die Einheit und darf nicht als 0 HP erscheinen. Gilt für alle HP-Werte
 * (Lebenspunkte, Schaden, Heilung), nicht für MP.
 */
export function toDisplayHp(milli: number): number {
  return Math.ceil(milli / MILLI);
}

// -----------------------------------------------------------
// BASIS-XP (Rohwert vor Skalierung)
// -----------------------------------------------------------

/** XP die ein Skill bekommt wenn sein Entity absorbiert wird */
export const BASE_XP_ABSORB = 3;

/** XP die ein Skill bekommt wenn sein Entity analysiert wird */
export const BASE_XP_ANALYZE = 1;

/** XP die eine Kern-Fähigkeit (Analyze/Absorb) pro erfolgreichem Einsatz bekommt */
export const BASE_XP_CORE = 1;

// -----------------------------------------------------------
// LEVEL-UP SCHWELLEN
// xpNeeded(level) = floor(baseXpThreshold * XP_LEVEL_MULTIPLIER^(level-1))
// Höheres Level → exponentiell mehr XP nötig
// -----------------------------------------------------------

/** Skalierungsfaktor für XP-Schwellen pro Level-Up */
export const XP_LEVEL_MULTIPLIER = 1.5;

// -----------------------------------------------------------
// SPIELER-HAUPTLEVEL
// Wird aus der Summe aller totalXpEarned aller Skills +
// Kern-Fähigkeiten berechnet.
// xpNeeded(n→n+1) = floor(PLAYER_LEVEL_BASE_XP * PLAYER_LEVEL_XP_MULTIPLIER^(n-1))
// Skaliert deutlich langsamer als Skill-Level.
// -----------------------------------------------------------

/** XP für den ersten Level-Up (Lv1 → Lv2) */
export const PLAYER_LEVEL_BASE_XP = 200;

/** Faktor mit dem die XP-Schwelle pro Level steigt (Basis 2 → verdoppelt sich) */
export const PLAYER_LEVEL_XP_MULTIPLIER = 2.0;

// -----------------------------------------------------------
// SPIELER-VITALWERTE-SKALIERUNG
// maxHp(level) = BASE_HP + (level - 1) * HP_PER_LEVEL
// maxMp(level) = BASE_MP + (level - 1) * MP_PER_LEVEL
// -----------------------------------------------------------

/** Basis-HP bei Lv 1 (milli-HP) */
export const BASE_HP = 80_000;
/** HP-Zuwachs pro Level-Up (milli-HP) */
export const HP_PER_LEVEL = 15_000;
/** Basis-MP bei Lv 1 (milli-MP) */
export const BASE_MP = 40_000;
/** MP-Zuwachs pro Level-Up (milli-MP) */
export const MP_PER_LEVEL = 8_000;

// -----------------------------------------------------------
// XP-SKALIERUNG: ENTITY-LEVEL vs. SKILL-LEVEL
//
// Option D: clamp( (entityLevel / skillLevel)^EXPONENT, MIN, MAX )
//
// Beispiele bei EXPONENT=1.5:
//   Entity Lv 1, Skill Lv 10  → ×0.05  (fast 0 — zu leicht)
//   Entity Lv 5, Skill Lv 10  → ×0.35  (wenig)
//   Entity Lv 10, Skill Lv 10 → ×1.00  (normal)
//   Entity Lv 15, Skill Lv 10 → ×1.84  (Bonus)
//   Entity Lv 20, Skill Lv 10 → ×2.83  (großer Bonus)
//   Entity Lv 30, Skill Lv 10 → ×4.00  (Maximum, gedeckelt)
// -----------------------------------------------------------

/** Exponent der Kurve — höher = steiler (mehr Unterschied zwischen leicht/schwer) */
export const XP_CURVE_EXPONENT = 1.5;

/** Untergrenze des Multiplikators (damit nie ganz 0 bei fast-grayed Gegnern) */
export const XP_CURVE_MIN = 0.05;

/** Obergrenze des Multiplikators (verhindert exzessives XP-Farming sehr starker Gegner) */
export const XP_CURVE_MAX = 4.0;

/**
 * Berechnet den XP-Multiplikator basierend auf Entity- und Skill-Level.
 * Gibt einen Wert zwischen XP_CURVE_MIN und XP_CURVE_MAX zurück.
 */
export function calcXpMultiplier(
  entityLevel: number,
  skillLevel: number
): number {
  const level = Math.max(1, skillLevel); // Division durch 0 verhindern
  const ratio = entityLevel / level;
  const raw = Math.pow(ratio, XP_CURVE_EXPONENT);
  return Math.min(XP_CURVE_MAX, Math.max(XP_CURVE_MIN, raw));
}

/**
 * Wendet den Multiplikator auf einen Basis-XP-Wert an.
 * Gibt einen ganzzahligen Wert zurück (abgerundet, minimum 0).
 */
export function scaleXp(baseXp: number, entityLevel: number, skillLevel: number): number {
  return Math.max(0, Math.floor(baseXp * calcXpMultiplier(entityLevel, skillLevel)));
}

// -----------------------------------------------------------
// ERFOLGSWAHRSCHEINLICHKEIT für Analyze & Absorb
//
// Formel: min(1, abilityLevel / entityLevel)
//   abilityLevel >= entityLevel → 100% Erfolg
//   abilityLevel < entityLevel  → proportional weniger
//
// Beispiele:
//   Ability Lv 5, Entity Lv 5  → 100%
//   Ability Lv 5, Entity Lv 10 → 50%
//   Ability Lv 1, Entity Lv 5  → 20%
// -----------------------------------------------------------

/**
 * Erfolgswahrscheinlichkeit von Analyze oder Absorb.
 * Gibt einen Wert zwischen 0.0 und 1.0 zurück.
 */
export function calcSuccessChance(
  abilityLevel: number,
  entityLevel: number
): number {
  if (abilityLevel >= entityLevel) return 1.0;
  return abilityLevel / entityLevel;
}

// -----------------------------------------------------------
// KAMPF-XP-SKALIERUNG (Skill-Nutzung gegen Gegner)
//
// Steuert wie viel XP ein Skill bekommt wenn er gegen einen Gegner
// eingesetzt wird, basierend auf entityLevel vs. aktuellem Skill-Level.
// Unabhängig von der Absorb/Analyze-Kurve einstellbar.
//
// Beispiele bei EXPONENT=2.0:
//   Entity Lv 1,  Skill Lv 5  → ×0.04  (kaum XP — Gegner viel zu schwach)
//   Entity Lv 3,  Skill Lv 5  → ×0.36  (wenig)
//   Entity Lv 5,  Skill Lv 5  → ×1.00  (normal)
//   Entity Lv 7,  Skill Lv 5  → ×1.50  (Bonus, gedeckelt)
//   Entity Lv 10, Skill Lv 5  → ×1.50  (Bonus, gedeckelt)
// -----------------------------------------------------------

/** Exponent der Combat-XP-Kurve — höher = steiler Abfall bei schwachen Gegnern */
export const XP_COMBAT_EXPONENT = 2.0;
/** Minimum-Multiplikator — verhindert dass Gegner jemals 0 XP geben */
export const XP_COMBAT_MIN      = 0.02;
/** Maximum-Multiplikator — Bonus für starke Gegner (kleiner als Absorb-Bonus) */
export const XP_COMBAT_MAX      = 1.5;

/**
 * Multiplikator für Skill-Nutzungs-XP basierend auf Entity- und Skill-Level.
 * Gibt einen Wert zwischen XP_COMBAT_MIN und XP_COMBAT_MAX zurück.
 */
export function calcCombatXpMultiplier(entityLevel: number, skillLevel: number): number {
  const level = Math.max(1, skillLevel);
  const ratio = entityLevel / level;
  const raw   = Math.pow(ratio, XP_COMBAT_EXPONENT);
  return Math.min(XP_COMBAT_MAX, Math.max(XP_COMBAT_MIN, raw));
}

// -----------------------------------------------------------
// SCHADENSPIPELINE-CAPS (GDD-05 Abschnitt 9.3)
// -----------------------------------------------------------

/** Maximale prozentuale Schadensreduktion — nie unverwundbar */
export const MAX_PERCENT_REDUCTION = 0.85;

/** Mindest-Schaden eines Skills VOR allen Effekten (milli-HP) — 1 HP */
export const MIN_SKILL_DAMAGE = 1_000;

/** Minimaler Endschaden NACH allen Effekten (außer Verfehlen/Immunität) — 1 milli-HP */
export const MIN_FINAL_DAMAGE = 1;

/** Maximaler Schwäche-Multiplikator */
export const MAX_WEAKNESS_MULT = 3.0;

/** Minimaler Resistenz-Multiplikator */
export const MIN_RESISTANCE_MULT = 0.1;

/** Globaler Schadens-Multiplikator (Balancing-Hebel) */
export const SKILL_DAMAGE_BASE_MULTIPLIER = 1.0;

/** Globaler Verteidigungs-Multiplikator (Balancing-Hebel) */
export const SKILL_DEFENSE_BASE_MULTIPLIER = 1.0;

// -----------------------------------------------------------
// TREFFER-STUFEN (verfehlt / leicht / normal / schwer / kritisch)
//
// Jeder Angriffsskill hat eine Grundverteilung (hitProfile, Lv1, Geschick 0).
// Skill-Level und Geschick-Differenz kippen die Verteilung Richtung bessere Stufen:
//   x    = HIT_TILT_PER_SKILL_LEVEL·(Level−1) + HIT_TILT_PER_DEX·(Geschick Angreifer − Verteidiger)
//   kipp = HIT_TILT_MAX · tanh(x)                       (weich begrenzt auf ±HIT_TILT_MAX)
//   p_i  ∝ grund_i · e^(kipp · stufe_i),  stufe = −2 … +2 (verfehlt … kritisch)
// Bei HIT_TILT_MAX 0.4 steigt Krit höchstens auf ≈2,2× und Verfehlen fällt auf ≈0,45× —
// beide bleiben selten.
// -----------------------------------------------------------

/** Grundverteilung für Angriffe ohne eigenes hitProfile (z.B. unbewaffneter Blob) */
export const DEFAULT_HIT_PROFILE: HitProfile = { miss: 0.04, light: 0.24, normal: 0.50, heavy: 0.19, crit: 0.03 };

/** Schadens-Multiplikator je Treffer-Stufe — für alle Skills gleich */
export const HIT_DAMAGE_MULT: HitProfile = { miss: 0, light: 0.6, normal: 1.0, heavy: 1.3, crit: 2.5 };

/** Maximales Kippen der Verteilung (in beide Richtungen) */
export const HIT_TILT_MAX = 0.4;
/** Beitrag pro Skill-Level über 1 */
export const HIT_TILT_PER_SKILL_LEVEL = 0.05;
/** Beitrag pro Geschick-Punkt Vorsprung des Angreifers */
export const HIT_TILT_PER_DEX = 0.1;

// -----------------------------------------------------------
// ANALYZE-MODIFIKATOR
// Analyze hat niedrigere Skill-Drop-Chancen als Absorb,
// weil man nichts physisch aufnimmt.
// -----------------------------------------------------------

/** Faktor der auf Skill-Drop-Chancen bei Analyze angewendet wird */
export const ANALYZE_CHANCE_MODIFIER = 0.7;

// -----------------------------------------------------------
// SPIELER-WACHSTUM / KAMERA-ZOOM
//
// Der Blob wächst mit dem Level. Seine Weltgröße skaliert von
// PLAYER_WORLD_RADIUS_MIN (Level 1) bis PLAYER_WORLD_RADIUS_MAX (Level PLAYER_SIZE_LEVEL_MAX+).
// Der Kamera-Zoom wird so angepasst, dass der Blob auf dem Bildschirm
// immer PLAYER_SCREEN_RADIUS Pixel groß bleibt.
// Effekt: die Welt schrumpft optisch, während der Blob wächst.
//
// Tile-Verhältnis (TILE_SIZE = 32):
//   Level 1:  Radius 2  ≈ 1/8  Tile-Durchmesser (sehr kleines Lebewesen)
//   Level 20: Radius 8  ≈ 1/2  Tile-Durchmesser (fuchsgroßes Lebewesen)
// -----------------------------------------------------------

/** Welt-Radius des Blobs bei Level 1 (in World-Pixeln, TILE_SIZE=32) */
export const PLAYER_WORLD_RADIUS_MIN = 2;

/** Welt-Radius des Blobs ab Level PLAYER_SIZE_LEVEL_MAX */
export const PLAYER_WORLD_RADIUS_MAX = 8;

/** Level ab dem die maximale Größe erreicht wird */
export const PLAYER_SIZE_LEVEL_MAX = 20;

/** Konstante Bildschirm-Radius des Blobs in Pixeln (ändert sich nie) */
export const PLAYER_SCREEN_RADIUS = 16;

/**
 * Geschwindigkeit des Blobs pro World-Pixel Radius.
 * speed = worldRadius × PLAYER_SPEED_PER_WORLD_RADIUS
 *   Level 1  (radius 2): world-speed  20 → screen-speed  20 × 8 = 160 px/s
 *   Level 20 (radius 8): world-speed  80 → screen-speed  80 × 2 = 160 px/s
 */
export const PLAYER_SPEED_PER_WORLD_RADIUS = 10;

/**
 * Grundgeschwindigkeit für Entities pro worldSize-Einheit.
 * speed = worldSize × ENTITY_SPEED_PER_WORLD_SIZE = 5× eigene Größe/s.
 */
export const ENTITY_SPEED_PER_WORLD_SIZE = 5;
