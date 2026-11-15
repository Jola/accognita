# Absorb & Evolve — Game Design Document
## Datei 10: Blob-Formen — Niederlassen, Abspalten, Verschmelzen, Vertrocknen

> Status: Umgesetzt (v0.7.6 bis v0.8.4, 15. November 2026) — Go des Entwicklers am 15. November 2026, alle sieben Schritte umgesetzt. Abschnitt 14 zeigt den Stand je Schritt. Offen bleiben die Punkte in Abschnitt 15 (Zahlen abstimmen, Ideen für später).
> Ersetzt das einfache Checkpoint-System (GDD-03 Abschnitt 7) und präzisiert GDD-01 Abschnitt 10.

**Der Kern in einem Satz:** Jeder Blob hat seinen eigenen Stand. Nur wenn zwei Blobs verschmelzen, kommt ihr Wissen zusammen: Je Skill zählt der höchste Wert, und alle Ressourcen gehen an den Blob, der bleibt.

**Begriffe**
- **Wissen** = die entdeckten Skills und die Erfahrung je Skill, dazu die Kern-Fähigkeiten Analyze und Absorb.
- **Ressourcen** = Materialien im Lager (z. B. Pflanzenfasern). ~~… und die Körpermasse.~~ [VERWORFEN, 14. November 2026] Die Körpermasse gehört jetzt zum Körper (Abschnitt 5, 7.1).
- **Ausgewachsen** = der Blob hat seine größte Körpermasse erreicht (Abschnitt 7.1).
- **Bewusstsein** = der Blob, den der Spieler gerade steuert.

**Kennzeichnung:** Was nicht anders markiert ist, ist **Vorschlag Claude, übernommen 15. November 2026** (Abschnitt 15, Punkt 24). Alle Zahlen sind VORLÄUFIG.

~~Was nicht ausdrücklich als *Vorgabe (Entwickler)* markiert ist, ist **Vorschlag Claude (offen)** und muss noch bestätigt werden.~~ [VERWORFEN, 15. November 2026] Alle Vorschläge sind übernommen.

---

## Inhalt

1. Überblick
2. Die drei Formen
3. Grundfähigkeiten
4. Abläufe
5. Was jeder Blob für sich hat und was geteilt wird
6. Wissen verrechnen
7. Ressourcen verteilen
8. Tätigkeit niedergelassener Blobs
9. Vertrocknen (Tod)
10. Darstellung
11. Karte und Richtungspfeile
12. Spielstart im Nest
13. Datenmodell und Speichern
14. Umsetzung in Schritten
15. Offene Punkte

---

## 1. Überblick

**Vorgabe (Entwickler, 14. November 2026):**
- Der Blob kann sich niederlassen. Ein niedergelassener Blob steht fest an einem Ort, kann aber weiter absorbieren und analysieren und so Erfahrung und Ressourcen sammeln, wie eine kleine Fabrik.
- Er ist zugleich Checkpoint und kann vorerst nicht angegriffen werden.
- Von ihm spaltet sich ein **reisender Blob** ab, mit dem man die Welt erkundet.
- Wird der reisende Blob besiegt, **vertrocknet** er an Ort und Stelle. Das Bewusstsein springt zum nächstgelegenen niedergelassenen Blob.
- Wer den vertrockneten Blob wieder aufsucht und sich mit ihm verbindet, bekommt dessen Erfahrung, Skills und Ressourcen zurück.

Dieses Verbinden mit einem vertrockneten Blob heißt jetzt **Verschmelzen** (Abschnitt 4.5, Vorgabe Entwickler, 14. November 2026).

Statt automatisch zum nächstgelegenen Blob zu springen, erscheint beim Vertrocknen ein **Sterbescreen**; dort wählt man, wo man weitermacht (Abschnitt 9, Vorgabe Entwickler, 14. November 2026).

**Begründung (Entwickler):** Das entspricht den Fähigkeiten des biologischen Vorbilds *Physarum polycephalum*. Es kann sich teilen, Teile verschmelzen wieder, und bei Gefahr trocknet es zu einer Dauerform ein, statt zu sterben.

---

## 2. Die drei Formen

**Niedergelassen**
- Bewegt sich nicht, steht an einem festen Ort.
- Absorbiert und analysiert in seiner Arbeitsreichweite und arbeitet über die Zeit allein weiter (Abschnitt 8).
- Kann vorerst nicht angegriffen werden.
- Bild: zerflossenes Adernetz, pulsiert.

**Reisend**
- Bewegt sich mit einem Bewegungs-Skill und kann alles wie bisher: Kampf, Absorb, Analyze.
- Kann angegriffen werden.
- Bild: runder Blob wie bisher.

**Vertrocknet**
- Tut nichts, ruht. Kann vorerst nicht angegriffen werden.
- Bild: braune, rissige Kruste, still.

### Feste Regeln

1. Es gibt immer mindestens einen niedergelassenen Blob: das Nest, das nie verschwindet (siehe unten).
2. Der reisende Blob existiert **genau dann, wenn** das Bewusstsein bei ihm ist. Es gibt also höchstens einen.
3. Ist das Bewusstsein nicht beim Reisenden, ist es bei einem niedergelassenen Blob, nie bei einem vertrockneten. Einzige Ausnahme: solange der Sterbescreen offen ist (9.1).
4. Vertrocknete Blobs kann es beliebig viele geben. **Vorgabe (Entwickler, 14. November 2026):** bestätigt.

**Vorgabe (Entwickler, 14. November 2026):** Zu einem anderen Blob springt man, nachdem sich der Reisende niedergelassen hat. Man bekommt dann eine Liste aller niedergelassenen Blobs, springt zu einem und kann sich von dort wieder abspalten.

**Vorgabe (Entwickler, 14. November 2026):** Das Bewusstsein wechselt nur zwischen niedergelassenen Blobs. Es kann also höchstens einen reisenden Blob geben. (Bestätigt die Regeln 2 und 3.)

**Begründung (Entwickler):** Reisende können angegriffen werden. Gäbe es mehrere, müsste das Spiel sie außerhalb der Aufmerksamkeit des Spielers berechnen.

~~**Begründung (Vorschlag Claude, offen):** Regel 2 folgt aus dieser Vorgabe. Den Reisenden verlässt man nur durch Niederlassen oder Vertrocknen. Niemand muss mehrere Figuren gleichzeitig verwalten, und kein Blob läuft unbeaufsichtigt herum.~~ [VERWORFEN, 14. November 2026] Ersetzt durch die Begründung des Entwicklers oben.

**Begründung (Vorschlag Claude, übernommen 15. November 2026):** Weil niedergelassene Blobs vorerst nicht angegriffen werden, brauchen sie keine HP und MP im Kampf. Ist man bei ihnen, gelten sie als voll. Ihre HP und MP werden nur gemerkt, damit sie beim Erheben weitergelten (Abschnitt 4.7).

### Das Nest

**Vorgabe (Entwickler, 14. November 2026):** Das Spiel startet mit einem niedergelassenen Blob, dem Nest. Das Nest kann nicht zerstört werden, bleibt immer an seiner Stelle und kann sich nicht erheben (Abschnitt 4.7).

**Begründung (Entwickler):** So ist die Unsterblichkeit des Blobs sichergestellt. Könnte man sich mit dem ersten Blob erheben und dann vertrocknen, gäbe es keinen Ort mehr, an den das Bewusstsein springen kann.

~~Begründung offen. Vorschlag Claude: Das Nest ist der feste Anker des Spiels. Zu ihm kann man immer springen, und es kann immer abspalten (Abschnitt 7.1). So sitzt niemand fest, und Regel 1 gilt von selbst.~~ [VERWORFEN, 14. November 2026] Ersetzt durch die Begründung des Entwicklers.

~~Folgen: Das Nest kann auch nicht eingezogen werden (4.4).~~ [VERWORFEN, 14. November 2026] Beim Verschmelzen geht jetzt der Reisende im niedergelassenen Blob auf, nicht umgekehrt (4.5). Das Nest bleibt also auch dabei bestehen.

Folgen: Sollten Gegner später niedergelassene Blobs angreifen können (Abschnitt 15, „Später“), bleibt das Nest davon ausgenommen.

---

## 3. Grundfähigkeiten

**Vorgabe (Entwickler):** Abspalten, Verbinden, Vertrocknen und der Wissenstransfer sind Grundfähigkeiten, die nicht erlernt werden müssen.

Verbinden gibt es inzwischen nur noch als **Verschmelzen** (Vorgabe Entwickler, 14. November 2026, Abschnitt 4.4).

**Begründung (Entwickler):** Das entspricht den Fähigkeiten des biologischen Vorbilds.

**Vorgabe (Entwickler, 14. November 2026):** Niederlassen gehört ebenfalls dazu, ist aber erst mit Bewegen verfügbar. Begründung (Vorschlag Claude, übernommen): Auch das kann das Vorbild von Natur aus.

**Begründung (Entwickler) für „erst mit Bewegen“:** Ohne Bewegen gibt es keinen reisenden Blob, also auch niemanden, der sich niederlassen könnte.

Diese Fähigkeiten sind keine Skills: keine Erfahrung, kein Rang, keine Kapazität. Sie erscheinen als Knöpfe, je nach Lage.

**Niederlassen**
- Sichtbar beim Reisenden, erst wenn ein Bewegungs-Skill bekannt ist (Vorgabe Entwickler).
- Nur wenn seit 5 s kein Gegner Aggro auf ihn hat (Vorgabe Entwickler, 14. November 2026).
- Auch wenn er nicht ausgewachsen ist; dann kann er sich danach nur erheben, nicht abspalten (Vorgabe Entwickler, 7.1).
- ~~Ausnahme: Berührt der Reisende einen niedergelassenen Blob, kann er sich unter Aggro in ihn **zurückziehen** (Verbinden und sofort Bewusstsein dort). Ob das erlaubt sein soll, ist offen (Abschnitt 15).~~ [VERWORFEN, 14. November 2026] Dieses Zurückziehen ist jetzt das Verschmelzen (4.5). Ob es unter Aggro geht, steht dort.
- Begründung (Vorschlag Claude, übernommen): Ein niedergelassener Blob ist unverwundbar. Ohne diese Sperre wäre Niederlassen ein Notausgang aus jedem Kampf.

**Abspalten**
- Sichtbar bei einem niedergelassenen Blob mit Bewusstsein.
- Nur wenn ein Bewegungs-Skill bekannt ist und der niedergelassene Blob ausgewachsen ist; das Nest immer. Kosten siehe Abschnitt 7.1.
- Begründung (Vorschlag Claude, übernommen 15. November 2026): Folgt aus der Vorgabe zum Spielstart: Mit Bewegen kommt das Reisen (Abschnitt 12).

~~**Verbinden** — sichtbar, wenn der Reisende einen niedergelassenen Blob berührt.~~ [VERWORFEN, 14. November 2026] Verbinden ist gestrichen (Vorgabe Entwickler, 4.4).

**Verschmelzen** (Vorgabe Entwickler, Abschnitt 4.5)
- Sichtbar, wenn der Reisende einen niedergelassenen oder vertrockneten Blob berührt.
- Berühren heißt: Abstand zwischen der Mitte des Reisenden und dem Kern des anderen höchstens Reichweite des Reisenden plus Kernradius.
- Grundfähigkeit, denn es ist das Verbinden aus der Vorgabe oben.

**Bewusstsein wechseln**
- Sichtbar bei einem niedergelassenen Blob mit Bewusstsein.
- Ziel ist ein anderer niedergelassener Blob (Liste bzw. Karte, Abschnitt 11).

**Erheben** (Vorgabe Entwickler, Abschnitt 4.7)
- Sichtbar bei einem niedergelassenen Blob mit Bewusstsein, **nicht beim Nest**.
- Nur wenn ein Bewegungs-Skill bekannt ist, wie beim Abspalten (Vorschlag Claude, übernommen).

---

## 4. Abläufe

- **Reisend → Niederlassen →** niedergelassen; das Bewusstsein bleibt bei ihm.
- **Niedergelassen → Abspalten →** neuer Reisender; das Bewusstsein geht auf ihn über.
- **Niedergelassen → Bewusstsein wechseln →** anderer niedergelassener Blob.
- **Niedergelassen → Erheben →** derselbe Blob wird zum Reisenden; das Bewusstsein bleibt bei ihm. Nicht beim Nest (4.7).
- ~~Reisend + niedergelassen → Verbinden → beide bleiben, beide haben dasselbe Wissen (4.4).~~ [VERWORFEN, 14. November 2026] Verbinden gestrichen (4.4).
- **Reisend + niedergelassen → Verschmelzen →** der Reisende geht im niedergelassenen Blob auf; das Bewusstsein ist danach dort (4.5).
- **Reisend + vertrocknet → Verschmelzen →** der Reisende geht im vertrockneten Blob auf; daraus wird ein niedergelassener Blob mit dem Bewusstsein (4.5).
- ~~Reisend + niedergelassen → Einziehen → der niedergelassene Blob geht im Reisenden auf (nicht beim Nest). Reisend + vertrocknet → Verbinden → der vertrocknete Blob geht im Reisenden auf.~~ [VERWORFEN, 14. November 2026] Umgekehrte Richtung, siehe 4.5.
- **Reisend, HP ≤ 0 →** vertrocknet; Sterbescreen, dort wählt man einen niedergelassenen Blob (9). ~~Das Bewusstsein springt zum nächstgelegenen niedergelassenen Blob.~~ [VERWORFEN, 14. November 2026]

### 4.1 Niederlassen
1. Der Reisende wird an seiner Stelle niedergelassen und behält Wissen und Ressourcen.
2. Das Bewusstsein bleibt bei ihm.

Niederlassen sichert also den ganzen Fortschritt des Reisenden. Darauf weist das Spiel hin (Abschnitt 9.2).

### 4.2 Bewusstsein wechseln
1. Die Liste bzw. Karte (Abschnitt 11) zeigt alle niedergelassenen Blobs; ein Tipp springt hin.
2. Liegt das Ziel in einem nicht geladenen Teil der Welt, wird dieser zuerst geladen.
3. Man hat danach **nur den Stand des Ziels**.

**Vorgabe (Entwickler):** Springt man zurück zu einem niedergelassenen Blob, hat man nur dessen Erfahrung und Skills, nicht den Fortschritt des Reisenden.

### 4.3 Abspalten
1. Der niedergelassene Blob zahlt die Kosten. Daraus entsteht der Körper des neuen Reisenden; er ist so groß, wie die Ressourcen reichen (Abschnitt 7.1).
2. Ein Dialog verteilt die übrigen Ressourcen (Abschnitt 7.2).
3. Der neue Reisende erscheint neben ihm, mit voller HP und MP für seine Größe und einer **Kopie des Wissens**.
4. Das Bewusstsein geht auf ihn über.

### 4.4 Verbinden mit einem niedergelassenen Blob (gestrichen)

**Vorgabe (Entwickler, 14. November 2026):** Verbinden (beide bleiben bestehen) fällt weg.

**Begründung (Entwickler):** Verschmelzen reicht dafür schon aus.

Was daraus folgt (Vorschlag Claude, übernommen 15. November 2026):
- Wissen kommt nur noch beim Verschmelzen zusammen (4.5) und wird beim Abspalten kopiert (4.3).
- Wer Wissen holen und beide Blobs behalten will, verschmilzt und spaltet sich neu ab. Weil die Körpermasse beim Verschmelzen als Fasern gutgeschrieben wird, geht das ohne Verlust, solange der niedergelassene Blob ausgewachsen ist (7.1).
- Der Verteilen-Dialog erscheint nur noch beim Abspalten (7.2).

**Bisherige Fassung**

> [VERWORFEN, 14. November 2026] Ersetzt durch die Vorgabe oben. Die Vorgabe „Erfahrung wird bei jeder Verbindung geteilt“ gilt jetzt fürs Verschmelzen (6.1). Das einstellbare Aufteilen der Ressourcen gilt nur noch beim Abspalten (7.2).
>
> 1. Der niedergelassene Blob wird bis jetzt nachgerechnet (Abschnitt 8).
> 2. Das Wissen wird zusammengeführt (Abschnitt 6). Beide haben danach **denselben Stand**.
> 3. Der Dialog verteilt die Ressourcen, vorgeschlagen ist halbe-halbe (Abschnitt 7.2).
> 4. Beide bleiben bestehen, das Bewusstsein bleibt beim Reisenden.
>
> **Vorgabe (Entwickler):** Erfahrung wird bei jeder Verbindung mit beiden Blobs geteilt, beide haben danach dieselbe. Ressourcen werden nicht dupliziert, sondern aufgeteilt, standardmäßig 50/50. Man soll einstellen können, wie viel der Reisende mitnimmt.
>
> ~~**Achtung, Verbinden kann Erfahrung auch senken.** Hat der Reisende einen Skill verlernt, gilt das Verlernen danach auch für den niedergelassenen Blob (Abschnitt 6.5). Der Dialog zeigt deshalb vorher an, welche Skills sich wie ändern.~~ [VERWORFEN, 14. November 2026] Je Skill gilt jetzt der Höchstwert (6.1). Verbinden senkt Erfahrung nur noch über die Kapazitätsprüfung danach (6.2). Der Dialog zeigt weiterhin vorher an, welche Skills sich wie ändern.

**Einziehen** → heißt jetzt **Verschmelzen**, mit umgekehrter Richtung (Abschnitt 4.5).

Die folgende Fassung ist überholt und bleibt nur zum Nachlesen stehen:

