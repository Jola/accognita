# ABSORB & EVOLVE — Game Design Document
## Datei 08: Progressionsmathematik (Leveling, Wirkungskurven, Wahrscheinlichkeiten, Wechselwirkungen)

> **Status: Diskussion** — Analyse der Ansätze und Vorschlag. ~~Im Spiel gilt weiterhin der Stand aus GDD-02 Abschnitt 4 und balance.ts. Nichts davon ist entschieden.~~ [VERWORFEN, Oktober 2026]
> **Entschieden und umgesetzt:** Erfahrung statt Level, Ränge, Kapazität mit Verlernen, Überdehnung, Wiedererlernen, Übertraining — siehe [Teil 6](#teil-6--erfahrung-statt-level-umsetzung) und [GDD-02 Abschnitt 8](GDD-02-Skillsystem.md#8-erfahrung-statt-level). Teile 1–5 bleiben als Herleitung stehen; Level-bezogene Vorschläge darin sind durch Teil 6 überholt.

Diese Datei beschreibt mathematisch, wie Erfahrung (XP) und Level zusammenhängen (Teil 1) und was ein Level bewirkt: Wirkungskurven, Wahrscheinlichkeiten und Wechselwirkungen zwischen Skills (Teil 2, ab Abschnitt 11). Teil 3 (Abschnitt 16) prüft unendliches Leveln mit linearer Skala und %-Anzeige, Teil 4 (Abschnitt 17) feste Level-Grenzen und den Verzicht auf Level, Teil 5 (Abschnitte 18–20) Skill-Kapazität, Gruppen schwacher Gegner und Weltstufen, Teil 6 (Abschnitte 21–24) die umgesetzte Lösung ohne Level. Sie vergleicht die Vorschläge des Entwicklers mit gängigen Modellen aus anderen Spielen und nennt Vor- und Nachteile.

**Vorgabe (Entwickler):** Das Modell soll einfach zu verstehen sein und zu einer angenehmen, spannenden Spielerfahrung führen: Es soll schwerer werden, weiterzukommen, aber man soll weiterhin Erfolge haben.

---

# Teil 1 — Erfahrung und Level

## 0. Kurzfassung (Teil 1; Teil 2 siehe Abschnitt 14)

1. **Was der Spieler spürt, ist nicht die XP-Zahl, sondern „Wie viele Aktionen brauche ich für das nächste Level?“** Diese Größe heißt hier `N(L)`. Zwei Systeme mit gleichem `N(L)` fühlen sich gleich an, egal wie groß die XP-Zahlen sind.
2. **Proportionale Erfahrung (Vorschlag Entwickler, Abschnitt 4):** Der Kurventyp hat keinen Einfluss darauf, wie schnell man das Level der Quelle erreicht — immer genau `k` Analysen. Er bestimmt aber, wie viel Grinding über dieses Level hinaus bringt. Mit einer Exponentialkurve ist der Abstand begrenzt (`+log_r(n/k)` Level), mit einer Potenzkurve wächst er mit dem Level mit. **Die Vermutung stimmt also im Kern.** Aber: Mit diesem Modell wird Leveln **nie schwerer**. Bei Exponentialkurven bleibt der Aufwand pro Level gleich, bei Potenzkurven wird er sogar kleiner.
3. **Level-Differenz-Bonus/-Malus (Abschnitt 5):** Er ist mathematisch **gleichwertig** zum proportionalen Modell. Proportionale XP mit Exponentialkurve ergibt genau einen Multiplikator `r^(s−L)`. Der Multiplikator lässt sich aber getrennt von der Kurve einstellen und deckeln. Das ist bereits so implementiert (`calcXpMultiplier`).
4. **Fibonacci und goldener Schnitt** sind keine eigene Kurvenklasse. Beide sind Exponentialkurven mit Basis φ ≈ 1,618, kaum anders als die heutige Basis 1,5.
5. **Zahlenbereich:** Exponentialkurven verlassen den sicheren Bereich schnell. Die heutige Skill-Kurve (×1,5) überschreitet 2³¹ ab Level 47 und 2⁵³ ab Level 85, die Spielerkurve (×2) schon ab Level 25 bzw. 47. Praktisch ist das egal: Schon Level 20 braucht heute ~8.900 Absorbs eines gleichstufigen Wesens. Die **spielerische Wand kommt lange vor der technischen.** Potenzkurven sind unkritisch (L² erst ab Level ~1.300 bei 2³¹).
6. **Vorschlag (Abschnitt 8):** Zwei-Exponenten-Modell. Der Bedarf wächst mit `L^p`, der Ertrag einer gleichstufigen Quelle mit `L^q`. Der Abstand `p − q` bestimmt, wie viel schwerer jedes Level wird. Den Grinding-Schutz übernimmt der vorhandene, gedeckelte Level-Differenz-Multiplikator.

---

## 1. Begriffe und Notation

| Symbol | Bedeutung |
|--------|-----------|
| `L` | aktuelles Level des Skills (bzw. des Spielers) |
| `s` | Level der Quelle (Wesen, dessen Skill analysiert/absorbiert oder das bekämpft wird) |
| `need(L)` | XP für den Schritt von `L` auf `L+1` (im Code: `xpToNextLevel`) |
| `T(L)` | kumulierte XP, um Level `L` von Level 1 aus zu erreichen: `T(L) = need(1) + … + need(L−1)` |
| `g` | XP pro Aktion (eine Analyse, ein Absorb, ein Treffer …) |
| `m` | Multiplikator nach Level-Differenz (Bonus/Malus) |
| `N(L)` | **Aktionen pro Level-Up** = `need(L) / g` — die Größe, die der Spieler spürt |

Häufige Verwechslung: Steigt `need(L)` **linear** (10, 20, 30 …), wächst die **Summe** `T(L)` **quadratisch**. Allgemein ist `T(L)` eine Stufe „steiler“ als `need(L)`. Eine Ausnahme ist die Exponentialkurve, dort sind beide exponentiell.

**Begründung (Vorschlag Claude):** `N(L)` ist die zentrale Größe, weil alle anderen Werte nur Einheiten sind. Verdoppelt man jeden XP-Gewinn und jede Schwelle, ändert sich am Spielgefühl nichts. Balancing sollte deshalb von „Wie viele Aktionen pro Level wollen wir?“ ausgehen und die XP-Zahlen daraus ableiten.

---

## 2. Ist-Stand im Spiel (v0.4)

| Was | Formel | Wo |
|-----|--------|-----|
| Skill-Schwelle | `need(L) = floor(baseXpThreshold · 1,5^(L−1))`, `baseXpThreshold` 10–25 | `SkillSystem.ts` `calcXpThreshold`, `balance.ts` `XP_LEVEL_MULTIPLIER` |
| Kern-Fähigkeiten | `need(L) = floor(10 · 1,5^(L−1))`, max. Level 20 | `GameState.ts` `CORE_*` |
| Spieler-Level | `need(n) = floor(200 · 2^(n−1))` auf die Summe aller Skill-XP | `balance.ts` `PLAYER_LEVEL_*` |
| Absorb/Analyze-XP | `g = Basis · clamp((s/L)^1,5; 0,05; 4)`, Basis Absorb 3, Analyze 1 | `calcXpMultiplier` |
| Kampf-XP | `g = Schaden in HP · clamp((s/L)^2; 0,02; 1,5)` | `calcCombatXpMultiplier` |

**Aktionen pro Level-Up heute** (Skill mit `baseXpThreshold` 12, Absorb eines gleichstufigen Wesens = 3 XP):

| Skill-Level | need(L) | Absorbs gleichstufig | mit max. Bonus ×4 | Absorbs kumuliert seit Lv1 |
|------------:|--------:|---------------------:|------------------:|---------------------------:|
| 1 | 12 | 4 | 1 | 4 |
| 5 | 60 | 20 | 5 | 53 |
| 10 | 461 | 154 | 39 | 456 |
| 12 | 1.037 | 346 | 87 | 1.033 |
| 15 | 3.503 | 1.168 | 292 | 3.499 |
| 20 | 26.602 | 8.868 | 2.217 | 26.600 |

Kern-Fähigkeiten bekommen nur 1 XP pro Einsatz. Der Schritt 19 → 20 braucht dort 14.778 gleichstufige Einsätze.

**Bewertung (Vorschlag Claude):** Die Kurve ×1,5 pro Level ist für Skills **ohne Level-Limit** und mit **festen** XP pro Aktion sehr steil. Etwa alle 1,7 Level verdoppelt sich der Aufwand. Ab Skill-Level ~12–15 entsteht eine harte Wand, auch mit Bonus. Am Anfang gibt es viele Erfolge, danach fast keine mehr. Die Vorgabe „schwerer werden, aber weiter Erfolge haben“ ist damit nur für die ersten ~10 Level erfüllt.

> Begründung offen — Faktor 1,5 (Skills, Kern-Fähigkeiten) und 2,0 (Spieler) sind bisher nicht begründet (siehe GDD-02 Abschnitt 4).

---

## 3. Kurvenfamilien im Vergleich

Alle Beispiele mit Startwert 10 XP für den ersten Level-Up.

| Familie | need(L) | Wächst… | Vorteile | Nachteile |
|---------|---------|---------|----------|-----------|
| **Konstant** | `b` | gar nicht | Maximal einfach, vorhersehbar | Kein „schwerer werden“; nur über stärkere Quellen steuerbar |
| **Linear** | `b · L` | um festen Betrag | Einfach, Aufwand steigt sanft (D&D 3.5: `T(n) = 500 · n · (n−1)`) | Bei festen Erträgen wird es spät träge, aber nie eine Wand |
| **Potenz** | `b · L^p` (p = 1,5 … 3) | relativ immer langsamer (bei p=2: von Level 20 auf 21 nur noch +10 %) | Gut kalibrierbar, kleine Zahlen, keine harte Wand, sehr verbreitet (Pokémon: `T = n³`, Skyrim-Skills: `L^1,95`) | Ohne weitere Hebel verliert sie spät an Druck |
| **Exponentiell** | `b · r^(L−1)` | um festen **Prozentsatz** (r=1,5 → +50 % pro Level) | Starke „Wand“, begrenzt Grinding wirksam, „Prestige“-Level | Zahlen explodieren; schon kleine Änderungen an `r` verändern das Spätspiel stark; ohne mitwachsende Erträge wird das Level praktisch gedeckelt |
| **Fibonacci / goldener Schnitt** | `F(L)` bzw. `b · φ^(L−1)` | +61,8 % pro Level | Ganzzahlig, „natürlich“ klingend | **Keine eigene Klasse.** Nach der Binet-Formel ist `F(n) ≈ φⁿ/√5`, also exponentiell mit r ≈ 1,618 — etwas steiler als die heutige 1,5 |
| **Hybrid** (Polynom + Exponential) | z. B. RuneScape: `(L + 300 · 2^(L/7)) / 4` | anfangs fast linear, später ≈ +10,4 % pro Level | Sanfter Einstieg, langer Spätspiel-Bogen (Level 92 ist die Hälfte von 99) | Schwerer zu erklären |
| **Logarithmisch / Soft-Cap** | z. B. `b · ln(L+1)` oder Sigmoid | immer langsamer bis kaum noch | Freundlich, alle erreichen das Ende | Wenig Druck, Level verlieren an Bedeutung |
| **Tabelle** | frei per Hand | beliebig | Volle Kontrolle (Pokémon „Erratic“/„Fluctuating“, WoW) | Nicht „verstehbar“ als Formel, Pflegeaufwand |

**Wichtige Eigenschaft der Exponentialkurve:** Bei kleiner Basis verhält sie sich anfangs fast linear. Der Exponent „greift“ erst nach etwa `1/ln(r)` Leveln: bei r = 1,1 nach ~10 Leveln, bei r = 1,5 nach ~2,5. Darum fühlt sich RuneScape (r ≈ 1,104) lange gutmütig an, die heutige Kurve (1,5) aber nicht.

---

## 4. Vorschlag A (Entwickler): Proportionale Erfahrung

**Vorschlag (Entwickler):** Eine Analyse bringt einen festen Anteil `1/k` der XP, die für das Level der Quelle nötig sind. Beispiel `k = 5`: Wer einen Skill auf Level 6 fünfmal analysiert, hat genug XP für Level 6. Wer ihn auf Level 100 fünfmal analysiert, erreicht Level 100.

Formal: `g(s) = T(s) / k`. Nach `n` Analysen derselben Quelle hat man `n · T(s) / k` XP.

### 4.1 Prüfung: „Die Kurve macht keinen Unterschied — außer beim Grinding“

**Teil 1 stimmt:** Unabhängig von der Kurvenform braucht man von Level 1 aus **genau `k` Analysen**, um das Level der Quelle zu erreichen. Die Form der Kurve kürzt sich heraus.

**Teil 2 stimmt auch, mit Einschränkung:** Was darüber hinaus passiert, hängt sehr wohl von der Kurve ab.

| Kurve | Level nach `n` Analysen einer Quelle `s` (für große `s`) | Charakter |
|-------|----------------------------------------------------------|-----------|
| Exponentiell `r` | `L ≈ s + log_r(n/k)` | **additiver** Abstand, unabhängig von `s` |
| Potenz (`T ∝ L^P`) | `L ≈ s · (n/k)^(1/P)` | **multiplikativer** Abstand, wächst mit `s` |

Gerechnete Beispiele (`k = 5`, Startwert 10 XP):

| Kurve | Quelle 3, 100× | Quelle 3, 1.000× | Quelle 20, 100× | Quelle 50, 100× |
|-------|---------------:|-----------------:|----------------:|----------------:|
| linear `10·L` | 11,5 | 35,1 | 87,7 | 221,9 |
| quadratisch `10·L²` | 7,2 | 14,9 | 53,4 | 134,9 |
| exponentiell 1,1 | 18,3 | 40,5 | 49,6 | 81,3 |
| exponentiell 1,5 (heute) | 9,0 | 14,6 | 27,3 | 57,3 |
| Fibonacci (φ) | 8,2 | 13,0 | 26,2 | 56,2 |
| exponentiell 2,0 | 6,9 | 10,2 | 24,2 | 54,3 |

Bei einer Exponentialkurve bringt 100-faches Grinding immer etwa dieselbe Zahl an Leveln über der Quelle (bei 1,5: +7). Bei Potenzkurven wird Grinding mit steigendem Level **lohnender** (Quelle 50 → Level 135). Die Exponentialkurve dient in diesem Modell tatsächlich fast nur dazu, Grinding auf gleichem Level unwirtschaftlich zu machen. **Die Vermutung ist bestätigt.** Mit kleiner Basis (1,1) ist der Schutz aber anfangs schwach (siehe Abschnitt 3).

### 4.2 Was die Prüfung zusätzlich zeigt

**a) Leveln wird mit diesem Modell nie schwerer.** Aktionen pro Level-Up kurz unterhalb der Quelle (von `s−1` auf `s`):

