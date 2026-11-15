// ============================================================
// BLOB SYSTEM
// Absorb & Evolve — Formwechsel der Blobs (GDD-10 Abschnitte 2–4, 9)
//
// Niederlassen, Abspalten, Erheben, Verschmelzen, Vertrocknen und
// Bewusstsein wechseln — als reine Operationen auf dem GameState.
// Gespielt wird immer mit der Arbeitskopie `state.player` des Blobs, bei
// dem das Bewusstsein ist; alle anderen liegen als StoredBlob in
// `state.blobs` (GDD-10 Abschnitt 13.2). Ob ein Knopf überhaupt angeboten
// wird (Aggro-Sperre, Berührung), prüft die Szene mit den can…-Funktionen.
//
// Reihenfolge bei jedem Formwechsel (GDD-10 Abschnitt 4.6): Arbeitskopie
// zurückschreiben → den anderen Blob nachrechnen → Wissen zusammenführen
// → Kapazität prüfen → Arbeitskopie neu anlegen.
//
// Stellschrauben: src/data/blobs.ts, Höchstmasse: src/data/grow.ts.
// Keine Phaser-Abhängigkeit.
// ============================================================

import type { GameState, PlayerState, WorldState } from "../types/GameState";
import type { BlobMeta, StoredBlob } from "../types/Blob";
import { serializeBody, deserializeBody } from "./BodySerializer";
import { mergeKnowledge, transferConsciousness } from "./KnowledgeSystem";
import { catchUpSettled, snapshotSources, calcWorkRange, type ActivityResult } from "./SettlementSystem";
import { knowsMoveSkill } from "./BodySystem";
import { isFullyGrown, calcGrowthFromMass } from "./GrowSystem";
import { calcMaxHp, calcMaxMp, updatePlayerGrowth } from "./SkillSystem";
import { calcPlayerReach, calcPlayerWorldRadius } from "./StatsSystem";
import { clearVenom } from "./VenomSystem";
import { getBiomeAt } from "../world/BiomeDefinitions";
import { CHUNK_PX } from "../world/Chunk";
import { GROW_FOOD_MATERIAL_ID, MAX_BODY_MASS } from "../data/grow";
import {
  SPLIT_SHARE_DEFAULT, SPLIT_OFFSET_PX, DRIED_RADIUS_FACTOR,
  TRAVELER_NAME, BIOME_NAMES,
} from "../data/blobs";
import { PLAYER_WORLD_RADIUS_MIN, PLAYER_WORLD_RADIUS_MAX, PLAYER_SIZE_GROWTH_MAX } from "../data/balance";

export interface BlobOpResult {
  ok: boolean;
  reason?: string;
}

// -----------------------------------------------------------
// HILFEN
// -----------------------------------------------------------

/** Neue Blob-ID — IDs werden nie wiederverwendet. */
function allocateId(state: GameState): string {
  return `b${state.nextBlobNumber++}`;
}

/** Name eines niedergelassenen oder vertrockneten Blobs: Biom und Nummer („Wald 2“). */
export function makeBlobName(state: GameState, x: number, y: number): string {
  const biome = BIOME_NAMES[getBiomeAt(Math.floor(x / CHUNK_PX), Math.floor(y / CHUNK_PX))] ?? "Blob";
  const taken = new Set([state.conscious.name, ...state.blobs.map((b) => b.name)]);
  let n = 1;
  while (taken.has(`${biome} ${n}`)) n++;
  return `${biome} ${n}`;
}

/** Ausgewachsen? Das Nest gilt immer als ausgewachsen (GDD-10 7.1). */
export function isBlobGrown(meta: BlobMeta, bodyMass: number): boolean {
  return !!meta.nest || isFullyGrown(bodyMass);
}

/** Welt-Radius aus der Körpermasse (wie StatsSystem.calcPlayerWorldRadius). */
export function radiusFromMass(bodyMass: number): number {
  const t = Math.min(calcGrowthFromMass(bodyMass) / PLAYER_SIZE_GROWTH_MAX, 1);
  return PLAYER_WORLD_RADIUS_MIN + t * (PLAYER_WORLD_RADIUS_MAX - PLAYER_WORLD_RADIUS_MIN);
}

