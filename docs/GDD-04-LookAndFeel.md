# ABSORB & EVOLVE — Game Design Document
## Datei 04: Look & Feel / Visuelles Design

---

## 1. Visuelle Identität

### Kern-Ästhetik
**Dark Fantasy meets biolumineszente Natur.** Die Welt ist dunkel und leicht bedrohlich, aber der Slime selbst leuchtet. Kontrast zwischen der düsteren Umgebung und dem lebendigen, glühenden Protagonisten.

Kein Cartoon-Look. Kein Pixel-Art-Minimalismus. Stattdessen:
- Atmosphärische Dunkelheit mit punktuellen Lichteffekten
- Organische Formen (der Slime ist nie perfekt rund)
- Mittelalterliche Welt ohne Technologie-Elemente

---

## 2. Farbpalette

### Welt
| Bereich | Farbe | Hex |
|---------|-------|-----|
| Gras (Standard) | Dunkelgrün | `#1a3320` |
| Gras (Schatten) | Sehr dunkelgrün | `#142618` |
| Wasser | Dunkles Blau | `#1a2a4a` |
| Stein/Fels | Dunkelgrau | `#2a2a2a` |
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

### Der Slime
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
| Layout | Vollbild-Canvas + Touch-Overlay | Canvas + festes Side Panel |
| Navigation | Bottom Sheet (hochziehbares Panel) | Tabs im Side Panel |
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
         ▲ Bottom Sheet (hochziehbar)
```

### Layout Desktop
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

### Responsive Breakpoint
- `≤ 700px`: Mobile Layout (Side Panel ausgeblendet, Touch Controls aktiv, Bottom Sheet aktiv)
- `> 700px`: Desktop Layout (Side Panel sichtbar, Footer sichtbar, Touch Controls ausgeblendet)

### Touch Controls (Mobile)
- **Virtueller Joystick** (links unten): Kreis mit beweglichem Thumb, max. Radius 44px. Bewegung wird als Vektor (dx/dy) an den Spieler übergeben und mit Keyboard-Input addiert.
- **ABSORB-Button** (rechts unten): Großer runder Button, greift das nächste Entity in Reichweite an.
- **ANALYZE-Button** (neben Absorb): Analysiert das nächste Entity in Reichweite.
- **Panel-Button** (oben rechts): Öffnet/schließt das Bottom Sheet.

### Bottom Sheet (Mobile Panel)
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
- Cooldown-Overlay geplant (v0.2)

---

## 5. Animationen & Feedback

### Der Slime
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
- Rechteckige Tiles (40x40px)
- Kamera folgt dem Spieler mit sanfter Interpolation (Lerp 10%)
- Tile-Typen: grass, dark_grass, water, stone
- Wasser hat animierten Shimmer-Overlay (Sinusfunktion)

### View 2: Isometrisch (geplant, v0.3)
- 2:1 Isometrische Projektion
- Tiles werden als Rauten dargestellt
- Entities und Slime bekommen Schatten-Ellipsen für Tiefenwirkung
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
│   ├── Skill.ts
│   ├── Entity.ts
│   └── GameState.ts
├── data/           # Reine Datendefinitionen — Balancing-Werte hier ändern
│   ├── skills.ts
│   └── entities.ts
├── systems/        # Reine Spiellogik (kein Phaser, kein DOM, testbar)
│   ├── SkillSystem.ts
│   └── EntitySystem.ts
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

### Stack-Tabelle

| Bereich | Aktuell (v0.2) | Geplant |
|---------|----------------|---------|
| Rendering | Phaser.js 3.70 (CDN) | — |
| Sprache | TypeScript 5.x | — |
| Framework | Phaser.js | — |
| Build | Claude (`tsc`) → Single HTML | Evtl. Vite für größere Versionen |
| Persistenz | Keins | LocalStorage (v0.3, noch offen) |
| Mobile Input | Phaser Keyboard + DOM-Buttons | Touch-Joystick (v0.3) |
| Viewport | Phaser Scale.RESIZE | — |
| PWA | Nein | Noch offen |

### [VERWORFEN] Ursprünglicher Stack v0.1

> Status: Verworfen — ersetzt durch modulare TypeScript-Architektur in v0.2

| Bereich | v0.1 (veraltet) |
|---------|-----------------|
| Rendering | HTML5 Canvas (2D API, Vanilla JS) |
| Sprache | Vanilla JavaScript |
| Framework | Kein Framework |
| Build | Kein Build-System — direkte Single HTML |

---

*Letzte Aktualisierung: v0.2 — Tech-Stack auf TypeScript + Phaser.js umgestellt (März 2026)*
