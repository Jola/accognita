// Build-Script: TypeScript kompilieren + in accognita.html bündeln
// Verwendung: node build.js [--out <verzeichnis>]
//   --out <dir>  Ausgabeverzeichnis (Standard: aktuelles Verzeichnis)
//
// In CI: node build.js --out _site
// Lokal:  node build.js

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outDir = outIdx !== -1 ? args[outIdx + 1] : ".";

// 1. TypeScript kompilieren
console.log("tsc...");
execFileSync("node_modules/.bin/tsc", [], { stdio: "inherit" });

// 2. Bundle mit esbuild
console.log("esbuild...");
const bundle = execFileSync(
  "node_modules/.bin/esbuild",
  [
    "dist/js/scenes/GameScene.js",
    "--bundle",
    "--format=iife",
    "--platform=browser",
    "--external:phaser",
  ],
  { encoding: "utf8" }
);

// 3. Template einlesen und HTML zusammenbauen
const template = fs.readFileSync("accognita.template.html", "utf8");
const html = template + "<script>\n" + bundle + "</script>\n\n</html>\n";

// 4. Ausgabeverzeichnis anlegen und Datei schreiben
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "accognita.html"), html);

// 5. Index-Redirect für GitHub Pages
if (outDir !== ".") {
  const redirect =
    '<!DOCTYPE html><html><head>' +
    '<meta http-equiv="refresh" content="0;url=accognita.html">' +
    '<meta charset="UTF-8"></head><body></body></html>\n';
  fs.writeFileSync(path.join(outDir, "index.html"), redirect);
  fs.copyFileSync("README.md", path.join(outDir, "README.md"));
}

console.log(
  `Build fertig: ${path.join(outDir, "accognita.html")} (${Math.round(html.length / 1024)} kb)`
);
