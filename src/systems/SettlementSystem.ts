// ============================================================
// SETTLEMENT SYSTEM
// Absorb & Evolve — Tätigkeit niedergelassener Blobs (GDD-10 Abschnitt 8)
//
// Vorgabe (Entwickler, 14. November 2026): Im niedergelassenen Zustand gibt
// es keine aktiven Skills. Skills stehen nur innerhalb der Tätigkeiten zur
// Fertigung bereit; Analyze und Absorb zählen in dieser Form dazu.
//
// Gerechnet wird mit Mittelwerten statt Würfeln (GDD-10 Abschnitt 8.5):
//   Versuche   = Zeit / Aktionsdauer × Anteil der Art
//   Absorbieren höchstens Anzahl × Zeit / Respawn
//   Erfolge    = Versuche × Erfolgschance
//   Erfahrung  = Erfolge × XP je Erfolg (ohne Übertraining)
//   Materialien = Erfolge × Fundchance × mittlere Menge (Bruchteile aufheben)
//   Skill-Funde = Erfolge × Skill-Chance (Analysieren × 0,7), je Skill
//                 aufsummiert; ab 1 wird ein neuer Skill entdeckt
// Die gerechnete Arbeit nimmt die echten Wesen nicht weg (kein sichtbares
// Abweiden, GDD-10 Abschnitt 10).
//
// Quellen (GDD-10 8.3, Umsetzungsschritt 6): die festen Entstehungsorte
// friedlicher Wesen aus der Weltgenerierung (generateChunk, Seed) — ohne
// geladene Welt bestimmbar. Jeder Ort gehört dem nächsten niedergelassenen
// Blob, in dessen Arbeitsreichweite er liegt („der nächste Blob erntet“).
// Keine Phaser-Abhängigkeit.
// ============================================================

import type { PlayerState } from "../types/GameState";
import type { BlobActivity, ActivitySource } from "../types/Blob";
import type { ProgressionEvent } from "../types/Skill";
import { ENTITY_MAP } from "../data/entities";
import { generateChunk } from "../world/WorldGenerator";
import { CHUNK_PX, WORLD_CHUNKS_X, WORLD_CHUNKS_Y } from "../world/Chunk";
import {
  BASE_XP_ABSORB, BASE_XP_ANALYZE, BASE_XP_CORE, ANALYZE_CHANCE_MODIFIER,
  PLAYER_SIZE_GROWTH_MAX, calcSuccessChance, scaleXp,
} from "../data/balance";
import { ACTION_SECONDS, WORK_RANGE_MIN_PX, WORK_RANGE_MAX_PX, CATCHUP_CHUNK_SECONDS, CATCHUP_MAX_CHUNKS } from "../data/blobs";
import {
  getCoreProgress, getSkillProgress, levelFromProgress,
  gainExperienceCalm, settledCapacityLimit, meltOverstretch,
} from "./ProgressionSystem";
import { discoverSkill, updatePlayerGrowth } from "./SkillSystem";
import { addMaterial } from "./MaterialSystem";
import { calcGrowthFromMass, processGrow } from "./GrowSystem";
import { practiceXp } from "./SkillEffectSystem";
import { syncPassiveEffects, processRegeneration } from "./StatusEffectSystem";
import { regenMp } from "./CombatSystem";

export type { ActivitySource };

/** Bruchteile, die beim nächsten Mal weitergezählt werden ("mat:…", "find:…"). */
export type ActivityCarry = Record<string, number>;

export interface ActivityResult {
  events: ProgressionEvent[];
  discovered: string[];
  materials: Record<string, number>;
}

/** Arbeitsreichweite: 48 px frisch bis 96 px ausgewachsen; das Nest 96 px (data/blobs.ts 2). */
export function calcWorkRange(bodyMass: number, isNest: boolean): number {
  if (isNest) return WORK_RANGE_MAX_PX;
  const t = Math.min(1, calcGrowthFromMass(bodyMass) / PLAYER_SIZE_GROWTH_MAX);
  return WORK_RANGE_MIN_PX + (WORK_RANGE_MAX_PX - WORK_RANGE_MIN_PX) * t;
}

