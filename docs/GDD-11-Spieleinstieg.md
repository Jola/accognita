# Absorb & Evolve — Game Design Document
## Datei 11: Spieleinstieg — Grundmechaniken lernen, entdecken, verstehen

> Status: Konzept (15. November 2026) — wartet auf Entscheidungen des Entwicklers (Abschnitt 9). Umgesetzt ist bisher nur der Anfang: Skill-Vorstellung, Anzeige unter dem Blob, Karte „Auf Reisen“ (v0.8.6, GDD-02 Abschnitt 6, GDD-10 Abschnitt 8.4).

**Der Kern in einem Satz:** Das Spiel erklärt nur, was man zum Weiterkommen verstehen muss, und gibt Anstöße, was man ausprobieren könnte. Ein Anstoß ist eine einfache Frage, etwa „Warum probierst du es nicht mal aus?“. Wer fragt, bleibt offen. ~~Diese Anstöße kommen aus dem Blob selbst: aus seinem Gespür für die Welt.~~ [VERWORFEN, 15. November 2026] Vorgabe Entwickler: Fragen, nicht „etwas in dir“ (Abschnitt 3). ~~Diese Anstöße kommen aus der Geschichte des Blobs: Er erinnert sich, was er früher konnte.~~ [VERWORFEN, 15. November 2026] Vorgabe Entwickler: kein Erwachen aus der Trockenstarre (Abschnitt 3).

**Kennzeichnung:** Was nicht als *Vorgabe (Entwickler)* markiert ist, ist **Vorschlag Claude (offen)**. Alle Zeiten und Zahlen sind VORLÄUFIG.

---

## Inhalt

1. Vorgaben des Entwicklers
2. Grundsätze
3. Die Erzählung: Neugier und einfache Fragen
4. Drei Arten von Hilfe
5. Ablauf der ersten Spielstunde
6. Was bewusst nicht erklärt wird
7. Darstellung (Hochkant und Querformat)
8. Technik
9. Offene Fragen an den Entwickler

---

## 1. Vorgaben des Entwicklers

**Vorgabe (Entwickler, 15. November 2026):**
- Der Spieler soll am Anfang die Grundmechaniken erlernen und verstehen können.
- Dazu darf es ruhig etwas Ausprobieren und Entdecken brauchen. Nicht alles wird erklärt; der Spieler soll Dinge selbst entdecken können.
- Es darf aber nicht frustrierend sein, wenn er nichts versteht. Deshalb werden die Grundmechaniken erklärt, und es gibt Hinweise, was der Spieler einmal ausprobieren könnte.
- Das Ganze ist logisch in eine Art Geschichte eingebettet: Eine Aufforderung wie „Hey, versuch dich doch mal niederzulassen“ kommt nicht einfach aus dem Nichts.
- Die Tätigkeit wird so balanciert, dass es am Anfang nicht langweilig wird. Weil man am Anfang noch alles verstehen muss, darf es auch nicht zu schnell gehen, solange man etwas dazugewinnt.
- Neue Skills werden ausführlich und nacheinander vorgestellt (umgesetzt v0.8.6, GDD-02 Abschnitt 6).
- Alle Bildschirme sollen auch im Querformat gut aussehen.
- Der Blob erwacht einfach, wie bisher. Er erwacht nicht aus der Trockenstarre. Das Warum bleibt für den Anfang ein Mysterium (Abschnitt 3).

**Begründung (Entwickler):** Am Anfang muss man noch alles verstehen. Der Spieler soll genug Zeit haben, sich Neues anzuschauen und zu verstehen.

---

## 2. Grundsätze

