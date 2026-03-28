// ============================================================
// TILESET GENERATOR
// Zeichnet 24 Pixel-Art-Tiles (6 Biome × 4 Höhen) auf einen
// 768×32px Canvas und registriert ihn als Phaser-Textur.
//
// Kein Phaser-Import — scene wird als any übergeben.
// Verwendet nur DOM Canvas 2D API.
// ============================================================
export const TILE_SIZE = 32;
export const TILE_COUNT = 24; // 6 Biome × 4 Höhen
// Tile-Index = biomeOffset + heightLevel (0–3)
export const BIOME_TILE_OFFSET = {
    forest: 0,
    swamp: 4,
    highland: 8,
    mountain: 12,
    desert: 16,
    dungeon: 20,
};
// ────────────────────────────────────────
// Interne Hilfsfunktionen
// ────────────────────────────────────────
function hexToRgb(color) {
    const n = parseInt(color.replace("#", ""), 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
/** Einfaches deterministisches LCG — kein Math.random() */
function makeLCG(seed) {
    let s = seed >>> 0;
    return () => {
        s = ((s * 1664525 + 1013904223) & 0xffffffff) >>> 0;
        return s / 0xffffffff;
    };
}
function setPixel(data, x, y, r, g, b, a = 255) {
    if (x < 0 || x >= TILE_SIZE || y < 0 || y >= TILE_SIZE)
        return;
    const i = (y * TILE_SIZE + x) * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
}
function fillBlock(data, x, y, w, h, r, g, b, a = 255) {
    for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
            setPixel(data, x + dx, y + dy, r, g, b, a);
        }
    }
}
/** 3D-Kante: helle Linie oben/links, dunkle Linie unten/rechts */
function draw3DEdge(data, lr, lg, lb, dr, dg, db) {
    for (let x = 0; x < TILE_SIZE; x++)
        setPixel(data, x, 0, lr, lg, lb, 160);
    for (let y = 1; y < TILE_SIZE; y++)
        setPixel(data, 0, y, lr, lg, lb, 100);
    for (let x = 0; x < TILE_SIZE; x++)
        setPixel(data, x, TILE_SIZE - 1, dr, dg, db, 140);
    for (let y = 0; y < TILE_SIZE - 1; y++)
        setPixel(data, TILE_SIZE - 1, y, dr, dg, db, 100);
}
const PALETTES = {
    forest: { base: "#3d7a32", light: "#5aaa46", dark: "#1e4a18", accent: "#d4c840" },
    swamp: { base: "#2d4e24", light: "#3d6a30", dark: "#141e10", accent: "#3a8878" },
    highland: { base: "#7a6838", light: "#9a8a50", dark: "#4a4020", accent: "#9a7840" },
    mountain: { base: "#686878", light: "#9898a8", dark: "#383840", accent: "#b8b8c8" },
    desert: { base: "#c0a048", light: "#d8c070", dark: "#886828", accent: "#c8b858" },
    dungeon: { base: "#282838", light: "#383850", dark: "#14141e", accent: "#484858" },
};
// ────────────────────────────────────────
// Biom-Zeichenfunktionen
// ────────────────────────────────────────
function drawForest(data, height, seed) {
    const { base, light, dark, accent } = PALETTES.forest;
    const [br, bg, bb] = hexToRgb(base);
    const [lr, lg, lb] = hexToRgb(light);
    const [dr, dg, db] = hexToRgb(dark);
    const [ar, ag, ab] = hexToRgb(accent);
    const rng = makeLCG(seed);
    if (height === 0) {
        // Tiefes Wasser / Teich
        for (let y = 0; y < TILE_SIZE; y++) {
            for (let x = 0; x < TILE_SIZE; x++) {
                const wave = Math.sin(x * 0.6 + y * 0.3) * 0.5 + 0.5;
                const r = 0x22 + (wave * 10) | 0;
                const g = 0x55 + (wave * 18) | 0;
                const b = 0x99 + (wave * 20) | 0;
                setPixel(data, x, y, r, g, b);
            }
        }
        // Wellen-Linien
        for (let y = 5; y < TILE_SIZE; y += 6) {
            for (let x = 0; x < TILE_SIZE - 1; x++) {
                setPixel(data, x, y, 0x55, 0x99, 0xcc, 160);
            }
        }
        return;
    }
    // Basis mit organischer Variation
    for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
            const v = rng() * 0.14 - 0.07;
            setPixel(data, x, y, Math.min(255, Math.max(0, br + v * 35)) | 0, Math.min(255, Math.max(0, bg + v * 45)) | 0, Math.min(255, Math.max(0, bb + v * 20)) | 0);
        }
    }
    // Dunklere Bodenflecken
    for (let i = 0; i < 5; i++) {
        const sx = 1 + (rng() * 28) | 0;
        const sy = 12 + (rng() * 16) | 0;
        fillBlock(data, sx, sy, 2, 2, dr, dg, db, 130);
    }
    // Grashalme (untere Hälfte der Tile)
    const bladeCount = 9 + (rng() * 5) | 0;
    for (let i = 0; i < bladeCount; i++) {
        const bx = 1 + (rng() * 30) | 0;
        const by = 18 + (rng() * 10) | 0;
        const bh = 3 + (rng() * (height + 2)) | 0;
        for (let d = 0; d < bh; d++) {
            const a = 170 + (rng() * 85) | 0;
            // Grashalm leicht schräg
            const lean = d > 1 && rng() > 0.6 ? 1 : 0;
            setPixel(data, bx + lean, by - d, lr, lg, lb, a);
        }
        // Halmspitze heller
        setPixel(data, bx, by - bh, Math.min(255, lr + 30), Math.min(255, lg + 30), lb, 220);
    }
    // Helle Grasflecken
    for (let i = 0; i < 4; i++) {
        const sx = 1 + (rng() * 28) | 0;
        const sy = 14 + (rng() * 14) | 0;
        fillBlock(data, sx, sy, 2, 1, lr, lg, lb, 100);
    }
    // Blümchen (Akzentpixel)
    const flowerCount = height >= 2 ? 2 : 1;
    for (let i = 0; i < flowerCount; i++) {
        if (rng() > 0.45) {
            const fx = 2 + (rng() * 28) | 0;
            const fy = 16 + (rng() * 13) | 0;
            setPixel(data, fx, fy, ar, ag, ab);
            // Mini-Kreuz um die Blüte
            setPixel(data, fx - 1, fy, ar, ag, ab, 120);
            setPixel(data, fx + 1, fy, ar, ag, ab, 120);
        }
    }
    // Höhe 3: dichte Baumschatten-Flecken
    if (height === 3) {
        for (let i = 0; i < 4; i++) {
            const sx = (rng() * 24) | 0;
            const sy = (rng() * 20) | 0;
            fillBlock(data, sx, sy, 5, 4, dr, dg, db, 90);
        }
    }
    draw3DEdge(data, lr, lg, lb, dr, dg, db);
}
function drawSwamp(data, height, seed) {
    const { base, light, dark, accent } = PALETTES.swamp;
    const [br, bg, bb] = hexToRgb(base);
    const [lr, lg, lb] = hexToRgb(light);
    const [dr, dg, db] = hexToRgb(dark);
    const [ar, ag, ab] = hexToRgb(accent);
    const rng = makeLCG(seed);
    if (height === 0) {
        // Stagnierendes Sumpfwasser
        for (let y = 0; y < TILE_SIZE; y++) {
            for (let x = 0; x < TILE_SIZE; x++) {
                const v = rng() * 0.1;
                setPixel(data, x, y, (0x0f + v * 10) | 0, (0x28 + v * 15) | 0, (0x1a + v * 10) | 0);
            }
        }
        // Trübe Reflexionen
        for (let y = 4; y < TILE_SIZE; y += 7) {
            for (let x = 0; x < TILE_SIZE; x++) {
                if (rng() > 0.45)
                    setPixel(data, x, y, ar, ag, ab, 120);
            }
        }
        return;
    }
    // Basis mit feuchter Textur
    for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
            const v = rng() * 0.12 - 0.06;
            setPixel(data, x, y, Math.min(255, Math.max(0, br + v * 25)) | 0, Math.min(255, Math.max(0, bg + v * 35)) | 0, Math.min(255, Math.max(0, bb + v * 18)) | 0);
        }
    }
    // Moos-Flecken
    const mossCount = 6 + (rng() * 4) | 0;
    for (let i = 0; i < mossCount; i++) {
        const mx = (rng() * 28) | 0;
        const my = (rng() * 28) | 0;
        const mw = 2 + (rng() * 2) | 0;
        const mh = 2 + (rng() * 2) | 0;
        fillBlock(data, mx, my, mw, mh, dr, dg, db, 160);
    }
    // Wasserpfützen (elliptisch)
    for (let p = 0; p < 2; p++) {
        const cx = 4 + (rng() * 22) | 0;
        const cy = 6 + (rng() * 18) | 0;
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -4; dx <= 4; dx++) {
                if ((dx * dx) / 16.0 + (dy * dy) / 4.0 <= 1.0) {
                    const a = 140 + (rng() * 60) | 0;
                    setPixel(data, cx + dx, cy + dy, ar, ag, ab, a);
                }
            }
        }
        // Spiegelung im Wasser
        setPixel(data, cx, cy - 1, Math.min(255, ar + 30), Math.min(255, ag + 30), Math.min(255, ab + 30), 160);
    }
    // Vereinzelte Grashalme
    for (let i = 0; i < 4; i++) {
        const bx = 1 + (rng() * 30) | 0;
        const by = 20 + (rng() * 8) | 0;
        setPixel(data, bx, by, lr, lg, lb, 160);
        setPixel(data, bx, by - 1, lr, lg, lb, 200);
        setPixel(data, bx, by - 2, lr, lg, lb, 140);
    }
    draw3DEdge(data, lr, lg, lb, dr, dg, db);
}
function drawHighland(data, height, seed) {
    const { base, light, dark, accent } = PALETTES.highland;
    const [br, bg, bb] = hexToRgb(base);
    const [lr, lg, lb] = hexToRgb(light);
    const [dr, dg, db] = hexToRgb(dark);
    const [ar, ag, ab] = hexToRgb(accent);
    const rng = makeLCG(seed);
    if (height === 0) {
        // Felsiger Bach
        for (let y = 0; y < TILE_SIZE; y++) {
            for (let x = 0; x < TILE_SIZE; x++) {
                const wave = Math.sin(x * 0.7 + y * 0.4) * 0.5 + 0.5;
                setPixel(data, x, y, (0x3a + wave * 15) | 0, (0x55 + wave * 20) | 0, (0x78 + wave * 18) | 0);
            }
        }
        // Steine im Bach
        for (let i = 0; i < 4; i++) {
            const sx = (rng() * 26) | 0;
            const sy = (rng() * 26) | 0;
            fillBlock(data, sx, sy, 3, 2, ar, ag, ab, 200);
            setPixel(data, sx, sy, lr, lg, lb, 220);
        }
        return;
    }
    // Basis: Erde mit horizontalen Streifen (trockene Textur)
    for (let y = 0; y < TILE_SIZE; y++) {
        const streak = (y % 5 < 1 || y % 7 < 1) ? 0.18 : 0;
        for (let x = 0; x < TILE_SIZE; x++) {
            const v = rng() * 0.1 - 0.05;
            setPixel(data, x, y, Math.min(255, Math.max(0, br + (v - streak) * 40)) | 0, Math.min(255, Math.max(0, bg + (v - streak) * 35)) | 0, Math.min(255, Math.max(0, bb + (v - streak) * 20)) | 0);
        }
    }
    // Trockene Grashalme (diagonal)
    const bladeCount = 7 + (rng() * 4) | 0;
    for (let i = 0; i < bladeCount; i++) {
        const bx = 1 + (rng() * 29) | 0;
        const by = 8 + (rng() * 20) | 0;
        const len = 2 + (rng() * 3) | 0;
        for (let d = 0; d < len; d++) {
            setPixel(data, bx + d, by - d, lr, lg, lb, 170);
        }
    }
    // Feldsteine
    const stoneCount = 2 + (rng() * 3) | 0;
    for (let i = 0; i < stoneCount; i++) {
        const sx = 2 + (rng() * 26) | 0;
        const sy = 4 + (rng() * 24) | 0;
        const sw = 2 + (rng() * 2) | 0;
        fillBlock(data, sx, sy, sw, 2, ar, ag, ab, 200);
        // Highlight auf dem Stein
        setPixel(data, sx, sy, lr, lg, lb, 230);
        setPixel(data, sx + 1, sy, Math.min(255, lr + 20), Math.min(255, lg + 20), Math.min(255, lb + 20), 180);
        // Schatten unterm Stein
        fillBlock(data, sx, sy + 2, sw, 1, dr, dg, db, 120);
    }
    draw3DEdge(data, lr, lg, lb, dr, dg, db);
}
function drawMountain(data, height, seed) {
    const { base, light, dark, accent } = PALETTES.mountain;
    const [br, bg, bb] = hexToRgb(base);
    const [lr, lg, lb] = hexToRgb(light);
    const [dr, dg, db] = hexToRgb(dark);
    const rng = makeLCG(seed);
    if (height === 0) {
        // Dunkle Felsspalte / Abgrund
        for (let y = 0; y < TILE_SIZE; y++) {
            for (let x = 0; x < TILE_SIZE; x++) {
                const v = rng() * 0.08;
                setPixel(data, x, y, (0x22 + v * 15) | 0, (0x22 + v * 15) | 0, (0x30 + v * 20) | 0);
            }
        }
        // Felskante-Highlights
        for (let x = 0; x < TILE_SIZE; x++)
            setPixel(data, x, 0, lr, lg, lb, 180);
        for (let x = 0; x < TILE_SIZE; x++)
            setPixel(data, x, 1, lr, lg, lb, 80);
        return;
    }
    // Basis-Stein mit Farbvariation
    for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
            const v = rng() * 0.14 - 0.07;
            setPixel(data, x, y, Math.min(255, Math.max(0, br + v * 50)) | 0, Math.min(255, Math.max(0, bg + v * 50)) | 0, Math.min(255, Math.max(0, bb + v * 55)) | 0);
        }
    }
    // Zick-Zack-Risse
    const crackCount = 2 + (rng() * 3) | 0;
    for (let c = 0; c < crackCount; c++) {
        let cx = 2 + (rng() * 28) | 0;
        let cy = (rng() * 10) | 0;
        const crackLen = 8 + (rng() * 16) | 0;
        for (let d = 0; d < crackLen; d++) {
            setPixel(data, cx, cy, dr, dg, db, 220);
            // Riss-Schimmer auf einer Seite
            if (cx > 0)
                setPixel(data, cx - 1, cy, lr, lg, lb, 60);
            cy++;
            cx = Math.min(31, Math.max(0, cx + ((rng() * 3) | 0) - 1));
        }
    }
    // Mineral-Glanzpunkte (accent)
    const [ar, ag, ab] = hexToRgb(accent);
    for (let i = 0; i < 3 + height; i++) {
        if (rng() > 0.4) {
            const gx = (rng() * TILE_SIZE) | 0;
            const gy = (rng() * TILE_SIZE) | 0;
            setPixel(data, gx, gy, ar, ag, ab, 200);
            setPixel(data, gx + 1, gy, ar, ag, ab, 100);
            setPixel(data, gx, gy + 1, ar, ag, ab, 100);
        }
    }
    // Starke 3D-Kante für Felsklotz-Feeling
    for (let x = 0; x < TILE_SIZE; x++)
        setPixel(data, x, 0, lr, lg, lb, 220);
    for (let x = 0; x < TILE_SIZE; x++)
        setPixel(data, x, 1, lr, lg, lb, 110);
    for (let y = 2; y < TILE_SIZE; y++)
        setPixel(data, 0, y, lr, lg, lb, 160);
    for (let x = 0; x < TILE_SIZE; x++)
        setPixel(data, x, TILE_SIZE - 1, dr, dg, db, 220);
    for (let x = 0; x < TILE_SIZE; x++)
        setPixel(data, x, TILE_SIZE - 2, dr, dg, db, 100);
    for (let y = 0; y < TILE_SIZE - 2; y++)
        setPixel(data, TILE_SIZE - 1, y, dr, dg, db, 160);
    // Höhe 3: Schnee-Overlay
    if (height === 3) {
        const snowRng = makeLCG(seed + 7777);
        for (let y = 0; y < 11; y++) {
            for (let x = 0; x < TILE_SIZE; x++) {
                const a = y < 5
                    ? 160 + (snowRng() * 95) | 0
                    : (snowRng() > 0.5 ? (100 + (snowRng() * 80) | 0) : 0);
                if (a > 0)
                    setPixel(data, x, y, 215, 228, 240, a);
            }
        }
        // Eiskristall-Pixel
        for (let i = 0; i < 8; i++) {
            const sx = (snowRng() * TILE_SIZE) | 0;
            const sy = (snowRng() * 10) | 0;
            setPixel(data, sx, sy, 255, 255, 255);
            if (sx > 0)
                setPixel(data, sx - 1, sy, 230, 238, 248, 180);
            if (sx < 31)
                setPixel(data, sx + 1, sy, 230, 238, 248, 180);
            if (sy > 0)
                setPixel(data, sx, sy - 1, 230, 238, 248, 150);
        }
    }
}
function drawDesert(data, height, seed) {
    const { base, light, dark, accent } = PALETTES.desert;
    const [br, bg, bb] = hexToRgb(base);
    const [lr, lg, lb] = hexToRgb(light);
    const [dr, dg, db] = hexToRgb(dark);
    const rng = makeLCG(seed);
    if (height === 0) {
        // Oase / kleiner Teich
        for (let y = 0; y < TILE_SIZE; y++) {
            for (let x = 0; x < TILE_SIZE; x++) {
                const wave = Math.sin(x * 0.7 + y * 0.5) * 0.4 + 0.6;
                setPixel(data, x, y, (0x20 + wave * 15) | 0, (0x60 + wave * 20) | 0, (0xa8 + wave * 18) | 0);
            }
        }
        // Wellen
        for (let y = 3; y < TILE_SIZE; y += 5) {
            for (let x = 0; x < TILE_SIZE - 1; x++) {
                setPixel(data, x, y, 0x50, 0x99, 0xcc, 140);
            }
        }
        return;
    }
    // Sand-Basis mit feiner Körnung
    for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
            const v = rng() * 0.08 - 0.04;
            setPixel(data, x, y, Math.min(255, Math.max(0, br + v * 30)) | 0, Math.min(255, Math.max(0, bg + v * 25)) | 0, Math.min(255, Math.max(0, bb + v * 15)) | 0);
        }
    }
    // Dünen-Streifen (diagonal, hell)
    const stripeCount = 3 + (rng() * 2) | 0;
    const offset = (rng() * 8) | 0;
    for (let s = 0; s < stripeCount; s++) {
        const startD = offset + s * 7;
        for (let d = startD; d < startD + TILE_SIZE * 2; d++) {
            const sx = d - TILE_SIZE;
            const sy = d - startD;
            setPixel(data, sx, sy, lr, lg, lb, 100);
            // Doppelte Linie für Tiefe
            setPixel(data, sx + 1, sy, lr, lg, lb, 50);
        }
    }
    // Sandkörner / kleine Steine
    const pebbleCount = 3 + (rng() * 3) | 0;
    for (let i = 0; i < pebbleCount; i++) {
        const px = 2 + (rng() * 27) | 0;
        const py = 4 + (rng() * 24) | 0;
        fillBlock(data, px, py, 2, 2, dr, dg, db, 180);
        setPixel(data, px, py, lr, lg, lb, 160); // Highlight
    }
    // Höhe 2/3: Rippelmarken (Wind)
    if (height >= 2) {
        for (let y = 8; y < TILE_SIZE; y += 5) {
            for (let x = 1; x < TILE_SIZE - 1; x++) {
                if (x % 3 !== 0)
                    setPixel(data, x, y, lr, lg, lb, 70);
            }
        }
    }
    // Highlight-Kante
    for (let x = 0; x < TILE_SIZE; x++)
        setPixel(data, x, 0, lr, lg, lb, 180);
    for (let y = 1; y < TILE_SIZE; y++)
        setPixel(data, 0, y, lr, lg, lb, 110);
    for (let x = 0; x < TILE_SIZE; x++)
        setPixel(data, x, TILE_SIZE - 1, dr, dg, db, 130);
    for (let y = 0; y < TILE_SIZE - 1; y++)
        setPixel(data, TILE_SIZE - 1, y, dr, dg, db, 100);
}
function drawDungeon(data, height, seed) {
    const { base, light, dark, accent } = PALETTES.dungeon;
    const [br, bg, bb] = hexToRgb(base);
    const [lr, lg, lb] = hexToRgb(light);
    const [dr, dg, db] = hexToRgb(dark);
    const [ar, ag, ab] = hexToRgb(accent);
    const rng = makeLCG(seed);
    if (height === 0) {
        // Abgrund / tiefe Grube
        for (let y = 0; y < TILE_SIZE; y++) {
            for (let x = 0; x < TILE_SIZE; x++) {
                const v = rng() * 0.05;
                setPixel(data, x, y, (0x08 + v * 10) | 0, (0x08 + v * 10) | 0, (0x10 + v * 15) | 0);
            }
        }
        // Schwache Lichtreflexe am Rand
        for (let x = 0; x < TILE_SIZE; x++)
            setPixel(data, x, 0, dr, dg, db, 120);
        return;
    }
    // Steinquader-Muster: 8×8 Blöcke mit Fugen
    for (let y = 0; y < TILE_SIZE; y++) {
        for (let x = 0; x < TILE_SIZE; x++) {
            // Fugenlinien
            if (x % 8 === 0 || y % 8 === 0) {
                setPixel(data, x, y, dr, dg, db);
                continue;
            }
            // Leichte Farbvariation pro Block
            const blockX = Math.floor(x / 8);
            const blockY = Math.floor(y / 8);
            const even = (blockX + blockY) % 2 === 0;
            const tint = even ? 0 : 8;
            const v = rng() * 0.04;
            setPixel(data, x, y, Math.min(255, br + tint + v * 15) | 0, Math.min(255, bg + tint + v * 15) | 0, Math.min(255, bb + tint + v * 20) | 0);
        }
    }
    // Block-Innen-Risse (1–2 pro Tile)
    const crackCount = 1 + (rng() * 2) | 0;
    for (let c = 0; c < crackCount; c++) {
        const bx = ((1 + (rng() * 3) | 0)) * 8 + 1;
        const by = ((1 + (rng() * 3) | 0)) * 8 + 1;
        for (let d = 0; d < 5; d++) {
            setPixel(data, bx + d, by + ((rng() * 2) | 0), dr, dg, db, 160);
        }
    }
    // Glühende Runen-Pixel (Akzent) ab Höhe 2
    if (height >= 2 && rng() > 0.4) {
        const rx = 9 + (rng() * 12) | 0;
        const ry = 9 + (rng() * 12) | 0;
        setPixel(data, rx, ry, ar, ag, ab);
        setPixel(data, rx + 1, ry, ar, ag, ab, 140);
        setPixel(data, rx, ry + 1, ar, ag, ab, 140);
        setPixel(data, rx - 1, ry, ar, ag, ab, 100);
    }
    // Kanten-Highlights
    for (let x = 0; x < TILE_SIZE; x++)
        setPixel(data, x, 0, lr, lg, lb, 200);
    for (let x = 0; x < TILE_SIZE; x++)
        setPixel(data, x, 1, lr, lg, lb, 90);
    for (let y = 2; y < TILE_SIZE; y++)
        setPixel(data, 0, y, lr, lg, lb, 130);
}
const DRAW_FUNCTIONS = {
    forest: drawForest,
    swamp: drawSwamp,
    highland: drawHighland,
    mountain: drawMountain,
    desert: drawDesert,
    dungeon: drawDungeon,
};
const BIOME_ORDER = ["forest", "swamp", "highland", "mountain", "desert", "dungeon"];
/**
 * Generiert das Tileset und registriert es als Phaser-Textur "worldTileset".
 * Aufzurufen in GameScene.preload() bevor createWorld() läuft.
 */
export function generateTileset(scene) {
    const canvas = document.createElement("canvas");
    canvas.width = TILE_SIZE * TILE_COUNT; // 768
    canvas.height = TILE_SIZE; // 32
    const ctx = canvas.getContext("2d");
    for (let bi = 0; bi < BIOME_ORDER.length; bi++) {
        const biome = BIOME_ORDER[bi];
        const drawFn = DRAW_FUNCTIONS[biome];
        for (let h = 0; h < 4; h++) {
            const tileIndex = bi * 4 + h;
            const imgData = ctx.createImageData(TILE_SIZE, TILE_SIZE);
            // Fester Seed pro Biom+Höhe → Tile sieht immer gleich aus
            drawFn(imgData.data, h, bi * 1000 + h * 100 + 42);
            ctx.putImageData(imgData, tileIndex * TILE_SIZE, 0);
        }
    }
    scene.textures.addCanvas("worldTileset", canvas);
}
//# sourceMappingURL=TilesetGenerator.js.map