| Kurve | s = 5 | s = 10 | s = 20 | s = 50 |
|-------|------:|-------:|-------:|-------:|
| linear | 2,0 | 1,0 | 0,5 | 0,2 |
| quadratisch | 2,7 | 1,4 | 0,7 | 0,3 |
| exponentiell 1,5 | 2,1 | 1,7 | 1,7 | 1,7 |
| exponentiell 2,0 | 2,7 | 2,5 | 2,5 | 2,5 |

Formal: Bei Exponentialkurven ist `N ≈ k · (r−1) · r^(L−s)`, also konstant bei gleichem Level. Bei Potenzkurven ist `N ∝ 1/L`, es wird also sogar leichter. Der Fortschritt hängt dann **nur** davon ab, wie schnell man stärkere Quellen findet. Das kann man bewusst so wollen („die Welt ist die Kurve“). Die Vorgabe „es soll schwerer werden“ muss dann aber vollständig über die Welt (Gefahr, Erreichbarkeit, Erfolgschance) erfüllt werden.

**b) Ohne Deckel springt man.** Ein Blob auf Level 1, der **einmal** eine Quelle auf Level 50 analysiert, landet bei Level ~34 (exp. 1,1) bis ~46 (exp. 1,5). Das widerspricht der Begründung zu GDD-02 Abschnitt 1.4 („nicht einfach zu den stärksten Gegnern laufen“). Ein Deckel ist also nötig. Die heutige Erfolgschance `min(1, L/s)` = 2 % bremst das nur im Mittel und verhindert den Sprung nicht.

**c) XP-Zahlen wachsen mit der Quelle.** `T(s)` ist bei Exponentialkurven selbst exponentiell. Damit wird der Zahlenbereich zum echten Problem (Abschnitt 6).

**d) Andere XP-Quellen passen nicht dazu.** Kampf-XP ist heute absoluter Schaden in HP und nicht proportional. Im selben Skill würden dann zwei XP-Systeme nebeneinander laufen: proportional für Analyse, absolut für Kampf.

**Bewertung (Vorschlag Claude):** Die Idee ist elegant und leicht zu erklären („5 Analysen = Level der Quelle“). Als alleiniges Modell erfüllt sie aber nicht „es soll schwerer werden“ und braucht einen Deckel. Ihre Stärke steckt vollständig auch in Vorschlag B (nächster Abschnitt).

---

## 5. Vorschlag B (Entwickler): Bonus/Malus nach Level-Differenz

**Vorschlag (Entwickler):** Wesen mit niedrigerem Level geben weniger XP (Malus), Wesen mit höherem Level mehr (Bonus). Vermutung: ungefähr derselbe Effekt wie Vorschlag A.

### 5.1 Prüfung: gleichwertig zu A?

**Ja, mathematisch exakt.** Setzt man in Vorschlag A eine Exponentialkurve ein, gilt:

```
N_A(L, s) ≈ k · (r−1) · r^(L−s)
         =  N₀            ·  1 / m(s, L)      mit  N₀ = k·(r−1),  m = r^(s−L)
```

Das ist „feste Aktionen pro Level“ mal ein **Differenz-Multiplikator** `m = r^(s−L)`. Proportionale XP **ist** ein Level-Differenz-Bonus/-Malus, nur ungedeckelt und fest an die Kurve gekoppelt. Bei Potenzkurven entsteht entsprechend ein **Verhältnis-Multiplikator** `(s/L)^P`. Genau diese Form hat das Spiel heute (`(s/L)^1,5`).

### 5.2 Unterschiede in der Praxis

| | A: proportional | B: Multiplikator |
|--|-----------------|------------------|
| Grinding-Schutz | über die Kurvenform | über den Multiplikator |
| Kurve und Anreiz trennbar? | nein, gekoppelt | **ja**, Kurve regelt Tempo, Multiplikator regelt „wo jage ich“ |
| Deckel nach oben/unten | muss zusätzlich eingebaut werden | natürlich (`clamp`), heute 0,05 … 4 |
| Kampf-XP integrierbar | schwierig (zwei Systeme) | ja, gleiche Logik (heute eigene Kurve) |
| Zahlenbereich | XP wächst mit `T(s)`, kritisch bei Exponential | XP pro Aktion bleibt klein |
| Erklärbarkeit | „5× analysieren = Level der Quelle“ | „stärkere Gegner geben mehr, schwächere weniger“ |

### 5.3 Differenz oder Verhältnis?

| Form | Formel | Verhalten |
|------|--------|-----------|
| Verhältnis (heute) | `(s/L)^e` | 5 Level Unterschied wiegen bei Level 5 viel (×2,8 bei e=1,5), bei Level 50 kaum (×1,16) |
| Differenz | `r^(s−L)` oder linear wie WoW: `1 − (L−s)/ZD` | 5 Level Unterschied wiegen überall gleich |
| Differenz mit Toleranzband | z. B. Path of Exile: kein Malus innerhalb `3 + L/16` Level | Gleichstufig „genug“ ist entspannt, erst echtes Farmen wird bestraft |

**Bewertung (Vorschlag Claude):** Welche Form passt, hängt davon ab, wie die Level der Wesen in der Welt verteilt sind (siehe [GDD-07](GDD-07-Bestiarium.md)). Steigen die Level entlang des Weges ungefähr **gleichmäßig** (Wald 1–10, Wiese 10–20 …), ist die Differenz-Form gerechter. Steigen sie **prozentual** (jede Etappe ~doppelt so stark), passt das Verhältnis.

> Begründung offen — Entscheidung Differenz vs. Verhältnis steht aus.

---

## 6. Zahlenbereich (Integer-Grenzen)

JavaScript speichert alle Zahlen als 64-Bit-Gleitkomma. Ganze Zahlen sind exakt bis `2⁵³ ≈ 9 · 10¹⁵` (`Number.MAX_SAFE_INTEGER`). Darüber stürzt nichts ab. Aber `x + 1 === x`: **kleine XP-Gewinne verschwinden, das Level bleibt stehen.** Ab ~1,8 · 10³⁰⁸ wird die Zahl `Infinity`. Die Grenze `2³¹` ist nur relevant, wenn Werte in 32-Bit-Feldern landen (Bit-Operationen `|0`, `Int32Array`, manche Server-Datenbanken).

Erstes Level, ab dem die **kumulierten XP** die Grenze überschreiten (Startwert 10, Spieler 200):

| Kurve | ab 2³¹ | ab 2⁵³ | Summe bis Lv 100 |
|-------|-------:|-------:|-----------------:|
| linear `10·L` | 20.725 | 42 Mio. | 5 · 10⁴ |
| quadratisch `10·L²` | 865 | 139.286 | 3,3 · 10⁶ |
| kubisch `10·L³` | 172 | 7.749 | 2,5 · 10⁸ |
| exponentiell 1,10 | 179 | 339 | 1,3 · 10⁶ |
| RuneScape-Hybrid | 151 | 305 | 1,4 · 10⁷ |
| exponentiell 1,15 | 125 | 234 | 6,8 · 10⁷ |
| **exponentiell 1,5 (Skill heute)** | **47** | **85** | 5,4 · 10¹⁸ |
| Fibonacci (φ) | 40 | 72 | 7,9 · 10²¹ |
| **exponentiell 2,0 (Spieler heute, 200)** | **25** | **47** | 1,3 · 10³² |

**Bewertung (Vorschlag Claude):**
- Mit dem **heutigen** Modell (feste XP pro Aktion) erreicht niemand diese Grenzen, weil der Aufwand vorher explodiert (Abschnitt 2). Die Wand ist eine des Spielgefühls, keine technische.
- Mit **Vorschlag A + Exponentialkurve** werden die Grenzen real: Eine Quelle auf Level 90 liefert bei ×1,5 schon XP jenseits von 2⁵³. Abhilfe: Fortschritt als **Level + Bruchteil** speichern (z. B. `level: 47`, `progress: 0,38`) statt absoluter XP. Im proportionalen Modell ist das sogar die natürlichere Darstellung.
- Potenzkurven bis Grad 2 sind für jedes denkbare Level unkritisch.
- Idle-Games (z. B. mit ×1,15 pro Kauf) lösen das mit Gleitkomma-Mantisse/Exponent-Bibliotheken. Das ist für dieses Spiel unnötig.

---

## 7. Was andere Spiele tun

| Spiel | Level-Kurve | XP pro Aktion | Level-Differenz | Bemerkung |
|-------|-------------|---------------|-----------------|-----------|
| **D&D 3.5** | `T(n) = 500 · n·(n−1)` (lineare Schritte) | nach Challenge Rating des Monsters | Tabelle CR vs. Gruppenlevel | Klassisch, analog |
| **Pokémon** | Kubisch: `T(n) = n³` (Medium Fast), 0,8n³ … 1,25n³; Erratic/Fluctuating stückweise | wächst mit Gegner-Level | ab Gen V Verhältnis-Faktor | Ertrag wächst mit, dadurch `N` nur langsam steigend |
| **RuneScape** | Hybrid, ≈ +10,4 %/Level, verdoppelt sich alle ~7 Level, Lv 99 = 13.034.431 XP | wächst mit Inhalts-Level (höhere Bäume → mehr XP) | keine, aber neue Inhalte erst ab Level X | Skill-basiert wie dieses Spiel; Lv 92 = halber Weg zu 99 |
| **World of Warcraft** | Tabelle, grob polynomiell | Basis aus Monster-Level | **Differenz**, linear bis 0 („grau“) bei Abstand ZD; Bonus für höhere Monster | Grinding-Schutz über Multiplikator, nicht über Kurve |
| **Path of Exile** | steile Tabelle, Lv 100 extrem selten | nach Monster-Level | **Differenz mit Toleranzband** `3 + L/16` | Malus erst außerhalb des Bandes |
| **Skyrim** | Skill: `Mult · L^1,95 + Offset` (Potenz ≈ quadratisch) | fest pro Nutzung, je Skill skaliert | keine | Charakter-XP = Summe der neuen Skill-Level, sehr ähnlich wie hier |
| **Idle/Incremental** | exponentiell (Kosten ×1,07 … ×1,15) | ebenfalls exponentiell | — | Riesenzahlen sind Absicht, eigene Zahlbibliotheken |

**Muster:** Fast alle Action-/Rollenspiele kombinieren eine **polynomielle oder mild exponentielle Kurve** mit **Erträgen, die mit dem Gegner-Level wachsen**, plus einen **Malus für zu schwache Gegner**. Steile Exponentialkurven mit festen Erträgen gibt es fast nur als bewusstes Spätspiel-Prestige (RuneScape ab ~Lv 90, PoE ab ~Lv 90).

---

## 8. Vorschlag Claude: Zwei-Exponenten-Modell

> Status: Diskussion — Vorschlag, nicht übernommen.

```
need(L)  = c · L^p                         Bedarf für den nächsten Level
g(s, L)  = b · s^q · m(s, L)               Ertrag einer Aktion an einer Quelle mit Level s
m(s, L)  = clamp( …Level-Differenz… ; min ; max )   (wie heute calcXpMultiplier)

Aktionen pro Level bei gleichstufiger Quelle:   N(L) = (c/b) · L^(p−q)
```

**Ein Satz zum Erklären:** *Stärkere Wesen geben mehr Erfahrung (Exponent q), jedes Level braucht mehr Erfahrung (Exponent p). Weil p etwas größer ist als q, wird jedes Level ein bisschen aufwendiger, aber nie unerreichbar.*

Beispielrechnung (`c = 3`, `b = 1`, gleichstufige Quelle):