1. **Erst tun lassen, dann erklären.** Eine Erklärung kommt, wenn der Spieler etwas gerade erlebt hat oder gleich braucht, nicht vorher. Beispiel: Was „niedergelassen“ bedeutet, steht da, nachdem man sich zum ersten Mal niedergelassen hat.
2. **Jeder Anstoß hat einen Anlass in der Spielwelt.** Der Blob bemerkt etwas: einen feuchten, schattigen Ort, Erschöpfung, einen Teil von sich selbst. Daraus folgt der Anstoß.
3. **Ein Anstoß nach dem anderen.** Höchstens ein offener Anstoß zugleich. Was nicht dringend ist, wartet.
4. **Hilfe wird deutlicher, wenn man feststeckt** (Abschnitt 4.2). Erst eine Andeutung, dann ein konkreter Satz, zuletzt ein leuchtender Knopf.
5. **Entdeckungen belohnen, nicht verraten.** Was man selbst herausfindet, wird danach festgehalten („Du hast entdeckt: …“), aber nie vorher angekündigt.
6. **Nichts geht verloren.** Jede Erklärung kann man später nachlesen (Abschnitt 7.3).

**Begründung (Vorschlag Claude, offen):** So bleibt Raum für Entdeckungen (Vorgabe 1), aber niemand steckt lange fest (Vorgabe 3). Erklärungen nach dem Erleben bleiben besser hängen als Textwände vorher.

---

## 3. Die Erzählung: Neugier und einfache Fragen

**Vorgabe (Entwickler, 15. November 2026):** Das Erwachen geschieht nicht aus der Trockenstarre. Es reicht wie bisher, dass der Blob erwacht. Das Warum bleibt für den Anfang ein Mysterium.

**Vorgabe (Entwickler, 15. November 2026):** Die Anfänge mit dem Elfen und der Quelle (GDD-01 Abschnitt 9) bleiben auf jeden Fall als Idee erhalten. Sie sind nicht verworfen; die Entscheidung ist vertagt.

**Begründung (Entwickler):** Es gibt noch keine Gesamtstory, die überzeugt. Das Mysterium passt ohnehin zum Entdecken.

**Vorgabe (Entwickler, 15. November 2026):**
- Der Antrieb des Blobs ist ein Gefühl, eine Ahnung oder Neugier.
- Keine Formulierung „etwas in dir“.
- Ein Anstoß ist einfach eine Frage, z. B. „Warum probierst du es nicht mal aus?“
- Wer fragt, muss nicht geklärt werden. Im Zweifel ist es einfach die Spielführung.

**Begründung (Entwickler):** Eine Frage reicht.

**Vorschlag Claude (offen): so ist ein Anstoß gebaut**
- **Stufe 1 (Andeutung):** Was der Blob gerade wahrnimmt, in wenigen Worten, dann eine Frage. Ohne Spielbegriffe: „Feucht, schattig, Nahrung ringsum. Warum lässt du dich hier nicht nieder?“
- **Stufe 2 (konkret):** Der Satz in Spielbegriffen: „Tippe auf 🌱 Niederlassen.“
- Zweite Person, kurz, höchstens zwei Sätze. Kein Sprecher, keine Vorgeschichte.

**Begründung (Vorschlag Claude, offen):** Die Wahrnehmung ist der Anlass in der Welt (Vorgabe in Abschnitt 1: Der Anstoß kommt nicht aus dem Nichts). Die Frage lässt dem Spieler die Wahl: Er kann es ausprobieren, muss aber nicht. Das passt zu Neugier als Antrieb.

**Beispiel: der Ton**
> *Du erwachst. Du siehst nichts. Da liegt etwas neben dir — lebendig, warm. Was es wohl ist?*
> → Wähle eine Tätigkeit: 🔍 Analysieren oder 💥 Absorbieren.

**[VERWORFEN, 15. November 2026] Das Gespür des Blobs.** Grund: Vorgabe Entwickler oben (Fragen statt „etwas in dir“, Sprecher bleibt offen). Der frühere Vorschlag:

