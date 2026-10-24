// ============================================================
// GAME MENU — Vollbild-Spielmenü (Skills, Combo, Inventar, Nearby, Log, Index)
//
// Selbstständiges DOM-Modul. Das Markup steht in accognita.template.html
// (#gameMenu), weil GameScene die Tab-Inhalte über deren IDs befüllt.
// Öffnen pausiert das Spiel (window.gameScene.pauseForUI/resumeForUI).
// ============================================================

import { createIndexView } from "./IndexView.js";

export interface GameMenu {
  open(tab?: string): void;
  close(): void;
}

export function createGameMenu(): GameMenu {
  const overlay = document.getElementById("gameMenu")!;
  const body = overlay.querySelector<HTMLElement>(".gm-body")!;
  let indexBuilt = false;
  let isOpen = false;

  function switchTab(name: string) {
    overlay.querySelectorAll<HTMLElement>(".tab-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.tab === name));
    overlay.querySelectorAll<HTMLElement>(".tab-content").forEach((c) =>
      c.classList.toggle("active", c.id === `tab-${name}`));

    if (name === "index" && !indexBuilt) {
      createIndexView(document.getElementById("index-root")!);
      indexBuilt = true;
    }
    body.scrollTop = 0;
  }

  overlay.querySelectorAll<HTMLElement>(".tab-btn").forEach((b) =>
    b.addEventListener("click", () => switchTab(b.dataset.tab!)));
  overlay.querySelector(".gm-close")?.addEventListener("click", () => close());

  function open(tab?: string) {
    if (tab) switchTab(tab);
    if (isOpen) return;
    isOpen = true;
    overlay.classList.remove("hidden");
    (window as any).gameScene?.pauseForUI?.();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    overlay.classList.add("hidden");
    (window as any).gameScene?.resumeForUI?.();
  }

  return { open, close };
}