/** Radius des Kerns eines gespeicherten Blobs (vertrocknet: kleiner). */
export function storedCoreRadius(blob: StoredBlob): number {
  const r = radiusFromMass(blob.body.bodyMass);
  return blob.form === "dried" ? r * DRIED_RADIUS_FACTOR : r;
}

/** Blobs, die der Reisende berührt: Abstand ≤ Reichweite + Kernradius (GDD-10 Abschnitt 3). */
export function findTouchedBlob(state: GameState): StoredBlob | null {
  if (state.conscious.form !== "traveling") return null;
  const p = state.player;
  const reach = calcPlayerReach(p);
  let best: StoredBlob | null = null;
  let bestDist = Infinity;
  for (const b of state.blobs) {
    const d = Math.hypot(b.body.x - p.x, b.body.y - p.y);
    if (d <= reach + storedCoreRadius(b) && d < bestDist) { best = b; bestDist = d; }
  }
  return best;
}

/** Nächster niedergelassener Blob ohne Bewusstsein. */
export function nearestSettled(state: GameState, x: number, y: number): StoredBlob | null {
  let best: StoredBlob | null = null;
  let bestDist = Infinity;
  for (const b of state.blobs) {
    if (b.form !== "settled") continue;
    const d = Math.hypot(b.body.x - x, b.body.y - y);
    if (d < bestDist) { best = b; bestDist = d; }
  }
  return best;
}

/** Arbeitsreichweite des Blobs mit Bewusstsein. */
export function consciousWorkRange(state: GameState): number {
  return calcWorkRange(state.player.bodyMass, !!state.conscious.nest);
}

/** Meta ohne Körper (für state.conscious). */
function metaOf(blob: StoredBlob): BlobMeta {
  const { body: _body, ...meta } = blob;
  return meta;
}

/** Gespeicherten niedergelassenen Blob bis jetzt nachrechnen (GDD-10 8.1). */
function loadStored(blob: StoredBlob, nowPlay: number): { body: PlayerState; result: ActivityResult | null } {
  const body = deserializeBody(blob.body);
  let result: ActivityResult | null = null;
  if (blob.form === "settled") {
    blob.carry = blob.carry ?? {};
    result = catchUpSettled(body, {
      activity: blob.activity, sources: blob.sources ?? [], carry: blob.carry, isNest: !!blob.nest,
    }, blob.simulatedUntil ?? nowPlay, nowPlay);
    blob.simulatedUntil = nowPlay;
  }
  body.playtimeSeconds = nowPlay;
  updatePlayerGrowth(body);
  return { body, result };
}

/** Arbeitskopie eines niedergelassenen Blobs ablegen (Bewusstsein verlässt ihn). */
function storeConscious(state: GameState, world: WorldState): StoredBlob {
  const p = state.player;
  const meta = state.conscious;
  const stored: StoredBlob = {
    ...meta,
    simulatedUntil: p.playtimeSeconds,
    sources: snapshotSources(world, p.x, p.y, consciousWorkRange(state)),
    carry: meta.carry ?? {},
    body: serializeBody(p),
  };
  state.blobs.push(stored);
  return stored;
}

function clearCombatState(p: PlayerState): void {
  clearVenom(p);
  p.statusEffects = [];
  p.skillCooldowns = new Map();
}

// -----------------------------------------------------------
// NIEDERLASSEN (GDD-10 4.1)
// -----------------------------------------------------------

/** Erst mit Bewegen verfügbar (Vorgabe Entwickler); die Aggro-Sperre prüft die Szene. */
export function canSettle(state: GameState): BlobOpResult {
  if (state.conscious.form !== "traveling") return { ok: false, reason: "Nur der Reisende kann sich niederlassen." };
  if (!knowsMoveSkill(state.player)) return { ok: false, reason: "Erst mit Bewegen." };
  return { ok: true };
}

export function settle(state: GameState, world: WorldState): BlobOpResult {
  const check = canSettle(state);
  if (!check.ok) return check;
  const p = state.player;
  // Gift und Status-Effekte verfallen; passive Effekte baut die Szene neu auf (13.6)
  clearCombatState(p);
  state.conscious = {
    id: state.conscious.id,
    name: makeBlobName(state, p.x, p.y),
    form: "settled",
    activity: null,
    simulatedUntil: p.playtimeSeconds,
    sources: snapshotSources(world, p.x, p.y, calcWorkRange(p.bodyMass, false)),
    carry: {},
  };
  return { ok: true };
}

