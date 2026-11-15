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
// Umsetzungsschritt 3: Quellen = Momentaufnahme der friedlichen Wesen in
// Arbeitsreichweite. Schritt 6 ergänzt „der nächste Blob erntet“ (8.3).
// Keine Phaser-Abhängigkeit.
// ============================================================

import type { PlayerState, WorldState } from "../types/GameState";
import type { BlobActivity, ActivitySource } from "../types/Blob";
import type { ProgressionEvent } from "../types/Skill";
import { ENTITY_MAP } from "../data/entities";
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

/** Friedliche Wesen (behavior passive) im Umkreis — als Liste je Art. */
export function snapshotSources(world: WorldState, x: number, y: number, range: number): ActivitySource[] {
  const byId = new Map<string, ActivitySource>();
  for (const inst of world.entities.values()) {
    const def = ENTITY_MAP.get(inst.definitionId);
    if (!def || def.behavior !== "passive") continue;
    if (Math.hypot(inst.x - x, inst.y - y) > range) continue;
    const src = byId.get(def.id) ?? { entityId: def.id, count: 0, respawnSeconds: def.respawnTime };
    src.count += 1;
    byId.set(def.id, src);
  }
  return [...byId.values()];
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
  if (!activity || activity === "rest" || seconds <= 0) return result;
  const method = activity;
  const total = sources.reduce((sum, s) => sum + s.count, 0);
  if (total <= 0) return result;

  for (const src of sources) {
    const def = ENTITY_MAP.get(src.entityId);
    if (!def) continue;
    let attempts = (seconds / ACTION_SECONDS) * (src.count / total);
    if (method === "absorb") attempts = Math.min(attempts, src.count * seconds / Math.max(1, src.respawnSeconds));
    const coreLevel = levelFromProgress(getCoreProgress(player, method));
    const successes = attempts * calcSuccessChance(coreLevel, def.level);
    if (successes <= 0) continue;

    // Kern-Fähigkeit (lernt beim Nachrechnen wie jeder Skill, GDD-10 8.5)
    const coreXp = scaleXp(BASE_XP_CORE, def.level, coreLevel) * successes;
    result.events.push(...gainExperienceCalm(player, method, coreXp, Infinity, practicedAt).events);

    // Skill-Funde je Skill
    for (const drop of def.skillDrops) {
      const finds = successes * drop.chance * (method === "analyze" ? ANALYZE_CHANCE_MODIFIER : 1);
      if (finds <= 0) continue;
      if (player.discoveredSkills.has(drop.skillId)) {
        const base = method === "absorb" ? BASE_XP_ABSORB : BASE_XP_ANALYZE;
        const raw = scaleXp(base, def.level, levelFromProgress(getSkillProgress(player, drop.skillId))) * finds;
        result.events.push(...gainExperienceCalm(player, drop.skillId, raw, settledCapacityLimit(player), practicedAt).events);
      } else {
        const key = `find:${drop.skillId}`;
        carry[key] = (carry[key] ?? 0) + finds;
        if (carry[key] >= 1) {
          discoverSkill(player, drop.skillId, method, def.level); // Entdeckung bringt keine XP (wie von Hand)
          delete carry[key];
          result.discovered.push(drop.skillId);
        }
      }
    }

    // Materialien nur beim Absorbieren
    if (method === "absorb") {
      for (const drop of def.materialDrops) {
        const key = `mat:${drop.materialId}`;
        carry[key] = (carry[key] ?? 0) + successes * drop.chance * (drop.amountMin + drop.amountMax) / 2;
        const whole = Math.floor(carry[key] + 1e-9);
        if (whole > 0) {
          carry[key] -= whole;
          addMaterial(player, drop.materialId, whole);
          result.materials[drop.materialId] = (result.materials[drop.materialId] ?? 0) + whole;
        }
      }
    }
  }
  return result;
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
