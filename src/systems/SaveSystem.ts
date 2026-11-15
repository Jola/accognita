// ============================================================
// SAVE SYSTEM
// Absorb & Evolve — Speichern/Laden via localStorage
//
// Speichert den Blob mit Bewusstsein (PlayerState) und alle anderen
// Blobs (GDD-10 Abschnitt 13) in bis zu NUM_SLOTS Slots.
// Die Welt (Entities) wird nicht gespeichert — sie wird beim
// Laden neu aus den Definitionen erstellt.
//
// Maps werden als [key, value][] serialisiert, da JSON.stringify
// Maps ignoriert.
// ============================================================

import { naturXp, getLearningEffort } from "./ProgressionSystem";
import { createSkillProgress } from "../types/Skill";
import { bodyMassFromLifetimeXp } from "./GrowSystem";
import type { GameState, PlayerState } from "../types/GameState";
import type { BlobMeta, StoredBlob, SerializedBody } from "../types/Blob";
import { serializeBody, deserializeBody } from "./BodySerializer";
import { knowsMoveSkill } from "./BodySystem";
import { GROW_FOOD_MATERIAL_ID, MAX_BODY_MASS } from "../data/grow";
import { NEST_NAME } from "../data/blobs";
import { GAME_VERSION } from "../data/version";
import { calcMaxHp, calcMaxMp } from "./SkillSystem";

export const NUM_SAVE_SLOTS = 3;
const SAVE_PREFIX    = "accognita_save_";
const SAVE_VERSION   = 7;

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
  blobName?: string;        // Name des Blobs mit Bewusstsein (ab v6)
}

// Gespeicherte Form eines Körpers: types/Blob.ts (SerializedBody),
// Umwandlung in BodySerializer.ts.
type SerializedPlayer = SerializedBody;

interface SaveData {
  meta: SaveMeta;
  /** Körper des Blobs mit Bewusstsein */
  player: SerializedPlayer;
  /** ab v6: was den Blob mit Bewusstsein sonst ausmacht */
  conscious?: BlobMeta;
  /** ab v6: alle anderen Blobs */
  blobs?: StoredBlob[];
  nextBlobNumber?: number;
  markedBlobIds?: string[];
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
  // v3 → v4: Wachstum kommt aus der Körpermasse (Grow) statt aus der
  // Lebenserfahrung. Körpermasse so, dass das Wachstum gleich bleibt —
  // niemand schrumpft durch die Umstellung (data/grow.ts Abschnitt 4).
  3: (data) => {
    data.player.bodyMass = bodyMassFromLifetimeXp(data.player.lifetimeXp ?? 0);
  },
  // v4 → v5: Bewegung und Sehen sind Skills (GDD-09). Alte Spielstände
  // konnten sich schon bewegen und farbig sehen — sie bekommen Kriechen,
  // Krabbeln, Lichtsinn, Facettenauge und Hauptaugen auf Natur, damit
  // niemand plötzlich langsamer wird oder schlechter sieht.
  4: (data) => {
    const now = Date.now();
    const playtime = data.player.playtimeSeconds ?? 0;
    const known = new Set(data.player.discoveredSkills.map(([id]) => id));
    for (const id of LEGACY_BODY_SKILLS) {
      if (known.has(id)) continue;
      const xp = naturXp(getLearningEffort(id));
      data.player.discoveredSkills.push([id, {
        ...createSkillProgress(now, playtime),
        xp, peakXp: xp, totalXpEarned: xp,
        definitionId: id, discoveredAt: now, isEnabled: true,
      }]);
    }
  },
};

// v5 → v6: Blob-Formen (GDD-10 Umsetzungsschritt 2). Der bisherige Spieler
// wird der einzige Blob: ein Reisender mit Bewusstsein. Das Nest kommt mit
// Schritt 3 dazu (eigene Migration).
MIGRATIONS[5] = (data) => {
  data.conscious = { id: "b1", name: "Reisender", form: "traveling" };
  data.blobs = [];
  data.nextBlobNumber = 2;
  data.markedBlobIds = [];
  data.meta.blobName = data.conscious.name;
};

