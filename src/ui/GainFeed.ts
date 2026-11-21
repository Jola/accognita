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
// beginnt die Zählung neu.
//
// Vorgabe (Entwickler, 21. November 2026): Die Anzeige steht nicht mehr am
// Blob, sondern oben links (Hoch- und Querformat). Statt der erhaltenen
// Erfahrung zeigt sie für Skills den Fortschrittsbalken bis zur nächsten
// Stufe wie im SKILLS-Tab, mit der Erfahrung, die erst in der Ruhe dazukommt
// (Übertraining, goldener Abschnitt) — unter dem Namen, nicht daneben.
// [VERWORFEN] unter dem Blob (quer rechts daneben) mit „+12 XP“.
// Die Szene setzt die Position (oben links, unter einem sichtbaren
// Hinweisfeld, damit beide sich nicht verdecken).
// Selbstständiges DOM-Modul: kein Phaser, keine GameState-Imports.
// ============================================================

/** Wie lange eine Zeile nach der letzten Änderung stehen bleibt (Vorschlag Claude, offen). */
const HOLD_MS = 5000;
const FADE_MS = 600;
const MAX_ROWS = 7;
/** Breite der Liste (px): Platz für Name und einen gut lesbaren Balken (Vorschlag Claude, offen). */
const FEED_WIDTH = 170;

export interface GainFeedState {
  /** Menge addieren: Zeile „icon label +Summe unit“ */
  add(key: string, icon: string, label: string, amount: number, unit: string, format: (n: number) => string): void;
  /**
   * Skill-Zeile: Name, darunter der Fortschrittsbalken im aktuellen Rang.
   * fraction = erreicht, pendingFraction = mit der Erfahrung aus der Ruhe
   * (beide 0–1, wie RankInfo).
   */
  progress(key: string, icon: string, label: string, fraction: number, pendingFraction: number): void;
  /** Zeile mit festem Text setzen (z. B. Fortschritt zum nächsten Fund) */
  set(key: string, text: string): void;
  /** Goldene Entdeckt-Zeile, die länger stehen bleibt (GDD-11 7.1) */
  discover(key: string, text: string, holdMs: number): void;
  /** Linke obere Ecke der Liste in Pixeln relativ zum Spielbereich. */
  setAnchor(x: number, y: number): void;
  /** Breite der Liste in Pixeln (für Platz neben anderen Anzeigen). */
  readonly width: number;
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
      position: absolute; left: 10px; top: 10px; z-index: 35;
      display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
      pointer-events: none; width: ${FEED_WIDTH}px; max-width: 46vw;
      transition: top .25s;
    }
    .gf-row {
      font: 700 .8rem/1.3 system-ui, sans-serif; color: #c8fbe9;
      background: rgba(5,10,16,.72); border: 1px solid rgba(74,240,200,.28);
      border-radius: 9px; padding: 2px 9px; white-space: nowrap;
      text-shadow: 0 1px 2px #000; transition: opacity ${FADE_MS}ms, transform .25s;
    }
    .gf-row.bump { transform: scale(1.06); }
    .gf-row.skill { width: 100%; padding: 3px 9px 5px; }
    .gf-name { overflow: hidden; text-overflow: ellipsis; }
    .gf-bar { position: relative; height: 5px; margin-top: 3px; background: #1a2030; border-radius: 3px; overflow: hidden; }
    .gf-bar-pending, .gf-bar-fill { position: absolute; left: 0; top: 0; height: 100%; border-radius: 3px; transition: width .4s; }
    /* Gold = Erfahrung aus Übertraining, kommt in der Ruhe nach (wie im SKILLS-Tab) */
    .gf-bar-pending { background: #f0c040; opacity: .6; }
    .gf-bar-fill { background: #4af0c8; }
    .gf-row.gold { color: #ffe9a8; border-color: rgba(255,210,63,.6); background: rgba(30,22,4,.82); white-space: normal; }
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
  let ax = -1, ay = -1;

  const drop = (key: string) => {
    const r = rows.get(key);
    if (!r) return;
    if (r.timer !== null) clearTimeout(r.timer);
    if (r.fadeTimer !== null) clearTimeout(r.fadeTimer);
    r.el.remove();
    rows.delete(key);
  };

  const touch = (key: string, text: string | null, isNew: boolean, holdMs = HOLD_MS) => {
    let r = rows.get(key);
    if (!r) {
      if (rows.size >= MAX_ROWS) drop(rows.keys().next().value as string);
      const el = document.createElement("div");
      el.className = "gf-row";
      root.appendChild(el);
      r = { el, total: 0, timer: null, fadeTimer: null };
      rows.set(key, r);
    }
    if (text !== null) r.el.textContent = text; // null: Skill-Zeile füllt progress() selbst
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
    progress(key, icon, label, fraction, pendingFraction) {
      const existing = rows.get(key);
      const r = touch(key, null, !existing);
      let name = r.el.querySelector<HTMLDivElement>(".gf-name");
      if (!name) {
        r.el.classList.add("skill");
        r.el.innerHTML = `<div class="gf-name"></div><div class="gf-bar"><div class="gf-bar-pending"></div><div class="gf-bar-fill"></div></div>`;
        name = r.el.querySelector<HTMLDivElement>(".gf-name")!;
      }
      name.textContent = `${icon} ${label}`;
      const pct = (v: number) => `${Math.max(0, Math.min(1, v)) * 100}%`;
      r.el.querySelector<HTMLDivElement>(".gf-bar-fill")!.style.width = pct(fraction);
      r.el.querySelector<HTMLDivElement>(".gf-bar-pending")!.style.width = pct(Math.max(fraction, pendingFraction));
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
    setAnchor(x, y) {
      const rx = Math.round(x), ry = Math.round(y);
      if (rx === ax && ry === ay) return;
      ax = rx; ay = ry;
      root.style.left = `${rx}px`;
      root.style.top = `${ry}px`;
    },
    get width() { return root.offsetWidth || FEED_WIDTH; },
    clear() {
      for (const key of [...rows.keys()]) drop(key);
    },
  };
}

// Stand: 21. November 2026 — oben links, Skills mit Fortschrittsbalken (Vorgabe Entwickler); davor 15. November 2026 — Entdeckt-Zeile (GDD-11); davor Erstfassung
