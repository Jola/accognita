// ============================================================
// BLOB ACTIONS — Knöpfe für die Formwechsel (GDD-10 Abschnitt 3)
//
// Niederlassen, Verschmelzen, Abspalten, Erheben, Wechseln, Tätigkeit —
// sie erscheinen je nach Lage. Welche Knöpfe es gibt, entscheidet die Szene
// (GameScene); dieses Modul zeichnet sie nur.
// Selbstständiges DOM-Modul: kein Phaser, keine GameState-Imports.
// ============================================================

export interface BlobActionButton {
  id: string;
  icon: string;
  label: string;
  /** false: ausgegraut, Tippen zeigt `reason` */
  enabled: boolean;
  reason?: string;
  /** Pulsiert: Stufe 3 eines Anstoßes (GDD-11) */
  pulse?: boolean;
}

export interface BlobActionsState {
  update(buttons: BlobActionButton[]): void;
}

function injectStyles() {
  if (document.getElementById("blobactions-styles")) return;
  const s = document.createElement("style");
  s.id = "blobactions-styles";
  s.textContent = `
    /* Vorgabe (Entwickler, 21. November 2026): Hochformat über dem Joystick,
       Querformat neben ihm. [VERWORFEN] rechts über der Skill-Leiste.
       Joystick: links 18 px, unten 18 px, 136 px groß (Joystick.ts).
       Rechts frei halten: Hochformat die Skill-Spalte (52 px), Querformat
       Skill-Leiste und Absorb/Analyze (≈ 232 px breit). */
    #blobActions {
      position: fixed; z-index: 41;
      display: flex; flex-wrap: wrap-reverse; justify-content: flex-start; gap: 8px;
      pointer-events: none;
    }
    @media (orientation: portrait) {
      #blobActions { left: 18px; bottom: 166px; max-width: calc(100vw - 18px - 88px); }
    }
    @media (orientation: landscape) {
      #blobActions { left: 166px; bottom: 18px; max-width: calc(100vw - 166px - 268px); }
    }
    .ba-btn {
      pointer-events: auto; cursor: pointer; user-select: none; -webkit-user-select: none;
      min-height: 40px; padding: 6px 12px; border-radius: 20px;
      background: rgba(10,13,20,.9); border: 1.5px solid rgba(74,240,200,.55);
      color: #9ff5dc; font: 600 .78rem/1.2 system-ui, sans-serif;
      display: flex; align-items: center; gap: 6px;
    }
    .ba-btn:active { transform: scale(.95); }
    .ba-btn.disabled { opacity: .45; border-style: dashed; }
    /* Stufe 3 eines Anstoßes (GDD-11 4.2): dieser Knopf ist gemeint */
    .ba-btn.pulse { animation: ba-pulse 1.1s ease-in-out infinite; }
    @keyframes ba-pulse { 50% { box-shadow: 0 0 0 4px rgba(255,210,63,.55), 0 0 18px rgba(255,210,63,.6); border-color: #ffd23f; } }
    .ba-btn .ba-icon { font-size: 1.05rem; }
  `;
  document.head.appendChild(s);
}

export function createBlobActions(
  onPress: (id: string) => void,
  onDisabled: (reason: string) => void
): BlobActionsState {
  injectStyles();
  const bar = document.createElement("div");
  bar.id = "blobActions";
  document.body.appendChild(bar);
  let lastKey = "";

  return {
    update(buttons) {
      const key = buttons.map((b) => `${b.id}|${b.label}|${b.enabled}|${b.reason ?? ""}|${b.pulse ? 1 : 0}`).join(";");
      if (key === lastKey) return;
      lastKey = key;
      bar.innerHTML = "";
      for (const b of buttons) {
        const el = document.createElement("div");
        el.className = `ba-btn${b.enabled ? "" : " disabled"}${b.pulse ? " pulse" : ""}`;
        el.innerHTML = `<span class="ba-icon">${b.icon}</span><span>${b.label}</span>`;
        const fire = (ev: Event) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (b.enabled) onPress(b.id);
          else if (b.reason) onDisabled(b.reason);
        };
        el.addEventListener("touchend", fire);
        el.addEventListener("click", fire);
        bar.appendChild(el);
      }
    },
  };
}

// Stand: 21. November 2026 — Hochformat über, Querformat neben dem Joystick (Vorgabe Entwickler); davor 15. November 2026 — Pulsieren für Anstöße (GDD-11); davor Erstfassung (GDD-10 Umsetzungsschritt 3)
