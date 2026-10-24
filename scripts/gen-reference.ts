// Erzeugt docs/GDD-06-Referenz.md aus den Spieldaten (Skills + Einheiten).
// Wird von build.js bei jedem Build ausgeführt — die Datei nie von Hand bearbeiten.

import { writeFileSync } from "fs";
import type { SkillDefinition, SkillEffect, LinearFormula, EffectType } from "../src/types/Skill";
import type { EntityDefinition } from "../src/types/Entity";
import type { DamageType } from "../src/types/Combat";
import { CORE_SKILLS, BASE_SKILLS, PLANT_SKILLS, COMBO_SKILLS } from "../src/data/skills";
import { ENTITY_DEFINITIONS } from "../src/data/entities";
import { MATERIAL_MAP } from "../src/data/materials";
import { ANALYZE_CHANCE_MODIFIER, MILLI } from "../src/data/balance";
import { GAME_VERSION } from "../src/data/version";
import { BIOME_SPAWNS } from "../src/world/BiomeDefinitions";
import { evalFormula, resolveDefenderEffects, resolveAttackerEffects } from "../src/systems/SkillEffectSystem";
import { calcSkillAttackDamage, calcJumpDistance, calcPhotosynthesisHeal } from "../src/systems/SkillEffects";
import {
  getEntityBaseDamage, getEntityRangedDamage, getScaledMaxHp, getScaledDamage, getScaledSpeed,
} from "../src/systems/EntityLevelingSystem";
import { getEntityAttackDamageType } from "../src/systems/CombatSystem";

const LEVELS = [1, 2, 3, 5, 10, 20];
const ALL_DAMAGE_TYPES: DamageType[] = ["pierce", "slash", "blunt", "acid", "fire", "poison", "magic", "psychic"];

// ── Übersetzungen ──────────────────────────────────────────
const DAMAGE_TYPE_DE: Record<DamageType, string> = {
  pierce: "Stich", slash: "Schnitt", blunt: "Wucht", acid: "Säure",
  fire: "Feuer", poison: "Gift", magic: "Magie", psychic: "Psychisch",
};
const TRIGGER_DE: Record<string, string> = {
  passive: "passiv", on_hit_enemy: "bei Treffer", on_receive_damage: "bei erlittenem Schaden",
  on_activate: "bei Aktivierung", on_kill: "bei Kill", per_second: "pro Sekunde", on_move: "bei Bewegung",
};
const EFFECT_DE: Record<EffectType, string> = {
  deal_damage: "Schaden", flat_block: "Flat-Block", percent_reduce: "%-Reduktion", weakness: "Schwäche",
  heal_flat: "Heilung", heal_percent: "Heilung %", apply_status: "Status-Chance", reflect_damage: "Rückschlag",
  damage_mult: "Schadens-Multiplikator", speed_mod: "Tempo-Multiplikator", grant_penetration: "Penetration",
};
const CATEGORY_DE: Record<string, string> = { core: "Kern", basic: "Basis", combo: "Kombo" };
const ACTIVATION_DE: Record<string, string> = { active: "aktiv", passive: "passiv" };
const ENTITY_CATEGORY_DE: Record<string, string> = { creature: "Kreatur", plant: "Pflanze", mineral: "Mineral" };
const BEHAVIOR_DE: Record<string, string> = {
  passive: "passiv", defensive: "defensiv", aggressive: "aggressiv", territorial: "territorial", rare: "scheu",
};
const DISPOSITION_DE: Record<string, string> = { neutral: "neutral", hostile: "feindlich" };
const RARITY_DE: Record<string, string> = { common: "häufig", uncommon: "ungewöhnlich", rare: "selten", legendary: "legendär" };
const BIOME_DE: Record<string, string> = {
  forest: "Wald", swamp: "Sumpf", highland: "Hochland", mountain: "Gebirge", desert: "Wüste", dungeon: "Dungeon",
};

// ── Formatierung ───────────────────────────────────────────
const num = (n: number, digits = 2) => n.toLocaleString("de-DE", { maximumFractionDigits: digits });
const hp = (milli: number) => `${num(milli / MILLI)}`;
const pct = (x: number) => `${num(x * 100, 1)} %`;
const factor = (x: number) => `×${num(x)}`;
const dash = (v: unknown) => (v === undefined || v === null || v === "" ? "—" : String(v));
const seconds = (ms?: number) => (ms === undefined ? "—" : `${num(ms / 1000)} s`);

