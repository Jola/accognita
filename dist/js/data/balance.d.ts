/** XP die ein Skill bekommt wenn sein Entity absorbiert wird */
export declare const BASE_XP_ABSORB = 3;
/** XP die ein Skill bekommt wenn sein Entity analysiert wird */
export declare const BASE_XP_ANALYZE = 1;
/** XP die eine Kern-Fähigkeit (Analyze/Absorb) pro erfolgreichem Einsatz bekommt */
export declare const BASE_XP_CORE = 1;
/** Skalierungsfaktor für XP-Schwellen pro Level-Up */
export declare const XP_LEVEL_MULTIPLIER = 1.5;
/** XP für den ersten Level-Up (Lv1 → Lv2) */
export declare const PLAYER_LEVEL_BASE_XP = 200;
/** Faktor mit dem die XP-Schwelle pro Level steigt (Basis 2 → verdoppelt sich) */
export declare const PLAYER_LEVEL_XP_MULTIPLIER = 2;
/** Basis-HP bei Lv 1 */
export declare const BASE_HP = 80;
/** HP-Zuwachs pro Level-Up */
export declare const HP_PER_LEVEL = 15;
/** Basis-MP bei Lv 1 */
export declare const BASE_MP = 40;
/** MP-Zuwachs pro Level-Up */
export declare const MP_PER_LEVEL = 8;
/** Exponent der Kurve — höher = steiler (mehr Unterschied zwischen leicht/schwer) */
export declare const XP_CURVE_EXPONENT = 1.5;
/** Untergrenze des Multiplikators (damit nie ganz 0 bei fast-grayed Gegnern) */
export declare const XP_CURVE_MIN = 0.05;
/** Obergrenze des Multiplikators (verhindert exzessives XP-Farming sehr starker Gegner) */
export declare const XP_CURVE_MAX = 4;
/**
 * Berechnet den XP-Multiplikator basierend auf Entity- und Skill-Level.
 * Gibt einen Wert zwischen XP_CURVE_MIN und XP_CURVE_MAX zurück.
 */
export declare function calcXpMultiplier(entityLevel: number, skillLevel: number): number;
/**
 * Wendet den Multiplikator auf einen Basis-XP-Wert an.
 * Gibt einen ganzzahligen Wert zurück (abgerundet, minimum 0).
 */
export declare function scaleXp(baseXp: number, entityLevel: number, skillLevel: number): number;
/**
 * Erfolgswahrscheinlichkeit von Analyze oder Absorb.
 * Gibt einen Wert zwischen 0.0 und 1.0 zurück.
 */
export declare function calcSuccessChance(abilityLevel: number, entityLevel: number): number;
/** Faktor der auf Skill-Drop-Chancen bei Analyze angewendet wird */
export declare const ANALYZE_CHANCE_MODIFIER = 0.7;
/** Welt-Radius des Blobs bei Level 1 (in World-Pixeln, TILE_SIZE=32) */
export declare const PLAYER_WORLD_RADIUS_MIN = 2;
/** Welt-Radius des Blobs ab Level PLAYER_SIZE_LEVEL_MAX */
export declare const PLAYER_WORLD_RADIUS_MAX = 8;
/** Level ab dem die maximale Größe erreicht wird */
export declare const PLAYER_SIZE_LEVEL_MAX = 20;
/** Konstante Bildschirm-Radius des Blobs in Pixeln (ändert sich nie) */
export declare const PLAYER_SCREEN_RADIUS = 16;
/**
 * Geschwindigkeit des Blobs pro World-Pixel Radius.
 * speed = worldRadius × PLAYER_SPEED_PER_WORLD_RADIUS
 *   Level 1  (radius 2): world-speed  20 → screen-speed  20 × 8 = 160 px/s
 *   Level 20 (radius 8): world-speed  80 → screen-speed  80 × 2 = 160 px/s
 */
export declare const PLAYER_SPEED_PER_WORLD_RADIUS = 10;
/**
 * Grundgeschwindigkeit für Entities pro worldSize-Einheit.
 * speed = worldSize × ENTITY_SPEED_PER_WORLD_SIZE = 5× eigene Größe/s.
 */
export declare const ENTITY_SPEED_PER_WORLD_SIZE = 5;
//# sourceMappingURL=balance.d.ts.map