# GDD-12 — Welt und Karte: Gelände, Kollision, Ebenen

> Status: Etappe 1 implementiert (v0.10.0), Etappe 2 und 3 Konzept

---

## 1. Auftrag

**Vorgabe (Entwickler, 22. November 2026):** Kacheln und Generator werden so angepasst, dass

1. die Kacheln besser aussehen und erkennbar ist, was sie darstellen,
2. es Kollisionen gibt, sodass man sich ein wenig seinen Weg suchen muss — es soll sich danach anfühlen, dass man etwas entdecken muss,
3. man nicht mehr über Wasser laufen kann und dort keine Einheiten platziert werden; später wird das für Fische und Amphibien aufgehoben, vorerst kann sich niemand über Wasser bewegen,
4. die Biome nicht mehr klar viereckig sind, sondern beliebige, zufällige Formen annehmen,
5. es verschiedene Ebenen gibt: Höhlen, betretbare Häuser (sobald es welche gibt), später Tauchen,
6. im Wald nahe dem Anfang eine verlassene Waldhütte steht,
7. es verschiedene Elemente auf der Welt gibt — Ameisen kommen aus Ameisenbauten, Mäuse aus Mauselöchern,
8. die Übergänge zwischen den Bereichen optisch schön erkennbar sind: zwischen Land und Wasser ein Ufer, die Ecken etwas gerundet,
9. die Grafik sich an bestehenden Top-Down-Pixel-Art-Sets orientiert (z. B. craftpix „Main Characters Home“, „2D Top Down Pixel Dungeon“) — oder Claude sich selbst etwas ausdenkt.

**Vorgabe (Entwickler, 22. November 2026, Vorschläge Claude übernommen):**
- Umsetzung in **3 Etappen**, nach jeder wird gepusht und getestet: (1) neue Welt mit Biom-Formen, Wasser, Hindernissen, Übergängen und Kacheln; (2) Weltobjekte: Ameisenbauten, Mauselöcher, Waldhütte von außen; (3) Ebenen: Höhlen und Hütte betretbar.
- **Ebenen als eigene Innenkarten:** Ein Eingang (Höhlenloch, Tür) bringt den Blob auf eine eigene kleine Karte; die Oberwelt wird ausgeblendet, beim Verlassen kommt er am Eingang wieder heraus. Gleich für Höhlen, Häuser und später Tauchen.
- **Hindernisse teils größenabhängig:** Wasser, Felsen und Stämme blockieren alle; Gestrüpp lässt kleine Wesen durch, große nicht.

**Begründung (Vorschlag Claude, übernommen):** Etappen — jede Etappe ist für sich spielbar und testbar, Fehler fallen früh auf. Eigene Innenkarten — eine einzige Technik für alle Ebenen, und die Innenräume können größer sein als das Haus von außen. Größenabhängige Hindernisse — kleine Wesen bekommen eigene Schleichwege, wie das Mauswiesel, das durch Mauselöcher passt.

---

## 2. Etappe 1: Neue Welt (implementiert, v0.10.0)

### 2.1 Bodenarten an Eckpunkten („Dual-Grid“)

Die Welt ist ein Raster aus Eckpunkten im Abstand einer Kachel (32 px). Jeder Eckpunkt hat eine **Bodenart**: Wasser, Waldboden, Schlamm, Wiese, Fels, Sand, Steinplatten (`src/data/terrain.ts`). Eine Kachel liegt zwischen 4 Eckpunkten und wird aus deren Bodenarten berechnet.

- Die Grenze zwischen zwei Bodenarten verläuft **bilinear** zwischen den Ecken: Ist nur eine Ecke anders, entsteht eine gerundete Ecke, bei zwei eine weiche Kante, bei drei eine gerundete Bucht.
- **Wasser und Land:** Die Uferlinie wellt leicht (`SHORE_WOBBLE`). Auf der Landseite liegt ein Ufer (trockener Sand → nasser Sand → dunkle Kante), auf der Wasserseite Schaum und flaches, helleres Wasser.
- **Zwei Landarten:** Die Grenze ist pixelig verzahnt.
- Jede vorkommende Kombination aus 4 Ecken wird beim ersten Bedarf in einen Atlas gezeichnet (Canvas-Textur, bis 1920 Kacheln). Volle Kacheln gibt es in 4 Varianten (Blumen, Laub, Pilze, Pfützen, Risse …).
- Phaser zeichnet jeden Chunk weiter als eigene Tilemap mit einer Ebene. Die Kachelnummern kommen jetzt aus dem Atlas.

