# ABSORB & EVOLVE — Game Design Document
## Datei 05: Kampfmathematik, Skill-Engine & Entity-Architektur

> **Status: Implementiert (v0.4)** — Dieses Dokument beschreibt die Neuarchitektur des Kampf- und Skill-Systems. Die Schadenspipeline, das Schadenstyp-System und das deklarative SkillEffect-System sind vollständig implementiert.

**Voraussetzungen:** Dieses Dokument setzt Kenntnis der folgenden Dateien voraus:
- [GDD-02-Skillsystem.md](GDD-02-Skillsystem.md) — Skill-Konzepte, Entdeckung, Leveling
- [GDD-03-Kampfsystem.md](GDD-03-Kampfsystem.md) — Kampfablauf, Status-Effekte, KI
- [src/types/Combat.ts](../src/types/Combat.ts) — Aktuelle TypeScript-Interfaces
- [src/data/skills.ts](../src/data/skills.ts) — Aktuelle Skill-Definitionen (Migrationsquelle)
- [src/data/entities.ts](../src/data/entities.ts) — Aktuelle Entity-Definitionen (Migrationsquelle)

---

## 1. Designziele

### Was dieses System leisten soll

1. **Skalierbarkeit** — Hunderte von Skills und Entities sind konfigurierbar, ohne dass Code geändert werden muss.
2. **Lesbarkeit** — Jede Konfiguration ist von Menschen nachvollziehbar; der Grund für jeden Effekt ist dokumentiert.
3. **Isolierung** — Eine Änderung an Skill X hat keine Nebenwirkungen auf Skill Y, sofern kein explizites Zusammenspiel definiert ist.
4. **Solide Mathematik** — Formeln sind nachvollziehbar, kurvenartig (nicht flach) und einfach zu kalibrieren.
5. **Plausibilität** — Jede Interaktion hat ein logisches "Warum". Das ist sowohl Designhilfe als auch Kommunikation an den Spieler.

### Was dieses System *nicht* leisten soll

- Kein generisches Scripting-System (zu komplex, zu fehleranfällig)
- Keine Laufzeit-Formel-Auswertung via `eval()` oder Parser (Sicherheitsrisiko)
- Keine versteckten Sonderfälle im Code — alles explizit in den Daten

---

## 2. Schadenstypen-Taxonomie

> **Begründungsprinzip**: Jeder Schadenstyp entspricht einem physikalischen oder magischen Wirkmechanismus. Die Abwehr-Effektivität ergibt sich direkt aus der Physik/Logik des Materials.

### 2.1 Physische Schadenstypen

| ID | Deutsch | Beschreibung | Typische Quellen |
|----|---------|-------------|-----------------|
| `pierce` | Stich | Konzentrierte Kraft auf kleiner Fläche, dringt durch hartes Material mit Hebelwirkung | Zähne, Stacheln, Dorne, Pfeile |
| `slash` | Schnitt | Schneidende Kraft entlang einer Fläche | Klauen, Sicheln, scharfe Flügel |
| `blunt` | Wucht | Breit verteilte Schlagenergie, Erschütterung | Körpermasse, Aufprall, Stampfen |
| `acid` | Säure | Chemische Zersetzung von Material | Säure-Speichel, ätzende Flüssigkeiten |

### 2.2 Elementare Schadenstypen

| ID | Deutsch | Beschreibung | Typische Quellen |
|----|---------|-------------|-----------------|
| `fire` | Feuer | Thermische Energie, Verbrennung | Feueratem, Lava |
| `poison` | Gift | Biochemischer DoT, kumulativ | Venomdrüsen, Pilzsporen |
| `magic` | Magie | Energetische Übertragung, umgeht physische Abwehr | Magieskills, enchantierte Angriffe |
| `psychic` | Psychisch | Bewusstseinsstörung, nur gegen Wesen mit Nervensystem | Höhere Intelligenzwesen |

