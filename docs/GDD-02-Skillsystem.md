# ABSORB & EVOLVE — Game Design Document
## Datei 02: Skill-System

---

## 1. Kern-Fähigkeiten: Analyze & Absorb

> **Status: Neu definiert (v0.3)** — Analyze und Absorb sind ab sofort eigenständige, levelbare Fähigkeiten mit Fehlschlag-Mechanik.

Der Slime besitzt genau **zwei angeborene Kern-Fähigkeiten**. Alle anderen Fähigkeiten werden erst durch diese beiden erworben.

| Fähigkeit | Typ | Wirkung bei Erfolg | Wirkung bei Fehlschlag |
|-----------|-----|--------------------|------------------------|
| **Analyze** | aktiv, levelbar | Entität bleibt. Skill-XP: +1. Kein Material. | Siehe Fehlschlag-Tabelle |
| **Absorb** | aktiv, levelbar | Entität verschwindet (respawnt). Skills + Material. Skill-XP: +3 | Siehe Fehlschlag-Tabelle |
| **Infinite Storage** | passiv, fest | Materialien werden ohne Limit gespeichert. Mengendarstellung: K/M/B/T/Q ab 1.000. | — (kein Fehlschlag möglich) |

### 1.1 Infinite Storage — Materiallager ohne Limit

> **Status: Implementiert (v0.3)**

- Alle gesammelten Materialien landen in einem einzigen unendlichen Inventar.
- Keine Slots, keine Kapazitätsgrenze — jedes Material wird als `(Typ → Menge)` gespeichert.
- Mengen werden ab 1.000 abgekürzt dargestellt: `1K`, `2.3M`, `1.5B`, `4T`, `9Q`
- Technisches Maximum: `Number.MAX_SAFE_INTEGER` ≈ 9,007 Quadrillionen — praktisch unlimitiert.
- Diese Fähigkeit ist unveränderlich (Level 1, kein XP-System).

### 1.2 Leveling von Analyze & Absorb

Beide Kern-Fähigkeiten haben ein eigenes Level (Start: Level 1) und steigen durch wiederholten Einsatz auf.
Das Level der Kern-Fähigkeit bestimmt, wie hoch die Erfolgswahrscheinlichkeit gegen stärkere Entitäten ist.

### 1.3 Fehlschlag-Mechanik

> **Status: Konzept** — Formel und genaue Werte noch nicht festgelegt.

**Erfolgswahrscheinlichkeit** hängt vom Verhältnis `Fähigkeits-Level / Entitäts-Level` ab.
Ist das Entitäts-Level höher als das Fähigkeits-Level, steigt die Fehlschlagswahrscheinlichkeit.

**Reaktion der Entität auf Fehlschlag:**

| Entitätstyp | Fehlgeschlagenes Analyze | Fehlgeschlagenes Absorb |
|-------------|--------------------------|-------------------------|
| **Leblos** (Stein, Pflanze) | Nichts passiert | Nichts passiert |
| **Neutral** (friedliches Wesen) | Wesen bleibt friedlich | Wesen wird aggressiv und greift an |
| **Feindlich** (aggressives Wesen) | Wesen greift an | Wesen greift an |

**Offene Entscheidung:** Genaue Formel für die Erfolgswahrscheinlichkeit (linear, kurvenbasiert?).

---

## 2. Material-System

> **Status: Konzept** — Noch nicht implementiert.

### 2.1 Materialgewinnung

Bestimmte **leblose Entitäten** (Pflanzen, Steine) liefern bei Absorb oder Analyze neben möglichen Skills auch **typisierte Materialien**.

| Entitätstyp | Mögliche Materialien |
|-------------|----------------------|
| Pflanzen | Pflanzenfasern, Holz, Samen, ... |
| Steine | Stein, Erz, Kristall, ... |

Welche Materialien und in welcher Menge eine Entität liefert, wird pro Entität in `src/data/entities.ts` definiert.

### 2.2 Material-Verwendung

Materialien sind eine Ressource für aktive Fähigkeiten. Erste definierte Verwendung: `grow` (siehe Abschnitt 3.2).
Weitere Verwendungsmöglichkeiten folgen mit Ausbau des Systems.

---

## 3. Entitäts-Fähigkeiten (durch Absorb/Analyze erlernbar)

Fähigkeiten werden **nicht garantiert** übertragen. Ob ein Skill erworben wird, hängt ab von:
- Erfolg der Kern-Fähigkeit (Analyze/Absorb)
- Entitäts-Level vs. Fähigkeits-Level
- Skill-spezifischer Dropp-Wahrscheinlichkeit (seltene Skills sind schwerer zu erhalten)

### 3.1 Basis-Skills (Tiere / Wesen)

> **Status: Implementiert (v0.2)** — Werte in `src/data/skills.ts`. Überarbeitung für v0.3 ausstehend.

