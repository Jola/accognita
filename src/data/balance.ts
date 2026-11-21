// ============================================================
// BALANCE — Allgemeine Spielregeln (zentraler Einstieg)
// Absorb & Evolve
//
// Vorgabe (Entwickler, 14. November 2026): Was zu einem Skill gehört, wird
//   am Skill konfiguriert; allgemeine Regeln stehen hier.
// Begründung (Vorschlag Claude, übernommen): Alles, was einen Skill
//   ausmacht, steht an einem Ort — wer einen Skill balanciert, fasst nur eine
//   Stelle an und sieht im INDEX alle Werte. Präzision gilt für jeden Angriff
//   gleich und ist deshalb eine allgemeine Regel.
//
// WAS WO STEHT
//   Diese Datei — allgemeine Regeln:
//     Milli-Einheiten · Erfahrung je Absorb/Analyze/Kampf und ihre Kurven ·
//     Erfolgschance · HP/MP aus dem Wachstum · MP-Regeneration ·
//     Schadensgrenzen · Treffer-Stufen und Präzision (Geschick) ·
//     Analyze-Fundchance · Größe, Reichweite, Tempo je Körpergröße ·
//     Stärke aus der Körpergröße · KI (Aggro, Herumwandern) ·
//     Gegner untereinander (Bonus-Level)
//   src/data/progression.ts — allgemeine Regeln der Erfahrung: Fortschritt
//     0–100 %, Ränge, Kapazität und Verlernen, Überdehnung, Wiedererlernen,
//     Übertraining
//   src/data/skills.ts — alles je Skill: Lernaufwand, Schaden, Treffer-
//     Verteilung, MP, Abklingzeit, Eigenschaften, die er gibt (Stärke,
//     Geschick, Tempo, Sicht …), Wirkung der Eigenschaften auf ihn (scaling),
//     Sprungweite, Heilung, Verdauung, Gift-Chance und -Dosis, Erfahrung
//     durch Tun (practice)
//   src/data/body.ts — Körper des Blobs: „der beste Skill zählt“, Sichtrand
//   src/data/grow.ts — Wachsen: Nahrung, Wachstum aus Körpermasse
//   src/data/venom.ts — Gift: Giftlast, Halbwertszeit, Mindestrate
//   src/data/entities.ts — alles je Wesen: Stufe, HP, Skill-Erfahrung,
//     Funde, Respawn, Verhalten, Aggro-Radius, Tempo
//   src/data/materials.ts — Materialien
//   src/world/BiomeDefinitions.ts — Spawn-Tabellen der Biome
//
// [VERWORFEN, 14. November 2026] „Dieser Ort ist die einzige Quelle“ —
//   stimmte schon länger nicht mehr; jetzt bewusst aufgeteilt (Vorgabe oben).
// ============================================================

import type { HitProfile } from "../types/Combat";
import { MAX_BODY_MASS, GROWTH_FIBER_SCALE } from "./grow";

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

// [VERWORFEN, 14. November 2026] PHOTOSYNTHESIS_XP_PER_HP hier — steht jetzt
// am Skill Photosynthese (practice: hp_healed), Wert und Begründung unverändert.

// -----------------------------------------------------------
// [VERWORFEN] LEVEL-UP SCHWELLEN und SPIELER-HAUPTLEVEL
// Früher: XP_LEVEL_MULTIPLIER 1.5 (Skill-Level), PLAYER_LEVEL_BASE_XP 200
// × PLAYER_LEVEL_XP_MULTIPLIER 2.0 (Charakter-Level).
// Ersetzt durch Erfahrung ohne Level: src/data/progression.ts.
// Begründung (Entwickler): Level wirken wie eine unnatürliche Einheit.
// -----------------------------------------------------------

// -----------------------------------------------------------
// SPIELER-VITALWERTE-SKALIERUNG
// maxHp(growth) = BASE_HP + growth * HP_PER_GROWTH
// maxMp(growth) = BASE_MP + growth * MP_PER_GROWTH
// growth = stetiges Wachstum des Blobs aus der Körpermasse (GrowSystem.getPlayerGrowth, data/grow.ts);
// growth 1 entspricht genau einem alten Charakter-Level.
// -----------------------------------------------------------

/** Basis-HP eines frischen Blobs (milli-HP) */
export const BASE_HP = 80_000;
/** HP-Zuwachs pro Einheit Wachstum (milli-HP) */
export const HP_PER_GROWTH = 15_000;
/** Basis-MP eines frischen Blobs (milli-MP) */
export const BASE_MP = 40_000;
/** MP-Zuwachs pro Einheit Wachstum (milli-MP) */
export const MP_PER_GROWTH = 8_000;

