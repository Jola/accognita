// ============================================================
// STATS SYSTEM
// Absorb & Evolve — Effektive Werte: je Skill und Charakterwerte
//
// Vorgabe (Entwickler, 1. November 2026): An allen Skills die effektiven
// Werte anzeigen (z. B. Block von Chitin, Schadensverstärkung von
// Superstrength) und eine Ansicht mit allen Charakterwerten (HP, MP,
// Stärke, Geschick, Geschwindigkeit …).
// Vorgabe (Entwickler): Anzeige und tatsächliche Werte dürfen nie
// auseinanderlaufen. → Hier wird nichts neu gerechnet: Jeder Wert kommt
// aus derselben Funktion, die auch das Spiel aufruft.
//
// Vorgabe (Entwickler, GDD-02 8.1): Charakter-Attribute kommen nur aus den
// Skills — Stärke = Summe der Stärke-Effekte (Superstrength),
// Geschick = Summe der Geschick-Effekte (Jump).
// [VERWORFEN, 13. November 2026] Stärke = Schadensfaktor der Passiv-Skills.
//
// Keine Phaser-Abhängigkeit. Kein Rendering.
// ============================================================

import type { PlayerState } from "../types/GameState";
import type { SkillEffect } from "../types/Skill";
import type { DamageType } from "../types/Combat";
import { ALL_SKILLS } from "../data/skills";
import {
  MILLI,
  PLAYER_WORLD_RADIUS_MIN,
  PLAYER_WORLD_RADIUS_MAX,
  PLAYER_SIZE_GROWTH_MAX,
  PLAYER_SPEED_PER_WORLD_RADIUS,
  PLAYER_REACH_FACTOR,
} from "../data/balance";
import {
  evalSkillValue,
  resolveDefenderEffects,
  resolveDexterity,
  resolveStrength,
  getPlayerPassiveSkillProgress,
  getPlayerAllSkillProgress,
} from "./SkillEffectSystem";
import { venomBiteChance, venomDoseMilli } from "./VenomSystem";
import { getSkillProgress } from "./ProgressionSystem";
import { getPlayerGrowth, isGrowActive } from "./GrowSystem";
import { bestOfEffect, getMoveSpeedFactor, getActiveMoveSkill, getPlayerStrength, getSizeStrengthMult, getPlayerVision, type Vision } from "./BodySystem";
import { calcJumpDistance, calcRegenHp } from "./SkillEffects";
import { DAMAGE_TYPE_DE } from "./DamageSystem";

// -----------------------------------------------------------
// KÖRPER: Größe, Tempo, Reichweite (vorher privat in GameScene)
// -----------------------------------------------------------

/** Radius des Blobs in Weltpixeln — wächst linear mit dem Wachstum bis PLAYER_SIZE_GROWTH_MAX. */
export function calcPlayerWorldRadius(player: PlayerState): number {
  const t = Math.min(getPlayerGrowth(player) / PLAYER_SIZE_GROWTH_MAX, 1.0);
  return PLAYER_WORLD_RADIUS_MIN + t * (PLAYER_WORLD_RADIUS_MAX - PLAYER_WORLD_RADIUS_MIN);
}

/** Bewegungstempo in Weltpixeln pro Sekunde — skaliert mit der Größe (Bildschirm-Tempo bleibt gleich) und dem Bewegungs-Skill. */
// Tempo-Faktor aus dem besten Bewegungs-Skill (BodySystem, data/body.ts
// Abschnitt 1) — ohne Bewegungs-Skill 0: Der Blob kann sich nicht bewegen.
export function calcPlayerSpeed(player: PlayerState): number {
  return calcPlayerWorldRadius(player) * PLAYER_SPEED_PER_WORLD_RADIUS * getMoveSpeedFactor(player);
}

/**
 * Reichweite für Nahkampf, Absorb und Analyze in Weltpixeln, gemessen vom
 * Mittelpunkt des Blobs bis zum RAND des Gegners (findNearestEntity).
 */
export function calcPlayerReach(player: PlayerState): number {
  return calcPlayerWorldRadius(player) * PLAYER_REACH_FACTOR;
}

// -----------------------------------------------------------
// WERT EINES EFFEKTS — dieselbe Funktion, die der Kampf aufruft
// -----------------------------------------------------------

