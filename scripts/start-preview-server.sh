#!/bin/bash
# Axia preview server — zero-delay restart loop
# Serves the freshly-built /home/z/my-project/dist/ directory.
# Adds no-cache headers to HTML to prevent stale bundle references.
DIST="/home/z/my-project/dist"
PORT=3000
LOG="/tmp/axia-preview.log"

while true; do
  python3 -c "
import http.server, socketserver, os, sys
DIST_DIR = '$DIST'
os.chdir(DIST_DIR)
class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True
    allow_reuse_port = True
class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/' or path == '': self.path = '/index.html'
        elif not os.path.exists(os.path.join(DIST_DIR, path.lstrip('/'))): self.path = '/index.html'
        return super().do_GET()
    def end_headers(self):
        # No-cache for HTML so browsers always revalidate bundle hashes
        if self.path.endswith('.html') or self.path == '/' or self.path == '':
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        else:
            # Hashed assets can be cached forever
            self.send_header('Cache-Control', 'public, max-age=31536000, immutable')
        self.send_header('Content-Security-Policy', \"default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; connect-src 'self' https://veracious-zebra-519.convex.cloud wss://veracious-zebra-519.convex.cloud https: wss: http: ws:; frame-ancestors *;\")
        super().end_headers()
    def log_message(self, *args): pass
print('Preview server starting on port $PORT, serving $DIST_DIR (no-cache for HTML)', flush=True)
with ReusableTCPServer(('0.0.0.0', $PORT), SPAHandler) as httpd:
    httpd.serve_forever()
" >> "$LOG" 2>&1
  echo "[$(date)] Server exited, restarting in 1s..." >> "$LOG"
  sleep 1
done
