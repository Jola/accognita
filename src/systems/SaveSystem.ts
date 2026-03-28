// ============================================================
// SAVE SYSTEM
// Absorb & Evolve — Speichern/Laden via localStorage
//
// Speichert den PlayerState in bis zu NUM_SLOTS Slots.
// Die Welt (Entities) wird nicht gespeichert — sie wird beim
// Laden neu aus den Definitionen erstellt.
//
// Maps werden als [key, value][] serialisiert, da JSON.stringify
// Maps ignoriert.
// ============================================================

import type { PlayerState } from "../types/GameState";
import type { SkillInstance } from "../types/Skill";

export const NUM_SAVE_SLOTS = 3;
const SAVE_PREFIX    = "accognita_save_";
const SAVE_VERSION   = 1;

// -----------------------------------------------------------
// SAVE-METADATEN — Vorschau ohne komplettes Deserialize
// -----------------------------------------------------------
export interface SaveMeta {
  slot: number;
  version: number;
  savedAt: number;          // Date.now()
  playerLevel: number;
  hp: number;
  maxHp: number;
  skillCount: number;
  playtimeSeconds: number;
  skillBarSlots: (string | null)[];
}

// -----------------------------------------------------------
// SERIALISIERTES PLAYER-OBJEKT
// Maps als Arrays gespeichert, StatusEffects gekürzt
// -----------------------------------------------------------
interface SerializedPlayer {
  x: number; y: number;
  hp: number; maxHp: number;
  mp: number; maxMp: number;
  level: number; totalExp: number;
  spawnX: number; spawnY: number;
  coreAbilities: PlayerState["coreAbilities"];
  discoveredSkills: [string, SkillInstance][];
  materials: [string, number][];
  activeSkillSlots: (string | null)[];
  // StatusEffects: nur permanente (durationMs === -1) überleben den Reload nicht sinnvoll
  // — werden nach dem Laden durch syncPassiveEffects() neu aufgebaut
  totalAbsorbs: number;
  totalAbsorbFailures: number;
  totalAnalyzes: number;
  totalAnalyzeFailures: number;
  playtimeSeconds: number;
}

interface SaveData {
  meta: SaveMeta;
  player: SerializedPlayer;
}

// -----------------------------------------------------------
// SPIELER SERIALISIEREN
// -----------------------------------------------------------
function serializePlayer(player: PlayerState, skillBarSlots?: (string | null)[]): SerializedPlayer {
  return {
    x: player.x,
    y: player.y,
    hp: player.hp,
    maxHp: player.maxHp,
    mp: player.mp,
    maxMp: player.maxMp,
    level: player.level,
    totalExp: player.totalExp,
    spawnX: player.spawnX,
    spawnY: player.spawnY,
    coreAbilities: player.coreAbilities,
    discoveredSkills: [...player.discoveredSkills.entries()],
    materials: [...player.materials.entries()],
    activeSkillSlots: skillBarSlots ?? player.activeSkillSlots,
    totalAbsorbs: player.totalAbsorbs,
    totalAbsorbFailures: player.totalAbsorbFailures,
    totalAnalyzes: player.totalAnalyzes,
    totalAnalyzeFailures: player.totalAnalyzeFailures,
    playtimeSeconds: player.playtimeSeconds,
  };
}

// -----------------------------------------------------------
// SPIELER DESERIALISIEREN
// -----------------------------------------------------------
function deserializePlayer(data: SerializedPlayer): PlayerState {
  return {
    x: data.x,
    y: data.y,
    hp: data.hp,
    maxHp: data.maxHp,
    mp: data.mp,
    maxMp: data.maxMp,
    level: data.level,
    totalExp: data.totalExp,
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

// -----------------------------------------------------------
// SLOT-SCHLÜSSEL
// -----------------------------------------------------------
function slotKey(slot: number): string {
  return `${SAVE_PREFIX}${slot}`;
}

// -----------------------------------------------------------
// IN SLOT SPEICHERN
// Gibt die SaveMeta zurück (für sofortiges UI-Update).
// -----------------------------------------------------------
export function saveToSlot(
  slot: number,
  player: PlayerState,
  skillBarSlots?: (string | null)[]
): SaveMeta {
  if (slot < 0 || slot >= NUM_SAVE_SLOTS) throw new Error(`Ungültiger Slot: ${slot}`);

  const slots = skillBarSlots ?? player.activeSkillSlots;
  const meta: SaveMeta = {
    slot,
    version: SAVE_VERSION,
    savedAt: Date.now(),
    playerLevel: player.level,
    hp: player.hp,
    maxHp: player.maxHp,
    skillCount: player.discoveredSkills.size,
    playtimeSeconds: player.playtimeSeconds,
    skillBarSlots: slots,
  };

  const data: SaveData = {
    meta,
    player: serializePlayer(player, slots),
  };

  localStorage.setItem(slotKey(slot), JSON.stringify(data));
  return meta;
}

// -----------------------------------------------------------
// AUS SLOT LADEN
// Gibt null zurück wenn Slot leer oder inkompatibel.
// -----------------------------------------------------------
export function loadFromSlot(slot: number): {
  player: PlayerState;
  meta: SaveMeta;
} | null {
  if (slot < 0 || slot >= NUM_SAVE_SLOTS) return null;

  const raw = localStorage.getItem(slotKey(slot));
  if (!raw) return null;

  try {
    const data: SaveData = JSON.parse(raw);
    if (!data.meta || !data.player) return null;

    const player = deserializePlayer(data.player);
    return { player, meta: data.meta };
  } catch {
    return null;
  }
}

// -----------------------------------------------------------
// SLOT-METADATEN LESEN (ohne vollständiges Deserialisieren)
// -----------------------------------------------------------
export function getSlotMeta(slot: number): SaveMeta | null {
  if (slot < 0 || slot >= NUM_SAVE_SLOTS) return null;
  const raw = localStorage.getItem(slotKey(slot));
  if (!raw) return null;
  try {
    const data: SaveData = JSON.parse(raw);
    return data.meta ?? null;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------
// ALLE SLOT-METADATEN (Array mit null für leere Slots)
// -----------------------------------------------------------
export function getAllSlotMetas(): (SaveMeta | null)[] {
  return Array.from({ length: NUM_SAVE_SLOTS }, (_, i) => getSlotMeta(i));
}

// -----------------------------------------------------------
// SLOT LÖSCHEN
// -----------------------------------------------------------
export function deleteSlot(slot: number): void {
  localStorage.removeItem(slotKey(slot));
}

// -----------------------------------------------------------
// ALLE SAVES LÖSCHEN (für "Neues Spiel")
// -----------------------------------------------------------
export function deleteAllSaves(): void {
  for (let i = 0; i < NUM_SAVE_SLOTS; i++) {
    localStorage.removeItem(slotKey(i));
  }
}

// -----------------------------------------------------------
// SPIELZEIT-FORMATIERUNG für UI
// -----------------------------------------------------------
export function formatPlaytime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
