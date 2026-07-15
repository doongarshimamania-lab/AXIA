const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVER_SCRIPT = path.join(__dirname, 'timelock/serve-combined.cjs');
const LOG = '/tmp/server-manager.log';
const PORT = 3000;

function log(msg) {
  const line = `${new Date().toISOString()} ${msg}\n`;
  fs.appendFileSync(LOG, line);
  console.log(line.trim());
}

// We need to modify the serve-combined.cjs to use port 3000
// Instead, let's just create an inline server that also proxies to Convex
const http = require('http');

const DIST = '/home/z/my-project/timelock/dist';
const CONVEX_BACKEND = 'http://127.0.0.1:3210';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.webp': 'image/webp',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  log(`Request: ${req.method} ${urlPath}`);
  
  // Proxy Convex API requests
  if (urlPath.startsWith('/convex/')) {
    const backendPath = urlPath.replace('/convex', '') + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
    
    const options = {
      hostname: '127.0.0.1',
      port: 3210,
      path: backendPath,
      method: req.method,
      headers: {
        ...req.headers,
        host: '127.0.0.1:3210',
      },
    };
    
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (e) => {
      log(`Proxy error: ${e.message}`);
      res.writeHead(502);
      res.end('Bad Gateway');
    });
    
    req.pipe(proxyReq);
    return;
  }
  
  // Serve static files
  let filePath = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath);
  
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  const ext = path.extname(filePath);
  
  if (ext && ext !== '.html') {
    try {
      if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, {
          'Content-Type': MIME[ext] || 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000, immutable',
        });
        res.end(data);
        return;
      }
    } catch (e) {
      log(`Error serving ${filePath}: ${e.message}`);
    }
  }
  
  try {
    const indexPath = path.join(DIST, 'index.html');
    const data = fs.readFileSync(indexPath);
    res.writeHead(200, {
      'Content-Type': MIME['.html'],
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch (e) {
    log(`Error serving index.html: ${e.message}`);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

// WebSocket upgrade proxy for Convex
server.on('upgrade', (req, socket, head) => {
  const urlPath = req.url.split('?')[0];
  
  if (urlPath.startsWith('/convex/')) {
    const backendPath = req.url.replace('/convex', '');
    
    const options = {
      hostname: '127.0.0.1',
      port: 3210,
      path: backendPath,
      method: req.method,
      headers: {
        ...req.headers,
        host: '127.0.0.1:3210',
      },
    };
    
    const backendReq = http.request(options);
    backendReq.on('upgrade', (backendRes, backendSocket, backendHead) => {
      const response = [
        'HTTP/1.1 101 Switching Protocols',
        ...Object.entries(backendRes.headers).map(([k, v]) => `${k}: ${v}`),
        '', ''
      ].join('\r\n');
      socket.write(response);
      backendSocket.pipe(socket);
      socket.pipe(backendSocket);
      backendSocket.on('error', () => socket.end());
      socket.on('error', () => backendSocket.end());
    });
    backendReq.on('error', () => socket.destroy());
    backendReq.end();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  log(`TIMELock server running on port ${PORT}`);
  log(`Serving from ${DIST}`);
  log(`Proxying /convex/* to ${CONVEX_BACKEND}`);
});

server.on('error', (err) => {
  log(`Server error: ${err.message}`);
  process.exit(1);
});

process.on('SIGTERM', () => { log('SIGTERM received'); process.exit(0); });
process.on('SIGINT', () => { log('SIGINT received'); process.exit(0); });

setInterval(() => { log('heartbeat'); }, 60000);
