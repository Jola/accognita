// ============================================================
// SKILL SYSTEM
// Absorb & Evolve — Reine Logik, keine Rendering-Abhängigkeit
// ============================================================

import type {
  SkillInstance,
  SkillDiscoveryResult,
  CombineResult,
  DiscoveryMethod,
} from "../types/Skill";
import { createSkillProgress } from "../types/Skill";
import type { PlayerState } from "../types/GameState";
import { ALL_SKILLS, RECIPE_INDEX } from "../data/skills";
import {
  BASE_XP_ABSORB,
  BASE_XP_ANALYZE,
  BASE_XP_CORE,
  BASE_HP,
  HP_PER_GROWTH,
  BASE_MP,
  MP_PER_GROWTH,
  scaleXp,
  calcCombatXpMultiplier,
} from "../data/balance";
import {
  gainExperience,
  getCorePractice,
  getSkillPractice,
  calcGrowth,
} from "./ProgressionSystem";
import type { GainResult } from "./ProgressionSystem";

// Skills haben keine Level, nur Erfahrung. Wie Erfahrung verbucht wird
// (Wiedererlernen, Übertraining, Kapazität), steht in ProgressionSystem.ts.
// Hier wird nur entschieden, WOFÜR es wie viel Roh-Erfahrung gibt.

// -----------------------------------------------------------
// KERN-FÄHIGKEITS-XP
// entityLevel wird übergeben damit die Skalierung greift.
// -----------------------------------------------------------
export function gainCoreAbilityXp(
  player: PlayerState,
  method: DiscoveryMethod,
  entityLevel: number = 1
): GainResult {
  const rawXp = scaleXp(BASE_XP_CORE, entityLevel, getCorePractice(player, method));
  return gainExperience(player, method, rawXp, Date.now());
}

// -----------------------------------------------------------
// NEUE SKILL-INSTANCE ERSTELLEN
// -----------------------------------------------------------
function createSkillInstance(player: PlayerState, skillId: string): SkillInstance {
  if (!ALL_SKILLS.has(skillId)) throw new Error(`Unbekannte Skill-ID: ${skillId}`);
  const now = Date.now();
  return {
    ...createSkillProgress(now, player.playtimeSeconds),
    definitionId: skillId,
    discoveredAt: now,
    isEnabled: true,
  };
}

// -----------------------------------------------------------
// SKILL DISCOVER
// entityLevel bestimmt den XP-Multiplikator (balance.ts) gegen den
// Übungsgrad des Skills: schwache Entities → kaum XP, starke → Bonus-XP.
// -----------------------------------------------------------
export function discoverSkill(
  player: PlayerState,
  skillId: string,
  method: DiscoveryMethod,
  entityLevel: number = 1
): SkillDiscoveryResult {
  if (!ALL_SKILLS.has(skillId)) throw new Error(`Unbekannte Skill-ID: ${skillId}`);

  const baseXp = method === "absorb" ? BASE_XP_ABSORB : BASE_XP_ANALYZE;

  // ERSTENTDECKUNG — kein XP, nur Discovery
  if (!player.discoveredSkills.has(skillId)) {
    player.discoveredSkills.set(skillId, createSkillInstance(player, skillId));
    return { skillId, method, xpGained: 0, wasNewDiscovery: true, events: [] };
  }

  const rawXp = scaleXp(baseXp, entityLevel, getSkillPractice(player, skillId));
  const gain = gainExperience(player, skillId, rawXp, Date.now());
  return { skillId, method, xpGained: gain.xpNow + gain.xpDeferred, wasNewDiscovery: false, events: gain.events };
}

// -----------------------------------------------------------
// SKILL COMBINE
// -----------------------------------------------------------
export function combineSkills(
  player: PlayerState,
  skillIdA: string,
  skillIdB: string
): CombineResult {
  if (skillIdA === skillIdB) {
    return { outcome: "invalid_input", message: "Du kannst einen Skill nicht mit sich selbst kombinieren." };
  }

  const defA = ALL_SKILLS.get(skillIdA);
  const defB = ALL_SKILLS.get(skillIdB);

  if (!defA || !defB) {
    return { outcome: "invalid_input", message: "Unbekannter Skill." };
  }

  if (defA.category !== "basic" || defB.category !== "basic") {
    return { outcome: "invalid_input", message: "Nur Basis-Skills können kombiniert werden." };
  }

  const [a, b] = [skillIdA, skillIdB].sort();
  const resultId = RECIPE_INDEX.get(`${a}+${b}`);

  if (!resultId) {
    return { outcome: "no_recipe", message: "Diese Kombination ergibt keinen bekannten Skill." };
  }

  const alreadyKnown = player.discoveredSkills.has(resultId);

  if (alreadyKnown) {
    // Kein entityLevel verfügbar beim Kombinieren → neutraler Multiplikator (×1.0)
    const resultDef = ALL_SKILLS.get(resultId)!;
    const gain = gainExperience(player, resultId, BASE_XP_ABSORB, Date.now());
    const xpGained = Math.round(gain.xpNow + gain.xpDeferred);

    return {
      outcome: "success_xp",
      resultSkillId: resultId,
      xpGained,
      message: `${resultDef.name} bereits bekannt — +${xpGained} XP.`,
    };
  }

  player.discoveredSkills.set(resultId, createSkillInstance(player, resultId));
  const resultDef = ALL_SKILLS.get(resultId)!;

  return {
    outcome: "success_new",
    resultSkillId: resultId,
    message: `Neuer Skill entdeckt: ${resultDef.icon} ${resultDef.name}!`,
  };
}

