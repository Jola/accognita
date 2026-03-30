// ============================================================
// SKILL DATA
// Absorb & Evolve — Alle Skill-Definitionen
// Quelle: GDD-02-Skillsystem.md
//
// ERWEITERBARKEIT:
//   - Neue Basis-Skills: in BASE_SKILLS eintragen
//   - Neue Pflanzen-Skills: in PLANT_SKILLS eintragen
//   - Neue Kombis: in COMBO_SKILLS + RECIPE_INDEX eintragen
//   - Kern-Fähigkeiten: in CORE_SKILLS (nur Analyze + Absorb)
//
// BALANCING:
//   baseXpThreshold = XP für ersten Level-Up (1→2)
//   xpThresholdMultiplier = 1.5 (jedes Level 50% mehr XP)
// ============================================================
// -----------------------------------------------------------
// KERN-FÄHIGKEITEN
// Analyse & Absorb sind angeboren — immer vorhanden, nie verlierbar.
// Ihr Level bestimmt die Erfolgswahrscheinlichkeit.
// category: "core" — tauchen in discoveredSkills nicht auf (nur Referenz).
// -----------------------------------------------------------
export const CORE_SKILLS = [
    {
        id: "infinite_storage",
        name: "Infinite Storage",
        element: "none",
        icon: "♾️",
        category: "core",
        activation: "passive",
        maxLevel: 1, // Immer auf Level 1 — keine Steigerung
        baseXpThreshold: 999999, // Nie steigerbar
        xpThresholdMultiplier: 1.0,
        description: "Der Blob-Körper ist ein dimensionales Lager ohne Kapazitätsgrenze. " +
            "Alle gesammelten Materialien werden unbegrenzt gespeichert. " +
            "Mengen bis Number.MAX_SAFE_INTEGER (~9 Quadrillionen) werden unterstützt.",
    },
    {
        id: "analyze",
        name: "Analyze",
        element: "none",
        icon: "🔍",
        category: "core",
        activation: "active",
        maxLevel: 20,
        baseXpThreshold: 10,
        xpThresholdMultiplier: 1.5,
        description: "Analysiert eine Entität. Entität bleibt erhalten. +1 XP pro entdecktem Skill. " +
            "Fehlschlag: neutrale Wesen bleiben friedlich, feindliche greifen an.",
    },
    {
        id: "absorb",
        name: "Absorb",
        element: "none",
        icon: "💥",
        category: "core",
        activation: "active",
        maxLevel: 20,
        baseXpThreshold: 10,
        xpThresholdMultiplier: 1.5,
        description: "Absorbiert eine Entität. Entität verschwindet (respawnt). +3 XP pro entdecktem Skill. " +
            "Liefert auch Materialien. Fehlschlag: neutrale und feindliche Wesen greifen an.",
    },
];
// -----------------------------------------------------------
// BASIS-SKILLS (durch Entitäten entdeckbar)
// category: "basic", können beliebig ergänzt werden
// -----------------------------------------------------------
export const BASE_SKILLS = [
    // --- INSEKTEN-SKILLS ---
    {
        id: "chitin_armor",
        name: "Chitin Armor",
        element: "earth",
        icon: "🛡️",
        category: "basic",
        activation: "passive",
        maxLevel: 0,
        baseXpThreshold: 12,
        xpThresholdMultiplier: 1.5,
        description: "Passiv: Zieht eine harte Chitinschicht über die Außenhaut. " +
            "Reduziert eingehenden physischen Schaden um 10% + 5% pro Level. " +
            "Quelle: Ameisen (Lv1) und Spinnen (Lv2).",
        // Kein Kampf-Direktangriff — wirkt als stat_mod StatusEffect
    },
    {
        id: "superstrength",
        name: "Superstrength",
        element: "none",
        icon: "💪",
        category: "basic",
        activation: "passive",
        maxLevel: 0,
        baseXpThreshold: 15,
        xpThresholdMultiplier: 1.5,
        description: "Passiv: Ameisen tragen das 50-fache ihres Körpergewichts — der Blob übernimmt diese Stärke. " +
            "Verstärkt den Nahkampf-Angriff des Blobs. Höheres Level = höherer Schadensbonus.",
        // Wirkt als damageMult-Modifikator im CombatSystem
    },
    {
        id: "venom",
        name: "Venom",
        element: "poison",
        icon: "🕷️",
        category: "basic",
        activation: "passive",
        maxLevel: 0,
        baseXpThreshold: 15,
        xpThresholdMultiplier: 1.5,
        description: "Passiv: Jeder Nahkampftreffer des Blobs hat eine Chance, dem Ziel Gift zu injizieren. " +
            "Gift verursacht 2 Schaden/s für 4s. Höheres Level = höhere Chance und stärkeres Gift.",
        // Appliziert DoT-StatusEffect auf getroffene Ziele
    },
    {
        id: "bite",
        name: "Biss",
        element: "none",
        icon: "🦷",
        category: "basic",
        activation: "active",
        maxLevel: 0,
        baseXpThreshold: 12,
        xpThresholdMultiplier: 1.5,
        description: "Aktiv: Gezielter Biss — verursacht direkten Schaden (7 Basis). " +
            "Ist Venom bekannt, hat jeder Biss zusätzliche Chance das Ziel zu vergiften. " +
            "Höheres Level = stärkerer Biss. MP-Kosten: 3.",
        mpCost: 3,
        cooldownMs: 1200,
        attackType: "melee",
        baseDamage: 7,
    },
    {
        id: "jump",
        name: "Jump",
        element: "none",
        icon: "🦘",
        category: "basic",
        activation: "active",
        maxLevel: 0,
        baseXpThreshold: 12,
        xpThresholdMultiplier: 1.5,
        description: "Aktiv: Springt 160px in Bewegungsrichtung — überwindet Hindernisse und erzeugt Distanz. " +
            "Höheres Level = größere Sprungweite. MP-Kosten: 4.",
        mpCost: 4,
        cooldownMs: 1800,
        attackType: "dash",
    },
    {
        id: "claw",
        name: "Klauenhieb",
        element: "none",
        icon: "🦅",
        category: "basic",
        activation: "active",
        maxLevel: 0,
        baseXpThreshold: 15,
        xpThresholdMultiplier: 1.5,
        description: "Aktiv: Ein mächtiger Nahkampfhieb mit scharfen Klauen (8 Basis-Schaden). " +
            "Höheres Level = stärkerer Hieb. MP-Kosten: 5.",
        mpCost: 5,
        cooldownMs: 1500,
        attackType: "melee",
        baseDamage: 8,
    },
    {
        id: "fire_breath",
        name: "Feueratem",
        element: "fire",
        icon: "🔥",
        category: "basic",
        activation: "active",
        maxLevel: 0,
        baseXpThreshold: 25,
        xpThresholdMultiplier: 1.5,
        description: "Aktiv: Fernkampf-Angriff — ein Strom lodernder Flammen über 8× Körpergröße Distanz. " +
            "Verursacht direkten Feuerschaden (10 Basis). Höheres Level = stärker. MP-Kosten: 8.",
        mpCost: 8,
        cooldownMs: 2500,
        attackType: "ranged_projectile",
        baseDamage: 10,
    },
    {
        id: "hemolymph",
        name: "Hemolymph",
        element: "poison",
        icon: "🐞",
        category: "basic",
        activation: "passive",
        maxLevel: 0,
        baseXpThreshold: 12,
        xpThresholdMultiplier: 1.5,
        description: "Passiv: Wird der Blob getroffen, gibt er bitteres Hämolymph ab — " +
            "der Angreifer erleidet 2 Sofortschaden. Höheres Level = stärkerer Rückschlag.",
        // Appliziert Aura-StatusEffect der bei jedem eingehenden Treffer feuert
    },
];
// -----------------------------------------------------------
// PFLANZEN-SKILLS (von Pflanzen und Mineralien)
// category: "basic" — aber nur durch Pflanzen/Mineralien erreichbar
// Neue Pflanzenskills hier eintragen.
// -----------------------------------------------------------
export const PLANT_SKILLS = [
    {
        id: "photosynthesis",
        name: "Photosynthesis",
        element: "nature",
        icon: "☀️",
        category: "basic",
        activation: "passive", // Wirkt automatisch, kein manueller Einsatz
        maxLevel: 0,
        baseXpThreshold: 15,
        xpThresholdMultiplier: 1.5,
        description: "Passiv: Regeneriert langsam HP, solange der Blob sich nicht kämpfend fortbewegt. " +
            "Wirkt automatisch nach Entdeckung. Höheres Level = stärkere Regeneration.",
    },
];
// -----------------------------------------------------------
// KOMBINATIONS-SKILLS (nur durch Kombinieren freischaltbar)
// category: "combo" — Input: zwei basic-Skills
// Rezepte werden hier definiert, sobald Kombos entworfen sind.
// -----------------------------------------------------------
export const COMBO_SKILLS = [
// Noch keine Kombinations-Skills definiert.
// Mechanismus ist vorhanden — Rezepte hier eintragen.
];
// -----------------------------------------------------------
// ALLE SKILLS — kombinierte Map für schnellen Zugriff
// Enthält: core + basic + plant + combo
// -----------------------------------------------------------
export const ALL_SKILLS = new Map([...CORE_SKILLS, ...BASE_SKILLS, ...PLANT_SKILLS, ...COMBO_SKILLS].map((s) => [s.id, s]));
// -----------------------------------------------------------
// REZEPT-INDEX — für schnelle Kombinationssuche
// Key: "idA+idB" (alphabetisch sortiert für Konsistenz)
// -----------------------------------------------------------
export const RECIPE_INDEX = new Map();
for (const skill of COMBO_SKILLS) {
    if (skill.recipe) {
        const [a, b] = [...skill.recipe].sort();
        RECIPE_INDEX.set(`${a}+${b}`, skill.id);
    }
}
//# sourceMappingURL=skills.js.map