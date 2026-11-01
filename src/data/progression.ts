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
//   Ein Skill hat nur Erfahrung (XP). Daraus folgt fließend sein
//   Fortschritt (0–100 %), und jeder Wert läuft mit dem Fortschritt vom
//   Startwert zum Höchstwert. Ränge sind nur Beschriftungen. Die Summe aller Erfahrung ist durch die
//   Kapazität des Blobs begrenzt — Neues verdrängt das am längsten nicht
//   Geübte.
//
// Vorgabe (Entwickler): Keine Level mehr — weder für Skills noch für den
//   Charakter. Jeder Skill sammelt nur Erfahrung.
// Begründung (Entwickler): Level wirken wie eine unnatürliche Einheit.
// ============================================================

// -----------------------------------------------------------
// 1. ERFAHRUNG → FORTSCHRITT (fließende Wirkung)
//
// Vorgabe (Entwickler): Die Werte eines Skills hängen direkt an seiner
//   Erfahrung, nicht am Rang. Sie verbessern sich fließend in sehr kleinen
//   Schritten statt in Level-Sprüngen.
//
// Vorgabe (Entwickler, 1. November 2026): Alle Skills folgen einem
//   gemeinsamen Schema: Jeder Wert nähert sich einem Höchstwert an und ist
//   bei 0 XP sehr niedrig (z. B. 1 Schaden). Der Wert bei Rang Natur (90 %)
//   ist der bisherige Natur-Wert.
// Begründung (Entwickler): Es braucht ein verständliches und allgemeines
//   Schema der Skillentwicklung, um es managen zu können.
//
// Umsetzung (Vorschlag Claude, übernommen) — zwei Schritte:
//
//   a) Erfahrung → Fortschritt p (0 … 1, erreicht 1 nie):
//        p(xp) = 1 − 0,1 ^ (xp / NaturXP)        NaturXP = learningEffort × NATUR_XP_PER_EFFORT
//        xp(p) = NaturXP × log₁₀(1 / (1 − p))
//      NaturXP bringt einen Skill auf 90 %, doppelt so viel auf 99 %,
//      dreimal so viel auf 99,9 %. Gleich viel Erfahrung schließt immer
//      denselben Anteil der restlichen Lücke — wie eine Halbwertszeit.
//
//   b) Fortschritt → Wert, für JEDEN Wert jedes Skills gleich:
//        Wert = start + (max − start) × p
//      start und max stehen je Wert in skills.ts ({ start, max }).
//      Der Fortschritt in Prozent ist also zugleich der Anteil des Wegs
//      vom Startwert zum Höchstwert.
//
// Begründung (Vorschlag Claude, übernommen):
//   - Ein Maß für alles: „Routine“ heißt bei jedem Skill und jedem Wert
//     „60–80 % des Wegs zum Höchstwert“. Nichts wächst unbegrenzt.
//   - Natur: Lernen sättigt — die ersten Übungen bringen viel, Perfektion
//     kostet immer mehr (Lernkurve, Potenzgesetz der Übung).
//   - NATUR_XP_PER_EFFORT = 40,5 übernimmt die bisherige Natur-Schwelle
//     (Übungsgrad 10 = 40,5 × learningEffort XP). Wer bisher Natur hatte,
//     hat jetzt 90 % — und dort genau den bisherigen Natur-Wert.
//   [VERWORFEN, 1. November 2026] Übungsgrad u = 1 + √(xp / (0,5 × learningEffort)),
//   Formeln linear/√/log in u, teils ohne Obergrenze. Begründung damals:
//   gleiche Skala wie die Gegner-Stufen, konkave Kurve belohnt Breite.
//   Warum geändert: jeder Wert wuchs nach eigener Kurve, ohne Obergrenze —
//   nicht allgemein und schwer zu überblicken (Begründung Entwickler oben).
// -----------------------------------------------------------

/** Fortschritt bei Rang Natur (90 %). Vorgabe (Entwickler) */
export const NATUR_PROGRESS = 0.9;

/** Erfahrung bis Natur = learningEffort × dieser Faktor (Biss: 486 XP). VORLÄUFIG */
export const NATUR_XP_PER_EFFORT = 40.5;

// [VERWORFEN] PRACTICE_CURVE_EXPONENT = 2, PRACTICE_XP_FACTOR = 0.5 (Übungsgrad-Kurve)

