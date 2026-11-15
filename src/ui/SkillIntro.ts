// ============================================================
// SKILL INTRO — neue Skills ausführlich vorstellen, einer nach dem anderen
//
// Vorgabe (Entwickler, 15. November 2026): Ein Skill, der zum ersten Mal
// erlernt wird, wird prominent angezeigt, und man kann lesen, wie genau er
// funktioniert. Neue Skills erscheinen nacheinander: Erst wenn eine Ansicht
// geschlossen wird, kommt die nächste. Texte zu Sehen und Bewegen:
// data/tutorial.ts.
//
// Die Warteschlange zeigt beliebige Karten (auch „Auf Reisen“). Solange
// eine Karte offen ist, hält das Spiel an (onFirstOpen / onAllClosed).
// DOM-Modul ohne Phaser; liest Skill-Daten wie IndexView.
// ============================================================

import type { PlayerState } from "../types/GameState";
import type { SkillDefinition } from "../types/Skill";
import { describeEffect, describePlayerSkillValues } from "../systems/StatsSystem";
import { PRACTICE_DE } from "./IndexView";

export interface IntroSection {
  heading?: string;
  lines: string[];
  /** Hervorgehoben (Aufforderung, Grundsätzliches) */
  emphasis?: boolean;
  /** Ganz unten, direkt über dem Knopf (Aufforderung); sonst gleich nach der Beschreibung */
  atEnd?: boolean;
}

export interface IntroCard {
  kicker: string;
  icon: string;
  title: string;
  tags: string[];
  sections: IntroSection[];
  /** Beim Schließen dieser Karte */
  onClose?: () => void;
}

export interface IntroQueueState {
  push(card: IntroCard): void;
  isOpen(): boolean;
}

function injectStyles() {
  if (document.getElementById("skillintro-styles")) return;
  const s = document.createElement("style");
  s.id = "skillintro-styles";
  s.textContent = `
    #skillIntro {
      position: fixed; inset: 0; z-index: 320; display: none;
      background: rgba(3,5,10,.88); align-items: center; justify-content: center;
      padding: 16px; box-sizing: border-box;
    }
    #skillIntro.open { display: flex; }
    .si-card {
      width: min(92vw, 440px); max-height: 92vh; overflow-y: auto; box-sizing: border-box;
      display: grid; grid-template-areas: "head" "body" "btn"; grid-template-columns: 1fr;
      background: #0d121c; border: 1px solid rgba(255,210,63,.45); border-radius: 16px;
      padding: 18px 18px 14px; color: #d8efe8; font: .9rem/1.55 system-ui, sans-serif;
      box-shadow: 0 0 40px rgba(255,210,63,.12); animation: si-in .35s ease-out;
    }
    @keyframes si-in { from { transform: scale(.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .si-kicker { text-align: center; color: #ffd23f; font-size: .78rem; letter-spacing: .8px; text-transform: uppercase; }
    .si-icon { text-align: center; font-size: 3rem; line-height: 1.2; margin: 6px 0 2px; }
    .si-title { text-align: center; font: 700 1.35rem/1.3 Georgia, serif; color: #9ff5dc; }
    .si-tags { display: flex; justify-content: center; gap: 6px; flex-wrap: wrap; margin: 6px 0 10px; }
    .si-tag { font-size: .72rem; padding: 1px 8px; border-radius: 8px; background: rgba(74,240,200,.12); color: #9cd; }
    .si-sec { margin: 10px 0; }
    .si-h { font-size: .74rem; color: #8ab; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 2px; }
    .si-sec p { margin: 0 0 4px; }
    .si-sec.em { background: rgba(255,210,63,.08); border-left: 3px solid #ffd23f; border-radius: 6px; padding: 8px 10px; }
    .si-head { grid-area: head; }
    .si-body { grid-area: body; }
    .si-foot { grid-area: btn; position: sticky; bottom: -14px; background: #0d121c; padding-bottom: 2px; }
    /* Querformat (Handy quer): Kopf und Knopf links, Details rechts und für sich scrollbar */
    @media (orientation: landscape) and (max-height: 600px) {
      #skillIntro { padding: 10px; }
      .si-card {
        width: min(96vw, 820px); max-height: 94vh; overflow: hidden; padding: 14px 16px;
        grid-template-areas: "head body" "btn body"; grid-template-columns: minmax(180px, 34%) 1fr;
        grid-template-rows: 1fr auto; column-gap: 18px;
      }
      .si-head { align-self: center; }
      .si-body { overflow-y: auto; max-height: calc(94vh - 28px); padding-right: 4px; }
      .si-body .si-sec:first-child { margin-top: 0; }
      .si-foot { position: static; }
      .si-icon { font-size: 2.6rem; }
    }
    .si-btn {
      display: block; width: 100%; margin-top: 12px; box-sizing: border-box; padding: 11px 8px;
      border-radius: 10px; cursor: pointer; border: 1.5px solid rgba(74,240,200,.55);
      background: rgba(74,240,200,.22); color: #9ff5dc; font: 600 .92rem/1.3 system-ui, sans-serif;
    }
  `;
  document.head.appendChild(s);
}