> **[VERWORFEN, 14. November 2026]** Richtung und Name geändert durch Vorgabe des Entwicklers (4.5). Gültig bleiben daraus die Vorgabe, dass sich der Reisende mit einem niedergelassenen Blob so verbinden kann, dass einer von beiden aufgeht, und die Begründung des Entwicklers dazu.
>
> **Einziehen** (Arbeitsname, siehe unten)
>
> **Vorgabe (Entwickler, 14. November 2026):** Der Reisende muss sich mit einem niedergelassenen Blob so verbinden können, dass dieser ganz in ihm aufgeht. Nicht beim Nest (Abschnitt 2).
>
> **Begründung (Entwickler):** Damit man die Anzahl der niedergelassenen Blobs verringern kann.
>
> Ablauf (Vorschlag Claude, offen): wie beim Verbinden mit einem vertrockneten Blob (4.5).
> 1. Der niedergelassene Blob wird bis jetzt nachgerechnet (Abschnitt 8).
> 2. Das Wissen wird zusammengeführt (Abschnitt 6).
> 3. Alle Ressourcen und die zurückgehaltene Erfahrung gehen an den Reisenden, ohne Dialog.
> 4. Der niedergelassene Blob verschwindet, mit ihm eine Markierung auf ihm.
>
> Im Verbinden-Dialog wählt man zwischen **Verteilen** (beide bleiben) und **Einziehen** (der niedergelassene Blob geht auf).
>
> ~~Vorschlag Claude (offen): Einziehen geht auch nicht beim letzten niedergelassenen Blob (Regel 1).~~ [VERWORFEN, 14. November 2026] Überflüssig, weil das Nest immer bleibt und nicht eingezogen werden kann. Bisherige Begründung (Vorschlag Claude): Ohne Einziehen gäbe es nur immer mehr niedergelassene Blobs, und die Karte würde voll. Sie ist jetzt durch die Begründung des Entwicklers ersetzt.
>
> **Name offen.** Vorschläge Claude:
> - **Verschmelzen:** So heißt es beim Vorbild. Zwei Plasmodien von *Physarum* verschmelzen zu einem. Dann hieße auch das Aufnehmen eines vertrockneten Blobs (4.5) Verschmelzen, denn es ist derselbe Vorgang.
> - **Aufnehmen:** schlicht und sofort verständlich.
> - **Einziehen:** der bisherige Arbeitsname.

### 4.5 Verschmelzen (mit einem niedergelassenen oder vertrockneten Blob)

**Vorgabe (Entwickler, 14. November 2026):**
- Der Reisende muss sich mit einem niedergelassenen Blob so verbinden können, dass nur einer übrig bleibt. Das heißt **Verschmelzen**.
- Dabei geht der **Reisende in den niedergelassenen Blob** hinein.
- Auch mit einem vertrockneten Blob heißt es Verschmelzen. Das Ergebnis ist ebenfalls ein **niedergelassener Blob**.

**Begründung (Entwickler):**
- Verschmelzen muss es geben, damit man die Anzahl der niedergelassenen Blobs verringern kann.
- Dass der Reisende hineingeht und immer ein niedergelassener Blob herauskommt, ist konsistent, und man hat nicht zu viele unterschiedliche Aktionen und Ergebnisse.

Der Name stammt vom Vorbild: Zwei Plasmodien von *Physarum* verschmelzen zu einem (Vorschlag Claude, übernommen).

**Ablauf (Vorschlag Claude, übernommen 14. November 2026):**
1. Reihenfolge wie in 4.6. Ein niedergelassener Blob wird vorher bis jetzt nachgerechnet (Abschnitt 8).
2. Das Wissen wird zusammengeführt (Abschnitt 6).
3. Alle Ressourcen und die zurückgehaltene Erfahrung des Reisenden gehen in den anderen Blob, ohne Dialog. Seine **Körpermasse** wird dem anderen Blob als Pflanzenfasern gutgeschrieben (Vorgabe Entwickler, Abschnitt 7.1).
4. Der Reisende verschwindet. Der andere Blob behält seine ID und seinen Platz. ~~Die Spalte des Reisenden bleibt in der Wissenstabelle stehen, wie bei jedem verschwundenen Blob (Abschnitt 6.7).~~ [VERWORFEN, 14. November 2026] Es gibt keine Herkunftsspalten mehr (6.1).
5. Ein **vertrockneter** Blob wird dabei niedergelassen: Er bekommt eine Tätigkeit (Ruhen), „berechnet bis“ = jetzt und seine Quellen (8.3).
6. Das Bewusstsein ist danach beim niedergelassenen Blob. Eine Markierung auf ihm entfällt, denn man ist ja selbst dort (11.2).
7. **HP und MP** (gemerkt fürs Erheben, 4.7): Ein niedergelassener Blob behält seine eigenen. Ein vertrockneter hat keine; er bekommt die des Reisenden.
   - **Vorgabe (Entwickler, 15. November 2026):** Volle Heilung durch Verschmelzen und gleich wieder Erheben soll vermieden werden. **Die Wunden kommen mit** (Vorschlag Claude, übernommen 15. November 2026): Nach dem Verschmelzen gilt der niedrigere der beiden HP-Anteile (in Prozent der maxHP), ebenso für MP. Beispiel: Reisender 20 %, niedergelassener Blob 100 % → 20 %. Begründung (Vorschlag Claude, übernommen): Das verletzte Plasma des Reisenden fließt ins ganze Adernetz. Heilen braucht dann die normale Regenerationszeit, die beim Niederlassen weiterläuft; wer wartet, heilt so schnell wie ein wartender Reisender (wie beim Erheben, 4.7). Erlaubt bleibt: verwundet niederlassen, zu einem gesunden Blob wechseln und dort erheben, denn das ist ein anderer Körper an einem anderen Ort.

**Begründung (Vorschlag Claude, übernommen):**
- Punkt 3: Der Reisende hört auf zu bestehen, also muss alles, was er trägt, im anderen Blob landen. Ein Dialog wäre überflüssig, denn es gibt nichts aufzuteilen.
- Punkt 7: Der aufnehmende Körper bleibt, was er ist. Ein vertrockneter Blob hat keine lebenden HP; die bringt nur der Reisende mit.
- **Anzahl verringern:** Man erhebt sich mit einem niedergelassenen Blob (4.7), reist zu einem anderen und verschmilzt mit ihm. Danach gibt es einen niedergelassenen Blob weniger.
- **Vertrockneten Blob einsammeln kostet nichts extra:** Nach dem Verschmelzen ist man niedergelassen. Weiter geht es kostenlos mit Erheben (4.7) oder, mit Kosten, durch Abspalten.

**Folgefragen:**
- **Mit dem Nest verschmelzen geht** (übernommen 14. November 2026). Begründung (Vorschlag Claude, übernommen): Das Nest bleibt dabei bestehen, denn der Reisende geht in ihm auf. Das bisherige „nicht beim Nest“ folgte nur aus der alten Richtung.
- **Nicht unter Aggro,** wie beim Niederlassen (seit 5 s keine Aggro, Abschnitt 3; übernommen 14. November 2026). Begründung (Vorschlag Claude, übernommen): Verschmelzen endet niedergelassen, also unverwundbar. Sonst wäre es ein Notausgang aus jedem Kampf, und mit sofortigem Erheben auch ein Trick, um Gegner abzuschütteln. Das ersetzt die Frage nach dem Zurückziehen unter Aggro (Abschnitt 15, Punkt 3).
- ~~**Vertrockneter Blob zu nah an einem niedergelassenen oder über der Höchstzahl** (8.3, Abschnitt 15 Punkt 5; Vorschlag Claude, offen): Verschmelzen geht trotzdem, denn niemand darf vom Einsammeln seines vertrockneten Blobs ausgeschlossen sein. Der neue niedergelassene Blob arbeitet dann nicht selbsttätig, bis man sich mit ihm erhebt; das Spiel weist darauf hin.~~ [VERWORFEN, 14. November 2026] Mindestabstand und Höchstzahl gibt es nicht mehr (Vorgabe Entwickler, 8.3 und 8.5). Verschmelzen mit einem vertrockneten Blob geht also immer.
- **Ein vertrockneter Blob, der nicht ausgewachsen war,** wird beim Verschmelzen ein nicht ausgewachsener niedergelassener Blob. Er kann sich nur erheben, bis er mit Grow aus seinem Lager ausgewachsen ist (7.1).

~~**Verbinden mit einem vertrockneten Blob**~~ [VERWORFEN, 14. November 2026] Ersetzt durch Verschmelzen oben: Jetzt geht der Reisende im vertrockneten Blob auf, nicht umgekehrt. Bisherige Fassung:
1. ~~Das Wissen wird zusammengeführt (Abschnitt 6).~~
2. ~~Der vertrocknete Blob geht ganz im Reisenden auf und verschwindet.~~
3. ~~Seine Ressourcen gehen vollständig an den Reisenden, ohne Dialog. Ebenso seine zurückgehaltene Erfahrung (Übertraining, Abschnitt 5).~~

~~Begründung (Vorschlag Claude, offen): Ein vertrockneter Blob kann allein nichts mehr anfangen. Bliebe er stehen, füllte er nur die Karte mit leeren Hüllen.~~ Bleibt sinngemäß gültig: Auch jetzt bleibt keine leere Hülle zurück, denn aus dem vertrockneten Blob wird ein niedergelassener.

### 4.6 Reihenfolge bei jedem Formwechsel

Bei Verschmelzen, Abspalten, Bewusstsein wechseln, Niederlassen, Erheben, Vertrocknen und Speichern gilt immer diese Reihenfolge. Schritte, die nicht passen, entfallen (beim Speichern z. B. 2–4).
1. Arbeitskopie zurückschreiben (Abschnitt 13.2)
2. Den anderen Blob nachrechnen (Abschnitt 8)
3. Wissen zusammenführen (Abschnitt 6)
4. Kapazität einmal prüfen (Abschnitt 6.2)
5. Arbeitskopie neu anlegen

Verlässt das Bewusstsein einen niedergelassenen Blob, wird er bis jetzt nachgerechnet, auch das angefangene Stück, und „berechnet bis“ auf jetzt gesetzt (Vorschlag Claude aus Prüfrunde 3, übernommen 15. November 2026). ~~… wird bei ihm „berechnet bis“ auf jetzt gesetzt. Sonst würde die Zeit, in der man selbst dort war, später noch einmal nachgerechnet.~~ [VERWORFEN, 15. November 2026] Stammt aus der Regel „Arbeit ruht, solange man dort ist“; die Tätigkeit läuft jetzt weiter (8.1).

### 4.7 Erheben

**Vorgabe (Entwickler, 14. November 2026):** Ein niedergelassener Blob kann sich erheben und wird wieder zum Reisenden (Idee von Claude, übernommen). Das Nest kann sich nicht erheben.

**Begründung (Entwickler):** Damit niedergelassene Blobs auch wieder entfernt werden können.

Ablauf (Vorschlag Claude, übernommen 14. November 2026):
1. Nur mit Bewusstsein dort und mit einem Bewegungs-Skill (wie Abspalten).
2. Reihenfolge wie in 4.6; die selbsttätige Arbeit endet.
3. **Derselbe Blob** (gleiche ID) wird reisend. Er behält sein ganzes Wissen, alle Ressourcen und seine Größe. Kein Dialog, keine Kosten.
4. **Größe:** seine eigene Körpermasse, wie sie beim Niederlassen war, plus was Grow seither verdaut hat. Die übrigen Fasern im Lager werden nicht in Größe umgewandelt (Vorgabe Entwickler, 7.1).
5. **HP und MP:** so, wie sie beim Niederlassen waren, plus die Regeneration über die Zeit, in der er niedergelassen war (MP 1 MP/s, Photosynthese), höchstens bis voll.
6. ~~Sein Platz wird frei: Er zählt nicht mehr für den Mindestabstand (8.3).~~ [VERWORFEN, 14. November 2026] Kein Mindestabstand mehr. Seine Wesen in der Arbeitsreichweite erntet jetzt der nächste andere niedergelassene Blob (8.3). Eine Markierung auf ihm entfällt, denn man ist ja selbst dort.

**Begründung (Vorschlag Claude, übernommen):**
- Erheben ist die Umkehrung von Niederlassen. Es entsteht kein neuer Blob, deshalb kostet es nichts, anders als Abspalten (7.1).
- Punkt 5: Mit voller HP beim Erheben wäre „5 s ohne Aggro niederlassen, dann erheben“ eine kostenlose Vollheilung. Mit den gemerkten Werten und der Regeneration über die Zeit hat man genau das, was man auch beim Warten als Reisender hätte.

---

## 5. Was jeder Blob für sich hat und was geteilt wird

**Vorgabe (Entwickler):** Ressourcen und Erfahrung sind grundsätzlich lokal für jeden Blob. Skills werden genauso behandelt wie Erfahrung.

**Wird beim Verschmelzen zusammengeführt, beim Abspalten kopiert:** ~~beim Verbinden geteilt (beide danach gleich)~~ [VERWORFEN, 14. November 2026]
- Erfahrung je Skill und der Kern-Fähigkeiten: je Skill der Höchstwert (Abschnitt 6)
- entdeckte Skills: Was einer kennt, kennt danach der verschmolzene Blob bzw. die Kopie
- Höchststand je Skill (für das Wiedererlernen)

**Wird verteilt (Summe bleibt gleich, außer den Kosten fürs Abspalten, 7.1):**
- Materialien
- ~~Körpermasse~~ [VERWORFEN, 14. November 2026] gehört jetzt zum Körper (siehe unten und 7.1)

**Bleibt beim jeweiligen Körper:**
- Körpermasse (Größe). Beim Abspalten entsteht sie aus Pflanzenfasern, beim Verschmelzen wird sie wieder zu Pflanzenfasern (7.1).
- HP, MP, Gift, Status-Effekte, Cooldowns
- zurückgehaltene Erfahrung (Übertraining, GDD-02 Abschnitt 8.7)
- Skill-Leiste, ein- und ausgeschaltete Passive

**Gehört zum Bewusstsein (eine für alle Blobs):**
- Ermüdung (Übertraining, GDD-02 Abschnitt 8.7)

**Begründungen (Vorschlag Claude, übernommen 15. November 2026):**
- ~~**Körpermasse wie Ressourcen:** Masse ist echte Substanz. Teilt sich ein Körper, teilt sich seine Masse. Würde sie kopiert, könnte man sie durch Abspalten und Verbinden vermehren. Weil das Wachstum logarithmisch steigt (`log2(1 + Masse/20)`, GDD-02 Abschnitt 8.10), kostet die halbe Masse höchstens 1 Wachstum, bei wenig Masse weniger. Weniger Masse heißt aber weniger maxHP und weniger Stärke (Größenbonus, GDD-09 Abschnitt 3). Der Dialog zeigt das an.~~ [VERWORFEN, 14. November 2026] Ersetzt durch die Vorgabe des Entwicklers zu den Kosten des Abspaltens (7.1).
- **Ermüdung gehört zum Bewusstsein, nicht zum Körper** (Vorschlag Claude, übernommen 14. November 2026): Es ist immer nur ein Körper aktiv. Hätte jeder Körper seine eigene Ermüdung, könnte man sie umgehen: müde niederlassen, zu einem ausgeruhten Blob springen, frisch weitertrainieren. Die Vorgabe in GDD-02 Abschnitt 8.7 (Spieler sollen vom zu vielen Spielen gehemmt werden) zielt auf den Spieler, also auf das Bewusstsein. Ermüdung erzeugt keine Erfahrung, daher kann eine gemeinsame Ermüdung nichts verdoppeln.
- **Zurückgehaltene Erfahrung wird nicht kopiert** (Vorschlag Claude, übernommen 14. November 2026): Sie wird dem Körper gutgeschrieben, der sie verdient hat, sobald sie nachkommt, und erreicht andere Blobs mit dem nächsten Verschmelzen. So zählt sie genau einmal. Geht der Reisende beim Verschmelzen in einem anderen Blob auf, wandert seine zurückgehaltene Erfahrung mit (Abschnitt 4.5), damit nichts verloren geht.
- **Skill-Leiste lokal:** Ein niedergelassener Blob braucht andere Knöpfe als ein Reisender.

---

## 6. Wissen verrechnen

### 6.1 Der Höchstwert je Skill

**Vorgabe (Entwickler, 14. November 2026):** Beim Übertragen der Erfahrung zählt je Skill nur der höchste Erfahrungswert. Es wird nichts aufaddiert.

**Begründung (Entwickler):** So lohnt es sich nicht, parallel den gleichen Skill zu leveln. Das ist auch logisch: Wenn zwei Personen gleichzeitig das Gleiche lernen, wissen sie zusammen am Ende auch nicht das Doppelte.

Regeln:
- **Verschmelzen:** Je Skill gilt der größere der beiden Werte. Danach bleibt nur ein Blob (4.5).
- ~~**Verbinden:** genauso, danach haben beide Blobs dieselbe Erfahrung.~~ [VERWORFEN, 14. November 2026] Verbinden gestrichen (4.4).
- **Abspalten:** Der neue Blob bekommt eine Kopie.

Beispiel (das Beispiel des Entwicklers aus der bisherigen Fassung): Das Nest N hat 100 XP Photosynthese und spaltet R ab. N gewinnt +30, R gewinnt +50.
- N: **130**, R: **150**
- R verschmilzt mit N: **150** (bisher 180)

Was daraus folgt (Vorschlag Claude, übernommen 15. November 2026):
- Abspalten und wieder Verschmelzen bringt nie Erfahrung. Die frühere Vorgabe „nicht einfach addieren“ gilt also weiter.
- Verschiedene Skills in verschiedenen Blobs zu üben, lohnt sich voll. Denselben Skill doppelt zu üben, bringt nichts.
- Über Umwege kann nichts doppelt zählen: Der Höchstwert bleibt der Höchstwert, egal über wie viele Blobs er wandert.
- Jeder Blob speichert je Skill nur eine Zahl, wie heute der Spieler. Herkunftszähler, Schnappschüsse und das Sparen von Speicher fallen weg. Die Umsetzung wird deutlich einfacher (13.1, 13.2, 14).

