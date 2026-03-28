# TODO — Absorb & Evolve

Offene Aufgaben, Bugs und Feature-Ideen. Werden hier gesammelt und bei Bedarf angegangen.

Format:
- `[BUG]` — Fehler im laufenden Spiel
- `[FEATURE]` — Neue Idee oder Erweiterung
- `[POLISH]` — Kleines Verbesserung, kein neues Feature

---

## Bugs

*(leer)*

---

## Features & Ideen

*(leer)*

---

## Erledigt

- `[BUG]` **XP-/Level-Anzeige funktioniert nicht** — `updateUI()` hat den XP-Balken nicht befüllt. Fix: `calcPlayerLevel(p.totalExp)` liefert `xpIntoLevel/xpToNext`, daraus wird der Füllstand berechnet.

- `[BUG]` **Spinnen-Icon springt beim Angriff** — Phaser-Tween und direkte Positionssetzung (`sprite.y = instance.y`) haben sich gegenseitig überschrieben. Fix: Tween entfernt, Float-Animation jetzt als `Math.sin()`-Offset in `updateEntityVisuals()` berechnet — kein Konflikt mehr.
