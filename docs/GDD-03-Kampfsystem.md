# ABSORB & EVOLVE — Game Design Document
## Datei 03: Kampfsystem

---

> **Status v0.3**: Grundkampfsystem implementiert.
> Echtzeit-Aggro, Nahkampfangriffe, Status-Effekte (DoT/HoT/Auren),
> Checkpoint-Tod, SkillBar + SkillMenu vollständig spielbar.
> Entity-Leveling-System implementiert (Kreaturen kämpfen untereinander).

---

## 1. Kampf-Philosophie

Kämpfe sollen sich nicht wie klassische RPG-Schlachten anfühlen. Der Blob ist kein klassischer Krieger. Kämpfe sind:

- **Kurz und dynamisch** — kein stundenlanges Grinden.
- **Optional wann immer möglich** — Analysieren ist oft sinnvoller als Kämpfen.
- **Skill-getrieben** — Wer viele Skills hat, hat viele Optionen. Wer wenige hat, muss clever sein.
- **Konsequent** — Sterben bedeutet Checkpoint (HP/MP zurück auf Max, kein dauerhafter Verlust).

---

## 2. Kampf-Ablauf (Echtzeit, Top-Down)

Der Kampf läuft in Echtzeit. Es gibt keine Runden. Der Blob bewegt sich frei und nutzt Skills über die SkillBar.

```
Entity betritt Aggro-Radius (isAggro = true, roter Tint)
    ↓
AiSystem berechnet Bewegungsvektor (Chase + Attack-Throttle)
    ↓
Entity bewegt sich zum Spieler, greift bei attackRangePx an
    ↓
Treffer verursacht Schaden + optionaler Status-Effekt
    ↓
Spieler wehrt sich per SkillBar-Tap → CombatSystem.playerAttack()
    ↓
Entity HP ≤ 0 → isAlive = false (respawnt später via EntitySystem)
         ODER
Spieler HP ≤ 0 → Checkpoint (HP/MP voll, Spawn-Position, kein Verlust)
```

---

## 3. Spieler-Kampfwerte (implementiert)

| Attribut | Startwert | Wächst durch |
|----------|-----------|-------------|
| HP (Lebenspunkte) | 80 | Level-Up: ~~+10 pro Level~~ [VERWORFEN] → **+15 pro Level** |
| MP (Magiepunkte) | 40 | Level-Up: ~~+5 pro Level~~ [VERWORFEN] → **+8 pro Level** |
| Geschwindigkeit | 180 px/s | geplant: Wind-Skills |
| Schaden-Multiplikator | 1.0 | ~~Superstrength +0.3/Level~~ [VERWORFEN] → Superstrength ×1,30 + 0,05/Level ([GDD-05](GDD-05-Kampfmathematik.md)) |
| Schadensreduktion | 0 % | ~~Chitin 10 %+5 %/Level, max 85 %~~ [VERWORFEN] → Chitin wirkt je Schadenstyp ([GDD-05 Abschnitt 4.2](GDD-05-Kampfmathematik.md)) |
| MP-Regeneration | 1 MP/s | konstant, passiv |

Alle Werte intern in Milli-Einheiten ([GDD-05 Abschnitt 3.4](GDD-05-Kampfmathematik.md)).
> Begründung offen — Startwerte (80 HP / 40 MP), Zuwachs pro Level (+15 / +8) und MP-Regeneration 1 MP/s.

**Basis-Nahkampfschaden:**
```
baseDmg = 3 + absorb.level × 1.5              (HP, Schadenstyp Wucht)
effDmg  = baseDmg × calcDamageMult(player.statusEffects)   [VERWORFEN — jetzt Schadenspipeline mit Treffer-Stufe, GDD-05]
```
**Begründung Schadenstyp Wucht (rekonstruiert, bitte bestätigen):** Der unbewaffnete Blob schlägt mit seiner Körpermasse zu.
> Begründung offen — Skalierung mit dem Absorb-Level (3 + 1,5 × Level).

