// Lokaler Entwicklungsserver — ohne zusätzliche Abhängigkeiten.
//   npm run dev   → baut das Spiel und liefert es unter http://localhost:8080 aus
// Änderungen in src/ oder accognita.template.html lösen einen neuen Build aus;
// danach lädt der Browser die Seite selbst neu.
// Umgebungsvariablen: PORT (Standard 8080), HOST (Standard 0.0.0.0, nötig im Container).

const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";
const WATCH = ["src", "accognita.template.html"];

// Wird nur beim Ausliefern eingefügt, nie in die gebaute Datei geschrieben
const RELOAD_SCRIPT =
  '<script>new EventSource("/__reload").onmessage = () => location.reload();</script>';

const clients = new Set();
let building = false;
let pending = false;

function build() {
  if (building) { pending = true; return; }
  building = true;
  const started = Date.now();
  const proc = spawn(process.execPath, ["build.js"], { cwd: ROOT, stdio: "inherit" });
  proc.on("exit", (code) => {
    building = false;
    if (code === 0) {
      console.log(`✔ Gebaut in ${Date.now() - started} ms — Browser lädt neu`);
      for (const res of clients) res.write("data: reload\n\n");
    } else {
      console.log("✘ Build fehlgeschlagen — die letzte funktionierende Version bleibt aktiv");
    }
    if (pending) { pending = false; build(); }
  });
}

// Editoren speichern oft mehrere Dateien kurz hintereinander → kurz sammeln
let timer;
function scheduleBuild() {
  clearTimeout(timer);
  timer = setTimeout(build, 200);
}

for (const target of WATCH) {
  const p = path.join(ROOT, target);
  fs.watch(p, { recursive: fs.statSync(p).isDirectory() }, scheduleBuild);
}

http.createServer((req, res) => {
  const url = (req.url || "/").split("?")[0];

  if (url === "/__reload") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(": verbunden\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  if (url === "/" || url === "/index.html" || url === "/accognita.html") {
    fs.readFile(path.join(ROOT, "accognita.html"), "utf8", (err, html) => {
      if (err) {
        res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Noch nicht gebaut — bitte kurz warten und neu laden.");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
      res.end(html.replace(/<\/html>\s*$/, `${RELOAD_SCRIPT}</html>\n`));
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Nicht gefunden");
}).listen(PORT, HOST, () => {
  console.log(`Spiel: http://localhost:${PORT}  (Strg+C beendet)`);
  build();
});