/**
 * Wert eines Effekts beim Fortschritt p: Block/Rückschlag in HP,
 * Reduktion und Chancen 0–1, Faktoren direkt, Geschick in Punkten.
 * Genutzt von INDEX (Tabellen, Graphen), Skill-Ansicht und Werte-Tab.
 */
export function getEffectValue(skillId: string, e: SkillEffect, progress: number): number {
  const cond = e.condition?.damageType;
  const type = Array.isArray(cond) ? cond[0] : cond;
  const defender = () => resolveDefenderEffects({ [skillId]: progress }, type);
  switch (e.effectType) {
    case "flat_block":     return defender().flatBlock / MILLI;
    case "percent_reduce": return defender().percentReduce;
    case "weakness":       return defender().weaknessMult;
    case "reflect_damage": return defender().reflectDamage / MILLI;
    case "damage_mult":    return evalSkillValue(e.formula, progress); // derzeit von keinem Skill genutzt
    case "dexterity":      return resolveDexterity({ [skillId]: progress });
    case "strength":       return resolveStrength({ [skillId]: progress });
    case "move_speed":
    case "sight_range":
    case "color_vision":
    case "red_vision":     return bestOfEffect({ [skillId]: progress }, e.effectType).value;
    case "inject_venom":   return venomBiteChance(e, progress);
    case "jump_distance":  return calcJumpDistance(progress, skillId);
    case "regen_hp":       return calcRegenHp(skillId, progress) / MILLI;
    default:               return evalSkillValue(e.formula, progress); // ohne eigene Kampffunktion
  }
}

// -----------------------------------------------------------
// EFFEKTIVE WERTE EINES SKILLS (Skill-Ansicht, Skill-Menü)
// -----------------------------------------------------------

const num = (n: number, digits = 1) => n.toLocaleString("de-DE", { maximumFractionDigits: digits });
const pct = (x: number) => `${num(x * 100, 0)} %`;
const typeDe = (e: SkillEffect) => {
  const c = e.condition?.damageType;
  return c ? (Array.isArray(c) ? c : [c]).map((t) => DAMAGE_TYPE_DE[t]).join("/") : "";
};

/** Ein Effekt als kurzer Text: „Block 4,7 HP Stich“, „+50 % Schaden“ … */
export function describeEffect(skillId: string, e: SkillEffect, progress: number): string | null {
  const v = getEffectValue(skillId, e, progress);
  const t = typeDe(e);
  switch (e.effectType) {
    case "flat_block":     return `🛡️ Block ${num(v)} HP${t ? ` ${t}` : ""}`;
    case "percent_reduce": return `🛡️ −${pct(v)}${t ? ` ${t}` : ""}`;
    case "weakness":       return `⚠️ ${t || "Schaden"} ×${num(v, 2)}`;
    case "reflect_damage": return `↩️ Rückschlag ${num(v)} HP`;
    case "damage_mult":    return `💪 ${v >= 1 ? "+" : "−"}${pct(Math.abs(v - 1))} Schaden`;
    case "dexterity":      return `🎯 Geschick +${num(v)}`;
    case "strength":       return `💪 Stärke +${num(v)} (vor Größenbonus)`;
    case "move_speed":     return `💨 Tempo ×${num(v, 2)} (${num(v * PLAYER_SPEED_PER_WORLD_RADIUS, 1)} Körperradien/s)`;
    case "sight_range":    return `👁️ Sichtweite ${num(v)} Körperradien`;
    case "color_vision":   return `🎨 Farbe ${pct(v)} (ohne Rot)`;
    case "red_vision":     return `🔴 Rot ${pct(v)}`;
    case "jump_distance":  return `🦘 Sprungweite ${num(v, 0)} px`;
    case "regen_hp":       return `💚 Heilung ${num(v, 2)} HP/s`;
    case "digest_rate":    return `🌱 Verdaut ${num(v)} Pflanzenfasern/min`;
    case "inject_venom": {
      const when = ALL_SKILLS.get(skillId)?.activation === "active" ? "beim Stich" : "je Treffer";
      return `☠️ ${pct(v)} Chance auf ${num(venomDoseMilli(e, progress) / MILLI)} HP Gift ${when}`;
    }
    default: return null;
  }
}

/**
 * Effektive Werte eines Skills des Blobs bei seinem aktuellen Fortschritt —
 * der Skill für sich allein (ohne andere Skills). Schaden steht separat
 * (CombatSystem.formatPlayerSkillDamage), weil Passiv-Skills ihn verstärken.
 */
