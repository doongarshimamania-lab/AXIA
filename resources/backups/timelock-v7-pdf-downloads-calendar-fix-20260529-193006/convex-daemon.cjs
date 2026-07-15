const { spawn } = require('child_process');

const BIN = '/home/z/.cache/convex/binaries/precompiled-2026-05-27-e85ff37/convex-local-backend';
const DB = '/home/z/my-project/.convex/local/default/convex_local_backend.sqlite3';
const STORAGE = '/home/z/my-project/.convex/local/default/convex_local_storage';

function start() {
  console.log('[convex-daemon] Starting Convex local backend...');
  const proc = spawn(BIN, [
    DB,
    '--port', '3210',
    '--site-proxy-port', '3211',
    '--instance-name', 'anonymous-my-project',
    '--instance-secret', '7bcbb0ae096e5945b3851c7468ddfd42f3bc817f2fc42423bebd04de1223b305',
    '--local-storage', STORAGE,
    '--disable-beacon',
  ], { stdio: 'inherit' });

  proc.on('exit', (code) => {
    console.log(`[convex-daemon] Backend exited with code ${code}, restarting in 3s...`);
    setTimeout(start, 3000);
  });

  proc.on('error', (err) => {
    console.error(`[convex-daemon] Error: ${err.message}, restarting in 3s...`);
    setTimeout(start, 3000);
  });
}

start();
