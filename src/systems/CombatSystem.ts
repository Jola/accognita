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
// Schadenberechnung läuft durch DamageSystem (8-stufige Pipeline).
// Effektauflösung läuft durch SkillEffectSystem.
// ============================================================

import type { PlayerState } from "../types/GameState";
import type { EntityDefinition, EntityInstance } from "../types/Entity";
import type { AttackResult, DamageType, StatusEffect } from "../types/Combat";
import { ALL_SKILLS } from "../data/skills";
import { ENTITY_MAP } from "../data/entities";
import { getSkillEffectiveness } from "./SkillSystem";
import { getEntityBaseDamage, getScaledDamage } from "./EntityLevelingSystem";
import { applyEffect } from "./StatusEffectSystem";
import { calcFinalDamage } from "./DamageSystem";
import {
  resolveDefenderEffects,
  resolveAttackerEffects,
  resolveOnHitStatusEffects,
  getPlayerPassiveSkillLevels,
} from "./SkillEffectSystem";
import {
  calcJumpDistance,
} from "./SkillEffects";

// Konstanten — Basis-Nahkampf des unausgerüsteten Blobs (milli-HP)
const BASE_MELEE_DAMAGE  = 3_000;   // 3 HP Basisschaden ohne Skills
const MELEE_ABSORB_SCALE = 1_500;   // 1.5 HP Bonus pro Absorb-Level
const UNARMED_DAMAGE_TYPE: DamageType = "blunt";  // Körpermasse = Wucht

