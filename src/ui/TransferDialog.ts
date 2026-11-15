// ============================================================
// TRANSFER DIALOG — Ressourcen beim Abspalten verteilen (GDD-10 Abschnitt 7.2)
//
// Oben steht, wie groß der neue Reisende wird. Darunter je Ressource ein
// Schieberegler: links, was beim niedergelassenen Blob bleibt, rechts, was
// der Reisende mitnimmt. Die Knöpfe Nichts / Hälfte / Alles stellen alle
// Regler auf einmal. Die Summe bleibt immer gleich.
// Voreinstellung kommt vom Aufrufer (halbe-halbe, BlobSystem.defaultSplitTake).
// Das Spiel hält an, solange der Dialog offen ist (die Szene pausiert).
// Selbstständiges DOM-Modul: kein Phaser, keine GameState-Imports.
// ============================================================

export interface TransferRow {
  id: string;
  label: string;
  total: number;
  /** Voreingestellte Menge, die der Reisende mitnimmt */
  take: number;
}

export interface TransferOptions {
  title: string;
  /** Zeilen über der Verteilung (Größe, HP) */
  info: string[];
  rows: TransferRow[];
  /** Menge je Ressource, die mitgeht */
  onDone: (take: Record<string, number>) => void;
  onCancel: () => void;
}

export interface TransferDialogState {
  open(opts: TransferOptions): void;
  isOpen(): boolean;
}

function injectStyles() {
  if (document.getElementById("transfer-styles")) return;
  const s = document.createElement("style");
  s.id = "transfer-styles";
  s.textContent = `
    #transferDialog {
      position: fixed; inset: 0; z-index: 300; display: none;
      background: rgba(3,5,10,.86); align-items: center; justify-content: center;
      padding: 16px; box-sizing: border-box;
    }
    #transferDialog.open { display: flex; }
    .td-card {
      width: min(92vw, 420px); max-height: 92vh; overflow-y: auto; box-sizing: border-box;
      background: #0d121c; border: 1px solid rgba(74,240,200,.35); border-radius: 14px;
      padding: 18px 16px; color: #d8efe8; font: .9rem/1.5 system-ui, sans-serif;
    }
    .td-title { font: 700 1.15rem/1.3 Georgia, serif; color: #9ff5dc; text-align: center; margin-bottom: 6px; }
    .td-info { background: rgba(74,240,200,.08); border-radius: 8px; padding: 8px 10px; margin-bottom: 12px; font-size: .84rem; text-align: center; }
    .td-head { display: flex; justify-content: space-between; font-size: .74rem; color: #8ab; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
    .td-row { margin: 8px 0 10px; }
    .td-name { font-size: .84rem; margin-bottom: 2px; }
    .td-line { display: grid; grid-template-columns: 3.2em 1fr 3.2em; align-items: center; gap: 8px; }
    .td-num { font-variant-numeric: tabular-nums; text-align: center; font-weight: 600; }
    .td-line input[type=range] { width: 100%; accent-color: #4af0c8; min-height: 28px; }
    .td-empty { text-align: center; color: #8ab; font-style: italic; margin: 8px 0 12px; }
    .td-presets { display: flex; gap: 8px; margin: 10px 0 4px; }
    .td-btn {
      flex: 1; box-sizing: border-box; padding: 10px 8px; border-radius: 10px; cursor: pointer;
      border: 1.5px solid rgba(74,240,200,.55); background: rgba(74,240,200,.1);
      color: #9ff5dc; font: 600 .86rem/1.3 system-ui, sans-serif;
    }
    .td-btn.primary { display: block; width: 100%; margin-top: 10px; background: rgba(74,240,200,.25); }
    .td-btn.cancel { display: block; width: 100%; margin-top: 6px; border-color: rgba(255,255,255,.25); color: #bbb; background: transparent; }
  `;
  document.head.appendChild(s);
}

export function createTransferDialog(): TransferDialogState {
  injectStyles();
  const root = document.createElement("div");
  root.id = "transferDialog";
  document.body.appendChild(root);
  let openNow = false;

  const finish = () => {
    root.classList.remove("open");
    root.innerHTML = "";
    openNow = false;
  };

  const btn = (cls: string, text: string, onClick: () => void) => {
    const b = document.createElement("button");
    b.className = `td-btn ${cls}`;
    b.textContent = text;
    b.addEventListener("click", (ev) => { ev.preventDefault(); onClick(); });
    return b;
  };

  return {
    open(opts) {
      openNow = true;
      root.innerHTML = "";
      const take: Record<string, number> = {};
      const card = document.createElement("div");
      card.className = "td-card";

      const title = document.createElement("div");
      title.className = "td-title";
      title.textContent = opts.title;
      card.appendChild(title);

      if (opts.info.length > 0) {
        const info = document.createElement("div");
        info.className = "td-info";
        for (const line of opts.info) {
          const d = document.createElement("div");
          d.textContent = line;
          info.appendChild(d);
        }
        card.appendChild(info);
      }

      const setters: Array<(fraction: number) => void> = [];
      if (opts.rows.length === 0) {
        const e = document.createElement("div");
        e.className = "td-empty";
        e.textContent = "Keine Ressourcen zu verteilen.";
        card.appendChild(e);
      } else {
        const head = document.createElement("div");
        head.className = "td-head";
        head.innerHTML = "<span>bleibt</span><span>nimmt mit</span>";
        card.appendChild(head);
        for (const row of opts.rows) {
          take[row.id] = Math.max(0, Math.min(row.total, Math.floor(row.take)));
          const wrap = document.createElement("div");
          wrap.className = "td-row";
          const name = document.createElement("div");
          name.className = "td-name";
          name.textContent = row.label;
          const line = document.createElement("div");
          line.className = "td-line";
          const stay = document.createElement("span");
          stay.className = "td-num";
          const go = document.createElement("span");
          go.className = "td-num";
          const range = document.createElement("input");
          range.type = "range";
          range.min = "0";
          range.max = String(row.total);
          range.step = "1";
          range.value = String(take[row.id]);
          range.setAttribute("aria-label", `${row.label}: mitnehmen`);
          const show = () => {
            stay.textContent = String(row.total - take[row.id]);
            go.textContent = String(take[row.id]);
            range.value = String(take[row.id]);
          };
          range.addEventListener("input", () => { take[row.id] = Number(range.value); show(); });
          // Hälfte abgerundet: das übrige Stück bleibt beim niedergelassenen Blob
          setters.push((f) => { take[row.id] = Math.floor(row.total * f); show(); });
          show();
          line.append(stay, range, go);
          wrap.append(name, line);
          card.appendChild(wrap);
        }
        const presets = document.createElement("div");
        presets.className = "td-presets";
        presets.append(
          btn("", "Nichts", () => setters.forEach((s) => s(0))),
          btn("", "Hälfte", () => setters.forEach((s) => s(0.5))),
          btn("", "Alles", () => setters.forEach((s) => s(1))),
        );
        card.appendChild(presets);
      }

      card.appendChild(btn("primary", "Fertig", () => { finish(); opts.onDone({ ...take }); }));
      card.appendChild(btn("cancel", "Abbrechen", () => { finish(); opts.onCancel(); }));
      root.appendChild(card);
      root.classList.add("open");
    },
    isOpen: () => openNow,
  };
}

// Stand: 15. November 2026 — Erstfassung (GDD-10 Umsetzungsschritt 4)