export function createIntroQueue(opts: { onFirstOpen: () => void; onAllClosed: () => void }): IntroQueueState {
  injectStyles();
  const root = document.createElement("div");
  root.id = "skillIntro";
  document.body.appendChild(root);
  const queue: IntroCard[] = [];
  let current: IntroCard | null = null;

  const el = (tag: string, cls: string, text?: string) => {
    const e = document.createElement(tag);
    e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  const render = (card: IntroCard) => {
    root.innerHTML = "";
    const c = el("div", "si-card");
    const head = el("div", "si-head");
    head.append(el("div", "si-kicker", card.kicker), el("div", "si-icon", card.icon), el("div", "si-title", card.title));
    if (card.tags.length) {
      const tags = el("div", "si-tags");
      for (const t of card.tags) tags.appendChild(el("span", "si-tag", t));
      head.appendChild(tags);
    }
    const body = el("div", "si-body");
    for (const sec of card.sections) {
      if (sec.lines.length === 0) continue;
      const s = el("div", `si-sec${sec.emphasis ? " em" : ""}`);
      if (sec.heading) s.appendChild(el("div", "si-h", sec.heading));
      for (const line of sec.lines) s.appendChild(el("p", "", line));
      body.appendChild(s);
    }
    // Knopf immer sichtbar: hochkant unten angeheftet, quer links unter dem Kopf
    const foot = el("div", "si-foot");
    const more = queue.length;
    const btn = el("button", "si-btn", more > 0 ? `Weiter (noch ${more})` : "Verstanden") as HTMLButtonElement;
    btn.addEventListener("click", (ev) => { ev.preventDefault(); next(); });
    foot.appendChild(btn);
    c.append(head, body, foot);
    root.appendChild(c);
    root.classList.add("open");
  };

  const next = () => {
    const closed = current;
    current = queue.shift() ?? null;
    closed?.onClose?.();
    if (current) { render(current); return; }
    root.classList.remove("open");
    root.innerHTML = "";
    opts.onAllClosed();
  };

  return {
    push(card) {
      if (current) {
        queue.push(card);
        // Knopftext der offenen Karte („noch N“) nachziehen
        const btn = root.querySelector(".si-btn");
        if (btn) btn.textContent = `Weiter (noch ${queue.length})`;
        return;
      }
      current = card;
      opts.onFirstOpen();
      render(card);
    },
    isOpen: () => current !== null,
  };
}

/**
 * Karte für einen neu entdeckten Skill: was er tut, was er jetzt bewirkt,
 * wohin er mit Übung wächst, wie er besser wird. `extra` hängt die
 * grundsätzlichen Texte an (Sehen, Bewegen).
 */
export function skillIntroCard(def: SkillDefinition, player: PlayerState, extra: IntroSection[] = []): IntroCard {
  const now = describePlayerSkillValues(player, def.id);
  const max = (def.effects ?? [])
    .map((e) => describeEffect(def.id, e, 1))
    .filter((l): l is string => l !== null);
  const how: string[] = [];
  how.push(def.activation === "passive"
    ? "Wirkt von selbst — du musst nichts tun."
    : "Du setzt ihn bewusst ein: Als Reisender legst du ihn auf die Skill-Leiste.");
  how.push("Er wird besser, wenn du Wesen absorbierst oder analysierst, die ihn kennen.");
  if (def.practice) how.push(`Und durch Tun: Erfahrung ${PRACTICE_DE[def.practice.unit]}.`);
  return {
    kicker: "✨ Neuer Skill entdeckt",
    icon: def.icon,
    title: def.name,
    tags: [def.activation === "passive" ? "passiv" : "aktiv"],
    // Das Grundsätzliche (Sehen, Bewegen) steht vorn, damit man es ohne
    // Scrollen liest; die Aufforderung ganz unten, direkt über dem Knopf
    sections: [
      { heading: "Was er tut", lines: [def.description] },
      ...extra.filter((x) => !x.atEnd),
      { heading: "Jetzt", lines: now },
      { heading: "Mit Übung bis", lines: max.filter((m, i) => m !== now[i]) },
      { heading: "So wird er besser", lines: how },
      ...extra.filter((x) => x.atEnd),
    ],
  };
}

// Stand: 15. November 2026 — Erstfassung
