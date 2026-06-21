const { spawn } = require('child_process');
const path = require('path');

const BIN = '/home/z/.cache/convex/binaries/precompiled-2026-05-27-e85ff37/convex-local-backend';
const DB = path.join(__dirname, '.convex/local/default/convex_local_backend.sqlite3');
const STORAGE = path.join(__dirname, '.convex/local/default/convex_local_storage');

function start() {
  console.log('[convex-persist] Starting Convex local backend...');
  const proc = spawn(BIN, [
    DB,
    '--port', '3210',
    '--site-proxy-port', '3211',
    '--instance-name', 'anonymous-timelock',
    '--instance-secret', 'ccf7642efa17c28ee0aba446a90ca8739cc7e3f4a40495f4234b22996608dd86',
    '--local-storage', STORAGE,
    '--disable-beacon',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  proc.stdout.on('data', (data) => {
    const line = data.toString().trim();
    if (line.includes('listening')) {
      console.log('[convex-persist]', line);
    }
  });

  proc.stderr.on('data', (data) => {
    const line = data.toString().trim();
    if (line.includes('ERROR') || line.includes('WARN')) {
      console.log('[convex-persist]', line);
    }
  });

  proc.on('exit', (code) => {
    console.log(`[convex-persist] Backend exited with code ${code}, restarting in 3s...`);
    setTimeout(start, 3000);
  });

  proc.on('error', (err) => {
    console.error(`[convex-persist] Error: ${err.message}, restarting in 3s...`);
    setTimeout(start, 3000);
  });
}

start();
