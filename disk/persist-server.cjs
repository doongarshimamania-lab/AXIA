const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = '/home/z/my-project/timelock/dist';
const PORT = 3000;
const LOG = '/tmp/server-persist.log';

function log(msg) {
  const line = `${new Date().toISOString()} ${msg}\n`;
  try { fs.appendFileSync(LOG, line); } catch(e) {}
}

log('=== Starting persistent server ===');

const indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
log(`Loaded index.html: ${indexHtml.length} bytes`);

const MIME = {
  '.html':'text/html; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json',
  '.png':'image/png',
  '.jpg':'image/jpeg',
  '.svg':'image/svg+xml',
  '.ico':'image/x-icon',
  '.woff':'font/woff',
  '.woff2':'font/woff2',
  '.ttf':'font/ttf',
  '.webp':'image/webp',
  '.pdf':'application/pdf',
};

// Pre-load all assets into memory for speed
const cache = {};
function loadDir(d) {
  for (const e of fs.readdirSync(d, {withFileTypes:true})) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) loadDir(f);
    else {
      const route = f.substring(DIST.length);
      cache[route] = fs.readFileSync(f);
      log(`Cached: ${route} (${cache[route].length} bytes)`);
    }
  }
}
loadDir(DIST);
log(`Cached ${Object.keys(cache).length} files`);

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  const cached = cache[urlPath];
  
  if (cached) {
    const ext = path.extname(urlPath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(cached);
    return;
  }
  
  // SPA fallback
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(cache['/index.html'] || indexHtml);
});

server.listen(PORT, '0.0.0.0', () => {
  log(`Axia serving on port ${PORT}`);
  console.log(`Axia serving on port ${PORT}`);
});

// Keep alive with heartbeat
setInterval(() => { log('heartbeat'); }, 60000);

process.on('SIGTERM', () => { log('SIGTERM received, ignoring'); });
process.on('SIGINT', () => { log('SIGINT received, ignoring'); });
process.on('SIGHUP', () => { log('SIGHUP received, ignoring'); });
process.on('uncaughtException', (e) => { log('Uncaught: ' + e.message); });
process.on('unhandledRejection', (e) => { log('Unhandled rejection: ' + (e && e.message)); });
process.on('exit', (code) => { log('Exit with code: ' + code); });
