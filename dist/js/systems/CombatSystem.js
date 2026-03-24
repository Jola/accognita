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
import { ALL_SKILLS } from "../data/skills";
import { ENTITY_MAP } from "../data/entities";
import { getSkillEffectiveness } from "./SkillSystem";
import { calcDamageReduction, calcDamageMult, makeVenomEffect, } from "./StatusEffectSystem";
// Konstanten — Basis-Nahkampf des unausgerüsteten Slimes
const BASE_MELEE_DAMAGE = 3; // Basisschaden ohne Skills
const MELEE_ABSORB_SCALE = 1.5; // Bonus pro Absorb-Level
const DASH_DISTANCE_BASE = 160; // Jump: Basisweite in Pixeln
const DASH_DISTANCE_PER_LEVEL = 20; // Zusätzliche Pixel pro Jump-Level
// -----------------------------------------------------------
// SPIELER-ANGRIFF
//
// skillId = undefined → unausgerüsteter Nahkampf (Slime-Körper)
// skillId = "jump"    → Dash (kein Schaden, nur Positionsverschiebung)
// Gibt AttackResult zurück — GameScene wendet HP-Änderungen an.
// -----------------------------------------------------------
export function playerAttack(player, targetInst, skillId) {
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
    let baseDmg;
    const appliedEffects = [];
    if (!skillId) {
        // Unausgerüsteter Nahkampf: skaliert mit Absorb-Level
        baseDmg = BASE_MELEE_DAMAGE + player.coreAbilities.absorb.level * MELEE_ABSORB_SCALE;
    }
    else {
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
    // Rüstung des Ziels (EntityDefinition hat keine Rüstung in v0.3 — Platzhalter 0)
    // Wird relevant sobald Entities eigene Verteidigung bekommen
    const targetArmor = 0;
    dmg = Math.max(1, dmg - targetArmor);
    // Venom: passiv auf Treffer anwenden (wenn Spieler Venom hat)
    const venomInst = player.discoveredSkills.get("venom");
    if (venomInst) {
        // Vergiftungschance: 30% + 5% pro Level
        const venomChance = 0.30 + (venomInst.level - 1) * 0.05;
        if (Math.random() < venomChance) {
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
export function entityAttack(def, instance, player) {
    if (!instance.isAlive || !instance.isAggro) {
        return missResult("Entity greift nicht an.");
    }
    const baseDmg = def.damage ?? 1;
    // Spieler-Schadensreduktion (Chitin Armor etc.)
    const reduction = calcDamageReduction(player.statusEffects);
    const dmg = Math.max(1, Math.round(baseDmg * (1 - reduction)));
    // Poison Spider: Vergiftet auch beim Angriff
    const appliedEffects = [];
    if (def.id === "poison_spider") {
        if (Math.random() < 0.40) {
            appliedEffects.push(makeVenomEffect(1));
        }
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
export function canActivateSkill(player, skillId) {
    const def = ALL_SKILLS.get(skillId);
    if (!def)
        return { ok: false, reason: "Unbekannter Skill." };
    const inst = player.discoveredSkills.get(skillId);
    if (!inst)
        return { ok: false, reason: "Skill nicht entdeckt." };
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
export function consumeSkill(player, skillId) {
    const def = ALL_SKILLS.get(skillId);
    if (!def)
        return 0;
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
export function calcDashDistance(player, skillId) {
    const inst = player.discoveredSkills.get(skillId);
    if (!inst)
        return DASH_DISTANCE_BASE;
    return DASH_DISTANCE_BASE + (inst.level - 1) * DASH_DISTANCE_PER_LEVEL;
}
// -----------------------------------------------------------
// CHECKPOINT — Spieler respawnen
//
// HP und MP auf Max setzen, Position auf Spawn zurücksetzen,
// alle aktiven (nicht-permanenten) StatusEffekte entfernen.
// Passiv-Effekte bleiben erhalten (werden durch syncPassiveEffects neu gesetzt).
// -----------------------------------------------------------
export function executeCheckpoint(player) {
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    player.x = player.spawnX;
    player.y = player.spawnY;
    // Nur zeitbegrenzte Effekte entfernen — Passiv-Buffs bleiben
    player.statusEffects = player.statusEffects.filter((e) => e.expiresAt === Infinity);
}
// -----------------------------------------------------------
// MP-REGENERATION — im Game Loop aufrufen (delta in ms)
// 1 MP/s Basisregeneration
// -----------------------------------------------------------
export function regenMp(player, deltaMs) {
    if (player.mp < player.maxMp) {
        player.mp = Math.min(player.maxMp, player.mp + deltaMs / 1000);
    }
}
// -----------------------------------------------------------
// HILFSFUNKTIONEN
// -----------------------------------------------------------
function missResult(reason) {
    return { hit: false, damageDealt: 0, statusApplied: [], message: reason };
}
function dashResult(player, skillId) {
    const dist = calcDashDistance(player, skillId);
    return {
        hit: false,
        damageDealt: 0,
        statusApplied: [],
        message: `Dash! (${dist}px)`,
    };
}
//# sourceMappingURL=CombatSystem.js.map