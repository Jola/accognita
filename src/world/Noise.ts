// ============================================================
// NOISE — deterministisches Rauschen für die Weltgenerierung (GDD-12)
// Kein Phaser-Import.
// ============================================================

/** Ganzzahl-Hash → [0, 1). Gleiche Eingaben → gleicher Wert. */
export function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1103515245);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Value-Noise in [0, 1], weich interpoliert. */
export function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return (a + (b - a) * u) + ((c + (d - c) * u) - (a + (b - a) * u)) * v;
}

/** Mehrere Oktaven Value-Noise, normiert auf [0, 1]. */
export function fbm(x: number, y: number, seed: number, octaves: number): number {
  let sum = 0, amp = 1, norm = 0, f = 1;
  for (let o = 0; o < octaves; o++) {
    sum += valueNoise(x * f, y * f, seed + o * 7919) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

/** Seeded LCG — liefert Zufallszahlen in [0, 1). */
export function makeLCG(seed: number): () => number {
  let s = seed >>> 0;
  return (): number => {
    s = ((Math.imul(s, 1664525) + 1013904223) & 0xffffffff) >>> 0;
    return s / 4294967296;
  };
}
