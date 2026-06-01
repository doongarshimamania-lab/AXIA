const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = '/home/z/my-project/timelock/dist';
const PORT = 3000;
const LOG = '/tmp/serve-debug.log';

function log(msg) {
  const line = `${new Date().toISOString()} ${msg}\n`;
  fs.appendFileSync(LOG, line);
}

log('Starting server...');
const indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
log(`Read index.html: ${indexHtml.length} bytes`);

const MIME = {'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpg','.svg':'image/svg+xml','.ico':'image/x-icon','.json':'application/json','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.pdf':'application/pdf','.webp':'image/webp'};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(DIST, urlPath);
  const ext = path.extname(filePath);
  
  if (ext && ext !== '.html') {
    try {
      if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, {'Content-Type': MIME[ext]||'application/octet-stream'});
        res.end(data);
        return;
      }
    } catch(e) { log('File error: ' + e.message); }
  }
  
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  res.end(indexHtml);
});

server.listen(PORT, '0.0.0.0', () => {
  log('Server listening on port ' + PORT);
  console.log('Axia running on port ' + PORT);
});

process.on('SIGTERM', () => { log('Received SIGTERM'); process.exit(0); });
process.on('SIGINT', () => { log('Received SIGINT'); process.exit(0); });
process.on('SIGHUP', () => { log('Received SIGHUP'); });
process.on('exit', (code) => { log('Exiting with code ' + code); });
process.on('uncaughtException', (e) => { log('Uncaught: ' + e.message); });
