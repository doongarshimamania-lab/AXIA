const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const DIST = path.join(__dirname, 'dist');
const PORT = 5173;
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

function log(msg) {
  console.log(`${new Date().toISOString()} ${msg}`);
}

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];

  // Proxy Convex API and WebSocket requests
  if (urlPath.startsWith('/convex/')) {
    return proxyRequest(req, res, urlPath);
  }

  // Serve static files
  let filePath = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath);
  const ext = path.extname(filePath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(DIST, 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(500); res.end('Error'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(d2);
      });
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    res.end(data);
  });
});

// Handle WebSocket upgrade for Convex real-time
server.on('upgrade', (req, socket, head) => {
  const urlPath = req.url.split('?')[0];

  if (urlPath.startsWith('/convex/')) {
    // Proxy WebSocket to Convex backend
    const backendUrl = new URL(CONVEX_BACKEND);
    const backendPath = req.url.replace('/convex', '');

    const options = {
      hostname: backendUrl.hostname,
      port: backendUrl.port,
      path: backendPath,
      method: req.method,
      headers: {
        ...req.headers,
        host: `${backendUrl.hostname}:${backendUrl.port}`,
      },
    };

    const backendReq = http.request(options);
    backendReq.on('upgrade', (backendRes, backendSocket, backendHead) => {
      backendSocket.on('error', (e) => {
        log(`Backend socket error: ${e.message}`);
      });
      socket.on('error', (e) => {
        log(`Client socket error: ${e.message}`);
      });

      res = [
        'HTTP/1.1 101 Switching Protocols',
        ...Object.entries(backendRes.headers).map(([k, v]) => `${k}: ${v}`),
        '',
        '',
      ].join('\r\n');
      socket.write(res);
      backendSocket.pipe(socket);
      socket.pipe(backendSocket);
    });

    backendReq.on('error', (e) => {
      log(`Backend request error: ${e.message}`);
      socket.end();
    });

    backendReq.end();
  } else {
    socket.destroy();
  }
});

function proxyRequest(req, res, urlPath) {
  // Forward the request to the Convex backend
  const backendPath = urlPath.replace('/convex', '') + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
  const backendUrl = new URL(CONVEX_BACKEND);

  const options = {
    hostname: backendUrl.hostname,
    port: backendUrl.port,
    path: backendPath,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${backendUrl.hostname}:${backendUrl.port}`,
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
}

server.listen(PORT, '0.0.0.0', () => {
  log(`TIMELock combined server running at http://0.0.0.0:${PORT}/`);
  log(`Serving files from ${DIST}`);
  log(`Proxying /convex/* to ${CONVEX_BACKEND}`);
});

process.on('uncaughtException', (err) => {
  log(`Uncaught exception: ${err.message}`);
});
process.on('unhandledRejection', (err) => {
  log(`Unhandled rejection: ${err.message}`);
});
