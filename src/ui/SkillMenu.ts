// ============================================================
// SKILL MENU — Vollbild-Overlay zur Skill-Verwaltung
//
// Öffnet sich per Long-Press auf die SkillBar.
// Spiel wird während des Menüs pausiert (pauseForUI / resumeForUI).
// Liest window.gameState und window.__ALL_SKILLS.
// ============================================================

import type { SkillBarState } from "./SkillBar.js";

function injectStyles() {
  if (document.getElementById("skillmenu-styles")) return;
  const s = document.createElement("style");
  s.id = "skillmenu-styles";
  s.textContent = `
    #skillMenu {
      position: fixed; inset: 0;
      background: rgba(5,8,16,0.92);
      z-index: 200;
      display: flex; flex-direction: column; align-items: center;
      padding: 16px 12px; overflow-y: auto;
    }
    #skillMenu.hidden { display: none; }
    #smenu-header {
      display: flex; width: 100%; max-width: 480px;
      justify-content: space-between; align-items: center;
      margin-bottom: 14px;
    }
    #smenu-title { color: #eee; font-size: 1.05em; font-weight: bold; }
    #smenu-close {
      background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
      color: #ccc; font-size: .85em; padding: 6px 16px;
      border-radius: 8px; cursor: pointer;
    }
    #smenu-grid {
      display: grid; grid-template-columns: repeat(2, 1fr);
      gap: 10px; width: 100%; max-width: 480px;
    }
    .smenu-card {
      background: rgba(255,255,255,0.06); border-radius: 12px;
      padding: 10px; display: flex; flex-direction: column; gap: 6px;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .smenu-card-top {
      display: flex; align-items: center; gap: 8px;
    }
    .smenu-card-icon { font-size: 22px; }
    .smenu-card-name { font-size: .82em; color: #eee; font-weight: bold; flex: 1; }
    .smenu-card-lv { font-size: .72em; color: #888; white-space: nowrap; }
    .smenu-card-desc { font-size: .68em; color: #777; line-height: 1.35; }
    .smenu-passive-badge {
      font-size: .62em; background: rgba(74,240,200,0.18);
      color: #4af0c8; border-radius: 4px; padding: 2px 5px;
    }
    .smenu-slots {
      display: flex; gap: 5px; flex-wrap: wrap; margin-top: 2px;
    }
    .smenu-slot-btn {
      font-size: .68em; padding: 3px 9px; border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.08); color: #bbb; cursor: pointer;
    }
    .smenu-slot-btn.assigned {
      background: rgba(74,240,200,0.2); border-color: #4af0c8; color: #4af0c8;
    }
    .smenu-use-btn {
      font-size: .73em; padding: 4px 10px; border-radius: 6px; border: none;
      background: rgba(255,200,50,0.2); color: #ffc832; cursor: pointer; margin-top: 2px;
    }
    .smenu-use-btn:active { background: rgba(255,200,50,0.4); }
  `;
  document.head.appendChild(s);
}

export function createSkillMenu(skillBar: SkillBarState): {
  open(): void;
  close(): void;
} {
  injectStyles();

  const overlay = document.createElement("div");
  overlay.id = "skillMenu";
  overlay.classList.add("hidden");
  document.body.appendChild(overlay);

  // Schließen per Tap außerhalb der Karte
  overlay.addEventListener("pointerdown", (e) => {
    if (e.target === overlay) close();
  });

  function render() {
    const gs = (window as any).gameState;
    if (!gs) return;
    const player = gs.player;
    const allSkills: Map<string, any> = (window as any).__ALL_SKILLS ?? new Map();

    const skills = [...(player.discoveredSkills as Map<string, any>).entries()]
      .map(([id, inst]) => ({ id, inst, def: allSkills.get(id) }))
      .filter((s) => !!s.def);

    overlay.innerHTML = `
      <div id="smenu-header">
        <span id="smenu-title">⚔️ Skills (${skills.length})</span>
        <button id="smenu-close">✕ Schließen</button>
      </div>
      <div id="smenu-grid">
        ${skills
          .map(({ id, inst, def }) => {
            const isPassive = def.activation === "passive";

            const slotButtons = !isPassive
              ? [0, 1, 2, 3]
                  .map((i) => {
                    const assigned = skillBar.slots[i] === id;
                    return `<button class="smenu-slot-btn${assigned ? " assigned" : ""}"
                      data-skill="${id}" data-slot="${i}">S${i + 1}</button>`;
                  })
                  .join("")
              : "";

            const useButton = !isPassive
              ? `<button class="smenu-use-btn" data-use="${id}">▶ Einsetzen</button>`
              : "";

            return `
              <div class="smenu-card">
                <div class="smenu-card-top">
                  <span class="smenu-card-icon">${def.icon}</span>
                  <span class="smenu-card-name">${def.name}</span>
                  <span class="smenu-card-lv">Lv.${inst.level}</span>
                  ${isPassive ? '<span class="smenu-passive-badge">PASSIV</span>' : ""}
                </div>
                <div class="smenu-card-desc">${def.description ?? ""}</div>
                ${slotButtons ? `<div class="smenu-slots">${slotButtons}</div>` : ""}
                ${useButton}
              </div>
            `;
          })
          .join("")}
      </div>
    `;

    // Event-Listener nach DOM-Aufbau setzen
    overlay.querySelector("#smenu-close")?.addEventListener("pointerup", () => close());

    overlay.querySelectorAll<HTMLButtonElement>(".smenu-slot-btn").forEach((btn) => {
      btn.addEventListener("pointerup", () => {
        const skillId = btn.dataset.skill!;
        const slotIdx = parseInt(btn.dataset.slot!, 10);
        // Gleiches Skill nochmal → entfernen (Toggle)
        if (skillBar.slots[slotIdx] === skillId) {
          skillBar.assignSlot(slotIdx, null);
        } else {
          // Erst aus altem Slot entfernen, falls bereits belegt
          const oldSlot = skillBar.slots.indexOf(skillId);
          if (oldSlot >= 0) skillBar.assignSlot(oldSlot, null);
          skillBar.assignSlot(slotIdx, skillId);
        }
        render(); // Slot-Buttons aktualisieren
      });
    });

    overlay.querySelectorAll<HTMLButtonElement>(".smenu-use-btn").forEach((btn) => {
      btn.addEventListener("pointerup", () => {
        const skillId = btn.dataset.use!;
        close();
        const scene = (window as any).gameScene;
        if (scene?.activateSkill) scene.activateSkill(skillId);
      });
    });
  }

  function open() {
    render();
    overlay.classList.remove("hidden");
    const scene = (window as any).gameScene;
    if (scene?.pauseForUI) scene.pauseForUI();
  }

  function close() {
    overlay.classList.add("hidden");
    const scene = (window as any).gameScene;
    if (scene?.resumeForUI) scene.resumeForUI();
  }

  return { open, close };
}