/**
 * MP-Regeneration in milli-MP pro Sekunde (1 MP/s), konstant und passiv —
 * für Spiel (CombatSystem.regenMp) und Anzeige.
 * Begründung (rekonstruiert, bitte bestätigen): entspricht dem Wert vor der
 * Umstellung auf Milli-Einheiten (GDD-05). Warum 1 MP/s: Begründung offen
 * (GDD-03 Abschnitt 3). Bis 14. November 2026 in CombatSystem.ts.
 */
export const MP_REGEN_MILLI_PER_SECOND = 1_000;

// -----------------------------------------------------------
// XP-SKALIERUNG: ENTITY-LEVEL vs. VERGLEICHSSTUFE DES SKILLS
//
// Option D: clamp( (entityLevel / vergleichsstufe)^EXPONENT, MIN, MAX )
// „Skill Lv“ in den Beispielen = Vergleichsstufe = 1 + 10 × Fortschritt
// (progression.ts Abschnitt 2b): 0 % → 1, Natur (90 %) → 10.
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
 * Wendet den Multiplikator auf einen Basis-XP-Wert an (minimum 0).
 *
 * [VERWORFEN] Abrunden auf ganze XP. Mit Leveln blieb der Multiplikator auf
 * Level 1 bei ×1, abgerundet ging nichts verloren. Mit dem stetigen
 * Übungsgrad liegt u schon nach dem ersten Punkt über 1 (Absorb: u≈1,45),
 * der Multiplikator gegen Stufe-1-Wesen unter 1 (×0,57) — abgerundet 0.
 * Absorb/Analyze und Skill-Funde bei Ameise, Marienkäfer, Gras blieben
 * dadurch für immer bei 1 XP stehen.
 * Jetzt: Bruchteile zählen. Begründung: Vorgabe (Entwickler) „Werte
 * verbessern sich fließend in sehr kleinen Schritten“ (progression.ts
 * Abschnitt 1); die Untergrenze XP_CURVE_MIN soll laut Kommentar oben nie
 * ganz 0 ergeben — das Abrunden hat genau das unterlaufen.
 */
export function scaleXp(baseXp: number, entityLevel: number, skillLevel: number): number {
  return Math.max(0, baseXp * calcXpMultiplier(entityLevel, skillLevel));
}

// -----------------------------------------------------------
// ERFOLGSWAHRSCHEINLICHKEIT für Analyze & Absorb
//
// Formel: min(1, vergleichsstufe / entityLevel)  (Vergleichsstufe von Analyze/Absorb,
//          = 1 + 10 × Fortschritt, progression.ts Abschnitt 2b)
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

// [VERWORFEN, 14. November 2026] SKILL_DAMAGE_BASE_MULTIPLIER = 1.0 — wurde
// nirgends ausgewertet (GDD-05 Abschnitt 13).

/** Globaler Verteidigungs-Multiplikator (Balancing-Hebel) */
export const SKILL_DEFENSE_BASE_MULTIPLIER = 1.0;

// -----------------------------------------------------------
// TREFFER-STUFEN (verfehlt / leicht / normal / schwer / kritisch)
//
// Jeder Angriffsskill hat eine Grundverteilung (hitProfile, ohne Erfahrung, Geschick 0).
// Fortschritt und Geschick-Differenz kippen die Verteilung Richtung bessere Stufen:
//   x    = HIT_TILT_PER_SKILL_LEVEL·(Stufe−1) + HIT_TILT_PER_DEX·(Geschick Angreifer − Verteidiger)
//   Stufe = Vergleichsstufe des Angriffs-Skills = 1 + 10 × Fortschritt (progression.ts 2b)
//   kipp = HIT_TILT_MAX · tanh(x)                       (weich begrenzt auf ±HIT_TILT_MAX)
//   p_i  ∝ grund_i · e^(kipp · stufe_i),  stufe = −2 … +2 (verfehlt … kritisch)
// Bei HIT_TILT_MAX 0.4 steigt Krit höchstens auf ≈2,2× und Verfehlen fällt auf ≈0,45× —
// beide bleiben selten.
// -----------------------------------------------------------