| Level | p=1,5 q=1: N | kumuliert | p=2 q=1: N | kumuliert | p=2 q=0,5: N | kumuliert |
|------:|-----:|------:|-----:|------:|------:|-------:|
| 1 | 3 | 3 | 3 | 3 | 3 | 3 |
| 5 | 7 | 25 | 15 | 45 | 34 | 85 |
| 10 | 10 | 67 | 30 | 165 | 95 | 428 |
| 20 | 13 | 185 | 60 | 630 | 268 | 2.282 |
| 50 | 21 | 717 | 150 | 3.825 | 1.061 | 21.746 |
| 100 | 30 | 2.014 | 300 | 15.150 | 3.000 | 121.504 |

Zum Vergleich heute: Skill-Level 20 = 26.600 Absorbs.

Grinding-Schutz mit dem heutigen Multiplikator (`(s/L)^1,5`, Deckel 0,05 … 4) bei p=2, q=1, Skill-Level 20:

| Quelle | Aktionen pro Level |
|-------:|-------------------:|
| Lv 3 | 6.885 |
| Lv 10 | 339 |
| Lv 20 | 60 |
| Lv 25 | 34 |
| Lv 40 | 11 |

**Begründung (Vorschlag Claude):**
- *Einfach:* zwei Exponenten und ein Multiplikator. Die Größe `p − q` sagt direkt, wie stark der Aufwand pro Level wächst (0 = gleichbleibend, 1 = linear steigend).
- *Schwerer, aber mit Erfolgen:* `N(L)` steigt stetig und ohne Wand. Der Spieler kann das Tempo durch stärkere Gegner selbst erhöhen (Bonus bis ×4). Das ist ein bewusster Anreiz zum Risiko.
- *Grinding unattraktiv:* übernimmt der Multiplikator, unabhängig von der Kurve einstellbar (Abschnitt 5.2).
- *Kampf-XP passt hinein:* Schaden wächst mit dem Skill-Level ungefähr linear (`getSkillEffectiveness`), wirkt also wie `q ≈ 1`.
- *Zahlenbereich:* `p = 2` bleibt bis Level ~1.300 unter 2³¹.
- *Breite statt Tiefe:* Jeder neu entdeckte Skill startet bei Level 1 mit `N = 3`. Erfolgserlebnisse entstehen also auch dann, wenn alte Skills langsamer werden. Das passt zum Kern des Spiels (Entdecken durch Absorbieren/Analysieren, GDD-01).

**Varianten:**
- `q = 0` (feste Erträge wie heute, nur Kurve tauschen) ist der kleinste Umbau: `N(L) ∝ L^p`.
- Der proportionale Vorschlag A bleibt als **Grenzfall** erklärbar: Mit `q = p + 1` und ohne Deckel erreicht man genau sein Verhalten.
- Wer eine echte Spätspiel-Wand möchte, kann ab einem Level (z. B. 50) auf einen milden Exponenten umschalten (Hybrid wie RuneScape).

> Begründung offen — Werte für `p`, `q`, `c`, `b` und die Form von `m` sind Beispiele und noch nicht im Spiel getestet.

---

## 9. Charakter-Level (Spieler-Level)

**Ist-Stand:** Das Spieler-Level wird aus der Summe aller jemals verdienten Skill-XP berechnet, mit `need(n) = 200 · 2^(n−1)`. Weil sich die Schwelle pro Level verdoppelt, wächst das Spieler-Level nur **logarithmisch** mit der Gesamt-XP: `Level ≈ log₂(Gesamt-XP / 200) + 1`. Zehn Skills auf Level 15 (je ~7.000 XP) ergeben rund Spieler-Level 9,5. Für Level 20 bräuchte man 105 Millionen XP.

| Ansatz | Formel | Vorteile | Nachteile |
|--------|--------|----------|-----------|
| Summe XP, exponentiell (heute) | `need = 200 · 2^(n−1)` | Spieler-Level steigt selten, wirkt bedeutsam | stockt praktisch bei ~Lv 15; HP/MP wachsen dann kaum noch |
| Summe XP, Potenzkurve | `need = c · n^p` | gleiche Logik wie Skills, berechenbar | Viel-Skill-Spieler leveln schneller |
| **Summe der Skill-Level** (Skyrim-artig) | `Spieler-XP += neues Skill-Level` pro Skill-Level-Up | Sehr verständlich („jedes Skill-Level zählt“), unabhängig von XP-Einheiten | Viele niedrige Skills zählen so viel wie wenige hohe |
| Durchschnitt/Top-N der Skill-Level | z. B. Mittel der 5 besten Skills | Spezialisierung wird nicht bestraft | Neue Skills tragen anfangs nichts bei |

**Bewertung (Vorschlag Claude):** Wechselt die Skill-Kurve, muss die Spielerkurve mitwechseln, sonst stimmt das Verhältnis nicht mehr. „Summe der Skill-Level“ ist am leichtesten zu verstehen und belohnt das Entdecken neuer Skills, was zum Kern passt.

> Begründung offen — Startwert 200 und Faktor 2 der Spielerkurve.

---

## 10. Offene Entscheidungen

- [ ] Grundmodell: Zwei-Exponenten-Modell (Abschnitt 8), proportional (Abschnitt 4) oder Ist-Stand behalten? Mit Begründung.
- [ ] Level-Differenz: Verhältnis (heute) oder Differenz, mit oder ohne Toleranzband? (Abschnitt 5.3)
- [ ] Zielwerte für `N(L)`: Wie viele gleichstufige Aktionen sollen Level 5, 10, 20 kosten?
- [ ] Spieler-Level: Summe XP oder Summe der Skill-Level? (Abschnitt 9)
- [ ] Kern-Fähigkeiten (Analyze/Absorb): gleiche Kurve wie Skills? Bleibt das Maximum bei Level 20?

---

# Teil 2 — Wirkung, Wahrscheinlichkeiten, Wechselwirkungen

Teil 1 beantwortet, *wie schnell* ein Skill aufsteigt. Teil 2 beantwortet, *was ein Level bringt*: wie viel stärker ein Skill wird, wie Zufall (Trefferstufen, Gift, Skill-Fund) wirkt und wie Skills sich gegenseitig beeinflussen. Alle Zahlen sind mit den Formeln aus dem Code nachgerechnet (Stand v0.4).

---

## 11. Wirkungskurven: Wie viel stärker wird ein Skill pro Level?

### 11.1 Die eigentliche Frage: Wirkung über Spielzeit

Der Spieler spürt zwei Dinge: **wie lange** ein Level-Up dauert (Teil 1) und **wie viel** er bringt (relative Verbesserung). Zusammen ergibt das die gefühlte Progression „Wirkung über Spielzeit“.

| Level-Kosten (kumuliert) | Wirkung pro Level | Wirkung über Aktionen `n` | Gefühl |
|--------------------------|-------------------|---------------------------|--------|
| exponentiell `r^L` | linear | `∝ log(n)` | wird sehr schnell zäh (Ist-Stand) |
| exponentiell `r^L` | exponentiell `w^L` | `∝ n^(ln w / ln r)` | gleichmäßig, aber große Zahlen auf beiden Seiten |
| Potenz `L^(p−q+1)` (Zwei-Exponenten-Modell) | linear | `∝ n^(1/(p−q+1))`, bei p=2, q=1: `∝ √n` | stetig, langsamer werdend, ohne Wand |

**Begründung (Vorschlag Claude):** Kurven für Kosten und Wirkung dürfen nicht unabhängig gewählt werden. Exponentielle Kosten mit linearer Wirkung bremsen doppelt: Jedes Level dauert länger **und** bringt relativ weniger.

### 11.2 Ist-Stand: Wirkungskurven im Code

| Skill / Wert | Formel | Lv 1 | Lv 5 | Lv 10 | Lv 20 | Lv 50 | +% von 10→11 | +% von 20→21 |
|--------------|--------|-----:|-----:|------:|------:|------:|----:|----:|
| Angriffsskills (Effektivität) | `1 + 0,1·(L−1) + 0,15 ab L≥3` | ×1,00 | ×1,55 | ×2,05 | ×3,05 | ×6,05 | +4,9 | +3,3 |
| Biss (7 HP Basis) | 7 × Effektivität | 7,0 | 10,9 | 14,4 | 21,4 | 42,4 | +4,9 | +3,3 |
| Unbewaffnet (Absorb-Level, max 20) | `3 + 1,5·L` | 4,5 | 10,5 | 18,0 | 33,0 | — | +8,3 | — |
| Superstrength | `×(1,30 + 0,05·(L−1))` | ×1,30 | ×1,50 | ×1,75 | ×2,25 | ×3,75 | +2,9 | +2,2 |
| Venom-Chance | `min(1; 0,30 + 0,10·√(L−1))` | 30 % | 50 % | 60 % | 74 % | 100 % | — | — |
| Venom-Schaden | `2 + 0,5·(L−1)` HP/s, 4 s | 2,0 | 4,0 | 6,5 | 11,5 | 26,5 | +7,7 | +4,3 |
| Chitin gegen Stich | `3 + 3·√(L−1)` HP Block | 3,0 | 9,0 | 12,0 | 16,1 | 24,0 | +4,1 | +2,1 |
| Chitin gegen Wucht | `3 % + 3 %·(L−1)`, Deckel 85 % | 3 % | 15 % | 30 % | 60 % | 85 % | EHP +4,5 | EHP +8,1 |
| Hemolymph | `2·L` HP Rückschlag | 2 | 10 | 20 | 40 | 100 | +10 | +5 |
| Jump-Weite | `160 + 20·(L−1)` px | 160 | 240 | 340 | 540 | 1.140 | +5,9 | +3,7 |
| Jump-Geschick | `1 + √(L−1)` | 1,0 | 3,0 | 4,0 | 5,4 | 8,0 | — | — |
| Photosynthesis | `0,5·L` HP/s | 0,5 | 2,5 | 5,0 | 10,0 | 25,0 | +10 | +5 |
| Spieler-HP | `80 + 15·(L−1)` | 80 | 140 | 215 | 365 | 815 | +7,0 | +4,1 |
| Gegner-Bonuslevel (max. 3) | `×1,25^bonus` | — | — | — | — | — | +25 je Stufe | |

Auffälligkeiten:
- **Sprung bei Level 3:** Die Effektivität steigt von Level 2 auf 3 um 22,7 %, sonst um 5–10 %. Level 3 wirkt dadurch wie ein Meilenstein.
  > Begründung offen — Ist der Bonus `+0,15 ab Level 3` gewollt (Meilenstein) oder ein Überbleibsel?
- **Fast alles ist linear.** Die relative Verbesserung pro Level fällt deshalb stetig: bei Level 2 +10 %, bei Level 20 +3 %, bei Level 50 +1,7 %. Zusammen mit den steigenden Level-Kosten wird jedes Level-Up doppelt unspektakulärer.
- **Chitin gegen Wucht ist die Ausnahme:** Lineare Prozente werden pro Level immer *wertvoller* (Abschnitt 11.4).
- **Nicht mehr genutzte Formeln:** [SkillEffects.ts](../src/systems/SkillEffects.ts) enthält noch alte Formeln (`calcChitinDr`, `calcVenomChance`, `calcSuperstrengthMult`, `calcHemolymphReflect` u. a.), die nirgends mehr aufgerufen werden und teils andere Werte liefern. Sie sind in [TODO.md](../TODO.md) vermerkt.

### 11.3 Kurventypen für Wirkungen

| Kurve | Formel | Relative Verbesserung pro Level | Geeignet für | Risiko |
|-------|--------|---------------------------------|--------------|--------|
| **linear** | `a + b·(L−1)` | fällt (≈ 1/L) | absolute Werte bei kurzen Levelbereichen | spät kaum spürbar |
| **multiplikativ / exponentiell** | `a · w^(L−1)` | konstant (z. B. +5 %) | absolute Werte bei langen Levelbereichen (Schaden, HP, Heilung) | Gegner müssen genauso wachsen, sonst kippt das Gleichgewicht |
| **Wurzel / Log** | `a + b·√(L−1)` | fällt schnell | Werte, die früh zählen und nicht ausufern sollen (Geschick, Block) | spät fast wertlos |
| **linear + harter Deckel** | `min(max, …)` | konstant bis zum Deckel, dann 0 | — | Level über dem Deckel bringen nichts (Venom ab Lv 50) |
| **asymptotisch (hyperbolisch)** | `max · x/(x+K)` | fällt sanft, erreicht den Deckel nie | **Prozente und Chancen** | — |
| **tanh** | `max · tanh(x)` | fällt, erreicht den Deckel praktisch | Kippen von Verteilungen (Trefferstufen, schon genutzt) | sättigt recht abrupt |

**Begründung (Vorschlag Claude):**
- **Prozente und Chancen sollten asymptotisch sein**, nicht linear mit hartem Deckel. Dann bringt jedes Level etwas, und 100 % bzw. der Deckel werden nie erreicht.
- **Absolute Werte** (Schaden, Heilung, HP) dürfen linear bleiben, wenn die Level-Kosten polynomiell werden (Teil 1, Abschnitt 8). Sollen Level bis 100+ spürbar bleiben, passt ein milder Faktor (z. B. +4 % pro Level) besser, dann aber für Spieler **und** Gegner.

### 11.4 Sonderfall Prozent-Reduktion: effektive HP

