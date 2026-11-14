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

import { getPlayerStrength } from "./BodySystem";
import type { PlayerState } from "../types/GameState";
import type { EntityDefinition, EntityInstance } from "../types/Entity";
import type { AttackResult, DamageType, HitGrade, HitProfile, StatusEffect } from "../types/Combat";
import { ALL_SKILLS } from "../data/skills";
import { ENTITY_MAP } from "../data/entities";
import { DEFAULT_HIT_PROFILE, HIT_DAMAGE_MULT, MIN_SKILL_DAMAGE, MILLI, MP_REGEN_MILLI_PER_SECOND, toDisplayHp } from "../data/balance";
import { getSkillProgress, getEntitySkillProgress, progressFromLevel } from "./ProgressionSystem";
import { getScaledDamage, getEntityRangedDamage, getEntityMeleeSkillId } from "./EntityLevelingSystem";
import { calcFinalDamage, DAMAGE_TYPE_DE } from "./DamageSystem";
import { calcHitChances, rollHitGrade, HIT_GRADE_DE } from "./HitSystem";
import {
  resolveDefenderEffects,
  resolveAttackerEffects,
  resolveOnHitStatusEffects,
  resolveDexterity,
  resolveStrength,
  calcAttributeMult,
  getPlayerPassiveSkillProgress,
  getPlayerAllSkillProgress,
} from "./SkillEffectSystem";
import { calcJumpDistance, calcSkillAttackDamage } from "./SkillEffects";
import { rollVenomDose, clearVenom } from "./VenomSystem";

// [VERWORFEN, 13. November 2026] Unbewaffneter Nahkampf des Blobs (Absorb-
// Fortschritt, 1 → 20 HP Wucht). Vorgabe (Entwickler): Ohne Skill ist kein
// Angriff möglich — der Blob muss so gut wie alles lernen. Siehe GDD-03 Abschnitt 3.

// -----------------------------------------------------------
// Hilfsfunktionen: Angriffsskill und Schadenstyp einer Entity
// Standard-Angriff: erster Skill aus ENTITY_MELEE_SKILLS (EntityLevelingSystem),
// Schadenstyp aus dem Skill; ohne Skill: fire_breath → fire, sonst blunt.
// skillId: abweichender Angriff (z.B. gelegentlicher Stachelstich).
// -----------------------------------------------------------
export { getEntityMeleeSkillId };

/**
 * Welcher Nahkampf-Skill diesmal eingesetzt wird: mit der Chance aus
 * occasionalAttack der gelegentliche Angriff, sonst der Standard-Angriff.
 */
export function pickEntityMeleeSkill(def: EntityDefinition): string | undefined {
  const occ = def.occasionalAttack;
  if (occ && def.skillXp?.[occ.skillId] !== undefined && Math.random() < occ.chance) return occ.skillId;
  return getEntityMeleeSkillId(def);
}

export function getEntityAttackDamageType(def: EntityDefinition, skillId = getEntityMeleeSkillId(def)): DamageType {
  if (skillId) return ALL_SKILLS.get(skillId)?.damageType ?? "blunt";
  if (def.rangedAttackSkillId === "fire_breath") return "fire";
  return "blunt";
}

/** Treffer-Profil und Fortschritt, mit denen eine Entity im Nahkampf würfelt */
export function getEntityMeleeHitBasis(
  def: EntityDefinition,
  skillId = getEntityMeleeSkillId(def)
): { profile: HitProfile; progress: number } {
  if (!skillId) return { profile: DEFAULT_HIT_PROFILE, progress: progressFromLevel(def.level) };
  return {
    profile: ALL_SKILLS.get(skillId)?.hitProfile ?? DEFAULT_HIT_PROFILE,
    progress: getEntitySkillProgress(def)[skillId],
  };
}

