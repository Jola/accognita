# TODO — Absorb & Evolve

Offene Aufgaben, Bugs und Feature-Ideen. Werden hier gesammelt und bei Bedarf angegangen.

Format:
- `[BUG]` — Fehler im laufenden Spiel
- `[FEATURE]` — Neue Idee oder Erweiterung
- `[POLISH]` — Kleines Verbesserung, kein neues Feature

---

## Bugs

- `[BUG]` **Gift-Auffrischen setzt den Tick-Takt zurück** — `applyEffect` (StatusEffectSystem.ts) setzt beim Refresh auch `lastTickAt`. Kommen Treffer schneller als der Tick-Takt (1 s), tickt das Gift seltener oder nie; höheres Venom-Level (mehr Refreshes) macht dann *weniger* Schaden. Tritt auf beim Abwechseln von Biss/Klaue oder bei mehreren Giftspinnen. Details und Simulation: GDD-08 Abschnitt 12.3.

- `[BUG]` **Schwächeres Gift überschreibt stärkeres** — beim Refresh werden `damagePerTick`/`healPerTick` ersetzt statt das Maximum zu nehmen (z. B. Giftspinne Venom Lv3 überschreibt Schlange Venom Lv15). GDD-08 Abschnitt 12.3.

---

## Features & Ideen

- `[POLISH]` **Ungenutzte Alt-Formeln in SkillEffects.ts** — `calcChitinDr`, `calcVenomChance`, `calcVenomDmgPerTick`, `calcHemolymphReflect`, `calcSuperstrengthMult`, `calcFireBreathDamage` werden nirgends mehr aufgerufen und liefern teils andere Werte als die Effekt-Deklarationen in skills.ts. Entfernen, damit niemand sie versehentlich nutzt (GDD-05 Migrationsschritt 5). GDD-08 Abschnitt 11.2.

---

## Erledigt

- `[BUG]` **XP-/Level-Anzeige funktioniert nicht** — `updateUI()` hat den XP-Balken nicht befüllt. Fix: `calcPlayerLevel(p.totalExp)` liefert `xpIntoLevel/xpToNext`, daraus wird der Füllstand berechnet.

- `[BUG]` **Spinnen-Icon springt beim Angriff** — Phaser-Tween und direkte Positionssetzung (`sprite.y = instance.y`) haben sich gegenseitig überschrieben. Fix: Tween entfernt, Float-Animation jetzt als `Math.sin()`-Offset in `updateEntityVisuals()` berechnet — kein Konflikt mehr.