### 6.2 Verlernen und Kapazität

Verlernen entsteht durch die Kapazität und die Überdehnung (GDD-02 Abschnitt 8). Es trifft zuerst die am längsten nicht geübten Skills.

Vorschlag Claude (übernommen 15. November 2026):
- Verlernen gilt nur in dem Blob, der verlernt hat. Beim Verschmelzen kann der andere Blob den Skill zurückbringen, wenn er ihn noch höher hat.
- Dann kann die Summe über der Kapazität liegen.

**Vorgabe (Entwickler, 14. November 2026):** Niedergelassene Blobs können die Kapazität nicht durch Lernen erweitern. Erweitert wird sie nur durch Verschmelzen, und danach reduziert sie sich langsam wieder.

**So gemeint (bestätigt vom Entwickler, 15. November 2026):** Über die Kapazität hinaus, also in die Überdehnung, kommt ein niedergelassener Blob nur durch Verschmelzen. Die Kapazität selbst wächst wie bisher mit jedem entdeckten Skill (Summe der Natur-Erfahrung, GDD-02 Abschnitt 8.4), auch mit Skills, die er durch seine Tätigkeit entdeckt.

**Begründung (Vorschlag Claude, übernommen):** Überdehnung belohnt hartes aktives Training (Begründung des Entwicklers in GDD-02 Abschnitt 8.5); ein niedergelassener Blob trainiert nicht aktiv.

So gefasst (Vorschlag Claude, übernommen 14. November 2026):
- **Nach dem Verschmelzen** darf die Summe über der Kapazität liegen, wie eine Überdehnung. Sie schmilzt mit der Halbwertszeit der Überdehnung ab (2 Spielstunden, GDD-02 Abschnitt 8.5), zuerst bei den am längsten nicht geübten Skills.
- **Obergrenze:** wie bei der Überdehnung höchstens Kapazität + 20 %. Was darüber liegt, wird sofort verlernt. Im Beispiel (Kapazität 1000, zusammen 1400) bleiben 1200, die langsam auf 1000 sinken.
- **Lernen im niedergelassenen Blob:** Liegt er an der Kapazität, verdrängt neue Erfahrung sofort die am längsten nicht geübte, wie ohne Überdehnung. Liegt er nach einem Verschmelzen darüber, wächst die Summe durch Lernen nicht weiter.
- Der Reisende kommt wie bisher auch durch Training in die Überdehnung.

- ~~Deshalb wird nach jedem Zusammenführen **einmal** die Kapazität geprüft und notfalls verlernt, nach den bestehenden Regeln (GDD-02 Abschnitt 8.4). Zu viel Erfahrung kann so nie entstehen.~~ [VERWORFEN, 14. November 2026] Ersetzt durch die Vorgabe oben.
- ~~**Grenze nach dem Verschmelzen:** Die Summe wird auf das Größere aus Kapazität, Summe von A vorher und Summe von B vorher gekappt, nicht auf die Obergrenze der Überdehnung (Kapazität × 1,2). Begründung (Vorschlag Claude, offen): Sonst säße der Blob nach jedem Verschmelzen in der Überdehnung (GDD-02 Abschnitt 8.5), obwohl keiner der beiden dort war. Überdehnung soll man sich durch Training verdienen.~~ [VERWORFEN, 14. November 2026] Der Entwickler will die Erweiterung durch Verschmelzen.
- Verschmelzen senkt Erfahrung also nur über die Obergrenze von Kapazität + 20 %.

### 6.3 Übrige Werte je Skill

- **Entdeckt:** Was einer kennt, kennt danach der verschmolzene Blob. Kein Skill wird je „unentdeckt“.
- **Entdeckt am:** der frühere Zeitpunkt (Vorschlag Claude, übernommen 15. November 2026). Begründung (Vorschlag Claude, übernommen): Bestimmt nur die Reihenfolge in der Skill-Liste; einer der beiden kannte den Skill schon damals.
- **Höchststand** (bis dahin doppelt schnell wiedererlernen): der größere der beiden Höchststände.
- **Zuletzt geübt** (wer am längsten ungeübt ist, verlernt zuerst): der spätere Zeitpunkt (Vorschlag Claude, übernommen 15. November 2026). Begründung (Vorschlag Claude, übernommen): Geübt wurde der Skill, egal von wem; sonst würde ein gerade benutzter Skill zuerst verlernt.
- **Zurückgehaltene Erfahrung:** bleibt beim Körper; Ermüdung gehört zum Bewusstsein (Abschnitt 5).
- **Ein/aus bei Passiven:** bleibt beim Blob. Neu dazugekommene Skills sind eingeschaltet.

Die bisherige „bekannte Eigenheit“ (zwei Zweige lernen getrennt doppelt schnell nach) entfällt: Mit dem Höchstwert bringt das Nachlernen in zwei Zweigen nicht mehr als in einem.

### Bisherige Fassung (6.1–6.7)

> **[VERWORFEN, 14. November 2026]** Ersetzt durch die Vorgabe des Entwicklers „nur der höchste Erfahrungswert je Skill“ (6.1). Bisher sollte Erfahrung zählen, die beide Blobs unabhängig gesammelt haben; dafür waren die Herkunftszähler nötig.
>
>
> ### 6.1 Das Problem
>
> **Vorgabe (Entwickler):** Bei einer Wiedervereinigung darf Erfahrung nicht einfach addiert werden. Sonst könnte man sie verdoppeln, indem man sich abspaltet und wieder verbindet. Erfahrung, die beide Blobs unabhängig voneinander gesammelt haben, soll aber zählen.
>
> **Vorgabe (Entwickler) — Idee zur Umsetzung:** Beim Abspalten wird ein Schnappschuss gemacht. Beim Verbinden weiß man dann, was die gemeinsame Basis war, und zählt nur, was beide Seiten seither dazugewonnen haben.
>
> ### 6.2 Vorschlag: Herkunftszähler (wer hat was beigetragen)
>
> Jeder Blob merkt sich je Skill nicht nur eine Zahl, sondern eine kleine Tabelle, die **Herkunftszähler**:
>
> - **Verdient:** wie viel Erfahrung jeder einzelne Blob beigetragen hat, eine Spalte je Blob.
> - **Verlernt:** eine einzige Zahl, wie viel insgesamt verlernt wurde.
>
> ```
> Erfahrung =
>   Summe „verdient“
>   − „verlernt“
> ```
>
> Regeln:
> - Gewinnt Blob X Erfahrung, erhöht er **nur seine eigene Spalte**.
> - Alle Zahlen wachsen nur, keine wird je kleiner.
> - **Verbinden:** In jeder Spalte gilt der größere der beiden Werte, ebenso bei „verlernt“. Danach haben beide Blobs dieselbe Tabelle.
> - **Abspalten:** Der neue Blob bekommt eine Kopie der Tabelle und eine neue, leere eigene Spalte.
>
> Jede Spalte schreibt nur ein einziger Blob, und ihre Werte wachsen nur. Darum ist der größere Wert immer der neuere. Dieselbe Erfahrung kann nie doppelt zählen, egal über wie viele Umwege sie kommt und wie oft man sich verbindet.
>
> Das ist die Idee des Entwicklers, nur genauer gefasst: Die Tabelle wirkt wie ein Schnappschuss, der für **jeden** möglichen Partner zugleich gilt, auch für Blobs, die sich nie direkt getrennt haben.
>
> *Für Programmierer:* „Verdient“ ist ein G-Counter, „verlernt“ ein Max-Register (beides CRDTs, Datenstrukturen für Kopien, die getrennt weiterarbeiten und sich später abgleichen).
>
> ### 6.3 Das Beispiel des Entwicklers
>
> Der niedergelassene Blob N hat 100 XP Photosynthese und spaltet R ab. N analysiert weiter Gras und gewinnt +30. R gewinnt unterwegs +50.
>
> - N: N 130 = **130**
> - R: N 100 · R 50 = **150**
> - Verbinden, je Spalte der größere Wert: N 130 · R 50 = **180** (= 100 + 30 + 50)
>
> Beide haben danach 180 XP. Verbinden sie sich gleich noch einmal, ändert sich nichts. Abspalten und Wiederverbinden bringt also keine Erfahrung.
>
> ### 6.4 Warum ein Schnappschuss je Paar nicht reicht
>
> Für **zwei** Blobs ist der Schnappschuss genau richtig. Bei **drei oder mehr** kann Wissen über Umwege wandern. Für das Beispiel spielt es keine Rolle, wer zu wem läuft, nur wer sich mit wem verbindet.
>
> **Mit Schnappschüssen je Paar:**
> 1. A hat 100 XP und spaltet B ab → A 100, B 100
> 2. A spaltet C ab, C gewinnt +30 → C 130
> 3. C verbindet sich mit B (Basis 100) → B 130, C 130
> 4. B gewinnt +20 und spaltet D ab → B 150, D 150
> 5. D verbindet sich mit A (Basis von B geerbt: 100) → A 150, D 150
> 6. C verbindet sich mit A (Schnappschuss A–C: 100) → 100 + 50 + 30 = **180** ✗, A und C haben dann 180
>
> Richtig wären 150, denn verdient wurden nur 100 + 30 + 20. Die 30 XP von C sind auf zwei Wegen zu A gelangt, über B und D und direkt, und zählen doppelt. Schon in Schritt 3 und 5 ist außerdem unklar, welche Basis gilt, weil sich diese Blobs nie direkt getrennt haben.
>
> **Mit der Tabelle** (Spalten A, B, C):
> 1. A: A 100. B: A 100
> 2. C: A 100 · C 30 = 130
> 3. B und C: A 100 · C 30 = 130
> 4. B: A 100 · B 20 · C 30 = 150. D erhält dieselbe Tabelle: 150
> 5. A und D: A 100 · B 20 · C 30 = **150**
> 6. C ↔ A: C 30 steht schon bei A. A bleibt bei 150, C bekommt B 20 dazu → beide **150** ✓
>
> ### 6.5 Verlernen und Kapazität
>
> Verlernen entsteht durch die Kapazität und die Überdehnung (GDD-02 Abschnitt 8). Es trifft zuerst die am längsten nicht geübten Skills.
>
> **Warum „verlernt“ nur eine Zahl ist und nicht eine Spalte je Blob:** Nach einer Verbindung haben beide Blobs dasselbe alte Wissen. Verlernen beide danach getrennt, trifft es meist **dasselbe** alte Wissen. Würde man das wie Verdientes je Blob aufaddieren, zählte es doppelt.
>
> Beispiel: Skill X hat 80 XP, beide Blobs verlernen davon je 80.
> - Je Blob addiert: 80 − 80 − 80 = **−80** ✗
> - Als eine Zahl, der größere Wert gilt: 80 − 80 = **0** ✓
>
> Eine Erfahrung unter 0 ist so unmöglich. Jeder Blob hat höchstens so viel verlernt, wie in seiner Tabelle als verdient steht, und nach dem Verbinden ist das Verdiente mindestens so groß wie bei jedem einzelnen Blob.
>
> Verlernen beide Blobs verschiedenes Wissen desselben Skills, zählt nur das größere Verlernen. Dann kann die Summe über der Kapazität liegen. Deshalb wird nach jedem Zusammenführen **einmal** die Kapazität geprüft und notfalls verlernt, nach den bestehenden Regeln (GDD-02 Abschnitt 8.4), ohne einen Skill zu schonen. Das Verlernte kommt zu „verlernt“, und beide Blobs übernehmen dieses Ergebnis. Zu viel Erfahrung kann so nie entstehen.
>
> **Grenze nach dem Verbinden:** Die Summe wird auf das Größere aus Kapazität, Summe von A vorher und Summe von B vorher gekappt, nicht auf die Obergrenze der Überdehnung (Kapazität × 1,2). Begründung (Vorschlag Claude, offen): Sonst säßen nach jedem Verbinden beide Blobs in der Überdehnung (GDD-02 Abschnitt 8.5), obwohl keiner von beiden dort war. Überdehnung soll man sich durch Training verdienen.
>
> **Verbinden kann Erfahrung senken.** Beispiel: Das Nest hat Photosynthese 100 und gewinnt +30. Der Reisende hat die alten 100 inzwischen verlernt. Nach dem Verbinden: 100 + 30 − 100 = **30**. Das ist folgerichtig, denn das Verlernen des Reisenden gilt für das gemeinsame Wissen. Das Nest ist also keine Sicherung gegen Verlernen. Der Dialog zeigt vor dem Verbinden an, welche Skills sich wie ändern (Abschnitt 4.4). Ob das so bleiben soll, ist offen (Abschnitt 15).
>
> ### 6.6 Übrige Werte je Skill
>
> - **Entdeckt:** Was einer kennt, kennen beide. Kein Skill wird je „unentdeckt“.
> - **Entdeckt am:** der frühere Zeitpunkt.
> - **Höchststand** (bis dahin doppelt schnell wiedererlernen): der größte Wert aus Höchststand A, Höchststand B und der neuen Erfahrung. Begründung: Die neue Erfahrung kann über beiden alten Höchstständen liegen (180 im Beispiel 6.3).
> - **Zuletzt geübt** (wer am längsten ungeübt ist, verlernt zuerst): der spätere Zeitpunkt. Begründung (Vorschlag Claude, offen): Geübt wurde der Skill, egal von wem.
> - **Zurückgehaltene Erfahrung:** bleibt beim Körper; Ermüdung gehört zum Bewusstsein (Abschnitt 5).
> - **Ein/aus bei Passiven:** bleibt beim Blob. Neu dazugekommene Skills sind eingeschaltet.
>
> **Bekannte Eigenheit:** Liegt ein Skill unter seinem Höchststand, lernen beide Zweige getrennt doppelt schnell nach. Eine Lücke von 200 XP kann so in zwei Zweigen zusammen 400 statt 300 XP Gewinn bringen. Das wird hingenommen: Die Kapazität begrenzt die Summe, und Verbinden kostet einen Weg.
>
> ### 6.7 Speicherbedarf
>
> Jeder Blob hat seine eigene Tabelle, und jedes Abspalten bringt eine neue Spalte. Bei 20 Blobs, 40 Skills und 50 beitragenden Blobs wären das bis zu 40 000 Zahlen. Das passt noch in den Browser-Speicher (etwa 5 MB), ist aber unnötig viel.
>
> **Sparen:**
> - Gespeichert werden nur Einträge, die nicht 0 sind. Die meisten Blobs tragen nur zu wenigen Skills bei.
> - **Basis abziehen:** Je Spalte wird der kleinste Wert über alle Blobs in eine gemeinsame Basis verschoben, bei allen Blobs zugleich. Das ändert kein Ergebnis, denn der größere von (Basis + a) und (Basis + b) ist Basis + der größere von a und b. Es geht auch für Spalten noch lebender Blobs und wird nicht von einem vergessenen vertrockneten Blob blockiert.
> - In Schritt 1 der Umsetzung wird gemessen, wie groß die Tabellen im Spiel wirklich werden.

---

## 7. Ressourcen verteilen

### 7.1 Kosten des Abspaltens

**Vorgabe (Entwickler, 14. November 2026):**
- Einen neuen Reisenden abzuspalten, ist relativ teuer.
- Um sich als ausgewachsener Blob abzuspalten, braucht der niedergelassene Blob so viele Ressourcen, wie verbraucht werden, um vollständig auszuwachsen.
- Fehlen diese Ressourcen, spaltet sich ein entsprechend nicht voll ausgewachsener Blob ab. Seine Größe entspricht den vorhandenen Ressourcen.
- Abspalten erst, wenn man voll ausgewachsen ist. Niederlassen geht auch nicht ausgewachsen; dann kann man sich nur erheben (entschieden 14. November 2026, siehe „Niedergelassen, aber nicht ausgewachsen“ unten).
- Beim Verschmelzen werden die Ressourcen, die in die Größe des Reisenden geflossen sind, dem niedergelassenen Blob gutgeschrieben.

**Begründung (Entwickler):**
- Das teure Abspalten soll sehr viele Blobs verhindern.
- Die Gutschrift beim Verschmelzen ist nötig, weil man sich sonst danach im Zweifel nur als Miniblob wieder abspalten könnte.

