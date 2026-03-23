// ============================================================
// MATERIAL SYSTEM
// Absorb & Evolve — Logik für Materialien und Rezeptkosten
// Keine Phaser-Abhängigkeit. Reine Logik, testbar in Isolation.
// ============================================================

import type { PlayerState } from "../types/GameState";
import type { MaterialStack } from "../types/Material";
import { MATERIAL_MAP } from "../data/materials";
import { ALL_SKILLS } from "../data/skills";

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
): { id: string; name: string; icon: string; amount: number }[] {
  const result: { id: string; name: string; icon: string; amount: number }[] =
    [];

  for (const [id, amount] of player.materials) {
    if (amount <= 0) continue;
    const def = MATERIAL_MAP.get(id);
    if (!def) continue;
    result.push({ id, name: def.name, icon: def.icon, amount });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

// -----------------------------------------------------------
// GROW-FÄHIGKEIT
// Verbraucht Materialien, erhöht MaxHP dauerhaft
// -----------------------------------------------------------

const GROW_HP_BASE = 5;         // HP-Gewinn bei Level 1
const GROW_HP_PER_LEVEL = 2;    // Zusatz-HP pro Skill-Level

export interface GrowResult {
  success: boolean;
  hpGained: number;
  missingMaterials?: MaterialStack[];
  message: string;
}

export function useGrow(player: PlayerState): GrowResult {
  const skill = player.discoveredSkills.get("grow");
  if (!skill) {
    return { success: false, hpGained: 0, message: "Grow nicht gelernt." };
  }

  const growDef = ALL_SKILLS.get("grow");
  if (!growDef?.materialCost) {
    return { success: false, hpGained: 0, message: "Kein Materialkosteneintrag für Grow." };
  }

  // Fehlende Materialien ermitteln
  const missing: MaterialStack[] = growDef.materialCost.filter(
    ({ materialId, amount }) =>
      getMaterialAmount(player, materialId) < amount
  );

  if (missing.length > 0) {
    const details = missing
      .map(({ materialId, amount }) => {
        const def = MATERIAL_MAP.get(materialId);
        return `${def?.icon ?? "?"} ${def?.name ?? materialId} ×${amount}`;
      })
      .join(", ");
    return {
      success: false,
      hpGained: 0,
      missingMaterials: missing,
      message: `Nicht genug Materialien: ${details}`,
    };
  }

  // Kosten abziehen
  deductMaterials(player, growDef.materialCost);

  // HP erhöhen
  const hpGained = GROW_HP_BASE + (skill.level - 1) * GROW_HP_PER_LEVEL;
  player.maxHp += hpGained;
  player.hp += hpGained;

  return {
    success: true,
    hpGained,
    message: `🌱 Gewachsen! +${hpGained} MaxHP (jetzt: ${player.maxHp})`,
  };
}
