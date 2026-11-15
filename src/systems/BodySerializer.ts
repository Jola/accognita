// ============================================================
// BODY SERIALIZER
// Absorb & Evolve — Körper eines Blobs ↔ gespeicherte Form
//
// Derselbe Weg für den Spielstand (SaveSystem) und für Blobs ohne
// Bewusstsein, die im GameState als StoredBlob liegen (GDD-10 13.2).
// Maps werden als [key, value][] abgelegt, da JSON.stringify Maps ignoriert.
// Keine Phaser-Abhängigkeit.
// ============================================================

import type { PlayerState } from "../types/GameState";
import type { SerializedBody } from "../types/Blob";

/** Körper → gespeicherte Form (tiefe Kopie, teilt nichts mit dem Original). */
export function serializeBody(player: PlayerState, skillBarSlots?: (string | null)[]): SerializedBody {
  const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));
  return {
    x: player.x,
    y: player.y,
    hp: player.hp,
    maxHp: player.maxHp,
    mp: player.mp,
    maxMp: player.maxMp,
    lifetimeXp: player.lifetimeXp,
    bodyMass: player.bodyMass,
    spawnX: player.spawnX,
    spawnY: player.spawnY,
    coreAbilities: copy(player.coreAbilities),
    discoveredSkills: copy([...player.discoveredSkills.entries()]),
    materials: [...player.materials.entries()],
    activeSkillSlots: [...(skillBarSlots ?? player.activeSkillSlots)],
    totalAbsorbs: player.totalAbsorbs,
    totalAbsorbFailures: player.totalAbsorbFailures,
    totalAnalyzes: player.totalAnalyzes,
    totalAnalyzeFailures: player.totalAnalyzeFailures,
    playtimeSeconds: player.playtimeSeconds,
  };
}

/** Gespeicherte Form → Körper (tiefe Kopie). Cooldowns und Effekte starten leer. */
export function deserializeBody(stored: SerializedBody): PlayerState {
  const data: SerializedBody = JSON.parse(JSON.stringify(stored));
  return {
    x: data.x,
    y: data.y,
    hp: data.hp,
    maxHp: data.maxHp,
    mp: data.mp,
    maxMp: data.maxMp,
    lifetimeXp: data.lifetimeXp ?? 0,
    bodyMass: data.bodyMass ?? 0,
    spawnX: data.spawnX ?? 400,
    spawnY: data.spawnY ?? 300,
    coreAbilities: data.coreAbilities,
    discoveredSkills: new Map(
      data.discoveredSkills.map(([id, inst]) => [id, { ...inst, isEnabled: inst.isEnabled ?? true }])
    ),
    materials: new Map(data.materials),
    activeSkillSlots: data.activeSkillSlots ?? [null, null, null, null, null],
    // Cooldowns: nach Reload sinnlos — frisch starten
    skillCooldowns: new Map(),
    // StatusEffects: werden durch syncPassiveEffects() neu aufgebaut
    statusEffects: [],
    totalAbsorbs: data.totalAbsorbs ?? 0,
    totalAbsorbFailures: data.totalAbsorbFailures ?? 0,
    totalAnalyzes: data.totalAnalyzes ?? 0,
    totalAnalyzeFailures: data.totalAnalyzeFailures ?? 0,
    playtimeSeconds: data.playtimeSeconds ?? 0,
  };
}

// Stand: 15. November 2026 — aus SaveSystem herausgelöst (GDD-10 Umsetzungsschritt 2)
