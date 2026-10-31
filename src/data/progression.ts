// ============================================================
// PROGRESSION — Erfahrung, Ränge, Kapazität, Übertraining
// Absorb & Evolve
//
// DIESE DATEI IST DIE EINZIGE QUELLE FÜR alle Stellschrauben des
// Fortschritts. Die Rechenregeln dazu stehen in
// src/systems/ProgressionSystem.ts (gleiche Abschnittsnummern).
// Ausführliche Herleitung: GDD-02 Abschnitt 8, GDD-08 Teil 6.
//
// Kennzeichnung der Herkunft (CLAUDE.md, Begründungspflicht):
//   Vorgabe (Entwickler)                — von Jörn entschieden
//   Begründung (Entwickler)             — Jörns eigene Begründung
//   Begründung (Vorschlag Claude, übernommen) — von Jörn angenommen
//   Vorschlag Claude (offen)            — noch nicht bestätigt
//   VORLÄUFIG                           — Zahlenwert ist ein Platzhalter,
//                                          noch nicht abgestimmt
//
// Grundprinzip in einem Satz:
//   Ein Skill hat nur Erfahrung (XP). Daraus folgt fließend seine Wirkung.
//   Ränge sind nur Beschriftungen. Die Summe aller Erfahrung ist durch die
//   Kapazität des Blobs begrenzt — Neues verdrängt das am längsten nicht
//   Geübte.
//
// Vorgabe (Entwickler): Keine Level mehr — weder für Skills noch für den
//   Charakter. Jeder Skill sammelt nur Erfahrung.
// Begründung (Entwickler): Level wirken wie eine unnatürliche Einheit.
// ============================================================

// -----------------------------------------------------------
// 1. ERFAHRUNG → ÜBUNGSGRAD (fließende Wirkung)
//
// Vorgabe (Entwickler): Die Werte eines Skills hängen direkt an seiner
//   Erfahrung, nicht am Rang. Sie verbessern sich fließend in sehr kleinen
//   Schritten statt in Level-Sprüngen.
//
// Umsetzung: Aus der Erfahrung wird eine stetige Rechengröße abgeleitet,
//   der „Übungsgrad“ u. Alle Effekt-Formeln in skills.ts werden mit u
//   ausgewertet (evalFormula). u ist KEIN Level: es springt nie, wird nicht
//   angezeigt und hat beliebig viele Nachkommastellen.
//
//     u(xp) = 1 + ( xp / (learningEffort × PRACTICE_XP_FACTOR) ) ^ (1 / PRACTICE_CURVE_EXPONENT)
//     xp(u) = learningEffort × PRACTICE_XP_FACTOR × (u − 1) ^ PRACTICE_CURVE_EXPONENT
//
//   learningEffort steht je Skill in skills.ts (Lernaufwand).
//
// Begründung (Vorschlag Claude, offen):
//   - u beginnt bei 1 und liegt auf derselben Skala wie die Werte der
//     Gegner in entities.ts (skillLevels, level). Dadurch funktionieren alle
//     Vergleiche Spieler↔Gegner (Erfolgschance, XP-Skalierung) und alle
//     Effekt-Formeln unverändert weiter.
//   - Exponent 2 heißt: doppelt so viel Wirkungszuwachs kostet vierfache
//     Erfahrung. Der Skill wird also weiter besser, aber jeder weitere
//     Schritt dauert länger (GDD-08 Abschnitt 8, Zwei-Exponenten-Modell).
//   - Abwägung: Die alte Kurve (×1,5 je Level) war exponentiell — hohe
//     Werte waren praktisch unerreichbar und sprengten den Zahlenbereich
//     (GDD-08 Abschnitt 6). Eine Potenzkurve wächst gutmütig. Unbegrenztes
//     Wachstum ist trotzdem ausgeschlossen, weil die Kapazität (Abschnitt 3)
//     die Gesamterfahrung deckelt.
//   - Die Kurve ist konkav: Erfahrung auf mehrere Skills verteilt bringt in
//     Summe mehr Wirkung als alles in einen Skill. Das belohnt Breite statt
//     Spezialisierung — passend zu „das Spiel entwickelt sich in die Breite“.
//   - Faktor 0,5 hält die frühe Phase nah am alten Tempo (Biss: u≈3 nach
//     24 XP, alt Lv3 nach 30 XP).
// -----------------------------------------------------------

