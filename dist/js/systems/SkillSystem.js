// ============================================================
// SKILL SYSTEM
// Absorb & Evolve — Reine Logik, keine Rendering-Abhängigkeit
// ============================================================
import { CORE_BASE_XP, CORE_XP_MULTIPLIER, CORE_MAX_LEVEL } from "../types/GameState";
import { ALL_SKILLS, RECIPE_INDEX } from "../data/skills";
import { BASE_XP_ABSORB, BASE_XP_ANALYZE, BASE_XP_CORE, XP_LEVEL_MULTIPLIER, PLAYER_LEVEL_BASE_XP, PLAYER_LEVEL_XP_MULTIPLIER, BASE_HP, HP_PER_LEVEL, BASE_MP, MP_PER_LEVEL, scaleXp, } from "../data/balance";
// -----------------------------------------------------------
// XP-SCHWELLEN-BERECHNUNG
// -----------------------------------------------------------
export function calcXpThreshold(baseThreshold, multiplier, level) {
    return Math.floor(baseThreshold * Math.pow(multiplier, level - 1));
}
// -----------------------------------------------------------
// KERN-FÄHIGKEITS-XP
// entityLevel wird übergeben damit die Skalierung greift.
// -----------------------------------------------------------
export function gainCoreAbilityXp(player, method, entityLevel = 1) {
    const ability = player.coreAbilities[method];
    const xpGained = scaleXp(BASE_XP_CORE, entityLevel, ability.level);
    if (ability.level >= CORE_MAX_LEVEL || xpGained === 0) {
        ability.totalXpEarned += xpGained;
        return { leveledUp: false, xpGained };
    }
    ability.currentXp += xpGained;
    ability.totalXpEarned += xpGained;
    let leveledUp = false;
    let newLevel;
    while (ability.currentXp >= ability.xpToNextLevel &&
        ability.level < CORE_MAX_LEVEL) {
        ability.currentXp -= ability.xpToNextLevel;
        ability.level += 1;
        ability.xpToNextLevel = calcXpThreshold(CORE_BASE_XP, CORE_XP_MULTIPLIER, ability.level);
        leveledUp = true;
        newLevel = ability.level;
    }
    return { leveledUp, newLevel, xpGained };
}
// -----------------------------------------------------------
// NEUE SKILL-INSTANCE ERSTELLEN
// -----------------------------------------------------------
function createSkillInstance(skillId) {
    const def = ALL_SKILLS.get(skillId);
    if (!def)
        throw new Error(`Unbekannte Skill-ID: ${skillId}`);
    return {
        definitionId: skillId,
        level: 1,
        currentXp: 0,
        xpToNextLevel: def.baseXpThreshold,
        discoveredAt: Date.now(),
        totalXpEarned: 0,
    };
}
// Hilfsfunktion: Ist ein Skill auf max Level?
// maxLevel === 0 bedeutet unlimitiert
function isAtMaxLevel(instance) {
    const def = ALL_SKILLS.get(instance.definitionId);
    if (!def)
        return false;
    return def.maxLevel > 0 && instance.level >= def.maxLevel;
}
// -----------------------------------------------------------
// SKILL DISCOVER
// entityLevel bestimmt den XP-Multiplikator (Option D aus balance.ts).
// Niedrig-Level-Entities gegen hohe Skills → kaum XP.
// Hoch-Level-Entities → Bonus-XP.
// -----------------------------------------------------------
export function discoverSkill(player, skillId, method, entityLevel = 1) {
    const def = ALL_SKILLS.get(skillId);
    if (!def)
        throw new Error(`Unbekannte Skill-ID: ${skillId}`);
    const baseXp = method === "absorb" ? BASE_XP_ABSORB : BASE_XP_ANALYZE;
    const existing = player.discoveredSkills.get(skillId);
    // ERSTENTDECKUNG — kein XP, nur Discovery
    if (!existing) {
        player.discoveredSkills.set(skillId, createSkillInstance(skillId));
        return { skillId, method, xpGained: 0, wasNewDiscovery: true, leveledUp: false };
    }
    // MAX LEVEL ERREICHT (nur für Skills mit gesetztem maxLevel > 0)
    if (isAtMaxLevel(existing)) {
        existing.totalXpEarned += baseXp; // XP trotzdem zählen für Statistiken
        return { skillId, method, xpGained: baseXp, wasNewDiscovery: false, leveledUp: false };
    }
    // XP SKALIEREN: entityLevel vs. aktuelles Skill-Level
    const xpGained = scaleXp(baseXp, entityLevel, existing.level);
    existing.currentXp += xpGained;
    existing.totalXpEarned += xpGained;
    let leveledUp = false;
    let newLevel;
    // Level-Up: läuft solange XP reicht (und kein maxLevel-Limit überschritten)
    while (existing.currentXp >= existing.xpToNextLevel && !isAtMaxLevel(existing)) {
        existing.currentXp -= existing.xpToNextLevel;
        existing.level += 1;
        existing.xpToNextLevel = calcXpThreshold(def.baseXpThreshold, XP_LEVEL_MULTIPLIER, existing.level);
        leveledUp = true;
        newLevel = existing.level;
    }
    return { skillId, method, xpGained, wasNewDiscovery: false, leveledUp, newLevel };
}
// -----------------------------------------------------------
// SKILL COMBINE
// -----------------------------------------------------------
export function combineSkills(player, skillIdA, skillIdB) {
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
        // Kein entityLevel verfügbar beim Kombinieren → neutraler Multiplikator (Level-Gleichstand)
        const instance = player.discoveredSkills.get(resultId);
        const resultDef = ALL_SKILLS.get(resultId);
        const xpGained = scaleXp(BASE_XP_ABSORB, instance.level, instance.level); // ×1.0
        if (!isAtMaxLevel(instance)) {
            instance.currentXp += xpGained;
            instance.totalXpEarned += xpGained;
            while (instance.currentXp >= instance.xpToNextLevel && !isAtMaxLevel(instance)) {
                instance.currentXp -= instance.xpToNextLevel;
                instance.level += 1;
                instance.xpToNextLevel = calcXpThreshold(resultDef.baseXpThreshold, XP_LEVEL_MULTIPLIER, instance.level);
            }
        }
        return {
            outcome: "success_xp",
            resultSkillId: resultId,
            xpGained,
            message: `${resultDef.name} bereits bekannt — +${xpGained} XP.`,
        };
    }
    player.discoveredSkills.set(resultId, createSkillInstance(resultId));
    const resultDef = ALL_SKILLS.get(resultId);
    return {
        outcome: "success_new",
        resultSkillId: resultId,
        message: `Neuer Skill entdeckt: ${resultDef.icon} ${resultDef.name}!`,
    };
}
// -----------------------------------------------------------
// PASSIVE SKILLS
// -----------------------------------------------------------
export function getPassiveSkills(player) {
    const result = [];
    for (const instance of player.discoveredSkills.values()) {
        const def = ALL_SKILLS.get(instance.definitionId);
        if (def?.activation === "passive")
            result.push(instance);
    }
    return result;
}
// -----------------------------------------------------------
// UI-HILFSFUNKTIONEN
// -----------------------------------------------------------
export function getDiscoveredSkillsSorted(player) {
    return Array.from(player.discoveredSkills.values()).sort((a, b) => a.discoveredAt - b.discoveredAt);
}
export function getXpProgress(instance) {
    if (instance.xpToNextLevel === 0)
        return 1.0;
    return Math.min(instance.currentXp / instance.xpToNextLevel, 1.0);
}
export function isMaxLevel(instance) {
    return isAtMaxLevel(instance);
}
export function getSkillEffectiveness(level) {
    return 1.0 + (level - 1) * 0.1 + (level >= 3 ? 0.15 : 0);
}
// -----------------------------------------------------------
// SKILL-XP DURCH BENUTZUNG VERGEBEN
//
// Wird aufgerufen wenn ein Skill aktiv eingesetzt wird (aktive Skills)
// oder sein Effekt ausgelöst wird (passive Skills).
// Gibt zurück ob ein Level-Up eingetreten ist.
// -----------------------------------------------------------
export function gainSkillXp(player, skillId, amount) {
    const instance = player.discoveredSkills.get(skillId);
    if (!instance)
        return { leveledUp: false };
    const def = ALL_SKILLS.get(skillId);
    if (!def || isAtMaxLevel(instance))
        return { leveledUp: false };
    instance.currentXp += amount;
    instance.totalXpEarned += amount;
    let leveledUp = false;
    let newLevel;
    while (instance.currentXp >= instance.xpToNextLevel && !isAtMaxLevel(instance)) {
        instance.currentXp -= instance.xpToNextLevel;
        instance.level += 1;
        instance.xpToNextLevel = calcXpThreshold(def.baseXpThreshold, XP_LEVEL_MULTIPLIER, instance.level);
        leveledUp = true;
        newLevel = instance.level;
    }
    return { leveledUp, newLevel };
}
// -----------------------------------------------------------
// SPIELER-HAUPTLEVEL
// -----------------------------------------------------------
/**
 * Berechnet Level, XP im aktuellen Level und XP für den nächsten Level-Up
 * auf Basis der kumulativen Gesamt-XP des Spielers.
 */
