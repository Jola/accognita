// ============================================================
// COMBAT SYSTEM
// Absorb & Evolve — Schadenformeln, Angriffs-Dispatch, Skill-Aktivierung
//
// Zuständig für:
//   - Angriffe des Spielers (Nahkampf-Basis + Skill-Angriffe)
//   - Angriffe von Entities auf den Spieler
//   - Skill-Aktivierbarkeit prüfen (MP, Cooldown)
//   - Checkpoint-Logik (Respawn nach Tod)
//
// Keine Phaser-Abhängigkeit. Kein Rendering.
// StatusEffects werden durch StatusEffectSystem appliziert,
// nicht direkt hier — CombatSystem gibt sie im AttackResult zurück.
// ============================================================

import type { PlayerState } from "../types/GameState";
import type { EntityDefinition, EntityInstance } from "../types/Entity";
import type { AttackResult, StatusEffect } from "../types/Combat";
import { ALL_SKILLS } from "../data/skills";
import { ENTITY_MAP } from "../data/entities";
import { getSkillEffectiveness } from "./SkillSystem";
import { getEntityBaseDamage } from "./EntityLevelingSystem";
import {
  calcDamageReduction,
  calcDamageMult,
  makeVenomEffect,
} from "./StatusEffectSystem";
import {
  calcChitinDr,
  calcVenomChance,
  calcVenomDmgPerTick,
  calcJumpDistance,
} from "./SkillEffects";

// Konstanten — Basis-Nahkampf des unausgerüsteten Blobs
const BASE_MELEE_DAMAGE  = 3;   // Basisschaden ohne Skills
const MELEE_ABSORB_SCALE = 1.5; // Bonus pro Absorb-Level

// -----------------------------------------------------------
// SPIELER-ANGRIFF
//
// skillId = undefined → unausgerüsteter Nahkampf (Blob-Körper)
// skillId = "jump"    → Dash (kein Schaden, nur Positionsverschiebung)
// Gibt AttackResult zurück — GameScene wendet HP-Änderungen an.
// -----------------------------------------------------------
export function playerAttack(
  player: PlayerState,
  targetInst: EntityInstance,
  skillId?: string
): AttackResult {
  const def = ENTITY_MAP.get(targetInst.definitionId);
  if (!def) {
    return missResult("Unbekannte Entity.");
  }

  // Dash-Skills: kein Schaden, nur Bewegung
  if (skillId) {
    const skillDef = ALL_SKILLS.get(skillId);
    if (skillDef?.attackType === "dash") {
      return dashResult(player, skillId);
    }
  }

  // --- Schadenberechnung ---
  let baseDmg: number;
  const appliedEffects: StatusEffect[] = [];

  if (!skillId) {
    // Unausgerüsteter Nahkampf: skaliert mit Absorb-Level
    baseDmg = BASE_MELEE_DAMAGE + player.coreAbilities.absorb.level * MELEE_ABSORB_SCALE;
  } else {
    const skillDef = ALL_SKILLS.get(skillId);
    if (!skillDef || !skillDef.baseDamage) {
      return missResult(`Skill ${skillId} hat keinen Schadenswert.`);
    }
    const inst = player.discoveredSkills.get(skillId);
    const lvl = inst?.level ?? 1;
    baseDmg = skillDef.baseDamage * getSkillEffectiveness(lvl);
  }

  // Passiv-Multiplikator (Superstrength etc.)
  const damageMult = calcDamageMult(player.statusEffects);
  let dmg = Math.max(1, Math.round(baseDmg * damageMult));

  // Rüstung des Ziels: aus skillLevels.chitin_armor oder standalone damageReduction
  const targetChitinLv = def.skillLevels?.["chitin_armor"] ?? 0;
  const targetDR = targetChitinLv > 0
    ? calcChitinDr(targetChitinLv)
    : (def.damageReduction ?? 0);
  if (targetDR > 0) {
    dmg = Math.max(1, Math.round(dmg * (1 - targetDR)));
  }

  // Venom: passiv auf Treffer anwenden (wenn Spieler Venom hat)
  const venomInst = player.discoveredSkills.get("venom");
  if (venomInst) {
    if (Math.random() < calcVenomChance(venomInst.level)) {
      appliedEffects.push(makeVenomEffect(venomInst.level));
    }
  }

  const msg = appliedEffects.length > 0
    ? `${def.icon} ${def.name}: ${dmg} Schaden + vergiftet!`
    : `${def.icon} ${def.name}: ${dmg} Schaden.`;

  return {
    hit: true,
    damageDealt: dmg,
    statusApplied: appliedEffects,
    message: msg,
  };
}

// -----------------------------------------------------------
// ENTITY-ANGRIFF AUF DEN SPIELER
// -----------------------------------------------------------
export function entityAttack(
  def: EntityDefinition,
  instance: EntityInstance,
  player: PlayerState
): AttackResult {
  if (!instance.isAlive || !instance.isAggro) {
    return missResult("Entity greift nicht an.");
  }

  // Basisschaden: aus bite-Skill-Level oder standalone damage
  const baseDmg = getEntityBaseDamage(def);

  // Spieler-Schadensreduktion (Chitin Armor etc.)
  const reduction = calcDamageReduction(player.statusEffects);
  const dmg = Math.max(1, Math.round(baseDmg * (1 - reduction)));

  // Venom: aus skillLevels.venom oder standalone venomChance
  const appliedEffects: StatusEffect[] = [];
  const venomLv = def.skillLevels?.["venom"] ?? 0;
  const venomChance = venomLv > 0 ? calcVenomChance(venomLv) : (def.venomChance ?? 0);
  if (venomChance > 0 && Math.random() < venomChance) {
    const venomDmg = venomLv > 0 ? calcVenomDmgPerTick(venomLv) : (def.venomDamagePerTick ?? 2);
    appliedEffects.push(makeVenomEffect(1, venomDmg));
  }

  const msg = dmg !== baseDmg
    ? `${def.icon} ${def.name} trifft! ${baseDmg}→${dmg} (Rüstung).`
    : `${def.icon} ${def.name} trifft für ${dmg} Schaden!`;

  return {
    hit: true,
    damageDealt: dmg,
    statusApplied: appliedEffects,
    message: msg,
  };
}