// v6 → v7: Start im Nest (GDD-10 Umsetzungsschritt 3, Abschnitt 13.4/13.6).
// Neben dem Reisenden entsteht das Nest am Startpunkt (400, 300): Wissen wie
// der Reisende (ohne zurückgehaltene Erfahrung), keine Materialien, Körper-
// masse 0 (das Nest gilt als ausgewachsen). Kennt der Spielstand noch keinen
// Bewegungs-Skill, wird der bisherige Spieler selbst zum Nest. Körpermasse
// über der Höchstmasse kommt als Fasern ins Lager.
MIGRATIONS[6] = (data) => {
  const traveler = deserializeBody(data.player);
  const playtime = traveler.playtimeSeconds;
  if (traveler.bodyMass > MAX_BODY_MASS) {
    const extra = traveler.bodyMass - MAX_BODY_MASS;
    data.player.bodyMass = MAX_BODY_MASS;
    const fibers = data.player.materials.find(([id]) => id === GROW_FOOD_MATERIAL_ID);
    if (fibers) fibers[1] += extra; else data.player.materials.push([GROW_FOOD_MATERIAL_ID, extra]);
  }
  const nestBody = serializeBody(traveler);
  nestBody.x = 400; nestBody.y = 300;
  nestBody.materials = [];
  nestBody.bodyMass = 0;
  nestBody.maxHp = calcMaxHp(0); nestBody.hp = nestBody.maxHp;
  nestBody.maxMp = calcMaxMp(0); nestBody.mp = nestBody.maxMp;
  nestBody.coreAbilities.absorb.pendingXp = 0;
  nestBody.coreAbilities.analyze.pendingXp = 0;
  for (const [, inst] of nestBody.discoveredSkills) inst.pendingXp = 0;
  const nestMeta: BlobMeta = {
    id: `b${data.nextBlobNumber ?? 2}`, name: NEST_NAME, form: "settled", nest: true,
    activity: null, simulatedUntil: playtime, sources: [], carry: {},
  };
  data.nextBlobNumber = (data.nextBlobNumber ?? 2) + 1;
  if (!knowsMoveSkill(traveler)) {
    // Noch unbeweglich: der Spieler wird selbst zum Nest
    data.player.x = 400; data.player.y = 300;
    data.conscious = nestMeta;
  } else {
    data.blobs = [...(data.blobs ?? []), { ...nestMeta, body: nestBody }];
    // Der Reisende erscheint nicht im Nest
    if (Math.hypot(data.player.x - 400, data.player.y - 300) < 80) data.player.x = 480;
  }
  data.meta.blobName = data.conscious?.name;
};

/** Skills, die alte Spielstände bei der Umstellung auf GDD-09 geschenkt bekommen. */
const LEGACY_BODY_SKILLS = ["crawl", "scuttle", "light_sense", "compound_eye", "principal_eyes"];

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
  state: GameState,
  skillBarSlots?: (string | null)[]
): SaveMeta {
  if (slot < 0 || slot >= NUM_SAVE_SLOTS) throw new Error(`Ungültiger Slot: ${slot}`);

  const player = state.player;
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
    blobName: state.conscious.name,
  };

  const data: SaveData = {
    meta,
    player: serializeBody(player, slots),
    conscious: state.conscious,
    blobs: state.blobs,
    nextBlobNumber: state.nextBlobNumber,
    markedBlobIds: state.markedBlobIds,
  };

  localStorage.setItem(slotKey(slot), JSON.stringify(data));
  return meta;
}

// -----------------------------------------------------------
// AUS SLOT LADEN
// Gibt null zurück wenn Slot leer oder inkompatibel.
// -----------------------------------------------------------
export interface LoadedGame {
  player: PlayerState;
  conscious: BlobMeta;
  blobs: StoredBlob[];
  nextBlobNumber: number;
  markedBlobIds: string[];
  meta: SaveMeta;
}

export function loadFromSlot(slot: number): LoadedGame | null {
  const data = readSlot(slot);
  if (!data || !data.conscious) return null;
  return {
    player: deserializeBody(data.player),
    conscious: data.conscious,
    blobs: data.blobs ?? [],
    nextBlobNumber: data.nextBlobNumber ?? 2,
    markedBlobIds: data.markedBlobIds ?? [],
    meta: data.meta,
  };
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
