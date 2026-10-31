// ============================================================
// PROGRESSION SYSTEM
// Absorb & Evolve — Erfahrung, Ränge, Kapazität, Übertraining
//
// Hier steht, WIE gerechnet wird. Alle Stellschrauben und die
// Begründungen dazu stehen in src/data/progression.ts — gleiche
// Abschnittsnummern (1–6), damit man beide Dateien nebeneinander
// lesen kann. Ausführlich: GDD-02 Abschnitt 8, GDD-08 Teil 6.
//
// Ablauf, wenn ein Skill Erfahrung bekommt (gainExperience):
//
//   Roh-XP (aus Kampf, Absorb, Analyze …)
//     │
//     ├─ 5. Wiedererlernen: unter dem Höchststand zählt jede XP doppelt
//     │
//     ├─ 6. Übertraining: je müder der Skill, desto weniger wirkt sofort;
//     │     der Rest wird „ausstehend“ und kommt in der Ruhe nach
//     │
//     ├─ sofortiger Anteil → Skill-Erfahrung (Höchststand, Lebenserfahrung)
//     │
//     └─ 3./4. Kapazität: liegt die Summe über Kapazität + Überdehnung,
//              wird sofort von den am längsten nicht geübten Skills abgezogen
//
// Einmal pro Spielsekunde (tickProgression):
//   6. Ruhe: Ermüdung sinkt, ausstehende Erfahrung wird gutgeschrieben
//      (Echtzeit — läuft auch offline weiter)
//   4. Überhang über der Kapazität schmilzt ab (nur Spielzeit)
//
// Dieselben Regeln gelten für Blob und Gegner: Ein Skill ist einmal
// definiert und wird mit unterschiedlich viel Erfahrung ausgewertet
// (getEntitySkillPractice).
//
// Keine Phaser-Abhängigkeit. Kein Rendering.
// ============================================================

import type { SkillProgress, ProgressionEvent } from "../types/Skill";
import type { PlayerState } from "../types/GameState";
import type { EntityDefinition } from "../types/Entity";
import { ALL_SKILLS } from "../data/skills";
import {
  PRACTICE_CURVE_EXPONENT,
  PRACTICE_XP_FACTOR,
  SKILL_RANKS,
  CAPACITY_BASE,
  CAPACITY_PER_GROWTH,
  GROWTH_XP_SCALE,
  OVERSTRETCH_MAX_FRACTION,
  OVERSTRETCH_HALF_LIFE_PLAY_SECONDS,
  RELEARN_MULTIPLIER,
  OVERTRAINING_THRESHOLD_FACTOR,
  RECOVERY_HALF_LIFE_MS,
  REST_DELAY_MS,
} from "../data/progression";

// -----------------------------------------------------------
// 1. ERFAHRUNG → ÜBUNGSGRAD
// -----------------------------------------------------------

/** Lernaufwand eines Skills aus skills.ts (unbekannte Skills: 1). */
export function getLearningEffort(skillId: string): number {
  return ALL_SKILLS.get(skillId)?.learningEffort ?? 1;
}

/**
 * Übungsgrad u ≥ 1 aus Erfahrung — stetig, ohne Sprünge.
 * Mit u werden alle Effekt-Formeln ausgewertet (evalFormula).
 */
export function practiceFromXp(xp: number, learningEffort: number): number {
  if (xp <= 0) return 1;
  return 1 + Math.pow(xp / (learningEffort * PRACTICE_XP_FACTOR), 1 / PRACTICE_CURVE_EXPONENT);
}

/** Umkehrung: wie viel Erfahrung für Übungsgrad u nötig ist. */
export function xpForPractice(practice: number, learningEffort: number): number {
  if (practice <= 1) return 0;
  return learningEffort * PRACTICE_XP_FACTOR * Math.pow(practice - 1, PRACTICE_CURVE_EXPONENT);
}

