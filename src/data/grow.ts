// ============================================================
// GROW — Wachsen: der Blob verdaut Pflanzenfasern und wird größer
// Absorb & Evolve
//
// Diese Datei enthält die allgemeinen Regeln des Wachsens (Nahrung,
// Wachstum aus Körpermasse). Die Werte des Skills Grow selbst
// (Verdauungstempo, Erfahrung je Faser) stehen am Skill in
// src/data/skills.ts. Die Rechenregeln stehen in src/systems/GrowSystem.ts
// (gleiche Abschnittsnummern). Herleitung: GDD-02 Abschnitt 8.10.
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

// -----------------------------------------------------------
// 1. NAHRUNG
//
// Welches Material verdaut wird. Vorgabe (Entwickler): derzeit
// Pflanzenfasern. Weitere Nahrung (Zellmaterial …) später hier ergänzen.
// -----------------------------------------------------------
export const GROW_FOOD_MATERIAL_ID = "plant_fiber";

// -----------------------------------------------------------
// 2. VERDAUUNGSTEMPO — steht am Skill
//
// Fasern pro Minute: Effekt "digest_rate" an Grow (src/data/skills.ts),
// mit Begründung. Allgemeine Regel, die hier bleibt: Ohne Fasern im Lager
// ruht Grow; angesparte Verdauungszeit verfällt (höchstens eine Faser
// wartet), damit der Blob nach einer Pause nicht schlagartig einen ganzen
// Vorrat verschlingt (GrowSystem.processGrow).
// [VERWORFEN, 14. November 2026] GROW_FIBERS_PER_MINUTE hier —
//   Vorgabe (Entwickler): Was zu einem Skill gehört, steht am Skill.
// -----------------------------------------------------------

// -----------------------------------------------------------
// 3. ERFAHRUNG — steht am Skill
//
// XP je verdauter Faser: Feld practice an Grow (src/data/skills.ts).
// [VERWORFEN, 14. November 2026] GROW_XP_PER_FIBER hier — Grund wie oben.
// -----------------------------------------------------------

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

// Stand: 14. November 2026 — Verdauungstempo und Erfahrung an den Skill Grow verschoben; davor 13. November 2026 — Erstfassung
