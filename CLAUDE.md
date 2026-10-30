# CLAUDE.md — Absorb & Evolve

This file is the project constitution. Read it at the start of every session before doing anything else.

---

## Project Summary

**Absorb & Evolve** is a browser-based Action-RPG. The player controls a Blob (inspired by the real organism *Physarum polycephalum*) that evolves by absorbing or analyzing entities in a medieval fantasy world. Skills are discovered through interaction, leveled through repetition, and combined into new abilities.

Current state: **v0.3** — Modular TypeScript + Phaser.js architecture, Skill-System + Combat-System implemented. Large procedural world (20×20 chunks = 20480×20480px) with 6 biomes, pixel art tiles, and dynamic chunk loading.

---

## File Structure

| File | Purpose |
|------|---------|
| `accognita.html` | The game itself. Build output, open by double-click in browser. |
| `README.md` | GitHub Pages landing page with link to the game. |
| `src/types/Skill.ts` | TypeScript interfaces for skills |
| `src/types/Entity.ts` | TypeScript interfaces for entities |
| `src/types/GameState.ts` | Central game state interfaces |
| `src/types/Combat.ts` | AttackType, StatusEffect, AttackResult, AiFrame interfaces |
| `src/types/Material.ts` | Material and loot-drop interfaces |
| `src/data/skills.ts` | All skill definitions and balancing values |
| `src/data/entities.ts` | All entity definitions |
| `src/data/materials.ts` | All material/loot definitions |
| `src/data/balance.ts` | Central balancing constants (XP curves, damage, etc.) |
| `src/data/version.ts` | `GAME_VERSION` — must match `package.json` (build.js aborts otherwise). Shown in save dialog and stored in each save. |
| `src/systems/SkillSystem.ts` | Pure skill logic — no Phaser, no DOM, fully testable |
| `src/systems/EntitySystem.ts` | Absorb/Analyze/Respawn logic |
| `src/systems/StatusEffectSystem.ts` | DoT/HoT/Aura processing, passive skill sync |
| `src/systems/CombatSystem.ts` | Damage calculation, skill dispatch, checkpoint logic |
| `src/systems/HitSystem.ts` | Hit grades (miss/light/normal/heavy/crit): chances from skill profile, level and dexterity; dice roll |
| `src/systems/AiSystem.ts` | Aggro, chase, attack-trigger (pure logic, no Phaser) |
| `src/systems/MaterialSystem.ts` | Loot drop resolution and material inventory logic |
| `src/systems/SaveSystem.ts` | Save/load game state via localStorage (3 slots) |
| `src/ui/Joystick.ts` | Self-contained virtual joystick — DOM only, no Phaser |
| `src/ui/SkillBar.ts` | Touch skill slots with cooldown display and long-press menu |
| `src/ui/SkillMenu.ts` | Full-screen skill management overlay (pauses game) |
| `src/ui/SaveMenu.ts` | Save/load slot UI overlay |
| `src/ui/GameMenu.ts` | Full-screen game menu (Skills, Combo, Inventar, Nearby, Log, Index) — pauses game; markup in `accognita.template.html` |
| `src/ui/IndexView.ts` | INDEX tab: in-game reference of all skills and entities with all parameters, computed live from data + systems |
| `src/scenes/GameScene.ts` | Phaser scene — only file that knows about Phaser |
| `src/world/Chunk.ts` | Types: BiomeId, HeightLevel, ChunkDef, LoadedChunk, SpawnDef + constants |
| `src/world/BiomeDefinitions.ts` | Zone layout, spawn tables, tile index mapping |
| `src/world/WorldGenerator.ts` | `generateChunk(cx, cy, seed)` — deterministic chunk generation |
| `src/world/TilesetGenerator.ts` | Procedural pixel art tileset (24 tiles, Canvas 2D) |
| `src/world/ChunkManager.ts` | Chunk load/unload, entity lifecycle, active-radius AI filtering |
| `tsconfig.json` | TypeScript compiler configuration |
| `.devcontainer/devcontainer.json` | Dev container (Node 20 like CI) for local development in VS Code / Codespaces |
| `scripts/dev.js` | `npm run dev`: dependency-free dev server on port 8080 — rebuilds on changes in `src/` and the template, reloads the browser |
| `docs/GDD-00-Index.md` | Meta-document. Explains all GDD files and conventions. |
| `docs/GDD-01-Hauptbeschreibung.md` | Vision, core loop, setting, progression. |
| `docs/GDD-02-Skillsystem.md` | Skill discovery, leveling, combinations. |
| `docs/GDD-03-Kampfsystem.md` | Combat design — v0.3 implemented. |
| `docs/GDD-04-LookAndFeel.md` | Colors, typography, UI layout, mobile/desktop, tech stack. |
| `docs/GDD-05-Kampfmathematik.md` | Damage pipeline, damage types, declarative skill effects. |
| `docs/GDD-07-Bestiarium.md` | Draft: ~100 units from forest to city, size classes, skill ideas (Status: Diskussion). |
| `docs/GDD-08-Progressionsmathematik.md` | Math of skill/character leveling: curve families, XP models, integer limits, comparison with other games (Status: Diskussion). |