/** Übungsgrad eines Skills des Spielers (nicht entdeckt: 1). */
export function getSkillPractice(player: PlayerState, skillId: string): number {
  const inst = player.discoveredSkills.get(skillId);
  return inst ? practiceFromXp(inst.xp, getLearningEffort(skillId)) : 1;
}

/** Übungsgrad einer Kern-Fähigkeit (Analyze/Absorb). */
export function getCorePractice(player: PlayerState, ability: "absorb" | "analyze"): number {
  return practiceFromXp(player.coreAbilities[ability].xp, getLearningEffort(ability));
}

/**
 * Übungsgrade einer Gegner-Art { skillId → u }.
 * Gegner tragen in entities.ts Erfahrung (skillXp) — dieselbe Umrechnung
 * wie beim Blob, damit derselbe Skill bei gleicher Erfahrung gleich wirkt.
 */
const entityPracticeCache = new WeakMap<EntityDefinition, Record<string, number>>();
export function getEntitySkillPractice(def: EntityDefinition): Record<string, number> {
  let cached = entityPracticeCache.get(def);
  if (!cached) {
    cached = {};
    for (const [id, xp] of Object.entries(def.skillXp ?? {})) {
      cached[id] = practiceFromXp(xp, getLearningEffort(id));
    }
    entityPracticeCache.set(def, cached);
  }
  return cached;
}

// -----------------------------------------------------------
// 2. RÄNGE (nur Anzeige)
// -----------------------------------------------------------

/** Index des Rangs für einen Übungsgrad (0 = erster Rang). */
export function rankIndexForPractice(practice: number): number {
  let index = 0;
  for (let i = 0; i < SKILL_RANKS.length; i++) {
    if (practice >= SKILL_RANKS[i].fromPractice) index = i;
  }
  return index;
}

/** Rangname für einen Übungsgrad (z. B. für Gegner-Anzeigen). */
export function rankNameForPractice(practice: number): string {
  return SKILL_RANKS[rankIndexForPractice(practice)].name;
}

function rankIndexForXp(xp: number, learningEffort: number): number {
  return rankIndexForPractice(practiceFromXp(xp, learningEffort));
}

export interface RankInfo {
  rankName: string;
  nextRankName: string | null;   // null = höchster Rang
  /** Fortschritt im aktuellen Rang 0–1 (höchster Rang: 1) */
  fraction: number;
  /** Wo der Balken nach Gutschrift der ausstehenden Erfahrung stünde, 0–1 */
  pendingFraction: number;
  xp: number;
  pendingXp: number;
  /** Erfahrung bis zum nächsten Rang (höchster Rang: 0) */
  xpToNextRank: number;
}

/** Alles, was die Anzeige über den Fortschritt eines Skills braucht. */
export function getRankInfo(progress: SkillProgress, learningEffort: number): RankInfo {
  const index = rankIndexForXp(progress.xp, learningEffort);
  const rank = SKILL_RANKS[index];
  const next = SKILL_RANKS[index + 1];
  if (!next) {
    return {
      rankName: rank.name, nextRankName: null, fraction: 1, pendingFraction: 1,
      xp: progress.xp, pendingXp: progress.pendingXp, xpToNextRank: 0,
    };
  }
  const from = xpForPractice(rank.fromPractice, learningEffort);
  const to   = xpForPractice(next.fromPractice, learningEffort);
  const span = to - from;
  return {
    rankName: rank.name,
    nextRankName: next.name,
    fraction: clamp01((progress.xp - from) / span),
    pendingFraction: clamp01((progress.xp + progress.pendingXp - from) / span),
    xp: progress.xp,
    pendingXp: progress.pendingXp,
    xpToNextRank: Math.max(0, to - progress.xp),
  };
}

// -----------------------------------------------------------
// 3. KAPAZITÄT
// -----------------------------------------------------------

/** Wachstum des Blobs — stetig, schrumpft nie (Platzhalter, siehe progression.ts). */
export function calcGrowth(lifetimeXp: number): number {
  return Math.log2(1 + Math.max(0, lifetimeXp) / GROWTH_XP_SCALE);
}