**Umsetzung (Vorschlag Claude, übernommen 15. November 2026):**
- **Fasern = Körpermasse:** Wachstum kommt nur aus Körpermasse, und eine verdaute Pflanzenfaser ist eine Körpermasse (GDD-02 Abschnitt 8.10). Die Kosten in Fasern sind also die Körpermasse des neuen Reisenden.
- **Abspalten:** Körpermasse des neuen Reisenden = Pflanzenfasern im Lager, höchstens bis ausgewachsen. Diese Fasern sind verbraucht. Der niedergelassene Blob behält seine eigene Größe.
- **Verschmelzen:** Die Körpermasse des Reisenden kommt als Pflanzenfasern ins Lager des anderen Blobs. Der behält seine eigene Größe.
- **Kein Verlust hin und zurück:** Abspalten und Verschmelzen heben sich genau auf. Teuer ist, die Fasern erst einmal zu haben.
- **Bekannte Schwäche** (Vorgabe Entwickler, 15. November 2026: erstmal hingenommen): Ein Reisender, der Fasern trägt, kann mit dem Nest oder einem ausgewachsenen niedergelassenen Blob verschmelzen und sich sofort ausgewachsen abspalten, ohne Verdauungszeit und sogar ohne Grow. Das ist ein Wachstumssprung, wie ihn die Vorgabe zum Erheben vermeiden will. Mögliche Lösung für später: Der Körper entsteht aus einer Reserve, die Grow über die Zeit füllt.
- **Nachwachsen:** Ein nicht ausgewachsener niedergelassener Blob wächst mit Grow aus seinem Lager weiter, im normalen Verdauungstempo (8.4). Ist er ausgewachsen, kann er abspalten. Bestätigt durch den Entwickler: „Niedergelassene Blobs dürfen gerne auch wachsen“ (14. November 2026).
- Ein ausgewachsener Blob verdaut nicht weiter; die Fasern bleiben im Lager.
- **Das Nest kann immer abspalten,** auch wenn es nicht ausgewachsen ist (**Vorgabe Entwickler, 14. November 2026**). Der Reisende ist dann so groß, wie die Fasern reichen, notfalls so klein wie beim Erwachen. Begründung (Vorschlag Claude, übernommen): Zum Nest kann man nach dem Vertrocknen immer wechseln (9.1), und es kann sich nicht erheben. ~~Zum Nest springt das Bewusstsein nach dem Vertrocknen.~~ [VERWORFEN, 15. November 2026] Sterbescreen statt automatischem Sprung. Ohne diese Ausnahme säße man dort fest, gleich zu Beginn des Spiels sogar sicher.
- **Das Nest gilt als ausgewachsen** (Vorgabe Entwickler, 15. November 2026). Es wächst nicht; Grow verdaut dort keine Fasern, sie bleiben im Lager fürs Abspalten. Damit folgt „Das Nest kann immer abspalten“ von selbst. Begründung (Vorschlag Claude, übernommen): Sonst verdaute Grow im Nest Fasern zu Körpermasse, die das Nest nie nutzen kann (es kann sich nicht erheben), und Fasern aus einem Verschmelzen ins Nest gingen verloren (Prüfrunde 3).

**Ausgewachsen: feste Höchstmasse**

**Vorgabe (Entwickler, 14. November 2026):**
- Es gibt eine **feste Höchstmasse**. Ausgewachsen heißt: Körpermasse ≥ Höchstmasse. Ausgewachsen ist ausgewachsen; größer wird der Blob nur durch Formwandeln, und das ist nicht Grow.
- Ändert der Entwickler später den Höchstwert, bleibt die Größe jedes Blobs, wie sie war. Ein bisher ausgewachsener Blob ist dann nicht mehr ausgewachsen und muss weiter wachsen, um die neue Höchstgröße zu erreichen.
- ~~Grow bekommt eine Höchstmasse, die mit der Erfahrung steigt (Vorschlag Claude, übernommen).~~ [VERWORFEN, 14. November 2026] Präzisiert durch den Entwickler: Die Höchstmasse steigt nicht mit der Erfahrung, sie ist fest.
- Der Blob ist eine runde Kugel und wird höchstens **120 kg** schwer und **61 cm** groß (Durchmesser). Entschieden 14. November 2026, nachdem die Rechnung gezeigt hat, dass 80 kg und 90 cm als Kugel nicht zusammenpassen.
- ~~Der Blob wird höchstens so schwer wie ein Mensch: 80 kg. Die runde Kugel ist dabei höchstens halb so groß wie ein Mensch: 90 cm.~~ [VERWORFEN, 14. November 2026] Eine Kugel aus 80 kg Schleim (etwa so dicht wie Wasser) hat nur rund 53 cm Durchmesser; 90 cm hätte erst eine Kugel mit etwa 380 kg. Der Entwickler hat sich für eine Kugel mit stimmigen Werten entschieden.
- Später kann der Blob seine Form wandeln (Gestalt von Tieren oder Menschen annehmen) und dann auch etwas größer werden. Das kommt aber noch nicht.

**Begründung (Entwickler):** Der Blob soll im Endeffekt ungefähr mit Menschen auf einer Ebene sein, daher 120 kg. Erhöht von 80 auf 120 kg, um die Kugel gegenüber 80 kg etwas größer zu machen.

> ~~Begründung (Vorschlag Claude, übernommen) für die Höchstmasse an Grow: Was zum Skill gehört, steht am Skill (GDD-02 Abschnitt 8.8). Früh ist Abspalten billig, später teurer.~~ [VERWORFEN, 14. November 2026] Die Höchstmasse ist fest und gehört damit nicht zum Skill.

**Umrechnung (Vorschlag Claude, übernommen 15. November 2026, alle Zahlen VORLÄUFIG):**
- **1 Pflanzenfaser = 0,1 kg Körpermasse** (übernommen 14. November 2026, vorerst). 120 kg sind also 1200 Fasern, etwa 600 Grashalme. Bei 30 Fasern pro Minute (Grow ganz oben) dauert das Verdauen 40 Minuten.
- **Höchstmasse:** 120 kg = 1200 Fasern, als allgemeine Regel des Wachsens in `src/data/grow.ts` (dort stehen schon die anderen allgemeinen Wachstumsregeln). Grow selbst bestimmt nur das Verdauungstempo.
- **Folge:** Ausgewachsen ist man erst mit 120 kg, von Anfang an. Bis dahin kann außer dem Nest kein niedergelassener Blob abspalten. Ohne den Skill Grow wächst man gar nicht; dann spaltet nur das Nest ab.
- ~~**Höchstmasse an Grow:** 2 kg → 120 kg (20 → 1200 Fasern). Ohne Grow ist die Höchstmasse 0, jeder gilt als ausgewachsen.~~ [VERWORFEN, 14. November 2026] Höchstmasse fest (Vorgabe Entwickler).
- **61 cm = die heutige größte Darstellung** (Welt-Radius 8 px, halber Tile). Das passt zur Größenklasse G5 (50–100 cm, Fuchs, Hund, Kind; GDD-07). Die Pixel ändern sich also nicht.
- **Größte Größe bei 120 kg statt bei Wachstum 19:** Größe und Größenbonus der Stärke erreichen ihr Maximum heute erst bei Wachstum 19, also bei etwa 10 Millionen Fasern; das erreicht niemand. Neu: `PLAYER_SIZE_GROWTH_MAX` = Wachstum bei 1200 Fasern = log2(1 + 1200/20) ≈ 5,9. Die Formel des Wachstums bleibt.
- **Alte Spielstände:** Was über 120 kg liegt, kommt als Fasern ins Lager. So geht nichts verloren.
- ~~**Kugel oder flach?** Eine Kugel aus 80 kg Schleim (etwa so dicht wie Wasser) hat nur rund 53 cm Durchmesser. 90 cm Durchmesser hätte erst eine Kugel mit etwa 380 kg. Passend wird es, wenn der Blob flach ist wie das Vorbild: eine Kuppel mit 90 cm Durchmesser und etwa 23 cm Höhe wiegt rund 80 kg. Von oben sieht man sie als runde Scheibe, wie im Spiel. Vorschlag: so verstehen.~~ [VERWORFEN, 14. November 2026] Der Entwickler hat Kugel gewählt, mit 120 kg und 61 cm.

~~**Zu klären 1: Was heißt „ausgewachsen“?** Vorschlag Höchstmasse an Grow 20 → 620 Fasern (Wachstum 1 → 5); Alternative: feste Höchstmasse in `balance.ts`.~~ [VERWORFEN, 14. November 2026] Entschieden wie oben: feste Höchstmasse, 120 kg.

**Größe beim Erheben**

**Vorgabe (Entwickler, 14. November 2026):** Beim Erheben werden nicht einfach alle vorhandenen Fasern in Körpermasse umgewandelt. Niedergelassene Blobs dürfen aber wachsen.

**Begründung (Entwickler):** Sonst könnte man Wachstumssprünge erzeugen: viele Pflanzenfasern sammeln, niederlassen und wieder erheben.

So gefasst (Vorschlag Claude, übernommen 15. November 2026):
- Die Körpermasse eines niedergelassenen Blobs wächst nur durch Grow, im normalen Verdauungstempo, wie beim Reisenden. Beim Erheben behält er diese Körpermasse; die übrigen Fasern bleiben im Lager.
- Wartet man niedergelassen, wächst man also genau so viel, wie man auch als Reisender beim Warten gewachsen wäre. Das passt zur Regel für HP und MP (4.7).
- Ob ein niedergelassener Blob abspalten darf, richtet sich nach seiner jetzigen Körpermasse und der jetzigen Höchstmasse. ~~Steigt Grow, wächst er aus seinem Lager nach.~~ [VERWORFEN, 14. November 2026] Die Höchstmasse steigt nicht mit Grow; ändert sie der Entwickler, wächst der Blob nach (siehe oben).

~~Vorgabe (Entwickler): Beim Niederlassen wird die aktuelle Größe als höchste Größe gespeichert.~~ [VERWORFEN, 14. November 2026] Präzisiert durch den Entwickler: Es ging nur darum, dass beim Erheben nicht alle Fasern in Masse umgewandelt werden; niedergelassene Blobs dürfen wachsen. Damit sind auch diese Folgerungen von Claude hinfällig: ~~Niedergelassene Blobs wachsen nicht; Grow-Erfahrung durch Verdauen nur beim Reisenden. Abspalten erlaubt, wenn der Blob beim Niederlassen ausgewachsen war (Vermerk).~~

**Niedergelassen, aber nicht ausgewachsen**

**Vorgabe (Entwickler, 14. November 2026):** Niederlassen geht immer, auch nicht ausgewachsen. Ein nicht ausgewachsener niedergelassener Blob kann sich nur erheben, nicht abspalten (bisher Lesart B). Dass man so vom Nest Miniblobs abspalten und überall niederlassen kann („Miniblob-Farm“), nimmt der Entwickler in Kauf.

**Begründung (Entwickler):** Niedergelassen kann ein Idle-Farm-Modus sein.

~~Begründung offen. Vorschlag Claude: Ein Miniblob kann seinen Fortschritt jederzeit durch Niederlassen sichern und muss dafür nicht erst auswachsen.~~ [VERWORFEN, 14. November 2026] Ersetzt durch die Begründung des Entwicklers.

~~Empfehlung Claude: Lesart A, Niederlassen nur ausgewachsen. Begründung: Bei B könnte man vom Nest kostenlos Miniblobs abspalten und überall niederlassen; jeder davon erntet selbsttätig.~~ [VERWORFEN, 14. November 2026] Der Entwickler hat B gewählt und die Miniblob-Farm in Kauf genommen.

**Bisherige Fassung**

> **[VERWORFEN, 14. November 2026]** Ersetzt durch die Vorgabe des Entwicklers oben (Kosten = Fasern für einen ausgewachsenen Körper).
>
> **Vorgabe (Entwickler):** Abspalten kostet Ressourcen.
>
> Vorschlag:
> 1. 10 Pflanzenfasern. Sie sind verbraucht und landen bei keinem Blob.
> 2. Was an Fasern fehlt, wird mit Körpermasse bezahlt (1 Faser = 1 Masse).
> 3. Reicht beides nicht, kann man dort nicht abspalten. **Ausnahme: das Nest.** Es kann immer abspalten und zahlt, was es hat, notfalls nichts.
> 4. Grow verdaut die letzten 10 Fasern im Lager nicht (Reserve fürs Abspalten).
>
> **Begründung (Vorschlag Claude, offen):**
> - Pflanzenfasern sind die erste Ressource, die der Blob sammelt (Gras im Nest). So lernt man den Kreislauf gleich zu Beginn: Gras sammeln, abspalten, reisen.
> - Ohne Kosten gäbe es nach dem Vertrocknen keinen Grund, vorsichtig zu sein.
> - Punkt 2 und 3: Niemand darf festsitzen. Das Nest kann immer abspalten, und zum Nest kann man immer springen. Wäre jedes leere Lager kostenlos, könnte man nach einmal „Alles mitnehmen“ für immer umsonst abspalten, und das Vertrocknen kostete nur noch den Weg.
> - Punkt 4: Grow verdaut 2–30 Fasern pro Minute. Ohne Reserve wäre das Lager fast immer leer, und Abspalten würde praktisch immer mit Körpermasse bezahlt.
> - ~~Das Nest kann nicht eingezogen werden und sich nicht erheben (Vorgabe Entwickler, Abschnitt 2 und 4.4).~~ [VERWORFEN, 14. November 2026] Einziehen gibt es nicht mehr (4.5).
> - Das Nest kann sich nicht erheben, und beim Verschmelzen geht immer der Reisende auf (Vorgabe Entwickler, Abschnitt 2 und 4.5). So bleibt es immer da.

### 7.2 Verteilen (Dialog)

Der Dialog erscheint beim Abspalten. ~~… und beim Verbinden mit einem niedergelassenen Blob.~~ [VERWORFEN, 14. November 2026] Verbinden gestrichen (4.4).

```
Neuer Reisender
Körpermasse 45 / 120 kg
  (nicht ausgewachsen,
   148 HP)
Verteilen        bleibt · nimmt mit
Pflanzenfaser     0 ─●─  0
Chitin            3 ─●─  3
[Nichts] [Hälfte] [Alles]
         [Fertig]
```

Oben steht, wie groß der neue Reisende wird (7.1). ~~Zeile „Körpermasse“ mit Schieberegler~~ [VERWORFEN, 14. November 2026] Die Körpermasse wird nicht mehr verteilt (7.1).

- Je Ressource ein Schieberegler. Voreingestellt ist halbe-halbe (Vorgabe Entwickler). Bei ungerader Menge bleibt das übrige Stück beim niedergelassenen Blob.
- Die Knöpfe stellen alle Regler auf einmal: nichts, Hälfte oder alles mitnehmen.
- Die Summe bleibt immer gleich. Nichts wird dupliziert, nichts geht verloren.
- ~~Unter der Körpermasse steht, wie viel maxHP und Stärke der Reisende damit hat.~~ [VERWORFEN, 14. November 2026] Steht jetzt oben beim neuen Reisenden.
- Das Spiel pausiert, solange der Dialog offen ist, wie bei den anderen Menüs.
- **Vorschlag Claude (übernommen 15. November 2026):** Unter „Fertig“ steht „Abbrechen“; dann wird nicht abgespalten und nichts verteilt.
- **Begründung (Vorschlag Claude, übernommen):** Wer nur nachsehen will, wie groß der Reisende würde, soll nicht abspalten müssen. Der Knopf „Abspalten“ öffnet jetzt erst den Dialog, deshalb braucht es einen Weg zurück.
- Sind nach dem Körper keine Ressourcen übrig, steht dort „Keine Ressourcen zu verteilen.“ Ohne Fasern im Lager steht zusätzlich der Hinweis, dass der Reisende winzig wird.

---

## 8. Tätigkeit niedergelassener Blobs

**Vorgabe (Entwickler):** Niedergelassene Blobs können aktiv sein: analysieren, absorbieren, sammeln. Dieser Fortschritt soll nicht in jedem Frame berechnet werden. Er ergibt sich aus der Zeit seit dem letzten Moment, in dem man dort war bzw. sich mit ihm verbunden hat.

### 8.1 Grundidee: nachrechnen bei Bedarf

Jeder niedergelassene Blob merkt sich, bis zu welcher Spielzeit sein Stand berechnet ist. Nachgerechnet wird nur bei einem Anlass:
- Das Bewusstsein springt zu ihm.
- Ein Reisender verschmilzt mit ihm.
- Die Karte zeigt seine Werte (nur zur Anzeige, ohne zu speichern).

**Vorgabe (Entwickler, 14. November 2026):** Im niedergelassenen Zustand gibt es keine aktiven Skills. Skills stehen nur innerhalb der Tätigkeiten zur Fertigung bereit; Analyze und Absorb zählen in dieser Form dazu (8.4).

**Begründung (Vorschlag Claude, übernommen):** Niedergelassen ist der Idle-Farm-Modus (7.1); man stellt ein, was der Blob tut, statt selbst zu handeln.

Was daraus folgt (Vorschlag Claude, übernommen 14. November 2026):
- **Die Tätigkeit läuft weiter, auch wenn das Bewusstsein dort ist.** Sie wird dann laufend in Stücken zu 60 s Spielzeit nachgerechnet, so sieht man den Fortschritt. Die Antwort des Entwicklers auf das Ruhen war „Nein“.
- **Nichts zählt doppelt:** Am niedergelassenen Blob erntet man nicht von Hand, und die gerechnete Arbeit nimmt die echten Wesen nicht weg (kein sichtbares Abweiden, Abschnitt 10).
- Die Skill-Leiste zeigt dort keine Absorb- und Analyze-Knöpfe, sondern Tätigkeit, Abspalten, Wechseln und, außer beim Nest, Erheben (13.5).
- **Erwachen im Nest:** Auch dort wählt man eine Tätigkeit, statt von Hand zu analysieren. Lichtsinn und Kriechen kommen dann über die Zeit. Wie schnell das geht, wird beim Umsetzen geprüft (Abschnitt 12).

**Vorgabe (Entwickler, 14. November 2026):** Beim Erwachen ist keine Tätigkeit voreingestellt. Analysieren und Absorbieren beginnen erst, wenn der Nutzer sie wählt; das Spiel erklärt diesen ersten Schritt.

**Begründung (Entwickler):** So kann der Nutzer besser entdecken und die Grundlagen lernen.

~~**Solange das Bewusstsein bei ihm ist, ruht die selbsttätige Arbeit.**~~ [VERWORFEN, 14. November 2026] Ersetzt durch die Vorgabe oben. ~~Man absorbiert und analysiert dann von Hand, mit der **Arbeitsreichweite** als Reichweite und nur an friedlichen Wesen (8.3; Reichweite und Ziele übernommen 14. November 2026). Begründung (Vorschlag Claude, offen): Sonst würden dieselben Wesen doppelt geerntet, einmal gerechnet und einmal echt. Mit der normalen Reichweite eines kleinen Blobs erreichte man das Gras im Nest nicht. Und von Hand Wölfe zu absorbieren, ohne angreifbar zu sein, wäre derselbe Freifahrtschein wie in 8.3.~~