/** Grundverteilung für Angriffs-Skills ohne eigenes hitProfile */
export const DEFAULT_HIT_PROFILE: HitProfile = { miss: 0.04, light: 0.24, normal: 0.50, heavy: 0.19, crit: 0.03 };

/** Schadens-Multiplikator je Treffer-Stufe — für alle Skills gleich */
export const HIT_DAMAGE_MULT: HitProfile = { miss: 0, light: 0.6, normal: 1.0, heavy: 1.3, crit: 2.5 };

/** Maximales Kippen der Verteilung (in beide Richtungen) */
export const HIT_TILT_MAX = 0.4;
/** Beitrag pro Vergleichsstufe über 1 (Natur: +0,45) */
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
// Der Blob wächst stetig (Wachstum aus Körpermasse, GrowSystem.getPlayerGrowth). Seine Weltgröße
// skaliert von PLAYER_WORLD_RADIUS_MIN (Wachstum 0) bis PLAYER_WORLD_RADIUS_MAX
// (Wachstum PLAYER_SIZE_GROWTH_MAX = ausgewachsen, 120 kg, GDD-10 Abschnitt 7.1).
// [VERWORFEN, 15. November 2026] größte Größe erst bei Wachstum 19 (≙ früher
//   Level 20) — das waren etwa 10 Millionen Fasern, die niemand erreicht.
// Der Kamera-Zoom wird so angepasst, dass der Blob auf dem Bildschirm
// immer PLAYER_SCREEN_RADIUS Pixel groß bleibt.
// Effekt: die Welt schrumpft optisch, während der Blob wächst.
//
// Tile-Verhältnis (TILE_SIZE = 32):
//   frisch:       Radius 2    ≈ 1/8 Tile-Durchmesser (≈ 0,9 cm)
//   ausgewachsen: Radius ≈ 16,6 ≈ 1 Tile-Durchmesser (61 cm, aus der Größenskala)
//   [VERWORFEN, 21. November 2026] ausgewachsen Radius 8 ≈ 1/2 Tile — passte
//   nicht mehr zur Größenskala (unten), nach der 61 cm Radius ≈ 16,6 sind.
// -----------------------------------------------------------

/** Welt-Radius eines frischen Blobs (in World-Pixeln, TILE_SIZE=32) */
export const PLAYER_WORLD_RADIUS_MIN = 2;

/**
 * Echte Größe des ausgewachsenen Blobs (cm, Vorgabe Entwickler: Kugel von
 * 61 cm). Daraus folgt PLAYER_WORLD_RADIUS_MAX (Welt-Radius ab Wachstum
 * PLAYER_SIZE_GROWTH_MAX) über die Größenskala (unten):
 * worldSize 3 × √(61 / 0,6) ≈ 30,2, Radius = 30,2 × ENTITY_ICON_RADIUS_FACTOR ≈ 16,6.
 * [VERWORFEN, 21. November 2026] fest 16,5 eingetragen — jetzt berechnet,
 *   damit der Blob einer geänderten Skala folgt.
 * Begründung (Vorschlag Claude, offen): Der Blob muss auf derselben Skala
 *   liegen wie die Wesen, sonst stimmen Größenvergleiche (Größen-Aggro) und
 *   das Bild nicht — mit Radius 8 wäre der ausgewachsene Blob (61 cm) kleiner
 *   als ein Igel (25 cm). Der frische Blob (Radius 2) entspricht ≈ 0,9 cm.
 * [VERWORFEN, 21. November 2026] 8 (Größenklasse G5, Vorschlag Claude, übernommen).
 */
export const PLAYER_LENGTH_CM_MAX = 61;
// PLAYER_WORLD_RADIUS_MAX steht unter der Größenskala (braucht deren Konstanten).

/**
 * Wachstum, ab dem die maximale Größe erreicht wird: ausgewachsen (≈ 5,9).
 * Vorgabe (Entwickler, 14. November 2026): Kugel von höchstens 120 kg und
 * 61 cm; 61 cm = Welt-Radius ≈ 16,6 px (Größenskala, seit 21. November 2026;
 * [VERWORFEN] 8 px, Größenklasse G5).
 */
export const PLAYER_SIZE_GROWTH_MAX = Math.log2(1 + MAX_BODY_MASS / GROWTH_FIBER_SCALE);

/** Konstante Bildschirm-Radius des Blobs in Pixeln (ändert sich nie) */
export const PLAYER_SCREEN_RADIUS = 16;