// -----------------------------------------------------------
// SKILL-AKTIVIERBARKEIT PRÜFEN
//
// Prüft ob der Spieler den Skill gerade einsetzen kann:
//   - Skill entdeckt?
//   - Genug MP?
//   - Cooldown abgelaufen?
// -----------------------------------------------------------
export function canActivateSkill(
  player: PlayerState,
  skillId: string
): { ok: boolean; reason?: string } {
  const def = ALL_SKILLS.get(skillId);
  if (!def) return { ok: false, reason: "Unbekannter Skill." };

  const inst = player.discoveredSkills.get(skillId);
  if (!inst) return { ok: false, reason: "Skill nicht entdeckt." };

  if (def.activation === "passive") {
    return { ok: false, reason: "Passiv-Skills können nicht manuell aktiviert werden." };
  }

  const mpCost = def.mpCost ?? 0;
  if (player.mp < mpCost) {
    return { ok: false, reason: `Nicht genug MP (${mpCost} benötigt, ${Math.floor(player.mp)} vorhanden).` };
  }

  const now = Date.now();
  const cooldownExpiry = player.skillCooldowns.get(skillId) ?? 0;
  if (now < cooldownExpiry) {
    const remaining = Math.ceil((cooldownExpiry - now) / 1000);
    return { ok: false, reason: `Cooldown: noch ${remaining}s.` };
  }

  return { ok: true };
}

// -----------------------------------------------------------
// SKILL AKTIVIEREN — MP abziehen + Cooldown setzen
//
// Gibt den verbrauchten MP-Betrag zurück.
// Wird von GameScene nach canActivateSkill() aufgerufen.
// -----------------------------------------------------------
export function consumeSkill(player: PlayerState, skillId: string): number {
  const def = ALL_SKILLS.get(skillId);
  if (!def) return 0;

  const mpCost = def.mpCost ?? 0;
  player.mp = Math.max(0, player.mp - mpCost);

  if (def.cooldownMs && def.cooldownMs > 0) {
    player.skillCooldowns.set(skillId, Date.now() + def.cooldownMs);
  }

  return mpCost;
}

// -----------------------------------------------------------
// DASH-REICHWEITE berechnen (für Jump-Skill)
// Gibt zurück wie weit der Dash in Pixeln geht.
// -----------------------------------------------------------
export function calcDashDistance(player: PlayerState, skillId: string): number {
  const inst = player.discoveredSkills.get(skillId);
  return calcJumpDistance(inst?.level ?? 1);
}

// -----------------------------------------------------------
// JUMP / DASH — Positionsverschiebung des Spielers
//
// Berechnet neue Weltposition anhand der normalisierten
// Bewegungsrichtung (dirX/dirY) und klemmt auf Weltgrenzen.
// Gibt die zurückgelegte Distanz zurück.
// -----------------------------------------------------------
export function executeJump(
  player: PlayerState,
  dirX: number,
  dirY: number,
  skillId: string,
  worldW: number,
  worldH: number
): number {
  const dist = calcDashDistance(player, skillId);
  player.x = Math.max(0, Math.min(worldW, player.x + dirX * dist));
  player.y = Math.max(0, Math.min(worldH, player.y + dirY * dist));
  return dist;
}

// -----------------------------------------------------------
// CHECKPOINT — Spieler respawnen
//
// HP und MP auf Max setzen, Position auf Spawn zurücksetzen,
// alle aktiven (nicht-permanenten) StatusEffekte entfernen.
// Passiv-Effekte bleiben erhalten (werden durch syncPassiveEffects neu gesetzt).
// -----------------------------------------------------------
export function executeCheckpoint(player: PlayerState): void {
  player.hp = player.maxHp;
  player.mp = player.maxMp;
  player.x  = player.spawnX;
  player.y  = player.spawnY;

  // Nur zeitbegrenzte Effekte entfernen — Passiv-Buffs bleiben
  player.statusEffects = player.statusEffects.filter(
    (e) => e.expiresAt === Infinity
  );
}

// -----------------------------------------------------------
// MP-REGENERATION — im Game Loop aufrufen (delta in ms)
// 1 MP/s Basisregeneration
// -----------------------------------------------------------
export function regenMp(player: PlayerState, deltaMs: number): void {
  if (player.mp < player.maxMp) {
    player.mp = Math.min(player.maxMp, player.mp + deltaMs / 1000);
  }
}

// -----------------------------------------------------------
// HILFSFUNKTIONEN
// -----------------------------------------------------------

function missResult(reason: string): AttackResult {
  return { hit: false, damageDealt: 0, statusApplied: [], message: reason };
}

function dashResult(player: PlayerState, skillId: string): AttackResult {
  const dist = calcDashDistance(player, skillId);
  return {
    hit: false,
    damageDealt: 0,
    statusApplied: [],
    message: `Dash! (${dist}px)`,
  };
}