/** Kapazität: so viel Erfahrung können alle Skills zusammen dauerhaft halten. */
export function calcCapacity(player: PlayerState): number {
  return CAPACITY_BASE + CAPACITY_PER_GROWTH * calcGrowth(player.lifetimeXp);
}

/** Belegte Kapazität = Summe der Erfahrung aller entdeckten Skills (ohne Kern-Fähigkeiten). */
export function calcCapacityUsed(player: PlayerState): number {
  let used = 0;
  for (const inst of player.discoveredSkills.values()) used += inst.xp;
  return used;
}

export interface CapacityInfo {
  used: number;
  capacity: number;
  /** Harte Obergrenze inkl. Überdehnung */
  limit: number;
  /** Überhang über der Kapazität (0 = keiner) */
  overstretch: number;
}

export function getCapacityInfo(player: PlayerState): CapacityInfo {
  const used = calcCapacityUsed(player);
  const capacity = calcCapacity(player);
  return {
    used,
    capacity,
    limit: capacity * (1 + OVERSTRETCH_MAX_FRACTION),
    overstretch: Math.max(0, used - capacity),
  };
}

// -----------------------------------------------------------
// Ereignisse (für Log und Anzeige)
// -----------------------------------------------------------
export type { ProgressionEvent };

export interface GainResult {
  /** Sofort gutgeschrieben */
  xpNow: number;
  /** Wegen Übertraining zurückgehalten — kommt in der Ruhe nach */
  xpDeferred: number;
  events: ProgressionEvent[];
}

const NO_GAIN: GainResult = { xpNow: 0, xpDeferred: 0, events: [] };

// -----------------------------------------------------------
// Interne Sicht: ein Fortschritts-Strang (Skill oder Kern-Fähigkeit)
// -----------------------------------------------------------
interface Track {
  id: string;
  progress: SkillProgress;
  learningEffort: number;
  /** Kern-Fähigkeiten belegen keine Kapazität und werden nie verlernt */
  usesCapacity: boolean;
  discoveredAt: number;
}

function findTrack(player: PlayerState, skillId: string): Track | null {
  if (skillId === "absorb" || skillId === "analyze") {
    return {
      id: skillId, progress: player.coreAbilities[skillId],
      learningEffort: getLearningEffort(skillId), usesCapacity: false, discoveredAt: 0,
    };
  }
  const inst = player.discoveredSkills.get(skillId);
  if (!inst) return null;
  return {
    id: skillId, progress: inst,
    learningEffort: getLearningEffort(skillId), usesCapacity: true, discoveredAt: inst.discoveredAt,
  };
}

function allTracks(player: PlayerState): Track[] {
  const tracks = [findTrack(player, "absorb")!, findTrack(player, "analyze")!];
  for (const id of player.discoveredSkills.keys()) tracks.push(findTrack(player, id)!);
  return tracks;
}

// -----------------------------------------------------------
// ERFAHRUNG GEWINNEN — der zentrale Ablauf
// -----------------------------------------------------------

/**
 * Gibt einem Skill (oder Analyze/Absorb) Erfahrung.
 * rawXp: Betrag nach Gegner-Skalierung (balance.ts), vor allen
 * Progressionsregeln. nowMs: Echtzeit (Date.now()).
 */
export function gainExperience(
  player: PlayerState,
  skillId: string,
  rawXp: number,
  nowMs: number
): GainResult {
  const track = findTrack(player, skillId);
  if (!track || rawXp <= 0) return NO_GAIN;
  const p = track.progress;
  const events: ProgressionEvent[] = [];

  // Erst die Ruhe seit der letzten Übung verbuchen, dann neu trainieren
  recover(player, track, nowMs, events);

  const gained = applyRelearnBonus(p, rawXp);                       // 5.
  const share = immediateShare(p.fatigue, overtrainingThreshold(track)); // 6.
  const xpNow = gained * share;
  const xpDeferred = gained - xpNow;

  p.fatigue += gained;
  p.pendingXp += xpDeferred;
  p.lastPracticedAt = player.playtimeSeconds;
  p.lastTrainedRealMs = nowMs;

  credit(player, track, xpNow, events);                             // 3./4.
  return { xpNow, xpDeferred, events };
}

