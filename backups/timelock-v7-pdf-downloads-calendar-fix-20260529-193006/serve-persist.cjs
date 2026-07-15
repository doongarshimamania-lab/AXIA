const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5173;
const DIST = path.join(__dirname, 'dist');

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
};

process.on('SIGHUP', () => console.log('Received SIGHUP, ignoring'));
process.on('SIGTERM', () => console.log('Received SIGTERM, ignoring'));

const server = http.createServer((req, res) => {
  let filePath = path.join(DIST, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  
  if (!fs.existsSync(filePath) && !ext.match(/\.(js|css|png|jpg|svg|ico|woff2?|ttf|json)$/)) {
    filePath = path.join(DIST, 'index.html');
  }
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(DIST, 'index.html'), (e2, d2) => {
        if (e2) { res.writeHead(500); res.end('Error'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(d2);
      });
      return;
    }
    const contentType = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`TIMELock running at http://localhost:${PORT}/`);
  console.log(`Process PID: ${process.pid}`);
});