> **Vorschlag Claude (offen):** Die Stimme der Hinweise ist das **Gespür** des Blobs: ein Drang, ein Instinkt, kein Wissen aus einem früheren Leben. Der Blob weiß nicht, woher er es weiß. Er spürt nur, was sich richtig anfühlt.
>
> - Kurz, sinnlich, in der zweiten Person, ohne Spielbegriffe: „Feuchtigkeit. Schatten. Nahrung ringsum. Etwas in dir will hierbleiben.“
> - Danach folgt, klar abgesetzt, der konkrete Satz in Spielbegriffen: „Probier es aus: Tippe auf 🌱 Niederlassen.“
> - Das Gespür wird mit der Zeit deutlicher, so wie der Blob mehr kann: anfangs nur ein Ziehen, später klare Eindrücke.
> - Es erklärt nichts über Herkunft oder Sinn. So bleibt das Warum offen (Vorgabe).
>
> **Begründung (Vorschlag Claude, offen):**
> - Echter Schleimpilz (GDD-01 Abschnitt 2): Er findet ohne Gehirn den kürzesten Weg zur Nahrung. Ein Gespür ohne Wissen passt dazu.
> - Der Anstoß kommt aus dem Blob selbst, nicht von einer fremden Stimme. Damit hat er einen Grund, ohne dass eine Vorgeschichte nötig ist.
> - Das Mysterium bleibt unberührt: Ob später eine magische Quelle, ein sterbender Elf (GDD-01 Abschnitt 9) oder etwas anderes dahintersteckt, kann das Spiel dann noch erzählen. Das Gespür widerspricht keiner der Möglichkeiten.
>
> **Beispiel: der Ton**
> > *Du erwachst. Du siehst nichts. Etwas liegt neben dir — lebendig, warm.*
> > *Etwas in dir will es ertasten.*
> > → Wähle eine Tätigkeit: 🔍 Analysieren oder 💥 Absorbieren.

**[VERWORFEN, 15. November 2026] Erinnerungen aus der Trockenstarre.** Grund: Vorgabe Entwickler oben (kein Erwachen aus der Trockenstarre, das Warum bleibt ein Mysterium). Der frühere Vorschlag:

> **Vorschlag Claude (offen):** Der Blob erwacht aus der Trockenstarre (so beginnt das Spiel schon heute). Er war früher schon einmal lebendig und groß, hat aber alles vergessen. Wenn er etwas wiederentdeckt, **regt sich eine Erinnerung**. Die Erinnerungen sind die Stimme der Hinweise.
>
> - Sie sprechen in der zweiten Person, kurz, sinnlich, ohne Spielbegriffe: „Feuchtigkeit. Schatten. Ein Ort wie dieser … früher hast du dich an solchen Orten festgesetzt.“
> - Danach folgt, klar abgesetzt, der konkrete Satz in Spielbegriffen: „Probier es aus: Tippe auf 🌱 Niederlassen.“
> - Die Erinnerungen werden mit der Zeit klarer, so wie der Blob wieder mehr kann: anfangs nur Gefühle, später ganze Bilder.
>
> **Begründung (Vorschlag Claude, offen):**
> - Echter Schleimpilz (GDD-01 Abschnitt 2): Er trocknet bei Gefahr aus, überdauert und gilt als biologisch unsterblich. Ein Blob, der schon einmal gelebt hat, passt dazu.
> - Die Erinnerungen erklären, warum der Blob weiß, was er ausprobieren könnte. Der Anstoß kommt aus ihm selbst, nicht von einer fremden Stimme.
> - Das passt zu **beiden Ursprüngen** aus GDD-01 Abschnitt 9: Bei der magischen Quelle (Option A) ist es die Magie, die Erinnerungen weckt. Beim sterbenden Elfen (Option B) mischen sich später **fremde** Erinnerungen dazu: Bilder eines Waldes in Flammen, eine Botschaft, die nie ankam. So beginnt die große Geschichte, ohne dass der Einstieg davon abhängt.
> - Die Entscheidung zwischen Option A und B bleibt offen (Abschnitt 9, Frage 2).
>
> **Beispiel: der Ton**
> > *Du erwachst. Trocken. Starr. Etwas liegt neben dir — lebendig, warm.*
> > *Eine Erinnerung, ganz fern: Du hast so etwas schon einmal getan. Ertastet. Verstanden.*
> > → Wähle eine Tätigkeit: 🔍 Analysieren oder 💥 Absorbieren.

---

## 4. Drei Arten von Hilfe

### 4.1 Die Arten

