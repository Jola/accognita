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
[1b] Treffer-Stufe        (implementiert: verfehlt ×0 → Abbruch, leicht ×0,6, normal ×1,
                           schwer ×1,3, kritisch ×2,5 — Details: GDD-03 Abschnitt 6, Treffer-Stufen)
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
[7] Minimum-Clamp         (mindestens 1 milli-HP, außer bei Verfehlen/Immunität — der Mindestschaden von 1 HP gilt in Schritt [1])
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
finalDmg       = max(1, round(afterWeakness))                     // Schritt 7 (milli-HP)
// implementiert: baseDmg = max(1000, baseDmg) vor Schritt [1b] — Skill-Schaden mindestens 1 HP
```

**Ausnahme Immunität:** Wenn `defenderImmune(damageType) = true`, dann `finalDmg = 0`.

### 3.3 Warum diese Reihenfolge?

- **Multiplikator vor Block**: Ein stärkerer Angriff drückt mehr durch die Rüstung.
- **Penetration vor Blockierung**: Penetration "bricht" einen Teil der Rüstung auf, bevor der Effekt berechnet wird.
- **Flat-Block vor %Reduction**: Flache Rüstung ist das "Schild" — was dahinter kommt, wird weich gedämpft.
- **Schwäche/Stärke am Ende**: Trifft den "echten" Schaden, nicht den Rohen — Feuer auf einer Wunde brennt mehr.
- **Treffer-Stufe [1b] ganz vorne**: Kritische Treffer sollen durch Rüstung durchschlagen, leichte Treffer eher daran hängen bleiben — so wirkt ein Krit gegen gepanzerte Gegner spürbar.
  **Begründung (Vorschlag Claude):** Die Stufe beschreibt, *wie gut* der Angriff sitzt — das ist eine Eigenschaft des Angriffs, nicht der Rüstung, gehört also vor die Verteidigung.

### 3.4 Einheiten: Milli-Werte (implementiert)

Alle **absoluten** Werte — HP, MP, Schaden, Heilung, Flat-Block, Rückschlag — werden intern als **ganze Zahlen in Tausendsteln** gespeichert und berechnet (1 HP = 1000 mHP, Konstante `MILLI` in [balance.ts](../src/data/balance.ts)). ~~Angezeigt wird immer durch 1000 geteilt.~~ [VERWORFEN — Rundung war uneinheitlich: teils gerundet, teils abgeschnitten]
**Ausgenommen:** Faktoren und Prozente (Multiplikatoren, Reduktion, Chancen), Level und XP — sie bleiben wie sie sind.
In `LinearFormula` stehen absolute Werte in Anzeige-HP (z.B. Flat-Block `base: 3` = 3 HP); das SkillEffectSystem rechnet sie in Milli um.

**Vorgabe (Entwickler):** Keine Floats, sondern Integers in Tausendsteln; ausgenommen Faktoren, Level und Erfahrung.
**Begründung (Entwickler):** Ein technischer Grund: Gerechnet wird nur mit Integers, nicht mit Fließkommazahlen — trotzdem braucht die Berechnung eine höhere Präzision als 1 HP, damit beim Verrechnen mit Faktoren keine Präzision verloren geht und sich Rundungsfehler nicht fortpflanzen. Daher Milli-HP.
Umsetzung: Faktoren werden auf den Milli-Wert angewendet und erst am Ende einer Berechnung einmal auf ganze Milli gerundet (z.B. Schadenspipeline Schritt [7]).
**Begründung der Ausnahmen (Vorschlag Claude):** Faktoren, Level und XP sind dimensionslose Größen bzw. Zählwerte, dort entstehen keine Rundungsverluste.
MP-Regeneration: 1 mMP pro Millisekunde = 1 MP/s — **Begründung (rekonstruiert, bitte bestätigen):** entspricht dem Wert vor der Umstellung (1 MP/s).

**Anzeige (implementiert):** HP-Werte — Lebenspunkte, Schaden, Heilung, Rückschlag — werden in vollen HP angezeigt und **immer aufgerundet** (`toDisplayHp` in [balance.ts](../src/data/balance.ts)): 1 mHP → 1 HP, 1001 mHP → 2 HP.
**Vorgabe (Entwickler):** Gerechnet wird mit milli-HP und milli-Schaden, angezeigt werden immer volle HP, aufgerundet.
**Begründung (Entwickler):** Solange auch nur ein milli-HP übrig ist, ist die Einheit nicht tot — sie darf also nicht mit 0 HP angezeigt werden.
MP werden dagegen **abgerundet** angezeigt. **Begründung (Vorschlag Claude):** Bei aufgerundeten MP stünde z.B. „3 vorhanden“, obwohl ein Skill mit 3 MP Kosten nicht einsetzbar ist.
> Begründung offen — Soll auch MP aufgerundet werden?
Der INDEX im Spielmenü zeigt Werte dagegen exakt mit Nachkommastellen (z.B. Flat-Block 7,24 HP). **Begründung (Vorschlag Claude):** Er ist ein Nachschlagewerk für Balancing; gerundet ließen sich Formeln nicht nachvollziehen.

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

**Hinweis (v0.4, 31. Oktober 2026):** Skills haben keine Level mehr ([GDD-02 Abschnitt 8](GDD-02-Skillsystem.md#8-erfahrung-statt-level)). Für L wird der stetige Übungsgrad u eingesetzt (`evalFormula(formula, practice)` in SkillEffectSystem.ts); `perLevel` ist damit der Zuwachs je Einheit Übungsgrad. In den Beispielen unten (Abschnitte 6 und 7) sind `maxLevel`, `baseXpThreshold`, `xpThresholdMultiplier` und `skillLevels` [VERWORFEN]: heute stehen dort `learningEffort` bzw. `skillXp` (Erfahrung je Skill).

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

  // Optional: Obergrenze des Ergebnisses (implementiert)
  max?: number;
  // Wert = min(max, Kurvenwert). Pflicht für Chancen (max: 1.0), weil Skills
  // mit maxLevel 0 unbegrenzt steigen und jede Kurve sonst irgendwann 100 % überschreitet.
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
| `inject_venom` | Spritzt Gift ein: Dosis kommt auf die Giftlast des Ziels (Abschnitt 12). Feld `venomDose` = Dosis in HP | Chance 0.0–1.0 |
| `reflect_damage` | Gibt X% des Schadens zurück an Angreifer | 0.0–1.0 |
| `damage_mult` | Multipliziert ausgehenden Schaden | Faktor |
| `speed_mod` | Verändert Bewegungsgeschwindigkeit | Faktor |
| `grant_penetration` | Ignoriert X Punkte Flat-Block beim Angriff | Punkte |
| `dexterity` | Geschick (Trigger `passive`): verschiebt Treffer-Stufen beim Angriff nach oben, beim Verteidigen nach unten. Zählt auch bei aktiven Skills, solange sie bekannt sind (z.B. Jump). Beim Angriff zählt der Beitrag des eingesetzten Skills nicht mit (GDD-03, Treffer-Stufen) | Punkte |

**Begründung `dexterity` (Vorschlag Claude, übernommen):** Geschick kommt über Skills — kein separates Attribut. Damit gilt die Grundregel dieses Dokuments: Eigenschaften ergeben sich deklarativ aus Skills, für Spieler und Gegner gleich. Geschick wirkt auch beim Verteidigen (Ausweichen), damit flinke Gegner seltener schwer getroffen werden.
**Begründung „zählt auch bei aktiven Skills" (Vorschlag Claude):** Geschick ist eine Körpereigenschaft, die man durch das Erlernen eines Skills erwirbt — nicht nur während man ihn einsetzt.

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
export const MIN_SKILL_DAMAGE = 1_000;      // Skill-Schaden vor allen Effekten mindestens 1 HP (implementiert)
export const MIN_FINAL_DAMAGE = 1;          // Endschaden nach allen Effekten mindestens 1 milli-HP

// Schwäche/Stärke-Grenzen
export const MAX_WEAKNESS_MULT = 3.0;       // maximaler Schwäche-Multiplikator
export const MIN_RESISTANCE_MULT = 0.1;     // minimaler Resistenz-Multiplikator
```

