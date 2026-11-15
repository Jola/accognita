// ============================================================
// GAIN FEED — was der Blob gerade lernt und sammelt
//
// Vorgabe (Entwickler, 15. November 2026): Die Anzeige für Gelerntes oder
// Absorbiertes bleibt länger und aktualisiert sich, statt sich zu
// überschreiben. Bekommt derselbe Skill mehrfach Erfahrung, wächst die Zahl
// in seiner Zeile; verschiedene Dinge stehen untereinander (parallel).
//
// Eine Zeile je Schlüssel (z. B. „xp:crawl“, „mat:plant_fiber“). Sie bleibt
// HOLD_MS nach der letzten Änderung stehen und blendet dann aus; danach
// beginnt die Zählung neu. Die Szene setzt die Position (unter dem Blob,
// damit oben der Hinweistext frei bleibt).
// Selbstständiges DOM-Modul: kein Phaser, keine GameState-Imports.
// ============================================================

/** Wie lange eine Zeile nach der letzten Änderung stehen bleibt (Vorschlag Claude, offen). */
const HOLD_MS = 5000;
const FADE_MS = 600;
const MAX_ROWS = 7;

export interface GainFeedState {
  /** Menge addieren: Zeile „icon label +Summe unit“ */
  add(key: string, icon: string, label: string, amount: number, unit: string, format: (n: number) => string): void;
  /** Zeile mit festem Text setzen (z. B. Fortschritt zum nächsten Fund) */
  set(key: string, text: string): void;
  /** Goldene Entdeckt-Zeile, die länger stehen bleibt (GDD-11 7.1) */
  discover(key: string, text: string, holdMs: number): void;
  /**
   * Oberkante der Liste in Bildschirm-Pixeln. "center": x ist die Mitte
   * (hochkant, unter dem Blob); "left": x ist der linke Rand (quer, rechts
   * neben dem Blob — unter ihm wäre zu wenig Platz).
   */
  setAnchor(x: number, y: number, align?: "center" | "left"): void;
  /** Alles sofort ausblenden (Körperwechsel) */
  clear(): void;
}

interface Row {
  el: HTMLDivElement;
  total: number;
  timer: number | null;
  fadeTimer: number | null;
}

function injectStyles() {
  if (document.getElementById("gainfeed-styles")) return;
  const s = document.createElement("style");
  s.id = "gainfeed-styles";
  s.textContent = `
    #gainFeed {
      position: absolute; transform: translateX(-50%); z-index: 35;
      display: flex; flex-direction: column; align-items: center; gap: 3px;
      pointer-events: none; width: max-content; max-width: 80vw;
    }
    .gf-row {
      font: 700 .8rem/1.3 system-ui, sans-serif; color: #c8fbe9;
      background: rgba(5,10,16,.72); border: 1px solid rgba(74,240,200,.28);
      border-radius: 9px; padding: 2px 9px; white-space: nowrap;
      text-shadow: 0 1px 2px #000; transition: opacity ${FADE_MS}ms, transform .25s;
    }
    .gf-row.bump { transform: scale(1.08); }
    .gf-row.gold { color: #ffe9a8; border-color: rgba(255,210,63,.6); background: rgba(30,22,4,.82); white-space: normal; max-width: min(80vw, 340px); text-align: center; }
    .gf-row.out { opacity: 0; }
  `;
  document.head.appendChild(s);
}

export function createGainFeed(parent: HTMLElement): GainFeedState {
  injectStyles();
  const root = document.createElement("div");
  root.id = "gainFeed";
  parent.appendChild(root);
  const rows = new Map<string, Row>();
  let ax = -1, ay = -1, aAlign = "";

  const drop = (key: string) => {
    const r = rows.get(key);
    if (!r) return;
    if (r.timer !== null) clearTimeout(r.timer);
    if (r.fadeTimer !== null) clearTimeout(r.fadeTimer);
    r.el.remove();
    rows.delete(key);
  };

  const touch = (key: string, text: string, isNew: boolean, holdMs = HOLD_MS) => {
    let r = rows.get(key);
    if (!r) {
      if (rows.size >= MAX_ROWS) drop(rows.keys().next().value as string);
      const el = document.createElement("div");
      el.className = "gf-row";
      root.appendChild(el);
      r = { el, total: 0, timer: null, fadeTimer: null };
      rows.set(key, r);
    }
    r.el.textContent = text;
    r.el.classList.remove("out");
    if (!isNew) {
      r.el.classList.add("bump");
      setTimeout(() => r!.el.classList.remove("bump"), 180);
    }
    if (r.timer !== null) clearTimeout(r.timer);
    if (r.fadeTimer !== null) { clearTimeout(r.fadeTimer); r.fadeTimer = null; }
    const row = r;
    row.timer = window.setTimeout(() => {
      row.timer = null;
      row.el.classList.add("out");
      row.fadeTimer = window.setTimeout(() => drop(key), FADE_MS);
    }, holdMs);
    return r;
  };

  return {
    add(key, icon, label, amount, unit, format) {
      if (!(amount > 0)) return;
      const existing = rows.get(key);
      const total = (existing?.total ?? 0) + amount;
      const r = touch(key, `${icon} ${label} +${format(total)}${unit ? ` ${unit}` : ""}`, !existing);
      r.total = total;
    },
    set(key, text) {
      const existing = rows.get(key);
      if (existing && existing.el.textContent === text) return;
      touch(key, text, !existing);
    },
    discover(key, text, holdMs) {
      const r = touch(key, text, !rows.has(key), holdMs);
      r.el.classList.add("gold");
    },
    setAnchor(x, y, align = "center") {
      const rx = Math.round(x), ry = Math.round(y);
      if (rx === ax && ry === ay && align === aAlign) return;
      ax = rx; ay = ry;
      if (align !== aAlign) {
        aAlign = align;
        root.style.transform = align === "center" ? "translateX(-50%)" : "none";
        root.style.alignItems = align === "center" ? "center" : "flex-start";
      }
      root.style.left = `${rx}px`;
      root.style.top = `${ry}px`;
    },
    clear() {
      for (const key of [...rows.keys()]) drop(key);
    },
  };
}

// Stand: 15. November 2026 — Entdeckt-Zeile (GDD-11); davor Erstfassung