| Art | Wann | Wie | Beispiel |
|---|---|---|---|
| **Erklärung** | Grundmechanik, gerade erlebt oder sofort nötig | Karte, das Spiel hält an (wie die Skill-Vorstellung) | „Niedergelassen“ nach dem ersten Niederlassen |
| **Anstoß** | Etwas, das man ausprobieren könnte | Frage im Hinweisfeld oben, das Spiel läuft weiter ~~(Erinnerung, Gespür)~~ | „Feucht, schattig … Warum lässt du dich hier nicht nieder?“ → Niederlassen |
| **Entdeckung** | Etwas, das man selbst herausgefunden hat | Kurze Zeile „Du hast entdeckt: …“, danach im Gedächtnis nachlesbar | Gras gibt Fasern; Absorbieren lässt Wesen verschwinden |

### 4.2 Deutlicher werden, wenn man feststeckt

Jeder Anstoß hat bis zu drei Stufen. Sobald der Spieler das Verlangte tut, ist der Anstoß erledigt und verschwindet.
1. **Andeutung** (sofort): Wahrnehmung und Frage ~~(die Erinnerung, das Gespür)~~.
2. **Konkret** (nach etwa 45 s Spielzeit ohne Erfolg): der Satz in Spielbegriffen dazu.
3. **Zeigen** (nach weiteren 45 s): Der passende Knopf pulsiert, bei Orten zeigt ein Pfeil dorthin.

**Begründung (Vorschlag Claude, offen):** Wer schnell versteht, sieht nur die Andeutung und entdeckt selbst. Wer feststeckt, bekommt nach anderthalb Minuten genau gezeigt, was zu tun ist. So wird keiner von beiden gelangweilt oder frustriert.

### 4.3 Wann ein Anstoß kommt

Ein Anstoß hat einen **Anlass** (etwas ist passiert oder der Blob ist an einem passenden Ort), eine **Bedingung** (er ergibt jetzt Sinn) und ein **Erledigt** (der Spieler hat es getan oder schon vorher von selbst gemacht). Hat der Spieler etwas schon von sich aus getan, kommt der Anstoß nie. Dann gibt es höchstens die Erklärung danach.

---

## 5. Ablauf der ersten Spielstunde

Je Schritt: Anlass → Anstoß (Frage → konkret) → Erklärung danach. ✅ = umgesetzt (v0.8.6), sonst Konzept.

### 5.1 Erwachen im Nest (blind)
- **Anlass:** Spielstart.
- **Anstoß:** „Da liegt etwas neben dir — lebendig, warm. Was es wohl ist?“ → Wähle eine Tätigkeit. ~~„… Etwas in dir will es ertasten.“~~ ~~„… Du hast so etwas schon einmal ertastet.“~~ [VERWORFEN, 15. November 2026] (Abschnitt 3)
- **Entdecken:** Analysieren lässt die Wesen in Ruhe, Absorbieren bringt Materialien. Das erklärt die Wahl kurz. Wie sich beide auswirken, zeigt die Anzeige unter dem Blob ✅.
- **Erklärung danach:** keine. Die Anzeige ✅ zeigt, dass etwas geschieht.

### 5.2 Die ersten Sinne ✅
- **Lichtsinn:** Karte mit „Sehen muss man ausbauen, das Sichtfeld wächst“ ✅. Frage dazu: „Licht! Wie weit du wohl sehen kannst?“ ~~Gespür: „Licht. Warm und hell — du willst mehr davon.“~~ ~~Erinnerung: „Licht. Du hattest vergessen, wie es sich anfühlt.“~~ [VERWORFEN, 15. November 2026]
- **Kriechen:** Karte mit „Das Nest bleibt, du schickst einen Teil von dir los“, Anstoß Abspalten ✅. Frage: „Was wohl dort draußen ist? Warum schickst du nicht einen Teil von dir los?“ ~~Gespür: „Dort draußen ist mehr. Etwas in dir zieht dich hinaus.“~~ ~~Erinnerung: „Früher bist du weit gekrochen, über Wurzeln und Steine.“~~ [VERWORFEN, 15. November 2026]
- **Wachsen, Photosynthese:** normale Skill-Karten ✅.

