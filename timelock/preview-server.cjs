const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = '/home/z/my-project/timelock/dist';
const PORT = 3000;

const TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
};

const server = http.createServer((req, res) => {
  // Handle SPA routing
  let urlPath = req.url.split('?')[0];
  const fp = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath);
  const ext = path.extname(fp);
  
  fs.readFile(fp, (err, data) => {
    if (err) {
      // SPA fallback for non-file routes
      fs.readFile(path.join(DIST, 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end(d2);
      });
      return;
    }
    res.writeHead(200, {'Content-Type': TYPES[ext] || 'application/octet-stream'});
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Preview server on port ${PORT}`);
});

// Keep process alive
process.on('uncaughtException', (err) => console.error('Error:', err.message));