export function calcPlayerLevel(totalXp) {
    let level = 1;
    let remaining = totalXp;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const threshold = Math.floor(PLAYER_LEVEL_BASE_XP * Math.pow(PLAYER_LEVEL_XP_MULTIPLIER, level - 1));
        if (remaining < threshold) {
            return { level, xpIntoLevel: remaining, xpToNext: threshold };
        }
        remaining -= threshold;
        level++;
    }
}
/**
 * Summiert alle totalXpEarned aus Skills und Kern-Fähigkeiten,
 * schreibt das Ergebnis in player.totalExp und aktualisiert player.level.
 * Gibt zurück ob ein Level-Up eingetreten ist.
 */
/** Berechnet maxHp für ein gegebenes Spielerlevel */
export function calcMaxHp(level) {
    return BASE_HP + (level - 1) * HP_PER_LEVEL;
}
/** Berechnet maxMp für ein gegebenes Spielerlevel */
export function calcMaxMp(level) {
    return BASE_MP + (level - 1) * MP_PER_LEVEL;
}
export function updatePlayerLevel(player) {
    let totalXp = player.coreAbilities.absorb.totalXpEarned +
        player.coreAbilities.analyze.totalXpEarned;
    for (const inst of player.discoveredSkills.values()) {
        totalXp += inst.totalXpEarned;
    }
    player.totalExp = totalXp;
    const { level } = calcPlayerLevel(totalXp);
    const leveledUp = level > player.level;
    if (leveledUp) {
        player.level = level;
        const newMaxHp = calcMaxHp(level);
        const newMaxMp = calcMaxMp(level);
        // HP/MP proportional miterhöhen (volle Differenz als Bonus)
        player.hp = Math.min(player.hp + (newMaxHp - player.maxHp), newMaxHp);
        player.mp = Math.min(player.mp + (newMaxMp - player.maxMp), newMaxMp);
        player.maxHp = newMaxHp;
        player.maxMp = newMaxMp;
    }
    return { leveledUp, newLevel: leveledUp ? level : undefined };
}
//# sourceMappingURL=SkillSystem.js.map