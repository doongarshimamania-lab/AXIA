import { createServer } from "http";
import { readFile } from "fs/promises";
import { join, extname } from "path";

const DIR = "/home/z/my-project/timelock/public";
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

process.on("uncaughtException", (err) => {
  console.error("Uncaught:", err.message);
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

const server = createServer(async (req, res) => {
  try {
    let urlPath = req.url.split("?")[0];
    if (urlPath === "/") urlPath = "/index.html";
    
    const filePath = join(DIR, urlPath);
    const data = await readFile(filePath);
    const mime = MIME[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  } catch {
    try {
      const fallback = await readFile(join(DIR, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(fallback);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  }
});

server.on("error", (e) => {
  console.error("Server error:", e.message);
  if (e.code === "EADDRINUSE") {
    setTimeout(() => {
      server.close();
      server.listen(PORT, "127.0.0.1");
    }, 1000);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.error(`Robust server on ${PORT}`);
});
