# ABSORB & EVOLVE — Game Design Document
## Datei 03: Kampfsystem

---

> **Status**: Konzept-Phase. Das Kampfsystem ist in Prototype v0.1 noch nicht implementiert.
> Diese Datei beschreibt die geplante Zielversion.

---

## 1. Kampf-Philosophie

Kämpfe sollen sich nicht wie klassische RPG-Schlachten anfühlen. Der Slime ist kein klassischer Krieger. Kämpfe sind:

- **Kurz und dynamisch** — kein stundenlanges Grinden.
- **Optional wann immer möglich** — Analysieren ist oft sinnvoller als Kämpfen.
- **Skill-getrieben** — Wer viele Skills hat, hat viele Optionen. Wer wenige hat, muss clever sein.
- **Konsequent** — Sterben bedeutet Ressourcen-Verlust (noch zu definieren: permadeath, soft-death, oder Checkpoint-System).

---

## 2. Kampf-Ablauf (Echtzeit, Top-Down)

Der Kampf läuft in Echtzeit. Es gibt keine Runden. Der Slime bewegt sich frei und nutzt Skills über Tastenbelegung.

```
Entity wird aggressiv (Aggro-Radius)
    ↓
Gegner greift an (Angriffsmuster je nach Typ)
    ↓
Spieler weicht aus / blockt / kontert mit Skill
    ↓
Treffer verursacht Schaden / Status-Effekte
    ↓
Entity stirbt → Absorb/Analyze automatisch möglich
         ODER
Entity flieht → Möglichkeit zum verfolgen
```

---

## 3. Spieler-Kampfwerte

| Attribut | Startwert | Wächst durch |
|----------|-----------|-------------|
| HP (Lebenspunkte) | 80 | Level-Up (+10 pro Level) |
| MP (Magiepunkte) | 40 | Level-Up (+5 pro Level) |
| Geschwindigkeit | 2.5 | Bestimmte Skills (Wind, Shadow) |
| Verteidigung | 0 | Earth-Skills, Stone Skin |
| Resistenz | 0 | Elementar-spezifische Skills |

---

## 4. Gegner-Typen & Verhalten

### Verhaltensmuster

| Typ | Verhalten | Beispiel-Entity |
|-----|-----------|-----------------|
| Passiv | Greift nie an, flieht bei Nähe | Vine Plant, Pilz |
| Defensiv | Greift nur an wenn angegriffen | Blue Slime |
| Aggressiv | Greift bei Sichtkontakt an | Goblin, Forest Wolf |
| Territorial | Greift in eigenem Radius an | Stone Golem |
| Selten/Flüchtig | Taucht kurz auf, flieht sofort | Light Fairy, Dark Wisp |

### Gegner-Beispiele mit Kampfwerten (geplant)

| Entity | HP | Schaden | Skill-Drops | Besonderheit |
|--------|----|---------|------------|-------------|
| Goblin | 30 | 8 | fire | Wirft manchmal Steine |
| Red Slime | 20 | 5 | fire, slime | Teilt sich bei Schaden (geplant) |
| Blue Slime | 20 | 5 | water, slime | Verlangsamt den Slime |
| Forest Wolf | 50 | 15 | wind | Schnell, schwer zu treffen |
| Stone Golem | 120 | 25 | earth | Langsam, sehr viel HP |
| Dark Wisp | 15 | 20 | dark | Selten, hoher Schaden |
| Light Fairy | 10 | 0 | light | Kämpft nie, extrem flüchtig |

---

## 5. Skill-Einsatz im Kampf

### Ressourcenkosten
- Jeder Skill verbraucht MP.
- Kein MP = Skill nicht nutzbar.
- MP regeneriert sich langsam über Zeit (1 MP/Sekunde, geplant).

### Cooldowns
- Jeder Skill hat einen individuellen Cooldown.
- Höheres Skill-Level = kürzerer Cooldown.

### Schaden-Formel (Entwurf)
```
Schaden = Basis-Schaden * (1 + 0.1 * Skill-Level) * Element-Multiplikator
```

### Element-Interaktionen (geplant)
| Angreifer | Verteidiger | Effekt |
|-----------|------------|--------|
| fire | earth | +50% Schaden |
| water | fire | +50% Schaden, löscht Feuer-Effekte |
| wind | water | +25% Schaden |
| poison | — | DoT (Schaden über Zeit) |
| dark | light | Gegenseitige Schwächung |

---

## 6. Status-Effekte

| Effekt | Auslöser | Dauer | Wirkung |
|--------|---------|-------|---------|
| Brennend | fire-Skill | 3 Sek | 5 Schaden/Sek |
| Vergiftet | poison-Skill | 5 Sek | 3 Schaden/Sek |
| Verlangsamt | water/earth-Skill | 2 Sek | -50% Bewegung |
| Betäubt | earth-Skill (Lv5+) | 1 Sek | Keine Aktion |
| Unsichtbar | dark-Skill | 3 Sek | Gegner verliert Aggro |

---

## 7. Tod & Konsequenzen (noch zu entscheiden)

**Option A – Soft Death (aktuell favorisiert)**
- Spieler verliert einen Teil der zuletzt gewonnenen EXP.
- Kein Skill-Verlust.
- Respawn am letzten sicheren Punkt.

**Option B – Checkpoint-System**
- Feste Speicherpunkte in der Welt.
- Tod = zurück zum letzten Checkpoint.
- Keine EXP-Strafe.

**Option C – Rogue-like (riskant, aber interessant)**
- Tod = alle Skills verloren, zurück auf Level 1.
- Welt bleibt teilweise erhalten (Metaprogression).
- Nur für einen separaten Spielmodus geeignet.

---

## 8. Bosskämpfe (geplant, v0.3+)

- Jede Region hat einen optionalen Boss.
- Bosse haben einzigartige, nicht anderweitig erhältliche Skills.
- Bosse können analysiert (sehr schwer) oder absorbiert (nach dem Besiegen) werden.
- Boss-Skills sind die mächtigsten im Spiel.

---

*Letzte Aktualisierung: Konzept-Phase, pre-v0.2*