// -----------------------------------------------------------
// 2. RÄNGE (nur Anzeige)
//
// Vorgabe (Entwickler): Die Erfahrungsskala wird in benannte Abschnitte
//   unterteilt. Namen und Anzahl dürfen noch überarbeitet werden.
// Begründung (Entwickler): Das soll dem Spieler verständlicher machen, was
//   die Erfahrung an einem Skill bedeutet.
//
// Vorgabe (Entwickler, 1. November 2026): Die Ränge liegen bei festen
//   Anteilen der erreichbaren Werte: bis 10 % Regung, bis 20 % Versuch,
//   bis 40 % Übung, bis 60 % Gewohnheit, bis 80 % Routine, bis 90 %
//   Instinkt, bis 100 % Natur.
// Begründung (Entwickler): siehe Abschnitt 1 — ein allgemeines Schema.
//
// Ränge ändern KEINEN Wert. Sie sind reine Beschriftung über dem
// stetigen Fortschritt.
//
// Beispiel Biss (learningEffort 12, NaturXP 486) — XP ab Rangbeginn:
//   0 · 22 · 47 · 108 · 193 · 340 · 486
// [VERWORFEN, 1. November 2026] Grenzen als Übungsgrad 1 · 2 · 3 · 4,5 ·
//   6 · 8 · 10 (Biss: 0 · 6 · 24 · 74 · 150 · 294 · 486 XP).
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
  /** Fortschritt (0–1), ab dem der Rang gilt */
  fromProgress: number;
}

export const SKILL_RANKS: readonly SkillRank[] = [
  // Biologie (aktiv)                       // Handwerk (Alternative)
  { name: "Regung",     fromProgress: 0 },    // { name: "Neuling",  fromProgress: 0 },
  { name: "Versuch",    fromProgress: 0.1 },  // { name: "Anfänger", fromProgress: 0.1 },
  { name: "Übung",      fromProgress: 0.2 },  // { name: "Lehrling", fromProgress: 0.2 },
  { name: "Gewohnheit", fromProgress: 0.4 },  // { name: "Geselle",  fromProgress: 0.4 },
  { name: "Routine",    fromProgress: 0.6 },  // { name: "Könner",   fromProgress: 0.6 },
  { name: "Instinkt",   fromProgress: 0.8 },  // { name: "Experte",  fromProgress: 0.8 },
  { name: "Natur",      fromProgress: 0.9 },  // { name: "Meister",  fromProgress: 0.9 },
];

// -----------------------------------------------------------
// 2b. VERGLEICHSSTUFE (Fortschritt ↔ Wesen-Stufe)
//
// Manche Regeln vergleichen einen Skill mit der Stufe eines Wesens
// (entities.ts, level 1–20): Erfolgschance von Analyze/Absorb, wie viel
// XP ein Gegner bringt, Kippen der Treffer-Stufen. Dafür wird der
// Fortschritt auf dieselbe Skala gelegt:
//
//     Vergleichsstufe = 1 + (LEVEL_AT_NATUR − 1) × p / NATUR_PROGRESS
//                     = 1 + 10 × p
//
//   0 % → 1 · Versuch 2 · Übung 3 · Gewohnheit 5 · Routine 7 ·
//   Instinkt 9 · Natur 10 · Grenze 11
//
// Begründung (Vorschlag Claude, offen — bitte bestätigen):
//   - Natur = Stufe 10 wie beim alten Übungsgrad. Alle Vergleiche mit den
//     Wesen-Stufen (Ameise 1 … Schlange 10 … Drache 20) verhalten sich
//     also wie bisher: Absorb auf Natur fängt Schlangen sicher, Drachen zu
//     50 %.
//   - Die Stufe ist nur eine Rechengröße für diese Vergleiche, keine
//     Anzeige und kein Level.
// -----------------------------------------------------------