// -----------------------------------------------------------
// ABSPALTEN (GDD-10 4.3, 7.1)
// -----------------------------------------------------------

export function canSplit(state: GameState): BlobOpResult {
  if (state.conscious.form !== "settled") return { ok: false, reason: "Nur ein niedergelassener Blob kann abspalten." };
  if (!knowsMoveSkill(state.player)) return { ok: false, reason: "Erst mit Bewegen." };
  if (!isBlobGrown(state.conscious, state.player.bodyMass)) {
    return { ok: false, reason: "Erst ausgewachsen. Nicht ausgewachsen kannst du dich nur erheben." };
  }
  return { ok: true };
}

/** Was der Verteilen-Dialog anzeigt (GDD-10 7.2): Größe des neuen Reisenden und was zu verteilen ist. */
export interface SplitPreview {
  /** Körpermasse des neuen Reisenden (Fasern) */
  childMass: number;
  grown: boolean;
  maxHp: number;
  maxMp: number;
  /** Ressourcen nach Abzug der Fasern für den Körper */
  materials: { id: string; amount: number }[];
}

export function previewSplit(state: GameState): SplitPreview {
  const fibers = state.player.materials.get(GROW_FOOD_MATERIAL_ID) ?? 0;
  const childMass = Math.min(fibers, MAX_BODY_MASS);
  const growth = calcGrowthFromMass(childMass);
  const materials: { id: string; amount: number }[] = [];
  for (const [id, amount] of state.player.materials) {
    const left = id === GROW_FOOD_MATERIAL_ID ? amount - childMass : amount;
    if (left > 0) materials.push({ id, amount: left });
  }
  return { childMass, grown: isFullyGrown(childMass), maxHp: calcMaxHp(growth), maxMp: calcMaxMp(growth), materials };
}

/** Voreinstellung des Dialogs: halbe-halbe, ungerade Reste bleiben (GDD-10 7.2). */
export function defaultSplitTake(preview: SplitPreview): Record<string, number> {
  const take: Record<string, number> = {};
  for (const m of preview.materials) take[m.id] = Math.floor(m.amount * SPLIT_SHARE_DEFAULT);
  return take;
}

/**
 * Der neue Reisende bekommt eine Kopie des Wissens (ohne zurückgehaltene
 * Erfahrung), einen Körper aus den Pflanzenfasern im Lager (höchstens bis
 * ausgewachsen) und von den übrigen Ressourcen, was im Verteilen-Dialog
 * gewählt wurde (`take`: Menge je Material, ohne Angabe halbe-halbe).
 * Das Bewusstsein geht auf ihn über.
 */
export function split(state: GameState, world: WorldState, take?: Record<string, number>): BlobOpResult {
  const check = canSplit(state);
  if (!check.ok) return check;
  const parent = state.player;
  const chosen = take ?? defaultSplitTake(previewSplit(state));

  // Kosten: Fasern = Körpermasse des neuen Reisenden (Vorgabe Entwickler, 7.1)
  const fibers = parent.materials.get(GROW_FOOD_MATERIAL_ID) ?? 0;
  const childMass = Math.min(fibers, MAX_BODY_MASS);
  if (childMass > 0) parent.materials.set(GROW_FOOD_MATERIAL_ID, fibers - childMass);

  const child = deserializeBody(serializeBody(parent));
  child.bodyMass = childMass;
  child.growDigest = 0;
  // Zurückgehaltene Erfahrung bleibt beim Körper, der sie verdient hat (GDD-10 5)
  child.coreAbilities.absorb.pendingXp = 0;
  child.coreAbilities.analyze.pendingXp = 0;
  for (const inst of child.discoveredSkills.values()) inst.pendingXp = 0;

  // Übrige Ressourcen verteilen: die Summe bleibt gleich (GDD-10 7.2)
  child.materials = new Map();
  for (const [id, amount] of parent.materials) {
    const n = Math.max(0, Math.min(amount, Math.floor(chosen[id] ?? 0)));
    if (n > 0) {
      child.materials.set(id, n);
      parent.materials.set(id, amount - n);
    }
  }

  // Volle HP und MP für seine Größe
  const growth = calcGrowthFromMass(childMass);
  child.maxHp = calcMaxHp(growth);
  child.maxMp = calcMaxMp(growth);
  child.hp = child.maxHp;
  child.mp = child.maxMp;
  clearCombatState(child);

  // Neben dem niedergelassenen Blob, außerhalb seiner Berührung
  const offset = calcPlayerReach(child) + calcPlayerWorldRadius(parent) + SPLIT_OFFSET_PX;
  child.x = parent.x + offset;
  child.y = parent.y;

  storeConscious(state, world);
  state.player = child;
  state.conscious = { id: allocateId(state), name: TRAVELER_NAME, form: "traveling" };
  return { ok: true };
}

