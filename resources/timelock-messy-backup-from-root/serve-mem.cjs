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

// Pre-load all files into memory
const files = {};
function loadDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      loadDir(fullPath);
    } else {
      const relPath = fullPath.substring(DIST.length);
      const ext = path.extname(relPath);
      // Skip very large files (>5MB) - serve them on demand
      const stat = fs.statSync(fullPath);
      if (stat.size < 5 * 1024 * 1024) {
        files[relPath] = { data: fs.readFileSync(fullPath), ext };
      } else {
        files[relPath] = { path: fullPath, ext, large: true };
      }
    }
  }
}

loadDir(DIST);
console.log(`Loaded ${Object.keys(files).length} files into memory`);

const indexHtml = files['/index.html']?.data || fs.readFileSync(path.join(DIST, 'index.html'));

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  
  // Serve pre-loaded files
  const file = files[urlPath];
  if (file) {
    if (file.large) {
      // Stream large files
      try {
        const stream = fs.createReadStream(file.path);
        res.writeHead(200, { 'Content-Type': MIME[file.ext] || 'application/octet-stream' });
        stream.pipe(res);
        return;
      } catch (e) {}
    } else {
      res.writeHead(200, {
        'Content-Type': MIME[file.ext] || 'application/octet-stream',
        'Cache-Control': file.ext === '.json' ? 'no-cache' : 'public, max-age=3600',
      });
      res.end(file.data);
      return;
    }
  }
  
  // SPA fallback
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(indexHtml);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Axia running on port ${PORT}`);
});