/**
 * Schreibt Erfahrung gut: Skill-XP, Höchststand, Lebenserfahrung — und
 * erzwingt danach die harte Kapazitätsgrenze.
 */
function credit(player: PlayerState, track: Track, amount: number, events: ProgressionEvent[]): void {
  if (amount <= 0) return;
  const p = track.progress;
  const rankBefore = rankIndexForXp(p.xp, track.learningEffort);

  p.xp += amount;
  p.peakXp = Math.max(p.peakXp, p.xp);
  p.totalXpEarned += amount;
  player.lifetimeXp += amount;

  const rankAfter = rankIndexForXp(p.xp, track.learningEffort);
  if (rankAfter > rankBefore) {
    events.push({ skillId: track.id, kind: "rank_up", rankName: SKILL_RANKS[rankAfter].name });
  }
  if (track.usesCapacity) enforceHardLimit(player, track.id, events);
}

// -----------------------------------------------------------
// 3./4. KAPAZITÄT ERZWINGEN UND VERLERNEN
// -----------------------------------------------------------

/**
 * Harte Grenze: Kapazität × (1 + Überdehnung). Was darüber liegt, wird
 * sofort verlernt — zuerst bei den am längsten nicht geübten Skills.
 * Der gerade trainierte Skill ist geschützt; nur wenn sonst nichts mehr
 * übrig ist, wird er selbst gekappt.
 */
function enforceHardLimit(player: PlayerState, protectedId: string, events: ProgressionEvent[]): void {
  const { used, limit } = getCapacityInfo(player);
  let excess = used - limit;
  if (excess <= 0) return;
  excess = forgetLeastPracticed(player, excess, protectedId, events);
  if (excess > 0) {
    const own = findTrack(player, protectedId)!;
    forgetFrom(own, Math.min(excess, own.progress.xp), events);
  }
}

/**
 * Zieht `amount` Erfahrung ab — reihum von den Skills, die am längsten
 * nicht geübt wurden (Gleichstand: zuerst entdeckt). Gibt zurück, wie viel
 * nicht abgezogen werden konnte.
 */
function forgetLeastPracticed(
  player: PlayerState,
  amount: number,
  protectedId: string | null,
  events: ProgressionEvent[]
): number {
  const candidates = allTracks(player)
    .filter((t) => t.usesCapacity && t.id !== protectedId && t.progress.xp > 0)
    .sort((a, b) =>
      a.progress.lastPracticedAt - b.progress.lastPracticedAt || a.discoveredAt - b.discoveredAt);

  let remaining = amount;
  for (const track of candidates) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, track.progress.xp);
    forgetFrom(track, take, events);
    remaining -= take;
  }
  return remaining;
}

/** Verlernt Erfahrung eines Skills. Höchststand bleibt — für das Wiedererlernen. */
function forgetFrom(track: Track, amount: number, events: ProgressionEvent[]): void {
  if (amount <= 0) return;
  const p = track.progress;
  const rankBefore = rankIndexForXp(p.xp, track.learningEffort);
  p.xp = Math.max(0, p.xp - amount);
  const rankAfter = rankIndexForXp(p.xp, track.learningEffort);
  if (rankAfter < rankBefore) {
    events.push({ skillId: track.id, kind: "rank_down", rankName: SKILL_RANKS[rankAfter].name });
  }
}

// -----------------------------------------------------------
// 5. WIEDERERLERNEN
// -----------------------------------------------------------

/**
 * Unter dem Höchststand zählt jede XP RELEARN_MULTIPLIER-fach — aber nur
 * bis der Höchststand wieder erreicht ist. Ausstehende Erfahrung zählt dabei
 * schon mit, sonst ließe sich der Bonus über das Übertraining doppelt holen.
 */
