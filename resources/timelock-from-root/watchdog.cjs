const { spawn } = require('child_process');
const path = require('path');

const SERVER = path.join(__dirname, 'serve-buf.cjs');
const LOG = '/tmp/watchdog.log';

function log(msg) {
  const line = `${new Date().toISOString()} ${msg}\n`;
  require('fs').appendFileSync(LOG, line);
  console.log(line.trim());
}

function start() {
  log('Starting server...');
  const child = spawn('node', [SERVER], { stdio: 'inherit' });
  child.on('exit', (code) => {
    log(`Server exited with code ${code}, restarting in 2s...`);
    setTimeout(start, 2000);
  });
}

start();
