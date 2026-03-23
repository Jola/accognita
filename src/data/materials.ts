// ============================================================
// MATERIAL DATA
// Absorb & Evolve — Alle Material-Definitionen
// Quelle: GDD-02-Skillsystem.md, Abschnitt 2
//
// Neue Materialien hier eintragen — System ist beliebig erweiterbar.
// ============================================================

import type { MaterialDefinition } from "../types/Material";

export const MATERIAL_DEFINITIONS: MaterialDefinition[] = [
  // --- PFLANZLICHE MATERIALIEN ---
  {
    id: "plant_fiber",
    name: "Pflanzenfaser",
    icon: "🌿",
    description: "Faserige Struktur aus Pflanzen. Grundmaterial für Grow.",
  },
  {
    id: "wood",
    name: "Holz",
    icon: "🪵",
    description: "Hartes Pflanzenmaterial. Vielseitig einsetzbar.",
  },
  {
    id: "seed",
    name: "Samen",
    icon: "🌱",
    description: "Konzentrierte Wachstumskraft einer Pflanze.",
  },
  {
    id: "spore",
    name: "Spore",
    icon: "🍄",
    description: "Pilzspore mit giftigen Eigenschaften.",
  },

  // --- MINERALISCHE MATERIALIEN ---
  {
    id: "stone",
    name: "Stein",
    icon: "🪨",
    description: "Rohes Gestein. Grundmaterial aus der Welt.",
  },
  {
    id: "ore",
    name: "Erz",
    icon: "⛏️",
    description: "Metallhaltiges Mineral. Seltener als Stein.",
  },
  {
    id: "crystal",
    name: "Kristall",
    icon: "💎",
    description: "Reines Mineral mit magischen Eigenschaften.",
  },
];

// Schnellzugriffs-Map
export const MATERIAL_MAP: Map<string, MaterialDefinition> = new Map(
  MATERIAL_DEFINITIONS.map((m) => [m.id, m])
);
