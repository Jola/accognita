// ============================================================
// TERRAIN — Gelände, Wasser und Hindernisse der Oberwelt (GDD-12)
// Absorb & Evolve
//
// Kein Phaser-Import. Alle Werte VORLÄUFIG.
//
// Vorgabe (Entwickler, 22. November 2026):
//  - Es gibt Kollisionen, sodass man sich ein wenig seinen Weg suchen muss —
//    es soll sich danach anfühlen, dass man etwas entdecken muss.
//  - Über Wasser kann sich (vorerst) niemand bewegen, und dort werden keine
//    Einheiten platziert. Später wird das für Fische und Amphibien aufgehoben.
//  - Biome sind nicht mehr klar viereckig, sondern haben zufällige Formen.
//  - Übergänge sind optisch schön erkennbar: zwischen Land und Wasser ein
//    Ufer, die Ecken etwas gerundet.
// Vorgabe (Entwickler, 22. November 2026, Vorschlag Claude übernommen):
//  Hindernisse blockieren teils größenabhängig — Wasser, Felsen und Stämme
//  blockieren alle; Gestrüpp lässt kleine Wesen durch, große nicht.
// ============================================================

import type { BiomeId } from "../world/Chunk";

// ────────────────────────────────────────
// Bodenarten
//
// Die Welt ist ein Raster aus Eckpunkten (alle 32 px); jeder Eckpunkt hat eine
// Bodenart. Gezeichnet wird zwischen den Eckpunkten („Dual-Grid“): eine Kachel
// hängt von ihren 4 Ecken ab, die Grenze verläuft gerundet dazwischen.
// Begründung (Vorschlag Claude, offen): So braucht es keine handgezeichneten
// Übergangskacheln je Paar von Bodenarten — die Übergänge werden aus den
// Bodenarten berechnet, und Kollision (Wasser) nutzt dieselbe Grenze wie die
// Grafik.
// ────────────────────────────────────────

export const T_WATER   = 0;
export const T_FOREST  = 1;  // Waldboden (Gras, Laub)
export const T_SWAMP   = 2;  // Schlamm und Moos
export const T_MEADOW  = 3;  // Wiese
export const T_ROCK    = 4;  // Fels und Geröll
export const T_SAND    = 5;  // Sand
export const T_DUNGEON = 6;  // Steinplatten (Ruinen)
export const TERRAIN_COUNT = 7;

export const TERRAIN_NAMES = ["Wasser", "Waldboden", "Schlamm", "Wiese", "Fels", "Sand", "Steinplatten"];

/** Farbe je Bodenart für die Karte (GDD-10 Abschnitt 11). */
export const TERRAIN_MAP_COLORS = ["#3b7dbf", "#3f7d3a", "#4f5a34", "#86ad4f", "#7d7d86", "#d9bf7a", "#4a4a58"];

/** Bodenart je Biom. */
export const BIOME_GROUND: Record<BiomeId, number> = {
  forest:   T_FOREST,
  swamp:    T_SWAMP,
  highland: T_MEADOW,
  mountain: T_ROCK,
  desert:   T_SAND,
  dungeon:  T_DUNGEON,
};

// ────────────────────────────────────────
// Biom-Formen
//
// Die Zonen aus BiomeDefinitions.ts bleiben der Grundriss (Startwald oben
// links, Gefahr steigt nach außen). Bevor ein Punkt in den Zonen nachgeschlagen
// wird, wird er mit Rauschen verschoben („Domain Warping“): Die Grenzen werden
// zu Buchten, Zungen und Inseln.
// Begründung (Vorschlag Claude, offen): Zufällige Formen (Vorgabe), ohne den
// Aufbau der Welt zu verlieren — der Weg vom leichten Start ins Gefährliche
// bleibt erhalten.
// ────────────────────────────────────────

/** Wie weit ein Punkt höchstens verschoben wird (px; 1 Chunk = 1024 px). */
export const BIOME_WARP_PX = 1700;
/** Größe der Buchten und Zungen (px je Rauschzelle). */
export const BIOME_WARP_SCALE_PX = 2600;
/** Feine Ausfransung der Grenzen: kleinere Buchten darüber (px). */
export const BIOME_DETAIL_WARP_PX = 320;
export const BIOME_DETAIL_SCALE_PX = 520;

// ────────────────────────────────────────
// Wasser
// ────────────────────────────────────────

export interface BiomeWaterRule {
  /** Seen: Rauschwert, ab dem Wasser ist (höher = weniger Seen). */
  lakeThreshold: number;
  /** Bäche fließen durch dieses Biom. */
  streams: boolean;
}

/**
 * Begründung (Vorschlag Claude, offen): Sumpf ist nass, Wald und Hochland
 * haben Teiche und Bäche, Gebirge Bergseen, die Wüste selten eine Oase; die
 * Ruinen sind trocken.
 */
