// ============================================================
// TILESET PREVIEW — eigene Seite tileset.html neben accognita.html (GDD-12)
// Absorb & Evolve
//
// Kein Phaser. Zeichnet beim Öffnen alle Bodenkacheln, Übergänge,
// Hindernisse und Ausschnitte der Welt mit genau dem Code, den das Spiel
// nutzt (TilesetGenerator, Terrain) — die Seite ist also immer aktuell.
//
// Vorgabe (Entwickler, 22. November 2026): Das Tileset soll zum Anschauen
// verfügbar sein, als eigene HTML-Datei neben accognita.html.
// ============================================================

import { __art, OBSTACLE_VARIANTS } from "../world/TilesetGenerator";
import { vertexTerrain, forEachObstacleNear } from "../world/Terrain";
import { hash2 } from "../world/Noise";
import {
  TERRAIN_NAMES, OBSTACLE_KINDS, BIOME_OBSTACLES, BLOCK_LARGE_FROM_SIZE, BLOCK_SMALL_BELOW_SIZE,
  T_WATER, T_FOREST, T_SWAMP, T_MEADOW, T_ROCK, T_SAND, T_DUNGEON, TERRAIN_COUNT,
} from "../data/terrain";
import type { ObstacleKind } from "../data/terrain";
import { worldSizeFromLength } from "../data/balance";
import { GAME_VERSION } from "../data/version";
import { createInitialGameState } from "../types/GameState";

interface Img { w: number; h: number; d: Uint8ClampedArray<ArrayBuffer> }

const SEED = createInitialGameState().world.worldSeed;
const T = 32;

// ────────────────────────────────────────
// Bilder: Canvas, das per CSS vergrößert wird
// ────────────────────────────────────────

function canvasOf(img: Img, alt: string, cls = "z"): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.w; c.height = img.h;
  c.className = `px ${cls}`;
  c.dataset.w = String(img.w);
  c.setAttribute("role", "img");
  c.setAttribute("aria-label", alt);
  c.getContext("2d")!.putImageData(new ImageData(img.d, img.w, img.h), 0, 0);
  return c;
}

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function cell(child: HTMLElement, label: string): HTMLElement {
  const c = el("div", "cell");
  c.append(child, el("span", undefined, label));
  return c;
}

// ────────────────────────────────────────
// Zusammensetzen: Kacheln aus Ecken, Hindernisse darüber
// ────────────────────────────────────────

type Corners = [number, number, number, number];

function blit(dst: Img, src: Img, ox: number, oy: number): void {
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const X = ox + x, Y = oy + y;
    if (X < 0 || Y < 0 || X >= dst.w || Y >= dst.h) continue;
    const s = (y * src.w + x) * 4, a = src.d[s + 3] / 255;
    if (!a) continue;
    const o = (Y * dst.w + X) * 4;
    for (let k = 0; k < 3; k++) dst.d[o + k] = dst.d[o + k] * (1 - a) + src.d[s + k] * a;
    dst.d[o + 3] = 255;
  }
}

function newImg(w: number, h: number): Img {
  return { w, h, d: new Uint8ClampedArray(new ArrayBuffer(w * h * 4)) };
}

/** Kleine Fläche aus einem Ecken-Raster (0 = Bodenart a, 1 = b). */
function patch(a: number, b: number, grid: number[][]): Img {
  const H = grid.length - 1, W = grid[0].length - 1;
  const out = newImg(W * T, H * T);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const c = [grid[j][i], grid[j][i + 1], grid[j + 1][i], grid[j + 1][i + 1]].map((x) => (x ? b : a)) as Corners;
    const uni = c.every((x) => x === c[0]);
    blit(out, __art.compositeTile(c, uni ? (i * 7 + j * 3) % 4 : 0), i * T, j * T);
  }
  return out;
}

const obstacleArt = new Map<string, { img: Img; crown?: Img }>();
function artFor(kind: string, v: number) {
  const key = kind + v;
  let a = obstacleArt.get(key);
  if (!a) { a = __art.obstacleImage(kind, v); obstacleArt.set(key, a); }
  return a;
}