### 2.3 Erweiterungsregel

Neue Schadenstypen werden hier dokumentiert bevor sie implementiert werden. Jeder Typ braucht:
- Eine physikalische/logische Begründung
- Eine Antwort auf: "Was hält ihn auf?"
- Eine Antwort auf: "Was verstärkt ihn?"

---

## 3. Das Schadensmodell

### 3.1 Die Schadenspipeline

Jeder Angriff durchläuft exakt diese Stufen in dieser Reihenfolge:

```
[1] Basis-Schaden         (aus Skill/Angriff)
      ↓
[2] Angreifer-Multiplikator   (Stärke-Buffs, Superstrength etc.)
      ↓
[3] Penetrations-Bonus    (Angreifer ignoriert X Punkte Rüstung)
      ↓
[4] Flach-Blockierung     (Verteidiger blockt X Punkte vollständig)
      ↓
[5] Prozentuale Reduktion (Verteidiger reduziert Rest um Y%)
      ↓
[6] Schwäche/Stärke-Modifikator (Schadenstyp trifft Schwachstelle oder Resistenz)
      ↓
[7] Minimum-Clamp         (mindestens 1 Schaden, außer bei Immunität)
      ↓
[8] Final-Schaden         → HP-Abzug
```

### 3.2 Berechnung Schritt für Schritt

```
baseDmg        = skill.baseDamage + skill.perLevelBonus * (skillLevel - 1)
afterMult      = baseDmg * attackerMultiplier           // Schritt 2
effectiveBlock = max(0, defenderFlatBlock - attackerPenetration)  // Schritt 3+4
afterBlock     = max(0, afterMult - effectiveBlock)
afterReduction = afterBlock * (1 - defenderPercentReduction)      // Schritt 5
afterWeakness  = afterReduction * weaknessMultiplier              // Schritt 6
finalDmg       = max(1, round(afterWeakness))                     // Schritt 7
```

**Ausnahme Immunität:** Wenn `defenderImmune(damageType) = true`, dann `finalDmg = 0`.

### 3.3 Warum diese Reihenfolge?

- **Multiplikator vor Block**: Ein stärkerer Angriff drückt mehr durch die Rüstung.
- **Penetration vor Blockierung**: Penetration "bricht" einen Teil der Rüstung auf, bevor der Effekt berechnet wird.
- **Flat-Block vor %Reduction**: Flache Rüstung ist das "Schild" — was dahinter kommt, wird weich gedämpft.
- **Schwäche/Stärke am Ende**: Trifft den "echten" Schaden, nicht den Rohen — Feuer auf einer Wunde brennt mehr.

---

## 4. Verteidigungsmodell

### 4.1 Verteidigungstypen

Jede Verteidigung gegen einen Schadenstyp ist eines von:

| Typ | ID | Bedeutung | Beispiel |
|-----|-----|-----------|---------|
| **Vollblockierung** | `flat_block` | Reduziert Schaden um feste Punktzahl | Chitin vs. Stich |
| **Prozentreduktion** | `percent_reduce` | Reduziert Schaden um % | Chitin vs. Wucht |
| **Schwäche** | `weakness` | Verstärkt Schaden um % (>1.0x) | Chitin vs. Feuer |
| **Immunität** | `immune` | Schaden = 0 | Geister vs. physisch |
| **Absorbierung** | `absorb` | Heilt statt Schaden | Pflanzen vs. Wasser |

### 4.2 Chitin-Panzer als Beispiel

**Logik:**
- Chitin ist ein hartes, sprödes Exoskelett-Material aus Polysacchariden.
- Stiche: Spitze Objekte werden von der harten Oberfläche abgelenkt oder stoppen im Material → **Flat-Block**
- Schnitte: Ähnlich wie Stiche, aber Klingen können entlang der Plattenränder eindringen → **Flat-Block, aber weniger**
- Wucht: Erschütterung wird durch das starre Material direkt ans darunterliegende Gewebe weitergeleitet, nur leicht gedämpft → **% Reduktion (gering)**
- Feuer: Chitin entzündet sich, hat keinen Hitzeschutz → **Schwäche (Malus)**
- Säure: Säure löst Chitin auf → **Schwäche (Malus)**

