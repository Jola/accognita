// ============================================================
// BODY — Grundwerte des Blobs: Bewegung, Sinne, Stärke aus Größe
// Absorb & Evolve
//
// Gilt NUR FÜR DEN BLOB. Gegner nutzen das nicht: Ihr Tempo steht fest in
// src/data/entities.ts (speed), sie haben keine Sicht (sie bemerken den Blob
// über ihren Aggro-Radius) und keinen Größenbonus. Gemeinsam mit Gegnern
// sind nur Stärke und Geschick aus Skill-Effekten (SkillEffectSystem).
//
// Diese Datei beschreibt, wie der Körper des Blobs aus seinen Skills
// zusammengesetzt wird („der beste Skill zählt“) und den weichen Sichtrand.
// Die Werte der Skills selbst (Tempo, Stärke, Geschick, Sichtweite, Farbe
// und die Erfahrung durch Bewegen und Sehen, Feld practice) stehen in
// src/data/skills.ts. Stärke aus der Körpergröße: src/data/balance.ts.
// Rechenregeln: src/systems/BodySystem.ts (gleiche Abschnittsnummern).
// Herleitung: GDD-09.
// [VERWORFEN, 14. November 2026] „Einzige Quelle für die Stellschrauben der
//   Grundwerte“ — Vorgabe (Entwickler): Was zu einem Skill gehört, steht am
//   Skill; allgemeine Regeln in balance.ts.
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
// Erfahrung: Nur der Skill, mit dem sich der Blob gerade bewegt (der
// schnellste), bekommt Erfahrung je zurückgelegter Strecke in Körperradien.
// Wie viel, steht am Skill (practice: body_radius_moved).
// [VERWORFEN, 14. November 2026] MOVE_XP_PER_BODY_RADIUS = 0,5 hier für alle
//   Bewegungs-Skills — jetzt je Skill, Wert und Begründung unverändert.
// -----------------------------------------------------------

// -----------------------------------------------------------
// 2. STÄRKE AUS DER KÖRPERGRÖSSE — steht in balance.ts
//
// Allgemeine Regel, deshalb jetzt in src/data/balance.ts
// (SIZE_STRENGTH_BONUS_MAX, unverändert). Rechnung: BodySystem Abschnitt 2.
// -----------------------------------------------------------

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

// Erfahrung: Jeder eingeschaltete Seh-Skill bekommt Erfahrung je Sekunde
// Spielzeit — wie viel, steht am Skill (practice: second_enabled).
// [VERWORFEN, 14. November 2026] SIGHT_XP_PER_SECOND = 0,5 hier für alle
//   Seh-Skills — jetzt je Skill, Wert und Begründung unverändert.

// Stand: 14. November 2026 — gilt nur für den Blob (klargestellt); Erfahrung an die Skills, Größenbonus nach balance.ts verschoben; davor 13. November 2026 — Erstfassung