/** Ausschnitt der echten Welt (Weltpixel), ohne Wesen und ohne Dunkelheit. */
function region(x0: number, y0: number, W: number, H: number): Img {
  const out = newImg(W, H);
  const tiles = new Map<string, Img>();
  for (let j = Math.floor(y0 / T); j * T < y0 + H; j++) for (let i = Math.floor(x0 / T); i * T < x0 + W; i++) {
    const c: Corners = [vertexTerrain(i, j, SEED), vertexTerrain(i + 1, j, SEED), vertexTerrain(i, j + 1, SEED), vertexTerrain(i + 1, j + 1, SEED)];
    const v = c.every((t) => t === c[0]) ? Math.floor(hash2(i, j, SEED + 77) * 4) : 0;
    const key = c.join() + v;
    let t = tiles.get(key);
    if (!t) { t = __art.compositeTile(c, v); tiles.set(key, t); }
    blit(out, t, i * T - x0, j * T - y0);
  }
  const obs: { kind: string; x: number; y: number; variant: number }[] = [];
  forEachObstacleNear(x0 + W / 2, y0 + H / 2, Math.max(W, H), SEED, (o) => { obs.push(o); });
  const v = (o: { variant: number }) => Math.min(OBSTACLE_VARIANTS - 1, Math.floor(o.variant * OBSTACLE_VARIANTS));
  const place = (img: Img, x: number, y: number) => blit(out, img, Math.round(x - img.w / 2 - x0), Math.round(y - img.h / 2 - y0));
  // Reihenfolge wie im Spiel: Steine/Stämme, dann Gestrüpp, dann Kronen
  for (const o of obs) if (!OBSTACLE_KINDS[o.kind].overhead) place(artFor(o.kind, v(o)).img, o.x, o.y);
  for (const o of obs) if (OBSTACLE_KINDS[o.kind].overhead) place(artFor(o.kind, v(o)).img, o.x, o.y);
  for (const o of obs) { const c = artFor(o.kind, v(o)).crown; if (c) place(c, o.x, o.y - 2); }
  return out;
}

/** Erster Punkt, an dem nebeneinander Bodenart a und b liegen (für Ausschnitte). */
function findBorder(a: number, b: number, fallback: [number, number]): [number, number] {
  for (let j = 10; j < 630; j += 3) for (let i = 10; i < 630; i += 3) {
    if (vertexTerrain(i, j, SEED) === a && vertexTerrain(i + 4, j, SEED) === b) return [i * T - 320, j * T - 200];
  }
  return fallback;
}

// ────────────────────────────────────────
// Texte
// ────────────────────────────────────────

const VARIANT_NAMES: Record<number, string[]> = {
  [T_WATER]: ["Wellen", "Wellen", "Wellen", "Wellen"],
  [T_FOREST]: ["schlicht", "Gänseblümchen", "Laub", "Pilz"],
  [T_SWAMP]: ["Moos", "Moos + Pfütze", "Moos + Halme", "Moos + Pfütze"],
  [T_MEADOW]: ["eine Blume", "zwei Blumen", "drei Blumen", "vier Blumen"],
  [T_ROCK]: ["Riss", "Kies", "zwei Risse", "Flechten"],
  [T_SAND]: ["Rippeln", "Muscheln", "Halme", "Rippeln"],
  [T_DUNGEON]: ["Platten", "Riss", "Platten", "Moos"],
};
const BIOME_NAMES: Record<string, string> = { forest: "Wald", swamp: "Sumpf", highland: "Hochland", mountain: "Gebirge", desert: "Wüste", dungeon: "Ruinen" };
const fmt = (n: number) => n.toFixed(1).replace(".", ",");

function blockTag(k: ObstacleKind): [string, string] {
  if (k.block === "all") return ["all", "blockiert alle"];
  if (k.block === "large") return ["large", "Kleine kommen durch"];
  return ["small", "nur Kleine blockiert"];
}
function blockText(k: ObstacleKind): string {
  if (k.block === "all") return "alle Wesen";
  if (k.block === "large") return `Wesen ab Größe ${BLOCK_LARGE_FROM_SIZE}`;
  return `Wesen unter Größe ${BLOCK_SMALL_BELOW_SIZE}`;
}