/** Vergleichsstufe bei Rang Natur (= alter Übungsgrad 10). VORLÄUFIG */
export const LEVEL_AT_NATUR = 10;

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
// Vorgabe (Entwickler, 1. November 2026): Die Kapazität reicht genau, um
//   alle entdeckten Skills bis 90 % (Natur) zu entwickeln. Alles darüber
//   hinaus verdrängt andere Skills.
// Begründung (Entwickler): ein verständliches, allgemeines Schema
//   (Abschnitt 1).
//
//   Kapazität = Σ NaturXP aller entdeckten Skills
//             = NATUR_XP_PER_EFFORT × Σ learningEffort
//
//   - Jeder neu entdeckte Skill bringt seinen eigenen Platz mit.
//   - Kern-Fähigkeiten (Analyze, Absorb) belegen keine Kapazität und
//     zählen hier auch nicht mit.
//   - 90 % → 99 % kostet bei einem Skill noch einmal seine ganze NaturXP —
//     wer einen Skill darüber treibt, verdrängt deutlich andere.
//   - Überdehnung (Abschnitt 4) gilt weiter obendrauf (Vorschlag Claude,
//     offen: bisherige Vorgabe beibehalten).
//
// [VERWORFEN, 1. November 2026] Kapazität sättigt mit der Lebenserfahrung:
//   300 + (4200 − 300) × (1 − 2^(−Lebenserfahrung / 3000)).
//   Vorgabe damals: mindestens 5 Skills auf Natur, die anderen niedriger,
//   aber nicht auf dem Minimum; Kapazität wächst mit dem Blob.
//   Warum geändert: neue Vorgabe oben (alle entdeckten Skills bis 90 %).
// [VERWORFEN, 1. November 2026] Kapazität = 200 + 150 × Wachstum — viel zu
//   klein (Lebenserfahrung 10 000 → 1050), schon wenige Skills verdrängten
//   sich gegenseitig.
//
// Wachstum des Körpers (Größe, HP, MP) — weiter Platzhalter, Vorschlag
// Claude (offen):
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

// [VERWORFEN] CAPACITY_BASE = 300, CAPACITY_MAX = 4_200, CAPACITY_HALF_XP = 3_000
// [VERWORFEN] CAPACITY_PER_GROWTH = 150 (Kapazität pro Einheit Wachstum)

/** Lebenserfahrung, bei der das Wachstum 1 erreicht (danach je Verdopplung +1). */
export const GROWTH_XP_SCALE = 200;

// -----------------------------------------------------------
// 3b. WIE VERLERNT WIRD
//
// Vorgabe (Entwickler): Wird an der Grenze weiter trainiert, verlieren die
//   Skills Erfahrung, die am längsten nicht geübt wurden (Abschnitt 3).
// Vorgabe (Entwickler, 1. November 2026): Beim Vergessen soll nicht sofort
//   eine ganze Stufe zurückgesprungen werden, sondern nur Erfahrung
//   abgezogen werden — das Vergessen wird über Erfahrungspunkte balanciert,
//   nicht über Ränge. Die nicht maximierten Skills sollen nicht auf dem
//   Minimum landen.
//
// Umsetzung (Vorschlag Claude, offen):
//   Das Verlernen wird auf ALLE Skills außer dem gerade trainierten
//   verteilt, gewichtet mit
//     Gewicht = Erfahrung × (Spielzeit seit letzter Übung + FORGET_AGE_FLOOR_SECONDS)
//   - Lange nicht Geübtes verliert am meisten (Vorgabe Abschnitt 3 bleibt).
//   - Wer viel Erfahrung hat, verliert absolut mehr, aber anteilig gleich
//     viel wie ein kleiner Skill mit demselben Alter — kleine Skills werden
//     nicht leergeräumt.
//   - Kein Skill verliert auf einen Schlag alles; ein Rangwechsel passiert
//     nur, wenn die Erfahrung tatsächlich unter die Ranggrenze sinkt.
//   [VERWORFEN, 1. November 2026] Reihum: Der am längsten nicht geübte
//   Skill verlor ALLES, bevor der nächste drankam — er fiel dabei oft
//   mehrere Ränge auf einmal bis auf 0.
// -----------------------------------------------------------

/** Mindest-„Alter“ im Gewicht, damit gerade geübte Skills nicht Gewicht 0 haben (Spielsekunden). VORLÄUFIG */
export const FORGET_AGE_FLOOR_SECONDS = 60;

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
// Zuletzt geändert: 2026-11-01 — Allgemeines Schema: Fortschritt 0–100 %,
// jeder Wert start → max, Ränge in Prozent, Kapazität = alle entdeckten
// Skills bis 90 %
// Davor: 2026-11-01 — Kapazität sättigt bei 4200 (≥ 5 Skills
// auf Natur), Verlernen verteilt statt reihum (Abschnitt 3b)
// Davor: 2026-10-31 — Rangnamen: Biologie-Reihe aktiv,
// Handwerk-Reihe als Alternative daneben
// Davor: 2026-10-30 — Erstfassung: Erfahrung statt Level, Ränge,
// Kapazität, Überdehnung, Wiedererlernen, Übertraining
// ------------------------------------------------------------