```
chitin_armor Lv1 vs. pierce:  Flat-Block = 3   → 3 Schaden absorbiert
chitin_armor Lv1 vs. slash:   Flat-Block = 2   → 2 Schaden absorbiert
chitin_armor Lv1 vs. blunt:   % Reduce  = 5%  → 5% weniger Schaden
chitin_armor Lv1 vs. fire:    Schwäche  = 1.2x → 20% mehr Schaden
chitin_armor Lv1 vs. acid:    Schwäche  = 1.5x → 50% mehr Schaden

Pro Level: Flat-Block +3 (pierce), +2 (slash); % Reduce +3%; Schwächefaktor konstant
```

---

## 5. Skill-Effekt-Deklarationssystem

### 5.1 Architektur

Jeder Skill besteht aus einer Liste von **SkillEffects**. Jeder Effekt ist komplett selbstbeschreibend:

```typescript
interface SkillEffect {
  trigger:    EffectTrigger;      // Wann feuert der Effekt?
  condition?: EffectCondition;    // Optionale Bedingung
  effectType: EffectType;         // Was tut er?
  formula:    LinearFormula;      // Wie stark?
  damageType?: DamageType;        // Welchen Schadenstyp betrifft er? (optional)
  reasoning:  string;             // WARUM (Pflichtfeld — für Docs + Debug)
}
```

### 5.2 Trigger-Typen

| Trigger | Bedeutung |
|---------|-----------|
| `passive` | Dauerhaft aktiv, solange Skill entdeckt und aktiv |
| `on_hit_enemy` | Bei jedem erfolgreichen Treffer gegen einen Gegner |
| `on_receive_damage` | Wenn der Träger Schaden erhält |
| `on_activate` | Wenn Skill manuell aktiviert wird |
| `on_kill` | Wenn ein Gegner durch den Träger stirbt |
| `per_second` | Einmal pro Sekunde (für HoT/DoT-Checks) |
| `on_move` | Solange sich der Träger bewegt |

### 5.3 Bedingungstypen

```typescript
interface EffectCondition {
  damageType?:   DamageType | DamageType[];  // Nur bei diesem Schadenstyp
  targetType?:   EntityCategory;             // Nur gegen diesen Zieltyp
  hpBelow?:      number;                     // Nur wenn HP < X% von max
  hpAbove?:      number;                     // Nur wenn HP > X% von max
  hasStatus?:    string;                     // Nur wenn Status-Effekt aktiv
}
```

### 5.4 Formel-System: LinearFormula

Alle Formeln sind **linear** (Basis + Zuwachs pro Level). Komplexere Kurven werden durch `curve`-Modifier ausgedrückt.

```typescript
interface LinearFormula {
  base:     number;    // Wert bei Level 1
  perLevel: number;    // Zuwachs pro Level-Schritt
  // Wert bei Level L: base + perLevel * (L - 1)
  
  // Optional für nichtlineare Kurven:
  curve?: "linear" | "sqrt" | "log";
  // linear (Standard): base + perLevel * (L-1)
  // sqrt:  base + perLevel * sqrt(L-1)    → stark zu Beginn, flacht ab
  // log:   base + perLevel * log2(L)      → sehr stark zu Beginn
}
```

**Wann welche Kurve:**
- `linear`: Kampfskills, die konstant skalieren sollen
- `sqrt`: Defensivskills (frühe Level viel wert, höhere Level Diminishing Returns)
- `log`: Utility-Skills (Hauptnutzen in Level 1-3)

### 5.5 Effekt-Typen