// -----------------------------------------------------------
// STÄRKE AUS DER KÖRPERGRÖSSE (nur Blob, GDD-09)
//
// Stärke = Summe der Stärke-Effekte × (1 + Größenbonus)
// Größenbonus = SIZE_STRENGTH_BONUS_MAX × min(1, Wachstum / PLAYER_SIZE_GROWTH_MAX)
//   — linear mit der Größe, bei voller Größe +100 %.
// Vorgabe (Entwickler): Die Körpergröße erhöht die Stärke prozentual.
// Begründung (Vorschlag Claude, übernommen): Ein größerer Körper hat mehr
//   Muskelmasse. Ohne trainierte Muskeln (Bewegung, Superstrength) gibt es
//   nichts, was die Größe verstärken könnte.
// Gilt derzeit nur für den Blob: Gegner haben kein Wachstum.
// Bis 14. November 2026 in src/data/body.ts — allgemeine Regel, hängt an
// keinem Skill. Rechnung: BodySystem.calcSizeStrengthBonus.
// -----------------------------------------------------------
export const SIZE_STRENGTH_BONUS_MAX = 1.0;

// -----------------------------------------------------------
// TREFFER-REICHWEITE (Nahkampf, Absorb, Analyze)
//
// Vorgabe (Entwickler, 1. November 2026): Der Trefferradius der Fähigkeiten
//   des Blobs wird erhöht, und die Größe der Gegner richtet sich nach der
//   Größe ihres Icons — sie sollen getroffen werden können, sobald der Blob
//   sie berührt (Nahkampf, Absorb, Analyze).
//
// Gemessen wird von Rand zu Rand:
//   in Reichweite ⇔ Mittelpunktabstand − Gegner-Radius ≤ PLAYER_REACH_FACTOR × Blob-Radius
//   Gegner-Radius = worldSize × ENTITY_ICON_RADIUS_FACTOR
//   Berührung ist Mittelpunktabstand = Blob-Radius + Gegner-Radius, also
//   reicht der Blob PLAYER_REACH_FACTOR − 1 Blob-Radien über die Berührung
//   hinaus.
// [VERWORFEN] Mittelpunktabstand ≤ 2 × Blob-Radius — die Größe des Gegners
//   zählte nicht. Ein frischer Blob (Radius 2) erreichte nur 4 px um seinen
//   Mittelpunkt; einen Skorpion (Icon ≈ 7–11 px breit) konnte er berühren,
//   ohne ihn zu treffen.
// -----------------------------------------------------------

/**
 * Radius eines Gegners im Verhältnis zu worldSize. Das Emoji wird in
 * Schriftgröße worldSize gezeichnet und ist etwa 1,1 × so breit. VORLÄUFIG
 */
export const ENTITY_ICON_RADIUS_FACTOR = 0.55;

/** Reichweite des Blobs ab dem Rand des Gegners, in Blob-Radien ([VERWORFEN]: 2 ab Mittelpunkt). VORLÄUFIG */
export const PLAYER_REACH_FACTOR = 2.5;

/**
 * Geschwindigkeit des Blobs pro World-Pixel Radius.
 * speed = worldRadius × PLAYER_SPEED_PER_WORLD_RADIUS
 *   frisch       (radius 2):    world-speed  20 → screen-speed  20 × 8 = 160 px/s
 *   ausgewachsen (radius 16,6): world-speed 166 → screen-speed 166 × 0,96 = 160 px/s
 */
export const PLAYER_SPEED_PER_WORLD_RADIUS = 10;

// -----------------------------------------------------------
// GRÖSSENSKALA DER WESEN (worldSize aus der echten Größe)
//
// worldSize = SIZE_SCALE_BASE × (Länge in cm / SIZE_SCALE_REF_CM) ^ SIZE_SCALE_EXPONENT
// Länge = durchschnittliche Körperlänge des Vorbilds (Säugetiere ohne
// Schwanz, Schlange und Eidechse mit Schwanz, Gras = Wuchshöhe).
// Vorgabe (Entwickler, 21. November 2026): Die Größen richten sich nach der
//   natürlichen Durchschnittsgröße; der Drache ist etwa so groß wie ein
//   Elefant. Umrechnung mit der Quadratwurzel (Entwickler hat zwischen
//   Kubikwurzel, Quadratwurzel und 1:1 gewählt).
// Begründung (Vorschlag Claude, übernommen): 1:1 geht nicht — echte Größen
//   reichen von 6 mm bis 6 m (Faktor 1000); eine Ameise wäre kleiner als ein
//   Pixel. Die Wurzel staucht und hält die Reihenfolge: doppelt so lang =
//   41 % größer. Bezugspunkt Ameise (0,6 cm = worldSize 3), weil sie die
//   kleinste Größe ist, die man noch erkennt.
// Angriffsreichweite, Aggro-Radius und Tempo wachsen mit (Vorgabe
//   Entwickler, 21. November 2026); die einzelnen Werte stehen mit
//   Realismus- und Balance-Anpassungen am Wesen (entities.ts).
// -----------------------------------------------------------