// -----------------------------------------------------------
// Gemeinsamer Kern: Treffer-Stufe würfeln + Schadenspipeline
//
// attacker/defender.effects: Skills, deren Kampf-Effekte gelten
// attacker/defender.dex:     Geschick (aus allen bekannten Skills)
// -----------------------------------------------------------
// attacker/defender.str:     Stärke (aus den Kampf-Effekt-Skills)
interface Combatant { effects: Record<string, number>; dex: number; str: number }

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
  progress: number,
  attacker: Combatant,
  defender: Combatant,
  attackSkillId: string | undefined
): HitOutcome {
  const grade = rollHitGrade(calcHitChances(profile, progress, attacker.dex, defender.dex));
  if (grade === "miss") return { grade, dmg: 0, absorbed: 0, reflect: 0 };

  const atk = resolveAttackerEffects(attacker.effects);
  const def = resolveDefenderEffects(defender.effects, damageType);
  const hitMult = HIT_DAMAGE_MULT[grade];
  const attackerMult = atk.damageMult * combatantAttributeMult(attacker, attackSkillId);
  const dmg = calcFinalDamage({
    baseDmg,
    damageType,
    hitMult,
    attackerMult,
    attackerPenetration: atk.penetration,
    defenderFlatBlock: def.flatBlock,
    defenderPercentReduce: def.percentReduce,
    defenderWeaknessMult: def.weaknessMult,
    defenderImmune: def.immune,
  });
  const rawDmg = Math.max(MIN_SKILL_DAMAGE, baseDmg) * hitMult * attackerMult;
  const absorbed = Math.max(0, Math.round(rawDmg) - dmg);
  return { grade, dmg, absorbed, reflect: def.reflectDamage };
}

// attackSkillId: nur beim Angreifer — der Geschick-Beitrag des eingesetzten
// Skills wird abgezogen (siehe resolveDexterity). Verteidiger: volles Geschick.
// Stärke: eingeschaltete Passiv-Skills × Größenfaktor (BodySystem, GDD-09).
function playerCombatant(player: PlayerState, attackSkillId?: string): Combatant {
  const effects = getPlayerPassiveSkillProgress(player);
  return {
    effects,
    dex: resolveDexterity(getPlayerAllSkillProgress(player), attackSkillId),
    str: getPlayerStrength(player, effects),
  };
}

/** Eigenschafts-Faktor eines Angriffs mit den Werten des Angreifers (GDD-02 Abschnitt 8.11). */
function combatantAttributeMult(c: Combatant, attackSkillId: string | undefined): number {
  return calcAttributeMult(attackSkillId, { strength: c.str, dexterity: c.dex });
}

// -----------------------------------------------------------
// SCHADENSANZEIGE — tatsächlicher Schaden eines Skills des Blobs
//
// Vorgabe (Entwickler, 1. November 2026): Der tatsächliche Schadenswert soll
// im Skill-Menü (Auswahl für die Slots) und in der Skill-Ansicht stehen.
// Gerechnet wird mit denselben Bausteinen wie playerAttack: Basisschaden aus
// dem Fortschritt (calcSkillAttackDamage), Angreifer-Effekte der
// eingeschalteten Passiv-Skills (z. B. Superstrength) und die
// Schadenspipeline calcFinalDamage — für einen normalen Treffer gegen ein
// Ziel ohne Rüstung. Treffer-Stufe und Rüstung des Ziels ändern ihn im Kampf.
// -----------------------------------------------------------
export interface SkillDamagePreview {
  /** Skill allein, aus dem Fortschritt (milli-HP) */
  base: number;
  /** Faktor aus Eigenschaften (Stärke, Geschick) und Passiv-Skills (1 = keiner) */
  attackerMult: number;
  /** Normaler Treffer, vor der Rüstung des Ziels (milli-HP) */
  normal: number;
  damageType: DamageType;
}