---

## 4. Entity-Kampfwerte (implementiert)

### Aktuelle Entities mit Kampfwerten — [VERWORFEN] (Werte veraltet)

Aktuelle Werte aller Einheiten: im Spiel unter 📋 → INDEX (live aus [entities.ts](../src/data/entities.ts) berechnet).
**Begründung (Vorschlag Claude):** Eine von Hand gepflegte Tabelle veraltet bei jedem Balancing — der Index ist die einzige, immer aktuelle Quelle.

| Entity | HP | Schaden | Aggro-Radius | Angriffs-Reichweite | Cooldown |
|--------|-----|---------|-------------|---------------------|----------|
| Ameise (ant) | 12 | 3 | 140 px | 40 px | 1800 ms |
| Marienkäfer (ladybug) | 8 | 2 | 120 px | 38 px | 2000 ms |
| Springspinne (jumping_spider) | 18 | 5 | 160 px | 55 px | 1200 ms |
| Giftspinne (poison_spider) | 22 | 4+Gift | 150 px | 50 px | 1600 ms |
| Gras (grass) | — | — | — | — | passiv |

### Gegner-Verhalten (AiSystem)
- **Aggro**: Spieler betritt `aggroRadius` → Entity wird aggressiv (roter Tint)
- **Chase**: Entity bewegt sich mit `speed` px/s auf Spieler zu; stoppt bei ≤ 20 px
- **Aggro-Verlust**: Spieler > `aggroRadius × 2.5` entfernt
- **Angriff**: Nur wenn `attackCooldownRemaining = 0` und Spieler in `attackRangePx`
- **Performance**: AI wird alle 100 ms berechnet; Entities > 500 px werden übersprungen

**Begründungen:**
- Aggro-Verlust erst bei 2,5 × Aggro-Radius — **Begründung (rekonstruiert, bitte bestätigen):** Abstand zwischen „wird aggro" und „verliert Aggro" verhindert, dass ein Gegner am Rand des Radius ständig hin- und herschaltet; man muss sich wirklich absetzen.
- 100 ms Takt, 500 px Grenze — **Begründung (rekonstruiert, bitte bestätigen):** Performance auf Mobilgeräten bei großer Welt mit vielen Einheiten.

---

## 5. Status-Effekte (StatusEffectSystem — implementiert)

Alle Effekte sind einheitlich als `StatusEffect`-Objekte modelliert.
Passive Skills werden als permanente Effekte (`durationMs: -1`) geführt.

| Effekt-Typ | Wirkung | Beispiel |
|-----------|---------|---------|
| `dot` (Damage over Time) | `damagePerTick` / `tickIntervalMs` | Venom-Skill |
| `hot` (Heal over Time) | `healPerTick` / `tickIntervalMs` | Photosynthesis |
| `stat_mod` | `speedMultiplier`, `damageBonus`, `damageMult`, `damageReduction` | Chitin Armor, Superstrength |
| `aura` | `reflectDamage` bei jedem Treffer | Hemolymph |

### Passive Skills → permanente Effekte — [VERWORFEN] für Chitin Armor, Superstrength, Hemolymph

Seit v0.4 wirken diese drei deklarativ über `effects[]` und die Schadenspipeline ([GDD-05](GDD-05-Kampfmathematik.md)); nur Photosynthesis ist noch ein permanenter HoT-Effekt.
**Begründung (Designziele in GDD-05):** Skills sollen ohne Code-Änderung konfigurierbar sein; Abwehr hängt vom Schadenstyp ab.

| Skill | Effekt-ID | Was passiert |
|-------|----------|-------------|
| Chitin Armor | `chitin_armor` | stat_mod: `damageReduction = 0.10 + 0.05×(level-1)` |
| Superstrength | `superstrength` | stat_mod: `damageMult = 1.0 + 0.3×effectiveness` |
| Hemolymph | `hemolymph` | aura: `reflectDamage = 2×level` pro Treffer |
| Photosynthesis | `photosynthesis` | hot: `healPerTick = 0.5×level` alle 1 s |

