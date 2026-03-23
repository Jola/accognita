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

### 3.1 Insekten-Skills

> **Status: Implementiert (v0.3)** — Basisset. Alle weiteren Skills werden separat entworfen und einzeln hinzugefügt.

#### Entitäten

| Entität | Level | Disposition | Kategorie | Quellen-Skills |
|---------|-------|-------------|-----------|----------------|
| Ameise | 1 | neutral | creature | Chitin Armor (15%), Superstrength (10%) |
| Marienkäfer | 1 | neutral | creature | Hemolymph (15%) |
| Springspinne | 2 | hostile | creature | Jump (20%), Chitin Armor (10%) |
| Giftspinne | 2 | hostile | creature | Venom (20%), Chitin Armor (8%) |

#### Skills

| Skill-ID | Name | Typ | Element | Icon | Quellen | Beschreibung |
|----------|------|-----|---------|------|---------|--------------|
| chitin_armor | Chitin Armor | passiv | earth | 🛡️ | Ameise, Springspinne, Giftspinne | Reduziert physischen Schaden |
| superstrength | Superstrength | passiv | none | 💪 | Ameise | Erhöht Material-Ausbeute bei Absorb |
| venom | Venom | passiv | poison | 🕷️ | Giftspinne | Treffer vergiften Ziel (DoT-Chance) |
| jump | Jump | aktiv | none | 🦘 | Springspinne | **Bewegungs-Unlock**: Ohne diesen Skill kann der Slime nicht springen. Höheres Level = größere Sprunghöhe/-weite. |
| hemolymph | Hemolymph | passiv | poison | 🐞 | Marienkäfer | Bei eigenem Treffer: Angreifer vergiftet |

Alle Basis-Skills haben `maxLevel: 0` (unlimitiert). XP-Skalierung via Option D (`balance.ts`).

### 3.2 Pflanzen-Skills

> **Status: Implementiert (v0.3)**

| Skill-ID | Name | Typ | Dropp-Chance | Quelle | Beschreibung |
|----------|------|-----|--------------|--------|--------------|
| photosynthesis | Photosynthesis | passiv | 12% | Gras | Regeneriert HP passiv außerhalb des Kampfes |

#### Entitäten (Pflanzen)

| Entität | Level | Respawn | Drops |
|---------|-------|---------|-------|
| Gras | 1 | 60 Sek | Pflanzenfasern (100%), Photosynthesis (12%) |

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

> **Status: Mechanismus implementiert — keine Rezepte definiert (v0.3)**

Der Kombinations-Mechanismus (`SkillSystem.ts`, `RECIPE_INDEX`, COMBO-Tab im UI) ist vollständig vorhanden.
Aktuell gibt es keine kombinierbaren Skills. Rezepte werden einzeln und gezielt entworfen.

### Regeln (gültig sobald Rezepte existieren)
1. Beide Slots müssen mit verschiedenen Basis-Skills belegt sein.
2. Kombinations-Skills können **nicht** als Input für weitere Kombinationen genutzt werden.
3. Wenn das Ergebnis bereits bekannt ist, wird stattdessen Skill-XP vergeben.

**Offene Entscheidung:** Sollen Rezepte versteckt sein und erst durch Experiment gefunden werden?

[VERWORFEN: Steam Burst, Firestorm, Toxic Coat, Mud Wall, Shadow Form, Ice Shard — entfernt in v0.3, werden neu entworfen]

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

*Letzte Aktualisierung: v0.3 — Basisset auf Gras + Insekten reduziert; neue Skills: Chitin Armor, Superstrength, Venom, Pounce, Hemolymph; alte Skills entfernt (März 2026)*
