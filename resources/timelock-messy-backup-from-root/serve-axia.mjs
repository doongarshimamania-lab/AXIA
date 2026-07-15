import { createServer } from "http";
import { readFile, existsSync } from "fs";
import { join, extname } from "path";

const DIR = "/home/z/my-project/timelock/public";
const PORT = 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

const server = createServer((req, res) => {
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/") urlPath = "/index.html";
  
  const filePath = join(DIR, urlPath);
  
  readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback
      readFile(join(DIR, "index.html"), (err2, fallback) => {
        if (err2) {
          res.writeHead(404);
          res.end("Not found");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(fallback);
      });
      return;
    }
    const mime = MIME[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    setTimeout(() => server.listen(PORT, "0.0.0.0"), 1000);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Axia preview on :${PORT}`);
});
