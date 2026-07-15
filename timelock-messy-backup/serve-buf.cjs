const http = require('http');
const fs = require('fs');
const path = require('path');
const DIST = '/home/z/my-project/timelock/dist';
const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.json':'application/json','.woff2':'font/woff2','.ttf':'font/ttf','.pdf':'application/pdf','.webp':'image/webp'};

const cache = {};
function load(d) {
  for (const e of fs.readdirSync(d, {withFileTypes:true})) {
    const f = path.join(d, e.name);
    if (e.isDirectory()) load(f);
    else { const r = f.substring(DIST.length); cache[r] = Buffer.concat([fs.readFileSync(f)]); }
  }
}
load(DIST);
const idx = cache['/index.html'];

http.createServer((q, r) => {
  const u = q.url.split('?')[0];
  const f = cache[u];
  r.writeHead(200, {'Content-Type': MIME[path.extname(u)] || 'application/octet-stream'});
  r.end(f || idx);
}).listen(3000, '0.0.0.0', () => console.log('Axia on :3000'));