**Begründung (Vorschlag Claude, offen):** Phaser kann keine Kachelübergänge von sich aus (kein Autotiling). Statt für jedes Paar von Bodenarten 16 oder 47 Übergangskacheln von Hand zu zeichnen, werden sie aus den Eckpunkten berechnet — das wächst mit jeder neuen Bodenart von selbst mit. Und die **Wasser-Kollision nutzt dieselbe Rechnung** (`Terrain.ts waterFieldAt`): Man stößt genau an der gezeichneten Uferlinie an.

~~Jedes Biom hat 4 Höhenstufen (Wasser/0, Flach/1, Hügel/2, Gipfel/3), je Chunk zufällig gewürfelt.~~ [VERWORFEN, 22. November 2026] Die Höhen waren nur Farbe, wirkten nicht aufs Spiel und passten an Chunk-Grenzen nicht zusammen.

### 2.2 Biom-Formen

Die Zonen-Tabelle (`BiomeDefinitions.ts WORLD_ZONES`) bleibt der Grundriss. Bevor ein Punkt darin nachgeschlagen wird, wird er mit Rauschen verschoben („Domain Warping“): grob bis 1700 px (Buchten, Zungen) und fein bis 320 px (ausgefranste Ränder). Biome laufen damit quer durch Chunks; das Biom eines Punkts liefert `biomeAtPoint(x, y, seed)`.

**Begründung (Vorschlag Claude, offen):** Zufällige Formen (Vorgabe), ohne den Aufbau der Welt zu verlieren — der Startwald liegt oben links, die Gefahr steigt nach außen. Rund um den Start ist bis über 1 Chunk alles Wald.

~~Ein Chunk hat genau ein Biom; Biome sind Rechtecke aus ganzen Chunks.~~ [VERWORFEN, 22. November 2026]

### 2.3 Wasser

- **Seen:** Rauschen über die ganze Welt; je Biom ein Schwellwert (`BIOME_WATER`). Anteil Wasser: Sumpf ≈ 36 %, Hochland ≈ 22 %, Wald ≈ 14 %, Gebirge ≈ 4 %, Wüste ≈ 2 % (Oasen), Ruinen 0 %.
- **Bäche:** schmale, gewundene Linien (Wald, Sumpf, Hochland) mit **Furten** — Stellen, an denen der Bach unterbrochen ist und man hinüberkommt.
- **Kollision:** Niemand betritt Wasser: weder der Blob noch die Wesen, auch nicht im Sprung (der Sprung endet vor dem Ufer). Es werden keine Wesen im Wasser platziert.
- Rund um den Startpunkt (360 px) gibt es kein Wasser.

**Begründung (Vorschlag Claude, offen):** Sumpf ist nass, Wald und Hochland haben Teiche und Bäche, Gebirge Bergseen, Wüsten selten eine Oase. Furten sorgen dafür, dass Bäche die Welt nicht in Inseln zerschneiden.

> Offen: Es ist nicht garantiert, dass jeder Ort erreichbar ist. Seen sind geschlossene Flächen, Bäche haben Furten; eingeschlossene Stellen sind möglich, aber selten. Bei Bedarf: Erreichbarkeit prüfen und Furten erzwingen.

### 2.4 Hindernisse

Größe aus dem echten Durchmesser auf der Wurzel-Skala, wie bei den Wesen (GDD-07 Abschnitt 1, `worldSizeFromLength`).

| Hindernis | echt | Radius | blockiert | Biome |
|-----------|------|--------|-----------|-------|
| Laubbaum (Stamm / Krone) | 40 cm / 6 m | 12 / 47 | alle | Wald |
| Birke | 25 cm / 3,8 m | 10 / 38 | alle | Hochland |
| Erle | 45 cm / 4,8 m | 13 / 42 | alle | Sumpf |
| Baumstumpf | 50 cm | 14 | alle | Wald, Sumpf |
| Stein | 60 cm | 15 | alle | Wald, Hochland, Gebirge, Wüste, Ruinen |
| Felsbrocken | 1,3 m | 22 | alle | Hochland, Gebirge |
| Kaktus | 35 cm | 11 | alle | Wüste |
| Säule | 90 cm | 18 | alle | Ruinen |
| Gestrüpp / Schilf / Dornbusch | 1 m / 70 cm / 80 cm | 19 / 16 / 17 | nur große Wesen (ab Größe 14) | Wald+Hochland / Sumpf / Wüste |
| Kiesel / Schutt | 4 cm / 8 cm | 4 / 5 | nur kleine Wesen (unter Größe 6) | überall / Ruinen |

