// ============================================================
// STATUS EFFECT SYSTEM
// Absorb & Evolve — Verarbeitung aller aktiven Effekte
//
// Zuständig für:
//   - Tick-Verarbeitung: DoT, HoT in festen Intervallen
//   - Effekt-Anwendung: applyEffect mit Duplikat-Handling
//   - Ablauf: Abgelaufene Effekte entfernen
//   - Passiv-Sync: Passiv-Skills → permanente Effekte aktuell halten
//   - Stat-Berechnungen: Schadensreduktion, Speed-Multiplikator etc.
//
// Keine Phaser-Abhängigkeit. Kein Rendering. Vollständig testbar.
// ============================================================

import type { PlayerState } from "../types/GameState";
import type { EntityInstance } from "../types/Entity";
import type { StatusEffect } from "../types/Combat";
import { makeStatusEffect } from "../types/Combat";
import { ALL_SKILLS } from "../data/skills";
import { getSkillEffectiveness } from "./SkillSystem";

// Maximale gleichzeitig aktive Effekte pro Ziel (Performance-Grenze)
const MAX_EFFECTS = 8;

// -----------------------------------------------------------
// Tick-Verarbeitung — im Game Loop aufrufen
//
// Gibt den HP-Delta zurück (negativ = Schaden, positiv = Heilung).
// Entfernt abgelaufene Effekte NICHT — dafür removeExpiredEffects nutzen.
// -----------------------------------------------------------
export function processTicks(
  target: { statusEffects: StatusEffect[]; hp: number; maxHp: number },
  now: number
): number {
  let hpDelta = 0;

  for (const effect of target.statusEffects) {
    if (effect.tickIntervalMs <= 0) continue;

    // Noch nicht fällig
    if (now - effect.lastTickAt < effect.tickIntervalMs) continue;

    effect.lastTickAt = now;

    // DoT
    if (effect.type === "dot") {
      hpDelta -= effect.damagePerTick;
    }

    // HoT — nicht über maxHp heilen
    if (effect.type === "hot") {
      const headroom = target.maxHp - target.hp;
      hpDelta += Math.min(effect.healPerTick, headroom);
    }
  }

  return hpDelta;
}

// -----------------------------------------------------------
// Aura-Reaktion — aufrufen wenn Ziel getroffen wird
//
// Gibt Sofortschaden zurück der an den Angreifer geht.
// Beispiel: Hemolymph gibt Schaden zurück wenn Slime getroffen wird.
// -----------------------------------------------------------
export function triggerAuras(
  target: { statusEffects: StatusEffect[] }
): number {
  let reflectDmg = 0;
  for (const effect of target.statusEffects) {
    if (effect.type === "aura") {
      reflectDmg += effect.reflectDamage;
    }
  }
  return reflectDmg;
}

// -----------------------------------------------------------
// Effekt anwenden
//
// Regeln:
//   - Gleicher sourceSkillId + Typ: Effekt refreshen (Duration reset),
//     nicht stacken — verhindert Spam
//   - Anderer Effekt: hinzufügen, solange MAX_EFFECTS nicht erreicht
//   - Bei MAX_EFFECTS: ältesten zeitbegrenzten Effekt ersetzen
// -----------------------------------------------------------
export function applyEffect(
  target: { statusEffects: StatusEffect[] },
  effect: StatusEffect
): void {
  // Refresh wenn identischer Skill-Effekt bereits aktiv
  const existing = target.statusEffects.find(
    (e) => e.sourceSkillId === effect.sourceSkillId && e.type === effect.type
  );
  if (existing) {
    existing.expiresAt = effect.expiresAt;
    existing.lastTickAt = effect.lastTickAt;
    // Werte aktualisieren (Level-Up könnte stärkeren Effekt liefern)
    existing.damagePerTick = effect.damagePerTick;
    existing.healPerTick   = effect.healPerTick;
    return;
  }

  // Platz prüfen
  if (target.statusEffects.length >= MAX_EFFECTS) {
    // Ältesten nicht-permanenten Effekt entfernen
    const removableIdx = target.statusEffects.findIndex(
      (e) => e.expiresAt !== Infinity
    );
    if (removableIdx !== -1) {
      target.statusEffects.splice(removableIdx, 1);
    } else {
      return; // Alle Effekte sind permanent — kein Platz
    }
  }

  target.statusEffects.push(effect);
}

// -----------------------------------------------------------
// Abgelaufene Effekte entfernen — im Game Loop aufrufen
// -----------------------------------------------------------
export function removeExpiredEffects(
  target: { statusEffects: StatusEffect[] },
  now: number
): void {
  target.statusEffects = target.statusEffects.filter(
    (e) => e.expiresAt === Infinity || e.expiresAt > now
  );
}

// -----------------------------------------------------------
// Alle Effekte eines Ziels löschen (z.B. bei Respawn / Checkpoint)
// -----------------------------------------------------------
export function clearAllEffects(
  target: { statusEffects: StatusEffect[] }
): void {
  target.statusEffects = [];
}

