// ============================================================
// AI SYSTEM
// Absorb & Evolve — Entity-Verhalten, Aggro, Bewegung
//
// Zuständig für:
//   - Aggro-Erkennung (Player-Distanz vs. aggroRadius)
//   - Gewünschte Bewegungsvelocity berechnen (Chase / Flee / Idle)
//   - Angriffs-Trigger wenn in Reichweite + Cooldown abgelaufen
//
// Gibt AiFrame zurück — GameScene setzt die Phaser-Velocities.
// Keine Phaser-Abhängigkeit. Kein Rendering.
//
// PERFORMANCE-STRATEGIE:
//   - Squared distances (kein sqrt in der hot loop)
//   - Skip für Entities > MAX_AI_DIST px vom Spieler
//   - AI-Update nur alle AI_TICK_MS ms pro Entity (Throttle)
//     gespeichert in instance._aiLastCalcAt (privates Feld)
// ============================================================

import type { EntityDefinition, EntityInstance } from "../types/Entity";
import type { AiFrame } from "../types/Combat";
import { canFight } from "./EntityLevelingSystem";
import { ignoresBySize } from "./EntitySystem";
import {
  ZIGZAG_ANGLE_DEG, ZIGZAG_SWITCH_MS, BODY_LENGTH_PER_WORLD_SIZE,
  AGGRO_LOSS_FACTOR, CHASE_STOP_FACTOR, WANDER_RADIUS_PX, WANDER_SPEED_FACTOR,
  WANDER_PAUSE_MIN_MS as WANDER_PAUSE_MIN, WANDER_PAUSE_MAX_MS as WANDER_PAUSE_MAX,
} from "../data/balance";

// -----------------------------------------------------------
// Konstanten
// -----------------------------------------------------------

// Entities weiter weg als diese Distanz bekommen keine AI-Berechnung
const MAX_AI_DIST_SQ = 500 * 500;  // 500px, als Quadrat

// Mindest-Update-Intervall pro Entity (ms)
const AI_TICK_MS = 100;

// Balance-Werte der KI (Aggro-Verlust, Anhalten, Herumwandern) mit
// Begründung: src/data/balance.ts Abschnitt „KI der Wesen“.

// -----------------------------------------------------------
// Wander-Konstanten
// -----------------------------------------------------------
const WANDER_ARRIVE_SQ    = 10 * 10;         // Gilt als "angekommen" innerhalb 10px

