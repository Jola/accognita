// ============================================================
// VALUE CHART — Kurve „Wert über Erfahrung“ für den INDEX
//
// Selbstständiges DOM-Modul: liefert SVG als String (für innerHTML) und
// hängt einen Hover-/Tipp-Handler per Event-Delegation an.
// Kein Phaser. Eine Kurve je Wert (verschiedene Einheiten nie auf einer
// Achse).
//
// Allgemeines Schema (progression.ts Abschnitte 1–2): Die Ränge sind Zonen
// der erreichbaren Werte (0–10 % Regung … 90–100 % Natur). Deshalb liegen
// sie als waagerechte Zonen auf der Werte-Achse: unten der Startwert, oben
// der Höchstwert (gestrichelt), dem sich die Kurve annähert.
//
// Vorgabe (Entwickler, 1. November 2026): Die Werte des Graphen kommen aus
// der echten Berechnung, damit Anzeige und Spiel nie auseinanderlaufen.
// → Jeder Punkt geht denselben Weg wie im Spiel: Erfahrung →
//   progressFromXp (wie getSkillProgress) → series.value, und value ist
//   die Funktion, die auch der Kampf aufruft (IndexView).
// ============================================================

import { SKILL_RANKS } from "../data/progression.js";
import { progressFromXp, rankNameForProgress, naturXp } from "../systems/ProgressionSystem.js";

export interface ChartSeries {
  label: string;
  /** Wert beim Fortschritt p (0–1) — die echte Berechnungsfunktion des Spiels */
  value: (p: number) => number;
  /** Anzeige eines Werts, z. B. „12 HP“ oder „45 %“ */
  format: (v: number) => string;
  /** Rechenformel im Fortschritt p, z. B. „1 HP + 15 HP × p“ — wird mit der Formel für p angezeigt */
  formula?: string;
}

// Geometrie im viewBox-Raum (skaliert gleichmäßig mit der Breite)
const W = 320, H = 150;
const PAD = { left: 46, right: 54, top: 8, bottom: 20 };
const SAMPLES = 80;
// x-Achse reicht über Natur hinaus: 1,5 × NaturXP ≈ 97 % Fortschritt
const X_OVERSHOOT = 1.5;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const xpText = (xp: number) => xp.toLocaleString("de-DE", { maximumFractionDigits: 1 });
const pctText = (p: number) => `${Math.floor(p * 100 + 1e-7)} %`;

/** true, wenn sich der Wert über die Erfahrung nicht ändert (dann keine Kurve). */
export function isConstant(series: ChartSeries): boolean {
  return Math.abs(series.value(0) - series.value(1)) < 1e-9;
}