/** worldSize eines Wesens mit SIZE_SCALE_REF_CM Länge (Ameise). */
export const SIZE_SCALE_BASE = 3;
/** Bezugslänge der Größenskala in cm (Ameise). */
export const SIZE_SCALE_REF_CM = 0.6;
/** Exponent der Größenskala: 0,5 = Quadratwurzel (1/3 = Kubikwurzel, 1 = 1:1 ab der Ameise). */
export const SIZE_SCALE_EXPONENT = 0.5;

/**
 * Die Größenskala: echte Länge (cm) → worldSize. Die einzige Stelle, an der
 * sie steht — Wesen (entities.ts resolveEntitySize) und der ausgewachsene
 * Blob (PLAYER_WORLD_RADIUS_MAX) rechnen damit. Vorgabe (Entwickler,
 * 21. November 2026): echte Größen eintragen, die Skala erst bei der
 * Anzeige anwenden, damit sie leicht anzupassen ist.
 */
export function worldSizeFromLength(lengthCm: number): number {
  return SIZE_SCALE_BASE * Math.pow(lengthCm / SIZE_SCALE_REF_CM, SIZE_SCALE_EXPONENT);
}

/** Welt-Radius des ausgewachsenen Blobs (61 cm) nach der Größenskala ≈ 16,6 (Begründung bei PLAYER_LENGTH_CM_MAX). */
export const PLAYER_WORLD_RADIUS_MAX = worldSizeFromLength(PLAYER_LENGTH_CM_MAX) * ENTITY_ICON_RADIUS_FACTOR;

// -----------------------------------------------------------
// GRÖSSEN-AGGRO (AiSystem, EntityLevelingSystem; GDD-03 Abschnitt 4)
//
// Ist ein Wesen mindestens SIZE_IGNORE_RATIO-mal so groß wie das andere
// (worldSize; beim Blob Radius ÷ ENTITY_ICON_RADIUS_FACTOR), lassen sich
// beide in Ruhe: Das große sieht im kleinen keine Beute, das kleine legt
// sich nicht mit dem großen an. Das gilt nur für Angriffe aus eigenem
// Antrieb — wer angegriffen wird oder einen Absorb-Fehlschlag bemerkt,
// wehrt sich trotzdem (Vorschlag in GDD-03 Abschnitt 4).
// Vorgabe (Entwickler, 21. November 2026): Große Tiere lassen deutlich
//   kleinere in Ruhe, da sie sie nicht als Beute sehen. Ebenso umgekehrt.
// Begründung (Vorschlag Claude, offen) für 4: Auf der Wurzel-Skala ist das
//   16-mal so lang. Ein Wert für beide Richtungen ist leicht zu verstehen.
//   Der Drache (94,9) beachtet den Blob erst ab worldSize 23,7 (Radius 13,
//   fast ausgewachsen) — er bleibt ein Ziel für später; bei 3 würde er den
//   ausgewachsenen Blob (30,2) nie angreifen. Springspinne (3,5) und
//   Giftspinne (4,7) greifen den Blob ab Radius 7,6 bzw. 10,4 nicht mehr an.
// -----------------------------------------------------------
export const SIZE_IGNORE_RATIO = 4;

/**
 * Grundgeschwindigkeit für Entities pro worldSize-Einheit.
 * speed = worldSize × ENTITY_SPEED_PER_WORLD_SIZE = 5× eigene Größe/s.
 */
export const ENTITY_SPEED_PER_WORLD_SIZE = 5;

// -----------------------------------------------------------
// KI DER WESEN (AiSystem)
//
// Bis 14. November 2026 ohne Begründung in AiSystem.ts. Rein technische
// Werte (KI-Rechenabstand, Takt, „angekommen“) bleiben dort.
// -----------------------------------------------------------

