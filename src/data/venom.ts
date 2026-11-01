// ============================================================
// VENOM — Giftlast, stufenloser Abbau, Ende
// Absorb & Evolve
//
// DIESE DATEI IST DIE EINZIGE QUELLE FÜR alle Stellschrauben des Gifts.
// Die Rechenregeln dazu stehen in src/systems/VenomSystem.ts (gleiche
// Abschnittsnummern). Herleitung: GDD-05 Abschnitt 12.
//
// Kennzeichnung der Herkunft (CLAUDE.md, Begründungspflicht):
//   Vorgabe (Entwickler)                — von Jörn entschieden
//   Begründung (Entwickler)             — Jörns eigene Begründung
//   Begründung (Vorschlag Claude, übernommen) — von Jörn angenommen
//   VORLÄUFIG                           — Zahlenwert ist ein Platzhalter,
//                                          noch nicht abgestimmt
//
// Grundprinzip in einem Satz:
//   Jeder Giftbiss legt eine Dosis auf die Giftlast des Ziels; der Körper
//   baut die Last stufenlos mit einer Halbwertszeit ab, und genau dieser
//   Abbau ist der Giftschaden.
//
// Vorgabe (Entwickler): Gift stapelt („gestapeltes Gift“). Begründung aus
//   der Natur, wie Jörn sie verlangt hat, in den Abschnitten unten.
// Vorgabe (Entwickler): Das ganze Gift-Feature steckt isoliert in einem
//   eigenen Modul (diese Datei + VenomSystem.ts).
// ============================================================

// -----------------------------------------------------------
// 1. DOSIS JE BISS
//
// Die Dosis steht je Skill in skills.ts (Effekt "inject_venom",
// Feld venomDose); die Bisschance im selben Effekt (formula). Hier steht
// nur, warum es so ist.
//
// Begründung (Vorschlag Claude, übernommen):
//   - Gift ist eine Substanz. Zwei Bisse bringen doppelt so viel Gift in
//     den Körper — nicht „dasselbe Gift noch einmal von vorn“.
//   - Dosis bei Natur = Gesamtschaden des früheren 4-s-Gifts bei Natur
//     (Schaden je Tick × 4): Venom 26 HP, Stachelstich 30 HP. Wie jeder
//     Skill-Wert läuft die Dosis vom Startwert 1 HP zum Höchstwert
//     (progression.ts Abschnitt 1, Werte in skills.ts).
//     [VERWORFEN, 1. Nov. 2026] 8 HP bei u = 1, 12 HP bei u = 3, 36 HP bei u = 15.
//   - Die Bisschance bleibt: Auch Giftschlangen beißen oft „trocken“,
//     ohne Gift abzugeben.
//
// Wer Gift einspritzt:
//   - Passiver Skill (Venom): bei jedem Nahkampftreffer.
//   - Aktiver Skill (Stachelstich): nur, wenn genau dieser Skill getroffen
//     hat. Vorgabe (Entwickler): Das Skorpiongift wirkt nur beim Stachel,
//     nicht bei den Scheren.
//     Begründung (Vorschlag Claude): Das Gift sitzt in der Giftblase am
//     Stachel — die Scheren haben keine Giftdrüsen.
//   - Vorgabe (Entwickler): Das Skorpiongift ist relativ stark, stärker als
//     das der Spinnen. Werte und Begründung beim Skill venom_sting in
//     skills.ts.
//   - Die Körpergröße steckt schon in den HP: Giftigkeit hängt an der Dosis
//     pro Körpermasse (LD50 in mg/kg). 12 HP töten eine Ameise mit 8 HP und
//     kosten einen Drachen mit 500 HP nur 2,4 %. Keine eigene Größenregel.
// -----------------------------------------------------------

// -----------------------------------------------------------
// 2. GIFTLAST (Stapeln)
//
// Jedes Ziel hat genau eine Giftlast (milli-HP). Jede Dosis wird addiert.
//
// Begründung (Vorschlag Claude, übernommen):
//   - Stapeln erzeugt keinen Extra-Schaden: Jede Dosis richtet genau ihren
//     Betrag an, die Dosen addieren sich nur. Drei Giftspinnen machen
//     dreimal so viel Giftschaden wie eine — Schwärme bleiben gefährlich
//     (TODO Schwärme, Weg 3).
//   - Ersetzt das alte Auffrischen eines 4-s-Effekts. Damit entfallen die
//     zwei Fehler von damals: Auffrischen setzte den Tick-Takt zurück, und
//     schwächeres Gift überschrieb stärkeres.
//   - Eine Last für alles Gift: Es gibt bisher nur einen Gift-Skill.
//     Mehrere Giftarten mit eigener Last (Cocktails) sind offen.
// -----------------------------------------------------------

