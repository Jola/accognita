// ============================================================
// ENTITY LEVELING SYSTEM
// Absorb & Evolve — Kreaturen kämpfen untereinander und leveln auf
//
// Mechanik:
//   - Kreaturen mit Kampfwerten greifen schwächere Kreaturen an
//   - Beute muss 1–3 Level niedriger sein (effektives Level)
//   - Sieg → skillWins++ (Skill-Level-Up visuell)
//   - Alle 3 Siege → bonusLevel++ (Entity-Level-Up, max 3)
//   - Kampfwerte (HP, Schaden, Speed) skalieren mit bonusLevel
//
// Keine Phaser-Abhängigkeit. Kein Rendering.
// ============================================================
import { calcBiteDamage } from "./SkillEffects";
// -----------------------------------------------------------
// Konstanten
// -----------------------------------------------------------
const MAX_BONUS_LEVEL = 3;
const SKILL_WINS_PER_LVL = 3; // Siege bis zum nächsten bonusLevel
const HUNT_RADIUS_PX = 300; // Suchradius für Beute (px)
const STAT_SCALE = 1.25; // Kampfwert-Faktor pro bonusLevel
// -----------------------------------------------------------
// Effektives Level (Basislevel + Bonuslevel)
// -----------------------------------------------------------
export function getEffectiveLevel(def, instance) {
    return def.level + (instance.bonusLevel ?? 0);
}
// -----------------------------------------------------------
// Skalierte Kampfwerte basierend auf bonusLevel
// -----------------------------------------------------------
export function getScaledMaxHp(def, bonusLevel) {
    return Math.round((def.hp ?? 1) * Math.pow(STAT_SCALE, bonusLevel));
}
/** Basisschaden einer Entity — aus bite-Skill-Level oder standalone damage. */
export function getEntityBaseDamage(def) {
    const biteLevel = def.skillLevels?.["bite"];
    if (biteLevel !== undefined) {
        return calcBiteDamage(biteLevel);
    }
    return def.damage ?? 1;
}
export function getScaledDamage(def, bonusLevel) {
    return Math.max(1, Math.round(getEntityBaseDamage(def) * Math.pow(STAT_SCALE, bonusLevel)));
}
export function getScaledSpeed(def, bonusLevel) {
    return Math.round((def.speed ?? 60) * Math.pow(STAT_SCALE, bonusLevel));
}
// -----------------------------------------------------------
// Beute suchen
//
// Gibt die nächste lebende Kreatur zurück, die 1–3 Level niedriger ist.
// Nur Kreaturen mit Kampfwerten (damage definiert) kommen in Frage.
// -----------------------------------------------------------
export function findLevelingPrey(hunter, hunterDef, allEntities, entityMap) {
    const hunterLevel = getEffectiveLevel(hunterDef, hunter);
    const huntRadiusSq = HUNT_RADIUS_PX * HUNT_RADIUS_PX;
    let best = null;
    let bestDistSq = Infinity;
    for (const candidate of allEntities.values()) {
        if (candidate.instanceId === hunter.instanceId)
            continue;
        if (!candidate.isAlive)
            continue;
        const candidateDef = entityMap.get(candidate.definitionId);
        if (!candidateDef || candidateDef.category !== "creature")
            continue;
        if (!candidateDef.damage)
            continue;
        const levelDiff = hunterLevel - getEffectiveLevel(candidateDef, candidate);
        if (levelDiff < 1 || levelDiff > 3)
            continue;
        const dx = candidate.x - hunter.x;
        const dy = candidate.y - hunter.y;
        const distSq = dx * dx + dy * dy;
        if (distSq <= huntRadiusSq && distSq < bestDistSq) {
            best = candidate;
            bestDistSq = distSq;
        }
    }
    return best;
}
// -----------------------------------------------------------
// Sieg verarbeiten
//
// skillWins++ → bei 3 Siegen: bonusLevel++, HP auf neues Maximum.
// Gibt zurück ob Skill- und/oder Entity-Level gestiegen sind.
// -----------------------------------------------------------
export function processEntityVictory(winner, winnerDef) {
    const currentBonus = winner.bonusLevel ?? 0;
    if (currentBonus >= MAX_BONUS_LEVEL) {
        return { skillLeveledUp: false, entityLeveledUp: false };
    }
    winner.skillWins = (winner.skillWins ?? 0) + 1;
    if ((winner.skillWins ?? 0) >= SKILL_WINS_PER_LVL) {
        winner.skillWins = 0;
        winner.bonusLevel = currentBonus + 1;
        // HP vollständig auf neues Maximum setzen
        winner.currentHp = getScaledMaxHp(winnerDef, winner.bonusLevel);
        return { skillLeveledUp: true, entityLeveledUp: true };
    }
    return { skillLeveledUp: true, entityLeveledUp: false };
}
//# sourceMappingURL=EntityLevelingSystem.js.map