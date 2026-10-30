# ABSORB & EVOLVE — Game Design Document
## Datei 00: Index & Meta-Dokumentation

---

## 1. Zweck dieser Datei

Diese Datei ist der **Einstiegspunkt für Menschen und KI-Systeme**, die mit den GDD-Dokumenten arbeiten. Sie beschreibt die Struktur, den Zweck und die Konventionen aller Projektdateien — und wie sie korrekt gelesen, genutzt und aktualisiert werden sollen.

**Beim Start einer neuen Session immer zuerst diese Datei lesen.**

---

## 2. Projektübersicht

| Feld | Wert |
|------|------|
| Projektname | Absorb & Evolve |
| Typ | Browser-basiertes Action-RPG |
| Aktueller Stand | v0.3 (spielbar, große prozedurale Welt mit Pixel-Art-Tiles, Kampfsystem, Speichersystem) |
| Hauptentwickler | Jörn |
| KI-Assistent | Claude (Anthropic) |
| Arbeitssprache | Deutsch (Kommunikation), Englisch (Code & Dateinamen) |

---

## 3. Dateistruktur

| Datei | Inhalt | Wann konsultieren |
|-------|--------|-------------------|
| **[GDD-00-Index.md](GDD-00-Index.md)** | Diese Datei. Struktur, Konventionen, Meta. | Immer zuerst |
| **[GDD-01-Hauptbeschreibung.md](GDD-01-Hauptbeschreibung.md)** | Vision, Kernidee, Core Game Loop, Setting, Perspektiven, Progressionspfade | Bei Fragen zur Spielidee, zum Genre, zur Gesamtstruktur |
| **[GDD-02-Skillsystem.md](GDD-02-Skillsystem.md)** | Alle Skill-Mechaniken, Absorb/Analyze, Leveling, Kombinationen, Rezepte | Bei Fragen zu Skills, Entdeckung, Kombination, Balancing |
| **[GDD-03-Kampfsystem.md](GDD-03-Kampfsystem.md)** | Kampfablauf, Gegnertypen, Schadenformeln, Status-Effekte, Tod-Mechanik | Bei Fragen zu Kämpfen, Gegnern, Balance, Spieler-Werten |
| **[GDD-04-LookAndFeel.md](GDD-04-LookAndFeel.md)** | Farbpalette, Typografie, UI-Layout (Mobile + Desktop), Touch-Controls, Animationen, Audio, Tech-Stack | Bei Fragen zu Design, UI, Grafik, Sound, Technologie, Plattform |
| **[GDD-05-Kampfmathematik.md](GDD-05-Kampfmathematik.md)** | Schadenstypen-Taxonomie, 8-stufige Damage-Pipeline, Verteidigungsmodell, SkillEffect-Deklarationssystem, LinearFormula, Beispiel-Konfigurationen, Migrations-Strategie v0.3→v0.4 | Bei Fragen zur Kampfmathematik, Skill-Balancing, Schadensformeln, neuen Skills/Entities konfigurieren |
| ~~GDD-06-Referenz.md~~ **[VERWORFEN]** | War eine generierte Markdown-Referenz aller Skills und Einheiten. Ersetzt durch den **INDEX-Tab im Spielmenü** ([src/ui/IndexView.ts](../src/ui/IndexView.ts), beschrieben in [GDD-04](GDD-04-LookAndFeel.md)) | Ist-Werte im Spiel unter 📋 → INDEX nachschlagen |
| **[GDD-07-Bestiarium.md](GDD-07-Bestiarium.md)** | Entwurf: ca. 100 Einheiten auf dem Weg vom Wald in die Stadt, Größenklassen G1–G8, Skill-Ideen (Status: Diskussion) | Beim Entwerfen neuer Einheiten und Skills |
| **[GDD-08-Progressionsmathematik.md](GDD-08-Progressionsmathematik.md)** | Teil 1: Mathematik des Skill- und Charakter-Levelings (Kurvenfamilien, proportionale Erfahrung vs. Level-Differenz-Multiplikator, Integer-Grenzen, Vergleich mit anderen Spielen, Zwei-Exponenten-Modell). Teil 2: Wirkungskurven pro Level, Wahrscheinlichkeiten (Trefferstufen, Gift, Skill-Fund), Wechselwirkungen (Geschick, Stapelregeln, Schwellen). Teil 3: unendliches Leveln mit linearer Skala und %-Anzeige (Status: Diskussion) | Bei Fragen zu XP-Kurven, Level-Tempo, Skill-Stärke pro Level, Zufall und Skill-Synergien |
| **slime-rpg.html** | [VERWORFEN] Ursprünglicher Vanilla-JS-Prototype v0.1 — nicht mehr aktiv gepflegt | Nur als historische Referenz |
| **accognita.html** | Aktuelles Spiel v0.3 — Single-File-Build, per Doppelklick öffenbar oder via GitHub Pages | Als Referenz für implementierte Mechaniken |
| **[src/types/Skill.ts](../src/types/Skill.ts)** | TypeScript-Interfaces: SkillDefinition, SkillInstance, DiscoveryResult | Beim Erweitern des Skill-Systems |
| **[src/types/Entity.ts](../src/types/Entity.ts)** | TypeScript-Interfaces: EntityDefinition, EntityInstance | Beim Erweitern von Entities |
| **[src/types/GameState.ts](../src/types/GameState.ts)** | Zentraler GameState, PlayerState, WorldState | Bei State-Fragen |
| **[src/types/Combat.ts](../src/types/Combat.ts)** | AttackType, StatusEffect, AttackResult, AiFrame | Bei Kampfsystem-Fragen |
| **[src/types/Material.ts](../src/types/Material.ts)** | Material und Loot-Drop-Interfaces | Beim Erweitern des Loot-Systems |
| **[src/data/skills.ts](../src/data/skills.ts)** | Alle Skill-Definitionen und Balancing-Werte | Beim Balancing |
| **[src/data/entities.ts](../src/data/entities.ts)** | Alle Entity-Definitionen | Beim Hinzufügen von Entities |
| **[src/data/materials.ts](../src/data/materials.ts)** | Alle Material-/Loot-Definitionen | Beim Balancing von Drops |
| **[src/data/balance.ts](../src/data/balance.ts)** | Zentrale Balancing-Konstanten (XP-Kurven, Schaden usw.) | Beim Balancing |
| **[src/systems/SkillSystem.ts](../src/systems/SkillSystem.ts)** | Reine Skill-Logik (kein Phaser) | Bei Skill-Logik-Fragen |
| **[src/systems/EntitySystem.ts](../src/systems/EntitySystem.ts)** | Absorb/Analyze/Respawn-Logik (kein Phaser) | Bei Interaktions-Logik-Fragen |
| **[src/systems/CombatSystem.ts](../src/systems/CombatSystem.ts)** | Schadensberechnung, Skill-Dispatch, Checkpoint-Logik | Bei Kampfsystem-Fragen |
| **[src/systems/HitSystem.ts](../src/systems/HitSystem.ts)** | Treffer-Stufen (verfehlt bis kritisch): Wahrscheinlichkeiten aus Skill-Profil, Level und Geschick; Würfeln | Bei Fragen zu Treffer-Chancen |
| **[src/systems/AiSystem.ts](../src/systems/AiSystem.ts)** | Aggro, Verfolgung, Angriffs-Trigger (kein Phaser) | Bei KI-Fragen |
| **[src/systems/StatusEffectSystem.ts](../src/systems/StatusEffectSystem.ts)** | DoT/HoT/Aura, passive Skills | Bei Status-Effekt-Fragen |
| **[src/systems/MaterialSystem.ts](../src/systems/MaterialSystem.ts)** | Loot-Drop-Auflösung, Material-Inventar | Beim Erweitern des Loot-Systems |
| **[src/systems/SaveSystem.ts](../src/systems/SaveSystem.ts)** | Speichern/Laden via localStorage (3 Slots), Migration alter Spielstände (`SAVE_VERSION` + `MIGRATIONS`) | Bei Speicher-Fragen |
| **[src/ui/Joystick.ts](../src/ui/Joystick.ts)** | Virtueller Joystick (DOM, kein Phaser) | Bei Touch-Input-Fragen |
| **[src/ui/SkillBar.ts](../src/ui/SkillBar.ts)** | Touch-Skill-Slots mit Cooldown-Anzeige | Bei UI-Fragen |
| **[src/ui/SkillMenu.ts](../src/ui/SkillMenu.ts)** | Vollbild-Skill-Management-Overlay | Bei UI-Fragen |
| **[src/ui/SaveMenu.ts](../src/ui/SaveMenu.ts)** | Speicher-/Lade-Slot-Overlay | Bei Speicher-UI-Fragen |
| **[src/scenes/GameScene.ts](../src/scenes/GameScene.ts)** | Phaser-Scene: Rendering, Input, UI-Bridge | Bei Rendering/Input-Fragen |
| **[src/world/Chunk.ts](../src/world/Chunk.ts)** | Typen: BiomeId, HeightLevel, ChunkDef, LoadedChunk, SpawnDef | Bei Welt-System-Fragen |
| **[src/world/BiomeDefinitions.ts](../src/world/BiomeDefinitions.ts)** | Zonen-Layout, Spawn-Tabellen, Tile-Index-Mapping | Bei Biom-Fragen |
| **[src/world/WorldGenerator.ts](../src/world/WorldGenerator.ts)** | `generateChunk(cx, cy)` — deterministisch | Bei Welt-Generierungs-Fragen |
| **[src/world/TilesetGenerator.ts](../src/world/TilesetGenerator.ts)** | Prozedurales Pixel-Art-Tileset (24 Tiles, Canvas 2D) | Bei Tile-Fragen |
| **[src/world/ChunkManager.ts](../src/world/ChunkManager.ts)** | Chunk-Laden/-Entladen, Entity-Lifecycle, KI-Radius-Filterung | Bei Performance-/Welt-Fragen |