// -----------------------------------------------------------
// Haupt-Funktion: AI für eine Entity berechnen
//
// Gibt AiFrame zurück mit gewünschter Velocity (vx, vy)
// und Flags für Angriff / Aggro-Änderung.
//
// Aufruf aus GameScene — einmal pro Entity pro Frame.
// Die Throttle-Logik darin sorgt dafür, dass teure Berechnungen
// nicht jeden Frame stattfinden.
// -----------------------------------------------------------
export function calcEntityAi(
  def: EntityDefinition,
  instance: EntityInstance,
  playerX: number,
  playerY: number,
  now: number,
  hasTarget = true,
  targetSize = 0   // Größe des Blobs auf der worldSize-Skala; 0 = Größen-Aggro aus
): AiFrame {
  // Entities ohne Kampfwerte (Pflanzen, Mineralien) bekommen keine AI
  if (!canFight(def) || def.behavior === "passive") {
    return idleFrame();
  }

  // Abgelenkt (Schwanz abwerfen): Das Wesen stürzt sich auf das abgeworfene
  // Stück, bleibt stehen und greift nicht an, bis die Ablenkung vorbei ist.
  if (now < ((instance as any)._distractedUntil ?? 0)) {
    const lostAggro = instance.isAggro;
    instance.isAggro = false;
    delete (instance as any)._harPhase;
    return { ...idleFrame(), lostAggro };
  }

  // Kein Ziel: Das Bewusstsein ist bei einem niedergelassenen Blob, der vorerst
  // nicht angegriffen werden kann (GDD-10 Abschnitt 2, 13.5) — nur wandern.
  if (!hasTarget) {
    const lostAggro = instance.isAggro;
    instance.isAggro = false;
    const w = instance.isAlive ? calcWander(def, instance, now) : idleFrame();
    return { ...w, wantToAttack: false, wantToRangedAttack: false, becameAggro: false, lostAggro };
  }

  // Distance check (squared — kein sqrt)
  const dxRaw = playerX - instance.x;
  const dyRaw = playerY - instance.y;
  const distSq = dxRaw * dxRaw + dyRaw * dyRaw;

  // Zu weit weg → keine AI-Berechnung
  if (distSq > MAX_AI_DIST_SQ) {
    if (instance.isAggro) {
      return { ...idleFrame(), lostAggro: true };
    }
    return idleFrame();
  }

  // Throttle — AI nur alle AI_TICK_MS berechnen
  const lastCalc = (instance as any)._aiLastCalcAt ?? 0;
  if (now - lastCalc < AI_TICK_MS) {
    // Werte aus dem letzten Frame wiederverwenden
    return {
      vx: (instance as any)._aiLastVx ?? 0,
      vy: (instance as any)._aiLastVy ?? 0,
      wantToAttack: false,
      wantToRangedAttack: false,
      becameAggro: false,
      lostAggro: false,
    };
  }
  (instance as any)._aiLastCalcAt = now;

  const dist = Math.sqrt(distSq); // sqrt nur 1× nach dem Throttle

  // --- Aggro-Check ---
  const aggroRadius = def.aggroRadius ?? (def.worldSize ?? 6) * 2.5;
  const aggroLossRadius = aggroRadius * AGGRO_LOSS_FACTOR;

  let becameAggro = false;
  let lostAggro   = false;

  if (!instance.isAggro) {
    // Größen-Aggro: viel größere oder viel kleinere Wesen greifen nicht von
    // sich aus an (balance.ts SIZE_IGNORE_RATIO). Wer schon aggro ist
    // (angegriffen, Absorb-Fehlschlag), bleibt es.
    if (dist <= aggroRadius && shouldAggro(def) && !ignoresBySize(def.worldSize ?? 5, targetSize)) {
      instance.isAggro = true;
      becameAggro = true;
    }
  } else {
    if (dist > aggroLossRadius) {
      instance.isAggro = false;
      lostAggro = true;
    }
  }

  // --- Bewegung ---
  let vx = 0;
  let vy = 0;

  // Zuschlagen und Abhauen (Waldmaus): eigene Bewegung und eigener Angriffs-Check
  if (!instance.isAggro) delete (instance as any)._harPhase;
  if (def.hitAndRun && instance.isAggro && instance.isAlive) {
    const f = calcHitAndRun(def, instance, dxRaw, dyRaw, dist, now);
    (instance as any)._aiLastVx = f.vx;
    (instance as any)._aiLastVy = f.vy;
    (instance as any)._wanderTargetX = undefined;
    (instance as any)._wanderTargetY = undefined;
    return { ...f, becameAggro, lostAggro };
  }

  if (instance.isAggro && instance.isAlive) {
    const speed = def.speed ?? 60;
    const stopDist = (def.attackRangePx ?? 60) * CHASE_STOP_FACTOR;

    if (distSq > stopDist * stopDist) {
      // Normierter Richtungsvektor × Speed
      vx = (dxRaw / dist) * speed;
      vy = (dyRaw / dist) * speed;
    }
    // Innerhalb des Stop-Radius: Entity bleibt stehen (greift aber an)

    // Wander-Zustand zurücksetzen, damit nach Aggro-Verlust eine Pause kommt
    (instance as any)._wanderTargetX = undefined;
    (instance as any)._wanderTargetY = undefined;
    if (lostAggro) {
      (instance as any)._wanderPauseUntil = now + 1500;
    }
  } else if (instance.isAlive) {
    // Kein Aggro → wandern
    const w = calcWander(def, instance, now);
    vx = w.vx;
    vy = w.vy;
  }

  // Gecachte Velocity für Throttle-Frames
  (instance as any)._aiLastVx = vx;
  (instance as any)._aiLastVy = vy;

  // --- Nahkampf-Angriffs-Check ---
  const attackRange = def.attackRangePx ?? 60;
  const inMeleeRange = dist <= attackRange;
  const cooldownDone = instance.attackCooldownRemaining <= 0;
  const wantToAttack = instance.isAggro && inMeleeRange && cooldownDone;

  // --- Fernkampf-Angriffs-Check ---
  const rangedRange = def.rangedAttackRangePx ?? 0;
  const rangedCooldownDone = (instance.rangedCooldownRemaining ?? 0) <= 0;
  const wantToRangedAttack = !!(
    instance.isAggro &&
    rangedRange > 0 &&
    rangedCooldownDone &&
    !inMeleeRange &&           // Nicht schießen wenn im Nahkampf
    dist <= rangedRange
  );

  return { vx, vy, wantToAttack, wantToRangedAttack, becameAggro, lostAggro };
}

