const http = require('http');
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, 'dist');
const port = 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  let filePath = path.join(distDir, urlPath === '/' ? 'index.html' : urlPath);
  const ext = path.extname(filePath);
  
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    if (!ext || ext === '.html') {
      filePath = path.join(distDir, 'index.html');
    } else {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
  }
  
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Server error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType + (ext === '.js' ? '; charset=utf-8' : '') });
      res.end(data);
    }
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log('Axia server running on http://0.0.0.0:' + port);
});
