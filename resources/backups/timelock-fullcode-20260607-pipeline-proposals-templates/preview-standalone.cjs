const http = require('http');
const fs = require('fs');
const path = require('path');
const cluster = require('cluster');

const DIST = '/home/z/my-project/timelock/dist';
const PORT = 3000;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} starting...`);
  const worker = cluster.fork();
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
  
  // Keep primary alive
  setInterval(() => {}, 60000);
} else {
  const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.pdf': 'application/pdf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };

  const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    const fp = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath);
    const ext = path.extname(fp);
    
    fs.readFile(fp, (err, data) => {
      if (err) {
        // SPA fallback
        fs.readFile(path.join(DIST, 'index.html'), (e2, d2) => {
          if (e2) { res.writeHead(404); res.end('Not found'); return; }
          res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
          res.end(d2);
        });
        return;
      }
      res.writeHead(200, {
        'Content-Type': TYPES[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      res.end(data);
    });
  });

  server.listen(PORT, '::', () => {
    console.log(`Worker serving on [::]:${PORT}`);
  });
  
  process.on('uncaughtException', (err) => {
    console.error('Worker error:', err.message);
  });
}
