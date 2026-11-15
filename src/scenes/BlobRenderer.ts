// ============================================================
// BLOB RENDERER — Darstellung niedergelassener und vertrockneter Blobs
// (GDD-10 Abschnitt 10)
//
// Niedergelassen (10.1): flacher, unregelmäßiger Kern, 5–8 Hauptadern, die
// sich 1–2 Mal verzweigen und nach außen dünner werden, bis zur
// Arbeitsreichweite; halb durchsichtige Wachstumsfronten an den Enden.
// Die Form folgt aus der Nummer des Blobs (jeder anders, aber immer gleich).
// Pulsieren: alle 2,4 s läuft eine helle Welle vom Kern nach außen — eine
// helle Kopie des Netzes, die per Tween wächst und verblasst. Mit Bewusstsein
// ist die Welle kräftiger und der Kern leuchtet leicht.
// Vertrocknet (10.3): kleinere, krustige, unregelmäßige Masse in Ocker bis
// Braun mit dunklen Rissen; still, ohne Leuchten.
//
// Alles wird einmal gezeichnet (Phaser Graphics) und nur bei Änderung von
// Form, Größe oder Ort neu gebaut; je Frame läuft nur der Tween.
// Die Geometrie (buildVeinNetwork, buildCrust) ist reine Rechnung ohne Phaser.
// ============================================================

declare const Phaser: any;

import { PULSE_MS } from "../data/blobs";

const COLOR_DARK = 0x20a860;
const COLOR_MID = 0x40e890;
const COLOR_LIGHT = 0x90ffcc;
const CRUST = 0x8a6a2a;
const CRUST_SHADOW = 0x5a4418;
const CRUST_CRACK = 0x3a2a0c;

interface Pt { x: number; y: number }
export interface Vein { points: Pt[]; w0: number; w1: number }
export interface Fan { x: number; y: number; angle: number; length: number; spread: number }
export interface VeinNetwork { core: Pt[]; veins: Vein[]; fans: Fan[] }

/** Kleiner deterministischer Zufall (mulberry32) aus der Blob-Nummer. */
function rng(seed: number): () => number {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Nummer aus der Blob-ID („b12“ → 12). */
export function blobSeed(id: string): number {
  const n = parseInt(id.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? n : 1;
}

/** Unregelmäßiger Umriss um (0,0) mit Radius r. */
function blobOutline(rand: () => number, r: number, points: number, jitter: number, squash = 1): Pt[] {
  const out: Pt[] = [];
  const phase = rand() * Math.PI * 2;
  for (let i = 0; i < points; i++) {
    const a = phase + (i / points) * Math.PI * 2;
    const rr = r * (1 - jitter + rand() * jitter * 2);
    out.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr * squash });
  }
  return out;
}

/** Eine Ader von (x,y) in Richtung `angle`, leicht geschlängelt. */
function growVein(rand: () => number, x: number, y: number, angle: number, length: number, segments: number): { points: Pt[]; endAngle: number } {
  const points: Pt[] = [{ x, y }];
  let a = angle;
  const step = length / segments;
  for (let i = 0; i < segments; i++) {
    a += (rand() - 0.5) * 0.7;
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
    points.push({ x, y });
  }
  return { points, endAngle: a };
}