export function getPlayerSkillDamage(player: PlayerState, skillId: string): SkillDamagePreview | null {
  const skillDef = ALL_SKILLS.get(skillId);
  if (!skillDef?.damage) return null;
  const damageType = skillDef.damageType ?? "blunt";
  const base = calcSkillAttackDamage(skillId, getSkillProgress(player, skillId));
  const attacker = playerCombatant(player, skillId);
  const atk = resolveAttackerEffects(attacker.effects);
  const attackerMult = atk.damageMult * combatantAttributeMult(attacker, skillId);
  const normal = calcFinalDamage({
    baseDmg: base, damageType, hitMult: HIT_DAMAGE_MULT.normal,
    attackerMult, attackerPenetration: atk.penetration,
    defenderFlatBlock: 0, defenderPercentReduce: 0, defenderWeaknessMult: 1, defenderImmune: false,
  });
  return { base, attackerMult, normal, damageType };
}

/** „⚔️ 23,2 HP Stich je Treffer (14,5 × 1,6 durch Stärke/Geschick)“ — null bei Skills ohne Schaden */
export function formatPlayerSkillDamage(player: PlayerState, skillId: string): string | null {
  const d = getPlayerSkillDamage(player, skillId);
  if (!d) return null;
  const hp1 = (milli: number) => (milli / MILLI).toLocaleString("de-DE", { maximumFractionDigits: 1 });
  const mult = d.attackerMult !== 1
    ? ` (${hp1(d.base)} × ${d.attackerMult.toLocaleString("de-DE", { maximumFractionDigits: 2 })} durch Stärke/Geschick)`
    : "";
  return `⚔️ ${hp1(d.normal)} HP ${DAMAGE_TYPE_DE[d.damageType]} je Treffer${mult}`;
}

function entityCombatant(def: EntityDefinition, attackSkillId?: string): Combatant {
  const progress = getEntitySkillProgress(def);
  return { effects: progress, dex: resolveDexterity(progress, attackSkillId), str: resolveStrength(progress) };
}

/**
 * Eigenschafts-Faktor des Nahkampfs einer Entity (Anzeige im INDEX) —
 * dieselbe Rechnung wie im Kampf.
 */
export function getEntityAttributeMult(def: EntityDefinition, skillId = getEntityMeleeSkillId(def)): number {
  return combatantAttributeMult(entityCombatant(def, skillId), skillId);
}

/** "(Schwerer Treffer)" usw.; bei normalem Treffer leer */
function gradeSuffix(grade: HitGrade): string {
  return grade === "normal" ? "" : ` (${HIT_GRADE_DE[grade]})`;
}

const hp = toDisplayHp;

