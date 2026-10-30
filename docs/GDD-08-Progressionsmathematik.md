# ABSORB & EVOLVE — Game Design Document
## Datei 08: Progressionsmathematik (Skill- und Charakter-Leveling)

> **Status: Diskussion** — Analyse der Ansätze und Vorschlag. Im Spiel gilt weiterhin der Stand aus [GDD-02 Abschnitt 4](GDD-02-Skillsystem.md#4-skill-leveling) und [balance.ts](../src/data/balance.ts). Nichts davon ist entschieden.

Diese Datei beschreibt mathematisch, wie Erfahrung (XP) und Level zusammenhängen. Sie vergleicht die Vorschläge des Entwicklers mit gängigen Modellen aus anderen Spielen und nennt Vor- und Nachteile.

**Vorgabe (Entwickler):** Das Modell soll einfach zu verstehen sein und zu einer angenehmen, spannenden Spielerfahrung führen: Es soll schwerer werden, weiterzukommen, aber man soll weiterhin Erfolge haben.

---

## 0. Kurzfassung

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

## Quellen

- Kurvenformen allgemein: [davideaversa.it — Gamedesign Math: RPG Level-based Progression](https://davideaversa.it/blog/gamedesign-math-rpg-level-based-progression/), [Unity-Forum: Linear curve for RPG leveling](https://discussions.unity.com/t/linear-curve-for-rpg-leveing/699748), [Unity-Forum: Graphing and Game Design](https://discussions.unity.com/t/graphing-and-game-design/602886), [west-games.com — Exponential XP Curve Calculator](https://west-games.com/exponential-xp-curve-calculator/)
- RuneScape: [OSRS Wiki — Experience](https://oldschool.runescape.wiki/w/Experience_table), [RuneScape Wiki — Experience points](https://runescape.wiki/w/Experience_points)
- Pokémon: [Bulbapedia — Experience](https://bulbapedia.bulbagarden.net/wiki/Experience), [Serebii — Experience](https://www.serebii.net/games/exp.shtml)
- Skyrim: [UESP — Skyrim:Leveling](https://pt.uesp.net/wiki/Skyrim:Leveling), [UESP — Skyrim:Adept](https://content2.uesp.net/wiki/Skyrim:Adept)
- World of Warcraft: [Warcraft Wiki — Mob experience](https://warcraft.wiki.gg/wiki/Mob_experience), [AzerothCore XP-Namespace](https://azerothcore.org/doxygen/d8/d91/namespaceAcore_1_1XP.html)
- Path of Exile: [PoE Wiki — Experience](https://www.poewiki.net/wiki/Exp), [PoE-Forum: How does experience work with level gaps?](https://www.pathofexile.com/forum/view-thread/76122)
- Zahlenwerte in den Abschnitten 2, 4, 6 und 8 wurden von Claude nachgerechnet (Node.js, Formeln wie im Text).

---

*Letzte Aktualisierung: v0.4 — Datei neu angelegt: Analyse der Leveling-Modelle (proportionale Erfahrung, Level-Differenz-Multiplikator, Kurvenfamilien, Integer-Grenzen, Vergleich mit anderen Spielen), Vorschlag Zwei-Exponenten-Modell (Oktober 2026)*
