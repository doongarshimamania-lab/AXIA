#!/bin/bash
exec nohup setsid python3 -u <<'PY' > /tmp/axia-preview.log 2>&1 < /dev/null &
import http.server, socketserver, os
DIST_DIR = '/home/z/my-project/dist'
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
        self.send_header('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; connect-src 'self' https://veracious-zebra-519.convex.cloud wss://veracious-zebra-519.convex.cloud https: wss: http: ws:; frame-ancestors *;")
        super().end_headers()
    def log_message(self, *args): pass
print('Preview server starting on port 3000, serving ' + DIST_DIR, flush=True)
with ReusableTCPServer(('0.0.0.0', 3000), SPAHandler) as httpd:
    httpd.serve_forever()
PY
