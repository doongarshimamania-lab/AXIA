const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const DIST_DIR = path.join(__dirname, 'dist');
const CONVEX_PORT = 3210;
const CONVEX_HOST = '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
};

function proxyRequest(req, res) {
  const options = {
    hostname: CONVEX_HOST,
    port: CONVEX_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `${CONVEX_HOST}:${CONVEX_PORT}` },
  };
  
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (e) => {
    console.error(`[proxy] Error: ${e.message}`);
    res.writeHead(502);
    res.end('Bad Gateway');
  });
  
  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  
  // Proxy Convex API and WebSocket requests
  if (urlPath.startsWith('/api/') || urlPath.startsWith('/.well-known/')) {
    proxyRequest(req, res);
    return;
  }
  
  // Serve static files
  let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);
  
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end();
    return;
  }
  
  const ext = path.extname(filePath);
  
  // For asset files with extensions, try to serve directly
  if (ext && ext !== '.html') {
    try {
      if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Cache-Control': ext === '.js' || ext === '.css' ? 'public, max-age=31536000, immutable' : 'no-cache',
        });
        res.end(data);
        return;
      }
    } catch (e) { /* fall through to SPA fallback */ }
  }
  
  // SPA fallback: serve index.html
  try {
    const data = fs.readFileSync(path.join(DIST_DIR, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch (e) {
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

// WebSocket upgrade proxy for Convex
server.on('upgrade', (req, socket, head) => {
  console.log(`[ws-proxy] Upgrade: ${req.url}`);
  
  const options = {
    hostname: CONVEX_HOST,
    port: CONVEX_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `${CONVEX_HOST}:${CONVEX_PORT}` },
  };
  
  const backendReq = http.request(options);
  backendReq.on('upgrade', (backendRes, backendSocket, backendHead) => {
    backendSocket.on('error', () => socket.destroy());
    socket.on('error', () => backendSocket.destroy());
    
    // Send the upgrade response
    const responseHeaders = Object.entries(backendRes.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\r\n');
    socket.write(`HTTP/1.1 101 Switching Protocols\r\n${responseHeaders}\r\n\r\n`);
    
    if (backendHead && backendHead.length > 0) socket.write(backendHead);
    backendSocket.pipe(socket);
    socket.pipe(backendSocket);
  });
  
  backendReq.on('error', (e) => {
    console.error(`[ws-proxy] Error: ${e.message}`);
    socket.destroy();
  });
  
  backendReq.end();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[combined] TIMELock server on port ${PORT}`);
  console.log(`[combined] Static files: ${DIST_DIR}`);
  console.log(`[combined] Convex proxy: http://${CONVEX_HOST}:${CONVEX_PORT}`);
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log(`[combined] Port ${PORT} in use, retrying...`);
    setTimeout(() => server.listen(PORT, '0.0.0.0'), 2000);
  }
});

process.on('uncaughtException', (e) => {
  console.error(`[combined] Uncaught: ${e.message}`);
});

// Heartbeat
setInterval(() => {}, 30000);
