// ============================================================
// COMBAT SYSTEM
// Absorb & Evolve — Schadenformeln, Angriffs-Dispatch, Skill-Aktivierung
//
// Zuständig für:
//   - Angriffe des Spielers (Nahkampf-Basis + Skill-Angriffe)
//   - Angriffe von Entities auf den Spieler (Nah- und Fernkampf)
//   - Skill-Aktivierbarkeit prüfen (MP, Cooldown)
//   - Checkpoint-Logik (Respawn nach Tod)
//
// Keine Phaser-Abhängigkeit. Kein Rendering.
// Ablauf eines Angriffs: Treffer-Stufe würfeln (HitSystem) →
// Schadenspipeline (DamageSystem) mit Effekten aus SkillEffectSystem.
// ============================================================

import type { PlayerState } from "../types/GameState";
import type { EntityDefinition, EntityInstance } from "../types/Entity";
import type { AttackResult, DamageType, HitGrade, HitProfile, StatusEffect } from "../types/Combat";
import { ALL_SKILLS } from "../data/skills";
import { ENTITY_MAP } from "../data/entities";
import { DEFAULT_HIT_PROFILE, HIT_DAMAGE_MULT, MIN_SKILL_DAMAGE, toDisplayHp } from "../data/balance";
import { getSkillEffectiveness } from "./SkillSystem";
import { getScaledDamage, getEntityRangedDamage } from "./EntityLevelingSystem";
import { calcFinalDamage } from "./DamageSystem";
import { calcHitChances, rollHitGrade, HIT_GRADE_DE } from "./HitSystem";
import {
  resolveDefenderEffects,
  resolveAttackerEffects,
  resolveOnHitStatusEffects,
  resolveDexterity,
  getPlayerPassiveSkillLevels,
  getPlayerAllSkillLevels,
} from "./SkillEffectSystem";
import { calcJumpDistance } from "./SkillEffects";

// Konstanten — Basis-Nahkampf des unausgerüsteten Blobs (milli-HP)
const BASE_MELEE_DAMAGE  = 3_000;   // 3 HP Basisschaden ohne Skills
const MELEE_ABSORB_SCALE = 1_500;   // 1.5 HP Bonus pro Absorb-Level
const UNARMED_DAMAGE_TYPE: DamageType = "blunt";  // Körpermasse = Wucht

// -----------------------------------------------------------
// Hilfsfunktionen: Angriffsskill und Schadenstyp einer Entity
// Priorität: bite → pierce, claw → slash, fire_breath → fire, sonst blunt
// -----------------------------------------------------------
export function getEntityMeleeSkillId(def: EntityDefinition): string | undefined {
  if (def.skillLevels?.["bite"] !== undefined) return "bite";
  if (def.skillLevels?.["claw"] !== undefined) return "claw";
  return undefined;
}

export function getEntityAttackDamageType(def: EntityDefinition): DamageType {
  const skillId = getEntityMeleeSkillId(def);
  if (skillId) return ALL_SKILLS.get(skillId)?.damageType ?? "blunt";
  if (def.rangedAttackSkillId === "fire_breath") return "fire";
  return "blunt";
}

/** Treffer-Profil und Skill-Level, mit denen eine Entity im Nahkampf würfelt */
export function getEntityMeleeHitBasis(def: EntityDefinition): { profile: HitProfile; skillLevel: number } {
  const skillId = getEntityMeleeSkillId(def);
  if (!skillId) return { profile: DEFAULT_HIT_PROFILE, skillLevel: def.level };
  return {
    profile: ALL_SKILLS.get(skillId)?.hitProfile ?? DEFAULT_HIT_PROFILE,
    skillLevel: def.skillLevels![skillId],
  };
}

// -----------------------------------------------------------
// Gemeinsamer Kern: Treffer-Stufe würfeln + Schadenspipeline
//
// attacker/defender.effects: Skills, deren Kampf-Effekte gelten
// attacker/defender.dex:     Geschick (aus allen bekannten Skills)
// -----------------------------------------------------------
interface Combatant { effects: Record<string, number>; dex: number }

