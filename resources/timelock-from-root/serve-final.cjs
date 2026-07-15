const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = '/home/z/my-project/timelock/dist';
const PORT = 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.webp': 'image/webp',
};

// Pre-load ALL files into memory at startup
const cache = {};
function preload(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { preload(full); continue; }
    const rel = full.substring(DIST.length);
    const ext = path.extname(rel);
    const data = fs.readFileSync(full);
    cache[rel] = { data, contentType: MIME[ext] || 'application/octet-stream' };
  }
}
preload(DIST);

const indexFile = cache['/index.html'];
console.log(`Axia: ${Object.keys(cache).length} files pre-loaded`);

http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  const file = cache[urlPath];
  if (file) {
    res.writeHead(200, { 'Content-Type': file.contentType });
    res.end(file.data);
  } else {
    res.writeHead(200, { 'Content-Type': indexFile.contentType });
    res.end(indexFile.data);
  }
}).listen(PORT, '0.0.0.0', () => console.log(`Axia live on :${PORT}`));