### 5.3 Erste Reise
- **Erklärung:** Karte „Auf Reisen“ nach dem ersten Abspalten ✅ (Joystick, Bewegen wird schneller, Niederlassen sichert, Besiegtwerden).
- **Anstoß „Fressen von Hand“:** Anlass: Der Reisende ist 30 s unterwegs und hat noch nichts absorbiert oder analysiert. „Riecht da nicht etwas Essbares?“ ~~„Du riechst etwas Essbares in der Nähe.“~~ → Komm einem Wesen nahe und tippe 💥 Absorb oder 🔍 Analyze.
- **Entdecken:** Absorbieren von Hand lässt das Wesen verschwinden, es wächst nach.

### 5.4 Gefahr
- **Anlass:** zum ersten Mal Schaden genommen.
- **Frage:** „Autsch! Ob sich hier wirklich alles fressen lässt?“ ~~„Schmerz. Nicht alles hier lässt sich fressen.“~~
- **Erklärung (kurz, ohne Pause, als Hinweis):** HP, fliehen, Heilen über Zeit. Die Angriffs-Skills stellen die Skill-Karten vor.
- **Entdecken:** Welche Wesen gefährlich sind (Farbe/Name, später).

### 5.5 Niederlassen
- **Anlass, eins von dreien:** (a) Der Reisende ist weit vom Nest entfernt (etwa 30 m), (b) er steht in Wald oder Sumpf an einem Ort mit vielen friedlichen Wesen, (c) seine HP sind unter der Hälfte und keine Gefahr ist in der Nähe.
- **Frage:** „Feucht, schattig, Nahrung ringsum. Warum lässt du dich hier nicht nieder?“ ~~„Feuchtigkeit. Schatten. Nahrung ringsum. Etwas in dir will hierbleiben und wachsen.“~~ ~~„… Früher hast du dich an solchen Orten festgesetzt und bist dort gewachsen.“~~ [VERWORFEN, 15. November 2026]
- **Konkret:** „Probier es aus: Tippe auf 🌱 Niederlassen.“ Dieser Schritt ist die Antwort auf den Wunsch des Entwicklers: Der Anstoß hat einen Grund in der Welt.
- **Erklärung danach (Karte):** Was niedergelassen heißt: Checkpoint, arbeitet von allein weiter, auch während du woanders bist, Tätigkeit wählen, Abspalten von hier.

### 5.6 Erheben
- **Anlass:** Der Spieler ist zum ersten Mal bei einem niedergelassenen Blob, der nicht das Nest ist, und hat dort mindestens eine Minute verbracht.
- **Frage:** „Hier kennst du schon alles. Wie wäre es mit einem neuen Ort?“ ~~„Du spürst den Drang weiterzuziehen.“~~ → Tippe auf ⬆️ Erheben.
- **Erklärung danach:** Erheben (der ganze Blob reist weiter, nichts bleibt zurück) und Abspalten (ein Teil reist, der Blob bleibt) im Vergleich.

### 5.7 Vertrocknen (das erste Mal besiegt)
- **Erklärung:** Der Sterbescreen gibt es schon (GDD-10 Abschnitt 9.1). Dazu einmalig: „Du vertrocknest — aber du stirbst nicht. Ein Teil von dir lebt weiter.“ ~~Erinnerung: „… Das ist dir schon einmal passiert.“ Das schlägt den Bogen zum Anfang des Spiels.~~ [VERWORFEN, 15. November 2026] Kein Erwachen aus der Trockenstarre (Abschnitt 3).
- **Anstoß danach:** „Dein vertrockneter Teil liegt noch dort draußen. Warum holst du ihn nicht zurück?“ ~~„Irgendwo dort draußen liegt ein Teil von dir, trocken und starr.“~~ → Auf der Karte siehst du ihn; berührst du ihn, verschmelzt ihr.

### 5.8 Verschmelzen
- **Anlass:** Der Reisende berührt zum ersten Mal einen eigenen Blob.
- **Frage:** „Ein Teil von dir! Warum werdet ihr nicht wieder eins?“ ~~„Ein Teil von dir. Ihr könntet wieder eins werden.“~~ → Tippe auf 🫧 Verschmelzen.
- **Erklärung danach:** Je Skill zählt der höchste Wert, alle Ressourcen gehen zusammen.

