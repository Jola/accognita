# ABSORB & EVOLVE — Game Design Document
## Datei 09: Grundwerte, Bewegung, Sinne und Erwachen

> **Status: Implementiert (v0.7.0, 13. November 2026)** — außer Laufen (Abschnitt 2.4, Konzept).
> Stellschrauben mit Begründung: [`src/data/body.ts`](../src/data/body.ts), Skill-Werte: [`src/data/skills.ts`](../src/data/skills.ts), Logik: [`src/systems/BodySystem.ts`](../src/systems/BodySystem.ts), [`src/systems/IntroSystem.ts`](../src/systems/IntroSystem.ts). Alle Werte, Skalen und Formeln stehen im Spiel unter 📋 → INDEX → **Grundwerte**.

**Vorgabe (Entwickler, 13. November 2026):** Alle Eigenschaften, Skalen, Formeln und Beschreibungen werden im INDEX vermerkt.

---

## 1. Grundsatz

**Vorgabe (Entwickler):** Der Blob erwacht ohne Bewegung und ohne Sicht. Beides lernt er erst durch Analyze und Absorb. Damit gibt es eine Intro-Phase, in der der Bildschirm schwarz ist und nur Analyze und Absorb existieren.
**Begründung (Vorschlag Claude, übernommen):** Das Konzept des Spiels ist, dass man so gut wie alles lernen muss (GDD-03 Abschnitt 3). Biologisch passt das Erwachen aus dem Ruhestadium: *Physarum* kann austrocknen, überdauert als Sklerotium und erwacht mit Wasser wieder. GDD-03 erwähnt bereits den „vertrockneten Blob“.

Alle Grundwerte kommen aus Skills (GDD-02 Abschnitt 8.1). Der Körper (Wachsen, GDD-02 Abschnitt 8.10) liefert Größe, HP, MP und einen Größenbonus auf die Stärke.

| Wert | Körper (Wachsen) | Skills |
|---|---|---|
| MaxHP, MaxMP | Wachstum (wie bisher) | — |
| Größe, Reichweite | Wachstum (wie bisher) | — |
| **Stärke** | Größe: × 1 → × 2 | Kriechen, Krabbeln, Superstrength |
| **Geschick** | — | Kriechen, Krabbeln, Jump |
| **Tempo** | Größe als Faktor (gleiches Bildschirm-Tempo) | bester Bewegungs-Skill, ohne: 0 |
| **Sicht** | — | bester Seh-Skill: Lichtsinn, Facettenauge, Hauptaugen |

---

## 2. Bewegung

**Vorgabe (Entwickler):** Bewegen gibt Stärke und Geschick, die wie bei anderen Skills mit dem Fortschritt des Bewegungs-Skills wachsen. Das Tempo steigt mit dem Skill: am Anfang langsam, nach kurzer Zeit annehmbar schnell. Wurm und Schnecke geben Kriechen, Insekten geben Krabbeln, später kommt Laufen.

### 2.1 Regeln

```
Tempo     = Körperradius × 10 × bester Tempo-Faktor        (px/s; ohne Bewegungs-Skill 0)
Stärke    = Σ Stärke-Effekte × Größenfaktor                (Abschnitt 3)
Geschick  = Σ Geschick-Effekte                             (wie bisher)
Erfahrung = 0,5 XP je zurückgelegtem Körperradius, für den aktiven (schnellsten) Bewegungs-Skill
```
**Begründung (Vorschlag Claude, übernommen):**
- Beim Tempo zählt der beste Skill, nicht die Summe. Wer laufen kann, kriecht nicht zusätzlich.
- Stärke und Geschick werden summiert. Jeder Bewegungs-Skill trainiert andere Muskeln.
- Erfahrung bekommt der Skill, mit dem man sich bewegt. Gemessen wird in Körperradien, damit ein großer Blob nicht schneller lernt.

### 2.2 Werte (VORLÄUFIG)

| Skill | Lernen an | Lernaufwand | Tempo-Faktor | Stärke | Geschick |
|---|---|---:|---|---|---|
| Kriechen 🐌 | Regenwurm (35 %), Schnecke (50 %) | 5 | ×0,15 → ×0,6 | 0 → 1 | 0 → 1 |
| Krabbeln 🐞 | Ameise, Marienkäfer, Spinnen (15 %), Skorpione (12 %) | 10 | ×0,4 → ×1,0 | 0 → 3 | 0 → 3 |