/**
 * Aggro geht verloren, wenn der Blob weiter als AGGRO_LOSS_FACTOR × Aggro-Radius
 * entfernt ist.
 * Begründung (rekonstruiert, bitte bestätigen): Hysterese — wer gerade die
 * Aggro-Grenze überschreitet, soll nicht sofort wieder vergessen werden,
 * sonst würden Gegner an der Grenze ständig an- und abschalten.
 */
export const AGGRO_LOSS_FACTOR = 2.5;

/**
 * Ein verfolgendes Wesen hält an, wenn es näher als Angriffsreichweite ×
 * CHASE_STOP_FACTOR ist.
 * Begründung (rekonstruiert, bitte bestätigen): stoppt mittig in der
 * Angriffsreichweite und läuft nicht durch den Blob hindurch.
 */
export const CHASE_STOP_FACTOR = 0.5;

/** Herumwandern: höchstens so weit vom Spawnpunkt (10 Kacheln). > Begründung offen */
export const WANDER_RADIUS_PX = 10 * 32;
/** Herumwandern: Anteil des Kampftempos. > Begründung offen */
export const WANDER_SPEED_FACTOR = 0.45;
/** Herumwandern: Pause nach Erreichen des Ziels, zufällig zwischen MIN und MAX (ms). > Begründung offen */
export const WANDER_PAUSE_MIN_MS = 1500;
export const WANDER_PAUSE_MAX_MS = 4000;

// -----------------------------------------------------------
// TAKTIK „ZUSCHLAGEN UND ABHAUEN“ (AiSystem, Feld hitAndRun am Wesen)
//
// Vorgabe (Entwickler, 21. November 2026): Die Waldmaus greift einmal an und
//   haut dann 1 s im Zickzack ab. Ist der Blob danach noch in Reichweite
//   (2 Mauslängen), greift sie wieder an und haut wieder ab usw.; sonst
//   greift sie nicht mehr an und läuft weiter weg. Fluchtdauer und
//   Reichweite stehen am Wesen (entities.ts), hier nur, wie gezackt wird.
// -----------------------------------------------------------

/**
 * Abweichung vom geraden Fluchtweg beim Hakenschlagen (Grad, abwechselnd
 * links und rechts).
 * Begründung (Vorschlag Claude, offen): Eine Maus schlägt Haken vor allem
 * seitwärts. Bei 70° kommt sie nur ≈ 34 % ihres Tempos vom Blob weg
 * (Waldmaus: ≈ 17 px in 1 s) — wer ihr nachsetzt, bleibt in Reichweite und
 * wird wieder gebissen; wer stehen bleibt, ist danach zu weit weg. Bei 45°
 * entkäme sie jedem Blob schon nach dem ersten Biss.
 */
export const ZIGZAG_ANGLE_DEG = 70;
/** Zeit zwischen zwei Haken (ms). Begründung (Vorschlag Claude, offen): vier Haken pro Sekunde wirken hektisch, bleiben aber sichtbar. */
export const ZIGZAG_SWITCH_MS = 250;
/** Körperlänge eines Wesens = Durchmesser seines Symbols (2 × ENTITY_ICON_RADIUS_FACTOR × worldSize). */
export const BODY_LENGTH_PER_WORLD_SIZE = 2 * ENTITY_ICON_RADIUS_FACTOR;

// -----------------------------------------------------------
// GEGNER UNTEREINANDER (EntityLevelingSystem, GDD-03 Abschnitt 8)
//
// Wesen mit Angriff jagen schwächere Wesen; Siege geben Bonus-Level, die
// HP, Schaden und Tempo skalieren. Der Bonus geht beim Respawn verloren.
// > Begründung offen (GDD-03): alle vier Werte. Offene Abweichung: Bonus-
//   Level skalieren Werte unabhängig von den Skills (GDD-02 Abschnitt 8.6,
//   TODO.md). Bis 14. November 2026 ohne Begründung in EntityLevelingSystem.ts.
// -----------------------------------------------------------

/** Höchstes Bonus-Level */
export const ENTITY_MAX_BONUS_LEVEL = 3;
/** Siege bis zum nächsten Bonus-Level */
export const ENTITY_WINS_PER_BONUS_LEVEL = 3;
/** Suchradius für Beute (px) */
export const ENTITY_HUNT_RADIUS_PX = 300;
/** Faktor auf HP, Schaden und Tempo je Bonus-Level */
export const ENTITY_BONUS_STAT_SCALE = 1.25;

// Stand: 14. November 2026 — allgemeine Regeln gesammelt, Skill-Werte an die Skills verschoben
