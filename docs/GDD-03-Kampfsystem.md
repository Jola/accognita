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
| HP (Lebenspunkte) | 80 | Level-Up (+10 pro Level) |
| MP (Magiepunkte) | 40 | Level-Up (+5 pro Level) |
| Geschwindigkeit | 180 px/s | geplant: Wind-Skills |
| Schaden-Multiplikator | 1.0 | Superstrength-Skill (+0.3/Level) |
| Schadensreduktion | 0 % | Chitin Armor-Skill (10 %+5 %/Level, max 85 %) |
| MP-Regeneration | 1 MP/s | konstant, passiv |

**Basis-Nahkampfschaden:**
```
baseDmg = 3 + absorb.level × 1.5
effDmg  = baseDmg × calcDamageMult(player.statusEffects)
```

---

## 4. Entity-Kampfwerte (implementiert)

### Aktuelle Entities mit Kampfwerten

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

### Passive Skills → permanente Effekte

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
Chance (poison_spider) = 40 %
Chance (Venom-Skill)   = 30 % + 5 % × level
```

### Schadensreduktion (Stacking)
```
reduction = min(0.85, sum aller damageReduction-Effekte)
finalDmg  = baseDmg × (1 - reduction)
```

**Max-Effekte pro Entity:** 8 (ältester Effekt wird verdrängt)

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
Venom-Chance: 30 % + 5 % × venom.level
```

### Dash-Skill (Jump)
```
Distanz = 160 + 20 × (jump.level - 1) px
Richtung = Joystick-Vektor (falls inaktiv: kein Bewegungseffekt)
```

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

Das Respawn-System basiert auf der biologischen Teilungsfähigkeit von *Physarum polycephalum* und der Desiccations-Widerstandsfähigkeit des Blobs. Vollständige Beschreibung in **GDD-01, Abschnitt 10**.

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
- Entity muss category="creature" und damage definiert haben
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

*Letzte Aktualisierung: 2026-03-30 — Abschnitt 7 um geplantes Blob-Teilungs-Respawn-System ergänzt*