// -----------------------------------------------------------
// Passiv-Sync — Passiv-Skills → permanente Effekte aktuell halten
//
// Wird nach jeder Skill-Entdeckung oder Level-Up aufgerufen.
// Permanente Effekte (durationMs: -1) werden gesetzt oder aktualisiert.
// Nicht mehr vorhandene Passiv-Skills werden entfernt.
// -----------------------------------------------------------
export function syncPassiveEffects(player: PlayerState): void {
  const now = Date.now();

  // Permanente Effekte aus Skills erzeugen
  for (const [skillId, instance] of player.discoveredSkills) {
    const def = ALL_SKILLS.get(skillId);
    if (!def || def.activation !== "passive") continue;

    const effectiveness = getSkillEffectiveness(instance.level);

    switch (skillId) {
      case "chitin_armor": {
        // 10% + 5% pro Level Schadensreduktion
        const reduction = Math.min(0.10 + (instance.level - 1) * 0.05, 0.70);
        applyEffect(player, makeStatusEffect({
          id: `passive_${skillId}`,
          type: "stat_mod",
          sourceSkillId: skillId,
          damageReduction: reduction,
        }));
        break;
      }

      case "superstrength": {
        // +30% Schadensbonus * effectiveness (steigt mit Level)
        applyEffect(player, makeStatusEffect({
          id: `passive_${skillId}`,
          type: "stat_mod",
          sourceSkillId: skillId,
          damageMult: 1.0 + 0.3 * effectiveness,
        }));
        break;
      }

      case "hemolymph": {
        // Aura: 2 Sofortschaden pro Treffer * Level
        applyEffect(player, makeStatusEffect({
          id: `passive_${skillId}`,
          type: "aura",
          sourceSkillId: skillId,
          reflectDamage: 2 * instance.level,
        }));
        break;
      }

      case "photosynthesis": {
        // HoT: 0.5 HP/s pro Level — wirkt nur außerhalb Aggro (GameScene prüft das)
        applyEffect(player, makeStatusEffect({
          id: `passive_${skillId}`,
          type: "hot",
          sourceSkillId: skillId,
          tickIntervalMs: 1000,
          healPerTick: 0.5 * instance.level,
          lastTickAt: now,
        }));
        break;
      }

      // venom wirkt als StatusEffect auf dem Ziel (nicht auf dem Spieler)
      // — wird in CombatSystem bei Treffer angewendet
    }
  }

  // Passive Effekte entfernen die keinem vorhandenen Skill mehr entsprechen
  player.statusEffects = player.statusEffects.filter((e) => {
    if (!e.sourceSkillId) return true; // Externe Effekte behalten
    if (!e.id.startsWith("passive_")) return true;
    const skillId = e.sourceSkillId;
    const def = ALL_SKILLS.get(skillId);
    return player.discoveredSkills.has(skillId) && def?.activation === "passive";
  });
}

// -----------------------------------------------------------
// Stat-Berechnungen — für CombatSystem
// -----------------------------------------------------------

/** Gesamte Schadensreduktion durch alle aktiven stat_mod-Effekte (0.0–1.0) */
export function calcDamageReduction(effects: StatusEffect[]): number {
  let reduction = 0;
  for (const e of effects) {
    if (e.type === "stat_mod") reduction += e.damageReduction;
  }
  return Math.min(reduction, 0.85); // Max 85% — nie unverwundbar
}

/** Multiplikator für ausgehenden Schaden (Superstrength etc.) */
export function calcDamageMult(effects: StatusEffect[]): number {
  let mult = 1.0;
  for (const e of effects) {
    if (e.type === "stat_mod") mult *= e.damageMult;
  }
  return mult;
}

/** Geschwindigkeits-Multiplikator durch Slow-Effekte etc. */
export function calcSpeedMultiplier(effects: StatusEffect[]): number {
  let mult = 1.0;
  for (const e of effects) {
    if (e.type === "stat_mod") mult *= e.speedMultiplier;
  }
  return Math.max(mult, 0.1); // Mindestens 10% Geschwindigkeit
}

// -----------------------------------------------------------
// Hilfsfunktion: Venom-DoT-Effekt auf einer Entity erzeugen
// (aufgerufen von CombatSystem nach erfolgreichem Treffer)
// -----------------------------------------------------------
export function makeVenomEffect(venomLevel: number): StatusEffect {
  const now = Date.now();
  const durationMs = 4000;
  return makeStatusEffect({
    id: `venom_dot_${now}`,
    type: "dot",
    sourceSkillId: "venom",
    durationMs,
    expiresAt: now + durationMs,
    tickIntervalMs: 1000,
    lastTickAt: now,
    damagePerTick: 2 + Math.floor((venomLevel - 1) * 0.5),
  });
}
