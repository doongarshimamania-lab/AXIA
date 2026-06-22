#!/usr/bin/env python3
"""
Axia preview server — stable, persistent, no shell wrapper.

Serves /home/z/my-project/axia/dist on port 3000 with SPA fallback
and permissive CSP that allows the Convex backend.
"""
import http.server
import socketserver
import os
import sys
import signal

DIST_DIR = '/home/z/my-project/axia/dist'
PORT = 3000
CONVEX_HOST = 'https://veracious-zebra-519.convex.cloud'
CSP = (
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; "
    f"connect-src 'self' {CONVEX_HOST} wss://{CONVEX_HOST.split('://',1)[1]} https: wss: http: ws:; "
    "frame-ancestors *;"
)

if not os.path.isdir(DIST_DIR):
    print(f"FATAL: dist dir does not exist: {DIST_DIR}", file=sys.stderr)
    sys.exit(1)

os.chdir(DIST_DIR)


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True
    allow_reuse_port = True


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/' or path == '':
            self.path = '/index.html'
        elif not os.path.exists(os.path.join(DIST_DIR, path.lstrip('/'))):
            self.path = '/index.html'  # SPA fallback
        return super().do_GET()

    def end_headers(self):
        self.send_header('Content-Security-Policy', CSP)
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def log_message(self, *args):
        pass  # silence


def handle_sigterm(*_):
    print("Received SIGTERM, shutting down gracefully", file=sys.stderr)
    sys.exit(0)


signal.signal(signal.SIGTERM, handle_sigterm)
signal.signal(signal.SIGINT, handle_sigterm)

print(f"[axia-preview] serving {DIST_DIR} on 0.0.0.0:{PORT}", file=sys.stderr, flush=True)
with ReusableTCPServer(('0.0.0.0', PORT), SPAHandler) as httpd:
    httpd.serve_forever()