### Venom (Giftspinne → Spieler, oder Venom-Skill → Entity)
```
Schaden/Tick = 2 + 0.5 × (level - 1)
Dauer        = 4 Sekunden
Tick-Intervall = 1 Sekunde
Chance (poison_spider) = 40 %                          [VERWORFEN — Gegner nutzen dieselbe Formel wie der Spieler]
Chance (Venom-Skill)   = 30 % + 5 % × level           [VERWORFEN — überschritt ab Lv15 100 %]
Chance (Venom-Skill)   = min(100 %, 30 % + 10 % × √(level − 1))
                         Lv1 30 % · Lv5 50 % · Lv10 60 % · Lv20 74 % · ab Lv50 100 %
```
**Vorgabe (Entwickler):** Die Chance soll nicht über 100 % steigen — die alte lineare Formel überschritt sie ab Level 15 (von Claude im Index entdeckt).
**Begründung √-Kurve (Vorschlag Claude):** Skills haben kein Level-Limit, jede steigende Kurve erreicht irgendwann 100 % — daher zusätzlich `max: 1.0`. Die √-Kurve lässt Level 1–5 nahezu unverändert (Lv5 weiterhin 50 %) und flacht danach ab, statt abrupt an den Deckel zu stoßen.
Schaden/Tick 2 + 0,5/Level und Dauer 4 s:
> Begründung offen

### Schadensreduktion (Stacking) — [VERWORFEN], ersetzt durch Schadenspipeline ([GDD-05 Abschnitt 3](GDD-05-Kampfmathematik.md))
```
reduction = min(0.85, sum aller damageReduction-Effekte)
finalDmg  = baseDmg × (1 - reduction)
```

**Max-Effekte pro Entity:** 8 (ältester Effekt wird verdrängt)
**Begründung (rekonstruiert, bitte bestätigen):** Performance-Grenze; zeitlich begrenzte Effekte werden zuerst verdrängt, damit passive Dauer-Effekte nie verloren gehen.

---

## 6. Skill-Einsatz im Kampf (implementiert)

### SkillBar (Touch-Schnellzugriff)
- 4 konfigurierbare Slots, jeder zeigt Icon + Cooldown-Countdown
- **Tap** → Skill aktivieren (Angriff oder Dash)
- **Long-Press (600 ms)** → SkillMenu öffnen
- Leerer Slot-Tap → SkillMenu öffnen

### SkillMenu (Vollbild-Overlay)
- Öffnen pausiert das Spiel
- Alle entdeckten Skills werden angezeigt (Passive klar markiert)
- **Slot-Buttons (S1–S4)**: Skill einem Slot zuweisen (erneuter Tap = entfernen)
- **Einsetzen-Button**: Menü schließt, Skill wird direkt aktiviert

### Ressourcenkosten
- Jeder aktive Skill verbraucht MP (`mpCost` aus SkillDefinition)
- Kein MP = Skill nicht nutzbar (`canActivateSkill` gibt Fehlermeldung)
- MP regeneriert sich passiv (1 MP/Sekunde via `regenMp`)

### Cooldowns
- Pro Skill in `player.skillCooldowns: Map<skillId, expiresAt>`
- SkillBar zeigt verbleibende Sekunden als Overlay

### Angriffs-Skill (Nahkampf)
```
Ziel = lastNearbyId (Entity in ≤ 100 px)
baseDmg = 3 + absorb.level × 1.5
effDmg  = baseDmg × damageMult
Venom-Chance: 30 % + 5 % × venom.level   [VERWORFEN — neue Formel siehe Abschnitt 5, Venom]
```