// -----------------------------------------------------------
// PASSIVE SKILLS
// -----------------------------------------------------------
export function getPassiveSkills(player: PlayerState): SkillInstance[] {
  const result: SkillInstance[] = [];
  for (const instance of player.discoveredSkills.values()) {
    const def = ALL_SKILLS.get(instance.definitionId);
    if (def?.activation === "passive") result.push(instance);
  }
  return result;
}

// -----------------------------------------------------------
// UI-HILFSFUNKTIONEN
// -----------------------------------------------------------
export function getDiscoveredSkillsSorted(player: PlayerState): SkillInstance[] {
  return Array.from(player.discoveredSkills.values()).sort(
    (a, b) => a.discoveredAt - b.discoveredAt
  );
}

/**
 * Schadens-Faktor aktiver Angriffs-Skills (Biss, Klaue, Feuerodem) für
 * Blob und Gegner gleichermaßen. Stetig im Übungsgrad u:
 *   1 + 0,1·(u−1) + 0,15·Übergang(u zwischen 2 und 3)
 * [VERWORFEN] früher: +0,15 als Sprung ab Level 3. Jetzt ein fließender
 * Übergang zwischen u=2 und u=3 — bei ganzen Zahlen dieselben Werte wie
 * vorher, dazwischen ohne Sprung (Vorgabe Entwickler: fließend verbessern).
 * > Begründung offen (für den Bonus selbst)
 */
export function getSkillEffectiveness(practice: number): number {
  const bonusRamp = Math.min(1, Math.max(0, practice - 2));
  return 1.0 + (practice - 1) * 0.1 + 0.15 * bonusRamp;
}

// -----------------------------------------------------------
// SKILL-XP DURCH BENUTZUNG VERGEBEN
//
// Wird aufgerufen wenn ein Skill aktiv eingesetzt wird (aktive Skills)
// oder sein Effekt ausgelöst wird (passive Skills).
// -----------------------------------------------------------
/**
 * Gibt einem Skill XP.
 * amount:       Rohbetrag (in normalen XP-Einheiten, nicht milli-HP).
 * entityLevel:  Optional — wenn übergeben wird der Betrag per calcCombatXpMultiplier
 *               gegen den Übungsgrad skaliert. Fehlt er, wird amount direkt verwendet
 *               (z.B. bei Selbst-Effekten wie Photosynthesis oder Fixbeträgen wie Jump).
 */
export function gainSkillXp(
  player: PlayerState,
  skillId: string,
  amount: number,
  entityLevel?: number
): GainResult {
  const rawXp = entityLevel !== undefined
    ? amount * calcCombatXpMultiplier(entityLevel, getSkillPractice(player, skillId))
    : amount;
  return gainExperience(player, skillId, rawXp, Date.now());
}

// -----------------------------------------------------------
// WACHSTUM DES BLOBS (statt Charakter-Level)
//
// Vorgabe (Entwickler): kein Charakter-Level. Größe, HP und MP folgen dem
// stetigen Wachstum (ProgressionSystem.calcGrowth, Platzhalter bis Jörn
// festlegt, wie der Blob wächst). Bei gleicher Lebenserfahrung dieselben
// Werte wie mit dem alten Level, nur ohne Sprünge.
// -----------------------------------------------------------

/** maxHp für ein gegebenes Wachstum */
export function calcMaxHp(growth: number): number {
  return Math.round(BASE_HP + growth * HP_PER_GROWTH);
}

/** maxMp für ein gegebenes Wachstum */
export function calcMaxMp(growth: number): number {
  return Math.round(BASE_MP + growth * MP_PER_GROWTH);
}

/**
 * maxHp/maxMp an das aktuelle Wachstum anpassen. Zuwachs kommt auch den
 * aktuellen HP/MP zugute (wie früher beim Level-Up).
 */
export function updatePlayerGrowth(player: PlayerState): void {
  const growth = calcGrowth(player.lifetimeXp);
  const newMaxHp = calcMaxHp(growth);
  const newMaxMp = calcMaxMp(growth);
  if (newMaxHp > player.maxHp) player.hp = Math.min(player.hp + (newMaxHp - player.maxHp), newMaxHp);
  if (newMaxMp > player.maxMp) player.mp = Math.min(player.mp + (newMaxMp - player.maxMp), newMaxMp);
  player.maxHp = newMaxHp;
  player.maxMp = newMaxMp;
}
