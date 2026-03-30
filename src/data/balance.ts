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

/** Basis-HP bei Lv 1 */
export const BASE_HP = 80;
/** HP-Zuwachs pro Level-Up */
export const HP_PER_LEVEL = 15;
/** Basis-MP bei Lv 1 */
export const BASE_MP = 40;
/** MP-Zuwachs pro Level-Up */
export const MP_PER_LEVEL = 8;

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
