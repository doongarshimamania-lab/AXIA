const { createServer } = require('http');
const fs = require('fs');
const path = require('path');

const DIST = '/home/z/my-project/timelock/dist';
const LOG = '/tmp/server-manager.log';
const PORT = 3000;

function log(msg) {
  const line = `${new Date().toISOString()} ${msg}\n`;
  fs.appendFileSync(LOG, line);
  console.log(line.trim());
}

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

const server = createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  log(`Request: ${req.method} ${urlPath}`);
  
  // Build the file path
  let filePath = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath);
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  const ext = path.extname(filePath);
  
  // For non-HTML files, try to serve them directly
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
  
  // For HTML files or missing files, serve index.html (SPA routing)
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

server.listen(PORT, '0.0.0.0', () => {
  log(`TIMELock static server running on port ${PORT}`);
  log(`Serving from ${DIST}`);
});

server.on('error', (err) => {
  log(`Server error: ${err.message}`);
  process.exit(1);
});

// Keep alive
process.on('SIGTERM', () => { log('SIGTERM received'); process.exit(0); });
process.on('SIGINT', () => { log('SIGINT received'); process.exit(0); });

// Heartbeat to detect if we're still running
setInterval(() => {
  log('heartbeat');
}, 60000);