---

## 4. Zusammenhang der Dokumente

```
GDD-00 (Index)
    │
    ├── GDD-01 (Was ist das Spiel?)
    │       └── definiert den Rahmen für alle anderen Dokumente
    │
    ├── GDD-02 (Skill-System)
    │       └── baut auf dem Core Loop aus GDD-01 auf
    │
    ├── GDD-03 (Kampfsystem)
    │       ├── nutzt Skills aus GDD-02 als Grundlage
    │       └── Tod-Mechanik referenziert GDD-01 Abschnitt 10
    │
    ├── GDD-04 (Look & Feel)
    │       └── beschreibt wie GDD-01 bis 03 visuell umgesetzt werden
    │
    ├── GDD-05 (Kampfmathematik)
    │       ├── setzt GDD-02 (Skill-Konzepte) und GDD-03 (Kampfablauf) voraus
    │       └── definiert Zielformat für src/data/skills.ts und src/data/entities.ts
    │
    ├── GDD-06 (Referenz) — [VERWORFEN], ersetzt durch INDEX-Tab im Spielmenü
    │
    ├── GDD-07 (Bestiarium) — Entwurf neuer Einheiten, nutzt GDD-02 (Skills) und GDD-03 (Gegner)
    │
    └── GDD-08 (Progressionsmathematik) — XP-Kurven, Level-Tempo, Wirkung pro Level, Zufall, Wechselwirkungen; vertieft GDD-02 Abschnitt 4 und GDD-05
```

