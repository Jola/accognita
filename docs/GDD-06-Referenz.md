# ABSORB & EVOLVE — Game Design Document
## Datei 06: Referenz — Alle Skills und Einheiten

> **Automatisch generiert** aus `src/data/` durch `scripts/gen-reference.ts` (läuft bei jedem `node build.js`).
> Nicht von Hand bearbeiten — Änderungen gehören in die Datendateien.

Werte in HP/MP sind Anzeige-Einheiten (intern ×1000, siehe [GDD-05](GDD-05-Kampfmathematik.md)).
Analyze-Chancen = Absorb-Chance × 0,7. Level-Spalten zeigen Lv 1, 2, 3, 5, 10, 20.

**Inhalt:** [1. Skills](#1-skills) · [2. Einheiten](#2-einheiten)

---

## 1. Skills

| Skill | ID | Kategorie | Aktivierung | Element | Max-Lv | XP Lv1→2 | XP-Faktor | MP | Cooldown | Angriffsart | Schadenstyp | Basisschaden | Effekte |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ♾️ Infinite Storage | [`infinite_storage`](#infinite-storage) | Kern | passiv | none | 1 | 999999 | ×1 | — | — | — | — | — | 0 |
| 🔍 Analyze | [`analyze`](#analyze) | Kern | aktiv | none | 20 | 10 | ×1,5 | — | — | — | — | — | 0 |
| 💥 Absorb | [`absorb`](#absorb) | Kern | aktiv | none | 20 | 10 | ×1,5 | — | — | — | — | — | 0 |
| 🛡️ Chitin Armor | [`chitin_armor`](#chitin-armor) | Basis | passiv | earth | ∞ | 12 | ×1,5 | — | — | — | — | — | 5 |
| 💪 Superstrength | [`superstrength`](#superstrength) | Basis | passiv | none | ∞ | 15 | ×1,5 | — | — | — | — | — | 1 |
| 🕷️ Venom | [`venom`](#venom) | Basis | passiv | poison | ∞ | 15 | ×1,5 | — | — | — | — | — | 1 |
| 🦷 Biss | [`bite`](#bite) | Basis | aktiv | none | ∞ | 12 | ×1,5 | 3 | 1,2 s | melee | Stich | 7 HP | 0 |
| 🦘 Jump | [`jump`](#jump) | Basis | aktiv | none | ∞ | 12 | ×1,5 | 4 | 1,8 s | dash | — | — | 0 |
| 🦅 Klauenhieb | [`claw`](#claw) | Basis | aktiv | none | ∞ | 15 | ×1,5 | 5 | 1,5 s | melee | Schnitt | 8 HP | 0 |
| 🔥 Feueratem | [`fire_breath`](#fire-breath) | Basis | aktiv | fire | ∞ | 25 | ×1,5 | 8 | 2,5 s | ranged_projectile | Feuer | 10 HP | 0 |
| 🐞 Hemolymph | [`hemolymph`](#hemolymph) | Basis | passiv | poison | ∞ | 12 | ×1,5 | — | — | — | — | — | 1 |
| ☀️ Photosynthesis | [`photosynthesis`](#photosynthesis) | Basis | passiv | nature | ∞ | 15 | ×1,5 | — | — | — | — | — | 0 |

### ♾️ Infinite Storage

<a id="infinite-storage"></a>

> Der Blob-Körper ist ein dimensionales Lager ohne Kapazitätsgrenze. Alle gesammelten Materialien werden unbegrenzt gespeichert. Mengen bis Number.MAX_SAFE_INTEGER (~9 Quadrillionen) werden unterstützt.

| Parameter | Wert |
|---|---|
| ID | `infinite_storage` |
| Kategorie / Aktivierung | Kern / passiv |
| Element | none |
| Max-Level | 1 |
| XP-Schwelle | 999999 XP für Lv1→2, danach ×1 pro Level |

### 🔍 Analyze

<a id="analyze"></a>

> Analysiert eine Entität. Entität bleibt erhalten. +1 XP pro entdecktem Skill. Fehlschlag: neutrale Wesen bleiben friedlich, feindliche greifen an.

| Parameter | Wert |
|---|---|
| ID | `analyze` |
| Kategorie / Aktivierung | Kern / aktiv |
| Element | none |
| Max-Level | 20 |
| XP-Schwelle | 10 XP für Lv1→2, danach ×1,5 pro Level |

### 💥 Absorb

<a id="absorb"></a>

> Absorbiert eine Entität. Entität verschwindet (respawnt). +3 XP pro entdecktem Skill. Liefert auch Materialien. Fehlschlag: neutrale und feindliche Wesen greifen an.

| Parameter | Wert |
|---|---|
| ID | `absorb` |
| Kategorie / Aktivierung | Kern / aktiv |
| Element | none |
| Max-Level | 20 |
| XP-Schwelle | 10 XP für Lv1→2, danach ×1,5 pro Level |

### 🛡️ Chitin Armor

<a id="chitin-armor"></a>

> Passiv: Zieht eine harte Chitinschicht über die Außenhaut. Schützt gegen Stiche und Schnitte (Flat-Block), dämpft Wucht (%-Reduktion), ist aber anfällig für Feuer und Säure. Quelle: Ameisen (Lv1) und Spinnen (Lv2).

| Parameter | Wert |
|---|---|
| ID | `chitin_armor` |
| Kategorie / Aktivierung | Basis / passiv |
| Element | earth |
| Max-Level | unbegrenzt |
| XP-Schwelle | 12 XP für Lv1→2, danach ×1,5 pro Level |

**Effekte**

| Auslöser | Bedingung | Wirkung | Formel | Lv1 | Lv2 | Lv3 | Lv5 | Lv10 | Lv20 | Begründung |
|---|---|---|---|---|---|---|---|---|---|---|
| bei erlittenem Schaden | Stich | Flat-Block | 3 + 3·√(L−1) | 3 HP | 6 HP | 7,24 HP | 9 HP | 12 HP | 16,08 HP | Chitin ist hart und spröde — Stiche stoppen an der Oberfläche. Sqrt-Kurve: frühe Level sehr effektiv, höhere Level Diminishing Returns. |
| bei erlittenem Schaden | Schnitt | Flat-Block | 2 + 2·√(L−1) | 2 HP | 4 HP | 4,83 HP | 6 HP | 8 HP | 10,72 HP | Klingen können entlang der Plattenränder eindringen — weniger Schutz als gegen Stiche. |
| bei erlittenem Schaden | Wucht | %-Reduktion | 0,03 + 0,03·(L−1) | 3 % | 6 % | 9 % | 15 % | 30 % | 60 % | Erschütterung wird durch das starre Chitin weitergeleitet. Dämpfung ist gering — Chitin ist kein Stoßdämpfer. |
| bei erlittenem Schaden | Feuer | Schwäche | 1,3 (konstant) | ×1,3 | ×1,3 | ×1,3 | ×1,3 | ×1,3 | ×1,3 | Chitin ist organisch und brennt leicht. Kein Level-Scaling — diese Schwäche ist eine inhärente Materialeigenschaft. |
| bei erlittenem Schaden | Säure | Schwäche | 1,5 (konstant) | ×1,5 | ×1,5 | ×1,5 | ×1,5 | ×1,5 | ×1,5 | Säure zersetzt Chitin chemisch. Kritische Schwachstelle. |

**Entdeckbar bei**

| Einheit | Level | Absorb | Analyze |
|---|---|---|---|
| 🐜 Ameise | Lv1 | 15 % | 10,5 % |
| 🕷️ Springspinne | Lv2 | 10 % | 7 % |
| 🕸️ Giftspinne | Lv2 | 8 % | 5,6 % |
| 🦂 Kleiner Skorpion | Lv3 | 25 % | 17,5 % |
| 🦂 Großer Skorpion | Lv4 | 30 % | 21 % |

**Von Einheiten genutzt:** 🐜 Ameise (Lv1), 🕷️ Springspinne (Lv3), 🕸️ Giftspinne (Lv3), 🦂 Kleiner Skorpion (Lv5), 🦂 Großer Skorpion (Lv8)

### 💪 Superstrength

<a id="superstrength"></a>

> Passiv: Ameisen tragen das 50-fache ihres Körpergewichts — der Blob übernimmt diese Stärke. Verstärkt den Nahkampf-Angriff des Blobs. Lv1: +30%, +5% pro Level.

| Parameter | Wert |
|---|---|
| ID | `superstrength` |
| Kategorie / Aktivierung | Basis / passiv |
| Element | none |
| Max-Level | unbegrenzt |
| XP-Schwelle | 15 XP für Lv1→2, danach ×1,5 pro Level |

**Effekte**

| Auslöser | Bedingung | Wirkung | Formel | Lv1 | Lv2 | Lv3 | Lv5 | Lv10 | Lv20 | Begründung |
|---|---|---|---|---|---|---|---|---|---|---|
| bei Treffer | — | Schadens-Multiplikator | 1,3 + 0,05·(L−1) | ×1,3 | ×1,35 | ×1,4 | ×1,5 | ×1,75 | ×2,25 | Ameisen tragen das 50-fache ihres Körpergewichts. Lineare Skalierung: Lv1 = 1.30×, Lv5 = 1.50×, Lv10 = 1.75×. |

**Entdeckbar bei**

| Einheit | Level | Absorb | Analyze |
|---|---|---|---|
| 🐜 Ameise | Lv1 | 10 % | 7 % |

### 🕷️ Venom

<a id="venom"></a>

> Passiv: Jeder Nahkampftreffer des Blobs hat eine Chance, dem Ziel Gift zu injizieren. Lv1: 30% Chance, 2 Schaden/s für 4s. +5% Chance und +0.5 Schaden/s pro Level.

| Parameter | Wert |
|---|---|
| ID | `venom` |
| Kategorie / Aktivierung | Basis / passiv |
| Element | poison |
| Max-Level | unbegrenzt |
| XP-Schwelle | 15 XP für Lv1→2, danach ×1,5 pro Level |

**Effekte**

| Auslöser | Bedingung | Wirkung | Formel | Lv1 | Lv2 | Lv3 | Lv5 | Lv10 | Lv20 | Begründung |
|---|---|---|---|---|---|---|---|---|---|---|
| bei Treffer | — | Status-Chance | 0,3 + 0,05·(L−1) | 30 % | 35 % | 40 % | 50 % | 75 % | 125 % | Giftdrüsen injizieren Gift bei Treffer. Chance: 30% + 5%×(level-1). |
|  |  | ↳ DOT 4 s alle 1 s: Schaden/Tick | 2 + 0,5·(L−1) | 2 HP | 2,5 HP | 3 HP | 4 HP | 6,5 HP | 11,5 HP |  |

**Entdeckbar bei**

| Einheit | Level | Absorb | Analyze |
|---|---|---|---|
| 🕸️ Giftspinne | Lv2 | 20 % | 14 % |
| 🦂 Kleiner Skorpion | Lv3 | 25 % | 17,5 % |
| 🦂 Großer Skorpion | Lv4 | 30 % | 21 % |
| 🐍 Schlange | Lv10 | 30 % | 21 % |

**Von Einheiten genutzt:** 🕸️ Giftspinne (Lv3), 🦂 Kleiner Skorpion (Lv5), 🦂 Großer Skorpion (Lv8), 🐍 Schlange (Lv15)

### 🦷 Biss

<a id="bite"></a>

> Aktiv: Gezielter Biss — verursacht direkten Stich-Schaden (7 HP Basis). Ist Venom bekannt, hat jeder Biss zusätzliche Chance das Ziel zu vergiften. Höheres Level = stärkerer Biss. MP-Kosten: 3.

| Parameter | Wert |
|---|---|
| ID | `bite` |
| Kategorie / Aktivierung | Basis / aktiv |
| Element | none |
| Max-Level | unbegrenzt |
| XP-Schwelle | 12 XP für Lv1→2, danach ×1,5 pro Level |
| MP-Kosten | 3 MP |
| Cooldown | 1,2 s |
| Angriffsart | melee |
| Schadenstyp | Stich (`pierce`) |
| Basisschaden | 7 HP |

**Werte nach Level**

| Wert | Lv1 | Lv2 | Lv3 | Lv5 | Lv10 | Lv20 |
|---|---|---|---|---|---|---|
| Schaden (HP) | 7 | 7,7 | 9,45 | 10,85 | 14,35 | 21,35 |

**Entdeckbar bei**

| Einheit | Level | Absorb | Analyze |
|---|---|---|---|
| 🐜 Ameise | Lv1 | 12 % | 8,4 % |
| 🕷️ Springspinne | Lv2 | 15 % | 10,5 % |
| 🕸️ Giftspinne | Lv2 | 15 % | 10,5 % |
| 🦂 Kleiner Skorpion | Lv3 | 10 % | 7 % |
| 🦂 Großer Skorpion | Lv4 | 15 % | 10,5 % |
| 🐉 Drache | Lv20 | 10 % | 7 % |
| 🐍 Schlange | Lv10 | 30 % | 21 % |

**Von Einheiten genutzt:** 🐜 Ameise (Lv1), 🕷️ Springspinne (Lv2), 🕸️ Giftspinne (Lv1), 🦂 Kleiner Skorpion (Lv6), 🦂 Großer Skorpion (Lv18), 🐍 Schlange (Lv15)

### 🦘 Jump

<a id="jump"></a>

> Aktiv: Springt 160px in Bewegungsrichtung — überwindet Hindernisse und erzeugt Distanz. Höheres Level = größere Sprungweite. MP-Kosten: 4.

| Parameter | Wert |
|---|---|
| ID | `jump` |
| Kategorie / Aktivierung | Basis / aktiv |
| Element | none |
| Max-Level | unbegrenzt |
| XP-Schwelle | 12 XP für Lv1→2, danach ×1,5 pro Level |
| MP-Kosten | 4 MP |
| Cooldown | 1,8 s |
| Angriffsart | dash |

**Werte nach Level**

| Wert | Lv1 | Lv2 | Lv3 | Lv5 | Lv10 | Lv20 |
|---|---|---|---|---|---|---|
| Sprungweite (px) | 160 | 180 | 200 | 240 | 340 | 540 |

**Entdeckbar bei**

| Einheit | Level | Absorb | Analyze |
|---|---|---|---|
| 🕷️ Springspinne | Lv2 | 20 % | 14 % |

### 🦅 Klauenhieb

<a id="claw"></a>

> Aktiv: Ein mächtiger Nahkampfhieb mit scharfen Klauen (8 HP Basis-Schaden, Schnitt). Höheres Level = stärkerer Hieb. MP-Kosten: 5.

| Parameter | Wert |
|---|---|
| ID | `claw` |
| Kategorie / Aktivierung | Basis / aktiv |
| Element | none |
| Max-Level | unbegrenzt |
| XP-Schwelle | 15 XP für Lv1→2, danach ×1,5 pro Level |
| MP-Kosten | 5 MP |
| Cooldown | 1,5 s |
| Angriffsart | melee |
| Schadenstyp | Schnitt (`slash`) |
| Basisschaden | 8 HP |

**Werte nach Level**

| Wert | Lv1 | Lv2 | Lv3 | Lv5 | Lv10 | Lv20 |
|---|---|---|---|---|---|---|
| Schaden (HP) | 8 | 8,8 | 10,8 | 12,4 | 16,4 | 24,4 |

**Entdeckbar bei**

| Einheit | Level | Absorb | Analyze |
|---|---|---|---|
| 🐉 Drache | Lv20 | 30 % | 21 % |

**Von Einheiten genutzt:** 🐉 Drache (Lv20)

### 🔥 Feueratem

<a id="fire-breath"></a>

> Aktiv: Fernkampf-Angriff — ein Strom lodernder Flammen über 8× Körpergröße Distanz. Verursacht Feuer-Schaden (10 HP Basis) — schmilzt Chitin-Panzer. MP-Kosten: 8.

| Parameter | Wert |
|---|---|
| ID | `fire_breath` |
| Kategorie / Aktivierung | Basis / aktiv |
| Element | fire |
| Max-Level | unbegrenzt |
| XP-Schwelle | 25 XP für Lv1→2, danach ×1,5 pro Level |
| MP-Kosten | 8 MP |
| Cooldown | 2,5 s |
| Angriffsart | ranged_projectile |
| Schadenstyp | Feuer (`fire`) |
| Basisschaden | 10 HP |

**Werte nach Level**

| Wert | Lv1 | Lv2 | Lv3 | Lv5 | Lv10 | Lv20 |
|---|---|---|---|---|---|---|
| Schaden (HP) | 10 | 11 | 13,5 | 15,5 | 20,5 | 30,5 |

**Entdeckbar bei**

| Einheit | Level | Absorb | Analyze |
|---|---|---|---|
| 🐉 Drache | Lv20 | 40 % | 28 % |

**Von Einheiten genutzt:** 🐉 Drache (Lv20)

### 🐞 Hemolymph

<a id="hemolymph"></a>

> Passiv: Wird der Blob getroffen, gibt er bitteres Hämolymph ab — der Angreifer erleidet Sofortschaden (2 HP pro Level). Höheres Level = stärkerer Rückschlag.

| Parameter | Wert |
|---|---|
| ID | `hemolymph` |
| Kategorie / Aktivierung | Basis / passiv |
| Element | poison |
| Max-Level | unbegrenzt |
| XP-Schwelle | 12 XP für Lv1→2, danach ×1,5 pro Level |

**Effekte**

| Auslöser | Bedingung | Wirkung | Formel | Lv1 | Lv2 | Lv3 | Lv5 | Lv10 | Lv20 | Begründung |
|---|---|---|---|---|---|---|---|---|---|---|
| bei erlittenem Schaden | — | Rückschlag | 2 + 2·(L−1) | 2 HP | 4 HP | 6 HP | 10 HP | 20 HP | 40 HP | Bitteres Hämolymph tritt aus und verletzt den Angreifer beim Kontakt. Lv1 = 2 HP, Lv3 = 6 HP, linear mit Level. |

**Entdeckbar bei**

| Einheit | Level | Absorb | Analyze |
|---|---|---|---|
| 🐞 Marienkäfer | Lv1 | 15 % | 10,5 % |

**Von Einheiten genutzt:** 🐞 Marienkäfer (Lv1)

### ☀️ Photosynthesis

<a id="photosynthesis"></a>

> Passiv: Regeneriert langsam HP, solange der Blob sich nicht kämpfend fortbewegt. Wirkt automatisch nach Entdeckung. Höheres Level = stärkere Regeneration.

| Parameter | Wert |
|---|---|
| ID | `photosynthesis` |
| Kategorie / Aktivierung | Basis / passiv |
| Element | nature |
| Max-Level | unbegrenzt |
| XP-Schwelle | 15 XP für Lv1→2, danach ×1,5 pro Level |

**Werte nach Level**

| Wert | Lv1 | Lv2 | Lv3 | Lv5 | Lv10 | Lv20 |
|---|---|---|---|---|---|---|
| Heilung (HP/s) | 0,5 | 1 | 1,5 | 2,5 | 5 | 10 |

**Entdeckbar bei**

| Einheit | Level | Absorb | Analyze |
|---|---|---|---|
| 🌿 Gras | Lv1 | 12 % | 8,4 % |

---

## 2. Einheiten

| Einheit | ID | Kategorie | Lv | Seltenheit | Verhalten | Gesinnung | HP | Tempo | Größe | Aggro-Radius | Reichweite | Angriffs-CD | Nahkampf | Respawn | Vorkommen |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 🌿 Gras | [`grass`](#grass) | Pflanze | 1 | häufig | passiv | neutral | — | — | 5 | — | — | — | — | 60 s | Wald (42,9 %), Sumpf (50 %) |
| 🐜 Ameise | [`ant`](#ant) | Kreatur | 1 | häufig | defensiv | neutral | 8 | 15 | 3 | 8 | 6 | 1,8 s | 7 Stich | 30 s | Wald (28,6 %), Hochland (38,5 %), Wüste (34,8 %) |
| 🐞 Marienkäfer | [`ladybug`](#ladybug) | Kreatur | 1 | häufig | defensiv | neutral | 6 | 20 | 4 | 10 | 8 | 2 s | — | 35 s | Wald (28,6 %) |
| 🕷️ Springspinne | [`jumping_spider`](#jumping-spider) | Kreatur | 2 | häufig | aggressiv | feindlich | 18 | 30 | 6 | 15 | 12 | 1,2 s | 7,7 Stich | 45 s | Hochland (38,5 %), Gebirge (38,5 %), Dungeon (30,3 %) |
| 🕸️ Giftspinne | [`poison_spider`](#poison-spider) | Kreatur | 2 | ungewöhnlich | aggressiv | feindlich | 15 | 30 | 6 | 15 | 12 | 1,6 s | 7 Stich | 50 s | Sumpf (50 %), Gebirge (38,5 %), Dungeon (30,3 %) |
| 🦂 Kleiner Skorpion | [`small_scorpion`](#small-scorpion) | Kreatur | 3 | ungewöhnlich | aggressiv | feindlich | 30 | 35 | 7 | 18 | 14 | 1,4 s | 11,55 Stich | 60 s | Hochland (23,1 %), Gebirge (23,1 %), Wüste (34,8 %) |
| 🦂 Großer Skorpion | [`large_scorpion`](#large-scorpion) | Kreatur | 4 | selten | aggressiv | feindlich | 55 | 50 | 10 | 25 | 20 | 1,6 s | 19,95 Stich | 120 s | Wüste (21,7 %), Dungeon (24,2 %) |
| 🐉 Drache | [`dragon`](#dragon) | Kreatur | 20 | legendär | aggressiv | feindlich | 500 | 35 | 20 | 50 | 40 | 1,8 s | 24,4 Schnitt | 600 s | Dungeon (3 %) |
| 🐍 Schlange | [`snake`](#snake) | Kreatur | 10 | selten | aggressiv | feindlich | 120 | 60 | 12 | 30 | 24 | 1,2 s | 17,85 Stich | 180 s | Wüste (8,7 %), Dungeon (12,1 %) |

Fehlende Werte nutzen im Spiel Standardwerte: Tempo 60 px/s, Reichweite 60 px, Angriffs-CD 1,5 s, Aggro-Radius 2,5 × Weltgröße.
Vorkommen in % = Anteil am Spawn-Gewicht des Bioms.

### 🌿 Gras

<a id="grass"></a>

| Parameter | Wert |
|---|---|
| ID | `grass` |
| Kategorie / Seltenheit | Pflanze / häufig |
| Level | 1 |
| Verhalten / Gesinnung | passiv / neutral |
| HP | — |
| Tempo | — |
| Weltgröße | 5 |
| Interaktionsradius | 50 px |
| Respawn | 60 s |
| Vorkommen | Wald (42,9 %), Sumpf (50 %) |

**Skill-Drops**

| Skill | Absorb | Analyze |
|---|---|---|
| ☀️ Photosynthesis ([`photosynthesis`](#photosynthesis)) | 12 % | 8,4 % |

**Material-Drops**

| Material | Menge | Chance |
|---|---|---|
| 🌿 Pflanzenfaser | 1–3 | 100 % |

### 🐜 Ameise

<a id="ant"></a>

| Parameter | Wert |
|---|---|
| ID | `ant` |
| Kategorie / Seltenheit | Kreatur / häufig |
| Level | 1 |
| Verhalten / Gesinnung | defensiv / neutral |
| HP | 8 HP |
| Tempo | 15 px/s |
| Weltgröße | 3 |
| Interaktionsradius | 35 px |
| Respawn | 30 s |
| Aggro-Radius | 8 px |
| Angriffsreichweite | 6 px |
| Angriffs-Cooldown | 1,8 s |
| Angriffsart | melee |
| Vorkommen | Wald (28,6 %), Hochland (38,5 %), Wüste (34,8 %) |

**Skills:** 🦷 Biss Lv1, 🛡️ Chitin Armor Lv1

**Nahkampf:** 7 HP Stich alle 1,8 s ≈ 3,89 HP/s (vor Rüstung des Ziels)

**Verteidigung nach Schadenstyp**

| Schadenstyp | Flat-Block | Reduktion | Faktor | Immun |
|---|---|---|---|---|
| Stich | 3 HP | — | — | — |
| Schnitt | 2 HP | — | — | — |
| Wucht | — | 3 % | — | — |
| Säure | — | — | ×1,5 | — |
| Feuer | — | — | ×1,3 | — |

**Bonus-Level (Entity-Leveling)**

| Bonus | HP | Nahkampf | Tempo |
|---|---|---|---|
| +0 | 8 HP | 7 HP | 15 px/s |
| +1 | 10 HP | 8,75 HP | 19 px/s |
| +2 | 12,5 HP | 10,94 HP | 23 px/s |
| +3 | 15,63 HP | 13,67 HP | 29 px/s |

**Skill-Drops**

| Skill | Absorb | Analyze |
|---|---|---|
| 🦷 Biss ([`bite`](#bite)) | 12 % | 8,4 % |
| 🛡️ Chitin Armor ([`chitin_armor`](#chitin-armor)) | 15 % | 10,5 % |
| 💪 Superstrength ([`superstrength`](#superstrength)) | 10 % | 7 % |

### 🐞 Marienkäfer

<a id="ladybug"></a>

| Parameter | Wert |
|---|---|
| ID | `ladybug` |
| Kategorie / Seltenheit | Kreatur / häufig |
| Level | 1 |
| Verhalten / Gesinnung | defensiv / neutral |
| HP | 6 HP |
| Tempo | 20 px/s |
| Weltgröße | 4 |
| Interaktionsradius | 35 px |
| Respawn | 35 s |
| Aggro-Radius | 10 px |
| Angriffsreichweite | 8 px |
| Angriffs-Cooldown | 2 s |
| Angriffsart | melee |
| Vorkommen | Wald (28,6 %) |

**Skills:** 🐞 Hemolymph Lv1

**Rückschlag bei erlittenem Treffer:** 2 HP

**Bonus-Level (Entity-Leveling)**

| Bonus | HP | Nahkampf | Tempo |
|---|---|---|---|
| +0 | 6 HP | 0 HP | 20 px/s |
| +1 | 7,5 HP | 0 HP | 25 px/s |
| +2 | 9,38 HP | 0 HP | 31 px/s |
| +3 | 11,72 HP | 0 HP | 39 px/s |

**Skill-Drops**

| Skill | Absorb | Analyze |
|---|---|---|
| 🐞 Hemolymph ([`hemolymph`](#hemolymph)) | 15 % | 10,5 % |

### 🕷️ Springspinne

<a id="jumping-spider"></a>

| Parameter | Wert |
|---|---|
| ID | `jumping_spider` |
| Kategorie / Seltenheit | Kreatur / häufig |
| Level | 2 |
| Verhalten / Gesinnung | aggressiv / feindlich |
| HP | 18 HP |
| Tempo | 30 px/s |
| Weltgröße | 6 |
| Interaktionsradius | 40 px |
| Respawn | 45 s |
| Aggro-Radius | 15 px |
| Angriffsreichweite | 12 px |
| Angriffs-Cooldown | 1,2 s |
| Angriffsart | charge |
| Vorkommen | Hochland (38,5 %), Gebirge (38,5 %), Dungeon (30,3 %) |

**Skills:** 🦷 Biss Lv2, 🛡️ Chitin Armor Lv3

**Nahkampf:** 7,7 HP Stich alle 1,2 s ≈ 6,42 HP/s (vor Rüstung des Ziels)

**Verteidigung nach Schadenstyp**

| Schadenstyp | Flat-Block | Reduktion | Faktor | Immun |
|---|---|---|---|---|
| Stich | 7,24 HP | — | — | — |
| Schnitt | 4,83 HP | — | — | — |
| Wucht | — | 9 % | — | — |
| Säure | — | — | ×1,5 | — |
| Feuer | — | — | ×1,3 | — |

**Bonus-Level (Entity-Leveling)**

| Bonus | HP | Nahkampf | Tempo |
|---|---|---|---|
| +0 | 18 HP | 7,7 HP | 30 px/s |
| +1 | 22,5 HP | 9,63 HP | 38 px/s |
| +2 | 28,13 HP | 12,03 HP | 47 px/s |
| +3 | 35,16 HP | 15,04 HP | 59 px/s |

**Skill-Drops**

| Skill | Absorb | Analyze |
|---|---|---|
| 🦷 Biss ([`bite`](#bite)) | 15 % | 10,5 % |
| 🦘 Jump ([`jump`](#jump)) | 20 % | 14 % |
| 🛡️ Chitin Armor ([`chitin_armor`](#chitin-armor)) | 10 % | 7 % |

### 🕸️ Giftspinne

<a id="poison-spider"></a>

| Parameter | Wert |
|---|---|
| ID | `poison_spider` |
| Kategorie / Seltenheit | Kreatur / ungewöhnlich |
| Level | 2 |
| Verhalten / Gesinnung | aggressiv / feindlich |
| HP | 15 HP |
| Tempo | 30 px/s |
| Weltgröße | 6 |
| Interaktionsradius | 40 px |
| Respawn | 50 s |
| Aggro-Radius | 15 px |
| Angriffsreichweite | 12 px |
| Angriffs-Cooldown | 1,6 s |
| Angriffsart | melee |
| Vorkommen | Sumpf (50 %), Gebirge (38,5 %), Dungeon (30,3 %) |

**Skills:** 🦷 Biss Lv1, 🕷️ Venom Lv3, 🛡️ Chitin Armor Lv3

**Nahkampf:** 7 HP Stich alle 1,6 s ≈ 4,38 HP/s (vor Rüstung des Ziels)

**Bei Treffer:** Venom: 40 % Chance, 3 HP/Tick für 4 s

**Verteidigung nach Schadenstyp**

| Schadenstyp | Flat-Block | Reduktion | Faktor | Immun |
|---|---|---|---|---|
| Stich | 7,24 HP | — | — | — |
| Schnitt | 4,83 HP | — | — | — |
| Wucht | — | 9 % | — | — |
| Säure | — | — | ×1,5 | — |
| Feuer | — | — | ×1,3 | — |

**Bonus-Level (Entity-Leveling)**

| Bonus | HP | Nahkampf | Tempo |
|---|---|---|---|
| +0 | 15 HP | 7 HP | 30 px/s |
| +1 | 18,75 HP | 8,75 HP | 38 px/s |
| +2 | 23,44 HP | 10,94 HP | 47 px/s |
| +3 | 29,3 HP | 13,67 HP | 59 px/s |

**Skill-Drops**

| Skill | Absorb | Analyze |
|---|---|---|
| 🦷 Biss ([`bite`](#bite)) | 15 % | 10,5 % |
| 🕷️ Venom ([`venom`](#venom)) | 20 % | 14 % |
| 🛡️ Chitin Armor ([`chitin_armor`](#chitin-armor)) | 8 % | 5,6 % |

### 🦂 Kleiner Skorpion

<a id="small-scorpion"></a>

| Parameter | Wert |
|---|---|
| ID | `small_scorpion` |
| Kategorie / Seltenheit | Kreatur / ungewöhnlich |
| Level | 3 |
| Verhalten / Gesinnung | aggressiv / feindlich |
| HP | 30 HP |
| Tempo | 35 px/s |
| Weltgröße | 7 |
| Interaktionsradius | 45 px |
| Respawn | 60 s |
| Aggro-Radius | 18 px |
| Angriffsreichweite | 14 px |
| Angriffs-Cooldown | 1,4 s |
| Angriffsart | melee |
| Vorkommen | Hochland (23,1 %), Gebirge (23,1 %), Wüste (34,8 %) |

**Skills:** 🦷 Biss Lv6, 🛡️ Chitin Armor Lv5, 🕷️ Venom Lv5

**Nahkampf:** 11,55 HP Stich alle 1,4 s ≈ 8,25 HP/s (vor Rüstung des Ziels)

**Bei Treffer:** Venom: 50 % Chance, 4 HP/Tick für 4 s

**Verteidigung nach Schadenstyp**

| Schadenstyp | Flat-Block | Reduktion | Faktor | Immun |
|---|---|---|---|---|
| Stich | 9 HP | — | — | — |
| Schnitt | 6 HP | — | — | — |
| Wucht | — | 15 % | — | — |
| Säure | — | — | ×1,5 | — |
| Feuer | — | — | ×1,3 | — |

**Bonus-Level (Entity-Leveling)**

| Bonus | HP | Nahkampf | Tempo |
|---|---|---|---|
| +0 | 30 HP | 11,55 HP | 35 px/s |
| +1 | 37,5 HP | 14,44 HP | 44 px/s |
| +2 | 46,88 HP | 18,05 HP | 55 px/s |
| +3 | 58,59 HP | 22,56 HP | 68 px/s |

**Skill-Drops**

| Skill | Absorb | Analyze |
|---|---|---|
| 🛡️ Chitin Armor ([`chitin_armor`](#chitin-armor)) | 25 % | 17,5 % |
| 🕷️ Venom ([`venom`](#venom)) | 25 % | 17,5 % |
| 🦷 Biss ([`bite`](#bite)) | 10 % | 7 % |

### 🦂 Großer Skorpion

<a id="large-scorpion"></a>

| Parameter | Wert |
|---|---|
| ID | `large_scorpion` |
| Kategorie / Seltenheit | Kreatur / selten |
| Level | 4 |
| Verhalten / Gesinnung | aggressiv / feindlich |
| HP | 55 HP |
| Tempo | 50 px/s |
| Weltgröße | 10 |
| Interaktionsradius | 55 px |
| Respawn | 120 s |
| Aggro-Radius | 25 px |
| Angriffsreichweite | 20 px |
| Angriffs-Cooldown | 1,6 s |
| Angriffsart | melee |
| Vorkommen | Wüste (21,7 %), Dungeon (24,2 %) |

**Skills:** 🦷 Biss Lv18, 🛡️ Chitin Armor Lv8, 🕷️ Venom Lv8

**Nahkampf:** 19,95 HP Stich alle 1,6 s ≈ 12,47 HP/s (vor Rüstung des Ziels)

**Bei Treffer:** Venom: 65 % Chance, 5,5 HP/Tick für 4 s

**Verteidigung nach Schadenstyp**

| Schadenstyp | Flat-Block | Reduktion | Faktor | Immun |
|---|---|---|---|---|
| Stich | 10,94 HP | — | — | — |
| Schnitt | 7,29 HP | — | — | — |
| Wucht | — | 24 % | — | — |
| Säure | — | — | ×1,5 | — |
| Feuer | — | — | ×1,3 | — |

**Bonus-Level (Entity-Leveling)**

| Bonus | HP | Nahkampf | Tempo |
|---|---|---|---|
| +0 | 55 HP | 19,95 HP | 50 px/s |
| +1 | 68,75 HP | 24,94 HP | 63 px/s |
| +2 | 85,94 HP | 31,17 HP | 78 px/s |
| +3 | 107,42 HP | 38,97 HP | 98 px/s |

**Skill-Drops**

| Skill | Absorb | Analyze |
|---|---|---|
| 🛡️ Chitin Armor ([`chitin_armor`](#chitin-armor)) | 30 % | 21 % |
| 🕷️ Venom ([`venom`](#venom)) | 30 % | 21 % |
| 🦷 Biss ([`bite`](#bite)) | 15 % | 10,5 % |

### 🐉 Drache

<a id="dragon"></a>

| Parameter | Wert |
|---|---|
| ID | `dragon` |
| Kategorie / Seltenheit | Kreatur / legendär |
| Level | 20 |
| Verhalten / Gesinnung | aggressiv / feindlich |
| HP | 500 HP |
| Tempo | 35 px/s |
| Weltgröße | 20 |
| Interaktionsradius | 80 px |
| Respawn | 600 s |
| Aggro-Radius | 50 px |
| Angriffsreichweite | 40 px |
| Angriffs-Cooldown | 1,8 s |
| Angriffsart | melee |
| Fernkampf | `fire_breath` · 30,5 HP · 160 px · 2,5 s |
| Vorkommen | Dungeon (3 %) |

**Skills:** 🦅 Klauenhieb Lv20, 🔥 Feueratem Lv20

**Nahkampf:** 24,4 HP Schnitt alle 1,8 s ≈ 13,56 HP/s (vor Rüstung des Ziels)

**Bonus-Level (Entity-Leveling)**

| Bonus | HP | Nahkampf | Tempo |
|---|---|---|---|
| +0 | 500 HP | 24,4 HP | 35 px/s |
| +1 | 625 HP | 30,5 HP | 44 px/s |
| +2 | 781,25 HP | 38,13 HP | 55 px/s |
| +3 | 976,56 HP | 47,66 HP | 68 px/s |

**Skill-Drops**

| Skill | Absorb | Analyze |
|---|---|---|
| 🔥 Feueratem ([`fire_breath`](#fire-breath)) | 40 % | 28 % |
| 🦅 Klauenhieb ([`claw`](#claw)) | 30 % | 21 % |
| 🦷 Biss ([`bite`](#bite)) | 10 % | 7 % |

### 🐍 Schlange

<a id="snake"></a>

| Parameter | Wert |
|---|---|
| ID | `snake` |
| Kategorie / Seltenheit | Kreatur / selten |
| Level | 10 |
| Verhalten / Gesinnung | aggressiv / feindlich |
| HP | 120 HP |
| Tempo | 60 px/s |
| Weltgröße | 12 |
| Interaktionsradius | 60 px |
| Respawn | 180 s |
| Aggro-Radius | 30 px |
| Angriffsreichweite | 24 px |
| Angriffs-Cooldown | 1,2 s |
| Angriffsart | melee |
| Vorkommen | Wüste (8,7 %), Dungeon (12,1 %) |

**Skills:** 🦷 Biss Lv15, 🕷️ Venom Lv15

**Nahkampf:** 17,85 HP Stich alle 1,2 s ≈ 14,88 HP/s (vor Rüstung des Ziels)

**Bei Treffer:** Venom: 100 % Chance, 9 HP/Tick für 4 s

**Bonus-Level (Entity-Leveling)**

| Bonus | HP | Nahkampf | Tempo |
|---|---|---|---|
| +0 | 120 HP | 17,85 HP | 60 px/s |
| +1 | 150 HP | 22,31 HP | 75 px/s |
| +2 | 187,5 HP | 27,89 HP | 94 px/s |
| +3 | 234,38 HP | 34,86 HP | 117 px/s |

**Skill-Drops**

| Skill | Absorb | Analyze |
|---|---|---|
| 🦷 Biss ([`bite`](#bite)) | 30 % | 21 % |
| 🕷️ Venom ([`venom`](#venom)) | 30 % | 21 % |

---

*Generiert für v0.4.0*
