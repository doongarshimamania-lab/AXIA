const http = require("http");
const fs = require("fs");
const path = require("path");

const DIST = path.join(__dirname, "dist");
const PORT = 81;

const MIME = {
  ".html": "text/html",
  ".js":  "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png":  "image/png",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split("?")[0];
  
  // Serve index.html for all non-file routes (SPA)
  const ext = path.extname(urlPath);
  if (!ext || ext === ".html") {
    urlPath = "/index.html";
  }

  const filePath = path.join(DIST, urlPath);
  
  if (!fs.existsSync(filePath)) {
    // Fallback to index.html for SPA routing
    const idx = path.join(DIST, "index.html");
    const data = fs.readFileSync(idx);
    res.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-cache" });
    res.end(data);
    return;
  }

  const data = fs.readFileSync(filePath);
  const contentType = MIME[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "public, max-age=86400" });
  res.end(data);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Preview server running on port ${PORT}, serving ${DIST}`);
});
