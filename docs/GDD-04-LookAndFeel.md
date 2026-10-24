# ABSORB & EVOLVE — Game Design Document
## Datei 04: Look & Feel / Visuelles Design

---

## 1. Visuelle Identität

### Kern-Ästhetik
**Dark Fantasy meets biolumineszente Natur.** Die Welt ist dunkel und leicht bedrohlich, aber der Blob selbst leuchtet. Kontrast zwischen der düsteren Umgebung und dem lebendigen, glühenden Protagonisten.

Kein Cartoon-Look. Stattdessen:
- Atmosphärische Dunkelheit mit punktuellen Lichteffekten
- Organische Formen (der Blob ist nie perfekt rund)
- Mittelalterliche Welt ohne Technologie-Elemente
- **Pixel-Art-Tiles** (32×32px, prozedural generiert): Grashalme, Steinfugen, Dünenstreifen, Wasserreflexionen — jedes Biom hat einen eigenen Look

---

## 2. Farbpalette

### Welt — Biom-Farbpaletten (implementiert, v0.3)

Jedes Biom hat 4 Höhenstufen (Wasser/0, Flach/1, Hügel/2, Gipfel/3) mit eigener Pixel-Art-Textur:

| Biom | Basis | Hell | Dunkel | Akzent |
|------|-------|------|--------|--------|
| Forest (Wald) | `#3d7a32` | `#5aaa46` | `#1e4a18` | `#d4c840` (Blumen) |
| Swamp (Sumpf) | `#2d4e24` | `#3d6a30` | `#141e10` | `#3a8878` (Wasser) |
| Highland (Hochland) | `#7a6838` | `#9a8a50` | `#4a4020` | `#9a7840` (Steine) |
| Mountain (Gebirge) | `#686878` | `#9898a8` | `#383840` | `#b8b8c8` (Mineral) |
| Desert (Wüste) | `#c0a048` | `#d8c070` | `#886828` | `#c8b858` (Sand) |
| Dungeon | `#282838` | `#383850` | `#14141e` | `#484858` (Fugen) |

Höhe 0 (Wasser): Wellen-/Reflexionsmuster je nach Biom
Höhe 3 (Gipfel): Schnee-Overlay bei Mountain, dichter Baumschatten bei Forest

### Hintergrund & UI
| Bereich | Farbe | Hex |
|---------|-------|-----|
| Hintergrund | Fast-Schwarz | `#0a0d14` |

### UI
| Element | Farbe | Hex |
|---------|-------|-----|
| Primär-Akzent | Türkis/Cyan | `#4af0c8` |
| Sekundär-Akzent | Lila | `#a06fff` |
| Gold / EXP | Warm-Gold | `#f0c040` |
| Gefahr / Schaden | Rot-Rosa | `#ff4466` |
| Erfolg / Absorb | Grün | `#44ff88` |
| Panel-Hintergrund | Sehr dunkles Blau | `#0f1420` |
| Text | Helles Blaugrau | `#c8d8e8` |
| Gedämpft / Inaktiv | Mittelgrau | `#5a6a7a` |

### Der Blob
| Zustand | Farben |
|---------|-------|
| Standard | Gradient: `#90ffcc` → `#40e890` → `#20a860` |
| Feuerskill aktiv | Orange-Töne überlagert |
| Wasserskill aktiv | Blau-Töne überlagert |
| Dunkelskill aktiv | Lila-Töne, reduzierte Helligkeit |
| Unter Beschuss | Kurzes Rot-Flash |

---

## 3. Typografie

| Verwendung | Font | Stil |
|-----------|------|------|
| Überschriften / Titel | Cinzel | Serif, versal, historisch |
| Fließtext / Beschreibungen | Crimson Pro | Elegant-lesbar, Schreibmaschinen-Charakter |
| HUD-Werte (Zahlen) | Cinzel | Klein, letter-spaced |

**Rationale**: Cinzel wirkt wie gemeißelte Inschriften — passend für eine Fantasy-Welt. Crimson Pro ist gut lesbar auf dunklen Hintergründen.

