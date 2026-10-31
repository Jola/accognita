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

[VERWORFEN] Beide Kern-Fähigkeiten haben ein eigenes Level (Start: Level 1) und steigen durch wiederholten Einsatz auf.
Das Level der Kern-Fähigkeit bestimmt, wie hoch die Erfolgswahrscheinlichkeit gegen stärkere Entitäten ist.

**Neu (Abschnitt 8):** Analyze und Absorb sammeln wie alle Skills nur Erfahrung. Ihr Übungsgrad bestimmt die Erfolgswahrscheinlichkeit. Sie belegen keine Kapazität und werden nie verlernt (Abschnitt 8.4).

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

> ~~**Status: Konzept** — Noch nicht implementiert.~~ [VERWORFEN]
> **Status: Teilweise implementiert (v0.3)** — `MaterialSystem.ts` und `materials.ts` (7 Materialien) existieren, Absorb legt Materialien ins Inventar, der INVENTAR-Tab zeigt sie. Bisher liefert nur Gras Material (Pflanzenfasern); die einzige Verwendung (`grow`) ist nicht erreichbar, weil der Skill fehlt (Abschnitt 8.10).

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
| Ameise | 1 | neutral | creature | Biss (12%), Chitin Armor (15%), Superstrength (10%) |
| Marienkäfer | 1 | neutral | creature | Hemolymph (15%) |
| Springspinne | 2 | hostile | creature | Biss (15%), Jump (20%), Chitin Armor (10%) |
| Giftspinne | 2 | hostile | creature | Biss (15%), Venom (20%), Chitin Armor (8%) |

#### Skills

| Skill-ID | Name | Typ | Element | Icon | Quellen | Beschreibung |
|----------|------|-----|---------|------|---------|--------------|
| chitin_armor | Chitin Armor | passiv | earth | 🛡️ | Ameise, Springspinne, Giftspinne | Reduziert physischen Schaden |
| superstrength | Superstrength | passiv | none | 💪 | Ameise | ~~Erhöht Material-Ausbeute bei Absorb~~ [VERWORFEN] → verstärkt Nahkampfschaden (×1,30 + 0,05/Level) — Begründung im `reasoning` des Skills |
| venom | Venom | passiv | poison | 🕷️ | Giftspinne | Treffer vergiften Ziel (DoT-Chance) |
| jump | Jump | aktiv | none | 🦘 | Springspinne | **Bewegungs-Unlock**: Ohne diesen Skill kann der Blob nicht springen. Höheres Level = größere Sprunghöhe/-weite. |
| hemolymph | Hemolymph | passiv | poison | 🐞 | Marienkäfer | Bei eigenem Treffer: Angreifer vergiftet |

~~Alle Basis-Skills haben `maxLevel: 0` (unlimitiert).~~ [VERWORFEN] → Skills haben keine Level, nur Erfahrung; je Skill gibt es einen Lernaufwand (`learningEffort`, Abschnitt 8.3). XP-Skalierung via Option D (`balance.ts`).

Weitere Einheiten (Skorpione, Schlange, Drache) und alle aktuellen Werte: im Spiel unter 📋 → INDEX.

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
> **Level und XP-Schwellen [VERWORFEN] — ersetzt durch Abschnitt 8 (Erfahrung statt Level).** Weiter gültig: wofür es wie viel XP gibt (Tabellen unten) und die Skalierung nach Gegner-Level; „Skill-Level“ ist dort jetzt der stetige Übungsgrad.

Mathematische Analyse der Kurven und Alternativen (Status: Diskussion): [GDD-08 Progressionsmathematik](GDD-08-Progressionsmathematik.md).

### Levelaufstieg durch Entdeckung (Wiederholung)
- Bekannter Skill wird durch Absorb/Analyze erneut entdeckt → Skill-XP.
- Absorb: +3 XP, Analyze: +1 XP.
- [VERWORFEN] XP-Schwelle pro Level: `xpNeeded = floor(baseXpThreshold * 1.5^(level-1))` → Abschnitt 8.3

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
- [VERWORFEN] Zeigt alle entdeckten Skills mit Level, XP-Fortschritt, Beschreibung.
- Zeigt alle entdeckten Skills mit Rang, Erfahrungsbalken im Rang (mit Abschnitt für ausstehende Erfahrung, Abschnitt 8.7), XP bis zum nächsten Rang, Beschreibung.
- HUD: statt Charakter-Level die belegte Kapazität in Prozent; goldener Balken und „↑“ bei Überdehnung.
- Kern-Fähigkeiten (Analyze, Absorb) werden separat als immer verfügbar angezeigt.
- Farbcodierung nach Element.

