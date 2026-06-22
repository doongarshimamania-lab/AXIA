#!/usr/bin/env python3
"""
Axia preview server — TRUE daemon via double-fork.

Detach from terminal AND parent process so it survives shell exit.
Serves /home/z/my-project/axia/dist on port 3000 with SPA fallback.
"""
import http.server
import socketserver
import os
import sys
import signal
import time

DIST_DIR = '/home/z/my-project/axia/dist'
PORT = 3000
CONVEX_HOST = 'https://veracious-zebra-519.convex.cloud'
CSP = (
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; "
    f"connect-src 'self' {CONVEX_HOST} wss://{CONVEX_HOST.split('://',1)[1]} https: wss: http: ws:; "
    "frame-ancestors *;"
)
PIDFILE = '/tmp/axia-preview.pid'
LOGFILE = '/tmp/axia-preview.log'


def daemonize():
    """Standard double-fork daemonization."""
    # First fork
    try:
        pid = os.fork()
        if pid > 0:
            sys.exit(0)  # parent exits
    except OSError as e:
        sys.exit(1)

    # Decouple from parent environment
    os.chdir('/')
    os.setsid()
    os.umask(0)

    # Second fork
    try:
        pid = os.fork()
        if pid > 0:
            sys.exit(0)
    except OSError as e:
        sys.exit(1)

    # Redirect stdin/stdout/stderr
    sys.stdout.flush()
    sys.stderr.flush()
    with open('/dev/null', 'r') as f:
        os.dup2(f.fileno(), sys.stdin.fileno())
    logf = open(LOGFILE, 'a', buffering=1)
    os.dup2(logf.fileno(), sys.stdout.fileno())
    os.dup2(logf.fileno(), sys.stderr.fileno())

    # Write PID file
    with open(PIDFILE, 'w') as f:
        f.write(str(os.getpid()))


def main():
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
                self.path = '/index.html'
            return super().do_GET()

        def end_headers(self):
            self.send_header('Content-Security-Policy', CSP)
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            super().end_headers()

        def log_message(self, *args):
            pass

    def handle_sigterm(*_):
        sys.exit(0)

    signal.signal(signal.SIGTERM, handle_sigterm)
    signal.signal(signal.SIGINT, handle_sigterm)

    print(f"[{time.strftime('%H:%M:%S')}] axia-preview serving {DIST_DIR} on 0.0.0.0:{PORT} (pid={os.getpid()})", flush=True)
    with ReusableTCPServer(('0.0.0.0', PORT), SPAHandler) as httpd:
        httpd.serve_forever()


if __name__ == '__main__':
    if '--foreground' in sys.argv:
        main()
    else:
        daemonize()
        main()