**Begründungen:**
- `MAX_PERCENT_REDUCTION = 0.85` — **Begründung (rekonstruiert, bitte bestätigen):** nie unverwundbar; auch stark gestapelte Rüstung lässt 15 % durch. Der Wert 85 % stammt aus dem v0.3-Chitin-Cap.
- [VERWORFEN] `MIN_FINAL_DAMAGE` — ursprüngliche Idee: jeder Treffer macht mindestens **1 Schaden**, damit Angriffe nie völlig wirkungslos sind. Seit der Milli-Umstellung stand der Wert aber auf `1` milli-HP, und es war offen, ob das gewollt ist.
- **Mindestschaden (implementiert):** `MIN_SKILL_DAMAGE` = 1 HP gilt für den Schaden des Skills **vor** allen Effekten. Rüstung, leichte Treffer usw. dürfen ihn danach weiter senken; `MIN_FINAL_DAMAGE` = 1 milli-HP bleibt als Untergrenze am Ende, und auch Bruchteile von HP werden voll abgezogen.
  **Vorgabe (Entwickler):** Der Schaden von Skills ist mindestens 1 HP, kann aber durch die verschiedenen Effekte verringert werden. Auch wenn ein Schaden in milli-HP herauskommt, wird er angewendet.
  **Begründung (Entwickler):** Damit Luft zum Rechnen bleibt: Unter 1 HP Grundschaden hätten Faktoren und Abzüge kaum noch Spielraum, bevor sie die Milli-Grenze erreichen. (Ursprünglicher Grund „Schaden unter 1 HP sieht doof aus“ — [VERWORFEN], weil die Anzeige ohnehin immer auf volle HP aufrundet.)
  **Vorgabe (Entwickler) — Designregel:** Wird jemals ein Skill-Schaden unter 1 HP gebraucht, wird stattdessen alles andere nach oben korrigiert (HP, übrige Schadenswerte), statt den Mindestschaden zu senken.
  Folge: Biss Lv1 (7 HP Stich) gegen Chitin Lv3+ macht weiterhin nur 1 mHP pro Treffer (angezeigt als 1 HP); ein kritischer Treffer schlägt jedoch durch (z.B. ~10 HP gegen 7,24 HP Flat-Block).
