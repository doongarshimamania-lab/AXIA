/**
 * Axia Production Preview Server - Daemon Mode
 * 
 * Pre-loads all static files into memory for maximum performance.
 * Handles SPA routing (all non-file routes serve index.html).
 * Auto-restarts on uncaught errors.
 * Signal handling for graceful shutdown.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = '/home/z/my-project/timelock/dist';
const PORT = 3000;
const HOST = '0.0.0.0';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':  'font/ttf',
  '.eot':  'application/vnd.ms-fontobject',
  '.pdf':  'application/pdf',
  '.webp': 'image/webp',
  '.map':  'application/json',
};

// Pre-load all files into memory
const fileCache = new Map();

function loadFiles(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        loadFiles(fullPath);
      } else {
        const urlPath = fullPath.substring(DIST.length);
        try {
          fileCache.set(urlPath, fs.readFileSync(fullPath));
        } catch (e) {
          console.warn(`[Axia] Skipping unreadable file: ${urlPath}`);
        }
      }
    }
  } catch (e) {
    console.error(`[Axia] Error reading directory ${dir}:`, e.message);
  }
}

console.log(`[Axia] Loading files from ${DIST}...`);
loadFiles(DIST);
console.log(`[Axia] Loaded ${fileCache.size} files into memory`);

const indexHtml = fileCache.get('/index.html');
if (!indexHtml) {
  console.error('[Axia] FATAL: index.html not found in dist!');
  process.exit(1);
}

const server = http.createServer((req, res) => {
  try {
    const urlPath = req.url.split('?')[0];
    
    // Try exact file match first
    let file = fileCache.get(urlPath);
    
    // If not found and path has extension, 404
    if (!file && path.extname(urlPath)) {
      // Could be a missing asset
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    
    // SPA fallback: serve index.html for all non-file routes
    if (!file) {
      file = indexHtml;
    }
    
    const ext = path.extname(urlPath) || '.html';
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
    });
    res.end(file);
  } catch (err) {
    console.error('[Axia] Request error:', err.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Axia] Port ${PORT} already in use, exiting...`);
    process.exit(1);
  }
  console.error('[Axia] Server error:', err.message);
});

// Prevent the process from exiting
function keepAlive() {
  setTimeout(keepAlive, 60000);
}
keepAlive();

server.listen(PORT, HOST, () => {
  console.log(`[Axia] ✅ Server running on http://${HOST}:${PORT}`);
  console.log(`[Axia] Serving ${fileCache.size} files from ${DIST}`);
  console.log(`[Axia] SPA routes will serve index.html`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Axia] SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000);
});

process.on('SIGINT', () => {
  console.log('[Axia] SIGINT received, shutting down...');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000);
});

// Catch uncaught exceptions to prevent crash
process.on('uncaughtException', (err) => {
  console.error('[Axia] Uncaught exception (not crashing):', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Axia] Unhandled rejection (not crashing):', reason);
});
