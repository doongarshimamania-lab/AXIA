import http from "http";
import httpProxy from "http-proxy";

const proxy = httpProxy.createProxyServer({
  target: "http://127.0.0.1:3000",
  ws: true,           // Forward WebSockets for HMR
  changeOrigin: true,
});

const server = http.createServer((req, res) => {
  proxy.web(req, res, {}, (err) => {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Proxy error: " + err.message);
  });
});

// Handle WebSocket upgrades for Vite HMR
server.on("upgrade", (req, socket, head) => {
  proxy.ws(req, socket, head);
});

server.listen(81, "0.0.0.0", () => {
  console.log("Proxy running on :81 -> :3000 (with WebSocket/HMR support)");
});
