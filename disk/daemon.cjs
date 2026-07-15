const { spawn } = require('child_process');
const path = require('path');

function startServer() {
  const server = spawn('node', [path.join(__dirname, 'serve-preview.cjs')], {
    stdio: 'inherit',
    detached: false,
  });
  
  server.on('exit', (code) => {
    console.log(`[daemon] Server exited with code ${code}, restarting in 2s...`);
    setTimeout(startServer, 2000);
  });
  
  server.on('error', (err) => {
    console.error(`[daemon] Server error: ${err.message}, restarting in 2s...`);
    setTimeout(startServer, 2000);
  });
}

startServer();
