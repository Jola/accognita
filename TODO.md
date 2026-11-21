# TODO — Absorb & Evolve

Offene Aufgaben, Bugs und Feature-Ideen. Werden hier gesammelt und bei Bedarf angegangen.

Format:
- `[BUG]` — Fehler im laufenden Spiel
- `[FEATURE]` — Neue Idee oder Erweiterung
- `[POLISH]` — Kleines Verbesserung, kein neues Feature

---

## Bugs

- `[POLISH]` **Skill-Leiste: 4 oder 5 Slots?** — GDD-02 Abschnitt 6 und GDD-04: „maximal 5 aktive Skills, Tasten 1–5“. Code und GDD-03: 4 Slots (`SkillBar.NUM_SLOTS`), keine Tastenbelegung; `activeSkillSlots` hat 5 Einträge, gespeichert werden 4.

---

## Features & Ideen

- `[FEATURE]` **Wirbeltiere platzieren** (GDD-07 Abschnitt 12): Waldmaus, Wasserspitzmaus, Zauneidechse, Igel und Mauswiesel sind gebaut, stehen aber noch nicht auf der Karte. Offen: Biome, Häufigkeit, Spawn-Dichte.

- `[FEATURE]` **Channeling für Absorb und Analyze** (Idee Entwickler, 14. November 2026, für später; GDD-02 Abschnitt 7): Beide sollen etwas Zeit in Anspruch nehmen und in dieser Zeit unterbrochen werden können.

- `[FEATURE]` **Wärmesicht** (Konzept, GDD-09 Abschnitt 4.2): von der Schlange, Lebewesen leuchten auch im Dunkeln.

- `[POLISH]` **Dunkelheit und Farbfilter im Browser prüfen** (GDD-09 Abschnitt 4): ungetestet im Browser, besonders auf älteren Handys ohne WebGL.

- `[FEATURE]` **Schwärme schwacher Gegner gefährlich halten** — heute macht ein paar Chitin-Level ganze Schwärme fast harmlos (10 Ameisen: 40 HP/s ohne Chitin, 4,3 HP/s mit Chitin 3, 1,6 HP/s mit Chitin 5). Drei Wege, einzeln oder kombiniert (GDD-08 Abschnitt 19.2):
  1. Flat-Block auf einen Anteil des Treffers begrenzen (z. B. höchstens 50–70 % eines Treffers blockbar), damit jeder Treffer etwas durchbringt.
  2. Rüstung nach `x/(x+K)` statt als feste Abzüge. Mit K = 7 blieben 10 Ameisen bei rund 16–20 HP/s.
  3. Gruppen-Effekte gezielt einbauen, z. B. stapelndes Gift — **umgesetzt** (Giftlast, GDD-05 Abschnitt 12, 31. Oktober 2026).
  Dazu prüfen: Hemolymph ab u = 4 tötet jede Ameise schon bei ihrem ersten Treffer.

- `[FEATURE]` **Gegner-Aufleveln an die Erfahrungsregeln anpassen** — `EntityLevelingSystem` skaliert HP/Schaden/Tempo pauschal ×1,25 je Bonus-Level. Das widerspricht der Vorgabe „gleicher Skill, gleiche Erfahrung, gleiche Wirkung“ (GDD-02 Abschnitt 8.6). Vorschlag: Siege geben dem Gegner Skill-Erfahrung nach denselben Regeln wie beim Blob.

- `[FEATURE]` **Idee: Körpergröße verstärkt Skills** (für später) — z. B. mit wachsender Größe prozentual mehr Stärke; eine „Synergie mit dem Körper“. GDD-02 Abschnitt 8.6.

- `[FEATURE]` **Gegner-XP an das allgemeine Schema anpassen?** — Seit v0.6 starten alle Skill-Werte bei ≈ 1 (Fortschritt 0 %). Die `skillXp` der Gegner sind unverändert, deshalb sind schwache Gegner viel schwächer geworden (Ameise Biss 7 → 1 HP — inzwischen auf 5 HP angehoben, Vorgabe Entwickler; Giftspinne 44 % auf 12 HP Gift → 8 % auf 4 HP), der Drache ist auf die Höchstwerte begrenzt (Klaue 24 → 18). Offen: Gegner-XP anheben, damit z. B. Ameisen bei Übung liegen? GDD-02 Abschnitt 8.3.

---

## Erledigt