interface HitOutcome {
  grade: HitGrade;
  dmg: number;            // milli-HP Endschaden
  absorbed: number;       // milli-HP durch Verteidigung abgefangen
  reflect: number;        // milli-HP Rückschlag an den Angreifer (nur bei Treffer)
}

function resolveHit(
  baseDmg: number,
  damageType: DamageType,
  profile: HitProfile,
  skillLevel: number,
  attacker: Combatant,
  defender: Combatant
): HitOutcome {
  const grade = rollHitGrade(calcHitChances(profile, skillLevel, attacker.dex, defender.dex));
  if (grade === "miss") return { grade, dmg: 0, absorbed: 0, reflect: 0 };

  const atk = resolveAttackerEffects(attacker.effects);
  const def = resolveDefenderEffects(defender.effects, damageType);
  const hitMult = HIT_DAMAGE_MULT[grade];
  const dmg = calcFinalDamage({
    baseDmg,
    damageType,
    hitMult,
    attackerMult: atk.damageMult,
    attackerPenetration: atk.penetration,
    defenderFlatBlock: def.flatBlock,
    defenderPercentReduce: def.percentReduce,
    defenderWeaknessMult: def.weaknessMult,
    defenderImmune: def.immune,
  });
  const rawDmg = Math.max(MIN_SKILL_DAMAGE, baseDmg) * hitMult * atk.damageMult;
  const absorbed = Math.max(0, Math.round(rawDmg) - dmg);
  return { grade, dmg, absorbed, reflect: def.reflectDamage };
}

// attackSkillId: nur beim Angreifer — der Geschick-Beitrag des eingesetzten
// Skills wird abgezogen (siehe resolveDexterity). Verteidiger: volles Geschick.
function playerCombatant(player: PlayerState, attackSkillId?: string): Combatant {
  return {
    effects: getPlayerPassiveSkillLevels(player),
    dex: resolveDexterity(getPlayerAllSkillLevels(player), attackSkillId),
  };
}

function entityCombatant(def: EntityDefinition, attackSkillId?: string): Combatant {
  const levels = def.skillLevels ?? {};
  return { effects: levels, dex: resolveDexterity(levels, attackSkillId) };
}

/** "(Schwerer Treffer)" usw.; bei normalem Treffer leer */
function gradeSuffix(grade: HitGrade): string {
  return grade === "normal" ? "" : ` (${HIT_GRADE_DE[grade]})`;
}

const hp = toDisplayHp;

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

  // --- Basisschaden, Schadenstyp, Treffer-Profil ---
  let baseDmg: number;
  let damageType: DamageType;
  let profile: HitProfile = DEFAULT_HIT_PROFILE;
  let skillLevel: number;

  if (!skillId) {
    // Unbewaffnet: Absorb-Level bestimmt Schaden und Treffer-Güte
    skillLevel = player.coreAbilities.absorb.level;
    baseDmg = BASE_MELEE_DAMAGE + skillLevel * MELEE_ABSORB_SCALE;
    damageType = UNARMED_DAMAGE_TYPE;
  } else {
    const skillDef = ALL_SKILLS.get(skillId);
    if (!skillDef || !skillDef.baseDamage) {
      return missResult(`Skill ${skillId} hat keinen Schadenswert.`);
    }
    skillLevel = player.discoveredSkills.get(skillId)?.level ?? 1;
    baseDmg = skillDef.baseDamage * getSkillEffectiveness(skillLevel);
    damageType = skillDef.damageType ?? "blunt";
    profile = skillDef.hitProfile ?? DEFAULT_HIT_PROFILE;
  }

  const attacker = playerCombatant(player, skillId);
  const outcome = resolveHit(baseDmg, damageType, profile, skillLevel, attacker, entityCombatant(def));

  if (outcome.grade === "miss") {
    return {
      hit: false, hitGrade: "miss", damageDealt: 0, statusApplied: [],
      message: `${def.icon} ${def.name}: verfehlt!`,
    };
  }

  // Angreifer-seitige On-Hit-Effekte (Venom etc.)
  const appliedEffects: StatusEffect[] = resolveOnHitStatusEffects(attacker.effects);

  const msg = `${def.icon} ${def.name}: ${hp(outcome.dmg)} Schaden${gradeSuffix(outcome.grade)}` +
    (appliedEffects.length > 0 ? " + vergiftet!" : ".");

  return {
    hit: true,
    hitGrade: outcome.grade,
    damageDealt: outcome.dmg,
    absorbedDamage: outcome.absorbed,
    reflectDamage: outcome.reflect,  // Hemolymph der Entity trifft den Spieler
    statusApplied: appliedEffects,
    message: msg,
  };
}