| EffectType | Beschreibung | Formula-Einheit |
|-----------|-------------|----------------|
| `deal_damage` | Verursacht Schaden am Ziel | Schadenspunkte |
| `flat_block` | Blockiert X Schadenspunkte (bei `on_receive_damage`) | Punkte |
| `percent_reduce` | Reduziert Schaden um X% | 0.0–1.0 |
| `weakness` | Multipliziert eingehenden Schaden | Faktor > 1.0 |
| `heal_flat` | Heilt X HP | HP-Punkte |
| `heal_percent` | Heilt X% von max HP | 0.0–1.0 |
| `apply_status` | Appliziert Status-Effekt (DoT, HoT, Stun...) | Dauer/Intensität |
| `reflect_damage` | Gibt X% des Schadens zurück an Angreifer | 0.0–1.0 |
| `damage_mult` | Multipliziert ausgehenden Schaden | Faktor |
| `speed_mod` | Verändert Bewegungsgeschwindigkeit | Faktor |
| `grant_penetration` | Ignoriert X Punkte Flat-Block beim Angriff | Punkte |

---

## 6. Skill-Konfigurationsformat (Zielformat)

Das ist das Format, das `src/data/skills.ts` anstreben soll.
Jeder Skill ist vollständig deklarativ — kein Skill-spezifischer Code in Systemen.

```typescript
// Beispiel: Chitin-Panzer
{
  id: "chitin_armor",
  name: "Chitin-Panzer",
  element: "none",
  icon: "🪲",
  category: "basic",
  activation: "passive",
  maxLevel: 20,
  baseXpThreshold: 15,
  xpThresholdMultiplier: 1.5,
  description:
    "Passiv: Das absorbierte Chitin härtet die äußere Hülle des Blobs. " +
    "Schützt unterschiedlich stark je nach Schadenstyp.",

  effects: [
    {
      trigger: "on_receive_damage",
      condition: { damageType: "pierce" },
      effectType: "flat_block",
      formula: { base: 3, perLevel: 3, curve: "sqrt" },
      reasoning:
        "Chitin ist hart und spröde — Stiche stoppen an der Oberfläche. " +
        "Sqrt-Kurve: frühe Level sehr effektiv, höhere Level Diminishing Returns."
    },
    {
      trigger: "on_receive_damage",
      condition: { damageType: "slash" },
      effectType: "flat_block",
      formula: { base: 2, perLevel: 2, curve: "sqrt" },
      reasoning:
        "Klingen können entlang der Plattenränder eindringen — weniger Schutz als gegen Stiche."
    },
    {
      trigger: "on_receive_damage",
      condition: { damageType: "blunt" },
      effectType: "percent_reduce",
      formula: { base: 0.03, perLevel: 0.03 },
      reasoning:
        "Erschütterung wird durch das starre Chitin weitergeleitet. " +
        "Dämpfung ist gering — Chitin ist kein Stoßdämpfer."
    },
    {
      trigger: "on_receive_damage",
      condition: { damageType: "fire" },
      effectType: "weakness",
      formula: { base: 1.3, perLevel: 0 },
      reasoning:
        "Chitin ist organisch und brennt leicht. Kein Level-Scaling — " +
        "diese Schwäche ist eine inhärente Materialeigenschaft."
    },
    {
      trigger: "on_receive_damage",
      condition: { damageType: "acid" },
      effectType: "weakness",
      formula: { base: 1.5, perLevel: 0 },
      reasoning:
        "Säure zersetzt Chitin chemisch. Kritische Schwachstelle."
    }
  ]
}
```

---

## 7. Entity-Konfigurationsformat (Zielformat)

Entities deklarieren ihre Skills — keine `damage`-Felder mehr, kein Code.