- `MAX_WEAKNESS_MULT = 3.0`, `MIN_RESISTANCE_MULT = 0.1` — **Begründung (rekonstruiert, bitte bestätigen):** Gestapelte Schwächen/Resistenzen sollen keine Ausreißer erzeugen (One-Shots bzw. Unverwundbarkeit durch Kombination).
- `SKILL_DAMAGE_BASE_MULTIPLIER`, `SKILL_DEFENSE_BASE_MULTIPLIER` — globale Hebel, um alle Skills auf einmal stärker/schwächer zu machen, ohne Einzelwerte anzufassen. (Derzeit wird nur der Verteidigungs-Hebel im Code ausgewertet.)

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

## 12. Gift: Giftlast und stufenloser Abbau (implementiert)

Stellschrauben mit Begründungen: [src/data/venom.ts](../src/data/venom.ts), Rechenregeln: [src/systems/VenomSystem.ts](../src/systems/VenomSystem.ts) (gleiche Abschnittsnummern).

**Vorgabe (Entwickler):** Gift stapelt. Die Begründung soll logisch sein und sich an der Natur orientieren.
**Vorgabe (Entwickler):** Das gesamte Gift-Feature steckt isoliert in einem eigenen Modul.

### 12.1 Dosis je Biss

Jeder Treffer eines Wesens mit Venom würfelt die Bisschance (unverändert: `min(100 %, 30 % + 10 % × √(u − 1))`). Gelingt sie, wird eine **Dosis** eingespritzt:

```
Dosis = 8 + 2 × (u − 1) HP        u=1: 8 · Giftspinne u=3: 12 · Schlange u=15: 36
```

Deklaration in [skills.ts](../src/data/skills.ts): Effekt `inject_venom`, `formula` = Chance, `venomDose` = Dosis.