### Dash-Skill (Jump)
```
Distanz = 160 + 20 × (jump.level - 1) px
Richtung = Joystick-Vektor (falls inaktiv: kein Bewegungseffekt)
```
Passiv gibt Jump außerdem **Geschick**: 1 + √(Level − 1) Punkte.

### Treffer-Stufen (implementiert)

Jeder Angriff — Spieler und Gegner, Nah- und Fernkampf — würfelt eine von fünf Stufen ([src/systems/HitSystem.ts](../src/systems/HitSystem.ts)):

| Stufe | Schaden | Sonst |
|-------|---------|-------|
| Verfehlt | ×0 | kein Gift, kein Rückschlag, keine XP; das Ziel wird trotzdem aggressiv |
| Leichter Treffer | ×0,6 | |
| Treffer | ×1 | |
| Schwerer Treffer | ×1,3 | |
| Kritischer Treffer | ×2,5 | |

Der Multiplikator greift vor der Rüstung (Pipeline-Schritt 1b in [GDD-05](GDD-05-Kampfmathematik.md)): Kritische Treffer schlagen durch Flat-Block, leichte Treffer bleiben eher daran hängen.

**Grundverteilung pro Skill** (Lv1, Geschick 0) — `hitProfile` in [skills.ts](../src/data/skills.ts):

| Angriff | Verfehlt | Leicht | Normal | Schwer | Kritisch | Charakter |
|---------|---------|--------|--------|--------|----------|-----------|
| Unbewaffnet (Standard) | 4 % | 24 % | 50 % | 19 % | 3 % | Körperstoß |
| Biss | 3 % | 17 % | 52 % | 24 % | 4 % | präzise |
| Klauenhieb | 5 % | 15 % | 45 % | 32 % | 3 % | wuchtig, öfter daneben |
| Feueratem | 2 % | 25 % | 55 % | 16 % | 2 % | trifft fast immer, selten Schwachstelle |

**Skalierung mit Skill-Level und Geschick** ([balance.ts](../src/data/balance.ts)):
```
x     = 0,05 · (Skill-Level − 1) + 0,1 · (Geschick Angreifer − Geschick Verteidiger)
kipp  = 0,4 · tanh(x)
p_i  ∝ grund_i · e^(kipp · stufe_i)      stufe = −2 (verfehlt) … +2 (kritisch)
```
Die tanh-Begrenzung hält Ränder klein: kritisch höchstens ≈ 2,2× Grundwert, verfehlt mindestens ≈ 0,45× — in der Praxis Krit ≤ ~8 %, Verfehlen ≤ ~11 %.
Skill-Level: beim unbewaffneten Angriff zählt das Absorb-Level; bei Gegnern das Level ihres Angriffsskills (bite/claw/fire_breath), ohne Angriffsskill ihr Entity-Level.
Geschick kommt aus `dexterity`-Effekten aller bekannten Skills (derzeit Jump; Springspinne hat Jump Lv2).
**Eigener Beitrag zählt nicht:** Beim Angriff wird das Geschick ohne den Beitrag des eingesetzten Skills gerechnet — z.B. 10 Geschick gesamt, der Skill liefert davon 2 → für die Treffer-Stufen zählen 8. Der Verteidiger setzt keinen Skill ein und rechnet mit vollem Geschick.
**Vorgabe (Entwickler):** Das Geschick wird gegen den eigenen Beitrag des Skills gerechnet.
**Begründung (Entwickler):** Der Bonus aus dem Skill-Level ist im Skill selbst schon angelegt — sonst würde das Level doppelt zählen.

**Anzeige:** Schadenszahl nach Stufe — leicht klein, schwer mit „!", kritisch groß, golden mit „!!", verfehlt als graues „verfehlt". Der INDEX im Spielmenü zeigt die Verteilung pro Skill und Level sowie für jeden Gegner.