// -----------------------------------------------------------
// Hilfsfunktion: Schadenstyp einer Entity bestimmen
//
// Priorität: bite → pierce, claw → slash, fire_breath → fire,
//            kein Skill → blunt
// -----------------------------------------------------------
function getEntityAttackDamageType(def: EntityDefinition): DamageType {
  if (def.skillLevels?.["bite"] !== undefined)  return "pierce";
  if (def.skillLevels?.["claw"] !== undefined)  return "slash";
  if (def.rangedAttackSkillId === "fire_breath") return "fire";
  return "blunt";
}

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

  // --- Basisschaden und Schadenstyp bestimmen ---
  let baseDmg: number;
  let damageType: DamageType;

  if (!skillId) {
    baseDmg = BASE_MELEE_DAMAGE + player.coreAbilities.absorb.level * MELEE_ABSORB_SCALE;
    damageType = UNARMED_DAMAGE_TYPE;
  } else {
    const skillDef = ALL_SKILLS.get(skillId);
    if (!skillDef || !skillDef.baseDamage) {
      return missResult(`Skill ${skillId} hat keinen Schadenswert.`);
    }
    const inst = player.discoveredSkills.get(skillId);
    const lvl = inst?.level ?? 1;
    baseDmg = skillDef.baseDamage * getSkillEffectiveness(lvl);
    damageType = skillDef.damageType ?? "blunt";
  }

  // --- Angreifer-Effekte (Superstrength etc.) ---
  const playerPassiveLevels = getPlayerPassiveSkillLevels(player);
  const attackerEffects = resolveAttackerEffects(playerPassiveLevels);

  // --- Verteidiger-Effekte der Entity (Chitin etc.) ---
  const entitySkillLevels = def.skillLevels ?? {};
  const defenderEffects = resolveDefenderEffects(entitySkillLevels, damageType);

  // --- Schadenspipeline ---
  const rawDmg = baseDmg;  // Basisschaden vor Pipeline (für absorbedDamage)
  const dmg = calcFinalDamage({
    baseDmg,
    damageType,
    attackerMult: attackerEffects.damageMult,
    attackerPenetration: attackerEffects.penetration,
    defenderFlatBlock: defenderEffects.flatBlock,
    defenderPercentReduce: defenderEffects.percentReduce,
    defenderWeaknessMult: defenderEffects.weaknessMult,
    defenderImmune: defenderEffects.immune,
  });

  const absorbedDamage = Math.max(0, Math.round(rawDmg * attackerEffects.damageMult) - dmg);

  // --- Entity Hemolymph: Rückschlag-Schaden an den Spieler ---
  const reflectDamage = defenderEffects.reflectDamage > 0
    ? defenderEffects.reflectDamage
    : 0;

  // --- Angreifer-seitige On-Hit-Effekte (Venom etc.) ---
  const appliedEffects: StatusEffect[] = resolveOnHitStatusEffects(playerPassiveLevels);

  // Entfernte Entities können nicht weiter behandelt werden
  const dmgDisplay = Math.round(dmg / 1000);
  const msg = appliedEffects.length > 0
    ? `${def.icon} ${def.name}: ${dmgDisplay} Schaden + vergiftet!`
    : `${def.icon} ${def.name}: ${dmgDisplay} Schaden.`;

  return {
    hit: true,
    damageDealt: dmg,
    absorbedDamage,
    reflectDamage,
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

  // Basisschaden: skaliert mit bonusLevel
  const bonusLevel = instance.bonusLevel ?? 0;
  const baseDmg = getScaledDamage(def, bonusLevel);
  const damageType = getEntityAttackDamageType(def);

  // Angreifer-Effekte der Entity (aktuell: keine damage_mult-Skills auf Entities)
  const entitySkillLevels = def.skillLevels ?? {};
  const attackerEffects = resolveAttackerEffects(entitySkillLevels);

  // Verteidiger-Effekte des Spielers (Chitin Armor etc.)
  const playerPassiveLevels = getPlayerPassiveSkillLevels(player);
  const defenderEffects = resolveDefenderEffects(playerPassiveLevels, damageType);

  // Schadenspipeline
  const rawDmg = baseDmg;
  const dmg = calcFinalDamage({
    baseDmg,
    damageType,
    attackerMult: attackerEffects.damageMult,
    attackerPenetration: attackerEffects.penetration,
    defenderFlatBlock: defenderEffects.flatBlock,
    defenderPercentReduce: defenderEffects.percentReduce,
    defenderWeaknessMult: defenderEffects.weaknessMult,
    defenderImmune: defenderEffects.immune,
  });

  const absorbedDamage = Math.max(0, Math.round(rawDmg * attackerEffects.damageMult) - dmg);

  // Spieler-Hemolymph: Rückschlag-Schaden an die Entity
  const reflectDamage = defenderEffects.reflectDamage > 0
    ? defenderEffects.reflectDamage
    : 0;

  // Venom der Entity (kommt aus entitySkillLevels)
  const appliedEffects: StatusEffect[] = resolveOnHitStatusEffects(entitySkillLevels);

  const baseDmgDisplay = Math.round(rawDmg / 1000);
  const dmgDisplay     = Math.round(dmg / 1000);
  const msg = dmg !== rawDmg
    ? `${def.icon} ${def.name} trifft! ${baseDmgDisplay}→${dmgDisplay} (Rüstung).`
    : `${def.icon} ${def.name} trifft für ${dmgDisplay} Schaden!`;

  return {
    hit: true,
    damageDealt: dmg,
    absorbedDamage,
    reflectDamage,
    statusApplied: appliedEffects,
    message: msg,
  };
}

// -----------------------------------------------------------
// SKILL-AKTIVIERBARKEIT PRÜFEN
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
    return { ok: false, reason: `Nicht genug MP (${mpCost / 1000} benötigt, ${Math.floor(player.mp / 1000)} vorhanden).` };
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
// -----------------------------------------------------------
export function calcDashDistance(player: PlayerState, skillId: string): number {
  const inst = player.discoveredSkills.get(skillId);
  return calcJumpDistance(inst?.level ?? 1);
}

// -----------------------------------------------------------
// JUMP / DASH — Positionsverschiebung des Spielers
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
// -----------------------------------------------------------
export function regenMp(player: PlayerState, deltaMs: number): void {
  if (player.mp < player.maxMp) {
    player.mp = Math.min(player.maxMp, player.mp + deltaMs);
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
