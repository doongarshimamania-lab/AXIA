const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SERVER_SCRIPT = path.join(__dirname, 'serve-timelock.cjs');
const LOG_FILE = '/tmp/tl-daemon.log';

function log(msg) {
  const line = `${new Date().toISOString()} ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(line.trim());
}

function startServer() {
  log('Starting TIMELock server on port 3000...');
  const child = spawn('node', [SERVER_SCRIPT], {
    detached: false,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  child.stdout.on('data', (data) => {
    fs.appendFileSync(LOG_FILE, data);
  });
  child.stderr.on('data', (data) => {
    fs.appendFileSync(LOG_FILE, data);
  });
  
  log(`Server PID: ${child.pid}`);
  
  child.on('exit', (code, signal) => {
    log(`Server exited with code ${code}, signal ${signal}, restarting in 3s...`);
    setTimeout(startServer, 3000);
  });
}

log('Daemon started');
startServer();

process.on('SIGTERM', () => { log('Daemon SIGTERM'); process.exit(0); });
process.on('SIGINT', () => { log('Daemon SIGINT'); process.exit(0); });