```typescript
// Beispiel: Springspinne
{
  id: "jumping_spider",
  name: "Springspinne",
  icon: "🕷️",
  category: "creature",
  level: 3,
  behavior: "aggressive",
  disposition: "hostile",

  baseStats: {
    hp: 18,
    speed: 160,
    worldSize: 4,
    aggroRadius: 8,       // in worldSize-Einheiten
    attackRange: 1.5,     // in worldSize-Einheiten
    attackCooldownMs: 1200,
    respawnTime: 60,
  },

  skillLevels: {
    bite: 3,
    jump: 2,
    chitin_armor: 2,
    venom: 1,
  },

  lootTable: [
    { materialId: "chitin_fragment", chance: 0.6, quantity: [1, 3] },
    { materialId: "spider_silk", chance: 0.3, quantity: [1, 2] },
  ],

  // Spawnt in:
  spawnsIn: ["forest", "dungeon"],
}
```

**Warum kein `damage`-Feld mehr?**
Der Schaden ergibt sich vollständig aus `skillLevels.bite` (oder `claw` etc.).
Wer keinen Angriffs-Skill hat, kann keinen Schaden machen — unabhängig davon,
ob `damage` definiert ist oder nicht.

---

## 8. Skill-Interaktions-Matrix (Prinzip)

Bei vielen Skills explodieren die Kombinationsmöglichkeiten — das ist beabsichtigt.
Das System muss damit umgehen, ohne jeden Fall explizit zu programmieren.

### 8.1 Automatische Komposition

Wenn zwei Skills denselben Trigger und dieselbe Bedingung haben,
werden ihre Effekte **additiv gestapelt** — sofern nicht anders definiert.

**Beispiel:** Blob hat sowohl `chitin_armor` Lv5 als auch `tough_skin` Lv3:
```
chitin_armor.flat_block vs pierce (Lv5) = 3 + 3*sqrt(4) = 3 + 6 = 9
tough_skin.flat_block   vs pierce (Lv3) = 2 + 2*sqrt(2) = 2 + 2.8 = 4.8
Gesamt: 13.8 → 13 Flat-Block
```
Kein Spezialcode nötig — die Pipeline summiert alle aktiven Effekte.

### 8.2 Konflikte

| Situation | Regel |
|-----------|-------|
| Zwei Multiplikatoren | Multiplikativ gestapelt: 1.3x × 1.2x = 1.56x |
| Zwei % Reduktionen | Additiv: 20% + 30% = 50% (capped bei 85%) |
| Immunität + Schwäche | Immunität hat Vorrang |
| Flat-Block > Schaden | Schaden = 0 (nicht negativ) |

### 8.3 Skill-Synergien (explizit dokumentiert)

Wenn zwei Skills *bewusst* miteinander interagieren, wird das in einer Synergietabelle dokumentiert:

| Skill A | Skill B | Synergie | Begründung |
|---------|---------|----------|------------|
| `venom` | `acid_touch` | Venom-DoT erhält +50% wenn Ziel bereits unter Acid-Debuff | Säure öffnet die Haut für Giftstoffe |
| `superstrength` | `blunt` (Schadenstyp) | Wucht-Schaden erhält Multiplikator-Bonus | Mehr Masse = mehr Erschütterung |
| `chitin_armor` | `regeneration` | Regen-Rate ×0.7 wenn Chitin aktiv | Chitin behindert die Selbstorganisation des Blobs |

---

## 9. Balance-Philosophie & Levers

### 9.1 Das Powerlevel-Konzept

Jeder Skill hat ein **Powerlevel** — eine dimensionslose Zahl, die seinen
Kampfwert pro Level quantifiziert. Das ermöglicht schnelles Balancing ohne Testläufe.

```
Powerlevel_Offense(skill, level) = erwarteter Schaden pro Sekunde
Powerlevel_Defense(skill, level) = erwartete Schadensmitigation pro Sekunde
```

**Faustregeln für Powerlevel:**
- Offensive Skills Lv10: ~20–30 effektiver DPS
- Defensive Skills Lv10: ~15–25 effektive Mitigation/s
- Utility Skills: 0.5× Powerlevel eines Kampfskills (Bewegungsfreiheit, Controlls etc.)