const ABSOLUTE_EFFECTS: EffectType[] = ["deal_damage", "flat_block", "heal_flat", "reflect_damage", "grant_penetration"];
const PERCENT_EFFECTS: EffectType[] = ["percent_reduce", "apply_status", "heal_percent"];

function formatEffectValue(type: EffectType, value: number): string {
  if (ABSOLUTE_EFFECTS.includes(type)) return `${num(value)} HP`;
  if (PERCENT_EFFECTS.includes(type)) return pct(value);
  return factor(value);
}

function formatFormula(f: LinearFormula): string {
  const curve = f.curve ?? "linear";
  const step = curve === "sqrt" ? "√(L−1)" : curve === "log" ? "log₂(L)" : "(L−1)";
  return f.perLevel === 0 ? `${num(f.base, 3)} (konstant)` : `${num(f.base, 3)} + ${num(f.perLevel, 3)}·${step}`;
}

function formatCondition(e: SkillEffect): string {
  const c = e.condition;
  if (!c) return "—";
  const parts: string[] = [];
  if (c.damageType) {
    const types = Array.isArray(c.damageType) ? c.damageType : [c.damageType];
    parts.push(types.map((t) => DAMAGE_TYPE_DE[t]).join("/"));
  }
  if (c.hpBelow !== undefined) parts.push(`HP < ${pct(c.hpBelow)}`);
  if (c.hpAbove !== undefined) parts.push(`HP > ${pct(c.hpAbove)}`);
  if (c.hasStatus) parts.push(`Status ${c.hasStatus}`);
  return parts.join(", ");
}

function table(head: string[], rows: string[][]): string {
  return [
    `| ${head.join(" | ")} |`,
    `|${head.map(() => "---").join("|")}|`,
    ...rows.map((r) => `| ${r.join(" | ")} |`),
  ].join("\n");
}

const skillLabel = (s: SkillDefinition) => `${s.icon} ${s.name}`;
const entityLabel = (e: EntityDefinition) => `${e.icon} ${e.name}`;
const anchor = (id: string) => `[\`${id}\`](#${id.replace(/_/g, "-")})`;

const ALL_SKILL_LIST = [...CORE_SKILLS, ...BASE_SKILLS, ...PLANT_SKILLS, ...COMBO_SKILLS];
const SKILL_MAP = new Map(ALL_SKILL_LIST.map((s) => [s.id, s]));

// ── Skills ─────────────────────────────────────────────────
function skillOverview(): string {
  return table(
    ["Skill", "ID", "Kategorie", "Aktivierung", "Element", "Max-Lv", "XP Lv1→2", "XP-Faktor",
     "MP", "Cooldown", "Angriffsart", "Schadenstyp", "Basisschaden", "Effekte"],
    ALL_SKILL_LIST.map((s) => [
      skillLabel(s), anchor(s.id), CATEGORY_DE[s.category], ACTIVATION_DE[s.activation], s.element,
      s.maxLevel === 0 ? "∞" : String(s.maxLevel), String(s.baseXpThreshold), factor(s.xpThresholdMultiplier),
      s.mpCost ? hp(s.mpCost) : "—", seconds(s.cooldownMs), dash(s.attackType),
      s.damageType ? DAMAGE_TYPE_DE[s.damageType] : "—", s.baseDamage ? `${hp(s.baseDamage)} HP` : "—",
      String(s.effects?.length ?? 0),
    ])
  );
}

function derivedSkillRows(s: SkillDefinition): string[][] {
  const rows: string[][] = [];
  if (s.baseDamage) rows.push(["Schaden (HP)", ...LEVELS.map((l) => hp(calcSkillAttackDamage(s.id, l)))]);
  if (s.id === "jump") rows.push(["Sprungweite (px)", ...LEVELS.map((l) => String(calcJumpDistance(l)))]);
  if (s.id === "photosynthesis") rows.push(["Heilung (HP/s)", ...LEVELS.map((l) => hp(calcPhotosynthesisHeal(l)))]);
  return rows;
}

