import { createServer } from "http";
import { readFile } from "fs/promises";
import { join, extname } from "path";

const DIR = "/home/z/my-project/timelock/dist";
const PORT = 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

// Cache all files in memory for maximum speed
const fileCache = new Map();

async function loadFile(path) {
  if (fileCache.has(path)) return fileCache.get(path);
  try {
    const data = await readFile(join(DIR, path));
    const mime = MIME[extname(path)] || "application/octet-stream";
    fileCache.set(path, { data, mime });
    return { data, mime };
  } catch {
    return null;
  }
}

// Pre-load index.html
const indexHtml = await readFile(join(DIR, "index.html"));

const server = createServer(async (req, res) => {
  try {
    let path = req.url.split("?")[0];
    if (path === "/") path = "/index.html";
    
    const file = await loadFile(path);
    if (file) {
      res.writeHead(200, { 
        "Content-Type": file.mime,
        "Cache-Control": "public, max-age=3600",
      });
      res.end(file.data);
    } else {
      // SPA fallback
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(indexHtml);
    }
  } catch {
    res.writeHead(500);
    res.end();
  }
});

// Handle all errors to prevent crashes
process.on("uncaughtException", () => {});
process.on("unhandledRejection", () => {});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    setTimeout(() => server.listen(PORT, "0.0.0.0"), 1000);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.error(`Evergreen server on :${PORT}`);
});