export const BIOME_WATER: Record<BiomeId, BiomeWaterRule> = {
  forest:   { lakeThreshold: 0.685, streams: true },
  swamp:    { lakeThreshold: 0.565, streams: true },
  highland: { lakeThreshold: 0.695, streams: true },
  mountain: { lakeThreshold: 0.69, streams: false },
  desert:   { lakeThreshold: 0.73, streams: false },
  dungeon:  { lakeThreshold: 9, streams: false },
};

/** Größe der Seen (px je Rauschzelle). */
export const LAKE_SCALE_PX = 900;
/** Länge der Bachwindungen (px je Rauschzelle). */
export const STREAM_SCALE_PX = 2400;
/** Breite der Bäche (im Rauschmaß; 0,03 ≈ 2 Kacheln). */
export const STREAM_HALF_WIDTH = 0.022;
/** Furten: Rauschwert, ab dem ein Bach unterbrochen ist (niedriger = mehr Furten). */
export const STREAM_FORD_THRESHOLD = 0.6;
/**
 * Wie stark die Uferlinie innerhalb einer Kachel wellt (0 = glatte Rundung).
 * Begründung (Vorschlag Claude, offen): leicht unregelmäßig wirkt natürlicher
 * als eine exakte Rundung, bleibt aber erkennbar gerundet (Vorgabe).
 */
export const SHORE_WOBBLE = 0.22;

/**
 * Rund um den Startpunkt: kein Wasser und keine Hindernisse.
 * Begründung (Vorschlag Claude, offen): Der Blob erwacht blind und
 * unbeweglich im Nest (GDD-09) — die ersten Schritte sollen frei sein.
 */
export const START_POINT = { x: 400, y: 300 };
export const START_CLEAR_WATER_PX = 360;
export const START_CLEAR_OBSTACLE_PX = 70;

// ────────────────────────────────────────
// Hindernisse
//
// Größe aus der echten Größe des Vorbilds (lengthCm = Durchmesser), auf der
// Wurzel-Skala aus balance.ts — wie die Wesen (GDD-07 Abschnitt 1).
// Begründung (Vorschlag Claude, offen): Ein Stamm ist so groß wie ein Wesen
// gleicher echter Größe; ein Kiesel blockiert eine Ameise, ein Grashüpfer-
// großer Blob nicht.
// ────────────────────────────────────────

/** Wer wird blockiert: alle, nur große Wesen (Gestrüpp) oder nur kleine (Kiesel). */
export type ObstacleBlock = "all" | "large" | "small";

export interface ObstacleKind {
  id: string;
  name: string;
  /** Echter Durchmesser in cm. */
  lengthCm: number;
  block: ObstacleBlock;
  /** Kollisionsradius als Anteil des sichtbaren Radius (etwas kleiner = fair). */
  colliderFactor: number;
  /** Baumkrone: echter Durchmesser in cm (über allen Wesen gezeichnet, wird durchsichtig, wenn der Blob darunter ist). */
  crownCm?: number;
  /** Wird über den Wesen gezeichnet und durchsichtig, wenn der Blob darin ist (Gestrüpp). */
  overhead?: boolean;
}

export const OBSTACLE_KINDS: Record<string, ObstacleKind> = {
  tree:       { id: "tree",       name: "Laubbaum",   lengthCm: 40,  block: "all",   colliderFactor: 0.9,  crownCm: 600 },
  birch:      { id: "birch",      name: "Birke",      lengthCm: 25,  block: "all",   colliderFactor: 0.9,  crownCm: 380 },
  swamp_tree: { id: "swamp_tree", name: "Erle",       lengthCm: 45,  block: "all",   colliderFactor: 0.9,  crownCm: 480 },
  stump:      { id: "stump",      name: "Baumstumpf", lengthCm: 50,  block: "all",   colliderFactor: 0.85 },
  rock:       { id: "rock",       name: "Stein",      lengthCm: 60,  block: "all",   colliderFactor: 0.85 },
  boulder:    { id: "boulder",    name: "Felsbrocken", lengthCm: 130, block: "all",  colliderFactor: 0.85 },
  cactus:     { id: "cactus",     name: "Kaktus",     lengthCm: 35,  block: "all",   colliderFactor: 0.9 },
  pillar:     { id: "pillar",     name: "Säule",      lengthCm: 90,  block: "all",   colliderFactor: 0.95 },
  bush:       { id: "bush",       name: "Gestrüpp",   lengthCm: 100, block: "large", colliderFactor: 0.8, overhead: true },
  reeds:      { id: "reeds",      name: "Schilf",     lengthCm: 70,  block: "large", colliderFactor: 0.8, overhead: true },
  dry_bush:   { id: "dry_bush",   name: "Dornbusch",  lengthCm: 80,  block: "large", colliderFactor: 0.8, overhead: true },
  pebble:     { id: "pebble",     name: "Kiesel",     lengthCm: 4,   block: "small", colliderFactor: 0.9 },
  rubble:     { id: "rubble",     name: "Schutt",     lengthCm: 8,   block: "small", colliderFactor: 0.9 },
};