function skillDetail(s: SkillDefinition): string {
  const out: string[] = [`### ${skillLabel(s)}`, "", `<a id="${s.id.replace(/_/g, "-")}"></a>`, "", `> ${s.description}`, ""];

  const params: [string, string][] = [
    ["ID", `\`${s.id}\``],
    ["Kategorie / Aktivierung", `${CATEGORY_DE[s.category]} / ${ACTIVATION_DE[s.activation]}`],
    ["Element", s.element],
    ["Max-Level", s.maxLevel === 0 ? "unbegrenzt" : String(s.maxLevel)],
    ["XP-Schwelle", `${s.baseXpThreshold} XP für Lv1→2, danach ${factor(s.xpThresholdMultiplier)} pro Level`],
  ];
  if (s.mpCost !== undefined) params.push(["MP-Kosten", `${hp(s.mpCost)} MP`]);
  if (s.cooldownMs !== undefined) params.push(["Cooldown", seconds(s.cooldownMs)]);
  if (s.attackType) params.push(["Angriffsart", s.attackType]);
  if (s.damageType) params.push(["Schadenstyp", `${DAMAGE_TYPE_DE[s.damageType]} (\`${s.damageType}\`)`]);
  if (s.baseDamage !== undefined) params.push(["Basisschaden", `${hp(s.baseDamage)} HP`]);
  if (s.recipe) params.push(["Rezept", s.recipe.map((id) => `\`${id}\``).join(" + ")]);
  if (s.materialCost?.length) params.push(["Materialkosten", s.materialCost.map((m) => `${m.amount}× ${MATERIAL_MAP.get(m.materialId)?.name ?? m.materialId}`).join(", ")]);
  out.push(table(["Parameter", "Wert"], params.map(([k, v]) => [k, v])), "");

  if (s.effects?.length) {
    out.push("**Effekte**", "");
    const rows: string[][] = [];
    for (const e of s.effects) {
      rows.push([
        TRIGGER_DE[e.trigger], formatCondition(e), EFFECT_DE[e.effectType], formatFormula(e.formula),
        ...LEVELS.map((l) => formatEffectValue(e.effectType, evalFormula(e.formula, l))), e.reasoning,
      ]);
      const cfg = e.statusConfig;
      if (cfg) {
        const tick = cfg.tickIntervalMs ? ` alle ${seconds(cfg.tickIntervalMs)}` : "";
        const label = `↳ ${cfg.type.toUpperCase()} ${seconds(cfg.durationMs)}${tick}`;
        if (cfg.damageFormula) rows.push(["", "", `${label}: Schaden/Tick`, formatFormula(cfg.damageFormula),
          ...LEVELS.map((l) => `${num(evalFormula(cfg.damageFormula!, l))} HP`), ""]);
        if (cfg.healFormula) rows.push(["", "", `${label}: Heilung/Tick`, formatFormula(cfg.healFormula),
          ...LEVELS.map((l) => `${num(evalFormula(cfg.healFormula!, l))} HP`), ""]);
      }
    }
    out.push(table(["Auslöser", "Bedingung", "Wirkung", "Formel", ...LEVELS.map((l) => `Lv${l}`), "Begründung"], rows), "");
  }

  const derived = derivedSkillRows(s);
  if (derived.length) {
    out.push("**Werte nach Level**", "", table(["Wert", ...LEVELS.map((l) => `Lv${l}`)], derived), "");
  }

  const sources = ENTITY_DEFINITIONS.flatMap((e) =>
    e.skillDrops.filter((d) => d.skillId === s.id).map((d) =>
      [entityLabel(e), `Lv${e.level}`, pct(d.chance), pct(d.chance * ANALYZE_CHANCE_MODIFIER)]));
  if (sources.length) out.push("**Entdeckbar bei**", "", table(["Einheit", "Level", "Absorb", "Analyze"], sources), "");

  const users = ENTITY_DEFINITIONS.filter((e) => e.skillLevels?.[s.id] !== undefined)
    .map((e) => `${entityLabel(e)} (Lv${e.skillLevels![s.id]})`);
  if (users.length) out.push(`**Von Einheiten genutzt:** ${users.join(", ")}`, "");

  return out.join("\n");
}

// ── Einheiten ──────────────────────────────────────────────
function spawnInfo(id: string): string[] {
  return Object.entries(BIOME_SPAWNS).flatMap(([biome, entries]) => {
    const entry = entries.find((x) => x.id === id);
    if (!entry) return [];
    const total = entries.reduce((sum, x) => sum + x.weight, 0);
    return [`${BIOME_DE[biome] ?? biome} (${pct(entry.weight / total)})`];
  });
}

