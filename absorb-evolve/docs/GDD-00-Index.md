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
| Aktueller Stand | v0.2 (spielbar, modulare Architektur) |
| Hauptentwickler | Jörn |
| KI-Assistent | Claude (Anthropic) |
| Arbeitssprache | Deutsch (Kommunikation), Englisch (Code & Dateinamen) |

---

## 3. Dateistruktur

| Datei | Inhalt | Wann konsultieren |
|-------|--------|-------------------|
| **GDD-00-Index.md** | Diese Datei. Struktur, Konventionen, Meta. | Immer zuerst |
| **GDD-01-Hauptbeschreibung.md** | Vision, Kernidee, Core Game Loop, Setting, Perspektiven, Progressionspfade | Bei Fragen zur Spielidee, zum Genre, zur Gesamtstruktur |
| **GDD-02-Skillsystem.md** | Alle Skill-Mechaniken, Absorb/Analyze, Leveling, Kombinationen, Rezepte | Bei Fragen zu Skills, Entdeckung, Kombination, Balancing |
| **GDD-03-Kampfsystem.md** | Kampfablauf, Gegnertypen, Schadenformeln, Status-Effekte, Tod-Mechanik | Bei Fragen zu Kämpfen, Gegnern, Balance, Spieler-Werten |
| **GDD-04-LookAndFeel.md** | Farbpalette, Typografie, UI-Layout (Mobile + Desktop), Touch-Controls, Animationen, Audio, Tech-Stack | Bei Fragen zu Design, UI, Grafik, Sound, Technologie, Plattform |
| **slime-rpg.html** | [VERWORFEN] Ursprünglicher Vanilla-JS-Prototype v0.1 — nicht mehr aktiv gepflegt | Nur als historische Referenz |
| **absorb-evolve.html** | Aktuelles Spiel v0.2 — Single-File-Build, per Doppelklick öffenbar | Als Referenz für implementierte Mechaniken |
| **src/types/Skill.ts** | TypeScript-Interfaces: SkillDefinition, SkillInstance, DiscoveryResult | Beim Erweitern des Skill-Systems |
| **src/types/Entity.ts** | TypeScript-Interfaces: EntityDefinition, EntityInstance | Beim Erweitern von Entities |
| **src/types/GameState.ts** | Zentraler GameState, PlayerState, WorldState | Bei State-Fragen |
| **src/data/skills.ts** | Alle Skill-Definitionen und Balancing-Werte | Beim Balancing |
| **src/data/entities.ts** | Alle Entity-Definitionen | Beim Hinzufügen von Entities |
| **src/systems/SkillSystem.ts** | Reine Skill-Logik (kein Phaser) | Bei Skill-Logik-Fragen |
| **src/systems/EntitySystem.ts** | Absorb/Analyze/Respawn-Logik (kein Phaser) | Bei Interaktions-Logik-Fragen |
| **src/scenes/GameScene.ts** | Phaser-Scene: Rendering, Input, UI-Bridge | Bei Rendering/Input-Fragen |

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
    │       └── nutzt Skills aus GDD-02 als Grundlage
    │
    └── GDD-04 (Look & Feel)
            └── beschreibt wie GDD-01 bis 03 visuell umgesetzt werden
```

**Abhängigkeitsregel**: Änderungen an GDD-01 können alle anderen Dokumente betreffen. Änderungen an GDD-02 betreffen GDD-03. GDD-04 ist weitgehend unabhängig.

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

---

## 6. Versionierung

| Version | Bedeutung |
|---------|-----------|
| v0.1 | Erster spielbarer Prototype (Desktop, Vanilla JS, Single File) |
| v0.1.1 | Mobile-First Redesign: Joystick, Touch-Buttons, Bottom Sheet, responsive Layout |
| v0.2 | **Aktuell.** Modulare Architektur (TypeScript + Phaser.js), Skill-System isoliert & testbar, saubere Trennung von Logik und Rendering. Single-File-Deployment via Claude-Build. |
| v0.3 | Kampfsystem, aktive Skill-Nutzung im Kampf, Status-Effekte |
| v0.4 | Isometrische Ansicht, Bosskämpfe, Speichersystem |
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

**Kommunikation:**
- Mit dem Entwickler auf Deutsch kommunizieren.
- Code, Variablennamen und Dateinamen auf Englisch halten.

---

## 8. Offene Fragen & Entscheidungen (Backlog)

### Geschlossene Entscheidungen (diese Session)

- [x] **Tech-Stack**: TypeScript + Phaser.js beschlossen und implementiert (v0.2)
- [x] **Deployment**: Single-File-HTML — Claude kompiliert, Jörn lädt herunter und öffnet per Doppelklick
- [x] **Architektur**: Modularer Aufbau mit `systems/`, `data/`, `types/`, `scenes/` — Logik vollständig von Rendering getrennt
- [x] **Build-Workflow**: Kein lokales Node.js/npm nötig — Claude führt den Build aus

### Noch offene Entscheidungen

- [ ] Tod-Mechanik: Soft Death, Checkpoint oder Rogue-like? (siehe GDD-03, Abschnitt 7)
- [ ] Skill-Limit: Gibt es eine Obergrenze für aktive Skills? (siehe GDD-02, Abschnitt 6)
- [ ] Unbekannte Rezepte: Ab wann werden Kombinations-Rezepte versteckt? (GDD-02, Abschnitt 4)
- [ ] Speichersystem: LocalStorage oder Server-basiert? (GDD-04, Abschnitt 8)
- [ ] PWA: Soll das Spiel als installierbare App (PWA) verfügbar sein? (GDD-04, Abschnitt 8)
- [ ] Mobile Interact: Soll Tap auf Entity direkt Absorb/Analyze auslösen, oder erst ein Kontextmenü zeigen?
- [ ] Balancing: XP-Kurve, Spawn-Dichte und Respawn-Zeiten sind implementiert aber noch nicht getestet und abgestimmt

---

*Letzte Aktualisierung: v0.2 — Modulare Architektur, TypeScript + Phaser.js implementiert (März 2026)*