### 9.2 Die drei Balance-Schrauben

| Schraube | Wo im Code | Was sie verändert |
|----------|------------|-------------------|
| `base` in LinearFormula | [`src/data/skills.ts`](../src/data/skills.ts) | Wert bei Level 1 |
| `perLevel` in LinearFormula | [`src/data/skills.ts`](../src/data/skills.ts) | Skalierung pro Level |
| `curve` in LinearFormula | [`src/data/skills.ts`](../src/data/skills.ts) | Wachstumskurve |

Nichts anderes sollte verändert werden müssen um ein Skill zu rebalancen.

### 9.3 Globale Balance-Konstanten ([`balance.ts`](../src/data/balance.ts))

```typescript
// Schadensskalierung
export const SKILL_DAMAGE_BASE_MULTIPLIER = 1.0;   // globaler Schaden-Multiplikator
export const SKILL_DEFENSE_BASE_MULTIPLIER = 1.0;  // globaler Verteidigungs-Multiplikator

// Caps
export const MAX_PERCENT_REDUCTION = 0.85;  // maximale prozentuale Schadensreduktion
export const MIN_FINAL_DAMAGE = 1;          // Minimum-Schaden (außer bei Immunität)

// Schwäche/Stärke-Grenzen
export const MAX_WEAKNESS_MULT = 3.0;       // maximaler Schwäche-Multiplikator
export const MIN_RESISTANCE_MULT = 0.1;     // minimaler Resistenz-Multiplikator
```

---

## 10. Modulstruktur (Zielarchitektur)

```
src/
├── types/
│   ├── Combat.ts          ← DamageType, EffectTrigger, EffectType, etc. (NEU: erweitert)  → [ansehen](../src/types/Combat.ts)
│   ├── Skill.ts           ← SkillEffect, LinearFormula, EffectCondition (NEU)             → [ansehen](../src/types/Skill.ts)
│   └── Entity.ts          ← EntityDefinition mit baseStats + skillLevels (GEÄNDERT)       → [ansehen](../src/types/Entity.ts)
│
├── data/
│   ├── skills.ts          ← Skill-Definitionen mit effects[]-Array (GEÄNDERT)             → [ansehen](../src/data/skills.ts)
│   ├── entities.ts        ← Entity-Definitionen ohne hardcoded damage (GEÄNDERT)          → [ansehen](../src/data/entities.ts)
│   └── balance.ts         ← Globale Konstanten, Caps, Multiplier (GEÄNDERT)               → [ansehen](../src/data/balance.ts)
│
├── systems/
│   ├── DamageSystem.ts    ← Die 8-stufige Pipeline (NEU)
│   ├── SkillEffectSystem.ts ← Effekt-Auflösung aus SkillEffect-Deklarationen (NEU)
│   ├── CombatSystem.ts    ← Angriff/Ziel/Ergebnis-Orchestrierung (VEREINFACHT)            → [ansehen](../src/systems/CombatSystem.ts)
│   ├── StatusEffectSystem.ts ← DoT/HoT (BLEIBT, leicht angepasst)                        → [ansehen](../src/systems/StatusEffectSystem.ts)
│   └── AiSystem.ts        ← KI (BLEIBT, leicht angepasst)                                → [ansehen](../src/systems/AiSystem.ts)
```

### Verantwortlichkeiten der neuen Module

**`DamageSystem.ts`** — Die Pipeline:
- Nimmt: `baseDamage`, `damageType`, `attackerEffects`, `defenderEffects`
- Gibt: `finalDamage` (number)
- Kein Wissen über Skills, Entities oder GameState

**`SkillEffectSystem.ts`** — Effekt-Auflösung:
- Nimmt: `entity` (Träger der Skills), `trigger`, `condition`
- Gibt: `ResolvedEffects` (welche Effekte aus welchen Skills feuern)
- Keine Schadenberechnung, nur Effekt-Sammlung

