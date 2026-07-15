import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "dist");
const CONVEX_PORT = 3210;
const SERVER_PORT = 3000;

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
};

function serveStatic(req, res) {
  let filePath = path.join(DIST_DIR, req.url === "/" ? "index.html" : req.url);
  
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback: serve index.html for any unmatched route
      if (err.code === "ENOENT" && !ext) {
        fs.readFile(path.join(DIST_DIR, "index.html"), (e2, d2) => {
          if (e2) { res.writeHead(500); res.end("Server Error"); return; }
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(d2);
        });
        return;
      }
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

function proxyToConvex(req, res) {
  const options = {
    hostname: "127.0.0.1",
    port: CONVEX_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${CONVEX_PORT}` },
  };
  
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  proxyReq.on("error", (err) => {
    console.error("Proxy error:", err.message);
    res.writeHead(502);
    res.end("Bad Gateway");
  });
  
  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  // Proxy /api/* to Convex backend
  if (req.url && (req.url.startsWith("/api/") || req.url.includes("/api/"))) {
    proxyToConvex(req, res);
    return;
  }
  
  // Serve static files for everything else
  serveStatic(req, res);
});

// Handle WebSocket upgrades for Convex real-time sync
server.on("upgrade", (req, socket, head) => {
  if (req.url && req.url.startsWith("/api/")) {
    // Forward WebSocket to Convex backend
    const options = {
      hostname: "127.0.0.1",
      port: CONVEX_PORT,
      path: req.url,
      method: "GET",
      headers: req.headers,
    };
    
    const proxyReq = http.request(options);
    proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
      proxySocket.on("error", (err) => {
        console.error("Proxy WS error:", err.message);
      });
      socket.write(
        `HTTP/1.1 101 Switching Protocols\r\n` +
        Object.entries(proxyRes.headers).map(([k, v]) => `${k}: ${v}`).join("\r\n") +
        "\r\n\r\n"
      );
      proxySocket.pipe(socket);
      socket.pipe(proxySocket);
    });
    proxyReq.on("error", (err) => {
      console.error("WS proxy error:", err.message);
      socket.destroy();
    });
    proxyReq.end();
  }
});

server.listen(SERVER_PORT, "0.0.0.0", () => {
  console.log(`Proxy server running on port ${SERVER_PORT}`);
  console.log(`  Static files: ${DIST_DIR}`);
  console.log(`  Convex proxy: /api/* -> 127.0.0.1:${CONVEX_PORT}`);
});