---

## 4. UI/UX Design

### Plattform-Strategie: Mobile First
Das Spiel ist primär für Mobilgeräte entwickelt. Desktop wird vollständig unterstützt, ist aber sekundär.

| Aspekt | Mobile | Desktop |
|--------|--------|---------|
| Layout | Vollbild-Canvas + Touch-Overlay | Vollbild-Canvas + Touch-Overlay (v0.4: gleiches Layout wie Mobile) |
| Navigation | Spielmenü (Vollbild-Overlay, pausiert) — siehe unten | Spielmenü (Vollbild-Overlay, pausiert) |
| ~~Layout / Navigation (bis v0.3)~~ | ~~Bottom Sheet~~ | ~~Canvas + festes Side Panel mit Tabs~~ — **[VERWORFEN]** durch Spielmenü |
| Bewegung | Virtueller Joystick (links unten) | WASD / Pfeiltasten |
| Interaktion | ABSORB / ANALYZE Touch-Buttons | E / Q Tasten oder Mausklick |
| Entity-Klick (Absorb) | Tap auf Entity (wenn in Reichweite) | Linksklick |
| Entity-Klick (Analyze) | — (über Button) | Rechtsklick |
| Viewport | `100dvh` (dynamic viewport height) | feste Berechnung |

### Layout Mobile
```
┌────────────────────────────────────┐
│  HEADER (Level / HP / MP / EXP)    │
├────────────────────────────────────┤
│                                    │   [📋] Panel-Button (oben rechts)
│         SPIELBEREICH               │
│          (Canvas, Vollbild)        │
│                                    │
│  [Joystick]      [💥] [🔍]        │  ← Touch Controls (über Canvas)
└────────────────────────────────────┘
         ▲ Bottom Sheet (hochziehbar) — [VERWORFEN], 📋 öffnet jetzt das Spielmenü
```

### Layout Desktop — [VERWORFEN] (v0.4: Desktop nutzt dasselbe Layout wie Mobile)
```
┌──────────────────────────┬──────────────┐
│  HEADER                  │              │
├──────────────────────────┤  SIDE PANEL  │
│                          │  [SKILLS]    │
│   SPIELBEREICH           │  [COMBINE]   │
│   (Canvas)               │  [NEARBY]    │
│                          │  [LOG]       │
├──────────────────────────┴──────────────┤
│  FOOTER (Keybindings)                   │
└─────────────────────────────────────────┘
```

### Responsive Breakpoint — [VERWORFEN] (v0.4: kein Breakpoint mehr, ein Layout für alle Bildschirme)
- `≤ 700px`: Mobile Layout (Side Panel ausgeblendet, Touch Controls aktiv, Bottom Sheet aktiv)
- `> 700px`: Desktop Layout (Side Panel sichtbar, Footer sichtbar, Touch Controls ausgeblendet)
- `> 700px` **im Vollbild** (z.B. Handy im Querformat): Side Panel wird zur einklappbaren Schublade. Beim Betreten des Vollbilds ist sie zugeklappt, das Spielfeld nutzt die volle Breite. Der 📋 Panel-Button (oben rechts) fährt sie von rechts über das Spielfeld herein; Panel-Button, Skill-Bar und Absorb/Analyze-Buttons rücken dabei links neben die Schublade. Außerhalb des Vollbilds bleibt das Side Panel fest aufgeklappt.