### 8.2 Uhr

Es zählt die **Spielzeit**, also nur die Zeit, in der das Spiel läuft, nicht die echte Uhrzeit.

**Vorgabe (Entwickler, 14. November 2026):** Erstmal nur Spielzeit. Fortschritt bei geschlossenem Spiel (Idle-Farming) bleibt als Idee für später (Abschnitt 15, „Später“).

Begründung (Vorschlag Claude, übernommen): Wie bei der Überdehnung (GDD-02 Abschnitt 8.5) bringt eine verstellte Geräte-Uhr nichts, und das Spiel bleibt gerecht für Leute, die wenig spielen.

Hinweis für die Umsetzung: Das Nachwachsen der Wesen in der echten Welt läuft heute über die echte Uhrzeit (`Date.now()`), das Nachrechnen über die Spielzeit. Beides misst Sekunden, die Werte passen also zusammen.

### 8.3 Was er erreicht

**Arbeitsreichweite** = 48 px beim frischen Blob bis 96 px ausgewachsen, mit dem Wachstum ansteigend wie der Körperradius (Vorgabe Entwickler, 15. November 2026). Das Nest gilt als ausgewachsen und hat 96 px. Das Adernetz breitet sich weiter aus als ein runder Körper. Die 48 px reichen, damit das Nest die Grashalme erreicht, die 25–37 px vom Startpunkt liegen (Abschnitt 12).

Begründung (Vorschlag Claude, übernommen): Mit der bisherigen Formel galt immer das Minimum, denn die doppelte Reichweite kommt im Spiel nie über 40 px. Ein Miniblob hätte so genau so viel geerntet wie ein ausgewachsener. Jetzt bringen große Blobs mehr und Miniblob-Farmen weniger.

~~**Arbeitsreichweite** = das Größere aus Reichweite × 2 und 48 px.~~ [VERWORFEN, 15. November 2026] Siehe oben.

~~**Mindestabstand:** Niedergelassene Blobs müssen mindestens 2 × Arbeitsreichweite voneinander entfernt sein. Begründung (Vorschlag Claude, offen): Sonst ernten zwei Blobs denselben Grasfleck doppelt.~~ [VERWORFEN, 14. November 2026] **Vorgabe (Entwickler):** Mindestabstand und Höchstzahl werden weggelassen. Begründung (Vorschlag Claude, übernommen): Sonst könnte das Verschmelzen mit einem vertrockneten Blob blockiert sein, und man käme nicht mehr an seinen Stand.

**Doppeltes Ernten: der nächste Blob erntet** (Vorschlag Claude, übernommen 14. November 2026; der Entwickler hat um einen Vorschlag gebeten)
- Jedes Wesen in der Welt hat einen festen Entstehungsort (`generateChunk`, Seed). Es gehört dem niedergelassenen Blob, der diesem Ort am nächsten liegt, sofern es in dessen Arbeitsreichweite liegt.
- Nur dieser Blob erntet es. Überlappen sich zwei Arbeitsreichweiten, teilt die Mittellinie zwischen beiden das Gebiet.
- **Wann neu verteilt wird:** Wenn ein Blob niedergelassen wird, sich erhebt oder durch Verschmelzen entsteht. Ebenso, wenn seine Reichweite durch Wachsen größer wird. Vorher werden die Nachbarn in Reichweite bis jetzt nachgerechnet, damit die vergangene Zeit noch mit der alten Verteilung zählt.
- Begründung (Vorschlag Claude, übernommen): Nichts wird doppelt geerntet, und es braucht keine Verbotsregel. Zwei Blobs dicht nebeneinander bringen zusammen nicht mehr als einer, das Zusammenrücken lohnt sich also nicht. Der Aufwand ist klein, weil nur bei diesen seltenen Anlässen neu verteilt wird.
- Erntet ein Reisender von Hand neben einem niedergelassenen Blob, zählt das weiterhin doppelt. Das wird hingenommen, weil Ernte von Hand langsam ist.
- **Bei der Umsetzung (Schritt 6):** „Am nächsten“ heißt: der nächste unter den Blobs, deren Arbeitsreichweite den Ort enthält (bestätigt vom Entwickler, 15. November 2026). **Begründung (Vorschlag Claude, übernommen):** Mit unterschiedlich großen Reichweiten könnte sonst ein Ort in der Reichweite eines großen Blobs liegen, aber knapp näher an einem kleinen, der ihn nicht erreicht. Dann erntete ihn niemand. Bei gleich großen Reichweiten ist das Ergebnis dasselbe: die Mittellinie teilt.

Welche Wesen in dieser Reichweite vorkommen, lässt sich ohne geladene Welt bestimmen. Die Welt entsteht immer gleich aus ihrem Startwert (`generateChunk`, Seed). Gespeichert wird eine kleine Liste: Wesen-Art, Anzahl, Respawn-Zeit. Wächst die Reichweite (mehr Körpermasse), wird die Liste beim nächsten Nachrechnen neu bestimmt.

Erreichbar sind nur Wesen, die sich nicht wehren (`behavior: passive`): Gras, Würmer, Schnecken …

Vorschlag Claude, übernommen 14. November 2026. Begründung (Vorschlag Claude, übernommen): Ein unverwundbarer Blob, der Wölfe absorbiert, wäre ein Freifahrtschein. Pflanzen und Kleintiere passen zum Bild der Fabrik.

### 8.4 Tätigkeit

Am niedergelassenen Blob stellt man eine Tätigkeit ein:
- **Ruhen:** nichts.
- **Analysieren:** Erfahrung, keine Materialien.
- **Absorbieren:** Erfahrung und Materialien.

Passive Skills laufen mit: Grow verdaut Fasern aus seinem Lager bis ausgewachsen, Sehen sammelt Erfahrung.

Begründung (Vorschlag Claude, übernommen 15. November 2026): Das sind dieselben Möglichkeiten wie beim Reisenden, nur ohne Kampf. Herstellen kommt später dazu (Abschnitt 15).

Das sind die einzigen Wege, wie ein niedergelassener Blob Skills nutzt (Vorgabe Entwickler, 8.1).

~~**Rückmeldung (Vorschlag Claude, offen, v0.8.5):** Ist das Bewusstsein beim niedergelassenen Blob, steigt nach jeder Aktion (alle 6 s) ein kurzer Text über ihm auf: „🔍 +1,0 XP · Neues 9 %“. Er zeigt die Erfahrung der Kern-Fähigkeit und, solange noch ein Skill zu entdecken ist, wie weit der nächste Fund ist. Ohne Wesen in Reichweite steht dort „nichts in Reichweite“. Im Nest, blind und unbeweglich, wechselt der Hinweis nach der Wahl auf: „Du tastest die Wesen neben dir ab. Jede Aktion bringt ein wenig Erfahrung. Hab Geduld — nach und nach lernst du etwas Neues.“~~
~~**Begründung (Vorschlag Claude, offen):** Der Entwickler bemerkte, dass nach der Wahl von Analysieren scheinbar nichts geschieht. Die Tätigkeit lief, aber die ersten Skills kommen erst nach gut einer Minute (im Nest nach 66 s: Licht spüren, Kriechen und Wachsen zugleich), und bis dahin war nichts zu sehen. Die Wesen selbst bleiben unberührt, es gibt also weiter kein sichtbares Abweiden (Abschnitt 10).~~ [VERWORFEN, 15. November 2026] Ersetzt durch die Vorgaben unten (v0.8.6). Grund: Der Entwickler fand es zu langsam und wollte, dass die Anzeige stehen bleibt und mitzählt, statt sich zu überschreiben.

**Aktionsdauer — Vorgabe (Entwickler, 15. November 2026):** eher eine Aktion pro Sekunde statt alle 6 s (`ACTION_SECONDS` = 1). Der Anfang darf nicht langweilig werden, muss aber auch nicht zu schnell gehen, solange man etwas dazugewinnt. **Begründung (Entwickler):** Mit 6 s dauerte es zu lange; selbst eine Aktion pro Sekunde ist langsamer als früher von Hand. Folge: Im Nest kommen die ersten Skills nach gut 10 s statt nach 66 s. Dieselbe Regel gilt beim Nachrechnen, also analysieren auch Blobs ohne Bewusstsein sechsmal so viel; beim Absorbieren bremst weiter das Nachwachsen der Wesen.

**Anzeige unter dem Blob — Vorgabe (Entwickler, 15. November 2026):** Die Anzeige für Gelerntes und Absorbiertes bleibt länger und aktualisiert sich, statt sich zu überschreiben. Bekommt derselbe Skill mehrfach Erfahrung, wächst die Zahl in seiner Zeile; verschiedene Dinge stehen parallel untereinander. Umgesetzt in `ui/GainFeed.ts`: je Skill, Kern-Fähigkeit und Material eine Zeile („🐌 Kriechen +2,1 XP“, „🌿 Pflanzenfaser +3“), dazu „✨ Nächster neuer Skill 61 %“. Gilt für die Tätigkeit, für Absorbieren und Analysieren von Hand (dort ersetzt sie die Meldung, die sich überschrieb) und für Erfahrung durch Bewegen.
- Vorschlag Claude (offen): Eine Zeile bleibt 5 s nach ihrer letzten Änderung stehen, danach beginnt die Zählung neu; höchstens 7 Zeilen; die Liste steht unter dem Blob, damit oben der Hinweistext frei bleibt; im Querformat (wenig Höhe) rechts neben ihm. Erfahrung durch Sehen (läuft jede Sekunde nebenher) steht nicht in der Liste. **Begründung (Vorschlag Claude, offen):** Sonst stünde dort immer eine Zeile, die nichts mit dem Tun des Spielers zu tun hat.

**Neue Skills vorstellen — Vorgabe (Entwickler, 15. November 2026):** siehe GDD-02 Abschnitt 6 („Skill-Vorstellung“).


### 8.5 Rechnung

Die Zeit seit dem letzten Nachrechnen wird in Stücken zu 60 s gerechnet, bei sehr langer Zeit in größeren Stücken, sodass es höchstens 500 werden. Je Stück und Wesen-Art:

```
Versuche =
  Zeit / 1 s × Anteil  (bis 15. November 2026: 6 s)
Absorbieren höchstens:
  Anzahl × Zeit / Respawn
Erfolge =
  Versuche × Erfolgschance
Erfahrung =
  Erfolge × XP je Erfolg
Materialien =
  Erfolge × Fundchance
  × Menge
Skill-Fund =
  Erfolge × Skill-Chance
  (Analysieren × 0,7)
```

- **6 s** = Dauer einer Aktion (VORLÄUFIG).
- **Anteil** = Anteil dieser Art an allen erreichbaren Wesen.
- **Skill-Chance** = Chance, mit der diese Art einen Skill lehrt (wie beim Absorbieren und Analysieren von Hand).

- **Mittelwerte statt Würfel:** Das Nachrechnen ergibt immer dasselbe, egal wie oft und in welchen Stücken. Bruchteile (0,4 Faser) werden aufgehoben und beim nächsten Mal weitergezählt.
- **Stücke statt eines Schritts:** Die Erfahrung je Erfolg sinkt, je weiter ein Skill schon ist. In Stücken gerechnet, wird das unterwegs berücksichtigt.
- **Nur Absorbieren hängt an der Respawn-Zeit.** Analysieren entfernt keine Wesen (wie bisher, `EntitySystem`). Begründung (Vorschlag Claude, übernommen 15. November 2026): Absorbieren verbraucht, was da ist; Analysieren schaut nur hin.
- **Neue Skills:** Ergeben die aufsummierten Skill-Funde einer Art zusammen 1, wird ihr Skill entdeckt. Die Entdeckung selbst bringt noch keine Erfahrung, wie von Hand.
- **Verlernen gilt** wie sonst. Durch Lernen kommt ein niedergelassener Blob aber nicht in die Überdehnung (Vorgabe Entwickler, 6.2). Eine Überdehnung aus dem Verschmelzen schmilzt je Stück ab, wie im Spiel.
- **Kein Übertraining beim Nachrechnen,** auch keine Ermüdung (Vorschlag Claude, übernommen 14. November 2026). Begründung (Vorschlag Claude, übernommen): Die Arbeit verteilt sich gleichmäßig über lange Zeit; das ist keine Überanstrengung. Die Ermüdung gehört außerdem zum Bewusstsein (Abschnitt 5), und das war nicht dort.
- **„Zuletzt geübt“** wird auf die Zeit des jeweiligen Stücks gesetzt, nicht auf jetzt. Sonst gälten alle nachgerechneten Skills als gerade geübt, und das Verlernen träfe die falschen.
- **Kern-Fähigkeiten (Analyze, Absorb) lernen beim Nachrechnen wie jeder Skill** (Vorschlag Claude, übernommen 14. November 2026).
- ~~**Kern-Fähigkeiten (Analyze, Absorb) lernen beim Nachrechnen nicht.** Sie lernen nur durch eigenes Handeln.~~ [VERWORFEN, 14. November 2026] Regel gestrichen. ~~Begründung (Vorschlag Claude, offen): Sie haben keine Kapazitätsgrenze. Mehrere niedergelassene Blobs könnten sie sonst ohne Grenze hochtreiben.~~ [VERWORFEN, 14. November 2026] Mit dem Höchstwert je Skill (6.1) zählt nur der beste Blob, mehrere treiben nichts hoch. Deshalb gestrichen (Begründung Vorschlag Claude, übernommen). Passt auch zum Idle-Farm-Modus (7.1).

**Grenzen:** Die Respawn-Zeit begrenzt die Materialien, die Kapazität begrenzt die Erfahrung. Viele niedergelassene Blobs bringen trotzdem mehr Materialien. ~~Dafür gibt es eine Höchstzahl (Abschnitt 15).~~ [VERWORFEN, 14. November 2026] Keine Höchstzahl (Vorgabe Entwickler). Sehr viele Blobs verhindert stattdessen das teure Abspalten (7.1), und jedes Wesen erntet nur ein Blob (8.3).

**Wenig Quellen:** Heute gibt nur Gras Material, und Regenwurm und Schnecke leben nur in Wald und Sumpf. Außerhalb davon bringt ein niedergelassener Blob kaum etwas. Mehr friedliche Wesen und Materialien je Biom sind eine eigene Aufgabe (Abschnitt 15).

---

## 9. Vertrocknen (Tod)

**Vorgabe (Entwickler):** Der Blob stirbt nicht. Wird er besiegt, vertrocknet er an Ort und Stelle. Ressourcen und Erfahrung bleiben erhalten. ~~Das Bewusstsein springt zum nächstgelegenen niedergelassenen Blob.~~ [VERWORFEN, 14. November 2026: Sterbescreen, 9.1] Von dort kann man sich erneut abspalten, den vertrockneten Blob aufsuchen und sich mit ihm ~~verbinden~~ verschmelzen, um seine Erfahrung und Skills einzusammeln.

Dieses Verbinden heißt jetzt Verschmelzen; aus dem vertrockneten Blob wird dabei ein niedergelassener (Abschnitt 4.5, Vorgabe Entwickler, 14. November 2026). Statt des automatischen Sprungs erscheint der Sterbescreen (9.1).

### 9.1 Sterbescreen

**Vorgabe (Entwickler, 14. November 2026):** Beim Vertrocknen springt man nicht automatisch zum nächstgelegenen Blob. Stattdessen erscheint ein Sterbescreen.
- Ein kurzer Hinweis sagt, dass du gestorben bist und was das bedeutet: Der Blob ist zur Sicherheit an Ort und Stelle vertrocknet, und du musst bei einem anderen weitermachen.
- Vielleicht noch kurz: Du kannst den vertrockneten Blob wieder einsammeln, um die Erfahrung wiederherzustellen.
- Ein Knopf springt zum nächstgelegenen Blob.
- Oder man wählt auf der Karte einen Blob aus, so wie beim Wechsel zwischen den Blobs.

**Begründung (Entwickler):** Das macht das Verhalten nachvollziehbarer, insbesondere wenn man neu im Spiel ist.

~~Begründung offen. Vorschlag Claude: Der Spieler versteht, was passiert ist, und entscheidet selbst, wo er weitermacht.~~ [VERWORFEN, 14. November 2026] Ersetzt durch die Begründung des Entwicklers.

Entwurf (Vorschlag Claude, übernommen 14. November 2026):

```
     Du wurdest besiegt
Zum Schutz ist dein Körper
an Ort und Stelle eingetrocknet.
Mach bei einem anderen Blob
weiter. Verschmilzt du später
mit dem vertrockneten Blob,
bekommst du zurück,
was er dir voraushat.

Darin: 2 neue Skills,
  3 Skills höher, 12 Fasern

[Zum nächsten Blob: Wald 2, 85 m]
[Auf der Karte wählen]
```