/** Adernetz relativ zum Mittelpunkt; `range` = Arbeitsreichweite (Länge der Hauptadern). */
export function buildVeinNetwork(seed: number, coreR: number, range: number): VeinNetwork {
  const rand = rng(seed);
  const core = blobOutline(rand, coreR * 1.25, 11, 0.22, 0.85);
  const veins: Vein[] = [];
  const fans: Fan[] = [];
  const mainCount = 5 + Math.floor(rand() * 4); // 5–8
  const baseW = Math.max(1.4, coreR * 0.55);
  const offset = rand() * Math.PI * 2;
  for (let i = 0; i < mainCount; i++) {
    const angle = offset + (i / mainCount) * Math.PI * 2 + (rand() - 0.5) * 0.6;
    const length = range * (0.8 + rand() * 0.2);
    const main = growVein(rand, Math.cos(angle) * coreR * 0.8, Math.sin(angle) * coreR * 0.8, angle, length, 8);
    veins.push({ points: main.points, w0: baseW, w1: 0.45 });
    fans.push({ ...main.points[main.points.length - 1], angle: main.endAngle, length: range * 0.14, spread: 0.7 });
    // 1–2 Verzweigungen
    const branches = 1 + Math.floor(rand() * 2);
    for (let b = 0; b < branches; b++) {
      const at = 2 + Math.floor(rand() * 4); // Punkt 2–5 der Hauptader
      const from = main.points[at];
      const side = rand() < 0.5 ? -1 : 1;
      const bAngle = angle + side * (0.45 + rand() * 0.4);
      const bLength = (length - length * at / 8) * (0.6 + rand() * 0.3);
      const branch = growVein(rand, from.x, from.y, bAngle, bLength, 5);
      const t = at / 8;
      veins.push({ points: branch.points, w0: baseW * (1 - t) * 0.8 + 0.45 * t, w1: 0.4 });
      fans.push({ ...branch.points[branch.points.length - 1], angle: branch.endAngle, length: range * 0.1, spread: 0.6 });
    }
  }
  return { core, veins, fans };
}

/** Kruste des vertrockneten Blobs: Umriss und einige Risse. */
export function buildCrust(seed: number, r: number): { outline: Pt[]; cracks: Pt[][] } {
  const rand = rng(seed + 7919);
  const outline = blobOutline(rand, r, 13, 0.25, 0.9);
  const cracks: Pt[][] = [];
  const n = 3 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const start = { x: Math.cos(a) * r * 0.15, y: Math.sin(a) * r * 0.15 };
    const crack = growVein(rand, start.x, start.y, a, r * (0.45 + rand() * 0.35), 3);
    cracks.push(crack.points);
  }
  return { outline, cracks };
}

// -----------------------------------------------------------
// Zeichnen (Phaser)
// -----------------------------------------------------------

function drawVeins(g: any, net: VeinNetwork, color: number, alpha: number, widthFactor: number) {
  for (const v of net.veins) {
    const segs = v.points.length - 1;
    for (let i = 0; i < segs; i++) {
      const w = (v.w0 + (v.w1 - v.w0) * (i / segs)) * widthFactor;
      g.lineStyle(w, color, alpha);
      g.lineBetween(v.points[i].x, v.points[i].y, v.points[i + 1].x, v.points[i + 1].y);
    }
  }
}

function fillPoly(g: any, pts: Pt[], color: number, alpha: number, scale = 1, dx = 0, dy = 0) {
  g.fillStyle(color, alpha);
  g.fillPoints(pts.map((p) => new Phaser.Geom.Point(p.x * scale + dx, p.y * scale + dy)), true);
}

export interface BlobVisualSpec {
  id: string;
  form: "settled" | "dried";
  x: number;
  y: number;
  coreRadius: number;
  /** Arbeitsreichweite (nur niedergelassen) */
  range: number;
  /** Bewusstsein ist hier: kräftigere Welle, leuchtender Kern */
  conscious: boolean;
}

interface Visual { key: string; container: any; animated: any[] }

export class BlobRenderer {
  private visuals = new Map<string, Visual>();

  constructor(private scene: any, private depth = 5) {}

  /** Zeichnet genau diese Blobs; unveränderte bleiben, wie sie sind. */
  sync(specs: BlobVisualSpec[]) {
    const keep = new Set<string>();
    for (const s of specs) {
      keep.add(s.id);
      const key = `${s.form}|${s.x.toFixed(1)}|${s.y.toFixed(1)}|${s.coreRadius.toFixed(2)}|${s.range.toFixed(1)}|${s.conscious}`;
      const old = this.visuals.get(s.id);
      if (old && old.key === key) continue;
      if (old) this.destroyVisual(old);
      this.visuals.set(s.id, s.form === "settled" ? this.buildSettled(s, key) : this.buildDried(s, key));
    }
    for (const [id, v] of this.visuals) {
      if (!keep.has(id)) { this.destroyVisual(v); this.visuals.delete(id); }
    }
  }

