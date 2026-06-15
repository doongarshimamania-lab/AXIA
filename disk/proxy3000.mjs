import http from "http";

const TARGET = "http://127.0.0.1:5173";

const server = http.createServer((req, res) => {
  const opts = {
    hostname: "127.0.0.1",
    port: 5173,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };
  const proxy = http.request(opts, (pRes) => {
    res.writeHead(pRes.statusCode, pRes.headers);
    pRes.pipe(res, { end: true });
  });
  proxy.on("error", () => { res.writeHead(502); res.end(); });
  req.pipe(proxy, { end: true });
});

server.listen(3000, "127.0.0.1", () => {
  console.error("Proxy 3000→5173");
});