Bei einer Reduktion `r` hält man `1/(1−r)` mal so viel Schaden aus (**effektive HP**, EHP). Lineare Prozente machen jedes weitere Level immer wertvoller:

| Chitin-Level | Wucht-Reduktion | EHP-Faktor | Zuwachs durch das nächste Level |
|-------------:|----------------:|-----------:|------------------:|
| 1 | 3 % | ×1,03 | +3 % |
| 10 | 30 % | ×1,43 | +4,5 % |
| 20 | 60 % | ×2,50 | +8,1 % |
| 28 | 84 % | ×6,25 | +6,7 % (Deckel) |
| ab 29 | 85 % | ×6,67 | 0 |

Kurz vor dem Deckel bringt ein Level fast +19 % EHP (27→28), danach plötzlich nichts mehr.

**Gängige Alternative** (League of Legends, ähnlich WoW): Reduktion `= x/(x+K)`, also Schadensfaktor `K/(K+x)`. Dann wachsen die **EHP linear** (`1 + x/K`), jedes Level bringt gleich viel Überleben, und 100 % werden nie erreicht. Ein Deckel ist dann überflüssig.

> Begründung offen — Lineare %-Reduktion mit 85-%-Deckel beibehalten oder auf `x/(x+K)` umstellen?

### 11.5 Spieler gegen Welt: Level und Stärke der Gegner

Erfolgschance, XP-Multiplikator und künftig das Aggro richten sich nach dem **Entity-Level**. Die tatsächliche Stärke kommt aber aus den einzeln gesetzten `hp` und `skillLevels`:

| Gegner | Level | HP | Biss-/Klauen-Schaden |
|--------|------:|---:|---------------------:|
| Ameise | 1 | 8 | 7,0 |
| Giftspinne | 2 | 15 | 7,0 |
| Kleiner Skorpion | 3 | 30 | 11,5 |
| **Großer Skorpion** | **4** | 55 | **19,9** (Biss Lv 18) |
| **Schlange** | **10** | 120 | **17,9** (Biss Lv 15) |
| Drache | 20 | 500 | 24,4 |

Der Große Skorpion (Lv 4) beißt härter als die Schlange (Lv 10), gibt aber viel weniger XP und ist leichter zu analysieren.

