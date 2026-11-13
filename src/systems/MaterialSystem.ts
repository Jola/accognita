// ============================================================
// MATERIAL SYSTEM
// Absorb & Evolve — Logik für Materialien und Rezeptkosten
// Keine Phaser-Abhängigkeit. Reine Logik, testbar in Isolation.
// ============================================================

import type { PlayerState } from "../types/GameState";
import type { MaterialStack } from "../types/Material";
import { MATERIAL_MAP } from "../data/materials";

// -----------------------------------------------------------
// ZAHLENFORMATIERUNG
// Unlimited storage — Zahlen werden ab 1.000 abgekürzt.
// Max: Number.MAX_SAFE_INTEGER ≈ 9 Quadrillionen (praktisch unbegrenzt)
// -----------------------------------------------------------
const SUFFIXES: [number, string][] = [
  [1e15, "Q"],  // Quadrillion
  [1e12, "T"],  // Trillion
  [1e9,  "B"],  // Billion
  [1e6,  "M"],  // Million
  [1e3,  "K"],  // Tausend
];

export function formatAmount(n: number): string {
  for (const [threshold, suffix] of SUFFIXES) {
    if (n >= threshold) {
      const value = n / threshold;
      // Keine Nachkommastelle wenn glatt, sonst 1 Stelle
      const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
      return `${formatted}${suffix}`;
    }
  }
  return String(Math.floor(n));
}

// -----------------------------------------------------------
// INVENTAR-HILFSFUNKTIONEN
// -----------------------------------------------------------

/** Gibt die aktuelle Menge eines Materials zurück */
export function getMaterialAmount(
  player: PlayerState,
  materialId: string
): number {
  return player.materials.get(materialId) ?? 0;
}

/** Fügt eine Menge eines Materials zum Inventar hinzu */
export function addMaterial(
  player: PlayerState,
  materialId: string,
  amount: number
): void {
  if (amount <= 0) return;
  const current = getMaterialAmount(player, materialId);
  player.materials.set(materialId, current + amount);
}

/** Prüft ob der Spieler alle Kosten bezahlen kann */
export function canAfford(
  player: PlayerState,
  cost: MaterialStack[]
): boolean {
  return cost.every(
    ({ materialId, amount }) =>
      getMaterialAmount(player, materialId) >= amount
  );
}

/** Zieht Materialkosten ab — nur aufrufen nach canAfford-Check! */
export function deductMaterials(
  player: PlayerState,
  cost: MaterialStack[]
): void {
  for (const { materialId, amount } of cost) {
    const current = getMaterialAmount(player, materialId);
    player.materials.set(materialId, Math.max(0, current - amount));
  }
}

/** Alle Materialien als Array zurückgeben (zum Anzeigen) */
export function getMaterialList(
  player: PlayerState
): { id: string; name: string; icon: string; amount: number; formatted: string }[] {
  const result: { id: string; name: string; icon: string; amount: number; formatted: string }[] = [];

  for (const [id, amount] of player.materials) {
    if (amount <= 0) continue;
    const def = MATERIAL_MAP.get(id);
    if (!def) continue;
    result.push({ id, name: def.name, icon: def.icon, amount, formatted: formatAmount(amount) });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

// -----------------------------------------------------------
// GROW-FÄHIGKEIT — [VERWORFEN, 13. November 2026]
// Früher: useGrow() per Knopf, −5 Pflanzenfasern, +1 → 25 MaxHP (GROW_HP).
// Jetzt: Grow wirkt passiv über die Zeit und verdaut Fasern zu Körpermasse
// (src/systems/GrowSystem.ts, src/data/grow.ts). Vorgabe (Entwickler).
// -----------------------------------------------------------