- **Überschrift „Besiegt“** (Vorgabe Entwickler, 14. November 2026), im Entwurf „Du wurdest besiegt“. Begründung (Vorschlag Claude, übernommen): Der Blob stirbt nach der Vorgabe oben nicht, deshalb nicht „gestorben“. Der Name „Sterbescreen“ bleibt als Arbeitsname.
- ~~Überschrift „Du bist vertrocknet“ (Vorschlag Claude).~~ [VERWORFEN, 14. November 2026] Der Entwickler hat „besiegt“ gewählt.
- Die kurze Übersicht (was im vertrockneten Blob liegt) steht mit auf dem Sterbescreen. Sie zeigt nur, was er dem gewählten Blob voraushat: neue Skills, Skills mit höherer Erfahrung (je Skill gilt der Höchstwert, 6.1) und alle Ressourcen (übernommen 15. November 2026). ~~„bekommst du alles zurück“, „340 Erfahrung“~~ [VERWORFEN, 15. November 2026] Versprach eine Summe, die es mit dem Höchstwert nicht gibt.
- **Karte:** zeigt alle niedergelassenen Blobs wie beim Bewusstsein wechseln (4.2, 11). ~~Solange es die Karte noch nicht gibt (Umsetzung Schritt 7), ist es die Liste.~~ [erledigt, v0.8.4] Der Sterbescreen hat den Knopf „Auf der Karte wählen“; die Liste bleibt darunter. Schließt man die Karte ohne Wahl, erscheint wieder der Sterbescreen.
- Das Spiel hält an, solange der Sterbescreen offen ist, wie beim Speichern-Dialog (Vorgabe Entwickler, 15. November 2026). Speichern geht dort nicht, denn das Bewusstsein ist gerade bei keinem Blob. Das ist die einzige Ausnahme von Regel 3 (Abschnitt 2).

Ablauf:
1. HP ≤ 0: Ein offener Dialog wird geschlossen. Der Reisende wird zum vertrockneten Blob. Sein Stand wird eingefroren: Wissen, Ressourcen, zurückgehaltene Erfahrung. Gift und Status-Effekte verfallen.
2. Gegner verlieren ihre Aggro (wie bisher `resetAi`).
3. Der Sterbescreen erscheint (9.1).
4. Man wählt einen niedergelassenen Blob. Das Bewusstsein springt dorthin, er wird nachgerechnet.
5. Der vertrocknete Blob wird automatisch markiert; ein Richtungspfeil zeigt zu ihm (Abschnitt 11). Eine schon bestehende Markierung bleibt erhalten, dann zeigen zwei Pfeile. **Vorgabe (Entwickler, 14. November 2026).**

~~3. Das Bewusstsein springt zum niedergelassenen Blob, der dem Ort am nächsten liegt. Er wird nachgerechnet. 4. Eine kurze Übersicht zeigt, was im vertrockneten Blob liegt.~~ [VERWORFEN, 14. November 2026] Ersetzt durch den Sterbescreen (9.1).

### 9.2 Weitere Regeln

- Ein vertrockneter Blob bleibt dauerhaft liegen und kann vorerst nicht zerstört werden.
- Stirbt der nächste Reisende, bevor er den ersten vertrockneten Blob erreicht, liegen zwei in der Welt. Beide behalten ihren Stand. Wer beide einsammelt, bekommt von jedem, was er voraushat, und nichts zählt doppelt (Abschnitt 6.1).
- Hinweis an den Spieler, einmal nach dem ersten Abspalten: „Lässt du dich nieder, ist dein Fortschritt gesichert.“

**Preis fürs Vertrocknen:** Den Weg zurück, die Kosten fürs Abspalten und, bis zum Einsammeln, den Fortschritt seit dem letzten Niederlassen oder Verschmelzen. **Vorgabe (Entwickler, 14. November 2026):** Erstmal kein weiterer Preis; Materialien verderben nicht. Ob das reicht, zeigt das Spielen.

**[VERWORFEN, 14. November 2026, vom Entwickler bestätigt]** Den vertrockneten Blob vor dem Verbinden mit Wasser wiederbeleben (GDD-01 Abschnitt 10, GDD-03 Abschnitt 7). Grund: Der neue Ablauf des Entwicklers nennt nur das Aufsuchen und Verbinden.

---

## 10. Darstellung

**Vorgabe (Entwickler):** Ein niedergelassener Blob hat nicht mehr die runde Form, sondern sieht eher aus wie ein echter Schleimpilz: zerflossener und mit Adern. Vielleicht pulsiert er, um ihn vom vertrockneten Blob zu unterscheiden.

Alle Einzelheiten unten sind Vorschlag Claude (übernommen 15. November 2026). Alle drei Formen werden aus einfachen Formen gezeichnet, ohne Bilddateien, wie der Blob jetzt. Die Grundfarben bleiben die Grüntöne des Blobs (`#20a860`, `#40e890`, `#90ffcc`).

### 10.1 Niedergelassen: Adernetz

Vorbild ist das Plasmodium von *Physarum*: ein flacher Kern, aus dem verzweigte Adern laufen, an den Enden fächerförmige Wachstumsfronten.

- **Kern:** flache, unregelmäßige Form statt Kreis.
- **Adern:** 5–8 Hauptadern, jede verzweigt sich 1–2 Mal. Nach außen werden sie dünner und reichen bis zur Arbeitsreichweite (Abschnitt 8.3). Man sieht also, wie weit der Blob arbeitet.
- **Wachstumsfronten:** halb durchsichtige Fächer an den Aderenden.
- **Jeder sieht anders aus, aber immer gleich:** Die Form folgt aus der Nummer des Blobs.
- **Pulsieren:** Echte Schleimpilze pumpen ihr Plasma rhythmisch hin und her. Im Spiel läuft alle 2,4 s eine helle Welle vom Kern nach außen.
- **Bewusstsein hier:** Die Welle ist kräftiger, und der Kern leuchtet leicht.

Technik: Das Netz wird **einmal** als Bild gezeichnet. Das Pulsieren ist eine kleine Animation, die Helligkeit und Größe einer hellen Kopie verändert (Phaser-Tween). Es wird nicht in jedem Frame neu gezeichnet.

### 10.2 Reisend
Wie bisher: runder Blob.

### 10.3 Vertrocknet

Vorbild ist das Sklerotium, die Dauerform von *Physarum*: eine harte, krustige, verschrumpelte Masse.

- Kleiner als der Reisende war (etwa 70 % Radius), unregelmäßiger Umriss.
- Farbe stumpfes Ocker bis Braun (`#8a6a2a`, Schatten `#5a4418`), dunkle Risse.
- **Keine Bewegung, kein Leuchten, kein Pulsieren.**

Der Gegensatz: Lebend heißt grün und pulsierend, vertrocknet heißt braun und still.

**Vorgabe (Entwickler, 14. November 2026):** Die Unterscheidung durch Pulsieren und Farbe reicht, kein zusätzliches Symbol. Abweiden ist erstmal nicht sichtbar.

~~**Offen:** Reicht das Pulsieren zur Unterscheidung, oder kommt zusätzlich ein Symbol über die Blobs? Und soll man sehen, wie ein niedergelassener Blob Gras „abweidet“, z. B. kleine Partikel, die zum Netz wandern? (Abschnitt 15)~~ [VERWORFEN, 14. November 2026] Entschieden, siehe oben.

---

## 11. Karte und Richtungspfeile

**Vorgabe (Entwickler):** Vertrocknete Blobs werden auf einer Karte angezeigt; dafür braucht das Spiel eine Karte. Jeder Blob-Standort steht auf der Karte, niedergelassene wie vertrocknete. Man kann Standorte markieren. Nach dem Schließen der Karte zeigt am Bildschirmrand ein Pfeil in Richtung des markierten Blobs, damit man sich immer orientieren kann. Beim Vertrocknen wird automatisch markiert; eine vorher gesetzte Markierung bleibt, dann gibt es zwei Pfeile.

Alle Einzelheiten unten sind Vorschlag Claude (übernommen 15. November 2026).

### 11.1 Karte
- Neuer Reiter **„Karte“** im Spielmenü, gebaut wie die anderen Reiter (ohne Phaser).
- Hintergrund: die Biome der 20 × 20 Chunks in ihren Grundfarben (GDD-04).
- **Nebel:** Nur besuchte Chunks sind aufgedeckt (Vorgabe Entwickler, 14. November 2026). Begründung (Vorschlag Claude, übernommen): Erkunden bleibt Entdecken.
- **Markierter Blob:** Auf der Karte zeigt ein Pfeil über ihm auf ihn (Vorgabe Entwickler, 14. November 2026).
- **Marker:** niedergelassen (grünes Netz), vertrocknet (braun), Reisender (Punkt mit Blickrichtung). Der Blob mit dem Bewusstsein ist hervorgehoben.
- **Tipp auf einen Marker** zeigt: Name, Form, Entfernung, bei niedergelassenen die Tätigkeit und den Ertrag pro Stunde. Knöpfe: **Markieren / Markierung entfernen**, wenn erlaubt **Bewusstsein wechseln**.
- **Liste** unter der Karte: alle Blobs. Das ist die Liste aus der Vorgabe zum Springen.
- **Namen:** automatisch „Nest“, dann Biom und Nummer („Wald 2“). Umbenennen später.

### 11.2 Richtungspfeile
- Mehrere Blobs können zugleich markiert sein.
- Für jeden markierten Blob außerhalb des Bildschirms zeigt am Rand ein Pfeil zu ihm, mit Name und Entfernung.
- Pfeile zu vertrockneten Blobs sind braun, zu niedergelassenen grün. So hält man zwei Pfeile auseinander.
- Ist der Blob auf dem Bildschirm, verschwindet der Randpfeil, und über ihm erscheint ein kleiner Pfeil, wie auf der Karte (Vorgabe Entwickler, 14. November 2026: Pfeil über ihm und am Bildschirmrand).
- ~~Verbindet man sich mit einem markierten vertrockneten Blob, verschwindet er und mit ihm die Markierung.~~ [VERWORFEN, 14. November 2026] Neue Richtung beim Verschmelzen (4.5).
- Verschmilzt man mit einem markierten Blob, entfällt die Markierung, denn man ist selbst dort. Aus einem vertrockneten Blob wird dabei ein niedergelassener; sein Marker auf der Karte wird grün.
- Die Pfeile liegen als HTML über dem Spielfeld. Ihre Lage wird in jedem Frame aus zwei Positionen berechnet; das kostet fast nichts.

---

## 12. Spielstart im Nest

**Vorgabe (Entwickler):** Das Spiel beginnt mit einem niedergelassenen Blob. Er erwacht, analysiert und bekommt mit der Fähigkeit Bewegen die Möglichkeit zu reisen, also die Form reisender Blob.

**Vorgabe (Entwickler, 14. November 2026):** Dieser erste Blob, das Nest, kann nicht zerstört werden, bleibt immer an seiner Stelle und kann sich nicht erheben (Abschnitt 2, „Das Nest“). Reisen heißt also immer: abspalten.

Änderungen am Erwachen (GDD-09 Abschnitt 5):
- **Start:** Der Nest-Blob ist niedergelassen und blind. Regenwurm, Schnecke und die drei Grashalme liegen in seiner Arbeitsreichweite. Die Grashalme liegen heute 25–37 px vom Startpunkt entfernt. Die normale Reichweite eines frischen Blobs ist nur etwa 10 px, die Mindest-Arbeitsreichweite von 48 px (8.3) reicht aber. Das Nest muss also nicht umgebaut werden.
- **Erster Schritt:** Das Spiel erklärt, wie man eine Tätigkeit wählt (Analysieren oder Absorbieren). Voreingestellt ist keine (Vorgabe Entwickler, 8.1).
- **Lichtsinn und Kriechen in beliebiger Reihenfolge,** wie bisher.
- **Lichtsinn gelernt:** Man sieht jetzt das eigene Adernetz und das Gras.
- **Kriechen gelernt:** Text: „Du könntest einen Teil von dir losschicken.“ Der Knopf **Abspalten** erscheint.
- **Nach dem Abspalten:** Hinweis: „Wirst du besiegt, machst du bei einem niedergelassenen Blob weiter, zu Beginn im Nest. Lässt du dich nieder, ist dein Fortschritt gesichert.“ ~~„Wirst du besiegt, kehrt dein Bewusstsein ins Nest zurück.“~~ [VERWORFEN, 14. November 2026] Sterbescreen (9.1).
- ~~Die Texte zur Trockenstarre beim Erwachen bleiben; sie sprechen nicht von Wasser.~~ [VERWORFEN, 15. November 2026] Vorgabe Entwickler: Der Blob erwacht einfach, nicht aus der Trockenstarre; das Warum bleibt ein Mysterium (GDD-11 Abschnitt 3). Der heutige Text „Du erwachst.“ passt dazu.

**Erstes Abspalten kostenlos** (folgt aus 7.1: Das Nest kann immer abspalten. Ohne Fasern ist der erste Reisende so klein wie beim Erwachen). Begründung (Vorschlag Claude, übernommen 15. November 2026): Sonst muss man im Nest warten, bis genug Gras nachwächst. Ein ausgewachsener Körper kostet 1200 Fasern (7.1); drei Grashalme geben zusammen nur 3–9. ~~Drei Grashalme geben zusammen nur 3–9 Fasern, und Grow (von Gras gelernt) verdaut Fasern selbst weg. Bis 10 Fasern dauerte es oft 1–2 Minuten.~~ [VERWORFEN, 15. November 2026] Die 10 Fasern Kosten gibt es nicht mehr.

---

## 13. Datenmodell und Speichern

### 13.1 Neue Typen (`src/types/Blob.ts`)

```ts
type BlobForm =
  "settled" | "traveling" | "dried";

interface KnowledgeEntry {
  xp: number;
  // je Skill eine Zahl (6.1)
  peakXp: number;
  discoveredAt: number;
  lastPracticedAt: number;
}

interface BlobState {
  id: string;   // "b1", "b2" …
  name: string;
  form: BlobForm;
  x: number; y: number;
  knowledge:
    Record<string, KnowledgeEntry>;
  materials: Record<string, number>;
  bodyMass: number;
  pending: Record<string, {
    pendingXp: number;
    updatedAtMs: number; }>;
  // zurückgehaltene Erfahrung
  // (Ermüdung: im GameState)
  enabledSkills:
    Record<string, boolean>;
  activeSkillSlots: (string|null)[];
  // nur niedergelassen:
  simulatedUntil?: number;
  activity?:
    "rest" | "analyze" | "absorb";
  sources?: { entityId: string;
    count: number;
    respawnSeconds: number }[];
  carry?: Record<string, number>;
  nest?: true;
  // das Nest: unzerstörbar,
  // kann sich nicht erheben
  hp?: number; mp?: number;
  // gemerkt fürs Erheben (4.7)
  // nur vertrocknet:
  driedAt?: number;
}
```

[VERWORFEN, 14. November 2026] `earned` (Herkunftszähler je Blob) und `forgotten` in `KnowledgeEntry`. Grund: Höchstwert je Skill (6.1).

Im `GameState` kommen dazu:
- `blobs`: alle Blobs außer dem Reisenden, der als Arbeitskopie im `PlayerState` lebt (13.2)
- `consciousBlobId`
- `markedBlobIds`: Liste, mehrere Markierungen möglich (Abschnitt 11)
- `nextBlobNumber`: IDs werden nie wiederverwendet
- `visitedChunks`: besuchte Chunks für den Nebel
- `fatigue`: Ermüdung je Skill, gehört zum Bewusstsein (Abschnitt 5), mit ihren Zeitstempeln
- `world.playtimeSeconds` (13.3) und die Gesamt-Statistiken (Absorbs, Lebenserfahrung)

### 13.2 Arbeitskopie: Die bestehenden Systeme bleiben

Gespielt wird immer mit einer **Arbeitskopie** des Blobs, bei dem das Bewusstsein ist. Bei Verschmelzen, Abspalten, Niederlassen, Erheben, Vertrocknen, Wechseln und Speichern wird sie zurückgeschrieben.

Die Arbeitskopie ist der bisherige `PlayerState`. Kampf, Skills und Fortschritt arbeiten weiter darauf, unverändert.
- **Anlegen:** Wissen, Ressourcen, Körpermasse, zurückgehaltene Erfahrung und Skill-Leiste des Blobs werden in den `PlayerState` kopiert.
- **Zurückschreiben:** umgekehrt, einfach kopieren. Mit dem Höchstwert je Skill (6.1) muss nichts mehr verglichen werden.
- ~~**Anlegen:** Erfahrung je Skill = Summe „verdient“ − „verlernt“. Dazu Ressourcen, zurückgehaltene Erfahrung, Skill-Leiste. Der Stand beim Anlegen wird als Ausgangswert gemerkt.~~ [VERWORFEN, 14. November 2026] Keine Herkunftszähler mehr (6.1); ebenso der folgende Punkt.
- ~~**Zurückschreiben:** Je Skill wird verglichen, was sich seit dem Anlegen geändert hat. Der Zuwachs von `totalXpEarned` (je gutgeschriebene Erfahrung, sinkt nie) kommt in die eigene Spalte „verdient“. Die Differenz zwischen diesem Zuwachs und dem Zuwachs der Erfahrung ist verlernt worden und kommt zu „verlernt“. Neu entdeckte Skills und die Kern-Fähigkeiten werden genauso erfasst. **Danach wird der Ausgangswert neu gesetzt**, sonst zählte das nächste Zurückschreiben (z. B. beim nächsten Speichern) dieselbe Änderung noch einmal.~~
- Für das Nachrechnen eines niedergelassenen Blobs (Abschnitt 8) wird kurz eine eigene Arbeitskopie angelegt und danach zurückgeschrieben. Statt `gainExperience` schreibt eine eigene Funktion die Erfahrung gut: ohne Ermüdung und ohne echte Uhrzeit, mit der Spielzeit des Rechenstücks als „zuletzt geübt“. Kapazität und Überdehnung (`tickProgression`) laufen je Stück wie im Spiel. Begründung (Vorschlag Claude, übernommen 15. November 2026): `gainExperience` rechnet immer Übertraining und nimmt die echte Uhrzeit.

**Begründung (Vorschlag Claude, übernommen 15. November 2026):** Der Eingriff bleibt klein. Die neue Verrechnung sitzt an wenigen, klar benannten Stellen. ~~Verdientes und Verlerntes werden getrennt erfasst, nicht nur der Saldo. Das ist nötig, weil „verlernt“ beim Verbinden anders zusammengeführt wird als „verdient“.~~ [VERWORFEN, 14. November 2026] Grund entfällt (6.1).

