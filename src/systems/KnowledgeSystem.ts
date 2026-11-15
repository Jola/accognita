// ============================================================
// KNOWLEDGE SYSTEM
// Absorb & Evolve — Wissen zweier Blobs zusammenführen (GDD-10 Abschnitt 6)
//
// Vorgabe (Entwickler, 14. November 2026): Beim Übertragen der Erfahrung
// zählt je Skill nur der höchste Erfahrungswert. Es wird nichts aufaddiert.
// Begründung (Entwickler): So lohnt es sich nicht, parallel den gleichen
// Skill zu leveln. Wenn zwei Personen gleichzeitig das Gleiche lernen,
// wissen sie zusammen am Ende auch nicht das Doppelte.
//
// Was hier passiert (GDD-10 Abschnitte 6.1–6.3, 13.6):
//   - je Skill und Kern-Fähigkeit: Erfahrung = der größere Wert;
//     zurückgehaltene Erfahrung = was dem größeren Gesamtwert
//     (Erfahrung + zurückgehalten) noch fehlt
//   - entdeckte Skills: Vereinigung; neue Skills sind eingeschaltet
//   - Höchststand: der größere; „entdeckt am“: der frühere;
//     „zuletzt geübt“: der spätere Zeitpunkt
//   - danach einmal die harte Grenze (Kapazität + 20 %, GDD-02 8.5);
//     der Überhang über der Kapazität schmilzt später wie eine Überdehnung ab
//
// Nicht hier: Ermüdung und Statistiken gehören zum Bewusstsein (GDD-10
// Abschnitt 5) — transferConsciousness() trägt sie von einem Körper auf
// den nächsten. Ressourcen und Körpermasse regelt BlobSystem.
//
// Keine Phaser-Abhängigkeit.
// ============================================================

import type { PlayerState } from "../types/GameState";
import type { SkillProgress, SkillInstance, ProgressionEvent } from "../types/Skill";
import { enforceCapacityLimit } from "./ProgressionSystem";

/** Höchstwert-Regel für einen Fortschritts-Strang. Schreibt in `into`. */
function mergeProgress(into: SkillProgress, other: SkillProgress): void {
  const totalInto = into.xp + into.pendingXp;
  const totalOther = other.xp + other.pendingXp;
  const xp = Math.max(into.xp, other.xp);
  into.xp = xp;
  into.pendingXp = Math.max(0, Math.max(totalInto, totalOther) - xp);
  into.peakXp = Math.max(into.peakXp, other.peakXp, xp);
  into.lastPracticedAt = Math.max(into.lastPracticedAt, other.lastPracticedAt);
  into.totalXpEarned = Math.max(into.totalXpEarned, other.totalXpEarned);
}

/**
 * Führt das Wissen von `source` in `target` zusammen (GDD-10 Abschnitt 6).
 * `target` wird verändert, `source` bleibt unberührt. Gibt die Rangwechsel
 * durch die Kapazitätsgrenze zurück.
 */
export function mergeKnowledge(target: PlayerState, source: PlayerState): ProgressionEvent[] {
  mergeProgress(target.coreAbilities.absorb, source.coreAbilities.absorb);
  mergeProgress(target.coreAbilities.analyze, source.coreAbilities.analyze);

  for (const [id, other] of source.discoveredSkills) {
    const own = target.discoveredSkills.get(id);
    if (own) {
      mergeProgress(own, other);
      own.discoveredAt = Math.min(own.discoveredAt, other.discoveredAt);
    } else {
      const copy: SkillInstance = { ...other, isEnabled: true };
      target.discoveredSkills.set(id, copy);
    }
  }
  return enforceCapacityLimit(target);
}

/** Felder eines Fortschritts, die zur Ermüdung gehören (GDD-02 Abschnitt 8.7). */
function copyFatigue(to: SkillProgress, from: SkillProgress | undefined, nowMs: number): void {
  to.fatigue = from?.fatigue ?? 0;
  to.fatigueUpdatedAt = from?.fatigueUpdatedAt ?? nowMs;
  to.lastTrainedRealMs = from?.lastTrainedRealMs ?? 0;
}

/**
 * Das Bewusstsein wechselt von Körper `from` zu Körper `to`: Ermüdung je
 * Skill, Spielzeit und Gesamt-Statistiken gehen mit (GDD-10 Abschnitt 5).
 * Skills, die `from` nicht kennt, haben danach keine Ermüdung.
 */
export function transferConsciousness(from: PlayerState, to: PlayerState, nowMs: number): void {
  copyFatigue(to.coreAbilities.absorb, from.coreAbilities.absorb, nowMs);
  copyFatigue(to.coreAbilities.analyze, from.coreAbilities.analyze, nowMs);
  for (const [id, inst] of to.discoveredSkills) {
    copyFatigue(inst, from.discoveredSkills.get(id), nowMs);
  }
  to.playtimeSeconds = from.playtimeSeconds;
  to.lifetimeXp = from.lifetimeXp;
  to.totalAbsorbs = from.totalAbsorbs;
  to.totalAbsorbFailures = from.totalAbsorbFailures;
  to.totalAnalyzes = from.totalAnalyzes;
  to.totalAnalyzeFailures = from.totalAnalyzeFailures;
}

// Stand: 15. November 2026 — Erstfassung (GDD-10 Umsetzungsschritt 1)