---

## 7. Geplante Erweiterungen

- **Passive Skills**: Automatisch wirkende Skills (z.B. Regeneration aus Pflanze).
- **Transformation-Skills**: Bei genug Skills eines Elements optische Veränderung.
- **Vergessen-Mechanik**: Skill-Limit erzwingt Auswahl. → umgesetzt als Kapazität (Abschnitt 8.4)
- **Grow / Wachsen** (Idee Entwickler, für später — Abschnitt 8.10): ein Skill, mit dem der Blob über Spielzeit und unter Verbrauch von Ressourcen (z. B. Pflanzenfasern, Zellmaterial) wächst.
- **Skill-Synergie**: Bestimmte Skills verstärken sich gegenseitig.
- **Leveling durch Kampf**: Skill-XP durch aktiven Einsatz im Kampf (v0.3).
- **Material-Crafting**: Materialien für mehr als nur `grow` verwenden (v0.3+).

### 7.1 Skill-Kapazität und Verlernen

> Status: Diskussion — konkretisiert die Vergessen-Mechanik oben. Mathematik und Optionen: [GDD-08 Abschnitt 18](GDD-08-Progressionsmathematik.md#18-skill-kapazität-und-verlernen).

**Überlegung (Entwickler):**
- Der Blob hat nur eine begrenzte Kapazität für Fähigkeiten. Lernt er Neues, verlernt er dafür Altes.
- Durch kontinuierliches Spielen kann die Kapazität leicht erweitert oder überschritten werden. ~~In Spielpausen sinkt sie wieder auf das Normalmaß.~~ [VERWORFEN] → sinkt nur während der Spielzeit wieder (Abschnitt 8.5).
- Verlerntes wird schneller wieder erlernt, z. B. doppelt so schnell.

**Begründung (Entwickler):** Es ist plausibel, dass ein Wesen nur eine begrenzte Kapazität hat, Fähigkeiten anzuhäufen.

Biologisch passend: *Physarum* verliert eine erlernte Gewöhnung, wenn der Reiz etwa zwei Tage fehlt (GDD-08 Abschnitt 18.1).

~~Offen: Was belegt Kapazität, welcher Skill wird verlernt, ob Überdehnung und Pausen in echter Zeit oder in Spielzeit gemessen werden, und was beim Absinken der Kapazität passiert.~~ → entschieden und umgesetzt in Abschnitt 8.
---

## 8. Erfahrung statt Level

> **Status: Implementiert (v0.4, Oktober 2026)** — alle Zahlenwerte VORLÄUFIG.
> Code: Stellschrauben und Begründungen in [`src/data/progression.ts`](../src/data/progression.ts), Rechenregeln in [`src/systems/ProgressionSystem.ts`](../src/systems/ProgressionSystem.ts) (gleiche Abschnittsnummern 1–6). Mathematik und Varianten: [GDD-08 Teil 6](GDD-08-Progressionsmathematik.md#teil-6--erfahrung-statt-level-umsetzung).

### 8.1 Grundsatz

**Vorgabe (Entwickler):** Es gibt keine Level mehr — weder für Skills noch für den Charakter. Jeder Skill hat nur Erfahrung.
**Begründung (Entwickler):** Level wirken wie eine unnatürliche Einheit.

**Vorgabe (Entwickler):** Charakter-Attribute wie Stärke, Geschick oder Intelligenz kommen ausschließlich aus den einzelnen Skills.
Im Code ist das schon so: Geschick kommt aus Sprung, Stärke aus Superstrength. Es gibt keine eigenen Attributwerte.

### 8.2 Ränge (nur Anzeige)

~~**Vorgabe (Entwickler):** Die Erfahrungsskala wird in benannte Abschnitte geteilt: Neuling · Anfänger · Geübt · Könner · Profi · Experte · Meister.~~ [VERWORFEN, 31. Oktober 2026 — Namen ersetzt, siehe unten]

**Vorgabe (Entwickler):** Die Erfahrungsskala wird in benannte Abschnitte geteilt. Namen und Anzahl dürfen noch überarbeitet werden.
**Begründung (Entwickler):** Das macht dem Spieler verständlicher, was die Erfahrung an einem Skill bedeutet.

Ränge ändern keinen Wert, sie beschriften nur den stetigen Fortschritt (Abschnitt 8.3). Die Grenzen sind als Übungsgrad festgelegt. Die nötige Erfahrung folgt daraus je Skill über den Lernaufwand.

| Rang Biologie (aktiv) | Rang Handwerk (Alternative) | ab Übungsgrad | XP Biss (Aufwand 12) | XP Feuerodem (Aufwand 25) |
|---|---|---:|---:|---:|
| Regung | Neuling | 1 | 0 | 0 |
| Versuch | Anfänger | 2 | 6 | 13 |
| Übung | Lehrling | 3 | 24 | 50 |
| Gewohnheit | Geselle | 4,5 | 74 | 153 |
| Routine | Könner | 6 | 150 | 313 |
| Instinkt | Experte | 8 | 294 | 613 |
| Natur | Meister | 10 | 486 | 1013 |

**Begründung (Vorschlag Claude, offen) für die Grenzen:** Jeder Rang dauert länger als der vorige (Biss: 6, 18, 50, 76, 144, 192 XP), bleibt aber erreichbar. Der höchste Rang braucht bei einem einfachen Skill etwa so viel wie die Anfangs-Kapazität mal 2,5, also deutliche Spezialisierung.

**Vorgabe (Entwickler), 31. Oktober 2026:** Beide Namensreihen aus dem Gegenvorschlag übernehmen. Aktiv ist vorerst die Biologie-Reihe, damit Jörn sie im Spiel sieht. Die Handwerk-Reihe steht im Code auskommentiert daneben (`SKILL_RANKS` in `progression.ts`).
**Begründung (Vorschlag Claude, übernommen):**
- „Geübt“ ist ein Adjektiv, die anderen sind Nomen. Einheitlich wäre „Geübter“.
- „Könner“, „Profi“ und „Experte“ lassen sich schwer ordnen. Ist ein Profi besser als ein Könner? „Profi“ meint außerdem eher „bezahlt“ als „gekonnt“.
- **Variante Handwerk** (passt zum mittelalterlichen Setting, die Reihenfolge kennt jeder): Neuling · Anfänger · Lehrling · Geselle · Könner · Experte · Meister.
- **Variante Biologie** (passt zum Schleimpilz, der durch Gewöhnung lernt): Regung · Versuch · Übung · Gewohnheit · Routine · Instinkt · Natur. Gemeint ist: Der Skill ist „zur zweiten Natur geworden“. Das passt thematisch, ist aber weniger sofort verständlich.
- Anzahl: 6–7 Ränge sind gut. Jeder Rang ist dann ein spürbarer Meilenstein, aber nicht so selten, dass Erfolge ausbleiben.

### 8.3 Fließende Wirkung

**Vorgabe (Entwickler):** Die Werte hängen direkt an der Erfahrung, nicht am Rang. Skills verbessern sich in sehr kleinen Schritten fließend statt in Level-Sprüngen.

Aus der Erfahrung folgt stetig der **Übungsgrad** u. Mit ihm werden alle Effekt-Formeln ausgewertet:

```
u(xp) = 1 + ( xp / (Lernaufwand × 0,5) )^(1/2)
xp(u) = Lernaufwand × 0,5 × (u − 1)²
```

u ist kein Level: Er wird nicht angezeigt, springt nie und hat Nachkommastellen.

**Begründung (Vorschlag Claude, offen):**
- u beginnt bei 1 und liegt auf derselben Skala wie die Gegnerwerte. Damit funktionieren alle Formeln und Vergleiche (Erfolgschance, XP-Skalierung) unverändert.
- Exponent 2: Doppelt so viel Wirkungszuwachs kostet vierfache Erfahrung. Das wird schwerer, bleibt aber erreichbar.
- Die alte Kurve (×1,5 je Level) war exponentiell, hohe Werte waren praktisch unerreichbar (GDD-08 Abschnitt 6). Ohne Deckel könnte eine Potenzkurve endlos wachsen; den Deckel liefert jetzt die Kapazität.
- Die Kurve ist konkav. Verteilte Erfahrung bringt in Summe mehr als Spezialisierung, das belohnt Breite.

**Lernaufwand** je Skill (`learningEffort` in skills.ts, früher `baseXpThreshold`) bestimmt, wie viel Erfahrung ein Skill für denselben Fortschritt braucht. Damit bestimmt er auch, wie viel Kapazität der Skill belegt.

Der Schadens-Faktor aktiver Angriffe hatte einen Sprung (+0,15 ab Level 3). [VERWORFEN] Jetzt ist es ein fließender Übergang zwischen u = 2 und u = 3: bei ganzen Zahlen dieselben Werte, dazwischen ohne Sprung.
> Begründung offen — warum es den +0,15-Bonus überhaupt gibt.

### 8.4 Kapazität, Verlernen, Wiedererlernen

**Vorgabe (Entwickler):** Der Charakter hat statt eines Levels eine maximale Skill-Kapazität. Sie begrenzt die Summe der Erfahrung aller Skills. Wird ein Skill an der Grenze weiter trainiert, wird die neue Erfahrung den Skills abgezogen, die am längsten nicht mehr geübt wurden.
**Begründung (Entwickler):** Ein Wesen hat nur eine begrenzte Kapazität, Fähigkeiten anzuhäufen. Lernt es Neues, verlernt es Altes. Das Spiel kann sich so in die Breite entwickeln: Neue Skills kommen hinzu, dafür wird die Kapazität eventuell etwas erweitert.

**Vorgabe (Entwickler):** Gespeichert wird die höchste je erreichte Erfahrung eines Skills. Ist er darunter gesunken, geht das Wiedererlernen bis dorthin doppelt so schnell.

**Vorgabe (Entwickler):** Die Kapazität wächst mit dem Blob. Wie genau, legt Jörn später fest. Sie muss zu den erlernbaren Skills passen.

**Platzhalter (Vorschlag Claude, offen):**
- `Kapazität = 200 + 150 × Wachstum`
- `Wachstum = log2(1 + Lebenserfahrung / 200)`
- Lebenserfahrung = alle je gutgeschriebene Erfahrung, auch verlernte. Das Wachstum ist stetig und schrumpft nie.
- Wachstum entspricht genau dem alten „Charakter-Level − 1“. Größe, HP und MP des Blobs bleiben wie bisher, nur ohne Sprünge.

**Weitere Regeln (Vorschlag Claude, offen):**
- Analyze und Absorb belegen keine Kapazität und werden nie verlernt. Abwägung: Sonst könnte der Blob das Absorbieren vergessen, und der Kern-Spielablauf bräche weg.
- Ein Skill fällt höchstens auf 0 XP und bleibt entdeckt.
- Ein abgeschalteter Passiv-Skill belegt weiter Kapazität. Weil er nicht geübt wird, wird er zuerst verlernt.
- „Am längsten nicht geübt“ wird in Spielzeit gemessen. Bei Gleichstand trifft es den zuerst entdeckten Skill.

### 8.5 Überdehnung

**Vorgabe (Entwickler):** Durch kontinuierliches Spielen kann die Kapazität leicht überschritten werden. Danach sinkt sie wieder auf das Normalmaß, und zwar nur während der Spielzeit. Die Dauer legt Jörn noch fest; gedacht sind einige Stunden oder Tage.
**Begründung (Entwickler):** Wer hart trainiert, soll dafür belohnt werden. Außerdem löst es den „fertigen“ Endgame-Charakter auf: Man bringt nicht einmal alles auf Maximum, verteilt es und hat dann den perfekten Charakter. Stattdessen kann man die Grenzen immer wieder etwas überschreiten, indem man die gewünschten Skills aktiv trainiert, und ist dann für eine gewisse Zeit darin besonders gut.
**Begründung (Vorschlag Claude, übernommen) für „nur Spielzeit“:** Echte Pausen werden nie bestraft, und eine verstellte Geräte-Uhr bringt nichts.

**Umsetzung (Vorschlag Claude, offen):**
- Bis Kapazität +20 % wird nichts sofort verlernt.
- Erst darüber wird sofort von den am längsten nicht geübten Skills abgezogen.
- Der Überhang über der Kapazität schmilzt mit einer Halbwertszeit von 2 Spielstunden ab, ebenfalls bei den am längsten nicht geübten Skills.

### 8.6 Gleiche Skills für Blob und Gegner

**Vorgabe (Entwickler):** Blob und Gegner können dieselben Skills haben, und ein Skill hat immer dieselben Effekte. Ein Skorpion mit Biss auf einer bestimmten Erfahrung macht genauso viel Schaden wie der Blob mit derselben Erfahrung. Unterschiede entstehen nur über Synergien mit anderen Skills oder unter Umständen mit dem Körper. Ein Skill wird einmal definiert und dann mit unterschiedlich viel Erfahrung angewendet.

Umsetzung:
- Gegner tragen in `entities.ts` statt Skill-Leveln ihre Erfahrung (`skillXp`).
- Blob und Gegner rechnen sie mit derselben Funktion in den Übungsgrad um (`ProgressionSystem.getEntitySkillPractice` bzw. `getSkillPractice`).
- Dann werten beide dieselben Formeln aus.
- Die Gegnerwerte wurden 1:1 umgerechnet, ihre Stärke ist unverändert.

**Abweichung, die noch offen ist:** Das Gegner-Aufleveln (`EntityLevelingSystem`, Bonus-Level ×1,25 auf HP, Schaden und Tempo) skaliert Werte unabhängig von den Skills. Das widerspricht der Vorgabe, weil der Biss eines Bonus-Level-Skorpions stärker ist als derselbe Biss beim Blob. Vorschlag zum Klären: Siege geben den Gegnern stattdessen Skill-Erfahrung nach denselben Regeln (siehe TODO.md).

**Idee (Entwickler), für später:** Ein Effekt der Körpergröße, z. B. dass mit wachsender Größe die Stärke prozentual steigt. Das wäre eine Synergie mit dem Körper im Sinne der Vorgabe oben.

### 8.7 Übertraining und Ruhe

**Vorgabe (Entwickler):**
- Wird ein Skill sehr viel trainiert, ist er irgendwann übertrainiert, und jedes weitere Training wirkt sofort immer weniger.
- Der Effekt klingt über die Zeit ab, ausdrücklich auch offline.
- Die zurückgehaltene Erfahrung kommt in der Ruhephase Stück für Stück dazu.
- Der Erfahrungsbalken zeigt sie als andersfarbigen Abschnitt: So weit wird er stehen, wenn der Effekt abgeklungen ist.

**Begründung (Entwickler):** Spieler werden so vom zu vielen Spielen gehemmt und für Pausen belohnt. Außerdem ahmt es echtes Training nach: Nach viel Training braucht der Körper, geistig wie körperlich, eine Ruhephase. In ihr wird das Gelernte zusätzlich verarbeitet und ist danach umso besser abrufbar.

**Umsetzung (Vorschlag Claude, offen):**
- **Ermüdung:** Jeder Skill hat eine Ermüdung (in XP). Jede gewonnene Erfahrung erhöht sie um denselben Betrag.
- **Sofortanteil** = `min(1, Schwelle / Ermüdung)` mit `Schwelle = Lernaufwand × 30`. Biss: 360 XP, etwa 50 Treffer am Stück. Unter der Schwelle wirkt alles sofort, bei doppelter Schwelle die Hälfte. Der Rest ist ausstehende Erfahrung.
- **Ruhe:** Ermüdung und ausstehende Erfahrung halbieren sich alle 3 Stunden Echtzeit; nach einer Nacht ist der Skill zu etwa 85 % erholt. Was abschmilzt, wird gutgeschrieben.
- **Beginn der Ruhe:** Sie beginnt für einen Skill erst 2 Minuten nach seiner letzten Übung. Solange man ihn trainiert, kommt nichts nach.
- **Kein Verlust:** Erfahrung geht nicht verloren, sie kommt nur später. Die Hemmung liegt darin, dass sie beim Weiterspielen nicht sofort wirkt. Eine verstellte Uhr bringt nur Zeit, keine zusätzliche Erfahrung.
- **Wiedererlernen:** Der ×2-Bonus wird vor dem Übertraining angewendet. Ausstehende Erfahrung zählt beim Abstand zum Höchststand schon mit, damit der Bonus nicht doppelt greift.
- **Zusammenspiel:** Überdehnung schmilzt nur in Spielzeit, Ermüdung in Echtzeit. Zusammen bestrafen Pausen nie, sie belohnen nur.
- **Anzeige:** Goldener Abschnitt im Balken, Text „+N in Ruhe“.

Simulation mit Biss bei 7 XP je Treffer und einem Treffer alle 2 s:

| Zeitpunkt | Erfahrung | ausstehend | Sofortanteil |
|---|---:|---:|---:|
| Treffer 50 | 350 | 0 | 100 % |
| Treffer 100 | 600 | 99 | 52 % |
| Treffer 150 | 644 | 302 | 35 % |
| + 3 h Pause | 682 | 152 | — |
| + 24 h Pause | 716 | 1 | — |

Zwischen Treffer 100 und 150 ist die Erfahrung auch durch die Kapazitätsgrenze gebremst. Mit nur einem Skill liegt die Grenze bei 644.

### 8.8 Wo im Code was steht

| Thema | Stellschrauben + Begründung | Rechenregel |
|---|---|---|
| Erfahrung → Übungsgrad | `progression.ts` Abschnitt 1 | `practiceFromXp`, `xpForPractice` |
| Ränge | `progression.ts` Abschnitt 2 (`SKILL_RANKS`) | `getRankInfo`, `rankNameForPractice` |
| Kapazität, Wachstum | `progression.ts` Abschnitt 3 | `calcCapacity`, `calcGrowth`, `enforceHardLimit` |
| Überdehnung | `progression.ts` Abschnitt 4 | `tickProgression` |
| Verlernen, Wiedererlernen | `progression.ts` Abschnitt 5 | `forgetLeastPracticed`, `applyRelearnBonus` |
| Übertraining, Ruhe | `progression.ts` Abschnitt 6 | `immediateShare`, `recover` |
| Gesamtablauf | — | `gainExperience` (Kopfkommentar in `ProgressionSystem.ts`) |
| Wofür es XP gibt | `balance.ts` | `SkillSystem.ts`, `GameScene.ts` |
| Größe, HP, MP | `balance.ts` (`HP_PER_GROWTH` …) | `SkillSystem.updatePlayerGrowth` |
| Alte Spielstände | — | `SaveSystem.ts` Migration 2 → 3 |

### 8.9 Offene Punkte

- **Kapazitätswachstum:** Wie wächst die Kapazität? Der Platzhalter ist die Lebenserfahrung. Denkbar sind auch die Zahl entdeckter Skills, absorbierte Masse oder die Größenklasse (GDD-07).
- **Zahlenwerte:** Kurvenexponent, Ranggrenzen, Kapazität, +20 %, Halbwertszeiten, Übertrainings-Schwelle.
- **Ranknamen:** Biologie oder Handwerk endgültig? (Abschnitt 8.2)
- **Gegner:** Ihre Stärke (`level`) bleibt vorerst eine Zahl für Erfolgschance und XP-Skalierung. Soll auch sie entfallen? Dazu kommt das Gegner-Aufleveln (Abschnitt 8.6).
- **HP und MP:** Sie folgen vorerst dem Wachstum. Sollen sie nach der Vorgabe „Attribute nur aus Skills“ auch aus Skills kommen?
- **Verlernen:** Soll es auf 0 gehen dürfen, oder bleibt ein Rest?
- **Übertraining je Skill oder gesamt:** Je Skill belohnt Abwechslung. Gesamt bremst direkt das „zu viel Spielen“.

### 8.10 Idee (Entwickler): Grow / Wachsen — für später

> Status: Idee, nicht umsetzen ohne Anweisung.

Der Blob bekommt den Skill **Wachsen** (Grow). Mit ihm wächst er über die Zeit und wird größer, wobei er Ressourcen wie Pflanzenfasern oder Zellmaterial verbraucht. „Zeit“ meint Spielzeit.

Bezug zum Code:
- `MaterialSystem.useGrow` gibt es schon: sofort +HP gegen 5 Pflanzenfasern.
- Der Skill `grow` fehlt in `skills.ts`, deshalb ist das bisher nicht erreichbar.
- Passt zu „Kapazität wächst mit dem Blob“ (Abschnitt 8.4): Wachsen könnte der Weg sein, auf dem Größe und Kapazität steigen.

---

*Letzte Aktualisierung: v0.4 — Abgleich mit dem Code: Material-System als teilweise implementiert (Abschnitt 2), Biss in den Quellen-Skills der Insekten ergänzt und `maxLevel` als verworfen markiert (Abschnitt 3.1) (31. Oktober 2026); davor Rangnamen: Biologie-Reihe aktiv, Handwerk-Reihe als Alternative (Abschnitt 8.2, 31. Oktober 2026); davor Erfahrung statt Level umgesetzt (Abschnitt 8: Ränge, fließende Wirkung, Kapazität, Überdehnung, Wiedererlernen, gleiche Skills für Blob und Gegner, Übertraining, Idee Grow); alte Level-Regeln in 1.2, 4, 6, 7.1 als [VERWORFEN] markiert (30. Oktober 2026). Davor: Skill-Kapazität und Verlernen als Überlegung des Entwicklers (Abschnitt 7.1); Verweis auf GDD-08 (Progressionsmathematik) in Abschnitt 4; Größe beim Absorbieren/Analysieren als Konzept (Abschnitt 1.4); XP-Skalierung (Absorb/Analyze und Kampf-XP nach Gegner-Level) mit Begründungen dokumentiert, Erfolgsformel als vorläufig vermerkt, Superstrength-Beschreibung korrigiert (Oktober 2026)*
