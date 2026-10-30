# ABSORB & EVOLVE — Game Design Document
## Datei 02: Skill-System

---

## 1. Kern-Fähigkeiten: Analyze & Absorb

> **Status: Neu definiert (v0.3)** — Analyze und Absorb sind ab sofort eigenständige, levelbare Fähigkeiten mit Fehlschlag-Mechanik.

Der Blob besitzt genau **zwei angeborene Kern-Fähigkeiten**. Alle anderen Fähigkeiten werden erst durch diese beiden erworben.

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

**Implementiert (vorläufig):** `Erfolg = min(1, Fähigkeits-Level / Entitäts-Level)` ([balance.ts](../src/data/balance.ts) `calcSuccessChance`) — gleiches oder höheres Level = sicherer Erfolg, darunter proportional weniger.
> Begründung offen — die Formel ist als Platzhalter umgesetzt; die Entscheidung linear vs. Kurve steht noch aus (GDD-00 Backlog).

### 1.4 Größe beim Absorbieren und Analysieren

> **Status: Konzept (vorläufig)** — Die Regeln für Absorbieren und Analysieren werden noch überarbeitet; beides kann sich ändern.

**Vorgabe (Entwickler):** Das Größenverhältnis wird über `worldSize` gemessen (Größe der Entität ÷ Größe des Blobs).

**Absorbieren:**
**Vorgabe (Entwickler):** Absorbieren ist nur möglich, wenn die Entität höchstens 20 % größer ist als der Blob (`worldSize` der Entität ≤ 1,2 × `worldSize` des Blobs).
> Begründung offen

**Analysieren:**
**Vorgabe (Entwickler):** Für Analysieren gilt die 20-%-Grenze nicht, auch größere Gegner können analysiert werden. Bei zu großen und zu starken Gegnern ist die Erfolgswahrscheinlichkeit aber deutlich geringer.
**Begründung (Entwickler):** Man soll nicht einfach zu den stärksten Gegnern laufen, sie analysieren und dadurch einen übermäßig schnellen Spielfortschritt bekommen.

Die heutige Formel `min(1, Fähigkeits-Level / Entitäts-Level)` senkt die Chance schon bei höherem Entitäts-Level. Die Größe fließt bisher nicht ein. Noch offen: wie stark die Größe die Analyse-Chance senkt und ob sie mit dem Level-Verhältnis verrechnet wird (z. B. multipliziert).

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
| superstrength | Superstrength | passiv | none | 💪 | Ameise | ~~Erhöht Material-Ausbeute bei Absorb~~ [VERWORFEN] → verstärkt Nahkampfschaden (×1,30 + 0,05/Level) — Begründung im `reasoning` des Skills |
| venom | Venom | passiv | poison | 🕷️ | Giftspinne | Treffer vergiften Ziel (DoT-Chance) |
| jump | Jump | aktiv | none | 🦘 | Springspinne | **Bewegungs-Unlock**: Ohne diesen Skill kann der Blob nicht springen. Höheres Level = größere Sprunghöhe/-weite. |
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

Mathematische Analyse der Kurven und Alternativen (Status: Diskussion): [GDD-08 Progressionsmathematik](GDD-08-Progressionsmathematik.md).

### Levelaufstieg durch Entdeckung (Wiederholung)
- Bekannter Skill wird durch Absorb/Analyze erneut entdeckt → Skill-XP.
- Absorb: +3 XP, Analyze: +1 XP.
- XP-Schwelle pro Level: `xpNeeded = floor(baseXpThreshold * 1.5^(level-1))`

**Gilt auch für Analyze und Absorb als Kern-Fähigkeiten** — jeder erfolgreiche Einsatz gibt Fähigkeits-XP.