**Vorschlag (Claude):** Eine **Referenz-Machtkurve** festlegen, z. B. „ein Wesen auf Level L hat ungefähr `HP(L)` und `Schaden(L)`“. Dabei hilft das Powerlevel-Konzept aus [GDD-05 Abschnitt 9.1](GDD-05-Kampfmathematik.md#91-das-powerlevel-konzept). Die Entity-Level im Bestiarium werden dann daraus abgeleitet oder geprüft. Der INDEX-Tab könnte Abweichungen anzeigen.

> Begründung offen — Soll das Entity-Level aus der Stärke abgeleitet werden, oder bleibt es frei gesetzt?

---

## 12. Wahrscheinlichkeiten

### 12.1 Trefferstufen

Modell (implementiert, [GDD-03](GDD-03-Kampfsystem.md)): Jede Stufe hat eine Grundchance. Skill-Level und Geschick-Vorsprung „kippen“ die Verteilung über `kipp = 0,4·tanh(0,05·(L−1) + 0,1·ΔGeschick)` Richtung bessere Treffer.

**Biss, gleiches Geschick:**

| Skill-Level | verfehlt | leicht | normal | schwer | kritisch | Ø Schadensfaktor | × Effektivität |
|------------:|------:|------:|------:|------:|------:|------:|------:|
| 1 | 3,0 % | 17,0 % | 52,0 % | 24,0 % | 4,0 % | 1,034 | 1,03 |
| 5 | 2,5 % | 15,6 % | 51,5 % | 25,7 % | 4,6 % | 1,059 | 1,64 |
| 10 | 2,1 % | 14,0 % | 50,7 % | 27,7 % | 5,5 % | 1,088 | 2,23 |
| 20 | 1,6 % | 12,0 % | 49,1 % | 30,5 % | 6,8 % | 1,130 | 3,45 |
| 50 | 1,2 % | 10,5 % | 47,6 % | 32,6 % | 8,1 % | 1,164 | 7,04 |
| 100 | 1,2 % | 10,4 % | 47,5 % | 32,7 % | 8,1 % | 1,166 | 12,89 |

**Biss Lv 1, Geschick-Unterschied:**

| ΔGeschick | −5 | −2 | 0 | +1 | +2 | +3 | +5 | +10 |
|-----------|---:|---:|--:|---:|---:|---:|---:|----:|
| verfehlt | 4,4 % | 3,5 % | 3,0 % | 2,8 % | 2,5 % | 2,3 % | 2,0 % | 1,5 % |
| kritisch | 2,8 % | 3,4 % | 4,0 % | 4,3 % | 4,6 % | 5,0 % | 5,6 % | 6,9 % |
| Ø Faktor | 0,976 | 1,009 | 1,034 | 1,047 | 1,059 | 1,071 | 1,094 | 1,133 |

**Bewertung (Vorschlag Claude):**
- Das Modell ist solide: Die Wahrscheinlichkeiten ergeben immer 100 %, und Krit/Verfehlen bleiben wie vorgegeben selten (Krit ≤ 8,1 %, Verfehlen ≥ 1,2 %).
- Die Trefferstufen sind eine **zweite, versteckte Wachstumskurve** des Skill-Levels. Bis Level 50 kommen etwa **+13 %** Durchschnittsschaden dazu, danach nichts mehr (tanh gesättigt). Das Level zählt also zweimal: über die Effektivität und über die Kippung.
  > Begründung offen — Soll das Skill-Level zusätzlich zur Effektivität die Trefferstufen verbessern? (Beim Geschick wurde die Doppelzählung bewusst ausgeschlossen, siehe GDD-03.)
- **Erfolgsmomente:** Bei 4–8 % Krit-Chance kommt etwa jeder 12. bis 25. Angriff kritisch. Das ist selten genug, um besonders zu wirken, und häufig genug, um in jedem längeren Kampf vorzukommen.

### 12.2 Effekt-Chancen am Beispiel Venom

Venom würfelt bei jedem Treffer (nicht bei „verfehlt“). Ein neuer Treffer **frischt** das Gift auf (4 s), er stapelt es nicht. Wichtiger als die Chance pro Treffer ist deshalb der **Anteil der Zeit, in der das Ziel vergiftet ist** (Uptime): `1 − (1 − p_Treffer · p_Gift)^(4 s / Angriffsabstand)`.

| Angriffsabstand | Venom Lv 1 (30 %) | Lv 5 (50 %) | Lv 20 (74 %) |
|----------------:|------:|------:|------:|
| 0,8 s | 82 % | 96 % | 99,8 % |
| 1,2 s (Biss) | 68 % | 89 % | 98,5 % |
| 1,6 s | 58 % | 81 % | 96 % |
| 2,4 s | 44 % | 67 % | 88 % |

**Folgerungen:**
- Ab etwa 60 % Chance bringt mehr Chance kaum noch etwas, weil das Ziel ohnehin fast immer vergiftet ist. Der Wert der Chance hängt also stark von der **Angriffsgeschwindigkeit** ab.
- Gift-Schaden umgeht die Schadenspipeline (`processTicks` zieht `damagePerTick` direkt ab): **kein Panzer, keine Schwäche, keine Trefferstufe.** Gegen gepanzerte Gegner ist Gift deshalb besonders stark.
  > Begründung offen — Soll Gift Rüstung ignorieren? (Biologisch plausibel: Gift wirkt von innen.)

**Vorschlag (Claude):** Chancen asymptotisch wachsen lassen (Abschnitt 11.3). Zusätzlich sollte ein Level oberhalb der Sättigung etwas anderes verbessern, z. B. die Dauer oder den Schaden pro Sekunde.

### 12.3 Befund: Auffrischen setzt den Gift-Takt zurück

Beim Auffrischen setzt [StatusEffectSystem.ts](../src/systems/StatusEffectSystem.ts) (`applyEffect`) auch `lastTickAt` neu. Kommt der nächste Treffer früher als nach 1 s (Takt des Gifts), tickt das Gift nie. Simuliert (Gift-Ticks pro Sekunde):

| Angriffsabstand | Chance | heute | ohne Takt-Reset |
|----------------:|-------:|------:|----------------:|
| 0,6 s | 30 % | 0,62 | 0,87 |
| 0,6 s | 60 % | 0,48 | 1,00 |
| 0,6 s | 100 % | **0,00** | 1,00 |
| 0,8 s | 60 % | 0,48 | 0,98 |
| 1,2 s | 100 % | 0,83 | 1,00 |

Bei schnellen Angriffen macht **höheres Venom-Level weniger Gift-Schaden.** Das passiert, wenn der Blob Biss und Klauenhieb abwechselt oder mehrere Giftspinnen den Blob angreifen. Außerdem überschreibt ein schwächeres Gift ein stärkeres (die Werte werden ersetzt, nicht das Maximum genommen). Beides steht als `[BUG]` in [TODO.md](../TODO.md) und ist nicht behoben.

### 12.4 Erfolgschance und Skill-Fund: Glück und Pech

Ein Skill-Fund ist ein Münzwurf mit Chance `p` pro Versuch. Die Zahl der Versuche bis zum Fund ist **geometrisch verteilt**: im Mittel `1/p`, aber mit langen Pechsträhnen.

| Skill (Quelle) | Methode | p | Ø Versuche | 50 % haben ihn nach | 90 % nach | 1 % warten länger als |
|----------------|---------|--:|-----------:|----:|----:|----:|
| Photosynthesis (Gras) | Absorb | 12 % | 8,3 | 6 | 19 | 37 |
| | Analyze (×0,7) | 8,4 % | 11,9 | 8 | 27 | 53 |
| Superstrength (Ameise) | Absorb | 10 % | 10 | 7 | 22 | 44 |
| | Analyze | 7 % | 14,3 | 10 | 32 | 64 |
| Jump / Venom (Spinnen) | Absorb | 20 % | 5 | 4 | 11 | 21 |
| | Analyze | 14 % | 7,1 | 5 | 16 | 31 |

Dazu kommt die Erfolgschance `min(1, Fähigkeits-Level / Entity-Level)`. Bei 50 % verdoppeln sich alle Zahlen.

**Gängige Gegenmittel gegen Pechsträhnen:**
- **Pseudo-Zufall (PRD, Dota 2 / Warcraft III):** Die Chance beginnt niedriger und steigt mit jedem Fehlschlag, bis es klappt. Der Mittelwert bleibt gleich, die Streuung sinkt stark.
- **Pity / Bad-Luck-Protection:** Nach `n` Fehlschlägen ist der Erfolg garantiert, oder jeder Fehlschlag erhöht die Chance um einen festen Betrag.
- **Fortschrittsbalken statt Würfel:** Jede Analyse füllt einen sichtbaren Balken („Verständnis 40 %“). Das wäre deterministisch und passt thematisch zu *Analysieren*.

**Vorschlag (Claude):** Für Skill-Funde eine Pity-Regel pro Skill und Quelle verwenden (z. B. +50 % der Grundchance je Fehlschlag). Lange Pechsträhnen fallen dann praktisch weg, der Mittelwert sinkt nur leicht. Das zahlt direkt auf „man soll Erfolge haben“ ein.

> Begründung offen — Echter Zufall, Pseudo-Zufall, Pity oder sichtbarer Fortschritt beim Skill-Fund?

---

## 13. Wechselwirkungen zwischen Skills

### 13.1 Wo ein Level mehrfach wirkt

| Größe | wirkt auf |
|-------|-----------|
| **Absorb-Level** | Erfolgschance Absorb · unbewaffneter Schaden (`3 + 1,5·L`) · Trefferstufen-Kippung beim unbewaffneten Angriff · Nenner des XP-Multiplikators |
| **Skill-Level eines Angriffs** | Effektivität (Schaden) · Trefferstufen-Kippung · XP-Multiplikator |
| **Jump-Level** | Sprungweite · **Geschick** → Trefferstufen **aller anderen** Angriffe und Verteidigung gegen alle Gegner |
| **Spieler-Level** | HP, MP · Größe des Blobs → Geschwindigkeit, Kamera, Absorb-Grenze (GDD-02 1.4) |
| **Superstrength-Level** | Multiplikator auf **jeden** Treffer (auch Biss und Klaue) |

Mehrfachwirkung ist nicht schlecht. Sie macht Level-Ups spürbarer. Sie sollte aber **bewusst** sein, weil sich die Effekte multiplizieren.

### 13.2 Geschick

- **Quelle heute:** nur Jump (`1 + √(L−1)`). Weitere Quellen addieren sich (`resolveDexterity`).
- **Symmetrisch:** Es zählt der Vorsprung `Geschick Angreifer − Geschick Verteidiger`. Dasselbe Geschick verbessert also eigene Treffer **und** verschlechtert die des Gegners.
- **Gemeinsamer Deckel mit dem Skill-Level:** Beide stehen im selben `tanh`. Je höher der Angriffsskill, desto weniger bringt Geschick:

| Skill-Level des Angriffs | Ø Schadensfaktor durch +1 Geschick |
|-------------------------:|-----------------------------------:|
| 1 | +1,27 % |
| 10 | +1,03 % |
| 20 | +0,57 % |
| 40 | +0,10 % |

**Bewertung (Vorschlag Claude):** Der Spieler „verliert“ den Wert seines Geschicks, wenn er seine Angriffe hochlevelt. Das ist wahrscheinlich nicht beabsichtigt. Zwei Alternativen:
1. **Getrennte Deckel:** `kipp = 0,2·tanh(Level-Anteil) + 0,2·tanh(Geschick-Anteil)`. Beide Quellen behalten ihren eigenen Spielraum.
2. **Geschick als eigene Achse:** Geschick wirkt nicht auf die Trefferstufen, sondern z. B. auf Ausweichen (im Typ schon als Idee erwähnt: „Ausweichen“).

> Begründung offen — Sollen Skill-Level und Geschick sich einen gemeinsamen Deckel teilen?

### 13.3 Stapelregeln (mehrere Skills mit demselben Effekt)

Heute ([GDD-05 Abschnitt 8.2](GDD-05-Kampfmathematik.md#82-konflikte)): Schadens-Multiplikatoren **multiplizieren** sich, %-Reduktionen **addieren** sich (Deckel 85 %), Flat-Block **addiert** sich, Schwächen **multiplizieren** sich (Deckel ×0,1 … ×3).

**Risiko:** Multiplikative Ketten wachsen exponentiell mit der Zahl der Skills. Fünf Skills mit je ×1,3 ergeben ×3,7, zehn ergeben ×13,8. Bei einem Spiel, dessen Kern das Sammeln vieler Skills ist, ist das der wahrscheinlichste Weg zu „kaputter“ Balance.

**Gängige Praxis (Path of Exile „increased“ vs. „more“):** Innerhalb einer Kategorie wird **addiert** (`1 + 0,3 + 0,3 = 1,6`), zwischen Kategorien **multipliziert**. Nur wenige, bewusst seltene Effekte multiplizieren.

**Vorschlag (Claude):** Für `damage_mult` künftig: alle Boni einer Kategorie (z. B. „Nahkampfschaden“) addieren, Kategorien untereinander multiplizieren. Mit nur einem Multiplikator-Skill (Superstrength) ändert sich heute nichts. Die Regel sollte aber stehen, bevor weitere Skills dazukommen.

> Begründung offen — Stapelregel für Schadens-Multiplikatoren.

### 13.4 Schwellen: Flat-Block gegen Trefferstufen

Flat-Block zieht einen festen Betrag ab. Der Schaden wird nach der Trefferstufe berechnet, aber vor dem Block. Leichte Treffer bleiben deshalb hängen, kritische schlagen durch ([GDD-05 Abschnitt 9.3](GDD-05-Kampfmathematik.md#93-globale-balance-konstanten-balancets)). Erwarteter Schaden pro Biss (HP) gegen Chitin (Stich-Block):

| Chitin des Ziels | Biss Lv 1 | Lv 3 | Lv 5 | Lv 10 | Lv 20 |
|------------------|----------:|-----:|-----:|------:|------:|
| keins | 7,2 | 9,9 | 11,5 | 15,6 | 24,1 |
| Lv 3 (Giftspinne) | **0,9** (69 % geblockt) | 3,1 | 4,5 | 8,5 | 17,0 |
| Lv 5 (Kl. Skorpion) | 0,4 | 1,7 | 3,1 | 6,9 | 15,3 |
| Lv 8 (Gr. Skorpion) | 0,3 (93 % geblockt) | 0,9 | 1,6 | 5,2 | 13,4 |

**Folgerungen:**
- Biss Lv 1 gegen eine Giftspinne (15 HP) braucht im Schnitt ~17 Bisse. Von Biss Lv 2 auf Lv 3 steigt der Schaden von 1,4 auf 3,1 HP, also auf mehr als das Doppelte: Der Effektivitäts-Sprung (+22,7 %) hebt normale Treffer deutlich über die Schwelle.
- Schwellen sind **gut für Erfolgsmomente** („plötzlich komme ich durch“), aber hart am Anfang. Sie belohnen den Wechsel des Schadenstyps (unbewaffnet = Wucht → nur 9 % Reduktion statt 7,24 HP Block). Das entspricht der Idee von GDD-05.
- Gift umgeht Chitin vollständig (Abschnitt 12.2). Venom und Biss ergänzen sich daher gegen gepanzerte Gegner, ohne dass das als Synergie dokumentiert ist.

### 13.5 Weitere Wechselwirkungen

| Kombination | Wirkung | Bewertung |
|-------------|---------|-----------|
| Venom × Angriffsgeschwindigkeit | Gift-Uptime steigt mit der Trefferrate, über ~60 % Chance kaum Mehrwert | siehe 12.2, Takt-Fehler 12.3 |
| Hemolymph × Zahl der Angreifer | Rückschlag pro erlittenem Treffer, wächst mit Gegnerzahl und deren Tempo | gewollt (Abwehr gegen Gruppen), unbegrenzt linear |
| Superstrength × Trefferstufe × Chitin | Multiplikator wirkt **vor** dem Block → hebt leichte Treffer über die Schwelle | starke, undokumentierte Synergie gegen Panzer |
| Geschick (Jump) × alle Angriffe | ein Skill verbessert alle anderen | siehe 13.2 |
| Gegner-Bonuslevel (Kämpfe untereinander) | HP, Schaden, Tempo ×1,25 je Stufe, max. ×1,95 | XP-Multiplikator und Erfolgschance nutzen nur das Grund-Level (`def.level`): Ein Gegner mit Bonuslevel 3 ist fast doppelt so stark, gibt aber nicht mehr XP |

---

## 14. Zusammenfassung Teil 2

1. **Wirkung und Kosten gemeinsam denken:** Heute wachsen Kosten exponentiell und Wirkung linear. Die gefühlte Stärke steigt nur logarithmisch mit der Spielzeit (11.1).
2. **Prozente und Chancen asymptotisch** statt linear mit Deckel (11.3, 11.4). Chitin-Wucht zeigt, wie lineare Prozente kurz vor dem Deckel kippen.
3. **Referenz-Machtkurve** für Entity-Level, damit Level, Gefahr und Belohnung zusammenpassen (11.5).
4. **Trefferstufen** sind solide und bringen eine verdeckte zweite Level-Kurve (+13 %) mit (12.1).
5. **Gift:** Chance sättigt mit der Angriffsgeschwindigkeit, umgeht Rüstung, und hat einen **Fehler** beim Auffrischen (12.2, 12.3).
6. **Skill-Fund:** Pechsträhnen von 40–60 Versuchen sind möglich. Pity oder sichtbarer Fortschritt würden helfen (12.4).
7. **Geschick verliert an Wert**, wenn Angriffsskills steigen (gemeinsamer tanh-Deckel, 13.2).
8. **Stapelregel** für Multiplikatoren festlegen, bevor viele Skills dazukommen (13.3).

## 15. Offene Entscheidungen (Teil 2)

- [ ] Effektivitäts-Bonus `+0,15 ab Level 3`: gewollter Meilenstein? (11.2)
- [ ] Absolute Wirkungen: linear lassen oder milder Faktor pro Level für Spieler und Gegner? (11.3)
- [ ] %-Reduktion: linear mit Deckel oder `x/(x+K)`? (11.4)
- [ ] Entity-Level aus der Stärke ableiten (Referenz-Machtkurve)? (11.5)
- [ ] Skill-Level zusätzlich in der Trefferstufen-Kippung? (12.1)
- [ ] Gift ignoriert Rüstung, gewollt? Was bringt Venom oberhalb der Sättigung? (12.2)
- [ ] Skill-Fund: echter Zufall, PRD, Pity oder Fortschrittsbalken? (12.4)
- [ ] Geschick und Skill-Level: gemeinsamer oder getrennter Deckel? (13.2)
- [ ] Stapelregel für Schadens-Multiplikatoren (additiv in Kategorie, multiplikativ zwischen Kategorien)? (13.3)

---

# Teil 3 — Unendliches Leveln

## 16. Vorschlag C (Entwickler): Unendliches Leveln, lineare Skala, Anzeige in %

> Status: Diskussion

**Vorschlag (Entwickler):** Skills leveln unendlich. Weil die absoluten XP-Zahlen dabei bedeutungslos werden, reicht eine Anzeige des Fortschritts in % bis zum nächsten Level. Dann kann direkt mit einer **linearen XP-Skala** gerechnet werden (jedes Level kostet gleich viel). Boost- und Hemmungseffekte werden entsprechend auf den Ertrag angewendet.
**Begründung (Entwickler):** Bei unendlichem Leveln werden die Zahlen bedeutungslos; eine %-Anzeige reicht.

### 16.1 Prüfung: Geht das ohne Verlust?

**Ja.** Jedes Modell aus Teil 1 lässt sich in „Level-Einheiten“ umrechnen. Man teilt den Ertrag durch den Bedarf des aktuellen Levels:

```
Fortschritt pro Aktion (in Level, 1 = 100 %) = g(s, L) / need(L)
```

Danach kostet jedes Level genau „1“, die Skala ist also linear. Die Kurve ist nicht weg, sie steckt jetzt **im Ertrag** statt in der Schwelle. Für den Spieler ist das nicht zu unterscheiden (gleiches `N(L)`, Teil 1 Abschnitt 1). Das Zwei-Exponenten-Modell (Abschnitt 8) lautet in dieser Form:

```
Fortschritt pro Aktion = m(s, L) / N(L)        N(L) = Aktionen pro Level bei gleichstufiger Quelle
```

Die beiden „Stellschrauben“ sind damit sehr anschaulich:
- `N(L)`: Wie viele gleichstufige Aktionen kostet ein Level? Das ist der eingebaute Anstieg.
- `m(s, L)`: Boost bzw. Hemmung je nach Level-Unterschied.

**Begründung (Vorschlag Claude):** Diese Form ist einfacher zu verstehen und zu balancieren als absolute XP. Beide Hebel sind direkt in Aktionen ablesbar, und es gibt keine großen Zahlen.

### 16.2 Was dabei beachtet werden muss

**a) Soll Leveln bei gleichstufigen Gegnern schwerer werden?** Wenn `N` konstant ist, wird es nur über die Welt schwerer (man muss stärkere Quellen finden). Das ist genau das Verhalten des proportionalen Modells (Abschnitt 4). Soll es zusätzlich mit dem Level schwerer werden, muss `N(L)` steigen, z. B. `N(L) = 3·L`.

**b) Die Hemmung bestimmt, was jenseits der Welt passiert.** Unendliche Level heißt: Irgendwann ist man stärker als das stärkste Wesen der Welt (heute der Drache, Lv 20). Ab dann entscheidet allein die Form der Hemmung. Kumulierte Aktionen, wenn immer an der stärksten Quelle (Lv 20) gelevelt wird:

| Variante | bis Lv 20 | Lv 30 | Lv 40 | Lv 60 | Lv 100 | Lv 200 |
|----------|------:|------:|------:|------:|------:|------:|
| `N = 5`, Differenz `1,5^(s−L)`, Boden 0,05 | 95 | 541 | 1.541 | 3.541 | 7.541 | 17.541 |
| `N = 5`, Verhältnis `(s/L)^1,5`, Boden 0,05 | 95 | 163 | 277 | 668 | 2.266 | 11.166 |
| `N = 3·L`, Verhältnis `(s/L)^1,5`, Boden 0,05 | 570 | 1.592 | 3.968 | 15.826 | 94.418 | 915.061 |
| `N = 3·L`, ohne Hemmung | 570 | 1.305 | 2.340 | 5.310 | 14.850 | 59.700 |

- **Differenz-Hemmung** greift schnell: Ab etwa 7 Leveln über der Quelle ist der Boden (0,05) erreicht. Danach kostet jedes Level gleich viel (hier 100 Aktionen), es geht also **linear unendlich** weiter.
- **Ohne Boden** würde die Differenz-Hemmung einen weichen Deckel bilden: Jedes weitere Level kostet ×1,5, das Level wächst nur noch logarithmisch.
- **Verhältnis-Hemmung** bremst sanfter, erreicht den Boden aber erst bei etwa dem 7-Fachen des Quell-Levels.
- **Der Boden (`XP_CURVE_MIN`) ist bei unendlichem Leveln der wichtigste Wert für das Spätspiel.** Er legt fest, ob es jenseits der Welt linear weitergeht oder ob man praktisch stehen bleibt.

> Begründung offen — Wie soll sich Leveln jenseits des stärksten Wesens anfühlen: weiter linear, weicher Deckel, oder soll die Welt immer stärkere Wesen nachliefern?

**c) Absolute XP-Quellen müssen umgerechnet werden.** Kampf-XP ist heute „Schaden in HP“, Photosynthesis „geheilte HP“. Bei linearer Skala würde ein stärkerer Skill (mehr Schaden pro Treffer) **schneller** leveln, je höher er ist. Das ist das Gegenteil von „schwerer werden“. Die Lösung ist, den Wert auf die eigene Stärke zu beziehen:

```
Fortschritt pro Treffer = (Schaden / erwarteter Schaden des Skills auf Level L) · m(s, L) / N(L)
```

Ein „durchschnittlicher“ Treffer zählt dann als eine Aktion, ein kritischer etwas mehr. Dasselbe gilt für Block (Chitin), Rückschlag (Hemolymph), Gift und Heilung.

**d) Wirkungskurven werden Pflicht.** Mit unendlichen Leveln erreicht jede lineare Prozent- oder Chancen-Formel irgendwann ihren Deckel. Danach sind alle weiteren Level wertlos (Venom ab Lv 50, Chitin-Wucht ab Lv 29). Die Empfehlung aus Abschnitt 11.3 (asymptotische Kurven für Prozente und Chancen) wird damit zur Voraussetzung.

**e) Spieler-Level wird einfach.** In Level-Einheiten ist die Summe aller Skill-XP genau die **Summe aller Skill-Level** (mit Bruchteilen). Das ist die Skyrim-artige Variante aus Abschnitt 9, ohne Zusatzaufwand.