export function describePlayerSkillValues(player: PlayerState, skillId: string): string[] {
  const def = ALL_SKILLS.get(skillId);
  if (!def) return [];
  const p = getSkillProgress(player, skillId);
  const lines = (def.effects ?? [])
    .map((e) => describeEffect(skillId, e, p))
    .filter((l): l is string => l !== null);
  return lines;
}

// -----------------------------------------------------------
// CHARAKTERWERTE (Werte-Tab im Spielmenü)
// -----------------------------------------------------------

/** Skills, die zu einem Effekt-Typ beitragen (eingeschaltete Passiv-Skills bzw. alle) */
function sources(progress: Record<string, number>, type: SkillEffect["effectType"]): string[] {
  return Object.keys(progress)
    .filter((id) => ALL_SKILLS.get(id)?.effects?.some((e) => e.effectType === type))
    .map((id) => ALL_SKILLS.get(id)!.name);
}

export interface CharacterStats {
  /** Stärke: Summe der Stärke-Effekte der eingeschalteten Passiv-Skills × Größenfaktor (wie im Kampf) */
  strength: number;
  /** Stärke ohne Größenbonus */
  strengthBase: number;
  /** Faktor der Körpergröße auf die Stärke */
  sizeStrengthMult: number;
  /** Faktor des Grundtempos (0 = keine Bewegung) und der Skill, der ihn liefert */
  moveFactor: number;
  moveSkill?: string;
  vision: Vision;
  strengthSources: string[];
  /** Geschick aus allen Skills (wie im Kampf, beim Verteidigen) */
  dexterity: number;
  dexteritySources: string[];
  /** Weltpixel pro Sekunde */
  speed: number;
  /** Weltpixel, bis zum Rand des Gegners */
  reach: number;
  radius: number;
  growth: number;
  /** verdaute Pflanzenfasern (Grow) */
  bodyMass: number;
  growActive: boolean;
  /** milli-HP pro Sekunde */
  hpRegen: number;
  /** milli-MP pro Sekunde */
  mpRegen: number;
  /** Rückschlag bei erlittenem Treffer (milli-HP) */
  reflect: number;
  /** Verteidigung je Schadenstyp — nur Typen mit Wirkung */
  defense: { type: DamageType; label: string; flatBlock: number; percentReduce: number; weakness: number; immune: boolean }[];
}

const ALL_DAMAGE_TYPES: DamageType[] = ["pierce", "slash", "blunt", "acid", "fire", "poison", "magic", "psychic"];

/**
 * Alle Charakterwerte des Blobs. hpRegen und mpRegen kommen vom Aufrufer
 * (StatusEffectSystem.getRegenerationRate, CombatSystem.MP_REGEN_MILLI_PER_SECOND),
 * damit dieses Modul nicht vom Kampfsystem abhängt.
 */
export function getCharacterStats(player: PlayerState, hpRegen: number, mpRegen: number): CharacterStats {
  const passive = getPlayerPassiveSkillProgress(player); // wie playerCombatant
  const all = getPlayerAllSkillProgress(player);
  const def = (t: DamageType) => resolveDefenderEffects(passive, t);
  return {
    strength: getPlayerStrength(player, passive),
    strengthBase: resolveStrength(passive),
    sizeStrengthMult: getSizeStrengthMult(player),
    moveFactor: getMoveSpeedFactor(player),
    moveSkill: getActiveMoveSkill(player),
    vision: getPlayerVision(player),
    strengthSources: sources(passive, "strength"),
    dexterity: resolveDexterity(all),
    dexteritySources: sources(all, "dexterity"),
    speed: calcPlayerSpeed(player),
    reach: calcPlayerReach(player),
    radius: calcPlayerWorldRadius(player),
    growth: getPlayerGrowth(player),
    bodyMass: player.bodyMass ?? 0,
    growActive: isGrowActive(player),
    hpRegen,
    mpRegen,
    reflect: resolveDefenderEffects(passive).reflectDamage,
    defense: ALL_DAMAGE_TYPES.map((t) => {
      const d = def(t);
      return { type: t, label: DAMAGE_TYPE_DE[t], flatBlock: d.flatBlock, percentReduce: d.percentReduce, weakness: d.weaknessMult, immune: d.immune };
    }).filter((d) => d.flatBlock || d.percentReduce || d.weakness !== 1 || d.immune),
  };
}

// Stand: 1. November 2026 — Erstfassung
