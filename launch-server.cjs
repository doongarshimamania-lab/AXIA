const { spawn } = require('child_process');
const fs = require('fs');

const LOG = '/tmp/launched-server.log';

function log(msg) {
  fs.appendFileSync(LOG, `${new Date().toISOString()} ${msg}\n`);
}

log('Launcher starting...');

// Start the server as a completely detached process
const child = spawn('node', ['/home/z/my-project/server-manager.cjs'], {
  detached: true,
  stdio: 'ignore',
  env: { ...process.env },
  cwd: '/home/z/my-project'
});

child.unref();

log(`Launched server manager with PID ${child.pid}`);
log('Launcher exiting, server should persist as orphan');

// Write PID for tracking
fs.writeFileSync('/tmp/launched-server.pid', child.pid.toString());