// -----------------------------------------------------------
// QUELLEN: der nächste Blob erntet (GDD-10 8.3)
// -----------------------------------------------------------

interface SpawnPoint { defId: string; x: number; y: number }

/** Entstehungsorte friedlicher Wesen je Chunk — die Welt entsteht immer gleich, also einmal rechnen. */
const passiveSpawnCache = new Map<string, SpawnPoint[]>();

function passiveSpawnsOfChunk(seed: number, cx: number, cy: number): SpawnPoint[] {
  const key = `${seed}:${cx}:${cy}`;
  let list = passiveSpawnCache.get(key);
  if (!list) {
    list = [];
    for (const sp of generateChunk(cx, cy, seed).spawns) {
      if (ENTITY_MAP.get(sp.defId)?.behavior !== "passive") continue;
      list.push({ defId: sp.defId, x: cx * CHUNK_PX + sp.localX, y: cy * CHUNK_PX + sp.localY });
    }
    passiveSpawnCache.set(key, list);
  }
  return list;
}

/** Entstehungsorte friedlicher Wesen im Umkreis `range` um (x, y). */
export function passiveSpawnsNear(seed: number, x: number, y: number, range: number): SpawnPoint[] {
  const out: SpawnPoint[] = [];
  const c0x = Math.max(0, Math.floor((x - range) / CHUNK_PX)), c1x = Math.min(WORLD_CHUNKS_X - 1, Math.floor((x + range) / CHUNK_PX));
  const c0y = Math.max(0, Math.floor((y - range) / CHUNK_PX)), c1y = Math.min(WORLD_CHUNKS_Y - 1, Math.floor((y + range) / CHUNK_PX));
  for (let cx = c0x; cx <= c1x; cx++) {
    for (let cy = c0y; cy <= c1y; cy++) {
      for (const sp of passiveSpawnsOfChunk(seed, cx, cy)) {
        if (Math.hypot(sp.x - x, sp.y - y) <= range) out.push(sp);
      }
    }
  }
  return out;
}

/** Ein niedergelassener Blob als Arbeitsort. */
export interface WorkSite { id: string; x: number; y: number; range: number }

/**
 * Verteilt die Entstehungsorte auf die Blobs: Jeder Ort gehört dem nächsten
 * Blob, in dessen Arbeitsreichweite er liegt. Überlappen sich zwei
 * Reichweiten, teilt die Mittellinie das Gebiet. Ergebnis: Quellen je Blob.
 */
