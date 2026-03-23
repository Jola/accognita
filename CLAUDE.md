# CLAUDE.md — Absorb & Evolve

This file is the project constitution. Read it at the start of every session before doing anything else.

---

## Project Summary

**Absorb & Evolve** is a browser-based Action-RPG inspired by "That Time I Got Reincarnated as a Slime". The player controls a slime that evolves by absorbing or analyzing entities in a medieval fantasy world. Skills are discovered through interaction, leveled through repetition, and combined into new abilities.

Current state: **v0.2** — Modular TypeScript + Phaser.js architecture, Skill-System implemented and isolated.

---

## File Structure

| File | Purpose |
|------|---------|
| `dist/index.html` | The game itself. Build output for GitHub Pages. Open by double-click in browser. |
| `src/types/Skill.ts` | TypeScript interfaces for skills |
| `src/types/Entity.ts` | TypeScript interfaces for entities |
| `src/types/GameState.ts` | Central game state interfaces |
| `src/data/skills.ts` | All skill definitions and balancing values |
| `src/data/entities.ts` | All entity definitions |
| `src/systems/SkillSystem.ts` | Pure skill logic — no Phaser, no DOM, fully testable |
| `src/systems/EntitySystem.ts` | Absorb/Analyze/Respawn logic |
| `src/scenes/GameScene.ts` | Phaser scene — only file that knows about Phaser |
| `tsconfig.json` | TypeScript compiler configuration |
| `docs/GDD-00-Index.md` | Meta-document. Explains all GDD files and conventions. |
| `docs/GDD-01-Hauptbeschreibung.md` | Vision, core loop, setting, progression. |
| `docs/GDD-02-Skillsystem.md` | Skill discovery, leveling, combinations. |
| `docs/GDD-03-Kampfsystem.md` | Combat design (concept, not yet implemented). |
| `docs/GDD-04-LookAndFeel.md` | Colors, typography, UI layout, mobile/desktop, tech stack. |

---

## Architecture Principles

The most important rule: **systems/ and data/ have zero Phaser dependency.**

```
types/   ←  data/  ←  systems/  ←  scenes/
                                      ↑
                                  only layer
                                  that knows
                                  Phaser & DOM
```

- `types/` — Pure TypeScript interfaces. No logic.
- `data/` — Static definitions. Change values here for balancing.
- `systems/` — Pure game logic. No rendering. Testable in isolation.
- `scenes/` — Phaser + DOM glue. Calls systems, renders results.

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

### Build Workflow
1. Jörn describes what to change (in German, on mobile).
2. Claude writes/edits the TypeScript source files.
3. Claude compiles with `tsc` and bundles into `dist/index.html`.
4. Claude commits and pushes — GitHub Pages deploys automatically.
5. Jörn opens the game via GitHub Pages URL — no terminal needed.

### Communication
- Talk to the developer in **German**.
- Code, variable names, file names: **English**.

---

## Current Tech Stack

- TypeScript 5.x
- Phaser.js 3.70 (loaded via CDN in the single HTML file)
- No build system on developer side — Claude runs `tsc`
- Build output: `dist/index.html` (single file, deployed via GitHub Pages)

## Planned (do not implement unless asked)
- Combat system with active skill use (v0.3)
- Isometric view (v0.4)
- Save system / LocalStorage (v0.3, still undecided)
- PWA / manifest.json (undecided)
- Touch joystick for mobile (v0.3)

---

## Open Decisions (ask developer before implementing)

- Tod-Mechanik: Soft Death vs. Checkpoint vs. Rogue-like?
- Skill-Limit: Obergrenze für aktive Skills?
- Kombinations-Rezepte: Sollen sie versteckt werden?
- Mobile Tap: Direkt Absorb/Analyze, oder erst Kontextmenü?
- Speichersystem: LocalStorage oder Server?
- PWA: Ja oder Nein?
- Balancing: XP-Kurven, Spawn-Dichte und Respawn-Zeiten noch nicht abgestimmt