// -----------------------------------------------------------
// ERHEBEN (GDD-10 4.7)
// -----------------------------------------------------------

export function canRise(state: GameState): BlobOpResult {
  if (state.conscious.form !== "settled") return { ok: false, reason: "Nur ein niedergelassener Blob kann sich erheben." };
  if (state.conscious.nest) return { ok: false, reason: "Das Nest bleibt immer an seiner Stelle." };
  if (!knowsMoveSkill(state.player)) return { ok: false, reason: "Erst mit Bewegen." };
  return { ok: true };
}

/**
 * Derselbe Blob wird reisend und behält Wissen, Ressourcen und seine Größe.
 * Fasern im Lager werden nicht in Größe umgewandelt (Vorgabe Entwickler).
 * HP und MP sind so, wie sie beim Niederlassen waren, plus Regeneration —
 * die lief in der Arbeitskopie bzw. im Nachrechnen mit.
 */
export function rise(state: GameState): BlobOpResult {
  const check = canRise(state);
  if (!check.ok) return check;
  const id = state.conscious.id;
  state.conscious = { id, name: TRAVELER_NAME, form: "traveling" };
  state.markedBlobIds = state.markedBlobIds.filter((m) => m !== id);
  return { ok: true };
}

// -----------------------------------------------------------
// VERSCHMELZEN (GDD-10 4.5)
// -----------------------------------------------------------

export function canMerge(state: GameState, target: StoredBlob | null): BlobOpResult {
  if (state.conscious.form !== "traveling") return { ok: false, reason: "Nur der Reisende kann verschmelzen." };
  if (!target || (target.form !== "settled" && target.form !== "dried")) return { ok: false, reason: "Kein Blob in Berührung." };
  return { ok: true };
}

/**
 * Der Reisende geht in den anderen Blob hinein (niedergelassen oder
 * vertrocknet); heraus kommt immer ein niedergelassener Blob mit dem
 * Bewusstsein. Je Skill zählt der Höchstwert, alle Ressourcen gehen über,
 * die Körpermasse des Reisenden wird als Fasern gutgeschrieben.
 */
export function merge(state: GameState, targetId: string, world: WorldState): BlobOpResult & { result?: ActivityResult | null } {
  const target = state.blobs.find((b) => b.id === targetId) ?? null;
  const check = canMerge(state, target);
  if (!check.ok || !target) return check;
  const traveler = state.player;
  const nowPlay = traveler.playtimeSeconds;
  const { body, result } = loadStored(target, nowPlay);

  // HP und MP: Die Wunden kommen mit — der niedrigere Anteil gilt (4.5).
  // Ein vertrockneter Blob hat keine; er bekommt den Anteil des Reisenden.
  const travHp = traveler.hp / Math.max(1, traveler.maxHp);
  const travMp = traveler.mp / Math.max(1, traveler.maxMp);
  const ownHp = target.form === "dried" ? 1 : body.hp / Math.max(1, body.maxHp);
  const ownMp = target.form === "dried" ? 1 : body.mp / Math.max(1, body.maxMp);

  mergeKnowledge(body, traveler);
  for (const [id, amount] of traveler.materials) body.materials.set(id, (body.materials.get(id) ?? 0) + amount);
  if (traveler.bodyMass > 0) {
    body.materials.set(GROW_FOOD_MATERIAL_ID, (body.materials.get(GROW_FOOD_MATERIAL_ID) ?? 0) + traveler.bodyMass);
  }
  updatePlayerGrowth(body);
  body.hp = Math.round(Math.min(ownHp, travHp) * body.maxHp);
  body.mp = Math.round(Math.min(ownMp, travMp) * body.maxMp);
  clearCombatState(body);
  transferConsciousness(traveler, body, Date.now());

  let meta = metaOf(target);
  if (target.form === "dried") {
    meta = {
      id: target.id,
      name: target.name,
      form: "settled",
      activity: null,
      simulatedUntil: nowPlay,
      sources: snapshotSources(world, body.x, body.y, calcWorkRange(body.bodyMass, false)),
      carry: {},
    };
  }
  state.blobs = state.blobs.filter((b) => b.id !== target.id);
  state.markedBlobIds = state.markedBlobIds.filter((m) => m !== target.id);
  state.player = body;
  state.conscious = meta;
  return { ok: true, result };
}