- **Gestrüpp** (ab Größe 14 ≈ Blob-Radius 7,7): Mäuse und Spitzmäuse schlüpfen durch, Eidechse, Wiesel, Igel und der ausgewachsene Blob nicht.
- **Kiesel** (unter Größe 6 ≈ Blob-Radius 3,3): Ameisen, Marienkäfer, Spinnen und der frische Blob müssen herum; größere rollen darüber.
- **Verteilung:** zwei Raster (64 px für große, 32 px für kleine Hindernisse), höchstens eines je Zelle, ganz in der Zelle → Hindernisse überlappen nie. Rauschen erzeugt **Dickichte und Lichtungen** (`THICKET_*`). Nicht im Wasser, nicht am Ufer, nicht am Startpunkt (70 px).
- **Kollisionsradius** etwas kleiner als das Bild (85–95 %), Gestrüpp 80 %.
- **Zeichnen:** Steine, Stämme und Stümpfe liegen unter den Wesen; Baumkronen, Gestrüpp und Schilf darüber. Ist der Blob darunter, werden sie durchsichtig.

**Begründung (Vorschlag Claude, offen):**
- Echte Größe — derselbe Maßstab wie die Wesen; der winzige Blob am Anfang erlebt Bäume wie Häuser und hat mit Kieseln Hindernisse in seinem Maßstab.
- Zwei Schwellen (Gestrüpp blockiert Große, Kiesel blockieren Kleine) — jede Größe hat ihre eigenen Wege, und mit dem Wachsen ändert sich, wo man durchkommt: etwas Neues zu entdecken.
- Dickichte statt gleichmäßiger Verteilung — gleichmäßig wirkt wie ein Muster; durch Dickichte muss man einen Weg suchen (Vorgabe), Lichtungen geben Luft.
- Kronen durchsichtig — sonst verdecken sie den Blob und große Teile des Bildes, besonders am Anfang.
- **Zahlen offen:** Schwellen 14 und 6, Dichten je Biom, Größe des Startbereichs.

### 2.5 Bewegung mit Kollision

- Der Blob wird nicht mehr von der Phaser-Physik bewegt, sondern Schritt für Schritt mit Gelände und Hindernissen abgeglichen (`systems/CollisionSystem.ts moveWithCollision`).
- Trifft er auf ein Hindernis, versucht er es leicht gedreht (gleitet an runden Stämmen entlang) und dann entlang einer Achse (gleitet am Ufer entlang). Frontal gegen einen Stamm bleibt er stehen.
- **Wesen** weichen zusätzlich quer aus, so umrunden sie einen Stamm auf der Jagd. Eine echte Wegfindung gibt es nicht: In Sackgassen bleiben Verfolger hängen — dort kann man ihnen entkommen.
- **Sprung:** endet am letzten freien Punkt vor einem Hindernis oder dem Ufer.
- **Alte Spielstände:** Steht der Blob in Wasser oder Fels (die Welt ist neu), wird er zur nächsten freien Stelle geschoben. Dasselbe gilt, wenn er im Gestrüpp so groß wird, dass es ihn blockiert.

**Begründung (Vorschlag Claude, offen):** Gleiten genügt für einzelne Hindernisse und kostet wenig Rechenzeit. Eine Wegfindung (z. B. A*) wäre der nächste Schritt, falls Verfolger zu leicht hängen bleiben.

### 2.6 Wesen platzieren

Je Ziehung (64–112 je Chunk) wird zuerst eine Stelle gewürfelt, dann das Biom an dieser Stelle bestimmt und daraus das Wesen gezogen — die Spawns folgen den verbogenen Biomgrenzen. Ist die Stelle für das Wesen nicht frei (Wasser, blockierendes Hindernis), wird bis zu 6 Mal neu gesucht, sonst entfällt es.

### 2.7 Grafik

Alles wird beim Start im Code als Pixel-Art gezeichnet (`TilesetGenerator.ts`), keine Bilddateien: Boden mit Grasbüscheln, Blumen, Laub, Pilzen, Moospolstern und Pfützen, Fels mit Rissen und Flechten, Sand mit Rippeln und Muscheln, Steinplatten mit Fugen, Wasser mit Wellen und Glitzern. Hindernisse sind Kugelgruppen mit Licht von oben links, Farbstufen und dunkler Umrisslinie, mit Schatten. Texturen werden beim Zoomen scharf gezeigt (nächster Nachbar).