**Abhängigkeitsregel**: Änderungen an GDD-01 können alle anderen Dokumente betreffen. Änderungen an GDD-02 betreffen GDD-03 und GDD-05. GDD-04 ist weitgehend unabhängig. GDD-05 ist die mathematische Grundlage für alle Kampf-Implementierungen.

---

## 5. Status-Konventionen

Jede Datei und jeder Abschnitt kann einen dieser Status haben:

| Status | Bedeutung |
|--------|-----------|
| **Implementiert** | Im Prototype vorhanden und funktionsfähig |
| **Konzept** | Beschlossen, aber noch nicht gebaut |
| **Diskussion** | Noch nicht entschieden, Optionen offen |
| **Geplant (vX.Y)** | Für eine bestimmte Version vorgesehen |
| **Verworfen** | Idee wurde bewusst abgelehnt — bleibt zur Dokumentation |

Wenn in einem Dokument `> Status: Konzept-Phase` steht, bedeutet das: dieser Abschnitt ist noch nicht im Spiel.

### Begründungspflicht

Jede Regel, Formel, Konstante und Balancing-Entscheidung wird **mit ihrem Grund** dokumentiert — direkt beim Abschnitt. Nur so lässt sich später nachvollziehen, warum etwas so ist, und eine Änderung bewusst abwägen.

