import os, sys, http.server, socketserver, socket, json, urllib.request, urllib.error

DIST = '/home/z/my-project/timelock/dist'
PORT = 3000
CONVEX_URL = 'http://127.0.0.1:3210'

class DualStackServer(socketserver.TCPServer):
    address_family = socket.AF_INET6
    allow_reuse_address = True
    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path.startswith('/api/'):
            self._proxy_request()
        else:
            self.send_error(405, "POST not allowed")

    def do_GET(self):
        if self.path.startswith('/api/'):
            self._proxy_request(method='GET')
        else:
            super().do_GET()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def _proxy_request(self, method='POST'):
        try:
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length) if content_length > 0 else None

            # Build Convex URL
            convex_url = CONVEX_URL + self.path

            # Forward request to Convex
            req = urllib.request.Request(convex_url, data=body, method=method)
            req.add_header('Content-Type', self.headers.get('Content-Type', 'application/json'))

            with urllib.request.urlopen(req, timeout=30) as response:
                response_body = response.read()
                
                self.send_response(response.status)
                for header, value in response.getheaders():
                    if header.lower() not in ('server', 'date', 'transfer-encoding'):
                        self.send_header(header, value)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(response_body)

        except urllib.error.HTTPError as e:
            error_body = e.read() if e.fp else b''
            self.send_response(e.code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(error_body)
        except Exception as e:
            self.send_response(502)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

os.chdir(DIST)

# Double-fork to daemonize
if os.fork() > 0: sys.exit(0)
os.setsid()
if os.fork() > 0: sys.exit(0)

# Redirect stdio
sys.stdout.flush()
sys.stderr.flush()
devnull = open(os.devnull, 'r')
os.dup2(devnull.fileno(), 0)
log = open('/tmp/daemon-server.log', 'a')
os.dup2(log.fileno(), 1)
os.dup2(log.fileno(), 2)

with DualStackServer(('::', PORT), ProxyHandler) as httpd:
    httpd.serve_forever()
