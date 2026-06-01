const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const DIST = '/home/z/my-project/timelock/dist';
const PORT = 3000;

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
  '.pdf': 'application/pdf',
  '.webp': 'image/webp',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  
  // Proxy API requests to Convex cloud
  if (urlPath.startsWith('/api/')) {
    const convexSite = 'artful-civet-344.convex.site';
    const targetPath = urlPath + (req.url.includes('?') ? '?' + req.url.split('?').slice(1).join('?') : '');
    const options = {
      hostname: convexSite,
      port: 443,
      path: targetPath,
      method: req.method,
      headers: { ...req.headers, host: convexSite },
    };
    const proxyReq = https.request(options, (proxyRes) => {
      // Strip problematic headers
      const headers = { ...proxyRes.headers };
      delete headers['content-encoding'];
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (e) => {
      console.error('Proxy error:', e.message);
      res.writeHead(502);
      res.end('Bad Gateway');
    });
    req.pipe(proxyReq);
    return;
  }

  // Serve static files from dist
  let filePath = path.join(DIST, urlPath === '/' ? 'index.html' : urlPath);
  const ext = path.extname(filePath);
  
  // Try to serve static asset first (not .html)
  if (ext && ext !== '.html') {
    try {
      if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
        const data = fs.readFileSync(filePath);
        const contentType = MIME[ext] || 'application/octet-stream';
        const cacheControl = ext === '.json' ? 'no-cache' : 'public, max-age=31536000, immutable';
        res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': cacheControl });
        res.end(data);
        return;
      }
    } catch (e) {
      // Fall through to SPA fallback
    }
  }
  
  // SPA fallback — serve index.html
  try {
    const data = fs.readFileSync(path.join(DIST, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Axia preview server running on port ${PORT}`);
  console.log(`Serving from ${DIST}`);
});
