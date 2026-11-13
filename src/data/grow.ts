// ============================================================
// GROW — Wachsen: der Blob verdaut Pflanzenfasern und wird größer
// Absorb & Evolve
//
// DIESE DATEI IST DIE EINZIGE QUELLE FÜR alle Stellschrauben des Wachsens.
// Die Rechenregeln dazu stehen in src/systems/GrowSystem.ts (gleiche
// Abschnittsnummern). Herleitung: GDD-02 Abschnitt 8.10.
//
// Kennzeichnung der Herkunft (CLAUDE.md, Begründungspflicht):
//   Vorgabe (Entwickler)                — von Jörn entschieden
//   Begründung (Entwickler)             — Jörns eigene Begründung
//   Begründung (Vorschlag Claude, offen) — noch nicht bestätigt
//
// Grundprinzip in einem Satz:
//   Solange Grow eingeschaltet ist, verdaut der Blob über die Spielzeit
//   Pflanzenfasern aus seinem Lager; jede verdaute Faser wird zu Körper-
//   masse, und allein die Körpermasse bestimmt das Wachstum (Größe, HP, MP).
//
// Vorgabe (Entwickler, 13. November 2026):
//   - Wachsen verbraucht Ressourcen, derzeit Pflanzenfasern.
//   - Grow wirkt passiv über die Spielzeit (kein Knopf).
//   - Grow ersetzt die Erfahrung als Quelle des Wachstums: Der Körper
//     wächst nur noch durch Grow.
//   - Grow lernt man von Gras (Absorb/Analyze, wie Photosynthese).
// > Begründung offen (Idee des Entwicklers, GDD-02 Abschnitt 8.10).
// ============================================================

import type { SkillValue } from "../types/Skill";

// -----------------------------------------------------------
// 1. NAHRUNG
//
// Welches Material verdaut wird. Vorgabe (Entwickler): derzeit
// Pflanzenfasern. Weitere Nahrung (Zellmaterial …) später hier ergänzen.
// -----------------------------------------------------------
export const GROW_FOOD_MATERIAL_ID = "plant_fiber";

// -----------------------------------------------------------
// 2. VERDAUUNGSTEMPO
//
// Fasern pro Minute Spielzeit, läuft mit dem Fortschritt von Grow
// (allgemeines Schema start → max, progression.ts Abschnitt 1).
// 2 → 30 Fasern/min, bei Natur 27,2.
// Begründung (Vorschlag Claude, offen): Ein Grashalm bringt im Schnitt
//   2 Fasern. Am Anfang verdaut der Blob einen Halm pro Minute — Wachsen
//   ist spürbar, aber langsam. Geübt schafft er einen Halm alle paar
//   Sekunden, so schnell, wie man Gras sammeln kann; dann begrenzt die
//   Nahrung, nicht die Verdauung.
// Ohne Fasern im Lager ruht Grow; angesparte Verdauungszeit verfällt
// (höchstens eine Faser wartet), damit der Blob nach einer Pause nicht
// schlagartig einen ganzen Vorrat verschlingt.
// -----------------------------------------------------------
export const GROW_FIBERS_PER_MINUTE: SkillValue = { start: 2, max: 30 };

// -----------------------------------------------------------
// 3. ERFAHRUNG
//
// Grow lernt durch Verdauen: 1 XP je verdaute Faser.
// Begründung (Vorschlag Claude, offen): Wie bei Photosynthese (XP je
//   geheilter HP) zählt, was der Skill tatsächlich bewirkt hat. Mit
//   Lernaufwand 15 liegt Natur bei rund 600 verdauten Fasern.
// -----------------------------------------------------------
export const GROW_XP_PER_FIBER = 1;

// -----------------------------------------------------------
// 4. WACHSTUM AUS KÖRPERMASSE
//
//   Wachstum = log2(1 + Körpermasse / GROWTH_FIBER_SCALE)
//   Körpermasse = alle je verdauten Fasern; schrumpft nie.
// Begründung (Vorschlag Claude, offen):
//   - Gleiche Form wie das bisherige Wachstum aus Erfahrung: jede
//     Verdopplung der Masse +1 Wachstum. Ein größerer Körper braucht
//     mehr Nahrung für denselben Zuwachs.
//   - 20 Fasern (≈ 10 Grashalme) → Wachstum 1 (+15 HP, +8 MP);
//     60 → 2; 620 → 5; 20 460 → 10.
//   - Alte Spielstände: Körpermasse = Lebenserfahrung / 10 ergibt genau
//     das bisherige Wachstum (SaveSystem, Migration 3 → 4) — niemand
//     schrumpft durch die Umstellung.
// [VERWORFEN, 13. November 2026] Wachstum = log2(1 + Lebenserfahrung / 200)
//   (progression.ts GROWTH_XP_SCALE). Grund: Vorgabe oben.
// -----------------------------------------------------------
export const GROWTH_FIBER_SCALE = 20;

// Stand: 13. November 2026 — Erstfassung
