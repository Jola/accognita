// ============================================================
// BODY — Grundwerte des Blobs: Bewegung, Sinne, Stärke aus Größe
// Absorb & Evolve
//
// DIESE DATEI IST DIE EINZIGE QUELLE FÜR die Stellschrauben der Grundwerte,
// die nicht an einem einzelnen Skill hängen. Die Werte der Skills selbst
// (Tempo, Stärke, Geschick, Sichtweite, Farbe je Skill) stehen in
// src/data/skills.ts. Rechenregeln: src/systems/BodySystem.ts (gleiche
// Abschnittsnummern). Herleitung: GDD-09.
//
// Kennzeichnung der Herkunft (CLAUDE.md, Begründungspflicht):
//   Vorgabe (Entwickler)                      — von Jörn entschieden
//   Begründung (Entwickler)                   — Jörns eigene Begründung
//   Begründung (Vorschlag Claude, übernommen) — von Jörn angenommen
//   VORLÄUFIG                                 — Zahl noch nicht abgestimmt
//
// Vorgaben (Entwickler, 13. November 2026):
//   - Der Blob erwacht ohne Bewegung und ohne Sicht. Beides lernt er erst
//     durch Analyze und Absorb (Intro, GDD-09 Abschnitt 5).
//   - Bewegung gibt Stärke und Geschick, die wie bei anderen Skills mit dem
//     Fortschritt des Bewegungs-Skills wachsen.
//   - Die Körpergröße erhöht die Stärke prozentual.
//   - Das Tempo steigt mit dem Skill: am Anfang langsam, nach kurzer Zeit
//     annehmbar schnell.
//   - Wurm und Schnecke geben Kriechen, Insekten (Gliederfüßer) Krabbeln,
//     später kommt Laufen.
//   - Beim Sehen: Übergang von Schwarz über Schwarz-Weiß zu Farbe.
// ============================================================

// -----------------------------------------------------------
// 1. BEWEGUNG
//
// Tempo = Körperradius × PLAYER_SPEED_PER_WORLD_RADIUS (balance.ts) × Faktor
// Faktor = bester eingeschalteter Bewegungs-Skill (Effekt "move_speed"),
//          ohne Bewegungs-Skill 0 — der Blob kann sich nicht bewegen.
// Begründung (Vorschlag Claude, übernommen): Es zählt der beste Skill,
//   nicht die Summe — wer laufen kann, kriecht nicht zusätzlich. Die Größe
//   bleibt Faktor, damit sich das Tempo auf dem Bildschirm bei jeder
//   Körpergröße gleich anfühlt (balance.ts).
//
// Erfahrung: Der Skill, mit dem sich der Blob gerade bewegt (der schnellste),
// bekommt Erfahrung je zurückgelegter Strecke, gemessen in Körperradien.
// Begründung (Vorschlag Claude, übernommen): Bewegung lernt man durch
//   Bewegen. In Körperradien, damit ein großer Blob nicht schneller lernt.
// MOVE_XP_PER_BODY_RADIUS = 0,5 (1 XP je 2 Körperradien) — VORLÄUFIG:
//   Kriechen (Lernaufwand 5) ist damit nach rund 30 s Bewegung bei „Übung“
//   und nach rund zwei Minuten bei Natur („nach kurzer Zeit annehmbar
//   schnell“, Vorgabe oben).
// -----------------------------------------------------------
export const MOVE_XP_PER_BODY_RADIUS = 0.5;

// -----------------------------------------------------------
// 2. STÄRKE AUS DER KÖRPERGRÖSSE
//
// Stärke = Summe der Stärke-Effekte × (1 + Größenbonus)
// Größenbonus = SIZE_STRENGTH_BONUS_MAX × min(1, Wachstum / PLAYER_SIZE_GROWTH_MAX)
//   — linear mit der Größe, bei voller Größe +100 %.
// Vorgabe (Entwickler): Die Körpergröße erhöht die Stärke prozentual.
// Begründung (Vorschlag Claude, übernommen): Ein größerer Körper hat mehr
//   Muskelmasse. Ohne trainierte Muskeln (Bewegung, Superstrength) gibt es
//   nichts, was die Größe verstärken könnte.
// Gilt derzeit nur für den Blob: Gegner haben kein Wachstum.
// -----------------------------------------------------------
export const SIZE_STRENGTH_BONUS_MAX = 1.0;

// -----------------------------------------------------------
// 3. SEHEN
//
// Sichtweite = bester eingeschalteter Seh-Skill (Effekt "sight_range"),
//   in Körperradien um den Blob; ohne Seh-Skill 0 — alles schwarz.
// Farbe = bester Effekt "color_vision" (0 = Graustufen, 1 = Farbe ohne Rot)
// Rot   = bester Effekt "red_vision"   (0 = Rot erscheint dunkel, 1 = volle Farbe)
// Begründung (Vorschlag Claude, übernommen): Farbsehen braucht mehrere
//   Sorten Lichtsinneszellen. Mit einer Sorte sieht man nur hell und dunkel
//   (Graustufen, wie Menschen nachts). Insekten sehen UV, Blau und Grün,
//   aber kaum Rot. Springspinnen haben die schärfsten Augen der Kleintiere,
//   manche Arten sehen Rot.
//
// SIGHT_EDGE_FRACTION: Anteil der Sichtweite, über den der Rand weich ins
//   Schwarze übergeht (VORLÄUFIG). Ein harter Rand wirkte wie ein Fenster,
//   ein weicher wie nachlassende Wahrnehmung.
// -----------------------------------------------------------
export const SIGHT_EDGE_FRACTION = 0.35;

// Erfahrung: Jeder eingeschaltete Seh-Skill bekommt SIGHT_XP_PER_SECOND je
// Sekunde Spielzeit — Sehen lernt man durch Sehen.
// Begründung (Vorschlag Claude, übernommen): Wie Photosynthese läuft Sehen
//   passiv mit. 0,5 XP/s (VORLÄUFIG): Lichtsinn (Lernaufwand 8) ist nach
//   rund einer Minute bei „Übung“ und nach gut zehn Minuten bei Natur.
export const SIGHT_XP_PER_SECOND = 0.5;

// Stand: 13. November 2026 — Erstfassung
