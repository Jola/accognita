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

- `[FEATURE]` **Schwärme schwacher Gegner gefährlich halten** — heute macht ein paar Chitin-Level ganze Schwärme fast harmlos (10 Ameisen: 40 HP/s ohne Chitin, 4,3 HP/s mit Chitin 3, 1,6 HP/s mit Chitin 5). Drei Wege, einzeln oder kombiniert (GDD-08 Abschnitt 19.2):
  1. Flat-Block auf einen Anteil des Treffers begrenzen (z. B. höchstens 50–70 % eines Treffers blockbar), damit jeder Treffer etwas durchbringt.
  2. Rüstung nach `x/(x+K)` statt als feste Abzüge. Mit K = 7 blieben 10 Ameisen bei rund 16–20 HP/s.
  3. Gruppen-Effekte gezielt einbauen, z. B. stapelndes Gift (heute stapelt Gift aus mehreren Quellen nicht).
  Dazu prüfen: Hemolymph ab u = 4 tötet jede Ameise schon bei ihrem ersten Treffer.

- `[FEATURE]` **Gegner-Aufleveln an die Erfahrungsregeln anpassen** — `EntityLevelingSystem` skaliert HP/Schaden/Tempo pauschal ×1,25 je Bonus-Level. Das widerspricht der Vorgabe „gleicher Skill, gleiche Erfahrung, gleiche Wirkung“ (GDD-02 Abschnitt 8.6). Vorschlag: Siege geben dem Gegner Skill-Erfahrung nach denselben Regeln wie beim Blob.

- `[FEATURE]` **Idee: Grow / Wachsen** (für später, nicht umsetzen ohne Anweisung) — Skill, mit dem der Blob über Spielzeit und unter Verbrauch von Ressourcen (Pflanzenfasern, Zellmaterial …) größer wird. `MaterialSystem.useGrow` gibt es schon, der Skill `grow` fehlt in skills.ts. GDD-02 Abschnitt 8.10.

- `[FEATURE]` **Idee: Körpergröße verstärkt Skills** (für später) — z. B. mit wachsender Größe prozentual mehr Stärke; eine „Synergie mit dem Körper“. GDD-02 Abschnitt 8.6.

- `[POLISH]` **Ungenutzte Alt-Formeln in SkillEffects.ts** — `calcChitinDr`, `calcVenomChance`, `calcVenomDmgPerTick`, `calcHemolymphReflect`, `calcSuperstrengthMult`, `calcFireBreathDamage` werden nirgends mehr aufgerufen und liefern teils andere Werte als die Effekt-Deklarationen in skills.ts. Entfernen, damit niemand sie versehentlich nutzt (GDD-05 Migrationsschritt 5). GDD-08 Abschnitt 11.2.

---

## Erledigt

- `[BUG]` **XP-/Level-Anzeige funktioniert nicht** — `updateUI()` hat den XP-Balken nicht befüllt. Fix: `calcPlayerLevel(p.totalExp)` liefert `xpIntoLevel/xpToNext`, daraus wird der Füllstand berechnet.

- `[BUG]` **Spinnen-Icon springt beim Angriff** — Phaser-Tween und direkte Positionssetzung (`sprite.y = instance.y`) haben sich gegenseitig überschrieben. Fix: Tween entfernt, Float-Animation jetzt als `Math.sin()`-Offset in `updateEntityVisuals()` berechnet — kein Konflikt mehr.
