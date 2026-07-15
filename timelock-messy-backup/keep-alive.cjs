const { spawn } = require("child_process");
const path = require("path");

const SERVER_SCRIPT = path.join(__dirname, "serve-dist.cjs");
const PORT = 3000;
const http = require("http");

function isAlive() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}/`, { timeout: 2000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
  });
}

async function startServer() {
  const child = spawn("node", [SERVER_SCRIPT], {
    stdio: "ignore",
    detached: true,
  });
  child.unref();
  console.log(`[${new Date().toISOString()}] Started server (pid ${child.pid})`);
}

async function main() {
  while (true) {
    const alive = await isAlive();
    if (!alive) {
      console.log(`[${new Date().toISOString()}] Server down, restarting...`);
      await startServer();
      // Wait for server to come up
      await new Promise((r) => setTimeout(r, 3000));
    } else {
      // Check every 10 seconds
      await new Promise((r) => setTimeout(r, 10000));
    }
  }
}

main().catch(console.error);
