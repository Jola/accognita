// ============================================================
// SAVE MENU — Vollbild-Overlay für Speichern/Laden
//
// Selbstständiges DOM-Modul.
// Liest/schreibt window.gameState und ruft window.gameScene-
// Methoden auf (saveGame, loadGame, resetGame, pauseForUI, resumeForUI).
// ============================================================

import {
  NUM_SAVE_SLOTS,
  getAllSlotMetas,
  deleteSlot,
  formatPlaytime,
  type SaveMeta,
} from "../systems/SaveSystem.js";

function injectStyles() {
  if (document.getElementById("savemenu-styles")) return;
  const s = document.createElement("style");
  s.id = "savemenu-styles";
  s.textContent = `
    #saveMenu {
      position: fixed; inset: 0;
      background: rgba(5,8,16,0.94);
      z-index: 210;
      display: flex; flex-direction: column; align-items: center;
      padding: 16px 12px 24px; overflow-y: auto;
    }
    #saveMenu.hidden { display: none; }
    #smv-header {
      display: flex; width: 100%; max-width: 420px;
      justify-content: space-between; align-items: center;
      margin-bottom: 16px;
    }
    #smv-title { color: #eee; font-size: 1.05em; font-weight: bold; }
    #smv-close {
      background: rgba(255,255,255,0.10); border: 1px solid rgba(255,255,255,0.18);
      color: #ccc; font-size: .85em; padding: 6px 16px;
      border-radius: 8px; cursor: pointer;
    }
    .smv-slot {
      width: 100%; max-width: 420px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.10);
      border-radius: 14px; padding: 14px;
      margin-bottom: 10px; display: flex;
      flex-direction: column; gap: 8px;
    }
    .smv-slot-header {
      display: flex; align-items: center; gap: 10px;
    }
    .smv-slot-num {
      font-size: .72em; color: #888;
      background: rgba(255,255,255,0.08);
      border-radius: 5px; padding: 2px 8px;
      white-space: nowrap;
    }
    .smv-slot-info { flex: 1; }
    .smv-slot-title {
      font-size: .88em; color: #ddd; font-weight: bold;
    }
    .smv-slot-detail {
      font-size: .72em; color: #777; margin-top: 2px;
    }
    .smv-slot-empty { font-size: .85em; color: #555; font-style: italic; }
    .smv-slot-actions {
      display: flex; gap: 7px; flex-wrap: wrap;
    }
    .smv-btn {
      flex: 1; min-width: 70px;
      font-size: .76em; padding: 7px 8px; border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.18);
      background: rgba(255,255,255,0.08); color: #ccc; cursor: pointer;
      text-align: center;
    }
    .smv-btn:active { background: rgba(255,255,255,0.18); }
    .smv-btn.primary {
      background: rgba(74,240,200,0.18); border-color: #4af0c8; color: #4af0c8;
    }
    .smv-btn.danger {
      background: rgba(255,60,80,0.12); border-color: rgba(255,60,80,0.4); color: #ff6070;
    }
    #smv-reset-wrap {
      width: 100%; max-width: 420px;
      margin-top: 12px; padding-top: 12px;
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    #smv-reset-btn {
      width: 100%; padding: 11px;
      background: rgba(255,60,80,0.10); border: 1px solid rgba(255,60,80,0.3);
      color: #ff6070; border-radius: 10px; cursor: pointer;
      font-size: .85em;
    }
    #smv-reset-btn:active { background: rgba(255,60,80,0.25); }
    #smv-confirm {
      width: 100%; max-width: 420px;
      margin-top: 8px; padding: 12px;
      background: rgba(255,60,80,0.18); border: 1px solid rgba(255,60,80,0.5);
      border-radius: 10px; display: none; flex-direction: column; gap: 10px;
      text-align: center;
    }
    #smv-confirm.visible { display: flex; }
    #smv-confirm-text { font-size: .82em; color: #fca; }
    .smv-confirm-btns { display: flex; gap: 8px; }
    .smv-confirm-btns button {
      flex: 1; padding: 8px; border-radius: 8px; cursor: pointer; font-size: .8em;
    }
    #smv-confirm-yes {
      background: rgba(255,60,80,0.3); border: 1px solid rgba(255,60,80,0.6); color: #ff6070;
    }
    #smv-confirm-no {
      background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18); color: #aaa;
    }
  `;
  document.head.appendChild(s);
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("de-DE", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export function createSaveMenu(): { open(): void; close(): void } {
  injectStyles();

  const overlay = document.createElement("div");
  overlay.id = "saveMenu";
  overlay.classList.add("hidden");
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  function render() {
    const metas = getAllSlotMetas();

    const slotHtml = metas.map((meta, i) => {
      if (!meta) {
        return `
          <div class="smv-slot">
            <div class="smv-slot-header">
              <span class="smv-slot-num">Slot ${i + 1}</span>
              <span class="smv-slot-empty">— leer —</span>
            </div>
            <div class="smv-slot-actions">
              <button class="smv-btn primary" data-action="save" data-slot="${i}">💾 Speichern</button>
            </div>
          </div>`;
      }

      const date    = formatDate(meta.savedAt);
      const time    = formatPlaytime(meta.playtimeSeconds);
      const hpPct   = Math.round((meta.hp / meta.maxHp) * 100);

      return `
        <div class="smv-slot">
          <div class="smv-slot-header">
            <span class="smv-slot-num">Slot ${i + 1}</span>
            <div class="smv-slot-info">
              <div class="smv-slot-title">Lv.${meta.playerLevel} · ${meta.skillCount} Skills · HP ${hpPct}%</div>
              <div class="smv-slot-detail">${date} · ${time} gespielt</div>
            </div>
          </div>
          <div class="smv-slot-actions">
            <button class="smv-btn primary" data-action="load" data-slot="${i}">▶ Laden</button>
            <button class="smv-btn" data-action="save" data-slot="${i}">💾 Überschreiben</button>
            <button class="smv-btn danger" data-action="delete" data-slot="${i}">🗑 Löschen</button>
          </div>
        </div>`;
    }).join("");

    overlay.innerHTML = `
      <div id="smv-header">
        <span id="smv-title">💾 Spielstand</span>
        <button id="smv-close">✕ Zurück</button>
      </div>
      ${slotHtml}
      <div id="smv-reset-wrap">
        <button id="smv-reset-btn">🔄 Neues Spiel (alles zurücksetzen)</button>
      </div>
      <div id="smv-confirm">
        <div id="smv-confirm-text">Wirklich neues Spiel starten?<br>Alle Fortschritte gehen verloren!</div>
        <div class="smv-confirm-btns">
          <button id="smv-confirm-yes">✔ Ja, neu starten</button>
          <button id="smv-confirm-no">✘ Abbrechen</button>
        </div>
      </div>
    `;

    // --- Events ---

    overlay.querySelector("#smv-close")?.addEventListener("click", () => close());

    overlay.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action!;
        const slot   = parseInt(btn.dataset.slot!, 10);
        const scene  = (window as any).gameScene;

        if (action === "save") {
          if (scene?.saveGame) scene.saveGame(slot);
          render(); // Metadaten aktualisieren
        } else if (action === "load") {
          if (scene?.loadGame) {
            scene.loadGame(slot);
            close();
          }
        } else if (action === "delete") {
          deleteSlot(slot);
          render();
        }
      });
    });

    overlay.querySelector("#smv-reset-btn")?.addEventListener("click", () => {
      const confirm = overlay.querySelector<HTMLElement>("#smv-confirm");
      if (confirm) confirm.classList.add("visible");
    });

    overlay.querySelector("#smv-confirm-yes")?.addEventListener("click", () => {
      const scene = (window as any).gameScene;
      if (scene?.resetGame) scene.resetGame();
    });

    overlay.querySelector("#smv-confirm-no")?.addEventListener("click", () => {
      const confirm = overlay.querySelector<HTMLElement>("#smv-confirm");
      if (confirm) confirm.classList.remove("visible");
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