×1,0 entspricht dem bisherigen Tempo des Blobs (10 Körperradien/s).
Kriechen erreicht durch Bewegen nach ≈ 20 s „Übung“ (20 %) und nach ≈ 110 s Natur (90 %), nachgerechnet mit den Spielfunktionen.

**Krabbeln** gibt es von allen Gliederfüßern, nicht nur von Insekten.
**Begründung (Vorschlag Claude, übernommen):** Spinnen und Skorpione sind keine Insekten, bewegen sich aber genauso auf gegliederten Beinen.

### 2.3 Gegner

Gegner bewegen sich weiter mit ihrem Tempo aus `entities.ts`. Sie haben keine Erfahrung in Kriechen oder Krabbeln. Sonst bekämen sie Stärke und Geschick, und ihr Tempo widerspräche „gleiche Skills, gleiche Wirkung“ (GDD-02 Abschnitt 8.6).
> Offen: Sollen Gegner Bewegungs-Skills bekommen und ihr Tempo daraus ableiten?

### 2.4 Laufen — Status: Konzept

> Status: Konzept

Laufen wäre der schnellste Bewegungs-Skill, zum Beispiel Tempo ×0,7 → ×1,5, Stärke 0 → 5, Geschick 0 → 3. Er wird von Wirbeltieren mit Beinen gelernt, die es noch nicht gibt (Maus, Eidechse … GDD-07). Die Schlange schlängelt, der Drache ist zu weit entfernt.

---

## 3. Stärke aus der Körpergröße

**Vorgabe (Entwickler):** Die Körpergröße erhöht die Stärke prozentual.
**Begründung (Vorschlag Claude, übernommen):** Ein größerer Körper hat mehr Muskelmasse. Ohne trainierte Muskeln (Bewegung, Superstrength) gibt es nichts, was die Größe verstärken könnte.

```
Stärke = (Σ Stärke-Effekte der eingeschalteten Passiv-Skills) × (1 + 100 % × min(1, Wachstum / 19))
```
Wachstum 19 entspricht der vollen Größe (balance.ts). Der Bonus gilt nur für den Blob, denn Gegner haben kein Wachstum.

**Stärke-Skala:** Kriechen 1 + Krabbeln 3 + Superstrength 10 = 14 aus Skills, bei voller Größe × 2 = 28.
Daraus folgt der Bonus je Punkt bei Biss, Klauenhieb und Zangengriff: **+4 %** (VORLÄUFIG). [VERWORFEN, 13. November 2026] +8 % bei Stärke 0–10 (GDD-02 Abschnitt 8.11).

---

## 4. Sehen

**Vorgabe (Entwickler):** Sehen wird erst gelernt, mit dem Übergang von Schwarz über Schwarz-Weiß zu Farbe.
**Begründung (Vorschlag Claude, übernommen):** Farbsehen braucht mehrere Sorten Lichtsinneszellen. Mit einer Sorte sieht man nur hell und dunkel, also Graustufen, wie Menschen nachts. Insekten sehen UV, Blau und Grün, aber kaum Rot. Springspinnen haben die schärfsten Augen der Kleintiere, manche Arten sehen Rot.

### 4.1 Regeln

```
Sichtweite = bester Effekt „Sichtweite“ (Körperradien; ohne Seh-Skill 0 → alles schwarz)
Farbe      = bester Effekt „Farbsehen“  (0 = Graustufen, 1 = Farbe ohne Rot)
Rot        = bester Effekt „Rot sehen“  (0 = Rot erscheint dunkel, 1 = volle Farbe)
Bild       = lerp(Graustufen, lerp(ohne Rot, volle Farbe, Rot), Farbe)   — Farbmatrix auf der Kamera
Erfahrung  = 0,5 XP je Sekunde für jeden eingeschalteten Seh-Skill
```
Außerhalb der Sichtweite ist es schwarz, der äußere Rand (35 %) geht weich über. Der Blob selbst bleibt sichtbar, denn er spürt sich. Der Farbfilter braucht WebGL. Ohne WebGL gilt nur die Sichtweite.

### 4.2 Werte (VORLÄUFIG)