/** Steilheit der Kurve: 2 = vierfache Erfahrung für doppelten Zuwachs. VORLÄUFIG */
export const PRACTICE_CURVE_EXPONENT = 2;

/** Skaliert den Lernaufwand eines Skills auf die Kurve. VORLÄUFIG */
export const PRACTICE_XP_FACTOR = 0.5;

// -----------------------------------------------------------
// 2. RÄNGE (nur Anzeige)
//
// Vorgabe (Entwickler): Die Erfahrungsskala wird in benannte Abschnitte
//   unterteilt. Namen und Anzahl dürfen noch überarbeitet werden.
// Begründung (Entwickler): Das soll dem Spieler verständlicher machen, was
//   die Erfahrung an einem Skill bedeutet.
//
// Ränge ändern KEINEN Wert. Sie sind reine Beschriftung über dem
// stetigen Fortschritt. Die Grenzen sind als Übungsgrad angegeben; daraus
// folgt die nötige Erfahrung je Skill automatisch (xp(u), Abschnitt 1).
//
// Beispiel Biss (learningEffort 12) — XP ab Rangbeginn:
//   0 · 6 · 24 · 74 · 150 · 294 · 486
// Jeder Rang dauert länger als der vorige (6, 18, 50, 76, 144, 192 XP),
// bleibt aber erreichbar.
// Grenzen: Vorschlag Claude (offen), VORLÄUFIG.
//
// Namen — Vorgabe (Entwickler): Beide Namensreihen aus dem Gegenvorschlag
//   von Claude stehen im Code. Aktiv ist vorerst die Biologie-Reihe, damit
//   Jörn sie im Spiel sehen kann; die Handwerk-Reihe steht daneben.
// Begründung (Vorschlag Claude, übernommen):
//   - Biologie: passt zum Schleimpilz, der durch Gewöhnung lernt — der Skill
//     wird vom ersten Versuch zur Gewohnheit, zum Instinkt und schließlich
//     zur „zweiten Natur“. Abwägung: thematisch stark, aber weniger sofort
//     verständlich als die Handwerk-Reihe.
//   - Handwerk: passt zum mittelalterlichen Setting; Lehrling → Geselle →
//     Meister ist als Reihenfolge allgemein bekannt.
//   - Die ursprüngliche Reihe (Neuling · Anfänger · Geübt · Könner · Profi ·
//     Experte · Meister) mischte Adjektiv und Nomen, und Könner/Profi/Experte
//     ließen sich schwer ordnen. [VERWORFEN, Oktober 2026]
// -----------------------------------------------------------

export interface SkillRank {
  name: string;
  /** Übungsgrad, ab dem der Rang gilt */
  fromPractice: number;
}

export const SKILL_RANKS: readonly SkillRank[] = [
  // Biologie (aktiv)                       // Handwerk (Alternative)
  { name: "Regung",     fromPractice: 1 },    // { name: "Neuling",  fromPractice: 1 },
  { name: "Versuch",    fromPractice: 2 },    // { name: "Anfänger", fromPractice: 2 },
  { name: "Übung",      fromPractice: 3 },    // { name: "Lehrling", fromPractice: 3 },
  { name: "Gewohnheit", fromPractice: 4.5 },  // { name: "Geselle",  fromPractice: 4.5 },
  { name: "Routine",    fromPractice: 6 },    // { name: "Könner",   fromPractice: 6 },
  { name: "Instinkt",   fromPractice: 8 },    // { name: "Experte",  fromPractice: 8 },
  { name: "Natur",      fromPractice: 10 },   // { name: "Meister",  fromPractice: 10 },
];

