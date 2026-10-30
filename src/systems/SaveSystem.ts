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
import { GAME_VERSION } from "../data/version";
import { calcMaxHp, calcMaxMp } from "./SkillSystem";

export const NUM_SAVE_SLOTS = 3;
const SAVE_PREFIX    = "accognita_save_";
const SAVE_VERSION   = 3;

// -----------------------------------------------------------
// SAVE-METADATEN — Vorschau ohne komplettes Deserialize
// -----------------------------------------------------------
export interface SaveMeta {
  slot: number;
  version: number;          // Format-Version des Spielstands
  gameVersion?: string;     // Spielversion beim Speichern (fehlt bei alten Spielständen)
  savedAt: number;          // Date.now()
  playerLevel?: number;     // [VERWORFEN] nur in Spielständen vor v3 (Charakter-Level)
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
  lifetimeXp: number;
  level?: number; totalExp?: number;   // [VERWORFEN] nur vor v3, Migration 2 → 3
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
    lifetimeXp: player.lifetimeXp,
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
    lifetimeXp: data.lifetimeXp ?? 0,
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
// MIGRATIONEN
// Schlüssel = Format-Version VON der migriert wird. Jede Migration
// hebt den Spielstand genau eine Version an. Beim Formatwechsel:
// SAVE_VERSION erhöhen und hier eine Migration ergänzen.
// -----------------------------------------------------------
const MIGRATIONS: Record<number, (data: SaveData) => void> = {
  // v1 → v2: HP/MP in Milli-Einheiten (1 HP = 1000 mHP).
  // Auch v1-Stände nach der Umstellung existieren (bereits milli), deshalb
  // anteilig umrechnen statt ×1000: Füllstand bleibt, Maximum aus dem Level.
  1: (data) => {
    const p = data.player;
    const rescale = (value: number, oldMax: number, newMax: number) =>
      Math.max(0, Math.min(newMax, Math.round((value / (oldMax || 1)) * newMax)));

    // Damals galt noch das Charakter-Level: Wachstum = Level − 1
    const maxHp = calcMaxHp((p.level ?? 1) - 1);
    const maxMp = calcMaxMp((p.level ?? 1) - 1);
    p.hp    = rescale(p.hp, p.maxHp, maxHp);
    p.mp    = rescale(p.mp, p.maxMp, maxMp);
    p.maxHp = maxHp;
    p.maxMp = maxMp;
    data.meta.hp    = p.hp;
    data.meta.maxHp = p.maxHp;
  },

  // v2 → v3: Erfahrung statt Level (src/data/progression.ts).
  // Jeder Skill behält die Erfahrung, die er je gesammelt hat (totalXpEarned),
  // als aktuelle Erfahrung und als Höchststand. Liegt die Summe über der neuen
  // Kapazität, verlernt settleAfterLoad() den Überhang beim Laden — zuerst
  // die am frühesten entdeckten Skills, weil die Übungszeit unbekannt ist.
  2: (data) => {
    const p = data.player as any;
    const now = data.meta.savedAt ?? Date.now();
    const playtime = p.playtimeSeconds ?? 0;
    const convert = (old: any) => {
      const xp = old?.totalXpEarned ?? 0;
      return {
        xp, peakXp: xp, pendingXp: 0, fatigue: 0,
        fatigueUpdatedAt: now, lastTrainedRealMs: 0,
        lastPracticedAt: playtime, totalXpEarned: xp,
      };
    };
    p.coreAbilities = {
      absorb: convert(p.coreAbilities?.absorb),
      analyze: convert(p.coreAbilities?.analyze),
    };
    p.discoveredSkills = (p.discoveredSkills ?? []).map(([id, inst]: [string, any]) => [id, {
      ...convert(inst),
      definitionId: inst.definitionId ?? id,
      discoveredAt: inst.discoveredAt ?? 0,
      isEnabled: inst.isEnabled ?? true,
    }]);
    p.lifetimeXp = p.totalExp ?? 0;
    delete p.level;
    delete p.totalExp;
    delete data.meta.playerLevel;
  },
};

/** Bringt einen Spielstand auf SAVE_VERSION. null wenn keine Migration existiert. */
function migrate(data: SaveData): SaveData | null {
  let version = data.meta.version ?? 1;
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) return null;
    step(data);
    version++;
    data.meta.version = version;
  }
  return data;
}

// -----------------------------------------------------------
// SLOT-SCHLÜSSEL
// -----------------------------------------------------------
function slotKey(slot: number): string {
  return `${SAVE_PREFIX}${slot}`;
}

/** Slot lesen, parsen und migrieren. null bei leerem, kaputtem oder nicht migrierbarem Slot. */
function readSlot(slot: number): SaveData | null {
  if (slot < 0 || slot >= NUM_SAVE_SLOTS) return null;
  const raw = localStorage.getItem(slotKey(slot));
  if (!raw) return null;
  try {
    const data: SaveData = JSON.parse(raw);
    if (!data.meta || !data.player) return null;
    return migrate(data);
  } catch {
    return null;
  }
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
    gameVersion: GAME_VERSION,
    savedAt: Date.now(),
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
  const data = readSlot(slot);
  if (!data) return null;
  return { player: deserializePlayer(data.player), meta: data.meta };
}

// -----------------------------------------------------------
// SLOT-METADATEN LESEN (ohne vollständiges Deserialisieren)
// -----------------------------------------------------------
export function getSlotMeta(slot: number): SaveMeta | null {
  return readSlot(slot)?.meta ?? null;
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
