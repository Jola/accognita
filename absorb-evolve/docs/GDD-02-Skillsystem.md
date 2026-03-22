# ABSORB & EVOLVE — Game Design Document
## Datei 02: Skill-System

---

## 1. Übersicht

> **Status: Implementiert (v0.2)** — Alle Kern-Mechaniken sind in `src/systems/SkillSystem.ts` umgesetzt.

Das Skill-System ist das Herzstück des Spiels. Es gibt **keine Skill-Bäume zum Anklicken**, keine Shops, keine Klassen-Auswahl. Skills werden ausschließlich durch direkte Interaktion mit der Welt entdeckt.

### Zwei Entdeckungswege

| Methode | Effekt auf Entity | Skill-XP-Gewinn | Wann sinnvoll |
|---------|-------------------|-----------------|---------------|
| **Absorb** | Entity verschwindet permanent (respawnt nach Zeit) | +3 XP pro Skill | Wenn man den Skill schnell leveln will |
| **Analyze** | Entity bleibt vollständig erhalten | +1 XP pro Skill | Wenn man die Ressource erhalten will |

**Design-Prinzip**: Der Spieler muss abwägen. Absorbieren ist mächtiger, aber die Welt verarmt temporär. Analysieren ist nachhaltig, aber langsamer.

---

## 2. Skill-Kategorien

### Basis-Skills (direkt durch Entities entdeckbar)

> **Status: Implementiert (v0.2)** — Werte in `src/data/skills.ts`. Balancing noch nicht abgestimmt.

| Skill-ID | Name | Element | Icon | Quelle (Beispiele) | Max Level | baseXpThreshold | Besonderheit |
|----------|------|---------|------|--------------------|-----------|-----------------|--------------|
| fire | Fireball | fire | 🔥 | Red Slime, Goblin | 10 | 10 | — |
| water | Water Jet | water | 💧 | Blue Slime | 10 | 10 | — |
| earth | Stone Skin | earth | 🪨 | Stone Golem, Vine Plant | 10 | 10 | — |
| wind | Wind Slash | wind | 💨 | Forest Wolf | 10 | 10 | — |
| slime | Slime Coat | slime | 🫧 | Jeder Slime-Typ | 10 | **8** | Leichter zu leveln — häufigste Quelle |
| poison | Toxic Spit | poison | ☠️ | Poison Mushroom, Vine Plant | 10 | **12** | Etwas schwerer — weniger Quellen |
| dark | Shadow Step | dark | 🌑 | Dark Wisp (selten) | 10 | **20** | Selten — nur Dark Wisp |
| light | Holy Beam | light | ✨ | Light Fairy (selten) | 10 | **20** | Selten — Light Fairy kämpft nie, nur Analyze |

### Kombinations-Skills (nur durch Kombinieren freischaltbar)

> **Status: Implementiert (v0.2)** — Rezepte in `src/data/skills.ts` via `RECIPE_INDEX`.

| Skill-ID | Name | Rezept | Element | Icon | Max Level | baseXpThreshold |
|----------|------|--------|---------|------|-----------|-----------------|
| steam | Steam Burst | fire + water | water | ♨️ | 5 | 15 |
| firestorm | Firestorm | fire + wind | fire | 🌪️ | 5 | 15 |
| toxiccoat | Toxic Coat | poison + slime | poison | 🟣 | 5 | 15 |
| mudwall | Mud Wall | earth + water | earth | 🟫 | 5 | 15 |
| shadowform | Shadow Form | dark + slime | dark | 👤 | 5 | **20** — benötigt seltenen dark-Skill |
| iceshard | Ice Shard | wind + water | wind | 🧊 | 5 | 15 |

---

## 3. Skill-Leveling

> **Status: Implementiert (v0.2)** — Logik in `src/systems/SkillSystem.ts`, Funktion `discoverSkill()`.