function applyRelearnBonus(p: SkillProgress, rawXp: number): number {
  const gap = Math.max(0, p.peakXp - (p.xp + p.pendingXp));
  const rawBelowPeak = Math.min(rawXp, gap / RELEARN_MULTIPLIER);
  return rawBelowPeak * RELEARN_MULTIPLIER + (rawXp - rawBelowPeak);
}

// -----------------------------------------------------------
// 6. ÜBERTRAINING UND RUHE
// -----------------------------------------------------------

function overtrainingThreshold(track: Track): number {
  return track.learningEffort * OVERTRAINING_THRESHOLD_FACTOR;
}

/** Sofortanteil: 1 unter der Schwelle, darüber Schwelle / Ermüdung. */
export function immediateShare(fatigue: number, threshold: number): number {
  return fatigue <= threshold ? 1 : threshold / fatigue;
}

/**
 * Ruhe verbuchen: Ermüdung und ausstehende Erfahrung halbieren sich je
 * RECOVERY_HALF_LIFE_MS. Was von der ausstehenden Erfahrung abschmilzt,
 * wird gutgeschrieben. Die Ruhe eines Skills beginnt erst REST_DELAY_MS
 * nach seiner letzten Übung. Echtzeit — Offline-Zeit zählt mit.
 */
function recover(player: PlayerState, track: Track, nowMs: number, events: ProgressionEvent[]): boolean {
  const p = track.progress;
  const restStart = Math.max(p.fatigueUpdatedAt, p.lastTrainedRealMs + REST_DELAY_MS);
  if (nowMs <= restStart) return false;
  p.fatigueUpdatedAt = nowMs;
  if (p.fatigue <= 0 && p.pendingXp <= 0) return false;

  const keep = Math.pow(0.5, (nowMs - restStart) / RECOVERY_HALF_LIFE_MS);
  p.fatigue *= keep;
  let release = p.pendingXp * (1 - keep);
  if (p.pendingXp - release < 0.01) release = p.pendingXp; // Reste nicht ewig mitschleppen
  p.pendingXp -= release;
  credit(player, track, release, events);
  return release > 0;
}

// -----------------------------------------------------------
// TAKT — einmal pro Spielsekunde, und beim Laden
// -----------------------------------------------------------

/**
 * nowMs: Echtzeit für die Ruhe (6.). playSecondsElapsed: vergangene
 * Spielzeit für das Abschmelzen des Überhangs (4.) — beim Laden 0, damit
 * Pausen die Überdehnung nicht abbauen.
 */
export function tickProgression(
  player: PlayerState,
  nowMs: number,
  playSecondsElapsed: number
): { changed: boolean; events: ProgressionEvent[] } {
  const events: ProgressionEvent[] = [];
  let changed = false;

  for (const track of allTracks(player)) {
    if (recover(player, track, nowMs, events)) changed = true;
  }

  if (playSecondsElapsed > 0) {
    const { overstretch } = getCapacityInfo(player);
    if (overstretch > 0) {
      const melt = overstretch * (1 - Math.pow(0.5, playSecondsElapsed / OVERSTRETCH_HALF_LIFE_PLAY_SECONDS));
      forgetLeastPracticed(player, melt, null, events);
      changed = true;
    }
  }
  return { changed, events };
}

/**
 * Nach dem Laden: Ruhe seit dem Speichern verbuchen und die harte Grenze
 * herstellen (alte Spielstände können darüber liegen).
 */
export function settleAfterLoad(player: PlayerState, nowMs: number): ProgressionEvent[] {
  const { events } = tickProgression(player, nowMs, 0);
  const { used, limit } = getCapacityInfo(player);
  if (used > limit) forgetLeastPracticed(player, used - limit, null, events);
  return events;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// ------------------------------------------------------------
// Zuletzt geändert: 2026-10-30 — Erstfassung
// ------------------------------------------------------------
