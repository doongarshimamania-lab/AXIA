#!/usr/bin/env python3
"""AXIA preview server — double-fork daemon that survives parent shell cleanup.

Usage:
    python3 scripts/preview-server-daemon.py start   # launch daemon
    python3 scripts/preview-server-daemon.py stop    # kill daemon
    python3 scripts/preview-server-daemon.py status  # check status
"""
import os, sys, time, signal, http.server, socketserver

DIST_DIR = '/home/z/my-project/dist'
PORT = 3000
PID_FILE = '/tmp/axia-daemon.pid'
LOG_FILE = '/tmp/axia-preview.log'


class S(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/' or path == '':
            self.path = '/index.html'
        elif not os.path.exists(os.path.join(DIST_DIR, path.lstrip('/'))):
            self.path = '/index.html'
        return super().do_GET()

    def end_headers(self):
        if self.path.endswith('.html') or self.path == '/' or self.path == '':
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        else:
            self.send_header('Cache-Control', 'public, max-age=31536000, immutable')
        self.send_header('Content-Security-Policy',
                         "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; "
                         "connect-src 'self' https://veracious-zebra-519.convex.cloud "
                         "wss://veracious-zebra-519.convex.cloud https: wss: http: ws:; frame-ancestors *;")
        super().end_headers()

    def log_message(self, *args):
        pass


class TS(socketserver.TCPServer):
    allow_reuse_address = True
    allow_reuse_port = True


def start():
    # Double-fork to fully detach from any parent (including tool-call shells)
    if os.fork() > 0:
        sys.exit(0)
    os.setsid()
    if os.fork() > 0:
        sys.exit(0)

    # Now we're a true daemon — write PID and redirect stdio
    with open(PID_FILE, 'w') as f:
        f.write(str(os.getpid()))

    log = open(LOG_FILE, 'a', buffering=1)
    sys.stdout = log
    sys.stderr = log

    def sigterm(signum, frame):
        try:
            os.remove(PID_FILE)
        except OSError:
            pass
        sys.exit(0)

    signal.signal(signal.SIGTERM, sigterm)
    signal.signal(signal.SIGINT, sigterm)

    print(f'[{time.strftime("%Y-%m-%d %H:%M:%S")}] Preview daemon PID={os.getpid()} starting on {PORT} serving {DIST_DIR}', flush=True)

    while True:
        try:
            with TS(('0.0.0.0', PORT), S) as h:
                h.serve_forever()
        except Exception as e:
            print(f'[{time.strftime("%Y-%m-%d %H:%M:%S")}] ERROR: {e}', flush=True)
            time.sleep(2)
        print(f'[{time.strftime("%Y-%m-%d %H:%M:%S")}] Server exited, restarting...', flush=True)
        time.sleep(1)


def stop():
    try:
        with open(PID_FILE) as f:
            pid = int(f.read().strip())
        os.kill(pid, signal.SIGTERM)
        print(f'Sent SIGTERM to PID {pid}')
        time.sleep(2)
        try:
            os.remove(PID_FILE)
        except OSError:
            pass
    except FileNotFoundError:
        print('No PID file — daemon not running?')


def status():
    try:
        with open(PID_FILE) as f:
            pid = int(f.read().strip())
        os.kill(pid, 0)
        print(f'Daemon running, PID={pid}')
        return True
    except (FileNotFoundError, ProcessLookupError, ValueError):
        print('Daemon not running')
        return False


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'start'
    if cmd == 'start':
        start()
    elif cmd == 'stop':
        stop()
    elif cmd == 'status':
        status()
    else:
        print(f'Usage: {sys.argv[0]} [start|stop|status]')
        sys.exit(1)