**Wer Gift einspritzt:** Ein passiver Skill (Venom) bei jedem Nahkampftreffer, ein aktiver Skill (Stachelstich 💉: Chance 80 % + 5 % × √(u−1), Dosis ~~15 + 3 × (u−1)~~ 12 + 2 × (u−1) HP, abgeschwächt 1. Nov. 2026) nur, wenn genau dieser Skill getroffen hat.
**Vorgabe (Entwickler):** Das Skorpiongift wirkt nur beim Giftstachel, nicht bei den Scheren, und ist stärker als das der Spinnen.
**Begründung (Vorschlag Claude, übernommen):** Das Gift sitzt in der Giftblase am Stachel; der Stachel ist ein reines Giftwerkzeug, Spinnen packen mit dem Biss und geben nicht immer Gift ab.

**Begründung (Vorschlag Claude, übernommen):**
- Gift ist eine Substanz — zwei Bisse bringen doppelt so viel Gift in den Körper.
- Die Dosis entspricht dem Gesamtschaden des früheren 4-s-Gifts (`(2 + 0,5·(u−1)) × 4`). Ein einzelner Biss kostet also so viel wie vorher.
- Die Bisschance bleibt: Auch Giftschlangen beißen oft „trocken“.
- Die Körpergröße steckt schon in den HP: Giftigkeit hängt an der Dosis pro Körpermasse (LD50 in mg/kg). 12 HP töten eine Ameise (8 HP), kosten einen Drachen (500 HP) nur 2,4 %.

### 12.2 Giftlast (Stapeln)

Jedes Ziel hat **eine** Giftlast L (milli-HP). Jede Dosis wird addiert. Stapeln erzeugt keinen Extra-Schaden — jede Dosis richtet genau ihren Betrag an.

**Begründung (Vorschlag Claude, übernommen):** Drei Giftspinnen machen dreimal so viel Giftschaden wie eine; Schwärme giftiger Gegner bleiben gefährlich (GDD-08 Abschnitt 19.2, Weg 3). Die Giftlast ersetzt das Auffrischen eines 4-s-Effekts und behebt damit beide Fehler aus [GDD-08 Abschnitt 12.3](GDD-08-Progressionsmathematik.md) (Takt-Reset, Überschreiben durch schwächeres Gift).

### 12.3 Stufenloser Abbau mit Halbwertszeit

```
L(t) = L₀ · 2^(−t / T)          T = 2 s
Schadensrate = λ · L            λ = ln 2 / T ≈ 0,347 / s
pro Frame:  L_neu = L · 2^(−dt / T),   Schaden = L − L_neu
```

**Vorgabe (Entwickler):** Stufenlos — in jedem Frame wird der fällige Anteil abgezogen, keine Ticks. Das Tempo entspricht einer Halbwertszeit von 2 s.
**Begründung (Vorschlag Claude, übernommen):** Ein Körper baut Fremdstoffe meist proportional zur Menge ab (feste Halbwertszeit, Standardregel der Pharmakologie); viele Toxine werden verbraucht, indem sie sich an Gewebe binden — Abbau = Schaden. Die Rechnung ist exakt und bildratenunabhängig.

**Erneute Vergiftung:** Die neue Dosis wird zur Restlast addiert; danach läuft der Abbau einfach mit der Summe weiter. Der Körper „merkt“ sich nicht, welche Dosis alt ist — bei reiner Halbwertszeit ist das genau dasselbe, als würde jede Dosis für sich abgebaut. Beispiel: 20 HP Gift, nach 2 s sind 10 HP abgebaut (10 übrig); ein zweiter Biss mit 10 HP ergibt 20 HP Last, die wie eine frische 20-HP-Vergiftung weiterläuft. Gesamtschaden 30 HP, leer nach 10,5 s statt 8,5 s.

### 12.4 Ende: Mindestrate

```
Rate = max(λ · L, 1 HP/s)  bis L = 0
Dauer bis leer = T · log₂(L₀ / 2,9 HP) + 2,9 s
8 HP → 5,8 s · 12 HP → 7,0 s · 36 HP → 10,2 s · 100 HP → 13,1 s
```