// -----------------------------------------------------------
// ENTITY-ANGRIFF AUF DEN SPIELER (Nahkampf)
// -----------------------------------------------------------
export function entityAttack(
  def: EntityDefinition,
  instance: EntityInstance,
  player: PlayerState
): AttackResult {
  if (!instance.isAlive || !instance.isAggro) {
    return missResult("Entity greift nicht an.");
  }

  const baseDmg = getScaledDamage(def, instance.bonusLevel ?? 0);
  const { profile, skillLevel } = getEntityMeleeHitBasis(def);
  const attacker = entityCombatant(def, getEntityMeleeSkillId(def));
  const outcome = resolveHit(
    baseDmg, getEntityAttackDamageType(def), profile, skillLevel, attacker, playerCombatant(player)
  );

  if (outcome.grade === "miss") {
    return {
      hit: false, hitGrade: "miss", damageDealt: 0, statusApplied: [],
      message: `${def.icon} ${def.name} verfehlt dich!`,
    };
  }

  // Venom der Entity
  const appliedEffects: StatusEffect[] = resolveOnHitStatusEffects(attacker.effects);

  const armor = outcome.absorbed > 0 ? `, ${hp(outcome.absorbed)} abgewehrt` : "";
  const msg = `${def.icon} ${def.name}: ${HIT_GRADE_DE[outcome.grade]} — ${hp(outcome.dmg)} Schaden${armor}` +
    (appliedEffects.length > 0 ? " + vergiftet!" : ".");

  return {
    hit: true,
    hitGrade: outcome.grade,
    damageDealt: outcome.dmg,
    absorbedDamage: outcome.absorbed,
    reflectDamage: outcome.reflect,  // Hemolymph des Spielers trifft die Entity
    statusApplied: appliedEffects,
    message: msg,
  };
}

// -----------------------------------------------------------
// ENTITY-FERNKAMPF AUF DEN SPIELER (z.B. Drachen-Feueratem)
// Kein Rückschlag (kein Körperkontakt), keine On-Hit-Effekte.
// -----------------------------------------------------------
export function entityRangedAttack(def: EntityDefinition, player: PlayerState): AttackResult {
  const skillId = def.rangedAttackSkillId;
  const skillDef = skillId ? ALL_SKILLS.get(skillId) : undefined;
  if (!skillId || !skillDef) return missResult("Kein Fernkampf.");

  const outcome = resolveHit(
    getEntityRangedDamage(def),
    skillDef.damageType ?? "blunt",
    skillDef.hitProfile ?? DEFAULT_HIT_PROFILE,
    def.skillLevels?.[skillId] ?? 1,
    entityCombatant(def, skillId),
    playerCombatant(player)
  );

  if (outcome.grade === "miss") {
    return {
      hit: false, hitGrade: "miss", damageDealt: 0, statusApplied: [],
      message: `${def.icon} ${def.name}: ${skillDef.name} verfehlt dich!`,
    };
  }
  return {
    hit: true,
    hitGrade: outcome.grade,
    damageDealt: outcome.dmg,
    absorbedDamage: outcome.absorbed,
    statusApplied: [],
    message: `${def.icon} ${def.name}: ${skillDef.name}! ${hp(outcome.dmg)} Schaden${gradeSuffix(outcome.grade)}.`,
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
