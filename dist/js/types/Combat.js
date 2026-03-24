// ============================================================
// COMBAT TYPES
// Absorb & Evolve — Alle Kampf-spezifischen Typen
//
// Keine Abhängigkeiten zu anderen Spiel-Modulen.
// Wird von GameState.ts, Entity.ts, Skill.ts importiert.
// ============================================================
// Hilfsfunktion: StatusEffect mit Defaults erstellen
export function makeStatusEffect(base) {
    return {
        sourceSkillId: undefined,
        durationMs: -1,
        expiresAt: Infinity,
        tickIntervalMs: 0,
        lastTickAt: 0,
        damagePerTick: 0,
        healPerTick: 0,
        speedMultiplier: 1.0,
        damageReduction: 0,
        reflectDamage: 0,
        damageBonus: 0,
        damageMult: 1.0,
        ...base,
    };
}
//# sourceMappingURL=Combat.js.map