// -----------------------------------------------------------
// 3. ABBAU MIT HALBWERTSZEIT (stufenlos)
//
//     L(t) = L₀ · 2^(−t / T)        Schadensrate = λ · L,  λ = ln 2 / T
//
// Vorgabe (Entwickler): Der Abbau läuft stufenlos — in jedem Frame wird der
//   fällige Anteil abgezogen, keine Ticks. Das Tempo entspricht einer
//   Halbwertszeit von 2 Sekunden.
//
// Begründung (Vorschlag Claude, übernommen):
//   - Ein Körper baut Fremdstoffe meist proportional zur Menge ab — daher
//     eine feste Halbwertszeit (Standardregel der Pharmakologie). Viele
//     Toxine werden zudem verbraucht, indem sie sich an Gewebe binden: Gift
//     wirkt, indem es aufgebraucht wird. Abbau = Schaden.
//   - Viel Gift wirkt schnell, wenig Gift langsam. Im Dauerzustand macht
//     das Gift pro Sekunde so viel Schaden, wie pro Sekunde hineinkommt.
//   - Die Rechnung ist exakt und hängt nicht von der Bildrate ab: Nach 2 s
//     ist immer genau die Hälfte weg, egal ob 30 oder 144 fps.
// -----------------------------------------------------------

/** Halbwertszeit der Giftlast in ms. Vorgabe (Entwickler): 2 s. VORLÄUFIG */
export const VENOM_HALF_LIFE_MS = 2_000;

// -----------------------------------------------------------
// 4. ENDE: MINDESTRATE
//
//     Rate = max(λ · L, VENOM_MIN_RATE)   bis L = 0
//
// Eine reine Halbwertszeit wird nie fertig (½, ¼, ⅛ … bleibt immer übrig).
// Deshalb fließt der Rest mit einer Mindestrate ab: Solange mehr als
// VENOM_MIN_RATE / λ (≈ 2,9 HP) übrig ist, gilt die Halbwertszeit,
// darunter fließt der Rest gleichmäßig ab und endet exakt bei 0.
//
//     Dauer bis leer = T · log₂(L₀ / 2,9 HP) + 2,9 s
//     8 HP → 5,8 s · 12 HP → 7,0 s · 36 HP → 10,2 s · 100 HP → 13,1 s
//
// Begründung (Vorschlag Claude, übernommen):
//   - Jede Dosis macht genau ihren vollen Schaden, und das Ende ist
//     eindeutig — die Anzeige der Giftlast zählt sauber auf 0 herunter.
//   - Ehrlich: Das ist vor allem eine Spielregel für ein klares Ende. Aus
//     der Natur lässt sie sich nur schwach begründen (bereits gebundenes
//     Toxin wirkt noch zu Ende). Die natürlichere Alternative — Wirkschwelle:
//     unter ~1 HP baut der Körper den Rest ohne Schaden ab — endet fast
//     gleich, verliert aber bis zu 1 HP je Vergiftung.
// -----------------------------------------------------------

/** Mindest-Abbaurate in HP pro Sekunde am Ende einer Vergiftung. VORLÄUFIG */
export const VENOM_MIN_RATE_HP_PER_S = 1;

// -----------------------------------------------------------
// 5. ERFAHRUNG UND ANZEIGE
//
// Vorgabe (Entwickler): Die Venom-Erfahrung wird stufenlos mitgerechnet.
//   → XP = Giftschaden, den die Giftlast eines Gegners tatsächlich
//     anrichtet (nur echte HP, kein Überschuss über den Tod hinaus).
//     Die Last merkt sich, welcher Skill wie viel beigetragen hat; der
//     Schaden wird anteilig aufgeteilt — Venom und Stachelstich bekommen
//     jeweils ihre eigene XP.
//     Gegner vergiften nur den Blob, Gegner untereinander nicht — jede
//     Giftlast auf einem Gegner stammt also vom Blob.
// Vorgabe (Entwickler): Die Schadenszahl erscheint einmal beim Einspritzen
//   (= die Dosis), nicht pro Tick oder Sekunde.
// Begründung (Vorschlag Claude, übernommen): Die HP-Leiste zeigt die
//   Giftlast als violetten Abschnitt — so viele HP wird das Gift noch
//   kosten. Gleiches Prinzip wie der Abschnitt „in Ruhe“ beim Übertraining.
// -----------------------------------------------------------

// Stand: 1. November 2026 (Dosis nach dem allgemeinen Schema start → max)
// Davor: 31. Oktober 2026 (Stachelstich ergänzt)
