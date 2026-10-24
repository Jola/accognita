// ============================================================
// DAMAGE SYSTEM
// Absorb & Evolve — Die 8-stufige Schadenspipeline (GDD-05)
//
// Nimmt: baseDamage + Angreifer-Effekte + Verteidiger-Effekte
// Gibt: finalDamage (milli-HP, Integer)
//
// Keine Phaser-Abhängigkeit. Kein State. Rein funktional.
// ============================================================

import type { DamageType } from "../types/Combat";
import {
  MAX_PERCENT_REDUCTION,
  MIN_FINAL_DAMAGE,
  MAX_WEAKNESS_MULT,
  MIN_RESISTANCE_MULT,
} from "../data/balance";

// -----------------------------------------------------------
// DamageInput: Alle Parameter für die Pipeline
// -----------------------------------------------------------
export interface DamageInput {
  baseDmg: number;               // milli-HP (Basisschaden vor Attacker-Mult)
  damageType?: DamageType;       // Schadenstyp (undefined = untypisiert/blunt)
  hitMult: number;               // Treffer-Stufe (HIT_DAMAGE_MULT): 0 = verfehlt, 1 = normal

  // Angreifer-Effekte
  attackerMult: number;          // Multiplikator (1.0 = neutral, >1.0 = stärker)
  attackerPenetration: number;   // milli-HP Flat-Block die ignoriert werden

  // Verteidiger-Effekte
  defenderFlatBlock: number;     // milli-HP (addiert aus allen aktiven Skills)
  defenderPercentReduce: number; // 0.0–1.0 (addiert, dann gecappt)
  defenderWeaknessMult: number;  // >1.0 = Schwäche, <1.0 = Resistenz (multiplikativ)
  defenderImmune: boolean;       // true → finalDamage = 0
}

// -----------------------------------------------------------
// calcFinalDamage — Die Pipeline
//
// Schritte (aus GDD-05 Abschnitt 3.2):
//   [1] Basis-Schaden (Input)
//   [1b] × Treffer-Stufe (verfehlt → 0, kritisch ×2,5 — vor Rüstung, damit
//        Krits durch Flat-Block durchschlagen und leichte Treffer daran hängen bleiben)
//   [2] × Angreifer-Multiplikator
//   [3+4] Penetration bricht Flat-Block auf
//   [5] Prozentuale Reduktion (gecappt)
//   [6] Schwäche/Stärke-Multiplikator
//   [7] Minimum-Clamp (mindestens MIN_FINAL_DAMAGE)
//   [8] Final-Schaden (Integer)
// -----------------------------------------------------------
export function calcFinalDamage(input: DamageInput): number {
  if (input.defenderImmune || input.hitMult <= 0) return 0;

  // [1b+2] Treffer-Stufe und Angreifer-Multiplikator
  const afterMult = input.baseDmg * input.hitMult * Math.max(0, input.attackerMult);

  // [3+4] Penetration + Flat-Block
  // Penetration "bricht" einen Teil des Flat-Blocks auf
  const effectiveBlock = Math.max(0, input.defenderFlatBlock - input.attackerPenetration);
  const afterBlock = Math.max(0, afterMult - effectiveBlock);

  // [5] Prozentuale Reduktion (additiv gestapelt, gecappt bei MAX_PERCENT_REDUCTION)
  const reduction = Math.min(Math.max(0, input.defenderPercentReduce), MAX_PERCENT_REDUCTION);
  const afterReduction = afterBlock * (1 - reduction);

  // [6] Schwäche/Stärke
  // Multiplikativ — wird gecappt (verhindert Exploit durch viele Resistenzskills)
  const weaknessMult = Math.min(
    Math.max(MIN_RESISTANCE_MULT, input.defenderWeaknessMult),
    MAX_WEAKNESS_MULT
  );
  const afterWeakness = afterReduction * weaknessMult;

  // [7+8] Minimum-Clamp + Integer
  return Math.max(MIN_FINAL_DAMAGE, Math.round(afterWeakness));
}
