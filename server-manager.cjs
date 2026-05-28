const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = '/home/z/my-project/timelock/dist';
const LOG = '/tmp/server-manager.log';

function log(msg) {
  const line = `${new Date().toISOString()} ${msg}\n`;
  fs.appendFileSync(LOG, line);
  console.log(line.trim());
}

function startStaticServer() {
  const MIME = {
    '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
    '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
    '.jpg': 'image/jpg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
    '.pdf': 'application/pdf',
  };

  const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    
    if (urlPath === '/') {
      res.writeHead(307, { 'Location': '/timelock/' });
      res.end();
      return;
    }
    
    if (urlPath.startsWith('/timelock')) {
      let relativePath = urlPath.replace('/timelock', '') || '/';
      let filePath = path.join(DIST, relativePath === '/' ? 'index.html' : relativePath);
      const ext = path.extname(filePath);
      
      if (ext && ext !== '.html') {
        try {
          if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
            const data = fs.readFileSync(filePath);
            res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
            res.end(data);
            return;
          }
        } catch (e) {}
      }
      
      try {
        const data = fs.readFileSync(path.join(DIST, 'index.html'));
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
        return;
      } catch (e) {}
    }
    
    res.writeHead(404);
    res.end('Not found');
  });

  return server;
}

log('Starting TIMELock server manager...');

const server = startStaticServer();
server.listen(3000, '0.0.0.0', () => {
  log('TIMELock server running on port 3000');
  log('Serving Vite build from ' + DIST);
});

server.on('error', (err) => {
  log('Server error: ' + err.message);
  process.exit(1);
});

// Keep process alive
process.on('SIGTERM', () => { log('SIGTERM'); process.exit(0); });
process.on('SIGINT', () => { log('SIGINT'); process.exit(0); });
