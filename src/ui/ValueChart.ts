// ============================================================
// VALUE CHART — Kurve „Wert über Erfahrung“ für den INDEX
//
// Selbstständiges DOM-Modul: liefert SVG als String (für innerHTML) und
// hängt einen Hover-/Tipp-Handler per Event-Delegation an.
// Kein Phaser. Eine Kurve je Wert (verschiedene Einheiten nie auf einer
// Achse), x = Erfahrung, Ränge als abwechselnd getönte Abschnitte,
// gestrichelte Linie = Höchstwert, dem sich der Wert annähert.
// ============================================================

import { SKILL_RANKS } from "../data/progression.js";
import { progressFromXp, xpForProgress, rankNameForProgress, naturXp } from "../systems/ProgressionSystem.js";

export interface ChartSeries {
  label: string;
  /** Wert beim Fortschritt p (0–1) */
  value: (p: number) => number;
  /** Anzeige eines Werts, z. B. „12 HP“ oder „45 %“ */
  format: (v: number) => string;
  /** Rechenformel im Fortschritt p, z. B. „1 HP + 15 HP × p“ — wird mit der Formel für p angezeigt */
  formula?: string;
}

// Geometrie im viewBox-Raum (skaliert gleichmäßig mit der Breite)
const W = 320, H = 132;
const PAD = { left: 46, right: 8, top: 18, bottom: 20 };
const SAMPLES = 64;
// x-Achse reicht über Natur hinaus: 1,5 × NaturXP ≈ 97 % Fortschritt
const X_OVERSHOOT = 1.5;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const xpText = (xp: number) => Math.round(xp).toLocaleString("de-DE");
const pctText = (p: number) => `${Math.floor(p * 100)} %`;

/** true, wenn sich der Wert über die Erfahrung nicht ändert (dann keine Kurve). */
export function isConstant(series: ChartSeries): boolean {
  return Math.abs(series.value(0) - series.value(1)) < 1e-9;
}

/** SVG-Kurve eines Werts über die Erfahrung eines Skills (learningEffort aus skills.ts). */
export function valueChart(series: ChartSeries, learningEffort: number): string {
  const natur = naturXp(learningEffort);
  const xpMax = natur * X_OVERSHOOT;
  // Gleichmäßig im Fortschritt abtasten: Am Anfang steigt die Kurve steil,
  // dort liegen so mehr Punkte als bei gleichmäßigen XP-Schritten.
  const pMax = progressFromXp(xpMax, learningEffort);
  const pts = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const p = (pMax * i) / SAMPLES;
    return { xp: xpForProgress(p, learningEffort), p, v: series.value(p) };
  });

  // y-Achse bis zum Höchstwert (p = 1), dem sich die Kurve annähert
  const vEnd = series.value(1);
  const vMax = Math.max(vEnd, ...pts.map((p) => p.v));
  const vMin = Math.min(0, vEnd, ...pts.map((p) => p.v));
  const span = vMax - vMin || 1;
  const plotW = W - PAD.left - PAD.right, plotH = H - PAD.top - PAD.bottom;
  const x = (xp: number) => PAD.left + (xp / xpMax) * plotW;
  const y = (v: number) => PAD.top + plotH - ((v - vMin) / span) * plotH;

  // Rang-Abschnitte: abwechselnd getönt, Name nur wo Platz ist
  const bands: string[] = [];
  let lastLabelEnd = -Infinity;
  SKILL_RANKS.forEach((r, i) => {
    const x0 = x(xpForProgress(r.fromProgress, learningEffort));
    const next = SKILL_RANKS[i + 1];
    const x1 = next ? x(Math.min(xpMax, xpForProgress(next.fromProgress, learningEffort))) : x(xpMax);
    if (i % 2 === 1) bands.push(`<rect class="vc-band" x="${x0}" y="${PAD.top}" width="${x1 - x0}" height="${plotH}"/>`);
    const labelW = r.name.length * 5.2;
    if (x1 - x0 >= labelW + 4 && x0 >= lastLabelEnd + 4) {
      bands.push(`<text class="vc-rank" x="${x0 + 3}" y="${PAD.top - 5}">${r.name}</text>`);
      lastLabelEnd = x0 + labelW;
    }
  });

  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(p.xp).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const tips = pts.map((p) => `${rankNameForProgress(p.p)} ${pctText(p.p)} · ${xpText(p.xp)} XP: ${series.format(p.v)}`).join("\n");

  return `<figure class="vc" data-tips="${esc(tips)}" data-x0="${PAD.left}" data-x1="${W - PAD.right}" data-w="${W}">
    <figcaption>${esc(series.label)}</figcaption>
    ${series.formula ? `<div class="vc-formula">= ${esc(series.formula)} · p = 1 − 0,1<sup>XP / ${natur.toLocaleString("de-DE", { maximumFractionDigits: 1 })}</sup></div>` : ""}
    <svg class="vc-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(series.label)} über die Erfahrung">
      ${bands.join("")}
      <line class="vc-max" x1="${PAD.left}" x2="${W - PAD.right}" y1="${y(vEnd)}" y2="${y(vEnd)}"/>
      <text class="vc-tick" x="${PAD.left - 4}" y="${y(vEnd) - 6}" text-anchor="end">Max</text>
      <line class="vc-axis" x1="${PAD.left}" x2="${W - PAD.right}" y1="${y(vMin)}" y2="${y(vMin)}"/>
      <text class="vc-tick" x="${PAD.left - 4}" y="${y(vEnd) + 3}" text-anchor="end">${esc(series.format(vEnd))}</text>
      <text class="vc-tick" x="${PAD.left - 4}" y="${y(vMin) + 3}" text-anchor="end">${esc(series.format(vMin))}</text>
      <text class="vc-tick" x="${PAD.left}" y="${H - 6}">0 XP</text>
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
  .vc-band { fill:rgba(255,255,255,.035); }
  .vc-rank { font-size:8px; fill:var(--muted); }
  .vc-tick { font-size:8px; fill:var(--muted); }
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

// Stand: 1. November 2026 (Fortschritt 0–100 %, Höchstwert-Linie, Formelzeile)