---

## Architecture Principles

The most important rule: **systems/ and data/ have zero Phaser dependency.**

```
types/   ←  data/  ←  systems/  ←  scenes/
                                      ↑
                         ui/      only layer
                          ↑       that knows
                       DOM-only   Phaser & DOM
                       modules
```

- `types/` — Pure TypeScript interfaces. No logic.
- `data/` — Static definitions. Change values here for balancing.
- `systems/` — Pure game logic. No rendering. Testable in isolation.
- `world/` — Chunk system: no Phaser imports, scene typed as `any`. DOM Canvas 2D allowed for TilesetGenerator.
- `ui/` — Self-contained DOM components (e.g. Joystick). No Phaser.
- `scenes/` — Phaser + DOM glue. Calls systems and ui modules, renders results.

---

## Core Rules

### When changing the game
1. TypeScript source files live in `src/`. Claude compiles them.
2. After any mechanic change, update the relevant GDD file(s) in `docs/`.
3. If a new mechanic doesn't exist in the GDD yet, add it.
4. Mark unimplemented features with `> Status: Konzept` in the GDD.
5. Never add Phaser imports to `systems/` or `data/` or `types/`.

### When updating GDD files
1. Never delete content — mark outdated entries as `[VERWORFEN]` instead.
2. Update the timestamp at the bottom of any changed file.
3. Keep GDD-00 in sync: if a new file is added, list it there.

### Rationale is mandatory (Begründungspflicht)
Every rule, formula, constant and balancing decision is documented together with **why** it was chosen, so it can be understood and deliberately changed later.
1. Write it right next to the rule in the GDD as `**Begründung:** …` (skill effects: the `reasoning` field in `src/data/skills.ts`).
2. Keep *what* was decided apart from *why*, and state where the reason comes from:
   - decision by Jörn (the "what", with or without a reason) → `**Vorgabe (Entwickler):**`
   - reason explicitly given by Jörn → `**Begründung (Entwickler):**` — only his own words/meaning, nothing added
   - Claude's proposal accepted by Jörn → `**Begründung (Vorschlag Claude, übernommen):**`
   - reconstructed from code/comments, not yet confirmed → `**Begründung (rekonstruiert, bitte bestätigen):**`
3. Never invent a reason or attribute one to Jörn. If the reason is unknown, write `> Begründung offen` and ask him.
4. When a decision changes, keep the old reason under `[VERWORFEN]` and add the new reason plus why it changed.
5. When asking Jörn to decide something, also ask for (or propose) the reason, and record it with the decision.

### Build Workflow
1. Jörn describes what to change (in German, on mobile).
2. Claude writes/edits the TypeScript source files in `src/`.
3. Claude commits and pushes — GitHub Actions baut automatisch und deployt auf GitHub Pages.
4. Jörn öffnet das Spiel über die GitHub Pages URL — kein Terminal nötig.

**Lokaler Build (nur wenn nötig):** `node build.js` → erzeugt `accognita.html` im Projektordner.
**Lokale Entwicklung (optional, für Jörn):** Dev-Container öffnen, dann `npm run dev` → Spiel unter http://localhost:8080, baut und lädt bei jeder Änderung neu. Keep `scripts/dev.js` dependency-free.
**Build-Artefakte:** `dist/`, `accognita.html`, `_site/` sind gitignored — nur `src/` wird committet.
**CI-Pipeline:** `.github/workflows/deploy.yml` — wird bei jedem Push auf `main` ausgelöst.

### Communication
- Talk to the developer in **German**.
- Code, variable names, file names: **English**.

---

## Current Tech Stack

- TypeScript 5.x
- Phaser.js 3.70 (loaded via CDN in the single HTML file)
- No build system on developer side — Claude runs `tsc`
- Build output: `accognita.html` (root, single file, deployed via GitHub Pages)

## Planned (do not implement unless asked)
- Isometric view (v0.4)
- PWA / manifest.json (undecided)
- Material inventory UI (looted materials visible in-game)

---

## To-Do-Liste

Bugs, Feature-Ideen und kleine Verbesserungen werden in **`TODO.md`** im Projekt-Root gesammelt.

- Neue Einträge dort hinzufügen, erledigte in den "Erledigt"-Abschnitt verschieben.
- Nichts aus `TODO.md` implementieren ohne explizite Anweisung vom Entwickler.

---

## Open Decisions (ask developer before implementing)

- Tod-Mechanik: Soft Death vs. Checkpoint vs. Rogue-like?
- Skill-Limit: Obergrenze für aktive Skills?
- Kombinations-Rezepte: Sollen sie versteckt werden?
- Mobile Tap: Direkt Absorb/Analyze, oder erst Kontextmenü?
- PWA: Ja oder Nein?
- Balancing: XP-Kurven, Spawn-Dichte und Respawn-Zeiten noch nicht abgestimmt
- Material-UI: Looted materials inventory anzeigen? (MaterialSystem existiert, UI fehlt)