### 5.9 Karte und Bewusstsein
- **Anlass:** Zum ersten Mal gibt es zwei niedergelassene Blobs.
- **Anstoß:** „Zwei Teile von dir, weit voneinander entfernt. Wo sie wohl gerade sind?“ ~~„Du spürst beide Teile von dir, egal wie weit sie entfernt sind.“~~ → Im Menü unter KARTE siehst du sie und kannst dein Bewusstsein wechseln.

### 5.10 Später: Kapazität, Kombinieren, Wachsen
- **Kapazität:** Erklärung, wenn sie zum ersten Mal über 80 % steigt (vorher spielt sie keine Rolle).
- **Wachsen:** Entdeckung beim ersten Größersein: „Du bist gewachsen.“
- **Kombinieren:** erst, wenn Rezepte existieren (offene Entscheidung, CLAUDE.md).

**Begründung (Vorschlag Claude, offen):** Die Reihenfolge folgt dem, was der Spieler braucht: erst Sinne, dann reisen, dann sich schützen und sichern, dann mehrere Blobs. Jede Erklärung kommt höchstens einmal. Der Spieler hat zwischen den Schritten Zeit, frei zu spielen.

---

## 6. Was bewusst nicht erklärt wird

Diese Dinge entdeckt der Spieler selbst. Das Spiel hält sie erst fest, nachdem er sie gefunden hat:
- welches Wesen welchen Skill lehrt (der INDEX zeigt es, aber kein Hinweis verrät es)
- welche Biome welche Wesen haben
- dass Absorbieren Wesen verschwinden lässt, Analysieren nicht (die Anzeige zeigt es)
- dass Pflanzenfasern zum Wachsen dienen (die Grow-Karte sagt es, aber nicht, wo es viel Gras gibt)
- Rangnamen und genaue Zahlen (für Neugierige im INDEX und im WERTE-Reiter)
- Kombinationen (später)

**Begründung (Vorschlag Claude, offen):** Das ist der Kern des Spiels (GDD-01: „Jede Interaktion ist eine potenzielle Skill-Discovery“). Wer es verrät, nimmt dem Spieler die Freude am Entdecken.

---

## 7. Darstellung (Hochkant und Querformat)

### 7.1 Formen
- **Hinweisfeld** (oben, gibt es schon für das Erwachen): Wahrnehmung und Frage kursiv, darunter der konkrete Satz normal. Blendet aus, sobald erledigt.
- **Karte** (gibt es schon für Skills, `ui/SkillIntro.ts`): für Erklärungen. Das Spiel hält an. Nacheinander, nie zwei zugleich.
- **Pulsierender Knopf / Pfeil:** Stufe 3 eines Anstoßes.
- **Entdeckt-Zeile:** wie eine Zeile der Anzeige unter dem Blob, golden, bleibt 6 s.

### 7.2 Querformat

**Vorgabe (Entwickler, 15. November 2026):** Die Bildschirme sollen auch im Querformat gut aussehen.
- **Karten:** im Querformat Kopf (Symbol, Name, Knopf) links und der Text rechts, für sich scrollbar. Der Knopf ist immer sichtbar (umgesetzt v0.8.6). Hochkant untereinander, der Knopf unten angeheftet.
- **Anzeige unter dem Blob:** im Querformat rechts neben dem Blob, weil darunter zu wenig Platz ist (umgesetzt v0.8.6).
- **Hinweisfeld:** im Querformat höchstens halb so breit wie der Bildschirm, oben mittig, damit die Knöpfe rechts frei bleiben. Höchstens drei Zeilen; längere Texte gehören auf eine Karte. (Konzept)
- **Gedächtnis-Reiter:** eine Liste, die in beiden Formaten gleich funktioniert.

### 7.3 Nachlesen: das Gedächtnis
Ein neuer Abschnitt im Menü (z. B. im INDEX oder als eigener Reiter „GEDÄCHTNIS“). Er sammelt jede gezeigte Erklärung, jede Skill-Karte und jede Entdeckung in der Reihenfolge des Erlebens. Wer etwas weggeklickt hat, kann es dort noch einmal lesen.

