const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = '/home/z/my-project/timelock/dist';
const PORT = 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
};

const indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(DIST, urlPath);
  const ext = path.extname(filePath);
  
  // Serve static assets
  if (ext && ext !== '.html' && fs.existsSync(filePath) && fs.statSync(filePath).isDirectory() === false) {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.json' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(data);
    return;
  }
  
  // SPA fallback
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(indexHtml);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Axia serving on port ${PORT} from ${DIST}`);
});
