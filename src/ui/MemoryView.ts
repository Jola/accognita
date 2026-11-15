// ============================================================
// MEMORY VIEW — Reiter GEDÄCHTNIS (GDD-11 Abschnitt 7.3)
//
// Vorgabe (Entwickler, 15. November 2026): eigener Reiter, nicht im INDEX —
// der INDEX ist für den Entwickler; was der Spieler braucht, bekommt einen
// eigenen Bildschirm.
//
// Sammelt jede gezeigte Erklärung, jede Skill-Karte und jede Entdeckung.
// Neueste oben (Vorschlag Claude, offen: das zuletzt Erlebte sucht man am
// häufigsten). Ein Eintrag klappt per Tippen auf. Die Szene liefert die
// fertigen Einträge; dieses Modul zeichnet nur (DOM, kein Phaser).
// ============================================================

import type { IntroSection } from "./SkillIntro";

export interface MemoryItem {
  key: string;
  icon: string;
  title: string;
  /** Art: „Skill“, „Erklärung“, „Entdeckung“ */
  kind: string;
  /** z. B. „vor 12 min“ */
  when: string;
  sections: IntroSection[];
}

function injectStyles() {
  if (document.getElementById("memoryview-styles")) return;
  const s = document.createElement("style");
  s.id = "memoryview-styles";
  s.textContent = `
    .mem-empty { color: var(--muted, #8ab); font-size: .8rem; line-height: 1.6; padding: 8px 2px; }
    .mem-item { border: 1px solid rgba(74,240,200,.18); border-radius: 10px; margin: 0 0 8px; background: rgba(13,18,28,.85); overflow: hidden; }
    .mem-head { display: flex; align-items: center; gap: 10px; padding: 9px 12px; cursor: pointer; }
    .mem-icon { font-size: 1.4rem; line-height: 1; width: 1.8rem; text-align: center; }
    .mem-title { flex: 1; font: 600 .86rem/1.3 system-ui, sans-serif; color: #c8f5e8; }
    .mem-meta { font: .66rem/1.3 system-ui, sans-serif; color: #8ab; text-align: right; white-space: nowrap; }
    .mem-body { display: none; padding: 0 14px 10px; font: .82rem/1.55 system-ui, sans-serif; color: #d8efe8; }
    .mem-item.open .mem-body { display: block; }
    .mem-item.open .mem-head { border-bottom: 1px solid rgba(74,240,200,.12); }
    .mem-sec { margin: 8px 0; }
    .mem-sec.em { background: rgba(255,210,63,.08); border-left: 3px solid #ffd23f; border-radius: 6px; padding: 6px 9px; }
    .mem-h { font-size: .7rem; color: #8ab; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 2px; }
    .mem-sec p { margin: 0 0 3px; }
  `;
  document.head.appendChild(s);
}

/** Aufgeklappte Einträge bleiben beim Neuzeichnen offen */
const openKeys = new Set<string>();

export function renderMemoryView(root: HTMLElement, items: MemoryItem[]) {
  injectStyles();
  root.innerHTML = "";
  if (items.length === 0) {
    const p = document.createElement("div");
    p.className = "mem-empty";
    p.textContent = "Noch nichts erlebt. Was du entdeckst und lernst, kannst du hier später nachlesen.";
    root.appendChild(p);
    return;
  }
  for (const it of [...items].reverse()) {
    const item = document.createElement("div");
    item.className = `mem-item${openKeys.has(it.key) ? " open" : ""}`;
    const head = document.createElement("div");
    head.className = "mem-head";
    const icon = document.createElement("span");
    icon.className = "mem-icon";
    icon.textContent = it.icon;
    const title = document.createElement("span");
    title.className = "mem-title";
    title.textContent = it.title;
    const meta = document.createElement("span");
    meta.className = "mem-meta";
    meta.innerHTML = "";
    meta.append(it.kind, document.createElement("br"), it.when);
    head.append(icon, title, meta);
    head.addEventListener("click", () => {
      item.classList.toggle("open");
      if (item.classList.contains("open")) openKeys.add(it.key); else openKeys.delete(it.key);
    });
    const body = document.createElement("div");
    body.className = "mem-body";
    for (const sec of it.sections) {
      if (sec.lines.length === 0) continue;
      const s = document.createElement("div");
      s.className = `mem-sec${sec.emphasis ? " em" : ""}`;
      if (sec.heading) {
        const h = document.createElement("div");
        h.className = "mem-h";
        h.textContent = sec.heading;
        s.appendChild(h);
      }
      for (const line of sec.lines) {
        const p = document.createElement("p");
        p.textContent = line;
        s.appendChild(p);
      }
      body.appendChild(s);
    }
    item.append(head, body);
    root.appendChild(item);
  }
}

// Stand: 15. November 2026 — Erstfassung (GDD-11 Umsetzung)
