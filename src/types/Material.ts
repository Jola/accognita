// ============================================================
// MATERIAL TYPES
// Absorb & Evolve — Ressourcen-Typdefinitionen
// Keine Phaser-Abhängigkeit. Reine Datenstrukturen.
// ============================================================

// -----------------------------------------------------------
// MaterialDefinition: Unveränderliche Blaupause eines Materials
// -----------------------------------------------------------
export interface MaterialDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
}

// -----------------------------------------------------------
// MaterialDrop: Drop-Spezifikation in EntityDefinition
// Definiert wie viel von welchem Material eine Entity liefert
// -----------------------------------------------------------
export interface MaterialDrop {
  materialId: string;
  amountMin: number;
  amountMax: number;
  chance: number; // 0.0–1.0
}

// -----------------------------------------------------------
// MaterialStack: Menge eines bestimmten Materials
// Wird für Kosten (Skills) und Gewinne (Drops) verwendet
// -----------------------------------------------------------
export interface MaterialStack {
  materialId: string;
  amount: number;
}