### Spielmenü (v0.4, implementiert)
Ein einziges Menü für alle Bildschirmgrößen und Ausrichtungen ([src/ui/GameMenu.ts](../src/ui/GameMenu.ts)):
- Beim Spielen geschlossen — das Spielfeld nutzt immer den ganzen Bildschirm.
- Der 📋-Button (oben rechts) öffnet es als **Vollbild-Overlay**; das Spiel ist pausiert, solange es offen ist. „✕ Weiterspielen" schließt es.
- Tabs: **SKILLS · COMBO · INVENTAR · NEARBY · LOG · INDEX**
- **INDEX** ([src/ui/IndexView.ts](../src/ui/IndexView.ts)): Nachschlagewerk aller Skills und Einheiten, umschaltbar, mit Suche. Ein Eintrag öffnet die Detailansicht mit allen Parametern: bei Skills Effekte mit Formel, Begründung und Werten für Lv 1/2/3/5/10/20, Schaden/Sprungweite/Heilung pro Level, Fundorte mit Absorb-/Analyze-Chance und welche Einheiten den Skill nutzen; bei Einheiten Grundwerte, Vorkommen pro Biom, Skills, Nahkampf, Treffer-Effekte, Verteidigung je Schadenstyp, Bonus-Level-Skalierung und Drops. Skills und Einheiten sind untereinander verlinkt, „← Zurück" geht einen Schritt zurück. Alle Werte werden zur Laufzeit über die echten Systeme berechnet und sind daher immer aktuell.

