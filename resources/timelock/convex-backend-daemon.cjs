const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONVEX_BINARY = "/home/z/.cache/convex/binaries/precompiled-2026-05-27-e85ff37/convex-local-backend";
const CONVEX_DATA = "/home/z/my-project/timelock/.convex/local/default";
const INSTANCE_SECRET = "cf0c5c3e83517f441baa718171034cdde912309d748129648a064443446e5cf8";
const LOG_FILE = "/tmp/convex-backend-daemon.log";

function log(msg) {
  const line = `${new Date().toISOString()} ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(line.trim());
}

function startBackend() {
  log('Starting Convex backend...');
  
  const child = spawn(CONVEX_BINARY, [
    '--port', '3210',
    '--interface', '0.0.0.0',
    '--instance-name', 'timelock-local',
    '--instance-secret', INSTANCE_SECRET,
    '--disable-beacon',
    'convex_local_backend.sqlite3'
  ], {
    cwd: CONVEX_DATA,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  child.stdout.on('data', (data) => {
    fs.appendFileSync(LOG_FILE, data.toString());
  });
  
  child.stderr.on('data', (data) => {
    fs.appendFileSync(LOG_FILE, data.toString());
  });
  
  child.unref();
  
  log(`Backend PID: ${child.pid}`);
  
  child.on('exit', (code, signal) => {
    log(`Backend exited with code ${code}, signal ${signal}. Restarting in 3s...`);
    setTimeout(startBackend, 3000);
  });
}

startBackend();

// Keep alive
process.on('SIGTERM', () => { log('Daemon SIGTERM'); process.exit(0); });
process.on('SIGINT', () => { log('Daemon SIGINT'); process.exit(0); });

setInterval(() => { log('heartbeat'); }, 60000);