/** SVG-Kurve eines Werts über die Erfahrung eines Skills (learningEffort aus skills.ts). */
export function valueChart(series: ChartSeries, learningEffort: number): string {
  const natur = naturXp(learningEffort);
  const xpMax = natur * X_OVERSHOOT;
  // Abtasten in Erfahrung, quadratisch verdichtet: am Anfang steigt die
  // Kurve steil, dort liegen mehr Punkte. Fortschritt und Wert genau wie im Spiel.
  const pts = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const xp = xpMax * (i / SAMPLES) ** 2;
    const p = progressFromXp(xp, learningEffort);
    return { xp, p, v: series.value(p) };
  });

  // Werte-Achse vom Startwert (p = 0) bis zum Höchstwert (p = 1)
  const vStart = series.value(0), vEnd = series.value(1);
  const lo = Math.min(vStart, vEnd), span = Math.abs(vEnd - vStart) || 1;
  const plotW = W - PAD.left - PAD.right, plotH = H - PAD.top - PAD.bottom;
  const x = (xp: number) => PAD.left + (xp / xpMax) * plotW;
  const y = (v: number) => PAD.top + plotH - ((v - lo) / span) * plotH;

  // Rang-Zonen: waagerecht, Grenze = Wert am Rangbeginn; Name rechts daneben
  // (ausgelassen, wo die Zone für die Schrift zu nah an der vorigen liegt)
  const bands: string[] = [];
  let lastLabelY = Infinity;
  SKILL_RANKS.forEach((r, i) => {
    const next = SKILL_RANKS[i + 1];
    const y0 = y(series.value(r.fromProgress));
    const y1 = y(next ? series.value(next.fromProgress) : vEnd);
    const top = Math.min(y0, y1), h = Math.abs(y0 - y1);
    if (i % 2 === 1) bands.push(`<rect class="vc-band" x="${PAD.left}" y="${top}" width="${plotW}" height="${h}"/>`);
    const labelY = top + h / 2 + 3;
    if (Math.abs(lastLabelY - labelY) >= 8) {
      bands.push(`<text class="vc-rank" x="${W - PAD.right + 4}" y="${labelY}">${r.name}</text>`);
      lastLabelY = labelY;
    }
  });

  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(p.xp).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const tips = pts.map((p) => `${rankNameForProgress(p.p)} ${pctText(p.p)} · ${xpText(Math.round(p.xp))} XP: ${series.format(p.v)}`).join("\n");

  return `<figure class="vc" data-tips="${esc(tips)}" data-x0="${PAD.left}" data-x1="${W - PAD.right}" data-w="${W}">
    <figcaption>${esc(series.label)}</figcaption>
    ${series.formula ? `<div class="vc-formula">= ${esc(series.formula)} · p = 1 − 0,1<sup>XP / ${xpText(natur)}</sup></div>` : ""}
    <svg class="vc-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.label)} über die Erfahrung">
      ${bands.join("")}
      <line class="vc-max" x1="${PAD.left}" x2="${W - PAD.right}" y1="${y(vEnd)}" y2="${y(vEnd)}"/>
      <line class="vc-axis" x1="${PAD.left}" x2="${W - PAD.right}" y1="${y(vStart)}" y2="${y(vStart)}"/>
      <text class="vc-tick" x="${PAD.left - 4}" y="${y(vEnd) + 3}" text-anchor="end">${esc(series.format(vEnd))}</text>
      <text class="vc-tick" x="${PAD.left - 4}" y="${y(vStart) + 3}" text-anchor="end">${esc(series.format(vStart))}</text>
      <text class="vc-tick" x="${PAD.left}" y="${H - 6}">0 XP</text>
      <line class="vc-grid" x1="${x(natur)}" x2="${x(natur)}" y1="${PAD.top}" y2="${PAD.top + plotH}"/>
      <text class="vc-tick" x="${x(natur)}" y="${H - 6}" text-anchor="middle">${xpText(natur)} XP</text>
      <path class="vc-line" d="${path}"/>
      <line class="vc-cross" y1="${PAD.top}" y2="${PAD.top + plotH}" x1="-10" x2="-10"/>
      <circle class="vc-dot" r="4" cx="-10" cy="-10"/>
      <polyline class="vc-pts" points="${pts.map((p) => `${x(p.xp).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ")}"/>
    </svg>
    <div class="vc-tip" hidden></div>
  </figure>`;
}

/** Hover (Maus) und Tippen/Ziehen (Touch): Fadenkreuz + Wert am nächsten Messpunkt. */
export function attachChartHover(root: HTMLElement): void {
  const show = (ev: PointerEvent) => {
    const fig = (ev.target as Element).closest<HTMLElement>(".vc");
    if (!fig) return;
    const svg = fig.querySelector<SVGSVGElement>(".vc-svg")!;
    const rect = svg.getBoundingClientRect();
    const w = Number(fig.dataset.w), x0 = Number(fig.dataset.x0), x1 = Number(fig.dataset.x1);
    const vx = Math.max(x0, Math.min(x1, ((ev.clientX - rect.left) / rect.width) * w)); // viewBox-x
    const tips = (fig.dataset.tips ?? "").split("\n");
    const points = fig.querySelector(".vc-pts")!.getAttribute("points")!.split(" ").map((p) => p.split(","));
    // Nächster Messpunkt in x (Punkte liegen nicht gleichmäßig verteilt)
    let i = 0;
    points.forEach((p, k) => { if (Math.abs(Number(p[0]) - vx) < Math.abs(Number(points[i][0]) - vx)) i = k; });
    const [px, py] = points[i];

    const cross = svg.querySelector(".vc-cross")!;
    cross.setAttribute("x1", px); cross.setAttribute("x2", px);
    const dot = svg.querySelector(".vc-dot")!;
    dot.setAttribute("cx", px); dot.setAttribute("cy", py);

    const tip = fig.querySelector<HTMLElement>(".vc-tip")!;
    tip.textContent = tips[i];
    tip.hidden = false;
    const left = (Number(px) / w) * rect.width;
    tip.style.left = `${Math.max(0, Math.min(rect.width - tip.offsetWidth, left - tip.offsetWidth / 2))}px`;
  };
  const hide = (ev: PointerEvent) => {
    const fig = (ev.target as Element).closest<HTMLElement>(".vc");
    if (!fig || ev.pointerType !== "mouse") return; // Touch: Wert bleibt stehen
    fig.querySelector<HTMLElement>(".vc-tip")!.hidden = true;
    fig.querySelector(".vc-cross")!.setAttribute("x1", "-10");
    fig.querySelector(".vc-cross")!.setAttribute("x2", "-10");
    fig.querySelector(".vc-dot")!.setAttribute("cx", "-10");
  };
  root.addEventListener("pointermove", show);
  root.addEventListener("pointerdown", show);
  root.addEventListener("pointerout", (ev) => {
    if (!(ev.relatedTarget as Element | null)?.closest?.(".vc")) hide(ev);
  });
}

/** Styles — werden von IndexView mit injiziert. */
export const VALUE_CHART_CSS = `
  .vc { position:relative; margin:6px 0 10px; }
  .vc figcaption { font-size:.68rem; color:var(--text); margin-bottom:2px; }
  .vc-formula { font-size:.64rem; color:var(--gold); margin-bottom:2px; line-height:1.5; }
  .vc-formula sup { font-size:.55rem; }
  .vc-svg { width:100%; height:auto; display:block; touch-action:pan-y; }
  .vc-band { fill:rgba(255,255,255,.05); }
  .vc-rank { font-size:7.5px; fill:var(--muted); }
  .vc-tick { font-size:8px; fill:var(--muted); }
  .vc-grid { stroke:rgba(255,255,255,.12); stroke-width:1; stroke-dasharray:2 3; }
  .vc-max { stroke:rgba(255,255,255,.28); stroke-width:1; stroke-dasharray:3 3; }
  .vc-axis { stroke:rgba(255,255,255,.22); stroke-width:1; }
  .vc-line { fill:none; stroke:#22a888; stroke-width:2; stroke-linejoin:round; stroke-linecap:round; }
  .vc-pts { display:none; }
  .vc-cross { stroke:rgba(255,255,255,.35); stroke-width:1; }
  .vc-dot { fill:#22a888; stroke:var(--panel); stroke-width:2; }
  .vc-tip { position:absolute; top:14px; padding:3px 7px; border-radius:6px; white-space:nowrap;
    background:var(--panel2); border:1px solid rgba(255,255,255,.15); color:var(--text);
    font-size:.66rem; pointer-events:none; }
`;

// Stand: 1. November 2026 (Ränge als waagerechte Werte-Zonen, Punkte über
// progressFromXp und die echte Berechnungsfunktion)
// Davor: 1. November 2026 (Fortschritt 0–100 %, Höchstwert-Linie, Formelzeile)