| Kennzeichnung | Bedeutung |
|---------------|-----------|
| `**Vorgabe (Entwickler):**` | *Was* der Entwickler entschieden hat — getrennt vom *Warum* |
| `**Begründung (Entwickler):**` | Grund vom Entwickler selbst genannt (nichts hinzugedichtet) |
| `**Begründung (Vorschlag Claude, übernommen):**` | Von Claude vorgeschlagen, vom Entwickler bestätigt |
| `**Begründung (rekonstruiert, bitte bestätigen):**` | Aus Code oder Kommentaren abgeleitet — noch nicht bestätigt |
| `> Begründung offen` | Grund unbekannt — beim Entwickler nachfragen |

Bei Skill-Effekten steht die Begründung im Pflichtfeld `reasoning` ([src/data/skills.ts](../src/data/skills.ts)). Ändert sich eine Entscheidung, bleibt die alte Begründung unter `[VERWORFEN]` erhalten; die neue Begründung nennt auch den Grund der Änderung.

---

## 6. Versionierung

| Version | Bedeutung |
|---------|-----------|
| v0.1 | Erster spielbarer Prototype (Desktop, Vanilla JS, Single File) |
| v0.1.1 | Mobile-First Redesign: Joystick, Touch-Buttons, Bottom Sheet, responsive Layout |
| v0.2 | Modulare Architektur (TypeScript + Phaser.js), Skill-System isoliert & testbar, saubere Trennung von Logik und Rendering. Single-File-Deployment via Claude-Build. |
| v0.3 | **Aktuell.** Kampfsystem + aktive Skills + Status-Effekte, Speichersystem (3 Slots LocalStorage), Touch-Joystick, große prozedurale Welt (20×20 Chunks = 20480×20480px, 6 Biome, Pixel-Art-Tiles). |
| v0.4 | Isometrische Ansicht, Bosskämpfe |
| v1.0 | Vollständiges erstes Release |

Jede GDD-Datei trägt am Ende einen Zeitstempel der letzten Änderung. Dieser sollte bei jeder inhaltlichen Änderung aktualisiert werden.

---

## 7. Anleitung für KI-Systeme

Wenn du als KI-Assistent an diesem Projekt arbeitest, gelten folgende Regeln:

**Vor dem Antworten:**
1. Alle relevanten GDD-Dateien lesen die zur Frage passen.
2. Unterscheiden ob etwas bereits implementiert (im Prototype) oder nur Konzept ist.
3. Keine Mechaniken erfinden die den Kern-Prinzipien in GDD-01 widersprechen.

**Beim Implementieren von Code:**
1. Implementierter Code muss mit den GDD-Beschreibungen übereinstimmen.
2. Wenn Code von der GDD abweicht: GDD aktualisieren und Abweichung begründen.
3. Neue Mechaniken die im Code hinzukommen müssen in die GDD eingetragen werden.

**Beim Aktualisieren der GDD:**
1. Nie Informationen löschen — veraltete Einträge mit Status "Verworfen" markieren.
2. Datum am Ende der geänderten Datei aktualisieren.
3. Wenn eine neue GDD-Datei nötig wird: hier in GDD-00 eintragen.
4. Jede Regel mit Begründung dokumentieren (siehe Abschnitt 5, Begründungspflicht). Keine Gründe erfinden — unbekannte Gründe als `> Begründung offen` markieren und nachfragen.

**Kommunikation:**
- Mit dem Entwickler auf Deutsch kommunizieren.
- Code, Variablennamen und Dateinamen auf Englisch halten.

---

## 8. Offene Fragen & Entscheidungen (Backlog)

### Geschlossene Entscheidungen (diese Session)

- [x] **Tech-Stack**: TypeScript + Phaser.js beschlossen und implementiert (v0.2)
- [x] **Deployment**: Single-File-HTML via GitHub Pages — Claude kompiliert und pusht
- [x] **Architektur**: Modularer Aufbau mit `systems/`, `data/`, `types/`, `scenes/` — Logik vollständig von Rendering getrennt
- [x] **Build-Workflow**: Kein lokales Node.js/npm nötig — Claude führt den Build aus
- [x] **Speichersystem**: LocalStorage, 3 Slots (implementiert v0.3)
- [x] **Touch-Input**: Virtueller Joystick via DOM (implementiert v0.3)
- [x] **Kampfsystem**: Aktive Skills, Status-Effekte, KI (implementiert v0.3)
- [x] **Welt-System**: 20×20 Chunks, 6 Biome, Pixel-Art-Tiles, dynamisches Chunk-Laden (implementiert v0.3)

