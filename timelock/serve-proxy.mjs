import http from 'http';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';

const PORT = 3000;
const DOCROOT = '/home/z/my-project/timelock/dist';
const CONVEX_PORT = 3210;
const CONVEX_HOST = '127.0.0.1';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

function proxyToConvex(req, res) {
  const options = {
    hostname: CONVEX_HOST,
    port: CONVEX_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `${CONVEX_HOST}:${CONVEX_PORT}` },
  };

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, {
      ...proxyRes.headers,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    });
    proxyRes.pipe(res);
  });

  proxy.on('error', (err) => {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Bad Gateway');
    }
  });

  req.pipe(proxy);
}

function serveStatic(req, res) {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(DOCROOT, urlPath);

  if (urlPath === '/' || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    filePath = path.join(DOCROOT, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': getMimeType(filePath),
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  const urlPath = req.url.split('?')[0];

  // Proxy Convex API requests
  if (urlPath.startsWith('/api/') || urlPath.startsWith('/convex/')) {
    // Strip /convex prefix if present
    if (urlPath.startsWith('/convex/')) {
      req.url = urlPath.replace('/convex', '') || '/';
    }
    proxyToConvex(req, res);
    return;
  }

  // Serve static files (SPA fallback)
  serveStatic(req, res);
});

// Handle WebSocket upgrade for Convex
server.on('upgrade', (req, socket, head) => {
  let targetPath = req.url;
  // Strip /convex prefix
  if (targetPath.startsWith('/convex/')) {
    targetPath = targetPath.replace('/convex', '') || '/';
  }

  const wsHeaders = {
    host: `${CONVEX_HOST}:${CONVEX_PORT}`,
    upgrade: req.headers.upgrade || 'websocket',
    connection: req.headers.connection || 'upgrade',
  };
  if (req.headers['sec-websocket-key']) wsHeaders['sec-websocket-key'] = req.headers['sec-websocket-key'];
  if (req.headers['sec-websocket-version']) wsHeaders['sec-websocket-version'] = req.headers['sec-websocket-version'];
  if (req.headers['sec-websocket-protocol']) wsHeaders['sec-websocket-protocol'] = req.headers['sec-websocket-protocol'];

  const options = {
    hostname: CONVEX_HOST,
    port: CONVEX_PORT,
    path: targetPath,
    method: 'GET',
    headers: wsHeaders,
  };

  const proxy = http.request(options);
  proxy.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    // Send the 101 Switching Protocols response to the client
    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      ...Object.entries(proxyRes.headers).map(([k, v]) => `${k}: ${v}`),
      '',
      '',
    ].join('\r\n');
    socket.write(responseHeaders);
    
    proxySocket.on('error', () => socket.destroy());
    socket.on('error', () => proxySocket.destroy());
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
    if (head && head.length) proxySocket.unshift(head);
    if (proxyHead && proxyHead.length) socket.unshift(proxyHead);
  });
  proxy.on('error', () => socket.destroy());
  proxy.end();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server + Convex proxy running on port ${PORT}`);
});