// -----------------------------------------------------------
// TAKTIK „ZUSCHLAGEN UND ABHAUEN“ (Feld hitAndRun am Wesen)
//
// Vorgabe (Entwickler, 21. November 2026), Waldmaus: einmal angreifen, dann
// 1 s im Zickzack abhauen. Danach noch in Reichweite (2 Mauslängen) →
// wieder angreifen; sonst nicht mehr angreifen und weiter weglaufen.
// Phasen (private Felder wie _aiLastCalcAt):
//   attack — auf den Blob zu, angreifen sobald in Reichweite
//   flee   — fleeMs lang im Zickzack weg (ZIGZAG_ANGLE_DEG, balance.ts)
//   escape — geradeaus weg, kein Angriff mehr, bis die Aggro verloren geht
// -----------------------------------------------------------

/** Reichweite für einen neuen Angriff nach der Flucht (px, Mitte zu Mitte). */
export function hitAndRunReengagePx(def: EntityDefinition): number {
  return (def.hitAndRun?.reengageLengths ?? 0) * BODY_LENGTH_PER_WORLD_SIZE * (def.worldSize ?? 5);
}

function calcHitAndRun(
  def: EntityDefinition,
  instance: EntityInstance,
  dx: number,
  dy: number,
  dist: number,
  now: number
): AiFrame {
  const inst = instance as any;
  const har = def.hitAndRun!;
  const speed = def.speed ?? 60;
  let phase: "attack" | "flee" | "escape" = inst._harPhase ?? "attack";

  if (phase === "flee" && now >= (inst._harUntil ?? 0)) {
    phase = dist <= hitAndRunReengagePx(def) ? "attack" : "escape";
  }

  let vx = 0, vy = 0, wantToAttack = false;
  const ux = dist > 0 ? dx / dist : 1;   // Richtung zum Blob
  const uy = dist > 0 ? dy / dist : 0;

  if (phase === "attack") {
    const attackRange = def.attackRangePx ?? 60;
    const stopDist = attackRange * CHASE_STOP_FACTOR;
    if (dist > stopDist) { vx = ux * speed; vy = uy * speed; }
    if (dist <= attackRange && instance.attackCooldownRemaining <= 0) {
      // GameScene führt den Angriff in diesem Frame aus — danach sofort fliehen
      wantToAttack = true;
      phase = "flee";
      inst._harUntil = now + har.fleeMs;
      inst._harZigStart = now;
    }
  } else {
    // Weg vom Blob; auf der Flucht abwechselnd links und rechts abgewinkelt
    let angle = Math.atan2(-uy, -ux);
    if (phase === "flee") {
      const side = Math.floor((now - (inst._harZigStart ?? now)) / ZIGZAG_SWITCH_MS) % 2 === 0 ? 1 : -1;
      angle += side * ZIGZAG_ANGLE_DEG * Math.PI / 180;
    }
    vx = Math.cos(angle) * speed;
    vy = Math.sin(angle) * speed;
  }

  inst._harPhase = phase;
  return { vx, vy, wantToAttack, wantToRangedAttack: false, becameAggro: false, lostAggro: false };
}

/** Lenkt ein Wesen bis untilMs ab (Schwanz abwerfen): kein Angriff, keine Aggro. */
export function distractEntity(instance: EntityInstance, untilMs: number): void {
  (instance as any)._distractedUntil = untilMs;
}

// -----------------------------------------------------------
// Angriffs-Cooldown ticken (im Game Loop aufrufen)
// delta in ms
// -----------------------------------------------------------
export function tickAttackCooldown(
  instance: EntityInstance,
  deltaMs: number
): void {
  if (instance.attackCooldownRemaining > 0) {
    instance.attackCooldownRemaining = Math.max(
      0,
      instance.attackCooldownRemaining - deltaMs
    );
  }
}

// -----------------------------------------------------------
// Fernkampf-Cooldown ticken und setzen
// -----------------------------------------------------------
export function tickRangedCooldown(instance: EntityInstance, deltaMs: number): void {
  if ((instance.rangedCooldownRemaining ?? 0) > 0) {
    instance.rangedCooldownRemaining = Math.max(
      0,
      (instance.rangedCooldownRemaining ?? 0) - deltaMs
    );
  }
}

