// ============================================================
// MAP VIEW — Reiter „Karte“ im Spielmenü (GDD-10 Abschnitt 11.1)
//
// Biome der 20 × 20 Chunks in ihren Grundfarben (GDD-04); nur besuchte
// Chunks sind aufgedeckt (Nebel). Marker: niedergelassen (grünes Netz),
// vertrocknet (braun), Reisender (Punkt). Der Blob mit dem Bewusstsein ist
// hervorgehoben; über markierten Blobs zeigt ein Pfeil auf sie.
// Tipp auf einen Marker oder einen Eintrag der Liste zeigt Name, Form,
// Entfernung und Angaben (bei niedergelassenen Tätigkeit und Ertrag pro
// Stunde) und die Knöpfe Markieren / Markierung entfernen und, wenn
// erlaubt, Bewusstsein wechseln. Im Wahlmodus des Sterbescreens heißt der
// Knopf „Hier weitermachen“.
// Zoom mit − / +, verschieben durch Ziehen.
// Selbstständiges DOM-Modul: kein Phaser, keine GameState-Imports — die
// Szene liefert alle Daten (MapData) und reagiert auf die Knöpfe.
// ============================================================

export interface MapBlob {
  id: string;
  name: string;
  form: "settled" | "dried" | "traveling";
  nest: boolean;
  x: number;
  y: number;
  conscious: boolean;
  marked: boolean;
  /** Entfernung zum Blob mit Bewusstsein, schon als Text („85 m“) */
  distance: string;
  /** Zusätzliche Zeilen im Infofeld (Tätigkeit, Ertrag …) */
  info: string[];
  canMark: boolean;
  canSwitch: boolean;
}

export interface MapData {
  chunksX: number;
  chunksY: number;
  chunkPx: number;
  biomeColor(cx: number, cy: number): string;
  visited: Set<string>;
  blobs: MapBlob[];
  /** Wahlmodus (Sterbescreen): nur niedergelassene Blobs sind wählbar */
  pickMode?: boolean;
}

export interface MapCallbacks {
  onToggleMark(id: string): void;
  onSwitch(id: string): void;
  onPick?(id: string): void;
}

const ZOOMS = [1, 2, 4, 8, 16, 32];

function injectStyles() {
  if (document.getElementById("mapview-styles")) return;
  const s = document.createElement("style");
  s.id = "mapview-styles";
  s.textContent = `
    .mv-wrap { position: relative; width: 100%; max-width: 520px; margin: 0 auto; }
    .mv-canvas { display: block; width: 100%; aspect-ratio: 1; border-radius: 10px; border: 1px solid #1c2638;
      touch-action: none; background: #05070c; cursor: grab; }
    .mv-zoom { position: absolute; right: 8px; top: 8px; display: flex; flex-direction: column; gap: 6px; }
    .mv-zoom button { width: 36px; height: 36px; border-radius: 8px; border: 1px solid rgba(74,240,200,.5);
      background: rgba(10,13,20,.85); color: #9ff5dc; font: 700 1.1rem/1 system-ui, sans-serif; cursor: pointer; }
    .mv-hint { text-align: center; font-size: .66rem; color: var(--muted, #5a6a7a); margin: 4px 0 8px; }
    .mv-info { max-width: 520px; margin: 0 auto 10px; background: #0f1420; border: 1px solid #1c2638; border-radius: 10px;
      padding: 10px 12px; font-size: .8rem; color: var(--text, #c8d8e8); }
    .mv-info h4 { margin: 0 0 4px; font: 700 .9rem/1.3 Georgia, serif; color: #9ff5dc; }
    .mv-info .mv-line { font-size: .74rem; color: #9ab; }
    .mv-btns { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .mv-btn { flex: 1 1 140px; padding: 9px 10px; border-radius: 9px; border: 1.5px solid rgba(74,240,200,.55);
      background: rgba(74,240,200,.12); color: #9ff5dc; font: 600 .8rem/1.2 system-ui, sans-serif; cursor: pointer; }
    .mv-list { max-width: 520px; margin: 0 auto; display: flex; flex-direction: column; gap: 4px; }
    .mv-row { display: flex; justify-content: space-between; gap: 8px; padding: 8px 10px; border-radius: 8px;
      background: #0b1019; border: 1px solid #141c2a; font-size: .78rem; cursor: pointer; color: var(--text, #c8d8e8); }
    .mv-row.sel { border-color: rgba(74,240,200,.6); }
    .mv-row small { color: #8ab; white-space: nowrap; }
    .mv-list-title { max-width: 520px; margin: 10px auto 4px; font-size: .62rem; letter-spacing: 1.5px; color: var(--accent, #4af0c8); text-transform: uppercase; }
  `;
  document.head.appendChild(s);
}