// -----------------------------------------------------------
// VERTROCKNEN (GDD-10 9)
// -----------------------------------------------------------

/**
 * HP ≤ 0: Der Reisende wird zum vertrockneten Blob und automatisch markiert.
 * Danach ist das Bewusstsein bei keinem Blob, bis auf dem Sterbescreen ein
 * niedergelassener Blob gewählt ist (switchTo mit storeCurrent = false).
 */
export function dryOut(state: GameState): StoredBlob {
  const p = state.player;
  clearCombatState(p);
  p.hp = 0;
  const dried: StoredBlob = {
    id: state.conscious.id,
    name: makeBlobName(state, p.x, p.y),
    form: "dried",
    driedAt: p.playtimeSeconds,
    body: serializeBody(p),
  };
  state.blobs.push(dried);
  if (!state.markedBlobIds.includes(dried.id)) state.markedBlobIds.push(dried.id);
  return dried;
}

/** Was der vertrocknete Blob dem Blob `against` voraushat (Sterbescreen, 9.1). */
export function summarizeAhead(dried: StoredBlob, against: StoredBlob | null): { newSkills: number; higherSkills: number; materials: [string, number][] } {
  const own = new Map(dried.body.discoveredSkills);
  const other = new Map(against?.body.discoveredSkills ?? []);
  let newSkills = 0, higherSkills = 0;
  for (const [id, inst] of own) {
    const o = other.get(id);
    if (!o) newSkills++;
    else if (inst.xp + inst.pendingXp > o.xp + o.pendingXp + 1e-6) higherSkills++;
  }
  const materials: [string, number][] = dried.body.materials.filter(([, n]) => n > 0);
  if (dried.body.bodyMass > 0) {
    const i = materials.findIndex(([id]) => id === GROW_FOOD_MATERIAL_ID);
    if (i >= 0) materials[i] = [GROW_FOOD_MATERIAL_ID, materials[i][1] + dried.body.bodyMass];
    else materials.push([GROW_FOOD_MATERIAL_ID, dried.body.bodyMass]);
  }
  return { newSkills, higherSkills, materials };
}

// -----------------------------------------------------------
// BEWUSSTSEIN WECHSELN (GDD-10 4.2)
// -----------------------------------------------------------

export function canSwitch(state: GameState): BlobOpResult {
  if (state.conscious.form !== "settled") return { ok: false, reason: "Wechseln geht nur zwischen niedergelassenen Blobs." };
  if (!state.blobs.some((b) => b.form === "settled")) return { ok: false, reason: "Kein anderer niedergelassener Blob." };
  return { ok: true };
}

/**
 * Bewusstsein zum niedergelassenen Blob `targetId`. storeCurrent: die
 * bisherige Arbeitskopie ablegen (false nach dem Vertrocknen — der
 * vertrocknete Körper liegt schon in state.blobs).
 */
export function switchTo(
  state: GameState, targetId: string, world: WorldState, storeCurrent: boolean
): BlobOpResult & { result?: ActivityResult | null } {
  const target = state.blobs.find((b) => b.id === targetId && b.form === "settled");
  if (!target) return { ok: false, reason: "Ziel nicht gefunden." };
  if (storeCurrent && state.conscious.form !== "settled") return { ok: false, reason: "Wechseln geht nur zwischen niedergelassenen Blobs." };
  const from = state.player;
  if (storeCurrent) storeConscious(state, world);
  const { body, result } = loadStored(target, from.playtimeSeconds);
  clearCombatState(body);
  transferConsciousness(from, body, Date.now());
  state.blobs = state.blobs.filter((b) => b.id !== target.id);
  state.markedBlobIds = state.markedBlobIds.filter((m) => m !== target.id);
  state.player = body;
  state.conscious = metaOf(target);
  return { ok: true, result };
}

// Stand: 15. November 2026 — Verteilen nach Wahl im Dialog (Schritt 4); Erstfassung in Schritt 3
