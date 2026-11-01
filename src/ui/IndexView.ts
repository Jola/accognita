// ============================================================
// INDEX VIEW — Nachschlagewerk aller Skills und Einheiten
//
// Selbstständiges DOM-Modul für den INDEX-Tab des Spielmenüs.
// Liest nur statische Spieldaten; alle Werte werden über die
// echten Systeme berechnet und sind daher immer aktuell.
// ============================================================

import type { SkillDefinition, SkillEffect, SkillValue, EffectType } from "../types/Skill";
import type { EntityDefinition } from "../types/Entity";
import type { DamageType, HitProfile } from "../types/Combat";
import { CORE_SKILLS, BASE_SKILLS, PLANT_SKILLS, COMBO_SKILLS, ALL_SKILLS } from "../data/skills.js";
import { ENTITY_DEFINITIONS, ENTITY_MAP } from "../data/entities.js";
import { MATERIAL_MAP } from "../data/materials.js";
import { ANALYZE_CHANCE_MODIFIER, MILLI, DEFAULT_HIT_PROFILE, HIT_DAMAGE_MULT } from "../data/balance.js";
import { calcHitChances, HIT_GRADES, HIT_GRADE_DE } from "../systems/HitSystem.js";
import { DAMAGE_TYPE_DE } from "../systems/DamageSystem.js";
import { getEffectValue } from "../systems/StatsSystem.js";
import { BIOME_SPAWNS } from "../world/BiomeDefinitions.js";
import { SKILL_RANKS, NATUR_PROGRESS, LEVEL_AT_NATUR } from "../data/progression.js";
import { xpForProgress, getEntitySkillProgress, rankNameForProgress, levelFromProgress } from "../systems/ProgressionSystem.js";
import { evalSkillValue, resolveDefenderEffects, resolveAttackerEffects, resolveDexterity } from "../systems/SkillEffectSystem.js";
import {
  calcSkillAttackDamage, calcJumpDistance, calcPhotosynthesisHeal, JUMP_DISTANCE_PX, PHOTOSYNTHESIS_HEAL_HP_PER_S,
} from "../systems/SkillEffects.js";
import { venomDurationMs, venomBiteChance, venomDoseMilli } from "../systems/VenomSystem.js";
import { valueChart, isConstant, attachChartHover, VALUE_CHART_CSS, type ChartSeries } from "./ValueChart.js";
import { VENOM_HALF_LIFE_MS, VENOM_MIN_RATE_HP_PER_S } from "../data/venom.js";
import {
  getEntityBaseDamage, getEntityRangedDamage, getScaledMaxHp, getScaledDamage, getScaledSpeed,
} from "../systems/EntityLevelingSystem.js";
import { getEntityAttackDamageType, getEntityMeleeHitBasis, getEntityMeleeSkillId } from "../systems/CombatSystem.js";

// Werte-Tabellen: Fortschritt zu Beginn jedes Rangs, dazu der Höchstwert
// (p = 1, wird nie ganz erreicht). Dazwischen fließend.
const LEVELS = [...SKILL_RANKS.map((r) => r.fromProgress), 1];
const LEVEL_HEADS = [...SKILL_RANKS.map((r) => `${r.name} ${Math.round(r.fromProgress * 100)} %`), "Max"];
const ALL_DAMAGE_TYPES: DamageType[] = ["pierce", "slash", "blunt", "acid", "fire", "poison", "magic", "psychic"];
const ALL_SKILL_LIST = [...CORE_SKILLS, ...BASE_SKILLS, ...PLANT_SKILLS, ...COMBO_SKILLS];