**Begründung (Vorschlag Claude, offen):** Das Spiel bleibt eine einzige HTML-Datei. Fremde Grafiken (craftpix) dürfen nach ihrer Lizenz meist nicht in einem öffentlichen Repository weitergegeben werden — sie dienen nur als Vorbild für Stil und Lesbarkeit.

### 2.8 Karte

Besuchte Chunks zeigen die Bodenarten fein (je nach Zoom bis 32 × 32 Felder je Chunk) — Biomgrenzen und Wasser sind zu sehen, Hindernisse nicht. ~~Ein Chunk = eine Biomfarbe~~ [VERWORFEN, 22. November 2026].

### 2.9 Leistung

Im Browser-Test (ohne Grafikkarte) läuft das Spiel mit etwa 8 % weniger Bildern pro Sekunde als vorher (49 statt 54). Ein Chunk hat je nach Biom 10–220 Hindernisse.

> Offen: Auf älteren Handys prüfen. Falls nötig: weniger Kiesel, Render-Radius verkleinern, oder Hindernisse außerhalb des Bildes ausblenden.

---

## 3. Etappe 2: Weltobjekte (Konzept)

> Status: Konzept — beauftragt, nach Etappe 1

- **Ameisenbau:** Ameisen kommen aus Ameisenbauten statt verstreut. Offen: Ob man den Bau zerstören, absorbieren oder analysieren kann; wie viele Ameisen ein Bau hat und wie schnell sie nachkommen.
- **Mauselöcher:** Mäuse kommen aus Mauselöchern. Offen: Ob kleine Wesen (unter einer Größe) hineinkönnen — Anschluss an Etappe 3 (Ebenen).
- **Verlassene Waldhütte** im Wald nahe dem Start, zunächst von außen (Kollision, Tür). Offen: Wie weit vom Start (sichtbar am ersten Tag oder erst nach etwas Erkunden?).
- Allgemein: Weltobjekte als neue Art neben Wesen und Hindernissen — fest platziert (Hütte) oder verteilt (Bauten, Löcher), mit Spawn-Punkt für bestimmte Wesen.

## 4. Etappe 3: Ebenen (Konzept)

> Status: Konzept — beauftragt, nach Etappe 2

- **Innenkarten:** Eingang (Höhlenloch, Tür) → eigene kleine Karte, Oberwelt ausgeblendet; beim Verlassen am Eingang wieder heraus.
- **Höhlen:** dunkel (Sicht wird wichtig, GDD-09), eigene Wesen.
- **Waldhütte:** betretbar.
- **Später:** Tauchen ins Wasser; Fische und Amphibien bewegen sich im Wasser (hebt die Wasser-Regel für sie auf).
- Offen: Wie Innenkarten gespeichert werden (fest oder aus dem Seed), ob niedergelassene Blobs in Innenkarten möglich sind, wie die Karte (Reiter KARTE) Ebenen zeigt.

---

## 5. Dateien

| Datei | Inhalt |
|-------|--------|
| `src/data/terrain.ts` | Bodenarten, Biom-Formen, Wasser, Hindernisarten mit echter Größe, Schwellen, Dichten — mit Begründungen |
| `src/world/Noise.ts` | Deterministisches Rauschen (Hash, Value-Noise, fBm, LCG) |
| `src/world/Terrain.ts` | Biom an einem Punkt, Bodenart an Eckpunkten, Wasseranteil, Hindernisse je Chunk, Kollision, freie Stelle |
| `src/systems/CollisionSystem.ts` | Bewegung mit Gleiten, Sprung bis zum Hindernis (ohne Gelände testbar) |
| `src/world/TilesetGenerator.ts` | Pixel-Art: Bodenmuster, Übergangskacheln im Atlas, Hindernis-Texturen |
| `src/world/WorldGenerator.ts` | Wesen je Chunk, frei von Wasser und Hindernissen |
| `src/world/ChunkManager.ts` | Tilemap und Hindernisse je Chunk, Kronen durchsichtig über dem Blob |

---

*Letzte Aktualisierung: 22. November 2026 — erste Fassung: Auftrag des Entwicklers, Etappe 1 umgesetzt (v0.10.0), Etappen 2 und 3 als Konzept*