**Begründungen:**
- **Vorgabe (Entwickler):** Fünf Stufen (verfehlt, leicht, normal, schwer, kritisch); Wahrscheinlichkeiten skalieren mit Skill-Level und Geschick; jeder Skill hat eigene Wahrscheinlichkeiten; Krit und Verfehlen generell sehr selten.
  > Begründung offen — warum Treffer-Stufen eingeführt wurden.
- **Vorgabe (Entwickler, aus Varianten gewählt):** Multiplikatoren 0 / 0,6 / 1 / 1,3 / 2,5, für alle Skills gleich. Kennzeichen dieser Variante laut Vorschlag: flach in der Mitte, dafür sehr starke kritische Treffer.
  > Begründung offen — warum diese Variante.
- **Verteilung kippen statt Stufen einzeln erhöhen, mit tanh begrenzt — Begründung (Vorschlag Claude):** Eine einzige Kurve verschiebt alle Stufen gemeinsam; die Wahrscheinlichkeiten bleiben immer gültig (Summe 100 %, nie negativ), und die Begrenzung erfüllt die Vorgabe „Krit und Verfehlen sehr selten" auch bei sehr hohen Leveln.
- **Charakter der Skill-Verteilungen — Begründung (Vorschlag Claude):** Biss ist gezielt (mehr Krits), Klauenhieb holt weit aus (öfter schwer, öfter daneben), Feueratem ist ein Flammenstrom (trifft fast immer, selten eine Schwachstelle).
- **Gleiche Regeln für Gegner — Begründung (Vorschlag Claude, übernommen):** Spieler und Gegner nutzen dieselben Skills und Formeln (Grundprinzip aus [GDD-05](GDD-05-Kampfmathematik.md)).
- **Verfehlen: keine XP, kein Gift, kein Rückschlag; Ziel wird trotzdem aggressiv — Begründung (Vorschlag Claude):** Ohne Körperkontakt kann kein Gift übertragen und kein Hämolymph ausgelöst werden; XP richtet sich nach dem angerichteten Schaden (= 0). Das Ziel hat den Angriff aber bemerkt.
- **Konstanten 0,4 / 0,05 / 0,1 — Begründung (Vorschlag Claude):** so gewählt, dass Krit ≤ ~8 % und Verfehlen ≤ ~11 % bleiben und Skill-Level 20 bzw. 5 Geschick-Punkte Vorsprung spürbar, aber nicht dominant wirken.
  > Begründung offen — Werte sind noch nicht im Spiel abgestimmt.
- Kämpfe zwischen Gegnern (Entity-Leveling, Abschnitt 9) würfeln derzeit **keine** Treffer-Stufen. **Begründung (Vorschlag Claude):** Die Vorgabe bezog sich auf Angriffe zwischen Blob und Gegnern.
  > Begründung offen — Soll das Entity-Leveling ebenfalls Treffer-Stufen nutzen?

---

## 7. Tod & Checkpoint

### Aktuell implementiert (v0.3): Einfaches Checkpoint-System

Das aktuelle System ist ein Platzhalter bis das Blob-Teilungs-System (siehe unten) implementiert ist:

- HP ≤ 0 → `executeCheckpoint(player)`:
  - HP und MP werden auf Maximum gesetzt
  - Spieler-Position springt zu `player.spawnX / spawnY` (400/300)
  - Alle zeitlich begrenzten StatusEffekte werden entfernt (permanente bleiben)
  - Alle Entities verlieren ihren Aggro-Status (`resetAi`)
- Kein dauerhafter Verlust
- Visuelles Feedback: Kamera-Rot-Flash (400 ms)

---

### Geplant (Konzept): Blob-Teilungs-Respawn-System

> Status: Konzept — ersetzt das Checkpoint-System sobald implementiert

