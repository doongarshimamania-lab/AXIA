const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST = path.join(__dirname, "dist");
const PORT = 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":  "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".pdf":  "application/pdf",
  ".webp": "image/webp",
};

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME[ext] || "application/octet-stream";
}

function serveFile(filePath, res, isSPA) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (!isSPA) {
        // Fallback to index.html for SPA routing
        serveFile(path.join(DIST, "index.html"), res, true);
        return;
      }
      res.writeHead(500);
      res.end("Server Error");
      return;
    }
    
    const contentType = getContentType(filePath);
    const isHtml = filePath.endsWith(".html");
    const cacheControl = isHtml 
      ? "no-store, no-cache, must-revalidate, proxy-revalidate"
      : "public, max-age=86400";
    
    res.writeHead(200, { 
      "Content-Type": contentType, 
      "Cache-Control": cacheControl,
      "Pragma": isHtml ? "no-cache" : "",
      "Expires": isHtml ? "0" : "",
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  let urlPath = req.url.split("?")[0].split("#")[0];
  
  try {
    urlPath = decodeURIComponent(urlPath);
  } catch(e) {}

  // Security: prevent directory traversal
  if (urlPath.includes("..")) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  // Normalize path
  if (urlPath === "/" || urlPath === "") {
    urlPath = "/index.html";
  }

  const ext = path.extname(urlPath).toLowerCase();
  
  if (ext === ".html" || ext === "") {
    // No extension or .html → serve index.html (SPA routing)
    serveFile(path.join(DIST, "index.html"), res, true);
  } else {
    // Has a file extension → serve the actual file
    serveFile(path.join(DIST, urlPath), res, false);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Axia preview server on port ${PORT}, serving ${DIST}`);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught:", err.message);
});
