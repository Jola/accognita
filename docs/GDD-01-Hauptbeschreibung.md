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
| Entwicklungsstand | v0.3 — Kampfsystem, Speichersystem, Touch-Joystick, große prozedurale Welt implementiert |

---

## 1. Kernidee

Der Spieler verkörpert einen **Blob** (*Physarum polycephalum*), der sich durch das Absorbieren und Analysieren von Lebewesen, Pflanzen und Umgebungsobjekten weiterentwickelt. Jede Interaktion mit der Welt ist eine potenzielle Skill-Discovery. Das Spiel dreht sich nicht um Kampf allein, sondern um **Wissen sammeln, kombinieren und transformieren**.

> *"Was ich berühre, werde ich. Was ich verstehe, beherrsche ich."*

---

## 2. Der Blob — Biologische Grundlage

Der Protagonist ist dem realen Organismus *Physarum polycephalum* nachempfunden — einem gelben Schleimpilz, der trotz fehlenden Gehirns erstaunliche Intelligenz zeigt.

### Wissenschaftlicher Hintergrund (Spielgrundlage)

| Merkmal | Realität | Spielmechanik |
|---------|----------|---------------|
| **Intelligenz ohne Gehirn** | Findet in Labyrinthen den kürzesten Weg zu Nahrung, lernt dazu | Blob entdeckt und kombiniert Skills durch Interaktion |
| **Wachstum** | Verdoppelt seine Größe unter idealen Bedingungen innerhalb eines Tages | Blob wächst mit jedem Level, Welt wirkt kleiner |
| **Wissensübertragung** | Wenn zwei Blobs verschmelzen, geben sie erworbene Informationen weiter | Absorb-Mechanic überträgt Skills absorbierter Entities |
| **Widerstandsfähigkeit** | Trocknet bei Gefahr aus, Ruhezustand — mit Wasser wieder erweckbar | Checkpoint-System: Blob erwacht nach Tod am Spawn |
| **Lebensraum** | Schattige, feuchte Orte, verrottendes Holz, Laub | Blob beginnt im Wald, erkundet feuchte und dunkle Biome zuerst |
| **Geschlechter** | Über 720 biologische Geschlechter | Keine direkte Spielmechanik — Teil der Lore |
| **Unsterblichkeit** | Gilt als biologisch unsterblich | Blob respawnt immer — kein permanenter Tod |
| **Taxonomie** | Kein Tier, keine Pflanze — gehört zur Gruppe der Myxogastria | Blob passt in keine Klasse; sein Build entsteht aus gesammelten Skills |

### Atmosphärische Konsequenz

Der Blob ist **kein klassischer Fantasy-Held**. Er hat keine Vergangenheit, keine Klasse, keine vorbestimmte Rolle. Sein Wachstum *ist* die Geschichte. Was er berührt, absorbiert er — und wird dadurch mehr.

---

## 3. Alleinstellungsmerkmale (USPs)

- **Dual-Interaction-System**: Jedes Entity kann entweder *absorbiert* (zerstört, starke Belohnung) oder *analysiert* (bleibt erhalten, schwache Belohnung) werden — der Spieler entscheidet strategisch.
- **Organisches Skill-Discovery**: Skills werden nicht durch Menus freigeschaltet, sondern durch echte Interaktion mit der Spielwelt entdeckt. Gleiches Entity mehrfach absorbieren/analysieren = höheres Level.
- **Kombinations-Magie**: Zwei entdeckte Skills können zu einem neuen Skill kombiniert werden. Die Kombinations-Rezepte sind anfangs unbekannt und müssen experimentell erforscht werden.
- **Lebendige Welt**: Entities sind keine statischen Gegner sondern Teil eines Ökosystems. Pflanzen, Tiere, Monster — alle haben Skills die der Blob erlernen kann.

---

## 4. Setting & Atmosphäre

- **Epoche**: Mittelalterliche Fantasywelt. Keine modernen Elemente.
- **Ton**: Abenteuerlich, neugierig, mit wachsender Bedrohung. Kein reines Kinderspiel, aber nicht grimdark.
- **Welt**: Wälder, Ruinen, Höhlen, Dörfer, magische Zonen. Die Welt ist größer als der Spieler und wartet darauf, entdeckt zu werden.
- **Der Protagonist**: Ein kleiner, unscheinbarer Blob ohne Vergangenheit. Sein Wachstum *ist* die Geschichte.

---

## 5. Core Game Loop

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

## 6. Ansichten (Views)

### View 1: Top-Down (Standard)
- Klassische Vogelperspektive
- Ideal für Erkundung, Interaktion, Übersicht
- Chunk-basierte Tilemap-Welt: 20×20 Chunks = 20480×20480px, 6 Biome, Pixel-Art-Tiles (32×32px, prozedural generiert)
- Blob bewegt sich frei in alle Richtungen (virtueller Joystick auf Mobile)

### View 2: Isometrisch 2.5D (Dungeon-Modus / geplant)
- Für Dungeons, Ruinen, geschlossene Räume
- Mehr Tiefe und Atmosphäre
- Gleiche Spielmechaniken, andere Darstellung
- Perspektivenwechsel geschieht beim Betreten bestimmter Gebiete

---

## 7. Progression & Entwicklungspfade

Der Blob entwickelt sich nicht linear. Es gibt **keine fixe Klasse**. Die Entwicklung ergibt sich aus den gesammelten Skills:

| Skill-Kombination | Entwicklungsrichtung |
|-------------------|---------------------|
| Viele Kampfskills | Aggression / Krieger-Blob |
| Viele Magieskills | Zauberer-Blob |
| Gift + Analyse | Forscher / Alchemisten-Blob |
| Schatten + Geschwindigkeit | Assassinen-Blob |
| Licht + Heilung | Unterstützer-Blob |

Diese Pfade sind **nicht exklusiv** — der Spieler kann hybride Builds entwickeln.

---

## 8. Referenzdateien

| Datei | Inhalt |
|-------|--------|
| GDD-01-Hauptbeschreibung.md | Diese Datei — Vision, Loop, Setting |
| GDD-02-Skillsystem.md | Alle Skill-Mechaniken, Kombinationen, Leveling |
| GDD-03-Kampfsystem.md | Kampfmechaniken, Gegner, Balance |
| GDD-04-LookAndFeel.md | Visuelles Design, UI/UX, Audio-Richtlinien |

---

*Letzte Aktualisierung: v0.3 — Protagonist von „Slime" zu „Blob" (Physarum polycephalum) umbenannt, biologische Grundlagen ergänzt (März 2026)*