Das Respawn-System basiert auf der biologischen Teilungsfähigkeit von *Physarum polycephalum* und der Desiccations-Widerstandsfähigkeit des Blobs. Vollständige Beschreibung in [GDD-01, Abschnitt 10](GDD-01-Hauptbeschreibung.md#10-blob-teilung--respawn-system).

**Kurzfassung der neuen Mechanik:**

```
Reise-Blob HP ≤ 0
    ↓
Blob vertrocknet an Ort des Todes (bleibt als Weltobjekt)
    ↓
Bewusstsein → Hauptblob (Respawn-Anker, vom Spieler platziert)
    ↓
Neuer Reise-Blob wird abgespalten
    ↓
Spieler startet ohne Skills/XP des vertrockneten Blobs
```

**Wissen zurückgewinnen:**
- Spieler sucht Ort des Todes auf
- Wasser auf vertrockneten Blob → Blob erwacht
- Berührung → Verschmelzung → alle Skills/XP übertragen

**Unterschied zum alten Checkpoint-System:**
- Skills/XP **vorübergehend verlierbar** (nicht permanent)
- Todesort wird zu einem Spielziel (Wissen zurückholen)
- Mehrere Hauptblob-Positionen = strategische Respawn-Planung
- Kein permanenter Tod — der Blob kann immer zurückgebracht werden

---

## 8. Bosskämpfe (geplant, v0.3+)

> Status: Konzept

- Jede Region hat einen optionalen Boss.
- Bosse haben einzigartige, nicht anderweitig erhältliche Skills.
- Bosse können analysiert (sehr schwer) oder absorbiert (nach dem Besiegen) werden.
- Boss-Skills sind die mächtigsten im Spiel.

---

## 9. Entity-Leveling-System (implementiert)

Kreaturen kämpfen untereinander und werden dadurch stärker. Dies macht die Welt lebendiger und belohnt den Spieler für das Beobachten und Nutzen von Levelunterschieden.

### Mechanik

```
Kreatur sucht Beute im Radius 300 px
    ↓ Ziel muss 1–3 Level niedriger sein (effektives Level)
    ↓ Nur lebende Kreaturen mit Kampfwerten (damage definiert)
    ↓ Kreatur bewegt sich auf Beute zu
    ↓ Angriff wenn in attackRangePx
    ↓
Beute besiegt → skillWins++ (Skill wurde stärker)
    ↓
3 Siege → bonusLevel++ (max 3), HP voll geheilt, Log-Eintrag
```

### Bonus-Level

| bonusLevel | HP-Faktor | Schaden-Faktor | Speed-Faktor |
|-----------|-----------|----------------|--------------|
| +0        | 1.00×     | 1.00×          | 1.00×        |
| +1        | 1.25×     | 1.25×          | 1.25×        |
| +2        | 1.56×     | 1.56×          | 1.56×        |
| +3        | 1.95×     | 1.95×          | 1.95×        |

**Begründung des Systems (aus der bestehenden Einleitung, rekonstruiert, bitte bestätigen):** Die Welt soll lebendiger wirken, und der Spieler soll vom Beobachten und Ausnutzen von Levelunterschieden profitieren.
> Begründung offen — Parameter: Beute 1–3 Level schwächer, Suchradius 300 px, 3 Siege pro Bonus-Level, maximal +3, Faktor 1,25 pro Bonus-Level, Bonus geht beim Respawn verloren.

### Visueller Hinweis

- Gelevelete Entities (bonusLevel > 0): **goldener Tint** (0xffdd44)
- Aggro auf Spieler überschreibt immer: **roter Tint** (0xff4444)
- HP-Balken zeigt `currentHp / getScaledMaxHp` (skaliertes Maximum)

### Implementierung

```
src/systems/EntityLevelingSystem.ts  ← reine Logik (Phaser-frei)
  getEffectiveLevel()   — def.level + bonusLevel
  getScaledMaxHp()      — HP skaliert mit 1.25^bonusLevel
  getScaledDamage()     — Schaden skaliert
  getScaledSpeed()      — Speed skaliert
  findLevelingPrey()    — Beute-Suche (Level-Filter, Radius 300 px)
  processEntityVictory() — skillWins++, evtl. bonusLevel++

scenes/GameScene.ts
  processEntityLeveling(delta) — im Update-Loop nach processEntityAi()
```

### Einschränkungen

- Nur aktive Entities (ACTIVE_RADIUS um den Spieler) nehmen teil
- Entity muss category="creature" sein und kämpfen können (~~damage definiert~~ [VERWORFEN] → Angriffsskill bite/claw, Fernkampf oder Altfeld `damage`, siehe `canFight()`)
- behavior="passive" wird ausgeschlossen (Pflanzen, Mineralien)
- Während isAggro (Jagd auf Spieler): kein Leveling-Verhalten
- bonusLevel geht verloren beim Respawn (Entity startet neu)

---

## 10. Technische Architektur (implementiert)

```
types/Combat.ts                    ← AttackType, StatusEffect, AttackResult, AiFrame
systems/StatusEffectSystem.ts      ← alle Effekt-Logik, syncPassiveEffects
systems/CombatSystem.ts            ← Schaden, Skill-Dispatch, Checkpoint
systems/AiSystem.ts                ← Aggro, Chase, Attack-Trigger (Phaser-frei)
systems/EntityLevelingSystem.ts    ← Entity-vs-Entity-Kampf, Leveling-Logik
ui/SkillBar.ts                     ← DOM-Modul, Cooldown-Overlay, Long-Press
ui/SkillMenu.ts                    ← DOM-Overlay, Slot-Zuweisung, Skill-Aktivierung
scenes/GameScene.ts                ← verdrahtet alle Systeme, Phaser-Rendering
```

**Performance-Maßnahmen:**
- Squared-Distance-Checks im AI-Hot-Loop (kein `Math.hypot`)
- AI-Throttle: 100 ms Mindestabstand zwischen Neuberechnungen pro Entity
- Skip-Distance: Entities > 500 px vom Spieler werden übersprungen
- MAX_EFFECTS = 8 pro Entity (ältester Effekt wird verdrängt)

---

## Siehe auch

| Dokument | Relevanz |
|----------|----------|
| [GDD-01 Abschnitt 10](GDD-01-Hauptbeschreibung.md#10-blob-teilung--respawn-system) | Blob-Teilungs-Respawn — biologische Grundlage und Spielmechanik |
| [GDD-02](GDD-02-Skillsystem.md) | Skill-Definitionen und Entdeckungsmechaniken |
| [GDD-05](GDD-05-Kampfmathematik.md) | Mathematisches Modell für Schadensberechnung und Skill-Effekte (v0.4) |
| ~~GDD-06~~ [VERWORFEN] | Aktuelle Kampfwerte aller Skills und Einheiten stehen jetzt im Spiel unter 📋 → INDEX ([GDD-04](GDD-04-LookAndFeel.md)) |
| [src/systems/CombatSystem.ts](../src/systems/CombatSystem.ts) | Aktuelle Kampfimplementierung |
| [src/systems/AiSystem.ts](../src/systems/AiSystem.ts) | KI-Logik: Aggro, Verfolgung, Angriffe |
| [src/systems/StatusEffectSystem.ts](../src/systems/StatusEffectSystem.ts) | DoT/HoT/Aura-Verarbeitung |
| [src/data/entities.ts](../src/data/entities.ts) | Alle Entity-Definitionen mit Kampfwerten |

---

*Letzte Aktualisierung: 2026-10-24 — Geschick ohne Beitrag des eingesetzten Skills; Begründungen ergänzt bzw. als offen markiert, veraltete Werte (Spieler-Wachstum, Entity-Tabelle, Passiv-Effekte) als VERWORFEN gekennzeichnet; Treffer-Stufen und Geschick; Venom-Chance mit 100-%-Deckel*
