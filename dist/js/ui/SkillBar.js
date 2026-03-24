// ============================================================
// SKILL BAR — Touch-Schnellzugriff auf bis zu 4 Skills
//
// Selbstständiges DOM-Modul: injiziert CSS, erstellt DOM.
// Kein Phaser, keine GameState-Imports — liest window.gameState.
// ============================================================
const NUM_SLOTS = 4;
const LONG_PRESS_MS = 600;
function injectStyles() {
    if (document.getElementById("skillbar-styles"))
        return;
    const s = document.createElement("style");
    s.id = "skillbar-styles";
    s.textContent = `
    #skillBar {
      display: flex;
      gap: 8px;
      pointer-events: auto;
    }
    .sk-slot {
      width: 52px; height: 52px;
      border-radius: 12px;
      background: rgba(0,0,0,0.65);
      border: 2px solid rgba(255,255,255,0.18);
      display: flex; align-items: center; justify-content: center;
      position: relative; overflow: hidden;
      cursor: pointer; user-select: none; -webkit-user-select: none;
      touch-action: none;
      transition: border-color .15s, background .15s;
    }
    .sk-slot.empty {
      border-style: dashed;
      opacity: 0.5;
    }
    .sk-slot:active { border-color: rgba(255,255,255,0.6); }
    .sk-slot-icon { font-size: 26px; line-height: 1; z-index: 1; pointer-events: none; }
    .sk-slot-cd {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.68);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: bold; color: #fff;
      z-index: 2; pointer-events: none;
    }
    .sk-slot-cd.hidden { display: none; }
  `;
    document.head.appendChild(s);
}
export function createSkillBar(container, onOpenMenu) {
    injectStyles();
    const slots = new Array(NUM_SLOTS).fill(null);
    const slotEls = [];
    const cdEls = [];
    const bar = document.createElement("div");
    bar.id = "skillBar";
    container.appendChild(bar);
    for (let i = 0; i < NUM_SLOTS; i++) {
        const slot = document.createElement("div");
        slot.className = "sk-slot empty";
        const icon = document.createElement("span");
        icon.className = "sk-slot-icon";
        icon.textContent = "+";
        const cd = document.createElement("div");
        cd.className = "sk-slot-cd hidden";
        slot.appendChild(icon);
        slot.appendChild(cd);
        bar.appendChild(slot);
        slotEls.push(slot);
        cdEls.push(cd);
        // Long-Press → Menü öffnen; kurzes Tap → Skill aktivieren
        let pressTimer = null;
        let isLong = false;
        slot.addEventListener("pointerdown", () => {
            isLong = false;
            pressTimer = setTimeout(() => {
                isLong = true;
                onOpenMenu();
            }, LONG_PRESS_MS);
        });
        slot.addEventListener("pointerup", () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
            if (isLong)
                return;
            const skillId = slots[i];
            if (!skillId) {
                onOpenMenu();
                return;
            }
            const scene = window.gameScene;
            if (scene?.activateSkill)
                scene.activateSkill(skillId);
        });
        slot.addEventListener("pointercancel", () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                pressTimer = null;
            }
        });
    }
    function update() {
        const gs = window.gameState;
        if (!gs)
            return;
        const player = gs.player;
        const now = Date.now();
        const allSkills = window.__ALL_SKILLS;
        for (let i = 0; i < NUM_SLOTS; i++) {
            const skillId = slots[i];
            const iconEl = slotEls[i].querySelector(".sk-slot-icon");
            const cdEl = cdEls[i];
            if (!skillId) {
                slotEls[i].className = "sk-slot empty";
                iconEl.textContent = "+";
                cdEl.className = "sk-slot-cd hidden";
                continue;
            }
            const hasSkill = player.discoveredSkills?.has(skillId);
            if (!hasSkill) {
                slotEls[i].className = "sk-slot empty";
                iconEl.textContent = "?";
                cdEl.className = "sk-slot-cd hidden";
                continue;
            }
            const def = allSkills?.get(skillId);
            iconEl.textContent = def?.icon ?? "⚡";
            slotEls[i].className = "sk-slot";
            // Cooldown-Overlay
            const expiresAt = player.skillCooldowns?.get(skillId) ?? 0;
            const remaining = expiresAt - now;
            if (remaining > 50) {
                cdEl.className = "sk-slot-cd";
                cdEl.textContent = (remaining / 1000).toFixed(1) + "s";
            }
            else {
                cdEl.className = "sk-slot-cd hidden";
            }
        }
    }
    const interval = setInterval(update, 150);
    return {
        slots,
        assignSlot(index, skillId) {
            if (index < 0 || index >= NUM_SLOTS)
                return;
            slots[index] = skillId;
            update();
        },
        update,
        destroy() {
            clearInterval(interval);
            bar.remove();
        },
    };
}
//# sourceMappingURL=SkillBar.js.map