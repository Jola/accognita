// ============================================================
// COMBAT TYPES
// Absorb & Evolve — Alle Kampf-spezifischen Typen
//
// Keine Abhängigkeiten zu anderen Spiel-Modulen.
// Wird von GameState.ts, Entity.ts, Skill.ts importiert.
// ============================================================

// -----------------------------------------------------------
// AttackType: Wie ein Angriff / Skill ausgeführt wird
// -----------------------------------------------------------
export type AttackType =
  | "melee"              // Sofort, Nahkampf — kein Projektil
  | "ranged_projectile"  // Projektil das auf Ziel zufliegt
  | "magic_aoe"          // Kreis um Spieler, alle Ziele im Radius
  | "magic_self"         // Wirkt nur auf Spieler (Buff / Heilung)
  | "dash";              // Positionsverschiebung (z.B. Jump)

// -----------------------------------------------------------
// StatusEffectType: Welcher Mechanismus steckt dahinter?
// -----------------------------------------------------------
export type StatusEffectType =
  | "dot"       // Damage over Time (z.B. Venom, Feuer)
  | "hot"       // Heal over Time (z.B. Photosynthesis)
  | "stat_mod"  // Dauerhafte Stat-Änderung (z.B. Chitin Armor, Slow)
  | "aura";     // Reaktiver Effekt (z.B. Hemolymph: Schaden beim Treffen)

// -----------------------------------------------------------
// StatusEffect: Ein aktiver Effekt auf Spieler oder Entity
//
// Passiv-Skills werden als Permanenteffekte modelliert
// (durationMs: -1, expiresAt: Infinity).
// Dadurch kein Sonderfall im Update-Loop — alles läuft
// durch denselben Verarbeitungspfad.
// -----------------------------------------------------------
export interface StatusEffect {
  id: string;               // Einzigartige Instanz-ID, z.B. "venom_dot_1234"
  type: StatusEffectType;
  sourceSkillId?: string;   // Welcher Skill hat diesen Effekt erzeugt?

  durationMs: number;       // -1 = permanent (Passiv-Skills)
  expiresAt: number;        // Timestamp in ms; Infinity für permanent
  tickIntervalMs: number;   // Abstand zwischen Ticks in ms; 0 = kein Tick
  lastTickAt: number;       // Timestamp des letzten Ticks (ms)

  // Effekt-Werte — nur das befüllen was für diesen Effekt relevant ist.
  // Ungenutzte Felder bleiben auf dem Defaultwert.
  damagePerTick: number;    // DoT: Schaden pro Tick
  healPerTick: number;      // HoT: Heilung pro Tick
  speedMultiplier: number;  // stat_mod: 1.0 = neutral, 0.5 = halb so schnell
  damageReduction: number;  // stat_mod: 0.0–1.0 (Anteil abgefangener Schaden)
  reflectDamage: number;    // aura: Schaden zurück an Angreifer
  damageBonus: number;      // stat_mod: Absoluter Schadensbonus
  damageMult: number;       // stat_mod: Multiplikativer Schadensbonus (1.0 = neutral)
}

// Hilfsfunktion: StatusEffect mit Defaults erstellen
export function makeStatusEffect(
  base: Pick<StatusEffect, "id" | "type"> &
    Partial<Omit<StatusEffect, "id" | "type">>
): StatusEffect {
  return {
    sourceSkillId:  undefined,
    durationMs:     -1,
    expiresAt:      Infinity,
    tickIntervalMs: 0,
    lastTickAt:     0,
    damagePerTick:  0,
    healPerTick:    0,
    speedMultiplier: 1.0,
    damageReduction: 0,
    reflectDamage:  0,
    damageBonus:    0,
    damageMult:     1.0,
    ...base,
  };
}

// -----------------------------------------------------------
// ProjectileData: Daten für ein Phaser-Projektil
// Wird von CombatSystem zurückgegeben; GameScene rendert es.
// -----------------------------------------------------------
export interface ProjectileData {
  x: number;         // Startposition
  y: number;
  dx: number;        // Normierter Richtungsvektor
  dy: number;
  skillId: string;   // Welcher Skill hat das Projektil erzeugt?
  speedPx: number;   // Pixel pro Sekunde
  rangePx: number;   // Maximale Reichweite in Pixeln
}

// -----------------------------------------------------------
// AttackResult: Ergebnis eines Angriffs (Spieler oder Entity)
// Wird von CombatSystem zurückgegeben — reine Daten, kein Rendering.
// -----------------------------------------------------------
export interface AttackResult {
  hit: boolean;
  damageDealt: number;
  statusApplied: StatusEffect[];       // Neu applizierte Effekte auf dem Ziel
  projectile?: ProjectileData;         // Nur bei ranged_projectile / magic
  message: string;
}

// -----------------------------------------------------------
// AiFrame: Ergebnis einer AI-Berechnung für eine Entity
// AiSystem berechnet dies; GameScene setzt die Physik-Velocities.
// -----------------------------------------------------------
export interface AiFrame {
  vx: number;              // Gewünschte Velocity X (px/s)
  vy: number;              // Gewünschte Velocity Y (px/s)
  wantToAttack: boolean;   // Entity ist in Reichweite + Cooldown abgelaufen
  becameAggro: boolean;    // Neu aggro in diesem Frame
  lostAggro: boolean;      // Aggro verloren (zu weit weg oder tot)
}
