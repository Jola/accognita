// ============================================================
// TUTORIAL SYSTEM — Anstöße des Spieleinstiegs (GDD-11)
//
// Ein Anstoß hat einen Anlass (die Lage passt), eine Tat, die ihn erledigt,
// und bis zu drei Stufen: Frage → konkreter Satz → Knopf pulsiert
// (Abschnitt 4.2, Vorgabe Entwickler: je etwa 45 s). Hat der Spieler etwas
// schon von selbst getan, kommt der Anstoß nie (4.3). Immer nur ein Anstoß
// zugleich: der erste in der Reihenfolge unten, dessen Anlass gerade passt.
//
// Rein, ohne Phaser: Die Szene stellt die Lage (TutorialContext) einmal pro
// Sekunde zusammen und meldet Taten mit markAct. Texte und Zahlen: data/tutorial.ts.
// ============================================================

import type { TutorialState } from "../types/GameState";
import {
  HINTS, HINT_STAGE_SECONDS, HINT_FEED_AFTER_SECONDS, HINT_SETTLE_FAR_METERS,
  HINT_SETTLE_PEACEFUL_MIN, HINT_SETTLE_HP_FRACTION, HINT_RISE_AFTER_SECONDS,
  HINT_DANGER_SHOW_SECONDS, HINT_SETTLE_PLACE_MIN_NEST_METERS, type HintTarget,
} from "../data/tutorial";

/** Die Lage, aus der die Anlässe folgen — von der Szene je Sekunde gemessen. */
export interface TutorialContext {
  form: "settled" | "traveling" | "dried";
  isNest: boolean;
  /** Sekunden seit dem letzten Körperwechsel (Abspalten, Niederlassen, …) */
  formSeconds: number;
  hpFraction: number;
  /** Kein Gegner hat in den letzten Sekunden angegriffen */
  calm: boolean;
  /** Entfernung zum Nest in Metern (null: man ist selbst das Nest) */
  nestMeters: number | null;
  biome: string;
  /** Friedliche Wesen in der Nähe */
  peacefulNear: number;
  canSettle: boolean;
  canRise: boolean;
  canSplit: boolean;
  /** Der Reisende berührt einen eigenen Blob und könnte verschmelzen */
  canMergeTouched: boolean;
  driedBlobs: number;
  /** Niedergelassene Blobs, den mit Bewusstsein eingeschlossen */
  settledBlobs: number;
}

export interface ActiveHint {
  /** Anstoß (z. B. „settle“) */
  id: string;
  /** Text-Variante in HINTS (z. B. „settle_hurt“) */
  textId: string;
  stage: 1 | 2 | 3;
  ask: string;
  /** Leer in Stufe 1 */
  concrete: string;
  /** Nur in Stufe 3 */
  pulse: HintTarget | null;
}

/** Laufzeit-Zustand, nicht gespeichert: wie lange jeder Anstoß schon zu sehen war. */
export interface HintRuntime {
  shown: Record<string, number>;
}

export function createHintRuntime(): HintRuntime {
  return { shown: {} };
}

export function hasAct(t: TutorialState, act: string): boolean {
  return t.done.includes(act);
}

/** Tat festhalten. true, wenn sie neu ist. */
export function markAct(t: TutorialState, act: string): boolean {
  if (t.done.includes(act)) return false;
  t.done.push(act);
  return true;
}

/** Ins Gedächtnis aufnehmen (GDD-11 7.3). true, wenn neu. */
export function remember(t: TutorialState, key: string, at: number): boolean {
  if (t.memory.some((m) => m.key === key)) return false;
  t.memory.push({ key, at });
  return true;
}

interface HintDef {
  id: string;
  /** Tat, die den Anstoß erledigt */
  doneAct: string;
  /** Passt der Anlass gerade? Dann die Text-Variante, sonst null */
  textFor(ctx: TutorialContext, t: TutorialState): string | null;
  /** Reiner Hinweis ohne Tat: nach so vielen Sekunden erledigt, alles sofort sichtbar */
  showFor?: number;
}

/**
 * Reihenfolge = Vorrang (Vorschlag Claude, offen): Was gerade geschieht
 * (Schaden, Berührung), vor dem, was warten kann.
 */