> Begründung offen — Absorb +3 vs. Analyze +1 und Schwellen-Faktor 1,5.
> (Rekonstruiert, bitte bestätigen: Absorb zerstört das Wesen und ist riskanter, daher mehr XP; Analyze-Skill-Chance ist aus demselben Grund ×0,7 — „man nimmt nichts physisch auf", Kommentar in balance.ts.)

#### XP-Skalierung nach Level-Differenz (Absorb/Analyze, implementiert)
```
Multiplikator = clamp( (Entitäts-Level / Skill-Level)^1,5 ; 0,05 ; 4,0 )
```
Schwache Wesen geben für hohe Skills kaum XP, starke Wesen einen Bonus.
**Begründung (rekonstruiert aus balance.ts, bitte bestätigen):** Spieler sollen sich stärkeren Wesen stellen statt schwache zu farmen. Untergrenze 0,05, damit es nie ganz 0 gibt; Obergrenze 4, damit sehr starke Wesen kein exzessives Farming erlauben.

### Levelaufstieg durch Nutzung (implementiert, v0.4)

~~Jeder aktive Einsatz eines Skills im Kampf: +1 XP.~~ [VERWORFEN] → XP richtet sich nach der Wirkung:

| Skill | XP pro Einsatz | Skaliert mit Gegner-Level |
|-------|----------------|---------------------------|
| Angriffsskills (Biss, Klaue, …) | angerichteter Schaden in HP | ja |
| Chitin Armor | abgewehrter Schaden in HP | ja |
| Hemolymph | Rückschlag-Schaden in HP | ja |
| Venom | Gift-Schaden in HP | ja |
| Superstrength | 1 pro Treffer | ja |
| Photosynthesis | geheilte HP | nein (kein Gegner beteiligt) |
| Jump | 1 pro Sprung | nein (kein Gegner beteiligt) |

**Skalierung nach Gegner-Level** ([balance.ts](../src/data/balance.ts) `calcCombatXpMultiplier`):
```
Multiplikator = clamp( (Gegner-Level / Skill-Level)^2 ; 0,02 ; 1,5 )
```
Beispiel Skill Lv5: Gegner Lv1 → ×0,04 (kaum XP), Lv3 → ×0,36, Lv5 → ×1, ab Lv7 → ×1,5. Ergebnisse werden gerundet — bei kleinen Beträgen gegen viel zu schwache Gegner gibt es dadurch 0 XP. Ein verfehlter Angriff gibt keine XP.

**Vorgabe (Entwickler):** Skill-Nutzung gegen Gegner mit zu niedrigem Level gibt keine oder nur sehr wenig Erfahrung.
**Begründung (Entwickler):** Es soll balancierbar sein, wie sich Erfahrung auswirkt.
**Begründung Parameter (Vorschlag Claude):** Eigene Kurve, getrennt von Absorb/Analyze, damit beide unabhängig abgestimmt werden können. Exponent 2 ist steiler als bei Absorb (1,5), weil Kampf-XP sehr viel häufiger anfällt; aus demselben Grund ist der Bonus für starke Gegner mit 1,5 deutlich kleiner als bei Absorb (4).
> Begründung offen — Werte noch nicht im Spiel abgestimmt.

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

### 7.1 Skill-Kapazität und Verlernen

> Status: Diskussion — konkretisiert die Vergessen-Mechanik oben. Mathematik und Optionen: [GDD-08 Abschnitt 18](GDD-08-Progressionsmathematik.md#18-skill-kapazität-und-verlernen).

**Überlegung (Entwickler):**
- Der Blob hat nur eine begrenzte Kapazität für Fähigkeiten. Lernt er Neues, verlernt er dafür Altes.
- Durch kontinuierliches Spielen kann die Kapazität leicht erweitert oder überschritten werden. In Spielpausen sinkt sie wieder auf das Normalmaß.
- Verlerntes wird schneller wieder erlernt, z. B. doppelt so schnell.

**Begründung (Entwickler):** Es ist plausibel, dass ein Wesen nur eine begrenzte Kapazität hat, Fähigkeiten anzuhäufen.

Biologisch passend: *Physarum* verliert eine erlernte Gewöhnung, wenn der Reiz etwa zwei Tage fehlt (GDD-08 Abschnitt 18.1).

Offen: Was belegt Kapazität, welcher Skill wird verlernt, ob Überdehnung und Pausen in echter Zeit oder in Spielzeit gemessen werden, und was beim Absinken der Kapazität passiert.

---

*Letzte Aktualisierung: v0.4 — Skill-Kapazität und Verlernen als Überlegung des Entwicklers (Abschnitt 7.1); Verweis auf GDD-08 (Progressionsmathematik) in Abschnitt 4; Größe beim Absorbieren/Analysieren als Konzept (Abschnitt 1.4); XP-Skalierung (Absorb/Analyze und Kampf-XP nach Gegner-Level) mit Begründungen dokumentiert, Erfolgsformel als vorläufig vermerkt, Superstrength-Beschreibung korrigiert (Oktober 2026)*