Eine reine Halbwertszeit endet nie. Unter ≈ 2,9 HP Restlast (wo λ·L unter 1 HP/s fällt) fließt der Rest gleichmäßig mit 1 HP/s ab und endet exakt bei 0.
**Begründung (Vorschlag Claude, übernommen):** Jede Dosis macht genau ihren vollen Schaden, das Ende ist eindeutig. Vor allem eine Spielregel; aus der Natur nur schwach begründbar (gebundenes Toxin wirkt noch zu Ende). Alternative Wirkschwelle (Rest unter ~1 HP verfällt ohne Schaden) — endet fast gleich, verliert bis zu 1 HP je Vergiftung.

### 12.5 Erfahrung und Anzeige

- **Vorgabe (Entwickler):** Venom-Erfahrung wird stufenlos mitgerechnet — XP = Giftschaden, den die Giftlast eines Gegners in jedem Frame tatsächlich anrichtet, anteilig für den Skill, der das Gift eingespritzt hat (die Last merkt sich die Anteile; Venom und Stachelstich bekommen jeweils ihre eigene XP) (kein Überschuss über den Tod hinaus; stirbt das Ziel, verfällt der Rest). Werte, Wachstum und Skill-Liste werden einmal pro Sekunde nachgeführt.
- **Vorgabe (Entwickler):** Die Schadenszahl erscheint einmal beim Einspritzen (= Dosis, violett neben der Trefferzahl), nicht pro Tick oder Sekunde.
- **Begründung (Vorschlag Claude, übernommen):** Die HP-Leisten (HUD und Gegner) zeigen die Giftlast als violetten Abschnitt am Ende der HP — so viele HP wird das Gift noch kosten.
- Gegner vergiften nur den Blob, Gegner untereinander nicht (Entity-Leveling ohne Gift). Tod, Respawn, Checkpoint und Laden leeren die Giftlast.

### 12.6 Offen (Vorschläge Claude, nicht entschieden)

- **Sättigung:** Ein Körper hat nur begrenzt viele Angriffspunkte für ein Toxin; mehr Gift würde dann nicht schneller, nur länger wirken. Vorerst weggelassen.
- **Mehrere Giftarten:** eigene Giftlast je Toxin-Art (z. B. Nerven- und Blutgift) — Gift-Cocktails wie bei Schlangen.
- **Körpergröße:** Kleine Körper haben einen schnelleren Stoffwechsel (Kleibers Gesetz) → kürzere Halbwertszeit.
- **Giftresistenz:** Ein Skill, der einen Teil der Dosis ohne Schaden abbaut.

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
| [src/data/venom.ts](../src/data/venom.ts) · [src/systems/VenomSystem.ts](../src/systems/VenomSystem.ts) | Gift: Stellschrauben und Rechenregeln (Abschnitt 12) |

---

*Letzte Aktualisierung: v0.5 — Stachelstich-Dosis gesenkt (1. November 2026); Abschnitt 12: Gift aktiver Skills nur beim eigenen Treffer (Stachelstich), XP anteilig je Gift-Skill (31. Oktober 2026); Abschnitt 12 Gift: Giftlast, stufenloser Abbau mit Halbwertszeit, Mindestrate, Effekt-Typ `inject_venom` (31. Oktober 2026); davor Hinweis Übungsgrad statt Level in Abschnitt 5.4 (31. Oktober 2026); davor implementiert — DamageSystem (8-stufige Pipeline), SkillEffectSystem (deklarative Effekte), DamageType-System, Skill-Effekt-Deklaration für chitin_armor/superstrength/hemolymph/venom (Oktober 2026); LinearFormula.max, Treffer-Stufe 1b, dexterity; Milli-Einheiten (3.4) und Begründungen der Caps ergänzt; Mindestschaden 1 HP vor Effekten, HP-Anzeige immer aufgerundet; Begründungen für Milli-HP und Mindestschaden vom Entwickler; Geschick ohne eigenen Skill-Beitrag*
