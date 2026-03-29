"use strict";
(() => {
  // dist/js/types/GameState.js
  var CORE_BASE_XP = 10;
  var CORE_XP_MULTIPLIER = 1.5;
  var CORE_MAX_LEVEL = 20;
  function createCoreAbility() {
    return {
      level: 1,
      currentXp: 0,
      xpToNextLevel: CORE_BASE_XP,
      totalXpEarned: 0
    };
  }
  function createInitialGameState() {
    return {
      version: "0.3.0",
      player: {
        x: 400,
        y: 300,
        hp: 80,
        maxHp: 80,
        mp: 40,
        maxMp: 40,
        level: 1,
        totalExp: 0,
        coreAbilities: {
          analyze: createCoreAbility(),
          absorb: createCoreAbility()
        },
        discoveredSkills: /* @__PURE__ */ new Map(),
        activeSkillSlots: [null, null, null, null, null],
        materials: /* @__PURE__ */ new Map(),
        statusEffects: [],
        skillCooldowns: /* @__PURE__ */ new Map(),
        spawnX: 400,
        spawnY: 300,
        totalAbsorbs: 0,
        totalAbsorbFailures: 0,
        totalAnalyzes: 0,
        totalAnalyzeFailures: 0,
        playtimeSeconds: 0
      },
      world: {
        entities: /* @__PURE__ */ new Map(),
        currentZone: "forest_start",
        timeElapsed: 0,
        worldSeed: 20250328
      }
    };
  }

  // dist/js/data/skills.js
  var CORE_SKILLS = [
    {
      id: "infinite_storage",
      name: "Infinite Storage",
      element: "none",
      icon: "\u267E\uFE0F",
      category: "core",
      activation: "passive",
      maxLevel: 1,
      // Immer auf Level 1 — keine Steigerung
      baseXpThreshold: 999999,
      // Nie steigerbar
      xpThresholdMultiplier: 1,
      description: "Der Slime-K\xF6rper ist ein dimensionales Lager ohne Kapazit\xE4tsgrenze. Alle gesammelten Materialien werden unbegrenzt gespeichert. Mengen bis Number.MAX_SAFE_INTEGER (~9 Quadrillionen) werden unterst\xFCtzt."
    },
    {
      id: "analyze",
      name: "Analyze",
      element: "none",
      icon: "\u{1F50D}",
      category: "core",
      activation: "active",
      maxLevel: 20,
      baseXpThreshold: 10,
      xpThresholdMultiplier: 1.5,
      description: "Analysiert eine Entit\xE4t. Entit\xE4t bleibt erhalten. +1 XP pro entdecktem Skill. Fehlschlag: neutrale Wesen bleiben friedlich, feindliche greifen an."
    },
    {
      id: "absorb",
      name: "Absorb",
      element: "none",
      icon: "\u{1F4A5}",
      category: "core",
      activation: "active",
      maxLevel: 20,
      baseXpThreshold: 10,
      xpThresholdMultiplier: 1.5,
      description: "Absorbiert eine Entit\xE4t. Entit\xE4t verschwindet (respawnt). +3 XP pro entdecktem Skill. Liefert auch Materialien. Fehlschlag: neutrale und feindliche Wesen greifen an."
    }
  ];
  var BASE_SKILLS = [
    // --- INSEKTEN-SKILLS ---
    {
      id: "chitin_armor",
      name: "Chitin Armor",
      element: "earth",
      icon: "\u{1F6E1}\uFE0F",
      category: "basic",
      activation: "passive",
      maxLevel: 0,
      baseXpThreshold: 12,
      xpThresholdMultiplier: 1.5,
      description: "Passiv: Zieht eine harte Chitinschicht \xFCber die Au\xDFenhaut. Reduziert eingehenden physischen Schaden um 10% + 5% pro Level. Quelle: Ameisen (Lv1) und Spinnen (Lv2)."
      // Kein Kampf-Direktangriff — wirkt als stat_mod StatusEffect
    },
    {
      id: "superstrength",
      name: "Superstrength",
      element: "none",
      icon: "\u{1F4AA}",
      category: "basic",
      activation: "passive",
      maxLevel: 0,
      baseXpThreshold: 15,
      xpThresholdMultiplier: 1.5,
      description: "Passiv: Ameisen tragen das 50-fache ihres K\xF6rpergewichts \u2014 der Slime \xFCbernimmt diese St\xE4rke. Verst\xE4rkt den Nahkampf-Angriff des Slimes. H\xF6heres Level = h\xF6herer Schadensbonus."
      // Wirkt als damageMult-Modifikator im CombatSystem
    },
    {
      id: "venom",
      name: "Venom",
      element: "poison",
      icon: "\u{1F577}\uFE0F",
      category: "basic",
      activation: "passive",
      maxLevel: 0,
      baseXpThreshold: 15,
      xpThresholdMultiplier: 1.5,
      description: "Passiv: Jeder Nahkampftreffer des Slimes hat eine Chance, dem Ziel Gift zu injizieren. Gift verursacht 2 Schaden/s f\xFCr 4s. H\xF6heres Level = h\xF6here Chance und st\xE4rkeres Gift."
      // Appliziert DoT-StatusEffect auf getroffene Ziele
    },
    {
      id: "bite",
      name: "Biss",
      element: "none",
      icon: "\u{1F9B7}",
      category: "basic",
      activation: "active",
      maxLevel: 0,
      baseXpThreshold: 12,
      xpThresholdMultiplier: 1.5,
      description: "Aktiv: Gezielter Biss \u2014 verursacht direkten Schaden (7 Basis). Ist Venom bekannt, hat jeder Biss zus\xE4tzliche Chance das Ziel zu vergiften. H\xF6heres Level = st\xE4rkerer Biss. MP-Kosten: 3.",
      mpCost: 3,
      cooldownMs: 1200,
      attackType: "melee",
      baseDamage: 7
    },
    {
      id: "jump",
      name: "Jump",
      element: "none",
      icon: "\u{1F998}",
      category: "basic",
      activation: "active",
      maxLevel: 0,
      baseXpThreshold: 12,
      xpThresholdMultiplier: 1.5,
      description: "Aktiv: Springt 160px in Bewegungsrichtung \u2014 \xFCberwindet Hindernisse und erzeugt Distanz. H\xF6heres Level = gr\xF6\xDFere Sprungweite. MP-Kosten: 4.",
      mpCost: 4,
      cooldownMs: 1800,
      attackType: "dash"
    },
    {
      id: "hemolymph",
      name: "Hemolymph",
      element: "poison",
      icon: "\u{1F41E}",
      category: "basic",
      activation: "passive",
      maxLevel: 0,
      baseXpThreshold: 12,
      xpThresholdMultiplier: 1.5,
      description: "Passiv: Wird der Slime getroffen, gibt er bitteres H\xE4molymph ab \u2014 der Angreifer erleidet 2 Sofortschaden. H\xF6heres Level = st\xE4rkerer R\xFCckschlag."
      // Appliziert Aura-StatusEffect der bei jedem eingehenden Treffer feuert
    }
  ];
  var PLANT_SKILLS = [
    {
      id: "photosynthesis",
      name: "Photosynthesis",
      element: "nature",
      icon: "\u2600\uFE0F",
      category: "basic",
      activation: "passive",
      // Wirkt automatisch, kein manueller Einsatz
      maxLevel: 0,
      baseXpThreshold: 15,
      xpThresholdMultiplier: 1.5,
      description: "Passiv: Regeneriert langsam HP, solange der Slime sich nicht k\xE4mpfend fortbewegt. Wirkt automatisch nach Entdeckung. H\xF6heres Level = st\xE4rkere Regeneration."
    }
  ];
  var COMBO_SKILLS = [
    // Noch keine Kombinations-Skills definiert.
    // Mechanismus ist vorhanden — Rezepte hier eintragen.
  ];
  var ALL_SKILLS = new Map([...CORE_SKILLS, ...BASE_SKILLS, ...PLANT_SKILLS, ...COMBO_SKILLS].map((s) => [s.id, s]));
  var RECIPE_INDEX = /* @__PURE__ */ new Map();
  for (const skill of COMBO_SKILLS) {
    if (skill.recipe) {
      const [a, b] = [...skill.recipe].sort();
      RECIPE_INDEX.set(`${a}+${b}`, skill.id);
    }
  }

  // dist/js/data/materials.js
  var MATERIAL_DEFINITIONS = [
    // --- PFLANZLICHE MATERIALIEN ---
    {
      id: "plant_fiber",
      name: "Pflanzenfaser",
      icon: "\u{1F33F}",
      description: "Faserige Struktur aus Pflanzen. Grundmaterial f\xFCr Grow."
    },
    {
      id: "wood",
      name: "Holz",
      icon: "\u{1FAB5}",
      description: "Hartes Pflanzenmaterial. Vielseitig einsetzbar."
    },
    {
      id: "seed",
      name: "Samen",
      icon: "\u{1F331}",
      description: "Konzentrierte Wachstumskraft einer Pflanze."
    },
    {
      id: "spore",
      name: "Spore",
      icon: "\u{1F344}",
      description: "Pilzspore mit giftigen Eigenschaften."
    },
    // --- MINERALISCHE MATERIALIEN ---
    {
      id: "stone",
      name: "Stein",
      icon: "\u{1FAA8}",
      description: "Rohes Gestein. Grundmaterial aus der Welt."
    },
    {
      id: "ore",
      name: "Erz",
      icon: "\u26CF\uFE0F",
      description: "Metallhaltiges Mineral. Seltener als Stein."
    },
    {
      id: "crystal",
      name: "Kristall",
      icon: "\u{1F48E}",
      description: "Reines Mineral mit magischen Eigenschaften."
    }
  ];
  var MATERIAL_MAP = new Map(MATERIAL_DEFINITIONS.map((m) => [m.id, m]));

  // dist/js/data/entities.js
  var ENTITY_DEFINITIONS = [
    // ==========================================================
    // PFLANZEN
    // disposition: "neutral", category: "plant"
    // Fehlschlag: nichts passiert (leblos)
    // ==========================================================
    {
      id: "grass",
      name: "Gras",
      icon: "\u{1F33F}",
      behavior: "passive",
      disposition: "neutral",
      category: "plant",
      rarity: "common",
      level: 1,
      skillDrops: [
        { skillId: "photosynthesis", chance: 0.12 }
        // Selten — besonderer Fund
      ],
      materialDrops: [
        { materialId: "plant_fiber", amountMin: 1, amountMax: 3, chance: 1 }
      ],
      respawnTime: 60,
      // 1 Minute — wächst nach
      interactRadius: 50,
      worldSize: 5
      // Grashalm — etwas größer als der Slime auf Level 1
    },
    // ==========================================================
    // INSEKTEN — Level 1 (neutral, defensiv)
    // ==========================================================
    {
      id: "ant",
      name: "Ameise",
      icon: "\u{1F41C}",
      behavior: "defensive",
      disposition: "neutral",
      // Greift nur an wenn Absorb fehlschlägt
      category: "creature",
      rarity: "common",
      level: 1,
      skillDrops: [
        { skillId: "bite", chance: 0.12 },
        // Direkter Angriffsbiss
        { skillId: "chitin_armor", chance: 0.15 },
        // Hartes Exoskelett
        { skillId: "superstrength", chance: 0.1 }
        // 50x Körpergewicht
      ],
      materialDrops: [],
      hp: 8,
      damage: 3,
      speed: 15,
      // worldSize 3 × 5 = 15
      attackRangePx: 6,
      attackCooldownMs: 1800,
      attackType: "melee",
      // 2 × worldSize
      respawnTime: 30,
      interactRadius: 35,
      aggroRadius: 15,
      // 5 × worldSize
      skillLevels: { chitin_armor: 1 },
      // 10% DR
      worldSize: 3
      // Ameise — winziges Insekt, ähnlich groß wie Level-1-Slime
    },
    {
      id: "ladybug",
      name: "Marienk\xE4fer",
      icon: "\u{1F41E}",
      behavior: "defensive",
      disposition: "neutral",
      // Greift nur an wenn Absorb fehlschlägt
      category: "creature",
      rarity: "common",
      level: 1,
      skillDrops: [
        { skillId: "hemolymph", chance: 0.15 }
        // Defensivgift bei Treffer
      ],
      materialDrops: [],
      hp: 6,
      damage: 2,
      speed: 20,
      // worldSize 4 × 5 = 20
      attackRangePx: 8,
      attackCooldownMs: 2e3,
      attackType: "melee",
      // 2 × worldSize
      respawnTime: 35,
      interactRadius: 35,
      aggroRadius: 20,
      // 5 × worldSize
      worldSize: 4
      // Marienkäfer — etwas größer als Ameise
    },
    // ==========================================================
    // INSEKTEN — Level 2 (feindlich, angreifend)
    // ==========================================================
    {
      id: "jumping_spider",
      name: "Springspinne",
      icon: "\u{1F577}\uFE0F",
      behavior: "aggressive",
      disposition: "hostile",
      // Greift immer an bei Fehlschlag
      category: "creature",
      rarity: "common",
      level: 2,
      skillDrops: [
        { skillId: "bite", chance: 0.15 },
        // Biss-Angriff
        { skillId: "jump", chance: 0.2 },
        // Charakteristischer Sprung
        { skillId: "chitin_armor", chance: 0.1 }
        // Exoskelett (stärker als Ameise)
      ],
      materialDrops: [],
      hp: 18,
      speed: 30,
      // worldSize 6 × 5 = 30
      attackRangePx: 12,
      attackCooldownMs: 1200,
      attackType: "charge",
      // 2 × worldSize
      respawnTime: 45,
      interactRadius: 40,
      aggroRadius: 30,
      // 5 × worldSize
      // bite Lv2 → 7 × 1.1 ≈ 8 Schaden; chitin_armor Lv3 → 20% DR
      skillLevels: { bite: 2, chitin_armor: 3 },
      worldSize: 6
      // Springspinne — deutlich größer als Ameisen
    },
    {
      id: "poison_spider",
      name: "Giftspinne",
      icon: "\u{1F578}\uFE0F",
      behavior: "aggressive",
      disposition: "hostile",
      category: "creature",
      rarity: "uncommon",
      level: 2,
      skillDrops: [
        { skillId: "bite", chance: 0.15 },
        // Biss-Angriff (kombiniert sich mit Venom)
        { skillId: "venom", chance: 0.2 },
        // Giftbiss
        { skillId: "chitin_armor", chance: 0.08 }
        // Exoskelett
      ],
      materialDrops: [],
      hp: 15,
      speed: 30,
      // worldSize 6 × 5 = 30
      attackRangePx: 12,
      attackCooldownMs: 1600,
      attackType: "melee",
      // 2 × worldSize
      respawnTime: 50,
      interactRadius: 40,
      aggroRadius: 30,
      // 5 × worldSize
      // bite Lv1 → 7 Schaden; venom Lv3 → 40% Chance, 3/Tick; chitin_armor Lv3 → 20% DR
      skillLevels: { bite: 1, venom: 3, chitin_armor: 3 },
      worldSize: 6
      // Giftspinne — ähnlich groß wie Springspinne
    },
    // ==========================================================
    // SKORPIONE — Level 3 & 4 (feindlich, gepanzert, giftig)
    // ==========================================================
    {
      id: "small_scorpion",
      name: "Kleiner Skorpion",
      icon: "\u{1F982}",
      behavior: "aggressive",
      disposition: "hostile",
      category: "creature",
      rarity: "uncommon",
      level: 3,
      skillDrops: [
        { skillId: "chitin_armor", chance: 0.25 },
        // Skorpion-Panzer
        { skillId: "venom", chance: 0.25 },
        // Stachel-Gift
        { skillId: "bite", chance: 0.1 }
      ],
      materialDrops: [],
      hp: 30,
      speed: 35,
      // worldSize 7 × 5 = 35
      attackRangePx: 14,
      attackCooldownMs: 1400,
      attackType: "melee",
      // 2 × worldSize
      respawnTime: 60,
      interactRadius: 45,
      aggroRadius: 35,
      // 5 × worldSize
      // bite Lv6 → 7×1.65 ≈ 12 Schaden; chitin Lv5 → 30% DR; venom Lv5 → 50%/4Tick
      skillLevels: { bite: 6, chitin_armor: 5, venom: 5 },
      worldSize: 7
    },
    {
      id: "large_scorpion",
      name: "Gro\xDFer Skorpion",
      icon: "\u{1F982}",
      behavior: "aggressive",
      disposition: "hostile",
      category: "creature",
      rarity: "rare",
      level: 4,
      skillDrops: [
        { skillId: "chitin_armor", chance: 0.3 },
        // Massiver Panzer
        { skillId: "venom", chance: 0.3 },
        // Starkes Gift
        { skillId: "bite", chance: 0.15 }
      ],
      materialDrops: [],
      hp: 55,
      speed: 50,
      // worldSize 10 × 5 = 50
      attackRangePx: 20,
      attackCooldownMs: 1600,
      attackType: "melee",
      // 2 × worldSize
      respawnTime: 120,
      interactRadius: 55,
      aggroRadius: 50,
      // 5 × worldSize
      // bite Lv18 → 7×2.85 ≈ 20 Schaden; chitin Lv8 → 45% DR; venom Lv8 → 65%/5Tick
      skillLevels: { bite: 18, chitin_armor: 8, venom: 8 },
      worldSize: 10
    }
  ];
  var ENTITY_MAP = new Map(ENTITY_DEFINITIONS.map((e) => [e.id, e]));

  // dist/js/data/balance.js
  var BASE_XP_ABSORB = 3;
  var BASE_XP_ANALYZE = 1;
  var BASE_XP_CORE = 1;
  var XP_LEVEL_MULTIPLIER = 1.5;
  var PLAYER_LEVEL_BASE_XP = 200;
  var PLAYER_LEVEL_XP_MULTIPLIER = 2;
  var BASE_HP = 80;
  var HP_PER_LEVEL = 15;
  var BASE_MP = 40;
  var MP_PER_LEVEL = 8;
  var XP_CURVE_EXPONENT = 1.5;
  var XP_CURVE_MIN = 0.05;
  var XP_CURVE_MAX = 4;
  function calcXpMultiplier(entityLevel, skillLevel) {
    const level = Math.max(1, skillLevel);
    const ratio = entityLevel / level;
    const raw = Math.pow(ratio, XP_CURVE_EXPONENT);
    return Math.min(XP_CURVE_MAX, Math.max(XP_CURVE_MIN, raw));
  }
  function scaleXp(baseXp, entityLevel, skillLevel) {
    return Math.max(0, Math.floor(baseXp * calcXpMultiplier(entityLevel, skillLevel)));
  }
  function calcSuccessChance(abilityLevel, entityLevel) {
    if (abilityLevel >= entityLevel)
      return 1;
    return abilityLevel / entityLevel;
  }
  var ANALYZE_CHANCE_MODIFIER = 0.7;
  var PLAYER_WORLD_RADIUS_MIN = 2;
  var PLAYER_WORLD_RADIUS_MAX = 8;
  var PLAYER_SIZE_LEVEL_MAX = 20;
  var PLAYER_SCREEN_RADIUS = 16;
  var PLAYER_SPEED_PER_WORLD_RADIUS = 10;

  // dist/js/systems/SkillSystem.js
  function calcXpThreshold(baseThreshold, multiplier, level) {
    return Math.floor(baseThreshold * Math.pow(multiplier, level - 1));
  }
  function gainCoreAbilityXp(player, method, entityLevel = 1) {
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
    while (ability.currentXp >= ability.xpToNextLevel && ability.level < CORE_MAX_LEVEL) {
      ability.currentXp -= ability.xpToNextLevel;
      ability.level += 1;
      ability.xpToNextLevel = calcXpThreshold(CORE_BASE_XP, CORE_XP_MULTIPLIER, ability.level);
      leveledUp = true;
      newLevel = ability.level;
    }
    return { leveledUp, newLevel, xpGained };
  }
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
      isEnabled: true
    };
  }
  function isAtMaxLevel(instance) {
    const def = ALL_SKILLS.get(instance.definitionId);
    if (!def)
      return false;
    return def.maxLevel > 0 && instance.level >= def.maxLevel;
  }
  function discoverSkill(player, skillId, method, entityLevel = 1) {
    const def = ALL_SKILLS.get(skillId);
    if (!def)
      throw new Error(`Unbekannte Skill-ID: ${skillId}`);
    const baseXp = method === "absorb" ? BASE_XP_ABSORB : BASE_XP_ANALYZE;
    const existing = player.discoveredSkills.get(skillId);
    if (!existing) {
      player.discoveredSkills.set(skillId, createSkillInstance(skillId));
      return { skillId, method, xpGained: 0, wasNewDiscovery: true, leveledUp: false };
    }
    if (isAtMaxLevel(existing)) {
      existing.totalXpEarned += baseXp;
      return { skillId, method, xpGained: baseXp, wasNewDiscovery: false, leveledUp: false };
    }
    const xpGained = scaleXp(baseXp, entityLevel, existing.level);
    existing.currentXp += xpGained;
    existing.totalXpEarned += xpGained;
    let leveledUp = false;
    let newLevel;
    while (existing.currentXp >= existing.xpToNextLevel && !isAtMaxLevel(existing)) {
      existing.currentXp -= existing.xpToNextLevel;
      existing.level += 1;
      existing.xpToNextLevel = calcXpThreshold(def.baseXpThreshold, XP_LEVEL_MULTIPLIER, existing.level);
      leveledUp = true;
      newLevel = existing.level;
    }
    return { skillId, method, xpGained, wasNewDiscovery: false, leveledUp, newLevel };
  }
  function combineSkills(player, skillIdA, skillIdB) {
    if (skillIdA === skillIdB) {
      return { outcome: "invalid_input", message: "Du kannst einen Skill nicht mit sich selbst kombinieren." };
    }
    const defA = ALL_SKILLS.get(skillIdA);
    const defB = ALL_SKILLS.get(skillIdB);
    if (!defA || !defB) {
      return { outcome: "invalid_input", message: "Unbekannter Skill." };
    }
    if (defA.category !== "basic" || defB.category !== "basic") {
      return { outcome: "invalid_input", message: "Nur Basis-Skills k\xF6nnen kombiniert werden." };
    }
    const [a, b] = [skillIdA, skillIdB].sort();
    const resultId = RECIPE_INDEX.get(`${a}+${b}`);
    if (!resultId) {
      return { outcome: "no_recipe", message: "Diese Kombination ergibt keinen bekannten Skill." };
    }
    const alreadyKnown = player.discoveredSkills.has(resultId);
    if (alreadyKnown) {
      const instance = player.discoveredSkills.get(resultId);
      const resultDef2 = ALL_SKILLS.get(resultId);
      const xpGained = scaleXp(BASE_XP_ABSORB, instance.level, instance.level);
      if (!isAtMaxLevel(instance)) {
        instance.currentXp += xpGained;
        instance.totalXpEarned += xpGained;
        while (instance.currentXp >= instance.xpToNextLevel && !isAtMaxLevel(instance)) {
          instance.currentXp -= instance.xpToNextLevel;
          instance.level += 1;
          instance.xpToNextLevel = calcXpThreshold(resultDef2.baseXpThreshold, XP_LEVEL_MULTIPLIER, instance.level);
        }
      }
      return {
        outcome: "success_xp",
        resultSkillId: resultId,
        xpGained,
        message: `${resultDef2.name} bereits bekannt \u2014 +${xpGained} XP.`
      };
    }
    player.discoveredSkills.set(resultId, createSkillInstance(resultId));
    const resultDef = ALL_SKILLS.get(resultId);
    return {
      outcome: "success_new",
      resultSkillId: resultId,
      message: `Neuer Skill entdeckt: ${resultDef.icon} ${resultDef.name}!`
    };
  }
  function getDiscoveredSkillsSorted(player) {
    return Array.from(player.discoveredSkills.values()).sort((a, b) => a.discoveredAt - b.discoveredAt);
  }
  function getXpProgress(instance) {
    if (instance.xpToNextLevel === 0)
      return 1;
    return Math.min(instance.currentXp / instance.xpToNextLevel, 1);
  }
  function isMaxLevel(instance) {
    return isAtMaxLevel(instance);
  }
  function getSkillEffectiveness(level) {
    return 1 + (level - 1) * 0.1 + (level >= 3 ? 0.15 : 0);
  }
  function gainSkillXp(player, skillId, amount) {
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
  function calcPlayerLevel(totalXp) {
    let level = 1;
    let remaining = totalXp;
    while (true) {
      const threshold = Math.floor(PLAYER_LEVEL_BASE_XP * Math.pow(PLAYER_LEVEL_XP_MULTIPLIER, level - 1));
      if (remaining < threshold) {
        return { level, xpIntoLevel: remaining, xpToNext: threshold };
      }
      remaining -= threshold;
      level++;
    }
  }
  function calcMaxHp(level) {
    return BASE_HP + (level - 1) * HP_PER_LEVEL;
  }
  function calcMaxMp(level) {
    return BASE_MP + (level - 1) * MP_PER_LEVEL;
  }
  function updatePlayerLevel(player) {
    let totalXp = player.coreAbilities.absorb.totalXpEarned + player.coreAbilities.analyze.totalXpEarned;
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
      player.hp = Math.min(player.hp + (newMaxHp - player.maxHp), newMaxHp);
      player.mp = Math.min(player.mp + (newMaxMp - player.maxMp), newMaxMp);
      player.maxHp = newMaxHp;
      player.maxMp = newMaxMp;
    }
    return { leveledUp, newLevel: leveledUp ? level : void 0 };
  }

  // dist/js/systems/MaterialSystem.js
  var SUFFIXES = [
    [1e15, "Q"],
    // Quadrillion
    [1e12, "T"],
    // Trillion
    [1e9, "B"],
    // Billion
    [1e6, "M"],
    // Million
    [1e3, "K"]
    // Tausend
  ];
  function formatAmount(n) {
    for (const [threshold, suffix] of SUFFIXES) {
      if (n >= threshold) {
        const value = n / threshold;
        const formatted = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
        return `${formatted}${suffix}`;
      }
    }
    return String(Math.floor(n));
  }
  function getMaterialAmount(player, materialId) {
    return player.materials.get(materialId) ?? 0;
  }
  function addMaterial(player, materialId, amount) {
    if (amount <= 0)
      return;
    const current = getMaterialAmount(player, materialId);
    player.materials.set(materialId, current + amount);
  }
  function deductMaterials(player, cost) {
    for (const { materialId, amount } of cost) {
      const current = getMaterialAmount(player, materialId);
      player.materials.set(materialId, Math.max(0, current - amount));
    }
  }
  function getMaterialList(player) {
    const result = [];
    for (const [id, amount] of player.materials) {
      if (amount <= 0)
        continue;
      const def = MATERIAL_MAP.get(id);
      if (!def)
        continue;
      result.push({ id, name: def.name, icon: def.icon, amount, formatted: formatAmount(amount) });
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }
  var GROW_HP_BASE = 5;
  var GROW_HP_PER_LEVEL = 2;
  function useGrow(player) {
    const skill = player.discoveredSkills.get("grow");
    if (!skill) {
      return { success: false, hpGained: 0, message: "Grow nicht gelernt." };
    }
    const growDef = ALL_SKILLS.get("grow");
    if (!growDef?.materialCost) {
      return { success: false, hpGained: 0, message: "Kein Materialkosteneintrag f\xFCr Grow." };
    }
    const missing = growDef.materialCost.filter(({ materialId, amount }) => getMaterialAmount(player, materialId) < amount);
    if (missing.length > 0) {
      const details = missing.map(({ materialId, amount }) => {
        const def = MATERIAL_MAP.get(materialId);
        return `${def?.icon ?? "?"} ${def?.name ?? materialId} \xD7${amount}`;
      }).join(", ");
      return {
        success: false,
        hpGained: 0,
        missingMaterials: missing,
        message: `Nicht genug Materialien: ${details}`
      };
    }
    deductMaterials(player, growDef.materialCost);
    const hpGained = GROW_HP_BASE + (skill.level - 1) * GROW_HP_PER_LEVEL;
    player.maxHp += hpGained;
    player.hp += hpGained;
    return {
      success: true,
      hpGained,
      message: `\u{1F331} Gewachsen! +${hpGained} MaxHP (jetzt: ${player.maxHp})`
    };
  }

  // dist/js/systems/EntitySystem.js
  function shouldAggro(disposition, method, category) {
    if (category === "plant" || category === "mineral")
      return false;
    if (disposition === "hostile")
      return true;
    return method === "absorb";
  }
  function absorbEntity(player, world, instanceId) {
    const instance = world.entities.get(instanceId);
    if (!instance?.isAlive) {
      return failResult("absorb", "?", "Entity nicht verf\xFCgbar.", false);
    }
    const def = ENTITY_MAP.get(instance.definitionId);
    if (!def) {
      return failResult("absorb", "?", "Unbekannte Entity.", false);
    }
    const absorbLevel = player.coreAbilities.absorb.level;
    const chance = calcSuccessChance(absorbLevel, def.level);
    if (Math.random() > chance) {
      player.totalAbsorbFailures += 1;
      const aggro = shouldAggro(def.disposition, "absorb", def.category);
      if (aggro)
        instance.isAggro = true;
      const failMsg = aggro ? `${def.icon} ${def.name} weicht aus und greift an!` : `${def.icon} ${def.name}: Absorb fehlgeschlagen.`;
      return failResult("absorb", def.name, failMsg, aggro);
    }
    instance.isAlive = false;
    instance.isAggro = false;
    instance.respawnAt = Date.now() + def.respawnTime * 1e3;
    player.totalAbsorbs += 1;
    gainCoreAbilityXp(player, "absorb", def.level);
    const skillResults = [];
    for (const drop of def.skillDrops) {
      if (Math.random() <= drop.chance) {
        skillResults.push(discoverSkill(player, drop.skillId, "absorb", def.level));
      }
    }
    const materialResults = [];
    for (const drop of def.materialDrops) {
      if (Math.random() <= drop.chance) {
        const amount = drop.amountMin + Math.floor(Math.random() * (drop.amountMax - drop.amountMin + 1));
        if (amount > 0) {
          addMaterial(player, drop.materialId, amount);
          materialResults.push({ materialId: drop.materialId, amount });
        }
      }
    }
    return {
      success: true,
      method: "absorb",
      entityName: def.name,
      skillResults,
      materialResults,
      aggroTriggered: false,
      message: `${def.icon} ${def.name} absorbiert!`
    };
  }
  function analyzeEntity(player, world, instanceId) {
    const instance = world.entities.get(instanceId);
    if (!instance?.isAlive) {
      return failResult("analyze", "?", "Entity nicht verf\xFCgbar.", false);
    }
    const def = ENTITY_MAP.get(instance.definitionId);
    if (!def) {
      return failResult("analyze", "?", "Unbekannte Entity.", false);
    }
    const analyzeLevel = player.coreAbilities.analyze.level;
    const chance = calcSuccessChance(analyzeLevel, def.level);
    if (Math.random() > chance) {
      player.totalAnalyzeFailures += 1;
      const aggro = shouldAggro(def.disposition, "analyze", def.category);
      if (aggro)
        instance.isAggro = true;
      const failMsg = aggro ? `${def.icon} ${def.name} f\xFChlt sich bedroht und greift an!` : `${def.icon} ${def.name}: Analyze fehlgeschlagen \u2014 zu weit entfernt auf der Macht-Skala.`;
      return failResult("analyze", def.name, failMsg, aggro);
    }
    player.totalAnalyzes += 1;
    gainCoreAbilityXp(player, "analyze", def.level);
    const skillResults = [];
    for (const drop of def.skillDrops) {
      const modifiedChance = drop.chance * ANALYZE_CHANCE_MODIFIER;
      if (Math.random() <= modifiedChance) {
        skillResults.push(discoverSkill(player, drop.skillId, "analyze", def.level));
      }
    }
    return {
      success: true,
      method: "analyze",
      entityName: def.name,
      skillResults,
      materialResults: [],
      // Analyze liefert keine Materialien
      aggroTriggered: false,
      message: `${def.icon} ${def.name} analysiert.`
    };
  }
  function processRespawns(world) {
    const respawned = [];
    const now = Date.now();
    for (const [id, instance] of world.entities) {
      if (!instance.isAlive && instance.respawnAt && now >= instance.respawnAt) {
        const def = ENTITY_MAP.get(instance.definitionId);
        if (def) {
          instance.isAlive = true;
          instance.isAggro = false;
          instance.respawnAt = void 0;
          instance.currentHp = def.hp ?? 0;
          instance.statusEffects = [];
          instance.attackCooldownRemaining = 0;
          respawned.push(id);
        }
      }
    }
    return respawned;
  }
  function findNearestEntity(player, world, maxRadius = 80) {
    let nearest = null;
    let nearestDist = maxRadius;
    for (const instance of world.entities.values()) {
      if (!instance.isAlive)
        continue;
      const dx = instance.x - player.x;
      const dy = instance.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = instance;
      }
    }
    return nearest;
  }
  function failResult(method, entityName, message, aggroTriggered) {
    return {
      success: false,
      method,
      entityName,
      skillResults: [],
      materialResults: [],
      aggroTriggered,
      message
    };
  }

  // dist/js/ui/Joystick.js
  var THUMB_RADIUS = 44;
  var STYLE_ID = "joystick-ui-styles";
  function injectStyles() {
    if (document.getElementById(STYLE_ID))
      return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = `
    #joystickZone {
      position: absolute;
      left: 18px;
      bottom: 18px;
      width: 136px;
      height: 136px;
      border-radius: 50%;
      pointer-events: all;
    }
    #joystickBase {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: rgba(74, 240, 200, 0.07);
      border: 2px solid rgba(74, 240, 200, 0.22);
    }
    #joystickThumb {
      position: absolute;
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 35%, #90ffcc, #40e890);
      border: 2px solid rgba(255, 255, 255, 0.25);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 14px rgba(64, 232, 144, 0.4);
      transition: box-shadow 0.1s;
    }
    #joystickZone:active #joystickThumb,
    #joystickZone.active #joystickThumb {
      box-shadow: 0 0 22px rgba(64, 232, 144, 0.7);
    }
  `;
    document.head.appendChild(el);
  }
  function buildElements(container) {
    const zone = document.createElement("div");
    zone.id = "joystickZone";
    const base = document.createElement("div");
    base.id = "joystickBase";
    const thumb = document.createElement("div");
    thumb.id = "joystickThumb";
    zone.appendChild(base);
    zone.appendChild(thumb);
    container.appendChild(zone);
    return { zone, thumb };
  }
  function attachTouchHandlers(zone, thumb, state) {
    const JR = THUMB_RADIUS;
    const applyTouch = (touch) => {
      const rawDx = touch.clientX - state._cx;
      const rawDy = touch.clientY - state._cy;
      const len = Math.hypot(rawDx, rawDy);
      const capped = Math.min(len, JR);
      const angle = Math.atan2(rawDy, rawDx);
      state.dx = Math.cos(angle) * capped / JR;
      state.dy = Math.sin(angle) * capped / JR;
      thumb.style.transform = `translate(
      calc(-50% + ${Math.cos(angle) * capped}px),
      calc(-50% + ${Math.sin(angle) * capped}px)
    )`;
    };
    const reset = () => {
      state.active = false;
      state._id = -1;
      state.dx = 0;
      state.dy = 0;
      thumb.style.transform = "translate(-50%, -50%)";
      zone.classList.remove("active");
    };
    zone.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (state.active)
        return;
      const t = e.changedTouches[0];
      const rect = zone.getBoundingClientRect();
      state.active = true;
      state._id = t.identifier;
      state._cx = rect.left + rect.width / 2;
      state._cy = rect.top + rect.height / 2;
      state.dx = 0;
      state.dy = 0;
      zone.classList.add("active");
      applyTouch(t);
    }, { passive: false });
    zone.addEventListener("touchmove", (e) => {
      e.preventDefault();
      if (!state.active)
        return;
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === state._id)
          applyTouch(t);
      }
    }, { passive: false });
    const onEnd = (e) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === state._id)
          reset();
      }
    };
    zone.addEventListener("touchend", onEnd, { passive: false });
    zone.addEventListener("touchcancel", onEnd, { passive: false });
  }
  function createJoystick(container) {
    injectStyles();
    const { zone, thumb } = buildElements(container);
    const state = {
      active: false,
      dx: 0,
      dy: 0,
      _id: -1,
      _cx: 0,
      _cy: 0
    };
    attachTouchHandlers(zone, thumb, state);
    return state;
  }

  // dist/js/ui/SkillBar.js
  var NUM_SLOTS = 4;
  var LONG_PRESS_MS = 600;
  function injectStyles2() {
    if (document.getElementById("skillbar-styles"))
      return;
    const s = document.createElement("style");
    s.id = "skillbar-styles";
    s.textContent = `
    #skillBar {
      display: flex;
      gap: 8px;
      pointer-events: auto;
    }
    .sk-slot {
      width: 52px; height: 52px;
      border-radius: 12px;
      background: rgba(0,0,0,0.65);
      border: 2px solid rgba(255,255,255,0.18);
      display: flex; align-items: center; justify-content: center;
      position: relative; overflow: hidden;
      cursor: pointer; user-select: none; -webkit-user-select: none;
      touch-action: none;
      transition: border-color .15s, background .15s;
    }
    .sk-slot.empty {
      border-style: dashed;
      opacity: 0.5;
    }
    .sk-slot:active { border-color: rgba(255,255,255,0.6); }
    .sk-slot-icon { font-size: 26px; line-height: 1; z-index: 1; pointer-events: none; }
    .sk-slot-cd {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.68);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: bold; color: #fff;
      z-index: 2; pointer-events: none;
    }
    .sk-slot-cd.hidden { display: none; }
  `;
    document.head.appendChild(s);
  }
  function createSkillBar(container, onOpenMenu) {
    injectStyles2();
    const slots = new Array(NUM_SLOTS).fill(null);
    const slotEls = [];
    const cdEls = [];
    const bar = document.createElement("div");
    bar.id = "skillBar";
    container.appendChild(bar);
    for (let i = 0; i < NUM_SLOTS; i++) {
      const slot = document.createElement("div");
      slot.className = "sk-slot empty";
      const icon = document.createElement("span");
      icon.className = "sk-slot-icon";
      icon.textContent = "+";
      const cd = document.createElement("div");
      cd.className = "sk-slot-cd hidden";
      slot.appendChild(icon);
      slot.appendChild(cd);
      bar.appendChild(slot);
      slotEls.push(slot);
      cdEls.push(cd);
      let pressTimer = null;
      let isLong = false;
      slot.addEventListener("pointerdown", () => {
        isLong = false;
        pressTimer = setTimeout(() => {
          isLong = true;
          onOpenMenu();
        }, LONG_PRESS_MS);
      });
      slot.addEventListener("pointerup", () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
        if (isLong)
          return;
        const skillId = slots[i];
        if (!skillId) {
          onOpenMenu();
          return;
        }
        const scene = window.gameScene;
        if (scene?.activateSkill)
          scene.activateSkill(skillId);
      });
      slot.addEventListener("pointercancel", () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      });
    }
    function update() {
      const gs = window.gameState;
      if (!gs)
        return;
      const player = gs.player;
      const now = Date.now();
      const allSkills = window.__ALL_SKILLS;
      for (let i = 0; i < NUM_SLOTS; i++) {
        const skillId = slots[i];
        const iconEl = slotEls[i].querySelector(".sk-slot-icon");
        const cdEl = cdEls[i];
        if (!skillId) {
          slotEls[i].className = "sk-slot empty";
          iconEl.textContent = "+";
          cdEl.className = "sk-slot-cd hidden";
          continue;
        }
        const hasSkill = player.discoveredSkills?.has(skillId);
        if (!hasSkill) {
          slotEls[i].className = "sk-slot empty";
          iconEl.textContent = "?";
          cdEl.className = "sk-slot-cd hidden";
          continue;
        }
        const def = allSkills?.get(skillId);
        iconEl.textContent = def?.icon ?? "\u26A1";
        slotEls[i].className = "sk-slot";
        const expiresAt = player.skillCooldowns?.get(skillId) ?? 0;
        const remaining = expiresAt - now;
        if (remaining > 50) {
          cdEl.className = "sk-slot-cd";
          cdEl.textContent = (remaining / 1e3).toFixed(1) + "s";
        } else {
          cdEl.className = "sk-slot-cd hidden";
        }
      }
    }
    const interval = setInterval(update, 150);
    return {
      slots,
      assignSlot(index, skillId) {
        if (index < 0 || index >= NUM_SLOTS)
          return;
        slots[index] = skillId;
        update();
      },
      update,
      destroy() {
        clearInterval(interval);
        bar.remove();
      }
    };
  }

  // dist/js/ui/SkillMenu.js
  function injectStyles3() {
    if (document.getElementById("skillmenu-styles"))
      return;
    const s = document.createElement("style");
    s.id = "skillmenu-styles";
    s.textContent = `
    #skillMenu {
      position: fixed; inset: 0;
      background: rgba(5,8,16,0.92);
      z-index: 200;
      display: flex; flex-direction: column; align-items: center;
      padding: 16px 12px; overflow-y: auto;
    }
    #skillMenu.hidden { display: none; }
    #smenu-header {
      display: flex; width: 100%; max-width: 480px;
      justify-content: space-between; align-items: center;
      margin-bottom: 14px;
    }
    #smenu-title { color: #eee; font-size: 1.05em; font-weight: bold; }
    #smenu-close {
      background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
      color: #ccc; font-size: .85em; padding: 6px 16px;
      border-radius: 8px; cursor: pointer;
    }
    #smenu-grid {
      display: grid; grid-template-columns: repeat(2, 1fr);
      gap: 10px; width: 100%; max-width: 480px;
    }
    .smenu-card {
      background: rgba(255,255,255,0.06); border-radius: 12px;
      padding: 10px; display: flex; flex-direction: column; gap: 6px;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .smenu-card-top {
      display: flex; align-items: center; gap: 8px;
    }
    .smenu-card-icon { font-size: 22px; }
    .smenu-card-name { font-size: .82em; color: #eee; font-weight: bold; flex: 1; }
    .smenu-card-lv { font-size: .72em; color: #888; white-space: nowrap; }
    .smenu-card-desc { font-size: .68em; color: #777; line-height: 1.35; }
    .smenu-passive-badge {
      font-size: .62em; background: rgba(74,240,200,0.18);
      color: #4af0c8; border-radius: 4px; padding: 2px 5px;
    }
    .smenu-slots {
      display: flex; gap: 5px; flex-wrap: wrap; margin-top: 2px;
    }
    .smenu-slot-btn {
      font-size: .68em; padding: 3px 9px; border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.08); color: #bbb; cursor: pointer;
    }
    .smenu-slot-btn.assigned {
      background: rgba(74,240,200,0.2); border-color: #4af0c8; color: #4af0c8;
    }
    .smenu-use-btn {
      font-size: .73em; padding: 4px 10px; border-radius: 6px; border: none;
      background: rgba(255,200,50,0.2); color: #ffc832; cursor: pointer; margin-top: 2px;
    }
    .smenu-use-btn:active { background: rgba(255,200,50,0.4); }
  `;
    document.head.appendChild(s);
  }
  function createSkillMenu(skillBar) {
    injectStyles3();
    const overlay = document.createElement("div");
    overlay.id = "skillMenu";
    overlay.classList.add("hidden");
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay)
        close();
    });
    function render() {
      const gs = window.gameState;
      if (!gs)
        return;
      const player = gs.player;
      const allSkills = window.__ALL_SKILLS ?? /* @__PURE__ */ new Map();
      const skills = [...player.discoveredSkills.entries()].map(([id, inst]) => ({ id, inst, def: allSkills.get(id) })).filter((s) => !!s.def);
      overlay.innerHTML = `
      <div id="smenu-header">
        <span id="smenu-title">\u2694\uFE0F Skills (${skills.length})</span>
        <button id="smenu-close">\u2715 Schlie\xDFen</button>
      </div>
      <div id="smenu-grid">
        ${skills.map(({ id, inst, def }) => {
        const isPassive = def.activation === "passive";
        const slotButtons = !isPassive ? [0, 1, 2, 3].map((i) => {
          const assigned = skillBar.slots[i] === id;
          return `<button class="smenu-slot-btn${assigned ? " assigned" : ""}"
                      data-skill="${id}" data-slot="${i}">S${i + 1}</button>`;
        }).join("") : "";
        const useButton = !isPassive ? `<button class="smenu-use-btn" data-use="${id}">\u25B6 Einsetzen</button>` : "";
        return `
              <div class="smenu-card">
                <div class="smenu-card-top">
                  <span class="smenu-card-icon">${def.icon}</span>
                  <span class="smenu-card-name">${def.name}</span>
                  <span class="smenu-card-lv">Lv.${inst.level}</span>
                  ${isPassive ? '<span class="smenu-passive-badge">PASSIV</span>' : ""}
                </div>
                <div class="smenu-card-desc">${def.description ?? ""}</div>
                ${slotButtons ? `<div class="smenu-slots">${slotButtons}</div>` : ""}
                ${useButton}
              </div>
            `;
      }).join("")}
      </div>
    `;
      overlay.querySelector("#smenu-close")?.addEventListener("click", () => close());
      overlay.querySelectorAll(".smenu-slot-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const skillId = btn.dataset.skill;
          const slotIdx = parseInt(btn.dataset.slot, 10);
          if (skillBar.slots[slotIdx] === skillId) {
            skillBar.assignSlot(slotIdx, null);
          } else {
            const oldSlot = skillBar.slots.indexOf(skillId);
            if (oldSlot >= 0)
              skillBar.assignSlot(oldSlot, null);
            skillBar.assignSlot(slotIdx, skillId);
          }
          render();
        });
      });
      overlay.querySelectorAll(".smenu-use-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const skillId = btn.dataset.use;
          close();
          const scene = window.gameScene;
          if (scene?.activateSkill)
            scene.activateSkill(skillId);
        });
      });
    }
    function open() {
      render();
      overlay.classList.remove("hidden");
      const scene = window.gameScene;
      if (scene?.pauseForUI)
        scene.pauseForUI();
    }
    function close() {
      overlay.classList.add("hidden");
      const scene = window.gameScene;
      if (scene?.resumeForUI)
        scene.resumeForUI();
    }
    return { open, close };
  }

  // dist/js/systems/SaveSystem.js
  var NUM_SAVE_SLOTS = 3;
  var SAVE_PREFIX = "accognita_save_";
  var SAVE_VERSION = 1;
  function serializePlayer(player, skillBarSlots) {
    return {
      x: player.x,
      y: player.y,
      hp: player.hp,
      maxHp: player.maxHp,
      mp: player.mp,
      maxMp: player.maxMp,
      level: player.level,
      totalExp: player.totalExp,
      spawnX: player.spawnX,
      spawnY: player.spawnY,
      coreAbilities: player.coreAbilities,
      discoveredSkills: [...player.discoveredSkills.entries()],
      materials: [...player.materials.entries()],
      activeSkillSlots: skillBarSlots ?? player.activeSkillSlots,
      totalAbsorbs: player.totalAbsorbs,
      totalAbsorbFailures: player.totalAbsorbFailures,
      totalAnalyzes: player.totalAnalyzes,
      totalAnalyzeFailures: player.totalAnalyzeFailures,
      playtimeSeconds: player.playtimeSeconds
    };
  }
  function deserializePlayer(data) {
    return {
      x: data.x,
      y: data.y,
      hp: data.hp,
      maxHp: data.maxHp,
      mp: data.mp,
      maxMp: data.maxMp,
      level: data.level,
      totalExp: data.totalExp,
      spawnX: data.spawnX ?? 400,
      spawnY: data.spawnY ?? 300,
      coreAbilities: data.coreAbilities,
      discoveredSkills: new Map(data.discoveredSkills.map(([id, inst]) => [id, { ...inst, isEnabled: inst.isEnabled ?? true }])),
      materials: new Map(data.materials),
      activeSkillSlots: data.activeSkillSlots ?? [null, null, null, null, null],
      // Cooldowns: nach Reload sinnlos — frisch starten
      skillCooldowns: /* @__PURE__ */ new Map(),
      // StatusEffects: werden durch syncPassiveEffects() neu aufgebaut
      statusEffects: [],
      totalAbsorbs: data.totalAbsorbs ?? 0,
      totalAbsorbFailures: data.totalAbsorbFailures ?? 0,
      totalAnalyzes: data.totalAnalyzes ?? 0,
      totalAnalyzeFailures: data.totalAnalyzeFailures ?? 0,
      playtimeSeconds: data.playtimeSeconds ?? 0
    };
  }
  function slotKey(slot) {
    return `${SAVE_PREFIX}${slot}`;
  }
  function saveToSlot(slot, player, skillBarSlots) {
    if (slot < 0 || slot >= NUM_SAVE_SLOTS)
      throw new Error(`Ung\xFCltiger Slot: ${slot}`);
    const slots = skillBarSlots ?? player.activeSkillSlots;
    const meta = {
      slot,
      version: SAVE_VERSION,
      savedAt: Date.now(),
      playerLevel: player.level,
      hp: player.hp,
      maxHp: player.maxHp,
      skillCount: player.discoveredSkills.size,
      playtimeSeconds: player.playtimeSeconds,
      skillBarSlots: slots
    };
    const data = {
      meta,
      player: serializePlayer(player, slots)
    };
    localStorage.setItem(slotKey(slot), JSON.stringify(data));
    return meta;
  }
  function loadFromSlot(slot) {
    if (slot < 0 || slot >= NUM_SAVE_SLOTS)
      return null;
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw)
      return null;
    try {
      const data = JSON.parse(raw);
      if (!data.meta || !data.player)
        return null;
      const player = deserializePlayer(data.player);
      return { player, meta: data.meta };
    } catch {
      return null;
    }
  }
  function getSlotMeta(slot) {
    if (slot < 0 || slot >= NUM_SAVE_SLOTS)
      return null;
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw)
      return null;
    try {
      const data = JSON.parse(raw);
      return data.meta ?? null;
    } catch {
      return null;
    }
  }
  function getAllSlotMetas() {
    return Array.from({ length: NUM_SAVE_SLOTS }, (_, i) => getSlotMeta(i));
  }
  function deleteSlot(slot) {
    localStorage.removeItem(slotKey(slot));
  }
  function deleteAllSaves() {
    for (let i = 0; i < NUM_SAVE_SLOTS; i++) {
      localStorage.removeItem(slotKey(i));
    }
  }
  function formatPlaytime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0)
      return `${h}h ${m}m`;
    if (m > 0)
      return `${m}m ${s}s`;
    return `${s}s`;
  }

  // dist/js/ui/SaveMenu.js
  function injectStyles4() {
    if (document.getElementById("savemenu-styles"))
      return;
    const s = document.createElement("style");
    s.id = "savemenu-styles";
    s.textContent = `
    #saveMenu {
      position: fixed; inset: 0;
      background: rgba(5,8,16,0.94);
      z-index: 210;
      display: flex; flex-direction: column; align-items: center;
      padding: 16px 12px 24px; overflow-y: auto;
    }
    #saveMenu.hidden { display: none; }
    #smv-header {
      display: flex; width: 100%; max-width: 420px;
      justify-content: space-between; align-items: center;
      margin-bottom: 16px;
    }
    #smv-title { color: #eee; font-size: 1.05em; font-weight: bold; }
    #smv-close {
      background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.18);
      color: #ccc; font-size: .85em; padding: 6px 16px;
      border-radius: 8px; cursor: pointer;
    }
    .smv-slot {
      width: 100%; max-width: 420px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 14px; padding: 14px;
      margin-bottom: 10px; display: flex;
      flex-direction: column; gap: 8px;
    }
    .smv-slot-header {
      display: flex; align-items: center; gap: 10px;
    }
    .smv-slot-num {
      font-size: .72em; color: #888;
      background: rgba(255,255,255,0.08);
      border-radius: 5px; padding: 2px 8px;
      white-space: nowrap;
    }
    .smv-slot-info { flex: 1; }
    .smv-slot-title {
      font-size: .88em; color: #ddd; font-weight: bold;
    }
    .smv-slot-detail {
      font-size: .72em; color: #777; margin-top: 2px;
    }
    .smv-slot-empty { font-size: .85em; color: #555; font-style: italic; }
    .smv-slot-actions {
      display: flex; gap: 7px; flex-wrap: wrap;
    }
    .smv-btn {
      flex: 1; min-width: 70px;
      font-size: .76em; padding: 7px 8px; border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.18);
      background: rgba(255,255,255,0.08); color: #ccc; cursor: pointer;
      text-align: center;
    }
    .smv-btn:active { background: rgba(255,255,255,0.18); }
    .smv-btn.primary {
      background: rgba(74,240,200,0.18); border-color: #4af0c8; color: #4af0c8;
    }
    .smv-btn.danger {
      background: rgba(255,60,80,0.12); border-color: rgba(255,60,80,0.4); color: #ff6070;
    }
    #smv-reset-wrap {
      width: 100%; max-width: 420px;
      margin-top: 12px; padding-top: 12px;
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    #smv-reset-btn {
      width: 100%; padding: 11px;
      background: rgba(255,60,80,0.10); border: 1px solid rgba(255,60,80,0.3);
      color: #ff6070; border-radius: 10px; cursor: pointer;
      font-size: .85em;
    }
    #smv-reset-btn:active { background: rgba(255,60,80,0.25); }
    #smv-confirm {
      width: 100%; max-width: 420px;
      margin-top: 8px; padding: 12px;
      background: rgba(255,60,80,0.18); border: 1px solid rgba(255,60,80,0.5);
      border-radius: 10px; display: none; flex-direction: column; gap: 10px;
      text-align: center;
    }
    #smv-confirm.visible { display: flex; }
    #smv-confirm-text { font-size: .82em; color: #fca; }
    .smv-confirm-btns { display: flex; gap: 8px; }
    .smv-confirm-btns button {
      flex: 1; padding: 8px; border-radius: 8px; cursor: pointer; font-size: .8em;
    }
    #smv-confirm-yes {
      background: rgba(255,60,80,0.3); border: 1px solid rgba(255,60,80,0.6); color: #ff6070;
    }
    #smv-confirm-no {
      background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18); color: #aaa;
    }
  `;
    document.head.appendChild(s);
  }
  function formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
  function createSaveMenu() {
    injectStyles4();
    const overlay = document.createElement("div");
    overlay.id = "saveMenu";
    overlay.classList.add("hidden");
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay)
        close();
    });
    function render() {
      const metas = getAllSlotMetas();
      const slotHtml = metas.map((meta, i) => {
        if (!meta) {
          return `
          <div class="smv-slot">
            <div class="smv-slot-header">
              <span class="smv-slot-num">Slot ${i + 1}</span>
              <span class="smv-slot-empty">\u2014 leer \u2014</span>
            </div>
            <div class="smv-slot-actions">
              <button class="smv-btn primary" data-action="save" data-slot="${i}">\u{1F4BE} Speichern</button>
            </div>
          </div>`;
        }
        const date = formatDate(meta.savedAt);
        const time = formatPlaytime(meta.playtimeSeconds);
        const hpPct = Math.round(meta.hp / meta.maxHp * 100);
        return `
        <div class="smv-slot">
          <div class="smv-slot-header">
            <span class="smv-slot-num">Slot ${i + 1}</span>
            <div class="smv-slot-info">
              <div class="smv-slot-title">Lv.${meta.playerLevel} \xB7 ${meta.skillCount} Skills \xB7 HP ${hpPct}%</div>
              <div class="smv-slot-detail">${date} \xB7 ${time} gespielt</div>
            </div>
          </div>
          <div class="smv-slot-actions">
            <button class="smv-btn primary" data-action="load" data-slot="${i}">\u25B6 Laden</button>
            <button class="smv-btn" data-action="save" data-slot="${i}">\u{1F4BE} \xDCberschreiben</button>
            <button class="smv-btn danger" data-action="delete" data-slot="${i}">\u{1F5D1} L\xF6schen</button>
          </div>
        </div>`;
      }).join("");
      overlay.innerHTML = `
      <div id="smv-header">
        <span id="smv-title">\u{1F4BE} Spielstand</span>
        <button id="smv-close">\u2715 Zur\xFCck</button>
      </div>
      ${slotHtml}
      <div id="smv-reset-wrap">
        <button id="smv-reset-btn">\u{1F504} Neues Spiel (alles zur\xFCcksetzen)</button>
      </div>
      <div id="smv-confirm">
        <div id="smv-confirm-text">Wirklich neues Spiel starten?<br>Alle Fortschritte gehen verloren!</div>
        <div class="smv-confirm-btns">
          <button id="smv-confirm-yes">\u2714 Ja, neu starten</button>
          <button id="smv-confirm-no">\u2718 Abbrechen</button>
        </div>
      </div>
    `;
      overlay.querySelector("#smv-close")?.addEventListener("click", () => close());
      overlay.querySelectorAll("[data-action]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const action = btn.dataset.action;
          const slot = parseInt(btn.dataset.slot, 10);
          const scene = window.gameScene;
          if (action === "save") {
            if (scene?.saveGame)
              scene.saveGame(slot);
            render();
          } else if (action === "load") {
            if (scene?.loadGame) {
              scene.loadGame(slot);
              close();
            }
          } else if (action === "delete") {
            deleteSlot(slot);
            render();
          }
        });
      });
      overlay.querySelector("#smv-reset-btn")?.addEventListener("click", () => {
        const confirm = overlay.querySelector("#smv-confirm");
        if (confirm)
          confirm.classList.add("visible");
      });
      overlay.querySelector("#smv-confirm-yes")?.addEventListener("click", () => {
        const scene = window.gameScene;
        if (scene?.resetGame)
          scene.resetGame();
      });
      overlay.querySelector("#smv-confirm-no")?.addEventListener("click", () => {
        const confirm = overlay.querySelector("#smv-confirm");
        if (confirm)
          confirm.classList.remove("visible");
      });
    }
    function open() {
      render();
      overlay.classList.remove("hidden");
      const scene = window.gameScene;
      if (scene?.pauseForUI)
        scene.pauseForUI();
    }
    function close() {
      overlay.classList.add("hidden");
      const scene = window.gameScene;
      if (scene?.resumeForUI)
        scene.resumeForUI();
    }
    return { open, close };
  }

  // dist/js/systems/AiSystem.js
  var MAX_AI_DIST_SQ = 500 * 500;
  var AGGRO_LOSS_FACTOR = 2.5;
  var AI_TICK_MS = 100;
  var CHASE_STOP_FACTOR = 0.5;
  var TILE_PX = 32;
  var WANDER_RADIUS_PX = 10 * TILE_PX;
  var WANDER_SPEED_FACTOR = 0.45;
  var WANDER_PAUSE_MIN = 1500;
  var WANDER_PAUSE_MAX = 4e3;
  var WANDER_ARRIVE_SQ = 10 * 10;
  function calcEntityAi(def, instance, playerX, playerY, now) {
    if (!def.damage || def.behavior === "passive") {
      return idleFrame();
    }
    const dxRaw = playerX - instance.x;
    const dyRaw = playerY - instance.y;
    const distSq = dxRaw * dxRaw + dyRaw * dyRaw;
    if (distSq > MAX_AI_DIST_SQ) {
      if (instance.isAggro) {
        return { ...idleFrame(), lostAggro: true };
      }
      return idleFrame();
    }
    const lastCalc = instance._aiLastCalcAt ?? 0;
    if (now - lastCalc < AI_TICK_MS) {
      return {
        vx: instance._aiLastVx ?? 0,
        vy: instance._aiLastVy ?? 0,
        wantToAttack: false,
        becameAggro: false,
        lostAggro: false
      };
    }
    instance._aiLastCalcAt = now;
    const dist = Math.sqrt(distSq);
    const aggroRadius = def.aggroRadius ?? (def.worldSize ?? 6) * 5;
    const aggroLossRadius = aggroRadius * AGGRO_LOSS_FACTOR;
    let becameAggro = false;
    let lostAggro = false;
    if (!instance.isAggro) {
      if (dist <= aggroRadius && shouldAggro2(def)) {
        instance.isAggro = true;
        becameAggro = true;
      }
    } else {
      if (dist > aggroLossRadius) {
        instance.isAggro = false;
        lostAggro = true;
      }
    }
    let vx = 0;
    let vy = 0;
    if (instance.isAggro && instance.isAlive) {
      const speed = def.speed ?? 60;
      const stopDist = (def.attackRangePx ?? 60) * CHASE_STOP_FACTOR;
      if (distSq > stopDist * stopDist) {
        vx = dxRaw / dist * speed;
        vy = dyRaw / dist * speed;
      }
      instance._wanderTargetX = void 0;
      instance._wanderTargetY = void 0;
      if (lostAggro) {
        instance._wanderPauseUntil = now + 1500;
      }
    } else if (instance.isAlive) {
      const w = calcWander(def, instance, now);
      vx = w.vx;
      vy = w.vy;
    }
    instance._aiLastVx = vx;
    instance._aiLastVy = vy;
    const attackRange = def.attackRangePx ?? 60;
    const inRange = dist <= attackRange;
    const cooldownDone = instance.attackCooldownRemaining <= 0;
    const wantToAttack = instance.isAggro && inRange && cooldownDone;
    return { vx, vy, wantToAttack, becameAggro, lostAggro };
  }
  function tickAttackCooldown(instance, deltaMs) {
    if (instance.attackCooldownRemaining > 0) {
      instance.attackCooldownRemaining = Math.max(0, instance.attackCooldownRemaining - deltaMs);
    }
  }
  function setAttackCooldown(instance, def) {
    instance.attackCooldownRemaining = def.attackCooldownMs ?? 1500;
  }
  function resetAi(instance) {
    instance.isAggro = false;
    instance.attackCooldownRemaining = 0;
    delete instance._aiLastCalcAt;
    delete instance._aiLastVx;
    delete instance._aiLastVy;
    delete instance._wanderTargetX;
    delete instance._wanderTargetY;
    delete instance._wanderPauseUntil;
  }
  function idleFrame() {
    return { vx: 0, vy: 0, wantToAttack: false, becameAggro: false, lostAggro: false };
  }
  function calcWander(def, instance, now) {
    const inst = instance;
    if (inst._spawnX === void 0) {
      inst._spawnX = instance.x;
      inst._spawnY = instance.y;
    }
    if (now < (inst._wanderPauseUntil ?? 0)) {
      return idleFrame();
    }
    if (inst._wanderTargetX === void 0) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * WANDER_RADIUS_PX;
      inst._wanderTargetX = inst._spawnX + Math.cos(angle) * r;
      inst._wanderTargetY = inst._spawnY + Math.sin(angle) * r;
    }
    const dtx = inst._wanderTargetX - instance.x;
    const dty = inst._wanderTargetY - instance.y;
    const dtSq = dtx * dtx + dty * dty;
    if (dtSq < WANDER_ARRIVE_SQ) {
      inst._wanderTargetX = void 0;
      inst._wanderTargetY = void 0;
      inst._wanderPauseUntil = now + WANDER_PAUSE_MIN + Math.random() * (WANDER_PAUSE_MAX - WANDER_PAUSE_MIN);
      return idleFrame();
    }
    const dt = Math.sqrt(dtSq);
    const speed = (def.speed ?? 60) * WANDER_SPEED_FACTOR;
    return {
      vx: dtx / dt * speed,
      vy: dty / dt * speed,
      wantToAttack: false,
      becameAggro: false,
      lostAggro: false
    };
  }
  function shouldAggro2(def) {
    return def.behavior === "aggressive" || def.behavior === "territorial";
  }

  // dist/js/systems/SkillEffects.js
  function calcChitinDr(level) {
    return Math.min(0.1 + (level - 1) * 0.05, 0.7);
  }
  function calcVenomChance(level) {
    return 0.3 + (level - 1) * 0.05;
  }
  function calcVenomDmgPerTick(level) {
    return 2 + Math.floor((level - 1) * 0.5);
  }
  function calcBiteDamage(level) {
    const baseDamage = ALL_SKILLS.get("bite")?.baseDamage ?? 7;
    return Math.max(1, Math.round(baseDamage * getSkillEffectiveness(level)));
  }
  var JUMP_BASE_PX = 160;
  var JUMP_BONUS_PER_LEVEL = 20;
  function calcJumpDistance(level) {
    return JUMP_BASE_PX + (level - 1) * JUMP_BONUS_PER_LEVEL;
  }
  function calcHemolymphReflect(level) {
    return 2 * level;
  }
  function calcSuperstrengthMult(level) {
    return 1 + 0.3 * getSkillEffectiveness(level);
  }
  function calcPhotosynthesisHeal(level) {
    return 0.5 * level;
  }

  // dist/js/systems/EntityLevelingSystem.js
  var MAX_BONUS_LEVEL = 3;
  var SKILL_WINS_PER_LVL = 3;
  var HUNT_RADIUS_PX = 300;
  var STAT_SCALE = 1.25;
  function getEffectiveLevel(def, instance) {
    return def.level + (instance.bonusLevel ?? 0);
  }
  function getScaledMaxHp(def, bonusLevel) {
    return Math.round((def.hp ?? 1) * Math.pow(STAT_SCALE, bonusLevel));
  }
  function getEntityBaseDamage(def) {
    const biteLevel = def.skillLevels?.["bite"];
    if (biteLevel !== void 0) {
      return calcBiteDamage(biteLevel);
    }
    return def.damage ?? 1;
  }
  function getScaledDamage(def, bonusLevel) {
    return Math.max(1, Math.round(getEntityBaseDamage(def) * Math.pow(STAT_SCALE, bonusLevel)));
  }
  function getScaledSpeed(def, bonusLevel) {
    return Math.round((def.speed ?? 60) * Math.pow(STAT_SCALE, bonusLevel));
  }
  function findLevelingPrey(hunter, hunterDef, allEntities, entityMap) {
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
  function processEntityVictory(winner, winnerDef) {
    const currentBonus = winner.bonusLevel ?? 0;
    if (currentBonus >= MAX_BONUS_LEVEL) {
      return { skillLeveledUp: false, entityLeveledUp: false };
    }
    winner.skillWins = (winner.skillWins ?? 0) + 1;
    if ((winner.skillWins ?? 0) >= SKILL_WINS_PER_LVL) {
      winner.skillWins = 0;
      winner.bonusLevel = currentBonus + 1;
      winner.currentHp = getScaledMaxHp(winnerDef, winner.bonusLevel);
      return { skillLeveledUp: true, entityLeveledUp: true };
    }
    return { skillLeveledUp: true, entityLeveledUp: false };
  }

  // dist/js/types/Combat.js
  function makeStatusEffect(base) {
    return {
      sourceSkillId: void 0,
      durationMs: -1,
      expiresAt: Infinity,
      tickIntervalMs: 0,
      lastTickAt: 0,
      damagePerTick: 0,
      healPerTick: 0,
      speedMultiplier: 1,
      damageReduction: 0,
      reflectDamage: 0,
      damageBonus: 0,
      damageMult: 1,
      ...base
    };
  }

  // dist/js/systems/StatusEffectSystem.js
  var MAX_EFFECTS = 8;
  function processTicks(target, now) {
    let hpDelta = 0;
    for (const effect of target.statusEffects) {
      if (effect.tickIntervalMs <= 0)
        continue;
      if (now - effect.lastTickAt < effect.tickIntervalMs)
        continue;
      effect.lastTickAt = now;
      if (effect.type === "dot") {
        hpDelta -= effect.damagePerTick;
      }
      if (effect.type === "hot") {
        const headroom = target.maxHp - target.hp;
        hpDelta += Math.min(effect.healPerTick, headroom);
      }
    }
    return hpDelta;
  }
  function triggerAuras(target) {
    let reflectDmg = 0;
    for (const effect of target.statusEffects) {
      if (effect.type === "aura") {
        reflectDmg += effect.reflectDamage;
      }
    }
    return reflectDmg;
  }
  function applyEffect(target, effect) {
    const existing = target.statusEffects.find((e) => e.sourceSkillId === effect.sourceSkillId && e.type === effect.type);
    if (existing) {
      existing.expiresAt = effect.expiresAt;
      existing.lastTickAt = effect.lastTickAt;
      existing.damagePerTick = effect.damagePerTick;
      existing.healPerTick = effect.healPerTick;
      return;
    }
    if (target.statusEffects.length >= MAX_EFFECTS) {
      const removableIdx = target.statusEffects.findIndex((e) => e.expiresAt !== Infinity);
      if (removableIdx !== -1) {
        target.statusEffects.splice(removableIdx, 1);
      } else {
        return;
      }
    }
    target.statusEffects.push(effect);
  }
  function removeExpiredEffects(target, now) {
    target.statusEffects = target.statusEffects.filter((e) => e.expiresAt === Infinity || e.expiresAt > now);
  }
  function syncPassiveEffects(player) {
    const now = Date.now();
    for (const [skillId, instance] of player.discoveredSkills) {
      const def = ALL_SKILLS.get(skillId);
      if (!def || def.activation !== "passive")
        continue;
      if (instance.isEnabled === false)
        continue;
      switch (skillId) {
        case "chitin_armor": {
          applyEffect(player, makeStatusEffect({
            id: `passive_${skillId}`,
            type: "stat_mod",
            sourceSkillId: skillId,
            damageReduction: calcChitinDr(instance.level)
          }));
          break;
        }
        case "superstrength": {
          applyEffect(player, makeStatusEffect({
            id: `passive_${skillId}`,
            type: "stat_mod",
            sourceSkillId: skillId,
            damageMult: calcSuperstrengthMult(instance.level)
          }));
          break;
        }
        case "hemolymph": {
          applyEffect(player, makeStatusEffect({
            id: `passive_${skillId}`,
            type: "aura",
            sourceSkillId: skillId,
            reflectDamage: calcHemolymphReflect(instance.level)
          }));
          break;
        }
        case "photosynthesis": {
          applyEffect(player, makeStatusEffect({
            id: `passive_${skillId}`,
            type: "hot",
            sourceSkillId: skillId,
            tickIntervalMs: 1e3,
            healPerTick: calcPhotosynthesisHeal(instance.level),
            lastTickAt: now
          }));
          break;
        }
      }
    }
    player.statusEffects = player.statusEffects.filter((e) => {
      if (!e.sourceSkillId)
        return true;
      if (!e.id.startsWith("passive_"))
        return true;
      const skillId = e.sourceSkillId;
      const def = ALL_SKILLS.get(skillId);
      const inst = player.discoveredSkills.get(skillId);
      return player.discoveredSkills.has(skillId) && def?.activation === "passive" && inst?.isEnabled !== false;
    });
  }
  function calcDamageReduction(effects) {
    let reduction = 0;
    for (const e of effects) {
      if (e.type === "stat_mod")
        reduction += e.damageReduction;
    }
    return Math.min(reduction, 0.85);
  }
  function calcDamageMult(effects) {
    let mult = 1;
    for (const e of effects) {
      if (e.type === "stat_mod")
        mult *= e.damageMult;
    }
    return mult;
  }
  function makeVenomEffect(venomLevel, damageOverride) {
    const now = Date.now();
    const durationMs = 4e3;
    return makeStatusEffect({
      id: `venom_dot_${now}`,
      type: "dot",
      sourceSkillId: "venom",
      durationMs,
      expiresAt: now + durationMs,
      tickIntervalMs: 1e3,
      lastTickAt: now,
      damagePerTick: damageOverride ?? calcVenomDmgPerTick(venomLevel)
    });
  }

  // dist/js/systems/CombatSystem.js
  var BASE_MELEE_DAMAGE = 3;
  var MELEE_ABSORB_SCALE = 1.5;
  function playerAttack(player, targetInst, skillId) {
    const def = ENTITY_MAP.get(targetInst.definitionId);
    if (!def) {
      return missResult("Unbekannte Entity.");
    }
    if (skillId) {
      const skillDef = ALL_SKILLS.get(skillId);
      if (skillDef?.attackType === "dash") {
        return dashResult(player, skillId);
      }
    }
    let baseDmg;
    const appliedEffects = [];
    if (!skillId) {
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
    const damageMult = calcDamageMult(player.statusEffects);
    let dmg = Math.max(1, Math.round(baseDmg * damageMult));
    const targetChitinLv = def.skillLevels?.["chitin_armor"] ?? 0;
    const targetDR = targetChitinLv > 0 ? calcChitinDr(targetChitinLv) : def.damageReduction ?? 0;
    if (targetDR > 0) {
      dmg = Math.max(1, Math.round(dmg * (1 - targetDR)));
    }
    const venomInst = player.discoveredSkills.get("venom");
    if (venomInst) {
      if (Math.random() < calcVenomChance(venomInst.level)) {
        appliedEffects.push(makeVenomEffect(venomInst.level));
      }
    }
    const msg = appliedEffects.length > 0 ? `${def.icon} ${def.name}: ${dmg} Schaden + vergiftet!` : `${def.icon} ${def.name}: ${dmg} Schaden.`;
    return {
      hit: true,
      damageDealt: dmg,
      statusApplied: appliedEffects,
      message: msg
    };
  }
  function entityAttack(def, instance, player) {
    if (!instance.isAlive || !instance.isAggro) {
      return missResult("Entity greift nicht an.");
    }
    const baseDmg = getEntityBaseDamage(def);
    const reduction = calcDamageReduction(player.statusEffects);
    const dmg = Math.max(1, Math.round(baseDmg * (1 - reduction)));
    const appliedEffects = [];
    const venomLv = def.skillLevels?.["venom"] ?? 0;
    const venomChance = venomLv > 0 ? calcVenomChance(venomLv) : def.venomChance ?? 0;
    if (venomChance > 0 && Math.random() < venomChance) {
      const venomDmg = venomLv > 0 ? calcVenomDmgPerTick(venomLv) : def.venomDamagePerTick ?? 2;
      appliedEffects.push(makeVenomEffect(1, venomDmg));
    }
    const msg = dmg !== baseDmg ? `${def.icon} ${def.name} trifft! ${baseDmg}\u2192${dmg} (R\xFCstung).` : `${def.icon} ${def.name} trifft f\xFCr ${dmg} Schaden!`;
    return {
      hit: true,
      damageDealt: dmg,
      statusApplied: appliedEffects,
      message: msg
    };
  }
  function canActivateSkill(player, skillId) {
    const def = ALL_SKILLS.get(skillId);
    if (!def)
      return { ok: false, reason: "Unbekannter Skill." };
    const inst = player.discoveredSkills.get(skillId);
    if (!inst)
      return { ok: false, reason: "Skill nicht entdeckt." };
    if (def.activation === "passive") {
      return { ok: false, reason: "Passiv-Skills k\xF6nnen nicht manuell aktiviert werden." };
    }
    const mpCost = def.mpCost ?? 0;
    if (player.mp < mpCost) {
      return { ok: false, reason: `Nicht genug MP (${mpCost} ben\xF6tigt, ${Math.floor(player.mp)} vorhanden).` };
    }
    const now = Date.now();
    const cooldownExpiry = player.skillCooldowns.get(skillId) ?? 0;
    if (now < cooldownExpiry) {
      const remaining = Math.ceil((cooldownExpiry - now) / 1e3);
      return { ok: false, reason: `Cooldown: noch ${remaining}s.` };
    }
    return { ok: true };
  }
  function consumeSkill(player, skillId) {
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
  function calcDashDistance(player, skillId) {
    const inst = player.discoveredSkills.get(skillId);
    return calcJumpDistance(inst?.level ?? 1);
  }
  function executeCheckpoint(player) {
    player.hp = player.maxHp;
    player.mp = player.maxMp;
    player.x = player.spawnX;
    player.y = player.spawnY;
    player.statusEffects = player.statusEffects.filter((e) => e.expiresAt === Infinity);
  }
  function regenMp(player, deltaMs) {
    if (player.mp < player.maxMp) {
      player.mp = Math.min(player.maxMp, player.mp + deltaMs / 1e3);
    }
  }
  function missResult(reason) {
    return { hit: false, damageDealt: 0, statusApplied: [], message: reason };
  }
  function dashResult(player, skillId) {
    const dist = calcDashDistance(player, skillId);
    return {
      hit: false,
      damageDealt: 0,
      statusApplied: [],
      message: `Dash! (${dist}px)`
    };
  }

  // dist/js/world/TilesetGenerator.js
  var TILE_SIZE = 32;
  var TILE_COUNT = 24;
  var BIOME_TILE_OFFSET = {
    forest: 0,
    swamp: 4,
    highland: 8,
    mountain: 12,
    desert: 16,
    dungeon: 20
  };
  function hexToRgb(color) {
    const n = parseInt(color.replace("#", ""), 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }
  function makeLCG(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223 & 4294967295) >>> 0;
      return s / 4294967295;
    };
  }
  function setPixel(data, x, y, r, g, b, a = 255) {
    if (x < 0 || x >= TILE_SIZE || y < 0 || y >= TILE_SIZE)
      return;
    const i = (y * TILE_SIZE + x) * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
  function fillBlock(data, x, y, w, h, r, g, b, a = 255) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        setPixel(data, x + dx, y + dy, r, g, b, a);
      }
    }
  }
  function draw3DEdge(data, lr, lg, lb, dr, dg, db) {
    for (let x = 0; x < TILE_SIZE; x++)
      setPixel(data, x, 0, lr, lg, lb, 160);
    for (let y = 1; y < TILE_SIZE; y++)
      setPixel(data, 0, y, lr, lg, lb, 100);
    for (let x = 0; x < TILE_SIZE; x++)
      setPixel(data, x, TILE_SIZE - 1, dr, dg, db, 140);
    for (let y = 0; y < TILE_SIZE - 1; y++)
      setPixel(data, TILE_SIZE - 1, y, dr, dg, db, 100);
  }
  var PALETTES = {
    forest: { base: "#3d7a32", light: "#5aaa46", dark: "#1e4a18", accent: "#d4c840" },
    swamp: { base: "#2d4e24", light: "#3d6a30", dark: "#141e10", accent: "#3a8878" },
    highland: { base: "#7a6838", light: "#9a8a50", dark: "#4a4020", accent: "#9a7840" },
    mountain: { base: "#686878", light: "#9898a8", dark: "#383840", accent: "#b8b8c8" },
    desert: { base: "#c0a048", light: "#d8c070", dark: "#886828", accent: "#c8b858" },
    dungeon: { base: "#282838", light: "#383850", dark: "#14141e", accent: "#484858" }
  };
  function drawForest(data, height, seed) {
    const { base, light, dark, accent } = PALETTES.forest;
    const [br, bg, bb] = hexToRgb(base);
    const [lr, lg, lb] = hexToRgb(light);
    const [dr, dg, db] = hexToRgb(dark);
    const [ar, ag, ab] = hexToRgb(accent);
    const rng = makeLCG(seed);
    if (height === 0) {
      for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
          const wave = Math.sin(x * 0.6 + y * 0.3) * 0.5 + 0.5;
          const r = 34 + wave * 10 | 0;
          const g = 85 + wave * 18 | 0;
          const b = 153 + wave * 20 | 0;
          setPixel(data, x, y, r, g, b);
        }
      }
      for (let y = 5; y < TILE_SIZE; y += 6) {
        for (let x = 0; x < TILE_SIZE - 1; x++) {
          setPixel(data, x, y, 85, 153, 204, 160);
        }
      }
      return;
    }
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const v = rng() * 0.14 - 0.07;
        setPixel(data, x, y, Math.min(255, Math.max(0, br + v * 35)) | 0, Math.min(255, Math.max(0, bg + v * 45)) | 0, Math.min(255, Math.max(0, bb + v * 20)) | 0);
      }
    }
    for (let i = 0; i < 5; i++) {
      const sx = 1 + rng() * 28 | 0;
      const sy = 12 + rng() * 16 | 0;
      fillBlock(data, sx, sy, 2, 2, dr, dg, db, 130);
    }
    const bladeCount = 9 + rng() * 5 | 0;
    for (let i = 0; i < bladeCount; i++) {
      const bx = 1 + rng() * 30 | 0;
      const by = 18 + rng() * 10 | 0;
      const bh = 3 + rng() * (height + 2) | 0;
      for (let d = 0; d < bh; d++) {
        const a = 170 + rng() * 85 | 0;
        const lean = d > 1 && rng() > 0.6 ? 1 : 0;
        setPixel(data, bx + lean, by - d, lr, lg, lb, a);
      }
      setPixel(data, bx, by - bh, Math.min(255, lr + 30), Math.min(255, lg + 30), lb, 220);
    }
    for (let i = 0; i < 4; i++) {
      const sx = 1 + rng() * 28 | 0;
      const sy = 14 + rng() * 14 | 0;
      fillBlock(data, sx, sy, 2, 1, lr, lg, lb, 100);
    }
    const flowerCount = height >= 2 ? 2 : 1;
    for (let i = 0; i < flowerCount; i++) {
      if (rng() > 0.45) {
        const fx = 2 + rng() * 28 | 0;
        const fy = 16 + rng() * 13 | 0;
        setPixel(data, fx, fy, ar, ag, ab);
        setPixel(data, fx - 1, fy, ar, ag, ab, 120);
        setPixel(data, fx + 1, fy, ar, ag, ab, 120);
      }
    }
    if (height === 3) {
      for (let i = 0; i < 4; i++) {
        const sx = rng() * 24 | 0;
        const sy = rng() * 20 | 0;
        fillBlock(data, sx, sy, 5, 4, dr, dg, db, 90);
      }
    }
    draw3DEdge(data, lr, lg, lb, dr, dg, db);
  }
  function drawSwamp(data, height, seed) {
    const { base, light, dark, accent } = PALETTES.swamp;
    const [br, bg, bb] = hexToRgb(base);
    const [lr, lg, lb] = hexToRgb(light);
    const [dr, dg, db] = hexToRgb(dark);
    const [ar, ag, ab] = hexToRgb(accent);
    const rng = makeLCG(seed);
    if (height === 0) {
      for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
          const v = rng() * 0.1;
          setPixel(data, x, y, 15 + v * 10 | 0, 40 + v * 15 | 0, 26 + v * 10 | 0);
        }
      }
      for (let y = 4; y < TILE_SIZE; y += 7) {
        for (let x = 0; x < TILE_SIZE; x++) {
          if (rng() > 0.45)
            setPixel(data, x, y, ar, ag, ab, 120);
        }
      }
      return;
    }
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const v = rng() * 0.12 - 0.06;
        setPixel(data, x, y, Math.min(255, Math.max(0, br + v * 25)) | 0, Math.min(255, Math.max(0, bg + v * 35)) | 0, Math.min(255, Math.max(0, bb + v * 18)) | 0);
      }
    }
    const mossCount = 6 + rng() * 4 | 0;
    for (let i = 0; i < mossCount; i++) {
      const mx = rng() * 28 | 0;
      const my = rng() * 28 | 0;
      const mw = 2 + rng() * 2 | 0;
      const mh = 2 + rng() * 2 | 0;
      fillBlock(data, mx, my, mw, mh, dr, dg, db, 160);
    }
    for (let p = 0; p < 2; p++) {
      const cx = 4 + rng() * 22 | 0;
      const cy = 6 + rng() * 18 | 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          if (dx * dx / 16 + dy * dy / 4 <= 1) {
            const a = 140 + rng() * 60 | 0;
            setPixel(data, cx + dx, cy + dy, ar, ag, ab, a);
          }
        }
      }
      setPixel(data, cx, cy - 1, Math.min(255, ar + 30), Math.min(255, ag + 30), Math.min(255, ab + 30), 160);
    }
    for (let i = 0; i < 4; i++) {
      const bx = 1 + rng() * 30 | 0;
      const by = 20 + rng() * 8 | 0;
      setPixel(data, bx, by, lr, lg, lb, 160);
      setPixel(data, bx, by - 1, lr, lg, lb, 200);
      setPixel(data, bx, by - 2, lr, lg, lb, 140);
    }
    draw3DEdge(data, lr, lg, lb, dr, dg, db);
  }
  function drawHighland(data, height, seed) {
    const { base, light, dark, accent } = PALETTES.highland;
    const [br, bg, bb] = hexToRgb(base);
    const [lr, lg, lb] = hexToRgb(light);
    const [dr, dg, db] = hexToRgb(dark);
    const [ar, ag, ab] = hexToRgb(accent);
    const rng = makeLCG(seed);
    if (height === 0) {
      for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
          const wave = Math.sin(x * 0.7 + y * 0.4) * 0.5 + 0.5;
          setPixel(data, x, y, 58 + wave * 15 | 0, 85 + wave * 20 | 0, 120 + wave * 18 | 0);
        }
      }
      for (let i = 0; i < 4; i++) {
        const sx = rng() * 26 | 0;
        const sy = rng() * 26 | 0;
        fillBlock(data, sx, sy, 3, 2, ar, ag, ab, 200);
        setPixel(data, sx, sy, lr, lg, lb, 220);
      }
      return;
    }
    for (let y = 0; y < TILE_SIZE; y++) {
      const streak = y % 5 < 1 || y % 7 < 1 ? 0.18 : 0;
      for (let x = 0; x < TILE_SIZE; x++) {
        const v = rng() * 0.1 - 0.05;
        setPixel(data, x, y, Math.min(255, Math.max(0, br + (v - streak) * 40)) | 0, Math.min(255, Math.max(0, bg + (v - streak) * 35)) | 0, Math.min(255, Math.max(0, bb + (v - streak) * 20)) | 0);
      }
    }
    const bladeCount = 7 + rng() * 4 | 0;
    for (let i = 0; i < bladeCount; i++) {
      const bx = 1 + rng() * 29 | 0;
      const by = 8 + rng() * 20 | 0;
      const len = 2 + rng() * 3 | 0;
      for (let d = 0; d < len; d++) {
        setPixel(data, bx + d, by - d, lr, lg, lb, 170);
      }
    }
    const stoneCount = 2 + rng() * 3 | 0;
    for (let i = 0; i < stoneCount; i++) {
      const sx = 2 + rng() * 26 | 0;
      const sy = 4 + rng() * 24 | 0;
      const sw = 2 + rng() * 2 | 0;
      fillBlock(data, sx, sy, sw, 2, ar, ag, ab, 200);
      setPixel(data, sx, sy, lr, lg, lb, 230);
      setPixel(data, sx + 1, sy, Math.min(255, lr + 20), Math.min(255, lg + 20), Math.min(255, lb + 20), 180);
      fillBlock(data, sx, sy + 2, sw, 1, dr, dg, db, 120);
    }
    draw3DEdge(data, lr, lg, lb, dr, dg, db);
  }
  function drawMountain(data, height, seed) {
    const { base, light, dark, accent } = PALETTES.mountain;
    const [br, bg, bb] = hexToRgb(base);
    const [lr, lg, lb] = hexToRgb(light);
    const [dr, dg, db] = hexToRgb(dark);
    const rng = makeLCG(seed);
    if (height === 0) {
      for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
          const v = rng() * 0.08;
          setPixel(data, x, y, 34 + v * 15 | 0, 34 + v * 15 | 0, 48 + v * 20 | 0);
        }
      }
      for (let x = 0; x < TILE_SIZE; x++)
        setPixel(data, x, 0, lr, lg, lb, 180);
      for (let x = 0; x < TILE_SIZE; x++)
        setPixel(data, x, 1, lr, lg, lb, 80);
      return;
    }
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const v = rng() * 0.14 - 0.07;
        setPixel(data, x, y, Math.min(255, Math.max(0, br + v * 50)) | 0, Math.min(255, Math.max(0, bg + v * 50)) | 0, Math.min(255, Math.max(0, bb + v * 55)) | 0);
      }
    }
    const crackCount = 2 + rng() * 3 | 0;
    for (let c = 0; c < crackCount; c++) {
      let cx = 2 + rng() * 28 | 0;
      let cy = rng() * 10 | 0;
      const crackLen = 8 + rng() * 16 | 0;
      for (let d = 0; d < crackLen; d++) {
        setPixel(data, cx, cy, dr, dg, db, 220);
        if (cx > 0)
          setPixel(data, cx - 1, cy, lr, lg, lb, 60);
        cy++;
        cx = Math.min(31, Math.max(0, cx + (rng() * 3 | 0) - 1));
      }
    }
    const [ar, ag, ab] = hexToRgb(accent);
    for (let i = 0; i < 3 + height; i++) {
      if (rng() > 0.4) {
        const gx = rng() * TILE_SIZE | 0;
        const gy = rng() * TILE_SIZE | 0;
        setPixel(data, gx, gy, ar, ag, ab, 200);
        setPixel(data, gx + 1, gy, ar, ag, ab, 100);
        setPixel(data, gx, gy + 1, ar, ag, ab, 100);
      }
    }
    for (let x = 0; x < TILE_SIZE; x++)
      setPixel(data, x, 0, lr, lg, lb, 220);
    for (let x = 0; x < TILE_SIZE; x++)
      setPixel(data, x, 1, lr, lg, lb, 110);
    for (let y = 2; y < TILE_SIZE; y++)
      setPixel(data, 0, y, lr, lg, lb, 160);
    for (let x = 0; x < TILE_SIZE; x++)
      setPixel(data, x, TILE_SIZE - 1, dr, dg, db, 220);
    for (let x = 0; x < TILE_SIZE; x++)
      setPixel(data, x, TILE_SIZE - 2, dr, dg, db, 100);
    for (let y = 0; y < TILE_SIZE - 2; y++)
      setPixel(data, TILE_SIZE - 1, y, dr, dg, db, 160);
    if (height === 3) {
      const snowRng = makeLCG(seed + 7777);
      for (let y = 0; y < 11; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
          const a = y < 5 ? 160 + snowRng() * 95 | 0 : snowRng() > 0.5 ? 100 + snowRng() * 80 | 0 : 0;
          if (a > 0)
            setPixel(data, x, y, 215, 228, 240, a);
        }
      }
      for (let i = 0; i < 8; i++) {
        const sx = snowRng() * TILE_SIZE | 0;
        const sy = snowRng() * 10 | 0;
        setPixel(data, sx, sy, 255, 255, 255);
        if (sx > 0)
          setPixel(data, sx - 1, sy, 230, 238, 248, 180);
        if (sx < 31)
          setPixel(data, sx + 1, sy, 230, 238, 248, 180);
        if (sy > 0)
          setPixel(data, sx, sy - 1, 230, 238, 248, 150);
      }
    }
  }
  function drawDesert(data, height, seed) {
    const { base, light, dark, accent } = PALETTES.desert;
    const [br, bg, bb] = hexToRgb(base);
    const [lr, lg, lb] = hexToRgb(light);
    const [dr, dg, db] = hexToRgb(dark);
    const rng = makeLCG(seed);
    if (height === 0) {
      for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
          const wave = Math.sin(x * 0.7 + y * 0.5) * 0.4 + 0.6;
          setPixel(data, x, y, 32 + wave * 15 | 0, 96 + wave * 20 | 0, 168 + wave * 18 | 0);
        }
      }
      for (let y = 3; y < TILE_SIZE; y += 5) {
        for (let x = 0; x < TILE_SIZE - 1; x++) {
          setPixel(data, x, y, 80, 153, 204, 140);
        }
      }
      return;
    }
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        const v = rng() * 0.08 - 0.04;
        setPixel(data, x, y, Math.min(255, Math.max(0, br + v * 30)) | 0, Math.min(255, Math.max(0, bg + v * 25)) | 0, Math.min(255, Math.max(0, bb + v * 15)) | 0);
      }
    }
    const stripeCount = 3 + rng() * 2 | 0;
    const offset = rng() * 8 | 0;
    for (let s = 0; s < stripeCount; s++) {
      const startD = offset + s * 7;
      for (let d = startD; d < startD + TILE_SIZE * 2; d++) {
        const sx = d - TILE_SIZE;
        const sy = d - startD;
        setPixel(data, sx, sy, lr, lg, lb, 100);
        setPixel(data, sx + 1, sy, lr, lg, lb, 50);
      }
    }
    const pebbleCount = 3 + rng() * 3 | 0;
    for (let i = 0; i < pebbleCount; i++) {
      const px = 2 + rng() * 27 | 0;
      const py = 4 + rng() * 24 | 0;
      fillBlock(data, px, py, 2, 2, dr, dg, db, 180);
      setPixel(data, px, py, lr, lg, lb, 160);
    }
    if (height >= 2) {
      for (let y = 8; y < TILE_SIZE; y += 5) {
        for (let x = 1; x < TILE_SIZE - 1; x++) {
          if (x % 3 !== 0)
            setPixel(data, x, y, lr, lg, lb, 70);
        }
      }
    }
    for (let x = 0; x < TILE_SIZE; x++)
      setPixel(data, x, 0, lr, lg, lb, 180);
    for (let y = 1; y < TILE_SIZE; y++)
      setPixel(data, 0, y, lr, lg, lb, 110);
    for (let x = 0; x < TILE_SIZE; x++)
      setPixel(data, x, TILE_SIZE - 1, dr, dg, db, 130);
    for (let y = 0; y < TILE_SIZE - 1; y++)
      setPixel(data, TILE_SIZE - 1, y, dr, dg, db, 100);
  }
  function drawDungeon(data, height, seed) {
    const { base, light, dark, accent } = PALETTES.dungeon;
    const [br, bg, bb] = hexToRgb(base);
    const [lr, lg, lb] = hexToRgb(light);
    const [dr, dg, db] = hexToRgb(dark);
    const [ar, ag, ab] = hexToRgb(accent);
    const rng = makeLCG(seed);
    if (height === 0) {
      for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
          const v = rng() * 0.05;
          setPixel(data, x, y, 8 + v * 10 | 0, 8 + v * 10 | 0, 16 + v * 15 | 0);
        }
      }
      for (let x = 0; x < TILE_SIZE; x++)
        setPixel(data, x, 0, dr, dg, db, 120);
      return;
    }
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        if (x % 8 === 0 || y % 8 === 0) {
          setPixel(data, x, y, dr, dg, db);
          continue;
        }
        const blockX = Math.floor(x / 8);
        const blockY = Math.floor(y / 8);
        const even = (blockX + blockY) % 2 === 0;
        const tint = even ? 0 : 8;
        const v = rng() * 0.04;
        setPixel(data, x, y, Math.min(255, br + tint + v * 15) | 0, Math.min(255, bg + tint + v * 15) | 0, Math.min(255, bb + tint + v * 20) | 0);
      }
    }
    const crackCount = 1 + rng() * 2 | 0;
    for (let c = 0; c < crackCount; c++) {
      const bx = (1 + rng() * 3 | 0) * 8 + 1;
      const by = (1 + rng() * 3 | 0) * 8 + 1;
      for (let d = 0; d < 5; d++) {
        setPixel(data, bx + d, by + (rng() * 2 | 0), dr, dg, db, 160);
      }
    }
    if (height >= 2 && rng() > 0.4) {
      const rx = 9 + rng() * 12 | 0;
      const ry = 9 + rng() * 12 | 0;
      setPixel(data, rx, ry, ar, ag, ab);
      setPixel(data, rx + 1, ry, ar, ag, ab, 140);
      setPixel(data, rx, ry + 1, ar, ag, ab, 140);
      setPixel(data, rx - 1, ry, ar, ag, ab, 100);
    }
    for (let x = 0; x < TILE_SIZE; x++)
      setPixel(data, x, 0, lr, lg, lb, 200);
    for (let x = 0; x < TILE_SIZE; x++)
      setPixel(data, x, 1, lr, lg, lb, 90);
    for (let y = 2; y < TILE_SIZE; y++)
      setPixel(data, 0, y, lr, lg, lb, 130);
  }
  var DRAW_FUNCTIONS = {
    forest: drawForest,
    swamp: drawSwamp,
    highland: drawHighland,
    mountain: drawMountain,
    desert: drawDesert,
    dungeon: drawDungeon
  };
  var BIOME_ORDER = ["forest", "swamp", "highland", "mountain", "desert", "dungeon"];
  function generateTileset(scene) {
    const canvas = document.createElement("canvas");
    canvas.width = TILE_SIZE * TILE_COUNT;
    canvas.height = TILE_SIZE;
    const ctx = canvas.getContext("2d");
    for (let bi = 0; bi < BIOME_ORDER.length; bi++) {
      const biome = BIOME_ORDER[bi];
      const drawFn = DRAW_FUNCTIONS[biome];
      for (let h = 0; h < 4; h++) {
        const tileIndex = bi * 4 + h;
        const imgData = ctx.createImageData(TILE_SIZE, TILE_SIZE);
        drawFn(imgData.data, h, bi * 1e3 + h * 100 + 42);
        ctx.putImageData(imgData, tileIndex * TILE_SIZE, 0);
      }
    }
    scene.textures.addCanvas("worldTileset", canvas);
  }

  // dist/js/world/Chunk.js
  var TILE_PX2 = 32;
  var TILES_PER_CHUNK = 32;
  var CHUNK_PX = TILE_PX2 * TILES_PER_CHUNK;
  var RENDER_RADIUS = 2;
  var ACTIVE_RADIUS = 1;
  var UNLOAD_RADIUS = 3;
  var WORLD_CHUNKS_X = 20;
  var WORLD_CHUNKS_Y = 20;
  var CHUNK_TICK_MS = 500;
  function chunkKey(cx, cy) {
    return `${cx},${cy}`;
  }

  // dist/js/world/BiomeDefinitions.js
  var WORLD_ZONES = [
    { cx: 0, cy: 0, cw: 5, ch: 5, biome: "forest", danger: 1 },
    // Startzone
    { cx: 5, cy: 0, cw: 4, ch: 4, biome: "swamp", danger: 2 },
    { cx: 0, cy: 5, cw: 5, ch: 4, biome: "highland", danger: 2 },
    { cx: 5, cy: 5, cw: 5, ch: 5, biome: "mountain", danger: 3 },
    { cx: 10, cy: 2, cw: 3, ch: 6, biome: "desert", danger: 3 },
    { cx: 7, cy: 9, cw: 5, ch: 5, biome: "dungeon", danger: 4 }
  ];
  function getBiomeAt(cx, cy) {
    for (const zone of WORLD_ZONES) {
      if (cx >= zone.cx && cx < zone.cx + zone.cw && cy >= zone.cy && cy < zone.cy + zone.ch) {
        return zone.biome;
      }
    }
    return "forest";
  }
  var BIOME_SPAWNS = {
    forest: ["ant", "ladybug", "grass"],
    swamp: ["poison_spider", "grass"],
    highland: ["jumping_spider", "ant", "small_scorpion"],
    mountain: ["jumping_spider", "poison_spider", "small_scorpion"],
    desert: ["ant", "small_scorpion", "large_scorpion"],
    dungeon: ["jumping_spider", "poison_spider", "large_scorpion"]
  };
  function getTileIndex(biome, height) {
    const offset = BIOME_TILE_OFFSET[biome] ?? 0;
    return offset + Math.min(3, Math.max(0, height));
  }

  // dist/js/world/WorldGenerator.js
  function chunkSeed(cx, cy, worldSeed) {
    return (cx * 73856093 ^ cy * 19349663 ^ worldSeed) >>> 0;
  }
  function makeLCG2(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223 & 4294967295) >>> 0;
      return s / 4294967295;
    };
  }
  function generateHeightMap(rng) {
    const map = [];
    const coarse = [];
    const coarseSize = Math.ceil(TILES_PER_CHUNK / 4);
    for (let cy = 0; cy < coarseSize; cy++) {
      coarse.push([]);
      for (let cx2 = 0; cx2 < coarseSize; cx2++) {
        const r = rng();
        let h;
        if (r < 0.15)
          h = 0;
        else if (r < 0.55)
          h = 1;
        else if (r < 0.9)
          h = 2;
        else
          h = 3;
        coarse[cy].push(h);
      }
    }
    for (let row = 0; row < TILES_PER_CHUNK; row++) {
      map.push([]);
      for (let col = 0; col < TILES_PER_CHUNK; col++) {
        const coarseH = coarse[Math.floor(row / 4)][Math.floor(col / 4)];
        const nudge = rng();
        let h = coarseH;
        if (nudge > 0.85 && h < 3)
          h++;
        else if (nudge < 0.08 && h > 0)
          h--;
        map[row].push(h);
      }
    }
    return map;
  }
  function generateSpawns(biome, rng) {
    const spawnTable = BIOME_SPAWNS[biome] ?? ["grass"];
    const count = 64 + Math.floor(rng() * 49);
    const spawns = [];
    for (let i = 0; i < count; i++) {
      const defId = spawnTable[Math.floor(rng() * spawnTable.length)];
      const localX = 48 + rng() * (CHUNK_PX - 96) | 0;
      const localY = 48 + rng() * (CHUNK_PX - 96) | 0;
      spawns.push({ defId, localX, localY });
    }
    return spawns;
  }
  function generateChunk(cx, cy, worldSeed) {
    const seed = chunkSeed(cx, cy, worldSeed);
    const rng = makeLCG2(seed);
    const biome = getBiomeAt(cx, cy);
    const heightMap = generateHeightMap(rng);
    const tileIndices = heightMap.map((row) => row.map((h) => getTileIndex(biome, h)));
    const spawns = generateSpawns(biome, rng);
    return { cx, cy, biome, tileIndices, heightMap, spawns };
  }

  // dist/js/world/ChunkManager.js
  var ChunkManager = class {
    constructor(scene, gameState, createEntitySprite, removeEntitySprite) {
      this.loadedChunks = /* @__PURE__ */ new Map();
      this.deadCache = /* @__PURE__ */ new Map();
      this.lastTickTime = 0;
      this.lastCx = -999;
      this.lastCy = -999;
      this.scene = scene;
      this.gameState = gameState;
      this.createEntitySprite = createEntitySprite;
      this.removeEntitySprite = removeEntitySprite;
    }
    // ────────────────────────────────────────
    // Public API
    // ────────────────────────────────────────
    /**
     * Aufzurufen in GameScene.update().
     * Prüft alle CHUNK_TICK_MS ob Chunks geladen/entladen werden müssen.
     */
    tick(px, py, now) {
      if (now - this.lastTickTime < CHUNK_TICK_MS)
        return;
      this.lastTickTime = now;
      const cx = Math.floor(px / CHUNK_PX);
      const cy = Math.floor(py / CHUNK_PX);
      if (cx === this.lastCx && cy === this.lastCy && this.loadedChunks.size > 0)
        return;
      this.lastCx = cx;
      this.lastCy = cy;
      this.updateChunks(cx, cy);
    }
    /**
     * Welche Chunks sollen jetzt KI-simuliert werden?
     * Gibt alle instanceIds in ACTIVE_RADIUS-Chunks zurück.
     */
    getActiveEntityIds() {
      const active = /* @__PURE__ */ new Set();
      for (const [key, chunk] of this.loadedChunks) {
        const [kcx, kcy] = key.split(",").map(Number);
        if (Math.abs(kcx - this.lastCx) <= ACTIVE_RADIUS && Math.abs(kcy - this.lastCy) <= ACTIVE_RADIUS) {
          for (const id of chunk.instanceIds)
            active.add(id);
        }
      }
      return active;
    }
    isChunkLoaded(cx, cy) {
      return this.loadedChunks.has(chunkKey(cx, cy));
    }
    // ────────────────────────────────────────
    // Chunk-Verwaltung
    // ────────────────────────────────────────
    updateChunks(cx, cy) {
      const toLoad = [];
      for (let dy = -RENDER_RADIUS; dy <= RENDER_RADIUS; dy++) {
        for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++) {
          const ncx = cx + dx;
          const ncy = cy + dy;
          if (ncx < 0 || ncy < 0 || ncx >= WORLD_CHUNKS_X || ncy >= WORLD_CHUNKS_Y)
            continue;
          const key = chunkKey(ncx, ncy);
          if (!this.loadedChunks.has(key))
            toLoad.push(key);
        }
      }
      const toUnload = [];
      for (const [key] of this.loadedChunks) {
        const [kcx, kcy] = key.split(",").map(Number);
        if (Math.abs(kcx - cx) > UNLOAD_RADIUS || Math.abs(kcy - cy) > UNLOAD_RADIUS) {
          toUnload.push(key);
        }
      }
      for (const key of toUnload)
        this.unloadChunk(key);
      for (const key of toLoad) {
        const [ncx, ncy] = key.split(",").map(Number);
        this.loadChunk(ncx, ncy);
      }
    }
    loadChunk(cx, cy) {
      const key = chunkKey(cx, cy);
      if (this.loadedChunks.has(key))
        return;
      const def = generateChunk(cx, cy, this.gameState.world.worldSeed);
      const tilemap = this.scene.make.tilemap({
        data: def.tileIndices,
        tileWidth: TILE_PX2,
        tileHeight: TILE_PX2
      });
      const tileset = tilemap.addTilesetImage("worldTileset", "worldTileset", TILE_PX2, TILE_PX2, 0, 0);
      const layer = tilemap.createLayer(0, tileset, cx * CHUNK_PX, cy * CHUNK_PX);
      layer.setDepth(-1);
      const instanceIds = [];
      const now = Date.now();
      const deadRecords = this.deadCache.get(key) ?? [];
      for (const spawn of def.spawns) {
        const def2 = ENTITY_MAP.get(spawn.defId);
        if (!def2)
          continue;
        const deadIdx = deadRecords.findIndex((d) => d.defId === spawn.defId && Math.abs(d.localX - spawn.localX) < 2);
        if (deadIdx >= 0) {
          const dead = deadRecords[deadIdx];
          if (now < dead.respawnAt) {
            continue;
          }
          deadRecords.splice(deadIdx, 1);
        }
        const instanceId = `chunk_${key}_${instanceIds.length}`;
        const worldX = cx * CHUNK_PX + spawn.localX;
        const worldY = cy * CHUNK_PX + spawn.localY;
        const instance = {
          instanceId,
          definitionId: spawn.defId,
          x: worldX,
          y: worldY,
          currentHp: def2.hp ?? 10,
          isAlive: true,
          isAggro: false,
          statusEffects: [],
          attackCooldownRemaining: 0,
          chunkKey: key,
          bonusLevel: 0,
          skillWins: 0,
          levelingCooldown: 0
        };
        this.gameState.world.entities.set(instanceId, instance);
        this.createEntitySprite(instance);
        instanceIds.push(instanceId);
      }
      if (deadRecords.length > 0) {
        this.deadCache.set(key, deadRecords);
      } else {
        this.deadCache.delete(key);
      }
      this.loadedChunks.set(key, {
        def,
        tilemap,
        tilemapLayer: layer,
        instanceIds,
        loadedAt: now
      });
      console.log(`[Chunk] Loaded [${cx},${cy}] biome=${def.biome} entities=${instanceIds.length}`);
    }
    unloadChunk(key) {
      const chunk = this.loadedChunks.get(key);
      if (!chunk)
        return;
      const now = Date.now();
      const deadRecords = this.deadCache.get(key) ?? [];
      for (const instanceId of chunk.instanceIds) {
        const instance = this.gameState.world.entities.get(instanceId);
        if (instance) {
          if (!instance.isAlive && instance.respawnAt) {
            const cx = chunk.def.cx;
            const cy = chunk.def.cy;
            deadRecords.push({
              defId: instance.definitionId,
              localX: instance.x - cx * CHUNK_PX,
              localY: instance.y - cy * CHUNK_PX,
              respawnAt: instance.respawnAt
            });
          }
          this.gameState.world.entities.delete(instanceId);
        }
        this.removeEntitySprite(instanceId);
      }
      if (deadRecords.length > 0) {
        const alive = deadRecords.filter((d) => d.respawnAt > now);
        if (alive.length > 0)
          this.deadCache.set(key, alive);
        else
          this.deadCache.delete(key);
      }
      chunk.tilemapLayer.destroy();
      chunk.tilemap.destroy();
      this.loadedChunks.delete(key);
      console.log(`[Chunk] Unloaded [${key}]`);
    }
  };

  // dist/js/scenes/GameScene.js
  var BootScene = class extends Phaser.Scene {
    constructor() {
      super({ key: "BootScene" });
    }
    create() {
      this.scene.start("GameScene");
    }
  };
  var GameScene = class extends Phaser.Scene {
    constructor() {
      super({ key: "GameScene" });
      this.entitySprites = /* @__PURE__ */ new Map();
      this.lastNearbyId = null;
      this.gamePaused = false;
      this.playtimeAccumulator = 0;
    }
    preload() {
      generateTileset(this);
    }
    create() {
      this.gameState = createInitialGameState();
      this.createWorld();
      this.createPlayer();
      this.setupJoystick();
      this.setupFullscreen();
      this.setupGlobalFunctions();
      this.hpBarGraphics = this.add.graphics().setDepth(10);
      syncPassiveEffects(this.gameState.player);
      window.gameState = this.gameState;
      window.gameScene = this;
      window.__ALL_SKILLS = ALL_SKILLS;
      this.setupSkillBar();
      this.setupSaveMenu();
      this.cameras.main.startFollow(this.slimeGraphic, true, 1, 1);
      this.updateCameraZoom();
      updateUI(this.gameState);
      addLog("Du erwachst als Schleim\u2026", "system");
      addLog("Joystick bewegen \xB7 ABSORB + ANALYZE tippen", "system");
    }
    // ----------------------------------------------------------
    // WELT
    // ----------------------------------------------------------
    createWorld() {
      const worldW = WORLD_CHUNKS_X * CHUNK_PX;
      const worldH = WORLD_CHUNKS_Y * CHUNK_PX;
      this.physics.world.setBounds(0, 0, worldW, worldH);
      this.cameras.main.setBounds(0, 0, worldW, worldH);
      this.chunkManager = new ChunkManager(this, this.gameState, (instance) => this.spawnEntitySprite(instance), (instanceId) => this.despawnEntitySprite(instanceId));
      this.chunkManager.tick(this.gameState.player.x, this.gameState.player.y, Date.now() - 1e3);
    }
    // ────────────────────────────────────────
    // Entity-Sprite: Erstellen / Entfernen
    // ────────────────────────────────────────
    spawnEntitySprite(instance) {
      const def = ENTITY_MAP.get(instance.definitionId);
      if (!def)
        return null;
      const RENDER_FONT = 28;
      const worldSize = def.worldSize ?? 5;
      const text = this.add.text(instance.x, instance.y, def.icon, { fontSize: `${RENDER_FONT}px` }).setOrigin(0.5).setScale(worldSize / RENDER_FONT).setInteractive();
      text.on("pointerdown", () => {
        const dist = Math.hypot(this.gameState.player.x - instance.x, this.gameState.player.y - instance.y);
        if (dist > this.getPlayerAttackRange()) {
          showToast("N\xE4her herangehen!", "system");
          return;
        }
        this.lastNearbyId = instance.instanceId;
        updateNearbyPanel(def, instance, this.gameState);
      });
      text.floatPhase = Math.random() * Math.PI * 2;
      this.entitySprites.set(instance.instanceId, text);
      return text;
    }
    despawnEntitySprite(instanceId) {
      const sprite = this.entitySprites.get(instanceId);
      if (sprite) {
        this.tweens.killTweensOf(sprite);
        sprite.destroy();
        this.entitySprites.delete(instanceId);
      }
    }
    // ----------------------------------------------------------
    // SPIELER
    // ----------------------------------------------------------
    createPlayer() {
      const g = this.add.graphics();
      g.fillStyle(2140256);
      g.fillCircle(20, 20, 18);
      g.fillStyle(4253840);
      g.fillCircle(20, 20, 15);
      g.fillStyle(9502668, 0.7);
      g.fillCircle(14, 14, 7);
      g.generateTexture("slime", 40, 40);
      g.destroy();
      this.slimeGraphic = this.physics.add.image(this.gameState.player.x, this.gameState.player.y, "slime");
      this.slimeGraphic.setCollideWorldBounds(true);
    }
    // Berechnet den Welt-Radius des Slimes für ein gegebenes Level.
    // Wächst linear von PLAYER_WORLD_RADIUS_MIN bis PLAYER_WORLD_RADIUS_MAX.
    calcPlayerWorldRadius(level) {
      const t = Math.min((level - 1) / (PLAYER_SIZE_LEVEL_MAX - 1), 1);
      return PLAYER_WORLD_RADIUS_MIN + t * (PLAYER_WORLD_RADIUS_MAX - PLAYER_WORLD_RADIUS_MIN);
    }
    // Nahkampf-Angriffsreichweite des Slimes in Weltpixeln.
    // = Rand des Charakters + nochmal eine Charaktergröße = 2 × worldRadius.
    getPlayerAttackRange() {
      return this.calcPlayerWorldRadius(this.gameState.player.level) * 2;
    }
    // Passt Kamera-Zoom an das aktuelle Level an.
    // Slime erscheint immer PLAYER_SCREEN_RADIUS px groß.
    updateCameraZoom() {
      const worldRadius = this.calcPlayerWorldRadius(this.gameState.player.level);
      this.cameras.main.setZoom(PLAYER_SCREEN_RADIUS / worldRadius);
    }
    // ----------------------------------------------------------
    // JOYSTICK (Mobile)
    // ----------------------------------------------------------
    setupJoystick() {
      const container = document.getElementById("touchControls");
      if (!container)
        return;
      this.joy = createJoystick(container);
    }
    // ----------------------------------------------------------
    // VOLLBILD
    // ----------------------------------------------------------
    setupFullscreen() {
      const btn = document.getElementById("btnFullscreen");
      const updateBtn = (isFs) => {
        if (!btn)
          return;
        btn.textContent = isFs ? "\u2715" : "\u26F6";
        btn.title = isFs ? "Vollbild beenden" : "Vollbild";
      };
      const onChange = () => {
        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
        updateBtn(isFs);
        if (!isFs) {
          this.pauseGame();
        } else {
          this.resumeGame();
        }
      };
      document.addEventListener("fullscreenchange", onChange);
      document.addEventListener("webkitfullscreenchange", onChange);
      btn?.addEventListener("click", (e) => {
        e.stopPropagation();
        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
        if (isFs) {
          this.exitFullscreen();
        } else {
          this.enterFullscreen();
        }
      });
    }
    enterFullscreen() {
      const el = document.documentElement;
      try {
        if (el.requestFullscreen) {
          el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
        }
      } catch (_) {
      }
    }
    exitFullscreen() {
      try {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      } catch (_) {
      }
    }
    pauseGame() {
      if (this.gamePaused)
        return;
      this.gamePaused = true;
      this.physics.pause();
      const ov = document.getElementById("pauseOverlay");
      if (ov)
        ov.classList.add("visible");
    }
    resumeGame() {
      if (!this.gamePaused)
        return;
      this.gamePaused = false;
      this.physics.resume();
      const ov = document.getElementById("pauseOverlay");
      if (ov)
        ov.classList.remove("visible");
    }
    // ----------------------------------------------------------
    // SKILL BAR + SKILL MENU
    // ----------------------------------------------------------
    setupSkillBar() {
      const container = document.getElementById("skillBarWrap");
      if (!container)
        return;
      let menuRef = null;
      this.skillBar = createSkillBar(container, () => menuRef?.open());
      menuRef = createSkillMenu(this.skillBar);
    }
    /** Spiel für UI pausieren (ohne Pause-Overlay) */
    pauseForUI() {
      this.gamePaused = true;
      this.physics.pause();
    }
    /** Spiel nach UI-Schließen fortsetzen */
    resumeForUI() {
      this.gamePaused = false;
      this.physics.resume();
    }
    // ----------------------------------------------------------
    // SAVE MENU
    // ----------------------------------------------------------
    setupSaveMenu() {
      const menu = createSaveMenu();
      document.getElementById("btnSave")?.addEventListener("click", () => menu.open());
      document.getElementById("btnSaveFromPause")?.addEventListener("click", () => {
        const ov = document.getElementById("pauseOverlay");
        if (ov)
          ov.classList.remove("visible");
        menu.open();
      });
    }
    /** Spielstand in Slot speichern */
    saveGame(slot) {
      if (this.skillBar) {
        for (let i = 0; i < 4; i++) {
          this.gameState.player.activeSkillSlots[i] = this.skillBar.slots[i];
        }
      }
      saveToSlot(slot, this.gameState.player, this.skillBar?.slots ?? []);
      addLog(`\u{1F4BE} Spielstand in Slot ${slot + 1} gespeichert.`, "system");
    }
    /** Spielstand aus Slot laden */
    loadGame(slot) {
      const saved = loadFromSlot(slot);
      if (!saved) {
        showToast("Speicherstand nicht gefunden.", "system");
        return;
      }
      this.gameState.player = saved.player;
      this.slimeGraphic.setPosition(saved.player.x, saved.player.y);
      this.gameState.player.maxHp = calcMaxHp(saved.player.level);
      this.gameState.player.maxMp = calcMaxMp(saved.player.level);
      this.gameState.player.hp = Math.min(this.gameState.player.hp, this.gameState.player.maxHp);
      this.gameState.player.mp = Math.min(this.gameState.player.mp, this.gameState.player.maxMp);
      this.updateCameraZoom();
      syncPassiveEffects(this.gameState.player);
      if (this.skillBar && saved.player.activeSkillSlots) {
        for (let i = 0; i < 4; i++) {
          this.skillBar.assignSlot(i, saved.player.activeSkillSlots[i] ?? null);
        }
      }
      for (const [, instance] of this.gameState.world.entities) {
        const def = ENTITY_MAP.get(instance.definitionId);
        instance.currentHp = def?.hp ?? 0;
        instance.isAggro = false;
        instance.statusEffects = [];
        instance.attackCooldownRemaining = 0;
        instance.isAlive = true;
      }
      updateUI(this.gameState);
      addLog(`\u25B6 Slot ${slot + 1} geladen \u2014 Lv.${saved.player.level}, ${saved.player.discoveredSkills.size} Skills.`, "system");
    }
    /** Alles zurücksetzen und Seite neu laden */
    resetGame() {
      deleteAllSaves();
      window.location.reload();
    }
    // ----------------------------------------------------------
    // GLOBALE FUNKTIONEN (für HTML-Buttons)
    // ----------------------------------------------------------
    setupGlobalFunctions() {
      window.switchTab = switchTab;
      window.toggleSheet = toggleSheet;
      window.touchAbsorb = () => this.doAbsorb();
      window.touchAnalyze = () => this.doAnalyze();
      window.doGrow = () => this.doGrow();
      window.togglePassiveSkill = (skillId) => this.togglePassiveSkill(skillId);
      window.resumeFromPause = () => {
        const el = document.documentElement;
        if (el.requestFullscreen || el.webkitRequestFullscreen) {
          this.enterFullscreen();
        } else {
          this.resumeGame();
        }
      };
    }
    // ----------------------------------------------------------
    // GAME LOOP
    // ----------------------------------------------------------
    update(_time, delta) {
      if (this.gamePaused)
        return;
      this.playtimeAccumulator += delta;
      if (this.playtimeAccumulator >= 1e3) {
        this.gameState.player.playtimeSeconds += Math.floor(this.playtimeAccumulator / 1e3);
        this.playtimeAccumulator %= 1e3;
      }
      this.handleMovement();
      this.syncPlayerPosition();
      this.chunkManager.tick(this.gameState.player.x, this.gameState.player.y, Date.now());
      this.processEntityAi(delta);
      this.processEntityLeveling(delta);
      this.processCombatEffects(delta);
      this.updateEntityVisuals();
      this.updateSlimeWobble(_time);
      this.checkNearbyEntity();
      this.checkPlayerDeath();
      processRespawns(this.gameState.world);
    }
    // Setzt Slime-Skalierung (Level-basiert) + organisches Wobble
    updateSlimeWobble(time) {
      const worldRadius = this.calcPlayerWorldRadius(this.gameState.player.level);
      const baseScale = worldRadius / 20;
      const wobble = Math.sin(time * 628e-5) * 0.04;
      this.slimeGraphic.setScale(baseScale * (1 + wobble), baseScale * (1 - wobble));
    }
    handleMovement() {
      const worldRadius = this.calcPlayerWorldRadius(this.gameState.player.level);
      const speed = worldRadius * PLAYER_SPEED_PER_WORLD_RADIUS;
      const body = this.slimeGraphic.body;
      let dx = this.joy.active ? this.joy.dx : 0;
      let dy = this.joy.active ? this.joy.dy : 0;
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        dx /= len;
        dy /= len;
      }
      body.setVelocity(dx * speed, dy * speed);
    }
    syncPlayerPosition() {
      this.gameState.player.x = this.slimeGraphic.x;
      this.gameState.player.y = this.slimeGraphic.y;
    }
    updateEntityVisuals() {
      this.hpBarGraphics.clear();
      const now = this.time.now;
      for (const [id, instance] of this.gameState.world.entities) {
        const sprite = this.entitySprites.get(id);
        if (!sprite)
          continue;
        if (!instance.isAlive) {
          sprite.setAlpha(0.2);
          continue;
        }
        if (instance.isAggro) {
          sprite.setTint(16729156);
        } else if ((instance.bonusLevel ?? 0) > 0) {
          sprite.setTint(16768324);
          sprite.setAlpha(1);
        } else {
          sprite.clearTint();
          sprite.setAlpha(1);
        }
        sprite.x = instance.x;
        sprite.y = instance.y + Math.sin(now * 1e-3 + sprite.floatPhase) * 2.5;
        const def = ENTITY_MAP.get(instance.definitionId);
        const scaledMaxHp = def ? getScaledMaxHp(def, instance.bonusLevel ?? 0) : 0;
        if (def && def.hp && (instance.currentHp < scaledMaxHp || instance.isAggro)) {
          const ratio = Math.max(0, instance.currentHp / scaledMaxHp);
          const zoom = this.cameras.main.zoom;
          const worldSize = def.worldSize ?? 5;
          const bw = 18 / zoom;
          const bh = 2.5 / zoom;
          const bx = instance.x - bw / 2;
          const by = instance.y - worldSize * 0.8 - bh;
          this.hpBarGraphics.fillStyle(2236962, 0.8);
          this.hpBarGraphics.fillRect(bx, by, bw, bh);
          const color = ratio > 0.5 ? 4508740 : ratio > 0.25 ? 14526976 : 13378082;
          this.hpBarGraphics.fillStyle(color, 1);
          this.hpBarGraphics.fillRect(bx, by, Math.round(bw * ratio), bh);
        }
      }
    }
    // ----------------------------------------------------------
    // KAMPF-LOOP
    // ----------------------------------------------------------
    processEntityAi(delta) {
      const now = Date.now();
      const px = this.gameState.player.x;
      const py = this.gameState.player.y;
      const activeIds = this.chunkManager.getActiveEntityIds();
      for (const [id, instance] of this.gameState.world.entities) {
        if (!activeIds.has(id))
          continue;
        if (!instance.isAlive)
          continue;
        const def = ENTITY_MAP.get(instance.definitionId);
        if (!def)
          continue;
        tickAttackCooldown(instance, delta);
        const frame = calcEntityAi(def, instance, px, py, now);
        if (frame.becameAggro) {
          addLog(`${def.icon} ${def.name} wird aggressiv!`, "aggro");
        }
        if (frame.lostAggro) {
          instance.isAggro = false;
        }
        if ((frame.vx !== 0 || frame.vy !== 0) && instance.isAlive) {
          instance.x += frame.vx * (delta / 1e3);
          instance.y += frame.vy * (delta / 1e3);
        }
        if (frame.wantToAttack) {
          setAttackCooldown(instance, def);
          const result = entityAttack(def, instance, this.gameState.player);
          if (result.hit) {
            this.gameState.player.hp = Math.max(0, this.gameState.player.hp - result.damageDealt);
            for (const effect of result.statusApplied) {
              applyEffect(this.gameState.player, effect);
            }
            const absorbed = Math.max(0, (def.damage ?? 1) - result.damageDealt);
            if (absorbed > 0) {
              this.skillLevelUp(gainSkillXp(this.gameState.player, "chitin_armor", absorbed), "chitin_armor");
            }
            const reflectDmg = triggerAuras(this.gameState.player);
            if (reflectDmg > 0) {
              instance.currentHp = Math.max(0, instance.currentHp - reflectDmg);
              this.showDamageNumber(instance.x, instance.y, reflectDmg, "#ff8800");
              this.skillLevelUp(gainSkillXp(this.gameState.player, "hemolymph", reflectDmg), "hemolymph");
              if (instance.currentHp <= 0) {
                instance.isAlive = false;
                instance.respawnAt = Date.now() + (def?.respawnTime ?? 60) * 1e3;
                resetAi(instance);
                addLog(`${def?.icon ?? "?"} ${def?.name ?? "Entity"} wurde vernichtet!`, "system");
              }
            }
            addLog(result.message, "aggro");
            this.showDamageNumber(px, py, result.damageDealt, "#ff4444");
            updateUI(this.gameState);
          }
        }
      }
    }
    // ----------------------------------------------------------
    // ENTITY-LEVELING-LOOP
    // Kreaturen jagen schwächere Artgenossen und leveln auf.
    // ----------------------------------------------------------
    processEntityLeveling(delta) {
      const activeIds = this.chunkManager.getActiveEntityIds();
      for (const [id, hunter] of this.gameState.world.entities) {
        if (!activeIds.has(id))
          continue;
        if (!hunter.isAlive || hunter.isAggro)
          continue;
        const hunterDef = ENTITY_MAP.get(hunter.definitionId);
        if (!hunterDef || hunterDef.category !== "creature" || !hunterDef.damage)
          continue;
        if (hunterDef.behavior === "passive")
          continue;
        if ((hunter.levelingCooldown ?? 0) > 0) {
          hunter.levelingCooldown = Math.max(0, (hunter.levelingCooldown ?? 0) - delta);
        }
        const prey = findLevelingPrey(hunter, hunterDef, this.gameState.world.entities, ENTITY_MAP);
        if (!prey || !activeIds.has(prey.instanceId))
          continue;
        const dx = prey.x - hunter.x;
        const dy = prey.y - hunter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const attackRange = hunterDef.attackRangePx ?? 60;
        if (dist > attackRange) {
          const spd = getScaledSpeed(hunterDef, hunter.bonusLevel ?? 0);
          hunter.x += dx / dist * spd * (delta / 1e3);
          hunter.y += dy / dist * spd * (delta / 1e3);
        } else if ((hunter.levelingCooldown ?? 0) <= 0) {
          hunter.levelingCooldown = hunterDef.attackCooldownMs ?? 1500;
          const dmg = getScaledDamage(hunterDef, hunter.bonusLevel ?? 0);
          const preyDef = ENTITY_MAP.get(prey.definitionId);
          prey.currentHp = Math.max(0, prey.currentHp - dmg);
          this.showDamageNumber(prey.x, prey.y, dmg, "#ff8800");
          if (prey.currentHp <= 0) {
            prey.isAlive = false;
            prey.respawnAt = Date.now() + (preyDef?.respawnTime ?? 60) * 1e3;
            resetAi(prey);
            const result = processEntityVictory(hunter, hunterDef);
            if (result.entityLeveledUp) {
              const newLv = getEffectiveLevel(hunterDef, hunter);
              addLog(`${hunterDef.icon} ${hunterDef.name} steigt auf Stufe ${newLv} auf! \u2728`, "levelup");
            } else if (result.skillLeveledUp) {
              const wins = hunter.skillWins ?? 0;
              addLog(`${hunterDef.icon} ${hunterDef.name} wird st\xE4rker! (${wins}/3)`, "system");
            }
          }
        }
      }
    }
    processCombatEffects(delta) {
      const now = Date.now();
      const playerHpDelta = processTicks(this.gameState.player, now);
      if (playerHpDelta !== 0) {
        this.gameState.player.hp = Math.max(0, Math.min(this.gameState.player.maxHp, this.gameState.player.hp + playerHpDelta));
        if (playerHpDelta < 0) {
          this.showDamageNumber(this.gameState.player.x, this.gameState.player.y, -playerHpDelta, "#aa44ff");
        } else if (playerHpDelta > 0) {
          this.skillLevelUp(gainSkillXp(this.gameState.player, "photosynthesis", playerHpDelta), "photosynthesis");
        }
        updateUI(this.gameState);
      }
      removeExpiredEffects(this.gameState.player, now);
      for (const instance of this.gameState.world.entities.values()) {
        if (!instance.isAlive)
          continue;
        const def = ENTITY_MAP.get(instance.definitionId);
        const wrapper = {
          statusEffects: instance.statusEffects,
          hp: instance.currentHp,
          maxHp: def?.hp ?? 0
        };
        let venomXp = 0;
        for (const effect of instance.statusEffects) {
          if (effect.sourceSkillId === "venom" && effect.type === "dot" && effect.tickIntervalMs > 0 && now - effect.lastTickAt >= effect.tickIntervalMs) {
            venomXp += effect.damagePerTick;
          }
        }
        const hpDelta = processTicks(wrapper, now);
        if (hpDelta !== 0) {
          instance.currentHp = Math.max(0, instance.currentHp + hpDelta);
          if (hpDelta < 0) {
            this.showDamageNumber(instance.x, instance.y, -hpDelta, "#44ff88");
          }
          if (instance.currentHp <= 0) {
            instance.isAlive = false;
            instance.respawnAt = Date.now() + (def?.respawnTime ?? 60) * 1e3;
            resetAi(instance);
            if (def)
              addLog(`${def.icon} ${def.name} wurde vernichtet!`, "system");
          }
        }
        if (venomXp > 0) {
          this.skillLevelUp(gainSkillXp(this.gameState.player, "venom", venomXp), "venom");
        }
        removeExpiredEffects(instance, now);
        if (!instance.isAggro && instance.currentHp > 0) {
          const scaledMax = getScaledMaxHp(def, instance.bonusLevel ?? 0);
          if (instance.currentHp < scaledMax) {
            instance.currentHp = Math.min(scaledMax, instance.currentHp + scaledMax * 0.05 * (delta / 1e3));
          }
        }
      }
      regenMp(this.gameState.player, delta);
    }
    checkPlayerDeath() {
      if (this.gameState.player.hp > 0)
        return;
      executeCheckpoint(this.gameState.player);
      syncPassiveEffects(this.gameState.player);
      for (const instance of this.gameState.world.entities.values()) {
        resetAi(instance);
      }
      this.slimeGraphic.setPosition(this.gameState.player.x, this.gameState.player.y);
      this.cameras.main.flash(400, 255, 50, 50);
      addLog("\u{1F480} Besiegt! Checkpoint \u2014 HP/MP wiederhergestellt.", "system");
      updateUI(this.gameState);
    }
    /** Level-Up nach gainSkillXp() verarbeiten: Log + syncPassiveEffects */
    skillLevelUp(result, skillId) {
      if (result.leveledUp) {
        const def = ALL_SKILLS.get(skillId);
        const icon = def?.icon ?? "\u26A1";
        addLog(`\u2B06\uFE0F ${icon} ${def?.name ?? skillId} \u2192 Lv.${result.newLevel}!`, "system");
        if (def?.activation === "passive") {
          syncPassiveEffects(this.gameState.player);
        }
      }
      this.checkPlayerLevelUp();
      updateUI(this.gameState);
    }
    /** Hauptlevel neu berechnen und bei Level-Up loggen */
    checkPlayerLevelUp() {
      const r = updatePlayerLevel(this.gameState.player);
      if (r.leveledUp) {
        const p = this.gameState.player;
        addLog(`\u{1F31F} Charakter \u2192 Lv.${r.newLevel}! (HP: ${p.maxHp} / MP: ${p.maxMp})`, "levelup");
        this.updateCameraZoom();
      }
    }
    // Zeigt eine Schadenszahl an der Position (x, y) in Weltkoordinaten.
    // Schadenszahl in Bildschirmgröße rendern — scharf auf jedem Zoom-Level.
    //
    // Trick: Text wird bei voller Bildschirm-Fontgröße (14px) gerendert,
    // dann per setScale(1/zoom) auf Weltgröße runterskaliert.
    // Der Kamera-Zoom hebt das wieder auf → exakt 14px auf dem Bildschirm, nie unscharf.
    // Offset und Rise ebenfalls in Bildschirm-Pixeln, dann durch Zoom geteilt.
    showDamageNumber(x, y, dmg, color) {
      const zoom = this.cameras.main.zoom;
      const scale = 1 / zoom;
      const offset = 10 / zoom;
      const rise = 18 / zoom;
      const txt = this.add.text(x, y - offset, `${Math.round(dmg)}`, {
        fontSize: "14px",
        color,
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3
      }).setOrigin(0.5).setScale(scale).setDepth(20);
      this.tweens.add({
        targets: txt,
        y: y - offset - rise,
        alpha: 0,
        duration: 900,
        ease: "Power1",
        onComplete: () => txt.destroy()
      });
    }
    activateSkill(skillId) {
      const check = canActivateSkill(this.gameState.player, skillId);
      if (!check.ok) {
        showToast(check.reason ?? "Skill nicht verf\xFCgbar.", "system");
        return;
      }
      consumeSkill(this.gameState.player, skillId);
      const skillDef = ALL_SKILLS.get(skillId);
      if (skillDef?.attackType === "dash") {
        const dist = calcDashDistance(this.gameState.player, skillId);
        const dx = this.joy.active ? this.joy.dx : 0;
        const dy = this.joy.active ? this.joy.dy : 0;
        const len = Math.hypot(dx, dy);
        if (len > 0.1) {
          const nx = dx / len;
          const ny = dy / len;
          this.slimeGraphic.setPosition(Phaser.Math.Clamp(this.slimeGraphic.x + nx * dist, 0, 1600), Phaser.Math.Clamp(this.slimeGraphic.y + ny * dist, 0, 1200));
        }
        this.skillLevelUp(gainSkillXp(this.gameState.player, skillId, 1), skillId);
        showToast(`\u{1F998} Sprung! (${dist}px)`, "system");
        updateUI(this.gameState);
        return;
      }
      const target = this.lastNearbyId ? this.gameState.world.entities.get(this.lastNearbyId) : null;
      if (!target || !target.isAlive) {
        showToast("Kein Ziel in Reichweite.", "system");
        updateUI(this.gameState);
        return;
      }
      const result = playerAttack(this.gameState.player, target, skillId);
      if (result.hit) {
        target.currentHp = Math.max(0, target.currentHp - result.damageDealt);
        for (const effect of result.statusApplied) {
          applyEffect(target, effect);
        }
        this.showDamageNumber(target.x, target.y, result.damageDealt, "#ffffff");
        if (target.currentHp <= 0) {
          target.isAlive = false;
          const def = ENTITY_MAP.get(target.definitionId);
          target.respawnAt = Date.now() + (def?.respawnTime ?? 60) * 1e3;
          resetAi(target);
          if (def)
            addLog(`${def.icon} ${def.name} wurde besiegt!`, "system");
        }
        addLog(result.message, "absorb");
        this.skillLevelUp(gainSkillXp(this.gameState.player, skillId, result.damageDealt), skillId);
        this.skillLevelUp(gainSkillXp(this.gameState.player, "superstrength", 1), "superstrength");
      } else {
        showToast(result.message, "system");
      }
      updateUI(this.gameState);
    }
    checkNearbyEntity() {
      const nearest = findNearestEntity(this.gameState.player, this.gameState.world, this.getPlayerAttackRange());
      const nearestId = nearest?.instanceId ?? null;
      if (nearestId !== this.lastNearbyId) {
        this.lastNearbyId = nearestId;
        updateNearbyPanel(nearest ? ENTITY_MAP.get(nearest.definitionId) : void 0, nearest ?? void 0, this.gameState);
      }
    }
    // ----------------------------------------------------------
    // INTERAKTIONEN — Public (für HTML-Buttons und Joystick)
    // ----------------------------------------------------------
    doAbsorb() {
      if (!this.lastNearbyId) {
        showToast("Keine Entity in Reichweite.", "system");
        return;
      }
      const result = absorbEntity(this.gameState.player, this.gameState.world, this.lastNearbyId);
      showInteractionResult(result, this.gameState);
      if (result.success) {
        syncPassiveEffects(this.gameState.player);
        this.lastNearbyId = null;
        updateNearbyPanel(void 0, void 0, this.gameState);
      }
      this.checkPlayerLevelUp();
      updateUI(this.gameState);
    }
    doAnalyze() {
      if (!this.lastNearbyId) {
        showToast("Keine Entity in Reichweite.", "system");
        return;
      }
      const result = analyzeEntity(this.gameState.player, this.gameState.world, this.lastNearbyId);
      showInteractionResult(result, this.gameState);
      if (result.success)
        syncPassiveEffects(this.gameState.player);
      this.checkPlayerLevelUp();
      updateUI(this.gameState);
    }
    doGrow() {
      const result = useGrow(this.gameState.player);
      showToast(result.message, result.success ? "absorb" : "system");
      if (result.success)
        updateUI(this.gameState);
    }
    togglePassiveSkill(skillId) {
      const inst = this.gameState.player.discoveredSkills.get(skillId);
      if (!inst)
        return;
      inst.isEnabled = inst.isEnabled === false ? true : false;
      syncPassiveEffects(this.gameState.player);
      updateUI(this.gameState);
      const state = inst.isEnabled ? "aktiviert" : "deaktiviert";
      showToast(`${ALL_SKILLS.get(skillId)?.name ?? skillId} ${state}`, "system");
    }
    doCombine(skillIdA, skillIdB) {
      const result = combineSkills(this.gameState.player, skillIdA, skillIdB);
      showCombineResult(result);
      this.checkPlayerLevelUp();
      updateUI(this.gameState);
      return result;
    }
    // ----------------------------------------------------------
    // HILFSFUNKTION
    // ----------------------------------------------------------
    findEntityNear(wx, wy, radius) {
      for (const instance of this.gameState.world.entities.values()) {
        if (!instance.isAlive)
          continue;
        if (Math.hypot(instance.x - wx, instance.y - wy) < radius) {
          return instance;
        }
      }
      return null;
    }
  };
  function updateUI(state) {
    const p = state.player;
    setEl("ui-level", `Lv.${p.level}`);
    setEl("ui-hp", `${Math.floor(p.hp)}/${p.maxHp}`);
    setEl("ui-mp", `${p.mp}/${p.maxMp}`);
    setStyle("hp-bar-fill", "width", `${p.hp / p.maxHp * 100}%`);
    setStyle("mp-bar-fill", "width", `${p.mp / p.maxMp * 100}%`);
    const { xpIntoLevel, xpToNext } = calcPlayerLevel(p.totalExp);
    setStyle("xp-bar-fill", "width", `${xpIntoLevel / xpToNext * 100}%`);
    setEl("ui-analyze-level", `\u{1F50D} Lv.${p.coreAbilities.analyze.level} (${p.coreAbilities.analyze.currentXp}/${p.coreAbilities.analyze.xpToNextLevel} XP)`);
    setEl("ui-absorb-level", `\u{1F4A5} Lv.${p.coreAbilities.absorb.level} (${p.coreAbilities.absorb.currentXp}/${p.coreAbilities.absorb.xpToNextLevel} XP)`);
    renderSkillList(state);
    renderCombinePanel(state);
    renderMaterials(state);
  }
  function renderSkillList(state) {
    const container = document.getElementById("skills-list");
    if (!container)
      return;
    const skills = getDiscoveredSkillsSorted(state.player);
    if (skills.length === 0) {
      container.innerHTML = '<p class="empty-hint">Noch keine Skills entdeckt.<br>N\xE4here dich einer Entity und tippe \u{1F4A5} Absorb oder \u{1F50D} Analyze.</p>';
      return;
    }
    container.innerHTML = skills.map((inst) => {
      const def = ALL_SKILLS.get(inst.definitionId);
      if (!def)
        return "";
      const progress = getXpProgress(inst);
      const maxed = isMaxLevel(inst);
      const isPassive = def.activation === "passive";
      const hasGrow = def.id === "grow" && !maxed;
      const enabled = inst.isEnabled !== false;
      return `
        <div class="skill-card element-${def.element}${isPassive && !enabled ? " skill-disabled" : ""}">
          <div class="skill-header">
            <span class="skill-icon">${def.icon}</span>
            <span class="skill-name">${def.name}</span>
            ${def.category === "combo" ? '<span class="combo-badge">COMBO</span>' : ""}
            ${isPassive ? '<span class="combo-badge" style="background:#4af0c8;color:#000">PASSIV</span>' : ""}
            <span class="skill-level">Lv.${inst.level}${maxed ? " MAX" : ""}</span>
            ${isPassive ? `<button class="btn-passive-toggle" onclick="window.togglePassiveSkill('${def.id}')">${enabled ? "AN" : "AUS"}</button>` : ""}
          </div>
          <div class="xp-bar-wrap">
            <div class="xp-bar-fill" style="width:${progress * 100}%"></div>
          </div>
          <div class="skill-xp-text">
            ${maxed ? "Maximales Level" : `${inst.currentXp} / ${inst.xpToNextLevel} XP`}
          </div>
          <div class="skill-desc">${def.description}</div>
          ${hasGrow ? `<button class="btn-grow" onclick="window.doGrow()">\u{1F331} Grow anwenden (\u22125 Pflanzenfaser)</button>` : ""}
        </div>
      `;
    }).filter(Boolean).join("");
  }
  function renderCombinePanel(state) {
    const selects = ["combine-a", "combine-b"];
    for (const selId of selects) {
      const sel = document.getElementById(selId);
      if (!sel)
        continue;
      const current = sel.value;
      sel.innerHTML = '<option value="">\u2014 Skill w\xE4hlen \u2014</option>';
      for (const [id, inst] of state.player.discoveredSkills) {
        const def = ALL_SKILLS.get(id);
        if (!def || def.category !== "basic")
          continue;
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = `${def.icon} ${def.name} (Lv.${inst.level})`;
        sel.appendChild(opt);
      }
      if (current)
        sel.value = current;
    }
  }
  function renderMaterials(state) {
    const container = document.getElementById("materials-list");
    if (!container)
      return;
    const mats = getMaterialList(state.player);
    if (mats.length === 0) {
      container.innerHTML = '<p class="empty-hint">Noch keine Materialien gesammelt.<br>Absorbiere Pflanzen oder Steine.</p>';
      return;
    }
    container.innerHTML = mats.map((m) => `
      <div class="material-row">
        <span class="mat-icon">${m.icon}</span>
        <span class="mat-name">${m.name}</span>
        <span class="mat-amount">\xD7${m.formatted}</span>
      </div>
    `).join("");
  }
  function updateNearbyPanel(entityDef, instance, state) {
    const panel = document.getElementById("nearby-panel");
    if (!panel)
      return;
    if (!entityDef) {
      panel.innerHTML = '<span class="empty-hint">Keine Entity in Reichweite</span>';
      return;
    }
    const absorbLevel = state.player.coreAbilities.absorb.level;
    const analyzeLevel = state.player.coreAbilities.analyze.level;
    const bonusLv = instance?.bonusLevel ?? 0;
    const effectiveLv = entityDef.level + bonusLv;
    const absorbChance = Math.round(calcSuccessChance(absorbLevel, effectiveLv) * 100);
    const analyzeChance = Math.round(calcSuccessChance(analyzeLevel, effectiveLv) * 100);
    const scaledMaxHp = getScaledMaxHp(entityDef, bonusLv);
    const currentHp = Math.ceil(instance?.currentHp ?? scaledMaxHp);
    const hpPct = Math.round(Math.max(0, currentHp / scaledMaxHp) * 100);
    const hpColor = hpPct > 50 ? "#44cc44" : hpPct > 25 ? "#cccc44" : "#cc4444";
    const bonusStars = bonusLv > 0 ? ` ${"\u2605".repeat(bonusLv)}` : "";
    const skillLines = [];
    if (entityDef.skillLevels) {
      for (const [skillId, level] of Object.entries(entityDef.skillLevels)) {
        const s = ALL_SKILLS.get(skillId);
        if (s)
          skillLines.push(`${s.icon} ${s.name} Lv.${level}`);
      }
    }
    const effectiveDmg = getEntityBaseDamage(entityDef);
    const ownSkillIds = new Set(Object.keys(entityDef.skillLevels ?? {}));
    const dropLines = entityDef.skillDrops.filter((d) => !ownSkillIds.has(d.skillId)).map((drop) => {
      const s = ALL_SKILLS.get(drop.skillId);
      return s ? `${s.icon} ${s.name} (${Math.round(drop.chance * 100)}%)` : "";
    }).filter(Boolean);
    panel.innerHTML = `
    <div class="nearby-entity">
      <span class="nearby-icon">${entityDef.icon}</span>
      <div style="flex:1;min-width:0">
        <div>
          <span class="nearby-name">${entityDef.name}</span>
          <span style="color:var(--muted);font-size:.72em"> Lv.${effectiveLv}${bonusStars}</span>
        </div>
        <div style="margin:3px 0 2px">
          <div style="height:6px;background:#222;border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${hpPct}%;background:${hpColor};transition:width .2s"></div>
          </div>
          <span style="font-size:.65em;color:var(--muted)">${currentHp}/${scaledMaxHp} HP</span>
        </div>
        <div style="font-size:.68em;color:var(--muted)">
          \u2694\uFE0F ${effectiveDmg} &nbsp;|&nbsp; \u{1F4A8} ${entityDef.speed ?? "\u2013"}
        </div>
      </div>
    </div>
    ${skillLines.length ? `<div style="font-size:.68em;color:#ccc;margin:4px 0 2px"><b>Skills:</b> ${skillLines.join(" &nbsp; ")}</div>` : ""}
    ${dropLines.length ? `<div style="font-size:.68em;color:var(--muted);margin:2px 0">\u{1F381} ${dropLines.join(", ")}</div>` : ""}
    <div style="font-size:.65em;color:var(--muted);margin:3px 0">
      \u{1F4A5} Absorb ${absorbChance}% &nbsp;|&nbsp; \u{1F50D} Analyze ${analyzeChance}%
    </div>
    <div class="nearby-actions">
      <button onclick="window.gameScene.doAbsorb()" class="btn-absorb">\u{1F4A5} Absorb</button>
      <button onclick="window.gameScene.doAnalyze()" class="btn-analyze">\u{1F50D} Analyze</button>
    </div>
  `;
  }
  function showInteractionResult(result, state) {
    const type = result.method;
    if (!result.success) {
      const logType = result.aggroTriggered ? "aggro" : "system";
      addLog(result.message, logType);
      showToast(result.message, "system");
      return;
    }
    const skillLines = result.skillResults.map((r) => {
      const def = ALL_SKILLS.get(r.skillId);
      if (!def)
        return "";
      if (r.wasNewDiscovery)
        return `\u2728 ${def.name} entdeckt!`;
      if (r.leveledUp)
        return `\u2B06\uFE0F ${def.name} \u2192 Lv.${r.newLevel}`;
      return `+${r.xpGained} XP f\xFCr ${def.name}`;
    }).filter(Boolean);
    const matLines = result.materialResults.map((m) => {
      const def = MATERIAL_MAP.get(m.materialId);
      return def ? `${def.icon} +${m.amount} ${def.name}` : "";
    }).filter(Boolean);
    const allLines = [...skillLines, ...matLines];
    const detail = allLines.join(" \xB7 ");
    addLog(`${result.message}${detail ? ` \u2014 ${detail}` : ""}`, type);
    showToast(`${result.message}${detail ? `
${detail}` : ""}`, type);
  }
  function showToast(msg, type) {
    const el = document.getElementById("notification");
    if (!el)
      return;
    el.textContent = msg;
    el.className = `notification show notification-${type}`;
    setTimeout(() => el.classList.remove("show"), 2800);
  }
  function addLog(msg, type = "system") {
    const logState = window._log ?? (window._log = { log: [] });
    logState.log.unshift({ msg, type });
    if (logState.log.length > 50)
      logState.log.pop();
    const el = document.getElementById("logList");
    if (el) {
      el.innerHTML = logState.log.slice(0, 30).map((l) => `<div class="log-entry ${l.type}">${l.msg}</div>`).join("");
    }
  }
  function showCombineResult(result) {
    const out = document.getElementById("combine-result");
    if (!out)
      return;
    out.textContent = result.message;
    out.className = `combine-result outcome-${result.outcome}`;
  }
  function switchTab(name) {
    window._currentTab = name;
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    document.querySelectorAll(`.tab-btn[data-tab="${name}"]`).forEach((b) => b.classList.add("active"));
    const el = document.getElementById(`tab-${name}`);
    if (el)
      el.classList.add("active");
    syncMobileTab(name);
  }
  function syncMobileTab(name) {
    const mc = document.getElementById("mobileTabContent");
    const src = document.getElementById(`tab-${name}`);
    if (mc && src)
      mc.innerHTML = src.innerHTML;
  }
  function toggleSheet() {
    document.getElementById("bottomSheet")?.classList.toggle("open");
    syncMobileTab(window._currentTab ?? "skills");
  }
  function setEl(id, text) {
    const el = document.getElementById(id);
    if (el)
      el.textContent = text;
  }
  function setStyle(id, prop, value) {
    const el = document.getElementById(id);
    if (el)
      el.style[prop] = value;
  }
  window.addEventListener("load", () => {
    new Phaser.Game({
      type: Phaser.AUTO,
      parent: "canvas-wrap",
      backgroundColor: "#0a0d14",
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      physics: { default: "arcade", arcade: { debug: false } },
      scene: [BootScene, GameScene]
    });
  });
})();