const HINT_DEFS: HintDef[] = [
  {
    // 5.4 Gefahr: erster Schaden als Reisender
    id: "danger", doneAct: "hint:danger", showFor: HINT_DANGER_SHOW_SECONDS,
    textFor: (ctx, t) => ctx.form === "traveling" && hasAct(t, "damaged") ? "danger" : null,
  },
  {
    // 5.8 Verschmelzen: der Reisende berührt einen eigenen Blob
    id: "merge", doneAct: "merge",
    textFor: (ctx) => ctx.form === "traveling" && ctx.canMergeTouched ? "merge" : null,
  },
  {
    // 5.7 Zurückholen nach dem ersten Vertrocknen
    id: "retrieve", doneAct: "merge_dried",
    textFor: (ctx) => {
      if (ctx.driedBlobs === 0) return null;
      if (ctx.form === "traveling") return "retrieve_traveling";
      if (ctx.form === "settled" && ctx.canSplit) return "retrieve_settled";
      return null;
    },
  },
  {
    // 5.5 Niederlassen: einer von drei Anlässen (Vorgabe Entwickler: so übernommen)
    id: "settle", doneAct: "settle",
    textFor: (ctx) => {
      if (ctx.form !== "traveling" || !ctx.canSettle || !ctx.calm) return null;
      if (ctx.hpFraction < HINT_SETTLE_HP_FRACTION) return "settle_hurt";
      if ((ctx.biome === "forest" || ctx.biome === "swamp") && ctx.peacefulNear >= HINT_SETTLE_PEACEFUL_MIN
        && (ctx.nestMeters === null || ctx.nestMeters >= HINT_SETTLE_PLACE_MIN_NEST_METERS)) return "settle_place";
      if (ctx.nestMeters !== null && ctx.nestMeters >= HINT_SETTLE_FAR_METERS) return "settle_far";
      return null;
    },
  },
  {
    // 5.3 Fressen von Hand: unterwegs, aber noch nichts absorbiert oder analysiert
    id: "feed", doneAct: "feed",
    textFor: (ctx) => ctx.form === "traveling" && ctx.formSeconds >= HINT_FEED_AFTER_SECONDS ? "feed" : null,
  },
  {
    // 5.6 Erheben: eine Weile bei einem niedergelassenen Blob, der nicht das Nest ist
    id: "rise", doneAct: "rise",
    textFor: (ctx) => ctx.form === "settled" && !ctx.isNest && ctx.canRise
      && ctx.formSeconds >= HINT_RISE_AFTER_SECONDS ? "rise" : null,
  },
  {
    // 5.9 Karte und Bewusstsein: zum ersten Mal zwei niedergelassene Blobs
    id: "map", doneAct: "map",
    textFor: (ctx) => ctx.settledBlobs >= 2 ? "map" : null,
  },
];

/**
 * Einmal pro Sekunde: welcher Anstoß jetzt dran ist, und in welcher Stufe.
 * dt = vergangene Spielzeit in Sekunden (pausiert zählt nicht). Die Stufe
 * wächst nur, solange der Anstoß zu sehen ist.
 */
export function tickHints(t: TutorialState, rt: HintRuntime, ctx: TutorialContext, dt: number): ActiveHint | null {
  for (const def of HINT_DEFS) {
    if (hasAct(t, def.doneAct)) continue;
    const textId = def.textFor(ctx, t);
    if (!textId) continue;
    const shown = (rt.shown[def.id] ?? 0) + dt;
    rt.shown[def.id] = shown;
    if (def.showFor !== undefined && shown >= def.showFor) {
      markAct(t, def.doneAct);
      continue;
    }
    const text = HINTS[textId];
    const stage: 1 | 2 | 3 = def.showFor !== undefined ? 2
      : shown >= 2 * HINT_STAGE_SECONDS ? 3 : shown >= HINT_STAGE_SECONDS ? 2 : 1;
    return {
      id: def.id,
      textId,
      stage,
      ask: text.ask,
      concrete: stage >= 2 ? text.concrete : "",
      pulse: stage === 3 ? text.target ?? null : null,
    };
  }
  return null;
}

// Stand: 15. November 2026 — Erstfassung (GDD-11 Umsetzung)
