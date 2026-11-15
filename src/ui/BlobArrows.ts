// ============================================================
// BLOB ARROWS — Richtungspfeile zu markierten Blobs (GDD-10 Abschnitt 11.2)
//
// Für jeden markierten Blob außerhalb des Bildschirms zeigt am Rand ein Pfeil
// zu ihm, mit Name und Entfernung; ist er auf dem Bildschirm, steht ein
// kleiner Pfeil über ihm. Braun für vertrocknete, grün für niedergelassene.
// Die Lage berechnet die Szene je Frame aus zwei Positionen.
// Selbstständiges DOM-Modul: kein Phaser, keine GameState-Imports.
// ============================================================

export interface ArrowTarget {
  id: string;
  /** Bildschirmposition des Ziels relativ zur Spielfläche (px) */
  sx: number;
  sy: number;
  label: string;
  color: string;
}

export interface BlobArrowsState {
  update(targets: ArrowTarget[], width: number, height: number): void;
}

function injectStyles() {
  if (document.getElementById("blobarrows-styles")) return;
  const s = document.createElement("style");
  s.id = "blobarrows-styles";
  s.textContent = `
    .bar-arrow {
      position: absolute; z-index: 35; pointer-events: none; transform: translate(-50%, -50%);
      display: flex; flex-direction: column; align-items: center; gap: 1px;
      font: 600 .66rem/1.1 system-ui, sans-serif; text-shadow: 0 0 3px #000, 0 0 3px #000;
    }
    .bar-arrow .bar-tip { font-size: 1.25rem; line-height: 1; }
  `;
  document.head.appendChild(s);
}

export function createBlobArrows(container: HTMLElement): BlobArrowsState {
  injectStyles();
  const els = new Map<string, HTMLElement>();
  const MARGIN = 28;

  return {
    update(targets, width, height) {
      const seen = new Set<string>();
      for (const t of targets) {
        seen.add(t.id);
        let el = els.get(t.id);
        if (!el) {
          el = document.createElement("div");
          el.className = "bar-arrow";
          el.innerHTML = `<span class="bar-tip">➤</span><span class="bar-label"></span>`;
          container.appendChild(el);
          els.set(t.id, el);
        }
        const onScreen = t.sx >= 0 && t.sx <= width && t.sy >= 0 && t.sy <= height;
        const cx = width / 2, cy = height / 2;
        let x = t.sx, y = t.sy, angle = Math.PI / 2; // über dem Blob: Pfeil nach unten
        if (onScreen) {
          y = t.sy - 22;
        } else {
          angle = Math.atan2(t.sy - cy, t.sx - cx);
          const dx = Math.cos(angle), dy = Math.sin(angle);
          const scale = Math.min(
            Math.abs(dx) > 1e-6 ? (width / 2 - MARGIN) / Math.abs(dx) : Infinity,
            Math.abs(dy) > 1e-6 ? (height / 2 - MARGIN) / Math.abs(dy) : Infinity,
          );
          x = cx + dx * scale;
          y = cy + dy * scale;
        }
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.color = t.color;
        (el.querySelector(".bar-tip") as HTMLElement).style.transform = `rotate(${angle}rad)`;
        (el.querySelector(".bar-label") as HTMLElement).textContent = onScreen ? "" : t.label;
      }
      for (const [id, el] of els) {
        if (!seen.has(id)) { el.remove(); els.delete(id); }
      }
    },
  };
}

// Stand: 15. November 2026 — Erstfassung (GDD-10 Umsetzungsschritt 3)