// -----------------------------------------------------------
// SPIELER-ANGRIFF
//
// Ohne Skill kein Angriff (Vorgabe Entwickler, GDD-03 Abschnitt 3).
// skillId = "jump"    → Dash (kein Schaden, nur Positionsverschiebung)
// Gibt AttackResult zurück — GameScene wendet HP-Änderungen an.
// -----------------------------------------------------------
export function playerAttack(
  player: PlayerState,
  targetInst: EntityInstance,
  skillId: string
): AttackResult {
  const def = ENTITY_MAP.get(targetInst.definitionId);
  if (!def) {
    return missResult("Unbekannte Entity.");
  }

  const skillDef = ALL_SKILLS.get(skillId);

  // Dash-Skills: kein Schaden, nur Bewegung
  if (skillDef?.attackType === "dash") {
    return dashResult(player, skillId);
  }

  // --- Basisschaden, Schadenstyp, Treffer-Profil ---
  if (!skillDef || !skillDef.damage) {
    return missResult(`Skill ${skillId} hat keinen Schadenswert.`);
  }
  const progress = getSkillProgress(player, skillId);
  const baseDmg = calcSkillAttackDamage(skillId, progress);
  const damageType: DamageType = skillDef.damageType ?? "blunt";
  const profile: HitProfile = skillDef.hitProfile ?? DEFAULT_HIT_PROFILE;

  const attacker = playerCombatant(player, skillId);
  const outcome = resolveHit(baseDmg, damageType, profile, progress, attacker, entityCombatant(def), skillId);

  if (outcome.grade === "miss") {
    return {
      hit: false, hitGrade: "miss", damageDealt: 0, statusApplied: [],
      message: `${def.icon} ${def.name}: verfehlt!`,
    };
  }

  // Angreifer-seitige On-Hit-Effekte: Status-Effekte und Gift (VenomSystem)
  const appliedEffects: StatusEffect[] = resolveOnHitStatusEffects(attacker.effects);
  const venomDose = rollVenomDose(attacker.effects, { skillId, progress });

  const msg = `${def.icon} ${def.name}: ${hp(outcome.dmg)} Schaden${gradeSuffix(outcome.grade)}` +
    (venomDose.total > 0 ? ` + ${hp(venomDose.total)} Gift!` : ".");

  return {
    hit: true,
    hitGrade: outcome.grade,
    damageDealt: outcome.dmg,
    absorbedDamage: outcome.absorbed,
    reflectDamage: outcome.reflect,  // Hemolymph der Entity trifft den Spieler
    statusApplied: appliedEffects,
    venomDose,
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

  // Meist der Standard-Angriff, gelegentlich ein anderer (z.B. Stachelstich)
  const skillId = pickEntityMeleeSkill(def);
  const occasional = skillId !== getEntityMeleeSkillId(def);
  const skillDef = skillId ? ALL_SKILLS.get(skillId) : undefined;
  const label = occasional && skillDef ? ` — ${skillDef.icon} ${skillDef.name}` : "";

  const baseDmg = getScaledDamage(def, instance.bonusLevel ?? 0, skillId);
  const { profile, progress } = getEntityMeleeHitBasis(def, skillId);
  const attacker = entityCombatant(def, skillId);
  const outcome = resolveHit(
    baseDmg, getEntityAttackDamageType(def, skillId), profile, progress, attacker, playerCombatant(player), skillId
  );

  if (outcome.grade === "miss") {
    return {
      hit: false, hitGrade: "miss", damageDealt: 0, statusApplied: [],
      message: `${def.icon} ${def.name}${label} verfehlt dich!`,
    };
  }

  // On-Hit-Effekte der Entity: Status-Effekte und Gift (VenomSystem).
  // Gift aktiver Skills wirkt nur, wenn genau dieser Skill getroffen hat.
  const appliedEffects: StatusEffect[] = resolveOnHitStatusEffects(attacker.effects);
  const venomDose = rollVenomDose(attacker.effects, skillId ? { skillId, progress } : undefined);

  const armor = outcome.absorbed > 0 ? `, ${hp(outcome.absorbed)} abgewehrt` : "";
  const msg = `${def.icon} ${def.name}${label}: ${HIT_GRADE_DE[outcome.grade]} — ${hp(outcome.dmg)} Schaden${armor}` +
    (venomDose.total > 0 ? ` + ${hp(venomDose.total)} Gift!` : ".");

  return {
    hit: true,
    hitGrade: outcome.grade,
    damageDealt: outcome.dmg,
    absorbedDamage: outcome.absorbed,
    reflectDamage: outcome.reflect,  // Hemolymph des Spielers trifft die Entity
    statusApplied: appliedEffects,
    venomDose,
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
    getEntitySkillProgress(def)[skillId] ?? 0,
    entityCombatant(def, skillId),
    playerCombatant(player),
    skillId
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
  return calcJumpDistance(getSkillProgress(player, skillId));
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
  clearVenom(player);
}

// -----------------------------------------------------------
// MP-REGENERATION — im Game Loop aufrufen (delta in ms)
// -----------------------------------------------------------
// Wert und Begründung: MP_REGEN_MILLI_PER_SECOND in src/data/balance.ts

export function regenMp(player: PlayerState, deltaMs: number): void {
  if (player.mp < player.maxMp) {
    player.mp = Math.min(player.maxMp, player.mp + (deltaMs * MP_REGEN_MILLI_PER_SECOND) / 1000);
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