### Levelaufstieg durch Entdeckung (Wiederholung)
- Jedes Mal wenn ein bereits bekannter Skill entdeckt wird (durch Absorb oder Analyze), erhält er Skill-XP.
- Absorb: +3 XP, Analyze: +1 XP
- XP-Schwelle steigt pro Level: `xpNeeded = floor(baseXpThreshold * multiplier^(level-1))`
- Multiplier: 1.5 (GDD-Vorgabe eingehalten)

**Beispiel-XP-Kurve für fire (baseThreshold=10):**
Level 1→2: 10 XP · Level 2→3: 15 XP · Level 3→4: 22 XP · Level 4→5: 33 XP · Level 5→6: 49 XP · ...

**Beispiel-XP-Kurve für dark/light (baseThreshold=20):**
Level 1→2: 20 XP · Level 2→3: 30 XP · Level 3→4: 45 XP · ...

### Levelaufstieg durch Nutzung (geplant, v0.3)
- Jede aktive Verwendung eines Skills im Kampf gibt ebenfalls Skill-XP.
- Kampf-XP: +1 XP pro Einsatz
- Beide Systeme (Entdeckung + Nutzung) wirken additiv.

### Level-Effekte
| Level | Effekt |
|-------|--------|
| 1 | Skill entdeckt, Basis-Schaden/-Effekt |
| 3 | +25% Effektivität |
| 5 | Neue visuelle Darstellung (geplant) |
| 7 | Neue Sekundäreffekt freigeschaltet (geplant) |
| 10 (MAX) | Vollständig entwickelt, seltene Kombination möglich |

---

## 4. Kombinations-System

> **Status: Implementiert (v0.2)** — Logik in `src/systems/SkillSystem.ts`, Funktion `combineSkills()`. Rezepte in `src/data/skills.ts` via `RECIPE_INDEX` (alphabetisch sortierter Key: `"idA+idB"`).

### Regeln
1. Beide Slots müssen mit verschiedenen Basis-Skills belegt sein.
2. Kombinations-Skills können **nicht** als Input für weitere Kombinationen genutzt werden (v0.1).
3. Das Rezept muss in der Kombinations-Tabelle existieren — sonst kein Ergebnis.
4. Wenn das Ergebnis bereits bekannt ist, wird stattdessen Skill-XP vergeben.

### Unbekannte Rezepte (geplant)
- In v0.1 sind alle Rezepte im UI sichtbar (Tutorial-freundlich).
- In späteren Versionen: Rezepte sind verborgen und müssen durch Experiment oder In-Game-Hinweise gefunden werden.
- Manche Rezepte werden nur durch spezielle Items oder NPCs enthüllt.

---

## 5. Skill-Anzeige & Verwaltung

### Aktiv-Leiste (HUD)
- Maximal 5 Skills gleichzeitig aktiv (Tastenbelegung 1–5).
- Auswahl welche Skills aktiv sind: im Skills-Tab per Drag-and-Drop (geplant v0.2).

### Skills-Tab (Side Panel)
- Zeigt alle entdeckten Skills mit Level, XP-Fortschritt und Beschreibung.
- Farbcodierung nach Element (linker Balken-Indikator).
- Combo-Skills sind mit "COMBO"-Badge markiert.

---

## 6. Geplante Erweiterungen

- **Passive Skills**: Skills die automatisch wirken (z.B. "Regeneration" aus Pflanze absorbieren).
- **Transformation-Skills**: Bei genug Skills eines Elements transformiert sich der Slime optisch (z.B. Feuer-Slime mit Flammen-Aura).
- **Vergessen-Mechanik**: Der Slime hat ein Limit an aktiven Skills. Zu viele Skills erzwingen eine Auswahl.
- **Skill-Synergie**: Bestimmte Skills verstärken sich gegenseitig wenn beide aktiv sind.

---

*Letzte Aktualisierung: v0.2 — Skill-System implementiert, Balancing-Werte dokumentiert (März 2026)*