**f) Speichern und Zahlbereich.** Gespeichert wird `level` (ganze Zahl) plus `progress` (Anteil 0 … 1). Der kleinste Fortschritt pro Aktion liegt in den Beispielen bei etwa 0,00008 Level (`N = 3·L`, Lv 200, Boden 0,05). Passend zur Milli-Konvention des Projekts reicht eine ganze Zahl in **Millionstel Level** (`progressMicro`, 0 … 999.999), oder einfach ein Gleitkomma-Wert. Integer-Grenzen spielen keine Rolle mehr (Level 2⁵³ ist unerreichbar). Alte Spielstände lassen sich umrechnen: `progress = currentXp / xpToNextLevel`.

**g) Anzeige.** „Biss Lv 12 · 37 %“ statt „Biss Lv 12 · 384 / 1.037 XP“. Die Höhe eines einzelnen Gewinns lässt sich als „+2 %“ anzeigen. So sieht der Spieler direkt, ob sich ein Gegner lohnt.

### 16.3 Bewertung (Vorschlag Claude)

Der Vorschlag ist mathematisch sauber und vereinfacht das System deutlich. Die eigentlichen Designentscheidungen werden dadurch **sichtbarer**, sie verschwinden aber nicht:
1. `N(L)` — konstant oder steigend? (16.2 a)
2. Hemmung — Differenz oder Verhältnis, und welcher Boden? (16.2 b)
3. Normierung absoluter XP-Quellen auf die eigene Stärke (16.2 c)
4. Asymptotische Wirkungskurven für alle Prozente und Chancen (16.2 d)

Ein möglicher Startpunkt: `N(L) = 3 + L` (Lv 1: 4 Aktionen, Lv 10: 13, Lv 50: 53), Verhältnis-Hemmung wie heute (`(s/L)^1,5`, 0,05 … 4), Spieler-Level = Summe der Skill-Level.

> Begründung offen — Werte sind ein Startvorschlag und nicht getestet.

### 16.4 Offene Entscheidungen (Teil 3)

- [ ] Vorschlag C übernehmen (unendliche Level, lineare Skala, Anzeige in %)?
- [ ] `N(L)`: konstant oder steigend, und wie stark?
- [ ] Verhalten jenseits des stärksten Wesens: linear (Boden), weicher Deckel (kein Boden) oder immer stärkere Wesen?
- [ ] Gilt das auch für die Kern-Fähigkeiten Analyze/Absorb (heute max. Level 20)?

---

# Teil 4 — Braucht es Level überhaupt?

## 17. Überlegung (Entwickler): Nur das Verhältnis zählt

> Status: Diskussion — die Entscheidungen aus Teil 3 bleiben ausdrücklich offen.

**Überlegung (Entwickler):** Für Level und Statuswerte gilt dasselbe wie für XP: Sind sie unbegrenzt, werden die konkreten Zahlen bedeutungslos. Entscheidend ist nur, wie die eigenen Werte im Verhältnis zu denen der Gegner stehen. Spiele, die weiterentwickelt werden, haben trotzdem oft Level über 100, weil mit jeder Erweiterung einfach das Max-Level erhöht werden kann. Lässt sich das auf eine gleichbleibende Level-Grenze übertragen? Oder ist es sinnvoll, Level ganz abzuschaffen?

### 17.1 Prüfung: Sind die Zahlen wirklich bedeutungslos?

**Im Kern ja.** Multipliziert man alle HP und alle Schadenswerte mit demselben Faktor, braucht jeder Kampf gleich viele Treffer. Der Spielablauf ändert sich nicht. Ein Level ist dann nur eine Koordinate. Bedeutung hat allein die Umrechnung „Level-Unterschied → Stärke-Verhältnis“.

Wächst die Stärke um einen festen Prozentsatz pro Level (`Stärke ∝ w^L`), dann gilt:

```
Level = log_w(Stärke)          Level-Unterschied ΔL  ⇔  Stärke-Verhältnis w^ΔL
```

Das Level ist dann eine **logarithmische Stärkeskala**, vergleichbar mit Dezibel oder der Richterskala. Bei w = 1,1 bedeuten 7 Level Unterschied doppelte Stärke, 100 Level etwa ×12.500. Bei w = 1,05 bedeuten 100 Level nur ×125.

**Wo das Spiel heute nicht skalenfrei ist** (absolute Zahlen haben eine eigene Bedeutung):
- `MIN_SKILL_DAMAGE` = 1 HP und `MIN_FINAL_DAMAGE` = 1 mHP sind feste Untergrenzen.
- Trefferstufen kippen nach dem **absoluten** Level- und Geschick-Unterschied (`0,05·(L−1)`, `0,1·ΔGeschick`).
- Flat-Block ist ein fester Betrag, der nur zusammen mit dem Schaden skaliert.
- Die Größe des Blobs (`worldSize`) bestimmt Tempo, Kamera und die Absorb-Grenze.

Diese Stellen müsste man anpassen, wenn man die Zahlen später „stauchen“ will.

**Einschränkung:** Für das Spiel sind die Zahlen bedeutungslos, für den Spieler nicht ganz. Steigende Zahlen sind ein sichtbares Belohnungssignal. Sie zeigen außerdem schnell, wie gefährlich ein Gegner ist (Level-Zahl über dem Kopf).

### 17.2 Warum Spiele mit Erweiterungen das Max-Level anheben

- Neue Inhalte brauchen Raum für neue Belohnungen. Ein höheres Max-Level macht alte Ausrüstung überflüssig und gibt allen wieder ein Ziel.
- Es ist einfach zu kommunizieren („neues Max-Level 70“).
- **Kosten:** Die Zahlen blähen sich auf, alte Inhalte werden trivial, und der Weg zum Max-Level wird immer länger. World of Warcraft hat deshalb 2020 das Max-Level von 120 auf 60 zurückgesetzt und mehrfach alle Werte gestaucht (Stat-Squish in 6.0, 8.0, 9.0 und 12.0). Ein Squish ist genau die Umrechnung aus 17.1. Er bestätigt, dass die absoluten Zahlen beliebig sind.

### 17.3 Übertragbar auf eine feste Level-Grenze?

| Ansatz | Beispiel | Wie neue Inhalte Platz finden | Vorteile | Nachteile |
|--------|----------|-------------------------------|----------|-----------|
| **A. Fester Deckel + horizontaler Fortschritt** | Guild Wars 2: Max-Level 80 seit 2012, „wird nie erhöht“; Erweiterungen bringen Masteries und Elite-Spezialisierungen | neue Fähigkeiten, Optionen, Gebiete statt mehr Stärke | Alte Inhalte bleiben relevant, Balance bleibt beherrschbar | Weniger „Zahlen wachsen“-Gefühl |
| **B. Fester Deckel + Stauchen** | WoW-Squish | die alte Skala wird zusammengeschoben, oben entsteht neuer Platz | Zahlen bleiben klein | Spieler „verlieren“ gefühlt Level |
| **C. Asymptotischer Deckel** | Level = `Lmax · (1 − e^(−x/K))` | Der Platz kurz unter dem Deckel ist unendlich fein | Deckel wird nie erreicht | Später Fortschritt sieht winzig aus (99,2 → 99,4) |
| **D. Welt skaliert mit** | Elder Scrolls Online (One Tamriel), Oblivion | Gegner passen sich dem Spieler an | Ganze Welt bleibt spielbar | Fortschritt wird kaum spürbar; Level-Unterschiede für XP und Gefahr verlieren ihren Sinn |
| **E. Weltstufen statt Spielerstufen** | Diablo 4 (Welt-Stufen), Genshin (Weltstufe) | Die Welt steigt eine Stufe, die Skala darin bleibt gleich | Ein „Neubeginn“ ohne Zahlenexplosion | Zusätzliches System |
| **F. Begrenzte Zahlen** | D&D 5e „Bounded Accuracy“: Treffer- und Verteidigungswerte steigen kaum, Stärke wächst über HP | kaum nötig, die Spanne bleibt klein | Schwache Gegner bleiben **in Gruppen** gefährlich | Einzelne schwache Gegner wirken bei hohem Level zäh |

**Ergebnis:** Ein fester Deckel und ständig wachsende **vertikale** Stärke widersprechen sich. Mit festem Deckel geht es nur, wenn neue Inhalte vor allem **horizontal** etwas bringen (A, E, F) oder die Skala regelmäßig neu normiert wird (B, C).

### 17.4 Level ganz abschaffen?

Was Level im Spiel heute leisten, und was sie ersetzen könnte:

| Aufgabe | Heute | Möglicher Ersatz |
|---------|-------|------------------|
| **Belohnung / Fortschrittsgefühl** | Level-Up-Meldung, XP-Balken | neue Skills entdecken, Kombinationen, **Wachstum des Blobs**, sichtbare Veränderung (Transformation, GDD-02 Abschnitt 7) |
| **Vergleich mit Gegnern** | Erfolgschance, XP-Multiplikator, Aggro | **Größenverhältnis** (schon Konzept: GDD-02 1.4, GDD-03 Aggro, GDD-07 Größenklassen) oder ein abgeleiteter **Stärke-Index** aus den Werten (wie Kampfkraft/Gear-Score) |
| **Freischalten** | Größe hängt am Spieler-Level, Absorb-Grenze an der Größe | Größe direkt aus aufgenommener Masse |
| **Wirkung skalieren** | Skill-Level in den Formeln | Übung als interne Zahl, sichtbar nur als Stufen oder Beschreibung („geübt“, „gemeistert“) |

Varianten:

| Variante | Beschreibung | passt zu Absorb & Evolve, weil … | Risiko |
|----------|--------------|----------------------------------|--------|
| **V1 Unsichtbare Level** | intern bleibt alles, angezeigt werden Balken, Stufen, Beschreibungen | ändert die Mathematik nicht, nur die Darstellung | Gefahr eines Gegners ist schwerer ablesbar |
| **V2 Größe statt Spieler-Level** | Der Blob wächst mit aufgenommener Masse oder Erfahrung; Größe ist das sichtbare „Level“ | *Physarum* wächst wirklich; Größe ist schon heute Maßstab für Absorb und Aggro; man sieht den Vergleich direkt auf dem Bildschirm | Größe allein sagt nichts über Gift, Panzer usw. |
| **V3 Keine Zahlen-Progression** | Fortschritt nur über neue Skills und Kombinationen (wie Metroidvanias oder Zelda) | Entdecken ist der Kern (GDD-01) | Widerspricht dem Kern-Loop „gleiches Wesen mehrfach absorbieren = höheres Level“ (GDD-01 Abschnitt 3) |
| **V4 Skill-Budget** | Die Summe aller Skill-Level ist gedeckelt (Ultima Online: 700 Punkte, je Skill max. 100); wer mehr will, muss anderes vergessen | Die geplante **Vergessen-Mechanik** (GDD-02 Abschnitt 7) wäre damit schon beschrieben; Erweiterungen bringen neue Skills, kein höheres Budget | Spieler müssen sich entscheiden, das kann frustrieren |

### 17.5 Synthese: Fortschritt unbegrenzt, Stärke begrenzt (Vorschlag Claude)

Teil 3 (unendliche Level) und dieser Teil (feste Grenze) lassen sich verbinden. Man lässt die **Übung** unbegrenzt wachsen, die **Wirkung** aber gegen einen Grenzwert laufen:

```
Wirkung(L) = Grundwert + Spanne · (1 − 0,5^((L−1)/H))        H = „Halbwerts-Level“
```

Bei H = 10 erreicht ein Skill auf Level 11 die Hälfte der Spanne, auf Level 21 drei Viertel, auf Level 31 sieben Achtel. Jedes Level bringt etwas, aber die Stärke bleibt in einer festen Spanne. Damit gilt:

- Die Level-Zahl darf beliebig steigen. Sie zeigt Übung, keine unbegrenzte Macht.
- Das Verhältnis zu Gegnern bleibt beherrschbar. Schwache Wesen werden nie völlig harmlos, besonders in Gruppen (wie bei Bounded Accuracy).
- Neue Inhalte (Biome, Wesen, Skills) brauchen kein höheres Max-Level. Sie bringen neue Skills und Kombinationen, also horizontalen Fortschritt.
- Das passt zur Empfehlung „asymptotische Kurven“ aus Abschnitt 11.3 und zu „Erfolge haben“: Neue Skills starten bei Level 1 und wachsen anfangs schnell.

**Begründung (Vorschlag Claude):** Der Kern des Spiels ist horizontal (Entdecken, Kombinieren) und organisch (Wachsen). Eine unbegrenzte vertikale Stärke würde diesen Kern auf Dauer überdecken und das Balancing gegen eine endliche Welt (Bestiarium) erschweren.