function entityOverview(): string {
  return table(
    ["Einheit", "ID", "Kategorie", "Lv", "Seltenheit", "Verhalten", "Gesinnung", "HP", "Tempo", "Größe",
     "Aggro-Radius", "Reichweite", "Angriffs-CD", "Nahkampf", "Respawn", "Vorkommen"],
    ENTITY_DEFINITIONS.map((e) => {
      const fights = e.category === "creature" && (e.skillLevels?.bite !== undefined || e.skillLevels?.claw !== undefined || e.damage !== undefined);
      return [
        entityLabel(e), anchor(e.id), ENTITY_CATEGORY_DE[e.category], String(e.level), RARITY_DE[e.rarity],
        BEHAVIOR_DE[e.behavior], DISPOSITION_DE[e.disposition], e.hp !== undefined ? hp(e.hp) : "—",
        dash(e.speed), dash(e.worldSize), dash(e.aggroRadius), dash(e.attackRangePx), seconds(e.attackCooldownMs),
        fights ? `${hp(getEntityBaseDamage(e))} ${DAMAGE_TYPE_DE[getEntityAttackDamageType(e)]}` : "—",
        `${e.respawnTime} s`, spawnInfo(e.id).join(", ") || "—",
      ];
    })
  );
}

function entityDetail(e: EntityDefinition): string {
  const out: string[] = [`### ${entityLabel(e)}`, "", `<a id="${e.id.replace(/_/g, "-")}"></a>`, ""];
  const params: [string, string][] = [
    ["ID", `\`${e.id}\``],
    ["Kategorie / Seltenheit", `${ENTITY_CATEGORY_DE[e.category]} / ${RARITY_DE[e.rarity]}`],
    ["Level", String(e.level)],
    ["Verhalten / Gesinnung", `${BEHAVIOR_DE[e.behavior]} / ${DISPOSITION_DE[e.disposition]}`],
    ["HP", e.hp !== undefined ? `${hp(e.hp)} HP` : "—"],
    ["Tempo", e.speed !== undefined ? `${e.speed} px/s` : "—"],
    ["Weltgröße", dash(e.worldSize)],
    ["Interaktionsradius", `${e.interactRadius} px`],
    ["Respawn", `${e.respawnTime} s`],
  ];
  if (e.aggroRadius !== undefined) params.push(["Aggro-Radius", `${e.aggroRadius} px`]);
  if (e.attackRangePx !== undefined) params.push(["Angriffsreichweite", `${e.attackRangePx} px`]);
  if (e.attackCooldownMs !== undefined) params.push(["Angriffs-Cooldown", seconds(e.attackCooldownMs)]);
  if (e.attackType) params.push(["Angriffsart", e.attackType]);
  if (e.rangedAttackSkillId) {
    params.push(["Fernkampf", `\`${e.rangedAttackSkillId}\` · ${hp(getEntityRangedDamage(e))} HP · ${dash(e.rangedAttackRangePx)} px · ${seconds(e.rangedAttackCooldownMs)}`]);
  }
  const vorkommen = spawnInfo(e.id);
  params.push(["Vorkommen", vorkommen.length ? vorkommen.join(", ") : "—"]);
  // Altfelder: vom Kampfsystem nicht mehr ausgewertet, nur zur Vollständigkeit
  if (e.damage !== undefined) params.push(["`damage` (Altfeld)", `${hp(e.damage)} HP`]);
  if (e.damageReduction !== undefined) params.push(["`damageReduction` (Altfeld)", pct(e.damageReduction)]);
  if (e.venomChance !== undefined) params.push(["`venomChance` (Altfeld)", pct(e.venomChance)]);
  if (e.venomDamagePerTick !== undefined) params.push(["`venomDamagePerTick` (Altfeld)", `${hp(e.venomDamagePerTick)} HP`]);
  out.push(table(["Parameter", "Wert"], params), "");

  const skillLevels = e.skillLevels ?? {};
  const skillIds = Object.keys(skillLevels);
  if (skillIds.length) {
    out.push(`**Skills:** ${skillIds.map((id) => {
      const s = SKILL_MAP.get(id);
      return `${s ? skillLabel(s) : id} Lv${skillLevels[id]}`;
    }).join(", ")}`, "");

    if (e.category === "creature" && (skillLevels.bite !== undefined || skillLevels.claw !== undefined || e.damage !== undefined)) {
      const atk = resolveAttackerEffects(skillLevels);
      const dmg = getEntityBaseDamage(e);
      const cd = e.attackCooldownMs ?? 1500;
      out.push(`**Nahkampf:** ${hp(dmg)} HP ${DAMAGE_TYPE_DE[getEntityAttackDamageType(e)]}` +
        (atk.damageMult !== 1 ? ` ${factor(atk.damageMult)}` : "") +
        ` alle ${seconds(cd)} ≈ ${num((dmg * atk.damageMult) / MILLI / (cd / 1000))} HP/s (vor Rüstung des Ziels)`, "");
    }

    const onHit = skillIds.flatMap((id) => (SKILL_MAP.get(id)?.effects ?? [])
      .filter((x) => x.trigger === "on_hit_enemy" && x.effectType === "apply_status" && x.statusConfig?.damageFormula)
      .map((x) => `${SKILL_MAP.get(id)!.name}: ${pct(evalFormula(x.formula, skillLevels[id]))} Chance, ` +
        `${num(evalFormula(x.statusConfig!.damageFormula!, skillLevels[id]))} HP/Tick für ${seconds(x.statusConfig!.durationMs)}`));
    if (onHit.length) out.push(`**Bei Treffer:** ${onHit.join("; ")}`, "");

    const defRows = ALL_DAMAGE_TYPES.map((t) => {
      const d = resolveDefenderEffects(skillLevels, t);
      return [DAMAGE_TYPE_DE[t], d.flatBlock ? `${hp(d.flatBlock)} HP` : "—", d.percentReduce ? pct(d.percentReduce) : "—",
        d.weaknessMult !== 1 ? factor(d.weaknessMult) : "—", d.immune ? "ja" : "—"];
    }).filter((r) => r.slice(1).some((v) => v !== "—"));
    const reflect = resolveDefenderEffects(skillLevels).reflectDamage;
    if (defRows.length) out.push("**Verteidigung nach Schadenstyp**", "", table(["Schadenstyp", "Flat-Block", "Reduktion", "Faktor", "Immun"], defRows), "");
    if (reflect) out.push(`**Rückschlag bei erlittenem Treffer:** ${hp(reflect)} HP`, "");
  }

  if (e.hp !== undefined && e.category === "creature") {
    out.push("**Bonus-Level (Entity-Leveling)**", "", table(
      ["Bonus", "HP", "Nahkampf", "Tempo"],
      [0, 1, 2, 3].map((b) => [`+${b}`, `${hp(getScaledMaxHp(e, b))} HP`, `${hp(getScaledDamage(e, b))} HP`, `${getScaledSpeed(e, b)} px/s`])
    ), "");
  }

  if (e.skillDrops.length) {
    out.push("**Skill-Drops**", "", table(["Skill", "Absorb", "Analyze"], e.skillDrops.map((d) => {
      const s = SKILL_MAP.get(d.skillId);
      return [s ? `${skillLabel(s)} (${anchor(s.id)})` : d.skillId, pct(d.chance), pct(d.chance * ANALYZE_CHANCE_MODIFIER)];
    })), "");
  }
  if (e.materialDrops.length) {
    out.push("**Material-Drops**", "", table(["Material", "Menge", "Chance"], e.materialDrops.map((d) => {
      const m = MATERIAL_MAP.get(d.materialId);
      return [m ? `${m.icon} ${m.name}` : d.materialId, `${d.amountMin}–${d.amountMax}`, pct(d.chance)];
    })), "");
  }
  return out.join("\n");
}

