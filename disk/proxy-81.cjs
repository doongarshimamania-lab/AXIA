const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({
  target: 'http://127.0.0.1:3000',
  ws: true,
  changeOrigin: true,
});

const server = http.createServer((req, res) => {
  proxy.web(req, res, {}, (err) => {
    res.writeHead(502);
    res.end('Proxy error');
  });
});

server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head);
});

server.listen(81, '0.0.0.0', () => {
  console.log('Proxy running on port 81 → 3000');
});