**Begründung (Vorschlag Claude, offen):** Karten halten das Spiel an und werden oft schnell weggeklickt. Das Gedächtnis nimmt den Druck, alles sofort lesen zu müssen. Der Name passt: Es ist das Gedächtnis des Blobs für das, was er in diesem Spiel erlebt hat. ~~Der Name passt zur Erzählung (Abschnitt 3).~~ [VERWORFEN, 15. November 2026] Die Erinnerungen aus der Trockenstarre gibt es nicht mehr.

---

## 8. Technik

- **`systems/TutorialSystem.ts`** (rein, ohne Phaser): eine Liste von Schritten mit `id`, Anlass, Bedingung, Erledigt und den Texten je Stufe. Die Funktion `nextHint(state, events)` liefert den Anstoß, der gerade dran ist. Sie löst nach und nach die festen Texte in `IntroSystem.ts` ab.
- **`data/tutorial.ts`**: alle Texte und Zeiten mit Begründungen (gibt es schon für die Skill-Karten).
- **Spielstand:** `seenIntros` (gibt es seit v9) wird zu `tutorial: { seen: string[]; done: string[]; memory: MemoryEntry[] }` erweitert. Eine Migration übernimmt die alten Einträge.
- **Anlässe** meldet die Szene als Ereignisse (Schaden genommen, Blob berührt, Biom gewechselt, abgespalten …). Das System prüft sie einmal pro Sekunde, nicht jeden Frame.
- **Einstellung „Hinweise“:** an / nur Erklärungen / aus, für Spieler, die das Spiel kennen. Dazu ein Knopf „Einführung neu starten“.

---

## 9. Offene Fragen an den Entwickler

1. **Erzählstimme:** ~~Passen die Erinnerungen aus der Trockenstarre (Abschnitt 3)? Oder lieber eine andere Stimme, z. B. eine neutrale Erzählerin oder von Anfang an das Echo des Elfen?~~ Entschieden (Vorgabe Entwickler, 15. November 2026): kein Erwachen aus der Trockenstarre, das Warum bleibt ein Mysterium. ~~Neu: Passt das **Gespür** des Blobs als Stimme der Hinweise (Abschnitt 3)?~~ Entschieden (Vorgabe Entwickler): Neugier als Antrieb, Anstöße als einfache Fragen, Sprecher bleibt offen.
2. **Ursprung:** ~~Option A (magische Quelle) oder Option B (sterbender Elf) aus GDD-01 Abschnitt 9? Für den Einstieg reicht die Entscheidung später, für die fremden Erinnerungen nicht.~~ Für den Anfang nicht nötig: Das Warum bleibt ein Mysterium (Vorgabe Entwickler, 15. November 2026). Ob und wann es später aufgelöst wird, bleibt offen. Elf und Quelle bleiben als Idee erhalten, die Entscheidung ist vertagt (Vorgabe Entwickler).
3. **Deutlicher werden:** Passen drei Stufen mit je etwa 45 s (Abschnitt 4.2)?
4. **Anlässe fürs Niederlassen (5.5):** weit vom Nest, guter Ort, wenig HP. Fehlt einer, oder ist einer zu viel?
5. **Gedächtnis (7.3):** eigener Reiter oder Teil des INDEX?
6. **Hinweise abschaltbar (8):** ja oder nein?
7. **Reihenfolge der Umsetzung:** Vorschlag: zuerst TutorialSystem mit 5.3 bis 5.5 (Fressen von Hand, Gefahr, Niederlassen), dann Gedächtnis, dann 5.6 bis 5.9.

---

*Letzte Aktualisierung: 15. November 2026 — Neugier als Antrieb, Anstöße als einfache Fragen ohne Sprecher, nicht „etwas in dir“; Elf und Quelle bleiben als Idee (Vorgaben Entwickler); Beispieltexte als Fragen neu (Vorschlag); davor 15. November 2026 — kein Erwachen aus der Trockenstarre, das Warum bleibt ein Mysterium (Vorgabe Entwickler); Hinweise als Gespür statt Erinnerungen (Vorschlag), Fragen 1 und 2 beantwortet; davor 15. November 2026 — Erstfassung (Konzept) auf Wunsch des Entwicklers: Grundmechaniken lernen, entdecken lassen, nicht frustrieren, in die Geschichte eingebettet, Querformat*
