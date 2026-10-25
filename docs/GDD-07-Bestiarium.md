# ABSORB & EVOLVE — Game Design Document
## Datei 07: Bestiarium — Einheiten auf dem Weg vom Wald in die Stadt

> Status: Diskussion — erster Entwurf, noch nichts davon implementiert (außer den als *vorhanden* markierten Einheiten)

---

## 1. Rahmen

**Vorgabe (Entwickler):** Eine Liste von ca. 100 Einheiten, denen der Blob auf seinem Weg aus dem Wald zu einer Siedlung bzw. Stadt begegnet. Natürliche Einheiten (echte Welt) sind häufig, Fantasy-Wesen selten.
> Begründung offen (für das Verhältnis natürlich/Fantasy)

~~**Vorgabe (Entwickler):** Die Einheiten werden entlang des Weges größer.~~ **[VERWORFEN]** — war zu pauschal formuliert. Nicht alle Einheiten sollen entlang des Weges größer werden, nur die Gegner, gegen die man kämpfen kann (siehe unten).

**Vorgabe (Entwickler):** Nicht die Einheiten insgesamt werden entlang des Weges größer, sondern die Gegner, gegen die man kämpfen kann. Ihre Größe steigt mit dem Fortschritt des Blobs. Daneben darf es in jeder Etappe auch deutlich größere und stärkere Einheiten geben. Sie ignorieren den kleinen Blob, und er kann sie ebenfalls ignorieren (größenabhängiges Aggro, siehe [GDD-03 Abschnitt 4](GDD-03-Kampfsystem.md#größen--und-levelabhängiges-aggro)).
**Begründung (Entwickler):** Zum einen bringt das mehr Fortschritt ins Spiel. Zum anderen soll über die Größe noch einiges an Spieldynamik abgebildet werden. Gebiete, für die der Blob eigentlich noch zu klein ist, können so auch sehr starke Gegner enthalten, die man zunächst einfach ignorieren kann, weil sie den Blob ebenfalls ignorieren.

Der Weg ist in **7 Etappen** gegliedert. Die Größenangaben je Etappe beschreiben die **Gegner, mit denen der Blob dort typischerweise kämpft**. Größere Einheiten (z. B. Hirsch, Bär, Pferd) gehören als „Hintergrund-Riesen“ dazu: Sie sind da, beachten den Blob aber nicht, solange er klein ist.

**Begründung Etappen (Vorschlag Claude):** Die Etappen folgen dem natürlichen Übergang Wildnis → Kulturland → Siedlung. Jede Etappe hat damit ein eigenes Thema (Bodenleben, Waldtiere, Feldtiere, Nutztiere, Menschen), und die Größe steigt mit der Nähe zum Menschen fast von selbst.

### Größenklassen

| Klasse | Bezeichnung | Reale Größe | Beispiele |
|--------|-------------|-------------|-----------|
| G1 | winzig | < 1 cm | Ameise, Zecke, Springschwanz |
| G2 | sehr klein | 1–3 cm | Käfer, Spinne, Wespe |
| G3 | klein | 3–10 cm | Schnecke, Maus, Frosch |
| G4 | handgroß bis katzengroß | 10–50 cm | Igel, Eichhörnchen, Huhn, Ratte |
| G5 | mittel | 50–100 cm | Fuchs, Hund, Ziege, Kind |
| G6 | groß | 1–2 m | Mensch, Wildschwein, Hirsch |
| G7 | sehr groß | 2–3 m | Pferd, Rind, Bär |
| G8 | riesig | > 3 m | Golem, Drache |

**Begründung Größenklassen (Vorschlag Claude):** Reale Größen reichen von 1 mm bis mehrere Meter (Faktor > 1000) und passen so nicht auf den Bildschirm. Klassen statt exakter Werte lassen offen, wie `worldSize` später gestaucht wird (z. B. logarithmisch). Zum Vergleich heute: Ameise `worldSize` 3, Drache 20.

### Häufigkeit und Verhalten

- **Häufigkeit** entspricht `rarity` im Code: häufig = `common`, gelegentlich = `uncommon`, selten = `rare`, legendär = `legendary`.
- **Verhalten** entspricht `behavior`: passiv, defensiv, aggressiv, territorial, scheu (= `rare`, flieht).
- **Fantasy-Anteil:** 15 von 104 Einheiten (ca. 15 %), alle selten oder legendär.

**Begründung Fantasy-Anteil (Vorschlag Claude):** Ungefähr eine Fantasy-Begegnung auf sechs bis sieben Arten hält die Welt bodenständig. Jede Etappe hat trotzdem ein bis drei besondere Funde, nach denen man suchen kann.

### Legende Skill-Ideen

- Normal geschrieben = Skill existiert bereits (Biss, Chitin Armor, Superstrength, Venom, Jump, Klauenhieb, Hemolymph, Photosynthesis …)
- Mit `*` = neue Skill-Idee, noch nicht definiert

---

## 2. Etappe 1 — Waldboden (Startgebiet)

Feuchtes Unterholz, Moos, Totholz. Größen G1–G3.

| Nr | Einheit | Art | Gr. | Häufigkeit | Verhalten | Skill-Ideen |
|----|---------|-----|-----|------------|-----------|-------------|
| 1 | Gras *(vorhanden)* | Pflanze | G2 | häufig | passiv | Photosynthesis |
| 2 | Moos | Pflanze | G2 | häufig | passiv | Wasserspeicher* (schützt vor Austrocknen) |
| 3 | Hallimasch | Pilz | G3 | gelegentlich | passiv | Leuchten*, Zersetzen* (Myzel leuchtet in der Nacht) |
| 4 | Springschwanz | Tier | G1 | häufig | scheu | Fluchtsprung* |
| 5 | Blattlaus | Tier | G1 | häufig | passiv | Honigtau* (lockt Ameisen an) |
| 6 | Ameise *(vorhanden)* | Tier | G1 | häufig | territorial | Biss, Chitin Armor, Superstrength |
| 7 | Marienkäfer *(vorhanden)* | Tier | G2 | häufig | defensiv | Hemolymph |
| 8 | Kellerassel | Tier | G2 | häufig | defensiv | Einrollen*, Chitin Armor |
| 9 | Regenwurm | Tier | G3 | häufig | passiv | Graben*, Regeneration* |
| 10 | Nacktschnecke | Tier | G3 | häufig | passiv | Schleimspur* (verlangsamt Verfolger) |
| 11 | Weinbergschnecke | Tier | G3 | gelegentlich | defensiv | Gehäuse* (Rückzug: kaum Schaden, keine Bewegung) |
| 12 | Schnurfüßer (Tausendfüßer) | Tier | G3 | gelegentlich | defensiv | Einrollen*, Abwehrsekret* |
| 13 | Steinläufer (Hundertfüßer) | Tier | G3 | gelegentlich | aggressiv | Biss, Venom |
| 14 | Weberknecht | Tier | G2 | häufig | passiv | Bein abwerfen* (einmal einen tödlichen Treffer überstehen) |
| 15 | Zecke | Tier | G1 | gelegentlich | aggressiv | Blutsaugen* (Lebensraub) |
| 16 | Glühwürmchen | Tier | G2 | selten | passiv | Leuchten* |
| 17 | Springspinne *(vorhanden)* | Tier | G2 | häufig | aggressiv | Biss, Jump, Chitin Armor |
| 18 | Irrlicht | **Fantasy** | G2 | selten | scheu | Blenden*, Irreführen* (lockt Verfolger in die falsche Richtung) |

---

## 3. Etappe 2 — Waldinneres & Lichtungen

Pilze, Insekten, erste kleine Wirbeltiere. Größen G2–G4.

| Nr | Einheit | Art | Gr. | Häufigkeit | Verhalten | Skill-Ideen |
|----|---------|-----|-----|------------|-----------|-------------|
| 19 | Brennnessel | Pflanze | G3 | häufig | passiv | Brennhaare* (Kontaktschaden) |
| 20 | Fliegenpilz | Pilz | G3 | gelegentlich | passiv | Venom, Verwirrung* |
| 21 | Bovist | Pilz | G3 | gelegentlich | passiv | Sporenwolke* |
| 22 | Kreuzspinne | Tier | G2 | häufig | territorial | Netz* (festhalten), Biss |
| 23 | Giftspinne *(vorhanden)* | Tier | G2 | gelegentlich | aggressiv | Biss, Venom, Chitin Armor |
| 24 | Rote Waldameise | Tier | G2 | häufig | territorial | Ameisensäure* (Säure-Fernangriff), Schwarm* |
| 25 | Bombardierkäfer | Tier | G2 | selten | defensiv | Säurestoß* (heißer Sprühstoß) |
| 26 | Stinkwanze | Tier | G2 | häufig | defensiv | Stinkwolke* (Gegner weichen zurück) |
| 27 | Hirschkäfer | Tier | G3 | gelegentlich | territorial | Zangengriff*, Chitin Armor |
| 28 | Wespe | Tier | G2 | häufig | territorial | Stich*, Flug* |
| 29 | Waldmaus | Tier | G3 | häufig | scheu | Flinkheit* |
| 30 | Spitzmaus | Tier | G3 | gelegentlich | aggressiv | Biss, Venom (giftiger Speichel), Heißhunger* |
| 31 | Blindschleiche | Tier | G4 | gelegentlich | defensiv | Schwanz abwerfen* |
| 32 | Erdkröte | Tier | G3 | häufig | defensiv | Hautgift* (Absorbieren schadet, Analysieren ist sicher) |
| 33 | Feuersalamander | Tier | G4 | selten | defensiv | Hautgift*, Regeneration* |
| 34 | Waldfee | **Fantasy** | G2 | selten | scheu | Flug*, Feenstaub* |
| 35 | Moosgolem | **Fantasy** | G5 | selten | territorial | Steinhaut*, Wurzelgriff* |

---

## 4. Etappe 3 — Waldrand, Hecke & Bach

Übergangszone mit Wasser. Größen G3–G5, dazu vereinzelt große Waldtiere (G5–G7) als Gefahr.

| Nr | Einheit | Art | Gr. | Häufigkeit | Verhalten | Skill-Ideen |
|----|---------|-----|-----|------------|-----------|-------------|
| 36 | Brombeerhecke | Pflanze | G4 | häufig | passiv | Dornen* (Rückschaden wie Hemolymph) |
| 37 | Libelle | Tier | G3 | gelegentlich | aggressiv | Flug*, Sturzangriff* |
| 38 | Grasfrosch | Tier | G3 | häufig | defensiv | Schleuderzunge* (Fernangriff, zieht heran), Jump |
| 39 | Ringelnatter | Tier | G4 | gelegentlich | defensiv | Totstellen*, Abwehrsekret* |
| 40 | Kreuzotter | Tier | G4 | selten | territorial | Biss, Venom |
| 41 | Igel | Tier | G4 | gelegentlich | defensiv | Stachelkleid*, Einrollen*, Giftresistenz* |
| 42 | Eichhörnchen | Tier | G4 | häufig | scheu | Klettern*, Vorrat anlegen* |
| 43 | Maulwurf | Tier | G4 | gelegentlich | passiv | Graben*, Tunnel* |
| 44 | Fledermaus | Tier | G3 | gelegentlich | passiv | Echoortung* |
| 45 | Amsel | Tier | G4 | häufig | defensiv | Picken*, Flug* |
| 46 | Elster | Tier | G4 | gelegentlich | defensiv | Stehlen* |
| 47 | Hornisse | Tier | G3 | selten | territorial | Stich* (stark), Flug* |
| 48 | Waldkauz | Tier | G4 | selten | aggressiv | Nachtsicht*, Lautloser Flug* |
| 49 | Wolf | Tier | G5 | selten | aggressiv | Biss, Rudeljagd*, Heulen* |
| 50 | Rothirsch | Tier | G6 | selten | defensiv | Geweihstoß* |
| 51 | Braunbär | Tier | G7 | selten | territorial | Klauenhieb, Brüllen* (Einschüchtern) |
| 52 | Nix (Wassergeist) | **Fantasy** | G5 | selten | territorial | Wasserstrahl*, Wasserform* |
| 53 | Kobold | **Fantasy** | G4 | selten | scheu | Stehlen*, Fallen stellen* |
| 54 | Einhorn | **Fantasy** | G7 | legendär | scheu | Heilhorn*, Reinigung* (entfernt Gift) |

---

## 5. Etappe 4 — Wiesen & Felder

Offenes Kulturland. Größen G3–G6.

| Nr | Einheit | Art | Gr. | Häufigkeit | Verhalten | Skill-Ideen |
|----|---------|-----|-----|------------|-----------|-------------|
| 55 | Löwenzahn | Pflanze | G3 | häufig | passiv | Samenflug* (Gleiten) |
| 56 | Klatschmohn | Pflanze | G3 | gelegentlich | passiv | Schlafmohn* (Gegner einschläfern) |
| 57 | Weizen | Pflanze | G4 | häufig | passiv | Nährstoffe* (Material) |
| 58 | Heuschrecke | Tier | G3 | häufig | scheu | Jump |
| 59 | Honigbiene | Tier | G2 | häufig | defensiv | Stich*, Schwarm*, Honig* (Heilung) |
| 60 | Feldhamster | Tier | G4 | gelegentlich | territorial | Backentaschen* (Speicher, Bezug zu Infinite Storage), Biss |
| 61 | Mauswiesel | Tier | G4 | gelegentlich | aggressiv | Nackenbiss* (hohe Krit-Chance) |
| 62 | Feldhase | Tier | G5 | häufig | scheu | Hakenschlagen* (Ausweichen) |
| 63 | Rabenkrähe | Tier | G4 | häufig | defensiv | Picken*, Schwarm* |
| 64 | Mäusebussard | Tier | G5 | gelegentlich | aggressiv | Sturzflug* |
| 65 | Rotfuchs | Tier | G5 | gelegentlich | aggressiv | Biss, Mäusesprung* |
| 66 | Dachs | Tier | G5 | gelegentlich | territorial | Graben*, Zähigkeit* |
| 67 | Reh | Tier | G5 | häufig | scheu | Flinkheit* |
| 68 | Wildschwein | Tier | G6 | gelegentlich | territorial | Ansturm*, Dicke Schwarte* |
| 69 | Lebende Vogelscheuche | **Fantasy** | G6 | selten | territorial | Krähen rufen*, Strohkörper* |
| 70 | Wolpertinger | **Fantasy** | G4 | legendär | scheu | Sammler-Rarität, Mischwesen: Flug*, Jump |

---

## 6. Etappe 5 — Gehöft & Weiler

Erste Menschen und Nutztiere. Größen G2–G7.

| Nr | Einheit | Art | Gr. | Häufigkeit | Verhalten | Skill-Ideen |
|----|---------|-----|-----|------------|-----------|-------------|
| 71 | Stubenfliege | Tier | G2 | häufig | scheu | Flug*, Facettenauge* (schnelle Reaktion) |
| 72 | Haushuhn | Tier | G4 | häufig | passiv | Picken* |
| 73 | Hahn | Tier | G4 | gelegentlich | territorial | Weckruf* (Alarm: ruft Menschen herbei) |
| 74 | Hausgans | Tier | G5 | gelegentlich | aggressiv | Weckruf*, Flügelschlag* |
| 75 | Hauskatze | Tier | G4 | gelegentlich | aggressiv | Klauenhieb, Pirschen* |
| 76 | Hofhund | Tier | G5 | gelegentlich | territorial | Biss, Bellen* (Alarm), Fährtenlesen* |
| 77 | Ziege | Tier | G5 | häufig | defensiv | Rammstoß*, Klettern* |
| 78 | Schaf | Tier | G5 | häufig | passiv | Wolle* (dämpft Schaden) |
| 79 | Hausschwein | Tier | G6 | häufig | passiv | Allesfresser* (verträgt Verdorbenes), Graben* |
| 80 | Hausrind | Tier | G7 | häufig | passiv | Wiederkäuen* (Regeneration nach Absorbieren) |
| 81 | Stier | Tier | G7 | selten | territorial | Ansturm*, Hornstoß* |
| 82 | Pferd | Tier | G7 | gelegentlich | scheu | Huftritt*, Ausdauer* |
| 83 | Bauer / Bäuerin | Mensch | G6 | häufig | defensiv | Werkzeuggebrauch* (Mistgabel, Sense) |
| 84 | Hausgeist (Heinzelmännchen) | **Fantasy** | G3 | selten | scheu | Unsichtbarkeit*, Handwerk* (nur nachts aktiv) |

---

## 7. Etappe 6 — Dorf

Mehr Menschen mit Berufen. Größen G4–G6.

| Nr | Einheit | Art | Gr. | Häufigkeit | Verhalten | Skill-Ideen |
|----|---------|-----|-----|------------|-----------|-------------|
| 85 | Hausratte | Tier | G4 | häufig | defensiv | Nagen*, Seuche* |
| 86 | Dorfkind | Mensch | G5 | häufig | scheu | Schreien* (Alarm) |
| 87 | Schmied | Mensch | G6 | selten | territorial | Hammerschlag*, Hitzeresistenz* |
| 88 | Jäger | Mensch | G6 | gelegentlich | aggressiv | Bogenschuss*, Fallen stellen* (jagt den Blob gezielt) |
| 89 | Kräuterfrau | Mensch | G6 | selten | passiv | Heilkunde*, Giftkunde* |
| 90 | Dorfbüttel | Mensch | G6 | gelegentlich | territorial | Knüppelhieb*, Weckruf* |
| 91 | Gnom | **Fantasy** | G3 | selten | scheu | Graben*, Steinkunde* |

---

## 8. Etappe 7 — Stadt

Mauern, Gassen, Kanalisation. Größen G4–G8.

| Nr | Einheit | Art | Gr. | Häufigkeit | Verhalten | Skill-Ideen |
|----|---------|-----|-----|------------|-----------|-------------|
| 92 | Straßentaube | Tier | G4 | häufig | scheu | Flug*, Orientierung* |
| 93 | Wanderratte | Tier | G4 | häufig | aggressiv | Nagen*, Seuche*, Schwarm* |
| 94 | Straßenköter | Tier | G5 | häufig | aggressiv | Biss, Rudeljagd* |
| 95 | Händler | Mensch | G6 | häufig | passiv | Feilschen* |
| 96 | Stadtwache | Mensch | G6 | häufig | territorial | Hellebarde* (große Reichweite), Schildblock* |
| 97 | Armbrustschütze | Mensch | G6 | gelegentlich | territorial | Bolzenschuss* |
| 98 | Ritter | Mensch | G6 | selten | aggressiv | Schwerthieb*, Plattenrüstung* |
| 99 | Alchemist | Mensch | G6 | selten | defensiv | Säurephiole*, Tränke brauen* |
| 100 | Rattenkönig | **Fantasy** | G5 | selten | territorial | Schwarm befehligen* (Kanalisation) |
| 101 | Kanalschleim | **Fantasy** | G4 | selten | aggressiv | Säure*, Teilung* (rivalisierender Schleim) |
| 102 | Wasserspeier | **Fantasy** | G5 | selten | territorial | Steinhaut*, Sturzflug* (sitzt starr auf Dächern) |
| 103 | Hofmagier | **Fantasy** | G6 | selten | aggressiv | Lichtzauber*, Feuerball* |
| 104 | Steingolem | **Fantasy** | G8 | legendär | territorial | Steinhaut*, Erdstoß* (Wächter des Stadttors) |

---

## 9. Neue Skill-Ideen, die mehrfach vorkommen

Diese Ideen kommen bei mehreren Einheiten vor. Sie sind die naheliegendsten Kandidaten für neue Skills:

| Skill-Idee | Vorkommen (Nr.) |
|------------|-----------------|
| Flug | 28, 34, 37, 45, 47, 70, 71, 92 |
| Weckruf / Alarm | 73, 74, 76, 86, 90 |
| Schwarm | 24, 59, 63, 93 |
| Graben | 9, 43, 66, 79, 91 |
| Einrollen | 8, 12, 41 |
| Stich | 28, 47, 59 |
| Leuchten | 3, 16 |
| Hautgift | 32, 33 |
| Steinhaut | 35, 102, 104 |
| Regeneration | 9, 33 |
| Abwerfen (Bein / Schwanz) | 14, 31 |
| Picken | 45, 63, 72 |
| Ansturm | 68, 81 |

---

## 10. Offene Fragen

- ~~**Menschen absorbieren?**~~ Vorläufig entschieden, siehe unten.
- ~~**Größenregel?**~~ Vorläufig entschieden, siehe unten.
- **Neue Mechaniken**, die einige Einheiten voraussetzen und die es noch nicht gibt:
  - Gruppen- und Schwarm-Spawns
  - Tag und Nacht
  - Alarm (Menschen rufen Hilfe)
  - Flug
  - Fallen
- **Biome:** Siehe Vorschlag unten (Abschnitt 11).
- **worldSize-Skala:** Wie werden die Größenklassen G1–G8 in `worldSize` umgerechnet?

### Menschen: nur analysieren (vorläufig)

**Vorgabe (Entwickler):** Menschen (Art „Mensch“, Nr. 83, 86–90, 95–99) können vorerst **nicht absorbiert** werden, nur analysiert. Die Entscheidung ist ausdrücklich vorläufig und kann sich noch ändern.
> Begründung offen (Entwickler ist sich noch nicht sicher)

Noch zu klären: Gilt das auch für menschenähnliche Fantasy-Wesen (Hofmagier Nr. 103, Gnom, Kobold, Hausgeist)?

### Größenregel beim Absorbieren (vorläufig)

Die Regel steht jetzt in [GDD-02 Abschnitt 1.4](GDD-02-Skillsystem.md#14-größe-beim-absorbieren-und-analysieren). Kurz zusammengefasst:
- **Absorbieren:** nur bis höchstens 20 % größer als der Blob.
- **Analysieren:** auch bei größeren Gegnern möglich. Bei zu großen und zu starken Gegnern ist die Chance aber deutlich geringer.
- **Maßstab:** das Verhältnis der `worldSize`-Werte. Die Größenklassen G1–G8 dienen nur zur groben Einordnung.

---

## 11. Vorschlag: Biome aus den Etappen ableiten

**Vorgabe (Entwickler):** Die vorhandenen Biome sind keine Einschränkung, sie können erweitert werden. Die Einheiten werden logisch begründet, nicht nach den heutigen Biomen.
> Begründung offen

Jede Etappe ist ein eigener Lebensraum, und die Einheiten folgen daraus, wo sie in der echten Welt leben. Daraus ergeben sich diese Biome:

| Etappe | Biom-Vorschlag | Heute vorhanden? | Warum ein eigenes Biom |
|--------|----------------|------------------|------------------------|
| 1 | Waldboden (Unterholz) | teilweise (`forest`) | Kleinstlebewesen brauchen Feuchtigkeit und Totholz. Das ist das Startgebiet, passend zur Herkunft des Blobs (GDD-01). |
| 2 | Waldinneres / Lichtung | teilweise (`forest`) | Lichtungen bringen Licht, also Blüten, Insekten und Pilze. Das Kronendach ist dichter als am Boden. |
| 3 | Waldrand, Hecke, Bach | nein | Die Grenze zwischen Wald und Offenland ist in der Natur besonders artenreich (Randeffekt). Der Bach bringt Amphibien und Wassertiere. |
| 4 | Wiese & Feld | nein | Offenes Kulturland mit Beutegreifern aus der Luft (Bussard) und schnellen Fluchttieren (Hase, Reh). |
| 5 | Gehöft | nein | Nutztiere gibt es nur dort, wo Menschen sie halten. |
| 6 | Dorf | nein | Menschen mit Berufen, dazu Kulturfolger wie die Hausratte. |
| 7 | Stadt (mit Kanalisation) | nein | Mauern und Gassen haben eigene Kulturfolger (Taube, Wanderratte). Der Kanal ist ein natürlicher Ort für einen rivalisierenden Schleim. |

**Begründung (Vorschlag Claude):** Die Einheiten werden aus dem Lebensraum abgeleitet, nicht umgekehrt. Dadurch wirkt die Welt glaubwürdig, und neue Einheiten lassen sich leicht einordnen: Man fragt, wo das Tier wirklich lebt. Sumpf, Hochland, Gebirge, Wüste und Dungeon bleiben bestehen und liegen abseits des Hauptwegs.

---

*Letzte Aktualisierung: v0.4 — Größenregel nach GDD-02 verschoben (Analysieren ohne 20-%-Grenze, Maßstab `worldSize`); Größenzunahme gilt nur für bekämpfbare Gegner, mit Begründung des Entwicklers; Größenregel beim Absorbieren und „Menschen nur analysieren“ (beide vorläufig); erster Entwurf: 104 Einheiten in 7 Etappen (Oktober 2026)*