  private destroyVisual(v: Visual) {
    for (const t of v.animated) this.scene.tweens.killTweensOf(t);
    v.container.destroy(true);
  }

  private buildSettled(s: BlobVisualSpec, key: string): Visual {
    const net = buildVeinNetwork(blobSeed(s.id), s.coreRadius, s.range);
    const container = this.scene.add.container(s.x, s.y).setDepth(this.depth);

    // Grundnetz: Wachstumsfronten, dunkle Adern, hellere Mitte, Kern
    const base = this.scene.add.graphics();
    for (const f of net.fans) {
      base.fillStyle(COLOR_MID, 0.16);
      base.slice(f.x, f.y, f.length, f.angle - f.spread / 2, f.angle + f.spread / 2, false);
      base.fillPath();
    }
    drawVeins(base, net, COLOR_DARK, 0.85, 1);
    drawVeins(base, net, COLOR_MID, 0.6, 0.45);
    fillPoly(base, net.core, COLOR_DARK, 0.95);
    fillPoly(base, net.core, COLOR_MID, 0.9, 0.75);
    base.fillStyle(COLOR_LIGHT, 0.55);
    base.fillCircle(-s.coreRadius * 0.3, -s.coreRadius * 0.3, s.coreRadius * 0.35);
    container.add(base);

    // Pulswelle: helle Kopie des Netzes wächst vom Kern nach außen und verblasst
    const wave = this.scene.add.graphics();
    drawVeins(wave, net, COLOR_LIGHT, 1, 0.6);
    fillPoly(wave, net.core, COLOR_LIGHT, 1, 0.9);
    wave.setScale(0.15).setAlpha(0);
    container.add(wave);
    const peak = s.conscious ? 0.85 : 0.4;
    this.scene.tweens.add({
      targets: wave,
      scale: { from: 0.15, to: 1 },
      alpha: { from: peak, to: 0 },
      duration: PULSE_MS,
      ease: "Sine.easeOut",
      repeat: -1,
      delay: (blobSeed(s.id) * 397) % PULSE_MS, // nicht alle im Gleichtakt
    });
    const animated: any[] = [wave];

    // Bewusstsein: der Kern leuchtet leicht
    if (s.conscious) {
      const glow = this.scene.add.graphics();
      glow.fillStyle(COLOR_LIGHT, 0.35);
      glow.fillCircle(0, 0, s.coreRadius * 2.2);
      glow.fillStyle(COLOR_LIGHT, 0.35);
      glow.fillCircle(0, 0, s.coreRadius * 1.4);
      glow.setAlpha(0.4);
      container.addAt(glow, 0);
      this.scene.tweens.add({ targets: glow, alpha: { from: 0.25, to: 0.6 }, duration: PULSE_MS / 2, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      animated.push(glow);
    }
    return { key, container, animated };
  }

  private buildDried(s: BlobVisualSpec, key: string): Visual {
    const crust = buildCrust(blobSeed(s.id), s.coreRadius);
    const container = this.scene.add.container(s.x, s.y).setDepth(this.depth);
    const g = this.scene.add.graphics();
    const r = s.coreRadius;
    fillPoly(g, crust.outline, CRUST_SHADOW, 0.95, 1.08, r * 0.08, r * 0.12);
    fillPoly(g, crust.outline, CRUST, 1);
    fillPoly(g, crust.outline, CRUST_SHADOW, 0.35, 0.55, r * 0.12, r * 0.12);
    for (const c of crust.cracks) {
      g.lineStyle(Math.max(0.35, r * 0.09), CRUST_CRACK, 0.9);
      for (let i = 0; i < c.length - 1; i++) g.lineBetween(c[i].x, c[i].y, c[i + 1].x, c[i + 1].y);
    }
    container.add(g);
    return { key, container, animated: [] };
  }

  destroy() {
    for (const v of this.visuals.values()) this.destroyVisual(v);
    this.visuals.clear();
  }
}

// Stand: 15. November 2026 — Erstfassung (GDD-10 Umsetzungsschritt 5)
