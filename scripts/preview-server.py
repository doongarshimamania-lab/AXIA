import http.server, socketserver, os, sys, time, signal

DIST_DIR = '/home/z/my-project/dist'
PORT = 3000
LOG = '/tmp/axia-preview.log'

os.chdir(DIST_DIR)

class S(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/' or path == '': self.path = '/index.html'
        elif not os.path.exists(os.path.join(DIST_DIR, path.lstrip('/'))): self.path = '/index.html'
        return super().do_GET()
    def end_headers(self):
        if self.path.endswith('.html') or self.path == '/' or self.path == '':
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        else:
            self.send_header('Cache-Control', 'public, max-age=31536000, immutable')
        self.send_header('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:; connect-src 'self' https://veracious-zebra-519.convex.cloud wss://veracious-zebra-519.convex.cloud https: wss: http: ws:; frame-ancestors *;")
        super().end_headers()
    def log_message(self, *args): pass

class TS(socketserver.TCPServer):
    allow_reuse_address = True
    allow_reuse_port = True

def sigterm(signum, frame):
    sys.exit(0)

signal.signal(signal.SIGTERM, sigterm)

# Write to log
log = open(LOG, 'a')
sys.stdout = log
sys.stderr = log

print(f'[{time.strftime("%Y-%m-%d %H:%M:%S")}] Preview server starting on {PORT} serving {DIST_DIR}', flush=True)

while True:
    try:
        with TS(('0.0.0.0', PORT), S) as h:
            h.serve_forever()
    except Exception as e:
        print(f'[{time.strftime("%Y-%m-%d %H:%M:%S")}] ERROR: {e}', flush=True)
        time.sleep(2)
    print(f'[{time.strftime("%Y-%m-%d %H:%M:%S")}] Server exited, restarting...', flush=True)
    time.sleep(1)