function cornerKey(mask: number): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "-2 -2 14 14");
  svg.setAttribute("class", "corners");
  svg.setAttribute("aria-hidden", "true");
  const r = document.createElementNS(ns, "rect");
  for (const [k, v] of Object.entries({ x: "0", y: "0", width: "10", height: "10", fill: "none", stroke: "currentColor", "stroke-width": ".6", opacity: ".45" })) r.setAttribute(k, v);
  svg.append(r);
  [[0, 0], [10, 0], [0, 10], [10, 10]].forEach(([x, y], k) => {
    const c = document.createElementNS(ns, "circle");
    c.setAttribute("cx", String(x)); c.setAttribute("cy", String(y)); c.setAttribute("r", "1.8");
    c.setAttribute("class", (mask >> k) & 1 ? "on" : "off");
    svg.append(c);
  });
  return svg;
}

// ────────────────────────────────────────
// Seite aufbauen
// ────────────────────────────────────────

function build(): void {
  document.getElementById("version")!.textContent = `v${GAME_VERSION}`;

  // Bodenarten
  const grounds = document.getElementById("grounds")!;
  for (let t = 0; t < TERRAIN_COUNT; t++) {
    const card = el("div", "card");
    card.append(el("h3", undefined, TERRAIN_NAMES[t]));
    const row = el("div", "row");
    for (let v = 0; v < 4; v++) row.append(cell(canvasOf(__art.makeGround(t, v), `${TERRAIN_NAMES[t]} Variante ${v + 1}`), VARIANT_NAMES[t][v]));
    card.append(row);
    grounds.append(card);
  }

  // Übergänge
  const pond = [[0, 0, 0, 0, 0, 0, 0], [0, 0, 1, 1, 0, 0, 0], [0, 1, 1, 1, 1, 0, 0], [0, 1, 1, 1, 1, 1, 0], [0, 0, 1, 1, 1, 0, 0], [0, 0, 0, 1, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0]];
  const patches = document.getElementById("patches")!;
  for (const [a, b, name] of [[T_FOREST, T_WATER, "Teich im Wald"], [T_SAND, T_WATER, "Oase in der Wüste"], [T_FOREST, T_MEADOW, "Wiese im Wald"], [T_FOREST, T_DUNGEON, "Ruine im Wald"]] as [number, number, string][]) {
    patches.append(cell(canvasOf(patch(a, b, pond), name), name));
  }
  const pairs = document.getElementById("pairs")!;
  const pairList: [number, number][] = [[T_FOREST, T_WATER], [T_SAND, T_WATER], [T_SWAMP, T_WATER], [T_FOREST, T_MEADOW], [T_ROCK, T_SAND], [T_SWAMP, T_FOREST], [T_DUNGEON, T_FOREST]];
  for (const [a, b] of pairList) {
    const card = el("div", "card");
    card.append(el("h3", undefined, `${TERRAIN_NAMES[a]} ↔ ${TERRAIN_NAMES[b]}`));
    const grid = el("div", "tiles16");
    for (let m = 0; m < 16; m++) {
      const c = [0, 1, 2, 3].map((k) => ((m >> k) & 1 ? b : a)) as Corners;
      const t = el("div", "t16");
      t.append(canvasOf(__art.compositeTile(c, 0), `${TERRAIN_NAMES[a]} und ${TERRAIN_NAMES[b]}, Fall ${m}`), cornerKey(m) as unknown as HTMLElement);
      grid.append(t);
    }
    card.append(grid);
    pairs.append(card);
  }

  // Hindernisse
  const biomesOf: Record<string, string[]> = {};
  for (const [b, r] of Object.entries(BIOME_OBSTACLES)) for (const k of [...r.large, ...r.small]) (biomesOf[k.id] ??= []).push(BIOME_NAMES[b]);
  document.querySelectorAll(".th-large").forEach((e) => (e.textContent = String(BLOCK_LARGE_FROM_SIZE)));
  document.querySelectorAll(".th-small").forEach((e) => (e.textContent = String(BLOCK_SMALL_BELOW_SIZE)));
  const obstacles = document.getElementById("obstacles")!;
  for (const k of Object.values(OBSTACLE_KINDS)) {
    const card = el("div", "card");
    const head = el("div", "row head");
    const [cls, tag] = blockTag(k);
    head.append(el("h3", undefined, k.name), el("span", `tag ${cls}`, tag));
    const imgs = el("div", "obs-imgs chk");
    for (let v = 0; v < OBSTACLE_VARIANTS; v++) {
      const a = artFor(k.id, v);
      imgs.append(canvasOf(a.img, `${k.name} Variante ${v + 1}`));
      if (a.crown) imgs.append(canvasOf(a.crown, `${k.name} Krone ${v + 1}`));
    }
    const r = worldSizeFromLength(k.lengthCm) / 2;
    const dl = el("dl");
    const add = (dt: string, dd: string) => dl.append(el("dt", undefined, dt), el("dd", undefined, dd));
    add("echt", `${k.lengthCm} cm${k.crownCm ? ` · Krone ${fmt(k.crownCm / 100)} m` : ""}`);
    add("Radius", `${fmt(r)} px${k.crownCm ? ` · Krone ${fmt(worldSizeFromLength(k.crownCm) / 2)} px` : ""}`);
    add("Kollision", `${fmt(r * k.colliderFactor)} px`);
    add("blockiert", blockText(k));
    add("Biome", (biomesOf[k.id] ?? []).join(", ") || "—");
    card.append(head, imgs, dl);
    obstacles.append(card);
  }

  // Ausschnitte (werden nacheinander gezeichnet, damit die Seite sofort steht)
  const regions = document.getElementById("regions")!;
  const list: [string, [number, number]][] = [
    ["Startwald mit See", [0, 0]],
    ["Sumpf und Wald", findBorder(T_SWAMP, T_FOREST, [9000, 500])],
    ["Hochland am Wasser", findBorder(T_MEADOW, T_WATER, [1200, 6200])],
    ["Gebirge und Wüste", findBorder(T_ROCK, T_SAND, [10500, 5400])],
    ["Ruinen am Waldrand", findBorder(T_FOREST, T_DUNGEON, [10400, 8600])],
  ];
  const slots = list.map(([name]) => {
    const fig = el("figure", "region");
    const box = el("div", "scroll");
    box.append(el("div", "pending", "wird gezeichnet …"));
    fig.append(box, el("figcaption", "note", name));
    regions.append(fig);
    return box;
  });
  let k = 0;
  const next = () => {
    if (k >= list.length) return;
    const [name, [x, y]] = list[k];
    const box = slots[k];
    box.replaceChildren(canvasOf(region(Math.max(0, x), Math.max(0, y), 640, 400), name, "zr"));
    k++;
    applyZoom(currentZoom);
    setTimeout(next, 0);
  };
  setTimeout(next, 0);
}

// ────────────────────────────────────────
// Zoom
// ────────────────────────────────────────

let currentZoom = 3;
function applyZoom(z: number): void {
  currentZoom = z;
  document.querySelectorAll<HTMLCanvasElement>("canvas.z").forEach((c) => (c.style.width = `${Number(c.dataset.w) * z}px`));
  document.querySelectorAll<HTMLCanvasElement>("canvas.zr").forEach((c) => (c.style.width = `${Number(c.dataset.w) * Math.min(z, 2)}px`));
  document.querySelectorAll<HTMLButtonElement>(".zoom button").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.z) === z)));
  try { localStorage.setItem("tileset-zoom", String(z)); } catch { /* ohne Speicher geht es auch */ }
}

window.addEventListener("DOMContentLoaded", () => {
  let z = 3;
  try { z = Number(localStorage.getItem("tileset-zoom")) || 3; } catch { /* Standard */ }
  document.querySelectorAll<HTMLButtonElement>(".zoom button").forEach((b) => b.addEventListener("click", () => applyZoom(Number(b.dataset.z))));
  build();
  applyZoom(z);
});
