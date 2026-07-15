const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, 'dist');
const PORT = 3000;

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  
  // SPA: serve index.html for all non-file routes
  if (!urlPath.includes('.')) {
    urlPath = '/index.html';
  }
  
  const filePath = path.join(DIST, urlPath);
  const ext = path.extname(filePath);
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback
      fs.readFile(path.join(DIST, 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(500); res.end('Error'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(d2);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Axia server running on http://0.0.0.0:${PORT}`);
  console.log(`Serving from: ${DIST}`);
});