**Pause-Regel:** Gespielt wird nur im Vollbild-Modus. Das Spiel läuft nur, wenn der Vollbildmodus aktiv ist und kein Menü offen ist (Spielmenü, Skill-Menü, Speichern). Schon beim Start ist das Spiel pausiert und das Pause-Overlay fordert zum Wechsel in den Vollbild-Modus auf („⛶ Vollbild & Spielen"); dasselbe passiert, sobald der Vollbildmodus verlassen wird. Ist zusätzlich ein Menü offen, liegt das Menü oben; nach dem Schließen erscheint das Pause-Overlay. Ausnahme: Browser ohne Fullscreen-API (iPhone-Safari) spielen ohne Vollbild, sonst wäre das Spiel dort nicht spielbar.

**Begründungen:**
- **Vorgabe (Entwickler):** Das Spiel pausiert, sobald das Menü geöffnet wird.
  **Begründung (rekonstruiert, bitte bestätigen):** Wer Skills, Inventar, Log oder Index liest, soll nicht nebenbei angegriffen werden.
- **Vorgabe (Entwickler):** Beim Spielen ist das Menü geschlossen; geöffnet geht es über den ganzen Bildschirm.
  **Begründung (rekonstruiert, bitte bestätigen):** Im Vollbild-Querformat nahm die aufgeklappte Seitenleiste dauerhaft Spielfläche weg.
- **Ein Layout für alle Bildschirme statt Seitenleiste/Bottom Sheet — Begründung (Vorschlag Claude, übernommen):** Da nur im Vollbild gespielt wird und das Menü ohnehin pausiert, braucht es kein dauerhaft sichtbares Panel mehr; ein einziges Menü ist einfacher und verhält sich überall gleich. Nebeneffekt: Das alte Bottom Sheet kopierte den Tab-Inhalt als HTML und verlor dabei z.B. die Combo-Auswahl.
- **Vorgabe (Entwickler):** Die Übersicht aller Skills und Einheiten gehört in die App, nicht als Markdown-Datei ins Repo.
  **Begründung (Vorschlag Claude):** Die Werte werden live berechnet und können nicht veralten.
  > Begründung offen — Grund des Entwicklers für „in die App statt ins Repo".
- **Vorgabe (Entwickler):** Gespielt wird nur im Vollbild; sonst Pause mit Hinweis.
  > Begründung offen
- **Ausnahme ohne Fullscreen-API — Begründung (Vorschlag Claude):** Auf dem iPhone gibt es keinen Vollbild-Modus für Webseiten; ohne Ausnahme wäre das Spiel dort gar nicht spielbar.
- **Pause nach Gründen (Vollbild verlassen / Menü offen) — Begründung (Vorschlag Claude):** Vorher setzte das Schließen eines Menüs das Spiel fort, obwohl der Vollbildmodus schon verlassen war.

### Touch Controls (Mobile)
- **Virtueller Joystick** (links unten): Kreis mit beweglichem Thumb, max. Radius 44px. Bewegung wird als Vektor (dx/dy) an den Spieler übergeben und mit Keyboard-Input addiert.
- **ABSORB-Button** (rechts unten): Großer runder Button, greift das nächste Entity in Reichweite an.
- **ANALYZE-Button** (neben Absorb): Analysiert das nächste Entity in Reichweite.
- **Panel-Button** (oben rechts): Öffnet das Spielmenü (bis v0.3: Bottom Sheet).

### Bottom Sheet (Mobile Panel) — [VERWORFEN], ersetzt durch Spielmenü
- Gleiche 4 Tabs wie Desktop: SKILLS / COMBINE / NEARBY / LOG
- Hochziehbar, max. 60% der Bildschirmhöhe
- Handle-Bar zum Schließen

### Side Panel — Tabs (beide Plattformen)
| Tab | Funktion |
|-----|---------|
| SKILLS | Alle entdeckten Skills mit Level und XP-Fortschritt |
| COMBINE | Zwei Skills auswählen, Kombination versuchen |
| NEARBY | Entities in Reichweite mit Absorb/Analyze-Buttons |
| LOG | Chronologisches Event-Journal |

### HUD-Elemente (Header)
- Responsive Schriftgrößen (`clamp()`) — lesbar auf kleinen Screens
- **Level**: Zahl, direkt sichtbar
- **HP-Bar**: Rot-Gradient, immer sichtbar
- **MP-Bar**: Lila-Blau-Gradient, immer sichtbar
- **EXP-Bar**: Gold-Gradient
- **Skill-Count**: Anzahl entdeckter Skills

### In-Canvas HUD (unten Mitte)
- Maximal 5 aktive Skills als Icon-Leiste
- Skill-Level als kleiner Text
- Cooldown-Overlay implementiert (v0.3)

---

## 5. Animationen & Feedback

### Der Blob
- **Idle**: Leichtes organisches Pulsieren (Sinus-Wobble auf Radius)
- **Bewegung**: Dezentes Verformen in Bewegungsrichtung (geplant)
- **Absorb**: Kurzes Ausweiten, dann Zusammenziehen (geplant)
- **Analyze-Aura**: Lichtringe um beide Entities (geplant)
- **Skill-Cast**: Partikel in Elementfarbe (geplant)

### Entities
- **Idle Wobble**: Leichtes Auf-Ab-Schaukeln (animiert per Sinusfunktion)
- **In-Range-Indikator**: Gestrichelter Cyan-Kreis, pulsierend
- **Namedrop**: Erscheint wenn in Reichweite
- **Tod durch Absorb**: Dissolve-Effekt (geplant)

### UI-Feedback
- **Skill Discovery**: Notification-Banner erscheint (Slide-in, 2.5 Sekunden)
- **Level-Up**: Gold-Notification
- **Kombination**: Lila-Notification mit Combo-Icon

---

## 6. Perspektiven — Technische Umsetzung

### View 1: Top-Down (Standard)
- 32×32px Pixel-Art-Tiles, prozedural generiert (Canvas 2D ImageData, kein externes Bild)
- Kamera folgt dem Spieler mit sanfter Interpolation
- Chunk-basiert: 20×20 Chunks à 32×32 Tiles = 20480×20480px Welt
- 6 Biome: Forest, Swamp, Highland, Mountain, Desert, Dungeon — als authored Zonen angeordnet
- Dynamisches Laden/Entladen (Render-Radius 2, Active-Radius 1, Unload-Radius 3)

### View 2: Isometrisch (geplant, v0.4)
- 2:1 Isometrische Projektion
- Tiles werden als Rauten dargestellt
- Entities und Blob bekommen Schatten-Ellipsen für Tiefenwirkung
- Separate Render-Pipeline, Perspektive wechselt beim Betreten von Dungeons

---

## 7. Audio (Konzept, nicht implementiert)

| Kategorie | Richtlinie |
|-----------|-----------|
| Musik | Orchestral-ambient, mittelalterlich. Kein EDM, kein Chip-Tune. |
| Absorb-Sound | Organisch, feucht, leicht unheimlich |
| Analyze-Sound | Leises Summen, magische Resonanz |
| Skill-Cast | Elementabhängig (Zischen für Feuer, Plätschern für Wasser) |
| Level-Up | Kurze, triumphale Fanfare |
| Umgebung | Windgeräusche, Grillen, Wasserplätschern je nach Gebiet |

---

## 8. Technischer Stack (aktuell & geplant)

### Architektur-Entscheidungen (v0.2, beschlossen)

Der Refactor zu einer modularen Architektur wurde in v0.2 vollständig umgesetzt. Kernprinzip: **Spiellogik ist vollständig von Rendering getrennt.**

```
src/
├── types/          # TypeScript-Interfaces (kein Phaser, kein DOM)
│   ├── Skill.ts, Entity.ts, GameState.ts, Combat.ts, Material.ts
├── data/           # Reine Datendefinitionen — Balancing-Werte hier ändern
│   ├── skills.ts, entities.ts, materials.ts, balance.ts
├── systems/        # Reine Spiellogik (kein Phaser, kein DOM, testbar)
│   ├── SkillSystem.ts, EntitySystem.ts, CombatSystem.ts
│   ├── AiSystem.ts, StatusEffectSystem.ts, MaterialSystem.ts, SaveSystem.ts
├── ui/             # DOM-only Komponenten (kein Phaser)
│   ├── Joystick.ts, SkillBar.ts, SkillMenu.ts, SaveMenu.ts
├── world/          # Chunk-System (kein Phaser-Import, scene als any)
│   ├── Chunk.ts, BiomeDefinitions.ts, WorldGenerator.ts
│   ├── TilesetGenerator.ts, ChunkManager.ts
└── scenes/         # Einzige Phaser-abhängige Schicht
    └── GameScene.ts
```

**Abhängigkeitsregel**: `types` ← `data` ← `systems` ← `scenes`. Nur `scenes` kennt Phaser.

### Build-Workflow

| Schritt | Wer | Tool |
|---------|-----|------|
| Code schreiben / ändern | Jörn (beschreibt) + Claude (schreibt) | — |
| TypeScript kompilieren | Claude | `tsc` auf Linux-Container |
| Single-File bundeln | Claude | Inline-Zusammenführung |
| Datei herunterladen & testen | Jörn | Browser, Doppelklick |

Kein lokales Node.js, npm oder Terminal auf Jörns Seite nötig.

#### Lokale Entwicklung im Dev-Container (optional, v0.4)

- [`.devcontainer/devcontainer.json`](../.devcontainer/devcontainer.json): Node 20 (wie die CI), installiert die Abhängigkeiten (`npm ci`) und leitet Port 8080 weiter. Öffnen mit VS Code („Dev Containers: Reopen in Container“) oder GitHub Codespaces.
- `npm run dev` ([scripts/dev.js](../scripts/dev.js)): baut das Spiel und liefert es unter http://localhost:8080 aus. Jede Änderung in `src/` oder `accognita.template.html` löst einen neuen Build aus; der Browser lädt danach selbst neu. Schlägt der Build fehl, bleibt die letzte funktionierende Version aktiv.
- Weitere Befehle: `npm run build` (einmal bauen), `npm run typecheck` (nur Typprüfung).

**Vorgabe (Entwickler):** Ein Dev-Container-Setup, mit dem das Projekt lokal entwickelt und getestet werden kann.
> Begründung offen
**Begründung Node 20 (Vorschlag Claude):** Dieselbe Version wie die CI, damit lokal und beim Deploy gleich gebaut wird.
**Begründung Dev-Server ohne Abhängigkeiten (Vorschlag Claude):** Nur Node-Bordmittel — kein zusätzliches Paket, das gepflegt oder aktualisiert werden muss.
**Begründung automatisches Neuladen (Vorschlag Claude):** Ändern und Ausprobieren ohne manuelles Bauen. Nebenwirkung: Nach dem Neuladen ist der Vollbildmodus beendet, das Spiel startet pausiert (siehe Pause-Regel).

### Stack-Tabelle

| Bereich | Aktuell (v0.3) | Geplant |
|---------|----------------|---------|
| Rendering | Phaser.js 3.70 (CDN) | — |
| Sprache | TypeScript 5.x | — |
| Framework | Phaser.js | — |
| Build | Claude (`tsc`) → Single HTML, GitHub Pages | Evtl. Vite für größere Versionen |
| Persistenz | LocalStorage (3 Slots, implementiert) | — |
| Mobile Input | Virtueller Joystick (DOM) + Touch-Buttons | — |
| Viewport | Phaser Scale.RESIZE | — |
| Welt | 20×20 Chunk-System, Pixel-Art-Tiles, 6 Biome | Isometrisch (v0.4) |
| PWA | Nein | Noch offen |

### Versionsnummer & Spielstände (implementiert, v0.4)

- **Versionsnummer** steht an genau einer Stelle im Code: [src/data/version.ts](../src/data/version.ts) (`GAME_VERSION`, derzeit 0.4.0). `build.js` bricht ab, wenn sie nicht mit `package.json` übereinstimmt. Angezeigt wird sie im Speichern-Dialog; jeder Spielstand speichert, mit welcher Version er gespeichert wurde, und Spielstände anderer Versionen werden dort gelb markiert.
  **Vorgabe (Entwickler):** Es braucht eine Stelle, an der die Version angezeigt wird; falls es keine Versionsnummer gibt, eine einführen; Anzeige im Speichern-Dialog.
  **Begründung einzige Quelle + Build-Prüfung (Vorschlag Claude):** Vorher stand `0.3.0` an zwei Stellen, die nur von Hand gleich gehalten wurden.
  **Begründung Version im Spielstand (Vorschlag Claude):** So lässt sich erkennen, mit welcher Version ein Spielstand gespeichert wurde — Grundlage für Migrationen.
  > Begründung offen — Ob 0.4.0 die richtige Nummer ist: Die isometrische Ansicht war ursprünglich für v0.4 geplant (GDD-00 Abschnitt 6).
- **Migration alter Spielstände** ([src/systems/SaveSystem.ts](../src/systems/SaveSystem.ts)): Das Speicherformat hat eine eigene Formatversion (derzeit 2) und eine Kette von Migrationsschritten, die beim Lesen angewendet werden. v1 → v2 rechnet HP/MP **anteilig** auf Milli-Einheiten um (Füllstand bleibt, Maximum aus dem Level).
  **Vorgabe (Entwickler):** Migration für gespeicherte Spielstände schreiben.
  **Begründung (Vorschlag Claude, übernommen):** Ohne Migration hätte der Blob nach dem Laden eines alten Spielstands (HP in ganzen Punkten) nur 0,05 HP gehabt.
  **Begründung anteilig statt ×1000 (Vorschlag Claude):** Auch Spielstände nach der Umstellung tragen noch Formatversion 1 und sind schon in Milli — ein pauschales ×1000 hätte sie zerstört. **Migration nur beim Lesen, nicht zurückschreiben (Vorschlag Claude):** Geht bei einer Migration etwas schief, bleibt der Original-Spielstand erhalten.

### [VERWORFEN] Ursprünglicher Stack v0.1

> Status: Verworfen — ersetzt durch modulare TypeScript-Architektur in v0.2

| Bereich | v0.1 (veraltet) |
|---------|-----------------|
| Rendering | HTML5 Canvas (2D API, Vanilla JS) |
| Sprache | Vanilla JavaScript |
| Framework | Kein Framework |
| Build | Kein Build-System — direkte Single HTML |

---

*Letzte Aktualisierung: v0.4 — Dev-Container und `npm run dev` für lokale Entwicklung; Begründungen für Spielmenü, Vollbild-Regel, Version und Spielstand-Migration ergänzt; Spielmenü als pausierendes Vollbild-Overlay mit INDEX-Tab (Oktober 2026)*
