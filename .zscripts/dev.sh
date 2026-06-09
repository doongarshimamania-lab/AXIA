#!/bin/bash
# Axia preview server - zero-delay restart loop
DIST="/home/z/my-project/timelock/dist"
PORT=3000

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
        self.send_header('Content-Security-Policy', \"default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; connect-src 'self' https://veracious-zebra-519.convex.cloud wss://veracious-zebra-519.convex.cloud https: wss: http: ws:; frame-ancestors *;\")
        super().end_headers()
    def log_message(self, *args): pass
with ReusableTCPServer(('0.0.0.0', $PORT), SPAHandler) as httpd:
    httpd.serve_forever()
" 2>/dev/null
done
