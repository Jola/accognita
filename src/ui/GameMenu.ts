// ============================================================
// GAME MENU — Vollbild-Spielmenü (Skills, Werte, Karte, Inventar, Nearby, Log, Index; Combo ausgebaut 15. November 2026)
//
// Selbstständiges DOM-Modul. Das Markup steht in accognita.template.html
// (#gameMenu), weil GameScene die Tab-Inhalte über deren IDs befüllt.
// Öffnen pausiert das Spiel (window.gameScene.pauseForUI/resumeForUI).
// ============================================================

import { createIndexView } from "./IndexView.js";
import { renderStatsView } from "./StatsView.js";

export interface GameMenu {
  open(tab?: string): void;
  close(): void;
}

export interface GameMenuOptions {
  /** Karte zeichnen (die Szene liefert die Daten, GDD-10 11.1) */
  renderMap?: (root: HTMLElement) => void;
  /** Nach dem Schließen (z. B. Sterbescreen wieder zeigen) */
  onClose?: () => void;
}

export function createGameMenu(opts: GameMenuOptions = {}): GameMenu {
  const overlay = document.getElementById("gameMenu")!;
  const body = overlay.querySelector<HTMLElement>(".gm-body")!;
  let indexBuilt = false;
  let isOpen = false;

  function switchTab(name: string) {
    overlay.querySelectorAll<HTMLElement>(".tab-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.tab === name));
    overlay.querySelectorAll<HTMLElement>(".tab-content").forEach((c) =>
      c.classList.toggle("active", c.id === `tab-${name}`));

    // Werte-Tab: bei jedem Öffnen neu, damit er den aktuellen Stand zeigt
    if (name === "stats") renderStatsView(document.getElementById("stats-root")!);
    if (name === "map") opts.renderMap?.(document.getElementById("map-root")!);
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
    else {
      const active = overlay.querySelector<HTMLElement>(".tab-btn.active")?.dataset.tab;
      if (active === "stats" || active === "map") switchTab(active);
    }
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
    opts.onClose?.();
  }

  return { open, close };
}