/**
 * Gestrüpp blockiert Wesen ab dieser Größe (worldSize).
 * 14 ≈ Blob-Radius 7,7: Mäuse (11–12) und Spitzmäuse kommen durch, Eidechse
 * (17), Wiesel (16), Igel (19) und der ausgewachsene Blob nicht.
 * Begründung (Vorschlag Claude, übernommen — Idee; Zahl offen): Kleine Wesen
 * haben eigene Schleichwege (wie das Mauswiesel durch Mauselöcher passt).
 */
export const BLOCK_LARGE_FROM_SIZE = 14;
/**
 * Kiesel blockieren Wesen unter dieser Größe (worldSize).
 * 6 ≈ Blob-Radius 3,3: Ameisen, Marienkäfer, Spinnen und der frische Blob
 * müssen herum, ab Grashüpfer-Größe rollt man darüber.
 * Begründung (Vorschlag Claude, offen): Auch der winzige Blob am Anfang hat
 * Hindernisse in seinem Maßstab — Bäume sind für ihn so groß wie Häuser.
 */
export const BLOCK_SMALL_BELOW_SIZE = 6;

/** Großes Raster (Bäume, Felsen, Gestrüpp): höchstens ein Hindernis je Zelle, ganz in der Zelle → nie überlappend. */
export const LARGE_CELL_PX = 64;
/** Kleines Raster (Kiesel, Schutt). */
export const SMALL_CELL_PX = 32;

export interface WeightedKind { id: string; weight: number }
export interface BiomeObstacleRule {
  /** Wahrscheinlichkeit je großer Zelle, dass dort ein Hindernis steht (im Dickicht; auf Lichtungen weniger). */
  largeDensity: number;
  large: WeightedKind[];
  /** Wahrscheinlichkeit je kleiner Zelle. */
  smallDensity: number;
  small: WeightedKind[];
}

/**
 * Begründung (Vorschlag Claude, offen): Je Biom die Hindernisse des Vorbilds —
 * Wald dicht mit Bäumen und Gestrüpp, Sumpf mit Erlen und Schilf, Hochland
 * offen mit Steinen und Birken, Gebirge voller Felsen, Wüste karg mit
 * Kakteen, Ruinen mit Säulen und Schutt.
 */
export const BIOME_OBSTACLES: Record<BiomeId, BiomeObstacleRule> = {
  forest: {
    largeDensity: 0.36,
    large: [{ id: "tree", weight: 6 }, { id: "bush", weight: 4 }, { id: "rock", weight: 1 }, { id: "stump", weight: 1 }],
    smallDensity: 0.05, small: [{ id: "pebble", weight: 1 }],
  },
  swamp: {
    largeDensity: 0.3,
    large: [{ id: "swamp_tree", weight: 3 }, { id: "reeds", weight: 6 }, { id: "stump", weight: 1 }],
    smallDensity: 0.03, small: [{ id: "pebble", weight: 1 }],
  },
  highland: {
    largeDensity: 0.22,
    large: [{ id: "birch", weight: 2 }, { id: "bush", weight: 3 }, { id: "rock", weight: 4 }, { id: "boulder", weight: 1 }],
    smallDensity: 0.06, small: [{ id: "pebble", weight: 1 }],
  },
  mountain: {
    largeDensity: 0.34,
    large: [{ id: "boulder", weight: 4 }, { id: "rock", weight: 5 }],
    smallDensity: 0.12, small: [{ id: "pebble", weight: 1 }],
  },
  desert: {
    largeDensity: 0.13,
    large: [{ id: "cactus", weight: 4 }, { id: "dry_bush", weight: 3 }, { id: "rock", weight: 2 }],
    smallDensity: 0.05, small: [{ id: "pebble", weight: 1 }],
  },
  dungeon: {
    largeDensity: 0.24,
    large: [{ id: "pillar", weight: 4 }, { id: "rock", weight: 2 }],
    smallDensity: 0.15, small: [{ id: "rubble", weight: 1 }],
  },
};

/**
 * Dickicht und Lichtungen: Rauschen verteilt die Hindernisse ungleich.
 * Unter DICKICHT_LOW: Lichtung (frei), ab DICKICHT_LOW + DICKICHT_RANGE: volle Dichte × DICKICHT_MAX.
 * Begründung (Vorschlag Claude, offen): Gleichmäßig verteilte Hindernisse
 * wirken wie ein Muster; Dickichte, durch die man einen Weg suchen muss, und
 * freie Lichtungen machen das Erkunden aus (Vorgabe).
 */
export const THICKET_SCALE_PX = 750;
export const THICKET_LOW = 0.4;
export const THICKET_RANGE = 0.2;
export const THICKET_MAX = 1.6;
