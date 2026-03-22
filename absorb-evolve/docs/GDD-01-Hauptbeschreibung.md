# ABSORB & EVOLVE — Game Design Document
## Datei 01: Hauptbeschreibung & Vision

---

### Metadaten
| Feld | Wert |
|------|------|
| Arbeitstitel | Absorb & Evolve |
| Genre | Action-RPG / Progression RPG |
| Perspektive | Top-Down 2D (primär), Isometrisch 2.5D (sekundär, geplant v0.4) |
| Setting | Medieval Fantasy |
| Zielplattform | Browser (HTML5/Canvas), Single-File, kein Server nötig |
| Entwicklungsstand | v0.2 — Modulare Architektur, Skill-System implementiert |
| Inspirationsquelle | "That Time I Got Reincarnated as a Slime" (Anime/Manga) |

---

## 1. Kernidee

Der Spieler verkörpert einen Schleim (Slime), der sich durch das Absorbieren und Analysieren von Lebewesen, Pflanzen und Umgebungsobjekten weiterentwickelt. Jede Interaktion mit der Welt ist eine potenzielle Skill-Discovery. Das Spiel dreht sich nicht um Kampf allein, sondern um **Wissen sammeln, kombinieren und transformieren**.

Das Spiel ist **keine direkte Kopie** der Anime-Vorlage, sondern ein eigenständiges Konzept das folgende Kernidee übernimmt:

> *"Was ich berühre, werde ich. Was ich verstehe, beherrsche ich."*

---

## 2. Alleinstellungsmerkmale (USPs)

- **Dual-Interaction-System**: Jedes Entity kann entweder *absorbiert* (zerstört, starke Belohnung) oder *analysiert* (bleibt erhalten, schwache Belohnung) werden — der Spieler entscheidet strategisch.
- **Organisches Skill-Discovery**: Skills werden nicht durch Menus freigeschaltet, sondern durch echte Interaktion mit der Spielwelt entdeckt. Gleiches Entity mehrfach absorbieren/analysieren = höheres Level.
- **Kombinations-Magie**: Zwei entdeckte Skills können zu einem neuen Skill kombiniert werden. Die Kombinations-Rezepte sind anfangs unbekannt und müssen experimentell erforscht werden.
- **Lebendige Welt**: Entities sind keine statischen Gegner sondern Teil eines Ökosystems. Pflanzen, Tiere, Monster — alle haben Skills die der Slime erlernen kann.

---

## 3. Setting & Atmosphäre

- **Epoche**: Mittelalterliche Fantasywelt. Keine modernen Elemente.
- **Ton**: Abenteuerlich, neugierig, mit wachsender Bedrohung. Kein reines Kinderspiel, aber nicht grimdark.
- **Welt**: Wälder, Ruinen, Höhlen, Dörfer, magische Zonen. Die Welt ist größer als der Spieler und wartet darauf, entdeckt zu werden.
- **Der Protagonist**: Ein kleiner, unscheinbarer Schleim ohne Vergangenheit. Sein Wachstum *ist* die Geschichte.

---

## 4. Core Game Loop

```
ERKUNDEN
    ↓
Entity entdecken (Tier, Pflanze, Monster, Objekt)
    ↓
ENTSCHEIDUNG: Absorbieren (Entity weg) vs. Analysieren (Entity bleibt)
    ↓
Skill wird entdeckt oder im Level erhöht
    ↓
Skills kombinieren → neue Skills freischalten
    ↓
Stärker werden → neue Gebiete zugänglich
    ↓
ERKUNDEN (auf neuem Niveau)
```

---

## 5. Ansichten (Views)

### View 1: Top-Down (Standard)
- Klassische Vogelperspektive
- Ideal für Erkundung, Interaktion, Übersicht
- Tilemap-basierte Welt mit organischen Texturen
- Slime bewegt sich frei in alle Richtungen

### View 2: Isometrisch 2.5D (Dungeon-Modus / geplant)
- Für Dungeons, Ruinen, geschlossene Räume
- Mehr Tiefe und Atmosphäre
- Gleiche Spielmechaniken, andere Darstellung
- Perspektivenwechsel geschieht beim Betreten bestimmter Gebiete

---

## 6. Progression & Entwicklungspfade

Der Slime entwickelt sich nicht linear. Es gibt **keine fixe Klasse**. Die Entwicklung ergibt sich aus den gesammelten Skills:

| Skill-Kombination | Entwicklungsrichtung |
|-------------------|---------------------|
| Viele Kampfskills | Aggression / Krieger-Slime |
| Viele Magieskills | Zauberer-Slime |
| Gift + Analyse | Forscher / Alchemisten-Slime |
| Schatten + Geschwindigkeit | Assassinen-Slime |
| Licht + Heilung | Unterstützer-Slime |

Diese Pfade sind **nicht exklusiv** — der Spieler kann hybride Builds entwickeln.

---

## 7. Referenzdateien

| Datei | Inhalt |
|-------|--------|
| GDD-01-Hauptbeschreibung.md | Diese Datei — Vision, Loop, Setting |
| GDD-02-Skillsystem.md | Alle Skill-Mechaniken, Kombinationen, Leveling |
| GDD-03-Kampfsystem.md | Kampfmechaniken, Gegner, Balance |
| GDD-04-LookAndFeel.md | Visuelles Design, UI/UX, Audio-Richtlinien |

---

*Letzte Aktualisierung: v0.2 — Entwicklungsstand und Plattformangabe aktualisiert (März 2026)*