### Noch offene Entscheidungen

- [ ] Tod-Mechanik: Soft Death, Checkpoint oder Rogue-like? → [GDD-03 Abschnitt 7](GDD-03-Kampfsystem.md#7-tod-mechanik--respawn)
- [ ] Skill-Limit: Gibt es eine Obergrenze für aktive Skills? → [GDD-02 Abschnitt 6](GDD-02-Skillsystem.md#6-skill-slots--limits)
- [ ] Unbekannte Rezepte: Ab wann werden Kombinations-Rezepte versteckt? → [GDD-02 Abschnitt 5](GDD-02-Skillsystem.md#5-kombinationssystem)
- [ ] PWA: Soll das Spiel als installierbare App (PWA) verfügbar sein? → [GDD-04](GDD-04-LookAndFeel.md)
- [ ] Mobile Interact: Soll Tap auf Entity direkt Absorb/Analyze auslösen, oder erst ein Kontextmenü zeigen? → [GDD-04](GDD-04-LookAndFeel.md)
- [ ] Material-UI: Gesammelte Materialien in-game sichtbar machen? ([src/systems/MaterialSystem.ts](../src/systems/MaterialSystem.ts) existiert, UI fehlt)
- [ ] Balancing: XP-Kurve, Spawn-Dichte und Respawn-Zeiten sind implementiert aber noch nicht abgestimmt → [src/data/balance.ts](../src/data/balance.ts)
- [ ] Progressionsmodell: Zwei-Exponenten-Modell, proportionale Erfahrung oder Ist-Stand? Level-Differenz als Verhältnis oder Differenz? Spieler-Level aus Summe XP oder Summe der Skill-Level? → [GDD-08 Abschnitt 10](GDD-08-Progressionsmathematik.md#10-offene-entscheidungen)
- [ ] Wirkung, Zufall, Wechselwirkungen: Prozent-Formeln, Pity beim Skill-Fund, Geschick-Deckel, Stapelregel für Multiplikatoren u. a. → [GDD-08 Abschnitt 15](GDD-08-Progressionsmathematik.md#15-offene-entscheidungen-teil-2)
- [ ] Unendliches Leveln mit linearer Skala und %-Anzeige (Vorschlag Entwickler): übernehmen? Aktionen pro Level `N(L)`, Verhalten jenseits des stärksten Wesens → [GDD-08 Abschnitt 16.4](GDD-08-Progressionsmathematik.md#164-offene-entscheidungen-teil-3)
- [ ] Fehlschlag-Formel: Linear oder kurvenbasiert? → [GDD-02 Abschnitt 1.2](GDD-02-Skillsystem.md#12-erfolgswahrscheinlichkeit)
- [ ] Photosynthesis: Was tut diese Fähigkeit konkret? → [GDD-02 Abschnitt 3.2](GDD-02-Skillsystem.md#32-skill-beschreibungen)
- [ ] Grow-Kosten: Welche Materialien und welche Mengen benötigt Grow? → [GDD-02 Abschnitt 3.2](GDD-02-Skillsystem.md#32-skill-beschreibungen)
- [ ] Grow-Effekt: Welche Stats erhöht Grow konkret, und um wie viel? → [GDD-02 Abschnitt 3.2](GDD-02-Skillsystem.md#32-skill-beschreibungen)
- [ ] Kampfmathematik v0.4: Neue Schadenstypen und SkillEffect-System implementieren → [GDD-05](GDD-05-Kampfmathematik.md)

---

*Letzte Aktualisierung: v0.4 — GDD-08 (Progressionsmathematik, Teil 1–3) ergänzt; GDD-07 (Bestiarium-Entwurf) ergänzt; Begründungspflicht (Abschnitt 5 und 7) eingeführt; HitSystem (Treffer-Stufen) ergänzt; GDD-06 verworfen (Referenz jetzt als INDEX-Tab im Spiel), SaveSystem-Migration vermerkt (Oktober 2026)*
