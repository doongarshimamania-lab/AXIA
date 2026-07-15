const { spawn } = require('child_process');
const fs = require('fs');

const PID_FILE = '/tmp/timelock-server.pid';
const LOG_FILE = '/tmp/timelock-daemon.log';

// Check if already running
try {
  const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
  // Check if process is still running
  process.kill(pid, 0);
  console.log(`Server already running with PID ${pid}`);
  process.exit(0);
} catch (e) {
  // Not running, start it
}

// Spawn the server as a detached process
const child = spawn('node', ['/home/z/my-project/server-manager.cjs'], {
  detached: true,
  stdio: ['ignore', fs.openSync(LOG_FILE, 'a'), fs.openSync(LOG_FILE, 'a')],
  env: { ...process.env }
});

child.unref();

// Write PID file
fs.writeFileSync(PID_FILE, child.pid.toString());
console.log(`Server started with PID ${child.pid}`);