> Begründung offen — Vorschlag, nicht entschieden.

### 17.6 Offene Fragen (Teil 4)

- [ ] Welche Aufgaben soll ein Level erfüllen: Belohnung, Vergleich mit Gegnern, Freischalten, Wirkung (17.4)?
- [ ] Spieler-Level behalten, durch die Größe ersetzen (V2) oder abschaffen?
- [ ] Vergleich mit Gegnern über Level, Größe oder einen abgeleiteten Stärke-Index?
- [ ] Unbegrenzte Stärke, begrenzte Stärke bei unbegrenzter Übung (17.5) oder Skill-Budget (V4)?
- [ ] Sollen große, wachsende Zahlen bewusst als Belohnung erhalten bleiben?

---

# Teil 5 — Kapazität, Gruppen, Weltstufen

## 18. Skill-Kapazität und Verlernen

> Status: Diskussion — Überlegung des Entwicklers, nicht entschieden. Spielbeschreibung in [GDD-02 Abschnitt 7.1](GDD-02-Skillsystem.md#71-skill-kapazität-und-verlernen).

**Überlegung (Entwickler):**
- Ein Wesen hat nur eine begrenzte Kapazität, Fähigkeiten anzuhäufen. Lernt es Neues, wird stattdessen Altes verlernt.
- Durch kontinuierliches Spielen kann die maximale Kapazität leicht erweitert oder überschritten werden. In Spielpausen sinkt sie wieder auf das Normalmaß.
- Verlerntes kann schneller wieder erlernt werden, z. B. doppelt so schnell.

**Begründung (Entwickler):** Es ist plausibel, dass ein Wesen nur eine begrenzte Kapazität hat, Fähigkeiten anzuhäufen.

### 18.1 Biologischer Hintergrund

- *Physarum polycephalum* lernt nachweislich durch **Habituation** (Gewöhnung an Chinin, Koffein oder Salz; Boisseau, Vogel & Dussutour 2016).
- In neutraler Umgebung scheidet der Schleimpilz das aufgenommene Salz binnen etwa **zwei Tagen** wieder aus und verliert damit die Gewöhnung. Die Forscher sprechen von einem „zirkulierenden Gedächtnis“: Der Schleimpilz merkt sich eine Substanz, indem er sie aufnimmt (Boussard et al. 2019, CNRS).
- Gelerntes kann durch **Verschmelzung** an andere Schleimpilze weitergegeben werden (Vogel & Dussutour 2016). Das passt zum Wiederbeleben und Verschmelzen in GDD-01 Abschnitt 10.
- **Wiedererlernen geht schneller** als Erstlernen. Ebbinghaus nannte das „Ersparnis“: nach 20 Minuten 58 %, nach einem Tag 34 %, nach 31 Tagen 21 % weniger Lernzeit.

Der Vorschlag des Entwicklers ist damit biologisch gut gedeckt. Besonders das Absinken der Kapazität in Pausen hat ein reales Vorbild.

### 18.2 Mathematisches Modell (Vorschlag Claude zur Diskussion)

In Level-Einheiten (Teil 3) lässt sich das einfach beschreiben:

```
Belegung  B = Σ über alle Skills (Level − 1 + Fortschritt)
Kapazität K = K_Basis + Überdehnung Ü           (0 ≤ Ü ≤ Ü_max)

Lernen, solange B < K:   normal
Lernen, wenn B ≥ K:      der Gewinn wird anderen Skills abgezogen (Verlernen)
Wiedererlernen:          Gewinn × 2, solange Level < Höchststand des Skills
```

| Baustein | Frage | Optionen |
|----------|-------|----------|
| **Was belegt Kapazität?** | Zählt schon das Kennen eines Skills (Level 1)? | nur Level über 1 (Anzahl der Skills unbegrenzt) · jeder Skill mindestens 1 (begrenzt auch die Anzahl) |
| **Wer verlernt?** | Wem wird abgezogen? | am längsten ungenutzter Skill zuerst (wie Habituation ohne Reiz) · gleichmäßig alle · vom Spieler markierte Skills (Ultima Online: Pfeile ↑ ↓ 🔒 pro Skill) |
| **Wiedererlernen** | Wie lange gilt der Bonus? | dauerhaft ×2 bis zum Höchststand · Bonus sinkt mit der Zeit wie bei Ebbinghaus (z. B. ×2 nach kurzer Zeit, ×1,3 nach langer) |
| **Überdehnung wächst durch …** | Was zählt als „kontinuierlich spielen“? | Spielzeit (echte Zeit) · **Aktivität**: Absorbieren und Analysieren füllen einen Speicher („zirkulierendes Gedächtnis“) |
| **Überdehnung sinkt durch …** | Was ist eine „Pause“? | echte Zeit ohne Spielen · **Spielzeit** ohne Aufnahme (Ausscheiden wie beim Salz) · Ruhe beim Hauptblob |
| **Wenn K unter B fällt** | Was passiert mit dem Überschuss? | sofort verlernen · langsam verlernen · nichts verlernen, aber erst wieder lernen, wenn B < K (am sanftesten) |

**Wichtige Folgen:**

1. **Messung in echter Zeit ist heikel.**
   - Eine Strafe für Pausen erzeugt Druck („ich muss spielen, sonst verliere ich etwas“). Viele Spiele machen es bewusst umgekehrt und *belohnen* Pausen, z. B. WoW mit „Rested XP“.
   - Auf dem Handy wird in kurzen Etappen gespielt.
   - Die Geräte-Uhr lässt sich verstellen.

   **Vorschlag (Claude):** Die Überdehnung an **Aktivität im Spiel** koppeln. Absorbieren füllt den Speicher, mit der Zeit im Spiel wird er wieder „ausgeschieden“. Das entspricht genau dem Salz-Experiment und kommt ohne echte Uhr aus.
   > Begründung offen — echte Zeit oder Spielzeit?

2. **Das Spieler-Level als Summe der Skill-Level funktioniert dann nicht mehr.** Die Summe ist durch K gedeckelt. Fortschritt zeigt sich stattdessen in der Breite: wie viele Skills je entdeckt wurden (INDEX), Höchststände, Größe und Kapazität.

3. **Zusammenspiel mit asymptotischer Wirkung (17.5).** Wenn die Wirkung pro Skill gegen einen Grenzwert läuft, lohnt sich Breite mehr als Spezialisierung. Beispiel mit Halbwerts-Level 10 bei 40 Kapazitätspunkten:
   - ein Skill auf Level 41: 94 % seiner Spanne
   - vier Skills auf Level 11: je 50 %, zusammen 200 %

   Das stärkt das Entdecken (Kern des Spiels). Über das Halbwerts-Level lässt sich einstellen, wie stark Spezialisierung bestraft wird.

4. **Wiedererlernen ×2** macht das Verlernen weniger schmerzhaft. Ein Skill kann für eine Situation gezielt „aufgefrischt“ werden. Damit wird die Kapazität ein taktisches Werkzeug statt einer Strafe.

> Begründung offen — Alle Bausteine aus der Tabelle sind offen.

---

## 19. Warum schwache Gegner in Gruppen gefährlich bleiben

### 19.1 In D&D 5e (Bounded Accuracy)

Ein Angriff trifft, wenn `W20 + Angriffsbonus ≥ Rüstungsklasse`. In der 5. Edition steigen diese Werte über alle 20 Stufen nur wenig: Der Übungsbonus wächst von +2 auf +6, magische Gegenstände bringen höchstens +3. Was stark wächst, sind die **Lebenspunkte**.

Beispiel: Ein Goblin (+4) gegen einen Kämpfer der Stufe 20 mit RK 20 trifft bei 16+ auf dem W20, also in 25 % der Fälle.

```
erwarteter Schaden pro Runde = Anzahl Angreifer × Trefferchance × Schaden
```

- Ein Goblin macht im Schnitt ~1,25 Schaden pro Runde und ist harmlos.
- Zwanzig Goblins machen ~25 pro Runde. Das ist spürbar, auch für eine hohe Stufe.

In älteren Editionen stiegen Angriffsbonus und RK etwa um 1 pro Stufe. Schwache Monster trafen dann nur noch mit einer natürlichen 20 (5 %). Die Zahl der Angreifer spielte praktisch keine Rolle mehr. 4e hat dafür sogar eine eigene Monsterart („Minions“) erfunden.

**Kern:** Solange die Trefferchance **nach unten begrenzt** bleibt, wächst die Gefahr linear mit der Zahl der Gegner. Gibt es eine Schwelle, unter der ein Angriff nichts mehr bewirkt, ist die Zahl egal.

### 19.2 Im eigenen Spiel (Stand v0.4)

- **Trefferchance:** schon heute „bounded“. Selbst mit maximalem Geschick-Nachteil steigt Verfehlen nur auf ~8–11 % (tanh-Deckel), fast jeder Angriff trifft.
- **Rüstung:** Hier liegt die Schwelle. **Flat-Block** (Chitin gegen Stich/Schnitt) zieht einen festen Betrag ab. Liegt er über dem Schaden eines Gegners, kommen nur noch schwere und kritische Treffer durch.

Ameisen (Biss 7 HP Stich, alle 1,8 s) gegen den Blob:

| Blob | Schaden je Ameise | 10 Ameisen | Blob Lv 5 (140 HP) hält … |
|------|------------------:|-----------:|------------------------:|
| ohne Chitin, Geschick 0 | 4,0 HP/s | 40 HP/s | 3,5 s |
| Chitin 1, Geschick 1 | 2,4 HP/s | 24 HP/s | 6 s |
| Chitin 3, Geschick 2 | 0,43 HP/s | 4,3 HP/s | 33 s |
| Chitin 5, Geschick 3 | 0,16 HP/s | 1,6 HP/s | 88 s |
| Chitin 8, Geschick 4 | 0,11 HP/s | 1,1 HP/s | 127 s |

Zum Vergleich mit Rüstung nach der Formel `x/(x+K)` (Abschnitt 11.4, K = 7): Chitin 3 ergibt 51 % Reduktion, also ~20 HP/s bei 10 Ameisen. Chitin 8 ergibt 61 %, also ~16 HP/s. Die Gruppe bliebe gefährlich.

**Weitere Einflüsse:**
- **Hemolymph** wirkt bei jedem erlittenen Treffer, auch wenn er geblockt wird. Ab Level 4 (8 HP Rückschlag) stirbt eine Ameise (8 HP) an ihrem ersten Treffer. Das ist ein starkes Mittel gegen Schwärme.
- **Gift aus Gruppen stapelt nicht.** Alle Venom-Effekte haben dieselbe Quelle (`venom`) und frischen sich nur gegenseitig auf. Zehn Giftspinnen vergiften nicht stärker als eine. Durch den Takt-Fehler (12.3) vergiften sie sogar schwächer.
- **Aggro nach Größe** (Konzept, GDD-03): Große Wesen ignorieren den kleinen Blob, kleine greifen an. Schwärme kleiner Wesen sind also die typische Bedrohung.

**Folgerung:** Heute sind Gruppen schwacher Gegner nur gefährlich, solange der Flat-Block unter ihrem Schaden liegt. Ein paar Chitin-Level machen ganze Schwärme fast harmlos. Wenn der Effekt gewollt ist, gibt es drei Möglichkeiten:
1. Flat-Block auf einen Anteil des Treffers begrenzen (z. B. höchstens 70 %).
2. Rüstung nach `x/(x+K)` statt als fester Abzug.
3. Gruppen-Effekte gezielt einbauen: Gift stapelt sich pro Angreifer, oder Schwarm-Skills.

> Begründung offen — Sollen Schwärme schwacher Gegner dauerhaft gefährlich bleiben? Wenn ja, welcher der drei Wege?

---

## 20. Weltstufen (Beispiel Diablo)

**Diablo 4, ursprüngliches System (2023):** vier Weltstufen.

| Stufe | Name | Zugang | Wirkung |
|-------|------|--------|---------|
| 1 | Abenteurer | ab Start | Grundschwierigkeit |
| 2 | Veteran | ab Start | stärkere Monster, mehr XP und Gold |
| 3 | Albtraum | nach der Kampagne und einem „Capstone“-Dungeon | Monster deutlich stärker, neue Gegenstandsqualität („Sacred“), Albtraum-Dungeons |
| 4 | Qual | nach dem nächsten Capstone-Dungeon | Monster am stärksten, beste Qualität („Ancestral“) |

- Die Stufe ist eine **Eigenschaft der Welt**, nicht des Helden. Der Spieler wählt sie selbst, Monster-Level und Belohnungen richten sich danach.
- **Seit „Vessel of Hatred“ (2024)** sind die Weltstufen durch Schwierigkeitsgrade ersetzt: Normal, Schwer, Experte, Büßer und danach Qual 1–4.
  - Die Qual-Stufen schaltet man über einen Endspiel-Dungeon frei („The Pit“).
  - Jede Qual-Stufe senkt per „Fluch“ die eigene Rüstung und die Widerstände.
  - Dafür werden die besten Gegenstände häufiger.
- Ähnlich bei Genshin Impact: Die „Weltstufe“ steigt mit dem Abenteuerrang und hebt die Gegnerlevel und die Belohnungen. Man kann sie um eine Stufe zurücksetzen.

**Prinzip:** Statt den Helden immer stärker zu machen, wird **die Welt eine Stufe härter, und dafür gibt es Besseres**. Innerhalb einer Stufe bleibt die Skala gleich. Neue Inhalte kommen als neue Stufe, nicht als höheres Max-Level.

**Übertragung auf Absorb & Evolve (Vorschlag Claude zur Diskussion):**
- Die Etappen vom Wald zur Stadt (GDD-07) sind schon eine Art Weltstufe im Raum.
- Eine echte Weltstufe könnte nach einem Meilenstein (z. B. dem Stadttor) **alle** Gebiete eine Stufe anheben: Wesen stärker, seltenere Skills und Materialien.
- Das wäre auch eine Antwort auf „was tun, wenn der Blob stärker ist als alles in der Welt“ (16.2 b).
- Die Kapazität (Abschnitt 18) passt dazu: Höhere Stufen brauchen andere Skill-Kombinationen, man lernt und verlernt gezielt.

> Begründung offen — Weltstufen ja/nein, und woran gekoppelt?

# Teil 6 — Erfahrung statt Level (Umsetzung)

> **Status: Implementiert (Oktober 2026), Zahlen VORLÄUFIG.** Die Regeln mit Herkunft der Entscheidungen stehen in [GDD-02 Abschnitt 8](GDD-02-Skillsystem.md#8-erfahrung-statt-level). Im Code stehen sie in [`progression.ts`](../src/data/progression.ts) und [`ProgressionSystem.ts`](../src/systems/ProgressionSystem.ts). Hier steht nur die Mathematik dazu.

## 21. Was aus den offenen Fragen geworden ist

| Frage | Entscheidung |
|---|---|
| Level ja/nein (17.4) | **Vorgabe (Entwickler):** keine Level, nur Erfahrung. Ränge nur als Beschriftung. Kommt V3 aus Abschnitt 17.4 nahe |
| Unendliches Leveln, lineare Skala, %-Anzeige (16) | Erfahrung ist unbegrenzt, die Wirkung wächst konkav. Den Deckel liefert die Kapazität statt einer Asymptote |
| Charakter-Level (9) | **Vorgabe (Entwickler):** keins. Stattdessen Kapazität |
| Kapazität (18.2) | Summe der Skill-XP. Verlernt wird das am längsten nicht Geübte (**Vorgabe Entwickler**). Kern-Fähigkeiten sind ausgenommen (Vorschlag Claude, offen) |
| Real- oder Spielzeit (18.3) | Überdehnung: nur Spielzeit (**Vorschlag Claude, übernommen**). Übertraining: Echtzeit inkl. offline (**Vorgabe Entwickler**) |
| Gleiche Formeln für Gegner | **Vorgabe (Entwickler):** gleiche Erfahrung, gleiche Wirkung (GDD-02 8.6) |

## 22. Kurve Erfahrung → Übungsgrad

`u = 1 + √(xp / (0,5·A))` mit A = Lernaufwand. Das ist das Zwei-Exponenten-Modell aus Abschnitt 8 mit p = 1 und q = 0. Die Kosten je Einheit u steigen linear (`Δxp ≈ A·(u−1)`), die kumulierten quadratisch.

- **Früh** fast wie bisher: Biss erreicht u = 3 nach 24 XP (alt: Lv3 nach 30 XP).
- **Spät** viel milder als ×1,5 je Level. Biss u = 10 kostet 486 XP; alt kostete Lv10 rund 880 XP, Lv20 rund 79.000.
- **Zahlenbereich:** Integer-Grenzen (Abschnitt 6) spielen keine Rolle mehr. Selbst 10⁹ XP ergäben u ≈ 12.900, und die Kapazität verhindert solche Summen ohnehin.

**Breite statt Tiefe**, gerechnet mit 600 XP Kapazität und A = 12:

| Verteilung | Wirkungszuwachs (Summe von u − 1) |
|---|---:|
| 1 Skill × 600 XP | 10,0 |
| 3 Skills × 200 XP | 17,3 |
| 6 Skills × 100 XP | 24,5 |

Mehr Skills bringen in Summe mehr. Spezialisierung lohnt sich trotzdem, weil Effekte unterschiedlich viel wert sind und Schwellen existieren (Flat-Block, Abschnitt 13.4).

## 23. Kapazität und Verlernen

```
belegt  B = Σ xp (alle entdeckten Skills, ohne Analyze/Absorb)
Kapazität K = 200 + 150 · log2(1 + Lebenserfahrung / 200)     (Platzhalter)
harte Grenze = 1,2 · K
```

- **Über der harten Grenze:** Jede neue Erfahrung wird sofort beim am längsten nicht geübten Skill abgezogen, danach beim nächsten.
- **Zwischen K und 1,2·K:** Der Überhang schmilzt in Spielzeit mit `Ü(t) = Ü₀ · 0,5^(t / 2 h)`.
- **Wiedererlernen:** Unter dem Höchststand zählt jede XP doppelt. Nach dem Verlernen braucht der Weg zurück also die halbe Zeit, wie von Jörn vorgegeben.

Ein Nebeneffekt des Platzhalters: Die Kapazität wächst mit dem Training selbst. Wer viel trainiert, erhöht die Lebenserfahrung und damit K. Jede Verdopplung der Lebenserfahrung bringt +150 XP Kapazität. Das ist gewollt mild (logarithmisch), muss aber zur endgültigen Wachstumsregel passen.

## 24. Übertraining

Sofortanteil `s(F) = min(1, T / F)` mit Ermüdung F und Schwelle T = 30·A. Ohne Erholung während einer Sitzung gilt nach R Roh-XP am Stück (R > T):

```
sofort  = T · (1 + ln(R / T))
später  = R − sofort
```

| Training am Stück | sofort | in Ruhe nachgeliefert |
|---|---:|---:|
| R = T | 100 % | 0 % |
| R = 2T | 85 % | 15 % |
| R = 3T | 70 % | 30 % |
| R = 10T | 33 % | 67 % |

Die Ruhe halbiert Ermüdung und ausstehende Erfahrung alle 3 h Echtzeit:
- nach 3 h sind 50 % nachgeliefert
- nach 8 h (eine Nacht) 84 %
- nach 24 h 99,6 %

Sie beginnt erst 2 Minuten nach der letzten Übung des Skills.

**Je Skill statt gesamt** (Vorschlag Claude, offen): Wer mehrere Skills abwechselnd trainiert, ermüdet langsamer. Das belohnt Abwechslung und Breite, passend zu Abschnitt 22. Eine zusätzliche Gesamt-Ermüdung würde das „zu viel Spielen“ direkter bremsen, wäre aber stärker spürbar.

> Begründung offen — Höhe der Schwelle und Halbwertszeit. Die Werte sind so gewählt, dass etwa 50 Treffer am Stück noch voll zählen und eine Nachtpause den Skill fast vollständig erholt.

---

## Quellen

- Kurvenformen allgemein: [davideaversa.it — Gamedesign Math: RPG Level-based Progression](https://davideaversa.it/blog/gamedesign-math-rpg-level-based-progression/), [Unity-Forum: Linear curve for RPG leveling](https://discussions.unity.com/t/linear-curve-for-rpg-leveing/699748), [Unity-Forum: Graphing and Game Design](https://discussions.unity.com/t/graphing-and-game-design/602886), [west-games.com — Exponential XP Curve Calculator](https://west-games.com/exponential-xp-curve-calculator/)
- RuneScape: [OSRS Wiki — Experience](https://oldschool.runescape.wiki/w/Experience_table), [RuneScape Wiki — Experience points](https://runescape.wiki/w/Experience_points)
- Pokémon: [Bulbapedia — Experience](https://bulbapedia.bulbagarden.net/wiki/Experience), [Serebii — Experience](https://www.serebii.net/games/exp.shtml)
- Skyrim: [UESP — Skyrim:Leveling](https://pt.uesp.net/wiki/Skyrim:Leveling), [UESP — Skyrim:Adept](https://content2.uesp.net/wiki/Skyrim:Adept)
- World of Warcraft: [Warcraft Wiki — Mob experience](https://warcraft.wiki.gg/wiki/Mob_experience), [AzerothCore XP-Namespace](https://azerothcore.org/doxygen/d8/d91/namespaceAcore_1_1XP.html)
- Path of Exile: [PoE Wiki — Experience](https://www.poewiki.net/wiki/Exp), [PoE-Forum: How does experience work with level gaps?](https://www.pathofexile.com/forum/view-thread/76122)
- Rüstungsformel `x/(x+K)` und effektive HP: [League of Legends Wiki — Armor](https://wiki.leagueoflegends.com/en-us/Armor), [loltheory.gg — Armor](https://blog.loltheory.gg/what-is-armor-league-of-legends/)
- Additive vs. multiplikative Modifikatoren: [Path of Exile Wiki — Modifiers](https://pathofexile.fandom.com/wiki/Modifiers?oldid=4899), [PoE-Forum: Additive and Multiplicative modifiers](https://www.pathofexile.com/forum/view-thread/892570)
- Pseudo-Zufall: [Liquipedia — Random Distribution](https://liquipedia.net/dota2/Random_Distribution), [Dota 2 Wiki — Pseudo-random distribution](https://dota2.fandom.com/wiki/Pseudo-random_distribution)
- Max-Level und Stauchen: [Warcraft Wiki — Level squish](https://warcraft.wiki.gg/wiki/Level_squish), [Warcraft Wiki — Stat squish](https://warcraft.wiki.gg/wiki/Stat_squish), [PC Gamer — WoW level cap reduced to 60](https://www.pcgamer.com/uk/world-of-warcrafts-level-cap-is-being-reduced-to-60/)
- Fester Deckel, horizontaler Fortschritt: [mein-mmo — Guild Wars 2: Forever 80](https://mein-mmo.de/en/guild-wars-2-niemals-neue-level-gear-stufen-080,28879), [Guild Wars 2 Wiki — Mastery](https://wiki.guildwars2.com/wiki/Mastery)
- Level-Skalierung der Welt: [mein-mmo — ESO One Tamriel](https://mein-mmo.de/en/the-elder-scrolls-online-one-tamriel,86731), [PushSquare — ESO One Tamriel](https://www.pushsquare.com/news/2016/06/e3_2016_one_huge_change_is_coming_to_the_elder_scrolls_online_this_year)
- Bounded Accuracy: [D&D Lore Wiki — Bounded accuracy](https://dungeonsdragons.fandom.com/wiki/Bounded_accuracy)
- Skill-Budget: [Giant Bomb — Ultima Online](https://www.giantbomb.com/games/3030-5767/), [uo.com — Scrolls of Power](https://uo.com/?p=4706)
- Schleimpilz-Gedächtnis: [Boisseau, Vogel & Dussutour 2016 — Habituation in Physarum (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC4855389/), [CNRS — Slime mould absorbs substances to memorise them](https://www.cnrs.fr/en/slime-mould-absorbs-substances-memorise-them), [Live Science — Brainless slime mold learns and teaches](https://livescience.com/57360-brainless-slime-mold-learns-and-teaches.html)
- Wiedererlernen: [Wikipedia — Forgetting curve](https://en.wikipedia.org/wiki/Forgetting_curve), [Murre & Dros 2015 — Replication of Ebbinghaus' forgetting curve](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4492928/)
- Diablo-4-Weltstufen und Schwierigkeitsgrade: [PC Gamer — World Tiers explained](https://pcgamer.com/diablo-4-world-tiers-explained/), [GamesRadar — World Tiers](https://www.gamesradar.com/diablo-4-world-tiers), [GGRecon — Standard & Torment difficulties](https://ggrecon.com/guides/diablo-4-difficulties-standard-torment)
- Zahlenwerte in den Abschnitten 2, 4, 6, 8, 11–13, 17, 19 und 22–24 wurden von Claude nachgerechnet (Node.js, Formeln wie im Text bzw. wie im Code). Die Gift-Takt-Werte in 12.3 stammen aus einer Simulation über 20.000 s.

---

*Letzte Aktualisierung: v0.4 — Teil 6 ergänzt (Erfahrung statt Level umgesetzt: Kurve, Kapazität, Übertraining; Status-Hinweis oben aktualisiert, 30. Oktober 2026); davor Teil 5 ergänzt (Skill-Kapazität und Verlernen nach Überlegung des Entwicklers, Gruppen schwacher Gegner, Weltstufen); davor Teil 4 ergänzt (Überlegung Entwickler: nur Verhältnisse zählen; feste Level-Grenze vs. Max-Level-Erhöhung; Level abschaffen; Synthese unbegrenzte Übung / begrenzte Stärke); davor Teil 3 ergänzt (Vorschlag Entwickler: unendliches Leveln, lineare Skala, Anzeige in %); davor Teil 2 ergänzt (Wirkungskurven, Trefferstufen, Gift-Chance und Gift-Takt-Fehler, Skill-Fund-Wahrscheinlichkeiten, Geschick, Stapelregeln, Schwellen); davor: Datei neu angelegt: Analyse der Leveling-Modelle (proportionale Erfahrung, Level-Differenz-Multiplikator, Kurvenfamilien, Integer-Grenzen, Vergleich mit anderen Spielen), Vorschlag Zwei-Exponenten-Modell (Oktober 2026)*