### 13.3 Uhr

Eine Spielzeit für alle Blobs: `world.playtimeSeconds`. Sonst ließen sich „zuletzt geübt“ und „berechnet bis“ verschiedener Blobs nicht vergleichen. `player.playtimeSeconds` bleibt als Spiegel dieser Uhr. Es wird 17-mal in 7 Dateien benutzt, die so unverändert bleiben.

### 13.4 Spielstand-Version 6 (alte Spielstände)
- **Nest** (b1, `nest: true`): niedergelassen am Startpunkt (400, 300). Wissen = das bisherige Wissen des Spielers, keine Materialien, Körpermasse 0, keine zurückgehaltene Erfahrung, Tätigkeit Ruhen.
- **Reisender** (b2): an der bisherigen Position, dasselbe Wissen, alle Materialien, die ganze Körpermasse, die zurückgehaltene Erfahrung. Das Bewusstsein ist hier; die bisherige Ermüdung wird die des Bewusstseins.
- Niemand verliert etwas, und der neue Checkpoint ist das Nest. Das Nest kann immer abspalten (7.1).

### 13.5 Was sich in bestehenden Teilen ändert
- **Gegner (`AiSystem`):** Ist das Bewusstsein bei einem niedergelassenen Blob, gibt es kein Ziel; Gegner greifen nicht an.
- **Steuerung je Form:** Joystick nur beim Reisenden. Berührt er einen anderen Blob, erscheint Verschmelzen. Die Skill-Leiste zeigt beim niedergelassenen Blob Tätigkeit, Abspalten, Wechseln und, außer beim Nest, Erheben; keine aktiven Skills (8.1). ~~Absorb, Analyze~~ [VERWORFEN, 14. November 2026]
- **WERTE-Reiter:** beim niedergelassenen Blob Tätigkeit, Quellen, Ertrag pro Stunde statt Tempo und Angriffen.
- **INDEX-Reiter:** neue Regeln und Formeln eintragen (Verrechnung, Kosten, Nachrechnen).
- **Speichermenü:** zeigt den Namen des Blobs mit Bewusstsein.
- **Erwachen (`IntroSystem`):** „kann sich bewegen“ heißt beim niedergelassenen Blob „kann abspalten“.
- **Körpermasse:** „schrumpft nie“ (GDD-02 Abschnitt 8.10, Kommentar in `GameState.ts`) gilt nicht mehr. Beim Verschmelzen wird sie wieder zu Pflanzenfasern (7.1). ~~Sie wird verteilt und kann als Ersatzkosten fürs Abspalten verbraucht werden.~~ [VERWORFEN, 14. November 2026]
- **Grow:** verdaut nur bis ausgewachsen (Höchstmasse, 7.1), auch im niedergelassenen Blob, nie im Nest (gilt als ausgewachsen). Neue feste Höchstmasse in `src/data/grow.ts`. ~~Neuer Effekt Höchstmasse am Skill (`src/data/skills.ts`).~~ [VERWORFEN, 14. November 2026]
- **Größe (`balance.ts`):** `PLAYER_SIZE_GROWTH_MAX` ≈ 5,9 statt 19, damit 120 kg die größte Größe ist (7.1). ~~Lässt 10 Fasern als Reserve im Lager.~~ [VERWORFEN, 14. November 2026] Kosten jetzt nach 7.1.

---

### 13.6 Technische Klarstellungen (Prüfrunde 3)

Alles in diesem Abschnitt: Vorschlag Claude aus Prüfrunde 3, übernommen 15. November 2026.

- **Zurückgehaltene Erfahrung und Höchstwert (6.1):** Beim Verschmelzen wird je Skill Erfahrung plus zurückgehaltene Erfahrung verglichen. Ergebnis: Erfahrung = der größere der beiden Erfahrungswerte; zurückgehalten = was dem größeren Gesamtwert noch fehlt. Begründung: Sonst käme die zurückgehaltene Erfahrung später obendrauf, und im Beispiel 6.1 stünden am Ende 180 statt 150.
- **Uhr der zurückgehaltenen Erfahrung:** Spielzeit statt echter Uhrzeit (`updatedAtMs` → Spielzeit, 8.2). Bei Blobs ohne Bewusstsein wird sie beim Nachrechnen je Stück nach Spielzeit freigegeben. **Bei der Umsetzung (Schritt 3):** Die zurückgehaltene Erfahrung bleibt im Fortschritt jedes Skills und wird wie bisher in Echtzeit freigegeben (GDD-02 Abschnitt 8.7), sobald der Blob wieder Arbeitskopie ist. Ein eigener Spielzeit-Takt dafür war nicht nötig.
- **Kein Übertraining durch Tätigkeiten,** auch nicht, solange das Bewusstsein dort ist. Ermüdung entsteht nur durch eigenes Handeln als Reisender. Begründung: folgt aus „Kein Übertraining beim Nachrechnen“ (8.5); die laufende Tätigkeit ist dasselbe Nachrechnen.
- **Kleinere Stücke, solange das Bewusstsein da ist:** je Aktion (6 s) statt 60 s. Sonst sieht man beim Erwachen im Nest mindestens eine Minute lang nichts.
- **Kapazität im niedergelassenen Blob (6.2):** Grenze = das Größere aus Kapazität und Summe vorher; nicht Kapazität × 1,2 wie beim Reisenden. Das gilt auch, wenn sich ein Reisender in der Überdehnung niederlässt. Beim Nachrechnen läuft je Stück nur das Abschmelzen der Überdehnung, nicht die Erholung von der Ermüdung (`tickProgression` aufteilen).
- **Skill-Funde je Skill (8.5):** Ein Wesen kann mehrere Skills lehren (Regenwurm: Lichtsinn und Kriechen). Die Funde werden je Skill aufsummiert, nicht je Wesen-Art.
- **„Bewegungs-Skill bekannt“** heißt entdeckt, nicht eingeschaltet.
- **Niederlassen:** Gift und Status-Effekte verfallen; Effekte passiver Skills bleiben (wie heute bei `executeCheckpoint`).
- **Erheben (4.7):** Die Regeneration über die niedergelassene Zeit wird aus der vergangenen Spielzeit berechnet. HP höchstens bis zur maxHP des Körpers, auch beim Verschmelzen mit einem vertrockneten Blob.
- **Alte Spielstände (13.4):** Körpermasse über 120 kg kommt als Fasern ins Lager. Kennt ein alter Spielstand noch keinen Bewegungs-Skill, entsteht nur das Nest, und das Bewusstsein ist dort. Der Reisende erscheint mit Abstand zum Nest, nicht darin.
- **Texte des Erwachens (`IntroSystem.INTRO_TEXT`):** müssen neu geschrieben werden. Heute ist dort von Wasser, Trockenstarre, „Analysiere oder absorbiere“ und dem Joystick die Rede. Neu: Tätigkeit wählen (8.1), Abspalten statt Joystick (12). Die Texte lege ich bei der Umsetzung vor.

## 14. Umsetzung in Schritten

Jeder Schritt ist für sich spielbar und bekommt eine eigene Version.

1. **Wissen verrechnen:** Höchstwert je Skill, Kapazitätsprüfung danach (6). **Umgesetzt (v0.7.6):** `systems/KnowledgeSystem.ts` (`mergeKnowledge`, `transferConsciousness`) und `ProgressionSystem.enforceCapacityLimit`; geprüft mit Simulation (Beispiel 6.1, zurückgehaltene Erfahrung, Wiederholung, Grenze +20 %, Zeitpunkte, Ermüdung). Noch ohne Wirkung im Spiel. `types/Blob.ts` und `data/blobs.ts` kommen mit Schritt 2 und 3.
   - Prüfen mit Simulationen: Beispiel 6.1, wiederholtes Verschmelzen und Abspalten, Grenze nach dem Verschmelzen.
   - Dateien: `types/Blob.ts`, `data/blobs.ts` (Stellschrauben mit Begründungen), `systems/KnowledgeSystem.ts`
   - ~~Tabelle, Anlegen, Zurückschreiben, Zusammenführen, Kapazität; Simulationen zu 6.3, 6.4, doppeltem Verlernen, Zurückschreiben zweimal hintereinander, Basis abziehen, Speichergröße~~ [VERWORFEN, 14. November 2026] Herkunftszähler entfallen (6.1).
2. **Datenmodell ohne neue Spielregeln:** Spielstand v6, Arbeitskopie, Weltuhr. Es gibt nur einen Blob, den Reisenden; das Nest kommt erst mit Schritt 3 dazu (Migration in 13.4 entsprechend in zwei Teilen). Das Spiel muss sich genau wie vorher spielen. **Umgesetzt (v0.7.7):** `types/Blob.ts`, `systems/BodySerializer.ts`; `GameState` hat `conscious`, `blobs`, `nextBlobNumber`, `markedBlobIds`; Spielstand v6 mit Migration 5 → 6 (der bisherige Spieler wird der Reisende „b1“); das Speichermenü zeigt den Namen des Blobs. Als Weltuhr dient `player.playtimeSeconds`, das beim Wechsel des Körpers mitgeht (`transferConsciousness`). Geprüft mit Simulation (Speichern und Laden, Migration, unabhängige Kopien).
   - Dateien: `GameState.ts`, `SaveSystem.ts`, `GameScene.ts`
3. **Abläufe:** Niederlassen, Abspalten, Verschmelzen, Erheben, Vertrocknen, Wechseln (als Liste), Sterbescreen (9.1, Auswahl erst als Liste), Start im Nest (unzerstörbar), Gegner ohne Ziel, Steuerung je Form. Verteilen erst fest halbe-halbe. Einfache Platzhalter-Grafik und ein Richtungspfeil zum vertrockneten Blob. `executeCheckpoint` entfällt. Feste Höchstmasse und Größe bei 120 kg.
   - **Umgesetzt (v0.8.0):** `data/blobs.ts`, `systems/BlobSystem.ts`, `systems/SettlementSystem.ts` (Tätigkeit mit Mittelwerten, Nachrechnen inkl. Grow, Regeneration und Abschmelzen), `ui/BlobActions.ts` (Knöpfe je Lage), `ui/BlobPicker.ts` (Sterbescreen und Liste zum Wechseln, hält das Spiel an), `ui/BlobArrows.ts` (Pfeile zu markierten Blobs). Spielstand v7: Migration 6 → 7 legt das Nest an (13.4, 13.6). Gegner ignorieren niedergelassene Blobs und wandern. Neues Spiel startet im Nest, keine Tätigkeit voreingestellt; neue Texte fürs Erwachen (`IntroSystem`). Der Sterbescreen ist schon hier umgesetzt, nicht erst in Schritt 4. Geprüft im Browser (alle Abläufe, Sterbescreen, Speichern und Laden) und mit Simulation (Migration). Quellen der Tätigkeit: Momentaufnahme der friedlichen Wesen in Arbeitsreichweite; „der nächste Blob erntet“ folgt in Schritt 6.
   - **Einfache Tätigkeit schon hier** (Vorschlag Claude aus Prüfrunde 3, übernommen 15. November 2026): Analysieren und Absorbieren als Tätigkeit, gerechnet an den Wesen in Arbeitsreichweite, noch ohne Quellen-Liste und WERTE-Anzeige. Sonst könnte das Nest ab Schritt 3 weder Kriechen lernen noch abspalten, weil es dort keine aktiven Skills gibt (8.1).
   - Dateien: `systems/BlobSystem.ts`, `AiSystem.ts`, `IntroSystem.ts`, `BiomeDefinitions.ts`, `GameScene.ts`, `SkillBar.ts`, `data/grow.ts` (Höchstmasse), `GrowSystem.ts` (verdaut nur bis ausgewachsen), `balance.ts` (`PLAYER_SIZE_GROWTH_MAX` 19 → ≈ 5,9)
4. **Verteilen-Dialog** — `ui/TransferDialog.ts`. ~~Sterbescreen — `ui/DeathScreen.ts`~~ [umgesetzt in Schritt 3 als `ui/BlobPicker.ts`]
   - **Umgesetzt (v0.8.1):** `ui/TransferDialog.ts` (je Ressource ein Schieberegler, Nichts / Hälfte / Alles, Fertig, Abbrechen; hält das Spiel an). `BlobSystem.previewSplit` liefert Größe, HP und die Ressourcen nach Abzug der Fasern für den Körper; `split` nimmt die gewählten Mengen (ohne Angabe halbe-halbe, `defaultSplitTake`). Geprüft im Browser bei 400 px Breite (Anzeige, Abbrechen, Alles, einzelner Regler, Summe bleibt gleich).
5. **Darstellung:** Adernetz mit Pulsieren, vertrocknete Kruste — `GameScene.ts` oder eigene Datei im Ordner `scenes/`
   - **Umgesetzt (v0.8.2):** `scenes/BlobRenderer.ts`. Kern, 5–8 Hauptadern mit 1–2 Verzweigungen bis zur Arbeitsreichweite, Wachstumsfronten; Form aus der Blob-Nummer. Die Pulswelle ist eine helle Kopie des Netzes, die per Tween in 2,4 s vom Kern nach außen wächst und verblasst; die Blobs pulsieren versetzt, nicht im Gleichtakt. Mit Bewusstsein ist die Welle kräftiger und der Kern leuchtet. Der niedergelassene Blob mit Bewusstsein wird ebenso gezeichnet; der runde Blob ist nur noch der Reisende. Der Kreis um die Arbeitsreichweite aus Schritt 3 entfällt, weil die Adern sie zeigen. Vertrocknet: Kruste mit Schatten und Rissen. Neu gebaut wird nur, wenn sich Form, Größe oder Ort ändern. Geprüft im Browser mit Bildschirmfotos.
6. **Tätigkeit niedergelassener Blobs, vollständig:** Quellen, nächster Blob erntet (8.3), Nachrechnen, WERTE-Anzeige — `systems/SettlementSystem.ts`, `StatsView.ts`
   - **Umgesetzt (v0.8.3):** Quellen aus den Entstehungsorten der Weltgenerierung (`SettlementSystem.passiveSpawnsNear`, je Chunk einmal gerechnet) statt der Momentaufnahme lebender Wesen. `assignSources` verteilt jeden Ort an den nächsten Blob, der ihn erreicht; `BlobSystem.reassignSources` läuft beim Niederlassen, Erheben, Verschmelzen, Wechseln, beim Laden und wenn die Reichweite des Blobs mit Bewusstsein wächst (`workRange` im Blob merkt sich die Reichweite der letzten Verteilung). Nachbarn, deren Quellen sich ändern, werden vorher bis jetzt nachgerechnet. Die Rechnung steckt in `planActivity` (ändert nichts); `runActivity` wendet sie an, und der WERTE-Reiter zeigt mit ihr Tätigkeit, Arbeitsreichweite, Quellen und Ertrag pro Stunde (Aktionen, Erfahrung je Skill, Funde neuer Skills, Materialien). Tempo und Angriffe sind dort ausgeblendet. Blind stehen Quellen und neue Skills als „❓ Etwas“ da (GDD-09). Geprüft im Browser (Nest am Start, Blob 40 px neben dem Nest teilt die Quellen, Erheben gibt sie zurück, Nachrechnen des Nachbarn, WERTE-Anzeige).
7. **Karte:** Nebel, Markieren, mehrere Richtungspfeile — `ui/MapView.ts`, `GameMenu`, `GameScene.ts`
   - **Umgesetzt (v0.8.4):** Reiter „Karte“ im Spielmenü (`ui/MapView.ts`, Canvas ohne Phaser). Biome in ihren Grundfarben (`TilesetGenerator.biomeBaseColor`), Nebel über nicht besuchten Chunks (`GameState.visitedChunks`, Spielstand v8; Migration 7 → 8 deckt den Startchunk und die Chunks mit Blobs auf). Marker für niedergelassen, vertrocknet und reisend; der Blob mit Bewusstsein hat einen weißen Ring, markierte Blobs einen Pfeil darüber. Zoom mit − / +, Verschieben durch Ziehen. Tipp auf Marker oder Listeneintrag: Name, Form, Entfernung; niedergelassen Tätigkeit, Ertrag pro Stunde und Lager (zur Anzeige nachgerechnet, ohne zu speichern, 8.1); vertrocknet, was er dir voraushat. Knöpfe Markieren / Markierung entfernen und Bewusstsein wechseln. Sterbescreen: „Auf der Karte wählen“ mit „Hier weitermachen“. Geprüft im Browser (Wahl aus dem Sterbescreen, Schließen ohne Wahl, Markieren, Wechseln, Speichern und Laden, Migration).
   - **Bei der Umsetzung (Vorschlag Claude, übernommen 15. November 2026):** Ein Chunk gilt als besucht, sobald der Blob mit Bewusstsein in ihm ist. **Begründung (Vorschlag Claude, übernommen):** Ein Chunk ist 1024 px groß, etwa so groß wie ein Bildschirm bei kleinem Zoom; feiner zu rechnen bringt auf der Karte wenig. Die Marker zeigen nur eigene Blobs, deshalb auch im Nebel.

Zu jedem Schritt werden GDD, INDEX und TODO.md nachgezogen: GDD-01 Abschnitt 10, GDD-02 Abschnitt 8.10, GDD-03 Abschnitt 7, GDD-09 Abschnitt 5 und die Dateitabelle in CLAUDE.md.

---

## 15. Offene Punkte

**Stand 15. November 2026: Alle Fragen sind beantwortet.** Auch die Ergebnisse der dritten Prüfrunde sind entschieden. Es fehlt nur das ausdrückliche Go des Entwicklers für die Umsetzung.