| Skill-ID | Name | Element | Icon | Quelle (Beispiele) | Max Level | baseXpThreshold |
|----------|------|---------|------|--------------------|-----------|-----------------|
| fire | Fireball | fire | 🔥 | Red Slime, Goblin | 10 | 10 |
| water | Water Jet | water | 💧 | Blue Slime | 10 | 10 |
| earth | Stone Skin | earth | 🪨 | Stone Golem, Vine Plant | 10 | 10 |
| wind | Wind Slash | wind | 💨 | Forest Wolf | 10 | 10 |
| slime | Slime Coat | slime | 🫧 | Jeder Slime-Typ | 10 | 8 |
| poison | Toxic Spit | poison | ☠️ | Poison Mushroom, Vine Plant | 10 | 12 |
| dark | Shadow Step | dark | 🌑 | Dark Wisp (selten) | 10 | 20 |
| light | Holy Beam | light | ✨ | Light Fairy (selten) | 10 | 20 |

### 3.2 Pflanzen-Skills

> **Status: Konzept** — Noch nicht implementiert.

Jede Pflanze besitzt mindestens einen der folgenden Skills. Die Wahrscheinlichkeit, diesen bei Absorb/Analyze zu erhalten, ist **skill-abhängig**.

| Skill-ID | Name | Dropp-Wahrscheinlichkeit | Beschreibung |
|----------|------|--------------------------|--------------|
| grow | Grow | **Hoch** — jede Pflanze kann diesen Skill besitzen | Verbraucht Materialien, um den Slime wachsen zu lassen (Größe & Stats) |
| photosynthesis | Photosynthesis | **Gering** — seltener Skill, wenige Pflanzen tragen ihn | Noch zu definieren — regeneriert oder produziert Ressourcen über Zeit |

**Grow im Detail:**
- Aktive Fähigkeit: Spieler setzt Grow bewusst ein.
- Verbraucht definierte Materialien (z.B. Pflanzenfasern — genaue Kosten noch offen).
- Erhöht dauerhaft Größe und/oder Stats des Slimes (HP, Angriff, Verteidigung — genaue Werte noch offen).
- Skaliert mit Skill-Level: höheres Grow-Level = effizienterer Verbrauch oder stärkeres Wachstum.

**Offene Entscheidung:** Was genau tut Photosynthesis? (Ressourcenregeneration, Materialproduktion über Zeit, Heilung?)

---

## 4. Skill-Leveling

> **Status: Implementiert (v0.2) — Kern-Mechanik gilt auch für Analyze & Absorb ab v0.3**

### Levelaufstieg durch Entdeckung (Wiederholung)
- Bekannter Skill wird durch Absorb/Analyze erneut entdeckt → Skill-XP.
- Absorb: +3 XP, Analyze: +1 XP.
- XP-Schwelle pro Level: `xpNeeded = floor(baseXpThreshold * 1.5^(level-1))`

**Gilt auch für Analyze und Absorb als Kern-Fähigkeiten** — jeder erfolgreiche Einsatz gibt Fähigkeits-XP.

### Levelaufstieg durch Nutzung (geplant, v0.3)
- Jeder aktive Einsatz eines Skills im Kampf: +1 XP.

---

## 5. Kombinations-System

> **Status: Implementiert (v0.2)** — Rezepte in `src/data/skills.ts` via `RECIPE_INDEX`.

Zwei bekannte Basis-Skills können kombiniert werden, um Kombinations-Skills freizuschalten.

| Skill-ID | Name | Rezept | Element | Icon | Max Level |
|----------|------|--------|---------|------|-----------|
| steam | Steam Burst | fire + water | water | ♨️ | 5 |
| firestorm | Firestorm | fire + wind | fire | 🌪️ | 5 |
| toxiccoat | Toxic Coat | poison + slime | poison | 🟣 | 5 |
| mudwall | Mud Wall | earth + water | earth | 🟫 | 5 |
| shadowform | Shadow Form | dark + slime | dark | 👤 | 5 |
| iceshard | Ice Shard | wind + water | wind | 🧊 | 5 |

### Regeln
1. Beide Slots müssen mit verschiedenen Basis-Skills belegt sein.
2. Kombinations-Skills können **nicht** als Input für weitere Kombinationen genutzt werden.
3. Wenn das Ergebnis bereits bekannt ist, wird stattdessen Skill-XP vergeben.

**Offene Entscheidung:** Sollen Rezepte versteckt sein und erst durch Experiment gefunden werden?

---

## 6. Skill-Anzeige & Verwaltung

### Aktiv-Leiste (HUD)
- Maximal 5 Skills gleichzeitig aktiv (Tastenbelegung 1–5).

### Skills-Tab (Side Panel)
- Zeigt alle entdeckten Skills mit Level, XP-Fortschritt, Beschreibung.
- Kern-Fähigkeiten (Analyze, Absorb) werden separat als immer verfügbar angezeigt.
- Farbcodierung nach Element.

---

## 7. Geplante Erweiterungen

- **Passive Skills**: Automatisch wirkende Skills (z.B. Regeneration aus Pflanze).
- **Transformation-Skills**: Bei genug Skills eines Elements optische Veränderung.
- **Vergessen-Mechanik**: Skill-Limit erzwingt Auswahl.
- **Skill-Synergie**: Bestimmte Skills verstärken sich gegenseitig.
- **Leveling durch Kampf**: Skill-XP durch aktiven Einsatz im Kampf (v0.3).
- **Material-Crafting**: Materialien für mehr als nur `grow` verwenden (v0.3+).

---

*Letzte Aktualisierung: v0.3 — Infinite Storage als Core-Skill dokumentiert, K/M/B/T/Q-Mengendarstellung (März 2026)*