export function setRangedCooldown(instance: EntityInstance, def: EntityDefinition): void {
  instance.rangedCooldownRemaining = def.rangedAttackCooldownMs ?? 2000;
}

// -----------------------------------------------------------
// Cooldown nach einem Angriff setzen
// -----------------------------------------------------------
export function setAttackCooldown(
  instance: EntityInstance,
  def: EntityDefinition
): void {
  instance.attackCooldownRemaining = def.attackCooldownMs ?? 1500;
}

// -----------------------------------------------------------
// Aggro-Reset — z.B. nach Entity-Respawn
// -----------------------------------------------------------
export function resetAi(instance: EntityInstance): void {
  instance.isAggro = false;
  instance.attackCooldownRemaining = 0;
  instance.rangedCooldownRemaining = 0;
  delete (instance as any)._aiLastCalcAt;
  delete (instance as any)._aiLastVx;
  delete (instance as any)._aiLastVy;
  delete (instance as any)._wanderTargetX;
  delete (instance as any)._wanderTargetY;
  delete (instance as any)._wanderPauseUntil;
  delete (instance as any)._harPhase;
  delete (instance as any)._harUntil;
  delete (instance as any)._harZigStart;
  // _distractedUntil absichtlich NICHT löschen — die Ablenkung läuft nach dem Schwanz-Abwerfen weiter
  // _spawnX/_spawnY absichtlich NICHT löschen — bleibt der echte Spawnpunkt
}

// -----------------------------------------------------------
// Hilfsfunktionen
// -----------------------------------------------------------

function idleFrame(): AiFrame {
  return { vx: 0, vy: 0, wantToAttack: false, wantToRangedAttack: false, becameAggro: false, lostAggro: false };
}

// -----------------------------------------------------------
// Wander-Berechnung — gibt Velocity in Richtung Wanderziel zurück.
// Spawn-Position und Wanderzustand werden als private Felder
// auf der Instance gespeichert (gleiche Konvention wie _aiLastCalcAt).
// -----------------------------------------------------------
function calcWander(
  def: EntityDefinition,
  instance: EntityInstance,
  now: number
): AiFrame {
  const inst = instance as any;

  // Spawnpunkt einmalig beim ersten Aufruf merken
  if (inst._spawnX === undefined) {
    inst._spawnX = instance.x;
    inst._spawnY = instance.y;
  }

  // Pause nach Ankunft oder Aggro-Verlust
  if (now < (inst._wanderPauseUntil ?? 0)) {
    return idleFrame();
  }

  // Neues Ziel wählen wenn keins vorhanden
  if (inst._wanderTargetX === undefined) {
    const angle = Math.random() * Math.PI * 2;
    const r     = Math.random() * WANDER_RADIUS_PX;
    inst._wanderTargetX = inst._spawnX + Math.cos(angle) * r;
    inst._wanderTargetY = inst._spawnY + Math.sin(angle) * r;
  }

  const dtx  = inst._wanderTargetX - instance.x;
  const dty  = inst._wanderTargetY - instance.y;
  const dtSq = dtx * dtx + dty * dty;

  // Ziel erreicht → Pause einlegen, Ziel löschen
  if (dtSq < WANDER_ARRIVE_SQ) {
    inst._wanderTargetX   = undefined;
    inst._wanderTargetY   = undefined;
    inst._wanderPauseUntil = now + WANDER_PAUSE_MIN +
                             Math.random() * (WANDER_PAUSE_MAX - WANDER_PAUSE_MIN);
    return idleFrame();
  }

  const dt    = Math.sqrt(dtSq);
  const speed = (def.speed ?? 60) * WANDER_SPEED_FACTOR;
  return {
    vx: (dtx / dt) * speed,
    vy: (dty / dt) * speed,
    wantToAttack: false,
    wantToRangedAttack: false,
    becameAggro:  false,
    lostAggro:    false,
  };
}

// Greift die Entity überhaupt an?
// defensive: nur bei isAggro (wird durch Absorb-Fehlschlag gesetzt)
// aggressive / territorial: greift aktiv an
function shouldAggro(def: EntityDefinition): boolean {
  return def.behavior === "aggressive" || def.behavior === "territorial";
}