**Entscheidungen des Entwicklers** (jeweils mit Begründung):
1. ~~Wasser zum Wiederbeleben ganz gestrichen? (Abschnitt 9)~~ → Ja, raus (14. November 2026).
2. ~~Kosten fürs Abspalten: 10 Fasern, Rest mit Körpermasse, nur das Nest notfalls kostenlos, Grow lässt 10 Fasern Reserve? (7.1, 12)~~ → Entschieden 14. November 2026: Fasern für einen ausgewachsenen Körper, sonst kleiner; Gutschrift beim Verschmelzen (Vorgabe Entwickler, 7.1). Niederlassen auch nicht ausgewachsen, dann nur Erheben: entschieden 14. November 2026 (Vorgabe Entwickler mit Begründung: Idle-Farm-Modus). feste Höchstmasse, Kugel mit höchstens 120 kg und 61 cm, Nest kann immer abspalten, beim Erheben keine Fasern in Masse umwandeln, niedergelassene Blobs dürfen wachsen: entschieden 14. November 2026 (Vorgaben Entwickler). Umrechnung 1 Faser = 0,1 kg: vorerst übernommen 14. November 2026.
3. ~~Niederlassen nur ohne Aggro?~~ → Ja (14. November 2026). ~~Darf man sich unter Aggro in einen berührten niedergelassenen Blob zurückziehen? (3)~~ → Zurückziehen ist jetzt Verschmelzen, auch nur ohne Aggro (übernommen 14. November 2026, 4.5).
4. ~~Spielzeit oder auch echte Zeit bei geschlossenem Spiel? (8.2)~~ → Erstmal nur Spielzeit (14. November 2026); Idle-Farming später.
5. ~~Höchstzahl niedergelassener Blobs (Vorschlag 5) oder Unterhalt, z. B. Fasern je Stunde? (8.5)~~ → Entschieden 14. November 2026: keine Höchstzahl; teures Abspalten statt dessen (Vorgabe Entwickler, 7.1, 8.5).
6. ~~Einziehen erlauben (4.4)? Und soll ein niedergelassener Blob auch selbst wieder aufbrechen können, also ohne Abspalten wieder zum Reisenden werden?~~ → Aufbrechen entschieden 14. November 2026: **Erheben**, nicht beim Nest (Vorgabe Entwickler, 4.7). Ablauf des Erhebens übernommen (4.7). ~~Einziehen entschieden: muss möglich sein, nicht beim Nest (Vorgabe Entwickler, 4.4).~~ [VERWORFEN, 14. November 2026] → Verschmelzen (4.5). Name und Richtung entschieden 14. November 2026: **Verschmelzen**, der Reisende geht im anderen Blob auf, auch beim vertrockneten; Ergebnis immer ein niedergelassener Blob (Vorgabe Entwickler, 4.5). Verschmelzen mit dem Nest erlaubt und nur ohne Aggro: übernommen 14. November 2026. Abstand und Höchstzahl entfallen (8.3). Ablauf im Einzelnen übernommen 14. November 2026 (4.5). Erledigt.
7. ~~Nur friedliche Wesen für niedergelassene Blobs? (8.3)~~ → Ja (14. November 2026).
8. ~~Selbsttätige Arbeit ruht, solange man selbst dort ist? (8.1)~~ → Nein (14. November 2026): Niedergelassen gibt es keine aktiven Skills, nur Tätigkeiten (Vorgabe Entwickler, 8.1). Begründung und Folgen übernommen 14. November 2026. Tätigkeit beim Erwachen: keine voreingestellt, erst auf Aktion des Nutzers (Vorgabe Entwickler, 14. November 2026, 8.1, 12).
9. ~~Lernen Kern-Fähigkeiten beim Nachrechnen nicht? (8.5)~~ → Regel gestrichen 14. November 2026: Sie lernen wie jeder Skill (8.5).
10. ~~Ermüdung gehört zum Bewusstsein statt zum Körper? (5)~~ → Ja (14. November 2026).
11. ~~Reicht der Preis fürs Vertrocknen, oder verderben Materialien im vertrockneten Blob teilweise? Vertrocknete Blobs sind sonst unverwundbare Lager. (9)~~ → Erstmal nichts weiter (14. November 2026).
12. ~~Die Verrechnung mit Herkunftszählern (6.2) und Verlernen als eine gemeinsame Zahl je Skill (6.5)?~~ → Entschieden 14. November 2026: je Skill nur der Höchstwert (Vorgabe Entwickler, 6.1). Verlernen und Kapazität danach: übernommen 14. November 2026 (6.2).
13. ~~Niederlassen als Grundfähigkeit? (3)~~ → Ja, aber erst mit Bewegen verfügbar (14. November 2026).
14. ~~Die festen Regeln aus Abschnitt 2.~~ → Regeln 1–3 entschieden 14. November 2026: Bewusstsein nur zwischen niedergelassenen Blobs, höchstens ein Reisender; das Nest ist unzerstörbar (Vorgaben Entwickler, Abschnitt 2). Regel 4 und die Begründung des Entwicklers fürs Nest ebenfalls entschieden (14. November 2026). Erledigt.
15. ~~Nebel auf der Karte? (11.1)~~ → Ja; markierter Blob mit Pfeil über ihm und am Rand (14. November 2026).
16. ~~Ein Symbol über den Blobs zusätzlich zum Pulsieren? (10)~~ → Nein, reicht (14. November 2026).
17. ~~Sichtbares „Abweiden“ durch niedergelassene Blobs? (10)~~ → Erstmal nicht (14. November 2026).
18. ~~Darf Verbinden Erfahrung senken (6.5)?~~ → Entfällt mit dem Höchstwert (6.1); nur die Kapazitätsprüfung kann noch senken (6.2).
19. ~~Grenze nach dem Verschmelzen: Kapazität bzw. bisherige Summe statt Obergrenze der Überdehnung? (6.2)~~ → Kapazität erweitert sich nur durch Verschmelzen und sinkt dann langsam (Vorgabe Entwickler, 14. November 2026). Begründung und Obergrenze +20 % übernommen 14. November 2026.
20. ~~Kein Übertraining beim Nachrechnen? (8.5)~~ → Ja (14. November 2026).
21. ~~Reichweite und erlaubte Ziele, wenn man selbst am niedergelassenen Blob ist (8.1)?~~ → Passt (14. November 2026). Entfällt inzwischen: Am niedergelassenen Blob handelt man nicht mehr von Hand (8.1).
22. ~~Mindestabstand zwischen niedergelassenen Blobs? (8.3)~~ → Entschieden 14. November 2026: weggelassen (Vorgabe Entwickler). Gegen doppeltes Ernten: der nächste Blob erntet, übernommen 14. November 2026 (8.3).
23. ~~Zurückgehaltene Erfahrung wird nicht kopiert (5)?~~ → Ja (14. November 2026). ~~Doppelt schnelles Wiedererlernen in zwei Zweigen wird hingenommen (6.6)?~~ → Entfällt mit dem Höchstwert (6.3).
24. ~~Alle übrigen Regeln, die mit *Vorschlag Claude (offen)* gekennzeichnet sind, bestätigen.~~ → Übernommen 15. November 2026 (Liste B), auch die Zeitpunkte beim Verschmelzen (6.3). Alle Fragen beantwortet.
25. ~~Verbinden (beide bleiben)~~ → Gestrichen 14. November 2026 (Vorgabe Entwickler, 4.4).
26. ~~Sterbescreen: Überschrift und Text?~~ → Überschrift „besiegt“ entschieden 14. November 2026. Text des Entwurfs übernommen 14. November 2026 (9.1).
27. ~~Heilung durch Verschmelzen und Erheben vermeiden: wie? (4.5)~~ → Der niedrigere HP- und MP-Anteil gilt (15. November 2026).

**Später:**
- **Channeling für Absorb und Analyze** (Idee des Entwicklers, 14. November 2026, für später): Absorb und Analyze sollen etwas Zeit in Anspruch nehmen, und in dieser Zeit können sie unterbrochen werden. Siehe GDD-02 Abschnitt 7.
- Idle-Farming: Fortschritt niedergelassener Blobs auch bei geschlossenem Spiel (Idee des Entwicklers, 14. November 2026; 8.2)
- Herstellen: aus Fasern neue Materialien (Status: Konzept)
- Form wandeln: Gestalt von Tieren oder Menschen annehmen, dann auch größer als 120 kg und 61 cm (Vorgabe Entwickler, 7.1; Status: Konzept)
- Können Gegner niedergelassene oder vertrocknete Blobs angreifen?
- Niedergelassene Blobs umbenennen
- Mehr friedliche Wesen und Materialien je Biom, damit niedergelassene Blobs überall etwas finden (8.5)
- Alle Zahlen abstimmen: Höchstmasse, Aggro-Sperre, Arbeitsreichweite, Aktionsdauer, Pulsdauer. ~~Kosten, Höchstzahl~~ [VERWORFEN, 14. November 2026] Kosten jetzt nach 7.1, keine Höchstzahl.

---

*Letzte Aktualisierung: 15. November 2026 — kein Erwachen aus der Trockenstarre (Vorgabe Entwickler, 12); davor 15. November 2026 — Aktion pro Sekunde, Anzeige unter dem Blob, die mitzählt (Vorgaben Entwickler, 8.4, v0.8.6); Rückmeldung von v0.8.5 verworfen; davor 15. November 2026 — Rückmeldung je Aktion und Hinweis im Nest nach der Wahl der Tätigkeit (Vorschlag, 8.4, v0.8.5); davor 15. November 2026 — „am nächsten“ unter den Blobs, die den Ort erreichen (8.3), und „besucht“ = Bewusstsein war im Chunk (14) vom Entwickler bestätigt; davor 15. November 2026 — Schritt 7 umgesetzt (v0.8.4), GDD-10 vollständig umgesetzt; „besucht“ = Bewusstsein war im Chunk (Vorschlag, 14); Schritt 6 umgesetzt (v0.8.3), „am nächsten“ unter den Blobs, die den Ort erreichen (Vorschlag, 8.3); Schritt 5 umgesetzt (v0.8.2); Schritt 4 umgesetzt (v0.8.1), „Abbrechen“ im Verteilen-Dialog als Vorschlag (7.2), vom Entwickler bestätigt („passt so“); Schritt 3 umgesetzt (v0.8.0); Schritt 2 umgesetzt (v0.7.7); Schritt 1 umgesetzt (v0.7.6); davor 15. November 2026 — Heilung beim Verschmelzen: der niedrigere Anteil gilt (4.5); technische Klarstellungen 13.6 übernommen; alle Punkte entschieden, Umsetzung wartet auf Go; davor 15. November 2026 — Kapazität: nur die Überdehnung kommt durch Verschmelzen (bestätigt, 6.2); Sterbescreen-Text „was er dir voraushat“ (9.1); davor 15. November 2026 — Wachstumssprung durch Verschmelzen und Abspalten als bekannte Schwäche (7.1); Arbeitsreichweite 48 → 96 px mit der Größe (8.3); Heilung durch Verschmelzen und Erheben vermeiden (4.5, Weg offen) — alles Vorgaben des Entwicklers; davor 15. November 2026 — Nest gilt als ausgewachsen und wächst nicht (Vorgabe Entwickler, 7.1); Sterbescreen hält das Spiel an wie der Speichern-Dialog (Vorgabe Entwickler, 9.1); Begründung des Entwicklers für „Niederlassen erst mit Bewegen“ (3); Dritte Prüfrunde (Konzept): technische Klarstellungen als Vorschlag (13.6), Umsetzungsschritte 2 und 3 gegen Festsitzen im Nest angepasst, Nachrechnen beim Verlassen, Dialog-Beispiel 148 HP; davor 15. November 2026 — Dritte Prüfrunde (Doku) eingearbeitet: Status und Kennzeichnung aktualisiert, veraltete Reste zu Verbinden, automatischem Sprung, 10 Fasern und Einziehen markiert, Verweise berichtigt, Ausnahme von Regel 3 beim Sterbescreen; davor 15. November 2026 — Alle übrigen Vorschläge übernommen (Liste B, Punkt 24), auch die Zeitpunkte beim Verschmelzen (6.3); alle offenen Fragen beantwortet; davor 14. November 2026 — Erwachen: keine Tätigkeit voreingestellt, erst auf Aktion des Nutzers (Vorgabe Entwickler, 8.1, 12); Channeling für Absorb und Analyze als Idee für später; davor 14. November 2026 — Begründungen und Folgen zu 6.2 und 8.1 übernommen, Obergrenze +20 % nach dem Verschmelzen, zurückgehaltene Erfahrung nicht kopieren (Punkt 23); davor 14. November 2026 — Vorgaben des Entwicklers: niedergelassen keine aktiven Skills, nur Tätigkeiten (8.1); Wasser endgültig raus; kein weiterer Preis fürs Vertrocknen; Nebel, kein Symbol, kein sichtbares Abweiden, Pfeil über markiertem Blob (10, 11); Kapazität nur durch Verschmelzen erweiterbar (6.2); davor 14. November 2026 — Entscheidungen zu den offenen Punkten 3, 4, 6, 7, 10, 13, 20, 21; Idle-Farming als Idee für später; davor 14. November 2026 — Text des Sterbescreens übernommen; Analyze und Absorb lernen beim Nachrechnen wie jeder Skill (8.5); davor 14. November 2026 — Überschrift des Sterbescreens „besiegt“ (Vorgabe Entwickler, 9.1); davor 14. November 2026 — Sterbescreen statt automatischem Sprung zum nächsten Blob (Vorgabe Entwickler mit Begründung, 9.1); davor 14. November 2026 — Umrechnung 1 Faser = 0,1 kg vorerst übernommen; davor 14. November 2026 — Begründungen des Entwicklers für 120 kg und 61 cm und für Lesart B (Idle-Farm) eingetragen (7.1); davor 14. November 2026 — Feste Höchstmasse statt mit Grow steigend; ändert sie sich, bleibt die Größe und der Blob wächst nach (Vorgabe Entwickler, 7.1); davor 14. November 2026 — Präzisiert (Vorgabe Entwickler): niedergelassene Blobs dürfen wachsen, nur beim Erheben werden die Fasern nicht in Masse umgewandelt (4.7, 7.1, 8.3, 8.4, 13); davor 14. November 2026 — Größte Größe: Kugel mit 120 kg und 61 cm statt 80 kg und 90 cm (Vorgabe Entwickler, 7.1); davor 14. November 2026 — Vorgaben des Entwicklers: Höchstmasse an Grow, höchstens 80 kg und 90 cm, Form wandeln später; Nest kann immer abspalten; Größe beim Niederlassen speichern (gegen Wachstumssprünge); der nächste Blob erntet übernommen; Umrechnung und Folgen als Vorschlag (7.1, 4.7, 8.3, 8.4, 13, 15); davor 14. November 2026 — Verbinden gestrichen, Verschmelzen reicht (Vorgabe Entwickler, 4.4); Niederlassen auch nicht ausgewachsen, dann nur Erheben (Vorgabe Entwickler, 7.1); davor 14. November 2026 — Vorgaben des Entwicklers: je Skill nur der Höchstwert statt Herkunftszählern (6); Abspalten kostet Fasern für einen ausgewachsenen Körper, sonst kleiner, Gutschrift beim Verschmelzen (7.1); Mindestabstand und Höchstzahl weggelassen (8.3, 8.5); Vorschläge: Höchstmasse an Grow, Niederlassen nur ausgewachsen, Nest kann immer abspalten, der nächste Blob erntet; Abschnitte 3, 4, 5, 7.2, 12, 13, 14, 15 angepasst; davor 14. November 2026 — Verschmelzen mit dem Nest erlaubt und nur ohne Aggro übernommen; davor 14. November 2026 — Verschmelzen statt Einziehen (Vorgabe Entwickler): der Reisende geht im niedergelassenen oder vertrockneten Blob auf, Ergebnis immer niedergelassen; Ablauf und Folgefragen als Vorschlag (4.5); Abschnitte 1, 2, 3, 4, 5, 7.1, 8.1, 9, 11.2, 13.5, 14, 15 angepasst; davor 14. November 2026 — Begründung des Entwicklers fürs Nest (Unsterblichkeit), Ablauf des Erhebens übernommen, Einziehen als Vorgabe mit Begründung des Entwicklers (Name offen), Regel 4 bestätigt; davor 14. November 2026 — erste Entscheidungen des Entwicklers: Nest unzerstörbar, ortsfest und ohne Erheben (Abschnitt 2, 12); Erheben übernommen, nicht beim Nest (3, 4.7, Ablauf als Vorschlag); Bewusstsein nur zwischen niedergelassenen Blobs, höchstens ein Reisender, mit Begründung des Entwicklers (2); offene Punkte 6 und 14 teilweise entschieden; davor 14. November 2026 — zweite Prüfrunde eingearbeitet: Ermüdung gehört zum Bewusstsein, eigene Gutschrift beim Nachrechnen, Reichweite und Ziele vor Ort, Kosten nur im Nest notfalls frei, Grow-Reserve, Grenze nach dem Verbinden, Verbinden kann Erfahrung senken, Mindestabstand, Ausgangswert beim Zurückschreiben, Basis abziehen statt Falten, Beispiel 6.4 Schritt 6 berichtigt, Kennzeichnungen ergänzt; davor überarbeitet nach Konzept- und Doku-Prüfung: Verlernen als eine gemeinsame Zahl (kein doppeltes Verlernen, nie negativ), Ersatzkosten gegen Festsitzen, Ermüdung kopieren, Reihenfolge, Speicherbedarf, Nachrechnen ohne Übertraining und ohne Kern-Fähigkeiten, Arbeit ruht vor Ort, Einziehen, Nest-Umbau, Umsetzung in 7 Schritten, handytaugliche Gliederung; davor Erstfassung mit mehreren Markierungen (Vorgabe Entwickler)*