// -----------------------------------------------------------
// 3. KAPAZITÄT
//
// Vorgabe (Entwickler): Der Charakter hat kein Charakter-Level, sondern eine
//   maximale Skill-Kapazität. Sie begrenzt die Summe der Erfahrung aller
//   Skills. Wird ein Skill an der Grenze weiter trainiert, wird die neue
//   Erfahrung den Skills abgezogen, die am längsten nicht mehr geübt wurden.
// Begründung (Entwickler): Ein Wesen hat nur eine begrenzte Kapazität,
//   Fähigkeiten anzuhäufen — lernt es Neues, verlernt es Altes. Das Spiel
//   kann sich so in die Breite entwickeln: neue Skills kommen hinzu, dafür
//   wird die Kapazität eventuell etwas erweitert.
//
// Vorgabe (Entwickler): Die Kapazität wächst mit dem Blob. Wie genau, ist
//   noch nicht festgelegt; sie muss zu den erlernbaren Skills passen.
//
// PLATZHALTER bis zur Festlegung — Vorschlag Claude (offen):
//   Kapazität = CAPACITY_BASE + CAPACITY_PER_GROWTH × Wachstum
//   Wachstum  = log2(1 + Lebenserfahrung / GROWTH_XP_SCALE)
//   Lebenserfahrung = alle je gesammelte Erfahrung, auch später verlernte.
//   - Wachstum ist stetig (kein Level) und schrumpft nie: Was der Blob
//     einmal verarbeitet hat, hat ihn wachsen lassen, auch wenn er es
//     wieder vergisst.
//   - Mit GROWTH_XP_SCALE 200 entspricht Wachstum genau dem alten
//     „Spieler-Level − 1“ (Schwelle 200 XP, ×2). Größe, HP und MP des Blobs
//     bleiben dadurch so wie bisher, nur ohne Sprünge.
//   - Kern-Fähigkeiten (Analyze, Absorb) belegen KEINE Kapazität und werden
//     nie verlernt. Abwägung: Sonst könnte der Blob seine Grundfähigkeit
//     „Absorbieren“ vergessen und der Kern-Spielablauf bräche weg.
// -----------------------------------------------------------

/** Kapazität eines frisch geschlüpften Blobs (in XP). VORLÄUFIG */
export const CAPACITY_BASE = 200;

/** Zusätzliche Kapazität pro Einheit Wachstum (in XP). VORLÄUFIG */
export const CAPACITY_PER_GROWTH = 150;

/** Lebenserfahrung, bei der das Wachstum 1 erreicht (danach je Verdopplung +1). */
export const GROWTH_XP_SCALE = 200;

// -----------------------------------------------------------
// 4. ÜBERDEHNUNG (Kapazität zeitweise überschreiten)
//
// Vorgabe (Entwickler): Durch kontinuierliches Spielen kann die Kapazität
//   leicht überschritten werden. Danach sinkt sie wieder auf das Normalmaß —
//   und zwar NUR während Spielzeit, nicht in Pausen.
// Begründung (Entwickler): Wer hart trainiert, soll dafür belohnt werden.
//   Außerdem löst es den „fertigen“ Endgame-Charakter auf: Man kann die
//   Grenzen immer wieder etwas überschreiten, indem man die Skills, die man
//   einsetzen will, aktiv trainiert — und ist dann für eine gewisse Zeit
//   darin besonders gut.
// Begründung (Vorschlag Claude, übernommen) für „nur Spielzeit“: Echte
//   Pausen werden nie bestraft, und eine verstellte Geräte-Uhr bringt nichts.
//
// Umsetzung (Vorschlag Claude, offen):
//   - Bis Kapazität × (1 + OVERSTRETCH_MAX_FRACTION) wird nichts sofort
//     verlernt. Erst darüber wird sofort von den am längsten nicht geübten
//     Skills abgezogen.
//   - Der Überhang über der Kapazität schmilzt während der Spielzeit mit
//     der Halbwertszeit OVERSTRETCH_HALF_LIFE_PLAY_SECONDS ab — ebenfalls
//     von den am längsten nicht geübten Skills.
//   - Wer weiter trainiert, hält den Überhang; wer aufhört, landet nach
//     einigen Spielstunden wieder bei der Kapazität.
// -----------------------------------------------------------

/** Wie weit die Kapazität höchstens überschritten werden kann (0.2 = +20 %). VORLÄUFIG */
export const OVERSTRETCH_MAX_FRACTION = 0.2;

/** Halbwertszeit des Überhangs in Spielsekunden (2 Spielstunden). VORLÄUFIG */
export const OVERSTRETCH_HALF_LIFE_PLAY_SECONDS = 2 * 3600;

// -----------------------------------------------------------
// 5. VERLERNEN UND WIEDERERLERNEN
//
// Vorgabe (Entwickler): Gespeichert wird die höchste Erfahrung, die ein
//   Skill je erreicht hat. Ist er darunter gesunken, geht das Wiedererlernen
//   bis zu diesem Höchststand doppelt so schnell.
// Biologischer Hintergrund: Ebbinghaus-Ersparnis — Vergessenes wird
//   schneller wiedergelernt (GDD-08 Abschnitt 18.1).
//
// Vorschlag Claude (offen): Ein Skill fällt höchstens auf 0 XP. Er bleibt
//   dabei entdeckt — der Blob weiß noch, dass es ihn gibt, und lernt ihn
//   mit doppeltem Tempo zurück.
// -----------------------------------------------------------