**`CombatSystem.ts`** — Orchestrierung:
- Ruft SkillEffectSystem für Angreifer-Effekte auf
- Ruft SkillEffectSystem für Verteidiger-Effekte auf
- Ruft DamageSystem mit den gesammelten Effekten auf
- Verteilt Ergebnis (HP-Änderung, Status-Anwendung)

---

## 11. Migrations-Strategie (von v0.3 → v0.4)

> **Iteratives Vorgehen** — kein Big-Bang-Rewrite. Schritte können einzeln implementiert werden.

### Schritt 1: Typen erweitern
- `DamageType` Enum einführen
- `SkillEffect[]` zu `SkillDefinition` hinzufügen
- `baseStats`-Block zu `EntityDefinition` hinzufügen
- Alle bisherigen Felder bleiben als Fallback erhalten

### Schritt 2: DamageSystem.ts neu schreiben
- Die 8-stufige Pipeline implementieren
- CombatSystem ruft sie auf, gibt bisherige Felder als Input
- Tests möglich ohne GameScene

### Schritt 3: Skills auf neues Format portieren
- Einen Skill nach dem anderen auf `effects[]` umstellen
- SkillEffectSystem liest `effects[]`, falls vorhanden
- Fallback auf altes System wenn `effects[]` leer

### Schritt 4: Entities auf neues Format portieren
- `damage`-Feld entfernen, durch `skillLevels` ersetzen (teilweise schon getan)

### Schritt 5: Alten Code entfernen
- Hardcoded Formeln in CombatSystem etc. raus
- SkillEffects.ts zu DamageSystem.ts umziehen

---

## Siehe auch

| Dokument / Datei | Relevanz |
|-----------------|----------|
| [GDD-00-Index.md](GDD-00-Index.md) | Einstiegspunkt, alle Dateireferenzen |
| [GDD-02-Skillsystem.md](GDD-02-Skillsystem.md) | Skill-Konzepte und Entdeckungsmechaniken |
| [GDD-03-Kampfsystem.md](GDD-03-Kampfsystem.md) | Kampfablauf, KI, Status-Effekte (implementiert) |
| [src/types/Combat.ts](../src/types/Combat.ts) | StatusEffect, AttackResult — Interfaces für Migration |
| [src/types/Skill.ts](../src/types/Skill.ts) | SkillDefinition, SkillInstance — Interfaces für Migration |
| [src/types/Entity.ts](../src/types/Entity.ts) | EntityDefinition, EntityInstance — Interfaces für Migration |
| [src/data/skills.ts](../src/data/skills.ts) | Aktuelle Skill-Definitionen (Zielformat: Abschnitt 6) |
| [src/data/entities.ts](../src/data/entities.ts) | Aktuelle Entity-Definitionen (Zielformat: Abschnitt 7) |
| [src/data/balance.ts](../src/data/balance.ts) | Globale Balancing-Konstanten (Abschnitt 9.3) |
| [src/systems/CombatSystem.ts](../src/systems/CombatSystem.ts) | Aktuelle Kampflogik — wird zu DamageSystem.ts + CombatSystem.ts aufgespalten |
| [src/systems/StatusEffectSystem.ts](../src/systems/StatusEffectSystem.ts) | Aktuelle Effektverarbeitung — wird zu SkillEffectSystem.ts erweitert |
| [src/systems/SkillEffects.ts](../src/systems/SkillEffects.ts) | Aktuelle Effekt-Formeln — migrieren nach DamageSystem.ts |

---

*Letzte Aktualisierung: v0.4 implementiert — DamageSystem (8-stufige Pipeline), SkillEffectSystem (deklarative Effekte), DamageType-System, Skill-Effekt-Deklaration für chitin_armor/superstrength/hemolymph/venom (Oktober 2026)*
