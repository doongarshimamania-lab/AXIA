const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, 'dist');
const PORT = 5173;

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
};

process.on('SIGTERM', () => { fs.appendFileSync('/tmp/tl-debug.log', 'SIGTERM received\n'); process.exit(0); });
process.on('SIGINT', () => { fs.appendFileSync('/tmp/tl-debug.log', 'SIGINT received\n'); process.exit(0); });
process.on('SIGHUP', () => { fs.appendFileSync('/tmp/tl-debug.log', 'SIGHUP received\n'); });
process.on('exit', (code) => { fs.appendFileSync('/tmp/tl-debug.log', `exit(${code})\n`); });
process.on('uncaughtException', (err) => { fs.appendFileSync('/tmp/tl-debug.log', `uncaught: ${err.message}\n`); });

const server = http.createServer((req, res) => {
  fs.appendFileSync('/tmp/tl-debug.log', `${new Date().toISOString()} ${req.method} ${req.url}\n`);
  let urlPath = req.url.split('?')[0];
  let filePath = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath);
  const ext = path.extname(filePath);
  
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
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
  fs.appendFileSync('/tmp/tl-debug.log', `Server started on ${PORT}\n`);
  console.log(`TIMELock running at http://0.0.0.0:${PORT}/`);
});
