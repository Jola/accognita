// ============================================================
// INDEX VIEW — Nachschlagewerk aller Skills und Einheiten
//
// Selbstständiges DOM-Modul für den INDEX-Tab des Spielmenüs.
// Liest nur statische Spieldaten; alle Werte werden über die
// echten Systeme berechnet und sind daher immer aktuell.
// ============================================================

import type { SkillDefinition, SkillEffect, SkillValue, EffectType, Attribute, PracticeUnit } from "../types/Skill";
import type { EntityDefinition } from "../types/Entity";
import type { DamageType, HitProfile } from "../types/Combat";
import { CORE_SKILLS, BASE_SKILLS, PLANT_SKILLS, COMBO_SKILLS, ALL_SKILLS } from "../data/skills.js";
import { ENTITY_DEFINITIONS, ENTITY_MAP } from "../data/entities.js";
import { MATERIAL_MAP } from "../data/materials.js";
import {
  ANALYZE_CHANCE_MODIFIER, MILLI, DEFAULT_HIT_PROFILE, HIT_DAMAGE_MULT,
  HIT_TILT_MAX, HIT_TILT_PER_SKILL_LEVEL, HIT_TILT_PER_DEX,
} from "../data/balance.js";
import { calcHitChances, HIT_GRADES, HIT_GRADE_DE } from "../systems/HitSystem.js";
import { DAMAGE_TYPE_DE } from "../systems/DamageSystem.js";
import { getEffectValue } from "../systems/StatsSystem.js";
import { BIOME_SPAWNS } from "../world/BiomeDefinitions.js";
import { calcGrowthFromMass } from "../systems/GrowSystem.js";
import { GROWTH_FIBER_SCALE, MAX_BODY_MASS, MAX_BODY_MASS_KG, KG_PER_FIBER } from "../data/grow.js";
import { SETTLE_AGGRO_LOCK_MS, WORK_RANGE_MIN_PX, WORK_RANGE_MAX_PX, ACTION_SECONDS } from "../data/blobs.js";
import {
  HP_PER_GROWTH, MP_PER_GROWTH, BASE_HP, BASE_MP, PLAYER_SIZE_GROWTH_MAX, PLAYER_SPEED_PER_WORLD_RADIUS,
  PLAYER_WORLD_RADIUS_MIN, PLAYER_WORLD_RADIUS_MAX, PLAYER_REACH_FACTOR,
  SIZE_STRENGTH_BONUS_MAX, MP_REGEN_MILLI_PER_SECOND,
} from "../data/balance.js";
import { SIGHT_EDGE_FRACTION } from "../data/body.js";
import { calcSizeStrengthBonus, maxEffectOverSkills } from "../systems/BodySystem.js";
import { SKILL_RANKS, NATUR_PROGRESS, LEVEL_AT_NATUR, OVERSTRETCH_MAX_FRACTION } from "../data/progression.js";
import { xpForProgress, getEntitySkillProgress, rankNameForProgress, levelFromProgress } from "../systems/ProgressionSystem.js";
import {
  evalSkillValue, resolveDefenderEffects, resolveAttackerEffects, resolveDexterity, resolveStrength,
  calcAttributeMult, maxAttributePoints, getSkillEffect,
} from "../systems/SkillEffectSystem.js";
import {
  calcSkillAttackDamage,
} from "../systems/SkillEffects.js";
import { venomDurationMs, venomBiteChance, venomDoseMilli } from "../systems/VenomSystem.js";
import { valueChart, pointsChart, isConstant, attachChartHover, VALUE_CHART_CSS, type ChartSeries } from "./ValueChart.js";
import { VENOM_HALF_LIFE_MS, VENOM_MIN_RATE_HP_PER_S } from "../data/venom.js";
import {
  getEntityBaseDamage, getEntityRangedDamage, getScaledMaxHp, getScaledDamage, getScaledSpeed,
} from "../systems/EntityLevelingSystem.js";
import { getEntityAttackDamageType, getEntityMeleeHitBasis, getEntityMeleeSkillId, getEntityAttributeMult } from "../systems/CombatSystem.js";

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
  dexterity: "Geschick", strength: "Stärke",
  move_speed: "Tempo-Faktor", sight_range: "Sichtweite", color_vision: "Farbsehen (ohne Rot)", red_vision: "Rot sehen",
  jump_distance: "Sprungweite", regen_hp: "Heilung", digest_rate: "Verdauung",
};
const PRACTICE_DE: Record<PracticeUnit, string> = {
  body_radius_moved: "je zurückgelegtem Körperradius, solange dies der schnellste Bewegungs-Skill ist",
  second_enabled: "je Sekunde, solange eingeschaltet",
  hp_healed: "je geheiltem HP",
  fiber_digested: "je verdauter Pflanzenfaser",
};
const ATTRIBUTE_DE: Record<Attribute, string> = { strength: "Stärke", dexterity: "Geschick" };
const ATTRIBUTE_ICON: Record<Attribute, string> = { strength: "💪", dexterity: "🎯" };
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
  if (type === "dexterity" || type === "strength") return `+${num(value)}`;
  if (type === "sight_range") return `${num(value, 1)} Körperradien`;
  if (type === "color_vision" || type === "red_vision") return pct(value);
  if (type === "jump_distance") return `${num(value, 0)} px`;
  if (type === "regen_hp") return `${num(value)} HP/s`;
  if (type === "digest_rate") return `${num(value, 1)} Fasern/min`;
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
  if (type === "dexterity" || type === "strength") return valueFormula(v, (x) => num(x));
  if (type === "sight_range") return valueFormula(v, (x) => `${num(x)} Körperradien`);
  if (type === "color_vision" || type === "red_vision") return valueFormula(v, pct);
  if (type === "jump_distance") return valueFormula(v, (x) => `${num(x)} px`);
  if (type === "regen_hp") return valueFormula(v, (x) => `${num(x)} HP/s`);
  if (type === "digest_rate") return valueFormula(v, (x) => `${num(x)} Fasern/min`);
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
const ATTR_CHIP: Record<string, string> = { strength: "💪 Stärke", dexterity: "🎯 Geschick", speed: "💨 Tempo", sight: "👁️ Sicht", growth: "📏 Größe und Wachstum", vitals: "❤️ HP und MP" };
const attrChip = (id: string) => `<button class="idx-chip" data-attr="${id}">${ATTR_CHIP[id]}</button>`;
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
    // Anteil an allen Exemplaren: Gewicht × Exemplare je Treffer (count)
    const n = (x: { weight: number; count?: number }) => x.weight * (x.count ?? 1);
    const total = entries.reduce((sum, x) => sum + n(x), 0);
    return [{ name: BIOME_DE[biome] ?? biome, share: n(entry) / total }];
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
  const effTypes = new Set((s.effects ?? []).map((e) => e.effectType));
  if (s.practice) {
    const chip = effTypes.has("move_speed") ? ` · ${attrChip("speed")}` : effTypes.has("sight_range") ? ` · ${attrChip("sight")}` : "";
    p.push(["Erfahrung durch Tun", `${num(s.practice.xpPer)} XP ${PRACTICE_DE[s.practice.unit]}${chip}<div class="idx-reason">${s.practice.reasoning}</div>`]);
  }
  if (effTypes.has("strength") || effTypes.has("dexterity")) {
    p.push(["Eigenschaften", [effTypes.has("strength") ? attrChip("strength") : "", effTypes.has("dexterity") ? attrChip("dexterity") : ""].join("")]);
  }
  if (s.id === "grow") p.push(["Grundwert", attrChip("growth")]);
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
  if (s.id === "analyze" || s.id === "absorb") {
    // Erfolgschance = min(1, Vergleichsstufe / Stufe des Wesens) — sicher bis zur Vergleichsstufe
    derived.push(["Sicher erfolgreich bis Stufe", LEVELS.map((l) => num(levelFromProgress(l), 1))]);
    derivedSeries.push({
      label: "Sicher erfolgreich bis Wesen-Stufe", value: levelFromProgress, format: (v) => `Stufe ${num(v, 1)}`,
      formula: `${valueFormula({ start: 1, max: levelFromProgress(1) }, (x) => num(x))}; Erfolgschance = min(1, Stufe / Wesen-Stufe)` +
        ` (Stufe ${num(LEVEL_AT_NATUR)} bei Natur ${pct(NATUR_PROGRESS)})`,
    });
  }

  // Eigenschafts-Skalierung (GDD-02 Abschnitt 8.11): Formel, Begründung, Kurve je Eigenschaft
  let scalingHtml = "";
  const dexGivers = ALL_SKILL_LIST.filter((g) => g.effects?.some((e) => e.trigger === "passive" && e.effectType === "dexterity"));
  const giverChips = (list: SkillDefinition[]) => (list.length ? list.map((g) => skillChip(g)).join(" ") : "— (noch kein Skill)");
  if (s.damage) {
    // Präzision: Geschick kippt die Treffer-Stufen (HitSystem) — bei jedem Angriff, nicht am Schaden
    // Vorgabe (Entwickler, 13. November 2026): Geschick erhöht die Präzision, nicht den Schaden.
    const profile = s.hitProfile ?? DEFAULT_HIT_PROFILE;
    const level = levelFromProgress(NATUR_PROGRESS);
    const chancesAt = (dex: number) => calcHitChances(profile, NATUR_PROGRESS, dex, 0); // dieselbe Funktion wie im Kampf
    const maxDex = maxAttributePoints("dexterity");
    const good = (dex: number) => { const c = chancesAt(dex); return c.heavy + c.crit; };
    const bad = (dex: number) => { const c = chancesAt(dex); return c.light + c.miss; };
    const tiltFormula = `kipp = ${num(HIT_TILT_MAX)} · tanh(${num(HIT_TILT_PER_SKILL_LEVEL)} · (Stufe − 1) + ${num(HIT_TILT_PER_DEX)} · (Geschick − Geschick Ziel)); ` +
      `p_Stufe ∝ Grund · e^(kipp · Stufe), Stufe −2 verfehlt … +2 kritisch`;
    const chartOpts = { unit: "Geschick", maxPoints: maxDex, naturPoints: maxAttributePoints("dexterity", NATUR_PROGRESS), format: pct, formula: tiltFormula };
    scalingHtml += `<div class="idx-effect">
      <div><b>🎯 Geschick → Präzision</b> (nicht Schaden)</div>
      <div class="idx-formula">Punkte aus ${giverChips(dexGivers)} · Mehr schwere und kritische, weniger leichte und verfehlte Treffer.
        Bei Natur (Stufe ${num(level, 1)}), Ziel ohne Geschick: schwer + kritisch ${pct(good(0))} → ${pct(good(maxDex))},
        leicht + verfehlt ${pct(bad(0))} → ${pct(bad(maxDex))} (0 → ${num(maxDex)} Geschick)</div>
      ${pointsChart({ ...chartOpts, label: "Schwere + kritische Treffer bei Natur über Geschick", value: good })}
      ${pointsChart({ ...chartOpts, label: "Leichte + verfehlte Treffer bei Natur über Geschick", value: bad })}
    </div>`;
  }
  if (s.scaling?.length && s.damage) {
    const terms = s.scaling.map((x) => `${pct(x.perPoint)} × ${ATTRIBUTE_DE[x.attribute]}`).join(" + ");
    const baseNatur = calcSkillAttackDamage(s.id, NATUR_PROGRESS) / MILLI;
    const items = s.scaling.map((x) => {
      const attr = x.attribute;
      const only = (pts: number) => ({ strength: 0, dexterity: 0, [attr]: pts } as Record<Attribute, number>);
      const givers = ALL_SKILL_LIST.filter((g) => g.effects?.some((e) => e.trigger === "passive" && e.effectType === attr));
      const chart = pointsChart({
        label: `Schaden je Treffer bei Natur über ${ATTRIBUTE_DE[attr]} (nur diese Eigenschaft, normal, vor Rüstung)`,
        value: (pts) => baseNatur * calcAttributeMult(s.id, only(pts)), // dieselbe Funktion wie im Kampf
        format: (v) => `${num(v, 1)} HP`,
        formula: `${num(baseNatur, 1)} HP × (1 + ${pct(x.perPoint)} × ${ATTRIBUTE_DE[attr]})`,
        unit: ATTRIBUTE_DE[attr],
        // Stärke: inklusive Größenbonus bis zur vollen Größe (GDD-09); Natur-Marke ohne Größe
        maxPoints: maxAttributePoints(attr) * (attr === "strength" ? 1 + SIZE_STRENGTH_BONUS_MAX : 1),
        naturPoints: maxAttributePoints(attr, NATUR_PROGRESS),
      });
      return `<div class="idx-effect">
        <div><b>${ATTRIBUTE_ICON[attr]} ${ATTRIBUTE_DE[attr]}</b> · +${pct(x.perPoint)} Schaden je Punkt</div>
        <div class="idx-formula">Punkte aus ${giverChips(givers)}</div>
        ${chart}
        <div class="idx-reason">${x.reasoning}</div>
      </div>`;
    }).join("");
    scalingHtml = `<div class="idx-formula">Schaden = Grundschaden × (1 + ${terms})</div>${items}` + scalingHtml;
  }

  // Skills, die eine Eigenschaft geben: welche Angriffe sie verstärken
  const givenAttrs = (s.effects ?? []).map((e) => e.effectType).filter((t): t is Attribute => t === "strength" || t === "dexterity");
  const boostsHtml = givenAttrs.map((attr) => {
    const boosted = ALL_SKILL_LIST.flatMap((t) => {
      const sc = t.scaling?.find((x) => x.attribute === attr);
      return sc ? [skillChip(t, ` +${pct(sc.perPoint)}/Punkt`)] : [];
    });
    const precision = attr === "dexterity" ? " Präzision aller Angriffe (Treffer-Stufen)" : "";
    const dmg = boosted.length ? `${precision ? " · Schaden von " : ""}${boosted.join("")}` : (precision ? "" : "noch keinen Angriff");
    return `<div>${ATTRIBUTE_ICON[attr]} ${ATTRIBUTE_DE[attr]} verstärkt:${precision} ${dmg}</div>`;
  }).join("");

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
    section("Verstärkt Angriffe", boostsHtml),
    section("Wachstum aus Körpermasse", s.id === "grow" ? growthHtml() : ""),
    section("Skaliert mit Eigenschaften", scalingHtml),
    section("Werte zu Rangbeginn (dazwischen fließend)", derived.length ? levelTable(derived) + charts(derivedSeries) : ""),
    section("Treffer-Stufen (ohne Geschick)", s.damage
      ? `${hitTable(s.hitProfile ?? DEFAULT_HIT_PROFILE)}<p class="idx-reason">Geschick des Angreifers verschiebt die Verteilung zu besseren Stufen, Geschick des Ziels zu schlechteren.</p>`
      : ""),
    section("Entdeckbar bei", sources.length ? dataTable(["Einheit", "Level", "Absorb", "Analyze"], sources) : ""),
    section("Von Einheiten genutzt", users ? `<div>${users}</div>` : ""),
  ].join("");
}

