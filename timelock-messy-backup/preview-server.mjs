import { createServer } from "http";
import { readFile, stat } from "fs/promises";
import { join, extname } from "path";

const PORT = 3000;
const DIR = "/home/z/my-project/timelock/public";

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
};

const server = createServer(async (req, res) => {
  let path = join(DIR, req.url === "/" ? "index.html" : req.url);
  try {
    const data = await readFile(path);
    const mime = MIME[extname(path)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  } catch {
    // SPA fallback
    try {
      const data = await readFile(join(DIR, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Preview server running on port ${PORT}`);
});