- `[FEATURE]` **Laufen und fünf Wirbeltiere** (Auftrag Entwickler, 21. November 2026): Laufen, Nagen, Haken schlagen, Heißhunger, Schnappbiss, Schwanz abwerfen, Stachelkleid, Giftresistenz, Nackenbiss, Wendigkeit. Waldmaus mit Taktik „Zuschlagen und Abhauen“. Im INDEX sichtbar, noch nicht platziert (v0.9.6, GDD-02 Abschnitt 3.3).
- `[POLISH]` **Ungenutzte Alt-Formeln entfernt** (Auftrag Entwickler, 21. November 2026): `calcChitinDr`, `calcVenomChance`, `calcVenomDmgPerTick`, `calcHemolymphReflect`, `calcSuperstrengthMult`, `calcFireBreathDamage`, `calcBiteDamage`, `calcClawDamage` und `SkillSystem.getSkillEffectiveness`. Spiel unverändert (v0.9.5).
- `[BUG]` **Menü-Reiter im Hochformat abgeschnitten** (Meldung Entwickler, 17. November 2026): Die zentrierte Reiterleiste war etwas zu breit und schnitt SKILLS und INDEX an beiden Rändern ab. Jetzt passen alle Reiter, auf schmalen Schirmen mit weniger Innenabstand (v0.9.4).
- `[BUG]` **Facettenauge und Hauptaugen ohne Farbe** (Meldung Entwickler, 16. November 2026): Der Filter „ohne Rot“ legte Rot und Grün zu Gelbgrau zusammen, im Wald blieb kaum Farbe. Jetzt bleiben Grün und Blau, nur Rot wird dunkel (v0.9.2).
- `[FEATURE]` **Spieleinstieg 5.10** (Auftrag Entwickler, 15. November 2026): Karte „Begrenzter Platz“ ab 80 % Kapazität, Entdeckung „Du bist gewachsen“; Kombinieren entfällt ohne Konzept (v0.9.1).
- `[FEATURE]` **Spieleinstieg nach GDD-11** (Wunsch Entwickler, 15. November 2026): Anstöße als Fragen mit drei Stufen (Fressen von Hand, Gefahr, Niederlassen, Erheben, Zurückholen, Verschmelzen, Karte), Erklärungs-Karten, Entdeckungen, Reiter GEDÄCHTNIS; Spielstand v10 (v0.9.0).
- `[TEXT]` **Skill-Karte: „Wirkt von selbst“ unverständlich** (Meldung Entwickler, 15. November 2026): Einsatz (passiv/aktiv) steht jetzt in einem eigenen Abschnitt statt unter „So wird er besser“ (v0.9.0).
- `[BUG]` **Kein Pfeil zum markierten Nest** (Meldung Entwickler, 15. November 2026): Nach der Rückkehr ins Nest (Verschmelzen, Besiegtwerden, Wechseln) wurde die Markierung gelöscht. Jetzt bleibt sie; der eigene Blob lässt sich markieren; Pfeile größer und leuchtend, Beschriftung nicht mehr abgeschnitten (v0.8.9).
- `[UI]` **COMBO-Reiter ausgebaut** (Wunsch Entwickler, 15. November 2026): wird noch nicht verwendet, für Skill-Kombination gibt es noch kein Konzept; die Mechanik bleibt in `SkillSystem.ts` (v0.8.8).
- `[TEXT]` **Erster Hinweis im Nest ohne „Tätigkeit“** (Wunsch Entwickler, 15. November 2026): „Versuch mal zu analysieren oder zu absorbieren — vielleicht lernst du etwas.“ (v0.8.7).
- `[FEATURE]` **Einstieg ins Nest** (Wunsch Entwickler, 15. November 2026): eine Aktion pro Sekunde statt alle 6 s, Anzeige unter dem Blob, die je Skill und Material mitzählt statt sich zu überschreiben, neue Skills werden einzeln und ausführlich vorgestellt, mit Sehen und Bewegen und der Karte „Auf Reisen“ nach dem ersten Abspalten (v0.8.6).
- `[BUG]` **Tätigkeit scheint nichts zu tun** (Meldung Entwickler, 15. November 2026): Sie lief, zeigte aber bis zum ersten Fund nach gut einer Minute nichts. Jetzt steigt je Aktion ein Text über dem Blob auf (Erfahrung, Fortschritt zum nächsten Fund), und der Hinweis im Nest erklärt, dass Lernen dauert (v0.8.5).
- `[BUG]` **Kopfleiste „Kap. NaN%“** ohne entdeckte Skills (Start im Nest): 0/0 wird jetzt als 0 % angezeigt (v0.8.1).
- `[FEATURE]` **Blob-Formen, alle sieben Schritte** (GDD-10, 15. November 2026): Wissen verrechnen mit Höchstwert je Skill (v0.7.6), Spielstand mit mehreren Blobs (v0.7.7), Start im Nest, Niederlassen, Abspalten, Verschmelzen, Erheben, Vertrocknen mit Sterbescreen, Tätigkeit niedergelassener Blobs, feste Höchstmasse 120 kg (v0.8.0), Verteilen-Dialog beim Abspalten (v0.8.1), Adernetz mit Pulsieren und vertrocknete Kruste (v0.8.2), der nächste Blob erntet und Ertrag pro Stunde im WERTE-Reiter (v0.8.3), Karte mit Nebel, Markern und Wahl aus dem Sterbescreen (v0.8.4).

- `[POLISH]` **Balance-Werte aufgeräumt**: Was zu einem Skill gehört, steht am Skill (Sprungweite, Photosynthese-Heilung, Grow-Verdauung als Effekte; Erfahrung durch Bewegen, Sehen, Heilen, Verdauen im Feld `practice`). `balance.ts` enthält die allgemeinen Regeln und listet im Kopf, was wo steht. MP-Regeneration, KI-Werte und Gegner-Bonus-Level aus der Spiellogik dorthin geholt. `body.ts` als „nur Blob“ klargestellt. Spiel unverändert (v0.7.5, GDD-02 Abschnitt 8.8, 14. November 2026).