// ── Dokument ───────────────────────────────────────────────
const doc = [
  "# ABSORB & EVOLVE — Game Design Document",
  "## Datei 06: Referenz — Alle Skills und Einheiten",
  "",
  "> **Automatisch generiert** aus `src/data/` durch `scripts/gen-reference.ts` (läuft bei jedem `node build.js`).",
  "> Nicht von Hand bearbeiten — Änderungen gehören in die Datendateien.",
  "",
  "Werte in HP/MP sind Anzeige-Einheiten (intern ×1000, siehe [GDD-05](GDD-05-Kampfmathematik.md)).",
  `Analyze-Chancen = Absorb-Chance × ${num(ANALYZE_CHANCE_MODIFIER)}. Level-Spalten zeigen Lv ${LEVELS.join(", ")}.`,
  "",
  "**Inhalt:** [1. Skills](#1-skills) · [2. Einheiten](#2-einheiten)",
  "",
  "---",
  "",
  "## 1. Skills",
  "",
  skillOverview(),
  "",
  ...ALL_SKILL_LIST.map(skillDetail),
  "---",
  "",
  "## 2. Einheiten",
  "",
  entityOverview(),
  "",
  "Fehlende Werte nutzen im Spiel Standardwerte: Tempo 60 px/s, Reichweite 60 px, Angriffs-CD 1,5 s, Aggro-Radius 2,5 × Weltgröße.",
  "Vorkommen in % = Anteil am Spawn-Gewicht des Bioms.",
  "",
  ...ENTITY_DEFINITIONS.map(entityDetail),
  "---",
  "",
  `*Generiert für v${GAME_VERSION}*`,
  "",
].join("\n");

writeFileSync("docs/GDD-06-Referenz.md", doc);
