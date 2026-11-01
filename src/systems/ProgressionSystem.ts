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
// (getEntitySkillProgress).
//
// Keine Phaser-Abhängigkeit. Kein Rendering.
// ============================================================

import type { SkillProgress, ProgressionEvent } from "../types/Skill";
import type { PlayerState } from "../types/GameState";
import type { EntityDefinition } from "../types/Entity";
import { ALL_SKILLS } from "../data/skills";
import {
  NATUR_PROGRESS,
  NATUR_XP_PER_EFFORT,
  SKILL_RANKS,
  LEVEL_AT_NATUR,
  FORGET_AGE_FLOOR_SECONDS,
  GROWTH_XP_SCALE,
  OVERSTRETCH_MAX_FRACTION,
  OVERSTRETCH_HALF_LIFE_PLAY_SECONDS,
  RELEARN_MULTIPLIER,
  OVERTRAINING_THRESHOLD_FACTOR,
  RECOVERY_HALF_LIFE_MS,
  REST_DELAY_MS,
} from "../data/progression";

// -----------------------------------------------------------
// 1. ERFAHRUNG → FORTSCHRITT
// -----------------------------------------------------------

/** Lernaufwand eines Skills aus skills.ts (unbekannte Skills: 1). */
export function getLearningEffort(skillId: string): number {
  return ALL_SKILLS.get(skillId)?.learningEffort ?? 1;
}

/** Erfahrung, die einen Skill auf Natur (90 %) bringt. */
export function naturXp(learningEffort: number): number {
  return learningEffort * NATUR_XP_PER_EFFORT;
}

/**
 * Fortschritt p (0 … 1, erreicht 1 nie) aus Erfahrung — stetig, ohne Sprünge.
 * Mit p werden alle Skill-Werte ausgewertet: start + (max − start) × p.
 */
export function progressFromXp(xp: number, learningEffort: number): number {
  if (xp <= 0) return 0;
  return 1 - Math.pow(1 - NATUR_PROGRESS, xp / naturXp(learningEffort));
}

/** Umkehrung: wie viel Erfahrung für Fortschritt p nötig ist (p ≥ 1: unendlich). */
export function xpForProgress(progress: number, learningEffort: number): number {
  if (progress <= 0) return 0;
  if (progress >= 1) return Infinity;
  return naturXp(learningEffort) * Math.log(1 - progress) / Math.log(1 - NATUR_PROGRESS);
}

/** Fortschritt eines Skills des Spielers (nicht entdeckt: 0). */
export function getSkillProgress(player: PlayerState, skillId: string): number {
  const inst = player.discoveredSkills.get(skillId);
  return inst ? progressFromXp(inst.xp, getLearningEffort(skillId)) : 0;
}

/** Fortschritt einer Kern-Fähigkeit (Analyze/Absorb). */
export function getCoreProgress(player: PlayerState, ability: "absorb" | "analyze"): number {
  return progressFromXp(player.coreAbilities[ability].xp, getLearningEffort(ability));
}

/**
 * Fortschritt je Skill einer Gegner-Art { skillId → p }.
 * Gegner tragen in entities.ts Erfahrung (skillXp) — dieselbe Umrechnung
 * wie beim Blob, damit derselbe Skill bei gleicher Erfahrung gleich wirkt.
 */
const entityProgressCache = new WeakMap<EntityDefinition, Record<string, number>>();
export function getEntitySkillProgress(def: EntityDefinition): Record<string, number> {
  let cached = entityProgressCache.get(def);
  if (!cached) {
    cached = {};
    for (const [id, xp] of Object.entries(def.skillXp ?? {})) {
      cached[id] = progressFromXp(xp, getLearningEffort(id));
    }
    entityProgressCache.set(def, cached);
  }
  return cached;
}

// -----------------------------------------------------------
// 2b. VERGLEICHSSTUFE (Fortschritt ↔ Wesen-Stufe)
// -----------------------------------------------------------

/** Fortschritt auf der Skala der Wesen-Stufen: 0 % → 1, Natur → 10, Grenze 11. */
export function levelFromProgress(progress: number): number {
  return 1 + (LEVEL_AT_NATUR - 1) * progress / NATUR_PROGRESS;
}

/** Umkehrung (für Gegner ohne Skill, die nur eine Stufe haben). */
export function progressFromLevel(level: number): number {
  return Math.max(0, Math.min(0.999, (level - 1) * NATUR_PROGRESS / (LEVEL_AT_NATUR - 1)));
}