- `[BUG]` **Sichtkreis im Querformat verzerrt**: Fehler in Phaser 3.70. Die Bildfläche des Kamera-Farbfilters behielt die Startgröße. Fix: `GameScene.fixCameraFxSize` passt sie an, sobald sich die Spielfläche ändert (v0.7.2, 13. November 2026). Seit v0.7.3 nur beim Start und bei RESIZE (deckt auch Drehen ab) statt jeden Frame (14. November 2026). v0.7.2/v0.7.3 halfen nicht: resize() wirkt nur mit autoResize. Eigentliche Ursache: Die Zwischenflächen der Utility-Pipeline (fullFrame/halfFrame) haben nie autoResize. Fix v0.7.4: autoResize einschalten und anpassen, beim Start und bei RESIZE (14. November 2026).

- `[FEATURE]` **Grow / Wachsen**: passiv, verdaut Pflanzenfasern zu Körpermasse, das Wachstum kommt nur noch daraus. Wird von Gras gelernt, Gras gibt es doppelt so oft (GDD-02 Abschnitt 8.10, 13. November 2026).

- `[BUG]` **Photosynthesis heilt auch im Kampf**: kein Bug. Vorgabe Entwickler: Photosynthese wirkt immer. GDD und Skill-Beschreibung sind angepasst, der Code bleibt unverändert (13. November 2026).

- `[BUG]` **Superstrength verstärkte auch Feueratem**: Superstrength gibt jetzt Stärke, und nur Angriffe mit Stärke-Skalierung (Biss, Klauenhieb, Zangengriff) werden davon verstärkt. Feueratem gehört nicht dazu (GDD-02 Abschnitt 8.11, 13. November 2026).

- `[BUG]` **Unbewaffneter Angriff war nicht erreichbar** — Entscheidung Entwickler: Ohne Skill ist kein Angriff möglich, weil man so gut wie alles lernen muss. Den unbewaffneten Pfad in `playerAttack` habe ich entfernt, GDD-03 Abschnitt 3 ist angepasst (13. November 2026).

- `[BUG]` **Absorb/Analyze und Skill-Funde blieben bei 1 XP stehen** (Ameise, Marienkäfer, Gras) — `scaleXp` rundete ab; mit stetigem Übungsgrad ergab der Multiplikator gegen Stufe-1-Wesen nach dem ersten Punkt < 1, abgerundet 0. Fix: Bruchteile zählen (31. Oktober 2026).

- `[BUG]` **Skill-Leiste: Menü ging sofort wieder zu, Skill wurde ausgelöst** — auf dem Handy schiebt der Browser nach dem Tippen einen Klick nach und sucht das Ziel neu; dort lag schon das gerade geöffnete Skill-Menü (Hintergrund → Menü zu, „▶ Einsetzen“ → Skill ausgelöst). Fix: `touchend` der Slots unterdrückt den Klick, das Menü verwirft Klicks in den ersten 400 ms (31. Oktober 2026).

- `[BUG]` **Gift-Auffrischen setzte den Tick-Takt zurück** und **schwächeres Gift überschrieb stärkeres** (GDD-08 Abschnitt 12.3) — behoben durch gestapeltes Gift: Giftlast mit stufenlosem Abbau, kein Auffrischen mehr (GDD-05 Abschnitt 12, 31. Oktober 2026).

- `[BUG]` **Bonus-Level überlebte den Respawn** — `processRespawns` und das Laden setzten `bonusLevel`/`skillWins` nicht zurück, obwohl der Bonus laut GDD-03 Abschnitt 9 beim Respawn verloren geht; die HP-Leiste stand dann nicht auf voll. Fix: beide setzen den Bonus jetzt zurück (31. Oktober 2026).

- `[BUG]` **Angezeigte Absorb-/Analyze-Chance wich von der echten ab** — die Nearby-Anzeige rechnete mit Stufe + Bonus-Level, gewürfelt wird mit der Grundstufe. Fix: Anzeige rechnet wie die Logik (31. Oktober 2026).

- `[POLISH]` **HUD-Label „LVL“** trotz Kapazitätsanzeige → „KAP“ (31. Oktober 2026).

- `[BUG]` **XP-/Level-Anzeige funktioniert nicht** — `updateUI()` hat den XP-Balken nicht befüllt. Fix: `calcPlayerLevel(p.totalExp)` liefert `xpIntoLevel/xpToNext`, daraus wird der Füllstand berechnet.

- `[BUG]` **Spinnen-Icon springt beim Angriff** — Phaser-Tween und direkte Positionssetzung (`sprite.y = instance.y`) haben sich gegenseitig überschrieben. Fix: Tween entfernt, Float-Animation jetzt als `Math.sin()`-Offset in `updateEntityVisuals()` berechnet — kein Konflikt mehr.
