const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = '/home/z/my-project/timelock/dist';
const PORT = 3000;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  
  // Redirect / to /timelock/
  if (urlPath === '/') {
    res.writeHead(307, { 'Location': '/timelock/' });
    res.end();
    return;
  }
  
  // Handle /timelock/* routes
  if (urlPath.startsWith('/timelock')) {
    let relativePath = urlPath.replace('/timelock', '') || '/';
    let filePath = path.join(DIST, relativePath === '/' ? 'index.html' : relativePath);
    const ext = path.extname(filePath);
    
    // Static assets - serve directly
    if (ext && ext !== '.html') {
      if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
        const data = fs.readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
        return;
      }
    }
    
    // SPA fallback - serve index.html for all non-asset routes
    const indexPath = path.join(DIST, 'index.html');
    if (fs.existsSync(indexPath)) {
      const data = fs.readFileSync(indexPath);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
      return;
    }
  }
  
  // Fallback
  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`TIMELock server running at http://0.0.0.0:${PORT}/`);
  console.log(`Serving Vite build from ${DIST}`);
  console.log(`Redirect / → /timelock/`);
});
