import http from "http";
import { URL } from "url";

const TARGET = "http://127.0.0.1:3000";

function proxyRequest(clientReq, clientRes) {
  const url = new URL(clientReq.url, TARGET);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method: clientReq.method,
    headers: { ...clientReq.headers, host: url.host },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(clientRes, { end: true });
  });

  proxyReq.on("error", (err) => {
    console.error("Proxy error:", err.message);
    clientRes.writeHead(502);
    clientRes.end("Bad Gateway");
  });

  clientReq.pipe(proxyReq, { end: true });
}

const server = http.createServer(proxyRequest);

server.on("upgrade", (req, socket, head) => {
  // Forward WebSocket upgrade to Vite
  const url = new URL(req.url, TARGET);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = http.request(options);
  proxyReq.on("upgrade", (proxyRes, proxySocket, proxyHead) => {
    proxySocket.on("error", () => { try { socket.destroy(); } catch {} });
    socket.on("error", () => { try { proxySocket.destroy(); } catch {} });

    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
      Object.entries(proxyRes.headers).map(([k, v]) => `${k}: ${v}`).join("\r\n") +
      "\r\n"
    );
    proxySocket.write(proxyHead);
    proxySocket.pipe(socket, { end: true });
    socket.pipe(proxySocket, { end: true });
  });
  proxyReq.on("error", () => { try { socket.destroy(); } catch {} });
  proxyReq.end();
});

server.listen(81, "0.0.0.0", () => {
  console.log("Proxy listening on port 81 → 3000");
});