| Stufe | Skill | Lernen an | Sichtweite | Farbe | Rot | Lernaufwand |
|---|---|---|---|---|---|---:|
| 0 | — | — | 0 (schwarz) | — | — | — |
| 1 | Lichtsinn 🌗 | Regenwurm (50 %), Schnecke (35 %) | 2 → 10 | 0 (Graustufen) | 0 | 8 |
| 2 | Facettenauge 🪲 | Ameise (10 %), Marienkäfer (12 %) | 6 → 25 | 0 → 100 % | 0 | 12 |
| 3 | Hauptaugen 🕷️ | Springspinne (12 %) | 10 → 40 | 50 → 100 % | 0 → 100 % | 15 |
| später | Wärmesicht | Schlange | — | — | — | — (Konzept) |

Der Übergang zu Farbe ist fließend: Mit dem Fortschritt von Facettenauge kommt die Farbe ins Bild. Rot erscheint erst mit den Hauptaugen, was bei Feuer und Drache auffällt.

---

## 5. Erwachen (Intro)

**Vorgabe (Entwickler):** Am Anfang ist der Bildschirm schwarz, nur Analyze und Absorb existieren, und einige Texte erklären, was geschieht. Dafür müssen sich in der Nähe Einheiten aufhalten, an denen der Blob Sehen und Bewegen lernen kann.

### 5.1 Ablauf

1. **Schwarz, unbeweglich.** Text: Der Blob erwacht aus der Trockenstarre und spürt etwas neben sich. Die Nearby-Anzeige zeigt „❓ Etwas“ ohne Namen und Werte. Meldungen nennen „Etwas“ statt des Namens.
2. **Lichtsinn gelernt:** Graustufen, ein kleiner Sichtkreis. Text: Lerne, wie man kriecht.
3. **Kriechen gelernt:** Joystick wirkt. Text: Lerne, Licht zu spüren.
4. **Beides gelernt:** Hinweis auf Gras und Wachsen, der Text verblasst nach 9 s.

Der Schritt folgt allein aus den Skills (`IntroSystem.getIntroStep`). Es gibt keinen eigenen Zustand und nichts zu speichern.

### 5.2 Das Nest

In Chunk (0, 0) liegen fest neben dem Startpunkt (400, 300): ein Regenwurm (Abstand 5 px) und eine Schnecke (≈ 6 px), beide in Reichweite eines frischen Blobs (Radius 2, Reichweite 2,5 Radien bis zum Rand). Dazu kommen drei Grashalme etwas weiter weg, erreichbar sobald der Blob kriecht (`BiomeDefinitions.START_NEST_SPAWNS`).

**Gegen Hängenbleiben** (Begründung (Vorschlag Claude, übernommen)):
- Regenwurm und Schnecke greifen nie an (`behavior: passive`).
- Absorb und Analyze gelingen gegen Stufe 1 immer.
- Fundchancen 35–50 %.
- Respawn nach 10 s am selben Ort.

Ein garantierter Fund nach X Versuchen ist nicht eingebaut. Mit zwei Wesen und diesen Chancen ist die Wahrscheinlichkeit, nach 10 Versuchen noch nichts gelernt zu haben, sehr klein.
> Offen: Soll es zusätzlich einen garantierten Fund geben?

Regenwurm und Schnecke kommen auch in der Welt vor: Wald (je Gewicht 6), Sumpf (Schnecke 8, Wurm 4).

### 5.3 Alte Spielstände

Spielstand-Version 5: Wer schon spielte, konnte sich bewegen und farbig sehen. Diese Spielstände bekommen Kriechen, Krabbeln, Lichtsinn, Facettenauge und Hauptaugen auf Natur. Danach ist das Tempo ×0,94 statt ×1,0, die Sichtweite 37 Körperradien, die Farbe 95 %, Rot 90 %.

---

## 6. Offene Punkte

- Alle Zahlen sind VORLÄUFIG: Tempo, Sichtweiten, Lernaufwände, Fundchancen, Erfahrung je Strecke und Sekunde, Bonus je Stärke-Punkt.
- Laufen und Wärmesicht (Konzept).
- Bewegungs-Skills für Gegner (Abschnitt 2.3).
- Garantierter Fund im Erwachen (Abschnitt 5.2).
- Darstellung (Dunkelheit, Farbfilter) im Browser prüfen, besonders auf älteren Handys ohne WebGL.

---

*Letzte Aktualisierung: 13. November 2026 — Datei neu angelegt: Grundwerte, Bewegung (Kriechen, Krabbeln), Stärke aus Größe, Sehen (Lichtsinn, Facettenauge, Hauptaugen), Erwachen mit Nest*
