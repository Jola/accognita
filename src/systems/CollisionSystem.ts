// ============================================================
// COLLISION SYSTEM — Bewegung mit Kollision (GDD-12)
// Absorb & Evolve
//
// Kein Phaser-Import. Die Welt wird über eine Abfrage-Funktion übergeben
// (blocked(x, y) → true, wenn das Wesen dort nicht stehen kann), damit die
// Logik ohne Gelände testbar bleibt.
// ============================================================

export type BlockedFn = (x: number, y: number) => boolean;

/** Drehwinkel, mit denen ein Wesen um ein Hindernis herumgleitet (Bogenmaß). */
const STEER_ANGLES = [0.6, -0.6, 1.2, -1.2];
/** Wesen (nicht der Blob) weichen auch quer aus, wenn sie frontal auf ein Hindernis treffen. */
const STEER_ANGLES_WIDE = [0.6, -0.6, 1.2, -1.2, 1.57, -1.57];

/**
 * Bewegt einen Punkt um (dx, dy) und weicht dabei Hindernissen aus:
 * 1. ganze Bewegung, 2. leicht gedreht (gleitet an runden Hindernissen
 * entlang), 3. nur entlang einer Achse (gleitet an Ufern entlang).
 * Steht das Wesen schon blockiert (z. B. alter Spielstand), darf es sich frei
 * bewegen, damit es nie festklemmt.
 *
 * Begründung (Vorschlag Claude, offen): Ohne Wegfindung würden Wesen an jedem
 * Stamm hängen bleiben; Gleiten genügt für einzelne Hindernisse, Sackgassen
 * bleiben Sackgassen — dort kann man Verfolgern entkommen.
 */
export function moveWithCollision(
  x: number, y: number, dx: number, dy: number, blocked: BlockedFn,
  /** Bei schon blockiertem Wesen: wohin es sich trotzdem bewegen darf (z. B. nicht ins Wasser). */
  escapeOk: BlockedFn = () => true,
  /** Auch quer ausweichen (Wesen auf der Jagd): so umrunden sie einen Stamm, statt davor stehen zu bleiben. */
  wide = false,
): { x: number; y: number; moved: boolean } {
  if (dx === 0 && dy === 0) return { x, y, moved: false };
  if (blocked(x, y)) {
    if (!escapeOk(x + dx, y + dy)) return { x, y, moved: false };
    return { x: x + dx, y: y + dy, moved: true };
  }
  if (!blocked(x + dx, y + dy)) return { x: x + dx, y: y + dy, moved: true };
  for (const a of wide ? STEER_ANGLES_WIDE : STEER_ANGLES) {
    const c = Math.cos(a), s = Math.sin(a);
    // Gedrehte Richtung, etwas kürzer (Gleiten kostet Tempo)
    const rx = (dx * c - dy * s) * 0.8, ry = (dx * s + dy * c) * 0.8;
    if (!blocked(x + rx, y + ry)) return { x: x + rx, y: y + ry, moved: true };
  }
  if (dx !== 0 && !blocked(x + dx, y)) return { x: x + dx, y, moved: true };
  if (dy !== 0 && !blocked(x, y + dy)) return { x, y: y + dy, moved: true };
  return { x, y, moved: false };
}

/**
 * Sprung entlang einer Strecke: endet am letzten freien Punkt vor dem ersten
 * Hindernis. Begründung: Vorgabe (Entwickler, 22. November 2026) — niemand
 * bewegt sich über Wasser, also auch nicht im Sprung.
 */
export function sweepTo(
  x0: number, y0: number, x1: number, y1: number, step: number, blocked: BlockedFn,
): { x: number; y: number } {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  if (dist === 0) return { x: x0, y: y0 };
  const n = Math.max(1, Math.ceil(dist / Math.max(1, step)));
  let lx = x0, ly = y0;
  for (let k = 1; k <= n; k++) {
    const t = k / n;
    const nx = x0 + (x1 - x0) * t, ny = y0 + (y1 - y0) * t;
    if (blocked(nx, ny)) break;
    lx = nx; ly = ny;
  }
  return { x: lx, y: ly };
}
