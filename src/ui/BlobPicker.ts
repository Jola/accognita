// ============================================================
// BLOB PICKER — Sterbescreen und Liste der Blobs (GDD-10 Abschnitte 4.2, 9.1)
//
// Ein Overlay mit Überschrift, kurzem Text, optionaler Übersicht, einem
// Hauptknopf und einer Liste wählbarer Blobs. Genutzt für den Sterbescreen
// („Du wurdest besiegt“) und für „Bewusstsein wechseln“. Bis es die Karte
// gibt (Umsetzungsschritt 7), wählt man aus dieser Liste.
// Das Spiel hält an, solange das Overlay offen ist (die Szene pausiert).
// Selbstständiges DOM-Modul: kein Phaser, keine GameState-Imports.
// ============================================================

export interface PickerItem {
  label: string;
  detail?: string;
  onPick: () => void;
}

export interface PickerOptions {
  title: string;
  text?: string;
  summary?: string;
  primary?: { label: string; onPick: () => void };
  /** Überschrift über der Liste */
  listTitle?: string;
  items: PickerItem[];
  /** Darf man ohne Wahl schließen? (Sterbescreen: nein) */
  cancellable: boolean;
  onClose?: () => void;
}

export interface BlobPickerState {
  open(opts: PickerOptions): void;
  close(): void;
  isOpen(): boolean;
}

function injectStyles() {
  if (document.getElementById("blobpicker-styles")) return;
  const s = document.createElement("style");
  s.id = "blobpicker-styles";
  s.textContent = `
    #blobPicker {
      position: fixed; inset: 0; z-index: 300; display: none;
      background: rgba(3,5,10,.86); align-items: center; justify-content: center;
      padding: 16px; box-sizing: border-box;
    }
    #blobPicker.open { display: flex; }
    .bp-card {
      width: min(92vw, 420px); max-height: 92vh; overflow-y: auto; box-sizing: border-box;
      background: #0d121c; border: 1px solid rgba(74,240,200,.35); border-radius: 14px;
      padding: 18px 16px; color: #d8efe8; font: .9rem/1.5 system-ui, sans-serif;
    }
    .bp-title { font: 700 1.15rem/1.3 Georgia, serif; color: #ff8fa3; text-align: center; margin-bottom: 10px; }
    .bp-title.neutral { color: #9ff5dc; }
    .bp-text { font-style: italic; color: #cfe; text-align: center; margin-bottom: 10px; }
    .bp-summary { background: rgba(74,240,200,.08); border-radius: 8px; padding: 8px 10px; margin-bottom: 12px; font-size: .84rem; }
    .bp-btn {
      display: block; width: 100%; box-sizing: border-box; margin: 6px 0; padding: 10px 12px;
      border-radius: 10px; border: 1.5px solid rgba(74,240,200,.55); background: rgba(74,240,200,.1);
      color: #9ff5dc; font: 600 .9rem/1.3 system-ui, sans-serif; text-align: left; cursor: pointer;
    }
    .bp-btn.primary { background: rgba(74,240,200,.25); text-align: center; }
    .bp-btn small { display: block; font-weight: 400; color: #8ab; font-size: .76rem; }
    .bp-list-title { margin: 12px 0 2px; font-size: .78rem; color: #8ab; text-transform: uppercase; letter-spacing: .5px; }
    .bp-cancel { border-color: rgba(255,255,255,.25); color: #bbb; background: transparent; text-align: center; }
  `;
  document.head.appendChild(s);
}

export function createBlobPicker(): BlobPickerState {
  injectStyles();
  const root = document.createElement("div");
  root.id = "blobPicker";
  document.body.appendChild(root);
  let current: PickerOptions | null = null;

  const close = () => {
    root.classList.remove("open");
    root.innerHTML = "";
    const opts = current;
    current = null;
    opts?.onClose?.();
  };

  const button = (cls: string, html: string, onPick: () => void) => {
    const b = document.createElement("button");
    b.className = `bp-btn ${cls}`;
    b.innerHTML = html;
    b.addEventListener("click", (ev) => {
      ev.preventDefault();
      const opts = current;
      root.classList.remove("open");
      root.innerHTML = "";
      current = null;
      onPick();
      opts?.onClose?.();
    });
    return b;
  };

  return {
    open(opts) {
      current = opts;
      root.innerHTML = "";
      const card = document.createElement("div");
      card.className = "bp-card";
      const title = document.createElement("div");
      title.className = `bp-title${opts.cancellable ? " neutral" : ""}`;
      title.textContent = opts.title;
      card.appendChild(title);
      if (opts.text) {
        const t = document.createElement("div");
        t.className = "bp-text";
        t.textContent = opts.text;
        card.appendChild(t);
      }
      if (opts.summary) {
        const s = document.createElement("div");
        s.className = "bp-summary";
        s.textContent = opts.summary;
        card.appendChild(s);
      }
      if (opts.primary) card.appendChild(button("primary", opts.primary.label, opts.primary.onPick));
      if (opts.items.length > 0) {
        if (opts.listTitle) {
          const lt = document.createElement("div");
          lt.className = "bp-list-title";
          lt.textContent = opts.listTitle;
          card.appendChild(lt);
        }
        for (const item of opts.items) {
          card.appendChild(button("", `${item.label}${item.detail ? `<small>${item.detail}</small>` : ""}`, item.onPick));
        }
      }
      if (opts.cancellable) {
        const c = document.createElement("button");
        c.className = "bp-btn bp-cancel";
        c.textContent = "Abbrechen";
        c.addEventListener("click", (ev) => { ev.preventDefault(); close(); });
        card.appendChild(c);
      }
      root.appendChild(card);
      root.classList.add("open");
    },
    close,
    isOpen: () => current !== null,
  };
}

// Stand: 15. November 2026 — Erstfassung (GDD-10 Umsetzungsschritt 3)