export function assignSources(sites: WorkSite[], seed: number): Map<string, ActivitySource[]> {
  const counts = new Map<string, Map<string, number>>();
  for (const site of sites) counts.set(site.id, new Map());
  const seen = new Set<string>();
  for (const site of sites) {
    for (const sp of passiveSpawnsNear(seed, site.x, site.y, site.range)) {
      const key = `${sp.defId}@${sp.x},${sp.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      let owner: WorkSite | null = null;
      let best = Infinity;
      for (const other of sites) {
        const d = Math.hypot(sp.x - other.x, sp.y - other.y);
        if (d > other.range) continue;
        if (d < best - 1e-9 || (Math.abs(d - best) <= 1e-9 && owner && other.id < owner.id)) { owner = other; best = d; }
      }
      if (!owner) continue;
      const m = counts.get(owner.id)!;
      m.set(sp.defId, (m.get(sp.defId) ?? 0) + 1);
    }
  }
  const result = new Map<string, ActivitySource[]>();
  for (const [id, m] of counts) {
    result.set(id, [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([entityId, count]) => ({
      entityId, count, respawnSeconds: ENTITY_MAP.get(entityId)?.respawnTime ?? 60,
    })));
  }
  return result;
}

export function sameSources(a: ActivitySource[] | undefined, b: ActivitySource[] | undefined): boolean {
  const x = a ?? [], y = b ?? [];
  return x.length === y.length && x.every((s, i) => s.entityId === y[i].entityId && s.count === y[i].count && s.respawnSeconds === y[i].respawnSeconds);
}

// -----------------------------------------------------------
// RECHNUNG (GDD-10 8.5)
// -----------------------------------------------------------

/** Was die Tätigkeit in `seconds` im Mittel bringt — ohne etwas zu verändern. */
export interface ActivityPlan {
  /** Versuche (Aktionen) */
  attempts: number;
  successes: number;
  /** rohe Erfahrung der Kern-Fähigkeit (Analyze oder Absorb) */
  coreXp: number;
  /** rohe Erfahrung je schon entdecktem Skill */
  skillXp: Record<string, number>;
  /** Funde je noch nicht entdecktem Skill (ab 1 entdeckt) */
  finds: Record<string, number>;
  /** Materialien im Mittel (mit Bruchteilen) */
  materials: Record<string, number>;
}

export function planActivity(
  player: PlayerState,
  activity: BlobActivity | null | undefined,
  sources: ActivitySource[],
  seconds: number
): ActivityPlan {
  const plan: ActivityPlan = { attempts: 0, successes: 0, coreXp: 0, skillXp: {}, finds: {}, materials: {} };
  if (!activity || activity === "rest" || seconds <= 0) return plan;
  const method = activity;
  const total = sources.reduce((sum, s) => sum + s.count, 0);
  if (total <= 0) return plan;
  const coreLevel = levelFromProgress(getCoreProgress(player, method));

  for (const src of sources) {
    const def = ENTITY_MAP.get(src.entityId);
    if (!def) continue;
    let attempts = (seconds / ACTION_SECONDS) * (src.count / total);
    if (method === "absorb") attempts = Math.min(attempts, src.count * seconds / Math.max(1, src.respawnSeconds));
    const successes = attempts * calcSuccessChance(coreLevel, def.level);
    plan.attempts += attempts;
    plan.successes += successes;
    if (successes <= 0) continue;

    // Kern-Fähigkeit (lernt beim Nachrechnen wie jeder Skill, GDD-10 8.5)
    plan.coreXp += scaleXp(BASE_XP_CORE, def.level, coreLevel) * successes;

    // Skill-Funde je Skill
    for (const drop of def.skillDrops) {
      const finds = successes * drop.chance * (method === "analyze" ? ANALYZE_CHANCE_MODIFIER : 1);
      if (finds <= 0) continue;
      if (player.discoveredSkills.has(drop.skillId)) {
        const base = method === "absorb" ? BASE_XP_ABSORB : BASE_XP_ANALYZE;
        plan.skillXp[drop.skillId] = (plan.skillXp[drop.skillId] ?? 0)
          + scaleXp(base, def.level, levelFromProgress(getSkillProgress(player, drop.skillId))) * finds;
      } else {
        plan.finds[drop.skillId] = (plan.finds[drop.skillId] ?? 0) + finds;
      }
    }

    // Materialien nur beim Absorbieren
    if (method === "absorb") {
      for (const drop of def.materialDrops) {
        plan.materials[drop.materialId] = (plan.materials[drop.materialId] ?? 0)
          + successes * drop.chance * (drop.amountMin + drop.amountMax) / 2;
      }
    }
  }
  return plan;
}

/**
 * Rechnet `seconds` Spielzeit der Tätigkeit (Mittelwerte). `practicedAt`:
 * Spielzeit des Stücks für „zuletzt geübt“. Verändert player und carry.
 */
export function runActivity(
  player: PlayerState,
  activity: BlobActivity | null | undefined,
  sources: ActivitySource[],
  seconds: number,
  carry: ActivityCarry,
  practicedAt: number
): ActivityResult {
  const result: ActivityResult = { events: [], discovered: [], materials: {} };
  const plan = planActivity(player, activity, sources, seconds);
  if (plan.successes <= 0 || !activity || activity === "rest") return result;
  const method = activity;

  result.events.push(...gainExperienceCalm(player, method, plan.coreXp, Infinity, practicedAt).events);
  for (const [skillId, raw] of Object.entries(plan.skillXp)) {
    result.events.push(...gainExperienceCalm(player, skillId, raw, settledCapacityLimit(player), practicedAt).events);
  }
  for (const [skillId, finds] of Object.entries(plan.finds)) {
    const key = `find:${skillId}`;
    carry[key] = (carry[key] ?? 0) + finds;
    if (carry[key] >= 1 && !player.discoveredSkills.has(skillId)) {
      // Entdeckung bringt keine XP (wie von Hand); Stufe = stärkste Quelle, die ihn lehrt
      discoverSkill(player, skillId, method, teachingLevel(sources, skillId));
      delete carry[key];
      result.discovered.push(skillId);
    }
  }
  for (const [materialId, amount] of Object.entries(plan.materials)) {
    const key = `mat:${materialId}`;
    carry[key] = (carry[key] ?? 0) + amount;
    const whole = Math.floor(carry[key] + 1e-9);
    if (whole > 0) {
      carry[key] -= whole;
      addMaterial(player, materialId, whole);
      result.materials[materialId] = (result.materials[materialId] ?? 0) + whole;
    }
  }
  return result;
}

/** Stufe des Wesens, das den Skill lehrt (bei mehreren: die höchste). */
function teachingLevel(sources: ActivitySource[], skillId: string): number {
  let level = 1;
  for (const src of sources) {
    const def = ENTITY_MAP.get(src.entityId);
    if (def?.skillDrops.some((d) => d.skillId === skillId)) level = Math.max(level, def.level);
  }
  return level;
}

/**
 * Nachrechnen eines niedergelassenen Blobs ohne Bewusstsein von `fromPlay`
 * bis `toPlay` (Spielzeit, GDD-10 8.1/8.5): Tätigkeit, Grow (nicht im Nest),
 * Regeneration von HP und MP, Abschmelzen einer Überdehnung — in Stücken.
 */
export function catchUpSettled(
  body: PlayerState,
  opts: { activity?: BlobActivity | null; sources: ActivitySource[]; carry: ActivityCarry; isNest: boolean },
  fromPlay: number,
  toPlay: number
): ActivityResult {
  const total: ActivityResult = { events: [], discovered: [], materials: {} };
  const span = toPlay - fromPlay;
  if (span <= 0) return total;
  const chunks = Math.min(CATCHUP_MAX_CHUNKS, Math.ceil(span / CATCHUP_CHUNK_SECONDS));
  const step = span / chunks;
  syncPassiveEffects(body);
  for (let i = 0; i < chunks; i++) {
    const at = fromPlay + step * (i + 1);
    body.playtimeSeconds = at;
    const r = runActivity(body, opts.activity, opts.sources, step, opts.carry, at);
    total.events.push(...r.events);
    total.discovered.push(...r.discovered);
    for (const [k, v] of Object.entries(r.materials)) total.materials[k] = (total.materials[k] ?? 0) + v;
    if (!opts.isNest) {
      const digested = processGrow(body, step * 1000);
      if (digested > 0) {
        updatePlayerGrowth(body);
        total.events.push(...gainExperienceCalm(body, "grow", practiceXp("grow", "fiber_digested", digested), settledCapacityLimit(body), at).events);
      }
    }
    body.hp = Math.min(body.maxHp, body.hp + processRegeneration(body, step * 1000));
    regenMp(body, step * 1000);
    total.events.push(...meltOverstretch(body, step));
  }
  return total;
}

// Stand: 15. November 2026 — Erstfassung (GDD-10 Umsetzungsschritt 3)
