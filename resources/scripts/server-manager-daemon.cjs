const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVER_SCRIPT = path.join(__dirname, 'server-manager.cjs');
const LOG_FILE = '/tmp/server-manager-daemon.log';

function log(msg) {
  const line = `${new Date().toISOString()} ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(line.trim());
}

function startServer() {
  log('Starting server-manager...');
  const child = spawn('node', [SERVER_SCRIPT], {
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
  log(`Server PID: ${child.pid}`);
  
  child.on('exit', (code) => {
    log(`Server exited with code ${code}, restarting in 3s...`);
    setTimeout(startServer, 3000);
  });
}

startServer();

process.on('SIGTERM', () => { log('Daemon SIGTERM'); process.exit(0); });
process.on('SIGINT', () => { log('Daemon SIGINT'); process.exit(0); });

setInterval(() => { log('heartbeat'); }, 60000);
