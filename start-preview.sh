#!/bin/bash
# Axia Preview Server - Auto-restarting
DIST="/home/z/my-project/timelock/dist"
PORT=3000
LOG="/tmp/axia-preview.log"

while true; do
  echo "[$(date)] Starting Axia server..." >> "$LOG"
  node -e "
const http = require('http');
const fs = require('fs');
const path = require('path');
const DIST = '$DIST';
const M = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.json':'application/json','.woff2':'font/woff2','.ttf':'font/ttf'};
const c = {};
(function l(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=d+'/'+e.name;if(e.isDirectory())l(f);else{const r=f.substring(DIST.length);if(!r.endsWith('.pdf'))c[r]=fs.readFileSync(f);}}})(DIST);
const i=c['/index.html'];
http.createServer((q,r)=>{const u=q.url.split('?')[0];const f=c[u];if(f){r.writeHead(200,{'Content-Type':M[path.extname(u)]||'text/html; charset=utf-8'});r.end(f);}else{r.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});r.end(i);}}).listen($PORT,'0.0.0.0',()=>console.log('Axia on :$PORT'));
setInterval(()=>{},60000);
" 2>> "$LOG"
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..." >> "$LOG"
  sleep 3
done