const FORM_LABEL: Record<MapBlob["form"], string> = {
  settled: "niedergelassen", dried: "vertrocknet", traveling: "reisend",
};

function icon(b: MapBlob): string {
  if (b.form === "dried") return "🟤";
  if (b.form === "traveling") return "🫧";
  return b.nest ? "🏠" : "🌱";
}

export interface MapViewState {
  render(data: MapData): void;
}

export function createMapView(root: HTMLElement, cb: MapCallbacks): MapViewState {
  injectStyles();
  root.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "mv-wrap";
  const canvas = document.createElement("canvas");
  canvas.className = "mv-canvas";
  const zoomBox = document.createElement("div");
  zoomBox.className = "mv-zoom";
  const zIn = document.createElement("button");
  zIn.textContent = "+";
  zIn.setAttribute("aria-label", "Näher");
  const zOut = document.createElement("button");
  zOut.textContent = "−";
  zOut.setAttribute("aria-label", "Weiter weg");
  zoomBox.append(zIn, zOut);
  wrap.append(canvas, zoomBox);
  const hint = document.createElement("div");
  hint.className = "mv-hint";
  const info = document.createElement("div");
  info.className = "mv-info";
  const listTitle = document.createElement("div");
  listTitle.className = "mv-list-title";
  listTitle.textContent = "Alle Blobs";
  const list = document.createElement("div");
  list.className = "mv-list";
  root.append(wrap, hint, info, listTitle, list);

  let data: MapData | null = null;
  let zoomIdx = 3;
  let cx = 0, cy = 0;          // Mitte der Ansicht in Weltpixeln
  let selected: string | null = null;
  let centered = false;

  const worldW = () => (data ? data.chunksX * data.chunkPx : 1);
  const worldH = () => (data ? data.chunksY * data.chunkPx : 1);
  /** CSS-Pixel je Weltpixel */
  const scale = () => (canvas.clientWidth || 300) / (worldW() / ZOOMS[zoomIdx]);

  // Die Mitte darf bis an den Weltrand: so bleibt ein Blob am Rand beim Zoomen in der Mitte
  function clampCenter() {
    if (ZOOMS[zoomIdx] === 1) { cx = worldW() / 2; cy = worldH() / 2; return; }
    cx = Math.max(0, Math.min(worldW(), cx));
    cy = Math.max(0, Math.min(worldH(), cy));
  }

  function toScreen(x: number, y: number) {
    const w = canvas.clientWidth || 300;
    const k = scale();
    return { sx: (x - cx) * k + w / 2, sy: (y - cy) * k + w / 2 };
  }

  function draw() {
    if (!data) return;
    const w = canvas.clientWidth || 300;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * dpr); }
    const g = canvas.getContext("2d");
    if (!g) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = "#05070c";
    g.fillRect(0, 0, w, w);
    const k = scale();
    const cp = data.chunkPx;

    // Chunks: Biomfarbe oder Nebel
    for (let x = 0; x < data.chunksX; x++) {
      for (let y = 0; y < data.chunksY; y++) {
        const { sx, sy } = toScreen(x * cp, y * cp);
        const size = cp * k;
        if (sx > w || sy > w || sx + size < 0 || sy + size < 0) continue;
        g.fillStyle = data.visited.has(`${x},${y}`) ? data.biomeColor(x, y) : "#121722";
        g.fillRect(sx, sy, size + 0.5, size + 0.5);
        if (size >= 24) {
          g.strokeStyle = "rgba(0,0,0,.25)";
          g.lineWidth = 1;
          g.strokeRect(sx + 0.5, sy + 0.5, size, size);
        }
      }
    }

    // Marker
    const r = 6;
    for (const b of data.blobs) {
      const { sx, sy } = toScreen(b.x, b.y);
      if (sx < -30 || sy < -30 || sx > w + 30 || sy > w + 30) continue;
      if (b.form === "settled") {
        g.strokeStyle = "rgba(64,232,144,.9)";
        g.lineWidth = 1.5;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + 0.3;
          g.beginPath();
          g.moveTo(sx, sy);
          g.lineTo(sx + Math.cos(a) * r * 1.9, sy + Math.sin(a) * r * 1.9);
          g.stroke();
        }
        g.fillStyle = "#20a860";
        g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#90ffcc";
        g.beginPath(); g.arc(sx - 1.5, sy - 1.5, r * 0.4, 0, Math.PI * 2); g.fill();
      } else if (b.form === "dried") {
        g.fillStyle = "#5a4418";
        g.beginPath(); g.arc(sx + 1, sy + 1.5, r * 0.85, 0, Math.PI * 2); g.fill();
        g.fillStyle = "#8a6a2a";
        g.beginPath(); g.arc(sx, sy, r * 0.8, 0, Math.PI * 2); g.fill();
      } else {
        g.fillStyle = "#4af0c8";
        g.beginPath(); g.arc(sx, sy, r * 0.75, 0, Math.PI * 2); g.fill();
      }
      if (b.conscious) {
        g.strokeStyle = "#ffffff";
        g.lineWidth = 2;
        g.beginPath(); g.arc(sx, sy, r + 4, 0, Math.PI * 2); g.stroke();
      }
      if (b.id === selected) {
        g.strokeStyle = "rgba(240,192,64,.95)";
        g.lineWidth = 2;
        g.beginPath(); g.arc(sx, sy, r + 7, 0, Math.PI * 2); g.stroke();
      }
      if (b.marked) {
        // Pfeil über dem markierten Blob (Vorgabe Entwickler, 11.1)
        g.fillStyle = b.form === "dried" ? "#d8b060" : "#7fe0a0";
        g.strokeStyle = "#000";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(sx, sy - r - 4);
        g.lineTo(sx - 6, sy - r - 13);
        g.lineTo(sx + 6, sy - r - 13);
        g.closePath();
        g.fill(); g.stroke();
      }
      g.font = "600 11px system-ui, sans-serif";
      g.textAlign = "left";
      g.lineWidth = 3;
      g.strokeStyle = "rgba(0,0,0,.85)";
      g.strokeText(b.name, sx + r + 5, sy + 4);
      g.fillStyle = "#e8f4f0";
      g.fillText(b.name, sx + r + 5, sy + 4);
    }
  }

  function renderInfo() {
    info.innerHTML = "";
    const b = data?.blobs.find((x) => x.id === selected);
    if (!b) {
      info.hidden = true;
      return;
    }
    info.hidden = false;
    const h = document.createElement("h4");
    h.textContent = `${icon(b)} ${b.name}`;
    info.appendChild(h);
    const lines = [`${FORM_LABEL[b.form]}${b.conscious ? " · Bewusstsein ist hier" : ` · ${b.distance} entfernt`}`, ...b.info];
    for (const line of lines) {
      const d = document.createElement("div");
      d.className = "mv-line";
      d.textContent = line;
      info.appendChild(d);
    }
    const btns = document.createElement("div");
    btns.className = "mv-btns";
    const add = (label: string, fn: () => void) => {
      const el = document.createElement("button");
      el.className = "mv-btn";
      el.textContent = label;
      el.addEventListener("click", (ev) => { ev.preventDefault(); fn(); });
      btns.appendChild(el);
    };
    if (data?.pickMode) {
      if (b.form === "settled") add("Hier weitermachen", () => cb.onPick?.(b.id));
    } else {
      if (b.canMark) add(b.marked ? "Markierung entfernen" : "Markieren", () => cb.onToggleMark(b.id));
      if (b.canSwitch) add("Bewusstsein wechseln", () => cb.onSwitch(b.id));
    }
    if (btns.childElementCount > 0) info.appendChild(btns);
  }

  function renderList() {
    list.innerHTML = "";
    for (const b of data?.blobs ?? []) {
      const row = document.createElement("div");
      row.className = `mv-row${b.id === selected ? " sel" : ""}`;
      const left = document.createElement("span");
      left.textContent = `${icon(b)} ${b.name}${b.marked ? " ➤" : ""}`;
      const right = document.createElement("small");
      right.textContent = b.conscious ? "Bewusstsein" : `${FORM_LABEL[b.form]} · ${b.distance}`;
      row.append(left, right);
      row.addEventListener("click", () => select(b.id, true));
      list.appendChild(row);
    }
  }

  function select(id: string | null, center: boolean) {
    selected = id;
    const b = data?.blobs.find((x) => x.id === id);
    if (b && center) { cx = b.x; cy = b.y; clampCenter(); }
    draw();
    renderInfo();
    renderList();
  }

  // Zoom
  zIn.addEventListener("click", () => { zoomIdx = Math.min(ZOOMS.length - 1, zoomIdx + 1); clampCenter(); draw(); });
  zOut.addEventListener("click", () => { zoomIdx = Math.max(0, zoomIdx - 1); clampCenter(); draw(); });

  // Ziehen zum Verschieben, Tippen zum Wählen
  let drag: { x: number; y: number; cx: number; cy: number; moved: boolean } | null = null;
  canvas.addEventListener("pointerdown", (ev) => {
    drag = { x: ev.clientX, y: ev.clientY, cx, cy, moved: false };
    canvas.setPointerCapture(ev.pointerId);
  });
  canvas.addEventListener("pointermove", (ev) => {
    if (!drag) return;
    const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
    if (Math.hypot(dx, dy) > 6) drag.moved = true;
    if (!drag.moved) return;
    const k = scale();
    cx = drag.cx - dx / k;
    cy = drag.cy - dy / k;
    clampCenter();
    draw();
  });
  canvas.addEventListener("pointerup", (ev) => {
    const d = drag;
    drag = null;
    if (!d || d.moved || !data) return;
    const rect = canvas.getBoundingClientRect();
    const px = ev.clientX - rect.left, py = ev.clientY - rect.top;
    let best: MapBlob | null = null;
    let bestD = 22;
    for (const b of data.blobs) {
      const { sx, sy } = toScreen(b.x, b.y);
      const dd = Math.hypot(sx - px, sy - py);
      if (dd < bestD) { best = b; bestD = dd; }
    }
    select(best?.id ?? null, false);
  });

  return {
    render(d) {
      data = d;
      if (!centered || d.pickMode) {
        const c = d.blobs.find((b) => b.conscious) ?? d.blobs[0];
        if (c) { cx = c.x; cy = c.y; }
        centered = true;
      }
      if (selected && !d.blobs.some((b) => b.id === selected)) selected = null;
      hint.textContent = d.pickMode
        ? "Tippe auf einen niedergelassenen Blob und dann auf „Hier weitermachen“."
        : "Tippe auf einen Blob. Ziehen verschiebt, − / + zoomt. Nur besuchte Gebiete sind aufgedeckt.";
      clampCenter();
      // Breite steht erst nach dem Einblenden des Reiters fest
      requestAnimationFrame(() => draw());
      draw();
      renderInfo();
      renderList();
    },
  };
}

// Stand: 15. November 2026 — Erstfassung (GDD-10 Umsetzungsschritt 7)