/** Erfahrungs-Multiplikator unterhalb des Höchststands. Vorgabe (Entwickler) */
export const RELEARN_MULTIPLIER = 2;

// -----------------------------------------------------------
// 6. ÜBERTRAINING UND RUHE
//
// Vorgabe (Entwickler): Wird ein Skill sehr viel trainiert, ist er
//   irgendwann übertrainiert: Jedes weitere Training bringt sofort immer
//   weniger Fortschritt. Der Effekt klingt über die Zeit ab, ausdrücklich
//   auch offline. Der zurückgehaltene Fortschritt geht nicht verloren: Er
//   kommt in der Ruhephase Stück für Stück dazu und wird auf dem
//   Erfahrungsbalken als andersfarbiger Abschnitt angezeigt.
// Begründung (Entwickler): Spieler werden so vom zu vielen Spielen
//   gehemmt und für Pausen belohnt. Außerdem ahmt es echtes Training nach:
//   Nach viel Training braucht der Körper — geistig wie körperlich — eine
//   Ruhephase. In ihr wird das Gelernte zusätzlich verarbeitet und ist
//   danach umso besser abrufbar.
//
// Umsetzung (Vorschlag Claude, offen):
//   - Jeder Skill hat eine Ermüdung (in XP). Jede gewonnene Erfahrung
//     erhöht sie um denselben Betrag.
//   - Sofortanteil = min(1, Schwelle / Ermüdung).
//     Unter der Schwelle wirkt alles sofort. Bei doppelter Schwelle die
//     Hälfte, bei dreifacher ein Drittel. Der Rest wird „ausstehende
//     Erfahrung“.
//   - Schwelle = learningEffort × OVERTRAINING_THRESHOLD_FACTOR.
//     Aufwendige Skills vertragen mehr Training am Stück.
//   - Ruhe: Ermüdung und ausstehende Erfahrung halbieren sich je
//     RECOVERY_HALF_LIFE_MS Echtzeit. Was von der ausstehenden Erfahrung
//     abschmilzt, wird dem Skill gutgeschrieben.
//   - Ruhe für einen Skill beginnt erst REST_DELAY_MS nach seiner letzten
//     Übung — solange man ihn gerade trainiert, kommt nichts nach.
//   - Abwägung „Verlust oder nur Aufschub?“: Hier geht nichts verloren, die
//     Erfahrung kommt nur später. Die Hemmung liegt darin, dass sie beim
//     Weiterspielen nicht sofort wirkt. Wer eine Pause macht, bekommt sie
//     vollständig. Eine verstellte Uhr bringt nur Zeit, keine Extra-XP.
//   - Unterschied zur Überdehnung (Abschnitt 4): Überdehnung schmilzt nur
//     in Spielzeit, Ermüdung in Echtzeit. Beide Regeln zusammen sorgen
//     dafür, dass Pausen nie bestrafen, sondern nur belohnen.
// -----------------------------------------------------------

/** Ermüdungs-Schwelle = learningEffort × dieser Faktor (Biss: 360 XP ≈ 50 Treffer). VORLÄUFIG */
export const OVERTRAINING_THRESHOLD_FACTOR = 30;

/** Halbwertszeit der Erholung in Echtzeit (3 h: nach einer Nacht ≈ 85 % erholt). VORLÄUFIG */
export const RECOVERY_HALF_LIFE_MS = 3 * 3600 * 1000;

/** Erholung eines Skills beginnt erst so lange nach seiner letzten Übung. VORLÄUFIG */
export const REST_DELAY_MS = 2 * 60 * 1000;

// ------------------------------------------------------------
// Zuletzt geändert: 2026-10-31 — Rangnamen: Biologie-Reihe aktiv,
// Handwerk-Reihe als Alternative daneben
// Davor: 2026-10-30 — Erstfassung: Erfahrung statt Level, Ränge,
// Kapazität, Überdehnung, Wiedererlernen, Übertraining
// ------------------------------------------------------------