/** Grow: Wachstum, MaxHP und MaxMP über die verdauten Fasern (GrowSystem, data/grow.ts Abschnitt 4) */
function growthHtml(): string {
  const maxFibers = GROWTH_FIBER_SCALE * (2 ** 5 - 1); // bis Wachstum 5
  const formula = `log₂(1 + Fasern / ${num(GROWTH_FIBER_SCALE)})`;
  const base = { unit: "Fasern", maxPoints: maxFibers };
  const rows: string[][] = [1, 2, 3, 4, 5].map((g) => {
    const fibers = GROWTH_FIBER_SCALE * (2 ** g - 1);
    return [num(fibers, 0), num(g), `+${hp(g * HP_PER_GROWTH)}`, `+${hp(g * MP_PER_GROWTH)}`];
  });
  return `<p class="idx-reason">Jede verdaute Faser wird Körpermasse; sie schrumpft nie. Allein die Körpermasse bestimmt Größe, MaxHP und MaxMP.</p>` +
    dataTable(["verdaute Fasern", "Wachstum", "MaxHP", "MaxMP"], rows) +
    pointsChart({ ...base, label: "Wachstum über verdaute Pflanzenfasern", value: calcGrowthFromMass, format: (v) => num(v, 2), formula }) +
    pointsChart({ ...base, label: "Zusätzliche MaxHP über verdaute Pflanzenfasern", value: (m) => calcGrowthFromMass(m) * HP_PER_GROWTH / MILLI, format: (v) => `+${num(v, 1)} HP`, formula: `${hp(HP_PER_GROWTH)} HP × ${formula}` });
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
  const str = resolveStrength(skillLevels);
  if (str) p.push(["Stärke", num(str)]);
  const skillIds = Object.keys(skillLevels);
  const skills = skillIds.map((id) => {
    const s = ALL_SKILLS.get(id);
    return s ? skillChip(s, ` ${skillXpLabel(e, id)}`) : `${id} ${skillXpLabel(e, id)}`;
  }).join("");

  const combat: string[] = [];
  if (canMelee(e)) {
    const mult = resolveAttackerEffects(skillLevels).damageMult * getEntityAttributeMult(e);
    const dmg = getEntityBaseDamage(e);
    const cd = e.attackCooldownMs ?? 1500;
    combat.push(`<b>Nahkampf:</b> ${hp(dmg)} HP ${DAMAGE_TYPE_DE[getEntityAttackDamageType(e)]}` +
      (mult !== 1 ? ` ${factor(mult)}` : "") +
      ` alle ${seconds(cd)} ≈ ${num((dmg * mult) / MILLI / (cd / 1000))} HP/s (normaler Treffer, vor Rüstung)`);
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

// ── Grundwerte (GDD-09) ────────────────────────────────────
// Vorgabe (Entwickler, 13. November 2026): Alle Eigenschaften, Skalen,
// Formeln und Beschreibungen stehen im INDEX. Jede Zahl kommt aus den
// Daten und denselben Funktionen, die das Spiel aufruft.

/** Skills mit einem passiven Effekt dieses Typs, als Tabellenzeilen Start / Natur / Max */
function effectSourceRows(type: EffectType, fmt: (v: number) => string): string[][] {
  return ALL_SKILL_LIST.flatMap((s) => (s.effects ?? [])
    .filter((e) => e.trigger === "passive" && e.effectType === type)
    .map((e) => [skillChip(s), fmt(evalSkillValue(e.formula, 0)), fmt(evalSkillValue(e.formula, NATUR_PROGRESS)), fmt(evalSkillValue(e.formula, 1))]));
}
const sourceTable = (type: EffectType, fmt: (v: number) => string) => {
  const rows = effectSourceRows(type, fmt);
  return rows.length ? dataTable(["Skill", "Start", "Natur", "Max"], rows) : `<p class="idx-reason">Noch kein Skill.</p>`;
};
/** „Kriechen 0,5 XP · Krabbeln 0,5 XP“ — Erfahrung durch Tun aller Skills mit diesem Effekt */
const practiceList = (type: EffectType) => ALL_SKILL_LIST
  .filter((t) => t.practice && t.effects?.some((e) => e.effectType === type))
  .map((t) => `${t.name} ${num(t.practice!.xpPer)} XP`).join(" · ") || "—";
/** „Photosynthesis 0,1 HP/s + 1,1 HP/s × p“ — alle Skills mit Effekt regen_hp */
const regenList = () => ALL_SKILL_LIST
  .flatMap((t) => { const e = getSkillEffect(t.id, "regen_hp"); return e ? [`${t.name} (${valueFormula(e.formula, (x) => `${num(x)} HP/s`)})`] : []; })
  .join(", ") || "—";
const formulaBox = (f: string) => `<div class="idx-effect"><div class="idx-formula">${f}</div></div>`;
const reason = (t: string) => `<p class="idx-reason">${t}</p>`;

interface AttributePage { id: string; icon: string; name: string; sub: string; html: () => string }

const ATTRIBUTE_PAGES: AttributePage[] = [
  {
    id: "strength", icon: "💪", name: "Stärke", sub: "verstärkt Angriffe, die mit Stärke skalieren",
    html: () => {
      const sumMax = maxAttributePoints("strength");
      const total = sumMax * (1 + SIZE_STRENGTH_BONUS_MAX);
      const boosted = ALL_SKILL_LIST.flatMap((t) => {
        const sc = t.scaling?.find((x) => x.attribute === "strength");
        return sc ? [skillChip(t, ` +${pct(sc.perPoint)}/Punkt`)] : [];
      }).join("");
      return [
        `<p class="idx-desc">Muskelkraft des Blobs. Sie kommt aus Skills (Bewegung, Superstrength); die Körpergröße verstärkt sie prozentual.</p>`,
        params([
          ["Skala", `0 → ${num(sumMax)} aus Skills, × bis ${factor(1 + SIZE_STRENGTH_BONUS_MAX)} durch Größe → höchstens ${num(total)}`],
          ["Wirkung", `Schaden × (1 + Bonus je Punkt × Stärke), Bonus steht am Angriff`],
        ]),
        section("Formel", formulaBox(`Stärke = (Σ Stärke-Effekte der eingeschalteten Passiv-Skills) × (1 + ${pct(SIZE_STRENGTH_BONUS_MAX)} × min(1, Wachstum / ${num(PLAYER_SIZE_GROWTH_MAX)}))`)),
        section("Quellen", sourceTable("strength", (v) => num(v, 1))),
        section("Größenfaktor", pointsChart({
          label: "Faktor der Körpergröße auf die Stärke über das Wachstum", unit: "Wachstum", maxPoints: Math.ceil(PLAYER_SIZE_GROWTH_MAX),
          value: (g) => 1 + calcSizeStrengthBonus(g), format: (v) => factor(v),
          formula: `1 + ${pct(SIZE_STRENGTH_BONUS_MAX)} × min(1, Wachstum / ${num(PLAYER_SIZE_GROWTH_MAX)})`,
        })),
        section("Verstärkt", boosted ? `<div>${boosted}</div>` : ""),
        reason("Vorgabe (Entwickler): Bewegung gibt Stärke; die Körpergröße erhöht die Stärke prozentual. " +
          "Begründung (Vorschlag Claude, übernommen): Ein größerer Körper hat mehr Muskelmasse; Bewegung trainiert Kraft. " +
          "Gegner haben kein Wachstum, bei ihnen zählt nur die Summe der Skills."),
      ].join("");
    },
  },
  {
    id: "dexterity", icon: "🎯", name: "Geschick", sub: "Präzision: bessere Treffer-Stufen",
    html: () => [
      `<p class="idx-desc">Körperbeherrschung. Geschick macht Treffer präziser — mehr schwere und kritische, weniger leichte und verfehlte — und lässt Gegner seltener gut treffen. Es erhöht keinen Schaden.</p>`,
      params([
        ["Skala", `0 → ${num(maxAttributePoints("dexterity"))} (Summe der Höchstwerte aller Skills)`],
        ["Wirkung", "Kippt die Treffer-Stufen jedes Angriffs (HitSystem)"],
      ]),
      section("Formel", formulaBox(`Geschick = Σ Geschick-Effekte aller bekannten Skills (beim Angriff ohne den Beitrag des eingesetzten Skills)<br>` +
        `kipp = ${num(HIT_TILT_MAX)} · tanh(${num(HIT_TILT_PER_SKILL_LEVEL)} · (Stufe − 1) + ${num(HIT_TILT_PER_DEX)} · (Geschick − Geschick Ziel)); p_Stufe ∝ Grund · e^(kipp · Stufe)`)),
      section("Quellen", sourceTable("dexterity", (v) => num(v, 1))),
      section("Präzision (Biss bei Natur, Ziel ohne Geschick)", pointsChart({
        label: "Schwere + kritische Treffer über Geschick", unit: "Geschick", maxPoints: maxAttributePoints("dexterity"),
        naturPoints: maxAttributePoints("dexterity", NATUR_PROGRESS), format: pct,
        value: (d) => { const c = calcHitChances(ALL_SKILLS.get("bite")?.hitProfile ?? DEFAULT_HIT_PROFILE, NATUR_PROGRESS, d, 0); return c.heavy + c.crit; },
      })),
      reason("Vorgabe (Entwickler): Geschick erhöht die Präzision, nicht den Schaden. Begründung (Entwickler): Geschick ermöglicht, " +
        "bei Schlägen und Stichen besser zu treffen, nicht fester zuzuschlagen."),
    ].join(""),
  },
  {
    id: "speed", icon: "💨", name: "Tempo", sub: "Bewegung — der beste Bewegungs-Skill zählt",
    html: () => [
      `<p class="idx-desc">Wie schnell sich der Blob bewegt. Ohne Bewegungs-Skill kann er sich gar nicht bewegen. Es zählt der beste eingeschaltete Bewegungs-Skill; er bekommt auch die Erfahrung.</p>`,
      params([
        ["Grundtempo", `${num(PLAYER_SPEED_PER_WORLD_RADIUS)} Körperradien/s bei Faktor ×1`],
        ["Skala", `Faktor 0 (keine Bewegung) → ${factor(maxEffectOverSkills("move_speed"))}`],
        ["Erfahrung", `nur der aktive Bewegungs-Skill, je zurückgelegtem Körperradius — Menge am Skill: ${practiceList("move_speed")}`],
      ]),
      section("Formel", formulaBox(`Tempo = Körperradius × ${num(PLAYER_SPEED_PER_WORLD_RADIUS)} × bester Tempo-Faktor (px/s) — auf dem Bildschirm bei jeder Größe gleich schnell`)),
      section("Quellen", sourceTable("move_speed", (v) => `${factor(v)} · ${num(v * PLAYER_SPEED_PER_WORLD_RADIUS, 1)} R/s`)),
      reason("Vorgabe (Entwickler): Das Tempo steigt mit dem Skill — am Anfang langsam, nach kurzer Zeit annehmbar schnell. " +
        "Wurm und Schnecke geben Kriechen, Insekten Krabbeln, später kommt Laufen. " +
        "Begründung (Vorschlag Claude, übernommen): Der beste Skill zählt, nicht die Summe — wer laufen kann, kriecht nicht zusätzlich."),
    ].join(""),
  },
  {
    id: "sight", icon: "👁️", name: "Sicht", sub: "Sichtweite, Farbe, Rot",
    html: () => [
      `<p class="idx-desc">Was der Blob sieht. Ohne Seh-Skill ist alles schwarz. Lichtsinn zeigt Graustufen, Facettenaugen bringen Farbe ohne Rot, die Hauptaugen der Springspinne volle Farbe. Außerhalb der Sichtweite wird es weich dunkel.</p>`,
      params([
        ["Sichtweite", `0 (blind) → ${num(maxEffectOverSkills("sight_range"))} Körperradien, der beste Seh-Skill zählt`],
        ["Farbe", "0 % = Graustufen → 100 % = Farbe (ohne Rot)"],
        ["Rot", "0 % = Rot erscheint dunkel → 100 % = volle Farbe"],
        ["Erfahrung", `jeder eingeschaltete Seh-Skill, je Sekunde — Menge am Skill: ${practiceList("sight_range")}`],
        ["Weicher Rand", `äußere ${pct(SIGHT_EDGE_FRACTION)} der Sichtweite`],
      ]),
      section("Formel", formulaBox("Sichtweite = bester Effekt „Sichtweite“ · Farbe = bester Effekt „Farbsehen“ · Rot = bester Effekt „Rot sehen“<br>" +
        "Bild = lerp(Graustufen, lerp(ohne Rot, volle Farbe, Rot), Farbe)")),
      section("Sichtweite", sourceTable("sight_range", (v) => `${num(v, 1)} R`)),
      section("Farbe", sourceTable("color_vision", pct)),
      section("Rot", sourceTable("red_vision", pct)),
      reason("Vorgabe (Entwickler): Sehen wird erst gelernt, mit dem Übergang von Schwarz über Schwarz-Weiß zu Farbe. " +
        "Begründung (Vorschlag Claude, übernommen): Farbsehen braucht mehrere Sorten Lichtsinneszellen; mit einer Sorte sieht man nur hell und dunkel. " +
        "Insekten sehen UV, Blau und Grün, aber kaum Rot; Springspinnen haben die schärfsten Augen der Kleintiere."),
    ].join(""),
  },
  {
    id: "growth", icon: "📏", name: "Größe und Wachstum", sub: "aus verdauten Pflanzenfasern (Wachsen)",
    html: () => [
      `<p class="idx-desc">Der Körper wächst nur durch den Skill Wachsen: Verdaute Pflanzenfasern werden Körpermasse. Das Wachstum bestimmt Größe, Reichweite, MaxHP, MaxMP und den Größenbonus auf die Stärke.</p>`,
      params([
        ["Wachstum", `log₂(1 + Körpermasse / ${num(GROWTH_FIBER_SCALE)})`],
        ["Radius", `${num(PLAYER_WORLD_RADIUS_MIN)} → ${num(PLAYER_WORLD_RADIUS_MAX)} px, linear bis Wachstum ${num(PLAYER_SIZE_GROWTH_MAX)} (ausgewachsen, 120 kg)`],
        ["Reichweite", `${num(PLAYER_REACH_FACTOR)} × Radius, bis zum Rand des Ziels`],
        ["Ausgewachsen", `${num(MAX_BODY_MASS_KG)} kg = ${num(MAX_BODY_MASS)} Pflanzenfasern (1 Faser = ${num(KG_PER_FIBER, 1)} kg); danach verdaut Wachsen nicht mehr. Das Nest gilt als ausgewachsen.`],
      ]),
      growthHtml(),
      reason("Vorgabe (Entwickler): Wachsen verbraucht Pflanzenfasern, wirkt passiv über die Zeit und ersetzt die Erfahrung als Quelle des Wachstums."),
    ].join(""),
  },
  {
    id: "blobforms", icon: "🧫", name: "Blob-Formen", sub: "niederlassen, abspalten, verschmelzen, erheben, vertrocknen",
    html: () => [
      `<p class="idx-desc">Der Blob kann sich niederlassen und arbeitet dann von allein. Von einem niedergelassenen Blob spaltet sich ein Reisender ab. Wird der Reisende besiegt, vertrocknet er; mit ihm verschmelzen holt seinen Stand zurück (GDD-10).</p>`,
      params([
        ["Niederlassen", `erst mit Bewegen, nur ohne Aggro seit ${num(SETTLE_AGGRO_LOCK_MS / 1000)} s; nicht ausgewachsen kann man sich danach nur erheben`],
        ["Abspalten", `nur ausgewachsen (das Nest immer); der Körper entsteht aus den Pflanzenfasern im Lager, höchstens ${num(MAX_BODY_MASS)}; übrige Ressourcen nach Wahl im Verteilen-Dialog (voreingestellt halbe-halbe)`],
        ["Verschmelzen", "der Reisende geht in den berührten Blob hinein; je Skill der höchste Wert; alle Ressourcen und die Körpermasse (als Fasern) gehen über; HP und MP: der niedrigere Anteil"],
        ["Erheben", "derselbe Blob reist weiter, mit seiner Größe; Fasern im Lager werden nicht zu Körpermasse. Nicht das Nest."],
        ["Kapazität beim Verschmelzen", `darf über die Kapazität steigen, höchstens ${pct(OVERSTRETCH_MAX_FRACTION)} darüber, schmilzt dann ab`],
        ["Arbeitsreichweite", `${num(WORK_RANGE_MIN_PX)} px frisch → ${num(WORK_RANGE_MAX_PX)} px ausgewachsen (Nest ${num(WORK_RANGE_MAX_PX)} px)`],
        ["Tätigkeit", `Analysieren oder Absorbieren an friedlichen Wesen, eine Aktion je ${num(ACTION_SECONDS)} s, Mittelwerte statt Würfel, ohne Übertraining`],
        ["Quellen", "die festen Entstehungsorte friedlicher Wesen aus der Weltgenerierung; jeden Ort erntet nur der nächste niedergelassene Blob, in dessen Arbeitsreichweite er liegt (überlappen sich zwei, teilt die Mittellinie). Neu verteilt beim Niederlassen, Erheben, Verschmelzen, Wechseln und wenn ein Blob wächst"],
        ["Ertrag pro Stunde", "steht im WERTE-Reiter, solange das Bewusstsein bei einem niedergelassenen Blob ist"],
      ]),
      reason("Vorgabe (Entwickler): Der Blob stirbt nicht. Begründung (Entwickler): Das entspricht dem Vorbild Physarum polycephalum — es teilt sich, Teile verschmelzen wieder, und bei Gefahr trocknet es zu einer Dauerform ein."),
    ].join(""),
  },
  {
    id: "vitals", icon: "❤️", name: "HP und MP", sub: "Lebens- und Magiepunkte aus dem Wachstum",
    html: () => [
      `<p class="idx-desc">Lebenspunkte und Magiepunkte wachsen mit dem Körper.</p>`,
      params([
        ["MaxHP", `${hp(BASE_HP)} + Wachstum × ${hp(HP_PER_GROWTH)}`],
        ["MaxMP", `${hp(BASE_MP)} + Wachstum × ${hp(MP_PER_GROWTH)}`],
        ["MP-Regeneration", `${hp(MP_REGEN_MILLI_PER_SECOND)} MP/s, konstant`],
        ["HP-Regeneration", `nur durch Skills mit Heilung: ${regenList()}`],
      ]),
      reason("Startwerte und Zuwachs: Begründung offen (GDD-03 Abschnitt 3)."),
    ].join(""),
  },
];

function attributeList(query: string): string {
  const rows = ATTRIBUTE_PAGES.filter((a) => matches(query, a.name, a.id))
    .map((a) => row(`data-attr="${a.id}"`, a.icon, a.name, a.sub));
  return rows.length ? `<div class="idx-group">Grundwerte des Blobs</div>${rows.join("")}` : `<p class="empty-hint">Kein Grundwert gefunden.</p>`;
}

function attributeDetail(id: string): string {
  const a = ATTRIBUTE_PAGES.find((x) => x.id === id)!;
  return titleBlock(a.icon, a.name, a.sub) + a.html();
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
type Page = { kind: "skill" | "entity" | "attr"; id: string };

export function createIndexView(root: HTMLElement): void {
  injectStyles();

  let tab: "skills" | "entities" | "attrs" = "skills";
  let query = "";
  const stack: Page[] = [];

  root.classList.add("idx");
  root.innerHTML = `
    <div class="idx-bar">
      <div class="idx-seg">
        <button data-sec="skills">Skills (${ALL_SKILL_LIST.length})</button>
        <button data-sec="entities">Einheiten (${ENTITY_DEFINITIONS.length})</button>
        <button data-sec="attrs">Grundwerte</button>
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
      body.innerHTML = tab === "skills" ? skillList(query) : tab === "entities" ? entityList(query) : attributeList(query);
    } else {
      const detail = page.kind === "skill" ? skillDetail(ALL_SKILLS.get(page.id)!)
        : page.kind === "entity" ? entityDetail(ENTITY_MAP.get(page.id)!)
        : attributeDetail(page.id);
      body.innerHTML = `<button class="idx-back">← Zurück</button>${detail}`;
    }
    root.closest(".gm-body")?.scrollTo(0, 0);
  }

  root.addEventListener("click", (ev) => {
    const t = (ev.target as HTMLElement).closest<HTMLElement>("[data-sec],[data-skill],[data-entity],[data-attr],.idx-back");
    if (!t) return;
    if (t.dataset.sec) {
      tab = t.dataset.sec as typeof tab;
      stack.length = 0;
    } else if (t.dataset.skill) {
      stack.push({ kind: "skill", id: t.dataset.skill });
    } else if (t.dataset.entity) {
      stack.push({ kind: "entity", id: t.dataset.entity });
    } else if (t.dataset.attr) {
      stack.push({ kind: "attr", id: t.dataset.attr });
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