// ── Übersetzungen ──────────────────────────────────────────
const TRIGGER_DE: Record<string, string> = {
  passive: "passiv", on_hit_enemy: "bei Treffer", on_receive_damage: "bei erlittenem Schaden",
  on_activate: "bei Aktivierung", on_kill: "bei Kill", per_second: "pro Sekunde", on_move: "bei Bewegung",
};
const EFFECT_DE: Record<EffectType, string> = {
  deal_damage: "Schaden", flat_block: "Flat-Block", percent_reduce: "%-Reduktion", weakness: "Schwäche",
  heal_flat: "Heilung", heal_percent: "Heilung %", apply_status: "Status-Chance", inject_venom: "Gift-Chance", reflect_damage: "Rückschlag",
  damage_mult: "Schadens-Multiplikator", speed_mod: "Tempo-Multiplikator", grant_penetration: "Penetration",
  dexterity: "Geschick",
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
const hp = (milli: number) => num(milli / MILLI);
const pct = (x: number) => `${num(x * 100, 1)} %`;
const factor = (x: number) => `×${num(x)}`;
const seconds = (ms?: number) => (ms === undefined ? "—" : `${num(ms / 1000)} s`);
const orDash = (v: unknown) => (v === undefined || v === null ? "—" : String(v));

const ABSOLUTE_EFFECTS: EffectType[] = ["deal_damage", "flat_block", "heal_flat", "reflect_damage", "grant_penetration"];
const PERCENT_EFFECTS: EffectType[] = ["percent_reduce", "apply_status", "inject_venom", "heal_percent"];

function formatEffectValue(type: EffectType, value: number): string {
  if (ABSOLUTE_EFFECTS.includes(type)) return `${num(value)} HP`;
  if (PERCENT_EFFECTS.includes(type)) return pct(value);
  if (type === "dexterity") return `+${num(value)}`;
  return factor(value);
}

/** „1 → 16 HP (Natur 14,5 HP)“ — allgemeines Schema start + (max − start) × p */
function formatFormula(f: SkillValue, fmt: (v: number) => string): string {
  if (f.start === f.max) return `${fmt(f.start)} (konstant)`;
  return `${fmt(f.start)} → ${fmt(f.max)} (Natur ${fmt(evalSkillValue(f, NATUR_PROGRESS))})`;
}

/** „1 HP + 15 HP × p“ — Rechenformel eines Werts im Fortschritt p (Schema start + (max − start) × p) */
function valueFormula(v: SkillValue, fmt: (x: number) => string): string {
  const step = `${fmt(v.max - v.start)} × p`;
  return v.start === 0 ? step : `${fmt(v.start)} + ${step}`;
}

function effectFormula(type: EffectType, v: SkillValue): string {
  if (ABSOLUTE_EFFECTS.includes(type)) return valueFormula(v, (x) => `${num(x)} HP`);
  if (PERCENT_EFFECTS.includes(type)) return valueFormula(v, pct);
  if (type === "dexterity") return valueFormula(v, (x) => num(x));
  return `×(${valueFormula(v, (x) => num(x))})`;
}

// Gift: über TAIL HP baut die Halbwertszeit ab, darunter die Mindestrate (venom.ts Abschnitte 3–4)
const VENOM_TAIL_HP = (VENOM_MIN_RATE_HP_PER_S * VENOM_HALF_LIFE_MS / 1000) / Math.LN2;
const venomDurationFormula = (dose: string) =>
  `${num(VENOM_HALF_LIFE_MS / 1000)} s × log₂(Dosis / ${num(VENOM_TAIL_HP)} HP) + ${num(VENOM_TAIL_HP / VENOM_MIN_RATE_HP_PER_S)} s ` +
  `(Dosis unter ${num(VENOM_TAIL_HP)} HP: Dosis ÷ ${num(VENOM_MIN_RATE_HP_PER_S)} HP/s), Dosis = ${dose}`;

function formatCondition(e: SkillEffect): string {
  const c = e.condition;
  if (!c) return "";
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

// ── HTML-Bausteine ─────────────────────────────────────────
const skillChip = (s: SkillDefinition, suffix = "") =>
  `<button class="idx-chip" data-skill="${s.id}">${s.icon} ${s.name}${suffix}</button>`;
const entityChip = (e: EntityDefinition, suffix = "") =>
  `<button class="idx-chip" data-entity="${e.id}">${e.icon} ${e.name}${suffix}</button>`;

function params(rows: [string, string][]): string {
  return `<table class="idx-params">${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}</table>`;
}

function dataTable(head: string[], rows: string[][]): string {
  return `<div class="idx-scroll"><table class="idx-table">
    <tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr>
    ${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}
  </table></div>`;
}

const levelTable = (rows: [string, string[]][]) =>
  dataTable(["", ...LEVEL_HEADS], rows.map(([label, vals]) => [label, ...vals]));

const section = (title: string, html: string) => (html ? `<h4 class="idx-h">${title}</h4>${html}` : "");

function titleBlock(icon: string, name: string, sub: string): string {
  return `<div class="idx-title"><span>${icon}</span><div><h3>${name}</h3><small>${sub}</small></div></div>`;
}

/** Treffer-Stufen pro Level (Geschick beider Seiten 0) */
function hitTable(profile: HitProfile): string {
  return dataTable(
    ["Stufe", "Schaden", ...LEVEL_HEADS],
    HIT_GRADES.map((g) => [
      HIT_GRADE_DE[g], factor(HIT_DAMAGE_MULT[g]),
      ...LEVELS.map((l) => pct(calcHitChances(profile, l, 0, 0)[g])),
    ])
  );
}

/** Eine Zeile: "Verfehlt 3 % · Leichter Treffer 17 % · …" */
function hitLine(chances: HitProfile): string {
  return HIT_GRADES.map((g) => `${HIT_GRADE_DE[g]} ${pct(chances[g])}`).join(" · ");
}

// ── Gemeinsame Ableitungen ─────────────────────────────────
/** „Übung 23 % · 24 XP“ — Rang, Fortschritt und Erfahrung einer Einheit in einem Skill */
function skillXpLabel(e: EntityDefinition, skillId: string): string {
  const p = getEntitySkillProgress(e)[skillId];
  return `${rankNameForProgress(p)} ${Math.floor(p * 100)} % · ${num(e.skillXp![skillId])} XP`;
}

function canMelee(e: EntityDefinition): boolean {
  return e.category === "creature" && (getEntityMeleeSkillId(e) !== undefined || e.damage !== undefined);
}

function biomeShares(id: string): { name: string; share: number }[] {
  return Object.entries(BIOME_SPAWNS).flatMap(([biome, entries]) => {
    const entry = entries.find((x) => x.id === id);
    if (!entry) return [];
    const total = entries.reduce((sum, x) => sum + x.weight, 0);
    return [{ name: BIOME_DE[biome] ?? biome, share: entry.weight / total }];
  });
}

// ── Listen ─────────────────────────────────────────────────
function matches(query: string, ...fields: string[]): boolean {
  return !query || fields.some((f) => f.toLowerCase().includes(query));
}

function row(attr: string, icon: string, name: string, meta: string): string {
  return `<button class="idx-row" ${attr}><span class="idx-icon">${icon}</span>
    <span class="idx-main"><b>${name}</b><small>${meta}</small></span><span class="idx-chev">›</span></button>`;
}

function skillList(query: string): string {
  const groups: [string, SkillDefinition[]][] = [
    ["Kern-Fähigkeiten", CORE_SKILLS],
    ["Basis-Skills", [...BASE_SKILLS, ...PLANT_SKILLS]],
    ["Kombo-Skills", COMBO_SKILLS],
  ];
  const html = groups.map(([title, list]) => {
    const rows = list.filter((s) => matches(query, s.name, s.id)).map((s) => {
      const meta = [CATEGORY_DE[s.category], ACTIVATION_DE[s.activation]];
      if (s.damageType && s.damage) meta.push(`${DAMAGE_TYPE_DE[s.damageType]} ${num(s.damage.start)}–${num(s.damage.max)} HP`);
      if (s.mpCost) meta.push(`${hp(s.mpCost)} MP`);
      return row(`data-skill="${s.id}"`, s.icon, s.name, meta.join(" · "));
    });
    return rows.length ? `<div class="idx-group">${title}</div>${rows.join("")}` : "";
  }).join("");
  return html || `<p class="empty-hint">Kein Skill gefunden.</p>`;
}

function entityList(query: string): string {
  const groups: [string, EntityDefinition["category"]][] = [
    ["Kreaturen", "creature"], ["Pflanzen", "plant"], ["Mineralien", "mineral"],
  ];
  const html = groups.map(([title, cat]) => {
    const rows = ENTITY_DEFINITIONS
      .filter((e) => e.category === cat && matches(query, e.name, e.id))
      .sort((a, b) => a.level - b.level)
      .map((e) => {
        const meta = [`Lv${e.level}`, RARITY_DE[e.rarity]];
        if (e.hp !== undefined) meta.push(`${hp(e.hp)} HP`);
        const biomes = biomeShares(e.id).map((b) => b.name);
        if (biomes.length) meta.push(biomes.join(", "));
        return row(`data-entity="${e.id}"`, e.icon, e.name, meta.join(" · "));
      });
    return rows.length ? `<div class="idx-group">${title}</div>${rows.join("")}` : "";
  }).join("");
  return html || `<p class="empty-hint">Keine Einheit gefunden.</p>`;
}

// ── Skill-Detail ───────────────────────────────────────────
function skillDetail(s: SkillDefinition): string {
  const p: [string, string][] = [
    ["ID", `<code>${s.id}</code>`],
    ["Kategorie", `${CATEGORY_DE[s.category]} · ${ACTIVATION_DE[s.activation]}`],
    ["Element", s.element],
    ["Lernaufwand", String(s.learningEffort)],
    ["XP ab Rang", SKILL_RANKS.map((r) => `${r.name} ${Math.round(xpForProgress(r.fromProgress, s.learningEffort))}`).join(" · ")],
  ];
  if (s.mpCost !== undefined) p.push(["MP-Kosten", `${hp(s.mpCost)} MP`]);
  if (s.cooldownMs !== undefined) p.push(["Cooldown", seconds(s.cooldownMs)]);
  if (s.attackType) p.push(["Angriffsart", s.attackType]);
  if (s.damageType) p.push(["Schadenstyp", DAMAGE_TYPE_DE[s.damageType]]);
  if (s.damage) p.push(["Schaden", formatFormula(s.damage, (v) => `${num(v, 1)} HP`)]);
  if (s.recipe) {
    p.push(["Rezept", s.recipe.map((id) => { const r = ALL_SKILLS.get(id); return r ? skillChip(r) : id; }).join(" + ")]);
  }
  if (s.materialCost?.length) {
    p.push(["Materialkosten", s.materialCost.map((m) => `${m.amount}× ${MATERIAL_MAP.get(m.materialId)?.name ?? m.materialId}`).join(", ")]);
  }

  // Graphen: eine Kurve je Wert, der mit der Erfahrung wächst (konstante Werte nicht)
  const charts = (list: ChartSeries[]) =>
    list.filter((c) => !isConstant(c)).map((c) => valueChart(c, s.learningEffort)).join("");

  const effects = (s.effects ?? []).map((e) => {
    const cond = formatCondition(e);
    const valueAt = (p: number) => getEffectValue(s.id, e, p); // dieselbe Funktion wie im Kampf (StatsSystem)
    const rows: [string, string[]][] = [
      [EFFECT_DE[e.effectType], LEVELS.map((l) => formatEffectValue(e.effectType, valueAt(l)))],
    ];
    const series: ChartSeries[] = [{
      label: `${EFFECT_DE[e.effectType]}${cond ? ` (${cond})` : ""}`,
      value: valueAt,
      format: (v) => formatEffectValue(e.effectType, v),
      formula: effectFormula(e.effectType, e.formula),
    }];
    const cfg = e.statusConfig;
    let cfgText = "";
    if (cfg) {
      cfgText = ` · ${cfg.type.toUpperCase()} ${seconds(cfg.durationMs)}${cfg.tickIntervalMs ? `, Tick alle ${seconds(cfg.tickIntervalMs)}` : ""}`;
      // Status-Effekte (DoT/HoT): kein Skill nutzt sie derzeit; Werte wie in resolveOnHitStatusEffects
      if (cfg.damageFormula) rows.push(["Schaden/Tick", LEVELS.map((l) => `${num(evalSkillValue(cfg.damageFormula!, l))} HP`)]);
      if (cfg.healFormula) rows.push(["Heilung/Tick", LEVELS.map((l) => `${num(evalSkillValue(cfg.healFormula!, l))} HP`)]);
      if (cfg.damageFormula) series.push({ label: "Schaden/Tick", value: (x) => evalSkillValue(cfg.damageFormula!, x), format: (v) => `${num(v)} HP`, formula: effectFormula("deal_damage", cfg.damageFormula) });
      if (cfg.healFormula) series.push({ label: "Heilung/Tick", value: (x) => evalSkillValue(cfg.healFormula!, x), format: (v) => `${num(v)} HP`, formula: effectFormula("heal_flat", cfg.healFormula) });
    }
    if (e.venomDose) {
      const doseAt = (l: number) => venomDoseMilli(e, l) / MILLI;
      cfgText = ` · Dosis ${formatFormula(e.venomDose, (v) => `${num(v, 1)} HP`)}, stapelt, Halbwertszeit ${seconds(VENOM_HALF_LIFE_MS)}`;
      rows.push(["Dosis", LEVELS.map((l) => `${num(doseAt(l))} HP`)]);
      rows.push(["abgebaut nach", LEVELS.map((l) => seconds(venomDurationMs(doseAt(l) * MILLI)))]);
      const doseFormula = valueFormula(e.venomDose, (x) => `${num(x)} HP`);
      series.push({ label: "Giftdosis je Treffer", value: doseAt, format: (v) => `${num(v, 1)} HP`, formula: doseFormula });
      series.push({ label: "Gift abgebaut nach", value: (x) => venomDurationMs(doseAt(x) * MILLI) / 1000, format: (v) => `${num(v, 1)} s`, formula: venomDurationFormula(doseFormula) });
    }
    return `<div class="idx-effect">
      <div><b>${EFFECT_DE[e.effectType]}</b> · ${TRIGGER_DE[e.trigger]}${cond ? ` · ${cond}` : ""}</div>
      <div class="idx-formula">${formatFormula(e.formula, (v) => formatEffectValue(e.effectType, v))}${cfgText}</div>
      ${levelTable(rows)}
      ${charts(series)}
      <div class="idx-reason">${e.reasoning}</div>
    </div>`;
  }).join("");

  const derived: [string, string[]][] = [];
  const derivedSeries: ChartSeries[] = [];
  if (s.damage) {
    derived.push(["Schaden (HP)", LEVELS.map((l) => hp(calcSkillAttackDamage(s.id, l)))]);
    derivedSeries.push({ label: "Schaden je Treffer (normal, vor Rüstung)", value: (x) => calcSkillAttackDamage(s.id, x) / MILLI, format: (v) => `${num(v, 1)} HP`, formula: valueFormula(s.damage, (x) => `${num(x)} HP`) });
  }
  if (s.id === "jump") {
    derived.push(["Sprungweite (px)", LEVELS.map((l) => num(calcJumpDistance(l), 0))]);
    derivedSeries.push({ label: "Sprungweite", value: calcJumpDistance, format: (v) => `${num(v, 0)} px`, formula: valueFormula(JUMP_DISTANCE_PX, (x) => `${num(x)} px`) });
  }
  if (s.id === "photosynthesis") {
    derived.push(["Heilung (HP/s)", LEVELS.map((l) => hp(calcPhotosynthesisHeal(l)))]);
    derivedSeries.push({ label: "Heilung", value: (x) => calcPhotosynthesisHeal(x) / MILLI, format: (v) => `${num(v, 2)} HP/s`, formula: valueFormula(PHOTOSYNTHESIS_HEAL_HP_PER_S, (x) => `${num(x)} HP/s`) });
  }
  if (s.id === "analyze" || s.id === "absorb") {
    // Erfolgschance = min(1, Vergleichsstufe / Stufe des Wesens) — sicher bis zur Vergleichsstufe
    derived.push(["Sicher erfolgreich bis Stufe", LEVELS.map((l) => num(levelFromProgress(l), 1))]);
    derivedSeries.push({
      label: "Sicher erfolgreich bis Wesen-Stufe", value: levelFromProgress, format: (v) => `Stufe ${num(v, 1)}`,
      formula: `${valueFormula({ start: 1, max: levelFromProgress(1) }, (x) => num(x))}; Erfolgschance = min(1, Stufe / Wesen-Stufe)` +
        ` (Stufe ${num(LEVEL_AT_NATUR)} bei Natur ${pct(NATUR_PROGRESS)})`,
    });
  }

  const sources = ENTITY_DEFINITIONS.flatMap((e) =>
    e.skillDrops.filter((d) => d.skillId === s.id).map((d) =>
      [entityChip(e), `Lv${e.level}`, pct(d.chance), pct(d.chance * ANALYZE_CHANCE_MODIFIER)]));

  const users = ENTITY_DEFINITIONS.filter((e) => e.skillXp?.[s.id] !== undefined)
    .map((e) => entityChip(e, ` ${skillXpLabel(e, s.id)}`)).join("");

  return [
    titleBlock(s.icon, s.name, `${CATEGORY_DE[s.category]}-Skill · ${ACTIVATION_DE[s.activation]}`),
    `<p class="idx-desc">${s.description}</p>`,
    params(p),
    section("Effekte", effects),
    section("Werte zu Rangbeginn (dazwischen fließend)", derived.length ? levelTable(derived) + charts(derivedSeries) : ""),
    section("Treffer-Stufen (ohne Geschick)", s.damage
      ? `${hitTable(s.hitProfile ?? DEFAULT_HIT_PROFILE)}<p class="idx-reason">Geschick des Angreifers verschiebt die Verteilung zu besseren Stufen, Geschick des Ziels zu schlechteren.</p>`
      : ""),
    section("Entdeckbar bei", sources.length ? dataTable(["Einheit", "Level", "Absorb", "Analyze"], sources) : ""),
    section("Von Einheiten genutzt", users ? `<div>${users}</div>` : ""),
  ].join("");
}

// ── Einheiten-Detail ───────────────────────────────────────
function entityDetail(e: EntityDefinition): string {
  const p: [string, string][] = [
    ["ID", `<code>${e.id}</code>`],
    ["Kategorie", `${ENTITY_CATEGORY_DE[e.category]} · ${RARITY_DE[e.rarity]}`],
    ["Level", String(e.level)],
    ["Verhalten", `${BEHAVIOR_DE[e.behavior]} · ${DISPOSITION_DE[e.disposition]}`],
    ["HP", e.hp !== undefined ? `${hp(e.hp)} HP` : "—"],
    ["Tempo", e.speed !== undefined ? `${e.speed} px/s` : "—"],
    ["Weltgröße", orDash(e.worldSize)],
    ["Interaktionsradius", `${e.interactRadius} px`],
    ["Respawn", `${e.respawnTime} s`],
  ];
  if (e.aggroRadius !== undefined) p.push(["Aggro-Radius", `${e.aggroRadius} px`]);
  if (e.attackRangePx !== undefined) p.push(["Angriffsreichweite", `${e.attackRangePx} px`]);
  if (e.attackCooldownMs !== undefined) p.push(["Angriffs-Cooldown", seconds(e.attackCooldownMs)]);
  if (e.attackType) p.push(["Angriffsart", e.attackType]);
  if (e.rangedAttackSkillId) {
    p.push(["Fernkampf", `${ALL_SKILLS.get(e.rangedAttackSkillId)?.name ?? e.rangedAttackSkillId} · ${hp(getEntityRangedDamage(e))} HP · ${orDash(e.rangedAttackRangePx)} px · ${seconds(e.rangedAttackCooldownMs)}`]);
  }
  const biomes = biomeShares(e.id);
  p.push(["Vorkommen", biomes.length ? biomes.map((b) => `${b.name} (${pct(b.share)})`).join(", ") : "—"]);
  // Altfelder: vom Kampfsystem nicht mehr ausgewertet
  if (e.damage !== undefined) p.push(["damage (Altfeld)", `${hp(e.damage)} HP`]);
  if (e.damageReduction !== undefined) p.push(["damageReduction (Altfeld)", pct(e.damageReduction)]);
  if (e.venomChance !== undefined) p.push(["venomChance (Altfeld)", pct(e.venomChance)]);
  if (e.venomDamagePerTick !== undefined) p.push(["venomDamagePerTick (Altfeld)", `${hp(e.venomDamagePerTick)} HP`]);

  const skillLevels = getEntitySkillProgress(e); // Fortschritt je Skill aus skillXp
  const dex = resolveDexterity(skillLevels);
  if (dex) p.push(["Geschick", num(dex)]);
  const skillIds = Object.keys(skillLevels);
  const skills = skillIds.map((id) => {
    const s = ALL_SKILLS.get(id);
    return s ? skillChip(s, ` ${skillXpLabel(e, id)}`) : `${id} ${skillXpLabel(e, id)}`;
  }).join("");

  const combat: string[] = [];
  if (canMelee(e)) {
    const atk = resolveAttackerEffects(skillLevels);
    const dmg = getEntityBaseDamage(e);
    const cd = e.attackCooldownMs ?? 1500;
    combat.push(`<b>Nahkampf:</b> ${hp(dmg)} HP ${DAMAGE_TYPE_DE[getEntityAttackDamageType(e)]}` +
      (atk.damageMult !== 1 ? ` ${factor(atk.damageMult)}` : "") +
      ` alle ${seconds(cd)} ≈ ${num((dmg * atk.damageMult) / MILLI / (cd / 1000))} HP/s (normaler Treffer, vor Rüstung)`);
    const { profile, progress } = getEntityMeleeHitBasis(e);
    const attackDex = resolveDexterity(skillLevels, getEntityMeleeSkillId(e));
    combat.push(`<b>Treffer-Stufen</b> gegen Geschick 0: ${hitLine(calcHitChances(profile, progress, attackDex, 0))}`);
    const occ = e.occasionalAttack;
    const occSkill = occ ? ALL_SKILLS.get(occ.skillId) : undefined;
    if (occ && occSkill) {
      combat.push(`<b>Gelegentlich (${pct(occ.chance)} der Angriffe):</b> ${skillChip(occSkill)} ` +
        `${hp(getEntityBaseDamage(e, occ.skillId))} HP ${DAMAGE_TYPE_DE[getEntityAttackDamageType(e, occ.skillId)]} ` +
        `statt des normalen Angriffs`);
    }
  }
  for (const id of skillIds) {
    const s = ALL_SKILLS.get(id);
    for (const x of s?.effects ?? []) {
      if (x.trigger !== "on_hit_enemy") continue;
      if (x.effectType === "inject_venom" && x.venomDose) {
        const dose = venomDoseMilli(x, skillLevels[id]) / MILLI;
        const only = s!.activation === "active" ? `nur mit ${s!.name}` : "jeder Treffer";
        combat.push(`<b>Gift (${s!.name}, ${only}):</b> ${pct(venomBiteChance(x, skillLevels[id]))} Chance, ` +
          `${num(dose)} HP Gift (stapelt, abgebaut nach ${seconds(venomDurationMs(dose * MILLI))})`);
      }
      if (x.effectType !== "apply_status" || !x.statusConfig?.damageFormula) continue;
      combat.push(`<b>Bei Treffer (${s!.name}):</b> ${pct(evalSkillValue(x.formula, skillLevels[id]))} Chance, ` +
        `${num(evalSkillValue(x.statusConfig.damageFormula, skillLevels[id]))} HP/Tick für ${seconds(x.statusConfig.durationMs)}`);
    }
  }
  const reflect = resolveDefenderEffects(skillLevels).reflectDamage;
  if (reflect) combat.push(`<b>Rückschlag</b> bei erlittenem Treffer: ${hp(reflect)} HP`);

  const defRows = ALL_DAMAGE_TYPES.map((t) => {
    const d = resolveDefenderEffects(skillLevels, t);
    return [DAMAGE_TYPE_DE[t], d.flatBlock ? `${hp(d.flatBlock)} HP` : "—", d.percentReduce ? pct(d.percentReduce) : "—",
      d.weaknessMult !== 1 ? factor(d.weaknessMult) : "—", d.immune ? "ja" : "—"];
  }).filter((r) => r.slice(1).some((v) => v !== "—"));

  const bonus = e.hp !== undefined && e.category === "creature"
    ? dataTable(["Bonus", "HP", "Nahkampf", "Tempo"], [0, 1, 2, 3].map((b) =>
        [`+${b}`, `${hp(getScaledMaxHp(e, b))} HP`, `${hp(getScaledDamage(e, b))} HP`, `${getScaledSpeed(e, b)} px/s`]))
    : "";

  const skillDrops = e.skillDrops.map((d) => {
    const s = ALL_SKILLS.get(d.skillId);
    return [s ? skillChip(s) : d.skillId, pct(d.chance), pct(d.chance * ANALYZE_CHANCE_MODIFIER)];
  });
  const matDrops = e.materialDrops.map((d) => {
    const m = MATERIAL_MAP.get(d.materialId);
    return [m ? `${m.icon} ${m.name}` : d.materialId, `${d.amountMin}–${d.amountMax}`, pct(d.chance)];
  });

  return [
    titleBlock(e.icon, e.name, `Lv${e.level} · ${ENTITY_CATEGORY_DE[e.category]} · ${RARITY_DE[e.rarity]}`),
    params(p),
    section("Skills", skills ? `<div>${skills}</div>` : ""),
    section("Kampf", combat.map((c) => `<p class="idx-line">${c}</p>`).join("")),
    section("Verteidigung nach Schadenstyp", defRows.length ? dataTable(["Typ", "Flat-Block", "Reduktion", "Faktor", "Immun"], defRows) : ""),
    section("Bonus-Level (Entity-Leveling)", bonus),
    section("Skill-Drops", skillDrops.length ? dataTable(["Skill", "Absorb", "Analyze"], skillDrops) : ""),
    section("Material-Drops", matDrops.length ? dataTable(["Material", "Menge", "Chance"], matDrops) : ""),
  ].join("");
}

// ── Styles ─────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById("indexview-styles")) return;
  const s = document.createElement("style");
  s.id = "indexview-styles";
  s.textContent = `
    .idx-bar { display:flex; flex-direction:column; gap:8px; margin-bottom:6px; }
    .idx-seg { display:flex; gap:6px; }
    .idx-seg button {
      flex:1; padding:9px 6px; border-radius:6px; border:1px solid #2a3a4a; background:var(--panel2);
      color:var(--muted); font-family:'Cinzel',serif; font-size:.62rem; letter-spacing:1px; cursor:pointer;
    }
    .idx-seg button.active { border-color:var(--accent); color:var(--accent); background:#0a1a20; }
    .idx-search {
      padding:9px 10px; border-radius:6px; border:1px solid #2a3a4a; background:var(--panel2);
      color:var(--text); font-size:.85rem; width:100%;
    }
    .idx-group {
      font-family:'Cinzel',serif; font-size:.56rem; letter-spacing:2px; color:var(--muted);
      text-transform:uppercase; margin:12px 0 5px;
    }
    .idx-row {
      display:flex; align-items:center; gap:10px; width:100%; text-align:left; padding:8px 10px;
      margin-bottom:5px; background:var(--panel2); border:1px solid #1a2030; border-radius:6px;
      color:var(--text); cursor:pointer; font:inherit;
    }
    .idx-row:active { border-color:var(--accent); }
    .idx-icon { font-size:1.3rem; width:28px; text-align:center; flex-shrink:0; }
    .idx-main { flex:1; min-width:0; display:flex; flex-direction:column; gap:1px; }
    .idx-main b { font-family:'Cinzel',serif; font-size:.74rem; font-weight:400; }
    .idx-main small { font-size:.68rem; color:var(--muted); }
    .idx-chev { color:var(--muted); font-size:1.1rem; }
    .idx-back {
      background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.18); color:#ccc;
      font-size:.8rem; padding:6px 14px; border-radius:8px; cursor:pointer; margin:6px 0 4px;
    }
    .idx-title { display:flex; align-items:center; gap:12px; margin:8px 0; }
    .idx-title > span { font-size:2.2rem; }
    .idx-title h3 { font-family:'Cinzel',serif; font-size:1rem; color:var(--text); font-weight:700; }
    .idx-title small { font-size:.72rem; color:var(--muted); }
    .idx-desc { font-size:.8rem; line-height:1.5; font-style:italic; color:var(--text); margin-bottom:8px; }
    .idx-params { width:100%; border-collapse:collapse; font-size:.74rem; }
    .idx-params th { text-align:left; color:var(--muted); font-weight:400; padding:3px 10px 3px 0; white-space:nowrap; vertical-align:top; }
    .idx-params td { padding:3px 0; color:var(--text); }
    .idx-params tr + tr { border-top:1px solid #141a28; }
    .idx-h {
      font-family:'Cinzel',serif; font-size:.6rem; letter-spacing:2px; color:var(--accent);
      text-transform:uppercase; margin:16px 0 6px; font-weight:400;
    }
    .idx-effect {
      background:var(--panel2); border:1px solid #1a2030; border-radius:6px;
      padding:8px 10px; margin-bottom:6px; font-size:.74rem;
    }
    .idx-formula { font-size:.68rem; color:var(--gold); margin-top:2px; }
    .idx-reason { font-size:.68rem; color:var(--muted); font-style:italic; line-height:1.4; }
    .idx-scroll { overflow-x:auto; margin:4px 0; }
    .idx-table { border-collapse:collapse; font-size:.7rem; min-width:100%; }
    .idx-table th { color:var(--muted); font-weight:400; text-align:right; padding:3px 6px; white-space:nowrap; }
    .idx-table td { text-align:right; padding:3px 6px; white-space:nowrap; border-top:1px solid #1a2030; }
    .idx-table th:first-child, .idx-table td:first-child { text-align:left; padding-left:0; }
    .idx-line { font-size:.74rem; line-height:1.5; margin-bottom:3px; }
    .idx-chip {
      display:inline-flex; align-items:center; gap:3px; margin:2px 4px 2px 0; padding:4px 9px;
      border-radius:12px; border:1px solid #2a3a4a; background:var(--panel2); color:var(--text);
      font-size:.72rem; cursor:pointer; white-space:nowrap;
    }
    .idx-chip:active { border-color:var(--accent); }
    .idx code { font-size:.7rem; color:var(--accent2); }
    ${VALUE_CHART_CSS}
  `;
  document.head.appendChild(s);
}

// ── Ansicht ────────────────────────────────────────────────
type Page = { kind: "skill" | "entity"; id: string };

export function createIndexView(root: HTMLElement): void {
  injectStyles();

  let tab: "skills" | "entities" = "skills";
  let query = "";
  const stack: Page[] = [];

  root.classList.add("idx");
  root.innerHTML = `
    <div class="idx-bar">
      <div class="idx-seg">
        <button data-sec="skills">Skills (${ALL_SKILL_LIST.length})</button>
        <button data-sec="entities">Einheiten (${ENTITY_DEFINITIONS.length})</button>
      </div>
      <input class="idx-search" type="search" placeholder="Suchen…" autocomplete="off" />
    </div>
    <div class="idx-body"></div>
  `;
  const body = root.querySelector<HTMLElement>(".idx-body")!;
  const search = root.querySelector<HTMLInputElement>(".idx-search")!;
  attachChartHover(body);

  function render() {
    root.querySelectorAll<HTMLElement>("[data-sec]").forEach((b) =>
      b.classList.toggle("active", b.dataset.sec === tab));

    const page = stack[stack.length - 1];
    if (!page) {
      body.innerHTML = tab === "skills" ? skillList(query) : entityList(query);
    } else {
      const detail = page.kind === "skill"
        ? skillDetail(ALL_SKILLS.get(page.id)!)
        : entityDetail(ENTITY_MAP.get(page.id)!);
      body.innerHTML = `<button class="idx-back">← Zurück</button>${detail}`;
    }
    root.closest(".gm-body")?.scrollTo(0, 0);
  }

  root.addEventListener("click", (ev) => {
    const t = (ev.target as HTMLElement).closest<HTMLElement>("[data-sec],[data-skill],[data-entity],.idx-back");
    if (!t) return;
    if (t.dataset.sec) {
      tab = t.dataset.sec as typeof tab;
      stack.length = 0;
    } else if (t.dataset.skill) {
      stack.push({ kind: "skill", id: t.dataset.skill });
    } else if (t.dataset.entity) {
      stack.push({ kind: "entity", id: t.dataset.entity });
    } else {
      stack.pop();
    }
    render();
  });

  search.addEventListener("input", () => {
    query = search.value.trim().toLowerCase();
    stack.length = 0;
    render();
  });

  render();
}