// -----------------------------------------------------------
// 2. RÄNGE (nur Anzeige)
// -----------------------------------------------------------

/** Index des Rangs für einen Fortschritt (0 = erster Rang). */
export function rankIndexForProgress(progress: number): number {
  let index = 0;
  for (let i = 0; i < SKILL_RANKS.length; i++) {
    if (progress + 1e-9 >= SKILL_RANKS[i].fromProgress) index = i; // Rundung an der Grenze
  }
  return index;
}

/** Rangname für einen Fortschritt (z. B. für Gegner-Anzeigen). */
export function rankNameForProgress(progress: number): string {
  return SKILL_RANKS[rankIndexForProgress(progress)].name;
}

function rankIndexForXp(xp: number, learningEffort: number): number {
  return rankIndexForProgress(progressFromXp(xp, learningEffort));
}

export interface RankInfo {
  rankName: string;
  /** Fortschritt 0–1 (allgemeines Schema, progression.ts Abschnitt 1) */
  progress: number;
  nextRankName: string | null;   // null = höchster Rang
  /** Füllstand im aktuellen Rang 0–1 (höchster Rang: von 90 % bis 100 %) */
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
  const p = progressFromXp(progress.xp, learningEffort);
  if (!next) {
    // Höchster Rang: Balken läuft weiter von der Rang-Grenze bis zum (nie
    // ganz erreichten) Höchstwert
    const fill = (q: number) => clamp01((q - rank.fromProgress) / (1 - rank.fromProgress));
    return {
      rankName: rank.name, progress: p, nextRankName: null,
      fraction: fill(p),
      pendingFraction: fill(progressFromXp(progress.xp + progress.pendingXp, learningEffort)),
      xp: progress.xp, pendingXp: progress.pendingXp, xpToNextRank: 0,
    };
  }
  const from = xpForProgress(rank.fromProgress, learningEffort);
  const to   = xpForProgress(next.fromProgress, learningEffort);
  const span = to - from;
  return {
    rankName: rank.name,
    progress: p,
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

/**
 * Kapazität: so viel Erfahrung können alle Skills zusammen dauerhaft halten —
 * genau genug, um jeden entdeckten Skill auf Natur (90 %) zu bringen.
 */
export function calcCapacity(player: PlayerState): number {
  let capacity = 0;
  for (const id of player.discoveredSkills.keys()) capacity += naturXp(getLearningEffort(id));
  return capacity;
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
 * Zieht `amount` Erfahrung ab — verteilt auf alle Skills außer protectedId,
 * gewichtet mit Erfahrung × (Zeit seit letzter Übung + Mindestalter)
 * (progression.ts Abschnitt 3b). Wer sein Restguthaben ausschöpft, scheidet
 * aus; der Rest wird auf die übrigen neu verteilt. Gibt zurück, wie viel
 * nicht abgezogen werden konnte.
 */
function forgetLeastPracticed(
  player: PlayerState,
  amount: number,
  protectedId: string | null,
  events: ProgressionEvent[]
): number {
  const now = player.playtimeSeconds;
  const plan = new Map<Track, number>();
  const left = (t: Track) => t.progress.xp - (plan.get(t) ?? 0);
  const weight = (t: Track) =>
    left(t) * (Math.max(0, now - t.progress.lastPracticedAt) + FORGET_AGE_FLOOR_SECONDS);

  let pool = allTracks(player).filter((t) => t.usesCapacity && t.id !== protectedId && t.progress.xp > 0);
  let remaining = amount;
  while (remaining > 1e-6 && pool.length > 0) {
    const total = pool.reduce((sum, t) => sum + weight(t), 0);
    if (total <= 0) break;
    const shares = pool.map((t) => remaining * weight(t) / total);
    const next: Track[] = [];
    pool.forEach((t, i) => {
      const take = Math.min(shares[i], left(t));
      plan.set(t, (plan.get(t) ?? 0) + take);
      remaining -= take;
      if (left(t) > 1e-9) next.push(t);
    });
    if (next.length === pool.length) break; // alles verteilt
    pool = next;
  }

  for (const [track, take] of plan) forgetFrom(track, take, events);
  return remaining > 1e-6 ? remaining : 0;
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
// Zuletzt geändert: 2026-11-01 — Fortschritt 0–100 % statt Übungsgrad,
// Vergleichsstufe, Kapazität = entdeckte Skills bis 90 %
// Davor: 2026-11-01 — Kapazität sättigt, Verlernen verteilt
// Davor: 2026-10-30 — Erstfassung
// ------------------------------------------------------------
