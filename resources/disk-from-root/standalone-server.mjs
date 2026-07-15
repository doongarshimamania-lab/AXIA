import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

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
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".webp": "image/webp",
};

// Start Convex local backend
console.log("Starting Convex local backend...");
const convexProc = spawn("npx", ["convex", "dev", "--typecheck=disable"], {
  cwd: __dirname,
  stdio: ["ignore", "pipe", "pipe"],
  detached: false,
});

convexProc.stdout.on("data", (data) => {
  const msg = data.toString().trim();
  if (msg) console.log("[Convex]", msg);
});
convexProc.stderr.on("data", (data) => {
  const msg = data.toString().trim();
  if (msg) console.log("[Convex]", msg);
});
convexProc.on("exit", (code) => {
  console.log(`Convex process exited with code ${code}`);
});

// Wait for Convex to be ready
async function waitForConvex(maxRetries = 60) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: "127.0.0.1",
          port: CONVEX_PORT,
          path: "/api/query",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          timeout: 2000,
        }, (res) => {
          let body = "";
          res.on("data", (chunk) => body += chunk);
          res.on("end", () => resolve(body));
        });
        req.on("error", reject);
        req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
        req.write('{"path":"auth:isAuthenticated","args":{}}');
        req.end();
      });
      console.log(`Convex ready after ${i + 1}s`);
      return true;
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return false;
}

function serveStatic(req, res) {
  let filePath = path.join(DIST_DIR, req.url === "/" ? "index.html" : req.url.split("?")[0]);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback
      if (err.code === "ENOENT" && !ext) {
        fs.readFile(path.join(DIST_DIR, "index.html"), (e2, d2) => {
          if (e2) { res.writeHead(500); res.end("Server Error"); return; }
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(d2);
        });
        return;
      }
      // Try SPA fallback for all non-static routes
      fs.readFile(path.join(DIST_DIR, "index.html"), (e2, d2) => {
        if (e2) { res.writeHead(404); res.end("Not Found"); return; }
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(d2);
      });
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
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Convex backend unavailable" }));
  });

  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Proxy /api/* to Convex backend
  if (req.url && req.url.startsWith("/api/")) {
    proxyToConvex(req, res);
    return;
  }

  // Serve static files for everything else
  serveStatic(req, res);
});

// Handle WebSocket upgrades for Convex real-time sync
server.on("upgrade", (req, socket, head) => {
  if (req.url && req.url.startsWith("/api/")) {
    const options = {
      hostname: "127.0.0.1",
      port: CONVEX_PORT,
      path: req.url,
      method: "GET",
      headers: req.headers,
    };

    const proxyReq = http.request(options);
    proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
      socket.write(
        "HTTP/1.1 101 Switching Protocols\r\n" +
        Object.entries(proxyRes.headers).map(([k, v]) => `${k}: ${v}`).join("\r\n") +
        "\r\n\r\n"
      );
      proxySocket.pipe(socket);
      socket.pipe(proxySocket);
      proxySocket.on("error", () => socket.destroy());
      socket.on("error", () => proxySocket.destroy());
    });
    proxyReq.on("error", () => socket.destroy());
    proxyReq.end();
  }
});

async function main() {
  const ready = await waitForConvex();
  if (!ready) {
    console.error("Convex backend failed to start!");
  }

  server.listen(SERVER_PORT, "0.0.0.0", () => {
    console.log(`\n=============================================`);
    console.log(`Axia server running on port ${SERVER_PORT}`);
    console.log(`  Static files: ${DIST_DIR}`);
    console.log(`  Convex proxy: /api/* -> 127.0.0.1:${CONVEX_PORT}`);
    console.log(`=============================================\n`);
  });
}

main();

// Cleanup
process.on("SIGINT", () => {
  console.log("Shutting down...");
  convexProc.kill();
  server.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("Shutting down...");
  convexProc.kill();
  server.close();
  process.exit(0);
});
